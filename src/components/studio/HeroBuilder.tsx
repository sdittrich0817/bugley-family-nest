// Hero Builder: kind -> color -> special thing -> name -> Bugley paints 3 options -> "That's my hero!" (Character Lock runs on save).
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BugleyStep, type StepChoice } from "./BugleyStep";
import type { BugleyChat, SidekickChild } from "./Sidekick";
import { makeHeroOptions, saveHero } from "@/lib/images.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { useScrollTopOn } from "@/lib/scroll";

const KINDS: StepChoice[] = [
  { key: "kid", label: "A kid", emoji: "🧒" }, { key: "animal", label: "An animal", emoji: "🦊" }, { key: "dragon", label: "A dragon", emoji: "🐉" },
  { key: "robot", label: "A robot", emoji: "🤖" }, { key: "alien", label: "An alien", emoji: "👽" }, { key: "monster", label: "A friendly monster", emoji: "👾" },
];
const COLORS: StepChoice[] = [
  { key: "red", label: "Red", emoji: "🔴" }, { key: "blue", label: "Blue", emoji: "🔵" }, { key: "green", label: "Green", emoji: "🟢" },
  { key: "purple", label: "Purple", emoji: "🟣" }, { key: "orange", label: "Orange", emoji: "🟠" }, { key: "yellow", label: "Yellow", emoji: "🟡" },
];
const SPECIALS: StepChoice[] = [
  { key: "a flowing scarf", label: "A scarf", emoji: "🧣" }, { key: "a cape", label: "A cape", emoji: "🦸" }, { key: "round glasses", label: "Glasses", emoji: "👓" },
  { key: "a star mark on the cheek", label: "A star mark", emoji: "⭐" }, { key: "a hat", label: "A hat", emoji: "🎩" }, { key: "a backpack", label: "A backpack", emoji: "🎒" },
];
const FIRST = ["Captain", "Professor", "Sir", "Zippy", "Lady", "Doctor", "Mister", "Sparkle"];
const LAST = ["Noodle", "Wiggles", "Pickle", "Puddles", "Bubbles", "Sprinkles", "Waffles", "Zoom"];

export type HeroRole = "hero" | "sidekick" | "villain";
const ROLE_Q: Record<HeroRole, string> = { hero: "Who’s our hero?", sidekick: "Who’s the sidekick?", villain: "Who’s the villain?" };

export function HeroBuilder({ child, chat, styleKey, role = "hero", onDone, onBack }: {
  child: SidekickChild; chat: BugleyChat; styleKey: string; role?: HeroRole; onDone: (id: string) => void; onBack: () => void;
}) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState(""), [color, setColor] = useState(""), [special, setSpecial] = useState(""), [name, setName] = useState("");
  const [options, setOptions] = useState<{ path: string; url: string }[]>([]);
  const [mood, setMood] = useState<"flying" | "painting" | "celebrating">("flying");
  const [note, setNote] = useState<{ reply: string; chips: string[] } | null>(null);
  const qc = useQueryClient();
  useScrollTopOn(step);
  const names = useMemo(() => Array.from({ length: 3 }, (_, i) => `${FIRST[(Math.random() * FIRST.length) | 0]} ${LAST[(i * 3 + ((Math.random() * LAST.length) | 0)) % LAST.length]}`), [step === 3]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = { childId: child.id, styleKey, kind, color, special, name };

  async function paint() {
    setStep(4); setMood("painting"); setNote(null); chat.say("Mixing the colors...");
    try {
      const r = await makeHeroOptions({ data: { ...base, environment: getStripeEnvironment() } });
      if (r.ok) { setOptions(r.options); setMood("flying"); chat.say(`Which one is ${name}?`); }
      else { setMood("flying"); setNote({ reply: r.reply, chips: "chips" in r ? r.chips ?? [] : [] }); chat.say(r.reply); }
    } catch { setMood("flying"); setNote({ reply: "Oops, my paintbrush slipped! Try again?", chips: [] }); }
    finally { void qc.invalidateQueries({ queryKey: ["glow", child.id] }); }
  }
  async function choose(path: string) {
    setMood("painting"); chat.say(`Locking in ${name} so they look the same on every page...`);
    try {
      const r = await saveHero({ data: { ...base, path } });
      if (r.ok) { setMood("celebrating"); chat.say(`${name} is ready for adventure!`); await qc.invalidateQueries({ queryKey: ["cast", child.id] }); setTimeout(() => onDone(r.id), 900); }
      else { setMood("flying"); setOptions([]); setNote({ reply: r.reply, chips: r.chips ?? [] }); chat.say(r.reply); setStep(3); }
    } catch { setMood("flying"); setNote({ reply: "Oops! Try again.", chips: [] }); }
  }
  useEffect(() => { if (step < 4) chat.say([ROLE_Q[role], "What’s their favorite color?", "What’s their special thing?", "What’s their name?"][step]!); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const common = { child, bare: true, steps: 5, step, onBack: step === 0 ? onBack : () => { setNote(null); setStep(step === 4 ? 3 : step - 1); } };
  if (step === 0) return <BugleyStep {...common} question={ROLE_Q[role]} choices={KINDS} onChoose={(c) => { setKind(c.key); setStep(1); }} onOwnIdea={(t) => { setKind(t.slice(0, 60)); setStep(1); }} />;
  if (step === 1) return <BugleyStep {...common} question="What’s their favorite color?" choices={COLORS} onChoose={(c) => { setColor(c.key); setStep(2); }} onOwnIdea={(t) => { setColor(t.slice(0, 40)); setStep(2); }} />;
  if (step === 2) return <BugleyStep {...common} question="What’s their special thing?" choices={SPECIALS} onChoose={(c) => { setSpecial(c.key); setStep(3); }} onOwnIdea={(t) => { setSpecial(t.slice(0, 60)); setStep(3); }} />;
  if (step === 3) return <div className="space-y-3">
    {note && <Note note={note} />}
    <BugleyStep {...common} question="What’s their name?" choices={names.map((n) => ({ key: n, label: n, emoji: "🏷️" }))} onChoose={(c) => { setName(c.key); void paintWith(c.key); }} onOwnIdea={(t) => { const n = t.slice(0, 40); setName(n); void paintWith(n); }} />
  </div>;
  return <div className="space-y-3">
    {note && <Note note={note} />}
    <BugleyStep {...common} mood={mood === "painting" ? "painting" : mood} question={options.length ? `Which one is ${name}?` : note ? "Want to try again?" : "Mixing the colors..."} allowOwnIdea={false}
      choices={[...options.map((o, i) => ({ key: o.path, label: i === 0 ? "This one!" : i === 1 ? "Or this one!" : "Maybe this!", image: o.url })), { key: "again", label: "Try again · 1 glow", emoji: "🔄" }]}
      onChoose={(c) => c.key === "again" ? void paint() : void choose(c.key)} />
  </div>;

  function paintWith(n: string) { base.name = n; return paint(); }
}

function Note({ note }: { note: { reply: string; chips: string[] } }) {
  return <div className="rounded-3xl border-2 border-primary bg-card p-4 text-lg font-semibold shadow-soft">{note.reply}{note.chips.length > 0 && <span className="mt-1 block text-base font-normal text-muted-foreground">Ideas: {note.chips.join(" · ")}</span>}</div>;
}
