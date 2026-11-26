import { afterEach, expect, it, vi } from "vitest";
import { meteredAi, setSpendRpcs, withSpend, type ReserveRpc } from "./spend.server";
const { handlers } = vi.hoisted(() => ({ handlers: [] as Array<(args: { data: unknown; next: (args: { context: unknown }) => Promise<unknown> }) => Promise<unknown>> }));
vi.mock("@tanstack/react-start", () => ({ createMiddleware: () => ({ inputValidator: () => ({ server: (run: (typeof handlers)[number]) => { handlers.push(run); return {}; } }) }) }));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => new Request("http://localhost/family", { headers: { authorization: "Bearer synthetic-test-token" } }) }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getClaims: async () => ({ data: { claims: { sub: "family-a" } }, error: null }) }, rpc: async () => ({ data: true, error: null }) }) }));
vi.mock("./kid-device.server", () => ({ resolveDevice: async () => null, cookie: () => undefined, admin: async () => ({ rpc: async () => ({ data: true, error: null }) }) }));
import "./kid-device-auth";
afterEach(() => { setSpendRpcs(null); vi.unstubAllEnvs(); });
it("the real family-auth callback scopes every downstream helper without trusting a browser parent/test field", async () => {
  vi.stubEnv("SUPABASE_URL", "https://example.invalid"); vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "synthetic-key");
  const reserve = vi.fn<ReserveRpc>().mockResolvedValue({ ok: true, id: "probe" });
  setSpendRpcs({ reserve, settle: async () => {} });
  const handler = handlers[0]; if (!handler) throw new Error("family middleware missing");
  await handler({ data: { childId: "child-a", parentId: "family-b", test: "closed-test" }, next: async () => withSpend({ kind: "sparks" }, { credits: 1, usd: 0 }, () => meteredAi(1, async () => ({ value: "checked", inputTokens: 100, outputTokens: 10 }))) });
  expect(reserve).toHaveBeenCalledWith(expect.objectContaining({ parentId: "family-a", childId: "child-a", test: null }));
});