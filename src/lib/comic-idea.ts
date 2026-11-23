// A3.4.1 idea-first comics (Explorers and Builders only). Pure rules shared by the server steps and the screens.
// The child's idea is saved exactly as typed in the comic's existing `workspace.originalIdea` field. It is shown back
// and offered ("Use my idea words"), but it is never sent to Story Memory, panel or cover drawing instructions.
import { COMIC_GENRES } from "./comic";
import { comicHasDrawings } from "./comic-continuity";
import { v3ComicPages } from "./v3";

export const IDEA_MIN = 3;
export const IDEA_MAX = 600;
export const IDEA_CAST_MAX = 3;
/** Temporary comic name until the child names it at the end (never built from the idea words). */
export const IDEA_TEMP_TITLE = "My comic idea";

export const IDEA_SPROUTS = "Your comic starts with a character. Pick your star!";
export const IDEA_CAST_PENDING = "Choose who’s in your comic first. Your glow is safe.";
export const IDEA_STARTED = "Your comic has started. Add more characters with + Character.";
export const IDEA_NOT_OWN = "Choose your own comic idea.";
export const IDEA_LOOKS = "Your characters need to be in the same drawing style.";
export const IDEA_APPROVED = "Choose your own finished characters.";

export type IdeaStage = "idea" | "cast";

/** Idea-first is offered and accepted only for Explorers (7–9) and Builders (10–12). Sprouts stay character-first. */
export function ideaFirstAllowed(ageBand: string | null | undefined) {
  return ageBand === "explorers" || ageBand === "builders";
}

/** Has the child written enough to save? Only a length check, no AI. Exact words are kept; only the check trims. */
export function ideaLongEnough(idea: string) {
  return idea.trim().length >= IDEA_MIN;
}

/** Where an idea-first comic is: still writing the idea, choosing its characters/plan, or (null) a normal comic. */
export function ideaStageOf(details: unknown): IdeaStage | null {
  const s = (details as { workspace?: { ideaStage?: unknown } } | null)?.workspace?.ideaStage;
  return s === "idea" || s === "cast" ? s : null;
}
export function isIdeaComic(details: unknown) {
  return (details as { workspace?: { ideaStart?: unknown } } | null)?.workspace?.ideaStart === true;
}
export function savedIdeaVersion(details: unknown) {
  const v = (details as { workspace?: { ideaVersion?: unknown } } | null)?.workspace?.ideaVersion;
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : 0;
}

/** A new idea-first comic: no characters yet (none may be drawn until the cast is confirmed), the child's exact idea,
 * the usual age-band plan, and a temporary name. */
export function ideaComicDetails(idea: string, count: number, genre: (typeof COMIC_GENRES)[number] = "Adventure", stage: IdeaStage = "idea") {
  return {
    workspace: { version: 1, v3: true, originalIdea: idea, activity: "make", outlineApproved: true, castVersions: {}, titlePending: true, ideaStart: true, ideaStage: stage, ideaVersion: 1 },
    genre, styleKey: "", characterIds: [] as string[],
    map: { hero: "", want: "", place: "", problem: "", ending: "" },
    pages: v3ComicPages(count), finished: false, cover: null, followups: [] as string[],
  };
}

/**
 * Should an idea save be written? Mirrors the A3.2 character-idea rule: the client sends the server version it last
 * saw (`base`); a save based on an older version is a conflict and is never written. After "That's my idea!" the idea
 * is closed to quiet saves (the comic moves on to choosing characters).
 */
export function ideaSaveDecision(old: { details: unknown } | null, base: number | undefined): { action: "insert" | "update" | "conflict" | "closed"; expect: number } {
  if (!old) return { action: "insert", expect: 0 };
  if (ideaStageOf(old.details) !== "idea") return { action: "closed", expect: 0 };
  const current = savedIdeaVersion(old.details);
  if (base !== undefined && base !== current) return { action: "conflict", expect: current };
  return { action: "update", expect: current };
}

type CastRow = { id: string; style_key: string | null; details: unknown };
/**
 * Choosing the cast and plan of an idea-first comic, before panel 1. Returns the child-facing refusal or null.
 * Only while choosing characters, never once anything is drawn or frozen; up to three approved, family-owned characters
 * (the rows were read with the family's own access) that all share one drawing style.
 */
export function ideaCastProblem(details: unknown, ids: string[], rows: CastRow[], confirm: boolean): string | null {
  if (!isIdeaComic(details) || ideaStageOf(details) !== "cast") return IDEA_STARTED;
  const d = details as { castSnapshot?: unknown[]; cover?: unknown; pages?: { panels?: { image?: unknown; sketch?: unknown }[] }[] };
  if (comicHasDrawings(d) || (Array.isArray(d.castSnapshot) && d.castSnapshot.length)) return IDEA_STARTED;
  const unique = [...new Set(ids)];
  if (unique.length !== ids.length) return IDEA_APPROVED;
  if (unique.length > IDEA_CAST_MAX) return "Comics can have up to 3 characters.";
  if (confirm && !unique.length) return IDEA_CAST_PENDING;
  if (rows.length !== unique.length || unique.some((id) => !rows.find((r) => r.id === id))) return IDEA_APPROVED;
  if (rows.some((r) => { const x = r.details as { dna?: unknown; refs?: unknown[]; characterDraftV3?: unknown } | null; return !r.style_key || !x?.dna || !Array.isArray(x.refs) || !x.refs.length || !!x.characterDraftV3; })) return IDEA_APPROVED;
  if (new Set(rows.map((r) => r.style_key)).size > 1) return IDEA_LOOKS;
  return null;
}

/** The look an idea-first comic takes: its first character's drawing style (no characters yet: none). */
export function ideaLook(ids: string[], rows: CastRow[]) {
  return rows.find((r) => r.id === ids[0])?.style_key ?? null;
}

/** Comic drawing waits until an idea-first comic's characters are confirmed (checked before any claim or charge). */
export function ideaDrawProblem(details: unknown) {
  return ideaStageOf(details) ? IDEA_CAST_PENDING : null;
}

/** Ready-made idea sparks (no AI). Tapping one adds it to the end of the child's own words; the child finishes it. */
export const IDEA_SPARKS = ["is scared to try something new", "finds a secret door", "has to save a friend", "loses something important", "wins a strange contest", "meets someone from space"] as const;
export function ideaSparks(seed: string, n = 3) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const start = h % IDEA_SPARKS.length;
  return Array.from({ length: Math.min(n, IDEA_SPARKS.length) }, (_, i) => IDEA_SPARKS[(start + i) % IDEA_SPARKS.length]!);
}

/** "Use my idea words" (only when tapped): the idea goes into an empty panel box, or after words already there. */
export function addIdeaWords(current: string, idea: string, max = 600) {
  const words = idea.trim();
  if (!words) return current;
  if (!current.trim()) return words.slice(0, max);
  if (current.includes(words)) return current;
  return `${current.trimEnd()} ${words}`.slice(0, max);
}
