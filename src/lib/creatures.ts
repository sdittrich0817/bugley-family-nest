// Creature Lab parts and secret recipes (data so Part 2 can extend them).
export const PARTS = {
  body: ['round', 'tall', 'long', 'blob'],
  head: ['ears', 'horns', 'antennae', 'beak'],
  wings: ['none', 'feather', 'butterfly', 'bat'],
  tail: ['none', 'fish', 'dragon', 'fluffy'],
  pattern: ['plain', 'spots', 'stripes', 'stars'],
  color: ['1', '2', '3', '4', '5', '6'],
} as const;
export type Slot = keyof typeof PARTS;
export type Creature = { [K in Slot]: (typeof PARTS)[K][number] };
export const SLOT_LABEL: Record<Slot, string> = { body: 'Body', head: 'Head', wings: 'Wings', tail: 'Tail', pattern: 'Pattern', color: 'Color' };

export const SECRETS: { name: string; hint: string; match: Partial<Creature> }[] = [
  { name: 'Sky Dragon', hint: 'Horns, bat wings and a dragon tail…', match: { head: 'horns', wings: 'bat', tail: 'dragon' } },
  { name: 'Mer-Kitty', hint: 'Cat ears with a fish tail!', match: { head: 'ears', tail: 'fish' } },
  { name: 'Starfly', hint: 'Antennae, butterfly wings, covered in stars.', match: { head: 'antennae', wings: 'butterfly', pattern: 'stars' } },
  { name: 'Snoot Owl', hint: 'A beak, feather wings and a round body.', match: { head: 'beak', wings: 'feather', body: 'round' } },
  { name: 'Tiger Noodle', hint: 'Long and stripy with a fluffy tail.', match: { body: 'long', pattern: 'stripes', tail: 'fluffy' } },
  { name: 'Jelly Ghost', hint: 'A blob with no wings and no tail.', match: { body: 'blob', wings: 'none', tail: 'none' } },
  { name: 'Sunny Griffin', hint: 'Beak, feather wings, golden color.', match: { head: 'beak', wings: 'feather', color: '4' } },
  { name: 'Moon Moth', hint: 'Tall, antennae and spotty.', match: { body: 'tall', head: 'antennae', pattern: 'spots' } },
];
export function secretFor(c: Creature) { return SECRETS.find((s) => (Object.keys(s.match) as Slot[]).every((k) => s.match[k] === c[k])); }

const A = { round: 'Bubbo', tall: 'Stilto', long: 'Noodl', blob: 'Gloop' }, B = { ears: 'whisk', horns: 'horn', antennae: 'zap', beak: 'peep' }, C = { none: 'y', feather: 'flap', butterfly: 'flutter', bat: 'swoop', fish: 'fin', dragon: 'scale', fluffy: 'puff' } as Record<string, string>;
export function creatureName(c: Creature) { return secretFor(c)?.name ?? `${A[c.body]}-${B[c.head]}${c.wings !== 'none' ? C[c.wings] : C[c.tail]}`; }
export function randomCreature(r = Math.random): Creature {
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)]!;
  return { body: pick(PARTS.body), head: pick(PARTS.head), wings: pick(PARTS.wings), tail: pick(PARTS.tail), pattern: pick(PARTS.pattern), color: pick(PARTS.color) };
}
export const TOTAL_COMBOS = Object.values(PARTS).reduce((n, a) => n * a.length, 1);
