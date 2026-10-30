import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvaluateButton, SkillStateButton } from "@/components/actions";
import { Badge, Card, CardHeader, Empty, Mono, Notice, PageHeader, PassFail, SkillStateBadge, Stat, TierBadge, ms, when } from "@/components/ui";
import { db } from "@/lib/db.ts";
import { listEvaluations } from "@/lib/evaluator.ts";
import { publicKeyPem } from "@/lib/signing.ts";
import { getSkill, listSkills, verifySkillSignature } from "@/lib/skills.ts";
import { TOOLS } from "@/lib/tools.ts";

export const metadata: Metadata = { title: "Skill" };

export default async function SkillPage({ params }: PageProps<"/skills/[id]">) {
  const { id } = await params;
  const skill = getSkill(id);
  if (!skill) notFound();
  const m = skill.manifest;
  const evals = listEvaluations(skill.id);
  const latest = evals[0]?.report;
  const versions = listSkills().filter((s) => s.family === skill.family);
  const sigOk = skill.signature ? verifySkillSignature(skill) : null;
  const runs = db().prepare("SELECT COUNT(*) AS n, AVG(latency_ms) AS lat, SUM(status = 'done') AS ok FROM tasks WHERE skill_id = ?").get(skill.id) as { n: number; lat: number | null; ok: number | null };
  const runCalls = (db().prepare("SELECT COUNT(*) AS n FROM usage WHERE task_id IN (SELECT id FROM tasks WHERE skill_id = ?)").get(skill.id) as { n: number }).n;
  const rules = (m.steps.find((s) => s.tool === "triage.rules")?.args as { rules?: { category: string; keywords: string[] }[] } | undefined)?.rules ?? [];

  return (
    <PageHeader crumb={{ href: "/skills", label: "Skills" }} title={`${skill.name} · v${skill.version}`} lead={skill.description}
        actions={<>
          {(skill.state === "candidate") && <EvaluateButton skillId={skill.id} />}
          {skill.state === "verified" && <SkillStateButton skillId={skill.id} action="suspend" />}
          {["suspended", "demoted", "rejected"].includes(skill.state) && <SkillStateButton skillId={skill.id} action="reinstate" />}
        </>}>
      <div className="mb-6 flex flex-wrap items-center gap-2"><SkillStateBadge state={skill.state} /><TierBadge tier={skill.tier} /><span className="text-[13px] text-muted">Created {when(skill.createdAt)} · {skill.synthesis}</span></div>

      <div className="space-y-6">
        {skill.state === "candidate" && <Notice tone="info" title="Not yet trusted">This candidate cannot run until it passes evaluation: schema, allowlist, ordering, trace replay, held-out golden set, urgent and suspicious recall, injection containment, invariants{skill.tier === "master" ? " and determinism" : ""}.</Notice>}
        {skill.state === "rejected" && <Notice tone="danger" title="This skill failed verification. It has not been promoted.">{skill.stateReason}</Notice>}
        {skill.state === "demoted" && <Notice tone="danger" title="Demoted">{skill.stateReason} Re-verifying runs the full evaluation again; consider learning a new version from more runs instead.</Notice>}
        {skill.state === "suspended" && <Notice tone="warn" title="Suspended">{skill.stateReason}</Notice>}

        {latest && (
          <Card>
            <CardHeader title={!latest.promoted ? "Evaluation failed" : skill.state === "verified" ? "Evaluation passed" : `Last evaluation passed — skill since ${skill.state}`} meta={`${latest.passed} of ${latest.total} checks passed (${Math.round(latest.passRate * 100)}%) · ${when(latest.startedAt)} · ${ms(latest.durationMs)} · no model calls`}
              action={<PassFail passed={latest.promoted && skill.state === "verified"} label={!latest.promoted ? "Not promoted" : skill.state === "verified" ? "Promoted" : `Was promoted · now ${skill.state}`} />} />
            <p className="border-b border-line px-5 py-3 text-[13.5px] text-ink-2">{latest.outcome}</p>
            <ul className="divide-y divide-line">
              {latest.checks.map((c) => (
                <li key={c.id} className="px-5 py-3.5">
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                      <span className="text-[13.5px] text-ink">{c.title}{c.mandatory && <span className="ml-2 text-[11.5px] uppercase tracking-wide text-muted">mandatory</span>}</span>
                      <span className="flex items-center gap-3">
                        {c.metric && <span className="text-[12.5px] tabular-nums text-muted">{Math.round(c.metric.value * 100)}% (needs {Math.round(c.metric.threshold * 100)}%)</span>}
                        <PassFail passed={c.passed} />
                      </span>
                    </summary>
                    <p className="mt-2 text-[13px] text-muted">{c.detail}</p>
                    {c.cases && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full min-w-[520px] text-left text-[12.5px]">
                          <thead className="text-muted"><tr><th className="py-1 pr-3 font-medium">Input</th><th className="py-1 pr-3 font-medium">Expected</th><th className="py-1 pr-3 font-medium">Actual</th><th className="py-1 font-medium">Result</th></tr></thead>
                          <tbody>{c.cases.map((k) => <tr key={k.input} className="border-t border-line"><td className="py-1.5 pr-3">{k.input}</td><td className="py-1.5 pr-3">{k.expected}</td><td className="py-1.5 pr-3">{k.actual}</td><td className="py-1.5"><PassFail passed={k.passed} /></td></tr>)}</tbody>
                        </table>
                      </div>
                    )}
                  </details>
                </li>
              ))}
            </ul>
            {latest.notes.length > 0 && <p className="border-t border-line px-5 py-3 text-[12.5px] text-muted">{latest.notes.join(" ")}</p>}
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Definition" meta="Every step is a registry tool; arguments are validated by the tool's schema." />
            <ol className="divide-y divide-line">
              {m.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-3 text-[13px]">
                  <span className="mt-0.5 w-5 shrink-0 tabular-nums text-muted">{i + 1}</span>
                  <div className="min-w-0"><Mono>{s.tool}</Mono> {TOOLS[s.tool]?.usesModel && <Badge tone="warn">model step</Badge>}<p className="mt-1 text-muted">{TOOLS[s.tool]?.description ?? "Unknown tool"}</p></div>
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <CardHeader title="Learned rules" meta="Keywords induced from the recorded runs. Suspicious mail is handled by the fixed injection guard, never by learned rules." />
            {rules.length === 0 ? <Empty title="No learned rules in this version." /> : (
              <dl className="space-y-3 px-5 py-4">
                {rules.map((r) => (
                  <div key={r.category}>
                    <dt className="text-[12px] font-medium uppercase tracking-wide text-muted">{r.category.replace("_", " ")}</dt>
                    <dd className="mt-1 flex flex-wrap gap-1">{r.keywords.map((k) => <span key={k} className="rounded bg-sunk px-1.5 py-0.5 font-mono text-[11.5px] text-ink-2">{k}</span>)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title="Contract" />
          <dl className="grid gap-x-8 gap-y-4 px-5 py-5 text-[13px] md:grid-cols-2">
            <div><dt className="font-medium text-ink">Inputs</dt><dd className="mt-1 text-muted">workspaceDay: integer 1–3 (sample inbox)</dd></div>
            <div><dt className="font-medium text-ink">Outputs</dt><dd className="mt-1 text-muted">items: TriageItem[] · digest: string</dd></div>
            <div><dt className="font-medium text-ink">Security requirements</dt><dd className="mt-1 text-muted">Max risk: {m.security.maxRisk} · irreversible actions: {m.security.irreversibleActions} · required guard: {m.security.requiredGuards.join(", ")}</dd></div>
            <div><dt className="font-medium text-ink">Acceptance criteria</dt><dd className="mt-1 text-muted">Trace agreement ≥ {m.acceptance.minTraceAgreement * 100}% · golden accuracy ≥ {m.acceptance.minGoldenAccuracy * 100}% · urgent & suspicious recall 100%</dd></div>
            <div className="md:col-span-2"><dt className="font-medium text-ink">Runtime failure conditions</dt><dd className="mt-1"><ul className="list-disc space-y-0.5 pl-5 text-muted">{m.failureConditions.map((f) => <li key={f}>{f}</li>)}</ul></dd></div>
            <div><dt className="font-medium text-ink">Fixtures</dt><dd className="mt-1 text-muted">{m.fixtures.traceExamples.length} recorded labels from {new Set(m.fixtures.traceExamples.map((x) => x.day)).size} day(s) · held-out set {m.fixtures.goldenSet}</dd></div>
            <div><dt className="font-medium text-ink">Provenance</dt><dd className="mt-1 text-muted">Learned from {m.provenance.sourceTaskIds.map((tid, i) => <span key={tid}>{i > 0 && ", "}<Link className="underline" href={`/tasks/${tid}`}>{tid}</Link></span>)}</dd></div>
          </dl>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Measured execution" />
            <dl className="grid grid-cols-3 gap-4 px-5 py-5">
              <Stat label="Runs" value={runs.n} />
              <Stat label="Model calls" value={runCalls} tone={runs.n && !runCalls ? "accent" : undefined} />
              <Stat label="Avg latency" value={ms(runs.lat === null ? null : Math.round(runs.lat))} />
            </dl>
          </Card>
          <Card>
            <CardHeader title="Signature" meta="Ed25519 over the manifest and the SHA-256 of its evaluation report. Proves integrity on this installation — not safety." />
            <div className="px-5 py-4 text-[13px]">
              {skill.signature ? (
                <>
                  <PassFail passed={sigOk} label={sigOk ? "Signature verifies against the stored artifact" : "Signature does NOT verify — artifact changed"} />
                  <details className="mt-3"><summary className="cursor-pointer text-muted">Public key</summary><pre className="mt-2 overflow-x-auto rounded-lg bg-sunk p-3 font-mono text-[11px]">{publicKeyPem()}</pre></details>
                </>
              ) : <p className="text-muted">Unsigned. Only promoted versions are signed.</p>}
            </div>
          </Card>
        </div>

        {versions.length > 1 && (
          <Card>
            <CardHeader title="Version history" meta="Earlier versions and their evaluation records are kept." />
            <ul className="divide-y divide-line">
              {versions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[13.5px]">
                  <Link href={`/skills/${v.id}`} className={v.id === skill.id ? "font-medium" : "hover:underline"}>v{v.version}{v.id === skill.id && " (viewing)"}</Link>
                  <span className="flex gap-1.5"><TierBadge tier={v.tier} /><SkillStateBadge state={v.state} /></span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {evals.length > 1 && (
          <Card>
            <CardHeader title="Evaluation history" />
            <ul className="divide-y divide-line">
              {evals.map((e) => <li key={e.id} className="flex items-center justify-between px-5 py-3 text-[13px]"><span>{when(e.createdAt)}</span><span className="flex items-center gap-3 text-muted">{Math.round(e.passRate * 100)}% <PassFail passed={e.passed} /></span></li>)}
            </ul>
          </Card>
        )}
      </div>
    </PageHeader>
  );
}
