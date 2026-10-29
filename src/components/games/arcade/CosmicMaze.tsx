import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bugley } from '@/components/brand/Bugley';
import { MAZE_WORLDS, OPEN, mazeLevel, mazeStars, move, type Dir } from '@/lib/maze';
import { readProgress, recordBest, unlockLevel, updateProgress } from '@/lib/arcade';
import space from '@/assets/games/cosmic-maze.jpg';

type Band = 'sprouts' | 'explorers' | 'builders';
const KEYS: Record<string, Dir> = { ArrowUp: 'N', w: 'N', ArrowDown: 'S', s: 'S', ArrowLeft: 'W', a: 'W', ArrowRight: 'E', d: 'E' };

export function CosmicMaze({ childId, band, stage }: { childId: string; band: Band; stage: React.ComponentProps<typeof Bugley>['stage'] }) {
  const [unlocked, setUnlocked] = useState(0);
  const [index, setIndex] = useState<number | null>(null);
  useEffect(() => { setUnlocked(readProgress(childId).level.cosmic_maze ?? 0); }, [childId]);
  if (index === null) return <div className="space-y-4">
    <p className="font-display text-xl">Pick a world. Find the glowing portal!</p>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{MAZE_WORLDS.map((name, i) => <Button key={name} variant={i <= unlocked ? 'primary' : 'outline'} disabled={i > unlocked} className="h-24 flex-col text-lg" onClick={() => setIndex(i)}><span>{i + 1}</span><span className="text-sm">{i > unlocked ? '🔒 ' : ''}{name}</span></Button>)}</div>
  </div>;
  return <MazeRun key={index} childId={childId} band={band} stage={stage} index={index} onNext={() => { setUnlocked((u) => Math.max(u, index + 1)); setIndex(index + 1 < MAZE_WORLDS.length ? index + 1 : null); }} onMenu={() => setIndex(null)} />;
}

function MazeRun({ childId, band, stage, index, onNext, onMenu }: { childId: string; band: Band; stage: React.ComponentProps<typeof Bugley>['stage']; index: number; onNext: () => void; onMenu: () => void }) {
  const level = useMemo(() => mazeLevel(index, band), [index, band]);
  const [at, setAt] = useState(0), [moves, setMoves] = useState(0), [got, setGot] = useState<number[]>([]), [bump, setBump] = useState(0), [burst, setBurst] = useState<number | null>(null), [won, setWon] = useState<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const go = useCallback((d: Dir) => {
    if (won !== null) return;
    setAt((cur) => {
      const next = move(level, cur, d);
      if (next === cur) { setBump((b) => b + 1); return cur; }
      setMoves((m) => m + 1);
      if (level.gems.includes(next)) setGot((g) => { if (g.includes(next)) return g; setBurst(next); return [...g, next]; });
      return next;
    });
  }, [level, won]);
  useEffect(() => { if (at === level.exit && won === null) { const stars = mazeStars(level, moves, got.length); setWon(stars); setBurst(at); updateProgress(childId, (p) => unlockLevel(recordBest(p, 'cosmic_maze', index * 3 + stars), 'cosmic_maze', index + 1)); } }, [at, level, moves, got.length, won, childId, index]);
  useEffect(() => { const k = (e: KeyboardEvent) => { const d = KEYS[e.key]; if (d) { e.preventDefault(); go(d); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [go]);
  const S = 10, x = (c: number) => (c % level.w) * S, y = (c: number) => Math.floor(c / level.w) * S;
  const near = (c: number) => Math.abs((c % level.w) - (at % level.w)) + Math.abs(Math.floor(c / level.w) - Math.floor(at / level.w)) <= (band === 'builders' ? 2 : 3);
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-display text-lg">World {index + 1}: {MAZE_WORLDS[index]}</p><div className="flex items-center gap-3 text-sm font-bold"><span>💎 {got.length}/{level.gems.length}</span><span>Moves {moves}</span><Button size="sm" variant="ghost" onClick={onMenu}>Worlds</Button></div></div>
    <div className="relative overflow-hidden rounded-lg border-2 border-border touch-none select-none" onPointerDown={(e) => { start.current = { x: e.clientX, y: e.clientY }; }} onPointerUp={(e) => { const s = start.current; start.current = null; if (!s) return; const dx = e.clientX - s.x, dy = e.clientY - s.y; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : dy > 0 ? 'S' : 'N'); }}>
      <img src={space} width={1280} height={960} alt="" className="absolute inset-0 size-full object-cover" />
      <svg viewBox={`-2 -2 ${level.w * S + 4} ${level.h * S + 4}`} role="img" aria-label={`Maze. ${won !== null ? 'You reached the portal!' : 'Find the glowing portal.'}`} className="relative mx-auto block max-h-[60vh] w-full">
        <rect x={0} y={0} width={level.w * S} height={level.h * S} rx={2} fill="var(--maze-floor)" />
        {level.cells.map((v, c) => <g key={c} stroke="var(--maze-wall)" strokeWidth={1.4} strokeLinecap="round">
          {!(v & OPEN.N) && <line x1={x(c)} y1={y(c)} x2={x(c) + S} y2={y(c)} />}
          {!(v & OPEN.W) && <line x1={x(c)} y1={y(c)} x2={x(c)} y2={y(c) + S} />}
          {c % level.w === level.w - 1 && !(v & OPEN.E) && <line x1={x(c) + S} y1={y(c)} x2={x(c) + S} y2={y(c) + S} />}
          {Math.floor(c / level.w) === level.h - 1 && !(v & OPEN.S) && <line x1={x(c)} y1={y(c) + S} x2={x(c) + S} y2={y(c) + S} />}
        </g>)}
        <g transform={`translate(${x(level.exit) + 5} ${y(level.exit) + 5})`}><circle r={4} fill="var(--maze-portal)" opacity={0.35} className="animate-pulse" /><circle r={2.6} fill="none" stroke="var(--maze-portal)" strokeWidth={1} /><circle r={1.2} fill="var(--card)" /></g>
        {level.gems.filter((g) => !got.includes(g)).map((g) => <g key={g} transform={`translate(${x(g) + 5} ${y(g) + 5})`} opacity={near(g) ? 1 : 0.18}><path d="M0,-3 L2.4,0 L0,3 L-2.4,0Z" fill="var(--maze-gem)" stroke="var(--card)" strokeWidth={0.4} /></g>)}
        {burst !== null && <circle key={`${burst}-${got.length}-${won}`} cx={x(burst) + 5} cy={y(burst) + 5} r={3} fill="none" stroke="var(--primary)" strokeWidth={1} className="arcade-burst" />}
        <g style={{ transform: `translate(${x(at) + 5}px, ${y(at) + 5}px)`, transition: 'transform 140ms ease-out' }}>
          <g key={bump} className={bump ? 'arcade-wiggle' : ''}><g className="arcade-bob">
            <path d="M-1.5,2.6 L0,5 L1.5,2.6Z" fill="var(--play-coral)" className="animate-pulse" />
            <path d="M0,-4 C2.4,-2 2.4,1 1.8,2.8 L-1.8,2.8 C-2.4,1 -2.4,-2 0,-4Z" fill="var(--card)" stroke="var(--lab-ink)" strokeWidth={0.45} />
            <circle cy={-0.6} r={1} fill="var(--accent)" stroke="var(--lab-ink)" strokeWidth={0.35} />
            <path d="M-1.8,1.2 L-3,3 L-1.6,2.8Z M1.8,1.2 L3,3 L1.6,2.8Z" fill="var(--primary)" stroke="var(--lab-ink)" strokeWidth={0.3} />
          </g></g>
        </g>
      </svg>
      {won !== null && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 p-4 text-center step-enter">
        <Bugley stage={stage} expression="celebrating" glow size={90} />
        <p className="font-display text-3xl">Portal reached!</p>
        <p className="flex gap-1">{[1, 2, 3].map((n) => <Star key={n} className={`size-9 ${n <= won ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />)}</p>
        <p className="text-sm">{got.length < level.gems.length ? 'Some gems are still hiding in dead ends!' : 'You found every hidden gem!'}</p>
        <div className="flex gap-2"><Button variant="outline" onClick={() => { setAt(0); setMoves(0); setGot([]); setWon(null); setBurst(null); }}><RotateCcw />Again</Button><Button onClick={onNext}>{index + 1 < MAZE_WORLDS.length ? 'Next world' : 'All worlds'}</Button></div>
      </div>}
    </div>
    <div className="mx-auto grid w-48 grid-cols-3 gap-2" aria-label="Arrow pad">
      <span /><Button size="lg" className="h-14" aria-label="Up" onClick={() => go('N')}><ArrowUp /></Button><span />
      <Button size="lg" className="h-14" aria-label="Left" onClick={() => go('W')}><ArrowLeft /></Button><Button size="lg" className="h-14" aria-label="Down" onClick={() => go('S')}><ArrowDown /></Button><Button size="lg" className="h-14" aria-label="Right" onClick={() => go('E')}><ArrowRight /></Button>
    </div>
  </div>;
}
