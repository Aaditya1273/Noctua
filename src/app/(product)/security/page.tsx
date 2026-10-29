import type { Metadata } from "next";
import { AttackRunner } from "@/components/actions";
import { Card, CardHeader, DecisionBadge, Empty, Mono, PageHeader, PassFail, Stat, when } from "@/components/ui";
import { getLimits } from "@/lib/accounting.ts";
import { latestAttackRun } from "@/lib/attacks.ts";
import { isLive } from "@/lib/config.ts";
import { riskRemaining, riskSpentToday } from "@/lib/policy.ts";
import { listSecurityEvents, outbox } from "@/lib/receipts.ts";
import { TOOLS } from "@/lib/tools.ts";

export const metadata: Metadata = { title: "Security lab" };

const RULES = [
  ["P1", "Unknown tool", "Anything not in the registry is denied."],
  ["P2", "Invalid arguments", "Strict schemas; unknown fields are rejected."],
  ["P3", "Tool outputs are data", "A tool result can never invoke another tool."],
  ["P4", "Low risk", "Read-only and local reversible operations are allowed."],
  ["P5", "Skills cannot act", "Learned skills never perform irreversible actions."],
  ["P6", "No integration", "Irreversible tools without a sample implementation are disabled."],
  ["P7", "Trusted recipients only", "Recipients must be in your trusted contacts or your own domain."],
  ["P8", "Irreversibility budget", "Each irreversible action costs risk points from a daily balance."],
  ["P9–P11", "Bound approvals", "An approval covers one exact action (SHA-256 of tool + arguments) and is consumed on use."],
  ["P12", "Approval required", "Every irreversible action waits for an explicit user decision."],
];

export default function SecurityPage() {
  const run = latestAttackRun();
  const events = listSecurityEvents(40);
  const sent = outbox();
  const limits = getLimits();
  const irreversible = Object.values(TOOLS).filter((t) => t.risk === "irreversible");
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-16 pt-16 sm:px-8 lg:pt-10">
      <PageHeader title="Security lab" lead="Email, web pages and tool results are untrusted. Enforcement lives in a server-side policy engine that every tool call passes through — the model is never the security mechanism." actions={<AttackRunner live={isLive()} />} />

      <Card className="mb-6">
        <CardHeader title="Attack Night" meta={run ? `Last run ${when(run.createdAt)} · deterministic adversarial fixtures against the real policy engine and evaluator` : "Not run yet. Results are only shown after the suite actually runs."}
          action={run && <PassFail passed={run.passed === run.total} label={`${run.passed}/${run.total} passed`} />} />
        {!run ? <Empty title="No results yet.">Run the suite to test email injection, web-page overrides, poisoned tool output, risk-budget overflow, malformed calls, approval replay, skill tampering and skill-initiated actions.</Empty> : (
          <ul className="divide-y divide-line">
            {run.results.map((r) => (
              <li key={r.id} className="px-5 py-4">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                    <span className="text-[14px] font-medium text-ink">{r.title}{r.live && <span className="ml-2 text-[11.5px] uppercase tracking-wide text-info">live model</span>}</span>
                    <PassFail passed={r.passed} />
                  </summary>
                  <dl className="mt-3 grid gap-3 text-[13px] md:grid-cols-2">
                    <div><dt className="font-medium text-ink">Attack</dt><dd className="mt-0.5 text-muted">{r.attack}</dd></div>
                    <div><dt className="font-medium text-ink">Expected</dt><dd className="mt-0.5 text-muted">{r.expected}</dd></div>
                    <div><dt className="font-medium text-ink">Observed</dt><dd className="mt-0.5 text-muted">{r.actual}</dd></div>
                    <div><dt className="font-medium text-ink">Explanation</dt><dd className="mt-0.5 text-muted">{r.explanation}</dd></div>
                  </dl>
                  {r.trace.length > 0 && (
                    <ol className="mt-3 space-y-1 rounded-lg bg-sunk/70 p-3 font-mono text-[11.5px] text-ink-2">
                      {r.trace.map((e, i) => <li key={i} className="break-words">{e.kind} {e.name}{e.decision ? ` [${e.decision}${e.rule ? ` ${e.rule}` : ""}]` : ""}: {e.detail}</li>)}
                    </ol>
                  )}
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Irreversibility budget" meta="Separate from money. Attack Night uses a simulated balance and never spends these points." />
          <dl className="grid grid-cols-2 gap-4 px-5 py-5">
            <Stat label="Remaining today" value={riskRemaining()} tone={riskRemaining() === 0 ? "danger" : "accent"} note={`of ${limits.dailyRiskPoints} points`} />
            <Stat label="Spent today" value={riskSpentToday()} />
          </dl>
          <ul className="border-t border-line px-5 py-3 text-[13px] text-muted">
            {irreversible.map((t) => <li key={t.name} className="flex justify-between py-1"><Mono>{t.name}</Mono><span>{t.riskCost} pts{t.simulatedInSample ? " · local outbox only" : " · disabled"}</span></li>)}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Policy rules" meta="Evaluated in order; the first matching rule decides." />
          <ul className="divide-y divide-line">
            {RULES.map(([id, t, d]) => <li key={id} className="grid grid-cols-[56px_1fr] gap-2 px-5 py-2.5 text-[13px]"><span className="font-mono text-muted">{id}</span><span><span className="font-medium text-ink">{t}.</span> <span className="text-muted">{d}</span></span></li>)}
          </ul>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader title="Security decisions" meta="Denials, approval requests and charged actions, newest first." />
        {events.length === 0 ? <Empty title="No notable decisions yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="text-[12px] uppercase tracking-wide text-muted"><tr className="border-b border-line">{["When", "Source", "Tool", "Decision", "Reason"].map((h) => <th key={h} className="px-5 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {events.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-2.5 text-muted">{when(e.createdAt)}</td>
                    <td className="px-5 py-2.5 text-muted">{e.source}{e.provenance.taint.length ? <span className="block text-[11.5px]">tainted: {e.provenance.taint.join(", ")}</span> : null}</td>
                    <td className="px-5 py-2.5 font-mono text-[12px]">{e.tool}</td>
                    <td className="px-5 py-2.5"><DecisionBadge decision={e.decision} /><span className="mt-1 block font-mono text-[11px] text-muted">{e.rule}</span></td>
                    <td className="min-w-[220px] px-5 py-2.5 text-muted">{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Local outbox" meta="Approved sends in the sample workspace are written here. Nothing is delivered — there is no mail integration." />
        {sent.length === 0 ? <Empty title="Empty." /> : (
          <ul className="divide-y divide-line">{sent.map((o) => <li key={o.id} className="px-5 py-3 text-[13px]"><p className="text-ink">To {o.recipient} · {o.subject}</p><p className="mt-0.5 text-muted">{o.body}</p><p className="mt-0.5 text-[12px] text-muted">{when(o.created_at)} · not delivered</p></li>)}</ul>
        )}
      </Card>
    </div>
  );
}
