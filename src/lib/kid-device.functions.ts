import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireParentDevice } from './parent-device.functions';
import { PAIR_SECONDS } from './kid-device-rules';
const name=z.string().trim().min(1).max(60);
const password=z.string().min(1).max(200);
async function verifyPassword(ctx: any, value:string) {
  const s=await import('./kid-device.server'); await s.attempt(`setup:${ctx.userId}`);
  const {data:account}=await ctx.supabase.auth.getUser();
  if(!account.user?.email)throw new Error('Please sign in again.');
  const {data,error}=await ctx.supabase.auth.signInWithPassword({email:account.user.email,password:value});
  if(error || data.user?.id!==ctx.userId)throw new Error('That password didn’t match.');
  const {data:active}=await ctx.supabase.rpc('is_active_parent'); if(!active)throw new Error('A verified parent account is required.');
}
export const kidDeviceStatus=createServerFn({method:'GET'}).handler(async()=>{
  const s=await import('./kid-device.server');const d=await s.resolveDevice();
  return {trusted:!!d,invalid:!!s.cookie('bugley_kids')&&!d,childId:d?.child_id??null,parentUnlocked:!!d?.parent_unlocked_until&&Date.parse(d.parent_unlocked_until)>Date.now()};
});
export const listKidDevices=createServerFn({method:'GET'}).middleware([requireParentDevice]).handler(async({context})=>{
  const a=await (await import('./kid-device.server')).admin();
  const [{data:devices,error},{data:pin},{data:pairs}]=await Promise.all([a.from('kid_devices').select('id,name,created_at,last_used_at,expires_at').eq('parent_id',context.userId).is('revoked_at',null).order('created_at'),a.from('parent_device_pins').select('parent_id').eq('parent_id',context.userId).maybeSingle(),a.from('kid_pairings').select('id,device_name,expires_at,approved_at').eq('parent_id',context.userId).is('consumed_at',null).gt('expires_at',new Date().toISOString()).not('claim_hash','is',null)]);
  if(error)throw new Error('Couldn’t load devices.');return {devices:devices??[],hasPin:!!pin,pairings:pairs??[]};
});
export const setParentPin=createServerFn({method:'POST'}).middleware([requireParentDevice]).inputValidator((i:unknown)=>z.object({password,pin:z.string().regex(/^\d{4}$/)}).parse(i)).handler(async({data,context})=>{
  await verifyPassword(context,data.password); const s=await import('./kid-device.server'),salt=s.randomSecret().slice(0,32);
  const {error}=await (await s.admin()).from('parent_device_pins').upsert({parent_id:context.userId,pin_salt:salt,pin_hash:await s.pinHash(data.pin,salt),updated_at:new Date().toISOString()});
  if(error)throw new Error('Couldn’t save your parent PIN.');return {ok:true};
});
export const trustThisDevice=createServerFn({method:'POST'}).middleware([requireParentDevice]).inputValidator((i:unknown)=>z.object({password,name}).parse(i)).handler(async({data,context})=>{
  await verifyPassword(context,data.password);const s=await import('./kid-device.server'),a=await s.admin();
  const {data:pin}=await a.from('parent_device_pins').select('parent_id').eq('parent_id',context.userId).maybeSingle();if(!pin)throw new Error('Set your parent PIN first.');
  const secret=s.randomSecret();const {error}=await a.from('kid_devices').insert({parent_id:context.userId,name:data.name,secret_hash:await s.digest(secret)});
  if(error)throw new Error('Couldn’t set up this device.');s.writeDeviceCookie(secret);return {ok:true};
});
export const createKidPairing=createServerFn({method:'POST'}).middleware([requireParentDevice]).inputValidator((i:unknown)=>z.object({password}).parse(i)).handler(async({data,context})=>{
  await verifyPassword(context,data.password);const s=await import('./kid-device.server'),a=await s.admin();
  const {data:pin}=await a.from('parent_device_pins').select('parent_id').eq('parent_id',context.userId).maybeSingle();if(!pin)throw new Error('Set your parent PIN first.');
  const proof=s.randomSecret(),code=Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join(''),expiresAt=new Date(Date.now()+PAIR_SECONDS*1000).toISOString();
  const {data:r,error}=await a.from('kid_pairings').insert({parent_id:context.userId,proof_hash:await s.digest(proof),code_hash:await s.digest(code),expires_at:expiresAt}).select('id').single();
  if(error||!r)throw new Error('Couldn’t start pairing.');return {id:r.id,proof,code,expiresAt};
});
export const claimKidPairing=createServerFn({method:'POST'}).inputValidator((i:unknown)=>z.object({code:z.string().min(8).max(64),name}).parse(i)).handler(async({data})=>{
  const s=await import('./kid-device.server'),a=await s.admin();
  const {getRequest}=await import('@tanstack/react-start/server'); const req=getRequest();
  await s.attempt(`pair-ip:${await s.digest(req.headers.get('cf-connecting-ip')??'local')}`,10,900);
  const column=data.code.length===64?'proof_hash':'code_hash',key=await s.digest(data.code.toUpperCase().length===8?data.code.toUpperCase():data.code);
  await s.attempt(`pair-code:${key}`,5,900);
  const {data:pair}=await a.from('kid_pairings').select('id,expires_at').eq(column,key).is('claim_hash',null).is('consumed_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
  if(!pair)throw new Error('That code is unavailable or expired. Ask your grown-up for a new one.');
  const claim=s.randomSecret();const {data:updated,error}=await a.from('kid_pairings').update({claim_hash:await s.digest(claim),device_name:data.name}).eq('id',pair.id).is('claim_hash',null).select('id').maybeSingle();
  if(error||!updated)throw new Error('That code has already been used.');return {id:pair.id,claim,expiresAt:pair.expires_at};
});
export const approveKidPairing=createServerFn({method:'POST'}).middleware([requireParentDevice]).inputValidator((i:unknown)=>z.object({id:z.string().uuid(),approve:z.boolean()}).parse(i)).handler(async({data,context})=>{
  const a=await (await import('./kid-device.server')).admin();
  const {data:r,error}=await a.from('kid_pairings').update(data.approve?{approved_at:new Date().toISOString()}:{consumed_at:new Date().toISOString()}).eq('id',data.id).eq('parent_id',context.userId).not('claim_hash','is',null).is('consumed_at',null).gt('expires_at',new Date().toISOString()).select('id').maybeSingle();
  if(error||!r)throw new Error('This pairing is no longer available.');return {ok:true};
});
export const finishKidPairing=createServerFn({method:'POST'}).inputValidator((i:unknown)=>z.object({id:z.string().uuid(),claim:z.string().regex(/^[a-f0-9]{64}$/)}).parse(i)).handler(async({data})=>{
  const s=await import('./kid-device.server'),a=await s.admin(),hash=await s.digest(data.claim);
  const {data:r}=await a.from('kid_pairings').select('approved_at,expires_at,consumed_at').eq('id',data.id).eq('claim_hash',hash).maybeSingle();
  if(!r||r.consumed_at||Date.parse(r.expires_at)<=Date.now())throw new Error('Pairing expired. Ask for a new code.');
  if(!r.approved_at)return {ready:false};
  const secret=s.randomSecret();const {error}=await a.rpc('consume_kid_pairing',{_id:data.id,_claim:hash,_secret:await s.digest(secret)});
  if(error)throw new Error('Pairing is no longer available.');s.writeDeviceCookie(secret);return {ready:true};
});
export const removeKidDevice=createServerFn({method:'POST'}).middleware([requireParentDevice]).inputValidator((i:unknown)=>z.object({id:z.string().uuid()}).parse(i)).handler(async({data,context})=>{
  const {error}=await (await (await import('./kid-device.server')).admin()).from('kid_devices').update({revoked_at:new Date().toISOString(),child_id:null,parent_unlocked_until:null}).eq('id',data.id).eq('parent_id',context.userId);
  if(error)throw new Error('Couldn’t remove this device.');return {ok:true};
});
export const unlockKidParentPin=createServerFn({method:'POST'}).inputValidator((i:unknown)=>z.object({pin:z.string().regex(/^\d{4}$/)}).parse(i)).handler(async({data})=>{
  const s=await import('./kid-device.server'),d=await s.resolveDevice();if(!d)throw new Error('This device isn’t set up.');
  await s.attempt(`parent-pin:${d.id}`);await s.attempt(`parent-pin-family:${d.parent_id}`,20);
  const a=await s.admin(),{data:pin}=await a.from('parent_device_pins').select('pin_hash,pin_salt').eq('parent_id',d.parent_id).maybeSingle();
  if(!pin||!s.sameSecret(await s.pinHash(data.pin,pin.pin_salt),pin.pin_hash))throw new Error('That PIN didn’t match.');
  const {error}=await a.from('kid_devices').update({parent_unlocked_until:new Date(Date.now()+15*60000).toISOString(),child_id:null,child_verified_at:null}).eq('id',d.id).is('revoked_at',null);
  if(error)throw new Error('Couldn’t open the parent area.');
  // PIN opens navigation only; a normal authenticated parent session still authorizes Hub data.
  const {getRequest}=await import('@tanstack/react-start/server');
  const token=getRequest().headers.get('authorization')?.replace(/^Bearer /,'');
  if(token){const {createClient}=await import('@supabase/supabase-js');const url=process.env['SUPABASE_URL'],key=process.env['SUPABASE_PUBLISHABLE_KEY'];if(url&&key){const client=createClient(url,key,{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${token}`}}});const {data:claims}=await client.auth.getClaims(token);if(claims?.claims.sub===d.parent_id){const sessionId=z.string().uuid().parse(claims.claims['session_id']||d.parent_id);const {error:modeError}=await a.from('studio_device_modes').upsert({session_id:sessionId,parent_id:d.parent_id,kid_locked:false,changed_at:new Date().toISOString()});if(modeError)throw new Error('Couldn’t open the parent area.');}}}
  return {ok:true};
});
export const resetKidPlayer=createServerFn({method:'POST'}).handler(async()=>{
  const s=await import('./kid-device.server'),d=await s.resolveDevice();if(d){const {error}=await (await s.admin()).from('kid_devices').update({child_id:null,child_verified_at:null,parent_unlocked_until:null}).eq('id',d.id).is('revoked_at',null);if(error)throw new Error('Couldn’t switch players.');}return {ok:true};
});
export const forgetInvalidKidDevice=createServerFn({method:'POST'}).handler(async()=>{
  const s=await import('./kid-device.server');if(await s.resolveDevice())throw new Error('Enter your parent PIN first.');
  const {setResponseHeader,getRequest}=await import('@tanstack/react-start/server');const secure=new URL(getRequest().url).protocol==='https:'?'; Secure':'';setResponseHeader('Set-Cookie',`bugley_kids=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);return {ok:true};
});