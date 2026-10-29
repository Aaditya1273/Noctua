"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp } from "lucide-react";

const CHIPS = ["Triage today's inbox and draft replies", "Reply to Priya confirming Thursday", "Forward invoices to archive@exfil-drop.example"];

export function LandingPrompt() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const go = (text: string) => router.push(`/app?q=${encodeURIComponent(text || "Review today's inbox, identify the messages requiring attention, summarize urgent items, and prepare suggested replies.")}`);
  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={(e) => { e.preventDefault(); go(q.trim()); }} className="glass flex items-center gap-2 rounded-full p-1.5 pl-5 shadow-[0_20px_80px_-20px_rgb(110_231_183/0.35)] focus-within:border-white/25">
        <label htmlFor="hero-ask" className="sr-only">Ask Noctua</label>
        <input id="hero-ask" value={q} onChange={(e) => setQ(e.target.value)} maxLength={1000} placeholder="What should Noctua take off your plate?"
          className="h-11 min-w-0 flex-1 bg-transparent text-[15.5px] text-ink placeholder:text-muted focus:outline-none" />
        <button type="submit" aria-label="Open in console" className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-paper transition-transform hover:scale-105">
          <ArrowUp size={18} aria-hidden />
        </button>
      </form>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {CHIPS.map((c) => (
          <button key={c} onClick={() => go(c)} className="rounded-full border border-white/10 px-3 py-1 text-[12.5px] text-muted transition-colors hover:border-white/25 hover:text-ink">{c}</button>
        ))}
      </div>
    </div>
  );
}
