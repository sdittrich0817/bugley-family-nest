import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { isAdminOptions } from "@/lib/admin.functions";
import { saveSpendSettings, spendDashboardOptions } from "@/lib/spend.functions";
import { accountHead } from "@/lib/parent-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin_/costs")({
  head: () => accountHead("AI costs · Bugley admin", "Private AI and drawing spending controls for the Bugley team."),
  loader: ({ context }) => context.queryClient.ensureQueryData(isAdminOptions),
  errorComponent: ({ error }) => <div role="alert" className="container-page py-16 text-center">{error instanceof Error ? error.message : "Something went wrong."}</div>,
  component: CostsPage,
});

function CostsPage() {
  const { data: isAdmin } = useSuspenseQuery(isAdminOptions);
  if (!isAdmin) return <section className="container-page py-16 text-center"><h1 className="text-3xl">Admins only</h1><p className="mt-2 text-muted-foreground">This area is for the Bugley team.</p><Button asChild className="mt-6"><Link to="/hub">Back to Parent Hub</Link></Button></section>;
  return <Costs />;
}

const c = (v: number) => v.toFixed(3);
const d = (v: number) => `$${v.toFixed(2)}`;
const LIMITS = [
  ["platform_daily_credits", "Platform daily (AI credits)"], ["platform_monthly_credits", "Platform monthly (AI credits)"],
  ["platform_daily_usd", "Platform daily (drawing $, est.)"], ["platform_monthly_usd", "Platform monthly (drawing $, est.)"],
  ["family_monthly_credits", "Per family monthly (AI credits)"], ["family_monthly_usd", "Per family monthly (drawing $, est.)"],
  ["per_op_max_credits", "Per action max (AI credits)"], ["per_op_max_usd", "Per action max (drawing $, est.)"],
] as const;

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="rounded-2xl border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-extrabold">{value}</p>{note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}</div>;
}

function Costs() {
  const { data } = useSuspenseQuery(spendDashboardOptions);
  const qc = useQueryClient();
  const s = (data.settings ?? {}) as Record<string, any>;
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(LIMITS.map(([k]) => [k, s[k] == null ? "" : String(s[k])])));
  const [ratio, setRatio] = useState(String(s["alert_ratio"] ?? 0.8));
  const [pauseAll, setPauseAll] = useState(!!s["pause_all"]);
  const [pauseDraw, setPauseDraw] = useState(!!s["pause_drawing"]);
  const [saving, setSaving] = useState(false);
  const sum = data.summary;
  const save = async () => {
    setSaving(true);
    try {
      const vals = Object.fromEntries(LIMITS.map(([k]) => [k, form[k]?.trim() ? Number(form[k]) : null]));
      if (Object.values(vals).some((v) => v !== null && !Number.isFinite(v))) throw new Error("Limits must be numbers or blank.");
      await saveSpendSettings({ data: { ...(vals as any), alert_ratio: Number(ratio), pause_all: pauseAll, pause_drawing: pauseDraw } });
      await qc.invalidateQueries({ queryKey: ["spend-dashboard"] });
      toast.success("Spending settings saved.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn’t save."); }
    finally { setSaving(false); }
  };
  return <section className="container-page space-y-8 py-10">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl">AI costs</h1><p className="text-muted-foreground">This month (UTC). AI credits use reported token counts × list rates; drawing dollars are Replicate list-price estimates, not invoices.</p></div>
      <Button asChild variant="outline"><Link to="/admin">Back to admin</Link></Button>
    </div>
    {(pauseAll || pauseDraw) && <div role="status" className="rounded-2xl border border-destructive bg-destructive/10 p-4 font-bold">{pauseAll ? "All paid AI is paused." : "Paid drawing is paused."} Safety checks stay on; anything that can’t be checked is not shown to children.</div>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Today · Lovable AI" value={`${c(sum.day.c)} cr`} />
      <Stat label="Today · Replicate (est.)" value={d(sum.day.u)} />
      <Stat label="Month · Lovable AI" value={`${c(sum.month.c)} cr`} note={`${c(sum.reportedCredits)} from reported tokens · ${c(sum.assumedCredits)} assumed worst case`} />
      <Stat label="Month · Replicate (est.)" value={d(sum.month.u)} note="≈ dollars at list price" />
      <Stat label="Active reservations" value={String(sum.active.count)} note={`${c(sum.active.c)} cr · ${d(sum.active.u)} held`} />
      <Stat label="Unknown outcomes" value={String(sum.unknown)} note="Counted at full reserved cost" />
      <Stat label="Blocked actions" value={String(sum.blocked.reduce((a, b) => a + b.count, 0))} note={sum.blocked.map((b) => `${b.reason} ${b.count}`).join(" · ") || "none"} />
      <Stat label="Budget use (monthly)" value={s["platform_monthly_credits"] ? `${Math.round((sum.month.c / s["platform_monthly_credits"]) * 100)}%` : "No limit"} note={s["platform_monthly_usd"] ? `Drawing ${Math.round((sum.month.u / s["platform_monthly_usd"]) * 100)}%` : "Drawing: no limit"} />
    </div>
    {data.truncated && <p className="text-sm text-destructive">Showing the newest 5,000 records only.</p>}

    <div className="overflow-x-auto rounded-2xl border bg-card"><table className="w-full text-sm">
      <caption className="p-4 text-left text-lg font-bold">Costs by creative action</caption>
      <thead><tr className="border-t text-left text-muted-foreground"><th className="p-3">Action</th><th className="p-3">Runs</th><th className="p-3">AI credits</th><th className="p-3">Drawing $</th><th className="p-3">Reserved (est.)</th><th className="p-3">Retries</th><th className="p-3">Per success</th></tr></thead>
      <tbody>{sum.ops.length ? sum.ops.map((o) => <tr key={o.kind} className="border-t"><td className="p-3 font-bold">{o.kind}</td><td className="p-3">{o.count} ({o.ok} ok)</td><td className="p-3">{c(o.credits)}</td><td className="p-3">{d(o.usd)}</td><td className="p-3">{c(o.estCredits)} cr · {d(o.estUsd)}</td><td className="p-3">{o.retries} · {d(o.retryUsd)}</td><td className="p-3">{o.perSuccessCredits == null ? "—" : `${c(o.perSuccessCredits)} cr · ${d(o.perSuccessUsd ?? 0)}`}</td></tr>) : <tr className="border-t"><td className="p-3 text-muted-foreground" colSpan={7}>No AI spending recorded yet this month.</td></tr>}</tbody>
    </table></div>

    <div className="grid gap-6 lg:grid-cols-2">
      <div className="overflow-x-auto rounded-2xl border bg-card"><table className="w-full text-sm">
        <caption className="p-4 text-left text-lg font-bold">Families (top 20, ID prefix only)</caption>
        <thead><tr className="border-t text-left text-muted-foreground"><th className="p-3">Family</th><th className="p-3">Actions</th><th className="p-3">AI credits</th><th className="p-3">Drawing $</th></tr></thead>
        <tbody>{sum.families.length ? sum.families.map((f) => <tr key={f.id} className="border-t"><td className="p-3 font-mono">{f.id}…</td><td className="p-3">{f.count}</td><td className="p-3">{c(f.credits)}</td><td className="p-3">{d(f.usd)}</td></tr>) : <tr className="border-t"><td className="p-3 text-muted-foreground" colSpan={4}>None yet.</td></tr>}</tbody>
      </table></div>
      <div className="rounded-2xl border bg-card p-4"><h2 className="text-lg font-bold">Alerts</h2>
        {data.alerts.length ? <ul className="mt-2 space-y-1 text-sm">{data.alerts.map((a: any) => <li key={a.kind + a.period}><Badge variant="destructive">{a.kind}</Badge> {a.period}: {Number(a.used).toFixed(3)} of {Number(a.cap)}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No limit has reached its alert level.</p>}
        <h2 className="mt-6 text-lg font-bold">Test sessions</h2>
        {data.tests.length ? <ul className="mt-2 text-sm">{data.tests.map((t: any) => <li key={t.key}>{t.key}: cap {d(Number(t.cap_usd))}{t.closed ? " (closed)" : ""}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">None. Paid tests run under a named session cap.</p>}
      </div>
    </div>

    <div className="rounded-2xl border bg-card p-6">
      <h2 className="text-xl font-bold">Limits and emergency switches</h2>
      <p className="mt-1 text-sm text-muted-foreground">Blank means no limit. These settings also apply to the live site. Do not turn on family or platform limits without founder approval.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {LIMITS.map(([k, label]) => <label key={k} className="text-sm font-bold">{label}<Input inputMode="decimal" className="mt-1" value={form[k] ?? ""} placeholder="No limit" onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>)}
        <label className="text-sm font-bold">Alert at (share of limit, 0.1–1)<Input inputMode="decimal" className="mt-1" value={ratio} onChange={(e) => setRatio(e.target.value)} /></label>
      </div>
      <div className="mt-6 space-y-3">
        <label className="flex items-center gap-3 font-bold"><Switch checked={pauseDraw} onCheckedChange={setPauseDraw} /> Pause paid drawing</label>
        <label className="flex items-center gap-3 font-bold"><Switch checked={pauseAll} onCheckedChange={setPauseAll} /> Pause all paid AI (child text checks then fail safely)</label>
      </div>
      <Button className="mt-6" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save spending settings"}</Button>
    </div>
  </section>;
}
