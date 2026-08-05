/**
 * Plugin TYPOGRAPHY write-adapter test (#237) — drives the REAL `applyVarCollectionPlan` (core-font/
 * type-sets variables) + `applyTextStylePlan` (Text Styles) executors against in-memory shims, with
 * no live Figma.
 *
 *   npx tsx plugin/test-write-typography.ts
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
import { buildFontVarPlan, buildTextStylePlan } from '../Prism3/engine/write-plan';
import { brandTheme } from '../Prism3/engine/theme';
import { applyVarCollectionPlan } from './src/write-figma';
import { applyTextStylePlan, resolveFontStyle, normStyle } from './src/write-text-styles';
import type { FontName } from './src/write-text-styles';
import { nbTheme } from '../Prism3/engine/nb-fixture';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// ---- the in-memory figma.variables shim (STRING-capable) -----------------------------------
type Val = { type: 'VARIABLE_ALIAS'; id: string } | number | string;
class ShimVar {
  scopes: string[] = [];
  description = '';
  hiddenFromPublishing = false;
  valuesByMode: Record<string, Val> = {};
  constructor(public id: string, public name: string, public variableCollectionId: string, public resolvedType: 'COLOR' | 'FLOAT' | 'STRING' = 'COLOR') {}
  setValueForMode(modeId: string, value: Val): void { this.valuesByMode[modeId] = value; }
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
  async getLocalVariableCollectionsAsync(): Promise<ShimCollection[]> { return this.collections; }
  async getLocalVariablesAsync(type?: string): Promise<ShimVar[]> { return type ? this.vars.filter((v) => v.resolvedType === type) : this.vars; }
  createVariableCollection(name: string): ShimCollection { const c = new ShimCollection(`c${++this.cseq}`, name); this.collections.push(c); return c; }
  createVariable(name: string, collection: ShimCollection, t: 'COLOR' | 'FLOAT' | 'STRING' = 'COLOR'): ShimVar { const v = new ShimVar(`v${++this.vseq}`, name, collection.id, t); this.vars.push(v); return v; }
  createVariableAlias(target: ShimVar): { type: 'VARIABLE_ALIAS'; id: string } { return { type: 'VARIABLE_ALIAS', id: target.id }; }
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

console.log(`\nplugin TYPOGRAPHY write-adapter: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
