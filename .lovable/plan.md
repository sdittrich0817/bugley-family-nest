# Comic Creator 2.0 — Audit Findings and Proposed Plan

Assessment only. Nothing has been changed. Each phase below needs separate approval.

## 1. Current architecture (active V3)

```text
Studio Create -> /kids/studio/v3 (ComicJourney.tsx)
  character: checkCharacter / saveV3CharacterDraft (v3.functions.ts)
             -> makeHeroOptions: 3 previews, 1 Glow (images.server.ts generateHeroOptions)
             -> saveHero / lockCharacter: reference sheet + Character DNA (free)
  comic:     startV3Creation (title, genre, panel count 1-12, default 4)
  panel:     helpV3Scene (coaching question) -> paintV3Scene -> generateImage, 3 Glow
  words:     editComic(dialogue), free
  cover:     reuse a panel (free) or generate one (3 Glow)
  finish:    editComic(finish) -> ComicReader / ComicSlideshow
```

- Image models (live data): character and preview images use `google/nano-banana`; panels use `google/nano-banana-pro` at 2K, both through Replicate, with reference images passed as `image_input`.
- Legacy code: `CreativeWorkspace` still opens saved comics that predate V3. The older guided comic flow (`planComicPicture`, Story Bible, 4/8/12 age-band panels and a wide big-moment panel) is still used for book chapters. `ComicMaker`'s `PanelCanvas` and `ComicReader` are shared and active.
- Typical cost: 12 Glow for four panels with an existing character, plus 1 Glow for a new character and 3 Glow for a generated cover.

## 2. Child journey friction

- Every age group gets the same flow: same steps, same panel count, the same reading and writing demands. The only differences: voice input everywhere the browser supports it, and Sprouts get automatic read-aloud in the reader.
- It takes at least 6 taps to reach the first panel with an existing character, or 8 with a new one, plus typing. The longest waits are three character previews and the reference-sheet build.
- A coaching question can stop "Draw" and require a second tap.
- Sprouts must invent and write a title, character facts and scene descriptions, which is a heavy reading load for ages 5–6.
- Younger children see choices they don't need, such as a panel count from 1 to 12.
- "Draw again" and "Change something" look similar but behave very differently.

## 3. Story Memory gaps (shown in the code)

- No context from earlier panels reaches the image model. `paintV3Scene` sends only the current panel's words, the genre, framing, style and character DNA.
- `helpV3Scene` does see earlier pages, but only to coach the child. That context is never passed on to painting.
- Character references are attached reliably on every generation, including revisions. Locations, objects and side characters mentioned only in text are not remembered.
- V3 comics never use the Story Bible, which only works for book chapters. A new standalone comic inherits no places or events.
- Characters are loaded as they are now, not from the snapshot taken when the comic started. Editing a character later can change art in older comics.

## 4. Why a small change alters other parts of the picture

Shown in the code:
1. A revision regenerates the whole picture with the old panel as a reference. It is not a masked or protected edit.
2. The child's change request is rewritten by AI into a brand-new scene description. The child's exact change words never reach the image model.
3. Text gets cut: first to 600 characters, then to 480 for comics. Scene details can be lost.
4. Each revision re-sends the genre, framing, style and DNA instructions, which invites the model to recompose the scene.
5. The drift check only looks at the character. It never checks whether the background or layout was kept.
6. "Draw again" attaches no earlier image at all. "Change it" in the character builder also regenerates from scratch.

Still guesses until tested: how strongly the model follows references, and the effect of the locked settings.

Other risks: refund errors in the image pipeline are silently ignored. A painting interrupted mid-way may stay stuck as "painting". Restoring a snapshot taken during painting may leave the comic stuck.

## 5. Proposed Comic Creator 2.0 journey

- Keep: character first, My Cast, panel by panel, the child's exact words, voice or typing, the current Glow prices and safety checks.
- Age presets: Sprouts get 3 panels, a title suggestion they can accept, short picture prompts and read-aloud everywhere. Explorers get 4 panels. Builders get 4–8 panels and all the current controls.
- First panel faster: one "Start my comic" screen (title optional, genre defaulted). Coaching sparks appear as optional chips and never block drawing.
- Story so far: a small, child-visible summary (who, where, what just happened) built from the child's saved panels and fed to each new panel.
- Targeted fixes: "Fix one thing" sends the exact change, the original picture and a strict "keep everything else" instruction. A clear "Start this picture over" is kept as a separate choice.

## 6. Prioritized engineering changes

Quick wins (no new tables):
- A1: Send the child's exact change words alongside the internal plan; stop the double cut that drops scene text.
- A2: Send a short "story so far" (previous panel descriptions, the setting, the last image as an extra reference) into `paintV3Scene`.
- A3: Make coaching non-blocking; rename and separate "Fix one thing" from "Start over".
- A4: Surface or retry swallowed refund failures; add recovery for a stale "painting" state, including after a snapshot restore.
- A5: Use the character snapshot taken when the comic started.

Architectural:
- B1: Per-comic Story Memory (characters, places, key objects, events), drawn from the child's words only. Reuse the Story Bible's `absorbAndRecap` structure instead of a second system.
- B2: A layout-preservation check for revisions (compare with the old panel), with the existing free retry.
- B3: Optional masked editing ("tap the part to change") if the chosen model supports it. Needs a provider test first.
- B4: Age-band presets for panel count, prompts and read-aloud.
- B5: Migrate legacy `CreativeWorkspace` comics into the V3 view, read-only first.

## 7. Quality testing framework

- Five fixed child-written stories (one per genre, across the three age groups), 4 panels each, plus 2 scripted revisions per comic. Run before and after each phase on the same model lock.
- Rubric (scored 1–5 by human reviewers): character consistency; story continuity; match to the child's description; whether the requested change was made; whether untouched parts stayed the same.
- Automatic counts: completion rate, generation failures, Glow per completed comic, refund ledger matches, wait time per panel.
- Needs human review: consistency, continuity, adherence, revision accuracy, preservation. Automatic: failures, cost, timing, completion.
- Add tests for `paintV3Scene` prompt assembly, refunds and stale-claim recovery, plus the existing 342 tests.

## 8. Risks and decisions for the founder

- Approve Phase A (quick wins) before any work on Phase B.
- Age presets: is 3 panels for Sprouts acceptable? Should Builders get up to 8?
- Should the last panel's image be sent as a reference? It improves continuity but may carry over mistakes.
- Masked "tap to fix" depends on the provider and may need a different model.
- Legacy comics must keep opening; no existing comics, history, Glow or settings will change.
