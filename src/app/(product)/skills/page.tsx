import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader, Empty, ButtonLink, PageHeader, SkillStateBadge, StatStrip, TierBadge, when } from "@/components/ui";
import { savingsToday, todayCounts } from "@/lib/receipts.ts";
import { db } from "@/lib/db.ts";
import { listSkills, SKILL_STATES } from "@/lib/skills.ts";

export const metadata: Metadata = { title: "Skills" };

export default function SkillsPage() {
  const skills = listSkills();
  const passRates = new Map((db().prepare("SELECT id, pass_rate, passed FROM evaluations").all() as { id: string; pass_rate: number; passed: number }[]).map((e) => [e.id, e]));
  const counts = SKILL_STATES.map((s) => [s, skills.filter((k) => k.state === s).length] as const).filter(([, n]) => n > 0);
  const families = [...new Set(skills.map((s) => s.family))];
  const today = todayCounts();
  const saved = savingsToday();
  return (
    <PageHeader title="Skills" lead="Tasks Noctua has learned. Each one has to pass every check before it is allowed to run.">
      <StatStrip items={[
        { label: "Verified", value: skills.filter((k) => k.state === "verified").length, note: "allowed to run" },
        { label: "Waiting for checks", value: skills.filter((k) => k.state === "candidate").length, note: "candidates" },
        { label: "Free runs today", value: today.master, note: "0 model calls each" },
        { label: "Calls saved today", value: saved.avoidedCalls ?? 0, note: saved.basis === "measured" ? "vs. measured first runs" : "vs. first runs" },
      ]} />
      {counts.length > 0 && <p className="mb-4 flex flex-wrap gap-3 text-[13px] text-muted">{counts.map(([s, n]) => <span key={s} className="flex items-center gap-1.5"><SkillStateBadge state={s} /> {n}</span>)}</p>}
      {skills.length === 0 ? (
        <Card><Empty title="Nothing learned yet" action={<ButtonLink href="/app">Run a task</ButtonLink>}>Run a task, then press <em>Learn this workflow</em> under the reply.</Empty></Card>
      ) : families.map((f) => {
        const versions = skills.filter((s) => s.family === f);
        return (
          <Card key={f} className="mb-6">
            <CardHeader title={versions[0].name} meta={<>Task family <span className="font-mono text-[12px]">{f}</span> · {versions.length} version{versions.length > 1 ? "s" : ""}</>} />
            <ul className="divide-y divide-line">
              {versions.map((s) => {
                const ev = s.evalId ? passRates.get(s.evalId) : undefined;
                return (
                  <li key={s.id}>
                    <Link href={`/skills/${s.id}`} className="grid gap-2 px-5 py-3.5 hover:bg-sunk/60 sm:grid-cols-[80px_1fr_auto] sm:items-center">
                      <span className="font-serif text-[1.15rem]">v{s.version}</span>
                      <span className="min-w-0 text-[13px] text-muted">
                        <span className="block truncate text-ink-2">{s.stateReason ?? "Awaiting evaluation."}</span>
                        <span className="block">Created {when(s.createdAt)} · {ev ? `last evaluation ${Math.round(ev.pass_rate * 100)}% of checks passed` : "not evaluated"}</span>
                      </span>
                      <span className="flex gap-1.5"><TierBadge tier={s.tier} /><SkillStateBadge state={s.state} /></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </PageHeader>
  );
}
