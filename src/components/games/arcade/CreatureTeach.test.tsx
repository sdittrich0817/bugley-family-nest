import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TeachLab } from './CreatureTeach';
import { SECRET_RULES, isGlowbug, teachDeck } from '@/lib/creature-teach';

describe('Glowbug TeachLab', () => {
  it('plays: pick, teach, catch the pink mistake, then 5 in a row wins', () => {
    vi.useFakeTimers();
    const r = SECRET_RULES[0]!, onWin = vi.fn();
    render(<TeachLab stage="scout" onWin={onWin} />);
    fireEvent.click(screen.getByText(r.label));
    for (const c of teachDeck(r)) fireEvent.click(screen.getByText(isGlowbug(r, c) === 0 ? 'Glowbug!' : 'Not one'));
    fireEvent.click(screen.getByText('Right!')); fireEvent.click(screen.getByText('Next bug →'));
    fireEvent.click(screen.getByText('Right!')); fireEvent.click(screen.getByText('Next bug →'));
    fireEvent.click(screen.getByText('Wrong!'));
    expect(screen.getByText(/You only showed me pink Glowbugs/)).toBeTruthy();
    fireEvent.click(screen.getByText('Teach him this one →'));
    for (let i = 0; i < 5; i++) { fireEvent.click(screen.getByText('Right!')); if (i < 4) fireEvent.click(screen.getByText('Next bug →')); }
    act(() => { vi.advanceTimersByTime(800); });
    expect(onWin).toHaveBeenCalledWith(3);
    vi.useRealTimers();
  });
});
