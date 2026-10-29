"use client";
// Interactive controls. Each one calls a real API route and shows its actual result or error.
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Check, FlaskConical, Loader2, Play, Shield, Sparkles, Trash2, X } from "lucide-react";
import { buttonClass, cx } from "./ui";

async function api<T = unknown>(url: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError((e as Error).message);
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function ErrorText({ error }: { error: string | null }) {
  return error ? <p role="alert" className="mt-2 text-[13px] text-danger">{error}</p> : null;
}

function Spinner() {
  return <Loader2 size={15} className="animate-spin" aria-hidden />;
}

export function RunAgain({ prompt, day, label = "Run again" }: { prompt: string; day: number; label?: string }) {
  const router = useRouter();
  const { busy, error, run } = useAction();
  return (
    <div>
      <button className={buttonClass("secondary")} disabled={busy} onClick={async () => {
        const r = await run(() => api<{ taskId: string }>("/api/tasks", { prompt, day, route: "auto" }));
        if (r) router.push(`/tasks/${r.taskId}`);
      }}>{busy ? <Spinner /> : <Play size={15} aria-hidden />} {label}</button>
      <ErrorText error={error} />
    </div>
  );
}

export function LearnWorkflow({ taskId, live }: { taskId: string; live: boolean }) {
  const router = useRouter();
  const [drafting, setDrafting] = useState<"template" | "model">("template");
  const { busy, error, run } = useAction();
  return (
    <div>
      <fieldset>
        <legend className="text-[13px] font-medium text-ink">How should the skill draft replies?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {([["template", "Templates", "Deterministic. Becomes a Master skill — no model call."], ["model", "Model-assisted", "Classification is deterministic; drafts use the model. Becomes a Journeyman skill."]] as const).map(([v, t, d]) => (
            <label key={v} className={cx("flex cursor-pointer gap-2.5 rounded-lg border p-3", drafting === v ? "border-ink bg-card" : "border-line bg-card/60")}>
              <input type="radio" name="drafting" checked={drafting === v} onChange={() => setDrafting(v)} className="mt-0.5 accent-[var(--color-ink)]" />
              <span><span className="block text-[13.5px] font-medium text-ink">{t}</span><span className="block text-[12.5px] leading-snug text-muted">{d}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-3 text-[12.5px] text-muted">{live ? "Synthesis uses the reasoning model to propose keyword rules; every proposal is schema-checked and merged with deterministic induction." : "Demo mode: rules are induced deterministically from the recorded runs (no model)."}</p>
      <button className={cx(buttonClass("primary"), "mt-4")} disabled={busy} onClick={async () => {
        const r = await run(() => api<{ id: string }>(`/api/tasks/${taskId}/learn`, { drafting }));
        if (r) router.push(`/skills/${r.id}`);
      }}>{busy ? <Spinner /> : <Sparkles size={15} aria-hidden />} Learn this workflow</button>
      <ErrorText error={error} />
    </div>
  );
}

export function EvaluateButton({ skillId, label = "Run evaluation" }: { skillId: string; label?: string }) {
  const router = useRouter();
  const { busy, error, run } = useAction();
  return (
    <div>
      <button className={buttonClass("primary")} disabled={busy} onClick={async () => {
        if (await run(() => api(`/api/skills/${skillId}/evaluate`, {}))) router.refresh();
      }}>{busy ? <Spinner /> : <FlaskConical size={15} aria-hidden />} {busy ? "Evaluating…" : label}</button>
      <ErrorText error={error} />
    </div>
  );
}

export function SkillStateButton({ skillId, action }: { skillId: string; action: "suspend" | "reinstate" }) {
  const router = useRouter();
  const { busy, error, run } = useAction();
  return (
    <div>
      <button className={buttonClass(action === "suspend" ? "danger" : "secondary")} disabled={busy} onClick={async () => {
        if (await run(() => api(`/api/skills/${skillId}/state`, { action }))) router.refresh();
      }}>{busy && <Spinner />} {action === "suspend" ? "Suspend skill" : "Re-verify and reinstate"}</button>
      <ErrorText error={error} />
    </div>
  );
}

export function ApprovalButtons({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const { busy, error, run } = useAction();
  const [result, setResult] = useState<string | null>(null);
  const decide = async (approve: boolean) => {
    const r = await run(() => api<{ detail: string }>(`/api/approvals/${approvalId}`, { approve }));
    if (r) { setResult(r.detail); router.refresh(); }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button className={buttonClass("primary")} disabled={busy} onClick={() => decide(true)}><Check size={15} aria-hidden /> Approve</button>
        <button className={buttonClass("secondary")} disabled={busy} onClick={() => decide(false)}><X size={15} aria-hidden /> Discard</button>
      </div>
      {result && <p className="mt-2 text-[13px] text-muted" aria-live="polite">{result}</p>}
      <ErrorText error={error} />
    </div>
  );
}

export function AttackRunner({ live }: { live: boolean }) {
  const router = useRouter();
  const [includeLive, setIncludeLive] = useState(false);
  const { busy, error, run } = useAction();
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      <button className={buttonClass("primary")} disabled={busy} onClick={async () => {
        if (await run(() => api("/api/security/run", { includeLive }))) router.refresh();
      }}>{busy ? <Spinner /> : <Shield size={15} aria-hidden />} {busy ? "Running attacks…" : "Run Attack Night"}</button>
      {live && (
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" checked={includeLive} onChange={(e) => setIncludeLive(e.target.checked)} className="accent-[var(--color-ink)]" />
          Include the live-model test (1 model call, counts against budget)
        </label>
      )}
      <ErrorText error={error} />
    </div>
  );
}

export type MemoryItem = { id: string; kind: string; content: string; createdAt: string };
const KIND_LABEL: Record<string, string> = { note: "Note", vip: "VIP sender", contact: "Trusted recipient" };

export function MemoryManager({ memories }: { memories: MemoryItem[] }) {
  const router = useRouter();
  const [kind, setKind] = useState("vip");
  const [content, setContent] = useState("");
  const { busy, error, run } = useAction();
  return (
    <div>
      <form className="flex flex-col gap-2 px-5 py-4 sm:flex-row" onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => api("/api/memory", { kind, content }))) { setContent(""); router.refresh(); }
      }}>
        <label className="sr-only" htmlFor="mem-kind">Memory type</label>
        <select id="mem-kind" value={kind} onChange={(e) => setKind(e.target.value)} className="h-9 rounded-lg border border-line-strong bg-card px-2 text-[13.5px]">
          <option value="vip">VIP sender (email)</option>
          <option value="contact">Trusted recipient (email)</option>
          <option value="note">Note for the planner</option>
        </select>
        <label className="sr-only" htmlFor="mem-content">Content</label>
        <input id="mem-content" value={content} onChange={(e) => setContent(e.target.value)} required maxLength={500}
          placeholder={kind === "note" ? "e.g. I prefer short replies" : "name@company.example"}
          className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-card px-3 text-[13.5px] focus:border-accent focus:outline-none" />
        <button type="submit" disabled={busy || !content.trim()} className={buttonClass("primary")}>Save</button>
      </form>
      <div className="px-5"><ErrorText error={error} /></div>
      {memories.length === 0 ? (
        <p className="px-5 pb-5 text-[13.5px] text-muted">Nothing stored. Noctua never writes memory from email or web content — only what you add here.</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {memories.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="text-[12px] font-medium uppercase tracking-wide text-muted">{KIND_LABEL[m.kind] ?? m.kind}</p>
                <p className="truncate text-[14px] text-ink">{m.content}</p>
              </div>
              <DeleteMemory id={m.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DeleteMemory({ id }: { id: string }) {
  const router = useRouter();
  const { busy, error, run } = useAction();
  return (
    <div className="shrink-0 text-right">
      <button aria-label="Delete memory" className={buttonClass("ghost")} disabled={busy} onClick={async () => {
        if (await run(() => api(`/api/memory/${id}`, {}, "DELETE"))) router.refresh();
      }}><Trash2 size={15} aria-hidden /> Delete</button>
      <ErrorText error={error} />
    </div>
  );
}

export type LimitsValue = { dailyModelCalls: number; dailyTokens: number; dailyBudgetUsd: number; dailyRiskPoints: number; downgradeAt: number };

export function LimitsForm({ limits }: { limits: LimitsValue }) {
  const router = useRouter();
  const [v, setV] = useState(limits);
  const [saved, setSaved] = useState(false);
  const { busy, error, run } = useAction();
  const field = (k: keyof LimitsValue, label: string, hint: ReactNode, step = "1") => (
    <div>
      <label htmlFor={k} className="text-[13px] font-medium text-ink">{label}</label>
      <input id={k} type="number" min={0} step={step} value={v[k]} onChange={(e) => { setSaved(false); setV({ ...v, [k]: Number(e.target.value) }); }}
        className="mt-1.5 h-9 w-full rounded-lg border border-line-strong bg-card px-3 text-[14px] tabular-nums focus:border-accent focus:outline-none" />
      <p className="mt-1 text-[12px] leading-snug text-muted">{hint}</p>
    </div>
  );
  return (
    <form className="px-5 py-5" onSubmit={async (e) => {
      e.preventDefault();
      if (await run(() => api("/api/settings/limits", v))) { setSaved(true); router.refresh(); }
    }}>
      <div className="grid gap-5 sm:grid-cols-2">
        {field("dailyModelCalls", "Model calls per day", "Always enforced, even without pricing. 0 = no limit.")}
        {field("dailyTokens", "Tokens per day", "Reserved conservatively before each call.")}
        {field("dailyBudgetUsd", "Daily budget (USD)", "Enforced only when every configured model has a price.", "0.01")}
        {field("dailyRiskPoints", "Risk points per day", "Irreversible actions cost points (send 3, forward 5).")}
        {field("downgradeAt", "Downgrade threshold", "Fraction of budget at which planning switches to the cheaper model.", "0.05")}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button type="submit" disabled={busy} className={buttonClass("primary")}>{busy && <Spinner />} Save limits</button>
        {saved && <span className="text-[13px] text-accent" aria-live="polite">Saved.</span>}
      </div>
      <ErrorText error={error} />
    </form>
  );
}

type ModelStatus = { configured: boolean; reachable: boolean | null; models: { role: string; id: string; available: boolean | null }[]; error: string | null; checkedAt: string };

export function ModelCheck() {
  const [s, setS] = useState<ModelStatus | null>(null);
  const { busy, error, run } = useAction();
  return (
    <div>
      <button className={buttonClass("secondary")} disabled={busy} onClick={async () => {
        const r = await run(async () => {
          const res = await fetch("/api/model/status");
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return (await res.json()) as ModelStatus;
        });
        if (r) setS(r);
      }}>{busy && <Spinner />} Check connection</button>
      <ErrorText error={error} />
      {s && (
        <div className="mt-3 rounded-lg border border-line bg-sunk/60 p-3 text-[13px]" aria-live="polite">
          {!s.configured ? <p className="text-warn">{s.error}</p> : s.reachable ? (
            <ul className="space-y-1">
              {s.models.map((m) => (
                <li key={m.role} className={m.available ? "text-accent" : "text-danger"}>
                  {m.role}: <span className="font-mono">{m.id}</span> — {m.available ? "listed in your catalogue" : "NOT listed in your catalogue"}
                </li>
              ))}
            </ul>
          ) : <p className="text-danger">Unreachable: {s.error}</p>}
          <p className="mt-1 text-[12px] text-muted">Checked {new Date(s.checkedAt).toLocaleTimeString()} via GET /models. No inference was run.</p>
        </div>
      )}
    </div>
  );
}
