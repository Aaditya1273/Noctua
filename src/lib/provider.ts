// OpenAI-compatible chat client (Nebius Token Factory by default; any compatible base URL works). Server-side only.
import { getConfig, type Config } from "./config.ts";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ProviderErrorKind = "not_configured" | "timeout" | "http" | "network" | "invalid_response";

export class ProviderError extends Error {
  kind: ProviderErrorKind;
  status: number | null;
  constructor(kind: ProviderErrorKind, message: string, status: number | null = null) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
  get retryable(): boolean {
    return this.kind === "timeout" || this.kind === "network" || (this.kind === "http" && (this.status === 429 || (this.status ?? 0) >= 500));
  }
}

export type Completion = {
  content: string;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number;
  attempts: number;
};

export type CompletionRequest = {
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature?: number;
  json?: boolean;
};

async function request(cfg: Config, path: string, init: RequestInit): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}`, ...(init.headers ?? {}) },
    });
  } catch (e) {
    if (ctrl.signal.aborted) throw new ProviderError("timeout", `No response within ${cfg.timeoutMs} ms`);
    throw new ProviderError("network", `Could not reach the provider (${(e as Error).message})`);
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    // Provider error bodies can echo request data; keep only a short, single-line excerpt.
    const excerpt = text.replace(/\s+/g, " ").slice(0, 200);
    throw new ProviderError("http", `Provider returned HTTP ${res.status}${excerpt ? `: ${excerpt}` : ""}`, res.status);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ProviderError("invalid_response", "Provider response was not valid JSON");
  }
}

/** Remove reasoning blocks some Nemotron variants emit before the answer. */
export function stripReasoning(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export async function chatCompletion(req: CompletionRequest, cfg: Config = getConfig()): Promise<Completion> {
  if (!cfg.apiKey) throw new ProviderError("not_configured", "NEBIUS_API_KEY is not set");
  const started = Date.now();
  let attempt = 0;
  for (;;) {
    attempt++;
    try {
      const body: Record<string, unknown> = {
        model: req.model,
        messages: req.messages,
        max_tokens: req.maxTokens,
        temperature: req.temperature ?? 0,
      };
      if (req.json && cfg.jsonMode) body.response_format = { type: "json_object" };
      if (cfg.disableThinking) body.chat_template_kwargs = { enable_thinking: false };
      const data = (await request(cfg, "/chat/completions", { method: "POST", body: JSON.stringify(body) })) as {
        model?: string;
        choices?: { message?: { content?: unknown } }[];
        usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
      };
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw new ProviderError("invalid_response", "Response had no message content");
      const tok = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
      return {
        content: stripReasoning(content),
        model: typeof data.model === "string" ? data.model : req.model,
        promptTokens: tok(data.usage?.prompt_tokens),
        completionTokens: tok(data.usage?.completion_tokens),
        latencyMs: Date.now() - started,
        attempts: attempt,
      };
    } catch (e) {
      const err = e instanceof ProviderError ? e : new ProviderError("network", (e as Error).message);
      if (!err.retryable || attempt > cfg.maxRetries) {
        (err as ProviderError & { attempts?: number }).attempts = attempt;
        throw err;
      }
      await new Promise((r) => setTimeout(r, Math.min(250 * 2 ** (attempt - 1), 2000)));
    }
  }
}

export type ModelStatus = {
  configured: boolean;
  reachable: boolean | null;
  baseUrl: string;
  models: { role: string; id: string; available: boolean | null }[];
  error: string | null;
  checkedAt: string;
};

/** Connection check: lists the account's model catalogue. Does not run inference. */
export async function checkModels(cfg: Config = getConfig()): Promise<ModelStatus> {
  const roles = [
    { role: "fast", id: cfg.models.fast },
    { role: "reasoning", id: cfg.models.reasoning },
  ];
  const base: ModelStatus = {
    configured: !!cfg.apiKey,
    reachable: null,
    baseUrl: cfg.baseUrl,
    models: roles.map((r) => ({ ...r, available: null })),
    error: null,
    checkedAt: new Date().toISOString(),
  };
  if (!cfg.apiKey) return { ...base, error: "NEBIUS_API_KEY is not set — running in demo mode." };
  try {
    const data = (await request(cfg, "/models", { method: "GET" })) as { data?: { id?: string }[] };
    const ids = new Set((data?.data ?? []).map((m) => m.id).filter(Boolean) as string[]);
    return { ...base, reachable: true, models: roles.map((r) => ({ ...r, available: ids.has(r.id) })) };
  } catch (e) {
    return { ...base, reachable: false, error: (e as Error).message };
  }
}

/** Extract the first JSON object from model text (tolerates code fences and surrounding prose). */
export function extractJson(text: string): unknown {
  const cleaned = stripReasoning(text).replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    return undefined;
  }
}
