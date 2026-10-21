import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Older-audience takes on Bugley for older kids (10–12).
 * Same firefly DNA (round head, two antennae, glowing tail) with less "cute":
 * smaller eyes, no cheeks, thinner lines, more attitude.
 */
export const MATURE_STYLES = ["streamlined", "headphones", "monoline", "glyph"] as const;
export type MatureStyle = (typeof MATURE_STYLES)[number];

export function BugleyMature({
  variant = "streamlined",
  size = 160,
  glow = true,
  className,
}: {
  variant?: MatureStyle;
  size?: number | string;
  glow?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const halo = `mh-${uid}`;
  const ink = "var(--dusk)";
  const body = "var(--bugley-body)";
  const g = "var(--glow)";
  const anim = glow ? "bugley-pulse" : "";

  const Halo = (
    <>
      <defs>
        <radialGradient id={halo}>
          <stop offset="0%" stopColor={g} stopOpacity="0.9" />
          <stop offset="50%" stopColor={g} stopOpacity="0.3" />
          <stop offset="100%" stopColor={g} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="128" cy="138" r="62" fill={`url(#${halo})`} className={anim} />
    </>
  );

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`Bugley, ${variant} style`} className={cn("overflow-visible", className)}>
      {Halo}

      {variant === "glyph" && (
        <g>
          <circle cx="128" cy="138" r="22" fill={g} />
          <circle cx="86" cy="94" r="38" fill={body} stroke={ink} strokeWidth="3" />
          <path d="M70 60 L58 30 M102 60 L114 30" stroke={body} strokeWidth="8" strokeLinecap="round" />
          <rect x="68" y="90" width="12" height="6" rx="3" fill={g} />
          <rect x="94" y="90" width="12" height="6" rx="3" fill={g} />
        </g>
      )}

      {variant === "monoline" && (
        <g fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M60 104 Q38 92 44 74" opacity="0.6" />
          <path d="M112 104 Q134 92 128 74" opacity="0.6" />
          <circle cx="128" cy="138" r="22" fill={g} />
          <circle cx="86" cy="92" r="36" />
          <path d="M72 58 Q64 38 54 32 M100 58 Q108 38 118 32" />
          <path d="M70 92 Q76 88 82 92 M92 92 Q98 88 104 92" />
          <path d="M80 108 Q88 112 96 106" />
        </g>
      )}

      {(variant === "streamlined" || variant === "headphones") && (
        <g>
          {/* slim wings */}
          <path d="M54 100 Q20 84 30 60 Q52 66 62 92 Z" fill="var(--bugley-wing)" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
          <path d="M118 100 Q152 84 142 60 Q120 66 110 92 Z" fill="var(--bugley-wing)" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
          {/* glowing tail */}
          <ellipse cx="128" cy="138" rx="22" ry="20" fill={g} stroke={ink} strokeWidth="3.5" transform="rotate(-30 128 138)" />
          {/* head */}
          <ellipse cx="86" cy="92" rx="38" ry="35" fill={body} stroke={ink} strokeWidth="3.5" />
          {/* antennae */}
          <path d="M72 60 Q66 38 52 30 M100 60 Q108 38 122 30" stroke={ink} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <circle cx="52" cy="30" r="4" fill={g} />
          <circle cx="122" cy="30" r="4" fill={g} />
          {/* open, slightly smaller eyes with relaxed brows: confident, not cute */}
          <ellipse cx="73" cy="92" rx="9" ry="10.5" fill="white" />
          <ellipse cx="101" cy="92" rx="9" ry="10.5" fill="white" />
          <circle cx="75" cy="93.5" r="4.6" fill="var(--bugley-pupil)" />
          <circle cx="103" cy="93.5" r="4.6" fill="var(--bugley-pupil)" />
          <circle cx="76.6" cy="91.4" r="1.6" fill="white" />
          <circle cx="104.6" cy="91.4" r="1.6" fill="white" />
          <path d="M65 77 Q73 74 81 77 M93 77 Q101 73 110 76" stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* easy half smile */}
          <path d="M80 111 Q90 116 99 108" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
          {variant === "headphones" && (
            <g>
              <path d="M48 92 Q48 46 86 46 Q124 46 124 92" stroke={ink} strokeWidth="6" fill="none" strokeLinecap="round" />
              <rect x="40" y="82" width="14" height="24" rx="6" fill="var(--bugley-accent)" stroke={ink} strokeWidth="3" />
              <rect x="118" y="82" width="14" height="24" rx="6" fill="var(--bugley-accent)" stroke={ink} strokeWidth="3" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
