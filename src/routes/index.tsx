import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, HeartHandshake, Palette, ShieldCheck, Users, Sprout, Sparkles, Bug, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BugleyCard } from "@/components/brand/BugleyCard";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Glow } from "@/components/brand/Glow";
import { Bugley, BUGLEY_STAGES } from "@/components/brand/Bugley";
import { useWaitlist } from "@/components/site/WaitlistModal";
import kitchenDusk from "@/assets/illustrations/hero-horizon.jpg";
import fieldJournal from "@/assets/illustrations/hilltop-horizon.jpg";

const TITLE = "Bugley — Learn AI together as a family";
const DESC = "Bugley is the fun, safe way for families to learn AI together, growing with your child from 6 to 15.";

export const Route = createFileRoute("/")({
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
  component: Home,
});

const HOW = [
  { icon: Users, title: "Learn together, every week", body: "One family session. Every kid at their own level." },
  { icon: Sprout, title: "Bugley grows with each child", body: "A personal journey from age 6 to 15." },
  { icon: Palette, title: "Create in Bugley's Studio", body: "Stories, comics, and pictures your kids make themselves." },
];

const LOOP = [
  { icon: Sparkles, title: "Make it", body: "Kids create something with Bugley." },
  { icon: Bug, title: "Break it", body: "They try to catch Bugley's mistakes." },
  { icon: MessageCircle, title: "Think about it", body: "The family talks about what they learned." },
];

const PROMISES = [
  { icon: Eye, line: "Parents see everything." },
  { icon: HeartHandshake, line: "Kids are never the product." },
  { icon: Palette, line: "Kids are the creators." },
  { icon: ShieldCheck, line: "Safety first, fear never." },
];

function Home() {
  const { open } = useWaitlist();
  return (
    <>
      {/* 1. Hero — image-led */}
      <section className="relative isolate flex min-h-[85svh] items-end overflow-hidden lg:min-h-[90svh]">
        <img
          src={kitchenDusk}
          alt="A family at the kitchen table at dusk, kids excited, a golden horizon through the window"
          className="absolute inset-0 -z-20 size-full object-cover object-[60%_center]"
          width={1280}
          height={960}
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-dusk via-dusk/60 to-transparent lg:bg-gradient-to-r lg:from-dusk/90 lg:via-dusk/55" />
        <div className="container-page flex w-full flex-col gap-6 pb-12 pt-40 sm:pb-16 lg:max-w-none lg:pb-24">
          <div className="flex max-w-2xl flex-col gap-6 [text-shadow:0_2px_22px_rgb(0_0_0/0.5)]">
            <Bugley stage="scout" expression="happy" glow size={72} title="Bugley the firefly" />
            <h1 className="text-4xl text-background sm:text-5xl lg:text-6xl">
              Curious, careful, and confident with AI.
            </h1>
            <p className="text-lg text-background/85 sm:text-xl">
              Bugley is the fun, safe way for families to learn AI together, growing with your child from 6 to 15.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => open("start_free")}>Start free</Button>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/co-ops">Book a co-op demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Honest truth */}
      <section className="bg-muted py-14 sm:py-20">
        <div className="container-page max-w-2xl text-center">
          <Badge variant="secondary">The honest truth</Badge>
          <h2 className="mt-4 text-3xl text-foreground sm:text-4xl">AI can feel scary. It isn't going anywhere.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Those worries are real, and we share them. The answer isn't to look away. It's to help our kids grow up curious, careful, and confident with it. Responsibly. Safely. Together.
          </p>
        </div>
      </section>

      {/* 3. How it works */}
      <section className="container-page py-14 sm:py-20">
        <SectionHeader eyebrow="How it works" title="Small steps today. Ready for tomorrow." />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {HOW.map(({ icon: Icon, title, body }) => (
            <BugleyCard key={title} variant="interactive" className="flex flex-col gap-3">
              <Glow size="sm" className="self-start">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Icon className="size-6" /></span>
              </Glow>
              <h3 className="text-xl text-foreground">{title}</h3>
              <p className="text-muted-foreground">{body}</p>
            </BugleyCard>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/how-it-works" className="inline-flex items-center gap-1 font-display text-foreground underline-offset-4 hover:underline">
            See how it works <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* 4. Loop */}
      <section className="bg-leaf/50 py-14 sm:py-20">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader align="left" title="Make it. Break it. Think about it." description="Kids don't just use AI. They learn how it thinks, and where it slips up." />
            <ol className="mt-8 flex flex-col gap-4">
              {LOOP.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="flex items-start gap-4 rounded-2xl bg-card p-5 shadow-soft">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary font-display text-primary-foreground">{i + 1}</span>
                  <div>
                    <p className="flex items-center gap-2 font-display text-lg text-foreground"><Icon className="size-5" />{title}</p>
                    <p className="text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <img src={fieldJournal} alt="A parent and child on a hilltop at dusk, pointing at a path of firefly lights" loading="lazy" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-soft" width={1280} height={960} />
        </div>
      </section>

      {/* 5. Bugley grows up */}
      <section className="container-page py-14 sm:py-20">
        <SectionHeader eyebrow="Bugley grows up" title="A little light that grows with them" />
        <ul className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {BUGLEY_STAGES.map((stage) => (
            <li key={stage} className="flex flex-col items-center gap-3 text-center last:col-span-2 sm:last:col-span-1">
              <Bugley stage={stage} expression="happy" glow size={96} title={`Bugley, ${stage} stage`} />
              <span className="font-display capitalize text-foreground">{stage}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center text-lg text-muted-foreground">Every step your child takes, Bugley's glow grows brighter.</p>
      </section>

      {/* 6. Safety */}
      <section className="bg-muted py-14 sm:py-20">
        <div className="container-page">
          <SectionHeader eyebrow="Our safety promises" title="Hopeful about the future. Serious about safety." />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map(({ icon: Icon, line }) => (
              <li key={line} className="flex items-center gap-4 rounded-2xl bg-card p-5 shadow-soft">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sky text-sky-foreground"><Icon className="size-5" /></span>
                <span className="font-display text-foreground">{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 text-center">
            <Link to="/safety" className="inline-flex items-center gap-1 font-display text-foreground underline-offset-4 hover:underline">
              Read our safety promise <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Co-ops */}
      <section className="container-page py-14 sm:py-20">
        <BugleyCard variant="glow" className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl text-foreground sm:text-3xl">Teaching a co-op?</h2>
            <p className="mt-2 text-lg text-muted-foreground">Bugley is ready for mixed-age groups.</p>
          </div>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/co-ops">Book a demo</Link>
          </Button>
        </BugleyCard>
      </section>

      {/* 8. Pricing teaser */}
      <section className="container-page pb-14 text-center sm:pb-20">
        <p className="font-display text-2xl text-foreground sm:text-3xl">
          Plans from $19/month per family. <span className="text-muted-foreground">Not per kid.</span>
        </p>
        <Link to="/pricing" className="mt-4 inline-flex items-center gap-1 font-display text-foreground underline-offset-4 hover:underline">
          See pricing <ArrowRight className="size-4" />
        </Link>
      </section>

      {/* 9. Final CTA */}
      <section className="bg-dusk py-16 sm:py-24">
        <div className="container-page flex flex-col items-center gap-6 text-center">
          <Glow size="lg"><Bugley stage="navigator" expression="celebrating" glow size={100} title="Bugley celebrating" /></Glow>
          <h2 className="max-w-xl text-3xl text-background sm:text-4xl">The future is coming either way. Let's help them meet it ready.</h2>
          <Button size="lg" onClick={() => open("start_free")}>Start free</Button>
        </div>
      </section>
    </>
  );
}
