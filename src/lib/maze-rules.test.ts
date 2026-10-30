import { describe, expect, it } from 'vitest';
import { BUGLEY_RULES, RACE_TRACKS, RULE_LEVELS, runRules, rulesStars } from './maze-rules';

describe('rocket rules', () => {
  it('every world is solvable with its reference rules for 3 stars', () => {
    for (const l of RULE_LEVELS) { const r = runRules(l.grid, l.reference); expect(r.result, l.name).toBe('portal'); expect(rulesStars(l, r, l.reference.length), l.name).toBe(3); }
  });
  it('a dead end with no matching rule stops the rocket', () => {
    expect(runRules(RULE_LEVELS[3]!.grid, [{ if: 'ahead', then: 'forward' }]).result).toBe('stuck');
  });
  it('rules that bounce back and forth are caught as a loop', () => {
    expect(runRules(RULE_LEVELS[3]!.grid, [{ if: 'ahead', then: 'forward' }, { if: 'always', then: 'back' }]).result).toBe('loop');
  });
  it('going forward into a wall is a bonk', () => {
    expect(runRules(RULE_LEVELS[1]!.grid, [{ if: 'always', then: 'forward' }]).result).toBe('bonk');
  });
  it('world 1 needs only one rule; extra worlds cap rules at 4', () => {
    expect(RULE_LEVELS[0]!.maxRules).toBe(1);
    expect(Math.max(...RULE_LEVELS.map((l) => l.maxRules))).toBe(4);
  });
  it('three race tracks exist and Bugley can be beaten on each', () => {
    expect(RACE_TRACKS).toHaveLength(3);
    for (const t of RACE_TRACKS) expect(runRules(t, BUGLEY_RULES).result).toBe('portal');
  });
});
