// Per-comic Story Memory (A2). Pure helpers: every item is an exact excerpt of one saved panel's child-written
// description, tied to that panel's text version (stamp). Items only count while their panel still says the same
// thing and is drawn, and only for later panels. Nothing here invents facts.
import type { CastSnapshot } from "./comic-continuity";

export const MEMORY_KINDS = ["place", "object", "character", "event"] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];
export type MemoryItem = { id: string; kind: MemoryKind; excerpt: string; panelId: string; stamp: string; order: number; supersedes: string[] };
export type StoryMemory = { v: 1; items: MemoryItem[]; noted: Record<string, string> };
export type RawMemoryItem = { kind: string; excerpt: string; supersedes: string[]; certain: boolean };
export type PanelNote = { panelId: string; stamp: string; items: RawMemoryItem[] };
export type PanelText = { id: string; description?: string | null; image?: string | null };
export type LiveItem = MemoryItem & { panel: number };

export const MEMORY_PROMPT_LIMIT = 600;
const MAX_PER_PANEL = 6;
const MAX_ITEMS = 150;
const MIN_EXCERPT = 3;
const MAX_EXCERPT = 120;

const collapse = (s: string) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();

/** Version of a panel's child-written description. Changes whenever the words change. */
export function panelStamp(description: string | null | undefined): string {
  const s = collapse(description ?? "");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `${s.length.toString(36)}-${h.toString(36)}`;
}

/** Tolerant read: anything malformed counts as no memory (older comics have none). */
export function readMemory(raw: unknown): StoryMemory {
  const r = raw as Partial<StoryMemory> | null | undefined;
  if (!r || r.v !== 1 || !Array.isArray(r.items)) return { v: 1, items: [], noted: {} };
  const items = r.items.filter((i): i is MemoryItem => !!i && typeof i.id === "string" && (MEMORY_KINDS as readonly string[]).includes(i.kind) && typeof i.excerpt === "string" && typeof i.panelId === "string" && typeof i.stamp === "string")
    .map(i => ({ ...i, order: Number(i.order) || 0, supersedes: Array.isArray(i.supersedes) ? i.supersedes.filter(s => typeof s === "string") : [] }));
  const noted = r.noted && typeof r.noted === "object" ? Object.fromEntries(Object.entries(r.noted).filter(([, v]) => typeof v === "string")) as Record<string, string> : {};
  return { v: 1, items, noted };
}

// A fact is skipped when its own clause negates, imagines, hopes, plans or doubts it.
const DOUBT = /\b(no|not|never|without|nobody|nothing|none|isn'?t|aren'?t|wasn'?t|weren'?t|doesn'?t|don'?t|didn'?t|can'?t|cannot|won'?t|wouldn'?t|maybe|might|perhaps|possibly|probably|pretends?|pretending|imagines?|imagining|dreams?|dreaming|wish(es)?|wonders?|wondering|hopes?|hoping|if|unless|almost|wants? to|plans? to|going to|will|looks? for|looking for|searching for|tries to find)\b/i;
// A newer item may replace an older one only when its clause says something changed.
const CHANGE = /\b(now|becomes?|became|turns?|turned|changes?|changed|broke|breaks|broken|lost|loses|left|leaves|moved|moves|instead|grew|grows|shrank|shrinks|melts?|melted|gone|finally|cracked|cracks|opened|opens|closed|closes|arrives?|arrived|reaches|reached|goes to|went to|enters|entered|lands?|landed|flies to|flew to|swims to|sails to|returns?|returned|fixed|fixes|painted|paints)\b/i;
const CLAUSE_BREAK = /[.!?;,]|\b(but|and|then|while|so|because)\b/gi;

/** The clause around an excerpt: from the last clause break before it to the end of the excerpt. */
function clauseOf(source: string, at: number, length: number) {
  let start = 0;
  for (const m of source.slice(0, at).matchAll(CLAUSE_BREAK)) start = (m.index ?? 0) + m[0].length;
  return source.slice(start, at + length);
}

/** Keep only certain, exact, non-negated excerpts; drop contradictions. Returns items in source order. */
export function groundItems(raw: RawMemoryItem[], panel: { id: string; description: string }, known: MemoryItem[], stamp = panelStamp(panel.description)): MemoryItem[] {
  const source = collapse(panel.description);
  const lower = source.toLowerCase();
  const knownIds = new Map(known.map(k => [k.id, k]));
  const kept: (MemoryItem & { at: number })[] = [];
  for (const r of raw) {
    if (!r || r.certain !== true || !(MEMORY_KINDS as readonly string[]).includes(r.kind)) continue;
    const wanted = collapse(String(r.excerpt ?? "")).replace(/^["']+|["'.,!?;:]+$/g, "").trim();
    if (wanted.length < MIN_EXCERPT || wanted.length > MAX_EXCERPT) continue;
    const at = lower.indexOf(wanted.toLowerCase());
    if (at < 0) continue; // not the child's exact words
    const clause = clauseOf(source, at, wanted.length);
    if (DOUBT.test(clause)) continue;
    const links = [...new Set((r.supersedes ?? []).filter(id => knownIds.get(id)?.kind === r.kind))];
    if (links.length && !CHANGE.test(clause)) continue; // claims a change the child didn't write: contradictory
    const excerpt = source.slice(at, at + wanted.length);
    const dupe = known.some(k => k.kind === r.kind && collapse(k.excerpt).toLowerCase() === excerpt.toLowerCase()) || kept.some(k => k.kind === r.kind && k.excerpt.toLowerCase() === excerpt.toLowerCase());
    if (dupe) continue;
    kept.push({ id: "", kind: r.kind as MemoryKind, excerpt, panelId: panel.id, stamp, order: 0, supersedes: links, at });
  }
  // Two new states replacing the same older item in one panel contradict each other: keep neither.
  const claims = new Map<string, number>();
  for (const k of kept) for (const s of k.supersedes) claims.set(s, (claims.get(s) ?? 0) + 1);
  return kept.filter(k => k.supersedes.every(s => claims.get(s) === 1)).sort((a, b) => a.at - b.at).slice(0, MAX_PER_PANEL)
    .map(({ at: _at, ...k }, i) => ({ ...k, id: `${stamp}:${i}`, order: i }));
}

/** Panels whose current words haven't been noted yet: earlier drawn panels (backfill) plus the current one. */
export function panelsToNote(memory: StoryMemory, panels: PanelText[], currentId: string, max = 8): PanelText[] {
  const at = panels.findIndex(p => p.id === currentId);
  const need = panels.filter((p, i) => p.description?.trim() && (p.id === currentId || (i < at && p.image)) && memory.noted[p.id] !== panelStamp(p.description));
  const current = need.filter(p => p.id === currentId);
  return [...need.filter(p => p.id !== currentId).slice(-(max - current.length)), ...current];
}

/** Merge extraction results. A note made for older words than the panel has now is discarded. */
export function mergeNotes(memory: StoryMemory, panels: PanelText[], notes: PanelNote[]): StoryMemory {
  let items = memory.items.filter(i => panels.some(p => p.id === i.panelId));
  const noted = Object.fromEntries(Object.entries(memory.noted).filter(([id]) => panels.some(p => p.id === id)));
  for (const n of notes) {
    const panel = panels.find(p => p.id === n.panelId);
    if (!panel?.description?.trim() || panelStamp(panel.description) !== n.stamp) continue; // stale: newer words saved since
    const others = items.filter(i => i.panelId !== n.panelId);
    const known = others.filter(i => i.stamp === panelStamp(panels.find(p => p.id === i.panelId)?.description));
    items = [...others, ...groundItems(n.items, { id: panel.id, description: panel.description }, known, n.stamp)];
    noted[n.panelId] = n.stamp;
  }
  const index = (id: string) => panels.findIndex(p => p.id === id);
  items.sort((a, b) => index(a.panelId) - index(b.panelId) || a.order - b.order);
  return { v: 1, items: items.slice(-MAX_ITEMS), noted };
}

/** What earlier, still-current, drawn panels established, oldest first, with replaced states removed. */
export function liveMemory(memory: StoryMemory, panels: PanelText[], currentId?: string): LiveItem[] {
  const cur = currentId ? panels.findIndex(p => p.id === currentId) : -1;
  const limit = cur < 0 ? panels.length : cur;
  const live: LiveItem[] = [];
  for (const i of memory.items) {
    const n = panels.findIndex(p => p.id === i.panelId);
    const p = panels[n];
    if (!p || n >= limit || !p.image || panelStamp(p.description) !== i.stamp) continue;
    live.push({ ...i, panel: n + 1 });
  }
  const replaced = new Set(live.flatMap(i => i.supersedes));
  return live.filter(i => !replaced.has(i.id)).sort((a, b) => a.panel - b.panel || a.order - b.order);
}

const LABEL: Record<MemoryKind, string> = { place: "Place", object: "Important object", character: "Story friend", event: "Happened" };
const STOP = new Set("the and with his her their they them then that this there from into onto over under for are was were has have had its it's a an of to in on at by up down out off all too very big small little some just like when where who what then also back again".split(" "));
/** Content words used to tell which remembered details the current panel is about (names count even when short). */
export function keyWords(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of collapse(text).matchAll(/[A-Za-z][A-Za-z'-]*/g)) {
    const w = m[0], low = w.toLowerCase().replace(/'s$/, "");
    if (STOP.has(low)) continue;
    if (low.length >= 3 || (/^[A-Z]/.test(w) && low.length >= 2)) out.add(low.length > 3 ? low.replace(/(es|s)$/, "") : low);
  }
  return out;
}
/** Budgeted prompt part, oldest first. Shorter repeats of a detail already described are left out. When space runs out, details the current
 *  panel mentions are kept longest, then story friends, objects, places and finally events (oldest dropped first in each group). */
export function memoryPrompt(items: LiveItem[], budget = MEMORY_PROMPT_LIMIT, focus = "", heroes: string[] = []): string {
  if (!items.length) return "";
  const head = "Established earlier in this story (the child's exact words, oldest first; newer details already replace older ones):";
  const tail = "Keep these consistent where they appear, but the current panel's instructions win.";
  const words = new Map(items.map(i => [i.id, keyWords(i.excerpt)]));
  let list = items.filter(i => !items.some(o => o !== i && o.kind === i.kind && words.get(o.id)!.size > words.get(i.id)!.size && [...words.get(i.id)!].every(w => words.get(o.id)!.has(w))));
  // The main heroes appear everywhere, so their names say nothing about relevance.
  const hero = keyWords(heroes.join(" "));
  const want = new Set([...keyWords(focus)].filter(w => !hero.has(w)));
  const rank = (i: LiveItem) => ([...words.get(i.id)!].some(w => want.has(w)) ? 0 : 1 + ["character", "object", "place", "event"].indexOf(i.kind));
  const text = () => `${head} ${list.map(i => `${LABEL[i.kind]} (panel ${i.panel}): "${i.excerpt}".`).join(" ")} ${tail}`;
  while (list.length && text().length > budget) {
    const worst = Math.max(...list.map(rank));
    list.splice(list.findIndex(i => rank(i) === worst), 1);
  }
  return list.length ? text() : "";
}

/** Cover: the child's own words lead; story details follow and are the only part that may be shortened. */
export function coverDescription(childText: string, memory: string): string {
  const words = childText.trim();
  return [words && `Cover (the child's words; follow them first): ${words}`, memory && memory.replace("but the current panel's instructions win", "but the child's cover words win")].filter(Boolean).join(" ");
}

/** Characters in the comic that don't have a frozen copy yet. */
export function missingSnapshotIds(snapshots: CastSnapshot[] | undefined | null, ids: string[]): string[] {
  const have = new Set((snapshots ?? []).map(s => s.id));
  return [...new Set(ids)].filter(id => !have.has(id));
}
/** Adds new frozen copies; existing copies are never replaced. */
export function mergeSnapshots(existing: CastSnapshot[] | undefined | null, added: CastSnapshot[]): CastSnapshot[] {
  const out = [...(existing ?? [])];
  for (const s of added) if (!out.some(e => e.id === s.id)) out.push(s);
  return out;
}

export const UNRELATED = ["none", "small", "big"] as const;
export const CHANGE_AREAS = ["none", "color", "background", "character", "object", "layout", "pose", "lighting", "style", "other"] as const;
export type RevisionVerdict = { changeApplied: boolean; unrelatedChange: (typeof UNRELATED)[number]; area: (typeof CHANGE_AREAS)[number] };
/** Private, report-only log fields. Carries no child words. */
export function revisionLogRow(v: RevisionVerdict | null) {
  if (!v) return { passed: false, score: 0, notes: "revision check · unavailable", checker_available: false };
  const score = v.unrelatedChange === "none" ? 100 : v.unrelatedChange === "small" ? 60 : 20;
  return { passed: v.changeApplied, score, notes: `revision check · requested change made: ${v.changeApplied ? "yes" : "no"} · unrelated change: ${v.unrelatedChange}${v.unrelatedChange === "none" ? "" : ` (${v.area})`}`, checker_available: true };
}
