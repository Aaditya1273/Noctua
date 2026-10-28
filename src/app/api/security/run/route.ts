import { z } from "zod";
import { runAttackNight } from "@/lib/attacks.ts";
import { handle, readJson } from "@/lib/http.ts";

export const maxDuration = 120;

export function POST(req: Request) {
  return handle(async () => runAttackNight(await readJson(req, z.object({ includeLive: z.boolean().default(false) }).strict())));
}
