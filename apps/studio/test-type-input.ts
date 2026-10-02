/**
 * The Type writes (UI redesign S6.1), in Node, against the real store and the real engine.
 *
 *   npx tsx apps/studio/test-type-input.ts
 *
 * `src/state/type-input.ts` holds every edit the legacy Typography page makes to the working brand (faces,
 * the library, weight roles and each category's weights, italics and links, the rung bindings and per-mode
 * swaps, the nudges, cut pins, the heading shape, the ceiling and the title floor, responsive, and every
 * individual size pin with the mobile endpoint and Release), and the readers its controls are drawn from.
 * This holds each write where no DOM is needed, so one can fail here by name before the browser suites run.
 *
 * INDEPENDENT OF WHAT IT CHECKS (docs/34). Every expected write is a JSON literal typed here, from the legacy
 * page's own bytes, INCLUDING ITS TRAPS (an emptied `italics` or `links` list is `[]`, an emptied
 * `italicDefault` is unset, a zero nudge leaves `{}`, `responsive.fluid` is written even when true, a removed
 * last library face leaves `[]`). The readers' expectations are worked out by hand from the ladders
 * (`LINE_HEIGHT_KEYS` has seven rungs, body derives `normal`, the fourth), never from the module. "The engine
 * takes it" is the engine's own `brandTheme`, and "it resolves to the edit" reads the engine's composites. A
 * cleared edit is held against the brand as it was loaded, serialized, so pruning is checked byte for byte.
 */
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import * as store from './src/state/store';
import * as T from './src/state/type-input';
import { knownWeightsOf } from './src/ui/fonts';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const ty = (): string => JSON.stringify(store.brandState.typography);
const pristine = (): boolean => JSON.stringify(store.brandState) === loaded;
/** The prism3 typography input, as loaded, with `patch` merged over it (key order: existing keys keep their
 *  place, new keys are appended, as `setPath` appends them). */
const P3 = (brands.prism3.typography ?? {}) as Record<string, unknown>;
const with3 = (patch: Record<string, unknown>): string => JSON.stringify({ ...P3, ...patch });
const engine = () => brandTheme(structuredClone(store.brandState)).typography;

console.log('\n1. Faces: Light writes typography.families, other modes modeLevers (pruned); Apply to all skips code');
reset();
T.setFamily('light', 'body', 'JetBrains Mono');
ok(ty() === with3({ families: { ...(P3.families as object), body: 'JetBrains Mono' } }) && takes(),
  `setFamily(light, body) wrote typography.families.body only (${JSON.stringify((store.brandState.typography as any).families)})`);
ok(engine().families.find((f) => f.group === 'body')?.stack[0] === 'JetBrains Mono', 'the engine binds body to JetBrains Mono');
reset();
T.setFamily('light', 'body', '');
ok(pristine(), 'setFamily(light, body, "") writes nothing (an empty face is never written)');
T.setFamily('light', 'code', null);
ok((store.brandState.typography as any).families.code === null && takes() && !engine().composites.some((c) => c.group === 'code'),
  'setFamily(light, code, null) writes families.code null, and the engine ships no code styles');
reset();
T.setFamily('dark', 'body', 'JetBrains Mono');
ok(JSON.stringify(store.brandState.modeLevers) === '{"dark":{"families":{"body":"JetBrains Mono"}}}' && ty() === JSON.stringify(P3) && takes(),
  `setFamily(dark, body) wrote modeLevers.dark.families.body and not the brand value (${JSON.stringify(store.brandState.modeLevers)})`);
T.setFamily('dark', 'body', '');
ok(pristine(), 'setFamily(dark, body, Auto) prunes the mode and modeLevers: byte-identical to the brand as loaded');
reset();
T.setAllFamilies('Inter');
ok(JSON.stringify((store.brandState.typography as any).families) === '{"display":"Inter","title":"Inter","body":"Inter","label":"Inter","caption":"Inter","eyebrow":"Inter","code":"JetBrains Mono"}' && takes(),
  `setAllFamilies(Inter) sets the six text categories and leaves code (${JSON.stringify((store.brandState.typography as any).families)})`);
reset();
T.setAllFamilies('');
ok(pristine(), 'setAllFamilies("") writes nothing');

console.log('\n2. The library: add (with its refusals), remove');
reset();
ok(T.addLibraryFace('   ') === 'Give the face a name.' && pristine(), 'addLibraryFace("   ") refuses: "Give the face a name.", nothing written');
ok(T.addLibraryFace('inter') === 'Inter is already here — a category binds it, so it is in the library list already.' && pristine(),
  'addLibraryFace("inter") refuses: a category binds Inter, nothing written');
ok(T.addLibraryFace('  Roboto ') === null && ty() === with3({ typefaceLibrary: ['Roboto'] }) && takes(),
  `addLibraryFace("  Roboto ") stages "Roboto", trimmed (${JSON.stringify((store.brandState.typography as any).typefaceLibrary)})`);
store.rebuild();
ok(T.addLibraryFace('roboto') === 'Roboto is already in the library.', 'addLibraryFace("roboto") refuses once Roboto is staged: "Roboto is already in the library."');
ok(T.inLibrary('ROBOTO') && !T.inLibrary('Inter'), 'inLibrary matches by slug, and a bound-only face is not in the authored library');
T.removeLibraryFace('roboto');
ok(ty() === with3({ typefaceLibrary: [] }), `removeLibraryFace(roboto) leaves typefaceLibrary [] (the legacy bytes, not unset) (${ty()})`);

console.log('\n3. Weights: the role numbers per mode, and each category\'s shipped roles with their locks');
reset();
T.setWeightRole('light', 'strong', 700);
ok(ty() === with3({ weightRoles: { emphasis: 500, strong: 700 } }) && takes() && engine().weightRoles.find((w) => w.role === 'strong')?.value === 700,
  `setWeightRole(light, strong, 700) writes typography.weightRoles.strong and the engine resolves 700 (${JSON.stringify((store.brandState.typography as any).weightRoles)})`);
T.setWeightRole('light', 'strong', 600);
ok(pristine(), 'setWeightRole(light, strong, 600) returns the brand to the bytes it was loaded with');
T.setWeightRole('dark', 'strong', 800);
ok(JSON.stringify(store.brandState.modeLevers) === '{"dark":{"weights":{"strong":800}}}' && takes(), `setWeightRole(dark, strong, 800) writes modeLevers.dark.weights.strong (${JSON.stringify(store.brandState.modeLevers)})`);
T.setWeightRole('dark', 'strong', undefined);
ok(pristine(), 'setWeightRole(dark, strong, reset) prunes back to the brand as loaded');
const ORDER = ['subtle', 'default', 'emphasis', 'strong', 'max'];
T.toggleCategoryWeight('display', 'subtle', ORDER, new Set(['emphasis', 'strong']));
ok(ty() === with3({ weights: { display: ['subtle', 'emphasis', 'strong'], title: ['emphasis', 'strong'] } }) && takes(),
  `toggleCategoryWeight(display, subtle) ticks subtle in role order (${JSON.stringify((store.brandState.typography as any).weights)})`);
T.setCategoryWeights('display', []);
ok(ty() === with3({ weights: { title: ['emphasis', 'strong'] } }), `setCategoryWeights(display, []) UNSETS the category's key (${JSON.stringify((store.brandState.typography as any).weights)})`);
const labelLock = T.categoryWeightLock('label', 'emphasis', new Set(['emphasis']));
ok(!!labelLock && labelLock.startsWith('Label always ships emphasis — ') && labelLock.endsWith('.'),
  `categoryWeightLock(label, emphasis) refuses: label keeps emphasis (${labelLock})`);
ok(T.categoryWeightLock('display', 'strong', new Set(['strong'])) === 'Every category ships at least one weight — tick another before clearing this one.',
  'categoryWeightLock(display, strong) refuses the last shipped weight');
ok(T.categoryWeightLock('display', 'strong', new Set(['emphasis', 'strong'])) === undefined && T.categoryWeightLock('label', 'default', new Set(['emphasis'])) === undefined,
  'categoryWeightLock allows an untick with another weight left, and a tick');

console.log('\n4. Italics and links: the legacy bytes, [] for an emptied list, unset for italic default');
reset();
T.setItalic('body', false, new Set(['body']));
ok(ty() === with3({ italics: [] }) && takes(), `setItalic(body, off) on the last italic category writes italics [] — not unset (${ty()})`);
reset();
T.setItalic('title', true, new Set(['body']));
ok(ty() === with3({ italics: ['title', 'body'] }), `setItalic(title, on) writes the list in category order (${JSON.stringify((store.brandState.typography as any).italics)})`);
reset();
T.setItalicDefault('display', false, new Set(['display', 'title']));
ok(ty() === with3({ italicDefault: ['title'] }) && takes(), `setItalicDefault(display, off) leaves title (${JSON.stringify((store.brandState.typography as any).italicDefault)})`);
T.setItalicDefault('title', false, new Set(['title']));
ok(!('italicDefault' in JSON.parse(ty())) && takes(), `setItalicDefault(title, off) on the last one UNSETS italicDefault (${ty()})`);
reset();
T.setLink('body', true, new Set());
ok(ty() === with3({ links: ['body'] }) && takes() && engine().composites.some((c) => c.group === 'body' && c.link),
  'setLink(body, on) writes links ["body"] and the engine ships body link variants');
T.setLink('body', false, new Set(['body']));
ok(ty() === with3({ links: [] }), `setLink(body, off) on the last one writes links [] — not unset (${ty()})`);
reset();
T.setLink('display', true, new Set());
T.setLink('title', true, new Set());
ok(ty() === with3({ links: ['title'] }), `a second link toggle reads the set the caller drew, not the first toggle's write (#831, the legacy bytes) (${ty()})`);

console.log('\n5. Line height and letter spacing: bindings, per-mode swaps, nudges');
reset();
T.setRungBinding('lineHeights', 'snug', 1.2);
ok(ty() === with3({ lineHeights: { snug: 1.2 } }) && takes() && engine().lineHeights.find((l) => l.key === 'snug')?.value === 1.2,
  `setRungBinding(lineHeights, snug, 1.2) writes typography.lineHeights.snug and the engine binds it (${ty()})`);
reset();
T.setRungBinding('letterSpacings', 'wide', 0.03);
ok(ty() === with3({ letterSpacings: { wide: 0.03 } }) && takes(), `setRungBinding(letterSpacings, wide, 0.03) writes typography.letterSpacings.wide (${ty()})`);
reset();
T.setRepoint('dark', 'lineHeights', 'normal', 'relaxed');
ok(JSON.stringify(store.brandState.modeLevers) === '{"dark":{"lineHeights":{"normal":"relaxed"}}}' && takes(),
  `setRepoint(dark, lineHeights, normal, relaxed) writes modeLevers.dark.lineHeights.normal (${JSON.stringify(store.brandState.modeLevers)})`);
T.setRepoint('dark', 'lineHeights', 'normal', '');
ok(pristine(), 'setRepoint(dark, …, Auto) prunes back to the brand as loaded');
// Body derives `normal` (index 4 of the seven LINE_HEIGHT_KEYS), so it can move 4 down and 2 up; one up is
// `relaxed`. Display spans two bands, `tight` and `snug`, so one up is `snug`–`compact`.
store.rebuild();
ok(JSON.stringify(T.nudgeSteps('body', 'leadingShift')) === '[-4,-3,-2,-1,0,1,2]', `nudgeSteps(body, leading) is -4…+2 (${JSON.stringify(T.nudgeSteps('body', 'leadingShift'))})`);
ok(T.resolvedRungs('body', 'leadingShift', 1) === 'relaxed' && T.resolvedRungs('display', 'leadingShift', 0) === 'tight–snug' && T.resolvedRungs('display', 'leadingShift', 1) === 'snug–compact',
  `resolvedRungs: body +1 = relaxed, display 0 = tight–snug, display +1 = snug–compact (${T.resolvedRungs('body', 'leadingShift', 1)}, ${T.resolvedRungs('display', 'leadingShift', 0)}, ${T.resolvedRungs('display', 'leadingShift', 1)})`);
T.setShift('body', 'leadingShift', 1);
ok(ty() === with3({ leadingShift: { body: 1 } }) && takes(), `setShift(body, leading, +1) writes typography.leadingShift.body 1 (${ty()})`);
ok(engine().composites.filter((c) => c.group === 'body').every((c) => c.lineHeight === 'relaxed'), 'the engine lands every body style on relaxed');
T.setShift('body', 'leadingShift', 0);
ok(ty() === with3({ leadingShift: {} }), `setShift(body, leading, 0) unsets the category, leaving leadingShift {} (the legacy bytes) (${ty()})`);

console.log('\n6. Cut pins: the family fixed to the bound face, a blank style deletes the slot and prunes');
reset();
T.setFacePin('body', 'default', '  Medium Condensed ', 'Inter');
ok(ty() === with3({ faces: { body: { default: { family: 'Inter', style: 'Medium Condensed' } } } }) && takes(),
  `setFacePin(body, default) writes { family: Inter, style: "Medium Condensed" }, trimmed (${ty()})`);
T.setFacePin('body', 'default', '   ', 'Inter');
ok(pristine(), 'setFacePin(body, default, blank) deletes the slot, the category and faces: byte-identical to the brand as loaded');
T.setFacePin('body', 'default', 'Light', undefined);
ok(pristine(), 'setFacePin with no bound family writes nothing');

console.log('\n7. Scale and limits');
reset();
T.setTypeScale('compact');
ok(ty() === with3({ typeScale: 'compact' }) && takes(), `setTypeScale(compact) writes typeScale (${ty()})`);
T.setTypeScale('default');
ok(pristine(), 'setTypeScale(default) UNSETS typeScale: byte-identical to the brand as loaded');
ok(T.shapeBlocked('default', 'default') === false && T.shapeBlocked('compact', 'default') === false, 'shapeBlocked: the current shape never, compact not on the brand as loaded');
T.setTitleFloor(true);
ok(ty() === with3({ titleFloor: 16 }) && takes(), `setTitleFloor(on) writes 16 (${ty()})`);
ok(T.shapeBlocked('compact', 'default') === true, 'shapeBlocked(compact) with the 16px title floor: the engine refuses it, so the card is blocked');
T.setTitleFloor(false);
ok(pristine(), 'setTitleFloor(off) UNSETS titleFloor');
T.setDisplayCeiling('md');
ok(ty() === with3({ displayCeiling: 'md' }) && takes() && JSON.stringify([...new Set(engine().composites.filter((c) => c.group === 'display').map((c) => c.variant))].sort()) === '["md","sm"]',
  'setDisplayCeiling(md) writes "md" and the engine ships display sm and md only');
store.rebuild();
ok(JSON.stringify([...T.ceilingPx('3xl')]) === '[["sm",48],["md",64],["lg",80],["xl",96],["2xl",128],["3xl",160]]', `ceilingPx(3xl) prices every display rung from one trial build (${JSON.stringify([...T.ceilingPx('3xl')])})`);
ok(JSON.stringify(T.rowsOf(store.theme, 'display').map((r) => r.variant)) === '["md","sm"]' && JSON.stringify(T.widestRowsOf()?.get('display')?.map((r) => r.variant)) === '["3xl","2xl","xl","lg","md","sm"]',
  'under the md ceiling the live rows are md, sm, and widestRowsOf still lists all six, largest first');
reset('harbor');
T.setFluid(true);
ok(JSON.stringify(store.brandState.typography) === '{"typeScale":"compact","responsive":{"fluid":true}}', `setFluid(on) on a brand with no responsive input WRITES fluid true (the legacy bytes) (${JSON.stringify(store.brandState.typography)})`);
ok(T.setResponsiveViewport('minViewport', Number('abc')) === false && JSON.stringify(store.brandState.typography) === '{"typeScale":"compact","responsive":{"fluid":true}}', 'setResponsiveViewport(NaN) writes nothing and says so');
ok(T.setResponsiveViewport('minViewport', 360) === true && JSON.stringify(store.brandState.typography) === '{"typeScale":"compact","responsive":{"fluid":true,"minViewport":360}}' && takes(),
  'setResponsiveViewport(minViewport, 360) writes it');
T.setFluid(false);
ok(JSON.stringify(store.brandState.typography) === '{"typeScale":"compact","responsive":{"fluid":false,"minViewport":360}}' && takes(), 'setFluid(off) writes false in place');

console.log('\n8. Individual sizes: brand, per mode, the mobile endpoint, the count, Release');
reset();
store.rebuild();
ok(T.ladderStep(48, 1) === 56 && T.ladderStep(48, -1) === 40 && T.ladderStep(160, 1) === undefined && T.ladderStep(47, 1) === undefined,
  'ladderStep walks the size ladder: 48 → 56 up, 40 down; none past 160 or off the ladder');
T.setSizePin(null, 'display', 'sm', 56);
ok(ty() === with3({ sizes: { display: { sm: 56 } } }) && takes() && engine().composites.find((c) => c.group === 'display' && c.variant === 'sm')?.sizePx === 56,
  `setSizePin(brand, display, sm, 56) writes typography.sizes and the engine sizes display.sm at 56 (${ty()})`);
ok(T.brandSizePin('display', 'sm') === 56 && T.pinnedSizeCount() === 1, 'brandSizePin reads it back; one size pinned');
T.setSizePin('dark', 'display', 'md', 72);
ok(JSON.stringify(store.brandState.modeLevers) === '{"dark":{"typeSizes":{"display":{"md":72}}}}' && takes() && T.modeSizePin('dark', 'display', 'md') === 72,
  `setSizePin(dark, display, md, 72) writes modeLevers.dark.typeSizes (${JSON.stringify(store.brandState.modeLevers)})`);
T.setMobileSize('display', 'sm', 40);
ok(JSON.stringify((store.brandState.typography as any).sizeOverrides) === '{"display":{"sm":{"mobile":40}}}' && takes()
  && engine().composites.find((c) => c.group === 'display' && c.variant === 'sm')?.sizeMinPx === 40 && T.viewportPin('display', 'sm', 'mobile') === 40,
  'setMobileSize(display, sm, 40) writes sizeOverrides.display.sm.mobile and the engine floors display.sm at 40');
ok(T.pinnedSizeCount() === 3, `pinnedSizeCount counts the brand size, the mode size and the mobile pin (${T.pinnedSizeCount()})`);
T.setMobileSize('display', 'sm', undefined);
T.setSizePin('dark', 'display', 'md', undefined);
T.setSizePin(null, 'display', 'sm', undefined);
ok(pristine(), 'clearing each pin prunes every map: byte-identical to the brand as loaded');
T.setSizePin(null, 'display', 'sm', 56);
T.setSizePin('dark', 'display', 'md', 72);
T.setMobileSize('display', 'sm', 40);
T.releasePinnedSizes();
ok(pristine() && T.pinnedSizeCount() === 0, 'releasePinnedSizes drops brand sizes, viewport pins and every mode\'s sizes: byte-identical to the brand as loaded');

console.log('\n9. The known-weights list (#1727 part 2): the default theme\'s faces are known families');
// EXPECTED, literal: Playfair Display ships 400 to 900 (with an italic for each), from its specimen. Then the
// faces the prism3 default theme EMITS, read from the committed emission (never from the studio): each must be
// a family the list knows, so the "Weight roles by face" table flags its weights rather than "? unknown".
const playfair = knownWeightsOf('Playfair Display');
ok(JSON.stringify(playfair) === '[400,500,600,700,800,900]', `knownWeightsOf("Playfair Display") is [400,500,600,700,800,900] (#1727 part 2)${JSON.stringify(playfair) === "[400,500,600,700,800,900]" ? "" : ` — read ${JSON.stringify(playfair)}`}`);
{
  const here = dirname(fileURLToPath(import.meta.url));
  const tree = JSON.parse(readFileSync(join(here, '../../packages/engine/out/prism3.tokens.json'), 'utf8'));
  const faces = Object.values(tree[Object.keys(tree).find((k) => !k.startsWith('$'))!].core.font.typeface as Record<string, { $value: string }>).map((t) => t.$value);
  const unknown = faces.filter((f) => !knownWeightsOf(f));
  ok(faces.length >= 3 && unknown.length === 0, `every face the prism3 default theme emits is a known family (${faces.join(', ')})${unknown.length ? ` — unknown: ${unknown.join(', ')}` : ''}`);
}

console.log(`\n${executed - failed}/${executed} type-input assertions passed.`);
if (failed) process.exit(1);
