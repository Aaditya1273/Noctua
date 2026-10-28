import { handle, readJson } from "@/lib/http.ts";
import { runTask, TaskInput } from "@/lib/orchestrator.ts";
import { listTasks } from "@/lib/receipts.ts";

export const maxDuration = 120;

export function GET() {
  return handle(() => listTasks(100));
}

export function POST(req: Request) {
  return handle(async () => runTask(await readJson(req, TaskInput)));
}
