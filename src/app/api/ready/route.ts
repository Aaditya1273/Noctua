import fs from "node:fs";
import path from "node:path";
import { getConfig, isLive } from "@/lib/config.ts";
import { db } from "@/lib/db.ts";

export function GET() {
  try {
    db().prepare("SELECT 1").get();
    const cfg = getConfig();
    const file = path.join(process.cwd(), "eval", "results.json");
    let benchmark: string;
    try { benchmark = `ok (${(JSON.parse(fs.readFileSync(file, "utf8")) as { mode: string }).mode})`; }
    catch (e) { benchmark = `unreadable: ${(e as Error).message.slice(0, 160)}`; }
    return Response.json({ ready: true, database: "ok", mode: isLive(cfg) ? "live" : "demo", models: cfg.models, pricingConfigured: Object.keys(cfg.pricing), benchmark });
  } catch (e) {
    return Response.json({ ready: false, database: (e as Error).message }, { status: 503 });
  }
}
