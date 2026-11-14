# Bugley First Session: Phase A (Welcome)

This plan uses your refinements and covers Phase A only. I'll stop after Phase A and report back before starting Phase B.

## What the child sees

- **A short greeting.** The first time a new child reaches Kid Home, Bugley appears with one line of greeting (read aloud for Sprouts) and two cards of equal size: **Play** and **Create**. There's no tutorial and no AI lesson.
- **"Skip" is always visible.** It closes the welcome and goes straight to the normal Kid Home.
- **What the cards do in Phase A.** Play opens the existing games page. Create opens the existing Studio. Phase B will add the specific first activity for each age band.
- **"Show me around."** A small button on Kid Home lets any child, new or existing, open the welcome again whenever they like.
- **Three age-band looks.**
  - Sprouts: big picture cards and spoken lines.
  - Explorers: the signature look.
  - Builders: a calmer, shorter greeting.
- **Everything else stays the same.** Quest stays where it is. The welcome never sends children there.

## Who sees it automatically

- **Only children added after launch.** The launch time is recorded once in the database when the feature ships. The welcome opens on its own only for children created after that moment who haven't seen or skipped it.
- **No guessing from missing records.** Every existing child is treated as already established and only sees the welcome through "Show me around."

## What gets recorded

- **One small welcome record per child:** when it was first shown, skipped or finished, and the choice made (Play or Create).
- **A simple event list:** shown, skipped, chose Play, chose Create, replayed.
- **Nothing personal.** No story text, prompts, pictures or other personal details. No outside analytics services.
- **Who can see it.** Parents can see records for their own children. Only the server can write them, after the same child check that Quest answers use.

## Not touched

Games, Studio, ComicJourney, characters, saved projects, Glow, rewards, parent controls, billing, sign-in, device pairing, safety checks, Quest, Glimmerwood and existing records all stay unchanged. Opening the welcome never grants or charges Glow.

## Phase A checks

- **New automated tests:**
  - The welcome opens automatically only for a child created after launch who hasn't seen it.
  - Existing children never see it automatically.
  - Skip and finish are saved, and the welcome stays closed after that.
  - A child can't write another child's record, and a parent can't read another family's records.
  - No Glow or reward changes.
- **Existing tests:** kid sign-in, remembered player, family, Glow and curriculum tests must still pass.
- **Live check on phone and tablet sizes:**
  - A new test child sees the welcome; an existing child doesn't.
  - Skip works, and "Show me around" reopens it.
  - Both cards open the right pages.
  - It works with reduced motion turned on.
  - The test child is removed afterward.

When Phase A is done, I'll report the changed files, the database changes and the test results, then wait for your approval of Phase B.

## Later phases (not in this build)

- **Phase B:** Link each card to a first activity for each age band. This includes checking whether the existing comic workflow supports a guided first panel for Explorers without changing it, or else choosing an existing, already-verified activity and telling you why.
- **Phase C:** Show takeaways only after a real completion or interaction event is detected, never just because the child returned to Kid Home.
- **Phase D:** Show welcome status to parents in the Hub and run the full regression and real-device testing.

## Technical details

- **Migration:**
  - `onboarding_settings` is a single row that stores `welcome_launched_at = now()` when the migration runs.
  - `child_onboarding` stores `child_id` (primary key), `parent_id`, `shown_at`, `skipped_at`, `completed_at`, `choice` (`play` or `create`) and `version`.
  - `child_onboarding_events` stores `id`, `child_id`, `parent_id`, `kind` (from a fixed list) and `created_at`.
  - The new tables come with grants and row-level security: parents get family-scoped SELECT, and there are no client write grants. Writes go through the service role only.
- **Server:**
  - A new file `src/lib/onboarding.functions.ts` holds `getWelcomeState` (returns `{ autoShow }`, where autoShow means created after launch and not yet seen) and `recordWelcome` (validates the kind from an allow-list).
  - Both verify the active child through the existing kid-zone authority helper before writing anything.
- **Interface:** a `FirstSessionWelcome` overlay mounted in `KidHome` inside `src/routes/_kid.kids.tsx`.
  - It uses the `skin-*` tokens, the Bugley SVG, and Sidekick speech.
  - Touch targets are at least 64px, focus is trapped while it's open, Escape skips, and it follows the reduced-motion rules.
- **Docs:** one rule added to `AGENTS.md` describing the welcome gate.
