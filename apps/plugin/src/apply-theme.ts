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
import { guardApply, preflightPlanOf } from './preflight';
import { preloadFonts } from './preload-fonts';
import { persistInput } from './persist-figma';
import { fontPreloadApiOf, preflightApiOf, textApiOf } from './theme-ports';
import type { ThemeHost } from './theme-ports';
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import { buildWritePlan, buildFloatWritePlan, buildStylesPlan, buildGridStylePlan, buildFontVarPlan, buildTextStylePlan } from '@prism3/engine/write-plan';
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
  const stylesPlan = buildStylesPlan(theme);
  const gridPlan = buildGridStylePlan(theme);
  return { theme, textPlan, colorFiles, colorPlan, floatPlan, fontPlan, stylesPlan, gridPlan };
};
export type ThemePlans = ReturnType<typeof themePlans>;

/**
 * Preload fonts, pre-flight, then the guarded write — exactly `main.ts`'s sequence before #111 moved it.
 * Returns the plans alongside so the caller's report reads the same objects that were written.
 */
export const runApplyTheme = async (input: BrandInput, host: ThemeHost) => {
  const plans = themePlans(input);
  const { textPlan, colorPlan, floatPlan, fontPlan, stylesPlan, gridPlan } = plans;
  // FONTS FIRST (#680), before ANY variable write. Writing a `font/family/*` variable makes Figma
  // re-resolve every text style bound to it, and re-resolution throws `unloaded font` — which used to
  // abort the whole apply from inside a writer that touches no text. The face needed is the CROSS
  // PRODUCT of the incoming theme and what the file already has (the live failure was aurora's family
  // with harbor's style name, a pair in neither plan), so this reads the file's styles as well as the
  // plan. It never throws: a typeface this Figma genuinely lacks is reported, not fatal.
  const pf = await preloadFonts(textPlan, fontPreloadApiOf(host));
  // THE PRE-FLIGHT (#506): read everything the write below will touch, BEFORE the first write, and on
  // any conflict — a same-named collection or style Prism3 did not create, or a variable of another
  // type — write NOTHING and report every conflict. The rename pre-pass is inside the guarded write
  // because it renames collections, so it is a write too. See `preflight.ts`.
  const guarded = await guardApply(
    preflightPlanOf({ color: colorPlan, float: floatPlan, font: fontPlan, styles: stylesPlan, grid: gridPlan, text: textPlan }),
    preflightApiOf(host),
    async () => {
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
      // Colour axis (#108): the `core` palette slice + the one `color` collection, per-mode alias-bound.
      // The pointer-tier executor that used to run next went with the tier (#1148) — there is no second
      // collection to alias into, so the cross-call ordering dependency it existed for is gone too.
      const r = await applyWritePlan(colorPlan, host.variables, mig);
      // FLOAT axes (#146): core/dimension, space/radius/size/border-width/focus/opacity + layout.
      const f = await applyFloatPlan(floatPlan, host.variables, mig);
      // STYLE axes (shadow/gradient lane): Effect Styles (shadow/* + shadow-dark/*) + Paint Styles
      // (gradients, baked stops). The global `figma` structurally satisfies the StylesApi port.
      const s = await applyStylesPlan(stylesPlan, host);
      // GRID STYLES (#1480): one reusable Figma Grid Style per breakpoint (`Grid / sm`, …), sourced from
      // the same layout data as the numeric `layout` collection. STATIC — a grid style cannot mode-switch
      // off a variable — so N breakpoints = N styles, coexisting with the variables (the responsive source
      // of truth). The global `figma` structurally satisfies the GridStylesApi port (createGridStyle +
      // getLocalGridStylesAsync). No binding, so nothing here can miss.
      const gs = await applyGridStylePlan(gridPlan, host);
      // TYPOGRAPHY (#237): core/font + type-sets variables first (bound targets must exist), then Text
      // Styles.
      const tv = await applyVarCollectionPlan(fontPlan, host.variables, mig);
      // The Text Style port needs figma's style/font surface + figma.variables' getter (`theme-ports.ts`).
      const ts = await applyTextStylePlan(textPlan, textApiOf(host));
      // Persist the exact knobs alongside the variables (#131) — so re-opening this file rehydrates
      // the UI to THIS brand, not the default. Only after a real materialisation (inside the try).
      persistInput(host.root, input);
      return { mig, r, f, s, gs, tv, ts };
    },
  );
  return { plans, pf, guarded };
};
