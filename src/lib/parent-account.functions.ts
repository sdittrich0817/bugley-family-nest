import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireParentDevice } from './parent-device.functions';

export const getParentAccount = createServerFn({ method: "GET" }).middleware([requireParentDevice]).handler(async ({ context }) => {
  const { data: userData, error: userError } = await context.supabase.auth.getUser();
  if (userError || !userData.user?.email_confirmed_at) throw new Error("Please verify your email before opening your account.");
  const { data: profile, error } = await context.supabase.from("profiles").select("first_name,last_name").eq("id", context.userId).single();
  if (error || !profile) throw new Error("A verified parent account with parental consent is required.");
  const { data: consent, error: consentError } = await context.supabase.from("parental_consents").select("agreed_at,consent_version,consent_text").eq("parent_id", context.userId).single();
  if (consentError || !consent) throw new Error("Parental consent is required.");
  return { profile, consent };
});