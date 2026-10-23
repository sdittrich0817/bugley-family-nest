import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getImageAdmin, saveImageModel, saveStyle } from "@/lib/images.functions";
import { STYLE_THUMBS } from "@/lib/style-thumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const MODE_LABEL: Record<string, string> = { sketch: "Sketches (1 glow)", final: "Finals (3 glow, print quality)", character: "Character references (1 glow)" };

export function ImageAdmin() {
  const { data } = useQuery({ queryKey: ["image-admin"], queryFn: () => getImageAdmin() });
  const [tab, setTab] = useState<"models" | "styles">("models");
  if (!data) return null;
  return <div className="mt-10 space-y-4">
    <div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl">Studio images</h2>
      <div className="flex rounded-full bg-muted p-1">{(["models", "styles"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === t ? "bg-card shadow-soft" : ""}`}>{t === "models" ? "Image Models" : "Style Recipes"}</button>)}</div></div>
    {tab === "models" ? <div className="grid gap-4 lg:grid-cols-3">{data.models.map((m) => <ModelCard key={m.mode} m={m} />)}
      <p className="text-sm text-muted-foreground lg:col-span-3">Model is a Replicate “owner/name”. Leave version empty to use an official model’s latest. Settings are sent to the model as-is (for finals, set the size/resolution so pictures print well at 300 DPI, e.g. 2400×3000 for 8×10 in). Two optional keys: <code>reference_field</code> names the model input that takes character images (e.g. <code>image_input</code>), and <code>reference_single: true</code> sends just one image. Until a model is set, kids see “My paintbrush isn’t ready yet!”.</p></div>
      : <div className="grid gap-4 md:grid-cols-2">{data.styles.map((s) => <StyleCard key={s.key} s={s} />)}</div>}
  </div>;
}

function ModelCard({ m }: { m: { mode: string; model: string; version: string; settings: Record<string, unknown> } }) {
  const qc = useQueryClient();
  const [model, setModel] = useState(m.model), [version, setVersion] = useState(m.version), [settings, setSettings] = useState(JSON.stringify(m.settings, null, 2));
  async function save() {
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(settings || "{}"); if (typeof parsed !== "object" || Array.isArray(parsed)) throw 0; } catch { toast.error("Settings must be a JSON object."); return; }
    try { await saveImageModel({ data: { mode: m.mode as "sketch", model, version, settings: parsed } }); await qc.invalidateQueries({ queryKey: ["image-admin"] }); toast.success("Saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn’t save."); }
  }
  return <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
    <h3 className="text-lg">{MODE_LABEL[m.mode]}</h3>
    <label className="block text-sm"><span className="mb-1 block font-medium">Model</span><Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="owner/model-name" /></label>
    <label className="block text-sm"><span className="mb-1 block font-medium">Version (optional)</span><Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="version hash" /></label>
    <label className="block text-sm"><span className="mb-1 block font-medium">Default settings (JSON)</span><Textarea rows={5} className="font-mono text-xs" value={settings} onChange={(e) => setSettings(e.target.value)} /></label>
    <Button onClick={() => void save()}>Save</Button>
  </div>;
}

function StyleCard({ s }: { s: { key: string; name: string; description: string; recipe: string; active: boolean } }) {
  const qc = useQueryClient();
  const [v, setV] = useState(s);
  async function save() {
    try { await saveStyle({ data: v }); await qc.invalidateQueries({ queryKey: ["image-admin"] }); await qc.invalidateQueries({ queryKey: ["art-styles"] }); toast.success("Saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn’t save."); }
  }
  return <div className="flex gap-4 rounded-2xl border border-border bg-card p-4">
    {STYLE_THUMBS[s.key] && <img src={STYLE_THUMBS[s.key]} alt="" loading="lazy" width={80} height={80} className="size-20 shrink-0 rounded-xl object-cover" />}
    <div className="min-w-0 flex-1 space-y-2">
      <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} aria-label="Friendly name" />
      <Input value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} aria-label="Short description" />
      <Textarea rows={3} value={v.recipe} onChange={(e) => setV({ ...v, recipe: e.target.value })} aria-label="Hidden prompt recipe" />
      <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm"><Switch checked={v.active} onCheckedChange={(c) => setV({ ...v, active: c })} />Shown to kids</label><Button size="sm" onClick={() => void save()}>Save</Button></div>
    </div>
  </div>;
}
