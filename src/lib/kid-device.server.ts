import { getRequest, setResponseHeader } from '@tanstack/react-start/server';
import { DEVICE_SECONDS, deviceAvailable, PIN_ATTEMPTS, PIN_WINDOW_SECONDS } from './kid-device-rules';

export const admin = async () => (await import('@/integrations/supabase/client.server')).supabaseAdmin;
export async function digest(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2,'0')).join(''); }
export function randomSecret() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,'0')).join(''); }
export function cookie(name: string) { return getRequest().headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length+1) ?? ''; }
export function writeDeviceCookie(secret: string) { const secure = new URL(getRequest().url).protocol === 'https:' ? '; Secure' : ''; setResponseHeader('Set-Cookie', `bugley_kids=${secret}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${DEVICE_SECONDS}${secure}`); }
export async function resolveDevice() {
  const secret = cookie('bugley_kids');
  if (!/^[a-f0-9]{64}$/.test(secret)) return null;
  const a = await admin();
  const {data,error} = await a.from('kid_devices').select('*').eq('secret_hash',await digest(secret)).maybeSingle();
  if (error || !data || !deviceAvailable(data)) return null;
  const [{data:profile},{data:consent}] = await Promise.all([a.from('profiles').select('id').eq('id',data.parent_id).maybeSingle(),a.from('parental_consents').select('parent_id').eq('parent_id',data.parent_id).maybeSingle()]);
  if (!profile || !consent) return null;
  const {data:account,error:accountError}=await a.auth.admin.getUserById(data.parent_id);
  if(accountError||!account.user?.email_confirmed_at)return null;
  await a.from('kid_devices').update({last_used_at:new Date().toISOString()}).eq('id',data.id).is('revoked_at',null);
  return data;
}
export async function attempt(key: string, limit=PIN_ATTEMPTS, seconds=PIN_WINDOW_SECONDS) {
  const {data,error}=await (await admin()).rpc('claim_kid_auth_attempt',{_key:key,_limit:limit,_seconds:seconds});
  if(error || data!==true) throw new Error('Too many tries. Please wait 15 minutes and ask your grown-up.');
}
export async function pinHash(pin:string,salt:string) {
  const bytes=salt.match(/../g); if(!bytes) throw new Error('Invalid credential.');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new Uint8Array(bytes.map(h=>parseInt(h,16))),iterations:100000},key,256);
  return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');
}
export function sameSecret(a:string,b:string) { let diff=a.length^b.length; for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0); return diff===0; }