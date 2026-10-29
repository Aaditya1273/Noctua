# Noctua — Hackathon submission draft

**Tagline:** The always-on personal agent on NVIDIA Nemotron that gets cheaper with every repeated task, and can't be talked into a bad deal or into giving out your address.

**Track:** Personal AI

## Problem

This autumn always-on agents went mainstream, and so did their failure modes. In September an agent running a
Marketplace listing accepted a $10 offer and sent a stranger the seller's home address (reported by The Guardian
and Fortune). Commercial always-on agents also sit behind subscriptions such as ChatGPT Pro at $100 to $500 a month.

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

- **Cheaper with use:** on an identical seven-run sequence Noctua made **9 model calls instead of 15** and spent
  **$0.0040 instead of $0.0057** (learning included), with **4 of 7 runs making no model call**. A full-reasoning run
  costs about $0.0008; a graduated repeat costs $0.
- **Safe by construction:** **0 urgent messages missed**; both cases where a learned skill would have been wrong were
  caught and re-run with full reasoning. Attack Night: **10/10** blocked.
- **The Muse Replay:** the reported Marketplace failure, replayed with synthetic data. The $10 lowball is blocked
  (P14 below-floor), the home address is blocked (P13 private-data), and Noctua's own reply waits for approval and goes
  out labelled "Sent by Noctua".
- **Honest price comparison** (in the app and on the landing page): model cost for this task is fractions of a cent per
  first run and $0 per repeat. For reference, ChatGPT Pro, which dots requires, is $100–500 a month. That covers hosted
  compute and much more, so it is labelled as not like-for-like.

## Roadmap

- **OpenClaw and Hermes plugin:** package the router, policy engine and budgets as an agent-host plugin (the same shape
  as NVIDIA's `nemo-relay-openclaw`) so any OpenClaw agent gets receipts, bound approvals and graduation. Not built yet.
- More money-saving skills with the same approval rules; real Gmail and Marketplace connectors behind the same policy.

## Links

- Demo URL: https://noctua-gkbv.onrender.com (Render free web service, live Nebius inference; verified end to end on 2026-10-29. Free instances sleep after ~15 idle minutes, so the first load can take up to a minute, and data resets on restart.)
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
- 💡 We built the Muse Replay as a small, deterministic test suite for always-on agents (lowball acceptance, address
  disclosure, safe reply still requires approval). Shipping something like it as a standard check for Personal AI
  projects on Token Factory would make safety claims comparable across submissions.

## Checklist before submitting

- [x] Add `NEBIUS_API_KEY` to `.env.local`; confirm model IDs against `/models` (done 2026-10-29).
- [ ] Confirm prices on the Token Factory pricing page; update `NEBIUS_PRICING` if they differ.
- [x] `npm run smoke:live` → PASS (Nemotron 3 Super, 678 ms).
- [x] `npm run eval` with the key → live results recorded in EVALUATION.md and above.
- [ ] Record the video from DEMO_SCRIPT.md using a live run.
- [x] Publish the repository (https://github.com/Aaditya1273/Noctua).
- [x] Deploy and verify a public demo URL (https://noctua-gkbv.onrender.com).
- [x] Feedback section written from the live run.
