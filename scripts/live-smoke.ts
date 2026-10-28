// Optional live smoke test. Runs only when NEBIUS_API_KEY is set: lists models, then makes ONE small
// JSON chat completion through the same budgeted path the app uses. Uses a throwaway database.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

if (!process.env.NEBIUS_API_KEY) {
  console.log("SKIPPED: NEBIUS_API_KEY is not set. Live inference is unverified.");
  process.exit(0);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "noctua-smoke-"));
process.env.NOCTUA_DB_PATH = path.join(tmp, "smoke.db");
const { checkModels } = await import("../src/lib/provider.ts");
const { callModelJson } = await import("../src/lib/accounting.ts");
const { getConfig } = await import("../src/lib/config.ts");

const status = await checkModels();
console.log(`catalogue reachable: ${status.reachable}${status.error ? ` (${status.error})` : ""}`);
for (const m of status.models) console.log(`  ${m.role}: ${m.id} — ${m.available ? "available" : "NOT in catalogue"}`);
try {
  const { value, calls } = await callModelJson(z.object({ ok: z.boolean(), model_family: z.string() }), {
    taskId: null, purpose: "smoke", model: getConfig().models.fast, maxTokens: 200,
    messages: [{ role: "user", content: 'Reply with only this JSON: {"ok": true, "model_family": "<your model family>"}' }],
  });
  const c = calls[calls.length - 1];
  console.log(`PASS: ${c.model} answered ${JSON.stringify(value)} in ${c.latencyMs} ms; tokens ${c.promptTokens}/${c.completionTokens}; cost ${c.costUsd ?? "unknown (no pricing)"}`);
} catch (e) {
  console.log(`FAIL: ${(e as Error).message}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
