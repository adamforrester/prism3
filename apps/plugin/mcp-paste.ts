/**
 * The MCP paste GENERATOR (#111 / #1553) — turns a brand into the ordered `use_figma` scripts that do what
 * the plugin's Apply Theme and Build Components do, with the plugin closed.
 *
 * Runs in Node (tsx). Imports the plugin's own plan builders (`apply-theme.ts`'s `themePlans`) and bundles
 * the plugin's own executors (`src/mcp-steps.ts` → esbuild IIFE), so the paste path and the plugin path are
 * the same code cut at different places. `tools/figma-mcp/plan.ts` is the CLI over this module;
 * `test-mcp-paste.ts` is its gate. Not compiled by either plugin tsconfig — like `build.mjs`, it is build
 * tooling, not a context of the plugin.
 *
 * ── THE CEILING ───────────────────────────────────────────────────────────────────────────────────────
 * `use_figma` takes at most 50,000 characters of code. Every script this module emits is held to
 * `SCRIPT_CEILING` (45,000), measured on the FINISHED script (data + bundle + glue), never estimated — the
 * rule `planSetChunks` states and #761 learned. A plan that will not fit is split; a single indivisible
 * unit that will not fit is a thrown error, never a script over the ceiling.
 *
 * ── HOW THE THEME IS CUT (and why the cut is invisible in the file) ───────────────────────────────────
 * The plugin's apply is: fonts → pre-flight → [rename pre-pass → color → float → styles → grid → font →
 * text → persist]. The paste path keeps that order and cuts it into steps:
 *
 *   · PRE-FLIGHT, read-only, the whole `preflightPlanOf` output sliced across as many scripts as it needs.
 *     ALL of them run before ANY write; a conflict in any one means nothing is written (runbook rule 1).
 *   · COLOR as three passes, each sliced: palette rows, `color` create rows (literal fallbacks — pass A),
 *     then `color` alias rows (pass B). `applyWritePlan` resolves alias targets from what the FILE holds,
 *     so pass B finds every target pass A wrote in an earlier script, exactly as it would in one call.
 *   · FLOAT the same way, with one difference that is load-bearing: `applyFloatPlan` resolves aliases only
 *     among the collections in the call, so every alias script carries EVERY float collection (with no
 *     create rows), and only its own slice of alias rows.
 *   · FONT in one script — its rows carry literals and aliases together and alias across its two
 *     collections, so it cannot be cut; the size gate fails by name the day it outgrows one.
 *   · STYLES, GRID, TEXT sliced by row (each row is an independent find-or-create by name).
 *   · PERSIST last.
 * Every write step preloads the theme's fonts first (#680), because each `use_figma` call is a fresh run.
 * Each step re-runs `beginMigration`; after the first, the collection renames are `source-absent` no-ops,
 * so the rename pre-pass still happens once, before the first executor writes.
 */
import { build } from 'esbuild';
import type { Plugin } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { themePlans } from './src/apply-theme';
import type { ThemePlans } from './src/apply-theme';
import { preflightPlanOf } from './src/preflight';
import type { PreflightPlan } from './src/preflight';
import { pack } from './src/mcp-steps';
import type { Ledger, StepReport } from './src/mcp-steps';
import { orphansOf, strandedCollections } from './src/write-figma';
import { emitCoordValue } from './src/write-components';
import { materializeForBrand } from './src/brand-def';
import { missingDependencies, SWAP_TARGET } from './src/build-deps';
import { leafForDef, leafPageName } from './src/file-taxonomy';
import { figmaAnatomySet, figmaVarName, planComponentName, planSetChunks, planSetLayout, planToPluginJs } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import type { ComponentDef } from '@prism3/engine/component-schema';
import type { BrandInput } from '@prism3/engine/theme';
import type { WritePlan, FloatCollectionPlan, StylesPlan, GridStylePlan, TextStylePlan } from '@prism3/engine/write-plan';
import { ENGINE_VERSION } from '@prism3/engine/version';
import { parseDesignMd } from '@prism3/engine/design-md';
import { parseStandardDesignMd, isStandardDesignMd, standardToBrandInput } from '@prism3/engine/standard-design-md';

const HERE = dirname(fileURLToPath(import.meta.url));

/** `use_figma`'s code limit is 50,000 characters; this leaves 5,000 for what a count cannot see. */
export const SCRIPT_CEILING = 45_000;
/** Variables returned per read-back script — a page, so no single response carries the whole file. */
export const READBACK_PAGE = 150;
/** `number` rewrites `"step":0,"of":0` to at most `"step":9999,"of":9999` — eight more characters. */
const NUMBER_SLACK = 16;

/**
 * A `.design.md` brief → `BrandInput`, by the engine CLI's own dialect rule (`cli.ts`): a top-level flat
 * `colors:` map is the STANDARD dialect and goes through the classifier; anything else is engine-native.
 */
export const brandFromDesignMd = (text: string): BrandInput => {
  const std = parseStandardDesignMd(text);
  return isStandardDesignMd(std) ? standardToBrandInput(std).input : parseDesignMd(text).input;
};

/* ── bundling ──────────────────────────────────────────────────────────────────────────────────────── */

/**
 * THE ONE BUNDLER SUBSTITUTION, and why it is not a reimplementation. `rename-map.ts` imports
 * `figmaVarName` — a one-line dotted→slash mapping — from `anatomy-figma.ts`, and that import alone pulls
 * the whole component projector (≈61KB minified with `icon-glyphs.ts`) into every variable step, because
 * esbuild must keep that module's side-effecting top level. No payload budget survives it. So the import
 * is served from a virtual module whose body is the REAL function's own source (`figmaVarName.toString()`,
 * read from the module the plugin imports) — the same ship-the-source move the engine's payload uses for
 * `nestVariantMatch`. Any OTHER name imported from `anatomy-figma` fails the build ("No matching export"),
 * so a second dependency cannot slip in silently.
 */
const LIFTED: Record<string, Record<string, (...a: never[]) => unknown>> = {
  'anatomy-figma': { figmaVarName },
};
const liftPlugin: Plugin = {
  name: 'prism3-lift',
  setup(b) {
    // SIDE-EFFECT-FREE for tree-shaking, which is true of every module a step reaches: they export
    // functions and data, and none registers anything on import. Without it esbuild must keep every
    // imported module's top level even when nothing from it is used — `version.ts` builds `DEPRECATIONS`
    // at load, so every script paid ~12KB for a table only the rename pass reads. A module this wrongly
    // drops is one a step needed, which the parity gate executes and would fail on by name.
    b.onResolve({ filter: /^(\.{1,2}\/|@prism3\/engine\/)/ }, async (a) => {
      if (a.pluginData === 'resolving' || /(^|\/)anatomy-figma(\.ts)?$/.test(a.path)) return undefined;
      const r = await b.resolve(a.path, { kind: a.kind, importer: a.importer, resolveDir: a.resolveDir, pluginData: 'resolving' });
      if (r.errors.length) return { errors: r.errors };
      return { path: r.path, sideEffects: false };
    });
    b.onResolve({ filter: /(^|\/)anatomy-figma(\.ts)?$/ }, (a) => ({ path: 'anatomy-figma', namespace: 'prism3-lift', pluginData: a.importer }));
    b.onLoad({ filter: /.*/, namespace: 'prism3-lift' }, (a) => ({
      contents: Object.entries(LIFTED[a.path]).map(([n, f]) => `export const ${n} = ${f.toString()};`).join('\n'),
      loader: 'js',
    }));
  },
};

/** Every runtime export a script can call — one bundle each, so each script carries only its own step. */
export const STEP_EXPORTS = [
  'runPreflight', 'runColor', 'runFloat', 'runStyles', 'runGrid', 'runFont', 'runText', 'runPersist',
  'runReadbackVars', 'runReadbackStyles', 'runCleanupTheme',
  'runComponentChunk', 'runComponentEmit', 'runReadbackComponents', 'runCleanupPage',
] as const;

/** Built ONCE, when this module loads (esbuild's synchronous API refuses plugins, and the lift above is
 *  one). Minified IIFEs, each `var __p3=…` exposing `run`. */
const bundles = new Map<string, string>(await Promise.all(STEP_EXPORTS.map(async (name) => {
  const out = await build({
    stdin: { contents: `export { ${name} as run } from './src/mcp-steps';`, resolveDir: HERE, loader: 'ts' },
    bundle: true, minify: true, format: 'iife', globalName: '__p3', platform: 'neutral', target: 'es2020',
    mainFields: ['module', 'main'], write: false, plugins: [liftPlugin], legalComments: 'none',
  });
  return [name, out.outputFiles[0].text.trim()] as const;
})));
export const bundleStep = (exportName: string): string => {
  const hit = bundles.get(exportName);
  if (!hit) throw new Error(`no runtime bundle for '${exportName}'`);
  return hit;
};

/** A finished script: data, the bundle, the call. `payloads` are engine paste bodies (components only). */
const assemble = (exportName: string, data: unknown, payloads: string[] = []): string =>
  `const __D=${JSON.stringify(pack(data))};\n${bundleStep(exportName)}\n` +
  (payloads.length ? `const __P=[${payloads.map((p) => `async(figma)=>{\n${p}\n}`).join(',\n')}];\nreturn await __p3.run(__D,__P);\n` : 'return await __p3.run(__D);\n');

/* ── the manifest shape ────────────────────────────────────────────────────────────────────────────── */

export type Phase = 'preflight' | 'theme' | 'readback' | 'components' | 'component-readback' | 'cleanup';
export type Script = {
  phase: Phase;
  kind: string;
  label: string;
  purpose: string;
  /** What a clean result looks like, in one line the agent can check without reading this module. */
  expect: string;
  js: string;
  /** For report.ts: the def a component script builds, the names a read-back expects, and how many
   *  members the def's plan projects (the number the set's variant count is checked against). */
  def?: string;
  names?: string[];
  planned?: number;
};

/* ── packing helpers ───────────────────────────────────────────────────────────────────────────────── */

/**
 * Greedy slicing by the FINISHED script length. `make(slice)` returns the script for a slice; items are
 * added while the script stays under the ceiling. One item that cannot fit alone throws — the size gate
 * reports it by name rather than this module shipping a script the transport will refuse.
 */
const sliceBy = <T>(items: readonly T[], make: (slice: T[]) => string, what: string, ceiling: number = SCRIPT_CEILING): T[][] => {
  // Room for `number` to widen `"step":0,"of":0` to its real values after slicing.
  const fits = (js: string) => js.length + NUMBER_SLACK <= ceiling;
  const out: T[][] = [];
  let cur: T[] = [];
  for (const it of items) {
    const next = [...cur, it];
    if (fits(make(next))) { cur = next; continue; }
    if (!cur.length) throw new Error(`${what}: one item alone makes a ${make(next).length}-character script, over the ${ceiling} ceiling`);
    out.push(cur);
    cur = [it];
    if (!fits(make(cur))) throw new Error(`${what}: one item alone makes a ${make(cur).length}-character script, over the ${ceiling} ceiling`);
  }
  if (cur.length) out.push(cur);
  return out;
};

/** The only two fields of the text plan the #680 preload reads, deduplicated — ~1% of the plan. */
const fontsOf = (text: TextStylePlan) => {
  const seen = new Map<string, { fontFamilyPrimary: string; fontStyle: string }>();
  for (const r of text) seen.set(`${r.fontFamilyPrimary}|${r.fontStyle}`, { fontFamilyPrimary: r.fontFamilyPrimary, fontStyle: r.fontStyle });
  return [...seen.values()];
};

/* ── the theme ─────────────────────────────────────────────────────────────────────────────────────── */

/** `sliceCeiling` lowers the ceiling the SLICED passes pack to (never raises it) — the gate uses it to cut
 *  the plan into many more scripts than a real run would, and prove the file does not depend on where the
 *  cuts fall. The font script, which cannot be cut, is still held to `SCRIPT_CEILING`. */
type ThemeOpts = { ledger?: Ledger; sliceCeiling?: number };

/** The pre-flight plan exactly as `apply-theme.ts` builds it. */
export const preflightOf = (p: ThemePlans): PreflightPlan =>
  preflightPlanOf({ color: p.colorPlan, float: p.floatPlan, font: p.fontPlan, styles: p.stylesPlan, grid: p.gridPlan, text: p.textPlan });

/** Every theme script, in order: pre-flight, the writes, then the read-backs. Numbered by the caller. */
export const themeScripts = (input: BrandInput, opts: ThemeOpts = {}): Script[] => {
  const p = themePlans(input);
  const fonts = fontsOf(p.textPlan);
  const ledger = opts.ledger ? { ledger: opts.ledger } : {};
  const out: Script[] = [];
  const add = (s: Omit<Script, 'js'>, exportName: string, data: Record<string, unknown>, jsOf?: (d: Record<string, unknown>) => string) =>
    out.push({ ...s, js: jsOf ? jsOf(data) : assemble(exportName, data) });
  const common = (label: string) => ({ step: 0, of: 0, label, ...ledger });
  const ceil = Math.min(opts.sliceCeiling ?? SCRIPT_CEILING, SCRIPT_CEILING);
  const slice = <T>(items: readonly T[], make: (s: T[]) => string, what: string) => sliceBy(items, make, what, ceil);

  // PRE-FLIGHT — variable rows per collection, then styles per kind, as one flat item list.
  const pf = preflightOf(p);
  type PfItem = { col: number; row: PreflightPlan['variables'][number]['rows'][number] } | { kind: keyof PreflightPlan['styles']; name: string };
  const pfItems: PfItem[] = [
    ...pf.variables.flatMap((g, col) => g.rows.map((row) => ({ col, row }))),
    ...(Object.keys(pf.styles) as (keyof PreflightPlan['styles'])[]).flatMap((kind) => pf.styles[kind].map((name) => ({ kind, name }))),
  ];
  const pfPlan = (slice: PfItem[]): PreflightPlan => ({
    variables: pf.variables.map((g, col) => ({ collection: g.collection, rows: slice.flatMap((i) => ('col' in i && i.col === col ? [i.row] : [])) })).filter((g) => g.rows.length),
    styles: { effect: [], paint: [], grid: [], text: [], ...Object.fromEntries((Object.keys(pf.styles) as (keyof PreflightPlan['styles'])[]).map((k) => [k, slice.flatMap((i) => ('kind' in i && i.kind === k ? [i.name] : []))])) },
  });
  const pfSlices = slice(pfItems, (s) => assemble('runPreflight', { ...common('pre-flight'), plan: pfPlan(s) }), 'pre-flight');
  pfSlices.forEach((s, i) => add({
    phase: 'preflight', kind: 'preflight', label: `pre-flight ${i + 1}/${pfSlices.length}`,
    purpose: 'Read-only: checks every collection, variable and style this apply will touch for a conflict (a same-named item Prism3 did not make, or a variable of another type).',
    expect: '{ ok: true, conflicts: [] } — any conflict in any pre-flight script means: stop, write nothing, report the conflicts.',
  }, 'runPreflight', { ...common(`pre-flight ${i + 1}/${pfSlices.length}`), plan: pfPlan(s) }));

  // COLOR — three passes.
  const { modes } = p.colorPlan.color;
  const colorData = (label: string, plan: WritePlan) => ({ ...common(label), fonts, plan });
  const colorPass = (name: string, rows: unknown[], planOf: (rows: never[]) => WritePlan, purpose: string) => {
    const slices = slice(rows, (s) => assemble('runColor', colorData(name, planOf(s as never[]))), name);
    slices.forEach((s, i) => {
      const label = `${name} ${i + 1}/${slices.length}`;
      add({ phase: 'theme', kind: 'color', label, purpose, expect: '{ ok: true, misses: [] }' }, 'runColor', colorData(label, planOf(s as never[])));
    });
  };
  colorPass('palette', p.colorPlan.palette, (palette) => ({ palette, color: { modes, create: [], aliases: [] } }),
    'Writes a slice of the palette primitives into the `core` collection.');
  colorPass('color create', p.colorPlan.color.create, (create) => ({ palette: [], color: { modes, create, aliases: [] } }),
    'Creates a slice of the `color` variables with a literal value in every mode (pass A).');
  colorPass('color aliases', p.colorPlan.color.aliases, (aliases) => ({ palette: [], color: { modes, create: [], aliases } }),
    'Binds a slice of the `color` variables to their palette targets, per mode (pass B).');

  // FLOAT — create slices, then alias slices carrying every collection.
  type FItem = { col: number; row?: FloatCollectionPlan['create'][number] };
  const fItems: FItem[] = p.floatPlan.flatMap((c, col) => [{ col }, ...c.create.map((row) => ({ col, row }))]);
  const fCreate = (slice: FItem[]): FloatCollectionPlan[] =>
    p.floatPlan.flatMap((c, col) => (slice.some((i) => i.col === col) ? [{ ...c, create: slice.flatMap((i) => (i.col === col && i.row ? [i.row] : [])), aliases: [] }] : []));
  const floatData = (label: string, plans: FloatCollectionPlan[]) => ({ ...common(label), fonts, plans });
  const fcs = slice(fItems, (s) => assemble('runFloat', floatData('float create', fCreate(s))), 'float create');
  fcs.forEach((s, i) => {
    const label = `float create ${i + 1}/${fcs.length}`;
    add({ phase: 'theme', kind: 'float', label, purpose: 'Creates a slice of the dimension/space/radius/size/layout variables with their literal values.', expect: '{ ok: true, misses: [] }' }, 'runFloat', floatData(label, fCreate(s)));
  });
  type AItem = { col: number; row: FloatCollectionPlan['aliases'][number] };
  const aItems: AItem[] = p.floatPlan.flatMap((c, col) => c.aliases.map((row) => ({ col, row })));
  const fAlias = (slice: AItem[]): FloatCollectionPlan[] =>
    p.floatPlan.map((c, col) => ({ ...c, create: [], aliases: slice.flatMap((i) => (i.col === col ? [i.row] : [])) }));
  if (aItems.length) {
    const fas = slice(aItems, (s) => assemble('runFloat', floatData('float aliases', fAlias(s))), 'float aliases');
    fas.forEach((s, i) => {
      const label = `float aliases ${i + 1}/${fas.length}`;
      add({ phase: 'theme', kind: 'float', label, purpose: 'Binds a slice of the float variables to the dimension variables they alias, per mode.', expect: '{ ok: true, misses: [] }' }, 'runFloat', floatData(label, fAlias(s)));
    });
  }

  // STYLES (effect + paint), GRID.
  type SItem = { effect: StylesPlan['effects'][number] } | { paint: StylesPlan['paints'][number] };
  const sItems: SItem[] = [...p.stylesPlan.effects.map((effect) => ({ effect })), ...p.stylesPlan.paints.map((paint) => ({ paint }))];
  const sPlan = (s: SItem[]): StylesPlan => ({ effects: s.flatMap((i) => ('effect' in i ? [i.effect] : [])), paints: s.flatMap((i) => ('paint' in i ? [i.paint] : [])) });
  const sSlices = slice(sItems, (s) => assemble('runStyles', { ...common('styles'), fonts, plan: sPlan(s) }), 'styles');
  sSlices.forEach((s, i) => {
    const label = `effect + paint styles ${i + 1}/${sSlices.length}`;
    add({ phase: 'theme', kind: 'styles', label, purpose: 'Creates or updates the shadow (effect) and gradient (paint) styles.', expect: '{ ok: true, misses: [] }' }, 'runStyles', { ...common(label), fonts, plan: sPlan(s) });
  });
  const gSlices = slice(p.gridPlan, (s) => assemble('runGrid', { ...common('grid'), fonts, plan: s as GridStylePlan }), 'grid styles');
  gSlices.forEach((s, i) => {
    const label = `grid styles ${i + 1}/${gSlices.length}`;
    add({ phase: 'theme', kind: 'grid', label, purpose: 'Creates or updates one grid style per breakpoint.', expect: '{ ok: true }' }, 'runGrid', { ...common(label), fonts, plan: s });
  });

  // FONT — one script, by construction (see the header).
  const fontData = { ...common('font variables'), fonts, plans: p.fontPlan };
  const fontJs = assemble('runFont', fontData);
  if (fontJs.length + NUMBER_SLACK > SCRIPT_CEILING) throw new Error(`font variables: the one font script is ${fontJs.length} characters, over the ${SCRIPT_CEILING} ceiling, and it cannot be split (its aliases cross its two collections)`);
  out.push({ phase: 'theme', kind: 'font', label: 'font variables', purpose: 'Writes the font family/size/weight variables (`core` font group) and the fluid type sets.', expect: '{ ok: true, misses: [], refused: [] }', js: fontJs });

  // TEXT styles.
  const tSlices = slice(p.textPlan, (s) => assemble('runText', { ...common('text'), fonts, plan: s }), 'text styles');
  tSlices.forEach((s, i) => {
    const label = `text styles ${i + 1}/${tSlices.length}`;
    add({ phase: 'theme', kind: 'text', label, purpose: 'Creates or updates the text styles and binds them to the font variables.', expect: '{ ok: true, misses: [] } — `skipped` lists styles whose font this Figma lacks; that is a warning, not a failure.' }, 'runText', { ...common(label), fonts, plan: s });
  });

  // PERSIST.
  add({ phase: 'theme', kind: 'persist', label: 'persist brand', purpose: 'Stores the brand input on the file (shared plugin data, #131), as the plugin does after a clean apply.', expect: '{ ok: true }' }, 'runPersist', { ...common('persist brand'), input });

  // READ-BACK — enough variable pages for the plan plus headroom for orphans; `total` in each result says
  // whether the pages covered the file (report.ts checks it).
  const planned = p.colorPlan.palette.length + p.colorPlan.color.create.length + p.floatPlan.reduce((n, c) => n + c.create.length, 0) + p.fontPlan.reduce((n, c) => n + c.rows.length, 0);
  const pages = Math.ceil((planned * 1.25 + 50) / READBACK_PAGE);
  for (let i = 0; i < pages; i++) {
    const label = `read back variables ${i + 1}/${pages}`;
    add({ phase: 'readback', kind: 'readback-vars', label, purpose: 'Read-only: returns one page of the file\'s variables with their values, aliases, scopes and modes.', expect: 'Returns `variables`; save the whole result for report.ts.' }, 'runReadbackVars', { ...common(label), offset: i * READBACK_PAGE, limit: READBACK_PAGE });
  }
  add({ phase: 'readback', kind: 'readback-styles', label: 'read back styles', purpose: 'Read-only: returns every local text, effect, paint and grid style.', expect: 'Returns `styles`; save the whole result for report.ts.' }, 'runReadbackStyles', { ...common('read back styles') });
  return out;
};

/** The theme cleanup script — see `runCleanupTheme` for exactly what it will and will not remove. */
export const themeCleanupScript = (input: BrandInput, opts: ThemeOpts = {}): Script => {
  const p = themePlans(input);
  const root = (p.colorPlan.palette[0]?.name ?? '').split('/')[0];
  const data = {
    step: 0, of: 0, label: 'clean up theme', ...(opts.ledger ? { ledger: opts.ledger } : {}), root,
    styles: { text: p.textPlan.map((r) => r.name), effect: p.stylesPlan.effects.map((r) => r.name), paint: p.stylesPlan.paints.map((r) => r.name), grid: p.gridPlan.map((r) => r.name) },
  };
  const js = assemble('runCleanupTheme', data);
  if (js.length > SCRIPT_CEILING) throw new Error(`theme cleanup: ${js.length} characters, over the ${SCRIPT_CEILING} ceiling`);
  return { phase: 'cleanup', kind: 'cleanup-theme', label: 'clean up theme', purpose: 'Removes the Prism3-stamped collections under this brand\'s root, this brand\'s engine-described styles, and the persisted brand. Designated scratch files only.', expect: '{ ok: true } — `kept` lists everything it left, with the reason.', js };
};

/* ── components ────────────────────────────────────────────────────────────────────────────────────── */

/** Every def the plugin's picker offers — the studio's `COMPONENT_CATALOGUE` rule: not `notStandalone`,
 *  and the projector does not throw. */
export const buildableDefs = (input: BrandInput): ComponentDef[] =>
  componentDefs.filter((d) => {
    if (d.figmaProperties?.notStandalone) return false;
    try { figmaAnatomySet(materializeForBrand(d, input), { swapTarget: SWAP_TARGET }); return true; } catch { return false; }
  });

/**
 * The build ORDER: each requested def after every def it nests or swaps to (`build-deps.ts`'s own walk,
 * with "present" meaning "already scheduled"), deduplicated. `all` is every buildable def in catalogue order.
 */
export const buildOrder = (input: BrandInput, requested: 'all' | string[]): ComponentDef[] => {
  const buildable = buildableDefs(input);
  const cache = new Map<string, AnatomyPlan[]>();
  const project = (d: ComponentDef) => {
    let plans = cache.get(d.id);
    if (!plans) cache.set(d.id, plans = figmaAnatomySet(materializeForBrand(d, input), { swapTarget: SWAP_TARGET }));
    return plans;
  };
  const wanted = requested === 'all' ? buildable : requested.map((id) => {
    const d = buildable.find((x) => x.id === id);
    if (!d) throw new Error(`no buildable component def '${id}' — buildable: ${buildable.map((x) => x.id).join(', ')}`);
    return d;
  });
  const order: ComponentDef[] = [];
  const scheduled = (name: string) => order.some((d) => d.id === name || (!!d.figmaProperties?.emitAsComponents && name.startsWith(`${d.id}/`)));
  for (const def of wanted) {
    for (const dep of missingDependencies(def, { defs: componentDefs, project, present: scheduled })) order.push(dep.def);
    if (!order.includes(def)) order.push(def);
  }
  return order;
};

const projectFor = (input: BrandInput, def: ComponentDef) => figmaAnatomySet(materializeForBrand(def, input), { swapTarget: SWAP_TARGET });

/** The page a def builds on (the taxonomy's leaf page), or null for an unmapped def (the first page). */
export const pageFor = (defId: string): string | null => {
  const found = leafForDef(defId);
  return found ? leafPageName(found.leaf) : null;
};

/** The top-level names a def leaves in the file: its set, or (emitAsComponents) one component per member. */
export const namesFor = (input: BrandInput, def: ComponentDef): string[] => {
  const plans = projectFor(input, def);
  if (def.figmaProperties?.emitAsComponents) return plans.map((p) => `${def.id}/${emitCoordValue(planComponentName(p))}`);
  return [planSetLayout(plans, 'mcp-paste').component];
};

/** Every component script for the defs, in build order, then one read-back per page. */
export const componentScripts = (input: BrandInput, requested: 'all' | string[]): Script[] => {
  const out: Script[] = [];
  const byPage = new Map<string | null, { names: string[]; defs: string[] }>();
  for (const def of buildOrder(input, requested)) {
    const plans = projectFor(input, def);
    const names = namesFor(input, def);
    const page = pageFor(def.id);
    const pg = byPage.get(page) ?? { names: [], defs: [] };
    pg.names.push(...names);
    pg.defs.push(def.id);
    byPage.set(page, pg);
    if (def.figmaProperties?.emitAsComponents) {
      const members = plans.map((p, index) => ({ name: names[index], index, js: planToPluginJs(p) }));
      const data = (slice: typeof members) => ({ step: 0, of: 0, label: def.id, def: def.id, count: plans.length, description: def.summary, members: slice.map(({ name, index }) => ({ name, index })) });
      const slices = sliceBy(members, (s) => assemble('runComponentEmit', data(s), s.map((m) => m.js)), `${def.id} components`);
      slices.forEach((s, i) => out.push({
        phase: 'components', kind: 'component-emit', label: `${def.id} ${i + 1}/${slices.length}`, def: def.id, names: s.map((m) => m.name), planned: plans.length,
        purpose: `Builds ${s.length} of ${plans.length} standalone '${def.id}/…' components (skips any already in the file).`,
        expect: '{ ok: true, misses: [] } — `members` says built or skipped for each.',
        js: assemble('runComponentEmit', { ...data(s), label: `${def.id} ${i + 1}/${slices.length}` }, s.map((m) => m.js)),
      }));
      continue;
    }
    // The chunk budget is the ceiling minus this script's own wrapper, measured with an empty payload, so
    // `planSetChunks` packs to the room that is really left.
    const wrapper = (chunk: number, chunks: number) => ({ step: 0, of: 0, label: `${def.id} ${chunk + 1}/${chunks}`, def: def.id, chunk, chunks });
    const overhead = assemble('runComponentChunk', wrapper(999, 999), ['']).length + NUMBER_SLACK + 64;
    const chunks = planSetChunks(plans, SCRIPT_CEILING - overhead);
    for (const c of chunks) {
      out.push({
        phase: 'components', kind: 'component-chunk', label: `${def.id} ${c.index + 1}/${c.total}`, def: def.id, names, planned: plans.length,
        purpose: `Builds ${c.variants.length} of ${plans.length} '${names[0]}' variants${c.index === c.total - 1 ? ', then declares the set\'s properties and wires every member' : ''} (skips members already in the set).`,
        expect: '{ ok: true, misses: [] } — `result.misses` is the payload\'s own read-back.',
        js: assemble('runComponentChunk', wrapper(c.index, c.total), [c.js]),
      });
    }
  }
  for (const [page, pg] of byPage) {
    out.push({
      phase: 'component-readback', kind: 'readback-components', label: `read back ${page ?? 'first page'}`, names: pg.names,
      purpose: `Read-only: returns each built set/component on ${page ?? 'the first page'} with its variant count and properties.`,
      expect: 'Returns `found`; save the whole result for report.ts.',
      js: assemble('runReadbackComponents', { step: 0, of: 0, label: `read back ${page ?? 'first page'}`, page, expect: pg.names }),
    });
  }
  return out;
};

/** One cleanup script per component page the defs build on. */
export const componentCleanupScripts = (input: BrandInput, requested: 'all' | string[]): Script[] => {
  const byPage = new Map<string, string[]>();
  for (const def of buildOrder(input, requested)) {
    const page = pageFor(def.id);
    if (page === null) continue;
    byPage.set(page, [...(byPage.get(page) ?? []), ...namesFor(input, def)]);
  }
  return [...byPage].map(([page, names]) => ({
    phase: 'cleanup' as const, kind: 'cleanup-page', label: `clean up ${page}`, names,
    purpose: `Removes this run's components from '${page}', then the page if that left it empty. Designated scratch files only.`,
    expect: '{ ok: true } — `kept` says why a page stayed.',
    js: assemble('runCleanupPage', { step: 0, of: 0, label: `clean up ${page}`, page, names }),
  }));
};

/** Stamp each script's position into its data (`step`/`of`), so every result says where it came from. */
export const number = (scripts: Script[]): Script[] =>
  scripts.map((s, i) => {
    const head = 'const __D={"step":0,"of":0,';
    if (!s.js.startsWith(head)) throw new Error(`number: script '${s.label}' does not open with its step header`);
    return { ...s, js: `const __D={"step":${i + 1},"of":${scripts.length},` + s.js.slice(head.length) };
  });

/* ── the ledger (the shared-plugin-data fallback) ──────────────────────────────────────────────────── */

/**
 * Merge the ledgers a run's steps returned into one, to bake into the next run (`plan.ts --ledger`). Every
 * step starts from the same baked ledger and adds only its own writes, so the merge is a UNION: the #1581
 * mode stamp unions its mode ids (the rule `stampOwnedModes` applies to a live stamp), anything else is
 * last-write-wins. A cleanup result is the exception — it REMOVES entries — so it replaces the running
 * ledger wholesale instead of being unioned into it.
 */
export const mergeLedgers = (results: readonly StepReport[], seed?: Ledger): Ledger | null => {
  let out: Ledger = JSON.parse(JSON.stringify(seed ?? { root: {}, collections: {} }));
  let any = !!seed;
  for (const r of results) {
    if (!r.ledger) continue;
    any = true;
    if (r.kind === 'cleanup-theme') { out = JSON.parse(JSON.stringify(r.ledger)); continue; }
    Object.assign(out.root, r.ledger.root);
    for (const [id, c] of Object.entries(r.ledger.collections)) {
      const cur = (out.collections[id] ??= { name: c.name, data: {} });
      cur.name = c.name;
      for (const [k, v] of Object.entries(c.data)) {
        if (k === 'prism3/modes:owned' && cur.data[k]) {
          cur.data[k] = JSON.stringify([...new Set([...(JSON.parse(cur.data[k]) as string[]), ...(JSON.parse(v) as string[])])]);
        } else cur.data[k] = v;
      }
    }
  }
  return any ? out : null;
};

/* ── the comparison against the plan (report.ts, and the gate) ─────────────────────────────────────── */

type Rgba = { r: number; g: number; b: number; a?: number };
type Val = number | string | boolean | Rgba | { alias: string } | null;
export type ExpectedVar = { collection: string; type: string; scopes: string[]; hidden: boolean; description: string; values: Val[]; modes: string[] | 'first' };

/** Every variable the plans write, keyed by name, with what each mode should hold. */
export const expectedVariables = (p: ThemePlans): Map<string, ExpectedVar> => {
  const out = new Map<string, ExpectedVar>();
  for (const r of p.colorPlan.palette) out.set(r.name, { collection: 'core', type: 'COLOR', scopes: r.scopes, hidden: r.hidden, description: r.description, values: [r.value], modes: 'first' });
  const { modes, create, aliases } = p.colorPlan.color;
  const al = new Map(aliases.map((a) => [a.name, a.targetsByMode] as const));
  for (const r of create) out.set(r.name, { collection: 'color', type: 'COLOR', scopes: r.scopes, hidden: false, description: r.description, modes, values: r.valuesByMode.map((v, i) => (al.get(r.name)?.[i] ? { alias: al.get(r.name)![i]! } : v)) });
  for (const c of p.floatPlan) {
    const fa = new Map(c.aliases.map((a) => [a.name, a.targetsByMode] as const));
    for (const r of c.create) out.set(r.name, { collection: c.name, type: 'FLOAT', scopes: r.scopes, hidden: r.hidden, description: r.description, modes: c.modes, values: r.valuesByMode.map((v, i) => (fa.get(r.name)?.[i] ? { alias: fa.get(r.name)![i]! } : v)) });
  }
  for (const c of p.fontPlan) for (const r of c.rows) out.set(r.name, { collection: c.name, type: r.resolvedType, scopes: r.scopes, hidden: r.hidden, description: r.description, modes: c.modes, values: r.valuesByMode.map((v, i) => (r.aliasByMode[i] ? { alias: r.aliasByMode[i]! } : v as Val)) });
  return out;
};

const sameVal = (a: Val | undefined, b: Val | undefined): boolean => {
  if (a && typeof a === 'object' && 'alias' in a) return !!b && typeof b === 'object' && 'alias' in b && b.alias === a.alias;
  if (a && typeof a === 'object') {
    if (!b || typeof b !== 'object' || 'alias' in b) return false;
    const x = a as Rgba; const y = b as Rgba;
    // Figma stores channels as float32; 1e-3 is well inside one 8-bit step (0.0039).
    return Math.abs(x.r - y.r) < 1e-3 && Math.abs(x.g - y.g) < 1e-3 && Math.abs(x.b - y.b) < 1e-3 && Math.abs((x.a ?? 1) - (y.a ?? 1)) < 1e-3;
  }
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-4;
  return a === b;
};

/** A read-back variable row, as `runReadbackVars` returns it. */
type ReadRow = [collection: string, name: string, type: string, scopes: string[], hidden: boolean, description: string, values: Record<string, Val>];
type ReadCol = { id: string; name: string; modes: string[]; owned: boolean };

export type Finding = { category: string; name: string; detail: string };

/**
 * Compare the read-back with the plan. Findings are grouped by category so a summary can count them; each
 * names the variable or style and says what differs. Orphans and stranded collections are computed with the
 * plugin's own `orphansOf` / `strandedCollections`, over the owned groups the executors own.
 */
export const compareReadback = (p: ThemePlans, results: StepReport[]): { findings: Finding[]; coverage: { read: number; total: number } } => {
  const findings: Finding[] = [];
  const varPages = results.filter((r) => r.kind === 'readback-vars');
  const rows = varPages.flatMap((r) => (r.variables as ReadRow[]) ?? []);
  const total = (varPages[0]?.total as number | undefined) ?? 0;
  const cols = (varPages[0]?.collections as ReadCol[] | undefined) ?? [];
  if (!varPages.length) findings.push({ category: 'readback', name: 'variables', detail: 'no variable read-back results were supplied' });
  if (rows.length < total) findings.push({ category: 'readback', name: 'variables', detail: `the read-back pages covered ${rows.length} of ${total} variables — regenerate with more pages` });
  const colByName = new Map(cols.map((c) => [c.name, c] as const));
  const actual = new Map(rows.map((r) => [r[1], r] as const));
  const expected = expectedVariables(p);
  for (const [name, e] of expected) {
    const a = actual.get(name);
    if (!a) { findings.push({ category: 'missing variable', name, detail: `planned in '${e.collection}', not in the file` }); continue; }
    const [collection, , type, scopes, hidden, description, values] = a;
    if (collection !== e.collection) findings.push({ category: 'collection', name, detail: `in '${collection}', planned in '${e.collection}'` });
    if (type !== e.type) findings.push({ category: 'type', name, detail: `${type}, planned ${e.type}` });
    if ([...scopes].sort().join() !== [...e.scopes].sort().join()) findings.push({ category: 'scopes', name, detail: `[${scopes.join(', ')}], planned [${e.scopes.join(', ')}]` });
    if (hidden !== e.hidden) findings.push({ category: 'hidden', name, detail: `hiddenFromPublishing ${hidden}, planned ${e.hidden}` });
    if (description !== e.description) findings.push({ category: 'description', name, detail: 'differs from the plan' });
    const modeNames = e.modes === 'first' ? [colByName.get(collection)?.modes[0] ?? ''] : e.modes;
    modeNames.forEach((m, i) => {
      const want = e.values[i];
      const got = values[m];
      if (!sameVal(want, got)) {
        const isAlias = (want && typeof want === 'object' && 'alias' in want) || (got && typeof got === 'object' && 'alias' in (got as object));
        findings.push({ category: isAlias ? 'alias' : 'value', name, detail: `@${m}: ${JSON.stringify(got)}, planned ${JSON.stringify(want)}` });
      }
    });
  }
  // MODES — every planned collection's modes present (in plan order, as its leading modes).
  const plannedModes: [string, string[]][] = [['color', p.colorPlan.color.modes], ...p.floatPlan.map((c) => [c.name, c.modes] as [string, string[]]), ...p.fontPlan.map((c) => [c.name, c.modes] as [string, string[]])];
  for (const [col, modes] of plannedModes) {
    const c = colByName.get(col);
    if (!c) { findings.push({ category: 'missing collection', name: col, detail: 'planned, not in the file' }); continue; }
    const missing = modes.filter((m) => !c.modes.includes(m));
    if (missing.length) findings.push({ category: 'modes', name: col, detail: `missing ${missing.join(', ')}` });
    if (!c.owned) findings.push({ category: 'provenance', name: col, detail: 'carries no #1581 mode stamp (expected after an apply; in ledger mode the stamp is in the ledger instead)' });
  }
  // ORPHANS — the plugin's own report: names in a planned collection the plan does not contain.
  const planned = new Set(expected.keys());
  const byCol = new Map<string, string[]>();
  for (const r of rows) byCol.set(r[0], [...(byCol.get(r[0]) ?? []), r[1]]);
  for (const col of new Set([...expected.values()].map((e) => e.collection))) {
    const orphans = orphansOf(byCol.get(col) ?? [], [...planned].filter((n) => expected.get(n)!.collection === col));
    for (const o of orphans) findings.push({ category: 'orphan', name: o, detail: `in '${col}', not in the plan (reported, never deleted)` });
  }
  const plannedCollections = ['core', 'color', ...p.floatPlan.map((c) => c.name), ...p.fontPlan.map((c) => c.name)];
  for (const s of strandedCollections(cols.map((c) => c.name), plannedCollections)) findings.push({ category: 'stranded collection', name: s, detail: 'in the file, written by no plan' });

  // STYLES — present, and carrying the engine's description.
  const styleRes = results.find((r) => r.kind === 'readback-styles');
  if (!styleRes) findings.push({ category: 'readback', name: 'styles', detail: 'no style read-back result was supplied' });
  else {
    const got = styleRes.styles as Record<'text' | 'effect' | 'paint' | 'grid', { name: string; description: string; bound: string[] }[]>;
    const want: [keyof typeof got, { name: string; description: string }[]][] = [['text', p.textPlan], ['effect', p.stylesPlan.effects], ['paint', p.stylesPlan.paints], ['grid', p.gridPlan]];
    for (const [kind, rowsWant] of want) {
      const have = new Map((got[kind] ?? []).map((s) => [s.name, s] as const));
      for (const w of rowsWant) {
        const h = have.get(w.name);
        if (!h) findings.push({ category: `missing ${kind} style`, name: w.name, detail: 'planned, not in the file' });
        else if (h.description !== w.description) findings.push({ category: `${kind} style description`, name: w.name, detail: 'differs from the plan' });
      }
    }
    for (const t of p.textPlan) {
      const h = (got.text ?? []).find((s) => s.name === t.name);
      if (!h) continue;
      for (const v of [t.fontFamilyVar, t.fontSizeVar, t.fontStyleVar].filter(Boolean)) if (!h.bound.includes(v)) findings.push({ category: 'text style binding', name: t.name, detail: `not bound to ${v}` });
    }
  }
  return { findings, coverage: { read: rows.length, total } };
};

export { themePlans, ENGINE_VERSION };

/* ── the run summary (report.ts's body, here so the gate exercises it) ─────────────────────────────── */

/** The manifest fields `summarize` reads — what `tools/figma-mcp/plan.ts` writes. */
export type ManifestLike = {
  brandInput: BrandInput;
  engineVersion: string;
  scripts: { order: number; phase: Phase; kind: string; label: string; def?: string; names?: string[]; planned?: number }[];
};

/**
 * One pass/fail summary over a run's results. FAIL means something the plugin's own verdict would also
 * fail on: a pre-flight conflict, a step that threw or missed or had a write refused, a read-back that
 * disagrees with the plan, or a component chunk that reported misses. Orphans and stranded collections are
 * WARNINGS, exactly as the plugin treats them (reported, never deleted, never a failure).
 */
export const summarize = (m: ManifestLike, results: ReadonlyMap<number, StepReport>) => {
  const fail: string[] = [];
  const warn: string[] = [];
  const info: string[] = [];
  if (m.engineVersion !== ENGINE_VERSION) warn.push(`the scripts were generated by engine ${m.engineVersion}; this checkout is ${ENGINE_VERSION} — the comparison below uses this checkout's plan`);
  const missing = m.scripts.filter((s) => !results.has(s.order));
  if (missing.length) fail.push(`${missing.length} of ${m.scripts.length} scripts have no result (first: #${missing[0].order} ${missing[0].label})`);
  const got = m.scripts.flatMap((s) => (results.has(s.order) ? [{ s, r: results.get(s.order)! }] : []));
  for (const { s, r } of got) if (r.label !== undefined && r.label !== s.label) warn.push(`result #${s.order} says '${r.label}', the manifest says '${s.label}' — was it saved under the right number?`);

  // PRE-FLIGHT
  const conflicts = got.filter(({ s }) => s.phase === 'preflight').flatMap(({ r }) => (r.conflicts as { kind: string; name: string; detail: string }[] | undefined)?.map((c) => `${c.kind} "${c.name}" ${c.detail}`) ?? (r.threw ? [`pre-flight threw: ${r.threw}`] : []));
  if (conflicts.length) fail.push(`pre-flight: ${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'} — nothing should have been written after this (${conflicts.slice(0, 5).join('; ')}${conflicts.length > 5 ? '; …' : ''})`);

  // THEME WRITES
  const theme = got.filter(({ s }) => s.phase === 'theme');
  const shared = new Set(got.map(({ r }) => (r.shared?.mode === 'ledger' ? `ledger (${r.shared.reason})` : r.shared?.mode)).filter(Boolean));
  if ([...shared].some((x) => x!.startsWith('ledger'))) info.push(`shared plugin data: ${[...shared].join(', ')} — the #1581 stamps and the persisted brand are in the ledger, not the file; save \`report.ts --ledger-out\` and pass it to the next plan.ts run for this file`);
  else if (shared.size) info.push('shared plugin data: live — the #1581 stamps and the persisted brand are in the file');
  for (const { s, r } of theme) {
    if (r.threw) fail.push(`${s.label}: threw — ${r.threw}`);
    if (r.misses?.length) fail.push(`${s.label}: ${r.misses.length} miss${r.misses.length === 1 ? '' : 'es'} (${r.misses.slice(0, 3).join('; ')}${r.misses.length > 3 ? '; …' : ''})`);
    if (r.refused?.length) fail.push(`${s.label}: ${r.refused.length} variable write${r.refused.length === 1 ? '' : 's'} refused by Figma (${r.refused[0].name}: ${r.refused[0].reason.slice(0, 80)})`);
    if (r.skipped?.length) warn.push(`${s.label}: ${r.skipped.length} text style${r.skipped.length === 1 ? '' : 's'} skipped (${r.skipped.slice(0, 3).map((x) => x.reason).join('; ')})`);
    for (const u of r.fonts?.unavailable ?? []) warn.push(`${s.label}: typeface unavailable — ${u.face} (${u.reason})`);
  }
  const created = theme.reduce((n, { r }) => n + (r.created ?? 0), 0);
  if (theme.length) info.push(`theme: ${theme.length} write steps, ${created} items created, ${theme.reduce((n, { r }) => n + (r.bound ?? 0), 0)} bindings`);
  // Renames, deduplicated across steps. A `target-not-planned` refusal in one slice is an artifact of the
  // cut when another slice's plan names the target (that slice migrates it), so only a refusal whose
  // target is planned NOWHERE is reported.
  const plans = themePlans(m.brandInput);
  const plannedNames = new Set(expectedVariables(plans).keys());
  const migrated = new Set(theme.flatMap(({ r }) => r.migration?.migrated ?? []));
  const refused = new Set(theme.flatMap(({ r }) => r.migration?.refused ?? []).filter((x) => {
    const [pair, status] = x.split(': ');
    return !(status === 'target-not-planned' && plannedNames.has(pair.split('→')[1])) && !migrated.has(pair);
  }));
  if (migrated.size) info.push(`renames migrated in place: ${[...migrated].slice(0, 5).join(', ')}${migrated.size > 5 ? '…' : ''}`);
  if (refused.size) warn.push(`renames refused: ${[...refused].slice(0, 5).join(', ')}`);

  // READ-BACK
  const readback = got.filter(({ s }) => s.phase === 'readback').map(({ r }) => r);
  if (m.scripts.some((s) => s.phase === 'readback')) {
    const { findings, coverage } = compareReadback(plans, readback);
    const WARN = new Set(['orphan', 'stranded collection', 'provenance']);
    const ledgerMode = [...shared].some((x) => x!.startsWith('ledger'));
    const byCat = new Map<string, Finding[]>();
    for (const f of findings) {
      if (f.category === 'provenance' && ledgerMode) continue;   // the stamp is in the ledger by design
      byCat.set(f.category, [...(byCat.get(f.category) ?? []), f]);
    }
    for (const [cat, fs] of byCat) (WARN.has(cat) ? warn : fail).push(`read-back — ${cat}: ${fs.length} (${fs.slice(0, 4).map((f) => `${f.name}: ${f.detail}`).join('; ')}${fs.length > 4 ? '; …' : ''})`);
    info.push(`read-back: ${coverage.read}/${coverage.total} variables compared against ${plannedNames.size} planned`);
  }

  // COMPONENTS
  const comp = got.filter(({ s }) => s.phase === 'components');
  const defs = [...new Set(m.scripts.filter((s) => s.phase === 'components').map((s) => s.def!))];
  for (const def of defs) {
    const scripts = m.scripts.filter((s) => s.phase === 'components' && s.def === def);
    const rs = comp.filter(({ s }) => s.def === def).map(({ r }) => r);
    const misses = rs.flatMap((r) => r.misses ?? []);
    const threw = rs.filter((r) => r.threw).map((r) => `${r.label}: ${r.threw}`);
    if (threw.length) fail.push(`component ${def}: ${threw.join('; ')}`);
    if (misses.length) fail.push(`component ${def}: ${misses.length} miss${misses.length === 1 ? '' : 'es'} (${misses.slice(0, 3).join('; ')}${misses.length > 3 ? '; …' : ''})`);
    const hosts = new Set(rs.map((r) => (r.host as { loadAllPages?: string } | undefined)?.loadAllPages).filter(Boolean));
    if (!threw.length && !misses.length && rs.length === scripts.length) info.push(`component ${def}: ${scripts.length} script${scripts.length === 1 ? '' : 's'}, no misses${hosts.size ? ` (page loading: ${[...hosts].join(', ')})` : ''}`);
  }
  const planned = new Map<string, number>();
  for (const s of m.scripts) if (s.kind === 'component-chunk' && s.names?.[0] && s.planned) planned.set(s.names[0], s.planned);
  for (const { s, r } of got.filter(({ s }) => s.phase === 'component-readback')) {
    if (r.absentPage) { fail.push(`${s.label}: the page is not in the file`); continue; }
    const found = new Map(((r.found as { name: string; type: string; variants?: number; unreadable?: string }[]) ?? []).map((f) => [f.name, f] as const));
    const absent = (s.names ?? []).filter((n) => !found.has(n));
    if (absent.length) fail.push(`${s.label}: ${absent.length} expected component${absent.length === 1 ? '' : 's'} not found (${absent.slice(0, 4).join(', ')}${absent.length > 4 ? '…' : ''})`);
    for (const [name, f] of found) {
      if (f.unreadable) fail.push(`${s.label}: set '${name}' is unreadable (${f.unreadable})`);
      const want = planned.get(name);
      if (want !== undefined && f.variants !== undefined && f.variants !== want) fail.push(`${s.label}: set '${name}' has ${f.variants} variants, the plan projects ${want}`);
    }
  }
  return { verdict: fail.length ? 'FAIL' as const : 'PASS' as const, fail, warn, info };
};
