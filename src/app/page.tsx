import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { budgetStatus } from "@/lib/accounting.ts";
import { latestAttackRun } from "@/lib/attacks.ts";
import { riskRemaining } from "@/lib/policy.ts";
import { listTasks, pendingApprovals, savingsToday, todayCounts } from "@/lib/receipts.ts";
import { listSkills } from "@/lib/skills.ts";
import { BudgetMeter } from "@/components/budget";
import { Badge, ButtonLink, Card, CardHeader, Empty, PageHeader, PassFail, SampleBadge, SkillStateBadge, Stat, StatusBadge, TierBadge, int, usd, when } from "@/components/ui";

export default function Home() {
  const tasks = listTasks(6);
  const budget = budgetStatus();
  const skills = listSkills();
  const verified = skills.filter((s) => s.state === "verified");
  const attack = latestAttackRun();
  const approvals = pendingApprovals();
  const today = todayCounts();
  const saved = savingsToday();
  const lastEval = skills.filter((s) => s.evalId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  return (
    <div>
      <PageHeader
        title="Overview"
        lead="Noctua runs new tasks with full reasoning, learns the ones you repeat, verifies them against fixed tests and attacks, and then runs them without inference."
        actions={<ButtonLink href="/run">Run a task <ArrowRight size={15} aria-hidden /></ButtonLink>}
      />

      {approvals.length > 0 && (
        <Card className="mb-6 border-[#ecd6ad]">
          <CardHeader title={`${approvals.length} action${approvals.length > 1 ? "s" : ""} waiting for your approval`} meta="Irreversible actions never run without an explicit decision." />
          <ul className="divide-y divide-line">
            {approvals.slice(0, 3).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[13.5px]">
                <span><span className="font-mono">{a.tool}</span> → {(a.args as { to?: string })?.to ?? "—"}</span>
                <Link className="text-accent underline-offset-2 hover:underline" href={`/tasks/${a.taskId}`}>Review</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="What is Noctua doing?" meta="Most recent tasks" action={<SampleBadge />} />
          {tasks.length === 0 ? (
            <Empty title="No tasks yet." action={<ButtonLink href="/run">Run your first task</ButtonLink>}>
              Start with the sample inbox: ask Noctua to review today&apos;s messages. The first run uses full reasoning; repeat it after learning the workflow to see the difference.
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {tasks.map((t) => (
                <li key={t.id}>
                  <Link href={`/tasks/${t.id}`} className="flex flex-col gap-1.5 px-5 py-3.5 hover:bg-sunk/60 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] text-ink">{t.prompt}</p>
                      <p className="mt-0.5 text-[12.5px] text-muted">{when(t.createdAt)} · Day {t.day} inbox · {t.modelCalls} model call{t.modelCalls === 1 ? "" : "s"}{t.blocked ? ` · ${t.blocked} blocked` : ""}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5"><TierBadge tier={t.tier} /><StatusBadge status={t.status} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Is it working reliably?" />
          <dl className="space-y-5 px-5 py-5">
            <div>
              <dt className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Attack Night</dt>
              <dd className="mt-1.5">
                {attack ? (
                  <>
                    <PassFail passed={attack.passed === attack.total} label={`${attack.passed}/${attack.total} attacks blocked`} />
                    <p className="mt-1 text-[12.5px] text-muted">Last run {when(attack.createdAt)}</p>
                  </>
                ) : <PassFail passed={null} label="Not run yet" />}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Latest skill evaluation</dt>
              <dd className="mt-1.5">
                {lastEval ? (
                  <Link href={`/skills/${lastEval.id}`} className="flex flex-wrap items-center gap-2 text-[13.5px] hover:underline">
                    {lastEval.name} v{lastEval.version} <SkillStateBadge state={lastEval.state} />
                  </Link>
                ) : <PassFail passed={null} label="No skill evaluated yet" />}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Verified skills</dt>
              <dd className="mt-1.5 text-[13.5px]">{verified.length ? verified.map((s) => <Badge key={s.id} tone="accent">{s.name} v{s.version}</Badge>) : <span className="text-muted">None yet</span>}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="What got cheaper or safer today?" meta={saved.basis === "demo" ? "Demo mode: avoided model steps are counted from the demo Apprentice runs; no costs are shown because none were measured." : saved.basis === "measured" ? "Avoided spend uses the measured average cost of live Apprentice runs of the same task." : undefined} />
        <dl className="grid gap-6 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Tasks today" value={today.tasks} note={`${today.master} Master · ${today.journeyman} Journeyman · ${today.apprentice} Apprentice`} />
          <Stat label="Model calls avoided" value={saved.skillRuns ? int(saved.avoidedCalls) : "0"} tone={saved.avoidedCalls ? "accent" : undefined} note={saved.skillRuns ? `across ${saved.skillRuns} verified-skill run${saved.skillRuns > 1 ? "s" : ""}` : "Runs of verified skills appear here."} />
          <Stat label="Inference spend avoided" value={saved.skillRuns ? usd(saved.avoidedCostUsd) : "—"} note={saved.avoidedCostUsd === null && saved.skillRuns ? "Needs live, priced Apprentice runs to measure." : "Estimated from measured baselines."} />
          <Stat label="Actions blocked" value={today.blockedToday} tone={today.blockedToday ? "warn" : undefined} note={`${riskRemaining()} risk points left today`} />
        </dl>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Model budget today" meta={budget.monetaryCapNote} action={<Link href="/settings" className="text-[13px] text-accent hover:underline">Adjust limits</Link>} />
        <div className="px-5 py-5"><BudgetMeter budget={budget} /></div>
      </Card>
    </div>
  );
}
