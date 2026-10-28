import { z } from "zod";
import { handle, HttpError, readJson } from "@/lib/http.ts";
import { deleteMemory } from "@/lib/memory.ts";

export function DELETE(req: Request, ctx: RouteContext<"/api/memory/[id]">) {
  return handle(async () => {
    await readJson(req, z.object({}).strict());
    if (!deleteMemory((await ctx.params).id)) throw new HttpError(404, "Memory not found.");
    return { deleted: true };
  });
}
