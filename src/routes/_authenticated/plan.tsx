import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { accountHead } from "@/lib/parent-auth";
import { PLANS } from "@/lib/plans";
import { priceIdFor } from "@/lib/billing";
import { billingOptions, createCheckoutSession } from "@/lib/billing.functions";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { PaymentTestModeBanner } from "@/components/site/PaymentTestModeBanner";
import { Bugley } from "@/components/brand/Bugley";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => accountHead("Choose your plan", "Start your family’s 14-day free Bugley trial."),
  validateSearch: (s: Record<string, unknown>): { checkout?: string } => ({ checkout: typeof s.checkout === "string" ? s.checkout : undefined }),
  component: PlanPage,
});

function PlanPage() {
  const { checkout } = Route.useSearch();
  const env = getStripeEnvironment();
  const { data: billing } = useQuery({ ...billingOptions(env), refetchInterval: checkout ? 3000 : false });
  const [billingCycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [priceId, setPriceId] = useState<string | null>(null);

  if (checkout === "done" || billing?.active) return <section className="container-page py-16 text-center"><PaymentTestModeBanner />
    <Bugley stage="navigator" expression="celebrating" glow size={140} className="mx-auto mt-8" />
    <h1 className="mt-6 text-3xl">{billing?.active ? "Your free trial has started!" : "Finishing up…"}</h1>
    <p className="mx-auto mt-3 max-w-md text-muted-foreground">{billing?.active ? "Your kids can jump into the Kid Zone now. You can change or cancel your plan anytime from the Parent Hub." : "This takes a few seconds."}</p>
    <Button asChild className="mt-6"><Link to="/hub">Go to Parent Hub<ArrowRight /></Link></Button>
  </section>;

  if (priceId) return <section className="container-page py-8"><PaymentTestModeBanner />
    <Button variant="ghost" className="mt-4" onClick={() => setPriceId(null)}><ArrowLeft />Back to plans</Button>
    <div className="mx-auto mt-4 max-w-2xl rounded-2xl bg-card p-2 shadow-soft">
      <EmbeddedCheckoutProvider key={priceId} stripe={getStripe()} options={{ fetchClientSecret: async () => {
        const r = await createCheckoutSession({ data: { priceId: priceId as never, environment: env, returnUrl: `${window.location.origin}/plan?checkout=done` } });
        if ("error" in r) throw new Error(r.error);
        return r.clientSecret;
      } }}><EmbeddedCheckout /></EmbeddedCheckoutProvider>
    </div>
  </section>;

  return <section className="container-page py-10 sm:py-14"><PaymentTestModeBanner />
    <div className="mx-auto max-w-4xl text-center">
      <h1 className="mt-6 text-3xl sm:text-4xl">One price per family. Not per kid.</h1>
      <p className="mt-3 text-muted-foreground">Every plan starts with a 14-day free trial. Card details go only into the secure checkout.</p>
      <div className="mt-6 inline-flex rounded-full bg-muted p-1" role="group" aria-label="Billing period">
        {(["monthly", "annual"] as const).map((c) => <button key={c} onClick={() => setCycle(c)} aria-pressed={billingCycle === c} className={cn("rounded-full px-5 py-2 text-sm font-semibold capitalize", billingCycle === c && "bg-card shadow-soft")}>{c}</button>)}
      </div>
      <div className="mt-8 grid gap-6 text-left md:grid-cols-2">
        {PLANS.map((p) => <div key={p.id} className={cn("flex flex-col gap-4 rounded-2xl border-2 bg-card p-6 shadow-soft", p.popular ? "border-primary" : "border-border")}>
          <div className="flex items-center justify-between"><h2 className="text-xl">{p.name}</h2>{p.popular && <Badge>Most popular</Badge>}</div>
          <p className="text-sm text-muted-foreground">{p.blurb}</p>
          <p><span className="font-display text-4xl">${billingCycle === "annual" ? p.annual : p.monthly}</span><span className="text-sm text-muted-foreground">/{billingCycle === "annual" ? "year" : "month"}</span></p>
          <ul className="space-y-2">{p.features.map((f) => <li key={f} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0" />{f}</li>)}</ul>
          <Button size="lg" variant={p.popular ? "default" : "secondary"} className="mt-auto" onClick={() => setPriceId(priceIdFor(p.id, billingCycle))}>Start 14-day free trial<ArrowRight /></Button>
        </div>)}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">Running a co-op? <Link to="/co-ops" className="underline">Book a demo</Link> instead.</p>
    </div>
  </section>;
}
