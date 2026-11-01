import { beforeEach, describe, expect, it, vi } from 'vitest';
import { restoreStudioPlayer } from './kid-family';
import { kidDeviceStatus } from './kid-device.functions';
import { getActivePlayer, setActivePlayer } from './kid-zone';

vi.mock('./kid-device.functions', () => ({ kidDeviceStatus: vi.fn() }));
vi.mock('./family.functions', () => ({ getFamily: vi.fn() }));
vi.mock('./kid-entry.functions', () => ({ getKidFamily: vi.fn(), getKidPlan: vi.fn() }));
vi.mock('./billing.functions', () => ({ getBillingStatus: vi.fn() }));
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); vi.clearAllMocks(); });
describe('returning to Studio', () => {
  it('retains the signed-in child after checking device authorization', async () => {
    vi.mocked(kidDeviceStatus).mockResolvedValue({ trusted: false, invalid: false, childId: null, verifiedAt: null, parentUnlocked: false });
    setActivePlayer('dawnie');
    expect(await restoreStudioPlayer([{ id: 'dawnie' }])).toBe('dawnie');
    expect(kidDeviceStatus).toHaveBeenCalled();
  });
  it('restores a trusted device’s already selected family child when tab state is missing', async () => {
    vi.mocked(kidDeviceStatus).mockResolvedValue({ trusted: true, invalid: false, childId: 'dawnie', verifiedAt: new Date().toISOString(), parentUnlocked: false });
    expect(await restoreStudioPlayer([{ id: 'dawnie' }])).toBe('dawnie');
    expect(getActivePlayer()).toBe('dawnie');
  });
  it('does not select a child from an untrusted device or another family', async () => {
    for (const trusted of [false, true]) {
      vi.mocked(kidDeviceStatus).mockResolvedValue({ trusted, invalid: false, childId: 'other-family', verifiedAt: null, parentUnlocked: false });
      expect(await restoreStudioPlayer([{ id: 'dawnie' }])).toBeNull();
      expect(getActivePlayer()).toBeNull();
    }
  });
  it('keeps a connection error distinct from a missing child so the screen can retry', async () => {
    vi.mocked(kidDeviceStatus).mockRejectedValue(new Error('Load failed'));
    await expect(restoreStudioPlayer([{ id: 'dawnie' }])).rejects.toThrow('Load failed');
  });
  it('rejects an expired trusted login even when the browser remembers the child', async () => {
    setActivePlayer('dawnie');
    vi.mocked(kidDeviceStatus).mockResolvedValue({trusted:true,invalid:false,childId:null,verifiedAt:null,parentUnlocked:false});
    expect(await restoreStudioPlayer([{id:'dawnie'}])).toBeNull();
    expect(getActivePlayer()).toBeNull();
  });
});