import { describe, expect, it } from "vitest";
import { formatStoryPage, storyCoachContext, storyLayoutSchema, suggestStoryLayout } from "./story-presentation";

describe("child-led book presentation", () => {
  it("offers exactly three allowed layouts", () => {
    expect(storyLayoutSchema.options).toEqual(["picture-top", "picture-side", "small-picture"]);
    expect(storyLayoutSchema.safeParse("words-over-face").success).toBe(false);
  });
  it("formatting preserves exact words and existing art", () => {
    const page = { text: "  Pip wos brave.\nShe helpt!  ", image: "owned/existing.png" };
    expect(formatStoryPage(page, "picture-side", "A brave beginning")).toEqual({ ...page, layout: "picture-side", chapter: "A brave beginning" });
  });
  it("suggests more word space without altering the words", () => {
    expect(suggestStoryLayout("Pip flies home.")).toBe("picture-top");
    expect(suggestStoryLayout("word ".repeat(46))).toBe("picture-side");
    expect(suggestStoryLayout("word ".repeat(121))).toBe("small-picture");
  });
  it("coaching uses only earlier written pages and the current exact words", () => {
    const context = storyCoachContext({ map: { place: "Cloud City" }, pages: [{ id: "one", text: "Pip lost her key." }, { id: "blank", text: "" }, { id: "now", text: "old text" }, { id: "future", text: "Future ending" }] }, "now", "  She looked.\n");
    expect(context.previous).toEqual([{ text: "Pip lost her key.", chapter: undefined }]);
    expect(context.text).toBe("  She looked.\n");
    expect(context.page).toBe(3);
    expect(context.map).toEqual({ place: "Cloud City" });
    expect(() => storyCoachContext({ pages: [] }, "missing", "Hello")).toThrow();
  });
});