/**
 * FILE SETUP (#1554) — the first page-creation code in the repo.
 *
 * Until now every write path hard-coded `figma.currentPage`; nothing anywhere called `figma.createPage`.
 * This module introduces page scaffolding: it reads the taxonomy (`file-taxonomy.ts`) and reconciles the
 * file's PAGE list to it — a `Cover`, native `---` divider pages between sections, empty section-header
 * pages, the empty Foundations placeholders, and the Sandbox `↳ File Components` page. It also exposes
 * `resolveComponentPage`, which the page-aware `build-components` uses to find-or-create the one
 * `↳ <family>` page a component set belongs on.
 *
 * TWO PROPERTIES CARRY THE WHOLE DESIGN:
 *   • IDEMPOTENT — a re-run finds pages by NAME and repositions in place; it never duplicates a named
 *     page, and it never deletes (the same additive posture as the theme write, which refuses to delete a
 *     page/variable it cannot prove is stale). Dividers are matched by `isPageDivider`, not by name,
 *     because `---` is deliberately non-unique.
 *   • NON-DESTRUCTIVE TO ON-DEMAND LEAVES — the component pages the build creates (`Icons & assets`,
 *     `Buttons`, …) sit BETWEEN file-setup's own pages, so the reconciler only pulls a page tight against
 *     its anchor when the page is newly created or currently sits BEFORE the anchor; a page already after
 *     its anchor is left where it is, so a re-run does not reorder a designer's built component pages.
 *
 * PORTED, NOT COUPLED TO `figma`: every document mutation goes through the `PagesApi` port so
 * `test-file-setup.ts` can drive it with an in-memory shim. The global `figma` satisfies the port
 * structurally (`DocumentNode.children`/`insertChild`/`appendChild`, `createPage`, `createPageDivider`,
 * `loadAllPagesAsync`) with no cast — the same shape every other executor's port takes.
 */
import { TAXONOMY, NEST_PREFIX, leafPageName, leafForDef } from './file-taxonomy';
import type { Taxonomy, TaxonomySection } from './file-taxonomy';

/** The minimal page-node surface this module touches — a page's NAME, its divider flag, and (for the
 *  File Components page) the ability to receive the template-asset nodes. `appendChild` is `unknown` so
 *  the real `PageNode` (whose `appendChild` takes a `SceneNode`) satisfies it without a cast. */
export interface PageLike {
  name: string;
  readonly isPageDivider?: boolean;
  /** A page's canvas fill. Optional so the port stays minimal — only `ensureNamed` writes it, and only
   *  on a page it just created (#1565). The real `PageNode.backgrounds` is a settable `Paint[]`, which
   *  is assignable to `readonly unknown[]`, so the global `figma` satisfies this addition with no cast —
   *  the same structural fit the header claims for the rest of the port. */
  backgrounds?: readonly unknown[];
  appendChild(child: unknown): void;
  findOne?(predicate: (node: unknown) => boolean): unknown;
}

/**
 * The document surface. `insertChild(index, page)` is Figma's own reposition primitive; its contract here
 * — matched by the shim — is REMOVE-THEN-SPLICE: if `page` is already a child it is removed first, then
 * inserted at `index` in the resulting array (clamped). Reading `root.children` requires the pages to be
 * loaded, hence `loadAllPagesAsync` on the port.
 */
export interface PagesApi {
  root: {
    readonly children: readonly PageLike[];
    insertChild(index: number, child: PageLike): void;
    appendChild(child: PageLike): void;
  };
  createPage(): PageLike;
  /** Native page divider — `isPageDivider` true, default name `---`. Called with no argument so Figma
   *  supplies the default; a custom `dividerName` must be all dashes/asterisks/spaces and would throw on
   *  a plain `---`, so we never pass one. */
  createPageDivider(dividerName?: string): PageLike;
  setCurrentPageAsync(page: PageLike): Promise<void>;
  loadAllPagesAsync(): Promise<void>;
}

const isDivider = (p: PageLike): boolean => p.isPageDivider === true;

/**
 * The canvas fill for every page file-setup creates: solid #FFFFFF (owner-directed, #1565). Figma's
 * default page canvas is a mid gray (`{r,g,b} ≈ 0.898`); the owner wants a white ground for the template.
 * The Paint shape matches `file-components.ts`'s `solid()` so the two producers write the same object.
 *
 * Applied ONLY on creation (see `ensureNamed`), never on a re-run — a page a designer has recolored is
 * left alone, the same additive, non-destructive posture as the rest of this module. Divider pages are
 * never filled: they have no canvas, and `ensureNamed` (the only writer) is never called for one.
 */
const WHITE_PAGE_BACKGROUND: readonly unknown[] = [
  { type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 1, g: 1, b: 1 } },
];

/** A named (non-divider) page by exact name, or null. */
const findNamed = (api: PagesApi, name: string): PageLike | null =>
  api.root.children.find((p) => !isDivider(p) && p.name === name) ?? null;

/** Find-or-create a named page. A created page is appended at the end (Figma's `createPage` semantics);
 *  positioning is the caller's job via `placeAfter`. (The field is `page`, not `node`, so the bundled
 *  main thread carries no `node:`-prefixed token — `build.mjs`'s sandbox scan rejects that substring.) */
const ensureNamed = (api: PagesApi, name: string): { page: PageLike; created: boolean } => {
  const existing = findNamed(api, name);
  if (existing) return { page: existing, created: false };
  const page = api.createPage();
  page.name = name;
  // Owner-directed white canvas, on CREATION only (#1565) — a re-run reaches the branch above and never
  // touches an existing page's fill, so a designer's recolor survives every later scaffold.
  page.backgrounds = WHITE_PAGE_BACKGROUND;
  return { page, created: true };
};

/**
 * Reposition `node` to sit immediately after `anchor` (or at the front when `anchor` is null), but only
 * when it needs moving. A freshly `created` page (appended at the end) is always pulled into place; an
 * EXISTING page is pulled only when it currently sits at or before the anchor — a page already further
 * along is left alone, which is what keeps on-demand component pages and hand-added pages from being
 * reordered on a re-run.
 */
const placeAfter = (api: PagesApi, node: PageLike, anchor: PageLike | null, created: boolean): void => {
  const kids = api.root.children;
  const ni = kids.indexOf(node);
  const ai = anchor ? kids.indexOf(anchor) : -1;
  if (anchor && ai < 0) return;            // anchor not in the file — cannot position; leave the node
  if (ni === ai + 1) return;               // already immediately after the anchor — idempotent no-op
  if (!created && ni > ai + 1) return;     // existing page already sits after the anchor — do not reorder
  const withoutNode = ni < 0 ? [...kids] : kids.filter((_, i) => i !== ni);
  const target = anchor ? withoutNode.indexOf(anchor) + 1 : 0;
  api.root.insertChild(target, node);
};

/** Ensure a native divider sits immediately before `ref`. Reused if the page just before `ref` is
 *  already a divider; otherwise created and moved into the gap. */
const ensureDividerBefore = (api: PagesApi, ref: PageLike): void => {
  const idx = api.root.children.indexOf(ref);
  if (idx > 0 && isDivider(api.root.children[idx - 1])) return;
  const div = api.createPageDivider();
  // Insert immediately before `ref`: in the array without the freshly-appended divider, that is `ref`'s
  // current index.
  const withoutDiv = api.root.children.filter((p) => p !== div);
  api.root.insertChild(withoutDiv.indexOf(ref), div);
};

/** The last existing page (header or any leaf, empty or on-demand) of a section, by document order — the
 *  anchor the NEXT section's divider hangs off. Null when the section has no page in the file yet. */
const lastExistingPageOfSection = (api: PagesApi, section: TaxonomySection): PageLike | null => {
  const names = [section.header, ...section.leaves.map(leafPageName)];
  let best: PageLike | null = null;
  let bestIdx = -1;
  for (const name of names) {
    const p = findNamed(api, name);
    if (!p) continue;
    const i = api.root.children.indexOf(p);
    if (i > bestIdx) { best = p; bestIdx = i; }
  }
  return best;
};

/** What `scaffoldSkeleton` reconciled — page names created this run, and the File Components page node so
 *  the caller can build the template assets onto it. */
export interface ScaffoldResult {
  created: string[];
  fileComponentsPage: PageLike | null;
}

/**
 * Reconcile the file's page list to the taxonomy skeleton — the pages `file-setup` OWNS: Cover, the
 * dividers, the section headers, every EMPTY leaf (the Foundations placeholders), and the File Components
 * page. Leaves with defs are NOT created here — they are on-demand (`resolveComponentPage`).
 *
 * Walks the taxonomy in file order, threading an `anchor` so each owned page is positioned right after
 * the previous one. On a fresh file this lays the whole spine; on a re-run it is a no-op that repositions
 * nothing already in place.
 */
export const scaffoldSkeleton = async (api: PagesApi, taxonomy: Taxonomy = TAXONOMY): Promise<ScaffoldResult> => {
  await api.loadAllPagesAsync();
  const created: string[] = [];
  const ensureAt = (name: string, anchor: PageLike | null): PageLike => {
    const { page, created: made } = ensureNamed(api, name);
    if (made) created.push(name);
    placeAfter(api, page, anchor, made);
    return page;
  };

  // Cover, first.
  let anchor: PageLike = ensureAt(taxonomy.cover, null);
  let fileComponentsPage: PageLike | null = null;

  for (const section of taxonomy.sections) {
    // A native divider precedes every section. The running `anchor` is the previous group's last
    // existing page (Cover for the first section), so place the header after it, then slip a divider
    // into the gap: anchor, ---, header.
    ensureDividerBefore(api, ensureAt(section.header, anchor));
    // Re-fetch the header after the divider insert (its index moved) to anchor the leaves off it.
    const header = findNamed(api, section.header);
    let leafAnchor: PageLike = header ?? anchor;
    for (const leaf of section.leaves) {
      const full = leafPageName(leaf);
      if (leaf.defs.length === 0) {
        // Owned by file-setup: an empty placeholder or the File Components page.
        leafAnchor = ensureAt(full, leafAnchor);
        if (leaf.fileComponents) fileComponentsPage = leafAnchor;
      } else {
        // On-demand: created by the build. Advance the anchor past it if it already exists, so the next
        // owned leaf (and this section's trailing divider) position correctly around it.
        const existing = findNamed(api, full);
        if (existing) leafAnchor = existing;
      }
    }
    anchor = lastExistingPageOfSection(api, section) ?? header ?? anchor;
  }

  return { created, fileComponentsPage };
};

/**
 * Ensure a section's header page exists with a divider before it — the minimal skeleton the page-aware
 * build needs when it runs before (or without) a full `scaffoldSkeleton`. Positions a freshly created
 * header after the previous section's last existing page, else after Cover, else at the end.
 */
const ensureSectionHeader = (api: PagesApi, taxonomy: Taxonomy, section: TaxonomySection): PageLike => {
  let header = findNamed(api, section.header);
  if (!header) {
    const idx = taxonomy.sections.indexOf(section);
    const prev = idx > 0 ? lastExistingPageOfSection(api, taxonomy.sections[idx - 1]) : null;
    const anchor = prev ?? findNamed(api, taxonomy.cover);
    const made = ensureNamed(api, section.header);
    header = made.page;
    placeAfter(api, header, anchor, true);
  }
  ensureDividerBefore(api, header);
  return header;
};

/**
 * Find-or-create the `↳ <family>` page a component def builds onto, in its correct section position, and
 * return it — the page-aware build's placement (item 3 / #1554). Returns null for a def the taxonomy does
 * not map, so the caller falls back to `currentPage` (the pre-#1554 behaviour) rather than inventing a
 * page.
 *
 * The leaf is anchored after the last existing preceding sibling in its section (or the section header),
 * so building `icon` drops `Icons & assets` between `Semantic tokens` and `Grids & layouts`, and building
 * `button` drops `Buttons` right after the `Components` header — each in taxonomy order regardless of
 * which siblings exist yet. Idempotent: a second build of the same family finds the page and returns it.
 */
export const resolveComponentPage = async (
  api: PagesApi,
  defId: string,
  taxonomy: Taxonomy = TAXONOMY,
): Promise<PageLike | null> => {
  await api.loadAllPagesAsync();
  const found = leafForDef(defId, taxonomy);
  if (!found) return null;
  const { section, leaf } = found;
  const header = ensureSectionHeader(api, taxonomy, section);

  // Anchor after the last existing sibling that precedes this leaf in taxonomy order; the header otherwise.
  let anchor: PageLike = header;
  for (const sib of section.leaves) {
    if (sib === leaf) break;
    const p = findNamed(api, leafPageName(sib));
    if (p) anchor = p;
  }
  const full = leafPageName(leaf);
  const { page, created } = ensureNamed(api, full);
  // AN ALPHABETICAL SECTION (#2568, owner decision Q260 A): a new page goes after the last of the section's own pages
  // whose name sorts before it, the header otherwise. An existing page is left where it is: reordering is the
  // in-place Update's, listed in its dry run, never a side effect of a build.
  if (section.alphabetical) {
    if (created) placeAfter(api, page, alphabeticalAnchor(api, section, page) ?? header, true);
    else placeAfter(api, page, header, false);
    return page;
  }
  placeAfter(api, page, anchor, created);
  return page;
};

/** Strip the `↳ ` prefix off a page name (or return it unchanged) — the inverse of `leafPageName`, for
 *  diagnostics. */
export const stripNestPrefix = (name: string): string =>
  name.startsWith(NEST_PREFIX) ? name.slice(NEST_PREFIX.length) : name;

/* ── page order (#2568, owner decision Q260 A) ──────────────────────────────────────────────────────────── */

/** How an alphabetical section sorts its pages: by the visible name, without the `↳ `, case-insensitive. The exact
 *  name breaks a tie, so the order is total and a re-run never swaps two pages that differ only in case. */
export const comparePageNames = (a: string, b: string): number => {
  const x = stripNestPrefix(a).toLowerCase();
  const y = stripNestPrefix(b).toLowerCase();
  return x < y ? -1 : x > y ? 1 : a < b ? -1 : a > b ? 1 : 0;
};

/** A section's pages in the file: everything after its header up to the next divider. Null with no header. */
const sectionSpan = (children: readonly PageLike[], section: TaxonomySection): { start: number; pages: PageLike[] } | null => {
  const h = children.findIndex((p) => !isDivider(p) && p.name === section.header);
  if (h < 0) return null;
  let end = h + 1;
  while (end < children.length && !isDivider(children[end])) end++;
  return { start: h + 1, pages: children.slice(h + 1, end) };
};

/** Whether a page is one Prism3 creates in this section: named as one of its leaves. Any other page is a designer's,
 *  and never moves. */
const ownIn = (section: TaxonomySection): ((p: PageLike) => boolean) => {
  const names = new Set(section.leaves.map(leafPageName));
  return (p) => !isDivider(p) && names.has(p.name);
};

/** Of `placed`, the page `page` goes straight after: the last by name that sorts before it. Null when none does. */
const lastBefore = (placed: readonly PageLike[], page: PageLike): PageLike | null =>
  placed.filter((p) => p !== page && comparePageNames(p.name, page.name) < 0).sort((a, b) => comparePageNames(a.name, b.name)).pop() ?? null;

/** The section's own page a new `page` goes after (`lastBefore` over the section's own pages). */
const alphabeticalAnchor = (api: PagesApi, section: TaxonomySection, page: PageLike): PageLike | null => {
  const span = sectionSpan(api.root.children, section);
  return span ? lastBefore(span.pages.filter(ownIn(section)), page) : null;
};

/**
 * Which of a section's own pages are out of order: those outside the LONGEST run already in order. Keeping that run
 * where it is moves the fewest pages, so one page dropped at the front reads as one page to reorder, not every page
 * after it, and the pages around a designer's page stay its neighbors wherever they can. Ties in length go to the
 * run found first, so the answer is the same on every read of the same list.
 */
const misplaced = (own: readonly PageLike[]): Set<PageLike> => {
  // Longest increasing subsequence by name, O(n²): a section holds tens of pages.
  const len = own.map(() => 1);
  const prev = own.map(() => -1);
  for (let i = 0; i < own.length; i++)
    for (let j = 0; j < i; j++)
      if (comparePageNames(own[j].name, own[i].name) < 0 && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; }
  let end = -1;
  for (let i = 0; i < own.length; i++) if (end < 0 || len[i] > len[end]) end = i;
  const kept = new Set<PageLike>();
  for (let i = end; i >= 0; i = prev[i]) kept.add(own[i]);
  return new Set(own.filter((p) => !kept.has(p)));
};

/**
 * THE PAGES OUT OF ORDER (#2568): for every alphabetical section, each of its own pages the apply would move, by full
 * page name, sorted by name. Pure over the page list, so the dry run reads it and writes nothing. A designer's page is
 * never in it. Empty when every alphabetical section is in order.
 */
export const pagesOutOfOrder = (children: readonly PageLike[], taxonomy: Taxonomy = TAXONOMY): string[] => {
  const out: string[] = [];
  for (const section of taxonomy.sections) {
    if (!section.alphabetical) continue;
    const span = sectionSpan(children, section);
    if (!span) continue;
    out.push(...[...misplaced(span.pages.filter(ownIn(section)))].sort((a, b) => comparePageNames(a.name, b.name)).map((p) => p.name));
  }
  return out;
};

/**
 * PUT EVERY ALPHABETICAL SECTION IN ORDER (#2568): the Update's apply. Each out-of-order page, in name order, goes
 * straight after the last page in order that sorts before it (the header when none does), the rule a new page follows.
 * Only the section's own pages are handed to `insertChild`; a designer's page is never moved, and nothing is created
 * or deleted. Returns the pages it put in place, by full name: the dry run's list less any still out of order, so the
 * apply counts what the dry run counted.
 */
export const reorderPages = (api: { root: Pick<PagesApi['root'], 'children' | 'insertChild'> }, taxonomy: Taxonomy = TAXONOMY): string[] => {
  const before = pagesOutOfOrder(api.root.children, taxonomy);
  for (const section of taxonomy.sections) {
    if (!section.alphabetical) continue;
    const span = sectionSpan(api.root.children, section);
    if (!span) continue;
    const header = api.root.children[span.start - 1];
    const own = span.pages.filter(ownIn(section));
    const move = misplaced(own);
    const placed = own.filter((p) => !move.has(p));
    for (const p of [...move].sort((a, b) => comparePageNames(a.name, b.name))) {
      const anchor = lastBefore(placed, p) ?? header;
      // REMOVE-THEN-SPLICE: the index is the anchor's in the list without `p`, plus one.
      const without = api.root.children.filter((x) => x !== p);
      api.root.insertChild(without.indexOf(anchor) + 1, p);
      placed.push(p);
    }
  }
  const after = new Set(pagesOutOfOrder(api.root.children, taxonomy));
  return before.filter((name) => !after.has(name));
};
