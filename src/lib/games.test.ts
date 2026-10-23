import { describe, expect, it } from "vitest";
import { bonusFor, canPlay, runChef, shouldUnlock, trainBugley, ROUND_MINUTES } from "./games";

const steps = [{ id: "a", text: "Open jar", ifMissing: "rubs closed jar" }, { id: "c", text: "Scoop", ifMissing: "whole jar on the bread" }];
describe("arcade rules", () => {
  it("rounds last between 3 and 5 minutes", () => expect(ROUND_MINUTES >= 3 && ROUND_MINUTES <= 5).toBe(true));
  it("bonus glow is capped at 3 per day from games", () => { expect(bonusFor(5, 5, 2)).toBe(1); expect(bonusFor(5, 5, 3)).toBe(0); });
  it("no bonus glow without a perfect round", () => expect(bonusFor(4, 5, 0)).toBe(0));
  it("Robot Chef is for ages 5–9 only", () => { expect(canPlay("robot_chef", "sprouts")).toBe(true); expect(canPlay("robot_chef", "builders")).toBe(false); });
  it("Train Bugley and Fact or Fib are for ages 7–12", () => { expect(canPlay("train_bugley", "sprouts")).toBe(false); expect(canPlay("fact_fib", "builders")).toBe(true); });
  it("next level unlocks at 70% on the current level", () => { expect(shouldUnlock(7, 10, 1, 1)).toBe(true); expect(shouldUnlock(6, 10, 1, 1)).toBe(false); });
});
describe("Robot Chef", () => {
  it("a missing step gives the funny literal result", () => expect(runChef(steps, [], ["c"]).result).toBe("rubs closed jar"));
  it("the right order works", () => expect(runChef(steps, [], ["a", "c"]).ok).toBe(true));
  it("a silly card makes a silly result", () => expect(runChef(steps, [{ id: "x", text: "hat", funny: "bowl hat" }], ["x"]).result).toBe("bowl hat"));
});
describe("Train Bugley", () => {
  it("fails on green apples when only shown red ones", () => {
    const ex = [{ id: "r", emoji: "", name: "red", traits: { color: "red" } }, { id: "o", emoji: "", name: "orange", traits: { color: "orange" } }];
    const r = trainBugley(ex, { r: "Apples", o: "Oranges" }, [{ emoji: "", name: "green apple", group: "Apples", traits: { color: "green" } }]);
    expect(r[0]!.correct).toBe(false);
  });
  it("learns from what it was shown", () => {
    const ex = [{ id: "g", emoji: "", name: "green", traits: { color: "green" } }];
    expect(trainBugley(ex, { g: "Apples" }, [{ emoji: "", name: "g", group: "Apples", traits: { color: "green" } }])[0]!.correct).toBe(true);
  });
});
