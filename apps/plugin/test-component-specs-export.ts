/**
 * THE PLUGIN'S EXPORT OF THE COMPONENT CONTRACTS (#1325, found in the review of #3992) — the exporter the iframe entry
 * provides to the shared studio UI, called as the Export dialog calls it.
 *
 *   npx tsx apps/plugin/test-component-specs-export.ts
 *
 *   names/…   the dialog's listed names are the three files, written out here by hand, in order: the contract-named
 *             file, its compatibility copy, the Specs projection. Mutation: drop `n.contracts` from `fileNames`
 *             → `names/listed`.
 *   files/…   the files written are exactly the names listed, and the contract-named file and its compatibility copy
 *             carry the same bytes. Mutation: drop the `n.contracts` entry from `files` → `files/match the listed
 *             names`; give it other text → `files/same bytes`.
 *
 * EXPECTED is typed here, not taken from `componentDefsFileNames`, so a change to the names in the engine fails this
 * suite instead of moving it (docs/34). If the owner renames the file, these literals move in the same PR.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BrandInput } from '@prism3/engine';
import './src/ui/component-specs-export';
import { componentSpecsExporter } from '../studio/src/state/component-specs-export';
import { brandFromDesignMd } from './mcp-paste';

let failures = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (!cond) failures++;
  console.log(`  ${cond ? '✓' : '✗'} ${label}`);
};

const exporter = componentSpecsExporter();
ok(exporter !== null, '#1325 premise: the plugin entry provides a component-contracts exporter');
const input: BrandInput = brandFromDesignMd(readFileSync(join(import.meta.dirname, '../../packages/engine/examples/prism3.design.md'), 'utf8'));
const want = ['cs.component-contracts.json', 'cs.component-defs.json', 'cs.component-defs.specs.json'];

console.log('1. the names the dialog lists');
const listed = exporter?.fileNames('cs') ?? [];
ok(JSON.stringify(listed) === JSON.stringify(want), `#1325 names/listed: ${JSON.stringify(listed)}`);

console.log('2. the files written');
const files = exporter?.files(input, 'cs') ?? [];
const written = files.map((f) => f.name);
ok(JSON.stringify(written) === JSON.stringify(listed), `#1325 files/match the listed names: ${JSON.stringify(written)}`);
const text = (name: string) => files.find((f) => f.name === name)?.text;
const con = text('cs.component-contracts.json');
const defs = text('cs.component-defs.json');
ok(con !== undefined && defs !== undefined && con === defs,
  `#1325 files/same bytes: the contract-named file and its compatibility copy — ${con === undefined ? 'no contracts file' : defs === undefined ? 'no compatibility copy' : con === defs ? 'equal' : `${con.length} vs ${defs.length} bytes`}`);
let parsed: { components?: Record<string, unknown> } = {};
try { parsed = JSON.parse(con ?? '{}'); } catch { /* reported below */ }
ok(Object.keys(parsed.components ?? {}).length > 0, `#1325 files/premise: the contracts file holds components (${Object.keys(parsed.components ?? {}).length})`);
ok(!!text('cs.component-defs.specs.json'), '#1325 files/the Specs projection is written');

console.log(failures ? `\n❌ ${failures} FAILED — ${executed} assertions executed` : `\n✅ ALL PASS — ${executed} assertions executed`);
process.exit(failures ? 1 : 0);
