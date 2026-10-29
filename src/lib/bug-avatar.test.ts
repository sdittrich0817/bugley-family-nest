import { describe, it, expect } from "vitest";
import { bugSchema, starterBug, toBug, avatarCost } from "./bug-avatar";
describe("bug avatars", () => {
  it("rejects parts that aren't on the list", () => { expect(bugSchema.safeParse({ ...starterBug("a"), kind: "photo" }).success).toBe(false); });
  it("turns old animal avatars into a valid starter bug", () => { expect(bugSchema.safeParse(toBug("fox", "kid1")).success).toBe(true); });
  it("gives each child exactly two free AI picture attempts", () => { expect(avatarCost(0)).toBe(0); expect(avatarCost(1)).toBe(0); expect(avatarCost(2)).toBe(1); });
  it("charges one Glow for every subsequent AI attempt", () => { expect(avatarCost(3)).toBe(1); expect(avatarCost(100)).toBe(1); });
});
