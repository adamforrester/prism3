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
 * S4d (owner decisions Q44 to Q50) adds:
 *   4. A HOME FOR EVERY ROLE (Q20, Q49): every Surfaces & fills role the emission carries is a row, one of the
 *      two grounds the Background fills controls set, or read-only by a reason this test declares literally
 *      (the washes, the tier grounds waiting on #1972, the focus rings waiting on #1966). Q49's list is written
 *      out by family, so a dropped row fails by its role.
 *   5. THE NEW ROWS' PALETTES AND WRITES: as (1), for each of them, in light and dark.
 *   6. THE ICON LOCK (Q50): paired, each icon row is locked to its text twin, by the engine's own rule restated
 *      here, and the engine is shown to carry an edit on that twin to the icon (#1968), so "Follows" is true;
 *      Unpair writes `iconContrast: '3:1'` and nothing else, and unlocks every row; re-pairing clears every
 *      icon override (Q52), and the confirm's body is singular for one override, plural otherwise (Q60).
 *   7. THE PAGE PICKER (Q45): each of its choices writes byte for byte what the select's option wrote.
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
const linkRows = [...F.FOREGROUND_ROWS, ...F.FILL_ROWS, ...F.TEXT_ROWS, ...F.BORDER_ROWS, ...F.ICON_ROWS, ...F.FIELD_ROWS].filter((r) => r.role.split('.').includes('link')).map((r) => r.role);
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


// ── 4. S4d: every Surfaces & fills role has a home (owner decisions Q20, Q49, Q50) ─────────────────────
console.log('\n4. Every Surfaces & fills role is a row, a lever, or read-only by a declared reason (oracle: the emission)');
/** Every row the page draws, as the module lists them. */
const ALL_ROWS = [...F.FOREGROUND_ROWS, ...F.FILL_ROWS, ...F.TEXT_ROWS, ...F.BORDER_ROWS, ...F.ICON_ROWS, ...F.FIELD_ROWS];
/** The page's families, literally (Surfaces & fills' share of the emitted color tree), and the link families
 *  that are Interactive's, not this page's (Q28). */
const FILLS_FAMILIES = ['text', 'icon', 'background', 'foreground', 'border', 'scrim', 'veil', 'field'];
const INTERACTIVES = /^(inverse\.)?(text|icon)\.link\./;
const emittedFills: Array<{ role: string; light: string; dark: string }> = [];
for (const fam of FILLS_FAMILIES) {
  leaves(tokens[ROOT].color[fam], [fam], emittedFills);
  leaves(tokens[ROOT].color.inverse?.[fam], ['inverse', fam], emittedFills);
}
const fillsRoles = emittedFills.filter((e) => !INTERACTIVES.test(e.role));
/** The two grounds, set by the Background fills controls, not by an override (the engine refuses one). */
const LEVER_ROLES: Record<string, string> = {
  'background.primary': 'Page, surfaces.<mode>.base',
  'inverse.background.primary': 'Inverse band, surfaces.<mode>.inverseBase',
};
/** Read-only, each with its declared reason. Literal. */
const VEILS = ['dark.subtle', 'dark.medium', 'dark.strong', 'dark.clear', 'light.subtle', 'light.medium', 'light.strong', 'light.clear'].map((v) => `veil.${v}`);
const READ_ONLY: Record<string, string> = {
  'scrim.default': 'a wash: no ramp step to swap in (a read-only row)',
  ...Object.fromEntries(VEILS.map((v) => [v, 'a wash: no ramp step to swap in'])),
  'background.secondary': 'a tier ground, waiting on its engine input (#1972)',
  'background.tertiary': 'a tier ground, waiting on its engine input (#1972)',
  'inverse.background.secondary': 'a tier ground, waiting on its engine input (#1972)',
  'inverse.background.tertiary': 'a tier ground, waiting on its engine input (#1972)',
  'border.focus': 'the focus ring, customizable in #1966 (a read-only row)',
  'inverse.border.focus': 'the focus ring, customizable in #1966 (a read-only row)',
};
ok(fillsRoles.length > 100 && fillsRoles.some((e) => e.role === 'icon.on-brand') && fillsRoles.some((e) => e.role === 'inverse.border.info'),
  `the emission gives Surfaces & fills' roles to classify (read ${fillsRoles.length})`);
const rowCount = (role: string): number => ALL_ROWS.filter((r) => r.role === role).length;
const homes = (role: string): number => rowCount(role) + (role in LEVER_ROLES ? 1 : 0) + (role in READ_ONLY ? 1 : 0);
const homeless = fillsRoles.filter((e) => homes(e.role) === 0).map((e) => e.role);
const twoHomes = fillsRoles.filter((e) => homes(e.role) > 1).map((e) => e.role);
ok(homeless.length === 0, `every Surfaces & fills role the engine emits is a row, a lever or read-only by a declared reason${homeless.length ? ` — no home: ${homeless.join(', ')}` : ''}`);
ok(twoHomes.length === 0, `no Surfaces & fills role has two homes (a row and a lever, two rows, a row and a read-only reason)${twoHomes.length ? ` — two homes: ${twoHomes.join(', ')}` : ''}`);
const unemitted = ALL_ROWS.filter((r) => !fillsRoles.some((e) => e.role === r.role)).map((r) => r.role);
ok(unemitted.length === 0, `every row names an emitted Surfaces & fills role${unemitted.length ? ` — not emitted: ${unemitted.join(', ')}` : ''}`);
const declaredGone = [...Object.keys(LEVER_ROLES), ...Object.keys(READ_ONLY)].filter((r) => !fillsRoles.some((e) => e.role === r));
ok(declaredGone.length === 0, `every declared lever and read-only role is still emitted${declaredGone.length ? ` — gone: ${declaredGone.join(', ')}` : ''}`);
ok(JSON.stringify([...F.FOCUS_ROLES]) === JSON.stringify(['border.focus', 'inverse.border.focus']), `the read-only focus rows are border.focus and inverse.border.focus (${JSON.stringify(F.FOCUS_ROLES)})`);
/** Q49's list, literally: the roles S4d gives rows (the focus rings read-only), by family. */
const SEM5 = ['brand', 'success', 'warning', 'danger', 'info'];
const T3 = ['primary', 'secondary', 'tertiary'];
const Q49: Record<string, string[]> = {
  'foreground.*-subtle': SEM5.map((s) => `foreground.${s}-subtle`),
  'text.on-*': SEM5.map((s) => `text.on-${s}`),
  'border.*': [...T3, ...SEM5].map((s) => `border.${s}`),
  'inverse.foreground.*': [...T3, ...SEM5, ...SEM5.map((s) => `${s}-subtle`)].map((s) => `inverse.foreground.${s}`),
  'inverse.text.*': [...T3, ...SEM5, ...SEM5.map((s) => `${s}-subtle`)].map((s) => `inverse.text.${s}`),
  'inverse.border.*': [...T3, ...SEM5].map((s) => `inverse.border.${s}`),
  'icon.*': [...T3, ...SEM5, ...SEM5.map((s) => `${s}-subtle`), ...SEM5.map((s) => `on-${s}`)].map((s) => `icon.${s}`),
  'inverse.icon.*': [...T3, ...SEM5, ...SEM5.map((s) => `${s}-subtle`)].map((s) => `inverse.icon.${s}`),
};
const COUNTS: Record<string, number> = { 'foreground.*-subtle': 5, 'text.on-*': 5, 'border.*': 8, 'inverse.foreground.*': 13, 'inverse.text.*': 13, 'inverse.border.*': 8, 'icon.*': 18, 'inverse.icon.*': 13 };
for (const [fam, roles] of Object.entries(Q49)) {
  const missing = roles.filter((r) => rowCount(r) !== 1);
  ok(roles.length === COUNTS[fam] && missing.length === 0, `${fam}: each of its ${COUNTS[fam]} roles has exactly one row${missing.length ? ` — no row, or more than one: ${missing.join(', ')}` : ''}`);
}

// ── 5. S4d: each new row picks the palette the engine derives its role from, and writes a plain override ──
console.log('\n5. The new rows: their palette (the emission\'s alias) and their writes (literal), in light and dark');
reset();
/** The rows S4d adds or moves (the Foreground section, Q44, and the Q49 roles). */
const S4D_ROLES = new Set([...Object.values(Q49).flat(), 'foreground.primary', 'foreground.secondary', 'foreground.tertiary']);
const s4dRows = ALL_ROWS.filter((r) => S4D_ROLES.has(r.role));
ok(s4dRows.length === S4D_ROLES.size, `every S4d role has its row (${s4dRows.length} of ${S4D_ROLES.size})`);
/** A role on a fixed primitive: the on-color inks resolve to white or black where the engine finds them
 *  legible, so the palette their steps come from is declared: neutral (literal). */
const FIXED_PALETTE = 'neutral';
const aliasPalette = (alias: string): string | null => {
  const m = new RegExp(`^\\{${ROOT}\\.core\\.palette\\.([a-z-]+)\\.[0-9]+\\}$`).exec(alias);
  return m ? m[1] : null;
};
const allModes = (): ReturnType<typeof resolveAllModes> => resolveAllModes(brandTheme(structuredClone(store.brandState)));
const roleIn = (all: ReturnType<typeof resolveAllModes>, role: string, mode: string): { path?: string; hex?: string } | undefined =>
  (all.find((m) => m.mode === mode)?.roles as Record<string, { path?: string; hex?: string } | undefined>)?.[role];
const base = allModes();
for (const row of s4dRows) {
  const e = fillsRoles.find((x) => x.role === row.role)!;
  const pals = [aliasPalette(e.light), aliasPalette(e.dark)];
  const onColor = /\.on-/.test(row.role);
  const want = onColor ? FIXED_PALETTE : pals[0];
  const consistent = onColor ? pals.every((p) => p === null || p === FIXED_PALETTE) : pals[0] !== null && pals[0] === pals[1];
  ok(consistent && F.paletteOf(row) === want,
    `${row.role}: the engine derives it from ${want}${onColor ? ' (or a fixed white or black)' : ''} (light ${e.light}, dark ${e.dark}), and its row picks ${F.paletteOf(row)} steps`);
  for (const mode of ['light', 'dark'] as const) {
    const other = mode === 'light' ? 'dark' : 'light';
    reset();
    F.setRowOverride(mode, row, '300');
    const wantOv = { [mode]: { [row.role]: { palette: want, step: '300' } } };
    ok(JSON.stringify(store.brandState.overrides) === JSON.stringify(wantOv), `${row.role} in ${mode}: the row writes overrides ${JSON.stringify(wantOv)} (wrote ${JSON.stringify(store.brandState.overrides)})`);
    const hex = String(tokens[ROOT].core.palette[want!]?.['300']?.$value ?? '').toLowerCase();
    let all: ReturnType<typeof resolveAllModes> | null = null;
    try { all = allModes(); } catch { /* reported below */ }
    const got = all ? roleIn(all, row.role, mode) : undefined;
    ok(!!got && got.path === `${ROOT}.core.palette.${want}.300` && got.hex?.toLowerCase() === hex,
      `${row.role} in ${mode}: the engine takes it and resolves the role to ${want} 300, the emitted ${hex} (resolved ${got?.path} ${got?.hex})`);
    const b0 = roleIn(base, row.role, other), b1 = all ? roleIn(all, row.role, other) : undefined;
    ok(JSON.stringify(b0) === JSON.stringify(b1), `${row.role} in ${mode}: ${other} resolves as before (${b0?.path} → ${b1?.path})`);
    F.setRowOverride(mode, row, undefined);
    ok(pristine(), `${row.role} in ${mode}: Auto leaves the brand byte-identical to the one loaded`);
  }
}

// ── 6. S4d: the icon rows' lock (owner decision Q50; the engine's #1968) ─────────────────────────────────
console.log('\n6. Icon rows: locked to their text role while icons match text, unlocked by Unpair (oracle: the engine)');
/** The engine's twin rule, restated here: `text` swapped for `icon` in the role path (`withIconTwins`). */
const twinOf = (iconRole: string): string => iconRole.replace(/(^|\.)icon\./, '$1text.');
const ICON_ROLES = [...Q49['icon.*'], ...Q49['inverse.icon.*']];
ok(JSON.stringify(F.ICON_ROWS.map((r) => r.role).sort()) === JSON.stringify([...ICON_ROLES].sort()), `the Icon section's rows are the 31 icon roles, page and inverse (${F.ICON_ROWS.length})`);
reset();
ok(prism3.iconContrast === 'text' && F.iconsPaired(), `prism3 loads with icons matching text, so the rows are paired (iconContrast ${JSON.stringify(prism3.iconContrast)})`);
for (const mode of ['light', 'dark']) {
  const wrong = F.ICON_ROWS.filter((r) => F.lockedTo(mode, r) !== twinOf(r.role)).map((r) => `${r.role} → ${F.lockedTo(mode, r)}`);
  ok(wrong.length === 0, `paired, in ${mode}: every icon row is locked and names its text twin ("Follows text.X")${wrong.length ? ` — ${wrong.slice(0, 4).join(', ')}` : ''}`);
}
const nonIcon = ALL_ROWS.filter((r) => !ICON_ROLES.includes(r.role) && F.lockedTo('light', r) !== null).map((r) => r.role);
ok(nonIcon.length === 0, `no other row is ever locked${nonIcon.length ? ` — locked: ${nonIcon.join(', ')}` : ''}`);
// "Follows" is the engine's behavior, not the page's word for it: paired, an override on the text twin moves the icon to it.
const notFollowing: string[] = [];
for (const r of F.ICON_ROWS) {
  reset();
  const textRow = F.TEXT_ROWS.find((x) => x.role === twinOf(r.role)) ?? F.FILL_ROWS.find((x) => x.role === twinOf(r.role));
  if (!textRow) { notFollowing.push(`${r.role}: no row for ${twinOf(r.role)}`); continue; }
  F.setRowOverride('light', textRow, '250');
  const all = allModes();
  const ic = roleIn(all, r.role, 'light'), tx = roleIn(all, textRow.role, 'light');
  if (!ic || !tx || ic.path !== tx.path || !tx.path?.endsWith('.250')) notFollowing.push(`${r.role} at ${ic?.path} while ${textRow.role} is at ${tx?.path}`);
}
ok(notFollowing.length === 0, `paired, an edit on each icon row's text twin moves the icon with it (31 checked)${notFollowing.length ? ` — ${notFollowing.slice(0, 3).join(' | ')}` : ''}`);
// Unpair: the lever's other value, nothing else.
reset();
F.unpairIcons();
ok(JSON.stringify(store.brandState) === JSON.stringify({ ...prism3, iconContrast: '3:1' }), `Unpair writes iconContrast "3:1" and nothing else (iconContrast ${JSON.stringify(store.brandState.iconContrast)})`);
store.rebuild();
// The seven icon roles that keep their text's 4.5:1 floor under "3:1" follow their text under both lever values
// (#1982), so their rows stay locked while unpaired. A literal typed here, never the module's own set.
const FOLLOW_ALWAYS = ['icon.primary', 'inverse.icon.primary', 'icon.on-brand', 'icon.on-success', 'icon.on-warning', 'icon.on-danger', 'icon.on-info'];
const stillLocked = F.ICON_ROWS.filter((r) => !FOLLOW_ALWAYS.includes(r.role) && (F.lockedTo('light', r) !== null || F.lockedTo('dark', r) !== null)).map((r) => r.role);
ok(!F.iconsPaired() && F.ICON_ROWS.length - FOLLOW_ALWAYS.length === 24 && stillLocked.length === 0, `unpaired, every icon row but the seven edits${stillLocked.length ? ` — still locked: ${stillLocked.join(', ')}` : ''}`);
for (const role of FOLLOW_ALWAYS) {
  const r = F.ICON_ROWS.find((x) => x.role === role);
  const twin = role.replace(/(^|\.)icon\./, '$1text.');
  ok(!!r && F.lockedTo('light', r) === twin && F.lockedTo('dark', r) === twin,
    `#1982 unpaired, ${role} stays locked as "Follows ${twin}" in Light and Dark (${r && F.lockedTo('light', r)}, ${r && F.lockedTo('dark', r)})`);
}
F.setRowOverride('light', F.TEXT_ROWS.find((r) => r.role === 'text.primary')!, '250');
{
  const all = allModes(), ic = roleIn(all, 'icon.primary', 'light'), tx = roleIn(all, 'text.primary', 'light');
  ok(!!tx?.path?.endsWith('.250') && ic?.path === tx.path, `#1982 unpaired, a text.primary edit still moves icon.primary (icon ${ic?.path}, text ${tx?.path})`);
}
reset();
F.unpairIcons();
store.rebuild();
const iconBrand = F.ICON_ROWS.find((r) => r.role === 'icon.brand')!;
F.setRowOverride('light', iconBrand, '700');
ok(JSON.stringify(store.brandState.overrides) === JSON.stringify({ light: { 'icon.brand': { palette: 'primary', step: '700' } } }),
  `unpaired, an icon edit writes its own override (${JSON.stringify(store.brandState.overrides)})`);
ok(roleIn(allModes(), 'icon.brand', 'light')?.path === `${ROOT}.core.palette.primary.700`, 'and the engine resolves icon.brand to primary 700');
// An explicit icon override while paired (left from before a re-pair): the engine applies it over the carried text
// (#1968), so that row shows its override, and only in that mode.
reset();
F.setRowOverride('light', iconBrand, '700');
ok(F.lockedTo('light', iconBrand) === null && F.lockedTo('dark', iconBrand) === 'text.brand',
  `paired, an icon row with its own override in Light edits there and stays locked in Dark (${F.lockedTo('light', iconBrand)}, ${F.lockedTo('dark', iconBrand)})`);
F.setRowOverride('light', F.TEXT_ROWS.find((r) => r.role === 'text.brand')!, '300');
ok(roleIn(allModes(), 'icon.brand', 'light')?.path === `${ROOT}.core.palette.primary.700`, 'and the engine keeps the explicit icon override over the carried text one');
// A brand that loads unpaired (aurora, iconContrast "3:1"): only the seven are locked.
const aurora = (exampleBrands as Record<string, BrandInput>).aurora;
reset(aurora);
ok(aurora.iconContrast === '3:1' && !F.iconsPaired() && F.ICON_ROWS.every((r) => FOLLOW_ALWAYS.includes(r.role) ? F.lockedTo('light', r) !== null : F.lockedTo('light', r) === null),
  `aurora loads unpaired (iconContrast ${JSON.stringify(aurora.iconContrast)}): every icon row but the seven edits, and the seven stay locked`);

// Re-pair (owner decision Q52): iconContrast back to "text", and every icon override gone, page and inverse, in
// every mode; every other override kept. The expected brands are literals typed here, never `pairIcons`' own output.
reset();
F.pairIcons();
ok(F.iconOverrideCount() === 0 && JSON.stringify(store.brandState) === JSON.stringify(prism3),
  `re-pair with no icon overrides: iconContrast "text", nothing else written (${JSON.stringify(store.brandState.iconContrast)}, ${JSON.stringify(store.brandState.overrides)})`);
reset();
F.unpairIcons();
const invIconPrimary = F.ICON_ROWS.find((r) => r.role === 'inverse.icon.primary')!;
const iconOnBrand = F.ICON_ROWS.find((r) => r.role === 'icon.on-brand')!;
F.setRowOverride('light', iconBrand, '700');
F.setRowOverride('dark', invIconPrimary, '200');
F.setRowOverride('dark', iconOnBrand, '100');
F.setRowOverride('light', F.TEXT_ROWS.find((r) => r.role === 'text.brand')!, '300');
F.setRowOverride('dark', F.FILL_ROWS.find((r) => r.role === 'foreground.brand')!, '500');
ok(F.iconOverrideCount() === 3, `iconOverrideCount counts the icon overrides in every mode, page and inverse, and nothing else: 3 (read ${F.iconOverrideCount()})`);
F.pairIcons();
const KEPT = { light: { 'text.brand': { palette: 'primary', step: '300' } }, dark: { 'foreground.brand': { palette: 'primary', step: '500' } } };
ok(store.brandState.iconContrast === 'text' && JSON.stringify(store.brandState.overrides) === JSON.stringify(KEPT),
  `re-pair: iconContrast "text", icon.brand (light), inverse.icon.primary and icon.on-brand (dark) cleared, the text and fill overrides kept (iconContrast ${JSON.stringify(store.brandState.iconContrast)}, overrides ${JSON.stringify(store.brandState.overrides)})`);
// Only icon overrides: the emptied modes and the emptied map are pruned, so the brand is byte-identical to the one loaded.
reset();
F.unpairIcons();
F.setRowOverride('light', iconBrand, '700');
F.setRowOverride('dark', invIconPrimary, '200');
F.pairIcons();
ok(JSON.stringify(store.brandState) === JSON.stringify(prism3), `re-pair clearing the only overrides leaves the brand byte-identical to the one loaded (overrides ${JSON.stringify(store.brandState.overrides)})`);
// The confirm's words, APPROVED verbatim (owner decision Q52, 2026-10-02). Literal.
ok(F.PAIR_ICONS_CONFIRM.title === 'Pair icons with text?' && F.PAIR_ICONS_CONFIRM.body(3) === 'This removes 3 custom icon colors. Icons will follow their text color again.'
  && F.PAIR_ICONS_CONFIRM.action === 'Pair icons', `the re-pair confirm's title, body and action are the approved copy (${JSON.stringify([F.PAIR_ICONS_CONFIRM.title, F.PAIR_ICONS_CONFIRM.body(3), F.PAIR_ICONS_CONFIRM.action])})`);
// The singular for one override (owner decision Q60, APPROVED 2026-10-02), the plural for two. Literal.
ok(F.PAIR_ICONS_CONFIRM.body(1) === 'This removes 1 custom icon color. Icons will follow their text color again.',
  `the re-pair confirm's body for 1 override is the approved singular (Q60) — read ${JSON.stringify(F.PAIR_ICONS_CONFIRM.body(1))}`);
ok(F.PAIR_ICONS_CONFIRM.body(2) === 'This removes 2 custom icon colors. Icons will follow their text color again.',
  `the re-pair confirm's body for 2 overrides is the approved plural (Q52) — read ${JSON.stringify(F.PAIR_ICONS_CONFIRM.body(2))}`);
// "subtle", the token's own word, never "muted" (owner decision Q57): every row label, and two by name. Literal.
const mutedLabels = ALL_ROWS.filter((r) => /muted/i.test(r.label)).map((r) => `${r.role} "${r.label}"`);
ok(mutedLabels.length === 0, `no Surfaces & fills row says "muted" (Q57)${mutedLabels.length ? ` — ${mutedLabels.slice(0, 4).join(', ')}` : ''}`);
const labelOf = (role: string): string | undefined => ALL_ROWS.find((r) => r.role === role)?.label;
ok(labelOf('icon.brand-subtle') === 'Brand, subtle' && labelOf('text.brand-subtle') === 'Brand ink, subtle' && labelOf('inverse.icon.danger-subtle') === 'Danger, subtle',
  `the subtle rows say "subtle" (Q57): ${JSON.stringify([labelOf('icon.brand-subtle'), labelOf('text.brand-subtle'), labelOf('inverse.icon.danger-subtle')])}`);

// ── 7. S4d: the Page step picker's choices are the select's (owner decision Q45) ─────────────────────
console.log('\n7. The Page and band step pickers write what the selects wrote');
reset();
const selectValues = ['white', 'black', ...F.neutralStepOptions().map((o) => String(o.value))];
const keys = F.pageSteps().map((s) => s.key);
ok(keys[0] === 'white' && keys[keys.length - 1] === 'black' && keys.length === selectValues.length,
  `the Page picker lists White, every neutral step, then Black: ${keys.length} choices, the select's ${selectValues.length}`);
const viaSelect: string[] = [], viaPicker: string[] = [];
for (const v of selectValues) { reset(); F.setSurfaceBase('light', v); viaSelect.push(JSON.stringify(store.brandState)); }
for (const v of selectValues) {
  reset();
  const key = v === 'white' || v === 'black' ? v : keys.find((k) => k !== 'white' && k !== 'black' && Number(k) === Number(v))!;
  F.setSurfaceBase('light', key);
  viaPicker.push(JSON.stringify(store.brandState));
  ok(F.pageKeyOf(store.brandState.surfaces!.light!.base as string | number) === key, `the Page picker reads ${v} back as its key ${key}`);
}
const differs = selectValues.filter((_, i) => viaSelect[i] !== viaPicker[i]);
ok(differs.length === 0, `every Page choice writes byte for byte what its select option wrote (${selectValues.length}/${selectValues.length})${differs.length ? ` — differs: ${differs.join(', ')}` : ''}`);

console.log(`\n${executed - failed}/${executed} Surfaces & fills write assertions passed.`);
if (failed) process.exit(1);
