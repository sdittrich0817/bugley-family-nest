import KNN from 'ml-knn';
export type DashAction = 'jump' | 'wait';
export type DashExample = { distance: number; airborne: boolean; action: DashAction };
export const DASH_LESSONS: Array<DashExample & { question: string; reason: string }> = [
  { distance: 230, airborne: false, action: 'wait', question: 'The obstacle is far away. What should I do?', reason: 'Wait! Jumping too early makes me land before the obstacle.' },
  { distance: 125, airborne: false, action: 'jump', question: 'The obstacle is getting close. Now what?', reason: 'Jump! There’s room to rise before I reach it.' },
  { distance: 165, airborne: false, action: 'wait', question: 'Still a little far away. Jump or wait?', reason: 'Wait a little longer. Timing matters, not just seeing an obstacle!' },
  { distance: 125, airborne: true, action: 'wait', question: 'I’m already flying over it. What now?', reason: 'Wait! Let this jump finish. Being in the air matters too.' },
];
const features = (distance: number, airborne: boolean) => [Math.min(300, Math.max(0, distance)) / 200, airborne ? 2 : 0];
export function makeDashBrain(examples: DashExample[]) {
  if (!examples.length) return null;
  const model = new KNN(examples.map(e => features(e.distance, e.airborne)), examples.map(e => e.action === 'jump' ? 1 : 0), { k: 1 });
  return { predict(distance: number, airborne: boolean): DashAction { return model.predict([features(distance, airborne)])[0] === 1 ? 'jump' : 'wait'; } };
}
export const DASH_FINISH_X = 3600;