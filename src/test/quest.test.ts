import { describe, expect, it } from "vitest";
import { familyActivityDone, gradeChoice, questStates, soloDone } from "@/lib/curriculum";

const acts = [{ id: "s", step: "story" }, { id: "t", step: "try" }, { id: "i", step: "idea" }, { id: "c", step: "campfire" }];
describe("Quest chapters", () => {
  it("unlocks only the first unfinished chapter", () => {
    expect(questStates([{ id: "1" }, { id: "2" }, { id: "3" }], new Set(["1"]))).toEqual(["done", "current", "locked"]);
  });
  it("finishes a chapter for the child when story, try and idea are done, without the Campfire", () => {
    expect(soloDone(acts, new Set(["s", "t", "i"]))).toBe(true);
    expect(soloDone(acts, new Set(["s", "t"]))).toBe(false);
  });
  it("keeps the family Campfire open until every child finishes it", () => {
    const sessions = [{ id: "ch1", activities: [{ id: "s" }, { id: "c" }] }];
    const done = [{ child_id: "a", activity_id: "s" }, { child_id: "a", activity_id: "c" }, { child_id: "b", activity_id: "s" }];
    expect([...familyActivityDone(sessions, ["a", "b"], done)]).toEqual([]);
    expect([...familyActivityDone(sessions, ["a", "b"], [...done, { child_id: "b", activity_id: "c" }])]).toEqual(["ch1"]);
  });
  it("grades a choice on the server", () => {
    const ch = [{ label: "A", correct: false, why: "" }, { label: "B", correct: true, why: "Yes" }];
    expect(gradeChoice(ch, 1)).toEqual({ label: "B", correct: true, why: "Yes" });
    expect(gradeChoice(ch, 0).correct).toBe(false);
    expect(() => gradeChoice(ch, 5)).toThrow();
  });
});
