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
import { applyHeadline, APPLY_FAILED_HEADLINE, conflictHeadline, componentHeadline, staleNote, partialWriteHeadline, partialWriteNote } from './apply-summary';
import { ENGINE_VERSION } from '@prism3/engine/version';
import { appendBuildNote, buildNote } from '../../studio/src/build-identity';
import { onUiMessage, postToUi } from './bridge-main';
import { assertNever } from './messages';
import type { MainToUi, UiToMain } from './messages';
import { strandedCollections, ownedModeIds } from './write-figma';
import { computePrunePlan, prunePlanCount, applyPrunePlan, prunePreviewSummary, pruneAppliedSummary } from './prune-figma';
import type { PruneInput, PruneApi } from './prune-figma';
import { isRefusal } from '@prism3/engine/rename-map';
import { rootOf } from '@prism3/engine/figma-names';
import { conflictSummary } from './preflight';
import { runApplyTheme } from './apply-theme';
import { applyComponentPlan, partialWriteOf } from './write-components';
import type { ComponentProgress, CompPageTarget, CompNode } from './write-components';
import { scaffoldSkeleton, resolveComponentPage } from './file-setup';
import { buildFileComponents } from './file-components';
import { TAXONOMY } from './file-taxonomy';
import { chunkLine, summaryLines, measureSettle, verdictBeforeSettle } from './build-telemetry';
import { readFigmaVariables } from './read-figma';
import { listFamilyStyleCounts } from './list-fonts';
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import { buildWritePlan, buildFloatWritePlan, buildStylesPlan, buildGridStylePlan, buildFontVarPlan, buildTextStylePlan } from '@prism3/engine/write-plan';
import { verifyReadback } from '@prism3/engine/read-back';
import { restoreInput } from './persist-figma';
import { brandTheme } from '@prism3/engine/theme';
import type { BrandInput } from '@prism3/engine/theme';
import { figmaAnatomySet } from '@prism3/engine/anatomy-figma';
import { materializeForBrand } from './brand-def';
import { prebuildDependencies, alsoBuiltNote, DependencyBuildError, SWAP_TARGET } from './build-deps';
import type { DepHost } from './build-deps';
import { button } from '@prism3/engine/components/button';
import { componentDefs } from '@prism3/engine/components/index';
import type { ComponentDef } from '@prism3/engine/component-schema';
import { createAgentLink } from './agent-link';
import { createDispatcher, componentCensus } from './agent-dispatch';
import type { ActionSink, AgentActions } from './agent-dispatch';
import { AGENT_COMMANDS, failedResult } from './agent-protocol';

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
const postVerdict = (m: Extract<MainToUi, { type: 'apply-result' | 'component-result' }>, sink: ActionSink): void =>
  sink.post({ ...m, summary: appendBuildNote(m.summary, PRISM3_BUILD) });

/**
 * WHERE A HANDLER REPORTS (the agent link). Every action below takes an `ActionSink` and reports to it
 * rather than to `postToUi` directly. The panel's buttons pass `uiSink`, which posts exactly what they
 * posted before and drops the structured `data`; the agent link's dispatcher passes a capturing sink, so an
 * agent's command gets the same verdict — headline, summary, build note — plus the facts behind it. One
 * handler, two readers, and no second copy of any action (`agent-dispatch.ts`).
 */
const uiSink: ActionSink = { post: postToUi, data: () => undefined };

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
 * the theme changed (#110). Idempotent find-by-name; colour axis (`core` + `color`).
 */
const applyTheme = async (input: BrandInput, sink: ActionSink): Promise<void> => {
  try {
    // The write sequence — fonts first, pre-flight, then the guarded executor calls — lives in
    // `apply-theme.ts` since #111, so the MCP paste harness can prove parity against this exact path. The
    // global `figma` is the host; everything below this line (the report) is unchanged.
    const { plans, pf, guarded } = await runApplyTheme(input, figma);
    const { colorFiles, floatPlan, fontPlan } = plans;
    if (!guarded.ok) {
      sink.data({ conflicts: guarded.conflicts });
      postVerdict({ type: 'apply-result', ok: false, headline: conflictHeadline(guarded.conflicts.length), summary: conflictSummary(guarded.conflicts) }, sink);
      return;
    }
    const { mig, r, f, s, gs, tv, ts } = guarded.result;
    const floatCreated = f.collections.reduce((n, c) => n + c.created, 0);
    const fontVarCreated = tv.collections.reduce((n, c) => n + c.created, 0);
    const fontVarTotal = tv.collections.reduce((n, c) => n + c.total, 0);
    // `s.misses` joins the tally with #236: a gradient stop naming a palette variable this file does
    // not have is the same class of failure as a dangling variable alias, and was previously invisible.
    // `tv.refused` joins it for the same reason (#680): a per-value write the host refused is a variable
    // the file does not now carry, which is precisely what a miss means here. Deliberately counted as a
    // miss rather than as a soft skip — a skipped TEXT STYLE leaves the token layer intact, while a
    // refused VARIABLE write leaves a hole in it, so this one should flip `ok` and the other should not.
    // The pointer tier's `sf.misses` left this tally with #1148, and the loss is not a gap: it was the
    // one axis where a miss was INVISIBLE without the report (#993), because a pointer row whose target
    // was absent kept the literal fallback pass A wrote and silently stopped tracking the brand — the
    // #866 shape. One tier has no pointer that can go dead, so there is nothing left to report.
    const misses =
      r.misses.length + f.misses.length + tv.misses.length + ts.misses.length + s.misses.length + tv.refused.length;
    // Orphan report (#479): variables in a collection the plan owns that the plan does not contain.
    // The write path is create-or-update-by-name, so it cannot see a rename — the new name is created
    // and the old one is never touched again. Reported, never deleted: this cannot distinguish a stale
    // ghost from a variable a designer is co-authoring, and deleting one they have bound to a layer is
    // unrecoverable from here. Surfaced in the summary rather than a return field alone, because drift
    // nobody reads is drift nobody fixes — the live file had ~106 ghosts across two collections and
    // every prior run reported success.
    // The pointer tier's entry is gone with the tier (#1148), and it is the one collection this report no
    // longer covers: Figma cannot re-parent a variable, so a designer's existing `color.surface` is
    // orphaned WHOLE rather than merged, and nothing here counts it. Their bindings keep resolving —
    // those variables still alias into the renamed value collection — but the stale collection is
    // unreported. Filed separately rather than papered over with a hardcoded name, which is the mistake
    // #1089 fixed here twice: the label a designer reads must come from something that knows.
    const allOrphans = [
      ...r.orphans,
      ...f.collections.map((c) => ({ name: c.name, names: c.orphans })),
      ...tv.collections.map((c) => ({ name: c.name, names: c.orphans })),
    ].filter((o) => o.names.length);
    const orphanCount = allOrphans.reduce((n, o) => n + o.names.length, 0);
    const orphanNote = orphanCount
      ? `, ⚠️ ${orphanCount} orphaned variables not in the plan (${allOrphans.map((o) => `${o.name}: ${o.names.length}`).join(', ')}) — likely renames; nothing was deleted`
      : '';
    // STRANDED COLLECTIONS (#1152) — the level above the orphan report, and the one no executor can
    // reach. `allOrphans` is assembled FROM the executors, so it can only describe collections a plan
    // already owns; a collection nothing plans is never upserted, never indexed, never counted, and
    // its silence is indistinguishable from a clean bill. The paragraph above says exactly this about
    // `color.surface` and then has to say "filed separately" — this is that filing, closed.
    //
    // Enumerated from the FILE, not from any plan: every collection Figma holds, minus the ones the
    // plans name. The plan-owned set is spelled with `$collection` / `plan.name` rather than the axis
    // labels the orphan report uses, because `core/dimension` is a label and `core` is what Figma has.
    const plannedCollections = [
      colorFiles.palette.$collection,
      ...colorFiles.color.map((c) => c.$collection),
      ...floatPlan.map((p) => p.name),
      ...fontPlan.map((p) => p.name),
    ];
    const stranded = strandedCollections(
      (await figma.variables.getLocalVariableCollectionsAsync()).map((c) => c.name),
      plannedCollections,
    );
    // Not a failure, and deliberately not one: a stranded collection breaks nothing — its variables
    // still exist and every binding into them still resolves. It is stale, not broken, and the
    // decision to remove it is the designer's, since it may hold variables they bound by hand.
    const strandedNote = stranded.length
      ? `, ⚠️ ${stranded.length} collection${stranded.length === 1 ? '' : 's'} in this file that no plan writes (${stranded.slice(0, 3).join(', ')}${stranded.length > 3 ? '…' : ''}) — left over from an earlier version or hand-made; nothing was deleted`
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
      `dims/layout ${f.collections.length} collections (+${floatCreated}), ` +
      `styles ${s.effects.total} effects (+${s.effects.created}) / ${s.paints.total} gradients (+${s.paints.created}, ${s.paints.bound} stops bound) / ${gs.total} grid styles (+${gs.created}), ` +
      `type ${pf.loaded} fonts loaded / ${fontVarTotal} font vars (+${fontVarCreated}) / ${ts.total} text styles (+${ts.created}), ` +
      `${r.bound + f.bound + tv.bound + ts.bound} bindings` + (misses ? `, ${misses} misses` : '') +
      renameNote + orphanNote + strandedNote + resolvedNote + skippedNote + fontNote + refusedNote;
    // Skipped fonts aren't a "failure" (variables still wrote); only true misses flip ok=false. The
    // pill's headline is derived from the COUNTS (see `apply-summary.ts`), never from `summary` — the
    // prose above is edited whenever an axis is added, and re-parsing it would make its wording
    // load-bearing. Only misses and skipped fonts reach the headline; #479's orphan count deliberately
    // does not, because the pill has a 24-char budget and three warning axes will not fit in it. The
    // orphans are still readable — they are in `summary`, which now has somewhere to be shown.
    // The facts behind `summary`, as objects (the agent link; `uiSink` drops them). Every list the prose
    // above caps at three is here whole, keyed by the axis that produced it.
    sink.data({
      apply: {
        misses: { color: r.misses, float: f.misses, fontVars: tv.misses, textStyles: ts.misses, styles: s.misses, refused: tv.refused },
        counts: {
          palette: { total: r.paletteTotal, created: r.paletteCreated }, color: { total: r.colorTotal, created: r.colorCreated },
          floatCollections: f.collections.length, floatCreated,
          effects: { total: s.effects.total, created: s.effects.created },
          gradients: { total: s.paints.total, created: s.paints.created, stopsBound: s.paints.bound },
          gridStyles: { total: gs.total, created: gs.created },
          fontsLoaded: pf.loaded, fontVars: { total: fontVarTotal, created: fontVarCreated },
          textStyles: { total: ts.total, created: ts.created }, bindings: r.bound + f.bound + tv.bound + ts.bound,
        },
        orphans: allOrphans, stranded,
        renames: { migrated, refused: migRefused, mapRefusals: mig.refusals },
        textStylesSkipped: ts.skipped, fontsUnavailable: pf.unavailable, resolvedStyles: ts.resolvedStyles,
      },
    });
    postVerdict({ type: 'apply-result', ok: misses === 0, headline: applyHeadline(misses, ts.skipped.length), summary }, sink);
  } catch (e) {
    postVerdict({ type: 'apply-result', ok: false, headline: APPLY_FAILED_HEADLINE, summary: `write failed: ${(e as Error).message}` }, sink);
  }
};

/**
 * OPT-IN PRUNE (#1521, extended to modes + all four style kinds in #1570) — remove the styles, modes,
 * variables and collections the current config no longer emits.
 *
 * #1570 widened the scope because a config that SHRINKS leaves drift the original three arms could not
 * see: reducing `layout.breakpoints` from 6 to 2 strands four `layout` modes and four `Grid / *` styles,
 * and neither had any cleanup path. The modes arm is also the only way the collection's DEFAULT mode
 * becomes the plan's first again — Figma has no reorder API, so the stale leading modes have to go.
 *
 * The delete #479 / #1152 deliberately refused to do on a normal apply, done here because the designer
 * asked for it and, on `confirm`, saw the count first. It builds the SAME plans `applyTheme` builds
 * (so "stale" means exactly "not in the plan this brand emits"), reads the file once, and hands both to
 * the pure `computePrunePlan` — which reuses `orphansOf` / `strandedCollections` and adds the namespace
 * guard that keeps a hand-added item safe (see `prune-figma.ts`).
 *
 * `confirm: false` PREVIEWS — computes and posts the count + review text, deletes nothing.
 * `confirm: true` DELETES — recomputes from a fresh read (not from the preview's list, so the delete
 * acts on the file's current orphan set) and runs `applyPrunePlan`.
 *
 * Never flips into `applyTheme`'s path and writes nothing but deletes: a prune only removes.
 */
const prune = async (input: BrandInput, confirm: boolean, sink: ActionSink): Promise<void> => {
  try {
    const theme = brandTheme(input);
    // The plans, exactly as `applyTheme` builds them — the plan is what defines "stale". No write.
    const colorFiles = buildFigmaColor(theme);
    const wp = buildWritePlan(colorFiles);
    const floatPlan = buildFloatWritePlan(theme);
    const fontPlan = buildFontVarPlan(theme);
    const textPlan = buildTextStylePlan(theme);
    const plannedVariables = [
      ...wp.palette.map((r) => r.name),
      ...wp.color.create.map((r) => r.name),
      ...floatPlan.flatMap((p) => p.create.map((r) => r.name)),
      ...fontPlan.flatMap((p) => p.rows.map((r) => r.name)),
    ];
    // Spelled with `$collection` / `plan.name` (what Figma holds), not the axis labels the orphan report
    // uses — the same set `applyTheme` assembles for its stranded-collection report.
    const plannedCollections = [
      colorFiles.palette.$collection,
      ...colorFiles.color.map((c) => c.$collection),
      ...floatPlan.map((p) => p.name),
      ...fontPlan.map((p) => p.name),
    ];
    // The three non-text style surfaces (#1570) — the same builders `applyTheme` writes through, so
    // "stale" means the same thing for a grid style as it does for a variable.
    const stylesPlan = buildStylesPlan(theme);
    const gridPlan = buildGridStylePlan(theme);
    const plannedStyles = {
      text: textPlan.map((r) => r.name),
      effect: stylesPlan.effects.map((r) => r.name),
      paint: stylesPlan.paints.map((r) => r.name),
      grid: gridPlan.map((r) => r.name),
    };
    // Every plan's mode declaration, per collection — UNIONED by `computePrunePlan`, which is why each
    // executor's entry is listed separately rather than merged here. `core` is written by three passes and
    // the font pass can declare modes the float pass does not; a merge that lost one would offer that
    // pass's modes for deletion. The colour collection's name comes from the emission (`$collection`), not
    // from a literal, for the reason #1089 fixed twice in this file: the label must come from something
    // that knows.
    const plannedModes = [
      ...[...new Set(colorFiles.color.map((c) => c.$collection))].map((collection) => ({ collection, modes: wp.color.modes })),
      ...floatPlan.map((p) => ({ collection: p.name, modes: p.modes })),
      ...fontPlan.map((p) => ({ collection: p.name, modes: p.modes })),
    ];
    // The brand root every emitted variable carries — read positionally off any planned name (#1097), so
    // no prefix is spelled here. Empty (no planned vars) disables the namespace guard, which prunes nothing.
    const root = rootOf(plannedVariables[0] ?? '');

    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const vars = await figma.variables.getLocalVariablesAsync();
    const namesByCollectionId = new Map<string, string[]>();
    for (const c of cols) namesByCollectionId.set(c.id, []);
    for (const v of vars) namesByCollectionId.get(v.variableCollectionId)?.push(v.name);
    const snapshot: PruneInput = {
      collections: cols.map((c) => ({
        name: c.name,
        variableNames: namesByCollectionId.get(c.id) ?? [],
        // `modeId` as well as `name`: #1570 left files holding two modes called `sm`, and only the id
        // distinguishes the reachable one from the ghost.
        modes: c.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
        // The engine's own mode provenance (#1581), read off the collection where `stampOwnedModes` wrote
        // it. Without this the mode arm judges by name alone and a designer's hand-added mode is offered
        // for deletion — the residual #1570 shipped with.
        ownedModeIds: ownedModeIds(c),
      })),
      // `description` as well as `name` (#1577): the engine writes one on every style it emits, so it is
      // what recognizes a style a designer RENAMED out of the plan's group. Reduced to plain data here
      // rather than passed as live nodes, so `computePrunePlan` stays pure over a snapshot.
      styles: {
        text: (await figma.getLocalTextStylesAsync()).map((s) => ({ name: s.name, description: s.description })),
        effect: (await figma.getLocalEffectStylesAsync()).map((s) => ({ name: s.name, description: s.description })),
        paint: (await figma.getLocalPaintStylesAsync()).map((s) => ({ name: s.name, description: s.description })),
        grid: (await figma.getLocalGridStylesAsync()).map((s) => ({ name: s.name, description: s.description })),
      },
      plannedVariables,
      plannedCollections,
      plannedStyles,
      plannedModes,
      root,
    };
    const plan = computePrunePlan(snapshot);

    sink.data({ prunePlan: plan });
    if (!confirm) {
      sink.post({ type: 'prune-result', ok: true, applied: false, count: prunePlanCount(plan), summary: prunePreviewSummary(plan) });
      return;
    }

    const pruneApi: PruneApi = {
      getLocalVariableCollectionsAsync: () => figma.variables.getLocalVariableCollectionsAsync(),
      getLocalVariablesAsync: () => figma.variables.getLocalVariablesAsync(),
      getLocalTextStylesAsync: () => figma.getLocalTextStylesAsync(),
      getLocalEffectStylesAsync: () => figma.getLocalEffectStylesAsync(),
      getLocalPaintStylesAsync: () => figma.getLocalPaintStylesAsync(),
      getLocalGridStylesAsync: () => figma.getLocalGridStylesAsync(),
    };
    const res = await applyPrunePlan(plan, pruneApi);
    const removed = res.variables + res.collections + res.modes + res.styles;
    sink.data({ pruneApplied: res });
    sink.post({ type: 'prune-result', ok: res.misses.length === 0, applied: true, count: removed, summary: pruneAppliedSummary(res) });
  } catch (e) {
    // A thrown prune reports rather than crashing the UI — same posture as `applyTheme`'s catch.
    sink.post({ type: 'prune-result', ok: false, applied: confirm, count: 0, summary: `prune failed: ${(e as Error).message}` });
  }
};

// `SWAP_TARGET` — the component set's placeholder swap target — lives in `build-deps.ts` since #111, so the
// MCP paste runner projects every def with the same nomination this action does. Its rationale moved with it.

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
 *     Measured: `figmaAnatomySet(fieldLabel, { swapTarget: SWAP_TARGET })` and
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
const buildComponents = async (defId: string | undefined, sink: ActionSink): Promise<void> => {
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
      sink.data({ build: { def: defId, known: componentDefs.map((d) => d.id) } });
      postVerdict({
        type: 'component-result', ok: false, headline: '✗ unknown def',
        summary: `no component def with id '${defId}' — this build knows ${componentDefs.map((d) => d.id).join(', ')}`,
      }, sink);
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
      }, sink);
      return;
    }
    // `controlShape` (#1163) and weight availability (#1605) are BRAND levers, so they enter here — where the
    // plugin knows the brand — by materializing the def BEFORE projection, which is what keeps
    // `figmaAnatomySet` itself brand-agnostic (`materializeForBrand`, `brand-def.ts`). Both come from the SAME
    // persisted `BrandInput` the knobs rehydrate from (`restoreInput`), read ONCE, so a pill-built button and
    // an NB-built field-label match the brand the file carries. No persisted brand, or a read that throws, is
    // `null` — the identity on both levers, so a themeless file builds byte-identically to before.
    let brandInput: BrandInput | null = null;
    try { brandInput = restoreInput(figma.root); } catch { /* untrusted/absent → defaults */ }
    // PAGE-AWARE PLACEMENT (#1554) — resolve (creating if absent) the `↳ <family>` section page this def
    // belongs on, and build the set THERE instead of `figma.currentPage`. `resolveComponentPage` returns
    // null for a def the taxonomy does not map, in which case `targetPage` stays undefined and the executor
    // falls back to `currentPage` — the pre-#1554 behaviour. Wrapped in an adapter typed as `CompPageTarget`
    // so the page's `unknown`-typed `appendChild`/`findOne` meet the executor's `CompNode` port without a
    // variance fight (the same reason the port declares `currentPage` structurally). The view is switched to
    // the page too, so a designer lands on the set they just built rather than watching an empty current page.
    // ONE DEF'S BUILD, as a function since #1633: the def asked for AND each missing dependency it nests go
    // through exactly this, so a dependency lands with the same brand and on the same page it would had the
    // designer built it by hand. `reports` is the caller's — the dependencies get their own, so the
    // telemetry printed at the end is the parent's run alone.
    const planCache = new Map<string, ReturnType<typeof figmaAnatomySet>>();
    // `SWAP_TARGET` PASSED UNCONDITIONALLY, because it is inert where a def has no swap parts — measured,
    // see the header. A per-def branch here would be a branch on a distinction the projector already makes.
    // Memoized: the dependency walk projects the parent too, and Button's 648 plans are worth projecting once.
    const project = (target: ComponentDef) => {
      let plans = planCache.get(target.id);
      if (!plans) planCache.set(target.id, plans = figmaAnatomySet(materializeForBrand(target, brandInput), { swapTarget: SWAP_TARGET }));
      return plans;
    };
    const buildOne = async (target: ComponentDef, reports: ComponentProgress[]) => {
      const page = await resolveComponentPage(figma, target.id);
      let targetPage: CompPageTarget | undefined;
      if (page) {
        // #1561 — pass the REAL page node, not a reconstructed `{ appendChild, findOne }` adapter. The set is
        // combined ONTO this target (`combineAsVariants(fresh, target)`) and the live host reads `target.id`;
        // an id-less adapter threw "Expected node id to be a string, got undefined" on every variant set (the
        // #1554 regression). The real `PageNode` carries `id`, `appendChild` and `findOne`, so it satisfies
        // `CompPageTarget` (which now requires `id`) directly. The view is switched to it too, so a designer
        // lands on the set they just built rather than watching an empty current page.
        await figma.setCurrentPageAsync(page as unknown as PageNode);
        targetPage = page as unknown as CompPageTarget;
      }
      return applyComponentPlan(project(target), figma, {
        // #1554: the resolved section page, or undefined → `currentPage` (unmapped def / pre-#1554 default).
        targetPage,
        // #1012: `icon` materializes as separate `icon/<glyph>` components, not one set. Read off the def
        // and passed as a write-time option — inert for every def that does not set it, the same shape as
        // `SWAP_TARGET`, so no per-def branch here beyond forwarding the flag the projector already carries.
        emitAsComponents: target.figmaProperties?.emitAsComponents,
        // #1623 sign-off — the def's one-line `summary` becomes the Figma description of what it builds.
        description: target.summary,
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
          sink.post({ type: 'component-progress', phase: p.phase, done: p.done, total: p.total, chunkMs: p.chunkMs });
        },
      });
    };
    // NESTED COMPONENTS FIRST (#1633) — every def this one nests or swaps to that the file does not hold yet
    // is built before it, deepest first (`build-deps.ts`). One that is already in the file is left alone:
    // rebuilding it would orphan its placed instances, so it keeps its STALE reading exactly as before. A
    // dependency that fails stops here, so the parent is never built against a missing nest.
    await figma.loadAllPagesAsync();
    const alsoBuilt = await prebuildDependencies(def, {
      defs: componentDefs, project, host: figma as unknown as DepHost, build: (d) => buildOne(d, []),
    });
    // Every reading kept, for the end-of-run summary. 54 objects for a 648 build — the memory is nothing
    // and the alternative is a running aggregate that cannot report a distribution.
    const reports: ComponentProgress[] = [];
    const r = await buildOne(def, reports);
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
      const summary = r.emittedComponents !== undefined
        // #1012: the no-set arm. `emitAsComponents` defs build SEPARATE `<id>/<glyph>` components, so the
        // grid / axes / properties / refs the set arm prints do not exist — the useful facts are how many
        // components now sit under the folder and how many this run built.
        ? `${r.emittedComponents.length} '${r.set}/…' components (+${r.added} built, ${r.skipped} already present` +
          `${r.stale ? `, ${r.stale} stale` : ''})${missNote}${stale ? `. ${stale}` : ''}`
        : r.set === null
          ? `nothing assembled — no set on this page and no member built${missNote}`
          : `set '${r.set}': ${r.variants} variants (+${r.added} built, ${r.skipped} already present` +
            `${r.stale ? `, ${r.stale} stale` : ''}), ` +
            `grid ${r.grid[0]}×${r.grid[1]}, ${Math.round(r.size[0])}×${Math.round(r.size[1])}px, ` +
            `axes ${r.axes.join('/') || '—'}, properties ${r.properties.join('/') || '—'}, ` +
            `${r.refs} refs across ${r.wiredMembers} members${missNote}${stale ? `. ${stale}` : ''}`;
      // #1633: what was built first, so a designer is not surprised by a set they did not ask for.
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
        summary: summary + alsoBuiltNote(alsoBuilt),
      }, sink);
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
    // #866: printed ONLY when a re-wire actually fired, so a quiet run stays quiet. A non-zero count means
    // the read-back caught a reference written to a node whose id `combineAsVariants` had rewritten and
    // landed it on the live node instead — the divergence has not reproduced by hand, so this line is the
    // live signal #1218 verifies against, not routine telemetry.
    if (r.refsRepaired > 0) console.log(`[prism3 #866] repaired ${r.refsRepaired} field-ref write(s) onto the live post-combine node`);
    // #1279: the field-binding sibling of the line above. A non-zero count means the read-back caught a
    // `boundVariables` write (a bound `strokeWeight`, padding or radius) dropped by `combineAsVariants`'s
    // id rewrite and re-applied it onto the live node — the live signal #1218 verifies against.
    if (r.boundRepaired > 0) console.log(`[prism3 #1279] repaired ${r.boundRepaired} variable binding(s) onto the live post-combine node`);
    // #1574: the SET-level sibling of the two lines above. A non-zero count means the host had replaced the
    // component set object this run combined, and the property loop / wire loop were re-pointed at the live
    // one instead of declaring properties into a handle that no longer names anything. `button-neutral`
    // reached the file missing both INSTANCE_SWAP properties with zero references on 432 members, which is
    // the state this counter makes visible at build time rather than in a census three issues later.
    if (r.setReresolved > 0) console.log(`[prism3 #1574] re-resolved the component set's own handle ${r.setReresolved} time(s); its combine-time handle had been replaced`);
    // #1579: where to look once this console is gone. The lines above are the live channel and they only
    // exist while the plugin window does — which is why `button-neutral` cost a six-probe hand census. The
    // report the build left on the set outlives the window, so this line is the pointer to it rather than
    // another copy of the counters. Unconditional: the whole point is that it is there on a GOOD build too,
    // since a reader cannot tell a build that went well from one that never wrote a report.
    if (r.set) console.log(`[prism3 #1579] this build's own report is on the set '${r.set}': getSharedPluginData('prism3', 'build')`);
    // The telemetry block, printed LAST so it is the bottom of the console and can be copied in one
    // selection. It is the deliverable of the calibration run: `CHUNK` is set from these numbers.
    const telemetry = summaryLines(reports, settleMs);
    for (const line of telemetry) console.log(line);
    // The report behind the verdict, whole (the agent link; `uiSink` drops it): the miss list uncapped,
    // the #701 / #866 / #1279 / #1574 counters the console lines above print, and the telemetry block.
    sink.data({ build: { def: def.id, alsoBuilt, settleMs, telemetry, report: r, progress: reports } });
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
      // #1633: a dependency's failure carries the host's own error as `original`, which is where the
      // executor attached its partial-write facts; the message is the dependency's, naming both defs.
      const partial = partialWriteOf(e instanceof DependencyBuildError ? e.original : e);
      sink.data({ build: { def: defId ?? button.id, threw: (e as Error)?.message ?? String(e), partialWrite: partial } });
      postVerdict({
        type: 'component-result', ok: false,
        headline: partial ? partialWriteHeadline(partial) : APPLY_FAILED_HEADLINE,
        summary: `component build failed: ${(e as Error).message}${partial ? partialWriteNote(partial) : ''}`,
      }, sink);
    }
  }
};

/**
 * FILE SETUP (#1554) — scaffold the file's PAGE structure, then build the two template assets.
 *
 * THE FIRST PAGE-CREATION ACTION in the plugin. It reconciles the file's page list to the taxonomy
 * (`file-taxonomy.ts` via `scaffoldSkeleton`): Cover, native `---` dividers, the empty section-header
 * pages, the Foundations placeholder pages, and the Sandbox `↳ File Components` page — then builds
 * `_Section-header` and `_Headings` onto File Components. Idempotent: a re-run creates nothing already
 * present and rebuilds no set already there (`buildFileComponents` combines fresh sets, so a second run
 * makes a second pair — guarded below by skipping the build when the page already holds them).
 *
 * Its own action, not part of `apply-theme` or `build-components`, for the #652 reason every canvas write
 * on this bridge is its own action: a distinct designer choice with its own trigger and its own verdict.
 */
const fileSetup = async (sink: ActionSink): Promise<void> => {
  try {
    await figma.loadAllPagesAsync();
    const scaffold = await scaffoldSkeleton(figma, TAXONOMY);
    const page = scaffold.fileComponentsPage;
    let assetNote = '';
    let assets: { built?: string[]; fontMisses?: string[]; skipped?: boolean } = {};
    if (page) {
      // IDEMPOTENT ASSET BUILD: skip if the page already holds a file component, so a re-run does not stack
      // a second `_Section-header`/`_Headings` beside the first. `findOne` is available on a real PageNode.
      const already = (page as unknown as PageNode).findOne(
        (n) => n.type === 'COMPONENT_SET' && (n.name === '_Section-header' || n.name === '_Headings'),
      );
      if (already) {
        assetNote = ', file components already present (skipped)';
        assets = { skipped: true };
      } else {
        const res = await buildFileComponents(figma, page as unknown as { appendChild(child: unknown): void });
        assets = { built: res.built, fontMisses: res.fontMisses };
        assetNote = `, built ${res.built.join(' + ')}` +
          (res.fontMisses.length ? ` (⚠️ ${res.fontMisses.length} font miss: ${res.fontMisses.slice(0, 2).join('; ')})` : '');
      }
    } else {
      assetNote = ', ⚠️ no File Components page — assets not built';
    }
    const summary = `pages: ${scaffold.created.length} created${scaffold.created.length ? ` (${scaffold.created.slice(0, 4).join(', ')}${scaffold.created.length > 4 ? '…' : ''})` : ' (all present)'}${assetNote}`;
    sink.data({ fileSetup: { pagesCreated: scaffold.created, fileComponentsPage: page ? true : false, assets } });
    sink.post({ type: 'file-setup-result', ok: true, headline: '✓ file set up', summary: appendBuildNote(summary, PRISM3_BUILD) });
  } catch (e) {
    sink.post({ type: 'file-setup-result', ok: false, headline: '✗ setup failed', summary: appendBuildNote(`file setup failed: ${(e as Error).message}`, PRISM3_BUILD) });
  }
};

/**
 * Boot read-back (#109): read the current file's colour variables + verify the materialisation
 * contract, and hand the UI a summary. Informational — reports that an existing themed file's
 * contract holds; the actual knob-rehydration is `restoreToUi` (#131), which is independent.
 */
const seedFromFile = async (sink: ActionSink): Promise<void> => {
  try {
    const snap = await readFigmaVariables(figma.variables);
    if (snap.color.length === 0) {
      // `present: false` — #721's state 3. The UI needs this told apart from a themed file as a FLAG,
      // not by parsing the sentence: it is what stops "no theme here" being reported as knobs that
      // could not be recovered (#722).
      sink.data({ readback: { present: false } });
      sink.post({ type: 'seed-info', ok: true, present: false, summary: 'No existing Prism3 theme in this file — start from the knobs.' });
      return;
    }
    const v = verifyReadback(snap);
    const failed = Object.entries(v.checks).filter(([, ok]) => !ok).map(([k]) => k);
    const summary =
      `Existing theme: ${v.details.colorVars} color vars, modes ${v.details.modes.join('/') || '—'}` +
      (v.ok ? ' — contract holds ✓' : ` — FAILED: ${failed.join(', ')}`);
    // `present: true` regardless of `ok`: the variables ARE here, and whether the contract verified is
    // a separate fact. Collapsing the two would make a contract failure look like an unthemed file.
    sink.data({ readback: { present: true, ok: v.ok, failed, checks: v.checks, details: v.details } });
    sink.post({ type: 'seed-info', ok: v.ok, present: true, summary });
  } catch (e) {
    // The read itself failed, so presence is UNKNOWN — reported false, since the outcome is an error
    // either way and claiming presence we could not establish would be worse than not claiming it.
    sink.post({ type: 'seed-info', ok: false, present: false, summary: `read-back failed: ${(e as Error).message}` });
  }
};

/**
 * Boot knob-rehydration (#131): read the `BrandInput` the last apply persisted in shared-data and,
 * if a trusted blob exists, hand it to the UI so it opens on the persisted brand. Independent of
 * `seedFromFile` — the read-back verdict and the knob restore don't gate each other.
 *
 * #1197 MADE ABSENCE EXPLICIT. It used to be silence (`null` → nothing posted → the UI keeps its
 * defaults), which was adequate while the only consumer wanted a brand to load. A start moment needs
 * the opposite fact — "this file has no brand" — and silence cannot carry it: it is the same
 * observation as "the message has not arrived yet". So absence now posts `restore-input-empty`, and
 * the three outcomes here are total over the read: a brand, a refusal, or nothing.
 *
 * #480: a stored-but-untrusted blob (old/foreign shape, unrecognized schema version) makes
 * `restoreInput` THROW rather than return `null` — caught here and reported as `restore-input-error`
 * so the designer sees a clear refusal instead of the UI silently opening on defaults as if the file
 * had never been themed.
 */
const restoreToUi = (): void => {
  try {
    const input = restoreInput(figma.root);
    // #1197: absence is now REPORTED rather than left as silence. The UI's start moment has to tell
    // "this file has no brand" from "the restore has not landed yet", and those are indistinguishable
    // when absence posts nothing. The three outcomes below are total over this read.
    if (input) postToUi({ type: 'restore-input', input });
    else postToUi({ type: 'restore-input-empty' });
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

/**
 * THE ACTION TABLE — the one set of handlers the panel's buttons and the agent link both reach.
 *
 * The switch below calls every action THROUGH this table, and the agent link's dispatcher is handed the
 * same object, so there is no second path to any write: an agent's `apply-theme` and the Apply button end
 * in one function. `test-agent-link.ts` imports this file under a host model, spies on each entry and
 * drives both the UI message and the agent command — a route pointed at a copy fails there by name.
 * Exported for that test only; nothing in the plugin imports it.
 */
export const ACTIONS: AgentActions = { applyTheme, buildComponents, fileSetup, prune, seedFromFile };

/**
 * THE AGENT LINK (off until the owner switches it on in the panel; never persisted). Commands arrive as
 * data and are routed by name into `ACTIONS` — see `agent-link.ts` for the mailbox and `agent-dispatch.ts`
 * for the routing. `status` reads the file's themed state the way `restoreToUi` and `seedFromFile` do,
 * without posting anything.
 */
const dispatch = createDispatcher({
  actions: ACTIONS,
  // Streamed to the panel, which forwards them to the desktop bridge for the commands it delivered.
  onProgress: (id, progress) => postToUi({ type: 'agent-progress', id, progress }),
  onLog: (id, line) => postToUi({ type: 'agent-log', id, line }),
  census: () => componentCensus(figma as unknown as Parameters<typeof componentCensus>[0], ENGINE_VERSION),
  status: async () => {
    let brand: 'present' | 'absent' | 'unreadable' = 'absent';
    try { brand = restoreInput(figma.root) ? 'present' : 'absent'; } catch { brand = 'unreadable'; }
    let colorVars: number | null = null;
    try { colorVars = (await readFigmaVariables(figma.variables)).color.length; } catch { /* unreadable → null */ }
    return {
      status: {
        engineVersion: ENGINE_VERSION,
        build: PRISM3_BUILD,
        file: { name: figma.root.name, currentPage: figma.currentPage.name, brandInput: brand, colorVars, themed: (colorVars ?? 0) > 0 },
        link: agentLink.state(),
        commands: [...AGENT_COMMANDS],
      },
    };
  },
});
export const agentLink = createAgentLink({
  root: figma.root,
  dispatch: (raw, transport) => dispatch(raw, transport),
  engineVersion: ENGINE_VERSION,
  build: PRISM3_BUILD,
  schedule: (fn, ms) => setTimeout(fn, ms),
  cancel: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  onState: (state) => postToUi({ type: 'agent-link-state', state }),
});
// Closing the plugin ends the session, so the link record says so — an agent reading `link` then knows
// nobody is listening rather than waiting on a poll that will never come.
figma.on('close', () => { try { agentLink.setOn(false); } catch { /* closing; nothing to report to */ } });

onUiMessage((msg: UiToMain) => {
  switch (msg.type) {
    case 'ui-ready':
      // UI's listener is attached — run the boot read-back (seed summary) + rehydrate the knobs.
      void ACTIONS.seedFromFile(uiSink);
      restoreToUi();
      void sendFonts();
      // The link is off on every launch; the panel's control starts from this.
      postToUi({ type: 'agent-link-state', state: agentLink.state() });
      return;
    case 'apply-theme':
      void ACTIONS.applyTheme(msg.input, uiSink);
      return;
    case 'build-components':
      // `msg.def` straight through, `undefined` included — the resolution lives in `buildComponents`
      // (absent means Button) rather than being defaulted here, so there is one place that decides it.
      void ACTIONS.buildComponents(msg.def, uiSink);
      return;
    case 'prune':
      // #1521 — `confirm` decides preview vs delete; both recompute from a fresh read inside `prune`.
      void ACTIONS.prune(msg.input, msg.confirm, uiSink);
      return;
    case 'file-setup':
      // #1554 — scaffold the page skeleton + build the two template assets. Its own action.
      void ACTIONS.fileSetup(uiSink);
      return;
    case 'agent-link':
      // The owner's switch — the only way the link turns on. See `agent-link.ts`.
      agentLink.setOn(msg.on);
      return;
    case 'agent-command':
      // Transport B: a command the desktop bridge delivered through the panel's socket. The same
      // dispatcher as the mailbox — and the same refusal when the owner has not switched the link on.
      if (!agentLink.state().on) {
        const id = typeof (msg.command as { id?: unknown })?.id === 'string' ? (msg.command as { id: string }).id : '';
        const cmd = typeof (msg.command as { cmd?: unknown })?.cmd === 'string' ? (msg.command as { cmd: string }).cmd : '';
        postToUi({ type: 'agent-result', result: failedResult({ id, cmd, transport: 'bridge', engineVersion: ENGINE_VERSION, at: new Date().toISOString() }, { code: 'link-off', message: 'the agent link is off in this plugin session' }) });
        return;
      }
      void dispatch(msg.command, 'bridge').then((result) => {
        agentLink.noteCommand(result);
        postToUi({ type: 'agent-result', result });
      });
      return;
    case 'agent-bridge':
      agentLink.setBridge(msg.connected);
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
