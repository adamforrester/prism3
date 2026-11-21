/**
 * THE ARM CONTRACT CHECK (#3408): an arm's input contract is complete enough for the KPI 2 and KPI 3 checks to run on
 * its Storybook unchanged (`arm-contract.ts` says what it holds; `ARM-CONTRACT.md` how to fill one in).
 *
 *   npx tsx apps/storybook/check-arm-contract.ts                                   (arm 1's, against its built Storybook)
 *   npx tsx apps/storybook/check-arm-contract.ts --contract <file> --storybook <dir> (another arm's)
 *   npx tsx apps/storybook/check-arm-contract.ts --self-test                       (mutants of arm 1's, each by name)
 *
 * Each failure is named: `<component>: <part path> ...`, `<form>: <component> <case> ...` or `tokens: ...`. A Storybook
 * build that is not at hand FAILS, naming the build: story ids that were not checked are not a pass.
 */
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { readUncommitted } from '../../packages/css/emission';
import { validate, load, leafPaths, readIndex, ARM_1, type ArmContract, type Oracles } from './arm-contract';

const HERE = import.meta.dirname ?? '';
const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };

const specs = readUncommitted('specs.json').components as Record<string, { anatomy: { part: string }[] }>;
const anatomy = Object.fromEntries(Object.entries(specs).map(([id, s]) => [id, s.anatomy.map((a) => a.part)]));
const tokens = leafPaths(JSON.parse(readFileSync(resolve(HERE, '../../packages/engine/out/prism3.tokens.json'), 'utf8')));
const sbDir = resolve(arg('--storybook') ?? resolve(HERE, 'storybook-static'));
const stories = readIndex(sbDir);
if (!stories) { console.error(`FAIL setup: ${sbDir}/index.json is missing. Build the arm's Storybook first (arm 1: npm run -w @prism3/storybook build)`); process.exit(1); }
const oracles: Oracles = { anatomy, tokens, stories };

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const MUTANTS: { name: string; plant: (c: ArmContract) => void; mustName: RegExp }[] = [
  { name: 'the text field\'s message left out of the part map', plant: (c) => { delete c.components['text-field'].parts['container/message']; },
    mustName: /^text-field: container\/message is in the anatomy and neither mapped nor declared unboxed$/ },
  { name: 'a part path the anatomy does not have', plant: (c) => { c.components.button.parts['container/icon'] = '.x'; },
    mustName: /^button: container\/icon is not a part path in the def's anatomy$/ },
  { name: 'a part declared unboxed with no reason', plant: (c) => { c.components['password-field'].parts['container/control/content/entry/caret'] = { unboxed: ' ' }; },
    mustName: /^password-field: container\/control\/content\/entry\/caret is declared unboxed with no reason$/ },
  { name: 'the text field left out', plant: (c) => { delete c.components['text-field']; },
    mustName: /^text-field: not in the contract/ },
  { name: 'a story id the build does not hold', plant: (c) => { c.forms.html = { cases: { button: { rest: 'components-button-html--rest', hover: 'components-button-html--hovered', 'focus-visible': 'components-button-html--focus-visible', disabled: 'components-button-html--disabled', pending: 'components-button-html--pending' } } }; },
    mustName: /^html: button hover maps to components-button-html--hovered, which is not in the built index\.json$/ },
  { name: 'a KPI state with no story id', plant: (c) => { c.forms.html = { cases: { button: { rest: 'components-button-html--rest' } } }; },
    mustName: /^html: button pending has no story id$/ },
  { name: 'a token map naming a path the tree does not have', plant: (c) => { c.tokens = { scheme: 'map', map: { '--x-primary': 'pds3.color.text.primery' } }; },
    mustName: /^tokens: --x-primary maps to pds3\.color\.text\.primery, which is not a token in the emitted tree$/ },
  { name: 'the button\'s focus ring declared none, where its anatomy draws one', plant: (c) => { c.components.button.focusRing = { drawn: 'none', why: 'x' }; },
    mustName: /^button: focusRing is none, but the anatomy draws container\/focusRing$/ },
];

const base = load(ARM_1);
if (process.argv.includes('--self-test')) {
  let bad = 0;
  const clean = validate(base, oracles);
  if (clean.length) { bad++; console.error(`FAIL self-test: arm 1's contract should pass, but: ${clean.join(' / ')}`); }
  // the token-map arm needs one good map to pass, so its failure is the planted path and not an empty map
  const good = clone(base); good.tokens = { scheme: 'map', map: { '--x-primary': 'pds3.color.text.primary' } };
  const g = validate(good, oracles);
  if (g.length) { bad++; console.error(`FAIL self-test: a token map naming a real path should pass, but: ${g.join(' / ')}`); }
  for (const m of MUTANTS) {
    const c = clone(base);
    m.plant(c);
    const r = validate(c, oracles);
    if (r.some((x) => m.mustName.test(x))) console.log(`OK self-test: "${m.name}" fails by name`);
    else { bad++; console.error(`FAIL self-test: "${m.name}" was not caught by name (${r[0] ?? 'no failures'})`); }
  }
  process.exit(bad ? 1 : 0);
}

const path = arg('--contract') ? resolve(arg('--contract')!) : ARM_1;
const c = load(path);
const failures = validate(c, oracles);
if (failures.length) { console.error(`FAIL arm contract (${c.arm}): ${failures.length}`); for (const f of failures) console.error(`  - ${f}`); process.exit(1); }
const n = Object.values(c.components).reduce((a, x) => a + Object.keys(x.parts).length, 0);
console.log(`OK arm contract (${c.arm}): ${Object.keys(c.components).length} components, ${n} part paths, ${Object.keys(c.forms).length} forms, every KPI 2 state mapped to a built story`);
