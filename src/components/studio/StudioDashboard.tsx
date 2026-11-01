import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChildAvatar } from "@/components/site/ChildAvatar";
import { BugBuilder } from "@/components/site/BugBuilder";
import { toBug } from "@/lib/bug-avatar";
import { ArrowRight, Pencil, X, Gamepad2, Library, Play, Plus, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteCreationButton } from "@/components/studio/DeleteCreationButton";
import type { SidekickChild } from "@/components/studio/Sidekick";
import { listCast } from "@/lib/images.functions";
import { listInProgress } from "@/lib/studio.functions";
import { ARCADE_GAMES, earnsGlow, favoriteGames, readProgress, type ArcadeId } from "@/lib/arcade";
import { ARCADE_ART } from "@/lib/arcade-art";
import pictureArt from "@/assets/illustrations/studio-picture.jpg";
import comicArt from "@/assets/illustrations/studio-comic-adventure.jpg";
import storyArt from "@/assets/illustrations/studio-story.jpg";

const JOURNEYS = [
  { key: "picture", title: "Pictures", line: "Paint one amazing scene.", art: pictureArt },
  { key: "comic", title: "Comics", line: "Panel by panel, with speech bubbles.", art: comicArt },
  { key: "story", title: "Stories", line: "Chapters with pictures you write.", art: storyArt },
] as const;

const WHY = [
  { emoji: "🔍", title: "AI can be wrong", line: "Even when it sounds sure. You learn to check." },
  { emoji: "🧠", title: "AI learns from examples", line: "Good examples make it smarter. You’re the teacher." },
  { emoji: "🛡️", title: "You stay the boss", line: "Know when to ask AI, and when to trust yourself." },
];

const DEFAULT_GAMES: ArcadeId[] = ["dragon_catch", "mystery_manor", "doodle_duel"];

export function StudioDashboard({ child, glow, onAlbum }: { child: SidekickChild & { bug?: unknown; avatar?: unknown }; glow?: { total: number } | undefined; onAlbum: () => void }) {
  const navigate = useNavigate();
  const { data: cast = [] } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
  const { data: open = [] } = useQuery({ queryKey: ["in-progress", child.id], queryFn: () => listInProgress({ data: { childId: child.id } }) });
  const [favs, setFavs] = useState<ArcadeId[]>([]);
  useEffect(() => { setFavs(favoriteGames(readProgress(child.id))); }, [child.id]);
  const games = (favs.length ? favs : DEFAULT_GAMES).map((id) => ARCADE_GAMES.find((g) => g.id === id)!).filter(Boolean);
  const start = () => void navigate({ to: "/kids/studio/v3" });
  const [pickFor, setPickFor] = useState<(typeof JOURNEYS)[number] | null>(null);
  const [bugOpen, setBugOpen] = useState(false);
  const [bug, setBug] = useState<unknown>(child.bug ?? child.avatar);
  const qc = useQueryClient();
  const startWith = (id: string, kind?: "picture" | "comic" | "story") => void navigate({ to: "/kids/studio/v3", search: kind ? { character: id, kind } : { character: id } });
  if (bugOpen) return <BugBuilder childId={child.id} start={toBug(bug, child.id)} onClose={() => setBugOpen(false)} onSaved={(b) => { setBug(b); setBugOpen(false); void qc.invalidateQueries({ queryKey: ["family"] }); toast.success("Your bug is saved!"); }} />;

  return <div className="space-y-10">
    {/* Welcome */}
    <section className="relative overflow-hidden rounded-[2rem] bg-secondary p-6 text-secondary-foreground shadow-lift sm:p-8">
      <div className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-primary/30 blur-3xl" aria-hidden />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="shrink-0">
          <button onClick={() => setBugOpen(true)} aria-label="Update my bug picture" className="group relative rounded-full ring-4 ring-primary transition hover:scale-105"><ChildAvatar avatar={bug} seed={child.id} className="size-28" /><span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow"><Pencil className="size-4" /></span></button></div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-widest opacity-80">Welcome back</p>
          <h1 className="font-display text-4xl sm:text-5xl">{child.nickname}’s Studio</h1>
          <p className="max-w-md opacity-90">Make it. Play it. Learn how AI really works.</p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <span className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-display text-xl text-primary-foreground shadow-glow"><Zap className="size-5 fill-current" />{glow?.total ?? "–"} Glow</span>
          <Button variant="ghost" size="sm" onClick={onAlbum} className="text-secondary-foreground hover:bg-background/15 hover:text-secondary-foreground"><Library />My Album</Button>
        </div>
      </div>
    </section>

    {/* Keep working */}
    {open.length > 0 && <section className="space-y-3">
      <SectionTitle title="Pick up where you left off" />
      <ul className="flex snap-x gap-3 overflow-x-auto pb-2">{open.slice(0, 8).map((w) => <li key={w.id} className="relative w-40 shrink-0 snap-start">
        <button onClick={() => void navigate({ to: "/kids/studio/v3", search: { project: w.id } })} className="group block w-full overflow-hidden rounded-3xl border-2 border-border bg-card text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary">
          {w.art ? <img src={w.art} alt="" loading="lazy" className="aspect-square w-full object-cover" /> : <span className="flex aspect-square items-center justify-center bg-primary/15 text-4xl" aria-hidden>✏️</span>}
          <span className="block truncate px-3 pt-2 font-display">{w.title}</span>
          <span className="flex items-center gap-1 px-3 pb-2 text-xs font-semibold capitalize text-muted-foreground">{w.kind} · Continue <ArrowRight className="size-3" /></span>
        </button>
        <div className="absolute right-1 top-1 rounded-full bg-background/85"><DeleteCreationButton childId={child.id} id={w.id} title={w.title} /></div>
      </li>)}</ul>
    </section>}

    {/* Create */}
    <section className="space-y-4">
      <SectionTitle title="Create" note={<span className="flex items-center gap-1"><Zap className="size-4 fill-current text-primary" />Uses Glow</span>} />
      <ol className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Step n={1} label="Pick or invent a character" /><ArrowRight className="size-4" /><Step n={2} label="Choose what to make" /><ArrowRight className="size-4" /><Step n={3} label="Describe it. Bugley helps." />
      </ol>
      <div className="grid gap-3 sm:grid-cols-3">{JOURNEYS.map((j) => <button key={j.key} onClick={() => cast.length ? setPickFor(j) : start()} aria-pressed={pickFor?.key === j.key} className="group relative overflow-hidden rounded-3xl text-left shadow-soft transition hover:-translate-y-1 hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring">
        <img src={j.art} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/20 to-transparent" aria-hidden />
        <span className="absolute inset-x-0 bottom-0 p-4 text-background"><span className="block font-display text-2xl">{j.title}</span><span className="block text-sm opacity-90">{j.line}</span><span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Pick a character<ArrowRight className="size-3" /></span></span>
      </button>)}</div>
      {pickFor && <div className="step-enter space-y-3 rounded-3xl border-4 border-primary bg-card p-4 shadow-glow">
        <div className="flex items-center justify-between gap-2"><h3 className="font-display text-xl">Who’s starring in your {pickFor.key}?</h3><Button variant="ghost" size="icon" aria-label="Close" onClick={() => setPickFor(null)}><X /></Button></div>
        <ul className="flex snap-x gap-3 overflow-x-auto pb-1">
          <li className="w-24 shrink-0"><button onClick={start} className="flex aspect-square w-full flex-col items-center justify-center rounded-full border-4 border-dashed border-primary/60 text-sm font-semibold hover:border-primary"><Plus className="size-6 text-primary" />New</button></li>
          {cast.map((m) => <li key={m.id} className="w-24 shrink-0 text-center"><button onClick={() => startWith(m.id, pickFor.key)} className="block w-full">{m.url ? <img src={m.url} alt="" className="aspect-square w-full rounded-full border-4 border-background object-cover shadow-soft transition hover:scale-105 hover:border-primary" /> : <span className="flex aspect-square items-center justify-center rounded-full bg-primary/15 text-3xl">🐾</span>}<span className="mt-1 block truncate text-sm font-semibold">{m.title}</span></button></li>)}
        </ul>
      </div>}
    </section>

    {/* Characters */}
    <section className="space-y-3">
      <SectionTitle title="My characters" note="Tap one to star them in something new" />
      <ul className="flex snap-x gap-3 overflow-x-auto pb-2">
        <li className="w-28 shrink-0 snap-start"><button onClick={start} className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-full border-4 border-dashed border-primary/60 bg-card text-sm font-semibold transition hover:border-primary hover:shadow-glow"><Plus className="size-7 text-primary" />New</button></li>
        {cast.map((m) => <li key={m.id} className="w-28 shrink-0 snap-start text-center"><button onClick={() => void navigate({ to: "/kids/studio/v3", search: { character: m.id } })} className="block w-full">
          {m.url ? <img src={m.url} alt="" loading="lazy" className="aspect-square w-full rounded-full border-4 border-card object-cover shadow-soft transition hover:scale-105 hover:border-primary" /> : <span className="flex aspect-square items-center justify-center rounded-full bg-primary/15 text-4xl" aria-hidden>🐾</span>}
          <span className="mt-1 block truncate text-sm font-semibold">{m.title}</span>
        </button></li>)}
      </ul>
    </section>

    {/* Play */}
    <section className="space-y-4 rounded-[2rem] bg-card p-5 shadow-soft sm:p-6">
      <SectionTitle title={favs.length ? "Your favorite games" : "Games to try"} note={<Link to="/kids/studio/games" className="flex items-center gap-1 font-semibold text-foreground hover:underline">All games<ArrowRight className="size-4" /></Link>} />
      <div className="flex items-start gap-3 rounded-2xl bg-primary/15 p-4">
        <Gamepad2 className="mt-0.5 size-6 shrink-0" />
        <p className="text-sm"><b>Out of Glow?</b> Games marked <span className="inline-flex items-center gap-0.5 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground"><Zap className="size-3 fill-current" />Earn Glow</span> can win you bonus Glow to spend on creating.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">{games.map((g) => <Link key={g.id} to="/kids/studio/games" search={{ play: g.id }} className="group relative overflow-hidden rounded-2xl shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
        <img src={ARCADE_ART[g.id]} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute inset-0 bg-gradient-to-t from-foreground/85 to-transparent" aria-hidden />
        {earnsGlow(g) && <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground"><Zap className="size-3 fill-current" />Earn Glow</span>}
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3 text-background"><span className="font-display text-lg">{g.name}</span><Play className="size-5 fill-current" /></span>
      </Link>)}</div>
      <div className="space-y-3 pt-2">
        <h3 className="flex items-center gap-2 font-display text-xl"><ShieldCheck className="size-5" />Why play? You learn to use AI safely</h3>
        <ul className="grid gap-3 sm:grid-cols-3">{WHY.map((w) => <li key={w.title} className="rounded-2xl border-2 border-border p-4"><span className="text-2xl" aria-hidden>{w.emoji}</span><p className="mt-1 font-display">{w.title}</p><p className="text-sm text-muted-foreground">{w.line}</p></li>)}</ul>
      </div>
    </section>

    <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground"><Sparkles className="size-4" />You describe everything in words. No photos or uploads, ever.</p>
  </div>;
}

function SectionTitle({ title, note }: { title: string; note?: React.ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-2"><h2 className="font-display text-2xl sm:text-3xl">{title}</h2>{note && <span className="text-sm text-muted-foreground">{note}</span>}</div>;
}
function Step({ n, label }: { n: number; label: string }) {
  return <li className="flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{n}</span>{label}</li>;
}
