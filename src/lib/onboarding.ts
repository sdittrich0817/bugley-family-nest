/** First-session welcome rules (pure, shared by server and tests). */
export const WELCOME_KINDS = ["shown", "skipped", "chose_play", "chose_create", "replayed"] as const;
export type WelcomeKind = (typeof WELCOME_KINDS)[number];
export type WelcomeRecord = { shown_at: string | null; skipped_at: string | null; completed_at: string | null; choice: "play" | "create" | null } | null;

/** Auto-open only for children created after launch who have not skipped or finished it. */
export function welcomeAutoShow(childCreatedAt: string, launchedAt: string | null, rec: WelcomeRecord): boolean {
  if (!launchedAt) return false;
  if (new Date(childCreatedAt).getTime() <= new Date(launchedAt).getTime()) return false;
  return !rec?.skipped_at && !rec?.completed_at;
}

/** Fields to write for an event; first timestamps are kept, never overwritten. */
export function welcomePatch(kind: WelcomeKind, rec: WelcomeRecord, now: string) {
  const p: Record<string, string> = {};
  if (kind === "shown" || kind === "replayed") { if (!rec?.shown_at) p.shown_at = now; }
  if (kind === "skipped" && !rec?.skipped_at && !rec?.completed_at) p.skipped_at = now;
  if (kind === "chose_play" || kind === "chose_create") {
    if (!rec?.completed_at) p.completed_at = now;
    p.choice = kind === "chose_play" ? "play" : "create";
  }
  return p;
}
