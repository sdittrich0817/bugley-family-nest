import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from 'react';
import { Bell, BookOpen, MessageCircle, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Bugley } from "@/components/brand/Bugley";
import { Button } from "@/components/ui/button";
import { markNotificationRead, purgeCreation, restoreCreation, studioActivityOptions } from "@/lib/studio.functions";
import type { ChildProfile } from "@/lib/family";

const card = "rounded-2xl border border-border bg-card p-5 shadow-soft";
const DECISION: Record<string, string> = { allowed: "", personal_info: "Kept private", unsafe: "Redirected", copyright: "Made original", error: "Redirected" };
const when = (d: string) => new Date(d).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function StudioActivity({ kids }: { kids: ChildProfile[] }) {
  const qc = useQueryClient();
  const [visible,setVisible]=useState(60);
  const { data, isLoading } = useQuery(studioActivityOptions);
  const name = (id: string) => kids.find((k) => k.id === id)?.nickname ?? "Your child";
  const refresh = () => qc.invalidateQueries({ queryKey: studioActivityOptions.queryKey });
  const act = async (p: Promise<unknown>, ok: string) => { try { await p; toast.success(ok); await refresh(); } catch { toast.error("That didn’t work. Please try again."); } };
  if (isLoading || !data) return <div className={`${card} h-32 animate-pulse`} />;
  const feed = [
    ...data.events.map((e: any) => ({ at: e.created_at, key: `e${e.id}`, el: <li key={`e${e.id}`} className="flex gap-3 py-3">
      {e.decision === "allowed" ? <MessageCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" /> : <ShieldCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
      <div className="min-w-0 whitespace-pre-wrap break-words text-sm"><p><b>{name(e.child_id)}</b> {e.source === "rename" ? "renamed something to" : ['sidekick','prompt_bar','chip'].includes(e.source) ? "asked Bugley" : "used in the Studio"}: “{e.input}”{DECISION[e.decision] && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{DECISION[e.decision]}</span>}</p>
        {e.reply && <p className="mt-1 text-muted-foreground">Bugley: {e.reply}</p>}<p className="mt-1 text-xs text-muted-foreground">{when(e.created_at)}</p></div></li> })),
    ...data.creations.map((c) => ({ at: c.created_at, key: `c${c.id}`, el: <li key={`c${c.id}`} className="flex gap-3 py-3"><BookOpen className="mt-0.5 size-5 shrink-0 text-muted-foreground" /><div className="text-sm"><p><b>{name(c.child_id)}</b> made a {c.kind}: “{c.title}”</p><p className="mt-1 text-xs text-muted-foreground">{when(c.created_at)}</p></div></li> })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const notifications = data.notifications;
  return <div className="space-y-4">
    {notifications.map((n: any) => <div key={n.id} className="rounded-2xl border border-primary/50 bg-primary/15 p-5">
      <p className="flex items-center gap-2 font-semibold"><Bell className="size-4" />{name(n.child_id)} shared something personal · {when(n.created_at)}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm">They shared: “{n.typed}”</p>
      <p className="mt-2 text-sm text-muted-foreground">{n.starter}</p>
      {n.read?<p className="mt-3 text-xs text-muted-foreground">Read</p>:<Button size="sm" variant="secondary" className="mt-3" onClick={() => act(markNotificationRead({ data: { id: n.id } }), "Marked as read")}>Got it</Button>}
    </div>)}
    {feed.length ? <><ul className={`${card} divide-y divide-border py-1`}>{feed.slice(0, visible).map((f) => f.el)}</ul>{visible<feed.length&&<Button variant="outline" onClick={()=>setVisible(visible+60)}>Load more</Button>}</>
      : <div className={`${card} flex flex-col items-center gap-3 py-10 text-center`}><Bugley stage="scout" expression="sleepy" size={72} /><p className="text-muted-foreground">Your kids’ creations will show up here.</p></div>}
    {data.deleted.length > 0 && <details className={card}>
      <summary className="cursor-pointer font-semibold">Recently deleted ({data.deleted.length}) · kept for 30 days</summary>
      <ul className="mt-3 divide-y divide-border">{data.deleted.map((c) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
        <span><b>{name(c.child_id)}</b> · {c.title} ({c.kind})</span>
        <span className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => act(restoreCreation({ data: { id: c.id } }), "Restored to the album")}><RotateCcw />Restore</Button>
          <Button size="sm" variant="ghost" onClick={() => act(purgeCreation({ data: { id: c.id } }), "Deleted for good")}><Trash2 />Delete forever</Button></span>
      </li>)}</ul>
    </details>}
  </div>;
}
