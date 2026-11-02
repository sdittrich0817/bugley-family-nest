import type { AuditEntry } from './family-audit.functions';
type Event = {id:string;child_id:string;created_at:string;source:string;input:string;decision:string;reply?:string|null};
type Work = {id:string;child_id:string;created_at:string;kind:string;title:string};
export function buildChildReport(childId:string,days:number|null,events:Event[],creations:Work[],audit:AuditEntry[],now=Date.now()) {
  const cutoff=days===null?0:now-days*86400000;
  const within=(date:string)=>{const at=Date.parse(date);return Number.isFinite(at)&&at>=cutoff&&at<=now;};
  const interactions=events.filter(e=>e.child_id===childId&&within(e.created_at)).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  const work=creations.filter(c=>c.child_id===childId&&within(c.created_at));
  const records=audit.filter(a=>a.childId===childId&&within(a.at));
  const countDecision=(decision:string)=>interactions.filter(e=>e.decision===decision).length;
  const decisions={allowed:countDecision('allowed'),personal_info:countDecision('personal_info'),unsafe:countDecision('unsafe'),copyright:countDecision('copyright'),error:countDecision('error')};
  const kinds=Object.entries(work.reduce<Record<string,number>>((counts,c)=>{counts[c.kind]=(counts[c.kind]??0)+1;return counts;},{}));
  const gameFinishes=records.filter(r=>r.category==='Games'&&r.id.startsWith('finish-'));
  const learning=records.filter(r=>r.category==='Learning');
  const activeDays=new Set([...interactions.map(e=>e.created_at),...work.map(c=>c.created_at),...records.filter(r=>['Games','Learning'].includes(r.category)).map(r=>r.at)].map(d=>d.slice(0,10))).size;
  return {interactions,work,gameFinishes,learning,decisions,kinds,activeDays};
}