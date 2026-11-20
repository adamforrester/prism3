/**
 * THE REAL-HOST COMPONENT ROUND TRIP (#1218; owner decision of 2026-11-18, B). Builds the projected component defs into
 * the scratch Figma file open on the Mac, through the Desktop Bridge, reads them back out of that file, diffs them
 * against the plan that built them, and reports per def.
 *
 *   npx tsx tools/component-roundtrip/roundtrip.ts scripts --scratch-file '<file name>' --out <dir> [--def field-label[,<id>…]] [--run-id <id>]
 *   npx tsx tools/component-roundtrip/roundtrip.ts report  --out <dir> [--json]
 *
 * WHY A REAL HOST. The offline round trip (`apps/plugin/test-roundtrip.ts`, #874/#1205) drives the plugin's executor
 * against a shim, which reproduces only the discards it was taught. #866 (`field-label`'s TEXT property refs, discarded
 * in live Figma) is invisible to it by construction: the shim keeps node identity across `createComponentFromNode` and
 * `combineAsVariants`, so the write and the read-back always meet the same object. Teaching the shim the bug would make
 * the check prove our theory of it (docs/34 shape 17). Only a real host can say the fix holds, so `field-label` is the
 * default def and #866's permanent guard.
 *
 * `scripts` writes the run into `<dir>`: `run.json` (the run id, the defs, the plan hash), the numbered scripts the Mac
 * passes to the Desktop Bridge one per call, and `manifest.json` (order, file, what each returns). The payload is the
 * in-host round trip (`host-roundtrip.ts`: the plugin's `applyComponentPlan`, then `diffAnatomy`) with the plans as
 * data. It is too big for one call, so the first scripts STAGE it in the plugin's global scope, one slice per call,
 * and the last one checks the staged text against its length and hash, then runs it. A host that does not keep its
 * global scope between calls makes that check fail, and nothing is written.
 *
 * `report` reads `<dir>/result.json` (the last script's return value, saved unedited), checks its plan hash against
 * the plans this checkout projects for the same defs, and prints one line per def, then each divergence as
 * `<def> · <member> · <path> · <field>: expected …, got …`. The divergences are computed in the host by the same
 * `diffAnatomy` the offline gate uses; `report` only reads them.
 *
 * A TOOL (tools/CLAUDE.md): it answers and exits 0, even when a def diverges. It exits 1 only when it cannot answer: a
 * result that is missing, malformed, refused, or from different plans. Exit 2 is bad usage. It is not in `ci.yml`,
 * because CI has no Figma host. Its offline self-test is `selftest.ts`.
 *
 * PUBLIC REPO: the scratch file's name is a flag, written only into `<dir>`, which is the Mac's and never committed.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { componentDefs, figmaAnatomySet, type ComponentDef } from '@prism3/engine/components';
import { missingDependencies, SWAP_TARGET } from '../../apps/plugin/src/build-deps';
import { fnv, RESULT_FORMAT, type DefInput, type RunData, type RunResult } from './host-roundtrip';

const HERE = dirname(fileURLToPath(import.meta.url));
/** One script's ceiling, as `apps/plugin/mcp-paste.ts`'s `SCRIPT_CEILING`: room under a 50,000-character tool limit. */
export const SCRIPT_CEILING = 45_000;
/** A staged slice, leaving room for its wrapper inside the ceiling. */
export const SLICE = 40_000;
export const DEFAULT_DEFS = ['field-label'];

/** The plan, exactly as the offline round trip projects it, with the swap target the PLUGIN nominates. */
export const plansFor = (def: ComponentDef) => figmaAnatomySet(def, { swapTarget: SWAP_TARGET });

/** The defs to build, each def's nested and swapped-to defs first (as the plugin's prebuild does), deduplicated. */
export const runDefs = (ids: readonly string[]): DefInput[] => {
  const out: DefInput[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const def = componentDefs.find((d) => d.id === id);
    if (!def) throw new Error(`no def '${id}'`);
    if (!def.figmaProperties) throw new Error(`'${id}' declares no Figma projection, so there is nothing to build`);
    const deps = missingDependencies(def, { defs: componentDefs, project: plansFor, present: () => false });
    for (const { def: dep } of deps) {
      if (seen.has(dep.id)) continue;
      seen.add(dep.id);
      out.push({ id: dep.id, plans: plansFor(dep), dependency: !ids.includes(dep.id), ...(dep.figmaProperties?.emitAsComponents ? { emitAsComponents: true } : {}) });
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, plans: plansFor(def), ...(def.figmaProperties.emitAsComponents ? { emitAsComponents: true } : {}) });
  }
  return out;
};

export const planHashOf = (defs: readonly DefInput[]): string => fnv(JSON.stringify(defs.map((d) => [d.id, d.plans])));

/** The in-host round trip as one minified IIFE exposing `__p3rt.run`. */
export const bundle = async (): Promise<string> => {
  const out = await build({
    stdin: { contents: `export { run } from './host-roundtrip';`, resolveDir: HERE, loader: 'ts' },
    bundle: true, minify: true, format: 'iife', globalName: '__p3rt', platform: 'neutral', target: 'es2020',
    mainFields: ['module', 'main'], write: false, legalComments: 'none',
  });
  return out.outputFiles[0].text.trim();
};

/** The body every staged slice adds up to: the body of an async function, as the Desktop Bridge and `run-code` take. */
export const body = (code: string, data: RunData): string => `const __D=${JSON.stringify(data)};\n${code}\nreturn await __p3rt.run(figma, __D);`;

export type Script = { order: number; file: string; kind: 'stage' | 'run'; js: string; expect: string };

/** The staged scripts and the run script for one body. Pure, so the self-test runs exactly what the Mac runs. */
export const scriptsFor = (runId: string, text: string): Script[] => {
  const key = JSON.stringify(runId);
  const n = Math.ceil(text.length / SLICE);
  const scripts: Script[] = [];
  for (let i = 0; i < n; i++) {
    const js = [
      `const g=globalThis, s=(g.__p3rtStage=g.__p3rtStage||{}), a=(s[${key}]=s[${key}]||[]);`,
      `a[${i}]=${JSON.stringify(text.slice(i * SLICE, (i + 1) * SLICE))};`,
      `return {stage:${i + 1},of:${n},staged:a.filter((x)=>typeof x==='string').length};`,
    ].join('\n');
    scripts.push({ order: i + 1, file: '', kind: 'stage', js, expect: `{ stage: ${i + 1}, of: ${n}, staged: ${i + 1} } — read-only, it writes nothing to the file` });
  }
  const run = [
    `const g=globalThis, a=((g.__p3rtStage||{})[${key}])||[];`,
    `const t=a.length===${n}&&a.every((x)=>typeof x==='string')?a.join(''):null;`,
    `const fnv=${fnv.toString()};`,
    `if(t===null||t.length!==${text.length}||fnv(t)!==${JSON.stringify(fnv(text))}) return {format:${JSON.stringify(RESULT_FORMAT)},runId:${key},refused:'the staged scripts are not all here, or do not add up to the run (this host may not keep its global scope between calls); nothing was written',defs:[],violations:[]};`,
    `delete g.__p3rtStage[${key}];`,
    `return await (0, eval)('(async function(){'+t+'\\n})()');`,
  ].join('\n');
  scripts.push({ order: n + 1, file: '', kind: 'run', js: run, expect: `{ format: '${RESULT_FORMAT}', defs: [...], violations: [] } — save it, unedited, as result.json` });
  const pad = (k: number) => String(k).padStart(3, '0');
  for (const s of scripts) s.file = `${pad(s.order)}-${s.kind}.js`;
  return scripts;
};

/** One line per def and one per divergence, in the order the run built them. */
export const reportLines = (result: RunResult, expectedHash: string): { lines: string[]; answered: boolean } => {
  const lines: string[] = [];
  if (result?.format !== RESULT_FORMAT) return { lines: [`CANNOT ANSWER: result.json is not a ${RESULT_FORMAT} result`], answered: false };
  if (result.refused) return { lines: [`CANNOT ANSWER: the run was refused: ${result.refused}`], answered: false };
  if (result.planHash !== expectedHash) return { lines: [`CANNOT ANSWER: the result was built from plans hashed ${result.planHash}; this checkout projects ${expectedHash} for the same defs. Report from the commit the scripts were written at.`], answered: false };
  for (const d of result.defs) {
    const tag = d.dependency ? ' (built for a def that nests it)' : '';
    if (d.threw) { lines.push(`✗ ${d.def}${tag}: the build threw: ${d.threw}`); continue; }
    if (!d.diffed) { lines.push(`· ${d.def}${tag}: built as standalone components, ${d.misses.length} executor miss(es); not diffed`); continue; }
    const verdict = d.divergenceCount === 0 && d.built === d.planned ? '✓' : '✗';
    lines.push(`${verdict} ${d.def}${tag}: ${d.built}/${d.planned} members read back, ${d.divergenceCount} divergence(s), ${d.misses.length} executor miss(es)`);
    for (const v of d.divergences) lines.push(`    ${d.def} · ${v.member} · ${v.path} · ${v.field}: expected ${v.expected}, got ${v.actual}`);
    if (d.divergenceCount > d.divergences.length) lines.push(`    … and ${d.divergenceCount - d.divergences.length} more, not returned`);
  }
  for (const v of result.violations) lines.push(`✗ SAFETY: ${v}`);
  const bad = result.defs.filter((d) => d.threw || (d.diffed && (d.divergenceCount > 0 || d.built !== d.planned))).length;
  lines.push(`${bad === 0 && !result.violations.length ? 'CLEAN' : 'DIVERGED'}: ${result.defs.length} def(s), ${bad} with a finding, ${result.violations.length} safety violation(s)`);
  return { lines, answered: true };
};

// ── CLI ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const isMain = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
  const usage = (msg: string): never => { console.error(`roundtrip.ts: ${msg}`); process.exit(2); };
  const cmd = args[0];
  const outArg = opt('out') ?? usage('--out <dir> is required');
  const out = resolve(process.cwd(), outArg);
  if (cmd === 'scripts') {
    const scratchFile = opt('scratch-file') ?? usage('--scratch-file is required: the exact name of the open scratch file. The run refuses any other file.');
    if (!scratchFile.trim()) usage('--scratch-file is empty');
    const ids = (opt('def') ?? DEFAULT_DEFS.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
    const runId = opt('run-id') ?? new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    let defs: DefInput[];
    try { defs = runDefs(ids); } catch (e) { usage((e as Error).message); }
    const data: RunData = { runId, scratchFile, defs: defs!, planHash: planHashOf(defs!) };
    const scripts = scriptsFor(runId, body(await bundle(), data));
    mkdirSync(out, { recursive: true });
    for (const f of readdirSync(out)) if (/^\d{3}-(stage|run)\.js$/.test(f) || f === 'result.json') rmSync(join(out, f));
    for (const s of scripts) writeFileSync(join(out, s.file), s.js);
    writeFileSync(join(out, 'run.json'), JSON.stringify({ runId, defs: defs!.map((d) => ({ id: d.id, members: d.plans.length, dependency: !!d.dependency })), planHash: data.planHash }, null, 2) + '\n');
    writeFileSync(join(out, 'manifest.json'), JSON.stringify({
      tool: 'prism3 component round trip (#1218)',
      runId,
      rules: [
        'Run ONLY with the scratch file named in --scratch-file open and in front. The run script refuses any other file.',
        'One script per Desktop Bridge call, in `order`. Never two at once. Never edit a script.',
        'Stop at the first script that does not return what `expect` says.',
        'Save the last script\'s return value, unedited, as result.json in this directory.',
      ],
      scripts: scripts.map(({ js, ...m }) => ({ ...m, chars: js.length })),
    }, null, 2) + '\n');
    const largest = Math.max(...scripts.map((s) => s.js.length));
    console.log(`wrote ${scripts.length} scripts to ${out} for ${defs!.map((d) => d.id).join(', ')} (largest ${largest} of ${SCRIPT_CEILING} characters); run id ${runId}`);
    process.exit(largest > SCRIPT_CEILING ? 1 : 0);
  } else if (cmd === 'report') {
    const resultPath = join(out, 'result.json');
    const runPath = join(out, 'run.json');
    if (!existsSync(runPath)) { console.error(`CANNOT ANSWER: no run.json in ${out}; write the scripts first`); process.exit(1); }
    if (!existsSync(resultPath)) { console.error(`CANNOT ANSWER: no result.json in ${out}; save the last script's return value there`); process.exit(1); }
    const run = JSON.parse(readFileSync(runPath, 'utf8')) as { defs: { id: string; dependency: boolean }[] };
    let result: RunResult;
    try { result = JSON.parse(readFileSync(resultPath, 'utf8')); } catch (e) { console.error(`CANNOT ANSWER: result.json is not JSON (${(e as Error).message})`); process.exit(1); }
    const expected = planHashOf(runDefs(run.defs.filter((d) => !d.dependency).map((d) => d.id)));
    const { lines, answered } = reportLines(result!, expected);
    if (args.includes('--json')) console.log(JSON.stringify({ answered, lines, result: result! }, null, 2));
    else console.log(lines.join('\n'));
    process.exit(answered ? 0 : 1);
  } else {
    usage('the first argument is `scripts` or `report`');
  }
}
