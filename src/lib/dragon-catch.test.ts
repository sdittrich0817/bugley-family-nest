import { describe, expect, it } from 'vitest';
import { cameraGuess, checkPhoto, makeFlight, PHOTO_GOAL, ROUND_MS, teachCamera } from './dragon-catch';
describe('Dragon Catch practice camera', () => {
  it('offers six real dragon photos in every flight', () => {
    for (let i = 0; i < 30; i++) { const deck = makeFlight(); expect(deck.filter(s => s.dragon)).toHaveLength(6); expect(new Set(deck.map(s => s.id)).size).toBe(12); }
    expect(PHOTO_GOAL).toBe(6);
  });
  it('starts with both false positives and false negatives', () => {
    expect(cameraGuess('cloud', {}).dragon).toBe(true);
    expect(cameraGuess('tree-dragon', {}).dragon).toBe(false);
  });
  it('uses corrections on the next flight without pretending to learn unseen shapes', () => {
    let notes = teachCamera({}, 'cloud', false);
    notes = teachCamera(notes, 'tree-dragon', true);
    expect(cameraGuess('cloud', notes).dragon).toBe(false);
    expect(cameraGuess('tree-dragon', notes).dragon).toBe(true);
    expect(cameraGuess('rock-dragon', notes).learned).toBe(false);
  });
  it('checks the picture rather than accepting an incorrect correction', () => {
    const dragon = makeFlight().find(s => s.dragon);
    if (!dragon) throw new Error('missing dragon');
    expect(checkPhoto(dragon, false)).toBe(false);
    expect(checkPhoto(dragon, true)).toBe(true);
  });
  it('ends automatically in four minutes', () => { expect(ROUND_MS).toBe(240_000); expect(ROUND_MS).toBeLessThan(300_000); });
});