import type { BudgetStatus } from "@/lib/accounting.ts";
import { cx, int, usd } from "./ui";

function Bar({ label, used, limit, fmt, inactive }: { label: string; used: number; limit: number; fmt: (n: number) => string; inactive?: string }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="font-medium text-ink">{label}</span>
        <span className="tabular-nums text-muted">{inactive ?? (limit > 0 ? `${fmt(used)} / ${fmt(limit)}` : `${fmt(used)} · no limit`)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunk" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <div className={cx("h-full rounded-full", inactive ? "bg-line-strong" : pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warn" : "bg-accent")} style={{ width: `${inactive ? 0 : pct}%` }} />
      </div>
    </div>
  );
}

export function BudgetMeter({ budget }: { budget: BudgetStatus }) {
  const { used, limits } = budget;
  return (
    <div className="grid gap-5 md:grid-cols-3">
      <Bar label="Model calls" used={used.calls} limit={limits.dailyModelCalls} fmt={(n) => int(n)} />
      <Bar label="Tokens" used={used.tokens} limit={limits.dailyTokens} fmt={(n) => int(n)} />
      <Bar label="Spend (USD)" used={used.committedUsd} limit={limits.dailyBudgetUsd} fmt={(n) => usd(n, 4)} inactive={budget.monetaryCapActive ? undefined : "cap inactive"} />
      <p className="text-[12.5px] text-muted md:col-span-3">
        Measured spend {usd(used.measuredSpendUsd)}{used.unpricedCalls ? ` · ${used.unpricedCalls} call(s) without a price (cost unknown)` : ""}.
        {budget.state === "downgrade" && " Above the downgrade threshold: planning uses the cheaper model."}
        {budget.state === "exhausted" && " Limit reached: tasks that need the model are deferred; verified Master skills still run."}
      </p>
    </div>
  );
}
