import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { saveChildSchema, credentialValue, type ChildProfile } from "@/lib/family";
import { requireParentDevice } from './parent-device.functions';

export const getFamily = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const s=await import('./kid-device.server');if(s.cookie('bugley_kids'))throw new Error('Use the Kids player picker on this device.');
  const { data: profile, error: profileError } = await context.supabase.from("profiles").select("family_setup_completed_at").eq("id", context.userId).single();
  if (profileError || !profile) throw new Error("A verified parent account and parental consent are required.");
  const { data, error } = await context.supabase.from("children").select("id,nickname,age,avatar,bug,login_kind,age_band,bugley_stage").eq("parent_id", context.userId).order("created_at");
  if (error) throw new Error("We couldn’t load your family. Please try again.");
  return { children: (data ?? []) as ChildProfile[], completed: Boolean(profile.family_setup_completed_at) };
});
export const familyOptions = queryOptions({ queryKey: ["family"], queryFn: () => getFamily() });

export const saveChild = createServerFn({ method: "POST" }).middleware([requireParentDevice]).inputValidator((input: unknown) => saveChildSchema.parse(input)).handler(async ({ data, context }) => {
  const details = { nickname: data.nickname, age: data.age, avatar: data.avatar };
  let secured: { credential_hash: string; credential_salt: string; login_kind: "pin" | "pictures" } | undefined;
  if (data.credential) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(credentialValue(data.credential)), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
    const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    secured = { credential_hash: hex(new Uint8Array(bits)), credential_salt: hex(salt), login_kind: data.credential.kind };
  }
  if (data.id) {
    const { data: updated, error } = await context.supabase.from("children").update({ ...details, ...secured }).eq("id", data.id).eq("parent_id", context.userId).select("id").single();
    if (error || !updated) throw new Error("We couldn’t save this child. Please try again.");
  } else {
    if (!secured) throw new Error("Choose a child login.");
    const { error } = await context.supabase.from("children").insert({ ...details, ...secured, parent_id: context.userId });
    if (error) throw new Error(error.message.includes("5 children") ? "Your family can have up to 5 children." : "We couldn’t add your child. Please try again.");
  }
  return { saved: true };
});
export const removeChild = createServerFn({ method: "POST" }).middleware([requireParentDevice]).inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  const { data: removed, error } = await context.supabase.from("children").delete().eq("id", data.id).eq("parent_id", context.userId).select("id").single();
  if (error || !removed) throw new Error("We couldn’t remove this child. Please try again.");
  return { removed: true };
});
export const finishFamilySetup = createServerFn({ method: "POST" }).middleware([requireParentDevice]).handler(async ({ context }) => {
  const { count, error: countError } = await context.supabase.from("children").select("id", { count: "exact", head: true }).eq("parent_id", context.userId);
  if (countError || !count) throw new Error("Add at least one child before finishing.");
  const { data, error } = await context.supabase.from("profiles").update({ family_setup_completed_at: new Date().toISOString() }).eq("id", context.userId).select("id").single();
  if (error || !data) throw new Error("We couldn’t finish setup. Please try again.");
  return { completed: true };
});