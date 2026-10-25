// Create Studio V3: one idea → four-scene comic arc → one scene at a time.
// Reuses workspace persistence, safety guards, Character Lock and Glow charging.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireKidOrParentAuth } from "./kid-device-auth";
import { familyHasAccess } from "./billing.functions";
import { EMPTY_MAP, ideaGenre } from "./story";
import { newComicPage } from "./comic";
import { v3Count, v3Details, replaceV3Art } from "./v3";

const identity = z.object({ childId: z.string().uuid(), id: z.string().uuid() });
const environment = z.enum(["sandbox", "live"]);
const NAP = "Ask a grown-up to open your Studio plan.";

/** Moment 1 — The Spark: one idea starts a saved four-scene comic workspace. No title, genre, style or length questions. */
export const startV3Comic = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), id: z.string().uuid(), idea: z.string().trim().min(3).max(600), environment }).parse(i)).handler(async ({ data, context }) => {
  if (!await familyHasAccess(context.supabase, context.userId, data.environment)) throw new Error(NAP);
  const s = await import("./studio.server");
  const child = await s.loadChild(context.supabase, context.userId, data.childId);
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await a.from("studio_creations").select("id,parent_id,child_id").eq("id", data.id).maybeSingle();
  if (existing) {
    if (existing.parent_id !== context.userId || existing.child_id !== child.id) throw new Error("Choose your own creation.");
    return (await import("./workspace.server")).loadWorkspace(context.supabase, context.userId, child.id, data.id);
  }
  const guard = await s.guardChildText(context.supabase, context.userId, child, data.idea, "story_idea");
  if (guard.decision !== "allowed") throw new Error(guard.reply ?? "Try a made-up idea.");
  const { data: styles } = await a.from("art_styles").select("key").eq("active", true).order("position");
  const style = styles?.find(x => x.key === "classic_comic")?.key ?? styles?.[0]?.key;
  if (!style) throw new Error("Bugley’s paints aren’t ready yet.");
  const page = newComicPage("four");
  const workspace = { version: 1 as const, v3: true as const, originalIdea: data.idea, activity: "imagine" as const, outlineApproved: false, castVersions: {} };
  const details = { workspace, genre: "Adventure", styleKey: style, characterIds: [], map: { ...EMPTY_MAP }, pages: [page], finished: false, cover: null, guidedBand: child.age_band, length: "short", followups: [] };
  const { error } = await a.from("studio_creations").insert({ id: data.id, parent_id: context.userId, child_id: child.id, kind: "comic", title: "My comic", body: data.idea, style_key: style, details: details as never });
  if (error) throw new Error("Your idea is still here. Try saving again.");
  return (await import("./workspace.server")).loadWorkspace(context.supabase, context.userId, child.id, data.id);
});

