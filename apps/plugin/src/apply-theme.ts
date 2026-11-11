/**
 * The Apply Theme WRITE SEQUENCE — lifted out of `main.ts` (#111 / #1553) so a second driver can run it.
 *
 * `main.ts`'s `applyTheme` used to hold the plans, the font preload, the pre-flight and the six executor
 * calls inline, bound to the global `figma`. The MCP paste harness (`mcp-paste.ts`) needs the SAME sequence
 * as the thing it proves parity against, and a test cannot call a function that reaches for a global the
 * test does not have. So the sequence moved here, unchanged, with the host passed in; `main.ts` still owns
 * everything after the write — the summary prose, the headline, the verdict post.
 *
 * BEHAVIOR-NEUTRAL BY CONSTRUCTION: every call below is the call `main.ts` made, in the order it made it,
 * with `figma` spelled `host`. The global `figma` is what `main.ts` passes, so the plugin's run is the same
 * run. The paste path does NOT call this function (it cannot — the whole sequence plus its data is several
 * times the `use_figma` ceiling); it calls the same EXECUTORS, one step per script, and
 * `test-mcp-paste.ts` compares the file each path leaves behind.
 *
 * Compiled under `tsconfig.main.json` (plugin-typings, no `dom`).
 */
import { applyWritePlan, applyFloatPlan, applyVarCollectionPlan, beginMigration } from './write-figma';
import { applyStylesPlan } from './write-styles';
import { applyGridStylePlan } from './write-grid-styles';
import { applyTextStylePlan } from './write-text-styles';
import { renameStylesForPlan, renameTextStylesForPlan } from './rename-styles';
import { guardApply, preflightApply, preflightPlanOf, COLOR_NAMES } from './preflight';
import { conflictKey, resolveCollisions, type CollisionChoices, type ChoiceTally } from './collision-choice';

/** How many times one apply resolves the person's choices before the guarded pre-flight decides (#1909). Each pass needs
 *  a choice for a collision the last pass made, which only a renamed name already taken does; this bounds it. */
const RESOLVE_PASSES = 8;
import { preloadFonts } from './preload-fonts';
import { persistInput, restoreInput } from './persist-figma';
import { emissionOf, stampEmission } from './theme-emission';
import { fontPreloadApiOf, preflightApiOf, textApiOf } from './theme-ports';
import type { ThemeHost } from './theme-ports';
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import { buildWritePlan, buildFloatWritePlan, buildStylesPlan, buildGridStylePlan, buildFontVarPlan, buildMotionVarPlan, buildTextStylePlan } from '@prism3/engine/write-plan';
import { brandTheme } from '@prism3/engine/theme';
import type { BrandInput } from '@prism3/engine/theme';

export type { ThemeHost };

/** Every plan one apply writes, built once from the brand. Exported so the paste harness slices the SAME
 *  objects the plugin writes, rather than rebuilding them by a second route. */
export const themePlans = (input: BrandInput) => {
  const theme = brandTheme(input);
  const textPlan = buildTextStylePlan(theme);
  // Hoisted rather than inlined into the calls below because the #1152 stranded-collection pass
  // needs the set of collections the plans NAME, and an axis label (`core/dimension`) is not that
  // name. `plan.name` / `$collection` are the only spellings that match what Figma holds. Built once
  // and handed to BOTH the pre-flight and the executors, so the names checked are the names written.
  const colorFiles = buildFigmaColor(theme);
  const colorPlan = buildWritePlan(colorFiles);
  const floatPlan = buildFloatWritePlan(theme);
  const fontPlan = buildFontVarPlan(theme);
  // `motion` (#2412): TIMING + EASING, so the mixed-type executor's, not the FLOAT one's.
  const motionPlan = buildMotionVarPlan(theme);
  const stylesPlan = buildStylesPlan(theme);
  const gridPlan = buildGridStylePlan(theme);
  return { theme, textPlan, colorFiles, colorPlan, floatPlan, fontPlan, motionPlan, stylesPlan, gridPlan };
};
export type ThemePlans = ReturnType<typeof themePlans>;

/** #3170 Q3170.5 A: Apply Theme's seven write stages, in the order `runApplyTheme` writes them. The panel's status strip
 *  counts them (n of 7) and names each (`apps/studio/src/state/status-strip.ts`). */
export const APPLY_STAGES = ['float', 'color', 'styles', 'grid', 'type-vars', 'text-styles', 'motion'] as const;
export type ApplyStage = (typeof APPLY_STAGES)[number];
/** How an apply reports and hands the thread back (#3170, the plugin's alone: the paste harness passes none). `check`
 *  before the first read; `stage` before each write stage, `done` of 7 finished, awaited so the thread is handed back
 *  between stages; `tick` inside every stage, offered after each variable or style written (#3208, `Tick` in
 *  `write-figma.ts`), which the plugin turns into a hand-back once about `PACE_MS` of work has run. */
export type ThemePace = { check: () => void; stage: (stage: ApplyStage, done: number) => Promise<void>; tick: () => Promise<void> };

/**
 * Preload fonts, pre-flight, then the guarded write — exactly `main.ts`'s sequence before #111 moved it.
 * Returns the plans alongside so the caller's report reads the same objects that were written. `beforeWrite` runs once
 * between the two, which is where the plugin saves its named version.
 */
export const runApplyTheme = async (input: BrandInput, host: ThemeHost, beforeWrite?: () => Promise<void>, pace?: ThemePace, choices?: CollisionChoices) => {
  pace?.check();
  const plans = themePlans(input);
  // THE COLLISION CHOICE (#1909, Q112 A): with the person's Skip or Rename for every collision, the plans below are the
  // ones the choice made, and the pre-flight runs again over them. Without a choice for each, they stay as built, so the
  // pre-flight refuses exactly as before: refusal is the default. The choice is this apply's alone; nothing keeps it.
  // A choice that makes a new collision (a renamed name someone else holds) is resolved again when the choices answer it
  // too, up to `RESOLVE_PASSES`; when they do not, the guarded pre-flight below refuses, naming it, and `applied` (the
  // choices already used) rides the refusal so the panel posts them back beside the new one (the review of #3518).
  let exec = { color: plans.colorPlan, float: plans.floatPlan, font: plans.fontPlan, motion: plans.motionPlan, styles: plans.stylesPlan, grid: plans.gridPlan, text: plans.textPlan };
  let names = COLOR_NAMES;
  let chose = null as ChoiceTally | null;
  const applied: Record<string, 'skip' | 'rename'> = {};
  if (choices && Object.keys(choices).length) {
    for (let pass = 0; pass < RESOLVE_PASSES; pass++) {
      const found = await preflightApply(preflightPlanOf(exec, names), preflightApiOf(host));
      if (!found.length) break;
      const r = resolveCollisions(exec, found, choices, names);
      if (!r.ok) break;
      exec = r.plans; names = r.names;
      const was: ChoiceTally = chose ?? { skipped: 0, renamed: 0 };
      chose = { skipped: was.skipped + r.tally.skipped, renamed: was.renamed + r.tally.renamed };
      for (const c of found) applied[conflictKey(c)] = choices[conflictKey(c)];
    }
  }
  const { text: textPlan, color: colorPlan, float: floatPlan, font: fontPlan, motion: motionPlan, styles: stylesPlan, grid: gridPlan } = exec;
  // FONTS FIRST (#680), before ANY variable write. Writing a `font/family/*` variable makes Figma
  // re-resolve every text style bound to it, and re-resolution throws `unloaded font` — which used to
  // abort the whole apply from inside a writer that touches no text. The face needed is the CROSS
  // PRODUCT of the incoming theme and what the file already has (the live failure was aurora's family
  // with harbor's style name, a pair in neither plan), so this reads the file's styles as well as the
  // plan. It never throws: a typeface this Figma genuinely lacks is reported, not fatal.
  const pf = await preloadFonts(textPlan, fontPreloadApiOf(host));
  // THE BRAND THIS APPLY REPLACES (#2695), read before the write persists the new one, so the report can say when the
  // field style moved (`field-style-note.ts`). An unreadable store reads as none, as every other restore here does.
  let before: BrandInput | null = null;
  try { before = restoreInput(host.root); } catch { /* untrusted/absent → none */ }
  // THE PRE-FLIGHT (#506): read everything the write below will touch, BEFORE the first write, and on
  // any conflict — a same-named collection or style Prism3 did not create, or a variable of another
  // type — write NOTHING and report every conflict. The rename pre-pass is inside the guarded write
  // because it renames collections, so it is a write too. See `preflight.ts`.
  const guarded = await guardApply(
    preflightPlanOf(exec, names),
    preflightApiOf(host),
    async () => {
      // THE NAMED VERSION (#2828), after the pre-flight passed and before the first write, so a refused apply saves none.
      // The rename pass below is a write too. A host that refuses throws here and nothing is written.
      await beforeWrite?.();
      // ONE rename pass across all four variable executors (#1013). Built here rather than inside each
      // one because the static validation must happen once, before any write, and because a designer
      // reads a single list of what moved — not four. Since #1035 constructing it also RENAMES THE
      // COLLECTIONS, in one topologically-ordered, all-or-nothing pre-pass — so it must be awaited here,
      // before the first executor, and not moved below one of them: while #1013's map held
      // `color → color.appearance` and `surface → color` it was a CHAIN, and an executor that renamed its
      // own collection on the way past would apply half of it. #1148 retired both entries, so the shipped
      // map is no longer a chain — the pre-pass stays here because the atomicity obligation stated at
      // `beginMigration` is independent of how many entries the map holds, and a future entry can
      // reintroduce a chain without a change on this line.
      const mig = await beginMigration(host.variables);
      // FLOAT axes (#146): core/dimension, space/radius/size/border-width/focus/opacity + layout. FIRST, since
      // the tinted wash moved into its variable (#1614, #1646): a wash's color value aliases an `opacity/<n>`
      // variable, so the opacity collection must exist before the color pass binds it. Nothing in the FLOAT
      // axes reads a color variable, so nothing depends on the old order.
      await pace?.stage('float', 0);
      const f = await applyFloatPlan(floatPlan, host.variables, mig, pace?.tick);
      // Colour axis (#108): the `core` palette slice + the one `color` collection, per-mode alias-bound.
      // The pointer-tier executor that used to run next went with the tier (#1148) — there is no second
      // collection to alias into, so the cross-call ordering dependency it existed for is gone too.
      await pace?.stage('color', 1);
      const r = await applyWritePlan(colorPlan, host.variables, mig, pace?.tick, names);
      // STYLE axes (shadow/gradient lane): Effect Styles (shadow/* + shadow-dark/*) + Paint Styles
      // (gradients, baked stops). The global `figma` structurally satisfies the StylesApi port.
      await pace?.stage('styles', 2);
      // THE STYLE RENAME PASS (#1040): a style the engine renamed takes its new name in place first, so the writer
      // finds it under that name and the layers using it follow. A no-op while the record is empty.
      const sr = await renameStylesForPlan(stylesPlan, host);
      const s = await applyStylesPlan(stylesPlan, host, pace?.tick);
      // GRID STYLES (#1480): one reusable Figma Grid Style per breakpoint (`sm`, …; renamed in place from `Grid / sm`, #2467), sourced from
      // the same layout data as the numeric `layout` collection. STATIC — a grid style cannot mode-switch
      // off a variable — so N breakpoints = N styles, coexisting with the variables (the responsive source
      // of truth). The global `figma` structurally satisfies the GridStylesApi port (createGridStyle +
      // getLocalGridStylesAsync). No binding, so nothing here can miss.
      await pace?.stage('grid', 3);
      const gs = await applyGridStylePlan(gridPlan, host, pace?.tick);
      // TYPOGRAPHY (#237): core/font + type-sets variables first (bound targets must exist), then Text
      // Styles.
      await pace?.stage('type-vars', 4);
      const tv = await applyVarCollectionPlan(fontPlan, host.variables, mig, pace?.tick);
      // The Text Style port needs figma's style/font surface + figma.variables' getter (`theme-ports.ts`).
      await pace?.stage('text-styles', 5);
      const tr = await renameTextStylesForPlan(textPlan, textApiOf(host));   // #1040, as for the styles above
      const ts = await applyTextStylePlan(textPlan, textApiOf(host), pace?.tick);
      // MOTION (#2412): TIMING durations + EASING curves, roles and springs, through the same mixed-type
      // executor. Independent of every other axis: nothing aliases into or out of `motion`.
      await pace?.stage('motion', 6);
      const mv = await applyVarCollectionPlan(motionPlan, host.variables, mig, pace?.tick);
      // Persist the exact knobs alongside the variables (#131) — so re-opening this file rehydrates
      // the UI to THIS brand, not the default. Only after a real materialisation (inside the try).
      persistInput(host.root, input);
      // #3422 Q44.1 A: and the print of what was written, so the recount can tell an engine update apart (`theme-emission.ts`).
      stampEmission(host.root, emissionOf(plans));
      return { mig, r, f, s, gs, tv, ts, mv, styleRenames: [...sr, ...tr] };
    },
  );
  return { plans, pf, guarded, before, chose, exec, names, applied };
};
