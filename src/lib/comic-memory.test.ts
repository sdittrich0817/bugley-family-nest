import { describe, expect, it, vi, beforeEach } from "vitest";
import { coverDescription, groundItems, liveMemory, MEMORY_PROMPT_LIMIT, memoryPrompt, mergeNotes, mergeSnapshots, missingSnapshotIds, panelsToNote, panelStamp, readMemory, revisionLogRow, type RawMemoryItem, type StoryMemory } from "./comic-memory";
import { buildPanelPrompt, resolveCast, type CastSnapshot } from "./comic-continuity";
import { comicSchema, EMPTY_MAP, newComicPage } from "./comic";

const raw = (kind: string, excerpt: string, extra: Partial<RawMemoryItem> = {}): RawMemoryItem => ({ kind, excerpt, supersedes: [], certain: true, ...extra });
const empty: StoryMemory = { v: 1, items: [], noted: {} };
const p1 = { id: "p1", description: "Pip finds a purple star crystal in the kitchen and meets Bo, a yellow duck with a blue bow tie.", image: "u/c/1.png" };
const p2 = { id: "p2", description: "Bo and Pip sail away on a raft with a red sail.", image: "u/c/2.png" };
const p3 = { id: "p3", description: "Now they are on a snowy mountain. The crystal broke into two pieces.", image: "u/c/3.png" };
const p4 = { id: "p4", description: "Pip waves at the owl.", image: null };
const note = (p: { id: string; description: string }, items: RawMemoryItem[]) => ({ panelId: p.id, stamp: panelStamp(p.description), items });

function built() {
  let m = mergeNotes(empty, [p1, p2, p3, p4], [note(p1, [raw("object", "a purple star crystal"), raw("place", "the kitchen"), raw("character", "Bo, a yellow duck with a blue bow tie")])]);
  m = mergeNotes(m, [p1, p2, p3, p4], [note(p2, [raw("object", "a raft with a red sail")])]);
  const place = m.items.find(i => i.excerpt === "the kitchen")!.id, crystal = m.items.find(i => i.kind === "object" && i.excerpt.includes("crystal"))!.id;
  return mergeNotes(m, [p1, p2, p3, p4], [note(p3, [raw("place", "on a snowy mountain", { supersedes: [place] }), raw("object", "The crystal broke into two pieces", { supersedes: [crystal] })])]);
}

describe("story memory grounding", () => {
  it("keeps only the child's exact words, linked to the source panel", () => {
    const items = groundItems([raw("object", "Purple Star Crystal"), raw("place", "a cosy kitchen"), raw("character", "Bo, a yellow duck")], p1, []);
    expect(items.map(i => i.excerpt)).toEqual(["purple star crystal", "Bo, a yellow duck"]);
    expect(items.every(i => i.panelId === "p1" && i.stamp === panelStamp(p1.description))).toBe(true);
  });
  it("rejects negated, imagined and uncertain statements", () => {
    const p = { id: "x", description: "Pip has no hat and holds a green lamp. Pip dreams of a golden castle. Maybe a dragon lives here." };
    const items = groundItems([raw("object", "no hat"), raw("object", "hat"), raw("object", "a green lamp"), raw("place", "a golden castle"), raw("character", "a dragon"), raw("object", "a green lamp", { certain: false })], p, []);
    expect(items.map(i => i.excerpt)).toEqual(["a green lamp"]);
  });
  it("rejects contradictions: a replacement the child didn't write, or two new states for one item", () => {
    const m = mergeNotes(empty, [p1], [note(p1, [raw("place", "the kitchen")])]);
    const kitchen = m.items[0]!;
    const quiet = { id: "q", description: "Pip is in the garden." };
    expect(groundItems([raw("place", "the garden", { supersedes: [kitchen.id] })], quiet, [kitchen])).toEqual([]);
    const both = { id: "b", description: "Now they are in a cave. Now they are on a beach." };
    expect(groundItems([raw("place", "in a cave", { supersedes: [kitchen.id] }), raw("place", "on a beach", { supersedes: [kitchen.id] })], both, [kitchen])).toEqual([]);
  });
  it("lets newer explicit developments replace earlier states, oldest first", () => {
    const live = liveMemory(built(), [p1, p2, p3, p4], "p4");
    expect(live.map(i => [i.panel, i.excerpt])).toEqual([[1, "Bo, a yellow duck with a blue bow tie"], [2, "a raft with a red sail"], [3, "on a snowy mountain"], [3, "The crystal broke into two pieces"]]);
  });
  it("only earlier panels count for the panel being drawn", () => {
    expect(liveMemory(built(), [p1, p2, p3, p4], "p2").map(i => i.panelId)).toEqual(["p1", "p1", "p1"]);
  });
  it("reads older comics without memory as empty", () => {
    expect(readMemory(undefined)).toEqual(empty);
    expect(readMemory({ nonsense: true })).toEqual(empty);
  });
});

describe("memory lifecycle", () => {
  it("an edited panel's notes stop counting until it is noted again", () => {
    const edited = { ...p1, description: "Pip finds a silver key in the attic." };
    expect(liveMemory(built(), [edited, p2, p3, p4], "p4").some(i => i.panelId === "p1")).toBe(false);
    expect(panelsToNote(built(), [edited, p2, p3, p4], "p4").map(p => p.id)).toEqual(["p1", "p4"]);
  });
  it("a redraw re-notes the panel, replacing its old notes", () => {
    const edited = { ...p1, description: "Pip finds a silver key in the attic." };
    const m = mergeNotes(built(), [edited, p2, p3, p4], [note(edited, [raw("object", "a silver key"), raw("place", "the attic")])]);
    expect(m.items.filter(i => i.panelId === "p1").map(i => i.excerpt)).toEqual(["a silver key", "the attic"]);
  });
  it("a cleared panel contributes nothing", () => {
    expect(liveMemory(built(), [{ ...p1, image: null }, p2, p3, p4], "p4").some(i => i.panelId === "p1")).toBe(false);
  });
  it("a removed panel's notes are dropped; new panels start empty", () => {
    const m = mergeNotes(built(), [p2, p3, p4, { id: "p5", description: "", image: null }], []);
    expect(m.items.some(i => i.panelId === "p1")).toBe(false);
    expect(m.items.some(i => i.panelId === "p5")).toBe(false);
  });
  it("restoring an earlier version brings back that version's memory with its panels", () => {
    const older = built();
    const restoredPanels = [p1, p2, p3, p4];
    const later = mergeNotes(older, [{ ...p1, description: "Pip finds a silver key in the attic." }, p2, p3, p4], []);
    expect(liveMemory(older, restoredPanels, "p4")).toHaveLength(4);
    expect(liveMemory(later, restoredPanels, "p4")).toHaveLength(4); // same stamps, same facts
  });
  it("a late note made for older words never overwrites the newer panel", () => {
    const newer = { ...p1, description: "Pip finds a silver key in the attic." };
    const m = mergeNotes(empty, [newer], [note(p1, [raw("object", "a purple star crystal")])]);
    expect(m).toEqual({ v: 1, items: [], noted: {} });
  });
  it("backfills earlier drawn panels that were never noted (older comics)", () => {
    expect(panelsToNote(empty, [p1, p2, p3, p4], "p4").map(p => p.id)).toEqual(["p1", "p2", "p3", "p4"]);
    expect(panelsToNote(built(), [p1, p2, p3, p4], "p3").map(p => p.id)).toEqual([]);
  });
});

describe("memory in prompts", () => {
  it("never shortens the child's current words and the current panel wins", () => {
    const scene = "Pip ".repeat(140).trim();
    const big = Array.from({ length: 40 }, (_, i) => ({ id: `m${i}`, kind: "object" as const, excerpt: `a very long remembered thing number ${i}`, panelId: "p", stamp: "s", order: i, supersedes: [], panel: 1 }));
    const memory = memoryPrompt(big);
    expect(memory.length).toBeLessThanOrEqual(MEMORY_PROMPT_LIMIT);
    expect(memory).toContain("the current panel's instructions win");
    const out = buildPanelPrompt({ scene, memory });
    expect(out.startsWith("Current panel (the child's exact words; follow them): " + scene)).toBe(true);
    expect(out.indexOf(scene)).toBeLessThan(out.indexOf("Established earlier"));
  });
  it("drops the oldest events before places, objects and friends", () => {
    const items = [
      { id: "e", kind: "event" as const, excerpt: "x".repeat(200), panelId: "p", stamp: "s", order: 0, supersedes: [], panel: 1 },
      { id: "o", kind: "object" as const, excerpt: "a red sail", panelId: "p", stamp: "s", order: 1, supersedes: [], panel: 1 },
    ];
    const out = memoryPrompt(items, 300);
    expect(out).toContain("a red sail");
    expect(out).not.toContain("xxxx");
  });
  it("keeps the detailed early description of something the current panel mentions, over later short repeats and small details", () => {
    const at = (id: string, panel: number, kind: "object" | "place" | "event" | "character", excerpt: string) => ({ id, kind, excerpt, panelId: `p${panel}`, stamp: "s", order: 0, supersedes: [], panel });
    const items = [at("c1", 1, "object", "a glowing purple star crystal with three sparkly points"), at("f1", 1, "place", "under a big mushroom in the forest"),
      ...Array.from({ length: 12 }, (_, i) => at(`x${i}`, i + 2, "place", `a muddy little puddle number ${i}`)), at("c7", 7, "object", "the crystal")];
    const out = memoryPrompt(items, 400, "Pip puts the crystal on top of the old stone tower");
    expect(out).toContain("a glowing purple star crystal with three sparkly points");
    expect(out).not.toContain('"the crystal"');
    expect(out.length).toBeLessThanOrEqual(400);
  });
  it("short story-friend names count as a match", () => {
    const items = [{ id: "b", kind: "character" as const, excerpt: "A tiny yellow duck named Bo with a blue bow tie", panelId: "p2", stamp: "s", order: 0, supersedes: [], panel: 2 },
      ...Array.from({ length: 20 }, (_, i) => ({ id: `e${i}`, kind: "object" as const, excerpt: `a shiny seashell number ${i}`, panelId: "p3", stamp: "s", order: i, supersedes: [], panel: 3 }))];
    expect(memoryPrompt(items, 300, "Bo comes back riding a big wave")).toContain("Bo with a blue bow tie");
  });
  it("covers put the child's cover words first, then the established story", () => {
    const out = coverDescription("The Crystal Quest: Pip finds a crystal", memoryPrompt(liveMemory(built(), [p1, p2, p3, p4])));
    expect(out.startsWith("Cover (the child's words; follow them first): The Crystal Quest: Pip finds a crystal")).toBe(true);
    expect(out).toContain("a raft with a red sail");
    expect(out).toContain("the child's cover words win");
    expect(coverDescription("Just my words", "")).toBe("Cover (the child's words; follow them first): Just my words");
  });
});

describe("character snapshots", () => {
  const snap = (id: string, prefix = "p/c/"): CastSnapshot => ({ id, title: id, dna: "yellow fox", styleKey: "cartoon", refs: [`${prefix}snapshots/x/${id}-1/0.png`], version: "1" });
  it("finds characters added midway that still need a frozen copy", () => {
    expect(missingSnapshotIds([snap("h1")], ["h1", "h2"])).toEqual(["h2"]);
    expect(missingSnapshotIds(undefined, ["h1"])).toEqual(["h1"]);
    expect(missingSnapshotIds([snap("h1")], ["h1"])).toEqual([]);
  });
  it("keeps existing frozen copies and never re-copies them", () => {
    const original = snap("h1");
    const merged = mergeSnapshots([original], [{ ...snap("h1"), dna: "now a green dragon" }, snap("h2")]);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toBe(original);
  });
  it("each character uses its own frozen copy; a missing or foreign copy refuses instead of using live characters", () => {
    const r = resolveCast([snap("h1"), snap("h2")], ["h2", "h1"], "p/c/", "cartoon");
    expect(r.mode === "snapshot" && r.cast.map(c => c.id)).toEqual(["h2", "h1"]);
    expect(resolveCast([snap("h1")], ["h1", "h2"], "p/c/", "cartoon").mode).toBe("refuse");
    expect(resolveCast([snap("h1", "other/c/")], ["h1"], "p/c/", "cartoon").mode).toBe("refuse");
    expect(resolveCast(undefined, ["h1"], "p/c/", "cartoon").mode).toBe("live"); // older comics
  });
  it("comic saves keep frozen copies and memory (they were dropped by comic edits before A2)", () => {
    const details = { genre: "Adventure", styleKey: "cartoon", characterIds: [], map: EMPTY_MAP, pages: [newComicPage("four")], finished: false, cover: null, castSnapshot: [snap("h1")], storyMemory: built() };
    const parsed = comicSchema.safeParse(details);
    expect(parsed.success).toBe(true); if (!parsed.success) return;
    expect(parsed.data.castSnapshot).toEqual([snap("h1")]);
    expect(parsed.data.storyMemory).toEqual(built());
  });
});

describe("revision checks", () => {
  it("records the requested change and unrelated changes separately, with no child words", () => {
    const row = revisionLogRow({ changeApplied: true, unrelatedChange: "small", area: "color" });
    expect(row).toEqual({ passed: true, score: 60, notes: "revision check · requested change made: yes · unrelated change: small (color)", checker_available: true });
    expect(revisionLogRow({ changeApplied: false, unrelatedChange: "none", area: "none" }).notes).toBe("revision check · requested change made: no · unrelated change: none");
    expect(revisionLogRow(null)).toMatchObject({ checker_available: false });
  });
});

const inserts: Record<string, unknown>[] = [];
let aiResult: unknown = null; let aiThrows = false;
vi.mock("./studio-ai.server", () => ({ aiObject: vi.fn(async () => { if (aiThrows) throw new Error("gateway down"); return aiResult; }) }));
vi.mock("./images.server", () => ({ signPaths: vi.fn(async (p: string[]) => p.map(x => `https://signed/${x}`)) }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: () => ({ insert: async (row: Record<string, unknown>) => { inserts.push(row); return { error: null }; } }) } }));

describe("best-effort server steps", () => {
  beforeEach(() => { inserts.length = 0; aiResult = null; aiThrows = false; });
  it("a failed memory extraction returns nothing instead of throwing", async () => {
    const { extractPanelNotes } = await import("./comic-memory.server");
    aiThrows = true;
    expect(await extractPanelNotes([p1], [], ["Pip"])).toBeNull();
    aiThrows = false; aiResult = null;
    expect(await extractPanelNotes([p1], [], ["Pip"])).toBeNull();
  });
  it("extraction results are split per panel and keyed to the words they came from", async () => {
    const { extractPanelNotes } = await import("./comic-memory.server");
    aiResult = { items: [{ panel: 1, kind: "object", excerpt: "a purple star crystal", supersedes: [], certain: true }, { panel: 2, kind: "object", excerpt: "a red sail", supersedes: [], certain: true }] };
    const notes = await extractPanelNotes([p1, p2], [], ["Pip"]);
    expect(notes?.map(n => [n.panelId, n.stamp, n.items.length])).toEqual([["p1", panelStamp(p1.description), 1], ["p2", panelStamp(p2.description), 1]]);
  });
  it("revision checks are logged privately as report-only rows, without the child's words, and never throw", async () => {
    const { logRevisionCheck } = await import("./comic-memory.server");
    aiResult = { changeApplied: true, unrelatedChange: "big", area: "background" };
    await logRevisionCheck({ parentId: "u", childId: "c", creationId: "k", styleKey: "cartoon", model: "m", before: "u/c/1.png", after: "u/c/2.png", change: "make the sky purple please Grandma Rose" });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ attempt: 0, passed: true, score: 20, delivered: true });
    expect(JSON.stringify(inserts[0])).not.toMatch(/sky|purple|Grandma/);
    aiThrows = true;
    await expect(logRevisionCheck({ parentId: "u", childId: "c", creationId: "k", styleKey: "cartoon", model: "m", before: "a", after: "b", change: "x" })).resolves.toBeUndefined();
  });
});
