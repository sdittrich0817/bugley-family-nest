import KNN from "ml-knn";

export type Kind = "berry" | "stone";
export type Sample = { id: string; color: "red" | "blue"; kind: Kind; variation?: number };
export type Example = { sample: Sample; label: Kind };
export const ROUND_MS = 240_000;
export const TRAINING: Sample[] = [
  { id: "red-berry-1", color: "red", kind: "berry" },
  { id: "blue-stone-1", color: "blue", kind: "stone" },
  { id: "red-berry-2", color: "red", kind: "berry", variation: 0.04 },
  { id: "blue-stone-2", color: "blue", kind: "stone", variation: 0.04 },
];
export const SURPRISE: Sample = { id: "red-stone", color: "red", kind: "stone" };
export const REPAIR: Sample = { id: "blue-berry", color: "blue", kind: "berry" };
export const CHECKS: Sample[] = [
  { id: "new-blue-berry", color: "blue", kind: "berry", variation: 0.12 },
  { id: "new-red-stone", color: "red", kind: "stone", variation: 0.12 },
];
export const SNACKS: Sample[] = [
  { id: "snack-blue-stone", color: "blue", kind: "stone", variation: 0.08 },
  { id: "snack-blue-berry", color: "blue", kind: "berry", variation: 0.08 },
  { id: "snack-red-berry", color: "red", kind: "berry", variation: 0.08 },
];
function features(sample: Sample) {
  return [sample.color === "red" ? 0 : 1.4, sample.kind === "berry" ? 1 : 0, sample.variation ?? 0];
}
/** A real local nearest-neighbour model, fitted only on the child's examples. */
export function guess(examples: Example[], sample: Sample): Kind | null {
  if (!examples.length) return null;
  const model = new KNN(examples.map(e => features(e.sample)), examples.map(e => e.label === "berry" ? 1 : 0), { k: 1 });
  return model.predict([features(sample)])[0] === 1 ? "berry" : "stone";
}
export function addExample(examples: Example[], sample: Sample, label: Kind): Example[] {
  return [...examples.filter(e => e.sample.id !== sample.id), { sample, label }];
}