import { createServerFn } from '@tanstack/react-start';
import { queryOptions } from '@tanstack/react-query';
import { requireParentDevice } from './parent-device.functions';
export type AuditEntry = { id: string; childId: string; at: string; category: string; title: string; detail?: string };
export const getFamilyAudit = createServerFn({ method: 'GET' }).middleware([requireParentDevice]).handler(async ({ context }) => {
  const db = context.supabase;
  const all = async (query: any) => {
    const rows: any[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await query.range(offset, offset + 499);
      if (error) throw new Error('Couldn’t load family history. Please try again.');
      rows.push(...(data ?? []));
      if ((data ?? []).length < 500) return rows;
    }
  };
  const queries = [
    db.from('game_rounds').select('id,child_id,game,score,total,started_at,finished_at').eq('parent_id',context.userId).order('started_at').order('id'),
    db.from('play_sessions').select('id,child_id,game,score,started_at,finished_at').eq('parent_id',context.userId).order('started_at').order('id'),
    db.from('child_activity_progress').select('child_id,activity_id,completed_at,activities(title)').eq('parent_id',context.userId).order('completed_at').order('activity_id').order('child_id'),
    db.from('child_session_progress').select('child_id,session_id,completed_at,sessions(title)').eq('parent_id',context.userId).order('completed_at').order('session_id').order('child_id'),
    db.from('child_badges').select('child_id,unit_id,earned_at,units(badge_name)').eq('parent_id',context.userId).order('earned_at').order('unit_id').order('child_id'),
    db.from('glow_ledger').select('id,child_id,amount,reason,created_at').eq('parent_id',context.userId).order('created_at').order('id'),
    db.from('print_requests').select('id,child_id,status,created_at').eq('parent_id',context.userId).order('created_at').order('id'),
  ];
  const [rounds, plays, activities, sessions, badges, glow, prints] = await Promise.all(queries.map(all));
  const entries: AuditEntry[] = [];
  for (const r of [...rounds,...plays]) {
    entries.push({id:`start-${r.id}`,childId:r.child_id,at:r.started_at,category:'Games',title:`Started ${r.game.replaceAll('_',' ')}`});
    if(r.finished_at) entries.push({id:`finish-${r.id}`,childId:r.child_id,at:r.finished_at,category:'Games',title:`Finished ${r.game.replaceAll('_',' ')}`,detail:`Score: ${r.score ?? 0}${r.total ? ` / ${r.total}` : ''}`});
  }
  for (const r of activities) entries.push({id:`activity-${r.child_id}-${r.activity_id}`,childId:r.child_id,at:r.completed_at,category:'Learning',title:`Completed ${r.activities?.title ?? 'an activity'}`});
  for (const r of sessions) entries.push({id:`session-${r.child_id}-${r.session_id}`,childId:r.child_id,at:r.completed_at,category:'Learning',title:`Completed ${r.sessions?.title ?? 'a family session'}`});
  for (const r of badges) entries.push({id:`badge-${r.child_id}-${r.unit_id}`,childId:r.child_id,at:r.earned_at,category:'Learning',title:`Earned ${r.units?.badge_name ?? 'a badge'}`});
  for (const r of glow) entries.push({id:`glow-${r.id}`,childId:r.child_id,at:r.created_at,category:'Glow',title:`${r.amount > 0 ? '+' : ''}${r.amount} Glow`,detail:r.reason});
  for (const r of prints) entries.push({id:`print-${r.id}`,childId:r.child_id,at:r.created_at,category:'Printing',title:'Asked to print a book',detail:r.status});
  return entries.sort((a,b)=>b.at.localeCompare(a.at));
});
export const familyAuditOptions = queryOptions({queryKey:['family-audit'],queryFn:()=>getFamilyAudit(),staleTime:30000});