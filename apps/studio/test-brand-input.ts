/**
 * Brand's writes (UI redesign S3), in Node, against the real store and the real engine.
 *
 *   npx tsx apps/studio/test-brand-input.ts
 *
 * `src/state/brand-input.ts` holds the rules the Brand page edits by: the namespace warning (T2), the name's
 * per-keystroke write without a rebuild (#1196), and the modes (Q3: high contrast dark follows dark). This
 * holds them where no DOM is needed, so a rule can fail here by name before any browser suite runs.
 *
 * INDEPENDENT OF WHAT IT CHECKS (docs/34). The expected warnings are concept v6's words, typed here; the
 * reserved names are the decision's (T2: `prism`, `pds3`); the mode sets are the owner's Q3, typed here; and
 * "the engine takes it" is the engine's own `brandTheme`, never the module's opinion of itself.
 */
import { brandTheme, resolveAllModes, type BrandInput } from '@prism3/engine';
import { EXAMPLE_BRANDS_JSON as exampleBrands } from '@prism3/engine';
import * as store from './src/state/store';
import * as B from './src/state/brand-input';
import { MODE_REFS } from './src/state/name-refs';

let executed = 0, failed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) { console.log(`  ✓ ${label}`); return; }
  failed++;
  console.error(`  ✗ ${label}`);
};
const prism3 = (exampleBrands as Record<string, BrandInput>).prism3;
const reset = (): void => store.initSession(structuredClone(prism3), { kind: 'example', id: 'prism3' });
const takes = (): boolean => { try { brandTheme(structuredClone(store.brandState)); return true; } catch { return false; } };

console.log('\n1. The namespace (T2)');
reset();
ok(B.namespaceNote('pds3').kind === 'warn' && B.namespaceNote('pds3').text === 'pds3 is the default theme’s placeholder. Set your brand’s namespace before you export.',
  `a reserved namespace warns before export: pds3 — ${JSON.stringify(B.namespaceNote('pds3'))}`);
ok(B.namespaceNote('prism').kind === 'warn' && B.namespaceNote('prism').text === 'prism is reserved for the shipped catalog. Set your brand’s namespace before you export.',
  `a reserved namespace warns before export: prism — ${JSON.stringify(B.namespaceNote('prism'))}`);
ok(B.namespaceNote('acme').kind === 'hint', `any other namespace names its paths (${JSON.stringify(B.namespaceNote('acme'))})`);
ok(B.namespaceNote('Acme').kind === 'bad' && B.namespaceNote('2x').kind === 'bad', 'a namespace the engine would refuse says so');
ok(!B.renameNamespace('Acme') && store.brandState.root === 'pds3', 'a refused rename writes nothing');
ok(B.renameNamespace('acme') && store.brandState.root === 'acme' && takes(), 'a rename writes the namespace, and the engine takes it');

console.log('\n2. The name (#1196, #2915)');
reset();
let identity = 0;
const off = store.subscribe('identity', () => { identity++; });
let brand = 0;
const offB = store.subscribe('brand', () => { brand++; });
// #2915: the Brand name field is the display name (`BrandInput.name`, which the library cover shows); the id is the
// export slug and never moves with it. Mutation: `setName` writing `id` again → this check, by name.
B.setName('Acme Brand');
ok(store.brandState.name === 'Acme Brand' && store.lastGoodInput.name === 'Acme Brand' && store.brandState.id === 'prism3' && store.lastGoodInput.id === 'prism3',
  `the Brand name field writes name, not id (name "${store.brandState.name}", id "${store.brandState.id}"; last-good "${store.lastGoodInput.name}", "${store.lastGoodInput.id}")`);
ok(identity === 1 && brand === 0, `the name tells \`identity\` and never rebuilds (identity ${identity}, brand ${brand})`);
ok(B.shownName() === 'Acme Brand', `the field and the bar show the display name (${B.shownName()})`);
B.setName('   ');
ok(store.brandState.name === undefined && !('name' in store.lastGoodInput) && store.brandState.id === 'prism3', `an empty name clears it, and the id stays (${JSON.stringify(store.brandState.name)}, ${store.brandState.id})`);
ok(B.shownName() === 'prism3', `with no display name the field and the bar show the id as written (${B.shownName()})`);
off(); offB();

console.log('\n3. The modes (Q3)');
reset();
ok(JSON.stringify(B.modesOn()) === '["light","dark","hc-light","hc-dark"]', `the default theme ships four modes (${B.modesOn()})`);
const plan = B.planModeOff('dark');
ok(JSON.stringify(plan.off) === '["dark","hc-dark"]' && plan.confirm, `turning dark off takes high contrast dark with it, after a confirm (${JSON.stringify(plan)})`);
ok(B.setModeOff('dark') === null, 'the engine takes dark off');
ok(JSON.stringify(store.brandState.modes) === '["light","hc-light"]' && takes(), `dark off leaves light and high contrast light (${store.brandState.modes})`);
ok(B.hcDarkLocked(), 'high contrast dark is locked while dark is off');
B.setModeOn('hc-dark');
ok(JSON.stringify(store.brandState.modes) === '["light","hc-light"]', `a locked high contrast dark cannot be turned on (${store.brandState.modes})`);
B.setModeOn('dark');
ok(JSON.stringify(store.brandState.modes) === '["light","dark","hc-light"]' && !B.hcDarkLocked(), `dark back on leaves high contrast dark off, and unlocked (${store.brandState.modes})`);
ok(!B.planModeOff('wireframe').confirm, 'a mode with nothing to drop and nothing to take turns off at once');
// A dark override is listed before it goes, and goes with dark.
reset();
(store.brandState as unknown as { modeLevers: Record<string, unknown> }).modeLevers = { dark: { density: 'compact' } };
const withDrop = B.planModeOff('dark');
ok(withDrop.drops.includes('Setting: density = compact'), `turning dark off lists the dark setting it drops (${JSON.stringify(withDrop.drops)})`);
ok(B.setModeOff('dark') === null && store.brandState.modeLevers === undefined && takes(), 'and drops it, so the engine takes the result');

console.log('\n3b. Dark off with a custom mode based on dark (#1946: a custom mode is a snapshot)');
// Before #1946 the engine refused this whole change. A custom mode now carries its own copy of its source's per-mode
// input, so Dark off is taken, dark's own data goes with it, and the custom mode keeps its copy and resolves as before.
reset();
const b0 = store.brandState as unknown as Record<string, unknown>;
b0.customModes = [{ name: 'promo', base: 'dark' }];
b0.modeLevers = { dark: { density: 'compact' }, promo: { density: 'spacious' } };
// A step the engine's own primary ramp carries, read from the resolved theme rather than guessed.
const pstep = store.theme.palettes.find((p) => p.palette === 'primary')!.steps[4];
b0.overrides = { dark: { 'text.link.default': { palette: 'primary', step: pstep.key } }, promo: { 'text.link.default': { palette: 'primary', step: pstep.key } } };
b0.modeAnchors = { dark: { primary: 400 } };
b0.surfaces = { light: { base: 100 }, dark: { base: 950 }, promo: { base: 900 } };
store.rebuild();
ok(store.lastError === null, `the setup resolves (${store.lastError ?? 'no error'})`);
const promoOf = (): string => JSON.stringify(resolveAllModes(brandTheme(structuredClone(store.brandState))).find((r) => r.mode === 'promo')?.roles ?? null);
const promoBefore = promoOf();
const promoInput = JSON.stringify(['overrides', 'modeLevers', 'modeAnchors', 'surfaces'].map((k) => (b0[k] as Record<string, unknown> | undefined)?.promo ?? null));
ok(B.setModeOff('dark') === null, 'turning dark off is taken while a custom mode is based on dark');
const b1 = store.brandState as unknown as Record<string, Record<string, unknown> | undefined>;
ok(JSON.stringify(store.brandState.modes) === '["light","hc-light"]' && ['overrides', 'modeLevers', 'modeAnchors', 'surfaces'].every((k) => !b1[k] || !('dark' in b1[k]!)),
  `dark and its own data are gone (modes ${JSON.stringify(store.brandState.modes)})`);
ok(JSON.stringify(store.brandState.customModes) === '[{"name":"promo","base":"dark"}]'
  && JSON.stringify(['overrides', 'modeLevers', 'modeAnchors', 'surfaces'].map((k) => b1[k]?.promo ?? null)) === promoInput,
  'the custom mode stays, with the record of where it started and its own per-mode input untouched');
store.rebuild();
ok(store.lastError === null && promoOf() === promoBefore, `the custom mode resolves exactly as before dark went (${store.lastError ?? 'same roles'})`);

console.log('\n3c. Adding a custom mode takes a snapshot of light (#1946)');
reset();
const b2 = store.brandState as unknown as Record<string, Record<string, unknown> | undefined>;
const lstep = store.theme.palettes.find((p) => p.palette === 'primary')!.steps[5];
b2.overrides = { light: { 'text.link.default': { palette: 'primary', step: lstep.key } } };
// No modeLevers.light: light's non-color levers are the brand-wide ones, which every mode shares (the engine refuses
// modeLevers.light), so there is nothing per-mode of light's to copy there.
b2.modeAnchors = { light: { primary: 600 } };
b2.surfaces = { light: { base: 50 } };
// outlineHoverFill is read only under opaque-fill, so the pick is live and its loss would show.
store.brandState.outlineInteraction = 'opaque-fill';
b2.outlineHoverFill = { light: { hover: 'neutral.100', sets: { primary: { hover: 'neutral.200' } } } };
store.rebuild();
ok(store.lastError === null, `light carries per-mode input of its own (${store.lastError ?? 'no error'})`);
// The five fields the schema's customModes description promises a snapshot of, typed here (docs/34). Every mode row
// of name-refs joins them, so a sixth row is checked too; and each typed field must be a mode row, so none is
// promised and silently left out of the table that copies it.
const PROMISED = ['overrides', 'modeLevers', 'modeAnchors', 'surfaces', 'outlineHoverFill'];
const rows = MODE_REFS.map((r) => r.field.replace(/\.<mode>$/, ''));
ok(PROMISED.every((k) => rows.includes(k)), `#1946: each promised snapshot field is a mode row of name-refs (rows: ${rows.join(', ')})`);
const SNAPSHOT = [...new Set([...PROMISED, ...rows])];
// modeLevers.light is the one entry light cannot hold (the engine refuses it, above), so it alone may stay unset.
const unset = SNAPSHOT.filter((k) => b2[k]?.light === undefined && k !== 'modeLevers');
ok(unset.length === 0, `#1946: light carries an entry in every snapshot field but modeLevers, so a dropped copy would show (unset: ${unset.join(', ') || 'none'})`);
const lightInput = JSON.stringify(SNAPSHOT.map((k) => b2[k]?.light ?? null));
const added = B.addCustomMode();
const copied = (): string => JSON.stringify(SNAPSHOT.map((k) => b2[k]?.[added] ?? null));
ok(copied() === lightInput, `the new custom mode holds a copy of light's per-mode input (${copied()})`);
ok(JSON.stringify(store.brandState.customModes) === `[{"name":"${added}","base":"light"}]`, 'and keeps the record of the mode it started from');
store.rebuild();
const modeRoles = (m: string): string => JSON.stringify(resolveAllModes(brandTheme(structuredClone(store.brandState))).find((r) => r.mode === m)?.roles ?? null);
const addedBefore = modeRoles(added);
ok(store.lastError === null && addedBefore === modeRoles('light'), 'at creation it resolves exactly as light does');
// Edit light afterward, every per-mode field it has: the copy is deep, so none of it reaches the custom mode.
(b2.overrides!.light as Record<string, unknown>)['text.link.default'] = { palette: 'primary', step: lstep.key === pstep.key ? store.theme.palettes.find((p) => p.palette === 'primary')!.steps[6].key : pstep.key };
(b2.modeAnchors!.light as Record<string, unknown>).primary = 300;
(b2.surfaces!.light as Record<string, unknown>).base = 150;
(b2.outlineHoverFill!.light as Record<string, unknown>).hover = 'neutral.200';
store.rebuild();
ok(store.lastError === null && modeRoles('light') !== addedBefore, `light's edits are real: light moved (${store.lastError ?? 'resolved'})`);
ok(copied() === lightInput && modeRoles(added) === addedBefore, 'a later edit to light leaves the custom mode, and what it resolves to, as they were');

console.log('\n4. Custom modes and personality');
reset();
const name = B.addCustomMode();
ok(name === 'custom-1' && takes(), `a custom mode is added as custom-1, and the engine takes it (${name})`);
ok(!B.renameCustomMode(0, 'dark') && !B.renameCustomMode(0, 'Bad Name'), 'a custom mode cannot take a built-in name or a name that is not a slug');
ok(B.renameCustomMode(0, 'promo') && B.customModes()[0].name === 'promo' && takes(), 'a custom mode renames');
B.removeCustomMode(0);
ok(store.brandState.customModes === undefined, 'removing the last custom mode leaves none');
// D4 (#2487): a removed custom mode takes its per-mode data with it. The removal above is of a mode that never had any,
// so it could not tell. Here custom-1 carries all four per-mode keys, and dark and light keep their own entries in two of them, so
// the removal must take custom-1's entry out of each and leave theirs. The keys and values are typed here; "gone" is
// read off the brand, and "the engine still builds" is the engine's own `brandTheme`.
reset();
B.addCustomMode();
const pm = store.brandState as unknown as Record<string, Record<string, unknown> | undefined>;
const cstep = store.theme.palettes.find((p) => p.palette === 'primary')!.steps[4];
pm.overrides = { 'custom-1': { 'text.link.default': { palette: 'primary', step: cstep.key } } };
pm.modeLevers = { dark: { density: 'compact' }, 'custom-1': { density: 'spacious' } };
pm.modeAnchors = { 'custom-1': { primary: 400 } };
pm.surfaces = { light: { base: 'white' }, 'custom-1': { base: 100 } };
store.rebuild();
ok(store.lastError === null && takes(), `D4: custom-1 with overrides, modeLevers, modeAnchors and surfaces of its own resolves (${store.lastError ?? 'no error'})`);
B.removeCustomMode(0);
const left = ['overrides', 'modeLevers', 'modeAnchors', 'surfaces'].filter((k) => pm[k] && 'custom-1' in pm[k]!);
ok(left.length === 0 && store.brandState.customModes === undefined,
  `D4: removing custom-1 takes its entry out of overrides, modeLevers, modeAnchors and surfaces (still there: ${left.join(', ') || 'none'})`);
ok(pm.overrides === undefined && pm.modeAnchors === undefined
  && JSON.stringify(pm.modeLevers) === '{"dark":{"density":"compact"}}' && JSON.stringify(pm.surfaces) === '{"light":{"base":"white"}}',
  `D4: a key custom-1 emptied is gone, and the other modes' own entries stay (${JSON.stringify({ overrides: pm.overrides, modeLevers: pm.modeLevers, modeAnchors: pm.modeAnchors, surfaces: pm.surfaces })})`);
store.rebuild();
ok(store.lastError === null && takes(), `D4: after the removal the engine still builds the brand (${store.lastError ?? 'no error'})`);
B.setPersonality('soft', true);
ok(JSON.stringify(B.personality()) === '["soft"]' && takes(), 'a personality word is set, and the engine takes it');
B.setPersonality('soft', false);
ok(B.personality().length === 0 && !('personality' in store.brandState), 'unsetting the last word clears the field');

console.log(`\n${executed - failed}/${executed} brand-input assertions passed.`);
if (failed) process.exit(1);
