/**
 * CONFORMANCE SCAN — THE NORMALIZED STATE, and the ONE set of key builders both sides use (#1553 P1).
 *
 * `expected.ts` builds a `State` from the engine; a read-only Figma console snippet (README) builds a
 * `State` from the live file; `diff.ts` compares them. This module exists so those two producers
 * cannot key on different coordinates — the same reason `tools/binding-audit/ledger.ts` holds one
 * ledger builder for `--ledger` and `--reconcile`. A join key computed two ways is a diff that
 * reports drift where there is none, which is not a louder gate but a *useless* one: #1511's
 * reconciler compares the plan's root-less variable names against a live file's `<root>/`-prefixed
 * ones and reports every one of ~5.4k correct bindings as WRONG-TOKEN. That defect is the reason this
 * file is a file.
 *
 * ── WHY `side` IS ON THE WIRE ───────────────────────────────────────────────────────────────────
 *
 * `State.side` is `'expected' | 'actual'`, and `diff.ts` refuses a pair that does not read
 * expected-then-actual. Both sides are the same SHAPE on purpose — that is what "normalize BOTH sides
 * identically" buys — which means a transposed argument pair would otherwise diff cleanly in the
 * mirror direction and read as a pass. The label is the only thing that can catch it.
 *
 * ── STYLE DEFINITIONS, AND THE TWO THINGS THEY ARE NOT ──────────────────────────────────────────
 *
 * Style INTERIORS are here — `StyleDef`, keyed by `styleKey`. The engine emits all four Figma style
 * kinds under `out/figma/<brand>/{text,shadow,grid,gradient}-styles.json` and the plugin writes all
 * four through their four separate APIs (`createTextStyle` / `createEffectStyle` / `createGridStyle` /
 * `createPaintStyle`), so a text style's size and line height, and a shadow's offset and blur, are
 * checkable claims about a live file. P1 stated this as a gap; closing it adds the NINTH diff category
 * and nothing else — `StyleDef` deliberately does not touch the variable or binding tables, so
 * `mode-coverage` and `scope-type` still report only on the surface they could always see.
 *
 * Two things a `StyleDef` is NOT:
 *
 *   1. It is NOT a node's BINDING to a style. That is `BindState.boundStyle` and it already existed:
 *      "this member's label points at `body/md/default`" is a claim about a NODE. "`body/md/default`
 *      is 16px/150%" is a claim about the STYLE. A file can get either right and the other wrong, so
 *      they are separate keys, separate arms and separate categories.
 *   2. It is NOT gradient GEOMETRY. The emission carries `angle` (linear) or `center`/`shape`
 *      (radial); Figma carries the 2×3 `gradientTransform` matrix `write-styles.ts` computes FROM
 *      those. Comparing the two means re-deriving that matrix here, which is a second implementation
 *      of a writer — so the gradient arm compares `paintType` and the stops, and the geometry stays a
 *      stated gap in the README. A `sampledStops`/`interpolation`/`a11y` block is engine-side only and
 *      never reaches Figma at all, so it is not a gap; it is not a claim about a file.
 */

export const FORMAT = 'prism3-conformance' as const;
/**
 * Bumped only when an OLD state can no longer be read, and `styles` / `libraryConsumed` did not do that
 * — both are optional, and their absence is reported as a named blind spot rather than mistaken for a
 * clean surface (see `State.styles`). A state written by the previous reader therefore still diffs, and
 * says which arm it cannot feed. Bumping would have failed those files at the door to buy nothing.
 */
export const VERSION = 1 as const;

/** A variable's value in ONE mode: either an alias to another variable, or a concrete value.
 *  `alias` carries the target's NAME, never its `VariableID:*` — ids are per-file and would make the
 *  expected side unwritable. */
export type ModeValue =
  | { kind: 'alias'; target: string }
  | { kind: 'value'; value: string };

export type VarState = {
  collection: string;
  /** Figma's own vocabulary — `COLOR` | `FLOAT` | `STRING` | `BOOLEAN`. */
  resolvedType: string;
  /** SORTED, because Figma's order is not the emitter's and an order difference is not a defect. */
  scopes: string[];
  modes: Record<string, ModeValue>;
};

/**
 * What a bindable property on a projected node actually carries.
 *
 *   `boundVariable` — bound to a Figma VARIABLE by name. The `bound` and `paints` plan namespaces.
 *   `boundStyle`    — bound to a Figma STYLE by name. The `textStyle` and `effectStyle` namespaces,
 *                     which are a different API (`setTextStyleIdAsync` / `setEffectStyleIdAsync`) and a
 *                     different name space, and are kept a distinct variant here for the same reason
 *                     `anatomy-figma.ts` gives them their own plan fields: a style compared as though
 *                     it were a variable is a finding about nothing. Carried rather than dropped
 *                     because ~1.4k projected nodes bind a text style and a member whose label lost
 *                     its style is exactly the drift this harness exists to find.
 *   `rawLiteral`    — a raw value where a binding was expected (#1387). Category (a).
 *   `absent`        — the property carries nothing at all.
 */
export type BindState =
  | { boundVariable: string }
  | { boundStyle: string }
  | { rawLiteral: string }
  | { absent: true };

/** The kind of thing a `BindState` names, for a report line that must not compare across namespaces. */
export const bindKindOf = (b: BindState): 'variable' | 'style' | 'literal' | 'absent' =>
  'boundVariable' in b ? 'variable' : 'boundStyle' in b ? 'style' : 'rawLiteral' in b ? 'literal' : 'absent';

/** What a `BindState` names, for a report line. */
export const bindTargetOf = (b: BindState): string =>
  'boundVariable' in b ? b.boundVariable
  : 'boundStyle' in b ? b.boundStyle
  : 'rawLiteral' in b ? b.rawLiteral
  : '(nothing)';

export type CompState = {
  /** Member coordinate strings, SORTED. For an `emitAsComponents` def these are the standalone
   *  component names (`icon/arrow-down`), not variant coordinates — see `emitAs`. */
  members: string[];
  /** Variant property names as they land in Figma, SORTED. Empty for `emitAsComponents`. */
  axes: string[];
  /** `'set'` — one COMPONENT_SET with variant members. `'components'` — separate top-level
   *  `<id>/<value>` components and NO set (#1012, the `icon` def). Carried because the two are
   *  different files on the page and a structure arm that assumed `set` would report every one of a
   *  43-icon library as a missing member. */
  emitAs: 'set' | 'components';
};

// ── STYLE DEFINITIONS ───────────────────────────────────────────────────────────────────────────

/**
 * The four Figma style kinds, each a separate API on both sides — `getLocalTextStylesAsync` and friends on
 * the read, `createTextStyle` and friends in `apps/plugin/src/write-*-styles.ts`. Part of the join key, so
 * a text style and an effect style that share a name are two records and not one.
 *
 * `paint` is named for Figma's API and not for the engine's `gradient-styles.json`, even though a gradient
 * is the only paint style the engine emits. A brand file's own SOLID paint styles come back from the same
 * `getLocalPaintStylesAsync` call, and a `gradient` kind would force the read to either skip them — a
 * suppression with no count, which this harness does not do — or file them under a name that is not what
 * they are. Under `paint` they are simply styles the engine does not emit, which arm (i) already reports.
 */
export type StyleKind = 'text' | 'effect' | 'grid' | 'paint';

export const STYLE_KINDS: readonly StyleKind[] = ['text', 'effect', 'grid', 'paint'] as const;

/**
 * One property inside a style, in the SAME two shapes `ModeValue` uses, and for the same reason.
 *
 * A text style's `fontSize` is usually BOUND to a variable (`ads/font-fluid/display/xl/strong`) rather
 * than set to a number, and a Figma `TextStyle` carries both `fontSize` (the resolved number) and
 * `boundVariables.fontSize` (the link). Flattening those to one number would make an unbound literal
 * indistinguishable from a correctly bound variable that happens to resolve to the same value today —
 * which is #1387 at the style interior, and the exact thing the `BindState` kind split exists to keep
 * apart. So the distinction is on the wire and the diff reports the three shapes separately: bound to
 * the wrong variable, drifted in value, and unbound where the engine binds.
 */
export type StyleProp =
  | { kind: 'variable'; name: string }
  | { kind: 'value'; value: string };

/**
 * One style's INTERIOR, flattened to named properties so the diff compares field by field.
 *
 * FLAT and not nested, because an effect style holds an ARRAY of effects and a grid style an array of
 * layout grids: `effects[0].offset.y` is a property name here, and `effects.length` is one too. That
 * keeps one finding per drifted field ("this shadow's y moved") instead of one opaque finding per style
 * ("the effects array differs"), and it keeps the arm's comparison a plain string compare over a key set
 * rather than a recursive structural diff whose own correctness would need proving.
 *
 * Both producers build `props` through the `canon*` functions below, so a float or a color that took a
 * different code path to get here still lands on one spelling.
 */
export type StyleDef = {
  kind: StyleKind;
  /** The style's name as it lands in the file (`body/md/default`, `shadow/xs`, `Grid / xs`). NOT
   *  root-prefixed and NOT materialization-renamed — `materialization-renames.ts` rewrites variable
   *  names only, so a style name is already what Figma carries. */
  name: string;
  props: Record<string, StyleProp>;
};

/** One row of the engine's contrast contract, in the form `diff.ts` can RE-MEASURE from actual colors.
 *  Mirrors `packages/engine/modes.ts` `ResolvedRole` — the same two models `lint-ratio-truth.ts`
 *  dispatches on, because the recomputation has to be the engine's own or it is measuring something
 *  else. */
export type ContrastContract = {
  mode: string;
  /** Dotted role key (`text.primary`) — the identity a finding is reported under. */
  role: string;
  /** The variable name that role lands on (`ads/color/text/primary`), so the actual side is a lookup
   *  rather than a second name derivation. */
  roleVariable: string;
  /** The ground the ratio is measured against — a role key, or a palette step (`neutral.050`). */
  against: string;
  againstVariable: string;
  min: number;
  model: 'ink-on-surface' | 'ink-on-composite';
  /** `ink-on-composite` only: the ink whose legibility over the composited wash is the contract. */
  legibleFor?: string;
  legibleForVariable?: string;
  alpha?: number;
  /** What the engine measured for this pair on ITS OWN colors. Reported alongside the re-measured
   *  actual ratio so a failure separates "the file drifted" from "the engine ships a near-miss". */
  engineRatio: number;
};

export type State = {
  format: typeof FORMAT;
  version: typeof VERSION;
  side: 'expected' | 'actual';
  /** Expected: the brand id whose emission was read. Actual: the Figma file name, for the record. */
  from: string;
  /** The single leading name segment every variable carries (`ads`). Derived, never assumed — see
   *  `rootOf`. */
  root: string;
  /** Expected: `ENGINE_VERSION`. Actual: the version read off a member's `memberStamp` shared plugin
   *  data. `null` when the file carries no stamp at all (a paste-path build, or a hand-made file). */
  engineVersion: string | null;
  collections: Record<string, { modes: string[] }>;
  variables: Record<string, VarState>;
  /** Keyed by `bindKey(component, member, node, property)`. */
  bindings: Record<string, BindState>;
  structure: Record<string, CompState>;
  /**
   * Style INTERIORS, keyed by `styleKey(kind, name)`.
   *
   * OPTIONAL, and the optionality is the whole safety of adding it: a reader that did not enumerate
   * styles leaves it absent, and the style-definition arm then reports a named blind spot instead of
   * calling all 60 emitted styles missing. `{}` is a different claim from absent — it means "styles were
   * enumerated and the file has none", which IS 60 findings. Same distinction `instanceNodes` draws, and
   * the reason neither is defaulted.
   *
   * LOCAL styles only. A style consumed from a published library is not comparable — its interior lives
   * in the library file, not this one — so it goes in `libraryConsumed.styles` and never here. Putting a
   * remote style here with the fields a read could not see would be a comparison against invented data.
   */
  styles?: Record<string, StyleDef>;
  /**
   * ACTUAL side only: what this file CONSUMES from a published library rather than authoring itself.
   *
   * Every read is a `getLocal*Async` read, because those are the only APIs that enumerate a file's own
   * variables and styles. A team whose file consumes the engine's published library therefore has a
   * file where the engine's variables are all real, all correct, all in use — and all absent from every
   * local enumeration. Without this field the structure arm reports each one as "the engine emits this
   * variable and the file does not have it", which is false, and false at the volume of the whole token
   * layer: the #1511 shape again, a join that misses a whole namespace and reports the miss as drift.
   *
   * So a name here is neither a structure absence nor a value finding. It is out of this file's
   * AUTHORSHIP: nothing in this document can be wrong about it, and the library that publishes it is
   * where a conformance scan of it belongs. The diff suppresses those names and COUNTS them, the same
   * treatment (and for the same reason) as bindings inherited through an instance.
   *
   * A name in BOTH this list and the local table is LOCAL — the local record is comparable, so it is
   * compared. The suppression only ever applies where the local lookup already missed.
   *
   * Absent means the read did not distinguish library from local. The diff then reports a
   * library-consumed variable as absent, which is noisy but never an assumption that a missing variable
   * is somebody else's.
   */
  libraryConsumed?: {
    collections?: string[];
    variables?: string[];
    /** `styleKey(kind, name)`s, so the list is keyed exactly as `styles` is. */
    styles?: string[];
  };
  /** Expected side only — the engine declares the contract, a Figma file does not carry one. Empty
   *  array on the actual side. */
  contrast: ContrastContract[];
  /**
   * ACTUAL side only: what the read actually covered, when it covered less than the whole file.
   *
   * A full component read is ~32k node-properties across 2,181 members, which does not come back
   * through one console call. So a real run is scoped, and the scope has to be ON THE WIRE rather
   * than held in the operator's head: without it a read of 2 components diffs as 20 missing
   * components and ~30k missing bindings, and the 22 real findings are lost in 30,000 phantoms.
   *
   * `components` — only these component ids were read. `diff.ts` compares only these and says so at
   * the top of the report. Absent means "the whole file was read", and the 20 missing components are
   * then a real finding.
   *
   * It narrows what is CHECKED and never what is REPORTED: a clean report over a scope states the
   * scope in its headline, because "clean" over 2 of 22 components is not a clean file.
   */
  scope?: { components?: string[] };
  /**
   * ACTUAL side only: the node coordinates (`instanceKey`) that are component INSTANCES.
   *
   * A pure fact about the file, which is why it belongs to the reader and not to the diff — but the diff
   * is the only thing that can use it, because only the diff knows what was PLANNED at that coordinate.
   *
   * It exists because an instance surfaces its main component's bindings as its own. A read of aurora
   * therefore finds 2,705 bindings on and beneath instance nodes that the engine plans nowhere — every
   * one of them inherited from a component the scan already covers on its own terms, and not one of them
   * authored in the place it was found. Reported, they are 2,705 `low` findings that say nothing and bury
   * the 1,428 that do; dropped without a word, they are exactly the silence `docs/34-gate-independence.md`
   * warns about. So they are suppressed and COUNTED, and the count is a note on the report.
   *
   * Absent means the reader did not record node types. The diff then reports inherited bindings as
   * unplanned, which is noisy but honest — it never assumes a node is an instance.
   */
  instanceNodes?: string[];
};

// ── THE JOIN KEY ────────────────────────────────────────────────────────────────────────────────

/** `|` because no component id, member coordinate, node name or Figma property contains one; a
 *  separator that CAN occur in a part would silently merge two coordinates into one key. */
export const KEY_SEP = '|';

export const bindKey = (component: string, member: string, node: string, property: string): string =>
  [component, member, node, property].join(KEY_SEP);

export const parseBindKey = (
  key: string,
): { component: string; member: string; node: string; property: string } => {
  const p = key.split(KEY_SEP);
  if (p.length !== 4) throw new Error(`malformed bind key (expected 4 ${KEY_SEP}-separated parts): ${key}`);
  return { component: p[0], member: p[1], node: p[2], property: p[3] };
};

/** A NODE coordinate — a bind key without the property. What `State.instanceNodes` holds. */
export const instanceKey = (component: string, member: string, node: string): string =>
  [component, member, node].join(KEY_SEP);

/**
 * Whether a bind key sits AT or BENEATH one of the given instance nodes.
 *
 * Walks the node path up rather than scanning the instance list, so it stays O(depth) over a 43k-binding
 * read instead of O(bindings × instances).
 */
export const underInstance = (key: string, instances: ReadonlySet<string>): boolean => {
  if (instances.size === 0) return false;
  const { component, member, node } = parseBindKey(key);
  let path = node;
  for (;;) {
    if (instances.has(instanceKey(component, member, path))) return true;
    if (path === '/' || path === '') return false;
    const cut = path.lastIndexOf('/');
    path = cut <= 0 ? '/' : path.slice(0, cut);
  }
};

/**
 * A STYLE coordinate — the kind and the name. What `State.styles` is keyed by.
 *
 * The kind is in the key because the four kinds are four separate Figma namespaces on both sides, and
 * two of them could carry the same name without colliding in Figma. Comparing across them would be a
 * finding about nothing — the same reason `BindState` keeps `boundStyle` and `boundVariable` apart.
 */
export const styleKey = (kind: StyleKind, name: string): string => [kind, name].join(KEY_SEP);

/** Split on the FIRST separator only, so a style name that contains one (a designer's own style; the
 *  engine emits none) parses back whole instead of throwing on a part count. `bindKey`'s four parts are
 *  all engine-controlled and can afford the stricter check; a style name is not. */
export const parseStyleKey = (key: string): { kind: StyleKind; name: string } => {
  const i = key.indexOf(KEY_SEP);
  if (i <= 0) throw new Error(`malformed style key (expected \`kind${KEY_SEP}name\`): ${key}`);
  const kind = key.slice(0, i) as StyleKind;
  if (!STYLE_KINDS.includes(kind)) throw new Error(`style key names an unknown kind '${kind}': ${key}`);
  return { kind, name: key.slice(i + 1) };
};

/** Human-readable form of a style key, for a report line. */
export const showStyleKey = (key: string): string => {
  const { kind, name } = parseStyleKey(key);
  return `${kind} style '${name}'`;
};

/** Human-readable form of a bind key, for a report line. */
export const showBindKey = (key: string): string => {
  const { component, member, node, property } = parseBindKey(key);
  return `${component} · ${member} · ${node} · ${property}`;
};

// ── VALUE CANONICALIZATION ──────────────────────────────────────────────────────────────────────
//
// Both sides run the SAME functions over their own raw values. This is where a false positive would
// otherwise live: the emitted JSON writes a color channel as `0.9137254953384399` (233/255 as a
// double) and Figma hands back the same quantity through a different code path, so a naive `===` on
// the float is a coin flip. Canonicalizing to 8-bit channels is lossless for every value the emitter
// can produce — it derives them from 0-255 integers — and it makes a report line readable.

/** A Figma RGBA as the emitter and the Plugin API both express it: channels 0-1, optional alpha. */
export type Rgba = { r: number; g: number; b: number; a?: number };

const ch = (n: number): number => Math.round(Math.max(0, Math.min(1, n)) * 255);

/** `rgba(233,233,234,1)` — 8-bit channels, alpha to 4dp. */
export const canonColor = (c: Rgba): string =>
  `rgba(${ch(c.r)},${ch(c.g)},${ch(c.b)},${Number((c.a ?? 1).toFixed(4))})`;

/** A FLOAT to 4dp, trailing zeros dropped. Figma stores dimensions as doubles and a `12` vs `12.0000001`
 *  difference is float noise, not drift. */
export const canonFloat = (n: number): string => String(Number(n.toFixed(4)));

/** Canonicalize by the variable's declared `resolvedType`, so a type mismatch surfaces in the
 *  scope/type arm rather than as an unreadable value diff. */
export const canonValue = (resolvedType: string, raw: unknown): string => {
  if (resolvedType === 'COLOR') {
    if (raw && typeof raw === 'object' && 'r' in (raw as Rgba)) return canonColor(raw as Rgba);
    return `NON-COLOR(${JSON.stringify(raw)})`;
  }
  if (resolvedType === 'FLOAT') {
    if (typeof raw === 'number') return canonFloat(raw);
    return `NON-FLOAT(${JSON.stringify(raw)})`;
  }
  if (resolvedType === 'STRING') return typeof raw === 'string' ? raw : `NON-STRING(${JSON.stringify(raw)})`;
  if (resolvedType === 'BOOLEAN') return typeof raw === 'boolean' ? String(raw) : `NON-BOOLEAN(${JSON.stringify(raw)})`;
  return JSON.stringify(raw);
};

/**
 * Figma's `{ value, unit }` shape — a text style's `lineHeight` and `letterSpacing` — as ONE string.
 *
 * `150%`, `24px`, `AUTO`. Both producers run this over their own raw object, which is the whole contract
 * of this section: the emission writes `{unit:'PERCENT',value:150}` and the Plugin API hands back the
 * same shape through a different code path, so one function over both is what makes a comparison
 * meaningful at all.
 *
 * It CANONICALIZES and does not RECONCILE — the unit is kept, not converted. `150%` and `24px` are two
 * different facts, not two spellings of one, and which of those it is belongs to `diff.ts` (see its
 * header on the line between a spelling and a defect). Converting here would need a font size, which for
 * a fluid style is per-mode, so the conversion would silently pick a mode and call the result equal.
 */
export const canonUnitValue = (raw: unknown): string => {
  if (!raw || typeof raw !== 'object') return `MALFORMED(${JSON.stringify(raw)})`;
  const { unit, value } = raw as { unit?: unknown; value?: unknown };
  if (unit === 'AUTO') return 'AUTO';
  if (typeof value !== 'number') return `MALFORMED(${JSON.stringify(raw)})`;
  if (unit === 'PERCENT') return `${canonFloat(value)}%`;
  if (unit === 'PIXELS') return `${canonFloat(value)}px`;
  return `${canonFloat(value)}<${String(unit)}>`;
};

/**
 * A style-interior value, canonicalized by what it IS rather than by a declared type.
 *
 * `canonValue` above dispatches on a variable's `resolvedType`, which a style property does not have.
 * The four shapes a style interior actually contains are a number, a string, a boolean, and one of two
 * objects — an RGBA (`{r,g,b,a}`: an effect's color, a grid's overlay, a gradient stop) or a unit-value
 * (`{unit,value}`: a line height, a letter spacing). Dispatching on the shape handles a text property, an
 * effect field, a layout grid and a gradient stop through one function, which is what keeps the two
 * producers' style normalization identical without either of them holding a field table.
 */
export const canonAny = (raw: unknown): string => {
  if (typeof raw === 'number') return canonFloat(raw);
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'boolean') return String(raw);
  if (raw && typeof raw === 'object') {
    if ('r' in (raw as Rgba)) return canonColor(raw as Rgba);
    if ('unit' in (raw as { unit?: unknown })) return canonUnitValue(raw);
  }
  return JSON.stringify(raw);
};

/** The UNIT of a `canonUnitValue` string, so the diff can separate "the number moved" from "the unit
 *  changed" — two different defects with two different fixes. Mirrors `parseCanonColor`: the canonical
 *  string is what travels, and the parser gives the diff back the part it needs to judge. */
export const unitOfCanon = (s: string): string =>
  s === 'AUTO' ? 'AUTO' : s.endsWith('%') ? 'PERCENT' : s.endsWith('px') ? 'PIXELS' : `other(${s})`;

/** Parse `rgba(r,g,b,a)` back to 0-1 channels — the contrast arm needs numbers, and the canonical
 *  string is what both sides carry. Returns `null` for anything else (an alias left unresolved, a
 *  non-color value), so a caller reports "unmeasurable" rather than computing on a zero. */
export const parseCanonColor = (s: string): { r: number; g: number; b: number; a: number } | null => {
  const m = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(s);
  if (!m) return null;
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: Number(m[4]) };
};

// ── THE ROOT ────────────────────────────────────────────────────────────────────────────────────

/**
 * The brand root — the single leading name segment every projected variable carries.
 *
 * DERIVED from the names in hand, never assumed to be any particular string. `materialization-renames.ts`
 * (`namespace-and-core-tier-1097`) maps `name` → `${root}/${name}`, and the root is itself a brand
 * lever: aurora emits `ads/`, nb `nbds/`, wendys `wds/`. A harness that hardcoded one would be wrong
 * for two brands out of three, and a harness that skipped the root entirely is #1511's bug.
 *
 * Throws on more than one leading segment rather than picking. If a file's variables do not agree on a
 * root, every name-keyed comparison below it is meaningless, and the honest failure is louder than a
 * guess — the whole point of resolving a plan's root-less name through this rather than by
 * concatenation is that the assumption gets CHECKED once, here.
 */
export const rootOf = (names: readonly string[], whence: string): string => {
  const roots = [...new Set(names.map((n) => n.split('/')[0]))].sort();
  if (roots.length === 1) return roots[0];
  if (roots.length === 0) throw new Error(`${whence}: no variable names, so no brand root to derive`);
  throw new Error(
    `${whence}: variable names carry ${roots.length} different leading segments (${roots.join(', ')}) — ` +
      `expected exactly one brand root. Every name-keyed comparison is unreliable until this is resolved.`,
  );
};

// ── SHAPE VALIDATION ────────────────────────────────────────────────────────────────────────────

/** Read a `State` off parsed JSON, refusing anything that is not one. A diff over a mis-shaped state
 *  would report thousands of phantom findings; the useful failure is at the door. */
export const readState = (parsed: unknown, whence: string, side: State['side']): State => {
  const s = parsed as Partial<State>;
  if (!s || typeof s !== 'object') throw new Error(`${whence}: not a JSON object`);
  if (s.format !== FORMAT) throw new Error(`${whence}: format is ${JSON.stringify(s.format)}, expected ${JSON.stringify(FORMAT)}`);
  if (s.version !== VERSION) throw new Error(`${whence}: version is ${JSON.stringify(s.version)}, expected ${VERSION}`);
  if (s.side !== side)
    throw new Error(
      `${whence}: side is ${JSON.stringify(s.side)}, expected ${JSON.stringify(side)} — the two states are ` +
        `the same shape, so a transposed argument pair diffs cleanly in the mirror direction and reads as a pass. ` +
        `Usage: diff.ts <expected.json> <actual.json>.`,
    );
  for (const k of ['variables', 'bindings', 'structure', 'collections'] as const)
    if (!s[k] || typeof s[k] !== 'object') throw new Error(`${whence}: missing or non-object \`${k}\``);
  // The two optional fields: absent is a valid state (a reader that did not look), but PRESENT AND
  // MIS-SHAPED must fail at the door rather than read as an empty one — `styles: []` would otherwise
  // enumerate zero keys and report every emitted style as missing.
  if (s.styles !== undefined && (typeof s.styles !== 'object' || s.styles === null || Array.isArray(s.styles)))
    throw new Error(`${whence}: \`styles\` is present but not an object — omit it entirely if the read did not enumerate styles`);
  if (
    s.libraryConsumed !== undefined &&
    (typeof s.libraryConsumed !== 'object' || s.libraryConsumed === null || Array.isArray(s.libraryConsumed))
  )
    throw new Error(`${whence}: \`libraryConsumed\` is present but not an object`);
  if (!Array.isArray(s.contrast)) throw new Error(`${whence}: missing or non-array \`contrast\``);
  if (typeof s.root !== 'string') throw new Error(`${whence}: missing \`root\``);
  return s as State;
};
