import { describe, expect, it } from "vitest";
import { COMIC_GENRES } from "./comic";
import { STYLE_THUMBS } from "./style-thumbs";
import { COMIC_LENGTHS, SPROUTS_GENRES, SPROUTS_LENGTHS, SPROUTS_STYLES, defaultCount, setupStartsCollapsed, visibleStyles } from "./comic-setup";

const ALL = Object.keys(STYLE_THUMBS).map((key) => ({ key }));

describe("A3.2 comic defaults by age", () => {
  it("Sprouts start with a short 2-panel comic", () => expect(defaultCount("comic", "sprouts")).toBe(2));
  it("Explorers and Builders start with 4 panels", () => {
    expect(defaultCount("comic", "explorers")).toBe(4);
    expect(defaultCount("comic", "builders")).toBe(4);
  });
  it("stories keep their 5-page start for every age", () => {
    for (const b of ["sprouts", "explorers", "builders"]) expect(defaultCount("story", b)).toBe(5);
  });
  it("Sprouts and Explorers see a ready-made plan with Change; Builders see every choice", () => {
    expect(setupStartsCollapsed("sprouts")).toBe(true);
    expect(setupStartsCollapsed("explorers")).toBe(true);
    expect(setupStartsCollapsed("builders")).toBe(false);
  });
});

describe("A3.2 nothing is removed", () => {
  it("Sprouts see the four chosen styles first", () => {
    expect(visibleStyles(ALL, "sprouts", "cartoon", false).map((s) => s.key)).toEqual(["cartoon", "crayon", "storybook", "classic_comic"]);
  });
  it("More looks shows every existing style", () => expect(visibleStyles(ALL, "sprouts", "cartoon", true)).toHaveLength(10));
  it("a reopened idea in a style outside the first four shows every style", () =>
    expect(visibleStyles(ALL, "sprouts", "clay", false)).toHaveLength(10));
  it("Explorers and Builders always see all ten styles", () => {
    expect(visibleStyles(ALL, "explorers", "cartoon", false)).toHaveLength(10);
    expect(visibleStyles(ALL, "builders", "cartoon", false)).toHaveLength(10);
  });
  it("featured choices are real existing options, three at most for kinds and lengths", () => {
    for (const k of SPROUTS_STYLES) expect(Object.keys(STYLE_THUMBS)).toContain(k);
    for (const g of SPROUTS_GENRES) expect(COMIC_GENRES).toContain(g);
    for (const l of SPROUTS_LENGTHS) expect(COMIC_LENGTHS).toContain(l.count);
    expect(SPROUTS_GENRES).toHaveLength(3);
    expect(SPROUTS_LENGTHS).toHaveLength(3);
  });
  it("all eight comic kinds and all six lengths stay available", () => {
    expect(COMIC_GENRES).toHaveLength(8);
    expect([...COMIC_LENGTHS]).toEqual([1, 2, 4, 6, 8, 12]);
  });
});
