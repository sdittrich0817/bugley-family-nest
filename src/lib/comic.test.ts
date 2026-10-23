import { describe, expect, it } from "vitest";
import { LAYOUTS, movePage, newComicPage, readyToFinishComic, setLayout, trimmedPanelsHaveWork, guidedComicPages, comicBeats, comicCells, dialogueLayers, type ComicData } from "./comic";

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
  it("creates exactly 4 panels for Sprouts", () => expect(guidedComicPages("sprouts").flatMap((p) => p.panels)).toHaveLength(4));
  it("creates exactly 8 panels for Explorers", () => expect(guidedComicPages("explorers").flatMap((p) => p.panels)).toHaveLength(8));
  it("creates exactly 12 panels for Builders", () => expect(guidedComicPages("builders").flatMap((p) => p.panels)).toHaveLength(12));
  it("automatically makes the big moment wide without changing story order", () => {
    for (const band of ["sprouts", "explorers", "builders"]) {
      const pages = guidedComicPages(band), panels = pages.flatMap((p) => p.panels);
      const big = panels[comicBeats(band).findIndex((b) => b.step === "Big Moment")];
      const page = pages.find((p) => p.widePanelId === big?.id);
      expect(page).toBeDefined(); if (!page) throw new Error("Missing wide panel");
      expect(comicCells(page)[page.panels.findIndex((p) => p.id === big?.id)]?.w).toBe(1);
      expect(pages.every((p) => p.panels.length >= 3 && p.panels.length <= 4)).toBe(true);
    }
  });
  it("keeps automatic panel cells nonoverlapping and within the page", () => {
    for (const page of guidedComicPages("builders")) {
      const cells = comicCells(page);
      for (const [i, a] of cells.entries()) {
        expect(a.x + a.w).toBeLessThanOrEqual(1); expect(a.y + a.h).toBeLessThanOrEqual(1);
        for (const b of cells.slice(i + 1)) expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y).toBe(true);
      }
    }
  });
  it("changes speech and sound layers without changing or regenerating art", () => {
    const panel = newComicPage("one").panels[0]; if (!panel) throw new Error("Missing fixture");
    panel.image = "saved-final.png"; panel.bubblePlacement = { x: 4, y: 5, w: 40, h: 25, tx: 68, ty: 53 };
    panel.layers = dialogueLayers(panel, "  Let's go!  ", "WHOOSH!");
    expect(panel.layers[0]?.text).toBe("  Let's go!  "); expect(panel.layers[0]?.tx).toBe(68); expect(panel.layers[1]?.text).toBe("WHOOSH!");
    panel.layers = dialogueLayers(panel, "We did it!", "POW!"); expect(panel.image).toBe("saved-final.png"); expect(panel.layers[0]?.text).toBe("We did it!");
    expect(dialogueLayers(panel, "").some((l) => l.type === "speech")).toBe(false);
    expect(dialogueLayers(panel, "")[0]?.text).toBe("POW!");
  });
});
