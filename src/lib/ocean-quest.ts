// Ocean Quest: steer a submarine while Bugley's sonar (a tiny practice "AI")
// labels what's ahead. In murky water the sonar is less sure and sometimes wrong.
// Lesson: low confidence means look for yourself.
import { seeded } from './manor-cases';
type Rng = () => number;

export type Kind = 'treasure' | 'danger';
export type Thing = { id: string; emoji: string; name: string; kind: Kind };
export const THINGS: Thing[] = [
  { id: 'pearl', emoji: '🦪', name: 'pearl', kind: 'treasure' },
  { id: 'shell', emoji: '🐚', name: 'shell', kind: 'treasure' },
  { id: 'coin', emoji: '🪙', name: 'gold coin', kind: 'treasure' },
  { id: 'gem', emoji: '💎', name: 'gem', kind: 'treasure' },
  { id: 'star', emoji: '⭐', name: 'sea star', kind: 'treasure' },
  { id: 'jelly', emoji: '🪼', name: 'jellyfish', kind: 'danger' },
  { id: 'puffer', emoji: '🐡', name: 'pufferfish', kind: 'danger' },
  { id: 'squid', emoji: '🦑', name: 'inky squid', kind: 'danger' },
];

export type Dive = { key: string; name: string; emoji: string; murk: number; blurb: string };
export const DIVES: Dive[] = [
  { key: 'shallows', name: 'Sunny Shallows', emoji: '☀️', murk: 0, blurb: 'Clear water. The sonar sees well.' },
  { key: 'kelp', name: 'Kelp Forest', emoji: '🌿', murk: 0.2, blurb: 'Wavy kelp. The sonar gets a little confused.' },
  { key: 'deep', name: 'Midnight Deep', emoji: '🌙', murk: 0.4, blurb: 'So dark! Watch the sonar’s sure-meter.' },
];

export const LANES = 3;
export const DIVE_ITEMS = 12;
export type Sonar = { label: Kind; pct: number; right: boolean };
export type Wave = { thing: Thing; lane: number; sonar: Sonar };

/** Sonar guess: wrong guesses always come with a low sure-meter. */
export function sonarRead(thing: Thing, murk: number, r: Rng): Sonar {
  const wrong = r() < murk;
  if (wrong) return { label: thing.kind === 'treasure' ? 'danger' : 'treasure', pct: 40 + Math.floor(r() * 21), right: false };
  const top = Math.round(98 - murk * 70);
  return { label: thing.kind, pct: Math.max(55, top - Math.floor(r() * 12)), right: true };
}

export function makeDive(dive: Dive, r: Rng = Math.random): Wave[] {
  const waves: Wave[] = Array.from({ length: DIVE_ITEMS }, () => {
    const thing = THINGS[Math.floor(r() * THINGS.length)]!;
    return { thing, lane: Math.floor(r() * LANES), sonar: sonarRead(thing, dive.murk, r) };
  });
  // Every murky dive shows at least one mistake to catch.
  if (dive.murk > 0 && !waves.some((w) => !w.sonar.right)) {
    const w = waves[5]!;
    w.sonar = { label: w.thing.kind === 'treasure' ? 'danger' : 'treasure', pct: 48, right: false };
  }
  return waves;
}

export const SURE = 70;
export function oceanStars(treasure: number, totalTreasure: number, hearts: number): 0 | 1 | 2 | 3 {
  if (hearts <= 0) return 0;
  const share = totalTreasure ? treasure / totalTreasure : 1;
  return share >= 0.75 && hearts >= 3 ? 3 : share >= 0.5 ? 2 : 1;
}
export { seeded };
