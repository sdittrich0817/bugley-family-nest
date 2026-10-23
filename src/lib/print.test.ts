import { describe, expect, it } from "vitest";
import { canPrint, freeCreditAvailable, paddedPageCount, priceOrder } from "./print";

const comic = { min_pages: 8, max_pages: 48, page_multiple: 4 };
const picture = { min_pages: 24, max_pages: 800, page_multiple: 2 };

describe("print rules", () => {
  it("comic of 9 pages pads to 12", () => expect(paddedPageCount(9, 4)).toBe(12));
  it("comic of 7 pages cannot print (8 minimum)", () => expect(canPrint(comic, 7)).toBe(false));
  it("comic of 8 pages can print", () => expect(canPrint(comic, 8)).toBe(true));
  it("picture book of 23 pages cannot print (24 minimum)", () => expect(canPrint(picture, 23)).toBe(false));
  it("picture book of 24 pages can print", () => expect(canPrint(picture, 24)).toBe(true));
  it("adds 15% markup on print cost, not shipping", () => {
    const p = priceOrder({ printCentsEach: 1000, quantity: 2, shippingCents: 500, feesCents: 0, markupPercent: 15, creditApplied: false });
    expect(p.bookEach).toBe(1150); expect(p.total).toBe(2800);
  });
  it("free credit covers one book but not shipping", () => {
    const p = priceOrder({ printCentsEach: 1000, quantity: 1, shippingCents: 500, feesCents: 0, markupPercent: 15, creditApplied: true });
    expect(p.total).toBe(500);
  });
  it("only Family Plus annual gets the credit, once per year", () => {
    const sub = { status: "active", price_id: "family_plus_yearly", current_period_start: "2026-01-01T00:00:00Z" };
    expect(freeCreditAvailable(sub, () => 0)).toBe(true);
    expect(freeCreditAvailable(sub, () => 1)).toBe(false);
    expect(freeCreditAvailable({ ...sub, price_id: "family_plus_monthly" }, () => 0)).toBe(false);
    expect(freeCreditAvailable({ ...sub, price_id: "family_yearly" }, () => 0)).toBe(false);
  });
});
