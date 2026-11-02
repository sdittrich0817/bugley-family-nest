import { describe, expect, it } from "vitest";
import { feedbackSchema } from "@/lib/feedback.functions";
describe("tester feedback", () => {
  it("requires a message", () => { expect(() => feedbackSchema.parse({ message: "  " })).toThrow(); });
  it("accepts an empty email as none", () => { expect(feedbackSchema.parse({ message: "Love it", email: "" }).email).toBeUndefined(); });
  it("rejects ratings outside 1-5", () => { expect(() => feedbackSchema.parse({ message: "x", rating: 6 })).toThrow(); });
});
