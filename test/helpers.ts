// Shared test setup: fresh in-memory DB per test and a scriptable mock of the
// OpenAI-compatible Token Factory API (real HTTP, real fetch, real timeouts).
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { resetDb } from "../src/lib/db.ts";
import { INBOX_DAYS } from "../src/lib/fixtures.ts";
import { resetKeys } from "../src/lib/signing.ts";

export const PROMPT = "Review today's inbox, identify the messages requiring attention, summarize urgent items, and prepare suggested replies.";

const LIVE_ENV = ["NEBIUS_API_KEY", "NEBIUS_BASE_URL", "NEBIUS_PRICING", "NEBIUS_TIMEOUT_MS", "NEBIUS_MAX_RETRIES", "DAILY_MODEL_CALL_LIMIT", "DAILY_TOKEN_LIMIT", "DAILY_BUDGET_USD", "NEBIUS_MODEL", "NEBIUS_MODEL_FAST", "NEBIUS_MODEL_REASONING"];

export function freshDemo(): void {
  for (const k of LIVE_ENV) delete process.env[k];
  process.env.NOCTUA_DB_PATH = ":memory:";
  process.env.NOCTUA_SIGNING_KEY_PATH = path.join(os.tmpdir(), `noctua-test-key-${process.pid}.pem`);
  resetDb();
  resetKeys();
}

export type Handler = (body: { model: string; messages: { role: string; content: string }[] }, n: number) =>
  { status?: number; delayMs?: number; content?: string; raw?: string; usage?: { prompt_tokens: number; completion_tokens: number } | null };

export type Mock = { url: string; calls: { model: string; system: string }[]; close: () => Promise<void> };

export async function mockProvider(handler: Handler): Promise<Mock> {
  const calls: Mock["calls"] = [];
  const server = http.createServer(async (req, res) => {
    let data = "";
    for await (const chunk of req) data += chunk;
    if (req.url?.endsWith("/models")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "test/fast" }, { id: "test/reasoning" }] }));
      return;
    }
    const body = JSON.parse(data || "{}");
    calls.push({ model: body.model, system: body.messages?.[0]?.content ?? "" });
    const r = handler(body, calls.length);
    if (r.delayMs) await new Promise((ok) => setTimeout(ok, r.delayMs));
    if (res.destroyed) return;
    res.writeHead(r.status ?? 200, { "content-type": "application/json" });
    res.end(r.raw ?? JSON.stringify({
      model: body.model,
      choices: [{ message: { role: "assistant", content: r.content ?? "" } }],
      ...(r.usage === null ? {} : { usage: r.usage ?? { prompt_tokens: 1000, completion_tokens: 200 } }),
    }));
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/v1`,
    calls,
    close: () => new Promise((ok) => { server.closeAllConnections(); server.close(() => ok()); }),
  };
}

export function freshLive(mock: Mock, extra: Record<string, string> = {}): void {
  freshDemo();
  Object.assign(process.env, {
    NEBIUS_API_KEY: "test-key-not-real",
    NEBIUS_BASE_URL: mock.url,
    NEBIUS_MODEL_FAST: "test/fast",
    NEBIUS_MODEL_REASONING: "test/reasoning",
    NEBIUS_MAX_RETRIES: "1",
    NEBIUS_TIMEOUT_MS: "2000",
    NEBIUS_PRICING: JSON.stringify({ "test/fast": { input: 0.06, output: 0.24 }, "test/reasoning": { input: 0.3, output: 0.9 } }),
    ...extra,
  });
}

/** A well-behaved model: plans the triage workflow and labels emails with the reference annotations. */
export const goodModel: Handler = (body) => {
  const sys = body.messages[0].content;
  const user = body.messages[body.messages.length - 1].content;
  if (sys.includes("Noctua's planner"))
    return { content: JSON.stringify({ goal: "Triage inbox", supported: true, steps: [{ tool: "inbox.list", args: {} }, { tool: "triage.llm", args: {} }, { tool: "digest.compose", args: {} }] }) };
  if (sys.includes("You triage")) {
    const ids = [...user.matchAll(/<email id="([^"]+)"/g)].map((m) => m[1]);
    const all = Object.values(INBOX_DAYS).flat();
    return { content: JSON.stringify({ items: ids.map((id) => { const e = all.find((x) => x.id === id)!; return { id, category: e.ref.category, summary: e.ref.summary, reply: e.ref.reply ?? null }; }) }) };
  }
  if (sys.includes("keyword rules")) return { content: JSON.stringify({ rules: [{ category: "urgent", keywords: ["urgent", "Outage!", "deadline"] }] }) };
  return { content: "{}" };
};
