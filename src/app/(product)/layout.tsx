import { connection } from "next/server";
import { TopNav } from "@/components/topnav";
import { overview } from "@/lib/overview.ts";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  await connection(); // every product screen reads live state
  const o = overview();
  return (
    <>
      <div className="sky" aria-hidden><div className="stars" /></div>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">Skip to content</a>
      <TopNav
        live={o.live}
        model={o.model}
        badges={{
          skills: o.verified ? `${o.verified} verified` : o.skills.length ? `${o.skills.length} learning` : "",
          security: o.attack ? `${o.attack.passed}/${o.attack.total}` : "",
          receipts: o.budget.used.calls ? `$${o.budget.used.measuredSpendUsd.toFixed(4)}` : "",
          approvals: o.approvals,
        }}
        attackOk={o.attack ? o.attack.passed === o.attack.total : null}
      />
      <main id="main" className="relative z-10 mx-auto w-full max-w-[1240px] px-4 pb-16 pt-24 sm:px-6">{children}</main>
    </>
  );
}
