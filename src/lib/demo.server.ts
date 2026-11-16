import type { DemoInput } from "./demo";

/** Per-IP and per-email limits for anonymous co-op demo requests (same counter the feedback form uses). */
export const DEMO_LIMITS = { ip: { limit: 5, seconds: 3600 }, email: { limit: 3, seconds: 86400 } } as const;

type Admin = {
  rpc: (fn: "claim_kid_auth_attempt", args: { _key: string; _limit: number; _seconds: number }) => PromiseLike<{ data: unknown }>;
  from: (t: "demo_requests") => { insert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }> };
};

export type DemoResult = { ok: true } | { ok: false; limited?: true };

export async function submitDemoRequest(a: Admin, ip: string, data: DemoInput): Promise<DemoResult> {
  const email = data.email.trim().toLowerCase();
  const { data: ipOk } = await a.rpc("claim_kid_auth_attempt", { _key: `demo:${ip}`, _limit: DEMO_LIMITS.ip.limit, _seconds: DEMO_LIMITS.ip.seconds });
  if (ipOk === false) return { ok: false, limited: true };
  const { data: emailOk } = await a.rpc("claim_kid_auth_attempt", { _key: `demo-email:${email}`, _limit: DEMO_LIMITS.email.limit, _seconds: DEMO_LIMITS.email.seconds });
  if (emailOk === false) return { ok: false, limited: true };
  const { error } = await a.from("demo_requests").insert({
    leader_name: data.leaderName,
    email,
    group_name: data.groupName,
    city_state: data.cityState,
    families_count: data.familiesCount,
    age_range: data.ageRange,
    notes: data.notes || null,
  });
  if (error) { console.error("demo request insert failed"); return { ok: false }; }
  return { ok: true };
}
