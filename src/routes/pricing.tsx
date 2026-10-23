import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Coins, Gift, MoonStar, PenLine, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BugleyCard } from "@/components/brand/BugleyCard";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Glow } from "@/components/brand/Glow";
import { Bugley } from "@/components/brand/Bugley";
import { PLANS } from "@/lib/plans";

const TITLE = "Pricing — Bugley";
const DESC =
  "One price per family, not per kid. Plans from $19/month with a 14-day free trial. About $12 per family per month for co-ops of 10 or more.";

export const Route = createFileRoute("/pricing")({
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
  component: Pricing,
});


const GLOW_FACTS = [
  { icon: Sparkles, title: "Glow powers pictures", body: "Every picture your child asks Bugley to make spends a little glow." },
  { icon: MoonStar, title: "It refills every night", body: "While your kids sleep, Bugley's glow recharges for the next day." },
  { icon: PenLine, title: "Story writing never uses glow", body: "Writing stories is always free. Your kids will never be cut off mid-story." },
];

const GLOW_COSTS = [
  { what: "A sketch", cost: "1 glow" },
  { what: "A finished picture", cost: "3 glow" },
  { what: "Writing a story", cost: "Always free" },
];

const FAQS = [
  {
    q: "Will my kids get frustrated when glow runs out?",
    a: "Most kids never do. Glow refills every night, story writing never uses any, and ten glow a day covers a lot of pictures. If a big creation day comes up, you can gift bonus glow from the Parent Hub.",
  },
  {
    q: "Can my kids buy anything?",
    a: "No. Kids never see a store, a price tag, or a buy button. Every purchase and every account lives with you, the parent. Nothing inside Bugley can be bought by a child.",
  },
  {
    q: "Is anything else limited?",
    a: "No. Every plan includes every Season, the full Parent Hub, and your kids' whole portfolio. The only daily limit is glow, and it exists so Bugley stays affordable for one family price.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from the Parent Hub in a couple of clicks, and your family's work stays on their shelf. We would rather you stay because your kids love it than because you are stuck.",
  },
];

function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <>
      {/* 1. Intro */}
      <section className="bg-muted py-14 sm:py-20">
        <div className="container-page flex max-w-2xl flex-col items-center gap-5 text-center">
          <Glow size="md">
            <Bugley stage="scout" expression="happy" glow size={72} title="Bugley the firefly" />
          </Glow>
          <Badge variant="secondary">Pricing</Badge>
          <h1 className="text-4xl text-foreground sm:text-5xl">One price per family. Not per kid.</h1>
          <p className="text-lg text-muted-foreground">
            Every plan starts with a 14-day free trial. No credit card until the trial is over.
          </p>
        </div>
      </section>

      {/* 2. Plans */}
      <section className="container-page py-14 sm:py-20">
        {/* Monthly / annual toggle */}
        <div className="flex justify-center">
          <div role="group" aria-label="Billing period" className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              aria-pressed={billing === "monthly"}
              className={`rounded-full px-4 py-2 text-sm font-display transition-colors ${billing === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              aria-pressed={billing === "annual"}
              className={`rounded-full px-4 py-2 text-sm font-display transition-colors ${billing === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Annual <span className="ml-1 text-xs font-bold text-leaf-foreground bg-leaf rounded-full px-2 py-0.5">2 months free</span>
            </button>
          </div>
        </div>

        <div className="mt-10 grid items-start gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const annual = billing === "annual";
            return (
              <BugleyCard
                key={plan.name}
                className={`relative flex flex-col gap-4 p-6 sm:p-8 ${plan.popular ? "ring-2 ring-primary lg:-translate-y-2" : ""}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 font-display text-xs text-primary-foreground shadow-soft">
                    Most popular
                  </span>
                )}
                <div>
                  <h2 className="text-xl text-foreground">{plan.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-5xl text-foreground">${annual ? plan.annual : plan.monthly}</span>
                  <span className="text-sm text-muted-foreground">{annual ? "/year" : "/month"}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {annual
                    ? `That's $${(plan.annual / 12).toFixed(0).replace(/\.0$/, "")} a month, billed once a year.`
                    : `Or $${plan.annual}/year — about 2 months free.`}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button size="lg" variant={plan.popular ? "default" : "secondary"} className="mt-auto" asChild><Link to="/signup">
                  Start free <ArrowRight className="size-4" /></Link>
                </Button>
              </BugleyCard>
            );
          })}

          {/* Co-op plan */}
          <BugleyCard className="flex flex-col gap-4 p-6 sm:p-8">
            <div>
              <h2 className="text-xl text-foreground">Co-op</h2>
              <p className="mt-1 text-sm text-muted-foreground">For homeschool co-ops and groups.</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl text-foreground">~$12</span>
              <span className="text-sm text-muted-foreground">/family /month</span>
            </div>
            <p className="text-xs text-muted-foreground">For groups of 10 or more families. Your leader account is free.</p>
            <ul className="flex flex-col gap-2.5">
              {["One price for every family in the group", "Weekly 50-minute mixed-age sessions", "Scripts, primers, and printables included", "A free leader view for you"].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <Button size="lg" variant="secondary" className="mt-auto" asChild>
              <Link to="/co-ops">Book a demo <ArrowRight className="size-4" /></Link>
            </Button>
          </BugleyCard>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Every plan starts with a 14-day free trial. Cancel anytime, from the Parent Hub.
        </p>
      </section>

      {/* 3. What's the glow? */}
      <section className="bg-secondary py-14 sm:py-20">
        <div className="container-page">
          <SectionHeader
            eyebrow="What's the glow?"
            title="Bugley's glow powers Studio pictures"
            description="His glow refills every night, and story writing never spends a spark. Most kids never run out."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {GLOW_FACTS.map(({ icon: Icon, title, body }) => (
              <BugleyCard key={title} className="flex flex-col gap-3 p-6">
                <span className="grid size-11 place-items-center rounded-full bg-primary/25 text-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-lg text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{body}</p>
              </BugleyCard>
            ))}
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <BugleyCard className="flex flex-col gap-4 p-6 sm:p-8">
              <h3 className="text-lg text-foreground">How far a day of glow goes</h3>
              <ul className="flex flex-col gap-3">
                {GLOW_COSTS.map(({ what, cost }) => (
                  <li key={what} className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                    <span className="text-sm text-foreground">{what}</span>
                    <span className="flex items-center gap-1.5 font-display text-sm text-foreground">
                      <Coins className="size-4 text-primary" aria-hidden />
                      {cost}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <Gift className="mt-0.5 size-4 shrink-0" aria-hidden />
                Parents can gift bonus glow from the Parent Hub for big creation days.
              </p>
            </BugleyCard>
            <div className="flex justify-center">
              <Glow size="lg">
                <Bugley stage="engineer" expression="happy" glow size={140} title="Bugley glowing" />
              </Glow>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FAQ */}
      <section className="container-page py-14 sm:py-20">
        <SectionHeader
          eyebrow="Questions parents ask"
          title="Four you asked about most"
          description="Straight answers, no fine print."
        />
        <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-4">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-2xl border border-border bg-card p-5 shadow-soft open:shadow-lift">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg text-foreground">
                {faq.q}
                <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-muted-foreground">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 5. CTA */}
      <section className="bg-dusk py-16 sm:py-24">
        <div className="container-page flex flex-col items-center gap-6 text-center">
          <Glow size="lg">
            <Bugley stage="navigator" expression="celebrating" glow size={100} title="Bugley celebrating" />
          </Glow>
          <h2 className="max-w-xl text-3xl text-background sm:text-4xl">
            Try it free for 14 days. If your kids love it, stay.
          </h2>
          <Button size="lg" asChild><Link to="/signup">
            Start free <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
