# Comic Creator 2.0 — Phase A1 Plan

Scope: story continuity, how faithfully pictures follow the child, and reliability in the current V3 Comic Creator. No screen or design changes. Glow prices, image model and provider, safety checks, and all other Studio, Arcade, Quest, parent, billing and account features stay as they are. Stop after A1.

## 1. Keep the child's exact words (`paintV3Scene`, `src/lib/v3.functions.ts`)
- Build the panel instructions in labelled parts, not by rewriting the child's text.
  - **Child's scene (exact):** the saved panel description, never replaced.
  - **Child's requested change (exact):** sent word for word on revisions.
  - **Illustration notes (AI-added):** the revision planner's output now only adds visual notes. It is told not to contradict or drop the child's words.
- Remove the double cut (600, then 480 characters). A new pure helper, `buildPanelPrompt` in `src/lib/comic-continuity.ts`, sets fixed budgets for each part. The child's words are kept whole, and only the lower-priority parts (continuity notes, then illustration notes) are shortened.
- If the child's own words exceed the supported length, the panel stops with a clear "make this shorter" message and no charge, instead of silently cutting text. The current limit is already 600 characters, so nothing new is blocked in practice.

## 2. Lightweight story continuity (no new tables)
- A new pure helper, `buildContinuity(pages, panelId)`, gathers from the saved comic only:
  - earlier panel descriptions that were finished, written by the child (the last few in full, older ones briefly);
  - names of the comic's approved characters.
- Labelled as "Earlier in this story (the child's words)". It is followed by: "If the current panel differs, the current panel wins."
- No AI extraction of places or objects. The earlier words carry them as the child wrote them, so nothing invented becomes a fact.
- Previous-panel images are **not** attached. Character references still are, as today. Text continuity only for A1; no reliable automatic rule for picking a helpful earlier image was found.

## 3. Character snapshots
- Today a comic stores only the date each character was last changed. Older character looks are not kept anywhere.
- From A1 onward: on the first panel draw, store a frozen copy (`details.castSnapshot`, saved inside the existing comic record) of each locked character: DNA, portrait and reference image paths, name and style.
- **Immutable references:** at snapshot time, copy the portrait and reference-sheet files into a private, versioned path (`<family>/snapshots/<comicId>/<characterId>-<version>/…`) in the same private bucket, with the same family-scoped access. The snapshot points to those copies, so later character edits or deletions can't change or remove a comic's references. Character editing itself is unchanged.
- Later draws use that snapshot. The image paths are checked against the family's own files before use.
- Comics without a snapshot (all existing comics) keep using the current character exactly as today. No existing data is changed.

## 4. Revision fidelity
- Keep the original panel as the first reference, as today.
- Send the exact change request plus a clear "change only this; keep layout, background, colors, objects, poses and camera angle the same."
- Same model and provider; this is not a masked edit.

## 5. Failure recovery (one operation ID ties everything together)
- The existing per-draw `op` ID becomes the single key for the claim, the charge (`glow_spend` already keyed by op), the save, the failure and the refund (`refund:<op>`).
- Guarantees: a stale op can't save (saving requires `paintOp === op`, and the claim must still be "painting"); a refund needs a recorded charge, no recorded refund, and no successful save for that op; a stale claim always resets, so the child can always retry.
- Validate the threshold: measure real generation times from the image logs (`drift_checks` timestamps per request). Keep 10 minutes only if it is comfortably above the slowest observed run; otherwise raise it and report the number.
- **Refunds:** add an idempotent refund keyed by the original operation (`glow_refund_op`). The same failure can never refund twice.
  - The image pipeline (`images.server.ts`) and V3 save-failure refunds use it.
  - Refund failures are logged and written to an admin alert instead of being silently dropped.
  - The child sees "Your Glow will be returned" only when the refund really succeeded.
- **Stuck painting:** a "painting" claim older than 10 minutes counts as stale. The next load or draw resets it to "failed". The original art is never touched.
  - A refund happens only if a charge exists for that operation and no refund was recorded.
  - A late-finishing old operation cannot overwrite newer work, because saving checks that the operation still owns the claim.
- **Snapshot restore:** when restoring comic or story history, the paint state is normalized to idle, as already done for pictures. Restore is refused while a live painting is running.

## 6. Tests (new, plus all existing tests)
- `comic-continuity.test.ts`:
  - context assembly and ordering;
  - the current panel wins;
  - the exact revision wording appears verbatim;
  - length budgets never cut the child's words, and oversize text is rejected explicitly.
- Snapshot selection: a snapshot is used when present, older comics fall back to the current character, and image paths from another family are rejected.
- Refund idempotency (pure decision logic plus a migration-level check); stale-claim detection; restore normalization.
- Existing comic data still loads unchanged, and project history entries remain readable.
- Run the full test suite (342+).

## 7. Controlled image-quality evaluation (approved, $25 hard cap)
- **Order:** capture the **baseline with the current code first**, before any change to how pictures are made. Then implement A1 and rerun the identical cases with the same model and settings.
- **Cases:** five fixed child-style stories × 4 panels, plus three hard continuity cases: a recurring object, a location change, and a one-detail revision. About 29 panel images per run. One fixed test character is made once and reused in both runs.
- **Cost estimate:**
  - about $0.15 per 2K panel image from the current panel model;
  - about 30 images per run, typically about $4.50 (up to about $13 if every drift retry fires);
  - both runs together: about $9 typical, under $25 in the worst case.
  - A spend counter in the evaluation script stops before any call that would pass $25, and reports instead.
- **Isolation:** a temporary test family and child, created only for this test, with test Glow. No real child, Glow balance or project is touched. The test family, its records and its files are deleted afterward. The before/after images are kept separately as review files.
- **Output:** side-by-side comparison images for each case, saved to your Files. A scoring sheet (1–5) for character consistency, story continuity, scene fidelity, revision accuracy and unwanted changes. My scores are labeled as reviewer scores, kept separate from automated counts (failures, retries, time, cost).

## Technical details
- Migration: one new `glow_refund_op(_child, _op, _amount, _reason)` function. It is security definer, callable by the service role only, records `refund:<op>` in `glow_ops`, and writes the ledger. No table changes.
- Files: `src/lib/v3.functions.ts` (paintV3Scene), `src/lib/images.server.ts` (generateImage prompt parts, snapshot-aware reference loading, refunds), `src/lib/glow.server.ts` (refundGlowOnce), `src/lib/workspace.ts` / `workspace.functions.ts` (stale claim, restore normalization), new `src/lib/comic-continuity.ts` and tests. Plus a rule in `src/lib/AGENTS.md`.
- No changes to the UI, models, prices, moderation or legacy CreativeWorkspace.

## Regression checks
- Full test suite plus the new tests.
- Live checks with the test family: an existing comic and its history open; character editing works; Glow charge and refund amounts are correct in the ledger; an interrupted draw recovers; the snapshot survives a later character edit; safety screening is unchanged.

Stops after A1; a completion report covers changes, tests, comparisons, scores, credits spent, limits and an A2 recommendation.
