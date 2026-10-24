import { describe, expect, it } from 'vitest';
import { customRoundSeconds, elapsedRoundSeconds } from './round-deadline';
describe('automatic custom game deadlines',()=>{
  it('caps a round with no chosen timer at four minutes',()=>expect(customRoundSeconds(0)).toBe(240));
  it('preserves shorter timers and caps longer ones below five minutes',()=>{expect(customRoundSeconds(30)).toBe(30);expect(customRoundSeconds(600)).toBe(240);});
  it('counts device sleep even when the monotonic clock freezes',()=>expect(elapsedRoundSeconds(1000,50,242000,50)).toBe(241));
  it('does not extend play when the wall clock moves backwards',()=>expect(elapsedRoundSeconds(1000,50,0,241050)).toBe(241));
});