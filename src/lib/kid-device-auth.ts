import { createMiddleware } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { childAuthorized } from './kid-device-rules';

// Only explicitly kid-facing handlers import this boundary. Parent handlers keep managed auth.
export const requireKidOrParentAuth = createMiddleware({type:'function'}).inputValidator((data:unknown)=>data).server(async ({data,next}) => {
  const s=await import('./kid-device.server');
  const device=await s.resolveDevice();
  let result: {supabase:ReturnType<typeof createClient<Database>>;userId:string;claims:Record<string,unknown>;kidDeviceId:string|null;kidChildId:string|null};
  if(device) {
    const childId=data && typeof data==='object' && 'childId' in data ? data.childId : undefined;
    if(!device.child_verified_at || !childAuthorized(device.child_id,childId)) throw new Error('Pick your avatar and enter your secret first.');
    const a=await s.admin();
    const {data:owned}=await a.from('children').select('id').eq('id',device.child_id ?? '').eq('parent_id',device.parent_id).maybeSingle();
    if(!owned)throw new Error('This player is no longer available.');
    result={supabase:a,userId:device.parent_id,claims:{sub:device.parent_id},kidDeviceId:device.id,kidChildId:owned.id};
  } else {
  // A stale/revoked device cookie must not fall through to a parent bearer session.
  if(s.cookie('bugley_kids'))throw new Error('Ask your grown-up to set up this device again.');
  const token=getRequest().headers.get('authorization')?.replace(/^Bearer /,'');
  const url=process.env['SUPABASE_URL'],key=process.env['SUPABASE_PUBLISHABLE_KEY'];
  if(!token || !url || !key)throw new Error('Ask your grown-up to set up this device for me!');
  const supabase=createClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
  const {data:verified,error}=await supabase.auth.getClaims(token);
  if(error || !verified?.claims.sub)throw new Error('Please sign in again.');
  const {data:active,error:activeError}=await supabase.rpc('is_active_parent');
  if(activeError || !active)throw new Error('A verified parent account is required.');
  result={supabase,userId:verified.claims.sub,claims:verified.claims,kidDeviceId:null,kidChildId:null};
  }
  const childId=data&&typeof data==='object'&&'childId' in data&&typeof data.childId==='string'?data.childId:result.kidChildId;
  if(childId){const a=await s.admin();const {data:allowed,error}=await a.rpc('tick_kid_time',{_child:childId,_parent:result.userId});if(error||!allowed)throw new Error('Time for a break! Ask your grown-up.');}
  if(result.kidDeviceId){const {familyHasAccess}=await import('./billing.functions');const env=import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN']?.startsWith('pk_live_')?'live':'sandbox';if(!await familyHasAccess(result.supabase,result.userId,env))throw new Error('Bugley is taking a little nap. Ask your grown-up!');}
  return next({context:result});
});