const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) return <div className="w-full border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-sm">Real checkout isn’t switched on yet.</div>;
  if (clientToken.startsWith("pk_test_")) return (
    <div className="w-full border-b border-border bg-muted px-4 py-2 text-center text-sm">
      Test mode: payments in the preview aren’t real.{" "}
      <a href="https://docs.lovable.dev/features/payments#test-and-live-environments" target="_blank" rel="noopener noreferrer" className="font-medium underline">Read more</a>
    </div>
  );
  return null;
}
