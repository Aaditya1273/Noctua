import { z } from "zod";
import { budgetStatus, saveLimits } from "@/lib/accounting.ts";
import { handle, readJson } from "@/lib/http.ts";

const Limits = z.object({
  dailyModelCalls: z.number().int().min(0).max(100_000),
  dailyTokens: z.number().int().min(0).max(1_000_000_000),
  dailyBudgetUsd: z.number().min(0).max(10_000),
  dailyRiskPoints: z.number().int().min(0).max(1000),
  downgradeAt: z.number().min(0.1).max(1),
}).strict();

export function GET() {
  return handle(() => budgetStatus());
}

export function POST(req: Request) {
  return handle(async () => {
    saveLimits(await readJson(req, Limits));
    return budgetStatus();
  });
}
