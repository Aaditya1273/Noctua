# Noctua: reason once, then never again

[![Noctua film](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/film/trailer.webp)](https://youtu.be/MitssZU897o)

**[Watch the 3-minute film](https://youtu.be/MitssZU897o)** · **[Try the live demo](https://noctua-gkbv.onrender.com)** · **[Source on GitHub](https://github.com/Aaditya1273/Noctua)**

- **Technological implementation:** NVIDIA Nemotron 3 Super (`nvidia/nemotron-3-super-120b-a12b`) on Nebius Token Factory plans, triages, drafts and proposes skill rules. Every call is budget-reserved and metered from Token Factory's `usage` field. A 14-rule policy engine decides every action. 36 automated tests; live benchmark: 15 → 9 model calls and −30% spend over seven runs, with learning included.
- **Design:** a complete product, not a demo script. A ChatGPT-style chat that shows what will happen before you send (blocked / free / asks first), one-click approvals, and Skills, Security, Receipts and Memory pages. A landing page and a live deployment anyone can use.
- **Potential impact:** a real, documented problem, an AI agent leaking a seller's home address (Meta Muse, Fortune, Oct 2026), plus hidden-email attacks and runaway agent bills, for anyone who lets an agent touch their inbox or money. The demo replays the Muse incident: both harms are blocked by code.
- **Quality of the idea:** a non-obvious use of Nemotron. It is the teacher, not the permanent executor. Nemotron solves a task once, Noctua verifies and signs it as a skill, and the repeat runs with zero model calls. The model can propose but never authorize.

## Inspiration

In October 2026, Meta's Muse was asked to sell a keyboard on Facebook Marketplace. It accepted a $10 offer and sent a stranger the seller's home address ([Fortune](https://fortune.com/2026/10/19/meta-muse-ai-agent-facebook-marketplace-home-address-privacy/)). Security researchers keep showing that hidden text in an ordinary email can steer an AI assistant into forwarding invoices to an attacker ([Proofpoint](https://www.proofpoint.com/us/blog/email-and-cloud-threats/stop-month-how-threat-actors-weaponize-ai-assistants-indirect-prompt)). Builders post about waking up to a $58, or a $4,811, agent bill.

[![One email can turn it against you](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/film/hook.webp)](https://youtu.be/MitssZU897o)
*One email can turn it against you: hidden text only the AI reads, and a careless agent that obeys.*

[![Meta's Muse said yes to a stranger](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/film/muse.webp)](https://youtu.be/MitssZU897o)
*Meta's Muse said yes to a stranger: the real Fortune article and Reddit threads.*

[![Deleted databases, surprise bills](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/film/bills.webp)](https://youtu.be/MitssZU897o)
*Deleted databases, surprise bills: real reports and threads, then the real price pages of always-on agents.*

Two things struck us. Personal agents **pay to think about the same chore every single day**, and they **obey whatever they read**. Always-on agents sit behind $30 to $500 a month subscriptions, yet the model is still the only thing deciding whether to act. We wanted an agent that learns, gets cheaper with use, and can't be talked into harm.

## What it does

[![Meet Noctua. Reason once. Then never again.](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/film/reveal.webp)](https://youtu.be/MitssZU897o)

- **Reason once.** A new request goes to **NVIDIA Nemotron 3 Super on Nebius Token Factory**, which plans it over allowlisted, typed tools.
- **Learn and prove it.** Noctua turns that run into a skill: a manifest (data, not code) whose rules Nemotron proposes. It is promoted only if it passes 10 to 11 mandatory checks computed from real runs: a held-out golden set, 100% urgent and suspicious recall, injection containment, determinism. Promoted skills are signed with Ed25519.
- **Reuse it.** The same request now runs from the skill with **0 model calls in 1 to 2 ms**. If the inbox drifts, runtime checks demote the skill and the task falls back to Nemotron in the same request.
- **Can't be tricked.** Every tool call passes a 14-rule policy engine the model cannot override. Sends outside your contacts, home addresses and below-floor prices are refused by code. Anything irreversible waits for an approval bound to the SHA-256 of the exact action.
- **Know before you send.** As you type, a line above the composer says what will happen: BLOCKED, FREE (reused skill), ASKS FIRST or NEW. It is computed by the real router and policy, with no model call.
- **Receipts for everything.** Calls, tokens, cost and latency come from the API's own usage numbers, under hard daily limits checked before each call.

## The film, chapter by chapter

Each still is a chapter of the [3-minute film](https://youtu.be/MitssZU897o), one real session recorded live on Nebius Token Factory on 30 Oct 2026.

[![Ask](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/film/ask.webp)](https://youtu.be/MitssZU897o)
**Ask** Nemotron reasons it through: urgent items, replies to draft, the phishing email set aside as data. First live run: 2 model calls, 1,929 tokens, $0.00095, 5.0 s.

[![Learn](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/film/learn.webp)](https://youtu.be/MitssZU897o)
**Learn** One click turns the run into a skill, a second runs the evaluation: 10 of 10 mandatory checks, signed with Ed25519, no model call.

[![Repeat](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/film/repeat.webp)](https://youtu.be/MitssZU897o)
**Repeat** The line above the composer predicts FREE before you send; the reply arrives with 0 model calls in 3 ms.

[![Guard](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/film/guard.webp)](https://youtu.be/MitssZU897o)
**Guard** Forwarding invoices to an outside address is flagged BLOCKED before you send, then refused by the policy engine (rule P7), not by the model.

[![Approve](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/film/approve.webp)](https://youtu.be/MitssZU897o)
**Approve** Anything that would send waits for you. The approval is bound to the SHA-256 of the exact email and re-checked when you click.

[![Muse said yes. Noctua says no.](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/film/muse-no.webp)](https://youtu.be/MitssZU897o)
**Muse said yes. Noctua says no.** The reported Muse conversation, replayed: the $10 offer is blocked (P14, below your floor), the address is blocked (P13, private data), and a safe reply waits for approval.

[![Attack Night](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/film/attack.webp)](https://youtu.be/MitssZU897o)
**Attack Night** Ten known attacks against the real engine, 10 stopped, each with its full trace.

[![Once. Then Noctua remembers.](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/film/outro.webp)](https://youtu.be/MitssZU897o)
**Once. Then Noctua remembers.** Nemotron does the thinking on Nebius Token Factory; Noctua keeps what it learned.

## The raw screen recordings

No film editing. Click any GIF to open that page in the live demo.

[![See how Noctua learns](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/gif/graduate.gif)](https://noctua-gkbv.onrender.com/app)
**See how Noctua learns.** One click, the whole loop: first run, learn, verify, the same request with 0 model calls, an attack blocked. Sped up 3×.

[![Know before you send](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/gif/route-preview.gif)](https://noctua-gkbv.onrender.com/app)
**Know before you send.** The route line, decided by the real router and policy with no model call.

[![Approve](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/gif/approve.gif)](https://noctua-gkbv.onrender.com/app)
**Approve.** Reply to Priya: drafted, waiting, approved. Sped up 2.5×.

[![Muse Replay](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/gif/muse-replay.gif)](https://noctua-gkbv.onrender.com/app)
**Muse Replay.** Sped up 2.5×.

[![Attack Night](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/gif/attack-night.gif)](https://noctua-gkbv.onrender.com/security)
**Attack Night.** As recorded.

[![The landing page](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/gif/landing.gif)](https://noctua-gkbv.onrender.com/)
**The landing page.** Intro, headline and the hidden-email scroll story.

## Every screen

[![Chat](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/chat-start.png)](https://noctua-gkbv.onrender.com/app)
**Chat.** One screen, a ChatGPT-style composer, and the actions in the + menu.

[![A reply](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/approval.png)](https://noctua-gkbv.onrender.com/app)
**A reply.** What's urgent, what needs a reply, the email it set aside, and the draft waiting for you.

[![Marketplace](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/muse-draft.png)](https://noctua-gkbv.onrender.com/app)
**Marketplace.** The buyer asks for the address; the draft declines and suggests a public meeting point.

[![Approved](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/approved.png)](https://noctua-gkbv.onrender.com/app)
**Approved.** Written to the local outbox, never delivered: there is no mail integration.

[![Skills](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/skills.png)](https://noctua-gkbv.onrender.com/skills)
**Skills.** What it has learned, and what that saved today.

[![A skill](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/skill.png)](https://noctua-gkbv.onrender.com/skills)
**A skill.** Every check it had to pass, its signature, and the learned rules.

[![Security](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/security.png)](https://noctua-gkbv.onrender.com/security)
**Security.** Attack Night, the risk budget, the rules, and every decision the engine made.

[![Receipts](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/receipts.png)](https://noctua-gkbv.onrender.com/receipts)
**Receipts.** Real cost per path, from API-reported token usage.

[![A run with no inference](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/task-master.png)](https://noctua-gkbv.onrender.com/receipts)
**A run with no inference.** Master path: 0 model calls, $0 model cost, 2 ms.

[![A first run](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/task-apprentice.png)](https://noctua-gkbv.onrender.com/receipts)
**A first run.** Every model call, every tool call and every policy decision, in order.

[![Memory](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/memory.png)](https://noctua-gkbv.onrender.com/settings)
**Memory.** Everything it remembers can be deleted; limits are enforced on the server.

**On a phone.** Every screen works at 390 px with no sideways scrolling.

[![Landing on a phone](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/phone-landing.png)](https://noctua-gkbv.onrender.com/) [![Chat on a phone](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/phone-chat.png)](https://noctua-gkbv.onrender.com/app) [![Security on a phone](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/phone-security.png)](https://noctua-gkbv.onrender.com/security)

## How we built it

Next.js 16, React 19 and TypeScript, with SQLite through Node's built-in `node:sqlite`, deployed on Render. Nemotron is called through Nebius Token Factory's OpenAI-compatible API in JSON mode with `enable_thinking=false`.

The router matches a prompt $p$ to a skill's examples $E_k$ by term overlap and never routes requests that send, forward, delete or pay:

$$\mathrm{ov}_k(p)=\max_{e\in E_k}\frac{|T(p)\cap T(e)|}{\min(|T(p)|,|T(e)|)}\ \ge 0.6$$

Before any request leaves the server, the accounting layer reserves its worst case and refuses the call if it could exceed a daily limit:

$$\hat\tau=\Big\lceil \tfrac{\text{chars}}{3.5}\Big\rceil+\text{max\_out},\qquad \text{admit}\iff w+\hat\tau\cdot\pi_{\max}\le B$$

Approvals are bound to the exact action, so changing one character after approval invalidates it:

$$h(u,a)=\mathrm{SHA256}\big(u\,\|\,\mathrm{canon}(a)\big)$$

## Proof of live use on Nebius

The Token Factory console for the project's organisation: Nemotron 3 Super input, cached and output tokens billed in eu-north1 between 30 Sep and 30 Oct 2026 ($0.07 total), and the paid $1.00 top-up invoice of 29 Oct 2026.

[![Nebius Token Factory usage: Nemotron 3 Super tokens, $0.07 total](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/nebius-usage.png)](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/nebius-usage.png)

[![Nebius Token Factory payments: $1.00 invoice, paid](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/nebius-payments.png)](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/nebius-payments.png)

## Results (live on Nebius Token Factory)

[![Measured, not claimed](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/film/measured.webp)](https://youtu.be/MitssZU897o)

| Seven runs of the same task | Re-think every time | Noctua (learning included) |
|---|---|---|
| Model calls | 15 | **9** |
| Model spend | $0.0057 | **$0.0040** (−30%) |
| Runs with zero inference | 0 / 7 | **4 / 7** |
| Repeat latency | 3.1–6.9 s | **1–2 ms** |
| Label accuracy | 48 / 50 | 48 / 50 |
| Attack Night | — | **10 / 10 stopped** |

[![Model calls per run](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/chart-calls.svg)](https://noctua-gkbv.onrender.com/receipts)

[![Seven runs: totals](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/chart-totals.svg)](https://noctua-gkbv.onrender.com/receipts)

A drift model built from the measured unit costs predicts the measured saving within 2.2 points and gives the break-even demotion rate:

$$S(n,d)\xrightarrow{n\to\infty}1-\frac{d}{d^\ast},\qquad d^\ast=\frac{\bar c_a}{\bar c_a+c_s}=0.595$$

So Noctua stays cheaper than re-reasoning as long as fewer than 59% of repeats drift.

[![Attack Night: 10 of 10 stopped](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/chart-attacks.svg)](https://noctua-gkbv.onrender.com/security)

## Same job, different agent

[![Same job, different agent: Meta Muse, OpenAI dots and xAI Grok Bot beside Noctua](https://cdn.jsdelivr.net/gh/Aaditya1273/Noctua@main/docs/img/film/compare.webp)](https://youtu.be/MitssZU897o)

| | On the record | Noctua |
|---|---|---|
| **Meta Muse** | Took a $10 offer and sent a stranger the seller's home address ([Fortune](https://fortune.com/2026/10/19/meta-muse-ai-agent-facebook-marketplace-home-address-privacy/)) | Both refused by code: below your floor (P14), private data (P13). Replayed in the app as Muse Replay. |
| **OpenAI dots** | Needs ChatGPT Pro: $100, $200 or $500 a month ([openai.com](https://openai.com/index/introducing-dots/)) | First live run: $0.00095 of model spend on Nemotron. Every repeat: 0 model calls. |
| **xAI Grok Bot** | From $30 a month; learns routines by watching ([x.ai](https://x.ai/news/introducing-grok-bot)) | A learned routine must pass 10 checks before it may run, is signed, and repeats with 0 model calls. |

Not like-for-like: dots and Grok Bot are broad, hosted products; Noctua covers one task family today.

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
