import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveOrCreateCustomer } from "./billing.functions";
import { addressSchema, canPrint, freeCreditAvailable, paddedPageCount, priceOrder, SHIPPING_LEVELS, type PrintFormat } from "./print";
import { requireParentDevice } from './parent-device.functions';

const env = z.enum(["sandbox", "live"]);
const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;
async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Admins only");
}
async function formats(): Promise<PrintFormat[]> {
  const { data } = await (await admin()).from("print_formats").select("*").order("key");
  return (data ?? []).map((f: any) => ({ ...f, trim_width_in: Number(f.trim_width_in), trim_height_in: Number(f.trim_height_in), markup_percent: Number(f.markup_percent) }));
}

/** Kid side: asks the parent to print a book that meets the minimum. */
export const requestPrint = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), bookId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { loadBook } = await import("./book.server");
    const { bookPrintPages } = await import("./print.server");
    const book = await loadBook(context.supabase, context.userId, data.childId, data.bookId);
    const pages = bookPrintPages(book);
    if (!(await formats()).some((f) => f.active && f.book_format === book.data.format && canPrint(f, pages))) throw new Error("This book needs a few more pages before it can be printed.");
    const a = await admin();
    const { data: open } = await a.from("print_requests").select("id").eq("book_id", book.id).eq("status", "pending").maybeSingle();
    if (!open) await a.from("print_requests").insert({ parent_id: context.userId, child_id: data.childId, book_id: book.id });
    return { ok: true, already: !!open };
  });

async function creditFor(sb: any, userId: string, environment: "sandbox" | "live") {
  const { data: sub } = await sb.from("subscriptions").select("status,price_id,current_period_start").eq("user_id", userId).eq("environment", environment).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const since = sub?.current_period_start ?? "1970-01-01T00:00:00Z";
  const { count } = await (await admin()).from("print_orders").select("id", { count: "exact", head: true }).eq("parent_id", userId).eq("credit_used", true).eq("environment", environment).neq("status", "awaiting_payment").neq("status", "canceled").gte("created_at", since);
  return freeCreditAvailable(sub, () => count ?? 0);
}

/** Parent Hub: requests (with full books for the flipbook), orders, formats, credit. */
export const listPrints = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ environment: env }).parse(i))
  .handler(async ({ data, context }) => {
    const { loadBook } = await import("./book.server");
    const { bookPrintPages, printSettings } = await import("./print.server");
    const { luluConfigured } = await import("./lulu.server");
    const { data: reqs } = await context.supabase.from("print_requests").select("id,child_id,book_id,created_at").eq("parent_id", context.userId).eq("status", "pending").order("created_at", { ascending: false });
    const requests = [];
    for (const r of reqs ?? []) { try { const book = await loadBook(context.supabase, context.userId, r.child_id, r.book_id); requests.push({ ...r, book, pages: bookPrintPages(book) }); } catch { /* book deleted */ } }
    const { data: orders } = await context.supabase.from("print_orders").select("id,book_id,child_id,format_key,quantity,page_count,total_cents,credit_used,status,status_detail,tracking,shipping_level,created_at").eq("parent_id", context.userId).eq("environment", data.environment).neq("status", "awaiting_payment").order("created_at", { ascending: false });
    const ids = [...new Set((orders ?? []).map((o: any) => o.book_id))];
    const { data: titles } = ids.length ? await context.supabase.from("studio_creations").select("id,title").in("id", ids) : { data: [] };
    const s = await printSettings();
    return { requests, orders: (orders ?? []).map((o: any) => ({ ...o, title: (titles ?? []).find((t: any) => t.id === o.book_id)?.title ?? "Book" })), formats: (await formats()).filter((f) => f.active), credit: await creditFor(context.supabase, context.userId, data.environment), connected: luluConfigured(s.lulu_env), luluEnv: s.lulu_env };
  });

const orderInput = z.object({ requestId: z.string().uuid(), formatKey: z.string().max(40), quantity: z.number().int().min(1).max(20), address: addressSchema, shippingLevel: z.enum(SHIPPING_LEVELS), environment: env });

async function quote(sb: any, userId: string, input: z.infer<typeof orderInput>) {
  const { data: req } = await sb.from("print_requests").select("id,child_id,book_id").eq("id", input.requestId).eq("parent_id", userId).eq("status", "pending").maybeSingle();
  if (!req) throw new Error("That print request isn’t open anymore.");
  const { loadBook } = await import("./book.server");
  const { bookPrintPages, loadFormat, printSettings } = await import("./print.server");
  const book = await loadBook(sb, userId, req.child_id, req.book_id);
  const fmt = await loadFormat(input.formatKey);
  if (!fmt.active || fmt.book_format !== book.data.format) throw new Error("Pick a format that fits this book.");
  const pages = bookPrintPages(book);
  if (!canPrint(fmt, pages)) throw new Error(`This format needs ${fmt.min_pages}–${fmt.max_pages} pages.`);
  const pageCount = paddedPageCount(pages, fmt.page_multiple);
  const s = await printSettings();
  const { luluCost } = await import("./lulu.server");
  const cost = await luluCost(s.lulu_env, { podPackageId: fmt.pod_package_id, pageCount, quantity: input.quantity, address: input.address as Record<string, string>, shippingLevel: input.shippingLevel });
  const credit = await creditFor(sb, userId, input.environment);
  const price = priceOrder({ ...cost, quantity: input.quantity, markupPercent: fmt.markup_percent, creditApplied: credit });
  return { req, book, fmt, pageCount, cost, credit, price, luluEnv: s.lulu_env };
}

export const quotePrint = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => orderInput.parse(i))
  .handler(async ({ data, context }): Promise<{ error: string } | { pageCount: number; credit: boolean; price: ReturnType<typeof priceOrder>; currency: string }> => {
    try { const q = await quote(context.supabase, context.userId, data); return { pageCount: q.pageCount, credit: q.credit, price: q.price, currency: q.cost.currency }; }
    catch (e) { return { error: e instanceof Error ? e.message : "We couldn’t get a price right now." }; }
  });

export const startPrintCheckout = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => orderInput.extend({ returnUrl: z.string().url() }).parse(i))
  .handler(async ({ data, context }): Promise<{ clientSecret: string; orderId: string } | { error: string }> => {
    try {
      const q = await quote(context.supabase, context.userId, data);
      const a = await admin();
      const { data: order, error } = await a.from("print_orders").insert({
        parent_id: context.userId, request_id: q.req.id, book_id: q.book.id, child_id: q.req.child_id, format_key: q.fmt.key, quantity: data.quantity, page_count: q.pageCount,
        shipping_address: data.address, shipping_level: data.shippingLevel, quote: { ...q.price, currency: q.cost.currency }, total_cents: q.price.total, credit_used: q.credit, environment: data.environment, lulu_env: q.luluEnv,
      }).select("id").single();
      if (error || !order) return { error: "We couldn’t start that order." };
      const { createStripeClient } = await import("./stripe.server");
      const stripe = createStripeClient(data.environment);
      const { data: { user } } = await context.supabase.auth.getUser();
      const customer = await resolveOrCreateCustomer(stripe, { email: user?.email ?? undefined, userId: context.userId });
      const description = `Printed book: ${q.book.title} (${q.fmt.label}) x${data.quantity}`;
      const session = await stripe.checkout.sessions.create({
        mode: "payment", ui_mode: "embedded_page", return_url: data.returnUrl.replace("ORDER_ID", order.id), customer,
        line_items: [{ quantity: 1, price_data: { currency: q.cost.currency.toLowerCase(), unit_amount: q.price.total, product_data: { name: description } } }],
        payment_intent_data: { description },
        metadata: { userId: context.userId, printOrderId: order.id },
      } as Stripe.Checkout.SessionCreateParams);
      await a.from("print_orders").update({ stripe_session_id: session.id }).eq("id", order.id);
      return { clientSecret: session.client_secret ?? "", orderId: order.id };
    } catch (e) {
      const { getStripeErrorMessage } = await import("./stripe.server");
      return { error: e instanceof Error && !("type" in e) ? e.message : getStripeErrorMessage(e) };
    }
  });

export const dismissPrintRequest = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await (await admin()).from("print_requests").update({ status: "dismissed" }).eq("id", data.id).eq("parent_id", context.userId).eq("status", "pending");
    return { ok: true };
  });

/** Checks on an order with the printer and moves it forward. */
export const refreshPrintOrder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: o } = await context.supabase.from("print_orders").select("id,status").eq("id", data.id).eq("parent_id", context.userId).maybeSingle();
    if (!o) throw new Error("Order not found");
    const { advanceOrder } = await import("./print.server");
    await advanceOrder(o.id);
    return { ok: true };
  });

// ---- Admin ----
export const getPrintAdmin = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context);
  const a = await admin();
  const { printSettings } = await import("./print.server");
  const { luluConfigured } = await import("./lulu.server");
  const { data: orders } = await a.from("print_orders").select("id,status,status_detail,format_key,quantity,total_cents,lulu_env,lulu_job_id,created_at").neq("status", "awaiting_payment").order("created_at", { ascending: false }).limit(50);
  return { formats: await formats(), settings: await printSettings(), orders: orders ?? [], connected: { sandbox: luluConfigured("sandbox"), live: luluConfigured("live") } };
});

export const savePrintFormat = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ key: z.string(), label: z.string().min(2).max(60), pod_package_id: z.string().regex(/^[0-9A-Z]{27}$/, "Lulu product codes are 27 letters/numbers"), trim_width_in: z.number().min(2).max(20), trim_height_in: z.number().min(2).max(20), min_pages: z.number().int().min(2), max_pages: z.number().int().min(2), page_multiple: z.number().int().min(1).max(8), markup_percent: z.number().min(0).max(300), active: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { key, ...rest } = data;
    const { error } = await context.supabase.from("print_formats").update({ ...rest, updated_at: new Date().toISOString() }).eq("key", key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const savePrintSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ lulu_env: z.enum(["sandbox", "live"]), brand_name: z.string().min(1).max(40), contact_email: z.string().email().or(z.literal("")) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("print_settings").update({ ...data, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const retryPrintOrder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const a = await admin();
    const { data: o } = await a.from("print_orders").select("status,lulu_job_id").eq("id", data.id).maybeSingle();
    if (o?.status === "error") await a.from("print_orders").update({ status: o.lulu_job_id ? "submitted" : "paid", status_detail: null }).eq("id", data.id);
    const { advanceOrder } = await import("./print.server");
    await advanceOrder(data.id);
    return { ok: true };
  });
