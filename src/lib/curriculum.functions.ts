import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireKidOrParentAuth } from "./kid-device-auth";
import { requireParentDevice } from './parent-device.functions';
import { familyActivityDone, gradeChoice, pickCurrentSession, questStates, soloDone } from "@/lib/curriculum";

type Ctx = { supabase: any; userId: string };
const TREE = "id,number,title,kind,units(id,number,title,published,lead_strand,family_question,dinner_question,story_prompt,mission_project,badge_name,badge_description,journal_prompt,sessions(id,week_number,title,parent_primer,script,source_news_id,activities(id,position,title,strand,step,kind,offscreen,activity_versions(age_band,kid_title,instructions,minutes,choices)),printables(id,title,file_path)))";
const uuid = z.string().uuid();

/** Published sessions in Season → Unit → Week order. `kind` picks the main series or the news side quests. */
async function loadOrdered(ctx: Ctx, kind: "series" | "news" = "series") {
  const { data, error } = await ctx.supabase.from("seasons").select(TREE).eq("published", true).eq("kind", kind).order("number");
  if (error) throw new Error("We couldn’t load this week’s session.");
  const out: any[] = [];
  for (const se of data ?? []) for (const u of [...se.units].filter((u: any) => u.published).sort((a: any, b: any) => a.number - b.number)) for (const s of [...u.sessions].sort((a: any, b: any) => a.week_number - b.week_number))
    out.push({ ...s, activities: [...s.activities].sort((a: any, b: any) => a.position - b.position), season: { number: se.number, title: se.title }, unit: { id: u.id, number: u.number, title: u.title, lead_strand: u.lead_strand, family_question: u.family_question, dinner_question: u.dinner_question, story_prompt: u.story_prompt, mission_project: u.mission_project, badge_name: u.badge_name, badge_description: u.badge_description, journal_prompt: u.journal_prompt } });
  return out;
}
async function progress(ctx: Ctx) {
  const [sp, ap, bd, ch] = await Promise.all([
    ctx.supabase.from("child_session_progress").select("child_id,session_id").eq("parent_id", ctx.userId),
    ctx.supabase.from("child_activity_progress").select("child_id,activity_id").eq("parent_id", ctx.userId),
    ctx.supabase.from("child_badges").select("child_id,unit_id,earned_at,units(badge_name)").eq("parent_id", ctx.userId),
    ctx.supabase.from("children").select("id").eq("parent_id", ctx.userId),
  ]);
  return { sessions: sp.data ?? [], activities: ap.data ?? [], badges: bd.data ?? [], childIds: (ch.data ?? []).map((c: any) => c.id as string) };
}

export const getFamilyCurriculum = createServerFn({ method: "GET" }).middleware([requireParentDevice]).handler(async ({ context }) => {
  const [ordered, p, answers] = await Promise.all([loadOrdered(context), progress(context),
    context.supabase.from("quest_responses").select("child_id,answer,correct,created_at,activities(title,step,sessions(title))").eq("parent_id", context.userId).order("created_at", { ascending: false }).limit(40)]);
  const done = familyActivityDone(ordered, p.childIds, p.activities);
  const current = pickCurrentSession(ordered, done);
  let printables: { id: string; title: string; url: string | null }[] = [];
  if (current) printables = await Promise.all(current.printables.map(async (pr: any) => {
    const { data } = await context.supabase.storage.from("printables").createSignedUrl(pr.file_path, 3600, { download: true });
    return { id: pr.id, title: pr.title, url: data?.signedUrl ?? null };
  }));
  const badges: Record<string, string[]> = {};
  for (const b of p.badges) (badges[b.child_id] ??= []).push(b.units?.badge_name ?? "Badge");
  const activityCounts: Record<string, Record<string, number>> = {};
  const strandOf = new Map<string, string>(); const totals: Record<string, number> = {};
  for (const s of ordered) for (const a of s.activities) { strandOf.set(a.id, a.strand); totals[a.strand] = (totals[a.strand] ?? 0) + 1; }
  for (const a of p.activities) { const st = strandOf.get(a.activity_id); if (st) { (activityCounts[a.child_id] ??= {})[st] = ((activityCounts[a.child_id] ??= {})[st] ?? 0) + 1; } }
  const quest: Record<string, { done: number; total: number; next: string | null }> = {};
  for (const c of p.childIds) {
    const mine = new Set<string>(p.sessions.filter((s: any) => s.child_id === c).map((s: any) => s.session_id as string));
    const states = questStates(ordered, mine); const nextIdx = states.indexOf("current");
    quest[c] = { done: states.filter((s) => s === "done").length, total: ordered.length, next: nextIdx >= 0 ? ordered[nextIdx].unit.title : null };
  }
  const ideas = (answers.data ?? []).filter((r: any) => r.activities?.step === "idea").map((r: any) => ({ childId: r.child_id as string, answer: r.answer as string, chapter: r.activities?.sessions?.title ?? "", at: r.created_at as string }));
  return { current: current ? { ...current, printables } : null, badges, skills: activityCounts, strandTotals: totals, quest, ideas };
});
export const familyCurriculumOptions = queryOptions({ queryKey: ["curriculum", "family"], queryFn: () => getFamilyCurriculum() });

async function loadKid(ctx: Ctx, childId: string) { const { loadChild } = await import("./studio.server"); return loadChild(ctx.supabase, ctx.userId, childId); }
async function childSessions(ctx: Ctx, childId: string) {
  const { data } = await ctx.supabase.from("child_session_progress").select("session_id").eq("child_id", childId).eq("parent_id", ctx.userId);
  return new Set<string>((data ?? []).map((r: any) => r.session_id));
}
/** A child may open finished chapters, the current one, and any published news side quest — never a locked chapter. */
async function openSession(ctx: Ctx, childId: string, sessionId: string) {
  const [series, news, done] = await Promise.all([loadOrdered(ctx), loadOrdered(ctx, "news"), childSessions(ctx, childId)]);
  const states = questStates(series, done);
  const i = series.findIndex((s) => s.id === sessionId);
  if (i >= 0) { if (states[i] === "locked") throw new Error("Finish the glowing chapter first!"); return series[i]; }
  const b = news.find((s) => s.id === sessionId); if (b) return b;
  throw new Error("We couldn’t find that chapter.");
}

export const getChildMission = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => z.object({ childId: uuid }).parse(i)).handler(async ({ data, context }) => {
  const child = await loadKid(context, data.childId);
  const [ordered, done, { data: bd }] = await Promise.all([loadOrdered(context), childSessions(context, child.id), context.supabase.from("child_badges").select("units(badge_name)").eq("child_id", child.id)]);
  const current = pickCurrentSession(ordered, done);
  const mission = current && { sessionId: current.id, title: current.title, unitTitle: current.unit.title, storyPrompt: current.unit.story_prompt, badgeName: current.unit.badge_name, done: ordered.filter((s) => done.has(s.id)).length, total: ordered.length };
  return { mission, badges: (bd ?? []).map((b: any) => b.units?.badge_name as string).filter(Boolean) };
});

export const getQuestMap = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => z.object({ childId: uuid }).parse(i)).handler(async ({ data, context }) => {
  const child = await loadKid(context, data.childId);
  const [series, news, done] = await Promise.all([loadOrdered(context), loadOrdered(context, "news"), childSessions(context, child.id)]);
  const states = questStates(series, done);
  return {
    chapters: series.map((s, i) => ({ sessionId: s.id, title: s.unit.title, season: s.season.title, badge: s.unit.badge_name, state: states[i]! })),
    bonus: news.map((s) => ({ sessionId: s.id, title: s.unit.title, done: done.has(s.id) })),
  };
});

export const getQuestChapter = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => z.object({ childId: uuid, sessionId: uuid }).parse(i)).handler(async ({ data, context }) => {
  const child = await loadKid(context, data.childId);
  const s = await openSession(context, child.id, data.sessionId);
  const ids = s.activities.map((a: any) => a.id);
  const [{ data: ap }, { data: ans }] = await Promise.all([
    context.supabase.from("child_activity_progress").select("activity_id").eq("child_id", child.id).in("activity_id", ids),
    context.supabase.from("quest_responses").select("activity_id,answer,correct").eq("child_id", child.id).in("activity_id", ids),
  ]);
  const doneSet = new Set((ap ?? []).map((r: any) => r.activity_id));
  const answers = new Map((ans ?? []).map((r: any) => [r.activity_id, r]));
  return {
    sessionId: s.id, title: s.unit.title, badge: s.unit.badge_name,
    steps: (s.activities as any[]).map((a: any): QuestStep => { const v = a.activity_versions.find((x: any) => x.age_band === child.age_band) ?? a.activity_versions[0]; const r: any = answers.get(a.id);
      return { id: a.id, step: a.step as string, kind: a.kind as string, title: v?.kid_title ?? a.title, text: v?.instructions ?? "", choices: ((v?.choices ?? []) as any[]).map((c) => c.label as string), done: doneSet.has(a.id), answer: r?.answer ?? null, correct: r?.correct ?? null }; }),
  };
});

export type QuestStep = { id: string; step: string; kind: string; title: string; text: string; choices: string[]; done: boolean; answer: string | null; correct: boolean | null };

/** Records an activity and, once the solo steps are done, the chapter and unit badge. */
async function markDone(ctx: Ctx, childId: string, activityId: string) {
  const sb = ctx.supabase; const base = { child_id: childId, parent_id: ctx.userId };
  const { error } = await sb.from("child_activity_progress").upsert({ ...base, activity_id: activityId }, { ignoreDuplicates: true });
  if (error) throw new Error("We couldn’t save that. Please try again.");
  const { data: act } = await sb.from("activities").select("session_id,sessions(unit_id)").eq("id", activityId).single();
  if (!act) return { finished: false, badge: null };
  const { data: sibs } = await sb.from("activities").select("id,step").eq("session_id", act.session_id);
  const { data: mine } = await sb.from("child_activity_progress").select("activity_id").eq("child_id", childId);
  if (!soloDone(sibs ?? [], new Set((mine ?? []).map((m: any) => m.activity_id)))) return { finished: false, badge: null };
  await sb.from("child_session_progress").upsert({ ...base, session_id: act.session_id }, { ignoreDuplicates: true });
  const unitId = (act.sessions as any)?.unit_id as string;
  const [{ data: unitSessions }, ds] = await Promise.all([sb.from("sessions").select("id").eq("unit_id", unitId), childSessions(ctx, childId)]);
  if (!(unitSessions ?? []).every((s: any) => ds.has(s.id))) return { finished: true, badge: null };
  await sb.from("child_badges").upsert({ ...base, unit_id: unitId }, { ignoreDuplicates: true });
  const { data: unit } = await sb.from("units").select("badge_name").eq("id", unitId).single();
  return { finished: true, badge: (unit?.badge_name as string) ?? null };
}

export const answerQuest = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth])
  .inputValidator((i: unknown) => z.object({ childId: uuid, sessionId: uuid, activityId: uuid, choice: z.number().int().min(0).max(5).optional(), text: z.string().trim().min(1).max(300).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const child = await loadKid(context, data.childId);
    const s = await openSession(context, child.id, data.sessionId);
    const a = s.activities.find((x: any) => x.id === data.activityId);
    if (!a || a.step === "campfire") throw new Error("That step isn’t part of this chapter.");
    const v = a.activity_versions.find((x: any) => x.age_band === child.age_band) ?? a.activity_versions[0];
    const save = async (answer: string, correct: boolean | null) => {
      const admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
      const { error } = await admin.from("quest_responses").upsert({ parent_id: context.userId, child_id: child.id, activity_id: a.id, answer, correct }, { onConflict: "child_id,activity_id" });
      if (error) throw new Error("We couldn’t save that. Please try again.");
    };
    if (a.kind === "choice") {
      if (data.choice === undefined) throw new Error("Pick one of the answers.");
      const g = gradeChoice((v?.choices ?? []) as any, data.choice);
      await save(g.label, g.correct);
      if (!g.correct) return { correct: false, message: g.why, finished: false, badge: null };
      return { correct: true, message: g.why, ...(await markDone(context, child.id, a.id)) };
    }
    if (a.kind === "free") {
      if (!data.text) throw new Error("Tell Bugley your idea first!");
      const { guardChildText } = await import("./studio.server");
      const g = await guardChildText(context.supabase, context.userId, child, data.text, "quest");
      if (g.decision !== "allowed") return { correct: false, blocked: true, message: g.reply ?? "Let’s try a different idea.", finished: false, badge: null };
      await save(data.text, null);
      return { correct: true, message: "Bugley loves that idea!", ...(await markDone(context, child.id, a.id)) };
    }
    return { correct: true, message: "", ...(await markDone(context, child.id, a.id)) };
  });

/** Older checklist activities: marks one done for the child. */
export const completeActivity = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => z.object({ childId: uuid, activityId: uuid }).parse(i)).handler(async ({ data, context }) => {
  const child = await loadKid(context, data.childId);
  const r = await markDone(context, child.id, data.activityId);
  return { badge: r.badge };
});

/** Family Table finish: records every activity and the session for each child who took part, and awards the unit badge when the unit is complete. */
export const completeFamilySession = createServerFn({ method: "POST" }).middleware([requireParentDevice]).inputValidator((i: unknown) => z.object({ sessionId: z.string().uuid(), childIds: z.array(z.string().uuid()).min(1).max(5) }).parse(i)).handler(async ({ data, context }) => {
  const sb = context.supabase;
  const { data: kids } = await sb.from("children").select("id").eq("parent_id", context.userId).in("id", data.childIds);
  const ids = (kids ?? []).map((k) => k.id);
  if (ids.length !== data.childIds.length) throw new Error("We couldn’t find one of those players.");
  const { data: session } = await sb.from("sessions").select("id,unit_id").eq("id", data.sessionId).single();
  if (!session) throw new Error("We couldn’t find this session.");
  const { data: allActs } = await sb.from("activities").select("id,step").eq("session_id", session.id);
  const campfire = (allActs ?? []).filter((a: any) => a.step === "campfire");
  // Quest chapters: the Campfire only records the shared moment; map lights come from each child's own solo steps.
  const acts = campfire.length ? campfire : allActs;
  const rows = ids.flatMap((c) => (acts ?? []).map((a: any) => ({ child_id: c, activity_id: a.id, parent_id: context.userId })));
  if (rows.length) { const { error } = await sb.from("child_activity_progress").upsert(rows, { ignoreDuplicates: true }); if (error) throw new Error("We couldn’t save progress."); }
  if (campfire.length) return { awarded: [] as string[], badge: null };
  const { error: se } = await sb.from("child_session_progress").upsert(ids.map((c) => ({ child_id: c, session_id: session.id, parent_id: context.userId })), { ignoreDuplicates: true });
  if (se) throw new Error("We couldn’t save progress.");
  const { data: unitSessions } = await sb.from("sessions").select("id").eq("unit_id", session.unit_id);
  const { data: unit } = await sb.from("units").select("badge_name").eq("id", session.unit_id).single();
  const awarded: string[] = [];
  for (const c of ids) {
    const { data: ds } = await sb.from("child_session_progress").select("session_id").eq("child_id", c);
    const set = new Set((ds ?? []).map((d) => d.session_id));
    if ((unitSessions ?? []).every((s) => set.has(s.id))) { await sb.from("child_badges").upsert({ child_id: c, unit_id: session.unit_id, parent_id: context.userId }, { ignoreDuplicates: true }); awarded.push(c); }
  }
  return { awarded, badge: unit?.badge_name ?? null };
});
