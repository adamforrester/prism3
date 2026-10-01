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
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import * as store from './src/state/store';
import * as B from './src/state/brand-input';

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

console.log('\n2. The name (#1196)');
reset();
let identity = 0;
const off = store.subscribe('identity', () => { identity++; });
let brand = 0;
const offB = store.subscribe('brand', () => { brand++; });
B.setName('acme-brand');
ok(store.brandState.id === 'acme-brand' && store.lastGoodInput.id === 'acme-brand', 'the name reaches the working brand and the last-good input');
ok(identity === 1 && brand === 0, `the name tells \`identity\` and never rebuilds (identity ${identity}, brand ${brand})`);
B.setName('   ');
ok(store.brandState.id === 'untitled', `an empty name is "untitled" (${store.brandState.id})`);
off(); offB();

console.log('\n3. The modes (Q3)');
reset();
ok(JSON.stringify(B.modesOn()) === '["light","dark","hc-light","hc-dark"]', `the default theme ships four modes (${B.modesOn()})`);
const plan = B.planModeOff('dark');
ok(JSON.stringify(plan.off) === '["dark","hc-dark"]' && plan.confirm, `turning dark off takes high contrast dark with it, after a confirm (${JSON.stringify(plan)})`);
B.setModeOn('dark', false);
ok(JSON.stringify(store.brandState.modes) === '["light","hc-light"]' && takes(), `dark off leaves light and high contrast light (${store.brandState.modes})`);
ok(B.hcDarkLocked(), 'high contrast dark is locked while dark is off');
B.setModeOn('hc-dark', true);
ok(JSON.stringify(store.brandState.modes) === '["light","hc-light"]', `a locked high contrast dark cannot be turned on (${store.brandState.modes})`);
B.setModeOn('dark', true);
ok(JSON.stringify(store.brandState.modes) === '["light","dark","hc-light"]' && !B.hcDarkLocked(), `dark back on leaves high contrast dark off, and unlocked (${store.brandState.modes})`);
ok(!B.planModeOff('wireframe').confirm, 'a mode with nothing to drop and nothing to take turns off at once');
// A dark override is listed before it goes, and goes with dark.
reset();
(store.brandState as unknown as { modeLevers: Record<string, unknown> }).modeLevers = { dark: { density: 'compact' } };
const withDrop = B.planModeOff('dark');
ok(withDrop.drops.includes('Setting: density = compact'), `turning dark off lists the dark setting it drops (${JSON.stringify(withDrop.drops)})`);
B.setModeOn('dark', false);
ok(store.brandState.modeLevers === undefined && takes(), 'and drops it, so the engine takes the result');

console.log('\n4. Custom modes and personality');
reset();
const name = B.addCustomMode();
ok(name === 'custom-1' && takes(), `a custom mode is added as custom-1, and the engine takes it (${name})`);
ok(!B.renameCustomMode(0, 'dark') && !B.renameCustomMode(0, 'Bad Name'), 'a custom mode cannot take a built-in name or a name that is not a slug');
ok(B.renameCustomMode(0, 'promo') && B.customModes()[0].name === 'promo' && takes(), 'a custom mode renames');
B.removeCustomMode(0);
ok(store.brandState.customModes === undefined, 'removing the last custom mode leaves none');
B.setPersonality('soft', true);
ok(JSON.stringify(B.personality()) === '["soft"]' && takes(), 'a personality word is set, and the engine takes it');
B.setPersonality('soft', false);
ok(B.personality().length === 0 && !('personality' in store.brandState), 'unsetting the last word clears the field');

console.log(`\n${executed - failed}/${executed} brand-input assertions passed.`);
if (failed) process.exit(1);
