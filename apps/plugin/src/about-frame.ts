/**
 * THE "ABOUT THIS LIBRARY" FRAME (#2858, owner decisions Q443 A and Q479) — the library's versions, on the Cover page.
 *
 * WHERE. On the Cover page, BESIDE the file's thumbnail frame (Q479.1 A): `ABOUT_GAP` to its right, top-aligned. The
 * thumbnail stays the brand's, and the tool's text never shows in the file browser. A Cover page with no thumbnail
 * frame gets the frame `ABOUT_GAP` right of whatever is on the page, or at the origin of an empty one. A redraw takes
 * the place of the frame it replaces, so a frame a designer moved stays where they put it.
 *
 * WHAT. `library-about.ts`'s `aboutContent`: the engine, the token contract, the date of the Update that drew it, and
 * what changed in the latest release. The executor revision is not shown (Q479.5 A).
 *
 * CANVAS FURNITURE, redrawn on every Update that writes (`update-apply.ts`), and the dry run says when it is due:
 * missing, or drawn for another engine or contract (`aboutDue`). The frame carries shared plugin data `prism3`/`about`:
 * the engine and contract it was drawn for, its date, and its fingerprint as drawn (the style guide's `fingerprintOf`,
 * reused). A redraw removes the old frame only while it still matches that fingerprint. An edited one is kept: renamed
 * "About this library (edited)", moved below the new frame, its tag cleared so no later Update touches it, and named
 * in the run's result. The engine it was drawn for is the "from" the publish description names.
 *
 * NEVER THROWS FOR A MISSING PAGE. A file where Set up file never ran has no Cover page: nothing is drawn, and the
 * outcome says why. A font the host will not load falls back as `file-components.ts`'s `makeText` does, and is named.
 *
 * HELD FOR THE OWNER, every number here, and the frame's look: the wireframe drew it at 720 × 960.
 */
import { ENGINE_VERSION, CONTRACT_VERSION } from '@prism3/engine/version';
import { TAXONOMY } from './file-taxonomy';
import { BOLD, REGULAR, SEMIBOLD, autoLayout, fontKey, makeText, solid, type FNode, type FileComponentsApi } from './file-components';
import { fingerprintOf, type SgNode } from './style-guide';
import { aboutContent, type ReleaseIndex } from './library-about';

export const ABOUT_NS = 'prism3';
export const ABOUT_KEY = 'about';
export const ABOUT_NAME = 'About this library';
export const ABOUT_EDITED = `${ABOUT_NAME} (edited)`;
export const ABOUT_WIDTH = 720;
export const ABOUT_HEIGHT = 960;
/** Space between the thumbnail and the frame, and between the frame and an edited copy kept below it, in px. */
export const ABOUT_GAP = 40;

/** What the frame records about itself. */
export type AboutRecord = { engine: string; contract: string; updated: string; print: string };

/** The node surface read and written here: optional-everything, so real `SceneNode`s and the shims satisfy it. */
export type ANode = FNode & {
  readonly id?: string;
  readonly type?: string;
  x?: number;
  y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly parent?: unknown;
  readonly children?: readonly ANode[];
  getSharedPluginData?(ns: string, key: string): string;
  setSharedPluginData?(ns: string, key: string, value: string): void;
  remove?(): void;
  clipsContent?: unknown;
  textAutoResize?: unknown;
};
export type AboutPage = { readonly id?: string; readonly name?: string; readonly children: readonly ANode[]; appendChild(child: unknown): void };
export type AboutRoot = { readonly children?: readonly unknown[] };
export type AboutApi = Pick<FileComponentsApi, 'createFrame' | 'createText' | 'loadFontAsync'> & {
  getFileThumbnailNodeAsync?(): Promise<unknown>;
};

/** The Cover page, by the taxonomy's name: a page whose children can be read. */
export const coverPage = (root: AboutRoot): AboutPage | null =>
  ((root.children ?? []) as AboutPage[]).find((p) => typeof p.name === 'string' && p.name.trim() === TAXONOMY.cover && Array.isArray(p.children)) ?? null;

const recordOf = (n: ANode): AboutRecord | null => {
  const raw = n.getSharedPluginData?.(ABOUT_NS, ABOUT_KEY) ?? '';
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Partial<AboutRecord>;
    return { engine: String(r.engine ?? ''), contract: String(r.contract ?? ''), updated: String(r.updated ?? ''), print: String(r.print ?? '') };
  } catch { return { engine: '', contract: '', updated: '', print: '' }; }
};

/** The frame Prism3 drew on the page, and its record. */
const ownFrame = (page: AboutPage): { frame: ANode; record: AboutRecord } | null => {
  for (const n of page.children) {
    const record = recordOf(n);
    if (record) return { frame: n, record };
  }
  return null;
};

/**
 * WHAT AN UPDATE OWES THE FRAME, read without writing: `no-cover` (nothing can be drawn), `missing`, `stale` (drawn
 * for another engine or contract, which `from` names), or `current`. Only `missing` and `stale` are work on their own;
 * any Update that writes redraws a `current` frame too, for its date.
 */
export type AboutDue =
  | { state: 'no-cover' }
  | { state: 'missing' }
  | { state: 'stale'; from: { engine: string; contract: string } }
  | { state: 'current' };

export const aboutDue = (root: AboutRoot, engine: string = ENGINE_VERSION, contract: string = CONTRACT_VERSION): AboutDue | undefined => {
  if (!root.children) return undefined;
  const page = coverPage(root);
  if (!page) return { state: 'no-cover' };
  const own = ownFrame(page);
  if (!own) return { state: 'missing' };
  if (own.record.engine !== engine || own.record.contract !== contract) return { state: 'stale', from: { engine: own.record.engine, contract: own.record.contract } };
  return { state: 'current' };
};

/** Whether the frame is work for an Update on its own. */
export const aboutIsWork = (d: AboutDue | undefined): boolean => d?.state === 'missing' || d?.state === 'stale';

/** The dry run's line for the frame, or ''. DRAFT wording. */
export const aboutDueLine = (d: AboutDue | undefined): string =>
  d?.state === 'missing' ? `${ABOUT_NAME}: to draw on the Cover page.`
    : d?.state === 'stale' ? `${ABOUT_NAME}: to redraw for engine ${ENGINE_VERSION} (drawn for ${d.from.engine || 'an unknown engine'}).`
      : '';

export type AboutOutcome = {
  /** True when the frame was drawn. */
  drawn: boolean;
  /** Why it was not, when it was not. */
  skipped?: string;
  /** The engine the previous frame was drawn for, when there was one. */
  from?: string;
  /** True when an earlier frame was replaced rather than a first one drawn. */
  replaced?: boolean;
  /** The name of an edited frame kept aside. */
  kept?: string;
  fontMisses: string[];
};

/** The result's line for the frame. DRAFT wording. */
export const aboutLine = (o: AboutOutcome | undefined): string => {
  if (!o) return '';
  if (!o.drawn) return `${ABOUT_NAME}: not drawn, ${o.skipped}.`;
  const kept = o.kept ? ` Your edited copy is kept below it, named "${o.kept}".` : '';
  const fonts = o.fontMisses.length ? ` ${o.fontMisses.join('; ')}.` : '';
  return `${ABOUT_NAME}: ${o.replaced ? 'redrawn' : 'drawn'} on the Cover page.${kept}${fonts}`;
};

const INK = '#1B1F24';
const INK_2 = '#56606B';
const LINE = '#D8DDE2';
const PAPER = '#FFFFFF';

const fillWidth = (n: ANode): void => {
  n.layoutAlign = 'STRETCH';
  n.textAutoResize = 'HEIGHT';
};

/** Build the frame's nodes, unplaced. */
const buildFrame = (api: AboutApi, words: ReturnType<typeof aboutContent>, loaded: Set<string>, misses: string[]): ANode => {
  const text = (font: { family: string; style: string }, size: number, color: string, s: string): ANode => {
    const t = makeText(api as FileComponentsApi, { font, size, lineHeight: Math.round(size * 1.4), letterSpacing: 0, color, text: s }, loaded, misses) as ANode;
    t.name = s.split('\n')[0].slice(0, 40);
    fillWidth(t);
    return t;
  };
  const frame = api.createFrame() as ANode;
  frame.name = ABOUT_NAME;
  autoLayout(frame, { dir: 'VERTICAL', itemSpacing: 32, padding: 48 });
  frame.primaryAxisSizingMode = 'FIXED';
  frame.counterAxisSizingMode = 'FIXED';
  frame.resize?.(ABOUT_WIDTH, ABOUT_HEIGHT);
  frame.fills = solid(PAPER);
  frame.strokes = solid(LINE);
  frame.clipsContent = true;
  frame.appendChild?.(text(BOLD, 32, INK, words.title));
  const rows = api.createFrame() as ANode;
  rows.name = 'Versions';
  autoLayout(rows, { dir: 'VERTICAL', itemSpacing: 16 });
  rows.layoutAlign = 'STRETCH';
  rows.fills = [];
  for (const r of words.rows) {
    const row = api.createFrame() as ANode;
    row.name = r.label;
    autoLayout(row, { dir: 'VERTICAL', itemSpacing: 4 });
    row.layoutAlign = 'STRETCH';
    row.fills = [];
    row.appendChild?.(text(REGULAR, 14, INK_2, r.label));
    row.appendChild?.(text(SEMIBOLD, 20, INK, r.value));
    if (r.note) row.appendChild?.(text(REGULAR, 14, INK_2, r.note));
    rows.appendChild?.(row);
  }
  frame.appendChild?.(rows);
  const rule = api.createFrame() as ANode;
  rule.name = 'Rule';
  rule.resize?.(ABOUT_WIDTH - 96, 1);
  rule.layoutAlign = 'STRETCH';
  rule.fills = solid(LINE);
  frame.appendChild?.(rule);
  if (words.heading) {
    const changed = api.createFrame() as ANode;
    changed.name = 'What changed';
    autoLayout(changed, { dir: 'VERTICAL', itemSpacing: 12 });
    changed.layoutAlign = 'STRETCH';
    changed.fills = [];
    changed.appendChild?.(text(SEMIBOLD, 20, INK, words.heading));
    if (words.counts) changed.appendChild?.(text(REGULAR, 16, INK_2, words.counts));
    if (words.changes.length) changed.appendChild?.(text(REGULAR, 16, INK, words.changes.map((l) => `• ${l}`).join('\n')));
    frame.appendChild?.(changed);
  }
  frame.appendChild?.(text(REGULAR, 13, INK_2, words.footer));
  return frame;
};

/** The box of what is on a page, or null for an empty one. */
const contentBox = (page: AboutPage): { right: number; top: number } | null => {
  const ns = page.children.filter((n) => typeof n.x === 'number' && typeof n.y === 'number');
  if (!ns.length) return null;
  return { right: Math.max(...ns.map((n) => (n.x as number) + (n.width ?? 0))), top: Math.min(...ns.map((n) => n.y as number)) };
};

/**
 * DRAW (or redraw) THE FRAME on the Cover page. `updated` is the run's date, `YYYY-MM-DD`. Never throws for a missing
 * page or font; a refused host write is the caller's to catch.
 */
export const drawAbout = async (
  api: AboutApi, root: AboutRoot,
  o: { updated: string; engine?: string; contract?: string; ix?: ReleaseIndex },
): Promise<AboutOutcome> => {
  const page = coverPage(root);
  if (!page) return { drawn: false, skipped: 'the file has no Cover page. Run Set up file, then Update', fontMisses: [] };
  const engine = o.engine ?? ENGINE_VERSION;
  const contract = o.contract ?? CONTRACT_VERSION;
  const own = ownFrame(page);
  const edited = own ? (await fingerprintOf(own.frame as unknown as SgNode)) !== own.record.print : false;
  // Where it goes: where the old one was, else beside the thumbnail frame on this page, else past the page's content.
  let at = { x: 0, y: 0 };
  if (own) at = { x: own.frame.x ?? 0, y: own.frame.y ?? 0 };
  else {
    const thumb = (await api.getFileThumbnailNodeAsync?.().catch(() => null)) as ANode | null | undefined;
    const box = thumb && page.children.includes(thumb) ? { right: (thumb.x ?? 0) + (thumb.width ?? 0), top: thumb.y ?? 0 } : contentBox(page);
    if (box) at = { x: box.right + ABOUT_GAP, y: box.top };
  }
  const loaded = new Set<string>();
  for (const f of [REGULAR, SEMIBOLD, BOLD]) {
    try { await api.loadFontAsync(f); loaded.add(fontKey(f)); } catch { /* named per text by `makeText` */ }
  }
  const misses: string[] = [];
  const frame = buildFrame(api, aboutContent({ updated: o.updated, engine, contract, ix: o.ix }), loaded, misses);
  page.appendChild(frame);
  frame.x = at.x;
  frame.y = at.y;
  const out: AboutOutcome = { drawn: true, fontMisses: [...new Set(misses.map((m) => m.split(' — ')[0]))], ...(own ? { from: own.record.engine, replaced: true } : {}) };
  if (own && edited) {
    own.frame.name = ABOUT_EDITED;
    own.frame.setSharedPluginData?.(ABOUT_NS, ABOUT_KEY, '');
    own.frame.y = at.y + (frame.height ?? ABOUT_HEIGHT) + ABOUT_GAP;
    out.kept = ABOUT_EDITED;
  } else if (own) own.frame.remove?.();
  const record: AboutRecord = { engine, contract, updated: o.updated, print: await fingerprintOf(frame as unknown as SgNode) };
  frame.setSharedPluginData?.(ABOUT_NS, ABOUT_KEY, JSON.stringify(record));
  return out;
};
