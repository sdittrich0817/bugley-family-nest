import { describe, it, expect } from 'vitest';
import { LABS, SECRET_RULES, learn, predictWith, truthFor, labStars } from './creature-teach';

const ex = (lab: (typeof LABS)[number], list: typeof lab.train, t: ReturnType<typeof truthFor>) => list.map((c) => ({ c, side: t(c) }));

describe('Teach Bugley labs', () => {
  it('Lab 1: Bugley learns the wings clue and passes every test', () => {
    const lab = LABS[0]!, t = truthFor(lab), clue = learn(ex(lab, lab.train, t));
    expect(clue.slot).toBe('wings');
    expect(lab.tests.every((c) => predictWith(clue, c) === t(c))).toBe(true);
  });
  it('Lab 2: Bugley first trusts the sneaky color, then the tail after more examples', () => {
    const lab = LABS[1]!, t = truthFor(lab);
    const first = learn(ex(lab, lab.train, t));
    expect(first.slot).toBe('color');
    expect(lab.tests.filter((c) => predictWith(first, c) !== t(c)).length).toBeGreaterThanOrEqual(2);
    const fixed = learn(ex(lab, [...lab.train, ...lab.extras], t));
    expect(fixed.slot).toBe('tail');
    expect(lab.tests.every((c) => predictWith(fixed, c) === t(c))).toBe(true);
  });
  it('Lab 3: Bugley discovers each secret rule', () => {
    const lab = LABS[2]!;
    for (const r of SECRET_RULES) {
      const t = truthFor(lab, r), clue = learn(ex(lab, lab.train, t));
      expect([clue.slot, clue.value]).toEqual([r.slot, r.value]);
      expect(lab.tests.every((c) => predictWith(clue, c) === t(c))).toBe(true);
    }
  });
  it('stars drop with missed catches', () => {
    expect([labStars(5, 5), labStars(4, 5), labStars(2, 5)]).toEqual([3, 2, 1]);
  });
});
