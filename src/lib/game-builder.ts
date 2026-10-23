import { z } from "zod";
import type { Band } from "./games";

export const TEMPLATE_KEYS = ["maze", "catch", "jump", "quiz", "memory", "path"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];
export const TEMPLATES: Record<TemplateKey, { name: string; emoji: string; blurb: string }> = {
  maze: { name: "Maze Runner", emoji: "🧭", blurb: "Guide your hero through a maze to the goal." },
  catch: { name: "Catch It", emoji: "🧺", blurb: "Catch the good things, dodge the bad things." },
  jump: { name: "Jump & Dash", emoji: "🏃", blurb: "Run, jump the gaps and grab the coins." },
  quiz: { name: "Quiz Show", emoji: "🎤", blurb: "Write questions for your family to answer." },
  memory: { name: "Memory Match", emoji: "🃏", blurb: "Flip cards to find the pairs." },
  path: { name: "Choose Your Path", emoji: "🛤️", blurb: "Readers pick what happens next." },
};
/** Sprouts get only picture-based templates; everyone else gets all six. */
export const templatesFor = (band: Band): TemplateKey[] => band === "sprouts" ? ["catch", "memory"] : [...TEMPLATE_KEYS];
export const isAdvanced = (band: Band) => band === "builders";

// ---- Built-in art library ----
export const SPRITES = {
  heroes: ["🐰", "🐱", "🐶", "🦊", "🐸", "🐼", "🦄", "🐢", "🚀", "🧚", "🦖", "🐝"],
  good: ["⭐", "🍎", "💎", "🍪", "🌈", "🎈", "🍓", "🪙", "🌸", "🧁"],
  bad: ["🌧️", "🪨", "🌵", "👾", "🔥", "🧊", "🕷️", "💣"],
  goals: ["🏁", "🏰", "🎁", "🏆", "🚪", "🌟"],
} as const;
export const ALL_SPRITES: readonly string[] = Object.values(SPRITES).flat();
export const BACKGROUNDS = ["plain", "sky", "meadow", "night", "hills", "kitchen"] as const;
export const COLORS = ["glow", "sky", "leaf", "accent"] as const;

export const artRef = z.union([
  z.object({ kind: z.literal("sprite"), value: z.string().refine((v) => ALL_SPRITES.includes(v), "Pick from the library") }),
  z.object({ kind: z.literal("creation"), id: z.string().uuid() }),
]);
export type ArtRef = z.infer<typeof artRef>;
const txt = (n: number) => z.string().max(n);
export const gridSchema = z.object({ w: z.number().int().min(5).max(60), h: z.number().int().min(4).max(20), cells: z.string().max(1200).regex(/^[.#oxSGp]*$/) });
export type Grid = z.infer<typeof gridSchema>;
export const settingsSchema = z.object({
  heroName: txt(40), goal: txt(160), obstacle: txt(160), winText: txt(160),
  hero: artRef, goalArt: artRef, good: z.array(artRef).min(1).max(4), bad: z.array(artRef).min(1).max(4),
  speed: z.number().int().min(1).max(5), lives: z.number().int().min(1).max(5), timer: z.union([z.literal(0), z.literal(30), z.literal(60), z.literal(90), z.literal(120)]),
  difficulty: z.number().int().min(1).max(3), levels: z.number().int().min(1).max(5),
  color: z.enum(COLORS), background: z.enum(BACKGROUNDS), powerups: z.boolean(),
  winRule: z.enum(["goal", "score", "survive"]), winScore: z.number().int().min(3).max(50),
  grids: z.array(gridSchema).max(5),
  quiz: z.array(z.object({ q: txt(200), answers: z.array(txt(80)).min(2).max(4), correct: z.number().int().min(0).max(3) })).max(20),
  cards: z.array(artRef).max(12),
  path: z.array(z.object({ id: z.string().max(12), text: txt(400), choices: z.array(z.object({ text: txt(80), to: z.string().max(12) })).max(3) })).max(40),
});
export type Settings = z.infer<typeof settingsSchema>;
export const gameFileSchema = z.object({ template: z.enum(TEMPLATE_KEYS), settings: settingsSchema, published: z.boolean(), playtests: z.number().int().min(0) });
export type GameFile = z.infer<typeof gameFileSchema>;

const sprite = (value: string): ArtRef => ({ kind: "sprite", value });
export function defaultSettings(t: TemplateKey): Settings {
  const s: Settings = {
    heroName: "", goal: "", obstacle: "", winText: "You did it!",
    hero: sprite("🐰"), goalArt: sprite("🏁"), good: [sprite("⭐")], bad: [sprite("🪨")],
    speed: 2, lives: 3, timer: t === "catch" ? 60 : 0, difficulty: 1, levels: 1,
    color: "glow", background: "sky", powerups: false,
    winRule: t === "catch" ? "score" : "goal", winScore: 10,
    grids: [], quiz: [], cards: [], path: [],
  };
  if (t === "maze") s.grids = [generateMaze(1, 1)];
  if (t === "jump") s.grids = [generateJump(1, 1)];
  if (t === "quiz") s.quiz = [{ q: "", answers: ["", ""], correct: 0 }];
  if (t === "memory") s.cards = [sprite("🐰"), sprite("⭐"), sprite("🍎")];
  if (t === "path") s.path = [{ id: "start", text: "", choices: [] }];
  return s;
}
/** Every piece of child-written text in a game file, for the safety guard. */
export function gameTexts(title: string, s: Settings) {
  return [title, s.heroName, s.goal, s.obstacle, s.winText, ...s.quiz.flatMap((q) => [q.q, ...q.answers]), ...s.path.flatMap((n) => [n.text, ...n.choices.map((c) => c.text)])].map((t) => t.trim()).filter(Boolean);
}
export const creationRefs = (s: Settings) => [s.hero, s.goalArt, ...s.good, ...s.bad, ...s.cards].flatMap((r) => r.kind === "creation" ? [r.id] : []);

// ---- Level generators (seeded, deterministic) ----
function rng(seed: number) { let x = seed * 9301 + 49297; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; }
export const at = (g: Grid, x: number, y: number) => (x < 0 || y < 0 || x >= g.w || y >= g.h ? "#" : g.cells[y * g.w + x]!);
export const setAt = (g: Grid, x: number, y: number, c: string): Grid => ({ ...g, cells: g.cells.slice(0, y * g.w + x) + c + g.cells.slice(y * g.w + x + 1) });

export function generateMaze(difficulty: number, seed: number): Grid {
  const n = 4 + difficulty, w = n * 2 + 1, r = rng(seed);
  const cells = Array.from({ length: w * w }, () => "#");
  const seen = new Set<number>(); const stack = [[0, 0] as [number, number]]; seen.add(0);
  cells[1 * w + 1] = ".";
  while (stack.length) {
    const [cx, cy] = stack.at(-1)!;
    const next = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).map(([dx, dy]) => [cx + dx, cy + dy] as const).filter(([x, y]) => x >= 0 && y >= 0 && x < n && y < n && !seen.has(y * n + x));
    if (!next.length) { stack.pop(); continue; }
    const [nx, ny] = next[Math.floor(r() * next.length)]!;
    seen.add(ny * n + nx);
    cells[(cy * 2 + 1 + (ny - cy)) * w + cx * 2 + 1 + (nx - cx)] = ".";
    cells[(ny * 2 + 1) * w + nx * 2 + 1] = ".";
    stack.push([nx, ny]);
  }
  cells[1 * w + 1] = "S"; cells[(w - 2) * w + w - 2] = "G";
  const open = cells.map((c, i) => c === "." ? i : -1).filter((i) => i >= 0);
  for (let k = 0; k < 3 + difficulty; k++) { const i = open[Math.floor(r() * open.length)]!; if (cells[i] === ".") cells[i] = "o"; }
  for (let k = 0; k < difficulty * 2; k++) { const i = open[Math.floor(r() * open.length)]!; if (cells[i] === ".") cells[i] = "x"; }
  return { w, h: w, cells: cells.join("") };
}

export const JUMP_H = 7;
export function generateJump(difficulty: number, seed: number): Grid {
  const w = 24 + difficulty * 8, h = JUMP_H, r = rng(seed);
  const cells = Array.from({ length: w * h }, () => ".");
  for (let x = 0; x < w; x++) cells[(h - 1) * w + x] = "#";
  for (let x = 6; x < w - 4; x++) {
    const roll = r();
    if (roll < 0.06 + difficulty * 0.04) { cells[(h - 1) * w + x] = "."; if (difficulty > 1 && r() < 0.4) { x++; cells[(h - 1) * w + x] = "."; } x += 2; }
    else if (roll < 0.12 + difficulty * 0.05) { cells[(h - 2) * w + x] = "x"; x += 2; }
    else if (roll < 0.2 + difficulty * 0.03) { const y = h - 3 - Math.floor(r() * 2); for (let k = 0; k < 3 && x + k < w - 4; k++) cells[y * w + x + k] = "#"; cells[(y - 1) * w + x + 1] = "o"; x += 3; }
    else if (roll < 0.32) cells[(h - 2) * w + x] = "o";
  }
  cells[(h - 2) * w + 1] = "S"; cells[(h - 2) * w + w - 2] = "G";
  return { w, h, cells: cells.join("") };
}
/** Maze can be solved: a path of non-wall tiles links S to G. */
export function mazeSolvable(g: Grid) {
  const s = g.cells.indexOf("S"), goal = g.cells.indexOf("G");
  if (s < 0 || goal < 0) return false;
  const seen = new Set([s]); const q = [s];
  while (q.length) {
    const i = q.shift()!; if (i === goal) return true;
    const x = i % g.w, y = Math.floor(i / g.w);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx!, ny = y + dy!; const j = ny * g.w + nx; if (at(g, nx, ny) !== "#" && !seen.has(j)) { seen.add(j); q.push(j); } }
  }
  return false;
}

// ---- Bugley design coach: one note at a time, from the playtest ----
export type Playtest = { won: boolean; seconds: number; score: number; livesLost: number };
export type CoachNote = { note: string; fix?: { label: string; patch: Partial<Settings> } };
export const BIG_IDEA = "See how your words became game rules? That’s how people give instructions to computers and AI!";
export function coachNote(t: TemplateKey, s: Settings, p: Playtest): CoachNote {
  const action = ["maze", "catch", "jump"].includes(t);
  if (!p.won && p.seconds < 10) return { note: `You lost in ${Math.max(1, Math.round(p.seconds))} seconds. Too hard? Want to slow the obstacles down?`, ...(action && s.speed > 1 ? { fix: { label: "Slow it down", patch: { speed: s.speed - 1 } } } : {}) };
  if (!p.won && s.lives < 5) return { note: "So close! Want to give players one more life?", fix: { label: "Add a life", patch: { lives: s.lives + 1 } } };
  if (p.won && p.seconds < 15) return { note: "That was super easy! Add one more challenge?", ...(action ? { fix: s.speed < 5 ? { label: "Speed it up", patch: { speed: s.speed + 1 } } : { label: "Make it harder", patch: { difficulty: Math.min(3, s.difficulty + 1) } } } : {}) };
  if (p.won) return { note: "That felt just right! Want a family member to playtest it next?" };
  return { note: "Tricky one! Try playing again, or change a setting you’d like." };
}
