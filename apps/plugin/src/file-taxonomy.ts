/**
 * THE FILE TAXONOMY (#1554) — the page-per-component structure as EDITABLE DATA, not hardcoded logic.
 *
 * The owner-confirmed left-rail layout of a themed Prism3 file: a `Cover`, native `---` divider pages
 * between sections, empty section-header pages (`Foundations`/`Components`/`Subcomponents`/`Sandbox`),
 * and one `↳ <name>` page per component family. This module holds that structure as a single config
 * object so the page list and the def→page mapping are DATA a later edit changes in one place — the
 * page-scaffolding code in `file-setup.ts` reads it, it hardcodes none of it.
 *
 * THE CONFIG IS THE SOURCE OF TRUTH FOR TWO CONSUMERS, and they split on one field:
 *   • `file-setup` (the skeleton) OWNS every leaf whose `defs` is EMPTY — the Foundations placeholders
 *     and the `File Components` sandbox page. It pre-creates those, plus Cover, the dividers and the
 *     section headers.
 *   • the page-aware `build-components` (item 3) OWNS every leaf whose `defs` is NON-EMPTY — those pages
 *     are created ON DEMAND when their component is built (`resolveComponentPage`), so an unbuilt
 *     component leaves no empty page behind. `Icons & assets` (the `icon` def) is the one Foundations
 *     leaf on this side of the split.
 *
 * COVERAGE IS ASSERTED AGAINST `componentDefs`, NOT RESTATED HERE. `assertCoverage` reads the real
 * registry and fails by name if a def is neither mapped to a leaf nor named in `EXCLUDED_DEFS` — so a
 * def added to the engine that nobody placed here is caught rather than silently dropped onto whatever
 * page the designer was on (`docs/34`: the oracle is the registry, this file is the subject). It is
 * driven by `test-file-setup.ts`, an arm of the plugin `test` gate.
 */

/** The nesting prefix on every component page name — U+21B3 (DOWNWARDS ARROW WITH TIP RIGHTWARDS) + a
 *  space. `Cover` and the section headers carry NO prefix; only leaves do. Kept as a named constant
 *  because it is written into page names and matched back out of them, and the two must not drift. */
export const NEST_PREFIX = '↳ ';

/** A leaf (component) page under a section. */
export interface TaxonomyLeaf {
  /** The page name WITHOUT the `↳ ` prefix (the prefix is added when the page is created / matched). */
  readonly page: string;
  /** The `componentDefs` ids that build onto this page, in build order. EMPTY marks a page `file-setup`
   *  pre-creates as an empty placeholder (or the File Components sandbox page); non-empty marks a page
   *  the page-aware build creates on demand. */
  readonly defs: readonly string[];
  /** True for the one leaf that holds the plugin-only template assets (`_Section-header`, `_Headings`),
   *  which are built by a targeted constructor rather than projected from a def. */
  readonly fileComponents?: boolean;
}

/** A section: an empty header page (also its left-rail label) + its ordered leaves. A native `---`
 *  divider precedes every section. */
export interface TaxonomySection {
  readonly header: string;
  readonly leaves: readonly TaxonomyLeaf[];
}

export interface Taxonomy {
  /** The cover page (no prefix, no section, first in the file). */
  readonly cover: string;
  readonly sections: readonly TaxonomySection[];
}

/**
 * THE OWNER-CONFIRMED TAXONOMY (#1554, locked 2026-09-21). Order matters — it is the left-rail order.
 *
 * Section membership was the owner's call, not a technical one (`docs`/CLAUDE.md §6: design decisions
 * are the owner's), so it is recorded here verbatim rather than derived from any def field. The Switch
 * family and `veil` (placed under Components) and the retained `Subcomponents` name are the deltas the
 * final brief locked over the issue's earlier proposal.
 */
export const TAXONOMY: Taxonomy = {
  cover: 'Cover',
  sections: [
    {
      header: 'Foundations',
      leaves: [
        { page: 'Primitive tokens', defs: [] },
        { page: 'Semantic tokens', defs: [] },
        { page: 'Icons & assets', defs: ['icon'] },
        { page: 'Grids & layouts', defs: [] },
      ],
    },
    {
      header: 'Components',
      leaves: [
        { page: 'Buttons', defs: ['button', 'button-destructive', 'button-neutral'] },
        { page: 'Icon button', defs: ['icon-button', 'icon-button-destructive', 'icon-button-neutral'] },
        { page: 'Checkbox', defs: ['checkbox-control', 'checkbox-row', 'checkbox-group'] },
        { page: 'Radio', defs: ['radio-control', 'radio-row', 'radio-group'] },
        { page: 'Switch', defs: ['switch-control', 'switch-row'] },
        { page: 'Select', defs: ['select'] },
        { page: 'Text field', defs: ['text-field'] },
        { page: 'Textarea', defs: ['textarea'] },
        { page: 'Veil', defs: ['veil'] },
      ],
    },
    {
      header: 'Subcomponents',
      leaves: [
        { page: 'Image Placeholder', defs: ['image-placeholder'] },
        { page: 'Focus Ring', defs: ['focus-ring'] },
        { page: 'Field Label', defs: ['field-label'] },
        { page: 'Field Message', defs: ['field-message'] },
      ],
    },
    {
      header: 'Sandbox',
      leaves: [
        { page: 'File Components', defs: [], fileComponents: true },
      ],
    },
  ],
};

/** Ids intentionally NOT placed on any page. Empty today — every `componentDefs` id maps to a leaf.
 *  A control that is only ever nested and never built standalone would be listed here with a reason,
 *  rather than silently dropped (`assertCoverage` treats an unmapped, unexcluded id as a failure). */
export const EXCLUDED_DEFS: readonly string[] = [];

/** The full `↳ ` page name for a leaf. */
export const leafPageName = (leaf: TaxonomyLeaf): string => NEST_PREFIX + leaf.page;

/** Every (section, leaf) pair, flattened in file order — the shape both consumers iterate. */
export const allLeaves = (t: Taxonomy = TAXONOMY): { section: TaxonomySection; leaf: TaxonomyLeaf }[] =>
  t.sections.flatMap((section) => section.leaves.map((leaf) => ({ section, leaf })));

/** Find the (section, leaf) that a def id builds onto, or `null` if the id is not mapped. */
export const leafForDef = (
  defId: string,
  t: Taxonomy = TAXONOMY,
): { section: TaxonomySection; leaf: TaxonomyLeaf } | null =>
  allLeaves(t).find(({ leaf }) => leaf.defs.includes(defId)) ?? null;

/**
 * ASSERT EVERY REGISTERED DEF IS PLACED (or explicitly excluded). Reads the ids the caller pulls from
 * `componentDefs` — the registry is the oracle, this config is the subject. Returns the problems as
 * strings (empty = clean) so the caller decides how to fail; `test-file-setup.ts` fails by name on any.
 *
 * Catches three defects: a registered id no leaf places and no exclusion names (the silent-drop case
 * #1554 warns about); an id placed on more than one leaf (an ambiguous build target); and a mapped or
 * excluded id that no longer exists in the registry (a stale mapping left behind by a def deletion).
 */
export const assertCoverage = (registeredIds: readonly string[], t: Taxonomy = TAXONOMY): string[] => {
  const problems: string[] = [];
  const registered = new Set(registeredIds);
  const excluded = new Set(EXCLUDED_DEFS);

  // Every mapped id, with the leaves it appears on — to catch both the unmapped and the double-mapped case.
  const placement = new Map<string, string[]>();
  for (const { leaf } of allLeaves(t))
    for (const id of leaf.defs) placement.set(id, [...(placement.get(id) ?? []), leaf.page]);

  for (const id of registeredIds) {
    const pages = placement.get(id);
    if (!pages && !excluded.has(id))
      problems.push(`def '${id}' is registered in componentDefs but is neither mapped to a page nor in EXCLUDED_DEFS — it would land on whatever page the designer is on`);
    if (pages && pages.length > 1)
      problems.push(`def '${id}' is mapped to more than one page (${pages.join(', ')}) — a component family builds onto exactly one page`);
    if (pages && excluded.has(id))
      problems.push(`def '${id}' is both mapped to a page and listed in EXCLUDED_DEFS — pick one`);
  }
  for (const id of placement.keys())
    if (!registered.has(id))
      problems.push(`page mapping names def '${id}', which is not in componentDefs — a stale mapping left by a rename or deletion`);
  for (const id of excluded)
    if (!registered.has(id))
      problems.push(`EXCLUDED_DEFS names def '${id}', which is not in componentDefs — a stale exclusion`);

  return problems;
};
