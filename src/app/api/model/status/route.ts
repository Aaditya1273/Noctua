import { handle } from "@/lib/http.ts";
import { checkModels } from "@/lib/provider.ts";

export function GET() {
  return handle(() => checkModels());
}
