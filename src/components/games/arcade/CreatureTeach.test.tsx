import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TeachLab } from './CreatureTeach';
import { LABS, truthFor } from '@/lib/creature-teach';

describe('TeachLab', () => {
  it('Lab 1 plays through teaching, testing and winning', async () => {
    vi.useFakeTimers();
    const lab = LABS[0]!, t = truthFor(lab), onWin = vi.fn();
    render(<TeachLab lab={lab} index={0} stage="scout" onBack={() => {}} onWin={onWin} />);
    fireEvent.click(screen.getByText('Start teaching!'));
    for (const c of lab.train) fireEvent.click(screen.getByLabelText(`Send to ${lab.habitats[t(c)].name}`));
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText(/has no wings/, { selector: 'p.font-display.text-lg' })).toBeTruthy();
    fireEvent.click(screen.getByText(/Test Bugley/));
    for (let i = 0; i < lab.tests.length; i++) { fireEvent.click(screen.getByText('He’s right!')); fireEvent.click(screen.getByText(/Next creature|See how/)); }
    expect(onWin).toHaveBeenCalledWith(3);
    vi.useRealTimers();
  });
});
