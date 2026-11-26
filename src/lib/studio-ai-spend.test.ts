import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { setSpendRpcs, withSpend } from "./spend.server";
import { OUTPUT_TOKENS_MAX } from "./spend";
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@lovable.dev/ai-gateway", () => ({ streamResponse: request }));
import { aiObject } from "./studio-ai.server";
function completion(value: unknown) {
  return (async function* () {
    yield { type: "response.output_text.delta", delta: JSON.stringify(value) };
    yield { type: "response.completed", response: { usage: { input_tokens: 100, output_tokens: 10 } } };
  })();
}
afterEach(() => { request.mockReset(); setSpendRpcs(null); });
describe("AI spending preserves safety", () => {
  it("a refused budget never starts a provider or returns unchecked text", async () => {
    setSpendRpcs({ reserve: async () => ({ ok: false, reason: "platform_daily_credits" }), settle: async () => {} });
    expect(await aiObject(z.object({ reply: z.string() }), "Coach", "Adult synthetic sentence")).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
  it("keeps the existing model, full-detail images and explicit reasoning/output bound", async () => {
    request.mockResolvedValueOnce(completion({ safe: true }));
    expect(await aiObject(z.object({ safe: z.boolean() }), "Check", "Synthetic", "https://example.com/synthetic.png")).toEqual({ safe: true });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ model: "openai/gpt-6-astra", max_output_tokens: OUTPUT_TOKENS_MAX, reasoning: { effort: "low", summary: "auto" }, text: expect.objectContaining({ format: expect.objectContaining({ type: "json_schema", strict: true }) }) }));
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("rejects child-facing output if its safety check rejects it", async () => {
    request.mockResolvedValueOnce(completion({ reply: "synthetic reply" })).mockResolvedValueOnce(completion({ safe: false }));
    expect(await aiObject(z.object({ reply: z.string() }), "Coach", "Synthetic")).toBeNull();
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("does not expose the first output if reservation room runs out before its check", async () => {
    request.mockResolvedValueOnce(completion({ reply: "synthetic reply" }));
    const out = await withSpend({ kind: "helper" }, { credits: 0.4, usd: 0 }, () => aiObject(z.object({ reply: z.string() }), "Coach", "Synthetic"));
    expect(out).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("returns no content from interrupted or malformed completions", async () => {
    request.mockResolvedValueOnce((async function* () { yield { type: "response.output_text.delta", delta: '{"reply":"partial' }; })());
    expect(await aiObject(z.object({ reply: z.string() }), "Coach", "Synthetic")).toBeNull();
  });
});