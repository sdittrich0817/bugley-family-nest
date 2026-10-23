import { useId } from "react";
import { BUG_COLORS, type BugConfig } from "@/lib/bug-avatar";

// Bold-cartoon bug portraits drawn in code (fixed parts only, so every avatar is safe and identical everywhere).
const OUT = "#1B2238";
const SW = 3.5;
const line = { stroke: OUT, strokeWidth: SW, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function BodyShape({ kind, fill }: { kind: BugConfig["kind"]; fill: string }) {
  const p = { fill, ...line };
  switch (kind) {
    case "ladybug": return <circle cx="60" cy="86" r="29" {...p} />;
    case "bee": return <ellipse cx="60" cy="87" rx="24" ry="27" {...p} />;
    case "dragonfly": return <rect x="51" y="58" width="18" height="56" rx="9" {...p} />;
    case "butterfly": return <ellipse cx="60" cy="88" rx="9" ry="25" {...p} />;
    case "ant": return <ellipse cx="60" cy="98" rx="21" ry="16" {...p} />;
    case "mantis": return <ellipse cx="60" cy="92" rx="13" ry="24" {...p} />;
    case "spider": return <circle cx="60" cy="88" r="25" {...p} />;
    default: return <ellipse cx="60" cy="87" rx="30" ry="26" {...p} />;
  }
}

export function BugAvatar({ bug, className = "size-16", label }: { bug: BugConfig; className?: string; label?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const body = BUG_COLORS[bug.body], accent = BUG_COLORS[bug.accent];
  const mantis = bug.kind === "mantis";
  const eyeY = mantis ? 40 : 44, dx = mantis ? 15 : 9, mY = mantis ? 52 : 56;
  const wing = { fill: "#FFFFFF", fillOpacity: 0.85, ...line };
  return <svg viewBox="0 0 120 120" className={className} role="img" aria-label={label ?? `${bug.body} ${bug.kind} avatar`}>
    <defs><clipPath id={`b${id}`}><BodyShape kind={bug.kind} fill="#000" /></clipPath></defs>
    <circle cx="60" cy="60" r="57" fill={accent} fillOpacity={0.28} stroke={OUT} strokeWidth="3" />
    {bug.extra === "cape" && <path d="M40 58 L20 112 Q60 120 100 112 L80 58Z" fill={accent} {...line} />}
    {/* wings and legs */}
    {bug.kind === "bee" && <><ellipse cx="34" cy="68" rx="15" ry="10" transform="rotate(-25 34 68)" {...wing} /><ellipse cx="86" cy="68" rx="15" ry="10" transform="rotate(25 86 68)" {...wing} /></>}
    {bug.kind === "dragonfly" && <><ellipse cx="30" cy="70" rx="24" ry="7" transform="rotate(-8 30 70)" {...wing} /><ellipse cx="90" cy="70" rx="24" ry="7" transform="rotate(8 90 70)" {...wing} /><ellipse cx="32" cy="84" rx="20" ry="6" transform="rotate(10 32 84)" {...wing} /><ellipse cx="88" cy="84" rx="20" ry="6" transform="rotate(-10 88 84)" {...wing} /></>}
    {bug.kind === "butterfly" && <><ellipse cx="33" cy="74" rx="25" ry="19" fill={accent} {...line} /><ellipse cx="87" cy="74" rx="25" ry="19" fill={accent} {...line} /><ellipse cx="40" cy="99" rx="17" ry="13" fill={accent} {...line} /><ellipse cx="80" cy="99" rx="17" ry="13" fill={accent} {...line} /><circle cx="31" cy="73" r="6" fill={body} {...line} /><circle cx="89" cy="73" r="6" fill={body} {...line} /></>}
    {bug.kind === "spider" && <g fill="none" {...line}>{[66, 78, 90, 102].map((y, i) => <g key={y}><path d={`M40 ${y - 6} Q${22 - i} ${y - 18} ${8 + i * 2} ${y + 2}`} /><path d={`M80 ${y - 6} Q${98 + i} ${y - 18} ${112 - i * 2} ${y + 2}`} /></g>)}</g>}
    {["beetle", "ladybug", "bee", "ant"].includes(bug.kind) && <g {...line}><path d="M33 84 L20 92 M33 96 L22 108 M87 84 L100 92 M87 96 L98 108" /></g>}
    {bug.kind === "ant" && <circle cx="60" cy="74" r="10" fill={body} {...line} />}
    <BodyShape kind={bug.kind} fill={body} />
    <g clipPath={`url(#b${id})`} fill={accent}>
      {bug.pattern === "spots" && [[47, 78, 6], [73, 80, 6], [54, 98, 5], [70, 101, 5], [60, 88, 3.5], [40, 94, 4], [80, 93, 4]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} stroke={OUT} strokeWidth="2" />)}
      {bug.pattern === "stripes" && [74, 88, 102].map((y) => <rect key={y} x="0" y={y} width="120" height="7" />)}
      {bug.pattern === "zigzag" && <path d="M20 84 L30 76 L40 84 L50 76 L60 84 L70 76 L80 84 L90 76 L100 84 M20 102 L30 94 L40 102 L50 94 L60 102 L70 94 L80 102 L90 94 L100 102" fill="none" stroke={accent} strokeWidth="5" strokeLinejoin="round" />}
    </g>
    <BodyShape kind={bug.kind} fill="none" />
    {(bug.kind === "beetle" || bug.kind === "ladybug") && <path d="M60 62 L60 114" {...line} />}
    {mantis && <g fill={body} {...line}><path d="M50 72 L34 60 L30 78" fill="none" /><path d="M70 72 L86 60 L90 78" fill="none" /></g>}
    {/* antennae (behind head) */}
    {bug.antennae === "bobble" && <g {...line} fill="none"><path d="M52 28 L42 9 M68 28 L78 9" /><circle cx="42" cy="9" r="4.5" fill={accent} /><circle cx="78" cy="9" r="4.5" fill={accent} /></g>}
    {bug.antennae === "curly" && <path d="M52 28 Q46 8 34 12 Q28 20 38 20 M68 28 Q74 8 86 12 Q92 20 82 20" fill="none" {...line} />}
    {bug.antennae === "zap" && <path d="M52 28 L45 20 L53 16 L44 5 M68 28 L75 20 L67 16 L76 5" fill="none" {...line} />}
    {bug.antennae === "horn" && <path d="M53 28 Q60 0 67 28Z" fill={accent} {...line} />}
    {/* head */}
    {mantis ? <path d="M34 32 Q60 26 86 32 L62 66 Q60 68 58 66Z" fill={body} {...line} /> : <circle cx="60" cy="46" r="21" fill={body} {...line} />}
    {/* eyes */}
    {(bug.eyes === "big" || bug.eyes === "fierce" || bug.eyes === "cheeky") && [-1, 1].map((s) => bug.eyes === "cheeky" && s === 1
      ? <path key={s} d={`M${60 + dx - 6} ${eyeY} Q${60 + dx} ${eyeY - 6} ${60 + dx + 6} ${eyeY}`} fill="none" {...line} />
      : <g key={s}><circle cx={60 + s * dx} cy={eyeY} r="7" fill="#FFFFFF" {...line} strokeWidth="3" /><circle cx={60 + s * dx + s * 1} cy={eyeY + 1} r="3.6" fill={OUT} /><circle cx={60 + s * dx + 2} cy={eyeY - 1.5} r="1.3" fill="#FFFFFF" /></g>)}
    {bug.eyes === "fierce" && <path d={`M${60 - dx - 8} ${eyeY - 12} L${60 - dx + 6} ${eyeY - 7} M${60 + dx + 8} ${eyeY - 12} L${60 + dx - 6} ${eyeY - 7}`} {...line} strokeWidth="4" />}
    {bug.eyes === "shades" && <g><rect x={60 - dx - 9} y={eyeY - 6} width="16" height="11" rx="4" fill={OUT} /><rect x={60 + dx - 7} y={eyeY - 6} width="16" height="11" rx="4" fill={OUT} /><path d={`M${60 - dx + 7} ${eyeY - 3} L${60 + dx - 7} ${eyeY - 3}`} {...line} strokeWidth="3" /><path d={`M${60 - dx - 5} ${eyeY - 3} l5 0 M${60 + dx - 3} ${eyeY - 3} l5 0`} stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" /></g>}
    {bug.eyes === "visor" && <g><rect x={60 - dx - 11} y={eyeY - 6} width={2 * dx + 22} height="12" rx="6" fill="#5ED1F2" {...line} strokeWidth="3" /><path d={`M${60 - dx - 4} ${eyeY - 1} l10 0`} stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" /></g>}
    {/* mouth */}
    {bug.mouth === "grin" && <path d={`M51 ${mY} Q60 ${mY + 9} 69 ${mY}`} fill="none" {...line} />}
    {bug.mouth === "smirk" && <path d={`M52 ${mY + 2} Q62 ${mY + 5} 68 ${mY - 2}`} fill="none" {...line} />}
    {bug.mouth === "fangs" && <g><path d={`M51 ${mY} Q60 ${mY + 7} 69 ${mY}`} fill="none" {...line} /><path d={`M54 ${mY + 2} l2 5 l2 -4 M62 ${mY + 2} l2 5 l2 -5`} fill="#FFFFFF" stroke={OUT} strokeWidth="2" strokeLinejoin="round" /></g>}
    {bug.mouth === "open" && <ellipse cx="60" cy={mY + 2} rx="6" ry="5" fill={OUT} />}
    {/* top extras */}
    {bug.extra === "headphones" && <g><path d={`M37 ${eyeY + 2} A23 23 0 0 1 83 ${eyeY + 2}`} fill="none" stroke={OUT} strokeWidth="5" strokeLinecap="round" /><rect x="30" y={eyeY - 6} width="10" height="16" rx="4" fill={accent} {...line} strokeWidth="3" /><rect x="80" y={eyeY - 6} width="10" height="16" rx="4" fill={accent} {...line} strokeWidth="3" /></g>}
    {bug.extra === "cap" && <g fill={accent} {...line}><path d="M40 36 Q60 12 80 36Z" /><path d="M78 33 L94 30 Q95 36 80 37Z" /></g>}
    {bug.extra === "crown" && <path d="M46 28 L46 14 L53 21 L60 10 L67 21 L74 14 L74 28Z" fill={BUG_COLORS.gold} {...line} />}
  </svg>;
}
