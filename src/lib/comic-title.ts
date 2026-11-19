// A3.1 comic-name ideas. Pure and free: built only from the child's own saved words (panel descriptions and Story
// Memory excerpts), the approved character names and the comic kind the child chose. Nothing is invented, no AI runs,
// and the child can always ignore the ideas and type their own name.

const STOP = new Set([
  "a", "an", "the", "and", "or", "but", "so", "then", "to", "of", "in", "on", "at", "by", "for", "from", "with", "into",
  "onto", "over", "under", "up", "down", "out", "off", "near", "behind", "inside", "outside", "through", "around", "is",
  "are", "was", "were", "be", "been", "has", "have", "had", "it", "its", "they", "them", "their", "he", "she", "his",
  "her", "him", "we", "you", "i", "me", "my", "our", "your", "this", "that", "these", "those", "very", "really", "who",
  "what", "where", "when", "why", "how", "lot", "lots", "way", "end", "time", "day", "bit", "thing", "things", "some",
  "one", "other", "another", "same", "next", "first", "last", "not", "no", "only", "alone", "all", "every", "each",
  "while", "because", "if", "as", "than", "too", "also", "just", "still", "again", "back", "home", "here", "there",
]);
const KIND_WORDS: Record<string, string> = {
  Superhero: "Superhero Comic", Adventure: "Adventure", Mystery: "Mystery", Space: "Space Adventure", Funny: "Funny Comic",
  "Spooky-Not-Scary": "Spooky Comic", "Animal Heroes": "Animal Hero Comic", Fantasy: "Fantasy Comic",
};

const clean = (s: string) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
const cap = (w: string) => (w ? w[0]!.toUpperCase() + w.slice(1) : w);
const titleCase = (words: string[]) => words.map(cap).join(" ");
const possessive = (name: string) => `${name}${/s$/i.test(name) ? "’" : "’s"}`;

/** "a big purple crystal" → ["big","purple","crystal"]; only letters, 1–3 words, ends on a real word. */
export function nounPhrases(text: string, avoid: string[] = []): string[][] {
  const avoidSet = new Set(avoid.flatMap((n) => n.toLowerCase().split(/\s+/)));
  const words = clean(text).split(/[\s]+/);
  const out: string[][] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!.toLowerCase().replace(/[^a-z']/g, "");
    if (!["a", "an", "the"].includes(w)) continue;
    const phrase: string[] = [];
    for (let j = i + 1; j < words.length && phrase.length < 3; j++) {
      const raw = words[j]!;
      const word = raw.toLowerCase().replace(/[^a-z-]/g, "");
      if (!word || STOP.has(word) || avoidSet.has(word) || !/^[a-z][a-z-]*$/.test(word)) break;
      phrase.push(word);
      if (/[.,!?;:]$/.test(raw)) break;
    }
    if (phrase.length && phrase[phrase.length - 1]!.length >= 3) out.push(phrase);
  }
  return out;
}

/** Up to three optional comic names from the child's own words. */
export function comicTitleIdeas(input: { names: string[]; genre?: string | null; panels: (string | null | undefined)[]; memory?: { kind: string; excerpt: string }[] }): string[] {
  const names = [...new Set(input.names.map((n) => clean(n)).filter(Boolean))];
  const lead = names[0];
  const ideas: string[] = [];
  const add = (t: string) => {
    const v = t.replace(/\s+/g, " ").trim().slice(0, 80);
    if (v && !ideas.some((x) => x.toLowerCase() === v.toLowerCase())) ideas.push(v);
  };
  if (lead) {
    // Story Memory excerpts are exact child words; prefer things and places, then the panels themselves in order.
    const fromMemory = (input.memory ?? []).filter((m) => m.kind === "object" || m.kind === "place").flatMap((m) => nounPhrases(`the ${m.excerpt.replace(/^(a|an|the)\s+/i, "")}`, names));
    const fromPanels = input.panels.flatMap((p) => nounPhrases(p ?? "", names));
    for (const phrase of [...fromMemory, ...fromPanels]) {
      if (ideas.length >= 2) break;
      add(`${lead} and the ${titleCase(phrase)}`);
    }
    if (names.length > 1) add(names.length === 2 ? `${names[0]} and ${names[1]}` : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);
    const kind = KIND_WORDS[input.genre ?? ""] ?? "Comic";
    add(`${possessive(lead)} ${kind}`);
  }
  return ideas.slice(0, 3);
}
