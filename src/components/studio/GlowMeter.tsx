import { Bugley, type BugleyStage } from "@/components/brand/Bugley";
import { isGlowLow } from "@/lib/glow";
import { cn } from "@/lib/utils";

export function GlowMeter({ total, allowance, stage, big, compact }: { total: number; allowance: number; stage: BugleyStage; big?: boolean; compact?: boolean }) {
  const pct = Math.min(100, Math.round((total / Math.max(allowance, 1)) * 100));
  const low = isGlowLow(total);
  if (compact) return <div className="flex items-center gap-2 rounded-full bg-card px-3 py-1.5 shadow-soft" role="meter" aria-valuemin={0} aria-valuemax={allowance} aria-valuenow={total} aria-label="Glow" title={low ? "I’m almost out of glow! Let’s write the next page and I’ll draw it tomorrow." : "Your glow"}>
    <Bugley stage={stage} expression={low ? "sleepy" : "happy"} glow={!low} size={30} />
    <div className="h-2.5 w-16 overflow-hidden rounded-full bg-muted sm:w-24"><div className="h-full rounded-full bg-primary shadow-glow transition-all duration-500" style={{ width: `${pct}%` }} /></div>
    <span className="font-display text-sm">{total}</span>
  </div>;
  return <div className="mt-6 flex items-center gap-4 rounded-3xl bg-card p-5 shadow-soft" role="meter" aria-valuemin={0} aria-valuemax={allowance} aria-valuenow={total} aria-label="Glow">
    <Bugley stage={stage} expression={low ? "sleepy" : "happy"} glow={!low} size={big ? 84 : 64} className="shrink-0" />
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2"><p className={cn("font-display", big ? "text-2xl" : "text-lg")}>Glow</p><p className="font-display text-lg">{total}</p></div>
      <div className="mt-2 h-4 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary shadow-glow transition-all" style={{ width: `${pct}%` }} /></div>
      {low && <p className="mt-2 text-sm font-medium">I’m almost out of glow! Let’s write the next page and I’ll draw it tomorrow.</p>}
    </div>
  </div>;
}
