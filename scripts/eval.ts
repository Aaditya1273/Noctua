// Reproducible benchmark: the same sequence of inbox tasks, run (A) Apprentice-only and (B) with Noctua's
// graduation loop. Each arm uses its own fresh database. Writes machine-readable results to eval/results.json.
// Live inference is used only if NEBIUS_API_KEY is set; otherwise model steps are demo stand-ins and no
// cost or token figures are produced.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const OUT = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : "eval/results.json";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "noctua-eval-"));
process.env.NOCTUA_SIGNING_KEY_PATH = path.join(tmp, "key.pem");

const { resetDb, db } = await import("../src/lib/db.ts");
const { runTask } = await import("../src/lib/orchestrator.ts");
const { learnFromTask } = await import("../src/lib/skills.ts");
const { evaluateSkill } = await import("../src/lib/evaluator.ts");
const { getTask } = await import("../src/lib/receipts.ts");
const { runAttackNight } = await import("../src/lib/attacks.ts");
const { getConfig, isLive } = await import("../src/lib/config.ts");
const { INBOX_DAYS } = await import("../src/lib/fixtures.ts");

const PROMPT = "Review today's inbox, identify the messages requiring attention, summarize urgent items, and prepare suggested replies.";
const SEQUENCE = [1, 1, 2, 1, 2, 3, 3];

function openDb(name: string) {
  process.env.NOCTUA_DB_PATH = path.join(tmp, `${name}.db`);
  resetDb();
}

function accuracy(taskId: string) {
  const t = getTask(taskId)!;
  const ref = new Map(INBOX_DAYS[t.day].map((e) => [e.id, e.ref.category]));
  const items = t.result?.items ?? [];
  const correct = items.filter((i) => ref.get(i.id) === i.category).length;
  const urgent = INBOX_DAYS[t.day].filter((e) => e.ref.category === "urgent").map((e) => e.id);
  return { correct, total: ref.size, urgentMissed: urgent.filter((id) => items.find((i) => i.id === id)?.category !== "urgent").length };
}

function runRecord(taskId: string) {
  const t = getTask(taskId)!;
  return {
    day: t.day, status: t.status, tier: t.tier, modelCalls: t.receipt.modelCalls, standInModelSteps: t.receipt.standInCalls,
    promptTokens: t.receipt.promptTokens, completionTokens: t.receipt.completionTokens, costUsd: t.receipt.costUsd,
    latencyMs: t.latencyMs, fallback: t.fallback, ...accuracy(taskId),
  };
}

function totals() {
  const u = db().prepare("SELECT COUNT(*) AS calls, SUM(prompt_tokens) AS pin, SUM(completion_tokens) AS pout, SUM(cost_usd) AS cost, SUM(cost_usd IS NULL) AS unpriced, SUM(prompt_tokens IS NULL OR completion_tokens IS NULL) AS untokened FROM usage").get() as Record<string, number | null>;
  return {
    modelCallsIncludingLearning: u.calls ?? 0,
    promptTokens: u.calls && !u.untokened ? u.pin : null,
    completionTokens: u.calls && !u.untokened ? u.pout : null,
    costUsd: !isLive() ? null : !u.calls ? 0 : u.unpriced ? null : u.cost,
  };
}

// Arm A: Apprentice-only baseline
openDb("baseline");
const baseline = [];
for (const day of SEQUENCE) baseline.push(runRecord((await runTask({ prompt: PROMPT, day, route: "apprentice" })).taskId));
const baselineTotals = totals();

// Arm B: Noctua — learn after the first run of each new failure, evaluate, reuse
openDb("noctua");
const noctua = [];
const lifecycle: unknown[] = [];
for (const [i, day] of SEQUENCE.entries()) {
  const { taskId } = await runTask({ prompt: PROMPT, day, route: "auto" });
  const rec = runRecord(taskId);
  noctua.push(rec);
  if (rec.tier === "apprentice" && rec.status === "done") {
    const cand = await learnFromTask(taskId, { drafting: "template" });
    const { skill, report } = await evaluateSkill(cand.id);
    lifecycle.push({ afterRun: i + 1, skillVersion: skill.version, synthesis: skill.synthesis, tier: skill.tier, state: skill.state, checksPassed: report.passed, checksTotal: report.total, failed: report.checks.filter((c) => !c.passed).map((c) => c.id) });
  }
}
const noctuaTotals = totals();
const attack = await runAttackNight();

const sum = (rows: { correct: number; total: number; urgentMissed: number }[]) => ({
  accuracy: rows.reduce((a, r) => a + r.correct, 0) / rows.reduce((a, r) => a + r.total, 0),
  urgentMissed: rows.reduce((a, r) => a + r.urgentMissed, 0),
});
const cfg = getConfig();
const results = {
  generatedAt: new Date().toISOString(),
  mode: isLive(cfg) ? "live" : "demo",
  note: isLive(cfg)
    ? "Live: model calls went to Nebius Token Factory. Token and cost figures are API-reported usage × configured prices."
    : "Demo: no inference was performed. Model steps were satisfied by reference annotations (counted as standInModelSteps). Token and cost figures are therefore not available; model-call counts for the baseline are the steps that would have required inference.",
  models: cfg.models, pricingConfigured: Object.keys(cfg.pricing), node: process.version,
  sequence: SEQUENCE, prompt: PROMPT,
  baseline: { label: "Apprentice-only (every run uses full reasoning)", runs: baseline, totals: baselineTotals, ...sum(baseline),
    modelStepsRequired: baseline.reduce((a, r) => a + r.modelCalls + r.standInModelSteps, 0) },
  noctua: { label: "Noctua graduation loop (learning + evaluation costs included)", runs: noctua, totals: noctuaTotals, lifecycle, ...sum(noctua),
    modelStepsRequired: noctua.reduce((a, r) => a + r.modelCalls + r.standInModelSteps, 0),
    runsWithoutInference: noctua.filter((r) => r.tier === "master").length },
  attackNight: { passed: attack.passed, total: attack.total, cases: attack.results.map((r) => ({ id: r.id, passed: r.passed, actual: r.actual })) },
  limitations: [
    "Synthetic sample inbox (3 days, 21 messages) plus a 10-message held-out golden set; this does not demonstrate generalisation to real mail.",
    "Rule-based skills are brittle by design; the runtime invariants exist to catch that and demote.",
    "Demo-mode accuracy for Apprentice runs equals the reference annotations by construction.",
  ],
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(results, null, 2) + "\n");
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`mode=${results.mode}  sequence=${SEQUENCE.join(",")}`);
console.log(`baseline: model steps ${results.baseline.modelStepsRequired}, accuracy ${(results.baseline.accuracy * 100).toFixed(1)}%, urgent missed ${results.baseline.urgentMissed}, cost ${results.mode === "demo" ? "n/a (demo)" : baselineTotals.costUsd ?? "unknown"}`);
console.log(`noctua:   model steps ${results.noctua.modelStepsRequired}, accuracy ${(results.noctua.accuracy * 100).toFixed(1)}%, urgent missed ${results.noctua.urgentMissed}, runs without inference ${results.noctua.runsWithoutInference}/${SEQUENCE.length}, cost ${results.mode === "demo" ? "n/a (demo)" : noctuaTotals.costUsd ?? "unknown"}`);
for (const l of lifecycle as { afterRun: number; skillVersion: number; state: string; checksPassed: number; checksTotal: number }[]) console.log(`  after run ${l.afterRun}: skill v${l.skillVersion} ${l.state} (${l.checksPassed}/${l.checksTotal})`);
console.log(noctua.map((r, i) => `  run ${i + 1} day ${r.day}: ${r.tier}${r.fallback ? " (fallback)" : ""}`).join("\n"));
console.log(`attack night: ${attack.passed}/${attack.total}`);
console.log(`wrote ${OUT}`);
