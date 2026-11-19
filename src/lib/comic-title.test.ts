import { describe, expect, it } from "vitest";
import { comicTitleIdeas, nounPhrases } from "./comic-title";
import { intendedCoverCast } from "./cover-cast";

const cast = [{ id: "p", name: "Pip" }, { id: "l", name: "Luna" }];

describe("comic name ideas (A3.1)", () => {
  it("offers at most three ideas built from the child's own words", () => {
    const ideas = comicTitleIdeas({ names: ["Pip"], genre: "Adventure", panels: ["Pip finds a big purple crystal in a cave.", "Pip climbs the old red lighthouse."] });
    expect(ideas).toEqual(["Pip and the Big Purple Crystal", "Pip and the Cave", "Pip’s Adventure"]);
  });
  it("prefers exact Story Memory things and places", () => {
    const ideas = comicTitleIdeas({ names: ["Pip"], genre: "Mystery", panels: ["Pip runs."], memory: [{ kind: "event", excerpt: "a race" }, { kind: "object", excerpt: "the golden key" }] });
    expect(ideas[0]).toBe("Pip and the Golden Key");
    expect(ideas).toContain("Pip’s Mystery");
  });
  it("names both characters when there are two", () => {
    expect(comicTitleIdeas({ names: ["Pip", "Luna"], genre: "Funny", panels: [""] })).toEqual(["Pip and Luna", "Pip’s Funny Comic"]);
  });
  it("never uses words that are not in the child's text, names or chosen kind", () => {
    const panels = ["Zip zooms over a snowy forest and spots a tiny fox."];
    const allowed = new Set(`${panels.join(" ")} zip and the adventure`.toLowerCase().match(/[a-z]+/g));
    for (const idea of comicTitleIdeas({ names: ["Zip"], genre: "Adventure", panels }))
      for (const w of idea.toLowerCase().replace(/’s/g, "").match(/[a-z]+/g) ?? []) expect(allowed.has(w)).toBe(true);
  });
  it("skips filler phrases and the characters' own names", () => {
    expect(nounPhrases("Pip had a lot of fun with the Luna", ["Pip", "Luna"])).toEqual([]);
    expect(nounPhrases("They reach the end of the day")).toEqual([]);
  });
  it("returns nothing without a character name", () => {
    expect(comicTitleIdeas({ names: [], panels: ["a big crystal"] })).toEqual([]);
  });
  it("never turns into an instruction about who is on the cover", () => {
    for (const idea of comicTitleIdeas({ names: ["Pip", "Luna"], genre: "Adventure", panels: ["Pip finds the glowing map.", "Luna stays home asleep."] }))
      expect(intendedCoverCast(idea, cast).mode).toBe("default");
  });
});
