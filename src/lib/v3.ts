import { z } from "zod";
import { newComicPage, type ComicPage, type Layout } from "./comic";
import { newStoryPage, STORY_STEPS } from "./story";

export const v3Count = z.number().int().min(1).max(12);
export function v3ComicPages(count: number): ComicPage[] {
  v3Count.parse(count);
  const layouts: Record<number, Layout> = { 1: "one", 2: "two", 3: "three", 4: "four" };
  const pages: ComicPage[] = [];
  for (let left = count; left > 0; left -= 4) pages.push(newComicPage(layouts[Math.min(left, 4)] ?? "four"));
  return pages;
}
export function v3StoryPages(count: number) {
  z.number().int().min(5).max(12).parse(count);
  return Array.from({ length: count }, (_, i) => newStoryPage(STORY_STEPS[Math.floor(i * 5 / count)] ?? "Ending"));
}
/** Temporary internal comic title until the child names it at the end. Built only from the approved character's name. */
export function v3TempTitle(heroTitle: string) {
  const name = heroTitle.trim() || "My";
  return (name === "My" ? "My comic" : `${name}${/s$/i.test(name) ? "’" : "’s"} comic`).slice(0, 80);
}
export function v3Details(kind: "comic" | "story" | "picture", count: number, character: { id: string; title: string; styleKey: string }, genre = "Adventure", titlePending = false) {
  const workspace = { version: 1, v3: true, originalIdea: "", activity: "make", outlineApproved: true, castVersions: {}, ...(titlePending ? { titlePending: true } : {}) };
  if (kind === "picture") return { workspace, genre, characters: [character.id], mode: "draft", pictureFlow: true };
  return { workspace, genre, styleKey: character.styleKey, characterIds: [character.id], map: { hero: character.title, want: "", place: "", problem: "", ending: "" }, pages: kind === "comic" ? v3ComicPages(count) : v3StoryPages(count), finished: false, cover: null, followups: [] };
}
/** Commit a replacement only after the audited image service succeeds. Story words are never changed. */
export function replaceV3Art<T extends { image: string | null; description: string; text?: string }>(item: T, result: { ok: boolean; path?: string }, description: string): T {
  if (!result.ok || !result.path) return item;
  return { ...item, description: description.slice(0, 600), image: result.path };
}/** Cover words: the child's comic name (once they have chosen one) and their first panel. A temporary name is left out. */
export function v3CoverWords(title: string, titlePending: boolean, firstWords: string | null | undefined) {
  return `${titlePending ? "" : `${title}: `}${firstWords ?? ""}`.slice(0, 600);
}

/** A3.2 character-idea saves are versioned by the server: each successful save adds one to `draftVersion`. */
export const draftVersion = z.number().int().min(0).max(1_000_000);
export function savedDraftVersion(details: unknown) {
  const v = (details as { draftVersion?: unknown } | null)?.draftVersion;
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : 0;
}
/**
 * Should this character-idea save be written? The client sends the server version it last saw (`base`). A save based
 * on an older version (a delayed request, or another device saved first) is a conflict and is never written; an idea
 * that already became a character (closed) is never reopened. `expect` is the version the conditional write requires.
 * A missing base comes only from a version published before A3.2's versioning and writes over the current version.
 */
export function draftSaveDecision(old: { details: unknown } | null, base: number | undefined): { action: "insert" | "update" | "conflict" | "closed"; expect: number } {
  if (!old) return { action: "insert", expect: 0 };
  if ((old.details as { closed?: boolean } | null)?.closed) return { action: "closed", expect: 0 };
  const current = savedDraftVersion(old.details);
  if (base !== undefined && base !== current) return { action: "conflict", expect: current };
  return { action: "update", expect: current };
}
/** After a conflict: the newer server words are this device's own (an earlier request that landed late, or the same
 * words), so the device can simply adopt the version; otherwise another device changed the idea and the child chooses. */
export function draftConflictIsOwn(server: { description: string; style: string }, mine: { description: string; style: string }[]) {
  return mine.some((m) => m.description === server.description && m.style === server.style);
}

/**
 * A3.2 "Keep my story going!": a finished-drawing (not yet published) comic can grow by 2 or 4 panels on a new page,
 * up to the usual 12. Existing pages, art, words, frozen characters and cover are untouched; new panels cost the
 * normal Glow only when drawn. Returns why not, or null when allowed.
 */
export function comicExtendProblem(details: { finished?: boolean; workspace?: { v3?: boolean }; pages: { panels: { image: string | null }[] }[] }, more: number) {
  if (!details.workspace?.v3) return "Start the next issue for another adventure.";
  if (details.finished) return "This comic is finished. You can read it in your album.";
  if (more !== 2 && more !== 4) return "Choose 2 or 4 more panels.";
  const panels = details.pages.flatMap((p) => p.panels);
  if (panels.some((p) => !p.image)) return "Finish drawing your panels first.";
  if (panels.length + more > 12) return "Comics can have up to 12 panels.";
  return null;
}
