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
  /** The value independent of the print format — the first alias hop's id and the resolved RGBA — so the
   *  rerun report compares what the token holds, not how the table prints it. */
  raw: string;
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
  // Every variable some other variable aliases, in any mode — the fact a primitive table's header states.
  const referenced = new Set<string>();
  for (const v of catalog.variables) for (const val of Object.values(v.valuesByMode)) { const a = aliasId(val); if (a) referenced.add(a); }

  const tables: SgTable[] = [];
  for (const col of catalog.collections) {
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
  readonly gridRowSizes?: readonly { type: string; value?: number }[];
  readonly componentProperties?: Record<string, { type?: string; value?: unknown }>;
  appendChildAt?(node: unknown, row: number, column: number): void;
  setPluginData?(key: string, value: string): void;
  getPluginData?(key: string): string;
  setExplicitVariableModeForCollection?(collection: unknown, modeId: string): void;
  setProperties?(props: Record<string, string | boolean>): void;
  getStyledTextSegments?(fields: ['fontName']): readonly { fontName: unknown }[];
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
  /** Tables a previous run wrote for a group this run splits into narrower ones (one per root and family, where
   *  an earlier build drew one per root) — left in place, never deleted, and named apart from `stale`. */
  replaced: string[];
  /** Swatches drawn with nothing bound: the member has no node that carries a fill (or, for border, a stroke). */
  unbound: number;
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
/** The header text a run wrote, so the next run can tell its own words from a designer's. */
const TITLE_KEY = 'prism3-style-guide-title';
const DESC_KEY = 'prism3-style-guide-description';
/** Where the generator last put a table, `x,y` — a table no longer there was moved by a designer. */
const AT_KEY = 'prism3-style-guide-at';
/** The widest a description column grows, in px, padding included — the only text that wraps. */
export const DESC_WRAP = 360;

const AUTO_LAYOUT = new Set(['HORIZONTAL', 'VERTICAL']);
/** Set a node's horizontal sizing where the host allows it: HUG and FILL throw on a node outside auto layout. */
const sizing = (n: SgNode, v: 'HUG' | 'FILL' | 'FIXED'): boolean => {
  try { n.layoutSizingHorizontal = v; return true; } catch { return false; }
};
const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
const near = (a: number, b: number): boolean => Math.abs(a - b) < 0.5;
/** Give a cell its column's width, keeping its height hugging its content. */
const setWidth = (n: SgNode, w: number): void => {
  sizing(n, 'FIXED');
  n.resize?.(w, n.height ?? 0);
  try { n.layoutSizingVertical = 'HUG'; } catch { /* a root outside auto layout keeps its height */ }
};

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
    return { tables: out, stale: [], replaced: [], unbound: 0, notes: plan.notes, misses };
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
  // Nothing wraps here: a width set before the grid's columns are sized is a guess (see the grid below).
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
  const wrapTo = (t: SgNode, w: number): void => {
    sizing(t, 'FIXED');
    t.textAutoResize = 'HEIGHT';
    t.resize?.(w, t.height ?? 20);
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

  // The specimen: a ground frame bound to the ground variable (or plain white), the swatch inside it bound to
  // the token, and BOTH pinned to the column's mode so the binding resolves in that mode, live.
  const unboundIn = new Map<string, number>();
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
      } else unboundIn.set(String(v.name), (unboundIn.get(String(v.name)) ?? 0) + 1);
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
  const drawnOn = new Set<SgPage>();
  for (const t of plan.tables) {
    const page = pages.get(t.page);
    if (!page) { skip(t, 'no-page'); continue; }
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

    const placed: { n: SgNode; r: number; c: number }[] = [];
    const place = (n: SgNode | null, r: number, c: number): void => { if (n) { grid.appendChildAt?.(n, r, c); placed.push({ n, r, c }); } };
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
    // COLUMNS FROM CONTENT, THEN TEXT FROM COLUMNS (live, 2026-09-28: a text switched to HEIGHT before its column
    // was sized kept a 29px width — one word a line, 430px rows — and a mode header wrapped inside a 115px cell).
    // Every cell was measured hugging its words above; each column is fixed from those measures; only then is a
    // cell given its column's width, and a text that does not fit wrapped to the column less whatever else its cell
    // holds. A column is its widest cell — so a swatch column is the wider of the specimen and its header, and a
    // mode name never wraps — and the description column stops at `DESC_WRAP`.
    const natural = placed.map((p) => p.n.width ?? 0);
    const widths = t.columns.map(() => 0);
    placed.forEach((p, i) => { widths[p.c] = Math.max(widths[p.c], natural[i]); });
    if (options.description !== false) widths[t.columns.length - 1] = Math.min(widths[t.columns.length - 1], DESC_WRAP);
    try { grid.gridColumnSizes = widths.map((value) => ({ type: 'FIXED', value })); }
    catch { (grid.gridColumnSizes ?? []).forEach((s, c) => { s.type = 'FIXED'; s.value = widths[c]; }); }
    placed.forEach((p, i) => {
      const col = widths[p.c];
      setWidth(p.n, col);
      if (natural[i] <= col) return;
      const texts = textNodes(p.n);
      const main = byName(p.n, 'Text') ?? texts[0];
      if (main) wrapTo(main, Math.max(1, col - (natural[i] - (main.width ?? 0))));
    });
    // Read back: a grid that did not keep its tracks is named, so a live run shows it rather than a misdrawn table.
    const kept = grid.gridColumnSizes ?? [];
    if (kept.length !== widths.length || kept.some((s, c) => s.type !== 'FIXED' || !near(Number(s.value), widths[c]))) {
      misses.push(`${t.title}: the grid did not keep its column widths, so its cells may not line up`);
    }

    const after = snapshotOf(t);
    const before = (() => { try { return JSON.parse(wrap.getPluginData?.(ROWS_KEY) || '{}') as RowsSnapshot; } catch { return {}; } })();
    wrap.setPluginData?.(ROWS_KEY, JSON.stringify(after));
    out.push(created
      ? { key: t.key, title: t.title, page: t.page, status: 'created', rows: t.rows.length }
      : { key: t.key, title: t.title, page: t.page, status: 'updated', rows: t.rows.length, diff: diffRows(before, after) });
    if (created) anchor(page).y += (wrap.height ?? 0) + TABLE_GAP;
    drawnOn.add(page);
  }

  // RE-STACK (live, 2026-09-28: "Primary — nbds" grew on a rerun to span y 1,013 → ~10,400 and ran over
  // "Neutral — nbds", still at 3,585). The generator's own tables on each page it drew on are re-flowed in their
  // order down the page, TABLE_GAP apart, from the topmost. A table is where the generator left it while it sits at
  // the position recorded then; one that does not was moved by a designer and is left alone. A table from before the
  // record has none, and is taken as the generator's while it keeps the stack's x.
  const recordOf = (n: SgNode): { x: number; y: number } | null => {
    const s = n.getPluginData?.(AT_KEY) || '';
    const [x, y] = s.split(',').map(Number);
    return s && Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  };
  const byY = (a: SgNode, b: SgNode): number => num(a.y) - num(b.y);
  for (const p of drawnOn) {
    const ours = (p.children as readonly SgNode[]).filter((n) => n.type === 'FRAME' && !!n.getPluginData?.(TABLE_KEY));
    const left = ours.filter((n) => { const a = recordOf(n); return !!a && near(num(n.x), a.x) && near(num(n.y), a.y); });
    const unrecorded = ours.filter((n) => !recordOf(n));
    const lead = [...left].sort(byY)[0] ?? [...unrecorded].sort(byY)[0];
    if (!lead) continue;
    const x = num(lead.x);
    const stack = [...left, ...unrecorded.filter((n) => near(num(n.x), x))].sort(byY);
    if (!stack.length) continue;
    let y = num(stack[0].y);
    for (const n of stack) {
      n.x = x;
      n.y = y;
      n.setPluginData?.(AT_KEY, `${x},${y}`);
      y += (n.height ?? 0) + TABLE_GAP;
    }
  }

  // A table from an earlier run whose group is gone: named, never deleted. Only tables this run could have
  // drawn are candidates — its types, and its collections (by ID, the key's second field) when filtered.
  const planned = new Set(plan.tables.map((t) => t.key));
  const types = new Set((options.types ?? [...PHASE_TYPES]).map((t) => t.toLowerCase()));
  const wantIds = options.collections ? new Set(catalog.collections.filter((c) => options.collections!.some((w) => w.toLowerCase() === c.name.toLowerCase())).map((c) => c.id)) : null;
  const stale: string[] = [];
  const replaced: string[] = [];
  for (const p of api.root.children) for (const f of framesOn(p)) {
    const k = f.getPluginData?.(TABLE_KEY);
    if (!k || planned.has(k)) continue;
    const [type, colId] = k.split('|');
    if (!types.has(type) || (wantIds && !wantIds.has(colId))) continue;
    // A key that is an ANCESTOR of a planned one is a table this run now draws as narrower tables — an earlier
    // build drew one table per root where a collection holds two (`…|nbds` → `…|nbds/color/text`).
    if ([...planned].some((q) => q.startsWith(`${k}/`))) replaced.push(String(f.name));
    else stale.push(String(f.name));
  }
  const unbound = [...unboundIn.values()].reduce((a, b) => a + b, 0);
  for (const [variant, n] of unboundIn) misses.push(`${n} ${n === 1 ? 'swatch' : 'swatches'} in ${variant} have no layer that takes a fill, so they show the component's own color`);
  return { tables: out, stale, replaced, unbound, notes: plan.notes, misses };
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
  if (made.length) parts.push(`${made.length} tables created (${made.slice(0, 3).map((t) => t.title).join(', ')}${made.length > 3 ? '…' : ''})`);
  if (upd.length) {
    const changes = upd.flatMap((t) => {
      const d = t.diff;
      const bits = [d.added.length && `${d.added.length} added`, d.removed.length && `${d.removed.length} removed`, d.changed.length && `${d.changed.length} changed`, d.renamed.length && `${d.renamed.length} renamed`].filter(Boolean);
      return bits.length ? [`${t.title}: ${bits.join(', ')}`] : [];
    });
    parts.push(`${upd.length} tables updated in place — ${changes.length ? changes.join('; ') : 'no token changes'}`);
  }
  const noCells = skipped.filter((t) => t.reason === 'no-cells');
  if (noCells.length) parts.push(`${noCells.length} tables skipped — this file has no style-guide cell sets, and Set up file adds them`);
  const noPage = [...new Set(skipped.filter((t) => t.reason === 'no-page').map((t) => t.page))];
  for (const p of noPage) parts.push(`${skipped.filter((t) => t.page === p).length} tables skipped — this file has no ${p} page, and Set up file adds it`);
  if (r.stale.length) parts.push(`${r.stale.length} earlier tables match no tokens and were left in place (${r.stale.slice(0, 3).join(', ')})`);
  if (r.replaced.length) parts.push(`${r.replaced.length} earlier tables are now drawn as one table per family and were left in place (${r.replaced.slice(0, 3).join(', ')}${r.replaced.length > 3 ? '…' : ''})`);
  parts.push(...r.notes, ...r.misses);
  const drawn = made.length + upd.length;
  // A partial run is not a pass: a skipped table is a page the designer expected and does not have, and an
  // unbound swatch is a specimen that does not show its token, so the pill says so and the detail opens on it.
  // Every form fits the 24-char pill at any count below 1000.
  const ok = skipped.length === 0 && r.unbound === 0;
  const headline = drawn === 0 ? (skipped.length ? '✗ style guide skipped' : '✓ style guide: 0 tables')
    : skipped.length ? `⚠ ${drawn} drawn, ${skipped.length} skipped`
    : r.unbound ? `⚠ ${r.unbound} swatches unbound` : `✓ style guide: ${drawn} tables`;
  return { ok, headline: headline.length > 24 ? (ok ? '✓ style guide written' : '⚠ style guide partial') : headline, summary: parts.join('. ') || 'No color variables in this file' };
};
