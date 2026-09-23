/**
 * Size-table column-header labelling test (#1586) — drives the REAL `src/size-labels.ts`, so the
 * relabel is verified with no browser and no live Figma.
 *
 *   npx tsx apps/studio/test-size-labels.ts
 *
 * `main.ts` calls `build()` (touching `document`) at import and cannot load under tsx, so the header
 * logic was extracted to its own pure module — same reason `test-provenance.ts` exists. The gate this
 * file provides: the SIZE table's base column must never read as the "Light" appearance mode, because
 * type sizes vary by VIEWPORT (the Responsive type lever), not by light/dark (#1586).
 *
 * docs/34 (gate independence): the load-bearing assertions are written against LITERALS and against
 * the RULE ("no appearance-mode name in the base header"), NOT against the module's own exported
 * constants — asserting `text === SIZE_BASE_LABEL` would be `x === x` and pass whatever the label
 * became. The mutation that reverts the base column to the appearance form (`Light` + ` baseline`)
 * fails the `noAppearanceWord` assertion below BY NAME.
 */
import { sizeColumnHeader, SIZE_BASE_LABEL, SIZE_BASE_TITLE } from './src/size-labels';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// The word set the base column must NOT contain: appearance-mode names and the "baseline" framing
// that #1586 flagged. Written here as a literal so the assertion encodes the RULE, not the module's
// current output — a revert to "Light baseline" trips this regardless of how the module spells it.
const APPEARANCE_WORDS = /\b(light|dark|baseline|appearance|theme)\b/i;

// =============================================================================================
// 1. The base column — the whole point of #1586
// =============================================================================================
console.log('\n#1586 — the base column reads as a viewport-independent base, not an appearance mode');

// `light` is the theme axis's base column internally; it is editable, and its DISPLAY label is
// "Light" — which is exactly what must NOT surface in a size table.
const base = sizeColumnHeader(true, true, 'Light');

// THE LOAD-BEARING ASSERTION. The base column's full visible text (label + suffix) must carry no
// appearance-mode word. A mutation reverting it to `{ text: 'Light', suffix: ' baseline' }` fails
// here by name. Independent of the module's constants — it tests the rule, not a value.
ok(!APPEARANCE_WORDS.test(base.text + base.suffix),
  'the base column text carries NO appearance-mode word (not "Light", not "baseline")');

// And it positively names a base, so the fix is not merely "delete the word".
ok(/base/i.test(base.text), 'the base column text names a base');
ok(base.suffix === '', 'the base column has no read-only suffix (no " baseline")');

// The explanation must be present and must name the mechanism (the Responsive lever) and the axis it
// really varies on (mobile/desktop), so the reader is redirected to the correct control. These are
// the RULE ("explain the viewport scaling"), checked as independent literals.
ok(!!base.title && /responsive/i.test(base.title), 'the base column explains it is scaled by the Responsive type lever');
ok(!!base.title && /mobile/i.test(base.title!) && /desktop/i.test(base.title!),
  'the base column names the mobile↔desktop axis sizes actually vary on');
// No banned voice-standard §2 words in the shipped tooltip.
ok(!!base.title && !/\b(simply|just|easy|obviously)\b/i.test(base.title!) && !base.title!.includes('!'),
  'the base column explanation avoids §2 banned words and exclamation marks');

// =============================================================================================
// 2. Per-theme-mode columns are preserved (the #1586 constraint: don't remove sizeByMode columns)
// =============================================================================================
console.log('\n#1586 — editable and derived per-theme-mode columns keep their appearance labels');

// An editable non-base mode (dark) edits a real per-mode size override (`sizeByMode`). Its column
// MUST still read as that appearance mode, or the override is unlabelled.
const dark = sizeColumnHeader(false, true, 'Dark');
ok(dark.text === 'Dark', 'the dark column keeps its appearance label (a real per-mode size override)');
ok(dark.suffix === '', 'the dark column has no qualifier suffix');
ok(dark.title === undefined, 'the dark column has no base tooltip');

// A derived (non-editable) mode is auto-resolved and accepts no lever — it keeps its label + " auto".
const derived = sizeColumnHeader(false, false, 'HC dark');
ok(derived.text === 'HC dark', 'a derived mode keeps its appearance label');
ok(derived.suffix === ' auto', 'a derived mode is marked " auto" (#423)');

// The base branch is distinguishable from BOTH other branches — a collapse would make one equal.
ok(base.text !== dark.text && base.text !== derived.text,
  'the base column is distinct from both the editable-mode and derived-mode columns');

// =============================================================================================
// 3. The exported constants match what the module actually returns (guards a silent divergence)
// =============================================================================================
console.log('\n#1586 — the exported constants and the returned header agree');

// This pair is a consistency check, not the gate: it asserts the module is internally coherent so a
// future caller reading `SIZE_BASE_LABEL`/`SIZE_BASE_TITLE` gets what the table shows. The gate is §1.
ok(base.text === SIZE_BASE_LABEL, 'the returned base text is the exported SIZE_BASE_LABEL');
ok(base.title === SIZE_BASE_TITLE, 'the returned base title is the exported SIZE_BASE_TITLE');

// =============================================================================================
console.log(`\n${failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILED`} — ${executed} assertions executed`);
process.exit(failed === 0 ? 0 : 1);
