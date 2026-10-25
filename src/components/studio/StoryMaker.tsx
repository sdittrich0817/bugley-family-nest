import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Pencil, RefreshCw, Undo2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bugley } from "@/components/brand/Bugley";
import { BugleyStep } from "./BugleyStep";
import { StorySetup } from "./StorySetup";
import { speak, type BugleyChat, type SidekickChild } from "./Sidekick";
import { askBugley } from "@/lib/studio.functions";
import { createStory, editStory, getStory, planOutline } from "@/lib/story.functions";
import { OutlineScreen } from "./Outline";
import { bookFromOneShot, startChapter } from "@/lib/book.functions";
import { beatBandOf, beatQuestion, storyBeats, type Story } from "@/lib/story";
import { controlsOptions } from "@/lib/hub.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { useScrollTopOn } from "@/lib/scroll";
import { cn } from "@/lib/utils";

export function StoryMaker({ child, chat, storyId, onStory, onDirty }: { child: SidekickChild; chat: BugleyChat; storyId: string | null; onStory: (id: string) => void; onDirty: (dirty: boolean) => void }) {
  const [story, setStory] = useState<Story | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [followup, setFollowup] = useState("");
  const [titles, setTitles] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [sparks, setSparks] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [spelling, setSpelling] = useState("");
  const [pendingTitle, setPendingTitle] = useState("");
  const [showOutline, setShowOutline] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const create = useServerFn(createStory), edit = useServerFn(editStory), load = useServerFn(getStory), ask = useServerFn(askBugley), plan = useServerFn(planOutline);
  const convert = useServerFn(bookFromOneShot), chapter = useServerFn(startChapter);
  const qc = useQueryClient();
  const { data: controls } = useQuery(controlsOptions);
  const band = beatBandOf(story?.data ?? {}, child.age_band);
  const page = story?.data.pages[index];
  const ending = !!story && index >= story.data.pages.length;
  const env = getStripeEnvironment();
  useScrollTopOn(`${story?.id}-${index}-${editing}-${followup}-${ending}-${busy}-${story?.data.finished}`);
  useEffect(() => { onDirty(!!answer); }, [answer, onDirty]);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["album", child.id] }); void qc.invalidateQueries({ queryKey: ["glow", child.id] }); void qc.invalidateQueries({ queryKey: ["studio-activity"] }); };
  useEffect(() => {
    if (!storyId) return;
    let active = true;
    void load({ data: { childId: child.id, id: storyId } }).then((next) => {
      if (!active) return;
      setStory(next); setIndex(Math.max(0, next.data.pages.findIndex((p) => !p.text.trim() || !p.image)));
    }).catch((e) => toast.error(e.message));
    return () => { active = false; };
  }, [storyId, child.id, load]);
  useEffect(() => {
    if (!story || !page || story.data.finished) return;
    let active = true;
    const defaultQ = beatQuestion(band, index, story.data.map);
    const defaultSparks = storyBeats(band)[index]?.sparks ?? ["A new adventure", "A clever choice", "A happy surprise"];
    setQuestion(defaultQ); setSparks(defaultSparks); setAnswer(""); setSpelling(""); setFollowup(""); setEditing(false);
    chat.say(`Page ${index + 1}! ${defaultQ}`, []);
    void ask({ data: { childId: child.id, storyId: story.id, pageId: page.id, purpose: "step", context: "Story Maker", source: "chip", environment: env, text: "Ask the next question for this saved story page and give short idea sparks. Do not write my story." } }).then((r) => {
      if (!active || r.blocked) return;
      if (r.reply) { setQuestion(r.reply); chat.say(r.reply, []); }
      if (r.chips.length === 3) setSparks(r.chips);
    }).catch(() => {});
    return () => { active = false; };
  }, [story?.id, index]); // Saved pages remain the hidden memory; never feed sparks into page text.
  useEffect(() => {
    if (!ending || !story || story.data.finished) return;
    let active = true;
    chat.say("You made a whole adventure! What should we call it?", []);
    void ask({ data: { childId: child.id, storyId: story.id, purpose: "titles", context: "Story Maker", source: "chip", environment: env, text: "Offer three title ideas for my saved story, not story sentences." } }).then((r) => { if (active && !r.blocked) setTitles(r.chips.length === 3 ? r.chips : ["A Brave Adventure", "The Unexpected Journey", "A Wonderful Surprise"]); }).catch(() => setTitles(["A Brave Adventure", "The Unexpected Journey", "A Wonderful Surprise"]));
    return () => { active = false; };
  }, [ending, story?.id]);
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try { await task(); }
    catch (e) { const message=e instanceof Error ? e.message : "Your words are safe. Try again."; toast.error(message);const {safetyAlternatives}=await import('./SafeRetry');chat.say(message,safetyAlternatives(message)); }
    finally { setBusy(false); refresh(); }
  }
  async function paint(current: Story) {
    const next = await edit({ data: { childId: child.id, id: current.id, environment: env, action: "illustrate", pageId: current.data.pages[index]?.id, op: crypto.randomUUID() } });
    setStory(next); setEditing(false); setFollowup(""); setAnswer("");
    chat.say("Your words brought this page to life!", []);
  }
  async function saveWords(words: string) {
    if (!story || !page || !words.trim()) return;
    setAnswer(words);
    await run(async () => {
      const next = await edit({ data: { childId: child.id, id: story.id, environment: env, action: "page", page: { ...page, text: words, description: "" } } });
      setStory(next); setAnswer(""); setSpelling("");
      if (!(next.data.followups ?? []).includes(page.id)) {
        const checked = await edit({ data: { childId: child.id, id: next.id, environment: env, action: "review", pageId: page.id } });
        setStory(checked);
        if ("followup" in checked && typeof checked.followup === "string" && checked.followup.trim()) {
          setFollowup(checked.followup); chat.say(checked.followup, []); return;
        }
        await paint(checked);
      } else await paint(next);
    });
  }
  async function finish(title: string) {
    if (!story || !title.trim()) return;
    setPendingTitle(title);
    await run(async () => {
      let next = await edit({ data: { childId: child.id, id: story.id, environment: env, action: "title", title } });
      setStory(next);
      if (!next.data.cover && !next.data.bookId) {
        next = await edit({ data: { childId: child.id, id: next.id, environment: env, action: "cover" } }); setStory(next);
      }
      next = await edit({ data: { childId: child.id, id: next.id, environment: env, action: "finish" } });
      setStory(next); setPendingTitle(""); chat.say("Your choices made a whole story. You’re the author!", []);
    });
  }
  async function continueChapter() {
    if (!story) return;
    await run(async () => {
      const bookId = story.data.bookId ?? (await convert({ data: { childId: child.id, creationId: story.id, environment: env } })).id;
      const result = await chapter({ data: { childId: child.id, bookId, title: "A new chapter", newCharacterIds: [], environment: env } });
      const next = await load({ data: { childId: child.id, id: result.chapterId } });
      const mapped = await edit({ data: { childId: child.id, id: next.id, environment: env, action: "map", map: { ...story.data.map, problem: "A new adventure begins", ending: "The child decides" } } });
      setStory(mapped); setIndex(0); setTitles([]); onStory(mapped.id); chat.say(result.recap, []);
    });
  }
  if (storyId && !story) return <BugleyStep child={child} bare question="Opening your story…" choices={[]} mood="painting" allowOwnIdea={false} onChoose={() => {}} />;
  if (!story) return <StorySetup child={child} chat={chat} onCreate={async (r) => {
    const made = await create({ data: { childId: child.id, title: r.title, genre: r.genre, styleKey: r.styleKey, characterIds: r.characterIds, guided: true, length: r.length, environment: env } });
    let next = await edit({ data: { childId: child.id, id: made.id, environment: env, action: "map", map: r.map } });
    try { await plan({ data: { childId: child.id, id: next.id, kind: "story", environment: env } }); next = await load({ data: { childId: child.id, id: next.id } }); setShowOutline(true); } catch { /* planning is a bonus; the story works without it */ }
    setStory(next); setIndex(0); onStory(next.id); refresh();
  }} />;
  if (showOutline && story?.data.outline?.length) return <OutlineScreen child={child} chat={chat} outline={story.data.outline} noun="story" busy={planBusy}
    onChange={async (note) => { setPlanBusy(true); try { await plan({ data: { childId: child.id, id: story.id, kind: "story", environment: env, change: note } }); setStory(await load({ data: { childId: child.id, id: story.id } })); } catch (e) { toast.error(e instanceof Error ? e.message : "Try again."); } finally { setPlanBusy(false); } }}
    onGo={() => { setShowOutline(false); chat.say(`Page 1! ${beatQuestion(band, 0, story.data.map)}`, []); }} />;
  if (busy) return <BugleyStep child={child} bare question="Painting your adventure…" choices={[]} mood="painting" allowOwnIdea={false} onChoose={() => {}} />;
  if (story.data.finished) return <div className="space-y-6"><StoryReader story={story} child={child} /><div className="studio-bugley-cheer flex flex-wrap justify-center gap-3"><Button variant="secondary" size="lg" onClick={() => void run(async () => { const next = await edit({ data: { childId: child.id, id: story.id, environment: env, action: "reopen" } }); setStory(next); setIndex(Math.max(0, next.data.pages.length - 1)); chat.say("Your story is open again — change anything you like!", []); })}><Pencil />Keep working on it</Button><Button size="lg" onClick={() => void continueChapter()}><BookOpen />{story.data.bookId ? "Write the next chapter?" : "Want to write Chapter 2?"}</Button></div></div>;
  if (ending) return <div className="space-y-4"><BugleyStep child={child} bare question="What’s your story called?" choices={titles.map((t, i) => ({ key: `${i}`, label: t, emoji: "📖" }))} onBack={() => setIndex(story.data.pages.length - 1)} onChoose={(c) => void finish(c.label)} onOwnIdea={(t) => void finish(t)} />{pendingTitle && <Button onClick={() => void finish(pendingTitle)}>Try my cover again · 3 glow</Button>}</div>;
  if (!page) return null;
  const back = index > 0 ? () => setIndex(index - 1) : undefined;
  if (followup) return <div className="space-y-4"><BugleyStep child={child} bare question={followup} choices={[]} longAnswer initialAnswer={answer} onChoose={() => {}} onOwnIdea={(t) => void saveWords(t)} /><Button variant="secondary" onClick={() => void run(() => paint(story))}>Keep my words</Button></div>;
  if (page.text && page.image && !editing) return <div className="space-y-5">
    <p className="text-center text-sm text-muted-foreground">Page {index + 1} / {story.data.pages.length} · Saved</p>
    <OpenStoryPage story={story} index={index} child={child} />
    <div className="flex flex-wrap justify-center gap-3"><Button variant="ghost" size="sm" onClick={() => { setEditing(true); setAnswer(page.text); }}><Pencil />Change words</Button><Button variant="ghost" size="sm" onClick={() => void run(() => paint(story))}><RefreshCw />New picture · 3 glow</Button>{(story.versions[page.id] ?? 0) > 0 && <Button variant="ghost" size="sm" onClick={() => void run(async () => { const next = await edit({ data: { childId: child.id, id: story.id, environment: env, action: "undo", pageId: page.id } }); setStory(next); chat.say("Took that back! Your earlier page is here.", []); })}><Undo2 />Take that back</Button>}</div>
    <div className="flex justify-between gap-3"><Button variant="ghost" disabled={!index} onClick={back}><ArrowLeft />Back</Button><Button onClick={() => setIndex(index + 1)}>{index + 1 === story.data.pages.length ? "The end!" : "Next page"}<ArrowRight /></Button></div>
  </div>;
  return <div className="space-y-4">
    <BugleyStep child={child} bare hideHeading question={`Page ${index + 1}! ${question || beatQuestion(band, index, story.data.map)}`} choices={sparks.map((s, i) => ({ key: `${i}`, label: s, emoji: ["💡", "✨", "🌟"][i] }))} longAnswer initialAnswer={answer || (editing ? page.text : "")} step={index} steps={story.data.pages.length} onBack={back} onChoose={(c) => { setAnswer(page.text); const q = `${c.label}! What happens, in your words?`; setQuestion(q); chat.say(q, []); setEditing(true); }} onOwnIdea={(t) => void saveWords(t)} />
    {page.text && !page.image && <div className="space-y-2"><p className="whitespace-pre-wrap break-words text-lg">{page.text}</p><Button onClick={() => void run(() => paint(story))}>Paint my saved words · 3 glow</Button></div>}
    {controls?.[child.id]?.spelling_help && page.text && <Button variant="ghost" onClick={() => void run(async () => {
      const r = await ask({ data: { childId: child.id, storyId: story.id, pageId: page.id, purpose: "spelling", context: "Story Maker", source: "chip", environment: env, text: "Check up to three spellings in my saved words without rewriting any sentence." } }); setSpelling(r.reply); chat.say(r.reply, []);
    })}>Check a spelling</Button>}
    {spelling && <p className="text-sm">{spelling}</p>}
  </div>;
}

function OpenStoryPage({ story, index, child }: { story: Story; index: number; child: SidekickChild }) {
  const page = story.data.pages[index];
  if (!page) return null;
  return <article className="grid overflow-hidden rounded-lg border border-border bg-card shadow-lift md:grid-cols-2" aria-label={`Story page ${index + 1}`}>
    {page.image && story.urls[page.image] ? <img src={story.urls[page.image]} alt={page.description || "Your story illustration"} className="aspect-square w-full bg-muted object-contain" /> : <div className="flex aspect-square items-center justify-center bg-muted"><BookOpen className="size-20 text-muted-foreground" /></div>}
    <div className="flex min-w-0 flex-col justify-center gap-6 border-t border-border p-6 md:border-l md:border-t-0 sm:p-8"><p className={cn("whitespace-pre-wrap break-words leading-relaxed", child.age_band === "sprouts" ? "text-2xl" : "text-xl")}>{page.text}</p><Button variant="ghost" size="icon" aria-label="Read my page aloud" onClick={() => speak(page.text)}><Volume2 /></Button></div>
  </article>;
}

export function StoryReader({ story, child, onBack }: { story: Story; child: SidekickChild; onBack?: (() => void) | undefined }) {
  const [page, setPage] = useState(-1);
  const current = story.data.pages[page];
  const picture = page < 0 ? story.data.cover : current?.image;
  const words = page < 0 ? story.title : current?.text ?? "";
  useEffect(() => { if (child.age_band === "sprouts") speak(words); return () => window.speechSynthesis?.cancel(); }, [page, child.age_band, words]);
  return <div className="space-y-5">
    {story.data.finished && page < 0 && <div className="relative flex items-center justify-center gap-3 overflow-hidden py-5"><div aria-hidden className="pointer-events-none absolute inset-0 flex items-start justify-around">{["✦", "●", "◆", "✦", "◆", "●"].map((shape, i) => <span key={i} className={cn("text-xl motion-safe:animate-bounce", i % 2 ? "text-primary" : "text-accent-foreground")}>{shape}</span>)}</div><Bugley stage={child.bugley_stage} expression="celebrating" glow size={80} /><h1 className="text-2xl">You made a story!</h1></div>}
    <div className="flex items-center justify-between gap-2">{onBack ? <Button variant="ghost" onClick={onBack}><ArrowLeft />Keep writing</Button> : <h2 className="break-words text-xl">{story.title}</h2>}<Button variant="ghost" size="icon" aria-label="Read aloud" onClick={() => speak(words)}><Volume2 /></Button></div>
    <article className="space-y-4 border-y border-border py-5" aria-live="polite">
      {picture && story.urls[picture] ? <img src={story.urls[picture]} alt={page < 0 ? "Story cover" : current?.description ?? "Page illustration"} className="aspect-square w-full rounded-lg bg-muted object-contain" /> : <div className="flex aspect-square items-center justify-center bg-muted"><BookOpen className="size-20 text-muted-foreground" /></div>}
      {page < 0 ? <h2 className="break-words text-center text-3xl">{words}</h2> : <>{current?.chapter && <h3 className="break-words text-xl">{current.chapter}</h3>}<p className={cn("whitespace-pre-wrap break-words leading-relaxed", child.age_band === "sprouts" ? "text-xl" : "text-lg")}>{words}</p></>}
    </article>
    <div className="flex items-center justify-between gap-3"><Button variant="outline" aria-label="Previous reading page" disabled={page < 0} onClick={() => setPage(page - 1)}><ArrowLeft /></Button><span className="text-sm">{page < 0 ? "Cover" : `${page + 1} / ${story.data.pages.length}`}</span><Button variant="outline" aria-label="Next reading page" disabled={page >= story.data.pages.length - 1} onClick={() => setPage(page + 1)}><ArrowRight /></Button></div>
    <p className="text-center text-sm text-muted-foreground">{story.data.pages.length} pages · Printing comes later.</p>
  </div>;
}