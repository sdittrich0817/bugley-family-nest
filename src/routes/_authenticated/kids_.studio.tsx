import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Smile, Gamepad2, Heart, Image as ImageIcon, LayoutGrid, Library, Mic, Pencil, Sparkles, Trash2, Volume2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { familyOptions } from "@/lib/family.functions";
import { getChildGlow } from "@/lib/glow.functions";
import { getActivePlayer, setKidZoneLocked, type Band } from "@/lib/kid-zone";
import { listAlbum, updateCreation, CREATION_KINDS, type Creation, type CreationKind } from "@/lib/studio.functions";
import { billingOptions } from "@/lib/billing.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { GlowMeter } from "@/components/studio/GlowMeter";
import { Sidekick, speak, useBugleyChat, useVoiceInput, type BugleyChat, type SidekickChild } from "@/components/studio/Sidekick";
import { Bugley } from "@/components/brand/Bugley";
import { CharacterCreator, PictureMaker } from "@/components/studio/Makers";
import { StoryMaker } from "@/components/studio/StoryMaker";
import { ComicMaker } from "@/components/studio/ComicMaker";
import { Button } from "@/components/ui/button";
import { BugleyMature } from "@/components/brand/BugleyMature";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/kids_/studio")({
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

const TILES: { key: string; label: string; icon: typeof ImageIcon; ready: boolean }[] = [
  { key: "picture", label: "Picture", icon: ImageIcon, ready: true },
  { key: "character", label: "Characters", icon: Smile, ready: true },
  { key: "story", label: "Story", icon: BookOpen, ready: true },
  { key: "comic", label: "Comic", icon: LayoutGrid, ready: true },
  { key: "games", label: "Games", icon: Gamepad2, ready: false },
  { key: "album", label: "My Album", icon: Library, ready: true },
];

function Studio({ child }: { child: SidekickChild & { age_band: Band } }) {
  const band = child.age_band;
  const sprouts = band === "sprouts", builders = band === "builders";
  const [view, setView] = useState<View>("home");
  const [storyId, setStoryId] = useState<string | null>(null);
  const [storyDirty, setStoryDirty] = useState(false);
  const [comicId, setComicId] = useState<string | null>(null);
  const greeting = `Hi ${child.nickname}! What should we make today?`;
  const chat = useBugleyChat(child, VIEW_CONTEXT[view], greeting,
    sprouts ? ["A silly dragon", "A rainbow castle"] : builders ? ["Help me pick a project", "Invent a world"] : ["A space mystery", "A brave little robot"], view === "story" ? storyId ?? undefined : undefined, view === "comic" ? comicId ?? undefined : undefined);
  const { data: glow } = useQuery({ queryKey: ["glow", child.id], queryFn: () => getChildGlow({ data: { childId: child.id } }) });
  useEffect(() => { if (sprouts) speak(greeting); return () => window.speechSynthesis?.cancel(); }, [child.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className={cn("min-h-screen bg-background text-foreground", `skin-${band}`)}>
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        {view !== "home"
          ? <Button variant="ghost" onClick={() => { if (storyDirty && !window.confirm("Leave without saving your latest words?")) return; setStoryDirty(false); setView("home"); }}><ArrowLeft className="size-5" />Studio</Button>
          : <Link to="/kids" className="flex items-center gap-2 rounded-full px-3 py-2 font-semibold hover:bg-muted"><ArrowLeft className="size-5" />{sprouts ? "Home" : "Kid Zone"}</Link>}
        <span className="hidden font-display text-lg sm:block">Bugley’s Studio</span>
        {glow ? <GlowMeter compact total={glow.total} allowance={glow.allowance} stage={child.bugley_stage} /> : <span className="h-10 w-32" />}
      </div>
    </header>
    <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-28 pt-6">
      <main className="min-w-0 flex-1">
        {view === "home" ? <StudioHome child={child} chat={chat} greeting={greeting} onOpen={(v) => { if (v === "story") setStoryId(null); if (v === "comic") setComicId(null); setView(v); }} />
          : view === "picture" ? <PictureMaker child={child} chat={chat} />
          : view === "character" ? <CharacterCreator child={child} chat={chat} onDone={() => setView("album")} />
          : view === "story" ? <StoryMaker child={child} chat={chat} storyId={storyId} onStory={setStoryId} onDirty={setStoryDirty} />
          : view === "comic" ? <ComicMaker child={child} chat={chat} comicId={comicId} onComic={setComicId} onDirty={setStoryDirty} />
          : <Album child={child} onStory={(id) => { setStoryId(id); setView("story"); }} onComic={(id) => { setComicId(id); setView("comic"); }} />}
      </main>
      <Sidekick child={child} chat={chat} />
    </div>
  </div>;
}

type View = "home" | "album" | "picture" | "character" | "story" | "comic";
const VIEW_CONTEXT: Record<View, string> = { home: "Studio home", album: "My Album", picture: "Picture Maker", character: "Character Creator", story: "Story Maker", comic: "Comic Maker" };

function StudioHome({ child, chat, greeting, onOpen }: { child: SidekickChild; chat: BugleyChat; greeting: string; onOpen: (v: View) => void }) {
  const sprouts = child.age_band === "sprouts", builders = child.age_band === "builders";
  const [idea, setIdea] = useState("");
  const voice = useVoiceInput((t) => setIdea(t));
  const last = [...chat.messages].reverse().find((m) => m.from === "bugley")?.text ?? greeting;
  const submit = () => { if (idea.trim()) { void chat.send(idea, "prompt_bar"); setIdea(""); } };
  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-[2rem] bg-card p-6 shadow-soft sm:p-8">
      <div aria-hidden className="glow-blob pointer-events-none absolute -right-16 -top-16 size-64 rounded-full opacity-60" />
      <div className={cn("relative flex items-center gap-5", sprouts && "flex-col text-center")}>
        {builders ? <BugleyMature variant="headphones" size={88} /> : <Bugley stage={child.bugley_stage} expression={chat.busy ? "thinking" : "happy"} glow size={sprouts ? 150 : 112} />}
        <div className="min-w-0 flex-1">
          <h1 className={cn("leading-tight", sprouts ? "text-4xl" : "text-3xl sm:text-4xl")}>Hi {child.nickname}! What should we make today?</h1>
          <p className="mt-3 text-muted-foreground animate-in fade-in duration-500" key={last} aria-live="polite">{last === greeting ? "Tell me your idea. I’ll ask questions, and you decide everything!" : last}</p>
          {sprouts && <button onClick={() => speak(last)} className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 font-semibold"><Volume2 className="size-5" />Hear Bugley</button>}
        </div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="relative mt-6 flex items-center gap-2 rounded-full border-2 border-border bg-background p-1.5 shadow-soft transition focus-within:border-primary focus-within:shadow-glow">
        <Wand2 className="ml-3 size-5 shrink-0 text-muted-foreground" />
        <input value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={600} placeholder="Tell Bugley your idea..." aria-label="Tell Bugley your idea" className={cn("min-w-0 flex-1 bg-transparent px-1 outline-none", sprouts ? "h-14 text-xl" : "h-12 text-lg")} />
        {sprouts && voice.supported && <button type="button" onClick={voice.start} aria-label="Say your idea" className={cn("flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary", voice.listening && "animate-pulse bg-primary")}><Mic className="size-6" /></button>}
        <button type="submit" disabled={chat.busy || !idea.trim()} className={cn("shrink-0 rounded-full bg-primary px-5 font-display text-primary-foreground shadow-glow transition disabled:opacity-50", sprouts ? "h-14 text-xl" : "h-12")}>{chat.busy ? "…" : "Go"}</button>
      </form>
    </section>
    <section className={cn("grid gap-4", sprouts ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
      {TILES.map(({ key, label, icon: Icon, ready }, i) => <button key={key} onClick={ready ? () => onOpen(key as View) : () => toast(`${label} is coming soon!`)}
        style={{ animationDelay: `${i * 60}ms` }}
        className={cn("group relative flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-border bg-card p-5 shadow-soft transition duration-200 animate-in fade-in zoom-in-95 fill-mode-both hover:-translate-y-1 hover:border-primary hover:shadow-glow focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring", sprouts ? "min-h-44" : "min-h-36", key === "album" && (sprouts ? "col-span-2" : "col-span-2 sm:col-span-3"))}>
        <span className={cn("flex items-center justify-center rounded-2xl bg-primary/25 transition group-hover:bg-primary", sprouts ? "size-20" : "size-16")}><Icon className={sprouts ? "size-10" : "size-8"} /></span>
        <span className={cn("font-display", sprouts ? "text-2xl" : "text-xl")}>{label}</span>
        {!ready && <span className="rounded-full bg-muted px-3 py-0.5 text-xs font-semibold text-muted-foreground">Coming soon</span>}
      </button>)}
    </section>
    <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground"><Sparkles className="size-4" />You describe everything in words. No photos or uploads, ever.</p>
  </div>;
}

const KIND_LABEL: Record<CreationKind, string> = { picture: "Pictures", story: "Stories", comic: "Comics", book: "Books", character: "Characters", game: "Games" };

function Album({ child, onStory, onComic }: { child: SidekickChild; onStory: (id: string) => void; onComic: (id: string) => void }) {
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
      : mode === "grid" ? <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">{shown.map((c) => <CreationCard key={c.id} c={c} onUpdate={update} onStory={onStory} onComic={onComic} />)}</ul>
      : <div className="space-y-6">{projects.map(([name, list]) => <section key={name} className="rounded-3xl bg-card p-5 shadow-soft">
          <h2 className="text-xl">{name} <span className="text-sm font-normal text-muted-foreground">· {list.length} {list.length === 1 ? "piece" : "pieces"}</span></h2>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">{list.map((c) => <CreationCard key={c.id} c={c} onUpdate={update} onStory={onStory} onComic={onComic} />)}</ul>
        </section>)}</div>}
  </div>;
}

function CreationCard({ c, onUpdate, onStory, onComic }: { c: Creation; onUpdate: (id: string, p: { title?: string; favorite?: boolean; remove?: boolean }) => void; onStory: (id: string) => void; onComic: (id: string) => void }) {
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
