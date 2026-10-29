import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { connection } from "next/server";
import { Owl } from "@/components/owl";

type Run = { tier: string; modelCalls: number; costUsd: number | null; latencyMs: number | null };
type Results = {
  generatedAt: string; mode: string; models: { fast: string };
  baseline: { runs: Run[]; totals: { modelCallsIncludingLearning: number; costUsd: number | null } };
  noctua: { runs: Run[]; totals: { modelCallsIncludingLearning: number; costUsd: number | null }; runsWithoutInference: number; urgentMissed: number };
  attackNight: { passed: number; total: number };
};

function results(): Results | null {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "eval", "results.json"), "utf8")) as Results; } catch { return null; }
}

const I = ({ children }: { children: React.ReactNode }) => <em className="font-italic font-normal not-italic tracking-[-0.01em] [font-style:italic]">{children}</em>;

const CARDS = [
  { t: "apprentice", r: -7, y: 24, dark: true, items: ["Nemotron plans with allowlisted tools", "Triages, summarises, drafts replies", "Every step passes the policy engine", "Receipt: calls, tokens, cost"] },
  { t: "skill", r: 4, y: 0, dark: false, items: ["The run becomes a typed manifest", "Data, not generated code", "Learned keyword rules, fixed guard", "Versioned, provenance kept"] },
  { t: "verify", r: -3, y: 12, dark: true, items: ["Held-out golden set", "100% urgent and suspicious recall", "Attack containment, determinism", "Signed only if every check passes"] },
  { t: "master", r: 6, y: 4, dark: false, items: ["Same request, zero model calls", "Milliseconds, $0 inference", "Demotes itself on drift", "Falls back to full reasoning"] },
  { t: "attack night", r: -5, y: 20, dark: true, items: ["Poisoned email and web pages", "Approval replay, tampered skills", "Malformed and chained tool calls", "Enforced by code, not the model"] },
];

const WORDS = ["reason once", "verify", "reuse", "zero inference", "receipts", "attack night", "your rules"];

export default async function Landing() {
  await connection(); // render per request so a cached old copy is never served
  const r = results();
  const live = r?.mode === "live";
  const date = r ? new Date(r.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

  return (
    <div className="overflow-x-hidden bg-black font-display text-ink">
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-4 mix-blend-difference sm:px-8">
        <Link href="/" className="flex items-center gap-2 text-[22px] font-black tracking-[-0.06em] text-white">noctua</Link>
        <nav aria-label="Main" className="hidden items-center gap-7 text-[14px] font-medium lowercase text-white sm:flex">
          <a href="#how" className="hover:opacity-60">how it works</a>
          <a href="#proof" className="hover:opacity-60">proof</a>
          <a href="https://github.com/Aaditya1273/Noctua" className="hover:opacity-60">source</a>
        </nav>
        <Link href="/app" className="rounded-full border-[1.5px] border-white px-4 py-1.5 text-[12.5px] font-extrabold uppercase tracking-wide text-white hover:bg-white hover:text-black">open app</Link>
      </header>

      <main>
        {/* Hero: inset frame */}
        <section className="p-3">
          <div className="relative flex min-h-[calc(100dvh-24px)] flex-col justify-end overflow-hidden rounded-[24px] border border-[#1c1c1c] bg-[#0b0b0b] px-5 pb-12 pt-28 sm:px-10 sm:pb-16">
            <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(#2a2a2a_1px,transparent_1px)] [background-size:22px_22px]" aria-hidden />
            <div className="owl-float absolute right-[8%] top-[16%] rotate-[8deg] sm:right-[14%]"><Owl size={150} /></div>
            <p className="relative mb-6 max-w-sm text-[15px] font-medium leading-relaxed text-ink-2">
              a personal ai agent on NVIDIA Nemotron and Nebius Token Factory that learns your repeated tasks, proves them, and stops paying to think about them.
            </p>
            <h1 className="relative text-[clamp(3.2rem,11vw,11rem)] font-black leading-[0.86] tracking-[-0.065em]">
              reason <I>once.</I><br />
              then{" "}
              <span className="relative inline-block">
                never
                <svg className="draw-underline absolute -bottom-[0.08em] left-0 h-[0.22em] w-full" viewBox="0 0 300 30" preserveAspectRatio="none" aria-hidden>
                  <path d="M4 20 C 70 4, 140 28, 210 12 S 290 14, 296 8" fill="none" stroke="#fafafa" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>{" "}again.
            </h1>
            <div className="relative mt-10 flex flex-wrap items-center gap-3">
              <Link href="/app" className="rounded-full bg-white px-6 py-3 text-[15px] font-bold lowercase text-black transition-transform hover:scale-[1.03]">open the app</Link>
              <a href="#how" className="rounded-full border-[1.5px] border-[#3a3a3a] px-6 py-3 text-[15px] font-bold lowercase text-white hover:border-white">see how it works</a>
              <span className="ml-1 text-[13px] text-muted">no sign-up · synthetic sample inbox</span>
            </div>
          </div>
        </section>

        {/* Marquee */}
        <section aria-hidden className="overflow-hidden border-y border-[#161616] py-8">
          <div className="marquee">
            {[...WORDS, ...WORDS].map((w, i) => (
              <span key={i} className="flex items-center whitespace-nowrap px-6 text-[clamp(3rem,8vw,7rem)] font-black lowercase leading-none tracking-[-0.05em]">
                <span className={i % 2 ? "outline-text" : "text-white"}>{w}</span>
                <span className="ml-12 inline-block size-3 rounded-full bg-[#3a3a3a]" />
              </span>
            ))}
          </div>
        </section>

        {/* Statement */}
        <section className="mx-auto max-w-6xl px-5 py-28 sm:px-8">
          <h2 className="text-[clamp(2.4rem,6.5vw,6rem)] font-black lowercase leading-[0.92] tracking-[-0.055em]">
            between <I>your inbox</I> and the model sits a policy engine that <span className="text-muted">can&apos;t be talked into anything.</span>
          </h2>
          <p className="mt-8 max-w-xl font-sans text-[17px] leading-relaxed text-ink-2">
            Email, web pages and tool output are untrusted data. Every tool call is checked on the server against twelve ordered rules. Irreversible actions need your approval, bound to the exact arguments, and spend from a separate daily risk budget.
          </p>
        </section>

        {/* Fan cards */}
        <section id="how" className="scroll-mt-10 px-5 pb-32 pt-8 sm:px-8">
          <h2 className="mx-auto max-w-6xl text-[clamp(2.4rem,6vw,5.5rem)] font-black lowercase leading-[0.92] tracking-[-0.055em]">
            what happens on <I>every</I> task
          </h2>
          <div className="fan mx-auto mt-16 flex max-w-6xl flex-wrap justify-center gap-4 lg:flex-nowrap lg:gap-0">
            {CARDS.map((c, i) => (
              <article key={c.t} className={`fan-card relative w-full max-w-[300px] rounded-[14px] p-6 shadow-[0_14px_40px_-14px_rgb(0_0_0/0.9)] sm:w-[260px] lg:-mx-3 ${c.dark ? "border border-[#262626] bg-[#141414] text-white" : "bg-[#f2f2f2] text-black"}`}
                style={{ transform: `rotate(${c.r}deg) translateY(${c.y}px)`, zIndex: i }}>
                <p className={`text-[12px] font-bold uppercase tracking-[0.18em] ${c.dark ? "text-muted" : "text-[#6b6b6b]"}`}>0{i + 1}</p>
                <h3 className="mt-10 text-[2.1rem] font-extrabold lowercase leading-none tracking-[-0.045em]">{c.t}</h3>
                <svg viewBox="0 0 200 10" className="mt-4 h-2 w-24" aria-hidden><path d="M2 6 C 50 1, 100 9, 198 4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                <ul className="mt-6 space-y-2.5 font-sans text-[14.5px] font-medium leading-snug">
                  {c.items.map((x) => <li key={x}>{x}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* Proof */}
        <section id="proof" className="scroll-mt-10 border-t border-[#161616] px-5 py-28 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="font-sans text-[13px] font-medium uppercase tracking-[0.2em] text-muted">{live ? `measured live on nebius token factory · ${date}` : "benchmark"}</p>
            <h2 className="mt-4 max-w-4xl text-[clamp(2.2rem,5.5vw,5rem)] font-black lowercase leading-[0.92] tracking-[-0.055em]">same seven tasks. learning <I>included</I> in the bill.</h2>
            {r && (
              <dl className="mt-16 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { v: `${r.noctua.totals.modelCallsIncludingLearning}`, s: `vs ${r.baseline.totals.modelCallsIncludingLearning}`, k: "model calls", n: "Noctua against reasoning every time" },
                  { v: `${r.noctua.runsWithoutInference}`, s: `/ ${r.noctua.runs.length}`, k: "runs with zero inference", n: "verified skills, no model call" },
                  { v: `${r.noctua.urgentMissed}`, s: "", k: "urgent messages missed", n: "unsafe skills demote themselves" },
                  { v: `${r.attackNight.passed}`, s: `/ ${r.attackNight.total}`, k: "attacks blocked", n: "enforced on the server" },
                ].map((x) => (
                  <div key={x.k} className="border-t border-[#262626] pt-6">
                    <dd className="text-[clamp(3.5rem,7vw,6rem)] font-black leading-none tracking-[-0.06em] tabular-nums">{x.v}<span className="ml-2 text-[0.38em] font-bold tracking-[-0.03em] text-muted">{x.s}</span></dd>
                    <dt className="mt-4 text-[17px] font-bold lowercase">{x.k}</dt>
                    <p className="mt-1 font-sans text-[14px] text-muted">{x.n}</p>
                  </div>
                ))}
              </dl>
            )}
            {r && <p className="mt-14 max-w-3xl font-sans text-[13.5px] leading-relaxed text-muted">
              {live ? `Model ${r.models.fast}. Measured spend $${r.noctua.totals.costUsd?.toFixed(4)} against $${r.baseline.totals.costUsd?.toFixed(4)} over only seven runs, with learning and two safety fallbacks counted; each further repetition saves the full reasoning cost. ` : "Demo mode: no inference performed. "}
              Synthetic sample inbox: this shows the mechanism, not real-world accuracy. Method in <a className="underline hover:text-ink" href="https://github.com/Aaditya1273/Noctua/blob/main/EVALUATION.md">EVALUATION.md</a>.
            </p>}
          </div>
        </section>
      </main>

      {/* Footer: inset dark panel with giant wordmark */}
      <footer className="p-2.5">
        <div className="flex min-h-[80dvh] flex-col justify-between overflow-hidden rounded-[20px] bg-[#f2f2f2] px-6 pb-6 pt-14 text-black sm:px-10">
          <div className="grid gap-10 sm:grid-cols-3">
            {[
              { b: "try it", l: <Link href="/app" className="hover:opacity-60">open the app</Link> },
              { b: "built with", l: <span>nvidia nemotron · nebius token factory</span> },
              { b: "source", l: <a href="https://github.com/Aaditya1273/Noctua" className="hover:opacity-60">github · apache-2.0</a> },
            ].map((c) => (
              <div key={c.b}>
                <span className="rounded-full bg-black px-3 py-1 font-sans text-[12.5px] font-medium lowercase text-white">{c.b}</span>
                <p className="mt-5 text-[clamp(1.4rem,2.4vw,2.2rem)] font-extrabold lowercase leading-tight tracking-[-0.04em]">{c.l}</p>
              </div>
            ))}
          </div>
          <div className="relative mt-16">
            <div className="absolute -top-24 right-[6%] rotate-[-10deg] sm:-top-32"><Owl size={120} mood="happy" track={false} /></div>
            <p className="select-none text-[clamp(5rem,24vw,24rem)] font-black leading-[0.78] tracking-[-0.075em]">noctua</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
