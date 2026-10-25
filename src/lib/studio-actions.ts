// Actionable Bugley suggestions: an allow-list of Studio actions Bugley can offer as tappable chips.
// The client only ever executes these exact ids — never a free-form action from the model.
export type StudioAction = { label: string; action: string };

export const STUDIO_ACTIONS = {
  "open:characters": { label: "Show my characters", action: "open:characters" },
  "open:character_new": { label: "Make a new character", action: "open:character_new" },
  "open:picture": { label: "Make a picture", action: "open:picture" },
  "open:story": { label: "Start a story", action: "open:story" },
  "open:comic": { label: "Start a comic", action: "open:comic" },
  "open:album": { label: "See my album", action: "open:album" },
} as const satisfies Record<string, StudioAction>;

export type StudioActionId = keyof typeof STUDIO_ACTIONS;

const INTENTS: [RegExp, StudioActionId][] = [
  [/\b(new|make|create|another)\b.*\b(character|hero|creature|monster|robot|animal)\b/, "open:character_new"],
  [/\b(characters?|heros?|heroes)\b/, "open:characters"],
  [/\b(draw|paint|picture|sketch|art)\b/, "open:picture"],
  [/\bcomic\b/, "open:comic"],
  [/\b(story|stories|tale|book)\b/, "open:story"],
  [/\b(album|my (stuff|things|creations)|what i made)\b/, "open:album"],
];

/** Map a child's (already safety-guarded) words to at most two Studio actions Bugley can offer. */
export function bugleyActions(text: string): StudioAction[] {
  const t = text.toLowerCase();
  const out: StudioAction[] = [];
  for (const [re, id] of INTENTS) {
    if (re.test(t) && !out.some((a) => a.action === id)) out.push(STUDIO_ACTIONS[id]);
    if (out.length === 2) break;
  }
  return out;
}
