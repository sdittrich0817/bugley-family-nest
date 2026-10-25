# Character-first Bugley Create

## The new journey
1. **Choose a character:** start with “Make a new character” or “My Characters,” not a comic idea or a required Bugley-written story arc.
2. **Describe a new character:** one roomy box for the child's own description. Carry forward everything they provide: name, creature/type, appearance, colors, clothing and accessories. Bugley asks one focused question at a time only for genuinely missing details. “No clothes” is a valid choice; do not force outfits, personality questionnaires or suggestion tiles. Offer ideas through an optional “Help me think” action.
3. **Make and approve the character:** show the description alongside portrait choices, with the existing Glow price before generation. Allow description changes and another paid preview, then approve and save to My Characters. Existing characters skip rebuilding. Keep the selected character visible and carry it into the next step.
4. **Choose what to make:** Picture, Comic or Story, after character selection/approval. Keep the character's approved look throughout, and permit adding more saved/new characters without starting over.

## Comic experience
- Ask for the story name and desired **number of panels** at the start. Treat panels as the child-facing length choice; automatically arrange them into readable/printable pages rather than confusing page count with panel count. Show the resulting page count separately where useful.
- Open a blank first panel for the child's description, then work through panels one by one. Keep completed panels accessible for edits.
- Bugley asks only for missing visual essentials, such as where the scene happens or what the character is doing. Do not delay every panel with unnecessary questions.
- Optional “Help with my adventure” offers short, editable story-arc sparks; never require accepting an AI-written arc before drawing, and never replace the child's text.
- Show the drawing's Glow cost before the child requests it. After painting, offer speech words or skip, then the next panel.
- “Change something” accepts natural requests such as “Make the sky nighttime.” Preserve the scene, approved character and unaffected panels; show the redraw cost before making the revised picture. Do not discard the existing drawing before a replacement succeeds.
- Finish with cover and reader; retain reopen, saved progress, history and book continuation.

## Pictures and stories
- Use the same selected character and description-first approach for pictures: describe the scene, fill only necessary gaps, generate, and request specific changes.
- Stories ask for a title and chosen length, then keep the child's exact words page by page. Bugley coaches only when requested or when essential context is missing; illustration guidance does not become AI-authored story text.
- Preserve saved character, style, artwork references and progress when moving through either experience.

## A bigger helping Bugley
- Increase Bugley's size wherever he acts as a flying guide or companion across the site, starting with Create and shared help displays.
- Give him gentle movement around the active area, without covering the child's writing, artwork or buttons. Keep a stable resting position and respect reduced-motion preferences.
- Leave logos, wordmarks, child avatars and illustrative Bugley stage galleries unchanged. Game workflows and rules remain unchanged.

## Delivery order
1. Larger shared helping Bugley and the new/saved character entry, freeform character probing, approval and output chooser.
2. Child-titled, variable-length comics with per-panel descriptions, optional arc help and targeted picture revisions. Verify the complete comic journey before making it the default.
3. Apply the same journey to pictures and stories, then connect the revised Create entry on Studio home. Existing projects must still reopen safely.

## Technical approach
- Reuse existing character creation/approval, safety guards, image pipeline, Character Lock, Glow accounting, private storage and history. No new authentication or separate project database.
- Refactor the V3 orchestration rather than adding another competing Create experience. Retain legacy readers and compatibility for existing four-panel V3 comics and other saved work.
- Persist character draft/progress before project type selection using the existing server-owned creation storage where compatible; keep character approval distinct from comic/story/picture identity so changing output type cannot corrupt a saved character.
- Replace hard-coded four-scene assumptions throughout V3 creation, proposals, revision bounds and panel selection. Validate allowed lengths on the server using existing project limits; explain the selectable range before spending Glow.
- Guard every new description, follow-up, title and revision before AI use or save. Keep family ownership and selected-child checks, immutable character references and locked styles.
- Add concrete rule tests for selected character carry-through, chosen panel count, optional outlines, preserved child words, revision scope and failed-redraw preservation. Run existing relevant character/comic/story/workspace tests.
- Verify signed-in new/existing-character journeys, comic finish and reopen, picture/story creation and revisions, Glow deductions and mobile/desktop layouts. Use existing family Glow only; report any generation checks blocked by balance rather than topping it up.

## Approval
This changes the order and structure of Create. Implementation starts after approval of this revised plan; no application changes have been made in this review.