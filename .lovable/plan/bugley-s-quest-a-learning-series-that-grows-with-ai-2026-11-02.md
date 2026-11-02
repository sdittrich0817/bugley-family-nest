# Bugley's Quest: a learning series that grows with AI

Right now the curriculum is one season with one session and two activities, shown as a plain checklist. This turns it into a story quest that kids want to come back to and parents enjoy joining.

## How it feels

**The story.** Bugley is lost in the Glimmerwood. Each **chapter** is one place on a glowing quest map (e.g. "The Echo Cave: how AI learns from examples"). When a chapter is finished, Bugley gains a new light and the next place on the map opens.

**Each chapter has two parts, about 10–15 minutes in total:**
1. **Solo quest (child, about 8–10 min):** three short story beats in the Kid Zone.
   - *Story:* Bugley sets up the problem, with read-aloud for Sprouts.
   - *Try it:* a hands-on moment, such as sorting, spotting the AI mistake, or choosing a fair answer. The wording changes for each age band.
   - *My idea:* the child picks or types their own answer, which goes through the normal safety check.
2. **Together moment (parent and child, about 5 min):** a "Campfire" card, used at dinner or on the Family Table screen. It has one question, one quick off-screen game, and a line for the parent: "What your child just learned."

**Rewards:** a map light for each chapter and a badge for each season (both already exist). No Glow is spent.

**What parents see:** the Parent Hub shows each child's place on the map, what they chose in "My idea," and that week's Campfire card, plus a nudge when a child finishes a solo quest.

## Evolving as AI evolves

- **Seasons:** Season 1 "Glimmerwood" covers the basics: what AI is, how it learns, mistakes, fairness, privacy, and creating with AI. You review and publish new seasons from the admin page.
- **"Fresh from the news" side quests:** on the news desk, any published story can be turned into a short bonus chapter (one solo quest plus one Campfire card). Bugley drafts it; **you approve the exact words**, the same rule as news publishing. Nothing publishes automatically.

## Starter content

I'll write Season 1 with 6 chapters, each in Sprouts, Explorers and Builders versions, as an **unpublished draft** for you to read and approve in admin before families see it. The current single session stays where it is until you publish.

## Technical details

- Reuse Seasons > Units > Sessions > Activities: unit = chapter, session = solo quest + campfire, activity steps become `story` / `try` / `idea` / `campfire`. Additive migration: new step values, `activities.kind` (choice/sort/free-text with choices in a jsonb field per age version), `units.map_position`, `sessions.source_news_id` (nullable link to `family_ai_news`) and a `quest_responses` table (child, activity, chosen/typed answer; parent-scoped RLS, writes only through a server function using `guardChildText`).
- New Kid Zone route `/kids/quest` (map plus chapter player) inside the existing Kid Zone lock; the mission card on `/kids` links to it.
- Family Table becomes the Campfire screen; the Hub child card gets a map progress strip and recent "My idea" answers.
- Admin: chapter editor fields for kind/choices; news desk gets "Draft a side quest" (AI draft via the Lovable AI Gateway, saved unpublished).
- Tests: chapter unlock order, session completion requiring the solo steps, news side quest never publishing without approval.
