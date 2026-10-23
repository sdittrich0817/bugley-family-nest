import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, Library, Plus, RefreshCw, Save, Trash2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bugley } from "@/components/brand/Bugley";
import { StylePicker } from "./Makers";
import { PageGrid } from "./ComicMaker";
import { speak, type BugleyChat, type SidekickChild } from "./Sidekick";
import { listCast } from "@/lib/images.functions";
import { createBook, editBook, getBook, startChapter } from "@/lib/book.functions";
import type { Book, BookChapter } from "@/lib/book.server";
import { printMessage, printedPages, pagesUntilPrintable, PRINT_RULES, type Bible, type BookFormat } from "@/lib/book";
import { GENRES } from "@/lib/story";
import { getStripeEnvironment } from "@/lib/stripe";
import { cn } from "@/lib/utils";

const field = "w-full rounded-lg border-2 border-border bg-background p-3 text-foreground outline-none focus:border-primary";
const chapterPages = (c: BookChapter) => c.kind === "story" ? c.story.data.pages.length : c.comic.data.pages.length;
export const bookPageCount = (book: Book) => printedPages(book.chapters.reduce((n, c) => n + chapterPages(c), 0), !!book.data.dedication.trim());

export function BookBuilder({ child, chat, bookId, onBook, onOpenChapter }: { child: SidekickChild; chat: BugleyChat; bookId: string | null; onBook: (id: string) => void; onOpenChapter: (kind: "story" | "comic", id: string) => void }) {
  const env = getStripeEnvironment();
  const qc = useQueryClient();
  const load = useServerFn(getBook), create = useServerFn(createBook), edit = useServerFn(editBook), start = useServerFn(startChapter);
  const { data: cast = [] } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
  const [book, setBook] = useState<Book | null>(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  // create form
  const [format, setFormat] = useState<BookFormat>("story");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<(typeof GENRES)[number]>("Adventure");
  const [style, setStyle] = useState("storybook");
  const [picked, setPicked] = useState<string[]>([]);
  // book form
  const [chapterTitle, setChapterTitle] = useState("");
  const [newCast, setNewCast] = useState<string[]>([]);
  const [bible, setBible] = useState<Bible | null>(null);
  const [author, setAuthor] = useState("");
  const [dedication, setDedication] = useState("");
  const [coverText, setCoverText] = useState("");
  function adopt(b: Book) { setBook(b); setBible(b.data.bible); setAuthor(b.data.author); setDedication(b.data.dedication); }
  useEffect(() => {
    if (!bookId) return;
    let on = true; setBusy(true);
    void load({ data: { childId: child.id, id: bookId } }).then((b) => { if (on) adopt(b); }).catch((e) => toast.error(e.message)).finally(() => { if (on) setBusy(false); });
    return () => { on = false; };
  }, [bookId, child.id, load]);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["album", child.id] }); void qc.invalidateQueries({ queryKey: ["glow", child.id] }); };
  async function run<T>(fn: () => Promise<T>, ok?: string) {
    setBusy(true);
    try { const r = await fn(); if (ok) toast.success(ok); return r; }
    catch (e) { toast.error(e instanceof Error ? e.message : "Oops! Try again."); return undefined; }
    finally { setBusy(false); refresh(); }
  }
  const doEdit = (action: "bible" | "author" | "dedication" | "cover" | "absorb" | "order", extra: { bible?: Bible; text?: string; chapterIds?: string[] }, ok = "Saved!") =>
    book && run(async () => adopt(await edit({ data: { childId: child.id, id: book.id, environment: env, action, ...extra } })), ok);

  if (bookId && !book) return <div className="flex min-h-64 flex-col items-center justify-center gap-4"><Bugley expression="thinking" stage={child.bugley_stage} size={100} /><p>Opening your book…</p></div>;
  if (!book) return <div className="space-y-6">
    <h1 className="text-3xl">Start a Book</h1>
    <p className="text-muted-foreground">A Book holds many chapters. Bugley keeps a Story Bible so everything stays consistent.</p>
    <div className="flex gap-2">{(["story", "comic"] as const).map((f) => <Button key={f} variant={format === f ? "primary" : "outline"} aria-pressed={format === f} onClick={() => { setFormat(f); setStyle(f === "comic" ? "classic_comic" : "storybook"); }}>{f === "story" ? "Story book" : "Comic book"}</Button>)}</div>
    <label className="block space-y-2 font-semibold"><span>Book title</span><input className={field} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Give it a made-up name" /></label>
    <section className="space-y-3"><h2 className="text-xl">What kind of book?</h2><div className="flex flex-wrap gap-2">{GENRES.map((g) => <Button key={g} size="sm" variant={genre === g ? "primary" : "outline"} aria-pressed={genre === g} onClick={() => setGenre(g)}>{g}</Button>)}</div></section>
    <section className="space-y-3"><h2 className="text-xl">Who’s in it?</h2><CastPicker cast={cast} picked={picked} onChange={setPicked} />{!cast.length && <p className="text-sm text-muted-foreground">Make characters in the Characters tile first, or add them in a later chapter.</p>}</section>
    <section className="space-y-3"><h2 className="text-xl">Art style <span className="text-sm font-normal text-muted-foreground">· stays the same for the whole book</span></h2><StylePicker value={style} onChange={setStyle} /></section>
    <Button disabled={busy || !title.trim()} onClick={() => void run(async () => { const b = await create({ data: { childId: child.id, title, format, genre, styleKey: style, characterIds: picked, environment: env } }); adopt(b); onBook(b.id); chat.say("A brand-new book! What’s Chapter 1 called? Your call!"); })}><Library />{busy ? "Starting…" : "Start my book"}</Button>
  </div>;

  if (reading) return <BookReader book={book} readAloud={child.age_band === "sprouts"} onBack={() => setReading(false)} />;
  const pages = bookPageCount(book);
  const rule = PRINT_RULES[book.data.format];
  const left = pagesUntilPrintable(book.data.format, pages);
  const notInBook = cast.filter((c) => !book.data.characterIds.includes(c.id));
  const ids = book.data.chapterIds.filter((id) => book.chapters.some((c) => c.id === id));
  const move = (i: number, to: number) => { const next = [...ids]; const [x] = next.splice(i, 1); next.splice(to, 0, x!); void doEdit("order", { chapterIds: next }, "Chapters reordered"); };
  return <div className="space-y-8" aria-busy={busy}>
    <div className="space-y-2">
      <h1 className="break-words text-3xl">{book.title}</h1>
      <p className="text-sm text-muted-foreground">{book.data.format === "comic" ? "Comic book" : "Story book"} · {book.data.genre} · {book.data.styleKey.replaceAll("_", " ")} · {book.chapters.length} {book.chapters.length === 1 ? "chapter" : "chapters"}</p>
      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <p className="font-display text-lg">{printMessage(book.data.format, pages)}</p>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (pages / (pages + left || 1)) * 100)}%` }} /></div>
        <p className="mt-1 text-xs text-muted-foreground">{pages} pages, counting the title page and “The End.” {book.data.format === "comic" ? `Comics print at ${rule.min}+ pages; blank pages fill it to a group of ${rule.multiple}.` : `Story books print at ${rule.min}+ pages.`}</p>
        {left === 0 && <AskToPrint childId={child.id} bookId={book.id} onAsked={() => chat.say("I sent it to your grown-up! Fingers crossed!")} />}
      </div>
      <Button variant="secondary" disabled={busy} onClick={() => setReading(true)}><BookOpen />Preview the whole book</Button>
    </div>

    <section className="space-y-3">
      <h2 className="text-2xl">Chapters</h2>
      <ol className="space-y-2">{ids.map((id, i) => { const c = book.chapters.find((x) => x.id === id)!; const done = c.kind === "story" ? c.story.data.finished : c.comic.data.finished; return <li key={id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <span className="font-display">Chapter {i + 1}: {c.title}</span>
        <span className="text-xs text-muted-foreground">{chapterPages(c)} pages{done ? " · finished" : ""}</span>
        <span className="ml-auto flex gap-1">
          <Button size="icon" variant="ghost" aria-label="Move chapter earlier" disabled={!i || busy} onClick={() => move(i, i - 1)}><ArrowUp /></Button>
          <Button size="icon" variant="ghost" aria-label="Move chapter later" disabled={i === ids.length - 1 || busy} onClick={() => move(i, i + 1)}><ArrowDown /></Button>
          <Button size="sm" variant="secondary" onClick={() => onOpenChapter(c.kind, c.id)}>{done ? "Read" : "Keep going"}</Button>
        </span>
      </li>; })}</ol>
      <div className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
        <h3 className="text-xl">Start Chapter {ids.length + 1}</h3>
        <input className={field} value={chapterTitle} maxLength={80} onChange={(e) => setChapterTitle(e.target.value)} placeholder="Chapter title" aria-label="Chapter title" />
        {notInBook.length > 0 && <div className="space-y-2"><p className="text-sm font-semibold">New characters joining the cast?</p><CastPicker cast={notInBook} picked={newCast} onChange={setNewCast} /></div>}
        <Button disabled={busy || !chapterTitle.trim()} onClick={() => void run(async () => {
          const r = await start({ data: { childId: child.id, bookId: book.id, title: chapterTitle, newCharacterIds: newCast, environment: env } });
          setChapterTitle(""); setNewCast([]); chat.say(r.recap); onOpenChapter(r.kind, r.chapterId);
        })}><Plus />{busy ? "Bugley is reading the Story Bible…" : "Start chapter"}</Button>
      </div>
    </section>

    {bible && <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-2xl">Story Bible</h2><Button size="sm" variant="ghost" disabled={busy || !book.chapters.length} onClick={() => void doEdit("absorb", {}, "Story Bible updated")}><RefreshCw />Update from my chapters</Button></div>
      <p className="text-sm text-muted-foreground">Bugley reads this before every chapter. It grows as you write, and you can change anything.</p>
      <div className="space-y-2"><h3 className="text-lg">Cast</h3><ul className="grid gap-3 sm:grid-cols-2">{bible.cast.map((c) => <li key={c.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
        {book.urls[`cast:${c.id}`] ? <img src={book.urls[`cast:${c.id}`]} alt="" className="size-16 shrink-0 rounded-lg object-cover" /> : <span className="size-16 shrink-0 rounded-lg bg-muted" />}
        <label className="min-w-0 flex-1 space-y-1"><span className="font-display">{book.castNames[c.id] ?? "Character"}</span><input className={cn(field, "p-2 text-sm")} maxLength={300} value={c.note} placeholder="Notes: looks, powers, friends…" onChange={(e) => setBible({ ...bible, cast: bible.cast.map((x) => x.id === c.id ? { ...x, note: e.target.value } : x) })} /></label>
      </li>)}{!bible.cast.length && <p className="text-sm text-muted-foreground">No characters yet.</p>}</ul></div>
      {(["places", "events", "mysteries"] as const).map((k) => <BibleList key={k} label={k === "places" ? "Places" : k === "events" ? "Important events so far" : "Open mysteries"} items={bible[k]} onChange={(items) => setBible({ ...bible, [k]: items })} />)}
      <Button disabled={busy || JSON.stringify(bible) === JSON.stringify(book.data.bible)} onClick={() => void doEdit("bible", { bible })}><Save />Save Story Bible</Button>
    </section>}

    <section className="space-y-4 border-t border-border pt-6">
      <h2 className="text-2xl">Book Builder</h2>
      <div className="space-y-2"><label className="block space-y-1"><span className="font-semibold">Author name</span><input className={field} maxLength={40} value={author} onChange={(e) => setAuthor(e.target.value)} /></label>
        <p className="text-sm text-muted-foreground">Use your first name or a made-up pen name. A grown-up says OK to pen names.</p>
        <div className="flex flex-wrap items-center gap-2"><Button size="sm" disabled={busy || !author.trim() || author === book.data.author} onClick={() => void doEdit("author", { text: author })}><Save />Save name</Button>
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", book.data.authorStatus === "approved" ? "bg-primary/25" : "bg-muted")}>{book.data.authorStatus === "approved" ? <><Check className="inline size-3" /> {book.data.author}</> : book.data.authorStatus === "pending" ? `“${book.data.author}” is waiting for a grown-up’s OK` : `A grown-up said not this time. Your book shows ${child.nickname}.`}</span></div></div>
      <label className="block space-y-1"><span className="font-semibold">Dedication (optional)</span><textarea rows={2} maxLength={300} className={field} value={dedication} placeholder="For everyone who loves dragons" onChange={(e) => setDedication(e.target.value)} /></label>
      <Button size="sm" variant="outline" disabled={busy || dedication === book.data.dedication} onClick={() => void doEdit("dedication", { text: dedication })}><Save />Save dedication</Button>
      <label className="block space-y-1"><span className="font-semibold">Cover illustration</span><textarea rows={2} maxLength={300} className={field} value={coverText} placeholder="What’s on the cover?" onChange={(e) => setCoverText(e.target.value)} /></label>
      <Button variant="secondary" disabled={busy || coverText.trim().length < 3} onClick={() => void doEdit("cover", { text: coverText }, "Cover drawn!")}>{book.data.cover ? "Draw cover again · 3 glow" : "Draw cover · 3 glow"}</Button>
      <div className="mx-auto max-w-xs"><BookCover book={book} /></div>
    </section>
  </div>;
}

function CastPicker({ cast, picked, onChange }: { cast: { id: string; title: string; url: string }[]; picked: string[]; onChange: (ids: string[]) => void }) {
  return <div className="flex flex-wrap gap-3">{cast.map((c) => <Button key={c.id} variant={picked.includes(c.id) ? "primary" : "outline"} aria-pressed={picked.includes(c.id)} className="h-auto max-w-32 flex-col whitespace-normal p-2" onClick={() => onChange(picked.includes(c.id) ? picked.filter((x) => x !== c.id) : [...picked, c.id])}><img src={c.url} alt="" className="size-20 rounded-lg object-cover" /><span className="break-words">{c.title}</span></Button>)}</div>;
}

function BibleList({ label, items, onChange }: { label: string; items: string[]; onChange: (x: string[]) => void }) {
  const [draft, setDraft] = useState("");
  return <div className="space-y-2"><h3 className="text-lg">{label}</h3>
    <ul className="space-y-1">{items.map((t, i) => <li key={i} className="flex gap-2"><input className={cn(field, "p-2 text-sm")} maxLength={300} value={t} aria-label={label} onChange={(e) => onChange(items.map((x, j) => j === i ? e.target.value : x))} /><Button size="icon" variant="ghost" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 /></Button></li>)}</ul>
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(""); } }}><input className={cn(field, "p-2 text-sm")} maxLength={300} value={draft} placeholder="Add one…" aria-label={`Add to ${label}`} onChange={(e) => setDraft(e.target.value)} /><Button size="icon" variant="outline" type="submit" aria-label="Add"><Plus /></Button></form>
  </div>;
}

export const authorFor = (book: Book, nickname: string) => book.data.authorStatus === "approved" ? book.data.author : nickname;

function BookCover({ book, nickname }: { book: Book; nickname?: string }) {
  const names = book.data.characterIds.map((id) => book.castNames[id]).filter(Boolean);
  return <div className="relative aspect-[3/4] overflow-hidden rounded-lg border-4 border-foreground bg-muted">
    {book.data.cover && book.urls[book.data.cover] && <img src={book.urls[book.data.cover]} alt="Book cover" className="absolute inset-0 size-full object-cover" />}
    <div className="absolute inset-x-0 top-0 bg-primary/90 p-3 text-center"><p className={cn("break-words text-3xl text-primary-foreground", book.data.format === "comic" ? "font-sfx" : "font-display")}>{book.title}</p></div>
    <div className="absolute inset-x-0 bottom-0 bg-background/85 p-2 text-center text-xs font-semibold">by {nickname ? authorFor(book, nickname) : book.data.author}{names.length ? ` · Starring ${names.join(", ")}` : ""}</div>
  </div>;
}

type Slide = { key: string; render: () => React.ReactNode; say: string };
export function BookReader({ book, readAloud, onBack, nickname }: { book: Book; readAloud?: boolean; onBack?: () => void; nickname?: string }) {
  const [i, setI] = useState(0);
  const author = authorFor(book, nickname ?? book.data.author);
  const slides: Slide[] = [
    { key: "cover", say: book.title, render: () => <BookCover book={book} nickname={nickname ?? book.data.author} /> },
    { key: "title", say: `${book.title}, by ${author}`, render: () => <Paper><h2 className="text-4xl">{book.title}</h2><p className="mt-4 text-lg">by {author}</p></Paper> },
    ...(book.data.dedication.trim() ? [{ key: "ded", say: book.data.dedication, render: () => <Paper><p className="text-xl italic">{book.data.dedication}</p></Paper> }] : []),
    ...book.data.chapterIds.flatMap((cid, ci) => {
      const c = book.chapters.find((x) => x.id === cid);
      if (!c) return [];
      const head = <p className="mb-2 text-sm font-semibold text-muted-foreground">Chapter {ci + 1}: {c.title}</p>;
      if (c.kind === "story") return c.story.data.pages.map((p, pi) => ({ key: p.id, say: p.text, render: () => <div className="space-y-3">{pi === 0 && head}{p.image && c.story.urls[p.image] ? <img src={c.story.urls[p.image]} alt={p.description} className="aspect-square w-full rounded-lg bg-muted object-contain" /> : null}<p className="whitespace-pre-wrap break-words text-lg leading-relaxed">{p.text}</p></div> }));
      return c.comic.data.pages.map((p, pi) => ({ key: p.id, say: p.panels.flatMap((x) => x.layers.map((l) => l.text)).filter(Boolean).join(". "), render: () => <div>{pi === 0 && head}<PageGrid page={p} urls={c.comic.urls} /></div> }));
    }),
    { key: "end", say: "The End", render: () => <Paper><p className={cn("text-5xl", book.data.format === "comic" ? "font-sfx" : "font-display")}>The End</p></Paper> },
  ];
  const s = slides[Math.min(i, slides.length - 1)]!;
  useEffect(() => { if (readAloud) speak(s.say); return () => window.speechSynthesis?.cancel(); }, [i, readAloud, s.say]);
  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-2">{onBack ? <Button variant="ghost" onClick={onBack}><ArrowLeft />Back to my book</Button> : <h2 className="break-words text-xl">{book.title}</h2>}<Button variant="ghost" size="icon" aria-label="Read aloud" onClick={() => speak(s.say)}><Volume2 /></Button></div>
    <div className="mx-auto max-w-md animate-in fade-in duration-300" key={s.key} aria-live="polite">{s.render()}</div>
    <div className="flex items-center justify-between gap-3"><Button variant="outline" aria-label="Previous page" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft /></Button><span className="text-sm">{i + 1} / {slides.length}</span><Button variant="outline" aria-label="Next page" disabled={i >= slides.length - 1} onClick={() => setI(i + 1)}><ArrowRight /></Button></div>
  </div>;
}
const Paper = ({ children }: { children: React.ReactNode }) => <div className="flex aspect-[3/4] flex-col items-center justify-center rounded-lg border border-border bg-card p-8 text-center shadow-soft">{children}</div>;
