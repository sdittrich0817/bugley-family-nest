// Browser-safe printed-book rules shared by server functions, pages and tests.
import { z } from "zod";

export const SHIPPING_LEVELS = ["MAIL", "PRIORITY_MAIL", "GROUND", "EXPEDITED", "EXPRESS"] as const;
export const SHIPPING_LABEL: Record<(typeof SHIPPING_LEVELS)[number], string> = { MAIL: "Standard mail", PRIORITY_MAIL: "Priority mail", GROUND: "Ground", EXPEDITED: "Expedited", EXPRESS: "Express" };

export const addressSchema = z.object({
  name: z.string().trim().min(2).max(80),
  street1: z.string().trim().min(3).max(100),
  street2: z.string().trim().max(100).default(""),
  city: z.string().trim().min(2).max(60),
  state_code: z.string().trim().min(2).max(3),
  postcode: z.string().trim().min(3).max(12),
  country_code: z.string().trim().length(2).default("US"),
  phone_number: z.string().trim().min(7).max(20),
});
export type ShippingAddress = z.infer<typeof addressSchema>;

export type PrintFormat = { key: string; label: string; book_format: "comic" | "story"; cover_type: string; pod_package_id: string; trim_width_in: number; trim_height_in: number; min_pages: number; max_pages: number; page_multiple: number; markup_percent: number; active: boolean };

/** Blank pages added at the end so the page count meets the format's multiple (comics: groups of 4). */
export function paddedPageCount(pages: number, multiple: number) {
  const m = Math.max(1, multiple);
  return Math.ceil(pages / m) * m;
}

export function canPrint(f: Pick<PrintFormat, "min_pages" | "max_pages" | "page_multiple">, pages: number) {
  const padded = paddedPageCount(pages, f.page_multiple);
  return pages >= f.min_pages && padded <= f.max_pages;
}

/** Full price: Lulu print + shipping (+ Lulu tax/fees), plus the markup on the print cost. A free credit removes one copy's print cost and its markup. */
export function priceOrder(input: { printCentsEach: number; quantity: number; shippingCents: number; feesCents: number; markupPercent: number; creditApplied: boolean }) {
  const markupEach = Math.round((input.printCentsEach * input.markupPercent) / 100);
  const bookEach = input.printCentsEach + markupEach;
  const books = bookEach * input.quantity;
  const credit = input.creditApplied ? bookEach : 0;
  const total = Math.max(0, books - credit + input.shippingCents + input.feesCents);
  return { bookEach, books, credit, shipping: input.shippingCents, fees: input.feesCents, total };
}

type Sub = { status: string; price_id: string | null; current_period_start: string | null } | null | undefined;
/** Family Plus annual members get one free book credit per billing year. */
export function freeCreditAvailable(sub: Sub, creditOrdersSince: (since: string) => number) {
  if (!sub || sub.price_id !== "family_plus_yearly" || !["active", "trialing", "past_due"].includes(sub.status)) return false;
  const since = sub.current_period_start ?? "1970-01-01T00:00:00Z";
  return creditOrdersSince(since) === 0;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Waiting for payment", paid: "Paid — preparing files", files_ready: "Checking print files", validating: "Checking print files",
  submitted: "Sent to the printer", in_production: "Being printed", shipped: "Shipped", error: "Needs attention", canceled: "Canceled",
};
