// Pure helpers for V3 comic panel prompts: the child's exact words are kept whole, and lower-priority
// context (story so far, AI illustration notes) is trimmed first. No AI-invented facts enter continuity.
export const CHILD_SCENE_LIMIT = 600;
export const CHILD_CHANGE_LIMIT = 600;
const NOTES_LIMIT = 400;
const CONTINUITY_LIMIT = 700;
const MEMORY_LIMIT = 600;
export const COMIC_FRAMING = "One single seamless full-bleed illustration filling the whole frame: no panel borders, frames, gutters, strips, split panels or empty boxes. Let natural open scenery such as sky, wall or ceiling sit above the characters, with faces in the lower two-thirds.";
export const KEEP_UNCHANGED = "Change ONLY what the child's requested change asks for. Keep the layout, background, colors, objects, poses, character placement and camera angle of the existing scene the same.";

export type PanelLike = { id: string; description?: string | null; image?: string | null };

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, Math.max(0, n - 1)).trimEnd()}…`);

/** Earlier drawn panels, in order, using only the child's saved descriptions. Most recent are kept in full. */
export function buildContinuity(panels: PanelLike[], currentId: string, budget = CONTINUITY_LIMIT): string {
  const at = panels.findIndex(p => p.id === currentId);
  const earlier = (at < 0 ? panels : panels.slice(0, at)).filter(p => p.image && p.description?.trim()).map(p => p.description!.trim().replace(/\s+/g, " "));
  if (!earlier.length) return "";
  const lines = earlier.map((d, i) => ({ n: i + 1, d: earlier.length - i <= 3 ? clip(d, 220) : clip(d, 80) }));
  const head = "Earlier in this story (the child's own words, for continuity of places, objects and events):";
  const tail = "If the current panel differs from earlier panels, the current panel wins.";
  // Drop the oldest lines first until it fits.
  while (lines.length) {
    const text = `${head} ${lines.map(l => `Panel ${l.n}: ${l.d}`).join(" ")} ${tail}`;
    if (text.length <= budget) return text;
    lines.shift();
  }
  return "";
}

export class ChildTextTooLong extends Error {}

/** Labelled panel description passed to the image pipeline (which then adds DNA, style recipe and safety suffix). */
export function buildPanelPrompt(input: { scene: string; change?: string | undefined; notes?: string | undefined; genre?: string | undefined; continuity?: string | undefined; memory?: string | undefined }): string {
  const scene = input.scene.trim(), change = input.change?.trim();
  if (!scene) throw new ChildTextTooLong("Describe your scene first.");
  if (scene.length > CHILD_SCENE_LIMIT) throw new ChildTextTooLong(`Your scene is a little long for one picture. Can you make it shorter than ${CHILD_SCENE_LIMIT} letters?`);
  if (change && change.length > CHILD_CHANGE_LIMIT) throw new ChildTextTooLong(`Your change is a little long. Can you make it shorter than ${CHILD_CHANGE_LIMIT} letters?`);
  const parts = [`Current panel (the child's exact words; follow them): ${scene}`];
  if (change) parts.push(`Requested change (the child's exact words): ${change}. ${KEEP_UNCHANGED}`);
  if (input.notes?.trim()) parts.push(`Illustration notes (must not contradict the child's words): ${clip(input.notes.trim(), NOTES_LIMIT)}`);
  if (input.genre?.trim()) parts.push(`${input.genre.trim()} mood, colors and lighting.`);
  if (input.memory?.trim()) parts.push(clip(input.memory.trim(), MEMORY_LIMIT));
  if (input.continuity?.trim()) parts.push(clip(input.continuity.trim(), CONTINUITY_LIMIT));
  parts.push(COMIC_FRAMING);
  return parts.join(" ");
}

/** Current (pre-A1) assembly, kept for the before/after evaluation only. */
export function legacyPanelPrompt(input: { scene: string; plannedRevision?: string; genre?: string }) {
  let d = input.plannedRevision ?? input.scene.slice(0, 600);
  if (input.genre) d = `${input.genre} mood, colors and lighting. ${d}`.slice(0, 600);
  return d.slice(0, 480) + " " + COMIC_FRAMING;
}

/** Paint claims older than this are treated as interrupted. Observed draws take ~1–2 min per attempt, with one 25-minute provider outlier; an early reset is still safe (the late op cannot save and refunds at most once). */
export const STALE_PAINT_MS = 30 * 60 * 1000;
export function isStalePaint(details: { paintState?: string; paintStartedAt?: string } | null | undefined, updatedAt: string, now = Date.now()) {
  if (details?.paintState !== "painting") return false;
  const started = Date.parse(details.paintStartedAt ?? updatedAt);
  return Number.isFinite(started) && now - started > STALE_PAINT_MS;
}

/** A refund for an op is owed only if it was charged, not already refunded, and its art was not saved. */
export function refundOwed(s: { charged: boolean; refunded: boolean; saved: boolean }) {
  return s.charged && !s.refunded && !s.saved;
}

export type CastSnapshot = { id: string; title: string; dna: string; styleKey: string; refs: string[]; version: string };
/** Use the comic's frozen character copies when every requested character has a valid family-owned snapshot. */
export function pickCastSnapshot(snapshots: CastSnapshot[] | undefined, ids: string[], prefix: string, styleKey: string): CastSnapshot[] | null {
  if (!snapshots?.length || !ids.length) return null;
  const picked = ids.map(id => snapshots.find(s => s.id === id));
  if (picked.some(s => !s || s.styleKey !== styleKey || !s.dna || !s.refs.length || s.refs.some(r => !r.startsWith(prefix) || r.includes("..")))) return null;
  return picked as CastSnapshot[];
}

/** Restored comic/story snapshots never come back busy. */
export function restoredPaintState(state: unknown) { return state === "painting" || state === "failed" ? "ready" : (typeof state === "string" ? state : "ready"); }
