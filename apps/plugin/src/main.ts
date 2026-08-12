/**
 * Prism3 Figma plugin — MAIN-THREAD controller (sandbox side), docs/22.
 *
 * The thin, plugin-only context: it has the Figma document API (`figma.*`) but NO DOM. Since #110
 * the iframe runs the SHARED `apps/studio/src` UI (one UI, no fork); this controller is the write/read
 * adapter below it:
 *   • `apply-theme` (carries the live `BrandInput` from the UI's knobs) → build the colour write
 *     plan + run #108's `applyWritePlan` against `figma.variables`, then report `apply-result` (a
 *     short headline for the UI's status pill + the full per-axis summary behind it).
 *   • `build-components` (no payload — the def is compiled in) → project the Button def into the full
 *     variant set and run #487's `applyComponentPlan` against the canvas, then report `component-result`.
 *     Its own action rather than part of `apply-theme` (#483/#652): a theme apply is cheap and run after
 *     every knob change, where this writes hundreds of nodes.
 *   • on `ui-ready` → run #109's read-back + verify and post `seed-info` (informational: does an
 *     existing Prism3 theme in this file pass the contract).
 *
 * Compiled under `tsconfig.main.json` (plugin-typings, `lib` WITHOUT `dom`), so any accidental
 * `document`/`window` reference is a COMPILE error — the two-context split is enforced by types.
 */
import { applyHeadline, APPLY_FAILED_HEADLINE, componentHeadline } from './apply-summary';
import { onUiMessage, postToUi } from './bridge-main';
import { assertNever } from './messages';
import type { UiToMain } from './messages';
import { applyWritePlan, applyFloatPlan, applyVarCollectionPlan } from './write-figma';
import { applyStylesPlan } from './write-styles';
import { applyTextStylePlan } from './write-text-styles';
import { preloadFonts } from './preload-fonts';
import { applyComponentPlan } from './write-components';
import type { ComponentProgress } from './write-components';
import { chunkLine, summaryLines, settlePoint } from './build-telemetry';
import { readFigmaVariables } from './read-figma';
import { listFamilyStyleCounts } from './list-fonts';
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import { buildWritePlan, buildFloatWritePlan, buildStylesPlan, buildFontVarPlan, buildTextStylePlan } from '@prism3/engine/write-plan';
import { verifyReadback } from '@prism3/engine/read-back';
import { persistInput, restoreInput } from './persist-figma';
import { brandTheme } from '@prism3/engine/theme';
import type { BrandInput } from '@prism3/engine/theme';
import { figmaAnatomySet } from '@prism3/engine/anatomy-figma';
import { button } from '@prism3/engine/components/button';

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
 * the theme changed (#110). Idempotent find-by-name; colour axis (`core-palette` + `color`).
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
    // Colour axis (#108): core-palette + color, per-mode alias-bound.
    const r = await applyWritePlan(buildWritePlan(buildFigmaColor(theme)), figma.variables);
    // FLOAT axes (#146): core-dimension/space/radius/size/border-width/focus/opacity + layout.
    const f = await applyFloatPlan(buildFloatWritePlan(theme), figma.variables);
    // STYLE axes (shadow/gradient lane): Effect Styles (shadow/* + shadow-dark/*) + Paint Styles
    // (gradients, baked stops). The global `figma` structurally satisfies the StylesApi port.
    const s = await applyStylesPlan(buildStylesPlan(theme), figma);
    // TYPOGRAPHY (#237): core-font/type-sets variables first (bound targets must exist), then Text
    // Styles. The Text Style port needs figma's style/font surface + figma.variables' getter.
    const tv = await applyVarCollectionPlan(buildFontVarPlan(theme), figma.variables);
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
    const misses =
      r.misses.length + f.misses.length + tv.misses.length + ts.misses.length + s.misses.length + tv.refused.length;
    // Orphan report (#479): variables in a collection the plan owns that the plan does not contain.
    // The write path is create-or-update-by-name, so it cannot see a rename — the new name is created
    // and the old one is never touched again. Reported, never deleted: this cannot distinguish a stale
    // ghost from a variable a designer is co-authoring, and deleting one they have bound to a layer is
    // unrecoverable from here. Surfaced in the summary rather than a return field alone, because drift
    // nobody reads is drift nobody fixes — the live file had ~106 ghosts across two collections and
    // every prior run reported success.
    const allOrphans = [
      ...r.orphans,
      ...f.collections.map((c) => ({ name: c.name, names: c.orphans })),
      ...tv.collections.map((c) => ({ name: c.name, names: c.orphans })),
    ].filter((o) => o.names.length);
    const orphanCount = allOrphans.reduce((n, o) => n + o.names.length, 0);
    const orphanNote = orphanCount
      ? `, ⚠️ ${orphanCount} orphaned variables not in the plan (${allOrphans.map((o) => `${o.name}: ${o.names.length}`).join(', ')}) — likely renames; nothing was deleted`
      : '';
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
      `styles ${s.effects.total} effects (+${s.effects.created}) / ${s.paints.total} gradients (+${s.paints.created}, ${s.paints.bound} stops bound), ` +
      `type ${pf.loaded} fonts loaded / ${fontVarTotal} font vars (+${fontVarCreated}) / ${ts.total} text styles (+${ts.created}), ` +
      `${r.bound + f.bound + tv.bound + ts.bound} bindings` + (misses ? `, ${misses} misses` : '') +
      orphanNote + resolvedNote + skippedNote + fontNote + refusedNote;
    // Skipped fonts aren't a "failure" (variables still wrote); only true misses flip ok=false. The
    // pill's headline is derived from the COUNTS (see `apply-summary.ts`), never from `summary` — the
    // prose above is edited whenever an axis is added, and re-parsing it would make its wording
    // load-bearing. Only misses and skipped fonts reach the headline; #479's orphan count deliberately
    // does not, because the pill has a 24-char budget and three warning axes will not fit in it. The
    // orphans are still readable — they are in `summary`, which now has somewhere to be shown.
    postToUi({ type: 'apply-result', ok: misses === 0, headline: applyHeadline(misses, ts.skipped.length), summary });
  } catch (e) {
    postToUi({ type: 'apply-result', ok: false, headline: APPLY_FAILED_HEADLINE, summary: `write failed: ${(e as Error).message}` });
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
 * Measure the POST-COMPLETION SETTLE — how long the host stays stalled after the executor has returned
 * (#684). The 1m10s freeze the issue records happened *after* the pill said done, so it is not in any
 * phase total and no amount of chunking removes it: Figma is reconciling a scenegraph that just grew by
 * thousands of nodes.
 *
 * HOW IT MEASURES A HANG WITHOUT A STOPWATCH: schedule a chain of `setTimeout(_, 0)` and record how late
 * each one actually fires. On an idle main thread that is ~1-4ms. Scheduled while the host is stalled, the
 * callback cannot run until the thread is free, so the LAG *is* the stall — sampled from inside, with no
 * clock-watching and no guess about when "done" happened. `settlePoint` finds where the lag returns to
 * idle for `CALM_TICKS` consecutive samples (one quiet tick between two long ones is a gap in the work,
 * not the end of it).
 *
 * Returns `null` if the tail never settles inside the sample budget — reported as NOT MEASURED rather than
 * as a number, because a run that is still stalling when sampling stops has not produced a settle time and
 * printing the budget as one would understate it.
 *
 * The budget: `MAX_TICKS` at ~0ms apiece costs nothing on a responsive file (it finishes in the first few
 * ticks) and caps a pathological one. 400 ticks past a settled file is ~1-2s of idle sampling; against the
 * measured 1m10s freeze it is the calm run that ends it, not the budget.
 */
const MAX_TICKS = 400;
const measureSettle = async (): Promise<number | null> => {
  const t0 = Date.now();
  const lags: number[] = [];
  const stamps: number[] = [];
  for (let i = 0; i < MAX_TICKS; i++) {
    const before = Date.now();
    await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
    const now = Date.now();
    lags.push(now - before);
    stamps.push(now - t0);
    // Stop as soon as it HAS settled rather than always sampling the full budget — `settlePoint` returns
    // the index that begins the calm run, so re-checking each tick costs a scan of a short array and saves
    // hundreds of pointless ticks on a healthy build.
    const at = settlePoint(lags);
    if (at >= 0) return stamps[at];
  }
  return null;
};

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
 * BUTTON BY NAME, not a catalogue loop, because `anatomy` is what makes a def materialisable and Button
 * is the only def in the catalogue that has one. A loop over five defs would throw on four of them.
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
const buildComponents = async (): Promise<void> => {
  try {
    const plans = figmaAnatomySet(button, { swapTarget: SWAP_TARGET });
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
    // The settle probe (#684). Started AFTER the executor returns, which is the exact moment the pill says
    // done and the file was previously frozen for 1m10s. Awaited before the summary so the summary can
    // carry the number; the result message is posted after, so the pill's verdict and the console's
    // settle figure describe the same run.
    const settleMs = await measureSettle();
    // Cap the miss list rather than the count: `summary` is read in a chrome row that wraps, but a
    // starved file can produce one miss per binding per member and the whole list is not a summary.
    const missNote = r.misses.length
      ? `, ⚠️ ${r.misses.length} misses (${r.misses.slice(0, 3).join('; ')}${r.misses.length > 3 ? '; …' : ''})`
      : '';
    const summary = r.set === null
      ? `nothing assembled — no set on this page and no member built${missNote}`
      : `set '${r.set}': ${r.variants} variants (+${r.added} built, ${r.skipped} already present), ` +
        `grid ${r.grid[0]}×${r.grid[1]}, ${Math.round(r.size[0])}×${Math.round(r.size[1])}px, ` +
        `axes ${r.axes.join('/') || '—'}, properties ${r.properties.join('/') || '—'}, ` +
        `${r.refs} refs across ${r.wiredMembers} members${missNote}`;
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
    // `ok` is NOT `misses.length === 0`, and the difference is the whole reason `skipped` is a number:
    // a re-run skips every member by name and reports each as a miss, so a miss-count test would call
    // the idempotent case a failure. The headline is derived from the three COUNTS for the same reason
    // the theme write's is — never by re-reading the prose above.
    // The telemetry block, printed LAST so it is the bottom of the console and can be copied in one
    // selection. It is the deliverable of the calibration run: `CHUNK` is set from these numbers.
    for (const line of summaryLines(reports, settleMs)) console.log(line);
    postToUi({
      type: 'component-result',
      ok: r.set !== null && r.misses.length === r.skipped,
      headline: componentHeadline(r.added, r.skipped, r.misses.length - r.skipped),
      summary,
    });
  } catch (e) {
    // `planSetLayout` throws on a set that could not be assembled coherently — before anything reaches
    // the file. That is a def-tier or scope-tier error, and its message names the cause.
    postToUi({ type: 'component-result', ok: false, headline: APPLY_FAILED_HEADLINE, summary: `component build failed: ${(e as Error).message}` });
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
      postToUi({ type: 'seed-info', ok: true, summary: 'No existing Prism3 theme in this file — start from the knobs.' });
      return;
    }
    const v = verifyReadback(snap);
    const failed = Object.entries(v.checks).filter(([, ok]) => !ok).map(([k]) => k);
    const summary =
      `Existing theme: ${v.details.colorVars} colour vars, modes ${v.details.modes.join('/') || '—'}` +
      (v.ok ? ' — contract holds ✓' : ` — FAILED: ${failed.join(', ')}`);
    postToUi({ type: 'seed-info', ok: v.ok, summary });
  } catch (e) {
    postToUi({ type: 'seed-info', ok: false, summary: `read-back failed: ${(e as Error).message}` });
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
      void buildComponents();
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
