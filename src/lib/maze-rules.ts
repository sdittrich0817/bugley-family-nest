// Cosmic Maze "Rocket Rules": the child programs the rocket with if-then rules.
// The rocket checks its rules top to bottom every step and does the first one that fits.
import { buildMaze, OPEN, STEP, type Dir } from './maze';

export type Cond = 'ahead' | 'right' | 'left' | 'always';
export type Act = 'forward' | 'right' | 'left' | 'back';
export type Rule = { if: Cond; then: Act };
export type Grid = { w: number; h: number; walls: boolean[]; start: number; portal: number; gems: number[] };
export type RulesLevel = { name: string; goal: string; tip: string; grid: Grid; maxRules: number; parRules: number; reference: Rule[] };

export const COND_LABEL: Record<Cond, string> = { ahead: 'path ahead', right: 'path on my right', left: 'path on my left', always: 'anything else' };
export const ACT_LABEL: Record<Act, string> = { forward: 'go forward', right: 'turn right & go', left: 'turn left & go', back: 'turn around' };

const DIRS: Dir[] = ['N', 'E', 'S', 'W'];
const turn = (d: Dir, by: number) => DIRS[(DIRS.indexOf(d) + by + 4) % 4]!;

export function parseGrid(rows: string[]): Grid {
  const h = rows.length, w = rows[0]!.length, walls: boolean[] = [], gems: number[] = [];
  let start = 0, portal = 0;
  rows.forEach((r, y) => [...r].forEach((ch, x) => { const i = y * w + x; walls[i] = ch === '#'; if (ch === 'S') start = i; if (ch === 'P') portal = i; if (ch === '*') gems.push(i); }));
  return { w, h, walls, start, portal, gems };
}

/** Turn a generated edge maze into a block grid (each cell + open sides become path squares). */
export function gridFromSeed(cw: number, ch: number, seed: number, gemCount: number): Grid {
  const m = buildMaze(cw, ch, seed, gemCount), w = cw * 2 + 1, h = ch * 2 + 1, walls = new Array(w * h).fill(true);
  const at = (c: number) => (Math.floor(c / cw) * 2 + 1) * w + (c % cw) * 2 + 1;
  m.cells.forEach((v, c) => { const i = at(c); walls[i] = false; if (v & OPEN.E) walls[i + 1] = false; if (v & OPEN.S) walls[i + w] = false; });
  return { w, h, walls, start: at(0), portal: at(m.exit), gems: m.gems.map(at) };
}

const RIGHT_HAND: Rule[] = [{ if: 'right', then: 'right' }, { if: 'ahead', then: 'forward' }, { if: 'left', then: 'left' }, { if: 'always', then: 'back' }];
/** Bugley's own racing rules: hug the left wall. */
export const BUGLEY_RULES: Rule[] = [{ if: 'left', then: 'left' }, { if: 'ahead', then: 'forward' }, { if: 'right', then: 'right' }, { if: 'always', then: 'back' }];

export const RULE_LEVELS: RulesLevel[] = [
  { name: 'Moon Meadow', goal: 'Teach the rocket to fly straight to the portal.', tip: 'One rule is enough: if there is a path ahead, go forward.', maxRules: 1, parRules: 1, reference: [{ if: 'ahead', then: 'forward' }],
    grid: parseGrid(['#######', '#S..*P#', '#######']) },
  { name: 'Ring Planet', goal: 'The path bends! Add a rule for turning.', tip: 'When the path ahead ends, the way on is to the rocket’s right.', maxRules: 2, parRules: 2, reference: [{ if: 'ahead', then: 'forward' }, { if: 'right', then: 'right' }],
    grid: parseGrid(['######', '#S..##', '###.##', '###*##', '###P##', '######']) },
  { name: 'Comet Caves', goal: 'Now it bends both ways. Can your rules handle it?', tip: 'You need a rule for each way the path can turn.', maxRules: 3, parRules: 3, reference: [{ if: 'ahead', then: 'forward' }, { if: 'right', then: 'right' }, { if: 'left', then: 'left' }],
    grid: parseGrid(['#######', '#S.####', '##.####', '##...##', '####*##', '####P##', '#######']) },
  { name: 'Nebula Garden', goal: 'Watch out for the dead end! Rule order matters.', tip: 'The rocket does the FIRST rule that fits. Try moving a turning rule to the top.', maxRules: 4, parRules: 4, reference: RIGHT_HAND,
    grid: parseGrid(['########', '#S....##', '####*###', '####P###', '########']) },
  { name: 'Star Factory', goal: 'A real maze! One clever set of rules can solve it.', tip: 'Space pilots hug one wall: always try turning right first, and turn around at dead ends.', maxRules: 4, parRules: 4, reference: RIGHT_HAND, grid: gridFromSeed(4, 4, 103, 1) },
  { name: 'Black-Hole Bend', goal: 'The biggest maze. Will your rules still work?', tip: 'Good rules work on mazes they have never seen. That is what makes them smart!', maxRules: 4, parRules: 4, reference: RIGHT_HAND, grid: gridFromSeed(5, 5, 104, 2) },
];

/** Race tracks: mazes where hugging the right wall beats Bugley's left-wall rules. */
export const RACE_TRACKS: Grid[] = (() => {
  const out: Grid[] = [];
  for (let seed = 1; out.length < 3 && seed < 500; seed++) {
    const g = gridFromSeed(5, 4, seed * 31, 1), mine = runRules(g, RIGHT_HAND), bug = runRules(g, BUGLEY_RULES);
    if (mine.result === 'portal' && bug.result === 'portal' && bug.steps.length - mine.steps.length >= 6) out.push(g);
  }
  return out;
})();
export const RACE_UNLOCK = 3; // race opens after the first three worlds

export type Pose = { at: number; dir: Dir };
export type Step = Pose & { rule: number; gem?: number | undefined };
export type Outcome = 'portal' | 'stuck' | 'bonk' | 'loop' | 'tired';
export type RunResult = { steps: Step[]; result: Outcome; gems: number[] };

function open(g: Grid, at: number, d: Dir) { const x = (at % g.w) + STEP[d][0], y = Math.floor(at / g.w) + STEP[d][1]; return x >= 0 && y >= 0 && x < g.w && y < g.h && !g.walls[y * g.w + x] ? y * g.w + x : -1; }

export function sees(g: Grid, p: Pose, c: Cond) { return c === 'always' || open(g, p.at, c === 'ahead' ? p.dir : turn(p.dir, c === 'right' ? 1 : -1)) >= 0; }

/** Runs rules exactly as written. Pure and deterministic so tests and the screen agree. */
export function runRules(g: Grid, rules: Rule[], limit = 300): RunResult {
  let p: Pose = { at: g.start, dir: 'E' };
  const steps: Step[] = [], got: number[] = [], seen = new Set<string>();
  while (steps.length < limit) {
    if (p.at === g.portal) return { steps, result: 'portal', gems: got };
    const key = `${p.at}-${p.dir}-${got.length}`;
    if (seen.has(key)) return { steps, result: 'loop', gems: got };
    seen.add(key);
    const rule = rules.findIndex((r) => sees(g, p, r.if));
    if (rule < 0) return { steps, result: 'stuck', gems: got };
    const a = rules[rule]!.then, dir = a === 'forward' ? p.dir : a === 'right' ? turn(p.dir, 1) : a === 'left' ? turn(p.dir, -1) : turn(p.dir, 2);
    if (a === 'back') { p = { at: p.at, dir }; steps.push({ ...p, rule }); continue; }
    const next = open(g, p.at, dir);
    if (next < 0) { steps.push({ at: p.at, dir, rule }); return { steps, result: 'bonk', gems: got }; }
    p = { at: next, dir };
    const gem = g.gems.includes(next) && !got.includes(next) ? next : undefined;
    if (gem !== undefined) got.push(gem);
    steps.push({ ...p, rule, gem });
  }
  return { steps, result: 'tired', gems: got };
}

/** 1 star for the portal, +1 for every gem, +1 for using no more rules than needed. */
export function rulesStars(level: RulesLevel, run: RunResult, ruleCount: number) {
  if (run.result !== 'portal') return 0;
  return 1 + (run.gems.length >= level.grid.gems.length ? 1 : 0) + (ruleCount <= level.parRules ? 1 : 0);
}

export const OUTCOME_LINE: Record<Exclude<Outcome, 'portal'>, string> = {
  stuck: 'None of my rules fit here, so I stopped. Add a rule for this spot!',
  bonk: 'Bonk! A rule told me to go that way, but there was a wall. I do exactly what the rules say.',
  loop: 'I’m going in circles! My rules keep sending me back to the same place.',
  tired: 'I flew a very long way and never found the portal. Try different rules!',
};
