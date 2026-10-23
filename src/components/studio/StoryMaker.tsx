import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Check, Mic, MoreHorizontal, Plus, Save, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bugley } from "@/components/brand/Bugley";
import { MakerSetup } from "./MakerSetup";
import { StepNav, field } from "./Guided";
import { speak, useVoiceInput, type BugleyChat, type SidekickChild } from "./Sidekick";
import { askBugley } from "@/lib/studio.functions";
import { createStory, editStory, getStory } from "@/lib/story.functions";
import { STORY_STEPS, EMPTY_MAP, readyToFinish, type Story } from "@/lib/story";
import { getStripeEnvironment } from "@/lib/stripe";
import { useScrollTopOn } from "@/lib/scroll";
import { cn } from "@/lib/utils";

const MAP_LABELS = { hero: "Who is the hero?", want: "What do they want most?", place: "Where does it happen?", problem: "What’s standing in the way?", ending: "How might it end?" };
const HINTS = ["Meet your hero and their world", "Until one day…", "Because of that…", "Everything changes…", "Until finally…"];

export function StoryMaker({ child, chat, storyId, onStory, onDirty }: { child: SidekickChild; chat: BugleyChat; storyId: string | null; onStory: (id: string) => void; onDirty: (dirty: boolean) => void }) {
  const [story, setStory] = useState<Story | null>(null);
  const [index, setIndex] = useState(0);
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
  const create = useServerFn(createStory), edit = useServerFn(editStory), load = useServerFn(getStory), ask = useServerFn(askBugley);
  const qc = useQueryClient();
  const sprouts = child.age_band === "sprouts";
  const page = story?.data.pages[index];
  const voice = useVoiceInput((text) => changePage({ text: `${page?.text ?? ""} ${text}`.trim() }));
  const mapVoice = useVoiceInput((text) => {
    const key = (Object.keys(EMPTY_MAP) as (keyof typeof EMPTY_MAP)[]).find((k) => !mapDraft[k].trim());
    if (key) { setMapDraft((v) => ({ ...v, [key]: text })); setDirty(true); }
  });
  function adopt(next: Story) { setStory(next); setMapDraft(next.data.map); setDirty(false); }
  function changePage(patch: Partial<NonNullable<typeof page>>) {
    if (!story || !page || busy) return;
    setStory({ ...story, data: { ...story.data, pages: story.data.pages.map((p) => p.id === page.id ? { ...p, ...patch } : p) } }); setDirty(true);
  }
  useEffect(() => {
    if (!storyId) return;
    let active = true;
    setBusy(true);
    void load({ data: { childId: child.id, id: storyId } }).then((next) => {
      if (!active) return;
      adopt(next); setReading(next.data.finished); setMapEditing(Object.values(next.data.map).some((v) => !v.trim()));
    }).catch((e) => toast.error(e.message)).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [storyId, child.id, load]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => { if (sprouts && page && !reading) speak(`${STORY_STEPS.indexOf(page.step) === 0 ? "Meet your hero." : HINTS[STORY_STEPS.indexOf(page.step)]} Your words go here.`); }, [index, reading, sprouts, !!story]);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["album", child.id] }); void qc.invalidateQueries({ queryKey: ["glow", child.id] }); };
  async function action(kind: "map" | "page" | "add" | "illustrate" | "cover" | "finish"): Promise<boolean> {
    if (!story || busy) return false;
    setBusy(true);
    try {
      let current = story;
      if (dirty && kind !== "map" && page) current = await edit({ data: { childId: child.id, id: story.id, environment: getStripeEnvironment(), action: "page", page } });
      const next = kind === "page" && dirty ? current : await edit({ data: { childId: child.id, id: current.id, environment: getStripeEnvironment(), action: kind, map: kind === "map" ? mapDraft : undefined, page: kind === "page" ? page : undefined, pageId: page?.id, description: coverDescription } });
      adopt(next);
      if (kind === "map") { setMapEditing(false); chat.say("Story Map saved! Back to writing. Your call!"); }
      if (kind === "add") { setIndex(next.data.pages.length - 1); chat.say("A fresh page! What happens next? Your call!"); }
      if (kind === "finish") { setReading(true); setIndex(0); chat.say("You kept going and made a whole story! Your choices brought it to life."); toast.success("Your story is in your album!"); }
      if (kind === "illustrate") chat.say("Here’s your picture! Want to keep writing?");
      if (kind === "page" && page?.text.trim()) {
        try {
          const response = await ask({ data: { childId: child.id, storyId: story.id, pageId: page.id, purpose: "coach", context: "Story Maker", source: "chip", environment: getStripeEnvironment(), text: "Quietly check my saved page for a specific continuity conflict. Stay quiet if it fits." } });
          if (response.reply.trim()) chat.say(response.reply, response.chips);
        } catch { /* page is saved; continuity check is optional */ }
      }
      return true;
    } catch (e) { toast.error(e instanceof Error ? e.message : "Your words are still here. Try saving again."); return false; }
    finally { setBusy(false); refresh(); }
  }
  async function turn(to: number) { if (dirty && !(await action("page"))) return; setIndex(to); }
  async function assist(purpose: "coach" | "picture" | "spelling") {
    if (!story || !page || busy || mapEditing) return;
    setBusy(true);
    try {
      if (dirty) adopt(await edit({ data: { childId: child.id, id: story.id, environment: getStripeEnvironment(), action: "page", page } }));
      const r = await ask({ data: { childId: child.id, storyId: story.id, pageId: page.id, purpose, context: "Story Maker", source: "chip", environment: getStripeEnvironment(), text: purpose === "picture" ? "Suggest a picture from my saved page." : purpose === "spelling" ? "Please check a few spellings, without rewriting my words." : `Help me think about my ${page.step.toLowerCase()}.` } });
      chat.say(r.reply, r.chips);
      if ("description" in r && typeof r.description === "string" && r.description) {
        const description = r.description;
        setStory((current) => current ? { ...current, data: { ...current.data, pages: current.data.pages.map((p) => p.id === page.id ? { ...p, description } : p) } } : current); setDirty(true);
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Bugley couldn’t check that right now."); }
    finally { setBusy(false); }
  }
  if (storyId && !story) return <div className="flex min-h-64 flex-col items-center justify-center gap-4"><Bugley expression="thinking" stage={child.bugley_stage} size={100} /><p>Opening your story…</p></div>;
  if (!story) return <MakerSetup child={child} chat={chat} kind="story" mapLabels={MAP_LABELS} defaultStyle="storybook" onCreate={async (r) => {
    try {
      const made = await create({ data: { childId: child.id, title: r.title, genre: r.genre, styleKey: r.styleKey, characterIds: r.characterIds, environment: getStripeEnvironment() } });
      const next = await edit({ data: { childId: child.id, id: made.id, environment: getStripeEnvironment(), action: "map", map: r.map } });
      adopt(next); setMapEditing(false); onStory(next.id); setIndex(0);
      chat.say(`Page 1! Meet ${r.map.hero.split(/[,.]/)[0] || "your hero"} and their world. What do we see first? Your call!`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "We couldn’t start your story."); } finally { refresh(); }
  }} />;
  if (reading) return <StoryReader story={story} child={child} onBack={!story.data.finished ? () => setReading(false) : undefined} />;
  const mapIncomplete = Object.values(story.data.map).some((v) => !v.trim());
  const mapForm = <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2">{Object.entries(MAP_LABELS).map(([key, label]) => <label key={key} className="space-y-1 text-sm font-semibold"><span>{label}</span><textarea rows={2} maxLength={600} disabled={busy} className={field} value={mapDraft[key as keyof typeof mapDraft]} onChange={(e) => { setMapDraft({ ...mapDraft, [key]: e.target.value }); setDirty(true); }} /></label>)}</div><div className="flex flex-wrap gap-2"><Button disabled={busy || Object.values(mapDraft).some((v) => !v.trim())} onClick={() => void action("map")}><Save />Save Story Map</Button>{mapVoice.supported && <Button variant="secondary" disabled={busy} onClick={mapVoice.start}><Mic />{mapVoice.listening ? "Listening…" : "Say my answer"}</Button>}</div></div>;
  if (mapIncomplete) return <div className="space-y-5"><h1 className="text-center text-3xl">Finish your Story Map</h1>{mapForm}</div>;
  const missing = story.data.pages.filter((p) => !p.text.trim() || !p.image).length;
  const stepsLeft = STORY_STEPS.filter((s) => !story.data.pages.some((p) => p.step === s && p.text.trim()));

  if (finishing) return <div className="space-y-5" aria-busy={busy}>
    <h1 className="text-center text-3xl sm:text-4xl">{story.data.bookId ? "Finish this chapter" : "Make your cover"}</h1>
    {!story.data.bookId && <>
      {story.data.cover && <div className="mx-auto max-w-sm"><img src={story.urls[story.data.cover]} alt="Story cover" className="aspect-square w-full rounded-3xl bg-muted object-contain shadow-lift" /><p className="mt-2 break-words text-center font-display text-2xl">{story.title}</p></div>}
      <textarea rows={2} maxLength={600} className={field} disabled={busy} value={coverDescription} onChange={(e) => setCoverDescription(e.target.value)} placeholder="What’s on the cover?" aria-label="Describe the cover picture" />
      <Button variant="secondary" size="lg" disabled={busy || coverDescription.trim().length < 3} onClick={() => void action("cover")}>{busy ? "Drawing…" : story.data.cover ? "Draw cover again · 3 glow" : "Draw cover · 3 glow"}</Button>
    </>}
    {!readyToFinish(story.data) && <p className="rounded-2xl bg-muted p-4 font-medium">Almost there! {stepsLeft.length > 0 && `Your story still needs: ${stepsLeft.join(", ")}. `}{missing > 0 && `${missing} ${missing === 1 ? "page needs" : "pages need"} words and a picture. `}{!story.data.cover && !story.data.bookId && "And a cover!"}</p>}
    <StepNav onBack={() => setFinishing(false)} busy={busy} canNext={readyToFinish(story.data) && !dirty} nextLabel={<><Check />Finish my story</>} onNext={() => void action("finish")} />
  </div>;

  if (!page) return null;
  const last = index >= story.data.pages.length - 1;
  return <div className="space-y-5" aria-busy={busy}>
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0"><h1 className="truncate text-2xl sm:text-3xl">{story.title}</h1><p className="text-sm text-muted-foreground" role="status">Page {index + 1} of {story.data.pages.length} · {busy ? "Working…" : dirty ? "Not saved yet" : "Saved"}</p></div>
      <div className="flex shrink-0 gap-1"><Button variant="ghost" size="sm" disabled={busy} onClick={async () => { if (dirty && !(await action("page"))) return; setReading(true); }}><BookOpen />Read</Button>
        <Button variant="ghost" size="sm" onClick={() => setShowMore(!showMore)} aria-expanded={showMore}><MoreHorizontal />More</Button></div>
    </div>
    {showMore && <section className="space-y-4 rounded-3xl bg-card p-4 shadow-soft animate-in fade-in">
      <div><p className="mb-2 text-sm font-semibold">Which part of the story is this page?</p><div className="flex flex-wrap gap-2">{STORY_STEPS.map((step) => <Button key={step} size="sm" variant={page.step === step ? "primary" : "outline"} aria-pressed={page.step === step} onClick={() => changePage({ step })}>{story.data.pages.some((p) => p.step === step && p.text.trim()) && <Check />}{step}</Button>)}</div></div>
      {child.age_band === "builders" && <label className="block space-y-1"><span className="text-sm font-semibold">Chapter name (optional)</span><input className={field} value={page.chapter} disabled={busy} maxLength={120} onChange={(e) => changePage({ chapter: e.target.value })} /></label>}
      <Button variant="ghost" size="sm" disabled={busy || !page.text.trim()} onClick={() => void assist("spelling")}>Spelling help</Button>
      <details><summary className="cursor-pointer font-semibold">My Story Map</summary><div className="mt-3">{mapForm}</div></details>
    </section>}
    <div className="relative">
      <textarea aria-label={`Page ${index + 1}`} className={cn(field, "min-h-48 bg-card pb-16 shadow-soft", sprouts && "text-xl")} rows={sprouts ? 4 : 8} value={page.text} disabled={busy} maxLength={20000} placeholder={HINTS[STORY_STEPS.indexOf(page.step)] + "…"} onChange={(e) => changePage({ text: e.target.value })} />
      <div className="absolute bottom-3 right-3 flex gap-2">
        <Button variant="ghost" size="icon" aria-label="Hear my page" onClick={() => speak(page.text || "Your words go here.")}><Volume2 /></Button>
        {voice.supported && <Button variant="secondary" size="icon" disabled={busy} aria-label="Say my words" className={cn(voice.listening && "animate-pulse")} onClick={voice.start}><Mic /></Button>}
      </div>
    </div>
    <button onClick={() => void assist("coach")} disabled={busy} className="mx-auto flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"><Sparkles className="size-4" />I’m stuck. Ask me a question, Bugley!</button>

    {page.image && story.urls[page.image] ? <img src={story.urls[page.image]} alt={page.description} className="aspect-square w-full rounded-3xl bg-muted object-contain shadow-soft" /> : null}
    {page.text.trim() && <details open={!page.image} className="rounded-3xl bg-card p-4 shadow-soft">
      <summary className="cursor-pointer font-display text-lg">{page.image ? "Change the picture" : "🎨 Draw a picture for this page"}</summary>
      <div className="mt-3 space-y-3">
        <textarea rows={2} maxLength={600} className={field} disabled={busy} value={page.description} placeholder="What should the picture show?" aria-label="What should the picture show?" onChange={(e) => changePage({ description: e.target.value })} />
        <div className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" disabled={busy} onClick={() => void assist("picture")}><Sparkles />Suggest from my words</Button>
          <Button disabled={busy || page.description.trim().length < 3} onClick={() => void action("illustrate")}>{busy ? "Working…" : page.image ? "Draw again · 3 glow" : "Draw it · 3 glow"}</Button></div>
      </div>
    </details>}

    <div className="flex items-center justify-between gap-2 pt-2">
      <Button variant="ghost" size="lg" disabled={!index || busy} onClick={() => void turn(index - 1)}><ArrowLeft />Page {index}</Button>
      <div className="flex gap-2">
        <Button variant="outline" size="lg" disabled={busy} onClick={async () => { if (dirty && !(await action("page"))) return; setFinishing(true); }}><Check />I’m done</Button>
        {last ? <Button variant="primary" size="lg" disabled={busy || !page.text.trim()} onClick={() => void action("add")}><Plus />New page</Button>
          : <Button variant="primary" size="lg" disabled={busy} onClick={() => void turn(index + 1)}>Page {index + 2}<ArrowRight /></Button>}
      </div>
    </div>
  </div>;
}

export function StoryReader({ story, child, onBack }: { story: Story; child: SidekickChild; onBack?: (() => void) | undefined }) {
  const [page, setPage] = useState(-1);
  const current = story.data.pages[page];
  const picture = page < 0 ? story.data.cover : current?.image;
  const words = page < 0 ? story.title : current?.text ?? "";
  useEffect(() => { if (child.age_band === "sprouts") speak(words); return () => window.speechSynthesis?.cancel(); }, [page, child.age_band, words]);
  return <div className="space-y-5">
    {story.data.finished && page < 0 && <div className="flex items-center justify-center gap-3"><Bugley stage={child.bugley_stage} expression="celebrating" glow size={80} /><h1 className="text-2xl">You made a story!</h1></div>}
    <div className="flex items-center justify-between gap-2">{onBack ? <Button variant="ghost" onClick={onBack}><ArrowLeft />Keep writing</Button> : <h2 className="break-words text-xl">{story.title}</h2>}<Button variant="ghost" size="icon" aria-label="Read aloud" onClick={() => speak(words)}><Volume2 /></Button></div>
    <article className="space-y-4 border-y border-border py-5" aria-live="polite">
      {picture && story.urls[picture] ? <img src={story.urls[picture]} alt={page < 0 ? "Story cover" : current?.description ?? "Page illustration"} className="aspect-square w-full rounded-lg bg-muted object-contain" /> : <div className="flex aspect-square items-center justify-center bg-muted"><BookOpen className="size-20 text-muted-foreground" /></div>}
      {page < 0 ? <h2 className="break-words text-center text-3xl">{words}</h2> : <>{current?.chapter && <h3 className="break-words text-xl">{current.chapter}</h3>}<p className={cn("whitespace-pre-wrap break-words leading-relaxed", child.age_band === "sprouts" ? "text-xl" : "text-lg")}>{words}</p></>}
    </article>
    <div className="flex items-center justify-between gap-3"><Button variant="outline" aria-label="Previous reading page" disabled={page < 0} onClick={() => setPage(page - 1)}><ArrowLeft /></Button><span className="text-sm">{page < 0 ? "Cover" : `${page + 1} / ${story.data.pages.length}`}</span><Button variant="outline" aria-label="Next reading page" disabled={page >= story.data.pages.length - 1} onClick={() => setPage(page + 1)}><ArrowRight /></Button></div>
    <p className="text-center text-sm text-muted-foreground">{story.data.pages.length} pages · Printing comes later.</p>
  </div>;
}