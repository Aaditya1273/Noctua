import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getConfig } from "./config.ts";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, created_at TEXT NOT NULL, prompt TEXT NOT NULL, workspace_day INTEGER NOT NULL,
  status TEXT NOT NULL, tier TEXT NOT NULL, skill_id TEXT, intent_key TEXT NOT NULL,
  mode TEXT NOT NULL, plan_json TEXT, result_json TEXT, trace_json TEXT NOT NULL DEFAULT '[]',
  error TEXT, latency_ms INTEGER, fallback_reason TEXT, memory_ids TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS usage (
  id TEXT PRIMARY KEY, task_id TEXT, created_at TEXT NOT NULL, purpose TEXT NOT NULL, provider TEXT NOT NULL,
  model TEXT NOT NULL, status TEXT NOT NULL, prompt_tokens INTEGER, completion_tokens INTEGER,
  cost_usd REAL, reserved_usd REAL, reserved_tokens INTEGER NOT NULL DEFAULT 0, latency_ms INTEGER, attempts INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY, family TEXT NOT NULL, version INTEGER NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL,
  state TEXT NOT NULL, tier TEXT NOT NULL, manifest_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  source_task_ids TEXT NOT NULL, synthesis TEXT NOT NULL, eval_id TEXT, signature TEXT, state_reason TEXT,
  UNIQUE(family, version)
);
CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY, skill_id TEXT NOT NULL, created_at TEXT NOT NULL, passed INTEGER NOT NULL,
  pass_rate REAL NOT NULL, report_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY, created_at TEXT NOT NULL, task_id TEXT, source TEXT NOT NULL, tool TEXT NOT NULL,
  decision TEXT NOT NULL, rule TEXT NOT NULL, reason TEXT NOT NULL, args_json TEXT NOT NULL,
  provenance_json TEXT NOT NULL, risk_cost INTEGER NOT NULL DEFAULT 0, counted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY, created_at TEXT NOT NULL, task_id TEXT NOT NULL, tool TEXT NOT NULL,
  args_hash TEXT NOT NULL, args_json TEXT NOT NULL, status TEXT NOT NULL, decided_at TEXT, result TEXT
);
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY, created_at TEXT NOT NULL, kind TEXT NOT NULL, content TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attack_runs (
  id TEXT PRIMARY KEY, created_at TEXT NOT NULL, passed INTEGER NOT NULL, total INTEGER NOT NULL, report_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY, created_at TEXT NOT NULL, task_id TEXT, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS usage_day ON usage(created_at);
CREATE INDEX IF NOT EXISTS tasks_day ON tasks(created_at);
CREATE INDEX IF NOT EXISTS sec_day ON security_events(created_at);
`;

let instance: DatabaseSync | null = null;

export function db(): DatabaseSync {
  if (instance) return instance;
  const file = getConfig().dbPath;
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const d = new DatabaseSync(file);
  d.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  d.exec(SCHEMA);
  instance = d;
  return d;
}

/** Tests only: drop the singleton so the next db() opens NOCTUA_DB_PATH again. */
export function resetDb(): void {
  instance?.close();
  instance = null;
}

/** Run fn inside BEGIN IMMEDIATE so check-then-write sequences are atomic across connections. */
export function tx<T>(fn: () => T): T {
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    d.exec("COMMIT");
    return out;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

export const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
export const nowIso = () => new Date().toISOString();

/** Start of the current local day, as an ISO timestamp; all daily limits reset here. */
export function startOfDayIso(d = new Date()): string {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s.toISOString();
}

export function getSetting<T>(key: string, fallback: T): T {
  const row = db().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setSetting(key: string, value: unknown): void {
  db().prepare("INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, JSON.stringify(value));
}

export function json<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
