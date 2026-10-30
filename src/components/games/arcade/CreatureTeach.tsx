import { useMemo, useState } from 'react';
import { Check, RotateCcw, Star, ThumbsDown, ThumbsUp, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bugley } from '@/components/brand/Bugley';
import { CreatureArt } from './CreatureLab';
import { CLUE_EMOJI, COLOR_NAME, SECRET_RULES, STREAK_GOAL, isGlowbug, judgeStars, learn, phrase, predictWith, quizDeck, teachDeck, type Example, type SecretRule } from '@/lib/creature-teach';
import { cn } from '@/lib/utils';

type Stage = NonNullable<React.ComponentProps<typeof Bugley>['stage']>;
type Phase = 'pick' | 'teach' | 'quiz' | 'done';

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?'’]/gu, ''));
  u.rate = 0.95; u.pitch = 1.2; window.speechSynthesis.speak(u);
}

function Steps({ at }: { at: number }) {
  return <ol className="flex justify-center gap-2 text-xs font-bold">{['Pick', 'Teach', 'Test'].map((t, i) => <li key={t} className={cn('rounded-full border-2 px-3 py-1', i === at ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground')}>{i + 1} {t}</li>)}</ol>;
}

/** Glow jar: fills one light per correct guess in a row. */
function Jar({ n }: { n: number }) {
  return <div className="flex items-center gap-2" aria-label={`${n} of ${STREAK_GOAL} right in a row`}>
    <span className="text-2xl">🫙</span>
    <div className="flex gap-1">{Array.from({ length: STREAK_GOAL }, (_, i) => <span key={i} className={cn('size-5 rounded-full border-2 transition-all duration-500', i < n ? 'scale-110 border-primary bg-primary shadow-glow' : 'border-border bg-muted')} />)}</div>
  </div>;
}

/** Teach Bugley what a Glowbug is: the child picks the rule, shows examples, then checks Bugley. */
export function TeachLab({ stage, onExit, onWin }: { stage: Stage; onExit?: (() => void) | undefined; onWin: (stars: number) => void }) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [rule, setRule] = useState<SecretRule>(SECRET_RULES[0]!);
  const [ti, setTi] = useState(0), [examples, setExamples] = useState<Example[]>([]);
  const [qi, setQi] = useState(0), [streak, setStreak] = useState(0), [mistakes, setMistakes] = useState(0);
  const [react, setReact] = useState<null | 'right' | 'oops' | 'look'>(null), [wiggle, setWiggle] = useState(0);
  const teach = useMemo(() => teachDeck(rule), [rule]), quiz = useMemo(() => quizDeck(rule), [rule]);
  const clue = useMemo(() => learn(examples), [examples]);
  const card = phase === 'teach' ? teach[ti] : quiz[qi % quiz.length];
  const guess = card ? predictWith(clue, card) : 0;
  const clueWord = clue.slot === 'color' ? `${COLOR_NAME[clue.value]} color` : phrase(clue.slot, clue.value).replace(/^(has|is) (an? )?/, '');

  function pick(r: SecretRule) { setRule(r); setTi(0); setExamples([]); setQi(0); setStreak(0); setMistakes(0); setReact(null); setPhase('teach'); }
  function show(side: 0 | 1) {
    if (!card) return;
    if (isGlowbug(rule, card) !== side) { setWiggle((w) => w + 1); setReact('look'); return; }
    setReact(null);
    setExamples((e) => [...e, { c: card, side }]);
    if (ti + 1 >= teach.length) setPhase('quiz'); else setTi(ti + 1);
  }
  function check(saysRight: boolean) {
    if (!card || react === 'right' || react === 'oops') return;
    const right = guess === isGlowbug(rule, card);
    if (saysRight !== right) { setMistakes((m) => m + 1); setWiggle((w) => w + 1); setReact('look'); return; }
    if (right) { const s = streak + 1; setStreak(s); setReact('right'); if (s >= STREAK_GOAL) { setTimeout(() => { setPhase('done'); onWin(judgeStars(mistakes)); }, 700); } }
    else { setStreak(0); setReact('oops'); }
  }
  function next() {
    if (react === 'oops' && card) setExamples((e) => [...e, { c: card, side: isGlowbug(rule, card) }]);
    setReact(null); setQi(qi + 1);
  }

  const mood = phase === 'done' || react === 'right' ? 'celebrating' : react === 'oops' ? 'oops' : phase === 'quiz' ? 'thinking' : 'curious';
  const say = phase === 'pick' ? 'You get to decide what a Glowbug is! Pick your secret.'
    : phase === 'teach' ? (react === 'look' ? `Hmm, look again! Is it one of your ${rule.label.toLowerCase()}?` : 'Show me! Is this a Glowbug?')
    : phase === 'quiz' ? (react === 'right' ? 'Yay! I got it!'
      : react === 'oops' ? (clue.slot === 'color' ? `Oops! You only showed me ${COLOR_NAME[clue.value]} Glowbugs, so I thought ${COLOR_NAME[clue.value]} mattered!` : 'Oops! Thanks, now I know more.')
      : react === 'look' ? 'Are you sure? Look at the bug again!'
      : guess === 0 ? 'I think it IS a Glowbug! Am I right?' : 'I think it is NOT a Glowbug. Am I right?')
    : 'You taught me! I learned from your examples.';

  return <div className="space-y-4">
    <Steps at={phase === 'pick' ? 0 : phase === 'teach' ? 1 : 2} />
    <div className="flex items-center gap-3">
      <div className={cn('shrink-0', phase === 'done' ? 'animate-bounce' : 'arcade-bob')}><Bugley stage={stage} expression={mood} glow size={96} /></div>
      <p key={say} className="step-enter flex-1 rounded-3xl rounded-tl-none border-2 border-border bg-card p-3 font-display text-lg leading-snug">{say}</p>
      <Button size="icon" variant="outline" aria-label="Hear Bugley" onClick={() => speak(say)}><Volume2 /></Button>
    </div>

    {phase === 'pick' && <div className="grid gap-3 sm:grid-cols-3">{SECRET_RULES.map((r) => <button key={r.id} type="button" onClick={() => pick(r)} className="rounded-3xl border-4 border-border bg-card p-5 text-center transition hover:-translate-y-1 hover:border-primary active:scale-95">
      <span className="block text-5xl">{r.emoji}</span><span className="mt-2 block font-display text-lg">{r.label}</span><span className="text-xs text-muted-foreground">are Glowbugs</span>
    </button>)}</div>}

    {(phase === 'teach' || phase === 'quiz') && card && <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-card px-3 py-2 text-sm font-bold">
        <span>✨ Glowbugs = {rule.emoji} {rule.label}</span>
        {phase === 'teach' ? <span>{ti + 1} of {teach.length}</span> : <Jar n={streak} />}
      </div>
      <div key={`${phase}-${phase === 'teach' ? ti : qi}-${wiggle}`} className={cn('relative mx-auto flex w-fit justify-center rounded-3xl bg-play-mint p-3 step-enter', react === 'look' && 'ring-4 ring-destructive')}>
        <CreatureArt c={card} size={220} />
        {phase === 'quiz' && <span className="absolute -top-3 right-0 rounded-full border-2 border-border bg-card px-3 py-1 font-display text-lg shadow-soft">{guess === 0 ? '👍 Glowbug?' : '👎 Not one?'}</span>}
      </div>
      {phase === 'quiz' && <p className="text-center text-sm font-bold">🧠 Bugley looks for: <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">{CLUE_EMOJI[clue.slot]} {clueWord}</span></p>}
      {phase === 'teach' && <div className="grid grid-cols-2 gap-3">
        <Button size="lg" className="h-20 text-xl" onClick={() => show(0)}><ThumbsUp className="size-7" />Glowbug!</Button>
        <Button size="lg" variant="outline" className="h-20 text-xl" onClick={() => show(1)}><ThumbsDown className="size-7" />Not one</Button>
      </div>}
      {phase === 'quiz' && (react === 'right' || react === 'oops'
        ? <Button size="lg" className="h-16 w-full text-xl" onClick={next}>{react === 'oops' ? 'Teach him this one →' : 'Next bug →'}</Button>
        : <div className="grid grid-cols-2 gap-3">
          <Button size="lg" className="h-20 text-xl" onClick={() => check(true)}><Check className="size-7" />Right!</Button>
          <Button size="lg" variant="outline" className="h-20 text-xl" onClick={() => check(false)}><X className="size-7" />Wrong!</Button>
        </div>)}
      {examples.length > 0 && <div className="flex flex-wrap justify-center gap-1" aria-label="What you taught Bugley">{examples.map((e, i) => <span key={i} className={cn('rounded-xl border-2 p-0.5', e.side === 0 ? 'border-primary bg-primary/20' : 'border-border bg-muted')}><CreatureArt c={e.c} size={36} /></span>)}</div>}
    </>}

    {phase === 'done' && <div className="lab-win space-y-3 rounded-3xl bg-card p-5 text-center step-enter">
      <p className="text-4xl">✨🎉🪲🎉✨</p>
      <p className="font-display text-2xl">Firefly party! 5 in a row!</p>
      <div className="flex justify-center gap-1">{[1, 2, 3].map((n) => <Star key={n} className={cn('size-9', n <= judgeStars(mistakes) ? 'fill-primary text-primary' : 'text-muted')} />)}</div>
      <p className="rounded-xl bg-accent p-3 text-sm"><strong>💡 AI secret:</strong> AI only knows what its examples show it. When all your Glowbugs were the same color, Bugley thought color mattered. More different examples made him smarter!</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="lg" onClick={() => setPhase('pick')}><RotateCcw />Play again</Button>
        {onExit && <Button size="lg" variant="outline" onClick={onExit}>All games</Button>}
      </div>
    </div>}
  </div>;
}
