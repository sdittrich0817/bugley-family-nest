import { describe, expect, it } from 'vitest';
import { passesCharacterCheck } from './image-consistency';
describe('mandatory character consistency', () => {
  it('never delivers an image when the checker is unavailable', () => { expect(passesCharacterCheck(null)).toBe(false); expect(passesCharacterCheck({ pass: true, score: 90, issues: 'check unavailable' })).toBe(false); });
  it('never delivers a failed check even with a high score', () => { expect(passesCharacterCheck({ pass: false, score: 99 })).toBe(false); });
  it('requires a passing check and a score of at least 70', () => { expect(passesCharacterCheck({ pass: true, score: 69 })).toBe(false); expect(passesCharacterCheck({ pass: true, score: 70 })).toBe(true); });
});