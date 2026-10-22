import { cn } from "@/lib/utils";

export type LogoVariant = "flight" | "swash" | "hop";

/** Bugley's head + glow — used for favicon, app icon and the mark beside the name. */
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

/** Mild kid-wrote-it bounce: the letters lean instead of standing in a row. */
const BOUNCE = [
  "-rotate-2",
  "rotate-[1.5deg] translate-y-[0.05em]",
  "-rotate-[1.5deg]",
  "rotate-[1deg] -translate-y-[0.04em]",
  "-rotate-2",
  "rotate-[1.5deg]",
];

/** A sillier hop: every letter lands somewhere different. */
const HOP = [
  "-rotate-[4deg] -translate-y-[0.07em]",
  "rotate-[2.5deg] translate-y-[0.07em]",
  "-rotate-[2deg] translate-y-[-0.03em]",
  "rotate-[4deg] translate-y-[0.09em]",
  "-rotate-[3deg] -translate-y-[0.05em]",
  "rotate-[2deg] translate-y-[0.04em]",
];

/**
 * The name, letter by letter. `glowIndex` paints one letter glow yellow with a
 * thin dusk outline, so the colour does the play instead of any added dot.
 */
function BouncyWord({ styles, glowIndex }: { styles: string[]; glowIndex?: number }) {
  return (
    <span aria-hidden className="inline-flex items-baseline">
      {"Bugley".split("").map((letter, i) => (
        <span
          key={i}
          className={cn("inline-block origin-bottom", styles[i], i === glowIndex && "wordmark-glow")}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}

/** Hand-drawn tapered swoosh that trails away from the "y". */
function Swoosh({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 72 26" fill="none" className={cn("overflow-visible", className)}>
      <path d="M4 7 C14 16 40 18 68 5 C46 20 16 24 4 7 Z" fill="var(--dusk)" />
    </svg>
  );
}

/** Loopy underline, drawn like a kid signing off. */
function Swash({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 96 24" fill="none" className={cn("overflow-visible", className)}>
      <path
        d="M3 11 C14 19 27 19 38 12 C46 7 54 7 60 12 C66 17 72 16 74 11 C76 6 70 4 68 8"
        stroke="var(--dusk)"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * Logo variants. All Nunito ExtraBold in Dusk Navy, all with Bugley's head
 * leading the name. The play lives in the letterforms — no dots, no circles:
 * - flight (on the site): bouncy letters, a glow-yellow "g", and a swoosh off the "y"
 * - swash: the same letters with a loopy underline
 * - hop: bigger, sillier hops in plain dusk
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
  const head = size === "lg" ? 76 : size === "sm" ? 26 : 34;
  const base = cn("inline-flex items-center font-display leading-none text-dusk tracking-tight", text, className);

  return (
    <span
      className={cn(base, "gap-[0.14em]", variant === "flight" && "pr-[0.7em]")}
      aria-label="Bugley"
      data-logo={variant}
    >
      <BugleyIcon size={head} />
      <span aria-hidden className="relative">
        <BouncyWord styles={variant === "hop" ? HOP : BOUNCE} glowIndex={variant === "hop" ? undefined : 2} />
        {variant === "flight" && (
          <Swoosh className="absolute -right-[0.5em] top-[0.5em] h-[0.4em] w-[1.15em]" />
        )}
        {variant === "swash" && (
          <Swash className="absolute left-[0.02em] top-[0.82em] h-[0.34em] w-[calc(100%+0.06em)]" />
        )}
      </span>
    </span>
  );
}
