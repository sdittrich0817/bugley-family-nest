import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Flag, Play, Plus, RotateCcw, Star, Trash2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bugley } from '@/components/brand/Bugley';
import { ACT_LABEL, BUGLEY_RULES, COND_LABEL, OUTCOME_LINE, RACE_TRACKS, RACE_UNLOCK, RULE_LEVELS, runRules, rulesStars, type Act, type Cond, type Grid, type Rule, type RunResult, type Step } from '@/lib/maze-rules';
import { readProgress, recordBest, unlockLevel, updateProgress } from '@/lib/arcade';
import space from '@/assets/games/cosmic-maze.jpg';

type Band = 'sprouts' | 'explorers' | 'builders';
type Stage = NonNullable<React.ComponentProps<typeof Bugley>['stage']>;
type Props = { childId: string; band: Band; stage: Stage; onExit?: (() => void) | undefined };
type Pick = { kind: 'world'; index: number } | { kind: 'race'; index: number };

export function CosmicMaze({ childId, band, stage, onExit }: Props) {
  const [unlocked, setUnlocked] = useState(0);
  const [pick, setPick] = useState<Pick | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  useEffect(() => { setUnlocked(readProgress(childId).level.cosmic_maze ?? 0); }, [childId]);
  const raceOpen = unlocked >= RACE_UNLOCK;

  if (!pick) return <div className="space-y-5">
    <div className="flex items-center gap-3 rounded-lg border-2 border-border bg-card p-4">
      <Bugley stage={stage} expression="curious" glow size={72} />
      <div><p className="font-display text-xl">You’re the rocket’s programmer!</p><p className="text-sm text-muted-foreground">Give the rocket rules like “If there’s a path ahead, go forward.” Then press Go and watch it follow your rules exactly.</p></div>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{RULE_LEVELS.map((l, i) => <Button key={l.name} variant={i <= unlocked ? 'primary' : 'outline'} disabled={i > unlocked} className="h-24 flex-col text-lg" onClick={() => setPick({ kind: 'world', index: i })}><span>{i + 1}</span><span className="text-sm">{i > unlocked ? '🔒 ' : ''}{l.name}</span></Button>)}</div>
    <div className="rounded-lg border-2 border-dashed border-border p-4">
      <p className="font-display text-lg"><Trophy className="mr-1 inline size-5" />Race Bugley</p>
      <p className="mb-3 text-sm text-muted-foreground">{raceOpen ? 'Your rules vs. Bugley’s rules on the same maze. Fewest steps wins!' : `Finish ${RACE_UNLOCK} worlds to unlock racing Bugley.`}</p>
      <div className="flex flex-wrap gap-2">{RACE_TRACKS.map((_, i) => <Button key={i} variant="outline" disabled={!raceOpen} onClick={() => setPick({ kind: 'race', index: i })}>{raceOpen ? '' : '🔒 '}Track {i + 1}</Button>)}</div>
    </div>
  </div>;

  const menu = () => setPick(null);
  if (pick.kind === 'race') return <RulesRun key={`r${pick.index}`} mode="race" grid={RACE_TRACKS[pick.index]!} title={`Race track ${pick.index + 1}`} goal="Beat Bugley to the portal! He hugs the LEFT wall. Can your rules find a quicker way?" tip="Try different rule orders. The same maze can be fast for one set of rules and slow for another." maxRules={4} band={band} stage={stage} rules={rules} setRules={setRules} onMenu={menu} onExit={onExit} />;
  const level = RULE_LEVELS[pick.index]!;
  return <RulesRun key={`w${pick.index}`} mode="world" grid={level.grid} title={`World ${pick.index + 1}: ${level.name}`} goal={level.goal} tip={level.tip} maxRules={level.maxRules} band={band} stage={stage} rules={rules} setRules={setRules} onMenu={menu} onExit={onExit}
    onWin={(run, count) => { const stars = rulesStars(level, run, count); setUnlocked((u) => Math.max(u, pick.index + 1)); updateProgress(childId, (p) => unlockLevel(recordBest(p, 'cosmic_maze', pick.index * 3 + stars), 'cosmic_maze', pick.index + 1)); return stars; }}
    onNext={pick.index + 1 < RULE_LEVELS.length ? () => setPick({ kind: 'world', index: pick.index + 1 }) : undefined} />;
}

type RunProps = { mode: 'world' | 'race'; grid: Grid; title: string; goal: string; tip: string; maxRules: number; band: Band; stage: Stage; rules: Rule[]; setRules: (r: Rule[]) => void; onMenu: () => void; onExit?: (() => void) | undefined; onWin?: (run: RunResult, count: number) => number; onNext?: (() => void) | undefined };

function RulesRun({ mode, grid, title, goal, tip, maxRules, band, stage, rules: allRules, setRules, onMenu, onExit, onWin, onNext }: RunProps) {
  const rules = allRules.slice(0, maxRules);
  const [run, setRun] = useState<{ me: RunResult; bug?: RunResult | undefined } | null>(null);
  const [tick, setTick] = useState(0);
  const [stars, setStars] = useState<number | null>(null);
  const [showTip, setShowTip] = useState(false);
  const speed = band === 'sprouts' ? 480 : band === 'explorers' ? 380 : 300;
  const total = run ? Math.max(run.me.steps.length, run.bug?.steps.length ?? 0) : 0;
  const done = run !== null && tick >= total;

  useEffect(() => { if (!run || tick >= total) return; const t = setTimeout(() => setTick((n) => n + 1), speed); return () => clearTimeout(t); }, [run, tick, total, speed]);
  useEffect(() => { if (done && run && mode === 'world' && run.me.result === 'portal' && stars === null && onWin) setStars(onWin(run.me, rules.length)); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = () => { if (!rules.length) return; setStars(null); setTick(0); setRun({ me: runRules(grid, rules), bug: mode === 'race' ? runRules(grid, BUGLEY_RULES) : undefined }); };
  const edit = () => { setRun(null); setTick(0); setStars(null); };
  const update = (i: number, r: Partial<Rule>) => { edit(); setRules(rules.map((x, j) => (j === i ? { ...x, ...r } : x))); };
  const moveRule = (i: number, by: number) => { const j = i + by; if (j < 0 || j >= rules.length) return; const next = [...rules]; [next[i], next[j]] = [next[j]!, next[i]!]; edit(); setRules(next); };

  const myStep = run && tick > 0 ? run.me.steps[Math.min(tick, run.me.steps.length) - 1] : undefined;
  const bugStep = run?.bug && tick > 0 ? run.bug.steps[Math.min(tick, run.bug.steps.length) - 1] : undefined;
  const gotGems = run ? run.me.steps.slice(0, tick).flatMap((s) => (s.gem !== undefined ? [s.gem] : [])) : [];
  const firing = run && tick > 0 && tick <= run.me.steps.length ? myStep?.rule : undefined;

  const thought = !run ? (rules.length ? 'Ready when you are! Press Go.' : 'I don’t have any rules yet. Add one so I know what to do!')
    : !done ? (myStep ? `Rule ${myStep.rule + 1} fits: ${ruleShort(rules[myStep.rule]!)}` : 'Checking my rules from the top…')
    : run.me.result === 'portal' ? (mode === 'race' ? raceLine(run) : 'Portal reached! I only did what your rules told me.')
    : OUTCOME_LINE[run.me.result];

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="font-display text-lg">{title}</p><p className="text-sm text-muted-foreground">{goal}</p></div>
      <div className="flex gap-2"><Button size="sm" variant="ghost" onClick={onMenu}>Worlds</Button>{onExit && <Button size="sm" variant="ghost" onClick={onExit}>All games</Button>}</div>
    </div>
    <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
      <div className="relative overflow-hidden rounded-lg border-2 border-border">
        <img src={space} width={1280} height={960} alt="" className="absolute inset-0 size-full object-cover" />
        <Board grid={grid} me={myStep} bug={mode === 'race' ? bugStep ?? null : undefined} got={gotGems} />
        {mode === 'world' && <p className="absolute left-2 top-2 rounded-full bg-card/90 px-2 py-0.5 text-sm font-bold">💎 {gotGems.length}/{grid.gems.length}</p>}
      </div>
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-lg bg-card p-3 shadow-sm" aria-live="polite">
          <Bugley stage={stage} expression={!run ? 'curious' : !done ? 'thinking' : run.me.result === 'portal' ? 'celebrating' : 'oops'} glow size={56} />
          <div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Rocket brain</p><p className="font-display">{thought}</p></div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-bold">My rules <span className="font-normal text-muted-foreground">(the rocket checks from the top, every step)</span></p>
          {rules.map((r, i) => <RuleCard key={i} rule={r} index={i} firing={firing === i} isFirst={i === 0} isLast={i === rules.length - 1}
            onChange={(patch) => update(i, patch)} onMove={(by) => moveRule(i, by)} onRemove={() => { edit(); setRules(rules.filter((_, j) => j !== i)); }} />)}
          {rules.length < maxRules ? <div className="space-y-1.5">
            <p className="text-xs font-bold text-muted-foreground">Tap to add a rule ({rules.length}/{maxRules})</p>
            <div className="grid grid-cols-2 gap-1.5">{RULE_CHOICES.map((c) => <button key={c.if} type="button" onClick={() => { edit(); setRules([...rules, { if: c.if, then: c.then }]); }}
              className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border bg-card px-2.5 py-2 text-left text-sm font-bold transition-colors hover:border-primary hover:bg-primary/10">
              <span className="text-xl">{c.emoji}</span><span>{c.title}</span>
            </button>)}</div>
          </div>
            : <p className="text-xs text-muted-foreground">This world allows {maxRules} rule{maxRules > 1 ? 's' : ''}.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" disabled={!rules.length || (run !== null && !done)} onClick={go}><Play />{run ? 'Go again' : 'Go!'}</Button>
          {run && <Button size="lg" variant="outline" onClick={edit}><RotateCcw />Reset</Button>}
          <Button size="lg" variant="ghost" onClick={() => setShowTip((s) => !s)}>Help me think</Button>
        </div>
        {showTip && <p className="rounded-lg bg-muted p-3 text-sm">💡 {tip}</p>}
      </div>
    </div>
    {done && run && <div className="step-enter rounded-lg border-2 border-primary bg-card p-4 text-center">
      {mode === 'world' && run.me.result === 'portal' ? <>
        <p className="font-display text-2xl">Portal reached!</p>
        <p className="my-1 flex justify-center gap-1">{[1, 2, 3].map((n) => <Star key={n} className={`size-8 ${stars !== null && n <= stars ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />)}</p>
        <p className="text-sm text-muted-foreground">{run.me.gems.length < grid.gems.length ? 'Some gems were missed. Can different rules grab them?' : 'Every gem collected!'}</p>
      </> : mode === 'race' ? <p className="font-display text-2xl">{raceTitle(run)}</p> : <p className="font-display text-xl">Let’s fix the rules!</p>}
      <p className="mx-auto mt-2 max-w-md text-sm">🤖 <b>AI secret:</b> Computers and AI follow their instructions exactly, super fast. If the rules are wrong, they’re wrong too. People write the rules!</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {run.me.result !== 'portal' && <Button onClick={edit}>Fix my rules</Button>}
        {mode === 'world' && run.me.result === 'portal' && onNext && <Button onClick={onNext}><Flag />Next world</Button>}
        <Button variant="outline" onClick={go}><RotateCcw />{mode === 'race' ? 'Race again' : 'Play again'}</Button>
        <Button variant="outline" onClick={onMenu}>Worlds</Button>
        {onExit && <Button variant="ghost" onClick={onExit}>All games</Button>}
      </div>
    </div>}
  </div>;
}

function raceTitle(run: { me: RunResult; bug?: RunResult | undefined }) {
  const mine = run.me.result === 'portal' ? run.me.steps.length : Infinity, his = run.bug?.result === 'portal' ? run.bug.steps.length : Infinity;
  return mine < his ? '🏆 You beat Bugley!' : mine === his && mine !== Infinity ? 'It’s a tie!' : 'Bugley wins this time!';
}
function raceLine(run: { me: RunResult; bug?: RunResult | undefined }) {
  const his = run.bug?.steps.length ?? 0;
  return `Your rules took ${run.me.steps.length} steps. Mine took ${his}. Same maze, different rules, different results!`;
}

const ROT = { N: 0, E: 90, S: 180, W: 270 } as const;

function Board({ grid, me, bug, got }: { grid: Grid; me?: Step | undefined; bug?: Step | null | undefined; got: number[] }) {
  const S = 10, x = (c: number) => (c % grid.w) * S, y = (c: number) => Math.floor(c / grid.w) * S;
  const ship = (p: { at: number; dir: keyof typeof ROT }, fill: string, key: string) => <g key={key} style={{ transform: `translate(${x(p.at) + 5}px, ${y(p.at) + 5}px)`, transition: 'transform 220ms ease-out' }}>
    <g style={{ transform: `rotate(${ROT[p.dir]}deg)`, transition: 'transform 220ms ease-out' }}><g className="arcade-bob">
      <path d="M-1.5,2.6 L0,5 L1.5,2.6Z" fill="var(--play-coral)" className="animate-pulse" />
      <path d="M0,-4 C2.4,-2 2.4,1 1.8,2.8 L-1.8,2.8 C-2.4,1 -2.4,-2 0,-4Z" fill={fill} stroke="var(--lab-ink)" strokeWidth={0.45} />
      <circle cy={-0.6} r={1} fill="var(--accent)" stroke="var(--lab-ink)" strokeWidth={0.35} />
      <path d="M-1.8,1.2 L-3,3 L-1.6,2.8Z M1.8,1.2 L3,3 L1.6,2.8Z" fill="var(--primary)" stroke="var(--lab-ink)" strokeWidth={0.3} />
    </g></g>
  </g>;
  const startPose = { at: grid.start, dir: 'E' as const };
  return <svg viewBox={`0 0 ${grid.w * S} ${grid.h * S}`} role="img" aria-label="Space maze with your rocket and the glowing portal" className="relative mx-auto block max-h-[55vh] w-full">
    {grid.walls.map((w, c) => <rect key={c} x={x(c) + 0.3} y={y(c) + 0.3} width={S - 0.6} height={S - 0.6} rx={2} fill={w ? 'var(--maze-wall)' : 'var(--maze-floor)'} opacity={w ? 0.9 : 0.85} />)}
    <g transform={`translate(${x(grid.portal) + 5} ${y(grid.portal) + 5})`}><circle r={4.2} fill="var(--maze-portal)" opacity={0.35} className="animate-pulse" /><circle r={2.8} fill="none" stroke="var(--maze-portal)" strokeWidth={1} /><circle r={1.2} fill="var(--card)" /></g>
    {grid.gems.filter((g) => !got.includes(g)).map((g) => <path key={g} transform={`translate(${x(g) + 5} ${y(g) + 5})`} d="M0,-3 L2.4,0 L0,3 L-2.4,0Z" fill="var(--maze-gem)" stroke="var(--card)" strokeWidth={0.4} />)}
    {bug !== undefined && ship(bug ?? startPose, 'var(--muted)', 'bug')}
    {ship(me ?? startPose, 'var(--card)', 'me')}
  </svg>;
}
