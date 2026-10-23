// Pure Picture Maker rules. Full-price images elsewhere retain their existing cost.
export const PICTURE_COST = { preview: 1, upgrade: 2 } as const;
export function canUpgradePicture(row: { kind?: string; images?: string[]; details?: unknown } | null): boolean {
  if (!row || row.kind !== "picture" || !row.images?.[0]) return false;
  const d = row.details as { mode?: string; pictureFlow?: boolean; upgradeState?: string } | null;
  return d?.pictureFlow === true && d.mode === "sketch" && d.upgradeState === "ready";
}

/** Add rendering detail, not new characters, objects, actions, places or story beats. */
export function enrichPictureIdea(idea: string): string {
  return `${idea.trim()}. Preserve exactly the requested subjects, actions and setting. Rich visual detail: carefully rendered textures and small details on the requested subjects, a thoughtfully composed background appropriate to the requested setting, balanced lighting with soft highlights and gentle shadows, harmonious colors, clear depth and an inviting mood consistent with the idea. Do not replace, remove or invent subjects or change the child's requested action, colors, setting or mood`;
}