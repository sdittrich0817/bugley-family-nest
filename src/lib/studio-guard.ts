// Pure, browser-safe parts of the Studio safety guard. The full guard (with the AI check) lives in studio-guard.server.ts.
export type GuardDecision = "allowed" | "personal_info" | "unsafe" | "copyright";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** True when the text contains any real family name (child, sibling or parent) as a whole word. */
export function findFamilyName(text: string, names: string[]): string | null {
  for (const raw of names) {
    const name = raw?.trim();
    if (!name || name.length < 2) continue;
    if (new RegExp(`(^|[^\\p{L}])${escape(name)}($|[^\\p{L}])`, "iu").test(text)) return name;
  }
  return null;
}

const PERSONAL_PATTERNS: RegExp[] = [
  /[\w.+-]+@[\w-]+\.[\w.]+/i, // email
  /(\+?\d[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/, // phone
  /\b\d{1,5}\s+(\w+\s){0,3}(street|st|road|rd|avenue|ave|lane|ln|drive|dr|court|ct|boulevard|blvd|way|place|pl|circle|cir|terrace)\b/i, // street address
  /\b[A-Z][a-z]+(\s[A-Z][a-z]+)?\s([Ee]lementary|[Pp]rimary|[Mm]iddle|[Aa]cademy|[Ss]chool)\b/, // named school
  /\bmy\s+(school|teacher|address|street|town|city|hometown|phone|number|birthday|email)\b/i,
  /\bi\s+(live|go to school)\s+(in|on|at)\b/i,
  /\b(born on|my birthday is)\b/i,
  /\b\d{1,2}[/.-]\d{1,2}[/.-](19|20)\d{2}\b/, // full date
];

/** Fast, deterministic personal-info check. The AI check covers what patterns can't (hometowns etc.). */
export function quickPersonalCheck(text: string, familyNames: string[]): boolean {
  return !!findFamilyName(text, familyNames) || PERSONAL_PATTERNS.some((p) => p.test(text));
}

export const BLOCK_REPLY: Record<Exclude<GuardDecision, "allowed">, string> = {
  personal_info: "Ooh, let’s keep real names and places secret! Want to give your hero a made-up name?",
  unsafe: "Hmm, let’s try a different idea. How about…",
  copyright: "Let’s invent our own hero instead! What superpower should they have?",
};
export const DEFAULT_CHIPS: Record<Exclude<GuardDecision, "allowed">, string[]> = {
  personal_info: ["Name my hero Zippy", "Set it on a cloud island"],
  unsafe: ["A dragon who bakes cookies", "A treasure hunt under the sea"],
  copyright: ["A hero who can talk to plants", "A hero who turns invisible"],
};

export function conversationStarter(nickname: string) {
  return `${nickname} tried to use real personal details in the Studio today. It’s a great moment to talk about why we keep names, places and other personal details private online.`;
}
