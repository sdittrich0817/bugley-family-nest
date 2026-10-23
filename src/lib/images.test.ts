import { describe, expect, it } from "vitest";
import { buildPrompt } from "./images.server";
describe("image prompt", () => {
  it("always forbids words in the image", () => {
    expect(buildPrompt("cartoon", "a dragon", "final")).toMatch(/no text, no words, no letters/);
  });
  it("frames characters full-body on a plain background", () => {
    expect(buildPrompt("cartoon", "a robot", "character")).toMatch(/full-body.*plain soft white background/);
  });
});
