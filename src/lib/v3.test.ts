import { describe, expect, it } from "vitest";
import { replaceV3Art, v3ComicPages, v3Details, v3StoryPages } from "./v3";

describe("character-first Create rules", () => {
  it("creates the child's exact chosen panel count across pages", () => {
    for (const count of [1, 3, 5, 7, 12]) expect(v3ComicPages(count).flatMap(p => p.panels)).toHaveLength(count);
    expect(v3ComicPages(7).map(p => p.panels.length)).toEqual([4, 3]);
  });
  it("carries the approved character into every output without requiring an outline", () => {
    const hero = { id: "character-id", title: "Super Ted", styleKey: "cartoon" };
    for (const kind of ["picture", "comic", "story"] as const) {
      const d = v3Details(kind, 5, hero);
      expect("characters" in d ? d.characters : d.characterIds).toEqual(["character-id"]);
      expect(d.workspace.outlineApproved).toBe(true);
      expect("outline" in d).toBe(false);
    }
  });
  it("starts panels blank rather than inserting Bugley's story", () => {
    expect(v3ComicPages(5).flatMap(p => p.panels.map(panel => panel.description))).toEqual(["", "", "", "", ""]);
  });
  it("creates the chosen story length with all finish beats", () => {
    const pages = v3StoryPages(7);
    expect(pages).toHaveLength(7);
    expect(new Set(pages.map(p => p.step)).size).toBe(5);
  });
  it("retains the original art and description when a redraw fails", () => {
    const old = { image: "old.png", description: "A sunny forest", text: "  Ted ran!  " };
    expect(replaceV3Art(old, { ok: false }, "A nighttime forest")).toEqual(old);
  });
  it("changes only the targeted art and keeps the child's story words exactly", () => {
    const pages = [{ image: "one.png", description: "Sunny", text: "  Ted ran!  " }, { image: "two.png", description: "Home", text: "The end" }];
    const next = pages.map((p, i) => i === 0 ? replaceV3Art(p, { ok: true, path: "night.png" }, "Nighttime") : p);
    expect(next[0]).toEqual({ image: "night.png", description: "Nighttime", text: "  Ted ran!  " });
    expect(next[1]).toEqual(pages[1]);
  });
  it("never saves a scene description longer than 600 characters", () => {
    const next = replaceV3Art({ image: null, description: "x" }, { ok: true, path: "a.png" }, "y".repeat(900));
    expect(next.description).toHaveLength(600);
  });
});
import { v3Details as details2 } from "./v3";
import { test as t2, expect as e2 } from "vitest";
t2("comic keeps the child's chosen comic type", () => {
  e2((details2("comic", 4, { id: "c", title: "Mayo", styleKey: "cartoon" }, "Mystery") as any).genre).toBe("Mystery");
  e2((details2("comic", 4, { id: "c", title: "Mayo", styleKey: "cartoon" }) as any).genre).toBe("Adventure");
});
