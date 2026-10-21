import { useId } from "react";
import { cn } from "@/lib/utils";

export const BUGLEY_STAGES = ["grub", "hatchling", "scout", "engineer", "navigator"] as const;
export const BUGLEY_EXPRESSIONS = ["happy", "curious", "thinking", "sleepy", "celebrating", "oops"] as const;
export type BugleyStage = (typeof BUGLEY_STAGES)[number];
export type BugleyExpression = (typeof BUGLEY_EXPRESSIONS)[number];

const STAGE_GLOW: Record<BugleyStage, number> = {
  grub: 0.35,
  hatchling: 0.5,
  scout: 0.68,
  engineer: 0.84,
  navigator: 1,
};

interface BugleyProps {
  stage?: BugleyStage;
  expression?: BugleyExpression;
  /** Pulsing glow. Automatically disabled for reduced-motion users. */
  glow?: boolean;
  size?: number | string;
  className?: string;
  title?: string;
}

const C = {
  body: "var(--bugley-body)",
  shade: "var(--bugley-body-shade)",
  belly: "var(--bugley-belly)",
  wing: "var(--bugley-wing)",
  glow: "var(--glow)",
  accent: "var(--bugley-accent)",
  gear: "var(--bugley-gear)",
  ink: "var(--dusk)",
  white: "oklch(1 0 0)",
};

/**
 * Bugley the firefly, drawn in code so he's identical everywhere.
 * viewBox 200x200: head at (100,78), glowing tail at (100,142).
 */
export function Bugley({
  stage = "hatchling",
  expression = "happy",
  glow = true,
  size = 160,
  className,
  title,
}: BugleyProps) {
  const uid = useId().replace(/:/g, "");
  const halo = `bh-${uid}`;
  const tail = `bt-${uid}`;
  const intensity = STAGE_GLOW[stage] * (expression === "sleepy" ? 0.45 : 1);
  const sleek = stage === "engineer";
  const icon = stage === "navigator";
  const wings = stage !== "grub";
  const wingScale = stage === "hatchling" ? 0.75 : stage === "navigator" ? 0.95 : 1;
  const anim = glow ? (stage === "grub" ? "bugley-flicker" : "bugley-pulse") : "";
  const stroke = icon ? 5 : 4;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={title ?? `Bugley the firefly, ${stage}, ${expression}`}
      className={cn("overflow-visible", className)}
      style={{ ["--glow-o" as string]: intensity }}
    >
      <defs>
        <radialGradient id={halo}>
          <stop offset="0%" stopColor={C.glow} stopOpacity="0.95" />
          <stop offset="45%" stopColor={C.glow} stopOpacity="0.45" />
          <stop offset="100%" stopColor={C.glow} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={tail} cx="50%" cy="40%">
          <stop offset="0%" stopColor="oklch(0.98 0.06 95)" />
          <stop offset="100%" stopColor={C.glow} />
        </radialGradient>
      </defs>

      {/* Halo */}
      <circle
        cx="100"
        cy="146"
        r={40 + intensity * 48}
        fill={`url(#${halo})`}
        opacity={intensity}
        className={anim}
      />

      {/* Wings */}
      {wings && (
        <g transform={`translate(100 108) scale(${wingScale}) translate(-100 -108)`} opacity="0.95">
          <ellipse cx="62" cy="104" rx={sleek ? 26 : 30} ry="20" transform="rotate(-28 62 104)" fill={C.wing} stroke={C.ink} strokeWidth="3" />
          <ellipse cx="138" cy="104" rx={sleek ? 26 : 30} ry="20" transform="rotate(28 138 104)" fill={C.wing} stroke={C.ink} strokeWidth="3" />
        </g>
      )}

      {/* Scout backpack (behind body) */}
      {stage === "scout" && (
        <g>
          <rect x="128" y="96" width="30" height="38" rx="10" fill={C.accent} stroke={C.ink} strokeWidth="3" />
          <rect x="133" y="102" width="20" height="10" rx="4" fill="oklch(0.7 0.11 150)" />
        </g>
      )}

      {/* Glowing tail */}
      <ellipse
        cx="100"
        cy="146"
        rx={sleek ? 24 : 28}
        ry={sleek ? 26 : 28}
        fill={`url(#${tail})`}
        stroke={C.ink}
        strokeWidth={stroke}
      />
      {!icon && <path d="M80 138 Q100 132 120 138" stroke={C.ink} strokeOpacity="0.25" strokeWidth="3" fill="none" strokeLinecap="round" />}

      {/* Head / body */}
      <ellipse
        cx="100"
        cy="82"
        rx={sleek ? 40 : 46}
        ry={sleek ? 40 : 44}
        fill={C.body}
        stroke={C.ink}
        strokeWidth={stroke}
      />
      {!icon && <ellipse cx="86" cy="62" rx="12" ry="7" fill={C.white} opacity="0.12" transform="rotate(-20 86 62)" />}
      {/* Cheeks */}
      <circle cx="68" cy="98" r="6" fill="oklch(0.75 0.12 20)" opacity="0.55" />
      <circle cx="132" cy="98" r="6" fill="oklch(0.75 0.12 20)" opacity="0.55" />

      {/* Antennae */}
      <g stroke={C.ink} strokeWidth={stroke} strokeLinecap="round" fill="none">
        <path d={stage === "grub" ? "M86 42 Q82 30 76 28" : "M86 42 Q78 20 66 16"} />
        <path d={stage === "grub" ? "M114 42 Q118 30 124 28" : "M114 42 Q122 20 134 16"} />
      </g>
      <circle cx={stage === "grub" ? 76 : 66} cy={stage === "grub" ? 28 : 16} r="5" fill={C.glow} stroke={C.ink} strokeWidth="2.5" />
      <circle cx={stage === "grub" ? 124 : 134} cy={stage === "grub" ? 28 : 16} r="5" fill={C.glow} stroke={C.ink} strokeWidth="2.5" />

      <Face expression={expression} />

      {/* Hatchling explorer's cap */}
      {stage === "hatchling" && (
        <g>
          <path d="M70 52 Q100 22 130 52 Z" fill={C.accent} stroke={C.ink} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M66 52 Q100 46 140 54" stroke={C.ink} strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="100" cy="30" r="4" fill={C.glow} stroke={C.ink} strokeWidth="2" />
        </g>
      )}

      {/* Scout field journal */}
      {stage === "scout" && (
        <g transform="rotate(-10 62 132)">
          <rect x="46" y="118" width="30" height="34" rx="4" fill={C.belly} stroke={C.ink} strokeWidth="3" />
          <path d="M52 128 H70 M52 135 H66 M52 142 H69" stroke={C.ink} strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
          <path d="M80 116 L76 124" stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {/* Engineer goggles pushed up */}
      {stage === "engineer" && (
        <g>
          <path d="M62 54 Q100 44 138 54" stroke={C.ink} strokeWidth="5" fill="none" />
          <circle cx="84" cy="52" r="11" fill="oklch(0.85 0.06 220)" stroke={C.gear} strokeWidth="5" />
          <circle cx="116" cy="52" r="11" fill="oklch(0.85 0.06 220)" stroke={C.gear} strokeWidth="5" />
          <circle cx="80" cy="48" r="3" fill={C.white} opacity="0.8" />
          <circle cx="112" cy="48" r="3" fill={C.white} opacity="0.8" />
        </g>
      )}
    </svg>
  );
}

function Face({ expression }: { expression: BugleyExpression }) {
  const ink = C.ink;
  const eye = (cx: number, px: number, py: number, r = 6) => (
    <g key={cx}>
      <ellipse cx={cx} cy="80" rx="13" ry="15" fill={C.white} />
      <circle cx={cx + px} cy={80 + py} r={r} fill={ink} />
      <circle cx={cx + px + 2} cy={80 + py - 3} r="2" fill={C.white} />
    </g>
  );
  const s = { stroke: ink, strokeWidth: 4, strokeLinecap: "round" as const, fill: "none" };

  switch (expression) {
    case "happy":
      return (
        <g>
          {eye(82, 1, 2, 7)}
          {eye(118, -1, 2, 7)}
          <path d="M88 104 Q100 114 112 104" {...s} />
        </g>
      );
    case "curious":
      return (
        <g>
          {eye(82, 3, -3)}
          {eye(118, 3, -3)}
          <path d="M108 60 Q118 54 128 60" {...s} strokeWidth={3.5} />
          <ellipse cx="102" cy="107" rx="5" ry="6" fill={ink} />
        </g>
      );
    case "thinking":
      return (
        <g>
          {eye(82, -3, -5)}
          {eye(118, -3, -5)}
          <path d="M92 106 Q100 103 110 108" {...s} />
          <circle cx="150" cy="50" r="4" fill={ink} opacity="0.5" />
          <circle cx="160" cy="38" r="6" fill={ink} opacity="0.5" />
        </g>
      );
    case "sleepy":
      return (
        <g>
          <path d="M70 82 Q82 90 94 82" {...s} />
          <path d="M106 82 Q118 90 130 82" {...s} />
          <path d="M96 106 Q100 109 104 106" {...s} />
          <text x="140" y="46" fontFamily="var(--font-display)" fontWeight="800" fontSize="20" fill={ink} opacity="0.6">z</text>
          <text x="154" y="30" fontFamily="var(--font-display)" fontWeight="800" fontSize="14" fill={ink} opacity="0.45">z</text>
        </g>
      );
    case "celebrating":
      return (
        <g>
          <path d="M70 84 Q82 70 94 84" {...s} />
          <path d="M106 84 Q118 70 130 84" {...s} />
          <path d="M86 100 Q100 122 114 100 Z" fill={ink} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M94 108 Q100 114 106 108" fill="oklch(0.7 0.15 20)" />
          {[
            [40, 40],
            [162, 60],
            [150, 22],
          ].map(([x, y]) => (
            <path key={`${x}`} d={`M${x} ${y - 8} L${x + 2} ${y - 2} L${x + 8} ${y} L${x + 2} ${y + 2} L${x} ${y + 8} L${x - 2} ${y + 2} L${x - 8} ${y} L${x - 2} ${y - 2} Z`} fill={C.glow} stroke={ink} strokeWidth="2" />
          ))}
        </g>
      );
    case "oops":
      return (
        <g>
          {eye(82, 0, 0, 4)}
          {eye(118, 0, 0, 4)}
          <path d="M88 108 Q94 102 100 108 Q106 114 112 108" {...s} />
          <path d="M140 56 Q146 66 140 70 Q134 66 140 56 Z" fill="oklch(0.85 0.06 230)" stroke={ink} strokeWidth="2" />
        </g>
      );
  }
}
