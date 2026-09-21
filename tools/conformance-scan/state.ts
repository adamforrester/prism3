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
 * ── WHAT IS DELIBERATELY NOT HERE ───────────────────────────────────────────────────────────────
 *
 * Style DEFINITIONS. The engine emits Figma styles (text / shadow / grid / gradient) under
 * `out/figma/<brand>/*-styles.json`, and their CONTENTS — a text style's size, weight, line height; a
 * shadow's offset and blur — are not in this shape and not compared. The eight diff categories #1553
 * P1 scopes are about variables, bindings, structure, contrast and staleness; a style's interior is
 * none of those, and a half-modelled one in the join key would make `mode-coverage` and `scope-type`
 * report on a surface they cannot see. Stated as a gap in the README rather than stubbed here.
 *
 * A node's BINDING to a style is a different thing and IS here — see `BindState.boundStyle`. "This
 * member's label points at `type/body/md`" is a binding claim, checkable against a live file, and the
 * largest single binding namespace after `bound`.
 */

export const FORMAT = 'prism3-conformance' as const;
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
  if (!Array.isArray(s.contrast)) throw new Error(`${whence}: missing or non-array \`contrast\``);
  if (typeof s.root !== 'string') throw new Error(`${whence}: missing \`root\``);
  return s as State;
};
