import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BugleyGuesses } from './BugleyGuesses';
import { THINGS, MAX_QUESTIONS, narrow, nextQuestion, ROUND_MS, type ClueAnswer } from '@/lib/guess-garden';
vi.mock('@/lib/scroll', () => ({ useScrollTopOn: vi.fn() }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('Bugley Guesses practice flow', () => {
  it('reaches the real guess from child answers, then replays and exits', () => {
    const exit = vi.fn(); render(<BugleyGuesses stage="scout" onExit={exit}/>);
    fireEvent.click(screen.getByRole('button',{name:/I’ve got my secret/}));
    const cat = THINGS.find(t=>t.name==='cat'); if (!cat) throw new Error('missing cat');
    let pool = THINGS; const history: ClueAnswer[] = [];
    for (let n=0; n<MAX_QUESTIONS && pool.length>1; n++) {
      const q = nextQuestion(pool,history); if (!q) break;
      const answer = cat.clues.includes(q.id) ? 'yes' : 'no';
      fireEvent.click(screen.getByRole('button',{name:answer==='yes'?'Yes':'No',exact:true}));
      history.push({id:q.id,answer}); pool=narrow(pool,q.id,answer);
    }
    fireEvent.click(screen.getByRole('button',{name:'You got it!'}));
    fireEvent.click(screen.getByRole('button',{name:'Play again'}));
    fireEvent.click(screen.getByRole('button',{name:/I’ve got my secret/}));
    for(let n=0;n<MAX_QUESTIONS;n++) fireEvent.click(screen.getByRole('button',{name:'Not sure',exact:true}));
    fireEvent.click(screen.getByRole('button',{name:'Not my secret!'}));
    fireEvent.click(screen.getByRole('button',{name:/dog/}));
    fireEvent.click(screen.getByRole('button',{name:'All games',exact:true}));
    expect(exit).toHaveBeenCalledOnce();
  });
  it('ends an active round after four minutes', () => {
    vi.useFakeTimers(); render(<BugleyGuesses stage="scout" onExit={()=>{}}/>);
    fireEvent.click(screen.getByRole('button',{name:/I’ve got my secret/}));
    vi.advanceTimersByTime(ROUND_MS);
    expect(screen.queryByRole('button',{name:'Yes',exact:true})).toBeNull();
    expect(screen.getByRole('button',{name:'Play again'})).toBeTruthy();
  });
});