/**
 * THE OFFLINE SELF-TEST for the real-host round trip (#1218). It runs the scripts `roundtrip.ts scripts` writes, the
 * same bytes the Mac passes to the Desktop Bridge, one per call in a shared global scope, against the plugin's
 * component shim (`apps/plugin/component-shim.ts`) dressed as a file. Then it reads the result with `report`'s own
 * function. Nothing here is a second copy of the tool: a verdict below is about the code the Mac runs.
 *
 *   npx tsx tools/component-roundtrip/selftest.ts          (exits 1 if any arm fails)
 *
 * WHAT IT CAN AND CANNOT PROVE. The shim is the offline gate's host, so a CLEAN run here says the tool's plumbing
 * (staging, the plan hash, the ports, the per-def report) works and adds no findings of its own. It cannot say what
 * real Figma keeps: that is the tool's whole reason to exist (docs/34 shape 17), and only the Mac run answers it.
 *
 * THE ARMS
 *   clean          the default run (field-label) reads back every member with no divergence, and the report says CLEAN.
 *   planted        a host that ACCEPTS AND DISCARDS a TEXT node's property references (#866's shape) must be reported
 *                  BY NAME: a `field-label · <member> · <path> · propertyRef` line, `characters → DISCARDED`. The field
 *                  and the wording are literals here, not read from the reader.
 *   not-scratch    a file whose name is not the --scratch-file name: refused, no version saved, no page made.
 *   no-version     a host that refuses to save a version: refused, no page made.
 *   import-by-key  the guarded host throws on every import-by-key method, on `figma` and `figma.variables`, and records
 *                  it; and it reads a FIXED host method without throwing (#3209: a Proxy over `figma` threw there).
 *   import-by-key-run  run() hands the executor the GUARDED host: an executor that asks the host it was given for an
 *                  import-by-key method is refused and reported as SAFETY, and the raw host's method is never reached.
 *   page-deleted   a host that loses a page during the run: reported as a safety violation, naming the page.
 *   staging-lost   the run script alone, in a fresh global scope: refused, nothing written.
 *   other-plans    a result whose plan hash is not this checkout's: CANNOT ANSWER.
 *   no-import-site the bundle names each import-by-key method once, in the guard's list: no other call site.
 *   ceiling        every script is within the 45,000-character ceiling.
 */
import { componentDefs, planBoundVars, planPaintVars, planTextStyles, planEffectStyles, type AnatomyPlan } from '@prism3/engine/components';
import { makeShim, type Node } from '../../apps/plugin/component-shim';
import { body, bundle, planHashOf, reportLines, runDefs, scriptsFor, SCRIPT_CEILING, type Script } from './roundtrip';
import { guardedHost, IMPORT_BY_KEY, run, type RunData, type RunResult } from './host-roundtrip';
import { applyComponentPlan } from '../../apps/plugin/src/write-components';

let failed = 0;
const ok = (cond: boolean, label: string, detail = ''): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`); }
};

const SCRATCH = 'Round-trip self-test scratch';
const defs = runDefs(['field-label']);
const plans: AnatomyPlan[] = defs.flatMap((d) => d.plans);
const code = await bundle();

type Page = { id: string; name: string; type: 'PAGE'; children: Node[]; appendChild: (n: Node) => void; findOne: (f: (n: Node) => boolean) => Node | null };
let pageSeq = 0;
const mkPage = (name: string): Page => {
  const p: Page = {
    id: `PAGE:${++pageSeq}`, name, type: 'PAGE', children: [],
    appendChild(n: Node) { (n as { parent?: unknown }).parent = p; p.children.push(n); },
    findOne(f) { return p.children.find(f) ?? null; },
  };
  return p;
};

/** The shim, dressed as a FILE: a name, pages, `createPage`. Catalogs from the plans, as `test-roundtrip.ts`'s `fullFor`. */
const fileHost = (o: { name?: string; refuseVersion?: boolean; discardTextRefs?: boolean; losePageOnCreate?: boolean } = {}) => {
  const comps = (n: { swapTarget?: string; nestTarget?: string; children: unknown[] }): string[] => [
    ...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []), ...(n.children as (typeof n)[]).flatMap(comps),
  ];
  const shim = makeShim({
    vars: [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
    styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set(plans.flatMap((p) => comps(p.root)))],
    ...(o.refuseVersion ? { refuseVersion: true } : {}),
    // #866's SHAPE, planted: the host takes a TEXT node's property-reference write and keeps nothing.
    ...(o.discardTextRefs ? {
      wrapNode: (n: Node) => new Proxy(n, {
        set: (t, k, v) => (k === 'componentPropertyReferences' && (t as { type?: unknown }).type === 'TEXT' ? true : Reflect.set(t, k, v)),
      }),
    } : {}),
  }) as unknown as Record<string, unknown> & { root: Record<string, unknown>; _versions: string[] };
  const pages: Page[] = [mkPage('Existing work')];
  Object.defineProperty(shim.root, 'children', { get: () => pages, configurable: true });
  Object.defineProperty(shim.root, 'name', { value: o.name ?? SCRATCH, configurable: true });
  shim.createPage = () => {
    const p = mkPage('Page');
    pages.push(p);
    if (o.losePageOnCreate) pages.splice(0, 1);
    return p;
  };
  return { shim, pages };
};

const AsyncFunction = (async () => {}).constructor as new (...a: string[]) => () => Promise<unknown>;
/** Run scripts as the Desktop Bridge does: each one the body of an async function, `figma` a global, one global scope. */
const runScripts = async (host: unknown, scripts: readonly Script[]): Promise<unknown[]> => {
  (globalThis as Record<string, unknown>).figma = host;
  const out: unknown[] = [];
  for (const s of scripts) out.push(await new AsyncFunction(s.js)());
  return out;
};

const runWith = async (host: unknown, scratchFile = SCRATCH): Promise<RunResult> => {
  const data: RunData = { runId: `selftest-${pageSeq}`, scratchFile, defs, planHash: planHashOf(defs) };
  const results = await runScripts(host, scriptsFor(data.runId, body(code, data)));
  return results[results.length - 1] as RunResult;
};

console.log('component round trip (#1218) — offline self-test\n');

{
  const { shim, pages } = fileHost();
  const r = await runWith(shim);
  const fl = r.defs.find((d) => d.def === 'field-label');
  const rep = reportLines(r, planHashOf(defs));
  ok(!r.refused && r.versionSaved === true && pages.length === 2, 'clean: version saved, one new page, not refused', JSON.stringify({ refused: r.refused, pages: pages.length }));
  ok(!!fl && fl.diffed && fl.built === fl.planned && fl.planned === plans.length, `clean: field-label read back ${fl?.built}/${fl?.planned} members`);
  ok(fl?.divergenceCount === 0, `clean: no divergence`, fl?.divergences.slice(0, 3).map((v) => `${v.member} · ${v.path} · ${v.field}: ${v.expected} / ${v.actual}`).join(' | '));
  ok(rep.answered && rep.lines.at(-1)?.startsWith('CLEAN') === true, `clean: report says CLEAN`, rep.lines.at(-1));
  ok(shim._versions.length === 1, 'clean: exactly one version saved, before the build');
}

{
  const { shim } = fileHost({ discardTextRefs: true });
  const r = await runWith(shim);
  const rep = reportLines(r, planHashOf(defs));
  const named = rep.lines.filter((l) => /^ {4}field-label · [^·]+ · [^·]+ · propertyRef: expected characters ← .+, got characters → DISCARDED/.test(l));
  ok(named.length > 0, `planted: the discard is reported by name (${named.length} line(s)), e.g. ${named[0]?.trim() ?? '—'}`, rep.lines.slice(0, 4).join(' | '));
  ok(rep.lines.at(-1)?.startsWith('DIVERGED') === true, 'planted: report says DIVERGED', rep.lines.at(-1));
}

{
  const { shim, pages } = fileHost({ name: 'Somebody\'s real file' });
  const r = await runWith(shim);
  ok(!!r.refused && /not the scratch file/.test(r.refused) && shim._versions.length === 0 && pages.length === 1, 'not-scratch: refused, no version, no page', JSON.stringify(r.refused));
  ok(!reportLines(r, planHashOf(defs)).answered, 'not-scratch: report cannot answer');
}

{
  const { shim, pages } = fileHost({ refuseVersion: true });
  const r = await runWith(shim);
  ok(!!r.refused && /could not save a version/.test(r.refused) && pages.length === 1, 'no-version: refused before any write, no page', JSON.stringify(r.refused));
}

{
  const { shim } = fileHost();
  const seen: string[] = [];
  const g = guardedHost(shim as object, seen) as unknown as Record<string, unknown> & { variables: Record<string, unknown> };
  const threw = (f: unknown): boolean => { try { (f as () => unknown)(); return false; } catch { return true; } };
  ok(threw(g.importComponentByKeyAsync) && threw(g.importComponentSetByKeyAsync) && threw(g.importStyleByKeyAsync) && threw(g.variables.importVariableByKeyAsync),
    'import-by-key: every import-by-key method throws, on figma and figma.variables');
  ok(seen.length === 4, `import-by-key: each refusal is recorded (${seen.length})`);
  let read = 'ok';
  try { void g.getLocalTextStylesAsync; } catch (e) { read = (e as Error).message; }
  ok(read === 'ok', 'import-by-key: the guard reads a FIXED host method without throwing (#3209)', read);
}

{
  // The guard is only a guard if run() hands IT to the executor. Plant an executor that asks the host it was given for
  // an import-by-key method (swallowing the refusal, as a careless executor might), then builds as the plugin does.
  // The raw host answers that method too, recording that it was reached: a run that passed the raw host would import.
  const { shim } = fileHost();
  const rawReached: string[] = [];
  shim.importComponentByKeyAsync = async (key: string) => { rawReached.push(key); return null; };
  const planted: typeof applyComponentPlan = async (p, api, o) => {
    try { await (api as unknown as { importComponentByKeyAsync: (k: string) => Promise<unknown> }).importComponentByKeyAsync('planted-key'); } catch { /* refused */ }
    return applyComponentPlan(p, api, o);
  };
  const data: RunData = { runId: 'selftest-import-run', scratchFile: SCRATCH, defs, planHash: planHashOf(defs) };
  const r = await run(shim, data, planted);
  ok(rawReached.length === 0, 'import-by-key-run: the executor never reaches the raw host\'s import-by-key method', JSON.stringify(rawReached));
  ok(r.violations.some((v) => /^the build asked to import by key \(importComponentByKeyAsync\)/.test(v)), 'import-by-key-run: the refusal is a safety violation, by name', JSON.stringify(r.violations));
  ok(reportLines(r, planHashOf(defs)).lines.some((l) => l.startsWith('✗ SAFETY: the build asked to import by key')), 'import-by-key-run: the report prints it as SAFETY');
}

{
  const { shim } = fileHost({ losePageOnCreate: true });
  const r = await runWith(shim);
  ok(r.violations.some((v) => /page\(s\) that existed before the run are gone: PAGE:\d+/.test(v)), 'page-deleted: reported as a safety violation, naming the page', JSON.stringify(r.violations));
  ok(reportLines(r, planHashOf(defs)).lines.some((l) => l.startsWith('✗ SAFETY:')), 'page-deleted: the report prints it as SAFETY');
}

{
  const { shim, pages } = fileHost();
  const data: RunData = { runId: 'selftest-lost', scratchFile: SCRATCH, defs, planHash: planHashOf(defs) };
  const scripts = scriptsFor(data.runId, body(code, data));
  const [r] = (await runScripts(shim, scripts.slice(-1))) as RunResult[];
  ok(!!r.refused && /staged scripts are not all here/.test(r.refused) && shim._versions.length === 0 && pages.length === 1, 'staging-lost: refused, nothing written', JSON.stringify(r.refused));
}

{
  const { shim } = fileHost();
  const r = await runWith(shim);
  const rep = reportLines(r, 'deadbeef');
  ok(!rep.answered && /CANNOT ANSWER: the result was built from plans hashed/.test(rep.lines[0]), 'other-plans: a result from other plans cannot be answered', rep.lines[0]);
}

{
  const counts = IMPORT_BY_KEY.map((k) => [k, code.split(k).length - 1] as const);
  ok(counts.every(([, n]) => n === 1), `no-import-site: each import-by-key name appears once in the bundle (the guard's list): ${counts.map(([k, n]) => `${k}×${n}`).join(', ')}`);
}

{
  const data: RunData = { runId: 'selftest-size', scratchFile: SCRATCH, defs, planHash: planHashOf(defs) };
  const scripts = scriptsFor(data.runId, body(code, data));
  const largest = Math.max(...scripts.map((s) => s.js.length));
  ok(largest <= SCRIPT_CEILING && scripts.length >= 2, `ceiling: ${scripts.length} scripts, largest ${largest} of ${SCRIPT_CEILING}`);
}

ok(componentDefs.some((d) => d.id === 'field-label'), 'the first named case, field-label, is a def');
console.log(failed ? `\n✗ ${failed} arm(s) failed` : '\n✓ every arm passed');
process.exit(failed ? 1 : 0);
