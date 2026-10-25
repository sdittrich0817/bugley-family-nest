# Bugley Studio 2.0 — Create-side redesign

Scope: the Create side of the Studio only (pictures, stories, comics, books, characters). Games/PLAY are untouched. Brand, Glow economics, curriculum, and safety systems are preserved.

Decisions locked with Shea:
1. Child chooses story/comic length (short / medium / long) instead of fixed age-band lengths.
2. Hero builder collapses from 7 questions to ~3, with Bugley asking a follow-up whenever the child's answer lacks the detail needed for good art.
3. No separate "Make a Book" door — a comic (or story) can grow into a book by adding chapters/issues.
4. Full version history: undo and restore previous versions of pages, art, and characters.
5. Characters are the heart: kids build a character vault (My Cast) first and build stories from those characters.

## Phase 1 — Character vault and 3-step character builder

The character becomes a first-class thing a child can make anytime, not only inside story setup.

- Studio home gets a clear "My Characters" area (the vault) with a "Build a character" button, alongside Make a Picture / Story / Comic, Continue creating, and My Creations.
- New 3-step builder (replaces the 7-question HeroBuilder):
  1. **What is it?** — child types/speaks freely or picks a tile ("a purple dragon"). If the answer lacks what the art needs (kind of animal, colors, look), Bugley asks one targeted follow-up ("What color is your dragon?") — never a fixed checklist.
  2. **What's it like?** — personality and special thing, with suggestion tiles plus own words.
  3. **What's its name?** — then portrait choices as today (1 Glow, Try again available).
- A short "so far" summary stays visible; all answers feed the existing Character DNA + portrait + reference-sheet pipeline (unchanged).
- Characters remain reusable across pictures, stories, comics — and now editable with versioning (Phase 4).

Files: `HeroBuilder.tsx` (rewrite), `StorySetup.tsx`, `_kid.kids_.studio.tsx`, new vault section; server: reuse `images.functions.ts` character save/lock.

## Phase 2 — Smarter, shorter setup with length choice

- Story and comic setup keep the current friendly screens but:
  - Bugley reads what the child already said and **skips questions it answers** (a "purple dragon afraid of flying" is not asked its animal or color).
  - Child picks **length: Short / Medium / Long** (picture-worded per age: "Little / Middle / Big" for sprouts). Maps to roughly 4/8/12 pages or panels. Stored on the project; no longer derived from age band.
  - Stories get a genre choice like comics have.
- Sprouts keep read-aloud and bigger tiles; builders get more open text room. Same screens, scaled complexity.

Files: `StorySetup.tsx`, `BugleyStep.tsx`, `story.functions.ts`, `comic.functions.ts`, `story.ts`, `comic.ts`.

## Phase 3 — Story plan before production

- After setup, Bugley proposes a short **outline** the child can approve or change:
  - Younger: Beginning / Something happens / Ending.
  - Older: scene-by-scene list with setting, problem, big moment, ending.
- The approved outline is stored in the project's details and becomes the source of truth: each page/panel illustration is planned from the outline + Character DNA + previous pages' scene descriptions, so the whole book hangs together.
- Page-by-page child authorship stays exactly as today — the outline guides, the child still writes every page.

Files: `story.server.ts`, `comic.server.ts` (outline generation + per-page planning), `StoryMaker.tsx`, `ComicMaker.tsx` (outline approval screen).

## Phase 4 — Version history, undo, and editing after "The end"

- **Version history** for story pages, comic panels, and characters: each save of text or art keeps the previous version (new table `studio_versions` storing creation id, page/panel key, prior text/image refs, timestamp; old images are kept in storage, not deleted).
- Child-facing **Undo** ("Take that back") and a simple "Earlier versions" picker per page/panel.
- **Finished stories and comics can be reopened for editing** — the reader gets an "Keep working on it" button that returns to the maker.
- Changing a page's words no longer silently destroys its art: the old art stays in history and the child chooses "New picture" explicitly.
- Character edits create a new character version; existing projects keep the version they were made with.

Files: new migration (`studio_versions`), `story.server.ts`, `comic.server.ts`, `images.functions.ts` (character versions), `StoryMaker.tsx`, `ComicMaker.tsx`, reader views.

## Phase 5 — Books grow from comics and stories

- Any finished comic or story offers "Add a chapter / next issue," which creates or continues a book (existing BookBuilder machinery, reused).
- Book Builder stays the wrapper for chapter order, Story Bible, cover, dedication, print — no new door on Studio home.

Files: `BookBuilder.tsx`, `book.functions.ts`, reader "next chapter" actions (mostly already present — wire-up and polish).

## Phase 6 — Bugley acts, and Glow hardening

- **Structured actions:** Bugley's suggestions become real buttons that do things — "Make the sky darker" (targeted scene edit), "Give Pickles a friend" (opens character builder), "Change the ending" (updates the outline and marks affected pages). The AI proposes actions from an allow-list; the server validates permissions, cost, and state before executing. Chat stays for open conversation.
- **Glow hardening:**
  - Charge only attaches to a delivered image: generation runs in a tracked job; a crash before delivery triggers an automatic refund on next status check (idempotency key per job, so retries never double-charge).
  - Refunds restore the **original glow kind** (daily vs bonus) instead of always bonus.
  - "Out of glow" state: child can still write, plan, edit text, and view everything; Bugley explains positively, no purchase pressure.

Files: `glow.server.ts` (idempotent spend + kind-restoring refund), `images.server.ts` (job tracking), `studio.functions.ts` / `studio-ai.server.ts` (structured actions), `Sidekick.tsx`, `BugleyStep.tsx`, migration for generation-job idempotency keys.

## Verification

- Extend existing vitest suites: length choice mapping, 3-step builder follow-up logic, outline storage, version history save/restore, idempotent glow charge, refund kind restoration.
- Playwright end-to-end on the preview: build a character in 3 steps, make a short comic from it, edit a finished story, undo a change, run out of glow mid-project.
- Regression: existing saved stories, comics, characters, and glow balances open intact (brief's Scenario H).

## Explicitly not changing

Games/PLAY, branding, Bugley mascot, Glow pricing/allowances/reset rules, curriculum, safety guardrails, print pipeline, parent hub. No destructive database changes — all migrations additive.
