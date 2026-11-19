import { describe, expect, it } from "vitest";
import { childFriendlyError, CONNECTION_LOST, kidSignInError, SIGN_IN_RESTING, SIGN_IN_TROUBLE, SOMETHING_WRONG } from "./kid-errors";

describe("child-friendly errors (A3.1)", () => {
  it("turns a dropped connection into Bugley's connection message", () => {
    for (const m of ["Failed to fetch", "NetworkError when attempting to fetch resource.", "Load failed", "The operation timed out"])
      expect(childFriendlyError(new TypeError(m))).toBe(CONNECTION_LOST);
  });
  it("hides technical server text", () => {
    for (const m of ['[{"code":"invalid_type","expected":"string"}]', "Cannot read properties of undefined (reading 'id')", "HTTP 500 Internal Server Error", "duplicate key value violates unique constraint", ""])
      expect(childFriendlyError(new Error(m))).toBe(SOMETHING_WRONG);
    expect(childFriendlyError(null)).toBe(SOMETHING_WRONG);
  });
  it("keeps messages already written for children", () => {
    for (const m of ["Your creation changed in another window. Reopen it; your words are still here.", "Ask a grown-up to open your Studio plan.", "Try a made-up title.", "Glow is back. Try again in a moment."])
      expect(childFriendlyError(new Error(m))).toBe(m);
  });
  it("explains the sign-in rest instead of a vague error", () => {
    expect(kidSignInError(new Error("Too many tries. Please wait 15 minutes and ask your grown-up."))).toBe(SIGN_IN_RESTING);
    expect(SIGN_IN_RESTING).toContain("15 minutes");
    expect(kidSignInError(new TypeError("Failed to fetch"))).toBe(CONNECTION_LOST);
    expect(kidSignInError(new Error("duplicate key value violates unique constraint"))).toBe(SIGN_IN_TROUBLE);
  });
});
