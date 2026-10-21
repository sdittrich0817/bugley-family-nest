import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Ban,
  Eye,
  FileSearch,
  ImageOff,
  KeyRound,
  Lock,
  MessageSquareDashed,
  ScanSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BugleyCard } from "@/components/brand/BugleyCard";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Glow } from "@/components/brand/Glow";
import { Bugley } from "@/components/brand/Bugley";
import { useWaitlist } from "@/components/site/WaitlistModal";

const TITLE = "Safety — Bugley";
const DESC =
  "Safe by design. Honest about the rest: parent-made accounts, no ads, no data sales, no stranger chat, and every AI request filtered and checked before a child sees it.";

export const Route = createFileRoute("/safety")({
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
  component: Safety,
});

const PROMISES = [
  {
    icon: KeyRound,
    title: "Parents create every account",
    body: "No kid signs up alone. A parent or guardian makes the account and sets what each child can do.",
  },
  {
    icon: Lock,
    title: "Kids never enter an email or make purchases",
    body: "No email, no phone number, no card on file for a child. There is nothing for them to type and no way for them to buy anything.",
  },
  {
    icon: Eye,
    title: "Parents see everything",
    body: "Every story, picture, and question your child asks Bugley shows up in your parent view — nothing is hidden from you.",
  },
  {
    icon: MessageSquareDashed,
    title: "Bugley never pretends to be a person",
    body: "He is a firefly, not a friend. He never claims to be human, and he never asks a child to keep a secret.",
  },
  {
    icon: Ban,
    title: "No ads, and we never sell data",
    body: "Bugley is paid for by families, not advertisers. Your family's information is never sold or traded.",
  },
  {
    icon: ImageOff,
    title: "No real faces or cloned voices",
    body: "Kids can't upload photos of real people or copy anyone's voice. Creations stay made-up, so no one's likeness is used.",
  },
];

const PROTECTION = [
  {
    step: "1",
    title: "A child asks or types",
    body: "A question, a story idea, or a description of a picture they want.",
  },
  {
    step: "2",
    title: "The request is filtered first",
    body: "Before anything reaches the AI, a filter checks the request. Anything not meant for kids stops right there.",
  },
  {
    step: "3",
    title: "Bugley answers",
    body: "The AI writes and illustrates, in Bugley's voice, at your child's age level.",
  },
  {
    step: "4",
    title: "The answer is checked again",
    body: "Nothing reaches your child until a second check has read it — for safety, for age-appropriateness, and for made-up facts.",
  },
  {
    step: "5",
    title: "It lands in your parent view",
    body: "The question, the answer, and what your child made from it are all saved for you to read.",
  },
];

const FAQS = [
  {
    q: "Is this COPPA compliant?",
    a: "Yes. Bugley is built to COPPA's rules: parents create and control every child's account, we don't collect personal information from kids, and we never sell it. If any of that ever changes, we will tell you plainly and ask again.",
  },
  {
    q: "Can my kids talk to strangers?",
    a: "No. There is no chat, no messaging, no friend requests, and no room with other kids. Bugley is the only thing on the other side of the screen, and he always says what he is.",
  },
  {
    q: "What does Bugley do with my child's work?",
    a: "It stays yours. Their comics, stories, and pictures live on their own shelf, we don't use them to train AI models, and you can export or delete them any time you like.",
  },
];

function Safety() {
  const { open } = useWaitlist();
  return (
    <>
      {/* 1. Intro */}
      <section className="bg-muted py-14 sm:py-20">
        <div className="container-page flex max-w-2xl flex-col items-center gap-5 text-center">
          <Glow size="md">
            <Bugley stage="scout" expression="thinking" glow size={72} title="Bugley the firefly" />
          </Glow>
          <Badge variant="secondary">Our safety promise</Badge>
          <h1 className="text-4xl text-foreground sm:text-5xl">Safe by design. Honest about the rest.</h1>
          <p className="text-lg text-muted-foreground">
            What we built in from day one, what we will never do, and where we are still straight with you.
          </p>
        </div>
      </section>

      {/* 2. Promises */}
      <section className="container-page py-14 sm:py-20">
        <SectionHeader
          eyebrow="Six promises"
          title="What we promise your family"
          description="Short on purpose. If a promise needs a footnote, it is not a promise."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <BugleyCard key={title} className="flex flex-col gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-leaf text-leaf-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="text-lg text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </BugleyCard>
          ))}
        </div>
      </section>

      {/* 3. How the AI is protected */}
      <section className="bg-leaf/50 py-14 sm:py-20">
        <div className="container-page">
          <SectionHeader
            eyebrow="How Bugley's AI is protected"
            title="Every request is filtered and checked before it reaches a child"
            description="Nothing goes straight from the AI to your kid. It is checked twice, and both checks happen before a child sees a word."
          />
          <ol className="mx-auto mt-10 flex max-w-3xl flex-col">
            {PROTECTION.map((item, i) => (
              <li key={item.step} className="relative flex gap-4 pb-6 last:pb-0">
                {i < PROTECTION.length - 1 && (
                  <span aria-hidden className="absolute left-[27px] top-14 h-[calc(100%-3.5rem)] w-0.5 bg-primary/40" />
                )}
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary font-display text-primary-foreground shadow-soft">
                  {item.step}
                </span>
                <BugleyCard className="flex-1 py-4">
                  <p className="font-display text-lg text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </BugleyCard>
              </li>
            ))}
          </ol>
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center gap-4">
            <Glow size="sm">
              <Bugley stage="engineer" expression="thinking" glow size={56} title="Bugley checking an answer" />
            </Glow>
            <p className="max-w-md text-sm text-muted-foreground">
              The honest part: no filter catches everything all of the time. If something slips through, tell us and we
              will fix it for every family, not just yours.
            </p>
          </div>
        </div>
      </section>

      {/* 4. FAQ */}
      <section className="container-page py-14 sm:py-20">
        <SectionHeader
          eyebrow="Questions parents ask"
          title="Three you asked about most"
          description="Straight answers, no legal fog."
        />
        <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-4">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-2xl border border-border bg-card p-5 shadow-soft open:shadow-lift">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg text-foreground">
                <span className="flex items-center gap-3">
                  <FileSearch className="size-5 shrink-0 text-primary-foreground bg-foreground/10 rounded-full p-1" />
                  {faq.q}
                </span>
                <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-muted-foreground">{faq.a}</p>
            </details>
          ))}
        </div>
        <div className="mx-auto mt-8 flex max-w-3xl items-start gap-4 rounded-2xl bg-muted p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sky text-sky-foreground">
            <ScanSearch className="size-5" />
          </span>
          <p className="text-sm text-muted-foreground">
            Still weighing it up? Our privacy policy spells out exactly what is stored and for how long, and you can
            reach a real person at /contact any time.
          </p>
        </div>
      </section>

      {/* 5. CTA */}
      <section className="bg-dusk py-16 sm:py-24">
        <div className="container-page flex flex-col items-center gap-6 text-center">
          <Glow size="lg">
            <Bugley stage="navigator" expression="celebrating" glow size={100} title="Bugley celebrating" />
          </Glow>
          <h2 className="max-w-xl text-3xl text-background sm:text-4xl">
            If that all sounds like your kind of safe, come see it.
          </h2>
          <Button size="lg" onClick={() => open("start_free")}>
            Start free <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </>
  );
}
