/**
 * The Depth & motion writes (UI redesign S9.1), in Node, against the real store and the real engine.
 *
 *   npx tsx apps/studio/test-depth-motion-input.ts
 *
 * `src/state/depth-motion-input.ts` holds every edit the legacy Elevation and Motion pages make to the working
 * brand (shadow softness and tint, Light and per mode, with the Auto reset; tempo, Light and per mode; the
 * easing a motion role uses, Light and per mode; Light at a role's default curve unsets, #2051), and the readers their controls are drawn from. This holds each
 * write where no DOM is needed, so one can fail here by name before the browser suites run.
 *
 * INDEPENDENT OF WHAT IT CHECKS (docs/34). Every expected write is a JSON literal typed here, from the legacy
 * pages' own bytes (measured by the S9.1 equivalence driver against `origin/main`), INCLUDING ITS TRAPS: Light's
 * tint is written one key at a time, so a brand with no tint holds a partial `{ hue }`; a mode's slider that
 * lands exactly on the brand value clears the override and prunes the mode. Light's easing select at a role's
 * default curve unsets it (#2051; the defaults restated as literals below). The example brands' authored values are restated as literals (prism3's
 * tint is `{ hue: 266.75, amount: 0.35 }` and it authors no softness; harbor authors no shadow), so a corpus
 * change fails here rather than moving the expectation with it. "The engine takes it" is the engine's own
 * `brandTheme`, and "it resolves to the edit" reads the engine's resolved shadow and motion axes. A cleared edit
 * is held against the brand as it was loaded, serialized, so pruning is checked byte for byte.
 */
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import * as store from './src/state/store';
import * as D from './src/state/depth-motion-input';
import { oklchOf } from './src/state/palette-input';

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
const engine = () => brandTheme(structuredClone(store.brandState));
const pristine = (): boolean => JSON.stringify(store.brandState) === loaded;
const sh = (): string => JSON.stringify(store.brandState.shadow);
const ml = (): string => JSON.stringify(store.brandState.modeLevers);
const mp = (): string => JSON.stringify(store.brandState.motionPersonality);

console.log('\n0. The corpus as this file restates it (a corpus change fails here, not silently below)');
reset('prism3');
ok(sh() === '{"tint":{"hue":266.75,"amount":0.35}}' && mp() === '{"tempo":"standard"}' && store.brandState.modeLevers === undefined,
  `prism3 authors tint {hue 266.75, amount 0.35}, no softness, tempo standard, no modeLevers (${sh()} ${mp()})`);
reset('harbor');
ok(store.brandState.shadow === undefined && mp() === '{"tempo":"relaxed"}', `harbor authors no shadow and tempo relaxed (${sh()} ${mp()})`);

console.log('\n1. Shadow in Light: shadow.softness, and the tint ONE KEY AT A TIME (a partial tint stays partial)');
reset('harbor');
D.setShadowTint('light', 'hue', 200);
ok(sh() === '{"tint":{"hue":200}}' && takes(),
  `setShadowTint(light, hue, 200) leaves the brand byte-identical to legacy (partial tint): shadow is {"tint":{"hue":200}} (${sh()})`);
ok(engine().shadow.tint.hue === 200 && typeof engine().shadow.tint.amount === 'number', 'the engine takes the partial tint: hue 200, amount filled from its default');
D.setShadowTint('light', 'amount', 0.5);
ok(sh() === '{"tint":{"hue":200,"amount":0.5}}' && engine().shadow.tint.amount === 0.5, `then setShadowTint(light, amount, 0.5) adds the second key (${sh()})`);
reset('prism3');
const lightOv = D.setShadowSoftness('light', 1.5);
ok(sh() === '{"tint":{"hue":266.75,"amount":0.35},"softness":1.5}' && store.brandState.modeLevers === undefined && lightOv === false && takes(),
  `setShadowSoftness(light, 1.5) writes shadow.softness, appended after the tint, and no modeLevers (${sh()})`);
ok(engine().shadow.softness === 1.5, 'the engine resolves softness 1.5');
reset('prism3');
D.setShadowSoftness('light', 1);
ok(sh() === '{"tint":{"hue":266.75,"amount":0.35},"softness":1}', `Light writes even the default softness (no clear-on-landing in Light) (${sh()})`);

console.log('\n2. Shadow in a mode: modeLevers[mode].shadow, CLEARED when it lands on the brand value');
reset('prism3');
ok(D.brandShadowValue('softness') === 1 && D.brandShadowValue('tint.hue') === 266.75 && D.brandShadowValue('tint.amount') === 0.35,
  'the brand values a Dark slider is drawn against: softness 1 (the default), hue 266.75, amount 0.35');
ok(D.setShadowSoftness('dark', 2, 1) === true && ml() === '{"dark":{"shadow":{"softness":2}}}' && sh() === '{"tint":{"hue":266.75,"amount":0.35}}' && takes(),
  `setShadowSoftness(dark, 2) writes modeLevers.dark.shadow.softness and not the brand value (${ml()})`);
ok(engine().shadow.shadowByMode?.dark?.softness === 2, 'the engine resolves Dark softness 2');
ok(D.shadowOverride('dark', 'softness') === 2, 'shadowOverride(dark, softness) reads 2');
ok(D.setShadowSoftness('dark', 1, 1) === false && pristine(),
  'setShadowSoftness(dark) landing on the brand value 1 clears the override: byte-identical to the brand as loaded');
reset('prism3');
D.setShadowSoftness('dark', 0.5);
ok(D.setShadowSoftness('dark', 1) === false && pristine(), 'with no brand value passed, it lands against the resolved brand value (1) and clears');
reset('prism3');
D.setShadowTint('dark', 'hue', 120, 266.75);
D.setShadowTint('dark', 'amount', 0.8, 0.35);
ok(ml() === '{"dark":{"shadow":{"tint":{"hue":120,"amount":0.8}}}}' && takes(), `Dark tint hue 120 and amount 0.8 write modeLevers.dark.shadow.tint (${ml()})`);
D.setShadowTint('dark', 'amount', 0.35, 0.35);
ok(ml() === '{"dark":{"shadow":{"tint":{"hue":120}}}}' && takes(), `Dark tint amount landing on 0.35 clears that key and keeps the hue (a partial mode tint) (${ml()})`);
ok(engine().shadow.shadowByMode?.dark?.tint.hue === 120, 'the engine resolves the Dark tint hue 120');
D.setShadowTint('dark', 'hue', 266.75, 266.75);
ok(pristine(), 'and the hue landing on 266.75 prunes the mode and modeLevers: byte-identical to the brand as loaded');
reset('prism3');
D.setShadowSoftness('dark', 2, 1);
D.setShadowTint('dark', 'hue', 10, 266.75);
ok(D.setShadowSoftness('dark', undefined, 1) === false && ml() === '{"dark":{"shadow":{"tint":{"hue":10}}}}',
  `the Auto reset (undefined) clears softness only (${ml()})`);
D.setShadowTint('dark', 'hue', undefined, 266.75);
ok(pristine(), 'and the hue\'s Auto reset leaves the brand as loaded');

console.log('\n3. Tempo: Light writes motionPersonality.tempo, a mode modeLevers[mode].tempo; Auto clears');
reset('prism3');
D.setTempo('light', 'relaxed');
ok(mp() === '{"tempo":"relaxed"}' && store.brandState.modeLevers === undefined && takes() && engine().motion.tempo === 'relaxed',
  `setTempo(light, relaxed) writes motionPersonality.tempo, and the engine runs relaxed (${mp()})`);
ok(D.brandTempo() === 'relaxed', 'brandTempo() reads relaxed');
reset('prism3');
D.setTempo('dark', 'snappy');
ok(ml() === '{"dark":{"tempo":"snappy"}}' && mp() === '{"tempo":"standard"}' && takes(),
  `previewing Dark, a tempo edit writes modeLevers.dark.tempo and not the brand value (${ml()})`);
ok(engine().motion.motionByMode?.dark?.tempo === 'snappy' && engine().motion.tempo === 'standard', 'the engine runs Dark snappy and the brand standard');
ok(D.tempoOverride('dark') === 'snappy', 'tempoOverride(dark) reads snappy');
D.setTempo('dark', undefined);
ok(pristine(), 'setTempo(dark, Auto) prunes the mode and modeLevers: byte-identical to the brand as loaded');
D.setTempo('dark', 'relaxed'); D.setTempo('dark', '');
ok(pristine(), 'setTempo(dark, "") is Auto too');

console.log('\n4. Easing per motion role: Light writes a non-default curve and UNSETS the default (#2051); a mode writes modeLevers, Auto clears');
// The engine's role defaults, restated here as literals so a change to them fails this file by name, not silently.
ok(D.defaultEasing('default') === 'standard' && D.defaultEasing('enter') === 'decelerate' && D.defaultEasing('exit') === 'accelerate' && D.defaultEasing('emphasized') === 'expressive',
  `the engine's role defaults are default → standard, enter → decelerate, exit → accelerate, emphasized → expressive`);
reset('prism3');
D.setEasingRole('light', 'default', 'standard');
ok(pristine() && mp() === '{"tempo":"standard"}' && takes(),
  `setEasingRole(light, default, standard) picks the default and leaves the brand byte-identical to the one loaded (${mp()})`);
reset('prism3');
D.setEasingRole('light', 'enter', 'calm'); D.setEasingRole('light', 'enter', 'decelerate');
ok(pristine() && mp() === '{"tempo":"standard"}',
  `enter → calm, then back to its default decelerate: the key and the emptied easingRoles are removed, byte-identical (${mp()})`);
reset('prism3');
D.setEasingRole('light', 'enter', 'calm'); D.setEasingRole('light', 'exit', 'linear'); D.setEasingRole('light', 'enter', 'decelerate');
ok(mp() === '{"tempo":"standard","easingRoles":{"exit":"linear"}}',
  `with two roles set, returning one to its default removes only that key (${mp()})`);
{ // a brand that never authored motion: picking a default back removes the emptied motionPersonality too
  const bare = structuredClone(brands.prism3) as BrandInput & { motionPersonality?: unknown };
  delete bare.motionPersonality;
  store.initSession(bare, { kind: 'example', id: 'prism3' });
  loaded = JSON.stringify(store.brandState);
  const before = JSON.stringify(engine().motion);
  D.setEasingRole('light', 'emphasized', 'calm'); D.setEasingRole('light', 'emphasized', 'expressive');
  ok(pristine() && store.brandState.motionPersonality === undefined,
    `on a brand with no motionPersonality, emphasized → calm → expressive removes motionPersonality itself: byte-identical (${mp()})`);
  ok(JSON.stringify(engine().motion) === before, 'and the engine resolves the same motion as before the edits (emission unchanged)');
}
reset('prism3');
D.setEasingRole('light', 'enter', 'calm');
ok(mp() === '{"tempo":"standard","easingRoles":{"enter":"calm"}}' && takes(), `setEasingRole(light, enter, calm) writes motionPersonality.easingRoles.enter (${mp()})`);
ok(engine().motion.easingRoles.find((r) => r.role === 'enter')?.curve === 'calm', 'the engine resolves enter → calm');
reset('prism3');
D.setEasingRole('dark', 'emphasized', 'calm');
ok(ml() === '{"dark":{"easings":{"emphasized":"calm"}}}' && mp() === '{"tempo":"standard"}' && takes(),
  `setEasingRole(dark, emphasized, calm) writes modeLevers.dark.easings.emphasized and not the brand value (${ml()})`);
ok(engine().motion.easingRolesByMode?.dark?.emphasized === 'calm', 'the engine resolves Dark emphasized → calm');
ok(D.easingOverride('dark', 'emphasized') === 'calm', 'easingOverride(dark, emphasized) reads calm');
D.setEasingRole('dark', 'emphasized', '');
ok(pristine(), 'setEasingRole(dark, emphasized, Auto) prunes the mode and modeLevers: byte-identical to the brand as loaded');
D.setEasingRole('dark', 'exit', 'linear'); D.setEasingRole('dark', 'exit', undefined);
ok(pristine(), 'setEasingRole(dark, exit, undefined) is Auto too');

console.log('\n2. A pure-gray pin has no hue: the hue slider draws None, never the converter noise (#2184, owner Q58 B)');
// The value the Depth & motion hue slider and every mode's Auto draw from is `brandShadowValue('tint.hue')`, the
// engine's resolved hue. Under a pure-gray pin (r = g = b), picked through the studio's own `oklchOf` (the stored form,
// hue 0 since #2241), it must be null, which the slider renders disabled and reading None.
for (const hexStr of ['#333333', '#808080']) {
  const pin = oklchOf(hexStr);
  store.initSession(structuredClone({ ...brands.harbor, neutral: { ...brands.harbor.neutral, anchor: pin } }), { kind: 'example', id: 'harbor' });
  const v = D.brandShadowValue('tint.hue');
  ok(v === null && typeof D.brandShadowValue('tint.amount') === 'number',
    `${hexStr} pinned (stored hue ${pin.h}, chroma ${pin.c.toExponential(1)}): the hue slider's value is null (shown as None), not ~90°, and the amount still resolves (got hue ${v}, amount ${D.brandShadowValue('tint.amount')})`);
  D.setShadowTint('light', 'hue', 30);
  store.rebuild();   // the app rebuilds through edit(); brandShadowValue reads the resolved theme
  ok(D.brandShadowValue('tint.hue') === 30, `${hexStr} pinned, then a hue of 30 written: the explicit hue wins and the slider reads 30 (got ${D.brandShadowValue('tint.hue')})`);
}

// ANY gray ramp (owner Q73 A): a Custom tint or Follow primary at chroma 0 has no hue for the slider to show either.
for (const [label, auto] of [['Custom tint', false], ['Follow primary', true]] as const) {
  store.initSession(structuredClone({ ...brands.harbor, neutral: { hue: brands.harbor.neutral.hue, chroma: 0, ...(auto ? { auto: true } : {}) } }), { kind: 'example', id: 'harbor' });
  const v = D.brandShadowValue('tint.hue');
  ok(v === null && typeof D.brandShadowValue('tint.amount') === 'number',
    `a gray ${label} (chroma 0): the hue slider's value is null (shown as None), not a hue (got hue ${v}, amount ${D.brandShadowValue('tint.amount')})`);
}

console.log(`\n${executed - failed}/${executed} Depth & motion write assertions passed.`);
if (failed) process.exit(1);
