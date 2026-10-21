/**
 * THE LIBRARY COVER (#2859, owner decision Q509 A) — the brand and the engine version, 1920 × 1080, as the file thumbnail.
 *
 * WHAT. Two texts on a brand-color ground and nothing else: the brand's name (`BrandInput.name`, else its `id` as
 * written, Q?1 A) set in the brand's display face, and `Prism3 <engine>` (Q?6 A). No logo (Q?2 A; the slot is a
 * follow-up issue). The contract, the date and what changed are the About frame's (#2858), which sits beside it.
 *
 * BOUND, SO A THEME MOVES IT LIVE (Q?3 A). The frame's fill is bound to `<root>/color/foreground/brand` and both texts'
 * to `<root>/color/text/on-brand`, the one ink the engine contracts against exactly that ground (4.5:1,
 * `test-cover-frame.ts` asserts it per brand and mode). The wordmark's family and style bind
 * `<root>/core/font/family/display` and `…/style/display/strong`, the version's the body pair. No text style: the
 * largest stops at 112 px, 19 px on a 320 px card. A file with no such variable yet gets placeholders, bound by the
 * first Update that finds the variable, and only while the placeholder is still there (`furniture-templates.ts`'s
 * `bindBackdrop` rule): a fill or font a designer changed is theirs.
 *
 * CANVAS FURNITURE, drawn by Set up file (Q?5 A) and kept current by every Update. The frame carries shared plugin data
 * `prism3`/`cover`: the engine and name it was drawn for and its fingerprint (`coverPrint`); the two texts carry
 * `prism3`/`cover-part` = `brand` | `version`. AN UPDATE NEVER REPLACES THE FRAME, so the thumbnail pointer, the place a
 * designer moved it to and anything they added stay. An unedited cover is refreshed in place: the version, the name,
 * and any placeholder bound. A cover EDITED BY HAND keeps every edit, and only its tagged version text is set (Q?4 B).
 * If that text is gone, nothing is written and the result says so.
 *
 * WHY ITS OWN FINGERPRINT, not the style guide's `fingerprintOf`: that one reads each text's font and size, and a bound
 * display face moves both whenever Apply Theme changes the family, so every theme change would read as a hand edit.
 * `coverPrint` reads a bound font by its variable and leaves text geometry out; the version's characters are left out
 * too, since the Update writes them.
 *
 * THE THUMBNAIL. Set only while `getFileThumbnailNodeAsync()` is Figma's default (`null`). A frame the designer chose
 * is never replaced, and the result names it.
 *
 * HELD FOR THE OWNER: every number here is the approved wireframe's (#2859): the 120 px inset, the wordmark at 240 px
 * (180 px on up to two lines when one line will not fit), the version at 64 px, 110 px off the bottom.
 */
import { ENGINE_VERSION } from '@prism3/engine/version';
import { TAXONOMY } from './file-taxonomy';
import { REGULAR, SEMIBOLD, fontKey, solid, type FNode, type FileComponentsApi } from './file-components';
import { fnv } from './style-guide';

export const COVER_NS = 'prism3';
export const COVER_KEY = 'cover';
export const COVER_PART_KEY = 'cover-part';
export const COVER_NAME = 'Cover';
export const COVER_WIDTH = 1920;
export const COVER_HEIGHT = 1080;
/** The content inset on the left and right; the Community modal's reported 1800 px safe area sits inside it. */
export const COVER_INSET = 120;
export const WORDMARK_TOP = 360;
export const WORDMARK_SIZE = 240;
/** A name too wide for one line at `WORDMARK_SIZE` drops to this and wraps. */
export const WORDMARK_SIZE_LONG = 180;
export const VERSION_SIZE = 64;
export const VERSION_BOTTOM = 110;
/** Space between the cover and what a non-empty Cover page already holds, in px (the About frame's gap). */
export const COVER_GAP = 40;

/** The variables the cover binds, by the tail every brand's name ends in (`<root>/…`). */
export const GROUND_VARIABLE = 'color/foreground/brand';
export const INK_VARIABLE = 'color/text/on-brand';
export const WORDMARK_FONT_VARIABLES = { family: 'core/font/family/display', style: 'core/font/style/display/strong' } as const;
export const VERSION_FONT_VARIABLES = { family: 'core/font/family/body', style: 'core/font/style/body/default' } as const;
/** The placeholders until the theme's variables exist. */
export const GROUND_PLACEHOLDER = '#3D3A4D';
export const INK_PLACEHOLDER = '#FFFFFF';

/** What the version text reads (Q?6 A). */
export const coverVersion = (engine: string = ENGINE_VERSION): string => `Prism3 ${engine}`;
/** The brand's name as the cover shows it (Q?1 A): `name`, else the `id` as written. */
export const brandNameOf = (brand: { id: string; name?: string } | null | undefined): string | null =>
  brand ? (brand.name?.trim() || brand.id) : null;

export type CoverPart = 'brand' | 'version';
/** What the frame records about itself. */
export type CoverRecord = { engine: string; name: string; print: string };

/** The node surface read and written here: optional-everything, so real `SceneNode`s and the shims satisfy it. */
export type CNode = FNode & {
  readonly id?: string;
  readonly type?: string;
  x?: number;
  y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly children?: readonly CNode[];
  readonly boundVariables?: Record<string, unknown>;
  textAutoResize?: unknown;
  getSharedPluginData?(ns: string, key: string): string;
  setSharedPluginData?(ns: string, key: string, value: string): void;
  setBoundVariable?(field: string, variable: unknown): void;
};
export type CoverPage = { readonly name?: string; readonly children: readonly CNode[]; appendChild(child: unknown): void };
export type CoverRoot = { readonly children?: readonly unknown[] };
export type CoverVariable = { id: string; name: string; resolveForConsumer?(node: unknown): { value: unknown } };
export interface CoverVariables {
  getLocalVariablesAsync(): Promise<readonly CoverVariable[]>;
  setBoundVariableForPaint(paint: never, field: 'color', variable: never): unknown;
}
export type CoverApi = Pick<FileComponentsApi, 'createFrame' | 'createText' | 'loadFontAsync'> & {
  variables?: CoverVariables;
  getFileThumbnailNodeAsync?(): Promise<unknown>;
  setFileThumbnailNodeAsync?(node: unknown): Promise<void>;
};

/** The Cover page, by the taxonomy's name: a page whose children can be read. */
export const coverPage = (root: CoverRoot): CoverPage | null =>
  ((root.children ?? []) as CoverPage[]).find((p) => typeof p.name === 'string' && p.name.trim() === TAXONOMY.cover && Array.isArray(p.children)) ?? null;

const recordOf = (n: CNode): CoverRecord | null => {
  const raw = n.getSharedPluginData?.(COVER_NS, COVER_KEY) ?? '';
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Partial<CoverRecord>;
    return { engine: String(r.engine ?? ''), name: String(r.name ?? ''), print: String(r.print ?? '') };
  } catch { return { engine: '', name: '', print: '' }; }
};

/** The cover Prism3 drew on the page, and its record. */
const ownCover = (page: CoverPage): { frame: CNode; record: CoverRecord } | null => {
  for (const n of page.children) {
    const record = recordOf(n);
    if (record) return { frame: n, record };
  }
  return null;
};

const partOf = (n: CNode): string => n.getSharedPluginData?.(COVER_NS, COVER_PART_KEY) ?? '';
/** The tagged text inside the cover, at any depth (a designer may wrap it). */
const findPart = (n: CNode, part: CoverPart): CNode | null => {
  if (n.type === 'TEXT' && partOf(n) === part) return n;
  for (const c of n.children ?? []) {
    const hit = findPart(c, part);
    if (hit) return hit;
  }
  return null;
};

const paintKey = (ps: unknown): string => {
  if (!Array.isArray(ps)) return ps === undefined ? '' : 'mixed';
  return ps.map((p) => {
    const q = (p ?? {}) as { type?: unknown; visible?: unknown; opacity?: unknown; color?: { r?: unknown; g?: unknown; b?: unknown }; boundVariables?: { color?: { id?: unknown } } };
    const bound = q.boundVariables?.color?.id;
    const body = typeof bound === 'string' ? `@${bound}`
      : q.color ? [q.color.r, q.color.g, q.color.b].map((x) => Math.round(Number(x) * 1e4)).join(',') : '';
    return `${String(q.type)}:${body}:${q.visible === false ? 0 : 1}:${Math.round(Number(q.opacity ?? 1) * 1e4)}`;
  }).join('|');
};
const boundId = (n: CNode, field: string): string => {
  const b = n.boundVariables?.[field] as { id?: unknown } | undefined;
  return typeof b?.id === 'string' ? b.id : '';
};
const font = (n: CNode): string => {
  const f = n.fontName as { family?: unknown; style?: unknown } | symbol | undefined;
  return f && typeof f === 'object' ? `${String(f.family)} ${String(f.style)}` : typeof f === 'symbol' ? 'mixed' : '';
};

/**
 * THE COVER'S FINGERPRINT: what a designer would change, read off the frame. Every node in order, with its type, name,
 * visibility, tag, place, fills and strokes (a bound paint by its variable's id), and for a text its characters, size,
 * and font (a bound family or style by its variable's id). Not in it: the frame's own place (a designer may move it),
 * a text's size on the canvas (a new display face moves it), and the version's characters (the Update writes them).
 */
export const coverPrint = (frame: CNode): string => {
  const parts: string[] = [];
  const walk = (n: CNode, depth: number): void => {
    const text = n.type === 'TEXT';
    const at = depth === 0 ? `${Math.round(n.width ?? 0)}x${Math.round(n.height ?? 0)}`
      : text ? `${Math.round(n.x ?? 0)},${Math.round(n.y ?? 0)}` : `${Math.round(n.x ?? 0)},${Math.round(n.y ?? 0)},${Math.round(n.width ?? 0)}x${Math.round(n.height ?? 0)}`;
    const typeface = text ? [boundId(n, 'fontFamily') ? `@${boundId(n, 'fontFamily')}` : font(n).split(' ')[0], boundId(n, 'fontStyle') ? `@${boundId(n, 'fontStyle')}` : font(n), String(n.fontSize ?? '')].join('/') : '';
    const chars = text && partOf(n) !== 'version' ? String(n.characters ?? '') : '';
    parts.push([depth, n.type, n.name, n.visible === false ? 'hidden' : '', partOf(n), at, chars, typeface, paintKey(n.fills), paintKey(n.strokes)].join('␟'));
    for (const c of n.children ?? []) walk(c, depth + 1);
  };
  walk(frame, 0);
  const s = parts.join('\n');
  return `${fnv(s, false)}${fnv(s, true)}`;
};

/** The variable a tail names, as `furniture-templates.ts` finds the backdrop's. */
const byTail = (all: readonly CoverVariable[], tail: string): CoverVariable | null =>
  all.find((v) => v.name === tail || v.name.endsWith(`/${tail}`)) ?? null;
const localVariables = async (api: Pick<CoverApi, 'variables'>): Promise<readonly CoverVariable[]> => {
  try { return (await api.variables?.getLocalVariablesAsync()) ?? []; } catch { return []; }
};

const isPlaceholder = (fills: unknown, hex: string): boolean => paintKey(fills) === paintKey(solid(hex));
/** Placeholder fills and fonts that a theme variable can now bind. */
const bindable = (frame: CNode, vars: readonly CoverVariable[]): boolean => {
  if (isPlaceholder(frame.fills, GROUND_PLACEHOLDER) && byTail(vars, GROUND_VARIABLE)) return true;
  for (const [part, fv] of [['brand', WORDMARK_FONT_VARIABLES], ['version', VERSION_FONT_VARIABLES]] as const) {
    const t = findPart(frame, part);
    if (!t) continue;
    if (isPlaceholder(t.fills, INK_PLACEHOLDER) && byTail(vars, INK_VARIABLE)) return true;
    if (!boundId(t, 'fontFamily') && byTail(vars, fv.family) && byTail(vars, fv.style)) return true;
  }
  return false;
};

/**
 * WHAT AN UPDATE OWES THE COVER, read without writing.
 *   `no-cover`   the file has no Cover page;
 *   `missing`    no cover on it;
 *   `stale`      its version text shows another engine (`shows`), or, unedited, its name is another (`name`) or a
 *                placeholder can now bind (`bind`). An edited cover is stale only for its version;
 *   `no-version` edited by hand and the tagged version text is gone: nothing can be written;
 *   `current`.
 * `brand` is the name the cover should show, or null when the file holds no brand: then the name is not compared.
 */
export type CoverDue =
  | { state: 'no-cover' }
  | { state: 'missing' }
  | { state: 'stale'; shows?: string; name?: { from: string; to: string }; bind?: true; edited?: true }
  | { state: 'no-version'; edited: true }
  | { state: 'current'; edited?: true };

/** The engine a version text shows: the number after "Prism3 ", else the text as it is. */
const shownVersion = (s: string): string => s.replace(/^Prism3\s+/, '');

export const coverDue = async (
  root: CoverRoot, o: { brand: string | null; engine?: string; api?: Pick<CoverApi, 'variables'> },
): Promise<CoverDue | undefined> => {
  if (!root.children) return undefined;
  const page = coverPage(root);
  if (!page) return { state: 'no-cover' };
  const own = ownCover(page);
  if (!own) return { state: 'missing' };
  const engine = o.engine ?? ENGINE_VERSION;
  const edited = coverPrint(own.frame) !== own.record.print;
  const version = findPart(own.frame, 'version');
  if (!version) return edited ? { state: 'no-version', edited: true } : { state: 'missing' };
  const out: { shows?: string; name?: { from: string; to: string }; bind?: true } = {};
  if (version.characters !== coverVersion(engine)) out.shows = shownVersion(String(version.characters ?? ''));
  if (!edited) {
    const wordmark = findPart(own.frame, 'brand');
    if (o.brand !== null && wordmark && wordmark.characters !== o.brand) out.name = { from: String(wordmark.characters ?? ''), to: o.brand };
    if (bindable(own.frame, await localVariables(o.api ?? {}))) out.bind = true;
  }
  const flag = edited ? { edited: true as const } : {};
  return Object.keys(out).length ? { state: 'stale', ...out, ...flag } : { state: 'current', ...flag };
};

/** Whether the cover is work for an Update on its own. */
export const coverIsWork = (d: CoverDue | undefined): boolean => d?.state === 'missing' || d?.state === 'stale';

/** The dry run's line for the cover, or ''. DRAFT wording, the wireframe's where it has one. */
export const coverDueLine = (d: CoverDue | undefined, engine: string = ENGINE_VERSION): string => {
  if (!d) return '';
  if (d.state === 'missing') return `${COVER_NAME}: to draw on the Cover page.`;
  if (d.state === 'no-version') return `${COVER_NAME}: edited by hand, and its version text is gone, so Update writes nothing to it.`;
  if (d.state !== 'stale') return '';
  const what = [
    ...(d.shows !== undefined ? [`set the version to ${engine} (shows ${d.shows || 'nothing'})`] : []),
    ...(d.name ? [`set the brand name to ${d.name.to} (shows ${d.name.from || 'nothing'})`] : []),
    ...(d.bind ? ['bind its colors and fonts to the theme'] : []),
  ];
  return `${COVER_NAME}: to ${what.join(', ')}.${d.edited ? ' It was edited by hand, so only its version text changes.' : ''}`;
};

export type CoverOutcome = {
  /** What was done: `drawn` a new cover, `refreshed` an unedited one, `version` set in an edited one, or nothing. */
  did: 'drawn' | 'refreshed' | 'version' | 'none';
  /** Why nothing was done, when it was not. */
  skipped?: string;
  /** The version now shown, when it was set. */
  engine?: string;
  /** The brand name now shown, when it was set. */
  name?: string;
  /** The file thumbnail: `set` to the cover now, already the cover, a frame the designer chose (`theirs`, named),
   *  or not readable by this host. */
  thumbnail?: 'set' | 'ours' | 'default' | { theirs: string } | 'unavailable';
  fontMisses: string[];
};

/** The result's line for the cover, or ''. DRAFT wording, the wireframe's where it has one. */
export const coverLine = (o: CoverOutcome | undefined): string => {
  if (!o) return '';
  const fonts = o.fontMisses.length ? ` ${o.fontMisses.join('; ')}.` : '';
  const thumb = typeof o.thumbnail === 'object' ? ` The file thumbnail is your frame "${o.thumbnail.theirs}"; Prism3 left it.` : '';
  if (o.did === 'none') return o.skipped ? `${COVER_NAME}: ${o.skipped}.` : '';
  if (o.did === 'drawn') return o.thumbnail === 'set' ? `${COVER_NAME}: drawn and set as the file thumbnail.${fonts}` : `${COVER_NAME}: drawn.${thumb}${fonts}`;
  if (o.did === 'version') return `${COVER_NAME}: edited by hand. Only its version text was set, to ${o.engine}.${thumb}`;
  const what = [...(o.engine ? [`version set to ${o.engine}`] : []), ...(o.name ? [`brand name set to ${o.name}`] : [])];
  const set = o.thumbnail === 'set' ? ' Set as the file thumbnail.' : '';
  return `${COVER_NAME}: ${what.length ? what.join(', ') : 'bound to the theme'}.${set}${thumb}${fonts}`;
};

/** WHICH WORDMARK SIZE a measured one-line width takes: `WORDMARK_SIZE` when it fits the inset, else `WORDMARK_SIZE_LONG`. */
export const wordmarkFits = (width: number): boolean => width <= COVER_WIDTH - 2 * COVER_INSET;

const percent = (value: number): { value: number; unit: 'PERCENT' } => ({ value, unit: 'PERCENT' });

/** Paint a node's fill from a variable, or the placeholder while there is none. */
const paint = (api: CoverApi, vars: readonly CoverVariable[], tail: string, placeholder: string): unknown[] => {
  const v = byTail(vars, tail);
  const base = solid(placeholder);
  if (!v || !api.variables) return base;
  try { return [api.variables.setBoundVariableForPaint(base[0] as never, 'color', v as never)]; } catch { return base; }
};

/**
 * BIND A TEXT'S FAMILY AND STYLE to the brand's variables: resolve both for this node, load that font, set it, then
 * bind, so the node never passes through a font that is not loaded. False when either variable is missing, does not
 * resolve, or the host refuses; the text keeps its literal font.
 */
const bindFont = async (api: CoverApi, vars: readonly CoverVariable[], t: CNode, fv: { family: string; style: string }, misses: string[]): Promise<boolean> => {
  const fam = byTail(vars, fv.family);
  const sty = byTail(vars, fv.style);
  if (!fam || !sty || !t.setBoundVariable) return false;
  const family = fam.resolveForConsumer?.(t)?.value;
  const style = sty.resolveForConsumer?.(t)?.value;
  if (typeof family !== 'string' || typeof style !== 'string') return false;
  const face = { family, style };
  try { await api.loadFontAsync(face); } catch { misses.push(`${fontKey(face)} unavailable — kept ${font(t)}`); return false; }
  try {
    t.fontName = face;
    t.setBoundVariable('fontFamily', fam);
    t.setBoundVariable('fontStyle', sty);
    return true;
  } catch { return false; }
};

/** Set the wordmark's characters and fit them: one line at `WORDMARK_SIZE`, else `WORDMARK_SIZE_LONG`, wrapping. */
const setWordmark = (t: CNode, name: string): void => {
  t.characters = name;
  t.fontSize = WORDMARK_SIZE;
  t.textAutoResize = 'WIDTH_AND_HEIGHT';
  if (!wordmarkFits(t.width ?? 0)) {
    t.fontSize = WORDMARK_SIZE_LONG;
    t.textAutoResize = 'HEIGHT';
    t.resize?.(COVER_WIDTH - 2 * COVER_INSET, t.height ?? WORDMARK_SIZE_LONG);
  }
};

const loadFallbacks = async (api: CoverApi): Promise<Set<string>> => {
  const loaded = new Set<string>();
  for (const f of [REGULAR, SEMIBOLD]) {
    try { await api.loadFontAsync(f); loaded.add(fontKey(f)); } catch { /* named per text below */ }
  }
  return loaded;
};

/** A text's current font, loaded, so its characters can be written. False when the host will not load it. */
const loadOwn = async (api: CoverApi, t: CNode): Promise<boolean> => {
  const f = t.fontName as { family?: unknown; style?: unknown } | undefined;
  if (!f || typeof f !== 'object' || typeof f.family !== 'string' || typeof f.style !== 'string') return false;
  try { await api.loadFontAsync({ family: f.family, style: f.style }); return true; } catch { return false; }
};

/** The thumbnail rule: set the cover as the thumbnail only while the file's is Figma's default. */
const settleThumbnail = async (api: CoverApi, frame: CNode): Promise<CoverOutcome['thumbnail']> => {
  if (!api.getFileThumbnailNodeAsync) return 'unavailable';
  let now: unknown;
  try { now = await api.getFileThumbnailNodeAsync(); } catch { return 'unavailable'; }
  if (now === frame || (now && frame.id !== undefined && (now as CNode).id === frame.id)) return 'ours';
  if (now) return { theirs: String((now as CNode).name ?? 'unnamed') };
  if (!api.setFileThumbnailNodeAsync) return 'default';
  try { await api.setFileThumbnailNodeAsync(frame); return 'set'; } catch { return 'default'; }
};

/** A new tagged text on its fallback face, or on the host's default face when that will not load (`ready` false). */
const textNode = (api: CoverApi, part: CoverPart, face: { family: string; style: string }, loaded: Set<string>): { t: CNode; ready: boolean } => {
  const t = api.createText() as CNode;
  t.name = part;
  t.setSharedPluginData?.(COVER_NS, COVER_PART_KEY, part);
  const ready = loaded.has(fontKey(face));
  if (ready) t.fontName = { ...face };
  return { t, ready };
};

const contentRight = (page: CoverPage): { right: number; top: number } | null => {
  const ns = page.children.filter((n) => typeof n.x === 'number' && typeof n.y === 'number');
  if (!ns.length) return null;
  return { right: Math.max(...ns.map((n) => (n.x as number) + (n.width ?? 0))), top: Math.min(...ns.map((n) => n.y as number)) };
};

/** Draw a new cover on the page: at the origin of an empty page, else `COVER_GAP` right of what it holds. */
const drawNew = async (api: CoverApi, page: CoverPage, name: string, engine: string): Promise<CoverOutcome> => {
  const vars = await localVariables(api);
  const loaded = await loadFallbacks(api);
  const misses: string[] = [];
  const box = contentRight(page);
  const frame = api.createFrame() as CNode;
  frame.name = COVER_NAME;
  frame.resize?.(COVER_WIDTH, COVER_HEIGHT);
  frame.clipsContent = true;
  frame.fills = paint(api, vars, GROUND_VARIABLE, GROUND_PLACEHOLDER);
  page.appendChild(frame);
  if (box) { frame.x = box.right + COVER_GAP; frame.y = box.top; } else { frame.x = 0; frame.y = 0; }

  // Each text writes its characters on a loaded face: the brand's bound one, else the fallback. With neither, it stays
  // empty and the miss is named, as `file-components.ts`'s `makeText` does.
  const { t: wordmark, ready: wmReady } = textNode(api, 'brand', SEMIBOLD, loaded);
  frame.appendChild?.(wordmark);
  const wmBound = await bindFont(api, vars, wordmark, WORDMARK_FONT_VARIABLES, misses);
  wordmark.lineHeight = percent(98);
  wordmark.letterSpacing = percent(-2);
  wordmark.fills = paint(api, vars, INK_VARIABLE, INK_PLACEHOLDER);
  if (wmReady || wmBound) setWordmark(wordmark, name);
  else misses.push(`${fontKey(SEMIBOLD)} unavailable, so the brand name is empty`);
  wordmark.x = COVER_INSET;
  wordmark.y = WORDMARK_TOP;

  const { t: version, ready: vReady } = textNode(api, 'version', REGULAR, loaded);
  frame.appendChild?.(version);
  const vBound = await bindFont(api, vars, version, VERSION_FONT_VARIABLES, misses);
  version.lineHeight = percent(100);
  version.fills = paint(api, vars, INK_VARIABLE, INK_PLACEHOLDER);
  if (vReady || vBound) version.characters = coverVersion(engine);
  else misses.push(`${fontKey(REGULAR)} unavailable, so the version is empty`);
  version.fontSize = VERSION_SIZE;
  version.textAutoResize = 'WIDTH_AND_HEIGHT';
  version.x = COVER_INSET;
  version.y = COVER_HEIGHT - VERSION_BOTTOM - VERSION_SIZE;

  const record: CoverRecord = { engine, name, print: coverPrint(frame) };
  frame.setSharedPluginData?.(COVER_NS, COVER_KEY, JSON.stringify(record));
  return { did: 'drawn', engine, name, thumbnail: await settleThumbnail(api, frame), fontMisses: [...new Set(misses)] };
};

/**
 * DRAW THE COVER, OR KEEP IT CURRENT. `brand` is the name to show (`brandNameOf`), or null when the file holds no brand.
 * No cover yet: one is drawn, and needs a brand. An unedited cover: its version and name are set and placeholders
 * bound, in place. An edited cover: only its tagged version text is set, or nothing when that text is gone. Never
 * throws for a missing page or font; a refused host write is the caller's to catch.
 */
export const drawCover = async (api: CoverApi, root: CoverRoot, o: { brand: string | null; engine?: string }): Promise<CoverOutcome> => {
  const engine = o.engine ?? ENGINE_VERSION;
  const page = coverPage(root);
  if (!page) return { did: 'none', skipped: 'not drawn, the file has no Cover page. Run Set up file, then Update', fontMisses: [] };
  const own = ownCover(page);
  if (!own) {
    if (o.brand === null) return { did: 'none', skipped: 'not drawn yet, the file has no brand. Apply Theme, then Update draws it', fontMisses: [] };
    return drawNew(api, page, o.brand, engine);
  }
  const { frame, record } = own;
  const edited = coverPrint(frame) !== record.print;
  const version = findPart(frame, 'version');
  if (!version) {
    if (edited) return { did: 'none', skipped: 'edited by hand, and its version text is gone. Nothing was written', fontMisses: [] };
    // An unedited cover without its version text was never fully drawn: draw it again, beside the old one.
    return o.brand === null ? { did: 'none', skipped: 'not drawn yet, the file has no brand. Apply Theme, then Update draws it', fontMisses: [] } : drawNew(api, page, o.brand, engine);
  }
  const misses: string[] = [];
  const out: CoverOutcome = { did: edited ? 'version' : 'refreshed', fontMisses: misses };
  if (version.characters !== coverVersion(engine)) {
    if (await loadOwn(api, version)) { version.characters = coverVersion(engine); out.engine = engine; }
    else misses.push(`the version text's font ${font(version) || '(mixed)'} would not load, so it still shows ${String(version.characters ?? '')}`);
  }
  if (edited) {
    if (!out.engine) return { did: 'none', fontMisses: misses };
    out.engine = engine;
    const thumb = await settleThumbnail(api, frame);
    if (typeof thumb === 'object') out.thumbnail = thumb;
    return out;
  }
  const vars = await localVariables(api);
  const before = paintKey(frame.fills);
  if (isPlaceholder(frame.fills, GROUND_PLACEHOLDER)) frame.fills = paint(api, vars, GROUND_VARIABLE, GROUND_PLACEHOLDER);
  let bound = paintKey(frame.fills) !== before;
  const wordmark = findPart(frame, 'brand');
  for (const [t, fv] of [[wordmark, WORDMARK_FONT_VARIABLES], [version, VERSION_FONT_VARIABLES]] as const) {
    if (!t) continue;
    const was = paintKey(t.fills);
    if (isPlaceholder(t.fills, INK_PLACEHOLDER)) t.fills = paint(api, vars, INK_VARIABLE, INK_PLACEHOLDER);
    if (paintKey(t.fills) !== was) bound = true;
    if (!boundId(t, 'fontFamily') && await bindFont(api, vars, t, fv, misses)) bound = true;
  }
  if (wordmark && o.brand !== null && wordmark.characters !== o.brand) {
    if (await loadOwn(api, wordmark)) { setWordmark(wordmark, o.brand); out.name = o.brand; }
    else misses.push(`the brand text's font ${font(wordmark) || '(mixed)'} would not load, so it still shows ${String(wordmark.characters ?? '')}`);
  }
  frame.setSharedPluginData?.(COVER_NS, COVER_KEY, JSON.stringify({ engine, name: out.name ?? record.name, print: coverPrint(frame) } satisfies CoverRecord));
  out.thumbnail = await settleThumbnail(api, frame);
  // Nothing moved and the thumbnail was already settled: no line.
  if (!out.engine && !out.name && !bound && out.thumbnail !== 'set' && !misses.length) return { did: 'none', fontMisses: [] };
  return out;
};
