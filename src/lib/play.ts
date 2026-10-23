import type { Band } from './games';
export const PLAY_KEYS = ['say_see', 'creature_lab', 'story_blanks', 'doodle_duel'] as const;
export type PlayKey = typeof PLAY_KEYS[number];
export const PLAY_GAMES = {
  say_see: { name: 'Say It, See It', line: 'Say any word and watch it appear!', pitch: 'Tell me one thing that could rescue the day!', secret: 'You just turned words into things. That’s how people talk to AI!' },
  creature_lab: { name: 'Creature Lab', line: 'Mix two things. Hatch a crazy creature!', pitch: 'Pick two things and let’s hatch a wonderfully weird creature!', secret: 'AI mixes ideas it’s seen before, just like your lab!' },
  story_blanks: { name: 'Silly Story Blanks', line: 'Fill in the blanks. Get the silliest story ever!', pitch: 'Give me some silly words and we’ll reveal a surprise story!', secret: 'Stories have patterns, and so does AI!' },
  doodle_duel: { name: 'Doodle Duel', line: 'Draw it fast. Can Bugley guess it?', pitch: 'Draw the secret word and see if I can guess it!', secret: 'I look for patterns to guess, just like AI does!' },
} as const;
export const playAllowed = (game: PlayKey, band: Band) => game !== 'story_blanks' || band !== 'builders';
export const PLAY_SECONDS = 240;
export const GAME_BONUS_CAP = 3;
export const gameBonus = (stars: number, used: number) => stars >= 3 && used < GAME_BONUS_CAP ? 1 : 0;
export const normalizeWord = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').slice(0, 60);
export const comboKey = (a: string, b: string) => [normalizeWord(a), normalizeWord(b)].sort().join('+');
export const PUZZLES = [
  { task: 'Get the cat down from the tree!', target: 'cat', place: 'tree', choices: ['ladder', 'trampoline', 'giant bird', 'jetpack'] },
  { task: 'Help the snowman cross the river!', target: 'snowman', place: 'river', choices: ['giant bird', 'jetpack', 'trampoline', 'rocket'] },
  { task: 'Help the moon reach the birthday party!', target: 'moon', place: 'party', choices: ['rocket', 'jetpack', 'giant bird', 'ladder'] },
  { task: 'Rescue the pizza from a cloud castle!', target: 'pizza', place: 'castle', choices: ['jetpack', 'rocket', 'ladder', 'giant bird'] },
];
export const BLANKS = [
  { ask: 'Give me an animal!', choices: ['cat', 'dog', 'owl', 'octopus'] },
  { ask: 'Something gross!', choices: ['slime', 'stinky boot', 'banana mush', 'soggy pizza'] },
  { ask: 'A silly sound!', choices: ['Bloop!', 'Squish!', 'Boing!', 'Pfffft!'] },
];
export const DOODLES = ['sun', 'cat', 'pizza', 'rocket'];
export const DOODLE_CLUES = ['I’m round, warm, and shine in the sky.', 'I have whiskers and say meow.', 'I’m a cheesy triangle you can eat.', 'I zoom into space with a fiery tail.'];
export type Stroke = { points: [number, number][]; color: number };
export type PlayState = { turn: number; moves: number; words: string[]; feedback?: string | undefined; stickerKey?: string | undefined; solved?: boolean | undefined; rare?: boolean; power?: string; name?: string; story?: string; drawGuesses?: number; drawingGuessed?: boolean };
export const initialPlayState = (): PlayState => ({ turn: 0, moves: 0, words: [] });