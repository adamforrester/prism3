/**
 * Prism3 engine — `theme.ts` STAYS A BARREL OVER ITS AXIS MODULES (#3698 F4, R5 item 2).
 *
 *   npx tsx packages/engine/lint-theme-split.ts
 *
 * `theme.ts` held every axis in about 3,700 lines. It is now split into `theme-*.ts` modules (the shared types, color,
 * dimensions, motion, type, shadow, layout, gradients, `brandTheme`, the regression theme), and `theme.ts` re-exports
 * the names it exported before, so no importer changed. This gate keeps the split from growing back silently.
 *
 * WHAT IT ASSERTS, each failure prefixed by the name a mutation must produce:
 *   BARREL       `theme.ts` holds anything but named re-exports from a `theme-*.ts` module (`export { … } from
 *                './theme-…'`, `export type { … } from './theme-…'`): no declaration, no import, no `export *`.
 *                Code added to `theme.ts` is code the split no longer covers.
 *   CYCLE        a `theme-*.ts` module imports the barrel (`./theme`) or a public entry (`./index…`). The barrel
 *                re-exports every module, so a module that imports it imports itself.
 *   ACYCLIC      the value imports among the `theme-*.ts` modules form a cycle. Type-only imports are exempt: they
 *                are erased before anything runs, and the shared types module imports the axis types that way.
 *   REPRESENTED  a `theme-*.ts` module the barrel does not re-export (an orphan nothing reaches through `./theme`), a
 *                module the barrel names that does not exist, or fewer modules than the floor, so two axes merged back
 *                into one fail rather than pass.
 *   SELF-CHECK   the three detectors, run on planted source typed below, do not find exactly what is planted there.
 *
 * INDEPENDENCE (docs/34). The SUBJECT is the source text of `theme.ts` and the `theme-*.ts` modules. The REFERENCE is
 * the rule (re-exports only; no value cycle) and the module floor, typed here. The module list is read from the
 * directory, never from the barrel, so a module the barrel forgets is still seen.
 *
 * WHAT IT DOES NOT ASSERT. That the barrel's names match the pre-split list: every importer would fail to resolve a
 * dropped name, and the facade (`lint-engine-facade.ts`) holds the surfaces' names. Nor which axis a declaration
 * belongs in, which is a judgment, not a rule.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const failures: string[] = [];
const fail = (tag: string, msg: string) => failures.push(`${tag}: ${msg}`);

const BARREL = 'theme.ts';
const MODULE = /^theme-[a-z]+\.ts$/;
/** The axis modules at the split (#3698 R5): types, color, dims, motion, type, shadow, layout, gradient, brand, nb. */
const MODULE_FLOOR = 10;

/** Comments dropped with their line breaks kept, so line numbers still match the file. Only comments that open a
 *  line, the rule `lint-engine-facade.ts` reads by, so a `//` inside a string is left alone. */
const stripComments = (src: string): string =>
  src.replace(/^\s*\/\*[\s\S]*?\*\//gm, (m) => m.replace(/[^\n]/g, '')).replace(/^\s*\/\/.*$/gm, '');

/** What the barrel holds beyond named re-exports from `theme-*` modules, as its first line, or null when it is clean. */
export const barrelStray = (src: string): string | null => {
  const rest = stripComments(src).replace(/\bexport\s+(?:type\s+)?\{[^}]*\}\s*from\s*'\.\/theme-[a-z]+'\s*;/g, '').trim();
  return rest ? rest.split('\n')[0].slice(0, 100) : null;
};

type Imp = { spec: string; line: number; value: boolean };
/** Every relative import or re-export in one module, and whether it carries a value (not `import type`, and at least
 *  one specifier without an inline `type`). */
export const importsOf = (src: string): Imp[] => {
  const code = stripComments(src);
  const out: Imp[] = [];
  for (const m of code.matchAll(/\b(import|export)\s+(type\s+)?([^'";]*?)\bfrom\s*'(\.[^'\n]+)'/g)) {
    const braced = /\{([^}]*)\}/.exec(m[3])?.[1];
    const names = braced === undefined ? [m[3].trim()] : braced.split(',').map((x) => x.trim()).filter(Boolean);
    out.push({ spec: m[4], line: code.slice(0, m.index).split('\n').length, value: !m[2] && names.some((n) => !n.startsWith('type ')) });
  }
  for (const m of code.matchAll(/\bimport\s*\(\s*'(\.[^'\n]+)'\s*\)/g)) out.push({ spec: m[1], line: code.slice(0, m.index).split('\n').length, value: true });
  return out;
};

/** The module a relative specifier names, as a file name in this directory (`./theme-type` → `theme-type.ts`). */
const fileOf = (spec: string): string => `${spec.replace(/^\.\//, '').replace(/\.ts$/, '')}.ts`;

/** Each value-import cycle among `graph`'s modules, as the path that closes it (`a → b → a`). */
export const valueCycles = (graph: Record<string, string[]>): string[] => {
  const cycles: string[] = [];
  const state: Record<string, 0 | 1 | 2> = {};
  const stack: string[] = [];
  const visit = (n: string) => {
    state[n] = 1; stack.push(n);
    for (const t of graph[n] ?? []) {
      if (state[t] === 1) cycles.push([...stack.slice(stack.indexOf(t)), t].join(' → '));
      else if (!state[t]) visit(t);
    }
    stack.pop(); state[n] = 2;
  };
  for (const n of Object.keys(graph).sort()) if (!state[n]) visit(n);
  return cycles;
};

/** Whether a module's import reaches back into the barrel or a public entry. */
export const importsBarrel = (spec: string): boolean => {
  const f = fileOf(spec);
  return f === BARREL || /^index(-[a-z]+)?\.ts$/.test(f);
};

// ── SELF-CHECK: each detector finds exactly what is planted ─────────────────────────────────────────────────────────
{
  const cleanBarrel = "/** doc */\nexport { a, b } from './theme-types';\nexport type { C } from './theme-motion';\n// note\n";
  if (barrelStray(cleanBarrel) !== null) fail('SELF-CHECK', `barrelStray reports a clean barrel as holding "${barrelStray(cleanBarrel)}"`);
  for (const planted of ['export const x = 1;', "export * from './theme-types';", "import { a } from './theme-types';", "export { a } from './modes';"]) {
    if (barrelStray(`${cleanBarrel}${planted}\n`) === null) fail('SELF-CHECK', `barrelStray does not see a planted "${planted}" in the barrel`);
  }
  const imps = importsOf([
    "import { a, type B } from './theme-types';",       // 1: value
    "import type { C } from './theme-type';",           // 2: type-only
    "import { type D, type E } from './theme-shadow';", // 3: type-only, inline
    "// import { f } from './theme-layout';",           // a comment: not an import
    "export { g } from './theme-gradient';",            // 5: value re-export
    "import { h } from './theme';",                     // 6: value, the barrel
  ].join('\n'));
  const got = imps.map((i) => `${i.line}${i.value ? 'v' : 't'}`).join(',');
  if (got !== '1v,2t,3t,5v,6v') fail('SELF-CHECK', `importsOf read the planted imports as [${got}], not [1v,2t,3t,5v,6v]`);
  if (!importsBarrel('./theme') || !importsBarrel('./theme.ts') || !importsBarrel('./index-figma') || importsBarrel('./theme-types')) {
    fail('SELF-CHECK', 'importsBarrel misreads which specifiers name the barrel or an entry');
  }
  const cyc = valueCycles({ a: ['b'], b: ['c'], c: ['a'], d: ['e'], e: [] });
  if (cyc.length !== 1 || cyc[0] !== 'a → b → c → a') fail('SELF-CHECK', `valueCycles found [${cyc.join('; ')}] in a graph with exactly the cycle a → b → c → a`);
  if (valueCycles({ a: ['b'], b: [], c: ['a', 'b'] }).length) fail('SELF-CHECK', 'valueCycles reports a cycle in an acyclic graph');
}

// ── BARREL ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const barrelSrc = readFileSync(resolve(here, BARREL), 'utf8');
const stray = barrelStray(barrelSrc);
if (stray) fail('BARREL', `packages/engine/${BARREL} holds more than named re-exports from theme-*.ts modules: "${stray}" — put it in the axis module it belongs to and re-export it`);

// ── REPRESENTED ─────────────────────────────────────────────────────────────────────────────────────────────────────
const modules = readdirSync(here).filter((f) => MODULE.test(f)).sort();
const named = new Set(importsOf(barrelSrc).map((i) => fileOf(i.spec)));
for (const m of modules) if (!named.has(m)) fail('REPRESENTED', `packages/engine/${m} is not re-exported by ${BARREL} — an axis module nothing reaches through ./theme`);
for (const m of named) if (!modules.includes(m)) fail('REPRESENTED', `${BARREL} re-exports from ./${m.replace(/\.ts$/, '')}, which does not exist`);
if (modules.length < MODULE_FLOOR) fail('REPRESENTED', `found ${modules.length} theme-*.ts modules, under the floor of ${MODULE_FLOOR} — axes have merged back together, or the scan has gone blind`);

// ── CYCLE and ACYCLIC ───────────────────────────────────────────────────────────────────────────────────────────────
const graph: Record<string, string[]> = {};
let valueEdges = 0, typeEdges = 0;
for (const m of modules) {
  graph[m] = [];
  for (const i of importsOf(readFileSync(resolve(here, m), 'utf8'))) {
    if (importsBarrel(i.spec)) { fail('CYCLE', `packages/engine/${m}:${i.line} imports '${i.spec}' — an axis module imports its sibling theme-*.ts module directly, never the barrel or an entry`); continue; }
    const t = fileOf(i.spec);
    if (!MODULE.test(t)) continue;
    if (i.value) { graph[m].push(t); valueEdges++; } else typeEdges++;
  }
}
for (const c of valueCycles(graph)) fail('ACYCLIC', `the theme-*.ts modules import values in a cycle: ${c} — move the shared name down into a module both import (theme-types.ts), or import it as a type`);

console.log(`lint-theme-split — ${BARREL} and ${modules.length} theme-*.ts modules; ${valueEdges} value and ${typeEdges} type-only imports between them`);
if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(`\n${failures.length} failure(s).`);
  process.exit(1);
}
console.log(`  ✓ ${BARREL} is named re-exports from all ${modules.length} modules; no module imports the barrel or an entry; the value imports form no cycle`);
