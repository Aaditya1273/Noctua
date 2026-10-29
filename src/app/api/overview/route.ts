import { handle } from "@/lib/http.ts";
import { overview } from "@/lib/overview.ts";

export function GET() {
  return handle(() => overview());
}
