// Reviewed list-rate contract, not a promise about future provider invoices.
export const PRICE_REVIEWED_AT = "2026-11-26T19:11:00Z";
export const PRICE_REVIEW_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const DRAWING_VERSIONS: Readonly<Record<string, string>> = {
  "google/nano-banana-pro": "a378332ef93328c4c704074d4aa7a051ab133b34eec1f0e60995fdf47243837b",
  "google/nano-banana": "2f341bb7cc31b5a041ef3625984c7485f4d1d75174258f388813d045399589be",
  "google/nano-banana-2.1": "061ca4b8aed9fa2a8e1bd92ff55fb4794bd32176d39bad70cc4cfb51d9491f56",
  "bytedance/seedream-4": "cf7d431991436f19d1c8dad83fe463c729c816d7a21056c5105e75c84a0aa7e9",
};

/** Fail before reservations/Glow if a list-price review has expired. Never switch models. */
export function assertPriceReview(now = Date.now()) {
  const age = now - Date.parse(PRICE_REVIEWED_AT);
  if (!Number.isFinite(age) || age < 0 || age >= PRICE_REVIEW_MAX_AGE_MS) throw new Error("Drawing prices need a fresh review before spending.");
}