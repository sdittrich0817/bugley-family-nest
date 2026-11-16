import type { SupabaseClient } from "@supabase/supabase-js";
import { workspaceOf, type WorkspaceProject } from "./workspace";
import { signPaths } from "./images.server";

export async function loadWorkspace(sb: SupabaseClient<any>, parentId: string, childId: string, id: string): Promise<WorkspaceProject> {
  const { data: row, error } = await sb.from("studio_creations").select("id,kind,title,body,images,details,style_key,updated_at").eq("id", id).eq("parent_id", parentId).eq("child_id", childId).is("deleted_at", null).maybeSingle();
  if (error || !row || !["comic", "story", "picture"].includes(row.kind)) throw new Error("We couldn’t open that creation.");
  const details = row.details ?? {};
  const workspace = workspaceOf(details, row.body ?? "");
  const paths: string[] = [...(row.images ?? []), ...(details.cover ? [details.cover] : []), ...(details.pages ?? []).flatMap((p: any) => p.panels ? p.panels.flatMap((x: any) => [x.image, x.sketch].filter(Boolean)) : [p.image].filter(Boolean)), ...(workspace.characterDraft?.options.map(o => o.path) ?? [])];
  const unique = [...new Set(paths)].filter(p => p.startsWith(`${parentId}/${childId}/`) && !p.includes(".."));
  const urls = await signPaths(unique);
  return { id: row.id, kind: row.kind, title: row.title, body: row.body, images: row.images ?? [], styleKey: row.style_key ?? "cartoon", updatedAt: row.updated_at, details, workspace, urls: Object.fromEntries(unique.map((p, i) => [p, urls[i] ?? ""])) };
}

export async function persistWorkspace(parentId: string, childId: string, project: WorkspaceProject) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error, data } = await supabaseAdmin.from("studio_creations").update({ title: project.title, body: project.body, images: project.images, style_key: project.styleKey, details: { ...project.details, workspace: project.workspace }, updated_at: new Date().toISOString() }).eq("id", project.id).eq("parent_id", parentId).eq("child_id", childId).is("deleted_at", null).eq("updated_at", project.updatedAt).select("id").maybeSingle();
  if (error || !data) throw new Error("Your creation changed in another window. Reopen it before saving; your words are still here.");
}
/** Interrupted paint claims: mark failed (art untouched) and refund once if that op was charged. Returns the reloaded project when recovered. */
export async function recoverStalePaint(sb: SupabaseClient<any>, parentId: string, childId: string, project: WorkspaceProject, now = Date.now()) {
  const { isStalePaint } = await import("./comic-continuity");
  if (!isStalePaint(project.details, project.updatedAt, now)) return project;
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const op = project.details.paintOp as string | undefined;
  const { data: reset } = await a.from("studio_creations").update({ details: { ...project.details, paintState: "failed" }, updated_at: new Date().toISOString() }).eq("id", project.id).eq("parent_id", parentId).eq("child_id", childId).eq("updated_at", project.updatedAt).select("id").maybeSingle();
  if (reset && op) {
    try { await (await import("./glow.server")).refundGlowOnce(sb, parentId, childId, op, "Refund: drawing was interrupted"); }
    catch (e) { console.error("stale paint refund failed", e); }
  }
  return loadWorkspace(sb, parentId, childId, project.id);
}

/** Freeze a comic's approved characters: copy portrait + reference sheets into versioned private paths so later edits can't change them. */
export async function snapshotCast(sb: SupabaseClient<any>, parentId: string, childId: string, comicId: string, ids: string[], styleKey: string) {
  if (!ids.length) return undefined;
  const { data: cast } = await sb.from("studio_creations").select("id,title,images,details,style_key,updated_at").eq("parent_id", parentId).eq("child_id", childId).eq("kind", "character").is("deleted_at", null).in("id", ids);
  if ((cast ?? []).length !== ids.length) return undefined;
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const prefix = `${parentId}/${childId}/`;
  const out = [];
  for (const c of cast as any[]) {
    const d = c.details ?? {};
    const sources: string[] = [...(c.images ?? []).slice(0, 1), ...((d.refs ?? []) as string[])].filter(Boolean);
    if (c.style_key !== styleKey || !d.dna || !sources.length || sources.some(p => !p.startsWith(prefix) || p.includes(".."))) return undefined;
    const version = String(c.updated_at).replace(/[^0-9]/g, "").slice(0, 17);
    const refs: string[] = [];
    for (const [i, src] of sources.entries()) {
      const ext = src.split(".").pop() ?? "png";
      const to = `${prefix}snapshots/${comicId}/${c.id}-${version}/${i}.${ext}`;
      const { error } = await a.storage.from("studio-images").copy(src, to);
      if (error && !/exists/i.test(error.message)) return undefined;
      refs.push(to);
    }
    out.push({ id: c.id, title: c.title, dna: d.dna, styleKey, refs, version: String(c.updated_at) });
  }
  return out;
}
