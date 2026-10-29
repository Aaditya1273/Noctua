import { z } from "zod";
import { runMuseReplay } from "@/lib/attacks.ts";
import { handle, readJson } from "@/lib/http.ts";

export function POST(req: Request) {
  return handle(async () => {
    await readJson(req, z.object({}).strict());
    return runMuseReplay();
  });
}
