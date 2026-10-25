# Bugley Studio 2.2 — One creative journey

## Recommendation

Replace the Create-side questionnaire with **one saved project workspace**. Keep the creation visible while the child imagines, adds characters, writes, draws and edits. **Imagine → Make → Finish** are orientation markers, not steps to complete in order.

Wrap existing creative services in one workspace; do not replace the app or image pipeline. Prove comics first, then storybooks and pictures. Games stay unchanged.

## 1. What currently fragments the journey

- **The project begins too late.** The opening idea, recognized details and character choices remain temporary until story/comic setup is complete. Leaving or refreshing during setup can lose them.
- **Character creation already returns to the same setup**, and can receive the opening idea's name and appearance. However, it replaces the entire screen, so the comic disappears while the child builds a character. The standalone character path returns home.
- **Idea-first still becomes a questionnaire.** Style, hero, missing place/problem, length and additional cast are controlled by numbered setup states. Hero building still asks personality, special detail and name even when some information was supplied earlier.
- **The outline is a separate screen**, not an evolving storyboard that remains available while making panels.
- **Making is panel-by-panel or page-by-page.** Saving a scene can immediately trigger review and paid illustration. A general busy state replaces the creation with a waiting screen.
- **Studio suggestions can switch tools.** Starting a story/comic via a suggestion clears its selected ID rather than acting on the current project.
- **Saved creations reopen, but unfinished setup does not.** Pictures also have temporary setup state; generated pictures save, but the current album lacks an editable picture reopen path.
- **History is narrower than previously described.** Current snapshots hold text, image and description—not complete project changes or all comic layers. Undo removes a history entry. That is not full, non-destructive version history.

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

Use the existing creation record as the project's identity, including before the first drawing. Save the original safe idea, recognized facts, current activity, approved cast, visual selection, outline approval and stable page/panel IDs.

- Autosave guarded creative edits independently of drawing; saving, planning, character selection and text editing remain free.
- A refresh or tomorrow's visit reopens the same project from My Creations, including pre-drawing drafts.
- Persist character-editor inputs and generated preview references where safe so returning does not require repeating details or paying again just to see an existing preview.
- Keep one durable authoritative project; temporary editor input and loading state are not a second project.
- Preserve optimistic save protection. A stale window reloads/reconciles by page/panel ID rather than overwriting someone else's newer edits.
- Save outline approval explicitly. Resume must not silently skip an unapproved storyboard.

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

- **Draft compatibility:** current readers expect fully shaped story/comic details. Introduce backward-compatible, versioned workspace metadata and kind-specific draft readers before saving incomplete projects. Do not feed draft payloads directly to legacy production/print parsers.
- **Data changes:** prefer additive JSON metadata in existing creation records; no new projects table or new creation kind is currently justified. Full history may need an additive migration for complete snapshots and non-destructive restore. Review that migration before applying it; do not rewrite historical creations.
- **Full history:** extend rather than assume existing undo covers everything. Preserve scene text, dialogue/layers, cast/reference revisions, outline and relevant metadata. Restore becomes a new revision; protected image/model locks are never weakened.
- **Cast and visual locks:** current creation services cap cast at three and books support at most three locked characters. Keep those limits; validate attachments server-side. Preserve book-wide style/model locks and reference provenance. A newly approved reference does not retroactively redraw art.
- **Safety and access:** all new child-text paths retain moderation, parent notifications and verified child/family ownership. Unsafe input gets a recoverable correction in the same workspace. No direct browser writes or new upload/camera features.
- **Glow:** no price, allowance, reset or chargeable-action changes. No drawing on workspace open, autosave, resume or character selection. Preserve operation IDs across retries, existing refunds and generation claims; keeping a workspace visible must not cause duplicate requests.
- **Generation limitations:** retain fail-closed image and drift checks. Audit and report provider/time-out/idempotency gaps before claiming dependable multi-panel generation. Never weaken checks to make the journey appear smoother.
- **Age bands:** preserve Sprouts 5–6, Explorers 7–9 and Builders 10–12. The brief's 5–7 / 8–10 / 11–12 ranges describe guidance intent, not a change to established family placement.
- **Performance:** measure idea-to-visible-workspace, safe save, interpretation and generation separately. Faster orientation is not evidence that AI generation itself is faster.

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