/**
 * The write-adapter seam (docs/22, GH #106).
 *
 * The single-UI goal — one UI for the web playground AND the Figma plugin iframe —
 * hinges on a swappable WRITE surface. The UI computes a resolved token model
 * (`ResolvedPreview`, straight off the pure engine) and hands it to ONE `apply(model)`
 * interface, implemented per host:
 *   • web    → CSS custom properties (this file's `cssVarAdapter`)
 *   • plugin → `figma.variables` (the `figmaVarAdapter` stub, wired in the plugin phase)
 *
 * The UI never writes resolved token VALUES itself; it only references them by their
 * stable custom-property NAMES (`cssVar` / `typeVar`) and lets the active host fill
 * them in. Swap the host (see `makeWriteHost`) and the same UI drives a different
 * backend — no UI change. This is the seam that lets `apps/studio/src` be reused verbatim
 * inside the plugin.
 *
 * PURE-adjacent: imports only the engine's TYPES + DOM. No `node:*`.
 */
import type { ResolvedPreview } from '../../../Prism3/engine/resolve-preview';

type Mode = ResolvedPreview['modes'][number];

/** Deterministic CSS custom-property name for a resolved binding ref. Shared by the
 *  adapter (which SETS it) and the UI (which REFERENCES it via `var()`), so the two
 *  can never drift. The category prefix (`color.` / `radius.` / `space.` / `type.`)
 *  survives sanitisation, so refs across categories can't collide. */
export const cssVarName = (ref: string): string => '--' + ref.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
/** `var(--…)` reference for a colour or dimension binding — what the UI assigns. */
export const cssVar = (ref: string): string => `var(${cssVarName(ref)})`;

/** A typography composite resolves to three atoms; each gets its own property. */
export type TypeAtom = 'family' | 'weight' | 'size';
const typeAtomName = (ref: string, atom: TypeAtom): string => `${cssVarName(ref)}-${atom}`;
export const typeVar = (ref: string, atom: TypeAtom): string => `var(${typeAtomName(ref, atom)})`;

/** The one interface every host implements. `mode` selects which resolved slice of the
 *  (per-mode) model to project — the web preview shows one mode at a time. */
export interface WriteAdapter {
  apply(model: ResolvedPreview, mode: Mode): void;
}

/**
 * Web host — writes the resolved model as CSS custom properties on a scope element.
 * The preview chips (descendants of that scope) inherit the properties, so they read
 * `var(--…)` and never touch the resolved hex/px themselves.
 */
export const cssVarAdapter = (scope: HTMLElement): WriteAdapter => ({
  apply(model, mode) {
    const s = scope.style;
    // Colours — the per-mode slice. Sparse: a narrowed-modes theme only carries the
    // modes it generates, so a ref absent for this mode is simply left unset (the UI's
    // `var(--…, fallback)` handles the gap, mirroring the old presence guards).
    for (const [ref, byMode] of Object.entries(model.colors)) {
      const hex = byMode[mode];
      if (hex) s.setProperty(cssVarName(ref), hex);
    }
    // Dimensions — the effective value for this mode (wireframe zeroes radius, etc.), in px.
    for (const [ref, px] of Object.entries(model.dims)) {
      const eff = model.dimOverrides[ref]?.[mode] ?? px;
      s.setProperty(cssVarName(ref), `${eff}px`);
    }
    // Typography — mode-invariant; three atoms per composite.
    for (const [ref, t] of Object.entries(model.type)) {
      s.setProperty(typeAtomName(ref, 'family'), t.fontFamilyStack);
      s.setProperty(typeAtomName(ref, 'weight'), String(t.fontWeight));
      s.setProperty(typeAtomName(ref, 'size'), `${t.fontSizePx}px`);
    }
    // Shadows — the per-mode CSS box-shadow (dark = reduced). Sparse like colours: a
    // mode without a resolved shadow is left unset (the UI's `var(--…, fallback)` covers it).
    for (const [ref, byMode] of Object.entries(model.shadows)) {
      const css = byMode[mode];
      if (css) s.setProperty(cssVarName(ref), css);
    }
  },
});

/**
 * The live PREVIEW seam is host-invariant: BOTH hosts paint the preview via CSS custom
 * properties, because the plugin iframe is a full DOM context too — the same chips render
 * identically in the browser and the iframe. So `makeWriteHost` returns `cssVarAdapter` for
 * every host; the plugin does NOT paint the preview into `figma.variables`.
 *
 * What differs per host is the COMMIT action (docs/22 #110) — "materialise this theme":
 *   • web    → download design.md / tokens.json (the UI's existing export bar)
 *   • figma  → post the live `BrandInput` to the plugin main thread, which runs #108's
 *              `applyWritePlan` against `figma.variables`.
 * That's the `HostCommit` seam below, selected at BUILD time by `PRISM3_HOST` (esbuild
 * `--define`), so the shared UI bundle never carries the other host's code.
 */
export const makeWriteHost = (scope: HTMLElement): WriteAdapter => cssVarAdapter(scope);

/** The commit seam: the per-host "apply this theme" action, distinct from the preview.
 *  `web` implementations are the UI's own exporters; `figma` posts to the main thread. */
export interface HostCommit {
  /** True only in the Figma plugin — the UI shows an "Apply to Figma variables" action + the
   *  read-back seed panel. `false` on web (the export bar is the commit path there). */
  readonly isFigma: boolean;
  /** Post the current brand to the host for materialisation (Figma only; no-op on web). The
   *  payload is the `BrandInput` — the main thread rebuilds the write plan + runs the executor,
   *  reusing #108 verbatim. Typed loosely (`unknown`) here to avoid a web→engine type import in
   *  the DOM layer; the plugin bridge + main thread carry the real `BrandInput` type. */
  postTheme(input: unknown): void;
  /** Ask the host to materialise the Button component set onto the canvas (#483; Figma only, no-op on
   *  web, which has no canvas to build onto).
   *
   *  NO ARGUMENT, unlike `postTheme`. The theme is what the UI's knobs describe, so it has to travel;
   *  the component set is described by the DEF, which is compiled into the plugin's own bundle — the
   *  main thread reads it directly and there is nothing for this layer to send. Scope (which variants
   *  get built) is likewise the main thread's: `applyComponentPlan` takes a plan list, so scoping is
   *  entirely which plans it passes, and an argument here would put a curation taxonomy on the wire
   *  before anyone has chosen one. */
  postComponents(): void;
  /** Register a callback for host→UI notifications: the result of an `apply-theme` write, the #109
   *  read-back seed summary, the #131 knob-rehydration (the persisted `BrandInput`, typed `unknown`
   *  here to keep this DOM layer free of the engine type import) or its #480 loud refusal when the
   *  stored blob can't be trusted, and the available font families (the #113 Figma arm — a plain
   *  `string[]`, so it needs no such care).
   *
   *  `apply-result` and `seed-info` are SEPARATE kinds, and the distinction is the point. They carry
   *  the same field shape, which is why this adapter used to collapse them into one — but they answer
   *  different questions: `seed-info` is a boot fact ("what was already in this file"), `apply-result`
   *  is the outcome of an action the designer just took. Merged, an apply overwrote the boot summary
   *  with no way to tell which one the UI was showing, and the write's own result had no state of its
   *  own to be pending in. One kind per fact; the UI keeps a slot per kind.
   *
   *  `component-result` (#483) is a third kind of the same shape for the same reason: the theme write and
   *  the component build are separate actions with separate buttons, so each needs a verdict slot of its
   *  own — one cannot overwrite the other's. */
  onHostMessage(
    cb: (
      msg:
        | { kind: 'apply-result'; ok: boolean; headline: string; summary: string }
        | { kind: 'component-result'; ok: boolean; headline: string; summary: string }
        | { kind: 'seed-info'; ok: boolean; summary: string }
        | { kind: 'restore-input'; input: unknown }
        | { kind: 'restore-input-error'; message: string }
        | { kind: 'font-list'; families: string[]; styles: number[] },
    ) => void,
  ): void;
  /** Ask the host to resize its window to these outer dimensions (#144; Figma only, no-op on web,
   *  where the browser owns the window). Called continuously while the grip is dragged; `commit`
   *  is true on pointer-up, the host's cue to persist. The host clamps — this layer does not know
   *  the minimum usable size. */
  requestResize(width: number, height: number, commit: boolean): void;
}

/** The wire shape the iframe posts to the main thread. Kept in sync with the plugin's
 *  `messages.ts` `UiToMain` (`apply-theme`) — the bridge unwraps `{ pluginMessage }`. */
type UiApplyMsg = { type: 'apply-theme'; input: unknown };
/** Kept in sync with `messages.ts` `UiToMain` (`build-components`) — payloadless by design, see
 *  `postComponents` above. */
type UiComponentsMsg = { type: 'build-components' };
/** Kept in sync with `messages.ts` `UiToMain` (`resize-ui`). */
type UiResizeMsg = { type: 'resize-ui'; width: number; height: number; commit: boolean };

/** Figma commit — the DOM-only bridge half (no `figma.*`; lives in the iframe). Posts to the
 *  main thread via `parent.postMessage` and listens for the main thread's replies. */
const figmaCommit = (): HostCommit => ({
  isFigma: true,
  postTheme(input) {
    parent.postMessage({ pluginMessage: { type: 'apply-theme', input } as UiApplyMsg }, '*');
  },
  postComponents() {
    parent.postMessage({ pluginMessage: { type: 'build-components' } as UiComponentsMsg }, '*');
  },
  onHostMessage(cb) {
    window.addEventListener('message', (e: MessageEvent) => {
      const m = (e.data && e.data.pluginMessage) as
        | { type?: string; ok?: boolean; headline?: string; summary?: string; input?: unknown; message?: string; families?: unknown; styles?: unknown }
        | undefined;
      if (!m) return;
      if (m.type === 'apply-result') {
        // `headline` falls back to the ok flag, not to the summary: a host build older than this one
        // sends no headline, and letting the ~150-char summary land in the pill would restore exactly
        // the truncation this field exists to remove.
        const headline = typeof m.headline === 'string' && m.headline ? m.headline : m.ok ? '✓ applied' : '✗ apply failed';
        cb({ kind: 'apply-result', ok: !!m.ok, headline, summary: String(m.summary ?? '') });
      } else if (m.type === 'component-result') {
        // Same headline fallback, same reason (see above). The default says "built" without a count,
        // because an older host that sends no headline sends no counts to put in one either.
        const headline = typeof m.headline === 'string' && m.headline ? m.headline : m.ok ? '✓ built' : '✗ build failed';
        cb({ kind: 'component-result', ok: !!m.ok, headline, summary: String(m.summary ?? '') });
      } else if (m.type === 'seed-info') {
        cb({ kind: 'seed-info', ok: !!m.ok, summary: String(m.summary ?? '') });
      } else if (m.type === 'restore-input' && m.input) {
        cb({ kind: 'restore-input', input: m.input });
      } else if (m.type === 'restore-input-error') {
        cb({ kind: 'restore-input-error', message: String(m.message ?? 'saved brand data could not be restored') });
      } else if (m.type === 'font-list' && Array.isArray(m.families)) {
        // Filter to strings at the boundary: this arrives over postMessage, so the shape is asserted
        // rather than guaranteed, and a non-string would reach `textContent` downstream.
        //
        // `styles` is index-parallel to `families`, so the two must be filtered TOGETHER — filtering
        // names first and mapping counts afterwards would shift every count by the number of dropped
        // names and mis-report every family after the first bad one. Zip, then drop pairs.
        const rawStyles = Array.isArray(m.styles) ? (m.styles as unknown[]) : null;
        const families: string[] = [];
        const styles: number[] = [];
        (m.families as unknown[]).forEach((f, i) => {
          if (typeof f !== 'string') return;
          families.push(f);
          // A missing/!finite count reads as 0 = "unknown", which the UI renders as a bare tick rather
          // than inventing a number. Older hosts send no `styles` at all, which lands here too.
          const n = rawStyles ? rawStyles[i] : undefined;
          styles.push(typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
        });
        cb({ kind: 'font-list', families, styles });
      }
    });
    // Listener attached — signal the main thread it can post (and run the boot read-back, #109).
    parent.postMessage({ pluginMessage: { type: 'ui-ready' } }, '*');
  },
  requestResize(width, height, commit) {
    parent.postMessage({ pluginMessage: { type: 'resize-ui', width, height, commit } as UiResizeMsg }, '*');
  },
});

/** Web commit — the export bar IS the commit path, so this is inert (the UI wires its own
 *  download handlers). Present for signature parity so the UI can branch on `isFigma`. */
const webCommit = (): HostCommit => ({
  isFigma: false,
  postTheme() {/* web commits via the export bar (download design.md / tokens.json) */},
  postComponents() {/* no canvas on web — the component tier is a Figma-only write */},
  onHostMessage() {/* no host messages on web */},
  requestResize() {/* the browser window is the user's to size on web */},
});

/** The single BUILD-TIME swap point. `PRISM3_HOST` is substituted by esbuild `--define`
 *  (`'web'` for the static site, `'figma'` for the plugin bundle); the unused branch is
 *  dead-code-eliminated, so neither bundle ships the other host's code. */
export const hostCommit = (): HostCommit => (PRISM3_HOST === 'figma' ? figmaCommit() : webCommit());
