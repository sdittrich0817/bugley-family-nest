import { describe, expect, it } from "vitest";
import { kidZoneRedirect } from "@/lib/kid-zone";
describe("Kid Zone lock", () => {
  it("sends a locked device back to the Kid Zone from settings, billing and account pages", () => {
    for (const p of ["/settings", "/account", "/pricing", "/", "/setup"]) expect(kidZoneRedirect(p, true)).toBe("/kids");
  });
  it("lets a locked device stay in the Kid Zone", () => { expect(kidZoneRedirect("/kids", true)).toBeNull(); });
  it("keeps device setup reachable when a locked child's session expires", () => {
    expect(kidZoneRedirect("/kids-entry", true)).toBeNull();
  });
  it("allows grown-up sign-in without unlocking protected parent content", () => {
    expect(kidZoneRedirect("/login", true)).toBeNull();
    expect(kidZoneRedirect("/hub", true)).toBe("/kids");
  });
  it("allows device pairing while locked", () => {
    expect(kidZoneRedirect("/pair", true)).toBeNull();
  });
  it("does not allow look-alike recovery paths", () => {
    expect(kidZoneRedirect("/login/settings", true)).toBe("/kids");
  });
  it("does nothing when unlocked", () => { expect(kidZoneRedirect("/settings", false)).toBeNull(); });
  it("does not treat look-alike paths as the Kid Zone", () => { expect(kidZoneRedirect("/kidsettings", true)).toBe("/kids"); });
  it("allows the Parent Hub after verified unlock but blocks it while locked", () => {
    expect(kidZoneRedirect("/hub", false)).toBeNull();
    expect(kidZoneRedirect("/hub", true)).toBe("/kids");
  });
});
