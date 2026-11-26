import { describe, expect, it, vi, afterEach } from "vitest";
import { aiCallWorstCredits, drawUsd, TOKENS_PER_IMAGE } from "./spend";
import { meteredAi, setSpendRpcs, withSpend } from "./spend.server";
import { replicateRun } from "./images.server";
afterEach(() => setSpendRpcs(null));
describe("reviewed provider cost contracts", () => {
  it("reserves Astra's maximum 30,000 accepted patches times its 1.2 multiplier", () => {
    expect(TOKENS_PER_IMAGE).toBe(36000);
    expect(aiCallWorstCredits(0, 1, false)).toBe(2.15);
  });
  it("rejects input beyond Astra's published 922,000-token maximum", () => {
    expect(() => aiCallWorstCredits(922000, 1, false)).toThrow("cost contract");
  });
  it("refuses unknown model versions before any provider request", async () => {
    const reserve = vi.fn(); setSpendRpcs({ reserve, settle: async () => {} });
    await expect(replicateRun({ model: "google/nano-banana-pro", version: "unreviewed", settings: {} }, "Synthetic", [])).rejects.toThrow("Unreviewed");
    expect(reserve).not.toHaveBeenCalled();
  });
  it.each([{ resolution: "8K" }, { num_outputs: 100 }, { reference_field: "unknown" }])("refuses unpriced settings %j", settings => {
    expect(() => drawUsd("google/nano-banana-pro", settings)).toThrow("Unreviewed");
  });
  it("requires one Seedream output at 1K without sequential expansion", () => {
    expect(drawUsd("bytedance/seedream-4", { size: "1K", max_images: 1, sequential_image_generation: "disabled" })).toBe(0.03);
    expect(() => drawUsd("bytedance/seedream-4", { size: "1K", max_images: 10, sequential_image_generation: "auto" })).toThrow();
  });
  it("prices every supported Nano Banana 2.1 resolution and refuses paid searches", () => {
    expect(drawUsd("google/nano-banana-2.1", { resolution: "1K" })).toBe(0.0336);
    expect(drawUsd("google/nano-banana-2.1", { resolution: "2K" })).toBe(0.0504);
    expect(drawUsd("google/nano-banana-2.1", { resolution: "4K" })).toBe(0.1134);
    expect(() => drawUsd("google/nano-banana-2.1", { resolution: "1K", google_search: true })).toThrow("Unpriced");
  });
  it.each([-1, Infinity, NaN, 1.5, 1000000])("holds a contract-breaking usage value %s instead of releasing budget", async inputTokens => {
    const settle = vi.fn(); setSpendRpcs({ reserve: async () => ({ ok: true, id: "bounded" }), settle });
    await expect(withSpend({ kind: "check" }, { credits: 1, usd: 0 }, () => meteredAi(1, async () => ({ value: true, inputTokens, outputTokens: 0 })))).rejects.toThrow("cost contract");
    expect(settle).toHaveBeenCalledWith(expect.objectContaining({ status: "unknown", credits: 1 }));
  });
});