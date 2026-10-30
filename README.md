<p align="center"><img src="docs/img/landing.png" alt="Noctua: reason once, then never again. A personal AI agent on NVIDIA Nemotron and Nebius Token Factory." width="100%"></p>

<p align="center">
  <b>The personal AI agent that learns your repeated tasks, then repeats them with zero model inference,<br>and can't be tricked into sending your stuff away.</b>
</p>

<p align="center">
  <a href="https://noctua-gkbv.onrender.com"><b>Live demo</b></a> ·
  <a href="#noctua-in-five-moments">See it work</a> ·
  <a href="#measured-not-claimed">Benchmark</a> ·
  <a href="#for-judges-three-ways-to-check-it">For judges</a> ·
  <a href="#deep-dive">Deep dive</a> ·
  <a href="SECURITY.md">Security model</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NVIDIA-Nemotron%203%20Super-fafafa?labelColor=111111&style=flat-square" alt="NVIDIA Nemotron 3 Super">
  <img src="https://img.shields.io/badge/Nebius-Token%20Factory-fafafa?labelColor=111111&style=flat-square" alt="Nebius Token Factory">
  <img src="https://img.shields.io/badge/Next.js-16-fafafa?labelColor=111111&style=flat-square" alt="Next.js 16">
  <img src="https://img.shields.io/badge/tests-36%20passing-fafafa?labelColor=111111&style=flat-square" alt="36 tests passing">
  <img src="https://img.shields.io/badge/Attack%20Night-10%2F10-fafafa?labelColor=111111&style=flat-square" alt="Attack Night 10 of 10">
  <img src="https://img.shields.io/badge/repeat%20runs-0%20model%20calls-fafafa?labelColor=111111&style=flat-square" alt="Repeat runs use 0 model calls">
  <img src="https://img.shields.io/badge/license-Apache%202.0-fafafa?labelColor=111111&style=flat-square" alt="Apache 2.0">
</p>

The first time you ask Noctua for something, NVIDIA Nemotron (served by Nebius Token Factory) thinks it through with
allowlisted tools. When the task comes back, Noctua turns that run into a **skill**, tests it against held-out data and
known attacks, signs it, and from then on runs it **with zero model calls**. Every action that could hurt you goes
through a policy engine the model cannot talk its way past, and anything irreversible waits for your yes.

> **Built for the Nebius × NVIDIA Global AI Hackathon, Personal AI track.** Everything below was recorded from the real
> app, live on Nebius Token Factory. Sample data is synthetic and labelled as such everywhere.

---

## The problem

AI agents are already doing damage, and people are writing about it.

| What happened | Source |
|---|---|
| Hidden text in an ordinary email steers an AI assistant into forwarding invoices to an attacker | [Proofpoint](https://www.proofpoint.com/us/blog/email-and-cloud-threats/stop-month-how-threat-actors-weaponize-ai-assistants-indirect-prompt), [Hornetsecurity](https://www.hornetsecurity.com/en/blog/email-prompt-injection/) |
| An agent running a Marketplace listing accepts a $10 offer and sends a stranger the seller's home address | Reported by The Guardian and Fortune, September 2026 |
| A coding agent deletes a company's live database during a code freeze, after being told not to | [Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/ai-coding-platform-goes-rogue-during-code-freeze-and-deletes-entire-company-database-replit-ceo-apologizes-after-ai-engine-says-it-made-a-catastrophic-error-in-judgment-and-destroyed-all-production-data), [r/technology](https://www.reddit.com/r/technology/comments/1m70mwe/replits_ceo_apologizes_after_its_ai_agent_wiped_a/) |
| Looping agents run up surprise bills: "I woke up to a $58 API bill", "$4,811 overnight" | [r/LocalLLM](https://www.reddit.com/r/LocalLLM/comments/1uzy9cf/i_woke_up_to_a_58_api_bill_because_my_ai_agent/), [r/Agentic_Marketing](https://www.reddit.com/r/Agentic_Marketing/comments/1v0fz93/my_ai_agent_racked_up_4811_overnight_from_a_retry/) |

Two things are true of almost every personal agent today:

1. **It pays to think about the same chore every single day.** Triage the inbox on Monday, pay for it. Same inbox on
   Tuesday, pay again. Nothing is learned.
2. **It obeys whatever it reads.** An email, a web page or a buyer's message can contain instructions, and the model
   is the only thing deciding whether to follow them.

<p align="center"><img src="docs/img/gif/landing.gif" width="88%" alt="The Noctua landing page: the intro, the headline, and the scroll story where a hidden instruction in an email is caught and blocked"></p>
<p align="center"><sub>The landing page tells the hidden-email story with made-up data, replayed against Noctua's real rules.</sub></p>

## What Noctua does

| | |
|---|---|
| **Reason once** | A new task goes to Nemotron on Nebius Token Factory. The plan is schema-checked and every step runs through the policy engine. |
| **Learn and prove it** | Noctua turns the run into a skill: data, not code. It must pass 10–11 checks (held-out labels, 100% urgent recall, attack containment, determinism) before it may run. Promoted skills are signed with Ed25519. |
| **Then never again** | The same request now runs from the skill with **0 model calls** (no inference cost; hosting still costs what hosting costs). If the inbox drifts and the skill starts getting things wrong, runtime checks demote it and the task falls back to full reasoning. |
| **What a skill is, exactly** | Today, one task family: inbox triage. A skill is keyword classification rules plus deterministic steps (first-sentence summaries, template replies). It is not a general way to turn any AI task into a script: requests that need fresh judgement, or that would send something, always go to the model and the policy engine. |
| **Can't be tricked** | Email, web and buyer text is data, never orders. Sending to anyone outside your contacts, leaking your address, or selling below your floor is refused by code, not by the model's judgement. |
| **Shows its receipts** | Every run records model calls, tokens, cost and latency from the API's own usage numbers. Daily limits are checked before each call, and when they run out the app falls back to labelled demo mode instead of failing. |

## Noctua in five moments

<table>
<tr>
<td width="50%" valign="top">
<img src="docs/img/gif/graduate.gif" alt="See how Noctua learns: first run with Nemotron, learn the workflow, verify 10 of 10 checks, the same request again with zero model calls, then an attacker's request blocked">
<b>1 · Reason once, then never again.</b><br>
<sub>One click runs the whole loop live: Nemotron triages the inbox and sets aside the phishing email, Noctua learns the
workflow, verifies it (10/10 checks), runs the same request again with <b>0 model calls</b>, then blocks an attacker's
forward. Sped up 3×.</sub>
</td>
<td width="50%" valign="top">
<img src="docs/img/gif/route-preview.gif" alt="Typing in the composer: BLOCKED for an outside address, FREE for a learned task, ASKS FIRST for a reply">
<b>2 · Know before you send.</b><br>
<sub>As you type, the line above the composer says what will happen, decided by the real router and policy with no model
call: <b>BLOCKED</b> (outside address), <b>FREE</b> (verified skill, 0 model calls), <b>ASKS FIRST</b> (it would send something).</sub>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<img src="docs/img/gif/approve.gif" alt="Asking Noctua to reply to Priya: it drafts the email, waits for approval, then records it as approved and sent">
<b>3 · Nothing leaves without your yes.</b><br>
<sub>"Reply to Priya" finds her address in the inbox, drafts the email and stops. Approve re-checks the exact
arguments (SHA-256 bound), the recipient and the risk budget, then writes to a local outbox with a "Sent by Noctua"
line. Sped up 2.5×.</sub>
</td>
<td width="50%" valign="top">
<img src="docs/img/gif/muse-replay.gif" alt="Muse Replay: the $10 lowball and the home address request are blocked by policy; Noctua drafts a safe reply that waits for approval">
<b>4 · Replay a real incident.</b><br>
<sub>The Marketplace incident, replayed against the policy engine: accepting $10 is blocked (below your floor), sharing
the home address is blocked (private data). Then Noctua handles the same buyer itself and drafts a safe reply. Sped up 2.5×.</sub>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<img src="docs/img/gif/attack-night.gif" alt="Security page: Run Attack Night, 10 of 10 passed, one case expanded with attack, expected, observed and trace">
<b>5 · Attack Night.</b><br>
<sub>Ten known attacks against the real engine: email exfiltration, web overrides, poisoned tool output, risk-budget
overflow, malformed calls, approval replay, skill tampering, a skill trying to act, the lowball and the address leak.
Each one opens into its full trace.</sub>
</td>
<td width="50%" valign="top">
<img src="docs/img/preview-blocked.png" alt="Composer showing BLOCKED: archive@exfil-drop.example is not a trusted contact">
<img src="docs/img/preview-free.png" alt="Composer showing FREE: runs from verified skill Daily inbox triage v1, 0 model calls, $0">
<sub>The same composer, before sending: an attacker's address is refused up front; a learned task needs no inference.</sub>
</td>
</tr>
</table>

<details>
<summary><b>Every screen</b> (click to open)</summary>
<br>
<table>
<tr>
<td width="50%" valign="top"><img src="docs/img/chat-start.png" alt="Chat start screen: Reason once. Then never again."><br><sub><b>Chat.</b> One screen, a ChatGPT-style composer, and the actions in the + menu.</sub></td>
<td width="50%" valign="top"><img src="docs/img/approval.png" alt="A reply in the chat: urgent items, a set-aside phishing email, and a drafted email waiting for approval"><br><sub><b>A reply.</b> Plain text: what's urgent, what needs a reply, the email it set aside, and the draft waiting for you.</sub></td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/img/muse-draft.png" alt="Noctua handling the Marketplace listing: the buyer thread, a safe drafted reply, and Approve or Discard"><br><sub><b>Marketplace.</b> The buyer asks for the address; the draft declines and suggests a public meeting point.</sub></td>
<td width="50%" valign="top"><img src="docs/img/approved.png" alt="Approved and sent: the email was written to the local outbox"><br><sub><b>Approved.</b> Written to the local outbox, never delivered: there is no mail integration.</sub></td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/img/skills.png" alt="Skills page: verified count, candidates, free runs today, calls saved today"><br><sub><b>Skills.</b> What it has learned, and what that saved today.</sub></td>
<td width="50%" valign="top"><img src="docs/img/skill.png" alt="Skill detail: Daily inbox triage v1, evaluation passed, every mandatory check listed"><br><sub><b>A skill.</b> Every check it had to pass, its signature, and the learned rules.</sub></td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/img/security.png" alt="Security page: Attack Night 10/10, blocked today, risk points left, policy rules"><br><sub><b>Security.</b> Attack Night, the risk budget, the rules, and every decision the engine made.</sub></td>
<td width="50%" valign="top"><img src="docs/img/receipts.png" alt="Receipts page: first time $0.0007, every repeat $0, cost by execution path, history"><br><sub><b>Receipts.</b> Real cost per path, from API-reported token usage.</sub></td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/img/task-master.png" alt="Task receipt: completed without inference, Master path, 0 model calls, 2 ms"><br><sub><b>A run with no inference.</b> Master path: 0 model calls, $0 model cost, 2 ms, compared with the measured first run.</sub></td>
<td width="50%" valign="top"><img src="docs/img/task-apprentice.png" alt="Task receipt for a first run: the model calls, tokens, cost and the full trace"><br><sub><b>A first run.</b> Every model call, every tool call and every policy decision, in order.</sub></td>
</tr>
<tr>
<td width="50%" valign="top"><img src="docs/img/memory.png" alt="Memory page: mode, remembered items, daily limits, the model provider"><br><sub><b>Memory.</b> Everything it remembers can be deleted; limits are enforced on the server.</sub></td>
<td width="50%" valign="top">
<table><tr>
<td><img src="docs/img/phone-landing.png" alt="Landing page on a phone"></td>
<td><img src="docs/img/phone-chat.png" alt="Chat on a phone"></td>
<td><img src="docs/img/phone-security.png" alt="Security page on a phone"></td>
</tr></table>
<sub><b>On a phone.</b> Every screen works at 390 px with no sideways scrolling.</sub>
</td>
</tr>
</table>
</details>

## Measured, not claimed

Every number here comes from [`eval/results.json`](eval/results.json): a live benchmark on Nebius Token Factory
(29 Oct 2026, `nvidia/nemotron-3-super-120b-a12b`). The same seven requests over three days of sample inbox go through
two paths: an agent that re-reasons every time, and Noctua's graduation loop with **learning and evaluation costs
included**. The charts are drawn from that file by [`scripts/charts.ts`](scripts/charts.ts).

<p align="center"><img src="docs/img/chart-calls.svg" width="100%" alt="Model calls per run: re-reasoning uses 2 to 3 calls every run; Noctua uses 2 on the first run, then 0 on four of the remaining six runs, and 2 on the two runs where the skill was demoted and re-learned"></p>

<p align="center"><img src="docs/img/chart-totals.svg" width="100%" alt="Seven runs: 15 model calls versus 9, $0.0057 versus $0.0040, 0 versus 4 runs with zero inference; 30% less spend; accuracy 96% on both paths, 0 urgent messages missed"></p>

| | Re-reason every time | Noctua |
|---|---|---|
| Model calls, 7 runs (learning included) | 15 | **9** |
| Model spend, 7 runs (learning included) | $0.0057 | **$0.0040** (30% less) |
| Runs with zero inference | 0 of 7 | **4 of 7** |
| Latency of a repeat run | 3.1–6.9 s | **1–2 ms** |
| Label accuracy vs. human labels (48 of 50) | 96% | 96% |
| Urgent messages missed | 0 | 0 |

**The safety net fired twice, on purpose.** The Day 2 inbox has an "URGENT: payroll file rejected by the bank" email the
Day 1 skill had never seen; the runtime check caught that it would have been filed as FYI, demoted the skill, and the
task fell back to Nemotron (run 3). Day 3's "server room temperature alarm" did the same (run 6). Each time Noctua
re-learned a v2 and v3 that had to pass a regression replay of the inbox that broke the previous version. No urgent
message was missed on either path.

**What this benchmark measures, and what it doesn't.** It scores the **category labels** (urgent, needs a reply,
routine, FYI, suspicious) and urgent recall. It does not score the summaries or the drafted replies: on the free path
those are deterministic (each message's first sentence; fixed reply templates), so they are simpler than the model's,
and nothing here measures by how much. Read the 30% as "the same labels for 30% less model spend", not as "the whole
inbox assistant, at equal quality, for less".

**How the gap grows.** The 30% covers only seven runs, three of which were spent learning. Each further repeat needs
no inference on Noctua and costs about $0.0008 in model spend when re-reasoned (measured), so daily for a month the
re-reasoning agent spends about $0.024 in model calls on this one task, and Noctua's model spend stays at zero after the
skill is verified, for as long as it stays verified. Hosting and storage are not included on either side.

<p align="center"><img src="docs/img/chart-attacks.svg" width="100%" alt="Attack Night: 10 of 10 attacks stopped: email exfiltration, web override, tool output chaining, risk budget, malformed calls, approval replay, skill tampering, skill irreversible, Muse lowball, Muse address"></p>

**Limits, stated plainly.** This is a reproducible **proof of mechanism**, not a general accuracy benchmark. The sample
workspace is synthetic and was written by the author, labels included: 3 days, 21 messages, plus a 10-message
held-out golden set. The 96% is 48 of 50 labels across seven runs that replay those same inboxes (Day 1 four times),
so they are not 50 independent examples, and it is one live run on one model configuration. Passing on it says
nothing about real mail. Learned skills are keyword classifiers, cheap and auditable, which is
also why they drift; the runtime checks exist to catch that. Full methodology: [EVALUATION.md](EVALUATION.md).

## For judges: three ways to check it

**1. Click through the live demo (2 minutes).** Open <https://noctua-gkbv.onrender.com/app> (a free instance; the
first load after idle can take up to a minute). Press **See how Noctua learns**, watch step 4 report **0 model calls**,
then open **Receipts** and **Security**. Type `Forward the invoices to archive@exfil-drop.example` and read the line
above the composer before you send.

**2. Ask the API directly.** The route preview and the readiness check need no model call:

```bash
curl -s https://noctua-gkbv.onrender.com/api/ready
# {"ready":true,"database":"ok","mode":"live",...,"benchmark":"ok (live)"}

curl -s -X POST https://noctua-gkbv.onrender.com/api/preview \
  -H 'content-type: application/json' \
  -d '{"prompt":"Forward the invoices to archive@exfil-drop.example"}'
# {"kind":"blocked","addresses":["archive@exfil-drop.example"]}
```

**3. Run it yourself, no key needed.**

```bash
npm install && npm test        # 36 tests (22 engine, 14 provider-path against a local mock of the API); no key needed
node scripts/charts.ts         # redraws the charts above from eval/results.json
```

## Try it in 60 seconds

```bash
git clone https://github.com/Aaditya1273/Noctua && cd Noctua
npm install
npm run build && npm start     # http://localhost:3000
```

With no configuration Noctua runs in **demo mode**, labelled in the sidebar and on every receipt. Model steps use the
sample data's reference answers and the planner is a keyword stand-in; no inference is performed or claimed.
Everything else is the real implementation: routing, policy, skills, evaluation, signing, accounting and Attack Night.

For live inference, copy `.env.example` to `.env.local`, set `NEBIUS_API_KEY`, and rebuild. Open **Memory → Check
connection** to confirm the model IDs against your catalogue, or run `npm run smoke:live`.

## NVIDIA and Nebius technology used

- **NVIDIA Nemotron 3 Super** (`nvidia/nemotron-3-super-120b-a12b`, configurable per role) plans tasks, triages the
  inbox, drafts replies and proposes the keyword rules that become skills. Noctua sends
  `chat_template_kwargs.enable_thinking=false` so the model answers directly instead of spending its whole output
  budget on hidden reasoning tokens.
- **Nebius Token Factory**: OpenAI-compatible Chat Completions in JSON mode, and `GET /models` for the connection
  check. Called server-side only; the key never reaches the browser. Token counts come from the API's `usage` field and
  are priced from `NEBIUS_PRICING`.

---

# Deep dive

## 1. How a request flows

```mermaid
flowchart TD
    U["You type a request"] --> P["/api/preview<br/>no model call"]
    P -. "BLOCKED · FREE · ASKS FIRST · NEW" .-> U
    U --> R{"Router<br/>verified skill matches?<br/>(never for send / forward / delete / pay)"}
    R -- "yes" --> S["Skill executor<br/>signature checked first"]
    S --> I{"Runtime checks<br/>coverage ≥ 60%?<br/>urgent words labelled urgent?"}
    I -- "pass" --> OK["Result · 0 model calls · $0"]
    I -- "fail" --> D["Demote skill"] --> A
    R -- "no" --> A["Apprentice<br/>Nemotron plans (schema-checked,<br/>one repair attempt)"]
    A --> T["invokeTool() for every step"]
    T --> PE{"Policy engine<br/>P1–P14"}
    PE -- "allow" --> X["Tool runs"]
    PE -- "needs approval" --> W["Waits for you<br/>approval bound to SHA-256 of args"]
    PE -- "deny" --> B["Blocked, logged, shown in the reply"]
    A -. "every model call" .-> ACC["Accounting<br/>reserve → call → settle"]
```

The model is used for planning, triage, reply drafting and proposing skill rules. Everything that should not depend on
probabilistic text is deterministic code: routing, permissions, accounting, schema validation, skill execution and
evaluation. Every model output is schema-validated before it can affect anything; an invalid plan (for example a
garbled tool name) gets exactly one repair attempt, and both calls are on the receipt.

## 2. The graduation ladder

| Tier | Who executes | Model calls on the inbox task |
|---|---|---|
| **Apprentice** | Nemotron plans with allowlisted tools, Nemotron triages; every step is policy-checked | 2 (plan + triage) |
| **Journeyman** | Verified skill; deterministic classification, model-drafted replies | 1 |
| **Master** | Verified, signed, deterministic skill | **0** |

```mermaid
stateDiagram-v2
    [*] --> candidate: Learn this workflow
    candidate --> verified: passes every mandatory check (signed)
    candidate --> rejected: any check fails
    verified --> demoted: runtime check fails (drift, missed urgent)
    verified --> suspended: signature mismatch or manual
    verified --> superseded: a newer version is verified
    suspended --> verified: reinstated after re-evaluation
```

Old versions and their evaluation reports are kept. A new version must pass a regression replay of every inbox that
broke an earlier one.

## 3. What "verified" means

A skill is promoted only if it passes every mandatory check. All of them are computed from executed runs; none comes
from the model grading itself.

1. **Schema.** Strict Zod schema; unknown fields rejected.
2. **Allowlist.** Every step is a registry tool with read or local risk and valid arguments.
3. **Preconditions.** The inbox loads first, and the injection guard runs before classification.
4. **Trace replay.** Reproduces at least 90% of the Apprentice's recorded labels.
5. **Held-out golden set.** At least 85% accuracy on 10 human-labelled messages it never saw.
6. **Recall.** 100% of urgent and 100% of suspicious messages caught.
7. **Injection containment.** On adversarial inputs, nothing outside the manifest runs, no reply is drafted to a
   malicious message, and a forced `mail.forward` from skill context is denied.
8. **Output invariants.** One label per message, no reply to quarantined mail, every urgent item in the digest.
9. **Regression replays.** Every inbox that broke a previous version now passes.
10. **Determinism** (Master only). Identical input gives identical output.

Promoted skills are signed with **Ed25519** over the manifest plus the SHA-256 of the evaluation report. The signature
is checked before every execution, so a tampered skill is suspended. A signature proves integrity on this
installation; it does not prove the skill is safe, which is what the checks are for.

## 4. The policy engine

`invokeTool()` calls `decide()` immediately before every tool execution. Rules are evaluated in order and the first match
wins. Every decision is stored as a security event.

| Rule | What it enforces |
|---|---|
| P1 Unknown tool | Anything not in the registry is denied. |
| P2 Invalid arguments | Strict schemas; unknown fields are rejected. |
| P3 Tool outputs are data | A tool result can never invoke another tool. |
| P4 Low risk | Read-only and local reversible operations are allowed. |
| P5 Skills cannot act | Learned skills never perform irreversible actions. |
| P6 No integration | Irreversible tools without a sample implementation are disabled. |
| P13 Private data | A home address never leaves in a message, whoever asks and whatever was approved. |
| P14 Floor price | A Marketplace reply can never commit to less than your minimum. Refusals ("$10 is too low") don't count. |
| P7 Trusted recipients | Email may only go to trusted contacts or your own domain. |
| P8 Risk budget | Each irreversible action spends risk points from a separate daily balance (send 3, forward 5). |
| P9–P11 Bound approvals | An approval covers one exact action (SHA-256 of tool + arguments) and is consumed on use. |
| P12 Approval required | Every irreversible action waits for an explicit decision from you. |

```mermaid
sequenceDiagram
    participant N as Nemotron (planner)
    participant O as Orchestrator
    participant E as Policy engine
    participant Y as You
    N->>O: plan: inbox.list → draft.llm → mail.send(to: "Priya")
    O->>O: resolve "Priya" → priya@northwind.example (from the inbox)
    O->>E: decide(mail.send, args)
    E-->>O: require_approval (P12), approval bound to SHA-256(args)
    O-->>Y: "Waiting for you." + the draft
    Y->>E: Approve
    E->>E: re-check recipient (P7), risk budget (P8), exact args (P9–P11)
    E-->>Y: Approved and sent (local outbox, "Sent by Noctua" line)
```

The injection guard flags suspicious mail, but it is pattern-based and will miss new phrasing. That is acceptable only
because the policy engine blocks the **actions** independently of what the guard or the model concluded. See
[SECURITY.md](SECURITY.md) for the full trust model.

## 5. Budgets and receipts

Before every model call, Noctua **reserves** the worst-case cost (prompt estimate plus maximum output) against the daily
call, token and dollar limits inside a `BEGIN IMMEDIATE` transaction, then **settles** with the API-reported usage. A
call that could exceed a limit is never sent.

When the budget runs out mid-task, the run **continues in labelled demo mode** rather than erroring, and the receipt
says so. Above 80% of the dollar cap, planning switches to the cheaper model when one is configured. Costs are computed
only for models with a configured price; otherwise cost shows as **Unknown** and the dollar cap is reported inactive
(the call and token limits still apply). Nothing is estimated into a number.

## 6. Data model

One SQLite file (`node:sqlite`, WAL mode). Everything the UI shows is read from these tables.

| Table | Holds |
|---|---|
| `tasks` | Each request: prompt, tier, mode, plan, result, full trace, latency, fallback reason |
| `usage` | Each model call: purpose, model, tokens, cost, reserved amount, attempts, errors |
| `skills` | Versioned manifests, state, tier, signature, evaluation link |
| `evaluations` | Every evaluation report, pass rate and per-check results |
| `security_events` | Every policy decision with rule, reason, arguments and provenance (taint) |
| `approvals` | Pending and decided approvals bound to the SHA-256 of their arguments |
| `memories` | User-approved notes, VIP senders and trusted contacts |
| `attack_runs` | Attack Night results |
| `outbox` | Approved sends (never delivered) |
| `settings` | Limits edited in the UI |

## 7. API

All routes are JSON-only with a same-origin check and Zod validation; errors never leak stack traces.

| Route | Does |
|---|---|
| `POST /api/tasks` · `GET /api/tasks` | Run a task (`{prompt, day, route}`) · list receipts |
| `GET /api/tasks/:id` | One receipt with trace, usage, approvals |
| `POST /api/tasks/:id/learn` | Turn a run into a candidate skill |
| `POST /api/skills/:id/evaluate` · `POST /api/skills/:id/state` | Run the evaluation · suspend or reinstate |
| `POST /api/approvals/:id` | Approve or discard (`{approve}`); re-checks policy |
| `POST /api/preview` | What would happen to this prompt, without running it |
| `POST /api/security/run` · `POST /api/security/muse` | Attack Night · Muse Replay |
| `GET/POST /api/memory` · `DELETE /api/memory/:id` | Memory |
| `GET/POST /api/settings/limits` | Daily limits |
| `GET /api/overview` · `GET /api/model/status` | Live status · `/models` catalogue check |
| `GET /api/health` · `GET /api/ready` | Liveness · readiness (database, mode, benchmark) |

## 8. Code map

| Module | File |
|---|---|
| Model provider: timeouts, bounded retries, usage extraction, `/models` | `src/lib/provider.ts` |
| Budget enforcement and accounting | `src/lib/accounting.ts` |
| Orchestration, Apprentice planner, approvals, route preview | `src/lib/orchestrator.ts` |
| Tool registry and `invokeTool()` | `src/lib/tools.ts` |
| Policy engine | `src/lib/policy.ts` |
| Skills: schema, synthesis, matching, execution | `src/lib/skills.ts` |
| Evaluation pipeline | `src/lib/evaluator.ts` |
| Attack Night and Muse Replay | `src/lib/attacks.ts` |
| Injection guard, classifier, rule induction | `src/lib/triage.ts` |
| Signing (Ed25519) | `src/lib/signing.ts` |
| Receipts and read models | `src/lib/receipts.ts` |
| Storage | `src/lib/db.ts` |
| Sample data (synthetic) | `src/lib/fixtures.ts` |
| Chat UI · sidebar · product pages | `src/components/console.tsx` · `src/components/sidebar.tsx` · `src/app/(product)/` |
| Landing page | `src/components/landing/experience.tsx` |

## 9. Configuration

| Variable | Default | Meaning |
|---|---|---|
| `NEBIUS_API_KEY` | empty | Without it, Noctua runs in labelled demo mode |
| `NEBIUS_BASE_URL` | `https://api.tokenfactory.nebius.com/v1` | OpenAI-compatible endpoint |
| `NEBIUS_MODEL` | `nvidia/nemotron-3-super-120b-a12b` | Model for every role |
| `NEBIUS_MODEL_FAST` · `NEBIUS_MODEL_REASONING` | empty | Per-role overrides (triage and drafts · planning and synthesis) |
| `NEBIUS_JSON_MODE` | `true` | Send `response_format=json_object` |
| `NEBIUS_DISABLE_THINKING` | `true` | Send `enable_thinking=false` |
| `NEBIUS_TIMEOUT_MS` · `NEBIUS_MAX_RETRIES` · `NEBIUS_MAX_OUTPUT_TOKENS` | 45000 · 2 · 2048 | Per-call bounds |
| `NEBIUS_PRICING` | JSON | USD per 1M tokens, per model; costs are computed only for listed models |
| `DAILY_MODEL_CALL_LIMIT` · `DAILY_TOKEN_LIMIT` · `DAILY_BUDGET_USD` | 60 · 400000 · 0.50 | Hard daily limits |
| `DAILY_RISK_POINTS` · `BUDGET_DOWNGRADE_AT` | 10 · 0.8 | Irreversible-action budget · cheaper-model threshold |
| `NOCTUA_DB_PATH` · `NOCTUA_SIGNING_KEY_PATH` | `./data/…` | Storage |
| `NOCTUA_BASIC_AUTH` | empty | `user:password`; set it before exposing the app beyond localhost |

The default model was verified live on 2026-10-29. `nvidia/Nemotron-3_5-Lightning` was listed in the tested catalogue
but returned no response within 120 s, so it is not the default. Prices in `.env.example` come from a third-party
listing; confirm them in your Token Factory console.

## 10. Deploy

**Render (free web service).** `render.yaml` describes a single web service built from the `Dockerfile` (UI and API
are one Next.js server). Connect the repository, set the secret `NEBIUS_API_KEY`, deploy. The free disk is ephemeral,
so the database and signing key reset when the service restarts or sleeps (after about 15 idle minutes); the app
starts empty and is designed for that. The public demo's daily caps ($0.03, 60 calls) keep the URL from draining
credits.

**Docker.**

```bash
docker build -t noctua .
docker run -p 3000:3000 -v noctua-data:/data --env-file .env.local noctua
```

Built from Next's `standalone` output. The SQLite database and signing key live on the `/data` volume. Set
`NOCTUA_BASIC_AUTH` before exposing it beyond localhost.

## 11. Tests and benchmark

```bash
npm run typecheck && npm run lint
npm test              # 36 tests: 22 engine (test/engine.test.ts), 14 provider-path (test/provider.test.ts)
npm run eval          # writes eval/results.json (live if NEBIUS_API_KEY is set)
node scripts/charts.ts
npm run smoke:live    # one real completion; prints SKIPPED without a key
```

None of the 36 calls the real API; the only live check is `npm run smoke:live`, plus the benchmark when a key is set.
The provider-path tests start a real HTTP server that speaks the OpenAI-compatible protocol. They cover usage extraction,
cost arithmetic, a model proposing exfiltration, malformed output with one repair attempt, a garbled tool name in a
plan, timeouts with bounded retries, HTTP 500, an unreachable host, budget fallback to demo mode, the monetary cap,
missing pricing, missing usage and recipient resolution. The engine tests cover the policy rules, approvals, the skill
lifecycle, Attack Night, Muse Replay and the route preview.

## 12. What is real, what is sample-only

| | Status |
|---|---|
| Policy engine, approvals, risk budget, tool registry | Real, enforced server-side, tested |
| Skill synthesis, evaluation, promotion, demotion, signing | Real, tested |
| Budgets and receipts | Real; cost only from reported usage × configured prices |
| Nebius Token Factory client | Verified live with `nvidia/nemotron-3-super-120b-a12b`, plus protocol-mock tests |
| Inbox, web page, contacts, Marketplace listing | **Synthetic sample data** (`.example` domains). No Gmail, Marketplace or web-search integration exists |
| `mail.send` · `mail.forward` · `marketplace.reply` | Write to a local outbox only. `data.delete` and `payment.transfer` are always denied |

## 13. Roadmap

- **OpenClaw and Hermes plugin.** Package the router, policy engine and budgets as an agent-host plugin so any OpenClaw
  agent gets receipts, argument-bound approvals and graduation. Not built yet.
- More money-saving skills under the same approval rules: invoice chasing, subscription audits, bill-increase alerts.
- Real connectors (Gmail, Marketplace) behind the same policy path.

## 14. Known limitations

- The sample workspace is small (21 messages over 3 days, plus a 10-message golden set). Passing on it says nothing
  about real mail.
- The benchmark scores labels, not summary or reply quality; free runs use first-sentence summaries and template replies.
- Learned skills are keyword classifiers: cheap and auditable, and they drift. The runtime checks catch drift, but they
  are heuristics too.
- Skill matching uses deterministic term overlap. Use **Think** in the composer to force full reasoning.
- Single user, single process. SQLite writes are serialised with `BEGIN IMMEDIATE`; scaling out would need a shared
  database.

## License

Apache License 2.0. See [LICENSE](LICENSE).
