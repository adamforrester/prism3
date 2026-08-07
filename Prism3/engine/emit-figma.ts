/**
 * emit-figma.ts — I/O shell: the DTCG token tree → a Figma import artifact (docs/10).
 *
 * COLLECTION NAMING (#66, 2026-07-05): the PRIMITIVE collections carry a `core-` prefix so a
 * designer scans primitives-vs-semantics at a glance in Figma's collection list —
 * `core-palette` / `core-dimension` / `core-font`, and `type-sets` (the responsive fluid-size
 * collection, ex-`font-fluid`). This is a **collection-label** convention only: the DTCG token
 * tree, the `<root>.*` namespace, and — crucially — the Figma VARIABLE NAMES are unchanged. Every
 * variable name still mirrors its DTCG path (`palette/red/550`, `font/family/display`,
 * `font-fluid/…`), so the `variableId` round-trip and every cross-collection alias resolve
 * exactly as before. Semantic collections keep their bare names (`color`, `space`, `radius`,
 * `size`, `icon`, `border-width`, `focus`, `opacity`, `layout`). See docs/00 + issue #66/#67 (Token Press).
 *
 * Axes shipped:
 *   • COLOUR — `core-palette` primitives (Default mode) + `color` semantics (4 modes),
 *     every semantic a VARIABLE_ALIAS into a `palette/…` variable. Byte-reproduces
 *     `fixtures/figma/nb/{palette,color.<mode>}.json` (variable names/scopes/aliases/values).
 *   • TYPOGRAPHY — `core-font` primitives (family STRING + size/weight FLOAT + weight-role
 *     FLOAT aliased) + `type-sets` (per-mode FLOATs for the fluid composites) +
 *     text styles for every composite, applying the six §4 fixes: (1) no wrapper
 *     `text/` prefix; (2) prescribed collection names (`core-font`, `type-sets`);
 *     (3a) lineHeight baked as PERCENT (unitless × 100 — mode/size-independent);
 *     (3b) letterSpacing baked as PERCENT (em × 100 — this PR bakes; a follow-up
 *     lands bindable tracking FLOATs); (4) primary family bound + full stack in
 *     description; (5) fontStyle derived from the weight-role via a named-instance
 *     table (mono falls back for weights it lacks).
 *   • DIMS — the whole geometric layer emitted as EIGHT FLOAT collections:
 *     `core-dimension` (fine-grid primitives), `space`/`radius`/`size`/`icon`/`border-width`/
 *     `focus` (all aliased into a `dimension/…` variable — the primitives are shared) + `opacity`
 *     (0–100 percent for Figma OPACITY scope, converted from the DTCG 0–1). No
 *     fixtures for this axis (§2 covers colour + typography only), so the gate is
 *     structural: counts match the DTCG tree, every alias target resolves within
 *     the emitted collections, scopes/resolvedType consistent per family.
 *     `focus.ring.style` (`strokeStyle: 'solid'`) is skipped — Figma has no
 *     `strokeStyle` variable primitive; it stays a code-side literal.
 *   • LAYOUT — one `layout` variable collection with FIVE breakpoint modes
 *     (`sm`/`md`/`lg`/`xl`/`2xl`). Each mode carries the same variable names
 *     (`breakpoint/*`, `grid/columns`, `grid/gutter`, `grid/margin`,
 *     `container/max`, `container/narrow`) with different values/aliases per
 *     mode; gutter/margin per-mode alias into `space/*`. Composes independently
 *     with the colour light/dark collection: `mode` here is the *viewport*,
 *     over there it's the *theme*. `container/fluid` (100%) skipped — no Figma
 *     variable primitive for percentage-of-parent.
 *   • SHADOW + GRADIENT — Effect Styles + Paint Styles (not variables — docs/08
 *     §5 variable-type ceiling). Shadow emits TWO style sets per step (light in
 *     `shadow/*`, dark in `shadow-dark/*`) because Figma Effect Styles don't
 *     support modes — a plugin/component swaps the pair by mode. Gradient emits
 *     Paint Styles for brands that opt in (empty for NB, populated for Aurora).
 *     Only stop COLOURS bind to palette variables; kind/angle/positions bake
 *     into the style. `sampledStops` (5-point sRGB pre-sample of the OKLCH
 *     curve) rides alongside so plugins can approximate OKLCH interpolation
 *     with denser sRGB stops (Figma interpolates in sRGB only).
 *
 * The engine's DTCG carries the *semantic* facts (aliases, per-mode targets, fluid
 * `responsive.figma.modes`, weight-role → numeric); the *Figma-target rendering*
 * lives HERE, not in the DTCG: role-family → scopes, the name transform (strip
 * namespace, dots→slashes; DTCG steps are already zero-padded), per-mode alias
 * resolution, fontStyle derivation, letter-spacing/line-height baking. Reads the
 * pure `tree.ts` `buildTree`, so no engine output is touched. Materialiser (the
 * Figma-MCP thread) plays this artifact in; Figma assigns the real variable ids
 * and resolves aliases by name, so we emit no ids.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Theme, brandTheme } from './theme';
import { nbTheme } from './nb-fixture';
import { parseDesignMd } from './design-md';
import { parseStandardDesignMd, standardToBrandInput } from './standard-design-md';
import { buildTree } from './tree';
// Colour axis + the shared pure helpers/types live in the node-free `emit-figma-color`
// module (so they can bundle into the Figma plugin main thread + the browser — #108). This
// shell re-exports them, so every existing `from './emit-figma'` importer + the CLI below are
// unchanged; the non-colour axes (font/dims/layout/shadow/gradient) still live here and reuse
// `figName` / `parseColor` / `desc` / `leaves` / `stripNs` imported back from that module.
import type {
  FigmaColor, FigmaVarValue, FigmaResolvedType, FigmaVar, FigmaCollectionFile,
} from './emit-figma-color';
import { COLOR_MODES, figName, parseColor, desc, leaves, stripNs, buildFigmaColor } from './emit-figma-color';
export type {
  FigmaColor, FigmaVarValue, FigmaResolvedType, FigmaVar, FigmaCollectionFile,
} from './emit-figma-color';
export { COLOR_MODES, figName, parseColor, buildFigmaColor } from './emit-figma-color';
// DIMS + LAYOUT FLOAT axes — extracted node-free (#146) so they bundle into the Figma plugin
// (like the colour core). Imported for the CLI below + re-exported so every `from './emit-figma'`
// importer (and `test.ts`) stay unchanged.
import { buildFigmaDims, buildFigmaLayout } from './emit-figma-dims';
import type { FigmaDimsCollections } from './emit-figma-dims';
export type { FigmaDimsCollections } from './emit-figma-dims';
export { buildFigmaDims, buildFigmaLayout, LAYOUT_MODES } from './emit-figma-dims';
// SHADOW (Effect Styles) + GRADIENT (Paint Styles) — extracted node-free (shadow/gradient lane) so
// they bundle into the plugin. Imported for the CLI below + re-exported so every `from './emit-figma'`
// importer (and `test.ts`) stay unchanged.
import { buildFigmaShadow, buildFigmaGradient } from './emit-figma-styles';
export type {
  FigmaEffect, FigmaEffectStyle, FigmaEffectStylesFile,
  FigmaPaintStop, FigmaPaintStyle, FigmaPaintStylesFile,
} from './emit-figma-styles';
export { buildFigmaShadow, buildFigmaGradient } from './emit-figma-styles';
// TYPOGRAPHY (docs/10 §4) — `core-font`/`type-sets` variables + Text Styles. Extracted node-free
// (#237) so they bundle into the plugin. Imported for the CLI below + re-exported so every
// `from './emit-figma'` importer (and `test.ts`) stay unchanged.
import { buildFigmaFont, buildFigmaFontFluid, buildFigmaTextStyles } from './emit-figma-font';
export type { FigmaTextStyleProp, FigmaTextStyle, FigmaTextStylesFile } from './emit-figma-font';
export { buildFigmaFont, buildFigmaFontFluid, buildFigmaTextStyles, fontStyleName, FONT_FLUID_MODES } from './emit-figma-font';
// ---------------------------------------------------------------------------
// DIMS + LAYOUT — the geometric FLOAT axes. `pxFromValue` / `aliasFigName`, the scope
// maps, `FigmaDimsCollections`, `buildFigmaDims`, `buildFigmaLayout`, and `LAYOUT_MODES`
// are extracted to the node-free `emit-figma-dims.ts` (#146 — so they bundle into the
// Figma plugin main thread, exactly as the colour core did in `emit-figma-color.ts`).
// This shell re-exports them (below the shadow/gradient axes), so the CLI + every
// `from './emit-figma'` importer are unchanged. The eight dims collections
// (`core-dimension`/`space`/`radius`/`size`/`icon`/`border-width`/`focus`/`opacity`) + the
// per-breakpoint `layout` collection now live there.
// ---------------------------------------------------------------------------


/** One emitted file: a path relative to the brand's Figma directory, and the exact bytes to write. */
export type FigmaArtifact = { path: string; content: string };

/** The serializer every Figma artifact goes through. Two-space indent + a trailing newline is the
 *  committed convention; `regen --check` compares BYTES, so this is load-bearing formatting, not
 *  style. It exists as one function so the write path and any future reader cannot disagree. */
const json = (v: unknown): string => JSON.stringify(v, null, 2) + '\n';

/**
 * Every Figma file a brand emits — as data, not as a side effect.
 *
 * Extracted from the `isMain` block below, which had the filename conventions, the content and the
 * `writeFileSync` calls interleaved in one pass, reachable only by running this module as a script.
 * Two lanes need the same answer to *"what files does this brand produce, and what is in them"* —
 * writing them to a caller-chosen directory, and serving them without a filesystem at all — and a
 * script body can serve neither. Deriving both from one function is what stops them disagreeing about
 * what a brand's artifact set even is.
 *
 * Paths are relative to the brand's own directory (`core-palette.json`, not `out/figma/nb/…`), so the
 * caller owns the root. The per-mode filename rules are the interesting part and are preserved
 * exactly: a brand with no per-mode typography emits one `core-font.json`, one with overrides emits
 * `core-font.<mode>.json`; radius follows the same shape. Both conventions exist so that a brand not
 * using the feature emits byte-identical output to the pre-feature world, which is precisely the
 * property a careless extraction would destroy.
 *
 * Returns the summary line too, built from the same pass — computing it separately would mean
 * building every collection twice and inviting the counts to drift from the files they describe.
 */
export const figmaArtifacts = (theme: Theme): { artifacts: FigmaArtifact[]; summary: string } => {
  const artifacts: FigmaArtifact[] = [];
  const add = (path: string, value: unknown): void => { artifacts.push({ path, content: json(value) }); };

  const { palette, color } = buildFigmaColor(theme);
  // Filenames follow the $collection label (so the core-*/type-sets rename carries through).
  add(`${palette.$collection}.json`, palette);
  for (const c of color) add(`${c.$collection}.${c.$mode}.json`, c);

  // core-font is per-mode (Phase D): a brand with no per-mode typography emits ONE `core-font.json`
  // (byte-identical to pre-D); a brand overriding font family/weight per mode emits per-mode
  // filenames `core-font.<mode>.json`, matching the colour/radius per-mode convention.
  const fontFiles = buildFigmaFont(theme);
  if (fontFiles.length === 1) add('core-font.json', fontFiles[0]);
  else for (const f of fontFiles) add(`core-font.${f.$mode}.json`, f);

  const fluid = buildFigmaFontFluid(theme);
  for (const f of fluid) add(`${f.$collection}.${f.$mode}.json`, f);

  const textStyles = buildFigmaTextStyles(theme);
  add('text-styles.json', textStyles);

  const dims = buildFigmaDims(theme);
  // Radius is per-mode (docs/11 Pillar 1b): a non-wireframe brand emits ONE Default-mode file at
  // `radius.json` (byte-identical to the pre-1b world); a wireframe-opted-in brand emits per-mode
  // filenames `radius.Default.json` + `radius.wireframe.json`, matching the colour axis convention.
  for (const [key, val] of Object.entries(dims)) {
    if (key === 'radius') {
      const arr = val as FigmaCollectionFile[];
      if (arr.length === 1) add('radius.json', arr[0]);
      else for (const c of arr) add(`radius.${c.$mode}.json`, c);
    } else {
      const coll = val as FigmaCollectionFile;
      add(`${coll.$collection}.json`, coll);
    }
  }
  const dimsCount = (Object.values(dims) as (FigmaCollectionFile | FigmaCollectionFile[])[]).reduce((n, v) => {
    if (Array.isArray(v)) return n + v[0].variables.length; // radius: count once (same names across modes)
    return n + v.variables.length;
  }, 0);

  const layout = buildFigmaLayout(theme);
  for (const l of layout) add(`layout.${l.$mode}.json`, l);
  const shadows = buildFigmaShadow(theme);
  add('shadow-styles.json', shadows);
  const gradients = buildFigmaGradient(theme);
  add('gradient-styles.json', gradients);

  const summary = `palette ${palette.variables.length} + color ${color.length}×${color[0].variables.length} + font ${fontFiles[0].variables.length}${fontFiles.length > 1 ? `×${fontFiles.length}modes` : ''} + font-fluid ${fluid.length}×${fluid[0].variables.length} + text-styles ${textStyles.styles.length} + dims ${dimsCount} (${Object.keys(dims).length} colls) + layout ${layout.length}×${layout[0].variables.length} + shadow ${shadows.styles.length} + gradient ${gradients.styles.length}`;
  return { artifacts, summary };
};

// ---------------------------------------------------------------------- I/O
const here = dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
/** Compile an engine-native design.md at `<engine>/../examples/<file>` → Theme. */
const compileNative = (file: string): Theme =>
  brandTheme(parseDesignMd(readFileSync(resolve(here, `../examples/${file}`), 'utf8')).input);
/** Compile a STANDARD-dialect design.md (brand-skills / google-labs) → Theme via
 *  the reader + colour-role classifier + x-prism3 lever mapping. */
const compileStandard = (file: string): Theme =>
  brandTheme(standardToBrandInput(parseStandardDesignMd(readFileSync(resolve(here, `../examples/${file}`), 'utf8'))).input);

if (isMain) {
  // Generalise (docs/10 §7 item 6). NB is the byte-fixture regression target;
  // AURORA proves the alias-driven Paint Style path (it opts into gradients and
  // sets `action = accent`, so its colour axis exercises a decoupled action
  // palette); WENDYS proves the standard-dialect front door (parseStandard +
  // classifier + brandTheme → the same emit-figma shell). All three write to
  // out/figma/<id>/. No new adapter code — the axes are already brand-agnostic;
  // this is where that claim gets exercised.
  const brands: Array<{ id: string; theme: Theme }> = [
    { id: 'nb', theme: nbTheme() },
    { id: 'aurora', theme: compileNative('aurora.design.md') },
    { id: 'wendys', theme: compileStandard('wendys.design.md') },
  ];
  for (const { id, theme } of brands) {
    const dir = resolve(here, 'out/figma', id);
    mkdirSync(dir, { recursive: true });
    const { artifacts, summary } = figmaArtifacts(theme);
    for (const a of artifacts) writeFileSync(resolve(dir, a.path), a.content);
    console.log(`[figma] ${id}: ${summary}`);
  }
}
