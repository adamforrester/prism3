/**
 * Prism3 Figma plugin — the MAIN-THREAD TEXT-STYLE write adapter (typography lane, #237).
 *
 * The executor for the host-neutral `TextStylePlan` (engine `write-plan.ts` `buildTextStylePlan`) —
 * the sibling of `applyWritePlan`/`applyFloatPlan`/`applyVarCollectionPlan` (variables) and
 * `applyStylesPlan` (effect/paint styles). Text Styles are a THIRD Figma API surface
 * (`figma.createTextStyle` / `getLocalTextStylesAsync`), and the FIRST write that must LOAD a resource:
 * `figma.loadFontAsync({ family, style })` before `fontName` can be set.
 *
 * FONT FALLBACK = SKIP-WITH-WARNING (owner decision, #237): if a font/style won't load (family not
 * installed, or a weight the family lacks), the style is SKIPPED and recorded in `skipped[]` — never a
 * substituted wrong face, never a throw that aborts the whole write. The font *variables* (`core-font`/
 * `type-sets`) write regardless (that's `applyVarCollectionPlan`), so a skipped style is the only loss.
 *
 * Bound props (fontFamily/fontSize/fontWeight) are wired to their variables via `setBoundVariable`; the
 * baked literal (fontName/fontSize/lineHeight/…) is set first as the correct fallback value. The
 * name→Variable map is built from an UNFILTERED `getLocalVariablesAsync()` (the #146 lesson: a
 * type-filtered fetch would miss the STRING family + FLOAT size/weight vars).
 *
 * Compiled under `tsconfig.main.json` — has `figma.*`, NO `document`. The `TextStylesApi` port is the
 * minimal slice of `figma` the executor touches, so it's unit-testable against an in-memory shim (see
 * `apps/plugin/test-write-typography.ts`); the real `figma` structurally satisfies it.
 */
import type { TextStylePlan } from '../../../Prism3/engine/write-plan';
import type { VariablesApi, Variable } from './write-figma';

/** A Figma font descriptor. */
export type FontName = { family: string; style: string };
/** A line-height / letter-spacing value as Figma stores it (the emit bakes PERCENT). */
type Unit = { unit: 'PERCENT' | 'PIXELS'; value: number };

// The Text Style node's typed fields are WRITE-ONLY here (the executor assigns them; never reads them
// back), and the real `TextStyle` is a wider superset — so, as in `write-styles.ts`, we type the
// mutable fields loosely enough that the real `figma` TextStyle satisfies the port. `setBoundVariable`
// takes the field name + the Variable (or null).
/** Minimal Text Style surface — mutable name/props + bound-variable wiring. */
export interface TextStyleNode {
  name: string;
  description: string;
  fontName: FontName;
  fontSize: number;
  lineHeight: Unit | { unit: 'AUTO' };
  letterSpacing: Unit;
  textCase: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'SMALL_CAPS' | 'SMALL_CAPS_FORCED' | 'TITLE';
  textDecoration: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  setBoundVariable(field: 'fontFamily' | 'fontSize' | 'fontWeight' | 'fontStyle' | 'lineHeight' | 'letterSpacing', variable: Variable | null): void;
}

/** The minimal `figma` text-style + font surface the executor needs — declared as a port so the Node
 *  harness can drive it with a shim (incl. a fake font registry). The real `figma` satisfies it. */
export interface TextStylesApi {
  getLocalTextStylesAsync(): Promise<TextStyleNode[]>;
  createTextStyle(): TextStyleNode;
  loadFontAsync(fontName: FontName): Promise<void>;
  /** The variable index for binding — reuses the same `getLocalVariablesAsync` the var executor uses. */
  getLocalVariablesAsync(type?: string): Promise<Variable[]>;
  /** The real (family, style) pairs this Figma can load (#499). OPTIONAL: without it the executor uses
   *  the plan's emitted style verbatim, which is exactly the pre-#499 behavior — so the paste path and
   *  any older shim keep working unchanged. */
  listAvailableFontsAsync?(): Promise<ReadonlyArray<{ fontName: { family: string; style: string } }>>;
}

/* ---- #499: the emitted style name is a GUESS, and no fixed guess can be right ------------------
 *
 * `WEIGHT_STYLE_NAME` in the engine hardcodes a Figma style name per numeric weight, but the spelling
 * of a weight is per-FAMILY. Measured against a real 2,334-family library:
 *
 *     Semi Bold / SemiBold     →  3 spaced,  575 tight,  0 carrying BOTH
 *     Extra Bold / ExtraBold   →  4 spaced,  400 tight,  0 carrying BOTH
 *     Extra Light / ExtraLight →  2 spaced,  406 tight,  0 carrying BOTH
 *
 * `both` is zero in every row: a family carries one spelling or the other, never both, so any fixed
 * string is wrong for whichever set it does not match and there is no safe default. The cost was real
 * and silent — under skip-with-warning a brand asking for 600 lost those styles on 575 families for a
 * NAMING reason, not a font-availability one (harbor: 2 of 2,334 families satisfiable).
 *
 * The fix is to stop guessing at write time, where the real list is in hand. The engine keeps emitting
 * its guess — the CLI has no font library to ask, so it has nothing better — and that guess becomes the
 * PREFERRED CANDIDATE rather than the answer. Deliberately no engine change: the emitted artifacts and
 * fixtures stay byte-identical, and the capability split falls where the capability actually is.
 */

/** Case/space/punctuation-insensitive style key: `Semi Bold` ≡ `SemiBold` ≡ `semi-bold`. */
export const normStyle = (s: string): string => s.toLowerCase().replace(/[\s\-_]+/g, '');

/* Weight words that name the same weight. Within a class every member is interchangeable, so this is
 * an equivalence CLASS rather than a directional fallback list — `DemiBold` should satisfy a request
 * for `SemiBold` and vice versa. Members are matched longest-first because several are substrings of
 * their siblings (`demi` inside `demibold`), and a short match would rewrite the wrong span. */
const WEIGHT_SYNONYMS: string[][] = [
  ['semibold', 'demibold', 'demi'],
  ['extrabold', 'ultrabold'],
  ['extralight', 'ultralight'],
  ['black', 'heavy'],
  ['thin', 'hairline'],
].map((c) => [...c].sort((a, b) => b.length - a.length));

/**
 * The real style name for a desired one, given what the family actually has (#499).
 *
 * Three passes, narrowest first: exact, then spelling-insensitive (the measured bug), then weight
 * synonyms. Returns `undefined` when the family genuinely lacks the weight — that is a real
 * skip-with-warning, and collapsing it into a substitute face is the thing #237 decided not to do.
 *
 * Works on the normalized string throughout, so an italic suffix rides along for free:
 * `semibolditalic` → `demibolditalic` without italic needing its own case.
 */
export const resolveFontStyle = (available: readonly string[], desired: string): string | undefined => {
  const byNorm = new Map<string, string>();
  for (const s of available) if (!byNorm.has(normStyle(s))) byNorm.set(normStyle(s), s);
  const want = normStyle(desired);
  const direct = byNorm.get(want);
  if (direct) return direct;
  for (const cls of WEIGHT_SYNONYMS) {
    const member = cls.find((m) => want.includes(m));
    if (!member) continue;
    for (const alt of cls) {
      if (alt === member) continue;
      const hit = byNorm.get(want.replace(member, alt));
      if (hit) return hit;
    }
  }
  return undefined;
};

/** What the text-style executor did — surfaced to the UI + asserted by the harness. */
export type TextStyleApplyResult = {
  total: number;
  created: number;
  /** styles NOT written because their font/style wouldn't load (skip-with-warning). */
  skipped: { name: string; reason: string }[];
  /** bound-variable links written (fontFamily/fontSize/fontWeight across the applied styles). */
  bound: number;
  /** bound target var names not found (should be empty — the var plan writes them first). */
  misses: string[];
  /** rows whose emitted style name was corrected against the family's real styles (#499) — e.g. the
   *  plan asked for `Semi Bold` and the family spells it `SemiBold`. Zero means every guess was already
   *  right (or no font library was available to check against). */
  resolvedStyles: number;
};

/**
 * Materialise the Text Style plan into Figma. Idempotent find-by-name → reuse+overwrite, else create.
 * Per row: load the font (skip-with-warning on failure), set the baked literals, then bind the three
 * variable-backed props. Assumes `applyVarCollectionPlan` already wrote `core-font`/`type-sets` (so the
 * bound targets exist); a missing target is recorded in `misses` but doesn't abort.
 */
export const applyTextStylePlan = async (plan: TextStylePlan, api: TextStylesApi): Promise<TextStyleApplyResult> => {
  const byName = new Map((await api.getLocalTextStylesAsync()).map((s) => [s.name, s] as const));
  // Unfiltered — the bound targets are STRING (family) + FLOAT (size/weight) vars (the #146 lesson).
  const varByName = new Map((await api.getLocalVariablesAsync()).map((v) => [v.name, v] as const));

  // family → its real style names (#499). Fetched ONCE for the whole plan: Figma returns one entry per
  // (family, style) pair — ~11k for a full library — and every row would otherwise re-ask. A host that
  // does not offer the call, or one whose call fails, leaves this empty and every row falls back to the
  // plan's emitted style, i.e. exactly the pre-#499 behavior. A resolver that cannot see the library
  // must not be worse than no resolver.
  const stylesByFamily = new Map<string, string[]>();
  try {
    for (const f of (await api.listAvailableFontsAsync?.()) ?? []) {
      const list = stylesByFamily.get(f.fontName.family);
      if (list) list.push(f.fontName.style);
      else stylesByFamily.set(f.fontName.family, [f.fontName.style]);
    }
  } catch {
    /* library unavailable — fall through to the emitted guess, same as before #499 */
  }

  let created = 0;
  let resolvedStyles = 0;
  let bound = 0;
  const skipped: { name: string; reason: string }[] = [];
  const misses: string[] = [];

  for (const row of plan) {
    // Resolve the plan's guessed style against what this family actually has (#499). With no library
    // in hand the guess stands unchanged. `resolveFontStyle` returning undefined means the family
    // really lacks the weight under any spelling — keep the emitted name so the skip reason names what
    // was ASKED FOR rather than some near-miss the resolver considered.
    const available = stylesByFamily.get(row.fontFamilyPrimary);
    const style = (available && resolveFontStyle(available, row.fontStyle)) || row.fontStyle;
    if (style !== row.fontStyle) resolvedStyles++;
    // Load the font first — skip-with-warning if it (or the specific style) isn't available.
    try {
      await api.loadFontAsync({ family: row.fontFamilyPrimary, style });
    } catch (e) {
      skipped.push({ name: row.name, reason: `font unavailable: ${row.fontFamilyPrimary} ${style}${(e as Error)?.message ? ` (${(e as Error).message})` : ''}` });
      continue;
    }

    let s = byName.get(row.name);
    if (!s) { s = api.createTextStyle(); s.name = row.name; byName.set(row.name, s); created++; }

    // Baked literals (the correct fallback value even before/without a variable binding).
    // `description` is what a designer reads in the Figma style panel to know what a rung is FOR —
    // the plan has always carried it and this executor silently dropped it, so the sibling
    // `materialise-to-figma.ts` paste path would have written it and the plugin would not.
    s.description = row.description;
    s.fontName = { family: row.fontFamilyPrimary, style };   // the RESOLVED style — must match what was loaded
    s.lineHeight = { unit: 'PERCENT', value: row.lineHeightPct };
    s.letterSpacing = { unit: 'PERCENT', value: row.letterSpacingPct };
    s.textCase = row.textCase;
    s.textDecoration = row.textDecoration;

    // Bind the variable-backed props. The binding overrides the literal; a missing target is a miss
    // (shouldn't happen — the var plan ran first — but recorded honestly, never thrown).
    const bind = (field: 'fontFamily' | 'fontSize' | 'fontWeight', name: string): void => {
      if (!name) return;
      const v = varByName.get(name);
      if (!v) { misses.push(`${row.name}.${field} -> ${name}`); return; }
      s!.setBoundVariable(field, v);
      bound++;
    };
    bind('fontFamily', row.fontFamilyVar);
    bind('fontSize', row.fontSizeVar);
    bind('fontWeight', row.fontWeightVar);
  }

  return { total: plan.length, created, skipped, bound, misses, resolvedStyles };
};
