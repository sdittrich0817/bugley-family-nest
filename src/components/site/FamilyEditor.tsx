import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Check, ChevronLeft, Plus, Pencil, Trash2, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bugley } from "@/components/brand/Bugley";
import { ChildAvatar, PictureIcon } from "@/components/site/ChildAvatar";
import { AVATARS, PICTURES, MAX_CHILDREN, agePlacement, saveChildSchema, type ChildProfile, type SaveChildInput } from "@/lib/family";
import { familyOptions, saveChild, removeChild } from "@/lib/family.functions";

export function FamilyEditor({ onFinish, finishing = false }: { onFinish?: () => void; finishing?: boolean }) {
  const { data } = useSuspenseQuery(familyOptions);
  const queryClient = useQueryClient();
  const save = useServerFn(saveChild); const remove = useServerFn(removeChild);
  const [editing, setEditing] = useState<ChildProfile | "new" | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function persist(input: SaveChildInput) {
    setBusy(true); setError("");
    try { await save({ data: input }); await queryClient.invalidateQueries({ queryKey: ["family"] }); setEditing(null); }
    catch (err) { setError(err instanceof Error ? err.message : "We couldn’t save your child."); }
    finally { setBusy(false); }
  }
  async function deleteChild(id: string) {
    setBusy(true); setError("");
    try { await remove({ data: { id } }); await queryClient.invalidateQueries({ queryKey: ["family"] }); setDeleting(null); }
    catch (err) { setError(err instanceof Error ? err.message : "We couldn’t remove your child."); }
    finally { setBusy(false); }
  }
  if (editing) return <ChildForm key={editing === "new" ? "new" : editing.id} child={editing === "new" ? undefined : editing} onSave={persist} onCancel={() => { setEditing(null); setError(""); }} busy={busy} error={error} />;
  return <div className="space-y-6">
    <div className="flex items-center justify-between"><h2 className="text-2xl">Your crew</h2><span className="text-sm text-muted-foreground">{data.children.length} / {MAX_CHILDREN} children</span></div>
    {data.children.length === 0 && <div className="py-6 text-center"><Bugley stage="hatchling" expression="curious" size={100} className="mx-auto" /><p className="mt-3 text-muted-foreground">Who’s joining the adventure?</p></div>}
    <ul className="divide-y divide-border border-y border-border">
      {data.children.map(child => <li key={child.id} className="py-5">
        <div className="flex items-center gap-3"><ChildAvatar avatar={child.avatar} className="size-14 shrink-0" /><div className="min-w-0 flex-1"><h3 className="break-words text-xl">{child.nickname}</h3><p className="text-sm text-muted-foreground">Age {child.age} · <span className="capitalize">{child.age_band}</span></p><p className="text-sm text-muted-foreground"><span className="capitalize">{child.bugley_stage}</span> Bugley · {child.login_kind === "pin" ? "PIN" : "Picture password"}</p></div><Button size="icon" variant="ghost" aria-label={`Edit ${child.nickname}`} title={`Edit ${child.nickname}`} onClick={() => { setEditing(child); setError(""); }}><Pencil /></Button><Button size="icon" variant="ghost" aria-label={`Remove ${child.nickname}`} title={`Remove ${child.nickname}`} onClick={() => setDeleting(child.id)}><Trash2 /></Button></div>
        {deleting === child.id && <div className="mt-4 space-y-3" role="alert"><p className="text-sm">Remove {child.nickname} and their saved child login? This cannot be undone.</p><div className="flex flex-wrap gap-2"><Button variant="destructive" disabled={busy} onClick={() => void deleteChild(child.id)}>Remove child</Button><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Keep child</Button></div></div>}
      </li>)}
    </ul>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button variant="outline" className="w-full" disabled={data.children.length >= MAX_CHILDREN || busy} onClick={() => { setEditing("new"); setError(""); }}><Plus />Add a child</Button>
    {onFinish && <Button className="w-full" disabled={!data.children.length || finishing || busy} onClick={onFinish}>{finishing ? "Getting your family ready…" : "Finish family setup"}<Check /></Button>}
  </div>;
}

function ChildForm({ child, onSave, onCancel, busy, error }: { child?: ChildProfile | undefined; onSave: (input: SaveChildInput) => Promise<void>; onCancel: () => void; busy: boolean; error: string }) {
  const [nickname, setNickname] = useState(child?.nickname ?? ""); const [age, setAge] = useState(child?.age ?? 5);
  const [avatar, setAvatar] = useState<typeof AVATARS[number]>(child?.avatar ?? "fox");
  const [step, setStep] = useState<"details" | "login">("details");
  const [kind, setKind] = useState<"pin" | "pictures">(child?.login_kind ?? "pin");
  const [pin, setPin] = useState(""); const [pictures, setPictures] = useState<Array<typeof PICTURES[number]>>([]);
  const [replaceLogin, setReplaceLogin] = useState(!child); const [validation, setValidation] = useState("");
  const placement = agePlacement(age);
  async function submit(e: FormEvent) {
    e.preventDefault(); setValidation("");
    const input = { id: child?.id, nickname, age, avatar, credential: replaceLogin ? kind === "pin" ? { kind, pin } : { kind, pictures } : undefined };
    const parsed = saveChildSchema.safeParse(input);
    if (!parsed.success) { setValidation(parsed.error.issues[0]?.message ?? "Check your child’s details."); return; }
    if (step === "details") { setStep("login"); return; }
    await onSave(parsed.data);
  }
  function next(e: FormEvent) {
    e.preventDefault();
    const parsed = saveChildSchema.safeParse({ id: child?.id, nickname, age, avatar, credential: {kind:"pin",pin:"0000"} });
    if (!parsed.success) { setValidation(parsed.error.issues[0]?.message ?? "Check the details."); return; }
    setValidation(""); setStep("login");
  }
  return <form onSubmit={step === "details" ? next : submit} className="space-y-6">
    <div className="flex items-center justify-between"><h2 className="text-2xl">{step === "details" ? child ? "Edit your child" : "Meet your next adventurer" : `${nickname}’s login`}</h2><Button type="button" variant="ghost" size="icon" onClick={onCancel} disabled={busy} aria-label="Cancel child changes" title="Cancel"><X /></Button></div>
    <p className="text-sm text-muted-foreground">{step === "details" ? "First name or nickname only. No photos, last names, or child emails." : "Chosen by you. Made simple for them."}</p>
    {step === "details" ? <>
      <div className="space-y-2"><Label htmlFor="child-name">First name or nickname</Label><Input id="child-name" value={nickname} onChange={e => setNickname(e.target.value)} maxLength={40} autoComplete="off" required /></div>
      <div className="space-y-2"><Label htmlFor="child-age">Age</Label><select id="child-age" value={age} onChange={e => setAge(Number(e.target.value))} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-foreground focus-visible:ring-2 focus-visible:ring-ring">{Array.from({length:8}, (_,i) => i+5).map(a => <option key={a} value={a}>{a}</option>)}</select></div>
      <fieldset><legend className="mb-3 font-medium">Pick an avatar</legend><div className="grid grid-cols-3 gap-3">{AVATARS.map(a => <Button key={a} type="button" variant="outline" className={`h-28 flex-col gap-1 px-2 ${avatar === a ? "border-primary bg-secondary ring-2 ring-primary" : ""}`} aria-pressed={avatar === a} onClick={() => setAvatar(a)}><ChildAvatar avatar={a} className="size-16" /><span className="capitalize">{a}</span></Button>)}</div></fieldset>
      <div className="flex items-center gap-4 border-y border-border py-4"><Bugley stage={placement.bugley_stage} expression="happy" size={72} /><p className="text-sm"><strong className="capitalize">{placement.age_band}</strong><br /><span className="capitalize">{placement.bugley_stage}</span> Bugley is ready to join them.</p></div>
    </> : <>
      {child && <label className="flex items-center gap-3"><input type="checkbox" className="size-5 accent-primary" checked={replaceLogin} onChange={e => setReplaceLogin(e.target.checked)} />Change child login</label>}
      {replaceLogin && <><div className="grid grid-cols-2 gap-2" role="group" aria-label="Child login method"><Button type="button" variant={kind === "pin" ? "secondary" : "outline"} aria-pressed={kind === "pin"} onClick={() => setKind("pin")}>4-digit PIN</Button><Button type="button" variant={kind === "pictures" ? "secondary" : "outline"} aria-pressed={kind === "pictures"} onClick={() => setKind("pictures")}>Picture password</Button></div>
      {kind === "pin" ? <div className="space-y-2"><Label htmlFor="child-pin">Choose a 4-digit PIN</Label><Input id="child-pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} pattern="[0-9]{4}" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,""))} required className="h-14 text-center text-2xl" /></div> : <fieldset><legend className="mb-3">Pick 3 pictures in order</legend><div className="mb-4 grid grid-cols-3 gap-3" aria-label="Chosen picture sequence">{[0,1,2].map(i => <div key={i} className="flex h-16 items-center justify-center gap-2 rounded-lg border border-border bg-secondary"><span className="text-sm text-muted-foreground">{i+1}</span>{pictures[i] && <PictureIcon picture={pictures[i]} />}</div>)}</div><div className="grid grid-cols-3 gap-3">{PICTURES.map(p => <Button key={p} type="button" variant="outline" className="h-20 flex-col gap-2 px-2 [&_svg]:size-8" disabled={pictures.length === 3} aria-label={`Choose ${p}`} onClick={() => setPictures([...pictures,p])}><PictureIcon picture={p} /><span className="capitalize">{p}</span></Button>)}</div><Button type="button" variant="ghost" className="mt-2" disabled={!pictures.length} onClick={() => setPictures(pictures.slice(0,-1))}><Undo2 />Undo last picture</Button></fieldset>}
      </>}
    </>}
    {(validation || error) && <p role="alert" className="text-sm text-destructive">{validation || error}</p>}
    <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : step === "details" ? "Continue to child login" : child ? "Save changes" : "Add to your crew"}</Button>
    {step === "login" && <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={() => {setStep("details");setValidation("");}}><ChevronLeft />Back to child details</Button>}
  </form>;
}