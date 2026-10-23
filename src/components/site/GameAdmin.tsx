import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { deleteGameContent, listGameContent, saveGameContent } from "@/lib/games.functions";
import { GAMES, GAME_KEYS, type GameKey } from "@/lib/games";

const BANDS = ["sprouts", "explorers", "builders"] as const;
const TEMPLATES: Record<GameKey, object> = {
  real_robot: { answer: "robot", clue: "Look at the hands!" },
  fact_fib: { statement: "", answer: "fib", clues: [{ kind: "book", title: "", text: "" }], explain: "" },
  robot_chef: { task: "", steps: [{ id: "a", text: "", ifMissing: "" }], decoys: [{ id: "x", text: "", funny: "" }] },
  train_bugley: { task: "", groups: ["", ""], twist: false, examples: [{ id: "e1", emoji: "", name: "", traits: { color: "" } }], tests: [{ emoji: "", name: "", group: "", traits: { color: "" } }] },
};
const field = "w-full rounded-lg border border-border bg-background p-2 text-sm";

export function GameAdmin() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({ queryKey: ["game-admin"], queryFn: () => listGameContent() });
  const [game, setGame] = useState<GameKey>("real_robot");
  const [edit, setEdit] = useState<any | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["game-admin"] });
  const list = rows.filter((r: any) => r.game === game);
  const blank = () => ({ game, level: 1, bands: [...GAMES[game].bands], data: TEMPLATES[game], image_path: null, position: list.length + 1, active: true, url: "" });
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
    <h2 className="text-2xl">Arcade games</h2>
    <p className="text-sm text-muted-foreground">Everything kids see in the Arcade comes from here. Nothing is generated while they play.</p>
    <div className="flex flex-wrap gap-2">{GAME_KEYS.map((k) => <Button key={k} size="sm" variant={game === k ? "primary" : "outline"} onClick={() => { setGame(k); setEdit(null); }}>{GAMES[k].name} ({rows.filter((r: any) => r.game === k).length})</Button>)}</div>
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <ul className="max-h-[32rem] space-y-1 overflow-auto">{list.map((r: any) => <li key={r.id}><button onClick={() => setEdit({ ...r })} className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-muted">{r.url && <img src={r.url} alt="" className="size-10 rounded object-cover" />}<span className="flex-1 truncate">L{r.level} · {r.data.statement ?? r.data.task ?? `${r.data.answer}: ${r.data.clue}`}</span>{!r.active && <span className="text-xs">off</span>}</button></li>)}
        <li><Button size="sm" variant="outline" onClick={() => setEdit(blank())}>+ Add item</Button></li></ul>
      {edit && <Editor key={edit.id ?? "new"} row={edit} onDone={() => { setEdit(null); void refresh(); }} />}
    </div>
  </section>;
}

function Editor({ row, onDone }: { row: any; onDone: () => void }) {
  const [r, setR] = useState(row);
  const [json, setJson] = useState(JSON.stringify(row.data, null, 2));
  const [busy, setBusy] = useState(false);
  const real = r.game === "real_robot";
  async function upload(file: File) {
    setBusy(true);
    const path = `${crypto.randomUUID()}.${file.name.split(".").pop() ?? "jpg"}`;
    const { error } = await supabase.storage.from("game-images").upload(path, file, { contentType: file.type });
    setBusy(false);
    if (error) { toast.error("Upload failed."); return; }
    setR({ ...r, image_path: path, url: URL.createObjectURL(file) });
  }
  async function save() {
    let data: Record<string, unknown>;
    try { data = real ? { answer: r.data.answer, clue: r.data.clue } : JSON.parse(json); } catch { toast.error("That item text isn’t valid JSON."); return; }
    if (real && !r.image_path) { toast.error("Upload an image first."); return; }
    setBusy(true);
    try { await saveGameContent({ data: { id: r.id, game: r.game, level: r.level, bands: r.bands, data, image_path: r.image_path, position: r.position, active: r.active } }); toast.success("Saved"); onDone(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); } finally { setBusy(false); }
  }
  return <div className="space-y-3 rounded-xl border border-border p-4">
    <div className="flex flex-wrap gap-3 text-sm">
      <label>Level <select className={field} value={r.level} onChange={(e) => setR({ ...r, level: Number(e.target.value) })}>{[1, 2, 3].map((l) => <option key={l}>{l}</option>)}</select></label>
      <label>Order <input type="number" className={field} value={r.position} onChange={(e) => setR({ ...r, position: Number(e.target.value) })} /></label>
      <label className="flex items-center gap-1"><input type="checkbox" checked={r.active} onChange={(e) => setR({ ...r, active: e.target.checked })} />Active</label>
    </div>
    <div className="flex flex-wrap gap-3 text-sm">{BANDS.map((b) => <label key={b} className="flex items-center gap-1"><input type="checkbox" checked={r.bands.includes(b)} onChange={(e) => setR({ ...r, bands: e.target.checked ? [...r.bands, b] : r.bands.filter((x: string) => x !== b) })} />{b}</label>)}</div>
    {real ? <>
      {r.url && <img src={r.url} alt="" className="max-h-48 rounded-lg" />}
      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
      <div className="flex gap-2">{(["real", "robot"] as const).map((a) => <Button key={a} size="sm" variant={r.data.answer === a ? "primary" : "outline"} onClick={() => setR({ ...r, data: { ...r.data, answer: a } })}>{a === "real" ? "Real photo" : "AI-made"}</Button>)}</div>
      <label className="block text-sm">Clue Bugley points out<input className={field} value={r.data.clue} onChange={(e) => setR({ ...r, data: { ...r.data, clue: e.target.value } })} /></label>
      <p className="text-xs text-muted-foreground">Use only images you have the rights to. No real children’s faces.</p>
    </> : <label className="block text-sm">Item details (JSON)<textarea rows={16} className={`${field} font-mono`} value={json} onChange={(e) => setJson(e.target.value)} /></label>}
    <div className="flex gap-2"><Button disabled={busy} onClick={() => void save()}>Save</Button>{r.id && <Button variant="outline" disabled={busy} onClick={async () => { if (!window.confirm("Delete this item?")) return; await deleteGameContent({ data: { id: r.id } }); onDone(); }}>Delete</Button>}<Button variant="ghost" onClick={onDone}>Cancel</Button></div>
  </div>;
}
