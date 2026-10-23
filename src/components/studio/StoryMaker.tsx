import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Check, Mic, Plus, Save, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bugley } from "@/components/brand/Bugley";
import { CharacterCreator, StylePicker } from "./Makers";
import { speak, useVoiceInput, type BugleyChat, type SidekickChild } from "./Sidekick";
import { listCast } from "@/lib/images.functions";
import { askBugley } from "@/lib/studio.functions";
import { createStory, editStory, getStory } from "@/lib/story.functions";
import { GENRES, STORY_STEPS, EMPTY_MAP, readyToFinish, type Story, type StoryData } from "@/lib/story";
import { getStripeEnvironment } from "@/lib/stripe";
import { cn } from "@/lib/utils";

const MAP_LABELS = { hero: "Who is the hero?", want: "What do they want most?", place: "Where does it happen?", problem: "What’s standing in the way?", ending: "How might it end?" };
const field = "w-full rounded-lg border-2 border-border bg-background p-3 text-foreground outline-none focus:border-primary";
const HINTS = ["Meet your hero and their world", "Until one day…", "Because of that…", "Everything changes…", "Until finally…"];

export function StoryMaker({ child, chat, storyId, onStory, onDirty }: { child: SidekickChild; chat: BugleyChat; storyId: string | null; onStory: (id: string) => void; onDirty: (dirty: boolean) => void }) {
  const [story, setStory] = useState<Story | null>(null);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<StoryData["genre"]>("Adventure");
  const [style, setStyle] = useState("storybook");
  const [picked, setPicked] = useState<string[]>([]);
  const [makingCharacter, setMakingCharacter] = useState(false);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [reading, setReading] = useState(false);
  const [coverDescription, setCoverDescription] = useState("");
  const [mapDraft, setMapDraft] = useState({ ...EMPTY_MAP });
  const [mapEditing, setMapEditing] = useState(true);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  const create = useServerFn(createStory), edit = useServerFn(editStory), load = useServerFn(getStory), ask = useServerFn(askBugley);
  const qc = useQueryClient();
  const { data: cast = [] } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
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
  async function action(kind: "map" | "page" | "add" | "illustrate" | "cover" | "finish") {
    if (!story || busy) return;
    setBusy(true);
    try {
      let current = story;
      if (dirty && kind !== "map" && page) current = await edit({ data: { childId: child.id, id: story.id, environment: getStripeEnvironment(), action: "page", page } });
      const next = kind === "page" && dirty ? current : await edit({ data: { childId: child.id, id: current.id, environment: getStripeEnvironment(), action: kind, map: kind === "map" ? mapDraft : undefined, page: kind === "page" ? page : undefined, pageId: page?.id, description: coverDescription } });
      adopt(next);
      if (kind === "map") { setMapEditing(false); chat.say("You’ve made a world of your own! What happens first? Your call!"); }
      if (kind === "add") setIndex(next.data.pages.length - 1);
      if (kind === "finish") { setReading(true); setIndex(0); chat.say("You kept going and made a whole story! Your choices brought it to life."); }
      toast.success(kind === "finish" ? "Your story is in your album!" : "Saved!");
      if (kind === "page" && page?.text.trim()) {
        try {
          const response = await ask({ data: { childId: child.id, storyId: story.id, pageId: page.id, purpose: "coach", context: "Story Maker", source: "chip", environment: getStripeEnvironment(), text: "Quietly check my saved page for a specific continuity conflict. Stay quiet if it fits." } });
          if (response.reply.trim()) chat.say(response.reply, response.chips);
        } catch { toast("Your page is saved. Bugley couldn’t check continuity right now."); }
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Your words are still here. Try saving again."); }
    finally { setBusy(false); refresh(); }
  }
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
  if (makingCharacter) return <div className="space-y-4"><Button variant="ghost" onClick={() => setMakingCharacter(false)}><ArrowLeft />Story Maker</Button><CharacterCreator child={child} chat={chat} onDone={() => setMakingCharacter(false)} /></div>;
  if (storyId && !story) return <div className="flex min-h-64 flex-col items-center justify-center gap-4"><Bugley expression="thinking" stage={child.bugley_stage} size={100} /><p>Opening your story…</p></div>;
  if (!story) return <div className="space-y-6">
    <h1 className="text-3xl">Story Maker</h1>
    <label className="block space-y-2 font-semibold"><span>Your story’s title</span><input className={field} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Give it a made-up name" /></label>
    <section className="space-y-3"><h2 className="text-xl">What kind of story?</h2><div className="flex flex-wrap gap-2">{GENRES.map((g) => <Button key={g} variant={genre === g ? "primary" : "outline"} size="sm" aria-pressed={genre === g} onClick={() => setGenre(g)}>{g}</Button>)}</div></section>
    <section className="space-y-3"><h2 className="text-xl">Who’s in it?</h2><div className="flex flex-wrap gap-3">{cast.map((c) => <Button key={c.id} variant={picked.includes(c.id) ? "primary" : "outline"} aria-pressed={picked.includes(c.id)} className="h-auto max-w-32 flex-col whitespace-normal p-2" onClick={() => setPicked(picked.includes(c.id) ? picked.filter((id) => id !== c.id) : [...picked, c.id])}><img src={c.url} alt="" className="size-20 rounded-lg object-cover" /><span className="break-words">{c.title}</span></Button>)}<Button variant="outline" onClick={() => setMakingCharacter(true)}><Plus />Create a character</Button></div></section>
    <section className="space-y-3"><h2 className="text-xl">Your story’s art style</h2><StylePicker value={style} onChange={setStyle} /></section>
    <Button disabled={busy || !title.trim()} onClick={async () => { setBusy(true); try { const next = await create({ data: { childId: child.id, title, genre, styleKey: style, characterIds: picked, environment: getStripeEnvironment() } }); adopt(next); onStory(next.id); chat.say("What does your hero want most? Your call!"); } catch (e) { toast.error(e instanceof Error ? e.message : "We couldn’t start your story."); } finally { setBusy(false); refresh(); } }}><BookOpen />{busy ? "Starting…" : "Start my story"}</Button>
  </div>;
  if (reading) return <StoryReader story={story} child={child} onBack={!story.data.finished ? () => setReading(false) : undefined} />;
  return <div className="space-y-6" aria-busy={busy}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="break-words text-3xl">{story.title}</h1><span className="text-sm text-muted-foreground" role="status">{busy ? "Working…" : dirty ? "Unsaved changes" : "Saved"}</span></div>
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><span>{story.data.genre}</span><span>· {story.data.styleKey.replaceAll("_", " ")}</span><span>· {story.data.pages.length} pages</span><Button variant="ghost" size="sm" disabled={dirty || busy} onClick={() => setReading(true)}><BookOpen />Read</Button></div>
    <section className="space-y-3 border-y border-border py-4"><div className="flex items-center justify-between gap-2"><h2 className="text-xl">My Story Map</h2><Button variant="ghost" size="sm" disabled={busy || dirty} onClick={() => { setMapEditing(!mapEditing); setMapDraft(story.data.map); }}> {mapEditing ? "Close" : "Edit"}</Button></div>
      {mapEditing ? <><div className="grid gap-3 sm:grid-cols-2">{Object.entries(MAP_LABELS).map(([key, label]) => <label key={key} className="space-y-1 text-sm font-semibold"><span>{label}</span><textarea rows={2} maxLength={600} disabled={busy} className={field} value={mapDraft[key as keyof typeof mapDraft]} onChange={(e) => { setMapDraft({ ...mapDraft, [key]: e.target.value }); setDirty(true); }} /></label>)}</div><div className="flex flex-wrap gap-2"><Button disabled={busy || Object.values(mapDraft).some((v) => !v.trim())} onClick={() => void action("map")}><Save />Save Story Map</Button>{sprouts && mapVoice.supported && <Button variant="secondary" disabled={busy} aria-label="Dictate next empty Story Map answer" onClick={mapVoice.start}><Mic />{mapVoice.listening ? "Listening…" : "Say my answer"}</Button>}<Button variant="ghost" onClick={() => speak(Object.values(MAP_LABELS).join(" "))}><Volume2 />Hear questions</Button></div></>
      : <dl className="grid gap-3 sm:grid-cols-2">{Object.entries(MAP_LABELS).map(([key, label]) => <div key={key}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words font-semibold">{story.data.map[key as keyof typeof mapDraft]}</dd></div>)}</dl>}
    </section>
    {!mapEditing && page && <>
      <ol className="flex flex-wrap items-center gap-2" aria-label="Story path">{STORY_STEPS.map((step, i) => <li key={step} className="flex items-center gap-2"><Button size="sm" variant={page.step === step ? "primary" : "outline"} disabled={busy} aria-pressed={page.step === step} onClick={() => { changePage({ step }); if ([1, 3, 4].includes(i)) chat.say(i === 1 ? "What gets in your hero’s way? Your call!" : i === 3 ? "What changes everything for your hero? Your call!" : "How has your hero changed? Your call!"); }}><span className="flex size-5 items-center justify-center rounded-full bg-secondary text-secondary-foreground">{story.data.pages.some((p) => p.step === step && p.text.trim()) ? <Check /> : i + 1}</span>{step}</Button>{i < 4 && <ArrowRight className="size-3 text-muted-foreground" />}</li>)}</ol>
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2"><h2 className="text-2xl">Page {index + 1}</h2><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Previous writing page" disabled={!index || dirty || busy} onClick={() => setIndex(index - 1)}><ArrowLeft /></Button><Button variant="ghost" size="icon" aria-label="Next writing page" disabled={index >= story.data.pages.length - 1 || dirty || busy} onClick={() => setIndex(index + 1)}><ArrowRight /></Button></div></div>
        {child.age_band === "builders" && <label className="block space-y-1"><span className="text-sm font-semibold">Chapter (optional)</span><input className={field} value={page.chapter} disabled={busy} maxLength={120} onChange={(e) => changePage({ chapter: e.target.value })} /></label>}
        <label className="block space-y-2"><span className="font-semibold">{HINTS[STORY_STEPS.indexOf(page.step)]}</span><textarea className={cn(field, "min-h-48", sprouts && "text-xl")} rows={sprouts ? 4 : 8} value={page.text} disabled={busy} maxLength={20000} placeholder={sprouts ? "Your one or two sentences…" : child.age_band === "builders" ? "Your next page…" : "Your short paragraph…"} onChange={(e) => changePage({ text: e.target.value })} /></label>
        <div className="flex flex-wrap gap-2"><Button disabled={busy || !dirty} onClick={() => void action("page")}><Save />Save page</Button>{sprouts && voice.supported && <Button variant="secondary" disabled={busy} aria-label="Dictate story page" onClick={voice.start}><Mic />{voice.listening ? "Listening…" : "Say my words"}</Button>}<Button variant="ghost" onClick={() => speak(page.text || HINTS[STORY_STEPS.indexOf(page.step)] || "Your words go here.")}><Volume2 />Hear page</Button><Button variant="ghost" disabled={busy} onClick={() => void assist("coach")}><Sparkles />Ask Bugley</Button><Button variant="ghost" disabled={busy || !page.text.trim()} onClick={() => void assist("spelling")}>Spelling help</Button></div>
        <label className="block space-y-2"><span className="font-semibold">What should the picture show?</span><textarea rows={3} maxLength={600} className={field} disabled={busy} value={page.description} onChange={(e) => changePage({ description: e.target.value })} /></label>
        <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy || !page.text.trim()} className="h-auto min-h-11 whitespace-normal py-2" onClick={() => void assist("picture")}><Sparkles />Bugley, suggest a picture from my words</Button><Button disabled={busy || !page.text.trim() || page.description.trim().length < 3} onClick={() => void action("illustrate")}>{busy ? "Working…" : page.image ? "Draw again · 3 glow" : "Illustrate · 3 glow"}</Button></div>
        {page.image && story.urls[page.image] && <img src={story.urls[page.image]} alt={page.description} className="aspect-square w-full rounded-lg object-contain bg-muted" />}
        <Button variant="outline" disabled={busy} onClick={() => void action("add")}><Plus />Add a page</Button>
      </section>
{!story.data.bookId &&       <section className="space-y-3 border-t border-border pt-6"><h2 className="text-2xl">The cover</h2><label className="block space-y-2"><span className="text-sm font-semibold">Describe the cover picture</span><textarea rows={2} maxLength={600} className={field} disabled={busy} value={coverDescription} onChange={(e) => setCoverDescription(e.target.value)} /></label><Button variant="secondary" disabled={busy || coverDescription.trim().length < 3} onClick={() => void action("cover")}>Draw cover · 3 glow</Button>{story.data.cover && <div className="relative"><img src={story.urls[story.data.cover]} alt="Story cover" className="aspect-square w-full rounded-lg object-contain bg-muted" /><p className="mt-2 break-words text-center font-display text-2xl">{story.title}</p></div>}<div><Button disabled={busy || dirty || !readyToFinish(story.data)} onClick={() => void action("finish")}><Check />Finish my story</Button></div><p className="text-sm text-muted-foreground">{story.data.pages.length} {story.data.pages.length === 1 ? "page" : "pages"} · Printing comes later. Keep your story growing.</p></section>
    </>}
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