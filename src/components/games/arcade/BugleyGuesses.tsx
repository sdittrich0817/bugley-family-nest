import { useEffect, useState } from 'react';
import { ArrowLeft, Brain, Check, HelpCircle, RotateCcw, Sparkles, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bugley } from '@/components/brand/Bugley';
import { THINGS, QUESTIONS, MAX_QUESTIONS, ROUND_MS, narrow, nextQuestion, separatingQuestion, type Answer, type ClueAnswer, type Thing } from '@/lib/guess-garden';
import { useScrollTopOn } from '@/lib/scroll';
import { cn } from '@/lib/utils';
import garden from '@/assets/games/world-guesses.jpg';

type Phase = 'pick' | 'ask' | 'guess' | 'reveal' | 'done';
type Stage = NonNullable<React.ComponentProps<typeof Bugley>['stage']>;
export function BugleyGuesses({ stage, onExit }: { stage: Stage; onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [pool, setPool] = useState(THINGS);
  const [history, setHistory] = useState<ClueAnswer[]>([]);
  const [previous, setPrevious] = useState<Thing[]>([]);
  const [real, setReal] = useState<Thing | null>(null);
  const [correct, setCorrect] = useState(false);
  const [started, setStarted] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const q = nextQuestion(pool, history);
  const guessed = pool[0];
  const last = history.at(-1);
  const lastQuestion = QUESTIONS.find(x => x.id === last?.id);
  const removed = previous.filter(t => !pool.includes(t));
  useScrollTopOn(phase);
  useEffect(() => {
    if (started === null || phase === 'done' || phase === 'pick') return;
    const timer = window.setTimeout(() => { setExpired(true); setPhase('done'); }, Math.max(0, ROUND_MS - (Date.now() - started)));
    return () => window.clearTimeout(timer);
  }, [started, phase]);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);
  function reset() { setPool(THINGS); setHistory([]); setPrevious([]); setReal(null); setCorrect(false); setStarted(null); setExpired(false); setPhase('pick'); }
  function answer(a: Answer) {
    if (!q) return;
    const next = narrow(pool, q.id, a), answers = [...history, {id:q.id,answer:a}];
    setPrevious(pool); setPool(next); setHistory(answers);
    if (next.length <= 1 || answers.length >= MAX_QUESTIONS || !nextQuestion(next,answers)) setPhase('guess');
  }
  const line = phase === 'pick' ? 'Pick one picture in your head. Keep it secret! I’ll try to find it.'
    : phase === 'ask' ? q?.text ?? 'Ready for my guess?'
    : phase === 'guess' ? pool.length === 0 ? 'Oops! None of my pictures fit those answers. What were you thinking of?' : pool.length === 1 ? `My clues point to… ${guessed?.name}! Did I get it?` : `I’m not sure yet. My best guess is ${guessed?.name}. Did I get it?`
    : phase === 'reveal' ? 'You stumped me! Which picture was your secret?'
    : expired ? 'Let’s take a little break! Every answer gave me a clue.' : correct ? 'You helped me find it! I used clues, not mind-reading.' : 'A wrong guess is a chance to learn. Thanks for showing me!';
  function speak() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(line); speech.rate = 0.9; window.speechSynthesis.speak(speech);
  }
  const Tiles = ({choose}: {choose?: (t:Thing)=>void}) => <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-label="Secret pictures">{THINGS.map(t => choose
    ? <Button key={t.name} variant="outline" className="guess-tile h-auto min-h-20 flex-col gap-1 rounded-lg px-1 py-2" onClick={()=>choose(t)}><span className="text-3xl">{t.emoji}</span><span className="whitespace-normal text-center text-xs">{t.name}</span></Button>
    : <div key={t.name} className={cn('guess-tile flex min-h-20 flex-col items-center justify-center rounded-lg border-2 px-1 py-2', phase === 'pick' || pool.includes(t) ? 'border-border bg-card' : 'border-transparent bg-muted opacity-25 grayscale')}><span className="text-3xl" aria-hidden="true">{t.emoji}</span><span className="text-center text-xs font-bold">{t.name}</span></div>)}</div>;
  const missing = real && guessed ? separatingQuestion(guessed,real) : undefined;
  return <div className="space-y-5">
    <section className="relative overflow-hidden guess-world">
      <img src={garden} width={1536} height={1024} alt="A colorful treehouse with a giant telescope and floating discoveries" className="h-52 w-full object-cover sm:h-64" />
      <div className="guess-title absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4"><div><p className="text-xs font-bold">THE GUESSING GARDEN</p><h2 className="mt-1 text-3xl">Bugley Guesses</h2></div><div className="shrink-0 arcade-bob"><Bugley size={112} stage={stage} expression={phase==='done' && correct ? 'celebrating' : 'curious'} glow /></div></div>
    </section>
    <ol className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-bold">{['Keep a secret','Give me clues','Check my guess'].map((step,i)=><li key={step} className={cn('flex items-center gap-2', (phase==='pick'?0:phase==='ask'?1:2)===i?'text-foreground':'text-muted-foreground')}><span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">{i+1}</span>{step}</li>)}</ol>
    <div className="flex items-center gap-3" aria-live="polite"><Brain className="hidden size-8 shrink-0 text-leaf-foreground sm:block"/><p className="flex-1 font-display text-xl leading-snug">{line}</p><Button size="icon" variant="outline" aria-label="Hear Bugley" title="Hear Bugley" onClick={speak}><Volume2/></Button></div>
    {phase==='pick' && <><Tiles/><div className="flex justify-center"><Button size="lg" className="min-h-14 whitespace-normal text-lg" onClick={()=>{setStarted(Date.now());setPhase('ask');}}><Sparkles/>I’ve got my secret!</Button></div></>}
    {phase==='ask' && q && <>
      <div className="guess-question step-enter flex flex-col items-center gap-3 py-6 text-center" key={q.id}><span className="text-6xl" aria-hidden="true">{q.emoji}</span><p className="text-xs font-bold text-muted-foreground">QUESTION {history.length+1} / {MAX_QUESTIONS}</p><h3 className="text-2xl">{q.text}</h3><div className="grid w-full max-w-lg grid-cols-3 gap-2 px-2"><Button size="lg" className="h-16 px-2 text-lg" onClick={()=>answer('yes')}><Check/>Yes</Button><Button size="lg" variant="secondary" className="h-16 px-2 text-lg" onClick={()=>answer('no')}><X/>No</Button><Button size="lg" variant="outline" className="h-16 whitespace-normal px-2" onClick={()=>answer('unsure')}><HelpCircle/>Not sure</Button></div></div>
      <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-lg"><Brain/>Inside Bugley’s brain</h3><span className="font-display text-sm">{THINGS.length} → {pool.length} possibilities</span></div>
        <p className="text-sm text-muted-foreground">{last ? last.answer==='unsure' ? 'Not sure? That’s okay. I kept every picture and will try a different clue.' : `You said ${last.answer}. ${removed.length} ${removed.length===1?'picture doesn’t':'pictures don’t'} fit that clue.` : 'All 30 pictures are possible. Your answers will help me cross some out.'}</p>
        <Tiles/>
        <details className="border-t border-border py-3"><summary className="cursor-pointer font-bold text-sm">Why this question?</summary><p className="mt-2 text-sm">A “yes” keeps {narrow(pool,q.id,'yes').length} pictures. A “no” keeps {narrow(pool,q.id,'no').length}. I choose a clue that splits my choices into two small groups.</p>{lastQuestion && <p className="mt-2 text-xs text-muted-foreground">Last clue: {lastQuestion.text} — {last?.answer === 'unsure' ? 'not sure' : last?.answer}</p>}</details>
      </section>
    </>}
    {phase==='guess' && <div className="space-y-4 text-center"><div className="guess-question py-6"><span className="block text-8xl">{guessed?.emoji ?? '🌀'}</span><h3 className="mt-3 text-3xl capitalize">{guessed?.name ?? 'A surprising secret!'}</h3><p className="mt-2 text-sm">{pool.length} {pool.length===1?'picture fits':'pictures fit'} your clues.</p></div><div className="flex flex-wrap justify-center gap-3">{guessed && <Button size="lg" onClick={()=>{setCorrect(true);setReal(guessed);setPhase('done');}}><Check/>You got it!</Button>}<Button size="lg" variant="outline" onClick={()=>setPhase('reveal')}><X/>{guessed ? 'Not my secret!' : 'Show my secret'}</Button></div></div>}
    {phase==='reveal' && <><Tiles choose={t=>{setReal(t);setCorrect(false);setPhase('done');}}/><Button variant="outline" className="w-full" onClick={()=>{setReal(null);setPhase('done');}}>Mine isn’t in these pictures</Button></>}
    {phase==='done' && <section className="space-y-5 py-5 text-center step-enter"><span className="block text-7xl">{expired ? '🌱' : real?.emoji ?? '✨'}</span><h3 className="text-3xl">{expired ? 'Clue break!' : correct ? 'Secret discovered!' : 'You stumped Bugley!'}</h3>{real && <p className="font-display text-lg">Your secret: {real.name}</p>}<div className="bg-play-mint px-4 py-5 text-sm leading-relaxed"><strong className="flex items-center justify-center gap-2 text-base"><Brain/>AI discovery</strong><p className="mx-auto mt-2 max-w-lg">{correct ? `Your answers narrowed ${THINGS.length} pictures to ${pool.length}. That’s how a decision tree works: each clue makes a smaller branch!` : missing ? `A clue I could check next time: “${missing.text}” Good questions help a computer tell similar things apart.` : 'I can only choose from pictures I know. A computer can miss things, especially when its examples or clues are missing.'}</p></div><div className="flex flex-wrap justify-center gap-3"><Button size="lg" onClick={reset}><RotateCcw/>Play again</Button><Button size="lg" variant="outline" onClick={onExit}><ArrowLeft/>All games</Button></div></section>}
  </div>;
}