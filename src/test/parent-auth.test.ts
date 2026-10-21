import { describe, expect, it } from "vitest";
import { parentSignupSchema, consentSchema, CONSENT_VERSION, isActiveParent } from "@/lib/parent-auth";
const parent = { firstName: "Shea", lastName: "Dittrich", email: "parent@example.com", password: "TestPass123!", adultAttested: true };
describe("Parent account requirements", () => {
  it("requires active adult parent or guardian attestation", () => { expect(parentSignupSchema.safeParse({ ...parent, adultAttested: false }).success).toBe(false); expect(parentSignupSchema.safeParse(parent).success).toBe(true); });
  it("requires both parent names", () => { expect(parentSignupSchema.safeParse({ ...parent, firstName: "" }).success).toBe(false); expect(parentSignupSchema.safeParse({ ...parent, lastName: "" }).success).toBe(false); });
  it("requires active consent to the current version", () => { expect(consentSchema.safeParse({ agreed: false, version: CONSENT_VERSION }).success).toBe(false); expect(consentSchema.safeParse({ agreed: true, version: "old" }).success).toBe(false); expect(consentSchema.safeParse({ agreed: true, version: "2026-10-21" }).success).toBe(true); });
  it("does not activate an unverified email", () => { const user = { user_metadata: { adult_attested: true, parental_consent: true } }; expect(isActiveParent(user)).toBe(false); expect(isActiveParent({ ...user, email_confirmed_at: "2026-10-21T20:50:00Z" })).toBe(true); });
});