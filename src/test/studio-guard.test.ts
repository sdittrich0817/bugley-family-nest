import { describe, expect, it } from "vitest";
import { findFamilyName, quickPersonalCheck } from "@/lib/studio-guard";

const family = ["Maya", "Leo", "Shea", "Dittrich"];

describe("studio safety guard (quick checks)", () => {
  it("blocks the child's own first name", () => expect(quickPersonalCheck("a story about maya and a dragon", family)).toBe(true));
  it("blocks a sibling's name", () => expect(findFamilyName("Leo saves the day", family)).toBe("Leo"));
  it("blocks a parent's last name", () => expect(quickPersonalCheck("The Dittrich family castle", family)).toBe(true));
  it("allows a made-up hero name", () => expect(quickPersonalCheck("a hero named Max", family)).toBe(false));
  it("allows a famous faraway place", () => expect(quickPersonalCheck("a story set in Paris", family)).toBe(false));
  it("does not match names inside other words", () => expect(quickPersonalCheck("Leopards run fast", family)).toBe(false));
  it("blocks a street address", () => expect(quickPersonalCheck("he lives at 42 Oak Street", family)).toBe(true));
  it("blocks a phone number", () => expect(quickPersonalCheck("call 816-555-1234", family)).toBe(true));
  it("blocks an email", () => expect(quickPersonalCheck("kid@example.com", family)).toBe(true));
  it("blocks a named school", () => expect(quickPersonalCheck("at Lincoln Elementary", family)).toBe(true));
  it("blocks a birthday", () => expect(quickPersonalCheck("my birthday is in May", family)).toBe(true));
});
