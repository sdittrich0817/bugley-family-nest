import { describe, expect, it } from "vitest";
import { familyCompleted, pickCurrentSession } from "@/lib/curriculum";
const s = [{ id: "w1" }, { id: "w2" }, { id: "w3" }];
describe("Current session", () => {
  it("is the first session not yet completed", () => { expect(pickCurrentSession(s, new Set(["w1"]))?.id).toBe("w2"); });
  it("starts at week 1", () => { expect(pickCurrentSession(s, new Set())?.id).toBe("w1"); });
  it("stays on the last session once everything is done", () => { expect(pickCurrentSession(s, new Set(["w1", "w2", "w3"]))?.id).toBe("w3"); });
  it("counts a family session done only when every child finished it", () => {
    const done = [{ child_id: "a", session_id: "w1" }, { child_id: "b", session_id: "w1" }, { child_id: "a", session_id: "w2" }];
    expect([...familyCompleted(["w1", "w2"], ["a", "b"], done)]).toEqual(["w1"]);
  });
});
