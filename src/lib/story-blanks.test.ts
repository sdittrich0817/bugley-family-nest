import { describe, expect, it } from 'vitest';
import { acceptStoryWord, storyWorld, STORY_WORLDS, storyPredictions, surpriseCount } from './story-blanks';
import { playAllowed, playSeconds } from './play';
describe('Silly Story Blanks rules',()=>{
 it('uses example frequencies rather than treating guesses as answers',()=>{const b=storyWorld('dragon').blanks[0];if(!b)throw new Error('Missing blank');expect(storyPredictions(b).map(p=>[p.word,p.pct])).toEqual([['cake',67],['pizza',25],['apples',8]]);});
 it('preserves a child’s unexpected idea and completes after three words',()=>{const w=storyWorld('dragon');const first=acceptStoryWord(w,[],'striped socks');expect(first.words).toEqual(['striped socks']);expect(first.story).toBeUndefined();const done=acceptStoryWord(w,['striped socks','a dancing pickle'],'juggle planets');expect(done.story).toContain('dragon ate striped socks.');expect(surpriseCount(w,done.words)).toBe(3);expect(()=>acceptStoryWord(w,done.words,'again')).toThrow();});
 it('keeps the ages 5–9 restriction',()=>{expect(playAllowed('story_blanks','sprouts')).toBe(true);expect(playAllowed('story_blanks','explorers')).toBe(true);expect(playAllowed('story_blanks','builders')).toBe(false);});
 it('ends in four minutes, strictly below five',()=>{expect(playSeconds('story_blanks')).toBe(240);});
 it('each world has three complete sentence prompts and distinct guesses',()=>{for(const w of STORY_WORLDS){expect(w.blanks).toHaveLength(3);for(const b of w.blanks)expect(new Set(b.examples.map(e=>e.word)).size).toBe(3);}});
});