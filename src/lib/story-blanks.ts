export type StoryWorldId = 'dragon' | 'space' | 'school';
export type StoryWord = { word: string; emoji: string; count: number };
export type StoryBlank = { before: string; after: string; clue: string; examples: StoryWord[]; surprises: { word: string; emoji: string }[] };
export type StoryWorld = { id: StoryWorldId; title: string; emoji: string; ending: string; blanks: StoryBlank[] };
const b = (before: string, after: string, clue: string, a: string, ae: string, c: string, ce: string, d: string, de: string, s: string, se: string, t: string, te: string): StoryBlank => ({ before, after, clue, examples: [{word:a,emoji:ae,count:8},{word:c,emoji:ce,count:3},{word:d,emoji:de,count:1}], surprises:[{word:s,emoji:se},{word:t,emoji:te}] });
export const STORY_WORLDS: StoryWorld[] = [
 {id:'dragon',title:'Dragon’s birthday',emoji:'🐉',ending:'Everyone cheered. Best birthday ever!',blanks:[
 b('At his birthday party, the hungry dragon ate','.','hungry · ate','cake','🎂','pizza','🍕','apples','🍎','striped socks','🧦','a tiny spaceship','🚀'),
 b('Then he opened a present and found',' inside!','present · inside','a toy','🧸','a book','📚','a ball','⚽','a dancing pickle','🥒','a sleepy moon','🌙'),
 b('When the music started, the dragon began to','.','music · began to','dance','💃','sing','🎤','clap','👏','bounce like jelly','🍮','juggle planets','🪐')]},
 {id:'space',title:'Penguin in space',emoji:'🐧',ending:'Mission accomplished. The moon would never be the same!',blanks:[
 b('To reach the moon, the penguin climbed into','.','moon · climbed into','a rocket','🚀','a spaceship','🛸','a capsule','🛰️','a flying bathtub','🛁','a giant shoe','👟'),
 b('For lunch on the moon, the penguin unpacked','.','lunch · unpacked','a sandwich','🥪','an apple','🍎','a cookie','🍪','a rubber duck','🦆','a rainbow','🌈'),
 b('Before flying home, the penguin waved to','.','waved · to','a friend','👋','an astronaut','🧑‍🚀','an alien','👽','a tap-dancing potato','🥔','a planet in pajamas','🪐')]},
 {id:'school',title:'Frog’s first day',emoji:'🐸',ending:'The whole class giggled. What a wonderful first day!',blanks:[
 b('On the first day of school, the frog packed',' in his backpack.','school · backpack','a book','📚','a pencil','✏️','a notebook','📓','a giant jelly','🍮','a baby dinosaur','🦕'),
 b('At playtime, the frog played with','.','playtime · played with','a ball','⚽','some blocks','🧱','a kite','🪁','a cloud wearing shoes','☁️','a disco broccoli','🥦'),
 b('To thank the teacher, the frog gave her','.','thank · gave her','a flower','🌼','a card','💌','a drawing','🎨','a singing pancake','🥞','a pocket-sized ocean','🌊')]},
];
export function storyWorld(id?: string): StoryWorld { const found = STORY_WORLDS.find(w=>w.id===id) ?? STORY_WORLDS[0]; if (!found) throw new Error('Story worlds missing'); return found; }
// Inspectable frequency model conditioned on a sentence. Practice counts are not LLM confidence.
export function storyPredictions(blank: StoryBlank) { const total=blank.examples.reduce((n,e)=>n+e.count,0);return blank.examples.map(e=>({...e,pct:Math.round(e.count/total*100)})).sort((a,b)=>b.count-a.count); }
export function finishSillyStory(world: StoryWorld, words: string[]) {return [...world.blanks.map((b,i)=>`${b.before} ${words[i]??'…'}${b.after}`),world.ending].join(' ');}
export function surpriseCount(world: StoryWorld, words: string[]) {return words.filter((w,i)=>w.trim().toLowerCase()!==world.blanks[i]?.examples[0]?.word.toLowerCase()).length;}
export function acceptStoryWord(world: StoryWorld, words: string[], word: string) { if(words.length>=3)throw new Error('Your story is already complete.'); const clean=word.trim();if(!clean||clean.length>60)throw new Error('Try a word or short phrase.');const next=[...words,clean];return {words:next,story:next.length===3?finishSillyStory(world,next):undefined};}
