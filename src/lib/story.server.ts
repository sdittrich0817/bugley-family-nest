import type { SupabaseClient } from "@supabase/supabase-js";
import { storySchema, type Story } from "./story";
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