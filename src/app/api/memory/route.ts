import { handle, readJson } from "@/lib/http.ts";
import { addMemory, listMemories, MemoryInput } from "@/lib/memory.ts";

export function GET() {
  return handle(() => listMemories());
}

export function POST(req: Request) {
  return handle(async () => addMemory(await readJson(req, MemoryInput)));
}
