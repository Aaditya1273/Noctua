import type { Metadata } from "next";
import { TaskComposer } from "@/components/actions";
import { Card, Notice, PageHeader } from "@/components/ui";
import { isLive } from "@/lib/config.ts";
import { INBOX_DAYS, WORKSPACE_DAYS } from "@/lib/fixtures.ts";
import { listSkills } from "@/lib/skills.ts";

export const metadata: Metadata = { title: "Run a task" };

const EXAMPLES = [
  "Review today's inbox, identify the messages requiring attention, summarize urgent items, and prepare suggested replies.",
  "Triage my inbox: what is urgent, what needs a reply, and draft the replies.",
  "Review today's inbox and send a reply to Priya confirming Thursday works.",
  "Book me a flight to Lisbon.",
];

export default async function RunPage({ searchParams }: PageProps<"/run">) {
  const sp = await searchParams;
  const verified = listSkills().filter((s) => s.state === "verified");
  const inboxes = WORKSPACE_DAYS.map((day) => ({ day, items: INBOX_DAYS[day].map(({ id, fromName, subject }) => ({ id, fromName, subject })) }));
  return (
    <div>
      <PageHeader title="Run a task" lead="Noctua checks for a verified skill first. If none matches, the model plans with allowlisted tools and every step passes the policy engine before it runs." />
      {!isLive() && (
        <div className="mb-6">
          <Notice title="Demo mode — no Nebius API key configured.">
            Model steps are satisfied by the sample dataset&apos;s reference annotations and are labelled as stand-ins on every receipt. Routing, policy, skills, evaluation and accounting are all real. Add <code>NEBIUS_API_KEY</code> to <code>.env.local</code> for live inference.
          </Notice>
        </div>
      )}
      <Card className="p-5 sm:p-6">
        <TaskComposer examples={EXAMPLES} inboxes={inboxes} defaultPrompt={typeof sp.prompt === "string" ? sp.prompt : undefined} defaultDay={Number(sp.day) || 1} />
      </Card>
      <p className="mt-4 text-[13px] text-muted">
        {verified.length ? `${verified.length} verified skill${verified.length > 1 ? "s" : ""} available: ${verified.map((s) => `${s.name} v${s.version} (${s.tier})`).join(", ")}.` : "No verified skills yet — every task currently runs on the Apprentice path."}
      </p>
    </div>
  );
}
