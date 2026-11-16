# Comic Creator 2.0 — Phase A2 Proposal (Story Memory)

You haven't sent a written A2 brief, so this proposal builds on the "next phase" from the audit and the A1 test results. Please approve, change or trim it. Nothing will be built until you approve.

## Why A2
A1 raised the average comic score from 2.8 to 4.9 on 4-panel stories. The remaining gaps:
- **Long comics forget.** The "story so far" keeps the last 3 panels in full and shortens older ones. In 8- and 12-panel comics, a place or object from panel 1 can fade by panel 9.
- **New friends added mid-comic aren't frozen.** If a child adds a second character after the first draw, that comic goes back to using live characters, so later character edits can change it.
- **Covers ignore the frozen characters and the story.** "Paint a new cover" uses the live character and only the first panel's words.
- **Small changes can still spill over.** In the "make the sky purple" test, the sun also turned purple. Nothing measures this today.

## What A2 would do

### 1. Comic Story Memory (no new tables)
- After each panel draws successfully, Bugley notes what that panel *established*, using only the child's words for that panel:
  - **places** (the kitchen, the snowy mountain)
  - **important objects** (the purple star crystal, the red sail)
  - **story friends** who aren't My Cast characters (Bo the yellow duck with a blue bow tie)
  - **key events** (Pip found the map)
- Saved inside the comic itself, with the panel each note came from.
- **Facts only from the child.** Every note must use words from the child's own description; anything that doesn't is dropped. Bugley never invents events, and his picture notes never become facts.
- **Stays in sync.** If the child rewrites or redraws a panel, that panel's notes are replaced. If a panel is cleared, its notes go.
- The drawing instructions get a short "Established in this story" list (most relevant first), plus the last few panels' words as today. The current panel still wins when the story changes on purpose.
- Costs no Glow (one small text check per finished panel, on Bugley's side). If the note-taking fails, the panel still saves normally, with today's continuity.
- Older comics: memory builds from their saved panels the next time a panel is drawn. Saved data otherwise stays as it is.

### 2. Freeze every comic character
- Characters added after the first draw get their own frozen copy, added to the comic's existing ones. Characters already frozen are never re-copied.
- Restoring earlier work keeps the frozen copies, the same as in A1.

### 3. Covers use the comic's characters and story
- "Paint a new cover" and the automatic cover use the frozen characters and the Story Memory, so the cover matches the comic. Price unchanged (3 Glow).

### 4. Measure unwanted changes on revisions (report only)
- After a "Change something in the picture" redraw, a quick picture check compares the old and new pictures. It notes whether anything changed that the child didn't ask for.
- The result is logged only. No automatic redraw, and no change to what the child sees or pays. This gives us real numbers before deciding on a fix in a later phase.

## What A2 does not change
- No new screens or buttons in the comic maker. Story Memory works behind the scenes. (See decision 1.)
- Glow prices, image model and provider, safety screening, character creation, My Cast, stories, pictures, games, Quest, Parent Hub, billing and accounts all stay as they are.
- Older comics and their saved versions stay readable and unchanged.
- No previous-panel images are attached. Continuity stays text-only, as approved in A1.

## Testing
- New automated tests:
  - memory notes come only from the child's words;
  - rewriting or clearing a panel replaces its notes;
  - "the current panel wins" still applies;
  - memory size limits never cut the child's current words;
  - a character added later gets frozen, and existing copies stay untouched;
  - covers use the frozen copies;
  - older comics without memory still work;
  - a failed note-taking step doesn't block a panel.
- Full regression suite, currently 361 tests.
- **Controlled picture test** (temporary test family, deleted afterward; no real child or Glow):
  - three long comics (8, 10 and 12 panels) in which a panel-1 place, object or friend must come back late in the story;
  - a mid-comic added character, followed by a character edit;
  - a cover check;
  - three one-detail revisions to collect the unwanted-change numbers.
  - Before and after, same model and settings. Hard cap of **$15** in drawing credit (about $8 expected), with a spend counter that stops first.
- Outputs: side-by-side sheets and a scoring sheet with blank columns for your scores, saved to Files.

## Decisions for you
1. **Should children see what Bugley remembers?** The default is hidden (no screen changes). Option: a small "Bugley remembers…" card on the panel screen where the child can remove a note that's wrong. That card would be a small screen addition.
2. **Revision check:** report only (default), or also allow one automatic free redraw when a big unwanted change is detected? A redraw costs us drawing credit, never the child's Glow, and adds about 30–60 seconds of waiting.
3. **Picture test budget:** is a $15 cap OK?

## Technical details
- `src/lib/comic-continuity.ts`:
  - `StoryMemory` type and pure `mergeMemory`, `dropPanelMemory` and `memoryPrompt` helpers;
  - a grounding check that keeps a note only if its key words appear in that panel's child description;
  - `buildPanelPrompt` gains a budgeted `memory` part, trimmed before the child's words.
- `src/lib/comic-memory.server.ts` (new): `notePanel(details, panel)` calls `aiObject` with a strict schema (places/objects/friends/events, max 15 words each), treats input as data, then grounds the result and merges it into `details.storyMemory` keyed by panel id. Called after a successful save in `paintV3Scene`, best effort, then a second optimistic persist that does not touch paint state.
- `src/lib/workspace.server.ts`: `snapshotCast` gets an append mode for ids missing from `castSnapshot`. `pickCastSnapshot` stays all-or-nothing, so partial coverage never mixes frozen and live characters silently.
- `src/lib/comic.functions.ts` cover path: for V3 comics with a `castSnapshot`, pass it to `generateImage` and add `memoryPrompt` to the cover description.
- Revision check: after a successful V3 comic revision, one vision call (old vs new picture plus the child's change) writes `{ unrequestedChange: none|small|big, note }` to the existing `drift_checks` log with a `revision` tag. No schema change if the existing columns fit; otherwise one additive nullable column.
- `restoreWorkspace` keeps `storyMemory` together with the restored version's panels, so memory always matches the panels it describes.
- Rules added to `src/lib/AGENTS.md`. No changes to Glow functions, prices, models or providers.

Stop after A2 and report: files and functions changed, any migration, test results, picture-test findings, cost and remaining limits.
