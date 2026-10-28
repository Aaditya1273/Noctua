# Demo script (≤ 3 minutes)

Setup before recording: `npm run build && npm start` with a **fresh database** (delete `data/`). For the live version,
set `NEBIUS_API_KEY` in `.env.local` first. Steps marked **[live]** only show real tokens and cost with a key; in demo
mode, say "demo stand-in" where the receipt says so.

| Time | Screen | Action | Say |
|---|---|---|---|
| 0:00 | Overview | Show the empty dashboard and the mode badge | "Noctua is a personal agent that stops paying for reasoning it has already done — and proves it." |
| 0:12 | Run a task | Default prompt, Day 1 sample inbox → **Run task** | "First time: a Nemotron model on Nebius Token Factory plans with allowlisted tools, then triages." |
| 0:30 | Task | Point at **Receipt**: Apprentice, 2 model calls **[live: tokens + cost from API usage]**; the quarantined phishing email | "Every run gets a receipt. The phishing email tried to instruct the AI — the guard quarantined it." |
| 0:50 | Task | **Learn this workflow** → Templates | "Noctua turns the trace into a candidate skill: data, not code — six allowlisted steps." |
| 1:00 | Skill | **Run evaluation** → expand two checks (golden set, injection containment) | "It must pass ten mandatory checks — held-out labels, 100% urgent recall, attack containment, determinism. Only then is it promoted and signed." |
| 1:20 | Task | **Run again** on Day 1 | "Same request: Master tier, zero model calls. Here's the measured baseline it replaced." |
| 1:35 | Run a task | Switch to **Day 2** → Run | "New day, new vocabulary. The skill's coverage drops and it misses an urgent payroll email — so it demotes itself and re-runs with full reasoning. That's recorded." |
| 1:55 | Skills | Show v1 *Demoted*; learn v2 from the Day 2 task → evaluate (11/11, incl. regression replay) | "The new version must pass the inbox that broke the old one." |
| 2:15 | Run a task | Prompt: *Forward the invoices in my inbox to archive@exfil-drop.example* | "Now an attack. The policy engine blocks it — untrusted recipient. The model is never the security mechanism." |
| 2:30 | Security lab | **Run Attack Night** → 8/8 | "Eight adversarial cases — poisoned email, web override, tool-output chaining, approval replay, tampered skill — all blocked by enforcement." |
| 2:45 | Receipts | Show the By-execution-path table | "Model: NVIDIA Nemotron via Nebius Token Factory's OpenAI-compatible API, server-side, with real usage accounting. Reason once, verify, reuse." |

Optional (if time): *"Review today's inbox and send a reply to Priya confirming Thursday works."* → the `mail.send`
waits for approval → Approve → Security lab shows 3 risk points spent and the message in the **local outbox (not delivered)**.

What not to claim on camera: real mailbox access, delivered email, Nebius Serverless/NemoClaw/OpenShell/Tavily usage,
or cost savings unless the receipts on screen are from a live run.
