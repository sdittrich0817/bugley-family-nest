// Hero Builder: kind -> which one -> look -> colors -> personality -> special thing -> name -> Bugley paints 3 options -> "That's my hero!" (Character Lock runs on save).
// The child's own words come first on every step; Bugley's tiles are only suggestions.
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BugleyStep, type StepChoice } from "./BugleyStep";
import type { BugleyChat, SidekickChild } from "./Sidekick";
import { makeHeroOptions, saveHero } from "@/lib/images.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { useScrollTopOn } from "@/lib/scroll";

const c = (key: string, emoji: string, label = key[0]!.toUpperCase() + key.slice(1)): StepChoice => ({ key, label, emoji });
const KINDS: StepChoice[] = [c("kid", "🧒", "A kid"), c("animal", "🦊", "An animal"), c("dragon", "🐉", "A dragon"), c("robot", "🤖", "A robot"), c("alien", "👽", "An alien"), c("monster", "👾", "A friendly monster"), c("bug", "🐞", "A bug"), c("magical creature", "🦄", "Magic creature")];
const WHICH: Record<string, { q: string; ideas: StepChoice[] }> = {
  animal: { q: "What kind of animal?", ideas: [c("fox", "🦊"), c("cat", "🐱"), c("dog", "🐶"), c("bunny", "🐰"), c("bear", "🐻"), c("penguin", "🐧"), c("owl", "🦉"), c("turtle", "🐢"), c("octopus", "🐙"), c("frog", "🐸"), c("lion", "🦁"), c("shark", "🦈")] },
  kid: { q: "What does this kid look like?", ideas: [c("curly hair", "🌀", "Curly hair"), c("long braids", "🎀", "Long braids"), c("short spiky hair", "⚡", "Spiky hair"), c("a big puffy afro", "☁️", "Big afro"), c("freckles", "✨"), c("a gap-tooth smile", "😁", "Gap-tooth smile")] },
  dragon: { q: "What kind of dragon?", ideas: [c("tiny pocket-sized dragon", "🤏", "Tiny"), c("huge gentle dragon", "🏔️", "Huge"), c("fire-breathing dragon", "🔥", "Fire"), c("ice dragon", "❄️", "Ice"), c("sea dragon", "🌊", "Sea"), c("cloud dragon", "☁️", "Cloud")] },
  robot: { q: "What kind of robot?", ideas: [c("boxy robot", "📦", "Boxy"), c("round wobbly robot", "⚪", "Round"), c("tall skinny robot", "📏", "Tall"), c("robot with wheels", "🛞", "Wheels"), c("flying robot", "🚁", "Flying"), c("tiny helper robot", "🤏", "Tiny")] },
  alien: { q: "What kind of alien?", ideas: [c("alien with three eyes", "👀", "Three eyes"), c("squishy blob alien", "🫧", "Blob"), c("alien with long antennae", "📡", "Antennae"), c("fuzzy alien", "🧶", "Fuzzy"), c("glowing alien", "🌟", "Glowing"), c("tiny alien", "🤏", "Tiny")] },
  monster: { q: "What kind of monster?", ideas: [c("fluffy monster", "🧸", "Fluffy"), c("one-eyed monster", "👁️", "One eye"), c("horned monster", "🦬", "Horns"), c("spotty monster", "🔵", "Spotty"), c("giant gentle monster", "🏔️", "Giant"), c("tiny monster", "🤏", "Tiny")] },
  bug: { q: "What kind of bug?", ideas: [c("ladybug", "🐞"), c("bee", "🐝"), c("butterfly", "🦋"), c("snail", "🐌"), c("beetle", "🪲"), c("caterpillar", "🐛")] },
  "magical creature": { q: "What kind of magic creature?", ideas: [c("unicorn", "🦄"), c("fairy", "🧚"), c("phoenix", "🔥"), c("mermaid", "🧜"), c("griffin", "🦅"), c("wizard", "🧙")] },
};
const LOOK: StepChoice[] = [c("big round eyes", "👀", "Big eyes"), c("fluffy fur", "🧶", "Fluffy"), c("shiny scales", "💎", "Scales"), c("spots", "🔵"), c("stripes", "🦓"), c("wings", "🪽"), c("a long tail", "〰️", "Long tail"), c("tiny and round", "⚪", "Tiny & round")];
const COLORS: StepChoice[] = [c("red", "🔴"), c("blue", "🔵"), c("green", "🟢"), c("purple", "🟣"), c("orange", "🟠"), c("yellow", "🟡"), c("pink", "🩷"), c("rainbow", "🌈")];
const PERSONALITY: StepChoice[] = [c("brave", "🦁"), c("silly", "🤪"), c("shy", "🙈"), c("curious", "🔍"), c("kind", "💛"), c("grumpy but sweet", "😤", "Grumpy but sweet"), c("super smart", "🧠", "Super smart"), c("sneaky", "🥷")];
const SPECIALS: StepChoice[] = [c("a flowing scarf", "🧣", "A scarf"), c("a cape", "🦸", "A cape"), c("round glasses", "👓", "Glasses"), c("a star mark on the cheek", "⭐", "A star mark"), c("a hat", "🎩", "A hat"), c("a backpack", "🎒", "A backpack"), c("rocket boots", "🚀", "Rocket boots"), c("a magic wand", "🪄", "A magic wand")];
const FIRST = ["Captain", "Professor", "Sir", "Zippy", "Lady", "Doctor", "Mister", "Sparkle"];
const LAST = ["Noodle", "Wiggles", "Pickle", "Puddles", "Bubbles", "Sprinkles", "Waffles", "Zoom"];

export type HeroRole = "hero" | "sidekick" | "villain";
const ROLE_Q: Record<HeroRole, string> = { hero: "Who’s our hero?", sidekick: "Who’s the sidekick?", villain: "Who’s the villain?" };
const STEPS = 8;

export function HeroBuilder({ child, chat, styleKey, role = "hero", onDone, onBack }: {
  child: SidekickChild; chat: BugleyChat; styleKey: string; role?: HeroRole; onDone: (id: string) => void; onBack: () => void;
}) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState(""), [which, setWhich] = useState(""), [look, setLook] = useState(""), [color, setColor] = useState(""), [mood2, setMood2] = useState(""), [special, setSpecial] = useState(""), [name, setName] = useState("");
  const [options, setOptions] = useState<{ path: string; url: string }[]>([]);
  const [mood, setMood] = useState<"flying" | "painting" | "celebrating">("flying");
  const [note, setNote] = useState<{ reply: string; chips: string[] } | null>(null);
  const qc = useQueryClient();
  useScrollTopOn(step);
  const names = useMemo(() => Array.from({ length: 4 }, (_, i) => `${FIRST[(Math.random() * FIRST.length) | 0]} ${LAST[(i * 3 + ((Math.random() * LAST.length) | 0)) % LAST.length]}`), [step === 6]); // eslint-disable-line react-hooks/exhaustive-deps
  const whichQ = WHICH[kind] ?? { q: `What kind of ${kind || "character"}?`, ideas: [] };
  const fullKind = (which ? `${which} (${kind})` : kind).slice(0, 120);
  const fullSpecial = [special, mood2 && `looks ${mood2}`].filter(Boolean).join("; ").slice(0, 160);
  const fullColor = [color, look && `with ${look}`].filter(Boolean).join(", ").slice(0, 80);
  const base = { childId: child.id, styleKey, kind: fullKind, color: fullColor, special: fullSpecial, name };

  const QUESTIONS = [ROLE_Q[role], whichQ.q, "What do they look like?", "What colors are they?", "What are they like inside?", "What’s their special thing?", "What’s their name?"];
  async function paint(n = name) {
    setStep(7); setMood("painting"); setNote(null); chat.say("Mixing the colors...");
    try {
      const r = await makeHeroOptions({ data: { ...base, name: n, environment: getStripeEnvironment() } });
      if (r.ok) { setOptions(r.options); setMood("flying"); chat.say(`Which one is ${n}?`); }
      else { setMood("flying"); setNote({ reply: r.reply, chips: "chips" in r ? r.chips ?? [] : [] }); chat.say(r.reply); }
    } catch { setMood("flying"); setNote({ reply: "Oops, my paintbrush slipped! Try again?", chips: [] }); }
    finally { void qc.invalidateQueries({ queryKey: ["glow", child.id] }); }
  }
  async function choose(path: string) {
    setMood("painting"); chat.say(`Locking in ${name} so they look the same on every page...`);
    try {
      const r = await saveHero({ data: { ...base, path } });
      if (r.ok) { setMood("celebrating"); chat.say(`${name} is ready for adventure!`); await qc.invalidateQueries({ queryKey: ["cast", child.id] }); setTimeout(() => onDone(r.id), 900); }
      else { setMood("flying"); setOptions([]); setNote({ reply: r.reply, chips: r.chips ?? [] }); chat.say(r.reply); setStep(6); }
    } catch { setMood("flying"); setNote({ reply: "Oops! Try again.", chips: [] }); }
  }
  useEffect(() => { if (step < 7) chat.say(`${QUESTIONS[step]} Use your own idea, or peek at mine!`); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const common = { child, bare: true, steps: STEPS, step, onBack: step === 0 ? onBack : () => { setNote(null); setStep(step - 1); } };
  const go = (set: (v: string) => void, max: number) => ({ onChoose: (x: StepChoice) => { set(x.key); setStep(step + 1); }, onOwnIdea: (t: string) => { set(t.trim().slice(0, max)); setStep(step + 1); } });
  const summary = [name, fullKind, fullColor, fullSpecial].filter(Boolean).join(" · ");

  if (step < 6) {
    const cfg = [
      { choices: KINDS, ...go((v) => { setKind(v); setWhich(""); }, 60), placeholder: "A pancake knight, a sleepy cloud…" },
      { choices: whichQ.ideas, ...go(setWhich, 60), placeholder: "Tell Bugley exactly what kind" },
      { choices: LOOK, ...go(setLook, 60), placeholder: "Floppy ears, a tiny crown…" },
      { choices: COLORS, ...go(setColor, 40), placeholder: "Teal with gold spots…" },
      { choices: PERSONALITY, ...go(setMood2, 40), placeholder: "Brave but scared of bubbles…" },
      { choices: SPECIALS, ...go(setSpecial, 80), placeholder: "A sock that talks…" },
    ][step]!;
    return <div className="space-y-3">
      {step > 0 && <p className="text-center text-sm font-semibold text-muted-foreground">{summary}</p>}
      <BugleyStep {...common} question={QUESTIONS[step]!} {...cfg} />
    </div>;
  }
  if (step === 6) return <div className="space-y-3">
    {note && <Note note={note} />}
    <p className="text-center text-sm font-semibold text-muted-foreground">{summary}</p>
    <BugleyStep {...common} question="What’s their name?" placeholder="Make up any name!" choices={names.map((n) => ({ key: n, label: n, emoji: "🏷️" }))} onChoose={(x) => { setName(x.key); void paint(x.key); }} onOwnIdea={(t) => { const n = t.trim().slice(0, 40); setName(n); void paint(n); }} />
  </div>;
  return <div className="space-y-3">
    {note && <Note note={note} />}
    <BugleyStep {...common} mood={mood === "painting" ? "painting" : mood} question={options.length ? `Which one is ${name}?` : note ? "Want to try again?" : "Mixing the colors..."} allowOwnIdea={false}
      choices={[...options.map((o, i) => ({ key: o.path, label: i === 0 ? "This one!" : i === 1 ? "Or this one!" : "Maybe this!", image: o.url })), { key: "again", label: "Try again · 1 glow", emoji: "🔄" }]}
      onChoose={(x) => x.key === "again" ? void paint() : void choose(x.key)} />
  </div>;
}

function Note({ note }: { note: { reply: string; chips: string[] } }) {
  return <div className="rounded-3xl border-2 border-primary bg-card p-4 text-lg font-semibold shadow-soft">{note.reply}{note.chips.length > 0 && <span className="mt-1 block text-base font-normal text-muted-foreground">Ideas: {note.chips.join(" · ")}</span>}</div>;
}
