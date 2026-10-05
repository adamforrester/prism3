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
 * page's own bytes, INCLUDING ITS TRAPS (an emptied `italicDefault` is unset, a zero nudge leaves `{}`, `responsive.fluid` is written even when true, a removed
 * last library face leaves `[]`), and #2006's rule for the two lists it changed: an emptied `italics` is unset,
 * an emptied `links` is `[]` (none), and a `links` list back at the engine's default is unset. That default is
 * typed here as a literal (body and caption), never imported from the engine. The readers' expectations are worked out by hand from the ladders
 * (`LINE_HEIGHT_KEYS` has seven rungs, body derives `normal`, the fourth), never from the module. "The engine
 * takes it" is the engine's own `brandTheme`, and "it resolves to the edit" reads the engine's composites. A
 * cleared edit is held against the brand as it was loaded, serialized, so pruning is checked byte for byte.
 */
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import * as store from './src/state/store';
import * as T from './src/state/type-input';
import { knownWeightsOf } from './src/ui/fonts';
import { typeSamplePicks, TYPE_SAMPLE_DISPLAY } from './src/preview/sections/type-sample';
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
ok(T.addLibraryFace('   ') === 'Give the font family a name.' && pristine(), 'addLibraryFace("   ") refuses: "Give the font family a name.", nothing written');
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
ok(T.categoryWeightLock('display', 'strong', new Set(['strong'])) === 'Every text type ships at least one weight. Tick another before clearing this one.',
  'categoryWeightLock(display, strong) refuses the last shipped weight');
ok(T.categoryWeightLock('display', 'strong', new Set(['emphasis', 'strong'])) === undefined && T.categoryWeightLock('label', 'default', new Set(['emphasis'])) === undefined,
  'categoryWeightLock allows an untick with another weight left, and a tick');

console.log('\n4. Italics and links: an emptied italics or italic default is unset; links [] is none, links at the default is unset (#2006)');
reset();
T.setItalic('body', false, new Set(['body']));
ok(ty() === with3({ italics: undefined }) && !('italics' in JSON.parse(ty())) && takes(), `setItalic(body, off) on the last italic category UNSETS italics (#2006) (${ty()})`);
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
ok(ty() === with3({ links: [] }), `setLink(body, off) on the last one writes links [] — none, not unset (${ty()})`);
reset();
T.setLink('display', true, new Set());
T.setLink('title', true, new Set());
ok(ty() === with3({ links: ['title'] }), `a second link toggle reads the set the caller drew, not the first toggle's write (#831, the legacy bytes) (${ty()})`);

// S6.3: the italic chips (owner decision Q6) compose the two legacy writes. prism3 loads with italics ["body"] and
// italicDefault ["display","title"], so each chip's write is a literal worked out from those two lists.
{
  const sets = (): [Set<string>, Set<string>] => {
    const t = engine();
    return [new Set(t.composites.filter((c) => c.italic).map((c) => c.group)), new Set(t.composites.filter((c) => c.italicDefault).map((c) => c.group))];
  };
  reset();
  ok(T.italicStyleOf('body', ...sets()) === 'both' && T.italicStyleOf('display', ...sets()) === 'only' && T.italicStyleOf('caption', ...sets()) === 'upright',
    'italicStyleOf reads prism3 as loaded: body Upright + italic, display Italic only, caption Upright');
  T.setItalicStyle('caption', 'upright', ...sets());
  ok(pristine(), 'setItalicStyle(caption, upright) on an upright text type writes nothing');
  T.setItalicStyle('caption', 'both', ...sets());
  ok(ty() === with3({ italics: ['body', 'caption'] }) && takes(), `setItalicStyle(caption, both) writes italics ["body","caption"] in text-type order (${ty()})`);
  reset();
  T.setItalicStyle('body', 'only', ...sets());
  ok(ty() === with3({ italicDefault: ['display', 'title', 'body'], italics: undefined }) && !('italics' in JSON.parse(ty())) && takes(),
    `setItalicStyle(body, only) clears body's italic first (italics UNSET, #2006), then makes it italic only (${ty()})`);
  T.setItalicStyle('body', 'both', ...sets());
  ok(ty() === with3({ italicDefault: ['display', 'title'], italics: ['body'] }) && takes(),
    `setItalicStyle(body, both) from Italic only puts body back in italics and out of italicDefault (${ty()})`);
  reset();
  T.setItalicStyle('display', 'upright', ...sets());
  ok(ty() === with3({ italicDefault: ['title'] }) && takes() && engine().composites.filter((c) => c.group === 'display').every((c) => !c.italic && !c.italicDefault),
    `setItalicStyle(display, upright) takes display out of italicDefault, and the engine ships display upright (${ty()})`);
}

// #2006: a tick then an untick leaves the brand byte-identical to the one loaded. Each arm compares against a
// deep clone taken before the first edit. aurora sets neither `italics` nor `links`, so the engine's defaults
// apply: no italics, and links on body and caption.
{
  const LINK_DEFAULT = ['body', 'caption'];   // the engine's default link categories, typed here (docs/34)
  const linkSet = (): Set<string> => new Set(engine().composites.filter((c) => c.link).map((c) => c.group));
  const italicSets = (): [Set<string>, Set<string>] => {
    const t = engine();
    return [new Set(t.composites.filter((c) => c.italic).map((c) => c.group)), new Set(t.composites.filter((c) => c.italicDefault).map((c) => c.group))];
  };
  reset('aurora');
  let before = JSON.stringify(structuredClone(store.brandState));
  T.setItalic('caption', true, new Set());
  ok(JSON.stringify((store.brandState.typography as any).italics) === '["caption"]', `setItalic(caption, on) on aurora writes italics ["caption"] (${ty()})`);
  T.setItalic('caption', false, new Set(['caption']));
  ok(JSON.stringify(store.brandState) === before, `italics tick then untick leaves aurora byte-identical to the brand as loaded (${ty()})`);

  reset('aurora');
  before = JSON.stringify(structuredClone(store.brandState));
  T.setItalicStyle('caption', 'both', ...italicSets());
  ok(JSON.stringify((store.brandState.typography as any).italics) === '["caption"]', `setItalicStyle(caption, both) on aurora writes italics ["caption"] (${ty()})`);
  T.setItalicStyle('caption', 'upright', ...italicSets());
  ok(JSON.stringify(store.brandState) === before, `the italic chips Upright + italic then Upright leave aurora byte-identical to the brand as loaded (${ty()})`);

  reset('aurora');
  before = JSON.stringify(structuredClone(store.brandState));
  ok(JSON.stringify([...linkSet()].sort()) === JSON.stringify(LINK_DEFAULT), `aurora as loaded ships links on body and caption, the default (${[...linkSet()]})`);
  T.setLink('title', true, linkSet());
  ok(JSON.stringify((store.brandState.typography as any).links) === '["title","body","caption"]' && takes(),
    `setLink(title, on) on a default brand writes links ["title","body","caption"] (${ty()})`);
  T.setLink('title', false, linkSet());
  ok(JSON.stringify(store.brandState) === before, `links tick a third category then untick it leaves aurora byte-identical to the brand as loaded (${ty()})`);

  reset('aurora');
  T.setLink('body', false, linkSet());
  ok(JSON.stringify((store.brandState.typography as any).links) === '["caption"]', `setLink(body, off) on a default brand writes links ["caption"] (${ty()})`);
  T.setLink('caption', false, linkSet());
  ok(JSON.stringify((store.brandState.typography as any).links) === '[]' && takes() && linkSet().size === 0,
    `unticking every link writes links [] and the engine emits zero link composites — no underlined links (${ty()})`);
}

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
// S6.3: the caption and size floors, no surface's before: the default UNSETS the key.
T.setCaptionFloor(10);
ok(ty() === with3({ captionFloor: 10 }) && takes() && engine().composites.some((c) => c.path.startsWith('caption.sm.')),
  `setCaptionFloor(10) writes 10 and the engine adds caption.sm (${ty()})`);
T.setCaptionFloor(11);
ok(pristine(), 'setCaptionFloor(11) leaves the brand byte-identical (11 is the default: the key is unset)');
T.setSizeFloor(8);
ok(ty() === with3({ sizeFloor: 8 }) && takes() && engine().composites.some((c) => c.path.startsWith('caption.xs.')) && engine().sizesPx[0] === 8,
  `setSizeFloor(8) writes 8, and the engine adds caption.xs and an 8px step (${ty()})`);
T.setSizeFloor(10);
ok(pristine(), 'setSizeFloor(10) leaves the brand byte-identical (10 is the default: the key is unset)');
T.setDisplayCeiling('md');
ok(ty() === with3({ displayCeiling: 'md' }) && takes() && JSON.stringify([...new Set(engine().composites.filter((c) => c.group === 'display').map((c) => c.variant))].sort()) === '["md","sm"]',
  'setDisplayCeiling(md) writes "md" and the engine ships display sm and md only');
store.rebuild();
ok(JSON.stringify([...T.ceilingPx('3xl')]) === '[["sm",48],["md",64],["lg",80],["xl",96],["2xl",128],["3xl",160]]', `ceilingPx(3xl) prices every display rung from one trial build (${JSON.stringify([...T.ceilingPx('3xl')])})`);
ok(JSON.stringify(T.rowsOf(store.theme, 'display').map((r) => r.variant)) === '["md","sm"]' && JSON.stringify(T.widestRowsOf()?.get('display')?.map((r) => r.variant)) === '["3xl","2xl","xl","lg","md","sm"]',
  'under the md ceiling the live rows are md, sm, and widestRowsOf still lists all six, largest first');
// #2044: a ceiling below a display size set individually is refused, so the select disables it. EXPECTED from the
// pins and the ceiling order typed here, never from the module: the refused ceilings are every rung strictly below
// the largest pinned one. The engine is the second witness: each refused ceiling throws, each other one builds.
{
  const ORDER = ['sm', 'md', 'lg', 'xl', '2xl', '3xl'];
  const below = (pinned: string): string[] => ORDER.slice(0, ORDER.indexOf(pinned));
  const builds = (c: string): boolean => { try { brandTheme({ ...structuredClone(store.brandState), typography: { ...structuredClone(store.brandState.typography), displayCeiling: c as never } }); return true; } catch { return false; } };
  const check = (what: string, pinned: string | null): void => {
    const want = pinned ? below(pinned) : [];
    const got = T.ceilingBlocked();
    ok(JSON.stringify([...got.keys()]) === JSON.stringify(want) && [...got.values()].every((v) => v === pinned),
      `ceilingBlocked, ${what}: refuses ${JSON.stringify(want)}, each naming ${pinned} (${JSON.stringify([...got])})`);
    ok(ORDER.every((c) => builds(c) === !want.includes(c)), `ceilingBlocked, ${what}: the engine refuses exactly those ceilings and builds the rest`);
  };
  reset();
  check('no size set', null);
  T.setSizePin(null, 'display', 'md', 72);
  check('display md set on desktop', 'md');
  reset();
  T.setMobileSize('display', 'md', 40);
  check('display md set on mobile', 'md');
  reset();
  T.setSizePin('dark', 'display', 'md', 72);
  check('display md set in Dark only', 'md');
  T.setSizePin(null, 'display', 'lg', 80);
  check('display md (Dark) and lg (desktop) set: the largest names the reason', 'lg');
  reset();
  T.setSizePin(null, 'display', 'sm', 40);
  check('display sm set: nothing is below it', null);
  reset();
}
// #2054: the 18px title floor is refused while title 2xs is set individually, so its chip is disabled. EXPECTED from
// the pins typed here, never from the module: blocked exactly when one of them is on title 2xs. The engine is the
// second witness: on 18px each blocked case throws and each other one builds, and on 16px every case builds.
{
  const at18 = (): boolean => { try { brandTheme({ ...structuredClone(store.brandState), typography: { ...structuredClone(store.brandState.typography), titleFloor: undefined } }); return true; } catch { return false; } };
  const check = (what: string, want: boolean): void => {
    ok(T.titleFloorBlocked() === want, `titleFloorBlocked, ${what}: ${want ? 'refuses' : 'offers'} 18px (got ${T.titleFloorBlocked()})`);
    ok(takes() && at18() === !want, `titleFloorBlocked, ${what}: the engine takes 16px and ${want ? 'refuses' : 'builds'} 18px`);
  };
  const on16 = (): void => { reset(); T.setTitleFloor(true); store.rebuild(); };
  on16();
  check('nothing set', false);
  T.setSizePin(null, 'title', 'xl', 36);
  check('title xl set, not 2xs', false);
  on16();
  T.setSizePin(null, 'title', '2xs', 16);
  check('title 2xs set on desktop', true);
  on16();
  T.setMobileSize('title', '2xs', 16);
  check('title 2xs set on mobile', true);
  on16();
  T.setSizePin('dark', 'title', '2xs', 16);
  check('title 2xs set in Dark only', true);
  reset();
}
// #2055: turning off fluid headings is refused while a mobile size is set individually, so the switch is
// disabled. EXPECTED from the pins typed here, in the group order typed here (display, title, eyebrow), never from
// the module. The engine is the second witness: off throws exactly when the list is not empty.
{
  const offBuilds = (): boolean => { try { brandTheme({ ...structuredClone(store.brandState), typography: { ...structuredClone(store.brandState.typography), responsive: { ...structuredClone(store.brandState.typography?.responsive), fluid: false } } }); return true; } catch { return false; } };
  const minOf = (g: string, v: string): number => store.theme.typography.composites.find((c) => c.group === g && c.variant === v)!.sizeMinPx;
  const check = (what: string, want: string[]): void => {
    const got = T.fluidBlocked();
    ok(JSON.stringify(got) === JSON.stringify(want), `fluidBlocked, ${what}: ${JSON.stringify(want)} (got ${JSON.stringify(got)})`);
    ok(takes() && offBuilds() === (want.length === 0), `fluidBlocked, ${what}: the engine ${want.length ? 'refuses' : 'builds'} fluid off`);
  };
  reset();
  check('nothing set', []);
  T.setSizePin(null, 'display', 'md', 72);
  check('display md set on desktop only', []);
  reset();
  store.setPath(store.brandState, 'typography.sizeOverrides.display.md.desktop', 72);
  check('a desktop endpoint, no mobile one', []);
  reset();
  T.setMobileSize('display', 'md', minOf('display', 'md'));
  check('display md set on mobile', ['display md']);
  T.setMobileSize('title', 'sm', minOf('title', 'sm'));
  check('display md and title sm set on mobile', ['display md', 'title sm']);
  reset();
  T.setMobileSize('title', 'sm', minOf('title', 'sm'));
  T.setMobileSize('display', 'md', minOf('display', 'md'));
  check('title sm set before display md: group order, not the order set', ['display md', 'title sm']);
  reset();
}
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

console.log('\n10. The type sample\'s display line (#1942, owner decisions Q67, Q76): display.md.strong, else the largest display style');
// No corpus brand lacks `display.md.strong`, so the fallback is fed here: the prism3 typography with every
// `display.md.*` style taken out, which leaves sm, lg, xl, 2xl and 3xl. EXPECTED is worked out by hand from the
// default theme's display ramp: 3xl is 160px, the largest, and `display.3xl.emphasis` is its first style at that
// size. Then the same check against the largest size the remaining styles carry, read off them here.
{
  reset();
  const full = engine();
  ok(TYPE_SAMPLE_DISPLAY === 'display.md.strong' && typeSamplePicks(full)[0]?.path === 'display.md.strong',
    `with display.md.strong emitted, the sample opens with it (drew ${typeSamplePicks(full)[0]?.path})`);
  const noMd = { ...full, composites: full.composites.filter((c) => !c.path.startsWith('display.md.')) };
  const displays = noMd.composites.filter((c) => c.group === 'display' && !c.italic && !c.link);
  const sizes = [...new Set(displays.map((c) => c.sizePx))];
  const pick = typeSamplePicks(noMd)[0];
  ok(sizes.length >= 4, `the fixture keeps several display sizes once display.md is gone (${sizes.join(', ')}px)`);
  ok(pick?.path === 'display.3xl.emphasis' && pick.sizePx === 160 && pick.sizePx === Math.max(...sizes),
    `with no display.md.strong, the sample opens with the largest display style by size, display.3xl.emphasis at 160px — drew ${pick?.path} at ${pick?.sizePx}px`);
}

console.log(`\n${executed - failed}/${executed} type-input assertions passed.`);
if (failed) process.exit(1);
