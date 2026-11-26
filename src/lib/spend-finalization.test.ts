import { afterEach, describe, expect, it, vi } from "vitest";
import { aiCallCredits, aiCallWorstCredits, drawingWorstCase } from "./spend";
import { meteredAi, meteredDraw, setSpendRpcs, spendScope, testSpendScope, withSpend, type ReserveRpc, type SettleRpc } from "./spend.server";
import { summarizeSpend } from "./spend.functions";

function capture() {
  const reserve = vi.fn<ReserveRpc>().mockImplementation(async () => ({ ok: true, id: crypto.randomUUID() }));
  const settle = vi.fn<SettleRpc>().mockResolvedValue();
  setSpendRpcs({ reserve, settle });
  return { reserve, settle };
}
afterEach(() => setSpendRpcs(null));

describe("E1.1 finalization", () => {
  it.each(["sparks", "coaching", "story_helper", "play_guess", "play_doodle"])("attributes %s and its nested checks to the family", async kind => {
    const { reserve } = capture();
    await spendScope({ parentId: "family-a", childId: "child-a" }, () => withSpend({ kind }, { credits: 1, usd: 0 }, () => meteredAi(1, async () => ({ value: "checked", inputTokens: 100, outputTokens: 10 }))));
    expect(reserve).toHaveBeenCalledWith(expect.objectContaining({ parentId: "family-a", childId: "child-a", test: null, kind }));
  });
  it("leaves genuine platform admin operations without family attribution", async () => {
    const { reserve } = capture();
    await withSpend({ kind: "curriculum_admin" }, { credits: 1, usd: 0 }, async () => "no call");
    expect(reserve).toHaveBeenCalledWith(expect.objectContaining({ parentId: null, childId: null, test: null }));
  });
  it("ignores a global test-session environment variable for family activity", async () => {
    vi.stubEnv("AI_SPEND_TEST_SESSION", "closed-test");
    try {
      const { reserve } = capture();
      await spendScope({ parentId: "family-a" }, () => withSpend({ kind: "sparks" }, { credits: 1, usd: 0 }, async () => "safe"));
      expect(reserve).toHaveBeenCalledWith(expect.objectContaining({ test: null, parentId: "family-a" }));
    } finally { vi.unstubAllEnvs(); }
  });
  it("attributes synthetic requests only to their explicit test session", async () => {
    const { reserve } = capture();
    await testSpendScope("e11-screening", () => withSpend({ kind: "benchmark" }, { credits: 1, usd: 1 }, async () => "safe"));
    expect(reserve).toHaveBeenCalledWith(expect.objectContaining({ test: "e11-screening", parentId: null, childId: null }));
  });
  it("rejects test-to-family entitlements before the family callback runs", async () => {
    capture(); const chargeGlow = vi.fn();
    await expect(testSpendScope("e11-screening", () => spendScope({ parentId: "family-a" }, async () => chargeGlow()))).rejects.toThrow("family entitlements");
    expect(chargeGlow).not.toHaveBeenCalled();
  });
  it("rejects a family drawing nested inside a reserved synthetic operation", async () => {
    capture(); const draw = vi.fn();
    await expect(testSpendScope("e11-screening", () => withSpend({ kind: "benchmark" }, { credits: 1, usd: 1 }, () => withSpend({ kind: "panel", parentId: "family-a", draws: true }, { credits: 1, usd: 1 }, async () => draw())))).rejects.toThrow("family entitlements");
    expect(draw).not.toHaveBeenCalled();
  });
  it("cannot redirect a family request into a test pool", async () => {
    capture();
    await expect(spendScope({ parentId: "family-a" }, () => testSpendScope("e11-screening", async () => "never"))).rejects.toThrow("isolated");
  });
  it("retains unknown provider outcomes instead of releasing them", async () => {
    const { settle } = capture();
    await expect(spendScope({ parentId: "family-a" }, () => withSpend({ kind: "panel", draws: true }, { credits: 1, usd: 1 }, () => meteredDraw(0.15, async () => { throw new Error("unknown outcome"); })))).rejects.toThrow("unknown outcome");
    expect(settle).toHaveBeenCalledWith(expect.objectContaining({ status: "unknown", usd: 0.15 }));
  });
  it("retains a hold when an AI completion has no reported usage", async () => {
    const { settle } = capture();
    await withSpend({ kind: "check" }, { credits: 1, usd: 0 }, () => meteredAi(0.5, async () => ({ value: "checked" })));
    expect(settle).toHaveBeenCalledWith(expect.objectContaining({ status: "unknown", credits: 0.5 }));
  });
  it("uses cache-write input pricing and the catalog output rate", () => {
    expect(aiCallCredits(1000, 100)).toBe(0.07);
    expect(aiCallCredits(300000, 1000)).toBe(30.3);
  });
  it("reserves checks per candidate, not per failed provider transport attempt", () => {
    const w = drawingWorstCase({ model: "google/nano-banana-pro", draws: 3, refs: 2, similarity: true, textChars: 600 });
    expect(w.usd).toBe(0.9);
    expect(w.credits).toBeCloseTo(3 * (aiCallWorstCredits(1500, 1, false) + aiCallWorstCredits(3100, 3, false)));
  });
  it("does not reserve another output moderation check for verdicts", () => {
    const verdict = aiCallWorstCredits(1500, 1, false);
    expect(aiCallWorstCredits(1500, 1, true)).toBeGreaterThan(verdict);
  });
  it("excludes test holds from production dashboard budget use and family totals", () => {
    const r = { op_kind: "benchmark", parent_id: null, status: "unknown", block_reason: null, reserved_credits: 7, reserved_usd: 3, actual_credits: null, actual_usd: null, credits_source: null, usd_source: null, retries: 0, draw_calls: 1, succeeded: null, created_at: new Date().toISOString(), test_session: "e11-screening" };
    expect(summarizeSpend([r]).month).toEqual({ c: 0, u: 0 });
    expect(summarizeSpend([r]).families).toEqual([]);
    expect(summarizeSpend([r], new Date(), true).month).toEqual({ c: 7, u: 3 });
  });
  it.each([15, 25, 35])("refuses a proposed $%s stage envelope one cent above its cap before calls", async cap => {
    const reserve = vi.fn<ReserveRpc>().mockImplementation(async x => x.credits + x.usd > cap ? { ok: false, reason: "test_session_cap" } : { ok: true, id: "stage" });
    setSpendRpcs({ reserve, settle: async () => {} }); const provider = vi.fn();
    await expect(testSpendScope("stage-cap", () => withSpend({ kind: "benchmark" }, { credits: cap, usd: 0.01 }, async () => provider()))).rejects.toMatchObject({ reason: "test_session_cap" });
    expect(provider).not.toHaveBeenCalled();
  });
  it("counts one nested output check in its enclosing operation rather than another reservation", async () => {
    const { reserve, settle } = capture();
    await withSpend({ kind: "helper" }, { credits: 2, usd: 0 }, async () => {
      await meteredAi(1, async () => ({ value: "draft", inputTokens: 1000, outputTokens: 100 }));
      await withSpend({ kind: "output_check" }, { credits: 1, usd: 0 }, () => meteredAi(1, async () => ({ value: true, inputTokens: 1000, outputTokens: 100 })));
    });
    expect(reserve).toHaveBeenCalledTimes(1);
    expect(settle).toHaveBeenCalledWith(expect.objectContaining({ aiCalls: 2, credits: 0.14 }));
  });
});