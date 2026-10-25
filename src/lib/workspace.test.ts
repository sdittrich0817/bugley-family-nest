import { describe, expect, it } from "vitest";
import { resizeWorkspace, workspaceOf, workspaceSchema } from "./workspace";
import { guidedComicPages } from "./comic";
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
    expect(next.pages.flatMap((p: any) => p.panels)).toHaveLength(12);
  });
  it("never discards authored pages when choosing a shorter length", () => {
    const pages = guidedPages("builders"); const last = pages.at(-1);
    if (!last) throw new Error("Expected last page"); last.text = "Pickles flies home";
    expect(() => resizeWorkspace({ pages }, "story", "short")).toThrow();
  });
  it("keeps existing picture preview and upgrade costs", () => { expect(PICTURE_COST.preview).toBe(1); expect(PICTURE_COST.upgrade).toBe(2); });
});