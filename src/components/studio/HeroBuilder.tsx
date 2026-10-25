// Hero Builder, three steps: what is it (Bugley asks one follow-up only if the idea needs more detail) -> what's it like + special thing -> name -> Bugley paints 3 options -> "That's my hero!" (Character Lock runs on save).
// The child's own words come first on every step; Bugley's tiles are only suggestions.
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BugleyStep, type StepChoice } from "./BugleyStep";
import type { BugleyChat, SidekickChild } from "./Sidekick";
import { heroIdeaCheck, makeHeroOptions, saveHero } from "@/lib/images.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { useScrollTopOn } from "@/lib/scroll";

const c = (key: string, emoji: string, label = key[0]!.toUpperCase() + key.slice(1)): StepChoice => ({ key, label, emoji });
const KINDS: StepChoice[] = [c("a kid", "🧒", "A kid"), c("an animal", "🦊", "An animal"), c("a dragon", "🐉", "A dragon"), c("a robot", "🤖", "A robot"), c("an alien", "👽", "An alien"), c("a friendly monster", "👾", "A monster"), c("a bug", "🐞", "A bug"), c("a magical creature", "🦄", "Magic creature")];
const PERSONALITY: StepChoice[] = [c("brave", "🦁"), c("silly", "🤪"), c("shy", "🙈"), c("curious", "🔍"), c("kind", "💛"), c("grumpy but sweet", "😤", "Grumpy but sweet"), c("super smart", "🧠", "Super smart"), c("sneaky", "🥷")];
const SPECIALS: StepChoice[] = [c("a flowing scarf", "🧣", "A scarf"), c("a cape", "🦸", "A cape"), c("round glasses", "👓", "Glasses"), c("a star mark on the cheek", "⭐", "A star mark"), c("a hat", "🎩", "A hat"), c("a backpack", "🎒", "A backpack"), c("rocket boots", "🚀", "Rocket boots"), c("a magic wand", "🪄", "A magic wand")];
const FIRST = ["Captain", "Professor", "Sir", "Zippy", "Lady", "Doctor", "Mister", "Sparkle"];
const LAST = ["Noodle", "Wiggles", "Pickle", "Puddles", "Bubbles", "Sprinkles", "Waffles", "Zoom"];

export type HeroRole = "hero" | "sidekick" | "villain";
const ROLE_Q: Record<HeroRole, string> = { hero: "Who’s our hero?", sidekick: "Who’s the sidekick?", villain: "Who’s the villain?" };
const STEPS = 4;

export function HeroBuilder({ child, chat, styleKey, role = "hero", onDone, onBack }: {
  child: SidekickChild; chat: BugleyChat; styleKey: string; role?: HeroRole; onDone: (id: string) => void; onBack: () => void;
}) {
  const [step, setStep] = useState(0);
  const [idea, setIdea] = useState("");
  const [extra, setExtra] = useState<string[]>([]);
  const [followup, setFollowup] = useState<{ question: string; chips: string[] } | null>(null);
  const [checking, setChecking] = useState(false);
  const [personality, setPersonality] = useState("");
  const [special, setSpecial] = useState("");
  const [name, setName] = useState("");
  const [options, setOptions] = useState<{ path: string; url: string }[]>([]);
  const [mood, setMood] = useState<"flying" | "painting" | "celebrating">("flying");
  const [note, setNote] = useState<{ reply: string; chips: string[] } | null>(null);
  const qc = useQueryClient();
  useScrollTopOn(`${step}-${followup?.question}`);
  const names = useMemo(() => Array.from({ length: 4 }, (_, i) => `${FIRST[(Math.random() * FIRST.length) | 0]} ${LAST[(i * 3 + ((Math.random() * LAST.length) | 0)) % LAST.length]}`), [step === 2]); // eslint-disable-line react-hooks/exhaustive-deps
  const fullKind = [idea, ...extra].join("; ").slice(0, 160);
  const base = { childId: child.id, styleKey, kind: fullKind, color: "", special, personality, name };

  async function checkIdea(nextIdea: string, nextExtra: string[]) {
    setChecking(true); setNote(null);
    try {
      const r = await heroIdeaCheck({ data: { childId: child.id, idea: nextIdea, extra: nextExtra } });
      if (!r.ok) { setNote({ reply: r.reply, chips: r.chips }); chat.say(r.reply); return; }
      if (r.ready || nextExtra.length >= 2) { setFollowup(null); setStep(1); }
      else { setFollowup({ question: r.question, chips: r.chips }); chat.say(r.question); }
    } catch { setFollowup(null); setStep(1); }
    finally { setChecking(false); }
  }
  const pickIdea = (text: string) => { const v = text.trim().slice(0, 160); if (!v) return; setIdea(v); setExtra([]); void checkIdea(v, []); };
  const pickExtra = (text: string) => { const v = text.trim().slice(0, 120); if (!v) return; const next = [...extra, v]; setExtra(next); void checkIdea(idea, next); };

  async function paint(n = name) {
    setStep(3); setMood("painting"); setNote(null); chat.say("Mixing the colors...");
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
      else { setMood("flying"); setOptions([]); setNote({ reply: r.reply, chips: r.chips ?? [] }); chat.say(r.reply); setStep(2); }
    } catch { setMood("flying"); setNote({ reply: "Oops! Try again.", chips: [] }); }
  }
  useEffect(() => {
    if (step === 0 && !followup) chat.say(`${ROLE_Q[role]} Tell me your own idea, or peek at mine!`);
    else if (step === 1) chat.say("What are they like inside, and what’s their special thing?");
    else if (step === 2) chat.say("What’s their name?");
  }, [step, followup]); // eslint-disable-line react-hooks/exhaustive-deps

  const common = { child, bare: true, steps: STEPS, step, onBack: step === 0 ? onBack : () => { setNote(null); setStep(step - 1); } };
  const summary = [name, fullKind, personality, special].filter(Boolean).join(" · ");

  if (step === 0) return <div className="space-y-3">
    {note && <Note note={note} />}
    {checking ? <BugleyStep {...common} question="Ooh, let me picture that…" choices={[]} allowOwnIdea={false} onChoose={() => {}} mood="painting" />
      : followup ? <BugleyStep {...common} question={followup.question} placeholder="Tell Bugley more" choices={followup.chips.map((s) => ({ key: s, label: s, emoji: "💡" }))} onChoose={(x) => pickExtra(x.label)} onOwnIdea={pickExtra} />
      : <BugleyStep {...common} question={ROLE_Q[role]} placeholder="A purple dragon who’s afraid of flying…" choices={KINDS} onChoose={(x) => pickIdea(x.key)} onOwnIdea={pickIdea} />}
  </div>;

  if (step === 1) return <div className="space-y-3">
    <p className="text-center text-sm font-semibold text-muted-foreground">{fullKind}</p>
    <BugleyStep {...common} question="What are they like inside?" placeholder="Brave but scared of bubbles…" choices={PERSONALITY} onChoose={(x) => setPersonality(x.key)} onOwnIdea={(t) => setPersonality(t.trim().slice(0, 40))} />
    {personality && <BugleyStep {...common} step={1} question="What’s their special thing?" placeholder="A sock that talks…" choices={SPECIALS} onChoose={(x) => { setSpecial(x.key); setStep(2); }} onOwnIdea={(t) => { setSpecial(t.trim().slice(0, 80)); setStep(2); }} />}
  </div>;

  if (step === 2) return <div className="space-y-3">
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
