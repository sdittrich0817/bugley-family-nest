import { createFileRoute } from "@tanstack/react-router";
import { Eye, Ban, Palette, ShieldCheck, MessageCircle, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BugleyCard } from "@/components/brand/BugleyCard";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Glow } from "@/components/brand/Glow";
import { Bugley } from "@/components/brand/Bugley";
import { useWaitlist } from "@/components/site/WaitlistModal";

const TITLE = "Our mission — Bugley";
const DESC =
  "AI isn't going away. So let's learn it together. Why Bugley exists, and our six promises to your family.";

export const Route = createFileRoute("/mission")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/mission" }],
  }),
  component: Mission,
});

const STORY = [
  "I'm a C-level technology executive, and I watched AI burst onto the scene firsthand. It was scary and exciting. Honestly, it still is.",
  "I'm also the dad of an 8-year-old girl. Some nights it terrifies me to think about the world she'll grow up in.",
  "But tech taught me one thing for sure: you can't run away from it. It keeps moving forward. So you have to embrace it — responsibly, and safely.",
  "One afternoon, trying to get her off a screen, I asked her to write a story. She did. She even put a football player in it, wearing number 15. Turns out she knows her daddy well — I'm a huge Chiefs and Patrick Mahomes fan.",
  "I turned her story into a comic with the AI tools I use every day. She loved it. We did it again, and again, and she kept loving it — because it was hers.",
  "That's when it clicked. Families need this. Kids need to be creative, and to see what they can build while they learn. That's what AI can do. But the tools I used weren't made for kids. So I set out to build something every family could use, safely and responsibly.",
];

const BODY = [
  "Let's be honest. AI can be scary. It changes every month, it shows up in places we didn't expect, and our kids are already using it, whether we know it or not.",
  "We don't think the answer is to hide from it. We think the answer is to learn it together, as families.",
  "Bugley exists to partner with parents so kids grow up understanding AI: how it works, when to trust it, when to question it, and when to put it down. We want them using it responsibly, creatively and safely, and we want parents right there beside them.",
  "AI will keep changing, so Bugley will too. When new tools, new risks or new questions show up, we'll update what we teach. You'll never be left trying to figure it out alone.",
  "Our kids are going to inherit this technology. We want them on the right side of it. That means knowing how to use it well, recognizing when it's being used against them, and helping shape the rules for how it should be used.",
];

const PROMISES = [
  { icon: Eye, title: "Parents stay in charge.", body: "You see what your kids make and what they ask Bugley. Always." },
  { icon: Ban, title: "Your kids are never the product.", body: "No ads. We never sell your family's data." },
  { icon: Palette, title: "Kids are the creators. Bugley helps.", body: "Your child does the thinking, the writing and the deciding." },
  { icon: ShieldCheck, title: "Safety first, fear never.", body: "We teach kids to be careful and curious at the same time." },
  { icon: MessageCircle, title: "We'll be honest with you.", body: "When AI changes, we'll tell you what it means for your family in plain English." },
  { icon: Sprout, title: "We grow with your child.", body: "From their first question at 5 to their first real project at 12." },
];

function Mission() {
  const { open } = useWaitlist();
  return (
    <>
      <section className="bg-muted py-14 sm:py-20">
        <div className="container-page flex max-w-2xl flex-col items-center gap-5 text-center">
          <Glow size="md">
            <Bugley stage="scout" expression="happy" glow size={80} title="Bugley the firefly" />
          </Glow>
          <Badge variant="secondary">Our Mission</Badge>
          <h1 className="text-4xl text-foreground sm:text-5xl">AI isn't going away. So let's learn it together.</h1>
        </div>
      </section>

      {/* Founder story */}
      <section className="container-page py-14 sm:py-20">
        <div className="grid items-start gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="flex flex-col items-center gap-4 text-center md:sticky md:top-28">
            <div
              className="grid size-40 place-items-center rounded-full bg-primary/25 font-display text-5xl text-foreground shadow-soft sm:size-48"
              aria-label="Photo of Shea coming soon"
              role="img"
            >
              SD
            </div>
            <div>
              <p className="font-display text-2xl text-foreground">Shea Dittrich</p>
              <p className="text-muted-foreground">Founder · Dad · Technology executive</p>
            </div>
            <BugleyCard variant="muted" className="text-left">
              <p className="font-display text-lg text-foreground">
                "Helping families navigate a new world is cooler than anything I've ever done in tech. I'm all in."
              </p>
            </BugleyCard>
          </div>
          <div className="flex flex-col gap-5 text-lg leading-relaxed text-foreground">
            <Badge variant="secondary" className="self-start">Why I built Bugley</Badge>
            <h2 className="text-3xl text-foreground sm:text-4xl">It started with a story my daughter wrote.</h2>
            {STORY.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
            <p className="font-display text-xl">— Shea</p>
          </div>
        </div>
      </section>

      <section className="bg-muted py-14 sm:py-16">
      <div className="container-page max-w-2xl">
        <div className="flex flex-col gap-5 text-lg leading-relaxed text-foreground">
          {BODY.map((p) => (
            <p key={p.slice(0, 20)}>{p}</p>
          ))}
        </div>
      </div>
      </section>
      <div className="h-14 sm:h-20" aria-hidden />

      <section className="container-page pb-14 sm:pb-20">
        <SectionHeader title="Our promises to your family" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <BugleyCard key={title} className="flex flex-col gap-3 p-6">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/25 text-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="text-xl text-foreground">{title}</h3>
              <p className="text-muted-foreground">{body}</p>
            </BugleyCard>
          ))}
        </div>
      </section>

      <section className="bg-muted py-14 sm:py-20">
        <div className="container-page flex max-w-2xl flex-col items-center gap-6 text-center">
          <p className="text-xl italic text-foreground">
            Built by a parent who wants the same thing you do: kids who are ready for what's coming.
          </p>
          <Button size="lg" onClick={() => open("start_free")}>Start free</Button>
        </div>
      </section>
    </>
  );
}
