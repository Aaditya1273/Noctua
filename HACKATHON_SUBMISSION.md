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

NVIDIA Nemotron 3 Super (`nvidia/nemotron-3-super-120b-a12b`, configurable per role) is used for planning, inbox
triage, reply drafting and proposing keyword rules during skill synthesis. Thinking is disabled
(`chat_template_kwargs.enable_thinking=false`) so the model answers directly in JSON mode.
All outputs are schema-validated; routing, permissions, accounting and evaluation are deterministic code.

## Nebius Token Factory usage

Server-side calls to the OpenAI-compatible `/chat/completions` (JSON mode, bounded retries, timeouts) and `/models`
(connection check). API-reported usage is stored per call and priced with configured rates; missing usage or pricing
is shown as Unknown and disables the monetary cap rather than guessing.

## Demonstrated impact (live run on Nebius Token Factory, 2026-10-29 — `eval/results.json`)

On an identical seven-run sequence, Noctua made **14 model calls instead of 21** (learning included), completed
**4 of 7 runs with no model call**, missed **0 urgent messages**, and caught both cases where a learned skill would
have been wrong (demoting it and re-running with full reasoning). A full-reasoning run cost about $0.001; a
graduated Master run costs $0 and takes ~2 ms. Over just seven runs the measured spend was $0.0064 vs $0.0070,
because learning and fallbacks are counted; every further repetition saves the full Apprentice cost.
Attack Night including a live-model test: **9/9** blocked.

## Links

- Demo URL: **UNVERIFIED — not deployed**
- Repository URL: https://github.com/Aaditya1273/Noctua
- Video: **not recorded** (script in DEMO_SCRIPT.md)

## Feedback to Nebius and NVIDIA

From actual use during this build (2026-10-29):

- ✅ The OpenAI-compatible API worked unchanged with the standard client: `/models` answered instantly, JSON mode
  returned valid JSON, and `usage` (including `reasoning_tokens`) was reported on every call, which made honest
  per-call receipts straightforward.
- ✅ Nemotron 3 Super with thinking disabled answered small JSON requests in under a second and triaged an
  8-message inbox in about 3 s, matching the human reference labels on Day 1.
- ⚠️ `nvidia/Nemotron-3_5-Lightning` was listed in our `/models` catalogue but a 50-token request returned no bytes
  within 120 s (twice), while Super on the same key answered in about 1 s. A catalogue flag for models that are
  listed but not currently serving would save debugging time.
- ⚠️ With default settings, Nemotron 3 Super spent the entire `max_tokens` budget on reasoning and returned
  `content: null` with `finish_reason: "length"`. `chat_template_kwargs.enable_thinking=false` fixed it, but it is
  easy to miss. Documenting it next to JSON mode in the quickstart would help.
- ⚠️ Onboarding requires a Visa or Mastercard for a $0 check even when using hackathon promo credits. Many
  participants (including in India, where many students have only RuPay cards) report this in the Devpost forum. A
  card-free path for promo credits, or a hard spending cap at the promo amount, would remove a real barrier.
- 💡 A machine-readable price list next to `/models` would let apps price calls without hardcoding rates.

## Checklist before submitting

- [x] Add `NEBIUS_API_KEY` to `.env.local`; confirm model IDs against `/models` (done 2026-10-29).
- [ ] Confirm prices on the Token Factory pricing page; update `NEBIUS_PRICING` if they differ.
- [x] `npm run smoke:live` → PASS (Nemotron 3 Super, 678 ms).
- [x] `npm run eval` with the key → live results recorded in EVALUATION.md and above.
- [ ] Record the video from DEMO_SCRIPT.md using a live run.
- [x] Publish the repository (https://github.com/Aaditya1273/Noctua).
- [ ] Optional: deploy (`docker build`, persistent `/data` volume, `NOCTUA_BASIC_AUTH`) and add the verified URL.
- [x] Feedback section written from the live run.
