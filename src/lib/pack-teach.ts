/** "Teach Bugley" scenes: the child shows their real choices, Bugley copies by matching kind and color. */
export type Item = { emoji: string; name: string; kind: string; color: string };
export type Scene = { id: string; emoji: string; title: string; story: string; yes: string; yesEmoji: string; no: string; noEmoji: string; bag: string; items: Item[] };
export type Example = { item: Item; yes: boolean };

const i = (emoji: string, name: string, kind: string, color: string): Item => ({ emoji, name, kind, color });

export const SCENES: Scene[] = [
  { id: 'lunch', emoji: '🍱', title: 'Pack my lunch', story: "I've never eaten food! Show me what YOU like.", yes: 'Yum!', yesEmoji: '😋', no: 'Yuck!', noEmoji: '🤢', bag: '🍱', items: [
    i('🍎', 'apple', 'fruit', 'red'), i('🍓', 'strawberry', 'fruit', 'red'), i('🍌', 'banana', 'fruit', 'yellow'), i('🍇', 'grapes', 'fruit', 'purple'),
    i('🥦', 'broccoli', 'veggie', 'green'), i('🥕', 'carrot', 'veggie', 'orange'), i('🌶️', 'chili', 'veggie', 'red'), i('🍆', 'eggplant', 'veggie', 'purple'),
    i('🍩', 'donut', 'treat', 'pink'), i('🍪', 'cookie', 'treat', 'brown'), i('🧁', 'cupcake', 'treat', 'pink'), i('🍕', 'pizza', 'meal', 'yellow'), i('🥪', 'sandwich', 'meal', 'brown'), i('🌮', 'taco', 'meal', 'yellow'),
  ] },
  { id: 'baseball', emoji: '⚾', title: 'Baseball practice', story: "I've never played baseball! What goes in the bag?", yes: 'Pack it!', yesEmoji: '🎒', no: 'Leave it', noEmoji: '🏠', bag: '🎒', items: [
    i('🏏', 'bat', 'gear', 'brown'), i('🧤', 'glove', 'gear', 'brown'), i('⚾', 'baseball', 'gear', 'white'), i('🧢', 'cap', 'clothes', 'blue'),
    i('👟', 'sneakers', 'clothes', 'white'), i('🧦', 'socks', 'clothes', 'white'), i('💧', 'water', 'snack', 'blue'), i('🍌', 'banana', 'snack', 'yellow'),
    i('🧸', 'teddy bear', 'toy', 'brown'), i('🎮', 'video game', 'toy', 'blue'), i('🪀', 'yo-yo', 'toy', 'red'), i('🛏️', 'pillow', 'home', 'white'), i('🍰', 'cake', 'snack', 'white'), i('📚', 'books', 'home', 'red'),
  ] },
  { id: 'beach', emoji: '🏖️', title: 'Beach day', story: "I've never been to the beach! Help me pack.", yes: 'Bring it!', yesEmoji: '👜', no: 'Not today', noEmoji: '🙅', bag: '👜', items: [
    i('🩱', 'swimsuit', 'clothes', 'blue'), i('🕶️', 'sunglasses', 'clothes', 'black'), i('👒', 'sun hat', 'clothes', 'yellow'), i('🧣', 'scarf', 'clothes', 'red'),
    i('🧴', 'sunscreen', 'care', 'white'), i('🪣', 'sand bucket', 'toy', 'red'), i('🏐', 'beach ball', 'toy', 'white'), i('🛝', 'slide', 'toy', 'red'),
    i('🍉', 'watermelon', 'snack', 'red'), i('🧃', 'juice', 'snack', 'yellow'), i('🧤', 'mittens', 'clothes', 'red'), i('🔦', 'flashlight', 'tool', 'black'), i('☂️', 'umbrella', 'tool', 'blue'), i('⛄', 'snowman kit', 'toy', 'white'),
  ] },
  { id: 'bedtime', emoji: '🌙', title: 'Bedtime', story: "I've never gone to bed! What helps you sleep?", yes: 'Sleepy!', yesEmoji: '😴', no: 'Too wild!', noEmoji: '🤪', bag: '🛏️', items: [
    i('🧸', 'teddy bear', 'cozy', 'brown'), i('📖', 'storybook', 'quiet', 'blue'), i('🥛', 'warm milk', 'snack', 'white'), i('🌙', 'night light', 'quiet', 'yellow'),
    i('🛁', 'bath', 'cozy', 'blue'), i('🧦', 'fuzzy socks', 'cozy', 'pink'), i('🥁', 'drums', 'loud', 'red'), i('🎺', 'trumpet', 'loud', 'yellow'),
    i('🍭', 'lollipop', 'snack', 'pink'), i('🎢', 'roller coaster', 'loud', 'red'), i('📺', 'cartoons', 'screen', 'blue'), i('🎮', 'video game', 'screen', 'black'), i('🎵', 'lullaby', 'quiet', 'pink'), i('🦖', 'dino roar', 'loud', 'green'),
  ] },
];

export const TEACH_COUNT = 6;
export const TEST_COUNT = 6;

/** Bugley's guess: each example votes; same kind counts 2, same color counts 1. Ties guess "yes". */
export function guess(examples: Example[], item: Item): { yes: boolean; because?: Example; clue?: 'kind' | 'color' } {
  let score = 0, best: Example | undefined, bestPts = 0;
  for (const e of examples) {
    const pts = (e.item.kind === item.kind ? 2 : 0) + (e.item.color === item.color ? 1 : 0);
    score += e.yes ? pts : -pts;
    if (pts > bestPts) { bestPts = pts; best = e; }
  }
  const yes = score >= 0;
  const because = best && best.yes === yes ? best : examples.find((e) => e.yes === yes && (e.item.kind === item.kind || e.item.color === item.color));
  if (!because) return { yes };
  return { yes, because, clue: because.item.kind === item.kind ? 'kind' : 'color' };
}

export function deal(scene: Scene, rand: () => number = Math.random): { teach: Item[]; test: Item[] } {
  const s = [...scene.items].map((x) => [rand(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
  return { teach: s.slice(0, TEACH_COUNT), test: s.slice(TEACH_COUNT, TEACH_COUNT + TEST_COUNT) };
}

export const packStars = (right: number) => (right >= 5 ? 3 : right >= 3 ? 2 : 1);
