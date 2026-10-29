// Task orchestration: route → (verified skill | Apprentice plan) → policy-checked execution → receipt.
import { z } from "zod";
import { BudgetError, budgetStatus, callModelJson, ModelOutputError } from "./accounting.ts";
import { getConfig, isLive } from "./config.ts";
import { db, id, json, nowIso } from "./db.ts";
import { INBOX_DAYS, WORKSPACE_DAYS } from "./fixtures.ts";
import { listMemories } from "./memory.ts";
import { ProviderError } from "./provider.ts";
import { executeSkill, familyOf, findSkillFor, getSkill, setSkillState, verifySkillSignature, type Skill, type Tier } from "./skills.ts";
import { TOOLS, invokeTool, newState, note, toolCatalog, type ExecState, type ProposedAction } from "./tools.ts";
import { firstName, type TriageItem } from "./triage.ts";

export const TaskInput = z.object({
  prompt: z.string().trim().min(3).max(1000),
  day: z.number().int().refine((d) => (WORKSPACE_DAYS as readonly number[]).includes(d), "unknown workspace day"),
  route: z.enum(["auto", "apprentice"]).default("auto"),
}).strict();

export type TaskStatus = "running" | "done" | "failed" | "deferred" | "unsupported";

export type TaskResult = {
  items: TriageItem[];
  digest: string | null;
  actions: ProposedAction[];
  coverage: number | null;
  standInCalls: number;
  planGoal: string | null;
  matched?: { skillId: string; version: number; overlap: number; shared: number };
};

const PlanSchema = z.object({
  goal: z.string().min(1).max(300),
  supported: z.boolean(),
  steps: z.array(z.object({ tool: z.string().max(60), args: z.record(z.string(), z.unknown()).default({}), why: z.string().max(200).optional() })).max(10),
});
type Plan = z.infer<typeof PlanSchema>;

const DEMO_PLAN: Plan = {
  goal: "Triage today's inbox: flag what needs attention, summarise urgent items and draft replies.",
  supported: true,
  steps: [
    { tool: "inbox.list", args: {}, why: "Load today's messages." },
    { tool: "guard.injection_scan", args: {}, why: "Screen untrusted content." },
    { tool: "triage.llm", args: {}, why: "Classify, summarise and draft." },
    { tool: "digest.compose", args: {}, why: "Assemble the digest." },
  ],
};

/** Demo-mode stand-in for the model planner: transparent keyword rules, labelled on every receipt. */
export function demoPlan(prompt: string, day: number): Plan {
  const p = prompt.toLowerCase();
  if (!/\b(inbox|e-?mails?|mail|messages?|triage|replies)\b/.test(p))
    return { goal: "Request is outside the sample workspace's tools.", supported: false, steps: [] };
  const steps = [...DEMO_PLAN.steps];
  const emails = INBOX_DAYS[day] ?? [];
  const person = emails.find((e) => e.ref.reply && new RegExp(`\\b${firstName(e).toLowerCase()}\\b`).test(p));
  if (/\bsend\b/.test(p) && person)
    steps.push({ tool: "mail.send", args: { to: person.from, subject: `Re: ${person.subject}`, body: person.ref.reply! }, why: `Send the reply to ${person.fromName}.` });
  const fwd = p.match(/\bforward\b[^@]*?([\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,})/);
  if (fwd)
    steps.push({ tool: "mail.forward", args: { to: fwd[1], messageIds: emails.filter((e) => e.ref.category === "routine").map((e) => e.id) }, why: `Forward messages to ${fwd[1]}.` });
  return { ...DEMO_PLAN, steps };
}

/**
 * The planner never sees email content, so it may name a recipient ("Priya") instead of an address.
 * Resolve a bare name to the matching sender in the current inbox. The policy engine still judges the
 * resolved address (trusted contact / own domain), so a lookalike sender cannot widen permissions.
 */
function resolveRecipient(args: Record<string, unknown>, s: ExecState): Record<string, unknown> {
  const to = typeof args.to === "string" ? args.to.trim() : "";
  if (!to || to.includes("@")) return args;
  const name = to.toLowerCase();
  const match = (s.emails ?? INBOX_DAYS[s.day] ?? []).find((e) => e.fromName.toLowerCase() === name || e.fromName.toLowerCase().split(/\s+/)[0] === name);
  if (!match) return args;
  note(s, "info", "recipient", `Resolved "${to}" to ${match.from} (sender in today's inbox); policy checks the resolved address.`);
  return { ...args, to: match.from };
}

function plannerPrompt(): string {
  // Skill-internal tools need learned parameters (rules, templates); only the skill executor uses them.
  const SKILL_ONLY = new Set(["triage.rules", "summarize.extractive", "draft.template"]);
  const tools = toolCatalog().filter((t) => !SKILL_ONLY.has(t.name)).map((t) => `- ${t.name} [${t.risk}${t.riskCost ? `, ${t.riskCost} risk pts` : ""}]: ${t.description}`).join("\n");
  return `You are Noctua's planner. Build a plan using ONLY these tools:\n${tools}\n
Rules: tools act on a shared context (inbox.list loads messages; triage tools label them; digest.compose writes the digest). Use {} as args unless the tool needs arguments: mail.send needs {"to","subject","body"}; mail.forward needs {"to","query"} where query is a short search phrase for the messages to forward (e.g. "invoice").
If the request cannot be done with these tools, return supported=false and no steps.
Return only JSON: {"goal": string, "supported": boolean, "steps": [{"tool": string, "args": object, "why": string}]}`;
}

function saveTask(taskId: string, fields: Record<string, unknown>): void {
  const keys = Object.keys(fields);
  db().prepare(`UPDATE tasks SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`).run(...(keys.map((k) => fields[k]) as never[]), taskId);
}

/** Enforced structure: the injection guard always runs straight after untrusted content is loaded. */
function enforceGuard(steps: Plan["steps"], s: ExecState): Plan["steps"] {
  const out = steps.filter((st) => st.tool !== "guard.injection_scan");
  const at = out.findIndex((st) => st.tool === "inbox.list");
  if (at >= 0) out.splice(at + 1, 0, { tool: "guard.injection_scan", args: {}, why: "Enforced by Noctua: screen untrusted content." });
  if (!steps.some((st) => st.tool === "guard.injection_scan") && at >= 0) note(s, "info", "planner", "Plan did not include the injection guard; Noctua inserted it (mandatory).");
  return out;
}

async function runApprentice(s: ExecState, prompt: string): Promise<{ plan: Plan; status: TaskStatus; error?: string }> {
  const cfg = getConfig();
  let plan: Plan;
  if (s.live) {
    const budget = budgetStatus();
    const model = budget.state === "ok" ? cfg.models.reasoning : cfg.models.fast;
    if (model !== cfg.models.reasoning) note(s, "info", "router", `Budget at ${Math.round(budget.ratio * 100)}% — planning with the cheaper model ${model}.`);
    const memo = listMemories().filter((m) => m.kind === "note").slice(0, 5);
    const { value, calls } = await callModelJson(PlanSchema, {
      taskId: s.taskId, purpose: "plan", model, maxTokens: 800,
      messages: [
        { role: "system", content: plannerPrompt() },
        { role: "user", content: `${memo.length ? `User notes:\n${memo.map((m) => `- ${m.content}`).join("\n")}\n\n` : ""}Request: ${prompt}` },
      ],
    });
    s.modelCalls.push(...calls);
    plan = value;
    note(s, "model", "planner", `Model planned ${plan.steps.length} step(s): ${plan.steps.map((x) => x.tool).join(" → ") || "none"}.`);
  } else {
    plan = demoPlan(prompt, s.day);
    s.standInCalls++;
    note(s, "info", "planner", `Demo stand-in planner (keyword rules, no inference): ${plan.steps.map((x) => x.tool).join(" → ") || "no supported steps"}.`);
  }
  if (!plan.supported || plan.steps.length === 0) return { plan, status: "unsupported", error: "Noctua's sample workspace has no tools for this request." };

  for (const raw of enforceGuard(plan.steps, s)) {
    const step = TOOLS[raw.tool]?.risk === "irreversible" ? { ...raw, args: resolveRecipient(raw.args, s) } : raw;
    const r = await invokeTool(s, step.tool, step.args, { kind: "planner", taint: [] });
    if (r.decision.decision !== "allow" && TOOLS[step.tool]?.risk === "irreversible") {
      s.actions.push({ tool: step.tool, args: step.args, decision: r.decision.decision, rule: r.decision.rule, reason: r.decision.reason, approvalId: r.decision.approvalId, origin: { kind: "planner", taint: [] } });
    } else if (r.decision.decision !== "allow") {
      return { plan, status: "failed", error: `Plan step ${step.tool} rejected: ${r.decision.reason}` };
    }
    if (r.error) return { plan, status: "failed", error: `${step.tool}: ${r.error}` };
    // Actions the model proposed after reading untrusted mail are tainted and go through policy individually.
    const proposed = (r.output as { proposed?: { tool: string; args: unknown }[] } | undefined)?.proposed ?? [];
    for (const p of proposed) {
      const origin = { kind: "model" as const, taint: s.taint };
      const pr = await invokeTool(s, p.tool, p.args, origin);
      s.actions.push({ tool: p.tool, args: p.args, decision: pr.decision.decision, rule: pr.decision.rule, reason: pr.decision.reason, approvalId: pr.decision.approvalId, origin });
    }
  }
  // A request that only asks for an action (e.g. "forward X") is complete once policy has decided on it.
  if (!s.items && s.actions.length === 0) return { plan, status: "failed", error: "The plan finished without triaging the inbox." };
  return { plan, status: "done" };
}

export type RunOutcome = { taskId: string; status: TaskStatus };

export async function runTask(input: z.infer<typeof TaskInput>): Promise<RunOutcome> {
  const live = isLive();
  const taskId = id("tsk");
  const memories = listMemories();
  const vipMems = memories.filter((m) => m.kind === "vip");
  const s = newState(taskId, input.day, live, new Set(vipMems.map((m) => m.content)));
  db().prepare(`INSERT INTO tasks(id, created_at, prompt, workspace_day, status, tier, intent_key, mode) VALUES(?, ?, ?, ?, 'running', 'apprentice', 'pending', ?)`)
    .run(taskId, nowIso(), input.prompt, input.day, live ? "live" : "demo");

  let tier: Tier = "apprentice";
  let skill: Skill | null = null;
  let fallback: string | null = null;
  let status: TaskStatus = "done";
  let error: string | null = null;
  let plan: Plan | null = null;
  let coverage: number | null = null;
  let matched: TaskResult["matched"];
  let apprenticeFrom = 0; // trace index where the Apprentice path began (after any failed skill run)

  try {
    const m = input.route === "auto" ? findSkillFor(input.prompt) : null;
    if (m) {
      matched = { skillId: m.skill.id, version: m.skill.version, overlap: m.overlap, shared: m.shared };
      note(s, "info", "router", `Matched verified skill "${m.skill.name}" v${m.skill.version} (${Math.round(m.overlap * 100)}% term overlap, ${m.shared} shared terms).`);
      if (!verifySkillSignature(m.skill, s)) {
        setSkillState(m.skill.id, "suspended", "Signature verification failed at run time; the stored artifact changed after evaluation.");
        fallback = "Matched skill failed signature verification and was suspended.";
      } else if (m.skill.tier === "journeyman" && live && budgetStatus().state === "exhausted") {
        fallback = "Journeyman skill needs a model call but the daily budget is exhausted.";
      } else {
        skill = m.skill;
        tier = m.skill.tier;
        const r = await executeSkill(m.skill, s);
        coverage = r.coverage;
        if (!r.ok) {
          setSkillState(m.skill.id, "demoted", `Demoted after task ${taskId}: ${r.invariantFailures.join(" ")}`);
          note(s, "fallback", "router", `Skill demoted — ${r.invariantFailures.join(" ")}`);
          fallback = `Skill v${m.skill.version} failed at run time and was demoted: ${r.invariantFailures.join(" ")}`;
          skill = null;
          tier = "apprentice";
          coverage = null;
          Object.assign(s, { emails: null, items: null, digest: null, flags: new Map(), taint: [] });
        }
      }
    }

    if (!skill) {
      const budget = budgetStatus();
      if (live && budget.state === "exhausted") {
        status = "deferred";
        error = "Daily model budget reached. The task was deferred; re-run it tomorrow or raise the limit in Settings.";
        note(s, "info", "router", error);
      } else {
        if (fallback) note(s, "fallback", "router", "Falling back to the Apprentice path (full reasoning).");
        apprenticeFrom = s.trace.length;
        const r = await runApprentice(s, input.prompt);
        plan = r.plan;
        status = r.status;
        error = r.error ?? null;
      }
    }
  } catch (e) {
    status = e instanceof BudgetError ? "deferred" : "failed";
    error = e instanceof BudgetError ? `${e.message} The task was deferred.`
      : e instanceof ModelOutputError ? `${e.message}. Nothing was executed from the invalid output.`
      : e instanceof ProviderError ? `Model provider error (${e.kind}): ${e.message}`
      : (e as Error).message;
    note(s, "error", "task", error);
    const extra = (e as { calls?: ExecState["modelCalls"] }).calls;
    if (extra) s.modelCalls.push(...extra);
  }

  const toolsUsed = s.trace.slice(apprenticeFrom).filter((t) => t.kind === "tool" || t.kind === "model").map((t) => t.name);
  const result: TaskResult = { items: s.items ?? [], digest: s.digest, actions: s.actions, coverage, standInCalls: s.standInCalls, planGoal: plan?.goal ?? null, matched };
  saveTask(taskId, {
    status, tier, skill_id: skill?.id ?? null,
    intent_key: skill ? skill.family : familyOf(toolsUsed),
    plan_json: plan ? JSON.stringify(plan) : null,
    result_json: JSON.stringify(result),
    trace_json: JSON.stringify(s.trace),
    error, latency_ms: Date.now() - s.started, fallback_reason: fallback,
    memory_ids: JSON.stringify(vipMems.filter((v) => (s.emails ?? []).some((e) => e.from.toLowerCase() === v.content)).map((v) => v.id)),
  });
  return { taskId, status };
}

// ---------------- Approvals ----------------

export async function decideApproval(approvalId: string, approve: boolean): Promise<{ status: string; detail: string }> {
  const a = db().prepare("SELECT * FROM approvals WHERE id = ?").get(approvalId) as Record<string, string> | undefined;
  if (!a) throw new Error("Approval not found.");
  if (a.status !== "pending") throw new Error(`This approval is already ${a.status}.`);
  if (!approve) {
    db().prepare("UPDATE approvals SET status = 'denied', decided_at = ? WHERE id = ?").run(nowIso(), approvalId);
    return { status: "denied", detail: "Action discarded." };
  }
  db().prepare("UPDATE approvals SET status = 'approved', decided_at = ? WHERE id = ?").run(nowIso(), approvalId);
  const task = db().prepare("SELECT trace_json, workspace_day, mode FROM tasks WHERE id = ?").get(a.task_id) as Record<string, string> | undefined;
  const s = newState(a.task_id, Number(task?.workspace_day ?? 1), task?.mode === "live");
  // The policy engine re-checks everything (recipient, risk budget, exact-args binding) at execution time.
  const r = await invokeTool(s, a.tool, json(a.args_json, {}), { kind: "user", taint: [] }, approvalId, "approval");
  const detail = r.decision.decision === "allow" ? (r.error ? `Approved but failed: ${r.error}` : "Executed in the sample workspace (local outbox — not delivered).") : r.decision.reason;
  if (r.decision.decision !== "allow") db().prepare("UPDATE approvals SET status = 'denied', result = ? WHERE id = ? AND status = 'approved'").run(detail, approvalId);
  else db().prepare("UPDATE approvals SET result = ? WHERE id = ?").run(detail, approvalId);
  if (task) {
    const trace = [...json<unknown[]>(task.trace_json, []), ...s.trace];
    db().prepare("UPDATE tasks SET trace_json = ? WHERE id = ?").run(JSON.stringify(trace), a.task_id);
  }
  return { status: r.decision.decision === "allow" ? "executed" : "blocked", detail };
}

export { getSkill };
