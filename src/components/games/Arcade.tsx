import { useScrollTopOn } from "@/lib/scroll";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, Lock, Play as PlayIcon, RotateCcw, Sparkles, Trophy, Users, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bugley } from "@/components/brand/Bugley";
import { ChildAvatar } from "@/components/site/ChildAvatar";
import { speak } from "@/components/studio/Sidekick";
import { answerItem, finishRound, getArcade, startRound } from "@/lib/games.functions";
import { GAMES, BONUS_GLOW_DAILY_CAP, canPlay, type Band, type GameKey } from "@/lib/games";
import { getStripeEnvironment } from "@/lib/stripe";
import { cn } from "@/lib/utils";

type Kid = { id: string; nickname: string; age_band: string; bugley_stage: "grub" | "hatchling" | "scout" | "engineer" | "navigator"; avatar: any; bug?: any };
type Round = Awaited<ReturnType<typeof startRound>>;
type Item = Round["items"][number];
type Player = { kid: Kid; round: Round; idx: number };
type Result = Awaited<ReturnType<typeof finishRound>> & { kid: Kid };
const SPARKS_PER_STAGE = 50;

export function Arcade({ child, family, builder }: { child: Kid; family: Kid[]; builder?: React.ReactNode }) {
  const qc = useQueryClient();
  const key = ["arcade", child.id];
  const { data } = useQuery({ queryKey: key, queryFn: () => getArcade({ data: { childId: child.id } }) });
  const [game, setGame] = useState<GameKey | null>(null);
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [results, setResults] = useState<Result[] | null>(null); useScrollTopOn(`${game}|${!!players}|${!!results}`);
  const sprouts = child.age_band === "sprouts";
  const reset = () => { setPlayers(null); setResults(null); void qc.invalidateQueries({ queryKey: key }); void qc.invalidateQueries({ queryKey: ["glow", child.id] }); };

  if (results) return <Results results={results} onAgain={() => { setResults(null); }} onHome={() => { reset(); setGame(null); }} />;
  if (players) return <Play players={players} onDone={(r) => { setPlayers(null); setResults(r); }} />;
  if (game && data) return <Setup child={child} family={family} game={game} info={data.games.find((g) => g.key === game)!} onBack={() => setGame(null)} onStart={setPlayers} />;

  return <div className="space-y-8">
    <div className="flex flex-wrap items-center gap-4">
      <Bugley stage={child.bugley_stage} expression="celebrating" glow size={sprouts ? 110 : 84} />
      <div><h1 className={sprouts ? "text-4xl" : "text-3xl"}>Bugley’s Arcade</h1><p className="text-muted-foreground">Short games that make you an AI detective.</p></div>
    </div>
    {data && <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl bg-card p-4 shadow-soft"><p className="text-sm font-semibold">Toward Bugley’s next stage</p><div className="mt-2 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${((data.sparks % SPARKS_PER_STAGE) / SPARKS_PER_STAGE) * 100}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">{data.sparks} sparks earned</p></div>
      <div className="rounded-2xl bg-card p-4 shadow-soft"><p className="text-sm font-semibold">Bonus glow from games today</p><p className="font-display text-2xl">{data.bonusToday} / {BONUS_GLOW_DAILY_CAP}</p></div>
      <div className="rounded-2xl bg-card p-4 shadow-soft"><p className="text-sm font-semibold">Game badges</p><p className="text-xs text-muted-foreground">{data.badges.length ? data.badges.map((b) => b.badge).join(" · ") : "Play a round to earn your first!"}</p></div>
    </div>}
    <section className="space-y-4">
      <h2 className="text-2xl">Play</h2>
      <div className="grid gap-4 sm:grid-cols-2">{(Object.keys(GAMES) as GameKey[]).map((k) => {
        const g = GAMES[k]; const info = data?.games.find((x) => x.key === k);
        const ok = canPlay(k, child.age_band as Band);
        const ready = !!info?.levels.length;
        return <button key={k} disabled={!ok || !ready} onClick={() => setGame(k)} className={cn("group flex flex-col items-start gap-2 rounded-3xl border-2 border-border bg-card p-5 text-left shadow-soft transition", ok && ready && "hover:-translate-y-1 hover:border-primary hover:shadow-glow", (!ok || !ready) && "opacity-60")}>
          <span className="text-4xl" aria-hidden>{g.emoji}</span>
          <span className="font-display text-xl">{g.name}</span>
          <span className="text-sm text-muted-foreground">{g.blurb}</span>
          <span className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-muted px-2 py-0.5">{g.ages}</span>{ok && ready && <span className="rounded-full bg-primary/25 px-2 py-0.5">Level {info!.unlocked}</span>}{!ok && <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"><Lock className="size-3" />For {g.ages.toLowerCase()}</span>}{ok && !ready && <span className="rounded-full bg-muted px-2 py-0.5">Bugley is getting this ready</span>}</span>
          {info && info.scoreboard.length > 0 && <span className="mt-1 w-full border-t border-border pt-2 text-xs"><span className="font-semibold">Family scoreboard:</span> {info.scoreboard.slice(0, 5).map((s) => `${s.nickname} ${s.best}%`).join(" · ")}</span>}
        </button>;
      })}</div>
    </section>
    {builder}
    <p className="text-center text-sm text-muted-foreground">Only your family sees scores. No ads, no prizes to buy.</p>
  </div>;
}

function Setup({ child, family, game, info, onBack, onStart }: { child: Kid; family: Kid[]; game: GameKey; info: { levels: number[]; unlocked: number }; onBack: () => void; onStart: (p: Player[]) => void }) {
  const levels = info.levels.filter((l) => l <= info.unlocked);
  const [level, setLevel] = useState(levels.at(-1) ?? 1);
  const [pass, setPass] = useState(false);
  const eligible = family.filter((k) => canPlay(game, k.age_band as Band));
  const [picked, setPicked] = useState<string[]>([child.id]);
  const [busy, setBusy] = useState(false);
  const g = GAMES[game];
  async function go() {
    setBusy(true);
    try {
      const who = pass ? eligible.filter((k) => picked.includes(k.id)) : [child];
      const list: Player[] = [];
      for (const kid of who) {
        try { list.push({ kid, idx: 0, round: await startRound({ data: { childId: kid.id, game, level: kid.id === child.id ? level : 1, environment: getStripeEnvironment() } }) }); }
        catch (e) { if (kid.id === child.id) throw e; }
      }
      onStart(list);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Oops! Try again."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <Button variant="ghost" onClick={onBack}><ArrowLeft />Arcade</Button>
    <div><span className="text-5xl" aria-hidden>{g.emoji}</span><h1 className="text-3xl">{g.name}</h1><p className="text-muted-foreground">{g.blurb} Rounds take about 4 minutes.</p></div>
    <section className="space-y-2"><h2 className="text-xl">Level</h2><div className="flex flex-wrap gap-2">{[1, 2, 3].map((l) => { const has = info.levels.includes(l); const open = has && l <= info.unlocked; return <Button key={l} variant={level === l ? "primary" : "outline"} disabled={!open} aria-pressed={level === l} onClick={() => setLevel(l)}>{!open && <Lock />}Level {l}</Button>; })}</div><p className="text-sm text-muted-foreground">Get 7 out of 10 right to unlock the next level.</p></section>
    <section className="space-y-2"><h2 className="text-xl">Who’s playing?</h2><div className="flex gap-2"><Button variant={!pass ? "primary" : "outline"} onClick={() => setPass(false)}>Just me</Button><Button variant={pass ? "primary" : "outline"} disabled={eligible.length < 2} onClick={() => setPass(true)}><Users />Pass and play</Button></div>
      {pass && <div className="flex flex-wrap gap-2">{eligible.map((k) => <Button key={k.id} variant={picked.includes(k.id) ? "primary" : "outline"} className="h-auto py-2" disabled={k.id === child.id} onClick={() => setPicked(picked.includes(k.id) ? picked.filter((x) => x !== k.id) : [...picked, k.id])}><ChildAvatar avatar={k.bug ?? k.avatar} seed={k.id} className="size-8" />{k.nickname}</Button>)}</div>}
      {pass && <p className="text-sm text-muted-foreground">Take turns on this device. Each player gets their own questions.</p>}
    </section>
    <Button size="lg" disabled={busy || (pass && picked.length < 2)} onClick={() => void go()}><PlayIcon />{busy ? "Getting ready…" : "Start"}</Button>
  </div>;
}

function Play({ players: initial, onDone }: { players: Player[]; onDone: (r: Result[]) => void }) {
  const [players, setPlayers] = useState(initial);
  const [turn, setTurn] = useState(0);
  const [handoff, setHandoff] = useState(initial.length > 1);
  const [feedback, setFeedback] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const finishing = useRef(false);
  const endsAt = Math.min(...players.map((p) => new Date(p.round.endsAt).getTime()));
  const left = Math.max(0, Math.round((endsAt - now) / 1000));
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  async function finish() {
    if (finishing.current) return; finishing.current = true;
    const out: Result[] = [];
    for (const p of players) { try { out.push({ ...(await finishRound({ data: { childId: p.kid.id, roundId: p.round.roundId } })), kid: p.kid }); } catch { /* already finished */ } }
    onDone(out);
  }
  useEffect(() => { if (left === 0) void finish(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  const p = players[turn]!;
  const item = p.round.items[p.idx];
  const sprouts = p.kid.age_band === "sprouts";
  async function answer(payload: { choice?: string; plan?: string[]; sorted?: Record<string, string> }) {
    if (!item) return;
    try {
      const r = await answerItem({ data: { childId: p.kid.id, roundId: p.round.roundId, itemId: item.id, ...payload } });
      if (r.timeUp) return void finish();
      setFeedback(r);
      const say = (r as any).clue || (r as any).line || (r as any).result;
      if (sprouts && say) speak(say);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Oops! Try again."); }
  }
  function next() {
    const updated = players.map((x, i) => i === turn ? { ...x, idx: x.idx + 1 } : x);
    setPlayers(updated); setFeedback(null);
    const remaining = updated.map((x, i) => [x, i] as const).filter(([x]) => x.idx < x.round.items.length);
    if (!remaining.length) return void finish();
    const nextTurn = remaining.find(([, i]) => i > turn)?.[1] ?? remaining[0]![1];
    if (nextTurn !== turn) { setTurn(nextTurn); setHandoff(true); }
  }
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  const game = p.round.game as GameKey;
  return <div className={cn("space-y-5", `skin-${p.kid.age_band}`)}>
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3 shadow-soft">
      <span className="flex items-center gap-2 font-semibold"><ChildAvatar avatar={p.kid.bug ?? p.kid.avatar} seed={p.kid.id} className="size-8" />{p.kid.nickname} · {GAMES[game].name} · Level {p.round.level}</span>
      <span className="text-sm">{Math.min(p.idx + 1, p.round.items.length)} / {p.round.items.length} · ⏱ {mm}</span>
      <Button size="icon" variant="ghost" aria-label="End round" onClick={() => void finish()}><X /></Button>
    </div>
    {handoff ? <div className="flex flex-col items-center gap-4 rounded-3xl bg-card p-10 text-center shadow-soft"><ChildAvatar avatar={p.kid.bug ?? p.kid.avatar} seed={p.kid.id} className="size-24" /><h2 className="text-3xl">Pass to {p.kid.nickname}!</h2><Button size="lg" onClick={() => setHandoff(false)}>I’m {p.kid.nickname}. Let’s go!</Button></div>
      : item && <>
        {game === "real_robot" && <RealRobot item={item as any} feedback={feedback} onAnswer={(choice) => void answer({ choice })} big={sprouts} />}
        {game === "fact_fib" && <FactFib item={item as any} feedback={feedback} onAnswer={(choice) => void answer({ choice })} stage={p.kid.bugley_stage} big={sprouts} />}
        {game === "robot_chef" && <RobotChef key={item.id} item={item as any} feedback={feedback} onRun={(plan) => void answer({ plan })} onRetry={() => setFeedback(null)} big={sprouts} />}
        {game === "train_bugley" && <TrainBugley key={item.id} item={item as any} feedback={feedback} onTest={(sorted) => void answer({ sorted })} stage={p.kid.bugley_stage} />}
        {feedback && (game !== "robot_chef" || feedback.done) && <div className="flex justify-center"><Button size="lg" onClick={next}>Next</Button></div>}
      </>}
  </div>;
}

function Choice({ a, b, onPick, disabled, big }: { a: [string, string]; b: [string, string]; onPick: (v: string) => void; disabled: boolean; big: boolean }) {
  return <div className="grid grid-cols-2 gap-3">{[a, b].map(([v, label]) => <Button key={v} size="lg" disabled={disabled} className={cn("h-auto whitespace-normal py-4", big && "py-6 text-xl")} onClick={() => onPick(v)}>{label}</Button>)}</div>;
}
function Clue({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <div className={cn("animate-in fade-in rounded-2xl border-2 p-4", ok ? "border-primary bg-primary/15" : "border-border bg-muted")} role="status"><p className="font-display text-lg">{ok ? "You got it!" : "Not quite!"}</p><div className="mt-1">{children}</div></div>;
}

function RealRobot({ item, feedback, onAnswer, big }: { item: { id: string; image: string }; feedback: any; onAnswer: (c: string) => void; big: boolean }) {
  const start = useRef<number | null>(null);
  const [dx, setDx] = useState(0);
  return <div className="space-y-4">
    <p className="text-center font-display text-xl">Real photo or robot-made?</p>
    <div className="relative mx-auto max-w-md touch-pan-y select-none overflow-hidden rounded-3xl bg-muted shadow-soft" style={{ transform: `translateX(${dx}px) rotate(${dx / 30}deg)` }}
      onPointerDown={(e) => { if (!feedback) start.current = e.clientX; }} onPointerMove={(e) => { if (start.current !== null) setDx(e.clientX - start.current); }}
      onPointerUp={() => { if (start.current !== null && Math.abs(dx) > 90) onAnswer(dx < 0 ? "real" : "robot"); start.current = null; setDx(0); }}>
      {item.image ? <img src={item.image} alt="Is this real or robot-made?" draggable={false} className="aspect-square w-full object-cover" /> : <div className="aspect-square" />}
    </div>
    <p className="text-center text-xs text-muted-foreground">Swipe left for real, right for robot-made, or tap a button.</p>
    <Choice a={["real", "📷 Real photo"]} b={["robot", "🤖 Robot-made"]} onPick={onAnswer} disabled={!!feedback} big={big} />
    {feedback && <Clue ok={feedback.correct}><p>It was {feedback.answer === "real" ? "a real photo" : "robot-made"}. {feedback.clue}</p></Clue>}
  </div>;
}

function FactFib({ item, feedback, onAnswer, stage, big }: { item: { statement: string; clues: { kind: string; title: string; text: string }[] }; feedback: any; onAnswer: (c: string) => void; stage: Kid["bugley_stage"]; big: boolean }) {
  const [open, setOpen] = useState<number[]>([]);
  const icon = { map: "🗺️", book: "📖", chart: "📊" } as Record<string, string>;
  return <div className="space-y-4">
    <div className="flex items-start gap-3"><Bugley stage={stage} expression={feedback ? (feedback.answer === "fib" ? "oops" : "happy") : "curious"} size={80} /><div className="flex-1 rounded-3xl rounded-tl-none bg-card p-4 shadow-soft"><p className="font-display text-xl">“{item.statement}”</p><p className="mt-1 text-xs text-muted-foreground">Bugley sounds very sure…</p><Button size="sm" variant="ghost" onClick={() => speak(item.statement)}><Volume2 />Hear it</Button></div></div>
    <div className="grid gap-3 sm:grid-cols-2">{item.clues.map((c, i) => <button key={i} onClick={() => setOpen([...open, i])} className="rounded-2xl border-2 border-dashed border-border bg-card p-4 text-left">
      <span className="font-semibold">{icon[c.kind] ?? "🔎"} {c.title}</span>{open.includes(i) ? <p className="mt-1 text-sm">{c.text}</p> : <p className="mt-1 text-sm text-muted-foreground">Tap to check this clue</p>}</button>)}</div>
    <Choice a={["fact", "✅ Fact"]} b={["fib", "🙃 Fib"]} onPick={onAnswer} disabled={!!feedback} big={big} />
    {feedback && <Clue ok={feedback.correct}><p className="font-semibold">{feedback.line}</p><p className="text-sm">{feedback.explain}</p></Clue>}
  </div>;
}

function ChefBolt({ mood }: { mood: "idle" | "ok" | "oops" }) {
  return <svg viewBox="0 0 120 130" className={cn("mx-auto size-32", mood === "oops" && "animate-bounce")} role="img" aria-label="Chef Bolt the cartoon robot">
    <rect x="38" y="6" width="44" height="22" rx="10" className="fill-card stroke-foreground" strokeWidth="3" />
    <rect x="24" y="26" width="72" height="50" rx="16" className="fill-secondary stroke-foreground" strokeWidth="3" />
    <circle cx="46" cy="50" r="7" className="fill-card stroke-foreground" strokeWidth="2.5" /><circle cx="74" cy="50" r="7" className="fill-card stroke-foreground" strokeWidth="2.5" />
    <circle cx="46" cy="50" r="3" className="fill-foreground" /><circle cx="74" cy="50" r="3" className="fill-foreground" />
    <path d={mood === "oops" ? "M48 67 Q60 60 72 67" : "M48 63 Q60 72 72 63"} className="stroke-foreground" fill="none" strokeWidth="3" strokeLinecap="round" />
    <rect x="34" y="80" width="52" height="38" rx="10" className="fill-primary stroke-foreground" strokeWidth="3" />
    <path d="M34 92 L14 104 M86 92 L106 104" className="stroke-foreground" strokeWidth="5" strokeLinecap="round" />
  </svg>;
}
function RobotChef({ item, feedback, onRun, onRetry, big }: { item: { task: string; cards: { id: string; text: string }[]; steps: number }; feedback: any; onRun: (plan: string[]) => void; onRetry: () => void; big: boolean }) {
  const [plan, setPlan] = useState<string[]>([]);
  const text = (id: string) => item.cards.find((c) => c.id === id)?.text ?? "";
  const move = (i: number, to: number) => { const n = [...plan]; const [x] = n.splice(i, 1); n.splice(to, 0, x!); setPlan(n); };
  const locked = !!feedback;
  return <div className="space-y-4">
    <ChefBolt mood={!feedback ? "idle" : feedback.ok ? "ok" : "oops"} />
    <p className="text-center font-display text-xl">Help Chef Bolt: {item.task}</p>
    <p className="text-center text-sm text-muted-foreground">Chef Bolt does exactly what the cards say, nothing more!</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <section className="space-y-2"><h3 className="font-semibold">Instruction cards</h3>{item.cards.filter((c) => !plan.includes(c.id)).map((c) => <button key={c.id} disabled={locked} onClick={() => setPlan([...plan, c.id])} className={cn("block w-full rounded-xl border-2 border-border bg-card p-3 text-left hover:border-primary", big && "text-lg")}>+ {c.text}</button>)}</section>
      <section className="space-y-2"><h3 className="font-semibold">Chef Bolt’s steps</h3>{!plan.length && <p className="text-sm text-muted-foreground">Tap cards to add steps.</p>}
        <ol className="space-y-2">{plan.map((id, i) => <li key={id} className={cn("flex items-center gap-1 rounded-xl border-2 bg-card p-2", feedback && !feedback.ok && feedback.at === i ? "border-destructive" : "border-border")}><span className="w-6 text-center font-display">{i + 1}</span><span className="flex-1">{text(id)}</span>
          <Button size="icon" variant="ghost" aria-label="Move up" disabled={locked || !i} onClick={() => move(i, i - 1)}><ArrowUp /></Button><Button size="icon" variant="ghost" aria-label="Move down" disabled={locked || i === plan.length - 1} onClick={() => move(i, i + 1)}><ArrowDown /></Button><Button size="icon" variant="ghost" aria-label="Remove step" disabled={locked} onClick={() => setPlan(plan.filter((x) => x !== id))}><X /></Button></li>)}</ol></section>
    </div>
    {!feedback ? <div className="flex justify-center"><Button size="lg" disabled={!plan.length} onClick={() => onRun(plan)}><PlayIcon />Run Chef Bolt</Button></div>
      : <Clue ok={feedback.ok}><p className="font-semibold">{feedback.result}</p>{!feedback.ok && !feedback.done && <><p className="text-sm">Fix the order or add a step. {feedback.triesLeft} tries left.</p><Button className="mt-2" variant="secondary" onClick={onRetry}><RotateCcw />Fix my steps</Button></>}{!feedback.ok && feedback.done && <p className="text-sm">Good try! Robots need every single step.</p>}</Clue>}
  </div>;
}

function TrainBugley({ item, feedback, onTest, stage }: { item: { task: string; groups: string[]; twist: boolean; examples: { id: string; emoji: string; name: string }[] }; feedback: any; onTest: (s: Record<string, string>) => void; stage: Kid["bugley_stage"] }) {
  const [sorted, setSorted] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState<string | null>(null);
  const unsorted = item.examples.filter((e) => !sorted[e.id]);
  const Card = ({ e }: { e: { id: string; emoji: string; name: string } }) => <div draggable={!feedback} onDragStart={() => setDrag(e.id)} className="flex items-center gap-2 rounded-xl border-2 border-border bg-card p-2">
    <span className="text-3xl" aria-hidden>{e.emoji}</span><span className="flex-1 text-sm">{e.name}</span>
    {!feedback && <span className="flex gap-1">{item.groups.map((g) => <Button key={g} size="sm" variant={sorted[e.id] === g ? "primary" : "outline"} onClick={() => setSorted({ ...sorted, [e.id]: g })}>{g}</Button>)}</span>}
  </div>;
  return <div className="space-y-4">
    <div className="flex items-center gap-3"><Bugley stage={stage} expression={feedback ? (feedback.correct ? "celebrating" : "oops") : "curious"} size={80} /><div><p className="font-display text-xl">{item.task}</p><p className="text-sm text-muted-foreground">Drag or tap each example into a group. Bugley learns only from you!</p></div></div>
    {unsorted.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{unsorted.map((e) => <Card key={e.id} e={e} />)}</div>}
    <div className="grid grid-cols-2 gap-3">{item.groups.map((g) => <div key={g} onDragOver={(ev) => ev.preventDefault()} onDrop={() => { if (drag && !feedback) setSorted({ ...sorted, [drag]: g }); setDrag(null); }} className="min-h-32 space-y-2 rounded-2xl border-2 border-dashed border-primary/60 bg-primary/10 p-3">
      <p className="font-display">{g}</p>{item.examples.filter((e) => sorted[e.id] === g).map((e) => <Card key={e.id} e={e} />)}</div>)}</div>
    {!feedback ? <div className="flex justify-center"><Button size="lg" disabled={!!unsorted.length} onClick={() => onTest(sorted)}><Sparkles />Test Bugley</Button></div>
      : <Clue ok={feedback.correct}><p className="font-semibold">{feedback.line}</p><ul className="mt-2 space-y-1 text-sm">{feedback.results.map((r: any, i: number) => <li key={i}>{r.emoji} {r.name}: Bugley guessed <strong>{r.guess ?? "no idea"}</strong> {r.correct ? "✅" : `❌ (it’s ${r.answer})`}</li>)}</ul></Clue>}
  </div>;
}

function Results({ results, onAgain, onHome }: { results: Result[]; onAgain: () => void; onHome: () => void }) {
  const learned = results[0]?.learned;
  const best = useMemo(() => [...results].sort((a, b) => b.score / b.total - a.score / a.total), [results]);
  return <div className="space-y-6 text-center">
    <Bugley stage={results[0]?.kid.bugley_stage ?? "grub"} expression="celebrating" glow size={110} />
    <h1 className="text-3xl">Round complete!</h1>
    <div className="grid gap-3 sm:grid-cols-2">{best.map((r) => <div key={r.kid.id} className="rounded-3xl bg-card p-5 shadow-soft">
      <p className="flex items-center justify-center gap-2 font-display text-xl"><ChildAvatar avatar={r.kid.bug ?? r.kid.avatar} seed={r.kid.id} className="size-8" />{r.kid.nickname}</p>
      <p className="mt-2 font-display text-4xl">{r.score} / {r.total}</p>
      {r.newBadges.map((b) => <p key={b} className="mt-2 flex items-center justify-center gap-1 text-sm font-semibold"><Trophy className="size-4" />New badge: {b}</p>)}
      {r.unlockedLevel && <p className="mt-1 text-sm font-semibold">Level {r.unlockedLevel} unlocked!</p>}
      {r.bonus > 0 && <p className="mt-1 text-sm font-semibold">+{r.bonus} bonus glow for a perfect round!</p>}
    </div>)}</div>
    {learned && <div className="rounded-2xl border-2 border-primary bg-primary/10 p-4"><p className="text-sm font-semibold">What you learned</p><p className="font-display text-lg">{learned}</p></div>}
    <div className="flex flex-wrap justify-center gap-3"><Button onClick={onAgain}><RotateCcw />Play again</Button><Button variant="outline" onClick={onHome}>Back to the Arcade</Button><Button variant="ghost" asChild><Link to="/kids/studio">Studio</Link></Button></div>
  </div>;
}
