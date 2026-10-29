import { useEffect, useState } from 'react';
import { Dices, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bugley } from '@/components/brand/Bugley';
import { speak } from '@/components/studio/Sidekick';
import { PARTS, SECRETS, SLOT_LABEL, creatureName, randomCreature, secretFor, type Creature, type Slot } from '@/lib/creatures';
import { addFound, readProgress, recordBest, updateProgress } from '@/lib/arcade';
import { cn } from '@/lib/utils';

const ink = 'var(--lab-ink)';
export function CreatureArt({ c, size = 260, className }: { c: Creature; size?: number; className?: string }) {
  const fill = `var(--lab-${c.color})`, id = `pat-${c.pattern}-${c.color}`;
  const body = { round: <ellipse cx={100} cy={120} rx={52} ry={48} />, tall: <rect x={60} y={70} width={80} height={100} rx={38} />, long: <ellipse cx={100} cy={128} rx={74} ry={36} />, blob: <path d="M50,160 C30,110 60,70 100,72 C150,70 175,120 152,162 C140,176 120,168 100,172 C78,176 60,176 50,160Z" /> }[c.body];
  const headY = c.body === 'tall' ? 58 : c.body === 'long' ? 92 : 78;
  return <svg viewBox="0 0 200 200" width={size} height={size} className={className} role="img" aria-label={creatureName(c)}>
    <defs><pattern id={id} width={20} height={20} patternUnits="userSpaceOnUse">
      {c.pattern === 'spots' && <circle cx={10} cy={10} r={4} fill={ink} opacity={0.25} />}
      {c.pattern === 'stripes' && <rect width={7} height={20} fill={ink} opacity={0.2} />}
      {c.pattern === 'stars' && <path d="M10,3 L12,8 L17,8 L13,11 L15,16 L10,13 L5,16 L7,11 L3,8 L8,8Z" fill="var(--card)" opacity={0.8} />}
    </pattern></defs>
    <ellipse cx={100} cy={186} rx={60} ry={8} fill={ink} opacity={0.12} />
    {/* wings behind body */}
    <g fill={fill} stroke={ink} strokeWidth={3} strokeLinejoin="round" opacity={0.95}>
      {c.wings === 'feather' && <><path d="M58,110 C20,90 10,120 22,140 C36,132 46,130 60,130Z" /><path d="M142,110 C180,90 190,120 178,140 C164,132 154,130 140,130Z" /></>}
      {c.wings === 'butterfly' && <><path d="M64,104 C20,60 6,110 30,124 C10,140 40,164 66,132Z" /><path d="M136,104 C180,60 194,110 170,124 C190,140 160,164 134,132Z" /></>}
      {c.wings === 'bat' && <><path d="M62,104 L14,84 L24,104 L8,112 L26,122 L18,138 L60,128Z" /><path d="M138,104 L186,84 L176,104 L192,112 L174,122 L182,138 L140,128Z" /></>}
    </g>
    {/* tail */}
    <g fill={fill} stroke={ink} strokeWidth={3} strokeLinejoin="round">
      {c.tail === 'fish' && <path d="M150,140 C168,138 176,128 188,116 C186,136 188,150 192,166 C178,156 168,150 150,152Z" />}
      {c.tail === 'dragon' && <path d="M148,146 C176,150 182,132 176,118 L190,112 L184,130 C190,160 170,166 146,158Z" />}
      {c.tail === 'fluffy' && <circle cx={160} cy={150} r={18} />}
    </g>
    <g fill={fill} stroke={ink} strokeWidth={3.5}>{body}</g>
    <g fill={`url(#${id})`}>{body}</g>
    {/* feet */}
    <g fill={fill} stroke={ink} strokeWidth={3}><ellipse cx={80} cy={172} rx={13} ry={8} /><ellipse cx={120} cy={172} rx={13} ry={8} /></g>
    {/* head bits */}
    <g fill={fill} stroke={ink} strokeWidth={3} strokeLinejoin="round">
      {c.head === 'ears' && <><path d={`M70,${headY + 10} L66,${headY - 26} L90,${headY}Z`} /><path d={`M130,${headY + 10} L134,${headY - 26} L110,${headY}Z`} /></>}
      {c.head === 'horns' && <><path d={`M76,${headY + 4} C66,${headY - 20} 74,${headY - 32} 80,${headY - 34} C80,${headY - 18} 88,${headY - 4} 88,${headY}Z`} fill="var(--card)" /><path d={`M124,${headY + 4} C134,${headY - 20} 126,${headY - 32} 120,${headY - 34} C120,${headY - 18} 112,${headY - 4} 112,${headY}Z`} fill="var(--card)" /></>}
      {c.head === 'antennae' && <><path d={`M88,${headY + 2} C84,${headY - 20} 76,${headY - 26} 70,${headY - 30}`} fill="none" /><path d={`M112,${headY + 2} C116,${headY - 20} 124,${headY - 26} 130,${headY - 30}`} fill="none" /><circle cx={70} cy={headY - 32} r={6} fill="var(--primary)" /><circle cx={130} cy={headY - 32} r={6} fill="var(--primary)" /></>}
    </g>
    {/* face */}
    <g transform={`translate(0 ${headY - 78})`}>
      <circle cx={84} cy={108} r={12} fill="var(--card)" stroke={ink} strokeWidth={3} /><circle cx={116} cy={108} r={12} fill="var(--card)" stroke={ink} strokeWidth={3} />
      <circle cx={87} cy={110} r={5.5} fill={ink} /><circle cx={119} cy={110} r={5.5} fill={ink} /><circle cx={89} cy={108} r={1.8} fill="var(--card)" /><circle cx={121} cy={108} r={1.8} fill="var(--card)" />
      {c.head === 'beak' ? <path d="M92,124 L108,124 L100,138Z" fill="var(--primary)" stroke={ink} strokeWidth={3} strokeLinejoin="round" /> : <path d="M90,128 Q100,138 110,128" fill="none" stroke={ink} strokeWidth={3.5} strokeLinecap="round" />}
      <circle cx={72} cy={126} r={5} fill="var(--play-coral)" opacity={0.45} /><circle cx={128} cy={126} r={5} fill="var(--play-coral)" opacity={0.45} />
    </g>
  </svg>;
}

const START: Creature = { body: 'round', head: 'ears', wings: 'none', tail: 'none', pattern: 'plain', color: '2' };
export function CreatureLab({ childId, stage, band }: { childId: string; stage: NonNullable<React.ComponentProps<typeof Bugley>['stage']>; band: string }) {
  const [c, setC] = useState<Creature>(START), [found, setFound] = useState<string[]>([]), [pop, setPop] = useState(0), [news, setNews] = useState<string | null>(null), [slot, setSlot] = useState<Slot>('head');
  useEffect(() => { setFound(readProgress(childId).found); }, [childId]);
  function change(next: Creature) {
    setC(next); setPop((p) => p + 1);
    const s = secretFor(next);
    if (s && !found.includes(s.name)) {
      const p = updateProgress(childId, (q) => recordBest(addFound(q, s.name), 'creature_lab_v2', q.found.length + 1));
      setFound(p.found); setNews(s.name); if (band === 'sprouts') speak(`You discovered ${s.name}!`);
    } else setNews(null);
  }
  const next = SECRETS.find((s) => !found.includes(s.name));
  return <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
    <div className="relative flex flex-col items-center justify-center rounded-lg border-2 border-border bg-play-mint p-4">
      <div key={pop} className="play-pop"><CreatureArt c={c} className="arcade-bob max-w-full" /></div>
      <p className="font-display text-2xl">{creatureName(c)}</p>
      {news && <div className="absolute inset-x-3 top-3 flex items-center gap-2 rounded-lg bg-card p-2 shadow-soft step-enter"><Bugley stage={stage} expression="celebrating" glow size={44} /><p className="font-display">Secret creature! <strong>{news}</strong></p></div>}
      <p className="mt-1 text-sm">⭐ {found.length}/{SECRETS.length} secret creatures</p>
      {next && <p className="mt-1 text-center text-xs text-muted-foreground"><Sparkles className="inline size-3" /> Bugley’s hint: {next.hint}</p>}
    </div>
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">{(Object.keys(PARTS) as Slot[]).map((s) => <Button key={s} size="sm" variant={slot === s ? 'primary' : 'outline'} onClick={() => setSlot(s)}>{SLOT_LABEL[s]}</Button>)}</div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{(PARTS[slot] as readonly string[]).map((v) => { const opt = { ...c, [slot]: v } as Creature; return <button key={v} type="button" aria-pressed={c[slot] === v} aria-label={`${SLOT_LABEL[slot]} ${v}`} onClick={() => change(opt)} className={cn('rounded-lg border-2 bg-card p-1 transition active:scale-95', c[slot] === v ? 'border-primary ring-2 ring-primary' : 'border-border')}><CreatureArt c={opt} size={80} className="mx-auto" /><span className="block text-xs capitalize">{slot === 'color' ? '' : v}</span></button>; })}</div>
      <Button size="lg" className="w-full" onClick={() => change(randomCreature())}><Dices />Surprise mix!</Button>
      {found.length > 0 && <div><p className="text-sm font-bold">My discoveries</p><div className="flex flex-wrap gap-1">{found.map((f) => <span key={f} className="rounded-full bg-accent px-2 py-1 text-xs">{f}</span>)}</div></div>}
    </div>
  </div>;
}
