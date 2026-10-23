import { describe, it, expect } from "vitest";
import { bugSchema, starterBug, toBug } from "./bug-avatar";
describe("bug avatars", () => {
  it("rejects parts that aren't on the list", () => { expect(bugSchema.safeParse({ ...starterBug("a"), kind: "photo" }).success).toBe(false); });
  it("turns old animal avatars into a valid starter bug", () => { expect(bugSchema.safeParse(toBug("fox", "kid1")).success).toBe(true); });
});
