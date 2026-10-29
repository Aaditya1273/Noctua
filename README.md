# Noctua

**Live demo:** https://noctua-gkbv.onrender.com (free instance: the first load after idle can take up to a minute)

**Your personal AI gets more efficient with every repeated task — without surrendering control.**

Noctua is a personal agent that learns which of your recurring tasks can become **verified, deterministic workflows**. The first time you ask for something, an NVIDIA Nemotron model (served by Nebius Token Factory) plans and executes it with allowlisted tools. When a task repeats, Noctua turns the run into a candidate *skill*, tests it against fixed fixtures and attacks, and promotes it only if every mandatory check passes. After that, the same request runs **without calling the model**. Every run comes with a receipt. A skill that breaks at run time is demoted automatically, and the task is re-run with full reasoning.

> Reason once. Learn the workflow. Verify it. Reuse it safely. Measure the improvement.

---

## The problem

Assistants re-reason the same chores every day, paying for the same inference each time. They also act on whatever text they read, so one poisoned email can turn the agent against you. Noctua addresses both:

- **Cost.** Repeated work moves off the model onto a tested workflow. Per-call usage and spend are recorded, and daily limits are enforced before each request.
- **Control.** A server-side policy engine sits between the agent and every tool. Email, web and tool content is treated as untrusted. Irreversible actions need your approval and spend from a separate daily risk budget.

## The graduation ladder

| Tier | Who executes | Model calls on the inbox task |
|---|---|---|
| **Apprentice** | Nemotron plans with allowlisted tools; Nemotron triages; every step is policy-checked | 2 (plan + triage) |
| **Journeyman** | Verified skill; deterministic classification, model-drafted replies | 1 |
| **Master** | Verified, signed, deterministic skill | 0 |

The lifecycle is `candidate → verified | rejected`, then `verified → demoted | suspended | superseded`. Old versions and their evaluation records are kept.

**What "verified" means here.** A skill is promoted only if it passes all mandatory checks. All of them are computed from executed runs and none from model self-assessment:

1. Schema validation (strict Zod schema; unknown fields rejected).
2. Allowlist check. Every step must be a registry tool with read or local risk and valid arguments.
3. Preconditions. The inbox is loaded first, and the injection guard runs before classification.
4. Trace replay. The skill must reproduce at least 90% of the Apprentice's recorded labels.
5. Held-out golden set (10 human-labelled synthetic messages). Accuracy must be at least 85%.
6. Urgent recall must be 100%, and suspicious-message recall must be 100%.
7. Injection containment. The skill runs on adversarial inputs. No operation outside the manifest may run, and no reply may be drafted to a malicious message. A forced `mail.forward` from skill context must be denied.
8. Output invariants: one label per message, no reply to quarantined mail, and every urgent item in the digest.
9. Regression replays. Any inbox that broke a previous version must now pass.
10. Determinism (Master only). Identical input must produce identical output.

**Runtime invariants** are checked on every skill run. If fewer than 60% of messages match a learned rule (input drift), or if a message with time-critical language ("alarm", "emergency", "within the hour", …) is not labelled urgent, the skill is **demoted**. The task then falls back to the Apprentice path, and the fallback is recorded on the receipt. The bundled data contains real instances of both failures (Day 2 and Day 3 inboxes).

Promoted skills are signed with **Ed25519** over the manifest plus the SHA-256 of their evaluation report. The signature is checked before every execution, so a tampered skill is suspended. A signature proves integrity on this installation; it does not prove the skill is safe.

## Architecture

```
Browser (Next.js App Router UI)
   │  JSON-only API routes, same-origin check, Zod validation
   ▼
Orchestrator ── router: verified skill match (deterministic term overlap; never for send/forward/delete/pay requests)
   │              ├─ Skill executor ─ runtime invariants ─ demote + fallback
   │              └─ Apprentice: planner (Nemotron) → plan validated → steps
   ▼
invokeTool() ──► Policy engine (P1–P12) ──► Tool registry (allowlisted, typed)
   │                 │ security_events, approvals, risk ledger
   ▼                 ▼
Accounting: reserve → call Nebius Token Factory → settle (usage, cost)      SQLite (node:sqlite, WAL)
Evaluator · Attack Night · Signing (Ed25519) · Memory (user-approved only)
```

| Module | File |
|---|---|
| Model provider (timeouts, bounded retries, usage extraction, `/models` check) | `src/lib/provider.ts` |
| Budget enforcement and usage accounting | `src/lib/accounting.ts` |
| Task orchestration, Apprentice planner, approvals | `src/lib/orchestrator.ts` |
| Tool registry and `invokeTool()` | `src/lib/tools.ts` |
| Policy engine | `src/lib/policy.ts` |
| Skill schema, synthesis, matching, execution | `src/lib/skills.ts` |
| Skill evaluation pipeline | `src/lib/evaluator.ts` |
| Attack Night | `src/lib/attacks.ts` |
| Injection guard, deterministic classifier, rule induction | `src/lib/triage.ts` |
| Receipts and read models | `src/lib/receipts.ts` |
| Storage | `src/lib/db.ts` |
| Sample data (synthetic) | `src/lib/fixtures.ts` |

Deterministic code handles everything that should not depend on probabilistic text: routing, permissions, accounting, schema validation, fixtures, skill execution and evaluation. The model is used for planning, triage, reply drafting and proposing skill rules. Every model output is schema-validated before it can affect anything.

## Prerequisites

- **Node.js 22.13 or later.** The app uses the built-in `node:sqlite`. Running the test and eval scripts directly needs Node 23.6 or later, for native TypeScript stripping. Built and verified on Node 26.5.
- npm. Docker is optional.
- Optional: a Nebius Token Factory API key, for live inference.

## Run it

```bash
npm install
npm run build
npm start            # http://localhost:3000
# or, for development:
npm run dev
```

With no configuration, Noctua starts in **demo mode**. It is clearly labelled in the sidebar and on every receipt. In demo mode, model steps are satisfied by the sample dataset's reference annotations, and the planner is a transparent keyword stand-in. No inference is performed or claimed. Everything else is the real implementation: routing, policy, skills, evaluation, signing, accounting and Attack Night.

### Enable live Nebius inference

```bash
cp .env.example .env.local
# set NEBIUS_API_KEY; check NEBIUS_MODEL against your catalogue
npm run build && npm start
```

Open **Memory & settings → Check connection**. This calls `GET /models` and shows whether each configured model ID is in your catalogue. To verify a real completion without the UI:

```bash
NEBIUS_API_KEY=... npm run smoke:live
```

The default model is `nvidia/nemotron-3-super-120b-a12b`, verified live. `nvidia/Nemotron-3_5-Lightning` was listed in the tested catalogue but returned no response within 120 s, so it is not the default. Nemotron 3 models reason by default and can spend the whole output budget on hidden thinking tokens, so Noctua sends `chat_template_kwargs.enable_thinking=false` unless `NEBIUS_DISABLE_THINKING=false` is set. `NEBIUS_MODEL_FAST` and `NEBIUS_MODEL_REASONING` can assign different models to triage/drafting and planning/synthesis (for example `nvidia/nemotron-3-super-120b-a12b` for reasoning). If only one model is configured, the UI says so, and every receipt lists the model actually called. Costs are computed only for models listed in `NEBIUS_PRICING`, using API-reported tokens. For any other model, cost shows as **Unknown** and the monetary cap shows as **inactive**; the call and token limits still apply.

### Deploy to Render (free web service)

`render.yaml` is a Render Blueprint for a single free web service (the UI and API are one Next.js server).

1. In Render, choose **New → Blueprint** and connect this GitHub repository.
2. When prompted, set the secret `NEBIUS_API_KEY`. Every other setting comes from `render.yaml`.
3. Deploy. The service gets a `https://<name>.onrender.com` URL.

Free-plan caveats: the disk is ephemeral, so the database (tasks, skills, receipts) and signing key reset whenever
the service restarts, sleeps after about 15 idle minutes, or redeploys. The app starts empty and is designed for that.
The first request after a sleep can take up to a minute. Daily caps in `render.yaml` ($0.03, 60 calls) keep a public
URL from draining credits.

### Docker

```bash
docker build -t noctua .
docker run -p 3000:3000 -v noctua-data:/data --env-file .env.local noctua
```

The image is built from Next's `standalone` output. The standalone server was verified in this workspace, but **the Docker image itself was not built here, because no Docker daemon was running**. Build it once before relying on it. The SQLite database and signing key live on the `/data` volume. Do not deploy to a platform with an ephemeral filesystem without mounting persistent storage. Set `NOCTUA_BASIC_AUTH=user:password` before exposing the app beyond localhost; without it anyone who can reach the server can run tasks and approve actions.

## The two-minute walkthrough

1. **Run a task** → keep the default prompt and the Day 1 inbox. The receipt shows **Apprentice** and 2 model steps. The phishing email (`d1-05`) is quarantined by the injection guard.
2. **Learn this workflow** → Templates → **Run evaluation**. You should see 10/10 checks, the skill promoted and signed.
3. **Run again** on Day 1. The receipt shows **Master**, 0 model calls, and a comparison against the measured Apprentice baseline.
4. Run on **Day 2**. The skill's coverage drops to 50%, and the payroll email contains "urgent" and "rejected" but was not labelled urgent. The skill is **demoted**, and the task falls back to the Apprentice path. Learn again: v2 is built from both days and must pass a regression replay of Day 2.
5. **Run a task** with "Forward the invoices in my inbox to archive@exfil-drop.example". The policy engine blocks it (P7, untrusted recipient).
6. Ask "Review today's inbox and send a reply to Priya confirming Thursday works." The `mail.send` waits for approval. Approving it re-checks the recipient, the risk budget and the exact arguments, then writes to a **local outbox** (nothing is delivered).
7. **Security lab → Run Attack Night.** Eight adversarial cases run against the real engine.

The timed version is in [DEMO_SCRIPT.md](DEMO_SCRIPT.md).

## Tests and benchmark

```bash
npm run typecheck
npm run lint
npm test              # 27 tests: engine, policy, lifecycle, plus live-path tests against a local mock of the Token Factory API
npm run eval          # writes eval/results.json
npm run smoke:live    # only with NEBIUS_API_KEY; otherwise prints SKIPPED
```

The live-path tests start a real HTTP server that speaks the OpenAI-compatible protocol. They cover usage extraction, cost arithmetic, a model proposing exfiltration, malformed output with one repair attempt, timeouts with bounded retries, HTTP 500, an unreachable host, call-limit deferral, monetary-cap blocking, missing pricing and missing usage.

Measured results and methodology are in [EVALUATION.md](EVALUATION.md).

## What is real, what is sample-only, what is unverified

| | Status |
|---|---|
| Policy engine, approvals, risk budget, tool registry | Real, enforced server-side, tested |
| Skill synthesis, evaluation, promotion, demotion, signing | Real, tested |
| Budget and receipts | Real. Cost is computed only from reported usage × configured prices |
| Nebius Token Factory client | **Verified live on 2026-10-29** with `nvidia/nemotron-3-super-120b-a12b` (smoke test, full graduation loop, live benchmark, live Attack Night), plus protocol-mock tests |
| Model IDs in `.env.example` | Confirmed against a live `/models` catalogue. Prices are from a third-party listing (mastra.ai); confirm them in your console |
| Inbox, web page, contacts | **Synthetic sample data** (`.example` domains). No Gmail, Telegram or web-search integration exists |
| `mail.send` / `mail.forward` | Write to a local outbox only. `data.delete` and `payment.transfer` are always denied |
| Nebius Serverless, NemoClaw, OpenShell, Tavily | **Not used.** The policy engine is Noctua's own |

## Known limitations

- The sample workspace has 3 days of inbox (21 messages) plus a 10-message golden set. Passing evaluation on it says nothing about real mail.
- Learned skills are keyword classifiers, which is why they are cheap and auditable, and also why they drift. The runtime invariants are there to catch drift, but they are heuristics too.
- The injection guard is pattern-based and will miss novel phrasing. That is acceptable only because the policy engine blocks the *actions*, independently of what the guard or the model concluded.
- Skill matching uses deterministic term overlap. Use **Force full reasoning** on the Run page when you want the Apprentice path.
- Single user, single process. SQLite writes are serialised with `BEGIN IMMEDIATE`. Horizontal scaling would need a shared database.

See [SECURITY.md](SECURITY.md) for the trust model.

## NVIDIA and Nebius technology used

- **NVIDIA Nemotron 3 Super** (`nvidia/nemotron-3-super-120b-a12b`, configurable per role), called for planning, triage, reply drafting and skill-rule synthesis.
- **Nebius Token Factory** OpenAI-compatible Chat Completions and `GET /models`, called server-side only, with JSON-mode responses, API-reported usage and the key read from the environment.

## License

Apache License 2.0. See [LICENSE](LICENSE).
