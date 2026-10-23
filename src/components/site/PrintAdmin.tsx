import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getPrintAdmin, retryPrintOrder, savePrintFormat, savePrintSettings } from "@/lib/print.functions";
import { ORDER_STATUS_LABEL, type PrintFormat } from "@/lib/print";

const field = "h-9 w-full rounded-lg border border-input bg-background px-2 text-sm";

export function PrintAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["print-admin"], queryFn: () => getPrintAdmin() });
  const saveSettings = useServerFn(savePrintSettings);
  const retry = useServerFn(retryPrintOrder);
  if (!data) return null;
  const s = data.settings;
  return <section className="container-page space-y-6 py-8">
    <h2 className="text-2xl">Printed books</h2>
    <div className="rounded-2xl border border-border p-4">
      <h3 className="font-display text-lg">Printer settings</h3>
      <p className="text-sm text-muted-foreground">Lulu keys: sandbox {data.connected.sandbox ? "connected" : "missing"} · live {data.connected.live ? "connected" : "missing"}</p>
      <form className="mt-3 grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget);
        void saveSettings({ data: { lulu_env: f.get("env") as "sandbox" | "live", brand_name: String(f.get("brand")), contact_email: String(f.get("email")) } }).then(() => { toast.success("Saved"); void qc.invalidateQueries({ queryKey: ["print-admin"] }); }).catch((er: Error) => toast.error(er.message)); }}>
        <label className="text-sm font-semibold">Printer mode<select name="env" defaultValue={s.lulu_env} className={field}><option value="sandbox">Sandbox (test, nothing ships)</option><option value="live">Live (real books, real charges)</option></select></label>
        <label className="text-sm font-semibold">Brand name<input name="brand" defaultValue={s.brand_name} className={field} /></label>
        <label className="text-sm font-semibold">Printer contact email<input name="email" type="email" defaultValue={s.contact_email} className={field} placeholder="Where Lulu sends job issues" /></label>
        <Button type="submit" size="sm" className="w-fit">Save settings</Button>
      </form>
    </div>
    <div className="space-y-3">{data.formats.map((f) => <FormatRow key={f.key} f={f} />)}</div>
    <div className="rounded-2xl border border-border p-4"><h3 className="font-display text-lg">Recent orders</h3>
      {!data.orders.length ? <p className="text-sm text-muted-foreground">No paid orders yet.</p> : <ul className="mt-2 space-y-2 text-sm">{data.orders.map((o: any) => <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted p-2">
        <span>{new Date(o.created_at).toLocaleDateString()} · {o.format_key} ×{o.quantity} · ${(o.total_cents / 100).toFixed(2)} · {o.lulu_env} · {ORDER_STATUS_LABEL[o.status] ?? o.status}{o.status_detail ? ` — ${o.status_detail}` : ""}</span>
        {o.status === "error" && <Button size="sm" variant="outline" onClick={() => void retry({ data: { id: o.id } }).then(() => qc.invalidateQueries({ queryKey: ["print-admin"] }))}>Retry</Button>}
      </li>)}</ul>}
    </div>
  </section>;
}

function FormatRow({ f }: { f: PrintFormat }) {
  const save = useServerFn(savePrintFormat);
  const [v, setV] = useState(f);
  const num = (k: keyof PrintFormat) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: Number(e.target.value) });
  return <div className="grid gap-2 rounded-2xl border border-border p-4 sm:grid-cols-4">
    <label className="text-xs font-semibold sm:col-span-2">Label<input className={field} value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} /></label>
    <label className="text-xs font-semibold sm:col-span-2">Lulu product code<input className={field} value={v.pod_package_id} onChange={(e) => setV({ ...v, pod_package_id: e.target.value.toUpperCase() })} /></label>
    <label className="text-xs font-semibold">Width (in)<input className={field} type="number" step="0.001" value={v.trim_width_in} onChange={num("trim_width_in")} /></label>
    <label className="text-xs font-semibold">Height (in)<input className={field} type="number" step="0.001" value={v.trim_height_in} onChange={num("trim_height_in")} /></label>
    <label className="text-xs font-semibold">Min pages<input className={field} type="number" value={v.min_pages} onChange={num("min_pages")} /></label>
    <label className="text-xs font-semibold">Max pages<input className={field} type="number" value={v.max_pages} onChange={num("max_pages")} /></label>
    <label className="text-xs font-semibold">Pages in groups of<input className={field} type="number" value={v.page_multiple} onChange={num("page_multiple")} /></label>
    <label className="text-xs font-semibold">Markup %<input className={field} type="number" step="0.1" value={v.markup_percent} onChange={num("markup_percent")} /></label>
    <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} />Offered to parents</label>
    <Button size="sm" className="w-fit" onClick={() => { const { book_format: _b, cover_type: _c, ...rest } = v; void save({ data: rest }).then(() => toast.success("Format saved")).catch((er: Error) => toast.error(er.message)); }}>Save</Button>
  </div>;
}
