import { describe, expect, it } from "vitest";
import { isAllowedReturnUrl } from "@/lib/return-url";

describe("payment return pages", () => {
  it("allows Bugley pages", () => {
    expect(isAllowedReturnUrl("https://bugley.app/hub")).toBe(true);
    expect(isAllowedReturnUrl("https://www.bugley.app/plan?checkout=done")).toBe(true);
  });
  it("rejects other sites and look-alikes", () => {
    expect(isAllowedReturnUrl("https://evil.example/hub")).toBe(false);
    expect(isAllowedReturnUrl("https://bugley.app.evil.example/")).toBe(false);
    expect(isAllowedReturnUrl("http://bugley.app/hub")).toBe(false);
  });
});
