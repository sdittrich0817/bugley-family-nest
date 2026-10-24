import { describe, expect, it } from 'vitest';
import { canAskGuess, GUESS_LIMIT, dashSchema, checkedDashTicks, DASH_TICKS, caseSchema } from './play-extra';
import { playAllowed,playSeconds } from './play';
describe('new PLAY rules',()=>{
 it('offers all three new games only at ages 7–12',()=>{for(const g of ['bugley_guesses','mystery_manor','glow_dash'] as const){expect(playAllowed(g,'sprouts')).toBe(false);expect(playAllowed(g,'explorers')).toBe(true);expect(playAllowed(g,'builders')).toBe(true);}});
 it('stops each guessing side at fifteen questions',()=>{expect(GUESS_LIMIT).toBe(15);expect(canAskGuess(14)).toBe(true);expect(canAskGuess(15)).toBe(false);});
 it('ends mystery cases after five minutes',()=>{expect(playSeconds('mystery_manor')).toBe(300);});
 it('ends a dash after three minutes',()=>{expect(playSeconds('glow_dash')).toBe(180);expect(DASH_TICKS).toBe(10800);});
 it('remixes accept fixed options and never code',()=>{expect(dashSchema.safeParse({theme:'chocolate',code:'alert(1)'}).success).toBe(false);expect(dashSchema.parse({theme:'lava',chocolate:true,speed:'slow',pads:true,time:'night'}).chocolate).toBe(true);});
 it('rejects unsupported object/code fields and bounds replay by elapsed time',()=>{expect(dashSchema.safeParse({javascript:'run()'}).success).toBe(false);expect(checkedDashTicks(10800,1000)).toBe(150);expect(checkedDashTicks(50000,200000)).toBe(10800);});
 it('requires exactly three clue rooms and one valid impostor',()=>{const room={name:'Kitchen',friend:'Owl',sprite:'owl',statement:'Tea is cold.',evidence:'Steam rises.'};expect(caseSchema.safeParse({title:'Tea',intro:'Find a fake clue.',rooms:[room,room,room],fake:3,explanation:'Steam means warm.'}).success).toBe(false);expect(caseSchema.safeParse({title:'Tea',intro:'Find a fake clue.',rooms:[room,room,room],fake:0,explanation:'Steam means warm.'}).success).toBe(true);});
});