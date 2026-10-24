import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { familyHasAccess } from './billing.functions';
import { BLANKS, comboKey, DOODLES, initialPlayState, normalizeWord, PLAY_KEYS, playSeconds, playAllowed, PUZZLES, type PlayState } from './play';
import { caseSchema, dashSchema, defaultDash, firstGuess, SECRETS } from './play-extra';
import { STARTER_CREATURES, STARTER_STICKERS } from './stickers';
const id = z.string().uuid();
const environment = z.enum(['sandbox','live']);
const admin = async () => (await import('@/integrations/supabase/client.server')).supabaseAdmin;
async function child(ctx: any, childId: string, env: 'sandbox'|'live') { if(!(await familyHasAccess(ctx.supabase,ctx.userId,env))) throw new Error('Ask a grown-up to wake Bugley up.'); const { loadChild } = await import('./studio.server'); return loadChild(ctx.supabase,ctx.userId,childId); }
async function safe(ctx:any,kid:any,text:string) { const { guardChildText } = await import('./studio.server'); const result=await guardChildText(ctx.supabase,ctx.userId,kid,text,'play');if(result.decision!=='allowed')throw new Error(result.reply??'Let’s use a different idea.'); }
async function stickerFor(ctx:any,kid:any,word:string,make:boolean,creature=false) {
  const base=[...STARTER_STICKERS,...STARTER_CREATURES].find(s=>s.key===word||s.key===normalizeWord(word)||s.synonyms.includes(normalizeWord(word)));
  if(base)return {key:base.key,name:base.name,power:base.power??'',rare:base.rare??false};
  const a=await admin(); const key=creature?word:normalizeWord(word);
  const {data:rows}=await a.from('game_stickers').select('*').eq('active',true).or(`key.eq.${key.replace(/[^a-z0-9 +]/g,'')},synonyms.cs.{${normalizeWord(word)}}`).limit(1);
  if(rows?.[0])return {key:rows[0].key,name:rows[0].name,power:rows[0].power,rare:rows[0].rare};
  if(!make)throw new Error('NEW_STICKER');
  // Share only the checked object concept, never a child’s original message or identity.
  const {generateImage}=await import('./images.server');
  const {data:style}=await a.from('art_styles').select('key').eq('active',true).order('position').limit(1);
  if(!style?.[0])throw new Error('Bugley’s paintbrush isn’t ready.');
  const result=await generateImage(ctx.supabase,ctx.userId,{childId:kid.id,description:creature?`One friendly original cartoon creature combining ${word.split('+').join(' and ')}. White background, whole creature visible.`:`One cartoon ${key}, isolated on plain white background. No people, no names, no scenery.`,styleKey:style[0].key,mode:'sketch',characterIds:[]});
  if(!result.ok)throw new Error(result.reply);
  const row={key,name:creature?`${word.split('+').join(' ')} buddy`:key,synonyms:[],image_path:result.path,creature,power:creature?'Makes wonderfully silly surprises!':'',rare:false};
  const {error}=await a.from('game_stickers').upsert(row,{onConflict:'key',ignoreDuplicates:true});if(error)throw new Error('The sticker couldn’t be saved.');
  return {key,name:row.name,power:row.power,rare:false};
}
export const getPlayHome=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>z.object({childId:id,environment}).parse(i)).handler(async({data,context})=>{
  await child(context,data.childId,data.environment);
  const [{data:rounds},{data:progress},{data:badges},{data:dex},{data:stickers},{data:kids}]=await Promise.all([
    context.supabase.from('play_sessions').select('child_id,game,score,bonus,finished_at').eq('parent_id',context.userId).not('finished_at','is',null).order('finished_at',{ascending:false}).limit(1000),
    context.supabase.from('game_progress').select('child_id,sparks').eq('parent_id',context.userId),context.supabase.from('game_badges').select('badge').eq('child_id',data.childId),context.supabase.from('bugdex').select('sticker_key').eq('child_id',data.childId),context.supabase.from('game_stickers').select('*').eq('active',true).limit(2000),context.supabase.from('children').select('id,nickname').eq('parent_id',context.userId),
  ]);
  const {signPaths}=await import('./images.server');const urls=await signPaths((stickers??[]).map(s=>s.image_path));
  return {rounds:rounds??[],stars:(progress??[]).filter(p=>p.child_id===data.childId).reduce((n,p)=>n+p.sparks,0),badges:badges??[],dex:(dex??[]).map(d=>d.sticker_key),stickers:(stickers??[]).map((s,i)=>({key:s.key,name:s.name,synonyms:s.synonyms,url:urls[i]??'',creature:s.creature,power:s.power,rare:s.rare})),players:kids??[]};
});
export const startPlay=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>z.object({childId:id,game:z.enum(PLAY_KEYS),environment,dash:dashSchema.optional(),heroId:id.optional(),remixId:id.optional()}).parse(i)).handler(async({data,context})=>{
  const kid=await child(context,data.childId,data.environment);if(!playAllowed(data.game,kid.age_band as any))throw new Error('Pick another game for your age.');
  const a=await admin(),state=initialPlayState();let hidden:Record<string,unknown>={},heroUrl='';
  if(data.game==='bugley_guesses'){state.guess=firstGuess();hidden['secret']=SECRETS[Math.floor(Math.random()*SECRETS.length)];}
  if(data.game==='mystery_manor'){const {data:cases}=await a.from('manor_cases').select('content').eq('active',true).limit(100);const row=cases?.[Math.floor(Math.random()*(cases?.length??0))];if(!row)throw new Error('New mysteries are coming soon. Pick another game!');const c=caseSchema.parse(row.content);state.manor={title:c.title,intro:c.intro,rooms:c.rooms};state.visited=[];hidden['case']=c;}
  if(data.game==='glow_dash'){
   state.dash=data.dash??defaultDash();let heroId=data.heroId;
   if(data.remixId){const {data:remix}=await context.supabase.from('dash_remixes').select('*').eq('id',data.remixId).eq('parent_id',context.userId).maybeSingle();if(!remix||(!remix.shared&&remix.child_id!==kid.id))throw new Error('That remix isn’t shared.');state.dash=dashSchema.parse(remix.config);state.remixId=remix.id;heroId=remix.hero_id??undefined;}
   const allowed=[...STARTER_STICKERS].some(s=>s.key===state.dash?.object);if(!allowed){const {data:s}=await context.supabase.from('game_stickers').select('key').eq('key',state.dash.object).eq('active',true).maybeSingle();if(!s)throw new Error('Pick a library sticker.');}
   if(heroId){let q=context.supabase.from('studio_creations').select('images').eq('id',heroId).eq('parent_id',context.userId).eq('kind','character').is('deleted_at',null);if(!data.remixId)q=q.eq('child_id',kid.id);const {data:h}=await q.maybeSingle();if(!h)throw new Error('Choose one of your heroes.');const {signPaths}=await import('./images.server');heroUrl=(await signPaths(h.images))?.[0]??'';hidden['heroId']=heroId;}
  }
  const {data:r,error}=await a.from('play_sessions').insert({parent_id:context.userId,child_id:kid.id,game:data.game,state:state as any,private_state:hidden as any}).select('id,started_at,state').single();if(error||!r)throw new Error('The game couldn’t start.');
  return {id:r.id,endsAt:new Date(new Date(r.started_at).getTime()+playSeconds(data.game)*1000).toISOString(),state:r.state as unknown as PlayState,heroUrl};
});
export const playMove=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>z.object({childId:id,sessionId:id,environment,text:z.string().trim().max(120).optional(),second:z.string().trim().max(60).optional(),make:z.boolean().default(false),next:z.boolean().default(false),strokes:z.array(z.object({color:z.number().int().min(0).max(3),points:z.array(z.tuple([z.number().min(0).max(1),z.number().min(0).max(1)])).max(1000)})).max(80).optional()}).parse(i)).handler(async({data,context})=>{
  const kid=await child(context,data.childId,data.environment),a=await admin();
  const {data:r}=await a.from('play_sessions').select('*').eq('id',data.sessionId).eq('parent_id',context.userId).eq('child_id',kid.id).maybeSingle();if(!r||r.finished_at)throw new Error('This round has ended.');if(!['say_see','creature_lab','story_blanks','doodle_duel'].includes(r.game))throw new Error('Pick the matching game controls.');if(Date.now()>new Date(r.started_at).getTime()+playSeconds(r.game as any)*1000)return {expired:true,state:r.state as unknown as PlayState};
  const {data:claim}=await a.from('play_sessions').update({busy:true}).eq('id',r.id).eq('version',r.version).eq('busy',false).select('id');if(!claim?.length)throw new Error('Wait for Bugley’s current move.');
  let state=r.state as unknown as PlayState,score=r.score;
  try {
    const maxTurns=r.game==='creature_lab'?3:r.game==='story_blanks'?3:4;
    if(state.turn>=maxTurns)throw new Error('This round is ready for results!');
    if(data.next) { if(!state.feedback||state.turn>=maxTurns-1)throw new Error('See your stars!');state={...state,turn:state.turn+1,feedback:undefined,stickerKey:undefined,solved:undefined,drawGuesses:0,drawingGuessed:false}; }
    else if(r.game==='doodle_duel'&&state.turn%2===0) {
      if(!data.strokes?.some(s=>s.points.length>1)||state.drawingGuessed|| (state.drawGuesses??0)>=6)throw new Error('Try the next turn!');
      const {renderDoodle}=await import('./doodle.server');const {aiObject}=await import('./studio-ai.server');
      const image=renderDoodle(data.strokes);
      const check=await aiObject(z.object({safe:z.boolean(),personal:z.boolean()}),'Check this in-app child drawing. safe=false for sexual, hateful, violent, or harmful content. personal=true for names, addresses, contact details or other personal information.','Check this drawing before guessing.',image);
      if(!check?.safe||check.personal){await a.from('studio_events').insert({parent_id:context.userId,child_id:kid.id,source:'doodle',decision:'unsafe',input:'[in-app drawing blocked]',reply:'Try a friendly object.'});throw new Error('Let’s draw a friendly object instead.');}
      const verdict=await aiObject(z.object({guess:z.string().max(40),matches:z.boolean()}),'Guess the object drawn by a child. Return a short kid-safe object name, never personal names. matches only if the drawing reasonably matches the target.','Target: '+DOODLES[Math.floor(state.turn/2)%DOODLES.length],image);if(!verdict)throw new Error('I couldn’t see that doodle right now.');
      await safe(context,kid,verdict.guess);
      state={...state,drawGuesses:(state.drawGuesses??0)+1,drawingGuessed:verdict.matches,feedback:verdict.matches?'I got it! We both score!':`Is it a ${verdict.guess}?`};if(verdict.matches)score+=2;
    } else {
      if(!data.text)throw new Error('Pick or say an idea first.');if(state.feedback)throw new Error('Go to the next turn first.');
      await safe(context,kid,[data.text,data.second].filter(Boolean).join(' and '));
      if(r.game==='say_see') {
        const puzzle=PUZZLES[state.turn%PUZZLES.length];if(!puzzle)throw new Error('Round complete.');
        const {aiObject}=await import('./studio-ai.server');
        const verdict=await aiObject(z.object({works:z.boolean(),creative:z.boolean(),object:z.string().max(60),animation:z.enum(['bounce','fly','climb','float']),reply:z.string().max(140)}),'Judge a silly child puzzle generously: any reasonable imaginative solution works. Extract only the object concept, never personal information. Reply one playful child-friendly sentence; no instructions outside the puzzle.',JSON.stringify({puzzle:puzzle.task,idea:data.text}));if(!verdict)throw new Error('Bugley needs a moment.');
        await safe(context,kid,verdict.object);
        if(!verdict.works)state={...state,feedback:verdict.reply,solved:false};else {const s=await stickerFor(context,kid,verdict.object,data.make);state={...state,feedback:verdict.reply,solved:true,stickerKey:s.key,animation:verdict.animation};score+=verdict.creative?3:2;}
      }else if(r.game==='creature_lab') {
        if(!data.second)throw new Error('Pick two things!');
        const canonical=(w:string)=>STARTER_STICKERS.find(s=>s.key===normalizeWord(w)||s.synonyms.includes(normalizeWord(w)))?.key??normalizeWord(w);
        const key=comboKey(canonical(data.text),canonical(data.second));const s=await stickerFor(context,kid,key,data.make,true);
        const {error}=await a.from('bugdex').upsert({child_id:kid.id,parent_id:context.userId,sticker_key:s.key},{onConflict:'child_id,sticker_key',ignoreDuplicates:true});if(error)throw new Error('Your creature couldn’t join the Bugdex.');state={...state,stickerKey:s.key,name:s.name,power:s.power,rare:s.rare,feedback:`Meet ${s.name}!`,solved:true};score+=s.rare?3:2;
      }else if(r.game==='story_blanks') {
        const words=[...state.words,data.text];state={...state,words,feedback:'Excellent choice!',solved:true};score+=1;
        if(words.length>=BLANKS.length)state.story=`A ${words[0]} arrived at a picnic wearing ${words[1]} as a hat. “${words[2]}” went the hat. Everyone laughed, and the picnic danced away!`;
      }else {const word=DOODLES[Math.floor(state.turn/2)%DOODLES.length];const correct=normalizeWord(data.text)===word;state={...state,feedback:correct?'You guessed it!':`It was a ${word}!`,solved:correct};if(correct)score+=2;}
      state={...state,moves:state.moves+1};
    }
    const {error}=await a.from('play_sessions').update({state:JSON.parse(JSON.stringify(state)),score,version:r.version+1,busy:false}).eq('id',r.id).eq('version',r.version);if(error)throw new Error('Your move couldn’t save.');
    return {expired:false,state};
  }catch(e){await a.from('play_sessions').update({busy:false}).eq('id',r.id).eq('version',r.version);throw e;}
});
export const finishPlay=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>z.object({childId:id,sessionId:id,environment}).parse(i)).handler(async({data,context})=>{
  await child(context,data.childId,data.environment);const a=await admin();const {data:r}=await a.from('play_sessions').select('id').eq('id',data.sessionId).eq('child_id',data.childId).eq('parent_id',context.userId).maybeSingle();if(!r)throw new Error('Game not found.');const {data:result,error}=await a.rpc('finish_play_session',{_session:r.id,_parent:context.userId});if(error)throw new Error('Your results couldn’t save yet.');return result as {score:number;bonus:number};
});
export const manageStickers=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>z.object({action:z.enum(['list','toggle','generate','tag']),key:z.string().max(100).optional(),active:z.boolean().optional(),synonyms:z.array(z.string().trim().min(1).max(60)).max(30).optional(),childId:id.optional(),words:z.array(z.string().trim().min(1).max(60)).max(10).optional()}).parse(i)).handler(async({data,context})=>{
  const {data:ok}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(!ok)throw new Error('Admins only.');
  if(data.action==='toggle'&&data.key){const {error}=await context.supabase.from('game_stickers').update({active:data.active??false}).eq('key',data.key);if(error)throw new Error('Couldn’t save.');}
  if(data.action==='tag'&&data.key){const {error}=await context.supabase.from('game_stickers').update({synonyms:(data.synonyms??[]).map(normalizeWord)}).eq('key',data.key);if(error)throw new Error('Couldn’t save tags.');}
  if(data.action==='generate'){if(!data.childId)throw new Error('Select a family player to use glow for the batch.');const {loadChild}=await import('./studio.server');const kid=await loadChild(context.supabase,context.userId,data.childId);for(const word of data.words??[]){await safe(context,kid,word);await stickerFor(context,kid,word,true);}}
  const {data:rows,error}=await context.supabase.from('game_stickers').select('*').order('created_at',{ascending:false}).limit(2000);if(error)throw new Error('Couldn’t load stickers.');const {signPaths}=await import('./images.server');const urls=await signPaths((rows??[]).map(s=>s.image_path));return (rows??[]).map((s,i)=>({...s,url:urls[i]??''}));
});