import { z } from "zod";

export const STORY_LAYOUTS = ["picture-top", "picture-side", "small-picture"] as const;
export const storyLayoutSchema = z.enum(STORY_LAYOUTS);
export type StoryLayout = z.infer<typeof storyLayoutSchema>;
export function suggestStoryLayout(text: string): StoryLayout {
  const count = text.trim().split(/\s+/).filter(Boolean).length;
  return count > 120 ? "small-picture" : count > 45 ? "picture-side" : "picture-top";
}
export function formatStoryPage<T extends { text: string; image: string | null }>(page: T, layout: StoryLayout, chapter: string) {
  return { ...page, layout: storyLayoutSchema.parse(layout), chapter };
}
export function storyCoachContext(details: { map?: unknown; pages: { id: string; text?: string; step?: string; chapter?: string }[] }, itemId: string, text: string) {
  const index = details.pages.findIndex(p => p.id === itemId);
  if (index < 0) throw new Error("Choose a story page first.");
  return { map: details.map, page: index + 1, totalPages: details.pages.length, step: details.pages[index]?.step,
    previous: details.pages.slice(0, index).filter(p => p.text?.trim()).map(p => ({ text: p.text?.slice(0, 3000), chapter: p.chapter })), text };
}