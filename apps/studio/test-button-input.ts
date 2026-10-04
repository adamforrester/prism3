/**
 * The Button option writes (UI redesign S8.1), in Node, against the real store and the real engine.
 *
 *   npx tsx apps/studio/test-button-input.ts
 *
 * `src/state/button-input.ts` holds every edit the legacy Size & radius page's Button options make to the working
 * brand (Button icons, Button label & icon, Button label weight, Button minimum width) and the reader the button
 * specimen is drawn from. This holds each write where no DOM is needed, so one can fail here by name before the
 * browser suites run.
 *
 * INDEPENDENT OF WHAT IT CHECKS (docs/34). Every expected write is a JSON literal typed here, from the legacy page's
 * own bytes (the generic lever knob's `setPath(brandState, lever.key, v)`, measured by the S8.1 equivalence driver
 * against `origin/main`), INCLUDING ITS TRAPS: choosing a lever's default WRITES it (a brand that never set
 * `buttonIcons` holds `"buttonIcons":"attached"` after choosing Attached to label), and the slider writes each step it
 * passes through. The example brands' authored values are restated as literals in section 0 (none of the three
 * authors a Button option), so a corpus change fails here rather than moving the expectation with it. "The engine
 * takes it" is the engine's own `brandTheme`. The reader's fallbacks are literals too (`attached`, `match`, 2.25,
 * `emphasis`), not read from the lever manifest.
 */
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import * as store from './src/state/store';
import * as B from './src/state/button-input';

let executed = 0, failed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) { console.log(`  ✓ ${label}`); return; }
  failed++;
  console.error(`  ✗ ${label}`);
};
const brands = exampleBrands as Record<string, BrandInput>;
let loaded = '';
const reset = (id = 'prism3'): void => {
  store.initSession(structuredClone(brands[id]), { kind: 'example', id });
  loaded = JSON.stringify(store.brandState);
};
const takes = (): boolean => { try { brandTheme(structuredClone(store.brandState)); return true; } catch { return false; } };
/** The brand as loaded with `tail` appended, as `JSON.stringify` writes a key added last. */
const plus = (tail: string): string => `${loaded.slice(0, -1)},${tail}}`;
const now = (): string => JSON.stringify(store.brandState);
const KEYS = ['buttonIcons', 'buttonContentSize', 'buttonLabelWeight', 'buttonMinWidthMultiplier'];

console.log('\n0. The corpus as this file restates it (a corpus change fails here, not silently below)');
for (const id of ['prism3', 'aurora', 'harbor']) {
  reset(id);
  const set = KEYS.filter((k) => k in store.brandState);
  ok(set.length === 0, `${id} authors no Button option (${set.join(', ') || 'none'})`);
}

console.log('\n1. The default is WRITTEN, not unset (the legacy chips wrote the value they were given)');
for (const id of ['prism3', 'aurora', 'harbor']) {
  reset(id);
  B.setButtonIcons('attached');
  ok(now() === plus('"buttonIcons":"attached"') && takes(),
    `setButtonIcons(attached) leaves the brand byte-identical to legacy (the default is written): ${id} gains "buttonIcons":"attached"`);
  reset(id);
  B.setButtonContentSize('match');
  ok(now() === plus('"buttonContentSize":"match"') && takes(),
    `setButtonContentSize(match) leaves the brand byte-identical to legacy (the default is written): ${id} gains "buttonContentSize":"match"`);
  reset(id);
  B.setButtonLabelWeight('emphasis');
  ok(now() === plus('"buttonLabelWeight":"emphasis"') && takes(),
    `setButtonLabelWeight(emphasis) leaves the brand byte-identical to legacy (the default is written): ${id} gains "buttonLabelWeight":"emphasis"`);
  reset(id);
  B.setButtonMinWidth(2.25);
  ok(now() === plus('"buttonMinWidthMultiplier":2.25') && takes(),
    `setButtonMinWidth(2.25) leaves the brand byte-identical to legacy (the default is written): ${id} gains "buttonMinWidthMultiplier":2.25`);
}

console.log('\n2. The other values, and a change of mind, write in place (one key each, nothing else moves)');
reset('prism3');
B.setButtonIcons('edges');
ok(now() === plus('"buttonIcons":"edges"') && takes(), 'setButtonIcons(edges) writes "buttonIcons":"edges"');
{
  // "The engine takes it" is not vacuous: the same check refuses a value off the lever's list.
  let refused = false;
  try { brandTheme({ ...structuredClone(store.brandState), buttonIcons: 'pinned' as never }); } catch { refused = true; }
  ok(refused, 'the engine refuses buttonIcons "pinned", so the "engine takes it" checks above can fail');
}
B.setButtonIcons('attached');
ok(now() === plus('"buttonIcons":"attached"'), 'then setButtonIcons(attached) rewrites the same key in place: "buttonIcons":"attached", not unset');
reset('aurora');
B.setButtonContentSize('smaller');
B.setButtonLabelWeight('default');
ok(now() === plus('"buttonContentSize":"smaller","buttonLabelWeight":"default"') && takes(),
  'setButtonContentSize(smaller) then setButtonLabelWeight(default) append both keys in that order');
reset('harbor');
B.setButtonMinWidth(4);
ok(now() === plus('"buttonMinWidthMultiplier":4') && takes(), 'setButtonMinWidth(4) writes the number 4, not the string "4"');

console.log('\n3. The slider writes PER STEP: each step it passes is a state the brand holds');
reset('prism3');
const steps: string[] = [];
for (const v of [2.5, 2.75, 3]) { B.setButtonMinWidth(v); steps.push(now()); }
ok(JSON.stringify(steps) === JSON.stringify([plus('"buttonMinWidthMultiplier":2.5'), plus('"buttonMinWidthMultiplier":2.75'), plus('"buttonMinWidthMultiplier":3')]),
  'dragging 2.25 → 3 writes 2.5, then 2.75, then 3: one write per step');
B.setButtonMinWidth(1);
ok(now() === plus('"buttonMinWidthMultiplier":1') && takes(), 'the slider\'s minimum, 1, is written and the engine takes it');

console.log('\n4. The reader the specimen draws from: the brand\'s value, or the legacy fallback');
reset('prism3');
ok(JSON.stringify(B.buttonLayout()) === '{"edges":false,"smaller":false,"mult":2.25,"labelRole":"emphasis"}',
  `a brand with no Button option reads attached, match, 2.25 and emphasis (${JSON.stringify(B.buttonLayout())})`);
B.setButtonIcons('edges'); B.setButtonContentSize('smaller'); B.setButtonLabelWeight('default'); B.setButtonMinWidth(3.5);
ok(JSON.stringify(B.buttonLayout()) === '{"edges":true,"smaller":true,"mult":3.5,"labelRole":"default"}',
  `after edges, smaller, default and 3.5 it reads them back (${JSON.stringify(B.buttonLayout())})`);
reset('prism3');
B.setButtonMinWidth(2.25);
ok(B.buttonLayout().mult === 2.25 && typeof B.buttonLayout().mult === 'number', 'a written 2.25 reads as the number 2.25');

console.log(`\n${executed - failed}/${executed} Button option write assertions passed.`);
if (failed) process.exit(1);
