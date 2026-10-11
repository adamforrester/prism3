/**
 * Lever control helpers: the palette-ref option list (#1835) and the lever hook, in Node, with no DOM.
 *
 *   npx tsx apps/studio/test-lever-controls.ts
 *
 * (#1675's control-descriptor arms went with `describeControl` in #2487 PR 6: no page read it.) Every expected value
 * is a literal.
 */
import { paletteRefOptions, leverHook } from './src/levers/controls';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// Premise: this module is DOM-free, like the store.
ok(typeof (globalThis as { document?: unknown }).document === 'undefined', 'premise: no document in this process');

// #1835 — the palette lists, one source. Literal expectations.
ok(JSON.stringify(paletteRefOptions('linkPalette', ['accent', 'sun'])) === JSON.stringify(['primary', 'neutral', 'accent', 'sun']),
  'linkPalette offers primary, neutral, then the brand colors in order');
ok(JSON.stringify(paletteRefOptions('actionPalette', ['accent', 'sun'])) === JSON.stringify(['primary', 'accent', 'sun']),
  'actionPalette offers primary, then the brand colors (neutral pending #1811)');
ok(JSON.stringify(paletteRefOptions('someFuturePalette', [])) === JSON.stringify(['primary', 'neutral']),
  'a palette-ref lever with no picker of its own offers the Link palette set (#1835)');

// The data-p3 hooks, literally.
ok(leverHook('density') === 'lever-density', 'leverHook: density → lever-density');
ok(leverHook('motionPersonality.tempo') === 'lever-motion-personality-tempo', 'leverHook: motionPersonality.tempo → lever-motion-personality-tempo');
ok(leverHook('buttonContentSize') === 'lever-button-content-size', 'leverHook: buttonContentSize → lever-button-content-size');

console.log(`\n${executed - failed}/${executed} lever-control assertions passed.`);
if (failed) process.exit(1);
