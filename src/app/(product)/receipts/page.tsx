import type { Metadata } from "next";
import Link from "next/link";
import { BudgetMeter } from "@/components/budget";
import { ButtonLink, Card, CardHeader, Empty, PageHeader, StatusBadge, TierBadge, int, ms, usd, when } from "@/components/ui";
import { budgetStatus } from "@/lib/accounting.ts";
import { listTasks } from "@/lib/receipts.ts";

export const metadata: Metadata = { title: "Receipts" };

export default function ReceiptsPage() {
  const tasks = listTasks(200);
  const budget = budgetStatus();
  const done = tasks.filter((t) => t.status === "done");
  const tiers = (["apprentice", "journeyman", "master"] as const).map((tier) => {
    const rows = done.filter((t) => t.tier === tier);
    const live = rows.filter((t) => t.mode === "live");
    const priced = live.filter((t) => t.costUsd !== null);
    const tokened = live.filter((t) => t.tokens !== null);
    return {
      tier, n: rows.length, live: live.length,
      calls: rows.length ? rows.reduce((a, t) => a + t.modelCalls, 0) / rows.length : null,
      tokens: tokened.length && tokened.length === live.length ? tokened.reduce((a, t) => a + (t.tokens ?? 0), 0) / tokened.length : null,
      cost: priced.length && priced.length === live.length ? priced.reduce((a, t) => a + (t.costUsd ?? 0), 0) / priced.length : null,
      latency: rows.length ? rows.reduce((a, t) => a + (t.latencyMs ?? 0), 0) / rows.length : null,
    };
  });
  return (
    <div>
      <PageHeader title="Receipts" lead="Model spend is computed only from API-reported token usage and your configured prices. Missing values are shown as Unknown — never estimated into a number." />
      <Card className="mb-6"><CardHeader title="Today" meta={budget.monetaryCapNote} /><div className="px-5 py-5"><BudgetMeter budget={budget} /></div></Card>

      <Card className="mb-6">
        <CardHeader title="By execution path" meta="Averages over completed tasks in this database. Apprentice rows are the baseline. Demo-mode runs contribute call counts only (their model steps were not performed)." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="text-[12px] uppercase tracking-wide text-muted"><tr className="border-b border-line">{["Path", "Runs (live)", "Model calls / run", "Tokens / live run", "Model cost / live run", "Latency"].map((h) => <th key={h} className="px-5 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {tiers.map((r) => (
                <tr key={r.tier}>
                  <td className="px-5 py-2.5"><TierBadge tier={r.tier} /></td>
                  <td className="px-5 py-2.5 tabular-nums">{r.n} ({r.live})</td>
                  <td className="px-5 py-2.5 tabular-nums">{r.calls === null ? "—" : r.calls.toFixed(1)}</td>
                  <td className="px-5 py-2.5 tabular-nums">{r.live ? int(r.tokens === null ? null : Math.round(r.tokens)) : "—"}</td>
                  <td className="px-5 py-2.5 tabular-nums">{r.live ? usd(r.cost, 5) : "—"}</td>
                  <td className="px-5 py-2.5 tabular-nums">{r.latency === null ? "—" : ms(Math.round(r.latency))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="History" meta={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`} />
        {tasks.length === 0 ? <Empty title="No receipts yet." action={<ButtonLink href="/app">Run a task</ButtonLink>} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead className="text-[12px] uppercase tracking-wide text-muted"><tr className="border-b border-line">{["When", "Task", "Path", "Status", "Mode", "Calls", "Tokens", "Cost", "Latency"].map((h) => <th key={h} className="px-5 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-sunk/50">
                    <td className="whitespace-nowrap px-5 py-2.5 text-muted">{when(t.createdAt)}</td>
                    <td className="max-w-[260px] px-5 py-2.5"><Link href={`/tasks/${t.id}`} className="block truncate hover:underline">{t.prompt}</Link><span className="text-[12px] text-muted">Day {t.day}</span></td>
                    <td className="px-5 py-2.5"><TierBadge tier={t.tier} /></td>
                    <td className="px-5 py-2.5"><StatusBadge status={t.status} /></td>
                    <td className="px-5 py-2.5 text-muted">{t.mode}</td>
                    <td className="px-5 py-2.5 tabular-nums">{t.modelCalls}</td>
                    <td className="px-5 py-2.5 tabular-nums">{t.modelCalls ? int(t.tokens) : "0"}</td>
                    <td className="px-5 py-2.5 tabular-nums">{t.modelCalls ? usd(t.costUsd, 5) : "$0"}</td>
                    <td className="px-5 py-2.5 tabular-nums">{ms(t.latencyMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
