import { describe, expect, it } from "vitest";
import { buildPrompt } from "./images.server";
describe("image prompt", () => {
  it("always forbids words in the image", () => {
    expect(buildPrompt("cartoon", "a dragon", "final")).toMatch(/no text, no words, no letters/);
  });
  it("frames characters full-body on a plain background with no circles or boxes", () => {
    const prompt = buildPrompt("cartoon", "a robot", "character");
    expect(prompt).toMatch(/full-body.*plain seamless white background/);
    expect(prompt).toMatch(/no circle, ring or halo/i);
    expect(prompt).toMatch(/no frame, no border, no panels and no empty boxes/i);
  });
});
