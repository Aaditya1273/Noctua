"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, Brain, Menu, PanelLeftClose, Receipt, Shield, SquarePen } from "lucide-react";
import { Owl } from "./owl";
import { cx } from "./ui";

export type SidebarData = {
  live: boolean;
  model: string;
  recent: { id: string; prompt: string; tier: string; status: string }[];
  verified: number;
  attack: string;
  spend: number;
  cap: number;
  capActive: boolean;
  calls: number;
  callLimit: number;
  risk: number;
  riskLimit: number;
  approvals: number;
};

const NAV = [
  { href: "/skills", label: "Skills", icon: BookOpen, key: "skills" },
  { href: "/security", label: "Security", icon: Shield, key: "security" },
  { href: "/receipts", label: "Receipts", icon: Receipt, key: "receipts" },
  { href: "/settings", label: "Memory", icon: Brain, key: "memory" },
] as const;

export function Sidebar({ d }: { d: SidebarData }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const meta: Record<string, string> = {
    skills: d.verified ? `${d.verified} verified` : "",
    security: d.attack,
    receipts: d.calls ? `$${d.spend.toFixed(4)}` : "",
    memory: "",
  };
  const bar = (v: number, max: number) => `${max > 0 ? Math.min(100, (v / max) * 100) : 0}%`;

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Open sidebar" className="fixed left-3 top-3 z-40 grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-white/5 lg:hidden">
        <Menu size={20} aria-hidden />
      </button>
      {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside className={cx("fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-line bg-[#0a0a0a] transition-transform duration-300 lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full")} aria-label="Sidebar">
        <div className="flex items-center justify-between px-3 pb-2 pt-3">
          <Link href="/" className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white/5">
            <Owl size={28} track={false} />
            <span className="text-[16px] font-semibold tracking-tight">noctua</span>
          </Link>
          <button onClick={() => setOpen(false)} aria-label="Close sidebar" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-ink lg:hidden"><PanelLeftClose size={18} aria-hidden /></button>
        </div>

        <nav aria-label="Main" className="space-y-0.5 px-2">
          <a href="/app" className={cx("flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] hover:bg-white/[0.06]", path === "/app" ? "bg-white/[0.08] text-ink" : "text-ink-2")}>
            <SquarePen size={17} aria-hidden /> New chat
            {d.approvals > 0 && <span className="ml-auto rounded-full bg-white px-1.5 text-[11px] font-semibold text-black">{d.approvals}</span>}
          </a>
          {NAV.map(({ href, label, icon: Icon, key }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={path.startsWith(href) ? "page" : undefined}
              className={cx("flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] hover:bg-white/[0.06]", path.startsWith(href) ? "bg-white/[0.08] text-ink" : "text-ink-2")}>
              <Icon size={17} aria-hidden /> {label}
              {meta[key] && <span className="ml-auto text-[12px] tabular-nums text-muted">{meta[key]}</span>}
            </Link>
          ))}
        </nav>

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-2">
          <p className="px-3 pb-1 text-[12px] text-muted">Recent</p>
          {d.recent.length === 0 ? <p className="px-3 py-1 text-[13px] text-muted">No chats yet.</p> : (
            <ul className="space-y-0.5">
              {d.recent.map((t) => (
                <li key={t.id}>
                  <Link href={`/tasks/${t.id}`} onClick={() => setOpen(false)} title={t.prompt}
                    className={cx("block truncate rounded-lg px-3 py-1.5 text-[13.5px] hover:bg-white/[0.06]", path === `/tasks/${t.id}` ? "bg-white/[0.08] text-ink" : "text-ink-2")}>
                    {t.prompt}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="m-2 space-y-2.5 rounded-xl border border-line p-3 text-[12px]">
          <p className="flex items-center gap-2 text-ink-2">
            <span className={cx("size-1.5 rounded-full", d.live ? "bg-white pulse-ring" : "bg-muted")} aria-hidden />
            {d.live ? <>Live · <span className="truncate font-mono text-[11.5px]">{d.model.split("/").pop()}</span></> : "Demo mode · no API key"}
          </p>
          <div>
            <div className="flex justify-between text-muted"><span>Model calls</span><span className="tabular-nums">{d.calls}/{d.callLimit || "∞"}</span></div>
            <div className="mt-1 h-1 rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-white/70" style={{ width: bar(d.calls, d.callLimit) }} /></div>
          </div>
          <div>
            <div className="flex justify-between text-muted"><span>Spend</span><span className="tabular-nums">{d.capActive ? `$${d.spend.toFixed(3)}/$${d.cap.toFixed(2)}` : "cap inactive"}</span></div>
            <div className="mt-1 h-1 rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-white/70" style={{ width: d.capActive ? bar(d.spend, d.cap) : "0%" }} /></div>
          </div>
          <div>
            <div className="flex justify-between text-muted"><span>Risk points left</span><span className="tabular-nums">{d.risk}/{d.riskLimit}</span></div>
            <div className="mt-1 h-1 rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-white/70" style={{ width: bar(d.risk, d.riskLimit) }} /></div>
          </div>
        </div>
      </aside>
    </>
  );
}
