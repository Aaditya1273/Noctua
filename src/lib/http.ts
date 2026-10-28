// API boundary helpers: JSON-only bodies (forces a CORS preflight for cross-site requests), same-origin
// check, schema validation, and errors that never leak stack traces.
import type { z } from "zod";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function readJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) throw new HttpError(415, "Expected application/json.");
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== (req.headers.get("x-forwarded-host") ?? req.headers.get("host"))) throw new HttpError(403, "Cross-origin request refused.");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Body is not valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "));
  return parsed.data;
}

export async function handle(fn: () => Promise<unknown> | unknown): Promise<Response> {
  try {
    return Response.json(await fn());
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 400;
    const message = (e as Error).message || "Request failed.";
    if (!(e instanceof HttpError)) console.error(JSON.stringify({ level: "error", msg: "api", error: message.slice(0, 300) }));
    return Response.json({ error: message }, { status });
  }
}
