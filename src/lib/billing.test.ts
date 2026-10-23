import { describe, expect, it } from "vitest";
import { hasAccess, planForPrice, priceIdFor, TRIAL_DAYS } from "./billing";

const now = new Date("2026-10-22T00:00:00Z");
const later = "2026-11-05T00:00:00Z", earlier = "2026-10-01T00:00:00Z";

describe("billing rules", () => {
  it("every plan starts with a 14-day trial", () => expect(TRIAL_DAYS).toBe(14));
  it("Family Plus prices map to the 20-glow plan", () => { expect(planForPrice("family_plus_yearly")).toBe("family_plus"); expect(planForPrice("family_monthly")).toBe("family"); });
  it("annual toggle picks yearly prices", () => expect(priceIdFor("family_plus", "annual")).toBe("family_plus_yearly"));
  it("trialing families can use the Kid Zone", () => expect(hasAccess({ status: "trialing", current_period_end: later }, now)).toBe(true));
  it("no plan pauses the Kid Zone", () => expect(hasAccess(null, now)).toBe(false));
  it("unpaid or lapsed plans pause the Kid Zone", () => { expect(hasAccess({ status: "unpaid", current_period_end: later }, now)).toBe(false); expect(hasAccess({ status: "canceled", current_period_end: earlier }, now)).toBe(false); });
  it("canceled plans stay open until the period ends", () => expect(hasAccess({ status: "canceled", current_period_end: later }, now)).toBe(true));
});
