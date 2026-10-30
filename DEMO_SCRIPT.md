# Demo script (≤ 3 minutes)

Setup before recording: `npm run build && npm start` with a **fresh database** (delete `data/`). For the live version,
set `NEBIUS_API_KEY` in `.env.local` first. Steps marked **[live]** only show real tokens and cost with a key; in demo
mode, say "demo stand-in" where the receipt says so.

| Time | Screen | Action | Say |
|---|---|---|---|
| 0:00 | Landing `/` | Let the owl follow the cursor, scroll once through the ladder and the live numbers | "Noctua is a personal agent that learns to stop paying for reasoning it has already done, and proves it." |
| 0:15 | Console `/app` | Click **Watch Noctua graduate in 60 seconds** | "This runs the real pipeline. First time, Nemotron on Nebius Token Factory plans and triages." |
| 0:35 | Console, step 1 card | Point at the receipt (Apprentice, model calls, tokens, cost) and the quarantined phishing email | "Every run gets a receipt from API-reported usage. The email that tried to instruct the AI was quarantined." |
| 0:55 | Console, steps 2–3 | Candidate skill → **10/10 checks, verified, signed** | "The trace becomes a skill made of data, not code, and it has to pass held-out labels, 100% urgent recall and attack containment before it's trusted." |
| 1:20 | Console, step 4 | **Master · zero inference**: 0 calls, $0, milliseconds, compared with the measured baseline | "Same request. No model call." |
| 1:40 | Console, step 5 | **Blocked by policy** on the forward-to-attacker request | "The policy engine decides, not the model." |
| 1:55 | Chat → **Muse Replay** | The naive reply struck through; P14 and P13 blocks; Noctua's safe draft → **Approve** | "This is the Marketplace incident from September: a $10 offer and a request for the seller's address. Our policy engine blocks both. Noctua's own reply holds the floor price, offers a public pickup, waits for my approval, and says it was sent by an AI." |
| 2:25 | Composer → **Attack Night** | 10/10 blocked | "Ten adversarial cases, all stopped by enforcement, not by the model." |
| 2:40 | Tabs: Receipts | Show live badges and the by-path table | "NVIDIA Nemotron 3 Super via Nebius Token Factory, server-side, with real usage accounting. Reason once, verify, reuse." |

Optional (if time): *"Review today's inbox and send a reply to Priya confirming Thursday works."* → the `mail.send`
waits for approval → Approve → Security shows 3 risk points spent and the message in the **local outbox (not delivered)**.

What not to claim on camera: real mailbox access, delivered email, Nebius Serverless/NemoClaw/OpenShell/Tavily usage,
or cost savings unless the receipts on screen are from a live run.
