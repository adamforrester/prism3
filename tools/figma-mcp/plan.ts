/**
 * `plan.ts` — write the numbered `use_figma` scripts for one brand, plus a manifest (#111 / #1553).
 *
 *   npx tsx tools/figma-mcp/plan.ts --brand <file.design.md | example id> [--apply] [--build all|<id>,<id>]
 *                                   --out <dir> [--ledger <ledger.json>] [--cleanup]
 *
 *   --brand     a `.design.md` path (either dialect), or an example id: `aurora`, `harbor`, `nb-redesign`,
 *               `wendys` (packages/engine/examples/), or an `example-brands.json` id.
 *   --apply     the paste-in Apply Theme: pre-flight, the writes, the read-back.
 *   --build     components, in dependency order (`all`, or a comma list of def ids — each def's nested and
 *               swapped-to defs are scheduled first), then one read-back per component page.
 *   --ledger    a merged ledger from a previous run (`report.ts --ledger-out`), for a host that refuses
 *               shared plugin data — see the runbook. Valid ONLY for the file it came from.
 *   --cleanup   also write the scratch-file wipe scripts into `<out>/cleanup/`.
 *   --out       the directory to write into. Existing `NNN-*.js` files there are replaced.
 *
 * A TOOL, not a gate (tools/CLAUDE.md): it writes scripts and exits 0. The gate over the same generator is
 * `apps/plugin/test-mcp-paste.ts`, run as part of the plugin's `test`.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  themeScripts, themeCleanupScript, componentScripts, componentCleanupScripts, number, brandFromDesignMd,
  SCRIPT_CEILING, ENGINE_VERSION,
} from '../../apps/plugin/mcp-paste';
import type { Script } from '../../apps/plugin/mcp-paste';
import type { Ledger } from '../../apps/plugin/src/mcp-steps';
import type { BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXAMPLES = resolve(HERE, '../../packages/engine/examples');

const fail = (msg: string): never => { console.error(`plan.ts: ${msg}`); process.exit(2); };
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
if (flag('help') || !args.length) { console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]); process.exit(0); }

const spec = opt('brand') ?? fail('--brand is required');
const out = resolve(process.cwd(), opt('out') ?? fail('--out is required'));
const apply = flag('apply');
const buildArg = opt('build');
if (!apply && !buildArg) fail('nothing to do — pass --apply, --build, or both');

/** A brand spec → its input, and where it came from. */
const loadBrand = (s: string): { input: BrandInput; source: string } => {
  const asPath = resolve(process.cwd(), s);
  if (existsSync(asPath) && s.endsWith('.md')) return { input: brandFromDesignMd(readFileSync(asPath, 'utf8')), source: asPath };
  const example = resolve(EXAMPLES, `${s}.design.md`);
  if (existsSync(example)) return { input: brandFromDesignMd(readFileSync(example, 'utf8')), source: `packages/engine/examples/${s}.design.md` };
  const json = (exampleBrands as Record<string, BrandInput>)[s];
  if (json) return { input: json, source: `packages/engine/schema/example-brands.json#${s}` };
  const ids = readdirSync(EXAMPLES).filter((f) => f.endsWith('.design.md')).map((f) => f.replace('.design.md', ''));
  return fail(`no brand '${s}' — pass a .design.md path, or one of: ${[...ids, ...Object.keys(exampleBrands)].join(', ')}`);
};
const { input, source } = loadBrand(spec);
const ledgerPath = opt('ledger');
const ledger: Ledger | undefined = ledgerPath ? JSON.parse(readFileSync(resolve(process.cwd(), ledgerPath), 'utf8')) : undefined;
const requested: 'all' | string[] | null = buildArg === undefined ? null : buildArg === 'all' ? 'all' : buildArg.split(',').map((x) => x.trim()).filter(Boolean);

const main = number([
  ...(apply ? themeScripts(input, { ledger }) : []),
  ...(requested ? componentScripts(input, requested) : []),
]);
const cleanup = flag('cleanup')
  ? number([...(requested ? componentCleanupScripts(input, requested) : []), themeCleanupScript(input, { ledger })])
  : [];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pad = (n: number) => String(n).padStart(3, '0');
const write = (dir: string, scripts: Script[]) => {
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (/^\d{3}-.*\.js$/.test(f)) rmSync(join(dir, f));
  return scripts.map((s, i) => {
    const file = `${pad(i + 1)}-${slug(s.label)}.js`;
    writeFileSync(join(dir, file), s.js);
    const { js, ...meta } = s;
    return { order: i + 1, file, ...meta, chars: js.length };
  });
};

const manifest = {
  tool: 'prism3 figma-mcp plan (#111, #1553)',
  engineVersion: ENGINE_VERSION,
  brand: { spec, source, id: input.id, root: (input as { root?: string }).root ?? null },
  /** Kept whole so `report.ts` rebuilds exactly this plan without re-reading the brief. */
  brandInput: input,
  ceiling: SCRIPT_CEILING,
  options: { apply, build: requested, ledger: ledgerPath ?? null },
  ledger: ledger ?? null,
  rules: [
    'Run ONLY against a file the owner has designated as scratch.',
    'One script per use_figma call, in `order`. Never run two at once.',
    'Save every returned value, unedited, as results/NNN.json (NNN = the script\'s order).',
    'If any pre-flight result has ok:false, stop: write nothing, report the conflicts.',
    'If a write step throws or returns ok:false, stop and report; every step is safe to re-run once fixed.',
  ],
  scripts: write(out, main),
  cleanup: cleanup.length ? write(join(out, 'cleanup'), cleanup) : [],
  resultShape: {
    common: '{ step, of, label, kind, ok, shared?: {mode:"live"} | {mode:"ledger", reason}, ledger?, threw? }',
    preflight: '+ { conflicts: {kind, name, detail}[] }',
    'color | float | font | styles | grid | text | persist': '+ { fonts, migration?, created, total, bound, misses[], refused?[], skipped?[] }',
    'readback-vars': '+ { total, collections: {id,name,modes,owned}[], variables: [collection,name,type,scopes,hidden,description,valuesByMode][], rootBrand }',
    'readback-styles': '+ { styles: { text|effect|paint|grid: {name, description, bound[], …}[] } }',
    'component-chunk': '+ { def, page, host: {loadAllPages}, result: <the engine payload\'s own return>, misses[] }',
    'component-emit': '+ { def, page, members: {name, status, id, misses}[], misses[] }',
    'readback-components': '+ { page, found: {name, type, variants?, properties?}[], absentPage? }',
    'cleanup-theme | cleanup-page': '+ { removed[], kept[] }',
  },
};
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const largest = Math.max(...main.map((s) => s.js.length), 0);
console.log(`wrote ${main.length} scripts${cleanup.length ? ` + ${cleanup.length} cleanup` : ''} to ${out} (largest ${largest} of ${SCRIPT_CEILING} characters)`);
for (const [phase, n] of Object.entries(main.reduce<Record<string, number>>((m, s) => ({ ...m, [s.phase]: (m[s.phase] ?? 0) + 1 }), {}))) console.log(`  ${phase}: ${n}`);
