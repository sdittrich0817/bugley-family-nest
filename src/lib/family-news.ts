import { z } from 'zod';
export const newsSchema = z.object({
  id:z.string().uuid(), title:z.string().trim().min(1).max(250),
  summary:z.string().trim().max(1200), response:z.string().trim().max(4000),
  family_guidance:z.string().trim().max(2000), source_reviewed:z.boolean(),
  status:z.enum(['draft','published','dismissed']),
}).superRefine((v,ctx)=>{
  if(v.status==='published' && (!v.source_reviewed||!v.response||!v.family_guidance)) ctx.addIssue({code:'custom',message:'Review the source and add your response and family guidance before publishing.'});
});
export function relevantFamilyNews(title:string) {
  return /\b(ai|artificial intelligence|chatbot|chatgpt|deepfake|gemini)\b/i.test(title) && /\b(kids?|child(?:ren)?|parent(?:s|ing)?|famil(?:y|ies)|school|student|teen|education|learning|privacy|safety)\b/i.test(title);
}
export function newsPrompts(title:string) {
  const focus=/privacy|data/i.test(title)?'privacy':/school|student|education/i.test(title)?'school':/safety|chatbot|companion/i.test(title)?'safety':'judgment';
  return {response:`Shea, what matters most here—and what would you tell a worried parent about ${focus}?`,guidance:'What should a family with a 5–12-year-old do, ask or talk about next? What should they avoid assuming?'};
}