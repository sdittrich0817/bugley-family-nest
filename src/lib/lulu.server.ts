// Lulu Print API client (sandbox or live, chosen in /admin print settings).
export type LuluEnv = "sandbox" | "live";
const BASE: Record<LuluEnv, string> = { sandbox: "https://api.sandbox.lulu.com", live: "https://api.lulu.com" };

function creds(env: LuluEnv) {
  const p = env === "sandbox" ? "LULU_SANDBOX" : "LULU_LIVE";
  const key = process.env[`${p}_CLIENT_KEY`]; const secret = process.env[`${p}_CLIENT_SECRET`];
  if (!key || !secret) throw new Error(`Printing isn’t connected yet (${env} Lulu keys missing).`);
  return { key, secret };
}
export function luluConfigured(env: LuluEnv) { try { creds(env); return true; } catch { return false; } }

const tokens: Partial<Record<LuluEnv, { token: string; exp: number }>> = {};
async function token(env: LuluEnv) {
  const t = tokens[env]; if (t && t.exp > Date.now() + 30_000) return t.token;
  const { key, secret } = creds(env);
  const res = await fetch(`${BASE[env]}/auth/realms/glasstree/protocol/openid-connect/token`, {
    method: "POST", headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Lulu sign-in failed [${res.status}]: ${await res.text()}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  tokens[env] = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

export async function lulu<T = any>(env: LuluEnv, method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE[env]}${path}`, { method, headers: { Authorization: `Bearer ${await token(env)}`, "Content-Type": "application/json", "Cache-Control": "no-cache" }, ...(body !== undefined && { body: JSON.stringify(body) }) });
  const text = await res.text();
  if (!res.ok) { console.error(`Lulu ${method} ${path} [${res.status}]: ${text}`); throw new Error(`Lulu request failed [${res.status}]: ${text.slice(0, 400)}`); }
  return (text ? JSON.parse(text) : {}) as T;
}

const cents = (v: unknown) => Math.round(Number(v ?? 0) * 100);

/** Lulu's own cost calculation for print, shipping and fees/tax. */
export async function luluCost(env: LuluEnv, input: { podPackageId: string; pageCount: number; quantity: number; address: Record<string, string>; shippingLevel: string }) {
  const r = await lulu(env, "POST", "/print-job-cost-calculations/", {
    line_items: [{ page_count: input.pageCount, pod_package_id: input.podPackageId, quantity: input.quantity }],
    shipping_address: { street1: input.address["street1"], city: input.address["city"], state_code: input.address["state_code"], postcode: input.address["postcode"], country_code: input.address["country_code"], phone_number: input.address["phone_number"] },
    shipping_option: input.shippingLevel,
  });
  const line = r.line_item_costs?.[0] ?? {};
  const printTotal = cents(line.total_cost_excl_tax);
  const shipping = cents(r.shipping_cost?.total_cost_excl_tax);
  const total = cents(r.total_cost_incl_tax);
  return { printCentsEach: Math.round(printTotal / input.quantity), shippingCents: shipping, feesCents: Math.max(0, total - printTotal - shipping), currency: String(r.currency ?? "USD"), raw: r };
}

/** Lulu cover template math: full spread width/height (points) including spine for this page count. */
export async function luluCoverDimensions(env: LuluEnv, podPackageId: string, pageCount: number) {
  const r = await lulu<{ width: string | number; height: string | number }>(env, "POST", "/cover-dimensions/", { pod_package_id: podPackageId, interior_page_count: pageCount, unit: "pt" });
  return { widthPt: Number(r.width), heightPt: Number(r.height) };
}
