// Shared building blocks for the step-by-step Studio flows: Bugley's guide bubble, progress dots, big choice tiles.
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Volume2 } from "lucide-react";
import { Bugley } from "@/components/brand/Bugley";
import { BugleyMature } from "@/components/brand/BugleyMature";
import { Button } from "@/components/ui/button";
import { speak, type BugleyChat, type SidekickChild } from "./Sidekick";
import { cn } from "@/lib/utils";

/** Bugley hovers beside his latest line. Every maker talks through chat.say, so the bubble is always the next question. */
export function BugleyGuide({ child, chat }: { child: SidekickChild; chat: BugleyChat }) {
  const last = [...chat.messages].reverse().find((m) => m.from === "bugley")?.text ?? "";
  const sprouts = child.age_band === "sprouts";
  return <div className="relative flex items-start gap-3 sm:gap-4" aria-live="polite">
    <div key={last} className="studio-guide-fly shrink-0">
      {child.age_band === "builders" ? <BugleyMature variant="headphones" size={64} />
        : <Bugley stage={child.bugley_stage} expression={chat.busy ? "thinking" : "happy"} glow size={sprouts ? 96 : 80} />}
    </div>
    <div className="min-w-0 flex-1 space-y-2 pt-1">
      <div key={last} className={cn("relative rounded-3xl rounded-tl-md bg-card px-4 py-3 font-semibold leading-snug shadow-soft animate-in fade-in slide-in-from-left-2 duration-300", sprouts ? "text-xl" : "text-lg")}>
        {chat.busy ? <span className="inline-flex gap-1" aria-label="Bugley is thinking">{[0, 1, 2].map((d) => <span key={d} className="size-2 animate-bounce rounded-full bg-foreground/50" style={{ animationDelay: `${d * 120}ms` }} />)}</span> : last}
        {sprouts && !chat.busy && <button onClick={() => speak(last)} aria-label="Hear Bugley" className="ml-2 inline-flex size-8 items-center justify-center rounded-full bg-secondary align-middle"><Volume2 className="size-4" /></button>}
      </div>
      {!chat.busy && chat.chips.length > 0 && <div className="flex flex-wrap gap-2">{chat.chips.map((c) => <button key={c} onClick={() => void chat.send(c, "chip")} className="rounded-full border-2 border-primary bg-card px-3 py-1.5 text-sm font-semibold transition hover:bg-primary hover:text-primary-foreground">{c}</button>)}</div>}
    </div>
  </div>;
}

export function StepDots({ count, at }: { count: number; at: number }) {
  return <ol className="flex justify-center gap-2" aria-label={`Step ${at + 1} of ${count}`}>{Array.from({ length: count }, (_, i) => <li key={i} className={cn("h-2.5 rounded-full transition-all", i === at ? "w-8 bg-primary" : i < at ? "w-2.5 bg-primary/60" : "w-2.5 bg-muted")} />)}</ol>;
}

export function StepNav({ onBack, onNext, nextLabel = "Next", canNext = true, busy }: { onBack?: (() => void) | undefined; onNext?: (() => void) | undefined; nextLabel?: ReactNode; canNext?: boolean; busy?: boolean }) {
  return <div className="flex items-center justify-between gap-3 pt-2">
    {onBack ? <Button variant="ghost" size="lg" onClick={onBack} disabled={busy}><ArrowLeft />Back</Button> : <span />}
    {onNext && <Button variant="primary" size="lg" onClick={onNext} disabled={!canNext || busy}>{nextLabel}<ArrowRight /></Button>}
  </div>;
}

/** A big tappable card. Used for genres, styles and the Studio's three doors. */
export function ChoiceTile({ selected, onClick, emoji, image, label, sub, className }: { selected?: boolean; onClick: () => void; emoji?: string; image?: string | undefined; label: string; sub?: string; className?: string }) {
  return <button type="button" onClick={onClick} aria-pressed={selected}
    className={cn("group flex flex-col overflow-hidden rounded-3xl border-2 bg-card text-left shadow-soft transition hover:-translate-y-1 hover:border-primary hover:shadow-glow focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring", selected ? "border-primary shadow-glow" : "border-border", className)}>
    {image ? <img src={image} alt="" loading="lazy" className="aspect-square w-full object-cover" /> : emoji ? <span className="flex aspect-[4/3] w-full items-center justify-center bg-primary/15 text-5xl" aria-hidden>{emoji}</span> : null}
    <span className="block px-3 py-2.5"><span className="block font-display text-lg leading-tight">{label}</span>{sub && <span className="block text-sm text-muted-foreground">{sub}</span>}</span>
  </button>;
}

export const GENRE_EMOJI: Record<string, string> = { Superhero: "🦸", Adventure: "🗺️", Mystery: "🔍", Fantasy: "🐉", Space: "🚀", "Animal Tales": "🦊", Funny: "😂", "Spooky-Not-Scary": "👻", Sports: "⚽", Friendship: "🤝" };

export const field = "w-full rounded-2xl border-2 border-border bg-background p-4 text-lg text-foreground outline-none focus:border-primary";
