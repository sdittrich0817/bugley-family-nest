import { afterEach, describe, expect, it } from "vitest";
import { aiCallWorstCredits, drawUsd, drawingWorstCase, spendBlockedReply } from "./spend";
import { SpendBlockedError, meteredAi, meteredDraw, setSpendRpcs, spendScope, testSpendScope, withSpend, type ReserveRpc } from "./spend.server";
import { summarizeSpend } from "./spend.functions";

type Rec = { id: string; credits: number; usd: number; status: string; actual?: { credits: number; usd: number; creditsSource: string; usdSource: string; retries: number; succeeded: boolean }; parentId: string | null; childId: string | null; test: string | null; opKey: string | null };
function fakeDb(opts: { dailyUsd?: number; familyUsd?: number; testCap?: number; pauseDrawing?: boolean; pauseAll?: boolean } = {}) {
  const rows: Rec[] = [];
  const used = (f: (r: Rec) => boolean) => rows.filter(f).reduce((a, r) => ({ c: a.c + (r.status === "settled" ? r.actual?.credits ?? r.credits : r.status === "released" ? 0 : r.credits), u: a.u + (r.status === "settled" ? r.actual?.usd ?? r.usd : r.status === "released" ? 0 : r.usd) }), { c: 0, u: 0 });
  let lock = Promise.resolve();
  const reserve: ReserveRpc = (x) => { const p = lock.then(async () => {
    if (x.opKey && rows.some((r) => r.opKey === x.opKey && r.status === "reserved")) return { ok: false as const, reason: "duplicate" as const };
    if (opts.pauseAll) return { ok: false as const, reason: "paused_all" as const };
    if (x.draws && opts.pauseDrawing) return { ok: false as const, reason: "paused_drawing" as const };
    const all = used(r => r.test === x.test);
    if (!x.test && opts.dailyUsd !== undefined && all.u + x.usd > opts.dailyUsd + 1e-9) return { ok: false as const, reason: "platform_daily_usd" as const };
    if (opts.familyUsd !== undefined && x.parentId && used((r) => r.parentId === x.parentId).u + x.usd > opts.familyUsd + 1e-9) return { ok: false as const, reason: "family_monthly_usd" as const };
    if (x.test && opts.testCap !== undefined && all.u + all.c + x.usd + x.credits > opts.testCap + 1e-9) return { ok: false as const, reason: "test_session_cap" as const };
    const id = `r${rows.length}`; rows.push({ id, credits: x.credits, usd: x.usd, status: "reserved", parentId: x.parentId, childId: x.childId, test: x.test, opKey: x.opKey }); return { ok: true as const, id };
  }); lock = p.then(() => undefined); return p; };
  setSpendRpcs({ reserve, settle: async (x) => { const r = rows.find((y) => y.id === x.id); if (!r || r.status !== "reserved") return; r.status = x.status; r.actual = { credits: x.credits, usd: x.usd, creditsSource: x.creditsSource, usdSource: x.usdSource, retries: x.retries, succeeded: x.succeeded }; } });
  return rows;
}
afterEach(() => setSpendRpcs(null));

describe("cost estimates", () => {
  it("prices drawings from list prices and charges unknown models the top price", () => {
    expect(drawUsd("google/nano-banana-pro")).toBe(0.15);
    expect(drawUsd("google/nano-banana-pro", { resolution: "4K" })).toBe(0.3);
    expect(drawUsd("google/nano-banana")).toBe(0.039);
    expect(drawUsd("someone/new-model")).toBe(0.3);
  });
  it("covers every retry and check for a character panel, above the measured $0.89", () => {
    const w = drawingWorstCase({ model: "google/nano-banana-pro", draws: 3, refs: 4, similarity: true, textChars: 1500 });
    expect(w.usd).toBeCloseTo(0.90); // three candidates, each with at most one transient retry
    expect(w.credits).toBeGreaterThan(3 * (0.259 + 0.41));
  });
  it("reserves more than the measured image safety check (0.259 credits)", () => {
    expect(aiCallWorstCredits(700, 1, false)).toBeGreaterThan(0.259);
  });
  it("never mentions money to children", () => {
    for (const r of ["duplicate", "paused_drawing", "platform_daily_usd", "test_session_cap"] as const) expect(spendBlockedReply(r)).not.toMatch(/\$|dollar|credit|budget|money/i);
  });
});

describe("spending gate", () => {
  it("allows a reservation exactly at the limit and blocks one cent over", async () => {
    const rows = fakeDb({ dailyUsd: 0.30 });
    await withSpend({ kind: "a", draws: true }, { credits: 0, usd: 0.30 }, async () => meteredDraw(0.15, async () => "x"));
    expect(rows[0]?.actual?.usd).toBeCloseTo(0.15);
    await withSpend({ kind: "b", draws: true }, { credits: 0, usd: 0.15 }, () => meteredDraw(0.15, async () => "ok"));
    await expect(withSpend({ kind: "c", draws: true }, { credits: 0, usd: 0.01 }, async () => "never")).rejects.toBeInstanceOf(SpendBlockedError);
  });
  it("lets only as many concurrent requests through as the budget allows", async () => {
    const rows = fakeDb({ dailyUsd: 1 });
    let started = 0;
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => withSpend({ kind: "p", draws: true }, { credits: 0, usd: 0.3 }, async () => { started++; await new Promise((r) => setTimeout(r, 5)); return meteredDraw(0.3, async () => "x"); })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    expect(started).toBe(3);
    expect(rows.filter((r) => r.status === "settled")).toHaveLength(3);
  });
  it("refuses a duplicate of an operation that is still running", async () => {
    fakeDb();
    let release = () => {};
    const first = withSpend({ kind: "p", opKey: "op-1", draws: true }, { credits: 0, usd: 0.3 }, () => new Promise<string>((r) => { release = () => r("done"); }));
    await new Promise((r) => setTimeout(r, 1));
    await expect(withSpend({ kind: "p", opKey: "op-1", draws: true }, { credits: 0, usd: 0.3 }, async () => "dup")).rejects.toMatchObject({ reason: "duplicate" });
    release(); await expect(first).resolves.toBe("done");
  });
  it("never starts a provider call the reservation can't cover", async () => {
    fakeDb();
    let calls = 0;
    await expect(withSpend({ kind: "p", draws: true }, { credits: 0, usd: 0.15 }, async () => { await meteredDraw(0.15, async () => { calls++; }); await meteredDraw(0.15, async () => { calls++; }); })).rejects.toMatchObject({ reason: "reservation_exhausted" });
    expect(calls).toBe(1);
  });
  it("holds parallel calls inside one reservation to its total", async () => {
    fakeDb();
    let calls = 0;
    const out = await withSpend({ kind: "h", draws: true }, { credits: 0, usd: 0.3 }, () => Promise.allSettled([0, 1, 2].map(() => meteredDraw(0.15, async () => { calls++; await new Promise((r) => setTimeout(r, 3)); }))));
    expect(out.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(calls).toBe(2);
  });
  it("records reported AI usage and releases the unused reservation", async () => {
    const rows = fakeDb();
    await withSpend({ kind: "ai" }, { credits: 1, usd: 0 }, () => meteredAi(1, async () => ({ value: 1, inputTokens: 1000, outputTokens: 100 }))).catch(() => {});
    expect(rows[0]?.actual).toMatchObject({ creditsSource: "reported_tokens", succeeded: true });
    expect(rows[0]?.actual?.credits).toBeCloseTo(0.070);
  });
  it("counts a failed or timed-out provider call as fully charged", async () => {
    const rows = fakeDb();
    await expect(withSpend({ kind: "p", draws: true }, { credits: 0.5, usd: 0.3 }, async () => { await meteredAi(0.5, async () => { throw new Error("timeout"); }); })).rejects.toThrow("timeout");
    expect(rows[0]?.actual).toMatchObject({ credits: 0.5, creditsSource: "assumed_worst_case", succeeded: false });
    await expect(withSpend({ kind: "p", draws: true }, { credits: 0, usd: 0.3 }, () => meteredDraw(0.3, async () => { throw new Error("lost"); }))).rejects.toThrow("lost");
    expect(rows[1]?.actual).toMatchObject({ usd: 0.3, usdSource: "assumed_charged" });
  });
  it("releases a reservation when nothing was called", async () => {
    const rows = fakeDb();
    await withSpend({ kind: "p" }, { credits: 1, usd: 1 }, async () => "early exit");
    expect(rows[0]?.status).toBe("released");
  });
  it("counts retries", async () => {
    const rows = fakeDb();
    await withSpend({ kind: "p", draws: true }, { credits: 0, usd: 0.3 }, async () => { await meteredDraw(0.15, async () => 1); await meteredDraw(0.15, async () => 1, true); });
    expect(rows[0]?.actual?.retries).toBe(1);
  });
  it("blocks drawing when paused but still runs text checks", async () => {
    fakeDb({ pauseDrawing: true });
    await expect(withSpend({ kind: "p", draws: true }, { credits: 0, usd: 0.3 }, async () => 1)).rejects.toMatchObject({ reason: "paused_drawing" });
    await expect(withSpend({ kind: "ai_check" }, { credits: 0.3, usd: 0 }, async () => "checked")).resolves.toBe("checked");
  });
  it("applies a family ceiling only to that family", async () => {
    fakeDb({ familyUsd: 0.3 });
    await spendScope({ parentId: "fam-a" }, () => withSpend({ kind: "p", draws: true }, { credits: 0, usd: 0.3 }, async () => meteredDraw(0.3, async () => 1)));
    await expect(spendScope({ parentId: "fam-a" }, () => withSpend({ kind: "p", draws: true }, { credits: 0, usd: 0.1 }, async () => 1))).rejects.toMatchObject({ reason: "family_monthly_usd" });
    await expect(spendScope({ parentId: "fam-b" }, () => withSpend({ kind: "p", draws: true }, { credits: 0, usd: 0.1 }, async () => 1))).resolves.toBe(1);
  });
  it("stops a test session at its cap", async () => {
    fakeDb({ testCap: 0.5 });
    await testSpendScope("stage-1", () => withSpend({ kind: "p", draws: true }, { credits: 0.1, usd: 0.3 }, async () => meteredDraw(0.3, async () => 1)));
    await expect(testSpendScope("stage-1", () => withSpend({ kind: "p", draws: true }, { credits: 0.3, usd: 0.3 }, async () => 1))).rejects.toMatchObject({ reason: "test_session_cap" });
  });
  it("refuses any provider call made outside a reservation", async () => {
    fakeDb();
    await expect(meteredDraw(0.15, async () => 1)).rejects.toThrow("unmetered");
    await expect(meteredAi(0.1, async () => ({ value: 1 }))).rejects.toThrow("unmetered");
  });
  it("fails closed when the gate itself is unavailable", async () => {
    setSpendRpcs({ reserve: async () => ({ ok: false, reason: "gate_unavailable" }), settle: async () => {} });
    let ran = false;
    await expect(withSpend({ kind: "p" }, { credits: 1, usd: 0 }, async () => { ran = true; })).rejects.toBeInstanceOf(SpendBlockedError);
    expect(ran).toBe(false);
  });
});

describe("dashboard summary", () => {
  it("separates reported, assumed, active and blocked amounts", () => {
    const base = { parent_id: "abcdef1234", block_reason: null, credits_source: "reported_tokens", usd_source: "list_price_estimate", retries: 0, draw_calls: 1, test_session: null, created_at: new Date().toISOString() };
    const s = summarizeSpend([
      { ...base, op_kind: "picture_final", status: "settled", reserved_credits: 2, reserved_usd: 0.9, actual_credits: 0.6, actual_usd: 0.15, succeeded: true },
      { ...base, op_kind: "picture_final", status: "reserved", reserved_credits: 2, reserved_usd: 0.9, actual_credits: null, actual_usd: null, succeeded: null },
      { ...base, op_kind: "ai_check", status: "blocked", block_reason: "paused_all", reserved_credits: 0.3, reserved_usd: 0, actual_credits: null, actual_usd: null, succeeded: null },
    ]);
    expect(s.month.c).toBeCloseTo(2.6); expect(s.month.u).toBeCloseTo(1.05);
    expect(s.active).toMatchObject({ count: 1 }); expect(s.blocked).toEqual([{ reason: "paused_all", count: 1 }]);
    expect(s.ops[0]?.perSuccessUsd).toBeCloseTo(1.05);
    expect(s.families[0]?.id).toBe("abcdef12");
  });
});
