/**
 * The component catalog (UI redesign S8.1): every component set the engine defines, as the Components page lists it,
 * computed by a pure function with no DOM and no import of the definitions themselves.
 *
 * WHAT AN ENTRY SAYS. Its id, name, category and one-line summary (the definition's own); whether it can be built, and
 * when not, why; how many members a build writes and in which unit (`variants` of one set, or separate `components`
 * for a definition built that way, #1623); and which other sets it nests, which a build makes first when the file
 * lacks them (#1633).
 *
 * BUILDABLE IS ASKED, NOT LISTED (#804, #869; the reasoning moved here from `main.ts`'s `COMPONENT_CATALOGUE`).
 *   · A definition that declares `figmaProperties.notStandalone` cannot render standalone and is withheld, its reason
 *     its own string. Checked BEFORE projecting: the projection succeeds for exactly the definition this excludes.
 *   · Otherwise the projector is run, and a throw is the SIGNAL that it cannot build a Figma set from the definition
 *     (no `anatomy`, no `figmaProperties`); the reason is `null`, which the page states in its own words.
 *   · The member count is the projection's length, the only honest per-set cost (a run is about 162 ms a member,
 *     #700, and the sets span 2 to 432).
 *
 * NESTED SETS are read off the PROJECTED PLANS, the same two fields the plugin's dependency pre-build reads
 * (`apps/plugin/src/build-deps.ts`): a node's `nestTarget` (a definition id) and its `swapTarget` (a component name
 * whose `<id>/` prefix names a definition built as separate components). A name no definition produces is the file's
 * to supply and is left out; a set never nests itself. Direct nests only, in first-seen order.
 *
 * WHY THE DEFINITIONS ARE HANDED IN. One reference to `componentDefs` in the web bundle carries every definition's
 * prose (about 35 KB gzip), so this module imports only their TYPES. Two callers hand them in:
 *   · the plugin's iframe entry (`apps/plugin/src/ui/component-catalog.ts`) computes the catalog from the
 *     definitions it already bundles and provides it here (`provideCatalog`) before the studio boots;
 *   · `apps/studio/gen-component-catalog.ts` computes it at build time and writes the web's copy as data
 *     (`component-catalog-data.ts`, T1); `test-component-catalog.ts` fails while that copy is stale, and
 *     `vercel-ignore-check.mjs` fails by name if a definition module enters the web bundle.
 */
import type { ComponentDef } from '@prism3/engine/component-schema';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { COMPONENT_CATALOG_DATA } from './component-catalog-data';

/** The swap target a projection is run with: the plugin's own (`build-deps.ts`'s `SWAP_TARGET`), so the swap names a
 *  plan carries are the ones a build resolves. Restated as a literal because the studio cannot import the plugin;
 *  `test-component-catalog.ts` holds the two equal. */
export const CATALOG_SWAP_TARGET = 'icon/FPO-default-icon';

export type CatalogEntry = {
  id: string;
  name: string;
  category: string;
  /** The definition's one-line summary. */
  summary: string;
  /** Whether a build is offered. */
  buildable: boolean;
  /** Why not, when not buildable: the definition's own `notStandalone` string, or `null` when the projector cannot
   *  build it. Always `null` for a buildable set. */
  reason: string | null;
  /** Members a build writes, or `null` when not buildable. */
  members: number | null;
  /** `components` for a definition built as separate top-level components (`emitAsComponents`), else `variants`. */
  unit: 'variants' | 'components';
  /** The ids of the sets this one nests, in first-seen order. Empty when not buildable. */
  nests: string[];
  /** The spacing that follows density (UI redesign S8.2): each `densitySpacing` key, `{size}` expanded over the
   *  definition's sizes, with the COMFORTABLE `space.*` step it binds. The px at a brand's density is the brand's to
   *  compute (`densitySpacingStep`, then the brand's space ladder), so the catalog holds the steps, never px. Empty for
   *  a set whose spacing does not follow density. */
  spacing: { key: string; ref: string }[];
};
export type Catalog = readonly CatalogEntry[];

type PlanNode = { nestTarget?: string; swapTarget?: string; children?: readonly unknown[] };

/** The catalog of `defs`, in their order. `project` is the projector (`figmaAnatomySet` with
 *  `CATALOG_SWAP_TARGET`); it throws for a definition it cannot build. */
/** A definition's density-following spacing as the catalog states it: the keys its `densitySpacing` names, each
 *  `{size}` expanded over the sizes the definition declares (`variants.size`, else the code API's `props.size`), with
 *  the comfortable step each binds. Restated here rather than imported from `component-schema.ts`, which the web
 *  bundle must not carry; `test-component-catalog.ts` holds it equal to the schema's own `densitySpacingKeys`. */
export const spacingOf = (d: ComponentDef): { key: string; ref: string }[] => {
  const sizes = (d.variants as Record<string, readonly string[] | undefined> | undefined)?.size ?? d.props.find((p) => p.name === 'size')?.values ?? [];
  const keys = (d.densitySpacing ?? []).flatMap((k) => (k.includes('{size}') ? sizes.map((v) => k.replace('{size}', v)) : [k]));
  return keys.map((key) => ({ key, ref: String(d.tokens[key]) }));
};

export const catalogOf = (defs: readonly ComponentDef[], project: (def: ComponentDef) => readonly AnatomyPlan[]): CatalogEntry[] =>
  defs.map((d) => {
    const base = { id: d.id, name: d.name, category: d.category, summary: d.summary, unit: d.figmaProperties?.emitAsComponents === true ? 'components' as const : 'variants' as const, spacing: spacingOf(d) };
    const no = (reason: string | null): CatalogEntry => ({ ...base, buildable: false, reason, members: null, nests: [] });
    if (d.figmaProperties?.notStandalone) return no(d.figmaProperties.notStandalone);
    let plans: readonly AnatomyPlan[];
    try { plans = project(d); } catch { return no(null); }
    const nests: string[] = [];
    const add = (name: string | undefined): void => {
      if (!name) return;
      const dep = defs.find((x) => x.id === name || (!!x.figmaProperties?.emitAsComponents && name.startsWith(`${x.id}/`)));
      if (dep && dep.id !== d.id && !nests.includes(dep.id)) nests.push(dep.id);
    };
    const walk = (n: PlanNode): void => { add(n.nestTarget); add(n.swapTarget); for (const c of (n.children ?? []) as PlanNode[]) walk(c); };
    for (const p of plans) walk(p.root as unknown as PlanNode);
    return { ...base, buildable: true, reason: null, members: plans.length, nests };
  });

/** The sets a build is offered for, as the legacy picker lists them. */
export const buildableSets = (c: Catalog): CatalogEntry[] => c.filter((e) => e.buildable);
/** The sets not offered, each with its reason. */
export const unbuildableSets = (c: Catalog): CatalogEntry[] => c.filter((e) => !e.buildable);

// ── the plugin's copy ───────────────────────────────────────────────────────────────────────────────
// The plugin computes the catalog from the definitions it bundles and hands it here before `main.ts` evaluates
// (`apps/plugin/src/ui/entry.ts` imports its provider first). The web never provides one: it reads the generated data.
let provided: Catalog | null = null;
/** Set the catalog the plugin computed. */
export const provideCatalog = (c: Catalog): void => { provided = c; };
/** The catalog the plugin provided, or `null` when none was (the web, or a plugin entry that forgot). */
export const providedCatalog = (): Catalog | null => provided;
/** The catalog this host lists (UI redesign S8.2, moved from `main.ts`): the plugin's own computation, or the web's
 *  generated copy. `PRISM3_HOST` is a build-time define, so each bundle keeps one branch; the generated copy is data
 *  only, so the plugin bundle drops it. */
export const componentCatalog = (): Catalog => (PRISM3_HOST === 'figma' ? provided ?? [] : COMPONENT_CATALOG_DATA);
