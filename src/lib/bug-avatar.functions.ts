import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BUG_ANTENNAE, BUG_EXTRAS, BUG_EYES, BUG_KINDS, BUG_MOUTHS, BUG_PATTERNS, COLOR_KEYS, bugSchema } from "./bug-avatar";

/** Kid saves the bug they built. Only allow-listed parts can be stored. */
export const saveBug = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), bug: bugSchema }).parse(i)).handler(async ({ data, context }) => {
  const { data: row, error } = await context.supabase.from("children").update({ bug: data.bug as never }).eq("id", data.childId).eq("parent_id", context.userId).select("id").single();
  if (error || !row) throw new Error("We couldn’t save your bug. Try again!");
  return { bug: data.bug };
});

/** Bugley turns the kid's words into bug parts. The AI only picks from the parts list; it never draws or writes anything. */
export const designBugFromWords = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), words: z.string().trim().min(2).max(200) }).parse(i)).handler(async ({ data, context }) => {
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
