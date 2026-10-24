import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, Keyboard, Library, Mic, Plus, Printer, RefreshCw, Save, Trash2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bugley } from "@/components/brand/Bugley";
import { StylePicker } from "./Makers";
import { PageGrid } from "./ComicMaker";
import { speak, useVoiceInput, type BugleyChat, type SidekickChild } from "./Sidekick";
import { listCast } from "@/lib/images.functions";
import { requestPrint } from "@/lib/print.functions";
import { createBook, editBook, getBook, startChapter } from "@/lib/book.functions";
import type { Book, BookChapter } from "@/lib/book.server";
import { printMessage, printedPages, pagesUntilPrintable, PRINT_RULES, type Bible, type BookFormat } from "@/lib/book";
import { GENRES } from "@/lib/story";
import { getStripeEnvironment } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import { BugleyStep } from "./BugleyStep";
import { GENRE_EMOJI } from "./Guided";
import { useScrollTopOn } from "@/lib/scroll";

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
  const [setupStep, setSetupStep] = useState(0);
  const [editorStep, setEditorStep] = useState(0);
  const [chapterStep, setChapterStep] = useState(0);
  useScrollTopOn(`${setupStep}-${editorStep}-${chapterStep}-${reading}`);
  const question = !book ? ["Story book or comic book?", "What’s your book called?", "What kind of adventure?", "Who’s in your book?", "Pick your book’s look!"][setupStep] : ["Which chapter is next?", "What should we remember?", "What’s your made-up author name?", "Who is your book for?", "What’s on your cover?"][editorStep];
  useEffect(() => { if (question) chat.say(question, []); }, [question]); // eslint-disable-line react-hooks/exhaustive-deps
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
    catch (e) { const message=e instanceof Error ? e.message : "Oops! Try again.";toast.error(message);const {safetyAlternatives}=await import('./SafeRetry');chat.say(message,safetyAlternatives(message));return undefined; }
    finally { setBusy(false); refresh(); }
  }
  const doEdit = (action: "bible" | "author" | "dedication" | "cover" | "absorb" | "order", extra: { bible?: Bible; text?: string; chapterIds?: string[] }, ok = "Saved!") =>
    book && run(async () => adopt(await edit({ data: { childId: child.id, id: book.id, environment: env, action, ...extra } })), ok);

  if (bookId && !book) return <div className="flex min-h-64 flex-col items-center justify-center gap-4"><Bugley expression="thinking" stage={child.bugley_stage} size={100} /><p>Opening your book…</p></div>;
  if (!book) return <div className="space-y-5" aria-busy={busy}>
    {setupStep === 0 && <BugleyStep child={child} bare question={question ?? "Pick a book"} choices={[{key:"story",label:"Story book",emoji:"📖"},{key:"comic",label:"Comic book",emoji:"💥"}]} allowOwnIdea={false} step={0} steps={5} onChoose={c => { const f = c.key === "comic" ? "comic" : "story"; setFormat(f); setStyle(f === "comic" ? "classic_comic" : "storybook"); setSetupStep(1); }} />}
    {setupStep === 1 && <BugleyStep child={child} bare question={question ?? "Book title"} choices={[]} step={1} steps={5} onBack={() => setSetupStep(0)} onChoose={() => {}} initialAnswer={title} maxAnswer={80} longAnswer onOwnIdea={t => {setTitle(t);setSetupStep(2);}} />}
    {setupStep === 2 && <BugleyStep child={child} bare question={question ?? "Pick an adventure"} choices={GENRES.map(g => ({key:g,label:g,emoji:GENRE_EMOJI[g]}))} allowOwnIdea={false} step={2} steps={5} onBack={() => setSetupStep(1)} onChoose={c => {const g=GENRES.find(g=>g===c.key);if(g){setGenre(g);setSetupStep(3);}}} />}
    {setupStep === 3 && <><CastPicker cast={cast} picked={picked} onChange={setPicked} max={3} /><div className="flex justify-between gap-3"><Button variant="ghost" onClick={()=>setSetupStep(2)}><ArrowLeft/>Back</Button><Button onClick={()=>setSetupStep(4)}>{picked.length ? "These heroes!" : "No heroes yet"}<ArrowRight/></Button></div></>}
    {setupStep === 4 && <><StylePicker value={style} onChange={setStyle} /><div className="flex flex-wrap justify-between gap-3"><Button variant="ghost" onClick={()=>setSetupStep(3)}><ArrowLeft/>Back</Button><Button disabled={busy || !title.trim()} onClick={() => void run(async () => { const b = await create({ data: { childId: child.id, title, format, genre, styleKey: style, characterIds: picked, environment: env } }); adopt(b); onBook(b.id); })}><Library />{busy ? "Starting…" : "Start my book"}</Button></div></>}
  </div>;

  if (reading) return <BookReader book={book} readAloud={child.age_band === "sprouts"} onBack={() => setReading(false)} />;
  const pages = bookPageCount(book);
  const rule = PRINT_RULES[book.data.format];
  const left = pagesUntilPrintable(book.data.format, pages);
  const notInBook = cast.filter((c) => !book.data.characterIds.includes(c.id));
  const ids = book.data.chapterIds.filter((id) => book.chapters.some((c) => c.id === id));
  const move = (i: number, to: number) => { const next = [...ids]; const [x] = next.splice(i, 1); if (!x) return; next.splice(to, 0, x); void doEdit("order", { chapterIds: next }, "Chapters reordered"); };
  return <div className="space-y-8" aria-busy={busy}>
    <div className="flex items-center justify-between gap-3"><Button variant="outline" size="icon" aria-label="Previous book question" disabled={!editorStep} onClick={()=>setEditorStep(editorStep-1)}><ArrowLeft/></Button><span className="font-display">{editorStep+1} / 5</span><Button variant="outline" size="icon" aria-label="Next book question" disabled={editorStep===4} onClick={()=>setEditorStep(editorStep+1)}><ArrowRight/></Button></div>
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

    {editorStep === 0 && <section className="space-y-3">
      <h2 className="text-2xl">Chapters</h2>
      <ol className="space-y-2">{ids.map((id, i) => { const c = book.chapters.find((x) => x.id === id); if (!c) return null; const done = c.kind === "story" ? c.story.data.finished : c.comic.data.finished; return <li key={id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <span className="font-display">Chapter {i + 1}: {c.title}</span>
        <span className="text-xs text-muted-foreground">{chapterPages(c)} pages{done ? " · finished" : ""}</span>
        <span className="ml-auto flex gap-1">
          <Button size="icon" variant="ghost" aria-label="Move chapter earlier" disabled={!i || busy} onClick={() => move(i, i - 1)}><ArrowUp /></Button>
          <Button size="icon" variant="ghost" aria-label="Move chapter later" disabled={i === ids.length - 1 || busy} onClick={() => move(i, i + 1)}><ArrowDown /></Button>
          <Button size="sm" variant="secondary" onClick={() => onOpenChapter(c.kind, c.id)}>{done ? "Read" : "Keep going"}</Button>
        </span>
      </li>; })}</ol>
      <div className="space-y-3 border-t border-border pt-4">
        <h3 className="text-xl">Start Chapter {ids.length + 1}</h3>
        <BookWords label="Chapter title" child={child} value={chapterTitle} maxLength={80} onChange={setChapterTitle} />
        {chapterStep === 1 && notInBook.length > 0 && <div className="space-y-2"><p className="text-sm font-semibold">New characters joining the cast?</p><CastPicker cast={notInBook} picked={newCast} onChange={setNewCast} max={3-book.data.characterIds.length} /></div>}
        {chapterStep===0 && notInBook.length>0 ? <Button disabled={!chapterTitle.trim()} onClick={()=>setChapterStep(1)}>Next<ArrowRight/></Button> : <Button disabled={busy || !chapterTitle.trim()} onClick={() => void run(async () => {
          const r = await start({ data: { childId: child.id, bookId: book.id, title: chapterTitle, newCharacterIds: newCast, environment: env } });
          setChapterTitle(""); setNewCast([]); chat.say(r.recap); onOpenChapter(r.kind, r.chapterId);
        })}><Plus />{busy ? "Bugley is reading the Story Bible…" : "Start chapter"}</Button>}
      </div>
    </section>}

    {editorStep === 1 && bible && <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-2xl">Story Bible</h2><Button size="sm" variant="ghost" disabled={busy || !book.chapters.length} onClick={() => void doEdit("absorb", {}, "Story Bible updated")}><RefreshCw />Update from my chapters</Button></div>
      <p className="text-sm text-muted-foreground">Bugley reads this before every chapter. It grows as you write, and you can change anything.</p>
      <div className="space-y-2"><h3 className="text-lg">Cast</h3><ul className="grid gap-3 sm:grid-cols-2">{bible.cast.map((c) => <li key={c.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
        {book.urls[`cast:${c.id}`] ? <img src={book.urls[`cast:${c.id}`]} alt="" className="size-16 shrink-0 rounded-lg object-cover" /> : <span className="size-16 shrink-0 rounded-lg bg-muted" />}
        <label className="min-w-0 flex-1 space-y-1"><span className="font-display">{book.castNames[c.id] ?? "Character"}</span><BookWords label="Character notes" child={child} maxLength={300} value={c.note} onChange={text => setBible({ ...bible, cast: bible.cast.map((x) => x.id === c.id ? { ...x, note: text } : x) })} /></label>
      </li>)}{!bible.cast.length && <p className="text-sm text-muted-foreground">No characters yet.</p>}</ul></div>
      {(["places", "events", "mysteries"] as const).map((k) => <BibleList child={child} key={k} label={k === "places" ? "Places" : k === "events" ? "Important events so far" : "Open mysteries"} items={bible[k]} onChange={(items) => setBible({ ...bible, [k]: items })} />)}
      <Button disabled={busy || JSON.stringify(bible) === JSON.stringify(book.data.bible)} onClick={() => void doEdit("bible", { bible })}><Save />Save Story Bible</Button>
    </section>}

    <section className="space-y-4 border-t border-border pt-6">
      {editorStep===2 && <div className="space-y-2"><label className="block space-y-1"><span className="font-semibold">Author name</span><BookWords label="Author name" child={child} maxLength={40} value={author} onChange={setAuthor} /></label>
        <p className="text-sm text-muted-foreground">Use a made-up pen name. A grown-up says OK to it.</p>
        <div className="flex flex-wrap items-center gap-2"><Button size="sm" disabled={busy || !author.trim() || author === book.data.author} onClick={() => void doEdit("author", { text: author })}><Save />Save name</Button>
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", book.data.authorStatus === "approved" ? "bg-primary/25" : "bg-muted")}>{book.data.authorStatus === "approved" ? <><Check className="inline size-3" /> {book.data.author}</> : book.data.authorStatus === "pending" ? `“${book.data.author}” is waiting for a grown-up’s OK` : `A grown-up said not this time. Your book shows ${child.nickname}.`}</span></div></div>}
      {editorStep===3 && <><label className="block space-y-1"><span className="font-semibold">Dedication (optional)</span><BookWords label="Dedication" child={child} maxLength={300} value={dedication} onChange={setDedication} /></label>
      <Button size="sm" variant="outline" disabled={busy || dedication === book.data.dedication} onClick={() => void doEdit("dedication", { text: dedication })}><Save />Save dedication</Button></>}
      {editorStep===4 && <><label className="block space-y-1"><span className="font-semibold">Cover illustration</span><BookWords label="Cover illustration" child={child} maxLength={300} value={coverText} onChange={setCoverText} /></label>
      <Button variant="secondary" disabled={busy || coverText.trim().length < 3} onClick={() => void doEdit("cover", { text: coverText }, "Cover drawn!")}>{book.data.cover ? "Draw cover again · 3 glow" : "Draw cover · 3 glow"}</Button>
      <div className="mx-auto max-w-xs"><BookCover book={book} /></div></>}
    </section>
  </div>;
}

function CastPicker({ cast, picked, onChange, max }: { cast: { id: string; title: string; url: string }[]; picked: string[]; onChange: (ids: string[]) => void; max: number }) {
  const [page,setPage]=useState(0);
  return <div className="space-y-3"><div className="grid grid-cols-2 gap-3">{cast.slice(page*2,page*2+2).map(c=><Button key={c.id} variant={picked.includes(c.id)?"primary":"outline"} aria-pressed={picked.includes(c.id)} disabled={!picked.includes(c.id)&&picked.length>=max} className="h-auto flex-col whitespace-normal p-2" onClick={()=>onChange(picked.includes(c.id)?picked.filter(x=>x!==c.id):[...picked,c.id])}><img src={c.url} alt="" className="size-20 rounded-lg object-cover"/><span className="break-words">{c.title}</span></Button>)}</div>{cast.length>2&&<Button variant="ghost" onClick={()=>setPage((page+1)%Math.ceil(cast.length/2))}>More heroes</Button>}</div>;
}

function BookWords({child,label,value,onChange,maxLength}:{child:SidekickChild;label:string;value:string;onChange:(text:string)=>void;maxLength:number}) {
  const [typing,setTyping]=useState(false);
  const voice=useVoiceInput(text=>onChange(text.slice(0,maxLength)));
  return <div className="space-y-2">{typing ? <textarea aria-label={label} rows={3} maxLength={maxLength} value={value} onChange={e=>onChange(e.target.value)} className={field}/> : value ? <p className="whitespace-pre-wrap break-words text-lg">{value}</p> : null}<div className="flex gap-2">{voice.supported&&<Button variant="primary" size="icon" aria-label={`Say ${label.toLowerCase()}`} onClick={voice.start}><Mic/></Button>}<Button variant="outline" size="icon" aria-label={`Type ${label.toLowerCase()}`} onClick={()=>setTyping(!typing)}><Keyboard/></Button><Button variant="ghost" size="icon" aria-label={`Read ${label.toLowerCase()}`} onClick={()=>speak(value||label)}><Volume2/></Button></div></div>;
}

function BibleList({child,label,items,onChange}:{child:SidekickChild;label:string;items:string[];onChange:(items:string[])=>void}) {
 const [index,setIndex]=useState(0),[draft,setDraft]=useState("");
 const at=Math.min(index,items.length);
 return <div className="space-y-2"><h3 className="text-lg">{label}</h3><BookWords key={at} child={child} label={label} value={at<items.length ? items[at]??"" : draft} maxLength={300} onChange={text=>at<items.length?onChange(items.map((x,i)=>i===at?text:x)):setDraft(text)}/><div className="flex gap-2"><Button variant="ghost" size="icon" aria-label={`Previous ${label}`} disabled={!at} onClick={()=>setIndex(at-1)}><ArrowLeft/></Button><Button variant="ghost" size="icon" aria-label={`Next ${label}`} disabled={at===items.length} onClick={()=>setIndex(at+1)}><ArrowRight/></Button>{at<items.length ? <Button variant="ghost" size="icon" aria-label={`Remove ${label}`} onClick={()=>onChange(items.filter((_,i)=>i!==at))}><Trash2/></Button>:<Button variant="outline" size="icon" aria-label={`Add to ${label}`} disabled={!draft.trim()} onClick={()=>{onChange([...items,draft]);setDraft("");setIndex(items.length);}}><Plus/></Button>}</div></div>;
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
  const s = slides[Math.min(i, slides.length - 1)] ?? slides[0];
  useEffect(() => { if (readAloud) speak(s?.say ?? ""); return () => window.speechSynthesis?.cancel(); }, [i, readAloud, s?.say]);
  if (!s) return null;
  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-2">{onBack ? <Button variant="ghost" onClick={onBack}><ArrowLeft />Back to my book</Button> : <h2 className="break-words text-xl">{book.title}</h2>}<Button variant="ghost" size="icon" aria-label="Read aloud" onClick={() => speak(s.say)}><Volume2 /></Button></div>
    <div className="mx-auto max-w-md animate-in fade-in duration-300" key={s.key} aria-live="polite">{s.render()}</div>
    <div className="flex items-center justify-between gap-3"><Button variant="outline" aria-label="Previous page" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft /></Button><span className="text-sm">{i + 1} / {slides.length}</span><Button variant="outline" aria-label="Next page" disabled={i >= slides.length - 1} onClick={() => setI(i + 1)}><ArrowRight /></Button></div>
  </div>;
}
const Paper = ({ children }: { children: React.ReactNode }) => <div className="flex aspect-[3/4] flex-col items-center justify-center rounded-lg border border-border bg-card p-8 text-center shadow-soft">{children}</div>;

function AskToPrint({ childId, bookId, onAsked }: { childId: string; bookId: string; onAsked: () => void }) {
  const ask = useServerFn(requestPrint);
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  if (state === "sent") return <p className="mt-3 rounded-xl bg-muted p-3 font-semibold">I sent it to your grown-up! Fingers crossed!</p>;
  return <Button className="mt-3" disabled={state === "busy"} onClick={() => { setState("busy"); ask({ data: { childId, bookId } }).then(() => { setState("sent"); onAsked(); }).catch((e: unknown) => { setState("idle"); toast.error(e instanceof Error ? e.message : "Let’s try again."); }); }}><Printer />Ask to print</Button>;
}
