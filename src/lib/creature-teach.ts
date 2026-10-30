// Creature Lab "Teach Bugley": a tiny explainable learner (one-clue decision stump)
// plus hand-authored labs. Pure data + logic so it can be tested and cloned.
import { PARTS, type Creature, type Slot } from './creatures';

export type Side = 0 | 1;
export type Clue = { slot: Slot; value: string; side: Side; acc: number };
export type Example = { c: Creature; side: Side };

// Bugley looks at the easiest-to-see things first: that is the lesson of Lab 2.
export const CLUE_ORDER: Slot[] = ['color', 'pattern', 'body', 'head', 'wings', 'tail'];
export const COLOR_NAME: Record<string, string> = { '1': 'pink', '2': 'green', '3': 'blue', '4': 'yellow', '5': 'purple', '6': 'teal' };
export const SLOT_WORD: Record<Slot, string> = { color: 'Color', pattern: 'Pattern', body: 'Body', head: 'Head', wings: 'Wings', tail: 'Tail' };

export function mk(body: Creature['body'], head: Creature['head'], wings: Creature['wings'], tail: Creature['tail'], pattern: Creature['pattern'], color: Creature['color']): Creature {
  return { body, head, wings, tail, pattern, color };
}

export function predictWith(clue: Clue, c: Creature): Side {
  return (c[clue.slot] === clue.value ? clue.side : 1 - clue.side) as Side;
}

/** Best single clue: first strictly-better clue in CLUE_ORDER wins ties. */
export function learn(examples: Example[]): Clue {
  let best: Clue = { slot: 'color', value: '1', side: 0, acc: -1 };
  for (const slot of CLUE_ORDER) for (const value of PARTS[slot] as readonly string[]) for (const side of [0, 1] as Side[]) {
    const cl = { slot, value, side, acc: 0 };
    const acc = examples.length ? examples.filter((e) => predictWith(cl, e.c) === e.side).length / examples.length : 0;
    if (acc > best.acc) best = { ...cl, acc };
  }
  return best;
}

/** How useful each kind of clue looked (best accuracy per slot) — Bugley's brain bars. */
export function clueScores(examples: Example[]): { slot: Slot; acc: number }[] {
  return CLUE_ORDER.map((slot) => ({ slot, acc: Math.max(...(PARTS[slot] as readonly string[]).flatMap((value) => ([0, 1] as Side[]).map((side) => examples.filter((e) => predictWith({ slot, value, side, acc: 0 }, e.c) === e.side).length / Math.max(1, examples.length)))) }));
}

export function phrase(slot: Slot, v: string): string {
  if (slot === 'color') return `is ${COLOR_NAME[v]}`;
  if (slot === 'wings') return v === 'none' ? 'has no wings' : `has ${v} wings`;
  if (slot === 'tail') return v === 'none' ? 'has no tail' : `has a ${v} tail`;
  if (slot === 'head') return v === 'beak' ? 'has a beak' : `has ${v}`;
  if (slot === 'pattern') return v === 'plain' ? 'is plain' : `has ${v}`;
  return `has a ${v} body`;
}

export type SecretRule = { id: string; label: string; emoji: string; slot: Slot; value: string };

// "Teach Bugley what a Glowbug is": the child picks the rule, Bugley learns it from examples.
export const SECRET_RULES: SecretRule[] = [
  { id: 'spots', label: 'Spotty ones', emoji: '🔴', slot: 'pattern', value: 'spots' },
  { id: 'horns', label: 'Ones with horns', emoji: '🦄', slot: 'head', value: 'horns' },
  { id: 'long', label: 'Long noodle bodies', emoji: '🐍', slot: 'body', value: 'long' },
];
export const STREAK_GOAL = 5;
/** Side 0 = Glowbug. */
export const isGlowbug = (r: SecretRule, c: Creature): Side => (c[r.slot] === r.value ? 0 : 1);

function build(r: SecretRule, yes: boolean, i: number, color: Creature['color']): Creature {
  const c = {} as Record<Slot, string>;
  for (const slot of Object.keys(PARTS) as Slot[]) {
    const all = PARTS[slot] as readonly string[];
    if (slot === 'color') c[slot] = color;
    else if (slot === r.slot) { const no = all.filter((v) => v !== r.value); c[slot] = yes ? r.value : no[i % no.length]!; }
    else c[slot] = all[(i + CLUE_ORDER.indexOf(slot)) % all.length]!;
  }
  return c as Creature;
}
/** Teaching cards: every Glowbug shown is pink (the sneaky clue), every other bug is not. */
export function teachDeck(r: SecretRule): Creature[] {
  return [build(r, true, 0, '1'), build(r, false, 0, '2'), build(r, true, 1, '1'), build(r, false, 1, '3'), build(r, true, 2, '1'), build(r, false, 2, '4')];
}
/** Bugley's quiz: the third bug is a non-pink Glowbug that exposes the sneaky clue. */
export function quizDeck(r: SecretRule): Creature[] {
  return [build(r, true, 3, '1'), build(r, false, 3, '5'), build(r, true, 1, '3'), build(r, false, 0, '1'), build(r, true, 2, '6'), build(r, false, 2, '2'), build(r, true, 0, '4'), build(r, false, 1, '3')];
}
export function judgeStars(mistakes: number): number { return mistakes <= 0 ? 3 : mistakes <= 2 ? 2 : 1; }
export const CLUE_EMOJI: Record<Slot, string> = { color: '🎨', pattern: '🔴', head: '🦄', body: '🐍', wings: '🪽', tail: '🐟' };
