/**
 * NO RAW VALUES (#3408 S2, S3): every stylesheet this package ships (`button.css`, and since S3 the four field
 * stylesheets) and the demo's own styles read tokens, never a hex, an `rgb()`, a non-zero
 * `px` or a primitive (`--pds3-core-…`) — the agent-adherence scorer's rule R2, run with the scorer's own code.
 *
 *   npx tsx packages/css/check-raw-values.ts
 *
 * The rule is `scoreR2` from `tools/agent-adherence/score-code.ts`, imported, not re-implemented, so the package is
 * held to exactly what an agent's output is held to. Its oracle is built from the CURRENT emission (the scorer pins
 * its own; this check is about this tree).
 *
 * DOCUMENTED EXCEPTIONS, each matched narrowly and each required to still be in use (a stale exception fails):
 *   - `min-width`: `min-inline-size: <N>px` where N is a `minWidth` `specs.json` states as a px: the button's derived
 *     floors (`source: "derived"`, height × multiplier, rounded up to 8px, Q140 A) and the fields' 120px
 *     (`source: "literal"`, S3). No token carries either; the spec writes the number, so the CSS writes the same number.
 *   - `visually-hidden` (S3): `1px` in `inline-size` or `block-size`, only inside the one rule that hides the password
 *     field's " password" suffix and its live region, and only that rule's two declarations.
 *   - `letter-spacing` (Q143 A): `var(--pds3-core-font-letter-spacing…)` inside `letter-spacing`, only for a token a
 *     label style `specs.json` names aliases as its own `letterSpacing` (read here from the DTCG, not from the
 *     generator). The token CSS's `font` shorthand drops tracking (#3507), so the alias target is the only variable
 *     that carries it, and it lives under `core`.
 *
 * ALSO R1 (invented name), from the same scorer: every `var(--…)` names a leaf of the tree, and every `data-component`
 * and `data-prop-*` mark in the demo is a component, prop and value `components.ai.json` knows.
 *
 * SELF-TEST: each planted raw value must be reported by name, and a px that is not a spec'd floor must not pass as one.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readUncommitted } from './emission';
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

const SPECS = readUncommitted('specs.json').components;
const SHIPPED = ['button', 'field-label', 'field-message', 'text-field', 'password-field'];
const minWidths = (id: string, source: string) => SPECS[id].redlines.flatMap((r: any) => r.parts.map((p: any) => p.values?.minWidth))
  .filter((m: any) => m && m.source === source && typeof m.px === 'number').map((m: any) => m.px);
const DERIVED_FLOORS = new Set<number>([...minWidths('button', 'derived'), ...minWidths('text-field', 'literal'), ...minWidths('password-field', 'literal')]);

const TREE = json(TOKEN_TREE);
const ROOT = Object.keys(TREE).filter((k) => !k.startsWith('$'))[0];
const TRACKING = new Set<string>(SHIPPED.flatMap((id) => SPECS[id].type).flatMap((r: any) => r.parts.map((p: any) => {
  const ref = p.textStyle.split('.').reduce((n: any, k: string) => n?.[k], TREE[ROOT])?.$value?.letterSpacing;
  return typeof ref === 'string' ? ref.replace(/^\{|\}$/g, '').replace(new RegExp(`^${ROOT}\\.`), '') : undefined;
})).filter(Boolean));

type Exception = { id: string; matches: (v: Violation) => boolean };
const EXCEPTIONS: Exception[] = [
  { id: 'min-width', matches: (v) => { const m = v.what.match(/^(\d+)px in min-inline-size$/); return !!m && DERIVED_FLOORS.has(Number(m[1])); } },
  { id: 'letter-spacing', matches: (v) => { const m = v.what.match(/^primitive (\S+) in letter-spacing$/); return !!m && TRACKING.has(m[1]); } },
  { id: 'visually-hidden', matches: (v) => v.where === 'password-field.css' && /^1px in (inline-size|block-size)$/.test(v.what) && visuallyHiddenOnly(v.where) },
];
/** The `visually-hidden` exception holds only while the file's every 1px sits in the one rule that hides text. */
let CURRENT: Record<string, string> = {};
const visuallyHiddenOnly = (file: string) => {
  const blocks = [...(CURRENT[file] ?? '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((b) => /\b1px\b/.test(b[2]));
  return blocks.length === 1 && blocks[0][1].includes('.p3-password-field__toggle-suffix') && blocks[0][1].includes('.p3-password-field__announcer')
    && [...blocks[0][2].matchAll(/\b1px\b/g)].length === 2;
};

const styleBlocks = (html: string) => [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
const paintsOf = (html: string) => [...html.matchAll(/\s(fill|stroke|stop-color|color)="([^"]*)"/g)].map((m) => ({ attr: m[1], value: m[2], where: 'demo.html' }));

export const scan = (files: Record<string, string>, demo: string) => {
  CURRENT = files;
  const sheets = [...Object.entries(files).map(([where, text]) => ({ text, where })), { text: styleBlocks(demo), where: 'demo.html <style>' }];
  const v = scoreR2({ css: sheets, paints: paintsOf(demo) }, oracle);
  const used = new Set<string>();
  const bad = v.filter((x) => { const e = EXCEPTIONS.find((e) => e.matches(x)); if (e) used.add(e.id); return !e; });
  const stale = EXCEPTIONS.filter((e) => !used.has(e.id)).map((e) => `exception "${e.id}" matches nothing: remove it or restore what it excuses`);
  const marks = [...demo.matchAll(/<[a-z]+\s([^>]*data-component="([^"]+)"[^>]*)>/g)].map((m) => ({
    component: m[2], where: 'demo.html',
    props: Object.fromEntries([...m[1].matchAll(/data-prop-([\w-]+)="([^"]*)"/g)].map((p) => [p[1].toLowerCase(), p[2]])),
  }));
  const r1 = scoreR1({ css: sheets, marks }, oracle);
  return { bad: [...bad, ...r1], stale, excused: v.length - bad.length, marks: marks.length };
};

const FILES: Record<string, string> = Object.fromEntries(SHIPPED.map((id) => [`${id}.css`, read(`packages/css/${id}.css`)]));
const DEMO = read('packages/css/demo.html');
const plantIn = (file: string, anchor: RegExp, decl: string) => ({ ...FILES, [file]: FILES[file].replace(anchor, `$1    ${decl};\n`) });
const plant = (decl: string) => plantIn('button.css', /(\.p3-button \{\n)/, decl);
const MUTANTS: { name: string; css: Record<string, string>; mustName: RegExp }[] = [
  { name: 'a hex color', css: plant('color: #0d0d0e'), mustName: /hex #0d0d0e in color/ },
  { name: 'an rgb() color', css: plant('background-color: rgb(30, 30, 255)'), mustName: /rgb\(\) in background-color/ },
  { name: 'a non-zero px', css: plant('padding-inline-start: 12px'), mustName: /12px in padding-inline-start/ },
  { name: 'a primitive token', css: plant('color: var(--pds3-core-palette-white)'), mustName: /primitive core\.palette\.white in color/ },
  { name: 'an invented token name', css: plant('color: var(--pds3-color-text-brandish)'), mustName: /token --pds3-color-text-brandish is not in the tree/ },
  { name: 'a min-inline-size px the spec does not state', css: plant('min-inline-size: 105px'), mustName: /105px in min-inline-size/ },
  { name: 'a letter-spacing primitive no label style aliases', css: plant('letter-spacing: calc(var(--pds3-core-font-letter-spacing-role-wide) * 1em)'), mustName: /primitive core\.font\.letter-spacing-role\.wide in letter-spacing/ },
  { name: 'a raw px in a field stylesheet', css: plantIn('text-field.css', /(\.p3-text-field \{\n)/, 'padding-block-start: 6px'), mustName: /6px in padding-block-start/ },
  { name: 'a hex in the label stylesheet', css: plantIn('field-label.css', /(\.p3-field-label \{\n)/, 'color: #222222'), mustName: /hex #222222 in color/ },
  { name: 'a 1px outside the visually hidden rule', css: plantIn('password-field.css', /(\.p3-password-field \{\n)/, 'inline-size: 1px'), mustName: /1px in inline-size/ },
  { name: 'a tracking primitive outside letter-spacing', css: plant('word-spacing: calc(var(--pds3-core-font-letter-spacing-role-normal) * 1em)'), mustName: /primitive core\.font\.letter-spacing-role\.normal in word-spacing/ },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let fail = 0;
  const real = scan(FILES, DEMO);
  if (real.bad.length || real.stale.length) {
    fail++;
    console.error(`FAIL raw values: ${real.bad.length} raw value(s) or invented name(s), ${real.stale.length} stale exception(s)`);
    for (const x of real.bad) console.error(`  - ${x.what} (${x.where})`);
    for (const s of real.stale) console.error(`  - ${s}`);
  } else console.log(`OK raw values (R2) and names (R1): no hex, rgb(), non-zero px, primitive or invented token in ${Object.keys(FILES).join(', ')} or demo.html, and ${real.marks} demo marks are real props and values; ${real.excused} excused as documented (min-width: ${[...DERIVED_FLOORS].join(', ')}px, from specs.json; visually-hidden: the one rule's two 1px; letter-spacing: ${[...TRACKING].join(', ')}, the label styles' own letterSpacing)`);
  for (const m of MUTANTS) {
    const r = scan(m.css, DEMO);
    if (r.bad.some((x) => m.mustName.test(x.what))) console.log(`OK self-test: "${m.name}" is reported by name`);
    else { fail++; console.error(`FAIL self-test: "${m.name}" was not reported (${r.bad.map((x) => x.what).join('; ') || 'nothing'})`); }
  }
  process.exit(fail ? 1 : 0);
}
