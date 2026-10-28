export function GET() {
  return Response.json({ ok: true, service: "noctua", time: new Date().toISOString() });
}
