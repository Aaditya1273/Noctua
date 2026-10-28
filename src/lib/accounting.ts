// Budget enforcement and usage accounting. Every model call goes through callModel().
import type { z } from "zod";
import { getConfig, type Config } from "./config.ts";
import { db, getSetting, id, nowIso, setSetting, startOfDayIso, tx } from "./db.ts";
import { chatCompletion, extractJson, ProviderError, type ChatMessage, type Completion } from "./provider.ts";

export type Limits = {
  dailyModelCalls: number;
  dailyTokens: number;
  dailyBudgetUsd: number;
  dailyRiskPoints: number;
  downgradeAt: number;
};

export function getLimits(cfg: Config = getConfig()): Limits {
  return { ...cfg.defaults, ...getSetting<Partial<Limits>>("limits", {}) };
}

export function saveLimits(l: Limits): void {
  setSetting("limits", l);
}

export function costFor(model: string, promptTokens: number | null, completionTokens: number | null, cfg = getConfig()): number | null {
  const p = cfg.pricing[model];
  if (!p || promptTokens === null || completionTokens === null) return null;
  return (promptTokens * p.input + completionTokens * p.output) / 1_000_000;
}

export type UsageToday = {
  calls: number;
  tokens: number;
  measuredSpendUsd: number; // sum of costs computed from reported usage × configured pricing
  unpricedCalls: number; // calls whose cost cannot be computed
  committedUsd: number; // measured + in-flight reservations + conservative estimate for unpriced-usage calls
};

export function usageToday(): UsageToday {
  const r = db().prepare(`
    SELECT COUNT(*) AS calls,
      COALESCE(SUM(CASE WHEN prompt_tokens IS NOT NULL AND completion_tokens IS NOT NULL THEN prompt_tokens + completion_tokens ELSE reserved_tokens END), 0) AS tokens,
      COALESCE(SUM(cost_usd), 0) AS spend,
      COALESCE(SUM(CASE WHEN cost_usd IS NULL AND status != 'reserved' THEN 1 ELSE 0 END), 0) AS unpriced,
      COALESCE(SUM(COALESCE(cost_usd, reserved_usd, 0)), 0) AS committed
    FROM usage WHERE created_at >= ?`).get(startOfDayIso()) as Record<string, number>;
  return { calls: r.calls, tokens: r.tokens, measuredSpendUsd: r.spend, unpricedCalls: r.unpriced, committedUsd: r.committed };
}

export type BudgetState = "ok" | "downgrade" | "exhausted";

export type BudgetStatus = {
  limits: Limits;
  used: UsageToday;
  monetaryCapActive: boolean;
  monetaryCapNote: string;
  ratio: number;
  state: BudgetState;
};

export function budgetStatus(cfg = getConfig()): BudgetStatus {
  const limits = getLimits(cfg);
  const used = usageToday();
  const unpricedModels = [cfg.models.fast, cfg.models.reasoning].filter((m) => !cfg.pricing[m]);
  const monetaryCapActive = limits.dailyBudgetUsd > 0 && unpricedModels.length === 0;
  const monetaryCapNote = limits.dailyBudgetUsd <= 0
    ? "No monetary cap set."
    : monetaryCapActive
      ? "Enforced from API-reported token usage × configured prices."
      : `Inactive — no price configured for ${[...new Set(unpricedModels)].join(", ")}. Call and token limits still apply.`;
  const fractions = [
    limits.dailyModelCalls > 0 ? used.calls / limits.dailyModelCalls : 0,
    limits.dailyTokens > 0 ? used.tokens / limits.dailyTokens : 0,
    monetaryCapActive ? used.committedUsd / limits.dailyBudgetUsd : 0,
  ];
  const ratio = Math.max(...fractions);
  const state: BudgetState = ratio >= 1 ? "exhausted" : ratio >= limits.downgradeAt ? "downgrade" : "ok";
  return { limits, used, monetaryCapActive, monetaryCapNote, ratio, state };
}

export class BudgetError extends Error {}

export class ModelOutputError extends Error {
  raw: string;
  constructor(message: string, raw: string) {
    super(message);
    this.raw = raw;
  }
}

/** Conservative token estimate: ~3.5 characters per token plus the full output allowance. */
export function estimateTokens(messages: ChatMessage[], maxTokens: number): number {
  const chars = messages.reduce((n, m) => n + m.content.length, 0);
  return Math.ceil(chars / 3.5) + maxTokens;
}

/** Check limits and record a reservation atomically, so concurrent requests cannot overshoot. */
export function reserve(taskId: string | null, purpose: string, model: string, messages: ChatMessage[], maxTokens: number, cfg = getConfig()): string {
  return tx(() => {
    const limits = getLimits(cfg);
    const used = usageToday();
    const tokens = estimateTokens(messages, maxTokens);
    const p = cfg.pricing[model];
    const worstUsd = p ? (tokens * Math.max(p.input, p.output)) / 1_000_000 : null;
    if (limits.dailyModelCalls > 0 && used.calls + 1 > limits.dailyModelCalls)
      throw new BudgetError(`Daily model-call limit reached (${used.calls}/${limits.dailyModelCalls}).`);
    if (limits.dailyTokens > 0 && used.tokens + tokens > limits.dailyTokens)
      throw new BudgetError(`Daily token limit would be exceeded (${used.tokens} used + up to ${tokens} for this call > ${limits.dailyTokens}).`);
    if (limits.dailyBudgetUsd > 0 && worstUsd !== null && used.committedUsd + worstUsd > limits.dailyBudgetUsd)
      throw new BudgetError(`Daily budget would be exceeded ($${used.committedUsd.toFixed(4)} committed + up to $${worstUsd.toFixed(4)} > $${limits.dailyBudgetUsd.toFixed(2)}).`);
    const uid = id("use");
    db().prepare(`INSERT INTO usage(id, task_id, created_at, purpose, provider, model, status, reserved_usd, reserved_tokens)
      VALUES(?, ?, ?, ?, 'nebius-token-factory', ?, 'reserved', ?, ?)`).run(uid, taskId, nowIso(), purpose, model, worstUsd, tokens);
    return uid;
  });
}

export type ModelCall = Completion & { usageId: string; costUsd: number | null; purpose: string };

export async function callModel(opts: {
  taskId: string | null;
  purpose: string;
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  json?: boolean;
}): Promise<ModelCall> {
  const cfg = getConfig();
  const maxTokens = Math.min(opts.maxTokens ?? cfg.maxOutputTokens, cfg.maxOutputTokens);
  const uid = reserve(opts.taskId, opts.purpose, opts.model, opts.messages, maxTokens, cfg);
  try {
    const c = await chatCompletion({ model: opts.model, messages: opts.messages, maxTokens, json: opts.json }, cfg);
    const cost = costFor(opts.model, c.promptTokens, c.completionTokens, cfg);
    db().prepare(`UPDATE usage SET status='ok', model=?, prompt_tokens=?, completion_tokens=?, cost_usd=?,
      reserved_usd = CASE WHEN ? IS NULL THEN reserved_usd ELSE NULL END, latency_ms=?, attempts=? WHERE id=?`)
      .run(opts.model, c.promptTokens, c.completionTokens, cost, cost, c.latencyMs, c.attempts, uid);
    return { ...c, usageId: uid, costUsd: cost, purpose: opts.purpose };
  } catch (e) {
    const attempts = (e as { attempts?: number }).attempts ?? 1;
    // A failed request may still have been billed; keep the reservation as a conservative charge.
    db().prepare("UPDATE usage SET status='error', error=?, attempts=?, reserved_tokens=CASE WHEN ? THEN 0 ELSE reserved_tokens END WHERE id=?")
      .run((e as Error).message.slice(0, 300), attempts, e instanceof ProviderError && e.kind === "not_configured" ? 1 : 0, uid);
    throw e;
  }
}

/** Call the model and validate its JSON answer; one repair attempt on invalid output. */
export async function callModelJson<S extends z.ZodType>(schema: S, opts: Parameters<typeof callModel>[0]): Promise<{ value: z.infer<S>; calls: ModelCall[] }> {
  const calls: ModelCall[] = [];
  let messages = opts.messages;
  for (let i = 0; i < 2; i++) {
    const call = await callModel({ ...opts, messages, json: true, purpose: i === 0 ? opts.purpose : `${opts.purpose}:repair` });
    calls.push(call);
    const parsed = schema.safeParse(extractJson(call.content));
    if (parsed.success) return { value: parsed.data, calls };
    const issue = parsed.error.issues.slice(0, 3).map((x) => `${x.path.join(".") || "(root)"}: ${x.message}`).join("; ");
    if (i === 1) throw Object.assign(new ModelOutputError(`Model output failed schema validation: ${issue}`, call.content.slice(0, 2000)), { calls });
    messages = [
      ...opts.messages,
      { role: "assistant", content: call.content.slice(0, 4000) },
      { role: "user", content: `That response was invalid (${issue}). Reply with only the corrected JSON object.` },
    ];
  }
  throw new Error("unreachable");
}
