import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireParentDevice } from './parent-device.functions';
import { familyHasAccess } from "./billing.functions";
import { GAME_KEYS, GAMES, MAX_LEVEL, ROUND_MINUTES, badgesFor, bonusFor, canPlay, roundSize, runChef, shouldUnlock, trainBugley, type Band, type GameKey } from "./games";

const env = z.enum(["sandbox", "live"]);
const gameKey = z.enum(GAME_KEYS);
const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;
async function kid(sb: any, userId: string, childId: string, environment?: "sandbox" | "live") {
  if (environment && !(await familyHasAccess(sb, userId, environment))) throw new Error("Bugley is taking a little nap. Ask a grown-up!");
  const { loadChild } = await import("./studio.server");
  return loadChild(sb, userId, childId);
}
async function sign(paths: string[]) {
  if (!paths.length) return [] as string[];
  const { data } = await (await admin()).storage.from("game-images").createSignedUrls(paths, 3600);
  return (data ?? []).map((d) => d.signedUrl ?? "");
}
const shuffle = <T,>(xs: T[]) => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
const weight = (game: GameKey, data: any) => game === "train_bugley" ? (data.tests?.length ?? 1) : 1;
const startOfUtcDay = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); };

export const getArcade = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  const child = await kid(context.supabase, context.userId, data.childId);
  const a = await admin();
  const [{ data: content }, { data: progress }, { data: badges }, { data: rounds }, { data: kids }] = await Promise.all([
    a.from("game_content").select("game,level,bands").eq("active", true),
    context.supabase.from("game_progress").select("child_id,game,unlocked,sparks").eq("parent_id", context.userId),
    context.supabase.from("game_badges").select("game,badge,earned_at").eq("child_id", child.id).order("earned_at"),
    context.supabase.from("game_rounds").select("child_id,game,level,score,total,bonus,finished_at").eq("parent_id", context.userId).not("finished_at", "is", null),
    context.supabase.from("children").select("id,nickname,avatar,bug").eq("parent_id", context.userId),
  ]);
  const band = child.age_band as Band;
  const games = GAME_KEYS.map((key) => {
    const p = (progress ?? []).find((x: any) => x.child_id === child.id && x.game === key);
    const levels = [...new Set((content ?? []).filter((c) => c.game === key && c.bands.includes(band)).map((c) => c.level))].sort();
    const board = (kids ?? []).map((k: any) => {
      const mine = (rounds ?? []).filter((r: any) => r.child_id === k.id && r.game === key);
      const best = mine.reduce((m: number, r: any) => Math.max(m, Math.round((r.score / Math.max(1, r.total)) * 100)), -1);
      return { childId: k.id, nickname: k.nickname, avatar: k.bug ?? k.avatar, best, rounds: mine.length, level: (progress ?? []).find((x: any) => x.child_id === k.id && x.game === key)?.unlocked ?? 1 };
    }).filter((r) => r.rounds > 0).sort((x, y) => y.best - x.best);
    return { key, available: canPlay(key, band), levels, unlocked: p?.unlocked ?? 1, sparks: p?.sparks ?? 0, scoreboard: board };
  });
  const today = startOfUtcDay();
  const bonusToday = (rounds ?? []).filter((r: any) => r.child_id === child.id && r.finished_at >= today).reduce((n: number, r: any) => n + r.bonus, 0);
  const sparks = (progress ?? []).filter((x: any) => x.child_id === child.id).reduce((n: number, x: any) => n + x.sparks, 0);
  return { games, badges: badges ?? [], bonusToday, sparks, players: (kids ?? []).map((k: any) => ({ id: k.id, nickname: k.nickname, avatar: k.bug ?? k.avatar })) };
});

export const startRound = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), game: gameKey, level: z.number().int().min(1).max(MAX_LEVEL), environment: env }).parse(i)).handler(async ({ data, context }) => {
  const child = await kid(context.supabase, context.userId, data.childId, data.environment);
  const band = child.age_band as Band;
  if (!canPlay(data.game, band)) throw new Error(`${GAMES[data.game].name} is for ${GAMES[data.game].ages.toLowerCase()}.`);
  const { data: p } = await context.supabase.from("game_progress").select("unlocked").eq("child_id", child.id).eq("game", data.game).maybeSingle();
  if (data.level > (p?.unlocked ?? 1)) throw new Error("Keep playing to unlock that level!");
  const a = await admin();
  const { data: pool } = await a.from("game_content").select("id,data,image_path").eq("game", data.game).eq("level", data.level).eq("active", true).contains("bands", [band]);
  const picked = shuffle(pool ?? []).slice(0, roundSize(data.game, band));
  if (!picked.length) throw new Error("Bugley is still getting this level ready. Try another game!");
  const total = picked.reduce((n, c) => n + weight(data.game, c.data), 0);
  const { data: round, error } = await a.from("game_rounds").insert({ parent_id: context.userId, child_id: child.id, game: data.game, level: data.level, items: picked.map((c) => c.id), total }).select("id,started_at").single();
  if (error || !round) throw new Error("We couldn’t start the game. Try again.");
  const urls = await sign(picked.flatMap((c) => c.image_path ? [c.image_path] : []));
  let u = 0;
  const items = picked.map((c) => {
    const d = c.data as any;
    if (data.game === "real_robot") return { id: c.id, image: c.image_path ? urls[u++] ?? "" : "" };
    if (data.game === "fact_fib") return { id: c.id, statement: d.statement as string, clues: d.clues as { kind: string; title: string; text: string }[] };
    if (data.game === "robot_chef") return { id: c.id, task: d.task as string, cards: shuffle([...d.steps, ...(d.decoys ?? [])].map((s: any) => ({ id: s.id as string, text: s.text as string }))), steps: (d.steps as unknown[]).length };
    return { id: c.id, task: d.task as string, groups: d.groups as string[], twist: !!d.twist, examples: (d.examples as any[]).map((e) => ({ id: e.id as string, emoji: e.emoji as string, name: e.name as string })), tests: (d.tests as unknown[]).length };
  });
  return { roundId: round.id, game: data.game, level: data.level, total, endsAt: new Date(new Date(round.started_at).getTime() + ROUND_MINUTES * 60000).toISOString(), items };
});

async function loadRound(sb: any, userId: string, childId: string, roundId: string) {
  await kid(sb, userId, childId);
  const { data: r } = await (await admin()).from("game_rounds").select("*").eq("id", roundId).eq("parent_id", userId).eq("child_id", childId).maybeSingle();
  if (!r) throw new Error("We couldn’t find that game.");
  return r as unknown as { id: string; game: GameKey; level: number; items: string[]; answers: Record<string, { points: number; max: number; tries: number; done: boolean }>; total: number; started_at: string; finished_at: string | null };
}

export const answerItem = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), roundId: z.string().uuid(), itemId: z.string().uuid(), choice: z.string().max(20).optional(), plan: z.array(z.string().max(10)).max(20).optional(), sorted: z.record(z.string().max(10), z.string().max(40)).optional() }).parse(i)).handler(async ({ data, context }) => {
  const r = await loadRound(context.supabase, context.userId, data.childId, data.roundId);
  if (r.finished_at) throw new Error("This round is over.");
  if (Date.now() > new Date(r.started_at).getTime() + (ROUND_MINUTES * 60 + 30) * 1000) return { timeUp: true as const };
  if (!r.items.includes(data.itemId)) throw new Error("That isn’t part of this round.");
  const prev = r.answers[data.itemId];
  if (prev?.done) throw new Error("You already answered that one.");
  const a = await admin();
  const { data: c } = await a.from("game_content").select("data").eq("id", data.itemId).single();
  const d = c!.data as any;
  let entry = { points: 0, max: weight(r.game, d), tries: (prev?.tries ?? 0) + 1, done: true };
  let feedback: Record<string, unknown>;
  if (r.game === "real_robot") {
    const correct = data.choice === d.answer; entry.points = correct ? 1 : 0;
    feedback = { correct, answer: d.answer, clue: d.clue ?? "" };
  } else if (r.game === "fact_fib") {
    const correct = data.choice === d.answer; entry.points = correct ? 1 : 0;
    feedback = { correct, answer: d.answer, explain: d.explain ?? "", line: d.answer === "fib" ? "Oops! I sounded sure, but I was wrong. That’s why we always check!" : "I was right this time, and you checked. That’s the smart move!" };
  } else if (r.game === "robot_chef") {
    const run = runChef(d.steps, d.decoys ?? [], data.plan ?? []);
    entry = { ...entry, points: run.ok ? 1 : 0, done: run.ok || entry.tries >= 4 };
    feedback = { ...run, correct: run.ok, triesLeft: Math.max(0, 4 - entry.tries), done: entry.done };
  } else {
    const results = trainBugley(d.examples, data.sorted ?? {}, d.tests);
    entry.points = results.filter((x) => x.correct).length;
    const missed = results.some((x) => !x.correct);
    feedback = { results, correct: !missed, line: d.twist && missed ? "I only learned from what you showed me! I never saw that kind, so I guessed wrong." : missed ? "Hmm, I got mixed up. I learned from the groups you made!" : "I learned it! Your examples taught me well." };
  }
  await a.from("game_rounds").update({ answers: { ...r.answers, [data.itemId]: entry } as never }).eq("id", r.id);
  return { timeUp: false as const, ...feedback };
});

export const finishRound = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ childId: z.string().uuid(), roundId: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  const r = await loadRound(context.supabase, context.userId, data.childId, data.roundId);
  const a = await admin();
  if (r.finished_at) throw new Error("This round is already finished.");
  const score = Object.values(r.answers).reduce((n, x) => n + x.points, 0);
  const today = startOfUtcDay();
  const { data: todays } = await a.from("game_rounds").select("bonus").eq("child_id", data.childId).gte("finished_at", today);
  const bonus = bonusFor(score, r.total, (todays ?? []).reduce((n, x) => n + x.bonus, 0));
  await a.from("game_rounds").update({ score, finished_at: new Date().toISOString(), bonus }).eq("id", r.id);
  const { data: p } = await a.from("game_progress").select("unlocked,sparks").eq("child_id", data.childId).eq("game", r.game).maybeSingle();
  const unlockedNow = shouldUnlock(score, r.total, r.level, p?.unlocked ?? 1);
  const unlocked = (p?.unlocked ?? 1) + (unlockedNow ? 1 : 0);
  await a.from("game_progress").upsert({ child_id: data.childId, parent_id: context.userId, game: r.game, unlocked, sparks: (p?.sparks ?? 0) + score, updated_at: new Date().toISOString() });
  const names = badgesFor(r.game, score, r.total, r.level);
  const { data: had } = await a.from("game_badges").select("badge").eq("child_id", data.childId).eq("game", r.game);
  const fresh = names.filter((n) => !(had ?? []).some((h) => h.badge === n));
  if (fresh.length) await a.from("game_badges").insert(fresh.map((badge) => ({ child_id: data.childId, parent_id: context.userId, game: r.game, badge })));
  if (bonus) { const { giftGlowServer } = await import("./glow.server"); try { await giftGlowServer(context.supabase, context.userId, data.childId, bonus, `${GAMES[r.game].name}: perfect round`); } catch { await a.from("game_rounds").update({ bonus: 0 }).eq("id", r.id); } }
  return { score, total: r.total, learned: GAMES[r.game].learned, newBadges: fresh, unlockedLevel: unlockedNow ? unlocked : null, bonus };
});

// ---------- Admin ----------
async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Only the Bugley admin can do this.");
}
export const listGameContent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context);
  const { data } = await context.supabase.from("game_content").select("*").order("game").order("level").order("position");
  const rows = data ?? [];
  const paths = rows.flatMap((r: any) => r.image_path ? [r.image_path] : []);
  const urls = await sign(paths);
  const map = new Map(paths.map((p: string, i: number) => [p, urls[i]]));
  return rows.map((r: any) => ({ ...r, url: r.image_path ? map.get(r.image_path) ?? "" : "" }));
});
export const saveGameContent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ id: z.string().uuid().optional(), game: gameKey, level: z.number().int().min(1).max(3), bands: z.array(z.enum(["sprouts", "explorers", "builders"])).min(1), data: z.record(z.string(), z.unknown()), image_path: z.string().max(300).nullable(), position: z.number().int(), active: z.boolean() }).parse(i)).handler(async ({ data, context }) => {
  await assertAdmin(context);
  const { id, ...row } = data;
  const q = id ? context.supabase.from("game_content").update(row as never).eq("id", id) : context.supabase.from("game_content").insert(row as never);
  const { error } = await q;
  if (error) throw new Error("We couldn’t save that game item.");
  return { ok: true };
});
export const deleteGameContent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  await assertAdmin(context);
  const { error } = await context.supabase.from("game_content").delete().eq("id", data.id);
  if (error) throw new Error("We couldn’t delete that game item.");
  return { ok: true };
});
