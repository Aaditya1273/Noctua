// Central policy engine. invokeTool() calls decide() immediately before every tool execution;
// the model is never the security mechanism. Every decision is persisted as a security event.
import crypto from "node:crypto";
import { getLimits } from "./accounting.ts";
import { db, id, nowIso, startOfDayIso, tx } from "./db.ts";
import { LISTING, OWNER_PRIVATE, SAMPLE_OWNER } from "./fixtures.ts";
import { trustedContacts } from "./memory.ts";
import type { ToolDef } from "./tools.ts";

export type OriginKind = "user" | "planner" | "model" | "skill" | "tool_output" | "system";
/** Where a tool call came from, and which untrusted sources were in the context that produced it. */
export type Origin = { kind: OriginKind; taint: string[] };

export type DecisionKind = "allow" | "deny" | "require_approval";
export type Decision = { decision: DecisionKind; rule: string; reason: string; riskCost: number; approvalId?: string; eventId: string };

export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

export const argsHash = (tool: string, args: unknown) => crypto.createHash("sha256").update(`${tool}\n${canonical(args)}`).digest("hex");

export function riskSpentToday(): number {
  const r = db().prepare("SELECT COALESCE(SUM(risk_cost), 0) AS s FROM security_events WHERE counted = 1 AND created_at >= ?").get(startOfDayIso()) as { s: number };
  return r.s;
}

export function riskRemaining(): number {
  return Math.max(0, getLimits().dailyRiskPoints - riskSpentToday());
}

function recipientsOf(tool: string, args: Record<string, unknown>): string[] {
  // Trusted-contact rule applies to email; marketplace replies go back into the existing buyer thread.
  return tool.startsWith("mail.") && typeof args.to === "string" ? [args.to.toLowerCase()] : [];
}

/** Outgoing free text of an action (what a recipient would actually read). */
function outgoingText(args: Record<string, unknown>): string {
  return [args.subject, args.body, args.text].filter((v) => typeof v === "string").join("\n");
}

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const STREET = /\b\d{1,5}\s+(?:[a-z]+\s){0,3}(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd|court|ct|way|place|pl)\b/i;

/** Private-data guard: the owner's home address (or any street address) never leaves in a message. */
export function containsPrivateAddress(text: string): boolean {
  return norm(text).includes(norm(OWNER_PRIVATE.homeAddress)) || STREET.test(text);
}

/** Dollar amounts below the seller's floor that the message would commit to. */
export function belowFloor(args: Record<string, unknown>): number[] {
  const amounts = [...outgoingText(args).matchAll(/\$\s?(\d+(?:\.\d{1,2})?)/g)].map((m) => Number(m[1]));
  if (typeof args.acceptPriceUsd === "number") amounts.push(args.acceptPriceUsd);
  return amounts.filter((a) => a < LISTING.floorUsd);
}

type Ctx = {
  taskId: string | null;
  source?: string;
  approvalId?: string;
  /** Attack Night only: evaluate against a hypothetical balance so tests never spend the real budget. */
  simulatedRiskRemaining?: number;
};

/**
 * Decide whether `tool` may run with `args`. `def` is null when the tool is not in the registry.
 * Rules are evaluated in order; the first match wins.
 */
export function decide(def: ToolDef | null, toolName: string, rawArgs: unknown, origin: Origin, ctx: Ctx): Decision & { args?: Record<string, unknown> } {
  return tx(() => {
    const log = (d: Omit<Decision, "eventId">, args: unknown, counted = false): Decision => {
      const eventId = id("sec");
      db().prepare(`INSERT INTO security_events(id, created_at, task_id, source, tool, decision, rule, reason, args_json, provenance_json, risk_cost, counted)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        eventId, nowIso(), ctx.taskId, ctx.source ?? "task", toolName, d.decision, d.rule, d.reason,
        JSON.stringify(args ?? null).slice(0, 4000), JSON.stringify(origin), d.riskCost, counted ? 1 : 0,
      );
      return { ...d, eventId };
    };

    if (!def) return log({ decision: "deny", rule: "P1-unknown-tool", reason: `"${toolName}" is not in the tool registry.`, riskCost: 0 }, rawArgs);
    const parsed = def.args.safeParse(rawArgs ?? {});
    if (!parsed.success) {
      const issue = parsed.error.issues.slice(0, 2).map((i) => `${i.path.join(".") || "(args)"}: ${i.message}`).join("; ");
      return log({ decision: "deny", rule: "P2-invalid-arguments", reason: `Arguments failed validation (${issue}).`, riskCost: 0 }, rawArgs);
    }
    const args = parsed.data as Record<string, unknown>;
    if (origin.kind === "tool_output")
      return log({ decision: "deny", rule: "P3-tool-output-cannot-invoke", reason: "Tool outputs are data; they can never trigger another tool call.", riskCost: 0 }, args);

    if (def.risk !== "irreversible") {
      return { ...log({ decision: "allow", rule: "P4-low-risk", reason: `${def.risk === "read" ? "Read-only" : "Local, reversible"} operation.`, riskCost: 0 }, args), args };
    }

    // ---- Irreversible actions ----
    if (origin.kind === "skill")
      return log({ decision: "deny", rule: "P5-skills-cannot-act", reason: "Learned skills may never perform irreversible actions.", riskCost: def.riskCost }, args);
    if (!def.simulatedInSample)
      return log({ decision: "deny", rule: "P6-disabled-in-sample", reason: `${def.name} is disabled: the sample workspace has no real integration for it.`, riskCost: def.riskCost }, args);
    const trusted = trustedContacts();
    const ownDomain = SAMPLE_OWNER.email.split("@")[1];
    const text = outgoingText(args);
    if (text && containsPrivateAddress(text))
      return log({ decision: "deny", rule: "P13-private-data", reason: "The message would reveal a home address. Private data never leaves in a message, whoever asks and whatever was approved.", riskCost: def.riskCost }, args);
    if (def.name === "marketplace.reply") {
      const low = belowFloor(args);
      if (low.length)
        return log({ decision: "deny", rule: "P14-below-floor", reason: `The reply would commit to $${Math.min(...low)}, below your floor of $${LISTING.floorUsd}.`, riskCost: def.riskCost }, args);
    }
    const untrusted = recipientsOf(def.name, args).filter((r) => !trusted.has(r) && r.split("@")[1] !== ownDomain);
    if (untrusted.length)
      return log({ decision: "deny", rule: "P7-untrusted-recipient", reason: `Recipient ${untrusted.join(", ")} is not a trusted contact.${origin.taint.length ? ` The request came from a model that had read untrusted content (${origin.taint.join(", ")}).` : ""}`, riskCost: def.riskCost }, args);
    const remaining = ctx.simulatedRiskRemaining ?? riskRemaining();
    if (def.riskCost > remaining)
      return log({ decision: "deny", rule: "P8-risk-budget", reason: `Costs ${def.riskCost} risk points; only ${remaining} remain today.`, riskCost: def.riskCost }, args);

    const hash = argsHash(def.name, args);
    if (ctx.approvalId) {
      const a = db().prepare("SELECT * FROM approvals WHERE id = ?").get(ctx.approvalId) as Record<string, string> | undefined;
      if (!a || a.status !== "approved")
        return log({ decision: "deny", rule: "P9-approval-invalid", reason: "No valid, unused approval for this action.", riskCost: def.riskCost }, args);
      if (a.args_hash !== hash || a.tool !== def.name)
        return log({ decision: "deny", rule: "P10-approval-mismatch", reason: "The approval was granted for different arguments; approvals are bound to the exact action.", riskCost: def.riskCost }, args);
      db().prepare("UPDATE approvals SET status = 'consumed', decided_at = ? WHERE id = ?").run(nowIso(), a.id);
      return { ...log({ decision: "allow", rule: "P11-approved", reason: `Explicitly approved by the user; ${def.riskCost} risk points charged.`, riskCost: def.riskCost }, args, ctx.simulatedRiskRemaining === undefined), args };
    }
    const existing = db().prepare("SELECT id FROM approvals WHERE task_id = ? AND args_hash = ? AND status = 'pending'").get(ctx.taskId ?? "", hash) as { id: string } | undefined;
    const approvalId = existing?.id ?? id("apr");
    if (!existing)
      db().prepare("INSERT INTO approvals(id, created_at, task_id, tool, args_hash, args_json, status) VALUES(?, ?, ?, ?, ?, ?, 'pending')")
        .run(approvalId, nowIso(), ctx.taskId ?? "", def.name, hash, JSON.stringify(args));
    return log({ decision: "require_approval", rule: "P12-needs-approval", reason: `Irreversible action (${def.riskCost} risk points). It will not run without your explicit approval.`, riskCost: def.riskCost, approvalId }, args);
  });
}
