import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { familyHasAccess } from "@/lib/billing.functions";

export type ArtStyle = { key: string; name: string; description: string };
export type CastMember = { id: string; title: string; url: string; details: { type?: string; personality?: string; summary?: string } | null };

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Only the Bugley admin can do this.");
}
const env = z.enum(["sandbox", "live"]);

/** Kid-facing style list (recipes stay hidden on the server). */
export const listStyles = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("art_styles").select("key,name,description").eq("active", true).order("position");
  return (data ?? []) as ArtStyle[];
});
export const stylesOptions = queryOptions({ queryKey: ["art-styles"], queryFn: () => listStyles() });

export const listCast = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ childId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase.from("studio_creations").select("id,title,images,details").eq("parent_id", context.userId).eq("child_id", data.childId).eq("kind", "character").is("deleted_at", null).order("created_at", { ascending: false });
    const { signPaths } = await import("@/lib/images.server");
    const urls = await signPaths((rows ?? []).map((r: any) => r.images?.[0] ?? ""));
    return (rows ?? []).map((r: any, i) => ({ id: r.id, title: r.title, url: urls[i] ?? "", details: r.details })) as CastMember[];
  });

const genInput = z.object({
  childId: z.string().uuid(), environment: env, styleKey: z.string().max(40),
  description: z.string().trim().min(3).max(600), characterIds: z.array(z.string().uuid()).max(4).default([]),
});

/** Picture Maker: sketch (1 glow) or final (3 glow). Saved straight to the album. */
export const makePicture = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => genInput.extend({ mode: z.enum(["sketch", "final"]) }).parse(i))
  .handler(async ({ data, context }) => {
    if (!(await familyHasAccess(context.supabase, context.userId, data.environment))) return { ok: false as const, reply: "I’m taking a little nap right now. Ask a grown-up!" };
    const { generateImage } = await import("@/lib/images.server");
    const r = await generateImage(context.supabase, context.userId, data);
    if (!r.ok) return r;
    const { saveCreation } = await import("@/lib/studio.server");
    const title = data.description.length > 40 ? `${data.description.slice(0, 38).trim()}…` : data.description;
    const id = await saveCreation(context.userId, { child_id: data.childId, kind: "picture", title, body: data.description, images: [r.path] });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("studio_creations").update({ style_key: data.styleKey, details: { mode: data.mode, characters: data.characterIds } }).eq("id", id);
    return { ok: true as const, id, url: r.url };
  });

/** Character Creator: portrait generation (1 glow each try). Not saved until the kid picks it. */
export const makeCharacterPortrait = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => genInput.omit({ characterIds: true }).parse(i))
  .handler(async ({ data, context }) => {
    if (!(await familyHasAccess(context.supabase, context.userId, data.environment))) return { ok: false as const, reply: "I’m taking a little nap right now. Ask a grown-up!" };
    const { generateImage } = await import("@/lib/images.server");
    const r = await generateImage(context.supabase, context.userId, { ...data, mode: "character", characterIds: [] });
    return r.ok ? { ok: true as const, path: r.path, url: r.url } : r;
  });

export const saveCharacter = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    childId: z.string().uuid(), path: z.string().max(200), name: z.string().trim().min(1).max(40), styleKey: z.string().max(40),
    type: z.string().max(40), personality: z.string().max(40), summary: z.string().max(600),
  }).parse(i))
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/${data.childId}/`) || data.path.includes("..")) throw new Error("That picture isn’t yours.");
    const s = await import("@/lib/studio.server");
    const child = await s.loadChild(context.supabase, context.userId, data.childId);
    const guard = await s.guardChildText(context.supabase, context.userId, child, data.name, "character_name");
    if (guard.decision !== "allowed") return { ok: false as const, reply: guard.reply!, chips: guard.chips ?? [] };
    const looks = await s.guardChildText(context.supabase, context.userId, child, `${data.type}; ${data.personality}; ${data.summary}`, "character_details");
    if (looks.decision !== "allowed") return { ok: false as const, reply: looks.reply!, chips: looks.chips ?? [] };
    const id = await s.saveCreation(context.userId, { child_id: data.childId, kind: "character", title: data.name, body: data.summary, images: [data.path] });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("studio_creations").update({ style_key: data.styleKey, details: { type: data.type, personality: data.personality, summary: data.summary } }).eq("id", id);
    return { ok: true as const, id };
  });

/** Signs stored image paths for the album. */
export const signImages = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ paths: z.array(z.string().max(200)).max(200) }).parse(i))
  .handler(async ({ data, context }) => {
    const own = data.paths.filter((p) => p.startsWith(`${context.userId}/`));
    const { signPaths } = await import("@/lib/images.server");
    const urls = await signPaths(own);
    return Object.fromEntries(own.map((p, i) => [p, urls[i] ?? ""])) as Record<string, string>;
  });

// ---------- Admin ----------
export const getImageAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context);
  const [m, s] = await Promise.all([
    context.supabase.from("image_models").select("mode,model,version,settings").order("mode"),
    context.supabase.from("art_styles").select("key,name,description,recipe,position,active").order("position"),
  ]);
  return { models: (m.data ?? []).map((r: any) => ({ mode: r.mode as string, model: r.model as string, version: r.version as string, settings: JSON.stringify(r.settings ?? {}, null, 2) })), styles: (s.data ?? []) as (ArtStyle & { recipe: string; position: number; active: boolean })[] };
});

export const saveImageModel = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ mode: z.enum(["sketch", "final", "character"]), model: z.string().trim().max(120).regex(/^$|^[\w.-]+\/[\w.-]+$/, "Use owner/name"), version: z.string().trim().max(100), settings: z.record(z.string(), z.unknown()) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("image_models").update({ model: data.model, version: data.version, settings: data.settings as never, updated_at: new Date().toISOString() }).eq("mode", data.mode);
    if (error) throw new Error("Couldn’t save.");
    return { ok: true };
  });

export const saveStyle = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ key: z.string(), name: z.string().trim().min(1).max(40), description: z.string().max(120), recipe: z.string().max(1500), active: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("art_styles").update({ name: data.name, description: data.description, recipe: data.recipe, active: data.active, updated_at: new Date().toISOString() }).eq("key", data.key);
    if (error) throw new Error("Couldn’t save.");
    return { ok: true };
  });
