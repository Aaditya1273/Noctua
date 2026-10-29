// One snapshot of everything the UI shows as "live status": nav badges, brain panel, landing proof.
import { budgetStatus } from "./accounting.ts";
import { latestAttackRun } from "./attacks.ts";
import { getConfig, isLive, providerName } from "./config.ts";
import { riskRemaining } from "./policy.ts";
import { pendingApprovals, savingsToday, todayCounts } from "./receipts.ts";
import { listSkills } from "./skills.ts";

export function overview() {
  const cfg = getConfig();
  const attack = latestAttackRun();
  const skills = listSkills();
  return {
    live: isLive(cfg),
    provider: providerName(cfg),
    model: cfg.models.fast,
    budget: budgetStatus(cfg),
    riskRemaining: riskRemaining(),
    skills: skills.map(({ id, name, version, state, tier, stateReason }) => ({ id, name, version, state, tier, stateReason })),
    verified: skills.filter((s) => s.state === "verified").length,
    attack: attack ? { passed: attack.passed, total: attack.total, at: attack.createdAt } : null,
    today: todayCounts(),
    saved: savingsToday(),
    approvals: pendingApprovals().length,
  };
}

export type Overview = ReturnType<typeof overview>;
