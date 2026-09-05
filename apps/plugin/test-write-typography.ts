/**
 * Plugin TYPOGRAPHY write-adapter test (#237) — drives the REAL `applyVarCollectionPlan` (`core`/
 * `type-sets` variables) + `applyTextStylePlan` (Text Styles) executors against in-memory shims, with
 * no live Figma.
 *
 *   npx tsx apps/plugin/test-write-typography.ts
 *
 * The variable shim is STRING-capable (font families are STRING vars). The text-style shim carries a
 * FAKE FONT REGISTRY so both paths are exercised: a font in the registry loads (style created + bound
 * vars set), and a font NOT in the registry throws from loadFontAsync → the style is SKIPPED with a
 * reason (never a throw that aborts the write). Asserts: font vars created (STRING family + FLOAT
 * size/weight), weight-role aliases bound (0 misses), text styles created + fontFamily/fontSize/
 * fontWeight bound, an unavailable font skipped-with-reason, and idempotent re-apply (+0).
 *
 * BOTH SIDES OF THE #1097 NAMESPACE MEET IN THIS FILE, which is why the expected names below are written
 * out rather than derived. A VARIABLE carries the brand root and, for the three primitive groups, the
 * `core` tier: `<root>/core/font/family/display`. A TEXT STYLE carries NEITHER — it stays
 * `display/sm/strong`, dropping the root AND the tier, because Figma's style tree is what a designer
 * browses by hand. So the same rung is spelled two ways on purpose, and a reader who generalises from one
 * to the other gets a name Figma does not have. `font-fluid/*` also stays OUT of `core` (it is a computed
 * tier, not a primitive) and lands in `type-sets` rooted but untiered. And the root spelled depends on
 * WHICH BRAND drives the block: the variable block below is NB's, so it is `nbds/`, while the #680
 * fixtures further down are aurora's and so are `ads/` (#1283). That the two differ in one file is the whole
 * content of #1097 — a read path that hard-coded either one would pass half this file.
 *
 * Mirrors the other shim tests' dependency-free `ok(...)` style; exits non-zero on any failure.
 */
import { buildFontVarPlan, buildTextStylePlan } from '@prism3/engine/write-plan';
import { brandTheme } from '@prism3/engine/theme';
import { exampleBrands } from '@prism3/engine/emit-brandinput';
import type { BrandInput } from '@prism3/engine/theme';
import { applyVarCollectionPlan } from './src/write-figma';
import { applyTextStylePlan, resolveFontStyle, normStyle } from './src/write-text-styles';
import type { FontName } from './src/write-text-styles';
import type { VarCollectionApplyResult as VarApplyResult } from './src/write-figma';
import { preloadFonts, facesToPreload } from './src/preload-fonts';
import type { FontPreloadApi } from './src/preload-fonts';
import { nbTheme } from '@prism3/engine/nb-fixture';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/** A KNOWN DEFECT, PINNED — reproduced here, deliberately not fixed here. `cond` states the WRONG
 *  behavior the executor has today, so the pin passes while the defect is present and goes RED the day
 *  it is fixed, naming the issue. The polarity is the point: a genuinely red test cannot be told apart
 *  from a broken build, and CI would refuse the PR that makes the defect reproducible at all. Same
 *  helper, same reasoning, as `test-write-components.ts`. */
const pinned = (cond: boolean, issue: string, label: string): void => {
  if (cond) console.log(`  ⊗ ${issue} PINNED (defect still present, as expected): ${label}`);
  else { failed++; console.error(`  ✗ ${issue} is FIXED — flip this pin to a positive assertion: ${label}`); }
};

/**
 * A CRASHING ASSERTION IS NOT A FAILING ONE (docs/34) — the reason this helper exists.
 *
 * Every "survives a refusal" fixture below calls the executor inside a `try` precisely because the
 * behavior under test is *not throwing*, so a broken executor leaves the result `undefined`. Reading
 * `result!.refused` then throws a TypeError that aborts the whole FILE, taking every later assertion
 * with it — so the mutation that breaks the fix the most reports the FEWEST failures, and the run
 * cannot be told apart from a broken build. #710 fixed one instance of this (an indexed label) and
 * shipped three more of the identical shape; that is what makes it worth a helper rather than a
 * comment.
 *
 * The substitute is chosen so that EVERY assertion reading it fails: no collections (so any created/
 * bound count compares against 0), no refusals (so `refused.length > 0` is false), and one miss (so
 * `misses.length === 0` is false). A sentinel that satisfied even one dependent assertion would be
 * worse than the crash it replaces, because it would be silent.
 */
const orFailed = (
  result: VarApplyResult | undefined,
): VarApplyResult => result ?? { collections: [], bound: 0, misses: ['THE APPLY THREW — no result'], refused: [] };

// ---- the in-memory figma.variables shim (STRING-capable) -----------------------------------
type Val = { type: 'VARIABLE_ALIAS'; id: string } | number | string;

/**
 * FIGMA'S FONT-LOADED STATE, as the VARIABLE writer collides with it (#680).
 *
 * A write to a variable a text style in the file resolves through forces Figma to re-resolve that style,
 * and re-resolution requires the style's font LOADED — per plugin run, so nothing a previous run loaded
 * counts. That is why `setValueForMode` throws `unloaded font` on a brand whose typeface has not been
 * loaded, from a writer that touches no text at all.
 *
 * Opt-in: a shim built without a session behaves exactly as before, so every existing case reads
 * unchanged. `loads` counts `loadFontAsync` calls, because the defect is precisely that there are none.
 */
const fontKey = (f: FontName): string => `${f.family}|${f.style}`;
class FontSession {
  loaded = new Set<string>();
  loads: FontName[] = [];
  /** variable name → the font a text style already in the file resolves through it. */
  dependents = new Map<string, FontName>();
  guard(varName: string): void {
    const fn = this.dependents.get(varName);
    if (fn && !this.loaded.has(fontKey(fn)))
      throw new Error(`in setValueForMode: unloaded font "${fn.family} ${fn.style}". Please call figma.loadFontAsync({ family: "${fn.family}", style: "${fn.style}" }) and await the returned promise first.`);
  }
}

class ShimVar {
  scopes: string[] = [];
  description = '';
  hiddenFromPublishing = false;
  valuesByMode: Record<string, Val> = {};
  session?: FontSession;
  constructor(public id: string, public name: string, public variableCollectionId: string, public resolvedType: 'COLOR' | 'FLOAT' | 'STRING' = 'COLOR') {}
  setValueForMode(modeId: string, value: Val): void { this.session?.guard(this.name); this.valuesByMode[modeId] = value; }
}
class ShimCollection {
  modes: { modeId: string; name: string }[];
  private seq = 0;
  constructor(public id: string, public name: string) { this.modes = [{ modeId: `${id}:m0`, name: 'Mode 1' }]; }
  renameMode(modeId: string, name: string): void { const m = this.modes.find((x) => x.modeId === modeId); if (m) m.name = name; }
  addMode(name: string): string { const modeId = `${this.id}:m${++this.seq}`; this.modes.push({ modeId, name }); return modeId; }
}
class VariablesShim {
  collections: ShimCollection[] = [];
  vars: ShimVar[] = [];
  private cseq = 0;
  private vseq = 0;
  /** Absent by default — a shim with no session behaves exactly as it did before #680 was modelled. */
  constructor(public session?: FontSession) {}
  async getLocalVariableCollectionsAsync(): Promise<ShimCollection[]> { return this.collections; }
  async getLocalVariablesAsync(type?: string): Promise<ShimVar[]> { return type ? this.vars.filter((v) => v.resolvedType === type) : this.vars; }
  createVariableCollection(name: string): ShimCollection { const c = new ShimCollection(`c${++this.cseq}`, name); this.collections.push(c); return c; }
  createVariable(name: string, collection: ShimCollection, t: 'COLOR' | 'FLOAT' | 'STRING' = 'COLOR'): ShimVar { const v = new ShimVar(`v${++this.vseq}`, name, collection.id, t); v.session = this.session; this.vars.push(v); return v; }
  createVariableAlias(target: ShimVar): { type: 'VARIABLE_ALIAS'; id: string } { return { type: 'VARIABLE_ALIAS', id: target.id }; }
  /** The port has no `loadFontAsync` — which is the defect. Present here so the pins below can say the
   *  writer never called one, rather than merely that it threw. */
  async loadFontAsync(fn: FontName): Promise<void> { this.session?.loads.push(fn); this.session?.loaded.add(fontKey(fn)); }
}

// ---- the in-memory text-style shim + fake font registry ------------------------------------
class ShimTextStyle {
  name = '';
  description = '';
  fontName: FontName = { family: '', style: '' };
  fontSize = 0;
  lineHeight: unknown = { unit: 'AUTO' };
  letterSpacing: unknown = { unit: 'PERCENT', value: 0 };
  textCase = 'ORIGINAL';
  textDecoration = 'NONE';
  bound: Record<string, string> = {};
  setBoundVariable(field: string, variable: { name: string } | null): void { if (variable) this.bound[field] = variable.name; }
}
class TextStylesShim {
  styles: ShimTextStyle[] = [];
  loaded: string[] = [];
  // `available` = the fake font registry (family|style keys that "exist"). A load for anything else throws.
  constructor(private available: Set<string>, private vars: VariablesShim) {}
  async getLocalTextStylesAsync(): Promise<ShimTextStyle[]> { return this.styles; }
  createTextStyle(): ShimTextStyle { const s = new ShimTextStyle(); this.styles.push(s); return s; }
  async loadFontAsync(fn: FontName): Promise<void> {
    const key = `${fn.family}|${fn.style}`;
    if (!this.available.has(key)) throw new Error(`font not available: ${key}`);
    this.loaded.push(key);
  }
  async getLocalVariablesAsync(type?: string): Promise<ShimVar[]> { return this.vars.getLocalVariablesAsync(type); }
}

// ---- drive it: NB (all fonts available) ----------------------------------------------------
const nb = nbTheme();
const varPlan = buildFontVarPlan(nb);
const textPlan = buildTextStylePlan(nb);

const vShim = new VariablesShim();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vApi = vShim as any;
const vr1 = await applyVarCollectionPlan(varPlan, vApi);
const varsAfterFirst = vShim.vars.length;
const vr2 = await applyVarCollectionPlan(varPlan, vApi); // idempotency

console.log('plugin TYPOGRAPHY write-adapter (#237) — executors against in-memory shims\n');

// --- font variables ---
const coreFont = vShim.collections.find((c) => c.name === 'core')!;
const typeSets = vShim.collections.find((c) => c.name === 'type-sets')!;
ok(!!coreFont && !!typeSets, 'both font collections created: core + type-sets');
const familyVars = vShim.vars.filter((v) => v.name.startsWith('nbds/core/font/family/'));
ok(familyVars.length > 0 && familyVars.every((v) => v.resolvedType === 'STRING' && typeof Object.values(v.valuesByMode)[0] === 'string'),
  'nbds/core/font/family/* created as STRING vars with string values');
ok(vShim.vars.some((v) => v.name.startsWith('nbds/core/font/size/') && v.resolvedType === 'FLOAT'), 'nbds/core/font/size/* created as FLOAT vars');
// The computed tier is the one that must NOT have moved under `core`: it is emitted into `type-sets` and
// rooted, but untiered. Pinned next to its primitive sibling because "everything font-ish went under
// core" is the plausible wrong reading of the change above, and nothing else here would catch it.
ok(vShim.vars.filter((v) => v.variableCollectionId === typeSets.id).length > 0
  && vShim.vars.filter((v) => v.variableCollectionId === typeSets.id).every((v) => v.name.startsWith('nbds/font-fluid/')),
  'nbds/font-fluid/* stays OUT of the core tier — rooted, in type-sets, not under nbds/core/');
ok(vr1.bound > 0 && vr1.misses.length === 0, `weight-role aliases bound (${vr1.bound}), 0 misses`);
const firstCreated = vr1.collections.reduce((n, c) => n + c.created, 0);
const secondCreated = vr2.collections.reduce((n, c) => n + c.created, 0);
ok(firstCreated > 0 && secondCreated === 0, `font vars: first run creates (${firstCreated}), re-run idempotent (+${secondCreated})`);
ok(vShim.vars.length === varsAfterFirst, `no duplicate font vars across re-run (${vShim.vars.length} stable)`);

// --- text styles: all fonts available → all created + bound ---
// Build the registry from the plan's (face, style) pairs so every NB style loads.
const allFonts = new Set(textPlan.map((r) => `${r.fontFamilyPrimary}|${r.fontStyle}`));
const tShim = new TextStylesShim(allFonts, vShim);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tApi = tShim as any;
const tr1 = await applyTextStylePlan(textPlan, tApi);
const stylesAfterFirst = tShim.styles.length;
const tr2 = await applyTextStylePlan(textPlan, tApi); // idempotency

ok(tr1.created === textPlan.length && tr1.skipped.length === 0, `all text styles created (${tr1.created}/${textPlan.length}), 0 skipped when fonts available`);
ok(tr1.misses.length === 0 && tr1.bound === textPlan.length * 3, `every text style binds fontFamily+fontSize+fontWeight (${tr1.bound}), 0 misses`);
const sample = tShim.styles[0];
ok(!!sample.bound.fontFamily && !!sample.bound.fontSize && !!sample.bound.fontWeight, 'a text style has all three bound vars set');
ok(sample.fontName.family !== '' && sample.fontName.style !== '', 'a text style has its baked fontName (family + style) set as the fallback');
// The description is what a designer reads in the style panel to know what a rung is FOR. The plan has
// always carried it and this executor dropped it until #464, where the sibling paste path started
// writing it — so the two write paths would have disagreed on what a style looks like in the file.
ok(tShim.styles.every((s, i) => s.description === textPlan[i].description && s.description !== ''),
  'every text style carries its plan description (the style-panel documentation)');
ok(tr2.created === 0 && tShim.styles.length === stylesAfterFirst, `text styles: re-run idempotent (+${tr2.created}, no duplicates)`);

// --- the skip-with-warning path: a font NOT in the registry is skipped, not thrown ---
const partial = new Set([...allFonts]);
const victim = textPlan.find((r) => r.fontStyle !== textPlan[0].fontStyle) ?? textPlan[0];
partial.delete(`${victim.fontFamilyPrimary}|${victim.fontStyle}`); // make ONE style's font unavailable
const skipShim = new TextStylesShim(partial, vShim);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sr = await applyTextStylePlan(textPlan, skipShim as any);
const skippedThisFont = sr.skipped.filter((s) => textPlan.find((r) => r.name === s.name)?.fontStyle === victim.fontStyle);
ok(sr.skipped.length >= 1 && skippedThisFont.length >= 1, `unavailable font → style(s) SKIPPED with a reason (${sr.skipped.length}), not thrown`);
ok(sr.skipped.every((s) => /font unavailable/.test(s.reason)), 'each skip carries a "font unavailable" reason');
ok(sr.created === textPlan.length - sr.skipped.length, `only the loadable styles were created (${sr.created}/${textPlan.length})`);

// ---- #499: the emitted style name is a guess, and the spelling is per-FAMILY ------------------
// Measured against a real 2,334-family library: `Semi Bold`/`SemiBold` is 3 spaced vs 575 tight with
// ZERO families carrying both. So no fixed table can be right, and the fix is to resolve at write
// time against the family's real styles.

ok(normStyle('Semi Bold') === normStyle('SemiBold') && normStyle('semi-bold') === 'semibold',
  '#499 normStyle: space/case/hyphen-insensitive (Semi Bold ≡ SemiBold ≡ semi-bold)');

// The measured pairs, in the direction that was actually failing: the plan says spaced, the family
// spells it tight. These are the real style lists for these families (confirmed by loadFontAsync).
ok(resolveFontStyle(['Regular', 'SemiBold', 'Bold'], 'Semi Bold') === 'SemiBold',
  '#499 Roboto/Open Sans spell it SemiBold — a plan asking for `Semi Bold` now resolves');
ok(resolveFontStyle(['Regular', 'Semi Bold', 'Bold'], 'Semi Bold') === 'Semi Bold',
  '#499 Inter spells it `Semi Bold` — the exact match still wins, unchanged');
ok(resolveFontStyle(['Regular', 'ExtraBold'], 'Extra Bold') === 'ExtraBold',
  '#499 Extra Bold → ExtraBold (400 families vs 4)');
ok(resolveFontStyle(['Regular', 'ExtraLight'], 'Extra Light') === 'ExtraLight',
  '#499 Extra Light → ExtraLight (406 families vs 2)');
// ...and the reverse direction, since the engine's table is tight for 800/200 and spaced for 600 —
// it is internally inconsistent, so BOTH directions occur in practice.
ok(resolveFontStyle(['Regular', 'Extra Bold'], 'ExtraBold') === 'Extra Bold',
  '#499 resolves tight→spaced too (Inter spells 800 `Extra Bold`, the table emits `ExtraBold`)');

// Italic rides along on the normalized string — no separate case in the resolver.
ok(resolveFontStyle(['Regular', 'SemiBold', 'SemiBold Italic'], 'Semi Bold Italic') === 'SemiBold Italic',
  '#499 italic resolves with its weight (Semi Bold Italic → SemiBold Italic)');

// Weight synonyms: a family that calls 600 DemiBold satisfies a SemiBold request.
ok(resolveFontStyle(['Regular', 'DemiBold'], 'Semi Bold') === 'DemiBold',
  '#499 DemiBold satisfies a SemiBold request (equivalence class, not a directional list)');
ok(resolveFontStyle(['Regular', 'SemiBold'], 'DemiBold') === 'SemiBold',
  '#499 ...and symmetrically, DemiBold → SemiBold');
ok(resolveFontStyle(['Regular', 'Heavy'], 'Black') === 'Heavy', '#499 Black ↔ Heavy');

// The negative case is load-bearing: a family that genuinely lacks the weight must NOT be given a
// substitute face. That is #237's skip-with-warning decision, and a resolver that "helpfully" fell
// back to Regular would silently ship the wrong typography everywhere.
ok(resolveFontStyle(['Regular', 'Bold'], 'Semi Bold') === undefined,
  '#499 a family that truly lacks the weight resolves to undefined — no substitute face (#237 holds)');
ok(resolveFontStyle([], 'Semi Bold') === undefined, '#499 an empty style list resolves to nothing');

// End-to-end: a registry that spells 600 tight, driven through the executor. Before #499 every
// `Semi Bold` row would have been skipped; now they write, and the count is reported.
const tightFamily = textPlan[0].fontFamilyPrimary;
const tightStyles = [...new Set(textPlan.map((r) => r.fontStyle.replace(/Semi Bold/g, 'SemiBold')))];
const tightRegistry = new Set(tightStyles.map((st) => `${tightFamily}|${st}`));
for (const r of textPlan) tightRegistry.add(`${r.fontFamilyPrimary}|${r.fontStyle.replace(/Semi Bold/g, 'SemiBold')}`);
class TightFontsApi extends TextStylesShim {
  async listAvailableFontsAsync(): Promise<ReadonlyArray<{ fontName: { family: string; style: string } }>> {
    return [...tightRegistry].map((k) => {
      const i = k.indexOf('|');
      return { fontName: { family: k.slice(0, i), style: k.slice(i + 1) } };
    });
  }
}
const wantsSemiBold = textPlan.filter((r) => /Semi Bold/.test(r.fontStyle)).length;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies TextStylesApi
const tightShim = new TightFontsApi(tightRegistry, new VariablesShim()) as any;
const tightRes = await applyTextStylePlan(textPlan, tightShim);
// The style actually WRITTEN must be the resolved one. Loading `SemiBold` and then setting
// `Semi Bold` on the node would pass every count assertion above while leaving Figma holding a style
// whose fontName never loaded — the two must not be allowed to disagree.
const written = await tightShim.getLocalTextStylesAsync();
const semiNames = new Set(textPlan.filter((r) => /Semi Bold/.test(r.fontStyle)).map((r) => r.name));
const writtenSemi = written.filter((st: { name: string }) => semiNames.has(st.name));
if (wantsSemiBold > 0) {
  ok(writtenSemi.length === wantsSemiBold && writtenSemi.every((st: { fontName: { style: string } }) => st.fontName.style.indexOf('SemiBold') >= 0),
    '#499 the WRITTEN fontName is the resolved style, not the plan guess (load and set must agree)');
  ok(tightRes.resolvedStyles === wantsSemiBold,
    `#499 executor corrected every spaced-spelling row (${tightRes.resolvedStyles}/${wantsSemiBold})`);
  ok(tightRes.skipped.length === 0,
    `#499 ...and none were skipped — before this, all ${wantsSemiBold} would have been lost to a naming mismatch`);
} else {
  // The NB fixture may not exercise 600; assert the mechanism is inert rather than silently vacuous.
  ok(tightRes.resolvedStyles === 0 && tightRes.skipped.length === 0,
    '#499 NB plan asks for no Semi Bold — resolver is inert here (asserted, not assumed)');
}

// =============================================================================================
// #680 — THE VARIABLE WRITER NEVER LOADS A FONT, REPRODUCED AT THE SITE OF THE DEFECT. NOT FIXED HERE.
// =============================================================================================
// Live: applying the AURORA brand failed outright with
//   write failed: in setValueForMode: unloaded font "Clash Display Semi Bold".
// while HARBOR applied cleanly in the same file and session — typeface-dependent, not a general write
// failure. `write-text-styles.ts:185` loads fonts; `write-components.ts:295` loads fonts;
// `write-figma.ts`, which owns all nine `setValueForMode` call sites, contains no `loadFontAsync` at all.
//
// The mechanism the issue hypothesised, modelled: a text style already in the file resolves through the
// variable being written, so Figma must re-resolve that style, and re-resolution wants the font loaded.
// The shim's `FontSession` above is what makes this reachable — no previous shim had any notion of a font
// being loaded-or-not, so `setValueForMode` could not throw for this reason and the whole class was
// invisible by construction (docs/34: a check that cannot fire, reported as a pass).
//
// One thing this CANNOT claim: that Figma's real trigger is the dependent-style re-resolution rather than
// something else. #680 names the decisive live test (a completely fresh file with no prior styles) and it
// is a live test. What is reproduced here is the consequence — one unloaded font costs the entire theme —
// and the code fact that this lane loads nothing.

// THE TWO REAL BRANDS, not an invented pair — aurora is what failed and harbor is what worked, and the
// difference between their plans is the whole finding. Derived from the examples so a brand whose
// typeface changes cannot leave this passing about a face nobody ships.
const auroraTheme = brandTheme(exampleBrands()['aurora'] as BrandInput);
const harborTheme = brandTheme(exampleBrands()['harbor'] as BrandInput);
/** Every `family|style` pair a brand's text styles name — the fonts a write touching those families
 *  could force Figma to re-resolve. */
const facesOf = (t: ReturnType<typeof brandTheme>): FontName[] =>
  [...new Map(buildTextStylePlan(t).map((r) => [`${r.fontFamilyPrimary}|${r.fontStyle}`, { family: r.fontFamilyPrimary, style: r.fontStyle }])).values()];
/** variable name → the face a text style resolving through it needs loaded. `font/family/<category>` is
 *  the row a style's `fontFamilyVar` points at, so the mapping comes from the text plan rather than a
 *  guess about which variables matter. */
const dependentsOf = (t: ReturnType<typeof brandTheme>): Map<string, FontName> =>
  new Map(buildTextStylePlan(t).map((r) => [r.fontFamilyVar, { family: r.fontFamilyPrimary, style: r.fontStyle }]));

const auroraFaces = facesOf(auroraTheme);
const harborFaces = facesOf(harborTheme);
const auroraVarPlan = buildFontVarPlan(auroraTheme);
const harborVarPlan = buildFontVarPlan(harborTheme);

// ---- REACHABILITY, first and separately -------------------------------------------------------
// The whole reproduction rests on the two brands differing in exactly the way the live run did. Asserted
// rather than assumed: derived fixtures drift, and a fixture where both brands name the same faces would
// make every pin below pass for the wrong reason.
const auroraOnly = auroraFaces.filter((f) => !harborFaces.some((h) => fontKey(h) === fontKey(f)));
ok(auroraOnly.length > 0,
  `#680 reachable: aurora names ${auroraOnly.length} face(s) harbor does not — ${auroraOnly.map(fontKey).join(', ')}. That difference is the reported failure`);
const auroraDeps = dependentsOf(auroraTheme);
// SPELLED, per this file's header — restamped `prism/` -> `ads/` by #1283 rather than read off
// `auroraTheme.root`, which would make the expectation agree with the plan by construction.
const displayFamilyVar = 'ads/core/font/family/display';
ok(auroraDeps.has(displayFamilyVar) && auroraVarPlan.flatMap((c) => c.rows).some((r) => r.name === displayFamilyVar),
  `#680 reachable: ${displayFamilyVar} is BOTH a row the writer sets and a variable a text style resolves through (${fontKey(auroraDeps.get(displayFamilyVar)!)})`);

// The guard itself: it fires with the face unloaded and STOPS once loaded. Without the second half it
// would be a constant `throw`, and every pin below would be satisfied by a shim that fails every write.
const armed = new FontSession();
armed.dependents = auroraDeps;
const probe = new VariablesShim(armed);
const probeVar = probe.createVariable(displayFamilyVar, probe.createVariableCollection('core'), 'STRING');
let probeThrew = '';
try { probeVar.setValueForMode('m0', 'Clash Display'); } catch (e) { probeThrew = (e as Error).message; }
ok(probeThrew.indexOf('unloaded font') >= 0 && probeThrew.indexOf(auroraDeps.get(displayFamilyVar)!.family) >= 0,
  `#680 reachable: the guard fires on ${displayFamilyVar} with that face unloaded, in Figma's own words (${probeThrew.slice(0, 62)}…)`);
for (const f of auroraFaces) armed.loaded.add(fontKey(f));
let afterLoad = '';
try { probeVar.setValueForMode('m0', 'Clash Display'); } catch (e) { afterLoad = (e as Error).message; }
ok(afterLoad === '', '#680 reachable: ...and does NOT fire once that face is loaded — the guard tracks state rather than always throwing');

// ---- HARBOR, the control: same writer, same fresh session, applies cleanly ---------------------
// Harbor's faces are all Inter/JetBrains Mono, which this file's earlier runs already loaded — so a
// session seeded with them is the live condition: harbor `✓ applied` in the same session aurora failed.
const harborSession = new FontSession();
harborSession.dependents = dependentsOf(harborTheme);
for (const f of harborFaces) harborSession.loaded.add(fontKey(f));
const harborShim = new VariablesShim(harborSession);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const harborRes = await applyVarCollectionPlan(harborVarPlan, harborShim as any);
ok(harborRes.misses.length === 0 && harborRes.collections.reduce((n, c) => n + c.created, 0) > 0,
  `#680 harbor applies cleanly (+${harborRes.collections.reduce((n, c) => n + c.created, 0)} vars, 0 misses) — the writer is not simply broken, which is what makes the aurora result a finding`);

// ---- AURORA, the reproduction: without a preload the write loses its font variables -------------
// The SAME session state — every face harbor needed is loaded, nothing else is. Aurora's display face is
// not among them. Nothing here calls the preload, which is exactly the pre-#680 condition.
const session = new FontSession();
session.dependents = auroraDeps;
for (const f of harborFaces) session.loaded.add(fontKey(f));
const auroraShim = new VariablesShim(session);
let wroteThrew = '';
let wroteResult: Awaited<ReturnType<typeof applyVarCollectionPlan>> | undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
try { wroteResult = await applyVarCollectionPlan(auroraVarPlan, auroraShim as any); } catch (e) { wroteThrew = (e as Error).message; }

// THE FLOOR (#680): the host's refusal no longer propagates. This is the half of the fix that survives a
// face nobody can load — a typeface that is genuinely not installed will still be refused, and the brand
// must keep its colors, dimensions and effects anyway.
ok(wroteThrew === '' && wroteResult !== undefined,
  `#680 a host refusal no longer aborts the apply — the writer returns a result instead of throwing (was: "in setValueForMode: unloaded font …", which main.ts turned into one "write failed" and nothing else written)`);
// Both the DEREF and the INDEX are defensive here, for the same reason: the mutation under test is one
// that makes the executor throw, so `wroteResult` is exactly then `undefined` and `refused` exactly then
// empty. Either read raw would abort the file instead of failing three assertions (see `orFailed`).
const wrote = orFailed(wroteResult);
ok(wrote.refused.length > 0 && wrote.refused.every((x) => x.reason.indexOf('unloaded font') >= 0),
  `#680 ...and REPORTS what the host refused (${wrote.refused.length} writes, e.g. ${wrote.refused[0]?.name ?? 'NONE RECORDED'}) in Figma's own words, rather than swallowing it`);
// The refusal is per VALUE, not per apply: everything the host did accept is still written. Without this
// the "survives" assertion above would also be satisfied by a writer that gave up after the first throw.
const auroraFontVarRows = auroraVarPlan.flatMap((c) => c.rows).length;
ok(wrote.collections.reduce((n, c) => n + c.created, 0) === auroraFontVarRows,
  `#680 every one of aurora's ${auroraFontVarRows} font variables is still CREATED despite the refusals — the write steps over the refused value, it does not stop`);
// `bound` must not count a binding the host rejected — a summary claiming bindings the file does not
// carry is worse than one reporting fewer. The refusals above land on `font/family/*` rows, which carry no
// alias, so this needs its OWN fixture: text styles bind `fontWeight` to `core/font/weight-role/*`, and those
// are exactly the aliased rows. Keyed there, the refusal reaches pass B.
const aliasedRows = auroraVarPlan.flatMap((c) => c.rows).filter((r) => r.aliasByMode.some(Boolean));
ok(aliasedRows.length > 0 && aliasedRows.every((r) => r.name.startsWith('ads/core/font/weight-role/')),
  `#680 reachable: the ${aliasedRows.length} aliased rows are the weight-roles a text style's fontWeight binds to — so a refusal CAN land on an alias write, which is what the next assertion needs`);
const aliasSession = new FontSession();
// Every weight-role bound to a face nothing loaded — the pass-B write is refused, not the pass-A one.
aliasSession.dependents = new Map(aliasedRows.map((r) => [r.name, { family: 'Clash Display', style: 'Bold' }] as const));
const aliasShim = new VariablesShim(aliasSession);
// Wrapped for the same reason as the fixtures above, and it is the SUBTLER instance of the shape: this
// call is not merely allowed to be refused, it is BUILT to be — so a `setSurviving` that rethrows aborts
// the run HERE, one layer out from the deref. An unwrapped call whose fixture is armed to fail is the
// same crash hazard as an unguarded deref, and greps for `!.` do not find it.
let aliasThrew = '';
let aliasResult: VarApplyResult | undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
try { aliasResult = await applyVarCollectionPlan(auroraVarPlan, aliasShim as any); } catch (e) { aliasThrew = (e as Error).message; }
const aliasRes = orFailed(aliasResult);
ok(aliasThrew === '' && aliasRes.bound === 0 && aliasRes.refused.length >= aliasedRows.length && harborRes.bound > 0,
  `#680 an alias write the host refuses is NOT counted as bound (${aliasRes.bound} bound against ${aliasRes.refused.length} refusals; the same plan binds ${harborRes.bound} when accepted) — the count reports the file, not the attempt`);
// #680's stated posture is `write-text-styles`': report what was skipped, write everything else. The
// contrast is available as a positive fact — the sibling lane already degrades, on the shim built above.
ok(sr.skipped.length >= 1 && sr.created > 0,
  `#680 (contrast) the TEXT STYLE lane already degrades on an unavailable font — ${sr.created} written, ${sr.skipped.length} skipped-with-reason, nothing thrown. That is the posture the variable lane needs.`);

// =============================================================================================
// #680 — THE PRELOAD: THE FACE NEEDED IS A CROSS PRODUCT, WHICH IS WHY THE LIVE ERROR NAMED A PAIR
// IN NEITHER BRAND'S PLAN.
// =============================================================================================
// The live message was `unloaded font "Clash Display Semi Bold"`. `Clash Display` is the family AURORA
// writes; `Semi Bold` is a style only HARBOR names. The pair is in no plan — Figma re-resolves the file's
// existing style against the INCOMING family while keeping its OWN style name. So the theme-derived set
// misses it and the file-derived set misses it, and #680's two candidate designs are both insufficient
// alone. That is asserted below rather than asserted about, because it is the reason the code has the
// shape it has.

/** The file, as harbor left it: text styles carrying harbor's faces. What `getLocalTextStylesAsync`
 *  returns to the preload, and the second half of the cross product. */
const harborFileStyles = buildTextStylePlan(harborTheme).map((r) => ({
  name: r.name,
  fontName: { family: r.fontFamilyPrimary, style: r.fontStyle },
}));

const auroraTextPlan = buildTextStylePlan(auroraTheme);
const candidates = facesToPreload(auroraTextPlan, harborFileStyles);
const candidateKeys = new Set(candidates.map((c) => fontKey(c.face)));

// The two halves, derived from the two plans INDEPENDENTLY of `facesToPreload` — the point is that the
// pair it must produce is computable without asking it.
const incomingFamilies = new Set(auroraTextPlan.map((r) => r.fontFamilyPrimary));
const existingStyles = new Set(harborFileStyles.map((s) => s.fontName.style));
const crossedPairs = [...incomingFamilies].flatMap((family) =>
  [...existingStyles].map((style) => ({ family, style })),
).filter((p) =>
  !auroraTextPlan.some((r) => r.fontFamilyPrimary === p.family && r.fontStyle === p.style) &&
  !harborFileStyles.some((s) => s.fontName.family === p.family && s.fontName.style === p.style));
ok(crossedPairs.length > 0,
  `#680 reachable: ${crossedPairs.length} face(s) are in NEITHER plan yet reachable by re-resolution — ${crossedPairs.slice(0, 3).map(fontKey).join(', ')}. The live failure was one of these`);
ok(crossedPairs.every((p) => candidateKeys.has(fontKey(p))),
  `#680 the preload candidate set contains every crossed pair (${crossedPairs.length}/${crossedPairs.length}) — a theme-only or file-only load would miss all of them`);
// And the specific reported pair, spelled out. It survives a change of example brand because it is built
// from the two plans, but naming it is what ties this test to the bug report.
const reported = { family: [...incomingFamilies].find((f) => f !== 'Inter' && f !== 'JetBrains Mono')!, style: 'Semi Bold' };
ok(existingStyles.has('Semi Bold') && candidateKeys.has(fontKey(reported)),
  `#680 the exact reported shape is covered: ${fontKey(reported)} — aurora's family with harbor's style, which is what the live run failed on`);
// The mirror direction too: the file's family with the incoming brand's style (a brand that changes a
// weight while the family survives).
ok(candidates.some((c) => c.origin === 'crossed' && harborFileStyles.some((s) => s.fontName.family === c.face.family)),
  '#680 the mirror direction is covered too — an existing FAMILY with an incoming STYLE');
// Origins are what decide whether a failed load is reportable, so assert all three are populated rather
// than trusting that a set with the right size has the right labels.
const origins = candidates.reduce((acc: Record<string, number>, c) => ({ ...acc, [c.origin]: (acc[c.origin] ?? 0) + 1 }), {});
ok((origins.theme ?? 0) > 0 && (origins.file ?? 0) > 0 && (origins.crossed ?? 0) > 0,
  `#680 all three origins are populated (theme ${origins.theme}, file ${origins.file}, crossed ${origins.crossed}) — the label decides whether a failed load is reported, so an empty class would silence a whole category`);
ok(candidateKeys.size === candidates.length,
  `#680 candidates are deduped (${candidates.length} unique) — a face named by both the theme and the file is loaded once`);

/** A preload host: `available` is the fake font registry, and a successful load marks the shared
 *  `FontSession` loaded — so the guard that threw above actually stops throwing. That shared state is
 *  what makes the end-to-end below a real test rather than two independent ones. */
const preloadHost = (available: Set<string>, s: FontSession, offerList = true): FontPreloadApi => ({
  async getLocalTextStylesAsync() { return harborFileStyles; },
  async loadFontAsync(fn: FontName) {
    if (!available.has(fontKey(fn))) throw new Error(`font not available: ${fontKey(fn)}`);
    s.loads.push(fn);
    s.loaded.add(fontKey(fn));
  },
  ...(offerList ? { async listAvailableFontsAsync() { return [...available].map((k) => { const [family, style] = k.split('|'); return { fontName: { family, style } }; }); } } : {}),
});

// ---- END TO END: the apply that failed live, now with the preload in front of it ----------------
// Registry = every face either brand names PLUS the crossed pairs, i.e. a Figma that has Clash Display in
// the weights the re-resolution will ask for. The session starts with only harbor's faces loaded, exactly
// as the live run did.
const fullRegistry = new Set<string>([
  ...auroraFaces.map(fontKey), ...harborFaces.map(fontKey), ...crossedPairs.map(fontKey),
]);
const e2eSession = new FontSession();
// The dependents map is the CROSS PRODUCT, not aurora's own faces — the file's style keeps its style name
// and picks up the incoming family. This is the mechanism the live error described, and the earlier
// `auroraDeps` fixture (var → aurora's own face) is the weaker version of it.
//
// KEYED BY THE VARIABLE THE WRITE ACTUALLY TOUCHES — aurora's — and PAIRED with harbor's row by the
// ROOT-RELATIVE TAIL (#1283). Both halves used to be free, and both broke at once. While aurora and
// harbor shared the `prism` root their variable names were the same STRING, so keying the map by
// harbor's name happened to key aurora's too, and `a.fontFamilyVar === r.fontFamilyVar` happened to
// pair them. #1283 gave them `ads` and `hds`: no name matched, so `incoming` was always undefined AND
// the write's own variables were absent from the map — the cross-product fixture degraded to harbor's
// own faces, arming nothing for the two arms below while every arm above stayed green.
//
// A ROOT is what makes two brands' variables different names; a TAIL is what makes them the same
// logical variable. So the pairing is on the tail, deliberately, and the KEY is aurora's rooted name
// because that is the one the write under test will look up.
const tail = (n: string): string => n.split('/').slice(1).join('/');
const harborByTail = new Map(buildTextStylePlan(harborTheme).map((r) => [tail(r.fontFamilyVar), r] as const));
e2eSession.dependents = new Map(
  auroraTextPlan.map((a) => {
    const counterpart = harborByTail.get(tail(a.fontFamilyVar));
    return [a.fontFamilyVar, { family: a.fontFamilyPrimary, style: counterpart?.fontStyle ?? a.fontStyle }] as const;
  }),
);
for (const f of harborFaces) e2eSession.loaded.add(fontKey(f));
// Reachability: this fixture must actually be armed, or the clean apply below proves nothing.
const armedDeps = [...e2eSession.dependents.values()].filter((f) => !e2eSession.loaded.has(fontKey(f)));
ok(armedDeps.length > 0,
  `#680 reachable: ${armedDeps.length} of the file's styles would re-resolve to a face that is NOT loaded (${armedDeps.slice(0, 2).map(fontKey).join(', ')}) — the write below would throw without the preload`);

const pre = await preloadFonts(auroraTextPlan, preloadHost(fullRegistry, e2eSession));
ok(pre.loaded > 0 && pre.unavailable.length === 0,
  `#680 the preload loads ${pre.loaded} faces and reports none unavailable against a Figma that has them`);
ok(e2eSession.loads.length === pre.loaded,
  `#680 ...and it really called loadFontAsync (${e2eSession.loads.length} calls) — the count is the host's, not the preload's own bookkeeping`);
const e2eShim = new VariablesShim(e2eSession);
let e2eThrew = '';
let e2eResult: Awaited<ReturnType<typeof applyVarCollectionPlan>> | undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
try { e2eResult = await applyVarCollectionPlan(auroraVarPlan, e2eShim as any); } catch (e) { e2eThrew = (e as Error).message; }
ok(e2eThrew === '' && e2eResult !== undefined && e2eResult.refused.length === 0,
  `#680 FIXED: with the preload in front, aurora's variable write completes with ZERO refusals — the apply the live run lost`);
const e2e = orFailed(e2eResult);
ok(e2e.misses.length === 0 && e2e.collections.reduce((n, c) => n + c.created, 0) === auroraFontVarRows,
  `#680 ...and writes all ${auroraFontVarRows} font variables with 0 misses`);
// THE DISCRIMINATING PAIR: the same write, same session, same registry — only the preload removed. Without
// it the refusals come back. This is the assertion that separates the fix from a shim that cannot fail.
const noPreSession = new FontSession();
noPreSession.dependents = e2eSession.dependents;
for (const f of harborFaces) noPreSession.loaded.add(fontKey(f));
const noPreShim = new VariablesShim(noPreSession);
// Armed to be refused, so wrapped — same shape as the alias fixture above.
let noPreThrew = '';
let noPreRaw: VarApplyResult | undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
try { noPreRaw = await applyVarCollectionPlan(auroraVarPlan, noPreShim as any); } catch (e) { noPreThrew = (e as Error).message; }
const noPreResult = orFailed(noPreRaw);
ok(noPreThrew === '' && noPreResult.refused.length > 0 && noPreSession.loads.length === 0,
  `#680 and the SAME write without the preload is refused ${noPreResult.refused.length} times (0 loads) — the difference is the preload, not the fixture`);

// ---- A TYPEFACE THIS FIGMA GENUINELY LACKS: reported, and everything else still applies ----------
// The other half of the posture. A registry with harbor's faces only is a Figma with no Clash Display at
// all, which no amount of loading can fix.
const poorSession = new FontSession();
poorSession.dependents = e2eSession.dependents;
for (const f of harborFaces) poorSession.loaded.add(fontKey(f));
const poorRegistry = new Set(harborFaces.map(fontKey));
const poor = await preloadFonts(auroraTextPlan, preloadHost(poorRegistry, poorSession));
ok(poor.unavailable.length > 0 && poor.unavailable.every((u) => u.origin !== 'crossed'),
  `#680 a typeface this Figma lacks is REPORTED (${poor.unavailable.length}: ${poor.unavailable.slice(0, 2).map((u) => u.face).join(', ')}) — and only named faces are listed, never the crossed pairs`);
ok(poor.crossedMisses > 0,
  `#680 ...while the ${poor.crossedMisses} crossed pairs that do not exist are COUNTED, not listed — most family × style combinations are not real, and listing them would bury the reportable ones`);
const poorShim = new VariablesShim(poorSession);
let poorThrew = '';
let poorResult: Awaited<ReturnType<typeof applyVarCollectionPlan>> | undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
try { poorResult = await applyVarCollectionPlan(auroraVarPlan, poorShim as any); } catch (e) { poorThrew = (e as Error).message; }
const poorApplied = orFailed(poorResult);
ok(poorThrew === '' && poorResult !== undefined && poorApplied.collections.reduce((n, c) => n + c.created, 0) === auroraFontVarRows,
  `#680 ...and the brand STILL APPLIES on a Figma missing its typeface — all ${auroraFontVarRows} font vars written, ${poorApplied.refused.length} refusals reported, nothing thrown`);

// ---- DEGRADATION OF THE PRELOAD'S OWN DEPENDENCIES ----------------------------------------------
// A host with no font list must be no worse than one with a list — it attempts every candidate instead
// of consulting the list, so a missing capability costs work rather than coverage (the #499 lesson).
const noListSession = new FontSession();
const noList = await preloadFonts(auroraTextPlan, preloadHost(fullRegistry, noListSession, false));
ok(noList.loaded === pre.loaded && noList.attempted >= pre.attempted,
  `#680 a host offering no font list loads the same ${noList.loaded} faces by attempting more (${noList.attempted} vs ${pre.attempted}) — a missing capability costs work, not coverage`);
// An unreadable style list must not be fatal: this runs before a write that still has to happen.
const blindSession = new FontSession();
const blind = await preloadFonts(auroraTextPlan, {
  async getLocalTextStylesAsync() { throw new Error('styles unreadable'); },
  async loadFontAsync(fn: FontName) { blindSession.loads.push(fn); blindSession.loaded.add(fontKey(fn)); },
});
ok(blind.loaded >= auroraFaces.length && blind.byOrigin.file === 0 && blind.byOrigin.crossed === 0,
  `#680 a file whose styles cannot be read still loads the theme's own ${blind.loaded} faces (file 0, crossed 0) — strictly better than loading nothing, and never fatal`);
// An empty file (the issue's decisive live test, offline): no existing styles means no cross product, and
// the theme's own faces are the whole set.
const fresh = await preloadFonts(auroraTextPlan, {
  async getLocalTextStylesAsync() { return []; },
  async loadFontAsync() { /* every load succeeds */ },
});
ok(fresh.byOrigin.crossed === 0 && fresh.byOrigin.file === 0 && fresh.loaded === auroraFaces.length,
  `#680 a FRESH file has no cross product at all — ${fresh.loaded} faces, all from the theme. That is why aurora applied to an empty file and failed on a themed one`);

console.log(`\nplugin TYPOGRAPHY write-adapter: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
