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
  /** The def that leads the page's one usage panel (#2927, owner decision Q551 A on Q1 and Q2): the panel opens with
   *  its overview and anatomy and sits beside its set. Named on every page with more than one def (`assertCoverage`);
   *  a page with one def is led by it. */
  readonly lead?: string;
  /** True for the one leaf that holds the plugin-only template assets (`_Section-header`, `_Headings`),
   *  which are built by a targeted constructor rather than projected from a def. */
  readonly fileComponents?: boolean;
}

/** A section: an empty header page (also its left-rail label) + its ordered leaves. A native `---`
 *  divider precedes every section. */
export interface TaxonomySection {
  readonly header: string;
  readonly leaves: readonly TaxonomyLeaf[];
  /** True where the section's pages sit in ALPHABETICAL order in the file, by visible name, case-insensitive
   *  (#2568, owner decision Q260 A): a new page is inserted at its place, and the in-place Update reorders the
   *  existing ones. Unset, the leaves keep the order listed here. */
  readonly alphabetical?: boolean;
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
        // Provider logos (#3148, owner decision on Q847): the second icon type, beside the icon set on its page. They had a
        // "Brand marks" page of their own (#2343); a file built then has its marks moved here (`FORMER_PAGES`).
        { page: 'Icons & assets', defs: ['icon', 'provider-logo'], lead: 'icon' },
        { page: 'Grids & layouts', defs: [] },
      ],
    },
    {
      header: 'Components',
      // Alphabetical in the file (#2568, owner decision Q260 A); the list below is no longer the page order.
      alphabetical: true,
      leaves: [
        // Button.Group (#2661, owner decision Q363) joins the Button family's page: it nests the Button, built first.
        // LEADS (#2927, Q551 A): the owner named Button, and the Row for Checkbox, Radio and Switch. The other pages'
        // leads (the plain variant, or the composite over its building block) are DRAFT, held for the owner in the PR.
        { page: 'Buttons', defs: ['button', 'button-destructive', 'button-neutral', 'button-group'], lead: 'button' },
        { page: 'Icon button', defs: ['icon-button', 'icon-button-destructive', 'icon-button-neutral'], lead: 'icon-button' },
        // #2343 PR 4: the express-checkout button a wallet provider draws. Its own page, DRAFT, held for the owner (Q-W4).
        { page: 'Wallet button', defs: ['wallet-button'], lead: 'wallet-button' },
        // #2343 PR 5: the social sign-in button Prism3 draws to each provider's rules. Its own page (owner decision Q-S10 A).
        { page: 'Sign-in button', defs: ['sign-in-button'], lead: 'sign-in-button' },
        { page: 'Checkbox', defs: ['checkbox-control', 'checkbox-row', 'checkbox-group'], lead: 'checkbox-row' },
        { page: 'Radio', defs: ['radio-control', 'radio-row', 'radio-group'], lead: 'radio-row' },
        { page: 'Switch', defs: ['switch-control', 'switch-row'], lead: 'switch-row' },
        { page: 'Select', defs: ['select'] },
        { page: 'Text field', defs: ['text-field'] },
        // Password field (#2317, owner decision Q301.9 B) — its own page under Components, as Counter's is. It nests
        // Button, whose page is earlier in this list, so the nest resolves when the file is built in order.
        { page: 'Password field', defs: ['password-field'] },
        // Code input (#2428, owner decision Q321.14 A) — its own page under Components, as Password field's is. The Code cell
        // shares it (#2989, Q656 A), built first so the field's `items` slot resolves against it on the same page.
        { page: 'Code input', defs: ['code-input-cell', 'code-input'], lead: 'code-input' },
        // Search field (#2888) — its own page under Components, as the Password field's is.
        { page: 'Search field', defs: ['search-field'] },
        // Card number field (#2343 PR 4) — its own page under Components, as the Search field's is (DRAFT, held for the
        // owner in the PR). Its tile slot starts at a provider logo, built first from the Icons & assets page.
        { page: 'Card number field', defs: ['card-number-field'] },
        { page: 'Textarea', defs: ['textarea'] },
        { page: 'Veil', defs: ['veil'] },
        // Badge — under Components, owner-decided 2026-10-04 (S8 scope, O1).
        { page: 'Badge', defs: ['badge'] },
        // Tag — under Components beside Badge, owner-decided 2026-10-04 (S8 scope, O1). It nests
        // IconButton.Neutral, whose page is earlier in this list, so the nest resolves when the file is built in order.
        { page: 'Tag', defs: ['tag'] },
        // Tabs — its own page under Components, owner-decided 2026-10-09 (#2416 Q177.14: no navigation grouping,
        // no new section). Tab builds first, so the list's nested tabs resolve against it on the same page.
        { page: 'Tabs', defs: ['tab-item', 'tabs'], lead: 'tabs' },
        // Segmented control (#2418, owner Q269.7) — its own page under Components, after Tabs. The option builds
        // first, so the control's nested options resolve against it on the same page, as Tabs' do.
        { page: 'Segmented control', defs: ['segmented-control-segment', 'segmented-control'], lead: 'segmented-control' },
        // Divider (#2455) — its own page, as the issue asks. Under Components beside the components that nest
        // it next (Accordion, #2417); the section is the owner's call and held as DRAFT in the PR.
        { page: 'Divider', defs: ['divider'] },
        // Accordion (#2417) — its own page under Components after Divider, which it nests (DRAFT, owner item). Its
        // building-block indicator builds first on the same page, so the header's nests resolve as Tabs' do.
        { page: 'Accordion', defs: ['_accordion-indicator', 'accordion'], lead: 'accordion' },
        // List (#2319, owner decision Q273.7) — its own page under Components, List.Item beside it. The item builds first,
        // so the list's nested items resolve against it on the same page.
        { page: 'List', defs: ['list-item', 'list'], lead: 'list' },
        // Link (#2580) — its own page under Components. The proposal named a navigation section; none exists (Tabs
        // went under Components, Q177.14), so the section is held as an owner item in the PR.
        { page: 'Link', defs: ['link'] },
        // Dialog (#2609, owner decision Q303.12 A) — its own page under Components, every placement on it. It nests the
        // Neutral IconButton, the Divider and the Button, which the build places first wherever their pages sort.
        { page: 'Dialog', defs: ['dialog'] },
        // Banner (#2579, Q327) — its own page under Components. The proposal named a feedback section; none exists, so the
        // section is held as an owner item in the PR, as Link's was. It nests Button.Neutral and FlushIconButton.Neutral.
        { page: 'Banner', defs: ['banner'] },
        // Breadcrumbs (#2666, owner call 15 A) — its own page under Components. Its step and the step's separator share it
        // (#2989, owner decision Q656 A: a part only one component nests sits on that component's page); they build first,
        // so the items slot resolves against them on the same page, as Tabs' does. Link builds wherever its page sorts.
        { page: 'Breadcrumbs', defs: ['_breadcrumb-separator', 'breadcrumb-item', 'breadcrumbs'], lead: 'breadcrumbs' },
        // Toast (#2668, owner call 12 A) — its own page under Components, sorted alphabetically (Q260 A). It nests the
        // Button and the FlushIconButton.Neutral, which the build places first wherever their pages sort.
        { page: 'Toast', defs: ['toast'] },
        // Counter (#2427, owner decision Q283.14 A) — its own page, alphabetical under Components (between Checkbox and
        // Divider). It nests FlushIconButton.Neutral, whose page is under Subcomponents.
        { page: 'Counter', defs: ['counter'] },
        // Pagination (#2665, owner call 16 A) — its own page under Components, Pagination.Item beside it. The item builds
        // first, so the row's slot items resolve against it on the same page; IconButton and Button build wherever their
        // pages sort, before it.
        { page: 'Pagination', defs: ['pagination-item', 'pagination'], lead: 'pagination' },
        // Progress (#2670, owner call 10 A) — its own page under Components. It nests the Field Message, which the build
        // places first wherever its page sorts. The Spinner stays under Subcomponents (#1670).
        { page: 'Progress', defs: ['progress'] },
        // Slider (#2669, owner call 9 A) — its own page under Components, sorted alphabetically (Q260 A). Its thumb builds
        // first, so the slider's two nested thumbs resolve against it on the same page, as Tabs' do.
        { page: 'Slider', defs: ['_slider-thumb', 'slider'], lead: 'slider' },
      ],
    },
    {
      header: 'Subcomponents',
      // Alphabetical in the file too (#2568, owner decision Q265 B), each section within itself; the list below is
      // no longer the page order.
      alphabetical: true,
      leaves: [
        { page: 'Image Placeholder', defs: ['image-placeholder'] },
        { page: 'Focus Ring', defs: ['focus-ring'] },
        { page: 'Field Label', defs: ['field-label'] },
        { page: 'Field Message', defs: ['field-message'] },
        // #2457 — the flush icon button, under Subcomponents (owner decision Q283.14 A on #2427): it is made to be nested,
        // in a counter first. Placed alphabetically in the file by the section's own rule. Three families on one page, as
        // the Icon button page carries IconButton's three (Q295.2 B).
        { page: 'Flush Icon Button', defs: ['flush-icon-button', 'flush-icon-button-destructive', 'flush-icon-button-neutral'], lead: 'flush-icon-button' },
        // #1670 — owner-decided 2026-09-26: the spinner sits under Subcomponents, beside the other parts a
        // host swaps or nests in (the button's pending state swaps it into its icon slot).
        { page: 'Spinner', defs: ['spinner'] },
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

/**
 * A PART ONE COMPONENT NESTS SITS ON THAT COMPONENT'S PAGE (#2989, owner decision Q656 A). The Subcomponents section
 * keeps the parts several components nest (Spinner, the flush icon buttons); a part only one component nests shares
 * its consumer's page, as Tabs, Pagination, Accordion, Segmented control and List already did.
 *
 * The defs listed here are nested by exactly one other def and still keep a page of their own, because a designer
 * places them on their own too: they are components that happen to have one host today, not parts. Each names the
 * owner decision that placed it. `assertPartPages` fails by name on a single-consumer def on another page that is
 * not listed, and on a listed def that no longer is one (a stale entry).
 */
export const STANDALONE_NESTED: Readonly<Record<string, string>> = {
  // Badge: under Components, owner-decided 2026-10-04 (S8 scope, O1). Tab.Item nests it; a designer places it anywhere.
  badge: 'S8 scope, O1',
  // Button.Group: on the Buttons page (#2661, owner decision Q363). Dialog nests it; a designer places it in any footer.
  'button-group': '#2661, Q363',
  // Text field: its own page under Components. Slider (#2669) nests it for the value input; a designer places it anywhere.
  'text-field': 'Text field page; nested by Slider since #2669',
};

/**
 * WHERE A SET USED TO BUILD (#2989) — the pages an earlier taxonomy placed a def on, which an existing file can still
 * hold. Update and Set up file move a Prism3 set found on one of these pages onto the page the taxonomy names now
 * (`page-moves.ts`); a set on any other page is where a designer put it, and stays. Pages are never deleted: one left
 * empty is reported as safe to delete.
 */
export const FORMER_PAGES: readonly { readonly page: string; readonly defs: readonly string[]; readonly by: string }[] = [
  { page: 'Breadcrumb Item', defs: ['_breadcrumb-separator', 'breadcrumb-item'], by: '#2989' },
  { page: 'Code Cell', defs: ['code-input-cell'], by: '#2989' },
  // The provider logos' own page (#2343) until they joined the icons on Icons & assets (#3148). The page stays.
  { page: 'Brand marks', defs: ['provider-logo'], by: '#3148' },
];

/**
 * WHERE A STYLE-GUIDE TABLE USED TO BE DRAWN (#3171, owner decision Q3171.7 A) — the pages an earlier build drew a table on,
 * which an existing file can still hold. `table` names the kind of table (`container`, the Container table). Update file
 * and the style-guide run move a table Prism3 drew that is found on one of these pages onto the page it is drawn on now
 * (`relocateTables`, `style-guide.ts`); a copy, and a table a designer moved elsewhere, stay. No page is ever deleted.
 */
export const FORMER_TABLE_PAGES: readonly { readonly page: string; readonly table: 'container'; readonly by: string }[] = [
  // The Container table sat in the Dimensions group until it joined the grid styles on Grids & layouts (#3171).
  { page: 'Primitive tokens', table: 'container', by: '#3171' },
];

/** Owner-approved wording (#2989, Q3 A, 2026-10-24), without its full stop: things moved to the page the file now puts
 *  them on, each by name, as the dry run lists them and as the apply reports them done. A set is named by its def id
 *  (`page-moves.ts`), a style-guide table by its frame's name (#3171). Empty when nothing moves. */
export const movesClause = (moves: readonly { name: string; from: string; to: string }[] | undefined, done: boolean): string =>
  moves?.length ? `${done ? 'Moved' : 'To move'} to ${moves.length === 1 ? 'its page' : 'their pages'}: ${moves.map((m) => `${m.name} (${m.from.slice(NEST_PREFIX.length)} to ${m.to.slice(NEST_PREFIX.length)})`).join(', ')}` : '';

/**
 * EVERY DEF THAT NESTS EACH DEF, read off the defs themselves: any `nests` naming another def, at any depth (an anatomy
 * part, a slot's default items). Never off this file (`docs/34`): the defs are the oracle, the pages the subject.
 * `prefers` (a soft preference, never a requirement) is not `nests`, so it does not count.
 */
export const consumersOf = (defs: readonly { readonly id: string }[]): Map<string, Set<string>> => {
  const out = new Map<string, Set<string>>();
  const walk = (v: unknown, owner: string): void => {
    if (Array.isArray(v)) { for (const x of v) walk(x, owner); return; }
    if (!v || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) {
      if (k === 'nests' && typeof x === 'string') { if (x !== owner) out.set(x, (out.get(x) ?? new Set()).add(owner)); }
      else walk(x, owner);
    }
  };
  for (const d of defs) walk(d, d.id);
  return out;
};

/**
 * ASSERT EVERY SINGLE-CONSUMER PART SITS ON ITS CONSUMER'S PAGE (#2989). Returns the problems as strings (empty =
 * clean), each naming the part, its page, its consumer and the consumer's page; `test-file-setup.ts` fails by name on
 * any. A def in `STANDALONE_NESTED` is exempt, and a listed def that is no longer nested by exactly one def on another
 * page is reported as stale, so the exemption cannot outlive its reason.
 */
export const assertPartPages = (defs: readonly { readonly id: string }[], t: Taxonomy = TAXONOMY, standalone: Readonly<Record<string, string>> = STANDALONE_NESTED): string[] => {
  const problems: string[] = [];
  const consumers = consumersOf(defs);
  const ids = new Set(defs.map((d) => d.id));
  const away = new Set<string>();
  for (const [part, by] of consumers) {
    if (by.size !== 1 || !ids.has(part)) continue;
    const consumer = [...by][0];
    const here = leafForDef(part, t)?.leaf.page;
    const there = leafForDef(consumer, t)?.leaf.page;
    if (!here || !there || here === there) continue;
    away.add(part);
    if (!(part in standalone))
      problems.push(`part '${part}' is nested only by '${consumer}' but sits on page '${here}', not on '${there}' with it — a part one component nests shares that component's page (#2989)`);
  }
  for (const id of Object.keys(standalone))
    if (!away.has(id))
      problems.push(`STANDALONE_NESTED names '${id}', which is not nested by exactly one def on another page — a stale exemption`);
  return problems;
};

/** The def that leads a leaf's usage panel: its `lead`, or its one def. Undefined for a leaf with no def. */
export const leadOf = (leaf: TaxonomyLeaf): string | undefined => leaf.lead ?? (leaf.defs.length === 1 ? leaf.defs[0] : undefined);

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
 * Catches four defects (the fourth, #2927: a page of several defs that names no lead, or a lead not on it): a registered id no leaf places and no exclusion names (the silent-drop case
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
  // #2927: a page of several defs names which one leads its usage panel, and that one is on the page.
  for (const { leaf } of allLeaves(t)) {
    if (leaf.defs.length > 1 && !leaf.lead)
      problems.push(`page '${leaf.page}' holds ${leaf.defs.length} defs and names no lead — its usage panel needs one`);
    if (leaf.lead && !leaf.defs.includes(leaf.lead))
      problems.push(`page '${leaf.page}' names lead '${leaf.lead}', which is not one of its defs`);
  }
  for (const id of placement.keys())
    if (!registered.has(id))
      problems.push(`page mapping names def '${id}', which is not in componentDefs — a stale mapping left by a rename or deletion`);
  for (const id of excluded)
    if (!registered.has(id))
      problems.push(`EXCLUDED_DEFS names def '${id}', which is not in componentDefs — a stale exclusion`);

  return problems;
};
