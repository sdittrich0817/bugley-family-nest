import { queryOptions } from '@tanstack/react-query';
import { getFamily } from './family.functions';
import { getKidFamily, getKidPlan } from './kid-entry.functions';
import { getBillingStatus } from './billing.functions';
import { kidDeviceStatus } from './kid-device.functions';
import type { ChildProfile } from './family';
export const kidFamilyOptions=queryOptions({queryKey:['kid-family'],queryFn:async():Promise<{children:ChildProfile[];completed:boolean}>=>{
  const status=await kidDeviceStatus();
  return status.trusted?getKidFamily():getFamily();
}});
export const kidPlanOptions=(environment:'sandbox'|'live')=>queryOptions({queryKey:['kid-plan',environment],queryFn:async()=>{const status=await kidDeviceStatus();return status.trusted?getKidPlan({data:{environment}}):getBillingStatus({data:{environment}});}});