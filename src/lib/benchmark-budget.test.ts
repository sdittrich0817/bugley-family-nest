import { describe, expect, it, vi, afterEach } from "vitest";
import { stageOneBound } from "./benchmark-budget";
import { meteredAi, meteredDraw, setSpendRpcs, testSpendScope, withSpend, type ReserveRpc, type SettleRpc } from "./spend.server";
afterEach(() => setSpendRpcs(null));
describe("non-paid matched Stage 1 rehearsal", () => {
  it("counts six outputs, every safety/likeness check and all twelve possible drawing starts", () => {
    expect(stageOneBound(1)).toEqual({ outputs: 6, safetyChecks: 6, likenessChecks: 6, maxDrawingStarts: 12, safety: 0.7458, likeness: 0.8687, credits: 9.687, usd: 0.8904, total: 10.5774, fits: true });
  });
  it("cannot call the stage affordable without an approved dollar conversion", () => {
    expect(stageOneBound(null)).toMatchObject({ total: null, fits: false });
    expect(stageOneBound(2).fits).toBe(false);
  });
  it("reserves the whole matched set before any stand-in starts and stays below $15", async () => {
    const bound = stageOneBound(1);
    const reserve = vi.fn<ReserveRpc>().mockImplementation(async x => x.credits + x.usd <= 15 ? { ok: true, id: "synthetic" } : { ok: false, reason: "test_session_cap" });
    const settle = vi.fn<SettleRpc>().mockResolvedValue(); setSpendRpcs({ reserve, settle });
    const standIn = vi.fn(async () => "synthetic");
    await testSpendScope("e11-dry-rehearsal", () => withSpend({ kind: "benchmark", draws: true }, bound, async () => {
      for (let i = 0; i < 12; i++) await meteredDraw(bound.usd / 12, standIn);
      for (let i = 0; i < 12; i++) await meteredAi(bound.credits / 12, async () => ({ value: true, inputTokens: 100, outputTokens: 10 }));
    }));
    expect(reserve).toHaveBeenCalledTimes(1);
    expect(standIn).toHaveBeenCalledTimes(12);
    expect(settle).toHaveBeenCalledWith(expect.objectContaining({ status: "settled", drawCalls: 12, aiCalls: 12, usd: 0.8904 }));
  });
  it("refuses an unmatched over-cap set before its stand-in starts", async () => {
    const standIn = vi.fn(); setSpendRpcs({ reserve: async () => ({ ok: false, reason: "test_session_cap" }), settle: async () => {} });
    await expect(testSpendScope("e11-over-cap", () => withSpend({ kind: "benchmark", draws: true }, { credits: 15, usd: 0.01 }, standIn))).rejects.toMatchObject({ reason: "test_session_cap" });
    expect(standIn).not.toHaveBeenCalled();
  });
});