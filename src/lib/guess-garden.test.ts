import { describe, expect, it } from 'vitest';
import { THINGS, QUESTIONS, MAX_QUESTIONS, ROUND_MS, narrow, nextQuestion, separatingQuestion, type ClueAnswer } from './guess-garden';
describe('guess garden reasoning', () => {
  it('identifies every one of the 30 pictures within 15 questions', () => {
    expect(THINGS).toHaveLength(30);
    expect(MAX_QUESTIONS).toBe(15);
    for (const target of THINGS) {
      let pool = THINGS; const history: ClueAnswer[] = [];
      while (pool.length > 1 && history.length < MAX_QUESTIONS) {
        const q = nextQuestion(pool, history); if (!q) break;
        const answer = target.clues.includes(q.id) ? 'yes' : 'no';
        pool = narrow(pool, q.id, answer); history.push({id:q.id,answer});
      }
      expect(pool.map(t=>t.name)).toEqual([target.name]);
    }
  });
  it('not sure removes no candidates and is never asked again', () => {
    const q = nextQuestion(THINGS, []); if (!q) throw new Error('missing question');
    expect(narrow(THINGS,q.id,'unsure')).toEqual(THINGS);
    expect(nextQuestion(THINGS,[{id:q.id,answer:'unsure'}])?.id).not.toBe(q.id);
  });
  it('uses the most even available split', () => {
    const q = nextQuestion(THINGS, []); if (!q) throw new Error('missing question');
    const score = (id:string)=>Math.abs(15 - narrow(THINGS,id,'yes').length);
    expect(score(q.id)).toBe(Math.min(...QUESTIONS.map(x=>score(x.id))));
  });
  it('can explain what separates a wrong guess from the real answer', () => {
    const cat = THINGS.find(t=>t.name==='cat'), dog=THINGS.find(t=>t.name==='dog');
    if (!cat || !dog) throw new Error('missing targets');
    expect(separatingQuestion(cat,dog)?.id).toBe('barks');
  });
  it('bounds practice below five minutes', () => { expect(ROUND_MS).toBe(240_000); expect(ROUND_MS).toBeLessThan(300_000); });
});