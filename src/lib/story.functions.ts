import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { familyHasAccess } from "./billing.functions";
import { GENRES, storyMapSchema, pageSchema, EMPTY_MAP, newStoryPage, readyToFinish, type StoryData, guidedPages, storyBeats } from "./story";

const identity = z.object({ childId: z.string().uuid(), id: z.string().uuid() });
export const getStory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => identity.parse(i)).handler(async ({ data, context }) => {
  const { loadStory } = await import("./story.server");
  return loadStory(context.supabase, context.userId, data.childId, data.id);
});
export const createStory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), title: z.string().trim().min(1).max(80), genre: z.enum(GENRES), styleKey: z.string().max(40), characterIds: z.array(z.string().uuid()).max(3), guided: z.boolean().optional(), environment: z.enum(["sandbox", "live"]) }).parse(i)).handler(async ({ data, context }) => {
  if (!(await familyHasAccess(context.supabase, context.userId, data.environment))) throw new Error("Ask a grown-up to open the Studio plan first.");
  const s = await import("./studio.server");
  const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const guard = await s.guardChildText(context.supabase, context.userId, child, data.title, "story_title");
  if (guard.decision !== "allowed") throw new Error(guard.reply ?? "Try a made-up title.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: style } = await supabaseAdmin.from("art_styles").select("key").eq("key", data.styleKey).eq("active", true).maybeSingle();
  if (!style) throw new Error("Pick an available art style.");
  if (data.characterIds.length) {
    const { data: cast } = await context.supabase.from("studio_creations").select("id").eq("parent_id", context.userId).eq("child_id", data.childId).eq("kind", "character").is("deleted_at", null).in("id", data.characterIds);
    if ((cast ?? []).length !== new Set(data.characterIds).size) throw new Error("Choose characters from your own My Cast.");
  }
  const details: StoryData = { genre: data.genre, styleKey: data.styleKey, characterIds: [...new Set(data.characterIds)], map: EMPTY_MAP, pages: data.guided ? guidedPages(child.age_band) : [newStoryPage()], finished: false, cover: null, ...(data.guided ? { guidedBand: z.enum(["sprouts", "explorers", "builders"]).parse(child.age_band), followups: [] } : {}) };
  const id = await s.saveCreation(context.userId, { child_id: child.id, kind: "story", title: data.title });
  const { error } = await supabaseAdmin.from("studio_creations").update({ details: details as never, style_key: data.styleKey }).eq("id", id);
  if (error) throw new Error("We couldn’t start that story.");
  const { loadStory } = await import("./story.server");
  return loadStory(context.supabase, context.userId, child.id, id);
});

export const editStory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => identity.extend({ action: z.enum(["map", "page", "add", "illustrate", "cover", "finish", "title", "review"]), environment: z.enum(["sandbox", "live"]), map: storyMapSchema.optional(), page: pageSchema.omit({ image: true }).optional(), pageId: z.string().uuid().optional(), description: z.string().trim().max(600).optional(), title: z.string().trim().min(1).max(80).optional() }).parse(i)).handler(async ({ data, context }) => {
  if (!(await familyHasAccess(context.supabase, context.userId, data.environment))) throw new Error("Ask a grown-up to open the Studio plan first.");
  const s = await import("./studio.server");
  const { loadStory, persistStory } = await import("./story.server");
  const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const story = await loadStory(context.supabase, context.userId, child.id, data.id);
  if (story.data.finished) throw new Error("This story is finished. You can read it in your album.");
  const check = async (text: string) => {
    if (!text.trim()) return;
    const guard = await s.guardChildText(context.supabase, context.userId, child, text, "story");
    if (guard.decision !== "allowed") throw new Error(guard.reply ?? "Let’s try a safe, made-up idea.");
  };
  if (data.action === "map") {
    if (!data.map) throw new Error("Fill in your Story Map first.");
    for (const [key, value] of Object.entries(data.map)) if (value !== story.data.map[key as keyof typeof data.map]) await check(value);
    story.data.map = data.map;
  } else if (data.action === "page") {
    if (!data.page) throw new Error("Pick a page first.");
    const page = story.data.pages.find((p) => p.id === data.page?.id);
    if (!page) throw new Error("We couldn’t find that page.");
    if (data.page.chapter && child.age_band !== "builders") throw new Error("Chapter names are for Builders.");
    for (const key of ["text", "description", "chapter"] as const) if (data.page[key] !== page[key]) await check(data.page[key]);
    Object.assign(page, data.page);
  } else if (data.action === "title") {
    if (!data.title) throw new Error("Choose a title first.");
    await check(data.title); story.title = data.title;
  } else if (data.action === "review") {
    const page = story.data.pages.find((p) => p.id === data.pageId);
    if (!page || !page.text.trim()) throw new Error("Write your words first.");
    if (!(story.data.followups ?? []).includes(page.id)) {
      story.data.followups = [...(story.data.followups ?? []), page.id];
      await persistStory(context.userId, child.id, story);
      const { assistStory } = await import("./story.server");
      const out = await assistStory(context.supabase, context.userId, child, story.id, "Check this saved line once. Ask one gentle question ONLY if it is too vague to illustrate or contradicts earlier pages. Otherwise return empty reply and chips.", "coach", page.id);
      return { ...await loadStory(context.supabase, context.userId, child.id, story.id), followup: out.reply };
    }
  } else if (data.action === "add") {
    if (Object.values(story.data.map).some((v) => !v.trim())) throw new Error("Finish your Story Map first.");
    story.data.pages.push(newStoryPage(story.data.guidedBand ? storyBeats(story.data.guidedBand)[story.data.pages.length]?.step ?? "Ending" : story.data.pages.at(-1)?.step));
  } else if (data.action === "illustrate" || data.action === "cover") {
    const page = story.data.pages.find((p) => p.id === data.pageId);
    if (data.action === "illustrate" && (!page || !page.text.trim())) throw new Error("Write your page first.");
    let description = data.action === "cover" ? data.description : page?.description;
    if (story.data.guidedBand && (!description || description.length < 3)) {
      const { assistStory } = await import("./story.server");
      const out = await assistStory(context.supabase, context.userId, child, story.id, data.action === "cover" ? "Describe a cover showing the hero and the world of this saved story. No letters or title in the image." : "Describe the illustration for this saved page using the story so far.", "picture", page?.id);
      description = out.description;
      if (page && data.action === "illustrate") page.description = description;
    }
    if (!description || description.length < 3) throw new Error("Bugley couldn’t plan that picture yet. Your words are saved; try again.");
    const { generateImage } = await import("./images.server");
    const result = await generateImage(context.supabase, context.userId, { childId: child.id, description, styleKey: story.data.styleKey, characterIds: story.data.characterIds, mode: "final", requireReferences: true, lockId: story.id });
    if (!result.ok) throw new Error(result.reply);
    if (result.lock && !("bookId" in story.data && story.data.bookId)) story.data.modelLock ??= result.lock;
    if (data.action === "cover") story.data.cover = result.path;
    else if (page) page.image = result.path;
  } else if (data.action === "finish") {
    if (!readyToFinish(story.data)) throw new Error("Give every part your words, every page a picture, and your story a cover first.");
    story.data.finished = true;
  }
  await persistStory(context.userId, child.id, story);
  return loadStory(context.supabase, context.userId, child.id, story.id);
});