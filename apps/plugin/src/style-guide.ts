/**
 * THE STYLE-GUIDE GENERATOR (#259, phase 1: COLOR) — a table per token group, drawn from the file's own variables.
 *
 * Absorbed as a plugin feature (`docs/09` §4): the tables document the variables a theme write left in THIS
 * file, so they are read from `figma.variables`, not from the engine's emission. The design record for every
 * phase is `docs/45-style-guide-generator.md`; this module is phase 1 — every COLOR variable collection.
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
import { findCellSets, pickVariant, SWATCH_SET, TEXT_CELL_SET } from './style-guide-cells';
import type { CellNode } from './style-guide-cells';

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
}
export interface SgCatalog { collections: readonly SgCollection[]; variables: readonly SgVariable[] }

/** The engine's contrast contract, per mode: `resolveAllModes(theme)` satisfies it structurally. */
export type SgContract = readonly {
  mode: string;
  roles: Record<string, { against: string; min: number; model?: string; legibleFor?: string }>;
}[];

export type { SwatchType, ValueFormat, StyleGuideOptions } from './messages';
import type { SwatchType, StyleGuideOptions, ValueFormat } from './messages';

/** The types this phase documents. Everything else is named in the result as a later phase. */
export const PHASE_TYPES = ['color'] as const;

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
  /** The variable the specimen's ground frame is bound to, or null to draw it on the cell. */
  groundId: string | null;
  /** The measured contrast, or null where the role has no contracted ground. */
  contrast: SgContrast | null;
}

export interface SgRow {
  variableId: string;
  name: string;
  /** The name as the table prints it — the collection's shared prefix removed. */
  token: string;
  description: string;
  display: SwatchType;
  cells: SgCell[];
}

export interface SgTable {
  /** Stable across runs: `color|<collection>|<group path>`. */
  key: string;
  kind: 'primitive' | 'semantic';
  page: string;
  collectionId: string;
  title: string;
  description: string;
  modes: readonly SgMode[];
  columns: string[];
  rows: SgRow[];
}

export interface SgPlan { tables: SgTable[]; notes: string[] }

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
  for (const t of wantTypes) if (!(PHASE_TYPES as readonly string[]).includes(t)) notes.push(`${t}: not in this phase — color only`);
  if (!wantTypes.includes('color')) return { tables: [], notes };

  const ix: Index = {
    byId: new Map(catalog.variables.map((v) => [v.id, v])),
    collections: new Map(catalog.collections.map((c) => [c.id, c])),
  };
  const wantCollections = options.collections?.map((c) => c.toLowerCase());
  const contractByMode = new Map((contract ?? []).map((m) => [m.mode.toLowerCase(), m.roles]));
  const roleKeys = new Set<string>();
  for (const m of contract ?? []) for (const k of Object.keys(m.roles)) roleKeys.add(k);
  if (!contract) notes.push('No saved brand in this file, so the contrast column reads "—" — Apply theme saves one');

  const tables: SgTable[] = [];
  for (const col of catalog.collections) {
    if (wantCollections && !wantCollections.includes(col.name.toLowerCase())) continue;
    const vars = catalog.variables.filter((v) => v.variableCollectionId === col.id && v.resolvedType === 'COLOR');
    if (!vars.length) continue;
    const primitive = vars.every((v) => col.modes.every((m) => aliasId(v.valuesByMode[m.modeId]) === null));
    const prefix = commonPrefix(vars.map((v) => v.name.split('/').slice(0, -1)));
    const display = (v: SgVariable): string => v.name.split('/').slice(prefix.length).join('/');

    // Group: by parent path for a primitive scale, by family for semantic roles. A variable at the prefix
    // itself has no group segment and lands in the base group.
    const groups = new Map<string, SgVariable[]>();
    for (const v of vars) {
      const segs = v.name.split('/');
      const g = primitive ? segs.slice(prefix.length, -1).join('/') : segs.length - prefix.length > 1 ? segs[prefix.length] : '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(v);
    }
    const groupNames = [...groups.keys()];
    for (const g of groupNames) {
      const members = groups.get(g)!;
      // NUMERIC ORDER for a scale (the owner's plugin sorted 10, 11, 112, 12); file order for roles.
      if (primitive) members.sort((a, b) => naturalCompare(display(a), display(b)));
      const title = g === '' ? (groupNames.length === 1 ? sentence(col.name) : `${sentence(col.name)} — base`) : sentence(g.split('/').pop()!);
      const description = primitive
        ? `${members.length} primitive colors in ${col.name} — referenced by the semantic roles, not applied directly`
        : `${members.length} ${g || col.name} roles in ${col.name}, per mode — each measured against the ground it is contracted for`;

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
            const ground = role && role.against !== 'self' ? groundVar(catalog, col, role.against, roleKeys) : null;
            groundId = ground?.id ?? fallbackGround(catalog, col, tailSegs, roleKeys)?.id ?? null;
            if (role && ground && role.min > 0 && value) {
              const gv = resolveColor(ix, ground, groundModeFor(ix, col, ground, m.modeId));
              if (gv) {
                const g255 = to255(gv);
                let ratio: number;
                let ink: string | undefined;
                if (role.model === 'ink-on-composite' && role.legibleFor) {
                  const inkVar = groundVar(catalog, col, role.legibleFor, roleKeys);
                  const iv = inkVar ? resolveColor(ix, inkVar, groundModeFor(ix, col, inkVar, m.modeId)) : null;
                  ratio = iv ? contrast(to255(iv), composite(g255, to255(value), alphaOf(value))) : NaN;
                  ink = inkVar ? display(inkVar) : role.legibleFor;
                } else {
                  const fg = alphaOf(value) < 1 ? composite(g255, to255(value), alphaOf(value)) : to255(value);
                  ratio = contrast(fg, g255);
                }
                if (Number.isFinite(ratio)) c = { ratio, min: role.min, pass: ratio >= role.min, ground: tokenPath(ground, col, prefix), ...(ink ? { ink } : {}) };
              }
            }
          }
          return {
            modeId: m.modeId,
            modeName: m.name,
            value: value ? formatColor(value, format) : '—',
            alias: aliasVar ? aliasVar.name : null,
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
          cells,
        };
      });

      const perMode = col.modes.flatMap((m) => (primitive ? [m.name, 'Value'] : [m.name, 'Value', 'Contrast']));
      tables.push({
        key: `color|${col.name}|${g}`,
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
  return { tables, notes };
};

/** A ground or ink the contract names — a role key (`background.primary`) in this collection first, then a
 *  palette step (`neutral.050`) anywhere, by trailing path, the shortest name winning. */
const groundVar = (catalog: SgCatalog, col: SgCollection, key: string, roleKeys: ReadonlySet<string>): SgVariable | null => {
  const same = catalog.variables.find((v) => v.variableCollectionId === col.id && roleKeyOf(v.name, roleKeys) === key);
  if (same) return same;
  const tail = key.split('.');
  const hits = catalog.variables.filter((v) => {
    const segs = v.name.split('/');
    return segs.length >= tail.length && tail.every((t, i) => segs[segs.length - tail.length + i] === t);
  });
  hits.sort((a, b) => a.name.length - b.name.length);
  return hits[0] ?? null;
};

/**
 * The ground a role with NO contracted ground is drawn on — proposed, owner to confirm (`docs/45`): the page
 * surface, `background.primary`, or `inverse.background.primary` for an inverse role, so inverse ink is
 * never drawn on white. Found by role key when a contract is present, by trailing path otherwise.
 */
const fallbackGround = (catalog: SgCatalog, col: SgCollection, tail: readonly string[], roleKeys: ReadonlySet<string>): SgVariable | null => {
  const want = tail[0] === 'inverse' ? ['inverse', 'background', 'primary'] : ['background', 'primary'];
  const inCol = catalog.variables.filter((v) => v.variableCollectionId === col.id);
  const byKey = inCol.find((v) => roleKeyOf(v.name, roleKeys) === want.join('.'));
  if (byKey) return byKey;
  return inCol.find((v) => {
    const segs = v.name.split('/');
    const tailHere = segs.slice(segs.length - want.length);
    // `background/primary` must not match `inverse/background/primary`.
    return want.every((w, i) => tailHere[i] === w) && (want[0] === 'inverse' || segs[segs.length - want.length - 1] !== 'inverse');
  }) ?? null;
};

/** The mode a ground resolves in: this mode when it shares the collection, its own default otherwise. */
const groundModeFor = (ix: Index, col: SgCollection, v: SgVariable, modeId: string): string =>
  v.variableCollectionId === col.id ? modeId : (defaultMode(ix.collections.get(v.variableCollectionId)) ?? modeId);

const tokenPath = (v: SgVariable, col: SgCollection, prefix: readonly string[]): string =>
  v.variableCollectionId === col.id ? v.name.split('/').slice(prefix.length).join('/') : v.name;

// ── The rerun report ───────────────────────────────────────────────────────────────────────────────
/** What a table held when it was last written: token name → mode name → printed value. */
export type RowsSnapshot = Record<string, Record<string, string>>;

export const snapshotOf = (t: SgTable): RowsSnapshot =>
  Object.fromEntries(t.rows.map((r) => [r.name, Object.fromEntries(r.cells.map((c) => [c.modeName, c.value]))]));

export interface RowsDiff { added: string[]; removed: string[]; changed: string[] }

export const diffRows = (before: RowsSnapshot, after: RowsSnapshot): RowsDiff => ({
  added: Object.keys(after).filter((k) => !(k in before)),
  removed: Object.keys(before).filter((k) => !(k in after)),
  changed: Object.keys(after).filter((k) => k in before && JSON.stringify(before[k]) !== JSON.stringify(after[k])),
});

// ── The executor ───────────────────────────────────────────────────────────────────────────────────
/** The node surface the executor writes: `CellNode` plus plugin data, grid placement, mode pinning and
 *  removal — members a real `FrameNode`/`InstanceNode` has. */
export interface SgNode extends CellNode {
  characters?: unknown;
  explicitVariableModes?: unknown;
  gridRowCount?: unknown;
  gridColumnCount?: unknown;
  gridRowGap?: unknown;
  gridColumnGap?: unknown;
  readonly gridColumnSizes?: readonly { type: string; value?: number }[];
  readonly gridRowSizes?: readonly { type: string; value?: number }[];
  readonly componentProperties?: Record<string, { type?: string; value?: unknown }>;
  appendChildAt?(node: unknown, row: number, column: number): void;
  setPluginData?(key: string, value: string): void;
  getPluginData?(key: string): string;
  setExplicitVariableModeForCollection?(collection: unknown, modeId: string): void;
  setProperties?(props: Record<string, string | boolean>): void;
  remove?(): void;
}

export interface SgPage {
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
  variables: {
    getLocalVariableCollectionsAsync(): Promise<readonly unknown[]>;
    getLocalVariablesAsync(type?: 'COLOR'): Promise<readonly unknown[]>;
    setBoundVariableForPaint(paint: unknown, field: 'color', variable: unknown): unknown;
  };
}

/** One table's outcome. */
export type TableOutcome =
  | { key: string; title: string; page: string; status: 'created'; rows: number }
  | { key: string; title: string; page: string; status: 'updated'; rows: number; diff: RowsDiff }
  | { key: string; title: string; page: string; status: 'skipped'; reason: 'no-page' | 'no-cells' };

export interface StyleGuideResult {
  tables: TableOutcome[];
  /** Tables a previous run wrote whose group no longer exists — left in place, never deleted. */
  stale: string[];
  notes: string[];
  /** Named, recoverable misses: fonts, a header set, a variant approximated, a node with nothing to bind. */
  misses: string[];
}

/** Read the file's collections and variables into the plan's catalog, keeping the host objects by id. */
export const readCatalog = async (vars: StyleGuideApi['variables']): Promise<{ catalog: SgCatalog; collectionById: Map<string, unknown>; variableById: Map<string, unknown> }> => {
  const cols = (await vars.getLocalVariableCollectionsAsync()) as readonly (SgCollection & { id: string })[];
  const vs = (await vars.getLocalVariablesAsync('COLOR')) as readonly SgVariable[];
  const catalog: SgCatalog = {
    collections: cols.map((c) => ({ id: c.id, name: c.name, modes: c.modes.map((m) => ({ modeId: m.modeId, name: m.name })), defaultModeId: c.defaultModeId })),
    variables: vs.map((v) => ({ id: v.id, name: v.name, variableCollectionId: v.variableCollectionId, resolvedType: v.resolvedType, description: v.description, valuesByMode: v.valuesByMode })),
  };
  return { catalog, collectionById: new Map(cols.map((c) => [c.id, c])), variableById: new Map(vs.map((v) => [v.id, v])) };
};

const fontKeyOf = (f: { family: string; style: string }): string => `${f.family} ${f.style}`;
const PLACEHOLDER_PAINT = { type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 0, g: 0, b: 0 } };
const WHITE = [{ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 1, g: 1, b: 1 } }];
const TABLE_GAP = 160;
const PART_KEY = 'prism3-style-guide-part';

/** Run the plan into the file. Never throws for a missing optional piece; the host throwing is the caller's. */
export const runStyleGuide = async (api: StyleGuideApi, contract: SgContract | null, options: StyleGuideOptions = {}): Promise<StyleGuideResult> => {
  await api.loadAllPagesAsync();
  const { catalog, collectionById, variableById } = await readCatalog(api.variables);
  const plan = planStyleGuide(catalog, contract, options);
  const misses: string[] = [];
  const out: TableOutcome[] = [];
  const skip = (t: SgTable, reason: 'no-page' | 'no-cells'): void => { out.push({ key: t.key, title: t.title, page: t.page, status: 'skipped', reason }); };

  const sets = findCellSets(api.root);
  const swatches = sets[SWATCH_SET] as SgNode | undefined;
  const textCells = sets[TEXT_CELL_SET] as SgNode | undefined;
  if (!swatches || !textCells) {
    for (const t of plan.tables) skip(t, 'no-cells');
    return { tables: out, stale: [], notes: plan.notes, misses };
  }
  const allSets = api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly SgNode[];
  const headerSet = allSets.find((n) => n.name === SECTION_HEADER_SET) ?? allSets.find((n) => isTemplateSet(n.name, SECTION_HEADER_SET));
  const headerVariant = headerSet?.children?.find((c) => c.name === HEADER_VARIANT) as SgNode | undefined;
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
  const writeText = async (n: SgNode | null | undefined, text: string): Promise<void> => {
    if (!n) return;
    if (await ensureFont(n.fontName)) n.characters = text;
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

  const textCell = async (type: 'default' | 'header' | 'value alias', color: string, text: string, alias?: string | null): Promise<SgNode | null> => {
    const v = variantOf(textCells, { type, color, textalign: 'left', padding: 'default' }, `type=${type}, color=${color}`);
    if (!v?.createInstance) return null;
    const inst = v.createInstance() as SgNode;
    const texts = textNodes(inst);
    const main = byName(inst, 'Text') ?? texts[0];
    await writeText(main, text);
    if (type === 'value alias') await writeText(byName(inst, 'Alias') ?? texts.filter((t) => t !== main).pop(), alias ?? '');
    return inst;
  };

  // The specimen: a ground frame bound to the ground variable (or plain white), the swatch inside it bound to
  // the token, and BOTH pinned to the column's mode so the binding resolves in that mode, live.
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
    const v = variantOf(swatches, { type: row.display }, `type=${row.display}`);
    if (v?.createInstance) {
      const inst = v.createInstance() as SgNode;
      const target = bindTarget(inst, row.display);
      const variable = variableById.get(row.variableId);
      if (target && variable) {
        const paint = api.variables.setBoundVariableForPaint(PLACEHOLDER_PAINT, 'color', variable);
        if (row.display === 'border') target.strokes = [paint];
        else target.fills = [paint];
      } else misses.push(`${row.token}: the ${String(v.name)} swatch has no node to bind`);
      inst.setExplicitVariableModeForCollection?.(collection, cell.modeId);
      ground.appendChild?.(inst);
    }
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
  for (const t of plan.tables) {
    const page = pages.get(t.page);
    if (!page) { skip(t, 'no-page'); continue; }
    const collection = collectionById.get(t.collectionId);

    let wrap = framesOn(page).find((n) => n.getPluginData?.(TABLE_KEY) === t.key) ?? null;
    const created = !wrap;
    if (!wrap) {
      wrap = api.createFrame();
      wrap.name = `Style guide — ${t.title}`;
      wrap.layoutMode = 'VERTICAL';
      wrap.primaryAxisSizingMode = 'AUTO';
      wrap.counterAxisSizingMode = 'AUTO';
      wrap.itemSpacing = 40;
      wrap.fills = [];
      wrap.setPluginData?.(TABLE_KEY, t.key);
      page.appendChild(wrap);
      const at = anchor(page);
      wrap.x = at.x;
      wrap.y = at.y;
      if (headerVariant?.createInstance) {
        const h = headerVariant.createInstance() as SgNode;
        const descKey = Object.keys(h.componentProperties ?? {}).find((k) => k === 'Description' || k.startsWith('Description#'));
        if (descKey) h.setProperties?.({ [descKey]: true });
        await writeText(byName(h, 'Title'), t.title);
        await writeText(byName(h, 'Description'), t.description);
        h.setPluginData?.(PART_KEY, 'header');
        wrap.appendChild?.(h);
      }
    }

    // The grid is rebuilt every run: the values are static text, refreshed here.
    for (const c of (wrap.children ?? []) as SgNode[]) if (c.getPluginData?.(PART_KEY) === 'table') c.remove?.();
    const grid = api.createFrame();
    grid.name = 'Table';
    grid.fills = [];
    grid.setPluginData?.(PART_KEY, 'table');
    grid.layoutMode = 'GRID';
    grid.gridRowCount = t.rows.length + 1;
    grid.gridColumnCount = t.columns.length;
    grid.gridRowGap = 0;
    grid.gridColumnGap = 0;
    for (const s of grid.gridColumnSizes ?? []) s.type = 'HUG';
    for (const s of grid.gridRowSizes ?? []) s.type = 'HUG';
    grid.layoutSizingHorizontal = 'HUG';
    grid.layoutSizingVertical = 'HUG';
    wrap.appendChild?.(grid);

    const place = (n: SgNode | null, r: number, c: number): void => { if (n) grid.appendChildAt?.(n, r, c); };
    for (let c = 0; c < t.columns.length; c++) place(await textCell('header', headerColor, t.columns[c]), 0, c);
    for (let r = 0; r < t.rows.length; r++) {
      const row = t.rows[r];
      let c = 0;
      place(await textCell('default', 'white', row.token), r + 1, c++);
      for (const cell of row.cells) {
        place(specimen(row, cell, collection), r + 1, c++);
        const chip = options.aliases !== false && cell.alias;
        place(await textCell(chip ? 'value alias' : 'default', 'white', cell.value, cell.alias), r + 1, c++);
        if (t.kind === 'semantic') place(await textCell('default', 'white', contrastText(cell.contrast)), r + 1, c++);
      }
      if (options.description !== false) place(await textCell('default', 'white', row.description || '—'), r + 1, c++);
    }

    const after = snapshotOf(t);
    const before = (() => { try { return JSON.parse(wrap.getPluginData?.(ROWS_KEY) || '{}') as RowsSnapshot; } catch { return {}; } })();
    wrap.setPluginData?.(ROWS_KEY, JSON.stringify(after));
    out.push(created
      ? { key: t.key, title: t.title, page: t.page, status: 'created', rows: t.rows.length }
      : { key: t.key, title: t.title, page: t.page, status: 'updated', rows: t.rows.length, diff: diffRows(before, after) });
    if (created) anchor(page).y += (wrap.height ?? 0) + TABLE_GAP;
  }

  // A table from an earlier run whose group is gone: named, never deleted.
  const planned = new Set(plan.tables.map((t) => t.key));
  const stale: string[] = [];
  for (const p of api.root.children) for (const f of framesOn(p)) {
    const k = f.getPluginData?.(TABLE_KEY);
    if (k && k.startsWith('color|') && !planned.has(k) && !(options.collections && !options.collections.some((c) => k.split('|')[1]?.toLowerCase() === c.toLowerCase()))) stale.push(String(f.name));
  }
  return { tables: out, stale, notes: plan.notes, misses };
};

/**
 * The node a swatch instance binds — `Specimen` by name, in any case; otherwise, for an adopted set with its
 * own names, the first text node (text), the first stroked node (border) or the first filled node (the rest).
 */
export const bindTarget = (inst: SgNode, display: SwatchType): SgNode | null => {
  const named = inst.findOne?.((n) => typeof n.name === 'string' && n.name.toLowerCase() === 'specimen') as SgNode | null | undefined;
  if (named) return named;
  const has = (p: unknown): boolean => Array.isArray(p) && p.length > 0;
  const pred = display === 'text' ? (n: CellNode) => n.type === 'TEXT'
    : display === 'border' ? (n: CellNode) => n.type !== 'TEXT' && has(n.strokes)
    : (n: CellNode) => n.type !== 'TEXT' && n.name !== 'Checker' && n.name !== 'Check' && has(n.fills);
  return (inst.findOne?.(pred) as SgNode | null | undefined) ?? null;
};

/** The verdict line for the panel and the agent result. */
export const styleGuideSummary = (r: StyleGuideResult): { ok: boolean; headline: string; summary: string } => {
  const made = r.tables.filter((t) => t.status === 'created');
  const upd = r.tables.filter((t): t is Extract<TableOutcome, { status: 'updated' }> => t.status === 'updated');
  const skipped = r.tables.filter((t): t is Extract<TableOutcome, { status: 'skipped' }> => t.status === 'skipped');
  const parts: string[] = [];
  if (made.length) parts.push(`${made.length} tables created (${made.slice(0, 3).map((t) => t.title).join(', ')}${made.length > 3 ? '…' : ''})`);
  if (upd.length) {
    const changes = upd.flatMap((t) => {
      const d = t.diff;
      const bits = [d.added.length && `${d.added.length} added`, d.removed.length && `${d.removed.length} removed`, d.changed.length && `${d.changed.length} changed`].filter(Boolean);
      return bits.length ? [`${t.title}: ${bits.join(', ')}`] : [];
    });
    parts.push(`${upd.length} tables updated in place — ${changes.length ? changes.join('; ') : 'no token changes'}`);
  }
  const noCells = skipped.filter((t) => t.reason === 'no-cells');
  if (noCells.length) parts.push(`${noCells.length} tables skipped — this file has no style-guide cell sets, and Set up file adds them`);
  const noPage = [...new Set(skipped.filter((t) => t.reason === 'no-page').map((t) => t.page))];
  for (const p of noPage) parts.push(`${skipped.filter((t) => t.page === p).length} tables skipped — this file has no ${p} page, and Set up file adds it`);
  if (r.stale.length) parts.push(`${r.stale.length} earlier tables match no tokens and were left in place (${r.stale.slice(0, 3).join(', ')})`);
  parts.push(...r.notes, ...r.misses);
  const drawn = made.length + upd.length;
  // A partial run is not a pass: a skipped table is a page the designer expected and does not have, so the
  // pill says so and the detail opens on it. Every form fits the 24-char pill at any count below 1000.
  const ok = skipped.length === 0;
  const headline = drawn === 0 ? (skipped.length ? '✗ style guide skipped' : '✓ style guide: 0 tables')
    : skipped.length ? `⚠ ${drawn} drawn, ${skipped.length} skipped` : `✓ style guide: ${drawn} tables`;
  return { ok, headline: headline.length > 24 ? (ok ? '✓ style guide written' : '⚠ style guide partial') : headline, summary: parts.join('. ') || 'No color variables in this file' };
};
