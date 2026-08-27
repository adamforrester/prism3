/**
 * Prism3 Figma plugin — MAIN-THREAD controller (sandbox side), docs/22.
 *
 * The thin, plugin-only context: it has the Figma document API (`figma.*`) but NO DOM. Since #110
 * the iframe runs the SHARED `apps/studio/src` UI (one UI, no fork); this controller is the write/read
 * adapter below it:
 *   • `apply-theme` (carries the live `BrandInput` from the UI's knobs) → build the colour write
 *     plan + run #108's `applyWritePlan` against `figma.variables`, then report `apply-result` (a
 *     short headline for the UI's status pill + the full per-axis summary behind it).
 *   • `build-components` (carries a def `id`; the defs themselves are compiled in) → project that def
 *     into the full variant set and run #487's `applyComponentPlan` against the canvas, then report
 *     `component-result`. Absent `id` means Button, which is #483's original contract. Its own action
 *     rather than part of `apply-theme` (#483/#652): a theme apply is cheap and run after every knob
 *     change, where this writes hundreds of nodes.
 *   • on `ui-ready` → run #109's read-back + verify and post `seed-info` (informational: does an
 *     existing Prism3 theme in this file pass the contract).
 *
 * Compiled under `tsconfig.main.json` (plugin-typings, `lib` WITHOUT `dom`), so any accidental
 * `document`/`window` reference is a COMPILE error — the two-context split is enforced by types.
 */
import { applyHeadline, APPLY_FAILED_HEADLINE, componentHeadline, staleNote, partialWriteHeadline, partialWriteNote } from './apply-summary';
import { ENGINE_VERSION } from '@prism3/engine/version';
import { appendBuildNote, buildNote } from '../../studio/src/build-identity';
import { onUiMessage, postToUi } from './bridge-main';
import { assertNever } from './messages';
import type { MainToUi, UiToMain } from './messages';
import { applyWritePlan, applySurfacePlan, applyFloatPlan, applyVarCollectionPlan, beginMigration } from './write-figma';
import { isRefusal } from '@prism3/engine/rename-map';
import { applyStylesPlan } from './write-styles';
import { applyTextStylePlan } from './write-text-styles';
import { preloadFonts } from './preload-fonts';
import { applyComponentPlan, partialWriteOf } from './write-components';
import type { ComponentProgress } from './write-components';
import { chunkLine, summaryLines, measureSettle, verdictBeforeSettle } from './build-telemetry';
import { readFigmaVariables } from './read-figma';
import { listFamilyStyleCounts } from './list-fonts';
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import { buildWritePlan, buildSurfaceWritePlan, buildFloatWritePlan, buildStylesPlan, buildFontVarPlan, buildTextStylePlan } from '@prism3/engine/write-plan';
import { verifyReadback } from '@prism3/engine/read-back';
import { persistInput, restoreInput } from './persist-figma';
import { brandTheme } from '@prism3/engine/theme';
import type { BrandInput } from '@prism3/engine/theme';
import { figmaAnatomySet } from '@prism3/engine/anatomy-figma';
import { button } from '@prism3/engine/components/button';
import { componentDefs } from '@prism3/engine/components/index';

// Show the UI iframe. `__html__` is the bundled shared-UI HTML Figma injects from `manifest.ui`
// (the inlined `apps/studio/src` app; declared for the sandbox global in `figma-env.d.ts`). The shared
// `apps/studio/src` UI is laid out desktop-first: `#app` caps content at 1200px with 40px gutters, so the
// full layout wants 1280px. Figma is desktop-only, so we size the window to the web canvas rather
// than a "standard" narrow plugin — the same UI renders identically to the standalone web app.
const UI_SIZE_KEY = 'prism3:ui-size';
const DEFAULT_SIZE = { width: 1280, height: 900 };
// Floor only. The shared UI's narrow tier (#144) is designed down to 480, and below ~380 the chrome
// bar stops being usable at all; Figma clamps the ceiling to the screen, so no maximum is needed.
const MIN_SIZE = { width: 380, height: 420 };
const clampSize = (w: number, h: number): { width: number; height: number } => ({
  width: Math.max(MIN_SIZE.width, Math.round(w)),
  height: Math.max(MIN_SIZE.height, Math.round(h)),
});

figma.showUI(__html__, { ...DEFAULT_SIZE, themeColors: true });

/**
 * WHICH BUILD IS RUNNING, ON EVERY WRITE VERDICT (#836).
 *
 * Every checkout of this repo builds a `dist/` declaring plugin id `prism3-theming-plugin`, so Figma
 * lists them as one dev plugin and the imported entry is not visible from inside the plugin. On
 * 2026-08-26 the panel emitted from a two-day-old bundle in a third checkout and reported a clean run;
 * the wrong output was read as a broken emitter, and it took four rebuilds and a three-way byte
 * differential before the rail's engine-version chip settled it. `build.mjs` now stamps the source tree
 * and the build time into both bundles, and this is where the run report says so.
 *
 * ONE FUNCTION RATHER THAN SIX `appendBuildNote(...)` CALL SITES, because the property that matters is
 * that no terminal verdict can omit it. A seventh verdict added later goes through here or it does not
 * compile against `postVerdict`'s parameter; six hand-written appends would have let it through silently.
 *
 * `seed-info` deliberately does NOT go through this. That message reports what the FILE already holds,
 * written by whichever build wrote it, and stamping this build's identity onto it would attribute a
 * previous build's variables to this one — the precise confusion #836 is about, inverted.
 */
const postVerdict = (m: Extract<MainToUi, { type: 'apply-result' | 'component-result' }>): void =>
  postToUi({ ...m, summary: appendBuildNote(m.summary, PRISM3_BUILD) });

// THE PRIMARY CHANNEL — measured, not assumed, and this ordering is the opposite of how #836 framed it.
//
// At this file's own `DEFAULT_SIZE` (1280×900) the rail's build chip sits 78px BELOW the fold, last of
// 13 rail children in a document with 3191px hidden; and on a CLEAN run the verdict row renders no box
// at all — `#apply-detail` exists with `textContent === ''`, because `openDetail = m.ok ? null : 'apply'`.
// So on the exact 2026-08-26 shape — a run that reports success while emitting from the wrong bundle —
// neither panel surface says anything, and this line is the only one that does. It is also the channel
// three lanes were actually reading that afternoon: build output and the Figma console, while proving a
// bundle correct that was never the one running.
//
// The other two are confirmation, and each has a case where it detects: the verdict clause is visible
// and carries the identity on a FAILING run, and the chip settles it once you already suspect a mismatch
// and scroll. Neither is a substitute for this line. Do not "optimize" the chip on the belief that it is
// the detector — measure the window first (`docs/00-progress.md`, 2026-08-26, and #1107).
console.log(`[prism3 #836] ${buildNote(PRISM3_BUILD) ?? `PRISM3_BUILD is '${PRISM3_BUILD}' — no source tree in it.`}`);

/** Reopen at the size the designer last dragged to (#144). `clientStorage` is async and `showUI`
 *  is not, so the window opens at the default and resizes a tick later — the alternative (awaiting
 *  storage before showing any UI) trades a visible resize for a visible delay, which is worse.
 *  Anything unparseable is ignored rather than repaired: a bad blob just means the default size. */
void (async (): Promise<void> => {
  try {
    const stored: unknown = await figma.clientStorage.getAsync(UI_SIZE_KEY);
    if (!stored || typeof stored !== 'object') return;
    const { width, height } = stored as { width?: unknown; height?: unknown };
    if (typeof width !== 'number' || typeof height !== 'number') return;
    if (!Number.isFinite(width) || !Number.isFinite(height)) return;
    const size = clampSize(width, height);
    if (size.width === DEFAULT_SIZE.width && size.height === DEFAULT_SIZE.height) return;
    figma.ui.resize(size.width, size.height);
  } catch {
    /* storage unavailable — the default size already applied */
  }
})();

/**
 * Materialise a brand into `figma.variables` (#108) — the theme now comes LIVE from the shared UI's
 * knobs (a `BrandInput`), not a bundled fixture. Same pure core, same executor: only the source of
 * the theme changed (#110). Idempotent find-by-name; colour axis (`core` + `color.appearance`).
 */
const applyTheme = async (input: BrandInput): Promise<void> => {
  try {
    const theme = brandTheme(input);
    // FONTS FIRST (#680), before ANY variable write. Writing a `font/family/*` variable makes Figma
    // re-resolve every text style bound to it, and re-resolution throws `unloaded font` — which used to
    // abort the whole apply from inside a writer that touches no text. The face needed is the CROSS
    // PRODUCT of the incoming theme and what the file already has (the live failure was aurora's family
    // with harbor's style name, a pair in neither plan), so this reads the file's styles as well as the
    // plan. It never throws: a typeface this Figma genuinely lacks is reported, not fatal.
    const textPlan = buildTextStylePlan(theme);
    const pf = await preloadFonts(textPlan, {
      getLocalTextStylesAsync: figma.getLocalTextStylesAsync.bind(figma),
      loadFontAsync: figma.loadFontAsync.bind(figma),
      listAvailableFontsAsync: figma.listAvailableFontsAsync.bind(figma),
    });
    // ONE rename pass across all four variable executors (#1013). Built here rather than inside each
    // one because the static validation must happen once, before any write, and because a designer
    // reads a single list of what moved — not four. Since #1035 constructing it also RENAMES THE
    // COLLECTIONS, in one topologically-ordered, all-or-nothing pre-pass — so it must be awaited here,
    // before the first executor, and not moved below one of them: `color → color.appearance` and
    // `surface → color` are a chain, and an executor that renamed its own collection on the way past
    // would apply half of it. The atomicity obligation is stated at `beginMigration`.
    const mig = await beginMigration(figma.variables);
    // Colour axis (#108): the `core` palette slice + color.appearance, per-mode alias-bound.
    const r = await applyWritePlan(buildWritePlan(buildFigmaColor(theme)), figma.variables, mig);
    // SURFACE axis (#993): the `default`/`inverse` alias layer, written into the collection now named
    // `color` (#1013). MUST run after the line above — every row is a pointer into `color.appearance`,
    // resolved by NAME out of the file, so the targets have to be there already. An unresolved one is
    // reported in `misses`, never thrown.
    const surfacePlan = buildSurfaceWritePlan(theme);
    const sf = await applySurfacePlan(surfacePlan, figma.variables, mig);
    // FLOAT axes (#146): core/dimension, space/radius/size/border-width/focus/opacity + layout.
    const f = await applyFloatPlan(buildFloatWritePlan(theme), figma.variables, mig);
    // STYLE axes (shadow/gradient lane): Effect Styles (shadow/* + shadow-dark/*) + Paint Styles
    // (gradients, baked stops). The global `figma` structurally satisfies the StylesApi port.
    const s = await applyStylesPlan(buildStylesPlan(theme), figma);
    // TYPOGRAPHY (#237): core/font + type-sets variables first (bound targets must exist), then Text
    // Styles. The Text Style port needs figma's style/font surface + figma.variables' getter.
    const tv = await applyVarCollectionPlan(buildFontVarPlan(theme), figma.variables, mig);
    const textApi = {
      getLocalTextStylesAsync: figma.getLocalTextStylesAsync.bind(figma),
      createTextStyle: figma.createTextStyle.bind(figma),
      loadFontAsync: figma.loadFontAsync.bind(figma),
      getLocalVariablesAsync: figma.variables.getLocalVariablesAsync.bind(figma.variables),
      // #499: the real (family, style) pairs, so the executor can correct the engine's per-weight
      // style-name guess against what each family actually spells it.
      listAvailableFontsAsync: figma.listAvailableFontsAsync.bind(figma),
    };
    const ts = await applyTextStylePlan(textPlan, textApi);
    // Persist the exact knobs alongside the variables (#131) — so re-opening this file rehydrates
    // the UI to THIS brand, not the default. Only after a real materialisation (inside the try).
    persistInput(figma.root, input);
    const floatCreated = f.collections.reduce((n, c) => n + c.created, 0);
    const fontVarCreated = tv.collections.reduce((n, c) => n + c.created, 0);
    const fontVarTotal = tv.collections.reduce((n, c) => n + c.total, 0);
    // `s.misses` joins the tally with #236: a gradient stop naming a palette variable this file does
    // not have is the same class of failure as a dangling variable alias, and was previously invisible.
    // `tv.refused` joins it for the same reason (#680): a per-value write the host refused is a variable
    // the file does not now carry, which is precisely what a miss means here. Deliberately counted as a
    // miss rather than as a soft skip — a skipped TEXT STYLE leaves the token layer intact, while a
    // refused VARIABLE write leaves a hole in it, so this one should flip `ok` and the other should not.
    // `sf.misses` joins the tally for the same reason `s.misses` does, and it is the one axis where a miss
    // is INVISIBLE without the report (#993): a surface row whose alias target is absent keeps the literal
    // fallback pass A wrote, so it renders the right colour today and silently stops tracking the brand.
    // A pointer that looks fine and points nowhere — the #866 shape. Counted as a miss, so it flips `ok`.
    const misses =
      r.misses.length + sf.misses.length + f.misses.length + tv.misses.length + ts.misses.length + s.misses.length + tv.refused.length;
    // Orphan report (#479): variables in a collection the plan owns that the plan does not contain.
    // The write path is create-or-update-by-name, so it cannot see a rename — the new name is created
    // and the old one is never touched again. Reported, never deleted: this cannot distinguish a stale
    // ghost from a variable a designer is co-authoring, and deleting one they have bound to a layer is
    // unrecoverable from here. Surfaced in the summary rather than a return field alone, because drift
    // nobody reads is drift nobody fixes — the live file had ~106 ghosts across two collections and
    // every prior run reported success.
    const allOrphans = [
      ...r.orphans,
      // Read off the PLAN, not spelled (#1089): the label is what a designer reads in the summary, so a
      // stale one names a collection their file does not contain — which is exactly what happened when
      // this said `surface` after #1013 renamed it to `color`, and would have happened again now that
      // #1089 has renamed it to `color.surface`. The plan is the only thing that knows.
      { name: surfacePlan.name, names: sf.orphans },
      ...f.collections.map((c) => ({ name: c.name, names: c.orphans })),
      ...tv.collections.map((c) => ({ name: c.name, names: c.orphans })),
    ].filter((o) => o.names.length);
    const orphanCount = allOrphans.reduce((n, o) => n + o.names.length, 0);
    const orphanNote = orphanCount
      ? `, ⚠️ ${orphanCount} orphaned variables not in the plan (${allOrphans.map((o) => `${o.name}: ${o.names.length}`).join(', ')}) — likely renames; nothing was deleted`
      : '';
    // Rename migrations (#1013) — the other half of the orphan report above. A variable the plan renamed
    // is moved in place (id preserved, so every binding a designer made comes with it) rather than left
    // behind for `orphanNote` to count. The two are disjoint by construction: the orphan snapshot is taken
    // AFTER the migration pass, so a migrated name is no longer drift.
    //
    // Deliberately does NOT flip `ok`. A refused rename leaves exactly the pre-#1013 behaviour — the token
    // layer is complete either way, and the only loss is the old name's bindings, which is what happened on
    // every apply before this. So it is a warning, not a failure. But it must be VISIBLE, per this
    // executor's own restraint: this writes into a file the engine did not author, and a wrong migration
    // that reported nothing would be indistinguishable from a clean run. The `from`→`to` pair is printed
    // for each refusal because that pair is also what makes an applied migration reversible by hand.
    const migrated = mig.outcomes.filter((o) => o.status === 'migrated');
    const migRefused = mig.outcomes.filter((o) => isRefusal(o.status));
    const renameNote =
      (migrated.length ? `, ${migrated.length} renamed ${migrated.length === 1 ? 'token' : 'tokens'} migrated in place (bindings kept: ${migrated.slice(0, 3).map((o) => `${o.from}→${o.to}`).join(', ')}${migrated.length > 3 ? '…' : ''})` : '') +
      (migRefused.length ? `, ⚠️ ${migRefused.length} ${migRefused.length === 1 ? 'rename' : 'renames'} refused (${migRefused.slice(0, 2).map((o) => `${o.from}→${o.to}: ${o.status}`).join(', ')}) — nothing moved for those` : '') +
      (mig.refusals.length ? `, ⚠️ rename map invalid, no migrations attempted (${mig.refusals[0]})` : '');
    // #499: styles whose emitted name was corrected (e.g. `Semi Bold` → `SemiBold`). Worth surfacing
    // rather than silently succeeding — it is the difference between "the guess was right" and "the
    // guess was wrong and would have cost these styles before".
    const resolvedNote = ts.resolvedStyles ? `, ${ts.resolvedStyles} font styles name-resolved` : '';
    const skippedNote = ts.skipped.length
      ? `, ⚠️ ${ts.skipped.length} text styles skipped (font unavailable: ${ts.skipped.slice(0, 3).map((x) => x.name).join(', ')}${ts.skipped.length > 3 ? '…' : ''})`
      : '';
    // #680: the fonts loaded ahead of the write, and any face that would not load. Only NAMED faces are
    // listed — a crossed pair that does not exist is the ordinary case (most family × style combinations
    // are not real), and listing those would bury the reportable ones. `refused` should be empty on every
    // healthy apply: it means the preload missed something and the write survived it.
    const fontNote = pf.unavailable.length
      ? `, ⚠️ ${pf.unavailable.length} typeface${pf.unavailable.length === 1 ? '' : 's'} unavailable (${pf.unavailable.slice(0, 3).map((x) => x.face).join(', ')}${pf.unavailable.length > 3 ? '…' : ''})`
      : '';
    const refusedNote = tv.refused.length
      ? `, ⚠️ ${tv.refused.length} variable writes refused by Figma (${tv.refused[0].name}: ${tv.refused[0].reason.slice(0, 60)})`
      : '';
    const summary =
      `palette ${r.paletteTotal} (+${r.paletteCreated}), color ${r.colorTotal} (+${r.colorCreated}), ` +
      `surface ${sf.total} (+${sf.created}, ${sf.bound} aliased), ` +
      `dims/layout ${f.collections.length} collections (+${floatCreated}), ` +
      `styles ${s.effects.total} effects (+${s.effects.created}) / ${s.paints.total} gradients (+${s.paints.created}, ${s.paints.bound} stops bound), ` +
      `type ${pf.loaded} fonts loaded / ${fontVarTotal} font vars (+${fontVarCreated}) / ${ts.total} text styles (+${ts.created}), ` +
      `${r.bound + sf.bound + f.bound + tv.bound + ts.bound} bindings` + (misses ? `, ${misses} misses` : '') +
      renameNote + orphanNote + resolvedNote + skippedNote + fontNote + refusedNote;
    // Skipped fonts aren't a "failure" (variables still wrote); only true misses flip ok=false. The
    // pill's headline is derived from the COUNTS (see `apply-summary.ts`), never from `summary` — the
    // prose above is edited whenever an axis is added, and re-parsing it would make its wording
    // load-bearing. Only misses and skipped fonts reach the headline; #479's orphan count deliberately
    // does not, because the pill has a 24-char budget and three warning axes will not fit in it. The
    // orphans are still readable — they are in `summary`, which now has somewhere to be shown.
    postVerdict({ type: 'apply-result', ok: misses === 0, headline: applyHeadline(misses, ts.skipped.length), summary });
  } catch (e) {
    postVerdict({ type: 'apply-result', ok: false, headline: APPLY_FAILED_HEADLINE, summary: `write failed: ${(e as Error).message}` });
  }
};

/**
 * The component set's placeholder swap target — a component NAME resolved in the FILE, not a def field.
 *
 * Which component fills a slot is a fact about the file rather than about the button (#513, measured
 * live): the same def builds into a file whose placeholder icon is called anything, so the caller that
 * knows the file nominates it. Absent from the file, every slot degrades to a placeholder frame and says
 * so in the misses — a build that reports what it could not find, not one that refuses to run.
 */
const SWAP_TARGET = 'FPO-default-icon';

/**
 * Materialise the Button COMPONENT SET into this file (#483) — the component tier's write action.
 *
 * ITS OWN ACTION, NOT PART OF `applyTheme` (#652): a theme apply writes variables and is something a
 * designer runs after every knob change, where this writes hundreds of nodes onto the canvas. The set
 * also binds the variables by NAME, so `applyTheme` has to have run against this file first — a build
 * into an unthemed file resolves nothing and reports every binding as a miss, which is the honest
 * outcome rather than a guard.
 *
 * SCOPE IS THE FULL SET THE DEF MODELS — every variant `figmaProperties` declares (648 for Button:
 * 3 intent × 3 appearance × 3 size × 6 state × 2 leading × 2 trailing). Deliberately not filtered
 * here: `applyComponentPlan` takes `AnatomyPlan[]`, so scope is entirely which plans reach it, and an
 * axis filter would be a curation taxonomy nobody has chosen. If a smaller default is wanted, this line
 * is where it goes — nothing downstream needs to change.
 *
 * ONE DEF PER CALL, NAMED BY THE CALLER — and still not a catalogue loop (#804). The reason a loop was
 * refused stands unchanged and is worth restating, because this change could be mistaken for it: a loop
 * would throw on whichever defs are missing either half of what materialising takes, and it would make
 * the cheap 4-member run cost every member in the catalogue, so nobody could build one def to look at
 * it. What #804 adds is a caller naming WHICH def, which is the opposite of building all of them.
 *
 * Materialising a def takes two things, which `docs/38` §2 names in the vocabulary this comment
 * borrows so a reader moving between the design record and here is not translating: an `anatomy` block
 * (`figmaAnatomyPlan` throws without one) **and** a `figmaProperties` block declaring which axes the
 * set spans (`figmaAnatomySet` throws without that). **An `anatomy` block is necessary and not
 * sufficient** — `focus-ring` carries one and still cannot be built, because declaring its axes would
 * validate cleanly and throw at projection.
 *
 * **The count is not written here on purpose.** The claim this replaced was *"Button is the only def in
 * the catalogue that has one"* — true when written, false since #734 and #741, and it rotted silently
 * because a count in a comment has an expiry date that nothing checks. Restating it as a newer count
 * would rot on the same schedule. For today's numbers read `componentDefs` (#742), which is a real set
 * that `typecheck-components.ts` asserts holds exactly the defs git tracks — or `docs/38` §2's census
 * row, which carries its own **was** column. `buildableDefs` below derives the answer by ASKING the
 * projector rather than by carrying a list, for the same reason.
 *
 * WHAT MADE THIS ACTION BUTTON-SHAPED, AND WHERE EACH OF THOSE THREE THINGS WENT. The claim this
 * replaced named them: *"this action's contract is Button's 648-member set: `SWAP_TARGET`, the progress
 * calibration below, and #483's whole scope."* Each was checked against a real projection rather than
 * reasoned about, because "add a field" would otherwise understate the change by three things:
 *
 *   • `SWAP_TARGET` — GENERALIZES UNCHANGED, and it turns out to be inert where a def has no swap parts.
 *     Measured: `figmaAnatomySet(fieldLabel, { swapTarget: 'FPO-default-icon' })` and
 *     `figmaAnatomySet(fieldLabel, {})` produce identical plans and identical set properties, because
 *     the option is only read where a part declares `nesting: { kind: 'swap' }` (`anatomy-figma.ts:685`).
 *     Button's 648 plans carry 702 swap nodes, IconButton's 162 carry 162, `icon` and `field-label` carry
 *     none. So it is passed unconditionally and the def decides whether it means anything — no
 *     per-def branch, and nothing for a caller with no icon placeholder to nominate.
 *   • THE PROGRESS CALIBRATION — GENERALIZES, because it was already derived rather than declared.
 *     `CHUNK` is a members-per-chunk constant, and `build-telemetry.ts` computes every figure it prints
 *     from the reports themselves (`p.total`, `totalMs / s.members`). Verified at 4 members: the per-phase
 *     rows, the per-member cost, the worst-chunk frame count and the "UNREACHABLE by CHUNK alone" warning
 *     all still read correctly. The one thing that does NOT transfer is the *prose* quoting 105s and
 *     1m10s, which is a measurement OF Button — so it moves into a per-def estimate in the UI rather than
 *     being restated for every def (see `apps/studio/src/main.ts`).
 *   • #483's SCOPE — STAYS EXACTLY WHAT IT WAS: the full set the def models, every variant
 *     `figmaProperties` declares. Nothing here filters, and `messages.ts` records why an axis filter is
 *     still not a field on the message even though the def now is.
 *
 * The global `figma` satisfies `ComponentsApi` wholesale, so this call site is what proves that port on
 * every typecheck — the same way the three sibling lanes are proven, and what retired
 * `write-components.ts`'s hand-written `PortHolds` assertion.
 *
 * IT REPORTS PROGRESS AS IT GOES (#684), which is only possible because the executor now yields — a
 * message posted from inside a loop that never returns to the event loop is queued, not delivered, so
 * before the chunking this function had nothing to report and no moment to report it in. `onProgress`
 * fires at every chunk boundary; the terminal `component-result` still lands exactly once, at the end.
 */
const buildComponents = async (defId?: string): Promise<void> => {
  // EXACTLY ONE VERDICT PER BUILD, and this flag exists because #908's reordering is what made a second one
  // possible. The success verdict now posts BEFORE the console telemetry, so a throw in the telemetry tail
  // would reach the catch below and overwrite a correct "built" verdict with "apply failed" — reporting a
  // successful build as a failure because a diagnostic could not be formatted. Cheap to prevent, and the
  // invariant is one #870 depends on: a designer reads the last verdict rendered.
  let verdictPosted = false;
  try {
    // ABSENT MEANS BUTTON, which is #483's contract preserved rather than a default chosen here: a UI
    // older than #804 posts no `def`, and it must keep building the thing its own control names.
    const def = defId === undefined ? button : componentDefs.find((d) => d.id === defId);
    if (!def) {
      // A FAILED RESULT, NOT A THROW. The UI offers only ids it derived from `componentDefs`, so an id
      // that misses means the two sides disagree about the catalogue — which the designer has to be told,
      // because the alternative is a pill that stays at "Building…" forever. Named ids in the message so
      // the disagreement is diagnosable from the pill alone.
      // "this build knows …" was already the sentence here, and until #836 nothing said WHICH build that
      // was — the disagreement is between two bundles, so naming only one side of it is half a diagnosis.
      postVerdict({
        type: 'component-result', ok: false, headline: '✗ unknown def',
        summary: `no component def with id '${defId}' — this build knows ${componentDefs.map((d) => d.id).join(', ')}`,
      });
      return;
    }
    // REFUSED BY DECLARATION (#869) — the def's own `notStandalone`, quoted verbatim as the summary.
    //
    // Sited HERE rather than only in the picker, and for the same reason the unknown-def path above is: a
    // UI older than this build offers whatever its own catalogue held, so a refusal that lived only in the
    // picker would be advice, not a floor. It reads a FIELD rather than judging the plan, which is the
    // whole design — `focus-ring` projects 2 members with 0 binding errors and nothing throws, so every
    // signal available at this line says the build is fine. What it produced was a 100×100 default frame
    // with the correct token at 1px: an output that reads as a success, which is worse than an error.
    //
    // A FAILED RESULT, matching the path above, so it reaches the verdict line #870 fixed. A throw here
    // would land in the outer `catch` and report as a build error, which would be a lie about the cause.
    // The reason is the def's string unedited: whoever declared the ceiling wrote the sentence for this
    // moment, and paraphrasing it here would be a second copy to keep true.
    if (def.figmaProperties?.notStandalone) {
      postVerdict({
        type: 'component-result', ok: false, headline: '✗ not buildable on its own',
        summary: def.figmaProperties.notStandalone,
      });
      return;
    }
    // `SWAP_TARGET` PASSED UNCONDITIONALLY, because it is inert where a def has no swap parts — measured,
    // see the header. A per-def branch here would be a branch on a distinction the projector already makes.
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    // Every reading kept, for the end-of-run summary. 54 objects for a 648 build — the memory is nothing
    // and the alternative is a running aggregate that cannot report a distribution.
    const reports: ComponentProgress[] = [];
    const r = await applyComponentPlan(plans, figma, {
      // Posted straight through, unaggregated: the executor owns the phase/fraction and this is the
      // only place that can see the timing. `chunkMs` is CALIBRATION data (see `CHUNK`) — the shim has
      // no event loop, so chunk size can only be tuned from a live run, and this is how it gets out.
      onProgress: (p) => {
        reports.push(p);
        // Logged as it happens, not only in the summary. If the build hangs, the last line printed is
        // which phase and which chunk it hung on — the single most useful fact in a hang report, and one
        // an end-of-run summary cannot give because a hung run never reaches it.
        console.log(chunkLine(p));
        // FIELD BY FIELD, not `...p`, and the reason is that these two consumers want different things.
        // The console gets the whole reading including `elapsedMs`; the pill shows a fraction and nothing
        // more. Spreading would put every field the executor ever adds onto the bridge by default — a
        // widening the message contract in `messages.ts` never agreed to, and one that reads as intentional.
        postToUi({ type: 'component-progress', phase: p.phase, done: p.done, total: p.total, chunkMs: p.chunkMs });
      },
    });
    // THE SETTLE PROBE (#684), RUN WITHOUT THE VERDICT WAITING ON IT (#908). It still starts at the exact
    // moment the executor returns — the moment the pill says done and the file was previously frozen for
    // 1m10s — and the console telemetry below still carries its number, so #684's coupling is intact. What
    // #908 removed is the designer waiting for it: awaited here, a busy host held `⋯ Building…` for the
    // whole tick budget (8.4s at 20ms of work per tick, 40s at 100ms) and then reported `null`. The
    // ordering is `verdictBeforeSettle`'s, and its header says why it is a named function with a test.
    const settleMs = await verdictBeforeSettle(measureSettle, () => {
      // Cap the miss list rather than the count: `summary` is read in a chrome row that wraps, but a
      // starved file can produce one miss per binding per member and the whole list is not a summary.
      const missNote = r.misses.length
        ? `, ⚠️ ${r.misses.length} misses (${r.misses.slice(0, 3).join('; ')}${r.misses.length > 3 ? '; …' : ''})`
        : '';
      // THE STALE REASON, appended once (#827) — see `staleNote` for why the reason and the remedy are
      // one clause. Placed after `missNote` because the per-member STALE lines are inside that list, and
      // this is what explains them.
      const stale = staleNote(r.stale, ENGINE_VERSION);
      const summary = r.set === null
        ? `nothing assembled — no set on this page and no member built${missNote}`
        : `set '${r.set}': ${r.variants} variants (+${r.added} built, ${r.skipped} already present` +
          `${r.stale ? `, ${r.stale} stale` : ''}), ` +
          `grid ${r.grid[0]}×${r.grid[1]}, ${Math.round(r.size[0])}×${Math.round(r.size[1])}px, ` +
          `axes ${r.axes.join('/') || '—'}, properties ${r.properties.join('/') || '—'}, ` +
          `${r.refs} refs across ${r.wiredMembers} members${missNote}${stale ? `. ${stale}` : ''}`;
      // `ok` is NOT `misses.length === 0`, and the difference is the whole reason `skipped` is a number:
      // a re-run skips every member by name and reports each as a miss, so a miss-count test would call
      // the idempotent case a failure. The headline is derived from the three COUNTS for the same reason
      // the theme write's is — never by re-reading the prose above.
      //
      // A STALE MEMBER MAKES THE RUN NOT-`ok` (#827), and it does so through the line below UNCHANGED:
      // the STALE lines are in `misses` and are not counted in `skipped`, so the equality already fails.
      // Stated rather than left to be re-derived, because it is the one place where the right behaviour
      // comes out of an expression that does not mention the new field.
      postVerdict({
        type: 'component-result',
        ok: r.set !== null && r.misses.length === r.skipped,
        headline: componentHeadline(r.added, r.skipped, r.misses.length - r.skipped - r.stale, r.stale),
        summary,
      });
      verdictPosted = true;
    });
    // BOTH CONSOLE BLOCKS RUN AFTER THE AWAIT, deliberately. They are the only two things left that need
    // the settle number, and keeping them out of the sampling window matters: a `console.log` is
    // main-thread work, so printing them while the probe is sampling would show up as lag and could push
    // an otherwise-idle file off its calm run. The verdict post above IS inside the window, which is
    // correct rather than a compromise — it is real main-thread work happening after the executor
    // returned, and it is sub-millisecond.
    //
    // The #701 hit rate, on its own line and only in the console. It answers "was the search actually
    // avoided this run", which is the question the wire timing above cannot answer on its own: a slow wire
    // pass with 0 retained is the fix not engaging, and a slow one with all of them retained is a cost
    // living somewhere else. Kept out of `summary` deliberately — that string is read in a chrome row by a
    // designer, and the retain rate is an engine-tuning fact rather than a fact about their component set.
    console.log(
      `[prism3 #701] wire lookups: ${r.refsRetained} retained, ${r.refsKnownAbsent} known-absent, ` +
        `${r.refsSearched} searched (${r.refsRetained + r.refsKnownAbsent + r.refsSearched} total; ` +
        // This line used to end "only the last group pays the ~24ms cold scenegraph search", which the live
        // run falsified twice over. The live warm run searched all 2,592 in 185ms — ~0.07ms
        // apiece — so the cold price is a property of searching a scenegraph MID-RECONCILIATION, not of
        // searching. A warm re-run is all-searched and cheap; a cold build that reports any searches is
        // the expensive case. Which is why the counter is worth printing: the number alone is not a cost.
        'searches are only expensive during a cold build, when the scenegraph is still reconciling)',
    );
    // The telemetry block, printed LAST so it is the bottom of the console and can be copied in one
    // selection. It is the deliverable of the calibration run: `CHUNK` is set from these numbers.
    for (const line of summaryLines(reports, settleMs)) console.log(line);
  } catch (e) {
    // `planSetLayout` throws on a set that could not be assembled coherently — before anything reaches
    // the file. That is a def-tier or scope-tier error, and its message names the cause.
    //
    // GUARDED, per `verdictPosted` above: once the build has reported itself built, a later throw is a
    // reporting failure and not a build failure, so it goes to the console rather than over the verdict.
    if (verdictPosted) console.error('[prism3 #908] build reported success; the telemetry tail then threw:', e);
    else {
      // WHAT THE FAILED RUN LEFT IN THE FILE (#913), if anything. `null` means nothing was written — the
      // `planSetLayout` refusal — and that verdict stays exactly what it was. Non-null means there are
      // nodes on the canvas, and the count goes in the PILL rather than only in the detail: the two-node
      // case is the one a designer overlooks and then re-runs on top of.
      //
      // The cause LEADS the summary in both cases, unchanged and unwrapped. The executor attaches these
      // facts to the host's own error rather than throwing a wrapper, so nothing about this line's
      // reporting of the failure depends on the marking having worked.
      const partial = partialWriteOf(e);
      postVerdict({
        type: 'component-result', ok: false,
        headline: partial ? partialWriteHeadline(partial) : APPLY_FAILED_HEADLINE,
        summary: `component build failed: ${(e as Error).message}${partial ? partialWriteNote(partial) : ''}`,
      });
    }
  }
};

/**
 * Boot read-back (#109): read the current file's colour variables + verify the materialisation
 * contract, and hand the UI a summary. Informational — reports that an existing themed file's
 * contract holds; the actual knob-rehydration is `restoreToUi` (#131), which is independent.
 */
const seedFromFile = async (): Promise<void> => {
  try {
    const snap = await readFigmaVariables(figma.variables);
    if (snap.color.length === 0) {
      // `present: false` — #721's state 3. The UI needs this told apart from a themed file as a FLAG,
      // not by parsing the sentence: it is what stops "no theme here" being reported as knobs that
      // could not be recovered (#722).
      postToUi({ type: 'seed-info', ok: true, present: false, summary: 'No existing Prism3 theme in this file — start from the knobs.' });
      return;
    }
    const v = verifyReadback(snap);
    const failed = Object.entries(v.checks).filter(([, ok]) => !ok).map(([k]) => k);
    const summary =
      `Existing theme: ${v.details.colorVars} color vars, modes ${v.details.modes.join('/') || '—'}` +
      (v.ok ? ' — contract holds ✓' : ` — FAILED: ${failed.join(', ')}`);
    // `present: true` regardless of `ok`: the variables ARE here, and whether the contract verified is
    // a separate fact. Collapsing the two would make a contract failure look like an unthemed file.
    postToUi({ type: 'seed-info', ok: v.ok, present: true, summary });
  } catch (e) {
    // The read itself failed, so presence is UNKNOWN — reported false, since the outcome is an error
    // either way and claiming presence we could not establish would be worse than not claiming it.
    postToUi({ type: 'seed-info', ok: false, present: false, summary: `read-back failed: ${(e as Error).message}` });
  }
};

/**
 * Boot knob-rehydration (#131): read the `BrandInput` the last apply persisted in shared-data and,
 * if a trusted blob exists, hand it to the UI so it opens on the persisted brand. Genuine absence →
 * `null` → nothing posted → the UI keeps its defaults (same as an unthemed file). Independent of
 * `seedFromFile` — the read-back verdict and the knob restore don't gate each other.
 *
 * #480: a stored-but-untrusted blob (old/foreign shape, unrecognized schema version) makes
 * `restoreInput` THROW rather than return `null` — caught here and reported as `restore-input-error`
 * so the designer sees a clear refusal instead of the UI silently opening on defaults as if the file
 * had never been themed.
 */
const restoreToUi = (): void => {
  try {
    const input = restoreInput(figma.root);
    if (input) postToUi({ type: 'restore-input', input });
  } catch (e) {
    postToUi({ type: 'restore-input-error', message: (e as Error).message });
  }
};

/**
 * Push the fonts this Figma can load up to the shared UI (the #113 Figma arm). Runs on `ui-ready`
 * beside the read-back and the knob restore.
 *
 * Failure posts NOTHING, deliberately: the UI's fallback is its own free-text input, which works. An
 * error message would report a degradation the designer cannot act on, and a partial list would be
 * worse than none — it would make a real font look unavailable.
 */
const sendFonts = async (): Promise<void> => {
  try {
    // One read, both shapes: the counts carry the family names too, so calling `listFamilies` as well
    // would mean a second `listAvailableFontsAsync` (11,005 entries) for data already in hand.
    const counts = await listFamilyStyleCounts(figma);
    if (counts.length) postToUi({
      type: 'font-list',
      families: counts.map((c) => c.family),
      styles: counts.map((c) => c.styles),
    });
  } catch {
    /* no font list — the UI keeps its free-text input (which is the pre-#113 behavior) */
  }
};

onUiMessage((msg: UiToMain) => {
  switch (msg.type) {
    case 'ui-ready':
      // UI's listener is attached — run the boot read-back (seed summary) + rehydrate the knobs.
      void seedFromFile();
      restoreToUi();
      void sendFonts();
      return;
    case 'apply-theme':
      void applyTheme(msg.input);
      return;
    case 'build-components':
      // `msg.def` straight through, `undefined` included — the resolution lives in `buildComponents`
      // (absent means Button) rather than being defaulted here, so there is one place that decides it.
      void buildComponents(msg.def);
      return;
    case 'resize-ui': {
      // Resize on every drag message so the window tracks the pointer; persist only on the
      // commit (pointer-up), so a drag is one storage write rather than hundreds.
      const size = clampSize(msg.width, msg.height);
      figma.ui.resize(size.width, size.height);
      if (msg.commit) void figma.clientStorage.setAsync(UI_SIZE_KEY, size).catch(() => {/* best-effort */});
      return;
    }
    default:
      assertNever(msg); // compile error if a UiToMain variant is added but not handled here
  }
});
