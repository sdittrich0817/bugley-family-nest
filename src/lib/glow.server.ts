// Server-only glow helpers. Balances change only through these privileged database functions.
import type { SupabaseClient } from "@supabase/supabase-js";

export const GLOW_COST = { sketch: 1, picture: 3, picture_upgrade: 2 } as const;
export type GlowKind = keyof typeof GLOW_COST;

async function assertOwnsChild(sb: SupabaseClient<any>, userId: string, childId: string) {
  const { data } = await sb.from("children").select("id").eq("id", childId).eq("parent_id", userId).maybeSingle();
  if (!data) throw new Error("We couldn’t find that player.");
}
async function admin() { return (await import("@/integrations/supabase/client.server")).supabaseAdmin; }

export async function readGlow(sb: SupabaseClient<any>, userId: string, childId: string) {
  await assertOwnsChild(sb, userId, childId);
  const { data, error } = await (await admin()).rpc("glow_status", { _child: childId });
  if (error) throw new Error("We couldn’t read glow right now.");
  return data as { daily: number; bonus: number; total: number; allowance: number };
}

/**
 * Call this from the Studio's image-generation handler BEFORE generating.
 * Deducts the cost atomically, or returns ok:false with reason "not_enough" | "family_limit".
 */
export async function chargeGlow(sb: SupabaseClient<any>, userId: string, childId: string, kind: GlowKind, reason: string) {
  await assertOwnsChild(sb, userId, childId);
  const { data, error } = await (await admin()).rpc("glow_spend", { _child: childId, _kind: kind, _reason: reason });
  if (error) throw new Error("We couldn’t check glow right now.");
  return data as { ok: boolean; reason?: "not_enough" | "family_limit"; cost?: number; total: number };
}

export async function giftGlowServer(sb: SupabaseClient<any>, userId: string, childId: string, amount: number, reason: string) {
  await assertOwnsChild(sb, userId, childId);
  const { data, error } = await (await admin()).rpc("glow_gift", { _child: childId, _amount: amount, _reason: reason });
  if (error) throw new Error("We couldn’t gift glow right now.");
  return data as { total: number };
}
