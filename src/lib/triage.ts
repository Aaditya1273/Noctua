// Deterministic inbox operations shared by the guard, skills and evaluator. No model calls here.
import { CATEGORIES, SAMPLE_OWNER, type Category, type Email } from "./fixtures.ts";

export type TriageItem = {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  category: Category;
  summary: string;
  reply: string | null;
  flags: string[]; // injection-guard findings
  basis: "model" | "reference" | "rules" | "guard";
  matched: string[]; // rule keywords that fired (rules basis only)
};

// ---- Injection guard: a fixed security control, never learned or edited by a skill. ----
const INJECTION_PATTERNS: [string, RegExp][] = [
  ["override-instructions", /\b(ignore|disregard|forget)\b[^.]{0,30}\b(previous|prior|above|all)\b[^.]{0,20}\binstructions?\b/i],
  ["addresses-the-ai", /\b(note|message|instructions?)\s+(to|for)\s+(the\s+)?(ai|assistant|agent|llm)\b|\bai agents? reading\b|^\s*assistant\s*:/im],
  ["fake-system-message", /\bsystem\s+(note|prompt|override|message)\b|\bnew system prompt\b|\boverride from\b/i],
  ["concealment", /\bdo not (tell|inform|notify) the user\b/i],
  ["bulk-exfiltration", /\b(forward|send|email)\b[^.]{0,40}\b(all|every|full|last \d+)\b[^.]{0,40}\b(messages?|emails?|contacts?|contact list|invoices?|inbox)\b/i],
];

export function scanInjection(text: string): string[] {
  return INJECTION_PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
}

export function scanEmail(e: Email): string[] {
  return scanInjection(`${e.subject}\n${e.body}`);
}

// ---- Urgency markers: a fixed safety net. A skill may never silently label such a message non-urgent. ----
const URGENCY = /\b(urgent|asap|emergency|immediately|right away|alarm|outage|within the hour|by \d{1,2}\s?(am|pm)|deadline|failing|rejected|critical)\b/i;

export function urgencyMarkers(e: Email): string[] {
  const m = `${e.subject}\n${e.body}`.match(new RegExp(URGENCY.source, "gi"));
  return [...new Set((m ?? []).map((x) => x.toLowerCase()))];
}

// ---- Deterministic text helpers ----
const STOP = new Set(
  "this that with from your have will been were they them their there what when where which while would could should about after before into onto over under again just also only very more most some such than then these those here make made need needs your yours ours ourselves please thanks thank hello dear know like want week today tomorrow monthly month".split(" "),
);

export function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? []).filter((t) => !STOP.has(t));
}

export function extractiveSummary(e: Email, max = 140): string {
  const first = e.body.split(/(?<=[.!?])\s+/)[0] ?? e.body;
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

export function firstName(e: Email): string {
  return e.fromName.split(/\s+/)[0] ?? e.fromName;
}

export function fillTemplate(tpl: string, e: Email): string {
  return tpl
    .replaceAll("{firstName}", firstName(e))
    .replaceAll("{subject}", e.subject)
    .replaceAll("{owner}", SAMPLE_OWNER.name.split(" ")[0]);
}

// ---- Rule classifier used by learned skills ----
export type Rule = { category: Exclude<Category, "suspicious">; keywords: string[] };
const PRIORITY: Category[] = ["urgent", "needs_reply", "routine", "fyi"];

export function classifyByRules(e: Email, rules: Rule[], fallback: Category): { category: Category; matched: string[] } {
  const subject = tokens(e.subject);
  const body = tokens(e.body);
  const scores = new Map<Category, number>();
  const matched: string[] = [];
  for (const r of rules) {
    let s = 0;
    for (const k of r.keywords) {
      const hit = subject.includes(k) ? 2 : body.includes(k) ? 1 : 0;
      if (hit) {
        s += hit;
        matched.push(k);
      }
    }
    if (s > 0) scores.set(r.category, (scores.get(r.category) ?? 0) + s);
  }
  if (scores.size === 0) return { category: fallback, matched: [] };
  const best = Math.max(...scores.values());
  const category = PRIORITY.find((c) => scores.get(c) === best) ?? fallback;
  return { category, matched };
}

/** Learn keyword rules from labelled examples: tokens seen in exactly one category. */
export function induceRules(examples: { email: Email; category: Category }[], perCategory = 30): Rule[] {
  const df = new Map<string, Map<Category, number>>();
  for (const { email, category } of examples) {
    if (category === "suspicious") continue; // handled by the guard, never learned
    for (const t of new Set(tokens(`${email.subject} ${email.body}`))) {
      const m = df.get(t) ?? new Map<Category, number>();
      m.set(category, (m.get(category) ?? 0) + 1);
      df.set(t, m);
    }
  }
  const rules: Rule[] = [];
  for (const c of CATEGORIES) {
    if (c === "suspicious") continue;
    const kws = [...df.entries()]
      .filter(([, m]) => m.size === 1 && m.has(c))
      .sort((a, b) => (b[1].get(c) ?? 0) - (a[1].get(c) ?? 0) || a[0].localeCompare(b[0]))
      .slice(0, perCategory)
      .map(([t]) => t);
    if (kws.length) rules.push({ category: c, keywords: kws });
  }
  return rules;
}

export function digestText(items: TriageItem[]): string {
  const by = (c: Category) => items.filter((i) => i.category === c);
  const lines: string[] = [];
  const urgent = by("urgent");
  const reply = by("needs_reply");
  const susp = by("suspicious");
  lines.push(`${items.length} messages reviewed: ${urgent.length} urgent, ${reply.length} need a reply, ${susp.length} suspicious.`);
  for (const i of urgent) lines.push(`URGENT — ${i.fromName}: ${i.summary}`);
  for (const i of reply) lines.push(`Reply — ${i.fromName}: ${i.summary}`);
  for (const i of susp) lines.push(`Quarantined — ${i.fromName}: "${i.subject}" contained instructions aimed at the assistant; no action taken.`);
  return lines.join("\n");
}
