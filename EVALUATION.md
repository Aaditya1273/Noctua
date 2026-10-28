# Evaluation

Everything in this document was produced by commands in this repository. Numbers are copied from
`eval/results.json` (generated 2026-10-28, Node v26.5.0, **demo mode**).

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

## Results (demo mode)

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
- No live run was performed in this workspace (no API key available), so there is **no measured cost or token data**
  yet. The live path is covered by protocol-mock tests only.

## Reproduce

```bash
npm install
npm test
npm run eval                     # demo mode → eval/results.json
NEBIUS_API_KEY=... npm run eval  # live mode (spends real tokens; respects DAILY_* limits)
```
