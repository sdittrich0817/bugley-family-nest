import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Heart, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { at, JUMP_H, type ArtRef, type GameFile, type Grid, type Playtest, type Settings } from "@/lib/game-builder";
import { cn } from "@/lib/utils";
import sky from "@/assets/illustrations/hero-horizon.jpg";
import meadow from "@/assets/illustrations/leaves-grass.jpg";
import night from "@/assets/illustrations/night-sky.jpg";
import hills from "@/assets/illustrations/hilltop-horizon.jpg";
import kitchen from "@/assets/illustrations/kitchen-dusk.jpg";

export const BG_IMAGES: Record<Settings["background"], string | null> = { plain: null, sky, meadow, night, hills, kitchen };
export const COLOR_CLASS: Record<Settings["color"], string> = { glow: "bg-primary text-primary-foreground", sky: "bg-sky text-sky-foreground", leaf: "bg-leaf text-leaf-foreground", accent: "bg-accent text-accent-foreground" };

export function Art({ art, urls, className }: { art: ArtRef; urls: Record<string, string>; className?: string }) {
  if (art.kind === "sprite") return <span className={cn("inline-flex items-center justify-center leading-none", className)} aria-hidden>{art.value}</span>;
  const u = urls[art.id];
  return u ? <img src={u} alt="" draggable={false} className={cn("object-contain", className)} /> : <span className={cn("inline-block rounded-full bg-muted", className)} />;
}

function useLoop(fn: (dt: number) => void, running: boolean) {
  const ref = useRef(fn); ref.current = fn;
  useEffect(() => {
    if (!running) return;
    let last = performance.now(), id = 0;
    const tick = (t: number) => { ref.current(Math.min(0.05, (t - last) / 1000)); last = t; id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [running]);
}
function useKeys(map: Record<string, () => void>, on: boolean) {
  const ref = useRef(map); ref.current = map;
  useEffect(() => {
    if (!on) return;
    const h = (e: KeyboardEvent) => { const f = ref.current[e.key]; if (f) { e.preventDefault(); f(); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [on]);
}

type EngineProps = { s: Settings; urls: Record<string, string>; onEnd: (p: Omit<Playtest, "seconds">) => void; running: boolean; timeUp: boolean };

/** Plays any game file. The engines only read settings; nothing here runs child-written code. */
export function GamePlayer({ file, urls, title, onEnd, onClose }: { file: GameFile; urls: Record<string, string>; title: string; onEnd?: (p: Playtest) => void; onClose?: () => void }) {
  const s = file.settings;
  const [run, setRun] = useState(0);
  const [end, setEnd] = useState<Playtest | null>(null);
  const duration = s.timer > 0 ? Math.min(s.timer, 240) : 240;
  const [left, setLeft] = useState<number>(duration);
  const started = useRef(performance.now());
  const timed = true;
  useEffect(() => { started.current = performance.now(); setLeft(duration); setEnd(null); }, [run, duration]);
  useEffect(() => { if (end) return; const update = () => setLeft(Math.max(0, Math.ceil(duration - (performance.now() - started.current) / 1000))); const t = setInterval(update, 250); window.addEventListener('pageshow',update); document.addEventListener('visibilitychange',update); return () => { clearInterval(t);window.removeEventListener('pageshow',update);document.removeEventListener('visibilitychange',update); }; }, [duration, end, run]);
  const finish = useCallback((p: Omit<Playtest, "seconds">) => { setEnd((e) => { if (e) return e; const r = { ...p, seconds: (performance.now() - started.current) / 1000 }; onEnd?.(r); return r; }); }, [onEnd]);
  useEffect(() => { if (left === 0 && !end) finish({ won: false, score: 0, livesLost: 0 }); }, [left, end, finish]);
  const props: EngineProps = { s, urls, onEnd: finish, running: !end && left > 0, timeUp: left === 0 };
  const bg = BG_IMAGES[s.background];
  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-2"><p className="font-display text-xl">{title}</p><span className="flex items-center gap-2">{timed && <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold">⏱ {left}s</span>}{onClose && <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>}</span></div>
    <div className="relative overflow-hidden rounded-3xl border-4 border-foreground bg-card" style={bg ? { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
      <div key={run} className="relative">
        {file.template === "maze" && <Maze {...props} />}
        {file.template === "catch" && <Catch {...props} />}
        {file.template === "jump" && <Jump {...props} />}
        {file.template === "quiz" && <Quiz {...props} />}
        {file.template === "memory" && <Memory {...props} />}
        {file.template === "path" && <Path {...props} />}
      </div>
      {end && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90 p-6 text-center animate-in fade-in">
        <p className="font-display text-4xl">{end.won ? "You win!" : "Game over"}</p>
        {end.won && s.winText && <p className="text-lg">{s.winText}</p>}
        <p className="text-sm text-muted-foreground">Score {end.score} · {Math.round(end.seconds)} seconds</p>
        <Button onClick={() => setRun(run + 1)}><RotateCcw />Play again</Button>
      </div>}
    </div>
  </div>;
}

function Hud({ s, score, lives }: { s: Settings; score: number; lives: number }) {
  return <div className={cn("absolute left-2 top-2 z-10 flex items-center gap-3 rounded-full px-3 py-1 text-sm font-semibold", COLOR_CLASS[s.color])}>
    <span>⭐ {score}{s.winRule === "score" ? ` / ${s.winScore}` : ""}</span><span className="flex">{Array.from({ length: lives }, (_, i) => <Heart key={i} className="size-4 fill-current" />)}</span>
  </div>;
}
function Pad({ onDir }: { onDir: (dx: number, dy: number) => void }) {
  return <div className="mx-auto grid w-40 grid-cols-3 gap-1 p-2">
    <span /><Button size="icon" variant="secondary" aria-label="Up" onClick={() => onDir(0, -1)}><ArrowUp /></Button><span />
    <Button size="icon" variant="secondary" aria-label="Left" onClick={() => onDir(-1, 0)}><ArrowLeft /></Button><span /><Button size="icon" variant="secondary" aria-label="Right" onClick={() => onDir(1, 0)}><ArrowRight /></Button>
    <span /><Button size="icon" variant="secondary" aria-label="Down" onClick={() => onDir(0, 1)}><ArrowDown /></Button><span />
  </div>;
}

// ---------- Maze Runner ----------
function Maze({ s, urls, onEnd, running, timeUp }: EngineProps) {
  const [level, setLevel] = useState(0);
  const grid = s.grids[level] ?? s.grids[0]!;
  const startPos = useMemo(() => { const i = grid.cells.indexOf("S"); return { x: i % grid.w, y: Math.floor(i / grid.w) }; }, [grid]);
  const [pos, setPos] = useState(startPos);
  const [taken, setTaken] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0), [lives, setLives] = useState(s.lives), [shield, setShield] = useState(false);
  const [foes, setFoes] = useState(() => grid.cells.split("").flatMap((c, i) => c === "x" ? [{ x: i % grid.w, y: Math.floor(i / grid.w), d: 1 }] : []));
  const acc = useRef(0);
  useEffect(() => { setPos(startPos); setTaken(new Set()); setFoes(grid.cells.split("").flatMap((c, i) => c === "x" ? [{ x: i % grid.w, y: Math.floor(i / grid.w), d: 1 }] : [])); }, [grid, startPos]);
  useEffect(() => { if (timeUp) onEnd({ won: false, score, livesLost: s.lives - lives }); }, [timeUp]); // eslint-disable-line react-hooks/exhaustive-deps
  const hurt = () => { if (shield) { setShield(false); return; } const l = lives - 1; setLives(l); setPos(startPos); if (l <= 0) onEnd({ won: false, score, livesLost: s.lives }); };
  useLoop((dt) => {
    acc.current += dt;
    if (acc.current < 1.2 / s.speed) return; acc.current = 0;
    setFoes((fs) => fs.map((f) => { const nx = f.x + f.d; return at(grid, nx, f.y) === "#" ? { ...f, d: -f.d } : { ...f, x: nx }; }));
  }, running);
  useEffect(() => { if (running && foes.some((f) => f.x === pos.x && f.y === pos.y)) hurt(); }, [foes, pos]); // eslint-disable-line react-hooks/exhaustive-deps
  const move = (dx: number, dy: number) => {
    if (!running) return;
    const nx = pos.x + dx, ny = pos.y + dy, c = at(grid, nx, ny), i = ny * grid.w + nx;
    if (c === "#") return;
    setPos({ x: nx, y: ny });
    if (c === "o" && !taken.has(i)) { setTaken(new Set(taken).add(i)); setScore(score + 1); }
    if (c === "p" && !taken.has(i)) { setTaken(new Set(taken).add(i)); setShield(true); }
    if (c === "G" && (s.winRule !== "score" || score >= s.winScore)) {
      if (level + 1 < Math.min(s.levels, s.grids.length)) setLevel(level + 1);
      else onEnd({ won: true, score, livesLost: s.lives - lives });
    }
  };
  useKeys({ ArrowUp: () => move(0, -1), ArrowDown: () => move(0, 1), ArrowLeft: () => move(-1, 0), ArrowRight: () => move(1, 0), w: () => move(0, -1), s: () => move(0, 1), a: () => move(-1, 0), d: () => move(1, 0) }, running);
  const touch = useRef<{ x: number; y: number } | null>(null);
  return <div className="pt-10">
    <Hud s={s} score={score} lives={lives} />
    {s.levels > 1 && <span className="absolute right-2 top-2 rounded-full bg-background/80 px-2 text-sm font-semibold">Level {level + 1}</span>}
    <div className="mx-auto grid max-w-md touch-none select-none p-2" style={{ gridTemplateColumns: `repeat(${grid.w}, 1fr)` }}
      onPointerDown={(e) => { touch.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={(e) => { const t = touch.current; touch.current = null; if (!t) return; const dx = e.clientX - t.x, dy = e.clientY - t.y; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; if (Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx), 0); else move(0, Math.sign(dy)); }}>
      {grid.cells.split("").map((c, i) => { const x = i % grid.w, y = Math.floor(i / grid.w); const here = pos.x === x && pos.y === y; const foe = foes.some((f) => f.x === x && f.y === y);
        return <div key={i} className={cn("relative flex aspect-square items-center justify-center text-[min(5vw,1.5rem)]", c === "#" ? "rounded-sm bg-foreground/80" : "bg-background/40")}>
          {here ? <Art art={s.hero} urls={urls} className={cn("size-full", shield && "drop-shadow-[0_0_6px_var(--glow)]")} /> : foe ? <Art art={s.bad[0]!} urls={urls} className="size-full" /> : c === "G" ? <Art art={s.goalArt} urls={urls} className="size-full" /> : c === "o" && !taken.has(i) ? <Art art={s.good[0]!} urls={urls} className="size-4/5" /> : c === "p" && !taken.has(i) ? <span>🛡️</span> : null}
        </div>; })}
    </div>
    <Pad onDir={move} />
  </div>;
}

// ---------- Catch It ----------
type Drop = { id: number; x: number; y: number; good: boolean; art: ArtRef; power?: boolean };
function Catch({ s, urls, onEnd, running, timeUp }: EngineProps) {
  const [px, setPx] = useState(50);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [score, setScore] = useState(0), [lives, setLives] = useState(s.lives), [slow, setSlow] = useState(0);
  const spawn = useRef(0), nid = useRef(0), field = useRef<HTMLDivElement>(null), held = useRef(0);
  const stats = useRef({ score: 0, lives: s.lives }); stats.current = { score, lives };
  useEffect(() => { if (timeUp) onEnd({ won: s.winRule === "survive" ? lives > 0 : score >= s.winScore, score, livesLost: s.lives - lives }); }, [timeUp]); // eslint-disable-line react-hooks/exhaustive-deps
  useLoop((dt) => {
    if (held.current) setPx((x) => Math.min(94, Math.max(6, x + held.current * 70 * dt)));
    const fall = (14 + s.speed * 9) * (slow > 0 ? 0.5 : 1);
    if (slow > 0) setSlow((v) => Math.max(0, v - dt));
    spawn.current -= dt;
    let add: Drop[] = [];
    if (spawn.current <= 0) {
      spawn.current = Math.max(0.35, 1.3 - s.speed * 0.12 - s.difficulty * 0.1);
      const good = Math.random() > 0.25 + s.difficulty * 0.1;
      const power = s.powerups && Math.random() < 0.06;
      const list = good ? s.good : s.bad;
      add = [{ id: nid.current++, x: 6 + Math.random() * 88, y: -8, good, power, art: power ? { kind: "sprite", value: "⭐" } : list[Math.floor(Math.random() * list.length)]! }];
    }
    setDrops((ds) => {
      let sc = 0, hit = 0, pw = false;
      const keep: Drop[] = [];
      for (const d of [...ds, ...add]) {
        const y = d.y + fall * dt;
        if (y > 82 && y < 96 && Math.abs(d.x - px) < 9) { if (d.power) pw = true; else if (d.good) sc++; else hit++; continue; }
        if (y < 108) keep.push({ ...d, y });
      }
      if (sc || hit || pw) queueMicrotask(() => {
        const ns = stats.current.score + sc, nl = stats.current.lives - hit;
        if (sc) setScore(ns); if (hit) setLives(nl); if (pw) setSlow(5);
        if (nl <= 0) onEnd({ won: false, score: ns, livesLost: s.lives });
        else if (s.winRule === "score" && ns >= s.winScore) onEnd({ won: true, score: ns, livesLost: s.lives - nl });
      });
      return keep;
    });
  }, running);
  useKeys({ ArrowLeft: () => setPx((x) => Math.max(6, x - 8)), ArrowRight: () => setPx((x) => Math.min(94, x + 8)), a: () => setPx((x) => Math.max(6, x - 8)), d: () => setPx((x) => Math.min(94, x + 8)) }, running);
  const toX = (clientX: number) => { const r = field.current?.getBoundingClientRect(); if (r) setPx(Math.min(94, Math.max(6, ((clientX - r.left) / r.width) * 100))); };
  return <div>
    <Hud s={s} score={score} lives={lives} />
    {slow > 0 && <span className="absolute right-2 top-2 z-10 rounded-full bg-background/80 px-2 text-sm font-semibold">Slow-mo!</span>}
    <div ref={field} className="relative aspect-[4/5] w-full touch-none select-none overflow-hidden sm:aspect-[4/3]" onPointerMove={(e) => { if (e.buttons || e.pointerType !== "mouse") toX(e.clientX); }} onPointerDown={(e) => toX(e.clientX)}>
      {drops.map((d) => <div key={d.id} className="absolute w-[10%] -translate-x-1/2 text-[min(8vw,2.5rem)]" style={{ left: `${d.x}%`, top: `${d.y}%` }}><Art art={d.art} urls={urls} className="aspect-square w-full" /></div>)}
      <div className="absolute bottom-[4%] w-[16%] -translate-x-1/2 text-[min(12vw,3.5rem)]" style={{ left: `${px}%` }}><Art art={s.hero} urls={urls} className="aspect-square w-full" /></div>
    </div>
    <div className="flex justify-center gap-6 p-2">
      <Button size="lg" variant="secondary" aria-label="Move left" onPointerDown={() => { held.current = -1; }} onPointerUp={() => { held.current = 0; }} onPointerLeave={() => { held.current = 0; }}><ArrowLeft /></Button>
      <Button size="lg" variant="secondary" aria-label="Move right" onPointerDown={() => { held.current = 1; }} onPointerUp={() => { held.current = 0; }} onPointerLeave={() => { held.current = 0; }}><ArrowRight /></Button>
    </div>
  </div>;
}

// ---------- Jump & Dash ----------
function Jump({ s, urls, onEnd, running, timeUp }: EngineProps) {
  const [level, setLevel] = useState(0);
  const grid: Grid = s.grids[level] ?? s.grids[0]!;
  const start = useMemo(() => { const i = grid.cells.indexOf("S"); return { x: Math.max(0, i % grid.w), y: Math.max(0, Math.floor(i / grid.w)) }; }, [grid]);
  const p = useRef({ x: start.x, y: start.y, vy: 0, ground: true });
  const [, force] = useState(0);
  const [score, setScore] = useState(0), [lives, setLives] = useState(s.lives);
  const taken = useRef(new Set<number>()), stats = useRef({ score: 0, lives: s.lives }); stats.current = { score, lives };
  const [view, setView] = useState(640);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { const ro = new ResizeObserver(([e]) => setView(e!.contentRect.width)); if (box.current) ro.observe(box.current); return () => ro.disconnect(); }, []);
  useEffect(() => { p.current = { x: start.x, y: start.y, vy: 0, ground: true }; taken.current = new Set(); }, [start]);
  useEffect(() => { if (timeUp) onEnd({ won: false, score, livesLost: s.lives - lives }); }, [timeUp]); // eslint-disable-line react-hooks/exhaustive-deps
  const solid = (x: number, y: number) => at(grid, Math.floor(x), Math.floor(y)) === "#" && y >= 0;
  const hurt = () => { const l = stats.current.lives - 1; setLives(l); p.current = { x: Math.max(start.x, Math.floor(p.current.x) - 4), y: 0, vy: 0, ground: false }; if (l <= 0) onEnd({ won: false, score: stats.current.score, livesLost: s.lives }); };
  const jump = () => { if (running && p.current.ground) { p.current.vy = -11; p.current.ground = false; } };
  useKeys({ " ": jump, ArrowUp: jump, w: jump }, running);
  useLoop((dt) => {
    const q = p.current, run = 2 + s.speed;
    const nx = q.x + run * dt;
    if (!solid(nx + 0.8, q.y + 0.5) && !solid(nx + 0.8, q.y + 0.1)) q.x = nx;
    q.vy = Math.min(18, q.vy + 30 * dt);
    let ny = q.y + q.vy * dt;
    if (q.vy > 0 && (solid(q.x + 0.15, ny + 1) || solid(q.x + 0.75, ny + 1))) { ny = Math.floor(ny + 1) - 1; q.vy = 0; q.ground = true; } else q.ground = false;
    if (q.vy < 0 && (solid(q.x + 0.15, ny) || solid(q.x + 0.75, ny))) { q.vy = 0; ny = Math.floor(ny) + 1; }
    q.y = ny;
    if (q.y > grid.h) return hurt();
    for (const [cx, cy] of [[q.x + 0.4, q.y + 0.5]]) {
      const tx = Math.floor(cx!), ty = Math.floor(cy!), c = at(grid, tx, ty), i = ty * grid.w + tx;
      if (c === "x") return hurt();
      if (c === "o" && !taken.current.has(i)) { taken.current.add(i); setScore((v) => v + 1); }
      if (c === "G" && (s.winRule !== "score" || stats.current.score >= s.winScore)) {
        if (level + 1 < Math.min(s.levels, s.grids.length)) { setLevel(level + 1); return; }
        return onEnd({ won: true, score: stats.current.score, livesLost: s.lives - stats.current.lives });
      }
    }
    force((n) => n + 1);
  }, running);
  const tile = Math.max(28, Math.min(56, view / 12));
  const cam = Math.max(0, Math.min(grid.w * tile - view, p.current.x * tile - view * 0.3));
  return <div onPointerDown={jump} className="touch-none select-none">
    <Hud s={s} score={score} lives={lives} />
    <div ref={box} className="relative w-full overflow-hidden" style={{ height: tile * JUMP_H }}>
      <div className="absolute left-0 top-0" style={{ transform: `translateX(${-cam}px)`, width: grid.w * tile, height: grid.h * tile }}>
        {grid.cells.split("").map((c, i) => { if (c === "." || c === "S") return null; const x = i % grid.w, y = Math.floor(i / grid.w); if (c === "o" && taken.current.has(i)) return null;
          return <div key={i} className={cn("absolute flex items-center justify-center", c === "#" && cn("rounded-sm border border-foreground/40", COLOR_CLASS[s.color]))} style={{ left: x * tile, top: y * tile, width: tile, height: tile, fontSize: tile * 0.75 }}>
            {c === "o" ? <Art art={s.good[0]!} urls={urls} className="size-4/5" /> : c === "x" ? <Art art={s.bad[0]!} urls={urls} className="size-full" /> : c === "G" ? <Art art={s.goalArt} urls={urls} className="size-full" /> : null}
          </div>; })}
        <div className="absolute" style={{ left: p.current.x * tile, top: p.current.y * tile, width: tile, height: tile, fontSize: tile * 0.85 }}><Art art={s.hero} urls={urls} className="size-full" /></div>
      </div>
    </div>
    <p className="p-2 text-center text-sm font-semibold">Tap anywhere or press Space to jump!</p>
  </div>;
}

// ---------- Quiz Show ----------
function Quiz({ s, onEnd, running }: EngineProps) {
  const qs = s.quiz.filter((q) => q.q.trim() && q.answers.filter((a) => a.trim()).length >= 2);
  const [i, setI] = useState(0), [score, setScore] = useState(0), [picked, setPicked] = useState<number | null>(null);
  if (!qs.length) return <p className="p-10 text-center">Add a question first!</p>;
  const q = qs[i]!;
  return <div className="space-y-4 bg-background/85 p-6">
    <p className="text-sm font-semibold">Question {i + 1} of {qs.length} · Score {score}</p>
    <p className="font-display text-2xl">{q.q}</p>
    <div className="grid gap-2 sm:grid-cols-2">{q.answers.map((a, k) => a.trim() && <Button key={k} size="lg" disabled={!running || picked !== null} variant={picked === null ? "outline" : k === q.correct ? "primary" : picked === k ? "destructive" : "outline"} className="h-auto whitespace-normal py-3" onClick={() => { setPicked(k); if (k === q.correct) setScore(score + 1); }}>{a}</Button>)}</div>
    {picked !== null && <div className="flex items-center justify-between"><p className="font-semibold">{picked === q.correct ? "Correct!" : `The answer was: ${q.answers[q.correct]}`}</p><Button onClick={() => { const sc = score; if (i + 1 >= qs.length) onEnd({ won: sc >= Math.ceil(qs.length / 2), score: sc, livesLost: 0 }); else { setI(i + 1); setPicked(null); } }}>{i + 1 >= qs.length ? "Finish" : "Next"}</Button></div>}
  </div>;
}

// ---------- Memory Match ----------
function Memory({ s, urls, onEnd, running, timeUp }: EngineProps) {
  const deck = useMemo(() => { const cards = s.cards.slice(0, 12); return [...cards, ...cards].map((art, i) => ({ k: i % cards.length, art, r: Math.random() })).sort((a, b) => a.r - b.r); }, [s.cards]);
  const [open, setOpen] = useState<number[]>([]), [done, setDone] = useState<Set<number>>(new Set()), [moves, setMoves] = useState(0);
  useEffect(() => { if (timeUp) onEnd({ won: false, score: done.size, livesLost: 0 }); }, [timeUp]); // eslint-disable-line react-hooks/exhaustive-deps
  if (s.cards.length < 2) return <p className="p-10 text-center">Pick at least 2 pictures first!</p>;
  const flip = (i: number) => {
    if (!running || open.includes(i) || done.has(deck[i]!.k) || open.length === 2) return;
    const next = [...open, i]; setOpen(next);
    if (next.length === 2) {
      setMoves(moves + 1);
      const [a, b] = next.map((n) => deck[n]!.k);
      setTimeout(() => {
        if (a === b) { const d = new Set(done).add(a!); setDone(d); if (d.size === s.cards.slice(0, 12).length) onEnd({ won: true, score: d.size, livesLost: 0 }); }
        setOpen([]);
      }, a === b ? 300 : 800);
    }
  };
  const cols = deck.length > 16 ? "grid-cols-6" : deck.length > 8 ? "grid-cols-4" : "grid-cols-3";
  return <div className="space-y-2 p-4">
    <p className="rounded-full bg-background/80 px-3 py-1 text-center text-sm font-semibold">Pairs {done.size} / {s.cards.slice(0, 12).length} · Moves {moves}</p>
    <div className={cn("mx-auto grid max-w-lg gap-2", cols)}>{deck.map((c, i) => { const shown = open.includes(i) || done.has(c.k);
      return <button key={i} onClick={() => flip(i)} aria-label={shown ? "Card" : "Hidden card"} className={cn("flex aspect-square items-center justify-center rounded-xl border-2 border-foreground text-4xl transition", shown ? "bg-card" : COLOR_CLASS[s.color], done.has(c.k) && "opacity-60")}>
        {shown ? <Art art={c.art} urls={urls} className="size-4/5" /> : "?"}</button>; })}</div>
  </div>;
}

// ---------- Choose Your Path ----------
function Path({ s, onEnd, running }: EngineProps) {
  const first = s.path.find((n) => n.id === "start") ?? s.path[0];
  const [id, setId] = useState(first?.id ?? "");
  const [steps, setSteps] = useState(0);
  const node = s.path.find((n) => n.id === id);
  if (!node) return <p className="p-10 text-center">Write the first page first!</p>;
  const choices = node.choices.filter((c) => c.text.trim() && s.path.some((n) => n.id === c.to));
  return <div className="space-y-4 bg-background/85 p-6">
    <p className="whitespace-pre-wrap break-words text-lg leading-relaxed">{node.text || "…"}</p>
    {choices.length ? <div className="grid gap-2">{choices.map((c, k) => <Button key={k} size="lg" variant="outline" disabled={!running} className="h-auto justify-start whitespace-normal py-3 text-left" onClick={() => { setSteps(steps + 1); setId(c.to); }}>{c.text}</Button>)}</div>
      : <Button onClick={() => onEnd({ won: true, score: steps, livesLost: 0 })}>The End</Button>}
  </div>;
}
