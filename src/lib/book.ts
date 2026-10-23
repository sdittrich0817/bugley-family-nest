import { z } from "zod";
import { GENRES } from "./story";

export const BOOK_FORMATS = ["comic", "story"] as const;
export type BookFormat = (typeof BOOK_FORMATS)[number];
const list = z.array(z.string().max(300)).max(60);
export const bibleSchema = z.object({ cast: z.array(z.object({ id: z.string().uuid(), note: z.string().max(300) })).max(40), places: list, events: list, mysteries: list });
export const bookSchema = z.object({
  format: z.enum(BOOK_FORMATS), genre: z.enum(GENRES), styleKey: z.string(), characterIds: z.array(z.string().uuid()),
  bible: bibleSchema, absorbed: z.array(z.string().uuid()), chapterIds: z.array(z.string().uuid()),
  author: z.string().max(40), authorStatus: z.enum(["approved", "pending", "declined"]), dedication: z.string().max(300), cover: z.string().nullable(),
});
export type BookData = z.infer<typeof bookSchema>;
export type Bible = z.infer<typeof bibleSchema>;
export const EMPTY_BIBLE: Bible = { cast: [], places: [], events: [], mysteries: [] };

/** Comics: at least 8 pages, in multiples of 4. Story books: at least 24 pages. */
export const PRINT_RULES = { comic: { min: 8, multiple: 4 }, story: { min: 24, multiple: 1 } } as const;
/** Printed pages: title page + optional dedication + chapter pages + "The End". */
export function printedPages(chapterPages: number, hasDedication: boolean) { return chapterPages + 2 + (hasDedication ? 1 : 0); }
export function pagesUntilPrintable(format: BookFormat, pages: number) {
  const r = PRINT_RULES[format];
  const target = Math.max(r.min, Math.ceil(pages / r.multiple) * r.multiple);
  return target - pages;
}
export function printMessage(format: BookFormat, pages: number) {
  const left = pagesUntilPrintable(format, pages);
  const what = format === "comic" ? "comic" : "story book";
  if (left === 0) return `Your ${what} has enough pages to print!`;
  return `${left} more ${left === 1 ? "page" : "pages"} until your ${what} can be printed!`;
}
/** A child's own first name is approved automatically; any pen name waits for a parent. */
export function authorStatusFor(author: string, nickname: string): BookData["authorStatus"] {
  return author.trim().toLowerCase() === nickname.trim().toLowerCase() ? "approved" : "pending";
}
