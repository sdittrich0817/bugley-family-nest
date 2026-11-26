import { describe, expect, it, vi, afterEach } from "vitest";
import { encode } from "fast-png";
import { astraImageTokens, prepareAiImages } from "./ai-image-cost.server";
afterEach(() => vi.unstubAllGlobals());
describe("full-detail image cost preflight", () => {
  it("prices 1K, 2K and 4K originals without resizing them", () => {
    expect(astraImageTokens(1024, 1024)).toBe(1229);
    expect(astraImageTokens(2048, 2048)).toBe(4916);
    expect(astraImageTokens(4096, 4096)).toBe(19661);
  });
  it("refuses images Astra would reject above 30,000 patches", () => {
    expect(() => astraImageTokens(6000, 6000)).toThrow("patch limit");
  });
  it("embeds exactly the PNG bytes whose dimensions were priced", async () => {
    const png = encode({ width: 32, height: 32, data: new Uint8Array(32 * 32 * 4), channels: 4 });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(png as BodyInit)); vi.stubGlobal("fetch", fetchMock);
    const result = await prepareAiImages(["https://example.invalid/synthetic.png"]);
    expect(result[0]?.tokens).toBe(2);
    const encoded = result[0]?.url.split(",")[1]; if (!encoded) throw new Error("image missing");
    expect(new Uint8Array(Buffer.from(encoded, "base64"))).toEqual(png);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("rejects unreadable images before any AI request", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("not an image")));
    await expect(prepareAiImages(["https://example.invalid/synthetic.png"])).rejects.toThrow("Invalid AI image");
  });
});