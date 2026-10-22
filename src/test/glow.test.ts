import { describe, expect, it } from "vitest";
import { DAILY_GLOW, GLOW_COSTS, isGlowLow } from "@/lib/glow";
describe("Glow rules", () => {
  it("gives 10 a day on Family and 20 on Family Plus", () => { expect(DAILY_GLOW.family).toBe(10); expect(DAILY_GLOW.family_plus).toBe(20); });
  it("charges 1 for a sketch and 3 for a finished picture", () => { expect(GLOW_COSTS.sketch).toBe(1); expect(GLOW_COSTS.picture).toBe(3); });
  it("warns when a finished picture is no longer affordable", () => { expect(isGlowLow(2)).toBe(true); expect(isGlowLow(3)).toBe(false); });
});
