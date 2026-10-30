// Mystery Manor "Catch the Sneaky Robot": a know-it-all robot always sounds 100% sure.
// Mysteries are generated from data: rooms × friends × clue tags, so every game is different.
export type SuspectId = 'fox' | 'bear' | 'owl' | 'bunny' | 'raccoon' | 'frog' | 'squirrel' | 'duck';
export type Tag = 'orange' | 'carrots' | 'hops' | 'feathers' | 'glasses' | 'night' | 'big' | 'honey' | 'fur' | 'paws' | 'stripes' | 'green' | 'wet' | 'nuts' | 'climbs' | 'quack';
export type Suspect = { id: SuspectId; name: string; emoji: string; traits: string; tags: Tag[]; hunch: string };

/** Order matters: the first four start unlocked, one more joins per win. */
export const SUSPECTS: Suspect[] = [
  { id: 'fox', name: 'Fox', emoji: '🦊', traits: 'orange fur · up at night', tags: ['orange', 'fur', 'paws', 'night'], hunch: 'Foxes are sneaky' },
  { id: 'bear', name: 'Bear', emoji: '🐻', traits: 'big paws · loves honey', tags: ['big', 'fur', 'paws', 'honey'], hunch: 'Bears are always hungry' },
  { id: 'owl', name: 'Owl', emoji: '🦉', traits: 'feathers · glasses · up at night', tags: ['feathers', 'glasses', 'night'], hunch: 'Owls are super smart, so they plan everything' },
  { id: 'bunny', name: 'Bunny', emoji: '🐰', traits: 'hops · loves carrots', tags: ['hops', 'carrots', 'fur'], hunch: 'Bunnies are so bouncy' },
  { id: 'raccoon', name: 'Raccoon', emoji: '🦝', traits: 'striped tail · up at night', tags: ['stripes', 'fur', 'paws', 'night'], hunch: 'Raccoons wear a mask, so they must be guilty' },
  { id: 'frog', name: 'Frog', emoji: '🐸', traits: 'green · wet · hops', tags: ['green', 'wet', 'hops'], hunch: 'Frogs are always jumping into trouble' },
  { id: 'squirrel', name: 'Squirrel', emoji: '🐿️', traits: 'loves nuts · climbs high', tags: ['nuts', 'climbs', 'fur'], hunch: 'Squirrels are so speedy' },
  { id: 'duck', name: 'Duck', emoji: '🦆', traits: 'feathers · wet · quacks', tags: ['feathers', 'wet', 'quack'], hunch: 'Ducks are very noisy' },
];

export type Clue = { emoji: string; text: string; tag: Tag };
export const CLUES: Record<Tag, { emoji: string; texts: string[] }> = {
  orange: { emoji: '🧡', texts: ['Orange fur on the handle', 'An orange hair on the rug'] },
  carrots: { emoji: '🥕', texts: ['Carrot crumbs', 'A half-eaten carrot'] },
  hops: { emoji: '👣', texts: ['Hop-hop footprints', 'Bouncy jump marks'] },
  feathers: { emoji: '🪶', texts: ['A feather on the floor', 'Two fluffy feathers'] },
  glasses: { emoji: '👓', texts: ['Tiny glasses left behind', 'Smudgy glasses prints'] },
  night: { emoji: '🌙', texts: ['It happened at midnight', 'Nobody saw, it was very dark'] },
  big: { emoji: '🐾', texts: ['BIG paw prints', 'A giant footprint'] },
  honey: { emoji: '🍯', texts: ['Sticky honey drips', 'A licked honey spoon'] },
  fur: { emoji: '🟤', texts: ['Some fluffy fur', 'Fur stuck on the door'] },
  paws: { emoji: '🐾', texts: ['Pointy paw prints', 'Little claw scratches'] },
  stripes: { emoji: '🦓', texts: ['A black-and-white striped hair', 'A stripy tail mark in the dust'] },
  green: { emoji: '💚', texts: ['A green smudge', 'Green slime on the chair'] },
  wet: { emoji: '💧', texts: ['Wet puddles everywhere', 'Drippy wet spots'] },
  nuts: { emoji: '🌰', texts: ['Acorn shells', 'A pile of nut crumbs'] },
  climbs: { emoji: '🧗', texts: ['Scratches high up the shelf', 'Something climbed the curtains'] },
  quack: { emoji: '🔊', texts: ['Someone heard "QUACK!"', 'A loud quack echoed'] },
};

export const ROOMS: { room: string; emoji: string; question: string }[] = [
  { room: 'Kitchen', emoji: '🍰', question: 'Who ate the birthday cake?' },
  { room: 'Pantry', emoji: '🍯', question: 'Who spilled the snack jar?' },
  { room: 'Music Room', emoji: '🎹', question: 'Who played the piano at bedtime?' },
  { room: 'Hallway', emoji: '☂️', question: 'Who opened an umbrella indoors?' },
  { room: 'Art Room', emoji: '🖍️', question: 'Who drew on the wall?' },
  { room: 'Library', emoji: '📚', question: 'Who knocked over the books?' },
  { room: 'Garden', emoji: '🌻', question: 'Who dug up the sunflowers?' },
  { room: 'Bathroom', emoji: '🛁', question: 'Who filled the tub with bubbles?' },
  { room: 'Bedroom', emoji: '🛏️', question: 'Who built a pillow fort?' },
  { room: 'Toy Room', emoji: '🧸', question: 'Who hid the teddy bear?' },
  { room: 'Attic', emoji: '🕯️', question: 'Who made the spooky noises?' },
  { room: 'Treehouse', emoji: '🌳', question: 'Who left the rope ladder down?' },
  { room: 'Kitchen', emoji: '🍪', question: 'Who took the last cookie?' },
  { room: 'Living Room', emoji: '🛋️', question: 'Who bounced on the couch?' },
  { room: 'Pond', emoji: '🪷', question: 'Who splashed the picnic?' },
  { room: 'Game Room', emoji: '🎲', question: 'Who hid the dice?' },
  { room: 'Greenhouse', emoji: '🍓', question: 'Who nibbled the strawberries?' },
  { room: 'Ballroom', emoji: '🎈', question: 'Who popped the balloons?' },
  { room: 'Kitchen', emoji: '🥞', question: 'Who flipped pancakes on the ceiling?' },
  { room: 'Porch', emoji: '📦', question: 'Who opened the secret package?' },
];

export type Level = 'rookie' | 'detective' | 'master';
export const LEVELS: Record<Level, { name: string; emoji: string; blurb: string; winsNeeded: number; cast: number; rightChance: number }> = {
  rookie: { name: 'Rookie', emoji: '🔍', blurb: 'The robot makes silly guesses', winsNeeded: 0, cast: 4, rightChance: 0.3 },
  detective: { name: 'Detective', emoji: '🕵️', blurb: 'The robot only looks at one clue', winsNeeded: 2, cast: 5, rightChance: 0.3 },
  master: { name: 'Master', emoji: '🎩', blurb: 'Sometimes the robot is right. Can you tell?', winsNeeded: 4, cast: 6, rightChance: 0.5 },
};
export const CASES_PER_GAME = 5;
export const unlockedCount = (wins: number) => Math.min(SUSPECTS.length, 4 + wins);
export const levelOpen = (level: Level, wins: number) => wins >= LEVELS[level].winsNeeded;

export type Case = { id: string; room: string; roomEmoji: string; question: string; cast: SuspectId[]; clues: Clue[]; answer: SuspectId; botSays: SuspectId; botWhy: string; lesson: string };

type Rng = () => number;
const pick = <T,>(a: T[], r: Rng) => a[Math.floor(r() * a.length)]!;
function shuffle<T>(a: T[], r: Rng) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j]!, b[i]!]; } return b; }
const who = (id: SuspectId) => SUSPECTS.find((s) => s.id === id)!;
const fits = (s: SuspectId, t: Tag) => who(s).tags.includes(t);

/** Three clues from the culprit that together point only at the culprit in this cast. */
function clueSet(culprit: SuspectId, cast: SuspectId[], r: Rng): Tag[] | null {
  const tags = who(culprit).tags;
  for (let n = 0; n < 20; n++) {
    const t = shuffle(tags, r).slice(0, 3);
    if (t.length < 3) { const extra = shuffle(tags, r)[0]!; if (!t.includes(extra)) t.push(extra); }
    const matches = cast.filter((s) => t.every((x) => fits(s, x)));
    if (matches.length === 1 && t.length >= 2) return t;
  }
  return null;
}

/** Build one mystery. The robot's mistake depends on the level. */
export function makeCase(level: Level, pool: SuspectId[], r: Rng, roomIdx: number): Case {
  const L = LEVELS[level];
  for (;;) {
    const cast = shuffle(pool, r).slice(0, Math.min(L.cast, pool.length));
    const culprit = pick(cast, r);
    const tags = clueSet(culprit, cast, r);
    if (!tags) continue;
    const clues = tags.map((t) => ({ tag: t, emoji: CLUES[t].emoji, text: pick(CLUES[t].texts, r) }));
    const room = ROOMS[roomIdx % ROOMS.length]!;
    const others = cast.filter((s) => s !== culprit);
    let botSays: SuspectId = culprit, botWhy: string, lesson: string;
    const clue = pick(clues, r);
    if (r() < L.rightChance) {
      botWhy = `${clue.text}... that's ${who(culprit).name}! I am 100% sure!`;
      lesson = 'This time the robot was right, because ALL the clues agree. You only know by checking!';
    } else {
      const oneClue = others.filter((s) => clues.some((c) => fits(s, c.tag)));
      const noClue = others.filter((s) => !clues.some((c) => fits(s, c.tag)));
      if (level !== 'rookie' && oneClue.length) {
        botSays = pick(oneClue, r);
        const seen = clues.find((c) => fits(botSays, c.tag))!;
        botWhy = `${seen.text}, and that fits ${who(botSays).name}. I am 100% sure!`;
        lesson = `The robot looked at ONE clue and ignored the rest. ${who(botSays).name} doesn't fit every clue!`;
      } else {
        botSays = pick(noClue.length ? noClue : others, r);
        botWhy = `${who(botSays).hunch}. I am 100% sure!`;
        lesson = 'The robot guessed from a hunch instead of the clues. Sounding sure is not the same as being right.';
      }
    }
    return { id: `${roomIdx}-${culprit}`, room: room.room, roomEmoji: room.emoji, question: room.question, cast, clues, answer: culprit, botSays, botWhy, lesson };
  }
}

/** A fresh game: random rooms (no repeats), random friends from the unlocked pool. */
export function makeGame(level: Level, wins: number, r: Rng = Math.random): Case[] {
  const pool = SUSPECTS.slice(0, unlockedCount(wins)).map((s) => s.id);
  const rooms = shuffle(ROOMS.map((_, i) => i), r).slice(0, CASES_PER_GAME);
  return rooms.map((ri) => makeCase(level, pool, r, ri));
}

export type Verdict = { ok: boolean; botRight: boolean };
/** Child says if the robot is right; if not, they also name the real culprit. */
export function judge(c: Case, trustBot: boolean, pick?: SuspectId): Verdict {
  const botRight = c.botSays === c.answer;
  return { botRight, ok: trustBot ? botRight : !botRight && pick === c.answer };
}
export const manorStars = (score: number) => (score >= CASES_PER_GAME ? 3 : score >= CASES_PER_GAME - 1 ? 2 : 1);
/** A "win" (unlocking a new friend) is 2+ stars. */
export const isWin = (score: number) => manorStars(score) >= 2;

/** Seeded random for tests and repeatable games. */
export function seeded(seed: number): Rng {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}
