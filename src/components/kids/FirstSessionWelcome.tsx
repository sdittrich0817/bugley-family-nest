import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Gamepad2, Palette, Volume2, X } from "lucide-react";
import { Bugley } from "@/components/brand/Bugley";
import { BugleyMature } from "@/components/brand/BugleyMature";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Band } from "@/lib/kid-zone";
import { FIRST_CREATE_PATH, FIRST_LINES, FIRST_PLAY } from "@/lib/onboarding";
import { ARCADE_ART } from "@/lib/arcade-art";

const LINES: Record<Band, (n: string) => string> = {
  sprouts: (n) => `Hi ${n}! I'm Bugley. Want to play or make something?`,
  explorers: (n) => `Hey ${n}, I'm Bugley! Pick your first adventure.`,
  builders: (n) => `Hey ${n}. Bugley here. Play or create first?`,
};

export function FirstSessionWelcome({ name, band, stage, onSkip, onChoose }: { name: string; band: Band; stage: string; onSkip: () => void; onChoose: (c: "play" | "create") => void }) {
  const line = LINES[band](name); const first = FIRST_LINES[band];
  const sprouts = band === "sprouts", builders = band === "builders";
  const box = useRef<HTMLDivElement>(null);
  const say = () => { const s = window.speechSynthesis; if (!s) return; s.cancel(); const u = new SpeechSynthesisUtterance(sprouts ? `${line} ${first.play} Or, ${first.create}` : line); u.rate = 0.9; u.pitch = 1.2; s.speak(u); };
  useEffect(() => {
    box.current?.querySelector<HTMLElement>("button,a")?.focus();
    if (sprouts) say();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
      if (e.key !== "Tab" || !box.current) return;
      const f = [...box.current.querySelectorAll<HTMLElement>("button,a")];
      const first = f[0], last = f[f.length - 1]; if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); window.speechSynthesis?.cancel(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const card = "flex min-h-40 flex-col items-center justify-center gap-3 rounded-3xl p-6 text-center shadow-soft transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0";
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="welcome-line">
    <div ref={box} className="relative w-full max-w-2xl rounded-3xl border-2 border-border bg-card p-6 shadow-glow sm:p-8">
      <Button variant="ghost" onClick={onSkip} className="absolute right-3 top-3 min-h-16 px-4 text-base"><X />Skip</Button>
      <div className={cn("flex items-center gap-4 pr-24", sprouts && "flex-col pr-0 pt-12 text-center")}>
        {builders ? <BugleyMature variant="headphones" size={80} /> : <Bugley stage={stage as never} expression="happy" glow size={sprouts ? 140 : 100} />}
        <p id="welcome-line" className={cn("font-display", sprouts ? "text-3xl" : builders ? "text-xl" : "text-2xl")}>{line}</p>
      </div>
      {sprouts && <div className="mt-3 flex justify-center"><Button variant="outline" size="lg" className="min-h-16" onClick={say}><Volume2 />Hear Bugley</Button></div>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link to="/kids/studio/games" search={{ play: FIRST_PLAY[band] }} onClick={() => onChoose("play")} className={cn(card, "bg-primary text-primary-foreground")}>
          <img src={ARCADE_ART[FIRST_PLAY[band]]} alt="" width={1024} height={768} className="aspect-[4/3] w-full max-w-56 rounded-2xl object-cover" />
          <span className={cn("flex items-center gap-2 font-display", sprouts ? "text-4xl" : "text-3xl")}><Gamepad2 className={sprouts ? "size-10" : "size-8"} />Play</span>
          <span className={cn("font-semibold", sprouts ? "text-lg" : "text-base")}>{first.play}</span>
        </Link>
        <Link to={FIRST_CREATE_PATH} onClick={() => onChoose("create")} className={cn(card, "bg-primary text-primary-foreground")}>
          <span className="flex aspect-[4/3] w-full max-w-56 items-center justify-center rounded-2xl bg-card text-card-foreground"><Palette className="size-20" aria-hidden /></span>
          <span className={cn("flex items-center gap-2 font-display", sprouts ? "text-4xl" : "text-3xl")}><Palette className={sprouts ? "size-10" : "size-8"} />Create</span>
          <span className={cn("font-semibold", sprouts ? "text-lg" : "text-base")}>{first.create}</span>
        </Link>
      </div>
    </div>
  </div>;
}
