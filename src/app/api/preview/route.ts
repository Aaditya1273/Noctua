import { z } from "zod";
import { handle, readJson } from "@/lib/http.ts";
import { previewRoute } from "@/lib/orchestrator.ts";

export function POST(req: Request) {
  return handle(async () => previewRoute((await readJson(req, z.object({ prompt: z.string().min(1).max(1000) }))).prompt));
}
