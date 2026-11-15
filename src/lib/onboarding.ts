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
  const p: { shown_at?: string; skipped_at?: string; completed_at?: string; choice?: "play" | "create" } = {};
  if (kind === "shown" || kind === "replayed") { if (!rec?.shown_at) p.shown_at = now; }
  if (kind === "skipped" && !rec?.skipped_at && !rec?.completed_at) p.skipped_at = now;
  if (kind === "chose_play" || kind === "chose_create") {
    if (!rec?.completed_at) p.completed_at = now;
    p.choice = kind === "chose_play" ? "play" : "create";
  }
  return p;
}

/** Phase B: each welcome card opens an existing, band-available activity. */
export type WelcomeBand = "sprouts" | "explorers" | "builders";
export const FIRST_PLAY = { sprouts: "memory_meadow", explorers: "dragon_catch", builders: "cosmic_maze" } as const satisfies Record<WelcomeBand, string>;
/** Create opens the existing character-first Create start; the child picks picture, comic or story there. */
export const FIRST_CREATE_PATH = "/kids/studio/v3" as const;
export const FIRST_LINES: Record<WelcomeBand, { play: string; create: string }> = {
  sprouts: { play: "Memory Meadow: find the bug twins!", create: "Make up a character, then draw a picture!" },
  explorers: { play: "Dragon Catch: snap dragons, spot the camera’s mistakes", create: "Invent a hero, then make your first comic" },
  builders: { play: "Cosmic Maze: program your rocket with if-then rules", create: "Invent a character, then write a story" },
};
