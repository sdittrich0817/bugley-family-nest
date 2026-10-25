import type { SupabaseClient } from "@supabase/supabase-js";
import { storySchema, storyCoachingInstructions, cleanSparks, beatBandOf, beatQuestion, storyBeats, type Story } from "./story";
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

export async function assistStory(sb: SupabaseClient<any>, userId: string, child: { id: string; age_band: string }, id: string, text: string, purpose: "coach" | "picture" | "spelling" | "step" | "titles", pageId?: string) {
  const story = await loadStory(sb, userId, child.id, id);
  const storyBible = await (await import("./book.server")).bibleContext(sb, userId, child.id, story.data.bookId);
  const BIBLE = storyBible ? " This is one chapter of a multi-chapter book. Read the Story Bible first: keep names, looks, places and past events consistent, gently ask about conflicts, and keep track of the big story and open mysteries. The chapter has its own mini story spine." : "";
  const page = story.data.pages.find((p) => p.id === pageId);
  const task = purpose === "picture"
    ? "Draft ONLY an illustration description from the child's saved page, under 600 characters. Include lighting, composition, mood and the saved setting without inventing new plot events. Preserve the hero’s Character DNA. Never put words, letters, captions or speech bubbles in the image. This is hidden rendering instructions, not story prose. Return it in description; reply and chips empty."
    : purpose === "spelling" ? "Give optional spelling help for at most three words in the saved page. Never rewrite any sentence. Return description as empty."
    : purpose === "titles" ? "Offer exactly 3 short, original title ideas based ONLY on the saved story, as chips. Do not write any story text. Return description empty."
    : purpose === "step" ? "Ask exactly one question for the current hidden beat. Refer to the child's saved choices and previous pages; don't invent events. Return 3 sparks of 2–5 words each, never complete sentences. Return description empty."
    : "Coach the child's question. Only ask one question if needed. If the question requests a check of the saved line or a quiet continuity check, return an empty reply and empty chips unless the current line is too vague to illustrate or has a specific conflict with earlier pages. The setup problem is a future plan, not a conflict. Ask once, never require a change. Return description as empty.";
  const out = await aiObject(z.object({ reply: z.string(), chips: z.array(z.string()), description: z.string() }), `${storyCoachingInstructions(child.age_band)} ${task} Return a brief reply and 2–3 idea sparks (2–5 words each). End the reply with Your call!${BIBLE}`, JSON.stringify({ storyBible, question: text, genre: story.data.genre, map: story.data.map, outline: story.data.outline ?? null, pages: story.data.pages.map((p) => ({ step: p.step, text: p.text, chapter: p.chapter })), currentPage: page?.text ?? "", hiddenBeat: story.data.guidedBand ? storyBeats(beatBandOf(story.data, child.age_band))[story.data.pages.findIndex((p) => p.id === pageId)] : undefined, defaultQuestion: story.data.guidedBand ? beatQuestion(beatBandOf(story.data, child.age_band), story.data.pages.findIndex((p) => p.id === pageId), story.data.map) : undefined }));
  if (!out) throw new Error("Bugley couldn’t check your story right now. Your words are still saved.");
  return { reply: !out.reply.trim() ? "" : out.reply.endsWith("Your call!") ? out.reply : `${out.reply} Your call!`, chips: purpose === "titles" ? out.chips.map((c) => c.trim().slice(0, 80)).filter(Boolean).slice(0, 3) : cleanSparks(out.chips), description: purpose === "picture" ? out.description.slice(0, 600) : "" };
}
