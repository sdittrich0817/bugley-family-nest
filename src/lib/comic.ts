import { z } from "zod";
import { GENRES, LENGTHS, storyMapSchema, EMPTY_MAP, storyBeats, type StoryBeat } from "./story";

export const LAYOUTS = { one: 1, two: 2, three: 3, four: 4, six: 6 } as const;
export type Layout = keyof typeof LAYOUTS;
export const LAYOUT_LABEL: Record<Layout, string> = { one: "1 big panel", two: "2 panels", three: "3 panels", four: "4 panels", six: "6 panels" };
export const LAYER_TYPES = ["speech", "thought", "caption", "sfx"] as const;
export const ANGLES = ["", "close", "middle", "far", "above", "below"] as const;
export const ANGLE_LABEL: Record<(typeof ANGLES)[number], string> = { "": "Bugley picks", close: "Close up", middle: "Middle", far: "Far away", above: "From above", below: "From below" };
export const ANGLE_PROMPT: Record<(typeof ANGLES)[number], string> = { "": "", close: "Close-up shot on the face. ", middle: "Medium shot. ", far: "Wide establishing shot showing the whole scene. ", above: "Bird's-eye view from above. ", below: "Low angle looking up. " };

const pct = z.number().min(0).max(100);
export const layerSchema = z.object({ id: z.string().uuid(), type: z.enum(LAYER_TYPES), text: z.string().max(200), x: pct, y: pct, w: z.number().min(8).max(100), h: z.number().min(6).max(100), tx: pct, ty: pct });
export const panelSchema = z.object({ id: z.string().uuid(), description: z.string().max(600), angle: z.enum(ANGLES), sketch: z.string().nullable(), image: z.string().nullable(), layers: z.array(layerSchema).max(12), dialogueDone: z.boolean().optional(), bubblePlacement: z.object({ x: pct, y: pct, w: pct, h: pct, tx: pct, ty: pct }).optional() });
export const comicPageSchema = z.object({ id: z.string().uuid(), layout: z.enum(Object.keys(LAYOUTS) as [Layout, ...Layout[]]), panels: z.array(panelSchema).min(1).max(6), widePanelId: z.string().uuid().optional() });
export const comicSchema = z.object({ genre: z.enum(GENRES), styleKey: z.string(), characterIds: z.array(z.string().uuid()), modelLock: z.any().optional(), map: storyMapSchema, pages: z.array(comicPageSchema).min(1), finished: z.boolean(), cover: z.string().nullable(), bookId: z.string().uuid().optional(), guidedBand: z.enum(["sprouts", "explorers", "builders"]).optional(), length: z.enum(LENGTHS).optional(), followups: z.array(z.string()).optional() });
export type ComicData = z.infer<typeof comicSchema>;
export type ComicPage = z.infer<typeof comicPageSchema>;
export type Panel = z.infer<typeof panelSchema>;
export type Layer = z.infer<typeof layerSchema>;
export type Comic = { id: string; title: string; updatedAt: string; data: ComicData; urls: Record<string, string> };
export { EMPTY_MAP };

export const newPanel = (): Panel => ({ id: crypto.randomUUID(), description: "", angle: "", sketch: null, image: null, layers: [] });
export const newComicPage = (layout: Layout = "four"): ComicPage => ({ id: crypto.randomUUID(), layout, panels: Array.from({ length: LAYOUTS[layout] }, newPanel) });
export function newLayer(type: Layer["type"]): Layer {
  const base = { id: crypto.randomUUID(), type, text: "" };
  if (type === "caption") return { ...base, x: 3, y: 3, w: 50, h: 14, tx: 0, ty: 0 };
  if (type === "sfx") return { ...base, x: 30, y: 40, w: 40, h: 18, tx: 0, ty: 0 };
  return { ...base, x: 50, y: 6, w: 42, h: 22, tx: 60, ty: 50 };
}
/** Changing layout keeps existing panels in order, adding blanks or trimming from the end. */
export function setLayout(page: ComicPage, layout: Layout): ComicPage {
  const n = LAYOUTS[layout];
  return { ...page, layout, panels: [...page.panels.slice(0, n), ...Array.from({ length: Math.max(0, n - page.panels.length) }, newPanel)] };
}
export const trimmedPanelsHaveWork = (page: ComicPage, layout: Layout) => page.panels.slice(LAYOUTS[layout]).some((p) => p.description.trim() || p.sketch || p.image || p.layers.length);
export function movePage<T>(pages: T[], from: number, to: number) {
  if (to < 0 || to >= pages.length) return pages;
  const next = [...pages]; const [p] = next.splice(from, 1); if (p === undefined) return pages; next.splice(to, 0, p); return next;
}
export function readyToFinishComic(c: ComicData) {
  return Object.values(c.map).every((v) => v.trim()) && (!!c.cover || !!c.bookId) && c.pages.every((p) => p.panels.every((panel) => !!panel.image && (!c.guidedBand || panel.dialogueDone)));
}
export function comicCoachingInstructions() {
  return `Comic coaching: guide a strong opening, a problem, action, a big moment and a payoff or punchline. Hide the beat names. Layouts and camera angles are chosen behind the scenes, never ask the child to choose a layout or angle. Close-ups for feelings, wide shots for action. Ask one gentle clarity or continuity question once; the child decides. Never write their scene or dialogue. Offer 3 sparks of 2–5 words, not complete sentences. After painting ask what the hero says; skipping is fine. Preset sound effects are allowed. You are an AI helper, not a person; never ask for personal details.`;
}

export const COMIC_GENRES = ["Superhero", "Adventure", "Mystery", "Space", "Funny", "Spooky-Not-Scary", "Animal Heroes", "Fantasy"] as const;
export function comicBeats(band: string): StoryBeat[] {
  if (band !== "sprouts") return storyBeats(band);
  return [storyBeats("sprouts")[0], storyBeats("sprouts")[1], storyBeats("sprouts")[3], storyBeats("sprouts")[4]].filter((b): b is StoryBeat => !!b);
}
export function comicQuestion(band: string, index: number, map: ComicData["map"]) { return (comicBeats(band)[index]?.cue ?? "What happens next?").replaceAll("{hero}", map.hero || "your hero").replaceAll("{problem}", map.problem || "Something goes wrong"); }
export function guidedComicPages(band: string): ComicPage[] {
  const beats = comicBeats(band); const pages: ComicPage[] = [];
  for (let i = 0; i < beats.length; i += 4) {
    const page = newComicPage("four");
    const big = beats.slice(i, i + 4).findIndex((b) => b.step === "Big Moment");
    if (big >= 0) page.widePanelId = page.panels[big]?.id;
    pages.push(page);
  }
  return pages;
}
/** Normalized cells shared by the screen, placement vision and printable PDF. */
export function comicCells(page: ComicPage) {
  const wide = page.panels.findIndex((p) => p.id === page.widePanelId);
  if (wide >= 0) {
    let row = 0, col = 0;
    const cells = page.panels.map((_, i) => {
      if (i === wide) { if (col) { row++; col = 0; } const cell = { x: 0, y: row, w: 2, h: 1 }; row++; return cell; }
      const cell = { x: col, y: row, w: 1, h: 1 }; col++; if (col === 2) { row++; col = 0; } return cell;
    });
    const rows = row + (col ? 1 : 0);
    return cells.map((c) => ({ x: c.x / 2, y: c.y / rows, w: c.w / 2, h: 1 / rows }));
  }
  if (page.layout === "three") return [{ x: 0, y: 0, w: 1, h: .5 }, { x: 0, y: .5, w: .5, h: .5 }, { x: .5, y: .5, w: .5, h: .5 }];
  const cols = page.layout === "one" || page.layout === "two" ? 1 : 2;
  const rows = Math.ceil(page.panels.length / cols);
  return page.panels.map((_, i) => ({ x: (i % cols) / cols, y: Math.floor(i / cols) / rows, w: 1 / cols, h: 1 / rows }));
}
export function comicPanelAspect(page: ComicPage, index: number) { const cell = comicCells(page)[index]; return cell ? .75 * cell.w / cell.h : 1; }
export function dialogueLayers(panel: Panel, text: string, sfx?: string): Layer[] {
  const keep = panel.layers.filter((l) => l.type !== "speech" && l.type !== "sfx");
  if (text.trim()) keep.push({ ...newLayer("speech"), ...(panel.bubblePlacement ?? {}), text });
  const sound = sfx ?? panel.layers.find((l) => l.type === "sfx")?.text;
  if (sound) keep.push({ ...newLayer("sfx"), x: 5, y: 76, w: 65, h: 20, text: sound });
  return keep;
}
