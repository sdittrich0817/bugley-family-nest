// Server-only print order pipeline: paid -> files built -> Lulu validation -> Lulu print job -> tracking.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PrintFormat } from "./print";
import { lulu, luluCoverDimensions, type LuluEnv } from "./lulu.server";

type Sb = SupabaseClient<any>;
const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;
const BUCKET = "print-files";

export async function printSettings(): Promise<{ lulu_env: LuluEnv; brand_name: string; contact_email: string }> {
  const { data } = await (await admin()).from("print_settings").select("lulu_env,brand_name,contact_email").eq("id", 1).maybeSingle();
  return (data as any) ?? { lulu_env: "sandbox", brand_name: "Bugley", contact_email: "" };
}
export async function loadFormat(key: string): Promise<PrintFormat> {
  const { data } = await (await admin()).from("print_formats").select("*").eq("key", key).maybeSingle();
  if (!data) throw new Error("That print format isn’t available.");
  return { ...(data as any), trim_width_in: Number(data.trim_width_in), trim_height_in: Number(data.trim_height_in), markup_percent: Number(data.markup_percent) };
}

/** Pages Lulu will print, before padding: title, optional dedication, every chapter page, "The End". */
export function bookPrintPages(book: { data: { dedication: string }; chapters: ({ kind: "story"; story: { data: { pages: unknown[] } } } | { kind: "comic"; comic: { data: { pages: unknown[] } } })[] }) {
  return book.chapters.reduce((n, c) => n + (c.kind === "story" ? c.story.data.pages.length : c.comic.data.pages.length), 0) + 2 + (book.data.dedication.trim() ? 1 : 0);
}

async function update(id: string, patch: Record<string, unknown>) {
  await (await admin()).from("print_orders").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
}
async function signed(path: string) {
  const { data, error } = await (await admin()).storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 30);
  if (error || !data) throw new Error("Couldn’t share the print file with the printer.");
  return data.signedUrl;
}

const LULU_STATUS: Record<string, string> = { CREATED: "submitted", UNPAID: "submitted", PAYMENT_IN_PROGRESS: "submitted", PRODUCTION_DELAYED: "submitted", PRODUCTION_READY: "in_production", IN_PRODUCTION: "in_production", SHIPPED: "shipped", REJECTED: "error", CANCELED: "canceled", ERROR: "error" };

/** Moves an order forward as far as it can right now. Safe to call repeatedly. */
export async function advanceOrder(orderId: string): Promise<void> {
  const a = await admin();
  const { data: o } = await a.from("print_orders").select("*").eq("id", orderId).maybeSingle();
  if (!o) return;
  const env = o.lulu_env as LuluEnv;
  try {
    if (o.status === "paid") {
      const fmt = await loadFormat(o.format_key);
      const { loadBook } = await import("./book.server");
      const book = await loadBook(a as Sb, o.parent_id, o.child_id, o.book_id);
      const { data: child } = await a.from("children").select("nickname").eq("id", o.child_id).maybeSingle();
      const nick = child?.nickname ?? "";
      const { buildInterior, buildCover } = await import("./print-pdf.server");
      const interior = await buildInterior(book, nick, fmt);
      const dims = await luluCoverDimensions(env, fmt.pod_package_id, interior.pageCount);
      const cover = await buildCover(book, nick, fmt, dims);
      const base = `${o.parent_id}/${o.id}`;
      for (const [name, bytes] of [["interior.pdf", interior.bytes], ["cover.pdf", cover.bytes]] as const) {
        const { error } = await a.storage.from(BUCKET).upload(`${base}/${name}`, bytes, { contentType: "application/pdf", upsert: true });
        if (error) throw new Error(`Couldn’t save the print file: ${error.message}`);
      }
      const iv = await lulu(env, "POST", "/validate-interior/", { source_url: await signed(`${base}/interior.pdf`), pod_package_id: fmt.pod_package_id });
      const cv = await lulu(env, "POST", "/validate-cover/", { source_url: await signed(`${base}/cover.pdf`), pod_package_id: fmt.pod_package_id, interior_page_count: interior.pageCount });
      const low = interior.lowRes + cover.lowRes;
      await update(o.id, { status: "validating", page_count: interior.pageCount, interior_path: `${base}/interior.pdf`, cover_path: `${base}/cover.pdf`, interior_validation_id: String(iv.id), cover_validation_id: String(cv.id), status_detail: low ? `${low} picture(s) are below 300 DPI at print size and may look soft.` : null });
      return;
    }
    if (o.status === "validating") {
      const iv = await lulu(env, "GET", `/validate-interior/${o.interior_validation_id}/`);
      const cv = await lulu(env, "GET", `/validate-cover/${o.cover_validation_id}/`);
      const bad = [iv, cv].find((v: any) => v.status === "ERROR");
      if (bad) { await update(o.id, { status: "error", status_detail: `Printer check failed: ${JSON.stringify((bad as any).errors ?? bad).slice(0, 500)}` }); return; }
      const ok = (v: any) => ["VALIDATED", "NORMALIZED"].includes(v.status);
      if (!ok(iv) || !ok(cv)) return; // still checking
      const fmt = await loadFormat(o.format_key);
      const s = await printSettings();
      const { data: book } = await a.from("studio_creations").select("title").eq("id", o.book_id).maybeSingle();
      const { data: user } = await a.auth.admin.getUserById(o.parent_id);
      const addr = o.shipping_address as Record<string, string>;
      const job = await lulu(env, "POST", "/print-jobs/", {
        contact_email: s.contact_email || user.user?.email,
        external_id: o.id,
        line_items: [{ external_id: o.book_id, title: (book?.title ?? "Bugley book").slice(0, 120), quantity: o.quantity, printable_normalization: { pod_package_id: fmt.pod_package_id, cover: { source_url: await signed(o.cover_path as string) }, interior: { source_url: await signed(o.interior_path as string) } } }],
        shipping_address: { ...addr, email: user.user?.email },
        shipping_level: o.shipping_level,
      });
      await update(o.id, { status: "submitted", lulu_job_id: String(job.id) });
      return;
    }
    if (["submitted", "in_production"].includes(o.status) && o.lulu_job_id) {
      const job = await lulu(env, "GET", `/print-jobs/${o.lulu_job_id}/`);
      const name = String(job.status?.name ?? "");
      const tracking = (job.line_items ?? []).flatMap((li: any) => (li.tracking_urls ?? []).map((url: string) => ({ url, id: li.tracking_id ?? null, carrier: li.carrier_name ?? null })));
      await update(o.id, { status: LULU_STATUS[name] ?? o.status, tracking, ...(name === "REJECTED" && { status_detail: String(job.status?.message ?? "The printer rejected this job.") }) });
    }
  } catch (e) {
    console.error("print advance failed", orderId, e);
    await update(o.id, { status: "error", status_detail: e instanceof Error ? e.message.slice(0, 500) : "Something went wrong preparing the book." });
  }
}
