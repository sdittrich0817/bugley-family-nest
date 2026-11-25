// A3.4.1 idea-first comics: exact idea saving, age rules, save/resume versioning, duplicate taps, cast ownership and
// look checks, drawing waits for a confirmed cast, and no Glow or paid calls anywhere in the idea steps.
// Every database, AI, Glow and drawing call is a stand-in; nothing real or paid is ever reached.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  IDEA_APPROVED, IDEA_CAST_PENDING, IDEA_LOOKS, IDEA_SPROUTS, IDEA_STARTED, addIdeaWords, ideaCastProblem, ideaComicDetails,
  ideaDrawProblem, ideaFirstAllowed, ideaLook, ideaSaveDecision, ideaSparks, ideaStageOf, savedIdeaVersion,
} from "./comic-idea";
import { workspaceOf } from "./workspace";
import { comicSchema } from "./comic";
import { CHILD_VOICE_ENABLED } from "./kid-input";

const IDEA = "  A dragon is scared to fly…   but her best friend is a tiny 🐢 named Moss!\n";
const P = "00000000-0000-4000-8000-0000000000e1", C = "00000000-0000-4000-8000-0000000000e2", COMIC = "00000000-0000-4000-8000-0000000000c1";
const PIP = "00000000-0000-4000-8000-00000000000a", LUNA = "00000000-0000-4000-8000-00000000000b", ZED = "00000000-0000-4000-8000-00000000000c", MO = "00000000-0000-4000-8000-00000000000d";
const approved = (id: string, style = "cartoon", over: Record<string, unknown> = {}) => ({ id, title: id === PIP ? "Pip" : "Luna", style_key: style, details: { dna: `${id} dna`, refs: [`${P}/${C}/${id}.png`], ...over }, updated_at: "2026-11-23T10:00:00.000Z" });
const castStage = (over: Record<string, unknown> = {}) => ({ ...ideaComicDetails(IDEA, 4, "Adventure", "cast"), ...over });

describe("idea-first rules (pure)", () => {
  it("is offered only to Explorers and Builders, never Sprouts", () => {
    expect(ideaFirstAllowed("explorers")).toBe(true);
    expect(ideaFirstAllowed("builders")).toBe(true);
    expect(ideaFirstAllowed("sprouts")).toBe(false);
    expect(ideaFirstAllowed("")).toBe(false);
    expect(ideaFirstAllowed(undefined)).toBe(false);
  });
  it("keeps the idea byte-for-byte (spaces, punctuation, emoji and line breaks) and survives the saved-comic reader", () => {
    const d = ideaComicDetails(IDEA, 4);
    expect(d.workspace.originalIdea).toBe(IDEA);
    const ws = workspaceOf(d);
    expect(ws.originalIdea).toBe(IDEA);
    expect(ws.ideaStart).toBe(true);
    expect(ws.ideaStage).toBe("idea");
    expect(ws.ideaVersion).toBe(1);
    expect(comicSchema.parse(d).workspace.originalIdea).toBe(IDEA);
  });
  it("starts with no characters, blank panels and a temporary name, so nothing can be drawn yet", () => {
    const d = ideaComicDetails(IDEA, 4);
    expect(d.characterIds).toEqual([]);
    expect(d.pages.flatMap((p) => p.panels.map((x) => x.description))).toEqual(["", "", "", ""]);
    expect(d.pages.flatMap((p) => p.panels.map((x) => x.image))).toEqual([null, null, null, null]);
    expect(d.workspace.titlePending).toBe(true);
    expect(ideaDrawProblem(d)).toBe(IDEA_CAST_PENDING);
    expect(ideaDrawProblem(castStage())).toBe(IDEA_CAST_PENDING);
  });
  it("normal comics (character-first and older) are never held back by the idea rule", () => {
    expect(ideaDrawProblem({ workspace: { v3: true, originalIdea: "" } })).toBeNull();
    expect(ideaDrawProblem({})).toBeNull();
    expect(ideaDrawProblem(null)).toBeNull();
    const confirmed = castStage();
    delete (confirmed.workspace as { ideaStage?: string }).ideaStage;
    expect(ideaDrawProblem(confirmed)).toBeNull();
    expect(ideaStageOf(confirmed)).toBeNull();
  });
  it("versions idea saves on the server: newest base writes; a delayed or other-device base never does", () => {
    const row = (v: number, stage = "idea") => ({ details: { workspace: { ideaStart: true, ideaStage: stage, ideaVersion: v } } });
    expect(ideaSaveDecision(null, 0)).toEqual({ action: "insert", expect: 0 });
    expect(ideaSaveDecision(row(3), 3)).toEqual({ action: "update", expect: 3 });
    expect(ideaSaveDecision(row(4), 3).action).toBe("conflict");
    expect(ideaSaveDecision(row(2), 7).action).toBe("conflict");
    expect(ideaSaveDecision(row(3, "cast"), 3).action).toBe("closed");
    expect(savedIdeaVersion({ workspace: { ideaVersion: -1 } })).toBe(0);
  });
  it("accepts up to three approved characters in one look before panel 1", () => {
    expect(ideaCastProblem(castStage(), [PIP], [approved(PIP)], false)).toBeNull();
    expect(ideaCastProblem(castStage(), [PIP, LUNA], [approved(PIP), approved(LUNA)], true)).toBeNull();
    expect(ideaCastProblem(castStage(), [], [], false)).toBeNull();
    expect(ideaLook([LUNA, PIP], [approved(PIP, "cartoon"), approved(LUNA, "crayon")])).toBe("crayon");
  });
  it("refuses mismatched looks, more than three, duplicates, unapproved, draft, missing or foreign characters", () => {
    expect(ideaCastProblem(castStage(), [PIP, LUNA], [approved(PIP), approved(LUNA, "crayon")], false)).toBe(IDEA_LOOKS);
    expect(ideaCastProblem(castStage(), [PIP, LUNA, ZED, MO], [PIP, LUNA, ZED, MO].map((x) => approved(x)), false)).toMatch(/up to 3/);
    expect(ideaCastProblem(castStage(), [PIP, PIP], [approved(PIP)], false)).toBe(IDEA_APPROVED);
    expect(ideaCastProblem(castStage(), [PIP], [approved(PIP, "cartoon", { dna: "" })], false)).toBe(IDEA_APPROVED);
    expect(ideaCastProblem(castStage(), [PIP], [approved(PIP, "cartoon", { refs: [] })], false)).toBe(IDEA_APPROVED);
    expect(ideaCastProblem(castStage(), [PIP], [approved(PIP, "cartoon", { characterDraftV3: true })], false)).toBe(IDEA_APPROVED);
    // Another family's (or a deleted) character isn't returned by the family-scoped read, so it can never join.
    expect(ideaCastProblem(castStage(), [PIP, LUNA], [approved(PIP)], false)).toBe(IDEA_APPROVED);
  });
  it("confirming needs at least one character", () => {
    expect(ideaCastProblem(castStage(), [], [], true)).toBe(IDEA_CAST_PENDING);
  });
  it("can't change the cast once the comic has started, has drawings or frozen copies, or for a normal comic", () => {
    expect(ideaCastProblem(ideaComicDetails(IDEA, 4, "Adventure", "idea"), [PIP], [approved(PIP)], false)).toBe(IDEA_STARTED);
    const drawn = castStage();
    drawn.pages[0]!.panels[0]!.image = `${P}/${C}/panel.png`;
    expect(ideaCastProblem(drawn, [PIP], [approved(PIP)], false)).toBe(IDEA_STARTED);
    expect(ideaCastProblem({ ...castStage(), castSnapshot: [{ id: PIP }] }, [PIP], [approved(PIP)], false)).toBe(IDEA_STARTED);
    expect(ideaCastProblem({ ...castStage(), cover: `${P}/${C}/cover.png` }, [PIP], [approved(PIP)], false)).toBe(IDEA_STARTED);
    expect(ideaCastProblem({ workspace: { v3: true, originalIdea: "" }, pages: [] }, [PIP], [approved(PIP)], false)).toBe(IDEA_STARTED);
  });
  it("'Use my idea words' only adds the idea when tapped, never rewriting what the child wrote", () => {
    expect(addIdeaWords("", IDEA)).toBe(IDEA.trim());
    expect(addIdeaWords("Panel one:", "A dragon is scared")).toBe("Panel one: A dragon is scared");
    expect(addIdeaWords("A dragon is scared, and", "A dragon is scared")).toBe("A dragon is scared, and");
    expect(addIdeaWords("x".repeat(590), "A dragon is scared").length).toBe(600);
  });
  it("offers three different ready-made sparks (no AI) that stay the same for one comic", () => {
    const s = ideaSparks("abc");
    expect(s).toHaveLength(3);
    expect(new Set(s).size).toBe(3);
    expect(ideaSparks("abc")).toEqual(s);
  });
  it("keeps every child microphone off", () => expect(CHILD_VOICE_ENABLED).toBe(false));
});

// ---------------- server steps with stand-ins ----------------
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate: (i: unknown) => unknown = (i) => i;
    const chain: any = { middleware: () => chain, inputValidator: (fn: (i: unknown) => unknown) => { validate = fn; return chain; }, handler: (fn: any) => (args: any) => fn({ ...args, data: validate(args?.data) }) };
    return chain;
  },
  createMiddleware: () => { const m: any = { inputValidator: () => m, server: () => m }; return m; },
}));
vi.mock("./kid-device-auth", () => ({ requireKidOrParentAuth: {} }));
vi.mock("./billing.functions", () => ({ familyHasAccess: vi.fn(async () => true) }));
const child = { id: C, nickname: "Ada", age: 8, age_band: "explorers", bugley_stage: "scout" };
const guard = vi.fn(async (..._a: unknown[]) => ({ decision: "allowed" as string, reply: undefined as string | undefined, eventId: undefined }));
vi.mock("./studio.server", () => ({ loadChild: vi.fn(async () => child), guardChildText: (...a: unknown[]) => guard(...a) }));
const charge = vi.fn(async () => ({ ok: true }));
vi.mock("./glow.server", () => ({ chargeGlow: (...a: unknown[]) => charge(...(a as [])), refundGlow: vi.fn(), refundGlowOnce: vi.fn() }));
vi.mock("./studio-ai.server", () => ({ aiObject: vi.fn(async () => { throw new Error("no AI in this test"); }) }));
const paid = vi.fn(() => { throw new Error("a paid call was attempted"); });

// A tiny in-memory stand-in for the studio_creations table (records every write and filter).
type Row = { id: string; parent_id: string; child_id: string; kind: string; title?: string; body?: string; style_key: string | null; details: any; deleted_at: string | null; updated_at: string };
let rows: Row[] = [];
let writes: { op: string; value: any; filters: [string, ...unknown[]][] }[] = [];
const pathGet = (row: any, path: string) => path.split(/->>?/).reduce((v, k) => (v == null ? v : v[k]), row);
function matches(row: Row, filters: [string, ...unknown[]][]) {
  return filters.every(([op, col, val]) => {
    if (op === "eq") return String(pathGet(row, col as string)) === String(val);
    if (op === "is") return (pathGet(row, col as string) ?? null) === val;
    if (op === "in") return (val as unknown[]).includes(pathGet(row, col as string));
    if (op === "contains") { const want = val as any; const has = (a: any, b: any): boolean => typeof b !== "object" || b === null ? a === b : Object.keys(b).every((k) => a != null && has(a[k], b[k])); return has(pathGet(row, col as string), want); }
    if (op === "or") return (col as string).split(",").some((part) => { const m = part.match(/^(.*)\.(is|eq)\.(.*)$/); if (!m) return false; const v = pathGet(row, m[1]!); return m[2] === "is" ? v == null : String(v) === m[3]; });
    return true;
  });
}
function table(name: string) {
  const filters: [string, ...unknown[]][] = [];
  let op = "select"; let value: any;
  const run = () => {
    if (name !== "studio_creations") return { data: null, error: null };
    if (op === "insert") {
      writes.push({ op, value, filters: [] });
      if (rows.some((r) => r.id === value.id)) return { data: null, error: { code: "23505" } };
      rows.push({ deleted_at: null, updated_at: new Date().toISOString(), ...structuredClone(value) });
      return { data: null, error: null };
    }
    const hit = rows.filter((r) => matches(r, filters));
    if (op === "update") { writes.push({ op, value, filters: [...filters] }); for (const r of hit) Object.assign(r, structuredClone(value)); return { data: hit.map((r) => ({ id: r.id })), error: null }; }
    return { data: hit.map((r) => structuredClone(r)), error: null };
  };
  const q: any = {
    select: () => q, insert: (v: any) => { op = "insert"; value = v; return q; }, update: (v: any) => { op = "update"; value = v; return q; },
    eq: (c: string, v: unknown) => (filters.push(["eq", c, v]), q), is: (c: string, v: unknown) => (filters.push(["is", c, v]), q), in: (c: string, v: unknown) => (filters.push(["in", c, v]), q),
    contains: (c: string, v: unknown) => (filters.push(["contains", c, v]), q), or: (expr: string) => (filters.push(["or", expr]), q), not: () => q, order: () => q, limit: () => q,
    maybeSingle: async () => { const r = run(); return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error }; },
    then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
  };
  return q;
}
const db = { from: (n: string) => table(n), rpc: async () => ({ data: null, error: null }) };
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: (n: string) => table(n), rpc: async () => ({ data: null, error: null }) } }));
vi.mock("./workspace.server", async () => {
  const { workspaceOf } = await import("./workspace");
  const loadWorkspace = async (_sb: unknown, parentId: string, childId: string, id: string) => {
    const r = rows.find((x) => x.id === id && x.parent_id === parentId && x.child_id === childId && !x.deleted_at);
    if (!r) throw new Error("We couldn’t open that creation.");
    const details = structuredClone(r.details);
    return { id: r.id, kind: r.kind, title: r.title ?? "", body: r.body ?? "", images: [], styleKey: r.style_key ?? "cartoon", updatedAt: r.updated_at, details, workspace: workspaceOf(details), urls: {} };
  };
  return {
    loadWorkspace,
    persistWorkspace: async (parentId: string, childId: string, p: any) => {
      const r = rows.find((x) => x.id === p.id && x.parent_id === parentId && x.child_id === childId);
      if (!r || r.updated_at !== p.updatedAt) throw new Error("Your creation changed in another window.");
      writes.push({ op: "persist", value: p, filters: [] });
      Object.assign(r, { style_key: p.styleKey, details: structuredClone({ ...p.details, workspace: p.workspace }), updated_at: new Date(Date.parse(r.updated_at) + 1000).toISOString() });
    },
    recoverStalePaint: async (_sb: unknown, _p: string, _c: string, project: unknown) => project,
    snapshotCast: vi.fn(async () => { throw new Error("nothing may be frozen in this test"); }),
  };
});

const ctx = { context: { supabase: db, userId: P } };
const fns = () => import("./v3.functions");
const env = "sandbox" as const;
beforeEach(() => {
  rows = []; writes = []; guard.mockClear(); charge.mockClear(); paid.mockClear(); child.age_band = "explorers";
  guard.mockImplementation(async () => ({ decision: "allowed", reply: undefined, eventId: undefined }));
  vi.stubGlobal("fetch", paid);
});
const character = (id: string, style = "cartoon", over: Partial<Row> = {}): Row => ({ id, parent_id: P, child_id: C, kind: "character", title: id === PIP ? "Pip" : "Luna", style_key: style, details: { dna: "dna", refs: [`${P}/${C}/${id}.png`] }, deleted_at: null, updated_at: "2026-11-23T10:00:00.000Z", ...over });

describe("saveV3Idea (server)", () => {
  it("refuses Sprouts before any safety check, AI or write", async () => {
    child.age_band = "sprouts";
    await expect((await fns()).saveV3Idea({ ...ctx, data: { childId: C, id: COMIC, idea: "A dragon is scared", environment: env } } as never)).rejects.toThrow(IDEA_SPROUTS);
    expect(guard).not.toHaveBeenCalled();
    expect(writes).toEqual([]);
  });
  it("saves the idea exactly as typed, after one safety check, with no Glow and no paid call", async () => {
    const r = await (await fns()).saveV3Idea({ ...ctx, data: { childId: C, id: COMIC, idea: IDEA, environment: env } } as never);
    expect(r.saved).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.details.workspace.originalIdea).toBe(IDEA);
    expect(rows[0]!.kind).toBe("comic");
    expect(rows[0]!.details.characterIds).toEqual([]);
    expect(rows[0]!.title).toBe("My comic idea");
    expect(guard).toHaveBeenCalledTimes(1);
    expect(guard.mock.calls[0]![4]).toBe("story_idea");
    expect(charge).not.toHaveBeenCalled();
    expect(paid).not.toHaveBeenCalled();
  });
  it("too-short ideas are refused without a safety check", async () => {
    await expect((await fns()).saveV3Idea({ ...ctx, data: { childId: C, id: COMIC, idea: " a ", environment: env } } as never)).rejects.toThrow(/a little more/);
    expect(guard).not.toHaveBeenCalled();
  });
  it("a blocked idea is never saved and the child's reply comes back", async () => {
    guard.mockImplementation(async () => ({ decision: "blocked", reply: "Let's keep real names private!", eventId: undefined }));
    await expect((await fns()).saveV3Idea({ ...ctx, data: { childId: C, id: COMIC, idea: "My friend Sam Jones at 12 Elm St", environment: env } } as never)).rejects.toThrow("Let's keep real names private!");
    expect(rows).toHaveLength(0);
  });
  it("a double tap or retry of 'That's my idea!' makes one comic", async () => {
    const f = await fns();
    const a = await f.saveV3Idea({ ...ctx, data: { childId: C, id: COMIC, idea: IDEA, done: true, environment: env } } as never);
    const b = await f.saveV3Idea({ ...ctx, data: { childId: C, id: COMIC, idea: IDEA, done: true, base: 0, environment: env } } as never);
    expect(rows.filter((r) => r.kind === "comic")).toHaveLength(1);
    expect(a.project?.workspace.ideaStage).toBe("cast");
    expect(b.saved).toBe(false);
    expect(b.project?.id).toBe(COMIC); // the retry simply reopens the same comic
    expect(guard).toHaveBeenCalledTimes(1); // the retry costs no second check
  });
  it("two first saves racing with the same id: the loser is a conflict, not a second comic", async () => {
    rows.push({ id: COMIC, parent_id: P, child_id: C, kind: "comic", style_key: null, details: ideaComicDetails("Other screen words", 4), deleted_at: null, updated_at: "2026-11-23T10:00:00.000Z" });
    const r = await (await fns()).saveV3Idea({ ...ctx, data: { childId: C, id: COMIC, idea: IDEA, base: 0, environment: env } } as never);
    expect(r.saved).toBe(false);
    expect(r.conflict?.idea).toBe("Other screen words");
    expect(rows).toHaveLength(1);
  });
  it("newest-version saves win; a delayed save from an older version is never written and costs no check", async () => {
    const f = await fns();
    await f.saveV3Idea({ ...ctx, data: { childId: C, id: COMIC, idea: "A dragon", environment: env } } as never); // v1
    const v2 = await f.saveV3Idea({ ...ctx, data: { childId: C, id: COMIC, idea: "A dragon is scared", base: 1, environment: env } } as never);
    expect(v2).toMatchObject({ saved: true, version: 2 });
    guard.mockClear();
    const late = await f.saveV3Idea({ ...ctx, data: { childId: C, id: COMIC, idea: "A drag", base: 1, environment: env } } as never);
    expect(late.saved).toBe(false);
    expect(late.conflict).toEqual({ idea: "A dragon is scared", version: 2 });
    expect(rows[0]!.details.workspace.originalIdea).toBe("A dragon is scared");
    expect(guard).not.toHaveBeenCalled();
  });
  it("the version check is part of the write itself (conditional update)", async () => {
    const f = await fns();
    await f.saveV3Idea({ ...ctx, data: { childId: C, id: COMIC, idea: "A dragon", environment: env } } as never);
    await f.saveV3Idea({ ...ctx, data: { childId: C, id: COMIC, idea: "A dragon is scared", base: 1, environment: env } } as never);
    const upd = writes.find((w) => w.op === "update")!;
    expect(upd.filters).toContainEqual(["or", "details->workspace->>ideaVersion.eq.1"]);
    expect(upd.filters).toContainEqual(["contains", "details", { workspace: { ideaStage: "idea" } }]);
  });
  it("can't touch another family's or another child's comic", async () => {
    rows.push({ id: COMIC, parent_id: "other-parent", child_id: "other-child", kind: "comic", style_key: null, details: ideaComicDetails("theirs", 4), deleted_at: null, updated_at: "x" });
    await expect((await fns()).saveV3Idea({ ...ctx, data: { childId: C, id: COMIC, idea: IDEA, environment: env } } as never)).rejects.toThrow(/your own comic idea/);
    expect(rows[0]!.details.workspace.originalIdea).toBe("theirs");
  });
  it("can't turn a normal character-first comic into an idea comic", async () => {
    rows.push({ id: COMIC, parent_id: P, child_id: C, kind: "comic", style_key: "cartoon", details: { workspace: { v3: true, originalIdea: "" }, characterIds: [PIP], pages: [] }, deleted_at: null, updated_at: "x" });
    await expect((await fns()).saveV3Idea({ ...ctx, data: { childId: C, id: COMIC, idea: IDEA, environment: env } } as never)).rejects.toThrow(/your own comic idea/);
  });
});

describe("setV3IdeaPlan (server)", () => {
  const start = async () => {
    const f = await fns();
    const r = await f.saveV3Idea({ ...ctx, data: { childId: C, id: COMIC, idea: IDEA, done: true, environment: env } } as never);
    return { f, updatedAt: r.project!.updatedAt };
  };
  it("adds approved characters, takes the first character's look and charges nothing", async () => {
    rows.push(character(PIP, "crayon"), character(LUNA, "crayon"));
    const { f, updatedAt } = await start();
    const p = await f.setV3IdeaPlan({ ...ctx, data: { childId: C, id: COMIC, updatedAt, characterIds: [PIP, LUNA], environment: env } } as never);
    expect(p.details.characterIds).toEqual([PIP, LUNA]);
    expect(p.styleKey).toBe("crayon");
    expect(p.details.styleKey).toBe("crayon");
    expect(p.workspace.ideaStage).toBe("cast");
    expect(p.workspace.originalIdea).toBe(IDEA);
    expect(p.details.castSnapshot).toBeUndefined(); // frozen only at panel 1, as for character-first comics
    expect(charge).not.toHaveBeenCalled();
    expect(paid).not.toHaveBeenCalled();
  });
  it("refuses characters in different looks", async () => {
    rows.push(character(PIP, "cartoon"), character(LUNA, "crayon"));
    const { f, updatedAt } = await start();
    await expect(f.setV3IdeaPlan({ ...ctx, data: { childId: C, id: COMIC, updatedAt, characterIds: [PIP, LUNA], environment: env } } as never)).rejects.toThrow(IDEA_LOOKS);
  });
  it("refuses another family's, a deleted or an unfinished character", async () => {
    rows.push(character(PIP), character(LUNA, "cartoon", { parent_id: "other-parent" }), character(ZED, "cartoon", { deleted_at: "2026-11-22" }), character(MO, "cartoon", { details: { characterDraftV3: true } }));
    const { f, updatedAt } = await start();
    for (const other of [LUNA, ZED, MO]) await expect(f.setV3IdeaPlan({ ...ctx, data: { childId: C, id: COMIC, updatedAt, characterIds: [PIP, other], environment: env } } as never)).rejects.toThrow(IDEA_APPROVED);
  });
  it("refuses more than three characters", async () => {
    const { f, updatedAt } = await start();
    // Refused by the request check itself, before anything is read or written.
    await expect((async () => f.setV3IdeaPlan({ ...ctx, data: { childId: C, id: COMIC, updatedAt, characterIds: [PIP, LUNA, ZED, MO], environment: env } } as never))()).rejects.toThrow(/at most 3|too_big|Array must contain at most/);
    expect(rows.find((r) => r.id === COMIC)!.details.characterIds).toEqual([]);
  });
  it("refuses a stale screen (server timestamp), so two devices can't overwrite each other", async () => {
    rows.push(character(PIP), character(LUNA));
    const { f, updatedAt } = await start();
    await f.setV3IdeaPlan({ ...ctx, data: { childId: C, id: COMIC, updatedAt, characterIds: [PIP], environment: env } } as never);
    await expect(f.setV3IdeaPlan({ ...ctx, data: { childId: C, id: COMIC, updatedAt, characterIds: [LUNA], environment: env } } as never)).rejects.toThrow(/another screen/);
    expect(rows.find((r) => r.id === COMIC)!.details.characterIds).toEqual([PIP]);
  });
  it("confirming needs a character, then ends the idea stage; later cast changes go through + Character", async () => {
    rows.push(character(PIP));
    const { f, updatedAt } = await start();
    await expect(f.setV3IdeaPlan({ ...ctx, data: { childId: C, id: COMIC, updatedAt, characterIds: [], confirm: true, environment: env } } as never)).rejects.toThrow(IDEA_CAST_PENDING);
    const p = await f.setV3IdeaPlan({ ...ctx, data: { childId: C, id: COMIC, updatedAt, characterIds: [PIP], count: 6, genre: "Mystery", confirm: true, environment: env } } as never);
    expect(p.workspace.ideaStage).toBeUndefined();
    expect(p.workspace.ideaStart).toBe(true);
    expect(p.details.genre).toBe("Mystery");
    expect(p.details.pages.flatMap((x: any) => x.panels)).toHaveLength(6);
    await expect(f.setV3IdeaPlan({ ...ctx, data: { childId: C, id: COMIC, updatedAt: p.updatedAt, characterIds: [], environment: env } } as never)).rejects.toThrow(IDEA_STARTED);
  });
});

describe("drawing waits for the confirmed cast (server)", () => {
  it("paintV3Scene refuses an idea comic still choosing characters, before any safety check, freeze or charge", async () => {
    const d = castStage({ characterIds: [PIP], styleKey: "cartoon" });
    rows.push({ id: COMIC, parent_id: P, child_id: C, kind: "comic", style_key: "cartoon", details: d, deleted_at: null, updated_at: "2026-11-23T10:00:00.000Z" });
    const panel = d.pages[0]!.panels[0]!;
    await expect((await fns()).paintV3Scene({ ...ctx, data: { childId: C, id: COMIC, updatedAt: "2026-11-23T10:00:00.000Z", itemId: panel.id, text: "Spark takes off", environment: env, op: "00000000-0000-4000-8000-0000000000f1" } } as never)).rejects.toThrow(IDEA_CAST_PENDING);
    expect(guard).not.toHaveBeenCalled();
    expect(charge).not.toHaveBeenCalled();
    expect(paid).not.toHaveBeenCalled();
  });
  it("covers and comic-maker drawings (freezeComicCast) refuse it too, before freezing", async () => {
    const { freezeComicCast } = await import("./comic.server");
    const ws = await import("./workspace.server");
    await expect(freezeComicCast(db as never, P, C, { id: COMIC, title: "x", data: castStage({ characterIds: [PIP] }) } as never, "cover")).rejects.toThrow(IDEA_CAST_PENDING);
    expect(ws.snapshotCast).not.toHaveBeenCalled();
    expect(charge).not.toHaveBeenCalled();
  });
});

describe("linked character drafts (server)", () => {
  it("links a new character to the child's own idea comic while choosing characters", async () => {
    const f = await fns();
    await f.saveV3Idea({ ...ctx, data: { childId: C, id: COMIC, idea: IDEA, done: true, environment: env } } as never);
    const draft = "00000000-0000-4000-8000-0000000000d1";
    const r = await f.saveV3CharacterDraft({ ...ctx, data: { childId: C, id: draft, description: IDEA, styleKey: "cartoon", environment: env, kind: "comic", base: 0, comicId: COMIC } } as never);
    expect(r.saved).toBe(true);
    expect(rows.find((x) => x.id === draft)!.details.forComic).toBe(COMIC);
    expect(rows.find((x) => x.id === draft)!.body).toBe(IDEA);
  });
  it("refuses linking to a comic that isn't choosing characters or isn't the child's", async () => {
    const f = await fns();
    rows.push({ id: COMIC, parent_id: "other-parent", child_id: C, kind: "comic", style_key: null, details: castStage(), deleted_at: null, updated_at: "x" });
    await expect(f.saveV3CharacterDraft({ ...ctx, data: { childId: C, id: "00000000-0000-4000-8000-0000000000d2", description: "Spark", styleKey: "cartoon", environment: env, base: 0, comicId: COMIC } } as never)).rejects.toThrow(/your own comic idea/);
  });
});

describe("A3.4.1 final: idea draft labels", () => {
  it("labels an unfinished idea comic with a short excerpt of the child's idea", async () => {
    const { ideaDraftLabel } = await import("./comic-idea");
    expect(ideaDraftLabel("My comic idea", "A little purple dragon named Spark is scared to fly but wants to visit the moon.")).toBe("A little purple dragon named…");
    expect(ideaDraftLabel("My comic idea", "Pip finds a map")).toBe("Pip finds a map");
  });
  it("never relabels a comic the child has named, and falls back without an idea", async () => {
    const { ideaDraftLabel } = await import("./comic-idea");
    expect(ideaDraftLabel("Spark Flies", "A dragon")).toBe("Spark Flies");
    expect(ideaDraftLabel("My comic idea", "")).toBe("My comic idea");
  });
});
