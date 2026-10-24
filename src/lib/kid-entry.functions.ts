import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { credentialSchema, credentialValue, type ChildProfile } from './family';
import { familyHasAccess } from './billing.functions';
export const getKidFamily=createServerFn({method:'GET'}).handler(async()=>{
  const s=await import('./kid-device.server'),d=await s.resolveDevice();if(!d)throw new Error('Ask your grown-up to set up this device for me!');
  const {data,error}=await (await s.admin()).from('children').select('id,nickname,age,avatar,bug,login_kind,age_band,bugley_stage').eq('parent_id',d.parent_id).order('created_at');
  if(error)throw new Error('Couldn’t load your players.');return {children:(data??[]) as ChildProfile[],completed:true};
});
export const getKidPlan=createServerFn({method:'POST'}).inputValidator((i:unknown)=>z.object({environment:z.enum(['sandbox','live'])}).parse(i)).handler(async({data})=>{
  const s=await import('./kid-device.server'),d=await s.resolveDevice();if(!d)throw new Error('This device isn’t set up.');return {active:await familyHasAccess(await s.admin(),d.parent_id,data.environment)};
});
export const verifyTrustedChild=createServerFn({method:'POST'}).inputValidator((i:unknown)=>z.object({childId:z.string().uuid(),credential:credentialSchema,environment:z.enum(['sandbox','live'])}).parse(i)).handler(async({data})=>{
  const s=await import('./kid-device.server'),d=await s.resolveDevice();if(!d)throw new Error('Ask your grown-up to set up this device again.');
  await s.attempt(`child:${d.id}:${data.childId}`);await s.attempt(`child-family:${d.parent_id}:${data.childId}`,20);
  const a=await s.admin();if(!await familyHasAccess(a,d.parent_id,data.environment))return {ok:false,paused:true};
  const {data:child}=await a.from('children').select('id,login_kind,credential_hash,credential_salt').eq('id',data.childId).eq('parent_id',d.parent_id).maybeSingle();
  if(!child||child.login_kind!==data.credential.kind||!s.sameSecret(await s.pinHash(credentialValue(data.credential),child.credential_salt),child.credential_hash))return {ok:false};
  const {error}=await a.from('kid_devices').update({child_id:child.id,child_verified_at:new Date().toISOString(),parent_unlocked_until:null}).eq('id',d.id).is('revoked_at',null);
  if(error)throw new Error('Couldn’t open your player.');return {ok:true};
});