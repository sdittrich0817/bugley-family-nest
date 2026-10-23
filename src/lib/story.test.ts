import { describe, expect, it } from "vitest";
import { EMPTY_MAP, GENRES, newStoryPage, readyToFinish, STORY_STEPS, storySchema, guidedPages, storyBeats, cleanSparks, type StoryData } from "./story";

function draft(): StoryData { return { genre: "Adventure", styleKey: "watercolor", characterIds: [], map: { ...EMPTY_MAP }, pages: STORY_STEPS.map((step) => ({ ...newStoryPage(step), text: "The hero took a brave step.", image: "family/child/image.png" })), cover: "family/child/cover.png", finished: false }; }
describe("Story Maker rules", () => {
  it("offers all ten requested genres", () => { expect(GENRES).toEqual(["Superhero", "Adventure", "Mystery", "Fantasy", "Space", "Animal Tales", "Funny", "Spooky-Not-Scary", "Sports", "Friendship"]); });
  it("requires child words in all five parts to finish", () => { const story = draft(); expect(readyToFinish(story)).toBe(true); const page = story.pages[3]; if (!page) throw new Error("Missing fixture page"); page.text = ""; expect(readyToFinish(story)).toBe(false); });
  it("requires an illustration for each page", () => { const story = draft(); const page = story.pages[1]; if (!page) throw new Error("Missing fixture page"); page.image = null; expect(readyToFinish(story)).toBe(false); });
  it("requires a cover illustration", () => { const story = draft(); story.cover = null; expect(readyToFinish(story)).toBe(false); });
  it("supports chapters and large books without a page-count cap", () => { const story = draft(); story.pages = Array.from({ length: 400 }, () => ({ ...newStoryPage("Trying"), chapter: "Chapter 40", text: "My own words." })); expect(storySchema.parse(story).pages).toHaveLength(400); });
  it("saves map and locked style with the story", () => { const story = draft(); story.map = { hero: "Max", want: "Find the moon", place: "Cloud city", problem: "Lost ladder", ending: "Build wings" }; const saved = storySchema.parse(JSON.parse(JSON.stringify(story))); expect(saved.map.hero).toBe("Max"); expect(saved.styleKey).toBe("watercolor"); });
  it("gives Sprouts exactly 5 guided pages", () => { expect(guidedPages("sprouts")).toHaveLength(5); expect(guidedPages("sprouts").map((p) => p.step)).toEqual(["Beginning", "Problem", "Trying", "Big Moment", "Ending"]); });
  it("gives Explorers exactly 8 guided pages", () => { expect(guidedPages("explorers")).toHaveLength(8); expect(storyBeats("explorers").map((b) => b.cue).join(" ")).toContain("it gets worse"); });
  it("gives Builders exactly 12 guided pages", () => { expect(guidedPages("builders")).toHaveLength(12); expect(storyBeats("builders").map((b) => b.cue).join(" ")).toContain("A helper arrives"); });
  it("never inserts sparks into the child's story text", () => { expect(guidedPages("explorers").every((p) => p.text === "")).toBe(true); });
  it("preserves child words exactly including whitespace and spelling", () => { const page = { ...newStoryPage(), text: "  Pip wos brave.\nShe helpt!  " }; expect(storySchema.parse({ ...draft(), pages: [page] }).pages[0]?.text).toBe("  Pip wos brave.\nShe helpt!  "); });
  it("keeps sparks within 2–5 words, never accepts full-sentence length", () => { expect(cleanSparks(["Brave", "A clever plan", "This long sentence would write the story", "A secret door!"])).toEqual(["A clever plan", "A secret door"]); });
  it("records one follow-up per saved page", () => { const s = storySchema.parse({ ...draft(), followups: ["page-one"] }); expect(s.followups?.includes("page-one")).toBe(true); expect(s.followups?.includes("page-two")).toBe(false); });
});