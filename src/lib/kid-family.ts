import { queryOptions } from '@tanstack/react-query';
import { getFamily } from './family.functions';
import { getKidFamily, getKidPlan } from './kid-entry.functions';
import { getBillingStatus } from './billing.functions';
import { kidDeviceStatus } from './kid-device.functions';
import type { ChildProfile } from './family';
import { useEffect, useState } from 'react';
import { getActivePlayer, setActivePlayer } from './kid-zone';

/** Restore only a family member already selected in this tab or on a trusted device. */
export async function restoreStudioPlayer(children: Pick<ChildProfile, 'id'>[]) {
  const stored = getActivePlayer();
  if (stored && children.some(child => child.id === stored)) return stored;
  const device = await kidDeviceStatus();
  if (!device.trusted || !device.childId || !children.some(child => child.id === device.childId)) return null;
  setActivePlayer(device.childId);
  return device.childId;
}

export function useStudioPlayer(children: ChildProfile[], onMissing: () => void) {
  const [childId, setChildId] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void restoreStudioPlayer(children).then(id => {
      if (!active) return;
      if (id) { setError(''); setChildId(id); }
      else onMissing();
    }).catch(() => { if (active) setError('Couldn’t reopen Studio. Refresh to try again—your work is saved.'); });
    return () => { active = false; };
  }, [children, onMissing]);
  return { childId, error };
}
export const kidFamilyOptions=queryOptions({queryKey:['kid-family'],queryFn:async():Promise<{children:ChildProfile[];completed:boolean}>=>{
  const status=await kidDeviceStatus();
  return status.trusted?getKidFamily():getFamily();
}});
export const kidPlanOptions=(environment:'sandbox'|'live')=>queryOptions({queryKey:['kid-plan',environment],queryFn:async()=>{const status=await kidDeviceStatus();return status.trusted?getKidPlan({data:{environment}}):getBillingStatus({data:{environment}});}});