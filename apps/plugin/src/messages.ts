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
 * `apply-result`, `seed-info` and `component-result` carry the same field shape and are deliberately
 * DISTINCT variants. The UI's adapter used to fold the first two into one, which made an apply
 * indistinguishable from the boot read-back at the receiving end — see the note on `apply-result` below.
 *
 * The component tier (#483) rides the same bridge as its own action pair — `build-components` /
 * `component-result` — because materialising a component set is a designer ACTION with its own trigger,
 * not part of applying a theme (#652). Since #804 that action names which def to build; absent still
 * means Button.
 */
import type { BrandInput } from '@prism3/engine/theme';

/** Messages the UI iframe sends TO the main thread. Wrapped in `{ pluginMessage }` on the wire. */
export type UiToMain =
  /** UI booted and its message listener is attached — main can now safely postMessage (and it's
   *  the cue for the boot read-back). Posted by the figma commit adapter, not the shared UI body. */
  | { type: 'ui-ready' }
  /** Materialise this brand into `figma.variables` (#108). Carries the live `BrandInput` from the
   *  shared UI's knobs; the main thread rebuilds the plan + runs the executor. */
  | { type: 'apply-theme'; input: BrandInput }
  /** Materialise a COMPONENT SET into this file (#483) — the component tier's own action.
   *
   *  A SEPARATE ACTION FROM `apply-theme`, NOT a flag on it, and that is the decision rather than a
   *  detail (#652). `apply-theme` writes variables and styles: it is idempotent, cheap, and something a
   *  designer runs after every knob change. Building a component set writes hundreds of nodes onto the
   *  canvas, and doing that on every theme apply would make the cheap action expensive and the canvas
   *  unpredictable. The set also depends on the variables existing first, so the two are ordered rather
   *  than merged.
   *
   *  `def` NAMES WHICH DEF TO BUILD, and it is optional so that absent still means Button — the contract
   *  #483 shipped, unchanged for any caller that does not set it. It carries the def's `id` (a
   *  `componentDefs` key) rather than the def itself: the defs are compiled into the main bundle, so
   *  sending one would put a large structure on the wire that the receiver already has, and the receiver
   *  must look it up anyway to reject an id it cannot build.
   *
   *  WHY THIS IS THE FIELD AND AN AXIS FILTER IS STILL NOT (#804). The distinction is which QUESTION the
   *  field answers. *Which def* has an answer the def list already contains — `componentDefs` is a real
   *  set, `typecheck-components.ts` asserts it holds exactly the defs git tracks, and an id either is in
   *  it or is not. *Which variants of that def* has no such answer: `figmaProperties` declares the axes
   *  and every coordinate they span is equally real, so choosing a subset means inventing a curation
   *  taxonomy nobody has chosen — which is why scope stays "the full set the def models" and remains a
   *  question of which plans the main thread passes to `applyComponentPlan`.
   *
   *  An UNKNOWN or UNBUILDABLE id is answered with a failed `component-result`, not a throw: the UI
   *  offers only ids it derived from `componentDefs`, so a bad one means the two sides disagree about the
   *  catalogue, and the designer needs to be told that rather than watch a build never answer. */
  | { type: 'build-components'; def?: string }
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
  /** Result of a `build-components` write (#483) — the same `{ok, headline, summary}` shape as
   *  `apply-result`, and a DISTINCT variant for the same reason `seed-info` is: one kind per fact.
   *
   *  Two writes, two questions. "Did my theme land in this file's variables" and "is the Button set on
   *  this page" are separately true, separately actionable, and separately stale — and the two actions
   *  have their own buttons, so each needs a state of its own to be pending in. Folded into
   *  `apply-result`, a component build would overwrite the theme write's verdict with a verdict about
   *  something else, which is exactly the defect that split `seed-info` off in the first place.
   *
   *  `headline` obeys the same ≤24-char pill budget (`componentHeadline`, gated in
   *  `test-apply-summary.ts`); `summary` carries the counts and the misses behind it. */
  | { type: 'component-result'; ok: boolean; headline: string; summary: string }
  /** A component build is UNDERWAY (#684) — posted at every chunk boundary, many times per build.
   *
   *  THE ONLY NON-TERMINAL MESSAGE ON THIS BRIDGE, and the reason it had to exist: `build-components`
   *  used to post exactly one message, at the end. On the first live 648-member build that meant the pill
   *  read a frozen `⋯ Building…` for the whole run, then the file stayed unresponsive for **1 min 10 s**
   *  after it said done. Nothing could be posted mid-run because nothing yielded; the executor now chunks
   *  (see `write-components.ts`), and this is what a chunk boundary says.
   *
   *  DISTINCT FROM `component-result` rather than a `progress` field on it, for the reason every other
   *  split on this bridge has: one kind per fact. A progress reading is not a verdict — it has no `ok`,
   *  it is superseded by the next one microseconds later, and the UI shows it in the PENDING state it
   *  already has rather than in a result slot. Folded together, every intermediate reading would land in
   *  the verdict slot and the last one would have to be told apart from a real result by inspecting its
   *  fields.
   *
   *  `phase` is `build` (making members) or `wire` (attaching property references across them) — two
   *  loops over the same member count, so a bare fraction would appear to restart at 0 halfway through a
   *  build that is progressing perfectly. `chunkMs` is what the chunk cost, carried up so a live run can
   *  CALIBRATE the chunk size: the shim has no event loop, so that number cannot be gated and has to be
   *  observed. See `CHUNK` in `write-components.ts`. */
  | { type: 'component-progress'; phase: 'build' | 'wire'; done: number; total: number; chunkMs: number }
  /** Boot read-back (#109): whether an existing Prism3 theme in the file passes the contract, plus a
   *  human summary. Informational — the actual knob-rehydration is `restore-input` below.
   *
   *  `present` is #722's addition, and it is a THIRD fact rather than a refinement of `ok`. #721's
   *  three seed outcomes are "not a Prism3 file", "ours, and here is what is in it", and "the
   *  read-back itself failed" — and `ok` alone cannot separate the first from the third, because an
   *  empty file and a broken read both arrive as `ok: false`. The UI would then tell a designer
   *  opening a blank file that something went wrong. Presence is known here (the read-back counted
   *  the variables) and nowhere else, so it travels rather than being inferred from `summary`'s
   *  prose downstream — which would make the wording load-bearing, the same trap the
   *  headline/summary split above exists to avoid. */
  | { type: 'seed-info'; ok: boolean; present: boolean; summary: string }
  /** Boot knob-rehydration (#131): the `BrandInput` persisted by the last apply, read back from the
   *  file's shared-data. The UI loads it wholesale so it opens on the persisted brand, not defaults.
   *  Sent only when a trusted blob exists (genuine absence → not sent → UI keeps defaults; a
   *  stored-but-untrusted blob sends `restore-input-error` below instead, never this). */
  | { type: 'restore-input'; input: BrandInput }
  /** Boot knob-rehydration found NOTHING (#1197): the file's shared-data holds no brand blob at all.
   *
   *  Absence used to be sent as silence — `restoreToUi` posted nothing and the UI kept its defaults —
   *  and that was adequate while the only consumer wanted a brand to load. It is not adequate for a
   *  START MOMENT, which has to know the difference between "no brand in this file" and "the restore
   *  has not arrived yet". Those are the same observation when absence is silent, so the plugin could
   *  only have inferred a fresh file from a timeout, or from `seed-info`'s `present: false` — which is
   *  a statement about VARIABLES in the canvas, a different question (#677/#1184: a file can carry
   *  applied variables and no blob).
   *
   *  Sent exactly when `restore-input` and `restore-input-error` are not, so the three are total over
   *  the read: a brand, a refusal, or nothing. The UI can then decide once, on arrival, with no race
   *  against the independent `seed-info` read. */
  | { type: 'restore-input-empty' }
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
