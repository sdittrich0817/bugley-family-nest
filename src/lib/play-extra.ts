import { z } from 'zod';

export const GUESS_LIMIT = 15;
export const DASH_SECONDS = 180;
export const dashSchema = z.object({ theme:z.enum(['candy','lava','cloud']).default('candy'), speed:z.enum(['slow','normal','fast']).default('normal'), pads:z.boolean().default(true), time:z.enum(['day','night']).default('day'), object:z.string().max(80).default('boot'), chocolate:z.boolean().default(false) }).strict();
export type DashConfig = z.infer<typeof dashSchema>;
export const defaultDash = ():DashConfig => dashSchema.parse({});
export const caseSchema=z.object({title:z.string().trim().min(1).max(70),intro:z.string().trim().min(1).max(240),rooms:z.array(z.object({name:z.string().trim().min(1).max(40),friend:z.string().trim().min(1).max(40),sprite:z.enum(['owl','cat','dog','octopus']),statement:z.string().trim().min(1).max(180),evidence:z.string().trim().min(1).max(180)})).length(3),fake:z.number().int().min(0).max(2),explanation:z.string().trim().min(1).max(240)}).strict();
export type ManorCase=z.infer<typeof caseSchema>;
export type PublicCase=Omit<ManorCase,'fake'|'explanation'>;
export type GuessState={phase:'bugley'|'child'|'done';question:string;count:number;history:{question:string;answer:string}[];guess?:string|undefined;reply?:string|undefined};
export const SECRETS=['cat','pizza','rocket','owl','banana','umbrella','octopus','cupcake'] as const;
export const firstGuess=():GuessState=>({phase:'bugley',question:'Is it alive?',count:0,history:[]});
export const canAskGuess=(count:number)=>count<GUESS_LIMIT;
export const DASH_STEP=1000/60;
export const DASH_TICKS=DASH_SECONDS*60;
export function checkedDashTicks(ticks:number,elapsedMs:number){return Math.min(DASH_TICKS,Math.max(0,Math.floor(Math.min(ticks,(elapsedMs+1500)/DASH_STEP))));}
export const badgeForPlay=(game:string)=>({say_see:'Word Wizard',creature_lab:'Creature Keeper',story_blanks:'Silly Story Star',doodle_duel:'Doodle Detective',bugley_guesses:'Mind Detective',mystery_manor:'Clue Checker',glow_dash:'Glow Runner'}[game]??'Playful Explorer');