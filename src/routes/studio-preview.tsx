import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Blocks,
  BookMarked,
  Compass,
  Gamepad2,
  Hammer,
  Image,
  Library,
  Map as MapIcon,
  MoonStar,
  PenLine,
  Printer,
  Puzzle,
  Quote,
  Sparkles,
  Spline,
  Truck,
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
import studioPrintBook from "@/assets/illustrations/studio-print-book.jpg";
import studioBookshelf from "@/assets/illustrations/studio-bookshelf.jpg";
import studioGamePlay from "@/assets/illustrations/studio-game-play.jpg";
import studioGameCreate from "@/assets/illustrations/studio-game-create.jpg";

const TITLE = "Bugley's Studio — Bugley";
const DESC =
  "One studio, two doors. Stories: kids write comics, illustrated stories, and books of what they build. Games: they play adventures with Bugley, then make their own. Everything is saved to their own shelf.";

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

const DOORS = [
  {
    icon: Library,
    name: "Stories",
    headline: "Comics, illustrated stories, and books of what they build",
    body: "Kids pick a genre and tell Bugley what happens. He draws the pictures, offers ideas when asked, and always hands the decisions back.",
    anchor: "#stories",
    cta: "See the stories",
  },
  {
    icon: Gamepad2,
    name: "Games",
    headline: "Play adventures with Bugley. Then make your own.",
    body: "Kids step into guided story games, solve puzzles, and invent games the family can play — choices and endings written by them.",
    anchor: "#games",
    cta: "See the games",
  },
];

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

const PLAY_GAMES = [
  {
    icon: Compass,
    title: "Mystery adventures",
    body: "Kids explore a story, gather clues, and ask Bugley for a hint when they get stuck.",
  },
  {
    icon: Puzzle,
    title: "Puzzle quests",
    body: "Mazes, treasure hunts, and matching games. When a child struggles, the help changes — not just the difficulty.",
  },
  {
    icon: Sparkles,
    title: "Invent-a-world adventures",
    body: "They choose what happens next while Bugley brings a guided story to life around them.",
  },
];

const MAKE_GAMES = [
  {
    icon: MapIcon,
    title: "Choose-your-path adventures",
    body: "Kids write the choices and the endings, then the whole family plays the story they built.",
  },
  {
    icon: Blocks,
    title: "Puzzle makers",
    body: "Build a maze, a scavenger hunt, or a matching game using clues and drawings they made themselves.",
  },
  {
    icon: Spline,
    title: "Game worlds",
    body: "Characters from their comics become a place to walk through, search, and explore.",
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
    body: "Stuck? Bugley offers three ideas and draws whatever the child describes. Then he always asks the same thing: “what happens next?”",
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
    title: "Books you can order and hold",
    body: "A shelf of work turns into printed books, shipped to your house — from a first comic to a story with chapter after chapter. Ordering is being set up now.",
    comingSoon: true,
  },
];

const BOOK_KINDS = [
  {
    icon: BookMarked,
    title: "Comic books",
    body: "A run of panels becomes a real comic — their cover, their order, their ending. A quick adventure or a growing series, made their way.",
  },
  {
    icon: Hammer,
    title: "Books of what they build",
    body: "A blanket fort, a marble run, a board game they invented. They write it up, Bugley illustrates the steps, and it becomes a how-to book someone else could follow.",
  },
];

const ORDER_STEPS = [
  {
    icon: Library,
    title: "Pick what goes inside",
    body: "Choose the comics, stories, or build pages you want between one cover. Nothing gets picked for you.",
  },
  {
    icon: Printer,
    title: "Order it in Bugley",
    body: "Parents choose the layout and review the size, page count, and price before placing an order.",
  },
  {
    icon: Truck,
    title: "It comes to your house",
    body: "Made by our print partner and shipped straight to your door.",
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
            One studio, two doors. <span className="font-semibold text-foreground">Stories</span> for comics,
            illustrated books, and drawings. <span className="font-semibold text-foreground">Games</span> for playing
            adventures and inventing their own.
          </p>
        </div>
      </section>

      {/* 2. The two doors */}
      <section className="container-page py-14 sm:py-20">
        <SectionHeader
          eyebrow="Two doors, one studio"
          title="Stories and games, in the same place"
          description="A character made in one door can show up in the other. Same shelf, same glow, same rules."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {DOORS.map(({ icon: Icon, name, headline, body, anchor, cta }) => (
            <BugleyCard key={name} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Glow size="sm" className="self-start">
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                    <Icon className="size-6" />
                  </span>
                </Glow>
                <h3 className="text-2xl text-foreground">{name}</h3>
              </div>
              <p className="font-display text-lg text-foreground">{headline}</p>
              <p className="text-muted-foreground">{body}</p>
              <a
                href={anchor}
                className="mt-1 inline-flex w-fit items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
              >
                {cta} <ArrowRight className="size-4" />
              </a>
            </BugleyCard>
          ))}
        </div>
      </section>

      {/* 3. Stories */}
      <section id="stories" className="scroll-mt-28 bg-leaf/50 py-14 sm:py-20">
        <div className="container-page">
          <SectionHeader
            eyebrow="Door one — Stories"
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
                <div className="mt-3">
                  <Badge variant="leaf">{comic.genre}</Badge>
                </div>
                <p className="mt-1 font-display text-lg text-foreground">{comic.title}</p>
                <p className="text-sm text-muted-foreground">{comic.line}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Every example here is stand-in art we made for this preview. A real shelf will be full of your kids' work.
          </p>

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
        </div>
      </section>

      {/* 4. Games */}
      <section id="games" className="scroll-mt-28 container-page py-14 sm:py-20">
        <SectionHeader
          eyebrow="Door two — Games"
          title="Play an adventure. Then build one nobody has played before."
          description="Games are part of the studio, not a separate app. Kids play inside guided worlds, then turn their own ideas into something the family can play."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <img
              src={studioGamePlay}
              alt="Two children on a rug at dusk holding a tablet, with a paper castle, a winding path, a friendly dragon, and a treasure chest unfolding out of the screen while a glowing firefly hovers nearby"
              loading="lazy"
              width={1024}
              height={768}
              className="h-auto w-full"
            />
            <figcaption className="p-5">
              <Badge variant="leaf">Play with Bugley</Badge>
              <p className="mt-2 font-display text-lg text-foreground">Step into a story that answers back</p>
              <p className="text-sm text-muted-foreground">
                Guided worlds with rules Bugley can follow — not an open chat box.
              </p>
            </figcaption>
          </figure>
          <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <img
              src={studioGameCreate}
              alt="Three children around a low wooden table at dusk inventing a board game from hand-drawn tiles, a crayon maze, and paper characters, with a glowing firefly hovering over the table"
              loading="lazy"
              width={1024}
              height={768}
              className="h-auto w-full"
            />
            <figcaption className="p-5">
              <Badge variant="sky">Make your own</Badge>
              <p className="mt-2 font-display text-lg text-foreground">Their rules, their map, their ending</p>
              <p className="text-sm text-muted-foreground">
                A game a kid invents is a story they have to explain — which is the whole point.
              </p>
            </figcaption>
          </figure>
        </div>

        <h3 className="mt-14 font-display text-2xl text-foreground">Play with Bugley</h3>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {PLAY_GAMES.map(({ icon: Icon, title, body }) => (
            <BugleyCard key={title} className="flex flex-col gap-3">
              <Glow size="sm" className="self-start">
                <span className="grid size-12 place-items-center rounded-2xl bg-sky text-sky-foreground">
                  <Icon className="size-6" />
                </span>
              </Glow>
              <p className="font-display text-lg text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </BugleyCard>
          ))}
        </div>

        <h3 className="mt-14 font-display text-2xl text-foreground">Make your own</h3>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {MAKE_GAMES.map(({ icon: Icon, title, body }) => (
            <BugleyCard key={title} variant="muted" className="flex flex-col gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-primary/25 text-foreground">
                <Icon className="size-5" />
              </span>
              <p className="font-display text-lg text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </BugleyCard>
          ))}
        </div>

        <BugleyCard className="mt-12 flex flex-col gap-4 border-primary/30">
          <div className="flex items-center gap-3">
            <Glow size="sm" className="self-start">
              <Bugley stage="hatchling" expression="thinking" glow size={56} title="Bugley thinking about game rules" />
            </Glow>
            <p className="font-display text-xl text-foreground">How we keep games safe</p>
          </div>
          <p className="text-muted-foreground">
            Games run on rules Bugley can follow, not open-ended chat. Kids pick from choices the game already knows,
            every reply is checked before it reaches them, and if something fails a check the game falls back to a
            safe path. That keeps play predictable — it does not make the AI perfect, and we will never claim it does.
          </p>
          <p className="text-sm text-muted-foreground">
            No ads, no purchases a child can make, no streaks to keep. Play is not timed or scored against anyone.
          </p>
        </BugleyCard>
      </section>

      {/* 5. The rule */}
      <section className="bg-muted py-14 sm:py-20">
        <div className="container-page">
          <SectionHeader
            eyebrow="The rule"
            title="Kids write and decide. Bugley suggests, illustrates, and asks."
            description="This one rule applies to stories and games alike, and it keeps every creation your kid's own."
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

      {/* 6. The glow, simply */}
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

      {/* 7. Shelf + printed book */}
      <section className="bg-leaf/50 py-14 sm:py-20">
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

      {/* 8. Printed books, ordered in Bugley */}
      <section className="container-page py-14 sm:py-20">
        <SectionHeader
          eyebrow="Printed books"
          title="Comics and build books, printed and shipped to your door"
          description="Kids turn their work into books of their own, from a few pages of ideas to chapter after chapter. Parents choose layouts and order right in Bugley — shipped straight to your house."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {BOOK_KINDS.map(({ icon: Icon, title, body }) => (
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

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <img
              src={studioBookshelf}
              alt="A low shelf at home holding five small printed books a kid made, each with a hand-drawn cover"
              loading="lazy"
              width={1024}
              height={768}
              className="h-auto w-full"
            />
            <figcaption className="p-5">
              <p className="font-display text-lg text-foreground">A little book. Or a big idea that keeps growing.</p>
              <p className="text-sm text-muted-foreground">
                Most books will be short, but they do not have to stay that way. Some kids will keep adding chapters
                until their story fills a much bigger book.
              </p>
            </figcaption>
          </figure>
          <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <img
              src={studioPrintBook}
              alt="A parent and two children at a kitchen table at dusk, looking through a small printed book together"
              loading="lazy"
              width={1024}
              height={768}
              className="h-auto w-full"
            />
            <figcaption className="p-5">
              <p className="font-display text-lg text-foreground">Ordered in Bugley, delivered to your house</p>
              <p className="text-sm text-muted-foreground">
                Pick what goes between one cover, choose a layout, and review the book before ordering it to your door.
              </p>
            </figcaption>
          </figure>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {ORDER_STEPS.map(({ icon: Icon, title, body }) => (
            <BugleyCard key={title} variant="muted" className="flex flex-col gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-primary/25 text-foreground">
                <Icon className="size-5" />
              </span>
              <p className="font-display text-lg text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </BugleyCard>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Printed-book ordering is coming soon, with books made by a print partner. A minimum page count may apply;
          we are still working out the printing details. The Family Story Book is also on the way.
        </p>
      </section>

      {/* 9. CTA */}
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
