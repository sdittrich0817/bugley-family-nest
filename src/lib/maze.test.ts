import { describe, expect, it } from 'vitest';
import { distances, mazeLevel, mazeStars, move } from './maze';
import { markPlayed, recordBest } from './arcade';

describe('cosmic maze levels', () => {
  it('every cell of every level is reachable and the exit is solvable', () => {
    for (const band of ['sprouts', 'explorers', 'builders'] as const) for (let i = 0; i < 6; i++) {
      const l = mazeLevel(i, band), d = distances(l.cells, l.w, l.h, 0);
      expect(d.every((x) => x >= 0)).toBe(true);
      expect(l.par).toBeGreaterThan(0);
    }
  });
  it('is deterministic per level', () => { expect(mazeLevel(2, 'explorers')).toEqual(mazeLevel(2, 'explorers')); });
  it('walls block movement', () => { const l = mazeLevel(0, 'sprouts'); expect(move(l, 0, 'N')).toBe(0); expect(move(l, 0, 'W')).toBe(0); });
  it('younger kids get smaller mazes', () => { expect(mazeLevel(0, 'sprouts').w).toBeLessThan(mazeLevel(0, 'builders').w); });
  it('stars reward gems and a good route', () => { const l = mazeLevel(0, 'explorers'); expect(mazeStars(l, l.par, l.gems.length)).toBe(3); expect(mazeStars(l, 999, 0)).toBe(1); });
});
describe('arcade progress', () => {
  it('keeps the 4 most recent games without duplicates', () => {
    let p = { recent: [], best: {}, level: {}, found: [] } as any;
    for (const id of ['glow_dash', 'cosmic_maze', 'say_see', 'doodle_duel', 'glow_dash'] as const) p = markPlayed(p, id);
    expect(p.recent).toEqual(['glow_dash', 'doodle_duel', 'say_see', 'cosmic_maze']);
  });
  it('only keeps a personal best when beaten', () => { let p = recordBest({ recent: [], best: {}, level: {}, found: [] }, 'cosmic_maze', 5); p = recordBest(p, 'cosmic_maze', 3); expect(p.best.cosmic_maze).toBe(5); });
});
