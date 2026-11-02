import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { entitySchemas, versionSchema, type EntityTable } from "@/lib/curriculum";
import { requireParentDevice } from './parent-device.functions';

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Only the Bugley admin can do this.");
}
export const getIsAdmin = createServerFn({ method: "GET" }).middleware([requireParentDevice]).handler(async ({ context }) => {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  return Boolean(data);
});
export const isAdminOptions = queryOptions({ queryKey: ["is-admin"], queryFn: () => getIsAdmin() });

export const getAdminTree = createServerFn({ method: "GET" }).middleware([requireParentDevice]).handler(async ({ context }) => {
  await assertAdmin(context);
  const { data, error } = await context.supabase.from("seasons").select("*,units(*,sessions(*,activities(*,activity_versions(*)),printables(*)))").order("number");
  if (error) throw new Error("Couldn’t load content.");
  return data as any[];
});
export const adminTreeOptions = queryOptions({ queryKey: ["admin-tree"], queryFn: () => getAdminTree() });

const tables = Object.keys(entitySchemas) as [EntityTable, ...EntityTable[]];
export const saveEntity = createServerFn({ method: "POST" }).middleware([requireParentDevice])
  .inputValidator((i: unknown) => { const b = z.object({ table: z.enum(tables), id: z.string().uuid().optional(), values: z.record(z.string(), z.unknown()) }).parse(i); return { ...b, values: entitySchemas[b.table].parse(b.values) as Record<string, unknown> }; })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const q = context.supabase.from(data.table as "seasons");
    const { data: row, error } = data.id ? await q.update(data.values as never).eq("id", data.id).select("id").single() : await q.insert(data.values as never).select("id").single();
    if (error) throw new Error(error.code === "23505" ? "That number is already used here." : "Couldn’t save. Check the fields and try again.");
    return { id: row.id as string };
  });
export const deleteEntity = createServerFn({ method: "POST" }).middleware([requireParentDevice])
  .inputValidator((i: unknown) => z.object({ table: z.enum([...tables, "printables"] as [string, ...string[]]), id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from(data.table as "seasons").delete().eq("id", data.id);
    if (error) throw new Error("Couldn’t delete. It may have kids’ progress attached.");
    return { ok: true };
  });
export const saveVersions = createServerFn({ method: "POST" }).middleware([requireParentDevice])
  .inputValidator((i: unknown) => z.object({ activityId: z.string().uuid(), versions: z.array(versionSchema).length(3) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("activity_versions").upsert(data.versions.map((v) => ({ ...v, activity_id: data.activityId })), { onConflict: "activity_id,age_band" });
    if (error) throw new Error("Couldn’t save the age versions.");
    return { ok: true };
  });
export const addPrintable = createServerFn({ method: "POST" }).middleware([requireParentDevice])
  .inputValidator((i: unknown) => z.object({ sessionId: z.string().uuid(), title: z.string().trim().min(1).max(120), filePath: z.string().min(1).max(300) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("printables").insert({ session_id: data.sessionId, title: data.title, file_path: data.filePath });
    if (error) throw new Error("Couldn’t save the printable.");
    return { ok: true };
  });

const draftBand = z.object({ story: z.string(), question: z.string(), choices: z.array(z.object({ label: z.string(), correct: z.boolean() })).min(2).max(4), idea: z.string(), campfire: z.string() });
const draftSchema = z.object({ title: z.string(), primer: z.string(), why: z.string(), sprouts: draftBand, explorers: draftBand, builders: draftBand });

/** Drafts a hidden "Fresh from the news" side quest from a published story. It stays unpublished until the admin reviews and switches it on. */
export const draftNewsQuest = createServerFn({ method: "POST" }).middleware([requireParentDevice])
  .inputValidator((i: unknown) => z.object({ newsId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    const { data: news } = await sb.from("family_ai_news").select("id,title,summary,response,family_guidance,status").eq("id", data.newsId).maybeSingle();
    if (!news || news.status !== "published") throw new Error("Publish the story with your take first.");
    const { data: existing } = await sb.from("sessions").select("id").eq("source_news_id", news.id).limit(1);
    if (existing?.length) throw new Error("This story already has a side quest draft.");
    const { aiObject } = await import("./studio-ai.server");
    const d = await aiObject(draftSchema,
      `Write a short bonus chapter for "Bugley's Quest", an AI-literacy adventure for children aged 5-12 with Bugley the friendly firefly. Base it ONLY on the news story and the founder's take provided. Give three age versions: sprouts (5-6, very simple, 2-3 short sentences), explorers (7-9), builders (10-12, slightly more grown-up). For each: story (3-4 sentences set in the Glimmerwood forest that explains the real idea through a kid-friendly metaphor; no scary details), question (one multiple-choice question), choices (3 options, exactly one correct), idea (an open question asking for the child's own idea, reminding them not to share real names or places), campfire (one question plus one quick no-screens family game). title: a fun place name in the forest (max 5 words). primer: 2 sentences for parents on what the child learned. why: one short praise line for the correct answer.`,
      `Headline: ${news.title}\nSummary: ${news.summary}\nFounder's take: ${news.response}\nFamily guidance: ${news.family_guidance}`);
    if (!d) throw new Error("Bugley couldn’t draft that one. Try again.");
    const { data: season } = await sb.from("seasons").select("id").eq("kind", "news").order("number").limit(1).maybeSingle();
    if (!season) throw new Error("The news season is missing.");
    const { data: last } = await sb.from("units").select("number").eq("season_id", season.id).order("number", { ascending: false }).limit(1);
    const { data: unit, error: ue } = await sb.from("units").insert({ season_id: season.id, number: (last?.[0]?.number ?? 0) + 1, title: d.title.slice(0, 120), lead_strand: "discern", family_question: d.explorers.campfire, dinner_question: d.explorers.campfire, story_prompt: d.explorers.idea, mission_project: "", badge_name: "News Scout", badge_description: "You explored AI in the news.", journal_prompt: d.builders.idea, published: false }).select("id").single();
    if (ue || !unit) throw new Error("Couldn’t save the side quest.");
    const { data: session, error: se } = await sb.from("sessions").insert({ unit_id: unit.id, week_number: 1, title: d.title.slice(0, 160), parent_primer: d.primer, script: "", source_news_id: news.id }).select("id").single();
    if (se || !session) throw new Error("Couldn’t save the side quest.");
    const steps = [["story", "done", "Bugley's story"], ["try", "choice", "Try it"], ["idea", "free", "My idea"], ["campfire", "done", "Campfire"]] as const;
    for (const [p, [step, kind, title]] of steps.entries()) {
      const { data: act } = await sb.from("activities").insert({ session_id: session.id, position: p + 1, title, strand: "discern", step, kind, offscreen: step === "campfire" }).select("id").single();
      if (!act) throw new Error("Couldn’t save the side quest.");
      const rows = (["sprouts", "explorers", "builders"] as const).map((b) => { const v = d[b];
        const text = step === "story" ? v.story : step === "try" ? v.question : step === "idea" ? v.idea : v.campfire;
        return { activity_id: act.id, age_band: b, kid_title: title, instructions: text, minutes: step === "campfire" ? 5 : 3, choices: step === "try" ? v.choices.map((c) => ({ ...c, why: c.correct ? d.why : "Not quite — try another!" })) : [] }; });
      const { error } = await sb.from("activity_versions").insert(rows);
      if (error) throw new Error("Couldn’t save the side quest.");
    }
    return { unitId: unit.id as string, title: d.title };
  });
