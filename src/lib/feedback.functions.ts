import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireParentDevice } from "./parent-device.functions";

export const FEEDBACK_TOPICS = ["general", "bug", "confusing", "idea", "kids", "payments"] as const;
export const feedbackSchema = z.object({
  page: z.string().trim().max(300).default("/"),
  rating: z.number().int().min(1).max(5).optional(),
  topic: z.enum(FEEDBACK_TOPICS).default("general"),
  message: z.string().trim().min(1, "Tell us a little more.").max(3000),
  email: z.string().trim().email().max(254).optional().or(z.literal("").transform(() => undefined)),
});

/** Public tester feedback: insert-only, rate-limited, signed-in testers are linked automatically. */
export const submitFeedback = createServerFn({ method: "POST" }).inputValidator((i: unknown) => feedbackSchema.parse(i)).handler(async ({ data }) => {
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for") ?? "unknown";
  const { data: ok } = await a.rpc("claim_kid_auth_attempt", { _key: `feedback:${ip}`, _limit: 20, _seconds: 3600 });
  if (ok === false) return { ok: false, error: "Thanks! You’ve sent a lot of notes — try again in a little while." };
  let userId: string | null = null;
  const auth = getRequestHeader("authorization");
  if (auth?.startsWith("Bearer ")) { const { data: u } = await a.auth.getUser(auth.slice(7)); userId = u.user?.id ?? null; }
  const { error } = await a.from("site_feedback").insert({ user_id: userId, email: data.email ?? null, page: data.page, rating: data.rating ?? null, topic: data.topic, message: data.message });
  if (error) return { ok: false, error: "We couldn’t send that. Please try again." };
  return { ok: true };
});

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Only the Bugley admin can do this.");
}
export const getFeedback = createServerFn({ method: "GET" }).middleware([requireParentDevice]).handler(async ({ context }) => {
  await assertAdmin(context);
  const { data, error } = await context.supabase.from("site_feedback").select("*").order("created_at", { ascending: false }).limit(300);
  if (error) throw new Error("Couldn’t load feedback.");
  return data ?? [];
});
export const feedbackOptions = queryOptions({ queryKey: ["site-feedback"], queryFn: () => getFeedback() });
export const resolveFeedback = createServerFn({ method: "POST" }).middleware([requireParentDevice]).inputValidator((i: unknown) => z.object({ id: z.string().uuid(), resolved: z.boolean() }).parse(i)).handler(async ({ data, context }) => {
  await assertAdmin(context);
  const { error } = await context.supabase.from("site_feedback").update({ resolved: data.resolved }).eq("id", data.id);
  if (error) throw new Error("Couldn’t update.");
  return { ok: true };
});
