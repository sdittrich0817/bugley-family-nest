// Browser-safe billing rules shared by server functions, pages and tests.
export const PRICE_IDS = ["family_monthly", "family_yearly", "family_plus_monthly", "family_plus_yearly"] as const;
export type PriceId = (typeof PRICE_IDS)[number];
export const TRIAL_DAYS = 14;

export function planForPrice(priceId: string | null | undefined): "family" | "family_plus" | null {
  if (!priceId) return null;
  return priceId.startsWith("family_plus") ? "family_plus" : priceId.startsWith("family") ? "family" : null;
}

export function priceIdFor(plan: "family" | "family_plus", billing: "monthly" | "annual"): PriceId {
  return `${plan}_${billing === "annual" ? "yearly" : "monthly"}` as PriceId;
}

type SubLike = { status: string; current_period_end: string | null } | null | undefined;

/** Kid Zone stays open while trialing, active, or retrying a failed payment; a canceled plan stays open until its paid period ends. */
export function hasAccess(sub: SubLike, now = new Date()): boolean {
  if (!sub) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end) : null;
  const future = !end || end > now;
  if (["trialing", "active", "past_due"].includes(sub.status)) return future;
  if (sub.status === "canceled") return !!end && end > now;
  return false;
}
