import { connection } from "next/server";
import { Sidebar } from "@/components/sidebar";
import { overview } from "@/lib/overview.ts";
import { listTasks } from "@/lib/receipts.ts";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  await connection(); // every product screen reads live state
  const o = overview();
  const b = o.budget;
  return (
    <div className="flex h-dvh overflow-hidden">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">Skip to content</a>
      <Sidebar d={{
        live: o.live, model: o.model,
        recent: listTasks(14).map(({ id, prompt, tier, status }) => ({ id, prompt, tier, status })),
        verified: o.verified,
        attack: o.attack ? `${o.attack.passed}/${o.attack.total}` : "",
        spend: b.used.measuredSpendUsd, cap: b.limits.dailyBudgetUsd, capActive: b.monetaryCapActive,
        calls: b.used.calls, callLimit: b.limits.dailyModelCalls,
        risk: o.riskRemaining, riskLimit: b.limits.dailyRiskPoints,
        approvals: o.approvals,
      }} />
      <main id="main" className="relative min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
