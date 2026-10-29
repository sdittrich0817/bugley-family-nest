import { describe, expect, it } from "vitest";
import { addExample, CHECKS, guess, REPAIR, ROUND_MS, SNACKS, SURPRISE, TRAINING } from "./learning";

describe("Wonderwood learning", () => {
  it("cannot guess before the child teaches it", () => {
    expect(guess([], SURPRISE)).toBeNull();
  });
  it("learns a color bias from a limited set of examples", () => {
    const examples = TRAINING.map(sample => ({ sample, label: sample.kind }));
    expect(guess(examples, SURPRISE)).toBe("berry");
  });
  it("changes its guesses after varied examples and transfers to unseen items", () => {
    let examples = TRAINING.map(sample => ({ sample, label: sample.kind }));
    examples = addExample(examples, SURPRISE, "stone");
    examples = addExample(examples, REPAIR, "berry");
    expect(CHECKS.map(s => guess(examples, s))).toEqual(["berry", "stone"]);
    expect(SNACKS.map(s => guess(examples, s))).toEqual(["stone", "berry", "berry"]);
  });
  it("ends a round strictly under five minutes", () => {
    expect(ROUND_MS).toBe(240_000);
    expect(ROUND_MS).toBeLessThan(300_000);
  });
});