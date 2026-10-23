import { describe, expect, it } from "vitest";
import { LAYOUTS, movePage, newComicPage, readyToFinishComic, setLayout, trimmedPanelsHaveWork, type ComicData } from "./comic";

describe("comic maker rules", () => {
  it("offers 1, 2, 3, 4 and 6 panel layouts", () => expect(Object.values(LAYOUTS)).toEqual([1, 2, 3, 4, 6]));
  it("switching layout keeps existing panels", () => {
    const p = newComicPage("two"); p.panels[0]!.description = "Zara flies";
    const next = setLayout(p, "six");
    expect(next.panels).toHaveLength(6); expect(next.panels[0]!.description).toBe("Zara flies");
  });
  it("warns before trimming panels that have work", () => {
    const p = newComicPage("four"); p.panels[3]!.description = "POW";
    expect(trimmedPanelsHaveWork(p, "two")).toBe(true);
  });
  it("reorders pages", () => expect(movePage(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]));
  it("needs every panel final plus a cover to finish", () => {
    const page = newComicPage("one");
    const c: ComicData = { genre: "Funny", styleKey: "cartoon", characterIds: [], map: { hero: "a", want: "b", place: "c", problem: "d", ending: "e" }, pages: [page], finished: false, cover: "x" };
    page.panels[0]!.sketch = "s";
    expect(readyToFinishComic(c)).toBe(false);
    page.panels[0]!.image = "f";
    expect(readyToFinishComic(c)).toBe(true);
  });
});
