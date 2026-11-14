# Bugley First-Session Experience: Assessment and Proposed Plan

This is an assessment based on reading the app's code. Nothing has been changed. The implementation section only runs if you approve it.

## 1. Today's first-session journey

```text
Parent: /signup (details + adult check) -> consent step -> email verify
     -> /setup (welcome -> add children with PIN or picture password -> done)
     -> /plan, /hub, or tablet setup (/pair -> /kids/install)
Child: /kids-entry (device check) -> /kids "Who's playing?" -> PIN or 3 pictures
     -> Kid Home (same address) -> Quest (/kids/quest) or Studio (/kids/studio)
Studio dashboard -> Create (/kids/studio/v3: picture, comic, story)
                 -> All games (/kids/studio/games: Arcade, 9 games)
```

- Age bands come from the child's age: Sprouts 5–6, Explorers 7–9, Builders 10–12. Each band gets its own look, greeting and read-aloud for Sprouts.
- "Meet Bugley: What is AI, anyway?" exists as the first Quest chapter. It is optional and doesn't show on first login.

## 2. Friction points

Confirmed in the code:
- There's no "first visit" marker for a child. A brand-new child sees the same Kid Home as a returning one.
- Kid Home gives Quest and Studio equal billing, but Play and Create are one level deeper, inside Studio. Your brief wants Play vs Create as the first choice.
- New children with no saved work get an empty-feeling Studio dashboard, because its sections are built from saved projects and favorite games.
- Nothing connects a child's first activity to an AI-learning takeaway, except inside Quest.
- The "hear it again" button (36px) is smaller than the 80px PIN keys.
- Game history (recent games, best scores) is saved only on that device, so it can't tell whether a child is new on a second tablet.

Hypotheses that need testing with families:
- Young Sprouts may not find Studio, then Games, without help.
- Parents may hand off the tablet before showing the child anything, so the first screen has to explain itself.
- Builders (10–12) may find a guided intro babyish unless it's short and skippable.

## 3. Proposed first session by age band

The same five beats for every band: Meet Bugley -> Play or Create -> one short activity -> one AI takeaway -> "keep exploring". Play and Create get same-size cards side by side.

- **Sprouts 5–6:** Bugley reads every line aloud. Big picture cards. Play opens a short, easy game (for example Bugley Guesses). Create opens a Picture. Takeaway: "AI learns from examples, just like you!" About 3–5 minutes.
- **Explorers 7–9:** Short reading plus a voice button. Play opens Dragon Catch or Mystery Manor. Create opens a Comic with a ready-made character. Takeaway is tied to what the game or creation just showed, for example "AI can make mistakes; you're the checker." About 5–8 minutes.
- **Builders 10–12:** Two quick screens. Play opens Cosmic Maze or Doodle Duel. Create opens a Story with Bugley's writing tips. The takeaway asks the child a question back, for example "What did you decide, and what did the AI do?" About 5 minutes.

A "Skip, take me in" button stays visible on every screen. Children can replay the guide any time from Kid Home ("Show me around").

## 4. Minimal, additive plan

1. **Welcome guide on Kid Home.** A new full-screen guide overlay shows the first time a child signs in. It sits on top of the existing Kid Home, with no new pages or changes to existing ones.
2. **Play / Create choice.** These are links into the existing Arcade game and Create V3 starts, with suggested picks for each band. No new games and no new AI drawing.
3. **Takeaway card.** Shown when the child comes back to Kid Home after the first activity. Each game and each Create kind gets one short line, taken from a fixed list.
4. **"First visit" memory per child.** A small new record stores when the guide was seen, skipped and finished. It only adds data; existing records aren't touched. Children can only write their own row, through the server.
5. **Replay and skip.** Kid Home gets a "Show me around" button. Skip marks the guide as seen.
6. **Parent visibility.** The Parent Hub shows a single line: "Finished Bugley's welcome" or "Skipped."

Unchanged: sign-in, PINs, devices, Glow, rewards, scores, billing, Quest/Glimmerwood, saved projects, branding and Bugley art. The guide grants no rewards and never charges Glow.

## 5. What we'd measure

New welcome events, child-scoped and visible to the parent: guide shown, skipped (at which step), Play or Create chosen, first activity started and finished, takeaway seen, replayed later.
Return behavior comes from existing records: a second sign-in within 7 days, plus counts of Studio creations, game sessions and Quest progress. No personality or learning scores.

## 6. Regression testing

- Existing tests for child sign-in, remembered player, trusted device, family, Glow, billing access, play sessions and the curriculum must still pass.
- New tests:
  - The guide shows only when the child has no "seen" record.
  - Skip marks it seen.
  - A child can't write another child's record.
  - The guide grants no Glow or rewards.
  - The suggested games for each band exist in the game catalog.
- Live walkthrough as a test child in each band, on a phone and a tablet: first sign-in shows the guide; second sign-in goes straight to Kid Home; skip works; Play and Create open the existing activities; nothing breaks with reduced motion turned on.

## 7. Risks and decisions for you

- **Is the guide required or optional the first time?** I recommend it shows automatically, with Skip always visible.
- **Which first game and which first Create kind for each band?** The picks in section 3 are my suggestions.
- **Takeaway wording:** you write or approve the lines, the same way you review news responses.
- **Where Quest fits:** should "Meet Bugley" become the next step after the guide?
- **Existing children:** show the guide to them once, or only to children added after launch?
- Risk: adding steps before the fun starts. Keeping each band to 2–3 screens before the activity limits this.
- Dependency: Create V3 picture quality is still only partly proven, which affects first impressions of the Create path.

## Technical details

- New table `child_onboarding (child_id pk, seen_at, skipped_at, completed_at, choice, version)` with RLS: parent select is family-scoped, child writes go only through a server function that checks the child session. Events go to a new `child_onboarding_events` table (insert through the server; parents read).
- `FirstSessionGuide` component mounted in `KidHome` (`src/routes/_kid.kids.tsx`) behind a server check, with `skin-*` tokens, 64px minimum touch targets, Sidekick TTS and the reduced-motion classes.
- Suggested picks and takeaways live in a static map keyed by band, game id and Create kind, checked against `ARCADE_GAMES`.
