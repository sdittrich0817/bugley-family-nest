import {describe,expect,it,vi} from 'vitest';
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{
  let validate:(i:unknown)=>unknown=(i)=>i;
  const chain:any={middleware:()=>chain,inputValidator:(fn:(i:unknown)=>unknown)=>{validate=fn;return chain;},handler:(fn:any)=>(args:any)=>fn({...args,data:validate(args?.data)})};return chain;
}}));
vi.mock('@/lib/parent-device.functions',()=>({requireParentDevice:{}}));
import {getFamilyNews,getNewsQueue,saveFamilyNews} from '@/lib/family-news.functions';
describe('family news access boundaries',()=>{
  it('rejects non-admin queue reads',async()=>{
    const from=vi.fn();const context={userId:'parent',supabase:{rpc:vi.fn().mockResolvedValue({data:false,error:null}),from}};
    await expect((getNewsQueue as any)({context})).rejects.toThrow('Only the Bugley editor');expect(from).not.toHaveBeenCalled();
  });
  it('rejects non-admin editorial writes',async()=>{
    const from=vi.fn();const context={userId:'parent',supabase:{rpc:vi.fn().mockResolvedValue({data:false,error:null}),from}};
    await expect((saveFamilyNews as any)({context,data:{id:'00000000-0000-4000-8000-000000000001',title:'News',summary:'',response:'',family_guidance:'',source_reviewed:false,status:'draft'}})).rejects.toThrow('Only the Bugley editor');expect(from).not.toHaveBeenCalled();
  });
  it('filters parent reads to published stories only',async()=>{
    const query:any={select:vi.fn(()=>query),eq:vi.fn(()=>query),order:vi.fn(()=>query),limit:vi.fn().mockResolvedValue({data:[],error:null})};
    await (getFamilyNews as any)({context:{supabase:{from:vi.fn(()=>query)}}});expect(query.eq).toHaveBeenCalledWith('status','published');
  });
});