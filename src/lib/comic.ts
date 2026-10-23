import { z } from "zod";
import { GENRES, storyMapSchema, EMPTY_MAP } from "./story";

export const LAYOUTS = { one: 1, two: 2, three: 3, four: 4, six: 6 } as const;
export type Layout = keyof typeof LAYOUTS;
export const LAYOUT_LABEL: Record<Layout, string> = { one: "1 big panel", two: "2 panels", three: "3 panels", four: "4 panels", six: "6 panels" };
export const LAYER_TYPES = ["speech", "thought", "caption", "sfx"] as const;
export const ANGLES = ["", "close", "middle", "far", "above", "below"] as const;
export const ANGLE_LABEL: Record<(typeof ANGLES)[number], string> = { "": "Bugley picks", close: "Close up", middle: "Middle", far: "Far away", above: "From above", below: "From below" };
export const ANGLE_PROMPT: Record<(typeof ANGLES)[number], string> = { "": "", close: "Close-up shot on the face. ", middle: "Medium shot. ", far: "Wide establishing shot showing the whole scene. ", above: "Bird's-eye view from above. ", below: "Low angle looking up. " };

const pct = z.number().min(0).max(100);
export const layerSchema = z.object({ id: z.string().uuid(), type: z.enum(LAYER_TYPES), text: z.string().max(200), x: pct, y: pct, w: z.number().min(8).max(100), h: z.number().min(6).max(100), tx: pct, ty: pct });
export const panelSchema = z.object({ id: z.string().uuid(), description: z.string().max(600), angle: z.enum(ANGLES), sketch: z.string().nullable(), image: z.string().nullable(), layers: z.array(layerSchema).max(12) });
export const comicPageSchema = z.object({ id: z.string().uuid(), layout: z.enum(Object.keys(LAYOUTS) as [Layout, ...Layout[]]), panels: z.array(panelSchema).min(1).max(6) });
export const comicSchema = z.object({ genre: z.enum(GENRES), styleKey: z.string(), characterIds: z.array(z.string().uuid()), map: storyMapSchema, pages: z.array(comicPageSchema).min(1), finished: z.boolean(), cover: z.string().nullable(), bookId: z.string().uuid().optional() });
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
  const next = [...pages]; const [p] = next.splice(from, 1); next.splice(to, 0, p!); return next;
}
export function readyToFinishComic(c: ComicData) {
  return Object.values(c.map).every((v) => v.trim()) && (!!c.cover || !!c.bookId) && c.pages.every((p) => p.panels.every((panel) => !!panel.image));
}
export function comicCoachingInstructions() {
  return `Comic coaching: coach comic beats — a strong opening panel, the problem, the action, and a payoff or punchline on the last panel. Nudge for clarity ("Can readers tell who's talking here?") and pacing ("This is a big moment. Want a full-page panel?"). Ask about camera angle in kid language ("Close up on her face, or far away so we see the whole city?"). Never write dialogue, captions or sound effects for the child; offer only short idea sparks.`;
}
