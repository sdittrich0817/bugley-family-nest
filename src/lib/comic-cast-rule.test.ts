// A3.4.0: server character rule. No comic panel or cover is drawn (or charged) without an approved character whose frozen
// copy is valid; empty casts can't replace a drawn V3 comic's cast; older comics are unchanged. All paid calls are mocked.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CAST_NOT_FROZEN, KEEP_CAST, NO_CAST, castAssignmentProblem, comicHasDrawings, frozenCastProblem, type CastSnapshot } from "./comic-continuity";
import { intendedCoverCast } from "./cover-cast";
import { v3Details } from "./v3";

const P = "parent-1", C = "child-1", PREFIX = `${P}/${C}/`;
const snap = (id: string, over: Partial<CastSnapshot> = {}): CastSnapshot => ({ id, title: id === "pip" ? "Pip" : "Luna", dna: `${id} dna`, styleKey: "cartoon", refs: [`${PREFIX}snapshots/comic-1/${id}/0.png`], version: "2026-11-01", ...over });

// ---- mocks: no real drawing service, Glow or database is ever reached ----
const charge = vi.fn(async () => ({ ok: false, reason: "empty" }));
const snapshotCast = vi.fn(async (_sb: unknown, _p: string, _c: string, _comic: string, ids: string[]) => ids.map(id => snap(id)) as CastSnapshot[] | undefined);
vi.mock("@/lib/glow.server", () => ({ chargeGlow: (...a: unknown[]) => charge(...(a as [])), refundGlow: vi.fn(), refundGlowOnce: vi.fn() }));
vi.mock("@/lib/studio.server", () => ({ loadChild: vi.fn(async () => ({ id: C, age: 8, age_band: "explorers" })), guardChildText: vi.fn(async () => ({ decision: "allowed" })) }));
vi.mock("@/lib/studio-ai.server", () => ({ aiObject: vi.fn(async () => { throw new Error("no AI in this test"); }) }));
vi.mock("./workspace.server", () => ({ snapshotCast: (...a: unknown[]) => snapshotCast(...(a as [unknown, string, string, string, string[]])) }));
const model = { model: "google/nano-banana-pro", version: "", settings: { reference_field: "image_input", resolution: "2K" }, supports_reference: true };
const style = { name: "Cartoon", recipe: "cartoon recipe" };
const chain = (result: unknown) => { const q: any = new Proxy({}, { get: (_t, k) => k === "maybeSingle" || k === "single" ? async () => result : k === "then" ? undefined : () => q }); return q; };
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  from: (t: string) => chain({ data: t === "art_styles" ? style : t === "image_models" ? model : t === "studio_creations" ? { details: {} } : null }),
  rpc: async () => ({ data: { styleKey: "cartoon", style, model }, error: null }),
  storage: { from: () => ({ createSignedUrls: async (paths: string[]) => ({ data: paths.map(p => ({ signedUrl: `https://signed/${p}` })) }) }) },
} }));

const paid = vi.fn(() => { throw new Error("a paid drawing call was attempted"); });
beforeEach(() => { charge.mockClear(); snapshotCast.mockClear(); paid.mockClear(); vi.stubGlobal("fetch", paid); });

const draw = async (over: Record<string, unknown>) => (await import("./images.server")).generateImage({} as never, P, { childId: C, description: "Pip flies a kite over the sea", styleKey: "cartoon", mode: "final", requireReferences: true, lockId: "comic-1", op: "op-1", characterIds: ["pip"], frozenCast: true, ...over } as never);

describe("frozen character rule (pure)", () => {
  it("refuses a comic with no characters", () => { expect(frozenCastProblem([snap("pip")], [], PREFIX, "cartoon")).toBe(NO_CAST); });
  it("refuses a character with no frozen copy", () => { expect(frozenCastProblem([snap("pip")], ["pip", "luna"], PREFIX, "cartoon")).toBe(CAST_NOT_FROZEN); });
  it("refuses when there are no frozen copies at all", () => { expect(frozenCastProblem(undefined, ["pip"], PREFIX, "cartoon")).toBe(CAST_NOT_FROZEN); });
  it("refuses a frozen copy whose pictures belong to another family", () => { expect(frozenCastProblem([snap("pip", { refs: ["other-parent/other-child/x.png"] })], ["pip"], PREFIX, "cartoon")).toBe(CAST_NOT_FROZEN); });
  it("refuses a frozen copy in a different art style", () => { expect(frozenCastProblem([snap("pip", { styleKey: "crayon" })], ["pip"], PREFIX, "cartoon")).toBe(CAST_NOT_FROZEN); });
  it("refuses a frozen copy with no reference pictures or no Character DNA", () => {
    expect(frozenCastProblem([snap("pip", { refs: [] })], ["pip"], PREFIX, "cartoon")).toBe(CAST_NOT_FROZEN);
    expect(frozenCastProblem([snap("pip", { dna: "" })], ["pip"], PREFIX, "cartoon")).toBe(CAST_NOT_FROZEN);
  });
  it("allows every approved character with a valid frozen copy", () => { expect(frozenCastProblem([snap("pip"), snap("luna")], ["pip", "luna", "pip"], PREFIX, "cartoon")).toBeNull(); });
});

describe("empty character lists", () => {
  const drawn = { workspace: { v3: true }, cover: null, pages: [{ panels: [{ image: `${PREFIX}a.png` }, { image: null }] }] };
  it("can't replace the cast of a V3 comic that already has a drawn panel", () => { expect(castAssignmentProblem(drawn, [])).toBe(KEEP_CAST); });
  it("can't replace the cast of a V3 comic that has only a cover", () => { expect(castAssignmentProblem({ workspace: { v3: true }, cover: `${PREFIX}c.png`, pages: [{ panels: [{ image: null }] }] }, [])).toBe(KEEP_CAST); });
  it("still lets a drawn V3 comic change to other characters", () => { expect(castAssignmentProblem(drawn, ["luna"])).toBeNull(); });
  it("is allowed before anything is drawn", () => { expect(castAssignmentProblem({ workspace: { v3: true }, cover: null, pages: [{ panels: [{ image: null, sketch: null }] }] }, [])).toBeNull(); });
  it("leaves older (non-V3) comics unchanged", () => { expect(castAssignmentProblem({ cover: null, pages: [{ panels: [{ image: `${PREFIX}a.png` }] }] }, [])).toBeNull(); });
  it("counts sketches as drawings", () => { expect(comicHasDrawings({ pages: [{ panels: [{ sketch: `${PREFIX}s.png` }] }] })).toBe(true); });
});

describe("drawing service never charges or draws when the rule fails", () => {
  it("never writes the synthetic child description into diagnostic output", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const words = "synthetic confidential hero-name";
    charge.mockResolvedValueOnce({ ok: true, reason: "" });
    try {
      await (await import("./images.server")).generateHeroOptions({} as never, P, { childId: C, styleKey: "cartoon", description: words });
      expect(log.mock.calls.some(call => call.some(arg => typeof arg === "string" && arg.includes(words)))).toBe(false);
    } finally { log.mockRestore(); }
  });
  it("empty cast: refused before Glow and before any paid call", async () => {
    const r = await draw({ characterIds: [] });
    expect(r).toMatchObject({ ok: false, reply: NO_CAST });
    expect(charge).not.toHaveBeenCalled(); expect(paid).not.toHaveBeenCalled();
  });
  it("no frozen copies: never falls back to live characters, refused before Glow", async () => {
    const r = await draw({ castSnapshot: undefined });
    expect(r.ok).toBe(false);
    expect(charge).not.toHaveBeenCalled(); expect(paid).not.toHaveBeenCalled();
  });
  it("a character missing from the frozen copies: refused before Glow", async () => {
    const r = await draw({ characterIds: ["pip", "luna"], castSnapshot: [snap("pip")] });
    expect(r.ok).toBe(false);
    expect(charge).not.toHaveBeenCalled(); expect(paid).not.toHaveBeenCalled();
  });
  it("another family's frozen pictures: refused before Glow", async () => {
    const r = await draw({ castSnapshot: [snap("pip", { refs: ["someone/else/0.png"] })] });
    expect(r.ok).toBe(false);
    expect(charge).not.toHaveBeenCalled(); expect(paid).not.toHaveBeenCalled();
  });
  it("frozen copy in another art style: refused before Glow", async () => {
    const r = await draw({ castSnapshot: [snap("pip", { styleKey: "crayon" })] });
    expect(r.ok).toBe(false);
    expect(charge).not.toHaveBeenCalled(); expect(paid).not.toHaveBeenCalled();
  });
  it("valid frozen cast passes the rule and reaches the normal Glow check (which here says no, so nothing is drawn)", async () => {
    const r = await draw({ castSnapshot: [snap("pip")] });
    expect(charge).toHaveBeenCalledTimes(1);
    expect(r.ok).toBe(false); expect(paid).not.toHaveBeenCalled();
  });
  it("a cover may leave every character out only when the child's words say so", async () => {
    const r = await draw({ characterIds: [], allowEmptyCast: true });
    expect((r as { reply?: string }).reply).not.toBe(NO_CAST);
    expect(charge).toHaveBeenCalledTimes(1); expect(paid).not.toHaveBeenCalled();
  });
  it("older comics that don't ask for the rule behave as before (live characters allowed)", async () => {
    const r = await draw({ characterIds: [], frozenCast: false, lockId: undefined });
    expect((r as { reply?: string }).reply).not.toBe(NO_CAST);
    expect(charge).toHaveBeenCalledTimes(1); expect(paid).not.toHaveBeenCalled();
  });
});

describe("freezing just before drawing (V3 comics)", () => {
  const comic = (data: Record<string, unknown>) => ({ id: "comic-1", title: "Kites", updatedAt: "t", urls: {}, versions: {}, data: { genre: "Adventure", styleKey: "cartoon", characterIds: ["pip"], map: {}, pages: [], finished: false, cover: null, workspace: { v3: true }, ...data } }) as never;
  const freeze = async (c: unknown) => (await import("./comic.server")).freezeComicCast({} as never, P, C, c as never);
  it("an empty cast is refused without copying anything", async () => {
    await expect(freeze(comic({ characterIds: [] }))).rejects.toThrow(NO_CAST);
    expect(snapshotCast).not.toHaveBeenCalled();
  });
  it("normal character-first comic: freezes the character once, then is allowed", async () => {
    const c: any = comic({});
    await expect(freeze(c)).resolves.toEqual([snap("pip")]);
    expect(snapshotCast).toHaveBeenCalledWith(expect.anything(), P, C, "comic-1", ["pip"], "cartoon");
    snapshotCast.mockClear();
    await freeze(c); expect(snapshotCast).not.toHaveBeenCalled();
  });
  it("mid-comic character addition: freezes only the new character and keeps the existing frozen copy", async () => {
    const old = snap("pip", { version: "frozen-before" });
    const c: any = comic({ characterIds: ["pip", "luna"], castSnapshot: [old] });
    const out = await freeze(c);
    expect(snapshotCast).toHaveBeenCalledWith(expect.anything(), P, C, "comic-1", ["luna"], "cartoon");
    expect(out[0]).toEqual(old); expect(out.map(s => s.id)).toEqual(["pip", "luna"]);
  });
  it("a failed or partial copy is refused (characters not owned, wrong look or missing pictures)", async () => {
    snapshotCast.mockResolvedValueOnce(undefined);
    await expect(freeze(comic({}))).rejects.toThrow(/couldn’t save a copy of your characters/);
    snapshotCast.mockResolvedValueOnce([]);
    await expect(freeze(comic({ characterIds: ["pip"] }))).rejects.toThrow(/couldn’t save a copy/);
  });
  it("an invalid existing frozen copy is refused, not replaced", async () => {
    await expect(freeze(comic({ castSnapshot: [snap("pip", { styleKey: "crayon" })] }))).rejects.toThrow(CAST_NOT_FROZEN);
    expect(snapshotCast).not.toHaveBeenCalled();
  });
});

describe("compatibility", () => {
  it("character-first V3 comics always start with exactly the chosen approved character", () => {
    const d = v3Details("comic", 4, { id: "pip", title: "Pip", styleKey: "cartoon" }) as any;
    expect(d.characterIds).toEqual(["pip"]);
    expect(castAssignmentProblem(d, [])).toBeNull();
  });
  it("covers only leave everyone out when the child's words explicitly do", () => {
    const cast = [{ id: "pip", name: "Pip" }];
    expect(intendedCoverCast("Pip flies a kite", cast).ids).toEqual(["pip"]);
    expect(intendedCoverCast("", cast).ids).toEqual(["pip"]);
  });
});
