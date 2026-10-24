import { useScrollTopOn } from "@/lib/scroll";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Dices, Play, Plus, Save, Share2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bugley } from "@/components/brand/Bugley";
import { PictureMaker } from "@/components/studio/Makers";
import { useBugleyChat, useVoiceInput, speak, type SidekickChild } from "@/components/studio/Sidekick";
import { listCast } from "@/lib/images.functions";
import { listAlbum } from "@/lib/studio.functions";
import { designInterview, getGame, saveGame } from "@/lib/game-builder.functions";
import { BACKGROUNDS, BIG_IDEA, COLORS, SPRITES, TEMPLATES, coachNote, defaultSettings, generateJump, generateMaze, isAdvanced, setAt, templatesFor, type ArtRef, type CoachNote, type GameFile, type Grid, type Settings, type TemplateKey } from "@/lib/game-builder";
import type { Band } from "@/lib/games";
import { getStripeEnvironment } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import { Art, BG_IMAGES, COLOR_CLASS, GamePlayer } from "./engines";
import { SafeRetry } from '../studio/SafeRetry';

const field = "w-full rounded-lg border-2 border-border bg-background p-3 text-foreground outline-none focus:border-primary";
const QUESTIONS = [["hero", "Who’s the hero?"], ["goal", "What’s their goal?"], ["obstacle", "What gets in the way?"], ["win", "How do you win?"]] as const;

export function GameBuilder({ child, gameId, onClose }: { child: SidekickChild; gameId: string | null; onClose: () => void }) {
  const band = child.age_band as Band;
  const sprouts = band === "sprouts", adv = isAdvanced(band);
  const qc = useQueryClient();
  const chat = useBugleyChat(child, "Game Builder", "Let’s design a game!", []);
  const [id, setId] = useState(gameId);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<GameFile | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"pick" | "interview" | "edit">(gameId ? "edit" : "pick"); useScrollTopOn(step);
  const [answers, setAnswers] = useState({ hero: "", goal: "", obstacle: "", win: "" });
  const [questionAt,setQuestionAt]=useState(0),[templatePage,setTemplatePage]=useState(0);
  const question=QUESTIONS[questionAt]??QUESTIONS[0];
  const voice=useVoiceInput(text=>setAnswers({...answers,[question[0]]:text}));
  useScrollTopOn(questionAt);
  useEffect(()=>{if(step==='interview')chat.say(question[1],[]);},[step,questionAt]);
  const [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false);
  const [testing, setTesting] = useState(false);
  const [note, setNote] = useState<CoachNote | null>(null);
  const [slot, setSlot] = useState<null | { key: "hero" | "goalArt" | "good" | "bad" | "cards"; index: number }>(null);
  const [making, setMaking] = useState(false);
  const [editAt,setEditAt]=useState(0);
  useScrollTopOn(editAt);
  const env = getStripeEnvironment();
  useEffect(() => { if (!gameId) return; setBusy(true); void getGame({ data: { childId: child.id, id: gameId } }).then((g) => { setTitle(g.title); setFile(g.file); setUrls(g.urls); }).catch((e) => toast.error(e.message)).finally(() => setBusy(false)); }, [gameId, child.id]);
  const set = (patch: Partial<Settings>) => { if (!file) return; setFile({ ...file, settings: { ...file.settings, ...patch } }); setDirty(true); };
  const s = file?.settings;

  async function save(published?: boolean) {
    if (!file || !title.trim()) { toast.error("Give your game a name first."); return; }
    setBusy(true);
    try {
      const g = await saveGame({ data: { childId: child.id, id: id ?? undefined, title, file: { ...file, published: published ?? file.published }, environment: env } });
      setId(g.id); setFile(g.file); setUrls(g.urls); setDirty(false);
      toast.success(published ? "Shared to the Family Arcade!" : published === false ? "Taken out of the Family Arcade" : "Saved!");
      void qc.invalidateQueries({ queryKey: ["my-games"] }); void qc.invalidateQueries({ queryKey: ["album", child.id] });
    } catch (e) { const message=e instanceof Error ? e.message : "Your game is still here. Try saving again.";toast.error(message);const {safetyAlternatives}=await import('../studio/SafeRetry');chat.say(message,safetyAlternatives(message)); }
    finally { setBusy(false); }
  }
  function pick(t: TemplateKey) {
    setFile({ template: t, settings: defaultSettings(t), published: false, playtests: 0 });
    setTitle(sprouts ? `My ${TEMPLATES[t].name}` : "");
    setStep(sprouts || t === "quiz" || t === "memory" || t === "path" ? "edit" : "interview");
    chat.say(sprouts ? "Pick your hero and your things!" : "Who’s the hero? What’s their goal? Your call!");
  }
  async function interview() {
    if (!file) return; setBusy(true);
    try {
      const r = await designInterview({ data: { childId: child.id, template: file.template, answers, environment: env } });
      if (!r.ok) { toast(r.reply);const {safetyAlternatives}=await import('../studio/SafeRetry');chat.say(r.reply,safetyAlternatives(r.reply));return; }
      setFile({ ...file, settings: { ...file.settings, ...r.patch } }); setDirty(true); setStep("edit"); chat.say(r.reply);
    } catch { toast.error("Bugley couldn’t read that right now. You can set things by hand!"); setStep("edit"); }
    finally { setBusy(false); }
  }
  function choose(art: ArtRef, url?: string) {
    if (!slot || !s) return;
    if (url && art.kind === "creation") setUrls({ ...urls, [art.id]: url });
    if (slot.key === "hero" || slot.key === "goalArt") set({ [slot.key]: art });
    else { const list = [...s[slot.key]]; list[slot.index] = art; set({ [slot.key]: list }); }
    setSlot(null);
  }

  if (testing && file) return <GamePlayer file={file} urls={urls} title={title || TEMPLATES[file.template].name} onClose={() => setTesting(false)} onEnd={(p) => {
    const first = file.playtests === 0;
    setFile({ ...file, playtests: file.playtests + 1 }); setDirty(true);
    const n = coachNote(file.template, file.settings, p); setNote(n);
    chat.say(first ? `${n.note} ${BIG_IDEA}` : n.note);
  }} />;
  if (making) return <div className="space-y-4"><Button variant="ghost" onClick={() => { setMaking(false); void qc.invalidateQueries({ queryKey: ["album", child.id] }); }}><ArrowLeft />Back to my game</Button><PictureMaker child={child} chat={chat} /></div>;
  if (slot) return <ArtPicker child={child} slot={slot.key} onPick={choose} onCancel={() => setSlot(null)} onMake={() => { setSlot(null); setMaking(true); }} />;

  if (step === "pick") return <div className="space-y-6">
    <Button variant="ghost" onClick={onClose}><ArrowLeft />Game Studio</Button>
    <h1 className="text-3xl">What kind of game?</h1>
    <div className="grid gap-4 sm:grid-cols-2">{templatesFor(band).slice(templatePage*3,templatePage*3+3).map((t) => <Button variant="outline" key={t} onClick={() => pick(t)} className={cn("h-auto flex items-center gap-4 whitespace-normal rounded-lg border-2 border-border bg-card p-5 text-left shadow-soft", sprouts && "p-7")}>
      <span className="text-5xl" aria-hidden>{TEMPLATES[t].emoji}</span><span><span className="block font-display text-xl">{TEMPLATES[t].name}</span><span className="text-sm text-muted-foreground">{TEMPLATES[t].blurb}</span></span></Button>)}{templatesFor(band).length>3&&<Button variant="outline" onClick={()=>setTemplatePage((templatePage+1)%Math.ceil(templatesFor(band).length/3))}>More games</Button>}</div>
  </div>;
  if (!file || !s) return <div className="flex min-h-64 items-center justify-center"><Bugley stage={child.bugley_stage} expression="thinking" size={100} /></div>;
  const lastBugley = [...chat.messages].reverse().find((m) => m.from === "bugley")?.text;

  if (step === "interview") return <div className="space-y-5">
    <Button variant="ghost" onClick={() => setStep("pick")}><ArrowLeft />Pick a different game</Button>
    <div className="flex items-start gap-3"><Bugley stage={child.bugley_stage} expression="curious" size={84} /><div className="rounded-3xl rounded-tl-none bg-card p-4 shadow-soft"><p className="font-display text-lg">I’m your game designer helper! Answer my questions and I’ll turn them into game rules.</p></div></div>
    <label className="block space-y-1"><span className="font-semibold">{question[1]}</span><input className={field} maxLength={160} value={answers[question[0]]} onChange={(e)=>setAnswers({...answers,[question[0]]:e.target.value})}/></label>
    <div className="flex gap-2"><Button variant="outline" onClick={()=>speak(question[1])}>Read question</Button>{voice.supported&&<Button variant="secondary" onClick={voice.start}>Say my answer</Button>}{questionAt>0&&<Button variant="ghost" onClick={()=>setQuestionAt(questionAt-1)}>Previous</Button>}{questionAt<3&&<Button onClick={()=>setQuestionAt(questionAt+1)}>Next</Button>}</div>
    {lastBugley&&<SafeRetry message={lastBugley} onChoose={idea=>{setAnswers({...answers,hero:idea});chat.say('What should your original hero do next?',[]);}}/>}
    <div className="flex flex-wrap gap-2">{questionAt===3&&<Button disabled={busy || Object.values(answers).every((v) => !v.trim())} onClick={() => void interview()}><Wand2 />{busy ? "Bugley is building…" : "Turn my answers into a game"}</Button>}<Button variant="ghost" onClick={() => setStep("edit")}>I’ll set it up myself</Button></div>
  </div>;

  const t = file.template;
  return <div className="space-y-6" aria-busy={busy}>
    {lastBugley&&<SafeRetry message={lastBugley} onChoose={idea=>{setTitle(idea);chat.say('Your original game idea is ready to edit.',[]);}}/>}
    <div className="flex flex-wrap items-center justify-between gap-2"><Button variant="ghost" onClick={() => { if (dirty && !window.confirm("Leave without saving?")) return; onClose(); }}><ArrowLeft />Game Studio</Button><span className="text-sm text-muted-foreground">{busy ? "Working…" : dirty ? "Unsaved changes" : id ? "Saved" : "Not saved yet"}</span></div>
    <div className="flex items-center gap-3"><span className="text-5xl" aria-hidden>{TEMPLATES[t].emoji}</span><div className="min-w-0 flex-1">{sprouts ? <h1 className="text-3xl">{title}</h1> : <input className={cn(field, "font-display text-2xl")} maxLength={60} value={title} placeholder="Name your game" aria-label="Game name" onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />}<p className="text-sm text-muted-foreground">{TEMPLATES[t].name}</p></div></div>
    {lastBugley && <div className="flex items-start gap-3"><Bugley stage={child.bugley_stage} expression={note ? "thinking" : "happy"} size={64} /><div className="flex-1 rounded-3xl rounded-tl-none bg-card p-4 shadow-soft"><p>{lastBugley}</p>{note?.fix && <Button size="sm" className="mt-2" onClick={() => { set(note.fix!.patch); setNote(null); chat.say("Done! Playtest again to see how it feels."); }}>{note.fix.label}</Button>}</div></div>}
    <div className="flex flex-wrap gap-2"><Button size="lg" onClick={() => { setNote(null); setTesting(true); }}><Play />Playtest</Button><Button size="lg" variant="secondary" disabled={busy || !dirty && !!id} onClick={() => void save()}><Save />Save</Button>
      <Button size="lg" variant="outline" disabled={busy || !id} onClick={() => void save(!file.published)}><Share2 />{file.published ? "Stop sharing" : "Share to Family Arcade"}</Button></div>

    {editAt===0&&!sprouts && ["maze", "catch", "jump"].includes(t) && <Section title="The story of your game">
      <div className="grid gap-3 sm:grid-cols-2">{([["heroName", "Hero’s name"], ["goal", "Goal"], ["obstacle", "What gets in the way"], ["winText", "Winning message"]] as const).map(([k, l]) => <label key={k} className="space-y-1 text-sm font-semibold"><span>{l}</span><input className={field} maxLength={k === "heroName" ? 40 : 160} value={s[k]} onChange={(e) => set({ [k]: e.target.value })} /></label>)}</div>
    </Section>}

    {editAt===1&&<Section title="Art">
      <div className="flex flex-wrap gap-3">
        {t !== "quiz" && t !== "path" && t !== "memory" && <Slot label="Hero" art={s.hero} urls={urls} onClick={() => setSlot({ key: "hero", index: 0 })} big={sprouts} />}
        {(t === "maze" || t === "jump") && <Slot label="Goal" art={s.goalArt} urls={urls} onClick={() => setSlot({ key: "goalArt", index: 0 })} big={sprouts} />}
        {(t === "catch" || t === "maze" || t === "jump") && s.good.map((g, i) => <Slot key={`g${i}`} label={t === "catch" ? "Catch this" : "Coin"} art={g} urls={urls} onClick={() => setSlot({ key: "good", index: i })} big={sprouts} />)}
        {(t === "catch" || t === "maze" || t === "jump") && s.bad.map((g, i) => <Slot key={`b${i}`} label="Dodge this" art={g} urls={urls} onClick={() => setSlot({ key: "bad", index: i })} big={sprouts} />)}
        {t === "catch" && s.good.length < 4 && <Button variant="outline" onClick={() => setSlot({ key: "good", index: s.good.length })}><Plus />Good thing</Button>}
        {t === "catch" && s.bad.length < 4 && <Button variant="outline" onClick={() => setSlot({ key: "bad", index: s.bad.length })}><Plus />Bad thing</Button>}
        {t === "memory" && s.cards.map((c, i) => <div key={i} className="relative"><Slot label={`Pair ${i + 1}`} art={c} urls={urls} onClick={() => setSlot({ key: "cards", index: i })} big={sprouts} />{s.cards.length > 2 && <button aria-label="Remove pair" onClick={() => set({ cards: s.cards.filter((_, j) => j !== i) })} className="absolute -right-1 -top-1 rounded-full bg-card p-1 shadow-soft"><Trash2 className="size-3" /></button>}</div>)}
        {t === "memory" && s.cards.length < 12 && <Button variant="outline" className={sprouts ? "h-28" : ""} onClick={() => setSlot({ key: "cards", index: s.cards.length })}><Plus />Add a pair</Button>}
      </div>
    </Section>}

    {editAt===2&&<Section title="Look">
      <div className="flex flex-wrap gap-2">{BACKGROUNDS.map((b) => <button key={b} onClick={() => set({ background: b })} aria-label={`${b} background`} aria-pressed={s.background === b} className={cn("size-16 overflow-hidden rounded-xl border-4 bg-card bg-cover bg-center", s.background === b ? "border-primary" : "border-border")} style={BG_IMAGES[b] ? { backgroundImage: `url(${BG_IMAGES[b]})` } : undefined} />)}</div>
      <div className="flex flex-wrap gap-2">{COLORS.map((c) => <button key={c} onClick={() => set({ color: c })} aria-label={`${c} color`} aria-pressed={s.color === c} className={cn("size-12 rounded-full border-4", COLOR_CLASS[c], s.color === c ? "border-foreground" : "border-transparent")} />)}</div>
    </Section>}

    {editAt===3&&t !== "path" && <Section title="Rules">
      <div className="grid gap-4 sm:grid-cols-2">
        {["maze", "catch", "jump"].includes(t) && <Stepper label="Speed" value={s.speed} min={1} max={5} onChange={(v) => set({ speed: v })} big={sprouts} />}
        {["maze", "catch", "jump"].includes(t) && <Stepper label="Lives" value={s.lives} min={1} max={5} onChange={(v) => set({ lives: v })} big={sprouts} />}
        {["maze", "catch", "jump"].includes(t) && <Stepper label="Difficulty" value={s.difficulty} min={1} max={3} onChange={(v) => set({ difficulty: v })} big={sprouts} />}
        {t !== "quiz" && <div className="space-y-1"><p className="text-sm font-semibold">Timer</p><div className="flex flex-wrap gap-1">{([0, 30, 60, 90, 120] as const).map((v) => <Button key={v} size="sm" variant={s.timer === v ? "primary" : "outline"} onClick={() => set({ timer: v })}>{v ? `${v}s` : "None"}</Button>)}</div></div>}
        {adv && (t === "maze" || t === "jump") && <Stepper label="Levels" value={s.levels} min={1} max={5} onChange={(v) => { const grids = [...s.grids]; while (grids.length < v) grids.push(t === "maze" ? generateMaze(s.difficulty, grids.length + 7) : generateJump(s.difficulty, grids.length + 7)); set({ levels: v, grids: grids.slice(0, v) }); }} />}
        {adv && ["maze", "catch", "jump"].includes(t) && <div className="space-y-1"><p className="text-sm font-semibold">How do you win?</p><div className="flex flex-wrap gap-1">{(t === "catch" ? (["score", "survive"] as const) : (["goal", "score"] as const)).map((w) => <Button key={w} size="sm" variant={s.winRule === w ? "primary" : "outline"} onClick={() => set({ winRule: w })}>{w === "goal" ? "Reach the goal" : w === "score" ? (t === "catch" ? "Catch enough" : "Collect coins, then goal") : "Survive the timer"}</Button>)}</div>{s.winRule === "score" && <Stepper label="Points needed" value={s.winScore} min={3} max={50} onChange={(v) => set({ winScore: v })} />}</div>}
        {!adv && t === "catch" && <Stepper label="Catch this many to win" value={s.winScore} min={3} max={30} onChange={(v) => set({ winScore: v, winRule: "score" })} big={sprouts} />}
        {adv && ["maze", "catch"].includes(t) && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={s.powerups} onChange={(e) => set({ powerups: e.target.checked })} className="size-5" />Power-ups {t === "maze" ? "(shields you place in the level)" : "(stars that slow things down)"}</label>}
      </div>
    </Section>}

    {editAt===4&&(t === "maze" || t === "jump") && <LevelEditor s={s} t={t} adv={adv} onChange={(grids) => set({ grids })} />}
    {editAt===4&&t === "quiz" && <QuizEditor s={s} onChange={(quiz) => set({ quiz })} />}
    {editAt===4&&t === "path" && <PathEditor s={s} onChange={(path) => set({ path })} />}
    <div className="flex justify-between gap-3"><Button variant="outline" disabled={editAt===0} onClick={()=>setEditAt(editAt-1)}>Previous</Button><Button variant="outline" disabled={editAt===4} onClick={()=>setEditAt(editAt+1)}>Next</Button></div>
  </div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="space-y-3 py-4 sm:py-5"><h2 className="text-xl">{title}</h2>{children}</section>; }
function Slot({ label, art, urls, onClick, big }: { label: string; art: ArtRef; urls: Record<string, string>; onClick: () => void; big?: boolean }) {
  return <button onClick={onClick} className={cn("flex flex-col items-center gap-1 rounded-2xl border-2 border-border bg-background p-2 hover:border-primary", big ? "w-28" : "w-24")}><Art art={art} urls={urls} className={cn(big ? "size-16 text-5xl" : "size-12 text-4xl")} /><span className="text-xs font-semibold">{label}</span></button>;
}
function Stepper({ label, value, min, max, onChange, big }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; big?: boolean }) {
  return <div className="space-y-1"><p className="text-sm font-semibold">{label}</p><div className="flex items-center gap-2"><Button size={big ? "lg" : "sm"} variant="outline" aria-label={`Less ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</Button><span className="w-10 text-center font-display text-xl">{value}</span><Button size={big ? "lg" : "sm"} variant="outline" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</Button></div></div>;
}

function ArtPicker({ child, slot, onPick, onCancel, onMake }: { child: SidekickChild; slot: string; onPick: (a: ArtRef, url?: string) => void; onCancel: () => void; onMake: () => void }) {
  const { data: cast = [] } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
  const { data: album = [] } = useQuery({ queryKey: ["album", child.id], queryFn: () => listAlbum({ data: { childId: child.id } }) });
  const pictures = album.filter((c) => c.kind === "picture" && c.images[0]);
  const groups = slot === "good" ? [SPRITES.good] : slot === "bad" ? [SPRITES.bad] : slot === "goalArt" ? [SPRITES.goals] : slot === "hero" ? [SPRITES.heroes] : [SPRITES.heroes, SPRITES.good, SPRITES.bad];
  return <div className="space-y-5">
    <Button variant="ghost" onClick={onCancel}><ArrowLeft />Back</Button>
    <h1 className="text-3xl">Pick your art</h1>
    <section className="space-y-2"><h2 className="text-xl">Bugley’s library</h2><div className="flex flex-wrap gap-2">{groups.flat().map((v) => <button key={v} onClick={() => onPick({ kind: "sprite", value: v })} className="flex size-16 items-center justify-center rounded-2xl border-2 border-border bg-card text-4xl hover:border-primary">{v}</button>)}</div></section>
    {cast.length > 0 && <section className="space-y-2"><h2 className="text-xl">My Cast</h2><div className="flex flex-wrap gap-2">{cast.map((c) => <button key={c.id} onClick={() => onPick({ kind: "creation", id: c.id }, c.url)} className="w-24 rounded-2xl border-2 border-border bg-card p-1 hover:border-primary"><img src={c.url} alt="" className="aspect-square w-full rounded-xl object-cover" /><span className="block truncate text-xs">{c.title}</span></button>)}</div></section>}
    {pictures.length > 0 && <section className="space-y-2"><h2 className="text-xl">My pictures</h2><div className="flex flex-wrap gap-2">{pictures.map((c) => <button key={c.id} onClick={() => onPick({ kind: "creation", id: c.id }, c.images[0])} className="w-24 rounded-2xl border-2 border-border bg-card p-1 hover:border-primary"><img src={c.images[0]} alt="" className="aspect-square w-full rounded-xl object-cover" /><span className="block truncate text-xs">{c.title}</span></button>)}</div></section>}
    <Button variant="secondary" onClick={onMake}><Sparkles />Make new art in the Picture Maker (uses glow)</Button>
  </div>;
}

const TOOLS = [["#", "Wall", "🧱"], ["o", "Coin", "🪙"], ["x", "Obstacle", "⚠️"], ["p", "Power-up", "🛡️"], ["S", "Start", "🟢"], ["G", "Goal", "🏁"], [".", "Erase", "⬜"]] as const;
function LevelEditor({ s, t, adv, onChange }: { s: Settings; t: "maze" | "jump"; adv: boolean; onChange: (g: Grid[]) => void }) {
  const [lvl, setLvl] = useState(0);
  const [tool, setTool] = useState<string>("#");
  const g = s.grids[lvl] ?? s.grids[0];
  if (!g) return null;
  const tools = TOOLS.filter(([k]) => k !== "p" || (adv && t === "maze" && s.powerups));
  const paint = (x: number, y: number) => {
    let next = g;
    if (tool === "S" || tool === "G") { const old = g.cells.indexOf(tool); if (old >= 0) next = setAt(next, old % g.w, Math.floor(old / g.w), "."); }
    next = setAt(next, x, y, tool);
    onChange(s.grids.map((x2, i) => i === lvl ? next : x2));
  };
  return <Section title="Level editor">
    {s.levels > 1 && <div className="flex gap-1">{s.grids.slice(0, s.levels).map((_, i) => <Button key={i} size="sm" variant={lvl === i ? "primary" : "outline"} onClick={() => setLvl(i)}>Level {i + 1}</Button>)}</div>}
    <div className="flex flex-wrap gap-1">{tools.map(([k, label, icon]) => <Button key={k} size="sm" variant={tool === k ? "primary" : "outline"} onClick={() => setTool(k)}>{icon} {t === "jump" && k === "#" ? "Platform" : label}</Button>)}
      <Button size="sm" variant="ghost" onClick={() => onChange(s.grids.map((x, i) => i === lvl ? (t === "maze" ? generateMaze(s.difficulty, Math.floor(Math.random() * 999)) : generateJump(s.difficulty, Math.floor(Math.random() * 999))) : x))}><Dices />New random level</Button></div>
    <div className="overflow-x-auto"><div className="grid gap-px rounded-lg bg-border p-px" style={{ gridTemplateColumns: `repeat(${g.w}, minmax(22px, 1fr))`, width: t === "jump" ? g.w * 26 : undefined, maxWidth: t === "maze" ? 440 : undefined }}>
      {g.cells.split("").map((c, i) => <button key={i} aria-label={`Cell ${i % g.w + 1}, ${Math.floor(i / g.w) + 1}`} onClick={() => paint(i % g.w, Math.floor(i / g.w))} className={cn("flex aspect-square items-center justify-center text-xs", c === "#" ? "bg-foreground/80" : "bg-background")}>{TOOLS.find(([k]) => k === c && k !== "#" && k !== ".")?.[2] ?? ""}</button>)}
    </div></div>
    <p className="text-xs text-muted-foreground">Pick a tool, then tap squares. Every level needs one start and one goal.</p>
  </Section>;
}

function QuizEditor({ s, onChange }: { s: Settings; onChange: (q: Settings["quiz"]) => void }) {
  const upd = (i: number, patch: Partial<Settings["quiz"][number]>) => onChange(s.quiz.map((q, j) => j === i ? { ...q, ...patch } : q));
  return <Section title="Your questions">
    {s.quiz.map((q, i) => <div key={i} className="space-y-2 rounded-2xl border border-border p-3">
      <div className="flex gap-2"><input className={field} maxLength={200} value={q.q} placeholder={`Question ${i + 1}`} onChange={(e) => upd(i, { q: e.target.value })} /><Button size="icon" variant="ghost" aria-label="Remove question" onClick={() => onChange(s.quiz.filter((_, j) => j !== i))}><Trash2 /></Button></div>
      {q.answers.map((a, k) => <div key={k} className="flex items-center gap-2"><input type="radio" name={`c${i}`} checked={q.correct === k} onChange={() => upd(i, { correct: k })} aria-label="Correct answer" className="size-5" /><input className={cn(field, "p-2")} maxLength={80} value={a} placeholder={`Answer ${k + 1}`} onChange={(e) => upd(i, { answers: q.answers.map((x, j) => j === k ? e.target.value : x) })} /></div>)}
      {q.answers.length < 4 && <Button size="sm" variant="ghost" onClick={() => upd(i, { answers: [...q.answers, ""] })}><Plus />Answer</Button>}
      <p className="text-xs text-muted-foreground">Tap the circle next to the right answer.</p>
    </div>)}
    {s.quiz.length < 20 && <Button variant="outline" onClick={() => onChange([...s.quiz, { q: "", answers: ["", ""], correct: 0 }])}><Plus />Add a question</Button>}
  </Section>;
}

function PathEditor({ s, onChange }: { s: Settings; onChange: (p: Settings["path"]) => void }) {
  const upd = (id: string, patch: Partial<Settings["path"][number]>) => onChange(s.path.map((n) => n.id === id ? { ...n, ...patch } : n));
  const label = (id: string) => `Page ${s.path.findIndex((n) => n.id === id) + 1}`;
  return <Section title="Your story pages">
    <p className="text-sm text-muted-foreground">Each page can have up to 3 choices. A page with no choices is an ending.</p>
    {s.path.map((n, i) => <div key={n.id} className="space-y-2 rounded-2xl border border-border p-3">
      <div className="flex items-center justify-between"><p className="font-display">Page {i + 1}{i === 0 ? " (start)" : ""}{!n.choices.length ? " · Ending" : ""}</p>{i > 0 && <Button size="icon" variant="ghost" aria-label="Remove page" onClick={() => onChange(s.path.filter((x) => x.id !== n.id).map((x) => ({ ...x, choices: x.choices.filter((c) => c.to !== n.id) })))}><Trash2 /></Button>}</div>
      <textarea rows={3} maxLength={400} className={field} value={n.text} placeholder="What happens on this page?" onChange={(e) => upd(n.id, { text: e.target.value })} />
      {n.choices.map((c, k) => <div key={k} className="flex flex-wrap items-center gap-2"><input className={cn(field, "flex-1 p-2")} maxLength={80} value={c.text} placeholder="Choice" onChange={(e) => upd(n.id, { choices: n.choices.map((x, j) => j === k ? { ...x, text: e.target.value } : x) })} />
        <select className="rounded-lg border-2 border-border bg-background p-2" value={c.to} aria-label="Goes to" onChange={(e) => upd(n.id, { choices: n.choices.map((x, j) => j === k ? { ...x, to: e.target.value } : x) })}>{s.path.filter((x) => x.id !== n.id).map((x) => <option key={x.id} value={x.id}>→ {label(x.id)}</option>)}</select>
        <Button size="icon" variant="ghost" aria-label="Remove choice" onClick={() => upd(n.id, { choices: n.choices.filter((_, j) => j !== k) })}><Trash2 /></Button></div>)}
      {n.choices.length < 3 && s.path.length < 40 && <Button size="sm" variant="outline" onClick={() => { const nid = Math.random().toString(36).slice(2, 8); onChange([...s.path.map((x) => x.id === n.id ? { ...x, choices: [...x.choices, { text: "", to: nid }] } : x), { id: nid, text: "", choices: [] }]); }}><Plus />Add a choice (new page)</Button>}
    </div>)}
  </Section>;
}
