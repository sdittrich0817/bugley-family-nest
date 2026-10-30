// Mystery Manor "Catch the Sneaky Robot": a know-it-all robot always sounds 100% sure.
// Kids check the clues and decide if it is right. Cases are data so more can be added.
export type SuspectId = 'fox' | 'bear' | 'owl' | 'bunny';
export const SUSPECTS: { id: SuspectId; name: string; emoji: string; traits: string }[] = [
  { id: 'fox', name: 'Fox', emoji: '🦊', traits: 'orange fur · loves umbrellas' },
  { id: 'bear', name: 'Bear', emoji: '🐻', traits: 'big paws · loves honey' },
  { id: 'owl', name: 'Owl', emoji: '🦉', traits: 'feathers · wears glasses' },
  { id: 'bunny', name: 'Bunny', emoji: '🐰', traits: 'hops · loves carrots' },
];
export type Clue = { emoji: string; text: string };
export type Case = { id: string; room: string; roomEmoji: string; question: string; clues: Clue[]; answer: SuspectId; botSays: SuspectId; botWhy: string; lesson: string };

export const CASES: Case[] = [
  { id: 'cake', room: 'Kitchen', roomEmoji: '🍰', question: 'Who ate the carrot cake?', answer: 'bunny', botSays: 'bear', botWhy: 'Bears love sweet things. I am 100% sure!',
    clues: [{ emoji: '🥕', text: 'Orange carrot crumbs' }, { emoji: '👣', text: 'Tiny hop-hop footprints' }, { emoji: '🍃', text: 'A nibbled lettuce leaf' }],
    lesson: 'The robot guessed from a pattern ("bears like sweets") instead of the clues.' },
  { id: 'honey', room: 'Pantry', roomEmoji: '🍯', question: 'Who spilled the honey jar?', answer: 'bear', botSays: 'bear', botWhy: 'Big sticky paw prints. I am 100% sure!',
    clues: [{ emoji: '🐾', text: 'BIG sticky paw prints' }, { emoji: '🍯', text: 'Honey licked off the floor' }, { emoji: '🟤', text: 'Brown fur on the shelf' }],
    lesson: 'This time the robot was right, because the clues agree. Checking still helped!' },
  { id: 'piano', room: 'Music Room', roomEmoji: '🎹', question: 'Who played the piano at midnight?', answer: 'owl', botSays: 'fox', botWhy: 'Foxes are sneaky at night. I am 100% sure!',
    clues: [{ emoji: '🪶', text: 'A feather on the keys' }, { emoji: '👓', text: 'Tiny glasses left behind' }, { emoji: '🌙', text: 'Someone who stays up all night' }],
    lesson: 'Sounding sure is not the same as being right. The feather and glasses tell the truth.' },
  { id: 'umbrella', room: 'Hallway', roomEmoji: '☂️', question: 'Who opened an umbrella indoors?', answer: 'fox', botSays: 'fox', botWhy: 'Orange fur on the umbrella. I am 100% sure!',
    clues: [{ emoji: '☂️', text: 'A dripping umbrella' }, { emoji: '🧡', text: 'Orange fur on the handle' }, { emoji: '🦶', text: 'Pointy little paw prints' }],
    lesson: 'Right again! The robot can be right, and you only know by checking.' },
  { id: 'wall', room: 'Art Room', roomEmoji: '🖍️', question: 'Who drew on the wall?', answer: 'bunny', botSays: 'fox', botWhy: 'The drawing is ORANGE, and Fox is orange. I am 100% sure!',
    clues: [{ emoji: '🖍️', text: 'An orange crayon' }, { emoji: '🥕', text: 'The drawing is of carrots' }, { emoji: '👣', text: 'Hop-hop footprints by the wall' }],
    lesson: 'The robot looked at ONE clue (orange) and ignored the rest. Always check all the clues!' },
];

export type Verdict = { ok: boolean; botRight: boolean };
/** Child says if the robot is right; if not, they also name the real culprit. */
export function judge(c: Case, trustBot: boolean, pick?: SuspectId): Verdict {
  const botRight = c.botSays === c.answer;
  return { botRight, ok: trustBot ? botRight : !botRight && pick === c.answer };
}
export const manorStars = (score: number) => (score >= CASES.length ? 3 : score >= CASES.length - 1 ? 2 : 1);
