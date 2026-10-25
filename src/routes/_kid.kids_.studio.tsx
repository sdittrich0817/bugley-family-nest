import { useScrollTopOn } from "@/lib/scroll";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Paintbrush, Gamepad2, Heart, Image as ImageIcon, LayoutGrid, Library, Pencil, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { kidFamilyOptions as familyOptions } from "@/lib/kid-family";
import { getChildGlow } from "@/lib/glow.functions";
import { getActivePlayer, setKidZoneLocked, type Band } from "@/lib/kid-zone";
import { listAlbum, updateCreation, CREATION_KINDS, type Creation, type CreationKind } from "@/lib/studio.functions";
import { kidPlanOptions as billingOptions } from '@/lib/kid-family';
import { getStripeEnvironment } from "@/lib/stripe";
import { GlowMeter } from "@/components/studio/GlowMeter";
import { Sidekick, useBugleyChat, type SidekickChild } from "@/components/studio/Sidekick";
import { BugleyGuide } from "@/components/studio/Guided";
import { BugleyStep, type StepChoice } from "@/components/studio/BugleyStep";
import { Bugley } from "@/components/brand/Bugley";
import { PictureMaker } from "@/components/studio/Makers";
import { StoryMaker } from "@/components/studio/StoryMaker";
import { ComicMaker } from "@/components/studio/ComicMaker";
import { BookBuilder } from "@/components/studio/BookBuilder";
import { HeroBuilder } from "@/components/studio/HeroBuilder";
import { listCast, stylesOptions } from "@/lib/images.functions";
import { STYLE_THUMBS } from "@/lib/style-thumbs";
import { bookFromOneShot } from "@/lib/book.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import pictureArt from "@/assets/illustrations/studio-picture.jpg";
import comicArt from "@/assets/illustrations/studio-comic-adventure.jpg";
import storyArt from "@/assets/illustrations/studio-story.jpg";

export const Route = createFileRoute("/_kid/kids_/studio")({
  head: () => ({ meta: [
    { title: "Bugley’s Studio · Kid Zone" }, { name: "description", content: "Make pictures, stories, comics and games with Bugley, your AI helper." },
    { property: "og:title", content: "Bugley’s Studio · Kid Zone" }, { property: "og:description", content: "Make pictures, stories, comics and games with Bugley." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(familyOptions),
  component: StudioPage,
});

function StudioPage() {
  const { data } = useSuspenseQuery(familyOptions);
  const navigate = useNavigate();
  const [childId, setChildId] = useState<string | null>(null);
  useEffect(() => {
    setKidZoneLocked(true);
    const id = getActivePlayer();
    if (!id || !data.children.some((c) => c.id === id)) void navigate({ to: "/kids", replace: true });
    else setChildId(id);
  }, [data.children, navigate]);
  const { data: billing } = useQuery(billingOptions(getStripeEnvironment()));
  useEffect(() => { if (billing && !billing.active) void navigate({ to: "/kids", replace: true }); }, [billing, navigate]);
  const child = data.children.find((c) => c.id === childId);
  if (!child) return null;
  return <Studio child={child as SidekickChild & { age_band: Band }} />;
}

const CREATE_CHOICES: StepChoice[] = [
  { key: "picture", label: "Make a Picture", image: pictureArt },
  { key: "comic", label: "Build a Comic", image: comicArt },
  { key: "story", label: "Tell a Story", image: storyArt },
];

function Studio({ child }: { child: SidekickChild & { age_band: Band } }) {
  const band = child.age_band;
  const sprouts = band === "sprouts";
  const [view, setView] = useState<View>("home"); useScrollTopOn(view);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [storyDirty, setStoryDirty] = useState(false);
  const [comicId, setComicId] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [inBook, setInBook] = useState(false);
  const openChapter = (kind: "story" | "comic", id: string) => { setInBook(true); if (kind === "story") { setStoryId(id); setView("story"); } else { setComicId(id); setView("comic"); } };
  const greeting = `Hi ${child.nickname}! Want to create something or play a game?`;
  const chat = useBugleyChat(child, VIEW_CONTEXT[view], greeting, [], view === "story" ? storyId ?? undefined : undefined, view === "comic" ? comicId ?? undefined : undefined);
  const { data: glow } = useQuery({ queryKey: ["glow", child.id], queryFn: () => getChildGlow({ data: { childId: child.id } }) });
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  useEffect(() => { if (view === "home") chat.say(greeting, []); if (view === "album") chat.say("Here’s everything you’ve made!", []); if (view === "character") chat.say("Let’s invent a character! First, what kind?", []); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className={cn("min-h-screen bg-background text-foreground", `skin-${band}`)}>
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
        {view !== "home"
          ? <Button variant="ghost" onClick={() => { if (storyDirty && !window.confirm("Leave without saving your latest words?")) return; setStoryDirty(false); if (inBook && (view === "story" || view === "comic")) { setView("book"); } else { setInBook(false); setView("home"); } }}><ArrowLeft className="size-5" />{inBook && (view === "story" || view === "comic") ? "My book" : "Studio"}</Button>
          : <Link to="/kids" className="flex items-center gap-2 rounded-full px-3 py-2 font-semibold hover:bg-muted"><ArrowLeft className="size-5" />{sprouts ? "Home" : "Kid Zone"}</Link>}
        <span className="flex items-center gap-2">{view === "home" && <Button variant="ghost" onClick={() => setView("album")}><Library className="size-5" />My Album</Button>}</span>
        {glow ? <GlowMeter compact total={glow.total} allowance={glow.allowance} stage={child.bugley_stage} /> : <span className="h-10 w-32" />}
      </div>
    </header>
    <div className="mx-auto max-w-4xl space-y-6 px-4 pb-32 pt-5">
      {view !== "create" && <BugleyGuide child={child} chat={chat} />}
      <main className="min-w-0">
        {view === "create" ? <BugleyStep child={child} question="What do you want to make?" choices={CREATE_CHOICES} allowOwnIdea={false} onBack={() => setView("home")} onChoose={(c) => { const v = c.key as View; if (v === "story") setStoryId(null); if (v === "comic") setComicId(null); setInBook(false); setView(v); }} />
          : view === "home" ? <StudioHome child={child} onOpen={(v) => { if (v === "story") setStoryId(null); if (v === "comic") setComicId(null); if (v === "book") setBookId(null); setInBook(false); setView(v); }} />
          : view === "picture" ? <PictureMaker child={child} chat={chat} />
          : view === "character" ? <CharacterFlow child={child} chat={chat} onDone={() => setView("home")} onBack={() => setView("home")} />
          : view === "story" ? <StoryMaker child={child} chat={chat} storyId={storyId} onStory={setStoryId} onDirty={setStoryDirty} />
          : view === "book" ? <BookBuilder key={bookId ?? "new"} child={child} chat={chat} bookId={bookId} onBook={setBookId} onOpenChapter={openChapter} />
          : view === "comic" ? <ComicMaker child={child} chat={chat} comicId={comicId} onComic={setComicId} onDirty={setStoryDirty} />
          : <Album child={child} onStory={(id) => { setStoryId(id); setView("story"); }} onComic={(id) => { setComicId(id); setView("comic"); }} onBook={(id) => { setBookId(id); setView("book"); }} />}
      </main>
      <Sidekick child={child} chat={chat} />
    </div>
  </div>;
}

type View = "home" | "create" | "album" | "picture" | "character" | "story" | "comic" | "book";
const VIEW_CONTEXT: Record<View, string> = { home: "Studio home", create: "Choosing what to create", album: "My Album", picture: "Picture Maker", character: "Character Creator", story: "Story Maker", comic: "Comic Maker", book: "Book Builder" };

function StudioHome({ child, onOpen }: { child: SidekickChild; onOpen: (v: View) => void }) {
  const sprouts = child.age_band === "sprouts";
  const navigate = useNavigate();
  const doors = [
    { label: "CREATE", icon: Paintbrush, go: () => onOpen("create") },
    { label: "PLAY", icon: Gamepad2, go: () => void navigate({ to: "/kids/studio/games" }) },
  ];
  return <div className="space-y-6">
    <section className="grid gap-5 sm:grid-cols-2">
      {doors.map(({ label, icon: Icon, go }, i) => <button key={label} onClick={go} style={{ animationDelay: `${i * 120}ms` }}
        className={cn("studio-door-glow flex flex-col items-center justify-center gap-4 rounded-[2.5rem] border-4 border-primary bg-card p-8 shadow-soft transition animate-in fade-in zoom-in-95 fill-mode-both hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring", sprouts ? "min-h-[300px]" : "min-h-[260px]")}>
        <span className="flex size-28 items-center justify-center rounded-full bg-primary text-primary-foreground"><Icon className="size-14" /></span>
        <span className={cn("font-display tracking-wide", sprouts ? "text-5xl" : "text-4xl")}>{label}</span>
      </button>)}
    </section>
    <CharacterVault child={child} onBuild={() => onOpen("character")} />
    <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground"><Sparkles className="size-4" />You describe everything in words. No photos or uploads, ever.</p>
  </div>;
}

/** My Characters: the child's vault of approved heroes, reusable in every picture, story and comic. */
function CharacterVault({ child, onBuild }: { child: SidekickChild; onBuild: () => void }) {
  const { data: cast = [] } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
  return <section className="space-y-3">
    <h2 className="font-display text-2xl">My Characters</h2>
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {cast.map((m) => <li key={m.id} className="overflow-hidden rounded-3xl border-2 border-border bg-card text-center shadow-soft">
        {m.url ? <img src={m.url} alt={m.title} loading="lazy" className="aspect-square w-full object-cover" /> : <span className="flex aspect-square items-center justify-center bg-primary/15 text-4xl" aria-hidden>🐾</span>}
        <span className="block truncate px-2 py-1.5 text-sm font-semibold">{m.title}</span>
      </li>)}
      <li><button onClick={onBuild} className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-3xl border-4 border-dashed border-primary/60 bg-card font-display text-lg transition hover:border-primary hover:shadow-glow focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"><Sparkles className="size-6" /></span>
        Build a character
      </button></li>
    </ul>
  </section>;
}

/** Vault character building: pick a look, then the three-step builder. */
function CharacterFlow({ child, chat, onDone, onBack }: { child: SidekickChild; chat: ReturnType<typeof useBugleyChat>; onDone: () => void; onBack: () => void }) {
  const [style, setStyle] = useState<string | null>(null);
  const { data: styles = [] } = useQuery(stylesOptions);
  useEffect(() => { if (!style) chat.say("Let’s invent a character! First, pick a look.", []); }, [style]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!style) return <BugleyStep child={child} bare question="Pick a look for your character!" allowOwnIdea={false} onBack={onBack}
    choices={styles.map((s) => ({ key: s.key, label: s.name, image: STYLE_THUMBS[s.key] }))}
    onChoose={(c) => setStyle(c.key)} />;
  return <HeroBuilder child={child} chat={chat} styleKey={style} role="hero" onBack={() => setStyle(null)} onDone={onDone} />;
}

const KIND_LABEL: Record<CreationKind, string> = { picture: "Pictures", story: "Stories", comic: "Comics", book: "Books", character: "Heroes", game: "Games" };

function Album({ child, onStory, onComic, onBook }: { child: SidekickChild; onStory: (id: string) => void; onComic: (id: string) => void; onBook: (id: string) => void }) {
  const qc = useQueryClient();
  const key = ["album", child.id];
  const { data: items = [], isLoading } = useQuery({ queryKey: key, queryFn: () => listAlbum({ data: { childId: child.id } }) });
  const [filter, setFilter] = useState<CreationKind | "all" | "favorites">("all");
  const [mode, setMode] = useState<"grid" | "projects">("grid");
  const shown = useMemo(() => items.filter((c) => filter === "all" ? true : filter === "favorites" ? c.favorite : c.kind === filter), [items, filter]);
  const projects = useMemo(() => {
    const m = new Map<string, Creation[]>();
    for (const c of shown) { const p = c.project ?? c.title; m.set(p, [...(m.get(p) ?? []), c]); }
    return [...m.entries()].map(([name, list]) => [name, list.sort((a, b) => a.position - b.position)] as const);
  }, [shown]);
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  async function update(id: string, patch: { title?: string; favorite?: boolean; remove?: boolean }) {
    try {
      const r = await updateCreation({ data: { childId: child.id, id, ...patch } });
      if (!r.ok && "reply" in r) toast(r.reply);
      else if (patch.remove) toast("Moved away. A grown-up can bring it back.");
      await refresh();
    } catch { toast("Oops! Try again."); }
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h1 className="text-3xl sm:text-4xl">My Album</h1>
      <div className="flex rounded-full bg-muted p-1">{(["grid", "projects"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition", mode === m && "bg-card shadow-soft")}>{m === "grid" ? "Everything" : "Projects"}</button>)}</div>
    </div>
    <div className="flex flex-wrap gap-2">{(["all", ...CREATION_KINDS, "favorites"] as const).map((k) => <button key={k} onClick={() => setFilter(k)} className={cn("rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition", filter === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary")}>{k === "all" ? "All" : k === "favorites" ? "♥ Favorites" : KIND_LABEL[k]}</button>)}</div>
    {isLoading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-3xl bg-muted" />)}</div>
      : !shown.length ? <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-10 text-center shadow-soft">
          <Bugley stage={child.bugley_stage} expression="sleepy" size={96} />
          <p className="font-display text-xl">{items.length ? "Nothing here yet!" : "Your album is waiting for its first creation."}</p>
          <p className="text-muted-foreground">Everything you make in the Studio saves here by itself.</p>
        </div>
      : mode === "grid" ? <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">{shown.map((c) => <CreationCard key={c.id} c={c} onUpdate={update} onStory={onStory} onComic={onComic} onBook={onBook} childId={child.id} />)}</ul>
      : <div className="space-y-6">{projects.map(([name, list]) => <section key={name} className="rounded-3xl bg-card p-5 shadow-soft">
          <h2 className="text-xl">{name} <span className="text-sm font-normal text-muted-foreground">· {list.length} {list.length === 1 ? "piece" : "pieces"}</span></h2>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">{list.map((c) => <CreationCard key={c.id} c={c} onUpdate={update} onStory={onStory} onComic={onComic} onBook={onBook} childId={child.id} />)}</ul>
        </section>)}</div>}
  </div>;
}

function CreationCard({ c, onUpdate, onStory, onComic, onBook, childId }: { childId: string; c: Creation; onUpdate: (id: string, p: { title?: string; favorite?: boolean; remove?: boolean }) => void; onStory: (id: string) => void; onComic: (id: string) => void; onBook: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(c.title);
  const [confirm, setConfirm] = useState(false);
  return <li className="group overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift animate-in fade-in duration-300">
    <div className="relative aspect-square bg-muted">
      {c.images[0] ? <img src={c.images[0]} alt={c.title} loading="lazy" className="size-full object-cover" /> : <p className="line-clamp-6 p-4 text-sm text-muted-foreground">{c.body ?? ""}</p>}
      <span className="absolute left-2 top-2 rounded-full bg-background/85 px-2 py-0.5 text-xs font-semibold">{KIND_LABEL[c.kind].replace(/s$/, "")}</span>
      <button onClick={() => onUpdate(c.id, { favorite: !c.favorite })} aria-label={c.favorite ? "Unfavorite" : "Favorite"} className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-background/85"><Heart className={cn("size-5", c.favorite && "fill-current text-destructive")} /></button>
    </div>
    <div className="p-3">
      {c.kind === "story" && <Button variant="secondary" size="sm" className="mb-2 w-full" onClick={() => onStory(c.id)}><BookOpen />Open story</Button>}
      {c.kind === "comic" && <Button variant="secondary" size="sm" className="mb-2 w-full" onClick={() => onComic(c.id)}><LayoutGrid />Open comic</Button>}
      {c.kind === "game" && <Link to="/kids/studio/games" search={{ game: c.id }} className="mb-2 flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground"><Gamepad2 className="size-4" />Open game</Link>}
      {c.kind === "book" && <Button variant="secondary" size="sm" className="mb-2 w-full" onClick={() => onBook(c.id)}><Library />Open book</Button>}
      {(c.kind === "story" || c.kind === "comic") && !c.project && <Button variant="ghost" size="sm" className="mb-2 h-auto w-full whitespace-normal" onClick={async () => { try { const b = await bookFromOneShot({ data: { childId, creationId: c.id, environment: getStripeEnvironment() } }); toast.success("Your book is ready! This is Chapter 1."); onBook(b.id); } catch (e) { toast.error(e instanceof Error ? e.message : "Oops! Try again."); } }}><Library />Make it Chapter 1 of a Book</Button>}
      {editing ? <form onSubmit={(e) => { e.preventDefault(); setEditing(false); if (title.trim() && title !== c.title) onUpdate(c.id, { title }); }}>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} onBlur={() => setEditing(false)} aria-label="New name" className="w-full rounded-lg border-2 border-primary bg-background px-2 py-1" />
      </form> : <p className="truncate font-display">{c.title}</p>}
      <div className="mt-2 flex items-center justify-between text-muted-foreground">
        <span className="text-xs">{new Date(c.created_at).toLocaleDateString()}</span>
        <span className="flex gap-1">
          <button onClick={() => setEditing(true)} aria-label="Rename" className="rounded-full p-1.5 hover:bg-muted"><Pencil className="size-4" /></button>
          {confirm ? <button onClick={() => onUpdate(c.id, { remove: true })} className="rounded-full bg-destructive px-2 text-xs font-semibold text-destructive-foreground">Sure?</button>
            : <button onClick={() => setConfirm(true)} onBlur={() => setConfirm(false)} aria-label="Delete" className="rounded-full p-1.5 hover:bg-muted"><Trash2 className="size-4" /></button>}
        </span>
      </div>
    </div>
  </li>;
}
