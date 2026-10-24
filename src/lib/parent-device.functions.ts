import { createMiddleware, createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const requireParentDevice = createMiddleware({ type: 'function' }).middleware([requireSupabaseAuth]).server(async ({ context, next }) => {
  const { data, error } = await context.supabase.rpc('is_parent_device');
  if (error || data !== true) throw new Error('Enter your parent password to open this area.');
  return next();
});
export const getDeviceMode = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const {data,error}=await context.supabase.rpc('is_parent_device');
  if(error)throw new Error('Couldn’t check this device.');
  return {locked:data!==true};
});
export const lockKidDevice = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const sessionId = z.string().uuid().parse(context.claims['session_id'] || context.userId);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error } = await supabaseAdmin.from('studio_device_modes').upsert({ session_id: sessionId, parent_id: context.userId, kid_locked: true, changed_at: new Date().toISOString() });
  if (error) throw new Error('Couldn’t safely open the Kid Zone. Please try again.');
  return { ok: true };
});
export const unlockParentDevice = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(input)).handler(async ({ data, context }) => {
  const sessionId = z.string().uuid().parse(context.claims['session_id'] || context.userId);
  const { data: account, error: accountError } = await context.supabase.auth.getUser();
  if (accountError || !account.user?.email) throw new Error('Please sign in again.');
  const { data: verified, error } = await context.supabase.auth.signInWithPassword({ email: account.user.email, password: data.password });
  if (error || verified.user?.id !== context.userId) throw new Error('That password didn’t match.');
  const { data: activeParent, error: consentError } = await context.supabase.rpc('is_active_parent');
  if (consentError || activeParent !== true) throw new Error('Please finish your verified parent account first.');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error: saveError } = await supabaseAdmin.from('studio_device_modes').upsert({ session_id: sessionId, parent_id: context.userId, kid_locked: false, changed_at: new Date().toISOString() });
  if (saveError) throw new Error('Couldn’t open the parent area. Please try again.');
  return { ok: true };
});