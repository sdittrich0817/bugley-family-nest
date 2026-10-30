// Arcade catalog and private per-child progress. Game definitions are data so
// Part 2 ("Make it yours") can clone a configuration instead of rewriting a game.
import type { PlayKey } from './play';

export type ArcadeCategory = 'action' | 'puzzles' | 'creativity' | 'explore' | 'ai';
export const ARCADE_CATEGORIES: { key: ArcadeCategory; label: string }[] = [
  { key: 'action', label: 'Adventure & Action' },
  { key: 'puzzles', label: 'Puzzles & Brain Games' },
  { key: 'creativity', label: 'Creativity & Imagination' },
  { key: 'explore', label: 'Exploration & Discovery' },
  { key: 'ai', label: 'AI Learning' },
];

export type ArcadeId = PlayKey | 'cosmic_maze' | 'creature_lab_v2';
export type ArcadeGame = { id: ArcadeId; name: string; line: string; categories: ArcadeCategory[]; engine: 'play' | 'maze' | 'creatures'; controls: string };

export const ARCADE_GAMES: ArcadeGame[] = [
  { id: 'glow_dash', name: 'Glow Dash', line: 'Run, jump and scoop up glow through magical worlds!', categories: ['action'], engine: 'play', controls: 'Tap, Space or ↑ to jump (tap twice to double-jump)' },
  { id: 'creature_lab_v2', name: 'Creature Lab', line: 'Teach Bugley to sort creatures, then catch his mistakes!', categories: ['creativity', 'explore'], engine: 'creatures', controls: 'Tap parts and colors' },
  { id: 'cosmic_maze', name: 'Cosmic Maze', line: 'Program your rocket with if-then rules, then race Bugley!', categories: ['puzzles', 'explore'], engine: 'maze', controls: 'Build rules, then press Go' },
  { id: 'mystery_manor', name: 'Mystery Manor', line: 'One friend is a sneaky robot. Can you catch it?', categories: ['ai', 'puzzles'], engine: 'play', controls: 'Tap' },
  { id: 'bugley_guesses', name: 'Bugley Guesses', line: 'Think of anything. Bugley will read your mind!', categories: ['ai'], engine: 'play', controls: 'Tap or type' },
  { id: 'doodle_duel', name: 'Doodle Duel', line: 'Draw it fast. Can Bugley guess it?', categories: ['ai', 'creativity'], engine: 'play', controls: 'Draw with finger or mouse' },
  { id: 'say_see', name: 'Say It, See It', line: 'Say any word and watch it appear!', categories: ['ai', 'creativity'], engine: 'play', controls: 'Talk or type' },
  { id: 'story_blanks', name: 'Silly Story Blanks', line: 'Fill in the blanks. Get the silliest story ever!', categories: ['ai', 'creativity'], engine: 'play', controls: 'Tap or type' },
];
export const FEATURED: ArcadeId = 'glow_dash';

// ---------- private, per-child, on-device progress ----------
type Progress = { recent: ArcadeId[]; best: Partial<Record<ArcadeId, number>>; level: Partial<Record<ArcadeId, number>>; found: string[] };
const empty = (): Progress => ({ recent: [], best: {}, level: {}, found: [] });
const key = (childId: string) => `bugley-arcade:${childId}`;
export function readProgress(childId: string): Progress {
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(key(childId)) ?? '{}') }; } catch { return empty(); }
}
function write(childId: string, p: Progress) { try { localStorage.setItem(key(childId), JSON.stringify(p)); } catch { /* storage full or blocked */ } }
export function markPlayed(p: Progress, id: ArcadeId): Progress { return { ...p, recent: [id, ...p.recent.filter((r) => r !== id)].slice(0, 4) }; }
export function recordBest(p: Progress, id: ArcadeId, score: number): Progress { return (p.best[id] ?? -1) >= score ? p : { ...p, best: { ...p.best, [id]: score } }; }
export function unlockLevel(p: Progress, id: ArcadeId, level: number): Progress { return (p.level[id] ?? 0) >= level ? p : { ...p, level: { ...p.level, [id]: level } }; }
export function addFound(p: Progress, name: string): Progress { return p.found.includes(name) ? p : { ...p, found: [...p.found, name] }; }
export function updateProgress(childId: string, fn: (p: Progress) => Progress) { const next = fn(readProgress(childId)); write(childId, next); return next; }
