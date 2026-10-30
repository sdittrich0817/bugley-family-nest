import { useState } from 'react';
import { RotateCcw, Star, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bugley } from '@/components/brand/Bugley';
import { SCENES, TEST_COUNT, deal, guess, packStars, type Example, type Item, type Scene } from '@/lib/pack-teach';
import { cn } from '@/lib/utils';

type Stage = NonNullable<React.ComponentProps<typeof Bugley>['stage']>;
type Phase = 'pick' | 'teach' | 'test' | 'done';

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?'’]/gu, ''));
  u.rate = 0.95; u.pitch = 1.2; window.speechSynthesis.speak(u);
}

function Steps({ at }: { at: number }) {
  return <ol className="flex justify-center gap-2 text-xs font-bold">{['Pick a day', 'Show Bugley', 'Bugley tries'].map((t, i) => <li key={t} className={cn('rounded-full border-2 px-3 py-1', i === at ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground')}>{i + 1} {t}</li>)}</ol>;
}

/** Teach Bugley your choices for an everyday job (lunch, baseball, beach, bedtime), then see if he copies you. */
export function TeachLab({ stage, onExit, onWin }: { stage: Stage; onExit?: (() => void) | undefined; onWin: (stars: number) => void }) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [scene, setScene] = useState<Scene>(SCENES[0]!);
  const [deck, setDeck] = useState<{ teach: Item[]; test: Item[] }>({ teach: [], test: [] });
  const [n, setN] = useState(0), [examples, setExamples] = useState<Example[]>([]);
  const [right, setRight] = useState(0), [result, setResult] = useState<null | boolean>(null);

  const card = phase === 'teach' ? deck.teach[n] : phase === 'test' ? deck.test[n] : undefined;
  const g = card && phase === 'test' ? guess(examples, card) : null;
  const packed = examples.filter((e) => e.yes);

  function pick(s: Scene) { setScene(s); setDeck(deal(s)); setN(0); setExamples([]); setRight(0); setResult(null); setPhase('teach'); }
  function show(yes: boolean) {
    if (!card) return;
    setExamples((e) => [...e, { item: card, yes }]);
    if (n + 1 >= deck.teach.length) { setN(0); setPhase('test'); } else setN(n + 1);
  }
  function answer(yes: boolean) {
    if (!card || !g || result !== null) return;
    const ok = g.yes === yes;
    setResult(ok); if (ok) setRight((r) => r + 1);
    setExamples((e) => [...e, { item: card, yes }]);
  }
  function next() {
    setResult(null);
    if (n + 1 >= deck.test.length) { setPhase('done'); onWin(packStars(right)); } else setN(n + 1);
  }

  const reason = g?.because ? `${g.clue === 'kind' ? `It's a ${card!.kind} like` : `It's ${card!.color} like`} the ${g.because.item.name} ${g.because.item.emoji} you said ${g.yes ? scene.yes : scene.no}` : 'I am just guessing!';
  const mood = phase === 'done' || result === true ? 'celebrating' : result === false ? 'oops' : phase === 'test' ? 'thinking' : 'curious';
  const say = phase === 'pick' ? 'Where are we going today? Pick one!'
    : phase === 'teach' ? (n === 0 ? scene.story : 'And this one?')
    : phase === 'test' ? (result === true ? 'Yay! I copied you right!' : result === false ? "Oops! Now I know. I'll remember that!" : `I think: ${g?.yes ? scene.yes : scene.no} ${reason}.`)
    : `I got ${right} of ${TEST_COUNT} right, just from your examples!`;

  return <div className="space-y-4">
    <Steps at={phase === 'pick' ? 0 : phase === 'teach' ? 1 : 2} />
    <div className="flex items-center gap-3">
      <div className={cn('shrink-0', phase === 'done' ? 'animate-bounce' : 'arcade-bob')}><Bugley stage={stage} expression={mood} glow size={96} /></div>
      <p key={say} className="step-enter flex-1 rounded-3xl rounded-tl-none border-2 border-border bg-card p-3 font-display text-lg leading-snug">{say}</p>
      <Button size="icon" variant="outline" aria-label="Hear Bugley" onClick={() => speak(say)}><Volume2 /></Button>
    </div>

    {phase === 'pick' && <div className="grid grid-cols-2 gap-3">{SCENES.map((s) => <button key={s.id} type="button" onClick={() => pick(s)} className="rounded-3xl border-4 border-border bg-card p-5 text-center transition hover:-translate-y-1 hover:border-primary active:scale-95">
      <span className="block text-6xl">{s.emoji}</span><span className="mt-2 block font-display text-xl">{s.title}</span>
    </button>)}</div>}

    {card && <>
      <div className="flex items-center justify-between rounded-2xl bg-card px-3 py-2 text-sm font-bold">
        <span>{scene.emoji} {scene.title}</span>
        <span>{phase === 'teach' ? `Show me ${n + 1} of ${deck.teach.length}` : `Bugley's try ${n + 1} of ${deck.test.length} · ⭐ ${right}`}</span>
      </div>
      <div key={`${phase}-${n}`} className={cn('relative mx-auto flex w-fit flex-col items-center rounded-3xl bg-play-mint px-10 py-5 step-enter', result === true && 'ring-4 ring-primary', result === false && 'ring-4 ring-destructive')}>
        <span className="text-8xl leading-none">{card.emoji}</span>
        <span className="mt-2 font-display text-2xl capitalize">{card.name}</span>
        {g && <span className="absolute -top-3 -right-4 rounded-full border-2 border-border bg-card px-3 py-1 font-display text-lg shadow-soft">🤔 {g.yes ? scene.yesEmoji : scene.noEmoji}?</span>}
      </div>
      {phase === 'test' && result === null && <p className="text-center text-sm font-bold">Now YOU tell Bugley the real answer:</p>}
      {(phase === 'teach' || result === null) && <div className="grid grid-cols-2 gap-3">
        <Button size="lg" className="h-20 text-xl" onClick={() => phase === 'teach' ? show(true) : answer(true)}><span className="text-3xl">{scene.yesEmoji}</span>{scene.yes}</Button>
        <Button size="lg" variant="outline" className="h-20 text-xl" onClick={() => phase === 'teach' ? show(false) : answer(false)}><span className="text-3xl">{scene.noEmoji}</span>{scene.no}</Button>
      </div>}
      {phase === 'test' && result !== null && <Button size="lg" className="h-16 w-full text-xl" onClick={next}>Next →</Button>}
      {packed.length > 0 && <div className="rounded-2xl border-2 border-dashed border-border p-2 text-center" aria-label={`Bugley's ${scene.bag}`}>
        <span className="mr-2 text-2xl">{scene.bag}</span>{packed.map((e, i) => <span key={i} className="text-2xl">{e.item.emoji}</span>)}
      </div>}
    </>}

    {phase === 'done' && <div className="lab-win space-y-3 rounded-3xl bg-card p-5 text-center step-enter">
      <p className="text-5xl">{scene.bag}🎉</p>
      <p className="font-display text-2xl">All packed! {packed.map((e) => e.item.emoji).join('')}</p>
      <div className="flex justify-center gap-1">{[1, 2, 3].map((k) => <Star key={k} className={cn('size-9', k <= packStars(right) ? 'fill-primary text-primary' : 'text-muted')} />)}</div>
      <p className="rounded-xl bg-accent p-3 text-sm"><strong>💡 AI secret:</strong> Bugley only knows what you showed him. He copies things that look alike, like the same color or the same kind. Show him more, and he gets smarter!</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="lg" onClick={() => setPhase('pick')}><RotateCcw />Play again</Button>
        {onExit && <Button size="lg" variant="outline" onClick={onExit}>All games</Button>}
      </div>
    </div>}
  </div>;
}
