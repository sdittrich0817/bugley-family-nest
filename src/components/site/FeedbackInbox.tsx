import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { feedbackOptions, resolveFeedback } from "@/lib/feedback.functions";
import { Button } from "@/components/ui/button";

/** Admin-only list of tester notes, newest first, with open/resolved filter. */
export function FeedbackInbox() {
  const { data, error } = useQuery(feedbackOptions);
  const resolve = useServerFn(resolveFeedback); const qc = useQueryClient();
  const [showDone, setShowDone] = useState(false);
  if (error) return null;
  const rows = (data ?? []).filter((f: any) => showDone || !f.resolved);
  const open = (data ?? []).filter((f: any) => !f.resolved).length;
  return <section className="mt-10 rounded-2xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-2xl">Tester feedback <span className="text-base text-muted-foreground">({open} open)</span></h2>
      <Button variant="ghost" size="sm" onClick={() => setShowDone(!showDone)}>{showDone ? "Hide resolved" : "Show resolved"}</Button></div>
    {!rows.length ? <p className="mt-3 text-muted-foreground">No feedback yet.</p> : <ul className="mt-4 divide-y divide-border">{rows.map((f: any) => <li key={f.id} className="py-3">
      <p className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleString()} · {f.page} · {f.topic}{f.rating ? ` · ${f.rating}★` : ""}{f.email ? ` · ${f.email}` : ""}{f.user_id ? " · signed in" : ""}</p>
      <p className="mt-1 whitespace-pre-wrap">{f.message}</p>
      <Button size="sm" variant="outline" className="mt-2" onClick={async () => { await resolve({ data: { id: f.id, resolved: !f.resolved } }); await qc.invalidateQueries({ queryKey: feedbackOptions.queryKey }); }}>{f.resolved ? "Reopen" : "Mark resolved"}</Button>
    </li>)}</ul>}
  </section>;
}
