import { describe, expect, it } from "vitest";
import { coachNote, defaultSettings, gameFileSchema, generateJump, generateMaze, mazeSolvable, templatesFor } from "./game-builder";

describe("game builder rules", () => {
  it("Sprouts get only Catch It and Memory Match", () => expect(templatesFor("sprouts")).toEqual(["catch", "memory"]));
  it("Explorers and Builders get all six templates", () => { expect(templatesFor("explorers")).toHaveLength(6); expect(templatesFor("builders")).toHaveLength(6); });
  it("generated mazes are always solvable", () => { for (let s = 1; s < 20; s++) for (const d of [1, 2, 3]) expect(mazeSolvable(generateMaze(d, s))).toBe(true); });
  it("jump levels have a start and a goal", () => { const g = generateJump(2, 5); expect(g.cells).toContain("S"); expect(g.cells).toContain("G"); });
  it("games only use library sprites or saved creations", () => {
    const s = defaultSettings("catch");
    expect(gameFileSchema.safeParse({ template: "catch", settings: { ...s, hero: { kind: "sprite", value: "💩" } }, published: false, playtests: 0 }).success).toBe(false);
  });
  it("losing fast suggests slowing obstacles down", () => expect(coachNote("catch", defaultSettings("catch"), { won: false, seconds: 4, score: 0, livesLost: 3 }).note).toBe("You lost in 4 seconds. Too hard? Want to slow the obstacles down?"));
  it("an easy win suggests one more challenge", () => expect(coachNote("maze", defaultSettings("maze"), { won: true, seconds: 8, score: 3, livesLost: 0 }).note).toBe("That was super easy! Add one more challenge?"));
});
