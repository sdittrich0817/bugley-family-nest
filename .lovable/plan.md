# Comic Creator 2.0 — Phase A2: Story Memory and Long-Comic Consistency

Updated from your A2 approval (sections 1–5). Section 6 onward of your document was cut off, so this plan is waiting on that part. A3 (making things simpler for children) is not part of this work.

## 1. Story Memory (stored in the comic itself, no new tables)
- After a panel is drawn and saved, Bugley records what that panel established:
  - places, important objects, supporting characters and key events;
  - each item keeps the panel it came from and the child's exact words it came from;
  - items stay in story order.
- **Exact words first.** Each item is a short excerpt copied from the child's description, not a summary. Items that aren't found word for word in that panel's text are thrown out.
- **No guesses.** Items that are uncertain or contradict each other are dropped. Bugley never adds motivations, relationships or events.
- **Newer wins.** When a later panel explicitly changes something ("the crystal breaks", "now they're in the snow"), the newer item replaces the older one for drawing. The current panel always comes first.
- **Never blocks a save.** Memory is recorded after the panel saves. If recording fails, the panel stays saved and drawing uses the A1 "story so far" as today.

## 2. Keeping memory in step with the comic
- Each memory item is tied to the exact version of its panel (its words and picture). Memory only counts for a panel while that version is still current.
- Memory stays correct when a panel is:
  - edited: its items no longer count until it is redrawn;
  - redrawn: its items are recorded again;
  - cleared: its items are removed;
  - restored to an earlier version: memory is rebuilt from the restored panels;
  - added: new panels start with no memory.
- A slow, out-of-date memory update can never overwrite newer work. It saves only if the comic and that panel haven't changed since it started; otherwise it's thrown away.
- Older comics with no memory work exactly as today.

## 3. Frozen characters for everyone in the comic
- Each character gets their own frozen copy. A character added after the first panel is frozen before they are ever drawn.
- A frozen copy is never swapped for the live character.
- If a needed frozen copy can't be made, drawing stops **before any Glow is charged**. The child sees a friendly "try again" message.
- Characters can still only use their own family's pictures.

## 4. Covers
- Painted covers use the comic's frozen characters and the established story details.
- The child's own cover words come first, if they wrote any.
- Same price (3 Glow) and same steps.

## 5. Revision measurement (report only)
- After a "change something" redraw, a private check compares the old and new pictures:
  - was the requested change made?
  - did anything else change?
- It only records the result. There is no automatic redraw, and the child's Glow and steps don't change.
- The log uses the existing private image-check log and keeps no child words: only the panel, the outcome and a short category of what changed.

## What stays the same
- Screens, buttons and wording in the comic maker.
- Glow prices, image model and provider, and safety screening.
- My Cast, stories, pictures, games, Quest, Parent Hub, billing and accounts.
- Existing comics and their saved versions stay readable and unchanged.
- Earlier panels' pictures are not sent along for new panels.

## Testing
- New automated tests:
  - memory items come only from the child's exact words, linked to their panel and in order;
  - newer facts replace older ones;
  - the current panel wins;
  - uncertain or contradictory items are rejected;
  - edit, redraw, clear, restore and new-panel cases;
  - an out-of-date memory update is discarded;
  - a failed memory update still saves the panel;
  - a late-added character is frozen before drawing;
  - a failed freeze stops before charging Glow;
  - covers use frozen copies, with the child's cover words first;
  - the revision log stores no child text;
  - older comics without memory still work.
- Full regression suite (361 tests).
- Controlled picture test with a temporary test family, deleted afterward: long comics, a late-added character, covers and one-detail revisions. **Budget waits on the rest of your document** (the earlier proposal was a $15 cap).

## Waiting on you
- Section 6 onward of your approval was cut off at "Do not add the proposed…". Please resend that part, especially the user-experience, testing/budget and stop instructions.

## Technical details
- `comic-continuity.ts` (pure helpers):
  - `StoryMemory` items `{ kind, excerpt, panelId, panelStamp, order, supersedes? }`;
  - `panelStamp` = hash of the description and image path;
  - `groundItems` keeps an item only if its excerpt appears in the panel text; it rejects duplicates, conflicting items and unconfirmed supersede links;
  - `liveMemory` keeps only items whose stamp matches the current panel, then applies supersedes;
  - `memoryPrompt` is budgeted below the child's words in `buildPanelPrompt`.
- `comic-memory.server.ts` (new): `notePanel` makes one strict-schema `aiObject` call with excerpts only. It returns `excerpt` plus `supersedes` indexes into the existing memory, and input is treated as data. The result is written with a compare-and-set on `updated_at`, plus a re-check of the panel stamp; on a mismatch it is dropped. Best effort, called after the successful save in `paintV3Scene`.
- `restoreWorkspace` filters memory to the restored panels' stamps.
- `snapshotCast` append mode for missing ids, run before the claim and charge. Its failure throws a recoverable error with no claim made.
- `pickCastSnapshot` also stays strict: any missing snapshot means stop, not fall back. Older comics that never had a snapshot keep their current behavior.
- V3 comic cover path in `comic.functions.ts`: passes `castSnapshot` and puts the child's cover text first, then `memoryPrompt`.
- Revision check: one vision call after a successful V3 comic revision. It writes `{ changeApplied, unrelatedChange: none|small|big, category }` to `drift_checks` (service-role only), with no child text.
- Rules added to `src/lib/AGENTS.md`. No Glow, price, model or provider changes.

Stop after A2 and report: changes, any migration, test results, picture-test findings, cost and limits.
