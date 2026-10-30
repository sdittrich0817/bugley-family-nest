import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MysteryManor } from './MysteryManor';
import { SUSPECTS, judge, levelOpen, makeGame, seeded, unlockedCount, type Level } from '@/lib/manor-cases';

const fits = (id: string, tag: string) => SUSPECTS.find((s) => s.id === id)!.tags.includes(tag as never);

describe('Catch the Sneaky Robot', () => {
  it('every generated mystery has exactly one friend matching all clues', () => {
    for (const level of ['rookie', 'detective', 'master'] as Level[]) for (let seed = 1; seed < 60; seed++) {
      for (const c of makeGame(level, 4, seeded(seed))) {
        expect(c.cast.filter((s) => c.clues.every((cl) => fits(s, cl.tag)))).toEqual([c.answer]);
        expect(c.cast).toContain(c.botSays);
      }
    }
  });
  it('5 different rooms each game, and games differ', () => {
    const a = makeGame('rookie', 0, seeded(1)), b = makeGame('rookie', 0, seeded(2));
    expect(new Set(a.map((c) => c.question)).size).toBe(5);
    expect(a.map((c) => c.id).join()).not.toBe(b.map((c) => c.id).join());
  });
  it('starts with 4 friends, one more per win, up to 8; levels unlock at 2 and 4 wins', () => {
    expect(unlockedCount(0)).toBe(4); expect(unlockedCount(1)).toBe(5); expect(unlockedCount(9)).toBe(8);
    expect(levelOpen('detective', 1)).toBe(false); expect(levelOpen('detective', 2)).toBe(true);
    expect(levelOpen('master', 3)).toBe(false); expect(levelOpen('master', 4)).toBe(true);
  });
  it('detective robot names a friend that fits at least one clue when wrong', () => {
    for (let seed = 1; seed < 40; seed++) for (const c of makeGame('detective', 2, seeded(seed))) {
      if (c.botSays !== c.answer && c.lesson.includes('ONE clue')) expect(c.clues.some((cl) => fits(c.botSays, cl.tag))).toBe(true);
    }
  });
  it('trusting a wrong robot loses; naming the real culprit wins', () => {
    const c = makeGame('rookie', 0, seeded(3)).find((x) => x.botSays !== x.answer)!;
    expect(judge(c, true).ok).toBe(false);
    expect(judge(c, false, c.answer).ok).toBe(true);
  });
  it('plays a full rookie game', () => {
    const onWin = vi.fn();
    render(<MysteryManor stage="scout" onWin={onWin} />);
    fireEvent.click(screen.getByRole('button', { name: /Rookie/ }));
    for (let n = 0; n < 5; n++) {
      for (let k = 0; k < 3; k++) fireEvent.click(screen.getByLabelText(`Clue ${k + 1}`));
      fireEvent.click(screen.getByText('✅ Robot is right'));
      fireEvent.click(screen.getByRole('button', { name: /Next mystery|See my detective stars/ }));
    }
    expect(onWin).toHaveBeenCalled();
    expect(screen.getByText('Play again')).toBeTruthy();
  });
});
