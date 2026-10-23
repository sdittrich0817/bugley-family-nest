import { describe, expect, it } from "vitest";
import { canUpgradePicture, enrichPictureIdea, PICTURE_COST } from "./picture";

describe("Make a Picture rules", () => {
  it("charges one for a preview and two more for the upgrade", () => {
    expect(PICTURE_COST.preview).toBe(1);
    expect(PICTURE_COST.upgrade).toBe(2);
    expect(PICTURE_COST.preview + PICTURE_COST.upgrade).toBe(3);
  });
  it("only upgrades a saved preview once, not a final or an in-flight upgrade", () => {
    const row = { kind: "picture", images: ["preview.png"], details: { pictureFlow: true, mode: "sketch", upgradeState: "ready" } };
    expect(canUpgradePicture(row)).toBe(true);
    expect(canUpgradePicture({ ...row, details: { ...row.details, mode: "final" } })).toBe(false);
    expect(canUpgradePicture({ ...row, details: { ...row.details, upgradeState: "painting" } })).toBe(false);
    expect(canUpgradePicture({ ...row, images: [] })).toBe(false);
    expect(canUpgradePicture({ ...row, kind: "character" })).toBe(false);
    expect(canUpgradePicture(null)).toBe(false);
  });
  it("keeps the child's exact idea while adding rendering instructions", () => {
    const idea = "a blue dragon sleeping under the sea";
    expect(enrichPictureIdea(idea).startsWith(idea)).toBe(true);
    expect(enrichPictureIdea(idea)).toContain("Do not replace, remove or invent subjects");
  });
});