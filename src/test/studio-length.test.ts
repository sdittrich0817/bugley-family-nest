import { describe, expect, it } from "vitest";
import { beatBandOf, defaultLength, guidedPages, lengthBand, storyBeats } from "@/lib/story";
import { comicBeats, guidedComicPages } from "@/lib/comic";

describe("child-chosen story length", () => {
  it("maps short/medium/long to roughly 4/8/12 beats", () => {
    expect(storyBeats(lengthBand("short")).length).toBe(5);
    expect(storyBeats(lengthBand("medium")).length).toBe(8);
    expect(storyBeats(lengthBand("long")).length).toBe(12);
    expect(comicBeats(lengthBand("short")).length).toBe(4);
  });
  it("builds page structures from the chosen length, not the age band", () => {
    expect(guidedPages(lengthBand("short")).length).toBe(5);
    expect(guidedPages(lengthBand("long")).length).toBe(12);
    expect(guidedComicPages(lengthBand("medium")).flatMap((p) => p.panels).length).toBe(8);
  });
  it("defaults each age band to its old length for existing projects", () => {
    expect(defaultLength("sprouts")).toBe("short");
    expect(defaultLength("explorers")).toBe("medium");
    expect(defaultLength("builders")).toBe("long");
  });
  it("beat questions follow the chosen length even when age differs", () => {
    expect(beatBandOf({ guidedBand: "sprouts", length: "long" }, "sprouts")).toBe("builders");
    expect(beatBandOf({ guidedBand: "builders" }, "builders")).toBe("builders");
    expect(beatBandOf({}, "sprouts")).toBe("sprouts");
  });
});
