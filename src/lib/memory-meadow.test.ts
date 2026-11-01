import { describe, expect, it } from 'vitest';
import { makeMeadow, meadowGuess, meadowMatch, MEADOW_ITEMS, MEADOW_ROUND_MS, teachMeadow } from './memory-meadow';
describe('Memory Meadow learning', () => {
  const butterfly = { key: 'b', item: MEADOW_ITEMS[0] };
  const dragon = { key: 'd', item: MEADOW_ITEMS[1] };
  const twin = { key: 'd2', item: MEADOW_ITEMS[1] };
  it('starts with coarse features and uses a checked correction immediately', () => {
    expect(meadowGuess(dragon, [butterfly, twin], [])?.key).toBe('b');
    const learned = teachMeadow([], dragon, twin);
    expect(meadowGuess(dragon, [butterfly, twin], learned)?.key).toBe('d2');
  });
  it('does not learn an incorrect pair or match a card with itself', () => {
    expect(teachMeadow([], dragon, butterfly)).toEqual([]);
    expect(meadowMatch(dragon, dragon)).toBe(false);
  });
  it('makes four genuine pairs, randomized without losing cards', () => {
    const deck = makeMeadow(() => 0.4);
    expect(new Set(deck.map(c => c.key)).size).toBe(8);
    for (const item of MEADOW_ITEMS) expect(deck.filter(c => c.item.id === item.id)).toHaveLength(2);
  });
  it('bounds a round to four minutes, strictly under five', () => { expect(MEADOW_ROUND_MS).toBe(240_000); });
});