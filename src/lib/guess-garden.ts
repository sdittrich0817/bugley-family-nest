/** A small, inspectable decision-tree practice game. No model certainty or rewards. */
export type Thing = { name: string; emoji: string; clues: string[] };
export const THINGS: Thing[] = [
  { name:'cat', emoji:'🐱', clues:['animal','fur','pet','legs'] },
  { name:'dog', emoji:'🐶', clues:['animal','fur','pet','legs','barks'] },
  { name:'rabbit', emoji:'🐰', clues:['animal','fur','pet','legs','longEars'] },
  { name:'bear', emoji:'🐻', clues:['animal','fur','legs','big'] },
  { name:'lion', emoji:'🦁', clues:['animal','fur','legs','big','mane'] },
  { name:'elephant', emoji:'🐘', clues:['animal','legs','big','trunk'] },
  { name:'frog', emoji:'🐸', clues:['animal','legs','water','green'] },
  { name:'turtle', emoji:'🐢', clues:['animal','legs','water','shell','green'] },
  { name:'fish', emoji:'🐟', clues:['animal','water'] },
  { name:'shark', emoji:'🦈', clues:['animal','water','big'] },
  { name:'owl', emoji:'🦉', clues:['animal','flies','feathers'] },
  { name:'duck', emoji:'🦆', clues:['animal','flies','feathers','water'] },
  { name:'butterfly', emoji:'🦋', clues:['animal','flies','legs'] },
  { name:'bee', emoji:'🐝', clues:['animal','flies','legs','stripes'] },
  { name:'apple', emoji:'🍎', clues:['food','fruit','round','red'] },
  { name:'banana', emoji:'🍌', clues:['food','fruit','yellow'] },
  { name:'strawberry', emoji:'🍓', clues:['food','fruit','red','seeds'] },
  { name:'watermelon', emoji:'🍉', clues:['food','fruit','green','seeds','big'] },
  { name:'carrot', emoji:'🥕', clues:['food','vegetable'] },
  { name:'broccoli', emoji:'🥦', clues:['food','vegetable','green'] },
  { name:'pizza', emoji:'🍕', clues:['food','cheese'] },
  { name:'ice cream', emoji:'🍦', clues:['food','sweet','cold'] },
  { name:'cookie', emoji:'🍪', clues:['food','sweet','round'] },
  { name:'cake', emoji:'🎂', clues:['food','sweet','candles'] },
  { name:'bicycle', emoji:'🚲', clues:['made','wheels','ride'] },
  { name:'car', emoji:'🚗', clues:['made','wheels','ride','engine'] },
  { name:'rocket', emoji:'🚀', clues:['made','flies','engine'] },
  { name:'umbrella', emoji:'☂️', clues:['made','rain'] },
  { name:'ball', emoji:'⚽', clues:['made','round','play'] },
  { name:'teddy bear', emoji:'🧸', clues:['made','fur','play'] },
];
export const QUESTIONS = [
  ['animal','Is it an animal?','🐾'], ['food','Can you eat it?','🍽️'],
  ['made','Do people make it?','🛠️'], ['fur','Does it have fur?','🧶'],
  ['water','Does it live or swim in water?','💧'], ['flies','Can it fly?','🪽'],
  ['legs','Does it have legs?','🦵'], ['big','Is it usually bigger than a backpack?','🎒'],
  ['pet','Can it be a pet?','🏡'], ['feathers','Does it have feathers?','🪶'],
  ['fruit','Is it a fruit?','🍓'], ['sweet','Is it a sweet treat?','🍬'],
  ['round','Is it round?','⭕'], ['green','Is it mostly green?','🥦'],
  ['red','Is it red?','🍎'], ['wheels','Does it have wheels?','🛞'],
  ['play','Do you play with it?','🧸'], ['engine','Does it have an engine?','⚙️'],
  ['barks','Does it bark?','🐶'], ['longEars','Does it have long ears?','🐰'],
  ['mane','Does it have a mane?','🦁'], ['trunk','Does it have a trunk?','🐘'],
  ['shell','Does it have a shell?','🐢'], ['stripes','Does it have yellow and black stripes?','🐝'],
  ['yellow','Is it yellow?','🍌'], ['seeds','Can you see lots of seeds?','🌱'],
  ['vegetable','Is it a vegetable?','🥕'], ['cheese','Does it have cheese?','🧀'],
  ['cold','Is it served frozen?','🧊'], ['candles','Can birthday candles go on it?','🕯️'],
  ['rain','Does it keep rain off you?','🌧️'], ['ride','Can you ride in or on it?','🚲'],
].map(([id,text,emoji]) => ({ id: id ?? '', text: text ?? '', emoji: emoji ?? '' }));
export type Answer = 'yes' | 'no' | 'unsure';
export type ClueAnswer = { id:string; answer:Answer };
export const MAX_QUESTIONS = 15;
export const ROUND_MS = 240_000;
export function narrow(pool: Thing[], id: string, answer: Answer) {
  return answer === 'unsure' ? pool : pool.filter(t => t.clues.includes(id) === (answer === 'yes'));
}
export function nextQuestion(pool: Thing[], history: ClueAnswer[]) {
  return QUESTIONS.filter(q => !history.some(h => h.id === q.id))
    .map(q => ({ q, yes: pool.filter(t => t.clues.includes(q.id)).length }))
    .filter(({yes}) => yes > 0 && yes < pool.length)
    .sort((a,b) => Math.abs(pool.length / 2 - a.yes) - Math.abs(pool.length / 2 - b.yes))[0]?.q;
}
export function separatingQuestion(a: Thing, b: Thing) {
  return QUESTIONS.find(q => a.clues.includes(q.id) !== b.clues.includes(q.id));
}