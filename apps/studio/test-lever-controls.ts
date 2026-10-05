/**
 * The lever control descriptor (#1675, UI redesign F4) — drives the REAL `src/levers/controls.ts` over
 * the REAL lever manifest, in Node, with no DOM.
 *
 *   npx tsx apps/studio/test-lever-controls.ts
 *
 * docs/34 (gate independence): the expected control for each lever is derived HERE, from the raw option
 * count the manifest carries and from bounds written out in this file (2 and 4), never from the
 * module's `CHIPS_MIN` / `CHIPS_MAX` or any helper of it. The counts are read twice, from the manifest
 * the studio bundles and from the committed `schema/lever-manifest.json`, and the two must agree. The
 * levers #1675 converts are also named literally, so a rule change that drops one of them fails by name
 * even if the derived arm were ever to move with it.
 *
 * Mutations this fails by name: making the mapper classify a 4-option enum as a select fails
 * `controlShape (4 options) → chips`; widening the range to 5 fails the fixture arm
 * `a 5-option fixture enum → select`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leverManifest, type Lever } from '@prism3/engine/levers';
import { describeControl, paletteRefOptions, leverHook } from './src/levers/controls';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// Premise: this module is DOM-free, like the store.
ok(typeof (globalThis as { document?: unknown }).document === 'undefined', 'premise: no document in this process');

// The committed emission of the manifest: a second reading of the option counts.
const ROOT = dirname(fileURLToPath(import.meta.url));
const emitted = JSON.parse(readFileSync(join(ROOT, '..', '..', 'packages', 'engine', 'schema', 'lever-manifest.json'), 'utf8')) as { levers: Lever[] };
const emittedCount = new Map(emitted.levers.filter((l) => l.control === 'enum').map((l) => [l.key, (l.options ?? []).length]));

// The rule, restated here on purpose: 2 to 4 options and no Auto entry is chips; anything else a select.
const LOW = 2, HIGH = 4;
const autoOption = (l: Lever): boolean => (l.options ?? []).some((o) => /^auto\b/i.test(o.label));

const enums = leverManifest.filter((l) => l.control === 'enum');
// A floor, so a manifest read that came back empty cannot pass as "every enum classified".
ok(enums.length >= 10, `the manifest carries at least 10 enum levers (found ${enums.length})`);
ok(enums.length === emittedCount.size, `the bundled manifest and schema/lever-manifest.json list the same number of enum levers (${enums.length} vs ${emittedCount.size})`);

let chips = 0, selects = 0;
for (const l of enums) {
  const n = (l.options ?? []).length;
  ok(emittedCount.get(l.key) === n, `${l.key}: ${n} options in the bundled manifest, ${emittedCount.get(l.key)} in the committed one`);
  const want = n >= LOW && n <= HIGH && !autoOption(l) ? 'chips' : 'select';
  const d = describeControl(l);
  ok(d.kind === want, `${l.key} (${n} options) → ${want} (got ${d.kind})`);
  if (want === 'chips') chips++; else selects++;
  // Option labels come from the manifest, in its order.
  if (d.kind === 'chips' || d.kind === 'select') {
    ok(JSON.stringify(d.options) === JSON.stringify((l.options ?? []).map((o) => ({ value: o.value, label: o.label }))),
      `${l.key}: the control's options are the manifest's own values and labels, in order`);
  }
  // With an Auto entry added by the caller (the per-mode selects), every enum is a select.
  ok(describeControl(l, { auto: true }).kind === 'select', `${l.key} with an added Auto entry → select`);
}
ok(chips >= 10 && selects >= 1, `both classes are represented: ${chips} chips, ${selects} select`);

// The levers #1675 and the F4 plan convert, by name. Each must be an enum and chips.
const CONVERTED = [
  'density', 'controlShape', 'buttonIcons', 'buttonContentSize', 'buttonLabelWeight', 'motionPersonality.tempo',
  'iconContrast', 'disabledStrategy', 'outlineInteraction', 'neutralEmphasis',
];
for (const key of CONVERTED) {
  const l = leverManifest.find((x) => x.key === key);
  ok(!!l && describeControl(l).kind === 'chips', `${key}: renders as chips (#1675)`);
}
// And the one enum that stays a select because of its length.
{
  const l = leverManifest.find((x) => x.key === 'typography.displayCeiling');
  ok(!!l && describeControl(l).kind === 'select', 'typography.displayCeiling (6 options) stays a select');
}

// Fixtures: the edges of the rule, on levers the manifest does not have.
const fixture = (n: number, labels?: string[]): Lever => ({
  key: 'fixture', group: 'advanced', label: 'Fixture', description: '', control: 'enum',
  options: Array.from({ length: n }, (_, i) => ({ value: `v${i}`, label: labels?.[i] ?? `Option ${i}` })),
});
ok(describeControl(fixture(1)).kind === 'select', 'a 1-option fixture enum → select');
ok(describeControl(fixture(2)).kind === 'chips', 'a 2-option fixture enum → chips');
ok(describeControl(fixture(4)).kind === 'chips', 'a 4-option fixture enum → chips');
ok(describeControl(fixture(5)).kind === 'select', 'a 5-option fixture enum → select');
ok(describeControl(fixture(3, ['Auto (follows primary)', 'Light', 'Dark'])).kind === 'select', 'a fixture enum with an "Auto" option → select');

// The other control kinds, from the real manifest.
for (const [control, kind] of [['slider', 'slider'], ['toggle', 'toggle'], ['color', 'color'], ['palette-ref', 'select'], ['list', 'readonly'], ['object', 'readonly']] as const) {
  const ls = leverManifest.filter((l) => l.control === control);
  ok(ls.length > 0 && ls.every((l) => describeControl(l).kind === kind), `every ${control} lever (${ls.length}) → ${kind}`);
}

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
