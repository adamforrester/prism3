/**
 * The file facts scan (#2075 part 1) from a command line, over a plain-data snapshot instead of a live file.
 *
 *   npx tsx packages/engine/file-facts-cli.ts <snapshot.json> [--out <report.json>]
 *
 * The scan itself is `file-facts.ts`, node-free so the plugin bundles it; this file is only the Node wrapper that
 * reads the snapshot and writes the report, so the scan stays one function whichever host runs it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { scanFileFacts, sourceFromSnapshot, type FactsSnapshot } from './file-facts';

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--'));
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args[outAt + 1] : undefined;
if (!input || (outAt >= 0 && !out)) {
  console.error('usage: npx tsx packages/engine/file-facts-cli.ts <snapshot.json> [--out <report.json>]');
  process.exit(2);
}
// #4200 B (DRAFT): a missing or malformed snapshot is one line naming the file and the cause, as `cli.ts`'s `fail()`
// prints, never a raw ENOENT or SyntaxError stack.
const failWith = (msg: string): never => { console.error(`✖ ${msg}`); process.exit(1); };
let raw = '';
try { raw = readFileSync(input, 'utf8'); }
catch (e) { failWith((e as NodeJS.ErrnoException).code === 'ENOENT' ? `cannot read snapshot ${input}: no such file` : `cannot read snapshot ${input}: ${(e as Error).message}`); }
let snapshot: FactsSnapshot = {} as FactsSnapshot;
try { snapshot = JSON.parse(raw) as FactsSnapshot; }
catch (e) { failWith(`${input} is not JSON: ${(e as Error).message}`); }
const report = await scanFileFacts(sourceFromSnapshot(snapshot));
const text = `${JSON.stringify(report, null, 2)}\n`;
if (out) writeFileSync(out, text);
else process.stdout.write(text);
