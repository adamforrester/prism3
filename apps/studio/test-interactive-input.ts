/**
 * Color › Interactive's writes (UI redesign S5.1), in Node, against the real store and the real engine.
 *
 *   npx tsx apps/studio/test-interactive-input.ts
 *
 * `src/state/interactive-input.ts` holds every edit the legacy Interactive page makes to the working brand
 * (the fill anchors and their per-mode pruning, the per-role overrides, the inverse fill's two-ramp source,
 * the link rungs and the link-family pin, the accent columns, the lever writes) and the registry of the
 * page's rows (`INTERACTIVE_ROWS`). This holds each write where no DOM is needed, so one can fail here by name
 * before the browser suites run.
 *
 * INDEPENDENT OF WHAT IT CHECKS (docs/34). Every expected write is a literal typed here: the field a Light
 * anchor lands in, the `modeAnchors` shape, the five link steps a pin writes (worked out by hand from the
 * prism3 brand's derived link walk, which section 4 first confirms from the ENGINE's own resolution, not
 * from the module), the role list a column carries. "The engine takes it" is the engine's own `brandTheme`,
 * and "it resolves to the pick" is the engine's own `resolveAllModes`, never the module's opinion of itself.
 * A cleared edit is held against the brand as it was loaded, serialized, so pruning is checked byte for byte.
 */
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import { resolveAllModes } from '@prism3/engine/modes';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import * as store from './src/state/store';
import * as I from './src/state/interactive-input';
import * as O from './src/state/outline-hover-input';
import * as P from './src/state/palette-input';

let executed = 0, failed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) { console.log(`  ✓ ${label}`); return; }
  failed++;
  console.error(`  ✗ ${label}`);
};
const prism3 = (exampleBrands as Record<string, BrandInput>).prism3;
const PRISTINE = JSON.stringify(prism3);
const reset = (): void => store.initSession(structuredClone(prism3), { kind: 'example', id: 'prism3' });
const takes = (): boolean => { try { brandTheme(structuredClone(store.brandState)); return true; } catch { return false; } };
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
/** The step the ENGINE resolves `role` to in `mode`, from the working brand as it stands. */
const resolvedStep = (role: string, mode: string): string | undefined => {
  const roles = resolveAllModes(brandTheme(structuredClone(store.brandState))).find((m) => m.mode === mode)?.roles as Record<string, { path?: string } | undefined>;
  return roles?.[role]?.path?.split('.').pop();
};
const pristine = (): boolean => JSON.stringify(store.brandState) === PRISTINE;

console.log('\n1. Fill anchors: Light writes the column\'s own field, other modes write modeAnchors (pruned)');
reset();
I.setAnchor('light', 'primary', 700);
ok(store.brandState.actionAnchorStep === 700 && store.brandState.modeAnchors === undefined,
  `setAnchor(light, primary) wrote actionAnchorStep 700 and no modeAnchors (${store.brandState.actionAnchorStep}, ${JSON.stringify(store.brandState.modeAnchors)})`);
ok(takes() && resolvedStep('interactive.primary.fill.rest', 'light') === '700', `the engine resolves Light's primary fill to the anchor 700 (${resolvedStep('interactive.primary.fill.rest', 'light')})`);
ok(I.anchorOf('light', 'primary') === 700, 'anchorOf(light, primary) reads it back');
I.setAnchor('light', 'primary', undefined);
ok(pristine(), 'setAnchor(light, primary, Auto) leaves the brand byte-identical to the one loaded');
I.setAnchor('light', 'destructive', 650);
ok(store.brandState.destructiveAnchorStep === 650 && store.brandState.actionAnchorStep === undefined,
  `setAnchor(light, destructive) wrote destructiveAnchorStep 650 and nothing else (${store.brandState.destructiveAnchorStep})`);
reset();
I.setAnchor('dark', 'primary', 400);
ok(same(store.brandState.modeAnchors, { dark: { primary: 400 } }) && store.brandState.actionAnchorStep === undefined,
  `setAnchor(dark) wrote modeAnchors.dark.primary 400, not the light anchor (${JSON.stringify(store.brandState.modeAnchors)}, actionAnchorStep ${store.brandState.actionAnchorStep})`);
ok(takes() && resolvedStep('interactive.primary.fill.rest', 'dark') === '400', `the engine resolves Dark's primary fill to the anchor 400 (${resolvedStep('interactive.primary.fill.rest', 'dark')})`);
I.setAnchor('dark', 'destructive', 450);
ok(same(store.brandState.modeAnchors, { dark: { primary: 400, destructive: 450 } }), `a second Dark anchor joins the same mode (${JSON.stringify(store.brandState.modeAnchors)})`);
I.setAnchor('dark', 'primary', undefined);
ok(same(store.brandState.modeAnchors, { dark: { destructive: 450 } }), `Auto removes only that column's entry (${JSON.stringify(store.brandState.modeAnchors)})`);
I.setAnchor('dark', 'destructive', undefined);
ok(pristine(), `the last Auto prunes the mode and the map: the brand is byte-identical to the one loaded (modeAnchors ${JSON.stringify(store.brandState.modeAnchors)})`);

console.log('\n2. Accent columns: add, anchor, remove (pruned)');
reset();
I.addAccent('accent');
ok(same(store.brandState.interactivePalettes, [{ palette: 'accent' }]) && takes(), `addAccent(accent) pushed { palette: 'accent' } (${JSON.stringify(store.brandState.interactivePalettes)})`);
I.setAnchor('light', 'accent', 550);
ok(same(store.brandState.interactivePalettes, [{ palette: 'accent', anchorStep: 550 }]), `setAnchor(light, accent) wrote the entry's own anchorStep (${JSON.stringify(store.brandState.interactivePalettes)})`);
I.setAnchor('dark', 'accent', 450);
ok(same(store.brandState.modeAnchors, { dark: { accent: 450 } }), `setAnchor(dark, accent) wrote modeAnchors.dark.accent (${JSON.stringify(store.brandState.modeAnchors)})`);
I.setAnchor('dark', 'accent', undefined);
I.removeAccent(0);
ok(pristine(), `removing the last accent prunes the list: the brand is byte-identical to the one loaded (${JSON.stringify(store.brandState.interactivePalettes)})`);

console.log('\n3. Role overrides and the inverse fill source');
reset();
const row = (role: string): I.InteractiveRow => { const r = I.INTERACTIVE_ROWS.find((x) => x.role === role); if (!r) throw new Error(`no row ${role}`); return r; };
I.writeInteractiveRow('light', row('interactive.primary.text.hover'), '800');
ok(same(store.brandState.overrides, { light: { 'interactive.primary.text.hover': { palette: 'primary', step: '800' } } }),
  `the Text · rest Hover row wrote overrides.light[interactive.primary.text.hover] = primary 800 (${JSON.stringify(store.brandState.overrides)})`);
ok(takes() && resolvedStep('interactive.primary.text.hover', 'light') === '800', `the engine resolves it to 800 (${resolvedStep('interactive.primary.text.hover', 'light')})`);
I.writeInteractiveRow('dark', row('interactive.destructive.border.pressed'), '300');
ok(same(store.brandState.overrides?.dark, { 'interactive.destructive.border.pressed': { palette: 'danger', step: '300' } }),
  `the destructive Border Pressed row wrote danger 300 in Dark (${JSON.stringify(store.brandState.overrides?.dark)})`);
I.writeInteractiveRow('light', row('interactive.neutral.on-fill'), '050');
ok(same(store.brandState.overrides?.light?.['interactive.neutral.on-fill'], { palette: 'neutral', step: '050' }), 'the On-fill text row writes from neutral');
I.writeInteractiveRow('light', row('interactive.neutral.fill.rest'), '200');
ok(same(store.brandState.overrides?.light?.['interactive.neutral.fill.rest'], { palette: 'neutral', step: '200' }) && store.brandState.actionAnchorStep === undefined,
  'Neutral\'s Fill · rest is an override (Neutral has no anchor)');
I.writeInteractiveRow('light', row('interactive.primary.overlay.hover'), '100');
ok(store.brandState.overrides?.light?.['interactive.primary.overlay.hover'] === undefined, 'the Overlay wash row is a read-out and writes nothing');
for (const [m, r] of [['light', 'interactive.primary.text.hover'], ['dark', 'interactive.destructive.border.pressed'], ['light', 'interactive.neutral.on-fill'], ['light', 'interactive.neutral.fill.rest']] as const)
  I.writeInteractiveRow(m, row(r), undefined);
ok(pristine(), 'Auto on each prunes the override map: the brand is byte-identical to the one loaded');
I.writeInteractiveRow('light', row('inverse.interactive.primary.fill.rest'), 'neutral::100');
ok(same(store.brandState.overrides, { light: { 'inverse.interactive.primary.fill.rest': { palette: 'neutral', step: '100' } } }),
  `the inverse fill takes a neutral step through its two-ramp source (${JSON.stringify(store.brandState.overrides)})`);
I.writeInteractiveRow('light', row('inverse.interactive.primary.fill.rest'), 'primary::300');
ok(same(store.brandState.overrides?.light?.['inverse.interactive.primary.fill.rest'], { palette: 'primary', step: '300' }), 'and a step of the column\'s own palette');
I.writeInteractiveRow('light', row('inverse.interactive.primary.fill.rest'), undefined);
ok(pristine(), 'its Auto (crisp white or black) clears it');

console.log('\n3b. #3406: an override row\'s picker offers the palette its override names, and a pick there writes that palette');
{
  // THE FIXTURE is #3391's: a brand color `brand-neutral`, and the primary border overridden to `brand-neutral 350` in
  // Light. Expected palette lists are literals. "A pick there lands" is the engine's own resolved path, never the module.
  const BC = 'brand-neutral', ROLE = 'interactive.primary.border.rest', INV = 'inverse.interactive.primary.fill.rest';
  const pathOf = (role: string, mode: string): string | undefined => {
    try { return (resolveAllModes(brandTheme(structuredClone(store.brandState))).find((m) => m.mode === mode)?.roles as Record<string, { path?: string } | undefined>)?.[role]?.path; } catch { return undefined; }
  };
  reset();
  (store.brandState.brandColors ??= []).push({ name: BC, oklch: { l: 0.62, c: 0.012, h: 240 } });
  store.rebuild();
  ok(row(ROLE).write === 'override' && I.interactivePaletteOf(row(ROLE)) === 'primary', `premise: ${ROLE} is an override row on primary (${row(ROLE).write}, ${I.interactivePaletteOf(row(ROLE))})`);
  ok(same(I.pickerPalettesOf('light', row(ROLE)), ['primary']), `with no override, the picker offers its own ramp only (${JSON.stringify(I.pickerPalettesOf('light', row(ROLE)))})`);
  store.brandState.overrides = { light: { [ROLE]: { palette: BC, step: '350' } } };
  ok(same(I.pickerPalettesOf('light', row(ROLE)), ['primary', 'brand-neutral']),
    `#3406 offer: an override on brand-neutral adds it after the row's own ramp (${JSON.stringify(I.pickerPalettesOf('light', row(ROLE)))})`);
  ok(same(I.pickerPalettesOf('dark', row(ROLE)), ['primary']), 'a mode with no override offers the own ramp only');
  I.writeInteractiveRow('light', row(ROLE), 'brand-neutral::400');
  ok(same(store.brandState.overrides, { light: { [ROLE]: { palette: 'brand-neutral', step: '400' } } }) && pathOf(ROLE, 'light') === 'pds3.core.palette.brand-neutral.400',
    `#3406 move: a pick of brand-neutral 400 writes brand-neutral 400, and the engine resolves it there (${JSON.stringify(store.brandState.overrides)}, ${pathOf(ROLE, 'light')})`);
  I.writeInteractiveRow('light', row(ROLE), '300');
  ok(same(store.brandState.overrides, { light: { [ROLE]: { palette: 'primary', step: '300' } } }) && same(I.pickerPalettesOf('light', row(ROLE)), ['primary']),
    `a bare step still writes the row's own family, and the picker goes back to one palette (${JSON.stringify(store.brandState.overrides)})`);
  store.brandState.overrides = { light: { [ROLE]: { palette: 'gone', step: '350' } } };
  ok(same(I.pickerPalettesOf('light', row(ROLE)), ['primary']), 'a held palette the theme does not build is not offered (it has no steps)');
  store.brandState.overrides = { light: { [INV]: { palette: BC, step: '350' } } };
  ok(same(I.pickerPalettesOf('light', row(INV)), ['primary', 'neutral', 'brand-neutral']),
    `#3406 offer, inverse fill: its two ramps, then brand-neutral (${JSON.stringify(I.pickerPalettesOf('light', row(INV)))})`);
  store.brandState.overrides = { light: { [INV]: { palette: 'neutral', step: '100' } } };
  ok(same(I.pickerPalettesOf('light', row(INV)), ['primary', 'neutral']), 'an inverse fill held on neutral adds nothing: neutral is already offered');
}

console.log('\n4. Links: the rungs and the family pin');
reset();
// The derived walk, from the ENGINE: what the expected pins below are worked out from.
const walk = (prefix: string, mode: string): string => ['default', 'hover', 'pressed', 'visited', 'focused'].map((s) => resolvedStep(`${prefix}.link.${s}`, mode)).join(' ');
ok(walk('text', 'light') === '600 700 800 900 600', `prism3's Light text link walks 600 700 800 900, focused 600 (${walk('text', 'light')})`);
ok(walk('text', 'dark') === '450 350 250 150 450', `prism3's Dark text link walks 450 350 250 150, focused 450 (${walk('text', 'dark')})`);
const pins = (prefix: string, mode: string): string =>
  ['default', 'hover', 'pressed', 'visited', 'focused'].map((s) => { const o = store.brandState.overrides?.[mode]?.[`${prefix}.link.${s}`]; return o ? `${o.palette} ${o.step}` : '-'; }).join(', ');
I.setLinkFamilyOverride('light', 'text', '500');
ok(pins('text', 'light') === 'primary 500, primary 600, primary 700, primary 800, primary 500',
  `setLinkFamilyOverride(light, text, 500) writes all five states at the derived distances: ${pins('text', 'light')}`);
ok(takes(), 'the engine takes the pinned family');
I.setLinkFamilyOverride('light', 'text', '900');
ok(pins('text', 'light') === 'primary 900, primary 950, primary 950, primary 950, primary 900',
  `a pin near the end of the ramp clamps the engaged states to it: ${pins('text', 'light')}`);
I.setLinkFamilyOverride('dark', 'text', '400');
ok(pins('text', 'dark') === 'primary 400, primary 300, primary 200, primary 100, primary 400',
  `the Dark pin walks the other way (signed distances): ${pins('text', 'dark')}`);
I.setLinkFamilyOverride('light', 'text', undefined);
I.setLinkFamilyOverride('dark', 'text', undefined);
ok(pristine(), 'Auto clears all five in each mode: the brand is byte-identical to the one loaded');
I.writeInteractiveRow('light', row('inverse.text.link.default'), '450');
ok(pins('inverse.text', 'light').split(', ').length === 5 && !pins('inverse.text', 'light').includes('-'), `the Text link · inverse row pins its family's five states (${pins('inverse.text', 'light')})`);
I.writeInteractiveRow('light', row('inverse.text.link.default'), undefined);
ok(pristine(), 'and its Auto clears them');
I.setLinkRung('hover', 3);
I.setLinkRung('visited', 1);
ok(same(store.brandState.linkStateRungs, { hover: 3, visited: 1 }), `setLinkRung writes the rung per state (${JSON.stringify(store.brandState.linkStateRungs)})`);
I.setLinkRung('hover', undefined);
I.setLinkRung('visited', undefined);
ok(pristine(), 'Auto on each prunes linkStateRungs');

console.log('\n5. Levers and baselines');
reset();
I.setLever('outlineInteraction', 'solid-tint');
I.setLever('disabledMin', 3.5);
ok(store.brandState.outlineInteraction === 'solid-tint' && store.brandState.disabledMin === 3.5 && takes(), 'setLever writes the lever at its key');
reset();
I.writeInteractiveRow('light', row('interactive.primary.text.hover'), '900');
store.rebuild();
ok(I.baselineStepOf('interactive.primary.text.hover', 'light') !== '900' && I.baselineStepOf('interactive.primary.text.hover', 'light') === (() => { const live = store.brandState; store.initSession(structuredClone(prism3), { kind: 'example', id: 'prism3' }); const s = resolvedStep('interactive.primary.text.hover', 'light'); store.initSession(live, { kind: 'example', id: 'prism3' }); return s; })(),
  'baselineStepOf names the step the role resolves to with its own override cleared, not the override');
reset();
I.setAnchor('light', 'primary', 750);
store.rebuild();
ok(I.baselineAnchorStepOf('interactive.primary.fill.rest', 'light', 'primary') === '600', `baselineAnchorStepOf names the derived anchor (600), not the pin (${I.baselineAnchorStepOf('interactive.primary.fill.rest', 'light', 'primary')})`);

console.log('\n6. The row registry (INTERACTIVE_ROWS)');
const PRIMARY = [
  'interactive.primary.fill.rest', 'interactive.primary.fill.hover', 'interactive.primary.fill.pressed',
  'inverse.interactive.primary.fill.rest', 'inverse.interactive.primary.fill.hover', 'inverse.interactive.primary.fill.pressed',
  'interactive.primary.text.rest', 'interactive.primary.text.hover', 'interactive.primary.text.pressed',
  'inverse.interactive.primary.text.rest', 'inverse.interactive.primary.text.hover', 'inverse.interactive.primary.text.pressed',
  'interactive.primary.border.rest', 'interactive.primary.border.hover', 'interactive.primary.border.pressed',
  'inverse.interactive.primary.border.rest', 'inverse.interactive.primary.border.hover', 'inverse.interactive.primary.border.pressed',
  'interactive.primary.overlay.hover', 'interactive.primary.overlay.pressed',
  'interactive.primary.subtle-fill.hover', 'interactive.primary.subtle-fill.pressed',
  'interactive.primary.on-fill', 'inverse.interactive.primary.on-fill',
];
const got = I.INTERACTIVE_ROWS.filter((r) => r.column === 'primary').map((r) => r.role);
ok(same(got, PRIMARY), `the primary column carries exactly the legacy page's ${PRIMARY.length} roles, in order${same(got, PRIMARY) ? '' : ` — got ${JSON.stringify(got)}`}`);
for (const col of ['neutral', 'destructive']) {
  const want = PRIMARY.map((r) => r.replace('.primary.', `.${col}.`));
  const have = I.INTERACTIVE_ROWS.filter((r) => r.column === col).map((r) => r.role);
  ok(same(have, want), `the ${col} column carries the same ${want.length} roles`);
}
const LINKS = ['text.link.default', 'inverse.text.link.default', 'icon.link.default', 'inverse.icon.link.default'];
ok(same(I.INTERACTIVE_ROWS.filter((r) => r.write === 'link-family').map((r) => r.role), LINKS), 'the four link families, in the Links section\'s order');
ok(I.INTERACTIVE_ROWS.length === 3 * PRIMARY.length + LINKS.length, `${I.INTERACTIVE_ROWS.length} rows in all (${3 * PRIMARY.length + LINKS.length} expected)`);
const kind = (role: string): string | undefined => I.INTERACTIVE_ROWS.find((r) => r.role === role)?.write;
ok(kind('interactive.primary.fill.rest') === 'anchor' && kind('interactive.destructive.fill.rest') === 'anchor' && kind('interactive.neutral.fill.rest') === 'override',
  'Primary and Destructive anchor their fill; Neutral overrides it');
ok(kind('inverse.interactive.neutral.fill.rest') === 'inverse-fill' && kind('interactive.primary.overlay.pressed') === 'readout' && kind('interactive.primary.subtle-fill.hover') === 'readout',
  'the inverse fill takes the two-ramp source; the washes are read-outs');
ok(same(I.interactiveRowsFor('accent', 'accent').map((r) => r.role), PRIMARY.map((r) => r.replace('.primary.', '.accent.'))), 'an accent column carries the same roles');

console.log('\n7. The two writes the legacy page had no control for (S5.2): the link palette\'s Auto, the strict switch');
reset();
I.setLinkPalette('neutral');
ok(store.brandState.linkPalette === 'neutral' && takes(), `setLinkPalette(neutral) writes linkPalette "neutral" (${store.brandState.linkPalette})`);
I.setLinkPalette(undefined);
// Auto UNSETS the key: the persisted brand is the one loaded, byte for byte. Writing the action palette's
// name here would pin links to today's action palette (they would stop following it) and fail this by name.
ok(pristine(), `setLinkPalette(Auto) unsets linkPalette, leaving the brand byte-identical to the one loaded (linkPalette ${JSON.stringify(store.brandState.linkPalette)})`);
store.rebuild();
ok(store.theme.linkPalette === store.theme.roleToPalette.action, `with Auto the engine's link palette follows the action palette (${store.theme.linkPalette} = ${store.theme.roleToPalette.action})`);
reset();
I.setStrictInteractiveContrast(true);
ok(store.brandState.strictInteractiveContrast === true && takes(), 'setStrictInteractiveContrast(on) writes true');
I.setStrictInteractiveContrast(false);
ok(pristine(), `setStrictInteractiveContrast(off) unsets the key, leaving the brand byte-identical to the one loaded (${JSON.stringify(store.brandState.strictInteractiveContrast)})`);

console.log('\n8. #3335: Wash opacity and the per-set Solid fill picks (the owner\'s Q3335.3 A and Q3335.5 A)');
// EXPECTED literals: the engine's own resolution is the oracle for what a write does; the defaults are typed (10/20).
reset();
O.setOutlineWashStep('overlay-neutral', 'hover', 5);
const wash1 = structuredClone(store.brandState.outlineWash);
const alphas = (): (number | undefined)[] => {
  const r = resolveAllModes(brandTheme(structuredClone(store.brandState))).find((m) => m.mode === 'light')!.roles as Record<string, { alpha?: number } | undefined>;
  return ['hover', 'pressed', 'selected'].map((st) => r[`interactive.primary.overlay.${st}`]?.alpha);
};
ok(same(wash1, { hover: 5, pressed: 20 }) && takes() && same(alphas(), [0.05, 0.2, 0.2]), `Wash opacity Hover 5% writes outlineWash { hover: 5, pressed: 20 } and the engine draws the wash at 0.05 / 0.2 / 0.2 (${JSON.stringify(wash1)}, ${JSON.stringify(alphas())})`);
O.setOutlineWashStep('overlay-neutral', 'hover', 30);
ok(same(store.brandState.outlineWash, { hover: 30, pressed: 40 }) && takes(), `a Hover at or past Pressed takes Pressed one step above it (${JSON.stringify(store.brandState.outlineWash)})`);
O.setOutlineWashStep('overlay-neutral', 'hover', 10);
O.setOutlineWashStep('overlay-neutral', 'pressed', 20);
ok(pristine(), `back on 10 / 20 the key is removed, leaving the brand byte-identical to the one loaded (${JSON.stringify(store.brandState.outlineWash)})`);
reset();
O.setOutlineInteraction('opaque-fill');
O.setOutlineHoverSetStep('light', 'destructive', 'hover', 'neutral.100');
const fills = (): Record<string, string | undefined> => {
  const r = resolveAllModes(brandTheme(structuredClone(store.brandState))).find((m) => m.mode === 'light')!.roles as Record<string, { path?: string } | undefined>;
  return Object.fromEntries(['primary', 'neutral', 'destructive'].map((c) => [c, r[`interactive.${c}.hover-fill.hover`]?.path?.split('.').slice(-2).join('.')]));
};
const f1 = fills();
ok(same(store.brandState.outlineHoverFill, { light: { sets: { destructive: { hover: 'neutral.100' } } } }) && takes() && f1.destructive === 'neutral.100' && f1.primary !== 'neutral.100',
  `a set's Hover pick writes outlineHoverFill.light.sets.destructive.hover, and only Destructive's fill takes it (${JSON.stringify(store.brandState.outlineHoverFill)}, ${JSON.stringify(f1)})`);
O.setOutlineHoverSetStep('light', 'destructive', 'pressed', 'neutral.200');
ok(same(store.brandState.outlineHoverFill, { light: { sets: { destructive: { hover: 'neutral.100', pressed: 'neutral.200' } } } }) && takes(), `its Pressed pick joins it (${JSON.stringify(store.brandState.outlineHoverFill)})`);
O.setOutlineHoverSetStep('light', 'destructive', 'hover', undefined);
ok(!('outlineHoverFill' in store.brandState), `Auto on the set's Hover removes its entry, its emptied sets and its emptied mode, so the key goes (${JSON.stringify(store.brandState.outlineHoverFill)})`);

console.log('\n9. #3391: an override is labeled by the palette it names, and removing that palette says so');
{
  // THE FIXTURE: a brand color named like a palette (`brand-neutral`), and an override on the primary border that
  // points at it, as the reference brand's master held after its action palette moved. The ORACLE for "the palette it
  // names" is the engine's own resolution (`resolveAllModes`' path), never the module's helper.
  const ROLE = 'interactive.primary.border.rest', STEP = '350', BC = 'brand-neutral';
  const fixture = (): void => {
    reset();
    (store.brandState.brandColors ??= []).push({ name: BC, oklch: { l: 0.62, c: 0.012, h: 240 } });
    store.rebuild();
    I.writeInteractiveRow('light', row, STEP);   // under the primary family: the row's own write
    store.brandState.overrides!.light![ROLE] = { palette: BC, step: STEP };
  };
  const row = I.INTERACTIVE_ROWS.find((r) => r.role === ROLE)!;
  const resolvedPalette = (role = ROLE): string | undefined => {
    const roles = resolveAllModes(brandTheme(structuredClone(store.brandState))).find((m) => m.mode === 'light')?.roles as Record<string, { path?: string } | undefined>;
    const parts = roles?.[role]?.path?.split('.') ?? [];
    const i = parts.indexOf('palette');
    return i >= 0 ? parts[i + 1] : undefined;
  };
  ok(row?.write === 'override', `premise: ${ROLE} is an override row (${row?.write})`);
  fixture();
  ok(I.interactivePaletteOf(row) !== BC && takes() && resolvedPalette() === BC,
    `premise: the row's own family is ${I.interactivePaletteOf(row)}, and the engine resolves the override to ${resolvedPalette()}`);
  const label = I.overrideLabel(I.overrideHeldOf('light', row));
  ok(label === 'Override · brand-neutral 350', `#3391 label: the override reads by the palette it names, "Override · brand-neutral 350" (got "${label}")`);
  // The case as found: the action palette moved to neutral, and the override still names brand-neutral.
  store.brandState.actionPalette = 'neutral';
  const moved = I.overrideLabel(I.overrideHeldOf('light', row));
  ok(takes() && resolvedPalette() === BC && moved === 'Override · brand-neutral 350',
    `#3391 label: with the action palette on neutral, the label still reads "Override · brand-neutral 350" (got "${moved}", engine ${resolvedPalette()})`);
  ok(I.overrideHeldOf('dark', row) === null && I.overrideLabel(null) === 'Override · ', 'a row with no override in the mode holds nothing');

  // THE WARNING: the remove confirm names the role, and what it says (the brand won't build) is the engine's answer.
  const i = store.brandState.brandColors!.findIndex((b) => b.name === BC);
  const effects = P.removalEffects(BC);
  ok(effects.includes(`1 role is still overridden to it: ${ROLE} — the brand won't build until it's re-picked.`),
    `#3391 warning: removing ${BC} lists the override that still names it (${JSON.stringify(effects)})`);
  store.brandState.overrides!.dark = { 'interactive.primary.text.rest': { palette: BC, step: '700' }, [ROLE]: { palette: BC, step: STEP } };
  const two = P.removalEffects(BC).at(-1);
  ok(two === `2 roles are still overridden to it: ${ROLE}, interactive.primary.text.rest — the brand won't build until each is re-picked.`,
    `#3391 warning: two roles across two modes are counted once each (got "${two}")`);
  ok(!P.removalEffects('primary').some((e) => e.includes('overridden')), 'a palette no override names gets no override line');
  P.removeBrandColor(i);
  // `brandTheme` alone takes it: the refusal comes when the modes resolve, which every build does.
  let refused = '';
  try { resolveAllModes(brandTheme(structuredClone(store.brandState))); } catch (e) { refused = (e as Error).message; }
  ok(refused.includes(`unknown palette '${BC}'`),
    `#3391 warning, what it claims: with ${BC} removed and the overrides left, the engine refuses the brand (${refused || 'it built'})`);

  // The inverse fill's rest row (write 'inverse-fill') reads through the same helper: an override there that names
  // brand-neutral is labeled by it too, by the engine's resolved path again.
  const INV = 'inverse.interactive.primary.fill.rest';
  const inv = I.INTERACTIVE_ROWS.find((r) => r.role === INV)!;
  fixture();
  store.brandState.overrides!.light![INV] = { palette: BC, step: STEP };
  ok(inv?.write === 'inverse-fill' && takes() && resolvedPalette(INV) === BC,
    `premise: ${INV} is an inverse-fill row (${inv?.write}), and the engine resolves its override to ${resolvedPalette(INV)}`);
  const invLabel = I.overrideLabel(I.overrideHeldOf('light', inv));
  ok(invLabel === 'Override · brand-neutral 350', `#3391 label, inverse fill: the override reads by the palette it names, "Override · brand-neutral 350" (got "${invLabel}")`);
}

console.log('\n10. #3405: renaming a brand color carries every override that names it, and the brand still builds');
{
  // THE FIXTURE is the issue's repro: the prism3 brand, a brand color `accent-x`, and the primary border overridden to
  // `accent-x 350` in Light. Dark holds a second override on it and a third that names primary, which must not move.
  // A custom mode, `promo`, holds a fourth, so "custom modes included" is pinned rather than assumed (review of #3455).
  // The ORACLE for "still builds" and "the palette it names" is the engine's own `resolveAllModes`, never the module.
  const ROLE = 'interactive.primary.border.rest', TEXT = 'interactive.primary.text.rest';
  reset();
  (store.brandState.brandColors ??= []).push({ name: 'accent-x', oklch: { l: 0.55, c: 0.15, h: 235 } });
  store.brandState.customModes = [{ name: 'promo', base: 'light' }];
  store.rebuild();
  store.brandState.overrides = {
    light: { [ROLE]: { palette: 'accent-x', step: '350' } },
    dark: { [ROLE]: { palette: 'accent-x', step: '700' }, [TEXT]: { palette: 'primary', step: '700' } },
    promo: { [ROLE]: { palette: 'accent-x', step: '400' } },
  };
  const build = (): string => { try { resolveAllModes(brandTheme(structuredClone(store.brandState))); return 'builds'; } catch (e) { return `REFUSED: ${(e as Error).message}`; } };
  const pathOf = (mode: string, role: string): string | undefined => {
    try { return (resolveAllModes(brandTheme(structuredClone(store.brandState))).find((m) => m.mode === mode)?.roles as Record<string, { path?: string } | undefined>)?.[role]?.path; } catch { return undefined; }
  };
  ok(build() === 'builds', `premise: before the rename, the brand builds (${build()})`);
  ok(pathOf('promo', ROLE)?.includes('.palette.accent-x.') === true, `premise: the custom mode promo resolves ${ROLE} to accent-x (${pathOf('promo', ROLE)})`);
  const i = store.brandState.brandColors!.findIndex((b) => b.name === 'accent-x');
  ok(P.renameBrandColor(i, 'accent-y'), 'the rename is taken');
  ok(same(store.brandState.overrides, {
    light: { [ROLE]: { palette: 'accent-y', step: '350' } },
    dark: { [ROLE]: { palette: 'accent-y', step: '700' }, [TEXT]: { palette: 'primary', step: '700' } },
    promo: { [ROLE]: { palette: 'accent-y', step: '400' } },
  }), `#3405 carry: every override on accent-x, the custom mode's included, now names accent-y at the same step, and the one on primary is untouched (${JSON.stringify(store.brandState.overrides)})`);
  ok(build() === 'builds', `#3405 carry: after the rename, the brand still builds (${build()})`);
  const lp = pathOf('light', ROLE) ?? '', dp = pathOf('dark', ROLE) ?? '';
  ok(lp.includes('.palette.accent-y.') && dp.includes('.palette.accent-y.'),
    `#3405 carry: the engine resolves ${ROLE} to accent-y in Light and Dark (${lp}, ${dp})`);
  const pp = pathOf('promo', ROLE) ?? '';
  ok(pp.includes('.palette.accent-y.'), `#3405 carry, custom mode: the engine resolves ${ROLE} to accent-y in promo (${pp})`);
  ok(!P.renameBrandColor(i, 'primary') && same(store.brandState.overrides!.light, { [ROLE]: { palette: 'accent-y', step: '350' } }),
    'a refused rename (a taken name) moves no override');
}

console.log('\n11. #3448: renaming a brand color carries its interactive column\'s per-mode anchor and role overrides');
{
  // THE FIXTURE is the issue's repro: the prism3 brand, a brand color `accent-x` with an unnamed interactive column on
  // it, its Dark fill anchored at 400, and two overrides keyed by the column's role path (one plain, one inverse, the
  // inverse in the custom mode promo so custom modes are pinned). A second brand color `accent-n` has a column with an
  // explicit `name`, so its keys name the column, not the palette, and must not move.
  // The ORACLE is the engine's own `resolveAllModes`: what each role resolves to after the rename, never the module.
  reset();
  (store.brandState.brandColors ??= []).push({ name: 'accent-x', oklch: { l: 0.55, c: 0.15, h: 235 } }, { name: 'accent-n', oklch: { l: 0.55, c: 0.15, h: 40 } });
  store.brandState.customModes = [{ name: 'promo', base: 'light' }];
  store.brandState.interactivePalettes = [{ palette: 'accent-x' }, { name: 'named', palette: 'accent-n' }];
  store.rebuild();
  const FILL = (c: string): string => `interactive.${c}.fill.rest`, BORDER = (c: string): string => `interactive.${c}.border.rest`;
  const INV = (c: string): string => `inverse.interactive.${c}.text.rest`;
  store.brandState.modeAnchors = { dark: { 'accent-x': 400, named: 300 } };
  store.brandState.overrides = {
    light: { [BORDER('accent-x')]: { palette: 'accent-x', step: '700' }, [BORDER('named')]: { palette: 'accent-n', step: '700' } },
    promo: { [INV('accent-x')]: { palette: 'accent-x', step: '100' } },
  };
  const pathOf = (mode: string, role: string): string => {
    try { return (resolveAllModes(brandTheme(structuredClone(store.brandState))).find((m) => m.mode === mode)?.roles as Record<string, { path?: string } | undefined>)?.[role]?.path ?? 'none'; } catch (e) { return `REFUSED: ${(e as Error).message}`; }
  };
  const before = { fill: pathOf('dark', FILL('accent-x')), border: pathOf('light', BORDER('accent-x')), inv: pathOf('promo', INV('accent-x')) };
  ok(before.fill.endsWith('.palette.accent-x.400') && before.border.endsWith('.palette.accent-x.700') && before.inv.endsWith('.palette.accent-x.100'),
    `premise: before the rename the engine honors the Dark anchor (400), the Light border override (700) and promo's inverse text override (100) (${JSON.stringify(before)})`);
  const i = store.brandState.brandColors!.findIndex((b) => b.name === 'accent-x');
  ok(P.renameBrandColor(i, 'accent-y'), 'the rename is taken');
  const fill = pathOf('dark', FILL('accent-y')), border = pathOf('light', BORDER('accent-y')), inv = pathOf('promo', INV('accent-y'));
  ok(fill.endsWith('.palette.accent-y.400'), `#3448 carry: the column's Dark anchor follows the rename, ${FILL('accent-y')} resolves to accent-y 400 in dark (${fill})`);
  ok(border.endsWith('.palette.accent-y.700'), `#3448 carry: the column's border override follows the rename, ${BORDER('accent-y')} resolves to accent-y 700 in light (${border})`);
  ok(inv.endsWith('.palette.accent-y.100'), `#3448 carry, inverse in a custom mode: ${INV('accent-y')} resolves to accent-y 100 in promo (${inv})`);
  // Compared by key, not by `same`: a moved key is written last, so the map's order changes and its contents do not.
  const da = store.brandState.modeAnchors?.dark as Record<string, number> | undefined;
  ok(da?.['accent-y'] === 400 && da?.named === 300 && Object.keys(da ?? {}).length === 2 && !JSON.stringify(store.brandState.overrides).includes('accent-x'),
    `#3448 carry: no key names the old column (${JSON.stringify(store.brandState.modeAnchors)} ${JSON.stringify(store.brandState.overrides)})`);
  // The named column's keys name the column, not the palette: renaming its palette moves its palette value only.
  const j = store.brandState.brandColors!.findIndex((b) => b.name === 'accent-n');
  ok(P.renameBrandColor(j, 'accent-m'), 'the second rename is taken');
  ok(da?.['accent-y'] === 400 && da?.named === 300 && Object.keys(da ?? {}).length === 2 && same(store.brandState.overrides!.light![BORDER('named')], { palette: 'accent-m', step: '700' }),
    `#3448 named column: its keys stay on its name, only the override's palette value follows (${JSON.stringify(store.brandState.modeAnchors)} ${JSON.stringify(store.brandState.overrides!.light)})`);
  const nfill = pathOf('dark', FILL('named'));
  ok(nfill.endsWith('.palette.accent-m.300'), `#3448 named column: its Dark anchor still holds, ${FILL('named')} resolves to accent-m 300 (${nfill})`);

  // THE OLD NAME WINS (#3545 review). A key already on the new name belongs to no live column (a rename onto a taken
  // name is refused), so it is a leftover, as a removed column leaves behind (#3549). The fixture puts a stale Dark
  // anchor and a stale border override on `accent-z` before `accent-y` is renamed onto it; the live values must win.
  store.brandState.modeAnchors!.dark!['accent-z'] = 300;
  store.brandState.overrides!.light![BORDER('accent-z')] = { palette: 'accent-m', step: '200' };
  store.brandState.overrides!.light![BORDER('accent-y')] = { palette: 'accent-y', step: '700' };
  const k = store.brandState.brandColors!.findIndex((b) => b.name === 'accent-y');
  ok(P.renameBrandColor(k, 'accent-z'), 'the rename onto a name with stale keys is taken');
  const zfill = pathOf('dark', FILL('accent-z')), zborder = pathOf('light', BORDER('accent-z'));
  ok(zfill.endsWith('.palette.accent-z.400'), `#3545 old name wins: a stale Dark anchor on the new name does not beat the live one, ${FILL('accent-z')} resolves to accent-z 400 in dark (${zfill})`);
  ok(zborder.endsWith('.palette.accent-z.700'), `#3545 old name wins: a stale border override on the new name does not beat the live one, ${BORDER('accent-z')} resolves to accent-z 700 in light (${zborder})`);

  // A RENAME ONTO ANOTHER COLUMN'S EXPLICIT NAME IS REFUSED (#3545 re-review). `named` is no palette, so only the
  // column-name check stops it; taken, the drop above would delete `named`'s Dark anchor and border override as leftovers.
  const z = store.brandState.brandColors!.findIndex((b) => b.name === 'accent-z');
  ok(!P.renameBrandColor(z, 'named'), '#3545 a rename onto another interactive column\'s explicit name is refused');
  const rfill = pathOf('dark', FILL('named')), rborder = pathOf('light', BORDER('named'));
  ok(rfill.endsWith('.palette.accent-m.300') && rborder.endsWith('.palette.accent-m.700'),
    `#3545 refused rename onto a column name: \`named\`'s Dark anchor and border override survive, accent-m 300 / 700 (${rfill}, ${rborder})`);

  // A STALE KEY WITH NO LIVE COUNTERPART (#3545 re-review). Above, each stale key had a live one on the old name, and the
  // carry overwrote it whether or not the drop ran. Here the old name has no Light anchor and no text override, so only
  // the drop removes the stale `accent-w` keys: each must resolve to what the column resolves to on Auto.
  const TEXT = (c: string): string => `interactive.${c}.text.rest`;
  const stepOf = (path: string): string => path.split('.').pop() ?? '';
  const autoFill = stepOf(pathOf('light', FILL('accent-z'))), autoText = stepOf(pathOf('light', TEXT('accent-z')));
  const staleFill = autoFill === '200' ? 300 : 200, staleText = autoText === '200' ? '300' : '200';
  (store.brandState.modeAnchors!.light ??= {})['accent-w'] = staleFill;
  store.brandState.overrides!.light![TEXT('accent-w')] = { palette: 'accent-m', step: staleText };
  const w = store.brandState.brandColors!.findIndex((b) => b.name === 'accent-z');
  ok(P.renameBrandColor(w, 'accent-w'), 'the rename onto a name with unmatched stale keys is taken');
  const wfill = pathOf('light', FILL('accent-w')), wtext = pathOf('light', TEXT('accent-w'));
  ok(wfill.endsWith(`.palette.accent-w.${autoFill}`), `#3545 old name wins, no counterpart: a stale Light anchor on the new name is dropped, ${FILL('accent-w')} resolves to Auto (accent-w ${autoFill}) in light (${wfill})`);
  ok(wtext.endsWith(`.palette.accent-w.${autoText}`), `#3545 old name wins, no counterpart: a stale text override on the new name is dropped, ${TEXT('accent-w')} resolves to Auto (accent-w ${autoText}) in light (${wtext})`);

  // A RENAME ONTO A COLUMN NAME ON THE SAME PALETTE IS REFUSED (#3545 third review). `accent-s` carries an unnamed
  // column and a column named `same`. Renaming `accent-s` to `same` would rename the unnamed column onto `same`, and
  // the drop above would delete `same`'s Dark anchor and border override as leftovers. A palette with no unnamed
  // column renames no column, so the same rename there is taken and the named column's keys stay put.
  reset();
  (store.brandState.brandColors ??= []).push({ name: 'accent-s', oklch: { l: 0.55, c: 0.15, h: 235 } }, { name: 'accent-t', oklch: { l: 0.55, c: 0.15, h: 40 } });
  store.brandState.interactivePalettes = [{ palette: 'accent-s' }, { name: 'same', palette: 'accent-s' }, { name: 'solo', palette: 'accent-t' }];
  store.brandState.modeAnchors = { dark: { 'accent-s': 400, same: 300, solo: 300 } };
  store.brandState.overrides = { light: { [BORDER('same')]: { palette: 'accent-s', step: '700' }, [BORDER('solo')]: { palette: 'accent-t', step: '700' } } };
  store.rebuild();
  const sbefore = [pathOf('dark', FILL('same')), pathOf('light', BORDER('same'))];
  ok(sbefore[0].endsWith('.palette.accent-s.300') && sbefore[1].endsWith('.palette.accent-s.700'),
    `premise: the engine takes a palette with an unnamed column and a column named \`same\`, and honors \`same\`'s 300 / 700 (${sbefore.join(', ')})`);
  const s = store.brandState.brandColors!.findIndex((b) => b.name === 'accent-s');
  ok(!P.renameBrandColor(s, 'same'), '#3545 a rename onto a column name on the same palette, which has an unnamed column, is refused');
  const sfill = pathOf('dark', FILL('same')), sborder = pathOf('light', BORDER('same'));
  ok(sfill.endsWith('.palette.accent-s.300') && sborder.endsWith('.palette.accent-s.700'),
    `#3545 refused same-palette rename: \`same\`'s Dark anchor and border override survive, accent-s 300 / 700 (${sfill}, ${sborder})`);
  const t = store.brandState.brandColors!.findIndex((b) => b.name === 'accent-t');
  ok(P.renameBrandColor(t, 'solo'), '#3545 a palette with no unnamed column may take its own column\'s name: no column is renamed');
  const tfill = pathOf('dark', FILL('solo')), tborder = pathOf('light', BORDER('solo'));
  ok(tfill.endsWith('.palette.solo.300') && tborder.endsWith('.palette.solo.700'),
    `#3545 no unnamed column: \`solo\`'s Dark anchor and border override stay on it, solo 300 / 700 (${tfill}, ${tborder})`);
}

console.log('\n12. #3562: a brand color cannot be renamed to a palette the engine always mints');
{
  // THE FIXTURE is the issue's repro: the prism3 brand, a brand color `accent-x`, a Light override on it and a Dark
  // override on the status palette `success`. The ORACLE for "the engine refuses the name" is the engine's own
  // `brandTheme`, run on a copy with the name forced in, never the module; the reserved names are literals typed here.
  const ROLE = 'interactive.primary.border.rest', TEXT = 'interactive.primary.text.rest';
  reset();
  (store.brandState.brandColors ??= []).push({ name: 'accent-x', oklch: { l: 0.55, c: 0.15, h: 235 } });
  store.rebuild();
  store.brandState.overrides = {
    light: { [ROLE]: { palette: 'accent-x', step: '350' } },
    dark: { [TEXT]: { palette: 'success', step: '700' } },
  };
  const was = JSON.stringify(store.brandState);
  const i = store.brandState.brandColors!.findIndex((b) => b.name === 'accent-x');
  for (const name of ['success', 'warning', 'info', 'danger', 'white', 'black', 'transparent', 'black-alpha', 'white-alpha', 'primary', 'neutral']) {
    const forced = structuredClone(store.brandState);
    forced.brandColors![i].name = name;
    let engine = 'builds';
    try { brandTheme(forced); } catch (e) { engine = (e as Error).message; }
    ok(/is reserved/.test(engine), `premise: the engine refuses a brand color named ${name} (${engine.slice(0, 80)})`);
    ok(!P.renameBrandColor(i, name) && JSON.stringify(store.brandState) === was,
      `#3562 reserved: renaming accent-x to ${name} is refused, and nothing moves`);
  }
  // Rename-back: the Dark override was ALWAYS on the status palette, so no rename may move it onto the brand color.
  P.renameBrandColor(i, 'success');
  P.renameBrandColor(i, 'accent-x');
  ok(same(store.brandState.overrides!.dark, { [TEXT]: { palette: 'success', step: '700' } }) && takes(),
    `#3562 rename back: an override on the status palette still names success, and the brand builds (${JSON.stringify(store.brandState.overrides!.dark)})`);
  ok(P.renameBrandColor(i, 'success-2') && same(store.brandState.overrides!.light, { [ROLE]: { palette: 'success-2', step: '350' } }) && takes(),
    '#3562 a name that only starts with a reserved one is taken, and carries its override');
}

console.log(`\n${executed - failed}/${executed} interactive-input assertions passed.`);
if (failed) process.exit(1);
