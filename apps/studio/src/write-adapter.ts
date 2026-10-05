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
 * PURE-adjacent: imports only TYPES (the engine's, and the plugin's wire contract) + DOM. No `node:*`.
 */
import type { ResolvedPreview } from '@prism3/engine/resolve-preview';
import type { UiToMain, MainToUi, OfType, StyleGuideOptions } from '../../plugin/src/messages';

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
    // Typography — mode-invariant; three atoms per composite. A binding the brand does not emit is
    // absent from `model.type` and named in `model.unresolvedType` (#1720). Its atoms are REMOVED, not
    // just skipped: an earlier apply may have set them for a brand that did emit the style, and a
    // property left on the scope would keep painting that brand's value.
    for (const [ref, t] of Object.entries(model.type)) {
      if (!t) continue;
      s.setProperty(typeAtomName(ref, 'family'), t.fontFamilyStack);
      s.setProperty(typeAtomName(ref, 'weight'), String(t.fontWeight));
      s.setProperty(typeAtomName(ref, 'size'), `${t.fontSizePx}px`);
    }
    for (const ref of model.unresolvedType) {
      for (const atom of ['family', 'weight', 'size'] as const) s.removeProperty(typeAtomName(ref, atom));
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

/** A host→UI notification after the adapter has validated it at the boundary. Not a wire type: the
 *  wire carries `messages.ts` `MainToUi` (tagged `type`); the adapter checks each field and hands the UI
 *  this `kind`-tagged shape, with defaults filled in (`headline`, `styles`). See `onHostMessage`. */
export type HostMessage =
  | { kind: 'apply-result'; ok: boolean; headline: string; summary: string }
  | { kind: 'component-result'; ok: boolean; headline: string; summary: string; completed: boolean }
  // #1558 — the outcome of a `file-setup` scaffold. A FOURTH kind of the `{ok, headline, summary}`
  // shape, distinct for the same one-kind-per-fact reason `component-result` is: "did the page
  // skeleton get laid" is separately true and separately actionable from a theme or component write,
  // so it needs its own verdict slot and cannot overwrite theirs.
  | { kind: 'file-setup-result'; ok: boolean; headline: string; summary: string }
  // #259 — the outcome of a `style-guide` run, its own slot.
  | { kind: 'style-guide-result'; ok: boolean; headline: string; summary: string }
  | { kind: 'component-progress'; phase: 'build' | 'wire' | 'retry'; done: number; total: number; chunkMs: number }
  // #1778 — how far a style-guide run has got: `done` of `total` tables. Non-terminal, like
  // `component-progress`, so it belongs in the style guide's pending state, never its verdict slot.
  | { kind: 'style-guide-progress'; done: number; total: number }
  // #1521 — a prune preview (`applied: false`, `count` = what would be removed) or its outcome
  // (`applied: true`, `count` = what was removed). The UI reads `count` on a preview to decide
  // whether to open its confirm dialog, and `applied` to tell a preview from a verdict.
  | { kind: 'prune-result'; ok: boolean; applied: boolean; count: number; summary: string; pillOnly?: boolean }
  // UI redesign S11: an agent command's start, its build progress, and its end, for the Activity drawer.
  // `cmd` stays a string here; which commands have an operation to show is the host session's call.
  | { kind: 'agent-started'; id: string; cmd: string }
  | { kind: 'agent-progress'; id: string; phase: 'build' | 'wire' | 'retry'; done: number; total: number }
  | { kind: 'agent-finished'; id: string }
  // #1957: a write the main thread declined because a run of the same operation was already going. Not a
  // verdict, so it is its own kind: `cmd` is the operation's agent-command name, `agent` whose request it was.
  | { kind: 'refused'; code: 'busy'; cmd: string; agent: boolean; message: string }
  // `present` is the #722 addition: the summary string alone could not distinguish "no Prism3
  // theme in this file" from "a theme is here", and #721's three outcomes need that told apart
  // from `ok`. Deriving it by parsing `summary` would make the UI depend on the host's prose.
  | { kind: 'seed-info'; ok: boolean; summary: string; present: boolean; failed: number }
  | { kind: 'restore-input'; input: unknown }
  | { kind: 'restore-input-error'; message: string }
  // #1197 — the host read the file and found NO brand blob. Distinct from `restore-input` not
  // arriving, which is what absence used to look like, and distinct from `seed-info`'s
  // `present: false`, which is about VARIABLES in the canvas rather than a stored brand.
  | { kind: 'restore-input-empty' }
  | { kind: 'font-list'; families: string[]; styles: number[] };

/** The commit seam: the per-host "apply this theme" action, distinct from the preview.
 *  `web` implementations are the UI's own exporters; `figma` posts to the main thread. */
export interface HostCommit {
  /** True only in the Figma plugin — the UI shows an "Apply Theme" action + the
   *  read-back seed panel. `false` on web (the export bar is the commit path there). */
  readonly isFigma: boolean;
  /** Post the current brand to the host for materialisation (Figma only; no-op on web). The
   *  payload is the `BrandInput` — the main thread rebuilds the write plan + runs the executor,
   *  reusing #108 verbatim. Typed loosely (`unknown`) here to avoid a web→engine type import in
   *  the DOM layer; the plugin bridge + main thread carry the real `BrandInput` type. */
  postTheme(input: unknown): void;
  /** Ask the host to materialise one component set onto the canvas (#483; Figma only, no-op on web,
   *  which has no canvas to build onto).
   *
   *  ONE ARGUMENT, AND IT IS AN ID RATHER THAN A DEF (#804). What travels is the def's `id` — the defs
   *  are compiled into the plugin's own bundle, so sending one would put a large structure on the wire
   *  that the receiver already has and must look up anyway. Optional, so absent still means Button.
   *
   *  Scope (which variants get built) is still NOT here and is still the main thread's:
   *  `applyComponentPlan` takes a plan list, so scoping is entirely which plans it passes, and an
   *  argument here would put a curation taxonomy on the wire before anyone has chosen one. The
   *  difference is that "which def" has an answer `componentDefs` already holds, and "which variants"
   *  does not — see `messages.ts`. */
  postComponents(def?: string): void;
  /** Ask the host to scaffold the file's PAGE structure (#1558; Figma only, no-op on web, which has no
   *  page taxonomy to lay). Carries no argument — the taxonomy is a config compiled into the main bundle
   *  (`file-taxonomy.ts`), so there is nothing for the UI to send (see `messages.ts` `file-setup`). Its
   *  result is `file-setup-result`, a distinct verdict kind with its own slot, for the same one-kind-per-fact
   *  reason `component-result` is separate from `apply-result` — see `onHostMessage` below. */
  postFileSetup(): void;
  /** Ask the host to draw the style-guide tables (#259; Figma only, no-op on web, which has no canvas). The
   *  options are the panel's Customize fields, every one optional. Its result is `style-guide-result`, its own
   *  kind and slot for the one-kind-per-fact reason above. */
  postStyleGuide(options?: StyleGuideOptionsMsg): void;
  /** Ask the host to PRUNE the styles/variables/collections the current config no longer emits (#1521;
   *  Figma only, no-op on web — the web host writes CSS custom properties, which have no stale-item
   *  problem). `confirm: false` asks for a preview (a `prune-result` with `applied: false`); `confirm:
   *  true` performs the delete. `input` is the `BrandInput`, typed `unknown` here for the same reason
   *  `postTheme` is — to keep this DOM layer free of the engine type import. */
  postPrune(input: unknown, confirm: boolean): void;
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
   *  own — one cannot overwrite the other's.
   *
   *  `component-progress` (#684) is the one NON-TERMINAL kind: it arrives many times per build and is
   *  superseded by the next one, so it belongs in the pending state rather than a verdict slot. It has no
   *  `ok` for that reason — a fraction is not an outcome. */
  onHostMessage(cb: (msg: HostMessage) => void): void;
  /** Ask the host to resize its window to these outer dimensions (#144; Figma only, no-op on web,
   *  where the browser owns the window). Called continuously while the grip is dragged; `commit`
   *  is true on pointer-up, the host's cue to persist. The host clamps — this layer does not know
   *  the minimum usable size. */
  requestResize(width: number, height: number, commit: boolean): void;
}

/** The wire shape the iframe posts to the main thread is the plugin's own `UiToMain` (#1813), imported
 *  as a TYPE, so it is erased from both bundles and no plugin code reaches the web one. It used to be
 *  re-declared here message by message, with a comment asking that the two be kept in sync and nothing
 *  checking that they were. Every post below goes through `post`, whose parameter is that union, and each
 *  message is written as a literal of its own member type, so a field dropped or renamed on either side
 *  is a compile error here. (A new optional field on the plugin side is not: the UI simply does not send it.) */
type ApplyTheme = Extract<UiToMain, { type: 'apply-theme' }>;
/** The style guide's Customize fields (#259): `messages.ts` `StyleGuideOptions`, under the name the UI uses. */
export type StyleGuideOptionsMsg = StyleGuideOptions;
/** Post one message to the main thread; the bridge unwraps `{ pluginMessage }`. */
const post = (msg: UiToMain): void => parent.postMessage({ pluginMessage: msg }, '*');

/** The INBOUND wire shape is the plugin's own `MainToUi` (#1840), imported as a TYPE like `UiToMain` above.
 *
 *  It still arrives over `postMessage`, so it is validated field by field rather than cast: the sender is
 *  another context, and an older or newer host build can send a different shape. What changed is where
 *  the validator gets its field NAMES. It used to read a loose shape written out here beside `MainToUi`,
 *  so a field renamed in `messages.ts` kept being read under its old name, arrived as `undefined`, and
 *  no typecheck or test noticed. Each validator below now receives `Untrusted<member>`: the member's own
 *  keys, every value `unknown`. Reading a key the member does not have is a compile error at the read,
 *  while every value is still checked before it is used. */
type Untrusted<M> = { readonly [K in keyof M]?: unknown };
type Validator<K extends MainToUi['type']> = (m: Untrusted<OfType<MainToUi, K>>) => HostMessage | null;

/** A `{ok, headline, summary}` verdict. `headline` falls back to the ok flag, not to the summary: a host
 *  build older than the headline field sends none, and letting the ~150-char summary land in the pill
 *  would restore exactly the truncation the field exists to remove. */
type VerdictKind = 'apply-result' | 'component-result' | 'file-setup-result' | 'style-guide-result';
const verdict = <K extends VerdictKind>(kind: K, m: Untrusted<OfType<MainToUi, VerdictKind>>, okText: string, failText: string): { kind: K; ok: boolean; headline: string; summary: string } => {
  const headline = typeof m.headline === 'string' && m.headline ? m.headline : m.ok ? okText : failText;
  return { kind, ok: !!m.ok, headline, summary: String(m.summary ?? '') };
};

const count = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : null);
/** A build's progress reading, from the panel's own build or an agent's: `null` when the numbers are
 *  unusable. `phase` is checked against the union rather than cast: it selects a label the UI shows, and an
 *  unknown phase from a newer host should not print its name. */
const progressReading = (m: { phase?: unknown; done?: unknown; total?: unknown }): { phase: 'build' | 'wire' | 'retry'; done: number; total: number } | null => {
  const done = count(m.done);
  const total = count(m.total);
  const phase = m.phase === 'build' || m.phase === 'wire' || m.phase === 'retry' ? m.phase : null;
  return phase && done !== null && total !== null && total > 0 ? { phase, done, total } : null;
};
const isId = (x: unknown): x is string => typeof x === 'string' && x.length > 0;

/** One entry per `MainToUi` kind, keyed by the union itself, so a kind added in `messages.ts` is a compile
 *  error here until it is either handled or declared `null`. `null` means the kind is not this adapter's:
 *  it is dropped here, as any unknown `type` is. Every entry is a function or `null`, never a call, so the
 *  table has no side effects and the web bundle, which never calls `toHostMessage`, drops it whole. */
const INBOUND: { readonly [K in MainToUi['type']]: Validator<K> | null } = {
  'apply-result': (m) => verdict('apply-result', m, '✓ applied', '✗ apply failed'),
  // The default says "built" without a count, because an older host that sends no headline sends no
  // counts to put in one either.
  // `completed` (S8.2, C1): required of the host (`messages.ts`), and never inferred from `ok`. Only a literal `true`
  // reads as a build that ran to the end. A malformed value is not dropped (a dropped terminal result leaves the
  // panel on "Building…", #870); it reads as a build that did not finish, the claim that needs no evidence.
  'component-result': (m) => ({ ...verdict('component-result', m, '✓ built', '✗ build failed'), completed: m.completed === true }),
  'file-setup-result': (m) => verdict('file-setup-result', m, '✓ file set up', '✗ setup failed'),   // #1558
  'style-guide-result': (m) => verdict('style-guide-result', m, '✓ style guide written', '✗ style guide failed'),   // #259
  'component-progress': (m) => {
    // Validated, not coerced, and DROPPED if the numbers are unusable — unlike the result kinds
    // above, which fall back to a default headline. A result is a fact the designer is waiting for,
    // so a degraded one is still worth showing; a progress reading is one of dozens and the next one
    // is milliseconds away, so a "0 of 0" is strictly worse than the previous reading staying put.
    const r = progressReading(m);
    return r ? { kind: 'component-progress', ...r, chunkMs: count(m.chunkMs) ?? 0 } : null;
  },
  'style-guide-progress': (m) => {
    // #1778. Validated and dropped when unusable, for the `component-progress` reason above.
    const done = count(m.done);
    const total = count(m.total);
    return done !== null && total !== null && total > 0 && done <= total ? { kind: 'style-guide-progress', done, total } : null;
  },
  'prune-result': (m) => {
    // #1521. `count` and `applied` are validated at the boundary like the other numeric/flag fields
    // above — a preview with a bad count is dropped rather than opening a confirm dialog on nonsense.
    const count = typeof m.count === 'number' && Number.isFinite(m.count) && m.count >= 0 ? Math.floor(m.count) : null;
    if (count === null) return null;
    // `pillOnly` (the agent link): a preview the panel did not ask for — shown, never opened as a dialog.
    return { kind: 'prune-result', ok: !!m.ok, applied: !!m.applied, count, summary: String(m.summary ?? ''), ...(m.pillOnly === true ? { pillOnly: true } : {}) };
  },
  // `present` defaults FALSE when a host omits it (an older plugin build against a newer UI):
  // absent → #721's state 3, "not a Prism3 file". That is the safe default because state 3
  // claims nothing about a stored input, whereas defaulting true would assert the file is ours
  // and then report its knobs as unrecoverable — inventing a limitation from a missing field.
  // `failed` (S11) defaults 0 when omitted or malformed: the drawer then says the contract failed without a count.
  'seed-info': (m) => ({ kind: 'seed-info', ok: !!m.ok, summary: String(m.summary ?? ''), present: !!m.present, failed: Number.isInteger(m.failed) && (m.failed as number) > 0 ? m.failed as number : 0 }),
  'restore-input': (m) => (m.input ? { kind: 'restore-input', input: m.input } : null),
  'restore-input-empty': () => ({ kind: 'restore-input-empty' }),
  'restore-input-error': (m) => ({ kind: 'restore-input-error', message: String(m.message ?? 'saved brand data could not be restored') }),
  'font-list': (m) => {
    if (!Array.isArray(m.families)) return null;
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
    return { kind: 'font-list', families, styles };
  },
  // The agent link's messages. The panel's own listeners read them (`agent-link-ui.ts`, and the bridge
  // relay in `agent-bridge-relay.ts`); the shared UI body reads only what the Activity drawer shows (S11):
  // a command's start, its build progress, and its end. The result envelope and the log lines stay the
  // relay's.
  'agent-link-state': null,
  'agent-result': null,
  'agent-progress': (m) => {
    const p = m.progress && typeof m.progress === 'object' ? progressReading(m.progress as Record<string, unknown>) : null;
    return p && isId(m.id) ? { kind: 'agent-progress', id: m.id, ...p } : null;
  },
  'agent-log': null,
  'agent-started': (m) => (isId(m.id) && typeof m.cmd === 'string' ? { kind: 'agent-started', id: m.id, cmd: m.cmd } : null),
  'agent-finished': (m) => (isId(m.id) ? { kind: 'agent-finished', id: m.id } : null),
  // #1957. Dropped unless every field is usable: a refusal with no operation has no row to land in.
  'refused': (m) => (m.code === 'busy' && typeof m.cmd === 'string' && typeof m.agent === 'boolean' && typeof m.message === 'string' && m.message
    ? { kind: 'refused', code: 'busy', cmd: m.cmd, agent: m.agent, message: m.message } : null),
};

/** Validate one inbound `MessageEvent.data` and return the UI's `HostMessage`, or `null` to drop it. Pure,
 *  so `test-write-adapter.ts` drives it with literals. The `type` is looked up as an OWN key of `INBOUND`,
 *  so an inherited name such as `toString` is dropped like any other unknown kind. */
export const toHostMessage = (data: unknown): HostMessage | null => {
  const m: unknown = data ? (data as { pluginMessage?: unknown }).pluginMessage : undefined;
  if (!m || typeof m !== 'object') return null;
  const type = (m as { type?: unknown }).type;
  if (typeof type !== 'string' || !Object.prototype.hasOwnProperty.call(INBOUND, type)) return null;
  // Each validator's parameter is its own member's keys, so the table is a union of functions; the lookup
  // has already matched `type` to the member, which the compiler cannot follow through a string index.
  const validate = INBOUND[type as MainToUi['type']] as ((m: object) => HostMessage | null) | null;
  return validate ? validate(m) : null;
};

/** Figma commit — the DOM-only bridge half (no `figma.*`; lives in the iframe). Posts to the
 *  main thread via `parent.postMessage` and listens for the main thread's replies. */
const figmaCommit = (): HostCommit => ({
  isFigma: true,
  postTheme(input) {
    // `input` is `unknown` at this seam (see `postTheme`), so it is cast to the wire's `BrandInput` here.
    post({ type: 'apply-theme', input: input as ApplyTheme['input'] });
  },
  postComponents(def) {
    // `def` omitted from the message when the caller omitted it, rather than sent as `undefined`: the
    // main thread distinguishes absent (means Button) from present, and `postMessage` structured-clones,
    // so an explicit `undefined` would arrive as a present key holding nothing.
    // A typed local, not a spread: a conditional spread escapes the excess-property check, so a renamed
    // `def` in `messages.ts` would compile and post a build with no def.
    const msg: Extract<UiToMain, { type: 'build-components' }> = def ? { type: 'build-components', def } : { type: 'build-components' };
    post(msg);
  },
  postFileSetup() {
    post({ type: 'file-setup' });
  },
  postStyleGuide(options) {
    const msg: Extract<UiToMain, { type: 'style-guide' }> = options ? { type: 'style-guide', options } : { type: 'style-guide' };   // typed local, as above
    post(msg);
  },
  postPrune(input, confirm) {
    post({ type: 'prune', input: input as ApplyTheme['input'], confirm });
  },
  onHostMessage(cb) {
    window.addEventListener('message', (e: MessageEvent) => {
      const msg = toHostMessage(e.data);
      if (msg) cb(msg);
    });
    // Listener attached — signal the main thread it can post (and run the boot read-back, #109).
    post({ type: 'ui-ready' });
  },
  requestResize(width, height, commit) {
    post({ type: 'resize-ui', width, height, commit });
  },
});

/** Web commit — the export bar IS the commit path, so this is inert (the UI wires its own
 *  download handlers). Present for signature parity so the UI can branch on `isFigma`. */
const webCommit = (): HostCommit => ({
  isFigma: false,
  postTheme() {/* web commits via the export bar (download design.md / tokens.json) */},
  postComponents() {/* no canvas on web — the component tier is a Figma-only write */},
  postFileSetup() {/* no canvas on web — file scaffolding is a Figma-only action (#1558) */},
  postStyleGuide() {/* no canvas on web — the style guide is drawn in Figma (#259) */},
  postPrune() {/* no figma.variables on web — CSS custom properties have no stale-item problem (#1521) */},
  onHostMessage() {/* no host messages on web */},
  requestResize() {/* the browser window is the user's to size on web */},
});

/** The single BUILD-TIME swap point. `PRISM3_HOST` is substituted by esbuild `--define`
 *  (`'web'` for the static site, `'figma'` for the plugin bundle); the unused branch is
 *  dead-code-eliminated, so neither bundle ships the other host's code. */
export const hostCommit = (): HostCommit => (PRISM3_HOST === 'figma' ? figmaCommit() : webCommit());
