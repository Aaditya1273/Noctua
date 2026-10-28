import { NextResponse, type NextRequest } from "next/server";

// Optional HTTP Basic auth for any deployment beyond localhost: set NOCTUA_BASIC_AUTH="user:password".
export function proxy(req: NextRequest) {
  const expected = process.env.NOCTUA_BASIC_AUTH;
  if (!expected || req.nextUrl.pathname === "/api/health") return NextResponse.next();
  const given = req.headers.get("authorization") ?? "";
  if (given === `Basic ${btoa(expected)}`) return NextResponse.next();
  return new NextResponse("Authentication required.", { status: 401, headers: { "www-authenticate": 'Basic realm="Noctua"' } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"] };
