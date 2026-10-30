import { describe, it, expect } from 'vitest';
import { SECRET_RULES, learn, predictWith, isGlowbug, teachDeck, quizDeck, judgeStars, STREAK_GOAL, type Example } from './creature-teach';

describe('Teach Bugley what a Glowbug is', () => {
  for (const r of SECRET_RULES) it(`${r.id}: Bugley first trusts pink, gets caught, then learns the real rule`, () => {
    const ex: Example[] = teachDeck(r).map((c) => ({ c, side: isGlowbug(r, c) }));
    let clue = learn(ex);
    expect([clue.slot, clue.value]).toEqual(['color', '1']);
    const quiz = quizDeck(r);
    expect(predictWith(clue, quiz[0]!)).toBe(isGlowbug(r, quiz[0]!));
    expect(predictWith(clue, quiz[2]!)).not.toBe(isGlowbug(r, quiz[2]!));
    clue = learn([...ex, { c: quiz[2]!, side: isGlowbug(r, quiz[2]!) }]);
    expect([clue.slot, clue.value]).toEqual([r.slot, r.value]);
    const rest = quiz.slice(3);
    expect(rest.length).toBe(STREAK_GOAL);
    expect(rest.every((c) => predictWith(clue, c) === isGlowbug(r, c))).toBe(true);
  });
  it('stars drop with checking mistakes', () => {
    expect([judgeStars(0), judgeStars(2), judgeStars(3)]).toEqual([3, 2, 1]);
  });
});
