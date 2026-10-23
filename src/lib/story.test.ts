import { describe, expect, it } from "vitest";
import { EMPTY_MAP, GENRES, newStoryPage, readyToFinish, STORY_STEPS, storySchema, type StoryData } from "./story";

function draft(): StoryData { return { genre: "Adventure", styleKey: "watercolor", characterIds: [], map: { ...EMPTY_MAP }, pages: STORY_STEPS.map((step) => ({ ...newStoryPage(step), text: "The hero took a brave step.", image: "family/child/image.png" })), cover: "family/child/cover.png", finished: false }; }
describe("Story Maker rules", () => {
  it("offers all ten requested genres", () => { expect(GENRES).toEqual(["Superhero", "Adventure", "Mystery", "Fantasy", "Space", "Animal Tales", "Funny", "Spooky-Not-Scary", "Sports", "Friendship"]); });
  it("requires child words in all five parts to finish", () => { const story = draft(); expect(readyToFinish(story)).toBe(true); const page = story.pages[3]; if (!page) throw new Error("Missing fixture page"); page.text = ""; expect(readyToFinish(story)).toBe(false); });
  it("requires an illustration for each page", () => { const story = draft(); const page = story.pages[1]; if (!page) throw new Error("Missing fixture page"); page.image = null; expect(readyToFinish(story)).toBe(false); });
  it("requires a cover illustration", () => { const story = draft(); story.cover = null; expect(readyToFinish(story)).toBe(false); });
  it("supports chapters and large books without a page-count cap", () => { const story = draft(); story.pages = Array.from({ length: 400 }, () => ({ ...newStoryPage("Trying"), chapter: "Chapter 40", text: "My own words." })); expect(storySchema.parse(story).pages).toHaveLength(400); });
  it("saves map and locked style with the story", () => { const story = draft(); story.map = { hero: "Max", want: "Find the moon", place: "Cloud city", problem: "Lost ladder", ending: "Build wings" }; const saved = storySchema.parse(JSON.parse(JSON.stringify(story))); expect(saved.map.hero).toBe("Max"); expect(saved.styleKey).toBe("watercolor"); });
});