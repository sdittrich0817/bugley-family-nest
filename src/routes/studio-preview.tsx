import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BookMarked,
  Image,
  Library,
  MoonStar,
  PenLine,
  Quote,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BugleyCard } from "@/components/brand/BugleyCard";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Glow } from "@/components/brand/Glow";
import { Bugley } from "@/components/brand/Bugley";
import { useWaitlist } from "@/components/site/WaitlistModal";
import comicAdventure from "@/assets/illustrations/studio-comic-adventure.jpg";
import comicMystery from "@/assets/illustrations/studio-comic-mystery.jpg";
import comicSpace from "@/assets/illustrations/studio-comic-space.jpg";
import studioStory from "@/assets/illustrations/studio-story.jpg";
import studioPicture from "@/assets/illustrations/studio-picture.jpg";

const TITLE = "Bugley's Studio — Bugley";
const DESC =
  "Kids write and decide. Bugley suggests, illustrates, and asks what happens next. Comics, illustrated stories, and pictures — saved to every child's own shelf.";

export const Route = createFileRoute("/studio-preview")({
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
  component: StudioPreview,
});

const COMICS = [
  {
    src: comicAdventure,
    alt: "Kid-made comic cover: a young explorer crossing a rope bridge over a jungle river at sunset",
    genre: "Adventure",
    title: "The Bridge Beyond",
    line: "Nine panels, all drawn by the kid who thought it up.",
  },
  {
    src: comicMystery,
    alt: "Kid-made comic cover: a young detective following glowing footprints down a village street at dusk",
    genre: "Mystery",
    title: "The Night Footprints",
    line: "The clues were planted on purpose. One was hidden.",
  },
  {
    src: comicSpace,
    alt: "Kid-made comic cover: two kids in a cardboard rocket ship waving at a friendly one-eyed alien",
    genre: "Space",
    title: "Three Days to Nowhere",
    line: "Made by two siblings who could not agree on the ending.",
  },
];

const RULE = [
  {
    icon: PenLine,
    title: "Kids write. Kids decide.",
    body: "The characters, the trouble, the ending — that is their call. Bugley never finishes the story for them unless a child asks.",
  },
  {
    icon: WandSparkles,
    title: "Bugley suggests, illustrates, and asks",
    body: "Stuck? Bugley offers three ideas and draws whatever the child describes. Then he always asks the same thing: \"what happens next?\"",
  },
];

const GLOW_RULES = [
  {
    icon: Image,
    title: "The glow powers pictures",
    body: "Every picture Bugley illustrates takes a little glow. It is the one thing that runs low.",
  },
  {
    icon: MoonStar,
    title: "It refills every night",
    body: "While your family sleeps, the glow comes all the way back. Every morning starts full.",
  },
  {
    icon: Quote,
    title: "Story writing never runs out",
    body: "Words are always free. Writing, naming, plotting, and asking questions never use a single bit of glow.",
  },
];

const SHELF = [
  {
    icon: Library,
    title: "Everything is saved to their own shelf",
    body: "The first wobbly comic and the latest one, side by side. Nothing gets overwritten or lost when a kid starts something new.",
  },
  {
    icon: BookMarked,
    title: "Printed Family Story Book",
    body: "Once a year, turn a family's best stories and pictures into a real book for the coffee table.",
    comingSoon: true,
  },
];

function StudioPreview() {
  const { open } = useWaitlist();
  return (
    <>
      {/* 1. Intro */}
      <section className="bg-muted py-14 sm:py-20">
        <div className="container-page flex max-w-2xl flex-col items-center gap-5 text-center">
          <Glow size="md">
            <Bugley stage="scout" expression="curious" glow size={72} title="Bugley the firefly" />
          </Glow>
          <Badge variant="secondary">Bugley's Studio</Badge>
          <h1 className="text-4xl text-foreground sm:text-5xl">Your kids are the creators. Bugley helps.</h1>
          <p className="text-lg text-muted-foreground">
            Comics, illustrated stories, and pictures that your children make themselves — with a firefly who draws
            the pictures and never takes over the story.
          </p>
        </div>
      </section>

      {/* 2. What kids make */}
      <section className="container-page py-14 sm:py-20">
        <SectionHeader
          eyebrow="What kids make"
          title="Comics in any genre, stories with pictures, and drawings that are all theirs"
          description="Kids pick a genre, tell Bugley what happens, and leave with something finished — not a half-finished idea."
        />
        <ul className="mt-10 grid gap-6 sm:grid-cols-3">
          {COMICS.map((comic) => (
            <li key={comic.title}>
              <div className="overflow-hidden rounded-2xl border border-border shadow-soft">
                <img
                  src={comic.src}
                  alt={comic.alt}
                  loading="lazy"
                  width={768}
                  height={1024}
                  className="h-auto w-full"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="leaf">{comic.genre}</Badge>
                <span className="text-xs text-muted-foreground">Placeholder example</span>
              </div>
              <p className="mt-1 font-display text-lg text-foreground">{comic.title}</p>
              <p className="text-sm text-muted-foreground">{comic.line}</p>
            </li>
          ))}
        </ul>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <img
              src={studioStory}
              alt="Kid-made illustrated story: an open picture book showing a child reading aloud to a glowing firefly beside a tent at night"
              loading="lazy"
              width={1024}
              height={768}
              className="h-auto w-full"
            />
            <figcaption className="p-5">
              <Badge variant="sky">Illustrated story</Badge>
              <p className="mt-2 font-display text-lg text-foreground">The Tent on Quiet Lake</p>
              <p className="text-sm text-muted-foreground">
                Written by a 7-year-old, illustrated by Bugley from her description of the light.
              </p>
            </figcaption>
          </figure>
          <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <img
              src={studioPicture}
              alt="Kid-made picture: a crayon drawing of a friendly dragon on a lakeshore watching a paper boat near a castle"
              loading="lazy"
              width={1024}
              height={768}
              className="h-auto w-full"
            />
            <figcaption className="p-5">
              <Badge variant="sky">Picture</Badge>
              <p className="mt-2 font-display text-lg text-foreground">Dragon, Paper Boat, Castle</p>
              <p className="text-sm text-muted-foreground">
                One line from a kid, one finished scene — then she painted over the dragon's tail on purpose.
              </p>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* 3. The rule */}
      <section className="bg-leaf/50 py-14 sm:py-20">
        <div className="container-page">
          <SectionHeader
            eyebrow="The rule"
            title="Kids write and decide. Bugley suggests, illustrates, and asks."
            description="This one rule keeps every creation your kid's own."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {RULE.map(({ icon: Icon, title, body }) => (
              <BugleyCard key={title} className="flex flex-col gap-3">
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
        </div>
      </section>

      {/* 4. The glow, simply */}
      <section className="container-page py-14 sm:py-20">
        <SectionHeader
          eyebrow="The glow, simply"
          title="Bugley's glow powers pictures. That is all you need to know."
          description="No points, no streaks, nothing to chase. The glow is only about pictures."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {GLOW_RULES.map(({ icon: Icon, title, body }) => (
            <BugleyCard key={title} variant="muted" className="flex flex-col gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-primary/25 text-foreground">
                <Icon className="size-5" />
              </span>
              <p className="font-display text-lg text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </BugleyCard>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <Glow size="sm">
            <Bugley stage="hatchling" expression="happy" glow size={64} title="Bugley with a full glow" />
          </Glow>
          <p className="max-w-md text-muted-foreground">
            If the glow is low, a child can still write all evening. Only the drawing waits until morning.
          </p>
        </div>
      </section>

      {/* 5. Shelf + printed book */}
      <section className="bg-muted py-14 sm:py-20">
        <div className="container-page">
          <SectionHeader
            eyebrow="Their shelf"
            title="Everything they make is saved — and one day it becomes a book"
            description="A shelf that grows from the first wobbly comic to the newest one."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {SHELF.map(({ icon: Icon, title, body, comingSoon }) => (
              <BugleyCard key={title} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Glow size="sm" className="self-start">
                    <span className="grid size-12 place-items-center rounded-2xl bg-sky text-sky-foreground">
                      <Icon className="size-6" />
                    </span>
                  </Glow>
                  {comingSoon && <Badge variant="outline">Coming soon</Badge>}
                </div>
                <h3 className="text-xl text-foreground">{title}</h3>
                <p className="text-muted-foreground">{body}</p>
              </BugleyCard>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CTA */}
      <section className="bg-dusk py-16 sm:py-24">
        <div className="container-page flex flex-col items-center gap-6 text-center">
          <Glow size="lg">
            <Bugley stage="navigator" expression="celebrating" glow size={100} title="Bugley celebrating" />
          </Glow>
          <h2 className="max-w-xl text-3xl text-background sm:text-4xl">
            Give your kids something they made themselves.
          </h2>
          <Button size="lg" onClick={() => open("start_free")}>
            Start free <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </>
  );
}
