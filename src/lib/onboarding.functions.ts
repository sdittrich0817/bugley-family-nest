import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireKidOrParentAuth } from "./kid-device-auth";
import { queryOptions } from "@tanstack/react-query";
import { requireParentDevice } from "./parent-device.functions";
import { ARCADE_GAMES } from "./arcade";
import { FIRST_PLAY, WELCOME_KINDS, welcomeAutoShow, welcomeParentStatus, welcomePatch, type WelcomeBand, type WelcomeParentStatus, type WelcomeRecord } from "./onboarding";

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

/** Parent Hub: one welcome status per child, read as the parent under row-level security. */
export const getWelcomeOverview = createServerFn({ method: "GET" }).middleware([requireParentDevice]).handler(async ({ context }) => {
  const [kids, recs, settings] = await Promise.all([
    context.supabase.from("children").select("id,created_at,age_band").eq("parent_id", context.userId),
    context.supabase.from("child_onboarding").select("child_id,shown_at,skipped_at,completed_at,choice").eq("parent_id", context.userId),
    context.supabase.from("onboarding_settings").select("welcome_launched_at").eq("id", 1).maybeSingle(),
  ]);
  if (kids.error || recs.error) throw new Error("We couldn’t load welcome updates.");
  const byChild = new Map((recs.data ?? []).map((r: any) => [r.child_id, r]));
  const out: Record<string, WelcomeParentStatus> = {};
  for (const k of kids.data ?? []) {
    const band = (["sprouts", "explorers", "builders"].includes(k.age_band) ? k.age_band : "explorers") as WelcomeBand;
    const game = ARCADE_GAMES.find((g) => g.id === FIRST_PLAY[band])?.name ?? "a game";
    out[k.id] = welcomeParentStatus(k.created_at, settings.data?.welcome_launched_at ?? null, (byChild.get(k.id) as WelcomeRecord) ?? null, game);
  }
  return out;
});
export const welcomeOverviewOptions = queryOptions({ queryKey: ["welcome-overview"], queryFn: () => getWelcomeOverview() });
