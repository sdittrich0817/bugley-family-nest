import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Download,FileText,RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { studioActivityOptions } from '@/lib/studio.functions';
import { familyAuditOptions } from '@/lib/family-audit.functions';
import { buildChildReport } from '@/lib/child-report';
import type { ChildProfile } from '@/lib/family';
export function ChildReport({child}:{child:ChildProfile}) {
  const [open,setOpen]=useState(false);
  return <><Button variant="outline" className="mt-4 w-full" onClick={()=>setOpen(true)}><FileText/>Interaction report</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{child.nickname}’s interaction report</DialogTitle><DialogDescription>A snapshot of recorded activity, with their own words and Bugley’s replies.</DialogDescription></DialogHeader>{open&&<ReportBody child={child}/>}</DialogContent></Dialog></>;
}
function ReportBody({child}:{child:ChildProfile}) {
  const [period,setPeriod]=useState('7');const [visible,setVisible]=useState(5);
  const studio=useQuery(studioActivityOptions),audit=useQuery(familyAuditOptions);
  const report=buildChildReport(child.id,period==='all'?null:Number(period),studio.data?.events??[],[...(studio.data?.creations??[]),...(studio.data?.deleted??[])],audit.data??[]);
  const refreshed=()=>{void studio.refetch();void audit.refetch();};
  const range=period==='all'?'All recorded time':`Last ${period} days`;
  const ready=!!studio.data&&!!audit.data&&!studio.isError&&!audit.isError;
  const summary=`${child.nickname} · ${range}\nGenerated ${new Date().toLocaleString()}\n\n${report.interactions.length} recorded Studio interactions\n${report.work.length} creations started\n${report.gameFinishes.length} graded games finished\n${report.learning.length} learning completions / badges\n${report.activeDays} days with recorded Studio, creation, game or learning activity (UTC)\n\nSafety decisions: ${report.decisions.personal_info} personal-information blocks; ${report.decisions.unsafe} unsafe redirects; ${report.decisions.copyright} originality redirects; ${report.decisions.error} safety-check errors.\n\n`;
  function download(){
    const evidence=report.interactions.map(e=>`${new Date(e.created_at).toLocaleString()} · ${e.source} · ${e.decision}\nChild: ${e.input}\nBugley: ${e.reply??'No recorded reply'}`).join('\n\n');
    const text=summary+'INTERACTIONS\n'+evidence+'\n\nCREATIONS\n'+report.work.map(c=>`${c.kind}: ${c.title}`).join('\n')+'\n\nThis is recorded activity, not a personality or learning assessment. Local practice games, every edit and total screen time are not included.';
    const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='bugley-child-interaction-report.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div className="space-y-5"><div className="flex flex-wrap gap-2"><select aria-label="Report period" value={period} onChange={e=>{setPeriod(e.target.value);setVisible(5);}} className="h-11 rounded-lg border border-input bg-background px-3"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All recorded time</option></select><Button variant="ghost" size="icon" title="Refresh report" aria-label="Refresh report" onClick={refreshed}><RefreshCw/></Button><Button variant="outline" disabled={!ready} onClick={download}><Download/>Download report</Button></div>
    {(studio.isError||audit.isError)?<p role="alert">Some activity couldn’t load. Refresh before generating a report.</p>:!ready?<p role="status">Gathering recorded activity…</p>:<>
      <div className="grid grid-cols-2 gap-4 border-y border-border py-4">{[[report.interactions.length,'Studio interactions'],[report.work.length,'Creations started'],[report.gameFinishes.length,'Graded games finished'],[report.learning.length,'Learning completions & badges']].map(([count,label])=><div key={label}><p className="font-display text-2xl">{count}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div>
      <section><h3 className="text-lg">How they interacted</h3><p className="mt-2 text-sm leading-relaxed">{report.interactions.length?`${report.interactions.length} recorded Studio requests across ${report.activeDays} days with recorded activity. ${report.decisions.allowed} passed the safety check.`:'No Studio interactions recorded in this period yet.'}</p>{report.kinds.length>0&&<p className="mt-2 text-sm text-muted-foreground">Creations started: {report.kinds.map(([kind,count])=>`${count} ${kind}`).join(' · ')}.</p>}</section>
      <section><h3 className="text-lg">Safety &amp; boundaries</h3><ul className="mt-2 space-y-1 text-sm"><li>Personal information kept private: {report.decisions.personal_info}</li><li>Unsafe requests redirected: {report.decisions.unsafe}</li><li>Originality redirects: {report.decisions.copyright}</li><li>Safety-check errors: {report.decisions.error} (not evidence of unsafe behavior)</li></ul></section>
      <section><h3 className="text-lg">Their words &amp; Bugley’s replies</h3><ul className="mt-3 divide-y divide-border">{report.interactions.slice(0,visible).map(e=><li key={e.id} className="py-3"><p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()} · {e.source} · {e.decision}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">“{e.input}”</p><details className="mt-2 text-sm"><summary className="cursor-pointer font-semibold">Bugley’s reply</summary><p className="mt-2 whitespace-pre-wrap break-words">{e.reply??'No reply recorded.'}</p></details></li>)}</ul>{visible<report.interactions.length&&<Button variant="ghost" onClick={()=>setVisible(v=>v+5)}>More interactions</Button>}</section>
      <section className="border-l-4 border-primary pl-4"><h3 className="text-lg">A conversation to try</h3><p className="mt-2 text-sm">{report.decisions.personal_info?'“What things should we keep private when using AI?”':'“Show me an idea you made your own. What did Bugley help with, and what did you decide?”'}</p></section>
      <p className="text-xs leading-relaxed text-muted-foreground">This is an activity summary, not a personality, wellbeing or learning assessment. Local practice games, every edit and total screen time aren’t included. Deleted creations are available for 30 days; recorded days use UTC.</p>
    </>}
  </div>;
}