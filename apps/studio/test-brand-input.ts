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
import { brandTheme, type BrandInput } from '@prism3/engine';
import { EXAMPLE_BRANDS_JSON as exampleBrands } from '@prism3/engine';
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
/** The default theme without Brand B (#1729), its one custom mode: sections 3b and 4 build their custom modes from
 *  none, so their names and counts are the ones typed below. Section 11 works on the default theme as it ships. */
const withoutBrandB = (b: BrandInput): BrandInput => {
  const { customModes: _c, modePalettes: _p, modeLevers: _l, ...rest } = structuredClone(b);
  return { ...rest, brandColors: (rest.brandColors ?? []).filter((c) => !c.name.startsWith('brand-b-')) };
};
const reset = (): void => store.initSession(withoutBrandB(prism3), { kind: 'example', id: 'prism3' });
const resetShipped = (): void => store.initSession(structuredClone(prism3), { kind: 'example', id: 'prism3' });
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

console.log('\n3b. A refused Dark off loses nothing (orchestrator review of #1939)');
// The exact path: a custom mode based on dark, dark's own data, Dark off confirmed, the engine refuses, then Dark
// on. The brand, and what was saved, must be the original byte for byte. The legacy toggle kept everything on a
// refusal; the first S3 cut dropped dark's data before it asked the engine.
reset();
let saved: string | null = null;
store.setPersist((input) => { saved = JSON.stringify(input); });
const b0 = store.brandState as unknown as Record<string, unknown>;
b0.customModes = [{ name: 'promo', base: 'dark' }];
b0.modeLevers = { dark: { density: 'compact' }, promo: { density: 'spacious' } };
// A step the engine's own primary ramp carries, read from the resolved theme rather than guessed.
const pstep = store.theme.palettes.find((p) => p.palette === 'primary')!.steps[4];
b0.overrides = { dark: { 'text.link.default': { palette: 'primary', step: pstep.key } } };
b0.modeAnchors = { dark: { primary: 400 } };
b0.surfaces = { light: { base: 100 }, dark: { base: 950 } };
store.rebuild();
ok(store.lastError === null && saved !== null, `the setup resolves and is saved (${store.lastError ?? 'no error'})`);
const original = JSON.stringify(store.brandState);
const savedBefore = saved;
ok(JSON.stringify(B.customModesBasedOn('dark')) === '["promo"]', 'the confirm can name the custom mode based on dark');
const refusal = B.setModeOff('dark');
ok(refusal !== null && /promo/.test(refusal), `turning dark off is refused by the engine, naming promo (${refusal})`);
ok(JSON.stringify(store.brandState) === original, 'a refused Dark off leaves the brand byte-identical (dark data, modes and HC dark kept)');
B.setModeOn('dark');
store.rebuild();
ok(JSON.stringify(store.brandState) === original && saved === savedBefore, `then Dark on: the saved brand equals the original (${saved === savedBefore ? 'same' : 'differs'})`);
store.setPersist(null);

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

// #3976 (owner decision Q-PW1 A): the stored order is the pick order, and a word turns its opposite off. The engine
// reads the list first-listed-wins, so the order is what decides a setting two words share; the evidence of that is the
// engine's own note (`brandTheme`'s `notes`), not this module's. premium and bold are NOT opposites and both set the
// neutral fill (bold → strong, premium → subtle), which the prism3 example leaves unset. Bold is picked first, against
// the engine's own word order (premium before bold), so a list stored in that order fails here: bold's fill must stay.
console.log('\n5. Personality: pick order and opposites (#3976)');
const authoredOrder = (): string => JSON.stringify((store.brandState as unknown as { personality?: string[] }).personality ?? null);
reset();
B.setPersonality('bold', true);
B.setPersonality('premium', true);
ok(authoredOrder() === '["bold","premium"]', `#3976 the stored personality is the pick order: bold, then premium (stored ${authoredOrder()})`);
ok(JSON.stringify(B.personality()) === '["bold","premium"]', `#3976 the words on read back in the pick order (${JSON.stringify(B.personality())})`);
const notes = takes() ? brandTheme(structuredClone(store.brandState)).notes : [];
ok(notes.some((n) => n.startsWith("personality 'premium'") && n.includes("neutralEmphasis (already set by 'bold')")),
  `#3976 the engine gives the shared setting to the first word picked: premium keeps bold's neutral fill (${notes.filter((n) => n.startsWith('personality')).join(' | ')})`);
B.setPersonality('calm', true);
B.setPersonality('premium', false);
ok(authoredOrder() === '["bold","calm"]', `#3976 turning a word off keeps the others in their pick order (stored ${authoredOrder()})`);
// The owner's four pairs, typed here, never read from the engine's TRAIT_OPPOSITES: each way round, the second pick
// turns the first off, and a word outside the pair stays on.
for (const [a, b] of [['soft', 'sharp'], ['dense', 'generous'], ['calm', 'energetic'], ['bold', 'restrained']]) {
  for (const [first, second] of [[a, b], [b, a]]) {
    reset();
    B.setPersonality('premium', true);
    B.setPersonality(first, true);
    B.setPersonality(second, true);
    ok(authoredOrder() === JSON.stringify(['premium', second]) && takes(),
      `#3976 picking ${second} turns its opposite ${first} off, and premium stays on (stored ${authoredOrder()})`);
  }
}
ok(B.PERSONALITY_ORDER_LINE.length > 0 && B.PERSONALITY_ORDER_LINE.length <= 90, `#3976 the order line is one line of at most 90 characters (${B.PERSONALITY_ORDER_LINE.length})`);

console.log('\n6. Brand B, the default theme\'s custom mode (#1729)');
// The default theme ships one custom mode, brand-b, with a palette swap and a per-mode font. Renaming it carries both
// per-mode keys to the new name; removing it takes both out, and the engine still builds. Names and keys typed here.
resetShipped();
ok(JSON.stringify(B.customModes()) === '[{"name":"brand-b","base":"light"}]' && takes(), `the default theme ships brand-b, built on light (${JSON.stringify(B.customModes())})`);
ok(B.renameCustomMode(0, 'second') && takes()
  && JSON.stringify(Object.keys(store.brandState.modePalettes ?? {})) === '["second"]' && JSON.stringify(Object.keys(store.brandState.modeLevers ?? {})) === '["second"]',
  `renaming brand-b carries its palette swap and its font to the new name (${JSON.stringify({ modePalettes: store.brandState.modePalettes, modeLevers: Object.keys(store.brandState.modeLevers ?? {}) })})`);
resetShipped();
B.removeCustomMode(0);
ok(store.brandState.customModes === undefined && store.brandState.modePalettes === undefined && store.brandState.modeLevers === undefined && takes(),
  `removing brand-b takes its palette swap and its font with it, and the engine still builds (${JSON.stringify({ modePalettes: store.brandState.modePalettes, modeLevers: store.brandState.modeLevers })})`);

console.log(`\n${executed - failed}/${executed} brand-input assertions passed.`);
if (failed) process.exit(1);
