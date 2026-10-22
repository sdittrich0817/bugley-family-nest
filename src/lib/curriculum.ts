import { z } from "zod";
export const STRAND_KEYS = ["understand", "create", "discern", "decide"] as const;
export const BANDS = ["sprouts", "explorers", "builders"] as const;
export const STEP_KEYS = ["warmup", "make", "break", "think"] as const;
export type Band = (typeof BANDS)[number];

/** The current session is the first one (in Season → Unit → Week order) not yet completed; after everything is done, the last one. */
export function pickCurrentSession<T extends { id: string }>(ordered: T[], completed: Set<string>): T | null {
  if (!ordered.length) return null;
  return ordered.find((s) => !completed.has(s.id)) ?? ordered[ordered.length - 1]!;
}
/** A family session counts as done only when every child has completed it. */
export function familyCompleted(sessionIds: string[], childIds: string[], done: { child_id: string; session_id: string }[]) {
  const set = new Set(done.map((d) => `${d.child_id}:${d.session_id}`));
  return new Set(childIds.length ? sessionIds.filter((s) => childIds.every((c) => set.has(`${c}:${s}`))) : []);
}

const text = (max = 4000) => z.string().trim().max(max);
export const entitySchemas = {
  seasons: z.object({ number: z.number().int().min(1), title: text(120).min(1), description: text(), published: z.boolean() }),
  units: z.object({ season_id: z.string().uuid(), number: z.number().int().min(1), title: text(120).min(1), lead_strand: z.enum(STRAND_KEYS), family_question: text(), dinner_question: text(), story_prompt: text(), mission_project: text(), badge_name: text(80), badge_description: text(), journal_prompt: text() }),
  sessions: z.object({ unit_id: z.string().uuid(), week_number: z.number().int().min(1), title: text(160).min(1), parent_primer: text(), script: text(8000) }),
  activities: z.object({ session_id: z.string().uuid(), position: z.number().int().min(1), title: text(120).min(1), strand: z.enum(STRAND_KEYS), step: z.enum(STEP_KEYS), offscreen: z.boolean() }),
} as const;
export type EntityTable = keyof typeof entitySchemas;
export const versionSchema = z.object({ age_band: z.enum(BANDS), kid_title: text(120).min(1), instructions: text().min(1), minutes: z.number().int().min(1).max(120) });

export const TABLE_STEPS = [
  { key: "hello", label: "Bugley’s Hello", minutes: 5, unplugged: false },
  { key: "warmup", label: "Unplugged warm-up", minutes: 10, unplugged: true },
  { key: "make", label: "Make it", minutes: 15, unplugged: false },
  { key: "break", label: "Break it", minutes: 10, unplugged: false },
  { key: "think", label: "Think about it", minutes: 10, unplugged: true },
] as const;
/** Suggested timer: the longest age version of the step's activities, or the step default. */
export function stepMinutes(stepKey: string, activities: { step: string; activity_versions: { minutes: number }[] }[]) {
  const def = TABLE_STEPS.find((s) => s.key === stepKey)?.minutes ?? 10;
  const mins = activities.filter((a) => a.step === stepKey).flatMap((a) => a.activity_versions.map((v) => v.minutes));
  return mins.length ? Math.max(...mins) : def;
}
