import { describe, expect, it } from "vitest";
import { authorStatusFor, pagesUntilPrintable, printMessage, printedPages } from "./book";

describe("book print rules", () => {
  it("comic with 2 pages needs 6 more (8 minimum)", () => expect(printMessage("comic", 2)).toBe("6 more pages until your comic can be printed!"));
  it("comic of 8 pages can print", () => expect(pagesUntilPrintable("comic", 8)).toBe(0));
  it("comic of 9 pages needs to reach 12 (multiple of 4)", () => expect(pagesUntilPrintable("comic", 9)).toBe(3));
  it("story book needs 24 pages", () => expect(pagesUntilPrintable("story", 20)).toBe(4));
  it("story book of 25 pages can print", () => expect(pagesUntilPrintable("story", 25)).toBe(0));
  it("counts title page, The End and optional dedication", () => { expect(printedPages(5, false)).toBe(7); expect(printedPages(5, true)).toBe(8); });
  it("child's first name is approved automatically", () => expect(authorStatusFor("Maya", "maya")).toBe("approved"));
  it("a pen name waits for a parent", () => expect(authorStatusFor("Captain Quill", "Maya")).toBe("pending"));
});
