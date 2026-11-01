import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashSchool } from './DashSchool';
vi.mock('@/components/studio/Sidekick', () => ({ speak: vi.fn() }));
afterEach(cleanup);
describe('Dash teaching', () => {
  it('only advances checked examples and passes the four concrete jump decisions', () => {
    const ready = vi.fn(); render(<DashSchool stage="scout" onReady={ready} />);
    fireEvent.click(screen.getByRole('button', { name: 'Jump', exact: true }));
    expect(ready).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Next example' })).toBeNull();
    for (const [i, action] of ['Wait','Jump','Wait','Wait'].entries()) {
      fireEvent.click(screen.getByRole('button', { name: action, exact: true }));
      fireEvent.click(screen.getByRole('button', { name: i === 3 ? 'Let’s test what Bugley learned!' : 'Next example' }));
    }
    expect(ready).toHaveBeenCalledWith([
      { distance:230,airborne:false,action:'wait' }, { distance:125,airborne:false,action:'jump' },
      { distance:165,airborne:false,action:'wait' }, { distance:125,airborne:true,action:'wait' },
    ]);
  });
});