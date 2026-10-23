import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Camera, Check, Cloud, MessageCircle, Mic, MoreHorizontal, Plus, Save, Sparkles, Square, Trash2, Volume2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bugley } from "@/components/brand/Bugley";
import { MakerSetup } from "./MakerSetup";
import { StepNav, field } from "./Guided";
import { speak, useVoiceInput, type BugleyChat, type SidekickChild } from "./Sidekick";
import { listCast } from "@/lib/images.functions";
import { askBugley } from "@/lib/studio.functions";
import { createComic, editComic, getComic } from "@/lib/comic.functions";
import { ANGLES, ANGLE_LABEL, EMPTY_MAP, LAYOUTS, LAYOUT_LABEL, newLayer, readyToFinishComic, setLayout, trimmedPanelsHaveWork, type Comic, type ComicPage, type Layer, type Layout, type Panel } from "@/lib/comic";
import { getStripeEnvironment } from "@/lib/stripe";
import { useScrollTopOn } from "@/lib/scroll";
import { cn } from "@/lib/utils";

const MAP_LABELS = { hero: "Who is the hero?", want: "What do they want most?", place: "Where does it happen?", problem: "What’s the problem?", ending: "What’s the payoff or punchline?" };
const GRID: Record<Layout, string> = { one: "grid-cols-1 grid-rows-1", two: "grid-cols-1 grid-rows-2", three: "grid-cols-2 grid-rows-2", four: "grid-cols-2 grid-rows-2", six: "grid-cols-2 grid-rows-3" };
/** Panel width/height on a 3:4 page, so the big editor matches the page cell exactly. */
export function panelAspect(layout: Layout, i: number) {
  if (layout === "one") return 3 / 4;
  if (layout === "two" || (layout === "three" && i === 0)) return 3 / 2;
  if (layout === "six") return 9 / 8;
  return 3 / 4;
}
const LAYER_BUTTONS: { type: Layer["type"]; label: string; icon: typeof MessageCircle }[] = [
  { type: "speech", label: "Speech", icon: MessageCircle }, { type: "thought", label: "Thought", icon: Cloud },
  { type: "caption", label: "Caption", icon: Square }, { type: "sfx", label: "Sound effect", icon: Zap },
];

export function ComicMaker({ child, chat, comicId, onComic, onDirty }: { child: SidekickChild; chat: BugleyChat; comicId: string | null; onComic: (id: string) => void; onDirty: (d: boolean) => void }) {
  const [comic, setComic] = useState<Comic | null>(null);
  const [index, setIndex] = useState(0);
  const [panelIndex, setPanelIndex] = useState(0);
  const [layerId, setLayerId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [reading, setReading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [coverDescription, setCoverDescription] = useState("");
  const [mapDraft, setMapDraft] = useState({ ...EMPTY_MAP });
  const [, setMapEditing] = useState(true);
  useScrollTopOn(`${index}-${finishing}-${reading}`);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  const create = useServerFn(createComic), edit = useServerFn(editComic), load = useServerFn(getComic), ask = useServerFn(askBugley);
  const qc = useQueryClient();
  const { data: cast = [] } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
  const sprouts = child.age_band === "sprouts";
  const page = comic?.data.pages[index];
  const panel = page?.panels[panelIndex];
  const layer = panel?.layers.find((l) => l.id === layerId);
  const env = getStripeEnvironment();
  const voice = useVoiceInput((t) => changePanel({ description: `${panel?.description ?? ""} ${t}`.trim() }));

  function adopt(next: Comic) { setComic(next); setMapDraft(next.data.map); setDirty(false); }
  function changePage(next: ComicPage) {
    if (!comic || busy) return;
    setComic({ ...comic, data: { ...comic.data, pages: comic.data.pages.map((p, i) => i === index ? next : p) } }); setDirty(true);
  }
  function changePanel(patch: Partial<Panel>) {
    if (!page || !panel) return;
    changePage({ ...page, panels: page.panels.map((p) => p.id === panel.id ? { ...p, ...patch } : p) });
  }
  const changeLayers = (layers: Layer[]) => changePanel({ layers });
  useEffect(() => {
    if (!comicId) return;
    let active = true; setBusy(true);
    void load({ data: { childId: child.id, id: comicId } }).then((next) => {
      if (!active) return;
      adopt(next); setReading(next.data.finished); setMapEditing(Object.values(next.data.map).some((v) => !v.trim()));
    }).catch((e) => toast.error(e.message)).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [comicId, child.id, load]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["album", child.id] }); void qc.invalidateQueries({ queryKey: ["glow", child.id] }); };

  async function action(kind: "map" | "page" | "add" | "remove" | "move" | "sketch" | "final" | "cover" | "finish", to?: number): Promise<boolean> {
    if (!comic || busy) return false;
    setBusy(true);
    try {
      let current = comic;
      const strip = (p: ComicPage) => ({ ...p, panels: p.panels.map(({ sketch: _s, image: _i, ...rest }) => rest) });
      if (dirty && kind !== "map" && page) current = await edit({ data: { childId: child.id, id: comic.id, environment: env, action: "page", page: strip(page) } });
      const next = kind === "page" ? current : await edit({ data: { childId: child.id, id: current.id, environment: env, action: kind, map: kind === "map" ? mapDraft : undefined, pageId: page?.id, panelId: panel?.id, to, description: coverDescription } });
      adopt(next);
      if (kind === "map") { setMapEditing(false); chat.say("Story Map saved! Your call what happens next."); }
      if (kind === "add") { setIndex(next.data.pages.length - 1); setPanelIndex(0); chat.say("New page! How many panels should it have?"); }
      if (kind === "remove") { setIndex(Math.max(0, index - 1)); setPanelIndex(0); }
      if (kind === "move" && to !== undefined) setIndex(to);
      if (kind === "sketch") chat.say("Here’s the sketch! Like it? Make it final, or change your words and sketch again.");
      if (kind === "final") chat.say("Looking great! Want to add a speech bubble or a sound effect?");
      if (kind === "finish") { setReading(true); chat.say("You made a whole comic! Every panel was your choice."); toast.success("Your comic is in your album!"); }
      if (kind === "page" && page && page.panels.some((p) => p.layers.filter((l) => l.type === "speech").length > 1)) chat.say("Can readers tell who’s talking here? Point each bubble’s tail at the speaker. Your call!");
      return true;
    } catch (e) { toast.error(e instanceof Error ? e.message : "Your work is still here. Try saving again."); return false; }
    finally { setBusy(false); refresh(); }
  }
  async function goTo(p: number, q: number) {
    if (p !== index && dirty && !(await action("page"))) return;
    setIndex(p); selectPanel(q, p);
  }
  async function coach(text: string) {
    if (!comic || busy) return;
    setBusy(true);
    try {
      if (dirty && page) adopt(await edit({ data: { childId: child.id, id: comic.id, environment: env, action: "page", page: { ...page, panels: page.panels.map(({ sketch: _s, image: _i, ...r }) => r) } } }));
      const r = await ask({ data: { childId: child.id, comicId: comic.id, pageId: page?.id, context: "Comic Maker", source: "chip", environment: env, text } });
      chat.say(r.reply, r.chips);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Bugley couldn’t check that right now."); }
    finally { setBusy(false); }
  }
  function pickLayout(l: Layout) {
    if (!page || l === page.layout) return;
    if (trimmedPanelsHaveWork(page, l) && !window.confirm("Some panels at the end will be removed. Keep going?")) return;
    changePage(setLayout(page, l)); setPanelIndex(0); setLayerId(null);
    if (l === "one") chat.say("A full-page panel! Perfect for a big moment. Your call!");
  }
  function selectPanel(i: number, p = index) {
    setPanelIndex(i); setLayerId(null);
    const pg = comic?.data.pages[p];
    if (comic && pg && p === comic.data.pages.length - 1 && i === pg.panels.length - 1 && pg.panels.length > 1) chat.say("Last panel! What’s the payoff or punchline? Your call!");
    else if (p === 0 && i === 0) chat.say("Your opening panel! What do readers need to see first? Your call!");
    else chat.say(`Panel ${i + 1}! What happens here? Close up on a face, or far away so we see everything?`);
  }

  if (comicId && !comic) return <div className="flex min-h-64 flex-col items-center justify-center gap-4"><Bugley expression="thinking" stage={child.bugley_stage} size={100} /><p>Opening your comic…</p></div>;
  if (!comic) return <MakerSetup child={child} chat={chat} kind="comic" mapLabels={MAP_LABELS} defaultStyle="classic_comic" onCreate={async (r) => {
    try {
      const made = await create({ data: { childId: child.id, title: r.title, genre: r.genre, styleKey: r.styleKey, characterIds: r.characterIds, environment: env } });
      const next = await edit({ data: { childId: child.id, id: made.id, environment: env, action: "map", map: r.map } });
      adopt(next); onComic(next.id); setIndex(0); setPanelIndex(0);
      chat.say("Your first page! How many panels should it have? Then tell me what happens in panel 1.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "We couldn’t start your comic."); } finally { refresh(); }
  }} />;
  if (reading) return <ComicReader comic={comic} child={child} onBack={!comic.data.finished ? () => setReading(false) : undefined} />;

  const mapForm = <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2">{Object.entries(MAP_LABELS).map(([k, label]) => <label key={k} className="space-y-1 text-sm font-semibold"><span>{label}</span><textarea rows={2} maxLength={600} disabled={busy} className={field} value={mapDraft[k as keyof typeof mapDraft]} onChange={(e) => { setMapDraft({ ...mapDraft, [k]: e.target.value }); setDirty(true); }} /></label>)}</div>
    <Button disabled={busy || Object.values(mapDraft).some((v) => !v.trim())} onClick={() => void action("map")}><Save />Save Story Map</Button></div>;
  if (Object.values(comic.data.map).some((v) => !v.trim())) return <div className="space-y-5"><h1 className="text-center text-3xl">Finish your Story Map</h1>{mapForm}</div>;

  if (finishing) return <div className="space-y-5" aria-busy={busy}>
    <h1 className="text-center text-3xl sm:text-4xl">{comic.data.bookId ? "Finish this chapter" : "Make your cover"}</h1>
    {!comic.data.bookId && <>
      {comic.data.cover && <div className="mx-auto max-w-xs"><ComicCover comic={comic} cast={cast} /></div>}
      <textarea rows={2} maxLength={600} className={field} disabled={busy} value={coverDescription} onChange={(e) => setCoverDescription(e.target.value)} placeholder="What’s on the cover?" aria-label="Describe the cover picture" />
      <Button variant="secondary" size="lg" disabled={busy || coverDescription.trim().length < 3} onClick={() => void action("cover")}>{busy ? "Drawing…" : comic.data.cover ? "Draw cover again · 3 glow" : "Draw cover · 3 glow"}</Button>
    </>}
    {!readyToFinishComic(comic.data) && <p className="rounded-2xl bg-muted p-4 font-medium">Almost there! Every panel needs a final picture{comic.data.bookId ? "." : ", and your comic needs a cover."}</p>}
    <p className="text-center text-sm text-muted-foreground">{comic.data.pages.length} {comic.data.pages.length === 1 ? "page" : "pages"} toward a printed book</p>
    <StepNav onBack={() => setFinishing(false)} busy={busy} canNext={readyToFinishComic(comic.data) && !dirty} nextLabel={<><Check />Finish my comic</>} onNext={() => void action("finish")} />
  </div>;

  if (!page || !panel) return null;
  const emptyPage = page.panels.every((p) => !p.description.trim() && !p.sketch && !p.layers.length);
  const lastPanel = index === comic.data.pages.length - 1 && panelIndex === page.panels.length - 1;
  const layoutPicker = <div className="flex flex-wrap gap-2" role="group" aria-label="Page layout">{(Object.keys(LAYOUTS) as Layout[]).map((l) => <Button key={l} size="sm" variant={page.layout === l ? "primary" : "outline"} aria-pressed={page.layout === l} disabled={busy} onClick={() => pickLayout(l)}><LayoutIcon layout={l} />{LAYOUT_LABEL[l]}</Button>)}</div>;

  return <div className="space-y-5" aria-busy={busy}>
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0"><h1 className="truncate text-2xl sm:text-3xl">{comic.title}</h1><p className="text-sm text-muted-foreground" role="status">Page {index + 1} of {comic.data.pages.length} · Panel {panelIndex + 1} of {page.panels.length} · {busy ? "Working…" : dirty ? "Not saved yet" : "Saved"}</p></div>
      <div className="flex shrink-0 gap-1"><Button variant="ghost" size="sm" disabled={busy} onClick={async () => { if (dirty && !(await action("page"))) return; setReading(true); }}><BookOpen />Read</Button>
        <Button variant="ghost" size="sm" onClick={() => setShowMore(!showMore)} aria-expanded={showMore}><MoreHorizontal />More</Button></div>
    </div>
    {showMore && <section className="space-y-4 rounded-3xl bg-card p-4 shadow-soft animate-in fade-in">
      {!emptyPage && <div><p className="mb-2 text-sm font-semibold">Panels on this page</p>{layoutPicker}</div>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={!index || busy} onClick={() => void action("move", index - 1)}><ArrowUp />Move page earlier</Button>
        <Button variant="outline" size="sm" disabled={index >= comic.data.pages.length - 1 || busy} onClick={() => void action("move", index + 1)}><ArrowDown />Move page later</Button>
        <Button variant="outline" size="sm" disabled={comic.data.pages.length === 1 || busy} onClick={() => { if (window.confirm("Remove this page?")) void action("remove"); }}><Trash2 />Remove page</Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => void coach("Look at my comic's beats and pacing. What's one question you'd ask me?")}><Sparkles />How’s my pacing?</Button>
      </div>
      <details><summary className="cursor-pointer font-semibold">My Story Map</summary><div className="mt-3">{mapForm}</div></details>
    </section>}

    {emptyPage && <section className="space-y-2 rounded-3xl bg-card p-4 shadow-soft"><p className="font-display text-lg">How many panels on this page?</p>{layoutPicker}</section>}

    <div className="grid gap-5 sm:grid-cols-[9rem_1fr]">
      <div className="mx-auto w-32 sm:w-36"><PageGrid page={page} urls={comic.urls} selected={panelIndex} onSelect={(i) => selectPanel(i)} /></div>
      <section className="space-y-4">
        <div className="relative"><textarea rows={3} maxLength={600} disabled={busy} aria-label={`What happens in panel ${panelIndex + 1}?`} className={cn(field, "bg-card pr-16 shadow-soft", sprouts && "text-xl")} value={panel.description} placeholder="Zara flies over the city, looking worried" onChange={(e) => changePanel({ description: e.target.value })} />
          {voice.supported && <button type="button" onClick={voice.start} aria-label="Say it" className={cn("absolute bottom-3 right-3 flex size-12 items-center justify-center rounded-full bg-secondary", voice.listening && "animate-pulse bg-primary")}><Mic className="size-6" /></button>}</div>
        <div className="space-y-2"><span className="flex items-center gap-2 text-sm font-semibold"><Camera className="size-4" />Where’s the camera?</span><div className="flex flex-wrap gap-2">{ANGLES.map((a) => <Button key={a || "auto"} size="sm" variant={panel.angle === a ? "primary" : "outline"} aria-pressed={panel.angle === a} disabled={busy} onClick={() => changePanel({ angle: a })}>{ANGLE_LABEL[a]}</Button>)}</div></div>
        <div className="flex flex-wrap gap-2">
          <Button variant={panel.sketch ? "outline" : "primary"} disabled={busy || panel.description.trim().length < 3} onClick={() => void action("sketch")}>✏️ {panel.sketch ? "Sketch again" : "Sketch it"} · 1 glow</Button>
          {panel.sketch && <Button variant="primary" disabled={busy} onClick={() => void action("final")}>✨ {panel.image ? "Final again" : "Make it final"} · 3 glow</Button>}
        </div>
      </section>
    </div>

    {(panel.sketch || panel.image) && <section className="space-y-3">
      <div className="mx-auto w-full max-w-lg">
        <PanelCanvas panel={panel} url={comic.urls[panel.image ?? panel.sketch ?? ""]} aspect={panelAspect(page.layout, panelIndex)} editable selected={layerId} onSelect={setLayerId} onLayers={changeLayers} />
        {!panel.image && <p className="mt-1 text-center text-xs text-muted-foreground">Sketch</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">{LAYER_BUTTONS.map(({ type, label, icon: Icon }) => <Button key={type} size="sm" variant="outline" disabled={busy || panel.layers.length >= 12} onClick={() => { const l = newLayer(type); changeLayers([...panel.layers, l]); setLayerId(l.id); }}><Icon />{label}</Button>)}</div>
      {layer && <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 space-y-1"><span className="text-sm font-semibold">{LAYER_BUTTONS.find((b) => b.type === layer.type)?.label} words</span><input autoFocus className={cn(field, layer.type === "sfx" ? "font-sfx text-xl" : "font-comic")} maxLength={200} value={layer.text} placeholder={layer.type === "sfx" ? "POW!" : "Your words"} onChange={(e) => changeLayers(panel.layers.map((l) => l.id === layer.id ? { ...l, text: e.target.value } : l))} /></label>
        <Button variant="ghost" aria-label="Remove words" onClick={() => { changeLayers(panel.layers.filter((l) => l.id !== layer.id)); setLayerId(null); }}><Trash2 />Remove</Button>
      </div>}
      {panel.layers.length > 0 && <p className="text-center text-xs text-muted-foreground">Drag words to move them. Drag the corner to resize. Drag the dot to point the tail.</p>}
    </section>}

    <div className="flex items-center justify-between gap-2 pt-2">
      <Button variant="ghost" size="lg" disabled={busy || (index === 0 && panelIndex === 0)} onClick={() => void (panelIndex > 0 ? goTo(index, panelIndex - 1) : goTo(index - 1, (comic.data.pages[index - 1]?.panels.length ?? 1) - 1))}><ArrowLeft />Back</Button>
      <div className="flex gap-2">
        <Button variant="outline" size="lg" disabled={busy} onClick={async () => { if (dirty && !(await action("page"))) return; setFinishing(true); }}><Check />I’m done</Button>
        {lastPanel ? <Button variant="primary" size="lg" disabled={busy} onClick={() => void action("add")}><Plus />New page</Button>
          : <Button variant="primary" size="lg" disabled={busy} onClick={() => void (panelIndex < page.panels.length - 1 ? goTo(index, panelIndex + 1) : goTo(index + 1, 0))}>Next panel<ArrowRight /></Button>}
      </div>
    </div>
  </div>;
}

function LayoutIcon({ layout }: { layout: Layout }) {
  return <span className={cn("grid size-4 gap-px", GRID[layout])} aria-hidden>{Array.from({ length: LAYOUTS[layout] }, (_, i) => <span key={i} className={cn("rounded-[1px] bg-current opacity-70", layout === "three" && i === 0 && "col-span-2")} />)}</span>;
}

export function PageGrid({ page, urls, selected, onSelect }: { page: ComicPage; urls: Record<string, string>; selected?: number; onSelect?: (i: number) => void }) {
  return <div className={cn("grid aspect-[3/4] w-full gap-1.5 rounded-lg border-2 border-foreground bg-foreground p-1.5", GRID[page.layout])}>
    {page.panels.map((p, i) => {
      const inner = <PanelCanvas panel={p} url={urls[p.image ?? p.sketch ?? ""]} />;
      return <div key={p.id} className={cn("min-h-0 overflow-hidden bg-card", page.layout === "three" && i === 0 && "col-span-2")}>
        {onSelect ? <button type="button" onClick={() => onSelect(i)} aria-label={`Panel ${i + 1}`} aria-pressed={selected === i} className={cn("block size-full outline-none", selected === i && "ring-4 ring-inset ring-primary")}>{inner}</button> : inner}
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
  return <div ref={ref} className={cn("relative overflow-hidden bg-muted [container-type:size]", aspect ? "w-full" : "size-full", editable && "touch-none rounded-lg border-2 border-foreground")} style={aspect ? { aspectRatio: String(aspect) } : undefined}>
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
      className={cn("absolute flex items-center justify-center overflow-hidden text-center leading-tight text-foreground", editable && "cursor-move",
        l.type === "speech" && "rounded-[50%] border-2 border-foreground bg-card px-[6%] font-comic",
        l.type === "thought" && "rounded-[45%] border-2 border-dashed border-foreground bg-card px-[6%] font-comic",
        l.type === "caption" && "rounded-sm border-2 border-foreground bg-secondary px-[3%] font-comic text-secondary-foreground",
        l.type === "sfx" && "font-sfx text-primary [paint-order:stroke_fill] [-webkit-text-stroke:0.6cqmin_var(--foreground)]",
        selected === l.id && "outline-dashed outline-2 outline-primary")}
      style={{ left: `${l.x}%`, top: `${l.y}%`, width: `${l.w}%`, height: `${l.h}%`, fontSize: l.type === "sfx" ? `${Math.min(l.h * 0.7, l.w / Math.max(2, l.text.length) * 1.6)}cqh` : "5.5cqmin" }}>
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
    <p className="text-center text-sm text-muted-foreground">{comic.data.pages.length} {comic.data.pages.length === 1 ? "page" : "pages"} toward a printed book · Printing comes later.</p>
  </div>;
}
