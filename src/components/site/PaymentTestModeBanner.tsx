import { ShieldCheck } from "lucide-react";

const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

/** Tester notice shown wherever checkout appears while payments are in test mode. */
export function PaymentTestModeBanner() {
  if (!clientToken) return <div className="w-full rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-center text-sm">Real checkout isn’t switched on yet.</div>;
  if (!clientToken.startsWith("pk_test_")) return null;
  return (
    <div role="note" className="w-full rounded-2xl border-2 border-primary bg-accent px-4 py-4 text-left text-sm sm:text-base">
      <p className="flex items-center gap-2 font-display text-lg"><ShieldCheck className="size-5 shrink-0" />Tester preview — no real payment</p>
      <p className="mt-1">You won’t be charged. <strong>Please don’t enter your own card.</strong> Use this practice card instead:</p>
      <p className="mt-2 font-mono text-base tracking-wider">4242 4242 4242 4242</p>
      <p className="text-muted-foreground">Any future date · any 3-digit code · any ZIP · any name/email</p>
    </div>
  );
}
