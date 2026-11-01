import { createServerFn } from '@tanstack/react-start';
import { queryOptions } from '@tanstack/react-query';
import { requireParentDevice } from './parent-device.functions';
import { newsSchema } from './family-news';
async function assertEditor(ctx:any) {
  const {data,error}=await ctx.supabase.rpc('has_role',{_user_id:ctx.userId,_role:'admin'});
  if(error||data!==true)throw new Error('Only the Bugley editor can manage news.');
}
export const getFamilyNews=createServerFn({method:'GET'}).middleware([requireParentDevice]).handler(async({context})=>{
  const {data,error}=await context.supabase.from('family_ai_news').select('*').eq('status','published').order('published_at',{ascending:false}).limit(12);
  if(error)throw new Error('Couldn’t load family news.');return data??[];
});
export const familyNewsOptions=queryOptions({queryKey:['family-news'],queryFn:()=>getFamilyNews(),staleTime:60000});
export const getNewsQueue=createServerFn({method:'GET'}).middleware([requireParentDevice]).handler(async({context})=>{
  await assertEditor(context);
  const {data,error}=await context.supabase.from('family_ai_news').select('*').neq('status','dismissed').order('source_date',{ascending:false});
  if(error)throw new Error('Couldn’t load the editorial queue.');return data??[];
});
export const newsQueueOptions=queryOptions({queryKey:['news-queue'],queryFn:()=>getNewsQueue()});
export const discoverFamilyNews=createServerFn({method:'POST'}).middleware([requireParentDevice]).handler(async({context})=>{
  await assertEditor(context);
  const {fetchFamilyHeadlines}=await import('./family-news.server');
  const candidates=await fetchFamilyHeadlines();
  // Ignore existing URLs: never overwrite Shea’s responses or resurrect dismissed stories.
  if(candidates.length){const {error}=await context.supabase.from('family_ai_news').upsert(candidates,{onConflict:'source_url',ignoreDuplicates:true});if(error)throw new Error('Couldn’t save the news shortlist.');}
  return {found:candidates.length};
});
export const saveFamilyNews=createServerFn({method:'POST'}).middleware([requireParentDevice]).inputValidator((i:unknown)=>newsSchema.parse(i)).handler(async({data,context})=>{
  await assertEditor(context);
  const {id,...values}=data;
  const {data:row,error}=await context.supabase.from('family_ai_news').update({...values,updated_at:new Date().toISOString(),published_at:values.status==='published'?new Date().toISOString():null}).eq('id',id).select('id').single();
  if(error||!row)throw new Error('Couldn’t save this story.');return {saved:true};
});