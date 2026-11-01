import { describe,expect,it } from 'vitest';
import { newsSchema,relevantFamilyNews } from '@/lib/family-news';
const draft={id:'00000000-0000-4000-8000-000000000001',title:'AI and children',summary:'',response:'',family_guidance:'',source_reviewed:false,status:'draft' as const};
describe('founder-reviewed family news',()=>{
  it('keeps discovered stories in draft without inventing a founder response',()=>{expect(newsSchema.parse(draft).status).toBe('draft');});
  it('requires Shea’s response before publishing',()=>{expect(newsSchema.safeParse({...draft,status:'published',source_reviewed:true,family_guidance:'Talk together.'}).success).toBe(false);});
  it('requires family guidance before publishing',()=>{expect(newsSchema.safeParse({...draft,status:'published',source_reviewed:true,response:'My take.'}).success).toBe(false);});
  it('requires source review before publishing',()=>{expect(newsSchema.safeParse({...draft,status:'published',response:'My take.',family_guidance:'Talk together.'}).success).toBe(false);});
  it('allows publication only with source review, response and guidance',()=>{expect(newsSchema.parse({...draft,status:'published',source_reviewed:true,response:'My take.',family_guidance:'Talk together.'}).status).toBe('published');});
  it('filters out unrelated AI investment headlines',()=>{expect(relevantFamilyNews('AI investment earnings')).toBe(false);expect(relevantFamilyNews('AI privacy concerns for children at school')).toBe(true);});
});