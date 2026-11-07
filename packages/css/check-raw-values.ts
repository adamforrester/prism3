/**
 * NO RAW VALUES (#3408 S2): `button.css` and the demo's own styles read tokens, never a hex, an `rgb()`, a non-zero
 * `px` or a primitive (`--pds3-core-…`) — the agent-adherence scorer's rule R2, run with the scorer's own code.
 *
 *   npx tsx packages/css/check-raw-values.ts
 *
 * The rule is `scoreR2` from `tools/agent-adherence/score-code.ts`, imported, not re-implemented, so the package is
 * held to exactly what an agent's output is held to. Its oracle is built from the CURRENT emission (the scorer pins
 * its own; this check is about this tree).
 *
 * DOCUMENTED EXCEPTIONS, each matched narrowly and each required to still be in use (a stale exception fails):
 *   - `min-width`: `min-inline-size: <N>px` where N is a `minWidth` `specs.json` states as derived
 *     (`source: "derived"`, height × multiplier, rounded up to 8px). No token carries the floor; the spec writes the
 *     number, so the CSS writes the same number. A live floor is listed for later in the README.
 *
 * ALSO R1 (invented name), from the same scorer: every `var(--…)` names a leaf of the tree, and every `data-component`
 * and `data-prop-*` mark in the demo is a component, prop and value `components.ai.json` knows.
 *
 * SELF-TEST: each planted raw value must be reported by name, and a px that is not a spec'd floor must not pass as one.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreR1, scoreR2, buildOracle, type Violation } from '../../tools/agent-adherence/score-code';
import { TOKEN_TREE, TOKEN_BASE, TOKEN_OVERLAYS, COMPONENTS } from '../../tools/agent-adherence/oracle';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const read = (p: string) => readFileSync(resolve(REPO, p), 'utf8');
const json = (p: string) => JSON.parse(read(p));

const oracle = buildOracle({
  commit: 'working tree',
  tree: json(TOKEN_TREE),
  base: json(TOKEN_BASE),
  overlays: Object.fromEntries(Object.entries(TOKEN_OVERLAYS).map(([m, f]) => [m, json(f)])),
  components: json(COMPONENTS),
});

const spec = json('packages/engine/out/components/specs.json').components.button;
const DERIVED_FLOORS = new Set<number>(spec.redlines.flatMap((r: any) => r.parts.map((p: any) => p.values?.minWidth))
  .filter((m: any) => m && m.source === 'derived' && typeof m.px === 'number').map((m: any) => m.px));

type Exception = { id: string; matches: (v: Violation) => boolean };
const EXCEPTIONS: Exception[] = [
  { id: 'min-width', matches: (v) => { const m = v.what.match(/^(\d+)px in min-inline-size$/); return !!m && DERIVED_FLOORS.has(Number(m[1])); } },
];

const styleBlocks = (html: string) => [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
const paintsOf = (html: string) => [...html.matchAll(/\s(fill|stroke|stop-color|color)="([^"]*)"/g)].map((m) => ({ attr: m[1], value: m[2], where: 'demo.html' }));

export const scan = (css: string, demo: string) => {
  const v = scoreR2({ css: [{ text: css, where: 'button.css' }, { text: styleBlocks(demo), where: 'demo.html <style>' }], paints: paintsOf(demo) }, oracle);
  const used = new Set<string>();
  const bad = v.filter((x) => { const e = EXCEPTIONS.find((e) => e.matches(x)); if (e) used.add(e.id); return !e; });
  const stale = EXCEPTIONS.filter((e) => !used.has(e.id)).map((e) => `exception "${e.id}" matches nothing: remove it or restore what it excuses`);
  const marks = [...demo.matchAll(/<(?:button|a)\s([^>]*data-component="([^"]+)"[^>]*)>/g)].map((m) => ({
    component: m[2], where: 'demo.html',
    props: Object.fromEntries([...m[1].matchAll(/data-prop-([\w-]+)="([^"]*)"/g)].map((p) => [p[1].toLowerCase(), p[2]])),
  }));
  const r1 = scoreR1({ css: [{ text: css, where: 'button.css' }, { text: styleBlocks(demo), where: 'demo.html <style>' }], marks }, oracle);
  return { bad: [...bad, ...r1], stale, excused: v.length - bad.length, marks: marks.length };
};

const CSS = read('packages/css/button.css');
const DEMO = read('packages/css/demo.html');
const plant = (decl: string) => CSS.replace(/(\.p3-button \{\n)/, `$1    ${decl};\n`);
const MUTANTS: { name: string; css: string; mustName: RegExp }[] = [
  { name: 'a hex color', css: plant('color: #0d0d0e'), mustName: /hex #0d0d0e in color/ },
  { name: 'an rgb() color', css: plant('background-color: rgb(30, 30, 255)'), mustName: /rgb\(\) in background-color/ },
  { name: 'a non-zero px', css: plant('padding-inline-start: 12px'), mustName: /12px in padding-inline-start/ },
  { name: 'a primitive token', css: plant('color: var(--pds3-core-palette-white)'), mustName: /primitive core\.palette\.white in color/ },
  { name: 'an invented token name', css: plant('color: var(--pds3-color-text-brandish)'), mustName: /token --pds3-color-text-brandish is not in the tree/ },
  { name: 'a min-inline-size px the spec does not state', css: plant('min-inline-size: 105px'), mustName: /105px in min-inline-size/ },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let fail = 0;
  const real = scan(CSS, DEMO);
  if (real.bad.length || real.stale.length) {
    fail++;
    console.error(`FAIL raw values: ${real.bad.length} raw value(s) or invented name(s), ${real.stale.length} stale exception(s)`);
    for (const x of real.bad) console.error(`  - ${x.what} (${x.where})`);
    for (const s of real.stale) console.error(`  - ${s}`);
  } else console.log(`OK raw values (R2) and names (R1): no hex, rgb(), non-zero px, primitive or invented token in button.css or demo.html, and ${real.marks} demo marks are real props and values; ${real.excused} excused as documented (min-width: ${[...DERIVED_FLOORS].join(', ')}px, from specs.json)`);
  for (const m of MUTANTS) {
    const r = scan(m.css, DEMO);
    if (r.bad.some((x) => m.mustName.test(x.what))) console.log(`OK self-test: "${m.name}" is reported by name`);
    else { fail++; console.error(`FAIL self-test: "${m.name}" was not reported (${r.bad.map((x) => x.what).join('; ') || 'nothing'})`); }
  }
  process.exit(fail ? 1 : 0);
}
