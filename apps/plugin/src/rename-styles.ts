/**
 * Prism3 Figma plugin — the STYLE RENAME pass (#1040, `docs/44` §10.1).
 *
 * The style writers (`write-styles.ts`, `write-text-styles.ts`) find a style by name and reuse it, else create
 * one. That is right for a re-apply and wrong for a rename: a style the engine now names differently is created
 * fresh, and the old one stays behind holding every layer and every library consumer that used it. Figma's
 * `BaseStyle.name` is writable and its `id` is not, so setting the name moves the style and keeps its links,
 * which is what #1013 did for variables. This pass does it for text, effect and gradient paint styles, from the
 * engine's record (`STYLE_RENAMES` in `@prism3/engine/materialization-renames`), BEFORE the writer runs. The
 * writer then finds the renamed style under its new name and overwrites it as it would any other.
 *
 * A PRE-PASS, NOT A WRITER CHANGE, for the same reason the variable rename pass is (`beginMigration` in
 * `write-figma.ts`): both callers, Apply Theme (`apply-theme.ts`) and the paste path (`mcp-steps.ts`), run it
 * just before the writer, so one rule decides what moved and both routes do the same thing.
 *
 * OWNERSHIP, NOT NAME. A style is renamed only when it is Prism3's: it carries the ownership mark
 * (`provenance.ts`, #1884), or, for one written before the mark, the engine's own description signature
 * (`isEngineDescription`, the evidence Clean up already accepts). A client's style that happens to match a rule
 * is never renamed (`not-ours`). The grid writer's #2467 rename applies the same guard.
 *
 * NOTHING HERE IS NEW UI COPY. The outcomes are returned as data (Apply Theme's result, the paste step's
 * report) and no summary line prints them yet: wording one is a voice decision, flagged on #1040.
 *
 * Compiled under `tsconfig.main.json`. The ports are the slices of `figma` the pass touches.
 */
import { STYLE_RENAMES, planStyleRenames, type StyleRule, type StyleRenameStep, type StylesPlan, type TextStylePlan } from '@prism3/engine/figma';
import { isMarkedOwned, type Markable } from './provenance';
import { isEngineDescription, type StyleKind } from './prune-figma';

/** The slice of a style the pass reads and writes. */
export interface RenamableStyle extends Markable { name: string; description: string }

/** One planned rename and what happened to it. `applied` is true only for a style that now carries the new name
 *  under its old id; every other row says why not (`status`, or `not-ours` for a style that is not Prism3's). */
export type StyleRenameOutcome = StyleRenameStep & { applied: boolean; notOurs?: true };

/**
 * Rename, in place, every existing style of one collection that a recorded rule moves onto a planned name. Pure
 * apart from the `name` writes it makes on the styles it is handed.
 */
export const renameStyles = (
  collection: string,
  kind: StyleKind,
  live: readonly RenamableStyle[],
  planned: readonly string[],
  rules: readonly StyleRule[] = STYLE_RENAMES,
): StyleRenameOutcome[] => {
  const ours = (s: RenamableStyle): boolean => isMarkedOwned(s) || isEngineDescription(kind, s.description ?? '', planned);
  // Only Prism3's styles are offered to the planner, so a client's style can neither be renamed nor count as a
  // second source onto one target. A client's style under the TARGET name is still in `existing` below, so a
  // rename onto it is refused as `target-exists` rather than putting two styles under one name.
  const steps = planStyleRenames(collection, live.filter(ours).map((s) => s.name), planned, rules);
  const out: StyleRenameOutcome[] = [];
  for (const step of steps) {
    const status = step.status === 'rename' && live.some((s) => s.name === step.to) ? 'target-exists' : step.status;
    const s = live.find((x) => x.name === step.from && ours(x));
    if (status !== 'rename' || !s) { out.push({ ...step, status, applied: false }); continue; }
    s.name = step.to;
    out.push({ ...step, status, applied: true });
  }
  // A client's style a rule would move: reported, never touched.
  for (const s of live.filter((x) => !ours(x)))
    for (const step of planStyleRenames(collection, [s.name], planned, rules))
      out.push({ ...step, applied: false, notOurs: true });
  return out;
};

/** The effect- and paint-style slice of `figma` the pass needs (`StylesApi` in `write-styles.ts` is a superset). */
export interface EffectPaintStylesPort {
  getLocalEffectStylesAsync(): Promise<RenamableStyle[]>;
  getLocalPaintStylesAsync(): Promise<RenamableStyle[]>;
}

/** The pass for the styles plan: shadows are effect styles in `shadow-styles`, gradients paint styles in
 *  `gradient-styles`. Run before `applyStylesPlan`. */
export const renameStylesForPlan = async (
  plan: StylesPlan,
  api: EffectPaintStylesPort,
  rules: readonly StyleRule[] = STYLE_RENAMES,
): Promise<StyleRenameOutcome[]> => {
  if (!rules.length) return [];
  return [
    ...renameStyles('shadow-styles', 'effect', await api.getLocalEffectStylesAsync(), plan.effects.map((r) => r.name), rules),
    ...renameStyles('gradient-styles', 'paint', await api.getLocalPaintStylesAsync(), plan.paints.map((r) => r.name), rules),
  ];
};

/** The text-style slice of `figma` the pass needs. */
export interface TextStylesPort { getLocalTextStylesAsync(): Promise<RenamableStyle[]> }

/** The pass for the text-style plan. Run before `applyTextStylePlan`. */
export const renameTextStylesForPlan = async (
  plan: TextStylePlan,
  api: TextStylesPort,
  rules: readonly StyleRule[] = STYLE_RENAMES,
): Promise<StyleRenameOutcome[]> => {
  if (!rules.length) return [];
  return renameStyles('text-styles', 'text', await api.getLocalTextStylesAsync(), plan.map((r) => r.name), rules);
};
