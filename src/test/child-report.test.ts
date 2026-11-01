import {describe,it,expect} from 'vitest';
import {buildChildReport} from '@/lib/child-report';
const now=Date.parse('2026-11-01T23:58:00Z');
const event=(id:string,child_id:string,created_at:string,decision='allowed')=>({id,child_id,created_at,decision,source:'sidekick',input:'My idea'});
describe('child interaction report',()=>{
  it('includes only the chosen child’s evidence',()=>{
    const r=buildChildReport('kid',7,[event('1','kid',new Date(now).toISOString()),event('2','sibling',new Date(now).toISOString())],[],[],now);
    expect(r.interactions.map(e=>e.id)).toEqual(['1']);
  });
  it('limits reports to the selected period and excludes future records',()=>{
    const r=buildChildReport('kid',7,[event('old','kid',new Date(now-8*86400000).toISOString()),event('recent','kid',new Date(now-86400000).toISOString()),event('future','kid',new Date(now+1).toISOString())],[],[],now);
    expect(r.interactions.map(e=>e.id)).toEqual(['recent']);
  });
  it('counts safety decisions separately without inferring personality',()=>{
    const r=buildChildReport('kid',null,[event('1','kid',new Date(now).toISOString(),'personal_info'),event('2','kid',new Date(now).toISOString(),'error')],[],[],now);
    expect(r.decisions.personal_info).toBe(1);expect(r.decisions.error).toBe(1);expect(r.decisions.unsafe).toBe(0);
  });
  it('counts game finishes, not starts, and separates learning',()=>{
    const r=buildChildReport('kid',7,[],[],[{id:'start-a',childId:'kid',at:new Date(now).toISOString(),category:'Games',title:'Start'},{id:'finish-a',childId:'kid',at:new Date(now).toISOString(),category:'Games',title:'Finished'},{id:'lesson',childId:'kid',at:new Date(now).toISOString(),category:'Learning',title:'Completed'}],now);
    expect(r.gameFinishes).toHaveLength(1);expect(r.learning).toHaveLength(1);expect(r.activeDays).toBe(1);
  });
});