import { describe, expect, it } from "vitest";
import { welcomeAutoShow, welcomePatch } from "@/lib/onboarding";

const launch = "2026-11-14T23:00:00Z";
describe("First-session welcome", () => {
  it("opens automatically only for a child created after launch who hasn't seen it", () => {
    expect(welcomeAutoShow("2026-11-15T00:00:00Z", launch, null)).toBe(true);
  });
  it("never auto-opens for children created before launch, even with no record", () => {
    expect(welcomeAutoShow("2026-11-01T00:00:00Z", launch, null)).toBe(false);
  });
  it("stays closed after skip or finish", () => {
    const base = { shown_at: launch, completed_at: null, choice: null };
    expect(welcomeAutoShow("2026-11-15T00:00:00Z", launch, { ...base, skipped_at: launch })).toBe(false);
    expect(welcomeAutoShow("2026-11-15T00:00:00Z", launch, { ...base, skipped_at: null, completed_at: launch, choice: "play" })).toBe(false);
  });
  it("records skip and choice without overwriting the first time", () => {
    expect(welcomePatch("skipped", null, "t1")).toEqual({ skipped_at: "t1" });
    expect(welcomePatch("chose_create", { shown_at: "t0", skipped_at: null, completed_at: "t1", choice: "play" }, "t2")).toEqual({ choice: "create" });
    expect(welcomePatch("shown", { shown_at: "t0", skipped_at: null, completed_at: null, choice: null }, "t2")).toEqual({});
  });
});
