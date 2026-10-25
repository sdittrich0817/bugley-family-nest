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
export function v3Details(kind: "comic" | "story" | "picture", count: number, character: { id: string; title: string; styleKey: string }) {
  const workspace = { version: 1, v3: true, originalIdea: "", activity: "make", outlineApproved: true, castVersions: {} };
  if (kind === "picture") return { workspace, characters: [character.id], mode: "draft", pictureFlow: true };
  return { workspace, genre: "Adventure", styleKey: character.styleKey, characterIds: [character.id], map: { hero: character.title, want: "", place: "", problem: "", ending: "" }, pages: kind === "comic" ? v3ComicPages(count) : v3StoryPages(count), finished: false, cover: null, followups: [] };
}
/** Commit a replacement only after the audited image service succeeds. Story words are never changed. */
export function replaceV3Art<T extends { image: string | null; description: string; text?: string }>(item: T, result: { ok: boolean; path?: string }, description: string): T {
  if (!result.ok || !result.path) return item;
  return { ...item, description, image: result.path };
}