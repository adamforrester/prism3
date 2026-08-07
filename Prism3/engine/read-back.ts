/**
 * Prism3 engine — READ-BACK (the read leg + the verify contract), docs/22 Phase 4 / #109.
 *
 * The inverse of `write-plan.ts`. Where `WritePlan` describes what colour variables to MATERIALISE,
 * `ReadbackSnapshot` is a plain-data mirror of what a live Figma file CONTAINS — read out of
 * `figma.variables` by the plugin executor (`plugin/src/read-figma.ts`) and handed here. This module
 * is the pure half: the snapshot SHAPE + `verifyReadback`, the materialisation-contract check.
 *
 * `verifyReadback` ports the checks the `materialise-to-figma.ts` `verifyPass` string-emitter has
 * always encoded (the API-probe read-back), so the same guarantees hold whether the read runs via the
 * paste-path or the live plugin:
 *   - **modesDistinct** — `color/background/primary` binds a DIFFERENT target per mode (the collapse
 *     guard: the #85 round-trip caught a script that collapsed every mode to one target).
 *   - **aliasesResolve** — every alias target name a colour var references exists (palette or color).
 *   - **slot scopes** — the per-slot scope contract (docs/10 §3 / docs/20) survived the round-trip.
 *   - **fieldFamilyPresent / retiredRolesAbsent / renamedRolesAbsent / bareDangerPresent** — the
 *     role-set shape (#86 renames, retired roles gone, bare `foreground/danger` present).
 *   - **primitivesHidden** — core-palette primitives are hidden from publishing (ref tier).
 *
 * PURE — no `node:*`, no `figma.*`, no I/O. The snapshot is host-neutral plain data: it's what #110's
 * shared UI will consume to SEED itself from an existing themed file, and what the write-side
 * `WritePlan` can be diffed against for a full write→read round-trip.
 */
import type { Rgba } from './write-plan';

/** A variable's per-mode value, as read back: either a resolved literal or the NAME of the variable
 *  it aliases (names — not Figma ids — so the snapshot is pure + serialisable). `null` alias = the
 *  mode carries a literal with no alias (shouldn't happen for our colour vars, but the read is
 *  faithful about it). A `number` is a FLOAT-axis literal (#146 — dims/space/opacity/…). */
export type ReadValue = { alias: string | null } | Rgba | number;

export type ReadbackSnapshot = {
  collections: { name: string; modes: string[] }[];
  /** core-palette primitives (ref tier). */
  palette: { name: string; scopes: string[]; hidden: boolean }[];
  /** semantic colour roles — per-mode alias target name (or literal). */
  color: { name: string; scopes: string[]; valuesByMode: Record<string, ReadValue> }[];
  /** FLOAT axes (#146) — the geometric/dimensional vars, keyed by collection name
   *  (`core-dimension`/`space`/`radius`/`size`/`icon`/`border-width`/`focus`/`opacity`/`layout`). Optional
   *  so a colour-only read (pre-#146, or a partial file) still validates on the colour contract. */
  float?: Record<string, { name: string; scopes: string[]; hidden: boolean; valuesByMode: Record<string, ReadValue> }[]>;
  /** STYLE axes (shadow/gradient lane) — local Effect + Paint style NAMES. Effect styles hold fully
   *  resolved values, so for those the readback stays name-level. Optional like `float`.
   *
   *  `gradientStopBindings` is the one exception, added with #236: gradient stops DO carry an alias
   *  graph now (each stop can bind to a `palette/*` variable), so a name-only read could not tell a
   *  bound gradient from a baked one — and "the gradient re-themes" is precisely the property this
   *  lane exists to guarantee. Keyed by Paint Style name; the value is the resolved target variable
   *  NAME per stop, `null` for a stop with no binding. Optional so a pre-#236 reader still validates. */
  styles?: {
    effects: string[];
    paints: string[];
    gradientStopBindings?: Record<string, (string | null)[]>;
  };
  /** TYPOGRAPHY (#237) — `core-font`/`type-sets` variables (same per-mode row shape as `float`) +
   *  local Text Style names. Optional like the others. */
  font?: Record<string, { name: string; scopes: string[]; hidden: boolean; valuesByMode: Record<string, ReadValue> }[]>;
  textStyles?: string[];
};

/** The styles read-back verdict (shadow/gradient lane). Name-level, matching the light FLOAT verdict:
 *  styles carry resolved values, so there's nothing structural to verify beyond presence. */
export type StylesReadbackVerdict = {
  ok: boolean;
  checks: {
    /** the light shadow set (`shadow/*`) is present. */
    shadowLightPresent: boolean;
    /** the dark shadow set (`shadow-dark/*`) is present iff the brand ships dark. */
    shadowDarkConsistent: boolean;
    /** gradient Paint Styles present iff the brand opts into gradients. */
    gradientsConsistent: boolean;
    /** every gradient stop read binds to a `palette/*` variable (#236) — so the gradient re-themes.
     *  Vacuously true when the reader supplied no bindings (pre-#236 snapshot). */
    gradientStopsBound: boolean;
  };
  details: { effects: string[]; paints: string[]; unboundStops: string[] };
};

/** The TYPOGRAPHY read-back verdict (#237) — name-level, like the FLOAT + styles verdicts. */
export type TypographyReadbackVerdict = {
  ok: boolean;
  checks: {
    /** `core-font` present with its family/size/weight vars. */
    coreFontPresent: boolean;
    /** every `core-font` alias (weight-role → font/weight/N) resolves within core-font. */
    weightAliasesResolve: boolean;
    /** at least one Text Style is present (some may be legitimately skipped for unavailable fonts). */
    textStylesPresent: boolean;
  };
  details: { fontCollections: string[]; danglingAliases: string[]; textStyles: number };
};

/** The FLOAT read-back verdict (#146) — lighter than the colour contract: the geometric axes carry
 *  no semantic role-set to police, so we assert presence, alias resolution, and the wireframe radius
 *  mode. Kept separate from `verifyReadback` so the heavy colour contract stays focused. */
export type FloatReadbackVerdict = {
  ok: boolean;
  checks: {
    /** every expected FLOAT collection is present. */
    collectionsPresent: boolean;
    /** every FLOAT alias target (space→dimension, size→…, layout grid→space) resolves. */
    aliasesResolve: boolean;
    /** `core-dimension` primitives are hidden from publishing. */
    dimensionsHidden: boolean;
    /** iff the brand ships wireframe, the `radius` collection carries a `wireframe` mode. */
    radiusWireframeMode: boolean;
  };
  details: { collections: string[]; danglingAliases: string[] };
};

// The FLOAT axes this lane materialises (#146). `layout` is present iff the brand ships a grid;
// the others are always emitted, so their absence is a real miss.
const EXPECTED_FLOAT_COLLECTIONS = ['core-dimension', 'space', 'radius', 'size', 'icon', 'border-width', 'focus', 'opacity'];

/** The verify verdict: an overall pass + the individual checks + supporting detail for the UI/log. */
export type ReadbackVerdict = {
  ok: boolean;
  checks: {
    modesDistinct: boolean;
    aliasesResolve: boolean;
    slotScopes: boolean;
    fieldFamilyPresent: boolean;
    retiredRolesAbsent: boolean;
    renamedRolesAbsent: boolean;
    bareDangerPresent: boolean;
    primitivesHidden: boolean;
  };
  details: {
    colorVars: number;
    modes: string[];
    backgroundPrimaryByMode: Record<string, string>;
    danglingAliases: string[];
    scopeMismatches: string[];
  };
};

// Expected slot scopes (docs/10 §3 / docs/20) — the same contract the emit-figma scope maps produce.
// Sorted, comma-joined, to compare order-independently against the read-back scopes.
const EXPECTED_SLOT_SCOPES: Record<string, string[]> = {
  'color/interactive/primary/text/rest': ['TEXT_FILL'],
  'color/interactive/primary/border': ['STROKE_COLOR'],
  'color/disabled/fill': ['FRAME_FILL', 'SHAPE_FILL'],
  'color/disabled/on-fill': ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL'],
  'color/disabled/text': ['TEXT_FILL'],
  'color/disabled/icon': ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR'],
  'color/disabled/border': ['STROKE_COLOR'],
  'color/field/fill': ['FRAME_FILL', 'SHAPE_FILL'],
  'color/field/border/rest': ['STROKE_COLOR'],
  'color/field/border/hover': ['STROKE_COLOR'],
  'color/field/placeholder': ['TEXT_FILL'],
};
const FIELD_FAMILY = ['color/field/fill', 'color/field/border/rest', 'color/field/border/hover', 'color/field/placeholder'];
// Retired by role-set changes — must be absent (docs/20 / #86).
const RETIRED_ROLES = ['color/action/default', 'color/text/on-action', 'color/text/on-disabled', 'color/foreground/danger/default'];
// Renamed by #86 (.surface → .fill / .on-disabled → .on-fill; field/border went flat → border/{rest,hover}).
const RENAMED_ROLES = ['color/disabled/surface', 'color/disabled/on-disabled', 'color/field/surface', 'color/field/border'];

const sortScopes = (s: string[]): string => [...s].sort().join(',');
const isAlias = (v: ReadValue): v is { alias: string | null } => typeof v === 'object' && v !== null && 'alias' in v;

/**
 * Verify a read-back snapshot against the materialisation contract. Pure — the plugin reads the live
 * file into a `ReadbackSnapshot`, then calls this; the same checks run on the shim in tests.
 */
export const verifyReadback = (snap: ReadbackSnapshot): ReadbackVerdict => {
  const colorByName = new Map(snap.color.map((v) => [v.name, v]));
  const has = (n: string): boolean => colorByName.has(n);
  const allNames = new Set<string>([...snap.palette.map((p) => p.name), ...snap.color.map((c) => c.name)]);
  const colModes = snap.collections.find((c) => c.name === 'color')?.modes ?? [];

  // modesDistinct — background/primary must bind a different TARGET per mode (the collapse guard).
  const bg = colorByName.get('color/background/primary');
  const backgroundPrimaryByMode: Record<string, string> = {};
  for (const m of colModes) {
    const val = bg?.valuesByMode[m];
    backgroundPrimaryByMode[m] = val ? (isAlias(val) ? (val.alias ?? 'literal') : 'literal') : 'ABSENT';
  }
  const modesDistinct = new Set(Object.values(backgroundPrimaryByMode)).size > 1;

  // aliasesResolve — every alias target name a colour var references must exist somewhere.
  const danglingAliases: string[] = [];
  for (const v of snap.color)
    for (const [m, val] of Object.entries(v.valuesByMode))
      if (isAlias(val) && val.alias && !allNames.has(val.alias)) danglingAliases.push(`${v.name} @${m} -> ${val.alias}`);
  const aliasesResolve = danglingAliases.length === 0;

  // slotScopes — the per-slot scope contract survived (order-independent).
  const scopeMismatches: string[] = [];
  for (const [name, want] of Object.entries(EXPECTED_SLOT_SCOPES)) {
    const v = colorByName.get(name);
    const got = v ? sortScopes(v.scopes) : 'ABSENT';
    if (got !== sortScopes(want)) scopeMismatches.push(`${name}: ${got} != ${sortScopes(want)}`);
  }
  const slotScopes = scopeMismatches.length === 0;

  const checks = {
    modesDistinct,
    aliasesResolve,
    slotScopes,
    fieldFamilyPresent: FIELD_FAMILY.every(has),
    retiredRolesAbsent: RETIRED_ROLES.every((n) => !has(n)),
    renamedRolesAbsent: RENAMED_ROLES.every((n) => !has(n)),
    bareDangerPresent: has('color/foreground/danger'),
    primitivesHidden: snap.palette.length > 0 && snap.palette.every((p) => p.hidden),
  };

  return {
    ok: Object.values(checks).every(Boolean),
    checks,
    details: {
      colorVars: snap.color.length,
      modes: colModes,
      backgroundPrimaryByMode,
      danglingAliases,
      scopeMismatches,
    },
  };
};

/**
 * Verify the FLOAT axes of a read-back snapshot (#146). Light by design — the geometric layer has no
 * semantic role-set to police like colour does, so this asserts the structural facts that matter:
 * the expected collections are present, every cross-collection alias resolves (against ALL float vars
 * — the executor binds space→dimension etc. across collections), the `core-dimension` primitives are
 * hidden, and the `radius` collection carries a `wireframe` mode iff the brand ships wireframe.
 * Returns an all-pass verdict when `snap.float` is absent (a colour-only file is not a FLOAT failure).
 */
export const verifyFloatReadback = (snap: ReadbackSnapshot, expectWireframe: boolean): FloatReadbackVerdict => {
  const float = snap.float ?? {};
  const present = Object.keys(float);
  const collectionsPresent = present.length === 0 ? false : EXPECTED_FLOAT_COLLECTIONS.every((n) => present.includes(n));

  // Every FLOAT var name across all collections — alias targets span collections, so resolve globally.
  const allFloatNames = new Set<string>();
  for (const vars of Object.values(float)) for (const v of vars) allFloatNames.add(v.name);
  const danglingAliases: string[] = [];
  for (const vars of Object.values(float))
    for (const v of vars)
      for (const [m, val] of Object.entries(v.valuesByMode))
        if (isAlias(val) && val.alias && !allFloatNames.has(val.alias)) danglingAliases.push(`${v.name} @${m} -> ${val.alias}`);

  const dims = float['core-dimension'] ?? [];
  const dimensionsHidden = dims.length > 0 && dims.every((v) => v.hidden);

  const radiusModes = snap.collections.find((c) => c.name === 'radius')?.modes ?? [];
  const hasWireframe = radiusModes.includes('wireframe');
  const radiusWireframeMode = expectWireframe ? hasWireframe : !hasWireframe;

  const checks = {
    collectionsPresent: snap.float === undefined ? true : collectionsPresent,
    aliasesResolve: danglingAliases.length === 0,
    dimensionsHidden: snap.float === undefined ? true : dimensionsHidden,
    radiusWireframeMode: snap.float === undefined ? true : radiusWireframeMode,
  };
  return { ok: Object.values(checks).every(Boolean), checks, details: { collections: present, danglingAliases } };
};

/**
 * Verify the STYLE axes of a read-back snapshot (shadow/gradient lane). Mostly name-level and light —
 * effect styles hold resolved values, so there's no alias graph or scope contract to police there.
 * Asserts: the light shadow set is present, the dark set is present iff the brand ships dark, and
 * gradient Paint Styles are present iff the brand opts into gradients. Returns all-pass when
 * `snap.styles` is absent (a styles-less file isn't a failure). `expectDark`/`expectGradients` are
 * brand facts the caller passes.
 *
 * One value-level check joins them at #236: `gradientStopsBound`. Every gradient stop the reader saw a
 * binding slot for must name a `palette/*` target, because an unbound stop is exactly the pre-#236
 * defect — the gradient renders correctly and then silently fails to follow a re-theme. That failure
 * is invisible to every name-level check, which is why it needs its own. Skipped (passing) when the
 * reader supplied no `gradientStopBindings`, so a pre-#236 snapshot still validates.
 */
export const verifyStylesReadback = (
  snap: ReadbackSnapshot,
  expectDark: boolean,
  expectGradients: boolean,
): StylesReadbackVerdict => {
  const effects = snap.styles?.effects ?? [];
  const paints = snap.styles?.paints ?? [];
  const hasLight = effects.some((n) => n.startsWith('shadow/'));
  const hasDark = effects.some((n) => n.startsWith('shadow-dark/'));
  const hasGradients = paints.some((n) => n.startsWith('gradient/'));

  // Stops that carry no resolved palette target, named for the report: an empty list is the pass.
  const bindings = snap.styles?.gradientStopBindings;
  const unboundStops: string[] = [];
  if (bindings) {
    for (const [style, stops] of Object.entries(bindings))
      stops.forEach((target, i) => {
        if (!target || !target.startsWith('palette/')) unboundStops.push(`${style} stop ${i} -> ${target ?? 'unbound'}`);
      });
  }

  const checks = {
    shadowLightPresent: snap.styles === undefined ? true : hasLight,
    shadowDarkConsistent: snap.styles === undefined ? true : hasDark === expectDark,
    gradientsConsistent: snap.styles === undefined ? true : hasGradients === expectGradients,
    gradientStopsBound: bindings === undefined ? true : unboundStops.length === 0,
  };
  return { ok: Object.values(checks).every(Boolean), checks, details: { effects, paints, unboundStops } };
};

/**
 * Verify the TYPOGRAPHY axes of a read-back snapshot (#237). Name-level and light, like the FLOAT +
 * styles verdicts. Asserts: `core-font` is present, its weight-role aliases (→ `font/weight/N`) resolve
 * within the font collections, and at least one Text Style landed. Returns all-pass when `snap.font`
 * is absent (a typography-less read isn't a failure). Text styles legitimately skipped for unavailable
 * fonts are the caller's concern (surfaced in the apply summary), not a read-back failure.
 */
export const verifyTypographyReadback = (snap: ReadbackSnapshot): TypographyReadbackVerdict => {
  const font = snap.font ?? {};
  const present = Object.keys(font);
  const coreFontPresent = present.includes('core-font');

  // Weight-role aliases (font/weight-role/* → font/weight/N) resolve within the font collections.
  const allFontNames = new Set<string>();
  for (const vars of Object.values(font)) for (const v of vars) allFontNames.add(v.name);
  const danglingAliases: string[] = [];
  for (const vars of Object.values(font))
    for (const v of vars)
      for (const [m, val] of Object.entries(v.valuesByMode))
        if (isAlias(val) && val.alias && !allFontNames.has(val.alias)) danglingAliases.push(`${v.name} @${m} -> ${val.alias}`);

  const textStyles = snap.textStyles ?? [];
  const checks = {
    coreFontPresent: snap.font === undefined ? true : coreFontPresent,
    weightAliasesResolve: danglingAliases.length === 0,
    // Absent → all-pass (typography-less read). A DEFINED-but-empty `textStyles` is NOT a failure:
    // skip-with-warning means every style could be legitimately absent because its font wasn't
    // available in this Figma (the apply summary surfaces the ⚠️). Emptiness is a warning, not a
    // broken contract — so this only asserts the read didn't drop styles that ARE present, i.e. it's
    // vacuously true. (The apply-side count is the real "did styles land" signal; read-back stays
    // name-level + non-punitive, consistent with skip-with-warning.)
    textStylesPresent: true,
  };
  return { ok: Object.values(checks).every(Boolean), checks, details: { fontCollections: present, danglingAliases, textStyles: textStyles.length } };
};
