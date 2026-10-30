import { describe, expect, it, vi } from 'vitest';
import { isChunkLoadError, recoverChunkLoad } from './chunk-recovery';

describe('failed page download recovery', () => {
  it.each(['Importing a module script failed.', 'Failed to fetch dynamically imported module: /assets/kids.js', 'error loading dynamically imported module', 'Loading chunk 12 failed.'])('recognizes %s', message => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });
  it('does not reload for a normal sign-in or connection error', () => {
    const reload = vi.fn();
    expect(recoverChunkLoad(new Error('Load failed'), '/kids', sessionStorage, reload)).toBe(false);
    expect(isChunkLoadError(new Error('Incorrect PIN'))).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
  it('reloads once, preserves player storage, and prevents a reload loop', () => {
    const values = new Map([['bugley-active-player', 'test-child']]);
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const reload = vi.fn();
    const error = new TypeError('Importing a module script failed.');
    expect(recoverChunkLoad(error, '/kids', storage, reload, 100_000)).toBe(true);
    expect(recoverChunkLoad(error, '/kids', storage, reload, 101_000)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(values.get('bugley-active-player')).toBe('test-child');
  });
  it('leaves manual recovery available when storage is unavailable', () => {
    const reload = vi.fn();
    const storage = { getItem: () => { throw new Error('Blocked storage'); }, setItem: vi.fn() };
    expect(recoverChunkLoad(new TypeError('Importing a module script failed.'), '/kids', storage, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
import { isChunkLoadError as isRecoverable } from './chunk-recovery';
import { it as it2, expect as expect2 } from 'vitest';
it2('treats Safari and Chrome network download failures as recoverable', () => {
  expect2(isRecoverable(new TypeError('Load failed'))).toBe(true);
  expect2(isRecoverable(new TypeError('Failed to fetch'))).toBe(true);
  expect2(isRecoverable(new Error('That comic failed to load'))).toBe(false);
});
