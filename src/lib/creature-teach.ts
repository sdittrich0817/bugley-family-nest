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
export type Lab = {
  id: string; title: string; emoji: string; zone: [string, string]; habitats: [{ name: string; emoji: string; tone: string }, { name: string; emoji: string; tone: string }];
  mission: string; truth?: (c: Creature) => Side; train: Creature[]; extras: Creature[]; tests: Creature[]; secret: string; choose?: SecretRule[];
};

export const SECRET_RULES: SecretRule[] = [
  { id: 'spots', label: 'Spotty creatures', emoji: '🔴', slot: 'pattern', value: 'spots' },
  { id: 'horns', label: 'Creatures with horns', emoji: '🦄', slot: 'head', value: 'horns' },
  { id: 'long', label: 'Long noodle bodies', emoji: '🐍', slot: 'body', value: 'long' },
];

export const LABS: Lab[] = [
  {
    id: 'sky', title: 'Sky or Ground?', emoji: '☁️', zone: ['Sky Nest', 'Ground Burrow'],
    habitats: [{ name: 'Sky Nest', emoji: '☁️', tone: 'lab-sky' }, { name: 'Ground Burrow', emoji: '🕳️', tone: 'lab-burrow' }],
    mission: 'Creatures with wings live in the Sky Nest. No wings? Ground Burrow! Sort them so Bugley can learn.',
    truth: (c) => (c.wings === 'none' ? 1 : 0),
    train: [mk('round', 'ears', 'feather', 'none', 'spots', '1'), mk('round', 'horns', 'none', 'fish', 'stripes', '1'), mk('tall', 'antennae', 'butterfly', 'fluffy', 'plain', '4'), mk('blob', 'ears', 'none', 'none', 'spots', '4'), mk('long', 'beak', 'bat', 'dragon', 'stars', '5'), mk('tall', 'beak', 'none', 'dragon', 'plain', '6')],
    extras: [],
    tests: [mk('blob', 'horns', 'bat', 'none', 'plain', '2'), mk('long', 'ears', 'none', 'fluffy', 'stars', '5'), mk('round', 'antennae', 'butterfly', 'fish', 'stripes', '6'), mk('tall', 'horns', 'none', 'none', 'spots', '3'), mk('round', 'beak', 'feather', 'dragon', 'plain', '1')],
    secret: 'AI learns from examples. Nobody told Bugley the rule — he figured it out from what you sorted!',
  },
  {
    id: 'pond', title: 'The Sneaky Clue', emoji: '🐟', zone: ['Splash Pond', 'Flower Meadow'],
    habitats: [{ name: 'Splash Pond', emoji: '💧', tone: 'lab-pond' }, { name: 'Flower Meadow', emoji: '🌼', tone: 'lab-meadow' }],
    mission: 'Creatures with a fish tail live in the Splash Pond. Everyone else plays in the Flower Meadow!',
    truth: (c) => (c.tail === 'fish' ? 0 : 1),
    train: [mk('round', 'ears', 'none', 'fish', 'plain', '3'), mk('tall', 'beak', 'feather', 'fluffy', 'plain', '2'), mk('long', 'horns', 'feather', 'fish', 'spots', '3'), mk('round', 'ears', 'butterfly', 'none', 'spots', '1'), mk('blob', 'antennae', 'none', 'fish', 'stripes', '3'), mk('long', 'horns', 'none', 'dragon', 'stars', '4')],
    extras: [mk('blob', 'horns', 'none', 'dragon', 'spots', '3'), mk('tall', 'ears', 'none', 'fish', 'plain', '4'), mk('round', 'antennae', 'feather', 'fluffy', 'stars', '3')],
    tests: [mk('tall', 'beak', 'none', 'none', 'plain', '3'), mk('round', 'horns', 'bat', 'fish', 'spots', '2'), mk('blob', 'ears', 'none', 'fish', 'stars', '3'), mk('long', 'antennae', 'butterfly', 'fluffy', 'stripes', '5'), mk('round', 'beak', 'none', 'fish', 'plain', '6')],
    secret: 'AI copies ANY pattern in its examples — even a sneaky wrong one. Showing it more different examples fixes it!',
  },
  {
    id: 'secret', title: 'Guess My Secret', emoji: '🤫', zone: ['Secret Club', 'Everyone Else'],
    habitats: [{ name: 'Secret Club', emoji: '👑', tone: 'lab-club' }, { name: 'Everyone Else', emoji: '🎈', tone: 'lab-other' }],
    mission: 'Pick a secret rule. Sort the creatures by it — Bugley has to work out your secret!',
    choose: SECRET_RULES,
    train: [mk('long', 'horns', 'none', 'none', 'spots', '1'), mk('round', 'ears', 'none', 'fluffy', 'plain', '1'), mk('long', 'ears', 'feather', 'fish', 'spots', '2'), mk('tall', 'horns', 'none', 'fish', 'stars', '6'), mk('long', 'horns', 'bat', 'fluffy', 'plain', '3'), mk('blob', 'antennae', 'feather', 'dragon', 'spots', '2'), mk('long', 'beak', 'none', 'dragon', 'stripes', '4'), mk('round', 'horns', 'butterfly', 'none', 'spots', '5')],
    extras: [],
    tests: [mk('long', 'ears', 'none', 'none', 'stars', '5'), mk('round', 'horns', 'feather', 'fish', 'plain', '4'), mk('tall', 'beak', 'bat', 'none', 'spots', '3'), mk('blob', 'antennae', 'none', 'fluffy', 'plain', '6')],
    secret: 'AI can discover a hidden rule just from examples. That is how apps guess which songs you like!',
  },
];

export function truthFor(lab: Lab, rule?: SecretRule): (c: Creature) => Side {
  if (lab.truth) return lab.truth;
  const r = rule ?? SECRET_RULES[0]!;
  return (c) => (c[r.slot] === r.value ? 0 : 1);
}

export function labStars(childCorrect: number, total: number): number {
  const miss = total - childCorrect;
  return miss <= 0 ? 3 : miss === 1 ? 2 : 1;
}
