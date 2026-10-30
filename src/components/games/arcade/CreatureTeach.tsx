import { useMemo, useState } from 'react';
import { ArrowLeft, Check, RotateCcw, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bugley } from '@/components/brand/Bugley';
import { CreatureArt } from './CreatureLab';
import { COLOR_NAME, SLOT_WORD, clueScores, learn, labStars, phrase, predictWith, truthFor, type Clue, type Example, type Lab, type SecretRule, type Side } from '@/lib/creature-teach';
import type { Creature } from '@/lib/creatures';
import { cn } from '@/lib/utils';

type Stage = NonNullable<React.ComponentProps<typeof Bugley>['stage']>;
type Phase = 'pick' | 'intro' | 'sort' | 'think' | 'test' | 'result' | 'done';
type Judge = { bugley: Side; truth: Side; childSaid: boolean | null };

function Steps({ at }: { at: number }) {
  const s = ['You teach', 'Bugley learns', 'Catch mistakes'];
  return <ol className="flex flex-wrap justify-center gap-2 text-xs font-bold">{s.map((t, i) => <li key={t} className={cn('rounded-full border-2 px-3 py-1', i === at ? 'border-primary bg-primary text-primary-foreground' : i < at ? 'border-primary/40 bg-card' : 'border-border bg-card text-muted-foreground')}>{i + 1} {t}</li>)}</ol>;
}

function Habitat({ lab, side, items, onTap, glow, disabled }: { lab: Lab; side: Side; items: Creature[]; onTap?: () => void; glow?: boolean; disabled?: boolean }) {
  const h = lab.habitats[side];
  return <button type="button" onClick={onTap} disabled={disabled || !onTap} aria-label={`Send to ${h.name}`}
    className={cn('lab-habitat relative flex min-h-36 flex-col rounded-2xl border-4 p-2 text-left transition', h.tone, onTap && !disabled ? 'cursor-pointer hover:-translate-y-1 active:scale-95' : 'cursor-default', glow ? 'border-primary ring-4 ring-primary/50' : 'border-card/70')}>
    <span className="font-display text-lg drop-shadow-sm">{h.emoji} {h.name}</span>
    <span className="mt-1 flex flex-wrap gap-0.5">{items.map((c, i) => <span key={i} className="lab-land"><CreatureArt c={c} size={46} /></span>)}</span>
  </button>;
}

function Brain({ clue, scores }: { clue: Clue; scores: { slot: string; acc: number }[] }) {
  return <div className="rounded-2xl border-2 border-primary/40 bg-card p-3">
    <p className="font-display text-sm">🧠 Inside Bugley’s brain</p>
    <p className="text-xs text-muted-foreground">How well each clue matched your sorting:</p>
    <ul className="mt-2 space-y-1">{scores.map((s) => <li key={s.slot} className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-2 text-xs">
      <span className={cn('font-bold', s.slot === clue.slot && 'text-primary-foreground rounded bg-primary px-1')}>{SLOT_WORD[s.slot as keyof typeof SLOT_WORD]}</span>
      <span className="h-3 overflow-hidden rounded-full bg-muted"><span className="doodle-bar block h-full rounded-full bg-primary" style={{ width: `${Math.round(s.acc * 100)}%` }} /></span>
      <span className="text-right tabular-nums">{Math.round(s.acc * 100)}%</span></li>)}</ul>
  </div>;
}

const why = (clue: Clue, lab: Lab) => `If it ${phrase(clue.slot, clue.value)} → ${lab.habitats[clue.side].name}. Otherwise → ${lab.habitats[1 - clue.side as Side].name}.`;

export function TeachLab({ lab, index, stage, onBack, onExit, onNext, onWin }: { lab: Lab; index: number; stage: Stage; onBack: () => void; onExit?: (() => void) | undefined; onNext?: (() => void) | undefined; onWin: (stars: number) => void }) {
  const [phase, setPhase] = useState<Phase>(lab.choose ? 'pick' : 'intro');
  const [rule, setRule] = useState<SecretRule | undefined>();
  const truth = useMemo(() => truthFor(lab, rule), [lab, rule]);
  const [queue, setQueue] = useState<Creature[]>(lab.train);
  const [examples, setExamples] = useState<Example[]>([]);
  const [shake, setShake] = useState(0), [hint, setHint] = useState<string | null>(null);
  const [usedExtras, setUsedExtras] = useState(false);
  const [ti, setTi] = useState(0), [judges, setJudges] = useState<Judge[]>([]);
  const [caught, setCaught] = useState(0), [judged, setJudged] = useState(0), [stars, setStars] = useState(0);
  const clue = useMemo(() => learn(examples), [examples]);
  const scores = useMemo(() => clueScores(examples), [examples]);
  const current = queue[0];

  function sort(side: Side) {
    if (!current) return;
    if (truth(current) !== side) { setShake((n) => n + 1); setHint(lab.choose ? 'Check your secret rule!' : 'Hmm — read the mission again!'); return; }
    setHint(null);
    const next = [...examples, { c: current, side }];
    setExamples(next); setQueue(queue.slice(1));
    if (queue.length === 1) setTimeout(() => setPhase('think'), 450);
  }
  function startTest() { setTi(0); setJudges(lab.tests.map((c) => ({ bugley: predictWith(clue, c), truth: truth(c), childSaid: null }))); setPhase('test'); }
  function judge(saysRight: boolean) {
    const j = judges[ti]!; const ok = (j.bugley === j.truth) === saysRight;
    setJudges(judges.map((x, i) => (i === ti ? { ...x, childSaid: saysRight } : x)));
    setJudged((n) => n + 1); if (ok) setCaught((n) => n + 1);
  }
  function nextTest() {
    if (ti + 1 < judges.length) { setTi(ti + 1); return; }
    const right = judges.filter((j) => j.bugley === j.truth).length;
    if (right === judges.length) { const s = labStars(caught, judged); setStars(s); onWin(s); setPhase('done'); } else setPhase('result');
  }
  function teachMore() { setUsedExtras(true); setQueue(lab.extras); setPhase('sort'); }
  function restart() { setPhase(lab.choose ? 'pick' : 'intro'); setRule(undefined); setQueue(lab.train); setExamples([]); setUsedExtras(false); setCaught(0); setJudged(0); setHint(null); }

  const sorted = (s: Side) => examples.filter((e) => e.side === s).map((e) => e.c);
  const j = judges[ti];
  const step = phase === 'think' ? 1 : phase === 'test' || phase === 'result' || phase === 'done' ? 2 : 0;
  const mood = phase === 'done' ? 'celebrating' : phase === 'result' ? 'oops' : phase === 'think' ? 'thinking' : 'curious';
  const say = phase === 'pick' ? 'Shh… pick a secret rule. I promise not to peek!'
    : phase === 'intro' ? lab.mission
    : phase === 'sort' ? (usedExtras ? 'These ones are tricky. Show me where they go!' : lab.choose ? `Sort by your secret: ${rule?.label.toLowerCase()}. I’m watching…` : 'Tap the home where this creature lives.')
    : phase === 'think' ? (clue.acc === 1 ? `I found a clue! ${why(clue, lab)}` : `My best clue only works ${Math.round(clue.acc * 100)}% of the time…`)
    : phase === 'test' ? (j?.childSaid == null ? `I think it goes to the ${lab.habitats[j?.bugley ?? 0].name}, because ${lab.tests[ti]![clue.slot] === clue.value ? `it ${phrase(clue.slot, clue.value)}` : `my clue is “${phrase(clue.slot, clue.value)}” and this one doesn’t`}. Am I right?` : (j.bugley === j.truth ? 'Yes! I got it right.' : `Oops! It really goes in the ${lab.habitats[j.truth].name}.`))
    : phase === 'result' ? (clue.slot === 'color' ? `Oh no! I thought ${COLOR_NAME[clue.value]} was the clue, because ALL your ${lab.habitats[clue.side].name} examples were ${COLOR_NAME[clue.value]}. Teach me with more examples?` : 'I got some wrong. Can you teach me more?')
    : lab.choose ? `Your secret was: ${rule?.label}! I worked it out just from your sorting.` : 'I learned it! Thanks for teaching me.';

  return <div className={cn('lab-world space-y-3 rounded-3xl p-3 sm:p-4', lab.habitats[0].tone + '-world')}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button size="sm" variant="outline" onClick={onBack}><ArrowLeft />Labs</Button>
      <p className="font-display text-lg">{lab.emoji} Lab {index + 1}: {lab.title}</p>
      {onExit ? <Button size="sm" variant="ghost" onClick={onExit}>All games</Button> : <span />}
    </div>
    <Steps at={step} />
    <div className="flex items-start gap-2">
      <div className="arcade-bob shrink-0"><Bugley stage={stage} expression={mood} glow size={72} /></div>
      <p key={say} className="step-enter flex-1 rounded-2xl rounded-tl-none border-2 border-border bg-card p-3 font-display text-base leading-snug">{say}</p>
    </div>

    {phase === 'pick' && rule === undefined && <div className="grid gap-2 sm:grid-cols-3">{lab.choose!.map((r) => <button key={r.id} type="button" onClick={() => { setRule(r); setPhase('sort'); }} className="rounded-2xl border-4 border-border bg-card p-4 text-center transition hover:-translate-y-1 hover:border-primary active:scale-95"><span className="block text-4xl">{r.emoji}</span><span className="font-display">{r.label}</span><span className="block text-xs text-muted-foreground">go in the Secret Club</span></button>)}</div>}
    {phase === 'intro' && <Button size="lg" className="w-full" onClick={() => setPhase('sort')}>Start teaching!</Button>}

    {phase === 'sort' && current && <>
      <div className="flex flex-col items-center">
        <div key={`${queue.length}-${shake}`} className={cn('rounded-full bg-card/80 p-2 shadow-soft', shake ? 'lab-shake' : 'play-pop')}><CreatureArt c={current} size={150} /></div>
        <p className="text-xs font-bold">{queue.length} left to sort</p>
        {hint && <p className="text-sm font-bold text-destructive">{hint}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2"><Habitat lab={lab} side={0} items={sorted(0)} onTap={() => sort(0)} /><Habitat lab={lab} side={1} items={sorted(1)} onTap={() => sort(1)} /></div>
    </>}

    {phase === 'think' && <div className="space-y-3 step-enter">
      <Brain clue={clue} scores={scores} />
      <div className="rounded-2xl border-2 border-dashed border-primary bg-card p-3 text-center"><p className="text-xs font-bold text-muted-foreground">BUGLEY’S RULE</p><p className="font-display text-lg">{why(clue, lab)}</p></div>
      <Button size="lg" className="w-full" onClick={startTest}>Test Bugley on new creatures →</Button>
    </div>}

    {phase === 'test' && j && <div className="space-y-3">
      <div className="flex items-center justify-center gap-3">
        <div key={ti} className="play-pop rounded-full bg-card/80 p-2 shadow-soft"><CreatureArt c={lab.tests[ti]!} size={140} /></div>
        <div className="rounded-2xl bg-card p-3 text-center shadow-soft"><p className="text-xs font-bold text-muted-foreground">BUGLEY SAYS</p><p className="font-display text-lg">{lab.habitats[j.bugley].emoji} {lab.habitats[j.bugley].name}</p></div>
      </div>
      {j.childSaid == null
        ? <div className="grid grid-cols-2 gap-2"><Button size="lg" onClick={() => judge(true)}><Check />He’s right!</Button><Button size="lg" variant="outline" onClick={() => judge(false)}><X />Oops, wrong!</Button></div>
        : <div className="space-y-2 text-center step-enter"><p className="font-display text-lg">{(j.bugley === j.truth) === j.childSaid ? '🎯 Great catch, AI checker!' : '👀 Look again — ' + (j.bugley === j.truth ? 'he was actually right.' : 'he was wrong!')}</p><Button size="lg" className="w-full" onClick={nextTest}>{ti + 1 < judges.length ? 'Next creature →' : 'See how Bugley did'}</Button></div>}
      <p className="text-center text-xs font-bold">{ti + 1} of {judges.length}</p>
    </div>}

    {phase === 'result' && <div className="space-y-3 step-enter">
      <div className="flex justify-center gap-1">{judges.map((x, i) => <span key={i} className={cn('rounded-full p-1', x.bugley === x.truth ? 'bg-play-mint' : 'bg-destructive/20')}><CreatureArt c={lab.tests[i]!} size={48} /></span>)}</div>
      <p className="text-center font-display">Bugley got {judges.filter((x) => x.bugley === x.truth).length} of {judges.length} right.</p>
      {!usedExtras && lab.extras.length > 0 ? <Button size="lg" className="w-full" onClick={teachMore}>Teach Bugley more examples</Button> : <Button size="lg" className="w-full" onClick={restart}><RotateCcw />Try the lab again</Button>}
    </div>}

    {phase === 'done' && <div className="lab-win space-y-3 rounded-2xl bg-card p-4 text-center step-enter">
      <div className="flex justify-center gap-1">{[1, 2, 3].map((n) => <Star key={n} className={cn('size-9', n <= stars ? 'fill-primary text-primary' : 'text-muted')} />)}</div>
      <p className="text-sm">You caught {caught} of {judged} of Bugley’s answers correctly.</p>
      <p className="rounded-xl bg-accent p-3 text-sm"><strong>💡 AI secret:</strong> {lab.secret}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {onNext && <Button size="lg" onClick={onNext}>Next lab →</Button>}
        <Button variant="outline" onClick={restart}><RotateCcw />Play again</Button>
        <Button variant="outline" onClick={onBack}>Labs</Button>
        {onExit && <Button variant="ghost" onClick={onExit}>All games</Button>}
      </div>
    </div>}
  </div>;
}
