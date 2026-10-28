import { z } from "zod";
import { evaluateSkill } from "@/lib/evaluator.ts";
import { handle, HttpError, readJson } from "@/lib/http.ts";
import { getSkill, setSkillState } from "@/lib/skills.ts";

export function POST(req: Request, ctx: RouteContext<"/api/skills/[id]/state">) {
  return handle(async () => {
    const { action } = await readJson(req, z.object({ action: z.enum(["suspend", "reinstate"]) }).strict());
    const skill = getSkill((await ctx.params).id);
    if (!skill) throw new HttpError(404, "Skill not found.");
    if (action === "suspend") {
      if (skill.state !== "verified") throw new HttpError(409, "Only verified skills can be suspended.");
      setSkillState(skill.id, "suspended", "Suspended by the user.");
      return { skill: getSkill(skill.id) };
    }
    if (!["suspended", "demoted", "rejected"].includes(skill.state)) throw new HttpError(409, `A ${skill.state} skill cannot be reinstated.`);
    // Reinstating always re-runs the full evaluation; there is no way to promote without passing it.
    return evaluateSkill(skill.id);
  });
}
