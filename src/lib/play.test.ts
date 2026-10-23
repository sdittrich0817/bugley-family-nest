import { describe, expect, it } from 'vitest';
import { comboKey, gameBonus, PLAY_SECONDS, playAllowed } from './play';
describe('PLAY rules', () => {
  it('ends every round in four minutes within the requested 3–5 minutes', () => { expect(PLAY_SECONDS).toBe(240); });
  it('hides Silly Story Blanks from ages 10–12', () => { expect(playAllowed('story_blanks','builders')).toBe(false); expect(playAllowed('story_blanks','sprouts')).toBe(true); expect(playAllowed('story_blanks','explorers')).toBe(true); });
  it('offers all three ages-5+ games to every band', () => { for(const game of ['say_see','creature_lab','doodle_duel'] as const) for(const band of ['sprouts','explorers','builders'] as const) expect(playAllowed(game,band)).toBe(true); });
  it('never awards a fourth daily bonus glow', () => { expect(gameBonus(3,2)).toBe(1); expect(gameBonus(30,3)).toBe(0); expect(gameBonus(2,0)).toBe(0); });
  it('reuses creature combinations regardless of input order', () => { expect(comboKey('Shark','cupcake')).toBe('cupcake+shark'); expect(comboKey('cupcake','shark')).toBe('cupcake+shark'); });
});