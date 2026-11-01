import { describe, expect, it } from "vitest";
import { buildPrompt } from "./images.server";
describe("image prompt", () => {
  it("always forbids words in the image", () => {
    expect(buildPrompt("cartoon", "a dragon", "final")).toMatch(/no text, no words, no letters/);
  });
  it("frames characters full-body against a plain full-bleed backdrop with no circle wording", () => {
    const prompt = buildPrompt("cartoon", "a robot", "character");
    expect(prompt).toMatch(/full-body/);
    expect(prompt).toMatch(/plain flat wall of one quiet color that fills the whole frame to every corner/);
    expect(prompt).not.toMatch(/circle|ring|halo|badge|medallion/i);
  });
});
