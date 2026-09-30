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
 *   4. check the stylesheet arrived as text, and install it (the class-scope law runs here);
 *   5. mount the plugin's resize grip (Figma only);
 *   6. `build()` — the first render. Everything above must precede it.
 * The font probe's canvas used to be made at import too; it is now made on first use, in `main.ts`.
 */
import { brandTheme } from '@prism3/engine/theme';
import type { BrandInput } from '@prism3/engine/theme';
import type { Origin } from './provenance';
import { persistInput, restoreInput } from './persist-local';
import { BRANDS, BOOT_BRAND, initSession, setPersist } from './state/store';
import { commit, handleHostMessage, mountApp, installStyles, mountResizeGrip, build } from './main';
// The chrome stylesheet, as TEXT rather than as a separate emitted asset (#769) — see step 4 below for
// what that buys and what it costs.
import STYLE from './styles.css';

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
const bootBrand = (): { input: BrandInput; origin: Origin } => {
  if (PRISM3_HOST !== 'figma') {
    const restored = restoreInput(localStorage);
    // Validate the SHAPE (brandTheme must accept it) before booting on it — a stale blob from an older
    // build could deserialize past the version guard yet fail to resolve; on reject, fall back to the demo.
    if (restored) {
      // The persisted web brand is the state as the user last left it — its own origin, not an
      // example. Which example it once descended from is not recoverable and not what reset means.
      try { brandTheme(restored); return { input: restored, origin: { kind: 'file' } }; }
      catch { /* stale/incompatible — fall through */ }
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
installStyles(STYLE);

// ---- 5. the resize grip ------------------------------------------------------------------------------
if (PRISM3_HOST === 'figma') mountResizeGrip();

// ---- 6. first render ---------------------------------------------------------------------------------
build();
