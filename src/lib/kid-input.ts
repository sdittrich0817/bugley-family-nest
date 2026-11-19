// A3.2: shared helpers for words a child adds by voice or by tapping an idea spark.
// The child's existing words are never changed or reordered; new words only go on the end.

/** Add words to the end of what the child already has, within the box's limit. */
export function appendWords(existing: string, added: string, max: number) {
  const extra = added.replace(/\s+/g, " ").trim();
  if (!extra) return existing.slice(0, max);
  const base = existing.replace(/\s+$/, "");
  if (!base) return (extra.charAt(0).toUpperCase() + extra.slice(1)).slice(0, max);
  return `${base} ${extra}`.slice(0, max);
}

/** A tapped spark continues the child's sentence, so its first word loses its capital unless it's a name they use. */
export function sparkWords(spark: string, names: string[]) {
  const first = spark.trim().split(/\s+/)[0] ?? "";
  const isName = names.some((n) => n.trim().toLowerCase() === first.replace(/[’']s$/i, "").toLowerCase());
  return isName || !/^[A-Z][a-z]/.test(first) ? spark.trim() : spark.trim().charAt(0).toLowerCase() + spark.trim().slice(1);
}

/** Has this spark already been added to the child's words? (So a second tap doesn't add it twice.) */
export function hasWords(text: string, spark: string) {
  const s = spark.trim().toLowerCase();
  return !!s && text.toLowerCase().includes(s);
}

export type VoiceProblem = "blocked" | "unavailable" | "nothing" | "connection" | "stopped";

/** Browser speech-recognition error codes, in words a 5–12-year-old can act on. Typing always still works. */
export function voiceProblem(code: string | undefined): VoiceProblem {
  switch (code) {
    case "not-allowed":
      return "blocked";
    case "service-not-allowed":
    case "language-not-supported":
    case "audio-capture":
      return "unavailable";
    case "network":
      return "connection";
    case "aborted":
      return "stopped";
    default:
      return "nothing";
  }
}

export const VOICE_MESSAGES: Record<VoiceProblem, string> = {
  blocked: "The microphone is turned off for Bugley. Ask your grown-up to allow it, or type your words in the box.",
  unavailable: "Bugley can’t listen on this device right now. You can type your words in the box instead.",
  nothing: "Bugley didn’t hear any words. Tap “Say it” to try again, or type in the box.",
  connection: "Bugley couldn’t listen just now. Try again, or type your words in the box.",
  stopped: "",
};

/** Only final words from the newest results; interim words are shown live but never saved. Avoids repeated words. */
export function readResults(results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>, from: number) {
  let final = "";
  let interim = "";
  for (let i = from; i < results.length; i++) {
    const r = results[i];
    if (!r || !r[0]) continue;
    if (r.isFinal) final += `${r[0].transcript} `;
    else interim += `${r[0].transcript} `;
  }
  return { final: final.trim(), interim: interim.trim() };
}
