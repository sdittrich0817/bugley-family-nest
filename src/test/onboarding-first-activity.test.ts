import { describe, expect, it } from "vitest";
import { FIRST_CREATE_PATH, FIRST_PLAY } from "@/lib/onboarding";
import { ARCADE_GAMES } from "@/lib/arcade";
import { ARCADE_ART } from "@/lib/arcade-art";
import { playAllowed, type PlayKey } from "@/lib/play";

// Same availability rule the games page uses to list games for a band.
const offered = (id: string, band: "sprouts" | "explorers" | "builders") => {
  const g = ARCADE_GAMES.find((x) => x.id === id);
  if (!g) return false;
  return g.engine === "guesses" ? playAllowed("bugley_guesses", band) : g.engine !== "play" || playAllowed(g.id as PlayKey, band);
};

describe("Welcome first activities", () => {
  it("Sprouts (5–6) start with Memory Meadow, a game offered to them", () => {
    expect(FIRST_PLAY.sprouts).toBe("memory_meadow");
    expect(offered(FIRST_PLAY.sprouts, "sprouts")).toBe(true);
  });
  it("Explorers (7–9) start with Dragon Catch, a game offered to them", () => {
    expect(FIRST_PLAY.explorers).toBe("dragon_catch");
    expect(offered(FIRST_PLAY.explorers, "explorers")).toBe(true);
  });
  it("Builders (10–12) start with Cosmic Maze, a game offered to them", () => {
    expect(FIRST_PLAY.builders).toBe("cosmic_maze");
    expect(offered(FIRST_PLAY.builders, "builders")).toBe(true);
  });
  it("never sends Sprouts to Bugley Guesses, which is hidden for ages 5–6", () => {
    expect(offered("bugley_guesses", "sprouts")).toBe(false);
    expect(FIRST_PLAY.sprouts).not.toBe("bugley_guesses");
  });
  it("every first game has cover art", () => {
    for (const id of Object.values(FIRST_PLAY)) expect(ARCADE_ART[id]).toBeTruthy();
  });
  it("Create opens the existing character-first Create start, never Quest", () => {
    expect(FIRST_CREATE_PATH).toBe("/kids/studio/v3");
  });
});
