import type { Metadata } from "next";
import { LimitsForm, MemoryManager, ModelCheck } from "@/components/actions";
import { Card, CardHeader, Mono, Notice, PageHeader } from "@/components/ui";
import { getLimits } from "@/lib/accounting.ts";
import { getConfig, isLive, providerName } from "@/lib/config.ts";
import { listMemories } from "@/lib/memory.ts";

export const metadata: Metadata = { title: "Memory & settings" };

export default function SettingsPage() {
  const cfg = getConfig();
  const live = isLive(cfg);
  const models = [...new Set([cfg.models.fast, cfg.models.reasoning])];
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-16 pt-16 sm:px-8 lg:pt-10">
      <PageHeader title="Memory & settings" lead="Everything Noctua remembers is listed here and can be deleted. Budgets and limits are enforced on the server before every model call." />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Model provider" meta={`NVIDIA Nemotron models served by ${providerName(cfg)} (OpenAI-compatible API). Configured through environment variables; the key never reaches the browser.`} />
          <dl className="grid gap-x-8 gap-y-4 px-5 py-5 text-[13.5px] md:grid-cols-2">
            <div><dt className="font-medium text-ink">API key</dt><dd className="mt-1 text-muted">{live ? "Configured (NEBIUS_API_KEY)" : "Not configured — demo mode"}</dd></div>
            <div><dt className="font-medium text-ink">Base URL</dt><dd className="mt-1 break-all"><Mono>{cfg.baseUrl}</Mono></dd></div>
            <div><dt className="font-medium text-ink">Fast model (planning under budget pressure, triage, drafts)</dt><dd className="mt-1 break-all"><Mono>{cfg.models.fast}</Mono></dd></div>
            <div><dt className="font-medium text-ink">Reasoning model (planning, skill synthesis)</dt><dd className="mt-1 break-all"><Mono>{cfg.models.reasoning}</Mono>{cfg.models.fast === cfg.models.reasoning && <span className="ml-2 text-[12.5px] text-muted">(same model — one model is used for every role)</span>}</dd></div>
            <div className="md:col-span-2"><dt className="font-medium text-ink">Pricing (USD per 1M tokens)</dt>
              <dd className="mt-1 text-muted">{models.map((m) => <span key={m} className="mr-4 inline-block">{m}: {cfg.pricing[m] ? `${cfg.pricing[m].input} in / ${cfg.pricing[m].output} out` : "not configured — costs Unknown"}</span>)}</dd></div>
            <div><dt className="font-medium text-ink">Timeout · retries · max output</dt><dd className="mt-1 text-muted">{cfg.timeoutMs / 1000}s · {cfg.maxRetries} · {cfg.maxOutputTokens} tokens</dd></div>
          </dl>
          <div className="border-t border-line px-5 py-4"><ModelCheck /></div>
          {!live && <div className="border-t border-line px-5 py-4"><Notice tone="info" title="Enable live inference">Copy <code>.env.example</code> to <code>.env.local</code>, set <code>NEBIUS_API_KEY</code>, and restart. Verify model IDs with <em>Check connection</em>.</Notice></div>}
        </Card>

        <Card>
          <CardHeader title="Daily limits" />
          <LimitsForm limits={getLimits(cfg)} />
        </Card>

        <Card>
          <CardHeader title="Memory" meta="User-approved only. VIP senders raise priority; trusted recipients are the only addresses the policy engine lets you send to; notes are given to the planner." />
          <MemoryManager memories={listMemories()} />
        </Card>

        <Card>
          <CardHeader title="What leaves this machine" />
          <ul className="list-disc space-y-1.5 py-4 pl-10 pr-5 text-[13.5px] text-muted">
            <li>In live mode, Apprentice runs send the request text, planner notes from memory, and the sample messages being triaged to {providerName(cfg)}. Skill synthesis sends labelled examples.</li>
            <li>Master runs send nothing. Journeyman runs send only the messages that need a reply draft.</li>
            <li>Receipts, traces, skills, memory and security events stay in the local SQLite database (<Mono>{cfg.dbPath.replace(process.cwd(), ".")}</Mono>).</li>
            <li>No web search or third-party connector is called; the sample workspace has none.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
