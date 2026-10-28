# Noctua — Hackathon submission draft

**Tagline:** Your personal AI gets more efficient with every repeated task — without surrendering control.

**Track:** Personal AI

## Problem

Personal agents re-reason the same chores daily, paying for identical inference, and they act on whatever text they
read — a single poisoned email can turn them against their owner. Cheaper models and memory plugins don't change
either fact.

## What Noctua does

Noctua runs a new task with full reasoning (Apprentice), then offers to **learn the workflow**. The learned skill is
an allowlisted, typed sequence of tools — data, not generated code — that must pass a mandatory evaluation: schema and
allowlist checks, trace replay, a held-out golden set with 100% urgent and suspicious recall, injection containment,
output invariants, regression replays and determinism. Passing skills are signed (Ed25519) and run **without a model
call** (Master) or with a single drafting call (Journeyman). On every run, runtime invariants check for input drift and
missed urgency; a failing skill demotes itself and the task falls back to full reasoning, recorded on the receipt.

A server-side policy engine checks every tool call. Email, web and tool content is untrusted; irreversible actions
need explicit, argument-bound approval and spend a separate daily risk budget; skills can never act irreversibly.
Attack Night runs eight adversarial cases against the real engine.

## Technical implementation

- Next.js 16 (App Router) + React 19 + Tailwind 4, TypeScript throughout; SQLite via Node's built-in `node:sqlite`.
- Modules: provider client, accounting (atomic reserve/settle against daily call, token and USD limits), orchestrator,
  tool registry, policy engine, skill synthesis/execution, evaluator, Attack Night, signing, receipts.
- 27 automated tests, including live-path tests against a local HTTP mock of the Token Factory protocol;
  `npm run eval` writes a machine-readable baseline-vs-Noctua benchmark.

## NVIDIA model usage

NVIDIA Nemotron (default `nvidia/Nemotron-3_5-Lightning`, configurable per role, e.g. Nemotron 3 Super for planning
and synthesis) is used for planning, inbox triage, reply drafting and proposing keyword rules during skill synthesis.
All outputs are schema-validated; routing, permissions, accounting and evaluation are deterministic code.

## Nebius Token Factory usage

Server-side calls to the OpenAI-compatible `/chat/completions` (JSON mode, bounded retries, timeouts) and `/models`
(connection check). API-reported usage is stored per call and priced with configured rates; missing usage or pricing
is shown as Unknown and disables the monetary cap rather than guessing.

## Demonstrated impact (from `eval/results.json`, demo mode)

On an identical seven-run sequence, Noctua needed **6 model steps instead of 14**, completed **4 of 7 runs with no
model call**, missed **0 urgent messages**, and caught both cases where a learned skill would have been wrong
(demoting it and re-running). Attack Night: **8/8** blocked. Live token/cost figures: **not yet measured** — see checklist.

## Links

- Demo URL: **UNVERIFIED — not deployed**
- Repository URL: **UNVERIFIED — not yet published**
- Video: **not recorded** (script in DEMO_SCRIPT.md)

## Feedback to Nebius and NVIDIA

**Based on actual usage in this build:** model IDs and prices for Token Factory were easiest to confirm from a
third-party provider listing; a public, machine-readable price list next to `/models` would let apps like this one price
calls without hardcoding. Live API behaviour (JSON mode support per Nemotron variant, usage fields, latency) was
**not observed** because no API key was available in the build environment — add concrete feedback after a live run.

## Checklist before submitting

- [ ] Add `NEBIUS_API_KEY` to `.env.local`; run **Settings → Check connection** and confirm model IDs.
- [ ] Confirm prices on the Token Factory pricing page; update `NEBIUS_PRICING`.
- [ ] `npm run smoke:live` → PASS.
- [ ] `npm run eval` with the key → paste live token/cost results into EVALUATION.md and this file.
- [ ] Record the video from DEMO_SCRIPT.md using a live run.
- [ ] Publish the repository; fill in the URL above.
- [ ] Optional: deploy (`docker build`, persistent `/data` volume, `NOCTUA_BASIC_AUTH`) and add the verified URL.
- [ ] Replace the feedback section with observations from the live run.
