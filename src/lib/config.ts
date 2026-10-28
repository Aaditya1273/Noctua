// Server-only configuration. Never import this from a client component.
import path from "node:path";

export type Pricing = { input: number; output: number }; // USD per 1M tokens

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function str(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v.trim() === "" ? fallback : v.trim();
}

function parsePricing(raw: string): Record<string, Pricing> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, Pricing> = {};
    for (const [model, p] of Object.entries(obj)) {
      const rec = p as { input?: unknown; output?: unknown };
      if (typeof rec?.input === "number" && typeof rec?.output === "number" && rec.input >= 0 && rec.output >= 0) {
        out[model] = { input: rec.input, output: rec.output };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function getConfig() {
  const model = str("NEBIUS_MODEL", "nvidia/Nemotron-3_5-Lightning");
  return {
    apiKey: str("NEBIUS_API_KEY"),
    baseUrl: str("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1").replace(/\/+$/, ""),
    models: {
      // planning + triage (fast path); reasoning is used for skill synthesis when set
      fast: str("NEBIUS_MODEL_FAST", model),
      reasoning: str("NEBIUS_MODEL_REASONING", model),
    },
    jsonMode: str("NEBIUS_JSON_MODE", "true") !== "false",
    timeoutMs: num("NEBIUS_TIMEOUT_MS", 45_000),
    maxRetries: Math.min(num("NEBIUS_MAX_RETRIES", 2), 5),
    maxOutputTokens: num("NEBIUS_MAX_OUTPUT_TOKENS", 2048),
    pricing: parsePricing(str("NEBIUS_PRICING")),
    dbPath: str("NOCTUA_DB_PATH", path.join(process.cwd(), "data", "noctua.db")),
    signingKeyPath: str("NOCTUA_SIGNING_KEY_PATH", path.join(process.cwd(), "data", "signing-key.pem")),
    defaults: {
      dailyModelCalls: num("DAILY_MODEL_CALL_LIMIT", 60),
      dailyTokens: num("DAILY_TOKEN_LIMIT", 400_000),
      dailyBudgetUsd: num("DAILY_BUDGET_USD", 0.5),
      dailyRiskPoints: num("DAILY_RISK_POINTS", 10),
      downgradeAt: num("BUDGET_DOWNGRADE_AT", 0.8),
    },
  };
}

export type Config = ReturnType<typeof getConfig>;

export function isLive(cfg: Config = getConfig()): boolean {
  return cfg.apiKey.length > 0;
}
