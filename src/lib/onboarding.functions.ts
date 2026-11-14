import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireKidOrParentAuth } from "./kid-device-auth";
import { WELCOME_KINDS, welcomeAutoShow, welcomePatch, type WelcomeRecord } from "./onboarding";

const childId = z.object({ childId: z.string().uuid() });

async function ownedChild(ctx: { supabase: any; userId: string }, id: string) {
  const { data } = await ctx.supabase.from("children").select("id,created_at").eq("id", id).eq("parent_id", ctx.userId).maybeSingle();
  if (!data) throw new Error("We couldn’t find that player.");
  return data as { id: string; created_at: string };
}
async function admin() { return (await import("@/integrations/supabase/client.server")).supabaseAdmin; }
async function record(a: any, id: string): Promise<WelcomeRecord> {
  const { data } = await a.from("child_onboarding").select("shown_at,skipped_at,completed_at,choice").eq("child_id", id).maybeSingle();
  return data ?? null;
}

export const getWelcomeState = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth])
  .inputValidator((i: unknown) => childId.parse(i))
  .handler(async ({ data, context }) => {
    const child = await ownedChild(context, data.childId);
    const a = await admin();
    const [{ data: s }, rec] = await Promise.all([a.from("onboarding_settings").select("welcome_launched_at").eq("id", 1).maybeSingle(), record(a, child.id)]);
    return { autoShow: welcomeAutoShow(child.created_at, s?.welcome_launched_at ?? null, rec) };
  });

export const recordWelcome = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth])
  .inputValidator((i: unknown) => childId.extend({ kind: z.enum(WELCOME_KINDS) }).parse(i))
  .handler(async ({ data, context }) => {
    const child = await ownedChild(context, data.childId);
    const a = await admin();
    const patch = welcomePatch(data.kind, await record(a, child.id), new Date().toISOString());
    const { error } = await a.from("child_onboarding").upsert({ child_id: child.id, parent_id: context.userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "child_id" });
    if (error) throw new Error("Couldn’t save that.");
    await a.from("child_onboarding_events").insert({ child_id: child.id, parent_id: context.userId, kind: data.kind });
    return { ok: true };
  });
