import ladder from '@/assets/games/stickers/ladder.jpg';
import trampoline from '@/assets/games/stickers/trampoline.jpg';
import bird from '@/assets/games/stickers/giant-bird.jpg';
import jetpack from '@/assets/games/stickers/jetpack.jpg';
import shark from '@/assets/games/stickers/shark.jpg';
import cupcake from '@/assets/games/stickers/cupcake.jpg';
import owl from '@/assets/games/stickers/owl.jpg';
import rocket from '@/assets/games/stickers/rocket.jpg';
import cat from '@/assets/games/stickers/cat.jpg';
import dog from '@/assets/games/stickers/dog.jpg';
import banana from '@/assets/games/stickers/banana.jpg';
import octopus from '@/assets/games/stickers/octopus.jpg';
import slime from '@/assets/games/stickers/slime.jpg';
import boot from '@/assets/games/stickers/boot.jpg';
import sun from '@/assets/games/stickers/sun.jpg';
import pizza from '@/assets/games/stickers/pizza.jpg';
import sharkcake from '@/assets/games/stickers/shark-cupcake.jpg';
import rocketowl from '@/assets/games/stickers/owl-rocket.jpg';
import bananacat from '@/assets/games/stickers/cat-banana.jpg';
import octopizza from '@/assets/games/stickers/octopus-pizza.jpg';
import { comboKey, normalizeWord } from './play';
export type Sticker = { key: string; name: string; synonyms: string[]; url: string; creature?: boolean; rare?: boolean; power?: string };
const item = (key: string, url: string, synonyms: string[] = []): Sticker => ({ key, name: key, url, synonyms });
export const STARTER_STICKERS: Sticker[] = [item('ladder',ladder,['stairs','steps']),item('trampoline',trampoline,['bouncer']),item('giant bird',bird,['bird','big bird']),item('jetpack',jetpack,['jet pack']),item('shark',shark),item('cupcake',cupcake,['cake']),item('owl',owl),item('rocket',rocket,['spaceship']),item('cat',cat,['kitten']),item('dog',dog,['puppy']),item('banana',banana),item('octopus',octopus),item('slime',slime,['goo','banana mush']),item('boot',boot,['shoe','stinky boot']),item('sun',sun),item('pizza',pizza,['soggy pizza'])];
export const STARTER_CREATURES: Sticker[] = [
  { key: comboKey('shark','cupcake'),name:'Sharkcake',url:sharkcake,synonyms:[],creature:true,power:'Sprinkles a wave of cupcakes!' },
  { key: comboKey('owl','rocket'),name:'Hoot Rocket',url:rocketowl,synonyms:[],creature:true,power:'Zooms through the stars!',rare:true },
  { key: comboKey('cat','banana'),name:'Bananameow',url:bananacat,synonyms:[],creature:true,power:'Slides around on banana paws!' },
  { key: comboKey('octopus','pizza'),name:'Octopizza',url:octopizza,synonyms:[],creature:true,power:'Serves eight snacks at once!' },
];
export const findSticker = (word: string) => [...STARTER_STICKERS,...STARTER_CREATURES].find(s => s.key === normalizeWord(word) || s.key === word || s.synonyms.includes(normalizeWord(word)));