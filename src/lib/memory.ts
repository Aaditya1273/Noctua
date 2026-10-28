// User-approved durable memory. Only the user (via the API) writes here — never tool output or email content.
import { z } from "zod";
import { db, id, nowIso } from "./db.ts";

export const MEMORY_KINDS = ["note", "vip", "contact"] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];
export type Memory = { id: string; createdAt: string; kind: MemoryKind; content: string };

export const MemoryInput = z.object({
  kind: z.enum(MEMORY_KINDS),
  content: z.string().trim().min(1).max(500),
}).strict().superRefine((v, ctx) => {
  if ((v.kind === "vip" || v.kind === "contact") && !/^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i.test(v.content))
    ctx.addIssue({ code: "custom", message: "VIP senders and trusted contacts must be a single email address", path: ["content"] });
});

export function listMemories(): Memory[] {
  return (db().prepare("SELECT id, created_at, kind, content FROM memories ORDER BY created_at DESC").all() as Record<string, string>[])
    .map((r) => ({ id: r.id, createdAt: r.created_at, kind: r.kind as MemoryKind, content: r.content }));
}

export function addMemory(input: z.infer<typeof MemoryInput>): Memory {
  const m: Memory = { id: id("mem"), createdAt: nowIso(), kind: input.kind, content: input.kind === "note" ? input.content : input.content.toLowerCase() };
  db().prepare("INSERT INTO memories(id, created_at, kind, content) VALUES(?, ?, ?, ?)").run(m.id, m.createdAt, m.kind, m.content);
  return m;
}

export function deleteMemory(memId: string): boolean {
  return db().prepare("DELETE FROM memories WHERE id = ?").run(memId).changes > 0;
}

export const trustedContacts = () => new Set(listMemories().filter((m) => m.kind === "contact").map((m) => m.content));
export const vipSenders = () => new Set(listMemories().filter((m) => m.kind === "vip").map((m) => m.content));
