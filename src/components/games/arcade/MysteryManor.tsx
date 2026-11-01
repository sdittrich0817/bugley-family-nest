import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CalendarCheck, Pencil, RotateCcw, Search, Star, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bugley } from '@/components/brand/Bugley';
import {
  CASES_PER_GAME, CLUES, LEVELS, ROOMS, SUSPECTS, TAG_LABEL,
  addNotebookEntry, dailyCase, isWin, judge, levelOpen, makeGame, makeKidCase, manorStars,
  readNotebook, seeded, hashKey, todayKey, unlockedCount,
  type Case, type Level, type NotebookEntry, type SuspectId, type Tag, type Verdict,
} from '@/lib/manor-cases';

const KEY = 'bugley-manor-wins';
import { cn } from '@/lib/utils';
import manorArt from '@/assets/games/cover-manor.jpg';

type Stage = NonNullable<React.ComponentProps<typeof Bugley>['stage']>;
const who = (id: SuspectId) => SUSPECTS.find((s) => s.id === id)!;
const ALL_TAGS = Object.keys(CLUES) as Tag[];

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

type Mode = 'menu' | 'play' | 'daily' | 'make' | 'notebook';

/** Catch the Sneaky Robot: a know-it-all robot is always "100% sure". Kids check clues and catch its mistakes. */
export function MysteryManor({ stage, onExit, onWin }: { stage: Stage; onExit?: (() => void) | undefined; onWin: (stars: number) => void }) {
  const [mode, setMode] = useState<Mode>('menu');
  const [wins, setWins] = useState(0), [level, setLevel] = useState<Level>('rookie');
  const [cases, setCases] = useState<Case[]>(() => makeGame('rookie', 0));
  const [i, setI] = useState(0), [seen, setSeen] = useState<number[]>([]);
  const [doubt, setDoubt] = useState(false), [verdict, setVerdict] = useState<Verdict | null>(null);
  const [score, setScore] = useState(0), [done, setDone] = useState(false), [newFriend, setNewFriend] = useState<SuspectId | null>(null);
  const [notebook, setNotebook] = useState<NotebookEntry[]>([]);
  const [dailyDone, setDailyDone] = useState(false);
  // Mystery maker state
  const [mkRoom, setMkRoom] = useState<number | null>(null), [mkCulprit, setMkCulprit] = useState<SuspectId | null>(null), [mkTags, setMkTags] = useState<Tag[]>([]);
  const [mkCase, setMkCase] = useState<Case | null>(null), [mkVerdict, setMkVerdict] = useState<boolean | null>(null);

  useEffect(() => {
    const w = Number(localStorage.getItem(KEY)) || 0; setWins(w);
    setNotebook(readNotebook(localStorage));
    setDailyDone(readNotebook(localStorage).some((e) => e.daily && e.date === todayKey()));
  }, []);

  const c = cases[i]!;
  const cast = SUSPECTS.filter((s) => c.cast.includes(s.id));
  const allSeen = seen.length === c.clues.length;
  const pool = SUSPECTS.slice(0, unlockedCount(wins)).map((s) => s.id);

  function stamp(entry: Omit<NotebookEntry, 'date'>) {
    setNotebook(addNotebookEntry(localStorage, { ...entry, date: todayKey() }));
  }

  function decide(trust: boolean, pick?: SuspectId) {
    const v = judge(c, trust, pick); setVerdict(v); if (v.ok) setScore((s) => s + 1);
  }
  function next() {
    stamp({ room: c.room, roomEmoji: c.roomEmoji, culprit: c.answer, solved: !!verdict?.ok, daily: mode === 'daily' });
    if (mode === 'daily') { setDailyDone(true); setDone(true); onWin(verdict?.ok ? 3 : 1); return; }
    if (i + 1 >= cases.length) {
      setDone(true); onWin(manorStars(score));
      if (isWin(score)) {
        const w = wins + 1, before = unlockedCount(wins), after = unlockedCount(w);
        setNewFriend(after > before ? SUSPECTS[after - 1]!.id : null);
        setWins(w); try { localStorage.setItem(KEY, String(w)); } catch { /* private mode */ }
      } else setNewFriend(null);
      return;
    }
    setI(i + 1); setSeen([]); setDoubt(false); setVerdict(null);
  }
  function begin(l: Level) { setLevel(l); setCases(makeGame(l, wins)); setI(0); setSeen([]); setDoubt(false); setVerdict(null); setScore(0); setDone(false); setNewFriend(null); setMode('play'); }
  function beginDaily() {
    setCases([dailyCase(level, wins, todayKey())]); setI(0); setSeen([]); setDoubt(false); setVerdict(null); setScore(0); setDone(false); setMode('daily');
  }
  function beginMake() { setMkRoom(null); setMkCulprit(null); setMkTags([]); setMkCase(null); setMkVerdict(null); setMode('make'); }
  function buildMystery() {
    if (mkRoom === null || !mkCulprit || mkTags.length !== 3) return;
    setMkCase(makeKidCase(mkRoom, mkCulprit, mkTags, pool, seeded(hashKey(`${Date.now()}`))));
  }
  function judgeMystery(trust: boolean) {
    if (!mkCase) return;
    const ok = trust === (mkCase.botSays === mkCase.answer);
    setMkVerdict(ok);
    stamp({ room: mkCase.room, roomEmoji: mkCase.roomEmoji, culprit: mkCase.answer, solved: ok, mine: true });
  }
  function again() { mode === 'daily' ? (setMode('menu'), setDone(false)) : begin(level); }

  const say = mode === 'menu' ? 'A know-it-all robot is helping solve mysteries. It always says it is 100% sure. But is it right? Check the clues and catch its mistakes!'
    : mode === 'notebook' ? 'Every mystery you solve gets a stamp in your notebook. How many can you collect?'
    : mode === 'make' ? (mkCase ? (mkVerdict === null ? 'The robot is trying YOUR mystery. Is it right?' : mkVerdict ? 'You caught it right! Great mystery, detective!' : 'Nice try! ' + mkCase.lesson) : 'Build your own mystery! Pick a room, pick who did it, then leave three clues. Will the robot solve it?')
    : done ? (mode === 'daily' ? (verdict?.ok ? 'You solved the Case of the Day! Come back tomorrow for a brand-new one.' : 'Tough case! A brand-new Case of the Day arrives tomorrow.') : `You solved ${score} of ${CASES_PER_GAME} mysteries!`)
    : verdict ? (verdict.ok ? `Great detective work! It was ${who(c.answer).name}. ${c.lesson}` : `Hmm, not quite. It was really ${who(c.answer).name}. ${c.lesson}`)
    : doubt ? 'You think the robot is wrong? Then who did it? Tap the real one!'
    : allSeen ? 'You checked every clue. Is the robot right?'
    : 'Tap each clue card to look closer!';

  const Bubble = <div className="flex items-center gap-3">
    <Bugley stage={stage} expression={verdict ? (verdict.ok ? 'celebrating' : 'oops') : done || mkVerdict ? 'celebrating' : 'curious'} glow size={72} />
    <p className="flex-1 rounded-3xl border-2 border-border bg-card p-3 text-base font-semibold">{say}</p>
    <Button size="icon" variant="outline" aria-label="Hear Bugley" onClick={() => speak(say)}><Volume2 /></Button>
  </div>;

  // ---------- Menu ----------
  if (mode === 'menu') return <div className="space-y-4">
    <div className="relative overflow-hidden rounded-3xl border-2 border-primary">
      <img src={manorArt} width={1024} height={768} alt="" className="aspect-[2/1] w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/80 to-transparent p-4 pt-10"><h2 className="text-3xl">Catch the Sneaky Robot</h2><p className="text-sm font-semibold">5 new mysteries every game · about 3 minutes</p></div>
    </div>
    {Bubble}
    <ol className="grid gap-2 text-sm font-bold sm:grid-cols-3">{['🔍 Tap the clues', '🤖 Hear the robot', '✅ Right or ❌ wrong?'].map((t) => <li key={t} className="rounded-2xl border-2 border-border bg-card p-3 text-center">{t}</li>)}</ol>
    <button type="button" onClick={beginDaily} disabled={dailyDone}
      className={cn('flex w-full items-center gap-3 rounded-3xl border-2 p-4 text-left transition', dailyDone ? 'border-border bg-muted opacity-70' : 'border-primary bg-card hover:scale-[1.01]')}>
      <CalendarCheck className="size-10 shrink-0 text-primary" />
      <span className="flex-1"><span className="font-display text-lg">Case of the Day</span><br />
        <span className="text-sm font-semibold text-muted-foreground">{dailyDone ? 'Solved! A new case arrives tomorrow 🌙' : 'One special mystery, same for every detective today'}</span></span>
      {!dailyDone && <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">Play</span>}
    </button>
    <Levels wins={wins} onPick={begin} />
    <div className="grid gap-2 sm:grid-cols-2">
      <Button size="lg" variant="outline" className="min-h-16" onClick={beginMake}><Pencil />Make your own mystery</Button>
      <Button size="lg" variant="outline" className="min-h-16" onClick={() => setMode('notebook')}><BookOpen />My notebook · {notebook.length} stamp{notebook.length === 1 ? '' : 's'}</Button>
    </div>
    <Friends wins={wins} />
  </div>;

  // ---------- Notebook ----------
  if (mode === 'notebook') return <div className="space-y-4">
    <div className="flex items-center justify-between"><h2 className="text-2xl">📖 My detective notebook</h2><Button variant="outline" onClick={() => setMode('menu')}><ArrowLeft />Back</Button></div>
    {Bubble}
    {notebook.length === 0 ? <p className="rounded-3xl border-2 border-dashed border-border bg-card p-6 text-center font-semibold">No stamps yet. Solve a mystery to earn your first one!</p>
      : <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{notebook.map((e, k) => <div key={k} className={cn('rounded-2xl border-2 p-3 text-center', e.solved ? 'border-primary bg-card' : 'border-border bg-muted')}>
        <span className="text-3xl">{e.solved ? who(e.culprit).emoji : '❌'}</span>
        <p className="mt-1 text-xs font-bold">{e.roomEmoji} {e.room}</p>
        <p className="text-[10px] font-semibold text-muted-foreground">{e.solved ? `It was ${who(e.culprit).name}!` : 'Case still open'}</p>
        <p className="text-[10px] font-semibold text-muted-foreground">{e.daily ? '⭐ Case of the Day' : e.mine ? '✏️ Made by me' : e.date}</p>
      </div>)}</div>}
  </div>;

  // ---------- Mystery maker ----------
  if (mode === 'make') {
    if (mkCase) {
      const robotRight = mkCase.botSays === mkCase.answer;
      return <div className="space-y-4">
        <section className="rounded-3xl border-2 border-border bg-play-mint p-4">
          <p className="text-sm font-bold text-muted-foreground">{mkCase.roomEmoji} {mkCase.room} · your mystery</p>
          <h2 className="text-2xl">{mkCase.question}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">{mkCase.clues.map((cl, k) => <div key={k} className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-primary bg-card p-2 text-center"><span className="text-4xl">{cl.emoji}</span><span className="text-xs font-bold">{cl.text}</span></div>)}</div>
        </section>
        <section className="flex items-center gap-3 rounded-3xl border-2 border-play-coral bg-card p-3">
          <Robot wrong={mkVerdict === true && !robotRight} />
          <div><p className="text-xs font-bold text-muted-foreground">KNOW-IT-ALL ROBOT</p><p className="font-display text-lg">"It was {who(mkCase.botSays).name} {who(mkCase.botSays).emoji}! {mkCase.botWhy}"</p></div>
        </section>
        {Bubble}
        {mkVerdict === null ? <div className="grid grid-cols-2 gap-2">
          <Button size="lg" className="min-h-16 text-lg" onClick={() => judgeMystery(true)}>✅ Robot is right</Button>
          <Button size="lg" variant="outline" className="min-h-16 text-lg" onClick={() => judgeMystery(false)}>❌ Robot is wrong</Button>
        </div> : <div className="space-y-3">
          <p className="rounded-3xl border-2 border-primary bg-card p-4 text-center font-display text-lg">{robotRight ? `🎉 Your clues were so clear the robot solved it! It was ${who(mkCase.answer).name}.` : `🤖 The robot guessed wrong — it was really ${who(mkCase.answer).name}! ${mkCase.lesson}`}</p>
          <div className="flex flex-wrap justify-center gap-2"><Button size="lg" onClick={beginMake}><Pencil />Make another</Button><Button size="lg" variant="outline" onClick={() => setMode('menu')}><ArrowLeft />Case menu</Button></div>
        </div>}
      </div>;
    }
    const friends = SUSPECTS.filter((s) => pool.includes(s.id));
    return <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-2xl">✏️ Make your own mystery</h2><Button variant="outline" onClick={() => setMode('menu')}><ArrowLeft />Back</Button></div>
      {Bubble}
      <section className="space-y-2">
        <p className="font-display text-lg">1 · Pick a room</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{ROOMS.slice(0, 12).map((r, k) => <button key={k} type="button" onClick={() => setMkRoom(k)}
          className={cn('rounded-2xl border-2 p-2 text-center transition', mkRoom === k ? 'border-primary bg-primary/10 scale-105' : 'border-border bg-card')}>
          <span className="text-2xl">{r.emoji}</span><p className="text-xs font-bold">{r.room}</p><p className="text-[10px] text-muted-foreground">{r.question}</p>
        </button>)}</div>
      </section>
      {mkRoom !== null && <section className="space-y-2">
        <p className="font-display text-lg">2 · Who really did it? (keep it secret!)</p>
        <div className="grid grid-cols-4 gap-2">{friends.map((s) => <button key={s.id} type="button" onClick={() => setMkCulprit(s.id)}
          className={cn('rounded-2xl border-2 p-2 text-center transition', mkCulprit === s.id ? 'border-primary bg-primary/10 scale-105' : 'border-border bg-card')}>
          <span className="text-3xl">{s.emoji}</span><p className="text-xs font-bold">{s.name}</p>
        </button>)}</div>
      </section>}
      {mkCulprit && <section className="space-y-2">
        <p className="font-display text-lg">3 · Leave 3 clues <span className="text-sm font-semibold text-muted-foreground">({mkTags.length}/3 picked — clues that only fit your culprit help the robot!)</span></p>
        <div className="grid grid-cols-4 gap-2">{ALL_TAGS.map((t) => {
          const picked = mkTags.includes(t);
          return <button key={t} type="button" disabled={!picked && mkTags.length >= 3}
            onClick={() => setMkTags((ts) => picked ? ts.filter((x) => x !== t) : [...ts, t])}
            className={cn('rounded-2xl border-2 p-2 text-center transition', picked ? 'border-primary bg-primary/10 scale-105' : 'border-border bg-card', !picked && mkTags.length >= 3 && 'opacity-40')}>
            <span className="text-2xl">{CLUES[t].emoji}</span><p className="text-[10px] font-bold">{TAG_LABEL[t]}</p>
          </button>;
        })}</div>
      </section>}
      {mkTags.length === 3 && <Button size="lg" className="min-h-16 w-full text-lg" onClick={buildMystery}>🤖 Let the robot try my mystery!</Button>}
    </div>;
  }

  // ---------- Done ----------
  if (done) return <div className="space-y-4 text-center">
    <div className="flex justify-center gap-1">{[1, 2, 3].map((n) => <Star key={n} className={cn('size-12', n <= (mode === 'daily' ? (verdict?.ok ? 3 : 1) : manorStars(score)) ? 'fill-primary text-primary' : 'text-muted')} />)}</div>
    {Bubble}
    {mode === 'daily' && <p className="rounded-3xl border-2 border-primary bg-card p-4 font-display text-lg">⭐ Case of the Day stamped in your notebook!</p>}
    {newFriend && <p className="rounded-3xl border-2 border-play-coral bg-card p-4 font-display text-lg"><span className="text-4xl">{who(newFriend).emoji}</span><br />New friend! {who(newFriend).name} moved into the manor, with brand-new clues.</p>}
    {mode === 'play' && <Levels wins={wins} onPick={begin} current={level} />}
    <p className="rounded-3xl border-2 border-primary bg-card p-4 font-display text-lg">🤫 AI secret: AI can sound 100% sure and still be wrong. Smart detectives always check the clues!</p>
    <div className="flex flex-wrap justify-center gap-2">
      {mode === 'play' && <Button size="lg" onClick={again}><RotateCcw />Play again</Button>}
      <Button size="lg" variant="outline" onClick={() => { setMode('menu'); setDone(false); }}><ArrowLeft />Case menu</Button>
      {onExit && <Button size="lg" variant="outline" onClick={onExit}><ArrowLeft />All games</Button>}
    </div>
  </div>;

  // ---------- Case play (normal + daily) ----------
  return <div className="space-y-4">
    <div className="flex items-center justify-between text-sm font-bold"><span>{mode === 'daily' ? '⭐ Case of the Day' : `${LEVELS[level].emoji} ${LEVELS[level].name} · Mystery ${i + 1} of ${CASES_PER_GAME}`}</span><span>🔍 Solved: {score}</span></div>
    <section className="manor-evidence rounded-lg border-2 border-border bg-play-mint p-4">
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
    <div className="flex flex-wrap justify-center gap-2">{cast.map((s) => <div key={s.id} className="rounded-2xl border-2 border-border bg-card px-3 py-1 text-center"><span className="text-2xl">{s.emoji}</span><p className="text-xs font-bold">{s.name}</p><p className="text-[10px] text-muted-foreground">{s.traits}</p></div>)}</div>
    {allSeen && <section className="flex items-center gap-3 rounded-3xl border-2 border-play-coral bg-card p-3">
      <Robot wrong={!!verdict && !verdict.botRight} />
      <div><p className="text-xs font-bold text-muted-foreground">KNOW-IT-ALL ROBOT</p><p className="font-display text-lg">"It was {who(c.botSays).name} {who(c.botSays).emoji}! {c.botWhy}"</p></div>
    </section>}
    {Bubble}
    {allSeen && !verdict && !doubt && <div className="grid grid-cols-2 gap-2">
      <Button size="lg" className="min-h-16 text-lg" onClick={() => decide(true)}>✅ Robot is right</Button>
      <Button size="lg" variant="outline" className="min-h-16 text-lg" onClick={() => setDoubt(true)}>❌ Robot is wrong</Button>
    </div>}
    {doubt && !verdict && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{cast.map((s) => <Button key={s.id} size="lg" variant="outline" className="min-h-16 text-lg" onClick={() => decide(false, s.id)}>{s.emoji} {s.name}</Button>)}</div>}
    {verdict && <Button size="lg" className="min-h-14 w-full text-lg" onClick={next}>{mode === 'daily' ? 'Stamp my notebook' : i + 1 >= cases.length ? 'See my detective stars' : 'Next mystery'}</Button>}
  </div>;
}

function Levels({ wins, onPick, current }: { wins: number; onPick: (l: Level) => void; current?: Level }) {
  return <div className="grid gap-2 sm:grid-cols-3">{(Object.keys(LEVELS) as Level[]).map((l) => {
    const L = LEVELS[l], open = levelOpen(l, wins);
    return <Button key={l} size="lg" variant={l === (current ?? 'rookie') ? 'default' : 'outline'} disabled={!open} onClick={() => onPick(l)}
      className="flex h-auto min-h-20 flex-col gap-0.5 whitespace-normal py-2 text-center">
      <span className="text-lg">{open ? L.emoji : '🔒'} {L.name}</span>
      <span className="text-xs font-semibold">{open ? L.blurb : `Win ${L.winsNeeded - wins} more to unlock`}</span>
    </Button>;
  })}</div>;
}

function Friends({ wins }: { wins: number }) {
  const n = unlockedCount(wins);
  return <div className="rounded-2xl border-2 border-border bg-card p-3 text-center">
    <p className="text-xs font-bold text-muted-foreground">MANOR FRIENDS · win a game to meet a new one</p>
    <div className="mt-1 flex flex-wrap justify-center gap-2 text-3xl">{SUSPECTS.map((s, k) => <span key={s.id} title={k < n ? s.name : 'Locked'} className={k < n ? '' : 'opacity-30 grayscale'}>{k < n ? s.emoji : '❔'}</span>)}</div>
  </div>;
}
