import { getConfig, isLive } from "@/lib/config.ts";
import { db } from "@/lib/db.ts";

export function GET() {
  try {
    db().prepare("SELECT 1").get();
    const cfg = getConfig();
    return Response.json({ ready: true, database: "ok", mode: isLive(cfg) ? "live" : "demo", models: cfg.models, pricingConfigured: Object.keys(cfg.pricing) });
  } catch (e) {
    return Response.json({ ready: false, database: (e as Error).message }, { status: 503 });
  }
}
