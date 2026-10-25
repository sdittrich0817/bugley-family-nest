import { describe, expect, it } from "vitest";
import { resizeWorkspace, workspaceOf, workspaceSchema, assertWorkspaceIdle, invalidatePicture, type WorkspaceProject } from "./workspace";
import { guidedComicPages, readyToFinishComic } from "./comic";
import { guidedPages } from "./story";
import { PICTURE_COST } from "./picture";

describe("one creative journey", () => {
  it("retains the original idea and approval when resuming", () => {
    const meta = workspaceSchema.parse({ version: 1, originalIdea: "A purple dragon named Pickles who is scared of flying", activity: "make", outlineApproved: true });
    expect(workspaceOf({ workspace: meta })).toMatchObject({ originalIdea: "A purple dragon named Pickles who is scared of flying", outlineApproved: true, activity: "make" });
  });
  it("preserves earlier panel IDs and words when growing a comic", () => {
    const pages = guidedComicPages("sprouts"); const first = pages[0]?.panels[0];
    if (!first) throw new Error("Expected a first panel"); first.description = "Pickles looks up";
    const next = resizeWorkspace({ pages }, "comic", "long");
    expect(next.pages[0]?.panels[0]).toEqual(first);
    expect(next.pages[0]?.id).toBe(pages[0]?.id);
    expect(next.pages.flatMap((p: any) => p.panels)).toHaveLength(12);
  });
  it("never discards authored pages when choosing a shorter length", () => {
    const pages = guidedPages("builders"); const last = pages.at(-1);
    if (!last) throw new Error("Expected last page"); last.text = "Pickles flies home";
    expect(() => resizeWorkspace({ pages }, "story", "short")).toThrow();
  });
  it("keeps existing picture preview and upgrade costs", () => { expect(PICTURE_COST.preview).toBe(1); expect(PICTURE_COST.upgrade).toBe(2); });
  it("blocks edits and restores during preview painting", () => { expect(() => assertWorkspaceIdle({ paintState: "painting" })).toThrow(); });
  it("blocks edits and restores during final picture painting", () => { expect(() => assertWorkspaceIdle({ upgradeState: "painting" })).toThrow(); });
  it("invalidates old picture art when its subject changes", () => {
    const p: WorkspaceProject = { id: "p", kind: "picture", title: "Pickles", body: "dragon", images: ["old-preview"], styleKey: "cartoon", updatedAt: "now", urls: {}, workspace: workspaceSchema.parse({ version: 1, originalIdea: "dragon" }), details: { mode: "final", paintOp: "old" } };
    invalidatePicture(p); expect(p.images).toEqual([]); expect(p.details.mode).toBe("draft"); expect(p.details.paintOp).toBeUndefined();
  });
  it("finishes workspace comics without a mandatory questionnaire map", () => {
    const pages = guidedComicPages("sprouts"); for (const page of pages) for (const panel of page.panels) { panel.image = "saved"; panel.dialogueDone = true; }
    const c = { genre: "Adventure" as const, styleKey: "classic_comic", characterIds: [], map: { hero: "", place: "", problem: "", want: "", ending: "" }, pages, finished: false, cover: "cover", guidedBand: "sprouts" as const, workspace: { version: 1 } };
    expect(readyToFinishComic(c)).toBe(true); pages[0]?.panels.splice(0, 1, { ...pages[0].panels[0], image: null } as typeof pages[number]["panels"][number]); expect(readyToFinishComic(c)).toBe(false);
  });
});