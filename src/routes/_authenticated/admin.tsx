import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, FileUp, Plus, Trash2 } from "lucide-react";
import { adminTreeOptions, addPrintable, deleteEntity, isAdminOptions, saveEntity, saveVersions } from "@/lib/admin.functions";
import { BANDS, STEP_KEYS, STRAND_KEYS, type EntityTable } from "@/lib/curriculum";
import { getGlowAdmin, resolveAlert, setFamilyGlowSettings } from "@/lib/glow.functions";
import { accountHead } from "@/lib/parent-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => accountHead("Curriculum admin", "Create and edit Bugley Seasons, Units, Sessions and Activities."),
  loader: ({ context }) => context.queryClient.ensureQueryData(isAdminOptions),
  errorComponent: ({ error }) => <div role="alert" className="container-page py-16 text-center">{error instanceof Error ? error.message : "Something went wrong."}</div>,
  component: Admin,
});

type Field = { key: string; label: string; kind: "text" | "long" | "int" | "bool" | "strand" | "step" };
const FIELDS: Record<EntityTable, Field[]> = {
  seasons: [{ key: "number", label: "Season number", kind: "int" }, { key: "title", label: "Title", kind: "text" }, { key: "description", label: "Description", kind: "long" }, { key: "published", label: "Published (families can see it)", kind: "bool" }],
  units: [{ key: "number", label: "Unit number", kind: "int" }, { key: "title", label: "Title", kind: "text" }, { key: "lead_strand", label: "Lead strand", kind: "strand" }, { key: "family_question", label: "Family question", kind: "long" }, { key: "dinner_question", label: "Dinner question", kind: "long" }, { key: "story_prompt", label: "Story Studio prompt", kind: "text" }, { key: "mission_project", label: "Mission Week project", kind: "long" }, { key: "badge_name", label: "Badge name", kind: "text" }, { key: "badge_description", label: "Badge description", kind: "text" }, { key: "journal_prompt", label: "Field journal prompt", kind: "long" }],
  sessions: [{ key: "week_number", label: "Week number", kind: "int" }, { key: "title", label: "Title", kind: "text" }, { key: "parent_primer", label: "5-minute parent primer", kind: "long" }, { key: "script", label: "Session script (one step per line)", kind: "long" }],
  activities: [{ key: "position", label: "Order", kind: "int" }, { key: "title", label: "Title", kind: "text" }, { key: "strand", label: "Strand", kind: "strand" }, { key: "step", label: "Family Table step", kind: "step" }, { key: "offscreen", label: "Off-screen activity", kind: "bool" }],
};
const PARENT_KEY: Partial<Record<EntityTable, string>> = { units: "season_id", sessions: "unit_id", activities: "session_id" };
const LABEL: Record<EntityTable, string> = { seasons: "Season", units: "Unit", sessions: "Session", activities: "Activity" };
type Sel = { table: EntityTable; id?: string | undefined; parentId?: string | undefined };

function Admin() {
  const { data: isAdmin } = useSuspenseQuery(isAdminOptions);
  if (!isAdmin) return <section className="container-page py-16 text-center"><h1 className="text-3xl">Admins only</h1><p className="mt-2 text-muted-foreground">This area is for the Bugley team.</p><Button asChild className="mt-6"><Link to="/hub">Back to Parent Hub</Link></Button></section>;
  return <AdminArea />;
}

function AdminArea() {
  const { data: tree = [] } = useQuery(adminTreeOptions);
  const [sel, setSel] = useState<Sel | null>(null);
  const find = (s: Sel | null): any => {
    if (!s?.id) return null;
    for (const se of tree) { if (s.table === "seasons" && se.id === s.id) return se;
      for (const u of se.units) { if (s.table === "units" && u.id === s.id) return u;
        for (const ss of u.sessions) { if (s.table === "sessions" && ss.id === s.id) return ss;
          for (const a of ss.activities) if (s.table === "activities" && a.id === s.id) return a; } } }
    return null;
  };
  const sortBy = (k: string) => (a: any, b: any) => a[k] - b[k];
  const Row = ({ s, label, depth, children }: { s: Sel; label: string; depth: number; children?: React.ReactNode }) => <li>
    <button onClick={() => setSel(s)} style={{ paddingLeft: `${depth * 14 + 8}px` }} className={`flex w-full items-center gap-1 rounded-md py-1.5 pr-2 text-left text-sm hover:bg-muted ${sel?.id === s.id ? "bg-muted font-semibold" : ""}`}><ChevronRight className="size-3 shrink-0" /><span className="truncate">{label}</span></button>{children}</li>;
  const Add = ({ table, parentId, depth }: { table: EntityTable; parentId?: string | undefined; depth: number }) => <li><button onClick={() => setSel({ table, parentId })} style={{ paddingLeft: `${depth * 14 + 8}px` }} className="flex items-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground"><Plus className="size-3" />Add {LABEL[table].toLowerCase()}</button></li>;
  return <section className="container-page py-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl">Curriculum admin</h1><Button asChild variant="ghost" size="sm"><Link to="/hub">Parent Hub</Link></Button></div>
    <div className="grid gap-6 md:grid-cols-[300px_1fr]">
      <nav className="rounded-2xl border border-border bg-card p-3"><ul>
        {[...tree].sort(sortBy("number")).map((se: any) => <Row key={se.id} s={{ table: "seasons", id: se.id }} label={`Season ${se.number}: ${se.title}${se.published ? "" : " (draft)"}`} depth={0}><ul>
          {[...se.units].sort(sortBy("number")).map((u: any) => <Row key={u.id} s={{ table: "units", id: u.id }} label={`Unit ${u.number}: ${u.title}`} depth={1}><ul>
            {[...u.sessions].sort(sortBy("week_number")).map((ss: any) => <Row key={ss.id} s={{ table: "sessions", id: ss.id }} label={`Week ${ss.week_number}: ${ss.title}`} depth={2}><ul>
              {[...ss.activities].sort(sortBy("position")).map((a: any) => <Row key={a.id} s={{ table: "activities", id: a.id }} label={a.title} depth={3} />)}
              <Add table="activities" parentId={ss.id} depth={3} /></ul></Row>)}
            <Add table="sessions" parentId={u.id} depth={2} /></ul></Row>)}
          <Add table="units" parentId={se.id} depth={1} /></ul></Row>)}
        <Add table="seasons" depth={0} />
      </ul></nav>
      <div>{sel ? <Editor key={`${sel.table}-${sel.id ?? "new"}-${sel.parentId ?? ""}`} sel={sel} row={find(sel)} onSaved={(id) => setSel({ ...sel, id })} onDeleted={() => setSel(null)} /> : <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">Pick something on the left to edit, or add a new Season.</p>}</div>
    </div>
    <GlowAdmin />
  </section>;
}

function GlowAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["glow-admin"], queryFn: () => getGlowAdmin() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["glow-admin"] });
  if (!data) return null;
  return <div className="mt-10 space-y-4">
    <h2 className="text-2xl">Glow safety net</h2>
    <p className="text-sm text-muted-foreground">Set a monthly glow ceiling per family. You get an alert here when a family reaches 80%, and Studio pictures stop for that family at 100% until next month.</p>
    {data.alerts.length > 0 && <ul className="space-y-2">{data.alerts.map((a: any) => <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-card px-4 py-3 text-sm"><span>{data.families.find((f) => f.parentId === a.parent_id)?.name ?? "Family"}: {a.message}</span><Button size="sm" variant="ghost" onClick={() => void resolveAlert({ data: { id: a.id } }).then(refresh)}>Dismiss</Button></li>)}</ul>}
    <div className="overflow-x-auto rounded-2xl border border-border bg-card"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="p-3">Family</th><th className="p-3">Plan</th><th className="p-3">Glow used this month</th><th className="p-3">Monthly ceiling</th><th className="p-3" /></tr></thead>
      <tbody>{data.families.map((f) => <FamilyRow key={f.parentId} f={f} onSaved={refresh} />)}</tbody></table>
      {!data.families.length && <p className="p-4 text-sm text-muted-foreground">No families yet.</p>}</div>
  </div>;
}
function FamilyRow({ f, onSaved }: { f: { parentId: string; name: string; plan: string; ceiling: number | null; used: number }; onSaved: () => void }) {
  const [plan, setPlan] = useState(f.plan as "family" | "family_plus");
  const [ceiling, setCeiling] = useState(f.ceiling === null ? "" : String(f.ceiling));
  async function save() { try { await setFamilyGlowSettings({ data: { parentId: f.parentId, plan, ceiling: ceiling === "" ? null : Number(ceiling) } }); toast.success("Saved"); onSaved(); } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn’t save."); } }
  return <tr className="border-t border-border"><td className="p-3">{f.name}</td>
    <td className="p-3"><select className="h-9 rounded-lg border border-input bg-background px-2" value={plan} onChange={(e) => setPlan(e.target.value as "family" | "family_plus")}><option value="family">Family (10/day)</option><option value="family_plus">Family Plus (20/day)</option></select></td>
    <td className="p-3">{f.used}{f.ceiling ? ` (${Math.round((f.used / f.ceiling) * 100)}%)` : ""}</td>
    <td className="p-3"><Input type="number" min={0} className="w-28" placeholder="No limit" value={ceiling} onChange={(e) => setCeiling(e.target.value)} /></td>
    <td className="p-3"><Button size="sm" onClick={() => void save()}>Save</Button></td></tr>;
}

function Editor({ sel, row, onSaved, onDeleted }: { sel: Sel; row: any; onSaved: (id: string) => void; onDeleted: () => void }) {
  const qc = useQueryClient();
  const fields = FIELDS[sel.table];
  const [values, setValues] = useState<Record<string, any>>(() => Object.fromEntries(fields.map((f) => [f.key, row?.[f.key] ?? (f.kind === "bool" ? false : f.kind === "int" ? 1 : f.kind === "strand" ? "understand" : f.kind === "step" ? "make" : "")])));
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-tree"] }).then(() => qc.invalidateQueries({ queryKey: ["curriculum"] }));
  async function save() {
    setBusy(true);
    try {
      const pk = PARENT_KEY[sel.table];
      const v = { ...values, ...(pk ? { [pk]: row?.[pk] ?? sel.parentId } : {}) };
      const { id } = await saveEntity({ data: { table: sel.table, id: sel.id, values: v } });
      await refresh(); toast.success("Saved"); onSaved(id);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn’t save."); } finally { setBusy(false); }
  }
  async function remove() {
    if (!sel.id || !confirm(`Delete this ${LABEL[sel.table].toLowerCase()} and everything inside it?`)) return;
    try { await deleteEntity({ data: { table: sel.table, id: sel.id } }); await refresh(); toast.success("Deleted"); onDeleted(); } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn’t delete."); }
  }
  return <div className="space-y-6">
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-xl">{sel.id ? "Edit" : "New"} {LABEL[sel.table].toLowerCase()}</h2>
      {fields.map((f) => <label key={f.key} className="block text-sm"><span className="mb-1 block font-medium">{f.label}</span>
        {f.kind === "long" ? <Textarea rows={4} value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
          : f.kind === "int" ? <Input type="number" min={1} value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: Number(e.target.value) })} />
          : f.kind === "bool" ? <Switch checked={values[f.key]} onCheckedChange={(c) => setValues({ ...values, [f.key]: c })} />
          : f.kind === "step" ? <select className="h-10 w-full rounded-lg border border-input bg-background px-3" value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}>{STEP_KEYS.map((s) => <option key={s} value={s}>{({ warmup: "Unplugged warm-up", make: "Make it", break: "Break it", think: "Think about it" } as Record<string, string>)[s]}</option>)}</select>
          : f.kind === "strand" ? <select className="h-10 w-full rounded-lg border border-input bg-background px-3 capitalize" value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}>{STRAND_KEYS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          : <Input value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />}
      </label>)}
      <div className="flex gap-3"><Button onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>{sel.id && <Button variant="ghost" onClick={() => void remove()}><Trash2 />Delete</Button>}</div>
    </div>
    {sel.table === "activities" && sel.id && <Versions activityId={sel.id} existing={row?.activity_versions ?? []} onSaved={refresh} />}
    {sel.table === "sessions" && sel.id && <Printables sessionId={sel.id} items={row?.printables ?? []} onChange={refresh} />}
  </div>;
}

function Versions({ activityId, existing, onSaved }: { activityId: string; existing: any[]; onSaved: () => Promise<unknown> }) {
  const [v, setV] = useState(() => BANDS.map((b) => { const e = existing.find((x) => x.age_band === b); return { age_band: b, kid_title: e?.kid_title ?? "", instructions: e?.instructions ?? "", minutes: e?.minutes ?? 10 }; }));
  const set = (i: number, patch: object) => setV(v.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  async function save() { try { await saveVersions({ data: { activityId, versions: v } }); await onSaved(); toast.success("Age versions saved"); } catch (e) { toast.error(e instanceof Error ? e.message : "Fill in every age version."); } }
  return <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
    <h2 className="text-xl">Age versions</h2>
    {v.map((x, i) => <div key={x.age_band} className="space-y-2 rounded-xl bg-muted p-4"><Badge variant="secondary" className="capitalize">{x.age_band}</Badge>
      <Input placeholder="Title kids see" value={x.kid_title} onChange={(e) => set(i, { kid_title: e.target.value })} />
      <Textarea rows={3} placeholder="Instructions" value={x.instructions} onChange={(e) => set(i, { instructions: e.target.value })} />
      <label className="flex items-center gap-2 text-sm">Minutes <Input type="number" className="w-24" min={1} max={120} value={x.minutes} onChange={(e) => set(i, { minutes: Number(e.target.value) })} /></label></div>)}
    <Button onClick={() => void save()}>Save age versions</Button>
  </div>;
}

function Printables({ sessionId, items, onChange }: { sessionId: string; items: any[]; onChange: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    setBusy(true);
    try {
      const path = `${sessionId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error } = await supabase.storage.from("printables").upload(path, file);
      if (error) throw new Error("Upload failed.");
      await addPrintable({ data: { sessionId, title: file.name.replace(/\.[^.]+$/, ""), filePath: path } });
      await onChange(); toast.success("Printable added");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed."); } finally { setBusy(false); }
  }
  async function remove(p: any) {
    await supabase.storage.from("printables").remove([p.file_path]);
    await deleteEntity({ data: { table: "printables", id: p.id } }); await onChange();
  }
  return <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
    <h2 className="text-xl">Printables</h2>
    <ul className="space-y-2">{items.map((p) => <li key={p.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">{p.title}<Button size="sm" variant="ghost" aria-label={`Remove ${p.title}`} onClick={() => void remove(p)}><Trash2 /></Button></li>)}</ul>
    {!items.length && <p className="text-sm text-muted-foreground">No printables yet.</p>}
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"><FileUp className="size-4" />{busy ? "Uploading…" : "Upload a file (PDF or image, up to 25MB)"}
      <input type="file" accept=".pdf,image/*" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} /></label>
  </div>;
}
