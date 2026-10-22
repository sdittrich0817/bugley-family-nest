import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { familyCompleted, pickCurrentSession } from "@/lib/curriculum";

type Ctx = { supabase: any; userId: string };
const TREE = "id,number,title,units(id,number,title,lead_strand,family_question,dinner_question,story_prompt,mission_project,badge_name,badge_description,sessions(id,week_number,title,parent_primer,script,activities(id,position,title,strand,offscreen,activity_versions(age_band,kid_title,instructions,minutes)),printables(id,title,file_path)))";

async function loadOrdered(ctx: Ctx) {
  const { data, error } = await ctx.supabase.from("seasons").select(TREE).eq("published", true).order("number");
  if (error) throw new Error("We couldn’t load this week’s session.");
  const out: any[] = [];
  for (const se of data ?? []) for (const u of [...se.units].sort((a: any, b: any) => a.number - b.number)) for (const s of [...u.sessions].sort((a: any, b: any) => a.week_number - b.week_number))
    out.push({ ...s, activities: [...s.activities].sort((a: any, b: any) => a.position - b.position), season: { number: se.number, title: se.title }, unit: { id: u.id, number: u.number, title: u.title, lead_strand: u.lead_strand, family_question: u.family_question, dinner_question: u.dinner_question, story_prompt: u.story_prompt, mission_project: u.mission_project, badge_name: u.badge_name, badge_description: u.badge_description } });
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

export const getFamilyCurriculum = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [ordered, p] = await Promise.all([loadOrdered(context), progress(context)]);
  const done = familyCompleted(ordered.map((s) => s.id), p.childIds, p.sessions);
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
  return { current: current ? { ...current, printables } : null, badges, skills: activityCounts, strandTotals: totals };
});
export const familyCurriculumOptions = queryOptions({ queryKey: ["curriculum", "family"], queryFn: () => getFamilyCurriculum() });

export const getChildMission = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  const { data: child } = await context.supabase.from("children").select("id,age_band").eq("id", data.childId).eq("parent_id", context.userId).maybeSingle();
  if (!child) throw new Error("We couldn’t find that player.");
  const ordered = await loadOrdered(context);
  const [{ data: sp }, { data: ap }, { data: bd }] = await Promise.all([
    context.supabase.from("child_session_progress").select("session_id").eq("child_id", child.id),
    context.supabase.from("child_activity_progress").select("activity_id").eq("child_id", child.id),
    context.supabase.from("child_badges").select("units(badge_name)").eq("child_id", child.id),
  ]);
  const current = pickCurrentSession(ordered, new Set((sp ?? []).map((r) => r.session_id)));
  const doneActs = new Set((ap ?? []).map((r) => r.activity_id));
  const mission = current && {
    sessionId: current.id, title: current.title, unitTitle: current.unit.title, storyPrompt: current.unit.story_prompt, badgeName: current.unit.badge_name,
    activities: current.activities.map((a: any) => { const v = a.activity_versions.find((x: any) => x.age_band === child.age_band); return { id: a.id, title: v?.kid_title ?? a.title, instructions: v?.instructions ?? "", minutes: v?.minutes ?? 10, done: doneActs.has(a.id) }; }),
  };
  return { mission, badges: (bd ?? []).map((b: any) => b.units?.badge_name as string).filter(Boolean) };
});

/** Marks one activity done; completes the session when all its activities are done, and awards the unit badge when every session in the unit is done. */
export const completeActivity = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), activityId: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  const sb = context.supabase; const base = { child_id: data.childId, parent_id: context.userId };
  const { error } = await sb.from("child_activity_progress").upsert({ ...base, activity_id: data.activityId }, { ignoreDuplicates: true });
  if (error) throw new Error("We couldn’t save that. Please try again.");
  const { data: act } = await sb.from("activities").select("session_id,sessions(unit_id)").eq("id", data.activityId).single();
  if (!act) return { badge: null };
  const { data: sibs } = await sb.from("activities").select("id").eq("session_id", act.session_id);
  const { data: mine } = await sb.from("child_activity_progress").select("activity_id").eq("child_id", data.childId);
  const doneSet = new Set((mine ?? []).map((m) => m.activity_id));
  if (!(sibs ?? []).every((s) => doneSet.has(s.id))) return { badge: null };
  await sb.from("child_session_progress").upsert({ ...base, session_id: act.session_id }, { ignoreDuplicates: true });
  const unitId = (act.sessions as any)?.unit_id as string;
  const { data: unitSessions } = await sb.from("sessions").select("id").eq("unit_id", unitId);
  const { data: doneSessions } = await sb.from("child_session_progress").select("session_id").eq("child_id", data.childId);
  const ds = new Set((doneSessions ?? []).map((d) => d.session_id));
  if (!(unitSessions ?? []).every((s) => ds.has(s.id))) return { badge: null };
  await sb.from("child_badges").upsert({ ...base, unit_id: unitId }, { ignoreDuplicates: true });
  const { data: unit } = await sb.from("units").select("badge_name").eq("id", unitId).single();
  return { badge: unit?.badge_name ?? null };
});
