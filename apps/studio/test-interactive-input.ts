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

console.log(`\n${executed - failed}/${executed} interactive-input assertions passed.`);
if (failed) process.exit(1);
