/**
 * `report.ts` — turn a run's returned JSON into one pass/fail summary (#111 / #1553).
 *
 *   npx tsx tools/figma-mcp/report.ts --manifest <out>/manifest.json --results <out>/results
 *                                     [--ledger-out <file>] [--json]
 *
 *   --results     a directory of `NNN.json` files (NNN = the script's `order` in the manifest, the value
 *                 each `use_figma` call returned, saved unedited), or one JSON file holding an array of them.
 *   --ledger-out  write the merged shared-plugin-data ledger (only produced when the host refused shared
 *                 plugin data) — pass it to the next `plan.ts --ledger` run FOR THE SAME FILE.
 *   --json        print the summary as JSON instead of text.
 *
 * Sections: pre-flight conflicts; per-step throws, misses and refusals; text styles skipped and typefaces
 * unavailable; renames; the read-back compared with the plan (missing, type, scope, value, alias,
 * description, modes, orphans, stranded collections, styles); and per component: misses, the set's
 * variant count against the plan, and which page-loading path the host took.
 *
 * A TOOL (tools/CLAUDE.md): it answers and exits 0. A missing or unreadable input exits 2. The logic is
 * `summarize` in `apps/plugin/mcp-paste.ts`, which the plugin's `test-mcp-paste.ts` exercises.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { summarize, mergeLedgers } from '../../apps/plugin/mcp-paste';
import type { ManifestLike } from '../../apps/plugin/mcp-paste';
import type { StepReport, Ledger } from '../../apps/plugin/src/mcp-steps';

const fail = (msg: string): never => { console.error(`report.ts: ${msg}`); process.exit(2); };
const args = process.argv.slice(2);
const opt = (name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };

const manifestPath = resolve(process.cwd(), opt('manifest') ?? fail('--manifest is required'));
const resultsPath = resolve(process.cwd(), opt('results') ?? fail('--results is required'));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ManifestLike & { ledger: Ledger | null };

/** A result as `use_figma` returned it. Some clients wrap the value; unwrap the one shape we know of. */
const unwrap = (x: unknown): StepReport => {
  const o = x as { result?: unknown; step?: unknown };
  return (o && typeof o === 'object' && o.step === undefined && o.result && typeof o.result === 'object' ? o.result : x) as StepReport;
};
const results = new Map<number, StepReport>();
if (statSync(resultsPath).isDirectory()) {
  for (const f of readdirSync(resultsPath)) {
    const m = /^(\d+)[^/]*\.json$/.exec(f);
    if (m) results.set(Number(m[1]), unwrap(JSON.parse(readFileSync(join(resultsPath, f), 'utf8'))));
  }
} else {
  const arr = JSON.parse(readFileSync(resultsPath, 'utf8')) as unknown[];
  if (!Array.isArray(arr)) fail('--results file must hold an array');
  for (const x of arr) { const r = unwrap(x); if (typeof r.step === 'number') results.set(r.step, r); }
}

const s = summarize(manifest, results);
const ledgerOut = opt('ledger-out');
if (ledgerOut) {
  const merged = mergeLedgers([...results.values()], manifest.ledger ?? undefined);
  if (merged) { writeFileSync(resolve(process.cwd(), ledgerOut), JSON.stringify(merged, null, 2) + '\n'); s.info.push(`ledger written to ${ledgerOut}`); }
  else s.info.push('no ledger to write — the host kept shared plugin data in the file');
}
if (args.includes('--json')) console.log(JSON.stringify(s, null, 2));
else {
  console.log(`VERDICT: ${s.verdict}  (${results.size}/${manifest.scripts.length} results)`);
  for (const [head, lines] of [['FAIL', s.fail], ['WARN', s.warn], ['INFO', s.info]] as const) {
    if (!lines.length) continue;
    console.log(`\n${head}`);
    for (const l of lines) console.log(`  - ${l}`);
  }
}
