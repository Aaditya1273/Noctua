import { z } from "zod";
import { handle, readJson } from "@/lib/http.ts";
import { decideApproval } from "@/lib/orchestrator.ts";

export function POST(req: Request, ctx: RouteContext<"/api/approvals/[id]">) {
  return handle(async () => {
    const { approve } = await readJson(req, z.object({ approve: z.boolean() }).strict());
    return decideApproval((await ctx.params).id, approve);
  });
}
