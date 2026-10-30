// Renders the README charts from eval/results.json (the measured live benchmark). Monochrome SVG, no dependencies.
// Usage: node scripts/charts.ts   → docs/img/chart-*.svg
import fs from "node:fs";

type Run = { day: number; tier: string; modelCalls: number; costUsd: number | null; correct: number; total: number; urgentMissed: number; fallback: string | null };
type Side = { runs: Run[]; totals: { modelCallsIncludingLearning: number; costUsd: number }; accuracy: number; urgentMissed: number; runsWithoutInference?: number };
const r = JSON.parse(fs.readFileSync("eval/results.json", "utf8")) as { generatedAt: string; mode: string; baseline: Side; noctua: Side & { lifecycle: { afterRun: number }[] }; attackNight: { passed: number; total: number; cases: { id: string; passed: boolean }[] } };

const FONT = `font-family="ui-sans-serif, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const frame = (w: number, h: number, title: string, sub: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ${FONT}>
<rect width="${w}" height="${h}" rx="18" fill="#0b0b0b"/><rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="18" fill="none" stroke="#262626"/>
<text x="32" y="46" fill="#fafafa" font-size="20" font-weight="700">${esc(title)}</text>
<text x="32" y="70" fill="#8f8f8f" font-size="13">${esc(sub)}</text>
${body}
</svg>\n`;
const date = r.generatedAt.slice(0, 10);
const out = (name: string, svg: string) => { fs.mkdirSync("docs/img", { recursive: true }); fs.writeFileSync(`docs/img/${name}`, svg); console.log(`docs/img/${name}`); };

// 1. Model calls per run: every run re-reasons vs. the graduation loop.
{
  const W = 960, H = 400, x0 = 70, y0 = 110, ch = 200, n = r.baseline.runs.length, slot = (W - x0 - 40) / n, bw = 30;
  const max = Math.max(...r.baseline.runs.map((x) => x.modelCalls), ...r.noctua.runs.map((x) => x.modelCalls));
  const y = (v: number) => y0 + ch - (v / max) * ch;
  let b = "";
  for (let v = 0; v <= max; v++) b += `<line x1="${x0}" x2="${W - 40}" y1="${y(v)}" y2="${y(v)}" stroke="#1f1f1f"/><text x="${x0 - 12}" y="${y(v) + 4}" fill="#6b6b6b" font-size="12" text-anchor="end">${v}</text>`;
  r.baseline.runs.forEach((a, i) => {
    const c = x0 + slot * i + slot / 2, nb = r.noctua.runs[i];
    b += `<rect x="${c - bw - 3}" y="${y(a.modelCalls)}" width="${bw}" height="${y0 + ch - y(a.modelCalls)}" rx="4" fill="#4a4a4a"/>`;
    b += nb.modelCalls === 0
      ? `<rect x="${c + 3}" y="${y0 + ch - 3}" width="${bw}" height="3" rx="1.5" fill="#fafafa"/><text x="${c + 3 + bw / 2}" y="${y0 + ch - 10}" fill="#fafafa" font-size="12" font-weight="700" text-anchor="middle">0</text>`
      : `<rect x="${c + 3}" y="${y(nb.modelCalls)}" width="${bw}" height="${y0 + ch - y(nb.modelCalls)}" rx="4" fill="#fafafa"/>`;
    const tag = nb.tier === "master" ? "free" : nb.fallback ? "demoted, re-learned" : i === 0 ? "first time" : "";
    b += `<text x="${c}" y="${y0 + ch + 22}" fill="#bdbdbd" font-size="12.5" text-anchor="middle">Run ${i + 1} · Day ${a.day}</text>`;
    if (tag) b += `<text x="${c}" y="${y0 + ch + 40}" fill="#8f8f8f" font-size="11.5" text-anchor="middle">${tag}</text>`;
  });
  b += `<rect x="${W - 330}" y="34" width="12" height="12" rx="3" fill="#4a4a4a"/><text x="${W - 312}" y="45" fill="#bdbdbd" font-size="12.5">Re-reason every time</text>`;
  b += `<rect x="${W - 170}" y="34" width="12" height="12" rx="3" fill="#fafafa"/><text x="${W - 152}" y="45" fill="#bdbdbd" font-size="12.5">Noctua</text>`;
  out("chart-calls.svg", frame(W, H, "Model calls per run", `Same 7-run sequence, live on Nebius Token Factory (${date}). Learning calls not shown here.`, b));
}

// 2. Totals, learning included.
{
  const W = 960, H = 300;
  const rows = [
    { label: "Model calls (learning included)", a: r.baseline.totals.modelCallsIncludingLearning, b: r.noctua.totals.modelCallsIncludingLearning, fmt: (v: number) => String(v) },
    { label: "Model spend (learning included)", a: r.baseline.totals.costUsd, b: r.noctua.totals.costUsd, fmt: (v: number) => `$${v.toFixed(4)}` },
    { label: "Runs with zero inference", a: 0, b: r.noctua.runsWithoutInference ?? 0, fmt: (v: number) => `${v} of 7` },
  ];
  let b = "", y = 112;
  for (const row of rows) {
    const max = Math.max(row.a, row.b, 1e-9), L = 300, span = W - L - 120;
    b += `<text x="32" y="${y + 13}" fill="#d4d4d4" font-size="14">${row.label}</text>`;
    b += `<rect x="${L}" y="${y}" width="${Math.max(3, (row.a / max) * span)}" height="16" rx="4" fill="#4a4a4a"/><text x="${L + Math.max(3, (row.a / max) * span) + 10}" y="${y + 13}" fill="#bdbdbd" font-size="13">${row.fmt(row.a)}</text>`;
    b += `<rect x="${L}" y="${y + 22}" width="${Math.max(3, (row.b / max) * span)}" height="16" rx="4" fill="#fafafa"/><text x="${L + Math.max(3, (row.b / max) * span) + 10}" y="${y + 35}" fill="#fafafa" font-size="13" font-weight="700">${row.fmt(row.b)}</text>`;
    y += 62;
  }
  const saved = 1 - r.noctua.totals.costUsd / r.baseline.totals.costUsd;
  b += `<text x="${W - 32}" y="46" fill="#fafafa" font-size="20" font-weight="700" text-anchor="end">${Math.round(saved * 100)}% less spend</text>`;
  b += `<text x="${W - 32}" y="70" fill="#8f8f8f" font-size="13" text-anchor="end">grey: re-reason every time · white: Noctua</text>`;
  out("chart-totals.svg", frame(W, H, "Seven runs, start to finish", `Label accuracy ${Math.round(r.noctua.accuracy * 100)}% on both paths (48 of 50), ${r.noctua.urgentMissed} urgent messages missed. Model spend only.`, b));
}

// 3. Attack Night.
{
  const cases = r.attackNight.cases, W = 960, rowH = 30, H = 104 + Math.ceil(cases.length / 2) * rowH + 20;
  const nice = (id: string) => id.replace(/-/g, " ").replace(/^muse /, "muse replay: ");
  let b = "";
  cases.forEach((c, i) => {
    const x = 32 + (i % 2) * 460, y = 104 + Math.floor(i / 2) * rowH;
    b += `<circle cx="${x + 9}" cy="${y - 4}" r="9" fill="${c.passed ? "#fafafa" : "#3a3a3a"}"/><path d="M${x + 4.5} ${y - 4} l3 3 l6 -6" stroke="#0b0b0b" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    b += `<text x="${x + 28}" y="${y + 1}" fill="#d4d4d4" font-size="14">${esc(nice(c.id))}</text>`;
  });
  b += `<text x="${W - 32}" y="46" fill="#fafafa" font-size="20" font-weight="700" text-anchor="end">${r.attackNight.passed}/${r.attackNight.total} stopped</text>`;
  out("chart-attacks.svg", frame(W, H, "Attack Night", "Known attacks thrown at the real policy engine. The engine decides, not the model.", b));
}
