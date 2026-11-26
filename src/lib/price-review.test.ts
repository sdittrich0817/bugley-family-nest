import { describe, expect, it, vi, afterEach } from "vitest";
import { assertPriceReview, PRICE_REVIEWED_AT, PRICE_REVIEW_MAX_AGE_MS } from "./price-review";
import { replicateRun } from "./images.server";
import { setSpendRpcs } from "./spend.server";
afterEach(() => { vi.useRealTimers(); setSpendRpcs(null); });
describe("price revalidation", () => {
  it("accepts a current review without changing the configured models", () => {
    expect(() => assertPriceReview(Date.parse(PRICE_REVIEWED_AT) + 1)).not.toThrow();
  });
  it("expires after 30 days and refuses before reserving or drawing", async () => {
    vi.useFakeTimers(); vi.setSystemTime(Date.parse(PRICE_REVIEWED_AT) + PRICE_REVIEW_MAX_AGE_MS);
    const reserve = vi.fn(); setSpendRpcs({ reserve, settle: async () => {} });
    await expect(replicateRun({ model: "google/nano-banana-pro", version: "", settings: {} }, "Synthetic", [])).rejects.toThrow("fresh review");
    expect(reserve).not.toHaveBeenCalled();
  });
});