import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { connection } from "next/server";
import { NavLinks } from "@/components/actions";
import { OwlMark } from "@/components/ui";
import { getConfig, isLive } from "@/lib/config.ts";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Noctua", template: "%s · Noctua" },
  description: "A personal AI agent that turns repeated tasks into verified, deterministic workflows — and proves it with receipts.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection(); // every page reads live state from the database
  const cfg = getConfig();
  const live = isLive(cfg);
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable} antialiased`}>
      <body className="min-h-dvh bg-paper text-ink">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">Skip to content</a>
        <div className="mx-auto flex min-h-dvh max-w-[1320px] flex-col lg:flex-row">
          <aside className="border-b border-line px-4 py-4 lg:sticky lg:top-0 lg:h-dvh lg:w-[248px] lg:shrink-0 lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
            <div className="flex items-center gap-2.5 px-2">
              <OwlMark />
              <div>
                <p className="font-serif text-[1.2rem] leading-none">Noctua</p>
                <p className="mt-1 text-[11.5px] text-muted">Reason once. Verify. Reuse.</p>
              </div>
            </div>
            <div className="mt-5 lg:mt-8"><NavLinks /></div>
            <div className="mt-4 rounded-xl border border-line bg-card px-3 py-3 text-[12.5px] leading-snug lg:absolute lg:bottom-6 lg:left-4 lg:right-4">
              {live ? (
                <>
                  <p className="flex items-center gap-1.5 font-medium text-accent"><span className="size-1.5 rounded-full bg-accent" aria-hidden />Live inference</p>
                  <p className="mt-1 break-words text-muted">Nebius Token Factory · <span className="font-mono text-[11.5px]">{cfg.models.fast}</span></p>
                </>
              ) : (
                <>
                  <p className="flex items-center gap-1.5 font-medium text-warn"><span className="size-1.5 rounded-full bg-warn" aria-hidden />Demo mode</p>
                  <p className="mt-1 text-muted">No API key configured. Model steps use labelled stand-ins; no inference is performed or claimed.</p>
                </>
              )}
              <p className="mt-2 text-muted">Workspace: sample data only.</p>
            </div>
          </aside>
          <main id="main" className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
