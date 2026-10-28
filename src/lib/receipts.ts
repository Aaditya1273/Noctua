// Read models for receipts, history and the dashboard. Every number comes from persisted records;
// missing values stay null and are rendered as "Unknown".
import { db, json, startOfDayIso } from "./db.ts";
import type { TaskResult, TaskStatus } from "./orchestrator.ts";
import type { Tier } from "./skills.ts";
import type { TraceEntry } from "./tools.ts";

export type UsageRow = { id: string; purpose: string; model: string; provider: string; status: string; promptTokens: number | null; completionTokens: number | null; costUsd: number | null; latencyMs: number | null; attempts: number; error: string | null };
export type SecurityEvent = { id: string; createdAt: string; taskId: string | null; source: string; tool: string; decision: string; rule: string; reason: string; args: unknown; provenance: { kind: string; taint: string[] }; riskCost: number };
export type Approval = { id: string; createdAt: string; taskId: string; tool: string; args: unknown; status: string; result: string | null };

export type Receipt = {
  modelCalls: number;
  standInCalls: number;
  models: string[];
  promptTokens: number | null;
  completionTokens: number | null;
  costUsd: number | null; // null = at least one call could not be priced
  costNote: string;
  toolCalls: number;
  retries: number;
  inferenceAvoided: boolean;
  baseline: Baseline | null;
};

export type Baseline = {
  label: string;
  runs: number;
  liveRuns: number;
  avgModelCalls: number | null;
  avgTokens: number | null;
  avgCostUsd: number | null;
};

export type TaskView = {
  id: string; createdAt: string; prompt: string; day: number; status: TaskStatus; tier: Tier; mode: "live" | "demo";
  skillId: string | null; family: string; error: string | null; latencyMs: number | null; fallback: string | null;
  result: TaskResult | null; trace: TraceEntry[]; memoryIds: string[];
  usage: UsageRow[]; security: SecurityEvent[]; approvals: Approval[]; receipt: Receipt;
};

const usageRow = (r: Record<string, unknown>): UsageRow => ({
  id: r.id as string, purpose: r.purpose as string, model: r.model as string, provider: r.provider as string, status: r.status as string,
  promptTokens: (r.prompt_tokens as number) ?? null, completionTokens: (r.completion_tokens as number) ?? null, costUsd: (r.cost_usd as number) ?? null,
  latencyMs: (r.latency_ms as number) ?? null, attempts: r.attempts as number, error: (r.error as string) ?? null,
});

export const secRow = (r: Record<string, unknown>): SecurityEvent => ({
  id: r.id as string, createdAt: r.created_at as string, taskId: (r.task_id as string) ?? null, source: r.source as string, tool: r.tool as string,
  decision: r.decision as string, rule: r.rule as string, reason: r.reason as string, args: json(r.args_json, null),
  provenance: json(r.provenance_json, { kind: "unknown", taint: [] }), riskCost: r.risk_cost as number,
});

/** Measured Apprentice runs of the same task family — the baseline for "what this would have cost". */
export function baselineFor(family: string): Baseline | null {
  const rows = db().prepare("SELECT id, mode, result_json FROM tasks WHERE intent_key = ? AND tier = 'apprentice' AND status = 'done'").all(family) as Record<string, string>[];
  if (!rows.length) return null;
  const live = rows.filter((r) => r.mode === "live");
  let calls = 0, tokens = 0, cost = 0, tokensKnown = true, costKnown = true;
  for (const r of live) {
    const us = (db().prepare("SELECT * FROM usage WHERE task_id = ?").all(r.id) as Record<string, unknown>[]).map(usageRow);
    calls += us.length;
    for (const u of us) {
      if (u.promptTokens === null || u.completionTokens === null) tokensKnown = false; else tokens += u.promptTokens + u.completionTokens;
      if (u.costUsd === null) costKnown = false; else cost += u.costUsd;
    }
  }
  const standIn = rows.filter((r) => r.mode === "demo").map((r) => json<TaskResult | null>(r.result_json, null)?.standInCalls ?? 0);
  return {
    label: live.length ? `Measured average of ${live.length} live Apprentice run(s) of this task` : `${rows.length} demo Apprentice run(s): model steps required per run (not performed in demo mode)`,
    runs: rows.length,
    liveRuns: live.length,
    avgModelCalls: live.length ? calls / live.length : standIn.length ? standIn.reduce((a, b) => a + b, 0) / standIn.length : null,
    avgTokens: live.length && tokensKnown ? tokens / live.length : null,
    avgCostUsd: live.length && costKnown ? cost / live.length : null,
  };
}

export function getTask(taskId: string): TaskView | null {
  const r = db().prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Record<string, unknown> | undefined;
  if (!r) return null;
  const usage = (db().prepare("SELECT * FROM usage WHERE task_id = ? ORDER BY created_at").all(taskId) as Record<string, unknown>[]).map(usageRow);
  const security = (db().prepare("SELECT * FROM security_events WHERE task_id = ? AND (decision != 'allow' OR risk_cost > 0) ORDER BY created_at").all(taskId) as Record<string, unknown>[]).map(secRow);
  const approvals = (db().prepare("SELECT * FROM approvals WHERE task_id = ? ORDER BY created_at").all(taskId) as Record<string, string>[])
    .map((a) => ({ id: a.id, createdAt: a.created_at, taskId: a.task_id, tool: a.tool, args: json(a.args_json, null), status: a.status, result: a.result ?? null }));
  const result = json<TaskResult | null>(r.result_json, null);
  const trace = json<TraceEntry[]>(r.trace_json, []);
  const tier = r.tier as Tier;
  const known = (f: (u: UsageRow) => number | null) => (usage.every((u) => f(u) !== null) ? usage.reduce((n, u) => n + (f(u) ?? 0), 0) : null);
  const costUsd = known((u) => u.costUsd);
  const receipt: Receipt = {
    modelCalls: usage.length,
    standInCalls: result?.standInCalls ?? 0,
    models: [...new Set(usage.map((u) => u.model))],
    promptTokens: known((u) => u.promptTokens),
    completionTokens: known((u) => u.completionTokens),
    costUsd,
    costNote: usage.length === 0 ? "No inference performed." : costUsd === null ? "Estimate unavailable: usage or pricing missing for at least one call." : "API-reported tokens × configured prices.",
    toolCalls: trace.filter((t) => t.kind === "tool" || t.kind === "model").length,
    retries: usage.reduce((n, u) => n + Math.max(0, u.attempts - 1), 0) + usage.filter((u) => u.purpose.endsWith(":repair")).length,
    inferenceAvoided: tier === "master" && usage.length === 0,
    baseline: tier === "apprentice" ? null : baselineFor(r.intent_key as string),
  };
  return {
    id: r.id as string, createdAt: r.created_at as string, prompt: r.prompt as string, day: r.workspace_day as number,
    status: r.status as TaskStatus, tier, mode: r.mode as "live" | "demo", skillId: (r.skill_id as string) ?? null, family: r.intent_key as string,
    error: (r.error as string) ?? null, latencyMs: (r.latency_ms as number) ?? null, fallback: (r.fallback_reason as string) ?? null,
    result, trace, memoryIds: json(r.memory_ids, []), usage, security, approvals, receipt,
  };
}

export type TaskSummary = { id: string; createdAt: string; prompt: string; day: number; status: TaskStatus; tier: Tier; mode: string; modelCalls: number; costUsd: number | null; tokens: number | null; latencyMs: number | null; blocked: number };

export function listTasks(limit = 50): TaskSummary[] {
  const rows = db().prepare(`
    SELECT t.id, t.created_at, t.prompt, t.workspace_day, t.status, t.tier, t.mode, t.latency_ms,
      (SELECT COUNT(*) FROM usage u WHERE u.task_id = t.id) AS calls,
      (SELECT CASE WHEN COUNT(*) = 0 THEN 0 WHEN SUM(u.cost_usd IS NULL) > 0 THEN NULL ELSE SUM(u.cost_usd) END FROM usage u WHERE u.task_id = t.id) AS cost,
      (SELECT CASE WHEN COUNT(*) = 0 THEN 0 WHEN SUM(u.prompt_tokens IS NULL OR u.completion_tokens IS NULL) > 0 THEN NULL ELSE SUM(u.prompt_tokens + u.completion_tokens) END FROM usage u WHERE u.task_id = t.id) AS tokens,
      (SELECT COUNT(*) FROM security_events s WHERE s.task_id = t.id AND s.decision = 'deny') AS blocked
    FROM tasks t ORDER BY t.created_at DESC LIMIT ?`).all(limit) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string, createdAt: r.created_at as string, prompt: r.prompt as string, day: r.workspace_day as number, status: r.status as TaskStatus,
    tier: r.tier as Tier, mode: r.mode as string, modelCalls: r.calls as number, costUsd: (r.cost as number) ?? null, tokens: (r.tokens as number) ?? null,
    latencyMs: (r.latency_ms as number) ?? null, blocked: r.blocked as number,
  }));
}

export function listSecurityEvents(limit = 100, onlyNotable = true): SecurityEvent[] {
  return (db().prepare(`SELECT * FROM security_events ${onlyNotable ? "WHERE decision != 'allow' OR risk_cost > 0" : ""} ORDER BY created_at DESC LIMIT ?`).all(limit) as Record<string, unknown>[]).map(secRow);
}

export function pendingApprovals(): Approval[] {
  return (db().prepare("SELECT * FROM approvals WHERE status = 'pending' ORDER BY created_at DESC").all() as Record<string, string>[])
    .map((a) => ({ id: a.id, createdAt: a.created_at, taskId: a.task_id, tool: a.tool, args: json(a.args_json, null), status: a.status, result: null }));
}

export function todayCounts() {
  const since = startOfDayIso();
  const t = db().prepare(`SELECT COUNT(*) AS n, SUM(tier = 'master') AS master, SUM(tier = 'journeyman') AS journeyman, SUM(tier = 'apprentice') AS apprentice FROM tasks WHERE created_at >= ?`).get(since) as Record<string, number | null>;
  const blocked = db().prepare("SELECT COUNT(*) AS n FROM security_events WHERE decision = 'deny' AND created_at >= ? AND source = 'task'").get(since) as { n: number };
  return { tasks: t.n ?? 0, master: t.master ?? 0, journeyman: t.journeyman ?? 0, apprentice: t.apprentice ?? 0, blockedToday: blocked.n };
}

export function outbox() {
  return db().prepare("SELECT * FROM outbox ORDER BY created_at DESC LIMIT 50").all() as Record<string, string>[];
}

/** Inference avoided today by verified skills, priced from measured Apprentice baselines only. */
export function savingsToday() {
  const rows = db().prepare("SELECT intent_key, tier, (SELECT COUNT(*) FROM usage u WHERE u.task_id = t.id) AS calls FROM tasks t WHERE created_at >= ? AND tier IN ('master', 'journeyman') AND status = 'done'").all(startOfDayIso()) as { intent_key: string; tier: string; calls: number }[];
  let avoidedCalls = 0, avoidedCost = 0, costKnown = rows.length > 0, anyLive = false, callsKnown = rows.length > 0;
  for (const r of rows) {
    const b = baselineFor(r.intent_key);
    if (!b || b.avgModelCalls === null) { callsKnown = false; costKnown = false; continue; }
    avoidedCalls += Math.max(0, b.avgModelCalls - r.calls);
    if (b.liveRuns > 0) anyLive = true;
    if (b.avgCostUsd === null || r.calls > 0) costKnown = false; else avoidedCost += b.avgCostUsd;
  }
  return {
    skillRuns: rows.length,
    avoidedCalls: callsKnown ? avoidedCalls : null,
    avoidedCostUsd: costKnown ? avoidedCost : null,
    basis: rows.length === 0 ? "none" : anyLive ? "measured" : "demo",
  };
}
