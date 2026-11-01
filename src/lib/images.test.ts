import { describe, expect, it } from "vitest";
import { buildPrompt } from "./images.server";
describe("image prompt", () => {
  it("always forbids words in the image", () => {
    expect(buildPrompt("cartoon", "a dragon", "final")).toMatch(/no text, no words, no letters/);
  });
  it("frames characters full-body on a plain full-bleed background with no circle wording", () => {
    const prompt = buildPrompt("cartoon", "a robot", "character");
    expect(prompt).toMatch(/full-body/);
    expect(prompt).toMatch(/fills the entire picture edge to edge, with nothing behind the character/);
    expect(prompt).not.toMatch(/circle|ring|halo|badge|medallion/i);
  });
});
