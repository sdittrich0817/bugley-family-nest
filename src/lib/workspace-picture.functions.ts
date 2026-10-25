import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireKidOrParentAuth } from "./kid-device-auth";
import { familyHasAccess } from "./billing.functions";

export const paintWorkspacePicture = createServerFn({ method: "POST" }).middleware([requireKidOrParentAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), id: z.string().uuid(), environment: z.enum(["sandbox", "live"]), op: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  if (!await familyHasAccess(context.supabase, context.userId, data.environment)) throw new Error("Ask a grown-up to open your Studio plan.");
  const { loadWorkspace } = await import("./workspace.server"); const p = await loadWorkspace(context.supabase, context.userId, data.childId, data.id);
  if (p.kind !== "picture") throw new Error("Choose a picture.");
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  if (p.details.paintOp === data.op && p.details.paintState === "done") return p;
  if (p.details.paintState === "painting") throw new Error("Your picture is still being painted. Reopen it in a moment.");
  const { data: claim } = await a.from("studio_creations").update({ details: { ...p.details, paintState: "painting", paintOp: data.op } }).eq("id", p.id).eq("parent_id", context.userId).eq("child_id", data.childId).eq("updated_at", p.updatedAt).select("id").maybeSingle();
  if (!claim) throw new Error("Your picture changed. Reopen it first.");
  let charged = false;
  try {
    const { generateImage } = await import("./images.server");
    const result = await generateImage(context.supabase, context.userId, { childId: data.childId, description: p.workspace.originalIdea, styleKey: p.styleKey, characterIds: p.details.characters ?? [], mode: "sketch", pictureFlow: true, op: data.op });
    if (!result.ok) throw new Error(result.reply);
    charged = true;
    const { error } = await a.from("studio_creations").update({ body: p.workspace.originalIdea, images: [result.path, ...p.images], details: { ...p.details, workspace: { ...p.workspace, activity: "make" }, paintState: "done", paintOp: data.op, mode: "sketch", pictureFlow: true, upgradeState: "ready" }, updated_at: new Date().toISOString() }).eq("id", p.id).eq("parent_id", context.userId).eq("child_id", data.childId);
    if (error) throw new Error("Your picture couldn’t save. Your Glow will be returned.");
    return loadWorkspace(context.supabase, context.userId, data.childId, p.id);
  } catch (e) {
    if (charged) await (await import("./glow.server")).refundGlow(context.userId, data.childId, "sketch", data.op);
    await a.from("studio_creations").update({ details: { ...p.details, paintState: "failed" } }).eq("id", p.id).eq("parent_id", context.userId).eq("child_id", data.childId);
    throw e;
  }
});