// Create Studio V3 — one continuous comic journey: Spark → Adventure → Characters → Scenes → Finish.
// Child-facing orchestration only; all saving, safety, Character Lock and Glow charging stay in existing services.
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, Pencil, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Bugley } from "@/components/brand/Bugley";
import { GlowMeter } from "@/components/studio/GlowMeter";
import { ComicReader, PanelCanvas } from "@/components/studio/ComicMaker";
import type { SidekickChild } from "@/components/studio/Sidekick";
import { startV3Comic, proposeComicArc, reviseComicScene } from "@/lib/v3.functions";
import { getWorkspace, updateWorkspace } from "@/lib/workspace.functions";
import { getComic, editComic } from "@/lib/comic.functions";
import { listCast, makeHeroOptions, saveHero } from "@/lib/images.functions";
import { getChildGlow } from "@/lib/glow.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { comicPanelAspect, type Comic } from "@/lib/comic";
import { cn } from "@/lib/utils";

const SCENE_COST = 3; // existing "final picture" Glow cost
const PREVIEW_COST = 1; // existing hero-options Glow cost

type Phase = "spark" | "story" | "characters" | "scenes" | "done";

function phaseOf(comic: Comic | null): Phase {
  if (!comic) return "spark";
  if (comic.data.finished) return "done";
  if (!comic.data.workspace?.outlineApproved) return "story";
  if (!comic.data.characterIds.length) return "characters";
  return "scenes";
}

export function ComicJourney({ child, projectId, onExit }: { child: SidekickChild; projectId?: string | undefined; onExit: () => void }) {
  const [comic, setComic] = useState<Comic | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const env = getStripeEnvironment();
  const load = useServerFn(getComic);
  const openWorkspace = useServerFn(getWorkspace);
  const { data: glow, refetch: refetchGlow } = useQuery({ queryKey: ["glow", child.id], queryFn: () => getChildGlow({ data: { childId: child.id } }) });
  const sprouts = child.age_band === "sprouts";

  // Resume an existing V3 comic.
  useEffect(() => {
    if (!projectId || comic) return;
    void (async () => {
      try {
        const ws = await openWorkspace({ data: { childId: child.id, id: projectId } });
        if (!ws.workspace.v3) { setNote("That comic opens in the classic Studio."); return; }
        setComic(await load({ data: { childId: child.id, id: projectId } }));
      } catch (e) { setNote(e instanceof Error ? e.message : "We couldn’t open that comic."); }
    })();
  }, [projectId, comic, child.id, load, openWorkspace]);

  const phase = phaseOf(comic);
  const refresh = async (id: string) => { const c = await load({ data: { childId: child.id, id } }); setComic(c); return c; };
  const fail = (e: unknown) => setNote(e instanceof Error ? e.message : "Oops! Your work is saved. Try again.");

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3">
      <Button variant="ghost" onClick={onExit}><ArrowLeft className="size-5" />Studio</Button>
      {comic && <span className="font-display text-lg truncate">{comic.title}</span>}
      {glow ? <GlowMeter compact total={glow.total} allowance={glow.allowance} stage={child.bugley_stage} /> : <span className="h-10 w-32" />}
    </div>
    {note && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-2 font-semibold text-destructive">{note}</p>}
    {phase === "spark" && <Spark child={child} busy={busy} onStart={async (idea) => {
      setBusy(true); setNote("");
      try {
        const ws = await startV3Comic({ data: { childId: child.id, id: crypto.randomUUID(), idea, environment: env } });
        setComic(await load({ data: { childId: child.id, id: ws.id } }));
      } catch (e) { fail(e); } finally { setBusy(false); }
    }} />}
    {phase === "story" && comic && <Storyboard child={child} comic={comic} busy={busy} setBusy={setBusy} onNote={setNote} onChange={setComic} onError={fail} />}
    {phase === "characters" && comic && <MeetCharacters child={child} comic={comic} busy={busy} setBusy={setBusy} onNote={setNote} onChange={setComic} onError={fail} onGlow={() => void refetchGlow()} />}
    {phase === "scenes" && comic && <Scenes child={child} comic={comic} busy={busy} setBusy={setBusy} onNote={setNote} onChange={setComic} onError={fail} onGlow={() => void refetchGlow()} />}
    {phase === "done" && comic && <div className="space-y-4">
      <BugleySays child={child} text="You made a whole comic!" expression="celebrating" />
      <ComicReader comic={comic} child={child} />
      <div className="flex justify-center"><Button variant="secondary" onClick={async () => { setBusy(true); try { setComic(await editComic({ data: { childId: child.id, id: comic.id, action: "reopen", environment: env } })); } catch (e) { fail(e); } finally { setBusy(false); } }}><Pencil className="size-4" />Keep working on it</Button></div>
    </div>}
    {sprouts && phase !== "done" && <p className="text-center text-sm text-muted-foreground">Bugley saves everything for you.</p>}
  </div>;
}

/** Bugley's short, deterministic guidance — no AI call for routine transitions. */
function BugleySays({ child, text, expression = "happy" }: { child: SidekickChild; text: string; expression?: "happy" | "curious" | "thinking" | "celebrating" }) {
  return <div className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
    <Bugley stage={child.bugley_stage} expression={expression} size={56} />
    <p className={cn("font-display", child.age_band === "sprouts" ? "text-2xl" : "text-xl")}>{text}</p>
  </div>;
}

/** Moment 1 — The Spark. */
function Spark({ child, busy, onStart }: { child: SidekickChild; busy: boolean; onStart: (idea: string) => void }) {
  const [idea, setIdea] = useState("");
  const sprouts = child.age_band === "sprouts";
  return <div className="space-y-6">
    <BugleySays child={child} text="What’s your comic about?" expression="curious" />
    <Textarea autoFocus value={idea} maxLength={600} disabled={busy} onChange={(e) => setIdea(e.target.value)}
      placeholder={sprouts ? "A dragon who loves pizza…" : "A purple dragon named Pickles is scared of flying…"}
      aria-label="Your comic idea" className={cn("min-h-32 rounded-3xl border-4 border-primary/40 bg-card", sprouts ? "text-2xl p-6" : "text-xl p-5")} />
    <Button size="lg" disabled={busy || idea.trim().length < 3} onClick={() => onStart(idea.trim())} className={cn("w-full rounded-full", sprouts && "h-16 text-2xl")}>
      <Sparkles className="size-5" />{busy ? "Bugley is listening…" : "Let’s make it!"}
    </Button>
  </div>;
}

/** Moment 2 — The Adventure: four storyboard cards, approve or change one scene. */
function Storyboard({ child, comic, busy, setBusy, onNote, onChange, onError }: { child: SidekickChild; comic: Comic; busy: boolean; setBusy: (b: boolean) => void; onNote: (n: string) => void; onChange: (c: Comic) => void; onError: (e: unknown) => void }) {
  const propose = useServerFn(proposeComicArc);
  const revise = useServerFn(reviseComicScene);
  const update = useServerFn(updateWorkspace);
  const asked = useRef(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [request, setRequest] = useState("");
  const outline: string[] = comic.data.outline ?? [];
  const hero = comic.data.map.hero || "your hero";

  useEffect(() => {
    if (outline.length === 4 || asked.current) return;
    asked.current = true;
    setBusy(true);
    void propose({ data: { childId: child.id, id: comic.id } })
      .then(async () => onChange(await getComic({ data: { childId: child.id, id: comic.id } })))
      .catch(onError)
      .finally(() => setBusy(false));
  }, [outline.length, child.id, comic.id, propose, onChange, onError, setBusy]);

  if (outline.length !== 4) return <div className="space-y-4"><BugleySays child={child} text={`Bugley is imagining an adventure for ${hero}…`} expression="thinking" /><div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map(i => <div key={i} className="aspect-[4/3] animate-pulse rounded-3xl bg-muted" />)}</div></div>;

  return <div className="space-y-5">
    <BugleySays child={child} text={`I have an idea for ${hero}’s adventure! What do you think?`} expression="curious" />
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {outline.map((line, i) => {
        const [title, ...rest] = line.split(" — ");
        return <li key={i} className="rounded-3xl border-2 border-border bg-card p-4 shadow-soft">
          <p className="text-sm font-semibold text-muted-foreground">Scene {i + 1}</p>
          <p className="font-display text-lg">{title}</p>
          <p className="mt-1 text-sm">{rest.join(" — ")}</p>
          {editing === i
            ? <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); void (async () => {
                setBusy(true); onNote("");
                try { await revise({ data: { childId: child.id, id: comic.id, updatedAt: comic.updatedAt, scene: i, request } }); onChange(await getComic({ data: { childId: child.id, id: comic.id } })); setEditing(null); setRequest(""); }
                catch (err) { onError(err); } finally { setBusy(false); }
              })(); }}>
                <Textarea autoFocus value={request} maxLength={300} disabled={busy} onChange={(e) => setRequest(e.target.value)} placeholder="Make it funnier…" aria-label={`Change scene ${i + 1}`} className="min-h-20 rounded-2xl" />
                <div className="flex gap-2"><Button size="sm" disabled={busy || request.trim().length < 2}>Change it</Button><Button size="sm" variant="ghost" type="button" onClick={() => setEditing(null)}>Never mind</Button></div>
              </form>
            : <Button size="sm" variant="ghost" className="mt-2" disabled={busy} onClick={() => { setEditing(i); setRequest(""); }}><Pencil className="size-4" />Change something</Button>}
        </li>;
      })}
    </ul>
    <Button size="lg" disabled={busy} className="w-full rounded-full" onClick={() => void (async () => {
      setBusy(true); onNote("");
      try { await update({ data: { childId: child.id, id: comic.id, updatedAt: comic.updatedAt, environment: getStripeEnvironment(), outlineApproved: true } }); onChange(await getComic({ data: { childId: child.id, id: comic.id } })); }
      catch (e) { onError(e); } finally { setBusy(false); }
    })()}><Heart className="size-5" />I love it!</Button>
  </div>;
}

/** Moment 3 — Meet the Characters: reuse an approved character or preview a new one from facts already given. */
function MeetCharacters({ child, comic, busy, setBusy, onNote, onChange, onError, onGlow }: { child: SidekickChild; comic: Comic; busy: boolean; setBusy: (b: boolean) => void; onNote: (n: string) => void; onChange: (c: Comic) => void; onError: (e: unknown) => void; onGlow: () => void }) {
  const { data: cast = [] } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
  const facts = comic.data.workspace?.facts;
  const [name, setName] = useState(facts?.heroName || comic.data.map.hero || "");
  const [kind, setKind] = useState(facts?.heroLooks || "");
  const [options, setOptions] = useState<{ path: string; url?: string }[]>([]);
  const paint = useServerFn(makeHeroOptions);
  const approve = useServerFn(saveHero);
  const update = useServerFn(updateWorkspace);
  const named = useMemo(() => cast.find(m => name && m.title.toLowerCase() === name.toLowerCase()), [cast, name]);

  async function attach(id: string) {
    setBusy(true); onNote("");
    try { await update({ data: { childId: child.id, id: comic.id, updatedAt: comic.updatedAt, environment: getStripeEnvironment(), characterIds: [id] } }); onChange(await getComic({ data: { childId: child.id, id: comic.id } })); }
    catch (e) { onError(e); } finally { setBusy(false); }
  }
  async function preview() {
    setBusy(true); onNote("");
    try {
      const r = await paint({ data: { childId: child.id, styleKey: comic.data.styleKey, name, kind, special: "", personality: "", color: "", environment: getStripeEnvironment(), op: crypto.randomUUID() } });
      if (!r.ok) { onNote(r.reply); return; }
      setOptions(r.options); onGlow();
    } catch (e) { onError(e); } finally { setBusy(false); }
  }
  async function choose(path: string) {
    setBusy(true); onNote("");
    try {
      const r = await approve({ data: { childId: child.id, path, styleKey: comic.data.styleKey, name, kind, special: "", personality: "", color: "" } });
      if (!r.ok) { onNote(r.reply); return; }
      await attach(r.id);
    } catch (e) { onError(e); } finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <BugleySays child={child} text={named ? `Is this ${name}?` : `Let’s see what ${name || "your hero"} looks like!`} expression="curious" />
    {named && <button disabled={busy} onClick={() => void attach(named.id)} className="flex w-full items-center gap-4 rounded-3xl border-4 border-primary bg-card p-4 text-left shadow-soft transition hover:shadow-glow">
      {named.url ? <img src={named.url} alt={named.title} className="size-20 rounded-2xl object-cover" /> : <span className="text-4xl">🐾</span>}
      <span className="font-display text-xl">Use {named.title}!</span>
    </button>}
    {!named && <div className="space-y-4 rounded-3xl bg-card p-5 shadow-soft">
      <label className="block space-y-1 font-semibold">Name<Input value={name} maxLength={40} disabled={busy} onChange={(e) => { setName(e.target.value); setOptions([]); }} aria-label="Character name" /></label>
      <label className="block space-y-1 font-semibold">What do they look like?<Input value={kind} maxLength={160} disabled={busy} onChange={(e) => { setKind(e.target.value); setOptions([]); }} aria-label="Character appearance" placeholder="A purple dragon with tiny wings" /></label>
      <Button disabled={busy || !name.trim() || kind.trim().length < 2} onClick={() => void preview()}>{busy ? "Painting previews…" : `See ${name || "them"} · ${PREVIEW_COST} Glow`}</Button>
      <div className="grid grid-cols-3 gap-2">{options.map((o, i) => <button key={o.path} disabled={busy} onClick={() => void choose(o.path)} className="rounded-2xl border-4 border-transparent transition hover:border-primary focus-visible:border-primary">
        <img src={o.url} alt={`${name} preview ${i + 1}`} className="aspect-square w-full rounded-xl object-contain" />
        <span className="block py-1 text-center text-sm font-semibold">That’s {name}!</span>
      </button>)}</div>
    </div>}
    {cast.filter(m => m.id !== named?.id).length > 0 && <details className="rounded-3xl bg-card p-4 shadow-soft"><summary className="cursor-pointer font-semibold">Or pick from My Characters</summary>
      <ul className="mt-3 grid grid-cols-3 gap-2">{cast.filter(m => m.id !== named?.id).map(m => <li key={m.id}><button disabled={busy} onClick={() => void attach(m.id)} className="w-full rounded-2xl border-2 border-border p-1 text-center hover:border-primary">
        {m.url ? <img src={m.url} alt={m.title} className="aspect-square w-full rounded-xl object-cover" /> : <span className="flex aspect-square items-center justify-center text-3xl">🐾</span>}
        <span className="block truncate text-sm font-semibold">{m.title}</span>
      </button></li>)}</ul>
    </details>}
  </div>;
}

/** Moment 4 — The Creative Canvas: one scene at a time, draw → words → next. */
function Scenes({ child, comic, busy, setBusy, onNote, onChange, onError, onGlow }: { child: SidekickChild; comic: Comic; busy: boolean; setBusy: (b: boolean) => void; onNote: (n: string) => void; onChange: (c: Comic) => void; onError: (e: unknown) => void; onGlow: () => void }) {
  const edit = useServerFn(editComic);
  const page = comic.data.pages[0];
  const panels = page?.panels ?? [];
  const current = panels.findIndex(p => !p.image);
  const [selected, setSelected] = useState<number | null>(null);
  const [words, setWords] = useState("");
  const [changing, setChanging] = useState(false);
  const [changeText, setChangeText] = useState("");
  const at = selected ?? (current === -1 ? panels.length - 1 : current);
  const panel = panels[at];
  const hero = comic.data.map.hero || "your hero";
  const allDrawn = current === -1;
  const drawn = panels.filter(p => p.image).length;
  useEffect(() => { setWords(""); setChanging(false); setChangeText(""); }, [at]);

  if (!page || !panel) return null;
  const run = async (fn: () => Promise<Comic>) => { setBusy(true); onNote(""); try { onChange(await fn()); onGlow(); } catch (e) { onError(e); } finally { setBusy(false); } };
  const draw = () => run(() => edit({ data: { childId: child.id, id: comic.id, action: "final", pageId: page.id, panelId: panel.id, environment: getStripeEnvironment(), op: crypto.randomUUID() } }));
  const saveWords = (text: string) => run(() => edit({ data: { childId: child.id, id: comic.id, action: "dialogue", pageId: page.id, panelId: panel.id, text, environment: getStripeEnvironment() } }));
  const changeScene = () => run(async () => { const c = await edit({ data: { childId: child.id, id: comic.id, action: "panel", pageId: page.id, panelId: panel.id, description: changeText, environment: getStripeEnvironment() } }); setChanging(false); return c; });
  const cover = () => run(() => edit({ data: { childId: child.id, id: comic.id, action: "cover", description: `${comic.title} cover`, environment: getStripeEnvironment(), op: crypto.randomUUID() } }));
  const finish = () => run(() => edit({ data: { childId: child.id, id: comic.id, action: "finish", environment: getStripeEnvironment() } }));

  return <div className="space-y-5">
    <BugleySays child={child} expression={panel.image ? "celebrating" : "happy"}
      text={allDrawn ? "Every scene is drawn!" : panel.image ? "What a scene!" : `Ready to bring Scene ${at + 1} to life?`} />
    <p className="text-center font-display text-xl">Scene {at + 1} of {panels.length} <span className="text-sm font-normal text-muted-foreground">· {drawn} of {panels.length} drawn</span></p>
    <div className="flex justify-center gap-2">{panels.map((p, i) => <button key={p.id} onClick={() => setSelected(i)} aria-label={`Scene ${i + 1}${p.image ? ", drawn" : ""}`}
      className={cn("size-4 rounded-full transition", i === at ? "bg-primary scale-125" : p.image ? "bg-primary/50" : "bg-border")} />)}</div>

    <div className="rounded-3xl bg-card p-5 shadow-soft space-y-4">
      <p className="font-display text-lg">{panel.description.split(":")[0]}</p>
      <p className="text-muted-foreground">{panel.description.split(":").slice(1).join(":").trim()}</p>
      {panel.image
        ? <PanelCanvas panel={panel} url={comic.urls[panel.image]} aspect={comicPanelAspect(page, at)} editable={false} />
        : <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border-4 border-dashed border-primary/40 bg-primary/5 text-6xl" aria-hidden>✨</div>}

      {changing
        ? <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void changeScene(); }}>
            <Textarea autoFocus value={changeText} maxLength={600} disabled={busy} onChange={(e) => setChangeText(e.target.value)} placeholder="Make the sky nighttime…" aria-label="Change this scene" className="min-h-20 rounded-2xl" />
            <div className="flex gap-2"><Button size="sm" disabled={busy || changeText.trim().length < 3}>Change it</Button><Button size="sm" variant="ghost" type="button" onClick={() => setChanging(false)}>Never mind</Button></div>
            <p className="text-xs text-muted-foreground">Changing the scene means drawing it again · {SCENE_COST} Glow.</p>
          </form>
        : !panel.image
          ? <div className="flex flex-col gap-2">
              <Button size="lg" disabled={busy} onClick={() => void draw()} className="rounded-full">{busy ? "Bugley is painting…" : `Draw this scene · ${SCENE_COST} Glow`}</Button>
              <Button variant="ghost" disabled={busy} onClick={() => { setChanging(true); setChangeText(panel.description); }}>Change the scene</Button>
            </div>
          : <div className="space-y-3">
              {!panel.dialogueDone && <div className="space-y-2">
                <p className="font-semibold">What does {hero} say?</p>
                <Input value={words} maxLength={200} disabled={busy} onChange={(e) => setWords(e.target.value)} placeholder="I can do it!" aria-label="Words for this scene" />
                <div className="flex gap-2"><Button disabled={busy} onClick={() => void saveWords(words)}>Add words</Button><Button variant="ghost" disabled={busy} onClick={() => void saveWords("")}>No words needed</Button></div>
              </div>}
              <div className="flex flex-col gap-2">
                {!allDrawn && (panel.dialogueDone || child.age_band === "sprouts") && <Button size="lg" disabled={busy} onClick={() => setSelected(current)} className="rounded-full">Love it! Next scene</Button>}
                <Button variant="ghost" disabled={busy} onClick={() => { setChanging(true); setChangeText(panel.description); }}>Change something</Button>
              </div>
            </div>}
    </div>

    {allDrawn && <div className="rounded-3xl bg-card p-5 shadow-soft space-y-3 text-center">
      <p className="font-display text-2xl">Your comic is ready to finish!</p>
      {comic.data.cover
        ? <><img src={comic.urls[comic.data.cover]} alt="Comic cover" className="mx-auto aspect-[4/3] max-w-xs rounded-2xl object-cover" /><Button size="lg" disabled={busy} onClick={() => void finish()} className="rounded-full">Finish my comic!</Button></>
        : <Button size="lg" disabled={busy} onClick={() => void cover()} className="rounded-full">{busy ? "Painting the cover…" : `Make the cover · ${SCENE_COST} Glow`}</Button>}
    </div>}
  </div>;
}
