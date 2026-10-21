import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, ClipboardList, FileText, Printer, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BugleyCard } from "@/components/brand/BugleyCard";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Glow } from "@/components/brand/Glow";
import { Bugley } from "@/components/brand/Bugley";
import { AGE_RANGES, demoSchema } from "@/lib/demo";
import { requestDemo } from "@/lib/demo.functions";

const TITLE = "For co-ops — Bugley";
const DESC =
  "AI, ready to teach. Weekly 50-minute mixed-age sessions, scripts, printables, and a leader view for homeschool co-ops. About $12 per family per month.";

export const Route = createFileRoute("/co-ops")({
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
  component: CoOps,
});

const GETS = [
  { icon: CalendarDays, title: "Weekly 50-minute sessions", body: "Built for mixed ages, so a 6-year-old and a 14-year-old learn side by side." },
  { icon: FileText, title: "Scripts and 5-minute primers", body: "Read a short primer, follow the script, and lead with confidence." },
  { icon: Printer, title: "Printables", body: "Warm-ups, field-journal pages, and handouts ready to print." },
  { icon: Users, title: "A leader view", body: "Manage your families, see who's joined, and keep everyone on track." },
  { icon: Trophy, title: "A showcase day plan", body: "Close the season with kids sharing what they made and learned." },
];

function CoOps() {
  return (
    <>
      <section className="container-page flex flex-col items-center gap-6 py-16 text-center sm:py-24">
        <Glow size="sm"><Bugley stage="scout" expression="happy" size={96} /></Glow>
        <SectionHeader
          as="h1"
          eyebrow="For co-ops and groups"
          title="AI, ready to teach. No tech degree required."
          description="Everything you need to lead a mixed-age group through AI, one week at a time."
        />
        <Button size="lg" asChild><a href="#demo">Book a demo</a></Button>
      </section>

      <section className="container-page pb-16 sm:pb-24">
        <SectionHeader title="What leaders get" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GETS.map(({ icon: Icon, title, body }) => (
            <BugleyCard key={title} className="flex flex-col gap-3 p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/25 text-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-xl">{title}</h3>
              <p className="text-muted-foreground">{body}</p>
            </BugleyCard>
          ))}
        </div>
      </section>

      <section className="bg-secondary py-16 sm:py-24">
        <div className="container-page flex flex-col items-center gap-6 text-center">
          <SectionHeader title="How group pricing works" />
          <p className="font-display text-5xl text-foreground sm:text-6xl">~$12</p>
          <p className="max-w-xl text-lg text-muted-foreground">
            per family, per month, for groups of 10 or more families. Your leader account is free.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary"><ClipboardList className="mr-1 h-3.5 w-3.5" />10+ families</Badge>
            <Badge variant="secondary">Free leader account</Badge>
          </div>
        </div>
      </section>

      <section id="demo" className="container-page scroll-mt-24 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <DemoForm />
        </div>
      </section>
    </>
  );
}

function DemoForm() {
  const submit = useServerFn(requestDemo);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [name, setName] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = demoSchema.safeParse({
      leaderName: fd.get("leaderName"),
      email: fd.get("email"),
      groupName: fd.get("groupName"),
      cityState: fd.get("cityState"),
      familiesCount: fd.get("familiesCount"),
      ageRange: fd.get("ageRange"),
      notes: fd.get("notes") || undefined,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setStatus("sending");
    try {
      const res = await submit({ data: parsed.data });
      if (res.ok) { setName(parsed.data.leaderName); setStatus("done"); } else setStatus("error");
    } catch { setStatus("error"); }
  }

  if (status === "done") {
    return (
      <BugleyCard className="flex flex-col items-center gap-4 p-8 text-center">
        <Glow size="sm"><Bugley stage="scout" expression="celebrating" size={110} /></Glow>
        <h2 className="text-3xl">Thank you, {name}!</h2>
        <p className="text-muted-foreground">We've got your request and will reach out soon to set up your demo.</p>
      </BugleyCard>
    );
  }

  return (
    <BugleyCard className="p-6 sm:p-8">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div>
          <h2 className="text-3xl">Book a demo</h2>
          <p className="mt-2 text-muted-foreground">Tell us about your group and we'll walk you through a session.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="leaderName" label="Your name" error={errors["leaderName"]}>
            <Input id="leaderName" name="leaderName" autoComplete="name" maxLength={100} className="h-11 rounded-xl" />
          </Field>
          <Field id="email" label="Email" error={errors["email"]}>
            <Input id="email" name="email" type="email" autoComplete="email" maxLength={255} className="h-11 rounded-xl" />
          </Field>
          <Field id="groupName" label="Co-op or group name" error={errors["groupName"]}>
            <Input id="groupName" name="groupName" maxLength={150} className="h-11 rounded-xl" />
          </Field>
          <Field id="cityState" label="City and state" error={errors["cityState"]}>
            <Input id="cityState" name="cityState" placeholder="Austin, TX" maxLength={120} className="h-11 rounded-xl" />
          </Field>
          <Field id="familiesCount" label="Number of families" error={errors["familiesCount"]}>
            <Input id="familiesCount" name="familiesCount" type="number" min={1} max={1000} inputMode="numeric" className="h-11 rounded-xl" />
          </Field>
          <Field id="ageRange" label="Age range of kids" error={errors["ageRange"]}>
            <select id="ageRange" name="ageRange" defaultValue="" className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="" disabled>Choose one</option>
              {AGE_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        </div>
        <Field id="notes" label="Notes (optional)" error={errors["notes"]}>
          <Textarea id="notes" name="notes" maxLength={1000} rows={4} className="rounded-xl" placeholder="Anything we should know about your group?" />
        </Field>
        {status === "error" && <p className="text-sm text-destructive">Something hiccuped. Please try again in a moment.</p>}
        <Button type="submit" size="lg" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Book a demo"}
        </Button>
      </form>
    </BugleyCard>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string | undefined; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
