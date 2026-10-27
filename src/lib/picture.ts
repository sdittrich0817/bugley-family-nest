// Pure Picture Maker rules. Full-price images elsewhere retain their existing cost.
export const PICTURE_COST = { preview: 1, upgrade: 2 } as const;
export function canUpgradePicture(row: { kind?: string; images?: string[]; details?: unknown } | null): boolean {
  if (!row || row.kind !== "picture" || !row.images?.[0]) return false;
  const d = row.details as { mode?: string; pictureFlow?: boolean; upgradeState?: string } | null;
  return d?.pictureFlow === true && d.mode === "sketch" && d.upgradeState === "ready";
}

/** Completion keeps the saved artwork and does not require a paid upgrade. */
export function setPictureComplete(project: { kind: string; images: string[]; details: any; workspace: { activity: "imagine" | "make" | "finish" } }, finished: boolean) {
  if (project.kind !== "picture") throw new Error("Choose your picture first.");
  if (project.details.paintState === "painting" || project.details.upgradeState === "painting") throw new Error("Wait for your picture to finish painting.");
  if (finished && !project.images[0]) throw new Error("Draw your picture before finishing it.");
  project.details.finished = finished;
  project.workspace.activity = finished ? "finish" : "make";
}

/** Add rendering detail, not new characters, objects, actions, places or story beats. */
export function enrichPictureIdea(idea: string): string {
  return `${idea.trim()}. Preserve exactly the requested subjects, actions and setting. Rich visual detail: carefully rendered textures and small details on the requested subjects, a thoughtfully composed background appropriate to the requested setting, balanced lighting with soft highlights and gentle shadows, harmonious colors, clear depth and an inviting mood consistent with the idea. Do not replace, remove or invent subjects or change the child's requested action, colors, setting or mood`;
}