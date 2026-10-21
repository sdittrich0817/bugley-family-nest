import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Lightbulb,
  Palette,
  ScanSearch,
  Compass,
  Hammer,
  Bug,
  MessageCircle,
  CalendarDays,
  RefreshCw,
  BookOpen,
  HeartHandshake,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BugleyCard } from "@/components/brand/BugleyCard";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Glow } from "@/components/brand/Glow";
import { Bugley } from "@/components/brand/Bugley";
import { useWaitlist } from "@/components/site/WaitlistModal";

const TITLE = "How they learn — Bugley";
const DESC =
  "How Bugley teaches kids 5 to 12 about AI: make it, break it, think about it — four strands that grow from Sprouts to Builders.";

export const Route = createFileRoute("/learning")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Learning,
});

const METHOD = [
  {
    icon: Hammer,
    title: "Make it",
    body: "Kids start by creating — a story, a comic, a game. Doing comes first, because that's how kids this age learn best.",
  },
  {
    icon: Bug,
    title: "Break it",
    body: "Then they hunt for Bugley's mistakes. Catching AI getting it wrong teaches more than any warning ever could.",
  },
  {
    icon: MessageCircle,
    title: "Think about it",
    body: "The family talks it over. What worked? What was off? When would you rather do it yourself?",
  },
];

const STRANDS = [
  {
    icon: Lightbulb,
    title: "Understand",
    line: "What AI is and how it works.",
    ages: [
      "AI is a helper made by people. It isn't alive.",
      "AI learns from lots of examples, and guesses what comes next.",
      "Why AI is good at some things and bad at others.",
    ],
  },
  {
    icon: Palette,
    title: "Create",
    line: "Make real things, with their ideas in charge.",
    ages: [
      "Tell Bugley a story idea and watch it become pictures.",
      "Plan a comic, write it, and ask AI for just the parts they need.",
      "Design a game or app, test it, and improve what doesn't work.",
    ],
  },
  {
    icon: ScanSearch,
    title: "Discern",
    line: "Spot when AI is wrong or made something up.",
    ages: [
      "Find the silly mistake in Bugley's picture.",
      "Check an AI answer against a book or a grown-up.",
      "Notice when an answer is unfair, one-sided, or invented.",
    ],
  },
  {
    icon: Compass,
    title: "Decide",
    line: "Choose when to use AI — and when not to.",
    ages: [
      "Some things are more fun to do yourself.",
      "Ask: is this my idea, or Bugley's?",
      "Make their own rules for using AI well, and explain why.",
    ],
  },
];

const BANDS = [
  { name: "Sprouts", ages: "5–6", skin: "skin-sprouts" },
  { name: "Explorers", ages: "7–9", skin: "skin-explorers" },
  { name: "Builders", ages: "10–12", skin: "skin-builders" },
];

const SEASONS = [
  {
    icon: CalendarDays,
    title: "Learning comes in Seasons",
    body: "Each Season is a family theme explored a little each week. Every child works at their own level inside it.",
  },
  {
    icon: RefreshCw,
    title: "Each one builds on the last",
    body: "Kids move forward based on what they've shown they can do — not just their age or grade.",
  },
  {
    icon: BookOpen,
    title: "The proof is what they make",
    body: "No tests. Their stories, comics, and games are saved over the years, so you can see how far they've come.",
  },
];

const BY_TWELVE = [
  "Explain what AI is in their own words",
  "Use AI to make something that's truly theirs",
  "Catch AI when it's wrong — and check for themselves",
  "Know when not to use AI at all",
  "Keep personal information private",
  "Talk about AI with the grown-ups in their life",
];

const HARD_TRUTHS = [
  "AI gets things wrong. We show kids, then let them catch it.",
  "AI isn't a person or a friend. Bugley says so, often.",
  "Some things are better done yourself. We celebrate that.",
];

function Learning() {
  const { open } = useWaitlist();
  return (
    <>
      {/* Intro */}
      <section className="bg-muted py-14 sm:py-20">
        <div className="container-page flex max-w-2xl flex-col items-center gap-5 text-center">
          <Glow size="md">
            <Bugley stage="scout" expression="curious" glow size={72} title="Bugley the firefly" />
          </Glow>
          <Badge variant="secondary">How they learn</Badge>
          <h1 className="text-4xl text-foreground sm:text-5xl">They learn AI by using it, questioning it, and talking about it.</h1>
          <p className="text-lg text-muted-foreground">
            No lectures, no scary warnings. Kids 5 to 12 learn the way they learn best: hands-on, with family close by.
          </p>
        </div>
      </section>

      {/* Method */}
      <section className="container-page py-14 sm:py-20">
        <SectionHeader
          eyebrow="The Bugley method"
          title="Make it. Break it. Think about it."
          description="Every session follows the same three steps, so kids always know what comes next."
        />
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {METHOD.map(({ icon: Icon, title, body }, i) => (
            <li key={title}>
              <BugleyCard className="flex h-full flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-full bg-primary font-display text-primary-foreground shadow-soft">
                    {i + 1}
                  </span>
                  <Icon className="size-6 text-foreground" aria-hidden />
                </div>
                <h3 className="text-xl text-foreground">{title}</h3>
                <p className="text-muted-foreground">{body}</p>
              </BugleyCard>
            </li>
          ))}
        </ol>
      </section>

      {/* Strands by age */}
      <section className="bg-leaf/50 py-14 sm:py-20">
        <div className="container-page">
          <SectionHeader
            eyebrow="What they learn"
            title="Four strands that grow with them"
            description="The same four ideas, from age 5 to 12 — just a little deeper each year."
          />
          <div className="mt-10 flex flex-col gap-6">
            {STRANDS.map(({ icon: Icon, title, line, ages }) => (
              <BugleyCard key={title} className="flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/25 text-foreground">
                    <Icon className="size-6" />
                  </span>
                  <div>
                    <h3 className="text-xl text-foreground">{title}</h3>
                    <p className="text-sm text-muted-foreground">{line}</p>
                  </div>
                </div>
                <ul className="grid gap-3 md:grid-cols-3">
                  {BANDS.map((band, i) => (
                    <li key={band.name} className={`rounded-2xl bg-muted p-4 ${band.skin}`}>
                      <p className="font-display text-sm text-foreground">
                        {band.name} <span className="text-muted-foreground">({band.ages})</span>
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{ages[i]}</p>
                    </li>
                  ))}
                </ul>
              </BugleyCard>
            ))}
          </div>
        </div>
      </section>

      {/* Seasons */}
      <section className="container-page py-14 sm:py-20">
        <SectionHeader
          eyebrow="How it adds up"
          title="Small steps, every week, for years"
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {SEASONS.map(({ icon: Icon, title, body }) => (
            <BugleyCard key={title} variant="muted" className="flex flex-col gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-sky text-sky-foreground">
                <Icon className="size-5" />
              </span>
              <p className="font-display text-lg text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </BugleyCard>
          ))}
        </div>
      </section>

      {/* By 12 */}
      <section className="bg-muted py-14 sm:py-20">
        <div className="container-page grid gap-10 md:grid-cols-2">
          <div>
            <SectionHeader eyebrow="The goal" title="By 12, your kid can…" align="left" />
            <ul className="mt-6 flex flex-col gap-3">
              {BY_TWELVE.map((item) => (
                <li key={item} className="flex items-start gap-3 text-foreground">
                  <span className="mt-2 size-2.5 shrink-0 rounded-full bg-primary shadow-glow" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <BugleyCard className="flex flex-col gap-4 self-start">
            <span className="grid size-11 place-items-center rounded-full bg-primary/25 text-foreground">
              <HeartHandshake className="size-5" />
            </span>
            <h3 className="text-xl text-foreground">Honest, never scary</h3>
            <ul className="flex flex-col gap-2 text-muted-foreground">
              {HARD_TRUTHS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </BugleyCard>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-dusk py-16 sm:py-24">
        <div className="container-page flex flex-col items-center gap-6 text-center">
          <Glow size="lg">
            <Bugley stage="navigator" expression="celebrating" glow size={100} title="Bugley celebrating" />
          </Glow>
          <h2 className="max-w-xl text-3xl text-background sm:text-4xl">Learn it together, starting this week.</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => open("start_free")}>
              Start free
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/how-it-works">
                See how it all fits <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
