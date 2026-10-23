import { z } from "zod";
export const STRANDS = ["Understand", "Create", "Discern", "Decide"] as const;
export const TIME_LIMITS = [null, 20, 30, 45, 60, 90] as const;
export const controlsSchema = z.object({
  childId: z.string().uuid(),
  daily_minutes: z.number().int().min(10).max(240).nullable(),
  studio_stories: z.boolean(),
  studio_games: z.boolean(),
  read_aloud: z.boolean(),
  spelling_help: z.boolean().default(false),
});
export type ChildControls = Omit<z.infer<typeof controlsSchema>, "childId">;
export const DEFAULT_CONTROLS: ChildControls = { daily_minutes: null, studio_stories: true, studio_games: true, read_aloud: true, spelling_help: false };
