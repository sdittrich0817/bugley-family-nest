import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { entitySchemas, versionSchema, type EntityTable } from "@/lib/curriculum";
import { requireParentDevice } from './parent-device.functions';

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Only the Bugley admin can do this.");
}
export const getIsAdmin = createServerFn({ method: "GET" }).middleware([requireParentDevice]).handler(async ({ context }) => {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  return Boolean(data);
});
export const isAdminOptions = queryOptions({ queryKey: ["is-admin"], queryFn: () => getIsAdmin() });

export const getAdminTree = createServerFn({ method: "GET" }).middleware([requireParentDevice]).handler(async ({ context }) => {
  await assertAdmin(context);
  const { data, error } = await context.supabase.from("seasons").select("*,units(*,sessions(*,activities(*,activity_versions(*)),printables(*)))").order("number");
  if (error) throw new Error("Couldn’t load content.");
  return data as any[];
});
export const adminTreeOptions = queryOptions({ queryKey: ["admin-tree"], queryFn: () => getAdminTree() });

const tables = Object.keys(entitySchemas) as [EntityTable, ...EntityTable[]];
export const saveEntity = createServerFn({ method: "POST" }).middleware([requireParentDevice])
  .inputValidator((i: unknown) => { const b = z.object({ table: z.enum(tables), id: z.string().uuid().optional(), values: z.record(z.string(), z.unknown()) }).parse(i); return { ...b, values: entitySchemas[b.table].parse(b.values) as Record<string, unknown> }; })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const q = context.supabase.from(data.table as "seasons");
    const { data: row, error } = data.id ? await q.update(data.values as never).eq("id", data.id).select("id").single() : await q.insert(data.values as never).select("id").single();
    if (error) throw new Error(error.code === "23505" ? "That number is already used here." : "Couldn’t save. Check the fields and try again.");
    return { id: row.id as string };
  });
export const deleteEntity = createServerFn({ method: "POST" }).middleware([requireParentDevice])
  .inputValidator((i: unknown) => z.object({ table: z.enum([...tables, "printables"] as [string, ...string[]]), id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from(data.table as "seasons").delete().eq("id", data.id);
    if (error) throw new Error("Couldn’t delete. It may have kids’ progress attached.");
    return { ok: true };
  });
export const saveVersions = createServerFn({ method: "POST" }).middleware([requireParentDevice])
  .inputValidator((i: unknown) => z.object({ activityId: z.string().uuid(), versions: z.array(versionSchema).length(3) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("activity_versions").upsert(data.versions.map((v) => ({ ...v, activity_id: data.activityId })), { onConflict: "activity_id,age_band" });
    if (error) throw new Error("Couldn’t save the age versions.");
    return { ok: true };
  });
export const addPrintable = createServerFn({ method: "POST" }).middleware([requireParentDevice])
  .inputValidator((i: unknown) => z.object({ sessionId: z.string().uuid(), title: z.string().trim().min(1).max(120), filePath: z.string().min(1).max(300) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("printables").insert({ session_id: data.sessionId, title: data.title, file_path: data.filePath });
    if (error) throw new Error("Couldn’t save the printable.");
    return { ok: true };
  });
