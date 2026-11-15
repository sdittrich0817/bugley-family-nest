import { describe, expect, it } from "vitest";
import { welcomeParentStatus } from "@/lib/onboarding";

const launch = "2026-11-14T00:00:00Z";
const after = "2026-11-15T00:00:00Z";
const before = "2026-11-01T00:00:00Z";
const rec = (r: Partial<{ shown_at: string; skipped_at: string; completed_at: string; choice: "play" | "create" }>) => ({ shown_at: null, skipped_at: null, completed_at: null, choice: null, ...r });

describe("Parent Hub welcome status", () => {
  it("a child added after launch who hasn't signed in is waiting for the welcome", () => {
    expect(welcomeParentStatus(after, launch, null, "Dragon Catch").label).toBe("Welcome waiting");
  });
  it("a child added before launch is told it won't pop up on its own", () => {
    expect(welcomeParentStatus(before, launch, null, "Dragon Catch").label).toBe("Welcome available");
  });
  it("choosing Play names the child's first game and date", () => {
    const s = welcomeParentStatus(after, launch, rec({ shown_at: after, completed_at: after, choice: "play" }), "Memory Meadow");
    expect(s).toMatchObject({ label: "Chose Play", at: after });
    expect(s.detail).toContain("Memory Meadow");
  });
  it("choosing Create is reported as Create", () => {
    expect(welcomeParentStatus(after, launch, rec({ completed_at: after, choice: "create" }), "x").label).toBe("Chose Create");
  });
  it("skipping is reported as skipped", () => {
    expect(welcomeParentStatus(after, launch, rec({ shown_at: after, skipped_at: after }), "x").label).toBe("Skipped the welcome");
  });
  it("a choice after an earlier skip shows the choice", () => {
    expect(welcomeParentStatus(after, launch, rec({ skipped_at: after, completed_at: after, choice: "play" }), "x").label).toBe("Chose Play");
  });
  it("seen without a choice is reported as seen", () => {
    expect(welcomeParentStatus(before, launch, rec({ shown_at: after }), "x").label).toBe("Saw the welcome");
  });
});
