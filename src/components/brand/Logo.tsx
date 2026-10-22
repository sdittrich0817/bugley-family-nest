import { cn } from "@/lib/utils";

export type LogoVariant = "trail" | "firefly" | "lantern" | "flight" | "swash" | "glowg";

/** Small glowing dot used inside the logos. */
function GlowDot({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-flex", className)} style={{ width: size, height: size }}>
      <span className="glow-blob absolute -inset-2 rounded-full" />
      <span className="relative size-full rounded-full bg-glow ring-2 ring-dusk/80" />
    </span>
  );
}

/** Tiny hand-drawn sparkle star. */
function Sparkle({ className, size = 12 }: { className?: string; size?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} className={cn("overflow-visible", className)}>
      <path
        d="M12 2 Q13 9 12 12 Q15 11 22 12 Q15 13 12 12 Q13 15 12 22 Q11 15 12 12 Q9 13 2 12 Q9 11 12 12 Q11 9 12 2 Z"
        fill="var(--glow)"
        stroke="var(--dusk)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
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
 * Hand-lettered "Bugley": each letter leans a little, like a kid wrote it,
 * so the name feels drawn rather than typed.
 */
const LETTER_TILTS = [
  "-rotate-2",
  "rotate-[1.5deg] translate-y-[0.05em]",
  "-rotate-[1.5deg]",
  "rotate-[1deg] -translate-y-[0.04em]",
  "-rotate-2",
  "rotate-[1.5deg]",
];

function BouncyWord({ children }: { children: (letter: string, i: number) => React.ReactNode }) {
  return (
    <span aria-hidden className="inline-flex items-baseline">
      {"Bugley".split("").map((letter, i) => (
        <span key={i} className={cn("inline-block origin-bottom", LETTER_TILTS[i])}>
          {children(letter, i)}
        </span>
      ))}
    </span>
  );
}

/**
 * Logo variants, all Nunito ExtraBold in Dusk Navy:
 * - trail: a glow dot drifts off the "y" with a dotted flight path (original)
 * - firefly: Bugley's head leads a plain name (previous chosen logo B)
 * - lantern: glow dot sits inside the curve of the "l" like a lantern
 * - flight: bouncy letters; the "y" tail takes off as a dotted flight path ending in a glow dot
 * - swash: bouncy letters with a looping underline swash that ends in a glow dot
 * - glowg: bouncy letters; the "g" holds a lantern glow and a sparkle sits over the "l"
 */
export function Logo({
  variant = "flight",
  size = "md",
  className,
}: {
  variant?: LogoVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const text = size === "lg" ? "text-6xl" : size === "sm" ? "text-xl" : "text-2xl";
  const dot = size === "lg" ? 22 : size === "sm" ? 9 : 11;
  const head = size === "lg" ? 76 : size === "sm" ? 26 : 34;
  const base = cn("inline-flex items-center font-display leading-none text-dusk tracking-tight", text, className);

  if (variant === "firefly") {
    return (
      <span className={cn(base, "gap-[0.2em]")} aria-label="Bugley">
        <BugleyIcon size={head} />
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
  if (variant === "trail") {
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

  if (variant === "flight") {
    return (
      <span className={cn(base, "gap-[0.14em] pr-[1em]")} aria-label="Bugley">
        <BugleyIcon size={head} />
        <span aria-hidden className="relative">
          <BouncyWord>{(letter) => letter}</BouncyWord>
          <svg aria-hidden viewBox="0 0 44 36" className="absolute -right-[0.78em] top-[0.32em] h-[1.05em] w-[1.2em] overflow-visible">
            <path
              d="M2 33 Q9 31 13 24 Q17 16 26 14 Q35 12 41 9"
              stroke="var(--dusk)"
              strokeOpacity="0.5"
              strokeWidth="2.4"
              strokeDasharray="0.5 5.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <GlowDot size={dot} className="absolute -right-[0.62em] top-[-0.02em]" />
        </span>
      </span>
    );
  }

  if (variant === "swash") {
    return (
      <span className={cn(base, "gap-[0.14em]")} aria-label="Bugley">
        <BugleyIcon size={head} />
        <span aria-hidden className="relative pr-[0.3em]">
          <BouncyWord>{(letter) => letter}</BouncyWord>
          <svg aria-hidden viewBox="0 0 130 26" className="absolute left-[0.05em] top-[0.78em] h-[0.42em] w-[calc(100%+0.1em)] overflow-visible">
            <path
              d="M3 16 Q22 24 48 15 Q64 9 76 15 Q86 20 98 13 Q112 5 122 9"
              stroke="var(--dusk)"
              strokeOpacity="0.5"
              strokeWidth="2.4"
              strokeDasharray="0.5 5.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <GlowDot size={dot} className="absolute right-[-0.28em] top-[0.3em]" />
        </span>
      </span>
    );
  }

  // glowg
  return (
    <span className={cn(base, "gap-[0.14em] pt-[0.18em]")} aria-label="Bugley">
      <BugleyIcon size={head} />
      <span aria-hidden className="relative">
        <BouncyWord>
          {(letter, i) =>
            i === 2 ? (
              <span className="relative">
                {letter}
                <GlowDot size={Math.round(dot * 0.6)} className="absolute left-[0.36em] top-[0.16em]" />
              </span>
            ) : i === 3 ? (
              <span className="relative">
                {letter}
                <Sparkle size={Math.round(dot * 0.8)} className="absolute left-[0.55em] -top-[0.26em]" />
              </span>
            ) : (
              letter
            )
          }
        </BouncyWord>
      </span>
    </span>
  );
}
