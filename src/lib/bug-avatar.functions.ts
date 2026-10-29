import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireKidOrParentAuth } from "./kid-device-auth";
import { BUG_ANTENNAE, BUG_EXTRAS, BUG_EYES, BUG_KINDS, BUG_MOUTHS, BUG_PATTERNS, COLOR_KEYS, bugSchema, avatarCost } from "./bug-avatar";

/** Kid saves the bug they built. Only allow-listed parts can be stored. */
export const saveBug = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), bug: bugSchema }).parse(i)).handler(async ({ data, context }) => {
  const { imagePath: _path, imageUrl: _url, ...parts } = data.bug;
  const { data: row, error } = await context.supabase.from("children").update({ bug: parts as never }).eq("id", data.childId).eq("parent_id", context.userId).select("id").single();
  if (error || !row) throw new Error("We couldn’t save your bug. Try again!");
  return { bug: parts };
});

export const getBugTries = createServerFn({ method: 'POST' }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  const { loadChild } = await import('./studio.server');
  await loadChild(context.supabase, context.userId, data.childId);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { count, error } = await supabaseAdmin.from('bug_avatar_attempts').select('op', { count: 'exact', head: true }).eq('child_id', data.childId).eq('status', 'complete');
  if (error) throw new Error('Couldn’t check your free tries.');
  return { completed: count ?? 0, nextCost: avatarCost(count ?? 0) };
});

export const generateBugPicture = createServerFn({ method: 'POST' }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), words: z.string().trim().min(2).max(200), bug: bugSchema, op: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  const { paintBugAvatar } = await import('./images.server');
  return paintBugAvatar(context.supabase, context.userId, data.childId, data.words, data.bug, data.op);
});

/** Bugley turns the kid's words into bug parts. The AI only picks from the parts list; it never draws or writes anything. */
export const designBugFromWords = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), words: z.string().trim().min(2).max(200) }).parse(i)).handler(async ({ data, context }) => {
  const s = await import("./studio.server");
  const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const g = await s.guardChildText(context.supabase, context.userId, child, data.words, "avatar");
  if (g.decision !== "allowed") return { ok: false as const, reply: g.reply ?? "Let’s try a different bug idea!" };
  const { aiObject } = await import("./studio-ai.server");
  const list = (k: string, v: readonly string[]) => `${k}: ${v.join(", ")}`;
  const bug = await aiObject(bugSchema,
    `You turn a child's description of a cartoon bug into parts. Pick the closest option for every field. If something isn't described, choose a fun option that fits.\n${[list("kind", BUG_KINDS), list("body/accent colors", COLOR_KEYS), list("pattern", BUG_PATTERNS), list("eyes", BUG_EYES), list("mouth", BUG_MOUTHS), list("antennae", BUG_ANTENNAE), list("extra", BUG_EXTRAS)].join("\n")}`,
    data.words);
  if (!bug) return { ok: false as const, reply: "Hmm, my glow flickered. Try building it with the buttons!" };
  return { ok: true as const, bug };
});
