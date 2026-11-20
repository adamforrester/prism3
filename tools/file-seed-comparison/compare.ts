/**
 * #2075 part 2 — the comparison harness: both interpretation paths over the test set, each pick scored against a
 * hand-written answer key. A TOOL, not a gate (tools/CLAUDE.md): it answers and exits 0. The owner decides from its
 * findings whether the engine-only path is usable, limited or different; nothing here asserts an answer.
 *
 *   npx tsx tools/file-seed-comparison/compare.ts                       # the table
 *   npx tsx tools/file-seed-comparison/compare.ts --json                # the same, as JSON
 *   npx tsx tools/file-seed-comparison/compare.ts --reports <dir>       # also write each row's facts report (the
 *                                                                      #   agent path's input) to <dir>/<row>.json
 *   npx tsx tools/file-seed-comparison/compare.ts --external <dir>      # add the external rows (README.md): their
 *                                                                      #   reports, answer key and agent fixtures
 *
 * THE EXTERNAL ROWS stay out of this public repo: a report names a file's pages, styles and components. `<dir>`
 * holds `<row>.report.json` (from `scan-script.ts`), `answer-key.json` (the same shape as this directory's, for those
 * rows) and `agent/<row>.design.md`. Only the verdicts go into the findings.
 *
 * THE TWO PATHS, from the same evidence:
 *   · ENGINE — `seedFromFacts` (packages/engine/file-seed.ts) over the row's facts report, run live.
 *   · AGENT  — `agent/<row>.design.md`, a design.md an agent wrote from the same report through `prism3-theme`
 *              (procedure: README.md). Committed as a fixture, so the comparison re-runs without an agent. Its
 *              picks are read through the engine's own parser and the vocabulary resolution the CLI applies
 *              (named stops, `personality`), so a lever the agent set by word is scored as the engine reads it.
 *
 * SCORING, per pick:
 *   · primary / accent — ΔE in OKLab (Euclidean, the OKLCH distance), and the hue gap in degrees.
 *     `match` ≤ 0.03; `close` ≤ 0.10 or the same hue family (gap ≤ 15° with both chromas ≥ 0.05); else `miss`.
 *     A key with no accent: no pick is `match`, a pick is `extra`. A key with one and no pick: `missing`.
 *   · families — display and body, each `match` when the names agree ignoring case and spacing.
 *   · density — `match` when equal.
 *   · radius — the nearest of the engine's named stops (vocabulary.ts SLIDER_STOPS: sharp 0, modest 0.5,
 *     standard 1, soft 1.5, round 2); `match` when the stops agree.
 *   · action — the palette the main action runs on (`actionPalette`, `primary` when unset); `match` when equal.
 *
 * INDEPENDENCE (docs/34). The answer key is authored from the sources it cites and is read, never written, here.
 * The engine path's output is not the agent's input (the agent sees only the facts report and the skill), and the
 * agent fixtures were recorded before the key's verdicts were printed to the recording agent.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDesignMd } from '../../packages/engine/design-md';
import { FILE_FACTS_FORMAT, scanFileFacts, sourceFromSnapshot, type FileFactsReport } from '../../packages/engine/file-facts';
import { seedFromFacts } from '../../packages/engine/file-seed';
import { resolveVocabulary, SLIDER_STOPS } from '../../packages/engine/vocabulary';
import { snapshotFromExport } from './snapshots';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const args = process.argv.slice(2);
const flag = (f: string): string | undefined => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };

/** The repo-derived rows (`snapshots.ts`). */
export const REPO_ROWS: Record<string, string> = {
  'reference-brand': 'reference/New Balance/tokens/raw-figma',
  prism2: 'reference/Prism2/tokens/raw-figma',
  'emission-prism3': 'packages/engine/out/figma/prism3',
  'emission-aurora': 'packages/engine/out/figma/aurora',
};

type OK = { l: number; c: number; h: number };
type Picks = { primary: OK | null; accent: OK | null; display: string | null; body: string | null; density: string; radiusScale: number; action: string };
type KeyRow = {
  kind: string; pending?: boolean;
  primary?: OK; accent?: OK | { value: null };
  families?: { display: string; body: string }; density?: { value: string }; radiusScale?: { bucket: string }; actionPalette?: { value: string };
};

const toLab = ({ l, c, h }: OK) => ({ L: l, a: c * Math.cos((h * Math.PI) / 180), b: c * Math.sin((h * Math.PI) / 180) });
export const deltaEok = (x: OK, y: OK): number => { const p = toLab(x), q = toLab(y); return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b); };
const hueGap = (a: number, b: number): number => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const norm = (s: string | null | undefined): string => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
export const radiusStop = (n: number): string =>
  Object.entries(SLIDER_STOPS.radiusScale).sort(([, a], [, b]) => Math.abs(n - (a as number)) - Math.abs(n - (b as number)))[0][0];

type ColorScore = { verdict: 'match' | 'close' | 'miss' | 'extra' | 'missing'; dE: number | null; hueGap: number | null };
export const scoreColor = (pick: OK | null, key: OK | null): ColorScore => {
  if (!key) return { verdict: pick ? 'extra' : 'match', dE: null, hueGap: null };
  if (!pick) return { verdict: 'missing', dE: null, hueGap: null };
  const dE = deltaEok(pick, key), gap = hueGap(pick.h, key.h);
  const sameFamily = gap <= 15 && pick.c >= 0.05 && key.c >= 0.05;
  return { verdict: dE <= 0.03 ? 'match' : dE <= 0.1 || sameFamily ? 'close' : 'miss', dE: Math.round(dE * 1000) / 1000, hueGap: Math.round(gap * 10) / 10 };
};

const agentPicks = (md: string): Picks => {
  const resolved = resolveVocabulary(parseDesignMd(md).input).input as Record<string, any>;
  const accent = (resolved.brandColors as { name: string; oklch: OK }[] | undefined)?.find((b) => b.name === 'accent') ?? null;
  const fam = resolved.typography?.families ?? {};
  const one = (v: unknown): string | null => (Array.isArray(v) ? (v[0] ?? null) : typeof v === 'string' ? v : null);
  return {
    primary: resolved.primary ?? null, accent: accent?.oklch ?? null,
    display: one(fam.display) ?? one(fam.title), body: one(fam.body),
    density: resolved.density ?? 'comfortable', radiusScale: typeof resolved.radiusScale === 'number' ? resolved.radiusScale : 1,
    action: typeof resolved.actionPalette === 'string' ? resolved.actionPalette : 'primary',
  };
};
const enginePicks = (r: FileFactsReport): Picks & { confidence: Record<string, number> } => {
  const s = seedFromFacts(r);
  const p = s.picks;
  return {
    primary: p.primary.value, accent: p.accent.value, display: p.families.value.display, body: p.families.value.body,
    density: p.density.value, radiusScale: p.radiusScale.value, action: p.actionPalette.value,
    confidence: { primary: p.primary.confidence, accent: p.accent.confidence, families: p.families.confidence, density: p.density.confidence, radiusScale: p.radiusScale.confidence, action: p.actionPalette.confidence },
  };
};

const score = (p: Picks, k: KeyRow) => {
  const accentKey = k.accent && 'l' in k.accent ? (k.accent as OK) : null;
  return {
    primary: scoreColor(p.primary, k.primary ?? null),
    accent: scoreColor(p.accent, accentKey),
    display: norm(p.display) === norm(k.families?.display) ? 'match' : 'miss',
    body: norm(p.body) === norm(k.families?.body) ? 'match' : 'miss',
    density: p.density === k.density?.value ? 'match' : 'miss',
    radius: radiusStop(p.radiusScale) === k.radiusScale?.bucket ? 'match' : 'miss',
    action: p.action === k.actionPalette?.value ? 'match' : 'miss',
  };
};

const fmtColor = (o: OK | null): string => {
  if (!o) return '—';
  return `L${o.l.toFixed(3)} C${o.c.toFixed(3)} H${o.h.toFixed(1)}`;
};

const main = async (): Promise<void> => {
  const reportsDir = flag('--reports');
  const externalDir = flag('--external');
  const key = JSON.parse(readFileSync(join(here, 'answer-key.json'), 'utf8')).rows as Record<string, KeyRow>;
  if (externalDir && existsSync(join(externalDir, 'answer-key.json')))
    for (const [row, k] of Object.entries(JSON.parse(readFileSync(join(externalDir, 'answer-key.json'), 'utf8')).rows as Record<string, KeyRow>))
      if (key[row]?.pending) key[row] = k;
  if (reportsDir) mkdirSync(reportsDir, { recursive: true });
  const out: unknown[] = [];
  const lines: string[] = [];
  for (const [row, k] of Object.entries(key)) {
    let report: FileFactsReport | null = null;
    if (REPO_ROWS[row]) report = await scanFileFacts(sourceFromSnapshot(snapshotFromExport(join(repo, REPO_ROWS[row]))));
    else if (externalDir && existsSync(join(externalDir, `${row}.report.json`))) report = JSON.parse(readFileSync(join(externalDir, `${row}.report.json`), 'utf8'));
    if (report && report.format !== FILE_FACTS_FORMAT) { lines.push(`\n${row}\n  REFUSED: report format ${report.format}, this harness reads ${FILE_FACTS_FORMAT}`); out.push({ row, refused: report.format }); continue; }
    if (!report) { lines.push(`\n${row} — ${k.kind}\n  PENDING: no report (README.md, "The external rows")`); out.push({ row, pending: true }); continue; }
    if (k.pending) { lines.push(`\n${row} — ${k.kind}\n  snapshot found, but the answer key for this row is not written yet`); out.push({ row, keyMissing: true }); continue; }
    if (reportsDir) writeFileSync(join(reportsDir, `${row}.json`), `${JSON.stringify(report, null, 2)}\n`);
    const e = enginePicks(report);
    const agentFile = join(REPO_ROWS[row] ? here : externalDir ?? here, 'agent', `${row}.design.md`);
    const a = existsSync(agentFile) ? agentPicks(readFileSync(agentFile, 'utf8')) : null;
    const es = score(e, k), as = a ? score(a, k) : null;
    out.push({ row, kind: k.kind, engine: { picks: e, score: es }, agent: a ? { picks: a, score: as } : null });
    lines.push(`\n${row} — ${k.kind}`);
    const c = (s: ColorScore) => `${s.verdict}${s.dE === null ? '' : ` (ΔE ${s.dE}, hue ${s.hueGap}°)`}`;
    lines.push(`  primary   engine ${c(es.primary).padEnd(34)} conf ${e.confidence.primary}   ${fmtColor(e.primary)}`);
    lines.push(`            agent  ${as ? c(as.primary) : 'no fixture'}${a ? `   ${fmtColor(a.primary)}` : ''}`);
    lines.push(`  accent    engine ${c(es.accent).padEnd(34)} conf ${e.confidence.accent}   ${fmtColor(e.accent)}`);
    lines.push(`            agent  ${as ? c(as.accent) : 'no fixture'}${a ? `   ${fmtColor(a.accent)}` : ''}`);
    lines.push(`  families  engine display ${es.display} (${e.display}), body ${es.body} (${e.body})   conf ${e.confidence.families}`);
    lines.push(`            agent  ${as && a ? `display ${as.display} (${a.display}), body ${as.body} (${a.body})` : 'no fixture'}`);
    lines.push(`  density   engine ${es.density} (${e.density})   conf ${e.confidence.density}    agent ${as && a ? `${as.density} (${a.density})` : 'no fixture'}`);
    lines.push(`  action    engine ${es.action} (${e.action})   conf ${e.confidence.action}    agent ${as && a ? `${as.action} (${a.action})` : 'no fixture'}`);
    lines.push(`  radius    engine ${es.radius} (${e.radiusScale} → ${radiusStop(e.radiusScale)})   conf ${e.confidence.radiusScale}    agent ${as && a ? `${as.radius} (${a.radiusScale} → ${radiusStop(a.radiusScale)})` : 'no fixture'}`);
  }
  if (args.includes('--json')) process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
  else console.log(`#2075 part 2 — engine-only seed vs agent design.md, scored against answer-key.json${lines.join('\n')}`);
};

await main();
