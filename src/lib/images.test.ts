import { describe, expect, it } from "vitest";
import { buildPrompt } from "./images.server";
describe("image prompt", () => {
  it("always forbids words in the image", () => {
    expect(buildPrompt("cartoon", "a dragon", "final")).toMatch(/no text, no words, no letters/);
  });
  it("frames characters full-body on a solid white background with no circle wording", () => {
    const prompt = buildPrompt("cartoon", "a robot", "character");
    expect(prompt).toMatch(/whole body visible from head to toe/);
    expect(prompt).toMatch(/solid flat white background that covers the entire image/);
    expect(prompt).not.toMatch(/circle|ring|halo|badge|medallion/i);
  });
  it("puts the plain-background instruction after the child's words for characters", () => {
    const prompt = buildPrompt("cartoon", "a robot", "character");
    expect(prompt.indexOf("a robot")).toBeLessThan(prompt.indexOf("solid flat white background"));
  });
});
