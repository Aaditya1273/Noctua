import { z } from "zod";
import { handle, readJson } from "@/lib/http.ts";
import { learnFromTask } from "@/lib/skills.ts";

export const maxDuration = 120;

export function POST(req: Request, ctx: RouteContext<"/api/tasks/[id]/learn">) {
  return handle(async () => {
    const body = await readJson(req, z.object({ drafting: z.enum(["template", "model"]) }).strict());
    return learnFromTask((await ctx.params).id, body);
  });
}
