import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { familyHasAccess } from "./billing.functions";
import { GENRES, EMPTY_MAP, newStoryPage, type StoryData } from "./story";
import { newComicPage, type ComicData } from "./comic";
import { BOOK_FORMATS, EMPTY_BIBLE, authorStatusFor, bibleSchema, type BookData } from "./book";

const env = z.enum(["sandbox", "live"]);
const NAP = "Ask a grown-up to open the Studio plan first.";
const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

async function ctx(supabase: any, userId: string, childId: string, environment?: "sandbox" | "live") {
  if (environment && !(await familyHasAccess(supabase, userId, environment))) throw new Error(NAP);
  const s = await import("./studio.server");
  const child = await s.loadChild(supabase, userId, childId);
  const check = async (text: string, source = "book") => {
    if (!text.trim()) return;
    const g = await s.guardChildText(supabase, userId, child, text, source);
    if (g.decision !== "allowed") throw new Error(g.reply ?? "Let’s try a safe, made-up idea.");
  };
  return { s, child, check };
}
async function assertCast(supabase: any, userId: string, childId: string, ids: string[]) {
  if (!ids.length) return;
  const { data } = await supabase.from("studio_creations").select("id").eq("parent_id", userId).eq("child_id", childId).eq("kind", "character").is("deleted_at", null).in("id", ids);
  if ((data ?? []).length !== new Set(ids).size) throw new Error("Choose characters from your own My Cast.");
}

export const getBook = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), id: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  const { loadBook } = await import("./book.server");
  return loadBook(context.supabase, context.userId, data.childId, data.id);
});

export const createBook = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), title: z.string().trim().min(1).max(80), format: z.enum(BOOK_FORMATS), genre: z.enum(GENRES), styleKey: z.string().max(40), characterIds: z.array(z.string().uuid()).max(3), environment: env }).parse(i)).handler(async ({ data, context }) => {
  const { s, child, check } = await ctx(context.supabase, context.userId, data.childId, data.environment);
  await check(data.title, "book_title");
  const a = await admin();
  const { data: style } = await a.from("art_styles").select("key").eq("key", data.styleKey).eq("active", true).maybeSingle();
  if (!style) throw new Error("Pick an available art style.");
  await assertCast(context.supabase, context.userId, child.id, data.characterIds);
  const ids = [...new Set(data.characterIds)];
  const details: BookData = { format: data.format, genre: data.genre, styleKey: data.styleKey, characterIds: ids, bible: { ...EMPTY_BIBLE, cast: ids.map((id) => ({ id, note: "" })) }, absorbed: [], chapterIds: [], author: child.nickname, authorStatus: "approved", dedication: "", cover: null };
  const id = await s.saveCreation(context.userId, { child_id: child.id, kind: "book", title: data.title, project: data.title, position: 0 });
  await a.from("studio_creations").update({ details: details as never, style_key: data.styleKey }).eq("id", id);
  const { loadBook } = await import("./book.server");
  return loadBook(context.supabase, context.userId, child.id, id);
});

/** Turns a finished or in-progress one-shot into Chapter 1 of a new Book. */
export const bookFromOneShot = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), creationId: z.string().uuid(), environment: env }).parse(i)).handler(async ({ data, context }) => {
  const { s, child } = await ctx(context.supabase, context.userId, data.childId, data.environment);
  const { data: row } = await context.supabase.from("studio_creations").select("id,kind,title,details").eq("id", data.creationId).eq("parent_id", context.userId).eq("child_id", child.id).in("kind", ["story", "comic"]).is("deleted_at", null).maybeSingle();
  if (!row) throw new Error("We couldn’t find that creation.");
  const d = row.details as (StoryData | ComicData) & { bookId?: string };
  if (d.bookId) throw new Error("This is already part of a book.");
  const format = row.kind === "comic" ? "comic" : "story";
  const details: BookData = { format, genre: d.genre, styleKey: d.styleKey, characterIds: d.characterIds, bible: { ...EMPTY_BIBLE, cast: d.characterIds.map((id) => ({ id, note: "" })) }, absorbed: [], chapterIds: [row.id], author: child.nickname, authorStatus: "approved", dedication: "", cover: null };
  const id = await s.saveCreation(context.userId, { child_id: child.id, kind: "book", title: row.title, project: row.title, position: 0 });
  const a = await admin();
  await a.from("studio_creations").update({ details: details as never, style_key: d.styleKey }).eq("id", id);
  await a.from("studio_creations").update({ details: { ...d, bookId: id } as never, project: row.title, position: 1 }).eq("id", row.id);
  const { loadBook, absorbAndRecap, persistBook } = await import("./book.server");
  const book = await loadBook(context.supabase, context.userId, child.id, id);
  const r = await absorbAndRecap(book);
  book.data.bible = r.bible; book.data.absorbed = r.absorbed;
  await persistBook(context.userId, book);
  return loadBook(context.supabase, context.userId, child.id, id);
});

export const startChapter = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), bookId: z.string().uuid(), title: z.string().trim().min(1).max(80), newCharacterIds: z.array(z.string().uuid()), environment: env }).parse(i)).handler(async ({ data, context }) => {
  const { s, child, check } = await ctx(context.supabase, context.userId, data.childId, data.environment);
  await check(data.title, "chapter_title");
  await assertCast(context.supabase, context.userId, child.id, data.newCharacterIds);
  const { loadBook, persistBook, absorbAndRecap } = await import("./book.server");
  const book = await loadBook(context.supabase, context.userId, child.id, data.bookId);
  const r = await absorbAndRecap(book);
  const added = data.newCharacterIds.filter((id) => !book.data.characterIds.includes(id));
  book.data.characterIds = [...book.data.characterIds, ...added];
  book.data.bible = { ...r.bible, cast: [...r.bible.cast, ...added.map((id) => ({ id, note: "" }))] };
  book.data.absorbed = r.absorbed;
  const base = { genre: book.data.genre, styleKey: book.data.styleKey, characterIds: book.data.characterIds, map: EMPTY_MAP, finished: false, cover: null, bookId: book.id };
  const details = book.data.format === "comic" ? { ...base, pages: [newComicPage("one")] } satisfies ComicData : { ...base, pages: [newStoryPage()] } satisfies StoryData;
  const cid = await s.saveCreation(context.userId, { child_id: child.id, kind: book.data.format, title: data.title, project: book.title, position: book.data.chapterIds.length + 1 });
  const a = await admin();
  await a.from("studio_creations").update({ details: details as never, style_key: book.data.styleKey }).eq("id", cid);
  book.data.chapterIds = [...book.data.chapterIds, cid];
  await persistBook(context.userId, book);
  return { chapterId: cid, kind: book.data.format, recap: r.recap || "A brand-new book! How does your story begin? Your call!" };
});

export const editBook = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), id: z.string().uuid(), environment: env, action: z.enum(["bible", "author", "dedication", "cover", "absorb", "order"]), bible: bibleSchema.optional(), text: z.string().trim().max(300).optional(), chapterIds: z.array(z.string().uuid()).optional() }).parse(i)).handler(async ({ data, context }) => {
  const { child, check } = await ctx(context.supabase, context.userId, data.childId, data.environment);
  const { loadBook, persistBook, absorbAndRecap } = await import("./book.server");
  const book = await loadBook(context.supabase, context.userId, child.id, data.id);
  if (data.action === "bible") {
    if (!data.bible) throw new Error("Nothing to save.");
    const old = new Set([...book.data.bible.places, ...book.data.bible.events, ...book.data.bible.mysteries, ...book.data.bible.cast.map((c) => c.note)]);
    for (const t of [...data.bible.places, ...data.bible.events, ...data.bible.mysteries, ...data.bible.cast.map((c) => c.note)]) if (!old.has(t)) await check(t, "story_bible");
    const castOk = new Set(book.data.characterIds);
    book.data.bible = { ...data.bible, cast: data.bible.cast.filter((c) => castOk.has(c.id)) };
  } else if (data.action === "author") {
    const name = (data.text ?? "").slice(0, 40);
    if (!name) throw new Error("Write an author name first.");
    await check(name, "pen_name");
    book.data.author = name; book.data.authorStatus = authorStatusFor(name, child.nickname);
    if (book.data.authorStatus === "pending") await (await admin()).from("parent_notifications").insert({ parent_id: context.userId, child_id: child.id, typed: `Pen name for “${book.title}”: ${name}`, starter: "Your child picked a pen name. Approve it in the Parent Hub under Books.", read: false } as never);
  } else if (data.action === "dedication") {
    await check(data.text ?? "", "dedication");
    book.data.dedication = data.text ?? "";
  } else if (data.action === "cover") {
    if (!data.text || data.text.length < 3) throw new Error("Describe your cover first.");
    const { generateImage } = await import("./images.server");
    const r = await generateImage(context.supabase, context.userId, { childId: child.id, description: data.text, styleKey: book.data.styleKey, characterIds: book.data.characterIds, mode: "final", requireReferences: true, lockId: book.id });
    if (!r.ok) throw new Error(r.reply);
    if (r.lock && !("bookId" in book.data && book.data.bookId)) book.data.modelLock ??= r.lock;
    book.data.cover = r.path;
  } else if (data.action === "absorb") {
    const r = await absorbAndRecap({ ...book, data: { ...book.data, absorbed: [] } });
    book.data.bible = r.bible; book.data.absorbed = r.absorbed;
  } else if (data.action === "order") {
    const next = data.chapterIds ?? [];
    if (next.length !== book.data.chapterIds.length || next.some((x) => !book.data.chapterIds.includes(x))) throw new Error("We couldn’t reorder those chapters.");
    book.data.chapterIds = next;
    const a = await admin();
    await Promise.all(next.map((cid, i) => a.from("studio_creations").update({ position: i + 1 }).eq("id", cid).eq("parent_id", context.userId)));
  }
  await persistBook(context.userId, book);
  return loadBook(context.supabase, context.userId, child.id, book.id);
});

/** Parent Hub: every family book with all chapters. */
export const listFamilyBooks = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: rows } = await context.supabase.from("studio_creations").select("id,child_id").eq("parent_id", context.userId).eq("kind", "book").is("deleted_at", null).order("updated_at", { ascending: false });
  const { loadBook } = await import("./book.server");
  const books = [];
  for (const r of rows ?? []) { try { books.push(await loadBook(context.supabase, context.userId, r.child_id, r.id)); } catch { /* skip */ } }
  return books;
});

export const decidePenName = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), id: z.string().uuid(), approve: z.boolean() }).parse(i)).handler(async ({ data, context }) => {
  const { loadBook, persistBook } = await import("./book.server");
  const book = await loadBook(context.supabase, context.userId, data.childId, data.id);
  book.data.authorStatus = data.approve ? "approved" : "declined";
  await persistBook(context.userId, book);
  return { ok: true };
});
