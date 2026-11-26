import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { aiObject } from "./studio-ai.server";
import { setSpendRpcs, type SettleRpc } from "./spend.server";

function setup() {
  // Every outbound request is replaced before the real SDK is used; no live key or network.
  vi.stubEnv("LOVABLE_API_KEY", "synthetic-non-paid-key");
  // The suite is jsdom by default; this server-only test must not impersonate a browser.
  vi.stubGlobal("window", undefined); vi.stubGlobal("document", undefined);
  const fetchMock = vi.fn<typeof fetch>(); vi.stubGlobal("fetch", fetchMock);
  const settle = vi.fn<SettleRpc>().mockResolvedValue();
  setSpendRpcs({ reserve: async () => ({ ok: true, id: "transport-probe" }), settle });
  return { fetchMock, settle };
}
function sse(events: unknown[]) {
  return new Response(events.map(e => `data: ${JSON.stringify(e)}\n\n`).join(""), { headers: { "Content-Type": "text/event-stream" } });
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); setSpendRpcs(null); });
describe("real Gateway SDK with fake transport", () => {
  it("parses actual SSE completion and settles reported tokens", async () => {
    const { fetchMock, settle } = setup();
    fetchMock.mockResolvedValueOnce(sse([
      { type: "response.output_text.delta", delta: '{"safe":true}' },
      { type: "response.completed", response: { status: "completed", output: [], usage: { input_tokens: 100, output_tokens: 10 } } },
    ]));
    expect(await aiObject(z.object({ safe: z.boolean() }), "Check", "Synthetic")).toEqual({ safe: true });
    expect(settle).toHaveBeenCalledWith(expect.objectContaining({ status: "settled", credits: 0.007 }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([401, 402, 403])("fails closed on HTTP %s with no application resend", async status => {
    const { fetchMock, settle } = setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ status, type: status === 402 ? "payment_required" : "permission_denied", requires: status === 402 ? "top_up" : "admin_action" }), { status, headers: { "Content-Type": "application/json" } }));
    expect(await aiObject(z.object({ safe: z.boolean() }), "Check", "Synthetic")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(settle).toHaveBeenCalledWith(expect.objectContaining({ status: "released", credits: 0, aiCalls: 0 }));
  });
  it("SDK error frame after a delta does not leak an approval or replay inference", async () => {
    const { fetchMock, settle } = setup();
    fetchMock.mockResolvedValueOnce(sse([{ type: "response.output_text.delta", delta: '{"safe":true}' }, { type: "error", error: { message: "Synthetic failure", code: "server_error" } }]));
    expect(await aiObject(z.object({ safe: z.boolean() }), "Check", "Synthetic")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(settle).toHaveBeenCalledWith(expect.objectContaining({ status: "unknown" }));
  });
  it("keeps the hold on a network failure and does not replay it", async () => {
    const { fetchMock, settle } = setup(); fetchMock.mockRejectedValueOnce(new TypeError("Synthetic network failure"));
    expect(await aiObject(z.object({ safe: z.boolean() }), "Check", "Synthetic")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(settle).toHaveBeenCalledWith(expect.objectContaining({ status: "unknown" }));
  });
});