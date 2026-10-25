import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Check, History, Mic, Paintbrush, Plus, RefreshCw, Save, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Bugley } from "@/components/brand/Bugley";
import { getWorkspace, startWorkspace, updateWorkspace, interpretWorkspace, workspaceHistory, restoreWorkspace } from "@/lib/workspace.functions";
import { paintWorkspacePicture } from "@/lib/workspace-picture.functions";
import { listCast, stylesOptions, upgradePicture } from "@/lib/images.functions";
import { editComic } from "@/lib/comic.functions";
import { editStory, planOutline } from "@/lib/story.functions";
import { bookFromOneShot } from "@/lib/book.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { STYLE_THUMBS } from "@/lib/style-thumbs";
import { type OutputKind, type WorkspaceProject } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { PanelCanvas, ComicReader } from "./ComicMaker";
import { StoryReader } from "./StoryMaker";
import { WorkspaceCharacter } from "./WorkspaceCharacter";
import { useVoiceInput, type BugleyChat, type SidekickChild } from "./Sidekick";

type Activity = "characters" | "look" | "history" | "idea" | null;
export function CreativeWorkspace({ child, kind, projectId, chat, onProject, onBook, onDirty }: { child: SidekickChild; kind: OutputKind; projectId: string | null; chat: BugleyChat; onProject: (id: string) => void; onBook: (id: string) => void; onDirty: (dirty: boolean) => void }) {
  const [project, setProject] = useState<WorkspaceProject | null>(null);
  const projectRef = useRef<WorkspaceProject | null>(null);
  const [idea, setIdea] = useState(""); const [title, setTitle] = useState("");
  const [selected, setSelected] = useState(0); const [words, setWords] = useState(""); const [dialogue, setDialogue] = useState("");
  const [activity, setActivity] = useState<Activity>(null); const [newCharacter, setNewCharacter] = useState(false);
  const [busy, setBusy] = useState(""); const [note, setNote] = useState(""); const [interpreting, setInterpreting] = useState(false);
  const [history, setHistory] = useState<{ id: string; created_at: string }[]>([]);
  const [pendingLayers, setPendingLayers] = useState<any[] | null>(null);
  const [outlineDraft, setOutlineDraft] = useState<string[]>([]);
  const requestId = useRef(crypto.randomUUID()); const running = useRef(false);
  const start = useServerFn(startWorkspace), load = useServerFn(getWorkspace), update = useServerFn(updateWorkspace), interpret = useServerFn(interpretWorkspace);
  const comicEdit = useServerFn(editComic), storyEdit = useServerFn(editStory), plan = useServerFn(planOutline), paintPicture = useServerFn(paintWorkspacePicture), upgrade = useServerFn(upgradePicture);
  const readHistory = useServerFn(workspaceHistory), restore = useServerFn(restoreWorkspace), book = useServerFn(bookFromOneShot);
  const { data: cast = [], refetch: refreshCast } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
  const { data: styles = [] } = useQuery(stylesOptions); const qc = useQueryClient(); const env = getStripeEnvironment();
  const noun = kind === "comic" ? "comic" : kind === "story" ? "storybook" : "picture";
  const accept = (p: WorkspaceProject) => { projectRef.current = p; setProject(p); setTitle(p.title); setOutlineDraft(p.details.outline ?? []); };
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["album", child.id] }); void qc.invalidateQueries({ queryKey: ["glow", child.id] }); };
  const identity = (p: WorkspaceProject) => ({ childId: child.id, id: p.id, environment: env });
  async function reload() { const p = projectRef.current; if (!p) return; accept(await load({ data: { childId: child.id, id: p.id } })); }
  useEffect(() => { if (!projectId) return; let active = true; void load({ data: { childId: child.id, id: projectId } }).then(p => { if (active) { accept(p); setIdea(p.workspace.originalIdea); } }).catch(e => setNote(e.message)); return () => { active = false; }; }, [projectId, child.id]);
  useEffect(() => { chat.say(`Your ${noun}, your ideas. What should we make?`, []); }, [kind]);
  const items: any[] = kind === "comic" ? project?.details.pages?.flatMap((p: any) => p.panels.map((panel: any) => ({ ...panel, pageId: p.id }))) ?? [] : project?.details.pages ?? [];
  const current = items[selected];
  useEffect(() => { setWords(kind === "comic" ? current?.description ?? "" : current?.text ?? ""); setDialogue(current?.layers?.find((l: any) => l.type === "speech")?.text ?? ""); }, [current?.id, current?.description, current?.text, project?.updatedAt]);
  useEffect(() => setPendingLayers(null), [current?.id]);
  const changed = !!project && (words !== (kind === "comic" ? current?.description ?? "" : current?.text ?? "") || dialogue !== (current?.layers?.find((l: any) => l.type === "speech")?.text ?? ""));
  useEffect(() => { onDirty(changed); }, [changed, onDirty]);
  const voice = useVoiceInput(t => project ? setWords(v => `${v} ${t}`.trim()) : setIdea(v => `${v} ${t}`.trim().slice(0, 600)));
  async function run(label: string, task: () => Promise<void>) {
    if (running.current) return; running.current = true; setBusy(label); setNote("");
    try { await task(); } catch(e) { setNote(e instanceof Error ? e.message : "Your ideas are still here. Try again."); }
    finally { running.current = false; setBusy(""); refresh(); }
  }
  async function patch(data: Record<string, unknown>) {
    const p = projectRef.current; if (!p) return undefined;
    const next = await update({ data: { ...identity(p), updatedAt: p.updatedAt, ...data } }); accept(next); return next;
  }
  async function submitIdea() {
    await run("Saving your idea…", async () => {
      const t0 = performance.now();
      const p = await start({ data: { childId: child.id, id: requestId.current, kind, idea, environment: env } }); accept(p); onProject(p.id);
      console.info(`[studio-timing] workspace safe-save ${Math.round(performance.now() - t0)}ms`);
      if (kind !== "picture") {
        setInterpreting(true);
        void interpret({ data: { childId: child.id, id: p.id } }).then(next => { if (projectRef.current?.id === next.id) accept(next); }).catch(() => setNote("Your idea is saved. You can choose characters or keep writing." )).finally(() => setInterpreting(false));
      }
    });
  }
  async function saveWords() {
    const p = projectRef.current; if (!p || !current) return;
    if (p.details.finished) {
      if (kind === "comic") await comicEdit({ data: { ...identity(p), action: "reopen" } }); else await storyEdit({ data: { ...identity(p), action: "reopen" } });
    }
    if (kind === "comic") {
      if (pendingLayers) { await comicEdit({ data: { ...identity(p), action: "layers", pageId: current.pageId, panelId: current.id, layers: pendingLayers } }); setPendingLayers(null); }
      if (words.trim() && words !== current.description) await comicEdit({ data: { ...identity(p), action: "panel", pageId: current.pageId, panelId: current.id, description: words } });
      if (dialogue !== (current.layers.find((l: any) => l.type === "speech")?.text ?? "") || !current.dialogueDone) await comicEdit({ data: { ...identity(p), action: "dialogue", pageId: current.pageId, panelId: current.id, text: dialogue } });
    } else if (words.trim()) await storyEdit({ data: { ...identity(p), action: "page", page: { id: current.id, step: current.step, text: words, description: words === current.text ? current.description : "", chapter: current.chapter ?? "" } } });
    await reload(); onDirty(false);
  }
  useEffect(() => { if (!changed || busy || interpreting || !words.trim()) return; const timer = setTimeout(() => void run("Saving…", saveWords), 1600); return () => clearTimeout(timer); }, [words, dialogue, changed, busy, interpreting]);
  async function draw() {
    await run("Painting this scene…", async () => {
      await saveWords(); const p = projectRef.current; if (!p || !current) return;
      if (kind === "comic") await comicEdit({ data: { ...identity(p), action: "final", pageId: current.pageId, panelId: current.id, op: crypto.randomUUID() } });
      else await storyEdit({ data: { ...identity(p), action: "illustrate", pageId: current.id, op: crypto.randomUUID() } });
      await reload();
    });
  }
  async function select(at: number) { if (busy) return; await run("Saving…", async () => { if (changed) await saveWords(); setSelected(at); }); }
  const phase = project?.details.finished || project?.details.mode === "final" ? "finish" : project?.workspace.activity ?? "imagine";
  const selectedCast: string[] = project?.details.characterIds ?? project?.details.characters ?? [];
  const sameLook = cast.filter(c => c.styleKey === project?.styleKey && (c as any).details?.dna);
  return <section className="space-y-5">
    <div className="flex items-center gap-3"><Bugley stage={child.bugley_stage} expression={busy ? "thinking" : "curious"} size={48} /><p className="min-w-0 text-sm font-semibold">{chat.messages.at(-1)?.from === "bugley" ? chat.messages.at(-1)?.text : `Your ${noun}, your ideas.`}</p></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="min-w-0 break-words text-3xl">{project?.title ?? `My ${noun}`}</h1><div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground" role="status">{busy || (interpreting ? "Your idea is saved. Meeting your characters…" : project ? changed ? "Unsaved words" : "Saved" : "")}</div></div>
    <nav aria-label="Creative journey" className="flex flex-wrap gap-2">{(["imagine", "make", "finish"] as const).map(a => <Button key={a} variant={phase === a ? "secondary" : "ghost"} aria-pressed={phase === a} disabled={!!busy || interpreting} onClick={() => { if (!project) return; void run("Saving…", async () => { if (changed) await saveWords(); await patch({ activity: a }); }); }} className="capitalize">{a === "finish" && <Check className="size-4" />}{a}</Button>)}</nav>
    {note && <div role="alert" className="flex flex-wrap items-center gap-2 border-l-4 border-destructive pl-3"><p className="min-w-0 flex-1 text-destructive">{note}</p>{project && <Button variant="ghost" onClick={() => void run("Opening saved work…", reload)}><RefreshCw />Reopen saved work</Button>}</div>}
    {!project ? <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="space-y-4"><h2 className="text-2xl">What’s your {noun} about?</h2><Textarea autoFocus aria-label={`Your ${noun} idea`} rows={5} maxLength={600} placeholder="A purple dragon named Pickles who is scared of flying…" value={idea} onChange={e => setIdea(e.target.value)} className={cn(child.age_band === "sprouts" && "text-xl")} /><div className="flex gap-2"><Button disabled={!!busy || idea.trim().length < 3} onClick={() => void submitIdea()}><Sparkles />Start my {noun}</Button>{voice.supported && <Button variant="outline" size="icon" aria-label="Say your idea" onClick={voice.start}><Mic /></Button>}</div></div>
      <div className="grid min-h-64 grid-cols-2 gap-3 border-2 border-dashed border-border p-4">{kind === "picture" ? <div className="col-span-2 flex items-center justify-center"><Paintbrush className="size-20 text-primary" /></div> : Array.from({ length: 4 }, (_, i) => <div key={i} className="flex aspect-[4/3] items-center justify-center border border-border bg-card"><span className="font-display text-2xl text-muted-foreground">{i + 1}</span></div>)}{idea && <p className="col-span-2 whitespace-pre-wrap break-words font-semibold">{idea}</p>}</div>
    </div> : <>
      <div className="flex flex-wrap gap-2 border-y border-border py-3"><Button data-workspace-characters variant="ghost" disabled={!!busy || interpreting} onClick={() => { setActivity("characters"); setNewCharacter(false); }}><Users />Characters{selectedCast.length ? ` · ${selectedCast.length}` : ""}</Button><Button variant="ghost" disabled={!!busy || interpreting} onClick={() => setActivity("look")}><Paintbrush />Look & length</Button><Button variant="ghost" onClick={() => { setIdea(project.workspace.originalIdea); setActivity("idea"); }}>My idea</Button><Button variant="ghost" disabled={!!busy} onClick={() => { setActivity("history"); void readHistory({ data: { childId: child.id, id: project.id } }).then(setHistory).catch(e => setNote(e.message)); }}><History />Versions</Button></div>
      {phase === "finish" ? <div className="space-y-4">{kind === "comic" ? <ComicReader comic={{ id: project.id, title: project.title, updatedAt: project.updatedAt, data: project.details, urls: project.urls, versions: {} }} child={child} /> : kind === "story" ? <StoryReader story={{ id: project.id, title: project.title, updatedAt: project.updatedAt, data: project.details, urls: project.urls, versions: {} }} child={child} /> : project.images[0] && <img src={project.urls[project.images[0]]} alt={project.workspace.originalIdea} className="mx-auto max-h-[65vh] w-full object-contain" />}
        <label className="block space-y-2 font-semibold">Title<Input aria-label="Project title" value={title} maxLength={80} onChange={e => setTitle(e.target.value)} /></label><div className="flex flex-wrap gap-2"><Button disabled={!!busy} onClick={() => void run("Saving title…", async () => { await patch({ title }); })}><Save />Save title</Button><Button variant="secondary" disabled={!!busy} onClick={() => void run("Opening your work…", async () => { if (project.details.finished && kind !== "picture") { if (kind === "comic") await comicEdit({ data: { ...identity(project), action: "reopen" } }); else await storyEdit({ data: { ...identity(project), action: "reopen" } }); await reload(); } await patch({ activity: "make" }); })}>Keep making</Button>{kind !== "picture" && <Button variant="outline" disabled={!!busy} onClick={() => void run("Opening your book…", async () => { const result = await book({ data: { childId: child.id, creationId: project.id, environment: env } }); onBook(result.id); })}><BookOpen />Make a book</Button>}</div>
        {kind !== "picture" && !project.details.finished && <div className="flex flex-wrap gap-2">{!project.details.cover && !project.details.bookId && <Button disabled={!!busy} onClick={() => void run("Painting your cover…", async () => { if (kind === "comic") await comicEdit({ data: { ...identity(project), action: "cover", op: crypto.randomUUID() } }); else await storyEdit({ data: { ...identity(project), action: "cover", op: crypto.randomUUID() } }); await reload(); })}>Draw cover · 3 Glow</Button>}<Button disabled={!!busy} onClick={() => void run("Saving your finished creation…", async () => { if (kind === "comic") await comicEdit({ data: { ...identity(project), action: "finish" } }); else await storyEdit({ data: { ...identity(project), action: "finish" } }); await reload(); })}><Check />Finish & save</Button></div>}
      </div> : kind === "picture" ? <div className="space-y-5"><div className="flex min-h-64 items-center justify-center border-2 border-dashed border-border bg-card p-4">{project.images[0] ? <img src={project.urls[project.images[0]]} alt={project.workspace.originalIdea} className="max-h-[65vh] w-full object-contain" /> : <Paintbrush className="size-20 text-primary" />}</div><p className="whitespace-pre-wrap break-words font-semibold">{project.workspace.originalIdea}</p><div className="flex flex-wrap gap-3"><Button disabled={!!busy} onClick={() => void run("Painting your preview…", async () => { accept(await paintPicture({ data: { ...identity(project), op: crypto.randomUUID() } })); })}>{project.images.length ? "New preview · 1 Glow" : "Draw preview · 1 Glow"}</Button>{project.details.mode === "sketch" && <Button disabled={!!busy} onClick={() => void run("Finishing your picture…", async () => { const result = await upgrade({ data: { childId: child.id, previewId: project.id, environment: env } }); if (!result.ok) throw new Error(result.reply); await reload(); })}><Sparkles />Make it awesome · 2 more Glow</Button>}</div></div> : <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-4"><div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3">{items.map((item, i) => <Button key={item.id} variant="outline" aria-label={`${kind === "comic" ? "Panel" : "Page"} ${i + 1}`} aria-pressed={selected === i} disabled={!!busy} onClick={() => void select(i)} className={cn("h-auto w-32 shrink-0 min-w-0 flex-col overflow-hidden rounded-lg whitespace-normal p-2 sm:w-auto", selected === i && "border-primary ring-2 ring-primary")}><div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">{item.image ? <img src={project.urls[item.image]} alt={item.description || item.text || `Scene ${i + 1}`} className="size-full object-cover" /> : <span className="flex size-full items-center justify-center p-2 text-xs leading-snug">{item.description || item.text || project.details.outline?.[i] || `${kind === "comic" ? "Panel" : "Page"} ${i + 1}`}</span>}</div><span className="text-sm">{kind === "comic" ? "Panel" : "Page"} {i + 1}{item.image ? " ✓" : ""}</span></Button>)}</div>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={!!busy || interpreting} onClick={() => void run("Planning your storyboard…", async () => { await plan({ data: { ...identity(project), kind: kind as "comic" | "story" } }); await reload(); await patch({ outlineApproved: false }); })}><Sparkles />{project.details.outline?.length ? "Try another plan" : "Suggest a storyboard"}</Button>{project.details.outline?.length > 0 && <Button variant="outline" disabled={!!busy} onClick={() => void run("Saving your storyboard…", async () => { if (JSON.stringify(outlineDraft) !== JSON.stringify(project.details.outline)) await patch({ outline: outlineDraft }); await patch({ outlineApproved: true, activity: "make" }); })}><Check />{project.workspace.outlineApproved ? "Plan approved" : "Approve my plan"}</Button>}</div>
          {project.details.outline?.length > 0 && <ol className="space-y-2">{outlineDraft.map((line, i) => <li key={i} className="flex items-center gap-2"><span className="text-sm font-semibold text-muted-foreground">{i + 1}</span><Input aria-label={`Storyboard idea ${i + 1}`} value={line} maxLength={200} onChange={e => setOutlineDraft(v => v.map((x, at) => at === i ? e.target.value : x))} /></li>)}</ol>}
        </div>
        <div className="min-w-0 space-y-4">{current && <><h2 className="text-2xl">{kind === "comic" ? "Panel" : "Page"} {selected + 1}</h2>{current.image && (kind === "comic" ? <PanelCanvas panel={{ ...current, layers: pendingLayers ?? current.layers }} url={project.urls[current.image]} aspect={1.25} editable selected={null} onSelect={() => {}} onLayers={setPendingLayers} /> : <img src={project.urls[current.image]} alt={current.text} className="max-h-80 w-full object-contain" />)}<label className="block space-y-2 font-semibold">{kind === "comic" ? "What happens here?" : "Your words"}<Textarea aria-label={kind === "comic" ? "Scene words" : "Page words"} rows={5} maxLength={kind === "comic" ? 600 : 20000} value={words} onChange={e => setWords(e.target.value)} className={cn(child.age_band === "sprouts" && "text-xl")} /></label>{kind === "comic" && <label className="block space-y-2 font-semibold">What do they say?<Textarea aria-label="Dialogue" rows={2} maxLength={200} value={dialogue} onChange={e => setDialogue(e.target.value)} /></label>}<div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={!!busy || interpreting || !words.trim()} onClick={() => void run("Saving words…", saveWords)}><Save />Save words</Button>{voice.supported && <Button variant="outline" size="icon" aria-label="Say your scene" onClick={voice.start}><Mic /></Button>}<Button disabled={!!busy || interpreting || !words.trim() || (!!project.details.outline?.length && !project.workspace.outlineApproved)} onClick={() => void draw()}><Paintbrush />{current.image ? "Redraw" : "Draw"} · 3 Glow</Button></div>{pendingLayers && <Button variant="secondary" disabled={!!busy} onClick={() => void run("Saving bubbles…", saveWords)}>Save bubble positions</Button>}<Button variant="ghost" disabled={chat.busy} onClick={() => void chat.send(`Help me think about ${kind === "comic" ? "panel" : "page"} ${selected + 1}. Give short idea sparks, not story sentences.`, "chip")}><Sparkles />Bugley, a little help?</Button></>}
        </div>
      </div>}
    </>}
    <Dialog open={!!activity} onOpenChange={open => { if (!open) { setActivity(null); setNewCharacter(false); } }}><DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{project?.title} · {activity === "characters" ? "Characters" : activity === "look" ? "Look & length" : activity === "history" ? "Earlier versions" : "My idea"}</DialogTitle><DialogDescription className="sr-only">Edit inside your current creation.</DialogDescription></DialogHeader>
      {project && activity === "characters" && (newCharacter ? <><Button variant="ghost" onClick={() => setNewCharacter(false)}><ArrowLeft />My characters</Button><WorkspaceCharacter key={project.id} child={child} project={project} onSave={async draft => { try { return await patch({ characterDraft: draft }); } catch(e) { setNote(e instanceof Error ? e.message : "Try again."); throw e; } }} onAttach={async id => { await refreshCast(); const replaces = selectedCast.find(old => cast.find(c => c.id === old)?.title === projectRef.current?.workspace.characterDraft?.name);
 await patch({ characterIds: [...selectedCast.filter(old => old !== replaces), id], characterDraft: null, activity: "make" }); setNewCharacter(false); setActivity(null); refresh(); }} /></> : <div className="space-y-4"><div className="grid grid-cols-3 gap-2">{sameLook.map(c => <Button key={c.id} variant={selectedCast.includes(c.id) ? "secondary" : "outline"} disabled={!!busy} className="h-auto min-w-0 flex-col whitespace-normal p-2" onClick={() => void run("Saving your cast…", async () => { const ids = selectedCast.includes(c.id) ? selectedCast.filter(id => id !== c.id) : kind === "picture" ? [c.id] : [...selectedCast, c.id]; await patch({ characterIds: ids, activity: "make" }); })}><img src={c.url} alt={c.title} className="aspect-square w-full object-contain" /><span>{c.title}</span></Button>)}</div><Button disabled={selectedCast.length >= (kind === "picture" ? 1 : 3)} onClick={() => setNewCharacter(true)}><Plus />Add a character</Button>{selectedCast.map(id => { const c = cast.find(c => c.id === id); return c ? <Button key={id} variant="ghost" onClick={() => void run("Opening character details…", async () => { await patch({ characterDraft: { name: c.title, kind: c.details?.type ?? "", special: (c.details as any)?.special ?? "", personality: c.details?.personality ?? "", options: [] } }); setNewCharacter(true); })}>New appearance for {c.title}</Button> : null; })}</div>)}
      {project && activity === "look" && <div className="space-y-4"><div className="grid grid-cols-3 gap-2">{styles.map(s => <Button variant={project.styleKey === s.key ? "secondary" : "outline"} key={s.key} disabled={!!busy} onClick={() => void run("Saving your look…", async () => { await patch({ styleKey: s.key }); })} className="h-auto min-w-0 flex-col whitespace-normal p-2">{STYLE_THUMBS[s.key] && <img src={STYLE_THUMBS[s.key]} alt="" className="aspect-square w-full object-cover" />}<span>{s.name}</span></Button>)}</div>{kind !== "picture" && <div className="flex flex-wrap gap-2">{(["short", "medium", "long"] as const).map(l => <Button key={l} variant={project.details.length === l ? "secondary" : "outline"} disabled={!!busy} onClick={() => void run("Saving your length…", async () => { await patch({ length: l }); setSelected(0); })}>{l === "short" ? "Little" : l === "medium" ? "Middle" : "Big"}</Button>)}</div>}</div>}
      {project && activity === "idea" && <div className="space-y-3"><Textarea aria-label="Original project idea" value={idea} maxLength={600} rows={5} onChange={e => setIdea(e.target.value)} /><Button disabled={!!busy || idea.trim().length < 3} onClick={() => void run("Saving your idea…", async () => { await patch({ idea }); setActivity(null); })}>Save my idea</Button></div>}
      {project && activity === "history" && <div className="space-y-2">{history.length ? history.map(v => <div key={v.id} className="flex items-center justify-between gap-2 border-b border-border py-2"><span className="text-sm">{new Date(v.created_at).toLocaleString()}</span><Button variant="outline" disabled={!!busy} onClick={() => void run("Restoring your earlier work…", async () => { const p = projectRef.current; if (!p) return; accept(await restore({ data: { ...identity(p), updatedAt: p.updatedAt, versionId: v.id } })); setActivity(null); setSelected(0); })}>Restore</Button></div>) : <p>No earlier versions yet.</p>}{history.length >= 30 && <Button variant="ghost" onClick={() => { const last = history.at(-1); if (last) void readHistory({ data: { childId: child.id, id: project.id, before: last.created_at } }).then(rows => setHistory(v => [...v, ...rows])); }}>Older versions</Button>}</div>}
    </DialogContent></Dialog>
  </section>;
}