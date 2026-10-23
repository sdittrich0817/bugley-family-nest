import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { comicSchema, comicCoachingInstructions, type Comic } from "./comic";
import { storyCoachingInstructions } from "./story";
import { aiObject } from "./studio-ai.server";
import { signPaths } from "./images.server";

export async function loadComic(sb: SupabaseClient<any>, userId: string, childId: string, id: string): Promise<Comic> {
  const { data, error } = await sb.from("studio_creations").select("id,title,details,updated_at").eq("id", id).eq("parent_id", userId).eq("child_id", childId).eq("kind", "comic").is("deleted_at", null).maybeSingle();
  if (error || !data) throw new Error("We couldn’t open that comic.");
  const parsed = comicSchema.safeParse(data.details);
  if (!parsed.success) throw new Error("That comic isn’t ready to open here yet.");
  const paths = [...parsed.data.pages.flatMap((p) => p.panels.flatMap((x) => [x.sketch, x.image].filter((v): v is string => !!v))), ...(parsed.data.cover ? [parsed.data.cover] : [])];
  const urls = await signPaths(paths);
  return { id: data.id, title: data.title, updatedAt: data.updated_at, data: parsed.data, urls: Object.fromEntries(paths.map((p, i) => [p, urls[i] ?? ""])) };
}

export async function persistComic(userId: string, childId: string, comic: Comic) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const images = [comic.data.cover, ...comic.data.pages.flatMap((p) => p.panels.map((x) => x.image ?? x.sketch))].filter((p): p is string => !!p);
  const body = comic.data.pages.flatMap((p) => p.panels.flatMap((x) => x.layers.map((l) => l.text))).filter(Boolean).join("\n");
  const { data, error } = await supabaseAdmin.from("studio_creations").update({ title: comic.title, details: comic.data as never, style_key: comic.data.styleKey, images, body, updated_at: new Date().toISOString() }).eq("id", comic.id).eq("parent_id", userId).eq("child_id", childId).is("deleted_at", null).eq("updated_at", comic.updatedAt).select("id").maybeSingle();
  if (error || !data) throw new Error("Your comic changed in another window. Reopen it before saving again.");
}

export async function assistComic(sb: SupabaseClient<any>, userId: string, child: { id: string; age_band: string }, id: string, text: string, pageId?: string) {
  const comic = await loadComic(sb, userId, child.id, id);
  const storyBible = await (await import("./book.server")).bibleContext(sb, userId, child.id, comic.data.bookId);
  const BIBLE = storyBible ? " This is one chapter of a multi-chapter book. Read the Story Bible first: keep names, looks, places and past events consistent, gently ask about conflicts, and keep track of the big story and open mysteries. The chapter has its own mini story spine." : "";
  const index = comic.data.pages.findIndex((p) => p.id === pageId);
  const out = await aiObject(z.object({ reply: z.string(), chips: z.array(z.string()) }),
    `${storyCoachingInstructions(child.age_band)} ${comicCoachingInstructions()} Coach the child's question with one question. Return a brief reply and 2–3 idea sparks (maximum 6 words each). End the reply with Your call!${BIBLE}`,
    JSON.stringify({ storyBible, question: text, genre: comic.data.genre, map: comic.data.map, pageCount: comic.data.pages.length, currentPage: index + 1, pages: comic.data.pages.map((p, i) => ({ page: i + 1, layout: p.layout, panels: p.panels.map((x) => ({ shows: x.description, angle: x.angle, text: x.layers.map((l) => `${l.type}: ${l.text}`) })) })) }));
  if (!out) throw new Error("Bugley couldn’t check your comic right now. Your work is still saved.");
  return { reply: out.reply.endsWith("Your call!") ? out.reply : `${out.reply} Your call!`, chips: out.chips.slice(0, 3).map((c) => c.replace(/\s*Your call!$/i, "").trim().split(/\s+/).slice(0, 6).join(" ")) };
}
