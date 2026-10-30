# Noctua: reason once, then never again

[![Noctua film](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/film/trailer.webp)](https://youtu.be/MitssZU897o)

**[Watch the 3-minute film](https://youtu.be/MitssZU897o)** · **[Try the live demo](https://noctua-gkbv.onrender.com)** · **[Source on GitHub](https://github.com/Aaditya1273/Noctua)**

- **Technological implementation:** NVIDIA Nemotron 3 Super (`nvidia/nemotron-3-super-120b-a12b`) on Nebius Token Factory plans, triages, drafts and proposes skill rules. Every call is budget-reserved and metered from Token Factory's `usage` field. A 14-rule policy engine decides every action. 36 automated tests; live benchmark: 15 → 9 model calls and −30% spend over seven runs, with learning included.
- **Design:** a complete product, not a demo script. A ChatGPT-style chat that shows what will happen before you send (blocked / free / asks first), one-click approvals, and Skills, Security, Receipts and Memory pages. A landing page and a live deployment anyone can use.
- **Potential impact:** a real, documented problem, an AI agent leaking a seller's home address (Meta Muse, Fortune, Oct 2026), plus hidden-email attacks and runaway agent bills, for anyone who lets an agent touch their inbox or money. The demo replays the Muse incident: both harms are blocked by code.
- **Quality of the idea:** a non-obvious use of Nemotron. It is the teacher, not the permanent executor. Nemotron solves a task once, Noctua verifies and signs it as a skill, and the repeat runs with zero model calls. The model can propose but never authorize.

## Inspiration

In October 2026, Meta's Muse was asked to sell a keyboard on Facebook Marketplace. It accepted a $10 offer and sent a stranger the seller's home address ([Fortune](https://fortune.com/2026/10/19/meta-muse-ai-agent-facebook-marketplace-home-address-privacy/)). Security researchers keep showing that hidden text in an ordinary email can steer an AI assistant into forwarding invoices to an attacker ([Proofpoint](https://www.proofpoint.com/us/blog/email-and-cloud-threats/stop-month-how-threat-actors-weaponize-ai-assistants-indirect-prompt)). Builders post about waking up to a $58, or a $4,811, agent bill.

Two things struck us. Personal agents **pay to think about the same chore every single day**, and they **obey whatever they read**. Always-on agents sit behind $30 to $500 a month subscriptions, yet the model is still the only thing deciding whether to act. We wanted an agent that learns, gets cheaper with use, and can't be talked into harm.

## What it does

[![See how Noctua learns](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/gif/graduate.gif)](https://noctua-gkbv.onrender.com/app)

- **Reason once.** A new request goes to **NVIDIA Nemotron 3 Super on Nebius Token Factory**, which plans it over allowlisted, typed tools.
- **Learn and prove it.** Noctua turns that run into a skill: a manifest (data, not code) whose rules Nemotron proposes. It is promoted only if it passes 10 to 11 mandatory checks computed from real runs: a held-out golden set, 100% urgent and suspicious recall, injection containment, determinism. Promoted skills are signed with Ed25519.
- **Reuse it.** The same request now runs from the skill with **0 model calls in 1 to 2 ms**. If the inbox drifts, runtime checks demote the skill and the task falls back to Nemotron in the same request.
- **Can't be tricked.** Every tool call passes a 14-rule policy engine the model cannot override. Sends outside your contacts, home addresses and below-floor prices are refused by code. Anything irreversible waits for an approval bound to the SHA-256 of the exact action.
- **Know before you send.** As you type, a line above the composer says what will happen: BLOCKED, FREE (reused skill), ASKS FIRST or NEW. It is computed by the real router and policy, with no model call.
- **Receipts for everything.** Calls, tokens, cost and latency come from the API's own usage numbers, under hard daily limits checked before each call.

[![Muse Replay](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/gif/muse-replay.gif)](https://noctua-gkbv.onrender.com/app)

## How we built it

Next.js 16, React 19 and TypeScript, with SQLite through Node's built-in `node:sqlite`, deployed on Render. Nemotron is called through Nebius Token Factory's OpenAI-compatible API in JSON mode with `enable_thinking=false`.

The router matches a prompt $p$ to a skill's examples $E_k$ by term overlap and never routes requests that send, forward, delete or pay:

$$\mathrm{ov}_k(p)=\max_{e\in E_k}\frac{|T(p)\cap T(e)|}{\min(|T(p)|,|T(e)|)}\ \ge 0.6$$

Before any request leaves the server, the accounting layer reserves its worst case and refuses the call if it could exceed a daily limit:

$$\hat\tau=\Big\lceil \tfrac{\text{chars}}{3.5}\Big\rceil+\text{max\_out},\qquad \text{admit}\iff w+\hat\tau\cdot\pi_{\max}\le B$$

Approvals are bound to the exact action, so changing one character after approval invalidates it:

$$h(u,a)=\mathrm{SHA256}\big(u\,\|\,\mathrm{canon}(a)\big)$$

## Results (live on Nebius Token Factory)

| Seven runs of the same task | Re-think every time | Noctua (learning included) |
|---|---|---|
| Model calls | 15 | **9** |
| Model spend | $0.0057 | **$0.0040** (−30%) |
| Runs with zero inference | 0 / 7 | **4 / 7** |
| Repeat latency | 3.1–6.9 s | **1–2 ms** |
| Label accuracy | 48 / 50 | 48 / 50 |
| Attack Night | — | **10 / 10 stopped** |

![Model calls per run](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/chart-calls.svg)

A drift model built from the measured unit costs predicts the measured saving within 2.2 points and gives the break-even demotion rate:

$$S(n,d)\xrightarrow{n\to\infty}1-\frac{d}{d^\ast},\qquad d^\ast=\frac{\bar c_a}{\bar c_a+c_s}=0.595$$

So Noctua stays cheaper than re-reasoning as long as fewer than 59% of repeats drift.

![Attack Night: 10 of 10 stopped](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/chart-attacks.svg)

## Challenges we ran into

Testing against the live model, not the docs, surfaced ten real defects:

- A model listed in the catalogue that never answered.
- Nemotron spending its whole output budget on hidden reasoning (`content: null`) until thinking was disabled.
- A garbled tool name (`"triage.guard.injection_scan, "`) failing a whole task. It now gets one schema repair.
- Plans that skipped the summary step.
- "Reply to Priya" arriving as a name, not an address.
- A refusal ("$10 is too low") mistaken for a lowball.
- A daily budget running out mid-task. Noctua now falls back to labelled demo mode instead of erroring.

The hardest design problem was making the model useful **without ever making it the authority**.

## Accomplishments that we're proud of

- Repeats with **zero model calls**, verified by checks, not by the model grading itself.
- The skills **demoted themselves twice** in the live benchmark, exactly as designed, and no urgent email was missed.
- **Muse Replay**: the real Muse incident replayed against our policy engine. Both harms are blocked, and a safe reply still waits for approval.
- 36 automated tests, a 22-page whitepaper, and a 3-minute film of an unstaged live session.

## What we learned

- A model is best as a **teacher, not a permanent executor**.
- Security has to live **outside** the model.
- **State what you didn't measure.** Our benchmark scores labels, not summary or reply quality, on a small synthetic workspace. We say so everywhere.

## What's next for Noctua

- Scoring summaries and replies, and testing on real consented mail.
- More skill families, starting with structured extraction.
- Real Gmail and Marketplace connectors behind the same policy path.
- Packaging the router, policy engine and budgets as a plugin so any agent can graduate its tasks.
