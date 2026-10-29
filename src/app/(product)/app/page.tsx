import type { Metadata } from "next";
import { Console } from "@/components/console";
import { INBOX_DAYS, WORKSPACE_DAYS } from "@/lib/fixtures.ts";
import { overview } from "@/lib/overview.ts";

export const metadata: Metadata = { title: "Console" };

export default async function ConsolePage({ searchParams }: PageProps<"/app">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 1000) : undefined;
  return <Console initial={overview()} inboxes={WORKSPACE_DAYS.map((day) => ({ day, count: INBOX_DAYS[day].length }))} initialPrompt={q} />;
}
