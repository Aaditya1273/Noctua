import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApprovalButtons, LearnWorkflow, RunAgain } from "@/components/actions";
import { Badge, Card, CardHeader, DecisionBadge, Empty, Mono, Notice, PageHeader, SampleBadge, Stat, StatusBadge, TierBadge, cx, int, ms, usd, when } from "@/components/ui";
import { isLive } from "@/lib/config.ts";
import { listMemories } from "@/lib/memory.ts";
import { getTask } from "@/lib/receipts.ts";
import { getSkill } from "@/lib/skills.ts";
import type { TriageItem } from "@/lib/triage.ts";

export const metadata: Metadata = { title: "Task" };

const GROUPS: { key: TriageItem["category"]; title: string; tone: "danger" | "warn" | "neutral" | "info" }[] = [
  { key: "urgent", title: "Urgent", tone: "danger" },
  { key: "needs_reply", title: "Needs a reply", tone: "warn" },
  { key: "suspicious", title: "Quarantined", tone: "danger" },
  { key: "routine", title: "Routine", tone: "neutral" },
  { key: "fyi", title: "For information", tone: "info" },
];

const KIND_STYLE: Record<string, string> = {
  tool: "bg-ink-2", model: "bg-info", policy: "bg-warn", info: "bg-line-strong", fallback: "bg-warn", error: "bg-danger",
};

export default async function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  const { id } = await params;
  const t = getTask(id);
  if (!t) notFound();
  const r = t.receipt;
  const skill = t.skillId ? getSkill(t.skillId) : null;
  const items = t.result?.items ?? [];
  const memories = listMemories().filter((m) => t.memoryIds.includes(m.id));
  const pending = t.approvals.filter((a) => a.status === "pending");
  const tokens = r.promptTokens === null || r.completionTokens === null ? null : r.promptTokens + r.completionTokens;

  return (
    <div>
      <PageHeader
        title={t.tier === "master" ? "Completed without inference" : t.status === "done" ? "Task completed" : t.status === "deferred" ? "Task deferred" : t.status === "unsupported" ? "Not supported" : "Task failed"}
        lead={<span className="text-ink-2">&ldquo;{t.prompt}&rdquo;</span>}
        actions={<RunAgain prompt={t.prompt} day={t.day} />}
      />
      <div className="mb-6 flex flex-wrap items-center gap-2 text-[13px] text-muted">
        <TierBadge tier={t.tier} /><StatusBadge status={t.status} />
        <Badge tone={t.mode === "live" ? "accent" : "warn"}>{t.mode === "live" ? "Live inference" : "Demo mode"}</Badge>
        <SampleBadge />
        <span>Day {t.day} inbox · {when(t.createdAt)} · <Mono>{t.id}</Mono></span>
      </div>

      <div className="space-y-6">
        {t.error && <Notice tone={t.status === "deferred" ? "warn" : "danger"} title={t.status === "deferred" ? "Budget limit reached" : t.status === "unsupported" ? "Outside what this workspace can do" : "The task did not complete"}>{t.error}</Notice>}
        {t.fallback && <Notice tone="warn" title="Fallback recorded">{t.fallback} {t.tier === "apprentice" && "The task was re-run on the Apprentice path; its model usage is on this receipt."}</Notice>}
        {skill && (
          <Notice tone="info" title={`Executed by verified skill "${skill.name}" v${skill.version}`}>
            Signature verified before execution. Matched with {Math.round((t.result?.matched?.overlap ?? 0) * 100)}% term overlap. <Link className="underline" href={`/skills/${skill.id}`}>Inspect the skill</Link>.
          </Notice>
        )}

        <Card>
          <CardHeader title="Receipt" meta={r.costNote} />
          <dl className="grid grid-cols-2 gap-6 px-5 py-5 lg:grid-cols-5">
            <Stat label="Execution path" value={<TierBadge tier={t.tier} />} note={t.tier === "master" ? "Deterministic skill" : t.tier === "journeyman" ? "Skill + model step" : "Model planned and executed"} />
            <Stat label="Model calls" value={r.modelCalls} tone={r.inferenceAvoided ? "accent" : undefined} note={r.standInCalls ? `${r.standInCalls} model step(s) satisfied by demo stand-in — no inference` : r.models.length ? r.models.join(", ") : "None"} />
            <Stat label="Tokens (in / out)" value={r.modelCalls ? `${int(r.promptTokens)} / ${int(r.completionTokens)}` : "0"} note={r.modelCalls ? (tokens === null ? "Provider did not report usage" : "Reported by the API") : undefined} />
            <Stat label="Model cost" value={usd(r.costUsd)} note={r.retries ? `${r.retries} retr${r.retries > 1 ? "ies" : "y"} included` : undefined} />
            <Stat label="Latency" value={ms(t.latencyMs)} note={`${r.toolCalls} tool call${r.toolCalls === 1 ? "" : "s"}`} />
          </dl>
          {r.baseline && (
            <div className="border-t border-line px-5 py-4 text-[13.5px]">
              <p className="font-medium text-ink">Compared with the Apprentice baseline</p>
              <p className="mt-1 text-muted">{r.baseline.label}: {r.baseline.avgModelCalls === null ? "unknown" : r.baseline.avgModelCalls.toFixed(1)} model call(s), {r.baseline.avgTokens === null ? "tokens unknown" : `${Math.round(r.baseline.avgTokens).toLocaleString()} tokens`}, {r.baseline.avgCostUsd === null ? "cost unknown" : `${usd(r.baseline.avgCostUsd)} per run`}.</p>
              {r.baseline.avgCostUsd !== null && r.costUsd !== null && <p className="mt-1 font-medium text-accent">Measured model spend avoided on this run: {usd(Math.max(0, r.baseline.avgCostUsd - r.costUsd))}. (Hosting and other running costs are not included.)</p>}
            </div>
          )}
          {memories.length > 0 && <p className="border-t border-line px-5 py-3 text-[13px] text-muted">Memory used: {memories.map((m) => m.content).join(", ")} (VIP sender preference).</p>}
        </Card>

        {pending.length > 0 && (
          <Card className="border-[#ecd6ad]">
            <CardHeader title="Waiting for your approval" meta="The policy engine allowed these to be proposed but not executed. Approving re-checks recipient, risk budget and exact arguments." />
            <ul className="divide-y divide-line">
              {pending.map((a) => (
                <li key={a.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]">
                  <div className="min-w-0 text-[13.5px]">
                    <p><Mono>{a.tool}</Mono></p>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-sunk p-3 font-mono text-[12px] text-ink-2">{JSON.stringify(a.args, null, 2)}</pre>
                  </div>
                  <ApprovalButtons approvalId={a.id} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {(t.result?.actions.length ?? 0) > 0 && (
          <Card>
            <CardHeader title="Proposed actions and policy decisions" />
            <ul className="divide-y divide-line">
              {t.result!.actions.map((a, i) => (
                <li key={i} className="flex flex-col gap-2 px-5 py-3.5 text-[13.5px] sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p><Mono>{a.tool}</Mono> <span className="text-muted">→ {(a.args as { to?: string })?.to ?? JSON.stringify(a.args).slice(0, 80)}</span></p>
                    <p className="mt-1 text-muted">{a.reason}</p>
                    <p className="mt-1 text-[12px] text-muted">Origin: {a.origin.kind}{a.origin.taint.length ? ` · context contained untrusted ${a.origin.taint.join(", ")}` : ""} · rule {a.rule}</p>
                  </div>
                  <DecisionBadge decision={a.decision} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {t.result?.digest && (
          <Card>
            <CardHeader title="Digest" action={<SampleBadge />} />
            <div className="space-y-1.5 px-5 py-4 text-[14px] leading-relaxed text-ink-2">
              {t.result.digest.split("\n").map((l, i) => <p key={i} className={i === 0 ? "font-medium text-ink" : ""}>{l}</p>)}
            </div>
          </Card>
        )}

        {items.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            {GROUPS.map((g) => {
              const list = items.filter((i) => i.category === g.key);
              if (!list.length) return null;
              return (
                <Card key={g.key} className={cx(g.key === "urgent" || g.key === "needs_reply" ? "lg:col-span-2" : "")}>
                  <CardHeader title={<span className="flex items-center gap-2">{g.title} <Badge tone={g.tone}>{list.length}</Badge></span>} />
                  <ul className="divide-y divide-line">
                    {list.map((i) => (
                      <li key={i.id} className="px-5 py-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-[14px] font-medium text-ink">{i.subject}</p>
                          <p className="text-[12px] text-muted">{i.fromName} · {i.from}</p>
                        </div>
                        <p className="mt-1 text-[13.5px] text-ink-2">{i.summary}</p>
                        {i.flags.length > 0 && <p className="mt-2 text-[12.5px] text-danger">Injection guard: {i.flags.join(", ")}. Content treated as data; no reply drafted, no action taken.</p>}
                        {i.reply && (
                          <details className="mt-2 group">
                            <summary className="cursor-pointer text-[13px] font-medium text-accent">Suggested reply (draft — not sent)</summary>
                            <p className="mt-2 whitespace-pre-wrap rounded-lg border border-line bg-sunk/60 p-3 text-[13.5px] leading-relaxed text-ink-2">{i.reply}</p>
                          </details>
                        )}
                        <p className="mt-2 text-[11.5px] text-muted">
                          Basis: {i.basis === "model" ? "model output (validated)" : i.basis === "reference" ? "demo stand-in (reference annotation)" : i.basis === "rules" ? `learned rules${i.matched.length ? ` · matched ${i.matched.slice(0, 5).join(", ")}` : " · no rule matched (fallback)"}` : "injection guard override"}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}

        {t.tier === "apprentice" && t.status === "done" && t.family.includes("triage.llm") && (
          <Card>
            <CardHeader title="Learn this workflow" meta="Noctua turns every successful Apprentice run of this task into a candidate skill. It only runs after it passes evaluation." />
            <div className="px-5 py-5"><LearnWorkflow taskId={t.id} live={isLive()} /></div>
          </Card>
        )}

        <Card>
          <CardHeader title="Execution trace" meta="Every tool call passed the policy engine. Times are relative to the start of the task." />
          {t.trace.length === 0 ? <Empty title="No steps recorded." /> : (
            <ol className="px-5 py-4">
              {t.trace.map((e, i) => (
                <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
                  <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", KIND_STYLE[e.kind] ?? "bg-line-strong")} aria-hidden />
                  <div className="min-w-0 text-[13px]">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[12.5px] text-ink">{e.name}</span>
                      <span className="text-[11.5px] uppercase tracking-wide text-muted">{e.kind}</span>
                      {e.decision && <DecisionBadge decision={e.decision} />}
                      <span className="text-[11.5px] tabular-nums text-muted">+{e.t} ms</span>
                    </p>
                    <p className="mt-0.5 break-words text-muted">{e.detail}{e.rule ? ` (${e.rule})` : ""}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {t.usage.length > 0 && (
          <Card>
            <CardHeader title="Model calls" meta="Provider: Nebius Token Factory (OpenAI-compatible API)." />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead className="text-[12px] uppercase tracking-wide text-muted"><tr className="border-b border-line">{["Purpose", "Model", "Status", "In", "Out", "Cost", "Latency", "Attempts"].map((h) => <th key={h} className="px-5 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-line">
                  {t.usage.map((u) => (
                    <tr key={u.id}>
                      <td className="px-5 py-2.5">{u.purpose}</td><td className="px-5 py-2.5 font-mono text-[12px]">{u.model}</td>
                      <td className="px-5 py-2.5">{u.status === "ok" ? "ok" : <span className="text-danger" title={u.error ?? ""}>{u.status}</span>}</td>
                      <td className="px-5 py-2.5 tabular-nums">{int(u.promptTokens)}</td><td className="px-5 py-2.5 tabular-nums">{int(u.completionTokens)}</td>
                      <td className="px-5 py-2.5 tabular-nums">{usd(u.costUsd, 6)}</td><td className="px-5 py-2.5 tabular-nums">{ms(u.latencyMs)}</td><td className="px-5 py-2.5 tabular-nums">{u.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
