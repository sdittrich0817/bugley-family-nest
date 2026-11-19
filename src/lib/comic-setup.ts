// A3.2: one comic setup, three sets of age-band defaults. Nothing here removes a kind, length or drawing style;
// featured lists only decide what a child sees first, and every other option stays one tap away.
import { COMIC_GENRES } from "./comic";

export type AgeBand = "sprouts" | "explorers" | "builders";
export const COMIC_LENGTHS = [1, 2, 4, 6, 8, 12] as const;

/** Sprouts see four big drawing styles first; "More looks" shows every existing style. */
export const SPROUTS_STYLES = ["cartoon", "crayon", "storybook", "classic_comic"] as const;
/** Sprouts see three kinds of comic first; "More kinds" shows all of them. */
export const SPROUTS_GENRES: readonly (typeof COMIC_GENRES)[number][] = ["Adventure", "Funny", "Animal Heroes"];
/** Sprouts see three named lengths first; "More lengths" shows every existing length and the number box. */
export const SPROUTS_LENGTHS = [
  { count: 2, label: "Short" },
  { count: 4, label: "Medium" },
  { count: 6, label: "Long" },
] as const;

export const GENRE_EMOJI: Record<(typeof COMIC_GENRES)[number], string> = {
  Superhero: "🦸",
  Adventure: "🗺️",
  Mystery: "🔍",
  Space: "🚀",
  Funny: "😂",
  "Spooky-Not-Scary": "👻",
  "Animal Heroes": "🐾",
  Fantasy: "🐉",
};

export function bandOf(ageBand: string): AgeBand {
  return ageBand === "sprouts" || ageBand === "builders" ? ageBand : "explorers";
}

/** Starting number of comic panels. Sprouts start short; everyone can change it. */
export function defaultComicCount(ageBand: string) {
  return bandOf(ageBand) === "sprouts" ? 2 : 4;
}

/** Starting count for any creation kind (stories keep their existing 5-page start). */
export function defaultCount(kind: "picture" | "comic" | "story", ageBand: string) {
  return kind === "story" ? 5 : kind === "comic" ? defaultComicCount(ageBand) : 4;
}

/** Sprouts and Explorers see a ready-made plan with a "Change" button; Builders see every choice straight away. */
export function setupStartsCollapsed(ageBand: string) {
  return bandOf(ageBand) !== "builders";
}

/** Which drawing styles to show before "More looks". Everything shows for older bands, or when the chosen style isn't featured. */
export function visibleStyles<T extends { key: string }>(styles: T[], ageBand: string, chosen: string, showAll: boolean): T[] {
  if (bandOf(ageBand) !== "sprouts" || showAll || !(SPROUTS_STYLES as readonly string[]).includes(chosen)) return styles;
  const featured = SPROUTS_STYLES.map((k) => styles.find((s) => s.key === k)).filter((s): s is T => !!s);
  return featured.length ? featured : styles;
}

export function comicPlanLine(genre: string, count: number) {
  return `${genre} comic · ${count} ${count === 1 ? "panel" : "panels"}`;
}
