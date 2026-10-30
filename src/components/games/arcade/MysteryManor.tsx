import { useState } from 'react';
import { ArrowLeft, RotateCcw, Search, Star, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bugley } from '@/components/brand/Bugley';
import { CASES, SUSPECTS, judge, manorStars, type SuspectId, type Verdict } from '@/lib/manor-cases';
import { cn } from '@/lib/utils';
import manorArt from '@/assets/games/manor.jpg';

type Stage = NonNullable<React.ComponentProps<typeof Bugley>['stage']>;
const who = (id: SuspectId) => SUSPECTS.find((s) => s.id === id)!;

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?'’]/gu, ''));
  u.rate = 0.95; u.pitch = 1.2; window.speechSynthesis.speak(u);
}

function Robot({ wrong }: { wrong?: boolean }) {
  return <svg viewBox="0 0 80 90" className={cn('size-20 shrink-0', wrong ? 'animate-pulse' : 'arcade-bob')} aria-hidden>
    <line x1="40" y1="4" x2="40" y2="16" className="stroke-foreground" strokeWidth="3" /><circle cx="40" cy="5" r="4" className="fill-play-coral" />
    <rect x="12" y="16" width="56" height="40" rx="12" className="fill-muted stroke-foreground" strokeWidth="3" />
    <circle cx="29" cy="34" r="6" className="fill-primary" /><circle cx="51" cy="34" r="6" className="fill-primary" />
    <path d={wrong ? 'M28 48 Q40 42 52 48' : 'M28 45 Q40 52 52 45'} className="fill-none stroke-foreground" strokeWidth="3" strokeLinecap="round" />
    <rect x="20" y="58" width="40" height="26" rx="8" className="fill-muted stroke-foreground" strokeWidth="3" />
    <text x="40" y="76" textAnchor="middle" fontSize="11" fontWeight="800" className="fill-foreground">100%</text>
  </svg>;
}

/** Catch the Sneaky Robot: a know-it-all robot is always "100% sure". Kids check clues and catch its mistakes. */
export function MysteryManor({ stage, onExit, onWin }: { stage: Stage; onExit?: (() => void) | undefined; onWin: (stars: number) => void }) {
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0), [seen, setSeen] = useState<number[]>([]);
  const [doubt, setDoubt] = useState(false), [verdict, setVerdict] = useState<Verdict | null>(null);
  const [score, setScore] = useState(0), [done, setDone] = useState(false);
  const c = CASES[i]!;
  const allSeen = seen.length === c.clues.length;

  function decide(trust: boolean, pick?: SuspectId) {
    const v = judge(c, trust, pick); setVerdict(v); if (v.ok) setScore((s) => s + 1);
  }
  function next() {
    if (i + 1 >= CASES.length) { setDone(true); onWin(manorStars(score)); return; }
    setI(i + 1); setSeen([]); setDoubt(false); setVerdict(null);
  }
  function again() { setI(0); setSeen([]); setDoubt(false); setVerdict(null); setScore(0); setDone(false); setStarted(true); }

  const say = !started ? 'A know-it-all robot is helping solve mysteries. It always says it is 100% sure. But is it right? Check the clues and catch its mistakes!'
    : done ? `You solved ${score} of ${CASES.length} mysteries!`
    : verdict ? (verdict.ok ? `Great detective work! It was ${who(c.answer).name}. ${c.lesson}` : `Hmm, not quite. It was really ${who(c.answer).name}. ${c.lesson}`)
    : doubt ? 'You think the robot is wrong? Then who did it? Tap the real one!'
    : allSeen ? 'You checked every clue. Is the robot right?'
    : 'Tap each clue card to look closer!';

  const Bubble = <div className="flex items-center gap-3">
    <Bugley stage={stage} expression={verdict ? (verdict.ok ? 'celebrating' : 'oops') : done ? 'celebrating' : 'curious'} glow size={72} />
    <p className="flex-1 rounded-3xl border-2 border-border bg-card p-3 text-base font-semibold">{say}</p>
    <Button size="icon" variant="outline" aria-label="Hear Bugley" onClick={() => speak(say)}><Volume2 /></Button>
  </div>;

  if (!started) return <div className="space-y-4">
    <div className="relative overflow-hidden rounded-3xl border-2 border-primary">
      <img src={manorArt} width={1024} height={768} alt="" className="aspect-[2/1] w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/80 to-transparent p-4 pt-10"><h2 className="text-3xl">Catch the Sneaky Robot</h2><p className="text-sm font-semibold">5 mysteries · about 3 minutes</p></div>
    </div>
    {Bubble}
    <ol className="grid gap-2 text-sm font-bold sm:grid-cols-3">{['🔍 Tap the clues', '🤖 Hear the robot', '✅ Right or ❌ wrong?'].map((t) => <li key={t} className="rounded-2xl border-2 border-border bg-card p-3 text-center">{t}</li>)}</ol>
    <Button size="lg" className="min-h-14 w-full text-lg" onClick={() => setStarted(true)}>Start the mystery!</Button>
  </div>;

  if (done) return <div className="space-y-4 text-center">
    <div className="flex justify-center gap-1">{[1, 2, 3].map((n) => <Star key={n} className={cn('size-12', n <= manorStars(score) ? 'fill-primary text-primary' : 'text-muted')} />)}</div>
    {Bubble}
    <p className="rounded-3xl border-2 border-primary bg-card p-4 font-display text-lg">🤫 AI secret: AI can sound 100% sure and still be wrong. Smart detectives always check the clues!</p>
    <div className="flex flex-wrap justify-center gap-2"><Button size="lg" onClick={again}><RotateCcw />Play again</Button>{onExit && <Button size="lg" variant="outline" onClick={onExit}><ArrowLeft />All games</Button>}</div>
  </div>;

  return <div className="space-y-4">
    <div className="flex items-center justify-between text-sm font-bold"><span>Mystery {i + 1} of {CASES.length}</span><span>🔍 Solved: {score}</span></div>
    <section className="rounded-3xl border-2 border-border bg-play-mint p-4">
      <p className="text-sm font-bold text-muted-foreground">{c.roomEmoji} {c.room}</p>
      <h2 className="text-2xl">{c.question}</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">{c.clues.map((cl, k) => {
        const open = seen.includes(k);
        return <button key={k} type="button" aria-label={open ? cl.text : `Clue ${k + 1}`} onClick={() => !open && setSeen((s) => [...s, k])}
          className={cn('flex min-h-28 flex-col items-center justify-center gap-1 rounded-2xl border-2 p-2 text-center transition', open ? 'border-primary bg-card' : 'border-dashed border-foreground/40 bg-card/60 hover:scale-105')}>
          {open ? <><span className="text-4xl">{cl.emoji}</span><span className="text-xs font-bold">{cl.text}</span></> : <><Search className="size-8" /><span className="text-xs font-bold">Tap to look</span></>}
        </button>;
      })}</div>
    </section>
    <div className="flex flex-wrap justify-center gap-2">{SUSPECTS.map((s) => <div key={s.id} className="rounded-2xl border-2 border-border bg-card px-3 py-1 text-center"><span className="text-2xl">{s.emoji}</span><p className="text-xs font-bold">{s.name}</p><p className="text-[10px] text-muted-foreground">{s.traits}</p></div>)}</div>
    {allSeen && <section className="flex items-center gap-3 rounded-3xl border-2 border-play-coral bg-card p-3">
      <Robot wrong={!!verdict && !verdict.botRight} />
      <div><p className="text-xs font-bold text-muted-foreground">KNOW-IT-ALL ROBOT</p><p className="font-display text-lg">"It was {who(c.botSays).name} {who(c.botSays).emoji}! {c.botWhy}"</p></div>
    </section>}
    {Bubble}
    {allSeen && !verdict && !doubt && <div className="grid grid-cols-2 gap-2">
      <Button size="lg" className="min-h-16 text-lg" onClick={() => decide(true)}>✅ Robot is right</Button>
      <Button size="lg" variant="outline" className="min-h-16 text-lg" onClick={() => setDoubt(true)}>❌ Robot is wrong</Button>
    </div>}
    {doubt && !verdict && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{SUSPECTS.map((s) => <Button key={s.id} size="lg" variant="outline" className="min-h-16 text-lg" onClick={() => decide(false, s.id)}>{s.emoji} {s.name}</Button>)}</div>}
    {verdict && <Button size="lg" className="min-h-14 w-full text-lg" onClick={next}>{i + 1 >= CASES.length ? 'See my detective stars' : 'Next mystery'}</Button>}
  </div>;
}
