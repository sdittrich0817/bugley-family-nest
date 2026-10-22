import { z } from "zod";
export const STRANDS = ["Understand", "Create", "Discern", "Decide"] as const;
export const TIME_LIMITS = [null, 20, 30, 45, 60, 90] as const;
export const controlsSchema = z.object({
  childId: z.string().uuid(),
  daily_minutes: z.number().int().min(10).max(240).nullable(),
  studio_stories: z.boolean(),
  studio_games: z.boolean(),
  read_aloud: z.boolean(),
});
export type ChildControls = Omit<z.infer<typeof controlsSchema>, "childId">;
export const DEFAULT_CONTROLS: ChildControls = { daily_minutes: null, studio_stories: true, studio_games: true, read_aloud: true };
// Placeholder until the curriculum ships: the current family session.
export const THIS_WEEK = {
  season: "Season 1 · Week 1",
  title: "Meet Bugley: What is AI, anyway?",
  primer: "AI is a tool that learns patterns from lots of examples and makes guesses. It can be helpful and it can be wrong. This week your kids learn that a person is always the one who decides. Ask them: “How do you know when a guess is a good one?”",
  script: ["Bugley’s Hello (5 min)", "Unplugged warm-up: the guessing game (10 min)", "Make it (15 min)", "Break it (10 min)", "Think about it (10 min)"],
};
