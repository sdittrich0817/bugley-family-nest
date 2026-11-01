import KNN from 'ml-knn';

export const MEADOW_ROUND_MS = 240_000;
export const MEADOW_ITEMS = [
  { id: 'butterfly', name: 'Blue butterfly', color: 'blue', shape: 'wings', detail: 'wide wings', code: 0 },
  { id: 'dragonfly', name: 'Blue dragonfly', color: 'blue', shape: 'wings', detail: 'long body', code: 1 },
  { id: 'bee', name: 'Yellow bee', color: 'yellow', shape: 'round', detail: 'stripes', code: 0 },
  { id: 'ladybug', name: 'Yellow ladybug', color: 'yellow', shape: 'round', detail: 'dots', code: 1 },
] as const;
export type MeadowItem = typeof MEADOW_ITEMS[number];
export type MeadowCard = { key: string; item: MeadowItem };
export type MeadowLearning = Array<'blue' | 'yellow'>;
export function makeMeadow(random = Math.random): MeadowCard[] {
  const cards = MEADOW_ITEMS.flatMap(item => [0, 1].map(n => ({ key: `${item.id}-${n}`, item })));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = cards[i], b = cards[j];
    if (a && b) { cards[i] = b; cards[j] = a; }
  }
  return cards;
}
export function meadowFeatures(item: MeadowItem, learned: MeadowLearning): number[] {
  return [item.color === 'blue' ? 0 : 4, learned.includes(item.color) ? item.code * 2 : 0];
}
/** A small real nearest-example model. At first similar-looking bugs share a
 * feature vector; checked pairs teach it to include their distinguishing detail. */
export function meadowGuess(first: MeadowCard, candidates: MeadowCard[], learned: MeadowLearning): MeadowCard | undefined {
  if (!candidates.length) return;
  const model = new KNN(candidates.map(c => meadowFeatures(c.item, learned)), candidates.map((_, i) => i), { k: 1 });
  const index = model.predict([meadowFeatures(first.item, learned)])[0];
  return index === undefined ? undefined : candidates[index];
}
export function meadowMatch(a: MeadowCard, b: MeadowCard): boolean { return a.key !== b.key && a.item.id === b.item.id; }
export function teachMeadow(learned: MeadowLearning, a: MeadowCard, b: MeadowCard): MeadowLearning {
  return meadowMatch(a, b) && !learned.includes(a.item.color) ? [...learned, a.item.color] : learned;
}