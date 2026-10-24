import { queryOptions } from '@tanstack/react-query';
import { getFamily } from './family.functions';
import { getKidFamily } from './kid-entry.functions';
import { kidDeviceStatus } from './kid-device.functions';
import type { ChildProfile } from './family';
export const kidFamilyOptions=queryOptions({queryKey:['kid-family'],queryFn:async():Promise<{children:ChildProfile[];completed:boolean}>=>{
  const status=await kidDeviceStatus();
  return status.trusted?getKidFamily():getFamily();
}});