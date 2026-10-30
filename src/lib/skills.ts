// Skill lifecycle: manifest schema, synthesis from traces, storage, matching and execution.
// A skill is DATA — an allowlisted sequence of registry tools with typed arguments — never code.
import { z } from "zod";
import { callModelJson } from "./accounting.ts";
import { getConfig, isLive } from "./config.ts";
import { db, id, json, nowIso } from "./db.ts";
import { CATEGORIES, INBOX_DAYS, type Category, type Email } from "./fixtures.ts";
import { verify } from "./signing.ts";
import { TOOLS, invokeTool, note, type ExecState } from "./tools.ts";
import { induceRules, tokens, urgencyMarkers, type Rule, type TriageItem } from "./triage.ts";

export const SKILL_STATES = ["candidate", "verified", "rejected", "suspended", "demoted", "superseded"] as const;
export type SkillState = (typeof SKILL_STATES)[number];
export type Tier = "apprentice" | "journeyman" | "master";

const Step = z.object({ tool: z.string().min(1).max(60), args: z.record(z.string(), z.unknown()) }).strict();

export const ManifestSchema = z.object({
  schemaVersion: z.literal(1),
  family: z.string().regex(/^[a-z0-9.+-]{3,80}$/),
  version: z.number().int().positive(),
  name: z.string().min(3).max(80),
  description: z.string().min(3).max(400),
  trigger: z.object({ examples: z.array(z.string().min(3).max(1000)).min(1).max(10), minOverlap: z.number().min(0.3).max(1), minSharedTerms: z.number().int().min(1).max(10) }).strict(),
  inputs: z.object({ workspaceDay: z.object({ type: z.literal("integer"), min: z.literal(1), max: z.literal(3) }).strict() }).strict(),
  steps: z.array(Step).min(1).max(12),
  preconditions: z.array(z.enum(["inbox_loaded_first", "guard_before_classification"])).min(1),
  invariants: z.object({
    oneLabelPerMessage: z.literal(true),
    noReplyForSuspicious: z.literal(true),
    digestListsAllUrgent: z.literal(true),
    urgentMarkersRespected: z.literal(true),
    minRuleCoverage: z.number().min(0).max(1),
  }).strict(),
  failureConditions: z.array(z.string().min(3).max(200)).min(1).max(10),
  expectedOutputs: z.object({ items: z.literal("TriageItem[]"), digest: z.literal("string") }).strict(),
  security: z.object({ maxRisk: z.enum(["read", "local"]), irreversibleActions: z.literal("forbidden"), requiredGuards: z.array(z.literal("guard.injection_scan")).min(1) }).strict(),
  fixtures: z.object({
    traceExamples: z.array(z.object({ emailId: z.string(), day: z.number().int().min(1).max(3), expected: z.enum(CATEGORIES) }).strict()).min(1).max(200),
    goldenSet: z.literal("golden-v1"),
  }).strict(),
  acceptance: z.object({ minTraceAgreement: z.number().min(0).max(1), minGoldenAccuracy: z.number().min(0).max(1), urgentRecall: z.literal(1), suspiciousRecall: z.literal(1) }).strict(),
  provenance: z.object({ sourceTaskIds: z.array(z.string()).min(1), synthesizedBy: z.string().max(120), createdAt: z.string() }).strict(),
}).strict();

export type Manifest = z.infer<typeof ManifestSchema>;

export type Skill = {
  id: string; family: string; version: number; name: string; description: string; state: SkillState; tier: Tier;
  manifest: Manifest; createdAt: string; updatedAt: string; sourceTaskIds: string[]; synthesis: string;
  evalId: string | null; signature: string | null; stateReason: string | null;
};

export const tierOf = (m: Pick<Manifest, "steps">): Tier => (m.steps.some((s) => TOOLS[s.tool]?.usesModel) ? "journeyman" : "master");

function rowToSkill(r: Record<string, unknown>): Skill {
  return {
    id: r.id as string, family: r.family as string, version: r.version as number, name: r.name as string, description: r.description as string,
    state: r.state as SkillState, tier: r.tier as Tier, manifest: json<Manifest>(r.manifest_json, {} as Manifest),
    createdAt: r.created_at as string, updatedAt: r.updated_at as string, sourceTaskIds: json<string[]>(r.source_task_ids, []),
    synthesis: r.synthesis as string, evalId: (r.eval_id as string) ?? null, signature: (r.signature as string) ?? null, stateReason: (r.state_reason as string) ?? null,
  };
}

export const listSkills = (): Skill[] => (db().prepare("SELECT * FROM skills ORDER BY family, version DESC").all() as Record<string, unknown>[]).map(rowToSkill);
export const getSkill = (skillId: string): Skill | null => {
  const r = db().prepare("SELECT * FROM skills WHERE id = ?").get(skillId) as Record<string, unknown> | undefined;
  return r ? rowToSkill(r) : null;
};

export function setSkillState(skillId: string, state: SkillState, reason: string | null): void {
  db().prepare("UPDATE skills SET state = ?, state_reason = ?, updated_at = ? WHERE id = ?").run(state, reason, nowIso(), skillId);
}

export const DEFAULT_TEMPLATES = {
  urgent: "Hi {firstName},\n\nAcknowledged — I'm on “{subject}” now and will follow up within the hour.\n\nBest,\n{owner}",
  needs_reply: "Hi {firstName},\n\nThanks for your message about “{subject}”. I'll get back to you with a full answer by end of day tomorrow.\n\nBest,\n{owner}",
};

/** Task family = the set of capabilities a validated Apprentice plan used. */
export function familyOf(toolsUsed: string[]): string {
  const core = [...new Set(toolsUsed.filter((t) => TOOLS[t] && TOOLS[t].risk !== "irreversible" && t !== "guard.injection_scan"))].sort();
  return core.join("+") || "none";
}

/** Deterministic intent match: overlap coefficient of content terms, plus a minimum count of shared terms. */
export function matchScore(prompt: string, examples: string[]): { overlap: number; shared: number } {
  const p = new Set(tokens(prompt));
  let best = { overlap: 0, shared: 0 };
  for (const ex of examples) {
    const e = new Set(tokens(ex));
    const shared = [...p].filter((t) => e.has(t)).length;
    const overlap = p.size && e.size ? shared / Math.min(p.size, e.size) : 0;
    if (overlap > best.overlap || (overlap === best.overlap && shared > best.shared)) best = { overlap, shared };
  }
  return best;
}

export const IRREVERSIBLE_VERBS = /\b(send|forward|delete|remove|pay|transfer|publish|post)\b/i;

export function findSkillFor(prompt: string): { skill: Skill; overlap: number; shared: number } | null {
  if (IRREVERSIBLE_VERBS.test(prompt)) return null; // skills never act; such requests always get full planning + policy
  let best: { skill: Skill; overlap: number; shared: number } | null = null;
  for (const s of listSkills().filter((k) => k.state === "verified")) {
    const m = matchScore(prompt, s.manifest.trigger.examples);
    if (m.overlap >= s.manifest.trigger.minOverlap && m.shared >= s.manifest.trigger.minSharedTerms && (!best || m.overlap > best.overlap)) best = { skill: s, ...m };
  }
  return best;
}

// ---------------- Synthesis ----------------

type TaskRow = { id: string; prompt: string; workspace_day: number; result_json: string; intent_key: string; tier: string; status: string };

const ProposedRules = z.object({
  // Generous bounds on the raw proposal; it is trimmed to the tool schema (30 keywords) below.
  rules: z.array(z.object({ category: z.enum(["urgent", "needs_reply", "routine", "fyi"]), keywords: z.array(z.string().max(60)).max(200) })).min(1).max(8),
  name: z.string().min(3).max(80).optional(),
});

export type LearnOptions = { drafting: "template" | "model" };

/** Create a new candidate version from every successful Apprentice trace of this task's family. */
export async function learnFromTask(taskId: string, opts: LearnOptions): Promise<Skill> {
  const task = db().prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as TaskRow | undefined;
  if (!task) throw new Error("Task not found.");
  if (task.status !== "done" || task.tier !== "apprentice") throw new Error("Only completed Apprentice runs can be learned from.");
  const family = task.intent_key;
  if (!family.includes("triage.llm")) throw new Error("This task's workflow has no learnable triage step.");

  const traces = db().prepare("SELECT * FROM tasks WHERE intent_key = ? AND status = 'done' AND tier = 'apprentice' ORDER BY created_at").all(family) as TaskRow[];
  // One trace per workspace day (latest wins), so repeated runs on the same inbox don't double-count.
  const perDay = new Map<number, TaskRow>();
  for (const t of traces) perDay.set(t.workspace_day, t);
  const examples: { email: Email; category: Category; day: number }[] = [];
  for (const t of perDay.values()) {
    const items = json<{ items?: TriageItem[] }>(t.result_json, {}).items ?? [];
    const emails = new Map((INBOX_DAYS[t.workspace_day] ?? []).map((e) => [e.id, e]));
    for (const i of items) {
      const e = emails.get(i.id);
      if (e) examples.push({ email: e, category: i.category, day: t.workspace_day });
    }
  }
  if (!examples.length) throw new Error("No usable examples in the traces.");

  let rules: Rule[] = induceRules(examples);
  let synthesizedBy = "deterministic keyword induction (no model)";
  let calls = 0;
  if (isLive()) {
    try {
      const cfg = getConfig();
      const { value, calls: c } = await callModelJson(ProposedRules, {
        taskId: null, purpose: "skill-synthesis", model: cfg.models.reasoning, maxTokens: 1200,
        messages: [
          { role: "system", content: "You turn labelled email examples into keyword rules for a deterministic classifier. Keywords are single lowercase words of 4+ letters that generalise to similar future emails. Suspicious emails are handled by a separate guard; do not write rules for them. Return only JSON {\"rules\":[{\"category\",\"keywords\"}],\"name\"}." },
          { role: "user", content: examples.filter((x) => x.category !== "suspicious").map((x) => `[${x.category}] ${x.email.subject} — ${x.email.body}`).join("\n") },
        ],
      });
      calls = c.length;
      // Model output is only a proposal: keep keywords that pass the tool's own argument schema.
      const cleaned = value.rules
        .map((r) => ({ category: r.category, keywords: [...new Set(r.keywords.map((k) => k.toLowerCase().trim()).filter((k) => /^[a-z][a-z0-9-]{3,30}$/.test(k)))] }))
        .filter((r) => r.keywords.length > 0);
      const merged = new Map<string, Set<string>>();
      for (const r of [...rules, ...cleaned]) merged.set(r.category, new Set([...(merged.get(r.category) ?? []), ...r.keywords]));
      rules = [...merged].map(([category, kws]) => ({ category: category as Rule["category"], keywords: [...kws].slice(0, 30) }));
      synthesizedBy = `model-assisted (${getConfig().models.reasoning}) + deterministic induction`;
    } catch (e) {
      synthesizedBy = `deterministic keyword induction (model synthesis failed: ${(e as Error).message.slice(0, 80)})`;
    }
  }

  const version = ((db().prepare("SELECT MAX(version) AS v FROM skills WHERE family = ?").get(family) as { v: number | null }).v ?? 0) + 1;
  const steps = [
    { tool: "inbox.list", args: {} },
    { tool: "guard.injection_scan", args: {} },
    { tool: "triage.rules", args: { rules, fallback: "fyi" } },
    { tool: "summarize.extractive", args: {} },
    opts.drafting === "model" ? { tool: "draft.llm", args: {} } : { tool: "draft.template", args: { templates: DEFAULT_TEMPLATES } },
    { tool: "digest.compose", args: {} },
  ];
  const sourceTaskIds = [...perDay.values()].map((t) => t.id);
  const manifest: Manifest = {
    schemaVersion: 1,
    family,
    version,
    name: "Daily inbox triage",
    description: `Classifies the inbox with learned keyword rules, quarantines injection attempts, summarises each message and drafts replies ${opts.drafting === "model" ? "with the model" : "from templates"}.`,
    trigger: { examples: [...new Set([...perDay.values()].map((t) => t.prompt))].slice(0, 10), minOverlap: 0.6, minSharedTerms: 2 },
    inputs: { workspaceDay: { type: "integer", min: 1, max: 3 } },
    steps,
    preconditions: ["inbox_loaded_first", "guard_before_classification"],
    invariants: { oneLabelPerMessage: true, noReplyForSuspicious: true, digestListsAllUrgent: true, urgentMarkersRespected: true, minRuleCoverage: 0.6 },
    failureConditions: [
      "Fewer than 60% of messages match any learned rule (input drift) — the run is flagged and the skill demoted.",
      "A message containing time-critical language is not labelled urgent — the skill is demoted and the task re-run with full reasoning.",
      "Signature does not verify — execution is refused.",
      "Any step denied by the policy engine.",
    ],
    expectedOutputs: { items: "TriageItem[]", digest: "string" },
    security: { maxRisk: "local", irreversibleActions: "forbidden", requiredGuards: ["guard.injection_scan"] },
    fixtures: { traceExamples: examples.map((x) => ({ emailId: x.email.id, day: x.day, expected: x.category })), goldenSet: "golden-v1" },
    acceptance: { minTraceAgreement: 0.9, minGoldenAccuracy: 0.85, urgentRecall: 1, suspiciousRecall: 1 },
    provenance: { sourceTaskIds, synthesizedBy: synthesizedBy.slice(0, 120), createdAt: nowIso() },
  };
  return insertSkill(manifest, synthesizedBy + (calls ? ` · ${calls} model call(s)` : ""));
}

/** Store a manifest as a new candidate. The manifest is schema-checked here and again at evaluation. */
export function insertSkill(manifest: Manifest, synthesis: string): Skill {
  const m = ManifestSchema.parse(manifest);
  const skillId = id("skl");
  const now = nowIso();
  db().prepare(`INSERT INTO skills(id, family, version, name, description, state, tier, manifest_json, created_at, updated_at, source_task_ids, synthesis)
    VALUES(?, ?, ?, ?, ?, 'candidate', ?, ?, ?, ?, ?, ?)`).run(
    skillId, m.family, m.version, m.name, m.description, tierOf(m), JSON.stringify(m), now, now, JSON.stringify(m.provenance.sourceTaskIds), synthesis,
  );
  return getSkill(skillId)!;
}

// ---------------- Execution ----------------

export type SkillRun = { ok: boolean; invariantFailures: string[]; coverage: number | null };

export function evalReportFor(skill: Skill): unknown {
  if (!skill.evalId) return null;
  const r = db().prepare("SELECT report_json FROM evaluations WHERE id = ?").get(skill.evalId) as { report_json: string } | undefined;
  return r ? json(r.report_json, null) : null;
}

/** Execute a skill's steps through the policy engine, then check its runtime invariants. */
export async function executeSkill(skill: Pick<Skill, "manifest">, s: ExecState, source = "task"): Promise<SkillRun> {
  const failures: string[] = [];
  let coverage: number | null = null;
  for (const step of skill.manifest.steps) {
    const r = await invokeTool(s, step.tool, step.args, { kind: "skill", taint: s.taint }, undefined, source);
    if (r.decision.decision !== "allow") failures.push(`Step ${step.tool} was ${r.decision.decision === "deny" ? "denied" : "held for approval"}: ${r.decision.reason}`);
    else if (r.error) failures.push(`Step ${step.tool} failed: ${r.error}`);
    if (step.tool === "triage.rules" && r.output) coverage = (r.output as { coverage: number }).coverage;
    if (failures.length) break;
  }
  if (!failures.length) failures.push(...checkInvariants(skill.manifest, s, coverage));
  return { ok: failures.length === 0, invariantFailures: failures, coverage };
}

export function checkInvariants(m: Manifest, s: ExecState, coverage: number | null): string[] {
  const out: string[] = [];
  const emails = s.emails ?? [];
  const items = s.items ?? [];
  const ids = items.map((i) => i.id);
  if (ids.length !== emails.length || new Set(ids).size !== ids.length || !emails.every((e) => ids.includes(e.id)))
    out.push("Invariant failed: every message must receive exactly one label.");
  if (items.some((i) => i.category === "suspicious" && i.reply))
    out.push("Invariant failed: a suspicious message received a reply draft.");
  if (items.some((i) => i.category === "urgent" && !(s.digest ?? "").includes(i.summary)))
    out.push("Invariant failed: the digest omits an urgent message.");
  for (const e of emails) {
    const item = items.find((i) => i.id === e.id);
    const markers = urgencyMarkers(e);
    if (item && markers.length && item.category !== "urgent" && item.category !== "suspicious")
      out.push(`Invariant failed: "${e.subject}" contains time-critical language (${markers.join(", ")}) but was labelled ${item.category}.`);
  }
  if (coverage !== null && coverage < m.invariants.minRuleCoverage)
    out.push(`Invariant failed: only ${Math.round(coverage * 100)}% of messages matched a learned rule (minimum ${Math.round(m.invariants.minRuleCoverage * 100)}%). The inbox looks different from what this skill was verified on.`);
  return out;
}

/** Refuse to run a promoted skill whose stored artifact no longer matches its signature. */
export function verifySkillSignature(skill: Skill, s?: ExecState): boolean {
  const ok = verify(skill.manifest, evalReportFor(skill), skill.signature);
  if (s) note(s, ok ? "info" : "error", "signature", ok ? "Skill signature verified (Ed25519) — artifact unchanged since evaluation." : "Skill signature did not verify — refusing to execute.");
  return ok;
}
