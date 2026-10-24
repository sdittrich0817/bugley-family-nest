import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { controlsSchema, DEFAULT_CONTROLS, type ChildControls } from "@/lib/hub";
import { requireParentDevice } from './parent-device.functions';

export const getChildControls = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("child_controls").select("child_id,daily_minutes,studio_stories,studio_games,read_aloud,spelling_help").eq("parent_id", context.userId);
  if (error) throw new Error("We couldn’t load your controls. Please try again.");
  const map: Record<string, ChildControls> = {};
  for (const r of data ?? []) map[r.child_id] = { daily_minutes: r.daily_minutes, studio_stories: r.studio_stories, studio_games: r.studio_games, read_aloud: r.read_aloud, spelling_help: r.spelling_help };
  return map;
});
export const controlsOptions = queryOptions({ queryKey: ["child-controls"], queryFn: () => getChildControls() });
export { DEFAULT_CONTROLS };

export const saveChildControls = createServerFn({ method: "POST" }).middleware([requireParentDevice]).inputValidator((i: unknown) => controlsSchema.parse(i)).handler(async ({ data, context }) => {
  const { childId, ...rest } = data;
  const { error } = await context.supabase.from("child_controls").upsert({ child_id: childId, parent_id: context.userId, ...rest, updated_at: new Date().toISOString() });
  if (error) throw new Error("We couldn’t save that change. Please try again.");
  return { saved: true };
});
