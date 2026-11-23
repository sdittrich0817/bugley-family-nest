import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  History,
  Library,
  Lightbulb,
  Paintbrush,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GlowMeter } from "../GlowMeter";
import { DeleteCreationButton } from "../DeleteCreationButton";
import { ComicReader, PanelCanvas } from "../ComicMaker";
import { StoryReader } from "../StoryMaker";
import type { SidekickChild } from "../Sidekick";
import { VoiceButton, VOICE_IN_NEW_BOXES } from "./VoiceInput";
import { BugleyCompanion, BugleyMagic, Confetti } from "./BugleyCompanion";
import { ComicSlideshow } from "./ComicSlideshow";
import { StoryBookPreview } from "./StoryBookPreview";
import { StoryPageDesign } from "./StoryPageDesign";
import { ChangeChoices, CoverPicker, GlowConfirm } from "./PictureChoices";
import { IdeaCard, IdeaCast, IdeaEntry } from "./IdeaStart";
import { ideaFirstAllowed, addIdeaWords } from "@/lib/comic-idea";
import {
  getV3CharacterDraft,
  closeV3CharacterDraft,
  saveV3CharacterDraft,
  readV3Character,
  startV3Creation,
  helpV3Scene,
  paintV3Scene,
  chooseV3Cover,
  formatV3Story,
  setV3IdeaPlan,
  getV3LinkedDraft,
} from "@/lib/v3.functions";
import {
  getWorkspace,
  updateWorkspace,
  workspaceHistory,
  restoreWorkspace,
  completePicture,
} from "@/lib/workspace.functions";
import {
  listCast,
  stylesOptions,
  makeHeroOptions,
  saveHero,
  upgradePicture,
  type CastMember,
} from "@/lib/images.functions";
import { editComic } from "@/lib/comic.functions";
import { editStory } from "@/lib/story.functions";
import { bookFromOneShot } from "@/lib/book.functions";
import { getChildGlow } from "@/lib/glow.functions";
import { listInProgress } from "@/lib/studio.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { comicPanelAspect, COMIC_GENRES } from "@/lib/comic";
import { STYLE_THUMBS } from "@/lib/style-thumbs";
import { useScrollTopOn } from "@/lib/scroll";
import type { OutputKind, WorkspaceProject } from "@/lib/workspace";
import { childFriendlyError } from "@/lib/kid-errors";
import { comicTitleIdeas } from "@/lib/comic-title";
import { liveMemory, readMemory } from "@/lib/comic-memory";
import { draftConflictIsOwn, v3CoverWords } from "@/lib/v3";
import {
  COMIC_LENGTHS,
  GENRE_EMOJI,
  SPROUTS_GENRES,
  SPROUTS_LENGTHS,
  bandOf,
  comicPlanLine,
  defaultCount,
  setupStartsCollapsed,
  visibleStyles,
} from "@/lib/comic-setup";
import { appendWords, hasWords, sparkWords } from "@/lib/kid-input";

type CharacterFacts = {
  name: string;
  kind: string;
  color: string;
  special: string;
  personality: string;
  question: string;
  ideas: string[];
};
export function ComicJourney({
  child,
  projectId,
  draftId,
  characterId,
  startKind,
  startIdea,
  onProject,
  onDraft,
  onCharacter,
  onBook,
  onExit,
  onLibrary,
  onCreateMore,
}: {
  child: SidekickChild;
  projectId?: string | undefined;
  draftId?: string | undefined;
  characterId?: string | undefined;
  startKind?: "picture" | "comic" | "story" | undefined;
  /** A3.4.1: open "Start with my idea" straight away (Explorers and Builders only). */
  startIdea?: boolean | undefined;
  onProject: (id: string) => void;
  onDraft: (id: string) => void;
  /** A3.1: remembers the chosen/new character in the address so a reload returns to the same setup. */
  onCharacter?: (id: string, kind?: OutputKind) => void;
  onBook: (id: string) => void;
  onExit: () => void;
  onLibrary: () => void;
  onCreateMore: () => void;
}) {
  const [project, setProject] = useState<WorkspaceProject | null>(null);
  // A3.4.1: "idea" is the idea-first start (Explorers and Builders); Sprouts never see it and the server refuses it.
  const ideaAllowed = ideaFirstAllowed(child.age_band);
  const [branch, setBranch] = useState<"entry" | "new" | "existing" | "output" | "setup" | "idea">(
    startIdea && ideaAllowed && !projectId && !draftId && !characterId ? "idea" : "entry",
  );
  const [hero, setHero] = useState<CastMember | null>(null);
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("cartoon");
  const [facts, setFacts] = useState<CharacterFacts | null>(null);
  const [followup, setFollowup] = useState("");
  const [options, setOptions] = useState<{ path: string; url?: string }[]>([]);
  const [kind, setKind] = useState<OutputKind>(startKind ?? "comic");
  // A3.1: what the child chose in the Studio (Comic, Picture or Story) survives making a new character.
  const wanted = useRef(startKind);
  if (startKind) wanted.current = startKind;
  // A3.1 comic panels: after a picture the child sees only "Love it!" / "Change it"; speech is its own step.
  const [step, setStep] = useState<"react" | "change" | "words">("react");
  // A3.3: inside "Change it" the child first sees three choices; "redraw" shows their words and the Glow check.
  const [changeMode, setChangeMode] = useState<"pick" | "redraw">("pick");
  const [finale, setFinale] = useState(false);
  const [nameText, setNameText] = useState("");
  const [title, setTitle] = useState("");
  const band = bandOf(child.age_band);
  const [count, setCount] = useState(() => defaultCount(startKind ?? "comic", child.age_band));
  // A3.2: Sprouts and Explorers start from a ready-made comic plan with "Change"; Builders see every choice.
  const [setupOpen, setSetupOpen] = useState(!setupStartsCollapsed(child.age_band));
  const [moreLooks, setMoreLooks] = useState(false);
  const [moreKinds, setMoreKinds] = useState(false);
  const [moreLengths, setMoreLengths] = useState(false);
  const bigSetup = band === "sprouts" && kind === "comic";
  const [genre, setGenre] = useState<(typeof COMIC_GENRES)[number]>("Adventure");
  const [heroChange, setHeroChange] = useState("");
  const [slides, setSlides] = useState(false);
  const [party, setParty] = useState(false);
  const [at, setAt] = useState(0);
  const [text, setText] = useState("");
  const [dialogue, setDialogue] = useState("");
  const [revision, setRevision] = useState("");
  const [changing, setChanging] = useState(false);
  const [bookPreview, setBookPreview] = useState(false);
  const [help, setHelp] = useState<{ question: string; ideas: string[] } | null>(null);
  useEffect(() => {
    setTips(null);
  }, [at]);
  const [tips, setTips] = useState<{ praise: string; tips: { skill: string; tip: string }[] } | null>(null);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [versions, setVersions] = useState<{ id: string; created_at: string }[] | null>(null);
  const draftKey = useRef(draftId);
  // A3.2: the character idea saves quietly while the child types or speaks, before "Meet my character".
  const ownDraft = useRef<string | undefined>(undefined);
  const draftSaved = useRef<{ description: string; style: string } | null>(null);
  const draftFailed = useRef("");
  // Server-assigned save versions per idea, this device's recent save attempts, and the one-at-a-time save queue.
  const draftVersions = useRef(new Map<string, number>());
  const draftSent = useRef<{ description: string; style: string }[]>([]);
  const draftChain = useRef<Promise<unknown>>(Promise.resolve());
  const closedDrafts = useRef(new Set<string>());
  const [draftClash, setDraftClash] = useState<{ id: string; description: string; styleKey: string } | null>(null);
  const clashRef = useRef(draftClash);
  clashRef.current = draftClash;
  const draftNow = useRef<{ description: string; style: string } | null>(null);
  const startKey = useRef<string | null>(null);
  // A3.4.1: the idea-first comic a new character is being made for (its quiet saves link to that comic).
  const linkedComic = useRef<string | undefined>(undefined);
  const running = useRef(false);
  const skipSync = useRef(false);
  const [picked, setPicked] = useState<string | null>(null);
  const env = getStripeEnvironment();
  const qc = useQueryClient();
  const projectRef = useRef<WorkspaceProject | null>(null);
  projectRef.current = project;
  const pendingSave = useRef<Promise<unknown> | null>(null);
  const load = useServerFn(getWorkspace),
    update = useServerFn(updateWorkspace),
    start = useServerFn(startV3Creation);
  const readCharacter = useServerFn(readV3Character),
    paintHero = useServerFn(makeHeroOptions),
    approve = useServerFn(saveHero);
  const saveDraft = useServerFn(saveV3CharacterDraft),
    loadDraft = useServerFn(getV3CharacterDraft),
    closeDraft = useServerFn(closeV3CharacterDraft);
  const ideaPlan = useServerFn(setV3IdeaPlan),
    linkedDraft = useServerFn(getV3LinkedDraft);
  const coach = useServerFn(helpV3Scene),
    paint = useServerFn(paintV3Scene),
    comicEdit = useServerFn(editComic),
    storyEdit = useServerFn(editStory);
  const finishPicture = useServerFn(completePicture);
  const pickCover = useServerFn(chooseV3Cover);
  const formatStory = useServerFn(formatV3Story);
  const history = useServerFn(workspaceHistory),
    restore = useServerFn(restoreWorkspace),
    book = useServerFn(bookFromOneShot),
    upgrade = useServerFn(upgradePicture);
  const {
    data: cast = [],
    refetch: refreshCast,
    isFetched: castFetched,
  } = useQuery({ queryKey: ["cast", child.id], queryFn: () => listCast({ data: { childId: child.id } }) });
  const { data: styles = [] } = useQuery(stylesOptions);
  const styleName = (key: string) => styles.find((s) => s.key === key)?.name ?? key.replaceAll("_", " ");
  const savedStyleKey = project?.styleKey ?? hero?.styleKey;
  const savedGenre = project?.details.genre;
  const { data: inProgress = [] } = useQuery({
    queryKey: ["in-progress", child.id],
    queryFn: () => listInProgress({ data: { childId: child.id } }),
  });
  const { data: glow } = useQuery({
    queryKey: ["glow", child.id],
    queryFn: () => getChildGlow({ data: { childId: child.id } }),
  });
  useEffect(() => {
    if (projectId)
      void load({ data: { childId: child.id, id: projectId } })
        .then((p) => {
          // A newer copy already on screen (for example the idea was just confirmed) is never replaced by an older one.
          const mine = projectRef.current;
          if (mine && mine.id === p.id && mine.updatedAt >= p.updatedAt) return;
          setProject(p);
        })
        .catch((e) => setNote(childFriendlyError(e)));
  }, [projectId, child.id]);
  useEffect(() => {
    if (draftId && !projectId) {
      // Our own quiet save just put this idea in the address: keep the words on screen (they may be newer).
      if (draftId === ownDraft.current) return;
      draftKey.current = draftId;
      ownDraft.current = draftId;
      setBranch("new");
      void loadDraft({ data: { childId: child.id, id: draftId } })
        .then((d) => {
          draftVersions.current.set(draftId, d.version);
          draftSaved.current = { description: d.description, style: d.styleKey };
          setDescription(d.description);
          setStyle(d.styleKey);
          // A3.1: an idea started from Comics (or Stories/Pictures) carries on to that same creation.
          if (!wanted.current && d.kind) {
            wanted.current = d.kind;
            setKind(d.kind);
          }
        })
        .catch((e) => setNote(childFriendlyError(e)));
    }
  }, [draftId, projectId]);
  useEffect(() => {
    if (characterId && !projectId) {
      const c = cast.find((c) => c.id === characterId);
      if (c) {
        setHero(c);
        if (startKind) toSetup(startKind);
        else setBranch("output");
      }
    }
  }, [characterId, cast, projectId]); // eslint-disable-line react-hooks/exhaustive-deps
  const items: any[] =
    project?.kind === "comic"
      ? project.details.pages.flatMap((p: any) =>
          p.panels.map((panel: any, index: number) => ({ ...panel, pageId: p.id, page: p, index })),
        )
      : (project?.details.pages ?? []);
  const item = items[at];
  const selectedIds: string[] = project?.details.characterIds ?? project?.details.characters ?? [];
  const ideaStage = project?.kind === "comic" ? project.workspace.ideaStage : undefined;
  const ideaComic = project?.kind === "comic" && !!project.workspace.ideaStart;
  // A3.4.1: reopening an idea-first comic during character creation brings back the character words (one card only).
  const linkedChecked = useRef<string | null>(null);
  useEffect(() => {
    if (!project || ideaStage !== "cast" || linkedChecked.current === project.id) return;
    linkedChecked.current = project.id;
    void linkedDraft({ data: { childId: child.id, comicId: project.id } })
      .then((d) => {
        if (!d) return;
        linkedComic.current = project.id;
        draftKey.current = d.id;
        ownDraft.current = d.id;
        draftVersions.current.set(d.id, d.version);
        draftSaved.current = { description: d.description, style: d.styleKey };
        setDescription(d.description);
        setStyle(d.styleKey);
        setFacts(null);
        setOptions([]);
        setAdding(true);
        setBranch("new");
      })
      .catch(() => {});
  }, [project?.id, ideaStage]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    setText(
      project?.kind === "picture"
        ? project.workspace.originalIdea
        : project?.kind === "comic"
          ? (item?.description ?? "")
          : (item?.text ?? ""),
    );
    setDialogue(item?.layers?.find((l: any) => l.type === "speech")?.text ?? "");
    setChanging(false);
    setRevision("");
    setHelp(null);
  }, [project?.id, project?.updatedAt, at]);
  useEffect(() => {
    setStep("react");
    setChangeMode("pick");
  }, [project?.id, at]);
  useEffect(() => {
    setFinale(false);
  }, [project?.id]);
  // A first-time child who picked Comics goes straight to making their character (choosing a saved one isn't possible yet).
  useEffect(() => {
    // A3.4.1: first-time Explorers and Builders making a comic see both choices (their idea, or a new character).
    if (wanted.current === "comic" && ideaAllowed) return;
    if (wanted.current && castFetched && !cast.length && branch === "entry" && !projectId && !draftId && !characterId) {
      draftKey.current = undefined;
      setBranch("new");
    }
  }, [castFetched, cast.length, branch, projectId, draftId, characterId]);
  useScrollTopOn(`${branch}-${at}-${project?.details.finished}-${step}-${finale}`);
  async function run(label: string, fn: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(label);
    setNote("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      if (pendingSave.current) await pendingSave.current.catch(() => {});
      await draftChain.current;
      await fn();
    } catch (e) {
      setNote(childFriendlyError(e));
    } finally {
      running.current = false;
      setBusy("");
      void qc.invalidateQueries({ queryKey: ["glow", child.id] });
      void qc.invalidateQueries({ queryKey: ["album", child.id] });
    }
  }
  const id = () => {
    if (!project) throw new Error("Open your creation first.");
    return { childId: child.id, id: project.id, environment: env };
  };
  const reload = async () => {
    if (project) {
      const saved = await load({ data: { childId: child.id, id: project.id } });
      projectRef.current = saved;
      setProject(saved);
    }
  };
  function toSetup(k: OutputKind) {
    setKind(k);
    setCount(defaultCount(k, child.age_band));
    setSetupOpen(!setupStartsCollapsed(child.age_band));
    setMoreKinds(false);
    setMoreLengths(false);
    setTitle("");
    startKey.current = null;
    setBranch("setup");
  }
  // A3.2 quiet character-idea save. The server numbers every save and only writes one based on the newest number, so a
  // delayed request or another device's older view never replaces newer words. Same safety check as "Meet my
  // character"; no Glow; only the words and style are kept.
  const linkedMode = adding && ideaStage === "cast" && !!project;
  // Idea-first comics take their look from their first character; with none yet, the child picks the look.
  const lockedLook = adding && project && selectedIds.length ? project.styleKey : null;
  // The idea-first cast still in My Characters (one deleted before panel 1 simply drops out).
  const ideaCastIds = selectedIds.filter((x) => !castFetched || cast.some((c) => c.id === x));
  if (branch === "new" && ((!adding && !project) || linkedMode)) draftNow.current = { description, style };
  /** Queues one save at a time. Resolves true once these words are the saved ones. */
  function sendDraft(key: string, snap: { description: string; style: string }, explicit: boolean) {
    const job = draftChain.current.then(async () => {
      if (closedDrafts.current.has(key)) return false;
      if (draftSaved.current?.description === snap.description && draftSaved.current.style === snap.style) return true;
      for (let attempt = 0; attempt < 2; attempt++) {
        draftSent.current = [...draftSent.current.slice(-4), snap];
        const r = await saveDraft({
          data: { childId: child.id, id: key, description: snap.description, styleKey: snap.style, environment: env, kind: linkedComic.current ? "comic" : wanted.current, base: draftVersions.current.get(key) ?? 0, ...(linkedComic.current ? { comicId: linkedComic.current } : {}) },
        });
        draftVersions.current.set(key, r.version);
        if (r.saved) {
          draftSaved.current = snap;
          return true;
        }
        if (r.closed || !r.conflict) {
          closedDrafts.current.add(key);
          return false;
        }
        const theirs = { description: r.conflict.description, style: r.conflict.styleKey };
        if (theirs.description === snap.description && theirs.style === snap.style) {
          draftSaved.current = snap;
          return true;
        }
        // This device's own earlier save landed late, or the child tapped "Meet my character": save on top of it.
        if (explicit || draftConflictIsOwn(theirs, draftSent.current.slice(0, -1))) continue;
        // Another device changed this idea: the child chooses which words to keep.
        setDraftClash({ id: key, ...r.conflict });
        return false;
      }
      return false;
    });
    draftChain.current = job.catch(() => {});
    return job;
  }
  async function quietDraftSave(snap: { description: string; style: string } | null) {
    if (!snap || snap.description.trim().length < 3 || clashRef.current) return;
    if (draftSaved.current?.description === snap.description && draftSaved.current.style === snap.style) return;
    const sig = `${snap.style}|${snap.description}`;
    if (draftFailed.current === sig) return;
    const key = (draftKey.current ??= crypto.randomUUID());
    try {
      const ok = await sendDraft(key, snap, false);
      if (ok && !linkedComic.current && ownDraft.current !== key && draftKey.current === key) {
        ownDraft.current = key;
        onDraft(key);
      }
    } catch {
      // Not retried for the same words (a safety check already explained itself, or the next change tries again).
      draftFailed.current = sig;
    }
  }
  const flushDraft = useRef(quietDraftSave);
  flushDraft.current = quietDraftSave;
  useEffect(() => {
    if (branch !== "new" || (!linkedMode && (adding || project)) || busy) return;
    const t = setTimeout(() => void quietDraftSave(draftNow.current), 2500);
    return () => clearTimeout(t);
  }, [description, style, branch, adding, project?.id, busy, linkedMode]); // eslint-disable-line react-hooks/exhaustive-deps
  // Leaving the character screen, hiding the app or closing the page saves the latest words straight away.
  useEffect(() => {
    if (branch !== "new") return;
    const hide = () => {
      if (document.visibilityState === "hidden") void flushDraft.current(draftNow.current);
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      void flushDraft.current(draftNow.current);
    };
  }, [branch]);
  async function attach(c: CastMember) {
    if (!project) {
      setHero(c);
      if (wanted.current) toSetup(wanted.current);
      else setBranch("output");
      if (onCharacter) onCharacter(c.id, wanted.current);
      else onDraft("");
      return;
    }
    await run("Meeting your character…", async () => {
      setProject(
        await update({
          data: {
            ...id(),
            updatedAt: (projectRef.current ?? project).updatedAt,
            characterIds: [...new Set([...selectedIds, c.id])],
          },
        }),
      );
      setAdding(false);
    });
  }
  async function checkCharacter(value: string, wantsHelp = false) {
    await run("Bugley is reading about your character…", async () => {
      draftKey.current ??= crypto.randomUUID();
      if (!adding || linkedMode) {
        clashRef.current = null;
        setDraftClash(null);
        await sendDraft(draftKey.current, { description: value, style }, true);
        ownDraft.current = draftKey.current;
        if (!linkedMode) onDraft(draftKey.current);
      }
      setDescription(value);
      setOptions([]);
      setFacts(
        await readCharacter({
          data: {
            childId: child.id,
            description: value.trim().length >= 2 ? value : "Help me invent a brand new character",
            help: wantsHelp,
          },
        }),
      );
      setFollowup("");
    });
  }
  async function previews(change = "") {
    if (!facts) return;
    await run("Painting your character…", async () => {
      const special = change.trim()
        ? `${facts.special ? facts.special + "; " : ""}change: ${change.trim()}`.slice(0, 160)
        : facts.special;
      const r = await paintHero({
        data: {
          childId: child.id,
          styleKey: lockedLook ?? style,
          ...facts,
          special,
          environment: env,
          op: crypto.randomUUID(),
        },
      });
      if (!r.ok) throw new Error(r.reply);
      if (change.trim()) setFacts({ ...facts, special });
      setOptions(r.options);
      setHeroChange("");
    });
  }
  async function choose(path: string) {
    if (!facts) return;
    await run("Getting your character ready…", async () => {
      const r = await approve({
        data: { childId: child.id, path, styleKey: lockedLook ?? style, ...facts },
      });
      if (!r.ok) throw new Error(r.reply);
      const refreshed = await refreshCast();
      const c = refreshed.data?.find((c) => c.id === r.id);
      if (!c) throw new Error("Your character saved. Open My Characters to choose them.");
      if (project && ideaStage === "cast") {
        // A3.4.1: the new character joins the idea-first comic's cast; its linked idea stops showing anywhere.
        const made = draftKey.current;
        draftKey.current = undefined;
        draftNow.current = null;
        linkedComic.current = undefined;
        if (made) void closeDraft({ data: { childId: child.id, id: made } }).catch(() => {});
        const next = await ideaPlan({
          data: { ...id(), updatedAt: (projectRef.current ?? project).updatedAt, characterIds: [...new Set([...ideaCastIds, c.id])] },
        });
        projectRef.current = next;
        setProject(next);
        setAdding(false);
        setBranch("entry");
      } else if (project) {
        setProject(
          await update({
            data: {
              ...id(),
              updatedAt: (projectRef.current ?? project).updatedAt,
              characterIds: [...new Set([...selectedIds, c.id])],
            },
          }),
        );
        setAdding(false);
      } else {
        setHero(c);
        if (wanted.current) toSetup(wanted.current);
        else setBranch("output");
        const made = draftKey.current;
        draftKey.current = undefined;
        draftNow.current = null;
        if (made) void closeDraft({ data: { childId: child.id, id: made } }).catch(() => {});
        if (onCharacter) onCharacter(c.id, wanted.current);
        else onDraft("");
      }
      setOptions([]);
    });
  }
  async function saveWords() {
    if (!project || !item || !text.trim()) return;
    if (project.kind === "comic")
      await comicEdit({ data: { ...id(), action: "panel", pageId: item.pageId, panelId: item.id, description: text } });
    else
      await storyEdit({
        data: {
          ...id(),
          action: "page",
          page: {
            id: item.id,
            step: item.step,
            text,
            description: text === item.text ? (item.description ?? "") : "",
            chapter: item.chapter ?? "",
          },
        },
      });
    await reload();
  }
  async function draw() {
    if (!project) return;
    await run(changing || help ? "Painting your scene…" : "Bugley is reading your idea…", async () => {
      if (!changing && !help) {
        const checked = await coach({
          data: { ...id(), itemId: item?.id, text: project.kind === "story" ? text : text.slice(0, 600), help: false },
        });
        if (project.kind === "story") {
          const saved = await load({ data: { childId: child.id, id: project.id } });
          skipSync.current = true;
          setProject(saved);
          projectRef.current = saved;
        }
        if (checked.question) {
          setHelp(checked);
          return;
        }
      }
      // Checking is done; only now does the painting screen appear.
      setBusy(changing ? "Painting your change…" : "Painting your scene…");
      let next: WorkspaceProject;
      try {
        next = await paint({
          data: {
            ...id(),
            updatedAt: (projectRef.current ?? project).updatedAt,
            itemId: item?.id,
            text,
            revision: changing ? revision : undefined,
            op: crypto.randomUUID(),
          },
        });
      } catch (error) {
        // Failed painting updates the saved version. Refresh it without resetting
        // the child's scene or requested change, so their next attempt is valid.
        try {
          const saved = await load({ data: { childId: child.id, id: project.id } });
          skipSync.current = true;
          setProject(saved);
        } catch {
          /* Keep the original art and words visible. */
        }
        throw error;
      }
      const nextItems: any[] =
        next.kind === "comic" ? next.details.pages.flatMap((p: any) => p.panels) : (next.details.pages ?? []);
      const path = next.kind === "picture" ? next.images[0] : nextItems.find((x) => x.id === item?.id)?.image;
      const url = path && next.urls[path];
      // Keep Bugley's drawing screen up until the new picture is fully loaded, so the old one never flashes back.
      if (url)
        await new Promise<void>((done) => {
          const img = new Image();
          img.onload = img.onerror = () => done();
          img.src = url;
          setTimeout(done, 15000);
        });
      setProject(next);
      setStep("react");
    });
  }
  // Speech step, then the next panel (or the finish when every panel is drawn). Saving is skipped when nothing changed.
  async function keepPanel(words: string) {
    if (!project || !item) return;
    await run("Keeping your panel…", async () => {
      const saidBefore = item.layers?.find((l: any) => l.type === "speech")?.text ?? "";
      if (!item.dialogueDone || words.trim() !== saidBefore.trim())
        await comicEdit({ data: { ...id(), action: "dialogue", pageId: item.pageId, panelId: item.id, text: words } });
      await reload();
      const empty = items.findIndex((p) => !p.image);
      if (at < items.length - 1) setAt(at + 1);
      else if (empty === -1) setFinale(true);
      else setAt(empty);
    });
  }
  async function saveName(value: string) {
    if (!project || !value.trim()) return;
    await run("Saving your comic name…", async () => {
      const next = await update({
        data: { ...id(), updatedAt: (projectRef.current ?? project).updatedAt, title: value.trim().slice(0, 80) },
      });
      projectRef.current = next;
      setProject(next);
      setNameText("");
    });
  }
  useEffect(() => {
    if (!project || project.details.finished || busy || changing || !text.trim()) return;
    // A3.3: words typed while deciding on a paid redraw are saved by the drawing itself, so "Cancel" changes nothing.
    if (project.kind === "comic" && step === "change" && changeMode === "redraw") return;
    const saved =
      project.kind === "picture"
        ? project.workspace.originalIdea
        : project.kind === "comic"
          ? item?.description
          : item?.text;
    if (text === saved) return;
    // Quiet save: no busy message, the box stays open and the child's typing is never interrupted.
    const timer = setTimeout(() => {
      if (running.current) return;
      pendingSave.current = (async () => {
        try {
          let next: WorkspaceProject;
          if (project.kind === "picture")
            next = await update({
              data: { ...id(), updatedAt: (projectRef.current ?? project).updatedAt, idea: text },
            });
          else {
            if (project.kind === "comic")
              await comicEdit({
                data: { ...id(), action: "panel", pageId: item.pageId, panelId: item.id, description: text },
              });
            else
              await storyEdit({
                data: {
                  ...id(),
                  action: "page",
                  page: {
                    id: item.id,
                    step: item.step,
                    text,
                    description: text === item.text ? (item.description ?? "") : "",
                    chapter: item.chapter ?? "",
                  },
                },
              });
            next = await load({ data: { childId: child.id, id: project.id } });
          }
          skipSync.current = true;
          setProject(next);
        } catch {
          /* the next save or button press tries again */
        }
      })().finally(() => {
        pendingSave.current = null;
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, [text, project?.updatedAt, busy, changing, at, step, changeMode]);
  // A3.4.1 idea-first: cast and plan before panel 1 (no Glow), then the usual comic steps.
  async function setIdeaPlanNow(plan: { characterIds: string[]; count?: number; genre?: (typeof COMIC_GENRES)[number] }, confirm = false) {
    if (!project) return;
    await run(confirm ? "Opening panel 1…" : "Saving your comic plan…", async () => {
      const next = await ideaPlan({
        data: { ...id(), updatedAt: (projectRef.current ?? project).updatedAt, ...plan, confirm },
      });
      projectRef.current = next;
      setProject(next);
      if (confirm) setAt(0);
    });
  }
  function newIdeaCharacter() {
    if (!project) return;
    linkedComic.current = project.id;
    draftKey.current = undefined;
    draftSaved.current = null;
    clashRef.current = null;
    setDraftClash(null);
    // The first new character's box starts with the child's own idea words, ready to edit.
    setDescription(ideaCastIds.length ? "" : project.workspace.originalIdea.slice(0, 600));
    setFacts(null);
    setOptions([]);
    setAdding(true);
    setBranch("new");
  }
  const ideaEntryOpen = project ? ideaStage === "idea" : branch === "idea";
  const newCharacter = (
    <div className="space-y-4">
      <BugleyCompanion
        child={child}
        busy={!!busy}
        text={
          busy || facts?.question || (options.length ? `Which one is ${facts?.name}?` : "Tell me about your character!")
        }
        hint={
          facts?.question
            ? "Write your answer in the yellow box just below 👇"
            : options.length
              ? "Tap the one you love, or tell Bugley what to change."
              : "What kind of creature or person are they? What’s their name? Any cool features, colors or something they wear?"
        }
      />
      {facts?.question && (
        <form
          className="step-enter space-y-3 rounded-2xl border-4 border-primary bg-card p-4 shadow-glow"
          onSubmit={(e) => {
            e.preventDefault();
            void checkCharacter(`${description}; ${followup}`.slice(0, 600));
          }}
        >
          <label className="block font-display text-xl">
            ✏️ Your answer for Bugley
            <Input
              autoFocus
              aria-label="Tell Bugley more about your character"
              className="mt-2 text-lg"
              placeholder="Type your answer here…"
              value={followup}
              maxLength={300}
              disabled={!!busy}
              onChange={(e) => setFollowup(e.target.value)}
            />
          </label>
          <VoiceButton
            ageBand={child.age_band}
            what="your answer"
            disabled={!!busy}
            onText={(t) => setFollowup((v) => appendWords(v, t, 300))}
          />
          <Button disabled={!!busy || !followup.trim()}>
            Tell Bugley
            <ArrowRight />
          </Button>
        </form>
      )}
      {facts?.question && (
        <p className="text-sm font-semibold text-muted-foreground">What you’ve told Bugley so far:</p>
      )}
      {draftClash && draftClash.id === draftKey.current && (
        <div role="status" className="space-y-2 rounded-2xl border-2 border-primary bg-card p-3">
          <p className="font-display text-lg">Your idea was changed on another screen too.</p>
          <p className="text-muted-foreground">The other screen says: “{draftClash.description}”</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!!busy}
              onClick={() => {
                clashRef.current = null;
                setDraftClash(null);
                void quietDraftSave(draftNow.current);
              }}
            >
              Keep my words here
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!!busy}
              onClick={() => {
                draftSaved.current = { description: draftClash.description, style: draftClash.styleKey };
                setDescription(draftClash.description);
                setStyle(draftClash.styleKey);
                setFacts(null);
                setOptions([]);
                clashRef.current = null;
                setDraftClash(null);
              }}
            >
              Use the other words
            </Button>
          </div>
        </div>
      )}
      <Textarea
        aria-label="Describe your character"
        maxLength={600}
        rows={4}
        value={description}
        disabled={!!busy}
        placeholder="Super Ted is a golden dog with floppy ears and a red superhero cape…"
        onChange={(e) => {
          setDescription(e.target.value);
          setFacts(null);
          setOptions([]);
        }}
        className="text-lg"
      />
      {!facts?.question && (
        <VoiceButton
          ageBand={child.age_band}
          what="about your character"
          disabled={!!busy}
          onText={(t) => {
            setDescription((v) => appendWords(v, t, 600));
            setFacts(null);
            setOptions([]);
          }}
        />
      )}
      {!lockedLook && (
        <fieldset className="space-y-3">
          <legend className="font-display text-xl">Choose your drawing style</legend>
          <div className={band === "sprouts" && !moreLooks ? "grid grid-cols-2 gap-3 sm:grid-cols-4" : "grid grid-cols-2 gap-2 sm:grid-cols-5"}>
            {visibleStyles(styles, child.age_band, style, moreLooks).map((s) => (
              <Button
                type="button"
                key={s.key}
                variant={style === s.key ? "secondary" : "outline"}
                aria-label={`Drawing style: ${s.name}`}
                aria-pressed={style === s.key}
                disabled={!!busy}
                className="relative h-auto min-w-0 flex-col whitespace-normal p-2 text-center"
                onClick={() => {
                  setStyle(s.key);
                  setOptions([]);
                }}
              >
                {STYLE_THUMBS[s.key] && (
                  <img src={STYLE_THUMBS[s.key]} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
                )}
                {style === s.key && (
                  <span className="absolute right-3 top-3 rounded-full bg-primary p-1 text-primary-foreground">
                    <Check className="size-4" />
                  </span>
                )}
                <span className={band === "sprouts" && !moreLooks ? "text-lg" : undefined}>{s.name}</span>
              </Button>
            ))}
          </div>
          {visibleStyles(styles, child.age_band, style, moreLooks).length < styles.length && (
            <Button type="button" variant="outline" disabled={!!busy} onClick={() => setMoreLooks(true)}>
              <Sparkles />
              More looks
            </Button>
          )}
        </fieldset>
      )}
      <div className="flex flex-wrap gap-2">
        {!facts && (
          <Button disabled={!!busy || description.trim().length < 2} onClick={() => void checkCharacter(description)}>
            Meet my character
            <ArrowRight />
          </Button>
        )}
        {facts && !facts.question && (
          <Button disabled={!!busy} onClick={() => void previews()}>
            <Paintbrush />
            {options.length ? "Try again" : `Build ${facts.name}`} · 1 Glow
          </Button>
        )}
        <Button variant="ghost" disabled={!!busy} onClick={() => void checkCharacter(description, true)}>
          <Lightbulb />
          Help me think
        </Button>
      </div>
      {facts?.ideas.map((idea) => (
        <Button
          key={idea}
          variant="outline"
          disabled={!!busy}
          onClick={() => void checkCharacter(`${description}; ${idea}`.slice(0, 600))}
        >
          {idea}
        </Button>
      ))}
      <div className="grid grid-cols-3 gap-3">
        {options.map((o, i) => (
          <Button
            key={o.path}
            aria-label={`Choose character preview ${i + 1}`}
            disabled={!!busy}
            variant="outline"
            className="h-auto min-w-0 flex-col whitespace-normal p-2"
            onClick={() => void choose(o.path)}
          >
            <img
              src={o.url}
              alt={`${facts?.name} option ${i + 1}`}
              className="aspect-square w-full object-contain mix-blend-multiply"
            />
            <span>That’s {facts?.name}!</span>
          </Button>
        ))}
      </div>
      {options.length > 0 && (
        <form
          className="step-enter space-y-2 rounded-2xl border-2 border-border bg-card p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void previews(heroChange);
          }}
        >
          <label className="block font-display text-lg">
            Not quite right? Tell Bugley what to change
            <Textarea
              aria-label="What should change about your character"
              rows={2}
              maxLength={120}
              value={heroChange}
              disabled={!!busy}
              onChange={(e) => setHeroChange(e.target.value)}
              placeholder="Make all the other chickens look different from each other…"
              className="mt-2"
            />
          </label>
          {VOICE_IN_NEW_BOXES && (
            <VoiceButton
              ageBand={child.age_band}
              what="what to change"
              disabled={!!busy}
              onText={(t) => setHeroChange((v) => appendWords(v, t, 120))}
            />
          )}
          <Button variant="secondary" disabled={!!busy || !heroChange.trim()}>
            <Paintbrush />
            Change it · 1 Glow
          </Button>
        </form>
      )}
    </div>
  );
  const castPicker = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cast
          .filter((c) => !project || c.styleKey === project.styleKey)
          .map((c) => (
            <Button
              key={c.id}
              aria-label={`Choose ${c.title}`}
              variant="outline"
              aria-pressed={picked === c.id}
              disabled={!!busy || !!picked || selectedIds.includes(c.id)}
              className={`relative h-auto min-w-0 flex-col whitespace-normal rounded-lg p-3 transition ${picked === c.id ? "scale-105 border-4 border-primary shadow-glow" : picked ? "opacity-40" : ""}`}
              onClick={() => {
                setPicked(c.id);
                setTimeout(() => {
                  void attach(c).finally(() => setPicked(null));
                }, 350);
              }}
            >
              {picked === c.id && (
                <span className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-5" />
                </span>
              )}
              <img
                src={c.url}
                alt={c.title}
                className="aspect-square w-full object-contain rounded-lg mix-blend-multiply"
              />
              <span className="font-display text-lg">{c.title}</span>
            </Button>
          ))}
      </div>
      {!cast.length && <p>No characters yet.</p>}
      <Button
        variant="secondary"
        onClick={() => {
          setBranch("new");
          draftKey.current = undefined;
          setDescription("");
          setFacts(null);
          setOptions([]);
        }}
      >
        <Plus />
        Make a new character
      </Button>
    </div>
  );
  const heroNames =
    cast
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => c.title)
      .join(" & ") || "your character";
  const finaleOn = project?.kind === "comic" && finale && !project.details.finished;
  const drawnComic = project?.kind === "comic" && !!item?.image && !changing && !finaleOn;
  const editing = !finaleOn && (!drawnComic || (step === "change" && changeMode === "redraw"));
  // A3.3: paid comic-panel changes show what Bugley will do, the Glow and a Cancel before anything is drawn.
  const comicChange = project?.kind === "comic" && !!item?.image && !finaleOn && (changing || step === "change");
  const titlePending = project?.kind === "comic" && !!project.workspace?.titlePending;
  const comicPanels: any[] = project?.kind === "comic" ? items : [];
  const nameIdeas = titlePending
    ? comicTitleIdeas({
        names: cast.filter((c) => selectedIds.includes(c.id)).map((c) => c.title),
        genre: project?.details.genre,
        panels: comicPanels.filter((p) => p.image).map((p) => p.description),
        memory: liveMemory(readMemory(project?.details.storyMemory), comicPanels),
      })
    : [];
  // While the name is still temporary it is left out of the cover words, so it can never decide who is on the cover.
  const coverWords = () => v3CoverWords(project?.title ?? "", titlePending, items[0]?.description || items[0]?.text);
  const nameBlock = project?.kind === "comic" && (
    <div className="space-y-3 rounded-2xl border-2 border-border bg-card p-4">
      <h2 className="text-2xl">Comic name</h2>
      <p className="text-muted-foreground">
        {titlePending
          ? "Name your comic if you like. Tap an idea from your own words, or type your own. You can skip this."
          : `Your comic is called “${project.title}”. You can change it here.`}
      </p>
      {nameIdeas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {nameIdeas.map((idea) => (
            <Button key={idea} variant="outline" disabled={!!busy} onClick={() => void saveName(idea)}>
              {idea}
            </Button>
          ))}
        </div>
      )}
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void saveName(nameText);
        }}
      >
        <Input
          aria-label="Comic name"
          className="min-w-0 flex-1 text-lg"
          value={nameText}
          maxLength={80}
          disabled={!!busy}
          placeholder={titlePending ? "Type your own comic name…" : project.title}
          onChange={(e) => setNameText(e.target.value)}
        />
        <Button variant="secondary" disabled={!!busy || !nameText.trim()}>
          Use this name
        </Button>
      </form>
      {VOICE_IN_NEW_BOXES && (
        <VoiceButton
          ageBand={child.age_band}
          what="your comic name"
          disabled={!!busy}
          onText={(t) => setNameText((v) => appendWords(v, t, 80))}
        />
      )}
    </div>
  );
  const allArt = (
    project?.kind === "picture"
      ? project.images.map((path) => project.urls[path])
      : items.filter((p) => p.image).map((p) => project?.urls[p.image])
  ).filter(Boolean) as string[];
  return (
    <section className="space-y-5">
      {busy.startsWith("Painting") && <BugleyMagic child={child} label={busy.replace("…", "!")} />}
      {party && <Confetti />}
      {bookPreview && project?.kind === "story" && (
        <StoryBookPreview
          title={project.title}
          author={child.nickname}
          cover={project.details.cover ? project.urls[project.details.cover] : undefined}
          pages={items}
          urls={project.urls}
          onClose={() => setBookPreview(false)}
          onEdit={project.details.finished ? undefined : (index) => setAt(index)}
        />
      )}
      {slides && project && (
        <ComicSlideshow
          title={project.title}
          cover={project.details.cover ? project.urls[project.details.cover] : undefined}
          pages={items.flatMap((p) => {
            const url = p.image ? project.urls[p.image] : undefined;
            if (!url) return [];
            return [
              {
                url,
                ...(project.kind === "comic"
                  ? { panel: p, aspect: comicPanelAspect(p.page, p.index) }
                  : { caption: p.text }),
              },
            ];
          })}
          onClose={() => setSlides(false)}
        />
      )}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          disabled={!!busy}
          onClick={() => {
            if (adding) {
              setAdding(false);
              setBranch("entry");
            } else if (!project && branch !== "entry") setBranch("entry");
            else onExit();
          }}
        >
          <ArrowLeft />
          Studio
        </Button>
        {project && (
          <DeleteCreationButton
            childId={child.id}
            id={project.id}
            title={project.title}
            disabled={!!busy}
            beforeDelete={async () => {
              if (pendingSave.current) await pendingSave.current.catch(() => {});
            }}
            onDeleted={onLibrary}
          />
        )}
        {glow && <GlowMeter compact total={glow.total} allowance={glow.allowance} stage={child.bugley_stage} />}
      </header>
      {note && (
        // A3.1: floats above the page so nothing shifts or overlaps; the child's work stays on screen behind it.
        <div
          role="alert"
          className="fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-xl flex-wrap items-center gap-3 rounded-2xl border-4 border-destructive bg-card p-4 text-card-foreground shadow-lift"
        >
          <p className="min-w-0 flex-1 basis-56 font-semibold">{note}</p>
          <div className="flex flex-wrap gap-2">
            {projectId && !project ? (
              <Button
                onClick={() => {
                  setNote("");
                  void load({ data: { childId: child.id, id: projectId } })
                    .then(setProject)
                    .catch((e) => setNote(childFriendlyError(e)));
                }}
              >
                Try again
              </Button>
            ) : (
              <>
                {project && (
                  <Button variant="outline" disabled={!!busy} onClick={() => void run("Opening saved work…", reload)}>
                    Open my saved work
                  </Button>
                )}
                <Button onClick={() => setNote("")}>OK</Button>
              </>
            )}
          </div>
        </div>
      )}
      {savedStyleKey && !ideaEntryOpen && !(ideaStage && !selectedIds.length) && (project || branch === "output" || branch === "setup") && (
        <dl
          aria-label="Creation choices"
          className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-border py-3 text-sm"
        >
          <div className="flex min-w-0 items-center gap-3">
            {STYLE_THUMBS[savedStyleKey] && (
              <img src={STYLE_THUMBS[savedStyleKey]} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
            )}
            <div>
              <dt className="text-muted-foreground">Drawing style</dt>
              <dd className="font-semibold capitalize">{styleName(savedStyleKey)}</dd>
            </div>
          </div>
          {(savedGenre || (!project && branch === "setup")) && (
            <div>
              <dt className="text-muted-foreground">Genre</dt>
              <dd className="font-semibold">{savedGenre || genre}</dd>
            </div>
          )}
        </dl>
      )}
      {ideaEntryOpen ? (
        <IdeaEntry
          child={child}
          project={project}
          onCreated={(newId) => onProject(newId)}
          onDone={(p) => {
            projectRef.current = p;
            setProject(p);
            setBranch("entry");
            if (p.id !== projectId) onProject(p.id);
          }}
          onBack={(saved) => (saved || project ? onExit() : setBranch("entry"))}
        />
      ) : (projectId && !project && !note) || (characterId && !project && !hero && !castFetched && !note) ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <BugleyCompanion child={child} busy text="Opening your work…" />
        </div>
      ) : !project ? (
        <>
          {branch === "entry" && (
            <div key="entry" className="step-enter space-y-3">
              <BugleyCompanion
                child={child}
                text={
                  wanted.current
                    ? `Your ${wanted.current} starts with a character!`
                    : "Every picture, comic and story starts with a character!"
                }
                hint={
                  wanted.current
                    ? "Bring a brand-new character to life, or pick one you already made."
                    : "Bring a brand-new character to life, or pick one you already made. Then you'll choose to make a picture, a comic or a story with them."
                }
              />
              {wanted.current === "comic" && ideaAllowed && (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-auto min-h-24 w-full flex-col gap-1 whitespace-normal border-4 border-primary py-4 text-xl"
                  onClick={() => setBranch("idea")}
                >
                  <span className="flex items-center gap-2">
                    <Lightbulb />
                    Start with my idea
                  </span>
                  <span className="text-sm font-semibold opacity-80">Write what your comic is about, then pick who’s in it</span>
                </Button>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  size="lg"
                  className="h-auto min-h-24 flex-col gap-1 whitespace-normal py-4 text-xl"
                  onClick={() => {
                    draftKey.current = undefined;
                    setFacts(null);
                    setDescription("");
                    setBranch("new");
                  }}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles />
                    Bring a new character to life
                  </span>
                  <span className="text-sm font-semibold opacity-80">Describe them and Bugley draws them</span>
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="h-auto min-h-24 flex-col gap-1 whitespace-normal py-4 text-xl"
                  disabled={!cast.length}
                  onClick={() => setBranch("existing")}
                >
                  <span className="flex items-center gap-2">
                    <Users />
                    Choose one of my characters
                  </span>
                  <span className="text-sm font-semibold opacity-80">
                    {cast.length ? `${cast.length} ready to create with` : "None yet, make your first!"}
                  </span>
                </Button>
              </div>
            </div>
          )}
          {branch === "new" && newCharacter}
          {branch === "existing" && (
            <>
              <BugleyCompanion child={child} text="Who’s coming on this adventure?" />
              {castPicker}
            </>
          )}
          {branch === "output" && hero && (
            <div className="step-enter space-y-5">
              <BugleyCompanion
                child={child}
                text={`What shall we make with ${hero.title}?`}
                hint="Pick one. You can always make more later!"
              />
              <div className="flex items-center justify-center gap-3 rounded-3xl border-4 border-primary bg-card p-3 shadow-glow">
                <img
                  src={hero.url}
                  alt={hero.title}
                  className="size-24 rounded-2xl object-contain mix-blend-multiply"
                />
                <span className="font-display text-2xl">{hero.title}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setHero(null);
                    setBranch("existing");
                  }}
                >
                  Switch
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(
                  [
                    ["picture", Paintbrush, "Picture", `One amazing picture of ${hero.title}`],
                    ["comic", Sparkles, "Comic", "Panels with speech bubbles"],
                    ["story", BookOpen, "Story", "Pages you write in your own words"],
                  ] as const
                ).map(([k, Icon, label, sub]) => (
                  <Button
                    key={k}
                    variant="secondary"
                    className="h-auto min-h-28 flex-col gap-1 whitespace-normal rounded-3xl p-4 text-center"
                    onClick={() => toSetup(k)}
                  >
                    <Icon className="size-8" />
                    <span className="font-display text-2xl">{label}</span>
                    <span className="text-sm font-semibold opacity-80">{sub}</span>
                  </Button>
                ))}
              </div>
              {inProgress.some((w) => w.characterIds.includes(hero.id)) && (
                <div className="space-y-2">
                  <p className="font-display text-xl">Or keep going with {hero.title}:</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {inProgress
                      .filter((w) => w.characterIds.includes(hero.id))
                      .map((w) => (
                        <Button
                          key={w.id}
                          variant="outline"
                          className="h-auto min-w-0 flex-col gap-1 whitespace-normal rounded-2xl p-2"
                          onClick={() => onProject(w.id)}
                        >
                          {w.art ? (
                            <img src={w.art} alt="" className="aspect-square w-full rounded-lg object-cover" />
                          ) : (
                            <span className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted text-3xl">
                              ✏️
                            </span>
                          )}
                          <span className="font-semibold">{w.title}</span>
                          <span className="text-xs capitalize text-muted-foreground">{w.kind} · keep working</span>
                        </Button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {branch === "setup" && hero && (
            <>
              <BugleyCompanion
                child={child}
                busy={!!busy}
                text={
                  busy ||
                  (kind === "picture"
                    ? "What will you call your picture?"
                    : kind === "comic"
                      ? setupOpen
                        ? "What kind of comic shall we make?"
                        : `Let’s make your ${genre} comic with ${count} ${count === 1 ? "panel" : "panels"}!`
                      : "What’s the name of your adventure?")
                }
                hint={
                  busy
                    ? undefined
                    : kind === "picture"
                      ? "Give it a fun name. You’ll describe it next!"
                      : kind === "comic"
                        ? setupOpen
                          ? "Pick what kind of comic it is and how long it should be. You’ll name it at the end!"
                          : "Tap “Let’s make it!”, or “Change” to pick another kind or length. You’ll name it at the end!"
                        : `Pick a name, what kind of ${kind} it is, and how long it should be.`
                }
              />
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run("Opening your adventure…", async () => {
                    startKey.current ??= crypto.randomUUID();
                    const p = await start({
                      data: {
                        childId: child.id,
                        id: startKey.current,
                        kind,
                        title: kind === "comic" ? "" : title,
                        count: kind === "picture" ? 1 : count,
                        characterId: hero.id,
                        genre,
                        environment: env,
                      },
                    });
                    setProject(p);
                    onProject(p.id);
                  });
                }}
              >
                {kind !== "comic" && (
                  <label className="block space-y-2 font-semibold">
                    {kind === "picture" ? "Picture name" : "Story name"}
                    <Input
                      aria-label={kind === "picture" ? "Picture name" : "Story name"}
                      value={title}
                      maxLength={80}
                      disabled={!!busy}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </label>
                )}
                {kind === "comic" && !setupOpen ? (
                  <div className="space-y-3 rounded-3xl border-4 border-primary bg-card p-4 shadow-glow">
                    <p className="text-sm font-semibold text-muted-foreground">Your comic plan</p>
                    <p className="flex items-center gap-3 font-display text-2xl">
                      <span aria-hidden className="text-4xl">
                        {GENRE_EMOJI[genre]}
                      </span>
                      {comicPlanLine(genre, count)}
                    </p>
                    <PanelDots count={count} />
                    <Button
                      type="button"
                      variant="outline"
                      aria-expanded={false}
                      disabled={!!busy}
                      onClick={() => setSetupOpen(true)}
                    >
                      <Paintbrush />
                      Change
                    </Button>
                  </div>
                ) : (
                  <>
                <fieldset className="space-y-2">
                  <legend className="font-semibold">What kind of {kind}?</legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(bigSetup && !moreKinds && SPROUTS_GENRES.includes(genre) ? SPROUTS_GENRES : COMIC_GENRES).map((g) => (
                      <Button
                        type="button"
                        key={g}
                        variant={genre === g ? "default" : "outline"}
                        aria-pressed={genre === g}
                        disabled={!!busy}
                        className={bigSetup ? "h-auto min-h-20 flex-col gap-1 whitespace-normal text-lg" : "h-auto min-h-12 whitespace-normal"}
                        onClick={() => setGenre(g)}
                      >
                        {bigSetup && <span aria-hidden className="text-3xl">{GENRE_EMOJI[g]}</span>}
                        {g}
                      </Button>
                    ))}
                  </div>
                  {bigSetup && !moreKinds && SPROUTS_GENRES.includes(genre) && (
                    <Button type="button" variant="ghost" disabled={!!busy} onClick={() => setMoreKinds(true)}>
                      <Plus />
                      More kinds
                    </Button>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Bugley draws every picture with this mood, in {hero.title}’s art style.
                  </p>
                </fieldset>
                {kind !== "picture" && (
                  <div className="space-y-2">
                    <p className="font-semibold">How many {kind === "comic" ? "panels" : "pages"}?</p>
                    {bigSetup && !moreLengths && SPROUTS_LENGTHS.some((l) => l.count === count) ? (
                      <>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {SPROUTS_LENGTHS.map((l) => (
                            <Button
                              type="button"
                              key={l.count}
                              variant={count === l.count ? "default" : "outline"}
                              aria-pressed={count === l.count}
                              disabled={!!busy}
                              className="h-auto min-h-20 flex-col gap-2 whitespace-normal text-lg"
                              onClick={() => setCount(l.count)}
                            >
                              <span>
                                {l.label} · {l.count} panels
                              </span>
                              <PanelDots count={l.count} />
                            </Button>
                          ))}
                        </div>
                        <Button type="button" variant="ghost" disabled={!!busy} onClick={() => setMoreLengths(true)}>
                          <Plus />
                          More lengths
                        </Button>
                      </>
                    ) : (
                      <>
                    <div className="flex flex-wrap gap-2">
                      {(kind === "comic" ? COMIC_LENGTHS : [5, 6, 8, 10, 12]).map((n) => (
                        <Button
                          type="button"
                          key={n}
                          size="icon"
                          variant={count === n ? "default" : "outline"}
                          aria-pressed={count === n}
                          disabled={!!busy}
                          onClick={() => setCount(n)}
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      Or type a number:
                      <Input
                        className="w-24"
                        type="number"
                        aria-label={kind === "comic" ? "Number of panels" : "Number of pages"}
                        min={kind === "story" ? 5 : 1}
                        max={12}
                        value={count}
                        disabled={!!busy}
                        onChange={(e) => setCount(Number(e.target.value))}
                      />
                      <span className="text-sm text-muted-foreground">
                        {kind === "comic"
                          ? `1–12 panels · ${Math.ceil(count / 4)} comic ${count > 4 ? "pages" : "page"}`
                          : "5–12 pages"}
                      </span>
                    </label>
                      </>
                    )}
                  </div>
                )}
                  </>
                )}
                <Button
                  disabled={
                    !!busy || (kind !== "comic" && !title.trim()) || count < (kind === "story" ? 5 : 1) || count > 12
                  }
                  size={band === "sprouts" ? "lg" : "default"}
                  className={band === "sprouts" ? "h-16 w-full text-xl sm:w-auto" : undefined}
                >
                  Let’s make it!
                  <ArrowRight />
                </Button>
              </form>
            </>
          )}
        </>
      ) : ideaStage === "cast" ? (
        adding && branch === "new" ? (
          <>
            {newCharacter}
            <Button variant="ghost" disabled={!!busy} onClick={() => { setAdding(false); setBranch("entry"); }}>
              Back to choosing characters
            </Button>
          </>
        ) : (
          <IdeaCast
            child={child}
            project={project}
            cast={cast}
            castReady={castFetched}
            busy={busy}
            onSet={(plan) => void setIdeaPlanNow(plan)}
            onNew={newIdeaCharacter}
            onConfirm={(ids) => void setIdeaPlanNow({ characterIds: ids }, true)}
          />
        )
      ) : (
        <>
          <h1 className="break-words text-3xl">{project.title}</h1>
          {project.kind === "story" && (
            <Button
              variant="secondary"
              disabled={!!busy}
              onClick={() =>
                void run("Keeping your words…", async () => {
                  if (!project.details.finished && text.trim() && text !== item?.text) await saveWords();
                  setBookPreview(true);
                })
              }
            >
              <BookOpen />
              Preview my book
            </Button>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {cast
              .filter((c) => selectedIds.includes(c.id))
              .map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <img src={c.url} alt={c.title} className="size-14 object-contain" />
                  <span className="font-semibold">{c.title}</span>
                </div>
              ))}
            <Button
              variant="ghost"
              disabled={
                !!busy || selectedIds.length >= (project.kind === "picture" ? 1 : 3) || !!project.details.bookId
              }
              onClick={() => {
                setAdding(true);
                setBranch("existing");
              }}
            >
              <Plus />
              Character
            </Button>
            <Button
              variant="ghost"
              disabled={!!busy}
              onClick={() => void run("Opening earlier work…", async () => setVersions(await history({ data: id() })))}
            >
              <History />
              Earlier work
            </Button>
          </div>
          {versions && (
            <div className="space-y-2 border-y border-border py-3">
              {versions.map((v) => (
                <div key={v.id} className="flex justify-between gap-2">
                  <span>{new Date(v.created_at).toLocaleString()}</span>
                  <Button
                    variant="outline"
                    disabled={!!busy}
                    onClick={() =>
                      void run("Opening earlier work…", async () => {
                        setProject(
                          await restore({
                            data: { ...id(), updatedAt: (projectRef.current ?? project).updatedAt, versionId: v.id },
                          }),
                        );
                        setVersions(null);
                        setAt(0);
                      })
                    }
                  >
                    Use this version
                  </Button>
                </div>
              ))}
              {versions.length === 0 && <p>No earlier work yet.</p>}
              {versions.length >= 30 && (
                <Button
                  variant="ghost"
                  disabled={!!busy}
                  onClick={() =>
                    void run("Opening older work…", async () => {
                      const last = versions.at(-1);
                      if (last)
                        setVersions([...versions, ...(await history({ data: { ...id(), before: last.created_at } }))]);
                    })
                  }
                >
                  Older work
                </Button>
              )}
              <Button variant="ghost" onClick={() => setVersions(null)}>
                Done
              </Button>
            </div>
          )}
          {adding ? (
            <>
              {branch === "new" ? newCharacter : castPicker}
              <Button variant="ghost" onClick={() => setAdding(false)}>
                Back to my creation
              </Button>
            </>
          ) : project.details.finished ? (
            <div className="step-enter space-y-5">
              <BugleyCompanion
                child={child}
                text={
                  project.kind === "picture"
                    ? `Hooray! You finished “${project.title}”! 🎉`
                    : `Hooray! “${project.title}” is published! 🎉`
                }
                hint="It’s saved in My Album, and your grown-up can see it too."
              />
              {titlePending && nameBlock}
              {project.kind === "picture" ? (
                <img src={allArt[0]} alt={project.title} className="mx-auto max-h-[32rem] w-full object-contain" />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {project.details.cover && (
                      <img
                        src={project.urls[project.details.cover]}
                        alt="Cover"
                        className="aspect-square w-full rounded-xl border-4 border-primary object-cover shadow-glow"
                      />
                    )}
                    {allArt.map((u, i) => (
                      <img
                        key={u}
                        src={u}
                        alt={`${project.kind === "comic" ? "Panel" : "Page"} ${i + 1}`}
                        className="step-enter aspect-square w-full rounded-xl border-2 border-border object-cover shadow-soft"
                        style={{ animationDelay: `${i * 0.12}s` }}
                      />
                    ))}
                  </div>
                  <Button size="lg" className="h-16 w-full text-xl" onClick={() => setSlides(true)}>
                    <Sparkles />
                    Watch my slideshow
                  </Button>
                  {project.kind === "comic" ? (
                    <ComicReader
                      child={child}
                      comic={{
                        id: project.id,
                        title: project.title,
                        updatedAt: (projectRef.current ?? project).updatedAt,
                        data: project.details,
                        urls: project.urls,
                        versions: {},
                      }}
                    />
                  ) : (
                    <StoryReader
                      child={child}
                      story={{
                        id: project.id,
                        title: project.title,
                        updatedAt: (projectRef.current ?? project).updatedAt,
                        data: project.details,
                        urls: project.urls,
                        versions: {},
                      }}
                    />
                  )}
                </>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="lg" onClick={onCreateMore}>
                  <Plus />
                  Create some more
                </Button>
                <Button variant="outline" onClick={onExit}>
                  <ArrowLeft />
                  Back to Studio
                </Button>
                <Button variant="outline" onClick={onLibrary}>
                  <Library />
                  My Album
                </Button>
                <Button
                  variant="secondary"
                  disabled={!!busy}
                  onClick={() =>
                    void run("Opening your adventure…", async () => {
                      if (project.kind === "picture")
                        setProject(
                          await finishPicture({
                            data: { ...id(), updatedAt: (projectRef.current ?? project).updatedAt, finished: false },
                          }),
                        );
                      else {
                        if (project.kind === "comic") await comicEdit({ data: { ...id(), action: "reopen" } });
                        else await storyEdit({ data: { ...id(), action: "reopen" } });
                        await reload();
                      }
                    })
                  }
                >
                  Keep working on it
                </Button>
                {project.kind !== "picture" && (
                  <Button
                    variant="outline"
                    disabled={!!busy}
                    onClick={() =>
                      void run("Opening your book…", async () => {
                        const b = await book({ data: { childId: child.id, creationId: project.id, environment: env } });
                        onBook(b.id);
                      })
                    }
                  >
                    <BookOpen />
                    Make a book
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div key={`scene-${at}`} className="step-enter space-y-5">
              <BugleyCompanion
                child={child}
                busy={!!busy}
                text={
                  busy ||
                  help?.question ||
                  (changing
                    ? project.kind === "comic"
                      ? "What would you like to change in this picture?"
                      : "What should I change in this picture?"
                    : finaleOn
                      ? `You finished ${items.length === 1 ? "your panel" : items.length === 2 ? "both panels" : `all ${items.length} panels`}! Your comic is ready! 🎉`
                      : drawnComic
                        ? step === "words"
                          ? `Does anyone talk in panel ${at + 1}?`
                          : step === "change"
                            ? changeMode === "redraw"
                              ? `Let’s try a new picture for panel ${at + 1}!`
                              : `How shall we change panel ${at + 1}?`
                            : `Here’s panel ${at + 1}! Do you love it?`
                        : project.kind === "picture"
                      ? `Where is ${heroNames} and what are they doing?`
                      : project.kind === "story"
                        ? at === 0
                          ? `How does ${heroNames}’s adventure begin?`
                          : at === items.length - 1
                            ? "How would you like your adventure to end?"
                            : "What happens next in your adventure?"
                        : ideaComic && at === 0
                          ? "What happens first?"
                          : `What is ${heroNames} doing on panel ${at + 1}?`)
                }
                hint={
                  busy
                    ? undefined
                    : help?.question
                      ? "Add a detail if you want, or keep your idea as it is. Your call!"
                      : changing
                        ? project.kind === "comic"
                          ? "Tell Bugley what you’d like to change in this picture. Bugley tries to keep the rest the same, but some little things might look a bit different."
                          : "Say exactly what to change. Bugley keeps everything else the same."
                        : finaleOn
                          ? "Give it a name if you like, pick a cover, then publish it to your shelf."
                          : drawnComic
                            ? step === "words"
                              ? "Type what they say, starting with their name. Or tap “No words needed”."
                              : step === "change"
                                ? changeMode === "redraw"
                                  ? "Check your words below. You can change them first. Bugley only draws when you tap “Yes, draw it”."
                                  : "Fix one thing, draw a new one, or keep this picture. Your call!"
                                : "Tap “Love it!” to keep it, or “Change it” to make it different."
                            : project.kind === "story"
                          ? "Your words, your book. I’m here if you get stuck."
                          : ideaComic && at === 0
                            ? `${heroNames} is already in the scene! Write what happens in panel 1. You can use your idea words if you like.`
                            : `${heroNames} is already in the scene! Tell Bugley where they are, what’s happening and who else is there.`
                }
              />
              {project.kind !== "picture" && (
                <nav aria-label="Your scenes" className="flex flex-wrap gap-2">
                  {items.map((p, i) => (
                    <Button
                      key={p.id}
                      size="icon"
                      variant={at === i ? "secondary" : "outline"}
                      disabled={!!busy}
                      aria-label={`${project.kind === "comic" ? "Panel" : "Page"} ${i + 1}${p.image ? ", drawn" : ""}`}
                      aria-pressed={at === i}
                      onClick={() =>
                        void run("Keeping your words…", async () => {
                          if (text.trim() && text !== (project.kind === "comic" ? item?.description : item?.text))
                            await saveWords();
                          setAt(i);
                          setFinale(false);
                        })
                      }
                    >
                      {i + 1}
                      {p.image && <Check className="size-3" />}
                    </Button>
                  ))}
                  {project.kind === "comic" && items.length > 0 && items.every((p) => p.image) && (
                    <Button
                      variant={finaleOn ? "secondary" : "outline"}
                      aria-pressed={finaleOn}
                      disabled={!!busy}
                      onClick={() =>
                        void run("Keeping your words…", async () => {
                          if (text.trim() && text !== item?.description) await saveWords();
                          setFinale(true);
                        })
                      }
                    >
                      <Check />
                      Finish
                    </Button>
                  )}
                </nav>
              )}
              {!finaleOn && (project.kind === "picture" ? project.images[0] : item?.image) && (
                <div className="mx-auto max-w-xl">
                  {project.kind === "comic" ? (
                    <PanelCanvas
                      panel={item}
                      url={project.urls[item.image]}
                      aspect={comicPanelAspect(item.page, item.index)}
                      editable={false}
                    />
                  ) : project.kind === "story" ? (
                    <img
                      src={project.urls[item.image]}
                      alt={`Page ${at + 1} picture`}
                      className="max-h-72 w-full rounded-2xl object-contain"
                    />
                  ) : (
                    <img
                      src={project.urls[project.images[0] ?? ""]}
                      alt={project.workspace.originalIdea}
                      className="max-h-96 w-full object-contain"
                    />
                  )}
                </div>
              )}
              {ideaComic && project.workspace.originalIdea && !finaleOn && (
                at === 0 && editing && !changing && !item?.image ? (
                  <IdeaCard idea={project.workspace.originalIdea}>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!!busy || text.includes(project.workspace.originalIdea.trim())}
                      onClick={() => setText((v) => addIdeaWords(v, project.workspace.originalIdea))}
                    >
                      <Lightbulb />
                      Use my idea words
                    </Button>
                  </IdeaCard>
                ) : (
                  <IdeaCard small idea={project.workspace.originalIdea} />
                )
              )}
              {changing ? (
                <Textarea
                  aria-label="What should change in the picture"
                  value={revision}
                  maxLength={600}
                  rows={3}
                  disabled={!!busy}
                  onChange={(e) => setRevision(e.target.value)}
                  placeholder="Make the sky nighttime, but keep everything else…"
                />
              ) : editing ? (
                <Textarea
                  aria-label={project.kind === "story" ? "Your story words" : "Describe this scene"}
                  value={text}
                  maxLength={project.kind === "story" ? 20000 : 600}
                  rows={4}
                  disabled={!!busy}
                  onChange={(e) => {
                    setText(e.target.value);
                  }}
                  placeholder={
                    project.kind === "story"
                      ? "Your story, in your own words…"
                      : "Ted zooms over a snowy forest. He spots a tiny fox waving below…"
                  }
                  className="text-lg"
                />
              ) : null}
              {(changing || editing) && (
                <VoiceButton
                  key={changing ? "change" : `scene-${at}`}
                  ageBand={child.age_band}
                  what={changing ? "what to change" : project.kind === "story" ? "your story words" : "your scene"}
                  disabled={!!busy}
                  onText={(t) =>
                    changing
                      ? setRevision((v) => appendWords(v, t, 600))
                      : setText((v) => appendWords(v, t, project.kind === "story" ? 20000 : 600))
                  }
                />
              )}
              {drawnComic && step === "react" && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    size="lg"
                    className="h-auto min-h-20 whitespace-normal text-2xl"
                    disabled={!!busy}
                    onClick={() => setStep("words")}
                  >
                    <Check />
                    Love it!
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-auto min-h-20 whitespace-normal text-2xl"
                    disabled={!!busy}
                    onClick={() => {
                      setHelp(null);
                      setChangeMode("pick");
                      setStep("change");
                    }}
                  >
                    <Paintbrush />
                    Change it
                  </Button>
                </div>
              )}
              {drawnComic && step === "change" && changeMode === "pick" && (
                <ChangeChoices
                  band={band}
                  busy={!!busy}
                  onFix={() => {
                    setChanging(true);
                    setRevision("");
                    setHelp(null);
                  }}
                  onRedraw={() => {
                    setHelp(null);
                    setChangeMode("redraw");
                  }}
                  onKeep={() => setStep("react")}
                />
              )}
              {editing && !!help?.ideas.length && project.kind === "story" &&
                help.ideas.map((idea) => (
                  <p key={idea} className="font-semibold text-muted-foreground">
                    ✦ {idea}
                  </p>
                ))}
              {/* A3.2: comic and picture sparks are tappable starters. They only add the spark to the end of the
                  child's own words; the child finishes the idea and decides whether to keep it. */}
              {editing && !!help?.ideas.length && project.kind !== "story" && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Tap a spark to add it to your words, then finish the idea your way. Your call!
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {help.ideas.map((idea) => {
                      const added = hasWords(text, idea);
                      return (
                        <Button
                          key={idea}
                          type="button"
                          variant={added ? "secondary" : "outline"}
                          aria-pressed={added}
                          disabled={!!busy || added}
                          className="h-auto min-h-12 whitespace-normal"
                          onClick={() =>
                            setText((v) =>
                              appendWords(v, v.trim() ? sparkWords(idea, cast.filter((c) => selectedIds.includes(c.id)).map((c) => c.title)) : idea, 600),
                            )
                          }
                        >
                          {added ? <Check /> : <Sparkles />}
                          {idea}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
              {project.kind === "story" && !changing && item && (
                <>
                  <Button
                    variant="outline"
                    disabled={!!busy || !text.trim()}
                    onClick={() =>
                      void run("Bugley is reading your page…", async () => {
                        if (text !== item.text) await saveWords();
                        const checked = await coach({
                          data: { ...id(), itemId: item.id, text, help: false, writing: true },
                        });
                        setTips({ praise: checked.praise ?? "", tips: checked.tips ?? [] });
                        if (checked.question) setHelp(checked);
                      })
                    }
                  >
                    <Sparkles />
                    Bugley’s writing tips
                  </Button>
                  {tips && (
                    <div
                      role="status"
                      className="step-enter space-y-2 rounded-2xl border-2 border-primary bg-card p-4 shadow-soft"
                    >
                      <p className="font-display text-lg">✏️ Writing coach</p>
                      {tips.praise && <p className="font-semibold">🌟 {tips.praise}</p>}
                      {tips.tips.map((t) => (
                        <p key={t.skill}>
                          <span className="font-bold">{t.skill}:</span> {t.tip}
                        </p>
                      ))}
                      {!tips.praise && !tips.tips.length && (
                        <p className="font-semibold">Your page reads great. Keep going!</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        You fix it in your own words, or keep it as it is. Your call!
                      </p>
                      <Button size="sm" variant="ghost" onClick={() => setTips(null)}>
                        Got it
                      </Button>
                    </div>
                  )}
                  {help?.question && (
                    <Button variant="ghost" disabled={!!busy} onClick={() => setHelp({ question: "", ideas: [] })}>
                      Keep my idea
                    </Button>
                  )}
                  <StoryPageDesign
                    key={`${item.id}-${item.layout}-${item.chapter}`}
                    page={item}
                    words={text}
                    url={item.image ? project.urls[item.image] : undefined}
                    busy={!!busy}
                    onSave={(layout, chapter) =>
                      void run("Setting your page…", async () => {
                        if (text.trim() && text !== item.text) await saveWords();
                        setProject(
                          await formatStory({
                            data: {
                              ...id(),
                              updatedAt: (projectRef.current ?? project).updatedAt,
                              itemId: item.id,
                              layout,
                              chapter,
                            },
                          }),
                        );
                      })
                    }
                  />
                </>
              )}
              {comicChange && changing && (
                <GlowConfirm
                  band={band}
                  have={glow?.total}
                  busy={!!busy}
                  ready={!!revision.trim() && !!text.trim()}
                  what={
                    revision.trim()
                      ? `Bugley will change “${revision.trim()}” in panel ${at + 1}. Bugley tries to keep the rest the same, but some little things might look a bit different. Your words for this panel stay the same.`
                      : "Type what to change in the box above, then Bugley shows you what it will do."
                  }
                  confirmLabel="Yes, make this change"
                  onConfirm={() => void draw()}
                  onCancel={() => {
                    setChanging(false);
                    setRevision("");
                  }}
                />
              )}
              {comicChange && !changing && step === "change" && changeMode === "redraw" && (
                <>
                  <GlowConfirm
                    band={band}
                    have={glow?.total}
                    busy={!!busy}
                    ready={!!text.trim()}
                    what={`Bugley will draw a brand-new picture for panel ${at + 1} from your words. Your picture stays until the new one is ready.`}
                    confirmLabel={help?.question ? "Yes, draw with my details" : "Yes, draw it"}
                    onConfirm={() => void draw()}
                    onCancel={() => {
                      setText(item?.description ?? "");
                      setHelp(null);
                      setChangeMode("pick");
                    }}
                  />
                  <Button
                    variant="ghost"
                    disabled={!!busy}
                    onClick={() =>
                      void run("Thinking of a few sparks…", async () =>
                        setHelp(await coach({ data: { ...id(), itemId: item?.id, text: text.slice(0, 600), help: true } })),
                      )
                    }
                  >
                    <Lightbulb />
                    Help with my adventure
                  </Button>
                </>
              )}
              {(editing || changing) && !comicChange && (
              <div className="flex flex-wrap gap-2">
                <Button disabled={!!busy || !text.trim() || (changing && !revision.trim())} onClick={() => void draw()}>
                  <Paintbrush />
                  {changing
                    ? "Make this change"
                    : help?.question
                      ? "Draw with my details"
                      : (project.kind === "picture" ? project.images[0] : item?.image)
                        ? "Draw again"
                        : "Draw this scene"}{" "}
                  · {project.kind === "picture" ? "1" : "3"} Glow
                </Button>
                {changing ? (
                  <Button variant="ghost" onClick={() => setChanging(false)}>
                    Never mind
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      disabled={!!busy}
                      onClick={() =>
                        void run("Thinking of a few sparks…", async () =>
                          setHelp(
                            await coach({
                              data: {
                                ...id(),
                                itemId: item?.id,
                                text: project.kind === "story" ? text : text.slice(0, 600),
                                help: true,
                              },
                            }),
                          ),
                        )
                      }
                    >
                      <Lightbulb />
                      Help with my adventure
                    </Button>
                    {(project.kind === "picture" ? project.images[0] : item?.image) && (
                      <Button
                        variant="secondary"
                        disabled={!!busy}
                        onClick={() => {
                          setChanging(true);
                          setRevision("");
                          setHelp(null);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        <Paintbrush />
                        Change something in the picture
                      </Button>
                    )}
                    {drawnComic && (
                      <Button variant="ghost" disabled={!!busy} onClick={() => setStep("react")}>
                        Keep this picture
                      </Button>
                    )}
                  </>
                )}
              </div>
              )}
              {drawnComic && step === "words" && (
                <div className="space-y-2 rounded-2xl border-2 border-border bg-card p-3">
                  <p className="font-display text-xl">💬 Speech bubble</p>
                  <p className="text-muted-foreground">
                    Who is talking, and what do they say out loud? Start with their name so readers know. Or tap “No
                    words needed.”
                  </p>
                  <Input
                    aria-label="Words for this panel"
                    value={dialogue}
                    maxLength={200}
                    disabled={!!busy}
                    placeholder={`${cast.find((c) => selectedIds.includes(c.id))?.title ?? "Hero"}: “Look at that!”`}
                    onChange={(e) => setDialogue(e.target.value)}
                  />
                  {VOICE_IN_NEW_BOXES && (
                    <VoiceButton
                      ageBand={child.age_band}
                      what="the speech bubble words"
                      disabled={!!busy}
                      onText={(t) => setDialogue((v) => appendWords(v, t, 200))}
                    />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={!!busy || !dialogue.trim()} onClick={() => void keepPanel(dialogue)}>
                      Add words
                      <ArrowRight />
                    </Button>
                    <Button size="lg" variant="secondary" disabled={!!busy} onClick={() => void keepPanel("")}>
                      No words needed
                      <ArrowRight />
                    </Button>
                    <Button variant="ghost" disabled={!!busy} onClick={() => setStep("react")}>
                      Back
                    </Button>
                  </div>
                </div>
              )}
              {project.kind === "picture" && project.images[0] && !changing && (
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!!busy}
                  onClick={() =>
                    void run("Saving your finished picture…", async () => {
                      setProject(
                        await finishPicture({
                          data: { ...id(), updatedAt: (projectRef.current ?? project).updatedAt, finished: true },
                        }),
                      );
                      setParty(true);
                      setTimeout(() => setParty(false), 4000);
                    })
                  }
                >
                  <Check />
                  Finish & save to My Album! 🎉
                </Button>
              )}
              {project.kind === "picture" && project.details.mode === "sketch" && (
                <Button
                  variant="secondary"
                  disabled={!!busy}
                  onClick={() =>
                    void run("Finishing your picture…", async () => {
                      const r = await upgrade({ data: { childId: child.id, previewId: project.id, environment: env } });
                      if (!r.ok) throw new Error(r.reply);
                      await reload();
                    })
                  }
                >
                  <Sparkles />
                  Make it print-ready · 2 more Glow
                </Button>
              )}
              {project.kind === "picture" && project.details.mode === "sketch" && (
                <p className="text-sm text-muted-foreground">
                  Optional: Bugley redraws your picture bigger and sharper, perfect for printing or framing. Your
                  picture is already saved without it.
                </p>
              )}
              {project.kind !== "comic" && !changing && item?.image && at < items.length - 1 && (
                <Button
                  disabled={!!busy}
                  onClick={() =>
                    void run("Keeping your scene…", async () => {
                      await reload();
                      setAt(at + 1);
                    })
                  }
                >
                  Love it! Next page
                  <ArrowRight />
                </Button>
              )}
              {((project.kind === "story" && items.every((p) => p.image) && at === items.length - 1) || finaleOn) && (
                <div className={finaleOn ? "space-y-5" : "space-y-3 border-t border-border pt-5"}>
                  {finaleOn && items.length + 2 <= 12 && (
                    // A3.2: grow the same comic instead of starting over. New panels cost Glow only when drawn.
                    <div className="space-y-3 rounded-2xl border-2 border-primary bg-card p-4">
                      <h2 className="text-2xl">Want a longer adventure?</h2>
                      <p className="text-muted-foreground">
                        Add more panels to this comic. Everything you made stays just as it is. Each new panel is 3 Glow
                        when Bugley draws it.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {([2, 4] as const)
                          .filter((more) => items.length + more <= 12 && (more === 2 || band !== "sprouts"))
                          .map((more) => (
                            <Button
                              key={more}
                              size={band === "sprouts" ? "lg" : "default"}
                              variant={more === 2 ? "default" : "outline"}
                              className={band === "sprouts" ? "h-auto min-h-16 whitespace-normal text-xl" : "h-auto min-h-12 whitespace-normal"}
                              disabled={!!busy}
                              onClick={() =>
                                void run("Adding your panels…", async () => {
                                  const first = items.length;
                                  if (text.trim() && text !== item?.description) await saveWords();
                                  await comicEdit({ data: { ...id(), action: "extend", more } });
                                  await reload();
                                  setFinale(false);
                                  setAt(first);
                                })
                              }
                            >
                              <Plus />
                              {band === "sprouts" || more === 2 ? "Keep my story going!" : "Keep going"} · {more} more panels
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}
                  {finaleOn && nameBlock}
                  {finaleOn ? (
                    <CoverPicker
                      band={band}
                      have={glow?.total}
                      busy={!!busy}
                      cover={project.details.cover}
                      coverUrl={project.details.cover ? project.urls[project.details.cover] : undefined}
                      panels={items
                        .filter((p) => p.image && project.urls[p.image])
                        .map((p, i) => ({ id: p.id, image: p.image, url: project.urls[p.image] ?? "", label: `panel ${i + 1}` }))}
                      onPick={(itemId) =>
                        void run("Setting your cover…", async () => {
                          const next = await pickCover({ data: { childId: child.id, id: project.id, itemId } });
                          projectRef.current = next;
                          setProject(next);
                        })
                      }
                      onPaint={() =>
                        void run("Painting the cover…", async () => {
                          await comicEdit({ data: { ...id(), action: "cover", description: coverWords(), op: crypto.randomUUID() } });
                          await reload();
                        })
                      }
                      onPublish={() =>
                        void run("Publishing your adventure…", async () => {
                          for (const p of items.filter((p) => !p.dialogueDone))
                            await comicEdit({
                              data: {
                                ...id(),
                                action: "dialogue",
                                pageId: p.pageId,
                                panelId: p.id,
                                text: p.id === item?.id ? dialogue : "",
                              },
                            });
                          await comicEdit({ data: { ...id(), action: "finish", description: coverWords(), op: crypto.randomUUID() } });
                          await reload();
                          setParty(true);
                          setTimeout(() => setParty(false), 4000);
                        })
                      }
                    />
                  ) : (
                    <>
                    <h2 className="text-2xl">{finaleOn ? "Pick your cover" : "Your adventure is ready! Time for a cover"}</h2>
                    {project.details.cover && (
                      <img
                        src={project.urls[project.details.cover]}
                        alt="Your cover"
                        className="mx-auto max-h-64 rounded-xl border-4 border-primary object-contain shadow-glow"
                      />
                    )}
                    <p className="font-semibold">
                      Tap one of your pictures to use it as the cover (free), or let Bugley paint a brand-new one.
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {items
                        .filter((p) => p.image)
                        .map((p, i) => (
                          <button
                            key={p.id}
                            aria-label={`Use ${project.kind === "comic" ? "panel" : "page"} ${i + 1} as the cover`}
                            aria-pressed={project.details.cover === p.image}
                            disabled={!!busy}
                            onClick={() =>
                              void run("Setting your cover…", async () => {
                                setProject(
                                  await pickCover({ data: { childId: child.id, id: project.id, itemId: p.id } }),
                                );
                              })
                            }
                            className={`overflow-hidden rounded-xl border-4 ${project.details.cover === p.image ? "border-primary shadow-glow" : "border-transparent"}`}
                          >
                            <img src={project.urls[p.image]} alt="" className="aspect-square w-full object-cover" />
                          </button>
                        ))}
                    </div>
                    {project.details.cover && (
                      <Button
                        variant="outline"
                        disabled={!!busy}
                        onClick={() =>
                          void run("Painting the cover…", async () => {
                            await (project.kind === "comic" ? comicEdit : storyEdit)({
                              data: {
                                ...id(),
                                action: "cover",
                                description: coverWords(),
                                op: crypto.randomUUID(),
                              },
                            } as any);
                            await reload();
                          })
                        }
                      >
                        <Paintbrush />
                        Paint a new cover instead · 3 Glow
                      </Button>
                    )}
                    <Button
                      disabled={!!busy}
                      onClick={() =>
                        void run(
                          project.details.cover ? "Publishing your adventure…" : "Painting the cover…",
                          async () => {
                            const action = project.details.cover ? "finish" : "cover";
                            if (project.kind === "comic") {
                              for (const p of items.filter((p) => !p.dialogueDone))
                                await comicEdit({
                                  data: {
                                    ...id(),
                                    action: "dialogue",
                                    pageId: p.pageId,
                                    panelId: p.id,
                                    text: p.id === item?.id ? dialogue : "",
                                  },
                                });
                              await comicEdit({
                                data: {
                                  ...id(),
                                  action,
                                  description: coverWords(),
                                  op: crypto.randomUUID(),
                                },
                              });
                            } else
                              await storyEdit({
                                data: {
                                  ...id(),
                                  action,
                                  description: coverWords(),
                                  op: crypto.randomUUID(),
                                },
                              });
                            await reload();
                            if (action === "finish") {
                              setParty(true);
                              setTimeout(() => setParty(false), 4000);
                            }
                          },
                        )
                      }
                    >
                      {project.details.cover ? "Publish to my shelf! 🎉" : "Make the cover · 3 Glow"}
                    </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** A row of little boxes, one per panel, so younger children can see how long their comic is. */
function PanelDots({ count }: { count: number }) {
  return (
    <span aria-hidden className="flex flex-wrap gap-1">
      {Array.from({ length: Math.max(0, Math.min(count, 12)) }, (_, i) => (
        <span key={i} className="size-4 rounded-sm border-2 border-current opacity-70" />
      ))}
    </span>
  );
}
