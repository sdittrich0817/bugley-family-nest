import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DragonCatch } from './DragonCatch';
import { ROUND_MS } from '@/lib/dragon-catch';
vi.mock('@/lib/scroll', () => ({ useScrollTopOn: vi.fn() }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('Dragon Catch', () => {
  it('checks a picture, finishes a flight, replays and exits', () => {
    const exit = vi.fn(); render(<DragonCatch stage="scout" band="explorers" onExit={exit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Let’s fly!' }));
    for (let i = 0; i < 12; i++) {
      const prompt = screen.getByText(/In view!|Fly up to|Fly down to/).textContent ?? '';
      if (prompt.includes('up')) { fireEvent.click(screen.getByRole('button', { name: 'Fly up' })); if (screen.getByText(/In view!|Fly up to|Fly down to/).textContent?.includes('up')) fireEvent.click(screen.getByRole('button', { name: 'Fly up' })); }
      if (prompt.includes('down')) { fireEvent.click(screen.getByRole('button', { name: 'Fly down' })); if (screen.getByText(/In view!|Fly up to|Fly down to/).textContent?.includes('down')) fireEvent.click(screen.getByRole('button', { name: 'Fly down' })); }
      fireEvent.click(screen.getByRole('button', { name: 'Snap photo' }));
      const real = screen.queryByRole('img', { name: /^(Sky|Leafy|Rocky) dragon$/ }) !== null;
      fireEvent.click(screen.getByRole('button', { name: real ? 'A dragon!' : 'Not a dragon' }));
      const finish = screen.queryByRole('button', { name: 'See my dragon album' });
      fireEvent.click(finish ?? screen.getByRole('button', { name: 'Keep flying' }));
      if (finish) break;
    }
    expect(screen.getByText(/6 of 6 dragon photos/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.getByRole('button', { name: 'Snap photo' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'All games' }));
    expect(exit).toHaveBeenCalledOnce();
  });
  it('automatically lands after four minutes, even while checking a photo', () => {
    vi.useFakeTimers(); render(<DragonCatch stage="scout" band="sprouts" onExit={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Let’s fly!' }));
    act(() => { vi.advanceTimersByTime(ROUND_MS); });
    expect(screen.getByText('Time to land!')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Snap photo' })).toBeNull();
  });
});