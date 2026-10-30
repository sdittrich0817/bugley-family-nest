import { describe, it, expect } from 'vitest';
import { doodlePoints, doodleTarget, DOODLE_TURNS } from './play';
describe('Doodle Duel rules', () => {
  it('first-try guess scores 3, later guesses 2', () => { expect(doodlePoints(1)).toBe(3); expect(doodlePoints(2)).toBe(2); });
  it('every turn is a drawing with a target', () => { for (let t = 0; t < DOODLE_TURNS; t++) expect(doodleTarget(t)).toBeTruthy(); expect(DOODLE_TURNS).toBe(3); });
});
