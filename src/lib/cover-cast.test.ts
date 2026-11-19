import { describe, expect, it } from "vitest";
import { coverCastLine, intendedCoverCast, presenceRule } from "./cover-cast";
import { coverDescription, coverMemoryItems, memoryPrompt } from "./comic-memory";

const pip = { id: "pip", name: "Pip" }, luna = { id: "luna", name: "Luna" }, bo = { id: "bo", name: "Bo" };
const two = [pip, luna], three = [pip, luna, bo];
const cover = (text: string, cast = two) => intendedCoverCast(text, cast);
const both = { ids: ["pip", "luna"], names: ["Pip", "Luna"], excluded: [], mustShow: ["Pip", "Luna"] };

describe("intended cover cast", () => {
  it("all characters explicitly included: every one is drawn and required", () => {
    expect(cover("The Beach Day: Pip and Luna play together on the beach")).toMatchObject({ mode: "explicit", ...both });
    expect(cover("Only Pip and Luna are on the cover", three)).toMatchObject({ mode: "explicit", ids: ["pip", "luna"], excluded: ["Bo"], mustShow: ["Pip", "Luna"] });
  });

  it("one character explicitly excluded: not drawn, not required, and named as left out", () => {
    for (const text of ["The Lighthouse Key: Only Pip is on this adventure. Pip finds a golden key.", "No Luna on this cover. Pip finds a golden key.", "Pip finds a golden key without Luna.", "Pip, not Luna, finds a golden key.", "Pip finds a key. Luna isn't here today.", "Pip walks alone on the beach."]) {
      const plan = cover(text);
      expect(plan, text).toMatchObject({ mode: "explicit", ids: ["pip"], names: ["Pip"], excluded: ["Luna"], mustShow: ["Pip"] });
    }
    expect(cover("Just Pip and Bo on the beach.", three)).toMatchObject({ ids: ["pip", "bo"], excluded: ["Luna"], mustShow: ["Pip", "Bo"] });
  });

  it("a character mentioned as being elsewhere is left off the cover", () => {
    for (const text of ["Pip explores the cave while Luna waits back at the lighthouse.", "Pip finds a key and Luna stays home asleep.", "Only Pip is here. Luna stayed home asleep."]) {
      expect(cover(text), text).toMatchObject({ mode: "explicit", ids: ["pip"], excluded: ["Luna"], mustShow: ["Pip"] });
    }
  });

  it("no characters explicitly specified: the default of every main character stays", () => {
    for (const text of ["The Lighthouse Key: Pip finds a shiny golden key", "A stormy night at the old red lighthouse", "Pip finds Luna's hat. Luna's hat is not here.", ""]) {
      expect(cover(text), text).toMatchObject({ mode: "default", ...both });
    }
    // Not being mentioned in panel 1 never excludes anyone.
    expect(cover("Pip finds a key", three)).toMatchObject({ mode: "default", ids: ["pip", "luna", "bo"], excluded: [] });
    expect(cover("Pip alone", [pip])).toMatchObject({ ids: ["pip"], mustShow: ["Pip"] });
  });

  it("ambiguous or contradictory instructions fall back to the default instead of inventing exclusions", () => {
    for (const text of [
      "Maybe Luna stayed home.",                          // uncertain
      "Luna might stay home while Pip explores.",         // uncertain
      "Only Pip is here. Luna is here too.",              // contradictory
      "Luna stayed home. Luna and Pip play together.",    // contradictory
      "Only Pip is on the cover. Only Luna is on the cover.", // two different only-lists
      "Only Pip can open the door.",                      // "only" about ability, not who is there
      "Pip leaves Luna alone in the cave.",               // Luna isn't the subject
      "Pip watches Luna sleep at home.",                  // Luna isn't the subject
      "Pip is home with Luna.",                           // together, not elsewhere
      "Pip is far away from home.",                       // elsewhere with nobody to contrast
      "Is Luna not here?",                                // a question
      "Pip can't find Luna.",                             // not an explicit absence
    ]) {
      const plan = cover(text);
      expect(plan.ids, text).toEqual(["pip", "luna"]);
      expect(plan.excluded, text).toEqual([]);
      expect(plan.mustShow, text).toEqual(["Pip", "Luna"]);
      expect(plan.mode, text).not.toBe("explicit");
    }
  });

  it("the picture instructions and the character check always name the same characters", () => {
    const texts = ["Only Pip is on this adventure.", "Pip explores while Luna waits back at the lighthouse.", "Pip finds a key", "Maybe Luna stayed home.", "Pip and Luna together", "No Pip and no Luna, just the lighthouse."];
    for (const text of texts) {
      const plan = cover(text);
      const line = coverCastLine(plan), rule = presenceRule(plan.mustShow);
      for (const n of plan.mustShow) { expect(line, text).toContain(n); expect(rule, text).toContain(n); }
      for (const n of plan.excluded) { expect(plan.names).not.toContain(n); expect(rule, text).not.toContain(n); expect(line, text).toMatch(new RegExp(`Leave .*${n}.* off this cover`)); }
      expect(plan.ids.length, text).toBe(plan.names.length);
      expect(plan.mustShow.every((n) => plan.names.includes(n)), text).toBe(true);
    }
  });

  it("character check: no redraw demand for a character the child left out", () => {
    const plan = cover("The Lighthouse Key: Only Pip is on this adventure. Luna stayed home asleep.");
    // Luna's references are not sent and the check never asks for her, so a correct Pip-only cover passes first time.
    expect(plan.ids).toEqual(["pip"]);
    expect(presenceRule(plan.mustShow)).toBe(" This locked character must appear in the scene: Pip. If it is missing, pass=false and score below 50.");
    expect(presenceRule(plan.mustShow)).not.toContain("Luna");
    // Default covers still require everyone; nothing is required when nobody is to be drawn.
    expect(presenceRule(cover("Pip finds a key").mustShow)).toContain("Pip, Luna");
    const none = cover("No Pip and no Luna, just the lighthouse.");
    expect(none).toMatchObject({ mode: "explicit", ids: [], mustShow: [], excluded: ["Pip", "Luna"] });
    expect(presenceRule(none.mustShow)).toBe("");
  });

  it("cover description puts the child's words first, then the cast decision, and drops memory about left-out characters", () => {
    const text = "The Lighthouse Key: Only Pip is on this adventure. Luna stayed home asleep.";
    const plan = cover(text);
    const at = (id: string, excerpt: string) => ({ id, kind: "character" as const, excerpt, panelId: "p1", stamp: "s", order: 0, supersedes: [], panel: 1 });
    const memory = memoryPrompt(coverMemoryItems([at("a", "Luna wears a silver crown"), at("b", "a big purple crystal")], plan.excluded), undefined, text, plan.names);
    const out = coverDescription(text, memory, plan);
    expect(out.startsWith(`Cover (the child's words; follow them first): ${text}`)).toBe(true);
    expect(out).toContain("Show Pip clearly and fully visible on the cover. Leave Luna off this cover, as the child's words say.");
    expect(out).not.toContain("Show all 2 main characters");
    expect(out).toContain("a big purple crystal");
    expect(out).not.toContain("silver crown");
    // Default plan text is unchanged from before.
    expect(coverDescription("Pip finds a key", "", cover("Pip finds a key"))).toBe(coverDescription("Pip finds a key", "", ["Pip", "Luna"]));
  });
});
