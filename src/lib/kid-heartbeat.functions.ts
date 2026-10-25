import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireKidOrParentAuth } from './kid-device-auth';
export const kidHeartbeat=createServerFn({method:'POST'}).middleware([requireKidOrParentAuth]).inputValidator((i:unknown)=>z.object({childId:z.string().uuid()}).parse(i)).handler(async()=>({ok:true}));