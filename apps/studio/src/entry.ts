/**
 * The studio's entry — the ONE module that does anything while it loads (#896).
 *
 * `main.ts` and `state/store.ts` only define things; this file runs them, in the order the app needs,
 * against the real DOM and the real host. Both bundles start here: the web build names it directly,
 * and the plugin's `src/ui/entry.ts` imports it before mounting its own agent-link chip.
 *
 * THE ORDER IS THE ORDER `main.ts` USED TO RUN AT IMPORT, and each step says why it cannot move:
 *   1. boot: pick the brand and its origin (web reads `localStorage`), then start the session;
 *   2. subscribe to the host — on Figma this attaches the listener and posts `ui-ready`, so it must
 *      follow step 1 (a `restore-input` reply replaces the session step 1 started);
 *   3. hand over `#app`;
 *   4. check the stylesheet arrived as text, and install it with the shell's (the class-scope law runs here);
 *   5. mount the plugin's resize grip (Figma only);
 *   6. `build()` — the first render. Everything above must precede it.
 *   7. on web, if step 1 refused the saved brand, the notice offering to export or clear it (#1989).
 *   8. on web, only when the page is opened with `?p3-test-hooks`, the smoke suite's edit hook (#388).
 * The font probe's canvas used to be made at import too; it is now made on first use, in `main.ts`.
 */
import { brandTheme } from '@prism3/engine/theme';
import type { BrandInput } from '@prism3/engine/theme';
import { resolvePreview } from '@prism3/engine/resolve-preview';
import { toDesignMd } from '@prism3/engine/design-md';
import type { Origin } from './provenance';
import { clearInput, persistInput, restoreInput, type LocalStore } from './persist-local';
import { hook } from './shell/dom';
import { initTheme } from './shell/theme';
import { BRANDS, BOOT_BRAND, brandState, initSession, rebuild, setPersist, setPath, subscribe } from './state/store';
import { commit, handleHostMessage, mountApp, installStyles, mountResizeGrip, build } from './main';
// The chrome stylesheet, as TEXT rather than as a separate emitted asset (#769) — see step 4 below for
// what that buys and what it costs.
import STYLE from './styles.css';
// The new shell's stylesheet: the generated `--p3-*` variables, the embedded chrome fonts and
// `chrome.css`, as TEXT. A virtual module that only `apps/studio/chrome/esbuild-plugin.mjs` resolves, so
// a bundler without the plugin fails at build time rather than shipping without it (UI redesign S1.1).
import CHROME from 'p3:chrome-css';

// ---- 1. boot -----------------------------------------------------------------------------------------
// Web persists the working brand to localStorage; the plugin uses Figma shared-data instead (restored
// via the host `restore-input` message, step 2). `PRISM3_HOST` is a build-time define (`'figma'` in the
// plugin), so this guard is `'figma' !== 'figma'` → the localStorage path is INERT in the plugin —
// never executed — exactly as the web export-bar commit path is inert in the plugin bundle. On web
// boot, reopen on the persisted brand if one is stored AND still resolves; otherwise it's a first run —
// `firstRun` gates the start screen, and brandState still holds the demo so the app is in a valid
// state behind it. (The plugin never boots into a first run: it seeds via the host, which answers
// `restore-input-empty` when the file holds no brand, #1197.)
//
// #722: boot also decides the ORIGIN, and `firstRun` is derived from it rather than tracked beside it.
//
// #1989: the stored brand is validated by RESOLVING it, the same two calls `initSession` makes. Checking
// only `brandTheme` let through a brand the engine refuses later, in `resolvePreview` (a ground override,
// refused since #956, four more roles since #1972): `initSession` threw with nothing to catch it, `#app`
// stayed empty, and the brand stayed stored, so every reload was blank. A refusal now boots the empty
// state and keeps what was refused, so `showRefusedBrand` below can offer to export or clear it.
type RefusedBrand = { input: BrandInput; message: string };
let refusedBrand: RefusedBrand | null = null;
const bootBrand = (): { input: BrandInput; origin: Origin } => {
  if (PRISM3_HOST !== 'figma') {
    const restored = restoreInput(localStorage);
    if (restored) {
      // The persisted web brand is the state as the user last left it — its own origin, not an
      // example. Which example it once descended from is not recoverable and not what reset means.
      try { resolvePreview(brandTheme(restored)); return { input: restored, origin: { kind: 'file' } }; }
      catch (e) { refusedBrand = { input: restored, message: (e as Error).message }; }
    }
    // Web, nothing valid stored → the EMPTY STATE. brandState still holds the demo so the app is in a
    // valid state behind the start screen, but the origin is `none`: nothing has been chosen yet, so
    // there is nothing to be dirty against and nothing an import could lose.
    return { input: structuredClone(BRANDS[BOOT_BRAND]), origin: { kind: 'none' } };
  }
  // Plugin: boot on the demo and wait for the host. `restore-input` (#131) may replace this within
  // milliseconds with the file's own brand — until it arrives, `example` is the honest answer, and a
  // file with no stored blob correctly keeps it (that is #721's state 2).
  return { input: structuredClone(BRANDS[BOOT_BRAND]), origin: { kind: 'example', id: BOOT_BRAND } };
};
const boot = bootBrand();
initSession(boot.input, boot.origin);
// Every successful rebuild persists the last-good brand — on web only. The plugin injects nothing: its
// brand is written to the file by the main thread on Apply. Statically dead in the plugin bundle.
if (PRISM3_HOST !== 'figma') setPersist((input) => persistInput(localStorage, input));

// ---- 2. host ---------------------------------------------------------------------------------------
commit.onHostMessage(handleHostMessage);

// ---- 3. the root -------------------------------------------------------------------------------------
mountApp(document.getElementById('app')!);

// ---- 4. the stylesheet -------------------------------------------------------------------------------
// `styles.css` is pulled in as TEXT by esbuild rather than emitted as a separate asset, so this bundle
// stays the single self-contained file both hosts need. See that file's header for the loader
// requirement and for the gate that reads it by path.
//
// FAIL LOUD, not blank. An esbuild entry that bundles this file without `--loader:.css=text` gets
// esbuild's DEFAULT `.css` loader, under which `STYLE` resolves to `{}` and every rule silently
// vanishes — a fully rendered, completely unstyled app. Entries built with no output path error out
// on their own ("Cannot import ... without an output path configured"); entries with an outdir do
// not, so this asserts it at boot instead of shipping a chrome-less page.
if (typeof STYLE !== 'string' || STYLE.length < 1000) {
  throw new Error(
    'apps/studio: styles.css did not arrive as text. The esbuild entry that produced this bundle is ' +
      'missing `--loader:.css=text` (or `loader: { ".css": "text" }`), so the stylesheet is absent.',
  );
}
// Both sheets in one call, the shell's last, so the class-scope law reads them as one stylesheet.
installStyles(`${STYLE}\n${CHROME}`);

// ---- 4b. the chrome theme (UI redesign S1.2) -------------------------------------------------------------
// The studio's light / dark / system choice, read before the first render so the frame never paints in
// the wrong theme. Web only: the plugin's own entry maps Figma's theme instead, and offers no choice.
// Reading `localStorage` can itself throw when site data is blocked; the theme then follows the device.
if (PRISM3_HOST !== 'figma') {
  let store: LocalStore | null = null;
  try { store = localStorage; } catch { /* blocked: follow the device */ }
  initTheme(store);
}

// ---- 5. the resize grip ------------------------------------------------------------------------------
if (PRISM3_HOST === 'figma') mountResizeGrip();

// ---- 6. first render ---------------------------------------------------------------------------------
build();

// ---- 7. a saved brand the engine refused (#1989) -----------------------------------------------------
// Web only (`refusedBrand` is never set in the plugin). Mounted on `body`, ahead of `#app`, for the reason
// the resize grip is: `#app` is re-rendered wholesale on every state change, and this has to outlive that.
// It wears the existing error card and button classes, pinned light like the legacy surfaces, because this
// fix adds no stylesheet rules. (The frame's error line moved to the chrome's error strip in UI redesign S13.1.)
//
// The refused brand is still in storage, and stays there until the next successful rebuild persists over
// it, which is the first brand chosen. So the notice says that, and offers the two things worth doing
// before then: export it (as design.md, the format Import reads back, override and all) or clear it.
// Read through a cast: assigned inside `bootBrand`, so TypeScript's flow analysis narrows the `let` to `null` here.
const refused = refusedBrand as RefusedBrand | null;
if (refused) {
  const card = hook(document.createElement('div'), 'refused-brand');
  card.className = 'errbar';
  card.dataset.theme = 'light';
  card.setAttribute('role', 'alert');
  const line = (text: string): HTMLParagraphElement => { const p = document.createElement('p'); p.textContent = text; return p; };
  const btn = (text: string, role: string, run: () => void): HTMLButtonElement => {
    const b = hook(document.createElement('button'), role);
    b.type = 'button'; b.className = 'barbtn'; b.textContent = text; b.onclick = run;
    return b;
  };
  const exportIt = (): void => {
    const name = `${String(refused.input.id || 'saved-brand').trim().replace(/\s+/g, '-') || 'saved-brand'}.design.md`;
    const url = URL.createObjectURL(new Blob([toDesignMd(refused.input)], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  // Unsubscribed with the card, so a second load does not reach a notice that is already gone.
  let offOrigin: (() => void) | null = null;
  const dismiss = (): void => { card.remove(); offOrigin?.(); offOrigin = null; };
  const clearIt = (): void => { clearInput(localStorage); dismiss(); };
  card.append(
    line("The saved brand didn't open, so the studio started without it."),
    line(refused.message),
    line('Choosing a brand replaces the saved one. Export it first to keep a copy as design.md.'),
    btn('Export saved brand', 'refused-brand-export', exportIt),
    btn('Clear saved brand', 'refused-brand-clear', clearIt),
  );
  document.body.insertBefore(card, document.getElementById('app'));
  // GONE THE MOMENT A BRAND LOADS (review of #1997). Left mounted, the card outlived the choice: it sat under
  // the frame, first in tab order, and its Clear would have deleted the brand just chosen, whose rebuild
  // had already persisted over the refused one. Every load assigns a new provenance (`loadInput`), which
  // invalidates `origin`, so this hears each one whichever control made it.
  offOrigin = subscribe('origin', dismiss);
}

// ---- 8. the smoke suite's edit hook (#388) -------------------------------------------------------------
// Web only, and only when the page is opened with `?p3-test-hooks`. `test-smoke.mjs` §2d checks that an edit the
// engine refuses shows the error bar on a page other than Color. Every Type control now refuses up front what the
// engine would refuse (#2044, #2054, #2055), so no control is left to make that edit. This writes one path into the
// brand and rebuilds, the same two steps a control's edit takes, so the refusal and the bar that shows it are the
// real ones. Without the parameter nothing is defined.
if (PRISM3_HOST !== 'figma' && new URLSearchParams(location.search).has('p3-test-hooks')) {
  (window as unknown as { __prism3TestEdit: (path: string, value: unknown) => void }).__prism3TestEdit = (path, value) => {
    setPath(brandState, path, value);
    rebuild();
  };
}
