import { describe, expect, it } from 'vitest';
import { DIVES, DIVE_ITEMS, makeDive, oceanStars, seeded, sonarRead, SURE, THINGS } from './ocean-quest';

describe('ocean quest', () => {
  it('clear water sonar is always right and sure', () => {
    const r = seeded(1);
    for (const t of THINGS) for (let i = 0; i < 20; i++) { const s = sonarRead(t, 0, r); expect(s.right).toBe(true); expect(s.pct).toBeGreaterThanOrEqual(SURE); }
  });
  it('wrong sonar guesses always show a low sure-meter', () => {
    const r = seeded(2);
    for (let i = 0; i < 200; i++) { const s = sonarRead(THINGS[i % THINGS.length]!, 0.4, r); if (!s.right) expect(s.pct).toBeLessThan(SURE); }
  });
  it('murky dives always include a mistake to catch', () => {
    for (let seed = 0; seed < 30; seed++) for (const d of DIVES.slice(1)) {
      const w = makeDive(d, seeded(seed)); expect(w).toHaveLength(DIVE_ITEMS); expect(w.some((x) => !x.sonar.right)).toBe(true);
    }
  });
  it('stars', () => { expect(oceanStars(5, 5, 0)).toBe(0); expect(oceanStars(4, 5, 3)).toBe(3); expect(oceanStars(3, 5, 1)).toBe(2); expect(oceanStars(1, 5, 2)).toBe(1); });
});
