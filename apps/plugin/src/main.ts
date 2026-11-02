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
import { applyHeadline, APPLY_FAILED_HEADLINE, conflictHeadline, componentHeadline, staleNote, refsItems, partialWriteHeadline, partialWriteItem, fromClauses, motionReplacedItem } from './apply-summary';
import { ENGINE_VERSION } from '@prism3/engine/version';
import { appendBuildNote, buildNote } from '../../studio/src/build-identity';
import { onUiMessage, postToUi } from './bridge-main';
import { assertNever } from './messages';
import type { MainToUi, UiToMain, StyleGuideOptions, RunProgressKind } from './messages';
import { createRunGuard, guardFor, writes, busyMessage } from './run-guard';
import type { WriteCmd } from './run-guard';
import { strandedCollections, ownedModeIds } from './write-figma';
import { classifyFile, libraryFileOf, outcomeOf, probeFile, type FileKindApi } from './file-kind';
import { computePrunePlan, prunePlanCount, applyPrunePlan, prunePreviewSummary, pruneAppliedSummary } from './prune-figma';
import type { PruneInput, PruneApi } from './prune-figma';
import { isRefusal } from '@prism3/engine/rename-map';
import { rootOf } from '@prism3/engine/figma-names';
import { conflictSummary } from './preflight';
import { APPLY_STAGES, runApplyTheme, type ApplyStage, type ThemePace } from './apply-theme';
import { fieldStyleNote, searchFieldStyleNote } from './field-style-note';
import { tagStyleNote } from './tag-style-note';
import { gridSkippedNote } from './write-grid-styles';
import { applyComponentPlan, partialWriteOf } from './write-components';
import type { ComponentProgress, CompPageTarget, CompNode, ComponentsApi } from './write-components';
import { saveBeforeBuild, saveVersion } from './version-title';
import { applyUpdate, applyVerdict, previewHashOf, type ApplyHost, type ApplyProgress, type UpdateChoices } from './update-apply';
import { scaffoldSkeleton, resolveComponentPage } from './file-setup';
import { emptiedLine, pageMovesDue, pageMovesLine, relocateSets, type RelocateOutcome } from './page-moves';
import { ensureFileComponents } from './file-components';
import { ensureStyleGuideCells } from './style-guide-cells';
import type { CellsApi } from './style-guide-cells';
import { runStyleGuide, removeRetiredTables, styleGuideSummary, readCatalog, catalogFor, isSetUp } from './style-guide';
import type { SgContract } from './style-guide';
import { resolveAllModes } from '@prism3/engine/modes';
import { TAXONOMY } from './file-taxonomy';
import { blockHeadersLines, headerFor, pageHeaderItems, placeBlockHeaders } from './page-header';
import type { PageHeaderOutcome, HeaderPage } from './page-header';
import { withPanel, hasFurniture, clearFurniture, drawFurniture, seatNewSet, furnishUpdate, furnitureLayout, furnitureItems, withFurnitureItems, withTemplateWarning, readTag, staleFurniture, pruneFurniture, furniturePruneText, FURNITURE_NS, FURNITURE_KEY } from './canvas-furniture';
import type { FurnitureApi, FurnitureOutcome, FurnitureParent, FurnitureTag, XNode } from './canvas-furniture';
import { ensureFurnitureTemplates } from './furniture-templates';
import { ensureDocBlock, docBlockNote, type DocBlockApi } from './doc-block';
import { coverLine, drawCover, type CoverApi, type CoverOutcome, type CoverRoot } from './cover-frame';
import { clearOrphanSpecPanels, drawSpecPanel, specItems, specTargets, type SpecApi, type SpecOutcome } from './spec-panel';
import { COVER_OFF, readDocSettings, writeDocSettings } from './doc-settings';
import { clearOrphanPanels, docPanelReach, drawDocPanel, leadsPanel, type PanelApi, type PanelOutcome, type PNode } from './doc-panel';
import type { TemplatesApi } from './furniture-templates';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { chunkLine, summaryLines, measureSettle, verdictBeforeSettle } from './build-telemetry';
import { readFigmaVariables } from './read-figma';
import { listFamilyStyleNames } from './list-fonts';
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import { buildWritePlan, buildFloatWritePlan, buildStylesPlan, buildGridStylePlan, buildFontVarPlan, buildMotionVarPlan, buildTextStylePlan } from '@prism3/engine/write-plan';
import { verifyReadback } from '@prism3/engine/read-back';
import { holdsInput, restoreInput } from './persist-figma';
import { declaredModesOf, failedChecks, seedSummary } from './seed-modes';
import { brandTheme } from '@prism3/engine/theme';
import type { BrandInput } from '@prism3/engine/theme';
import { figmaAnatomySet } from '@prism3/engine/anatomy-figma';
import { materializeForBrand, materializerFor } from './brand-def';
import { dueOf, entryFor, needsPrint, printOf, quietOf, readLedger, recordSets, type LedgerEntry, type PlanPrint } from './as-built-ledger';
import { clearQueued, readQueue, setQueued, staleOf, visibleOf, type QueueRoot } from './add-queue';
import { presentNames, prebuildDependencies, alsoBuiltItem, DependencyBuildError, SWAP_TARGET, labelAfterBuilds } from './build-deps';
import type { DepHost } from './build-deps';
import { button } from '@prism3/engine/components/button';
import { componentDefs } from '@prism3/engine/components/index';
import type { ComponentDef } from '@prism3/engine/component-schema';
import { createAgentLink } from './agent-link';
import { createDispatcher, componentCensus } from './agent-dispatch';
import type { ReadHost } from './agent-reads';
import type { ActionSink, AgentActions } from './agent-dispatch';
import { AGENT_COMMANDS, failedResult } from './agent-protocol';
import { previewUpdate, captureBaselines, previewVerdict, captureVerdictText, adoptMembers as adoptAll, adoptVerdictText, handEditsOf, checkedSetOf } from './update-plan';
import type { UpdateHost, UpdateTarget } from './update-plan';

// Show the UI iframe. `__html__` is the bundled shared-UI HTML Figma injects from `manifest.ui`
// (the inlined `apps/studio/src` app; declared for the sandbox global in `figma-env.d.ts`). The shared
// `apps/studio/src` UI is laid out desktop-first: `#app` caps content at 1200px with 40px gutters, so the
// full layout wants 1280px. Figma is desktop-only, so we size the window to the web canvas rather
// than a "standard" narrow plugin — the same UI renders identically to the standalone web app.
const UI_SIZE_KEY = 'prism3:ui-size';
/** The chrome theme the person chose in the Theme menu: Match Figma, Light or Dark (the owner's top-bar decision,
 *  2026-10-05). Kept in `clientStorage`, which is per person and per machine, like the window size above. */
const THEME_PREF_KEY = 'prism3:theme';
const isThemePref = (v: unknown): v is 'figma' | 'light' | 'dark' => v === 'figma' || v === 'light' || v === 'dark';
/** Send the kept choice, if there is one; nothing kept (or storage unavailable) leaves the UI on Match Figma. */
const sendThemePref = async (): Promise<void> => {
  try {
    const v: unknown = await figma.clientStorage.getAsync(THEME_PREF_KEY);
    if (isThemePref(v)) postToUi({ type: 'theme-pref', pref: v });
  } catch {
    /* storage unavailable: Match Figma */
  }
};
/** The desktop bridge's pairing token (#3204, the owner's Q3204.1 A): per person and per machine in `clientStorage`, the
 *  only place it is kept. Never written to the file, its plugin data or shared plugin data, which travel with the file. */
const BRIDGE_TOKEN_KEY = 'prism3:bridge-token';
/* Whether this build carries the desktop bridge (#3218): `PRISM3_NETWORK`, false only in "Prism3 Studio Offline"
   (`build.mjs --release --offline`), whose UI has no relay. Each use of the token below is guarded by
   `(typeof PRISM3_NETWORK !== 'boolean' || PRISM3_NETWORK)`, written out at the site: under the offline define it folds to
   `false` and esbuild drops the branch, then the key and `sendBridgeToken` as unused (a guard read from a `const` is NOT
   dropped: esbuild folds the `typeof` but does not inline the const). `lint-release-bundle.ts` checks `release-offline/main.js`
   holds no `prism3:bridge-token`. A tsx harness that imports this file without setting `globalThis.PRISM3_NETWORK` gets the
   network build's answer. */
/** Send the kept token, or null: the relay waits for this answer before it connects, so it never asks for a code it has. */
const sendBridgeToken = async (): Promise<void> => {
  let token: string | null = null;
  try {
    const v: unknown = await figma.clientStorage.getAsync(BRIDGE_TOKEN_KEY);
    if (typeof v === 'string' && v) token = v;
  } catch {
    /* storage unavailable: no token, so the panel asks for a code */
  }
  postToUi({ type: 'agent-bridge-token', token });
};
/** The open Activity drawer's height, as the person dragged it (#2176, the owner's AD1): kept like the Theme choice. */
const ACTIVITY_HEIGHT_KEY = 'prism3:activity-height';
/** Where the bar's Docs opens (#2637, owner decision Q384 A): the docs landing page on the studio's web address, which
 *  serves the repo's `docs/public/` at `/docs` (`apps/studio/docs-route.mjs`). Opened in the browser by
 *  `figma.openExternal`, which needs no network permission, so the release build opens it too. */
const DOCS_URL = 'https://prism3-ds.vercel.app/docs/';
const isHeight = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
/** Send the kept height, if there is one; nothing kept (or storage unavailable) leaves the drawer at its own height. */
const sendActivityHeight = async (): Promise<void> => {
  try {
    const v: unknown = await figma.clientStorage.getAsync(ACTIVITY_HEIGHT_KEY);
    if (isHeight(v)) postToUi({ type: 'activity-height', px: v });
  } catch {
    /* storage unavailable: the drawer's own height */
  }
};
const DEFAULT_SIZE = { width: 1280, height: 900 };
// Floor only. The shared UI's narrow tier (#144) is designed down to 480, and below ~380 the chrome
// bar stops being usable at all; Figma clamps the ceiling to the screen, so no maximum is needed.
const MIN_SIZE = { width: 380, height: 420 };
const clampSize = (w: number, h: number): { width: number; height: number } => ({
  width: Math.max(MIN_SIZE.width, Math.round(w)),
  height: Math.max(MIN_SIZE.height, Math.round(h)),
});
/** The window's size as this thread last set it. Figma has no getter, and the strip's Restore needs the size to go
 *  back to. The strip itself is never this size, so it is never kept under `UI_SIZE_KEY` either. */
let uiSize: { width: number; height: number } = { ...DEFAULT_SIZE };

/**
 * THE STRIP (#2949; the owner's Q1 A, Q2 A, Q3 A and Q600 A, 2026-10-23). Minimize, on the top bar, shrinks the window
 * to a one-row strip with Restore; while the agent link is on, the strip also shows the link's status and Turn off
 * (`agent-link-ui.ts` draws it). Minimize does not depend on the link (the owner's direction on #2909, 2026-10-24): it
 * minimizes whether the link is on or off. Here, the window and nothing else:
 *   · the strip's size is its own, under the 380×420 floor (`MIN_SIZE` is ours, not Figma's: `resize` takes 70×0 up),
 *     and is never kept as the window size;
 *   · `beforeStrip` holds the size from before minimizing, and Restore returns to it. The UI stays mounted the whole
 *     time, hidden under the strip, so the page and its state come back as they were;
 *   · it never touches the link or its poll: the poll runs on this thread's own timer (`agent-link.ts`), which the
 *     window's size does not reach. `test-agent-link.ts` (`strip`) holds that;
 *   · turning the link off while minimized (the strip's Turn off) still restores the full window.
 * The strip's width fits the longest listening line the strip can show (`agentStripText`), measured by `test:chrome`.
 */
const STRIP_SIZE = { width: 480, height: 40 };
let beforeStrip: { width: number; height: number } | null = null;
const setMinimized = (minimized: boolean): void => {
  if (minimized === (beforeStrip !== null)) return;
  if (minimized) {
    beforeStrip = uiSize;
    figma.ui.resize(STRIP_SIZE.width, STRIP_SIZE.height);
  } else {
    const back = beforeStrip as { width: number; height: number };
    beforeStrip = null;
    figma.ui.resize(back.width, back.height);
  }
  postToUi({ type: 'ui-minimized', minimized });
};

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
const postVerdict = (m: Extract<MainToUi, { type: 'apply-result' | 'component-result' | 'component-update-result' }>, sink: ActionSink): void =>
  sink.post({ ...m, summary: appendBuildNote(m.summary, PRISM3_BUILD), lines: withBuildLine(m.lines) });
/** The build clause as the last of a verdict's lines (#2177): the note `appendBuildNote` adds to the summary, whole, so
 *  the two say the same words. */
const withBuildLine = (lines: string[]): string[] => {
  const note = buildNote(PRISM3_BUILD);
  return note === null ? lines : [...lines, note];
};

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
    // Minimized before storage answered (#2949): the kept size is what Restore returns to.
    if (beforeStrip) { beforeStrip = size; return; }
    uiSize = size;
    if (size.width === DEFAULT_SIZE.width && size.height === DEFAULT_SIZE.height) return;
    figma.ui.resize(size.width, size.height);
  } catch {
    /* storage unavailable — the default size already applied */
  }
})();

/**
 * #3170 PART 2: WHAT THE PANEL HEARS WHILE A WRITE RUNS (owner decisions Q3170.1–6, all A). The panel learns something
 * only when this thread posts to it, and this thread can post only when the write hands it back. So each write the
 * panel starts posts `run-progress` at every boundary it has (a page of the read after open, a set of the update, a
 * stage of Apply Theme) and hands the thread back there, and again after about `PACE_MS` of work inside a set or a stage
 * (Q3170.5 A; #3208 brought every Apply Theme stage onto the same clock), posting the same reading again so the panel can
 * tell a long set from a stalled panel. Never through an agent's sink, which collects every post as a verdict: an agent's update and Apply
 * Theme post no readings, and its Capture baseline and Adopt (#3189) post theirs to the panel directly (`postProgress`),
 * a reading at each def, for the status strip.
 */
const PACE_MS = 50;
const postProgress = (run: RunProgressKind, p: ApplyProgress): void => postToUi({ type: 'run-progress', run, ...p });
/** An executor `yieldTo` that hands the thread back only once about `PACE_MS` of work has run since it last did, and
 *  then says `again` first. Asked after every member (`chunk: 1`); a wait the executor asks for (`ms`) is always kept. */
const paced = (again: () => void): ((ms?: number) => Promise<void>) => {
  let last = Date.now();
  return async (ms?: number): Promise<void> => {
    if (!ms && Date.now() - last < PACE_MS) return;
    again();
    await new Promise<void>((r) => setTimeout(r, ms ?? 0));
    last = Date.now();
  };
};
/** Apply Theme's pacing: a reading and a hand-back before each of its seven stages, and inside every stage the cadence a
 *  component write keeps (#3208): the executors offer a `tick` after each variable or style, and it hands the thread back
 *  once about `PACE_MS` of work has run since the last hand-back. The thread is handed back for an agent's apply too; only
 *  the panel's posts. */
const themePace = (sink: ActionSink): ThemePace => {
  const panel = sink === uiSink;
  let at: { stage: ApplyStage; done: number } | null = null;
  const say = (): void => { if (panel && at) postProgress('apply-theme', { phase: 'work', item: at.stage, done: at.done, total: APPLY_STAGES.length }); };
  let last = Date.now();
  return {
    check: () => { if (panel) postProgress('apply-theme', { phase: 'check', item: null, done: 0, total: APPLY_STAGES.length }); },
    stage: async (stage, done) => { at = { stage, done }; say(); await breathe(); last = Date.now(); },
    tick: async () => { if (Date.now() - last < PACE_MS) return; say(); await breathe(); last = Date.now(); },
  };
};
/** #3170 Q3170.4 A: the panel's "Stop after <set>" (`update-stop`), read by its running update at each set boundary. */
let updateStopAsked = false;

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
    const { plans, pf, guarded, before } = await runApplyTheme(input, figma, () => saveVersion(figma, { run: 'apply-theme' }).then(() => undefined), themePace(sink));
    const { colorFiles, floatPlan, fontPlan, motionPlan } = plans;
    if (!guarded.ok) {
      sink.data({ conflicts: guarded.conflicts });
      const conflicts = conflictSummary(guarded.conflicts);
      postVerdict({ type: 'apply-result', ok: false, headline: conflictHeadline(guarded.conflicts.length), summary: conflicts, lines: [conflicts] }, sink);
      return;
    }
    const { mig, r, f, s, gs, tv, ts, mv } = guarded.result;
    // `motion` (#2412) — TIMING + EASING through the mixed-type executor; its refusals count with the font ones.
    const motionTotal = mv.collections.reduce((n, c) => n + c.total, 0);
    const motionCreated = mv.collections.reduce((n, c) => n + c.created, 0);
    const refused = [...tv.refused, ...mv.refused];
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
      r.misses.length + f.misses.length + tv.misses.length + mv.misses.length + ts.misses.length + s.misses.length + refused.length;
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
      ...mv.collections.map((c) => ({ name: c.name, names: c.orphans })),
    ].filter((o) => o.names.length);
    const orphanCount = allOrphans.reduce((n, o) => n + o.names.length, 0);
    const orphanNote = orphanCount
      ? `⚠ ${orphanCount} orphaned variables not in the plan (${allOrphans.map((o) => `${o.name}: ${o.names.length}`).join(', ')}) — likely renames; nothing was deleted`
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
      ...motionPlan.map((p) => p.name),
    ];
    const stranded = strandedCollections(
      (await figma.variables.getLocalVariableCollectionsAsync()).map((c) => c.name),
      plannedCollections,
    );
    // Not a failure, and deliberately not one: a stranded collection breaks nothing — its variables
    // still exist and every binding into them still resolves. It is stale, not broken, and the
    // decision to remove it is the designer's, since it may hold variables they bound by hand.
    const strandedNote = stranded.length
      ? `⚠ ${stranded.length} collection${stranded.length === 1 ? '' : 's'} in this file that no plan writes (${stranded.slice(0, 3).join(', ')}${stranded.length > 3 ? '…' : ''}) — left over from an earlier version or hand-made; nothing was deleted`
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
    const renameNotes = [
      migrated.length ? `${migrated.length} renamed ${migrated.length === 1 ? 'token' : 'tokens'} migrated in place (bindings kept: ${migrated.slice(0, 3).map((o) => `${o.from}→${o.to}`).join(', ')}${migrated.length > 3 ? '…' : ''})` : '',
      migRefused.length ? `⚠ ${migRefused.length} ${migRefused.length === 1 ? 'rename' : 'renames'} refused (${migRefused.slice(0, 2).map((o) => `${o.from}→${o.to}: ${o.status}`).join(', ')}) — nothing moved for those` : '',
      mig.refusals.length ? `⚠ rename map invalid, no migrations attempted (${mig.refusals[0]})` : '',
    ];
    // #499: styles whose emitted name was corrected (e.g. `Semi Bold` → `SemiBold`). Worth surfacing
    // rather than silently succeeding — it is the difference between "the guess was right" and "the
    // guess was wrong and would have cost these styles before".
    const resolvedNote = ts.resolvedStyles ? `${ts.resolvedStyles} font styles name-resolved` : '';
    const skippedNote = ts.skipped.length
      ? `⚠ ${ts.skipped.length} text styles skipped (font unavailable: ${ts.skipped.slice(0, 3).map((x) => x.name).join(', ')}${ts.skipped.length > 3 ? '…' : ''})`
      : '';
    // #680: the fonts loaded ahead of the write, and any face that would not load. Only NAMED faces are
    // listed — a crossed pair that does not exist is the ordinary case (most family × style combinations
    // are not real), and listing those would bury the reportable ones. `refused` should be empty on every
    // healthy apply: it means the preload missed something and the write survived it.
    const fontNote = pf.unavailable.length
      ? `⚠ ${pf.unavailable.length} typeface${pf.unavailable.length === 1 ? '' : 's'} unavailable (${pf.unavailable.slice(0, 3).map((x) => x.face).join(', ')}${pf.unavailable.length > 3 ? '…' : ''})`
      : '';
    const refusedNote = refused.length
      ? `⚠ ${refused.length} variable writes refused by Figma (${refused[0].name}: ${refused[0].reason.slice(0, 60)})`
      : '';
    // One item per axis and per note, each joined by `, ` (#2177: one line each in the Activity drawer).
    const { summary, lines } = fromClauses([
      `palette ${r.paletteTotal} (+${r.paletteCreated})`, `color ${r.colorTotal} (+${r.colorCreated})`,
      `dims/layout ${f.collections.length} collections (+${floatCreated})`,
      `styles ${s.effects.total} effects (+${s.effects.created}, ${s.effects.bound} bound) / ${s.paints.total} gradients (+${s.paints.created}, ${s.paints.bound} stops bound) / ${gs.total} grid styles (+${gs.created})`,
      `type ${pf.loaded} fonts loaded / ${fontVarTotal} font vars (+${fontVarCreated}) / ${ts.total} text styles (+${ts.created})`,
      `motion ${motionTotal} vars (+${motionCreated})`,
      // #2412 (Q293 A): the one deletion Apply makes, so it is always said (wording: Q302).
      motionReplacedItem(mv.replaced.length),
      `${r.bound + f.bound + tv.bound + mv.bound + ts.bound} bindings`, misses ? `${misses} misses` : '',
      ...renameNotes, orphanNote, strandedNote, resolvedNote, skippedNote, gridSkippedNote(gs.skipped), fontNote, refusedNote,
      // #2888: the search field's own edge, the same way. Before the field style line, which ends the list.
      searchFieldStyleNote(before, input),
      // #2695 (Q16 A): a field style switch reaches the field sets through Update, so Apply says so.
      fieldStyleNote(before, input),
      // #2887: the tag style reaches the Tag set the same way (copy DRAFT for the owner, tag-style-note.ts).
      tagStyleNote(before, input),
    ].map((x) => [', ', x] as const));
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
        misses: { color: r.misses, float: f.misses, fontVars: tv.misses, motion: mv.misses, textStyles: ts.misses, styles: s.misses, refused },
        counts: {
          palette: { total: r.paletteTotal, created: r.paletteCreated }, color: { total: r.colorTotal, created: r.colorCreated },
          floatCollections: f.collections.length, floatCreated,
          effects: { total: s.effects.total, created: s.effects.created, bound: s.effects.bound },
          gradients: { total: s.paints.total, created: s.paints.created, stopsBound: s.paints.bound },
          gridStyles: { total: gs.total, created: gs.created, renamed: gs.renamed, skipped: gs.skipped },
          fontsLoaded: pf.loaded, fontVars: { total: fontVarTotal, created: fontVarCreated },
          motion: { total: motionTotal, created: motionCreated, replaced: mv.replaced },
          textStyles: { total: ts.total, created: ts.created }, bindings: r.bound + f.bound + tv.bound + mv.bound + ts.bound,
        },
        orphans: allOrphans, stranded,
        renames: { migrated, refused: migRefused, mapRefusals: mig.refusals },
        textStylesSkipped: ts.skipped, fontsUnavailable: pf.unavailable, resolvedStyles: ts.resolvedStyles,
      },
    });
    postVerdict({ type: 'apply-result', ok: misses === 0, headline: applyHeadline(misses, ts.skipped.length), summary, lines }, sink);
  } catch (e) {
    const failure = `write failed: ${(e as Error).message}`;
    postVerdict({ type: 'apply-result', ok: false, headline: APPLY_FAILED_HEADLINE, summary: failure, lines: [failure] }, sink);
  }
};

/**
 * OPT-IN PRUNE (#1521, extended to modes + all four style kinds in #1570) — remove the styles, modes,
 * variables and collections the current config no longer emits.
 *
 * #1570 widened the scope because a config that SHRINKS leaves drift the original three arms could not
 * see: reducing `layout.breakpoints` from 6 to 2 strands four `layout` modes and four grid styles (`xs`, `lg`, …),
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
    // `motion` (#2412) — out of the FLOAT plan, so it must be named here or Prune reads the collection as stranded.
    const motionPlan = buildMotionVarPlan(theme);
    const varPlans = [...fontPlan, ...motionPlan];
    const textPlan = buildTextStylePlan(theme);
    const plannedVariables = [
      ...wp.palette.map((r) => r.name),
      ...wp.color.create.map((r) => r.name),
      ...floatPlan.flatMap((p) => p.create.map((r) => r.name)),
      ...varPlans.flatMap((p) => p.rows.map((r) => r.name)),
    ];
    // Spelled with `$collection` / `plan.name` (what Figma holds), not the axis labels the orphan report
    // uses — the same set `applyTheme` assembles for its stranded-collection report.
    const plannedCollections = [
      colorFiles.palette.$collection,
      ...colorFiles.color.map((c) => c.$collection),
      ...floatPlan.map((p) => p.name),
      ...varPlans.map((p) => p.name),
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
      ...varPlans.map((p) => ({ collection: p.name, modes: p.modes })),
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
    // THE CANVAS FURNITURE (#2406, #2188): labels and backdrops whose set is gone, or whose def the pilot no longer
    // covers. Found by their tag, file-wide; a live set's furniture is the build's to redraw, never prune's.
    await loadPagesYielding();
    const tagged = (figma.root.findAllWithCriteria({ types: ['INSTANCE'], sharedPluginData: { namespace: FURNITURE_NS, keys: [FURNITURE_KEY] } }) as readonly InstanceNode[])
      .map((node) => ({ node, tag: readTag(node as unknown as XNode) }))
      .filter((x): x is { node: InstanceNode; tag: FurnitureTag } => x.tag !== null);
    const liveSets = new Set<string>();
    for (const t of tagged) {
      if (liveSets.has(t.tag.set)) continue;
      const n = t.tag.set ? await figma.getNodeByIdAsync(t.tag.set) : null;
      if (n && n.type === 'COMPONENT_SET' && !n.removed) liveSets.add(t.tag.set);
    }
    const staleFurn = staleFurniture(tagged, (id) => liveSets.has(id));
    const furnText = (applied: boolean, n: number): string => {
      const t = furniturePruneText(n, applied);
      return t ? ` ${t}` : '';
    };

    sink.data({ prunePlan: plan, staleFurniture: staleFurn.map((f) => ({ id: f.node.id, ...f.tag })) });
    if (!confirm) {
      const n = prunePlanCount(plan);
      const summary = n === 0 && staleFurn.length ? furniturePruneText(staleFurn.length, false) : prunePreviewSummary(plan) + furnText(false, staleFurn.length);
      sink.post({ type: 'prune-result', ok: true, applied: false, count: n + staleFurn.length, summary });
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
    const furnRemoved = pruneFurniture(tagged.map((t) => t.node as unknown as XNode), (id) => liveSets.has(id));
    const removed = res.variables + res.collections + res.modes + res.styles;
    sink.data({ pruneApplied: { ...res, furniture: furnRemoved } });
    const summary = removed === 0 && furnRemoved ? furniturePruneText(furnRemoved, true) : pruneAppliedSummary(res) + furnText(true, furnRemoved);
    sink.post({ type: 'prune-result', ok: res.misses.length === 0, applied: true, count: removed + furnRemoved, summary });
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
      const unknown = `no component def with id '${defId}' — this build knows ${componentDefs.map((d) => d.id).join(', ')}`;
      postVerdict({ type: 'component-result', ok: false, completed: false, headline: '✗ unknown def', summary: unknown, lines: [unknown] }, sink);
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
      const why = def.figmaProperties.notStandalone;
      postVerdict({ type: 'component-result', ok: false, completed: false, headline: '✗ not buildable on its own', summary: why, lines: [why] }, sink);
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
    // THE PAGE HEADER (2026-09-27) — one `_Section-header` instance per component page, placed after the
    // set lands so it can be measured against the content (`page-header.ts`). One entry per page this run
    // built onto, dependencies included, so a skip (no `_Section-header` in the file) reaches the verdict.
    const headers: PageHeaderOutcome[] = [];
    // THE CANVAS FURNITURE (#2406, #2188), one entry per piloted set this run built, dependencies included.
    const furniture: FurnitureOutcome[] = [];
    const placeHeader = async (page: HeaderPage, defId: string): Promise<void> => {
      // The page's header, or a block's own on a shared page (#3172).
      const header = headerFor(defId, page.name, componentDefs);
      if (!header) return;
      // CAUGHT HERE, never rethrown: the set is already built, and a header is labeling, not the build.
      try { headers.push(await header.label(figma, page)); }
      catch (e) { headers.push({ page: page.name, status: 'failed', message: (e as Error)?.message ?? String(e) }); }
    };
    // #1750 — HEADERS ARE PLACED ONCE THE RUN'S BUILDS ARE DONE, not after each one (`labelAfterBuilds`,
    // `build-deps.ts`, which says why). `landed` records a page after its build RETURNS, keyed by page name (how
    // `resolveComponentPage` finds a page); the first def wins, since every def on a page reads the same copy.
    type Landed = (key: string, page: { page: HeaderPage; defId: string }) => void;
    const buildOne = async (target: ComponentDef, reports: ComponentProgress[], landed: Landed) => {
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
        // This def's earlier labels and backdrop come off FIRST, so the build's placement of a new set never measures
        // furniture left behind by a set someone deleted. Redrawn below once the set has landed.
        if (hasFurniture(target.id)) {
          clearFurniture(page as unknown as FurnitureParent, target.id);
          // Its usage panel too, when its set is gone and no one edited it (#846); an edited one stays.
          await clearOrphanPanels(figma as unknown as PanelApi, page, target.id);
          // And its spec panel (#2830), on the same rule.
          await clearOrphanSpecPanels(figma as unknown as PanelApi, page, target.id);
        }
      }
      const built = await applyComponentPlan(project(target), figma, {
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
          // #1679: a `retry` reading marks a back-off wait, not a chunk of work, so it stays out of the chunk
          // telemetry (its passes are in the `[prism3 #1664]` line) and only reaches the pill.
          if (p.phase !== 'retry') {
            reports.push(p);
            // Logged as it happens, not only in the summary. If the build hangs, the last line printed is
            // which phase and which chunk it hung on — the single most useful fact in a hang report, and one
            // an end-of-run summary cannot give because a hung run never reaches it.
            console.log(chunkLine(p));
          }
          // FIELD BY FIELD, not `...p`, and the reason is that these two consumers want different things.
          // The console gets the whole reading including `elapsedMs`; the pill shows a fraction and nothing
          // more. Spreading would put every field the executor ever adds onto the bridge by default — a
          // widening the message contract in `messages.ts` never agreed to, and one that reads as intentional.
          sink.post({ type: 'component-progress', phase: p.phase, done: p.done, total: p.total, chunkMs: p.chunkMs });
        },
      });
      // THE AS-BUILT LEDGER (#2909 Q2909.8 A): a set this build landed whole, every member fresh or already this plan's,
      // is recorded as built from the def it was materialized to. A set holding a member from another plan (`stale`) is
      // not: it still is what it was, and its entry says so. CAUGHT: the set is built, and the record is bookkeeping.
      if (built.id && built.stale === 0) { try { recordSets(figma.root, { [target.id]: entryFor(materializeForBrand(target, brandInput), project(target)) }); } catch { /* read as unrecorded */ } }
      // #3129 Q833 A: and its add-queue key is cleared in the same place, so a set that fails, or is stopped before it
      // runs, stays queued. A set made first as a nested set (#1633), or by the agent's build, clears here too.
      if (built.id && built.stale === 0) { try { clearQueued(queueRoot(), [target.id]); } catch { /* cleared by the next queue write */ } }
      // AFTER the set lands and BEFORE the run's headers, so a first build's header measures the labels too.
      const drawn = await furnishSet(target.id, built.id, project(target));
      if (drawn) furniture.push(drawn);
      // #2723: a set this run created is placed again now its labels are measurable, so the visible gap is the rule's.
      if (drawn && built.placed) await seatSet(built.id, target.id);
      // #846: its usage panel LAST, once the set sits where it stays, so the seating never moves the set past its panel.
      // #2909: unless Documentation has the usage panels off for this file.
      if (drawn && readDocSettings(figma.root).panels) await panelBeside(drawn, built.id, target.id);
      // The real `PageNode` (same #1561 reasoning as `targetPage` above), which satisfies `HeaderPage`.
      // Keyed by the header it labels (#3172): a block with its own header is labeled beside its page's.
      if (page) landed(headerFor(target.id, page.name, componentDefs)?.key ?? page.name, { page: page as unknown as PageNode, defId: target.id });
      return built;
    };
    // NESTED COMPONENTS FIRST (#1633) — every def this one nests or swaps to that the file does not hold yet
    // is built before it, deepest first (`build-deps.ts`). One that is already in the file is left alone:
    // rebuilding it would orphan its placed instances, so it keeps its STALE reading exactly as before. A
    // dependency that fails stops here, so the parent is never built against a missing nest.
    await loadPagesYielding();
    // A NAMED VERSION BEFORE THE FIRST WRITE (#2828), for the def and the sets it adds first. A host that refuses
    // lands in the catch below with nothing written.
    await saveBeforeBuild(figma as unknown as Parameters<typeof saveBeforeBuild>[0], def, { defs: componentDefs, project });
    // Every reading kept, for the end-of-run summary. 54 objects for a 648 build — the memory is nothing
    // and the alternative is a running aggregate that cannot report a distribution.
    const reports: ComponentProgress[] = [];
    const { alsoBuilt, r } = await labelAfterBuilds(async (landed: Landed) => {
      const alsoBuilt = await prebuildDependencies(def, {
        defs: componentDefs, project, host: figma as unknown as DepHost, build: (d) => buildOne(d, [], landed),
      });
      return { alsoBuilt, r: await buildOne(def, reports, landed) };
    }, ({ page, defId }) => placeHeader(page, defId));
    // THE SETTLE PROBE (#684), RUN WITHOUT THE VERDICT WAITING ON IT (#908). It still starts at the exact
    // moment the executor returns — the moment the pill says done and the file was previously frozen for
    // 1m10s — and the console telemetry below still carries its number, so #684's coupling is intact. What
    // #908 removed is the designer waiting for it: awaited here, a busy host held `Building…` for the
    // whole tick budget (8.4s at 20ms of work per tick, 40s at 100ms) and then reported `null`. The
    // ordering is `verdictBeforeSettle`'s, and its header says why it is a named function with a test.
    const settleMs = await verdictBeforeSettle(measureSettle, () => {
      // Cap the miss list rather than the count: `summary` is read in a chrome row that wraps, but a
      // starved file can produce one miss per binding per member and the whole list is not a summary.
      const missNote = r.misses.length
        ? `⚠ ${r.misses.length} misses (${r.misses.slice(0, 3).join('; ')}${r.misses.length > 3 ? '; …' : ''})`
        : '';
      // THE STALE REASON, appended once (#827) — see `staleNote` for why the reason and the remedy are
      // one clause. Placed after `missNote` because the per-member STALE lines are inside that list, and
      // this is what explains them.
      const stale = staleNote(r.stale, ENGINE_VERSION);
      // One item for the set, then one per note after it (#2177: one line each in the Activity drawer). The set's own
      // facts (variants, grid, size, axes, properties, refs) describe one set, so they stay one item.
      const head = r.emittedComponents !== undefined
        // #1012: the no-set arm. `emitAsComponents` defs build SEPARATE `<id>/<glyph>` components, so the
        // grid / axes / properties / refs the set arm prints do not exist — the useful facts are how many
        // components now sit under the folder and how many this run built.
        ? [`${r.emittedComponents.length} '${r.set}/…' components (+${r.added} built, ${r.skipped} already present` +
          `${r.stale ? `, ${r.stale} stale` : ''})`]
        // #1780: a refusal is `set: null` too, but there IS a set on the page — the one left untouched.
        : r.axesChanged
          ? [`nothing built — set '${r.axesChanged.set}' on this page varies by different axes and was left as it is`]
        : r.set === null
          ? ['nothing assembled — no set on this page and no member built']
          : [`set '${r.set}': ${r.variants} variants (+${r.added} built, ${r.skipped} already present` +
            `${r.stale ? `, ${r.stale} stale` : ''}), ` +
            `grid ${r.grid[0]}×${r.grid[1]}, ${Math.round(r.size[0])}×${Math.round(r.size[1])}px, ` +
            `axes ${r.axes.join('/') || '—'}, properties ${r.properties.join('/') || '—'}, ` +
            `${r.refs} refs across ${r.wiredMembers} members`, ...refsItems(r.refsRelinked, r.refsUnsetBy)];
      // The stale note is the no-set and set arms' only: a refusal built nothing, so nothing in it can be stale.
      const staleItem = r.emittedComponents !== undefined || (!r.axesChanged && r.set !== null) ? stale ?? '' : '';
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
      // A missing furniture template makes the run a warning (Q284.3 A, `withTemplateWarning`).
      postVerdict(withTemplateWarning({
        type: 'component-result' as const,
        ok: r.set !== null && r.misses.length === r.skipped,
        completed: r.set !== null,
        headline: componentHeadline(r.added, r.skipped, r.misses.length - r.skipped - r.stale, r.stale, r.refsRelinked),
        ...fromClauses([
          ...head.map((x) => [', ', x] as const), [', ', missNote], ['. ', staleItem],
          ['. ', alsoBuiltItem(alsoBuilt)], ...pageHeaderItems(headers).map((x) => ['. ', x] as const),
          ...furnitureItems(furniture, 'build').map((x) => ['. ', x] as const),
        ]),
      }, furniture), sink);
      verdictPosted = true;
      // #3128: the build is done with the file, so the next one may start: what is left (the settle probe and the
      // console telemetry) writes nothing. The panel posts its next set the moment this verdict lands (#2700), and
      // Update file its update step; held through the probe, that post was refused and the run never ended.
      guard.release('build-components');
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
    // #1664: printed ONLY when the reference back-off ran. One entry per pass — the wait before it, how many
    // queued references it retried, how many landed and read back — so a live run says how long the host's
    // per-member refusal window lasted, instead of leaving it to be inferred from a miss list.
    // #1679: printed only when a Build over an existing set re-linked something.
    if (r.refsRelinked) console.log(`[prism3 #1679] re-linked ${r.refsRelinked} unset reference(s) on the existing set`);
    if (r.refsBackoff?.length) console.log(`[prism3 #1664] reference back-off: ${r.refsBackoff.map((p) => `after ${p.afterMs}ms ${p.repaired}/${p.retried} repaired`).join('; ')}`);
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
    sink.data({ build: { def: def.id, alsoBuilt, pageHeaders: headers, furniture, settleMs, telemetry, report: r, progress: reports } });
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
        type: 'component-result', ok: false, completed: false,
        headline: partial ? partialWriteHeadline(partial) : APPLY_FAILED_HEADLINE,
        ...fromClauses([['', `component build failed: ${(e as Error).message}`], [' — ', partial ? partialWriteItem(partial) : '']]),
      }, sink);
    }
  }
};

/**
 * THE IN-PLACE UPDATE, DRY RUN ONLY (#2265, owner decision Q85 A) — and the one-time baseline capture.
 *
 * Both read every set the targets name, wherever it is in the file, so the pages are loaded first. The
 * plans are the ones `buildComponents` would build now: the same brand materialization and swap target.
 * `update-components` writes nothing (`update-plan.ts`); `capture-baseline` writes only the as-built
 * record, and only on members that read back as exactly the current plan.
 */
/**
 * THE CANVAS FURNITURE FOR ONE SET (#2406, #2188) — labels and the inverse backdrop, drawn on the set's own parent
 * after a build or an update lands it (`canvas-furniture.ts`). Only for a def the pilot switches on. CAUGHT HERE,
 * never rethrown: the set is already written, and furniture is labeling, not the build.
 */
const furnishSet = async (defId: string, setId: string, plans: AnatomyPlan[]): Promise<FurnitureOutcome | null> => {
  if (!hasFurniture(defId) || !setId) return null;
  try {
    const set = await figma.getNodeByIdAsync(setId);
    if (!set || set.type !== 'COMPONENT_SET') return null;
    return await drawFurniture(figma as unknown as FurnitureApi, set as unknown as XNode, furnitureLayout(plans), defId);
  } catch (e) {
    return { def: defId, parent: '', columns: 0, rows: 0, backdrops: 0, scrims: 0, cleared: 0, skipped: [`No canvas labels for ${defId}: Figma refused the write (${(e as Error)?.message ?? String(e)})`], fontMisses: [] };
  }
};

/** A component's display name by id, for the usage panel's Related chips (#846). */
const defName = (id: string): string => componentDefs.find((d) => d.id === id)?.name ?? id;
/**
 * THE USAGE PANEL FOR ONE SET (#846, `doc-panel.ts`), drawn after its labels on a build or an update. CAUGHT HERE, never
 * rethrown, as the labels are: the set is already written, and the panel is documentation, not the build.
 */
const panelFor = async (set: XNode, defId: string, api: PanelApi = figma as unknown as PanelApi): Promise<PanelOutcome> => {
  const def = componentDefs.find((d) => d.id === defId);
  if (!def) return { def: defId, drawn: false, sections: [], replaced: 0, kept: [], skipped: [], misses: [] };
  try { return await drawDocPanel(api, set as unknown as PNode, def, { names: defName }); }
  catch (e) { return { def: defId, drawn: false, sections: [], replaced: 0, kept: [], skipped: [`No usage panel for ${defId}: Figma refused the write (${(e as Error)?.message ?? String(e)})`], misses: [] }; }
};

/** `panelFor` on a set by id, folded into the set's furniture outcome (the build's path). */
const panelBeside = async (f: FurnitureOutcome, setId: string, defId: string): Promise<void> => {
  let set: BaseNode | null = null;
  try { set = await figma.getNodeByIdAsync(setId); } catch { /* reported below */ }
  if (set && set.type === 'COMPONENT_SET') withPanel(f, await panelFor(set as unknown as XNode, defId));
};

/**
 * WHAT UPDATE FILE'S CHECKLIST READS (#2909): the buildable defs whose set (or, for an `emitAsComponents` def, any of its
 * components) the file holds, by the name the build gives it (`presentNames`, the dependency walk's own search), and
 * whether Set up file has run. Never throws to the panel: an unreadable file answers with `error` and nothing present.
 */
const presentDefs = async (): Promise<string[]> => (await readPresent()).ids;
/** #3170: ONE READ OF THE FILE'S SETS AT A TIME. A caller that asks while one is going (the badge's first recount, about
 *  250 ms after open; the checklist; the hand-edit pass) shares it, instead of loading and searching every page again
 *  beside it. A write starting or ending (`guarded`) drops it, so the next caller reads the file as the write left it. */
const readPresent = (onPage?: (done: number, total: number) => void): Promise<FileRead> => {
  if (presentRead) return presentRead;
  const gen = presentGen;
  const read = (async (): Promise<FileRead> => {
    const nodes = await timed('page reads', () => searchPagesYielding(['COMPONENT', 'COMPONENT_SET'], onPage));
    const names = presentNames({ root: rootOver(nodes) } as unknown as Parameters<typeof presentNames>[0]);
    const ids = componentDefs.filter((d) => d.figmaProperties && (names.has(d.id) || (!!d.figmaProperties.emitAsComponents && [...names].some((n) => n.startsWith(`${d.id}/`))))).map((d) => d.id);
    if (gen === presentGen) presentCache = ids;
    watchSets();
    return { ids, nodes };
  })();
  presentRead = read;
  const clear = (): void => { if (presentRead === read) presentRead = null; };
  read.then(clear, clear);
  return read;
};
type FileRead = { ids: string[]; nodes: readonly SearchNode[] };
type SearchNode = { readonly type?: string; readonly name?: string };
let presentRead: Promise<FileRead> | null = null;
/** Moved by each write's start and end (`guarded`): a read begun before it does not leave its answer as the cache. */
let presentGen = 0;
/**
 * #3170: THE FILE'S COMPONENTS AND SETS, A PAGE PER TURN. A document-wide `findAllWithCriteria` walks every node of every
 * page inside one turn, and the file freezes for all of it. On open that search ran once for the read and once per set
 * in the hand-edit pass, about 57 times on the 60-page stand-in, after #3110 had moved the page loads off the path.
 * Each page is loaded and then searched in its own turn, so no turn holds the thread for more than one page. A host
 * whose pages cannot be searched one at a time (a Node shim) is searched in one go, as before.
 */
const searchPagesYielding = async (types: string[], onPage?: (done: number, total: number) => void): Promise<SearchNode[]> => {
  const pages = figma.root.children as readonly { loadAsync?(): Promise<void>; findAllWithCriteria?(c: { types: string[] }): readonly SearchNode[] }[];
  if (!pages.every((p) => typeof p.findAllWithCriteria === 'function')) {
    await loadPagesYielding(onPage);
    return [...(figma.root.findAllWithCriteria({ types: types as NodeType[] }) as readonly SearchNode[])];
  }
  const out: SearchNode[] = [];
  onPage?.(0, pages.length);
  for (const [i, p] of pages.entries()) {
    if (typeof p.loadAsync === 'function') { await p.loadAsync(); await breathe(); }
    out.push(...p.findAllWithCriteria!({ types }));
    onPage?.(i + 1, pages.length);
    await breathe();
  }
  // Nothing left to load; under `dynamic-page` the document-wide searches of a later write still need it called.
  await figma.loadAllPagesAsync();
  return out;
};
/** A root that answers a search from one read (`searchPagesYielding`), for the readers that take a root and search it:
 *  `presentNames`, `isSetUp` and the hand-edit pass's `locateSets`. Its pages are the file's. */
const rootOver = (nodes: readonly SearchNode[]) => ({
  children: figma.root.children,
  findAllWithCriteria: (c: { types?: readonly string[] }) => nodes.filter((n) => !c.types || c.types.includes(n.type ?? '')),
});
/** The rest of the update's host, beside a `rootOver` root: what the hand-edit pass's reads may reach. */
const hostApi = () => ({
  variables: figma.variables,
  getLocalTextStylesAsync: () => figma.getLocalTextStylesAsync(),
  getLocalEffectStylesAsync: () => figma.getLocalEffectStylesAsync(),
  loadFontAsync: (f: FontName) => figma.loadFontAsync(f),
});
/** #3081 Q810 A: the sets the last `presentDefs` found. The badge's live recount (`fileDue`) reuses them, so a change
 *  in the panel never loads every page or walks the file: that is the costly part on a large file. A write starting and
 *  ending clears them (`guarded`), so the next recount reads the file again. */
let presentCache: string[] | null = null;
/**
 * #3091: A SET ADDED, DELETED OR RENAMED BY HAND DROPS THE CACHED SETS, so the badge's next recount reads the file again
 * instead of counting a set the file no longer holds, or missing one it now does. Figma's `documentchange` reports every
 * edit, by hand, by a collaborator or by a plugin. Under `dynamic-page` it can only be listened to once every page is
 * loaded, so it is registered after the first read of the file's sets, which loads them all (`searchPagesYielding`).
 * The listener costs nothing while no sets are cached (a write clears them, `guarded`). Otherwise it drops them on:
 *   · a component or set created, or a node created that holds one (a frame pasted with sets in it);
 *   · a component or set deleted, or a node deleted that could have held one (a removed node's children cannot be read);
 *   · a component or set renamed: the build finds its sets by name (`presentNames`).
 * Any other edit keeps them, so drawing on the canvas never makes the recount read the file again.
 */
const SET_TYPES: ReadonlySet<string> = new Set(['COMPONENT', 'COMPONENT_SET']);
const HOLDER_TYPES: ReadonlySet<string> = new Set(['COMPONENT', 'COMPONENT_SET', 'FRAME', 'GROUP', 'SECTION', 'PAGE']);
type SetChangeNode = { readonly type?: string; readonly removed?: boolean; findAllWithCriteria?(c: { types: string[] }): readonly unknown[] };
type SetChange = { readonly type: string; readonly node?: SetChangeNode; readonly properties?: readonly string[] };
const movesSets = (changes: readonly SetChange[]): boolean => changes.some((c) => {
  const t = c.node?.type ?? '';
  if (c.type === 'DELETE') return HOLDER_TYPES.has(t);
  if (c.type === 'PROPERTY_CHANGE') return SET_TYPES.has(t) && !!c.properties?.includes('name');
  if (c.type !== 'CREATE' || !HOLDER_TYPES.has(t)) return false;
  if (SET_TYPES.has(t)) return true;
  const n = c.node!;
  if (n.removed || typeof n.findAllWithCriteria !== 'function') return true;
  try { return n.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }).length > 0; } catch { return true; }
});
let watchingSets = false;
const watchSets = (): void => {
  if (watchingSets) return;
  try {
    figma.on('documentchange', (e) => {
      if (presentCache === null || !movesSets(e.documentChanges as readonly SetChange[])) return;
      presentCache = null; presentRead = null; presentGen++;
    });
    watchingSets = true;
  } catch { /* a host that refuses the listener: the sets are read again after each write, as before #3091 */ }
};
/**
 * #3110: EVERY PAGE LOADED, ONE AT A TIME, THE THREAD HANDED BACK BETWEEN THEM. Figma loads a page on the main thread
 * and the file freezes while it does: `loadAllPagesAsync` alone on a file of 60 pages held it for about 20 s, the first
 * open of a session (a page stays loaded for the rest of it). One page per turn keeps the file answering between pages.
 * The closing `loadAllPagesAsync` has nothing left to load; it is still called, because under `dynamic-page` the
 * document-wide searches after it (`presentNames`, the update's `locateSets`) need it called. A host whose pages carry
 * no `loadAsync` (a Node shim) skips straight to it. Every read and write in this file that needs every page loads them
 * here, so none of them freezes the file while the read after open is still going.
 */
const loadPagesYielding = async (onPage?: (done: number, total: number) => void): Promise<void> => {
  // #3170 Q3170.1 A: the read after open says how far it has got, a page at a time (`onPage`), for the status strip.
  const pages = (figma.root.children as readonly { loadAsync?(): Promise<void> }[]).filter((p) => typeof p.loadAsync === 'function');
  if (pages.length) onPage?.(0, pages.length);
  for (const [i, p] of pages.entries()) {
    await p.loadAsync!();
    onPage?.(i + 1, pages.length);
    await breathe();
  }
  await figma.loadAllPagesAsync();
};
/** #3110: stage timings for plugin open, kept only when `PRISM3_OPEN_TIMINGS` is an array on the global (a test, or a
 *  debug session, sets it), so a normal run times nothing. Each stage pushes its name and how long it took. */
const timed = async <T>(stage: string, fn: () => T | Promise<T>): Promise<T> => {
  const log = (globalThis as { PRISM3_OPEN_TIMINGS?: unknown }).PRISM3_OPEN_TIMINGS;
  if (!Array.isArray(log)) return fn();
  const t0 = Date.now();
  try { return await fn(); } finally { log.push({ stage, ms: Date.now() - t0 }); }
};
/** The brand a due read, a scoped check or the panel's update measures against (#2909, Q699 A, built on its
 *  recommendation): the brand the panel holds when it sends one, so the counts shown are what the run writes after its
 *  Theme step stores that brand, and a lever not yet applied shows its sets as due on the first opening. Absent (the
 *  read at load, an agent's command), the file's stored brand. */
const brandOf = (panel: BrandInput | undefined): BrandInput | null => {
  if (panel) return panel;
  try { return restoreInput(figma.root); } catch { return null; /* untrusted/absent → defaults, as `buildComponents` */ }
};
/** The ledger entry each def would get if it were built now, against `input`'s brand (#2909 Q2909.8 A, `brandOf`). The
 *  brand's theme is built once for every def (`materializerFor`); a def the engine cannot plan has none, and reads
 *  unrecorded. */
const ledgerNow = (input?: BrandInput): ((def: string) => LedgerEntry | null) => {
  const mat = materializerFor(brandOf(input));
  return (id) => {
    const d = componentDefs.find((x) => x.id === id);
    try { return d ? entryFor(mat(d)) : null; } catch { return null; }
  };
};
/** #3129 Q833 A: THE ADD QUEUE (`add-queue.ts`), on the root's shared plugin data. A def it may hold is one the engine
 *  builds, the test `presentDefs` reads the file by; every read reports it without the sets the file holds (Q3129.2 A)
 *  and without a def the engine no longer builds (Q3129.3 A). Reads never write. */
const queueRoot = (): QueueRoot => figma.root as unknown as QueueRoot;
const queueable = (id: string): boolean => componentDefs.some((d) => d.id === id && !!d.figmaProperties);
const queuedFor = (present: readonly string[]): string[] => visibleOf(readQueue(queueRoot()), queueable, present);
/** The panel's queue write: set or clear `ids`' keys, then clear the keys a read leaves out (the sets the file holds,
 *  the defs the engine no longer builds), and answer with the queue. It writes no layer, so it saves no version and is
 *  never guarded: a box ticked during a run is kept. An Update file run ends with one carrying no ids. */
const addQueue = async (ids: readonly string[], on: boolean): Promise<void> => {
  let error: string | undefined;
  try { setQueued(queueRoot(), on ? ids.filter(queueable) : ids, on); } catch (e) { error = (e as Error)?.message ?? String(e); }
  let present: readonly string[] = [];
  try {
    present = presentCache ?? await presentDefs();
    clearQueued(queueRoot(), staleOf(readQueue(queueRoot()), queueable, present));
  } catch { /* the next write clears them */ }
  postToUi({ type: 'add-queue', queued: queuedFor(present), ...(error ? { error } : {}) });
};
/** The print of the plans each def would be drawn from now, against `input`'s brand (#3082 Q811 A): the plans a build
 *  hands the executor (`project` in `buildComponents`). A def the engine cannot plan has none. Memoized across calls
 *  (`printMemo`), so the reads after open and the badge's recounts project a stale set once, not once each. */
const printNow = (input?: BrandInput): Printer => {
  const mat = materializerFor(brandOf(input));
  const defs = new Map<string, { m: ComponentDef; key: string } | null>();
  const defOf = (id: string): { m: ComponentDef; key: string } | null => {
    if (defs.has(id)) return defs.get(id)!;
    const d = componentDefs.find((x) => x.id === id);
    let v: { m: ComponentDef; key: string } | null = null;
    try { if (d) { const m = mat(d); v = { m, key: JSON.stringify(m) }; } } catch { v = null; }
    defs.set(id, v);
    return v;
  };
  const print = (id: string): PlanPrint | null => {
    const v = defOf(id);
    if (!v) return null;
    const { m, key } = v;
    if (printMemo.has(key)) return printMemo.get(key)!;
    let p: PlanPrint | null = null;
    const t0 = Date.now();
    try { p = printOf(figmaAnatomySet(m, { swapTarget: SWAP_TARGET })); } catch { p = null; }
    // Each projection is logged as a `print` stage when timings are kept (`timed`), so a test can count them.
    const log = (globalThis as { PRISM3_OPEN_TIMINGS?: unknown }).PRISM3_OPEN_TIMINGS;
    if (Array.isArray(log)) log.push({ stage: 'print', ms: Date.now() - t0 });
    if (printMemo.size >= PRINT_MEMO_MAX) printMemo.delete(printMemo.keys().next().value!);
    printMemo.set(key, p);
    return p;
  };
  return Object.assign(print, { held: (id: string) => { const v = defOf(id); return !v || printMemo.has(v.key); } });
};
type Printer = ((def: string) => PlanPrint | null) & { readonly held: (def: string) => boolean };
/** Prints `ids` ahead of a `dueOf`, handing the thread back after each set it projects. A print the memo holds costs no
 *  projection, so it yields nothing: a turn per set would make each recount wait on a timer per stale set. */
const printYielding = async (print: Printer, ids: readonly string[]): Promise<void> => {
  for (const id of ids) { if (print.held(id)) continue; print(id); await breathe(); }
};
/** #3096 into #3090: a set's plans are a function of its materialized def alone (the engine's code is fixed for the
 *  session), so its print is kept by that def's JSON, whatever brand produced it. Projecting is the costly part of a
 *  read under a moved engine (about 0.85 s for every def in Node): the ledger read at open, the full read after it and
 *  each recount the badge asks would otherwise project the same stale sets again. Bounded, oldest out first. */
const printMemo = new Map<string, PlanPrint | null>();
const PRINT_MEMO_MAX = 256;
/**
 * THE QUIET RE-RECORD (#3082 Q811 A), after a write: each set whose entry names another engine or (#3101) another
 * revision (or carries no print, an entry from before Q811 A) and whose plans print now as they did when it was drawn is recorded again under today's
 * engine, against the file's stored brand, which the write has just left. Never at load: a read that wrote the file's
 * root would make opening the plugin an edit of the document, refused on a file the person can only view, and the
 * panel's read carries a brand not yet applied. Until a write records it, the read prints the set and calls it current.
 * One root read; a set's plans are projected only when its entry is stale. CAUGHT: the write is done, and this is
 * bookkeeping.
 */
const restampQuiet = (): void => {
  try {
    const ledger = readLedger(figma.root);
    const now = ledgerNow();
    const stale = Object.keys(ledger).filter((id) => { const e = now(id); return !!e && (e.engine !== ledger[id].engine || e.rev !== ledger[id].rev || !ledger[id].print); });
    if (!stale.length) return;
    const print = printNow();
    recordSets(figma.root, quietOf(ledger, dueOf(ledger, stale, now, print), (id) => { const e = now(id); const p = print(id); return e && p ? { ...e, print: p } : null; }));
  } catch { /* read as current by print until the next write */ }
};
/** `fn`, then the quiet re-record (Q811 A): for Theme and the build, two writes Update file runs. The in-place update
 *  calls it after its apply only, since its check is a read. */
const thenRestamp = <A extends unknown[]>(fn: (...a: A) => Promise<void>) => async (...a: A): Promise<void> => { try { await fn(...a); } finally { restampQuiet(); } };
/** `atOpen`: the read after open (#3110), as against an answer to the panel's own `file-sets-request`. It now yields, so
 *  a request asked meanwhile can be answered first; the panel tells the two apart by this. */
const fileSets = async (input?: BrandInput, atOpen = false): Promise<void> => {
  try {
    const { ids: present, nodes } = await readPresent(atOpen ? (done, total) => postProgress('read', { phase: 'work', item: null, done, total }) : undefined);
    // #2909 Q2909.8 A: what is due, from the as-built ledger, one root read (`as-built-ledger.ts`), against the panel's brand.
    // #3082 Q811 A: a set whose engine moved is printed, a set at a time with the thread handed back, and is due only
    // when its plans moved.
    const ledger = readLedger(figma.root);
    const now = ledgerNow(input);
    const print = printNow(input);
    await printYielding(print, needsPrint(ledger, present, now));
    const due = await timed('due (file)', () => dueOf(ledger, present, now, print));
    postToUi({ type: 'file-sets', present, setUp: isSetUp(rootOver(nodes) as unknown as Parameters<typeof isSetUp>[0]), due, queued: queuedFor(present), ...(atOpen ? { atOpen: true as const } : {}) });
  } catch (e) {
    postToUi({ type: 'file-sets', present: [], setUp: false, due: {}, queued: [], error: (e as Error)?.message ?? String(e), ...(atOpen ? { atOpen: true as const } : {}) });
  }
};
/**
 * #3110: WHAT IS DUE AT OPEN, FROM THE ROOT LEDGER ALONE: no page is loaded, so the panel is ready at once on a file of
 * any size. The ledger holds one entry per set Prism3 wrote, at the root, so the sets it names are the ones read as
 * present, against the stored brand, as the read at load always was. It cannot see a set it holds no entry for (built
 * before it, or by hand), nor one deleted since, nor whether Set up file has run, so the answer says it is `partial`:
 * the panel shows such a set as Checking, and Update file's checklist never opens on it. The full read follows, a page
 * at a time (`fileSets`), and replaces it. Both carry `atOpen`, so the panel keeps an answer it asked for meanwhile.
 */
const ledgerSets = async (): Promise<void> => {
  try {
    const ledger = await timed('ledger read', () => readLedger(figma.root));
    const present = componentDefs.filter((d) => d.figmaProperties && ledger[d.id]).map((d) => d.id);
    // #3096 into #3090: the ledger's read prints too, as `fileSets` does, against the same stored brand: without a print
    // a printed set under a moved engine reads `unrecorded`, and the panel's first answer would disagree with the full
    // read on what is due. Printing projects the plans in memory and loads no page, a set at a time with the thread
    // handed back; the full read after it finds those prints memoized.
    const now = ledgerNow();
    const print = printNow();
    await printYielding(print, needsPrint(ledger, present, now));
    const due = await timed('due (ledger)', () => dueOf(ledger, present, now, print));
    // `setUp` is not read: it needs a document-wide search, so every page loaded. Only the checklist reads it, and the
    // checklist waits for the full read.
    postToUi({ type: 'file-sets', present, setUp: false, due, queued: queuedFor(present), partial: true, atOpen: true });
  } catch { /* the full read follows and says why */ }
};

/** #3081 Q810 A: the badge's live recount. It counts what is due against the panel's brand, and whether the file holds
 *  that brand, so Theme counts as one item until Apply Theme stores it. It runs one root read for the ledger and one for
 *  the stored brand, and materializes each present set once. It never runs the full check, and it reuses the sets the
 *  last read found (`presentCache`). The panel debounces its requests; `seq` lets it drop an answer a newer one has
 *  replaced. */
const fileDue = async (input: BrandInput | undefined, seq: number): Promise<void> => {
  try {
    const present = presentCache ?? await presentDefs();
    // #3096 into #3090: printed as `fileSets` prints, against the panel's brand, or an engine-moved set whose drawing
    // changed would read `unrecorded` and the badge would not count it while the checklist lists it as Due.
    const ledger = readLedger(figma.root);
    const now = ledgerNow(input);
    const print = printNow(input);
    await printYielding(print, needsPrint(ledger, present, now));
    postToUi({ type: 'file-due', seq, present, theme: !!input && !holdsInput(figma.root, input), due: dueOf(ledger, present, now, print), queued: queuedFor(present) });
  } catch (e) {
    postToUi({ type: 'file-due', seq, present: [], theme: false, due: {}, queued: [], error: (e as Error)?.message ?? String(e) });
  }
};

/**
 * THE BACKGROUND HAND-EDIT PASS (#2909 Q2909.8 A), after load: each set the file holds, a set at a time, its members read
 * against their as-built records (`handEditsOf`), each answer posted as it lands so the panel fills its statuses in.
 * The thread is handed back between members and between sets. A newer request ends an older pass where it is, and so
 * does a write starting (`guard`), whose result the next pass reads.
 */
let handPass = 0;
const handEditsPass = async (): Promise<void> => {
  const mine = ++handPass;
  const stale = (): boolean => mine !== handPass || (['build-components', 'apply-theme', 'file-setup', 'style-guide'] as const).some((c) => guard.busy(c));
  try {
    const { ids: present, nodes } = await readPresent();
    // #3170: each set is found in the read just made, never by a search of the whole file per set, and its plans are
    // projected in its own turn: projecting every set at once held the thread for about 0.5 s in Node.
    const host = { ...hostApi(), root: rootOver(nodes) } as unknown as UpdateHost;
    for (const id of present) {
      if (stale()) return;
      const t = (await timed('plan', () => updateTargets(id))).targets[0];
      if (!t) { await breathe(); continue; }
      await breathe();
      if (stale()) return;
      let r: { members: number; edited: number } | null = null;
      try { r = await handEditsOf(host, t, breathe); } catch { r = null; }
      if (stale()) return;
      if (r) postToUi({ type: 'hand-edits', def: t.def, members: r.members, edited: r.edited });
      await breathe();
    }
    if (!stale()) postToUi({ type: 'hand-edits', done: true });
  } catch { if (mine === handPass) postToUi({ type: 'hand-edits', done: true }); }
};

/**
 * THE FULL CHECK, SCOPED TO THE FLAGGED SETS (#2909 Q2909.8 A): the update's dry run (`previewUpdate`), as the agent's
 * `update-components` check runs it, over only the sets Update file's checklist lists as due, so its counts and the
 * `previewHash` an apply must echo stay exact. A read: never guarded, never a verdict in Activity.
 */
const checkSets = async (defs: readonly string[], input?: BrandInput): Promise<void> => {
  try {
    const { targets, refused } = updateTargets(defs, input);
    // #3177: `previewUpdate` loads and searches the file a page per turn, once, for every set it reads.
    const r = await previewUpdate(figma as unknown as UpdateHost, targets, breathe);
    r.refused.push(...refused);
    // `previewUpdate` adds a preview for each target it found, in the targets' order, and names the rest as missing or
    // refused, so the found targets pair with the previews one to one.
    const found = targets.filter((t) => !r.missing.includes(t.def) && !r.refused.some((x) => x.def === t.def));
    postToUi({
      type: 'update-check', previewHash: previewHashOf(r), missing: r.missing, refused: r.refused,
      sets: r.sets.map((p, i) => checkedSetOf(p, found[i]?.def ?? p.set)),
    });
  } catch (e) {
    postToUi({ type: 'update-check', previewHash: '', missing: [], refused: [], sets: [], error: (e as Error)?.message ?? String(e) });
  }
};

/** `seatNewSet` on a set by id (#2723), with the room its usage panel will take (#846). CAUGHT, as `furnishSet` is:
 *  the set is built, and this is its placement. */
const seatSet = async (setId: string, defId: string): Promise<void> => {
  try {
    const set = await figma.getNodeByIdAsync(setId);
    // Only a family's lead carries the family's panel (#2927), so only its set is seated with room for one.
    if (set && set.type === 'COMPONENT_SET') seatNewSet(set as unknown as XNode, defId, leadsPanel(defId) ? docPanelReach(figma as unknown as PanelApi, set as unknown as PNode) : 0);
  } catch { /* the set stays where the executor placed it */ }
};

const updateTargets = (defId: string | readonly string[] | undefined, input?: BrandInput): { targets: UpdateTarget[]; unknown: string | null; refused: { def: string; reason: string }[] } => {
  const brandInput = brandOf(input);
  // #2909: the panel's Update file names a list, the sets its checklist ticked, in catalog order.
  const ids = typeof defId === 'string' ? [defId] : defId;
  const defs = ids === undefined ? componentDefs.filter((d) => d.figmaProperties) : componentDefs.filter((d) => ids.includes(d.id));
  const unknownId = ids?.find((id) => !componentDefs.some((d) => d.id === id));
  if (unknownId !== undefined) return { targets: [], unknown: unknownId, refused: [] };
  const targets: UpdateTarget[] = [];
  const refused: { def: string; reason: string }[] = [];
  // #2909: a set's usage panel rides its update only while Documentation has the panels on for this file.
  const panels = readDocSettings(figma.root).panels;
  for (const d of defs) {
    // `single` (#2296): an `emitAsComponents` def (the icons, the spinner) is read as single components, not a set.
    try { targets.push({ def: d.id, plans: figmaAnatomySet(materializeForBrand(d, brandInput), { swapTarget: SWAP_TARGET }), ...(d.figmaProperties?.emitAsComponents ? { single: true } : {}), ...(panels && leadsPanel(d.id) ? { doc: { def: d, names: defName } } : {}) }); }
    catch (e) { refused.push({ def: d.id, reason: `the engine could not plan it (${(e as Error)?.message ?? String(e)})` }); }
  }
  return { targets, unknown: null, refused };
};
const breathe = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const unknownDef = (defId: string, sink: ActionSink): void => {
  const why = `no component def with id '${defId}' — this build knows ${componentDefs.map((d) => d.id).join(', ')}`;
  postVerdict({ type: 'component-update-result', ok: false, headline: '✗ unknown def', summary: why, lines: [why] }, sink);
};

const updateComponents = async (defId: string | readonly string[] | undefined, previewHash: string | null, choices: UpdateChoices | undefined, input: BrandInput | undefined, sink: ActionSink): Promise<void> => {
  try {
    const { targets, unknown, refused } = updateTargets(defId, input);
    if (unknown !== null) return unknownDef(unknown, sink);
    // #3177: the check and the apply each load and search the file a page per turn, once, for every set they read.
    if (previewHash === null) {
      const r = await previewUpdate(figma as unknown as UpdateHost, targets, breathe);
      r.refused.push(...refused);
      // The hash a confirm must echo, over the file as this check read it (#2265 PR 2).
      sink.data({ update: { mode: 'preview', previewHash: previewHashOf(r), ...r } });
      postVerdict({ type: 'component-update-result', ...previewVerdict(r) }, sink);
      return;
    }
    // THE APPLY (#2265 PR 2): the same plans the check laid against the file, applied over it only while it still
    // hashes as the check did. `figma` is both the file the check reads and the executor's port.
    const descriptionOf = (def: string): string | undefined => componentDefs.find((d) => d.id === def)?.summary;
    const nameOf = (def: string): string | undefined => componentDefs.find((d) => d.id === def)?.name;
    // THE CANVAS FURNITURE (#2406, #2188), redrawn for every piloted set the apply acted on — from the members as they
    // now sit, so the labels follow the update — and the page re-spaced from it in the same apply (Q358 A). A set whose
    // only work was its furniture (#2803) is one of them. Reported in the data, and in the verdict only where a part
    // was skipped.
    const furniture: FurnitureOutcome[] = [];
    // #3177: drawn through the run's host (`file`), whose lookups are answered from the run's one read of the file.
    const furnish = async (def: string, _set: unknown, file: unknown): Promise<void> => {
      furniture.push(...await furnishUpdate(file as FurnitureApi, { outcomes: [{ def }] }, targets, (set, d) => panelFor(set, d, file as PanelApi)));
    };
    // #3170: the panel's own update reports each set boundary and hands the thread back after about `PACE_MS` inside a
    // set (`chunk: 1`, `paced`), and reads its Stop at each boundary. An agent's update yields as before and posts nothing.
    const panel = sink === uiSink;
    if (panel) updateStopAsked = false;
    let last: ApplyProgress | null = null;
    const progress = (p: ApplyProgress): void => { last = p; postProgress('update', p); };
    const pacing = panel ? { progress, stop: () => updateStopAsked, chunk: 1, yieldTo: paced(() => { if (last) postProgress('update', last); }) } : {};
    const r = await applyUpdate(figma as unknown as ApplyHost, figma as unknown as ComponentsApi, targets, previewHash, { descriptionOf, nameOf, breathe, furnish, ...(choices ? { choices } : {}), ...pacing });
    r.refused.push(...refused);
    // THE AS-BUILT LEDGER (#2909 Q2909.8 A): each set the apply acted on is recorded as built from today's def, under the
    // brand its plans were laid from (the panel's, which the run's Theme step applied). A refused set, or an apply
    // refused whole (the file moved since the check), records nothing. CAUGHT, as the build's is.
    // #3082 Q811 A: with the print of the plans the apply laid, the target's own.
    const now = ledgerNow(input);
    const acted = Object.fromEntries(r.outcomes.filter((o) => !o.refused).flatMap((o) => {
      const e = now(o.def);
      const plans = targets.find((t) => t.def === o.def)?.plans;
      return e && plans ? [[o.def, { ...e, print: printOf(plans) }] as const] : [];
    }));
    try { recordSets(figma.root, acted); } catch { /* read as due again; the next update records it */ }
    // Q811 A: the apply is a write, so the sets that are current by their print are recorded now too. Not the check above.
    restampQuiet();
    sink.data({ update: { mode: 'apply', ...r, furniture } });
    // #2858: the library publish description, which the Activity drawer offers with a Copy button.
    postVerdict({ type: 'component-update-result', ...withTemplateWarning(withFurnitureItems(applyVerdict(r), furnitureItems(furniture, 'update')), furniture), ...(r.publish ? { publish: r.publish } : {}) }, sink);
  } catch (e) {
    const why = (e as Error)?.message ?? String(e);
    postVerdict({ type: 'component-update-result', ok: false, headline: previewHash === null ? '✗ check failed' : '✗ update failed', summary: why, lines: [why] }, sink);
  }
};

const captureBaseline = async (defId: string | undefined, sink: ActionSink): Promise<void> => {
  try {
    const { targets, unknown, refused } = updateTargets(defId);
    if (unknown !== null) return unknownDef(unknown, sink);
    // #3189: the file read once, a page per turn, through the update's run host (`runHost`), never searched whole per
    // set. Both commands are an agent's (the panel starts neither), so their readings go to the panel for the status
    // strip directly, never through the agent's sink, which would take each one for a verdict.
    const r = await captureBaselines(figma as unknown as UpdateHost, targets, breathe, (p) => postProgress('capture', p));
    r.refused.push(...refused);
    sink.data({ update: { mode: 'capture', ...r } });
    postVerdict({ type: 'component-update-result', ...captureVerdictText(r) }, sink);
  } catch (e) {
    const why = (e as Error)?.message ?? String(e);
    postVerdict({ type: 'component-update-result', ok: false, headline: '✗ record failed', summary: why, lines: [why] }, sink);
  }
};

/** ADOPT (#2283, §10 Q4): record and stamp the members Prism3 did not build, so an update can bring them to the
 *  plan in place. Writes only plugin data. */
const adoptMembers = async (defId: string | undefined, sink: ActionSink): Promise<void> => {
  try {
    const { targets, unknown, refused } = updateTargets(defId);
    if (unknown !== null) return unknownDef(unknown, sink);
    // #3189: as the capture's, one read a page per turn, and its readings to the status strip.
    const r = await adoptAll(figma as unknown as UpdateHost, targets, breathe, undefined, (p) => postProgress('adopt', p));
    r.refused.push(...refused);
    sink.data({ update: { mode: 'adopt', ...r } });
    postVerdict({ type: 'component-update-result', ...adoptVerdictText(r) }, sink);
  } catch (e) {
    const why = (e as Error)?.message ?? String(e);
    postVerdict({ type: 'component-update-result', ok: false, headline: '✗ adopt failed', summary: why, lines: [why] }, sink);
  }
};

/**
 * DRAW SPECS (#2830 phase 2, Q2830.3 A) — the spec panel beside each family's usage panel, on request only: Build and
 * Update never draw one. Every family whose lead's set is in the file, or `defId`'s family; `scope: 'page'`, the panel's
 * Draw specs (Documentation › Specs), only the families whose lead's set is on the current page. The def each panel names is
 * the def as this file builds it (`materializeForBrand` with the saved brand), so its tokens are the ones the sets bind.
 * A panel's failure is CAUGHT per family and reported: the others still draw.
 */
const drawSpecs = async (defId: string | undefined, scope: 'file' | 'page', sink: ActionSink): Promise<void> => {
  try {
    if (defId !== undefined && !componentDefs.some((d) => d.id === defId)) return unknownDef(defId, sink);
    let brandInput: BrandInput | null = null;
    try { brandInput = restoreInput(figma.root); } catch { /* untrusted/absent → defaults, as `buildComponents` */ }
    await loadPagesYielding();
    const api = figma as unknown as SpecApi;
    const { targets, skipped } = specTargets(api, defId, scope === 'page' ? figma.currentPage : undefined);
    const drawn: string[] = [], items: string[] = [...skipped];
    for (const { def, set } of targets) {
      let o: SpecOutcome;
      try { o = await drawSpecPanel(api, set, def, { materialize: (d) => materializeForBrand(d, brandInput) }); }
      catch (e) { o = { def: def.id, drawn: false, sets: [], replaced: 0, kept: [], skipped: [`No spec panel for ${def.id}: Figma refused the write (${(e as Error)?.message ?? String(e)})`], misses: [] }; }
      if (o.missing?.length) { items.push(`No spec panels: the file has no ${o.missing.join(', ')}. Run Set up file first`); break; }
      if (o.drawn) drawn.push(def.id);
      items.push(...specItems(o));
      await breathe();
    }
    sink.data({ specs: { drawn, items } });
    // DRAFT wording (Q2830.7).
    const ok = drawn.length > 0 && drawn.length === targets.length && !skipped.length;
    const headline = !targets.length ? '✗ no sets to spec' : ok ? `✓ drew ${drawn.length} spec panel${drawn.length === 1 ? '' : 's'}` : `⚠ drew ${drawn.length} of ${targets.length} spec panels`;
    const summary = !targets.length ? `No family's lead set is ${scope === 'page' ? 'on this page' : 'in this file'}${defId ? ` for ${defId}` : ''}.` : [`Drew ${drawn.length} of ${targets.length}.`, ...items].join(' ');
    postVerdict({ type: 'component-update-result', ok: ok && !items.length, headline, summary, lines: targets.length ? [`Drew ${drawn.length} of ${targets.length}.`, ...items] : [summary] }, sink);
  } catch (e) {
    const why = (e as Error)?.message ?? String(e);
    postVerdict({ type: 'component-update-result', ok: false, headline: '✗ draw specs failed', summary: why, lines: [why] }, sink);
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
 * would make a second pair — `ensureFileComponents` skips the build when the page already holds either
 * set, whatever the case of its name).
 *
 * Its own action, not part of `apply-theme` or `build-components`, for the #652 reason every canvas write
 * on this bridge is its own action: a distinct designer choice with its own trigger and its own verdict.
 */
const fileSetup = async (sink: ActionSink): Promise<void> => {
  try {
    await loadPagesYielding();
    const scaffold = await scaffoldSkeleton(figma, TAXONOMY);
    // THE SETS ON A FORMER PAGE (#2989, owner decision Q656 A) move to the page the taxonomy names now, after a named
    // version, as Update moves them (`page-moves.ts`). No page is deleted: one left empty is named for the owner.
    let relocated: RelocateOutcome | null = null;
    let movesNote = '';
    const due = pageMovesDue(figma.root.children);
    if (due.length) {
      let saved = false;
      try { await saveVersion(figma, { run: 'setup', sets: due.map((m) => ({ set: m.set })) }); saved = true; }
      catch (e) { movesNote = `\nSets not moved to their pages: the named version could not be saved (${(e as Error)?.message ?? String(e)}).`; }
      if (saved) {
        relocated = await relocateSets(figma, TAXONOMY);
        // A moved block's header goes with it (#3172), and the page it leaves is named too.
        const hdr = await placeBlockHeaders(figma);
        const done = hdr.placed.filter((p) => p.outcome.status === 'placed' || (p.from && p.outcome.status === 'present'));
        const emptied = [...relocated.emptied, ...hdr.emptied];
        movesNote = ['', pageMovesLine(relocated.moved, true), ...blockHeadersLines(done, true), emptiedLine(emptied)].filter((l, i) => i === 0 || l).join('\n');
      }
    }
    const page = scaffold.fileComponentsPage;
    let assetNote = '';
    let assets: { built?: string[]; fontMisses?: string[]; skipped?: boolean; styleGuideCells?: unknown; furnitureTemplates?: unknown; docBlock?: unknown } = {};
    if (page) {
      // IDEMPOTENT ASSET BUILD: skipped when the page already holds either set, in any case (`ensureFileComponents`).
      const res = await ensureFileComponents(figma, page);
      if (res.skipped) {
        assetNote = ', file components already present (skipped)';
        assets = { skipped: true };
      } else {
        assets = { built: res.built, fontMisses: res.fontMisses };
        assetNote = `, built ${res.built.join(' + ')}` +
          (res.fontMisses.length ? ` (⚠ ${res.fontMisses.length} font miss: ${res.fontMisses.slice(0, 2).join('; ')})` : '');
      }
      // THE CANVAS-FURNITURE TEMPLATES (#2406, #2188), each found on its own so a file set up before them gets them.
      const tpl = await ensureFurnitureTemplates(figma as unknown as TemplatesApi, page);
      assets = { ...assets, furnitureTemplates: tpl };
      if (tpl.built.length) assetNote += `, built ${tpl.built.join(' + ')}` +
        (tpl.backdropBinding === 'no-variable' ? ' (the backdrop binds to the inverse background once the theme is applied)' : '') +
        (tpl.scrimBinding === 'no-variable' ? ' (the scrim binds to the scrim color once the theme is applied)' : '') +
        (tpl.fontMisses.length ? ` (⚠ ${tpl.fontMisses.slice(0, 2).join('; ')})` : '');
      // THE USAGE PANEL'S BLOCKS (#846), built from the file's own Badge, Tag, List.Item and Divider and its theme.
      const docBlock = await ensureDocBlock(figma as unknown as DocBlockApi, page);
      assets = { ...assets, docBlock };
      assetNote += docBlockNote(docBlock);
      // The style-guide cell sets (#259) beside them — adopted wherever the file already has them, in any case.
      const cells = await ensureStyleGuideCells(figma, page);
      assets = { ...assets, styleGuideCells: cells };
      if (cells.built.length) assetNote += `, built ${cells.built.join(' + ')}${cells.fontMisses.length ? ` (⚠ ${cells.fontMisses.slice(0, 2).join('; ')})` : ''}`;
      if (cells.adopted.length) assetNote += `, style-guide cells already present: ${cells.adopted.map((a) => a.page ? `${a.name} on ${a.page}` : a.name).join(', ')}`;
    } else {
      assetNote = ', ⚠ no File Components page — assets not built';
    }
    // THE LIBRARY COVER (#2859, owner decision Q509 A, Q?5 A): drawn on the Cover page the scaffold just made, with the
    // saved brand's name, and set as the file thumbnail while that is still Figma's default. Every Update keeps it current.
    // `drawCover` reads the brand the file holds; with none it draws nothing and says so.
    let cover: CoverOutcome;
    // #2977: unless Documentation has the cover off for this file; then nothing is drawn and the thumbnail is left.
    if (!readDocSettings(figma.root).cover) cover = { did: 'none', skipped: COVER_OFF, fontMisses: [] };
    else try { cover = await drawCover(figma as unknown as CoverApi, figma.root as unknown as CoverRoot); }
    catch (e) { cover = { did: 'none', skipped: `not drawn, Figma refused the write (${(e as Error)?.message ?? String(e)})`, fontMisses: [] }; }
    const coverNote = coverLine(cover);
    const summary = `pages: ${scaffold.created.length} created${scaffold.created.length ? ` (${scaffold.created.slice(0, 4).join(', ')}${scaffold.created.length > 4 ? '…' : ''})` : ' (all present)'}${assetNote}${movesNote}${coverNote ? `\n${coverNote}` : ''}`;
    sink.data({ fileSetup: { pagesCreated: scaffold.created, fileComponentsPage: page ? true : false, assets, cover, ...(relocated ? { relocated } : {}) } });
    sink.post({ type: 'file-setup-result', ok: true, headline: '✓ file set up', summary: appendBuildNote(summary, PRISM3_BUILD) });
  } catch (e) {
    sink.post({ type: 'file-setup-result', ok: false, headline: '✗ setup failed', summary: appendBuildNote(`file setup failed: ${(e as Error).message}`, PRISM3_BUILD) });
  }
};

/**
 * STYLE GUIDE (#259, phase 1: color) — the token tables, drawn from the file's own variables with the cell sets
 * file setup placed. `style-guide.ts` holds the plan and the executor; this reads the saved brand for the
 * contrast column's grounds and floors (the engine's own contract, `resolveAllModes`), and reports.
 *
 * NO SAVED BRAND IS NOT A FAILURE: the tables are drawn and the contrast column reads "—", said once in the
 * summary. A brand that no longer resolves is the same, with its reason.
 */
/** The saved brand's contrast contract, or null with the reason it did not resolve. */
const savedContract = (): { contract: SgContract | null; note: string } => {
  try {
    const input = restoreInput(figma.root);
    return { contract: input ? resolveAllModes(brandTheme(input)) : null, note: '' };
  } catch (e) {
    return { contract: null, note: `The saved brand did not resolve (${(e as Error).message}), so the contrast column reads "—"` };
  }
};

/** Set by `style-guide-cancel` (S11.2, owner decision P7) and read by the running style guide after each table. Cleared
 *  when a run starts, so a cancel sent while nothing ran cannot stop the next run. */
let styleGuideStop = false;

const styleGuide = async (options: StyleGuideOptions, sink: ActionSink): Promise<void> => {
  styleGuideStop = false;
  try {
    const { contract, note: contractNote } = savedContract();
    // The page's per-table list (S11.2) is the PANEL's: an agent's sink would take each of these as a verdict.
    const panel = sink === uiSink;
    // One table at a time, yielding to the host between them and within a big one (#1778). Each reading goes to
    // the pending pill and, logged, to the console: a hung run's last line names the table it hung on, and
    // `tableMs` is the live figure `CELLS_PER_YIELD` is calibrated against. Pages first, one per turn (#3110):
    // `runStyleGuide`'s own `loadAllPagesAsync` then has nothing left to load.
    await loadPagesYielding();
    const result = await runStyleGuide(figma, contract, options, {
      // A NAMED VERSION BEFORE THE FIRST WRITE (#2828); a host that refuses ends the run in the catch below.
      beforeWrite: (tables) => saveVersion(figma, { run: 'style-guide', tables }).then(() => undefined),
      onProgress: (p) => {
        if (p.done > 0) console.log(`[prism3 #1778] style guide: table ${p.done} of ${p.total}, ${p.title}, ${p.tableMs}ms`);
        sink.post({ type: 'style-guide-progress', done: p.done, total: p.total, tableMs: p.tableMs });
      },
      onPlan: (tables) => { if (panel) sink.post({ type: 'style-guide-tables', tables: tables.map((t) => ({ key: t.key, title: t.title, page: t.page.replace(/^↳\s*/, '') })) }); },
      onTable: (e) => { if (panel) sink.post({ type: 'style-guide-table', index: e.index, status: e.status, ...(e.reason !== undefined ? { reason: e.reason } : {}) }); },
      stop: () => styleGuideStop,
    });
    const v = styleGuideSummary(result);
    sink.data({ styleGuide: result });
    // The contract note is one more item, joined by `. ` like the rest (#2177).
    const summary = contractNote ? `${v.summary}. ${contractNote}` : v.summary;
    const lines = withBuildLine(contractNote ? [...v.lines, contractNote] : v.lines);
    sink.post({ type: 'style-guide-result', ok: v.ok, headline: v.headline, summary: appendBuildNote(summary, PRISM3_BUILD), lines, ...(result.stopped ? { stopped: result.stopped } : {}),
      ...(result.retired?.length ? { retired: result.retired } : {}) });
  } catch (e) {
    const failure = `style guide failed: ${(e as Error).message}`;
    sink.post({ type: 'style-guide-result', ok: false, headline: '✗ style guide failed', summary: appendBuildNote(failure, PRISM3_BUILD), lines: withBuildLine([failure]) });
  } finally {
    styleGuideStop = false;
  }
};

/**
 * WHAT THE BUILD STYLE GUIDES PAGE SHOWS (S11.2): the file's collections, variables and text styles, the tables an
 * unfiltered run would draw, and whether Set up file has run (`catalogFor`, `isSetUp`). Reads only; posts one
 * `style-guide-catalog`, an empty one with `error` set when the read throws.
 */
const styleGuideCatalog = async (): Promise<void> => {
  try {
    // #3170: whether Set up file has run, from the file's read a page per turn (shared with one already going), never a
    // search of the whole file in one turn.
    const { nodes } = await readPresent();
    const { catalog } = await readCatalog(figma.variables, () => figma.getLocalTextStylesAsync(), { effect: () => figma.getLocalEffectStylesAsync(), paint: () => figma.getLocalPaintStylesAsync(), grid: () => figma.getLocalGridStylesAsync() });
    postToUi({ type: 'style-guide-catalog', catalog: catalogFor(catalog, savedContract().contract, isSetUp(rootOver(nodes) as unknown as Parameters<typeof isSetUp>[0])) });
  } catch (e) {
    postToUi({ type: 'style-guide-catalog', catalog: { setUp: false, collections: [], tables: [], notes: [] }, error: (e as Error)?.message ?? String(e) });
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
      sink.post({ type: 'seed-info', ok: true, present: false, summary: 'No existing Prism3 theme in this file — start from the knobs.', failed: 0 });
      return;
    }
    // The saved brand's declared modes against the file's (#1662 follow-up): resolved here from the persisted
    // `BrandInput`, passed in so `verifyReadback` stays pure. No saved brand → skipped, with the reason stated.
    const v = verifyReadback(snap, declaredModesOf(figma.root));
    const failed = failedChecks(v);
    const summary = seedSummary(v);
    // `present: true` regardless of `ok`: the variables ARE here, and whether the contract verified is
    // a separate fact. Collapsing the two would make a contract failure look like an unthemed file.
    sink.data({ readback: { present: true, ok: v.ok, failed, checks: v.checks, declaredModes: v.declaredModes, plannedModes: v.plannedModes, details: v.details } });
    sink.post({ type: 'seed-info', ok: v.ok, present: true, summary, failed: failed.length });
  } catch (e) {
    // The read itself failed, so presence is UNKNOWN — reported false, since the outcome is an error
    // either way and claiming presence we could not establish would be worse than not claiming it.
    sink.post({ type: 'seed-info', ok: false, present: false, summary: `read-back failed: ${(e as Error).message}`, failed: 0 });
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
    // when absence posts nothing. The outcomes below are total over this read: a brand, a refusal, and, for a file
    // with neither, a library file or nothing (#2879, `fileKindToUi`).
    if (input) postToUi({ type: 'restore-input', input });
    else void fileKindToUi();
  } catch (e) {
    postToUi({ type: 'restore-input-error', message: (e as Error).message });
  }
};

/** The plugin API slice `file-kind.ts` reads: the local collections, the current page (Q613 2 A: that page only), the
 *  variable and collection lookups, and the enabled-library list, which needs the `teamlibrary` permission (Q613 1 A). */
const fileKindApi = (): FileKindApi => ({
  getLocalVariableCollectionsAsync: () => figma.variables.getLocalVariableCollectionsAsync(),
  page: figma.currentPage as unknown as FileKindApi['page'],
  getVariableByIdAsync: (id) => figma.variables.getVariableByIdAsync(id),
  getVariableCollectionByIdAsync: (id) => figma.variables.getVariableCollectionByIdAsync(id),
  // Read inside the call: without the permission, reaching `figma.teamLibrary` throws, and the probe's own catch turns
  // that into "no name" rather than "no decision".
  libraryCollections: () => figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync(),
  now: () => Date.now(),
  after: (ms) => new Promise((done) => setTimeout(done, ms)),
});

/**
 * #2879 (Q485 C): a file with no saved brand. Is it a library file, which opens to the library home, or a new one, which
 * opens to the start window? "Reading this file" first, then the answer (`file-kind.ts`). Only `library` posts the
 * fourth outcome; brand (local Prism3 collections), new and undecided (unconfirmed, failed, or past 1.5 s) all post
 * `restore-input-empty`, exactly what this branch posted before. Never throws: a failed probe reads as undecided.
 */
const fileKindToUi = async (): Promise<void> => {
  postToUi({ type: 'restore-input-reading' });
  const signals = await probeFile(fileKindApi());
  if (outcomeOf(classifyFile(signals)) === 'restore-input-library') postToUi({ type: 'restore-input-library', library: libraryFileOf(signals) });
  else postToUi({ type: 'restore-input-empty' });
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
    // #3138: the style NAMES too (Q4 A), so the count is their length rather than a second count of one list.
    const named = await listFamilyStyleNames(figma);
    if (named.length) postToUi({
      type: 'font-list',
      families: named.map((c) => c.family),
      styles: named.map((c) => c.styles.length),
      styleNames: named.map((c) => c.styles),
    });
  } catch {
    /* no font list — the UI keeps its free-text input (which is the pre-#113 behavior) */
  }
};

/**
 * THE STYLE-GUIDE CLEANUP, CONFIRMED (Q412 A, #2816). The designer confirmed removing these tables from a run's offer;
 * `removeRetiredTables` re-reads the file and removes only a listed table the generator still does not draw. Never
 * reached by a run: a run only lists.
 */
const styleGuideCleanup = async (ids: string[], sink: ActionSink): Promise<void> => {
  try {
    // Pages first, one per turn (#3110): `removeRetiredTables`' own `loadAllPagesAsync` then has nothing left to load.
    await loadPagesYielding();
    const { removed, left } = await removeRetiredTables(figma, savedContract().contract, ids);
    const n = removed.length;
    const summary = n ? `${n} table${n === 1 ? '' : 's'} removed: ${removed.join(', ')}` : 'No table removed';
    sink.post({ type: 'style-guide-cleanup-result', ok: left.length === 0, removed: ids.filter((id) => !left.includes(id)), summary: left.length ? `${summary}. ${left.length} left in place: the generator draws ${left.length === 1 ? 'it' : 'them'} again, or ${left.length === 1 ? 'it is' : 'they are'} gone` : summary });
  } catch (e) {
    sink.post({ type: 'style-guide-cleanup-result', ok: false, removed: [], summary: `Cleanup failed: ${(e as Error).message}` });
  }
};

/**
 * ONE RUN OF A WRITE AT A TIME, PER OPERATION (#1957; `run-guard.ts`). Each writing entry of the table
 * below goes through `guarded`, so the panel's buttons and the agent link meet the same guard. A second
 * write of a running operation is not run: its caller's sink is sent `refused`, and nothing else is.
 * The agent link asks first, through `refuse` below, so a declined command is never bracketed as running.
 */
const guard = createRunGuard();
const refusal = (cmd: WriteCmd, agent: boolean): MainToUi => ({ type: 'refused', code: 'busy', cmd, agent, message: busyMessage(cmd) });
const guarded = <A extends unknown[]>(cmd: WriteCmd, fn: (...a: A) => Promise<void>, confirm?: (...a: A) => boolean) =>
  (...a: A): Promise<void> => {
    if (!writes(cmd, confirm ? confirm(...a) : undefined)) return fn(...a);
    // Every action's sink is its last argument.
    const sink = a[a.length - 1] as ActionSink;
    if (guard.busy(cmd)) { sink.post(refusal(cmd, sink !== uiSink)); return Promise.resolve(); }
    // #3081: a write may add or remove sets, so the live recount reads the file again after it (`presentCache`). It is
    // cleared as the write starts too: the write's verdict posts before the write's promise settles.
    presentCache = null; presentRead = null; presentGen++;
    return guard.run(cmd, () => fn(...a)).finally(() => { presentCache = null; presentRead = null; presentGen++; });
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
export const ACTIONS: AgentActions = {
  applyTheme: guarded('apply-theme', thenRestamp(applyTheme)),
  buildComponents: guarded('build-components', thenRestamp(buildComponents)),
  fileSetup: guarded('file-setup', fileSetup),
  styleGuide: guarded('style-guide', styleGuide),
  prune: guarded('prune', prune, (_input, confirm) => confirm),
  seedFromFile,
  updateComponents: guarded('build-components', updateComponents),
  captureBaseline: guarded('build-components', captureBaseline),
  adoptMembers: guarded('build-components', adoptMembers),
  drawSpecs: guarded('build-components', drawSpecs),
};

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
  // The Activity drawer's agent rows (UI redesign S11): when a command starts, and when it has ended.
  onStart: (id, cmd, apply) => postToUi({ type: 'agent-started', id, cmd, ...(apply ? { apply: true as const } : {}) }),
  onFinish: (id, cmd) => postToUi({ type: 'agent-finished', id, cmd }),
  // #1957: an agent's write of an operation that is already running is declined before it starts.
  refuse: (c) => {
    const held = guardFor(c.cmd);
    if (!held || !writes(held, c.cmd === 'prune' ? c.args.confirm : undefined) || !guard.busy(held)) return null;
    return { message: busyMessage(held), post: refusal(held, true) };
  },
  // The panel's pills show an agent's result as they would a button's. An agent's prune PREVIEW goes as a
  // pill only: opened as the confirm dialog, the owner's Confirm would prune against the panel's knobs,
  // which are not necessarily the input the agent previewed.
  forward: (m) => postToUi(m.type === 'prune-result' && !m.applied ? { ...m, pillOnly: true } : m),
  census: () => componentCensus(figma as unknown as Parameters<typeof componentCensus>[0], ENGINE_VERSION),
  // #3147 Phase 2a: what the read-only node commands read. They only read it (`agent-reads.ts`).
  host: () => figma as unknown as ReadHost,
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
        // #2530: a dev build answers its dev command too; a release build's list has none.
        commands: PRISM3_DEV ? [...AGENT_COMMANDS, 'run-code'] : [...AGENT_COMMANDS],
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
      // UI's listener is attached — rehydrate the knobs, then run the boot read-back (seed summary).
      restoreToUi();
      // The link is off on every launch; the panel's control starts from this.
      postToUi({ type: 'agent-link-state', state: agentLink.state() });
      void sendThemePref();
      void sendActivityHeight();
      if (typeof PRISM3_NETWORK !== 'boolean' || PRISM3_NETWORK) void sendBridgeToken();
      postToUi({ type: 'doc-settings', settings: readDocSettings(figma.root) });
      // #3170: the panel paints first. This turn posts only what one root read answers; the reads below each start in a
      // turn of their own, so the panel has its brand and settings before any of them holds the thread.
      // #2909 Q2909.8 A: what is due, from the ledger, then the background hand-edit pass, so the panel knows both at rest.
      // #3110: the ledger's answer first, with no page loaded, so the panel is ready before the file is read.
      void (async () => {
        await breathe();
        void ACTIONS.seedFromFile(uiSink);
        await breathe();
        void sendFonts();
        await breathe();
        await ledgerSets();
        await timed('file-sets', () => fileSets(undefined, true));
        await timed('hand-edit pass', handEditsPass);
      })();
      return;
    case 'set-theme-pref':
      // The Theme menu's choice, kept per person (the owner's top-bar decision, 2026-10-05).
      if (isThemePref(msg.pref)) void figma.clientStorage.setAsync(THEME_PREF_KEY, msg.pref).catch(() => {/* best-effort */});
      return;
    case 'file-sets-request':
      // #2909: Update file's checklist — which sets the file holds, whether it is set up, and what is due. A read: never
      // guarded.
      void fileSets(msg.input);
      return;
    case 'due-request':
      // #3081 Q810 A: the badge's live recount, against the brand the panel holds. A read: never guarded.
      void fileDue(msg.input, msg.seq);
      return;
    case 'add-queue':
      // #3129 Q833 A: Components' boxes and Update file's Remove, Remove all and Add all. Writes no layer: never guarded.
      void addQueue(Array.isArray(msg.ids) ? msg.ids.filter((x): x is string => typeof x === 'string') : [], msg.on === true);
      return;
    case 'hand-edits-request':
      // #2909 Q2909.8 A: the background pass after load. A read: never guarded; a write starting ends it.
      void handEditsPass();
      return;
    case 'update-check-request':
      // #2909 Q2909.8 A: the full check, scoped to the sets the checklist flags. A read: never guarded.
      void checkSets(msg.defs, msg.input);
      return;
    case 'update-sets':
      // #2909: Update file's in-place update of the sets its checklist ticked, under the check's hash. Guarded, as the
      // agent's confirmed `update-components` is: the same action.
      void ACTIONS.updateComponents(msg.defs, msg.previewHash, { handEdits: msg.handEdits }, msg.input, uiSink);
      return;
    case 'update-stop':
      // #3170 Q3170.4 A: read by the panel's running update at its next set boundary; nothing running, nothing to stop.
      if (guard.busy('build-components')) updateStopAsked = true;
      return;
    case 'draw-specs':
      // #2830 Q2830.3 A: Documentation › Specs, the panel's Draw specs, for the sets on the current page. The agent's
      // `draw-specs` through the same action and guard.
      void ACTIONS.drawSpecs(undefined, 'page', uiSink);
      return;
    case 'doc-settings-save':
      // #2909 (Q2909.23 A): Documentation's settings, kept in the file. A read of nothing else; never guarded.
      try { postToUi({ type: 'doc-settings', settings: writeDocSettings(figma.root, msg.settings) }); }
      catch (e) { postToUi({ type: 'doc-settings', settings: readDocSettings(figma.root), error: `Couldn't save the settings in this file (${(e as Error)?.message ?? String(e)}).` }); }
      return;
    case 'set-activity-height':
      // The Activity drawer's height, kept per person (#2176).
      if (isHeight(msg.px)) void figma.clientStorage.setAsync(ACTIVITY_HEIGHT_KEY, Math.round(msg.px)).catch(() => {/* best-effort */});
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
    case 'open-docs':
      // #2637 Q384 — the bar's Docs. A read of nothing and a write to nothing in the file: never guarded.
      figma.openExternal(DOCS_URL);
      return;
    case 'file-setup':
      // #1554 — scaffold the page skeleton + build the two template assets. Its own action.
      void ACTIONS.fileSetup(uiSink);
      return;
    case 'style-guide':
      // #259 — the color tables, after Apply theme. Its own action.
      void ACTIONS.styleGuide(msg.options ?? {}, uiSink);
      return;
    case 'style-guide-catalog-request':
      // S11.2 — the Build style guides page's tree, titles and Set up file state. A read: never guarded.
      void styleGuideCatalog();
      return;
    case 'style-guide-cleanup':
      // Q412 A — the confirmed cleanup. A write under the style guide's own guard: never while a run is drawing.
      if (guard.busy('style-guide')) { uiSink.post(refusal('style-guide', false)); return; }
      void guard.run('style-guide', () => styleGuideCleanup(Array.isArray(msg.ids) ? msg.ids.filter((x): x is string => typeof x === 'string') : [], uiSink));
      return;
    case 'style-guide-cancel':
      // S11.2 (P7) — read by the running style guide after its current table; nothing running, nothing to stop.
      if (guard.busy('style-guide')) styleGuideStop = true;
      return;
    case 'agent-link':
      // The owner's switch — the only way the link turns on. See `agent-link.ts`.
      agentLink.setOn(msg.on);
      // #2949: the strip's Turn off also restores the full window (and so does any switch-off while minimized).
      if (!msg.on) setMinimized(false);
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
    case 'agent-bridge-paired':
      if ((typeof PRISM3_NETWORK !== 'boolean' || PRISM3_NETWORK) && typeof msg.token === 'string' && msg.token) void figma.clientStorage.setAsync(BRIDGE_TOKEN_KEY, msg.token).catch(() => {/* best-effort: asked again next time */});
      return;
    case 'agent-bridge-unpaired':
      if (typeof PRISM3_NETWORK !== 'boolean' || PRISM3_NETWORK) void Promise.resolve().then(() => figma.clientStorage.deleteAsync(BRIDGE_TOKEN_KEY)).catch(() => {/* best-effort */});
      return;
    case 'resize-ui': {
      // Resize on every drag message so the window tracks the pointer; persist only on the
      // commit (pointer-up), so a drag is one storage write rather than hundreds.
      // #2949: never while the window is the strip, which draws no grip; a late drag message neither leaves the strip
      // nor keeps its size.
      if (beforeStrip) return;
      const size = clampSize(msg.width, msg.height);
      uiSize = size;
      figma.ui.resize(size.width, size.height);
      if (msg.commit) void figma.clientStorage.setAsync(UI_SIZE_KEY, size).catch(() => {/* best-effort */});
      return;
    }
    case 'minimize-ui':
      // #2949: the Minimize tile and the strip's Restore. The window only; the link and its poll are untouched.
      setMinimized(msg.minimized === true);
      return;
    default:
      assertNever(msg); // compile error if a UiToMain variant is added but not handled here
  }
});
