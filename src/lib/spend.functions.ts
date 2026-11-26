import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireParentDevice } from "./parent-device.functions";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Only the Bugley admin can do this.");
}

type Row = { op_kind: string; parent_id: string | null; status: string; block_reason: string | null; reserved_credits: number; reserved_usd: number; actual_credits: number | null; actual_usd: number | null; credits_source: string | null; usd_source: string | null; retries: number; draw_calls: number; succeeded: boolean | null; created_at: string; test_session: string | null };
const n = (v: unknown) => Number(v ?? 0);
const used = (r: Row) => r.status === "settled" ? { c: n(r.actual_credits ?? r.reserved_credits), u: n(r.actual_usd ?? r.reserved_usd) } : r.status === "reserved" || r.status === "unknown" ? { c: n(r.reserved_credits), u: n(r.reserved_usd) } : { c: 0, u: 0 };

/** Pure summary used by the dashboard (exported for tests). */
export function summarizeSpend(rows: Row[], now = new Date(), testsOnly = false) {
  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const byOp = new Map<string, { kind: string; count: number; ok: number; credits: number; usd: number; estCredits: number; estUsd: number; retries: number; retryUsd: number }>();
  const byFamily = new Map<string, { credits: number; usd: number; count: number }>();
  const blocked = new Map<string, number>();
  let day = { c: 0, u: 0 }, month = { c: 0, u: 0 }, active = { count: 0, c: 0, u: 0 }, unknown = 0, reportedCredits = 0, assumedCredits = 0;
  for (const r of rows) {
    if (!!r.test_session !== testsOnly) continue;
    if (r.status === "blocked") { blocked.set(r.block_reason ?? "?", (blocked.get(r.block_reason ?? "?") ?? 0) + 1); continue; }
    const x = used(r);
    month.c += x.c; month.u += x.u;
    if (Date.parse(r.created_at) >= dayStart) { day.c += x.c; day.u += x.u; }
    if (r.status === "reserved") { active.count++; active.c += x.c; active.u += x.u; }
    if (r.status === "unknown") unknown++;
    if (r.status === "settled") { if (r.credits_source === "reported_tokens") reportedCredits += x.c; else assumedCredits += x.c; }
    const o = byOp.get(r.op_kind) ?? { kind: r.op_kind, count: 0, ok: 0, credits: 0, usd: 0, estCredits: 0, estUsd: 0, retries: 0, retryUsd: 0 };
    o.count++; if (r.succeeded) o.ok++; o.credits += x.c; o.usd += x.u; o.estCredits += n(r.reserved_credits); o.estUsd += n(r.reserved_usd); o.retries += r.retries;
    if (r.retries && r.draw_calls) o.retryUsd += (x.u / r.draw_calls) * r.retries;
    byOp.set(r.op_kind, o);
    if (r.parent_id) { const f = byFamily.get(r.parent_id) ?? { credits: 0, usd: 0, count: 0 }; f.credits += x.c; f.usd += x.u; f.count++; byFamily.set(r.parent_id, f); }
  }
  return {
    day, month, active, unknown, reportedCredits, assumedCredits,
    ops: [...byOp.values()].map((o) => ({ ...o, perSuccessCredits: o.ok ? o.credits / o.ok : null, perSuccessUsd: o.ok ? o.usd / o.ok : null })).sort((a, b) => b.credits + b.usd - (a.credits + a.usd)),
    families: [...byFamily.entries()].map(([id, f]) => ({ id: id.slice(0, 8), ...f })).sort((a, b) => b.credits + b.usd - (a.credits + a.usd)).slice(0, 20),
    blocked: [...blocked.entries()].map(([reason, count]) => ({ reason, count })),
  };
}

export const getSpendDashboard = createServerFn({ method: "GET" }).middleware([requireParentDevice]).handler(async ({ context }) => {
  await assertAdmin(context);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const [settingsResult, rowsResult, alertsResult, testsResult] = await Promise.all([
    context.supabase.from("ai_spend_settings").select("*").eq("id", 1).maybeSingle(),
    context.supabase.from("ai_spend_ledger").select("op_kind,parent_id,status,block_reason,reserved_credits,reserved_usd,actual_credits,actual_usd,credits_source,usd_source,retries,draw_calls,succeeded,created_at,test_session").gte("created_at", monthStart).order("created_at", { ascending: false }).limit(5000),
    context.supabase.from("ai_spend_alerts").select("kind,period,used,cap,created_at").order("created_at", { ascending: false }).limit(10),
    context.supabase.from("ai_spend_test_sessions").select("key,cap_usd,closed,created_at").order("created_at", { ascending: false }).limit(10),
  ]);
  if ([settingsResult, rowsResult, alertsResult, testsResult].some(r => r.error)) throw new Error("Couldn’t read spending records. Please try again.");
  const { data: settings } = settingsResult, { data: rows } = rowsResult, { data: alerts } = alertsResult, { data: tests } = testsResult;
  return { settings, summary: summarizeSpend((rows ?? []) as Row[], now), testSummary: summarizeSpend((rows ?? []) as Row[], now, true), truncated: (rows ?? []).length >= 5000, alerts: alerts ?? [], tests: tests ?? [] };
});
export const spendDashboardOptions = queryOptions({ queryKey: ["spend-dashboard"], queryFn: () => getSpendDashboard() });

const cap = z.number().min(0).max(100000).nullable();
export const saveSpendSettings = createServerFn({ method: "POST" }).middleware([requireParentDevice])
  .inputValidator((i: unknown) => z.object({ platform_daily_credits: cap, platform_monthly_credits: cap, platform_daily_usd: cap, platform_monthly_usd: cap, family_monthly_credits: cap, family_monthly_usd: cap, per_op_max_credits: cap, per_op_max_usd: cap, alert_ratio: z.number().min(0.1).max(1), pause_all: z.boolean(), pause_drawing: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("ai_spend_settings").update({ ...data, updated_at: new Date().toISOString(), updated_by: context.userId }).eq("id", 1);
    if (error) throw new Error("Couldn’t save spending settings.");
    return { ok: true };
  });
