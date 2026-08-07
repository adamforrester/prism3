/**
 * The typed postMessage bridge contract (docs/18 §1, docs/22).
 *
 * The plugin runs in TWO isolated JS contexts (main-thread sandbox + UI iframe) that can
 * only communicate by message passing. This module is the SHARED wire contract between
 * them: two discriminated unions, one per direction. It is deliberately near-PURE — a
 * type-only import of `BrandInput` (erased at compile) — so it compiles under BOTH tsconfigs
 * (main = no DOM, ui = no plugin API) and neither side can smuggle a context-specific type
 * across the seam.
 *
 * Since #110 the iframe UI IS the shared `apps/studio/src` app (one UI, no fork). Its commit path posts
 * `apply-theme` (carrying the live `BrandInput`); the main thread rebuilds the write plan and runs
 * #108's `applyWritePlan`, then reports `apply-result`. On boot the main thread runs #109's
 * read-back and posts `seed-info` (informational — an existing themed file's contract summary).
 *
 * `apply-result` and `seed-info` carry the same field shape and are deliberately DISTINCT variants.
 * The UI's adapter used to fold them into one, which made an apply indistinguishable from the boot
 * read-back at the receiving end — see the note on `apply-result` below.
 */
import type { BrandInput } from '../../../Prism3/engine/theme';

/** Messages the UI iframe sends TO the main thread. Wrapped in `{ pluginMessage }` on the wire. */
export type UiToMain =
  /** UI booted and its message listener is attached — main can now safely postMessage (and it's
   *  the cue for the boot read-back). Posted by the figma commit adapter, not the shared UI body. */
  | { type: 'ui-ready' }
  /** Materialise this brand into `figma.variables` (#108). Carries the live `BrandInput` from the
   *  shared UI's knobs; the main thread rebuilds the plan + runs the executor. */
  | { type: 'apply-theme'; input: BrandInput }
  /** Designer is dragging the UI's resize grip (#144). Sent continuously during the drag so the
   *  window tracks the pointer; `commit` is true only on pointer-up, which is when the main thread
   *  persists the size to `clientStorage`. Splitting it this way keeps the drag smooth without
   *  writing to storage on every pointer-move. The main thread clamps — the UI does not decide
   *  the minimum. */
  | { type: 'resize-ui'; width: number; height: number; commit: boolean };

/** Messages the main thread sends TO the UI iframe. */
export type MainToUi =
  /** Result of an `apply-theme` write: ok + a human summary (counts / any misses) for the UI.
   *
   *  `headline` is a ≤24-char verdict for the status pill; `summary` is the full detail behind it. Two
   *  fields rather than one because the full summary is ~150 characters of counts across five axes and
   *  the bar has room for a pill — so the UI was clipping it to ~30 characters, i.e. computing the
   *  miss count correctly and then throwing it away at the CSS layer. The split is HERE and not in the
   *  UI because this is where the counts exist: deriving a headline by re-parsing the prose downstream
   *  would make the summary's wording load-bearing, and the next edit to it would silently change what
   *  the pill claims. */
  | { type: 'apply-result'; ok: boolean; headline: string; summary: string }
  /** Boot read-back (#109): whether an existing Prism3 theme in the file passes the contract, plus a
   *  human summary. Informational — the actual knob-rehydration is `restore-input` below. */
  | { type: 'seed-info'; ok: boolean; summary: string }
  /** Boot knob-rehydration (#131): the `BrandInput` persisted by the last apply, read back from the
   *  file's shared-data. The UI loads it wholesale so it opens on the persisted brand, not defaults.
   *  Sent only when a trusted blob exists (genuine absence → not sent → UI keeps defaults; a
   *  stored-but-untrusted blob sends `restore-input-error` below instead, never this). */
  | { type: 'restore-input'; input: BrandInput }
  /** Boot knob-rehydration REFUSED (#480): a `BrandInput` blob IS stored in this file's shared-data
   *  but can't be trusted — an old/foreign shape, or a schema version this build doesn't recognize
   *  (e.g. a pre-#341/#415 blob: the old `families.display/text/mono` role names, and a numeric
   *  `displayCeiling` where the current schema expects a rung name — the dangerous case, since a bare
   *  number can silently parse as SOMETHING in the new shape rather than failing to parse at all).
   *  Sent instead of `restore-input` so the UI can surface a clear, user-visible message rather than
   *  either silently keeping defaults (reads as "no theme yet", hiding that a restore failed) or
   *  guessing at the old shape. */
  | { type: 'restore-input-error'; message: string }
  /** The font families this Figma can load (the #113 Figma arm). Pushed once on `ui-ready` — the
   *  list is static for the session, so there is no request/response pair. The shared UI uses it to
   *  drive type-ahead on the typeface input; it is a HINT, not a constraint (a free-typed name
   *  is still accepted, because a brand input is a portable spec and may legitimately name a face
   *  this machine lacks). Never persisted and never part of `BrandInput` — it is an environment fact,
   *  not brand data. Absent on failure: the UI then keeps its plain free-text behavior.
   *
   *  `styles` carries the per-family style count, parallel to `families` by index. It exists because
   *  the UI's font-status column previously probed canvas metrics, which in an iframe with
   *  `networkAccess: none` cannot see a Figma CLOUD font — it reported "Not installed" for a Roboto
   *  this Figma has 36 styles of. Figma's list is authoritative about what a write will load, so the
   *  column reads this instead. Two parallel arrays rather than an array of objects keeps the wire
   *  payload small (34.5 KB of names already) and keeps the older single-array shape readable.
   *  A receiver must treat `styles` as OPTIONAL: it is absent from any host build older than this. */
  | { type: 'font-list'; families: string[]; styles?: number[] };

/** Narrow a discriminated union by its `type` tag — the payload a handler actually receives. */
export type OfType<U extends { type: string }, T extends U['type']> = Extract<U, { type: T }>;

/** Exhaustiveness guard: a `default:` branch calling this is a COMPILE error if a union
 *  variant is left unhandled — so a new message type can't be silently dropped. */
export const assertNever = (x: never): never => {
  throw new Error(`Unhandled message variant: ${JSON.stringify(x)}`);
};
