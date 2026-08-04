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
 * `plugin/test-write-typography.ts`); the real `figma` structurally satisfies it.
 */
import type { TextStylePlan } from '../../Prism3/engine/write-plan';
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
}

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

  let created = 0;
  let bound = 0;
  const skipped: { name: string; reason: string }[] = [];
  const misses: string[] = [];

  for (const row of plan) {
    // Load the font first — skip-with-warning if it (or the specific style) isn't available.
    try {
      await api.loadFontAsync({ family: row.fontFamilyPrimary, style: row.fontStyle });
    } catch (e) {
      skipped.push({ name: row.name, reason: `font unavailable: ${row.fontFamilyPrimary} ${row.fontStyle}${(e as Error)?.message ? ` (${(e as Error).message})` : ''}` });
      continue;
    }

    let s = byName.get(row.name);
    if (!s) { s = api.createTextStyle(); s.name = row.name; byName.set(row.name, s); created++; }

    // Baked literals (the correct fallback value even before/without a variable binding).
    // `description` is what a designer reads in the Figma style panel to know what a rung is FOR —
    // the plan has always carried it and this executor silently dropped it, so the sibling
    // `materialise-to-figma.ts` paste path would have written it and the plugin would not.
    s.description = row.description;
    s.fontName = { family: row.fontFamilyPrimary, style: row.fontStyle };
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

  return { total: plan.length, created, skipped, bound, misses };
};
