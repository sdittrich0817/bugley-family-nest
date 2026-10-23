import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { hasAccess, planForPrice, PRICE_IDS, TRIAL_DAYS } from "@/lib/billing";

const envSchema = z.enum(["sandbox", "live"]);

async function latestSub(sb: any, userId: string, env: StripeEnv) {
  const { data } = await sb.from("subscriptions").select("status,price_id,current_period_end,cancel_at_period_end,stripe_customer_id")
    .eq("user_id", userId).eq("environment", env).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data as null | { status: string; price_id: string; current_period_end: string | null; cancel_at_period_end: boolean | null; stripe_customer_id: string };
}

export async function familyHasAccess(sb: any, userId: string, env: StripeEnv) {
  return hasAccess(await latestSub(sb, userId, env));
}

export const getBillingStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ environment: envSchema }).parse(i))
  .handler(async ({ data, context }) => {
    const sub = await latestSub(context.supabase, context.userId, data.environment);
    return { active: hasAccess(sub), status: sub?.status ?? null, plan: planForPrice(sub?.price_id), priceId: sub?.price_id ?? null, periodEnd: sub?.current_period_end ?? null, cancelAtPeriodEnd: !!sub?.cancel_at_period_end, hasCustomer: !!sub?.stripe_customer_id };
  });

export const billingOptions = (environment: StripeEnv) => queryOptions({ queryKey: ["billing", environment], queryFn: () => getBillingStatus({ data: { environment } }) });

async function resolveOrCreateCustomer(stripe: Stripe, options: { email?: string | undefined; userId: string }) {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
  const hit = found.data[0]; if (hit) return hit.id;
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const c = existing.data[0];
    if (c) {
      if (c.metadata?.["userId"] !== options.userId) await stripe.customers.update(c.id, { metadata: { ...c.metadata, userId: options.userId } });
      return c.id;
    }
  }
  return (await stripe.customers.create({ ...(options.email && { email: options.email }), metadata: { userId: options.userId } })).id;
}

export const createCheckoutSession = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ priceId: z.enum(PRICE_IDS), returnUrl: z.string().url(), environment: envSchema }).parse(i))
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    const existing = await latestSub(context.supabase, context.userId, data.environment);
    if (hasAccess(existing)) return { error: "Your family already has a plan. Use Manage billing to switch plans." };
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      const price = prices.data[0]; if (!price) return { error: "That plan isn’t available right now." };
      const { data: { user } } = await context.supabase.auth.getUser();
      const customer = await resolveOrCreateCustomer(stripe, { email: user?.email ?? undefined, userId: context.userId });
      // A family gets one free trial; returning families start paid.
      const trial = existing ? undefined : TRIAL_DAYS;
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer,
        metadata: { userId: context.userId, managed_payments: "true" },
        subscription_data: { metadata: { userId: context.userId }, ...(trial && { trial_period_days: trial }) },
        managed_payments: { enabled: true },
      } as Stripe.Checkout.SessionCreateParams);
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createPortalSession = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ returnUrl: z.string().url(), environment: envSchema }).parse(i))
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const sub = await latestSub(context.supabase, context.userId, data.environment);
    if (!sub?.stripe_customer_id) return { error: "No plan found yet. Start your free trial first." };
    try {
      const portal = await createStripeClient(data.environment).billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: data.returnUrl });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
