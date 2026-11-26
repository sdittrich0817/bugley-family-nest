import { afterEach, describe, expect, it, vi } from "vitest";
import { Buffer } from "node:buffer";
import { encode } from "fast-png";
import { runStageOne, STAGE_ONE_MODELS, type StageOneAdapter } from "./benchmark-runner.server";
import { DRAWING_VERSIONS } from "./price-review";
import { drawUsd } from "./spend";
import { setSpendRpcs, type ReserveRpc, type SettleRpc } from "./spend.server";
const now = Date.parse("2026-11-26T19:40:00Z");
const image = (size = 1) => `data:image/png;base64,${Buffer.from(encode({ width: size, height: size, data: new Uint8Array(size * size * 4), channels: 4 })).toString("base64")}`;
async function setup() {
  const dataUrl = image();
  const sha256 = Buffer.from(await crypto.subtle.digest("SHA-256", Buffer.from(dataUrl.split(",")[1] ?? "", "base64"))).toString("hex");
  const input = {
    approval: { founderApprovalId: "MOCK-ONLY-no-paid-authorization", sessionKey: "e11-synthetic-mock" },
    evidence: { reviewedAt: new Date(now).toISOString(), inputCreditsPerToken: 0.00005, outputCreditsPerToken: 0.0002, models: STAGE_ONE_MODELS.map(m => ({ model: m.model, version: DRAWING_VERSIONS[m.model] ?? "", usd: drawUsd(m.model, m.settings) })) },
    references: [0, 1].map(() => ({ dataUrl, sha256, provenance: "adult-synthetic" as const })),
  };
  const adapter = {
    draw: vi.fn<StageOneAdapter["draw"]>().mockResolvedValue(dataUrl),
    safety: vi.fn<StageOneAdapter["safety"]>().mockResolvedValue({ value: { safe: true, has_text: false }, inputTokens: 100, outputTokens: 10 }),
    likeness: vi.fn<StageOneAdapter["likeness"]>().mockResolvedValue({ value: { pass: true, score: 90, issues: "" }, inputTokens: 100, outputTokens: 10 }),
    record: vi.fn<StageOneAdapter["record"]>().mockResolvedValue(),
  };
  const reserve = vi.fn<ReserveRpc>().mockResolvedValue({ ok: true, id: "mock-reservation" });
  const settle = vi.fn<SettleRpc>().mockResolvedValue();
  setSpendRpcs({ reserve, settle });
  return { input, adapter, reserve, settle };
}
afterEach(() => setSpendRpcs(null));
describe("bounded Stage 1 runner with no network/provider adapters", () => {
  it("runs the identical two cases on exactly the three approved models with isolated upfront bounds", async () => {
    const { input, adapter, reserve, settle } = await setup();
    const output = await runStageOne(input, adapter, now);
    expect(output.results).toHaveLength(6);
    expect(reserve).toHaveBeenCalledWith(expect.objectContaining({ credits: 9.687, usd: 0.8904, parentId: null, childId: null, test: "e11-synthetic-mock" }));
    expect(adapter.draw).toHaveBeenCalledTimes(6); expect(adapter.safety).toHaveBeenCalledTimes(6); expect(adapter.likeness).toHaveBeenCalledTimes(6);
    const jobs = adapter.draw.mock.calls.map(([job]) => job);
    expect(jobs.slice(0, 3).every(job => job.prompt === jobs[0]?.prompt)).toBe(true);
    expect(jobs.slice(3).every(job => job.prompt === jobs[3]?.prompt)).toBe(true);
    expect(jobs.every(job => job.version === DRAWING_VERSIONS[job.model])).toBe(true);
    expect(adapter.record.mock.calls.filter(([row]) => row.status === "checked-safe")).toHaveLength(6);
    expect(settle).toHaveBeenCalledWith(expect.objectContaining({ status: "settled", drawCalls: 6, aiCalls: 12, usd: 0.4452 }));
  });
  it("refuses missing founder approval before any stand-in or reservation", async () => {
    const { input, adapter, reserve } = await setup();
    await expect(runStageOne({ ...input, approval: null }, adapter, now)).rejects.toThrow("founder");
    expect(adapter.draw).not.toHaveBeenCalled(); expect(reserve).not.toHaveBeenCalled();
  });
  it.each(["price", "version", "stale", "credits"])("refuses %s evidence drift before starting", async failure => {
    const { input, adapter, reserve } = await setup();
    if (failure === "stale") input.evidence.reviewedAt = "2026-11-24T00:00:00Z";
    if (failure === "credits") input.evidence.inputCreditsPerToken = 1;
    const first = input.evidence.models[0];
    if (!first) throw new Error("Missing fixture");
    if (failure === "price") first.usd = 1;
    if (failure === "version") first.version = "changed";
    await expect(runStageOne(input, adapter, now)).rejects.toThrow();
    expect(reserve).not.toHaveBeenCalled(); expect(adapter.draw).not.toHaveBeenCalled();
  });
  it("refuses altered reference bytes before reservation", async () => {
    const { input, adapter, reserve } = await setup(); const first = input.references[0];
    if (!first) throw new Error("Missing fixture"); first.sha256 = "0".repeat(64);
    await expect(runStageOne(input, adapter, now)).rejects.toThrow("hash"); expect(reserve).not.toHaveBeenCalled();
  });
  it("refuses an over-cap database reservation before the first drawing", async () => {
    const { input, adapter } = await setup(); setSpendRpcs({ reserve: async () => ({ ok: false, reason: "test_session_cap" }), settle: async () => {} });
    await expect(runStageOne(input, adapter, now)).rejects.toMatchObject({ reason: "test_session_cap" }); expect(adapter.draw).not.toHaveBeenCalled();
  });
  it("stops on unknown drawing outcomes with no automatic replay and retains the hold", async () => {
    const { input, adapter, settle } = await setup(); adapter.draw.mockRejectedValue(new Error("unknown provider outcome"));
    await expect(runStageOne(input, adapter, now)).rejects.toThrow("unknown");
    expect(adapter.draw).toHaveBeenCalledTimes(1); expect(adapter.safety).not.toHaveBeenCalled(); expect(settle).toHaveBeenCalledWith(expect.objectContaining({ status: "unknown", usd: 0.15 }));
  });
  it("records unsafe output as a failure without showing it or running likeness/redraw", async () => {
    const { input, adapter } = await setup(); adapter.safety.mockResolvedValue({ value: { safe: false, has_text: false }, inputTokens: 100, outputTokens: 10 });
    const result = await runStageOne(input, adapter, now);
    expect(result.results.every(row => !row.passed && !row.safe)).toBe(true); expect(adapter.draw).toHaveBeenCalledTimes(6); expect(adapter.likeness).not.toHaveBeenCalled();
  });
  it("stops oversized output before either full-detail check without resizing", async () => {
    const { input, adapter } = await setup(); adapter.draw.mockResolvedValue(image(2049));
    await expect(runStageOne(input, adapter, now)).rejects.toThrow("dimensions"); expect(adapter.safety).not.toHaveBeenCalled();
  });
  it("stops unavailable safety verdicts without retrying or returning approved content", async () => {
    const { input, adapter } = await setup(); adapter.safety.mockResolvedValue({ value: null });
    await expect(runStageOne(input, adapter, now)).rejects.toThrow("Safety"); expect(adapter.draw).toHaveBeenCalledTimes(1); expect(adapter.likeness).not.toHaveBeenCalled();
    expect(adapter.record).toHaveBeenCalledWith(expect.objectContaining({ status: "quarantined", scenario: "solo-absence" }));
  });
});