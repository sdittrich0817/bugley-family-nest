import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { familyHasAccess } from "./billing.functions";
import { GENRES, storyMapSchema } from "./story";
import { ANGLE_PROMPT, comicPageSchema, layerSchema, movePage, newComicPage, readyToFinishComic, EMPTY_MAP, type ComicData, guidedComicPages, dialogueLayers } from "./comic";

const identity = z.object({ childId: z.string().uuid(), id: z.string().uuid() });
const env = z.enum(["sandbox", "live"]);
const NAP = "Ask a grown-up to open the Studio plan first.";

export const getComic = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => identity.parse(i)).handler(async ({ data, context }) => {
  const { loadComic } = await import("./comic.server");
  return loadComic(context.supabase, context.userId, data.childId, data.id);
});

export const createComic = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), title: z.string().trim().min(1).max(80), genre: z.enum(GENRES), styleKey: z.string().max(40), characterIds: z.array(z.string().uuid()).max(3), guided: z.boolean().optional(), environment: env }).parse(i)).handler(async ({ data, context }) => {
  if (!(await familyHasAccess(context.supabase, context.userId, data.environment))) throw new Error(NAP);
  const s = await import("./studio.server");
  const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const guard = await s.guardChildText(context.supabase, context.userId, child, data.title, "comic_title");
  if (guard.decision !== "allowed") throw new Error(guard.reply ?? "Try a made-up title.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: style } = await supabaseAdmin.from("art_styles").select("key").eq("key", data.styleKey).eq("active", true).maybeSingle();
  if (!style) throw new Error("Pick an available art style.");
  if (data.characterIds.length) {
    const { data: cast } = await context.supabase.from("studio_creations").select("id").eq("parent_id", context.userId).eq("child_id", data.childId).eq("kind", "character").is("deleted_at", null).in("id", data.characterIds);
    if ((cast ?? []).length !== new Set(data.characterIds).size) throw new Error("Choose characters from your own My Cast.");
  }
  const details: ComicData = { genre: data.genre, styleKey: data.styleKey, characterIds: [...new Set(data.characterIds)], map: EMPTY_MAP, pages: data.guided ? guidedComicPages(child.age_band) : [newComicPage("one")], finished: false, cover: null, ...(data.guided ? { guidedBand: z.enum(["sprouts", "explorers", "builders"]).parse(child.age_band), followups: [] } : {}) };
  const id = await s.saveCreation(context.userId, { child_id: child.id, kind: "comic", title: data.title });
  const { error } = await supabaseAdmin.from("studio_creations").update({ details: details as never, style_key: data.styleKey }).eq("id", id);
  if (error) throw new Error("We couldn’t start that comic.");
  const { loadComic } = await import("./comic.server");
  return loadComic(context.supabase, context.userId, child.id, id);
});

const browserPage = comicPageSchema.extend({ panels: z.array(z.object({ id: z.string().uuid(), description: z.string().max(600), angle: comicPageSchema.shape.panels.element.shape.angle, layers: z.array(layerSchema).max(12) })).min(1).max(6) });

export const editComic = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => identity.extend({
  action: z.enum(["map", "page", "add", "remove", "move", "sketch", "final", "cover", "finish", "panel", "dialogue", "review", "title", "layers"]), environment: env,
  map: storyMapSchema.optional(), page: browserPage.optional(), pageId: z.string().uuid().optional(), panelId: z.string().uuid().optional(), to: z.number().int().min(0).optional(), description: z.string().max(600).optional(), text: z.string().max(200).optional(), sfx: z.enum(["POW!", "WHOOSH!", "ZAP!", "SPLASH!"]).optional(), title: z.string().trim().min(1).max(80).optional(), layers: z.array(layerSchema).max(12).optional(),
}).parse(i)).handler(async ({ data, context }) => {
  if (!(await familyHasAccess(context.supabase, context.userId, data.environment))) throw new Error(NAP);
  const s = await import("./studio.server");
  const { loadComic, persistComic } = await import("./comic.server");
  const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const comic = await loadComic(context.supabase, context.userId, child.id, data.id);
  if (comic.data.finished && !["dialogue", "layers"].includes(data.action)) throw new Error("This comic is finished. You can read it in your album.");
  const check = async (text: string) => {
    if (!text.trim()) return;
    const guard = await s.guardChildText(context.supabase, context.userId, child, text, "comic");
    if (guard.decision !== "allowed") throw new Error(guard.reply ?? "Let’s try a safe, made-up idea.");
  };
  const pageIndex = comic.data.pages.findIndex((p) => p.id === data.pageId);
  const panel = comic.data.pages[pageIndex]?.panels.find((p) => p.id === data.panelId);
  if (["panel", "dialogue", "review", "layers"].includes(data.action) && !panel) throw new Error("Choose a panel first.");
  if (data.action === "title") {
    if (!data.title) throw new Error("Choose your title first.");
    await check(data.title); comic.title = data.title;
  } else if (data.action === "panel" && panel) {
    if (!data.description?.trim()) throw new Error("Tell Bugley what happens.");
    await check(data.description);
    if (panel.description !== data.description) { panel.image = null; panel.sketch = null; }
    panel.description = data.description;
  } else if (data.action === "dialogue" && panel) {
    await check(data.text ?? "");
    if (data.sfx) await check(data.sfx);
    panel.layers = dialogueLayers(panel, data.text ?? "", data.sfx); panel.dialogueDone = true;
  } else if (data.action === "layers" && panel) {
    if (!data.layers) throw new Error("No words to move.");
    for (const layer of data.layers) if (!panel.layers.some((l) => l.id === layer.id && l.text === layer.text)) await check(layer.text);
    panel.layers = data.layers;
  } else if (data.action === "review" && panel) {
    if (!(comic.data.followups ?? []).includes(panel.id)) {
      comic.data.followups = [...(comic.data.followups ?? []), panel.id];
      await persistComic(context.userId, child.id, comic);
      const { assistComic } = await import("./comic.server");
      const out = await assistComic(context.supabase, context.userId, child, comic.id, "Check the saved scene once. Return empty reply unless it is too vague to illustrate or contradicts earlier panels. Ask at most one gentle follow-up; the child decides.", data.pageId, "review", panel.id);
      return { ...await loadComic(context.supabase, context.userId, child.id, comic.id), followup: out.reply };
    }
  } else if (data.action === "map") {
    if (!data.map) throw new Error("Fill in your Story Map first.");
    for (const [k, v] of Object.entries(data.map)) if (v !== comic.data.map[k as keyof typeof data.map]) await check(v);
    comic.data.map = data.map;
  } else if (data.action === "page") {
    const incoming = data.page;
    const i = comic.data.pages.findIndex((p) => p.id === incoming?.id);
    if (!incoming || i < 0) throw new Error("We couldn’t find that page.");
    const old = comic.data.pages[i];
    if (!old) throw new Error("We couldn’t find that page.");
    if (comic.data.guidedBand && (incoming.layout !== old.layout || incoming.panels.length !== old.panels.length || incoming.panels.some((p, n) => p.id !== old.panels[n]?.id))) throw new Error("Bugley keeps the panels in story order.");
    const oldPanels = new Map(old.panels.map((p) => [p.id, p]));
    const oldTexts = new Set(old.panels.flatMap((p) => [p.description, ...p.layers.map((l) => l.text)]));
    for (const panel of incoming.panels) for (const t of [panel.description, ...panel.layers.map((l) => l.text)]) if (!oldTexts.has(t)) await check(t);
    comic.data.pages[i] = { id: old.id, layout: incoming.layout, panels: incoming.panels.map((p) => { const prev = oldPanels.get(p.id); const same = prev && prev.description === p.description && prev.angle === p.angle; return { ...p, sketch: same ? prev.sketch : prev?.sketch ?? null, image: same ? prev.image : null }; }) };
  } else if (data.action === "add") {
    if (Object.values(comic.data.map).some((v) => !v.trim())) throw new Error("Finish your Story Map first.");
    if (comic.data.guidedBand) throw new Error("Start the next issue for another adventure.");
    comic.data.pages.push(newComicPage("four"));
  } else if (data.action === "remove") {
    if (comic.data.guidedBand) throw new Error("Bugley keeps your story panels together.");
    if (pageIndex < 0) throw new Error("We couldn’t find that page.");
    if (comic.data.pages.length === 1) throw new Error("A comic needs at least one page.");
    comic.data.pages.splice(pageIndex, 1);
  } else if (data.action === "move") {
    if (comic.data.guidedBand) throw new Error("Bugley keeps your panels in story order.");
    if (pageIndex < 0 || data.to === undefined) throw new Error("We couldn’t move that page.");
    comic.data.pages = movePage(comic.data.pages, pageIndex, data.to);
  } else if (data.action === "sketch" || data.action === "final" || data.action === "cover") {
    const panel = comic.data.pages[pageIndex]?.panels.find((p) => p.id === data.panelId);
    if (data.action !== "cover" && !panel) throw new Error("Pick a panel first.");
    if (data.action === "final" && !panel?.sketch && !comic.data.guidedBand) throw new Error("Sketch it first, then make it final.");
    let description = data.action === "cover" ? data.description : panel ? `${ANGLE_PROMPT[panel.angle]}${panel.description}` : "";
    if (comic.data.guidedBand) {
      const { planComicPicture } = await import("./comic.server");
      const planned = await planComicPicture(context.supabase, context.userId, child.id, comic, data.panelId, data.action === "cover");
      description = planned.description;
      if (panel) panel.angle = planned.angle;
    }
    if (!description || description.length < 3) throw new Error("Describe what happens first.");
    const { generateImage } = await import("./images.server");
    const r = await generateImage(context.supabase, context.userId, { childId: child.id, description, styleKey: comic.data.styleKey, characterIds: comic.data.characterIds, mode: data.action === "sketch" ? "sketch" : "final", requireReferences: true, lockId: comic.id });
    if (!r.ok) throw new Error(r.reply);
    if (r.lock && !("bookId" in comic.data && comic.data.bookId)) comic.data.modelLock ??= r.lock;
    if (data.action === "cover") comic.data.cover = r.path;
    else if (panel && data.action === "sketch") { panel.sketch = r.path; panel.image = null; }
    else if (panel) {
      panel.image = r.path;
      if (comic.data.guidedBand) {
        const { placeComicBubble } = await import("./comic.server");
        const page = comic.data.pages[pageIndex];
        if (page) panel.bubblePlacement = await placeComicBubble(r.path, comic.data.map.hero, page, page.panels.findIndex((p) => p.id === panel.id));
      }
    }
  } else if (data.action === "finish") {
    if (!readyToFinishComic(comic.data)) throw new Error("Make every panel final and draw a cover first.");
    comic.data.finished = true;
  }
  await persistComic(context.userId, child.id, comic);
  return loadComic(context.supabase, context.userId, child.id, comic.id);
});
