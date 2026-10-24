import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, MessageCircle, Pencil, RefreshCw, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bugley } from "@/components/brand/Bugley";
import { BugleyStep } from "./BugleyStep";
import { StorySetup } from "./StorySetup";
import { speak, type BugleyChat, type SidekickChild } from "./Sidekick";
import { listCast } from "@/lib/images.functions";
import { askBugley } from "@/lib/studio.functions";
import { createComic, editComic, getComic } from "@/lib/comic.functions";
import { bookFromOneShot, startChapter, getBook } from "@/lib/book.functions";
import { printMessage, printedPages } from "@/lib/book";
import { comicBeats, comicQuestion, comicCells, comicPanelAspect, type Comic, type ComicPage, type Layer, type Layout, type Panel } from "@/lib/comic";
import { getStripeEnvironment } from "@/lib/stripe";
import { useScrollTopOn } from "@/lib/scroll";
import { cn } from "@/lib/utils";

export function panelAspect(layout: Layout, i: number) { return layout === "one" ? .75 : layout === "two" || layout === "three" && i === 0 ? 1.5 : layout === "six" ? 1.125 : .75; }

export function ComicMaker({ child, chat, comicId, onComic, onDirty }: { child: SidekickChild; chat: BugleyChat; comicId: string | null; onComic: (id: string) => void; onDirty: (dirty: boolean) => void }) {
  const [comic, setComic] = useState<Comic | null>(null);
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"scene" | "speech" | "sfx" | "view" | "followup">("scene");
  const [question, setQuestion] = useState("");
  const [sparks, setSparks] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingLayers, setPendingLayers] = useState<Layer[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [titles, setTitles] = useState<string[]>([]);
  const [recap, setRecap] = useState("");
  const [bookPages, setBookPages] = useState<number | null>(null);
  const create = useServerFn(createComic), edit = useServerFn(editComic), load = useServerFn(getComic), ask = useServerFn(askBugley);
  const convert = useServerFn(bookFromOneShot), chapter = useServerFn(startChapter), loadBook = useServerFn(getBook);
  const qc = useQueryClient(); const env = getStripeEnvironment();
  const band = comic?.data.guidedBand ?? child.age_band;
  const flat = comic?.data.pages.flatMap((page) => page.panels.map((panel, i) => ({ page, panel, i }))) ?? [];
  const current = flat[at]; const panel = current?.panel; const ending = !!comic && at >= flat.length;
  useScrollTopOn(`${comic?.id}-${at}-${mode}-${busy}-${ending}`);
  useEffect(() => { onDirty(!!draft || !!pendingLayers); }, [draft, pendingLayers, onDirty]);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["album", child.id] }); void qc.invalidateQueries({ queryKey: ["glow", child.id] }); };
  useEffect(() => {
    if (!comicId) return;
    let active = true;
    void load({ data: { childId: child.id, id: comicId } }).then((next) => {
      if (!active) return; setComic(next);
      const panels = next.data.pages.flatMap((p) => p.panels);
      const index = panels.findIndex((p) => !p.image || !p.dialogueDone);
      setAt(Math.max(0, index));
    }).catch((e) => toast.error(e.message));
    return () => { active = false; };
  }, [comicId, child.id, load]);
  useEffect(() => {
    if (!comic || !current || comic.data.finished) return;
    const state = panel?.image ? panel.dialogueDone ? "view" : "speech" : "scene";
    setMode(state); setDraft(""); setPendingLayers(null);
    const q = comicQuestion(band, at, comic.data.map); setQuestion(q);
    setSparks(comicBeats(band)[at]?.sparks ?? ["A clever plan", "A big surprise", "A happy ending"]);
    chat.say(recap || (state === "speech" ? `What does ${comic.data.map.hero} say?` : `Panel ${at + 1}! ${q}`), []);
    let active = true;
    if (state === "scene") void ask({ data: { childId: child.id, comicId: comic.id, panelId: current.panel.id, pageId: current.page.id, purpose: "step", context: "Comic Maker", source: "chip", environment: env, text: "Ask one question for my next comic panel with short idea sparks. Never write my scene." } }).then((r) => {
      if (!active || r.blocked) return;
      if (r.reply && !recap) { setQuestion(r.reply); chat.say(r.reply, []); }
      if (r.chips.length === 3) setSparks(r.chips);
    }).catch(() => {});
    return () => { active = false; };
  }, [comic?.id, at]);
  useEffect(() => {
    if (!ending || !comic || comic.data.finished) return;
    chat.say("What’s your comic called?", []); let active = true;
    void ask({ data: { childId: child.id, comicId: comic.id, purpose: "titles", context: "Comic Maker", source: "chip", environment: env, text: "Offer three original titles for my saved comic. Do not write my story." } }).then((r) => { if (active) setTitles(r.chips.length === 3 ? r.chips : ["The Brave Adventure", "A Very Big Surprise", "The Secret Mission"]); }).catch(() => setTitles(["The Brave Adventure", "A Very Big Surprise", "The Secret Mission"]));
    return () => { active = false; };
  }, [ending, comic?.id]);
  useEffect(() => {
    if (!comic?.data.bookId) return;
    void loadBook({ data: { childId: child.id, id: comic.data.bookId } }).then((b) => setBookPages(printedPages(b.chapters.reduce((n, c) => n + (c.kind === "comic" ? c.comic.data.pages.length : 0), 0), !!b.data.dedication.trim()))).catch(() => {});
  }, [comic?.data.finished, comic?.data.bookId]);
  async function run(task: () => Promise<void>) {
    if (busy) return; setBusy(true);
    try { await task(); } catch (e) { const message=e instanceof Error ? e.message : "Your panel is saved. Try again.";toast.error(message);const {safetyAlternatives}=await import('./SafeRetry');chat.say(message,safetyAlternatives(message)); } finally { setBusy(false); refresh(); }
  }
  async function paint(next: Comic) {
    if (!current) return;
    const painted = await edit({ data: { childId: child.id, id: next.id, environment: env, action: "final", pageId: current.page.id, panelId: current.panel.id } });
    setComic(painted); setMode("speech"); setDraft(""); chat.say(`What does ${painted.data.map.hero} say?`, []);
  }
  async function scene(text: string) {
    if (!comic || !current) return;
    setDraft(text);
    await run(async () => {
      let next = await edit({ data: { childId: child.id, id: comic.id, environment: env, action: "panel", pageId: current.page.id, panelId: current.panel.id, description: text } });
      setComic(next); setDraft(""); setRecap("");
      if (!(next.data.followups ?? []).includes(current.panel.id)) {
        const reviewed = await edit({ data: { childId: child.id, id: next.id, environment: env, action: "review", pageId: current.page.id, panelId: current.panel.id } });
        setComic(reviewed); next = reviewed;
        if ("followup" in reviewed && typeof reviewed.followup === "string" && reviewed.followup.trim()) { setQuestion(reviewed.followup); chat.say(reviewed.followup, []); setMode("followup"); return; }
      }
      await paint(next);
    });
  }
  async function dialogue(text: string, sfx?: "POW!" | "WHOOSH!" | "ZAP!" | "SPLASH!") {
    if (!comic || !current) return;
    await run(async () => {
      const next = await edit({ data: { childId: child.id, id: comic.id, environment: env, action: "dialogue", pageId: current.page.id, panelId: current.panel.id, text: text, sfx } });
      setComic(next); setMode("view"); setDraft(""); chat.say("Your words are in the bubble!", []);
    });
  }
  async function finish(title: string) {
    if (!comic) return;
    await run(async () => {
      let next = await edit({ data: { childId: child.id, id: comic.id, environment: env, action: "title", title } }); setComic(next);
      if (!next.data.cover && !next.data.bookId) { next = await edit({ data: { childId: child.id, id: next.id, environment: env, action: "cover" } }); setComic(next); }
      next = await edit({ data: { childId: child.id, id: next.id, environment: env, action: "finish" } }); setComic(next); chat.say("You made a comic! Every panel was your idea.", []);
    });
  }
  async function nextIssue() {
    if (!comic) return;
    await run(async () => {
      const bookId = comic.data.bookId ?? (await convert({ data: { childId: child.id, creationId: comic.id, environment: env } })).id;
      const result = await chapter({ data: { childId: child.id, bookId, title: "A new issue", newCharacterIds: [], environment: env } });
      const next = await load({ data: { childId: child.id, id: result.chapterId } });
      const mapped = await edit({ data: { childId: child.id, id: next.id, environment: env, action: "map", map: { ...comic.data.map, problem: "A new adventure begins", ending: "The child decides" } } });
      setRecap(result.recap); setComic(mapped); setAt(0); setTitles([]); onComic(mapped.id);
    });
  }
  if (comicId && !comic) return <BugleyStep child={child} bare question="Opening your comic…" choices={[]} allowOwnIdea={false} mood="painting" onChoose={() => {}} />;
  if (!comic) return <StorySetup kind="comic" child={child} chat={chat} onCreate={async (r) => {
    const made = await create({ data: { childId: child.id, title: r.title, genre: r.genre, styleKey: r.styleKey, characterIds: r.characterIds, guided: true, environment: env } });
    const next = await edit({ data: { childId: child.id, id: made.id, environment: env, action: "map", map: r.map } }); setComic(next); setAt(0); onComic(next.id); refresh();
  }} />;
  if (busy) return <BugleyStep child={child} bare question="Painting your comic…" choices={[]} allowOwnIdea={false} mood="painting" onChoose={() => {}} />;
  const count = bookPages ?? printedPages(comic.data.pages.length, false);
  if (comic.data.finished) return <div className="space-y-6"><ComicReader comic={comic} child={child} /><p className="text-center font-display text-xl">{printMessage("comic", count)}</p><Button size="lg" onClick={() => void nextIssue()}><BookOpen />{comic.data.bookId ? "Make the next issue?" : "Want to make Issue 2?"}</Button></div>;
  if (ending) return <BugleyStep child={child} bare question="What’s your comic called?" choices={titles.map((t, i) => ({ key: `${i}`, label: t, emoji: "📕" }))} onBack={() => setAt(flat.length - 1)} onChoose={(c) => void finish(c.label)} onOwnIdea={(t) => void finish(t)} />;
  if (!current || !panel) return null;
  const preview = panel.image ? <div className="mx-auto w-full max-w-xl"><PanelCanvas panel={{ ...panel, layers: pendingLayers ?? panel.layers }} url={comic.urls[panel.image]} aspect={comicPanelAspect(current.page, current.i)} editable={mode === "view"} selected={selected} onSelect={setSelected} onLayers={setPendingLayers} /></div> : null;
  if (mode === "speech" || mode === "sfx") return <div className="space-y-5">{preview}<BugleyStep child={child} bare question={mode === "speech" ? `What does ${comic.data.map.hero} say?` : "Boom! Pick a sound!"} choices={mode === "speech" ? [{ key: "sfx", label: "Boom!", emoji: "💥" }] : ["POW!", "WHOOSH!", "ZAP!", "SPLASH!"].map((s) => ({ key: s, label: s, emoji: "💥" }))} longAnswer maxAnswer={200} initialAnswer={draft} onChoose={(c) => { if (mode === "speech") { setMode("sfx"); chat.say("Boom! Pick a sound!", []); } else void dialogue(panel.layers.find((l) => l.type === "speech")?.text ?? draft, c.key as "POW!" | "WHOOSH!" | "ZAP!" | "SPLASH!"); }} onOwnIdea={mode === "speech" ? (t) => void dialogue(t) : undefined} allowOwnIdea={mode === "speech"} /><Button size="lg" variant="secondary" className="w-full" onClick={() => void dialogue("", panel.layers.find((l) => l.type === "sfx")?.text as "POW!" | "WHOOSH!" | "ZAP!" | "SPLASH!" | undefined)}>Skip</Button></div>;
  if (mode === "view") return <div className="space-y-5"><p className="text-center text-sm text-muted-foreground">Panel {at + 1} / {flat.length} · Saved</p>{preview}<div className="flex flex-wrap justify-center gap-2"><Button variant="ghost" size="sm" onClick={() => { setDraft(panel.layers.find((l) => l.type === "speech")?.text ?? ""); setMode("speech"); chat.say(`What does ${comic.data.map.hero} say?`, []); }}><MessageCircle />Change words</Button><Button variant="ghost" size="sm" onClick={() => { setMode("sfx"); chat.say("Boom! Pick a sound!", []); }}>💥 Boom!</Button><Button variant="ghost" size="sm" onClick={() => void run(() => paint(comic))}><RefreshCw />New picture · 3 glow</Button></div>{pendingLayers && <Button onClick={() => void run(async () => { const next = await edit({ data: { childId: child.id, id: comic.id, environment: env, action: "layers", pageId: current.page.id, panelId: panel.id, layers: pendingLayers } }); setComic(next); setPendingLayers(null); })}>Save bubble position</Button>}<div className="flex justify-between gap-2"><Button variant="ghost" disabled={!at || !!pendingLayers} onClick={() => setAt(at - 1)}><ArrowLeft />Back</Button><Button disabled={!!pendingLayers} onClick={() => setAt(at + 1)}>{at === flat.length - 1 ? "The end!" : "Next panel"}<ArrowRight /></Button></div></div>;
  return <div className="space-y-4"><BugleyStep child={child} bare hideHeading question={question} choices={mode === "followup" ? [] : sparks.map((s, i) => ({ key: `${i}`, label: s, emoji: "💡" }))} longAnswer maxAnswer={600} initialAnswer={draft} step={at} steps={flat.length} onBack={at ? () => setAt(at - 1) : undefined} onChoose={(c) => { const q = `${c.label}! What happens, in your words?`; setQuestion(q); chat.say(q, []); }} onOwnIdea={(t) => void scene(t)} />{panel.description && <><p className="whitespace-pre-wrap break-words">{panel.description}</p><Button variant="secondary" onClick={() => void run(() => paint(comic))}>{mode === "followup" ? "Keep my idea" : "Paint my saved panel · 3 glow"}</Button></>}</div>;
}

export function PageGrid({ page, urls, selected, onSelect }: { page: ComicPage; urls: Record<string, string>; selected?: number; onSelect?: (i: number) => void }) {
  const cells = comicCells(page);
  return <div className="relative aspect-[3/4] w-full rounded-lg border-2 border-foreground bg-foreground">
    {page.panels.map((p, i) => {
      const c = cells[i]; if (!c) return null;
      const inner = <PanelCanvas panel={p} url={urls[p.image ?? p.sketch ?? ""]} />;
      return <div key={p.id} className="absolute overflow-hidden border-[3px] border-foreground bg-card" style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, width: `${c.w * 100}%`, height: `${c.h * 100}%` }}>
        {onSelect ? <Button variant="ghost" onClick={() => onSelect(i)} aria-label={`Panel ${i + 1}`} aria-pressed={selected === i} className="block size-full p-0">{inner}</Button> : inner}
      </div>;
    })}
  </div>;
}

type DragKind = "move" | "resize" | "tail";
function PanelCanvas({ panel, url, aspect, editable, selected, onSelect, onLayers }: { panel: Panel; url?: string | undefined; aspect?: number; editable?: boolean; selected?: string | null; onSelect?: (id: string) => void; onLayers?: (l: Layer[]) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  function start(e: RPointerEvent, layer: Layer, kind: DragKind) {
    if (!editable || !ref.current || !onLayers) return;
    e.preventDefault(); e.stopPropagation(); onSelect?.(layer.id);
    const rect = ref.current.getBoundingClientRect(), sx = e.clientX, sy = e.clientY;
    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / rect.width) * 100, dy = ((ev.clientY - sy) / rect.height) * 100;
      const next = kind === "move" ? { x: clamp(layer.x + dx, 0, 100 - layer.w), y: clamp(layer.y + dy, 0, 100 - layer.h) }
        : kind === "resize" ? { w: clamp(layer.w + dx, 8, 100 - layer.x), h: clamp(layer.h + dy, 6, 100 - layer.y) }
        : { tx: clamp(layer.tx + dx, 0, 100), ty: clamp(layer.ty + dy, 0, 100) };
      onLayers(panel.layers.map((l) => l.id === layer.id ? { ...l, ...next } : l));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }
  return <div ref={ref} className={cn("relative overflow-hidden bg-muted [container-type:size]", aspect ? "w-full" : "size-full", editable && "rounded-lg border-2 border-foreground")} style={aspect ? { aspectRatio: String(aspect) } : undefined}>
    {url ? <img src={url} alt={panel.description || "Comic panel"} className="absolute inset-0 size-full object-cover" draggable={false} /> : <p className="absolute inset-0 flex items-center justify-center p-2 text-center text-[6cqmin] text-muted-foreground">{panel.description || "Empty panel"}</p>}
    <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {panel.layers.map((l) => {
        const cx = l.x + l.w / 2, cy = l.y + l.h / 2, b = Math.min(l.w, l.h) / 5;
        if (l.type === "speech") return <polygon key={l.id} points={`${cx - b},${cy} ${cx + b},${cy} ${l.tx},${l.ty}`} className="fill-card stroke-foreground" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />;
        if (l.type === "thought") return <g key={l.id}>{[0.62, 0.8, 0.94].map((t, i) => <ellipse key={t} cx={cx + (l.tx - cx) * t} cy={cy + (l.ty - cy) * t} rx={2.4 - i * 0.6} ry={2.4 - i * 0.6} className="fill-card stroke-foreground" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />)}</g>;
        return null;
      })}
    </svg>
    {panel.layers.map((l) => <div key={l.id} onPointerDown={(e) => start(e, l, "move")}
      className={cn("absolute flex items-center justify-center overflow-hidden text-center leading-tight text-foreground", editable && "cursor-move touch-none",
        l.type === "speech" && "rounded-[50%] border-2 border-foreground bg-card px-[6%] font-comic",
        l.type === "thought" && "rounded-[45%] border-2 border-dashed border-foreground bg-card px-[6%] font-comic",
        l.type === "caption" && "rounded-sm border-2 border-foreground bg-secondary px-[3%] font-comic text-secondary-foreground",
        l.type === "sfx" && "font-sfx text-primary [paint-order:stroke_fill] [-webkit-text-stroke:0.6cqmin_var(--foreground)]",
        selected === l.id && "outline-dashed outline-2 outline-primary")}
      style={{ left: `${l.x}%`, top: `${l.y}%`, width: `${l.w}%`, height: `${l.h}%`, fontSize: `${Math.min(l.h * 0.55, l.w / Math.max(3, l.text.length) * (l.type === "sfx" ? 1.6 : 3))}cqh` }}>
      <span className="break-words">{l.text || (editable ? "…" : "")}</span>
      {editable && selected === l.id && <span onPointerDown={(e) => start(e, l, "resize")} aria-label="Resize" className="absolute bottom-0 right-0 size-4 cursor-se-resize rounded-tl bg-primary" />}
    </div>)}
    {editable && panel.layers.filter((l) => l.id === selected && (l.type === "speech" || l.type === "thought")).map((l) => <span key={l.id} onPointerDown={(e) => start(e, l, "tail")} aria-label="Point the tail"
      className="absolute size-5 -translate-x-1/2 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-foreground bg-primary" style={{ left: `${l.tx}%`, top: `${l.ty}%` }} />)}
  </div>;
}

function ComicCover({ comic, cast }: { comic: Comic; cast: { id: string; title: string }[] }) {
  const names = cast.filter((c) => comic.data.characterIds.includes(c.id)).map((c) => c.title);
  return <div className="relative aspect-[3/4] overflow-hidden rounded-lg border-4 border-foreground bg-muted">
    {comic.data.cover && <img src={comic.urls[comic.data.cover]} alt="Comic cover" className="absolute inset-0 size-full object-cover" />}
    <div className="absolute inset-x-0 top-0 bg-primary/90 p-3 text-center"><p className="break-words font-sfx text-3xl text-primary-foreground">{comic.title}</p></div>
    <div className="absolute inset-x-0 bottom-0 bg-background/85 p-2 text-center text-xs font-semibold">{names.length ? `Starring ${names.join(", ")}` : comic.data.genre} · {comic.data.styleKey.replaceAll("_", " ")}</div>
  </div>;
}

export function ComicReader({ comic, child, onBack }: { comic: Comic; child: SidekickChild; onBack?: (() => void) | undefined }) {
  const [page, setPage] = useState(-1);
  const { data: cast = [] } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
  const current = comic.data.pages[page];
  const words = page < 0 ? comic.title : (current?.panels.flatMap((p) => p.layers.map((l) => l.text)).filter(Boolean).join(". ") ?? "");
  useEffect(() => { if (child.age_band === "sprouts") speak(words); return () => window.speechSynthesis?.cancel(); }, [page, child.age_band, words]);
  return <div className="space-y-5">
    {comic.data.finished && page < 0 && <div className="flex items-center justify-center gap-3"><Bugley stage={child.bugley_stage} expression="celebrating" glow size={80} /><h1 className="text-2xl">You made a comic!</h1></div>}
    <div className="flex items-center justify-between gap-2">{onBack ? <Button variant="ghost" onClick={onBack}><ArrowLeft />Keep making</Button> : <h2 className="break-words text-xl">{comic.title}</h2>}<Button variant="ghost" size="icon" aria-label="Read aloud" onClick={() => speak(words)}><Volume2 /></Button></div>
    <div className="mx-auto max-w-md animate-in fade-in duration-300" key={page}>{page < 0 ? <ComicCover comic={comic} cast={cast} /> : current && <PageGrid page={current} urls={comic.urls} />}</div>
    <div className="flex items-center justify-between gap-3"><Button variant="outline" aria-label="Previous page" disabled={page < 0} onClick={() => setPage(page - 1)}><ArrowLeft /></Button><span className="text-sm">{page < 0 ? "Cover" : `${page + 1} / ${comic.data.pages.length}`}</span><Button variant="outline" aria-label="Next page" disabled={page >= comic.data.pages.length - 1} onClick={() => setPage(page + 1)}><ArrowRight /></Button></div>
    <p className="text-center text-sm text-muted-foreground">{comic.data.pages.length} {comic.data.pages.length === 1 ? "page" : "pages"} toward a printed comic book.</p>
  </div>;
}
