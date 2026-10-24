import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireKidOrParentAuth } from "./kid-device-auth";
import { requireParentDevice } from './parent-device.functions';

export const getChildGlow = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth])
  .inputValidator((i: unknown) => z.object({ childId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => (await import("@/lib/glow.server")).readGlow(context.supabase, context.userId, data.childId));

export const giftGlow = createServerFn({ method: "POST" }).middleware([requireParentDevice])
  .inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), amount: z.number().int().min(1).max(20), reason: z.string().trim().max(120) }).parse(i))
  .handler(async ({ data, context }) => (await import("@/lib/glow.server")).giftGlowServer(context.supabase, context.userId, data.childId, data.amount, data.reason));

export const setFamilyTimezone = createServerFn({ method: "POST" }).middleware([requireParentDevice])
  .inputValidator((i: unknown) => z.object({ tz: z.string().min(1).max(64) }).parse(i))
  .handler(async ({ data, context }) => { await context.supabase.rpc("set_family_timezone", { _tz: data.tz }); return { ok: true }; });

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Only the Bugley admin can do this.");
}
export const getGlowAdmin = createServerFn({ method: "GET" }).middleware([requireParentDevice]).handler(async ({ context }) => {
  await assertAdmin(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const [{ data: fams }, { data: spends }, { data: alerts }] = await Promise.all([
    supabaseAdmin.from("family_glow_settings").select("parent_id,plan,timezone,monthly_ceiling,profiles(first_name,last_name)"),
    supabaseAdmin.from("glow_ledger").select("parent_id,amount").eq("kind", "spend").gte("created_at", monthStart.toISOString()),
    context.supabase.from("admin_alerts").select("id,parent_id,message,created_at").eq("resolved", false).order("created_at", { ascending: false }),
  ]);
  const used: Record<string, number> = {};
  for (const s of spends ?? []) used[s.parent_id] = (used[s.parent_id] ?? 0) - s.amount;
  return {
    families: (fams ?? []).map((f: any) => ({ parentId: f.parent_id, name: `${f.profiles?.first_name ?? ""} ${f.profiles?.last_name ?? ""}`.trim() || "Family", plan: f.plan, timezone: f.timezone, ceiling: f.monthly_ceiling as number | null, used: used[f.parent_id] ?? 0 })),
    alerts: alerts ?? [],
  };
});
export const setFamilyGlowSettings = createServerFn({ method: "POST" }).middleware([requireParentDevice])
  .inputValidator((i: unknown) => z.object({ parentId: z.string().uuid(), ceiling: z.number().int().min(0).max(100000).nullable(), plan: z.enum(["family", "family_plus"]) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("family_glow_settings").update({ monthly_ceiling: data.ceiling, plan: data.plan, updated_at: new Date().toISOString() }).eq("parent_id", data.parentId);
    if (error) throw new Error("Couldn’t save.");
    return { ok: true };
  });
export const resolveAlert = createServerFn({ method: "POST" }).middleware([requireParentDevice])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => { await assertAdmin(context); await context.supabase.from("admin_alerts").update({ resolved: true }).eq("id", data.id); return { ok: true }; });
