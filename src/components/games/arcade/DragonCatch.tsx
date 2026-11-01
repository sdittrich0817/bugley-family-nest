import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Camera, Check, RotateCcw, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bugley } from '@/components/brand/Bugley';
import { useScrollTopOn } from '@/lib/scroll';
import { cameraGuess, checkPhoto, flightSpeed, makeFlight, PHOTO_GOAL, ROUND_MS, teachCamera, type CameraMemory, type Sighting } from '@/lib/dragon-catch';
import { cn } from '@/lib/utils';
import valley from '@/assets/games/world-dragon.jpg';
import dragon from '@/assets/games/adventure-dragon.png';

type Stage = NonNullable<React.ComponentProps<typeof Bugley>['stage']>;
type Photo = { sighting: Sighting; correct: boolean };

function Subject({ sighting }: { sighting: Sighting }) {
  if (!sighting.dragon) return <span className="dragon-decoy" role="img" aria-label={sighting.name}>{sighting.look === 'cloud' ? '☁️' : sighting.look === 'stump' ? '🪵' : '🪨'}</span>;
  return <div className={cn('dragon-subject', sighting.look === 'rock-dragon' && 'dragon-rock', sighting.look === 'tree-dragon' && 'dragon-leaf')}>
    <img src={dragon} width={1024} height={1024} alt={sighting.name} draggable={false} />
    {sighting.look === 'tree-dragon' && <span className="dragon-disguise" aria-hidden>🌿</span>}
    {sighting.look === 'rock-dragon' && <span className="dragon-disguise" aria-hidden>🪨</span>}
  </div>;
}

export function DragonCatch({ stage, band, onExit }: { stage: Stage; band: string; onExit: () => void }) {
  const [phase, setPhase] = useState<'menu' | 'fly' | 'photo' | 'done'>('menu');
  const [deck, setDeck] = useState<Sighting[]>([]), [index, setIndex] = useState(0), [lane, setLane] = useState(1);
  const [memory, setMemory] = useState<CameraMemory>({}), [flightMemory, setFlightMemory] = useState<CameraMemory>({});
  const [photos, setPhotos] = useState<Photo[]>([]), [answer, setAnswer] = useState<boolean | null>(null);
  const [started, setStarted] = useState<number | null>(null), [expired, setExpired] = useState(false), [misses, setMisses] = useState(0);
  const sighting = deck[index], active = phase === 'fly' || phase === 'photo';
  const guess = sighting ? cameraGuess(sighting.look, flightMemory) : null;
  const good = photos.filter(p => p.correct && p.sighting.dragon).length;
  const corrections = photos.filter(p => p.correct && cameraGuess(p.sighting.look, flightMemory).dragon !== p.sighting.dragon).length;
  useScrollTopOn(phase === 'done' ? 'dragon-done' : 'dragon-play');
  function start() { setFlightMemory(memory); setDeck(makeFlight()); setIndex(0); setLane(1); setPhotos([]); setAnswer(null); setMisses(0); setExpired(false); setStarted(Date.now()); setPhase('fly'); }
  function next() { setAnswer(null); if (index + 1 >= deck.length || good >= PHOTO_GOAL) setPhase('done'); else { setIndex(n => n + 1); setPhase('fly'); } }
  function snap() { if (phase === 'fly' && sighting && sighting.lane === lane) setPhase('photo'); }
  function label(value: boolean) {
    if (!sighting || answer !== null) return;
    const correct = checkPhoto(sighting, value);
    setAnswer(value); setPhotos(p => [...p, { sighting, correct }]);
    if (correct) setMemory(m => teachCamera(m, sighting.look, value));
  }
  useEffect(() => {
    if (!active || started === null) return;
    const timer = window.setTimeout(() => { setExpired(true); setPhase('done'); }, Math.max(0, ROUND_MS - (Date.now() - started)));
    return () => clearTimeout(timer);
  }, [active, started]);
  useEffect(() => {
    if (phase !== 'fly') return;
    const timer = window.setTimeout(() => { setMisses(n => n + 1); if (index + 1 >= deck.length) setPhase('done'); else setIndex(n => n + 1); }, flightSpeed(band));
    return () => clearTimeout(timer);
  }, [phase, index, deck.length, band]);
  useEffect(() => {
    if (phase !== 'fly') return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.code === 'Space') e.preventDefault();
      if (e.key === 'ArrowUp') setLane(l => Math.max(0, l - 1));
      if (e.key === 'ArrowDown') setLane(l => Math.min(2, l + 1));
      if (e.code === 'Space') snap();
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [phase, sighting, lane]);
  const say = (text: string) => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } };
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);

  if (phase === 'menu') return <div className="space-y-4">
    <div className="dragon-scene dragon-intro">
      <img src={valley} width={1536} height={1024} alt="A magical valley of waterfalls, flowering trees and mountain islands" className="dragon-world" />
      <img src={dragon} width={1024} height={1024} alt="Your friendly dragon flyer" className="dragon-intro-flyer arcade-bob" />
      <div className="dragon-intro-copy"><span className="text-sm font-bold">DRAGON VALLEY · PHOTO ADVENTURE</span><h2 className="mt-2 text-4xl">Dragon Catch</h2><p className="my-4 max-w-sm text-lg">Find 6 dragons. Snap their pictures. Catch my camera’s mistakes!</p><Button size="lg" onClick={start}><Camera />Let’s fly!</Button></div>
    </div>
    <div className="flex items-center gap-2"><Bugley stage={stage} size={100} expression="curious" className="studio-guide-fly shrink-0" /><p className="font-bold">“Sometimes I see a dragon in a cloud… and miss one in a tree! Will you check my guesses?”</p><Button variant="ghost" size="icon" aria-label="Hear Bugley" onClick={() => say('Find six dragons. Fly up or down to match the picture, then tap Snap photo. Tell me whether you see a dragon.')}><Volume2 /></Button></div>
    <Button variant="ghost" onClick={onExit}><ArrowLeft />All games</Button>
  </div>;

  if (phase === 'done') return <div className="space-y-5 text-center">
    <Bugley stage={stage} expression="celebrating" glow size={140} className="mx-auto studio-guide-fly" />
    <h2 className="text-3xl">{expired ? 'Time to land!' : good >= PHOTO_GOAL ? 'Dragon album complete!' : 'What a dragon adventure!'}</h2>
    <p className="text-xl font-bold">📸 {good} of {PHOTO_GOAL} dragon photos · {corrections} camera mistakes caught</p>
    <div className="flex flex-wrap justify-center gap-3">{photos.filter(p => p.correct && p.sighting.dragon).map(p => <div key={p.sighting.id} className="dragon-print"><Subject sighting={p.sighting} /><span>{p.sighting.name}</span></div>)}</div>
    {misses > 0 && <p>{misses} {misses === 1 ? 'picture flew' : 'pictures flew'} past. Let’s try another flight!</p>}
    <div className="border-y-2 border-primary py-4"><h3 className="text-xl">You taught Dragon Eye!</h3><p className="mx-auto mt-2 max-w-xl">Your checked pictures help my practice camera recognize those shapes next flight. I can still miss new ones. Even a very sure guess can be wrong!</p></div>
    <div className="flex flex-wrap justify-center gap-2"><Button size="lg" onClick={start}><RotateCcw />Play again</Button><Button size="lg" variant="outline" onClick={onExit}><ArrowLeft />All games</Button></div>
  </div>;
  if (!sighting || !guess) return null;
  const aligned = lane === sighting.lane;
  const answeredCorrect = answer !== null && checkPhoto(sighting, answer);
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2 font-bold"><span>📸 Dragon photos {good}/{PHOTO_GOAL}</span><span>Valley stop {index + 1}/{deck.length}</span></div>
    <div className={cn('dragon-scene', phase === 'photo' && 'dragon-photo-scene')}>
      <img src={valley} width={1536} height={1024} alt="Dragon Valley" className="dragon-world" />
      {phase === 'fly' ? <>
        {[0, 1, 2].map(l => <div key={l} className={cn('dragon-lane', lane === l && 'dragon-lane-active')} style={{ top: `${(l + .5) * 100 / 3}%` }} />)}
        <div className="dragon-rider" style={{ top: `${(lane + .5) * 100 / 3}%` }}><img src={dragon} width={1024} height={1024} alt="Your dragon flyer" /><span>YOU</span></div>
        <div key={sighting.id} className="dragon-target" style={{ top: `${(sighting.lane + .5) * 100 / 3}%`, animationDuration: `${flightSpeed(band)}ms` }}><div className="dragon-viewfinder"><Subject sighting={sighting} /></div></div>
        <div className="dragon-scene-note">{aligned ? '📸 In view! Snap now!' : sighting.lane < lane ? '↑ Fly up to the picture' : '↓ Fly down to the picture'}</div>
      </> : <div className="dragon-photo-focus"><Subject sighting={sighting} /><span className="dragon-photo-label">{answer === null ? 'Look closely…' : sighting.name}</span></div>}
    </div>
    {phase === 'fly' ? <div className="flex flex-wrap items-center justify-center gap-3">
      <Button size="lg" variant="outline" aria-label="Fly up" disabled={lane === 0} onClick={() => setLane(l => Math.max(0, l - 1))}><ArrowUp /></Button>
      <Button size="lg" className="min-h-14" disabled={!aligned} onClick={snap}><Camera />Snap photo</Button>
      <Button size="lg" variant="outline" aria-label="Fly down" disabled={lane === 2} onClick={() => setLane(l => Math.min(2, l + 1))}><ArrowDown /></Button>
    </div> : <div className="space-y-3">
      <div className="flex items-center gap-3"><Bugley stage={stage} size={90} expression={answer === null ? 'thinking' : answeredCorrect ? 'celebrating' : 'curious'} className="shrink-0 studio-guide-fly" /><div className="min-w-0 flex-1"><p className="text-xs font-bold text-muted-foreground">DRAGON EYE · PRACTICE CAMERA {guess.learned && '· LEARNED FROM YOU'}</p><p className="text-lg font-bold">{guess.dragon ? '“I think it’s a dragon!”' : '“I don’t think it’s a dragon.”'}</p><meter className="story-meter" min={0} max={100} value={guess.sure} aria-label="Camera confidence" /><span className="text-sm">{guess.sure}% sure</span></div></div>
      {answer === null ? <div className="text-center"><h3 className="mb-3 text-xl">What do YOU see?</h3><div className="flex flex-wrap justify-center gap-2"><Button size="lg" onClick={() => label(true)}><Check />A dragon!</Button><Button size="lg" variant="outline" onClick={() => label(false)}><X />Not a dragon</Button></div></div> : <div className="space-y-3 text-center" aria-live="polite"><p className="font-bold">{answeredCorrect ? guess.dragon === sighting.dragon ? 'You checked it! We agree.' : 'You caught my mistake! I’ll remember your correction.' : sighting.dragon ? 'Look! Wings, a tail and little eyes. That really is a dragon!' : `That’s a ${sighting.name.toLowerCase()}, not a dragon. Good detectives take another look!`}</p><Button size="lg" onClick={next}>{index + 1 >= deck.length || good >= PHOTO_GOAL ? 'See my dragon album' : 'Keep flying'}<ArrowLeft className="rotate-180" /></Button></div>}
    </div>}
    <Button variant="ghost" onClick={onExit}><ArrowLeft />All games</Button>
  </div>;
}