import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { Bugley, type BugleyExpression } from "@/components/brand/Bugley";
import { BugleyMature } from "@/components/brand/BugleyMature";
import { Button } from "@/components/ui/button";
import { speak, type SidekickChild } from "../Sidekick";
import { cn } from "@/lib/utils";

const MOODS: BugleyExpression[] = ["happy", "curious", "celebrating", "happy", "curious"];

/** Bugley wanders across the row, changing faces; while AI works he glows and thinks. */
export function BugleyCompanion({ child, text, busy = false, hint }: { child: SidekickChild; text: string; busy?: boolean; hint?: string | undefined }) {
  const [mood, setMood] = useState(0);
  useEffect(() => { if (child.age_band === "sprouts" && text) speak(text); }, [text, child.age_band]);
  useEffect(() => { const t = setInterval(() => setMood(m => (m + 1) % MOODS.length), 3200); return () => clearInterval(t); }, []);
  const expression = busy ? "thinking" : MOODS[mood] ?? "happy";
  return <div className="step-enter flex items-center gap-3 py-3" aria-live="polite">
    <div className="relative shrink-0" style={{ width: "var(--bugley-help-size)", height: "var(--bugley-help-size)" }}>
      <div className={cn("bugley-companion pointer-events-none", busy ? "bugley-thinking-glow studio-bugley-paint" : "bugley-wander")}>
        {child.age_band === "builders" ? <BugleyMature variant="headphones" size="100%" /> : <Bugley stage={child.bugley_stage} expression={expression} size="100%" glow />}
      </div>
    </div>
    <div className="min-w-0 flex-1">
      <p key={text} className="step-enter font-display text-xl leading-snug sm:text-2xl">{text}</p>
      {hint && <p className="mt-1 text-base text-muted-foreground">{hint}</p>}
      <Button variant="ghost" size="icon" aria-label="Hear Bugley" title="Hear Bugley" onClick={() => speak(hint ? `${text} ${hint}` : text)}><Volume2 /></Button>
    </div>
  </div>;
}

const MAGIC_LINES = ["Sketching the shapes…", "Mixing the perfect colors…", "Adding tiny details…", "Sprinkling in some sparkle…", "Checking every corner…", "Almost ready to show you!"];

/** Full-screen magic show while Bugley paints, so waiting feels exciting. */
export function BugleyMagic({ child, label }: { child: SidekickChild; label: string }) {
  const [line, setLine] = useState(0);
  useEffect(() => { const t = setInterval(() => setLine(n => (n + 1) % MAGIC_LINES.length), 2600); return () => clearInterval(t); }, []);
  const stars = Array.from({ length: 10 }, (_, i) => ({ left: `${(i * 37) % 95}%`, top: `${(i * 53) % 90}%`, delay: `${(i % 5) * 0.35}s` }));
  return <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/90 px-6 text-center backdrop-blur-sm">
    {stars.map((s, i) => <span key={i} aria-hidden className="sparkle-twinkle absolute text-3xl text-primary" style={{ left: s.left, top: s.top, animationDelay: s.delay }}>✦</span>)}
    <div className="relative h-48 w-full max-w-md">
      <div className="bugley-loop bugley-thinking-glow absolute left-1/2 top-1/2 -ml-20 -mt-20 size-40">
        {child.age_band === "builders" ? <BugleyMature variant="headphones" size="100%" /> : <Bugley stage={child.bugley_stage} expression="celebrating" size="100%" glow />}
      </div>
    </div>
    <h2 className="font-display text-3xl">{label}</h2>
    <p key={line} className="step-enter text-xl text-muted-foreground">{MAGIC_LINES[line]}</p>
    <div className="h-4 w-full max-w-md overflow-hidden rounded-full bg-muted"><div className="studio-paint-bar h-full rounded-full bg-primary" style={{ animationDuration: "40s" }} /></div>
    <p className="text-sm text-muted-foreground">Great art takes a little time. Your picture is on its way!</p>
  </div>;
}

/** Cheerful confetti burst for finishing. */
export function Confetti() {
  const colors = ["bg-primary", "bg-accent", "bg-secondary", "bg-destructive"];
  return <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
    {Array.from({ length: 40 }, (_, i) => <span key={i} className={cn("confetti-piece absolute top-0 block h-3 w-2 rounded-sm", colors[i % colors.length])} style={{ left: `${(i * 23) % 100}%`, animationDelay: `${(i % 8) * 0.15}s` }} />)}
  </div>;
}
