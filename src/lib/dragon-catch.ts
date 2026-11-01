// A small inspectable practice camera, not image recognition or a live AI call.
export const PHOTO_GOAL = 6;
export const ROUND_MS = 240_000;
export type Look = 'sky-dragon' | 'cloud' | 'tree-dragon' | 'stump' | 'rock-dragon' | 'boulder';
export type Sighting = { id: string; look: Look; dragon: boolean; name: string; lane: number };
export type CameraMemory = Partial<Record<Look, { yes: number; no: number }>>;
const LOOKS: { look: Look; dragon: boolean; name: string }[] = [
  { look: 'sky-dragon', dragon: true, name: 'Sky dragon' },
  { look: 'cloud', dragon: false, name: 'Dragon-shaped cloud' },
  { look: 'tree-dragon', dragon: true, name: 'Leafy dragon' },
  { look: 'stump', dragon: false, name: 'Twisty tree stump' },
  { look: 'rock-dragon', dragon: true, name: 'Rocky dragon' },
  { look: 'boulder', dragon: false, name: 'Pointy boulder' },
];
export function makeFlight(random = Math.random): Sighting[] {
  const deck = [0, 1].flatMap((copy) => LOOKS.map((s, i) => ({ ...s, id: `${copy}-${s.look}`, lane: i % 3 })));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = deck[i], b = deck[j];
    if (a && b) { deck[i] = b; deck[j] = a; }
  }
  return deck;
}
export function cameraGuess(look: Look, memory: CameraMemory) {
  const note = memory[look];
  if (note && note.yes + note.no > 0) return { dragon: note.yes >= note.no, sure: Math.min(95, 75 + (note.yes + note.no) * 5), learned: true };
  return { dragon: look === 'sky-dragon' || look === 'cloud', sure: look === 'cloud' ? 94 : 82, learned: false };
}
export function teachCamera(memory: CameraMemory, look: Look, answer: boolean): CameraMemory {
  const old = memory[look] ?? { yes: 0, no: 0 };
  return { ...memory, [look]: { yes: old.yes + Number(answer), no: old.no + Number(!answer) } };
}
export function checkPhoto(sighting: Sighting, answer: boolean) { return sighting.dragon === answer; }
export function flightSpeed(band: string) { return band === 'sprouts' ? 6200 : band === 'builders' ? 3800 : 4800; }