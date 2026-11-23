import { COMIC_GENRES } from "./comic";
// Create Studio V3: one idea → four-scene comic arc → one scene at a time.
// Reuses workspace persistence, safety guards, Character Lock and Glow charging.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireKidOrParentAuth } from "./kid-device-auth";
import { familyHasAccess } from "./billing.functions";
import { v3Count, v3Details, v3TempTitle, replaceV3Art, draftVersion, draftSaveDecision, savedDraftVersion } from "./v3";
import { cleanSparks, storyCoachingInstructions } from "./story";
import { formatStoryPage, storyCoachContext, storyLayoutSchema } from "./story-presentation";

const identity = z.object({ childId: z.string().uuid(), id: z.string().uuid() });
const environment = z.enum(["sandbox", "live"]);
const NAP = "Ask a grown-up to open your Studio plan.";

// A3.4.0: the unused "start a comic from an idea" step (startV3Comic) was removed; it could create a V3 comic with no
// characters. Every V3 comic now starts from an approved character (startV3Creation).

/** Character draft is separate from the eventual output, and never appears in approved cast.
 * A3.2: also saved quietly while the child types or speaks (before "Meet my character"). Versions are assigned by the
 * server, and each write is conditional on the version the client last saw, so a delayed request or another device's
 * older view can never overwrite newer words; a finished (closed) idea is never reopened. */
export const saveV3CharacterDraft = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => identity.extend({ description: z.string().max(600), styleKey: z.string().max(40), environment, kind: z.enum(["picture", "comic", "story"]).optional(), base: draftVersion.optional(), comicId: z.string().uuid().optional() }).parse(i)).handler(async ({ data, context }) => {
  if (!await familyHasAccess(context.supabase, context.userId, data.environment)) throw new Error(NAP);
  const s = await import("./studio.server");
  const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const read = async () => {
    const { data: row } = await a.from("studio_creations").select("parent_id,child_id,body,style_key,details").eq("id", data.id).maybeSingle();
    if (row && (row.parent_id !== context.userId || row.child_id !== child.id || !(row.details as any)?.characterDraftV3)) throw new Error("Choose your own character draft.");
    return row;
  };
  const answer = (row: Awaited<ReturnType<typeof read>>, saved: boolean) => {
    if (!row) return { id: data.id, saved, version: 0, closed: false, conflict: null };
    const closed = !!(row.details as any)?.closed;
    const version = savedDraftVersion(row.details);
    return { id: data.id, saved, version, closed, conflict: saved || closed ? null : { description: row.body ?? "", styleKey: row.style_key ?? "cartoon", version } };
  };
  const old = await read();
  // Decided before the safety check, so an out-of-date save costs nothing and logs nothing.
  const decision = draftSaveDecision(old, data.base);
  if (decision.action === "closed" || decision.action === "conflict") return answer(old, false);
  // A3.4.1: a character being made for an idea-first comic is linked to that comic (the child's own, still choosing
  // characters), so reopening the comic restores the words and the draft isn't listed as a second card.
  let forComic = (old?.details as { forComic?: string } | null)?.forComic;
  if (data.comicId && !forComic) {
    const { data: comic } = await a.from("studio_creations").select("details").eq("id", data.comicId).eq("parent_id", context.userId).eq("child_id", child.id).eq("kind", "comic").is("deleted_at", null).maybeSingle();
    if (!comic || (await import("./comic-idea")).ideaStageOf(comic.details) !== "cast") throw new Error("Choose your own comic idea.");
    forComic = data.comicId;
  }
  if (data.description.trim()) {
    const g = await s.guardChildText(context.supabase, context.userId, child, data.description, "character_details");
    if (g.decision !== "allowed") throw new Error(g.reply ?? "Try a made-up character.");
  }
  const next = decision.expect + 1;
  const details = { ...((old?.details as object) ?? {}), characterDraftV3: true, ...(data.kind ? { intendedKind: data.kind } : {}), ...(forComic ? { forComic } : {}), draftVersion: next };
  delete (details as { draftRev?: unknown }).draftRev;
  const value = { body: data.description, style_key: data.styleKey, details, updated_at: new Date().toISOString() };
  let error: unknown = null;
  let saved = false;
  if (old) {
    // The version is re-checked inside the write itself (Postgres re-evaluates it under the row lock), so two saves
    // racing from the same version can't both win.
    const r = await a.from("studio_creations").update(value).eq("id", data.id).eq("parent_id", context.userId).eq("child_id", child.id).eq("kind", "character")
      .contains("details", { characterDraftV3: true }).not("details", "cs", JSON.stringify({ closed: true }))
      .or(decision.expect === 0 ? "details->draftVersion.is.null,details->>draftVersion.eq.0" : `details->>draftVersion.eq.${decision.expect}`).select("id");
    error = r.error;
    saved = (r.data?.length ?? 0) > 0;
  } else {
    const ins = await a.from("studio_creations").insert({ ...value, id: data.id, parent_id: context.userId, child_id: child.id, kind: "character", title: "My character idea", images: [] });
    // 23505: another save created it a moment ago, so this one is a conflict like any other.
    if (ins.error && ins.error.code !== "23505") error = ins.error;
    saved = !ins.error;
  }
  if (error) throw new Error("Your character idea couldn’t save. Try again.");
  return saved ? { id: data.id, saved: true, version: next, closed: false, conflict: null } : answer(await read(), false);
});

export const getV3CharacterDraft = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => identity.parse(i)).handler(async ({ data, context }) => {
  const { loadChild } = await import("./studio.server");
  await loadChild(context.supabase, context.userId, data.childId);
  const { data: row } = await context.supabase.from("studio_creations").select("body,style_key,details").eq("id", data.id).eq("parent_id", context.userId).eq("child_id", data.childId).eq("kind", "character").is("deleted_at", null).maybeSingle();
  if (!row || !(row.details as any)?.characterDraftV3) throw new Error("That character idea couldn’t open.");
  const intended = (row.details as any)?.intendedKind;
  return { description: row.body ?? "", styleKey: row.style_key ?? "cartoon", version: savedDraftVersion(row.details), kind: (["picture", "comic", "story"].includes(intended) ? intended : undefined) as "picture" | "comic" | "story" | undefined };
});

/** A3.1: once the character is made, its idea stops showing under "Pick up where you left off". Owner-only; changes nothing else. */
export const closeV3CharacterDraft = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => identity.parse(i)).handler(async ({ data, context }) => {
  const s = await import("./studio.server");
  const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const { data: old } = await a.from("studio_creations").select("details").eq("id", data.id).eq("parent_id", context.userId).eq("child_id", child.id).eq("kind", "character").maybeSingle();
  if (!old || !(old.details as any)?.characterDraftV3) return { ok: false };
  const { error } = await a.from("studio_creations").update({ details: { ...(old.details as object), closed: true } }).eq("id", data.id).eq("parent_id", context.userId).eq("child_id", child.id);
  return { ok: !error };
});

/** A3.4.1: the newest unfinished character linked to an idea-first comic (or null). Owner-only read; changes nothing. */
export const getV3LinkedDraft = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), comicId: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  const { loadChild } = await import("./studio.server");
  await loadChild(context.supabase, context.userId, data.childId);
  const { data: rows } = await context.supabase.from("studio_creations").select("id,body,style_key,details,updated_at").eq("parent_id", context.userId).eq("child_id", data.childId).eq("kind", "character").is("deleted_at", null).contains("details", { characterDraftV3: true, forComic: data.comicId }).order("updated_at", { ascending: false }).limit(3);
  const row = (rows ?? []).find((r: any) => !r.details?.closed);
  return row ? { id: row.id as string, description: (row.body ?? "") as string, styleKey: (row.style_key ?? "cartoon") as string, version: savedDraftVersion(row.details) } : null;
});

/**
 * A3.4.1 "Start with my idea" (Explorers and Builders only; refused for Sprouts). Saves the child's idea exactly as typed
 * into a new idea-first comic, quietly while they type and again when they tap "That's my idea!" (`done`). The comic id
 * comes from the device, so a double tap or retry makes one comic. Versions are assigned by the server and every write
 * is conditional on the version the client last saw, so a delayed save or another device's older view never wins.
 * No Glow; one safety check per saved change. The idea never reaches Story Memory or drawing instructions.
 */
export const saveV3Idea = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => identity.extend({ idea: z.string().max(600), base: draftVersion.optional(), done: z.boolean().default(false), count: v3Count.optional(), genre: z.enum(COMIC_GENRES).optional(), environment }).parse(i)).handler(async ({ data, context }) => {
  if (!await familyHasAccess(context.supabase, context.userId, data.environment)) throw new Error(NAP);
  const ci = await import("./comic-idea");
  const s = await import("./studio.server");
  const child = await s.loadChild(context.supabase, context.userId, data.childId);
  if (!ci.ideaFirstAllowed(child.age_band)) throw new Error(ci.IDEA_SPROUTS);
  if (!ci.ideaLongEnough(data.idea)) throw new Error("Tell me a little more. Who or what is your comic about?");
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const { loadWorkspace } = await import("./workspace.server");
  const read = async () => {
    const { data: row } = await a.from("studio_creations").select("parent_id,child_id,kind,details,deleted_at").eq("id", data.id).maybeSingle();
    if (row && (row.parent_id !== context.userId || row.child_id !== child.id || row.kind !== "comic" || !ci.isIdeaComic(row.details) || row.deleted_at)) throw new Error(ci.IDEA_NOT_OWN);
    return row;
  };
  const answer = async (row: Awaited<ReturnType<typeof read>>, saved: boolean) => {
    const stage = row ? ci.ideaStageOf(row.details) : null;
    const version = row ? ci.savedIdeaVersion(row.details) : 0;
    const idea = ((row?.details as any)?.workspace?.originalIdea ?? "") as string;
    const project = row && (saved ? data.done : stage !== "idea") ? await loadWorkspace(context.supabase, context.userId, child.id, data.id) : null;
    return { id: data.id, saved, version, stage, conflict: saved || stage !== "idea" ? null : { idea, version }, project };
  };
  const old = await read();
  const decision = ci.ideaSaveDecision(old, data.base);
  // Decided before the safety check, so an out-of-date save costs nothing and logs nothing. A repeated
  // "That's my idea!" for a comic that already moved on simply reopens it.
  if (decision.action === "closed" || decision.action === "conflict") return answer(old, false);
  const g = await s.guardChildText(context.supabase, context.userId, child, data.idea, "story_idea");
  if (g.decision !== "allowed") throw new Error(g.reply ?? "Try a made-up idea.");
  const next = decision.expect + 1;
  const stage = data.done ? "cast" as const : "idea" as const;
  let saved = false;
  if (!old) {
    const { defaultComicCount } = await import("./comic-setup");
    const details = ci.ideaComicDetails(data.idea, data.count ?? defaultComicCount(child.age_band), data.genre ?? "Adventure", stage);
    const ins = await a.from("studio_creations").insert({ id: data.id, parent_id: context.userId, child_id: child.id, kind: "comic", title: ci.IDEA_TEMP_TITLE, body: "", style_key: null, details: details as never });
    // 23505: another save created it a moment ago, so this one is a conflict like any other.
    if (ins.error && ins.error.code !== "23505") throw new Error("Your idea couldn’t save. Try again.");
    saved = !ins.error;
  } else {
    const details = old.details as any;
    const workspace = { ...details.workspace, originalIdea: data.idea, ideaVersion: next, ideaStage: stage };
    const extra = data.done ? { ...(data.count ? { pages: (await import("./v3")).v3ComicPages(data.count) } : {}), ...(data.genre ? { genre: data.genre } : {}) } : {};
    // The version is re-checked inside the write itself, so two saves racing from the same version can't both win.
    const r = await a.from("studio_creations").update({ details: { ...details, ...extra, workspace }, updated_at: new Date().toISOString() }).eq("id", data.id).eq("parent_id", context.userId).eq("child_id", child.id).eq("kind", "comic").is("deleted_at", null)
      .contains("details", { workspace: { ideaStage: "idea" } }).or(decision.expect === 0 ? "details->workspace->ideaVersion.is.null,details->workspace->>ideaVersion.eq.0" : `details->workspace->>ideaVersion.eq.${decision.expect}`).select("id");
    if (r.error) throw new Error("Your idea couldn’t save. Try again.");
    saved = (r.data?.length ?? 0) > 0;
  }
  return answer(await read(), saved);
});

/**
 * A3.4.1: choose an idea-first comic's characters and plan before panel 1, then confirm ("Let's make it!"). Up to three
 * approved, family-owned characters in one drawing style; the comic takes its first character's look. Uses the comic's
 * server-written timestamp as its version (a stale screen is refused). Nothing is frozen, drawn or charged here:
 * characters are frozen at panel 1 exactly as for character-first comics.
 */
export const setV3IdeaPlan = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => identity.extend({ updatedAt: z.string(), characterIds: z.array(z.string().uuid()).max(3), count: v3Count.optional(), genre: z.enum(COMIC_GENRES).optional(), confirm: z.boolean().default(false), environment }).parse(i)).handler(async ({ data, context }) => {
  if (!await familyHasAccess(context.supabase, context.userId, data.environment)) throw new Error(NAP);
  const ci = await import("./comic-idea");
  const s = await import("./studio.server");
  const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const { loadWorkspace, persistWorkspace } = await import("./workspace.server");
  const p = await loadWorkspace(context.supabase, context.userId, child.id, data.id);
  if (p.kind !== "comic") throw new Error(ci.IDEA_NOT_OWN);
  if (p.updatedAt !== data.updatedAt) throw new Error("Your comic changed on another screen. Reopen it; your characters are safe.");
  const ids = data.characterIds;
  const { data: rows } = ids.length ? await context.supabase.from("studio_creations").select("id,title,style_key,details,updated_at").eq("parent_id", context.userId).eq("child_id", child.id).eq("kind", "character").is("deleted_at", null).in("id", ids) : { data: [] as any[] };
  const problem = ci.ideaCastProblem({ ...p.details, workspace: p.workspace }, ids, (rows ?? []) as any[], data.confirm);
  if (problem) throw new Error(problem);
  const look = ci.ideaLook(ids, (rows ?? []) as any[]);
  p.details.characterIds = [...ids];
  if (look) { p.styleKey = look; p.details.styleKey = look; }
  p.workspace.castVersions = Object.fromEntries((rows ?? []).map((r: any) => [r.id, r.updated_at]));
  p.details.map = { ...p.details.map, hero: (rows ?? []).find((r: any) => r.id === ids[0])?.title ?? "" };
  if (data.genre) p.details.genre = data.genre;
  if (data.count && data.count !== p.details.pages.flatMap((x: any) => x.panels).length) p.details.pages = (await import("./v3")).v3ComicPages(data.count);
  if (data.confirm) delete p.workspace.ideaStage;
  await persistWorkspace(context.userId, child.id, p);
  return loadWorkspace(context.supabase, context.userId, child.id, data.id);
});

export const readV3Character = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), description: z.string().trim().min(2).max(600), help: z.boolean().default(false), writing: z.boolean().default(false) }).parse(i)).handler(async ({ data, context }) => {
  const s = await import("./studio.server"); const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const g = await s.guardChildText(context.supabase, context.userId, child, data.description, "character_details");
  if (g.decision !== "allowed") throw new Error(g.reply ?? "Try a made-up character.");
  const { aiObject } = await import("./studio-ai.server");
  const out = await aiObject(z.object({ name: z.string().max(40), kind: z.string().max(160), color: z.string().max(80), special: z.string().max(160), personality: z.string().max(80), question: z.string().max(160), ideas: z.array(z.string().max(60)).max(3) }),
    `Read this child's original character description. Extract ONLY stated facts into name (invented character name, never child's real name), kind (species/type AND appearance), color, special (clothes/accessories/markings), personality. Empty strings for unstated facts. Ask ONE short question for the most important missing fact: invented name, species/type, or visible appearance. If an outfit/accessory is mentioned but unclear, probe it; don't require clothing for animals/creatures or invent it. Explicit no-clothes is complete. Don't require personality or a special item. Return question empty if enough to paint. ${data.help ? "Offer up to three optional 2–5-word idea sparks. End the question with Your call!" : "Return ideas empty; the child didn't request suggestions."} Never write story prose.`, JSON.stringify({ description: data.description, age: child.age }));
  if (!out) throw new Error("Bugley couldn’t check that just now. Your description is still here.");
  if (!out.name.trim()) out.question = "What’s your character’s made-up name?";
  else if (!out.kind.trim()) out.question = "What kind of creature is your character?";
  if (!data.help) out.ideas = [];
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  if (g.eventId) {
    const { error } = await a.from("studio_events").update({ reply: out.question || "Your character is ready to paint." }).eq("id", g.eventId).eq("parent_id", context.userId);
    if (error) throw new Error("Bugley’s question couldn’t save. Try again.");
  }
  return out;
});

export const startV3Creation = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => identity.extend({ kind: z.enum(["comic", "story", "picture"]), title: z.string().trim().max(80).default(""), count: v3Count, characterId: z.string().uuid(), genre: z.enum(COMIC_GENRES).optional(), environment }).parse(i)).handler(async ({ data, context }) => {
  if (!await familyHasAccess(context.supabase, context.userId, data.environment)) throw new Error(NAP);
  const s = await import("./studio.server"); const child = await s.loadChild(context.supabase, context.userId, data.childId);
  // A3.1: comics may start unnamed (named at the end); pictures and stories still need a title here.
  const pending = data.kind === "comic" && !data.title;
  if (!pending && !data.title) throw new Error("Give it a name first.");
  if (!pending) {
    const g = await s.guardChildText(context.supabase, context.userId, child, data.title, "story_title");
    if (g.decision !== "allowed") throw new Error(g.reply ?? "Try a made-up title.");
  }
  const { data: hero } = await context.supabase.from("studio_creations").select("id,title,style_key,details,updated_at").eq("id", data.characterId).eq("parent_id", context.userId).eq("child_id", child.id).eq("kind", "character").is("deleted_at", null).maybeSingle();
  if (!hero?.style_key || !(hero.details as any)?.dna || !(hero.details as any)?.refs?.length) throw new Error("Choose an approved character first.");
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await a.from("studio_creations").select("parent_id,child_id,kind").eq("id", data.id).maybeSingle();
  if (existing) {
    if (existing.parent_id !== context.userId || existing.child_id !== child.id || existing.kind !== data.kind) throw new Error("Choose your own creation.");
    return (await import("./workspace.server")).loadWorkspace(context.supabase, context.userId, child.id, data.id);
  }
  const details = v3Details(data.kind, data.count, { id: hero.id, title: hero.title, styleKey: hero.style_key }, data.genre, pending);
  details.workspace.castVersions = { [hero.id]: hero.updated_at };
  const { error } = await a.from("studio_creations").insert({ id: data.id, parent_id: context.userId, child_id: child.id, kind: data.kind, title: pending ? v3TempTitle(hero.title) : data.title, body: "", style_key: hero.style_key, details: details as never });
  if (error) throw new Error("Your creation couldn’t start. Your character is safe.");
  return (await import("./workspace.server")).loadWorkspace(context.supabase, context.userId, child.id, data.id);
});

/** Saved child words are never replaced by the optional sparks. */
export const helpV3Scene = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => identity.extend({ text: z.string().max(20000), itemId: z.string().uuid().optional(), help: z.boolean().default(false), writing: z.boolean().default(false) }).parse(i)).handler(async ({ data, context }) => {
  const s = await import("./studio.server"); const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const p = await (await import("./workspace.server")).loadWorkspace(context.supabase, context.userId, child.id, data.id);
  const storyContext = p.kind === "story" ? storyCoachContext(p.details, data.itemId ?? "", data.text) : null;
  if (p.kind === "story" && !data.help && !data.writing && (p.details.followups ?? []).includes(data.itemId)) return { question: "", ideas: [] as string[], praise: "", tips: [] as { skill: string; tip: string }[] };
  const g = await s.guardChildText(context.supabase, context.userId, child, data.text.trim() || "Help with my adventure", "story");
  if (g.decision !== "allowed") throw new Error(g.reply ?? "Try a made-up scene.");
  const { aiObject } = await import("./studio-ai.server");
  const writingRules = p.kind === "story" && data.writing ? ` ALSO act as a kind writing teacher for THIS page only. Return praise: one specific sentence celebrating something real they did well. Return tips: 1–2 short writing lessons matched to age ${child.age} (e.g. capital letters at the start and for names, ending sentences with . ! or ?, splitting a very long sentence, a stronger describing word, showing a feeling, using quotation marks for talking, varying how sentences start). Each tip has skill (2–4 words) and tip (one friendly sentence explaining how to do it and where, by quoting at most 4 of the child's own words). Never rewrite or supply their sentence; any example must be about something unrelated to their story (like a cat or the rain). If the writing is already strong for their age, return one stretch tip. Spelling: point out at most one misspelled word gently.` : " Return praise empty and tips empty.";
  const out = await aiObject(z.object({ question: z.string().max(160), ideas: z.array(z.string().max(60)).max(3), praise: z.string().max(160), tips: z.array(z.object({ skill: z.string().max(40), tip: z.string().max(200) })).max(2) }),
    p.kind === "story" ? `${storyCoachingInstructions(child.age_band)} The selected hero is already designed. Coach this CURRENT page of a real child-authored book, using only earlier pages and the saved map. Never ask for a detail already supplied or implied by continuity. Ask ONE gentle question only for a confusing jump, unclear motivation, missing action/place, or contradiction; otherwise return question empty. Do not demand every map field or force a conventional ending. ${data.help ? "The child requested help: offer 2–3 short optional idea sparks for this page's hidden beat, never ready-made sentences. End your question with Your call!" : "Return ideas empty; the child did not request sparks."}` : `Coach a child ages 5–12. ${data.help ? "Offer up to 3 short adventure/scene sparks of 2–5 words, not sentences. End the question with Your call!" : "Return ideas empty. The hero character(s) are ALREADY in every scene and fully designed: never ask who is there, what they are, or what they look like. Ask ONE short question only if the description lacks an action or place needed for drawing, accounting for saved previous scenes. Otherwise question empty. Don't ask decorative or unnecessary questions."} NEVER write or rewrite child story words.` + writingRules, JSON.stringify({ title: p.title, hero: p.details.map?.hero, ...(storyContext ?? { previous: p.details.pages, text: data.text }), age: child.age }));
  if (!out) throw new Error("Bugley couldn’t help just now. Your words are still here.");
  out.ideas = data.help ? cleanSparks(out.ideas.map(idea => idea.replace(/\s*[—–-]?\s*Your call!?\s*$/i, ""))) : [];
  if (p.kind === "story" && !data.help && !data.writing) {
    p.details.followups = [...(p.details.followups ?? []), data.itemId];
    await (await import("./workspace.server")).persistWorkspace(context.userId, child.id, p);
  }
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  if (g.eventId) {
    const { error } = await a.from("studio_events").update({ reply: [out.question, ...out.ideas, out.praise, ...out.tips.map(t => `${t.skill}: ${t.tip}`)].filter(Boolean).join(" · ") || "Your scene has enough detail." }).eq("id", g.eventId).eq("parent_id", context.userId);
    if (error) throw new Error("Bugley’s help couldn’t save. Try again.");
  }
  return out;
});

/** Presentation-only changes never generate art or spend Glow. */
export const formatV3Story = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => identity.extend({ updatedAt: z.string(), itemId: z.string().uuid(), layout: storyLayoutSchema, chapter: z.string().max(120) }).parse(i)).handler(async ({ data, context }) => {
  const s = await import("./studio.server");
  const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const { loadWorkspace, persistWorkspace } = await import("./workspace.server");
  const p = await loadWorkspace(context.supabase, context.userId, child.id, data.id);
  if (p.kind !== "story" || p.details.finished || p.updatedAt !== data.updatedAt) throw new Error("Reopen your story before changing its pages.");
  (await import("./workspace")).assertWorkspaceIdle(p.details);
  const index = p.details.pages.findIndex((page: { id: string }) => page.id === data.itemId);
  const page = p.details.pages[index];
  if (!page) throw new Error("Choose a story page first.");
  if (data.chapter !== page.chapter && data.chapter.trim()) {
    const guard = await s.guardChildText(context.supabase, context.userId, child, data.chapter, "story");
    if (guard.decision !== "allowed") throw new Error(guard.reply ?? "Try a made-up chapter name.");
  }
  p.details.pages[index] = formatStoryPage(page, data.layout, data.chapter);
  await persistWorkspace(context.userId, child.id, p);
  return loadWorkspace(context.supabase, context.userId, child.id, p.id);
});

/** Atomic art replacement: original image remains saved until a checked redraw can be persisted. */
export const paintV3Scene = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => identity.extend({ updatedAt: z.string(), itemId: z.string().uuid().optional(), text: z.string().max(20000).optional(), revision: z.string().trim().max(600).optional(), description: z.string().max(600).optional(), environment, op: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  if (!await familyHasAccess(context.supabase, context.userId, data.environment)) throw new Error(NAP);
  const s = await import("./studio.server"); const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const { loadWorkspace, persistWorkspace } = await import("./workspace.server");
  let p = await loadWorkspace(context.supabase, context.userId, child.id, data.id);
  if (p.updatedAt !== data.updatedAt) throw new Error("Your work changed. Reopen it first.");
  const { recoverStalePaint, snapshotCast } = await import("./workspace.server");
  const recovered = await recoverStalePaint(context.supabase, context.userId, child.id, p);
  if (recovered !== p) throw new Error("Your last drawing was interrupted, so Bugley reset it. Your glow is safe. Tap draw again.");
  const { assertWorkspaceIdle } = await import("./workspace"); assertWorkspaceIdle(p.details);
  if (p.details.finished) throw new Error("Open your creation to keep working first.");
  const cc = await import("./comic-continuity");
  const items: any[] = p.kind === "comic" ? p.details.pages.flatMap((page: any) => page.panels) : p.details.pages ?? [];
  const item = items.find(x => x.id === data.itemId);
  if (p.kind !== "picture" && !item) throw new Error("Choose a scene first.");
  // A3.4.0: a comic panel needs at least one approved character; refused before any safety check, claim or charge.
  if (p.kind === "comic" && !(p.details.characterIds ?? p.details.characters ?? []).length) throw new Error(cc.NO_CAST);
  // A3.4.1: an idea-first comic draws only after its characters are confirmed.
  const pendingIdea = p.kind === "comic" ? (await import("./comic-idea")).ideaDrawProblem({ workspace: p.workspace }) : null;
  if (pendingIdea) throw new Error(pendingIdea);
  const words = data.text ?? (p.kind === "picture" ? p.workspace.originalIdea : p.kind === "comic" ? item.description : item.text);
  if (!words?.trim()) throw new Error("Describe your scene first.");
  if (p.kind === "comic" && words.trim().length > cc.CHILD_SCENE_LIMIT) throw new Error(`Your scene is a little long for one picture. Can you make it shorter than ${cc.CHILD_SCENE_LIMIT} letters?`);
  for (const text of [words, data.revision, data.description].filter(Boolean) as string[]) {
    const g = await s.guardChildText(context.supabase, context.userId, child, text, "story");
    if (g.decision !== "allowed") throw new Error(g.reply ?? "Try a made-up scene.");
  }
  if (!data.revision) {
    if (p.kind === "picture") { p.workspace.originalIdea = words.slice(0, 600); p.body = words.slice(0, 600); }
    else if (p.kind === "comic") item.description = words.slice(0, 600);
    else { if (item.text !== words) item.description = ""; item.text = words; }
    await persistWorkspace(context.userId, child.id, p);
    Object.assign(p, await loadWorkspace(context.supabase, context.userId, child.id, p.id));
  }
  let description = data.description || (p.kind === "story" ? item.description || words.slice(0, 600) : words.slice(0, 600));
  let notes: string | undefined;
  if (data.revision) {
    const { aiObject } = await import("./studio-ai.server");
    // The planner only adds visual notes; the child's exact scene and change are sent separately.
    const out = await aiObject(z.object({ description: z.string().max(600) }), "Produce short internal illustration notes only (what to adjust visually) for applying the child's requested change to the existing scene. Never contradict, drop or reword the child's scene or change; preserve everything not requested; same characters. Do not author story prose or dialogue.", JSON.stringify({ scene: p.kind === "comic" ? item.description || words : description, change: data.revision }));
    if (!out) throw new Error("Bugley couldn’t plan that change. Your original picture is safe.");
    if (p.kind === "comic") notes = out.description; else description = out.description;
  }
  const cm = await import("./comic-memory");
  let notesJob: Promise<import("./comic-memory").PanelNote[] | null> = Promise.resolve(null);
  if (p.kind === "comic") {
    // Every character is frozen before it is ever drawn; a missing copy stops here, before any claim or charge.
    const ids: string[] = p.details.characterIds ?? p.details.characters ?? [];
    const missing = cm.missingSnapshotIds(p.details.castSnapshot, ids);
    if (missing.length) {
      const snap = await snapshotCast(context.supabase, context.userId, child.id, p.id, missing, p.styleKey);
      if (!snap || snap.length !== missing.length) throw new Error("Bugley couldn’t save a copy of your characters for this comic. Your glow is safe. Please try again.");
      p.details.castSnapshot = cm.mergeSnapshots(p.details.castSnapshot, snap); await persistWorkspace(context.userId, child.id, p); Object.assign(p, await loadWorkspace(context.supabase, context.userId, child.id, p.id));
    }
    // A3.4.0: every character must now have a valid frozen copy in this comic's look, before the claim and any charge.
    const frozen = cc.frozenCastProblem(p.details.castSnapshot, ids, `${context.userId}/${child.id}/`, p.styleKey);
    if (frozen) throw new Error(frozen);
    const panels = p.details.pages.flatMap((page: any) => page.panels);
    const current = panels.find((x: any) => x.id === item.id) ?? item;
    const memory = cm.readMemory(p.details.storyMemory);
    description = cc.buildPanelPrompt({ scene: current.description || words, change: data.revision, notes, genre: p.details.genre, memory: cm.memoryPrompt(cm.liveMemory(memory, panels, item.id), undefined, `${current.description || words} ${data.revision ?? ""}`, (p.details.castSnapshot ?? []).map((c: any) => c.title)), continuity: cc.buildContinuity(panels, item.id) });
    // Memory notes run alongside the drawing and never block it.
    const toNote = cm.panelsToNote(memory, panels, item.id);
    if (toNote.length) {
      const known = memory.items.filter(i => i.stamp === cm.panelStamp(panels.find((x: any) => x.id === i.panelId)?.description));
      notesJob = import("./comic-memory.server").then(m => m.extractPanelNotes(toNote, known, (p.details.castSnapshot ?? []).map((c: any) => c.title))).catch(() => null);
    }
  } else if (p.details.genre) description = `${p.details.genre} mood, colors and lighting. ${description}`.slice(0, 600);
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const claimedAt = new Date().toISOString();
  const { data: claim } = await a.from("studio_creations").update({ details: { ...p.details, paintState: "painting", paintOp: data.op, paintStartedAt: claimedAt }, updated_at: claimedAt }).eq("id", p.id).eq("parent_id", context.userId).eq("child_id", child.id).eq("updated_at", p.updatedAt).select("id").maybeSingle();
  if (!claim) throw new Error("Your scene changed. Reopen it first.");
  p.updatedAt = claimedAt;
  let charged = false;
  try {
    const { generateImage } = await import("./images.server");
    const prior = p.kind === "picture" ? p.images[0] : item.image;
    const result = await generateImage(context.supabase, context.userId, { childId: child.id, description, styleKey: p.styleKey, characterIds: p.details.characterIds ?? p.details.characters ?? [], mode: p.kind === "picture" ? "sketch" : "final", requireReferences: true, lockId: p.id, pictureFlow: p.kind === "picture", editPath: data.revision ? prior : undefined, op: data.op, castSnapshot: p.kind === "comic" ? p.details.castSnapshot : undefined, frozenCast: p.kind === "comic" });
    if (!result.ok) throw new Error(result.reply);
    charged = true;
    const { data: lockRow } = await a.from("studio_creations").select("details").eq("id", p.id).eq("parent_id", context.userId).eq("child_id", child.id).maybeSingle();
    const locked = lockRow?.details as any;
    if (locked?.artLock) p.details.artLock = locked.artLock;
    if (locked?.modelLock || result.lock) p.details.modelLock = locked?.modelLock ?? result.lock;
    if (p.kind === "picture") {
      p.workspace.originalIdea = words.slice(0, 600); p.body = words.slice(0, 600); p.images = [result.path]; p.details.mode = "sketch"; p.details.upgradeState = "ready";
    } else {
      const target = (p.kind === "comic" ? p.details.pages.flatMap((page: any) => page.panels) : p.details.pages).find((x: any) => x.id === data.itemId);
      if (!target) throw new Error("Your scene couldn’t be found.");
      // Comic panel descriptions are the child's own scene words; never replace them with hidden drawing instructions.
      Object.assign(target, replaceV3Art(target, result, p.kind === "comic" ? target.description : description));
      if (p.kind === "comic") {
        target.dialogueDone = false;
        try {
          const notes = await (await import("./comic-memory.server")).withTimeout(notesJob, 10_000);
          if (notes?.length) p.details.storyMemory = cm.mergeNotes(cm.readMemory(p.details.storyMemory), p.details.pages.flatMap((page: any) => page.panels), notes);
        } catch (e) { console.error("story memory merge skipped", e); }
      }
      else target.text = words;
    }
    // Only the op that still owns the claim may save (persistWorkspace also checks updated_at).
    const { data: owner } = await a.from("studio_creations").select("details").eq("id", p.id).eq("parent_id", context.userId).eq("child_id", child.id).maybeSingle();
    if ((owner?.details as any)?.paintOp !== data.op || (owner?.details as any)?.paintState !== "painting") throw new Error("This drawing was replaced by a newer one. Your newest picture is safe.");
    p.details.paintState = "done"; p.details.paintOp = data.op; delete p.details.paintStartedAt;
    await persistWorkspace(context.userId, child.id, p);
    if (p.kind === "comic" && data.revision && prior && result.path !== prior) {
      // `prior` was captured before the panel object was updated, so this compares the old picture with the new one.
      const mem = await import("./comic-memory.server");
      await mem.withTimeout(mem.logRevisionCheck({ parentId: context.userId, childId: child.id, creationId: p.id, styleKey: p.styleKey, model: p.details.modelLock?.model ?? "unknown", before: prior, after: result.path, change: data.revision }), 15_000);
    }
    return loadWorkspace(context.supabase, context.userId, child.id, p.id);
  } catch (e) {
    if (charged) { try { await (await import("./glow.server")).refundGlowOnce(context.supabase, context.userId, child.id, data.op, "Refund: revised scene could not save"); } catch { /* reported to admins inside refundGlowOnce */ } }
    await a.from("studio_creations").update({ details: { ...(await loadWorkspace(context.supabase, context.userId, child.id, p.id)).details, paintState: "failed" }, updated_at: new Date().toISOString() }).eq("id", p.id).eq("parent_id", context.userId).eq("child_id", child.id).eq("updated_at", claimedAt);
    throw e;
  }
});


/** Free cover: reuse one of the child's own drawn scenes as the cover (no new art, no Glow). */
export const chooseV3Cover = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => identity.extend({ itemId: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  const s = await import("./studio.server"); const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const { loadWorkspace, persistWorkspace } = await import("./workspace.server");
  const p = await loadWorkspace(context.supabase, context.userId, child.id, data.id);
  if (p.kind === "picture" || p.details.finished) throw new Error("Open your creation to keep working first.");
  const items: any[] = p.kind === "comic" ? p.details.pages.flatMap((page: any) => page.panels) : p.details.pages ?? [];
  const image = items.find(x => x.id === data.itemId)?.image;
  if (!image) throw new Error("Draw that scene first.");
  p.details.cover = image;
  await persistWorkspace(context.userId, child.id, p);
  return loadWorkspace(context.supabase, context.userId, child.id, p.id);
});
