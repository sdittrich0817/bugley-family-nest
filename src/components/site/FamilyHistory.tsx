import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { familyAuditOptions, type AuditEntry } from '@/lib/family-audit.functions';
import { studioActivityOptions } from '@/lib/studio.functions';
import { Button } from '@/components/ui/button';
import type { ChildProfile } from '@/lib/family';
export function FamilyHistory({ kids }: { kids: ChildProfile[] }) {
  const audit = useQuery(familyAuditOptions);
  const studio = useQuery(studioActivityOptions);
  const [childId,setChildId] = useState('all');
  const [category,setCategory] = useState('all');
  const [visible,setVisible] = useState(12);
  const entries: AuditEntry[] = [...(audit.data??[]),
    ...(studio.data?.events??[]).map((e:any)=>({id:`event-${e.id}`,childId:e.child_id,at:e.created_at,category:'Studio',title:e.input,detail:`${e.source} · ${e.decision}${e.reply ? ` · Bugley: ${e.reply}` : ''}`})),
    ...[...(studio.data?.creations??[]),...(studio.data?.deleted??[])].flatMap(c=>[
      {id:`creation-${c.id}`,childId:c.child_id,at:c.created_at,category:'Creations',title:`Created ${c.title}`,detail:c.kind},
      ...(c.updated_at !== c.created_at ? [{id:`updated-${c.id}`,childId:c.child_id,at:c.updated_at,category:'Creations',title:`Last updated ${c.title}`}]:[]),
      ...(c.deleted_at ? [{id:`deleted-${c.id}`,childId:c.child_id,at:c.deleted_at,category:'Creations',title:`Deleted ${c.title}`}]:[]),
    ]),
    ...(studio.data?.notifications??[]).map((n:any)=>({id:`notification-${n.id}`,childId:n.child_id,at:n.created_at,category:'Safety',title:'Shared something personal',detail:`${n.typed} · ${n.starter}`})),
  ].sort((a,b)=>b.at.localeCompare(a.at)).filter(e=>(childId==='all'||e.childId===childId)&&(category==='all'||e.category===category));
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3">
      <select aria-label="History child" className="h-11 rounded-lg border border-input bg-background px-3" value={childId} onChange={e=>{setChildId(e.target.value);setVisible(12);}}><option value="all">All children</option>{kids.map(k=><option key={k.id} value={k.id}>{k.nickname}</option>)}</select>
      <select aria-label="History type" className="h-11 rounded-lg border border-input bg-background px-3" value={category} onChange={e=>{setCategory(e.target.value);setVisible(12);}}><option value="all">All activity</option>{['Studio','Creations','Games','Learning','Safety','Glow','Printing'].map(c=><option key={c}>{c}</option>)}</select>
      <Button variant="ghost" size="icon" aria-label="Refresh history" title="Refresh history" onClick={()=>{void audit.refetch();void studio.refetch();}}><RefreshCw /></Button>
      <span className="text-sm text-muted-foreground">{entries.length} recorded entries</span>
    </div>
    {(audit.isError||studio.isError) ? <p role="alert">Some history couldn’t load. Refresh to try again.</p> : audit.isPending||studio.isPending ? <p role="status">Opening family history…</p> : <>
      <ul className="divide-y divide-border">{entries.slice(0,visible).map(e=><li key={e.id} className="flex gap-3 py-4"><History className="mt-1 size-4 shrink-0 text-muted-foreground"/><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{kids.find(k=>k.id===e.childId)?.nickname??'Your child'} · {e.category} · {new Date(e.at).toLocaleString()}</p><p className="mt-1 break-words text-sm font-semibold">{e.title}</p>{e.detail&&<details className="mt-1 text-sm"><summary className="cursor-pointer text-muted-foreground">Details</summary><p className="mt-2 whitespace-pre-wrap break-words">{e.detail}</p></details>}</div></li>)}</ul>
      {!entries.length&&<p className="py-6 text-muted-foreground">No recorded activity here yet.</p>}
      {visible<entries.length&&<Button variant="outline" onClick={()=>setVisible(v=>v+12)}>Show more activity</Button>}
      <p className="text-xs text-muted-foreground">Saved Studio interactions, creations, learning, graded games, Glow and print requests. Local practice games aren’t recorded; deleted creations remain available for 30 days. Creation updates show the latest saved change, not every edit.</p>
    </>}
  </div>;
}