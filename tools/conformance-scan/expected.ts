/**
 * CONFORMANCE SCAN — THE EXPECTED HOST-TRUTH (#1553 Phase 1, half one of two).
 *
 *   npx tsx tools/conformance-scan/expected.ts <brand> > expected.json
 *   npx tsx tools/conformance-scan/expected.ts --design <path/to.design.md> > expected.json
 *   npx tsx tools/conformance-scan/expected.ts --brands        # what <brand> can be, and why
 *   npx tsx tools/conformance-scan/expected.ts --selftest      # the config input reaches the projection
 *
 * Answers "what SHOULD be in a Figma file built from this engine, for this brand?" in the normalized
 * shape `state.ts` defines, so `diff.ts` can compare it against a live file read through
 * figma-console-mcp. Read-only: it writes nothing but stdout.
 *
 * ── IT REUSES THE ENGINE'S OUTPUT RATHER THAN RE-DERIVING IT ────────────────────────────────────
 *
 * Four sources, and the choice of source per category is the load-bearing design decision here:
 *
 *   1. VARIABLES + STYLES — the emitted Figma files. For a committed brand, read out of
 *      `packages/engine/out/figma/<brand>/*.json`: those bytes are what a designer's file is actually
 *      built from (the same argument `lint-cut-binding.ts` and `lint-absolute-inset.ts` make for
 *      reading them). For a config supplied with `--design`, there are no committed bytes to read —
 *      nobody ran `regen` for that config — so they come from `figmaArtifacts(theme)`, the function
 *      `regen` itself writes through. Measured: for aurora's own `design.md`, all 27 artifacts are
 *      BYTE-IDENTICAL to the committed tree, and for wendys all 26 are too. So this is one emission
 *      reached two ways, not a second derivation of it — and `--selftest` asserts that, per brand and
 *      in both dialects, so the day the two stop agreeing is the day that arm goes red.
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
 *
 * ── THE CONFIG IS AN INPUT, NOT AN ASSUMPTION (#1569) ───────────────────────────────────────────
 *
 * A brand id names ONE config: the committed `examples/<brand>.design.md`. Real themes are not built
 * at that config — an operator moves levers in the studio (density, breakpoints, radius scale, …) and
 * THEN applies. Measured on the first live run: a correct aurora file emitted at comfortable /
 * 2 breakpoints reported ~92 token-tier findings against the committed compact / 6-breakpoint
 * expectation, and not one of them was drift. Every one was the lever delta — `control/size` and
 * `size/*` a uniform rung up, a `dimension` rung present on one side and absent on the other, the
 * `layout` collection's whole mode shape, the `breakpoint` values, the `Grid / *` styles.
 *
 * So the config is supplied: `--design <file>` builds the expectation from the exact brief the theme
 * was emitted from (the studio's own "Export design.md" round-trips into it), and `<brand>` keeps
 * meaning what it meant — the committed default config, unchanged.
 *
 * WHICH DIRECTION THE CONFIG MAY TRAVEL, and it is the whole independence argument (`docs/34` shape 1).
 * The expectation is built from the engine's PROJECTION of the supplied config: config → `brandTheme`
 * → `figmaArtifacts` → this `State`, every step the same code the studio and the plugin run. It is
 * never re-derived from the `actual.json` it will be compared against. A config inferred from the
 * file's own token values would make the scan agree with the file BY CONSTRUCTION: every drift would
 * read as "well, that must be the config it was built at", and the scan would report clean over
 * exactly the defects it exists to find. The supplied design file records what the emitter was TOLD,
 * upstream of what it produced, which is why it is admissible evidence and the file's own values are
 * not. (This is also why `expected.ts` takes a config and not a figma file, and why the companion
 * option — the plugin stamping the emitted config into the document as provenance the scan READS —
 * would remain admissible under the same rule, while inferring the config would not. Not built here;
 * it is an emission decision the owner holds. Filed as the durable follow-up to this.)
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
import { figmaArtifacts } from '../../packages/engine/emit-figma';
import { validateBrandInput } from '../../packages/engine/emit-dtcg';
import { nbTheme } from '../../packages/engine/nb-fixture';
import { parseDesignMd } from '../../packages/engine/design-md';
import {
  isStandardDesignMd,
  parseStandardDesignMd,
  standardToBrandInput,
} from '../../packages/engine/standard-design-md';
import { resolveAllModes } from '../../packages/engine/modes';
import { ENGINE_VERSION } from '../../packages/engine/version';
import type { BrandInput, Theme } from '../../packages/engine/theme';
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

// ── A CONFIG, WHEREVER IT CAME FROM, BECOMES A THEME ONE WAY ─────────────────────────────────────

/** Which config an expectation is built from. `brand` is the committed default; `design` is the brief
 *  the theme was actually emitted from, levers and all (#1569). */
export type ExpectedSource = { kind: 'brand'; brand: string } | { kind: 'design'; path: string };

/**
 * A design file → the `BrandInput` the engine compiles.
 *
 * The dialect is DETECTED, never declared — the same auto-detection `cli.ts` does (#556), because an
 * operator exporting a brief from the studio has no reason to know which dialect it came out as, and a
 * hand-picked parser per call site is how the two dialects drift apart. `.json` is accepted too: that
 * is the shape Apply posts to the plugin (`lastGoodInput`), so a `BrandInput` captured from the host is
 * usable directly without a round trip through markdown.
 *
 * `validateBrandInput` runs before `brandTheme`, for the reason `cli.ts` gives: the contract violation
 * is a readable list, and the stack trace `brandTheme` throws four levels down is not.
 */
const inputFromDesignFile = (path: string): BrandInput => {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new Error(`cannot read the design file: ${path}`);
  }
  let input: BrandInput;
  if (path.endsWith('.json')) {
    input = JSON.parse(text) as BrandInput;
  } else {
    let std;
    try {
      std = parseStandardDesignMd(text);
    } catch (e) {
      throw new Error(`parse error in ${path}: ${(e as Error).message}`);
    }
    input = isStandardDesignMd(std) ? standardToBrandInput(std).input : parseDesignMd(text).input;
  }
  const errs = validateBrandInput(input);
  if (errs.length)
    throw new Error(
      `${path} violates the BrandInput contract (schema/theme-schema.json):\n` +
        errs.map((x) => `   · ${x}`).join('\n'),
    );
  return input;
};

const themeFromDesignFile = (path: string): Theme => brandTheme(inputFromDesignFile(path));

/**
 * Brand id → the committed design file its config is read from.
 *
 * `nb` is absent ON PURPOSE and is not an omission: it has no `design.md` at all. It is a
 * hand-written regression fixture (`nb-fixture.ts`), which is the point of it — the brand whose numbers
 * were transcribed from the real New Balance tokens rather than generated from a brief.
 */
const DESIGN_OF: Record<string, string> = {
  aurora: 'examples/aurora.design.md',
  wendys: 'examples/wendys.design.md',
};

/**
 * Brand id → the Theme its contrast contract, and (for `--design`) its whole projection, is built from.
 *
 * A FOURTH hand-maintained copy of this table (`emit-figma.ts`, `token-contract.ts`,
 * `lint-figma-destination.ts` each keep their own) and deliberately not a fifth abstraction: the repo
 * has no exported brand registry, every existing site keeps a local table, and inventing a shared one
 * here would be a refactor of three files this task has no business touching.
 *
 * Every design-file brand is now built by the SAME loader an operator's `--design` goes through, which
 * is why the two entries below collapsed into `DESIGN_OF`. Before #1569 aurora went through
 * `readExampleBrand` (engine-native only) and wendys through `parseStandardDesignMd` (standard only) —
 * two hand-picked parsers for the thing dialect detection exists to decide. One loader also means
 * `--selftest` comparing the two paths is comparing the two SOURCES, not two parsers.
 *
 * It is NOT a list of scannable brands — `out/figma/` is (see `brandsOnDisk`). A brand present on disk
 * and absent here FAILS rather than skipping its contrast arm, the lesson `lint-figma-destination.ts`
 * records: a scan that quietly drops a category reports clean over the part it cannot see.
 */
const THEME_OF: Record<string, () => Theme> = {
  nb: () => nbTheme(),
  ...Object.fromEntries(
    Object.entries(DESIGN_OF).map(([brand, rel]) => [
      brand,
      () => themeFromDesignFile(resolve(engineDir, rel)),
    ]),
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

/**
 * One emitted Figma file as BYTES, whichever side produced them — read off `out/figma/<brand>/`, or
 * returned by `figmaArtifacts(theme)` for a supplied config.
 *
 * ONE parser consumes both, and that is the same rule `state.ts` exists for one level up: two readers
 * of the same bytes are two chances to key the result differently, and a name-keyed diff over two
 * different keyings is not noisier, it is useless (#1511). A brand and a `--design` run must produce
 * the same `State` for the same config or the difference is the tool's, not the file's — which is
 * precisely what `--selftest`'s first arm asserts, and it can only assert it because there is one
 * parser to be right or wrong.
 */
type SourceFile = { file: string; text: string };

const filesOnDisk = (brand: string): SourceFile[] => {
  const dir = resolve(engineDir, 'out/figma', brand);
  if (!existsSync(dir))
    throw new Error(
      `no emission at packages/engine/out/figma/${brand}/ — run \`npx tsx packages/engine/regen.ts\`, ` +
        `or pick one of: ${brandsOnDisk().join(', ') || '(none on disk)'}`,
    );
  return readdirSync(dir)
    .sort()
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ file: f, text: readFileSync(resolve(dir, f), 'utf8') }));
};

/** The same files a `regen` run would WRITE for this theme, without writing them. `figmaArtifacts` is
 *  the function `emit-figma.ts` serializes through, so these are the emission rather than a model of
 *  it — see the header's source 1 for the byte-identity measurement. */
const filesFromTheme = (theme: Theme): SourceFile[] =>
  figmaArtifacts(theme)
    .artifacts.map((a) => ({ file: a.path, text: a.content }))
    .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));

const parseEmission = (files: SourceFile[], whence: string): EmittedFile[] => {
  const out: EmittedFile[] = [];
  for (const { file, text } of files) {
    const j = JSON.parse(text) as {
      $collection?: unknown;
      $mode?: unknown;
      variables?: EmittedVar[];
    };
    // A STYLE file (`text-styles.json`) carries `styles`, not `variables`, and no `$mode`. Skipped
    // rather than half-modelled — see state.ts on why styles are out of this shape.
    if (!Array.isArray(j.variables)) continue;
    if (typeof j.$collection !== 'string')
      throw new Error(`${file} (from ${whence}): no string \`$collection\``);
    out.push({
      collection: j.$collection,
      mode: typeof j.$mode === 'string' ? j.$mode : undefined,
      variables: j.variables,
    });
  }
  if (out.length === 0) throw new Error(`no variable files in ${whence}`);
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
const parseStyles = (
  files: SourceFile[],
  whence: string,
): { styles: Record<string, StyleDef>; counts: Record<string, number> } => {
  const styles: Record<string, StyleDef> = {};
  const counts: Record<string, number> = {};
  for (const { file, kind } of STYLE_FILES) {
    const src = files.find((f) => f.file === file);
    if (!src) continue;
    const j = JSON.parse(src.text) as { styles?: Record<string, unknown>[] };
    if (!Array.isArray(j.styles)) throw new Error(`${file} (from ${whence}): no \`styles\` array`);
    counts[kind] = j.styles.length;
    for (const s of j.styles) {
      const def = styleDefOf(kind, s);
      const key = styleKey(kind, def.name);
      if (key in styles)
        throw new Error(
          `${file} (from ${whence}): two ${kind} styles are named '${def.name}' — the emission is not ` +
            `keyable by name`,
        );
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

/**
 * The four things a source has to answer, resolved in one place so the rest of `expected()` cannot
 * tell which kind it got. The `Theme` is resolved HERE for both kinds — a `--design` run has no
 * `THEME_OF` entry to look up and must not need one (that is the whole point: the config is not a
 * committed brand), and a brand run must still fail loudly when its entry is missing.
 */
const resolveSource = (
  source: ExpectedSource,
): { files: SourceFile[]; theme: Theme; from: string; whence: string } => {
  if (source.kind === 'design') {
    const theme = themeFromDesignFile(resolve(process.cwd(), source.path));
    return {
      files: filesFromTheme(theme),
      theme,
      // The path travels in `from`, so the diff report NAMES the config its expectation was built at.
      // A report that cannot say which levers it assumed is the #1569 confusion all over again.
      from: `${theme.id} ← ${source.path}`,
      whence: `figmaArtifacts() for '${theme.id}', built from ${source.path}`,
    };
  }
  const themeFn = THEME_OF[source.brand];
  if (!themeFn)
    throw new Error(
      `brand '${source.brand}' has an emission on disk but no entry in this file's THEME_OF table, so ` +
        `its contrast contracts cannot be built. That is a FAILURE, not a skip: a scan missing the ` +
        `contrast category would report clean over every AA failure in the file. Add '${source.brand}' ` +
        `to THEME_OF.`,
    );
  return {
    files: filesOnDisk(source.brand),
    theme: themeFn(),
    from: source.brand,
    whence: `packages/engine/out/figma/${source.brand}/`,
  };
};

export const expected = (source: ExpectedSource): ExpectedResult => {
  const notes: string[] = [];
  const { files, theme, from, whence } = resolveSource(source);
  if (source.kind === 'design')
    notes.push(
      `config SUPPLIED (#1569): brand '${theme.id}' built from ${source.path} — density ` +
        `${theme.dims.density}, radius scale ${theme.dims.radiusScaleValue}, ` +
        `${theme.layout.breakpoints.length} breakpoint(s). Nothing was read from ` +
        `packages/engine/out/figma/${theme.id}/, which holds the COMMITTED config's emission and would ` +
        `disagree with this one wherever a lever moved.`,
    );
  const { variables, collections } = buildVariables(parseEmission(files, whence));
  const root = rootOf(Object.keys(variables), whence);
  const { styles, counts: styleCounts } = parseStyles(files, whence);
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
      `${unresolved.size} plan variable name(s) resolve to no emitted variable for '${from}' and ` +
        `carry NO expected binding as a result — a hole in this expected state, not a finding about any ` +
        `file: ${[...unresolved].sort().slice(0, 8).join(', ')}${unresolved.size > 8 ? ', …' : ''}`,
    );

  const { contracts, unmeasurable } = buildContrast(theme, root, variables);
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
      from,
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

// ── THE SELF-CHECK: DOES THE SUPPLIED CONFIG ACTUALLY REACH THE PROJECTION? ──────────────────────
//
// `--design` is a wire, and a wire that is connected at one end reports success. The failure mode this
// arm exists for is the quiet one: the flag is accepted, the file is read, the brand is named in the
// output — and the expectation is still the committed config's, so a comfortable/2-breakpoint theme
// still reports ~92 findings and the operator now believes the tool was fixed. That is worse than the
// bug, because #1569 at least announced itself.
//
// So arm 1 builds the SAME brand at two configs that differ ONLY in two levers, and requires the two
// expectations to disagree at NAMED coordinates. Nothing about it can pass if the config is read and
// dropped. Arm 2 is the other side of the same claim: at the SAME config, the two sources must agree
// exactly — because `figmaArtifacts` is the function `regen` writes through, so a `--design` build of a
// committed brand's own brief must reproduce that brand's committed tree. Arm 1 without arm 2 would
// pass for a `--design` path that projects a config faithfully but differently from the emitter; arm 2
// without arm 1 would pass for a path that ignores the config entirely. Neither is worth much alone.

const FIXTURES = resolve(here, 'fixtures');

/** Key-sorted JSON, so two states built in different insertion orders still compare equal. Comparing
 *  raw `JSON.stringify` would make this arm fail on an ordering difference nothing downstream reads —
 *  `diff.ts` is name-keyed throughout. */
const canon = (v: unknown): string => {
  const walk = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object')
      return Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, val]) => [k, walk(val)]));
    return x;
  };
  return JSON.stringify(walk(v));
};

const selftest = (): boolean => {
  let ok = true;
  const check = (name: string, pass: boolean, detail: string): void => {
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
    if (!pass) ok = false;
  };

  // ── ARM 1: two configs, one brand, named differences ──────────────────────────────────────────
  const A = expected({ kind: 'design', path: resolve(FIXTURES, 'levers-compact-6bp.design.md') }).state;
  const B = expected({ kind: 'design', path: resolve(FIXTURES, 'levers-comfortable-2bp.design.md') }).state;

  // The premise: the two fixtures are the SAME brand. Without this, every check below would also pass
  // for two unrelated briefs, which would prove that `--design` reads A file and nothing more.
  check(
    'arm 1 premise: the two fixture configs are one brand at two lever settings',
    A.root === B.root && A.root === 'fxt',
    `roots '${A.root}' and '${B.root}'`,
  );

  const SIZE = 'fxt/control/size/md/height';
  const aSize = A.variables[SIZE]?.modes['Default'];
  const bSize = B.variables[SIZE]?.modes['Default'];
  check(
    `arm 1 density: ${SIZE} differs between compact and comfortable`,
    !!aSize && !!bSize && canon(aSize) !== canon(bSize),
    `compact ${canon(aSize)} vs comfortable ${canon(bSize)}`,
  );

  const aModes = A.collections['layout']?.modes ?? [];
  const bModes = B.collections['layout']?.modes ?? [];
  check(
    "arm 1 breakpoints: the 'layout' collection's mode set differs between 6 and 2 breakpoints",
    aModes.length > 0 && bModes.length > 0 && canon(aModes) !== canon(bModes),
    `6bp [${aModes.join(' ')}] vs 2bp [${bModes.join(' ')}]`,
  );

  const onlyA = Object.keys(A.variables).filter((n) => !(n in B.variables));
  const onlyB = Object.keys(B.variables).filter((n) => !(n in A.variables));
  check(
    'arm 1 rungs: each config emits variables the other does not',
    onlyA.length > 0 && onlyB.length > 0,
    `${onlyA.length} only at compact/6bp (${onlyA.slice(0, 3).join(', ')}), ` +
      `${onlyB.length} only at comfortable/2bp (${onlyB.slice(0, 3).join(', ')})`,
  );

  // ── ARM 2: one config, two sources, no difference ─────────────────────────────────────────────
  for (const [brand, rel] of Object.entries(DESIGN_OF)) {
    if (!brandsOnDisk().includes(brand)) {
      check(`arm 2 ${brand}: an emission is on disk to compare against`, false, `no packages/engine/out/figma/${brand}/`);
      continue;
    }
    const viaBrand = expected({ kind: 'brand', brand }).state;
    const viaDesign = expected({ kind: 'design', path: resolve(engineDir, rel) }).state;
    // `from` is the one field that MUST differ: it records the source, which is the point of it.
    check(
      `arm 2 ${brand}: the two sources disagree only about which source they are`,
      viaBrand.from !== viaDesign.from,
      `'${viaBrand.from}' vs '${viaDesign.from}'`,
    );
    for (const tier of ['collections', 'variables', 'styles', 'bindings', 'structure', 'contrast'] as const) {
      check(
        `arm 2 ${brand}: ${tier} built from ${rel} match the committed emission exactly`,
        canon(viaBrand[tier]) === canon(viaDesign[tier]),
        `${Object.keys(viaBrand[tier] ?? {}).length} vs ${Object.keys(viaDesign[tier] ?? {}).length} entries`,
      );
    }
    // The file SET, both directions: an `out/figma/<brand>/` file `figmaArtifacts` no longer writes
    // would otherwise be invisible above, because a tier built from fewer files can still agree on
    // every name it does carry.
    const disk = filesOnDisk(brand).map((f) => f.file);
    const mem = filesFromTheme(themeFromDesignFile(resolve(engineDir, rel))).map((f) => f.file);
    check(
      `arm 2 ${brand}: the two sources carry the same ${disk.length} files`,
      canon(disk) === canon(mem),
      `disk-only [${disk.filter((f) => !mem.includes(f)).join(' ')}] memory-only [${mem.filter((f) => !disk.includes(f)).join(' ')}]`,
    );
  }

  console.log(`\nSELF-CHECK: ${ok ? 'PASS' : 'FAIL'}`);
  return ok;
};

const isMain = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (isMain) {
  const arg = process.argv[2];
  if (!arg || arg === '--brands' || arg === '--help' || arg === '-h') {
    const disk = brandsOnDisk();
    const missingTheme = disk.filter((b) => !THEME_OF[b]);
    console.log(`usage: npx tsx tools/conformance-scan/expected.ts <brand> > expected.json`);
    console.log(`       npx tsx tools/conformance-scan/expected.ts --design <path/to.design.md> > expected.json`);
    console.log(`       npx tsx tools/conformance-scan/expected.ts --selftest\n`);
    console.log(`<brand> builds the COMMITTED config — the brand's own design.md, levers where it left them.`);
    console.log(`--design builds the config you SUPPLY, which is what a studio-themed file was emitted from:`);
    console.log(`         export design.md from the studio before Apply, and point this at it. Without it, every`);
    console.log(`         lever you moved reads as drift (#1569). Engine-native or standard dialect, detected;`);
    console.log(`         a BrandInput .json (what Apply posts) works too.\n`);
    console.log(`brands with an emission under packages/engine/out/figma/: ${disk.join(', ') || '(none)'}`);
    console.log(`brands this tool can build contrast contracts for:       ${Object.keys(THEME_OF).sort().join(', ')}`);
    console.log(`brands with a committed design file (--design's corpus):  ${Object.keys(DESIGN_OF).sort().join(', ')}`);
    if (missingTheme.length) console.log(`\n  ⚠ on disk but NOT in THEME_OF (would fail): ${missingTheme.join(', ')}`);
    process.exit(arg ? 0 : 1);
  }
  if (arg === '--selftest') process.exit(selftest() ? 0 : 1);

  let source: ExpectedSource;
  if (arg === '--design') {
    const path = process.argv[3];
    if (!path) {
      console.error(`✖ --design needs a path: expected.ts --design <path/to.design.md>`);
      process.exit(1);
    }
    source = { kind: 'design', path };
  } else {
    source = { kind: 'brand', brand: arg };
  }

  const { state, notes } = expected(source);
  for (const n of notes) console.error(`[expected] note: ${n}`);
  const styleBinds = Object.values(state.bindings).filter((b) => 'boundStyle' in b).length;
  console.error(
    `[expected] ${state.from}: root '${state.root}' · ${Object.keys(state.variables).length} variables in ` +
      `${Object.keys(state.collections).length} collections · ${Object.keys(state.bindings).length} bindings ` +
      `(${Object.keys(state.bindings).length - styleBinds} to variables, ${styleBinds} to styles) · ` +
      `${Object.keys(state.structure).length} components · ${Object.keys(state.styles ?? {}).length} styles · ` +
      `${state.contrast.length} contrast contracts · engine ${state.engineVersion}`,
  );
  console.log(JSON.stringify(state, null, 2));
}
