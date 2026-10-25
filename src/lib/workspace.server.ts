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