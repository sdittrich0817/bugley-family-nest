import { useEffect } from "react";
import { Volume2 } from "lucide-react";
import { Bugley } from "@/components/brand/Bugley";
import { BugleyMature } from "@/components/brand/BugleyMature";
import { Button } from "@/components/ui/button";
import { speak, type SidekickChild } from "../Sidekick";

export function BugleyCompanion({ child, text, busy = false }: { child: SidekickChild; text: string; busy?: boolean }) {
  useEffect(() => { if (child.age_band === "sprouts" && text) speak(text); }, [text, child.age_band]);
  return <div className="flex items-center gap-3 py-3" aria-live="polite">
    <div className="bugley-companion studio-guide-fly shrink-0 pointer-events-none">
      {child.age_band === "builders" ? <BugleyMature variant="headphones" size="100%" /> : <Bugley stage={child.bugley_stage} expression={busy ? "thinking" : "curious"} size="100%" glow />}
    </div>
    <div className="min-w-0 flex-1"><p className="font-display text-xl sm:text-2xl leading-snug">{text}</p><Button variant="ghost" size="icon" aria-label="Hear Bugley" title="Hear Bugley" onClick={() => speak(text)}><Volume2 /></Button></div>
  </div>;
}