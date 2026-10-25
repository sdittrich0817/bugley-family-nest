# Bugley Studio 2.2 — One creative journey

## Recommendation

Replace the Create-side questionnaire with **one saved project workspace**. Keep the creation visible while the child imagines, adds characters, writes, draws and edits. **Imagine → Make → Finish** are orientation markers, not steps to complete in order.

Wrap existing creative services in one workspace; do not replace the app or image pipeline. Prove comics first, then storybooks and pictures. Games stay unchanged.

## 1. What currently fragments the journey

- Opening ideas and setup choices are temporary; the project is saved only after setup completes.
- Character creation already returns to the same setup and accepts supplied name/appearance, but replaces the screen and hides the comic. Standalone character creation returns home.
- Idea-first still becomes numbered style/hero/place/problem/length/cast questions. Hero building asks personality, accessories and name even when details already exist.
- Outlines are separate screens, not persistent storyboards. Production is page/panel-by-page/panel; saving words can automatically trigger review and paid art, while busy screens hide the creation.
- Studio suggestion actions can switch tools and clear selected creation IDs.
- Saved creations reopen, but setup drafts do not; pictures lack an editable album reopen path.
- History is not yet full: snapshots store text/image/description, omit complete layers/project changes, and undo removes an entry.

## 2. The workspace the child sees

Choosing **Comic**, **Storybook** or **Picture** immediately opens its workspace: idea box, output name and blank canvas. Submitted words appear while safety checks and saving run; drawing is never automatic.

Throughout the project:

- The comic storyboard, storybook pages or picture stays central and visible.
- Characters and creative actions sit beside or below it; on phones, focused editors open over the same workspace and return to it.
- Bugley gives short contextual help without replacing the canvas or dominating it.
- Imagine, Make and Finish reflect saved content. The child can revisit activities rather than advance through a rigid wizard.
- Saving, saved, retry and conflict states are explicit. A project is only called saved after confirmation.
- Length remains the child's choice, available in the workspace rather than a mandatory setup stop. Optional settings have visible, changeable defaults.

My Characters and My Creations remain accessible libraries. Opening one during creation must not discard or replace the active project.

## 3. Characters become an in-project activity

The character area offers existing approved characters and **Add a character**. A focused editor keeps the project's name and storyboard visible or immediately recoverable behind it.

1. Carry forward supplied name, appearance and relevant traits from the original idea.
2. Show an editable character summary; ask a focused follow-up only when necessary to draw it well. Personality/accessories are optional refinements, not admission requirements.
3. Use the existing preview generation and approval services, with the existing cost shown before generation.
4. On approval, save the character in My Characters and attach its approved ID/reference version to this same project.
5. Close the editor and continue the comic without going home or reselecting Comic.

Characters can be added during Make. Changing an approved appearance creates a new approved reference revision for this project; it must not silently change previously drawn panels or other projects. Explain which future or selected drawings use the new appearance. Existing consistency limits remain in force; this proposal does not promise unlimited locked cast.

## 4. Save and resume

Use the existing creation record as durable identity before drawing. Save the safe original idea, recognized facts, activity, cast/reference versions, visual selection, outline approval and stable page/panel IDs.

Autosave guarded edits separately from drawing. My Creations and the resume URL reopen the same draft tomorrow, including character-editor inputs and safe preview references. Only confirmed saves say “Saved.” Failed saves retain local input and offer retry.

Use existing optimistic concurrency protection; reconcile conflicts by stable IDs, never overwrite newer work with stale whole-project state. Keep one authoritative project, not independent copies inside each editor. Resume must preserve pending storyboard approval.

## 5. Comic journey, beginning to end

1. **Choose Comic:** the workspace opens instantly, with an idea box and blank storyboard.
2. **Describe the idea:** “A purple dragon named Pickles who is scared of flying.” Show those words immediately; safely save and interpret them without asking again for purple, dragon or Pickles.
3. **Meet Pickles:** select an existing character or preview and approve Pickles inside the workspace. Style has a changeable default before art locking.
4. **Shape the adventure:** show optional, editable storyboard suggestions. The child chooses the direction and length. Missing essentials get focused help, not a full questionnaire.
5. **Write and draw:** the child writes scene descriptions and dialogue. Save the words first; generate selected ready panels only after showing the actual existing Glow cost. Keep the storyboard visible while drawings arrive. Any multi-panel generation is bounded, resumable and charged through existing per-image rules.
6. **Edit freely:** select any panel, change words, reposition bubbles, change a scene or regenerate its art. Untouched panels remain intact. Add approved characters without resetting the comic. Paid redraws are explicit; text edits are free.
7. **Review and finish:** preview the comic, name it, and explicitly approve any chargeable cover generation. Finish is a saved status, not a permanent lock on editing.
8. **Return or grow:** reopen this comic or use the existing book/next-issue path. Preserve chapter links, cast, visual locks and continuity.

Bugley proposes plans and short idea sparks; **the child still authors every story sentence, scene and line of dialogue**. Approving an AI storyboard never silently inserts AI-written story text.

## 6. What is reused

Keep existing brand/age skins, Bugley and voice controls; character preview/approval, DNA and references; story/comic load/edit/planning and rendering; picture preview/upgrade; private creation/image storage, family access, safety/notifications and Glow; album lifecycle, book/chapter conversion, Story Bible and parent-controlled print/export.

Question components can supply individual controls, but numbered screens no longer define the journey. Keep old makers until replacements and their dependencies work.

## 7. Risks and safeguards

- **Draft compatibility:** existing readers expect production-ready details. Add versioned, kind-specific draft metadata/readers before saving incomplete projects; preserve legacy content and print parsers. Reuse existing creation kinds/records, not a new projects table.
- **Migration:** additive JSON metadata should cover drafts. Complete history may require an additive migration for full snapshots; inspect before applying, without rewriting historical creations.
- **History:** current undo is incomplete/destructive. Include dialogue/layers, cast/reference revisions, outlines and scene content; restoring creates a new revision and never weakens protected art/model locks.
- **Cast/locks:** current services cap cast at three; books support three locked characters. Preserve those limits, book-wide visual locks and reference provenance. Attachments require server validation; new references do not retroactively redraw art.
- **Safety/access:** retain moderation, parent notifications and child/family ownership on every new path. Unsafe ideas remain correctable within the workspace. No direct browser writes, uploads or camera features.
- **Glow:** no changes to prices, allowances, resets or chargeable actions. No generation on open/save/resume/selection. Keep retry operation IDs, generation claims and refunds; a persistent screen must not duplicate requests.
- **Provider limits:** retain fail-closed image/drift checks. Report timeout or idempotency gaps before promising reliable multi-panel generation; never weaken checks for smoothness.
- **Age bands:** retain Sprouts 5–6, Explorers 7–9, Builders 10–12. The brief's different ranges inform guidance, not family placement changes.
- **Performance:** measure visible workspace, safe save, interpretation and generation separately. Faster orientation does not prove faster AI.

## 8. Phased implementation and acceptance checks

### Milestone 1 — Shared workspace and durable comic draft
Build the shared shell, typed state, safe initial save, resume identity/URL and legacy adapters.

**Pass:** the workspace opens before AI finishes; an idea survives refresh; rejected input can be corrected; existing creations still open; saving/resuming spends no Glow.

### Milestone 2 — Complete comic journey
Integrate in-project characters, visible storyboard, saved outline approval, independent writing/drawing, selected-panel edits, finish/reopen and complete revision restoration.

**Pass:** Pickles never leaves his comic; supplied facts are not requested again; approval attaches the character; editing panel four preserves panels one–three; resume preserves approvals/reference revisions; generated art reads back through the UI.

### Milestone 3 — Storybooks and pictures
Reuse the shell/save contract with kind-specific editors. Preserve exact story words, chapter continuity and the shorter picture preview/upgrade path; enable picture reopen/edit.

**Pass:** old/new creations reopen; picture preview costs 1 Glow, upgrade 2 more; story writing is free; book/print links remain compatible.

### Milestone 4 — Refinement and regression
Remove obsolete transitions only after replacement coverage. Test phone/tablet/laptop, established age bands, supported voice/read-aloud, save conflicts, isolation, moderation, reference locks, history and normal/error/retry Glow paths. Record actual timings.

**Pass:** saved-project flows succeed end-to-end; no duplicate charges or automatic drawings; accounts, curriculum, Parent Hub, books and games remain intact. Report device/provider/testing limitations honestly.

## Approval boundary

This is an architecture proposal only. No application behavior, family data, drawing services or Glow balances have been changed. Structural implementation begins only after approval.