// Server-safe presentational primitives. One radius, one border colour, one icon size per context.
import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, Info, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function OwlMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#1d1b18" />
      <path d="M8 9l4 3h8l4-3v10a8 8 0 0 1-16 0z" fill="#f8f5ee" />
      <circle cx="12.5" cy="17" r="2.6" fill="#1d1b18" />
      <circle cx="19.5" cy="17" r="2.6" fill="#1d1b18" />
      <circle cx="12.5" cy="17" r="1" fill="#7fbf9a" />
      <circle cx="19.5" cy="17" r="1" fill="#7fbf9a" />
      <path d="M15 21h2l-1 1.6z" fill="#1d1b18" />
    </svg>
  );
}

export function PageHeader({ title, lead, actions }: { title: string; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="font-serif text-[2rem] leading-tight tracking-tight text-ink">{title}</h1>
        {lead && <p className="mt-2 text-[15px] leading-relaxed text-muted">{lead}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ children, className, as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <Tag className={cx("glass rounded-card", className)}>{children}</Tag>;
}

export function CardHeader({ title, meta, action }: { title: ReactNode; meta?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {meta && <p className="mt-0.5 text-[13px] text-muted">{meta}</p>}
      </div>
      {action}
    </div>
  );
}

export type Tone = "neutral" | "accent" | "warn" | "danger" | "info";
const TONES: Record<Tone, string> = {
  neutral: "bg-sunk text-ink-2 border-line",
  accent: "bg-accent-soft text-accent-ink border-accent/25",
  warn: "bg-warn-soft text-warn border-warn/25",
  danger: "bg-danger-soft text-danger border-danger/25",
  info: "bg-info-soft text-info border-info/25",
};

export function Badge({ tone = "neutral", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[12px] font-medium leading-5", TONES[tone])}>
      {children}
    </span>
  );
}

const TIER: Record<string, { tone: Tone; label: string; hint: string }> = {
  apprentice: { tone: "info", label: "Apprentice", hint: "Full reasoning: the model planned and executed the task." },
  journeyman: { tone: "warn", label: "Journeyman", hint: "Verified skill with a model-assisted step." },
  master: { tone: "accent", label: "Master", hint: "Verified deterministic skill: no model call." },
};
export function TierBadge({ tier }: { tier: string }) {
  const t = TIER[tier] ?? { tone: "neutral" as Tone, label: tier, hint: "" };
  return <Badge tone={t.tone} title={t.hint}>{t.label}</Badge>;
}

const STATE: Record<string, { tone: Tone; label: string }> = {
  candidate: { tone: "neutral", label: "Candidate" },
  verified: { tone: "accent", label: "Verified" },
  rejected: { tone: "danger", label: "Rejected" },
  suspended: { tone: "warn", label: "Suspended" },
  demoted: { tone: "danger", label: "Demoted" },
  superseded: { tone: "neutral", label: "Superseded" },
};
export function SkillStateBadge({ state }: { state: string }) {
  const s = STATE[state] ?? { tone: "neutral" as Tone, label: state };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const STATUS: Record<string, { tone: Tone; label: string }> = {
  done: { tone: "accent", label: "Completed" },
  failed: { tone: "danger", label: "Failed" },
  deferred: { tone: "warn", label: "Deferred (budget)" },
  unsupported: { tone: "neutral", label: "Unsupported" },
  running: { tone: "info", label: "Running" },
};
export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { tone: "neutral" as Tone, label: status };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function DecisionBadge({ decision }: { decision: string }) {
  if (decision === "allow") return <Badge tone="accent"><ShieldCheck size={13} aria-hidden /> Allowed</Badge>;
  if (decision === "require_approval") return <Badge tone="warn"><ShieldAlert size={13} aria-hidden /> Needs approval</Badge>;
  return <Badge tone="danger"><ShieldAlert size={13} aria-hidden /> Blocked</Badge>;
}

export function PassFail({ passed, label }: { passed: boolean | null; label?: string }) {
  if (passed === null) return <span className="inline-flex items-center gap-1.5 text-[13px] text-muted"><CircleDashed size={15} aria-hidden /> {label ?? "Not run"}</span>;
  return passed
    ? <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent"><CheckCircle2 size={15} aria-hidden /> {label ?? "Passed"}</span>
    : <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-danger"><XCircle size={15} aria-hidden /> {label ?? "Failed"}</span>;
}

export function Stat({ label, value, note, tone }: { label: string; value: ReactNode; note?: ReactNode; tone?: "accent" | "warn" | "danger" }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">{label}</dt>
      <dd className={cx("mt-1 font-serif text-[1.65rem] leading-none tabular-nums", tone === "accent" ? "text-accent" : tone === "warn" ? "text-warn" : tone === "danger" ? "text-danger" : "text-ink")}>{value}</dd>
      {note && <dd className="mt-1.5 text-[12.5px] leading-snug text-muted">{note}</dd>}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 px-5 py-8">
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {children && <p className="max-w-lg text-[13.5px] leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "warn", title, children }: { tone?: Tone; title: string; children?: ReactNode }) {
  return (
    <div role="note" className={cx("flex gap-3 rounded-xl border px-4 py-3", TONES[tone])}>
      {tone === "info" ? <Info size={17} className="mt-0.5 shrink-0" aria-hidden /> : tone === "accent" ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" aria-hidden /> : <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden />}
      <div className="text-[13.5px] leading-relaxed">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  return <Link href={href} className={buttonClass(variant)}>{children}</Link>;
}

export function buttonClass(variant: "primary" | "secondary" | "danger" | "ghost" = "primary") {
  const base = "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  return cx(base, {
    primary: "bg-ink text-paper hover:bg-white shadow-[0_0_0_1px_rgb(255_255_255/0.1),0_8px_30px_-8px_rgb(110_231_183/0.35)]",
    secondary: "border border-line-strong bg-card text-ink hover:bg-sunk",
    danger: "border border-danger/30 bg-danger-soft text-danger hover:bg-danger/20",
    ghost: "text-ink-2 hover:bg-sunk",
  }[variant]);
}

export const usd = (v: number | null | undefined, digits = 4) => (v === null || v === undefined ? "Unknown" : `$${v.toFixed(digits)}`);
export const int = (v: number | null | undefined) => (v === null || v === undefined ? "Unknown" : v.toLocaleString("en-US"));
export const ms = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v < 1000 ? `${v} ms` : `${(v / 1000).toFixed(1)} s`);
export function when(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function Mono({ children }: { children: ReactNode }) {
  return <code className="rounded bg-sunk px-1.5 py-0.5 font-mono text-[12.5px] text-ink-2">{children}</code>;
}

export function SampleBadge() {
  return <Badge tone="info" title="Synthetic data shipped with Noctua. No real accounts are connected.">Sample data</Badge>;
}
