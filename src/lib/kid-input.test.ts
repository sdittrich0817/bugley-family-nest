import { describe, expect, it } from "vitest";
import { appendWords, hasWords, readResults, sparkWords, voiceProblem } from "./kid-input";

describe("A3.2 spoken and tapped words", () => {
  it("adds new words after the child's own words, never changing them", () =>
    expect(appendWords("Pip finds a cave", "with a hidden door", 600)).toBe("Pip finds a cave with a hidden door"));
  it("starts an empty box with a capital letter", () => expect(appendWords("", "a hidden door", 600)).toBe("A hidden door"));
  it("stays within the box limit", () => expect(appendWords("abc", "defgh", 6)).toBe("abc de"));
  it("ignores empty speech", () => expect(appendWords("Pip", "   ", 600)).toBe("Pip"));
  it("knows when a spark is already in the words", () => {
    expect(hasWords("Pip finds A Hidden Door", "a hidden door")).toBe(true);
    expect(hasWords("Pip finds a cave", "a hidden door")).toBe(false);
  });
  it("keeps only final words from the newest results, so words aren't repeated", () => {
    const results = [Object.assign([{ transcript: "old words" }], { isFinal: true }), Object.assign([{ transcript: "a blue cat" }], { isFinal: true }), Object.assign([{ transcript: "with a" }], { isFinal: false })];
    expect(readResults(results, 1)).toEqual({ final: "a blue cat", interim: "with a" });
  });
  it("turns microphone permission denied into 'blocked'", () => expect(voiceProblem("not-allowed")).toBe("blocked"));
  it("treats a missing speech service or microphone as unavailable", () => {
    expect(voiceProblem("service-not-allowed")).toBe("unavailable");
    expect(voiceProblem("audio-capture")).toBe("unavailable");
  });
  it("treats silence as nothing heard", () => expect(voiceProblem("no-speech")).toBe("nothing"));
  it("a tapped spark continues the sentence in lower case", () => expect(sparkWords("Glowing pebble trail", ["Pip"])).toBe("glowing pebble trail"));
  it("a spark starting with the character's name keeps its capital", () => expect(sparkWords("Pip’s secret map", ["Pip"])).toBe("Pip’s secret map"));
});
