import { describe, expect, it } from "vitest";
import { buildContinuity, buildPanelPrompt, CHILD_SCENE_LIMIT, ChildTextTooLong, isStalePaint, legacyPanelPrompt, pickCastSnapshot, refundOwed, restoredPaintState, STALE_PAINT_MS } from "./comic-continuity";

const panels = [
  { id: "a", description: "Pip finds a red kite with a yellow star", image: "u/c/1.png" },
  { id: "b", description: "Pip runs on the beach", image: "u/c/2.png" },
  { id: "c", description: "Not drawn yet", image: null },
  { id: "d", description: "Pip flies the kite", image: null },
];

describe("story continuity", () => {
  it("includes only earlier drawn panels, in order, in the child's words", () => {
    const c = buildContinuity(panels, "d");
    expect(c).toContain("Panel 1: Pip finds a red kite with a yellow star");
    expect(c.indexOf("Panel 1")).toBeLessThan(c.indexOf("Panel 2"));
    expect(c).not.toContain("Not drawn yet");
    expect(c).not.toContain("Pip flies the kite");
  });
  it("is empty for the first panel", () => { expect(buildContinuity(panels, "a")).toBe(""); });
  it("says the current panel wins", () => { expect(buildContinuity(panels, "d")).toContain("the current panel wins"); });
  it("drops the oldest panels first to fit its budget", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, description: `Event number ${i} ${"x".repeat(150)}`, image: "i" }));
    const c = buildContinuity([...many, { id: "now", description: "now", image: null }], "now");
    expect(c.length).toBeLessThanOrEqual(700);
    expect(c).toContain("Event number 11");
    expect(c).not.toContain("Event number 0 ");
  });
});

describe("panel prompt", () => {
  it("puts the child's current words first and whole", () => {
    const scene = "Pip ".repeat(140).trim(); // 559 chars, longer than the old 480 cut
    const out = buildPanelPrompt({ scene, genre: "Mystery", continuity: buildContinuity(panels, "d") });
    expect(out.startsWith("Current panel (the child's exact words; follow them): " + scene)).toBe(true);
    expect(legacyPanelPrompt({ scene, genre: "Mystery" })).not.toContain(scene);
  });
  it("sends the exact revision wording verbatim with the keep-everything-else instruction", () => {
    const out = buildPanelPrompt({ scene: "A green couch", change: "make the couch purple", notes: "repaint couch" });
    expect(out).toContain("Requested change (the child's exact words): make the couch purple");
    expect(out).toContain("Keep the layout, background");
    expect(out.indexOf("make the couch purple")).toBeLessThan(out.indexOf("Illustration notes"));
  });
  it("rejects over-long child text instead of cutting it", () => {
    expect(() => buildPanelPrompt({ scene: "a".repeat(CHILD_SCENE_LIMIT + 1) })).toThrow(ChildTextTooLong);
    expect(() => buildPanelPrompt({ scene: "ok", change: "b".repeat(601) })).toThrow(ChildTextTooLong);
  });
});

describe("character snapshots", () => {
  const snap = [{ id: "h1", title: "Pip", dna: "yellow", styleKey: "cartoon", refs: ["p/c/snapshots/x/h1-1/0.png"], version: "1" }];
  it("uses the comic's snapshot when every character has one", () => { expect(pickCastSnapshot(snap, ["h1"], "p/c/", "cartoon")?.[0]?.refs[0]).toBe("p/c/snapshots/x/h1-1/0.png"); });
  it("falls back for older comics without snapshots or missing characters", () => {
    expect(pickCastSnapshot(undefined, ["h1"], "p/c/", "cartoon")).toBeNull();
    expect(pickCastSnapshot(snap, ["h1", "h2"], "p/c/", "cartoon")).toBeNull();
  });
  it("rejects another family's paths or a different style", () => {
    expect(pickCastSnapshot(snap, ["h1"], "other/c/", "cartoon")).toBeNull();
    expect(pickCastSnapshot([{ ...snap[0]!, refs: ["p/c/../x.png"] }], ["h1"], "p/c/", "cartoon")).toBeNull();
    expect(pickCastSnapshot(snap, ["h1"], "p/c/", "crayon")).toBeNull();
  });
});

describe("generation lifecycle", () => {
  const t = Date.parse("2026-11-16T10:00:00Z");
  it("treats painting older than 10 minutes as stale, not newer or finished ones", () => {
    expect(isStalePaint({ paintState: "painting", paintStartedAt: new Date(t - STALE_PAINT_MS - 1).toISOString() }, "", t)).toBe(true);
    expect(isStalePaint({ paintState: "painting", paintStartedAt: new Date(t - 60_000).toISOString() }, "", t)).toBe(false);
    expect(isStalePaint({ paintState: "done", paintStartedAt: new Date(0).toISOString() }, "", t)).toBe(false);
    expect(isStalePaint({ paintState: "painting" }, new Date(t - STALE_PAINT_MS - 1).toISOString(), t)).toBe(true);
  });
  it("owes a refund only for charged, unrefunded, unsaved operations", () => {
    expect(refundOwed({ charged: true, refunded: false, saved: false })).toBe(true);
    expect(refundOwed({ charged: true, refunded: true, saved: false })).toBe(false);
    expect(refundOwed({ charged: true, refunded: false, saved: true })).toBe(false);
    expect(refundOwed({ charged: false, refunded: false, saved: false })).toBe(false);
  });
  it("restored snapshots never come back busy", () => {
    expect(restoredPaintState("painting")).toBe("ready");
    expect(restoredPaintState("done")).toBe("done");
  });
});
