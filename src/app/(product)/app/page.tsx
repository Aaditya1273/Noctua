import type { Metadata } from "next";
import { Console } from "@/components/console";
import { getConfig, isLive, providerName } from "@/lib/config.ts";
import { INBOX_DAYS, WORKSPACE_DAYS } from "@/lib/fixtures.ts";

export const metadata: Metadata = { title: "Chat" };

export default async function ConsolePage({ searchParams }: PageProps<"/app">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 1000) : undefined;
  const cfg = getConfig();
  return <Console live={isLive(cfg)} provider={providerName(cfg)} inboxes={WORKSPACE_DAYS.map((day) => ({ day, count: INBOX_DAYS[day].length }))} initialPrompt={q} />;
}
