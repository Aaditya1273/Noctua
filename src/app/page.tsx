import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Brain, Code2, Fingerprint, Lock, Repeat, ScrollText, ShieldCheck, Zap } from "lucide-react";
import { LandingPrompt } from "@/components/landing-prompt";
import { Owl } from "@/components/owl";

type Run = { tier: string; modelCalls: number; costUsd: number | null; latencyMs: number | null; urgentMissed: number };
type Results = {
  generatedAt: string; mode: string; models: { fast: string };
  baseline: { runs: Run[]; totals: { modelCallsIncludingLearning: number; costUsd: number | null }; urgentMissed: number };
  noctua: { runs: Run[]; totals: { modelCallsIncludingLearning: number; costUsd: number | null }; runsWithoutInference: number; urgentMissed: number };
  attackNight: { passed: number; total: number };
};

function results(): Results | null {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "eval", "results.json"), "utf8")) as Results; } catch { return null; }
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export default function Landing() {
  const r = results();
  const live = r?.mode === "live";
  const appr = r?.baseline.runs ?? [];
  const master = (r?.noctua.runs ?? []).filter((x) => x.tier === "master");
  const apprCost = avg(appr.map((x) => x.costUsd ?? 0));
  const apprMs = avg(appr.map((x) => x.latencyMs ?? 0));
  const masterMs = avg(master.map((x) => x.latencyMs ?? 0));
  const date = r ? new Date(r.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

  return (
    <div className="relative overflow-x-hidden">
      <div className="sky" aria-hidden><div className="stars" /></div>

      <header className="fixed inset-x-0 top-3 z-40 px-3">
        <nav aria-label="Main" className="glass mx-auto flex max-w-5xl items-center gap-2 rounded-full py-1.5 pl-2 pr-1.5">
          <Link href="/" className="flex items-center gap-2 rounded-full pr-3"><Owl size={30} track={false} /><span className="text-[15px] font-semibold tracking-tight">noctua</span></Link>
          <div className="ml-auto hidden items-center gap-1 text-[13.5px] text-ink-2 sm:flex">
            <a href="#how" className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-ink">How it works</a>
            <a href="#proof" className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-ink">Proof</a>
            <a href="#trust" className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-ink">Security</a>
            <a href="https://github.com/Aaditya1273/Noctua" className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-ink">GitHub</a>
          </div>
          <Link href="/app" className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13.5px] font-medium text-paper hover:bg-white sm:ml-1">Open console <ArrowRight size={14} aria-hidden /></Link>
        </nav>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="flex min-h-dvh flex-col items-center justify-center px-4 pb-16 pt-28 text-center">
          <div className="owl-float rise"><Owl size={170} /></div>
          <p className="rise mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[12.5px] text-ink-2" style={{ animationDelay: "80ms" }}>
            <span className="size-1.5 rounded-full bg-accent pulse-ring" aria-hidden /> Personal AI · NVIDIA Nemotron on Nebius Token Factory
          </p>
          <h1 className="rise mt-5 max-w-4xl text-[clamp(2.6rem,7.5vw,6rem)] font-semibold leading-[0.95] tracking-[-0.055em] text-glow" style={{ animationDelay: "140ms" }}>
            The AI that learns<br />to <span className="text-aurora">stop thinking.</span>
          </h1>
          <p className="rise mt-6 max-w-xl text-[16.5px] leading-relaxed text-ink-2" style={{ animationDelay: "220ms" }}>
            Noctua reasons through a new task once, turns it into a workflow, verifies it against tests and attacks — and from then on runs it with <span className="text-ink">zero model calls</span>. You keep the receipts, the budget and the final say.
          </p>
          <div className="rise mt-9 flex w-full justify-center" style={{ animationDelay: "300ms" }}><LandingPrompt /></div>
          <p className="rise mt-6 text-[12px] text-muted" style={{ animationDelay: "380ms" }}>Runs on a clearly labelled synthetic inbox. No account, no sign-up.</p>
        </section>

        {/* Ladder */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24">
          <p className="text-center text-[12.5px] font-medium uppercase tracking-[0.2em] text-accent">The graduation ladder</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-center text-[clamp(2rem,4.6vw,3.6rem)] font-semibold leading-[1] tracking-[-0.045em] text-glow">Reason once. Verify. Reuse.</h2>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              { icon: Brain, tier: "Apprentice", title: "Thinks it through", body: "Nemotron plans with allowlisted tools, triages, drafts replies. Every step passes the policy engine.", stat: live && apprCost !== null ? `~$${apprCost.toFixed(4)} · ${apprMs ? (apprMs / 1000).toFixed(1) : "?"}s` : "full reasoning", tone: "text-info" },
              { icon: BadgeCheck, tier: "Verified", title: "Earns trust", body: "The run becomes a typed, allowlisted skill — data, not code. It must pass held-out labels, 100% urgent recall, attack containment and determinism, then it's signed.", stat: "10+ mandatory checks", tone: "text-warn" },
              { icon: Zap, tier: "Master", title: "Stops paying", body: "Same request, no model call. If the inbox drifts or an urgent message would be missed, it demotes itself and re-runs with full reasoning.", stat: masterMs !== null ? `$0 · ${Math.max(1, Math.round(masterMs))} ms` : "$0 · 0 calls", tone: "text-accent" },
            ].map((c, i) => (
              <div key={c.tier} className="glass group relative overflow-hidden rounded-[26px] p-6 transition-transform duration-500 hover:-translate-y-1">
                <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/[0.03] blur-2xl transition-opacity group-hover:opacity-100" aria-hidden />
                <div className="flex items-center justify-between">
                  <c.icon size={22} className={c.tone} aria-hidden />
                  <span className="text-[12px] text-muted">0{i + 1}</span>
                </div>
                <p className={`mt-6 text-[12px] font-medium uppercase tracking-[0.16em] ${c.tone}`}>{c.tier}</p>
                <h3 className="mt-1 text-[1.6rem] font-semibold tracking-[-0.03em]">{c.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{c.body}</p>
                <p className="mt-6 font-mono text-[13px] text-ink">{c.stat}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Proof */}
        <section id="proof" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24">
          <div className="glass rounded-[32px] p-8 sm:p-12">
            <p className="text-[12.5px] font-medium uppercase tracking-[0.2em] text-accent">{live ? `Measured live · Nebius Token Factory · ${date}` : "Benchmark"}</p>
            <h2 className="mt-3 max-w-3xl text-[clamp(1.8rem,4vw,3rem)] font-semibold leading-[1.02] tracking-[-0.045em]">Same seven tasks. Same inputs. Learning and verification included in the bill.</h2>
            {r ? (
              <dl className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { k: "Model calls", v: `${r.noctua.totals.modelCallsIncludingLearning} vs ${r.baseline.totals.modelCallsIncludingLearning}`, n: "Noctua vs. reasoning every time" },
                  { k: "Runs with zero inference", v: `${r.noctua.runsWithoutInference}/${r.noctua.runs.length}`, n: "verified skills, no model call" },
                  { k: "Urgent messages missed", v: String(r.noctua.urgentMissed), n: "runtime invariants demote unsafe skills" },
                  { k: "Attacks blocked", v: `${r.attackNight.passed}/${r.attackNight.total}`, n: "Attack Night, enforced server-side" },
                ].map((s) => (
                  <div key={s.k}>
                    <dd className="text-[clamp(2.4rem,5vw,3.6rem)] font-semibold leading-none tracking-[-0.05em] text-glow tabular-nums">{s.v}</dd>
                    <dt className="mt-3 text-[14px] font-medium text-ink">{s.k}</dt>
                    <p className="mt-1 text-[13px] text-muted">{s.n}</p>
                  </div>
                ))}
              </dl>
            ) : <p className="mt-6 text-muted">Run <code>npm run eval</code> to generate results.</p>}
            {r && <p className="mt-10 max-w-3xl text-[13px] leading-relaxed text-muted">
              {live ? `Model: ${r.models.fast}. Measured spend $${r.noctua.totals.costUsd?.toFixed(4)} vs $${r.baseline.totals.costUsd?.toFixed(4)} over only seven runs — learning and two safety fallbacks are counted, so the gap widens with every repetition. ` : "Demo mode: no inference performed. "}
              Synthetic sample inbox; this shows the mechanism, not real-world accuracy. Full method in <a className="underline hover:text-ink" href="https://github.com/Aaditya1273/Noctua/blob/main/EVALUATION.md">EVALUATION.md</a>.
            </p>}
          </div>
        </section>

        {/* Trust */}
        <section id="trust" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24">
          <h2 className="max-w-3xl text-[clamp(2rem,4.6vw,3.6rem)] font-semibold leading-[1] tracking-[-0.045em] text-glow">The model is never the security mechanism.</h2>
          <p className="mt-4 max-w-2xl text-[16px] text-ink-2">A poisoned email can talk a model into anything. It can&apos;t talk a policy engine into anything.</p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, t: "Every tool call checked", d: "One server-side gate, 12 ordered rules, every decision logged." },
              { icon: Fingerprint, t: "Approvals bound to the action", d: "SHA-256 of the exact arguments. Change a word and it's void." },
              { icon: Lock, t: "Two budgets", d: "Money and irreversibility. Either one stops the agent cold." },
              { icon: ScrollText, t: "Receipts, not vibes", d: "API-reported tokens × real prices. Unknown stays Unknown." },
            ].map((f) => (
              <div key={f.t} className="glass rounded-[24px] p-5">
                <f.icon size={20} className="text-accent" aria-hidden />
                <h3 className="mt-4 text-[16px] font-semibold tracking-tight">{f.t}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-28 text-center">
          <div className="owl-float mx-auto w-fit"><Owl size={96} mood="happy" /></div>
          <h2 className="mx-auto mt-6 max-w-2xl text-[clamp(2rem,5vw,3.8rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-glow">Watch it graduate in 60 seconds.</h2>
          <Link href="/app" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-[15px] font-medium text-paper shadow-[0_0_60px_-10px_rgb(110_231_183/0.6)] transition-transform hover:scale-[1.03]">
            <Repeat size={17} aria-hidden /> Open the console
          </Link>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-[12.5px] text-muted">
          <p>Noctua · Built with NVIDIA Nemotron and Nebius Token Factory · Apache-2.0</p>
          <a href="https://github.com/Aaditya1273/Noctua" className="inline-flex items-center gap-1.5 hover:text-ink"><Code2 size={14} aria-hidden /> Source</a>
        </div>
      </footer>
    </div>
  );
}
