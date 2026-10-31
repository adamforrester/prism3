/**
 * THE PAGE HEADER (owner decisions, 2026-09-27) — one `_Section-header` instance at the top of each
 * component page.
 *
 * `file-components.ts` builds the `_Section-header` set onto `↳ File Components` (#1554). This module places
 * an INSTANCE of it on a component page after a build lands there, so a page opens on its title and its
 * one-line summary rather than on a bare set. The owner placed the first ones by hand on Buttons and Icons &
 * assets; this reproduces that placement: Size=Medium, x on the content's left edge, the header's bottom
 * `HEADER_GAP` above the content's top, and the content's width — floored at the Medium variant's own width,
 * so a page of small content never squeezes the header's text into a column.
 *
 * ONE HEADER PER PAGE, NOT PER SET. A page holds a family (`button`, `button-destructive`, `button-neutral`
 * on Buttons), and the copy is the family's: the title is the primary def's name up to its first `.`
 * (`Checkbox.Control` → `Checkbox`), the description is the primary def's `summary`. The PRIMARY def is the
 * first one the taxonomy lists on that leaf (`file-taxonomy.ts`) — the build-order list the page mapping
 * already keeps, so no second list of families exists to drift from it.
 *
 * IDEMPOTENT, AND THE DESIGNER'S EDITS WIN. A rebuild finds the page's header by its MAIN COMPONENT (an
 * instance whose main component sits in the `_Section-header` set), never adds a second, and never touches
 * its Size, width or position. The Title and Description text are written only while they still read what
 * the header's own main component reads — its placeholder — so text a designer typed is never overwritten.
 *
 * NEVER THROWS, NEVER BUILDS THE SET. A file where file setup never ran has no `_Section-header`; the build
 * skips the header and says so in its result (`pageHeaderNote`). A font the host cannot load leaves that
 * text at its placeholder and is reported, the same skip-with-a-reason posture as `file-components.ts`.
 *
 * THE GAP IS A LITERAL 80. The header and the content are two top-level nodes on a page, and a node's `y`
 * on a page is not a bindable field — only an auto-layout gap is — so there is no variable to bind it to
 * without wrapping the page in a frame, which the owner's hand-placed headers do not do.
 *
 * A SECOND HEADER ON A SHARED PAGE (#3172, owner decisions Q3172.1–3, all A). A def the taxonomy lists in its leaf's
 * `blockHeaders` (the provider logos, beside the icons on Icons & assets) is not its page's lead, and gets a Size=Medium
 * header of its own, placed over its own block by the same rule, titled as the taxonomy says ("Provider logos"). Such a
 * header is TAGGED with its def (`HEADER_FOR_KEY`), which is how a rebuild finds it, and how the page's own header
 * tells it apart: the lead's header is the untagged one, and its first placement measures the page without the blocks.
 * A file whose block has no header yet gets one from Update too (`blockHeadersDue`, `placeBlockHeaders`). On a file
 * built before, the header on the def's former page (`FORMER_PAGES`, "Brand marks") is MOVED with the block, the same
 * node and id, once nothing else of the page would be left: its Title is rewritten while it reads the placeholder or
 * the def's earlier name ("Brand mark", "Brand marks"), its Description while it reads the placeholder, and any other
 * text a designer typed is kept. The page it leaves is reported as safe to delete, never deleted.
 *
 * WHAT IS AND IS NOT VERIFIED OFFLINE. `test-page-header.ts` drives this through a node shim: which variant
 * is instantiated, the count per page, the text rule, the width, the sizing modes and the y arithmetic. What
 * a shim cannot check is that Figma recomputes a HUG height synchronously after the text write, which the y
 * placement reads — host-verified, like the rest of the direct node building in `file-components.ts`.
 */
import { FORMER_PAGES, NEST_PREFIX, TAXONOMY, allLeaves, leafForDef, leafPageName } from './file-taxonomy';
import type { Taxonomy } from './file-taxonomy';
import { SECTION_HEADER_SET, isTemplateSet } from './file-components';
import type { PageLike } from './file-setup';
import { pageMovesDue, stayingOn } from './page-moves';
import { NS } from './persist-figma';
import { formerDefIds } from '@prism3/engine/component-renames';
import { componentDefs } from '@prism3/engine/components/index';

/** The set `file-components.ts` names. Found by `isTemplateSet`, in any case — the owner's NB files carry
 *  it as `_section-header` — the same match file setup's "already built" check uses. */
export { SECTION_HEADER_SET };
/** The variant a new header takes. The designer changes it by hand; a rebuild never resets it. */
export const HEADER_VARIANT = 'Size=Medium';
/** Space between the header's bottom edge and the content's top edge, in px. */
export const HEADER_GAP = 80;
/** The shared plugin data key (namespace `prism3`) on a block's own header: the def it heads (#3172). The page's lead
 *  header carries none. */
export const HEADER_FOR_KEY = 'headerFor';

/** The node surface this module reads and writes — optional-everything, as in `file-components.ts`, so the
 *  real `SceneNode`s satisfy it with no cast and the shim needs only what a test exercises. */
export interface HNode {
  readonly id?: string;
  readonly type?: string;
  name?: string;
  x?: number;
  y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly visible?: boolean;
  readonly parent?: { readonly id?: string; readonly name?: string } | null;
  readonly children?: readonly HNode[];
  characters?: string;
  readonly fontName?: unknown;
  layoutSizingHorizontal?: unknown;
  layoutSizingVertical?: unknown;
  readonly componentProperties?: Record<string, { type?: string; value?: unknown }>;
  resize?(w: number, h: number): void;
  findOne?(predicate: (n: HNode) => boolean): HNode | null;
  createInstance?(): HNode;
  getMainComponentAsync?(): Promise<HNode | null>;
  setProperties?(props: Record<string, string | boolean>): void;
  getSharedPluginData?(ns: string, key: string): string;
  setSharedPluginData?(ns: string, key: string, value: string): void;
}

/** The page the header goes on. `appendChild` in method syntax so `PageNode`'s `SceneNode` parameter fits. */
export interface HeaderPage {
  readonly name: string;
  readonly children: readonly unknown[];
  appendChild(child: unknown): void;
  /** Page-wide search, so a header inside a Section or frame is found. Optional: a shim may omit it. */
  findAllWithCriteria?(criteria: { types: ('INSTANCE' | 'FRAME')[] }): readonly unknown[];
}

/** The host surface — a file-wide set search (the header set lives on another page) and font loading.
 *  Requires `loadAllPagesAsync` first under `documentAccess: dynamic-page`; the build has already run it. */
export interface PageHeaderApi {
  root: { findAllWithCriteria(criteria: { types: ('COMPONENT' | 'COMPONENT_SET')[] }): readonly unknown[] };
  loadFontAsync(font: { family: string; style: string }): Promise<void>;
}

/** The copy a page's header carries. */
export interface HeaderCopy {
  title: string;
  description: string;
  /** The def the copy was read from — the leaf's first def. */
  primary: string;
}

/**
 * The header copy for the page `defId` builds onto, or null for a def the taxonomy does not place (that
 * build lands on the current page, which is not a component page and gets no header).
 */
export const pageHeaderCopy = (
  defId: string,
  defs: readonly { id: string; name: string; summary: string }[],
  taxonomy: Taxonomy = TAXONOMY,
): HeaderCopy | null => {
  const found = leafForDef(defId, taxonomy);
  if (!found) return null;
  // The page's PRIMARY def: the first one that is not a bare `-control` atom. On Checkbox, Radio and Switch the
  // leaf lists the Control first, and its summary ("…no label") describes the nested atom, not the component a
  // designer reaches for; the Row is that component (#1711 net).
  const primaryId = found.leaf.defs.find((id) => !id.endsWith('-control')) ?? found.leaf.defs[0];
  const primary = defs.find((d) => d.id === primaryId);
  if (!primary) return null;
  return { title: displayName(primary.name), description: primary.summary, primary: primary.id };
};

/** A def's code name as a sentence-case title: the family segment (`Checkbox.Row` → `Checkbox`), words split at
 *  case changes and lowercased after the first (`IconButton` → `Icon button`) — the voice standard's sentence case. */
export const displayName = (codeName: string): string => {
  const words = codeName.split('.')[0].replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return words.charAt(0) + words.slice(1).toLowerCase();
};

/** What happened on one page. */
export type PageHeaderOutcome =
  | { page: string; status: 'placed'; x: number; y: number; width: number; written: string[]; fontMisses: string[] }
  | { page: string; status: 'present'; written: string[]; kept: string[]; fontMisses: string[] }
  | { page: string; status: 'skipped'; reason: 'no-set' | 'no-variant' | 'no-content' }
  /** The host threw mid-placement. Caught by the caller (`main.ts`), so a header never fails a build. */
  | { page: string; status: 'failed'; message: string };

const isText = (name: string) => (n: HNode): boolean => n.type === 'TEXT' && n.name === name;

/** Is `main` a member of the header set? By the set's id, or by its name for a header instanced from a
 *  duplicate of the set — either way the page already has one, and a second is never added. */
const isHeaderMain = (main: HNode | null, set: HNode): boolean =>
  !!main?.parent && (main.parent.id === set.id || isTemplateSet(main.parent.name, SECTION_HEADER_SET));

/**
 * Write `value` into the instance's `name` text node only while it still reads its main component's text —
 * the placeholder. Returns what happened, so the caller can report it.
 */
const writeIfPlaceholder = async (
  api: PageHeaderApi,
  inst: HNode,
  main: HNode | null,
  name: string,
  value: string,
  fontMisses: string[],
  also: readonly string[] = [],
): Promise<'written' | 'kept' | 'absent'> => {
  const t = inst.findOne?.(isText(name));
  if (!t) return 'absent';
  const placeholder = main?.findOne?.(isText(name))?.characters;
  // `also`: text Prism3 wrote under an earlier name, rewritten like the placeholder (#3172, Q3172.3 A).
  if (t.characters === value) return 'kept';
  if ((placeholder === undefined || t.characters !== placeholder) && !also.includes(t.characters ?? '')) return 'kept';
  const font = t.fontName as { family?: unknown; style?: unknown } | undefined;
  if (!font || typeof font.family !== 'string' || typeof font.style !== 'string') {
    fontMisses.push(`${name}: mixed or unreadable font`);
    return 'kept';
  }
  try {
    await api.loadFontAsync({ family: font.family, style: font.style });
  } catch {
    fontMisses.push(`${font.family} ${font.style} unavailable for ${name}`);
    return 'kept';
  }
  t.characters = value;
  return 'written';
};

/**
 * Ensure `page` carries exactly one `_Section-header` instance. Places one when the page has none, and on
 * a page that already has one refreshes only placeholder text. Never throws for a missing set, variant or
 * content — each is a `skipped` outcome.
 */
export const ensurePageHeader = async (
  api: PageHeaderApi,
  page: HeaderPage,
  copy: HeaderCopy,
): Promise<PageHeaderOutcome> => {
  // Exact case first, then any case (#1733 net): a file holding both `_Section-header` and a user's
  // `_section-header` keeps the plugin-built one, as before the case-insensitive match.
  const set = headerSet(api);
  if (!set) return { page: page.name, status: 'skipped', reason: 'no-set' };

  const top = page.children as readonly HNode[];
  const fontMisses: string[] = [];
  // A BLOCK'S OWN HEADER (#3172) is not the page's: it is tagged, and the page's header is the untagged one.

  // A REBUILD: the page already has its header, ANYWHERE on it — inside a Section or frame too (#1711 net).
  // A DETACHED header (now a FRAME) still counts as present by its name, so a second is never added; its
  // text is not refreshed, because nothing marks which of its words were placeholders.
  const all = allOn(page).filter((n) => !tagOf(n));
  if (all.some((n) => n.type === 'FRAME' && isTemplateSet(n.name, SECTION_HEADER_SET)))
    return { page: page.name, status: 'present', written: [], kept: ['Title', 'Description'], fontMisses };
  for (const n of all) {
    if (n.type !== 'INSTANCE') continue;
    const main = (await n.getMainComponentAsync?.()) ?? null;
    if (!isHeaderMain(main, set)) continue;
    const written: string[] = [];
    const kept: string[] = [];
    for (const [name, value] of [['Title', copy.title], ['Description', copy.description]] as const) {
      const r = await writeIfPlaceholder(api, n, main, name, value, fontMisses);
      if (r === 'written') written.push(name);
      else if (r === 'kept') kept.push(name);
    }
    return { page: page.name, status: 'present', written, kept, fontMisses };
  }

  // A FIRST BUILD: measure the VISIBLE content before anything is added to the page (a hidden scratch node
  // must not widen or move the header, #1711 net), the blocks with headers of their own left out (#3172).
  const blocks = Object.keys(leafForDef(copy.primary)?.leaf.blockHeaders ?? {}).flatMap((d) => blockOf(top, d));
  const shown = top.filter((n) => n.visible !== false && !tagOf(n) && !blocks.includes(n));
  return placeOver(api, page, set, shown, copy);
};

/** The file's `_Section-header` set: exact case first, then any case. */
const headerSet = (api: PageHeaderApi): HNode | undefined => {
  const allSets = api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly HNode[];
  return allSets.find((n) => n.name === SECTION_HEADER_SET) ?? allSets.find((n) => isTemplateSet(n.name, SECTION_HEADER_SET));
};

/** Every instance and frame on the page, at any depth where the host can search, else its top level. */
const allOn = (page: HeaderPage): readonly HNode[] => page.findAllWithCriteria
  ? (page.findAllWithCriteria({ types: ['INSTANCE', 'FRAME'] }) as readonly HNode[])
  : page.children as readonly HNode[];

/** The def a block's own header heads (#3172); empty on any other node. */
const tagOf = (n: HNode): string => n.getSharedPluginData?.(NS, HEADER_FOR_KEY) ?? '';

/** A header by its name, an instance (an instance of a variant carries its set's name) or a detached frame. */
const isHeaderNode = (n: HNode): boolean => (n.type === 'INSTANCE' || n.type === 'FRAME') && isTemplateSet(n.name, SECTION_HEADER_SET);

/** A block def's components at the top level of a page, under its id or an earlier one (they are renamed after a move). */
const blockOf = (top: readonly HNode[], def: string): HNode[] => {
  const ids = [def, ...formerDefIds(def)];
  return top.filter((n) => n.type === 'COMPONENT' && ids.some((id) => String(n.name ?? '').startsWith(`${id}/`)));
};

/** The box a header is placed over: left, right and top edges of the nodes. */
const boxOf = (nodes: readonly HNode[]): { left: number; right: number; top: number } => ({
  left: Math.min(...nodes.map((n) => n.x ?? 0)),
  right: Math.max(...nodes.map((n) => (n.x ?? 0) + (n.width ?? 0))),
  top: Math.min(...nodes.map((n) => n.y ?? 0)),
});

/** A NEW HEADER over `shown`: Size=Medium, the content's width floored at the variant's, its bottom `HEADER_GAP` above
 *  the content's top. `tag` marks a block's own header (#3172). */
const placeOver = async (
  api: PageHeaderApi,
  page: HeaderPage,
  set: HNode,
  shown: readonly HNode[],
  copy: HeaderCopy,
  tag?: string,
): Promise<PageHeaderOutcome> => {
  const fontMisses: string[] = [];
  if (shown.length === 0) return { page: page.name, status: 'skipped', reason: 'no-content' };
  const { left, right, top: topEdge } = boxOf(shown);

  const variant = set.children?.find((c) => c.name === HEADER_VARIANT);
  if (!variant?.createInstance) return { page: page.name, status: 'skipped', reason: 'no-variant' };
  // NEVER NARROWER THAN THE HEADER ITSELF (live, 2026-09-27). The content's width alone put an 80px header
  // over the Spinner page — the title broken one letter per line, 860px tall. So the content's width, but
  // floored at the width the file's own Medium variant is authored at.
  const width = Math.max(right - left, variant.width ?? 0);
  const inst = variant.createInstance();
  page.appendChild(inst);
  if (tag) inst.setSharedPluginData?.(NS, HEADER_FOR_KEY, tag);

  // FIXED width, HUG height — the set's own sizing, in `file-components.ts`'s order: fix the width axis,
  // resize, then HUG the height last so it governs over the resize's throwaway height.
  inst.layoutSizingHorizontal = 'FIXED';
  inst.resize?.(width, inst.height ?? 1);
  inst.layoutSizingVertical = 'HUG';

  // The Description boolean on, explicitly — its default is true, and a header is placed to carry it.
  const descKey = Object.keys(inst.componentProperties ?? {}).find((k) => k === 'Description' || k.startsWith('Description#'));
  if (descKey) inst.setProperties?.({ [descKey]: true });

  const written: string[] = [];
  for (const [name, value] of [['Title', copy.title], ['Description', copy.description]] as const)
    if ((await writeIfPlaceholder(api, inst, variant, name, value, fontMisses)) === 'written') written.push(name);

  // Positioned LAST: the text sets the hugged height, and the gap is measured from the header's bottom.
  const x = left;
  const y = topEdge - HEADER_GAP - (inst.height ?? 0);
  inst.x = x;
  inst.y = y;
  return { page: page.name, status: 'placed', x, y, width, written, fontMisses };
};

/** A block def's header title (#3172), or undefined for a def that takes its page's one header. */
export const blockHeaderTitle = (defId: string, t: Taxonomy = TAXONOMY): string | undefined => leafForDef(defId, t)?.leaf.blockHeaders?.[defId];

/** A block's header copy: the taxonomy's title and the def's own summary. */
const blockCopy = (def: string, title: string, defs: readonly { id: string; summary: string }[]): HeaderCopy =>
  ({ title, description: defs.find((d) => d.id === def)?.summary ?? '', primary: def });

/**
 * THE HEADER A BUILD OF `defId` LABELS ITS PAGE WITH: the block's own (#3172) for a def that has one, else the page's.
 * `key` is how a run keeps one label per header: the page's name, and the def beside it for a block's.
 */
export const headerFor = (defId: string, pageName: string, defs: readonly { id: string; name: string; summary: string }[]): { key: string; label(api: PageHeaderApi, page: HeaderPage): Promise<PageHeaderOutcome> } | null => {
  const title = blockHeaderTitle(defId);
  if (title) return { key: `${pageName}\u0000${defId}`, label: (api, page) => ensureBlockHeader(api, page, defId, blockCopy(defId, title, defs)) };
  const copy = pageHeaderCopy(defId, defs);
  return copy ? { key: pageName, label: (api, page) => ensurePageHeader(api, page, copy) } : null;
};

/** Refresh a found header's placeholder text, as the page's header is refreshed on a rebuild. */
const refresh = async (api: PageHeaderApi, page: HeaderPage, n: HNode, copy: HeaderCopy): Promise<PageHeaderOutcome> => {
  const fontMisses: string[] = [];
  if (n.type === 'FRAME') return { page: page.name, status: 'present', written: [], kept: ['Title', 'Description'], fontMisses };
  const main = (await n.getMainComponentAsync?.()) ?? null;
  const written: string[] = [];
  const kept: string[] = [];
  for (const [name, value] of [['Title', copy.title], ['Description', copy.description]] as const) {
    const r = await writeIfPlaceholder(api, n, main, name, value, fontMisses);
    if (r === 'written') written.push(name);
    else if (r === 'kept') kept.push(name);
  }
  return { page: page.name, status: 'present', written, kept, fontMisses };
};

/**
 * Ensure `def`'s block on `page` carries its own header (#3172): found by its tag anywhere on the page and only its
 * placeholder text refreshed, else placed over the block by the page header's rule and tagged.
 */
export const ensureBlockHeader = async (api: PageHeaderApi, page: HeaderPage, def: string, copy: HeaderCopy): Promise<PageHeaderOutcome> => {
  const set = headerSet(api);
  if (!set) return { page: page.name, status: 'skipped', reason: 'no-set' };
  const found = allOn(page).find((n) => tagOf(n) === def);
  if (found) return refresh(api, page, found, copy);
  return placeOver(api, page, set, blockOf(page.children as readonly HNode[], def).filter((n) => n.visible !== false), copy, def);
};

/** A block header Update owes (#3172): the def, its title, the page by full name, and `from`, the former page whose
 *  header moves to it; absent `from`, a new one is drawn. */
export type BlockHeaderDue = { def: string; title: string; page: string; from?: string };

type HPage = PageLike & HeaderPage & { readonly children: readonly HNode[] };

/** The former page's header that moves with `def`'s block: the one node left there once the block has gone, untagged. */
const formerHeader = (pages: readonly HPage[], def: string): { page: HPage; header: HNode } | undefined => {
  for (const f of FORMER_PAGES) {
    if (!f.defs.includes(def)) continue;
    const page = pages.find((p) => !p.isPageDivider && p.name === NEST_PREFIX + f.page);
    const rest = page ? stayingOn(page as never, def) as HNode[] : [];
    if (page && rest.length === 1 && isHeaderNode(rest[0]) && !tagOf(rest[0])) return { page, header: rest[0] };
  }
  return undefined;
};

/**
 * THE BLOCK HEADERS DUE, read off the page list and writing nothing (#3172): a block on its page, or moving there now
 * (`pageMovesDue`), with no header tagged for it. One whose former page's header would be left alone moves; else one is
 * drawn, which needs the file's `_Section-header` set (`hasSet`), so a file without one owes nothing it cannot do.
 */
export const blockHeadersDue = (children: readonly PageLike[], hasSet: () => boolean, t: Taxonomy = TAXONOMY): BlockHeaderDue[] => {
  const pages = children.filter((p) => !p.isPageDivider) as unknown as HPage[];
  const out: BlockHeaderDue[] = [];
  for (const { leaf } of allLeaves(t)) {
    for (const [def, title] of Object.entries(leaf.blockHeaders ?? {})) {
      const name = leafPageName(leaf);
      const dest = pages.find((p) => p.name === name);
      if (dest && allOn(dest).some((n) => tagOf(n) === def)) continue;
      if (!(dest && blockOf(dest.children, def).length) && !pageMovesDue(children, t).some((m) => m.set === def && m.to === name)) continue;
      const from = formerHeader(pages, def);
      if (!from && !hasSet()) continue;
      out.push({ def, title, page: name, ...(from ? { from: from.page.name } : {}) });
    }
  }
  return out;
};

/** The host `placeBlockHeaders` writes through: the header port, and the document's pages. */
export type BlockHeaderApi = PageHeaderApi & { root: PageHeaderApi['root'] & { readonly children: readonly PageLike[] } };

/**
 * PLACE THE BLOCK HEADERS DUE NOW (#3172), after any set has moved to its page. A former page's header is appended to
 * the block's page (Figma's own move, which keeps its id), tagged, its text rewritten under the Q3172.3 A rule, and set
 * over the block as a new one would be; the page it leaves, empty, is named for the owner. Never deletes a page.
 */
export const placeBlockHeaders = async (
  api: BlockHeaderApi,
  defs: readonly { id: string; name: string; summary: string }[] = componentDefs,
  t: Taxonomy = TAXONOMY,
): Promise<{ placed: (BlockHeaderDue & { outcome: PageHeaderOutcome })[]; emptied: string[] }> => {
  const placed: (BlockHeaderDue & { outcome: PageHeaderOutcome })[] = [];
  const emptied: string[] = [];
  const pages = (): HPage[] => api.root.children.filter((p) => !p.isPageDivider) as unknown as HPage[];
  for (const d of blockHeadersDue(api.root.children, () => !!headerSet(api), t)) {
    const dest = pages().find((p) => p.name === d.page);
    if (!dest) continue;
    const copy = blockCopy(d.def, d.title, defs);
    const from = d.from ? formerHeader(pages(), d.def) : undefined;
    if (!from) { placed.push({ ...d, outcome: await ensureBlockHeader(api, dest, d.def, copy) }); continue; }
    const block = blockOf(dest.children, d.def).filter((n) => n.visible !== false);
    if (!block.length) { placed.push({ ...d, outcome: { page: dest.name, status: 'skipped', reason: 'no-content' } }); continue; }
    const h = from.header;
    dest.appendChild(h);
    h.setSharedPluginData?.(NS, HEADER_FOR_KEY, d.def);
    const main = h.type === 'INSTANCE' ? (await h.getMainComponentAsync?.()) ?? null : null;
    // Q3172.3 A: the def's earlier name, singular or plural, is Prism3's text, so it is rewritten like the placeholder.
    const earlier = formerDefIds(d.def).flatMap((id) => { const w = id.replace(/-/g, ' '); const s = w.charAt(0).toUpperCase() + w.slice(1); return [s, `${s}s`]; });
    const fontMisses: string[] = [];
    const written: string[] = [];
    const kept: string[] = [];
    for (const [name, value, also] of [['Title', copy.title, earlier], ['Description', copy.description, []]] as const) {
      const r = await writeIfPlaceholder(api, h, main, name, value, fontMisses, also);
      if (r === 'written') written.push(name);
      else if (r === 'kept') kept.push(name);
    }
    // Positioned last, as a new header is: the text sets the hugged height.
    const box = boxOf(block);
    h.x = box.left;
    h.y = box.top - HEADER_GAP - (h.height ?? 0);
    placed.push({ ...d, outcome: { page: dest.name, status: 'present', written, kept, fontMisses } });
    if (!(from.page.children ?? []).length) emptied.push(from.page.name);
  }
  return { placed, emptied };
};

/** DRAFT wording for the owner (#3172): the block headers, as the dry run lists them and as the apply reports them done. */
export const blockHeadersLines = (due: readonly BlockHeaderDue[] | undefined, done: boolean): string[] =>
  (due ?? []).map((d) => d.from
    ? `${d.title} header: ${done ? 'moved' : 'to move'} from ${d.from.slice(NEST_PREFIX.length)} to ${d.page.slice(NEST_PREFIX.length)}.`
    : `${d.title} header: ${done ? 'added' : 'to add'} to ${d.page.slice(NEST_PREFIX.length)}.`);

/**
 * The verdict clause for the headers this build touched — empty when there is nothing a designer needs to
 * read. A placed header is named; a skip says why and what adds the missing piece; a header already there
 * is silent unless a font kept its placeholder text.
 */
export const pageHeaderItems = (outcomes: readonly PageHeaderOutcome[]): string[] => {
  const parts: string[] = [];
  for (const o of outcomes) {
    if (o.status === 'placed') {
      parts.push(`Header added to ${o.page}${o.fontMisses.length ? ` (${o.fontMisses.join('; ')})` : ''}`);
    } else if (o.status === 'present') {
      if (o.fontMisses.length) parts.push(`The header on ${o.page} kept its placeholder text (${o.fontMisses.join('; ')})`);
    } else if (o.status === 'failed') {
      parts.push(`No header on ${o.page}: Figma refused the write`);
    } else if (o.reason === 'no-set') {
      parts.push(`No header on ${o.page}: this file has no ${SECTION_HEADER_SET} component, and Set up file adds it`);
    } else if (o.reason === 'no-variant') {
      parts.push(`No header on ${o.page}: ${SECTION_HEADER_SET} has no ${HEADER_VARIANT} variant`);
    } else {
      parts.push(`No header on ${o.page}: the page has no content to place it above`);
    }
  }
  return parts;
};
/** The same items as one clause, each joined by `. ` (#2177 split the two: one line per header in the Activity drawer). */
export const pageHeaderNote = (outcomes: readonly PageHeaderOutcome[]): string => {
  const parts = pageHeaderItems(outcomes);
  return parts.length ? `. ${parts.join('. ')}` : '';
};
