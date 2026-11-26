// Server-only central AI spending gate. Every Lovable AI call (aiObject) and every Replicate drawing (replicateRun) passes here.
import { AsyncLocalStorage } from "node:async_hooks";
import { aiCallCredits, round, type SpendBlockReason } from "./spend";

export class SpendBlockedError extends Error {
  constructor(public reason: SpendBlockReason) { super(`spend blocked: ${reason}`); }
}

type Envelope = {
  id: string | null; // null = attribution only (no reservation yet)
  parentId: string | null; childId: string | null;
  maxCredits: number; maxUsd: number;
  credits: number; usd: number; aiCalls: number; drawCalls: number; retries: number;
  creditsSource: "reported_tokens" | "assumed_worst_case"; usdSource: "list_price_estimate" | "assumed_charged";
};
const als = new AsyncLocalStorage<Envelope>();

export type ReserveRpc = (args: { kind: string; opKey: string | null; parentId: string | null; childId: string | null; test: string | null; credits: number; usd: number; draws: boolean }) => Promise<{ ok: true; id: string } | { ok: false; reason: SpendBlockReason }>;
export type SettleRpc = (args: { id: string; status: "settled" | "released"; credits: number; usd: number; creditsSource: string; usdSource: string; aiCalls: number; drawCalls: number; retries: number; succeeded: boolean }) => Promise<void>;

let rpcs: { reserve: ReserveRpc; settle: SettleRpc } | null = null;
/** Tests replace the database calls with stand-ins. */
export function setSpendRpcs(r: { reserve: ReserveRpc; settle: SettleRpc } | null) { rpcs = r; }

async function db() {
  if (rpcs) return rpcs;
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  return {
    reserve: (async (x) => {
      const { data, error } = await a.rpc("ai_spend_reserve", { _op_kind: x.kind, _op_key: x.opKey as string, _parent: x.parentId as string, _child: x.childId as string, _test: x.test as string, _credits: x.credits, _usd: x.usd, _draws: x.draws });
      if (error) { console.error("spend reserve failed", error.code); return { ok: false, reason: "gate_unavailable" }; }
      return data as never;
    }) as ReserveRpc,
    settle: (async (x) => {
      const { error } = await a.rpc("ai_spend_settle", { _id: x.id, _status: x.status, _credits: x.credits, _usd: x.usd, _credits_source: x.creditsSource, _usd_source: x.usdSource, _ai_calls: x.aiCalls, _draw_calls: x.drawCalls, _retries: x.retries, _succeeded: x.succeeded });
      if (error) console.error("spend settle failed", error.code); // stays reserved -> becomes unknown, still counted
    }) as SettleRpc,
  };
}

const testSession = () => process.env["AI_SPEND_TEST_SESSION"] || null;

/** Attributes nested calls to a family without reserving. */
export function spendScope<T>(who: { parentId: string; childId?: string | null }, fn: () => Promise<T>): Promise<T> {
  const cur = als.getStore();
  if (cur?.id) return fn();
  return als.run({ ...blank(), parentId: who.parentId, childId: who.childId ?? null }, fn);
}

function blank(): Envelope {
  return { id: null, parentId: null, childId: null, maxCredits: 0, maxUsd: 0, credits: 0, usd: 0, aiCalls: 0, drawCalls: 0, retries: 0, creditsSource: "reported_tokens", usdSource: "list_price_estimate" };
}

/** Reserves the worst case up front, runs fn, then settles to the recorded usage. Nested inside another reservation, it uses that one. */
export async function withSpend<T>(meta: { kind: string; opKey?: string | null; parentId?: string | null; childId?: string | null; draws?: boolean }, worst: { credits: number; usd: number }, fn: () => Promise<T>): Promise<T> {
  const cur = als.getStore();
  if (cur?.id) return fn();
  const parentId = meta.parentId ?? cur?.parentId ?? null, childId = meta.childId ?? cur?.childId ?? null;
  const r = await (await db()).reserve({ kind: meta.kind, opKey: meta.opKey ?? null, parentId, childId, test: testSession(), credits: round(worst.credits), usd: round(worst.usd), draws: !!meta.draws });
  if (!r.ok) throw new SpendBlockedError(r.reason);
  const env: Envelope = { ...blank(), id: r.id, parentId, childId, maxCredits: worst.credits, maxUsd: worst.usd };
  let ok = false;
  try { const out = await als.run(env, fn); ok = true; return out; }
  finally {
    const used = env.aiCalls + env.drawCalls > 0;
    await (await db()).settle({ id: r.id, status: used ? "settled" : "released", credits: round(env.credits), usd: round(env.usd), creditsSource: env.creditsSource, usdSource: env.usdSource, aiCalls: env.aiCalls, drawCalls: env.drawCalls, retries: env.retries, succeeded: ok });
  }
}

/** Runs one provider call inside the current reservation; refuses to start if the reservation can't cover its worst case. */
async function metered<T>(worst: { credits: number; usd: number }, run: () => Promise<{ value: T; credits?: number; usd?: number }>, kind: "ai" | "draw"): Promise<T> {
  const env = als.getStore();
  if (!env?.id) throw new Error("unmetered provider call"); // callers always enter through withSpend
  if (env.credits + worst.credits > env.maxCredits + 1e-9 || env.usd + worst.usd > env.maxUsd + 1e-9) throw new SpendBlockedError("reservation_exhausted");
  // Hold the worst case immediately so parallel calls in one reservation can't overrun it.
  env.credits += worst.credits; env.usd += worst.usd;
  if (kind === "ai") env.aiCalls++; else env.drawCalls++;
  let r: { value: T; credits?: number; usd?: number };
  try { r = await run(); }
  catch (e) {
    // Unknown provider outcome: keep the full worst case as charged.
    if (worst.credits) env.creditsSource = "assumed_worst_case";
    if (worst.usd) env.usdSource = "assumed_charged";
    throw e;
  }
  if (r.credits === undefined) { if (worst.credits) env.creditsSource = "assumed_worst_case"; }
  else env.credits += r.credits - worst.credits;
  if (r.usd !== undefined) env.usd += r.usd - worst.usd;
  return r.value;
}

export function meteredAi<T>(worstCredits: number, run: () => Promise<{ value: T; inputTokens?: number; outputTokens?: number }>) {
  return metered({ credits: worstCredits, usd: 0 }, async () => {
    const r = await run();
    const known = r.inputTokens !== undefined && r.outputTokens !== undefined;
    return { value: r.value, ...(known ? { credits: aiCallCredits(r.inputTokens!, r.outputTokens!) } : {}) };
  }, "ai");
}
export function meteredDraw<T>(usd: number, run: () => Promise<T>, retry = false) {
  const env = als.getStore(); if (env && retry) env.retries++;
  return metered({ credits: 0, usd }, async () => ({ value: await run(), usd }), "draw");
}
export const inReservation = () => !!als.getStore()?.id;
