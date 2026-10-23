import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Camera, Check, Cloud, MessageCircle, Mic, Plus, Save, Sparkles, Square, Trash2, Volume2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bugley } from "@/components/brand/Bugley";
import { CharacterCreator, StylePicker } from "./Makers";
import { speak, useVoiceInput, type BugleyChat, type SidekickChild } from "./Sidekick";
import { listCast } from "@/lib/images.functions";
import { askBugley } from "@/lib/studio.functions";
import { createComic, editComic, getComic } from "@/lib/comic.functions";
import { GENRES } from "@/lib/story";
import { ANGLES, ANGLE_LABEL, EMPTY_MAP, LAYOUTS, LAYOUT_LABEL, newLayer, readyToFinishComic, setLayout, trimmedPanelsHaveWork, type Comic, type ComicData, type ComicPage, type Layer, type Layout, type Panel } from "@/lib/comic";
import { getStripeEnvironment } from "@/lib/stripe";
import { cn } from "@/lib/utils";

const MAP_LABELS = { hero: "Who is the hero?", want: "What do they want most?", place: "Where does it happen?", problem: "What’s the problem?", ending: "What’s the payoff or punchline?" };
const field = "w-full rounded-lg border-2 border-border bg-background p-3 text-foreground outline-none focus:border-primary";
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
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<ComicData["genre"]>("Superhero");
  const [style, setStyle] = useState("classic_comic");
  const [picked, setPicked] = useState<string[]>([]);
  const [makingCharacter, setMakingCharacter] = useState(false);
  const [index, setIndex] = useState(0);
  const [panelIndex, setPanelIndex] = useState(0);
  const [layerId, setLayerId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [reading, setReading] = useState(false);
  const [coverDescription, setCoverDescription] = useState("");
  const [mapDraft, setMapDraft] = useState({ ...EMPTY_MAP });
  const [mapEditing, setMapEditing] = useState(true);
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

  async function action(kind: "map" | "page" | "add" | "remove" | "move" | "sketch" | "final" | "cover" | "finish", to?: number) {
    if (!comic || busy) return;
    setBusy(true);
    try {
      let current = comic;
      const strip = (p: ComicPage) => ({ ...p, panels: p.panels.map(({ sketch: _s, image: _i, ...rest }) => rest) });
      if (dirty && kind !== "map" && page) current = await edit({ data: { childId: child.id, id: comic.id, environment: env, action: "page", page: strip(page) } });
      const next = kind === "page" ? current : await edit({ data: { childId: child.id, id: current.id, environment: env, action: kind, map: kind === "map" ? mapDraft : undefined, pageId: page?.id, panelId: panel?.id, to, description: coverDescription } });
      adopt(next);
      if (kind === "map") { setMapEditing(false); chat.say("Great map! Start strong: what’s the very first panel readers see? Your call!"); }
      if (kind === "add") { setIndex(next.data.pages.length - 1); setPanelIndex(0); }
      if (kind === "remove") { setIndex(Math.max(0, index - 1)); setPanelIndex(0); }
      if (kind === "move" && to !== undefined) setIndex(to);
      if (kind === "finish") { setReading(true); chat.say("You made a whole comic! Every panel was your choice."); }
      if (kind === "page" && page && page.panels.some((p) => p.layers.filter((l) => l.type === "speech").length > 1)) chat.say("Can readers tell who’s talking here? Point each bubble’s tail at the speaker. Your call!");
      toast.success(kind === "finish" ? "Your comic is in your album!" : "Saved!");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Your work is still here. Try saving again."); }
    finally { setBusy(false); refresh(); }
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
  function selectPanel(i: number) {
    setPanelIndex(i); setLayerId(null);
    if (comic && page && index === comic.data.pages.length - 1 && i === page.panels.length - 1) chat.say("Last panel! What’s the payoff or punchline? Your call!");
    else if (index === 0 && i === 0) chat.say("Your opening panel! What do readers need to see first? Your call!");
  }

  if (makingCharacter) return <div className="space-y-4"><Button variant="ghost" onClick={() => setMakingCharacter(false)}><ArrowLeft />Comic Maker</Button><CharacterCreator child={child} chat={chat} onDone={() => setMakingCharacter(false)} /></div>;
  if (comicId && !comic) return <div className="flex min-h-64 flex-col items-center justify-center gap-4"><Bugley expression="thinking" stage={child.bugley_stage} size={100} /><p>Opening your comic…</p></div>;
  if (!comic) return <div className="space-y-6">
    <h1 className="text-3xl">Comic Maker</h1>
    <label className="block space-y-2 font-semibold"><span>Your comic’s title</span><input className={field} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Give it a made-up name" /></label>
    <section className="space-y-3"><h2 className="text-xl">What kind of comic?</h2><div className="flex flex-wrap gap-2">{GENRES.map((g) => <Button key={g} variant={genre === g ? "primary" : "outline"} size="sm" aria-pressed={genre === g} onClick={() => setGenre(g)}>{g}</Button>)}</div></section>
    <section className="space-y-3"><h2 className="text-xl">Who’s in it?</h2><div className="flex flex-wrap gap-3">{cast.map((c) => <Button key={c.id} variant={picked.includes(c.id) ? "primary" : "outline"} aria-pressed={picked.includes(c.id)} className="h-auto max-w-32 flex-col whitespace-normal p-2" onClick={() => setPicked(picked.includes(c.id) ? picked.filter((id) => id !== c.id) : [...picked, c.id])}><img src={c.url} alt="" className="size-20 rounded-lg object-cover" /><span className="break-words">{c.title}</span></Button>)}<Button variant="outline" onClick={() => setMakingCharacter(true)}><Plus />Create a character</Button></div></section>
    <section className="space-y-3"><h2 className="text-xl">Art style <span className="text-sm font-normal text-muted-foreground">· stays the same for the whole comic</span></h2><StylePicker value={style} onChange={setStyle} /></section>
    <Button disabled={busy || !title.trim()} onClick={async () => { setBusy(true); try { const next = await create({ data: { childId: child.id, title, genre, styleKey: style, characterIds: picked, environment: env } }); adopt(next); onComic(next.id); chat.say("Who’s your hero, and what do they want? Your call!"); } catch (e) { toast.error(e instanceof Error ? e.message : "We couldn’t start your comic."); } finally { setBusy(false); refresh(); } }}><Sparkles />{busy ? "Starting…" : "Start my comic"}</Button>
  </div>;
  if (reading) return <ComicReader comic={comic} child={child} onBack={!comic.data.finished ? () => setReading(false) : undefined} />;

  return <div className="space-y-6" aria-busy={busy}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="break-words text-3xl">{comic.title}</h1><span className="text-sm text-muted-foreground" role="status">{busy ? "Working…" : dirty ? "Unsaved changes" : "Saved"}</span></div>
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><span>{comic.data.genre}</span><span>· {comic.data.styleKey.replaceAll("_", " ")}</span><span>· {comic.data.pages.length} {comic.data.pages.length === 1 ? "page" : "pages"}</span><Button variant="ghost" size="sm" disabled={dirty || busy} onClick={() => setReading(true)}><BookOpen />Read</Button></div>
    <section className="space-y-3 border-y border-border py-4"><div className="flex items-center justify-between gap-2"><h2 className="text-xl">My Story Map</h2><Button variant="ghost" size="sm" disabled={busy || dirty} onClick={() => { setMapEditing(!mapEditing); setMapDraft(comic.data.map); }}>{mapEditing ? "Close" : "Edit"}</Button></div>
      {mapEditing ? <><div className="grid gap-3 sm:grid-cols-2">{Object.entries(MAP_LABELS).map(([k, label]) => <label key={k} className="space-y-1 text-sm font-semibold"><span>{label}</span><textarea rows={2} maxLength={600} disabled={busy} className={field} value={mapDraft[k as keyof typeof mapDraft]} onChange={(e) => { setMapDraft({ ...mapDraft, [k]: e.target.value }); setDirty(true); }} /></label>)}</div>
        <div className="flex flex-wrap gap-2"><Button disabled={busy || Object.values(mapDraft).some((v) => !v.trim())} onClick={() => void action("map")}><Save />Save Story Map</Button><Button variant="ghost" onClick={() => speak(Object.values(MAP_LABELS).join(" "))}><Volume2 />Hear questions</Button></div></>
      : <dl className="grid gap-3 sm:grid-cols-2">{Object.entries(MAP_LABELS).map(([k, label]) => <div key={k}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words font-semibold">{comic.data.map[k as keyof typeof mapDraft]}</dd></div>)}</dl>}
    </section>

    {!mapEditing && page && panel && <>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl">Page {index + 1} <span className="text-base font-normal text-muted-foreground">of {comic.data.pages.length}</span></h2>
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" size="icon" aria-label="Previous page" disabled={!index || dirty || busy} onClick={() => { setIndex(index - 1); setPanelIndex(0); setLayerId(null); }}><ArrowLeft /></Button>
            <Button variant="ghost" size="icon" aria-label="Next page" disabled={index >= comic.data.pages.length - 1 || dirty || busy} onClick={() => { setIndex(index + 1); setPanelIndex(0); setLayerId(null); }}><ArrowRight /></Button>
            <Button variant="ghost" size="icon" aria-label="Move page earlier" disabled={!index || busy} onClick={() => void action("move", index - 1)}><ArrowUp /></Button>
            <Button variant="ghost" size="icon" aria-label="Move page later" disabled={index >= comic.data.pages.length - 1 || busy} onClick={() => void action("move", index + 1)}><ArrowDown /></Button>
            <Button variant="ghost" size="icon" aria-label="Remove page" disabled={comic.data.pages.length === 1 || busy} onClick={() => { if (window.confirm("Remove this page?")) void action("remove"); }}><Trash2 /></Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Page layout">{(Object.keys(LAYOUTS) as Layout[]).map((l) => <Button key={l} size="sm" variant={page.layout === l ? "primary" : "outline"} aria-pressed={page.layout === l} disabled={busy} onClick={() => pickLayout(l)}><LayoutIcon layout={l} />{LAYOUT_LABEL[l]}</Button>)}</div>
        <div className="mx-auto w-full max-w-xs"><PageGrid page={page} urls={comic.urls} selected={panelIndex} onSelect={selectPanel} /></div>
      </section>

      <section className="space-y-4 rounded-3xl bg-card p-4 shadow-soft sm:p-6">
        <h3 className="text-xl">Panel {panelIndex + 1}</h3>
        <label className="block space-y-2"><span className="font-semibold">What happens in this panel?</span><textarea rows={3} maxLength={600} disabled={busy} className={cn(field, sprouts && "text-xl")} value={panel.description} placeholder="Zara flies over the city, looking worried" onChange={(e) => changePanel({ description: e.target.value })} /></label>
        <div className="space-y-2"><span className="flex items-center gap-2 text-sm font-semibold"><Camera className="size-4" />Where’s the camera?</span><div className="flex flex-wrap gap-2">{ANGLES.map((a) => <Button key={a || "auto"} size="sm" variant={panel.angle === a ? "primary" : "outline"} aria-pressed={panel.angle === a} disabled={busy} onClick={() => changePanel({ angle: a })}>{ANGLE_LABEL[a]}</Button>)}</div></div>
        <div className="flex flex-wrap gap-2">
          {sprouts && voice.supported && <Button variant="secondary" disabled={busy} onClick={voice.start}><Mic />{voice.listening ? "Listening…" : "Say it"}</Button>}
          <Button variant="ghost" disabled={busy} onClick={() => void coach(`Help me with panel ${panelIndex + 1} on page ${index + 1}. Ask me about the camera: close up or far away?`)}><Sparkles />Ask Bugley</Button>
          <Button variant="secondary" disabled={busy || panel.description.trim().length < 3} onClick={() => void action("sketch")}>{panel.sketch ? "Sketch again · 1 glow" : "Sketch it · 1 glow"}</Button>
          <Button disabled={busy || !panel.sketch || dirty} onClick={() => void action("final")}>{panel.image ? "Final again · 3 glow" : "Make it final · 3 glow"}</Button>
        </div>
        {!panel.sketch && <p className="text-sm text-muted-foreground">Sketch first. When you like it, make it final.</p>}
        {panel.sketch && !panel.image && dirty && <p className="text-sm text-muted-foreground">Save your page before making it final.</p>}

        <div className="space-y-2"><span className="text-sm font-semibold">Add words on top (never inside the picture)</span><div className="flex flex-wrap gap-2">{LAYER_BUTTONS.map(({ type, label, icon: Icon }) => <Button key={type} size="sm" variant="outline" disabled={busy || panel.layers.length >= 12} onClick={() => { const l = newLayer(type); changeLayers([...panel.layers, l]); setLayerId(l.id); }}><Icon />{label}</Button>)}</div></div>
        <div className="mx-auto w-full max-w-lg">
          <PanelCanvas panel={panel} url={comic.urls[panel.image ?? panel.sketch ?? ""]} aspect={panelAspect(page.layout, panelIndex)} editable selected={layerId} onSelect={setLayerId} onLayers={changeLayers} />
          {panel.sketch && !panel.image && <p className="mt-1 text-center text-xs text-muted-foreground">Sketch</p>}
        </div>
        {layer && <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 space-y-1"><span className="text-sm font-semibold">{LAYER_BUTTONS.find((b) => b.type === layer.type)?.label} words</span><input autoFocus className={cn(field, layer.type === "sfx" ? "font-sfx text-xl" : "font-comic")} maxLength={200} value={layer.text} placeholder={layer.type === "sfx" ? "POW!" : "Your words"} onChange={(e) => changeLayers(panel.layers.map((l) => l.id === layer.id ? { ...l, text: e.target.value } : l))} /></label>
          <Button variant="ghost" aria-label="Remove words" onClick={() => { changeLayers(panel.layers.filter((l) => l.id !== layer.id)); setLayerId(null); }}><Trash2 />Remove</Button>
        </div>}
        <p className="text-xs text-muted-foreground">Drag words to move them. Drag the corner to resize. Drag the dot to point the bubble’s tail.</p>
        <div className="flex flex-wrap gap-2"><Button disabled={busy || !dirty} onClick={() => void action("page")}><Save />Save page</Button><Button variant="outline" disabled={busy} onClick={() => void action("add")}><Plus />Add a page</Button><Button variant="ghost" disabled={busy} onClick={() => void coach("Look at my comic's beats and pacing. What's one question you'd ask me?")}><Sparkles />How’s my pacing?</Button></div>
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <h2 className="text-2xl">The cover</h2>
        <label className="block space-y-2"><span className="text-sm font-semibold">Describe the cover picture</span><textarea rows={2} maxLength={600} className={field} disabled={busy} value={coverDescription} onChange={(e) => setCoverDescription(e.target.value)} /></label>
        <Button variant="secondary" disabled={busy || coverDescription.trim().length < 3} onClick={() => void action("cover")}>Draw cover · 3 glow</Button>
        {comic.data.cover && <div className="mx-auto max-w-xs"><ComicCover comic={comic} cast={cast} /></div>}
        <div><Button disabled={busy || dirty || !readyToFinishComic(comic.data)} onClick={() => void action("finish")}><Check />Finish my comic</Button></div>
        <p className="text-sm text-muted-foreground">To finish, make every panel final and draw a cover. {comic.data.pages.length} {comic.data.pages.length === 1 ? "page" : "pages"} toward a printed book · Printing comes later.</p>
      </section>
    </>}
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
function PanelCanvas({ panel, url, aspect, editable, selected, onSelect, onLayers }: { panel: Panel; url?: string; aspect?: number; editable?: boolean; selected?: string | null; onSelect?: (id: string) => void; onLayers?: (l: Layer[]) => void }) {
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
