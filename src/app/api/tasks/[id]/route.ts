import { handle, HttpError } from "@/lib/http.ts";
import { getTask } from "@/lib/receipts.ts";

export function GET(_req: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  return handle(async () => getTask((await ctx.params).id) ?? Promise.reject(new HttpError(404, "Task not found.")));
}
