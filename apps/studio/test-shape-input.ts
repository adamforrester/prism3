/**
 * The Shape writes (UI redesign S7), in Node, against the real store and the real engine.
 *
 *   npx tsx apps/studio/test-shape-input.ts
 *
 * `src/state/shape-input.ts` holds every edit the legacy Size & radius page made to Density, radius softness, Control
 * shape and the base radius, and the readers the Shape page's controls are drawn from. This holds each write where no
 * DOM is needed, so one can fail here by name before the browser suites run.
 *
 * INDEPENDENT OF WHAT IT CHECKS (docs/34). Every expected write is a JSON literal typed here from the legacy page's
 * own bytes, INCLUDING ITS TRAPS: in Light the default is WRITTEN (`density: 'comfortable'`, `radiusScale: 1`,
 * `controlShape: 'rounded'`, `baseMd: 4`), never unset, as the legacy chips, sliders and selects did; another mode
 * writes `modeLevers[mode].density` / `.radius`, and its Auto unsets and prunes. A cleared edit is held against the
 * brand as it was loaded, serialized, so pruning is checked byte for byte. "Auto follows Light" is held against the
 * ENGINE, not the module: a custom mode based on Dark resolves its heights and radii to the brand's, not Dark's
 * override (scope finding 7), read from `brandTheme`'s own per-mode maps.
 *
 * Mutations this fails by name: per-mode radius written to Light (`setRadiusScale` ignoring `mode`) → `previewing
 * Dark, setRadiusScale writes modeLevers.dark.radius and leaves radiusScale alone …`; Auto reading a custom mode's base
 * (`radiusScaleIn` returning Dark's override for a Dark-based custom mode) → `a custom mode based on Dark follows
 * Light on Auto …`; the Light default unset → `setDensity(light, comfortable) writes density: comfortable …`.
 */
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import * as store from './src/state/store';
import * as S from './src/state/shape-input';

let executed = 0, failed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) { console.log(`  ✓ ${label}`); return; }
  failed++;
  console.error(`  ✗ ${label}`);
};
const brands = exampleBrands as Record<string, BrandInput>;
let loaded = '';
const reset = (b: BrandInput = brands.prism3): void => {
  store.initSession(structuredClone(b), { kind: 'example', id: 'x' });
  loaded = JSON.stringify(store.brandState);
};
const pristine = (): boolean => JSON.stringify(store.brandState) === loaded;
const takes = (): boolean => { try { brandTheme(structuredClone(store.brandState)); return true; } catch { return false; } };
const bs = (): Record<string, unknown> => store.brandState as unknown as Record<string, unknown>;

console.log('\n1. Light writes the brand value, the default included');
reset();
const p3 = brands.prism3 as unknown as Record<string, unknown>;
S.setDensity('light', 'compact');
ok(bs().density === 'compact' && bs().modeLevers === undefined && takes(), `setDensity(light, compact) writes density: compact (${JSON.stringify(bs().density)})`);
S.setDensity('light', 'comfortable');
ok(bs().density === 'comfortable' && 'density' in bs(), `setDensity(light, comfortable) writes density: comfortable, not unset (${JSON.stringify(bs().density)})`);
ok(JSON.stringify(store.brandState) === JSON.stringify({ ...p3, density: 'comfortable' }), 'the bytes are the brand with density: comfortable in its own place');
reset();
S.setRadiusScale('light', 1.5);
ok(bs().radiusScale === 1.5 && bs().modeLevers === undefined && takes(), `setRadiusScale(light, 1.5) writes radiusScale: 1.5 (${JSON.stringify(bs().radiusScale)})`);
S.setRadiusScale('light', 1);
ok(bs().radiusScale === 1, 'setRadiusScale(light, 1) writes radiusScale: 1, not unset');
reset();
S.setControlShape('pill');
ok(bs().controlShape === 'pill' && takes(), 'setControlShape(pill) writes controlShape: pill');
S.setControlShape('rounded');
ok(bs().controlShape === 'rounded', 'setControlShape(rounded) writes controlShape: rounded, not unset');
reset();
S.setBaseMd(7);
ok(bs().baseMd === 7 && takes(), 'setBaseMd(7) writes baseMd: 7');
S.setBaseMd(4);
ok(bs().baseMd === 4, 'setBaseMd(4) writes baseMd: 4, not unset');

console.log('\n2. Another mode writes modeLevers[mode], and Auto prunes it');
reset();
S.setDensity('dark', 'spacious');
ok(JSON.stringify(bs().modeLevers) === JSON.stringify({ dark: { density: 'spacious' } }) && bs().density === p3.density && takes(),
  `previewing Dark, setDensity writes modeLevers.dark.density and leaves density alone (${JSON.stringify(bs().modeLevers)}, density ${JSON.stringify(bs().density)})`);
S.setRadiusScale('dark', 2);
ok(JSON.stringify(bs().modeLevers) === JSON.stringify({ dark: { density: 'spacious', radius: 2 } }) && bs().radiusScale === p3.radiusScale && takes(),
  `previewing Dark, setRadiusScale writes modeLevers.dark.radius and leaves radiusScale alone (${JSON.stringify(bs().modeLevers)}, radiusScale ${JSON.stringify(bs().radiusScale)})`);
ok(JSON.stringify(S.densityIn('dark')) === JSON.stringify({ value: 'spacious', own: true }) && JSON.stringify(S.radiusScaleIn('dark')) === JSON.stringify({ value: 2, own: true }),
  'the readers report Dark\'s own values');
S.setDensity('dark', undefined);
S.setRadiusScale('dark', undefined);
ok(pristine(), 'Return to Auto on both prunes modeLevers: the brand is the one loaded, byte for byte');
// A value equal to Light's is written as a value, as the legacy select wrote it.
S.setRadiusScale('dark', Number(p3.radiusScale ?? 1));
ok(JSON.stringify(bs().modeLevers) === JSON.stringify({ dark: { radius: Number(p3.radiusScale ?? 1) } }), `previewing Dark, Light's own value is written (${JSON.stringify(bs().modeLevers)})`);
S.setRadiusScale('dark', undefined);
// Brand-wide levers write the same bytes from any mode (Q54): the writers take no mode.
S.setControlShape('boxed');
ok(bs().controlShape === 'boxed' && bs().modeLevers === undefined, 'Control shape is brand-wide: no modeLevers written');

console.log('\n3. Auto follows Light, whatever the mode\'s base (the engine\'s rule)');
const custom = { ...structuredClone(brands.prism3), customModes: [{ name: 'night', base: 'dark' }], modeLevers: { dark: { density: 'compact', radius: 2 } } } as unknown as BrandInput;
reset(custom);
const t = brandTheme(structuredClone(store.brandState));
ok(!!t.dims.sizesByMode?.dark && !t.dims.sizesByMode?.night && !!t.dims.radiusByMode?.dark && !t.dims.radiusByMode?.night,
  `the engine: Dark has its own heights and radii, the Dark-based custom mode none (heights ${Object.keys(t.dims.sizesByMode ?? {}).join(', ')}; radii ${Object.keys(t.dims.radiusByMode ?? {}).join(', ')})`);
ok(JSON.stringify(S.densityIn('night')) === JSON.stringify({ value: S.brandDensity(), own: false }) && S.densityIn('night').value === t.dims.density,
  `a custom mode based on Dark follows Light on Auto for density (${JSON.stringify(S.densityIn('night'))}, the engine's ${t.dims.density})`);
ok(JSON.stringify(S.radiusScaleIn('night')) === JSON.stringify({ value: S.brandRadiusScale(), own: false }) && S.radiusScaleIn('night').value === t.dims.radiusScaleValue,
  `a custom mode based on Dark follows Light on Auto for radius softness (${JSON.stringify(S.radiusScaleIn('night'))}, the engine's ${t.dims.radiusScaleValue})`);

console.log('\n4. The retired hairline switch (#2053) has no writer');
reset();
for (const f of [() => S.setDensity('light', 'compact'), () => S.setRadiusScale('dark', 0.5), () => S.setControlShape('hairline'), () => S.setBaseMd(6)]) f();
ok(!('radiusHairline' in bs()) && takes(), 'no Shape write sets radiusHairline, Control shape hairline included');
ok(!Object.keys(S).some((k) => /hairline/i.test(k)), `the module exports no hairline writer (${Object.keys(S).join(', ')})`);

console.log(`\n${executed - failed}/${executed} shape-input assertions passed.`);
if (failed) process.exit(1);
