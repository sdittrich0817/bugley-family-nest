// Deterministic maze levels (data, not code) so levels are reusable and cloneable.
export const OPEN = { N: 1, E: 2, S: 4, W: 8 } as const;
export type Dir = keyof typeof OPEN;
export const STEP: Record<Dir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const BACK: Record<Dir, Dir> = { N: 'S', E: 'W', S: 'N', W: 'E' };
export type MazeLevel = { w: number; h: number; seed: number; cells: number[]; gems: number[]; exit: number; par: number };

function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

export function buildMaze(w: number, h: number, seed: number, gemCount: number): MazeLevel {
  const rand = rng(seed), cells = new Array(w * h).fill(0), seen = new Array(w * h).fill(false), stack = [0];
  seen[0] = true;
  while (stack.length) {
    const c = stack[stack.length - 1], x = c % w, y = Math.floor(c / w);
    const opts = (Object.keys(STEP) as Dir[]).filter((d) => { const nx = x + STEP[d][0], ny = y + STEP[d][1]; return nx >= 0 && ny >= 0 && nx < w && ny < h && !seen[ny * w + nx]; });
    if (!opts.length) { stack.pop(); continue; }
    const d = opts[Math.floor(rand() * opts.length)], n = (y + STEP[d][1]) * w + x + STEP[d][0];
    cells[c] |= OPEN[d]; cells[n] |= OPEN[BACK[d]]; seen[n] = true; stack.push(n);
  }
  const dist = distances(cells, w, h, 0);
  const exit = dist.indexOf(Math.max(...dist));
  // Gems hide in dead ends (discovery moments), farthest first.
  const ends = cells.map((v, i) => [i, v] as const).filter(([i, v]) => i !== 0 && i !== exit && [1, 2, 4, 8].includes(v)).sort((a, b) => dist[b[0]] - dist[a[0]]).map(([i]) => i);
  return { w, h, seed, cells, gems: ends.slice(0, gemCount), exit, par: dist[exit] };
}

export function distances(cells: number[], w: number, h: number, from: number) {
  const d = new Array(w * h).fill(-1), q = [from]; d[from] = 0;
  while (q.length) { const c = q.shift()!; for (const k of Object.keys(STEP) as Dir[]) if (cells[c] & OPEN[k]) { const n = c + STEP[k][0] + STEP[k][1] * w; if (d[n] < 0) { d[n] = d[c] + 1; q.push(n); } } }
  return d;
}

export function move(level: MazeLevel, at: number, d: Dir) { return level.cells[at] & OPEN[d] ? at + STEP[d][0] + STEP[d][1] * level.w : at; }

export const MAZE_WORLDS = ['Moon Meadow', 'Ring Planet', 'Comet Caves', 'Nebula Garden', 'Star Factory', 'Black-Hole Bend'] as const;
/** Six levels; younger kids start smaller, older kids get bigger mazes. */
export function mazeLevel(index: number, band: 'sprouts' | 'explorers' | 'builders'): MazeLevel {
  const base = band === 'sprouts' ? 4 : band === 'explorers' ? 6 : 8;
  const w = base + index, h = Math.max(4, base - 1 + Math.floor(index * 0.7));
  return buildMaze(w, h, 1000 + index * 97 + base, band === 'sprouts' ? 1 : 2 + Math.floor(index / 2));
}
/** 3 stars: all gems and near-par route. */
export function mazeStars(level: MazeLevel, moves: number, gems: number) { return 1 + (gems >= level.gems.length ? 1 : 0) + (moves <= level.par * 2 + level.gems.length * 4 ? 1 : 0); }
