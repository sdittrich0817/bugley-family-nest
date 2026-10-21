import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sprout,
  Users,
  Sparkles,
  BookOpen,
  Lightbulb,
  Palette,
  ScanSearch,
  Compass,
  Utensils,
  PencilRuler,
  NotebookPen,
  ArrowRight,
  GraduationCap,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BugleyCard } from "@/components/brand/BugleyCard";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Glow } from "@/components/brand/Glow";
import { Bugley } from "@/components/brand/Bugley";
import { useWaitlist } from "@/components/site/WaitlistModal";

const TITLE = "How it works — Bugley";
const DESC =
  "Bugley in under two minutes: one weekly family session, a journey that grows from 5 to 12, and half the week off-screen together.";

export const Route = createFileRoute("/how-it-works")({
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
  component: HowItWorks,
});

const ECOSYSTEM = [
  {
    icon: GraduationCap,
    title: "Learning",
    body: "A weekly 50-minute family session. Make it, break it, think about it — at each kid's own level.",
    to: "/learning" as const,
    cta: "How they learn",
  },
  {
    icon: Palette,
    title: "Bugley's Studio",
    body: "Where kids make stories, comics, and games — and play adventures with Bugley. Books can be printed and shipped home.",
    to: "/studio-preview" as const,
    cta: "Visit the Studio",
  },
  {
    icon: HeartHandshake,
    title: "Parent Hub",
    body: "You create every account, see everything your kids make, and get a dinner question each week.",
    to: "/safety" as const,
    cta: "How we keep it safe",
  },
];

const LAYERS = [
  {
    icon: Sprout,
    title: "Kid Journey",
    body: "Each child follows their own path from 5 to 12, built on what they've actually mastered — not their age or grade.",
  },
  {
    icon: Users,
    title: "Family Seasons",
    body: "Shared weekly topics the whole family explores together. Every season is new, so nothing ever repeats.",
  },
  {
    icon: Sparkles,
    title: "Living Content",
    body: "AI is changing fast. Bugley adds new units as the world changes, so what your kids learn is never out of date.",
  },
  {
    icon: BookOpen,
    title: "Lifelong Portfolio",
    body: "Everything your kids make is saved across the years — a growing record of what they can do.",
  },
];

const SESSION_STEPS = [
  { title: "Bugley's Hello", mins: 5, note: "Bugley greets each kid at their own level" },
  { title: "Unplugged warm-up", mins: 10, note: "A hands-on game, no screens" },
  { title: "Make it", mins: 15, note: "Kids create something with Bugley" },
  { title: "Break it", mins: 10, note: "They try to catch Bugley's mistakes" },
  { title: "Think about it", mins: 10, note: "The family talks about what they learned" },
];

const EXTRAS = [
  { icon: Utensils, title: "Dinner question", note: "One AI question to talk over at the table" },
  { icon: PencilRuler, title: "Studio time", note: "Kids keep making stories or games on their own schedule" },
  { icon: NotebookPen, title: "Field journal", note: "A few notes on what they noticed" },
];

const STRANDS = [
  { icon: Lightbulb, title: "Understand", line: "Know what AI is and how it works — in plain words." },
  { icon: Palette, title: "Create", line: "Make real things with AI: stories, comics, pictures, games." },
  { icon: ScanSearch, title: "Discern", line: "Spot when AI is wrong, biased, or made something up." },
  { icon: Compass, title: "Decide", line: "Choose when to use AI — and when to do it yourself." },
];

const BANDS = [
  {
    skin: "skin-sprouts",
    stage: "hatchling" as const,
    name: "Sprouts",
    ages: "5–6",
    activity: "Bugley helps them write and illustrate their own bedtime story.",
  },
  {
    skin: "skin-explorers",
    stage: "scout" as const,
    name: "Explorers",
    ages: "7–9",
    activity: "They build a mini comic with AI, then hunt down its mistakes.",
  },
  {
    skin: "skin-builders",
    stage: "engineer" as const,
    name: "Builders",
    ages: "10–12",
    activity: "They fact-check an AI answer and catch what it got wrong.",
  },
];

function HowItWorks() {
  const { open } = useWaitlist();
  return (
    <>
      {/* 1. Intro */}
      <section className="bg-muted py-14 sm:py-20">
        <div className="container-page flex max-w-2xl flex-col items-center gap-5 text-center">
          <Glow size="md">
            <Bugley stage="scout" expression="happy" glow size={72} title="Bugley the firefly" />
          </Glow>
          <Badge variant="secondary">How Bugley works</Badge>
          <h1 className="text-4xl text-foreground sm:text-5xl">One family. Every age. One conversation.</h1>
          <p className="text-lg text-muted-foreground">
            The whole of Bugley in one place: how your kids learn, where they create, and how you stay in the loop.
          </p>
        </div>
      </section>

      {/* 1b. The Bugley world */}
      <section className="container-page py-14 sm:py-20">
        <SectionHeader
          eyebrow="The Bugley world"
          title="Learn it. Make it. Share it at home."
          description="Three parts that work together, all in one family account."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {ECOSYSTEM.map(({ icon: Icon, title, body, to, cta }) => (
            <BugleyCard key={title} variant="interactive" className="flex flex-col gap-3">
              <Glow size="sm" className="self-start">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Icon className="size-6" />
                </span>
              </Glow>
              <h3 className="text-xl text-foreground">{title}</h3>
              <p className="flex-1 text-muted-foreground">{body}</p>
              {to && (
                <Link to={to} className="inline-flex items-center gap-1 font-display text-foreground underline-offset-4 hover:underline">
                  {cta} <ArrowRight className="size-4" />
                </Link>
              )}
            </BugleyCard>
          ))}
        </div>
      </section>

      {/* 2. The four layers */}
      <section className="container-page py-14 sm:py-20">
        <SectionHeader
          eyebrow="The four layers"
          title="Four layers that grow with your family"
          description="A personal path for every kid, a shared rhythm for the whole family."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {LAYERS.map(({ icon: Icon, title, body }) => (
            <BugleyCard key={title} variant="interactive" className="flex flex-col gap-3">
              <Glow size="sm" className="self-start">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Icon className="size-6" />
                </span>
              </Glow>
              <h3 className="text-xl text-foreground">{title}</h3>
              <p className="text-muted-foreground">{body}</p>
            </BugleyCard>
          ))}
        </div>
      </section>

      {/* 3. A sample family week */}
      <section className="bg-leaf/50 py-14 sm:py-20">
        <div className="container-page">
          <SectionHeader
            eyebrow="A sample family week"
            title="One 50-minute session. Small extras all week."
            description="Here's what a real Bugley week looks like — most of it around the table, not in front of screens."
          />
          <ol className="mx-auto mt-10 flex max-w-3xl flex-col">
            {SESSION_STEPS.map((step, i) => (
              <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                {i < SESSION_STEPS.length - 1 && (
                  <span aria-hidden className="absolute left-[27px] top-14 h-[calc(100%-3.5rem)] w-0.5 bg-primary/40" />
                )}
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary font-display text-primary-foreground shadow-soft">
                  {i + 1}
                </span>
                <BugleyCard className="flex flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-4">
                  <div>
                    <p className="font-display text-lg text-foreground">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.note}</p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-sm font-display text-foreground">{step.mins} min</span>
                </BugleyCard>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-center font-display text-lg text-foreground">50 minutes, together. That's the whole session.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {EXTRAS.map(({ icon: Icon, title, note }) => (
              <BugleyCard key={title} variant="muted" className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sky text-sky-foreground">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-display text-foreground">{title}</p>
                  <p className="text-sm text-muted-foreground">{note}</p>
                </div>
              </BugleyCard>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Four strands */}
      <section className="container-page py-14 sm:py-20">
        <SectionHeader
          eyebrow="What kids learn"
          title="Four strands, woven through everything"
          description="Every Bugley week touches all four — whatever your child's age."
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STRANDS.map(({ icon: Icon, title, line }) => (
            <li key={title} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
              <span className="grid size-11 place-items-center rounded-full bg-primary/25 text-foreground">
                <Icon className="size-5" />
              </span>
              <p className="font-display text-lg text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{line}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex justify-center">
          <Button variant="outline" asChild>
            <Link to="/learning">
              See how they learn, age by age <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      {/* 5. Age bands */}
      <section className="bg-muted py-14 sm:py-20">
        <div className="container-page">
          <SectionHeader
            eyebrow="Ages 5 to 12"
            title="Same family session. Different levels."
            description="Every kid works at their own level inside the same weekly topic."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {BANDS.map((band) => (
              <BugleyCard key={band.name} className={`flex flex-col items-center gap-4 text-center ${band.skin}`}>
                <Glow size="sm">
                  <Bugley stage={band.stage} expression="happy" glow size={88} title={`Bugley, ${band.name} stage`} />
                </Glow>
                <div>
                  <p className="font-display text-xl text-foreground">
                    {band.name} <span className="text-muted-foreground">({band.ages})</span>
                  </p>
                </div>
                <p className="text-muted-foreground">{band.activity}</p>
              </BugleyCard>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Off-screen half */}
      <section className="container-page py-14 text-center sm:py-16">
        <p className="mx-auto max-w-2xl font-display text-2xl text-foreground sm:text-3xl">
          About half of every Bugley week happens off-screen, around the table, together.
        </p>
      </section>

      {/* 7. CTA */}
      <section className="bg-dusk py-16 sm:py-24">
        <div className="container-page flex flex-col items-center gap-6 text-center">
          <Glow size="lg">
            <Bugley stage="navigator" expression="celebrating" glow size={100} title="Bugley celebrating" />
          </Glow>
          <h2 className="max-w-xl text-3xl text-background sm:text-4xl">Ready to see it with your own family?</h2>
          <Button size="lg" onClick={() => open("start_free")}>
            Start free
          </Button>
        </div>
      </section>
    </>
  );
}
