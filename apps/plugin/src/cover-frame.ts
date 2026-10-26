/**
 * THE LIBRARY COVER (#2859; redesigned #2915, owner decision Q1–Q5 A) — the library's name and the engine version,
 * 1920 × 1080, as the file thumbnail.
 *
 * WHAT (Q1 A, the reference as it is: simple, a good-looking start a team will change). A plain page ground; the
 * library's name centered in the brand's display face and color at a moderate size; a small subtitle under it
 * ("Design system", Q2 A, DRAFT wording); the version small at bottom-left (`v0.237.0`, Q3 A); and an empty logo slot
 * top-right (Q4 A). The name is `BrandInput.name`, else the brand's id made readable (`prism3` → "Prism3", Q5 A), and
 * then the dry run and the result say no display name is set. The contract, the date and what changed are the About
 * frame's (#2858), which sits beside it.
 *
 * BOUND, SO A THEME MOVES IT LIVE (Q?3 A). The frame's fill binds `<root>/color/background/primary`; the name's ink
 * `<root>/color/text/brand`, the subtitle's and the version's `<root>/color/text/secondary`. Every one holds 4.5:1 on
 * that ground in every example brand and mode (`test-cover-frame.ts` measures it), though the name, at 120 px, would
 * need only 3:1. `text/tertiary` measures 3.5–3.9:1, so it is not used. The name's family and style bind
 * `<root>/core/font/family/display` and `…/style/display/strong`, the other two texts' the body pair. No text style:
 * the largest is 120 px, 20 px on a 320 px card. A file with no such variable yet gets placeholders, bound by the
 * first Update that finds the variable, and only while the placeholder is still there (`furniture-templates.ts`'s
 * `bindBackdrop` rule): a fill or font a designer changed is theirs.
 *
 * THE LOGO SLOT (Q4 A, #2891). An empty frame named "Logo", top-right, tagged `cover-part` = `logo`. Update never reads
 * or writes inside it, and `coverPrint` leaves it out, so a logo pasted into it is not a hand edit: the name and the
 * version keep updating, and the name stays visible beside the logo.
 *
 * CANVAS FURNITURE, drawn by Set up file (Q?5 A) and kept current by every Update, unless Documentation has the cover
 * off (#2977, read by the callers). The frame carries shared plugin data `prism3`/`cover`: the engine, name and design
 * it was drawn for and its fingerprint (`coverPrint`); its parts carry `prism3`/`cover-part` = `brand` (the name),
 * `subtitle`, `version` or `logo`. AN UPDATE NEVER REPLACES THE FRAME, so the thumbnail pointer, the place a designer
 * moved it to and anything they added stay. An unedited cover is refreshed in place: the version, the name, and any
 * placeholder bound. An unedited cover drawn in the first design (#2859, a brand-color ground; its record has no
 * `design`) is redrawn in this one inside the same frame. A cover EDITED BY HAND is never redrawn (#2956): it keeps
 * every edit, the dry run and the result call it "(edited)", and only its tagged version text is set (Q?4 B). If that
 * text is gone, nothing is written and the result says so.
 *
 * WHY ITS OWN FINGERPRINT, not the style guide's `fingerprintOf`: that one reads each text's font and size, and a bound
 * display face moves both whenever Apply Theme changes the family, so every theme change would read as a hand edit.
 * `coverPrint` reads a bound font by its variable and leaves text geometry out; the version's characters are left out
 * too, since the Update writes them, and so is the logo slot, whatever it holds.
 *
 * THE THUMBNAIL. Set only while `getFileThumbnailNodeAsync()` is Figma's default (`null`). A frame the designer chose
 * is never replaced, and the result names it.
 *
 * HELD FOR THE OWNER: every number here is the approved wireframe's (#2915, direction A): the name at 120 px, 110 %
 * leading, −1 % tracking, wrapping inside a 240 px inset; the subtitle 28 px under it at 36 px; the pair centered on
 * the frame; the version at 28 px and the 200 × 72 logo slot, each 96 px in from its corner.
 */
import { ENGINE_VERSION } from '@prism3/engine/version';
import { REGULAR, SEMIBOLD, fontKey, solid, type FNode, type FileComponentsApi } from './file-components';
import { fnv } from './style-guide';
import { ABOUT_NAME, ABOUT_ONLY_CHECK, ABOUT_ONLY_DONE, coverPage as aboutCoverPage } from './about-frame';
import { restoreInput, type SharedDataPort } from './persist-figma';

export const COVER_NS = 'prism3';
export const COVER_KEY = 'cover';
export const COVER_PART_KEY = 'cover-part';
export const COVER_NAME = 'Cover';
export const COVER_EDITED = `${COVER_NAME} (edited)`;
/** The design a cover was drawn in: 2 is #2915's. A record without one was drawn in #2859's first design. */
export const COVER_DESIGN = 2;
export const COVER_WIDTH = 1920;
export const COVER_HEIGHT = 1080;
/** The name and the subtitle wrap inside this inset, left and right. */
export const TEXT_INSET = 240;
/** The version and the logo slot sit this far in from their corners. */
export const EDGE_INSET = 96;
export const NAME_SIZE = 120;
/** Space between the name and the subtitle, in px. */
export const NAME_GAP = 28;
export const SUBTITLE_SIZE = 36;
export const VERSION_SIZE = 28;
export const LOGO_WIDTH = 200;
export const LOGO_HEIGHT = 72;
export const LOGO_NAME = 'Logo';
/** What the subtitle reads when drawn (Q2 A). DRAFT wording: it joins the wording pass. */
export const COVER_SUBTITLE = 'Design system';
/** Space between the cover and what a non-empty Cover page already holds, in px (the About frame's gap). */
export const COVER_GAP = 40;

/** The variables the cover binds, by the tail every brand's name ends in (`<root>/…`). */
export const GROUND_VARIABLE = 'color/background/primary';
export const NAME_INK_VARIABLE = 'color/text/brand';
export const TEXT_INK_VARIABLE = 'color/text/secondary';
export const WORDMARK_FONT_VARIABLES = { family: 'core/font/family/display', style: 'core/font/style/display/strong' } as const;
export const BODY_FONT_VARIABLES = { family: 'core/font/family/body', style: 'core/font/style/body/default' } as const;
/** The placeholders until the theme's variables exist. */
export const GROUND_PLACEHOLDER = '#FFFFFF';
export const NAME_INK_PLACEHOLDER = '#3D3A4D';
export const TEXT_INK_PLACEHOLDER = '#67696B';

/** What the version text reads (Q3 A). */
export const coverVersion = (engine: string = ENGINE_VERSION): string => `v${engine}`;
/** An id made readable (Q5 A): each word's first letter raised, hyphens and underscores to spaces (`prism3` →
 *  "Prism3", `harbor-fleet` → "Harbor Fleet"). */
export const readableId = (id: string): string =>
  id.split(/[-_\s]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') || id;
/** The brand's name as the cover shows it: `name`, else the id made readable (Q5 A). */
export const brandNameOf = (brand: { id: string; name?: string } | null | undefined): string | null =>
  brand ? (brand.name?.trim() || readableId(brand.id)) : null;
/** The brand the file holds (`persist-figma.ts`), or null for none, an unreadable one, or a root that keeps no
 *  plugin data. */
const savedBrand = (root: unknown): { id: string; name?: string } | null => {
  const r = root as Partial<SharedDataPort> | null;
  if (typeof r?.getSharedPluginData !== 'function') return null;
  try { return restoreInput(r as SharedDataPort); } catch { return null; }
};
/** The name of the brand the file holds, or null. */
export const savedBrandName = (root: unknown): string | null => brandNameOf(savedBrand(root));

/**
 * THE NAME TO SHOW, and, when it is the readable id because no display name is set, that name again (`unnamed`).
 * `brand` given: that name, and `unnamed` as the caller says. Not given: the brand the file holds.
 */
const nameFor = (root: unknown, o: { brand?: string | null; unnamed?: boolean }): { brand: string | null; unnamed?: string } => {
  if (o.brand !== undefined) return o.brand !== null && o.unnamed ? { brand: o.brand, unnamed: o.brand } : { brand: o.brand };
  const b = savedBrand(root);
  const brand = brandNameOf(b);
  return brand !== null && !b?.name?.trim() ? { brand, unnamed: brand } : { brand };
};

export type CoverPart = 'brand' | 'subtitle' | 'version';
/** What the frame records about itself. */
export type CoverRecord = { engine: string; name: string; print: string; design?: number };

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
  textAlignHorizontal?: unknown;
  getSharedPluginData?(ns: string, key: string): string;
  setSharedPluginData?(ns: string, key: string, value: string): void;
  setBoundVariable?(field: string, variable: unknown): void;
  remove?(): void;
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

/** Each text part's look: its layer name, ink, face and fallback face, and its size, leading and tracking (in %). */
const TEXT_PARTS: Record<CoverPart, {
  layer: string; ink: string; placeholder: string; font: { family: string; style: string }; fallback: { family: string; style: string };
  size: number; leading: number; tracking: number;
}> = {
  brand: { layer: 'Name', ink: NAME_INK_VARIABLE, placeholder: NAME_INK_PLACEHOLDER, font: WORDMARK_FONT_VARIABLES, fallback: SEMIBOLD, size: NAME_SIZE, leading: 110, tracking: -1 },
  subtitle: { layer: 'Subtitle', ink: TEXT_INK_VARIABLE, placeholder: TEXT_INK_PLACEHOLDER, font: BODY_FONT_VARIABLES, fallback: REGULAR, size: SUBTITLE_SIZE, leading: 130, tracking: 2 },
  version: { layer: 'Version', ink: TEXT_INK_VARIABLE, placeholder: TEXT_INK_PLACEHOLDER, font: BODY_FONT_VARIABLES, fallback: REGULAR, size: VERSION_SIZE, leading: 120, tracking: 2 },
};
const PART_ORDER: readonly CoverPart[] = ['brand', 'subtitle', 'version'];

/** The Cover page, found as the About frame finds it (one lookup for both). */
const coverPage = (root: CoverRoot): CoverPage | null => aboutCoverPage(root) as CoverPage | null;

const recordOf = (n: CNode): CoverRecord | null => {
  const raw = n.getSharedPluginData?.(COVER_NS, COVER_KEY) ?? '';
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Partial<CoverRecord>;
    return { engine: String(r.engine ?? ''), name: String(r.name ?? ''), print: String(r.print ?? ''), ...(typeof r.design === 'number' ? { design: r.design } : {}) };
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
/** The logo slot is never read inside: its own tag stops every walk here. */
const isSlot = (n: CNode): boolean => partOf(n) === 'logo';
/** The tagged text inside the cover, at any depth (a designer may wrap it), never inside the logo slot. */
const findPart = (n: CNode, part: CoverPart): CNode | null => {
  if (n.type === 'TEXT' && partOf(n) === part) return n;
  if (isSlot(n)) return null;
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
 * a text's size on the canvas (a new display face moves it), the version's characters (the Update writes them), and
 * the logo slot, itself or anything in it (Q4 A: a logo pasted there is not an edit).
 */
export const coverPrint = (frame: CNode): string => {
  const parts: string[] = [];
  const walk = (n: CNode, depth: number): void => {
    if (depth > 0 && isSlot(n)) return;
    const text = n.type === 'TEXT';
    const at = depth === 0 ? `${Math.round(n.width ?? 0)}x${Math.round(n.height ?? 0)}`
      : text ? `${Math.round(n.x ?? 0)},${Math.round(n.y ?? 0)}` : `${Math.round(n.x ?? 0)},${Math.round(n.y ?? 0)},${Math.round(n.width ?? 0)}x${Math.round(n.height ?? 0)}`;
    const typeface = text ? [boundId(n, 'fontFamily') ? `@${boundId(n, 'fontFamily')}` : font(n).split(' ')[0], boundId(n, 'fontStyle') ? `@${boundId(n, 'fontStyle')}` : font(n), String(n.fontSize ?? '')].join('/') : '';
    const chars = text && partOf(n) !== 'version' ? String(n.characters ?? '') : '';
    parts.push(JSON.stringify([depth, n.type, n.name, n.visible === false ? 'hidden' : '', partOf(n), at, chars, typeface, paintKey(n.fills), paintKey(n.strokes)]));
    for (const c of n.children ?? []) walk(c, depth + 1);
  };
  walk(frame, 0);
  const s = parts.join('\n');
  return `${fnv(s, false)}${fnv(s, true)}`;
};

/** The variable a tail names, as `furniture-templates.ts` finds the backdrop's. */
const byTail = (all: readonly CoverVariable[], tail: string): CoverVariable | null =>
  all.find((v) => v.name === tail || v.name.endsWith(`/${tail}`)) ?? null;
const localVariables = async (api: { variables?: Pick<CoverVariables, 'getLocalVariablesAsync'> }): Promise<readonly CoverVariable[]> => {
  try { return (await api.variables?.getLocalVariablesAsync()) ?? []; } catch { return []; }
};

const isPlaceholder = (fills: unknown, hex: string): boolean => paintKey(fills) === paintKey(solid(hex));
/** Placeholder fills and fonts that a theme variable can now bind. */
const bindable = (frame: CNode, vars: readonly CoverVariable[]): boolean => {
  if (isPlaceholder(frame.fills, GROUND_PLACEHOLDER) && byTail(vars, GROUND_VARIABLE)) return true;
  for (const part of PART_ORDER) {
    const t = findPart(frame, part);
    const spec = TEXT_PARTS[part];
    if (!t) continue;
    if (isPlaceholder(t.fills, spec.placeholder) && byTail(vars, spec.ink)) return true;
    if (!boundId(t, 'fontFamily') && byTail(vars, spec.font.family) && byTail(vars, spec.font.style)) return true;
  }
  return false;
};

/**
 * WHAT AN UPDATE OWES THE COVER, read without writing.
 *   `no-cover`   the file has no Cover page;
 *   `missing`    no cover on it;
 *   `stale`      its version text shows another engine (`shows`), or, unedited, it was drawn in the first design
 *                (`redraw`), its name is another (`name`) or a placeholder can now bind (`bind`). An edited cover is
 *                stale only for its version;
 *   `no-version` the tagged version text is gone, a hand edit whatever the fingerprint reads: nothing can be written;
 *   `current`.
 * `brand` is the name the cover should show, or null when the file holds no brand: then the name is not compared.
 * `unnamed` is that name when no display name is set (the id made readable, Q5 A), on a state that writes the name.
 */
export type CoverDue =
  | { state: 'no-cover' }
  | { state: 'missing'; noBrand?: true; unnamed?: string }
  | { state: 'stale'; shows?: string; redraw?: true; name?: { from: string; to: string }; bind?: true; edited?: true; unnamed?: string }
  | { state: 'no-version'; edited: true }
  | { state: 'current'; edited?: true };

/** The engine a version text shows: the number after "v" or the first design's "Prism3 ", else the text as it is. */
const shownVersion = (s: string): string => s.replace(/^(?:Prism3\s+|v(?=\d))/, '');

export const coverDue = async (
  root: CoverRoot, o: { brand?: string | null; unnamed?: boolean; engine?: string; api?: { variables?: Pick<CoverVariables, 'getLocalVariablesAsync'> } } = {},
): Promise<CoverDue | undefined> => {
  if (!root.children) return undefined;
  const page = coverPage(root);
  if (!page) return { state: 'no-cover' };
  const { brand, unnamed } = nameFor(root, o);
  const named = unnamed !== undefined ? { unnamed } : {};
  const own = ownCover(page);
  // Nothing to draw without a brand: missing, and not work.
  if (!own) return brand === null ? { state: 'missing', noBrand: true } : { state: 'missing', ...named };
  const engine = o.engine ?? ENGINE_VERSION;
  const edited = coverPrint(own.frame) !== own.record.print;
  const version = findPart(own.frame, 'version');
  // A gone version text is a hand edit whatever the fingerprint says: redrawing would put a second cover on the page.
  if (!version) return { state: 'no-version', edited: true };
  if (!edited && own.record.design !== COVER_DESIGN && brand !== null) return { state: 'stale', redraw: true, ...named };
  const out: { shows?: string; name?: { from: string; to: string }; bind?: true } = {};
  if (version.characters !== coverVersion(engine)) out.shows = shownVersion(String(version.characters ?? ''));
  if (!edited) {
    const wordmark = findPart(own.frame, 'brand');
    if (brand !== null && wordmark && wordmark.characters !== brand) out.name = { from: String(wordmark.characters ?? ''), to: brand };
    if (bindable(own.frame, await localVariables(o.api ?? {}))) out.bind = true;
  }
  const flag = edited ? { edited: true as const } : {};
  if (!Object.keys(out).length) return { state: 'current', ...flag };
  return { state: 'stale', ...out, ...flag, ...(out.name ? named : {}) };
};

/** Whether the cover is work for an Update on its own: one to draw (with a brand to draw it for) or to bring current. */
export const coverIsWork = (d: CoverDue | undefined): boolean => (d?.state === 'missing' && !d.noBrand) || d?.state === 'stale';

/**
 * WHEN THE COVER PAGE'S FURNITURE IS AN UPDATE'S ONLY WORK (owner decision Q498 B, which the approved wireframe extends to
 * the cover): no named version is saved, and the dry run (`done` false) and the run log say so. With the About frame
 * alone, its approved lines, unchanged. DRAFT wording where the cover is named.
 */
export const coverPageOnlyLine = (o: { about: boolean; cover: boolean }, done: boolean): string => {
  if (!o.cover) return o.about ? (done ? ABOUT_ONLY_DONE : ABOUT_ONLY_CHECK) : '';
  const what = o.about ? `the cover and ${ABOUT_NAME}` : 'the cover';
  return done ? `No version saved first — only ${what} changed, no set.` : `No version is saved first — only ${what} change${o.about ? '' : 's'}, no set.`;
};

/** The sentence that says the name shown is the readable id (Q5 A). DRAFT wording. */
const unnamedNote = (shown: string | undefined): string => (shown === undefined ? '' : ` No display name is set, so it shows ${shown}, from the brand's id.`);

/** The dry run's line for the cover, or ''. DRAFT wording, the wireframe's where it has one. */
export const coverDueLine = (d: CoverDue | undefined, engine: string = ENGINE_VERSION): string => {
  if (!d) return '';
  if (d.state === 'missing') return d.noBrand ? `${COVER_NAME}: not drawn yet, the file has no brand. Apply Theme, then Update draws it.` : `${COVER_NAME}: to draw on the Cover page.${unnamedNote(d.unnamed)}`;
  if (d.state === 'no-version') return `${COVER_EDITED}: its version text is gone, so Update writes nothing to it.`;
  if (d.state !== 'stale') return '';
  if (d.redraw) return `${COVER_NAME}: to redraw in the new design, at ${engine}.${unnamedNote(d.unnamed)}`;
  const what = [
    ...(d.shows !== undefined ? [`set the version to ${engine} (shows ${d.shows || 'nothing'})`] : []),
    ...(d.name ? [`set the brand name to ${d.name.to} (shows ${d.name.from || 'nothing'})`] : []),
    ...(d.bind ? ['bind its colors and fonts to the theme'] : []),
  ];
  return d.edited ? `${COVER_EDITED}: to ${what.join(', ')}. Only its version text changes; every other edit is kept.`
    : `${COVER_NAME}: to ${what.join(', ')}.${unnamedNote(d.unnamed)}`;
};

export type CoverOutcome = {
  /** What was done: `drawn` a new cover, `redrawn` a first-design one in this design, `refreshed` an unedited one,
   *  `version` set in an edited one, or nothing. */
  did: 'drawn' | 'redrawn' | 'refreshed' | 'version' | 'none';
  /** Why nothing was done, when it was not. */
  skipped?: string;
  /** The version now shown, when it was set. */
  engine?: string;
  /** The brand name now shown, when it was set. */
  name?: string;
  /** The name written, when it is the readable id because no display name is set (Q5 A). */
  unnamed?: string;
  /** The file thumbnail: `set` to the cover now, already the cover, a frame the designer chose (`theirs`, named),
   *  or not readable by this host. */
  thumbnail?: 'set' | 'ours' | 'default' | { theirs: string } | 'unavailable';
  /** True when a placeholder fill or font was bound to the theme. */
  bound?: true;
  fontMisses: string[];
};

/** The result's line for the cover, or ''. DRAFT wording, the wireframe's where it has one. */
export const coverLine = (o: CoverOutcome | undefined): string => {
  if (!o) return '';
  const fonts = o.fontMisses.length ? ` ${o.fontMisses.map((m) => m[0].toUpperCase() + m.slice(1)).join('. ')}.` : '';
  const thumb = typeof o.thumbnail === 'object' ? ` The file thumbnail is your frame "${o.thumbnail.theirs}"; Prism3 left it.` : '';
  const set = o.thumbnail === 'set' ? ' Set as the file thumbnail.' : '';
  const unnamed = unnamedNote(o.unnamed);
  if (o.did === 'none') return o.skipped ? `${COVER_NAME}: ${o.skipped}.` : '';
  if (o.did === 'drawn') return o.thumbnail === 'set' ? `${COVER_NAME}: drawn and set as the file thumbnail.${unnamed}${fonts}` : `${COVER_NAME}: drawn.${thumb}${unnamed}${fonts}`;
  if (o.did === 'redrawn') return `${COVER_NAME}: redrawn in the new design.${set}${thumb}${unnamed}${fonts}`;
  if (o.did === 'version') return `${COVER_EDITED}: only its version text was set, to ${o.engine}; every other edit was kept.${thumb}`;
  const what = [...(o.engine ? [`version set to ${o.engine}`] : []), ...(o.name ? [`brand name set to ${o.name}`] : []), ...(o.bound ? ['bound to the theme'] : [])];
  return `${COVER_NAME}: ${what.length ? `${what.join(', ')}.` : 'not changed.'}${set}${thumb}${unnamed}${fonts}`;
};

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

/**
 * PLACE THE PARTS (the wireframe's direction A): the name and the subtitle as one block, each wrapping inside
 * `TEXT_INSET` and centered on its lines, the block centered on the frame with `NAME_GAP` between; the version
 * `EDGE_INSET` in from the bottom-left corner. A text whose face is not loaded (`ready` false) is moved, never resized:
 * Figma refuses that on an unloaded font.
 */
const place = (frame: CNode, ready: (t: CNode) => boolean): void => {
  const width = COVER_WIDTH - 2 * TEXT_INSET;
  const block = (['brand', 'subtitle'] as const).map((p) => findPart(frame, p)).filter((t): t is CNode => !!t);
  for (const t of block) {
    if (ready(t)) {
      t.resize?.(width, t.height ?? TEXT_PARTS[partOf(t) as CoverPart].size);
      t.textAutoResize = 'HEIGHT';
    }
    t.x = TEXT_INSET;
  }
  const tall = block.reduce((s, t) => s + (t.height ?? 0), 0) + NAME_GAP * Math.max(0, block.length - 1);
  let y = Math.round((COVER_HEIGHT - tall) / 2);
  for (const t of block) { t.y = y; y += (t.height ?? 0) + NAME_GAP; }
  const version = findPart(frame, 'version');
  if (version) {
    version.x = EDGE_INSET;
    version.y = COVER_HEIGHT - EDGE_INSET - (version.height ?? VERSION_SIZE);
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

/**
 * ONE TAGGED TEXT, appended to the frame: on the brand's bound face, else its fallback, styled and given its
 * characters. With neither face loaded it stays empty and unstyled (Figma refuses both on an unloaded font), the miss
 * is named, as `file-components.ts`'s `makeText` does, and it returns null.
 */
const addText = async (api: CoverApi, frame: CNode, vars: readonly CoverVariable[], loaded: Set<string>, part: CoverPart, chars: string, misses: string[]): Promise<CNode | null> => {
  const spec = TEXT_PARTS[part];
  const t = api.createText() as CNode;
  t.name = spec.layer;
  t.setSharedPluginData?.(COVER_NS, COVER_PART_KEY, part);
  frame.appendChild?.(t);
  const fallback = loaded.has(fontKey(spec.fallback));
  if (fallback) t.fontName = { ...spec.fallback };
  const bound = await bindFont(api, vars, t, spec.font, misses);
  t.fills = paint(api, vars, spec.ink, spec.placeholder);
  if (!fallback && !bound) { misses.push(`${fontKey(spec.fallback)} unavailable, so the ${spec.layer.toLowerCase()} is empty`); return null; }
  t.fontSize = spec.size;
  t.lineHeight = percent(spec.leading);
  t.letterSpacing = percent(spec.tracking);
  t.textAlignHorizontal = part === 'version' ? 'LEFT' : 'CENTER';
  t.textAutoResize = 'WIDTH_AND_HEIGHT';
  t.characters = chars;
  return t;
};

/**
 * FURNISH A FRAME IN THIS DESIGN: its ground, the name, the subtitle, the version and the logo slot, placed, and the
 * record written. The frame is new (`drawNew`) or a first-design cover emptied of its own unedited parts (`drawCover`).
 */
const furnish = async (api: CoverApi, frame: CNode, name: string, engine: string, misses: string[]): Promise<void> => {
  const vars = await localVariables(api);
  const loaded = await loadFallbacks(api);
  frame.fills = paint(api, vars, GROUND_VARIABLE, GROUND_PLACEHOLDER);
  const ready = new Set<CNode>();
  for (const [part, chars] of [['brand', name], ['subtitle', COVER_SUBTITLE], ['version', coverVersion(engine)]] as const) {
    const t = await addText(api, frame, vars, loaded, part, chars, misses);
    if (t) ready.add(t);
  }
  const slot = api.createFrame() as CNode;
  slot.name = LOGO_NAME;
  slot.setSharedPluginData?.(COVER_NS, COVER_PART_KEY, 'logo');
  frame.appendChild?.(slot);
  slot.resize?.(LOGO_WIDTH, LOGO_HEIGHT);
  slot.fills = [];
  slot.clipsContent = false;
  slot.x = COVER_WIDTH - EDGE_INSET - LOGO_WIDTH;
  slot.y = EDGE_INSET;
  place(frame, (t) => ready.has(t));
  frame.setSharedPluginData?.(COVER_NS, COVER_KEY, JSON.stringify({ engine, name, print: coverPrint(frame), design: COVER_DESIGN } satisfies CoverRecord));
};

const contentRight = (page: CoverPage): { right: number; top: number } | null => {
  const ns = page.children.filter((n) => typeof n.x === 'number' && typeof n.y === 'number');
  if (!ns.length) return null;
  return { right: Math.max(...ns.map((n) => (n.x as number) + (n.width ?? 0))), top: Math.min(...ns.map((n) => n.y as number)) };
};

/** Draw a new cover on the page: at the origin of an empty page, else `COVER_GAP` right of what it holds. */
const drawNew = async (api: CoverApi, page: CoverPage, name: string, engine: string): Promise<CoverOutcome> => {
  const misses: string[] = [];
  const box = contentRight(page);
  const frame = api.createFrame() as CNode;
  frame.name = COVER_NAME;
  frame.resize?.(COVER_WIDTH, COVER_HEIGHT);
  frame.clipsContent = true;
  page.appendChild(frame);
  if (box) { frame.x = box.right + COVER_GAP; frame.y = box.top; } else { frame.x = 0; frame.y = 0; }
  await furnish(api, frame, name, engine, misses);
  return { did: 'drawn', engine, name, thumbnail: await settleThumbnail(api, frame), fontMisses: [...new Set(misses)] };
};

/**
 * DRAW THE COVER, OR KEEP IT CURRENT. `brand` is the name to show (`brandNameOf`), or null when the file holds no brand;
 * `unnamed` says it is the readable id. Neither given: the brand the file holds. No cover yet: one is drawn, and needs
 * a brand. An unedited first-design cover: redrawn in this design in the same frame. An unedited cover: its version
 * and name are set and placeholders bound, in place. An edited cover: only its tagged version text is set, or nothing
 * when that text is gone. Never throws for a missing page or font; a refused host write is the caller's to catch.
 */
export const drawCover = async (api: CoverApi, root: CoverRoot, o: { brand?: string | null; unnamed?: boolean; engine?: string } = {}): Promise<CoverOutcome> => {
  const engine = o.engine ?? ENGINE_VERSION;
  const { brand, unnamed } = nameFor(root, o);
  const named = unnamed !== undefined ? { unnamed } : {};
  const page = coverPage(root);
  if (!page) return { did: 'none', skipped: 'not drawn, the file has no Cover page. Run Set up file, then Update', fontMisses: [] };
  const own = ownCover(page);
  if (!own) {
    if (brand === null) return { did: 'none', skipped: 'not drawn yet, the file has no brand. Apply Theme, then Update draws it', fontMisses: [] };
    return { ...(await drawNew(api, page, brand, engine)), ...named };
  }
  const { frame, record } = own;
  const edited = coverPrint(frame) !== record.print;
  const version = findPart(frame, 'version');
  // As `coverDue` reads it: never a second cover, since `ownCover` would keep finding this one.
  if (!version) return { did: 'none', skipped: 'edited by hand, and its version text is gone. Nothing was written', fontMisses: [] };
  // An unedited cover in the first design: every layer in it is Prism3's (any other would be an edit), so they go and
  // this design is drawn in the same frame, which keeps its place and the thumbnail pointer.
  if (!edited && record.design !== COVER_DESIGN && brand !== null) {
    const misses: string[] = [];
    for (const c of [...(frame.children ?? [])]) c.remove?.();
    await furnish(api, frame, brand, engine, misses);
    const thumb = await settleThumbnail(api, frame);
    return { did: 'redrawn', engine, name: brand, ...named, ...(thumb === 'set' || typeof thumb === 'object' ? { thumbnail: thumb } : {}), fontMisses: [...new Set(misses)] };
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
  for (const part of PART_ORDER) {
    const t = findPart(frame, part);
    const spec = TEXT_PARTS[part];
    if (!t) continue;
    const was = paintKey(t.fills);
    if (isPlaceholder(t.fills, spec.placeholder)) t.fills = paint(api, vars, spec.ink, spec.placeholder);
    if (paintKey(t.fills) !== was) bound = true;
    if (!boundId(t, 'fontFamily') && await bindFont(api, vars, t, spec.font, misses)) bound = true;
  }
  const wordmark = findPart(frame, 'brand');
  if (wordmark && brand !== null && wordmark.characters !== brand) {
    if (await loadOwn(api, wordmark)) { wordmark.characters = brand; out.name = brand; Object.assign(out, named); }
    else misses.push(`the brand text's font ${font(wordmark) || '(mixed)'} would not load, so it still shows ${String(wordmark.characters ?? '')}`);
  }
  // A new name or face can change the block's height: centered again, as drawn, each text resized only on a face
  // that loads.
  if ((out.name || bound) && record.design === COVER_DESIGN) {
    const ready = new Set<CNode>();
    for (const part of PART_ORDER) { const t = findPart(frame, part); if (t && await loadOwn(api, t)) ready.add(t); }
    place(frame, (t) => ready.has(t));
  }
  // The design stays what it was: a first-design cover reaches here only while the file holds no brand to redraw it for.
  frame.setSharedPluginData?.(COVER_NS, COVER_KEY, JSON.stringify({ ...record, engine, name: out.name ?? record.name, print: coverPrint(frame) } satisfies CoverRecord));
  out.thumbnail = await settleThumbnail(api, frame);
  // Nothing moved and the thumbnail was already settled: no line.
  if (!out.engine && !out.name && !bound && out.thumbnail !== 'set' && !misses.length) return { did: 'none', fontMisses: [] };
  return bound ? { ...out, bound: true } : out;
};
