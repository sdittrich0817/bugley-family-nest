import { describe, expect, it } from "vitest";
import { dragonTakeaway, meadowTakeaway } from "@/lib/takeaways";

const claimsLearning = (t: { title: string; body: string }) => /taught|caught|fixed/i.test(t.title + t.body);

describe("Memory Meadow takeaway", () => {
  it("claims no teaching when no pairs were found", () => {
    expect(claimsLearning(meadowTakeaway({ pairs: 0, caught: 0, learned: [] }))).toBe(false);
  });
  it("names only the features the child's pairs taught", () => {
    const t = meadowTakeaway({ pairs: 2, caught: 0, learned: ["yellow"] });
    expect(t.body).toContain("dots and stripes");
    expect(t.body).not.toContain("wing shape");
  });
  it("mentions caught mistakes only when Bugley guessed wrong", () => {
    expect(meadowTakeaway({ pairs: 4, caught: 0, learned: ["blue", "yellow"] }).body).not.toMatch(/wrong guess/);
    expect(meadowTakeaway({ pairs: 4, caught: 2, learned: ["blue", "yellow"] }).body).toContain("2 of my wrong guesses");
  });
});

describe("Dragon Catch takeaway", () => {
  it("claims no teaching when no photo was checked correctly", () => {
    expect(claimsLearning(dragonTakeaway({ checked: 0, corrections: 0 }))).toBe(false);
  });
  it("says the child taught the camera after correct checks with no corrections", () => {
    const t = dragonTakeaway({ checked: 3, corrections: 0 });
    expect(t.title).toBe("You taught Dragon Eye!");
    expect(t.body).not.toMatch(/mistake|wrong/);
  });
  it("credits caught camera mistakes only when the camera would have been wrong", () => {
    expect(dragonTakeaway({ checked: 3, corrections: 2 }).body).toContain("2 times");
  });
});
