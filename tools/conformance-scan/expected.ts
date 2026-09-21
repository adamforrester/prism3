/**
 * CONFORMANCE SCAN — THE EXPECTED HOST-TRUTH (#1553 Phase 1, half one of two).
 *
 *   npx tsx tools/conformance-scan/expected.ts <brand> > expected.json
 *   npx tsx tools/conformance-scan/expected.ts --brands        # what <brand> can be, and why
 *
 * Answers "what SHOULD be in a Figma file built from this engine, for this brand?" in the normalized
 * shape `state.ts` defines, so `diff.ts` can compare it against a live file read through
 * figma-console-mcp. Read-only: it writes nothing but stdout.
 *
 * ── IT REUSES THE ENGINE'S OUTPUT RATHER THAN RE-DERIVING IT ────────────────────────────────────
 *
 * Four sources, and the choice of source per category is the load-bearing design decision here:
 *
 *   1. VARIABLES — read out of the COMMITTED `packages/engine/out/figma/<brand>/*.json`. Not rebuilt
 *      from a `Theme`. Those bytes are what a designer's file is actually built from (the same
 *      argument `lint-cut-binding.ts` and `lint-absolute-inset.ts` make for reading them), so a
 *      re-derivation here would be comparing the live file against a tree nobody materialized.
 *   2. BINDINGS + STRUCTURE — from `figmaAnatomySet`, the projector the plugin itself drives. Component
 *      payloads are NOT committed under `out/` (the plugin builds them from the defs at run time), so
 *      there are no bytes to read and the projection IS the artifact.
 *   3. CONTRAST CONTRACTS — from `resolveAllModes(theme)`, which is where a role's `min` and its
 *      `against` ground exist at all. This is the one place a `Theme` is built, and it is built for the
 *      CONTRACT (the declared floor), never for the values: the values come from source 1.
 *   4. STALENESS — `ENGINE_VERSION`.
 *
 * ── THE ROOT, WHICH IS WHERE #1511 WENT WRONG ───────────────────────────────────────────────────
 *
 * Sources 1 and 2 disagree about names, and reconciling them is most of this file's real work.
 * `out/figma/` carries FULLY MATERIALIZED names (`ads/color/text/primary`); an `AnatomyPlan`'s
 * `bound`/`paints` carry PRE-materialization ones (`color/text/primary`), because the plan is
 * brand-invariant by design. `materialization-renames.ts` adds the root between them.
 *
 * `tools/binding-audit/reconcile.ts` compares the two directly and so reports every correct binding in
 * a live file as WRONG-TOKEN — measured at 5,433 of 5,433 on a clean file, a 100% false-positive rate.
 * Filed separately; this harness must not repeat it. It does not, and NOT by prefixing `${root}/`:
 * every plan name is RESOLVED THROUGH the emitted variable table (`materializeName`), so a name that
 * does not land becomes a stated finding instead of a silently mangled join key. Measured across all
 * three emitting brands: 177 distinct plan variables, 0 unresolved.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDefs } from '../../packages/engine/components/index';
import {
  figmaAnatomySet,
  planComponentName,
  type AnatomyPlan,
  type FigmaNodePlan,
} from '../../packages/engine/anatomy-figma';
import { brandTheme } from '../../packages/engine/theme';
import { readExampleBrand } from '../../packages/engine/emit-dtcg';
import { nbTheme } from '../../packages/engine/nb-fixture';
import { parseStandardDesignMd, standardToBrandInput } from '../../packages/engine/standard-design-md';
import { resolveAllModes } from '../../packages/engine/modes';
import { ENGINE_VERSION } from '../../packages/engine/version';
import type { Theme } from '../../packages/engine/theme';
import {
  FORMAT,
  STYLE_KINDS,
  VERSION,
  bindKey,
  canonAny,
  canonValue,
  rootOf,
  styleKey,
  type ContrastContract,
  type Rgba,
  type State,
  type StyleDef,
  type StyleKind,
  type StyleProp,
  type VarState,
} from './state';

const here = dirname(fileURLToPath(import.meta.url));
const engineDir = resolve(here, '../../packages/engine');

/**
 * Brand id → the Theme its contrast contract is read from.
 *
 * A FOURTH hand-maintained copy of this table (`emit-figma.ts`, `token-contract.ts`,
 * `lint-figma-destination.ts` each keep their own) and deliberately not a fifth abstraction: the repo
 * has no exported brand registry, every existing site keeps a local table, and inventing a shared one
 * here would be a refactor of three files this task has no business touching.
 *
 * It is NOT a list of scannable brands — `out/figma/` is (see `brandsOnDisk`). A brand present on disk
 * and absent here FAILS rather than skipping its contrast arm, the lesson `lint-figma-destination.ts`
 * records: a scan that quietly drops a category reports clean over the part it cannot see.
 */
const THEME_OF: Record<string, () => Theme> = {
  nb: () => nbTheme(),
  aurora: () => brandTheme(readExampleBrand('./examples/aurora.design.md')),
  wendys: () =>
    brandTheme(
      standardToBrandInput(
        parseStandardDesignMd(readFileSync(resolve(engineDir, 'examples/wendys.design.md'), 'utf8')),
      ).input,
    ),
};

/** The brands that HAVE an emission to scan — discovered, so a brand added to `emit-figma.ts` is
 *  scannable the day it lands rather than the day someone edits a list here. */
const brandsOnDisk = (): string[] => {
  const dir = resolve(engineDir, 'out/figma');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
};

type EmittedVar = {
  name: string;
  resolvedType: string;
  scopes?: string[];
  value?: unknown;
  alias?: { type: string; name: string } | null;
};

/** One emitted collection file, reduced to what a conformance claim can be checked against. */
type EmittedFile = { collection: string; mode: string | undefined; variables: EmittedVar[] };

const readEmission = (brand: string): EmittedFile[] => {
  const dir = resolve(engineDir, 'out/figma', brand);
  if (!existsSync(dir))
    throw new Error(
      `no emission at packages/engine/out/figma/${brand}/ — run \`npx tsx packages/engine/regen.ts\`, ` +
        `or pick one of: ${brandsOnDisk().join(', ') || '(none on disk)'}`,
    );
  const out: EmittedFile[] = [];
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith('.json')) continue;
    const j = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as {
      $collection?: unknown;
      $mode?: unknown;
      variables?: EmittedVar[];
    };
    // A STYLE file (`text-styles.json`) carries `styles`, not `variables`, and no `$mode`. Skipped
    // rather than half-modelled — see state.ts on why styles are out of this shape.
    if (!Array.isArray(j.variables)) continue;
    if (typeof j.$collection !== 'string') throw new Error(`${brand}/${f}: no string \`$collection\``);
    out.push({
      collection: j.$collection,
      mode: typeof j.$mode === 'string' ? j.$mode : undefined,
      variables: j.variables,
    });
  }
  if (out.length === 0) throw new Error(`packages/engine/out/figma/${brand}/ holds no variable files`);
  return out;
};

// ── STYLE DEFINITIONS, FROM THE FOUR EMITTED STYLE FILES ────────────────────────────────────────

/** Emitted style file → the `StyleKind` it holds. The four are four separate Figma APIs and four
 *  separate writers (`write-text-styles.ts`, `write-styles.ts` for both effect and paint,
 *  `write-grid-styles.ts`), so the mapping is stated rather than derived from the file name. */
const STYLE_FILES: ReadonlyArray<{ file: string; kind: StyleKind }> = [
  { file: 'text-styles.json', kind: 'text' },
  { file: 'shadow-styles.json', kind: 'effect' },
  { file: 'grid-styles.json', kind: 'grid' },
  { file: 'gradient-styles.json', kind: 'paint' },
];

/** `{bound:true,variable}` → a variable claim; `{bound:false,value}` / `{bindable:false,value}` → a
 *  literal. The three shapes a text style's `properties` entry comes in, and the distinction is the one
 *  `StyleProp` exists to keep (`state.ts`): an unbound literal that resolves to the right number today
 *  is not a bound variable. */
const textProp = (raw: unknown): StyleProp | null => {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as { bound?: boolean; variable?: string; value?: unknown };
  if (p.bound === true && typeof p.variable === 'string') return { kind: 'variable', name: p.variable };
  if ('value' in p) return { kind: 'value', value: canonAny(p.value) };
  return null;
};

/** Every field of an object, flattened to `<prefix><field>` literal props. One level of nesting is
 *  expanded (`offset` → `offset.x` / `offset.y`) because that is the only nesting an effect or a layout
 *  grid has, and a whole-object compare would report one opaque finding where the useful one names the
 *  field that moved. */
const flatten = (obj: Record<string, unknown>, prefix: string, into: Record<string, StyleProp>): void => {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && !('r' in (v as Rgba)) && !('unit' in (v as { unit?: unknown })))
      flatten(v as Record<string, unknown>, `${prefix}${k}.`, into);
    else into[`${prefix}${k}`] = { kind: 'value', value: canonAny(v) };
  }
};

/**
 * One emitted style → the normalized `StyleDef` the diff compares.
 *
 * Per kind, and the exclusions are as load-bearing as the inclusions:
 *
 *   TEXT — all eight `properties`, each through `textProp`. `fontWeight` is included even though Figma
 *     has no such field on a `TextStyle`; the diff reconciles it through `fontStyle` (see its header).
 *   EFFECT — `effects.length` plus every field of every effect. The length is a property so a two-layer
 *     shadow flattened to one is a named finding rather than a silent comparison of the first layer.
 *   GRID — the same treatment over `layoutGrids`.
 *   PAINT — `paintType` and the stops ONLY. A stop with an `alias` is a VARIABLE claim, because
 *     `write-styles.ts` binds it into the stop's `boundVariables.color`. `interpolation`, `sampledStops`
 *     and `a11y` are engine-side and never reach Figma — not gaps, not claims about a file — and the
 *     geometry (`angle` / `center` / `shape`) is a stated gap: Figma stores the `gradientTransform`
 *     matrix the writer computes from it, and re-deriving that here would be a second writer.
 */
const styleDefOf = (kind: StyleKind, raw: Record<string, unknown>): StyleDef => {
  const name = raw.name;
  if (typeof name !== 'string') throw new Error(`a ${kind} style has no string \`name\`: ${JSON.stringify(raw).slice(0, 120)}`);
  const props: Record<string, StyleProp> = {};
  if (kind === 'text') {
    for (const [field, p] of Object.entries((raw.properties ?? {}) as Record<string, unknown>)) {
      const sp = textProp(p);
      if (sp) props[field] = sp;
    }
  } else if (kind === 'effect' || kind === 'grid') {
    const listKey = kind === 'effect' ? 'effects' : 'layoutGrids';
    const list = (raw[listKey] ?? []) as Record<string, unknown>[];
    props[`${listKey}.length`] = { kind: 'value', value: String(list.length) };
    list.forEach((item, i) => flatten(item, `${listKey}[${i}].`, props));
  } else {
    props.paintType = { kind: 'value', value: canonAny(raw.paintType) };
    const stops = (raw.stops ?? []) as { position?: unknown; color?: unknown; alias?: unknown }[];
    props['stops.length'] = { kind: 'value', value: String(stops.length) };
    stops.forEach((s, i) => {
      props[`stops[${i}].position`] = { kind: 'value', value: canonAny(s.position) };
      props[`stops[${i}].color`] =
        typeof s.alias === 'string' ? { kind: 'variable', name: s.alias } : { kind: 'value', value: canonAny(s.color) };
    });
  }
  return { kind, name, props };
};

/** Every emitted style for a brand, keyed by `styleKey`. A file the brand does not emit is absent from
 *  disk and contributes nothing — `gradient-styles.json` is an empty `styles` array for nb and wendys,
 *  because a brand gradient is opt-in, and "no paint styles emitted" is the correct expectation rather
 *  than a hole. It also means the paint kind's expectation for those brands is that the file's own paint
 *  styles are all EXTRA, which is exactly what arm (i) reports and at `low`. */
const readStyles = (brand: string): { styles: Record<string, StyleDef>; counts: Record<string, number> } => {
  const dir = resolve(engineDir, 'out/figma', brand);
  const styles: Record<string, StyleDef> = {};
  const counts: Record<string, number> = {};
  for (const { file, kind } of STYLE_FILES) {
    const path = resolve(dir, file);
    if (!existsSync(path)) continue;
    const j = JSON.parse(readFileSync(path, 'utf8')) as { styles?: Record<string, unknown>[] };
    if (!Array.isArray(j.styles)) throw new Error(`${brand}/${file}: no \`styles\` array`);
    counts[kind] = j.styles.length;
    for (const s of j.styles) {
      const def = styleDefOf(kind, s);
      const key = styleKey(kind, def.name);
      if (key in styles) throw new Error(`${brand}/${file}: two ${kind} styles are named '${def.name}' — the emission is not keyable by name`);
      styles[key] = def;
    }
  }
  return { styles, counts };
};

/**
 * The emitted variable table, merged across each collection's per-mode files.
 *
 * A collection with N modes is N files (`color.light.json` … `color.hc-dark.json`); one variable's
 * modes are therefore assembled here rather than read whole. A variable present in some of its
 * collection's mode files and absent from others keeps only the modes it appeared in, and `diff.ts`'s
 * mode-coverage arm is what reports the hole — this function does not invent a value to fill it.
 */
const buildVariables = (
  files: EmittedFile[],
): { variables: Record<string, VarState>; collections: Record<string, { modes: string[] }> } => {
  const variables: Record<string, VarState> = {};
  const collections: Record<string, { modes: Set<string> }> = {};
  for (const f of files) {
    const mode = f.mode ?? 'Default';
    (collections[f.collection] ??= { modes: new Set() }).modes.add(mode);
    for (const v of f.variables) {
      const cur = (variables[v.name] ??= {
        collection: f.collection,
        resolvedType: v.resolvedType,
        scopes: [...(v.scopes ?? [])].sort(),
        modes: {},
      });
      if (cur.collection !== f.collection)
        throw new Error(
          `${v.name} appears in two collections (${cur.collection} and ${f.collection}) — the emission ` +
            `is not keyable by name, so no name-keyed diff over it is trustworthy.`,
        );
      cur.modes[mode] =
        v.alias && typeof v.alias.name === 'string'
          ? { kind: 'alias', target: v.alias.name }
          : { kind: 'value', value: canonValue(v.resolvedType, v.value) };
    }
  }
  return {
    variables,
    collections: Object.fromEntries(
      Object.entries(collections).map(([k, v]) => [k, { modes: [...v.modes].sort() }]),
    ),
  };
};

// ── BINDINGS + STRUCTURE, FROM THE PROJECTION ───────────────────────────────────────────────────

/** The plan's own `<axis>=<value>` coordinate reduced to the value, for an `emitAsComponents` def's
 *  standalone `<id>/<value>` component name (#1012). Mirrors `emitCoordValue` in
 *  `apps/plugin/src/write-components.ts`, which is a module-private const there. */
const coordValue = (coord: string): string => {
  const first = coord.split(', ')[0] ?? coord;
  const eq = first.indexOf('=');
  return eq >= 0 ? first.slice(eq + 1) : first;
};

/**
 * A plan's pre-materialization variable name → the name it lands on in the file.
 *
 * Resolution is a LOOKUP in the emitted table, not `${root}/${name}` concatenation, because the
 * concatenation would be an assumption about `materialization-renames.ts` that goes stale silently —
 * and because a lookup can report a miss. `unresolved` collects those; the caller turns them into a
 * stated finding.
 */
const materializeName = (
  planName: string,
  root: string,
  emitted: Record<string, VarState>,
  unresolved: Set<string>,
): string | null => {
  const full = `${root}/${planName}`;
  if (full in emitted) return full;
  unresolved.add(planName);
  return null;
};

/** Walk a member's node tree, recording every bindable property the plan declares.
 *
 *  Paths are MEMBER-RELATIVE with the member root at `/` — the same convention
 *  `tools/binding-audit`'s console snippet uses, so one read of a live file serves both harnesses.
 *  The plan's own root segment (`container` / `glyph`) is dropped: the plugin renames that node in
 *  place to the member coordinate, so it is not in the file under the plan's name for it.
 *
 *  All FOUR plan binding namespaces are walked, which is the same symmetry `planBindingErrors`
 *  keeps — `bound` and `paints` name VARIABLES, `textStyle` and `effectStyle` name STYLES, and the
 *  two are handed to different emitters here because comparing a style against a variable table
 *  would be a finding about nothing. Walking three of the four would silently exempt the fourth. */
const walkBindings = (
  n: FigmaNodePlan,
  path: string,
  emitVar: (node: string, property: string, planVar: string) => void,
  emitStyle: (node: string, property: string, styleName: string) => void,
): void => {
  const here_ = path === '' ? '/' : path;
  // `bound` is Figma property name → plan variable name, already in the file's own vocabulary
  // (`width`, `paddingTop`, `topLeftRadius`) — the property key needs no translation.
  for (const [property, planVar] of Object.entries(n.bound ?? {})) emitVar(here_, property, planVar);
  if (n.paints?.fills) emitVar(here_, 'fills', n.paints.fills);
  if (n.paints?.strokes) emitVar(here_, 'strokes', n.paints.strokes);
  // `descendantFills` is a PLAN concept, not a Figma property: "the ink of the vector inside this
  // node". Kept under its plan name here and matched permissively on the actual side — see diff.ts.
  if (n.descendantFills) emitVar(here_, 'descendantFills', n.descendantFills);
  // A style name is NOT materialized — `materialization-renames.ts` rewrites variable names, not
  // style names, so these are already what the live file carries and must NOT be root-prefixed.
  if (n.textStyle) emitStyle(here_, 'textStyle', n.textStyle);
  if (n.effectStyle) emitStyle(here_, 'effectStyle', n.effectStyle);
  for (const c of n.children) walkBindings(c, `${here_ === '/' ? '' : here_}/${c.name}`, emitVar, emitStyle);
};

/** Variant property names as they LAND in Figma — parsed back out of the member coordinate strings.
 *
 *  Deliberately not `def.figmaProperties.variantAxes`, which is the DECLARATION and omits both the
 *  state axis and the slot axes: button declares 3 and its set carries 6. Figma derives a set's
 *  properties from its members' names (`combineAsVariants`), so the name is what the file will show a
 *  designer, and the name is what an actual-side read can see. */
const axesOf = (memberNames: readonly string[]): string[] =>
  [...new Set(memberNames.flatMap((m) => m.split(', ').map((s) => s.slice(0, s.indexOf('=')))))]
    .filter((a) => a.length > 0)
    .sort();

// ── CONTRAST CONTRACTS ──────────────────────────────────────────────────────────────────────────

/** A ground that is a palette STEP (`neutral.050`) rather than a role — a real, intentional form
 *  (`lint-ratio-truth.ts` carries the same predicate). */
const isPaletteStep = (s: string): boolean => /^[a-z][a-z0-9-]*\.\d+$/.test(s);

/**
 * The engine's per-mode contrast contracts, in re-measurable form.
 *
 * `resolveAllModes` returns, per mode, every role with the ground it is measured against (`against`),
 * the floor it must clear (`min`), the model that says HOW to measure it, and the ratio the engine got
 * on its own colors. Rows with `min === 0` carry no floor and are not contracts. `against: 'self'`
 * is a surface measured against itself — also not a contract.
 *
 * A role key maps to its variable by the same dotted↔slashed correspondence the emitter uses
 * (`text.primary` → `<root>/color/text/primary`); a palette-step ground maps under
 * `<root>/core/palette/`. Both are RESOLVED against the emitted table, and a row whose role or ground
 * does not resolve is DROPPED INTO `unmeasurable` rather than silently skipped — `diff.ts` reports the
 * count, because a contrast arm that quietly measured 40 of 219 contracts and said "clean" is
 * `docs/34`'s evidence-shaped-output-rather-than-silence shape.
 */
const buildContrast = (
  theme: Theme,
  root: string,
  emitted: Record<string, VarState>,
): { contracts: ContrastContract[]; unmeasurable: string[] } => {
  const contracts: ContrastContract[] = [];
  const unmeasurable: string[] = [];
  const varOf = (roleOrStep: string): string | null => {
    const slashed = roleOrStep.replace(/\./g, '/');
    const asRole = `${root}/color/${slashed}`;
    if (asRole in emitted) return asRole;
    if (isPaletteStep(roleOrStep)) {
      const asStep = `${root}/core/palette/${slashed}`;
      if (asStep in emitted) return asStep;
    }
    return null;
  };
  for (const m of resolveAllModes(theme)) {
    const roles = m.roles as Record<
      string,
      { hex: string; against?: string; ratio?: number; min?: number; alpha?: number; model: string; legibleFor?: string }
    >;
    for (const [role, r] of Object.entries(roles)) {
      if (!r.min || r.min <= 0 || r.ratio == null) continue;
      const against = r.against;
      if (!against || against === 'self') continue;
      const roleVariable = varOf(role);
      const againstVariable = varOf(against);
      if (!roleVariable || !againstVariable) {
        unmeasurable.push(`${m.mode}/${role}: ${!roleVariable ? `role` : `ground '${against}'`} maps to no emitted variable`);
        continue;
      }
      if (r.model === 'ink-on-composite') {
        // The wash models need BOTH extra fields to be recomputable at all; the engine's own gate
        // (`lint-ratio-truth.ts` arm E) treats a missing one as a failure rather than a skip, and so
        // does this — as an unmeasurable row, which is reported rather than dropped.
        const ink = r.legibleFor == null ? null : varOf(r.legibleFor);
        if (r.legibleFor == null || r.alpha == null || !ink) {
          unmeasurable.push(
            `${m.mode}/${role}: model 'ink-on-composite' but ${r.legibleFor == null ? 'no legibleFor' : r.alpha == null ? 'no alpha' : `legibleFor '${r.legibleFor}' maps to no emitted variable`}`,
          );
          continue;
        }
        contracts.push({
          mode: m.mode, role, roleVariable, against, againstVariable, min: r.min,
          model: 'ink-on-composite', legibleFor: r.legibleFor, legibleForVariable: ink,
          alpha: r.alpha, engineRatio: r.ratio,
        });
      } else {
        contracts.push({
          mode: m.mode, role, roleVariable, against, againstVariable, min: r.min,
          model: 'ink-on-surface', engineRatio: r.ratio,
        });
      }
    }
  }
  return { contracts, unmeasurable };
};

// ── THE EMITTER ─────────────────────────────────────────────────────────────────────────────────

export type ExpectedResult = {
  state: State;
  /** Facts about the BUILD of the expected state — not findings about a file. Printed to stderr by the
   *  CLI so stdout stays pure JSON, and carried here so `--selftest` can assert on them. */
  notes: string[];
};

export const expected = (brand: string): ExpectedResult => {
  const notes: string[] = [];
  const files = readEmission(brand);
  const { variables, collections } = buildVariables(files);
  const root = rootOf(Object.keys(variables), `packages/engine/out/figma/${brand}/`);
  const { styles, counts: styleCounts } = readStyles(brand);
  notes.push(
    `style definitions read: ${Object.keys(styles).length} across ` +
      `${STYLE_KINDS.map((k) => `${styleCounts[k] ?? 0} ${k}`).join(', ')}`,
  );

  const bindings: State['bindings'] = {};
  const structure: State['structure'] = {};
  const unresolved = new Set<string>();
  for (const def of componentDefs) {
    if (!def.figmaProperties) continue;
    const asComponents = def.figmaProperties.emitAsComponents === true;
    const plans = figmaAnatomySet(def, { swapTarget: 'FPO-default-icon' });
    const members: string[] = [];
    for (const plan of plans) {
      const coord = planComponentName(plan);
      // `emitAsComponents` (#1012) leaves each member a standalone top-level `<id>/<value>` component
      // rather than a variant in a set, so its member identity in the FILE is that name. Using the
      // variant coordinate here would report a correct 43-icon library as 43 missing members.
      const member = asComponents ? `${def.id}/${coordValue(coord)}` : coord;
      members.push(member);
      walkBindings(
        plan.root as AnatomyPlan['root'],
        '',
        (node, property, planVar) => {
          const full = materializeName(planVar, root, variables, unresolved);
          if (!full) return;
          bindings[bindKey(def.id, member, node, property)] = { boundVariable: full };
        },
        (node, property, styleName) => {
          bindings[bindKey(def.id, member, node, property)] = { boundStyle: styleName };
        },
      );
    }
    structure[def.id] = {
      members: [...members].sort(),
      axes: asComponents ? [] : axesOf(plans.map(planComponentName)),
      emitAs: asComponents ? 'components' : 'set',
    };
  }
  if (unresolved.size > 0)
    notes.push(
      `${unresolved.size} plan variable name(s) resolve to no emitted variable for brand '${brand}' and ` +
        `carry NO expected binding as a result — a hole in this expected state, not a finding about any ` +
        `file: ${[...unresolved].sort().slice(0, 8).join(', ')}${unresolved.size > 8 ? ', …' : ''}`,
    );

  const themeFn = THEME_OF[brand];
  if (!themeFn)
    throw new Error(
      `brand '${brand}' has an emission on disk but no entry in this file's THEME_OF table, so its ` +
        `contrast contracts cannot be built. That is a FAILURE, not a skip: a scan missing the contrast ` +
        `category would report clean over every AA failure in the file. Add '${brand}' to THEME_OF.`,
    );
  const { contracts, unmeasurable } = buildContrast(themeFn(), root, variables);
  if (unmeasurable.length > 0)
    notes.push(
      `${unmeasurable.length} contrast contract(s) are not re-measurable and are EXCLUDED from the ` +
        `expected state: ${unmeasurable.slice(0, 5).join(' | ')}${unmeasurable.length > 5 ? ' | …' : ''}`,
    );

  return {
    notes,
    state: {
      format: FORMAT,
      version: VERSION,
      side: 'expected',
      from: brand,
      root,
      engineVersion: ENGINE_VERSION,
      collections,
      variables,
      bindings,
      structure,
      styles,
      contrast: contracts,
    },
  };
};

const isMain = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (isMain) {
  const arg = process.argv[2];
  if (!arg || arg === '--brands' || arg === '--help' || arg === '-h') {
    const disk = brandsOnDisk();
    const missingTheme = disk.filter((b) => !THEME_OF[b]);
    console.log(`usage: npx tsx tools/conformance-scan/expected.ts <brand> > expected.json\n`);
    console.log(`brands with an emission under packages/engine/out/figma/: ${disk.join(', ') || '(none)'}`);
    console.log(`brands this tool can build contrast contracts for:       ${Object.keys(THEME_OF).sort().join(', ')}`);
    if (missingTheme.length) console.log(`\n  ⚠ on disk but NOT in THEME_OF (would fail): ${missingTheme.join(', ')}`);
    process.exit(arg ? 0 : 1);
  }
  const { state, notes } = expected(arg);
  for (const n of notes) console.error(`[expected] note: ${n}`);
  const styleBinds = Object.values(state.bindings).filter((b) => 'boundStyle' in b).length;
  console.error(
    `[expected] ${arg}: root '${state.root}' · ${Object.keys(state.variables).length} variables in ` +
      `${Object.keys(state.collections).length} collections · ${Object.keys(state.bindings).length} bindings ` +
      `(${Object.keys(state.bindings).length - styleBinds} to variables, ${styleBinds} to styles) · ` +
      `${Object.keys(state.structure).length} components · ${Object.keys(state.styles ?? {}).length} styles · ` +
      `${state.contrast.length} contrast contracts · engine ${state.engineVersion}`,
  );
  console.log(JSON.stringify(state, null, 2));
}
