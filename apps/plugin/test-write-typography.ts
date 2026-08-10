/**
 * Plugin TYPOGRAPHY write-adapter test (#237) — drives the REAL `applyVarCollectionPlan` (core-font/
 * type-sets variables) + `applyTextStylePlan` (Text Styles) executors against in-memory shims, with
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
 * Mirrors the other shim tests' dependency-free `ok(...)` style; exits non-zero on any failure.
 */
import { buildFontVarPlan, buildTextStylePlan } from '@prism3/engine/write-plan';
import { brandTheme } from '@prism3/engine/theme';
import { exampleBrands } from '@prism3/engine/emit-brandinput';
import type { BrandInput } from '@prism3/engine/theme';
import { applyVarCollectionPlan } from './src/write-figma';
import { applyTextStylePlan, resolveFontStyle, normStyle } from './src/write-text-styles';
import type { FontName } from './src/write-text-styles';
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
const coreFont = vShim.collections.find((c) => c.name === 'core-font')!;
const typeSets = vShim.collections.find((c) => c.name === 'type-sets')!;
ok(!!coreFont && !!typeSets, 'both font collections created: core-font + type-sets');
const familyVars = vShim.vars.filter((v) => v.name.startsWith('font/family/'));
ok(familyVars.length > 0 && familyVars.every((v) => v.resolvedType === 'STRING' && typeof Object.values(v.valuesByMode)[0] === 'string'),
  'font/family/* created as STRING vars with string values');
ok(vShim.vars.some((v) => v.name.startsWith('font/size/') && v.resolvedType === 'FLOAT'), 'font/size/* created as FLOAT vars');
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
const displayFamilyVar = 'font/family/display';
ok(auroraDeps.has(displayFamilyVar) && auroraVarPlan.flatMap((c) => c.rows).some((r) => r.name === displayFamilyVar),
  `#680 reachable: ${displayFamilyVar} is BOTH a row the writer sets and a variable a text style resolves through (${fontKey(auroraDeps.get(displayFamilyVar)!)})`);

// The guard itself: it fires with the face unloaded and STOPS once loaded. Without the second half it
// would be a constant `throw`, and every pin below would be satisfied by a shim that fails every write.
const armed = new FontSession();
armed.dependents = auroraDeps;
const probe = new VariablesShim(armed);
const probeVar = probe.createVariable(displayFamilyVar, probe.createVariableCollection('core-font'), 'STRING');
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

// ---- AURORA, the reproduction: the whole write is lost -----------------------------------------
// The SAME session state — every face harbor needed is loaded, nothing else is. Aurora's display face is
// not among them, and no one loads it.
const session = new FontSession();
session.dependents = auroraDeps;
for (const f of harborFaces) session.loaded.add(fontKey(f));
const auroraShim = new VariablesShim(session);
let wroteThrew = '';
let wroteResult: Awaited<ReturnType<typeof applyVarCollectionPlan>> | undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
try { wroteResult = await applyVarCollectionPlan(auroraVarPlan, auroraShim as any); } catch (e) { wroteThrew = (e as Error).message; }

pinned(wroteThrew.indexOf('unloaded font') >= 0, '#680',
  `aurora's variable write THROWS on a face nothing loaded, and the whole theme apply is lost — main.ts turns this into one "write failed" and nothing else is written (${wroteThrew.slice(0, 66)}…)`);
// THE CODE FACT, independent of the throw: not one font was loaded before the write. A fix that merely
// CAUGHT the error would satisfy the pin above and still fail here, which is the point of asserting both.
pinned(session.loads.length === 0, '#680',
  `the variable writer called loadFontAsync ZERO times before mutating (${session.loads.length} loads) — write-figma.ts has no loadFontAsync in the file at all`);
pinned(wroteResult === undefined, '#680',
  'nothing is reported: there is no result to read misses from, so the brand loses its colors, dimensions and everything else along with its type');
// #680's stated posture is `write-text-styles`': report what was skipped, write everything else. The
// contrast is available as a positive fact — the sibling lane already degrades, on the shim built above.
ok(sr.skipped.length >= 1 && sr.created > 0,
  `#680 (contrast) the TEXT STYLE lane already degrades on an unavailable font — ${sr.created} written, ${sr.skipped.length} skipped-with-reason, nothing thrown. That is the posture the variable lane needs.`);

console.log(`\nplugin TYPOGRAPHY write-adapter: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
