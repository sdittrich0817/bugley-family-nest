import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function db() { return (await import("@/integrations/supabase/client.server")).supabaseAdmin; }

function fields(subscription: any) {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const start = item?.current_period_start ?? subscription.current_period_start;
  const end = item?.current_period_end ?? subscription.current_period_end;
  return {
    product_id: typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id ?? "",
    price_id: priceId,
    status: subscription.status,
    current_period_start: start ? new Date(start * 1000).toISOString() : null,
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    updated_at: new Date().toISOString(),
  };
}

async function upsertSub(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) { console.error("No userId in subscription metadata"); return; }
  const sb = await db();
  await sb.from("subscriptions").upsert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
    environment: env,
    ...fields(subscription),
  }, { onConflict: "stripe_subscription_id" });
}

async function handle(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSub(event.data.object, env); break;
    case "customer.subscription.deleted": {
      const sb = await db();
      await sb.from("subscriptions").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", event.data.object.id).eq("environment", env);
      break;
    }
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderId = session.metadata?.printOrderId;
      if (!orderId || session.payment_status !== "paid") break;
      const sb = await db();
      const { data: o } = await sb.from("print_orders").update({ status: "paid", updated_at: new Date().toISOString() }).eq("id", orderId).eq("stripe_session_id", session.id).eq("status", "awaiting_payment").select("id,request_id").maybeSingle();
      if (o?.request_id) await sb.from("print_requests").update({ status: "ordered" }).eq("id", o.request_id);
      if (o) { const { advanceOrder } = await import("@/lib/print.server"); await advanceOrder(o.id); }
      break;
    }
    default: console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: { handlers: { POST: async ({ request }) => {
    const rawEnv = new URL(request.url).searchParams.get("env");
    if (rawEnv !== "sandbox" && rawEnv !== "live") return Response.json({ received: true, ignored: "invalid env" });
    try { await handle(request, rawEnv); return Response.json({ received: true }); }
    catch (e) { console.error("Webhook error:", e); return new Response("Webhook error", { status: 400 }); }
  } } },
});
