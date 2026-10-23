import type { SupabaseClient } from "@supabase/supabase-js";
import { storySchema, storyCoachingInstructions, type Story } from "./story";
import { z } from "zod";
import { aiObject } from "./studio-ai.server";
import { signPaths } from "./images.server";

export async function loadStory(sb: SupabaseClient<any>, userId: string, childId: string, id: string): Promise<Story> {
  const { data, error } = await sb.from("studio_creations").select("id,title,details,updated_at").eq("id", id).eq("parent_id", userId).eq("child_id", childId).eq("kind", "story").is("deleted_at", null).maybeSingle();
  if (error || !data) throw new Error("We couldn’t open that story.");
  const parsed = storySchema.safeParse(data.details);
  if (!parsed.success) throw new Error("That story isn’t ready to open here yet.");
  const paths = [...parsed.data.pages.flatMap((p) => p.image ? [p.image] : []), ...(parsed.data.cover ? [parsed.data.cover] : [])];
  const urls = await signPaths(paths);
  return { id: data.id, title: data.title, updatedAt: data.updated_at, data: parsed.data, urls: Object.fromEntries(paths.map((p, i) => [p, urls[i] ?? ""])) };
}

export async function persistStory(userId: string, childId: string, story: Story) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const images = [story.data.cover, ...story.data.pages.map((p) => p.image)].filter((p): p is string => !!p);
  const { data, error } = await supabaseAdmin.from("studio_creations").update({ title: story.title, details: story.data as never, style_key: story.data.styleKey, images, body: story.data.pages.map((p) => p.text).join("\n\n"), updated_at: new Date().toISOString() }).eq("id", story.id).eq("parent_id", userId).eq("child_id", childId).is("deleted_at", null).eq("updated_at", story.updatedAt).select("id").maybeSingle();
  if (error || !data) throw new Error("Your story changed in another window. Reopen it before saving again.");
}

export async function assistStory(sb: SupabaseClient<any>, userId: string, child: { id: string; age_band: string }, id: string, text: string, purpose: "coach" | "picture" | "spelling", pageId?: string) {
  const story = await loadStory(sb, userId, child.id, id);
  const storyBible = await (await import("./book.server")).bibleContext(sb, userId, child.id, story.data.bookId);
  const BIBLE = storyBible ? " This is one chapter of a multi-chapter book. Read the Story Bible first: keep names, looks, places and past events consistent, gently ask about conflicts, and keep track of the big story and open mysteries. The chapter has its own mini story spine." : "";
  const page = story.data.pages.find((p) => p.id === pageId);
  const task = purpose === "picture"
    ? "Draft ONLY an illustration description from the child's saved page, under 600 characters. This is not story prose. No new plot events. Return it in description for the child to edit."
    : purpose === "spelling" ? "Give optional spelling help for at most three words in the saved page. Never rewrite any sentence. Return description as empty."
    : "Coach the child's question. Only ask one question if needed. If the question requests a quiet continuity check, return an empty reply and empty chips unless there is a specific conflict with the map or earlier pages. Return description as empty.";
  const out = await aiObject(z.object({ reply: z.string(), chips: z.array(z.string()), description: z.string() }), `${storyCoachingInstructions(child.age_band)} ${task} Return a brief reply and 2–3 idea sparks (maximum 6 words each). End the reply with Your call!${BIBLE}`, JSON.stringify({ storyBible, question: text, genre: story.data.genre, map: story.data.map, pages: story.data.pages.map((p) => ({ step: p.step, text: p.text, chapter: p.chapter })), currentPage: page?.text ?? "" }));
  if (!out) throw new Error("Bugley couldn’t check your story right now. Your words are still saved.");
  return { reply: !out.reply.trim() ? "" : out.reply.endsWith("Your call!") ? out.reply : `${out.reply} Your call!`, chips: out.chips.slice(0, 3).map((c) => c.replace(/\s*Your call!$/i, "").trim().split(/\s+/).slice(0, 6).join(" ")), description: purpose === "picture" ? out.description.slice(0, 600) : "" };
}