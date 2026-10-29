"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Brain, Receipt, Shield, Sparkles } from "lucide-react";
import { Owl } from "./owl";
import { cx } from "./ui";

type Badges = { skills: string; security: string; receipts: string; approvals: number };

const TABS = [
  { href: "/app", label: "Console", icon: Sparkles, key: "approvals" as const },
  { href: "/skills", label: "Skills", icon: BookOpen, key: "skills" as const },
  { href: "/security", label: "Security", icon: Shield, key: "security" as const },
  { href: "/receipts", label: "Receipts", icon: Receipt, key: "receipts" as const },
  { href: "/settings", label: "Memory", icon: Brain, key: null },
];

export function TopNav({ live, model, badges, attackOk }: { live: boolean; model: string; badges: Badges; attackOk: boolean | null }) {
  const path = usePathname();
  return (
    <header className="fixed inset-x-0 top-3 z-40 px-3">
      <div className="glass mx-auto flex max-w-[1240px] items-center gap-2 rounded-full py-1.5 pl-2 pr-2 shadow-[0_10px_40px_-10px_rgb(0_0_0/0.8)]">
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-full py-0.5 pl-1 pr-3 hover:bg-white/5" aria-label="Noctua home">
          <Owl size={30} track={false} />
          <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">noctua</span>
        </Link>
        <nav aria-label="Main" className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
          {TABS.map(({ href, label, icon: Icon, key }) => {
            const active = href === "/app" ? path === "/app" || path.startsWith("/tasks") || path === "/run" : path.startsWith(href);
            const badge = key === "approvals" ? (badges.approvals ? `${badges.approvals} to approve` : "") : key ? badges[key] : "";
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined}
                className={cx("group relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13.5px] font-medium transition-all duration-300",
                  active ? "bg-white text-paper shadow-[0_0_24px_-4px_rgb(255_255_255/0.35)]" : "text-ink-2 hover:bg-white/[0.07] hover:text-ink")}>
                <Icon size={15} aria-hidden />
                {label}
                {badge && (
                  <span className={cx("rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums",
                    active ? "bg-paper/10 text-paper" : key === "security" && attackOk === false ? "bg-danger/15 text-danger" : key === "approvals" ? "bg-warn/15 text-warn" : "bg-accent/12 text-accent")}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className={cx("hidden shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-[12px] md:flex", live ? "border-accent/25 text-accent-ink" : "border-warn/25 text-warn")}
          title={live ? `Live inference: ${model}` : "Demo mode — no API key configured"}>
          <span className={cx("size-1.5 rounded-full", live ? "bg-accent pulse-ring" : "bg-warn")} aria-hidden />
          {live ? <>Live · <span className="font-mono">{model.split("/").pop()}</span></> : "Demo mode"}
        </div>
      </div>
    </header>
  );
}
