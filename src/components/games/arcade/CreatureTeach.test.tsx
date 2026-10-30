import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TeachLab } from './CreatureTeach';
import { SCENES, guess } from '@/lib/pack-teach';

describe('Teach Bugley', () => {
  it('offers several everyday scenes', () => {
    expect(SCENES.map((s) => s.id)).toEqual(['lunch', 'baseball', 'beach', 'bedtime']);
  });
  it('Bugley copies by kind first, then color', () => {
    const [apple, , , , broccoli, , chili] = SCENES[0]!.items;
    expect(guess([{ item: apple!, yes: true }, { item: broccoli!, yes: false }], chili!).yes).toBe(false);
    expect(guess([{ item: apple!, yes: true }], chili!).clue).toBe('color');
  });
  it('plays a lunch round through to the end', () => {
    const onWin = vi.fn();
    render(<TeachLab stage="scout" onWin={onWin} />);
    fireEvent.click(screen.getByText('Pack my lunch'));
    for (let k = 0; k < 6; k++) fireEvent.click(screen.getByRole('button', { name: /Yum!/ }));
    for (let k = 0; k < 6; k++) { fireEvent.click(screen.getByRole('button', { name: /Yum!/ })); fireEvent.click(screen.getByRole('button', { name: /Next/ })); }
    expect(onWin).toHaveBeenCalledWith(3);
    expect(screen.getByRole('button', { name: /Play again/ })).toBeTruthy();
  });
});
