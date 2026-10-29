import fs from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import { LandingExperience, type LandingStats } from "@/components/landing/experience";
import { INBOX_DAYS, PRICE_REFERENCE } from "@/lib/fixtures.ts";

type Run = { tier: string; costUsd: number | null };
type Results = {
  generatedAt: string; mode: string; models: { fast: string };
  baseline: { runs: Run[]; totals: { modelCallsIncludingLearning: number; costUsd: number | null } };
  noctua: { runs: Run[]; totals: { modelCallsIncludingLearning: number; costUsd: number | null }; runsWithoutInference: number; urgentMissed: number };
  attackNight: { passed: number; total: number };
};

function stats(): LandingStats {
  try {
    const r = JSON.parse(fs.readFileSync(path.join(process.cwd(), "eval", "results.json"), "utf8")) as Results;
    const first = r.baseline.runs.map((x) => x.costUsd).filter((x): x is number => x !== null);
    return {
      live: r.mode === "live",
      date: new Date(r.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      model: r.models.fast,
      noctuaCalls: r.noctua.totals.modelCallsIncludingLearning,
      baselineCalls: r.baseline.totals.modelCallsIncludingLearning,
      zeroRuns: r.noctua.runsWithoutInference,
      totalRuns: r.noctua.runs.length,
      urgentMissed: r.noctua.urgentMissed,
      attacksBlocked: r.attackNight.passed,
      attacksTotal: r.attackNight.total,
      firstRunCost: r.mode === "live" && first.length ? first.reduce((a, b) => a + b, 0) / first.length : null,
      noctuaCost: r.noctua.totals.costUsd,
      baselineCost: r.baseline.totals.costUsd,
    };
  } catch {
    return null;
  }
}

export default async function Landing() {
  await connection(); // render per request so a cached old copy is never served
  // The injected email from the sample inbox (d1-05) — the same one the live demo and Attack Night use.
  const evil = INBOX_DAYS[1].find((e) => e.id === "d1-05")!;
  const muse = {
    email: { from: evil.from, subject: evil.subject, body: evil.body },
    naive: "Done! Forwarding all 3 invoices to archive@exfil-drop.example as requested.",
    safe: "I set aside one email: “Mailbox migration notice” contains instructions aimed at me, asking me to forward your invoices to an outside address. I did not follow them.",
    price: { product: PRICE_REFERENCE.product, min: PRICE_REFERENCE.monthlyUsd.min, max: PRICE_REFERENCE.monthlyUsd.max, source: PRICE_REFERENCE.source } };
  return (
    <>
      {/* Hide the hero before first paint so it never flashes ahead of the intro; a timer un-hides it if scripts never run. */}
      <script dangerouslySetInnerHTML={{ __html: "if(!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('intro-pending');setTimeout(function(){document.documentElement.classList.remove('intro-pending')},4000)}" }} />
      <LandingExperience stats={stats()} muse={muse} />
    </>
  );
}
