import { z } from "zod";
import { evaluateSkill } from "@/lib/evaluator.ts";
import { handle, readJson } from "@/lib/http.ts";

export function POST(req: Request, ctx: RouteContext<"/api/skills/[id]/evaluate">) {
  return handle(async () => {
    await readJson(req, z.object({}).strict());
    return evaluateSkill((await ctx.params).id);
  });
}
