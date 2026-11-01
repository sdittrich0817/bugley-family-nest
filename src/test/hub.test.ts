import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONTROLS, rememberedLoginValid } from '@/lib/hub';
import { getActivePlayer, setActivePlayer, setPlayerPolicies } from '@/lib/kid-zone';
const now = Date.parse('2026-11-01T23:45:00Z');
describe('remembered child login', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  it('defaults to always, including after more than 24 hours', () => {
    expect(DEFAULT_CONTROLS.remember_login).toBe('always');
    expect(rememberedLoginValid(now - 365 * 86400000, undefined, now)).toBe(true);
  });
  it('allows 24 hours but expires exactly at 24 hours', () => {
    expect(rememberedLoginValid(now - 86400000 + 1, '24_hours', now)).toBe(true);
    expect(rememberedLoginValid(now - 86400000, '24_hours', now)).toBe(false);
  });
  it('rejects missing, invalid or future verification times', () => {
    for (const at of [null, 'bad', now + 1]) expect(rememberedLoginValid(at, '24_hours', now)).toBe(false);
  });
  it('does not let tab storage bypass the 24-hour expiry', () => {
    setPlayerPolicies({ child: '24_hours' });
    setActivePlayer('child', new Date(Date.now() - 86400001).toISOString());
    expect(getActivePlayer()).toBeNull();
  });
});