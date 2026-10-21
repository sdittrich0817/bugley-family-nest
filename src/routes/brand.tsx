import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bugley, BUGLEY_EXPRESSIONS, BUGLEY_STAGES } from "@/components/brand/Bugley";
import { BugleyIcon, Logo } from "@/components/brand/Logo";
import { BugleyMature } from "@/components/brand/BugleyMature";
import { BugleyCard } from "@/components/brand/BugleyCard";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Glow } from "@/components/brand/Glow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import kitchen from "@/assets/illustrations/kitchen-dusk.jpg";
import sky from "@/assets/illustrations/night-sky.jpg";
import leaves from "@/assets/illustrations/leaves-grass.jpg";
import journal from "@/assets/illustrations/field-journal.jpg";
import emptyJar from "@/assets/illustrations/empty-jar.jpg";
import emptyPicnic from "@/assets/illustrations/empty-picnic.jpg";

export const Route = createFileRoute("/brand")({
  head: () => ({
    meta: [
      { title: "Brand review — Bugley (internal)" },
      { name: "description", content: "Internal Bugley brand review board." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Brand review — Bugley (internal)" },
      { property: "og:description", content: "Internal Bugley brand review board." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrandPage,
});

const colors = [
  { name: "Glow yellow", hex: "#FFC94D", cls: "bg-primary" },
  { name: "Dusk Navy", hex: "Text & logo", cls: "bg-dusk" },
  { name: "Cream", hex: "Background", cls: "bg-background border border-border" },
  { name: "Sky", hex: "Accent", cls: "bg-sky" },
  { name: "Leaf", hex: "Accent", cls: "bg-leaf" },
  { name: "Muted", hex: "Surfaces", cls: "bg-muted border border-border" },
];

const illustrations = [
  { src: kitchen, label: "Family at the kitchen table, dusk" },
  { src: sky, label: "Night sky with tiny lights" },
  { src: leaves, label: "Leaves and grass" },
  { src: journal, label: "Field-journal sketch" },
  { src: emptyJar, label: "Empty state: waiting for fireflies" },
  { src: emptyPicnic, label: "Empty state: spotting the first light" },
];

function AgeStep({ label, dark, children }: { label: string; dark?: boolean; children: ReactNode }) {
  return (
    <figure className={cn("flex flex-col items-center gap-2 rounded-2xl border border-border bg-background p-4", dark && "skin-builders")}>
      <div className="w-full max-w-36">{children}</div>
      <figcaption className="text-center text-xs text-muted-foreground">{label}</figcaption>
    </figure>
  );
}

function Block({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-8 border-t border-border py-section first:border-t-0">
      <SectionHeader eyebrow={eyebrow} title={title} align="left" />
      {children}
    </section>
  );
}

function BrandPage() {
  return (
    <div className="container-page">
      <section className="flex flex-col items-center gap-6 py-section text-center">
        <Badge variant="secondary">Internal · not indexed</Badge>
        <Glow size="lg">
          <Bugley stage="navigator" expression="happy" size={200} />
        </Glow>
        <h1 className="text-4xl sm:text-5xl">Bugley brand review</h1>
        <p className="max-w-xl text-muted-foreground">Everything in one place to review and approve the look.</p>
      </section>

      <Block eyebrow="Character" title="Every stage, every expression">
        <div className="flex flex-col gap-6">
          {BUGLEY_STAGES.map((stage) => (
            <BugleyCard key={stage} className="p-4 sm:p-6">
              <h3 className="mb-4 text-xl capitalize">{stage}</h3>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
                {BUGLEY_EXPRESSIONS.map((ex) => (
                  <figure key={ex} className="flex flex-col items-center gap-2">
                    <Bugley stage={stage} expression={ex} size="100%" className="max-w-28" />
                    <figcaption className="text-xs capitalize text-muted-foreground">{ex}</figcaption>
                  </figure>
                ))}
              </div>
            </BugleyCard>
          ))}
          <BugleyCard variant="muted" className="flex flex-wrap items-end gap-6">
            <span className="text-sm text-muted-foreground">Scales cleanly:</span>
            {[24, 40, 64, 120].map((s) => (
              <Bugley key={s} stage="navigator" size={s} glow={false} />
            ))}
          </BugleyCard>
        </div>
      </Block>

      <Block eyebrow="Growing up" title="Bugley grows up with your kid">
        <p className="max-w-2xl text-muted-foreground">Same firefly, same glow, less cute as kids get older. Each step shrinks the eyes, drops the cheeks, thins the lines and adds attitude.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AgeStep label="Ages 5–7 · Sprouts"><Bugley stage="hatchling" size="100%" /></AgeStep>
          <AgeStep label="Ages 8–10 · Explorers"><Bugley stage="scout" size="100%" /></AgeStep>
          <AgeStep label="Ages 11–15 · Builders" dark><BugleyMature variant="headphones" size="100%" /></AgeStep>
        </div>
        <BugleyCard variant="muted" className="flex flex-wrap items-center gap-6">
          <span className="text-sm text-muted-foreground">Builders Bugley, light and dark:</span>
          <div className="size-28 rounded-xl bg-background p-2"><BugleyMature variant="headphones" size="100%" /></div>
          <div className="skin-builders size-28 rounded-xl bg-background p-2"><BugleyMature variant="headphones" size="100%" /></div>
        </BugleyCard>
      </Block>

      <Block eyebrow="Logo" title="The Bugley logo">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-border bg-card p-6">
            <Logo variant="firefly" size="lg" />
          </div>
          <div className="skin-builders flex min-h-40 items-center justify-center rounded-2xl bg-background p-6">
            <Logo variant="firefly" size="lg" />
          </div>
        </div>
        </div>
        <BugleyCard variant="muted" className="flex flex-wrap items-center gap-6">
          <span className="text-sm text-muted-foreground">Favicon & app icon:</span>
          <BugleyIcon size={16} />
          <BugleyIcon size={32} />
          <img src="/app-icon.png" alt="Bugley app icon" width={96} height={96} className="rounded-2xl shadow-soft" />
        </BugleyCard>
      </Block>

      <Block eyebrow="Color" title="Palette">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {colors.map((c) => (
            <div key={c.name} className="flex flex-col gap-2">
              <div className={cn("aspect-square rounded-2xl shadow-soft", c.cls)} />
              <p className="font-display text-sm">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.hex}</p>
            </div>
          ))}
        </div>
      </Block>

      <Block eyebrow="Type" title="Fonts">
        <div className="grid gap-6 md:grid-cols-2">
          <BugleyCard>
            <p className="text-xs text-muted-foreground">Headlines · Nunito Extra Bold</p>
            <p className="font-display text-5xl">Figure out AI, together.</p>
          </BugleyCard>
          <BugleyCard>
            <p className="text-xs text-muted-foreground">Body · Inter</p>
            <p className="text-lg">Bugley helps parents and kids explore how AI works, side by side. No ads. We never sell your family's data.</p>
          </BugleyCard>
        </div>
      </Block>

      <Block eyebrow="Components" title="Buttons, cards & badges">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Start free</Button>
          <Button variant="secondary">Log in</Button>
          <Button variant="ghost">Ghost</Button>
          <Badge>New</Badge>
          <Badge variant="sky">Explorers</Badge>
          <Badge variant="leaf">Safe</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <BugleyCard>Default card</BugleyCard>
          <BugleyCard variant="interactive">Interactive card (hover me)</BugleyCard>
          <BugleyCard variant="glow">Glow card</BugleyCard>
        </div>
      </Block>

      <Block eyebrow="Illustration" title="Illustration style">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {illustrations.map((i) => (
            <figure key={i.label} className="flex flex-col gap-2">
              <img src={i.src} alt={i.label} width={1280} height={896} loading="lazy" className="aspect-[10/7] w-full rounded-2xl object-cover shadow-soft" />
              <figcaption className="text-sm text-muted-foreground">{i.label}</figcaption>
            </figure>
          ))}
        </div>
      </Block>

      <Block eyebrow="Age bands" title="Sprouts, Explorers, Builders">
        <div className="grid gap-6 lg:grid-cols-3">
          <SkinPreview skin="skin-sprouts" name="Sprouts" note="Brighter, rounder, bigger touch targets." stage="hatchling" />
          <SkinPreview skin="skin-explorers" name="Explorers" note="The signature Bugley look." stage="scout" />
          <SkinPreview skin="skin-builders" name="Builders" note="Deep Dusk Navy, sharper corners, glow as the accent. Headphones Bugley." stage="navigator" mature />
        </div>
      </Block>
    </div>
  );
}

function SkinPreview({ skin, name, note, stage, mature }: { skin: string; name: string; note: string; stage: "hatchling" | "scout" | "navigator"; mature?: boolean }) {
  return (
    <div className={cn(skin, "flex flex-col gap-5 rounded-2xl border border-border bg-background p-6 text-foreground")}>
      <div className="flex items-center gap-3">
        {mature ? <BugleyMature variant="headphones" size={72} /> : <Bugley stage={stage} expression="happy" size={72} />}
        <div>
          <h3 className="text-2xl">{name}</h3>
          <p className="text-sm text-muted-foreground">{note}</p>
        </div>
      </div>
      <BugleyCard className="flex flex-col gap-3">
        <Badge variant={mature ? "outline" : "secondary"} className="self-start">{mature ? "Challenge · 12 min" : "Today's quest"}</Badge>
        <p className="font-display text-lg">{mature ? "Train a model to predict the next word" : "How does a computer guess the next word?"}</p>
        {mature && (
          <div className="flex flex-col gap-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full w-3/5 rounded-full bg-primary shadow-glow" /></div>
            <p className="text-xs text-muted-foreground">Level 3 · 60% complete</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button>{mature ? "Continue" : "Let's go"}</Button>
          <Button variant="secondary">{mature ? "Skip" : "Later"}</Button>
        </div>
      </BugleyCard>
    </div>
  );
}
