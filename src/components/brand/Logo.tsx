import { cn } from "@/lib/utils";

export type LogoVariant = "trail" | "firefly" | "lantern";

/** Small glowing dot used inside the logos. */
function GlowDot({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-flex", className)} style={{ width: size, height: size }}>
      <span className="glow-blob absolute -inset-2 rounded-full" />
      <span className="relative size-full rounded-full bg-glow ring-2 ring-dusk/80" />
    </span>
  );
}

/** Bugley's head + glow — used for favicon, app icon and logo B. */
export function BugleyIcon({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <circle cx="44" cy="44" r="16" fill="var(--glow)" opacity="0.35" />
      <circle cx="44" cy="44" r="9" fill="var(--glow)" stroke="var(--dusk)" strokeWidth="3" />
      <path d="M22 14 Q18 6 12 5 M36 14 Q40 6 46 5" stroke="var(--dusk)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="29" cy="30" r="17" fill="var(--bugley-body)" stroke="var(--dusk)" strokeWidth="3" />
      <ellipse cx="23" cy="30" rx="5" ry="6" fill="white" />
      <ellipse cx="35" cy="30" rx="5" ry="6" fill="white" />
      <circle cx="23.5" cy="31" r="2.6" fill="var(--bugley-pupil)" />
      <circle cx="35.5" cy="31" r="2.6" fill="var(--bugley-pupil)" />
      <path d="M25 39 Q29 42 33 39" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * Three logo options, all Nunito ExtraBold in Dusk Navy.
 * - trail: a glow dot drifts off the "y" with a dotted flight path
 * - firefly: Bugley's head leads the name
 * - lantern: glow dot sits inside the curve of the "g"-height baseline like a lantern
 */
export function Logo({
  variant = "trail",
  size = "md",
  className,
}: {
  variant?: LogoVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const text = size === "lg" ? "text-6xl" : size === "sm" ? "text-xl" : "text-2xl";
  const dot = size === "lg" ? 22 : size === "sm" ? 9 : 11;
  const base = cn("inline-flex items-center font-display leading-none text-dusk tracking-tight", text, className);

  if (variant === "firefly") {
    return (
      <span className={cn(base, "gap-[0.2em]")} aria-label="Bugley">
        <BugleyIcon size={size === "lg" ? 76 : size === "sm" ? 26 : 34} />
        <span aria-hidden>Bugley</span>
      </span>
    );
  }
  if (variant === "lantern") {
    return (
      <span className={cn(base, "relative")} aria-label="Bugley">
        <span aria-hidden>Bug</span>
        <span aria-hidden className="relative">
          l
          <GlowDot size={dot} className="absolute left-1/2 -top-[0.32em] -translate-x-1/2" />
        </span>
        <span aria-hidden>ey</span>
      </span>
    );
  }
  return (
    <span className={cn(base, "relative pr-[0.55em]")} aria-label="Bugley">
      <span aria-hidden>Bugley</span>
      <svg aria-hidden viewBox="0 0 40 30" className="absolute right-0 top-[-0.35em] h-[0.7em] w-[0.9em] overflow-visible">
        <path d="M2 28 Q14 26 20 16" stroke="var(--dusk)" strokeOpacity="0.45" strokeWidth="2.5" strokeDasharray="1 5" strokeLinecap="round" fill="none" />
      </svg>
      <GlowDot size={dot} className="absolute right-0 top-[-0.42em]" />
    </span>
  );
}
