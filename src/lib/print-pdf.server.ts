// Builds Lulu print-ready PDFs: interior (trim + 0.125" bleed per side) and full cover spread, with embedded fonts.
import { PDFDocument, rgb, degrees, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Book } from "./book.server";
import { LAYOUTS } from "./comic";
import { paddedPageCount, type PrintFormat } from "./print";

const BLEED = 9; // 0.125in in points
const SAFE = 36; // keep words 0.5in inside the trim
const NAVY = rgb(0.13, 0.17, 0.32);
const CREAM = rgb(1, 0.98, 0.94);
const FONT_URLS = {
  display: "https://cdn.jsdelivr.net/fontsource/fonts/nunito@latest/latin-800-normal.ttf",
  body: "https://cdn.jsdelivr.net/fontsource/fonts/nunito@latest/latin-500-normal.ttf",
  letter: "https://cdn.jsdelivr.net/fontsource/fonts/comic-neue@latest/latin-700-normal.ttf",
  sfx: "https://cdn.jsdelivr.net/fontsource/fonts/bangers@latest/latin-400-normal.ttf",
};

type Fonts = Record<keyof typeof FONT_URLS, PDFFont>;
async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  doc.registerFontkit(fontkit);
  const out: Partial<Fonts> = {};
  for (const [k, url] of Object.entries(FONT_URLS)) {
    const res = await fetch(url); if (!res.ok) throw new Error(`Couldn’t load print font ${k} [${res.status}]`);
    out[k as keyof Fonts] = await doc.embedFont(new Uint8Array(await res.arrayBuffer()), { subset: true });
  }
  return out as Fonts;
}

export type PdfReport = { bytes: Uint8Array; pageCount: number; lowRes: number };

function images(doc: PDFDocument) {
  const cache = new Map<string, PDFImage | null>();
  const report = { lowRes: 0 };
  async function get(path: string | null | undefined): Promise<PDFImage | null> {
    if (!path) return null;
    if (cache.has(path)) return cache.get(path)!;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.storage.from("studio-images").download(path);
    if (!data) { cache.set(path, null); return null; }
    const bytes = new Uint8Array(await data.arrayBuffer());
    let img: PDFImage;
    if (bytes[0] === 0x89 && bytes[1] === 0x50) img = await doc.embedPng(bytes);
    else if (bytes[0] === 0xff && bytes[1] === 0xd8) img = await doc.embedJpg(bytes);
    else throw new Error("Some pictures are saved in a format the printer can’t use yet (WebP). Set the image models in /admin to output PNG or JPG, then redraw those pictures.");
    cache.set(path, img); return img;
  }
  /** Draws an image covering the box; counts pictures under 300 DPI at their printed size. */
  function draw(page: PDFPage, img: PDFImage, x: number, y: number, w: number, h: number) {
    const s = Math.max(w / img.width, h / img.height);
    const dw = img.width * s, dh = img.height * s;
    if (img.width / (w / 72) < 300 || img.height / (h / 72) < 300) report.lowRes++;
    page.drawRectangle({ x, y, width: w, height: h, color: CREAM });
    page.drawImage(img, { x: x + (w - dw) / 2, y: y + (h - dh) / 2, width: dw, height: dh });
  }
  return { get, draw, report };
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const para of text.split(/\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
  }
  return lines;
}
function textBlock(page: PDFPage, text: string, font: PDFFont, size: number, x: number, top: number, width: number, opts: { center?: boolean; color?: ReturnType<typeof rgb> } = {}) {
  const lines = wrap(text, font, size, width);
  lines.forEach((l, i) => {
    const w = font.widthOfTextAtSize(l, size);
    page.drawText(l, { x: opts.center ? x + (width - w) / 2 : x, y: top - size * 1.3 * (i + 1), size, font, color: opts.color ?? NAVY });
  });
  return lines.length * size * 1.3;
}
/** Shrinks text until it fits a box. */
function fitText(page: PDFPage, text: string, font: PDFFont, x: number, y: number, w: number, h: number, max: number, center = true) {
  let size = max;
  while (size > 5 && wrap(text, font, size, w).length * size * 1.3 > h) size -= 0.5;
  textBlock(page, text, font, size, x, y + h, w, { center });
}

export async function buildInterior(book: Book, nickname: string, format: PrintFormat): Promise<PdfReport> {
  const doc = await PDFDocument.create();
  doc.setTitle(book.title); doc.setAuthor(book.data.author || nickname); doc.setCreator("Bugley");
  const fonts = await loadFonts(doc);
  const img = images(doc);
  const W = format.trim_width_in * 72 + BLEED * 2, H = format.trim_height_in * 72 + BLEED * 2;
  const inner = { x: BLEED + SAFE, y: BLEED + SAFE, w: W - 2 * (BLEED + SAFE), h: H - 2 * (BLEED + SAFE) };
  const blank = () => { const p = doc.addPage([W, H]); p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) }); return p; };

  // Title page
  { const p = blank(); const top = H / 2 + 80;
    const used = textBlock(p, book.title, fonts.display, 30, inner.x, top, inner.w, { center: true });
    textBlock(p, `by ${book.data.authorStatus === "approved" ? book.data.author || nickname : nickname}`, fonts.body, 16, inner.x, top - used - 16, inner.w, { center: true }); }
  if (book.data.dedication.trim()) { const p = blank(); textBlock(p, book.data.dedication.trim(), fonts.body, 16, inner.x, H / 2 + 40, inner.w, { center: true }); }

  for (const ch of book.chapters) {
    if (ch.kind === "story") {
      for (const [i, sp] of ch.story.data.pages.entries()) {
        const p = blank();
        let top = H - BLEED - SAFE;
        if (i === 0) top -= textBlock(p, ch.title, fonts.display, 20, inner.x, top, inner.w, { center: true }) + 10;
        const pic = await img.get(sp.image);
        if (pic) { const size = Math.min(inner.w, top - inner.y - 120); img.draw(p, pic, (W - size) / 2, top - size, size, size); top -= size + 16; }
        fitText(p, sp.text, fonts.body, inner.x, inner.y, inner.w, top - inner.y, 18, false);
      }
    } else {
      for (const [i, cp] of ch.comic.data.pages.entries()) {
        const p = blank();
        let top = H - BLEED - SAFE / 2;
        if (i === 0) top -= textBlock(p, ch.title, fonts.display, 16, inner.x, top, inner.w, { center: true }) + 6;
        const n = LAYOUTS[cp.layout]; const cols = n === 1 ? 1 : n === 3 ? 1 : 2; const rows = Math.ceil(n / cols);
        const gx = BLEED + SAFE / 2, gw = W - 2 * gx, gy = BLEED + SAFE / 2, gh = top - gy, gap = 8;
        const cw = (gw - gap * (cols - 1)) / cols, rh = (gh - gap * (rows - 1)) / rows;
        for (const [k, panel] of cp.panels.slice(0, n).entries()) {
          const c = k % cols, r = Math.floor(k / cols);
          const x = gx + c * (cw + gap), y = gy + gh - (r + 1) * rh - r * gap;
          const pic = await img.get(panel.image ?? panel.sketch);
          if (pic) img.draw(p, pic, x, y, cw, rh); else p.drawRectangle({ x, y, width: cw, height: rh, color: CREAM });
          p.drawRectangle({ x, y, width: cw, height: rh, borderColor: NAVY, borderWidth: 2 });
          for (const l of panel.layers) {
            if (!l.text.trim()) continue;
            const lw = (l.w / 100) * cw, lh = (l.h / 100) * rh, lx = x + (l.x / 100) * cw, ly = y + rh - (l.y / 100) * rh - lh;
            if (l.type === "sfx") { fitText(p, l.text.toUpperCase(), fonts.sfx, lx, ly, lw, lh, 28); continue; }
            if (l.type === "speech" || l.type === "thought") {
              p.drawLine({ start: { x: lx + lw / 2, y: ly + lh / 2 }, end: { x: lx + (l.tx / 100) * lw, y: ly - Math.min(16, lh * 0.5) }, thickness: 1.2, color: NAVY });
              p.drawEllipse({ x: lx + lw / 2, y: ly + lh / 2, xScale: lw / 2, yScale: lh / 2, color: rgb(1, 1, 1), borderColor: NAVY, borderWidth: 1.2 });
              fitText(p, l.text, fonts.letter, lx + lw * 0.15, ly + lh * 0.15, lw * 0.7, lh * 0.7, 12);
            } else {
              p.drawRectangle({ x: lx, y: ly, width: lw, height: lh, color: rgb(1, 0.95, 0.75), borderColor: NAVY, borderWidth: 1 });
              fitText(p, l.text, fonts.letter, lx + 4, ly + 3, lw - 8, lh - 6, 11);
            }
          }
        }
      }
    }
  }
  { const p = blank(); textBlock(p, "The End", fonts.display, 34, inner.x, H / 2 + 30, inner.w, { center: true }); textBlock(p, "Made with Bugley", fonts.body, 11, inner.x, inner.y + 30, inner.w, { center: true }); }

  const target = paddedPageCount(doc.getPageCount(), format.page_multiple);
  while (doc.getPageCount() < target) blank();
  return { bytes: await doc.save(), pageCount: doc.getPageCount(), lowRes: img.report.lowRes };
}

/** Cover spread from Lulu's cover-dimensions (width includes back, spine and front, plus bleed). */
export async function buildCover(book: Book, nickname: string, format: PrintFormat, dims: { widthPt: number; heightPt: number }): Promise<PdfReport> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${book.title} — cover`);
  const fonts = await loadFonts(doc);
  const img = images(doc);
  const { widthPt: W, heightPt: H } = dims;
  const panel = format.trim_width_in * 72 + BLEED;
  const spine = Math.max(0, W - panel * 2);
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: CREAM });
  const fx = panel + spine; // front cover starts after back + spine
  const pic = await img.get(book.data.cover);
  if (pic) img.draw(p, pic, fx, 0, W - fx, H);
  const author = book.data.authorStatus === "approved" ? book.data.author || nickname : nickname;
  const boxH = 110;
  p.drawRectangle({ x: fx + SAFE, y: H - BLEED - SAFE - boxH, width: W - fx - BLEED - SAFE * 2, height: boxH, color: rgb(1, 1, 1), opacity: 0.88 });
  fitText(p, book.title, fonts.display, fx + SAFE + 10, H - BLEED - SAFE - boxH + 34, W - fx - BLEED - SAFE * 2 - 20, boxH - 40, 32);
  textBlock(p, `by ${author}`, fonts.body, 14, fx + SAFE, H - BLEED - SAFE - boxH + 30, W - fx - BLEED - SAFE * 2, { center: true });
  textBlock(p, "Made with Bugley — figure out AI, together.", fonts.body, 11, BLEED + SAFE, BLEED + SAFE + 30, panel - BLEED - SAFE * 2, { center: true });
  if (spine >= 36) {
    const size = Math.min(14, spine * 0.45);
    const t = book.title.slice(0, 60);
    p.drawText(t, { x: panel + spine / 2 + size / 3, y: H / 2 - fonts.display.widthOfTextAtSize(t, size) / 2, size, font: fonts.display, color: NAVY, rotate: degrees(90) });
  }
  return { bytes: await doc.save(), pageCount: 1, lowRes: img.report.lowRes };
}
