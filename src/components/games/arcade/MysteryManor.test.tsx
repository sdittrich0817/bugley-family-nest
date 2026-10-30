import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MysteryManor } from './MysteryManor';
import { CASES, judge } from '@/lib/manor-cases';

describe('Catch the Sneaky Robot', () => {
  it('trusting a wrong robot loses; naming the real culprit wins', () => {
    const cake = CASES[0]!;
    expect(judge(cake, true).ok).toBe(false);
    expect(judge(cake, false, 'bunny').ok).toBe(true);
    expect(judge(cake, false, 'fox').ok).toBe(false);
  });
  it('the robot is sometimes right, so kids must check', () => {
    expect(CASES.some((c) => c.botSays === c.answer)).toBe(true);
    expect(CASES.some((c) => c.botSays !== c.answer)).toBe(true);
  });
  it('plays all five mysteries perfectly for 3 stars', () => {
    const onWin = vi.fn();
    render(<MysteryManor stage="scout" onWin={onWin} />);
    fireEvent.click(screen.getByText('Start the mystery!'));
    for (const c of CASES) {
      for (let k = 0; k < c.clues.length; k++) fireEvent.click(screen.getByLabelText(`Clue ${k + 1}`));
      if (c.botSays === c.answer) fireEvent.click(screen.getByText('✅ Robot is right'));
      else { fireEvent.click(screen.getByText('❌ Robot is wrong')); fireEvent.click(screen.getByRole('button', { name: new RegExp(c.answer, 'i') })); }
      fireEvent.click(screen.getByRole('button', { name: /Next mystery|See my detective stars/ }));
    }
    expect(onWin).toHaveBeenCalledWith(3);
  });
});
