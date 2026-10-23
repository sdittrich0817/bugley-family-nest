// The Bugley Step: one full screen, one short question, up to 4 big picture cards, "My own idea!", Back, dot path.
// Every Create flow is built from these. No dropdowns, forms or menus inside a step.
import { useEffect, useState } from "react";
import { ArrowLeft, Keyboard, Mic, Volume2 } from "lucide-react";
import { Bugley } from "@/components/brand/Bugley";
import { BugleyMature } from "@/components/brand/BugleyMature";
import { speak, useVoiceInput, type SidekickChild } from "./Sidekick";
import { StepDots } from "./Guided";
import { cn } from "@/lib/utils";

export type StepChoice = { key: string; label: string; image?: string; emoji?: string };
export type BugleyMood = "flying" | "cheering" | "painting" | "celebrating";

const PAINT_LINES = ["Mixing the colors...", "Dipping my brush...", "Adding sparkle...", "Almost there..."];

export function BugleyStep({ child, question, choices, onChoose, onOwnIdea, onBack, step, steps, mood = "flying", allowOwnIdea = true, bare = false }: {
  child: SidekickChild; question: string; choices: StepChoice[]; onChoose: (c: StepChoice) => void;
  onOwnIdea?: (text: string) => void; onBack?: () => void; step?: number; steps?: number; mood?: BugleyMood; allowOwnIdea?: boolean; /** Hide Bugley here when a BugleyGuide above already speaks the line. */ bare?: boolean;
}) {
  const band = child.age_band;
  const sprouts = band === "sprouts";
  const [cheer, setCheer] = useState(false);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [paintLine, setPaintLine] = useState(0);
  const voice = useVoiceInput((t) => onOwnIdea?.(t));
  const [page, setPage] = useState(0);
  const paged = choices.length > 4;
  const pages = paged ? Math.ceil(choices.length / 3) : 1;
  const shown = paged ? choices.slice((page % pages) * 3, (page % pages) * 3 + 3) : choices;
  useEffect(() => setPage(0), [question]);

  useEffect(() => { if (sprouts) speak(question); setTyping(false); setText(""); }, [question, sprouts]);
  useEffect(() => {
    if (mood !== "painting") return;
    const t = setInterval(() => setPaintLine((n) => (n + 1) % PAINT_LINES.length), 1800);
    return () => clearInterval(t);
  }, [mood]);

  const pick = (c: StepChoice) => { setCheer(true); setTimeout(() => { setCheer(false); onChoose(c); }, 350); };
  const line = mood === "painting" ? PAINT_LINES[paintLine]! : question;
  const expression = mood === "celebrating" || cheer ? "celebrating" : mood === "painting" ? "thinking" : "happy";

  return <section className="flex min-h-[70vh] flex-col gap-5">
    <div className="flex items-center gap-3">
      {onBack ? <button onClick={onBack} aria-label="Back" className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card shadow-soft transition hover:border-primary"><ArrowLeft className="size-7" /></button> : <span className="size-14" />}
      <div className="flex-1">{steps ? <StepDots count={steps} at={step ?? 0} /> : null}</div>
      <span className="size-14" />
    </div>

    {!bare && <div className="flex items-start gap-3 sm:gap-4" aria-live="polite">
      <div key={line + mood} className={cn("shrink-0", cheer || mood === "celebrating" ? "studio-bugley-cheer" : mood === "painting" ? "studio-bugley-paint" : "studio-guide-fly")}>
        {band === "builders" ? <BugleyMature variant="headphones" size={72} />
          : <Bugley stage={child.bugley_stage} expression={expression} glow size={sprouts ? 112 : 92} />}
      </div>
      <div key={line} className={cn("relative mt-2 rounded-3xl rounded-tl-md bg-card px-5 py-4 font-display leading-snug shadow-soft animate-in fade-in slide-in-from-left-2 duration-300", sprouts ? "text-3xl" : "text-2xl")}>
        {line}
        {mood !== "painting" && <button onClick={() => speak(question)} aria-label="Hear Bugley" className="ml-3 inline-flex size-10 items-center justify-center rounded-full bg-secondary align-middle"><Volume2 className="size-5" /></button>}
      </div>
    </div>}
    {bare && <h2 className={cn("text-center", sprouts ? "text-4xl" : "text-3xl")}>{line}</h2>}

    {mood === "painting" ? <div className="mx-auto mt-6 h-4 w-full max-w-md overflow-hidden rounded-full bg-muted"><div className="studio-paint-bar h-full rounded-full bg-primary" /></div>
      : <div className={cn("grid gap-4", sprouts ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2", shown.length + (allowOwnIdea ? 1 : 0) + (paged ? 1 : 0) > 4 && !sprouts && "lg:grid-cols-3")}>
        {shown.map((c, i) => <button key={c.key} onClick={() => pick(c)} style={{ animationDelay: `${i * 70}ms` }}
          className="group overflow-hidden rounded-[2rem] border-2 border-border bg-card text-left shadow-soft transition animate-in fade-in zoom-in-95 fill-mode-both hover:-translate-y-1 hover:border-primary hover:shadow-glow focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring">
          {c.image ? <img src={c.image} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
            : <span className="flex aspect-[4/3] w-full items-center justify-center bg-primary/15 text-6xl" aria-hidden>{c.emoji ?? "✨"}</span>}
          <span className={cn("block px-4 py-3 font-display leading-tight", sprouts ? "text-3xl" : "text-2xl")}>{c.label}</span>
        </button>)}
        {paged && <button onClick={() => setPage(page + 1)} className="flex flex-col items-center justify-center gap-2 rounded-[2rem] border-2 border-border bg-card p-5 font-display text-2xl shadow-soft transition hover:border-primary"><span className="text-5xl" aria-hidden>👀</span>More!</button>}
        {allowOwnIdea && onOwnIdea && <div className="flex flex-col items-center justify-center gap-3 rounded-[2rem] border-2 border-dashed border-primary bg-card p-5 text-center shadow-soft">
          <span className={cn("font-display", sprouts ? "text-3xl" : "text-2xl")}>My own idea!</span>
          {typing ? <form className="flex w-full gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) onOwnIdea(text.trim()); }}>
              <input autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={200} aria-label="Type your idea" className="min-w-0 flex-1 rounded-2xl border-2 border-border bg-background px-4 py-3 text-lg outline-none focus:border-primary" />
              <button className="rounded-2xl bg-primary px-4 font-display text-primary-foreground">Go</button>
            </form>
            : <div className="flex items-center gap-4">
              {voice.supported && <button onClick={voice.start} aria-label="Say your idea" className={cn("flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition", voice.listening && "animate-pulse")}><Mic className="size-10" /></button>}
              <button onClick={() => setTyping(true)} aria-label="Type your idea" className="flex size-14 items-center justify-center rounded-full border-2 border-border bg-background"><Keyboard className="size-7" /></button>
            </div>}
        </div>}
      </div>}
  </section>;
}
