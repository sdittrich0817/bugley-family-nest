import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, Leaf, Play, RotateCcw, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bugley } from '@/components/brand/Bugley';
import { useScrollTopOn } from '@/lib/scroll';
import { cn } from '@/lib/utils';
import { makeMeadow, meadowGuess, meadowMatch, teachMeadow, MEADOW_ROUND_MS, type MeadowCard, type MeadowItem, type MeadowLearning } from '@/lib/memory-meadow';
import meadow from '@/assets/games/memory-meadow.jpg';

type Stage = NonNullable<React.ComponentProps<typeof Bugley>['stage']>;
function MeadowBug({ item }: { item: MeadowItem }) {
  return <svg viewBox="0 0 120 100" className={cn('meadow-bug', `meadow-${item.id}`)} role="img" aria-label={item.name}>
    {item.color === 'blue' ? <>
      <ellipse className="meadow-wing" cx="35" cy="36" rx={item.id === 'butterfly' ? 25 : 29} ry={item.id === 'butterfly' ? 27 : 10} transform="rotate(25 35 36)" />
      <ellipse className="meadow-wing" cx="85" cy="36" rx={item.id === 'butterfly' ? 25 : 29} ry={item.id === 'butterfly' ? 27 : 10} transform="rotate(-25 85 36)" />
      <ellipse className="meadow-wing" cx="37" cy="65" rx={item.id === 'butterfly' ? 20 : 27} ry={item.id === 'butterfly' ? 20 : 9} transform="rotate(-20 37 65)" />
      <ellipse className="meadow-wing" cx="83" cy="65" rx={item.id === 'butterfly' ? 20 : 27} ry={item.id === 'butterfly' ? 20 : 9} transform="rotate(20 83 65)" />
      <ellipse className="meadow-ink-fill" cx="60" cy="53" rx="7" ry={item.id === 'dragonfly' ? 37 : 23} />
      {item.id === 'butterfly' && <g className="meadow-light-fill"><circle cx="30" cy="30" r="8" /><circle cx="90" cy="30" r="8" /><circle cx="35" cy="68" r="5" /><circle cx="85" cy="68" r="5" /></g>}
    </> : <>
      <ellipse className="meadow-light-fill meadow-outline" cx="36" cy="33" rx="22" ry="15" transform="rotate(-30 36 33)" /><ellipse className="meadow-light-fill meadow-outline" cx="84" cy="33" rx="22" ry="15" transform="rotate(30 84 33)" />
      <ellipse className="meadow-gold-fill meadow-outline" cx="60" cy="59" rx="34" ry="29" />
      {item.id === 'bee' ? <g className="meadow-ink-stroke"><path d="M39 38v42M58 31v56M77 36v46" /></g> : <g className="meadow-ink-fill"><circle cx="43" cy="49" r="6" /><circle cx="76" cy="48" r="6" /><circle cx="42" cy="68" r="6" /><circle cx="76" cy="68" r="6" /><path d="M59 31h3v56h-3z" /></g>}
    </>}
    <path className="meadow-antenna" d="M53 24 45 12M67 24 75 12" /><circle className="meadow-ink-fill" cx="60" cy="28" r="14" />
    <g className="meadow-light-fill"><circle cx="55" cy="25" r="4" /><circle cx="65" cy="25" r="4" /></g><g className="meadow-ink-fill"><circle cx="56" cy="25" r="2" /><circle cx="64" cy="25" r="2" /></g>
  </svg>;
}

export function MemoryMeadow({ stage, onExit }: { stage: Stage; onExit: () => void }) {
  const [phase, setPhase] = useState<'menu' | 'peek' | 'play' | 'done'>('menu');
  const [deck, setDeck] = useState<MeadowCard[]>([]), [selected, setSelected] = useState<number[]>([]), [matched, setMatched] = useState<string[]>([]);
  const [learned, setLearned] = useState<MeadowLearning>([]), [guessKey, setGuessKey] = useState<string | null>(null);
  const [caught, setCaught] = useState(0), [started, setStarted] = useState<number | null>(null), [timedOut, setTimedOut] = useState(false);
  const [message, setMessage] = useState('Look at the bugs. Where are their twins?');
  useScrollTopOn(phase === 'done' ? 'meadow-done' : phase === 'menu' ? 'meadow-menu' : 'meadow-board');
  useEffect(() => {
    if (started === null || phase === 'menu' || phase === 'done') return;
    const timer = window.setTimeout(() => { setTimedOut(true); setPhase('done'); }, Math.max(0, MEADOW_ROUND_MS - (Date.now() - started)));
    return () => clearTimeout(timer);
  }, [started, phase]);
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);
  function say() { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(message)); } }
  function start() { setDeck(makeMeadow()); setMatched([]); setSelected([]); setCaught(0); setGuessKey(null); setTimedOut(false); setStarted(Date.now()); setMessage('Look at the bugs. Where are their twins?'); setPhase('peek'); }
  function hide() { setSelected([]); setGuessKey(null); setMessage('Flip one leaf. Then find the very same bug!'); setPhase('play'); }
  function flip(index: number) {
    const card = deck[index];
    if (!card || phase !== 'play' || selected.length >= 2 || selected.includes(index) || matched.includes(card.item.id)) return;
    if (!selected.length) {
      const candidates = deck.filter(c => c.key !== card.key && !matched.includes(c.item.id));
      const guess = meadowGuess(card, candidates, learned);
      setGuessKey(guess?.key ?? null); setSelected([index]);
      setMessage(learned.includes(card.item.color) ? `I’m looking for ${card.item.color}, ${card.item.shape} AND ${card.item.detail}. Is my glowing leaf right?` : `I remember ${card.item.color} + ${card.item.shape}. I think its twin is under the glowing leaf. What do you think?`);
      return;
    }
    const firstIndex = selected[0], first = firstIndex === undefined ? undefined : deck[firstIndex];
    if (!first) return;
    setSelected([...selected, index]);
    if (meadowMatch(first, card)) {
      const missed = guessKey !== card.key;
      if (missed) setCaught(n => n + 1);
      setLearned(l => teachMeadow(l, first, card));
      setMatched(m => [...m, card.item.id]);
      setMessage(missed ? `You found the twin! My guess was wrong. Now I’ll look for ${card.item.detail}, too. Try me on the next pair!` : `A match! ${card.item.detail} helps me tell these bugs apart. I’ll use that on the next pair!`);
    } else setMessage(`Not twins! One is a ${first.item.name.toLowerCase()}, the other a ${card.item.name.toLowerCase()}. Look at ${first.item.detail} and ${card.item.detail}. Let’s look again.`);
  }
  function next() { if (matched.length === 4) setPhase('done'); else { setSelected([]); setGuessKey(null); setMessage('Flip another leaf. Can we find its twin?'); } }
  const first = selected[0] === undefined ? undefined : deck[selected[0]];
  const feedback = selected.length === 2;
  return <div className="space-y-4">
    {phase === 'menu' ? <>
      <div className="meadow-intro"><img src={meadow} width={1536} height={1024} alt="A sunlit wildflower meadow with a stream and little wooden bridge" className="meadow-world" />
        <div className="meadow-intro-copy"><p className="font-bold">A LITTLE MEMORY ADVENTURE</p><h2 className="mt-2 text-4xl">Memory Meadow</h2><p className="my-3 text-lg">Find the bug twins. Can you spot a detail that Bugley missed?</p><Button size="lg" onClick={start}><Play />Let’s find twins!</Button></div>
        <div className="meadow-intro-bugs"><MeadowBug item={{ id: 'butterfly', name: 'Blue butterfly', color: 'blue', shape: 'wings', detail: 'wide wings', code: 0 }} /><Bugley stage={stage} size={130} expression="curious" glow className="studio-guide-fly" /></div>
      </div>
      <div className="flex items-center gap-3"><Bugley stage={stage} size={100} expression="curious" className="shrink-0" /><p className="text-lg font-bold">“I remember colors and shapes… but similar bugs can trick me. Let’s learn together!”</p></div>
    </> : phase === 'done' ? <div className="space-y-5 py-6 text-center">
      <Bugley stage={stage} size={145} expression="celebrating" glow className="mx-auto studio-guide-fly" /><h2 className="text-3xl">{timedOut ? 'A little meadow break!' : 'The meadow is glowing!'}</h2>
      <p className="text-xl font-bold">{matched.length} pairs found · {caught} Bugley {caught === 1 ? 'mistake' : 'mistakes'} caught</p>
      <div className="flex justify-center gap-3">{deck.filter(c => c.key.endsWith('-0') && matched.includes(c.item.id)).map(c => <div className="meadow-keepsake" key={c.key}><MeadowBug item={c.item} /></div>)}</div>
      <div className="border-y-2 border-primary py-4"><h3 className="text-xl">Small details make a big difference.</h3><p className="mx-auto mt-2 max-w-lg">My little AI matches features, not whole pictures. You taught it to notice {learned.length ? learned.map(c => c === 'blue' ? 'wing shape and body length' : 'dots and stripes').join(' and ') : 'that similar-looking bugs can be different'}. Those details stay with me when we play again!</p></div>
      <div className="flex flex-wrap justify-center gap-3"><Button size="lg" onClick={start}><RotateCcw />Play again</Button><Button size="lg" variant="outline" onClick={onExit}><ArrowLeft />All games</Button></div>
    </div> : <>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl">{phase === 'peek' ? 'Take a good look…' : feedback ? matched.length === 4 ? 'You found every twin!' : 'Look at those little details!' : selected.length ? 'Find its twin!' : 'Pick a leaf!'}</h2><span className="font-bold">🌼 {matched.length}/4 pairs</span></div>
      <div className="meadow-board"><img src={meadow} width={1536} height={1024} alt="" className="meadow-world" />
        <div className="meadow-grid">{deck.map((card, index) => {
          const found = matched.includes(card.item.id), faceUp = phase === 'peek' || found || selected.includes(index), suggested = !feedback && guessKey === card.key;
          return <Button key={card.key} variant="ghost" className={cn('meadow-tile', faceUp && 'meadow-face', found && 'meadow-found', suggested && 'meadow-suggested')} aria-label={faceUp ? `${card.item.name}, leaf ${index + 1}${found ? ', matched' : ''}` : `Flip leaf ${index + 1}${suggested ? ', Bugley’s guess' : ''}`} aria-pressed={selected.includes(index)} disabled={phase === 'peek' || found || selected.includes(index) || feedback} onClick={() => flip(index)}>
            {faceUp ? <><MeadowBug item={card.item} /><span className="meadow-tile-name">{card.item.name}</span></> : <><Leaf className="meadow-leaf" /><span className="meadow-leaf-number">{index + 1}</span>{suggested && <span className="meadow-guess-label">My guess!</span>}</>}
          </Button>;
        })}</div>
        <div className="meadow-lights" aria-hidden>{[0,1,2,3].map(n => <span key={n} className={cn(matched.length > n && 'meadow-light-on')}>✦</span>)}</div>
      </div>
      <div className="meadow-coach" aria-live="polite"><Bugley stage={stage} size={100} expression={feedback ? matched.includes(first?.item.id ?? '') ? 'celebrating' : 'curious' : 'thinking'} className="shrink-0 studio-guide-fly" /><div className="min-w-0 flex-1"><p className="font-bold">{message}</p>{phase === 'play' && first && <p className="mt-1 text-sm text-muted-foreground">Bugley noticed: {first.item.color} · {first.item.shape}{learned.includes(first.item.color) && ` · ${first.item.detail}`}</p>}</div><Button variant="ghost" size="icon" aria-label="Hear Bugley" onClick={say}><Volume2 /></Button></div>
      <div className="flex flex-wrap justify-center gap-3">{phase === 'peek' ? <Button size="lg" onClick={hide}><Leaf />Hide the bugs — I’m ready!</Button> : feedback ? <Button size="lg" onClick={next}>{matched.length === 4 ? 'See my meadow' : 'Keep finding twins'}<ArrowRight /></Button> : <Button variant="outline" onClick={() => { setPhase('peek'); setSelected([]); setGuessKey(null); setMessage('Take another look. Even good detectives need a peek!'); }}><Eye />Have a peek</Button>}</div>
    </>}
    {phase !== 'done' && <Button variant="ghost" onClick={onExit}><ArrowLeft />All games</Button>}
  </div>;
}