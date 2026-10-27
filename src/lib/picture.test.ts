import { describe, expect, it } from "vitest";
import { canUpgradePicture, enrichPictureIdea, PICTURE_COST, setPictureComplete } from "./picture";

describe("Make a Picture rules", () => {
  it("completes a saved picture without replacing its image or requiring an upgrade", () => {
    const p = { kind: "picture", images: ["saved-picture.png"], details: { mode: "sketch", finished: false }, workspace: { activity: "make" as "make" | "finish" } };
    setPictureComplete(p, true);
    expect(p.details.finished).toBe(true);
    expect(p.workspace.activity).toBe("finish");
    expect(p.images).toEqual(["saved-picture.png"]);
    expect(p.details.mode).toBe("sketch");
    setPictureComplete(p, false);
    expect(p.details.finished).toBe(false);
    expect(p.workspace.activity).toBe("make");
  });
  it("cannot complete an empty or still-painting picture", () => {
    const p = { kind: "picture", images: [], details: {}, workspace: { activity: "make" as const } };
    expect(() => setPictureComplete(p, true)).toThrow("Draw your picture");
    expect(() => setPictureComplete({ ...p, images: ["saved.png"], details: { paintState: "painting" } }, true)).toThrow("Wait");
    expect(() => setPictureComplete({ ...p, images: ["saved.png"], details: { upgradeState: "painting" } }, true)).toThrow("Wait");
  });
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