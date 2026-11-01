import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Heart, RotateCcw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bugley } from '@/components/brand/Bugley';
import { DIVES, LANES, makeDive, oceanStars, SURE, type Dive, type Wave } from '@/lib/ocean-quest';
import { cn } from '@/lib/utils';
import ocean from '@/assets/games/world-ocean.jpg';
import submarine from '@/assets/games/explorer-sub.png';

type Stage = NonNullable<React.ComponentProps<typeof Bugley>['stage']>;
type Result = { treasure: number; total: number; hearts: number; wrong: number; caught: number };

export function OceanQuest({ stage, band, onExit, onWin }: { stage: Stage; band: string; onExit: () => void; onWin?: (stars: number) => void }) {
  const [dive, setDive] = useState<Dive | null>(null), [result, setResult] = useState<Result | null>(null), [run, setRun] = useState(0);
  if (dive && !result) return <DiveRun key={run} dive={dive} stage={stage} ms={band === 'sprouts' ? 3600 : band === 'builders' ? 2500 : 3000} onDone={(r) => { setResult(r); onWin?.(oceanStars(r.treasure, r.total, r.hearts)); }} />;
  if (dive && result) {
    const stars = oceanStars(result.treasure, result.total, result.hearts);
    const next = DIVES[DIVES.indexOf(dive) + 1];
    return <div className="ocean-world space-y-4 rounded-lg p-5 text-center">
      <Bugley stage={stage} expression={stars ? 'celebrating' : 'oops'} glow size={110} className="mx-auto" />
      <h2 className="text-3xl">{stars ? 'Dive complete!' : 'Out of hearts!'}</h2>
      <p className="flex justify-center gap-1">{[1, 2, 3].map((n) => <Star key={n} className={cn('size-8', n <= stars ? 'fill-primary text-primary' : 'text-muted-foreground')} />)}</p>
      <p className="text-lg font-bold">💎 {result.treasure} of {result.total} treasures</p>
      {result.wrong > 0 && <p className="rounded-lg bg-card p-3">My sonar was wrong <b>{result.wrong}</b> {result.wrong === 1 ? 'time' : 'times'}. You caught <b>{result.caught}</b>!</p>}
      <p className="rounded-lg border-2 border-primary bg-card p-3 text-sm"><b>AI secret:</b> My sonar is a guess-machine. When the water is murky, I’m less sure. A low sure-meter means: look with your own eyes!</p>
      <div className="flex flex-wrap justify-center gap-2">
        {next && stars > 0 && <Button size="lg" onClick={() => { setDive(next); setResult(null); setRun((n) => n + 1); }}>{next.emoji} Next: {next.name}</Button>}
        <Button size="lg" variant="outline" onClick={() => { setResult(null); setRun((n) => n + 1); }}><RotateCcw />Play again</Button>
        <Button size="lg" variant="outline" onClick={() => { setDive(null); setResult(null); }}>Dives</Button>
        <Button size="lg" variant="ghost" onClick={onExit}><ArrowLeft />All games</Button>
      </div>
    </div>;
  }
  return <div className="ocean-world space-y-4 rounded-lg p-5">
    <div className="adventure-panorama"><img src={ocean} width={1536} height={1024} alt="Sunken ruins and a shipwreck beyond a colorful coral reef" /><img src={submarine} width={816} height={816} alt="Your exploration submarine" className="adventure-panorama-sprite" /></div>
    <div className="flex items-center gap-3"><Bugley stage={stage} expression="curious" glow size={96} className="arcade-bob" />
      <div><h2 className="text-3xl">Ocean Quest</h2><p>Steer the sub. Grab treasure 💎, dodge jellyfish 🪼. My sonar tells you what’s coming… but is it always right?</p></div></div>
    <div className="grid gap-3 sm:grid-cols-3">{DIVES.map((d) => <button key={d.key} type="button" onClick={() => { setDive(d); setRun((n) => n + 1); }} className="rounded-lg border-2 border-border bg-card p-4 text-left shadow-soft transition hover:border-primary">
      <span className="text-4xl">{d.emoji}</span><h3 className="mt-1 text-xl">{d.name}</h3><p className="text-sm text-muted-foreground">{d.blurb}</p>
    </button>)}</div>
    <Button variant="ghost" onClick={onExit}><ArrowLeft />All games</Button>
  </div>;
}

function DiveRun({ dive, stage, ms, onDone }: { dive: Dive; stage: Stage; ms: number; onDone: (r: Result) => void }) {
  const [waves] = useState<Wave[]>(() => makeDive(dive));
  const [i, setI] = useState(0), [t, setT] = useState(0), [lane, setLane] = useState(1), [flash, setFlash] = useState<string | null>(null);
  const laneRef = useRef(1), stats = useRef({ treasure: 0, hearts: 3, wrong: 0, caught: 0 });
  laneRef.current = lane;
  const total = waves.filter((w) => w.thing.kind === 'treasure').length;
  const move = (d: number) => setLane((l) => Math.max(0, Math.min(LANES - 1, l + d)));
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); } if (e.key === 'ArrowDown') { e.preventDefault(); move(1); } };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    const w = waves[i]; if (!w) return;
    let raf = 0; const start = performance.now();
    const tick = (now: number) => {
      const p = (now - start) / ms;
      if (p < 1) { setT(p); raf = requestAnimationFrame(tick); return; }
      const s = stats.current, hit = laneRef.current === w.lane;
      if (!w.sonar.right) { s.wrong++; if (hit === (w.thing.kind === 'treasure')) s.caught++; }
      if (hit && w.thing.kind === 'treasure') { s.treasure++; setFlash(`+1 ${w.thing.emoji}`); }
      else if (hit) { s.hearts--; setFlash(`Ouch! ${w.thing.emoji}`); }
      else setFlash(null);
      if (s.hearts <= 0 || i + 1 >= waves.length) onDone({ ...s, total });
      else { setT(0); setI(i + 1); }
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  const w = waves[i]; if (!w) return null;
  const sure = w.sonar.pct >= SURE, showSonar = t > 0.12;
  const laneTop = (l: number) => `${(l + 0.5) * (100 / LANES)}%`;
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2 text-lg font-bold">
      <span>{dive.emoji} {dive.name} · {i + 1}/{waves.length}</span>
      <span className="flex items-center gap-3"><span>💎 {stats.current.treasure}</span><span className="flex">{[0, 1, 2].map((n) => <Heart key={n} className={cn('size-6', n < stats.current.hearts ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />)}</span></span>
    </div>
    <div className="ocean-sea relative aspect-[16/9] w-full overflow-hidden rounded-lg border-4 border-border" style={{ ['--murk' as string]: dive.murk }} onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); setLane(Math.min(LANES - 1, Math.floor(((e.clientY - r.top) / r.height) * LANES))); }}>
      <img src={ocean} width={1536} height={1024} alt="" className="adventure-world" />
      <div className="ocean-murk absolute inset-0" />
      {[12, 30, 55, 72, 88].map((x, n) => <span key={x} className="ocean-bubble absolute bottom-0 size-3 rounded-full" style={{ left: `${x}%`, animationDelay: `${n * 0.7}s` }} />)}
      <div className="ocean-sub absolute left-[3%] -translate-y-1/2 transition-[top] duration-150" style={{ top: laneTop(lane) }} aria-label="Your submarine"><img src={submarine} width={816} height={816} alt="" /><span className="ocean-beam absolute left-full top-1/2 h-8 w-24 -translate-y-1/2" /></div>
      <div className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${100 - t * 84}%`, top: laneTop(w.lane) }}>
        {showSonar && <div className={cn('mb-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold shadow-soft sm:text-sm', w.sonar.label === 'treasure' ? 'bg-play-mint' : 'bg-play-coral', !sure && 'ocean-unsure')}>
          {w.sonar.label === 'treasure' ? '💎 Treasure' : '⚠️ Danger'} · {w.sonar.pct}%{!sure && ' 🤔'}</div>}
        <span className={cn('block text-5xl sm:text-6xl', dive.murk > 0 && t < 0.55 && 'ocean-blur')}>{w.thing.emoji}</span>
      </div>
      {flash && <div key={i} className="story-word absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-card px-3 py-1 font-bold">{flash}</div>}
    </div>
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-2"><Button size="lg" variant="outline" aria-label="Up" onClick={() => move(-1)}><ArrowUp /></Button><Button size="lg" variant="outline" aria-label="Down" onClick={() => move(1)}><ArrowDown /></Button></div>
      <div className="flex flex-1 items-center gap-2 rounded-lg bg-card p-3"><Bugley stage={stage} expression={showSonar && !sure ? 'thinking' : 'curious'} size={56} />
        <p className="text-sm sm:text-base">{!showSonar ? 'Pinging my sonar…' : sure ? `I’m ${w.sonar.pct}% sure it’s ${w.sonar.label}!` : `Hmm, only ${w.sonar.pct}% sure. The water’s murky — look closely!`}</p></div>
    </div>
  </div>;
}
