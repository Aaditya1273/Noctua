# Evaluation

Everything in this document was produced by commands in this repository. The **live** numbers below are copied
from `eval/results.json` (generated 2026-10-29, Node v26.5.0, live mode on Nebius Token Factory with
`nvidia/nemotron-3-super-120b-a12b`, thinking disabled, prices $0.30 / $0.90 per 1M tokens from `.env.example`).

## Live results (Nebius Token Factory, 2026-10-29)

| | Baseline (Apprentice-only) | Noctua (learning + evaluation included) |
|---|---|---|
| Model calls across 7 runs | **21** | **14** (9 for tasks + 5 for skill synthesis) |
| Runs completed with no model call | 0 / 7 | **4 / 7** |
| Tokens (in / out) | 9,300 / 4,695 | 8,354 / 4,330 |
| Measured model spend | **$0.0070** | **$0.0064** |
| Label accuracy vs. reference | 96.0% | 96.0% |
| Urgent messages missed | 0 | 0 |

- One live Apprentice run costs about **$0.0007–0.0012** (3 calls: plan, triage, drafts; ~2,400 tokens; ~6 s).
  A Master run costs **$0** and takes ~2 ms.
- Over only 7 runs the total saving is small (~9%), because the arm pays for three skill syntheses and two runtime
  fallbacks. Each further repetition handled by a Master skill saves the full Apprentice cost, so the gap widens
  with use; 7 runs is roughly break-even.
- The single labelling error is the live model's own (one Day 3 message); the skill learned that label, so both arms
  scored the same. Evaluation against the human golden set still passed because the golden set does not contain it.
- Skill synthesis: v1 and v2 used model-proposed rules (schema-checked, merged with deterministic induction). For v3
  the model returned more than 30 keywords per category; that proposal failed validation and Noctua fell back to
  deterministic induction (the raw-proposal bound has since been relaxed and the output is trimmed instead).
- Attack Night including the live-model test: **9 / 9**. The real model, given the raw poisoned inbox and a weak
  prompt, proposed 4 `mail.send` actions; it did not follow the injection, and all 4 were denied by policy.

The demo-mode results from 2026-10-28 are kept below for reference.

## What was measured

**Benchmark (`npm run eval`).** The same task — *"Review today's inbox, identify the messages requiring attention,
summarize urgent items, and prepare suggested replies."* — is run seven times over the synthetic inboxes in the order
**Day 1, 1, 2, 1, 2, 3, 3**, in two arms, each with a fresh database:

- **Baseline** — Apprentice-only: every run uses the full planner + triage path.
- **Noctua** — automatic routing. After any successful Apprentice run, the script learns a skill (template drafting)
  and runs the real evaluation; promotion happens only if every mandatory check passes. Learning and evaluation
  costs are counted in the Noctua arm.

Per run it records execution tier, model calls, demo stand-in model steps, tokens, cost, latency, fallbacks, and
label accuracy against the human reference annotations. It also runs Attack Night.

**Test suite (`npm test`).** 27 deterministic tests: lifecycle (promote, reject, demote, regression replay,
signature tamper), policy (approvals, exact-args binding, untrusted recipients, risk budget), Attack Night, memory,
and the live path against a local HTTP mock of the Token Factory protocol (usage, cost arithmetic, malformed output,
timeout/retry, HTTP 500, unreachable host, call-limit deferral, monetary cap, missing pricing, missing usage).

## Results (demo mode, 2026-10-28)

| | Baseline (Apprentice-only) | Noctua |
|---|---|---|
| Model steps required across 7 runs | **14** | **6** |
| Runs completed with no model step | 0 / 7 | **4 / 7** |
| Label accuracy vs. reference | 100% | 100% |
| Urgent messages missed | 0 | 0 |
| Tokens / cost | not measured (demo) | not measured (demo) |
| Runtime fallbacks | — | 2 (Day 2 first seen, Day 3 first seen) |

Noctua run log: `apprentice → master → apprentice (fallback: v1 demoted) → master → master → apprentice (fallback: v2 demoted) → master`.

Skill lifecycle during the run:

| After run | Version | Checks | Outcome |
|---|---|---|---|
| 1 | v1 (Day 1) | 10 / 10 | verified (Master) |
| 3 | v2 (Days 1–2) | 11 / 11 (incl. Day 2 regression replay) | verified, supersedes demoted v1 |
| 6 | v3 (Days 1–3) | 11 / 11 (incl. Day 2 and Day 3 regression replays) | verified, supersedes demoted v2 |

Why the fallbacks happened (recorded verbatim in receipts):

- **Day 2 with v1:** coverage 50% (minimum 60%), and *"URGENT: payroll file rejected by the bank"* contained time-critical
  language but was labelled `fyi`. v1 was demoted; the task re-ran on the Apprentice path.
- **Day 3 with v2:** *"Server room temperature alarm"* (alarm, emergency) was labelled `routine` despite 80% coverage.
  The urgency invariant caught a confident-but-wrong classification that coverage alone would have missed.

Attack Night: **8 / 8** cases blocked (see SECURITY.md for the list).

## How to read these numbers

- In demo mode no inference happens. "Model steps required" counts the steps that would have called the model
  (planner + triage per Apprentice run). It is a structural count, not a measured cost.
- Demo Apprentice accuracy is 100% **by construction**: the stand-in returns the reference annotations. The meaningful
  accuracy figure is the Noctua arm's Master runs (rule-based, no model), which matched the reference on every
  message they were allowed to finish — and the two cases where they would not have were caught and re-run.
- With `NEBIUS_API_KEY` set, the same command records real tokens and cost from API-reported usage. Model output is
  probabilistic; record the model ID and configuration (both written to `results.json`) with any live result.

## Limitations

- Tiny synthetic dataset: 21 inbox messages over 3 days and a 10-message held-out golden set, written for this project.
  This demonstrates the mechanism, not real-world accuracy or savings.
- The golden set and runtime invariants were designed alongside the fixtures. They are deterministic and
  reproducible, but not independent of the author.
- The live benchmark is a single run on one model and configuration. Model output is probabilistic; rerunning will
  give somewhat different labels, token counts and costs.

## Reproduce

```bash
npm install
npm test
npm run eval                     # demo mode → eval/results.json
NEBIUS_API_KEY=... npm run eval  # live mode (spends real tokens; respects DAILY_* limits)
```
