import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { BookOpen, Printer, RefreshCw, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BookReader } from "@/components/studio/BookBuilder";
import { dismissPrintRequest, listPrints, quotePrint, refreshPrintOrder, startPrintCheckout } from "@/lib/print.functions";
import { ORDER_STATUS_LABEL, SHIPPING_LABEL, SHIPPING_LEVELS, canPrint, type ShippingAddress } from "@/lib/print";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const field = "h-10 w-full rounded-lg border border-input bg-background px-3";
const EMPTY: ShippingAddress = { name: "", street1: "", street2: "", city: "", state_code: "", postcode: "", country_code: "US", phone_number: "" };

export function ParentPrints({ kids }: { kids: { id: string; nickname: string }[] }) {
  const environment = getStripeEnvironment();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["prints", environment], queryFn: () => listPrints({ data: { environment } }) });
  const [open, setOpen] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const refresh = useServerFn(refreshPrintOrder);
  const dismiss = useServerFn(dismissPrintRequest);
  const name = (id: string) => kids.find((k) => k.id === id)?.nickname ?? "Your child";
  const reload = () => qc.invalidateQueries({ queryKey: ["prints"] });
  if (isLoading || !data) return null;
  if (!data.requests.length && !data.orders.length) return null;
  const req = data.requests.find((r) => r.id === open);
  const read = data.requests.find((r) => r.id === reading);
  return <section className="rounded-3xl bg-card p-5 shadow-soft sm:p-6">
    <h2 className="flex items-center gap-2 text-2xl"><Printer className="size-6" />Printed books</h2>
    {!data.connected && <p className="mt-2 rounded-xl bg-muted p-3 text-sm">Printing isn’t switched on yet. Requests are saved and you can order as soon as it is.</p>}
    {data.luluEnv === "sandbox" && data.connected && <p className="mt-2 text-xs text-muted-foreground">Test printing: orders go to the printer’s practice system and nothing is shipped.</p>}
    {read ? <div className="mt-4"><BookReader book={read.book} nickname={name(read.child_id)} onBack={() => setReading(null)} /></div> :
     req ? <OrderForm req={req} formats={data.formats.filter((f) => f.book_format === req.book.data.format && canPrint(f, req.pages))} credit={data.credit} onClose={() => { setOpen(null); void reload(); }} /> : <>
      {data.requests.length > 0 && <ul className="mt-4 space-y-3">{data.requests.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border p-4">
        <div><p className="font-display text-lg">{r.book.title}</p><p className="text-sm text-muted-foreground">{name(r.child_id)} asked to print this · {r.pages} pages</p></div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setReading(r.id)}><BookOpen />Preview</Button>
          <Button size="sm" disabled={!data.connected} onClick={() => setOpen(r.id)}><Printer />Order prints</Button>
          <Button size="sm" variant="ghost" aria-label="Not now" onClick={() => void dismiss({ data: { id: r.id } }).then(reload)}><X /></Button>
        </div>
      </li>)}</ul>}
      {data.orders.length > 0 && <><h3 className="mt-6 text-lg">Orders</h3><ul className="mt-2 space-y-2">{data.orders.map((o: any) => <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted p-3 text-sm">
        <div><p className="font-semibold">{o.title} · ×{o.quantity}</p><p>{ORDER_STATUS_LABEL[o.status] ?? o.status} · {money(o.total_cents)}{o.credit_used ? " · free book credit used" : ""}</p>
          {o.status_detail && <p className="text-muted-foreground">{o.status_detail}</p>}
          {(o.tracking ?? []).map((t: any) => <a key={t.url} href={t.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline"><Truck className="size-4" />Track package</a>)}</div>
        {!["shipped", "canceled"].includes(o.status) && <Button size="sm" variant="outline" onClick={() => void refresh({ data: { id: o.id } }).then(reload)}><RefreshCw />Check status</Button>}
      </li>)}</ul></>}
    </>}
  </section>;
}

function OrderForm({ req, formats, credit, onClose }: { req: any; formats: any[]; credit: boolean; onClose: () => void }) {
  const environment = getStripeEnvironment();
  const [formatKey, setFormatKey] = useState(formats[0]?.key ?? "");
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState<ShippingAddress>(EMPTY);
  const [level, setLevel] = useState<(typeof SHIPPING_LEVELS)[number]>("MAIL");
  const [q, setQ] = useState<null | { price: any; pageCount: number; credit: boolean }>(null);
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const getQuote = useServerFn(quotePrint);
  const start = useServerFn(startPrintCheckout);
  const input = { requestId: req.id, formatKey, quantity, address, shippingLevel: level, environment };
  const set = (k: keyof ShippingAddress) => (e: React.ChangeEvent<HTMLInputElement>) => { setAddress({ ...address, [k]: e.target.value }); setQ(null); };
  async function price() {
    setBusy(true);
    try { const r = await getQuote({ data: input }); if ("error" in r) toast.error(r.error); else setQ(r); }
    catch { toast.error("Please fill in the whole address."); } finally { setBusy(false); }
  }
  if (!formats.length) return <div className="mt-4 space-y-3"><p>No print format fits this book right now.</p><Button variant="outline" onClick={onClose}>Back</Button></div>;
  if (checkout) return <div className="mt-4 space-y-3">
    <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: async () => {
      const r = await start({ data: { ...input, returnUrl: `${window.location.origin}/hub?print=ORDER_ID` } });
      if ("error" in r) throw new Error(r.error);
      return r.clientSecret;
    } }}><EmbeddedCheckout /></EmbeddedCheckoutProvider>
    <Button variant="outline" onClick={() => setCheckout(false)}>Back</Button>
  </div>;
  return <div className="mt-4 space-y-4">
    <p className="font-display text-lg">Print “{req.book.title}”</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm font-semibold">Format and cover<select className={field} value={formatKey} onChange={(e) => { setFormatKey(e.target.value); setQ(null); }}>{formats.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select></label>
      <label className="space-y-1 text-sm font-semibold">How many copies<input className={field} type="number" min={1} max={20} value={quantity} onChange={(e) => { setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1))); setQ(null); }} /></label>
    </div>
    <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-2 text-sm font-semibold">Ship to</legend>
      <input className={field} placeholder="Full name" value={address.name} onChange={set("name")} autoComplete="name" />
      <input className={field} placeholder="Phone (for the courier)" value={address.phone_number} onChange={set("phone_number")} autoComplete="tel" />
      <input className={field} placeholder="Street address" value={address.street1} onChange={set("street1")} autoComplete="address-line1" />
      <input className={field} placeholder="Apt, suite (optional)" value={address.street2} onChange={set("street2")} autoComplete="address-line2" />
      <input className={field} placeholder="City" value={address.city} onChange={set("city")} autoComplete="address-level2" />
      <div className="flex gap-2"><input className={field} placeholder="State (e.g. MO)" value={address.state_code} onChange={set("state_code")} autoComplete="address-level1" /><input className={field} placeholder="ZIP" value={address.postcode} onChange={set("postcode")} autoComplete="postal-code" /></div>
    </fieldset>
    <label className="block space-y-1 text-sm font-semibold">Shipping speed<select className={field} value={level} onChange={(e) => { setLevel(e.target.value as typeof level); setQ(null); }}>{SHIPPING_LEVELS.map((l) => <option key={l} value={l}>{SHIPPING_LABEL[l]}</option>)}</select></label>
    {credit && <p className="rounded-xl bg-primary/20 p-3 text-sm">Your Family Plus free book credit will cover one copy (shipping still applies).</p>}
    {q && <dl className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-3 text-sm">
      <dt>Books ({quantity} × {money(q.price.bookEach)}, {q.pageCount} pages)</dt><dd className="text-right">{money(q.price.books)}</dd>
      {q.price.credit > 0 && <><dt>Free book credit</dt><dd className="text-right">−{money(q.price.credit)}</dd></>}
      <dt>Shipping</dt><dd className="text-right">{money(q.price.shipping)}</dd>
      {q.price.fees > 0 && <><dt>Taxes and fees</dt><dd className="text-right">{money(q.price.fees)}</dd></>}
      <dt className="font-bold">Total</dt><dd className="text-right font-bold">{money(q.price.total)}</dd>
    </dl>}
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={onClose}>Back</Button>
      {q ? <Button onClick={() => setCheckout(true)}>Pay {money(q.price.total)}</Button> : <Button disabled={busy} onClick={() => void price()}>{busy ? "Getting price…" : "See full price"}</Button>}
    </div>
  </div>;
}
