// A3.4.1 "Start with my idea" (Explorers and Builders). The idea screen, the idea card and the cast-and-plan screen.
// The child's words are saved exactly as typed and shown back exactly; Bugley never rewrites or expands them.
// No microphone, no AI writing and no Glow on these screens.
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, Lightbulb, Paintbrush, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BugleyCompanion } from "./BugleyCompanion";
import type { SidekickChild } from "../Sidekick";
import { saveV3Idea } from "@/lib/v3.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { childFriendlyError } from "@/lib/kid-errors";
import { appendWords, hasWords, sparkWords } from "@/lib/kid-input";
import { COMIC_GENRES } from "@/lib/comic";
import { COMIC_LENGTHS, GENRE_EMOJI, bandOf, comicPlanLine } from "@/lib/comic-setup";
import { IDEA_CAST_MAX, IDEA_MAX, ideaLongEnough, ideaSparks } from "@/lib/comic-idea";
import type { WorkspaceProject } from "@/lib/workspace";
import type { CastMember } from "@/lib/images.functions";

/** The child's idea, exactly as they wrote it. */
export function IdeaCard({ idea, small = false, children }: { idea: string; small?: boolean; children?: React.ReactNode }) {
  if (small)
    return (
      <details className="rounded-2xl border-2 border-border bg-card px-3 py-2 text-sm">
        <summary className="cursor-pointer font-semibold">💡 Your idea</summary>
        <p className="mt-1 whitespace-pre-wrap break-words">{idea}</p>
      </details>
    );
  return (
    <div className="space-y-2 rounded-2xl border-2 border-primary bg-card p-4 shadow-soft">
      <p className="text-sm font-semibold text-muted-foreground">💡 Your idea</p>
      <p className="whitespace-pre-wrap break-words font-display text-xl">{idea}</p>
      {children}
    </div>
  );
}

type Saved = { ok: boolean; project?: WorkspaceProject | null };

/**
 * "What's your comic about?" Saves quietly while the child types (server-numbered, conditional writes; a delayed save
 * or another device's older words never win) and once more on "That's my idea!", which opens choosing characters.
 */
export function IdeaEntry({ child, project, onCreated, onDone, onBack }: {
  child: SidekickChild;
  project: WorkspaceProject | null;
  onCreated: (id: string) => void;
  onDone: (project: WorkspaceProject) => void;
  /** `saved`: the idea was already saved (it waits under "Pick up where you left off"). */
  onBack: (saved: boolean) => void;
}) {
  const band = bandOf(child.age_band);
  const env = getStripeEnvironment();
  const save = useServerFn(saveV3Idea);
  const [key] = useState(() => project?.id ?? crypto.randomUUID());
  const [idea, setIdea] = useState(project?.workspace.originalIdea ?? "");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [helpOpen, setHelpOpen] = useState(band === "explorers");
  const [clash, setClash] = useState<string | null>(null);
  const version = useRef(project?.workspace.ideaVersion ?? 0);
  const saved = useRef<string | null>(project ? project.workspace.originalIdea : null);
  const sent = useRef<string[]>([]);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const failed = useRef("");
  const created = useRef(!!project);
  const latest = useRef(idea);
  latest.current = idea;
  const clashRef = useRef(clash);
  clashRef.current = clash;
  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);

  /** One save at a time. Explicit ("That's my idea!") saves win over this device's own late saves, like "Meet my character". */
  function send(words: string, done: boolean): Promise<Saved> {
    const job = chain.current.then(async (): Promise<Saved> => {
      if (!done && saved.current === words) return { ok: true };
      for (let attempt = 0; attempt < 2; attempt++) {
        sent.current = [...sent.current.slice(-4), words];
        const r = await save({ data: { childId: child.id, id: key, idea: words, base: version.current, done, environment: env } });
        version.current = r.version;
        if (r.saved) {
          saved.current = words;
          if (!created.current) {
            created.current = true;
            onCreated(key);
          }
          return { ok: true, project: r.project };
        }
        // Another screen already tapped "That's my idea!": open the comic where it is now.
        if (r.stage !== "idea") return { ok: true, project: r.project };
        if (!r.conflict) return { ok: false };
        if (!done && r.conflict.idea === words) {
          saved.current = words;
          return { ok: true };
        }
        if (done || sent.current.slice(0, -1).includes(r.conflict.idea)) continue;
        if (mounted.current) setClash(r.conflict.idea);
        return { ok: false };
      }
      return { ok: false };
    });
    chain.current = job.catch(() => {});
    return job;
  }
  async function quiet(words: string) {
    if (!ideaLongEnough(words) || clashRef.current || saved.current === words || failed.current === words) return;
    try {
      const r = await send(words, false);
      if (r.project && mounted.current) onDone(r.project);
    } catch {
      failed.current = words; // a safety check already explained itself, or the next change tries again
    }
  }
  const flush = useRef(quiet);
  flush.current = quiet;
  useEffect(() => {
    if (busy) return;
    const t = setTimeout(() => void quiet(idea), 2500);
    return () => clearTimeout(t);
  }, [idea, busy]); // eslint-disable-line react-hooks/exhaustive-deps
  // Hiding the app, closing the page or leaving this screen saves the latest words straight away.
  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") void flush.current(latest.current);
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      void flush.current(latest.current);
    };
  }, []);

  async function done() {
    if (busy || !ideaLongEnough(idea)) return;
    setBusy("Bugley is reading your idea…");
    setNote("");
    setClash(null);
    clashRef.current = null;
    try {
      const r = await send(idea, true);
      if (r.project) onDone(r.project);
      else setNote("Your idea couldn’t save just now. Your words are still here. Try again.");
    } catch (e) {
      setNote(childFriendlyError(e));
    } finally {
      if (mounted.current) setBusy("");
    }
  }
  const sparks = ideaSparks(key);
  return (
    <div className="step-enter space-y-4">
      <BugleyCompanion
        child={child}
        busy={!!busy}
        text={busy || "What’s your comic about?"}
        hint={
          busy
            ? undefined
            : band === "builders"
              ? "A line or a whole premise. Your words stay yours."
              : "Write your idea in your own words. Bugley won’t change them."
        }
      />
      {note && (
        <p role="alert" className="rounded-2xl border-2 border-destructive bg-card p-3 font-semibold">
          {note}
        </p>
      )}
      {clash !== null && (
        <div role="status" className="space-y-2 rounded-2xl border-2 border-primary bg-card p-3">
          <p className="font-display text-lg">Your idea was changed on another screen too.</p>
          <p className="text-muted-foreground">The other screen says: “{clash}”</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!!busy}
              onClick={() => {
                clashRef.current = null;
                setClash(null);
                void send(latest.current, false).catch(() => {});
              }}
            >
              Keep my words here
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!!busy}
              onClick={() => {
                saved.current = clash;
                setIdea(clash);
                clashRef.current = null;
                setClash(null);
              }}
            >
              Use the other words
            </Button>
          </div>
        </div>
      )}
      <Textarea
        aria-label="What’s your comic about?"
        maxLength={IDEA_MAX}
        rows={band === "builders" ? 6 : 4}
        value={idea}
        disabled={!!busy}
        placeholder={band === "builders" ? "A robot chef opens a café on the Moon, but nobody up there can taste…" : "A dragon is scared to fly…"}
        onChange={(e) => setIdea(e.target.value)}
        className={band === "builders" ? "text-lg" : "text-xl"}
      />
      {!helpOpen && (
        <Button type="button" variant="ghost" disabled={!!busy} onClick={() => setHelpOpen(true)}>
          <Lightbulb />
          Help me think
        </Button>
      )}
      {helpOpen && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">
            {idea.trim()
              ? "Stuck? Tap a spark to add it to the end of your words, then finish it your way."
              : "Start with who your comic is about. Then you can tap a spark to keep going."}
          </p>
          <div className="flex flex-wrap gap-2">
            {sparks.map((spark) => {
              const added = hasWords(idea, spark);
              return (
                <Button
                  key={spark}
                  type="button"
                  variant={added ? "secondary" : "outline"}
                  aria-pressed={added}
                  disabled={!!busy || added || !idea.trim()}
                  className={band === "explorers" ? "h-auto min-h-14 whitespace-normal text-lg" : "h-auto min-h-11 whitespace-normal"}
                  onClick={() => setIdea((v) => appendWords(v, sparkWords(spark, []), IDEA_MAX))}
                >
                  {added ? <Check /> : <Sparkles />}… {spark}
                </Button>
              );
            })}
          </div>
        </div>
      )}
      {idea.trim().length > 0 && !ideaLongEnough(idea) && (
        <p className="font-semibold text-muted-foreground">Tell me a little more. Who or what is it about?</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          className={band === "explorers" ? "h-16 w-full text-xl sm:w-auto" : undefined}
          disabled={!!busy || !ideaLongEnough(idea)}
          onClick={() => void done()}
        >
          That’s my idea!
          <ArrowRight />
        </Button>
        <Button variant="ghost" disabled={!!busy} onClick={() => onBack(created.current)}>
          <ArrowLeft />
          Back
        </Button>
      </div>
    </div>
  );
}

/**
 * Choosing who's in an idea-first comic (up to three approved characters in one drawing style) and its plan, before
 * panel 1. Explorers: big tiles, then "Anyone else in your comic?". Builders: one screen with cast and plan together.
 */
export function IdeaCast({ child, project, cast, castReady, busy, onSet, onNew, onConfirm }: {
  child: SidekickChild;
  project: WorkspaceProject;
  cast: CastMember[];
  castReady: boolean;
  busy: string;
  onSet: (plan: { characterIds: string[]; count?: number; genre?: (typeof COMIC_GENRES)[number] }) => void;
  onNew: () => void;
  onConfirm: (characterIds: string[]) => void;
}) {
  const band = bandOf(child.age_band);
  const builders = band === "builders";
  const saved: string[] = project.details.characterIds ?? [];
  // A character deleted from My Characters before panel 1 simply drops out; nothing was frozen or charged.
  const chosen = saved.map((id) => cast.find((c) => c.id === id)).filter((c): c is CastMember => !!c);
  const ids = chosen.map((c) => c.id);
  const gone = castReady && chosen.length < saved.length;
  const look = chosen[0]?.styleKey;
  const count: number = project.details.pages.flatMap((p: any) => p.panels).length;
  const genre = project.details.genre as (typeof COMIC_GENRES)[number];
  const [picking, setPicking] = useState(!chosen.length || builders);
  const [planOpen, setPlanOpen] = useState(builders);
  const full = chosen.length >= IDEA_CAST_MAX;
  const others = cast.filter((c) => !ids.includes(c.id));
  const last = chosen[chosen.length - 1];
  const idea = project.workspace.originalIdea;
  const text = busy
    ? busy
    : !chosen.length
      ? "I love that idea! Who’s the star?"
      : builders
        ? "Who’s in your comic?"
        : `${last?.title} is ready! Anyone else in your comic?`;
  const hint = busy
    ? undefined
    : !chosen.length
      ? "Pick one of your characters, or make a new one."
      : builders
        ? "Add or remove characters (up to 3), set the plan, then start panel 1."
        : "Add another character, or tap “Let’s make it!”.";
  return (
    <div className="step-enter space-y-5">
      <BugleyCompanion child={child} busy={!!busy} text={text} hint={hint} />
      <IdeaCard idea={idea} />
      {gone && (
        <p role="status" className="rounded-2xl border-2 border-border bg-card p-3 font-semibold">
          A character you picked isn’t in My Characters any more, so they’re not in this comic. Your glow is safe.
        </p>
      )}
      {chosen.length > 0 && (
        <div className="space-y-2">
          <p className="font-display text-xl">In your comic</p>
          <ul className="flex flex-wrap gap-3">
            {chosen.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-2xl border-2 border-primary bg-card p-2 pr-3">
                <img src={c.url} alt="" className="size-14 rounded-xl object-contain mix-blend-multiply" />
                <span className="font-semibold">{c.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Take ${c.title} out of this comic`}
                  disabled={!!busy}
                  onClick={() => onSet({ characterIds: ids.filter((x) => x !== c.id) })}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Bugley draws these characters the same in every picture. Anyone else you write about may look a little different each time.
          </p>
        </div>
      )}
      {!full && !picking && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button size="lg" variant="secondary" className="h-auto min-h-16 whitespace-normal text-xl" disabled={!!busy} onClick={() => setPicking(true)}>
            <Plus />
            Add another
          </Button>
        </div>
      )}
      {!full && picking && (
        <div className="space-y-3">
          {chosen.length > 0 && <p className="font-display text-lg">Add a character</p>}
          {!castReady && <p role="status" className="text-sm font-semibold text-muted-foreground">Finding your characters…</p>}
          <div className={builders ? "grid grid-cols-3 gap-2 sm:grid-cols-5" : "grid grid-cols-2 gap-3 sm:grid-cols-3"}>
            {others.map((c) => {
              const otherLook = !!look && c.styleKey !== look;
              return (
                <Button
                  key={c.id}
                  variant="outline"
                  aria-label={otherLook ? `${c.title} (other drawing style, can't join this comic)` : `Choose ${c.title}`}
                  disabled={!!busy || otherLook}
                  className={`relative h-auto min-w-0 flex-col whitespace-normal rounded-lg p-2 ${otherLook ? "opacity-50" : ""}`}
                  onClick={() => {
                    setPicking(builders);
                    onSet({ characterIds: [...ids, c.id] });
                  }}
                >
                  <img src={c.url} alt="" className="aspect-square w-full rounded-lg object-contain mix-blend-multiply" />
                  <span className={builders ? "font-semibold" : "font-display text-lg"}>{c.title}</span>
                  {otherLook && <span className="text-xs font-semibold text-muted-foreground">Other drawing style</span>}
                </Button>
              );
            })}
          </div>
          {others.some((c) => !!look && c.styleKey !== look) && (
            <p className="text-sm text-muted-foreground">
              Faded characters are drawn in another style. Everyone in one comic needs the same drawing style.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size={builders ? "default" : "lg"}
              className={builders ? undefined : "h-16 text-xl"}
              disabled={!!busy}
              onClick={onNew}
            >
              <Sparkles />
              Make a new one
            </Button>
            {chosen.length > 0 && !builders && (
              <Button variant="ghost" disabled={!!busy} onClick={() => setPicking(false)}>
                No one else
              </Button>
            )}
          </div>
        </div>
      )}
      {chosen.length > 0 && (
        <div className="space-y-3 rounded-3xl border-4 border-primary bg-card p-4 shadow-glow">
          <p className="text-sm font-semibold text-muted-foreground">Your comic plan</p>
          {!planOpen ? (
            <>
              <p className="flex items-center gap-3 font-display text-2xl">
                <span aria-hidden className="text-4xl">{GENRE_EMOJI[genre]}</span>
                {comicPlanLine(genre, count)}
              </p>
              <Button type="button" variant="outline" disabled={!!busy} onClick={() => setPlanOpen(true)}>
                <Paintbrush />
                Change
              </Button>
            </>
          ) : (
            <>
              <fieldset className="space-y-2">
                <legend className="font-semibold">What kind of comic?</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {COMIC_GENRES.map((g) => (
                    <Button
                      key={g}
                      type="button"
                      variant={genre === g ? "default" : "outline"}
                      aria-pressed={genre === g}
                      disabled={!!busy}
                      className="h-auto min-h-12 whitespace-normal"
                      onClick={() => genre !== g && onSet({ characterIds: ids, genre: g })}
                    >
                      {g}
                    </Button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="font-semibold">How many panels?</legend>
                <div className="flex flex-wrap gap-2">
                  {COMIC_LENGTHS.map((n) => (
                    <Button
                      key={n}
                      type="button"
                      size="icon"
                      variant={count === n ? "default" : "outline"}
                      aria-pressed={count === n}
                      aria-label={`${n} ${n === 1 ? "panel" : "panels"}`}
                      disabled={!!busy}
                      onClick={() => count !== n && onSet({ characterIds: ids, count: n })}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          <Button
            size="lg"
            className={builders ? undefined : "h-16 w-full text-xl sm:w-auto"}
            disabled={!!busy || !chosen.length}
            onClick={() => onConfirm(ids)}
          >
            {builders ? "Start panel 1" : "Let’s make it!"}
            <ArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
}
