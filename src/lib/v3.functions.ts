import { COMIC_GENRES } from "./comic";
// Create Studio V3: one idea → four-scene comic arc → one scene at a time.
// Reuses workspace persistence, safety guards, Character Lock and Glow charging.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireKidOrParentAuth } from "./kid-device-auth";
import { familyHasAccess } from "./billing.functions";
import { EMPTY_MAP, ideaGenre } from "./story";
import { newComicPage } from "./comic";
import { v3Count, v3Details, replaceV3Art } from "./v3";

const identity = z.object({ childId: z.string().uuid(), id: z.string().uuid() });
const environment = z.enum(["sandbox", "live"]);
const NAP = "Ask a grown-up to open your Studio plan.";

/** Moment 1 — The Spark: one idea starts a saved four-scene comic workspace. No title, genre, style or length questions. */
export const startV3Comic = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), id: z.string().uuid(), idea: z.string().trim().min(3).max(600), environment }).parse(i)).handler(async ({ data, context }) => {
  if (!await familyHasAccess(context.supabase, context.userId, data.environment)) throw new Error(NAP);
  const s = await import("./studio.server");
  const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await a.from("studio_creations").select("id,parent_id,child_id").eq("id", data.id).maybeSingle();
  if (existing) {
    if (existing.parent_id !== context.userId || existing.child_id !== child.id) throw new Error("Choose your own creation.");
    return (await import("./workspace.server")).loadWorkspace(context.supabase, context.userId, child.id, data.id);
  }
  const guard = await s.guardChildText(context.supabase, context.userId, child, data.idea, "story_idea");
  if (guard.decision !== "allowed") throw new Error(guard.reply ?? "Try a made-up idea.");
  const { data: styles } = await a.from("art_styles").select("key").eq("active", true).order("position");
  const style = styles?.find(x => x.key === "classic_comic")?.key ?? styles?.[0]?.key;
  if (!style) throw new Error("Bugley’s paints aren’t ready yet.");
  const page = newComicPage("four");
  const workspace = { version: 1 as const, v3: true as const, originalIdea: data.idea, activity: "imagine" as const, outlineApproved: false, castVersions: {} };
  const details = { workspace, genre: "Adventure", styleKey: style, characterIds: [], map: { ...EMPTY_MAP }, pages: [page], finished: false, cover: null, guidedBand: child.age_band, length: "short", followups: [] };
  const { error } = await a.from("studio_creations").insert({ id: data.id, parent_id: context.userId, child_id: child.id, kind: "comic", title: "My comic", body: data.idea, style_key: style, details: details as never });
  if (error) throw new Error("Your idea is still here. Try saving again.");
  return (await import("./workspace.server")).loadWorkspace(context.supabase, context.userId, child.id, data.id);
});

/** Character draft is separate from the eventual output, and never appears in approved cast. */
export const saveV3CharacterDraft = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => identity.extend({ description: z.string().max(600), styleKey: z.string().max(40), environment }).parse(i)).handler(async ({ data, context }) => {
  if (!await familyHasAccess(context.supabase, context.userId, data.environment)) throw new Error(NAP);
  const s = await import("./studio.server");
  const child = await s.loadChild(context.supabase, context.userId, data.childId);
  if (data.description.trim()) {
    const g = await s.guardChildText(context.supabase, context.userId, child, data.description, "character_details");
    if (g.decision !== "allowed") throw new Error(g.reply ?? "Try a made-up character.");
  }
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const { data: old } = await a.from("studio_creations").select("parent_id,child_id,details").eq("id", data.id).maybeSingle();
  if (old && (old.parent_id !== context.userId || old.child_id !== child.id || !(old.details as any)?.characterDraftV3)) throw new Error("Choose your own character draft.");
  const value = { body: data.description, style_key: data.styleKey, details: { characterDraftV3: true }, updated_at: new Date().toISOString() };
  const result = old ? await a.from("studio_creations").update(value).eq("id", data.id).eq("parent_id", context.userId).eq("child_id", child.id) : await a.from("studio_creations").insert({ ...value, id: data.id, parent_id: context.userId, child_id: child.id, kind: "character", title: "My character idea", images: [] });
  if (result.error) throw new Error("Your character idea couldn’t save. Try again.");
  return { id: data.id };
});

export const getV3CharacterDraft = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => identity.parse(i)).handler(async ({ data, context }) => {
  const { loadChild } = await import("./studio.server");
  await loadChild(context.supabase, context.userId, data.childId);
  const { data: row } = await context.supabase.from("studio_creations").select("body,style_key,details").eq("id", data.id).eq("parent_id", context.userId).eq("child_id", data.childId).eq("kind", "character").is("deleted_at", null).maybeSingle();
  if (!row || !(row.details as any)?.characterDraftV3) throw new Error("That character idea couldn’t open.");
  return { description: row.body ?? "", styleKey: row.style_key ?? "cartoon" };
});

export const readV3Character = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), description: z.string().trim().min(2).max(600), help: z.boolean().default(false) }).parse(i)).handler(async ({ data, context }) => {
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

export const startV3Creation = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => identity.extend({ kind: z.enum(["comic", "story", "picture"]), title: z.string().trim().min(1).max(80), count: v3Count, characterId: z.string().uuid(), genre: z.enum(COMIC_GENRES).optional(), environment }).parse(i)).handler(async ({ data, context }) => {
  if (!await familyHasAccess(context.supabase, context.userId, data.environment)) throw new Error(NAP);
  const s = await import("./studio.server"); const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const g = await s.guardChildText(context.supabase, context.userId, child, data.title, "story_title");
  if (g.decision !== "allowed") throw new Error(g.reply ?? "Try a made-up title.");
  const { data: hero } = await context.supabase.from("studio_creations").select("id,title,style_key,details,updated_at").eq("id", data.characterId).eq("parent_id", context.userId).eq("child_id", child.id).eq("kind", "character").is("deleted_at", null).maybeSingle();
  if (!hero?.style_key || !(hero.details as any)?.dna || !(hero.details as any)?.refs?.length) throw new Error("Choose an approved character first.");
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await a.from("studio_creations").select("parent_id,child_id,kind").eq("id", data.id).maybeSingle();
  if (existing) {
    if (existing.parent_id !== context.userId || existing.child_id !== child.id || existing.kind !== data.kind) throw new Error("Choose your own creation.");
    return (await import("./workspace.server")).loadWorkspace(context.supabase, context.userId, child.id, data.id);
  }
  const details = v3Details(data.kind, data.count, { id: hero.id, title: hero.title, styleKey: hero.style_key }, data.genre);
  details.workspace.castVersions = { [hero.id]: hero.updated_at };
  const { error } = await a.from("studio_creations").insert({ id: data.id, parent_id: context.userId, child_id: child.id, kind: data.kind, title: data.title, body: "", style_key: hero.style_key, details: details as never });
  if (error) throw new Error("Your creation couldn’t start. Your character is safe.");
  return (await import("./workspace.server")).loadWorkspace(context.supabase, context.userId, child.id, data.id);
});

/** Saved child words are never replaced by the optional sparks. */
export const helpV3Scene = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => identity.extend({ text: z.string().max(600), help: z.boolean().default(false) }).parse(i)).handler(async ({ data, context }) => {
  const s = await import("./studio.server"); const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const p = await (await import("./workspace.server")).loadWorkspace(context.supabase, context.userId, child.id, data.id);
  const g = await s.guardChildText(context.supabase, context.userId, child, data.text.trim() || "Help with my adventure", "story");
  if (g.decision !== "allowed") throw new Error(g.reply ?? "Try a made-up scene.");
  const { aiObject } = await import("./studio-ai.server");
  const out = await aiObject(z.object({ question: z.string().max(160), ideas: z.array(z.string().max(60)).max(3) }),
    `Coach a child ages 5–12. ${data.help ? "Offer up to 3 short adventure/scene sparks of 2–5 words, not sentences. End the question with Your call!" : "Return ideas empty. Ask ONE short question only if the description lacks an action or place needed for drawing, accounting for saved previous scenes. Otherwise question empty. Don't ask decorative or unnecessary questions."} NEVER write or rewrite child story words.`, JSON.stringify({ title: p.title, hero: p.details.map?.hero, previous: p.details.pages, text: data.text, age: child.age }));
  if (!out) throw new Error("Bugley couldn’t help just now. Your words are still here.");
  if (!data.help) out.ideas = [];
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  if (g.eventId) {
    const { error } = await a.from("studio_events").update({ reply: [out.question, ...out.ideas].filter(Boolean).join(" · ") || "Your scene has enough detail." }).eq("id", g.eventId).eq("parent_id", context.userId);
    if (error) throw new Error("Bugley’s help couldn’t save. Try again.");
  }
  return out;
});

/** Atomic art replacement: original image remains saved until a checked redraw can be persisted. */
export const paintV3Scene = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => identity.extend({ updatedAt: z.string(), itemId: z.string().uuid().optional(), text: z.string().max(20000).optional(), revision: z.string().trim().max(600).optional(), description: z.string().max(600).optional(), environment, op: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  if (!await familyHasAccess(context.supabase, context.userId, data.environment)) throw new Error(NAP);
  const s = await import("./studio.server"); const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const { loadWorkspace, persistWorkspace } = await import("./workspace.server");
  const p = await loadWorkspace(context.supabase, context.userId, child.id, data.id);
  if (p.updatedAt !== data.updatedAt) throw new Error("Your work changed. Reopen it first.");
  const { assertWorkspaceIdle } = await import("./workspace"); assertWorkspaceIdle(p.details);
  if (p.details.finished) throw new Error("Open your creation to keep working first.");
  const items: any[] = p.kind === "comic" ? p.details.pages.flatMap((page: any) => page.panels) : p.details.pages ?? [];
  const item = items.find(x => x.id === data.itemId);
  if (p.kind !== "picture" && !item) throw new Error("Choose a scene first.");
  const words = data.text ?? (p.kind === "picture" ? p.workspace.originalIdea : p.kind === "comic" ? item.description : item.text);
  if (!words?.trim()) throw new Error("Describe your scene first.");
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
  if (data.revision) {
    const { aiObject } = await import("./studio-ai.server");
    const out = await aiObject(z.object({ description: z.string().max(600) }), "Produce internal illustration instructions only: apply the child's requested change to the existing scene, preserve everything not requested, same characters. Do not author story prose or dialogue.", JSON.stringify({ scene: description, change: data.revision }));
    if (!out) throw new Error("Bugley couldn’t plan that change. Your original picture is safe.");
    description = out.description;
  }
  if (p.kind === "comic") description = `${description}`.slice(0, 480) + " Comic panel composition: leave clear open background space across the top quarter for a speech bubble; keep every face and head in the lower part of the frame.";
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const claimedAt = new Date().toISOString();
  const { data: claim } = await a.from("studio_creations").update({ details: { ...p.details, paintState: "painting", paintOp: data.op }, updated_at: claimedAt }).eq("id", p.id).eq("parent_id", context.userId).eq("child_id", child.id).eq("updated_at", p.updatedAt).select("id").maybeSingle();
  if (!claim) throw new Error("Your scene changed. Reopen it first.");
  p.updatedAt = claimedAt;
  let charged = false;
  try {
    const { generateImage } = await import("./images.server");
    const prior = p.kind === "picture" ? p.images[0] : item.image;
    const result = await generateImage(context.supabase, context.userId, { childId: child.id, description, styleKey: p.styleKey, characterIds: p.details.characterIds ?? p.details.characters ?? [], mode: p.kind === "picture" ? "sketch" : "final", requireReferences: true, lockId: p.id, pictureFlow: p.kind === "picture", editPath: data.revision ? prior : undefined, op: data.op });
    if (!result.ok) throw new Error(result.reply);
    charged = true;
    const { data: lockRow } = await a.from("studio_creations").select("details").eq("id", p.id).eq("parent_id", context.userId).eq("child_id", child.id).maybeSingle();
    const locked = lockRow?.details as any;
    if (locked?.artLock) p.details.artLock = locked.artLock;
    if (locked?.modelLock || result.lock) p.details.modelLock = locked?.modelLock ?? result.lock;
    if (p.kind === "picture") {
      p.workspace.originalIdea = description; p.body = description; p.images = [result.path]; p.details.mode = "sketch"; p.details.upgradeState = "ready";
    } else {
      const target = (p.kind === "comic" ? p.details.pages.flatMap((page: any) => page.panels) : p.details.pages).find((x: any) => x.id === data.itemId);
      if (!target) throw new Error("Your scene couldn’t be found.");
      Object.assign(target, replaceV3Art(target, result, description));
      if (p.kind === "comic") target.dialogueDone = false;
      else target.text = words;
    }
    p.details.paintState = "done"; p.details.paintOp = data.op;
    await persistWorkspace(context.userId, child.id, p);
    return loadWorkspace(context.supabase, context.userId, child.id, p.id);
  } catch (e) {
    if (charged) await (await import("./glow.server")).refundGlow(context.supabase, context.userId, child.id, p.kind === "picture" ? 1 : 3, "Refund: revised scene could not save");
    await a.from("studio_creations").update({ details: { ...(await loadWorkspace(context.supabase, context.userId, child.id, p.id)).details, paintState: "failed" }, updated_at: new Date().toISOString() }).eq("id", p.id).eq("parent_id", context.userId).eq("child_id", child.id).eq("updated_at", claimedAt);
    throw e;
  }
});

