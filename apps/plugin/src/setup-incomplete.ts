/**
 * #3467 (owner decisions Q3 A, Q4 A) — WHAT SET UP FILE OWNS THAT THE FILE LACKS. A read: it writes nothing.
 *
 * `isSetUp` (`style-guide.ts`) answers one question, whether the style guides can be drawn (owner decision P8), and stays
 * as it is. A file can pass it and still lack what Set up file builds for the canvas: the `↳ File Components` page, a
 * page-furniture template, a style-guide cell set, or `_Doc-block`. Update file used to offer Set up file only on a file
 * that failed `isSetUp`, so none of those could be put back from the panel. This read lists them, by the names setup
 * gives them, and Update file shows its Set up file step whenever the list is not empty.
 *
 * EACH PIECE IS LOOKED FOR WHERE SETUP LOOKS FOR IT, so a piece listed here is one a setup run would build:
 *   · the page, by its name (`fileComponentsPageOf`);
 *   · `_Section-header` and `_Headings` on that page, as one pair: setup skips both when either is there
 *     (`ensureFileComponents`);
 *   · `_Label` (a set), `_inverse-backdrop` and `_scrim-backdrop` (components) on that page, each on its own
 *     (`ensureFurnitureTemplates`);
 *   · the three style-guide cell sets anywhere in the file (`ensureStyleGuideCells` adopts them wherever they are);
 *   · `_Doc-block`, only once it can be built: the file holds no `_Doc-block` (`findDocBlock`, the panels' own lookup),
 *     and holds Badge, Tag, List Item, Divider and the theme (`ensureDocBlock`'s needs). Until then setup could not
 *     build it either, so it is not listed.
 *
 * Every name and predicate is imported from the module that builds the piece, so the read and setup cannot drift on what
 * a piece is called. What the list must contain is held against literals by `test-update-doc-block.ts`
 * (`setup incomplete/…`), not by this file.
 */
import { fileComponentsPageOf } from './file-setup';
import type { PagesApi } from './file-setup';
import { HEADINGS_SET, SECTION_HEADER_SET, isTemplateSet } from './file-components';
import { BACKDROP_COMPONENT, LABEL_SET, SCRIM_COMPONENT } from './furniture-templates';
import { CELL_SETS, findCellSets } from './style-guide-cells';
import type { CellsApi } from './style-guide-cells';
import { DOC_BLOCK_DEFS, DOC_BLOCK_SET, docBlockThemed } from './doc-block';
import type { DocBlockApi } from './doc-block';
import { findDocBlock } from './doc-panel';
import type { PanelApi } from './doc-panel';
import { TAXONOMY, leafPageName } from './file-taxonomy';

/** What the read needs of the host: the pages, a search for component sets, and the variables. */
export interface IncompleteApi {
  readonly root: Pick<PagesApi['root'], 'children'> & { findAllWithCriteria(c: { types: ('COMPONENT_SET' | 'COMPONENT')[] }): readonly unknown[] };
  readonly variables?: DocBlockApi['variables'];
}

/** The File Components page's name, as the taxonomy gives it. */
const FILE_COMPONENTS_PAGE = ((): string => {
  for (const section of TAXONOMY.sections) for (const leaf of section.leaves) if (leaf.fileComponents) return leafPageName(leaf);
  return '';
})();

/** The pieces Set up file would build on this file now, in setup's own order. Empty when there are none. */
export const setupIncompleteOf = async (api: IncompleteApi): Promise<string[]> => {
  const out: string[] = [];
  const page = fileComponentsPageOf(api as unknown as Pick<PagesApi, 'root'>) as { findOne?(p: (n: unknown) => boolean): unknown } | null;
  if (!page) out.push(FILE_COMPONENTS_PAGE);
  const onPage = (type: string, name: string): boolean => !!page?.findOne?.((node) => {
    const n = node as { type?: unknown; name?: unknown };
    return n.type === type && isTemplateSet(n.name, name);
  });
  if (!onPage('COMPONENT_SET', SECTION_HEADER_SET) && !onPage('COMPONENT_SET', HEADINGS_SET)) out.push(SECTION_HEADER_SET, HEADINGS_SET);
  if (!onPage('COMPONENT_SET', LABEL_SET)) out.push(LABEL_SET);
  if (!onPage('COMPONENT', BACKDROP_COMPONENT)) out.push(BACKDROP_COMPONENT);
  if (!onPage('COMPONENT', SCRIM_COMPONENT)) out.push(SCRIM_COMPONENT);
  const cells = findCellSets(api.root as unknown as CellsApi['root']);
  for (const set of CELL_SETS) if (!cells[set]) out.push(set);
  if (!findDocBlock(api as unknown as Pick<PanelApi, 'root'>)) {
    const sets = api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly { name?: unknown }[];
    if (DOC_BLOCK_DEFS.every((id) => sets.some((n) => n.name === id)) && await docBlockThemed(api)) out.push(DOC_BLOCK_SET);
  }
  return out;
};
