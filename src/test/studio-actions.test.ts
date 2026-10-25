import { describe, expect, it } from "vitest";
import { bugleyActions, STUDIO_ACTIONS } from "@/lib/studio-actions";

describe("Bugley's actionable suggestions", () => {
  it("offers the character builder when a child asks to make a character", () => {
    expect(bugleyActions("Can I make a new character?").map((a) => a.action)).toContain("open:character_new");
    expect(bugleyActions("show me my heroes").map((a) => a.action)).toContain("open:characters");
  });
  it("offers the right maker for pictures, stories and comics", () => {
    expect(bugleyActions("I want to draw a dragon")[0]!.action).toBe("open:picture");
    expect(bugleyActions("let's make a comic!")[0]!.action).toBe("open:comic");
    expect(bugleyActions("can we write a story")[0]!.action).toBe("open:story");
  });
  it("never returns more than two actions and only allow-listed ids", () => {
    const acts = bugleyActions("draw a character for my comic story album");
    expect(acts.length).toBeLessThanOrEqual(2);
    for (const a of acts) expect(Object.keys(STUDIO_ACTIONS)).toContain(a.action);
  });
  it("returns nothing for unrelated chat", () => {
    expect(bugleyActions("what is your favorite color")).toEqual([]);
  });
});
