/**
 * Color › Surfaces & fills' writes (UI redesign S4c), in Node, against the real store and the real engine.
 *
 *   npx tsx apps/studio/test-fills-input.ts
 *
 * `src/state/fills-input.ts` holds every edit the page makes to the working brand. S4a moved them there
 * unchanged and proved them by driving the page against the legacy one. S4c adds two things a DOM-free test
 * can hold by name before the browser suites run:
 *   1. THE FIELDS ROWS (owner decision Q29, #1962): one row for every `field.*` role the engine emits, page
 *      and inverse, each drawing on the palette the engine derives it from, each writing a plain override in
 *      the mode it is handed and nowhere else, and the engine resolving the role to the pick.
 *   2. WHICH SURFACES A PREVIEWED MODE SHOWS (Q22): `surfaceSourceOf`, the one place the page decides which
 *      `surfaces` key its single set of controls reads and writes, and whether it may write at all; and the
 *      token each control names, against the engine's own `GROUND_INPUT`.
 *   3. THE SCRIM'S READ-OUT: the primitive and opacity its read-only row prints, per mode.
 *
 * INDEPENDENT OF WHAT IT CHECKS (docs/34). The role list is read from the COMMITTED EMISSION
 * (`packages/engine/out/prism3.tokens.json`), never from the module, and is also written out here as a
 * literal, so a row dropped from the module and a role dropped from the engine each fail by name. The palette
 * each role draws on is read from the emission's own alias, in light and in dark. An expected write is a
 * literal typed here. "The engine takes it" is the engine's own `brandTheme`, and "it resolves to the pick" is
 * the engine's own `resolveAllModes`, compared with the emitted hex of the step picked. A cleared edit is held
 * against the brand as it was loaded, serialized, so pruning is checked byte for byte. The mode rules in (2)
 * are literals, one per built-in mode and one custom mode.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import { GROUND_INPUT, resolveAllModes } from '@prism3/engine/modes';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import * as store from './src/state/store';
import * as F from './src/state/fills-input';

let executed = 0, failed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) { console.log(`  ✓ ${label}`); return; }
  failed++;
  console.error(`  ✗ ${label}`);
};
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tokens = JSON.parse(readFileSync(join(REPO, 'packages/engine/out/prism3.tokens.json'), 'utf8'));
const ROOT = Object.keys(tokens).find((k) => !k.startsWith('$'))!;
const prism3 = (exampleBrands as Record<string, BrandInput>).prism3;
const PRISTINE = JSON.stringify(prism3);
const reset = (input: BrandInput = prism3): void => store.initSession(structuredClone(input), { kind: 'example', id: 'prism3' });
const pristine = (): boolean => JSON.stringify(store.brandState) === PRISTINE;
const takes = (): boolean => { try { brandTheme(structuredClone(store.brandState)); return true; } catch { return false; } };
/** The engine's resolution of `role` in `mode`, from the working brand as it stands. */
const resolved = (role: string, mode: string): { path?: string; hex?: string } | undefined =>
  (resolveAllModes(brandTheme(structuredClone(store.brandState))).find((m) => m.mode === mode)?.roles as Record<string, { path?: string; hex?: string } | undefined>)?.[role];

// ── 1. the Fields rows ────────────────────────────────────────────────────────────────────────────────
console.log('\n1. Fields rows (owner decision Q29; oracle: packages/engine/out/prism3.tokens.json)');
/** Every leaf under `node`, as role paths, with its emitted light alias and its dark one. */
const leaves = (node: unknown, path: string[], out: Array<{ role: string; light: string; dark: string }>): void => {
  if (!node || typeof node !== 'object') return;
  const n = node as Record<string, unknown>;
  if ('$value' in n) {
    const ext = (n.$extensions as { prism3?: { modes?: Record<string, { $value?: string }> } } | undefined)?.prism3;
    out.push({ role: path.join('.'), light: String(n.$value), dark: String(ext?.modes?.dark?.$value ?? '') });
    return;
  }
  for (const [k, v] of Object.entries(n)) if (!k.startsWith('$')) leaves(v, [...path, k], out);
};
const emittedFields: Array<{ role: string; light: string; dark: string }> = [];
leaves(tokens[ROOT].color.field, ['field'], emittedFields);
leaves(tokens[ROOT].color.inverse?.field, ['inverse', 'field'], emittedFields);
/** The eight, literally: `field.fill` and the seven that had no editor before Q29. */
const EXPECT_FIELD_ROLES = ['field.fill', 'field.border.rest', 'field.border.hover', 'field.placeholder',
  'inverse.field.fill', 'inverse.field.border.rest', 'inverse.field.border.hover', 'inverse.field.placeholder'];
const rowRoles = F.FIELD_ROWS.map((r) => r.role);
ok(emittedFields.length === EXPECT_FIELD_ROLES.length && EXPECT_FIELD_ROLES.every((r) => emittedFields.some((e) => e.role === r)),
  `the emission's field roles are the eight this test names (read ${emittedFields.map((e) => e.role).join(', ')})`);
const noRow = emittedFields.filter((e) => rowRoles.filter((r) => r === e.role).length !== 1).map((e) => e.role);
ok(noRow.length === 0, `every emitted field role has exactly one Fields row${noRow.length ? ` — no row, or more than one: ${noRow.join(', ')}` : ''}`);
const strays = rowRoles.filter((r) => !emittedFields.some((e) => e.role === r));
ok(strays.length === 0, `every Fields row names an emitted role${strays.length ? ` — not emitted: ${strays.join(', ')}` : ''}`);
const missingLiteral = EXPECT_FIELD_ROLES.filter((r) => !rowRoles.includes(r));
ok(missingLiteral.length === 0, `the Fields rows carry each of the eight${missingLiteral.length ? ` — missing: ${missingLiteral.join(', ')}` : ''}`);
// The palette: each role's emitted alias, in light and dark, is a neutral step or the transparent primitive.
reset();
const nPal = store.theme.roleToPalette.neutral;
for (const e of emittedFields) {
  const row = F.FIELD_ROWS.find((r) => r.role === e.role);
  const fromNeutral = (v: string): boolean => new RegExp(`^\\{${ROOT}\\.core\\.palette\\.(${nPal}\\.[0-9]+|transparent)\\}$`).test(v);
  ok(fromNeutral(e.light) && fromNeutral(e.dark) && !!row && F.paletteOf(row) === nPal,
    `${e.role}: the engine derives it from ${nPal} (light ${e.light}, dark ${e.dark}), and its row picks ${nPal} steps (${row ? F.paletteOf(row) : 'no row'})`);
}
// A transparent fill is marked so: its swatch shows the ground it sits on, and a step is judged by its ink.
ok(JSON.stringify(F.FIELD_ROWS.filter((r) => r.transparent).map((r) => [r.role, r.transparent])) === JSON.stringify([
  ['field.fill', { ground: 'background.primary', ink: 'text.primary', floor: 4.5 }],
  ['inverse.field.fill', { ground: 'inverse.background.primary', ink: 'inverse.text.primary', floor: 4.5 }],
]), 'the two field fills are the transparent rows: on the page, judged by text.primary; on the band, by inverse.text.primary; each at 4.5:1');

// The writes: each row, in light and in dark, to neutral 300 and back to Auto.
const STEP = '300';
const hex300 = String(tokens[ROOT].core.palette[nPal][STEP].$value).toLowerCase();
for (const role of EXPECT_FIELD_ROLES) {
  const row = F.FIELD_ROWS.find((r) => r.role === role);
  if (!row) { ok(false, `${role}: no Fields row to write through`); continue; }
  for (const mode of ['light', 'dark'] as const) {
    const other = mode === 'light' ? 'dark' : 'light';
    reset();
    const before = resolved(role, other);
    F.setRowOverride(mode, row, STEP);
    const want = { [mode]: { [role]: { palette: 'neutral', step: '300' } } };
    ok(JSON.stringify(store.brandState.overrides) === JSON.stringify(want),
      `${role} in ${mode}: the row writes overrides ${JSON.stringify(want)} (wrote ${JSON.stringify(store.brandState.overrides)})`);
    const got = takes() ? resolved(role, mode) : undefined;
    ok(!!got && got.path === `${ROOT}.core.palette.neutral.300` && got.hex?.toLowerCase() === hex300,
      `${role} in ${mode}: the engine takes it and resolves the role to neutral 300, the emitted ${hex300} (resolved ${got?.path} ${got?.hex})`);
    const after = resolved(role, other);
    ok(JSON.stringify(after) === JSON.stringify(before), `${role} in ${mode}: ${other} resolves as before (${before?.path} → ${after?.path})`);
    F.setRowOverride(mode, row, undefined);
    ok(pristine(), `${role} in ${mode}: Auto leaves the brand byte-identical to the one loaded (overrides ${JSON.stringify(store.brandState.overrides)})`);
  }
}
// Two rows at once, in two modes: each lands in its own mode, and clearing one leaves the other.
reset();
F.setRowOverride('light', F.FIELD_ROWS.find((r) => r.role === 'field.border.rest')!, '600');
F.setRowOverride('dark', F.FIELD_ROWS.find((r) => r.role === 'inverse.field.placeholder')!, '200');
ok(JSON.stringify(store.brandState.overrides) === JSON.stringify({ light: { 'field.border.rest': { palette: 'neutral', step: '600' } }, dark: { 'inverse.field.placeholder': { palette: 'neutral', step: '200' } } }),
  `a Light and a Dark field edit each land in their own mode (${JSON.stringify(store.brandState.overrides)})`);
F.setRowOverride('light', F.FIELD_ROWS.find((r) => r.role === 'field.border.rest')!, undefined);
ok(JSON.stringify(store.brandState.overrides) === JSON.stringify({ dark: { 'inverse.field.placeholder': { palette: 'neutral', step: '200' } } }),
  `clearing the Light one prunes Light and keeps Dark's (${JSON.stringify(store.brandState.overrides)})`);

// No link row (owner decision Q28, #1961): links are edited on Interactive only.
const linkRows = [...F.FILL_ROWS, ...F.TEXT_ROWS, ...F.FIELD_ROWS].filter((r) => r.role.split('.').includes('link')).map((r) => r.role);
ok(linkRows.length === 0, `no Surfaces & fills row edits a link role${linkRows.length ? ` — link rows: ${linkRows.join(', ')}` : ''}`);

// ── 2. which surfaces the previewed mode shows (Q22) ─────────────────────────────────────────────────
console.log('\n2. Surfaces: the previewed mode\'s key, editable only in Light and Dark (owner decision Q22)');
reset({ ...structuredClone(prism3), customModes: [{ name: 'night', base: 'dark' }, { name: 'paper', base: 'light' }] } as BrandInput);
const MODE_RULE: Array<[string, { source: string; editable: boolean }]> = [
  ['light', { source: 'light', editable: true }], ['dark', { source: 'dark', editable: true }],
  ['hc-light', { source: 'light', editable: false }], ['hc-dark', { source: 'dark', editable: false }],
  ['wireframe', { source: 'light', editable: false }],
  ['night', { source: 'dark', editable: false }], ['paper', { source: 'light', editable: false }],
];
for (const [mode, want] of MODE_RULE) {
  const got = F.surfaceSourceOf(mode);
  ok(JSON.stringify(got) === JSON.stringify(want), `previewing ${mode}, the surface controls show ${want.source}'s surfaces, ${want.editable ? 'editable' : 'read-only'} (got ${JSON.stringify(got)})`);
}
// The writes the controls make for the mode they are handed: that mode's key, nothing else.
reset();
F.setSurfaceBase('dark', '100');
F.setSurfaceFloor('dark', '200');
F.setBandStep('dark', '800');
ok(JSON.stringify(store.brandState.surfaces?.dark) === JSON.stringify({ base: 100, floorStep: 200, inverseBase: 800 })
  && JSON.stringify(store.brandState.surfaces?.light) === JSON.stringify(prism3.surfaces?.light),
  `Dark's Page, Contrast floor and Inverse band step write surfaces.dark, and surfaces.light stays as loaded (${JSON.stringify(store.brandState.surfaces)})`);
F.setSurfaceBase('light', 'white');
F.setBandPalette('light', 'primary');
ok(JSON.stringify(store.brandState.surfaces?.light) === JSON.stringify({ base: 'white', inverseBase: { palette: 'primary', step: Number(F.stepsOf('primary').at(-1)) } }),
  `Light's Page and Inverse band palette write surfaces.light, the band seeded at primary's darkest step (${JSON.stringify(store.brandState.surfaces?.light)})`);
ok(JSON.stringify(store.brandState.surfaces?.dark) === JSON.stringify({ base: 100, floorStep: 200, inverseBase: 800 }), 'and leave surfaces.dark as it was');
ok(takes(), 'the engine takes the brand with both modes\' surfaces set');

// The token each surface control names (the owner's direction for S4c: the lever names what it sets).
// Oracle: the engine's own `GROUND_INPUT` (which `surfaces.<mode>` field declares which ground), and the
// engine's resolution: a written page or band moves exactly the role the control names.
const fieldOf = Object.fromEntries(Object.entries(GROUND_INPUT).map(([role, field]) => [field, role]));
ok(F.SURFACE_TOKENS.base === fieldOf.base && F.SURFACE_TOKENS.inverseBase === fieldOf.inverseBase,
  `the Page control names ${fieldOf.base} and the Inverse band ${fieldOf.inverseBase}, the grounds the engine declares for surfaces.<mode>.base and .inverseBase (named ${F.SURFACE_TOKENS.base}, ${F.SURFACE_TOKENS.inverseBase})`);
reset();
const pageBefore = resolved(F.SURFACE_TOKENS.base, 'dark')?.path, bandBefore = resolved(F.SURFACE_TOKENS.inverseBase, 'dark')?.path;
F.setSurfaceBase('dark', '850');
F.setBandStep('dark', '100');
const pageAfter = resolved(F.SURFACE_TOKENS.base, 'dark')?.path, bandAfter = resolved(F.SURFACE_TOKENS.inverseBase, 'dark')?.path;
ok(pageAfter === `${ROOT}.core.palette.neutral.850` && pageBefore !== pageAfter, `writing Dark's Page to neutral 850 moves ${F.SURFACE_TOKENS.base} in Dark to it (${pageBefore} → ${pageAfter})`);
ok(bandAfter === `${ROOT}.core.palette.neutral.100` && bandBefore !== bandAfter, `writing Dark's Inverse band to neutral 100 moves ${F.SURFACE_TOKENS.inverseBase} in Dark to it (${bandBefore} → ${bandAfter})`);

// ── 3. the scrim's read-out ───────────────────────────────────────────────────────────────────────────
console.log('\n3. The scrim row: read-only, its primitive and opacity per mode (oracle: the emission)');
reset();
const scrimLeaf = tokens[ROOT].color.scrim.default;
for (const mode of ['light', 'dark', 'hc-light', 'hc-dark']) {
  // The emission's alias for the mode, and that primitive's own `alpha`, as the expectation.
  const alias = String(mode === 'light' ? scrimLeaf.$value : scrimLeaf.$extensions.prism3.modes[mode].$value).slice(1, -1).replace(`${ROOT}.`, '');
  const [, , pal, step] = alias.split('.');
  const alpha = tokens[ROOT].core.palette[pal]?.[step]?.$extensions?.prism3?.alpha;
  const want = { primitive: `${pal} ${step}`, opacity: Math.round(alpha * 100) };
  const r = F.rolesIn(mode)[F.SCRIM_ROLE];
  const got = r ? F.washReadOf(r) : null;
  ok(typeof alpha === 'number' && JSON.stringify(got) === JSON.stringify(want), `${mode}: the scrim reads out ${want.primitive} at ${want.opacity}%, the emission's ${alias} (read ${JSON.stringify(got)})`);
}

console.log(`\n${executed - failed}/${executed} Surfaces & fills write assertions passed.`);
if (failed) process.exit(1);
