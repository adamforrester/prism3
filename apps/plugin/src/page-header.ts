/**
 * THE PAGE HEADER (owner decisions, 2026-09-27) — one `_Section-header` instance at the top of each
 * component page.
 *
 * `file-components.ts` builds the `_Section-header` set onto `↳ File Components` (#1554). This module places
 * an INSTANCE of it on a component page after a build lands there, so a page opens on its title and its
 * one-line summary rather than on a bare set. The owner placed the first ones by hand on Buttons and Icons &
 * assets; this reproduces that placement: Size=Medium, x on the content's left edge, the header's bottom
 * `HEADER_GAP` above the content's top, and the content's width.
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
 * WHAT IS AND IS NOT VERIFIED OFFLINE. `test-page-header.ts` drives this through a node shim: which variant
 * is instantiated, the count per page, the text rule, the width, the sizing modes and the y arithmetic. What
 * a shim cannot check is that Figma recomputes a HUG height synchronously after the text write, which the y
 * placement reads — host-verified, like the rest of the direct node building in `file-components.ts`.
 */
import { TAXONOMY, leafForDef } from './file-taxonomy';
import type { Taxonomy } from './file-taxonomy';
import { SECTION_HEADER_SET, isTemplateSet } from './file-components';

/** The set `file-components.ts` names. Found by `isTemplateSet`, in any case — the owner's NB files carry
 *  it as `_section-header` — the same match file setup's "already built" check uses. */
export { SECTION_HEADER_SET };
/** The variant a new header takes. The designer changes it by hand; a rebuild never resets it. */
export const HEADER_VARIANT = 'Size=Medium';
/** Space between the header's bottom edge and the content's top edge, in px. */
export const HEADER_GAP = 80;

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
): Promise<'written' | 'kept' | 'absent'> => {
  const t = inst.findOne?.(isText(name));
  if (!t) return 'absent';
  const placeholder = main?.findOne?.(isText(name))?.characters;
  if (placeholder === undefined || t.characters !== placeholder) return 'kept';
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
  const set = (api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly HNode[])
    .find((n) => isTemplateSet(n.name, SECTION_HEADER_SET));
  if (!set) return { page: page.name, status: 'skipped', reason: 'no-set' };

  const top = page.children as readonly HNode[];
  const fontMisses: string[] = [];

  // A REBUILD: the page already has its header, ANYWHERE on it — inside a Section or frame too (#1711 net).
  // A DETACHED header (now a FRAME) still counts as present by its name, so a second is never added; its
  // text is not refreshed, because nothing marks which of its words were placeholders.
  const all = page.findAllWithCriteria
    ? (page.findAllWithCriteria({ types: ['INSTANCE', 'FRAME'] }) as readonly HNode[])
    : top;
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
  // must not widen or move the header, #1711 net).
  const shown = top.filter((n) => n.visible !== false);
  if (shown.length === 0) return { page: page.name, status: 'skipped', reason: 'no-content' };
  const left = Math.min(...shown.map((n) => n.x ?? 0));
  const right = Math.max(...shown.map((n) => (n.x ?? 0) + (n.width ?? 0)));
  const topEdge = Math.min(...shown.map((n) => n.y ?? 0));
  const width = right - left;

  const variant = set.children?.find((c) => c.name === HEADER_VARIANT);
  if (!variant?.createInstance) return { page: page.name, status: 'skipped', reason: 'no-variant' };
  const inst = variant.createInstance();
  page.appendChild(inst);

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

/**
 * The verdict clause for the headers this build touched — empty when there is nothing a designer needs to
 * read. A placed header is named; a skip says why and what adds the missing piece; a header already there
 * is silent unless a font kept its placeholder text.
 */
export const pageHeaderNote = (outcomes: readonly PageHeaderOutcome[]): string => {
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
  return parts.length ? `. ${parts.join('. ')}` : '';
};
