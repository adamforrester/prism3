/**
 * Prism3 Figma plugin — MAIN-THREAD controller (sandbox side), docs/22.
 *
 * The thin, plugin-only context: it has the Figma document API (`figma.*`) but NO DOM. Since #110
 * the iframe runs the SHARED `web/src` UI (one UI, no fork); this controller is the write/read
 * adapter below it:
 *   • `apply-theme` (carries the live `BrandInput` from the UI's knobs) → build the colour write
 *     plan + run #108's `applyWritePlan` against `figma.variables`.
 *   • on `ui-ready` → run #109's read-back + verify and post `seed-info` (informational: does an
 *     existing Prism3 theme in this file pass the contract).
 *
 * Compiled under `tsconfig.main.json` (plugin-typings, `lib` WITHOUT `dom`), so any accidental
 * `document`/`window` reference is a COMPILE error — the two-context split is enforced by types.
 */
import { onUiMessage, postToUi } from './bridge-main';
import { assertNever } from './messages';
import type { UiToMain } from './messages';
import { applyWritePlan, applyFloatPlan, applyVarCollectionPlan } from './write-figma';
import { applyStylesPlan } from './write-styles';
import { applyTextStylePlan } from './write-text-styles';
import { readFigmaVariables } from './read-figma';
import { listFamilies } from './list-fonts';
import { buildFigmaColor } from '../../Prism3/engine/emit-figma-color';
import { buildWritePlan, buildFloatWritePlan, buildStylesPlan, buildFontVarPlan, buildTextStylePlan } from '../../Prism3/engine/write-plan';
import { verifyReadback } from '../../Prism3/engine/read-back';
import { persistInput, restoreInput } from './persist-figma';
import { brandTheme } from '../../Prism3/engine/theme';
import type { BrandInput } from '../../Prism3/engine/theme';

// Show the UI iframe. `__html__` is the bundled shared-UI HTML Figma injects from `manifest.ui`
// (the inlined `web/src` app; declared for the sandbox global in `figma-env.d.ts`). The shared
// `web/src` UI is laid out desktop-first: `#app` caps content at 1200px with 40px gutters, so the
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
    };
    const ts = await applyTextStylePlan(buildTextStylePlan(theme), textApi);
    // Persist the exact knobs alongside the variables (#131) — so re-opening this file rehydrates
    // the UI to THIS brand, not the default. Only after a real materialisation (inside the try).
    persistInput(figma.root, input);
    const floatCreated = f.collections.reduce((n, c) => n + c.created, 0);
    const fontVarCreated = tv.collections.reduce((n, c) => n + c.created, 0);
    const fontVarTotal = tv.collections.reduce((n, c) => n + c.total, 0);
    const misses = r.misses.length + f.misses.length + tv.misses.length + ts.misses.length;
    const skippedNote = ts.skipped.length
      ? `, ⚠️ ${ts.skipped.length} text styles skipped (font unavailable: ${ts.skipped.slice(0, 3).map((x) => x.name).join(', ')}${ts.skipped.length > 3 ? '…' : ''})`
      : '';
    const summary =
      `palette ${r.paletteTotal} (+${r.paletteCreated}), color ${r.colorTotal} (+${r.colorCreated}), ` +
      `dims/layout ${f.collections.length} collections (+${floatCreated}), ` +
      `styles ${s.effects.total} effects (+${s.effects.created}) / ${s.paints.total} gradients (+${s.paints.created}), ` +
      `type ${fontVarTotal} font vars (+${fontVarCreated}) / ${ts.total} text styles (+${ts.created}), ` +
      `${r.bound + f.bound + tv.bound + ts.bound} bindings` + (misses ? `, ${misses} misses` : '') + skippedNote;
    // Skipped fonts aren't a "failure" (variables still wrote); only true misses flip ok=false.
    postToUi({ type: 'apply-result', ok: misses === 0, summary });
  } catch (e) {
    postToUi({ type: 'apply-result', ok: false, summary: `write failed: ${(e as Error).message}` });
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
 * if a trusted blob exists, hand it to the UI so it opens on the persisted brand. Absence / drift /
 * corruption → `null` → nothing posted → the UI keeps its defaults (same as an unthemed file).
 * Independent of `seedFromFile` — the read-back verdict and the knob restore don't gate each other.
 */
const restoreToUi = (): void => {
  const input = restoreInput(figma.root);
  if (input) postToUi({ type: 'restore-input', input });
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
    const families = await listFamilies(figma);
    if (families.length) postToUi({ type: 'font-list', families });
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
