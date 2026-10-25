// The Bugley Step: one short question. The child's own idea comes first (type or say it);
// Bugley's ideas are small suggestion tiles, all visible at once. Bugley flits between them to help.
import { useEffect, useState } from "react";
import { ArrowLeft, Mic, Volume2 } from "lucide-react";
import { Bugley } from "@/components/brand/Bugley";
import { BugleyMature } from "@/components/brand/BugleyMature";
import { speak, useVoiceInput, type SidekickChild } from "./Sidekick";
import { StepDots } from "./Guided";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StepChoice = { key: string; label: string; image?: string | undefined; emoji?: string | undefined };
export type BugleyMood = "flying" | "cheering" | "painting" | "celebrating";

const PAINT_LINES = ["Mixing the colors...", "Dipping my brush...", "Adding sparkle...", "Almost there..."];

export function BugleyStep({ child, question, choices, onChoose, onOwnIdea, onBack, step, steps, mood = "flying", allowOwnIdea = true, bare = false, longAnswer = false, initialAnswer = "", hideHeading = false, maxAnswer = 20000, placeholder }: {
  child: SidekickChild; question: string; choices: StepChoice[]; onChoose: (c: StepChoice) => void;
  onOwnIdea?: ((text: string) => void) | undefined; onBack?: (() => void) | undefined; step?: number; steps?: number; mood?: BugleyMood; allowOwnIdea?: boolean; /** Hide the big Bugley bubble when a BugleyGuide above already speaks the line. */ bare?: boolean; /** @deprecated layout is always compact now */ ownIdeaBelow?: boolean; longAnswer?: boolean; initialAnswer?: string; hideHeading?: boolean; maxAnswer?: number; placeholder?: string;
}) {
  const band = child.age_band;
  const sprouts = band === "sprouts";
  const [cheer, setCheer] = useState(false);
  const [text, setText] = useState(initialAnswer);
  const [paintLine, setPaintLine] = useState(0);
  const [hover, setHover] = useState(0);
  const voice = useVoiceInput((t) => setText((v) => (longAnswer ? `${v} ${t}`.trim() : t).slice(0, maxAnswer)));
  const own = allowOwnIdea && !!onOwnIdea;
  const pictures = choices.some((c) => c.image);

  useEffect(() => { if (sprouts && !bare) speak(question); }, [question, sprouts, bare]);
  useEffect(() => { setText(initialAnswer); setHover(0); }, [question, initialAnswer]);
  useEffect(() => {
    if (mood !== "painting") return;
    const t = setInterval(() => setPaintLine((n) => (n + 1) % PAINT_LINES.length), 1800);
    return () => clearInterval(t);
  }, [mood]);
  // Bugley wanders across the ideas on his own when nobody is pointing at one.
  useEffect(() => {
    if (!choices.length || mood === "painting") return;
    const t = setInterval(() => setHover((h) => (h + 1) % choices.length), 2600);
    return () => clearInterval(t);
  }, [choices.length, mood]);

  const pick = (c: StepChoice) => { setCheer(true); setTimeout(() => { setCheer(false); onChoose(c); }, 250); };
  const submit = () => { const v = longAnswer ? text : text.trim(); if (v.trim() && onOwnIdea) onOwnIdea(v); };
  const line = mood === "painting" ? (PAINT_LINES[paintLine] ?? question) : question;
  const expression = mood === "celebrating" || cheer ? "celebrating" : mood === "painting" ? "thinking" : "happy";
  const mini = band === "builders" ? <BugleyMature variant="headphones" size={34} /> : <Bugley stage={child.bugley_stage} expression="curious" glow size={34} />;

  return <section className="flex flex-col gap-4">
    <div className="flex items-center gap-3">
      {onBack ? <Button variant="ghost" onClick={onBack} aria-label="Back" className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card p-0 shadow-soft hover:border-primary"><ArrowLeft className="size-6" /></Button> : <span className="size-12" />}
      <div className="flex-1">{steps ? <StepDots count={steps} at={step ?? 0} /> : null}</div>
      <span className="size-12" />
    </div>

    {!bare && <div className="flex items-start gap-3" aria-live="polite">
      <div key={line + mood} className={cn("bugley-companion shrink-0", cheer || mood === "celebrating" ? "studio-bugley-cheer" : mood === "painting" ? "studio-bugley-paint" : "studio-guide-fly")}>
        {band === "builders" ? <BugleyMature variant="headphones" size="100%" /> : <Bugley stage={child.bugley_stage} expression={expression} glow size="100%" />}
      </div>
      <div key={line} className={cn("relative mt-1 rounded-3xl rounded-tl-md bg-card px-4 py-3 font-display leading-snug shadow-soft animate-in fade-in slide-in-from-left-2 duration-300", sprouts ? "text-2xl" : "text-xl")}>
        {line}
        {mood !== "painting" && <Button variant="ghost" onClick={() => speak(question)} aria-label="Hear Bugley" className="ml-2 inline-flex size-9 items-center justify-center rounded-full bg-secondary p-0 align-middle"><Volume2 className="size-5" /></Button>}
      </div>
    </div>}
    {bare && <h2 className={cn(hideHeading ? "sr-only" : "text-center", sprouts ? "text-3xl" : "text-2xl sm:text-3xl")}>{line}</h2>}

    {mood === "painting" ? <div className="mx-auto mt-6 h-4 w-full max-w-md overflow-hidden rounded-full bg-muted"><div className="studio-paint-bar h-full rounded-full bg-primary" /></div> : <>
      {own && <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="rounded-3xl border-2 border-primary bg-card p-3 shadow-soft">
        <label className={cn("mb-2 block px-1 font-display", sprouts ? "text-2xl" : "text-xl")}>{longAnswer ? "Your words" : "My own idea"}</label>
        <div className={cn("flex gap-2", longAnswer && "flex-col")}>
          {longAnswer
            ? <textarea autoFocus rows={sprouts ? 3 : 5} value={text} onChange={(e) => setText(e.target.value)} maxLength={maxAnswer} aria-label="Your story words" className="min-w-0 flex-1 rounded-2xl border-2 border-border bg-background px-4 py-3 text-lg outline-none focus:border-primary" />
            : <input value={text} onChange={(e) => setText(e.target.value)} maxLength={600} placeholder={placeholder ?? "Type it or tap the mic…"} aria-label="Type your idea" className="min-w-0 flex-1 rounded-2xl border-2 border-border bg-background px-4 py-3 text-lg outline-none focus:border-primary" />}
          <div className="flex gap-2">
            {voice.supported && <Button type="button" variant="secondary" onClick={voice.start} aria-label="Say your idea" className={cn("h-auto min-h-12 rounded-2xl px-4 [&_svg]:size-6", voice.listening && "animate-pulse bg-primary text-primary-foreground")}><Mic />{longAnswer || sprouts ? (voice.listening ? "Listening…" : "Say it") : null}</Button>}
            <Button type="submit" disabled={!text.trim()} className="h-auto min-h-12 flex-1 rounded-2xl px-5 font-display text-lg">Use my idea!</Button>
          </div>
        </div>
      </form>}

      {choices.length > 0 && <div>
        {own && <p className="mb-2 px-1 text-sm font-semibold text-muted-foreground">Need a spark? Bugley’s ideas:</p>}
        <div className={cn("grid gap-2", pictures ? "grid-cols-3 sm:grid-cols-4" : sprouts ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4")}>
          {choices.map((c, i) => <Button variant="ghost" key={c.key} onClick={() => pick(c)} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)}
            className={cn("relative h-auto whitespace-normal overflow-visible rounded-2xl border-2 border-border bg-card p-0 text-left shadow-soft transition hover:border-primary hover:shadow-glow focus-visible:ring-4 focus-visible:ring-ring", pictures ? "flex-col items-stretch gap-0" : "min-h-14 justify-start gap-2 px-3 py-2")}>
            {hover === i && <span className="pointer-events-none absolute -right-2 -top-4 z-10 studio-guide-fly" aria-hidden>{mini}</span>}
            {c.image ? <img src={c.image} alt="" loading="lazy" className="aspect-square w-full rounded-t-[0.9rem] object-cover" />
              : <span className={cn("shrink-0", sprouts ? "text-3xl" : "text-2xl")} aria-hidden>{c.emoji ?? "✨"}</span>}
            <span className={cn("block font-display leading-tight", pictures && "px-2 py-1.5 text-center", sprouts ? "text-xl" : "text-base sm:text-lg")}>{c.label}</span>
          </Button>)}
        </div>
      </div>}
    </>}
  </section>;
}
