import { describe, expect, it } from "vitest";
import { ideaGenre, matchCastByName } from "@/lib/story";

describe("opening idea", () => {
  it("maps 'funny' to the Funny genre so Bugley doesn't ask again", () => expect(ideaGenre("funny")).toBe("Funny"));
  it("returns null for an unclear tone so Bugley still asks", () => expect(ideaGenre("")).toBeNull());
  it("reuses an existing character the child named, ignoring case", () => {
    expect(matchCastByName([{ id: "1", title: "Pickles" }], "pickles")?.id).toBe("1");
  });
  it("does not match a character that isn't in the vault", () => {
    expect(matchCastByName([{ id: "1", title: "Pickles" }], "Zippy")).toBeUndefined();
  });
});
