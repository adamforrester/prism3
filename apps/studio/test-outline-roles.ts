/**
 * Style guide Outline-row role test (#1629) — drives the REAL `src/outline-roles.ts`, the helper the
 * style guide's Outline row reads its fill, ink and edge keys from.
 *
 *   npx tsx apps/studio/test-outline-roles.ts
 *
 * `main.ts` calls `build()` (touching `document`) at import and cannot load under tsx, so the key
 * choice was extracted to its own pure module, as `size-labels.ts` and `provenance.ts` were.
 *
 * The defect: on an inverse preview ground the ink and edge switched to their `inverse.` twins, and
 * the hover/pressed FILL did not. It read the PAGE wash, so the band preview painted `black-alpha` over
 * a near-black band (`overlay-neutral`) or the page fill at the page step (`solid-tint`).
 *
 * docs/34 (gate independence): the expected keys are LITERALS written out here, and each is checked
 * against the ENGINE's resolved role set for a real brand, never against `outlineFillRole` or the
 * module's own output. The rule is stated separately too: on an inverse ground, no key the row reads
 * may be a page role. Mutation that drops the ground prefix from the fill in `outlineStateRoles` fails
 * `inverse ground reads no page role` and the literal-key checks below BY NAME.
 */
import { outlineStateRoles } from './src/outline-roles';
import { brandTheme } from '@prism3/engine/theme';
import type { BrandInput } from '@prism3/engine/theme';
import { resolveAllModes } from '@prism3/engine/modes';
import exampleBrands from '@prism3/engine/schema/example-brands.json';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

const METHODS = ['overlay-neutral', 'solid-tint', 'none'] as const;
const COLUMNS = ['primary', 'neutral', 'destructive'];
const STATES = ['rest', 'hover', 'pressed'];

// Hand-written expectations: the family each method emits, spelled out rather than imported.
const FAMILY: Record<(typeof METHODS)[number], string | null> = {
  'overlay-neutral': 'overlay',
  'solid-tint': 'subtle-fill',
  none: null,
};

console.log('\n#1629 — on an inverse preview ground the Outline row reads the inverse twins, fill included');
for (const method of METHODS) {
  const wrong: string[] = [];
  for (const c of COLUMNS) for (const s of STATES) {
    const r = outlineStateRoles(method, c, s, true);
    for (const k of [r.fill, r.text, r.border]) if (k && !k.startsWith('inverse.')) wrong.push(`${c}/${s}: ${k}`);
  }
  ok(wrong.length === 0, `${method}: inverse ground reads no page role` + (wrong.length ? ` — PAGE ROLES: ${wrong.slice(0, 4).join(', ')}` : ''));
}

console.log('\n#1629 — the exact keys, written out');
for (const method of METHODS) {
  const fam = FAMILY[method];
  for (const s of ['hover', 'pressed']) {
    const band = outlineStateRoles(method, 'primary', s, true).fill;
    const page = outlineStateRoles(method, 'primary', s, false).fill;
    ok(band === (fam ? `inverse.interactive.primary.${fam}.${s}` : null), `${method}/${s}: band fill is ${fam ? `inverse.interactive.primary.${fam}.${s}` : 'none'} (got ${band})`);
    ok(page === (fam ? `interactive.primary.${fam}.${s}` : null), `${method}/${s}: page fill is ${fam ? `interactive.primary.${fam}.${s}` : 'none'} (got ${page})`);
  }
  ok(outlineStateRoles(method, 'primary', 'rest', true).fill === null, `${method}/rest: no fill at rest`);
}

// Every key the row reads must be one the engine actually emits for that method — `paint()` turns a
// missing role into 'transparent', which is how #288 hid: the row rendered, just not what it named.
console.log('\n#1629 — every key the row reads, on either ground, resolves in the engine for every example brand and mode');
for (const [id, input] of Object.entries(exampleBrands as Record<string, BrandInput>)) {
  for (const method of METHODS) {
    const missing: string[] = [];
    let judged = 0;
    for (const m of resolveAllModes({ ...brandTheme(input), outlineInteraction: method })) {
      for (const inv of [false, true]) for (const c of COLUMNS) for (const s of STATES) {
        const r = outlineStateRoles(method, c, s, inv);
        for (const k of [r.fill, r.text, r.border]) {
          if (!k) continue;
          judged++;
          if (!m.roles[k]) missing.push(`${m.mode}/${k}`);
        }
      }
    }
    ok(judged > 0 && missing.length === 0, `${id}/${method}: ${judged} keys resolve` + (missing.length ? ` — MISSING (${missing.length}): ${missing.slice(0, 4).join(', ')}` : ''));
  }
}

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
