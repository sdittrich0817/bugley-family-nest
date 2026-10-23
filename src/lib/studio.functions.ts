import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { familyHasAccess } from "@/lib/billing.functions";

export const CREATION_KINDS = ["picture", "story", "comic", "book", "character", "game"] as const;
export type CreationKind = (typeof CREATION_KINDS)[number];
export type Creation = { id: string; child_id: string; kind: CreationKind; title: string; project: string | null; position: number; body: string | null; images: string[]; favorite: boolean; deleted_at: string | null; created_at: string; updated_at: string };
const COLS = "id,child_id,kind,title,project,position,body,images,favorite,deleted_at,created_at,updated_at";
const DAY = 86400000;

/** All of Bugley's replies come from here; child text passes the safety guard first. */
export const askBugley = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    childId: z.string().uuid(), text: z.string().trim().min(1).max(600),
    source: z.enum(["prompt_bar", "sidekick", "chip"]), context: z.string().max(80), environment: z.enum(["sandbox", "live"]),
    storyId: z.string().uuid().optional(), pageId: z.string().uuid().optional(), purpose: z.enum(["coach", "picture", "spelling", "step", "titles"]).optional(), panelId: z.string().uuid().optional(), comicId: z.string().uuid().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const s = await import("@/lib/studio.server");
    const child = await s.loadChild(context.supabase, context.userId, data.childId);
    if (!(await familyHasAccess(context.supabase, context.userId, data.environment))) return { reply: "I’m taking a little nap right now. Ask a grown-up!", chips: [] as string[], blocked: true };
    const guard = await s.guardChildText(context.supabase, context.userId, child, data.text, data.source);
    if (guard.decision !== "allowed") return { reply: guard.reply ?? "Let’s try a safe idea.", chips: guard.chips ?? [], blocked: true };
    if (data.purpose === "spelling") {
      const { data: controls } = await context.supabase.from("child_controls").select("spelling_help").eq("parent_id", context.userId).eq("child_id", child.id).maybeSingle();
      if (!controls?.spelling_help) return { reply: "Your words are yours. Spelling help is turned off by your grown-up.", chips: [] as string[], blocked: true };
    }
    const out = data.comicId
      ? await (await import("./comic.server")).assistComic(context.supabase, context.userId, child, data.comicId, data.text, data.pageId, data.purpose ?? "coach", data.panelId)
      : data.storyId
      ? await (await import("./story.server")).assistStory(context.supabase, context.userId, child, data.storyId, data.text, data.purpose ?? "coach", data.pageId)
      : await s.bugleyReply(child, data.text, data.context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("studio_events").update({ reply: out.reply }).eq("child_id", child.id).eq("decision", "allowed").is("reply", null).eq("input", data.text.slice(0, 2000));
    return { ...out, blocked: false };
  });

export const listAlbum = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ childId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("studio_creations").select(COLS).eq("child_id", data.childId).eq("parent_id", context.userId).is("deleted_at", null).order("created_at", { ascending: false });
    if (error) throw new Error("We couldn’t open the album.");
    const list = (rows ?? []) as Creation[];
    const paths = list.flatMap((c) => c.images).filter((p) => !p.startsWith("http"));
    const { signPaths } = await import("@/lib/images.server");
    const urls = await signPaths(paths);
    const map = new Map(paths.map((p, i) => [p, urls[i] ?? ""]));
    return list.map((c) => ({ ...c, images: c.images.map((p) => map.get(p) ?? p) }));
  });

export const updateCreation = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), id: z.string().uuid(), title: z.string().trim().min(1).max(80).optional(), favorite: z.boolean().optional(), remove: z.boolean().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const patch: { updated_at: string; title?: string; favorite?: boolean; deleted_at?: string } = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) {
      const s = await import("@/lib/studio.server");
      const child = await s.loadChild(context.supabase, context.userId, data.childId);
      const guard = await s.guardChildText(context.supabase, context.userId, child, data.title, "rename");
      if (guard.decision !== "allowed") return { ok: false, reply: guard.reply!, chips: guard.chips ?? [] };
      patch.title = data.title;
    }
    if (data.favorite !== undefined) patch.favorite = data.favorite;
    if (data.remove) patch.deleted_at = new Date().toISOString();
    const { error } = await context.supabase.from("studio_creations").update(patch).eq("id", data.id).eq("child_id", data.childId).eq("parent_id", context.userId).is("deleted_at", null);
    if (error) throw new Error("We couldn’t save that.");
    return { ok: true };
  });

// ---------- Parent Hub ----------
export const getStudioActivity = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const [ev, cr, del, no] = await Promise.all([
    context.supabase.from("studio_events").select("id,child_id,source,input,decision,reply,created_at").eq("parent_id", context.userId).order("created_at", { ascending: false }).limit(100),
    context.supabase.from("studio_creations").select(COLS).eq("parent_id", context.userId).is("deleted_at", null).order("created_at", { ascending: false }).limit(100),
    context.supabase.from("studio_creations").select(COLS).eq("parent_id", context.userId).gte("deleted_at", since).order("deleted_at", { ascending: false }),
    context.supabase.from("parent_notifications").select("id,child_id,typed,starter,read,created_at").eq("parent_id", context.userId).order("created_at", { ascending: false }).limit(50),
  ]);
  if (ev.error || cr.error || del.error || no.error) throw new Error("We couldn’t load activity.");
  return { events: ev.data ?? [], creations: (cr.data ?? []) as Creation[], deleted: (del.data ?? []) as Creation[], notifications: no.data ?? [] };
});
export const studioActivityOptions = queryOptions({ queryKey: ["studio-activity"], queryFn: () => getStudioActivity() });

export const restoreCreation = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("studio_creations").update({ deleted_at: null, updated_at: new Date().toISOString() }).eq("id", data.id).eq("parent_id", context.userId);
    if (error) throw new Error("We couldn’t restore that.");
    return { ok: true };
  });

export const purgeCreation = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: own } = await context.supabase.from("studio_creations").select("id").eq("id", data.id).eq("parent_id", context.userId).not("deleted_at", "is", null).maybeSingle();
    if (!own) throw new Error("We couldn’t find that.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("studio_creations").delete().eq("id", data.id);
    return { ok: true };
  });

export const markNotificationRead = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await context.supabase.from("parent_notifications").update({ read: true }).eq("id", data.id).eq("parent_id", context.userId);
    return { ok: true };
  });
