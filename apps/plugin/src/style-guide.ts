/**
 * THE STYLE-GUIDE GENERATOR (#259, phases 1–2: COLOR; DIMENSION, FONT VARIABLES, TEXT STYLES) — a table per token
 * group, drawn from the file's own variables and text styles.
 *
 * Absorbed as a plugin feature (`docs/09` §4): the tables document the variables a theme write left in THIS
 * file, so they are read from `figma.variables`, not from the engine's emission. The design record for every
 * phase is `docs/45-style-guide-generator.md`; this module is phase 1 (every COLOR variable collection) and phase 2
 * (dimension and font variables, one table per collection and type, and the text styles; docs/45 §6, "How phase 2
 * decides").
 *
 * TWO HALVES, the shape every executor in this plugin takes:
 *   • `planStyleGuide` — PURE. A catalog of collections + variables and the engine's contrast contract in,
 *     a list of tables out: which page, which rows in which order, and per mode the value, the alias, the
 *     ground the specimen is drawn on and the measured contrast against it. `test-style-guide.ts` asserts
 *     it with no host.
 *   • `runStyleGuide` — the executor. Writes the plan into the file from the cell sets
 *     (`style-guide-cells.ts`). Never throws for a missing optional piece: no page, no cell set, no header
 *     set, a font the host cannot load — each is a skip, reported by name.
 *
 * OWNER DECISIONS (2026-09-27/28, recorded on #259) this module carries:
 *   1. PRIMITIVE collections go on `↳ Primitive tokens`, SEMANTIC ones on `↳ Semantic tokens`; a missing page
 *      is a skip, never created.
 *   2. MODES SIDE BY SIDE — one row per token, one specimen + value column per mode. Each specimen pins its
 *      mode with `setExplicitVariableModeForCollection`, so the swatch stays BOUND to the variable and live;
 *      the value text is static and refreshed on regenerate.
 *   3. Each table opens with a `_Section-header` Size=Medium instance: a title and a one-line description.
 *   4. For COLOR, a measured contrast ratio per mode against the role's contracted ground, marked against
 *      the floor the engine contracts for it — both read from `modes.ts`'s resolved contract, never from
 *      description prose. No contracted ground reads "—".
 *   5. RERUN updates in place — a table is found by its plugin data, never duplicated — and reports tokens
 *      added, removed and changed.
 *   6. A SUPERSEDED table (its group gone, or now drawn as narrower tables) is deleted when the generator made
 *      it and nothing has changed since it last wrote it; one a designer touched is left in place and reported.
 *
 * TWO DEFECTS OF THE OWNER'S EARLIER PLUGIN, FIXED HERE: every specimen was drawn on white, so inverse text
 * and white `on-*` icons were invisible — here each specimen sits on its intended ground, the same variable
 * the contrast column measures against; and rows sorted as text (10, 11, 112, 12) — here primitive steps sort
 * numerically.
 */
import { contrast, composite } from '@prism3/engine/color';
import type { RGB } from '@prism3/engine/color';
import { SECTION_HEADER_SET, isTemplateSet } from './file-components';
import { HEADER_VARIANT } from './page-header';
import { TAXONOMY, allLeaves, leafPageName } from './file-taxonomy';
import { findCellSets, pickVariant, SAMPLE_TEXT, SPACING_CELL_SET, SWATCH_SET, TEXT_CELL_SET } from './style-guide-cells';
import type { CellNode } from './style-guide-cells';
import { realYield } from './write-components';
import type { YieldFn } from './write-components';

// ── The catalog: what the plan reads ───────────────────────────────────────────────────────────────
export interface SgMode { modeId: string; name: string }
export interface SgCollection { id: string; name: string; modes: readonly SgMode[]; defaultModeId?: string }
export interface SgVariable {
  id: string;
  name: string;
  variableCollectionId: string;
  resolvedType: string;
  description?: string;
  valuesByMode: Record<string, unknown>;
  /** The host's `scopes` — what the variable may be bound to. Phase 2 reads a FLOAT or STRING variable's kind from
   *  them first (`FONT_SIZE` is a font size, `CORNER_RADIUS` a radius), and from its name second. */
  scopes?: readonly string[];
}
/** A local text style (#259 phase 2), as `getLocalTextStylesAsync` returns it: the literal values and the
 *  variables its properties are bound to. */
export interface SgTextStyle {
  id: string;
  name: string;
  description?: string;
  fontName: { family: string; style: string };
  fontSize: number;
  lineHeight?: { unit: string; value?: number };
  letterSpacing?: { unit: string; value: number };
  paragraphSpacing?: number;
  textDecoration?: string;
  boundVariables?: Record<string, { id?: string } | undefined>;
}
export interface SgCatalog { collections: readonly SgCollection[]; variables: readonly SgVariable[]; textStyles?: readonly SgTextStyle[] }

/** The engine's contrast contract, per mode: `resolveAllModes(theme)` satisfies it structurally. */
export type SgContract = readonly {
  mode: string;
  roles: Record<string, { against: string; min: number; model?: string; legibleFor?: string }>;
}[];

export type { SwatchType, ValueFormat, StyleGuideOptions, DimensionDisplay, FontDisplay } from './messages';
import type { SwatchType, StyleGuideOptions, ValueFormat } from './messages';

/** The types phases 1 and 2 document: `color`; `dimension` (spacing, size and radius variables); the five font-variable
 *  kinds, one table each; and `typography`, the file's text styles. Everything else is named in the result as a
 *  later phase. Matched in any case. */
export const PHASE_TYPES = ['color', 'dimension', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'typography'] as const;
/** The font-variable kinds, each its own table (proposed, owner to confirm: one table per kind). */
export const FONT_KINDS = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'] as const;
export type FontKind = (typeof FONT_KINDS)[number];
/** The REM base the owner's plugin printed against. */
export const REM_BASE = 16;

const leafName = (page: string): string => {
  const hit = allLeaves(TAXONOMY).find((l) => l.leaf.page === page);
  return hit ? leafPageName(hit.leaf) : `↳ ${page}`;
};
export const PRIMITIVE_PAGE = leafName('Primitive tokens');
export const SEMANTIC_PAGE = leafName('Semantic tokens');

/** The plugin-data key a table's wrapper frame carries — its value is the table's `key`. */
export const TABLE_KEY = 'prism3-style-guide';
/** The rows a table was last written with, for the rerun report. */
export const ROWS_KEY = 'prism3-style-guide-rows';

// ── The plan ───────────────────────────────────────────────────────────────────────────────────────
export interface SgContrast {
  /** The raw ratio — pass/fail is decided on this, never on the displayed figure. */
  ratio: number;
  min: number;
  pass: boolean;
  /** The ground's token path, as the table displays it. */
  ground: string;
  /** For a translucent wash: the ink measured on the composite. */
  ink?: string;
}

export interface SgCell {
  modeId: string;
  modeName: string;
  /** The value as the table prints it, in the chosen format. */
  value: string;
  /** The first alias hop, as a token path, or null for a literal. */
  alias: string | null;
  /** The value independent of the print format — the first alias hop's id and the resolved RGBA — so the
   *  rerun report compares what the token holds, not how the table prints it. */
  raw: string;
  /** The variable the specimen's ground frame is bound to, or null to draw it on the cell. */
  groundId: string | null;
  /** The measured contrast, or null where the role has no contracted ground. */
  contrast: SgContrast | null;
  /** Phase 2: the resolved number in this mode (a dimension's px, a font size or weight), which sizes a spacing
   *  bar and picks the font a weight binds; null for a string or an unresolved value. */
  num?: number | null;
  /** Phase 2: the resolved string in this mode (a font family), which the specimen loads before binding. */
  str?: string | null;
}

/** A phase-2 row's specimen. A color row has none: its `display` names the swatch. */
export type SgSpecimen =
  /** A `_style-guide-spacing-cells` member at the value's width, its bar's width bound to the variable. */
  | { kind: 'spacing'; member: 'filled' | 'line' }
  /** The swatches set's `type=radius` member, its corner bound to the variable. */
  | { kind: 'radius' }
  /** "Abc 123" in a text cell, with one property bound to the variable, or none (`generic`). */
  | { kind: 'font'; bind: FontKind | null }
  /** "Abc 123" in a text cell with the text style applied. */
  | { kind: 'style' };

export interface SgRow {
  variableId: string;
  name: string;
  /** The name as the table prints it — the collection's shared prefix removed. */
  token: string;
  /** The title cell's generated default (#259, owner decision 15): the path humanized, "Text Primary". */
  label: string;
  description: string;
  display: SwatchType;
  cells: SgCell[];
  /** Phase 2: the specimen, when the row is not a color. */
  specimen?: SgSpecimen;
  /** Phase 2: values printed once per row, after the mode columns (a text style's family, weight, letter spacing). */
  extra?: { value: string; alias: string | null }[];
}

export interface SgTable {
  /** Stable across runs: `<type>|<collection>|<group path>`. */
  key: string;
  /** The key's first field: `color`, `dimension`, a font kind (`fontSize`) or `typography`. */
  type: string;
  kind: 'primitive' | 'semantic';
  page: string;
  collectionId: string;
  title: string;
  description: string;
  modes: readonly SgMode[];
  columns: string[];
  rows: SgRow[];
}

export interface SgPlan {
  tables: SgTable[];
  notes: string[];
  /** The `tables` filter's names that match no table (#1778), as given. Each is also said in `notes`. */
  unmatched: string[];
}

type RGBA = { r: number; g: number; b: number; a: number };
const isRgba = (v: unknown): v is RGBA =>
  !!v && typeof v === 'object' && typeof (v as RGBA).r === 'number' && typeof (v as RGBA).g === 'number' && typeof (v as RGBA).b === 'number';
const aliasId = (v: unknown): string | null =>
  !!v && typeof v === 'object' && (v as { type?: unknown }).type === 'VARIABLE_ALIAS' && typeof (v as { id?: unknown }).id === 'string'
    ? (v as { id: string }).id : null;
const to255 = (c: RGBA): RGB => ({ r: c.r * 255, g: c.g * 255, b: c.b * 255 });
const alphaOf = (c: RGBA): number => (typeof c.a === 'number' ? c.a : 1);

/** Numeric-aware order: `5 < 10 < 050 < 100 < 900`, words alphabetical. Primitive steps sort by this. */
export const naturalCompare = (a: string, b: string): number => {
  const as = a.split(/(\d+)/), bs = b.split(/(\d+)/);
  for (let i = 0; i < Math.min(as.length, bs.length); i++) {
    if (as[i] === bs[i]) continue;
    const an = /^\d+$/.test(as[i]), bn = /^\d+$/.test(bs[i]);
    if (an && bn) return Number(as[i]) - Number(bs[i]) || as[i].length - bs[i].length;
    return as[i] < bs[i] ? -1 : 1;
  }
  return as.length - bs.length;
};

/** Ramp order for a palette's steps: named values (`white`, `black`, `transparent`) first in the file's order,
 *  then numeric steps ascending (`5, 10, 025, 050, 100 … 950`). */
export const stepCompare = (a: string, b: string): number => {
  const an = /^\d+$/.test(a), bn = /^\d+$/.test(b);
  if (an !== bn) return an ? 1 : -1;
  return an ? Number(a) - Number(b) || a.length - b.length : 0;
};

/** How many leading path segments two names share — the tie-break that keeps a role's ground in its own root. */
const affinity = (a: string, b: string): number => {
  const x = a.split('/'), y = b.split('/');
  let i = 0;
  while (i < x.length && i < y.length && x[i] === y[i]) i++;
  return i;
};

const commonPrefix = (paths: readonly string[][]): string[] => {
  if (!paths.length) return [];
  const out: string[] = [];
  for (let i = 0; ; i++) {
    const seg = paths[0][i];
    if (seg === undefined || paths.some((p) => p[i] !== seg)) return out;
    out.push(seg);
  }
};

const sentence = (s: string): string => {
  const w = s.replace(/[-_]/g, ' ');
  return w.charAt(0).toUpperCase() + w.slice(1);
};

const pct = (a: number): string => `${Math.round(a * 100)}%`;
const hex2 = (n: number): string => Math.round(n * 255).toString(16).padStart(2, '0').toUpperCase();

/** A color in the chosen format. Translucent values carry their alpha in every format. */
export const formatColor = (c: RGBA, format: ValueFormat): string => {
  const a = Math.round(alphaOf(c) * 100) / 100;
  if (format === 'rgba') {
    const [r, g, b] = [c.r, c.g, c.b].map((x) => Math.round(x * 255));
    return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
  }
  if (format === 'hsl' || format === 'hsb') {
    const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b), d = max - min;
    let h = 0;
    if (d) h = max === c.r ? ((c.g - c.b) / d) % 6 : max === c.g ? (c.b - c.r) / d + 2 : (c.r - c.g) / d + 4;
    h = Math.round(((h * 60) + 360) % 360);
    let s: number, third: number;
    if (format === 'hsl') {
      third = (max + min) / 2;
      s = d ? d / (1 - Math.abs(2 * third - 1)) : 0;
    } else {
      third = max;
      s = max ? d / max : 0;
    }
    const body = `${h}, ${Math.round(s * 100)}%, ${Math.round(third * 100)}%`;
    return a < 1 ? `${format}(${body}, ${pct(a)})` : `${format}(${body})`;
  }
  const h = `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
  return a < 1 ? `${h} · ${pct(a)}` : h;
};

/** A ratio as the table prints it: floored to two places, so a 4.499 never reads "4.50" beside a 4.5 floor. */
export const formatRatio = (ratio: number): string => `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;

/** The contrast cell's words — the ratio, the floor and the verdict, then the ground on a second line. */
export const contrastText = (c: SgContrast | null): string => {
  if (!c) return '—';
  const verdict = c.pass ? `clears the ${c.min}:1 floor` : `below the ${c.min}:1 floor`;
  const where = c.ink ? `${c.ink} over this wash on ${c.ground}` : `on ${c.ground}`;
  return `${formatRatio(c.ratio)} — ${verdict}\n${where}`;
};

interface Index {
  byId: Map<string, SgVariable>;
  collections: Map<string, SgCollection>;
}

const defaultMode = (c: SgCollection | undefined): string | undefined => c?.defaultModeId ?? c?.modes[0]?.modeId;

/**
 * A variable's color in a mode, following aliases. An alias into the SAME collection resolves in the same
 * mode; one into another collection resolves in that collection's default mode — the value Figma shows for
 * a node that pins only this collection's mode.
 */
const resolveColor = (ix: Index, v: SgVariable, modeId: string): RGBA | null => {
  let cur: SgVariable | undefined = v;
  let mode: string | undefined = modeId;
  for (let hop = 0; cur && mode && hop < 16; hop++) {
    const raw: unknown = cur.valuesByMode[mode];
    if (isRgba(raw)) return raw;
    const next = aliasId(raw);
    if (!next) return null;
    const target = ix.byId.get(next);
    if (!target) return null;
    mode = target.variableCollectionId === cur.variableCollectionId ? mode : defaultMode(ix.collections.get(target.variableCollectionId));
    cur = target;
  }
  return null;
};

/** A variable's role key in the contract — the LONGEST dotted suffix of its name that the contract names, so
 *  `…/inverse/text/primary` is `inverse.text.primary`, never `text.primary`. */
const roleKeyOf = (name: string, roles: ReadonlySet<string>): string | null => {
  const segs = name.split('/');
  for (let i = 0; i < segs.length; i++) {
    const k = segs.slice(i).join('.');
    if (roles.has(k)) return k;
  }
  return null;
};

/** The swatch a role draws with, from its name: text, icon or border by the first such segment, a
 *  translucent value as transparency, anything else the filled default. */
const autoDisplay = (segments: readonly string[], translucent: boolean): SwatchType => {
  const hit = segments.find((s) => s === 'text' || s === 'icon' || s === 'border');
  if (hit) return hit as SwatchType;
  return translucent ? 'transparency' : 'default';
};

/**
 * THE PLAN. One table per group of COLOR variables:
 *   • a PRIMITIVE collection (no variable in it aliases another) groups by parent path — one table per
 *     palette, drawn as a scale, rows in numeric step order;
 *   • a SEMANTIC collection groups by family — the first segment after the collection's shared prefix — rows
 *     in the file's own order, which is the engine's emission order.
 */
export const planStyleGuide = (catalog: SgCatalog, contract: SgContract | null, options: StyleGuideOptions = {}): SgPlan => {
  const notes: string[] = [];
  const format = options.valueFormat ?? 'hex';
  const wantTypes = (options.types ?? [...PHASE_TYPES]).map((t) => t.toLowerCase());
  const known = PHASE_TYPES.map((t) => t.toLowerCase());
  for (const t of wantTypes) if (!known.includes(t)) notes.push(`${t}: not in this phase — this phase draws ${PHASE_TYPES.join(', ')}`);
  const wantColor = wantTypes.includes('color');

  const ix: Index = {
    byId: new Map(catalog.variables.map((v) => [v.id, v])),
    collections: new Map(catalog.collections.map((c) => [c.id, c])),
  };
  const wantCollections = options.collections?.map((c) => c.toLowerCase());
  const contractByMode = new Map((contract ?? []).map((m) => [m.mode.toLowerCase(), m.roles]));
  const roleKeys = new Set<string>();
  for (const m of contract ?? []) for (const k of Object.keys(m.roles)) roleKeys.add(k);
  if (!contract && wantColor) notes.push('No saved brand in this file, so the contrast column reads "—" — Apply theme saves one');
  // Every variable some other variable aliases, in any mode — the fact a primitive table's header states.
  const referenced = new Set<string>();
  for (const v of catalog.variables) for (const val of Object.values(v.valuesByMode)) { const a = aliasId(val); if (a) referenced.add(a); }

  const tables: SgTable[] = [];
  for (const col of wantColor ? catalog.collections : []) {
    if (wantCollections && !wantCollections.includes(col.name.toLowerCase())) continue;
    const vars = catalog.variables.filter((v) => v.variableCollectionId === col.id && v.resolvedType === 'COLOR');
    if (!vars.length) continue;
    const primitive = vars.every((v) => col.modes.every((m) => aliasId(v.valuesByMode[m.modeId]) === null));
    // ROOTS. A collection can hold the same tree under more than one root (`nbds/color/…` and `pds3/color/…`):
    // no prefix is shared, but one is shared BELOW the first segment. Each root is then grouped on its own,
    // and a title names its root. A collection with no such shared sub-prefix is one tree, as before.
    const whole = commonPrefix(vars.map((v) => v.name.split('/').slice(0, -1)));
    const firsts = [...new Set(vars.map((v) => v.name.split('/')[0]))];
    const shared = whole.length === 0 && firsts.length > 1 ? commonPrefix(vars.map((v) => v.name.split('/').slice(1, -1))) : [];
    const multiRoot = shared.length > 0;
    const prefixOf = (name: string): string[] => (multiRoot ? [name.split('/')[0], ...shared] : whole);
    // A file mode the engine does not contract ("L (HC)") has no floors to measure against: said by name.
    if (!primitive && contract) for (const m of col.modes) if (!contractByMode.has(m.name.toLowerCase()))
      notes.push(`The ${m.name} mode in ${col.name} matches no mode the brand contracts (${contract.map((c) => c.mode).join(', ')}), so its contrast reads "—"`);

    // Group: by parent path for a primitive scale, by family for semantic roles, within each root. A variable
    // at the prefix itself has no group segment and lands in the base group. Keyed by the group's full path.
    const groups = new Map<string, { root: string; prefix: string[]; g: string; members: SgVariable[] }>();
    for (const v of vars) {
      const segs = v.name.split('/');
      const prefix = prefixOf(v.name);
      const g = primitive ? segs.slice(prefix.length, -1).join('/') : segs.length - prefix.length > 1 ? segs[prefix.length] : '';
      const path = [...prefix, ...(g ? g.split('/') : [])].join('/');
      if (!groups.has(path)) groups.set(path, { root: segs[0], prefix, g, members: [] });
      groups.get(path)!.members.push(v);
    }
    const groupsInRoot = (root: string): number => [...groups.values()].filter((x) => !multiRoot || x.root === root).length;
    for (const [path, { root, prefix, g, members }] of groups) {
      // The row's first column: a primitive's STEP alone ("025"; the title already names the palette and root),
      // a role relative to its family ("primary" in Text).
      const display = (v: SgVariable): string => {
        const segs = v.name.split('/');
        return primitive ? segs[segs.length - 1] : segs.slice(prefix.length + (g ? 1 : 0)).join('/');
      };
      // RAMP ORDER for a scale (the owner's plugin sorted 10, 11, 112, 12); file order for roles.
      if (primitive) members.sort((a, b) => stepCompare(display(a), display(b)));
      // A collection holding more than one root names the root in every title ("Text — nbds", "Core — nbds base"),
      // since both roots draw the same families onto the same page.
      const title = g !== '' ? `${sentence(g.split('/').pop()!)}${multiRoot ? ` — ${root}` : ''}`
        : groupsInRoot(root) === 1 ? `${sentence(col.name)}${multiRoot ? ` — ${root}` : ''}`
        : `${sentence(col.name)} — ${multiRoot ? `${root} base` : 'base'}`;

      const rows: SgRow[] = members.map((v) => {
        const segs = v.name.split('/');
        const key = roleKeyOf(v.name, roleKeys);
        const tailSegs = key ? key.split('.') : segs.slice(prefix.length);
        const cells: SgCell[] = col.modes.map((m) => {
          const value = resolveColor(ix, v, m.modeId);
          const first = aliasId(v.valuesByMode[m.modeId]);
          const aliasVar = first ? ix.byId.get(first) : undefined;
          let groundId: string | null = null;
          let c: SgContrast | null = null;
          if (!primitive) {
            const roles = contractByMode.get(m.name.toLowerCase());
            const role = key && roles ? roles[key] : undefined;
            const ground = role && role.against !== 'self' ? groundVar(catalog, col, role.against, roleKeys, v.name) : null;
            groundId = ground?.id ?? fallbackGround(catalog, col, tailSegs, roleKeys, v.name)?.id ?? null;
            if (role && ground && role.min > 0 && value) {
              const gv = resolveColor(ix, ground, groundModeFor(ix, col, ground, m.modeId));
              if (gv) {
                const g255 = to255(gv);
                let ratio: number;
                let ink: string | undefined;
                if (role.model === 'ink-on-composite' && role.legibleFor) {
                  const inkVar = groundVar(catalog, col, role.legibleFor, roleKeys, v.name);
                  const iv = inkVar ? resolveColor(ix, inkVar, groundModeFor(ix, col, inkVar, m.modeId)) : null;
                  ratio = iv ? contrast(to255(iv), composite(g255, to255(value), alphaOf(value))) : NaN;
                  ink = inkVar ? tokenPath(inkVar, col, prefixOf(inkVar.name)) : role.legibleFor;
                } else {
                  const fg = alphaOf(value) < 1 ? composite(g255, to255(value), alphaOf(value)) : to255(value);
                  ratio = contrast(fg, g255);
                }
                if (Number.isFinite(ratio)) c = { ratio, min: role.min, pass: ratio >= role.min, ground: tokenPath(ground, col, prefixOf(ground.name)), ...(ink ? { ink } : {}) };
              }
            }
          }
          return {
            modeId: m.modeId,
            modeName: m.name,
            value: value ? formatColor(value, format) : '—',
            alias: aliasVar ? aliasVar.name : null,
            raw: `${first ?? ''}|${value ? [value.r, value.g, value.b, value.a ?? 1].map((n) => Math.round(n * 1e6) / 1e6).join(',') : ''}`,
            groundId,
            contrast: c,
          };
        });
        const translucent = col.modes.some((m) => { const r = resolveColor(ix, v, m.modeId); return !!r && alphaOf(r) < 1; });
        const auto = autoDisplay(primitive ? [] : tailSegs, translucent);
        return {
          variableId: v.id,
          name: v.name,
          token: display(v),
          description: v.description ?? '',
          display: options.display && options.display !== 'auto' ? options.display : auto,
          label: humanizeName(segs.slice(prefix.length), prefix[prefix.length - 1]),
          cells,
        };
      });

      // The header states only what the plan checked: how many of the palette's steps a role references, and
      // how many of the roles carry a measured contrast.
      const n = members.length;
      const k = primitive ? members.filter((v) => referenced.has(v.id)).length : rows.filter((r) => r.cells.some((c) => c.contrast)).length;
      const description = primitive
        ? `${n} primitive color${n === 1 ? '' : 's'} in ${col.name}${k === 0 ? '' : k === n ? ', each referenced by a semantic role' : `, ${k} referenced by a semantic role`}`
        : `${n} ${g || col.name} role${n === 1 ? '' : 's'} in ${col.name}, per mode${k === 0 ? '' : k === n ? ', each measured against the ground it is contracted for' : `, ${k} measured against the ground they are contracted for`}`;

      const perMode = col.modes.flatMap((m) => (primitive ? [m.name, 'Value'] : [m.name, 'Value', 'Contrast']));
      tables.push({
        // Keyed by the collection's ID and the group's FULL path, so neither a renamed collection nor a sibling
        // group that shortens the shared prefix moves the key and duplicates the table.
        key: `color|${col.id}|${path}`,
        type: 'color',
        kind: primitive ? 'primitive' : 'semantic',
        page: primitive ? PRIMITIVE_PAGE : SEMANTIC_PAGE,
        collectionId: col.id,
        title,
        description,
        modes: col.modes,
        columns: ['Token', ...perMode, ...(options.description === false ? [] : ['Description'])],
        rows,
      });
    }
  }
  tables.push(...planVariableTables(catalog, ix, options, wantTypes, wantCollections, referenced, notes));
  if (wantTypes.includes('typography') && !wantCollections) tables.push(...planTextStyles(catalog, ix, options));
  // PHASE 2 TITLES ARE UNIQUE (proposed, owner to confirm): two collections can both hold a font-size table (`core`
  // and `type-sets`), so a title two phase-2 tables share names its collection, "Font size (core)". The tables filter
  // matches a title, so a shared one would draw both. Color titles are phase 1's and unchanged.
  const phase2 = tables.filter((t) => t.type !== 'color');
  const shared = new Set(phase2.filter((t) => phase2.filter((u) => u.title === t.title).length > 1).map((t) => t.title));
  for (const t of phase2) if (shared.has(t.title)) {
    const col = catalog.collections.find((c) => c.id === t.collectionId);
    if (col) t.title = `${t.title} (${col.name})`;
  }
  // THE TITLE CELL (owner decision 15, 2026-09-29): a leading Name column on every table type, when asked for.
  if (options.titleCell) for (const t of tables) t.columns.unshift('Name');
  return narrow(tables, notes, options.tables);
};

// ── Phase 2: dimension, font variables and text styles (#259) ─────────────────────────────────────────
/** What a FLOAT or STRING variable documents. The dimension kinds (`spacing`, `size`, `radius`, `scale`) draw in one
 *  `dimension` table per collection; each font kind draws its own table; the rest wait for phase 3. */
export type VarKind = 'spacing' | 'size' | 'radius' | 'scale' | FontKind
  | 'fontStyle' | 'opacity' | 'borderWidth' | 'iconSize' | 'breakpoint' | 'grid' | 'other';

const FONT_SCOPE: Record<string, VarKind> = {
  FONT_FAMILY: 'fontFamily', FONT_SIZE: 'fontSize', FONT_WEIGHT: 'fontWeight', LINE_HEIGHT: 'lineHeight', LETTER_SPACING: 'letterSpacing', FONT_STYLE: 'fontStyle',
};
/** The kinds a later phase draws, as the note names them. */
const LATER_KIND: Partial<Record<VarKind, string>> = {
  fontStyle: 'font style', opacity: 'opacity', borderWidth: 'border width', iconSize: 'icon size', breakpoint: 'breakpoint', grid: 'grid', other: 'other number or string',
};

/**
 * A FLOAT or STRING variable's kind, from its SCOPES first and its NAME second (proposed, owner to confirm). A
 * variable scoped to one font property is that property. Then the later-phase families by name (breakpoints, grid,
 * opacity, icon sizes, border and stroke widths), so a `grid/gutter` is not drawn as spacing today and redrawn as a
 * grid tomorrow. Then a radius, a spacing (GAP, or a name like space, gap, padding, inset), a size (WIDTH_HEIGHT, or
 * size, height, width) and, for a scale scoped to everything (`core/dimension/*`), `scale`. Not a FLOAT or STRING: null.
 */
export const varKind = (v: SgVariable): VarKind | null => {
  if (v.resolvedType !== 'FLOAT' && v.resolvedType !== 'STRING') return null;
  const scopes = v.scopes ?? [];
  const segs = v.name.toLowerCase().split('/');
  const has = (...w: string[]): boolean => segs.some((x) => w.includes(x));
  const only = (s: string): boolean => scopes.length > 0 && scopes.every((x) => x === s);
  for (const s of scopes) if (FONT_SCOPE[s] && scopes.length === 1) return FONT_SCOPE[s];
  if (v.resolvedType === 'STRING') return has('family') ? 'fontFamily' : has('style') ? 'fontStyle' : 'other';
  if (has('breakpoint', 'breakpoints')) return 'breakpoint';
  if (has('grid')) return 'grid';
  if (has('opacity') || only('OPACITY')) return 'opacity';
  if (has('icon')) return 'iconSize';
  if (has('border-width', 'stroke-width', 'stroke') || only('STROKE_FLOAT')) return 'borderWidth';
  const font = has('font', 'type', 'typography', 'font-fluid');
  if (has('font-size') || (font && has('size'))) return 'fontSize';
  if (has('line-height', 'leading')) return 'lineHeight';
  if (has('letter-spacing', 'tracking')) return 'letterSpacing';
  if (has('font-weight') || (font && has('weight'))) return 'fontWeight';
  if (has('radius', 'corner', 'corner-radius') || only('CORNER_RADIUS')) return 'radius';
  if (only('GAP') || has('space', 'spacing', 'gap', 'padding', 'inset', 'margin')) return 'spacing';
  if (only('WIDTH_HEIGHT') || has('size', 'height', 'width')) return 'size';
  return 'scale';
};
const DIMENSION_KINDS: readonly VarKind[] = ['spacing', 'size', 'radius', 'scale'];
/** The table type a kind draws in: `dimension`, a font kind, or null for a later phase. */
const typeOfKind = (k: VarKind): string | null =>
  DIMENSION_KINDS.includes(k) ? 'dimension' : (FONT_KINDS as readonly string[]).includes(k) ? k : null;
const FONT_LABEL: Record<FontKind, string> = { fontFamily: 'Font family', fontSize: 'Font size', fontWeight: 'Font weight', lineHeight: 'Line height', letterSpacing: 'Letter spacing' };

/** A number as the table prints it: up to `d` places, trailing zeros dropped. */
const trimNum = (n: number, d: number): string => String(Math.round(n * 10 ** d) / 10 ** d);
/** A length in the owner's units: `16px · 1rem` with both toggles on (the default), either alone, and pixels when
 *  both are off, since a value column always prints a value (proposed, owner to confirm). REM at a 16px base. */
export const formatLength = (px: number, o: { pixels?: boolean; rem?: boolean } = {}): string => {
  const parts: string[] = [];
  if (o.pixels !== false) parts.push(`${trimNum(px, 2)}px`);
  if (o.rem !== false) parts.push(`${trimNum(px / REM_BASE, 4)}rem`);
  return parts.length ? parts.join(' · ') : `${trimNum(px, 2)}px`;
};
/** The style name of each numeric weight, the names Figma's font menus use. */
const WEIGHT_NAME: Record<number, string> = { 100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black' };
export const weightName = (w: number): string | undefined => WEIGHT_NAME[Math.round(w / 100) * 100];
/** The numeric weight a style name reads as ("Semi Bold Italic" → 600), or undefined when no weight word is in it. */
export const weightOf = (style: string): number | undefined => {
  const s = style.toLowerCase().replace(/[-_\s]/g, '');
  const order: [string, number][] = [['extralight', 200], ['ultralight', 200], ['semibold', 600], ['demibold', 600], ['extrabold', 800], ['ultrabold', 800],
    ['thin', 100], ['light', 300], ['regular', 400], ['medium', 500], ['bold', 700], ['black', 900], ['heavy', 900], ['italic', 400]];
  return order.find(([w]) => s.includes(w))?.[1];
};
const formatWeight = (w: number): string => { const n = weightName(w); return n ? `${trimNum(w, 0)} · ${n}` : trimNum(w, 0); };
/** A text style's line height: pixels as a length, a percentage as it is stored, AUTO as "auto". */
const formatLineHeight = (lh: SgTextStyle['lineHeight'], o: StyleGuideOptions): string =>
  !lh || lh.unit === 'AUTO' ? 'auto' : lh.unit === 'PERCENT' ? `${trimNum(lh.value ?? 0, 2)}%` : formatLength(lh.value ?? 0, o);
const formatSpacing = (ls: SgTextStyle['letterSpacing'], o: StyleGuideOptions): string =>
  !ls ? formatLength(0, o) : ls.unit === 'PERCENT' ? `${trimNum(ls.value, 2)}%` : formatLength(ls.value, o);

/** A variable's literal in a mode, following aliases the way `resolveColor` does: a number, a string, or null. */
const resolveLiteral = (ix: Index, v: SgVariable, modeId: string): unknown => {
  let cur: SgVariable | undefined = v;
  let mode: string | undefined = modeId;
  for (let hop = 0; cur && mode && hop < 16; hop++) {
    const raw: unknown = cur.valuesByMode[mode];
    const next = aliasId(raw);
    if (!next) return raw ?? null;
    const target = ix.byId.get(next);
    if (!target) return null;
    mode = target.variableCollectionId === cur.variableCollectionId ? mode : defaultMode(ix.collections.get(target.variableCollectionId));
    cur = target;
  }
  return null;
};

/** Sort a table's rows in RAMP ORDER when every row is one step (`0, 025, 050 … 1200`; `none, sm, md` keep the file's
 *  order), and keep the file's order when a row is a path (`xs/height`). */
const rampSort = <T extends { token: string }>(rows: T[]): T[] =>
  rows.every((r) => !r.token.includes('/')) ? [...rows].sort((a, b) => stepCompare(a.token, b.token)) : rows;

/**
 * THE DIMENSION AND FONT-VARIABLE TABLES (#259 phase 2). One table per collection (and root) per type: every
 * dimension variable in a collection in one `dimension` table, each font kind in its own. PRIMITIVE when no variable
 * in the table aliases another (`core/dimension/*`, on `↳ Primitive tokens`), SEMANTIC otherwise (`space`, `radius`,
 * on `↳ Semantic tokens`), the phase 1 rule applied per table. One specimen + value column per mode, as color.
 */
const planVariableTables = (catalog: SgCatalog, ix: Index, options: StyleGuideOptions, wantTypes: readonly string[],
  wantCollections: readonly string[] | undefined, referenced: ReadonlySet<string>, notes: string[]): SgTable[] => {
  const out: SgTable[] = [];
  const later = new Map<string, number>();
  for (const col of catalog.collections) {
    if (wantCollections && !wantCollections.includes(col.name.toLowerCase())) continue;
    const buckets = new Map<string, { v: SgVariable; kind: VarKind }[]>();
    for (const v of catalog.variables) {
      if (v.variableCollectionId !== col.id) continue;
      const kind = varKind(v);
      if (!kind) continue;
      const type = typeOfKind(kind);
      if (!type) { const l = LATER_KIND[kind] ?? kind; later.set(l, (later.get(l) ?? 0) + 1); continue; }
      if (!wantTypes.includes(type.toLowerCase())) continue;
      if (!buckets.has(type)) buckets.set(type, []);
      buckets.get(type)!.push({ v, kind });
    }
    for (const [type, members] of buckets) {
      // ROOTS, as for color: the same tree under two first segments (`nbds/space/…`, `pds3/space/…`) is one table each.
      const firsts = [...new Set(members.map((m) => m.v.name.split('/')[0]))];
      const whole = commonPrefix(members.map((m) => m.v.name.split('/').slice(0, -1)));
      const multiRoot = whole.length === 0 && firsts.length > 1 && commonPrefix(members.map((m) => m.v.name.split('/').slice(1, -1))).length > 0;
      for (const root of multiRoot ? firsts : [null]) {
        const mine = members.filter((m) => root === null || m.v.name.split('/')[0] === root);
        const prefix = commonPrefix(mine.map((m) => m.v.name.split('/').slice(0, -1)));
        const primitive = mine.every((m) => col.modes.every((md) => aliasId(m.v.valuesByMode[md.modeId]) === null));
        const unrooted = type === 'dimension'
          ? (primitive && prefix.length ? sentence(prefix[prefix.length - 1]) : sentence(col.name))
          : FONT_LABEL[type as FontKind];
        const title = root ? `${unrooted} — ${root}` : unrooted;
        const rows: SgRow[] = rampSort(mine.map(({ v, kind }) => {
          const cells: SgCell[] = col.modes.map((m) => {
            const lit = resolveLiteral(ix, v, m.modeId);
            const first = aliasId(v.valuesByMode[m.modeId]);
            const aliasVar = first ? ix.byId.get(first) : undefined;
            const num = typeof lit === 'number' ? lit : null;
            const str = typeof lit === 'string' ? lit : null;
            const value = num === null ? (str ?? '—')
              : type === 'fontWeight' ? formatWeight(num) : formatLength(num, options);
            return { modeId: m.modeId, modeName: m.name, value, alias: aliasVar ? aliasVar.name : null, raw: `${first ?? ''}|${lit ?? ''}`, groundId: null, contrast: null, num, str };
          });
          return { variableId: v.id, name: v.name, token: v.name.split('/').slice(prefix.length).join('/'), label: humanizeName(v.name.split('/').slice(prefix.length), prefix[prefix.length - 1]), description: v.description ?? '', display: 'default' as SwatchType, cells, specimen: specimenOf(type, kind, options) };
        }));
        const n = rows.length;
        const k = mine.filter((m) => referenced.has(m.v.id)).length;
        const noun = type === 'dimension' ? `dimension${n === 1 ? '' : 's'}` : `${FONT_LABEL[type as FontKind].toLowerCase()} variable${n === 1 ? '' : 's'}`;
        const perMode = col.modes.length > 1 ? `, per mode (${col.modes.map((m) => m.name).join(', ')})` : '';
        const refs = primitive && k ? (k === n ? ', each referenced by another variable' : `, ${k} referenced by another variable`) : '';
        out.push({
          key: `${type}|${col.id}|${prefix.join('/')}`,
          type,
          kind: primitive ? 'primitive' : 'semantic',
          page: primitive ? PRIMITIVE_PAGE : SEMANTIC_PAGE,
          collectionId: col.id,
          title,
          description: `${n} ${noun} in ${col.name}${perMode}${refs}`,
          modes: col.modes,
          columns: ['Token', ...col.modes.flatMap((m) => [m.name, 'Value']), ...(options.description === false ? [] : ['Description'])],
          rows,
        });
      }
    }
  }
  // Said once, so a designer knows why the opacity or breakpoint variables are not drawn (types left open only).
  if (!options.types && later.size) notes.push(`Not drawn until a later phase: ${[...later].map(([l, n]) => `${n} ${l}`).join(', ')} variable${[...later.values()].reduce((a, b) => a + b, 0) === 1 ? '' : 's'}`);
  return out;
};

/** A phase-2 row's specimen, from its role, or the Customize override (the phase 1 pattern, decision 8). A dimension:
 *  a radius draws the radius swatch, a spacing the filled bar, a size or a plain scale the bracket (proposed, owner
 *  to confirm). A font variable binds the property it is for. */
const specimenOf = (type: string, kind: VarKind, options: StyleGuideOptions): SgSpecimen => {
  if (type === 'dimension') {
    const d = options.dimensionDisplay && options.dimensionDisplay !== 'auto' ? options.dimensionDisplay
      : kind === 'radius' ? 'radius' : kind === 'spacing' ? 'spacing' : 'generic';
    return d === 'radius' ? { kind: 'radius' } : { kind: 'spacing', member: d === 'spacing' ? 'filled' : 'line' };
  }
  const f = options.fontDisplay ?? 'auto';
  const bind: FontKind | null = f === 'auto' ? kind as FontKind : f === 'generic' ? null
    : ({ family: 'fontFamily', size: 'fontSize', weight: 'fontWeight', letterSpacing: 'letterSpacing', lineHeight: 'lineHeight' } as const)[f];
  return { kind: 'font', bind };
};

/** The pseudo-collection a text-style table's key names: text styles belong to no variable collection. */
export const TEXT_STYLES_ID = 'text-styles';

/**
 * THE TEXT-STYLE TABLE (#259 phase 2): one row per local text style, in the file's own order, on `↳ Semantic tokens`.
 * The specimen is "Abc 123" with the style applied. A style whose size is bound to a variable in a collection with
 * more than one mode (prism3's `type-sets`: desktop, mobile) is a responsive size, so the table takes that
 * collection's modes, side by side as every table does, each specimen pinned to its mode and each size printed in
 * it (proposed, owner to confirm: a fluid size shows as its modes, not as a min–max range). Family, weight and letter
 * spacing print once; paragraph spacing and text decoration only when toggled on.
 */
const planTextStyles = (catalog: SgCatalog, ix: Index, options: StyleGuideOptions): SgTable[] => {
  const styles = catalog.textStyles ?? [];
  if (!styles.length) return [];
  const boundVar = (s: SgTextStyle, field: string): SgVariable | undefined => {
    const id = s.boundVariables?.[field]?.id;
    return id ? ix.byId.get(id) : undefined;
  };
  // The responsive collection: the one holding the most bound font sizes, among collections with more than one mode.
  const counts = new Map<string, number>();
  for (const s of styles) {
    const v = boundVar(s, 'fontSize');
    const c = v ? ix.collections.get(v.variableCollectionId) : undefined;
    if (c && c.modes.length > 1) counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
  }
  const top = [...counts].sort((a, b) => b[1] - a[1])[0];
  const modeCol = top ? ix.collections.get(top[0]) : undefined;
  const modes: readonly SgMode[] = modeCol ? modeCol.modes : [{ modeId: '', name: 'Specimen' }];
  // A bound value in a mode: in the responsive collection, that mode; elsewhere, the variable's own default.
  const inMode = (v: SgVariable, modeId: string): unknown =>
    resolveLiteral(ix, v, modeCol && v.variableCollectionId === modeCol.id && modeId ? modeId : (defaultMode(ix.collections.get(v.variableCollectionId)) ?? modeId));
  const numOr = (s: SgTextStyle, field: string, modeId: string, fallback: number | undefined): number | undefined => {
    const v = boundVar(s, field);
    const x = v ? inMode(v, modeId) : undefined;
    return typeof x === 'number' ? x : fallback;
  };
  const strOr = (s: SgTextStyle, field: string, modeId: string, fallback: string): string => {
    const v = boundVar(s, field);
    const x = v ? inMode(v, modeId) : undefined;
    return typeof x === 'string' ? x : fallback;
  };
  const once = (xs: string[]): string => [...new Set(xs)].join(' / ');
  const prefix = commonPrefix(styles.map((s) => s.name.split('/').slice(0, -1)));
  const rows: SgRow[] = styles.map((s) => {
    const per = modes.map((m) => {
      const size = numOr(s, 'fontSize', m.modeId, s.fontSize) ?? 0;
      const lhPx = numOr(s, 'lineHeight', m.modeId, undefined);
      const lh = lhPx !== undefined ? { unit: 'PIXELS', value: lhPx } : s.lineHeight;
      const lsPx = numOr(s, 'letterSpacing', m.modeId, undefined);
      const ls = lsPx !== undefined ? { unit: 'PIXELS', value: lsPx } : s.letterSpacing;
      const family = strOr(s, 'fontFamily', m.modeId, s.fontName.family);
      const style = strOr(s, 'fontStyle', m.modeId, s.fontName.style);
      const weight = numOr(s, 'fontWeight', m.modeId, weightOf(style));
      return { m, size, lh, ls, family, style, weight };
    });
    const cells: SgCell[] = per.map(({ m, size, lh, ls, family, style, weight }) => ({
      modeId: m.modeId,
      modeName: m.name,
      value: `${formatLength(size, options)} / ${formatLineHeight(lh, options)}`,
      alias: boundVar(s, 'fontSize')?.name ?? null,
      // What the style holds in this mode, in pixels and its own units, so a REM toggle is not a change.
      raw: JSON.stringify([family, style, weight ?? null, size, lh ?? null, ls ?? null, s.paragraphSpacing ?? 0, s.textDecoration ?? 'NONE']),
      groundId: null,
      contrast: null,
      num: size,
      str: family,
    }));
    const extra: { value: string; alias: string | null }[] = [
      { value: once(per.map((p) => p.family)), alias: boundVar(s, 'fontFamily')?.name ?? null },
      { value: once(per.map((p) => (p.weight !== undefined ? `${trimNum(p.weight, 0)} · ${p.style}` : p.style))), alias: (boundVar(s, 'fontWeight') ?? boundVar(s, 'fontStyle'))?.name ?? null },
      { value: once(per.map((p) => formatSpacing(p.ls, options))), alias: boundVar(s, 'letterSpacing')?.name ?? null },
      ...(options.paragraphSpacing ? [{ value: formatLength(s.paragraphSpacing ?? 0, options), alias: boundVar(s, 'paragraphSpacing')?.name ?? null }] : []),
      ...(options.textDecoration ? [{ value: sentence((s.textDecoration ?? 'NONE').toLowerCase()), alias: null }] : []),
    ];
    return { variableId: s.id, name: s.name, token: s.name.split('/').slice(prefix.length).join('/'), label: humanizeName(s.name.split('/').slice(prefix.length), prefix[prefix.length - 1]), description: s.description ?? '', display: 'default' as SwatchType, cells, specimen: { kind: 'style' }, extra };
  });
  const n = rows.length;
  return [{
    key: `typography|${TEXT_STYLES_ID}|${prefix.join('/')}`,
    type: 'typography',
    kind: 'semantic',
    page: SEMANTIC_PAGE,
    collectionId: modeCol?.id ?? TEXT_STYLES_ID,
    title: 'Text styles',
    description: `${n} text style${n === 1 ? '' : 's'} in this file${modeCol ? `, sizes per ${modeCol.name} mode (${modeCol.modes.map((m) => m.name).join(', ')})` : ''}`,
    modes,
    columns: ['Token', ...modes.flatMap((m) => [m.name, 'Size / line height']), 'Family', 'Weight', 'Letter spacing',
      ...(options.paragraphSpacing ? ['Paragraph spacing'] : []), ...(options.textDecoration ? ['Decoration'] : []),
      ...(options.description === false ? [] : ['Description'])],
    rows,
  }];
};

/** A size word the humanized name keeps upper-case: xs, sm, md, lg, xl, 2xl, 3xl, xxl, 2xs (proposed, owner to confirm). */
const SIZE_WORD = /^(\d*x{1,3}[sl]|sm|md|lg)$/i;
/**
 * THE TITLE CELL'S DEFAULT (owner decision 15, proposed rules): a token's path, below the table's shared prefix (the
 * root or namespace and the collection's path), in Title Case, a word per path segment and per hyphen, size words
 * upper-cased: `text/primary` → "Text Primary", `display/xl/emphasis` → "Display XL Emphasis", `on-brand` → "On Brand".
 * A single step (`050` in `pds3/space`) keeps the last prefix segment, so it reads "Space 050", not "050".
 */
export const humanizeName = (segs: readonly string[], context?: string): string => {
  const parts = segs.length === 1 && context ? [context, ...segs] : [...segs];
  return parts.flatMap((p) => p.split(/[-_\s]+/)).filter(Boolean)
    .map((w) => (SIZE_WORD.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
};

/**
 * THE TABLES FILTER (#1778): keep the tables named, each by its title as drawn ("Primary — nbds") or its key, in
 * any case. A name that matches nothing is reported by name, with the titles this run could draw, so a typo is
 * never a silent no-op. Applied after the plan is built, so a title means what it means in an unfiltered run.
 */
const TITLES_LISTED = 8;
const narrow = (tables: SgTable[], notes: string[], want: readonly string[] | undefined): SgPlan => {
  if (!want) return { tables, notes, unmatched: [] };
  const hit = (t: SgTable, name: string): boolean => {
    const n = name.trim().toLowerCase();
    return t.title.toLowerCase() === n || t.key.toLowerCase() === n;
  };
  const unmatched = [...new Set(want)].filter((name) => !tables.some((t) => hit(t, name)));
  if (unmatched.length) {
    // The first TITLES_LISTED titles, then a count: the owner's file draws 43, which is no longer a note.
    const titles = tables.map((t) => t.title);
    const listed = titles.length > TITLES_LISTED ? `${titles.slice(0, TITLES_LISTED).join(', ')} and ${titles.length - TITLES_LISTED} more` : titles.join(', ');
    const here = tables.length ? `the tables this run can draw are ${listed}` : 'this run draws no tables';
    notes.push(`No table is titled or keyed ${unmatched.map((n) => `"${n}"`).join(', ')}; ${here}`);
  }
  return { tables: tables.filter((t) => want.some((name) => hit(t, name))), notes, unmatched };
};

/** A ground or ink the contract names — a role key (`background.primary`) in this collection first, then a
 *  palette step (`neutral.050`) anywhere, by trailing path, the shortest name winning. */
const groundVar = (catalog: SgCatalog, col: SgCollection, key: string, roleKeys: ReadonlySet<string>, near: string): SgVariable | null => {
  // In a two-root collection both roots carry the key; the one sharing the role's root wins.
  const same = nearest(catalog.variables.filter((v) => v.variableCollectionId === col.id && roleKeyOf(v.name, roleKeys) === key), near);
  if (same) return same;
  const tail = key.split('.');
  const hits = catalog.variables.filter((v) => {
    const segs = v.name.split('/');
    return segs.length >= tail.length && tail.every((t, i) => segs[segs.length - tail.length + i] === t);
  });
  hits.sort((a, b) => affinity(b.name, near) - affinity(a.name, near) || a.name.length - b.name.length);
  return hits[0] ?? null;
};

/** The candidate sharing the most leading segments with `near`, the first on a tie. */
const nearest = (vs: readonly SgVariable[], near: string): SgVariable | null =>
  vs.reduce<SgVariable | null>((best, v) => (!best || affinity(v.name, near) > affinity(best.name, near) ? v : best), null);

/**
 * The ground a role with NO contracted ground is drawn on — proposed, owner to confirm (`docs/45`): the page
 * surface, `background.primary`, or `inverse.background.primary` for an inverse role, so inverse ink is
 * never drawn on white. Found by role key when a contract is present, by trailing path otherwise.
 */
const fallbackGround = (catalog: SgCatalog, col: SgCollection, tail: readonly string[], roleKeys: ReadonlySet<string>, near: string): SgVariable | null => {
  const want = tail[0] === 'inverse' ? ['inverse', 'background', 'primary'] : ['background', 'primary'];
  const inCol = catalog.variables.filter((v) => v.variableCollectionId === col.id);
  const byKey = nearest(inCol.filter((v) => roleKeyOf(v.name, roleKeys) === want.join('.')), near);
  if (byKey) return byKey;
  return nearest(inCol.filter((v) => {
    const segs = v.name.split('/');
    const tailHere = segs.slice(segs.length - want.length);
    // `background/primary` must not match `inverse/background/primary`.
    return want.every((w, i) => tailHere[i] === w) && (want[0] === 'inverse' || segs[segs.length - want.length - 1] !== 'inverse');
  }), near);
};

/** The mode a ground resolves in: this mode when it shares the collection, its own default otherwise. */
const groundModeFor = (ix: Index, col: SgCollection, v: SgVariable, modeId: string): string =>
  v.variableCollectionId === col.id ? modeId : (defaultMode(ix.collections.get(v.variableCollectionId)) ?? modeId);

const tokenPath = (v: SgVariable, col: SgCollection, prefix: readonly string[]): string =>
  v.variableCollectionId === col.id ? v.name.split('/').slice(prefix.length).join('/') : v.name;

// ── The rerun report ───────────────────────────────────────────────────────────────────────────────
/** What a table held when it was last written: variable ID → its name and, per mode ID, the raw value. Keyed by
 *  ID so a rename is a rename, not an add and a remove; raw so a new print format is not a change. */
export type RowsSnapshot = Record<string, { name: string; values: Record<string, string> }>;

export const snapshotOf = (t: SgTable): RowsSnapshot =>
  Object.fromEntries(t.rows.map((r) => [r.variableId, { name: r.name, values: Object.fromEntries(r.cells.map((c) => [c.modeId, c.raw])) }]));

export interface RowsDiff { added: string[]; removed: string[]; changed: string[]; renamed: string[] }

export const diffRows = (before: RowsSnapshot, after: RowsSnapshot): RowsDiff => {
  const was = (id: string): { name: string; values: Record<string, string> } | undefined => (Object.prototype.hasOwnProperty.call(before, id) ? before[id] : undefined);
  const ids = Object.keys(after);
  return {
    added: ids.filter((id) => !was(id)).map((id) => after[id].name),
    removed: Object.keys(before).filter((id) => !Object.prototype.hasOwnProperty.call(after, id)).map((id) => before[id].name),
    changed: ids.filter((id) => was(id) && JSON.stringify(was(id)!.values) !== JSON.stringify(after[id].values)).map((id) => after[id].name),
    renamed: ids.filter((id) => was(id) && was(id)!.name !== after[id].name).map((id) => `${was(id)!.name} → ${after[id].name}`),
  };
};

// ── The executor ───────────────────────────────────────────────────────────────────────────────────
/** The node surface the executor writes: `CellNode` plus plugin data, grid placement, mode pinning and
 *  removal — members a real `FrameNode`/`InstanceNode` has. */
export interface SgNode extends CellNode {
  characters?: unknown;
  textAutoResize?: unknown;
  textTruncation?: unknown;
  explicitVariableModes?: unknown;
  gridRowCount?: unknown;
  gridColumnCount?: unknown;
  gridRowGap?: unknown;
  gridColumnGap?: unknown;
  gridColumnSizes?: { type: string; value?: number }[];
  gridRowSizes?: { type: string; value?: number }[];
  readonly componentProperties?: Record<string, { type?: string; value?: unknown }>;
  appendChildAt?(node: unknown, row: number, column: number): void;
  setPluginData?(key: string, value: string): void;
  getPluginData?(key: string): string;
  setExplicitVariableModeForCollection?(collection: unknown, modeId: string): void;
  setProperties?(props: Record<string, string | boolean>): void;
  getStyledTextSegments?(fields: ('fontName' | 'fontSize' | 'fontWeight' | 'textStyleId')[]): readonly { fontName: unknown }[];
  getMainComponentAsync?(): Promise<unknown>;
  remove?(): void;
  /** Phase 2: bind a node property (a bar's `width`, a corner, a text's `fontSize`) to a variable. */
  setBoundVariable?(field: string, variable: unknown): void;
  /** Phase 2: apply a text style to a text node (the dynamic-page form). */
  setTextStyleIdAsync?(id: string): Promise<void>;
  textStyleId?: unknown;
}

export interface SgPage {
  readonly id?: string;
  readonly name: string;
  readonly type?: string;
  readonly children: readonly unknown[];
  appendChild(child: unknown): void;
  findAllWithCriteria?(criteria: { types: ('FRAME')[] }): readonly unknown[];
}

export interface StyleGuideApi {
  root: {
    readonly children: readonly SgPage[];
    findAllWithCriteria(criteria: { types: ('COMPONENT_SET')[] }): readonly unknown[];
  };
  loadAllPagesAsync(): Promise<void>;
  loadFontAsync(font: { family: string; style: string }): Promise<void>;
  createFrame(): SgNode;
  /** Phase 2: the file's local text styles, in the file's order. Optional: without it, no text-style table. */
  getLocalTextStylesAsync?(): Promise<readonly unknown[]>;
  variables: {
    getLocalVariableCollectionsAsync(): Promise<readonly unknown[]>;
    getLocalVariablesAsync(type?: string): Promise<readonly unknown[]>;
    setBoundVariableForPaint(paint: unknown, field: 'color', variable: unknown): unknown;
  };
}

/** Why a superseded table is left in place rather than deleted. `moved` covers a table put inside another frame
 *  or onto another page; `no-collection` and `nothing-drawn` are the run's own guards (its variables may have
 *  moved to a library); `not-removable` is an unedited table the host would not let the generator remove. */
export type KeepReason = 'edited' | 'moved' | 'copied' | 'unrecorded' | 'no-collection' | 'nothing-drawn' | 'not-removable';

/** One table's outcome. */
export type TableOutcome =
  | { key: string; title: string; page: string; status: 'created'; rows: number }
  | { key: string; title: string; page: string; status: 'updated'; rows: number; diff: RowsDiff }
  | { key: string; title: string; page: string; status: 'skipped'; reason: 'no-page' | 'no-cells' };

export interface StyleGuideResult {
  tables: TableOutcome[];
  /** SUPERSEDED tables — a previous run wrote them and this run does not draw them — whose group no longer
   *  exists. Each is either deleted or kept; `deleted` and `kept` say which. */
  stale: string[];
  /** Superseded tables for a group this run splits into narrower ones (one per root and family, where an earlier
   *  build drew one per root), named apart from `stale`. Deleted or kept, as `stale`. */
  replaced: string[];
  /** Superseded tables deleted: the generator made them and nothing has changed since it last wrote them. */
  deleted: string[];
  /** Superseded tables left in place, and why: `edited` (its content or size differs from what the generator
   *  last wrote), `moved`, `copied` (a duplicate carries the generator's plugin data but is not the frame it
   *  wrote), or `unrecorded` (written before the generator recorded a fingerprint, so an edit cannot be ruled out). */
  kept: { name: string; reason: KeepReason }[];
  /** Swatches drawn with nothing bound: the member has no node that carries a fill (or, for border, a stroke). */
  unbound: number;
  notes: string[];
  /** Named, recoverable misses: fonts, a header set, a variant approximated, a node with nothing to bind. */
  misses: string[];
  /** The `tables` filter's names that match no table (#1778). Not a pass: the designer asked for a table
   *  this run could not find. */
  unmatched: string[];
}

/** A progress reading (#1778): `done` of `total` tables drawn, the last one's title and what it cost. */
export interface StyleGuideProgress { done: number; total: number; title: string; tableMs: number }

/** How the executor shares the host's thread (#1778) — never part of `StyleGuideOptions`, which crosses the
 *  bridge: these are the caller's, the way `ComponentApplyOptions` carries the component writer's. */
export interface StyleGuideRun {
  /** How control returns to the host. Defaults to the component writer's `realYield`, a `setTimeout(0)`. */
  yieldTo?: YieldFn;
  /** Called before the first table (`done: 0`) and after each. Synchronous: it posts and returns. */
  onProgress?: (p: StyleGuideProgress) => void;
}

/**
 * Cells written between two yields to the host (#1778). A full run on the owner's file drew 41 tables in about
 * 4.7 minutes, ~8,800 cells by the plan's count (the prism3 emission's 4,394, twice for two roots): ~32ms a cell,
 * everything included. 28 cells is ~0.9s, under the second where a stall reads as a stutter rather than a
 * freeze, the component writer's budget (`CHUNK`). Rows are placed whole: a table yields every
 * `max(1, floor(28 / columns))` rows, so every 2 rows of a four-mode semantic table (14 columns) and every 7
 * rows of a one-mode palette (4 columns), and once more after the table. The per-cell cost is an average over
 * a run that also sized columns by hand, which this build no longer does, not a measurement per phase: the
 * live run's `tableMs` readings are what to calibrate this against.
 */
export const CELLS_PER_YIELD = 28;

/** Read the file's collections, variables and text styles into the plan's catalog, keeping the host objects by id.
 *  Every variable, not only COLOR: phase 2 reads FLOAT and STRING ones (the #146 lesson — a type-filtered fetch
 *  misses the font family and size variables). */
export const readCatalog = async (vars: StyleGuideApi['variables'], textStyles?: () => Promise<readonly unknown[]>): Promise<{ catalog: SgCatalog; collectionById: Map<string, unknown>; variableById: Map<string, unknown> }> => {
  const cols = (await vars.getLocalVariableCollectionsAsync()) as readonly (SgCollection & { id: string })[];
  const vs = (await vars.getLocalVariablesAsync()) as readonly SgVariable[];
  const ts = (textStyles ? await textStyles() : []) as readonly SgTextStyle[];
  const catalog: SgCatalog = {
    collections: cols.map((c) => ({ id: c.id, name: c.name, modes: c.modes.map((m) => ({ modeId: m.modeId, name: m.name })), defaultModeId: c.defaultModeId })),
    variables: vs.map((v) => ({ id: v.id, name: v.name, variableCollectionId: v.variableCollectionId, resolvedType: v.resolvedType, description: v.description, valuesByMode: v.valuesByMode, scopes: v.scopes ? [...v.scopes] : undefined })),
    textStyles: ts.map((t) => ({
      id: t.id, name: t.name, description: t.description, fontName: { family: t.fontName?.family, style: t.fontName?.style }, fontSize: t.fontSize,
      lineHeight: t.lineHeight, letterSpacing: t.letterSpacing, paragraphSpacing: t.paragraphSpacing, textDecoration: t.textDecoration, boundVariables: t.boundVariables,
    })),
  };
  return { catalog, collectionById: new Map(cols.map((c) => [c.id, c])), variableById: new Map(vs.map((v) => [v.id, v])) };
};

const fontKeyOf = (f: { family: string; style: string }): string => `${f.family} ${f.style}`;
const PLACEHOLDER_PAINT = { type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 0, g: 0, b: 0 } };
const WHITE = [{ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 1, g: 1, b: 1 } }];
const TABLE_GAP = 160;
/** The gap between a table's tracks, rows and columns alike: the owner's examples' 2px (owner decision, 2026-09-29). */
const TRACK_GAP = 2;
const PART_KEY = 'prism3-style-guide-part';
/** The header text a run wrote, so the next run can tell its own words from a designer's. */
const TITLE_KEY = 'prism3-style-guide-title';
const DESC_KEY = 'prism3-style-guide-description';
/** Where the generator last put a table, `x,y` — a table no longer there was moved by a designer. */
const AT_KEY = 'prism3-style-guide-at';
/** What a table held when the generator last wrote it (`fingerprintOf`) — a superseded table that still matches
 *  is deleted, one that does not was edited by hand and is kept. */
const PRINT_KEY = 'prism3-style-guide-print';
/** `<page id>|<frame id>`: where the generator wrote the table, and the frame it wrote. Plugin data travels with a
 *  duplicate and the id does not, so the frame id tells the generator's own frame from a designer's copy of it; the
 *  page id tells a table left on its page from one moved to another page at the same x and y. */
const MARK_KEY = 'prism3-style-guide-mark';
/** On a title cell (owner decision 15): the variable or style ID of its row, so its text is found again on rerun. */
export const NAME_CELL_KEY = 'prism3-style-guide-name';
/** On a table: `{ <row ID>: { auto, text } }`, the generated default and the text shown, per row, the last time the
 *  title column was drawn. A cell whose text is not its `auto` is a designer's edit, and survives the rerun. */
const NAMES_KEY = 'prism3-style-guide-names';
/** The `NAME_CELL_KEY` value on the title column's header cell, which holds no row. */
const NAME_HEADER = '#header';
const AUTO_LAYOUT = new Set(['HORIZONTAL', 'VERTICAL']);
/** Set a node's horizontal sizing where the host allows it: HUG and FILL throw on a node outside auto layout. */
const sizing = (n: SgNode, v: 'HUG' | 'FILL' | 'FIXED'): boolean => {
  try { n.layoutSizingHorizontal = v; return true; } catch { return false; }
};
const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
const near = (a: number, b: number): boolean => Math.abs(a - b) < 0.5;
/**
 * FNV-1a, 32 bits, twice: forward and over the reversed string. The same construction as the engine's
 * `planStamp` (`anatomy-figma.ts`, which holds the reasoning), written here because that helper is not exported
 * and this runs in the Figma sandbox, where `node:crypto` does not exist.
 */
const fnv = (s: string, reverse: boolean): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(reverse ? s.length - 1 - i : i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
};

/** A value as the fingerprint reads it: `figma.mixed` (a symbol) is "mixed", numbers to 4 places, objects with
 *  their keys sorted so the host's key order cannot move it. */
const stable = (v: unknown): string => {
  if (typeof v === 'symbol') return 'mixed';
  if (v === undefined) return '';
  if (typeof v === 'number') return String(Math.round(v * 1e4) / 1e4);
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${k}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v);
};

/** A paint list as the fingerprint reads it. A BOUND paint is its variable's id, never its color or its opacity:
 *  the host carries a color variable's alpha in the paint's `opacity`, so a variable's value moving repaints the
 *  swatch on both, and that is not a designer's edit to the table. */
const paintsKey = (ps: unknown): string => {
  if (!Array.isArray(ps)) return ps === undefined ? '' : 'mixed';
  return ps.map((p) => {
    const q = (p ?? {}) as { type?: unknown; visible?: unknown; opacity?: unknown; blendMode?: unknown; color?: { r?: unknown; g?: unknown; b?: unknown }; boundVariables?: { color?: { id?: unknown } } };
    const bound = q.boundVariables?.color?.id;
    const body = typeof bound === 'string' ? `@${bound}`
      : q.color ? `${[q.color.r, q.color.g, q.color.b].map((x) => Math.round(Number(x) * 1e4)).join(',')}:${Math.round(Number(q.opacity ?? 1) * 1e4)}`
      : stable(p);
    return `${String(q.type)}:${q.visible === false ? 0 : 1}:${String(q.blendMode ?? '')}:${body}`;
  }).join(';');
};

/** Read a property the host may refuse (a getter that throws under dynamic-page, or on the wrong node type). */
const read = (n: SgNode, k: string): unknown => { try { return (n as Record<string, unknown>)[k]; } catch { return undefined; } };

/** The node properties a designer changes by hand, beyond size, text, paint and pinned modes. Each is keyed as the
 *  host returns it; `figma.mixed` reads "mixed", except the text font, which reads its segments (below). */
const FINGERPRINT_FIELDS = [
  // corners
  'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius',
  // effects
  'effects', 'effectStyleId',
  // stroke geometry
  'strokeWeight', 'strokeAlign',
  // layer
  'opacity', 'blendMode',
  // styles
  'fillStyleId', 'strokeStyleId',
  // auto layout
  'layoutMode', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing',
] as const;
const FONT_FIELDS = ['fontName', 'fontSize', 'fontWeight', 'textStyleId'] as const;

/**
 * THE FINGERPRINT of a table: what a designer would change, read off the frame. Every node in it, in order (its
 * children and their order), each with its type, name, visibility, size, text, fills and strokes (a bound paint by
 * its variable's id), pinned modes, `FINGERPRINT_FIELDS`, its text font, and for an instance its main component and
 * component properties. The frame's own position is NOT in it: that is `AT_KEY`, which the re-stack moves along
 * with the frame, so a re-stacked table keeps its fingerprint.
 *
 * Over-sensitive by design: a change the eye cannot see (a layer renamed, a size moved by a pixel, an edit to the
 * cell component that reaches every instance) reads as an edit, and the table is kept. That is the safe direction,
 * since the other one deletes a designer's work. Async because an instance's main component is read with
 * `getMainComponentAsync` under dynamic-page.
 */
const fingerprintOf = async (wrap: SgNode): Promise<string> => {
  const parts: string[] = [];
  // A TITLE CELL IS NOT AN EDIT (owner decision 15): a designer renames rows there, so a table with a title column
  // leaves the title column out (its cells and its "Name" header, which fills the column), and with it the widths that follow the title column's width: the table's own, its
  // grid's and its header's (all hug or fill to the grid). A table without a title column reads exactly as before,
  // so a fingerprint recorded before the title cell still matches.
  const titled = !!wrap.findOne?.((n) => !!(n as SgNode).getPluginData?.(NAME_CELL_KEY));
  const walk = async (n: SgNode, depth: number, inHeader = false): Promise<void> => {
    if (titled && n.getPluginData?.(NAME_CELL_KEY)) return;
    const part = n.getPluginData?.(PART_KEY);
    const header = inHeader || part === 'header';
    const w = titled && (depth === 0 || part === 'table' || header) ? '' : Math.round(n.width ?? 0);
    const modes = n.explicitVariableModes && typeof n.explicitVariableModes === 'object'
      ? Object.entries(n.explicitVariableModes as Record<string, unknown>).map(([k, v]) => `${k}=${String(v)}`).sort().join(',') : '';
    const fields = FINGERPRINT_FIELDS.map((k) => stable(read(n, k)));
    // A text set in more than one font reads `figma.mixed` on these; its segments carry each run's font instead.
    const font = FONT_FIELDS.map((k) => read(n, k));
    const fontKey = font.some((v) => typeof v === 'symbol')
      ? stable(n.getStyledTextSegments?.([...FONT_FIELDS]) ?? 'mixed') : stable(font);
    let main = '';
    if (n.type === 'INSTANCE') {
      const m = (n.getMainComponentAsync ? await n.getMainComponentAsync().catch(() => null) : read(n, 'mainComponent')) as { id?: unknown } | null | undefined;
      main = `${String(m?.id ?? '')}:${stable(read(n, 'componentProperties'))}`;
    }
    parts.push([depth, n.type, n.name, n.visible === false ? 'hidden' : '', w, Math.round(n.height ?? 0),
      typeof n.characters === 'string' ? n.characters : '', paintsKey(n.fills), paintsKey(n.strokes), modes, ...fields, fontKey, main].join('\u241f'));
    for (const c of (n.children ?? []) as SgNode[]) await walk(c, depth + 1, header);
  };
  await walk(wrap, 0);
  const s = parts.join('\n');
  return `${fnv(s, false)}${fnv(s, true)}`;
};

/** Give a node a FIXED width, keeping its height hugging its content — the header's fallback where FILL is refused. */
const setWidth = (n: SgNode, w: number): void => {
  sizing(n, 'FIXED');
  n.resize?.(w, n.height ?? 0);
  try { n.layoutSizingVertical = 'HUG'; } catch { /* a root outside auto layout keeps its height */ }
};

/** Run the plan into the file. Never throws for a missing optional piece; the host throwing is the caller's.
 *  Yields to the host after every table and every `CELLS_PER_YIELD` cells within one (#1778): a full run held
 *  Figma and the panel for its whole ~4.7 minutes before it did. */
export const runStyleGuide = async (api: StyleGuideApi, contract: SgContract | null, options: StyleGuideOptions = {}, run: StyleGuideRun = {}): Promise<StyleGuideResult> => {
  const yieldTo = run.yieldTo ?? realYield;
  await api.loadAllPagesAsync();
  const { catalog, collectionById, variableById } = await readCatalog(api.variables, api.getLocalTextStylesAsync ? () => api.getLocalTextStylesAsync!() : undefined);
  const plan = planStyleGuide(catalog, contract, options);
  const misses: string[] = [];
  const out: TableOutcome[] = [];
  const skip = (t: SgTable, reason: 'no-page' | 'no-cells'): void => { out.push({ key: t.key, title: t.title, page: t.page, status: 'skipped', reason }); };

  const sets = findCellSets(api.root);
  const swatches = sets[SWATCH_SET] as SgNode | undefined;
  const textCells = sets[TEXT_CELL_SET] as SgNode | undefined;
  if (!swatches || !textCells) {
    for (const t of plan.tables) skip(t, 'no-cells');
    return { tables: out, stale: [], replaced: [], deleted: [], kept: [], unbound: 0, notes: plan.notes, misses, unmatched: plan.unmatched };
  }
  const allSets = api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly SgNode[];
  const headerSet = allSets.find((n) => n.name === SECTION_HEADER_SET) ?? allSets.find((n) => isTemplateSet(n.name, SECTION_HEADER_SET));
  const headerVariant = headerSet?.children?.find((c) => c.name === HEADER_VARIANT) as SgNode | undefined;
  const spacingSet = sets[SPACING_CELL_SET] as SgNode | undefined;
  if (!spacingSet && plan.tables.some((t) => t.rows.some((r) => r.specimen?.kind === 'spacing'))) misses.push(`no ${SPACING_CELL_SET} set — dimension rows have no specimen; Set up file adds it`);
  const styleById = new Map((catalog.textStyles ?? []).map((st) => [st.id, st]));
  if (!headerSet) misses.push(`no ${SECTION_HEADER_SET} set — tables have no header; Set up file adds it`);
  else if (!headerVariant) misses.push(`${SECTION_HEADER_SET} has no ${HEADER_VARIANT} variant — tables have no header`);

  // Fonts, loaded once each on first need; a miss leaves that text at its placeholder and is named.
  const fonts = new Map<string, Promise<boolean>>();
  const ensureFont = (f: unknown): Promise<boolean> => {
    const font = f as { family?: unknown; style?: unknown } | undefined;
    if (!font || typeof font.family !== 'string' || typeof font.style !== 'string') return Promise.resolve(false);
    const k = fontKeyOf(font as { family: string; style: string });
    if (!fonts.has(k)) fonts.set(k, api.loadFontAsync({ family: font.family, style: font.style }).then(() => true, () => { misses.push(`${k} unavailable`); return false; }));
    return fonts.get(k)!;
  };
  // A text node set in more than one font reads `fontName` as `figma.mixed`: every segment's font is loaded, and
  // one the host does not list is a named miss, never a cell left silently at its sample text.
  const writeText = async (n: SgNode | null | undefined, text: string): Promise<void> => {
    if (!n) return;
    const one = n.fontName as { family?: unknown } | undefined;
    const used = one && typeof one === 'object' && typeof one.family === 'string' ? [n.fontName] : (n.getStyledTextSegments?.(['fontName']) ?? []).map((seg) => seg.fontName);
    if (!used.length) {
      const note = `${String(n.name)}: its fonts could not be read, so the cell keeps its sample text`;
      if (!misses.includes(note)) misses.push(note);
      return;
    }
    const ready = await Promise.all(used.map(ensureFont));
    if (ready.every(Boolean)) n.characters = text;
  };
  const textNodes = (n: SgNode): SgNode[] => (n.findAll?.((c) => c.type === 'TEXT') ?? []) as SgNode[];
  const byName = (n: SgNode, name: string): SgNode | null =>
    (n.findOne?.((c) => c.type === 'TEXT' && typeof c.name === 'string' && c.name.toLowerCase() === name.toLowerCase()) as SgNode | null) ?? null;

  const variantOf = (set: SgNode, want: Record<string, string>, label: string): SgNode | null => {
    const hit = pickVariant(set, want);
    if (!hit) { misses.push(`${String(set.name)} has no ${label} variant`); return null; }
    if (!hit.exact) {
      const note = `${String(set.name)}: no exact ${label} variant — used ${String(hit.member.name)}`;
      if (!misses.includes(note)) misses.push(note);
    }
    return hit.member as SgNode;
  };

  // A text cell HUGS its words, never clips them (live, 2026-09-28: the owner's cells are a fixed 120px, and
  // "nbds/core/palette/primary/02" was cut off inside it). Every text node sizes to its words with truncation
  // off; every auto-layout frame from the inside out hugs; a root outside auto layout is widened to its content.
  // Nothing wraps, ever (owner decision, 2026-09-29): the cell then FILLs a HUG track, which takes this width.
  const fit = (inst: SgNode): void => {
    for (const t of textNodes(inst)) {
      t.textTruncation = 'DISABLED';
      t.textAutoResize = 'WIDTH_AND_HEIGHT';
      sizing(t, 'HUG');
    }
    const frames = ((inst.findAll?.((c) => c.type !== 'TEXT' && AUTO_LAYOUT.has(String(c.layoutMode))) ?? []) as SgNode[]).reverse();
    for (const f of [...frames, inst]) if (AUTO_LAYOUT.has(String(f.layoutMode))) sizing(f, 'HUG');
    if (!AUTO_LAYOUT.has(String(inst.layoutMode))) {
      const kids = (inst.children ?? []) as SgNode[];
      if (kids.length) inst.resize?.(Math.max(...kids.map((k) => num(k.x) * 2 + (k.width ?? 0))), inst.height ?? 0);
    }
  };
  const textCell = async (type: 'default' | 'header' | 'value alias', color: string, text: string, alias?: string | null): Promise<SgNode | null> => {
    const v = variantOf(textCells, { type, color, textalign: 'left', padding: 'default' }, `type=${type}, color=${color}`);
    if (!v?.createInstance) return null;
    const inst = v.createInstance() as SgNode;
    const texts = textNodes(inst);
    const main = byName(inst, 'Text') ?? texts[0];
    await writeText(main, text);
    if (type === 'value alias') await writeText(byName(inst, 'Alias') ?? texts.filter((t) => t !== main).pop(), alias ?? '');
    fit(inst);
    return inst;
  };

  // THE SPECIMEN DEPENDS ON THE ROLE (owner decision 13, 2026-09-29, #259). The swatch member is the one the row's
  // display names (`autoDisplay`, or the Display override): letters for a text role, an outlined shape for a border,
  // the glyph for an icon, the checkerboard for a translucent value, the filled square otherwise. Its paint (the
  // stroke, for a border) is bound to the token, it pins the column's mode, and it keeps its component's size,
  // FIXED on both axes: it never stretches with the column.
  //   • A SEMANTIC row draws it on a GROUND: a frame bound to the ground variable the contrast column measures
  //     against (or plain white where the role has none), pinned to the same mode. The ground is the grid cell and
  //     FILLs its track, so the ground reaches the cell's edges.
  //   • A PRIMITIVE (palette) row has no ground: nothing is measured against one, so the swatch is the cell itself.
  const unboundIn = new Map<string, number>();
  /** Phase-2 specimens the host would not bind, by what they are ("type=radius", "font size"). */
  const unboundSpec = new Map<string, number>();
  const unboundAs = (what: string): void => { unboundSpec.set(what, (unboundSpec.get(what) ?? 0) + 1); };
  /** Bind `field` on `node` to the variable; false where there is no node or variable, or the host refuses. */
  const bindTo = (node: SgNode | null | undefined, field: string, variable: unknown): boolean => {
    if (!node?.setBoundVariable || !variable) return false;
    try { node.setBoundVariable(field, variable); return true; } catch { return false; }
  };
  const swatchOf = (row: SgRow, cell: SgCell, collection: unknown): { inst: SgNode; w: number; h: number } | null => {
    const v = variantOf(swatches, { type: row.display }, `type=${row.display}`);
    if (!v?.createInstance) return null;
    const inst = v.createInstance() as SgNode;
    const target = bindTarget(inst, row.display);
    const variable = variableById.get(row.variableId);
    if (target && variable) {
      const paint = api.variables.setBoundVariableForPaint(PLACEHOLDER_PAINT, 'color', variable);
      if (row.display === 'border') target.strokes = [paint];
      else target.fills = [paint];
    } else unboundIn.set(String(v.name), (unboundIn.get(String(v.name)) ?? 0) + 1);
    inst.setExplicitVariableModeForCollection?.(collection, cell.modeId);
    return { inst, w: num(v.width), h: num(v.height) };
  };
  /** FIXED at the member's own size — set once the swatch is in its parent, which the host requires. */
  const keepSize = ({ inst, w, h }: { inst: SgNode; w: number; h: number }): void => {
    sizing(inst, 'FIXED');
    try { inst.layoutSizingVertical = 'FIXED'; } catch { /* a host that refuses it leaves the instance as created */ }
    if (w > 0 && h > 0) inst.resize?.(w, h);
  };
  const specimen = (row: SgRow, cell: SgCell, collection: unknown): SgNode => {
    const ground = api.createFrame();
    ground.name = 'Ground';
    ground.layoutMode = 'HORIZONTAL';
    ground.primaryAxisSizingMode = 'AUTO';
    ground.counterAxisSizingMode = 'AUTO';
    ground.paddingTop = 12; ground.paddingBottom = 12; ground.paddingLeft = 16; ground.paddingRight = 16;
    const groundVariable = cell.groundId ? variableById.get(cell.groundId) : undefined;
    ground.fills = groundVariable ? [api.variables.setBoundVariableForPaint(PLACEHOLDER_PAINT, 'color', groundVariable)] : WHITE;
    ground.setExplicitVariableModeForCollection?.(collection, cell.modeId);
    const sw = swatchOf(row, cell, collection);
    if (sw) { ground.appendChild?.(sw.inst); keepSize(sw); }
    return ground;
  };

  // Pages and existing tables.
  const pages = new Map(api.root.children.map((p) => [p.name, p]));
  const framesOn = (p: SgPage): SgNode[] =>
    ((p.findAllWithCriteria ? p.findAllWithCriteria({ types: ['FRAME'] }) : p.children) as readonly SgNode[]).filter((n) => n.type === 'FRAME');
  const bottomOf = new Map<string, { x: number; y: number }>();
  const anchor = (p: SgPage): { x: number; y: number } => {
    if (!bottomOf.has(p.name)) {
      const shown = (p.children as readonly SgNode[]).filter((n) => n.visible !== false);
      bottomOf.set(p.name, shown.length
        ? { x: Math.min(...shown.map((n) => Number(n.x ?? 0))), y: Math.max(...shown.map((n) => Number(n.y ?? 0) + (n.height ?? 0))) + TABLE_GAP }
        : { x: 0, y: 0 });
    }
    return bottomOf.get(p.name)!;
  };

  const headerColor = options.header === 'light' ? 'white' : 'dark';
  const drawnOn = new Set<SgPage>();
  /** Every table this run drew, and how much taller it is than before (0 for a new one). */
  const drawn: { frame: SgNode; page: SgPage; created: boolean; delta: number }[] = [];
  const drawTable = async (t: SgTable): Promise<void> => {
    const page = pages.get(t.page);
    if (!page) { skip(t, 'no-page'); return; }
    const collection = collectionById.get(t.collectionId);

    let wrap = framesOn(page).find((n) => n.getPluginData?.(TABLE_KEY) === t.key) ?? null;
    const created = !wrap;
    if (wrap) {
      // A RERUN refreshes the words this build wrote — the frame name and the header's title and description —
      // and only while they still read what it wrote, so a designer's edit survives. A table from before the
      // written text was recorded counts its title as ours when the frame is still named after it.
      const header = ((wrap.children ?? []) as SgNode[]).find((c) => c.getPluginData?.(PART_KEY) === 'header');
      const titleNode = header ? byName(header, 'Title') : null;
      const descNode = header ? byName(header, 'Description') : null;
      const wroteTitle = wrap.getPluginData?.(TITLE_KEY) || (titleNode && wrap.name === `Style guide — ${String(titleNode.characters)}` ? String(titleNode.characters) : '');
      const wroteDesc = wrap.getPluginData?.(DESC_KEY) || '';
      if (wroteTitle && wrap.name === `Style guide — ${wroteTitle}`) wrap.name = `Style guide — ${t.title}`;
      if (titleNode && wroteTitle && titleNode.characters === wroteTitle) await writeText(titleNode, t.title);
      if (descNode && wroteDesc && descNode.characters === wroteDesc) await writeText(descNode, t.description);
      // Recorded only when the header now reads this run's words; an edited header keeps the old record, so it
      // stays unmatched and is never overwritten.
      if (titleNode?.characters === t.title) wrap.setPluginData?.(TITLE_KEY, t.title);
      if (descNode?.characters === t.description) wrap.setPluginData?.(DESC_KEY, t.description);
    } else {
      wrap = api.createFrame();
      wrap.name = `Style guide — ${t.title}`;
      wrap.layoutMode = 'VERTICAL';
      wrap.primaryAxisSizingMode = 'AUTO';
      wrap.counterAxisSizingMode = 'AUTO';
      wrap.itemSpacing = 40;
      wrap.fills = [];
      wrap.setPluginData?.(TABLE_KEY, t.key);
      // Measured BEFORE the new frame joins the page, so it does not count itself.
      const at = anchor(page);
      page.appendChild(wrap);
      wrap.x = at.x;
      wrap.y = at.y;
      wrap.setPluginData?.(AT_KEY, `${at.x},${at.y}`);
      if (headerVariant?.createInstance) {
        const h = headerVariant.createInstance() as SgNode;
        const descKey = Object.keys(h.componentProperties ?? {}).find((k) => k === 'Description' || k.startsWith('Description#'));
        if (descKey) h.setProperties?.({ [descKey]: true });
        await writeText(byName(h, 'Title'), t.title);
        await writeText(byName(h, 'Description'), t.description);
        if (byName(h, 'Title')?.characters === t.title) wrap.setPluginData?.(TITLE_KEY, t.title);
        if (byName(h, 'Description')?.characters === t.description) wrap.setPluginData?.(DESC_KEY, t.description);
        h.setPluginData?.(PART_KEY, 'header');
        wrap.appendChild?.(h);
      }
    }

    // The table's height before this run, which a filtered run's re-stack moves the tables below it by (#1778).
    const before = created ? 0 : num(wrap.height);
    // THE TITLE CELLS' TEXT (owner decision 15), read before the grid goes: a cell a designer edited (its text is not
    // the default the generator wrote) keeps its text. A table drawn last without the column keeps its record.
    type NameRecord = Record<string, { auto: string; text: string }>;
    const names = (() => { try { return JSON.parse(wrap.getPluginData?.(NAMES_KEY) || '{}') as NameRecord; } catch { return {} as NameRecord; } })();
    const liveNames = new Map<string, string>();
    for (const g of (wrap.children ?? []) as SgNode[]) if (g.getPluginData?.(PART_KEY) === 'table') {
      for (const cell of (g.findAll?.((n) => !!(n as SgNode).getPluginData?.(NAME_CELL_KEY)) ?? []) as SgNode[]) {
        const t = byName(cell, 'Text') ?? textNodes(cell)[0];
        const id = cell.getPluginData!(NAME_CELL_KEY);
        if (id !== NAME_HEADER && t && typeof t.characters === 'string') liveNames.set(id, t.characters);
      }
    }
    const nameFor = (row: SgRow): string => {
      const rec = Object.prototype.hasOwnProperty.call(names, row.variableId) ? names[row.variableId] : undefined;
      const text = liveNames.get(row.variableId) ?? rec?.text;
      return rec && text !== undefined && text !== rec.auto ? text : row.label;
    };
    // The grid is rebuilt every run: the values are static text, refreshed here.
    for (const c of (wrap.children ?? []) as SgNode[]) if (c.getPluginData?.(PART_KEY) === 'table') c.remove?.();
    const grid = api.createFrame();
    grid.name = 'Table';
    grid.fills = [];
    grid.setPluginData?.(PART_KEY, 'table');
    grid.layoutMode = 'GRID';
    grid.gridRowCount = t.rows.length + 1;
    grid.gridColumnCount = t.columns.length;
    // A 2px gap between tracks, both ways, as in the owner's examples (owner decision, 2026-09-29, #259).
    grid.gridRowGap = TRACK_GAP;
    grid.gridColumnGap = TRACK_GAP;
    // THE OWNER'S GRID MODEL (owner decision, 2026-09-29, #259), measured live on their "↳ Style Guide Examples":
    // every column and row track HUGs, every cell FILLs its track on both axes, and every text hugs its words on
    // one line. A track takes its widest cell's content, and a designer who drags the grid wider widens the
    // tracks and every cell follows. This replaces #1749's FIXED column widths and its wrapped descriptions:
    // nothing wraps, so the description column is its longest line. The tracks are ASSIGNED, not mutated in
    // place, since a host getter may hand back a copy; mutated where the assignment throws.
    const hugTracks = (key: 'gridColumnSizes' | 'gridRowSizes', n: number): void => {
      try { grid[key] = Array.from({ length: n }, () => ({ type: 'HUG' })); }
      catch { for (const s of grid[key] ?? []) s.type = 'HUG'; }
    };
    hugTracks('gridColumnSizes', t.columns.length);
    hugTracks('gridRowSizes', t.rows.length + 1);
    grid.layoutSizingHorizontal = 'HUG';
    grid.layoutSizingVertical = 'HUG';
    wrap.appendChild?.(grid);

    // A cell FILLs its track, both axes: a text cell hugs its words (`fit`), and the track takes that width; the
    // specimen's ground fills the track too, so the ground reaches the cell's edges however wide the column is. A
    // palette row's swatch is the one cell that does not: it keeps its component's size (decision 13).
    const place = (n: SgNode | null, r: number, c: number): void => {
      if (!n) return;
      grid.appendChildAt?.(n, r, c);
      sizing(n, 'FILL');
      try { n.layoutSizingVertical = 'FILL'; } catch { /* a host that refuses it leaves the cell hugging */ }
    };
    /**
     * A PHASE-2 SPECIMEN (#259), bound to the row's variable and pinned to its column's mode, as a color swatch is:
     *   • spacing: a `_style-guide-spacing-cells` member (`filled` for a spacing, `line` for a size or scale) whose bar
     *     is the value's width, the width bound (`setBoundVariable('width')`);
     *   • radius: the swatches set's `type=radius` member at its fixed size, its rounded corner bound;
     *   • font: "Abc 123" in a text cell with the one property bound (a family or weight first loads that font);
     *   • style: "Abc 123" in a text cell with the text style applied (`setTextStyleIdAsync`).
     * A binding the host refuses is counted, named in the verdict, and the specimen keeps the component's own value.
     */
    const drawSpecimen = async (row: SgRow, spec: SgSpecimen, cell: SgCell, collection: unknown, r: number, c: number): Promise<void> => {
      const variable = variableById.get(row.variableId);
      const pin = (n: SgNode): void => { if (collection && cell.modeId) n.setExplicitVariableModeForCollection?.(collection, cell.modeId); };
      if (spec.kind === 'spacing') {
        if (!spacingSet) return;
        const v = variantOf(spacingSet, { display: spec.member }, `display=${spec.member}`);
        if (!v?.createInstance) return;
        const inst = v.createInstance() as SgNode;
        const bar = ((inst.findOne?.((n) => typeof n.name === 'string' && n.name.toLowerCase() === 'bar') ?? inst.findOne?.((n) => n.type !== 'TEXT')) ?? null) as SgNode | null;
        if (bar && typeof cell.num === 'number') bar.resize?.(Math.max(0.01, cell.num), bar.height ?? 0);
        if (!bindTo(bar, 'width', variable)) unboundAs(`${String(v.name)} spacing`);
        pin(inst);
        fit(inst);
        place(inst, r, c);
        return;
      }
      if (spec.kind === 'radius') {
        const v = variantOf(swatches, { type: 'radius' }, 'type=radius');
        if (!v?.createInstance) return;
        const inst = v.createInstance() as SgNode;
        if (!bindTo(bindTarget(inst, 'default'), 'topLeftRadius', variable)) unboundAs('type=radius');
        pin(inst);
        grid.appendChildAt?.(inst, r, c);
        keepSize({ inst, w: num(v.width), h: num(v.height) });
        return;
      }
      const inst = await textCell('default', 'white', SAMPLE_TEXT);
      if (!inst) return;
      const text = byName(inst, 'Text') ?? textNodes(inst)[0] ?? null;
      let bound = true;
      let what = 'text-style';
      if (spec.kind === 'style') {
        const st = styleById.get(row.variableId);
        bound = false;
        if (text && st && await ensureFont(st.fontName)) {
          try {
            if (text.setTextStyleIdAsync) await text.setTextStyleIdAsync(st.id);
            else text.textStyleId = st.id;
            bound = true;
          } catch { /* named below */ }
        }
      } else if (spec.bind) {
        what = FONT_LABEL[spec.bind].toLowerCase();
        const font = (text?.fontName ?? {}) as { family?: unknown; style?: unknown };
        // The host sets a bound family or weight only in a font it has loaded: that family in the cell's style, or the
        // cell's family at that weight.
        const needs = spec.bind === 'fontFamily' && cell.str && typeof font.style === 'string' ? { family: cell.str, style: font.style }
          : spec.bind === 'fontWeight' && typeof cell.num === 'number' && typeof font.family === 'string' ? { family: font.family, style: weightName(cell.num) ?? 'Regular' }
          : null;
        bound = (!needs || await ensureFont(needs)) && bindTo(text, spec.bind, variable);
      }
      if (!bound) unboundAs(what);
      pin(inst);
      fit(inst);
      place(inst, r, c);
    };
    for (let c = 0; c < t.columns.length; c++) {
      const h = await textCell('header', headerColor, t.columns[c]);
      // The Name column's header is part of the title column: its width follows the titles, so the fingerprint skips it.
      if (options.titleCell && c === 0) h?.setPluginData?.(NAME_CELL_KEY, NAME_HEADER);
      place(h, 0, c);
    }
    // YIELD WITHIN A BIG TABLE (#1778): whole rows at a time, about `CELLS_PER_YIELD` cells between yields.
    const rowsPerYield = Math.max(1, Math.floor(CELLS_PER_YIELD / t.columns.length));
    for (let r = 0; r < t.rows.length; r++) {
      const row = t.rows[r];
      let c = 0;
      if (options.titleCell) {
        const shown = nameFor(row);
        const cell = await textCell('default', 'white', shown);
        cell?.setPluginData?.(NAME_CELL_KEY, row.variableId);
        place(cell, r + 1, c++);
        names[row.variableId] = { auto: row.label, text: shown };
      }
      place(await textCell('default', 'white', row.token), r + 1, c++);
      // PHASE 2 (#259): a dimension, font-variable or text-style row. A specimen and a value per mode, then the values
      // printed once (a text style's family, weight, letter spacing and its toggled columns). No contrast column.
      if (row.specimen) {
        for (const cell of row.cells) {
          await drawSpecimen(row, row.specimen, cell, collection, r + 1, c++);
          const chip = options.aliases !== false && cell.alias;
          place(await textCell(chip ? 'value alias' : 'default', 'white', cell.value, cell.alias), r + 1, c++);
        }
        for (const x of row.extra ?? []) place(await textCell(options.aliases !== false && x.alias ? 'value alias' : 'default', 'white', x.value, x.alias), r + 1, c++);
      } else for (const cell of row.cells) {
        if (t.kind === 'primitive') {
          // A palette row: the swatch alone, at its own size, in the cell (decision 13).
          const sw = swatchOf(row, cell, collection);
          if (sw) { grid.appendChildAt?.(sw.inst, r + 1, c); keepSize(sw); }
          c++;
        } else place(specimen(row, cell, collection), r + 1, c++);
        const chip = options.aliases !== false && cell.alias;
        place(await textCell(chip ? 'value alias' : 'default', 'white', cell.value, cell.alias), r + 1, c++);
        if (t.kind === 'semantic') place(await textCell('default', 'white', contrastText(cell.contrast)), r + 1, c++);
      }
      if (options.description !== false) place(await textCell('default', 'white', row.description || '—'), r + 1, c++);
      if ((r + 1) % rowsPerYield === 0) await yieldTo();
    }
    // Read back: a grid that did not keep its hugging tracks is named, so a live run shows it rather than a
    // misdrawn table.
    const hugs = (ts: readonly { type: string }[] | undefined, n: number): boolean => (ts ?? []).length === n && (ts ?? []).every((s) => s.type === 'HUG');
    if (!hugs(grid.gridColumnSizes, t.columns.length) || !hugs(grid.gridRowSizes, t.rows.length + 1)) {
      misses.push(`${t.title}: the grid did not keep its hugging tracks, so a column may not fit its widest cell`);
    }
    // THE HEADER SPANS ITS TABLE, NOT THE PAGE (owner decision, 2026-09-29, #259). The `_Section-header` instance
    // arrives at its component's width (2,517px in the owner's file), and the wrap hugs its widest child, so every
    // table was page-wide around a 732px grid. The header FILLs the wrap, so the wrap hugs the grid and the header
    // takes that width. FILL, not FIXED + resize: the host has ignored `resize` on an instance's FIXED text
    // (live, 2026-09-28), and FILL follows the grid when a rerun widens it. FIXED at the grid's width only where
    // the host refuses FILL. Set on every run, so a table drawn before this rule takes it on its next rerun.
    const header = ((wrap.children ?? []) as SgNode[]).find((c) => c.getPluginData?.(PART_KEY) === 'header');
    if (header && !sizing(header, 'FILL')) setWidth(header, grid.width ?? 0);
    if (header && !near(num(wrap.width), num(grid.width))) misses.push(`${t.title}: the header did not take the table's width, so the table is ${Math.round(num(wrap.width))}px wide around a ${Math.round(num(grid.width))}px grid`);

    if (options.titleCell) wrap.setPluginData?.(NAMES_KEY, JSON.stringify(names));
    const after = snapshotOf(t);
    const was = (() => { try { return JSON.parse(wrap.getPluginData?.(ROWS_KEY) || '{}') as RowsSnapshot; } catch { return {}; } })();
    wrap.setPluginData?.(ROWS_KEY, JSON.stringify(after));
    // Stamped last, once the table holds everything this run writes: the frame it was written on, and what it holds.
    wrap.setPluginData?.(MARK_KEY, `${String(page.id)}|${String(wrap.id)}`);
    wrap.setPluginData?.(PRINT_KEY, await fingerprintOf(wrap));
    out.push(created
      ? { key: t.key, title: t.title, page: t.page, status: 'created', rows: t.rows.length }
      : { key: t.key, title: t.title, page: t.page, status: 'updated', rows: t.rows.length, diff: diffRows(was, after) });
    if (created) anchor(page).y += (wrap.height ?? 0) + TABLE_GAP;
    drawnOn.add(page);
    drawn.push({ frame: wrap, page, created, delta: created ? 0 : num(wrap.height) - before });
  };
  // ONE TABLE AT A TIME, YIELDING BETWEEN THEM (#1778): the host repaints, the panel's pill counts up, and a
  // designer can scroll while the rest draw.
  if (plan.tables.length) run.onProgress?.({ done: 0, total: plan.tables.length, title: '', tableMs: 0 });
  for (let i = 0; i < plan.tables.length; i++) {
    const t = plan.tables[i];
    const started = Date.now();
    await drawTable(t);
    run.onProgress?.({ done: i + 1, total: plan.tables.length, title: t.title, tableMs: Date.now() - started });
    await yieldTo();
  }

  const recordOf = (n: SgNode): { x: number; y: number } | null => {
    const s = n.getPluginData?.(AT_KEY) || '';
    const [x, y] = s.split(',').map(Number);
    return s && Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  };

  // SUPERSEDED TABLES (owner decision, 2026-09-28: "delete superseded tables if unedited"). A table an earlier run
  // wrote that this run does not draw — its group is gone (stale), or it is now drawn as narrower tables (replaced).
  // Only tables this run could have drawn are candidates: its types, and its collections (by ID, the key's second
  // field) when filtered. A run filtered to named TABLES (#1778) covers only those, and draws every one of them, so
  // it has no candidate at all: the tables it skipped are not stale, and an earlier build's wider table is not
  // replaced by one narrow table drawn alone. Checked before the re-stack, so the stack closes over a deleted table.
  const planned = new Set(plan.tables.map((t) => t.key));
  const types = new Set((options.types ?? [...PHASE_TYPES]).map((t) => t.toLowerCase()));
  // Text styles belong to no collection; their table's key names the pseudo-collection, present while the file has any.
  const wantIds = options.collections ? new Set(catalog.collections.filter((c) => options.collections!.some((w) => w.toLowerCase() === c.name.toLowerCase())).map((c) => c.id)) : null;
  const stale: string[] = [];
  const replaced: string[] = [];
  const deleted: string[] = [];
  const kept: { name: string; reason: KeepReason }[] = [];
  const freed = new Map<SgPage, { x: number; y: number }[]>();
  // Deleted only when every check passes, in this order. The run's own guards first: the table's collection is
  // still in this file, and this run drew something — a file whose variables moved to a library reads an empty
  // catalog, and every table would otherwise read as stale. Then: a fingerprint exists (a table from before it was
  // recorded is never deleted — owner decision, 2026-09-28); this is the frame the generator wrote, not a duplicate
  // that carries its plugin data; it sits directly on the page the generator wrote it to, where the generator put
  // it; and it still holds what was written.
  const collectionIds = new Set([...catalog.collections.map((c) => c.id), ...(catalog.textStyles?.length ? [TEXT_STYLES_ID] : [])]);
  const verdictOf = async (f: SgNode, p: SgPage, colId: string): Promise<KeepReason | 'unedited'> => {
    if (!collectionIds.has(colId)) return 'no-collection';
    if (!plan.tables.length) return 'nothing-drawn';
    const print = f.getPluginData?.(PRINT_KEY) || '';
    if (!print) return 'unrecorded';
    const mark = f.getPluginData?.(MARK_KEY) || '';
    const bar = mark.lastIndexOf('|');
    if (mark.slice(bar + 1) !== String(f.id)) return 'copied';
    const parent = f.parent as { id?: unknown } | null | undefined;
    if (!parent || (parent !== p && (p.id === undefined || parent.id !== p.id))) return 'moved';
    if (bar < 0 || mark.slice(0, bar) !== String(p.id)) return 'moved';
    const at = recordOf(f);
    if (!at || !near(num(f.x), at.x) || !near(num(f.y), at.y)) return 'moved';
    return (await fingerprintOf(f)) === print ? 'unedited' : 'edited';
  };
  for (const p of api.root.children) for (const f of framesOn(p)) {
    // The generator's key is what makes a frame a candidate at all: a frame without it is never touched,
    // whatever it is named. (The type check below would also refuse one, since its type reads ''; this line is
    // the stated rule, and removing it alone turns nothing red.)
    const k = f.getPluginData?.(TABLE_KEY);
    if (!k || planned.has(k)) continue;
    const [type, colId] = k.split('|');
    if (!types.has(type.toLowerCase()) || (wantIds && !wantIds.has(colId))) continue;
    if (options.tables) continue;
    // A key that is an ANCESTOR of a planned one is a table this run now draws as narrower tables — an earlier
    // build drew one table per root where a collection holds two (`…|nbds` → `…|nbds/color/text`).
    if ([...planned].some((q) => q.startsWith(`${k}/`))) replaced.push(String(f.name));
    else stale.push(String(f.name));
    const v = await verdictOf(f, p, colId);
    if (v === 'unedited' && f.remove) {
      if (!freed.has(p)) freed.set(p, []);
      freed.get(p)!.push({ x: num(f.x), y: num(f.y) });
      f.remove();
      deleted.push(String(f.name));
    } else kept.push({ name: String(f.name), reason: v === 'unedited' ? 'not-removable' : v });
  }

  // A FILTERED run that draws a table for the first time, where the same collection still holds a table the
  // generator no longer draws — a group renamed, drawn under its new title — says the old table stays: it judges
  // no superseded table, so without this note the designer would see both and not know why.
  const notes = [...plan.notes];
  if (options.tables) {
    const newCols = new Set(out.filter((o) => o.status === 'created').map((o) => plan.tables.find((t) => t.key === o.key)?.collectionId));
    const everyKey = new Set(planStyleGuide(catalog, contract, { ...options, tables: undefined }).tables.map((t) => t.key));
    const left = api.root.children.flatMap((p) => framesOn(p)).filter((f) => {
      const k = f.getPluginData?.(TABLE_KEY) || '';
      return !!k && !everyKey.has(k) && newCols.has(k.split('|')[1]);
    }).map((f) => String(f.name));
    if (left.length) notes.push(`${left.join(', ')} ${left.length === 1 ? 'stays' : 'stay'} in place: the generator no longer draws ${left.length === 1 ? 'it' : 'them'}, and a run filtered to named tables deletes nothing. The next run without a Tables filter decides whether to delete ${left.length === 1 ? 'it' : 'them'}`);
  }

  // RE-STACK (live, 2026-09-28: "Primary — nbds" grew on a rerun to span y 1,013 → ~10,400 and ran over
  // "Neutral — nbds", still at 3,585). The generator's own tables on each page it drew on are re-flowed in their
  // order down the page, TABLE_GAP apart, from the topmost. A table is where the generator left it while it sits at
  // the position recorded then; one that does not was moved by a designer and is left alone. A table from before the
  // record has none, and is taken as the generator's while it keeps the stack's x. A deleted table's place counts
  // as the top when it was higher, so deleting the first table does not leave a gap above the rest.
  //
  // A FILTERED run (#1778) does not re-flow: it draws a few tables on a page it did not lay out, so it only keeps
  // them from overlapping. Each table below a drawn one, in that table's column, moves by exactly the drawn table's
  // change in height — and only while it sits where the generator left it (its position record matches). No other
  // gap on the page closes, a table a designer moved stays put, and a table from before the record is neither
  // moved nor recorded. A table it moves has its record moved with it, so the next run still reads it as where the
  // generator left it rather than as moved by hand.
  const byY = (a: SgNode, b: SgNode): number => num(a.y) - num(b.y);
  const leftAt = (n: SgNode): boolean => { const a = recordOf(n); return !!a && near(num(n.x), a.x) && near(num(n.y), a.y); };
  if (options.tables) for (const p of drawnOn) {
    const grown = drawn.filter((d) => d.page === p && !d.created && !near(d.delta, 0));
    if (!grown.length) continue;
    const ours = (p.children as readonly SgNode[]).filter((n) => n.type === 'FRAME' && !!n.getPluginData?.(TABLE_KEY));
    const y0 = new Map(ours.map((n) => [n, num(n.y)]));
    for (const n of ours.filter(leftAt)) {
      const shift = grown.filter((d) => d.frame !== n && near(num(d.frame.x), num(n.x)) && (y0.get(d.frame) ?? 0) < (y0.get(n) ?? 0)).reduce((s, d) => s + d.delta, 0);
      if (near(shift, 0)) continue;
      n.y = num(n.y) + shift;
      n.setPluginData?.(AT_KEY, `${num(n.x)},${num(n.y)}`);
    }
  }
  else for (const p of drawnOn) {
    const ours = (p.children as readonly SgNode[]).filter((n) => n.type === 'FRAME' && !!n.getPluginData?.(TABLE_KEY));
    const left = ours.filter((n) => { const a = recordOf(n); return !!a && near(num(n.x), a.x) && near(num(n.y), a.y); });
    const unrecorded = ours.filter((n) => !recordOf(n));
    const lead = [...left].sort(byY)[0] ?? [...unrecorded].sort(byY)[0];
    if (!lead) continue;
    const x = num(lead.x);
    const stack = [...left, ...unrecorded.filter((n) => near(num(n.x), x))].sort(byY);
    if (!stack.length) continue;
    let y = num(stack[0].y);
    for (const d of freed.get(p) ?? []) if (near(d.x, x)) y = Math.min(y, d.y);
    for (const n of stack) {
      n.x = x;
      n.y = y;
      n.setPluginData?.(AT_KEY, `${x},${y}`);
      y += (n.height ?? 0) + TABLE_GAP;
    }
  }

  const unbound = [...unboundIn.values(), ...unboundSpec.values()].reduce((a, b) => a + b, 0);
  for (const [variant, n] of unboundIn) misses.push(`${n} ${n === 1 ? 'swatch' : 'swatches'} in ${variant} have no layer that takes a fill, so they show the component's own color`);
  for (const [what, n] of unboundSpec) misses.push(`${n} ${what} specimen${n === 1 ? ' is' : 's are'} not bound to ${n === 1 ? 'its' : 'their'} ${what === 'text-style' ? 'style' : 'variable'}, so ${n === 1 ? 'it shows' : 'they show'} the cell component's own value`);
  return { tables: out, stale, replaced, deleted, kept, unbound, notes, misses, unmatched: plan.unmatched };
};

/**
 * The node a swatch instance binds — `Specimen` by name, in any case; otherwise, for an adopted set with its
 * own names, the first text node (text), the first stroked node (border) or the first filled node (the rest);
 * and last, the instance itself, where the member paints its own fill (or stroke) or has no layers inside.
 */
export const bindTarget = (inst: SgNode, display: SwatchType): SgNode | null => {
  const named = inst.findOne?.((n) => typeof n.name === 'string' && n.name.toLowerCase() === 'specimen') as SgNode | null | undefined;
  if (named) return named;
  const has = (p: unknown): boolean => Array.isArray(p) && p.length > 0;
  const pred = display === 'text' ? (n: CellNode) => n.type === 'TEXT'
    : display === 'border' ? (n: CellNode) => n.type !== 'TEXT' && has(n.strokes)
    : (n: CellNode) => n.type !== 'TEXT' && n.name !== 'Checker' && n.name !== 'Check' && has(n.fills);
  const hit = (inst.findOne?.(pred) as SgNode | null | undefined) ?? null;
  if (hit) return hit;
  // A member that carries its paint on ITSELF — the owner's `type=default` has no child layers at all (live,
  // 2026-09-28: 368 swatches unbound) — binds the instance's own fill, or stroke for border.
  const own = display === 'border' ? inst.strokes : inst.fills;
  return has(own) || !(inst.children ?? []).length ? inst : null;
};

/** The verdict line for the panel and the agent result. */
export const styleGuideSummary = (r: StyleGuideResult): { ok: boolean; headline: string; summary: string } => {
  const made = r.tables.filter((t) => t.status === 'created');
  const upd = r.tables.filter((t): t is Extract<TableOutcome, { status: 'updated' }> => t.status === 'updated');
  const skipped = r.tables.filter((t): t is Extract<TableOutcome, { status: 'skipped' }> => t.status === 'skipped');
  const parts: string[] = [];
  // A filtered run (#1778) often draws one table, so every count here agrees with its number.
  const tables = (n: number): string => `${n} table${n === 1 ? '' : 's'}`;
  if (made.length) parts.push(`${tables(made.length)} created (${made.slice(0, 3).map((t) => t.title).join(', ')}${made.length > 3 ? '…' : ''})`);
  if (upd.length) {
    const changes = upd.flatMap((t) => {
      const d = t.diff;
      const bits = [d.added.length && `${d.added.length} added`, d.removed.length && `${d.removed.length} removed`, d.changed.length && `${d.changed.length} changed`, d.renamed.length && `${d.renamed.length} renamed`].filter(Boolean);
      return bits.length ? [`${t.title}: ${bits.join(', ')}`] : [];
    });
    parts.push(`${tables(upd.length)} updated in place — ${changes.length ? changes.join('; ') : 'no token changes'}`);
  }
  const noCells = skipped.filter((t) => t.reason === 'no-cells');
  if (noCells.length) parts.push(`${noCells.length} tables skipped — this file has no style-guide cell sets, and Set up file adds them`);
  const noPage = [...new Set(skipped.filter((t) => t.reason === 'no-page').map((t) => t.page))];
  for (const p of noPage) parts.push(`${skipped.filter((t) => t.page === p).length} tables skipped — this file has no ${p} page, and Set up file adds it`);
  // Superseded tables: the deleted ones by name, since a deletion names its scope; the kept ones grouped by the
  // reason each was kept; a table from before the fingerprint apart, with what to do about it. Wording proposed,
  // owner to confirm (docs/45 §8).
  const list = (xs: readonly string[]): string => (xs.length > 3 ? `${xs.slice(0, 3).join(', ')} and ${xs.length - 3} more` : xs.join(', '));
  const noLonger = (n: number): string => `${n} table${n === 1 ? '' : 's'} the generator no longer draws ${n === 1 ? 'was' : 'were'}`;
  if (r.deleted.length) parts.push(`${noLonger(r.deleted.length)} deleted, unedited: ${list(r.deleted)}`);
  const REASON: Record<Exclude<KeepReason, 'unrecorded'>, string> = {
    edited: 'edited', moved: 'moved', copied: 'a copy', 'no-collection': 'its collection is not in this file',
    'nothing-drawn': 'nothing was drawn this run', 'not-removable': 'could not be deleted',
  };
  const left = r.kept.filter((k) => k.reason !== 'unrecorded');
  if (left.length) {
    const groups = (Object.keys(REASON) as (keyof typeof REASON)[]).map((why) => [why, left.filter((k) => k.reason === why).map((k) => k.name)] as const).filter(([, ns]) => ns.length);
    parts.push(`${noLonger(left.length)} left in place — ${groups.map(([why, ns]) => `${REASON[why]}: ${list(ns)}`).join('; ')}`);
  }
  const unrecorded = r.kept.filter((k) => k.reason === 'unrecorded').map((k) => k.name);
  if (unrecorded.length) {
    const one = unrecorded.length === 1;
    parts.push(`${noLonger(unrecorded.length)} left in place — drawn before edits were tracked, so the generator never deletes ${one ? 'it' : 'them'}; delete ${one ? 'it' : 'them'} by hand if no longer needed: ${list(unrecorded)}`);
  }
  parts.push(...r.notes, ...r.misses);
  const drawn = made.length + upd.length;
  // A partial run is not a pass: a skipped table is a page the designer expected and does not have, and an
  // unbound swatch is a specimen that does not show its token, so the pill says so and the detail opens on it.
  // Every form fits the 24-char pill at any count below 1000.
  // A table the designer named that no table matches (#1778) is the same: they asked for something not drawn.
  const ok = skipped.length === 0 && r.unbound === 0 && r.unmatched.length === 0;
  const headline = drawn === 0 ? (skipped.length ? '✗ style guide skipped' : r.unmatched.length ? '✗ no table matched' : '✓ style guide: 0 tables')
    : skipped.length ? `⚠ ${drawn} drawn, ${skipped.length} skipped`
    : r.unmatched.length ? `⚠ ${drawn} drawn, ${r.unmatched.length} not found`
    : r.unbound ? `⚠ ${r.unbound} ${r.misses.some((m) => / specimens? (is|are) not bound/.test(m)) ? 'specimens' : 'swatches'} unbound`
    : r.deleted.length ? `✓ ${tables(drawn)}, ${r.deleted.length} deleted` : `✓ style guide: ${tables(drawn)}`;
  return { ok, headline: headline.length > 24 ? (ok ? '✓ style guide written' : '⚠ style guide partial') : headline, summary: parts.join('. ') || 'Nothing to draw: this file has no variables or text styles of the types this run covers' };
};

/**
 * ONE STYLE-GUIDE RUN AT A TIME (#1785). A run yields to the host (#1778), so the panel stays live while it draws,
 * and the panel's button and the agent link's `style-guide` command are two entry points into one file. Two runs
 * meet at their yields: the second's `drawTable` removes the first's grid mid-build, and the first then writes into
 * a grid no longer on the page. The gate holds one run per plugin session; a second request, from either entry
 * point, is REFUSED by name rather than queued, since a queued run would redraw every table the first just drew.
 * `main.ts` makes one gate and routes both entry points through it.
 */
export type StyleGuideEntry = 'panel' | 'agent';

export const createStyleGuideGate = () => {
  let running: StyleGuideEntry | null = null;
  return {
    /** Who started the run in flight, or null. */
    running: (): StyleGuideEntry | null => running,
    /** Run `fn` unless a run is in flight; then return who started that one, and do not run. */
    async run<T>(entry: StyleGuideEntry, fn: () => Promise<T>): Promise<{ ran: true; value: T } | { ran: false; running: StyleGuideEntry }> {
      if (running) return { ran: false, running };
      running = entry;
      try { return { ran: true, value: await fn() }; } finally { running = null; }
    },
  };
};

/** The headline of a refused second run. */
export const STYLE_GUIDE_BUSY = '✗ already drawing';

/** The verdict a refused second run reports: which entry point's run is still drawing, and what to do. */
export const styleGuideBusy = (running: StyleGuideEntry): { ok: false; headline: string; summary: string } => ({
  ok: false,
  headline: STYLE_GUIDE_BUSY,
  summary: `A style guide started from the ${running === 'agent' ? 'agent link' : 'panel'} is still drawing, so this request was not run — two runs at once draw over each other's tables. Run it again once that one reports its result`,
});
