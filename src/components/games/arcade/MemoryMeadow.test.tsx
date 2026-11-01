import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryMeadow } from './MemoryMeadow';
import { MEADOW_ROUND_MS } from '@/lib/memory-meadow';
vi.mock('@/lib/scroll', () => ({ useScrollTopOn: vi.fn() }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('Memory Meadow rounds', () => {
  it('plays genuine pairs, replays and exits directly', () => {
    const exit = vi.fn(); render(<MemoryMeadow stage="scout" onExit={exit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Let’s find twins!' }));
    const pairs = ['Blue butterfly', 'Blue dragonfly', 'Yellow bee', 'Yellow ladybug'].map(name => screen.getAllByRole('button', { name: new RegExp(`^${name}, leaf`) }).map(b => Number(b.getAttribute('aria-label')?.match(/leaf (\d+)/)?.[1])));
    fireEvent.click(screen.getByRole('button', { name: 'Hide the bugs — I’m ready!' }));
    for (const [n, pair] of pairs.entries()) {
      for (const leaf of pair) fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Flip leaf ${leaf}(,|$)`) }));
      fireEvent.click(screen.getByRole('button', { name: n === 3 ? 'See my meadow' : 'Keep finding twins' }));
    }
    expect(screen.getByText(/4 pairs found/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.getByText('Take a good look…')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'All games' }));
    expect(exit).toHaveBeenCalledOnce();
  });
  it('automatically ends after four minutes, including peek time', () => {
    vi.useFakeTimers(); render(<MemoryMeadow stage="scout" onExit={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Let’s find twins!' }));
    act(() => { vi.advanceTimersByTime(MEADOW_ROUND_MS); });
    expect(screen.getByText('A little meadow break!')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Hide the bugs — I’m ready!' })).toBeNull();
  });
});