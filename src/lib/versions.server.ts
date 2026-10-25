// Server-only: version history for studio pages/panels. The table is service_role only; always call after ownership checks.
export type VersionSnapshot = { text?: string | null; image?: string | null; description?: string | null };

/** Snapshot a page/panel's prior state before a change overwrites it. */
export async function recordVersion(userId: string, childId: string, creationId: string, pageKey: string, snap: VersionSnapshot) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("studio_versions").insert({ parent_id: userId, child_id: childId, creation_id: creationId, page_key: pageKey, text: snap.text ?? null, image: snap.image ?? null, description: snap.description ?? null });
}

/** How many earlier versions exist per page/panel, for showing "Take that back". */
export async function versionCounts(userId: string, childId: string, creationId: string): Promise<Record<string, number>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("studio_versions").select("page_key").eq("creation_id", creationId).eq("parent_id", userId).eq("child_id", childId);
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as { page_key: string }[]) counts[r.page_key] = (counts[r.page_key] ?? 0) + 1;
  return counts;
}

/** Restore the newest saved version and remove it from history. */
export async function popVersion(userId: string, childId: string, creationId: string, pageKey: string): Promise<VersionSnapshot | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("studio_versions").select("id,text,image,description").eq("creation_id", creationId).eq("parent_id", userId).eq("child_id", childId).eq("page_key", pageKey).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  await supabaseAdmin.from("studio_versions").delete().eq("id", data.id);
  return { text: data.text as string | null, image: data.image as string | null, description: data.description as string | null };
}
