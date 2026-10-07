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
import type { AgentLinkState, AgentResult, AgentProgress, AgentCmd } from './agent-protocol';
import type { WriteCmd } from './run-guard';

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
  /** Scaffold the file's PAGE structure (#1554) — the first page-creation action.
   *
   *  A SEPARATE ACTION FROM `build-components`, not a flag on it, for the same reason `build-components`
   *  is separate from `apply-theme` (#652): it is its own designer choice with its own trigger. It writes
   *  the page skeleton (Cover, native `---` dividers, the empty section-header pages, the Foundations
   *  placeholder pages, and the Sandbox `↳ File Components` page) and builds the two plugin-only template
   *  assets onto File Components. Idempotent — a re-run finds pages by name and never duplicates one.
   *
   *  Carries no payload: the taxonomy is a config compiled into the main bundle (`file-taxonomy.ts`), not
   *  something the UI supplies, so there is nothing for the UI to send. */
  | { type: 'file-setup' }
  /** Draw the style-guide tables (#259, phase 1: color) — one table per palette on `↳ Primitive tokens` and one
   *  per role family on `↳ Semantic tokens`, from the file's own variables. Its own action for the #652 reason.
   *  Updates tables already drawn in place; never creates a page or moves a cell set. */
  | { type: 'style-guide'; options?: StyleGuideOptions }
  /** Ask for what the Build style guides page shows (UI redesign S11.2): the file's collections and the variables in
   *  each, its text styles, the tables a run would draw, and whether Set up file has run. Answered with one
   *  `style-guide-catalog`. Reads and writes nothing else, so it is never refused by the run guard. */
  | { type: 'style-guide-catalog-request' }
  /** Stop the running style guide AFTER THE TABLE IT IS DRAWING (owner decision P7, 2026-10-05). The tables already
   *  drawn stay. Nothing to cancel is not an error: the message is dropped. Only the panel posts it; an agent's run
   *  can be stopped this way too, since the owner's panel is the one place a person watches the file. */
  | { type: 'style-guide-cancel' }
  /** OPT-IN PRUNE (#1521) — remove the styles/variables/collections a config change dropped.
   *
   *  A SEPARATE ACTION FROM `apply-theme`, never a flag on it, for the #479 / #1152 reason: a theme apply
   *  runs after every knob change and must never delete, because it cannot tell a stale ghost from a
   *  hand-bound variable at that moment. This is the designer choosing to, with the count in front of
   *  them — which is why it carries `confirm`. `confirm: false` computes what WOULD be removed and posts a
   *  `prune-result` preview; `confirm: true` recomputes from a fresh read and deletes. The main thread
   *  recomputes on apply rather than trusting the preview's list, so the delete acts on the file's current
   *  orphan set. Carries the live `BrandInput` (like `apply-theme`) because the prune is defined against
   *  the plan that brand emits — what is stale is exactly what the current plan no longer names. */
  | { type: 'prune'; input: BrandInput; confirm: boolean }
  /** The owner's AGENT LINK switch (`agent-link.ts`). The ONLY way the link turns on: an agent cannot send
   *  this, because only the panel posts to the main thread. Not persisted — the link is off at every launch. */
  | { type: 'agent-link'; on: boolean }
  /** A command the desktop bridge delivered (transport B), relayed by the panel's socket. Unvalidated here —
   *  the main thread's dispatcher parses it exactly as it parses a mailbox entry, and answers `agent-result`.
   *  Refused with `link-off` unless the owner's switch is on. */
  | { type: 'agent-command'; command: unknown }
  /** Whether the panel's socket to the desktop bridge is open — shown on the link state. */
  | { type: 'agent-bridge'; connected: boolean }
  /** Designer is dragging the UI's resize grip (#144). Sent continuously during the drag so the
   *  window tracks the pointer; `commit` is true only on pointer-up, which is when the main thread
   *  persists the size to `clientStorage`. Splitting it this way keeps the drag smooth without
   *  writing to storage on every pointer-move. The main thread clamps — the UI does not decide
   *  the minimum. */
  | { type: 'resize-ui'; width: number; height: number; commit: boolean }
  /** The person chose a chrome theme in the Theme menu (the owner's top-bar decision, 2026-10-05): Match Figma
   *  (`figma`), Light or Dark. The main thread keeps it in `clientStorage`, per person, and sends it back on
   *  `ui-ready` as `theme-pref`. */
  | { type: 'set-theme-pref'; pref: 'figma' | 'light' | 'dark' }
  /** The person dragged or stepped the open Activity drawer to a height (#2176, the owner's AD1), in CSS pixels. The
   *  main thread keeps it in `clientStorage`, per person, and sends it back on `ui-ready` as `activity-height`. */
  | { type: 'set-activity-height'; px: number };

/** A style-guide specimen (#259) — the `type` axis of `_style-guide-swatches` a table row instances. */
export type SwatchType = 'default' | 'text' | 'icon' | 'border' | 'transparency';
/** How a style-guide value cell prints a color. */
export type ValueFormat = 'hex' | 'rgba' | 'hsl' | 'hsb';
/** The spacing specimen's style for the WHOLE run (owner decision, 2026-09-29: a stylistic choice, never chosen by
 *  role): `filled` a filled bar at the value's width (the default, the first member of the owner's cell set), `line` the
 *  bracket. `auto` is kept for the agent link and means the default, `filled`; it never varies by row. */
export type DimensionDisplay = 'auto' | 'filled' | 'line';
/** A font-variable row's specimen (#259 phase 2): "Abc 123" with the one named property bound to the variable;
 *  `generic` binds none. `auto` binds the property the variable is for. */
export type FontDisplay = 'auto' | 'generic' | 'family' | 'size' | 'weight' | 'letterSpacing' | 'lineHeight';

/** The style guide's options (#259) — the panel's Customize fields and the agent command's args. Every one
 *  has a default, so `{}` draws every table this phase draws. Here, not in `style-guide.ts`, so this file and
 *  `agent-protocol.ts` stay context-neutral: that module imports the engine's color math at runtime. */
export interface StyleGuideOptions {
  /** Collection names to document, in any case; absent means every collection. */
  collections?: string[];
  /** Token types; absent means every type this phase covers (`PHASE_TYPES` in `style-guide.ts`: color,
   *  dimension, the five font-variable kinds and `typography`, the text styles). */
  types?: string[];
  valueFormat?: ValueFormat;
  /** Table header: `dark` (default) or `light`. */
  header?: 'dark' | 'light';
  /** Show each value's alias chip. Default on. */
  aliases?: boolean;
  /** Show the description column. Default on. */
  description?: boolean;
  /** Override the COLOR specimen chosen from each token's role. `auto` (default) chooses per row. */
  display?: 'auto' | SwatchType;
  /** Draw only these tables (#1778), each named by its title as drawn ("Primary — nbds") or its key, in any
   *  case; absent means every table. A name that matches no table is reported by name. A filtered run covers
   *  only the tables it draws: no other table is stale, replaced or deleted by it. */
  tables?: string[];
  /** Args an older agent-link caller sent that no longer do anything (owner decision 20 removed `pixels`): accepted,
   *  ignored, and each said in the result's notes. Set by the agent link, never by the panel. */
  retired?: 'pixels'[];
  /** Print lengths in REM as well, at a 16px base. Default on. */
  rem?: boolean;
  /** The spacing specimen for every dimension row: `filled` (default) or `line`. `auto` means `filled`. */
  dimensionDisplay?: DimensionDisplay;
  /** The font-variable specimen; `auto` (default) binds the property each variable is for. */
  fontDisplay?: FontDisplay;
  /** Add a paragraph-spacing column to the text-style table. Default off. */
  paragraphSpacing?: boolean;
  /** Add a text-decoration column to the text-style table. Default off. */
  textDecoration?: boolean;
  /** Add a leading "Name" column on every table: a readable name per row ("Text Primary") a designer can edit, kept
   *  on rerun (owner decision 15). Default off (proposed). */
  titleCell?: boolean;
}

/** The four kinds of table the Build style guides page groups by (owner decision H8): color; spacing and size (every
 *  `dimension` table, radius included); the five font-variable kinds; and the text styles. */
export type StyleGuideKind = 'color' | 'dimension' | 'font' | 'text';
/** One table a run with no filter would draw, in the order it draws them. */
export interface StyleGuideCatalogTable {
  /** The table's key (`<type>|<collection id>|<group path>`): what the `tables` option matches besides the title. */
  key: string;
  title: string;
  kind: StyleGuideKind;
  /** The page it is drawn on, without the taxonomy's leading "↳ ": "Primitive tokens", "Semantic tokens". */
  page: string;
  rows: number;
}
/** One variable, or one text style, as the page's tree lists it. */
export interface StyleGuideCatalogItem {
  /** The full name, slash-separated, as Figma stores it. */
  name: string;
  /** The index of the table it is drawn in, in `tables`; -1 when no phase draws it yet (owner decision P5: shown, not
   *  pickable). */
  table: number;
  /** Its value in the collection's default mode, aliases followed: a hex for a color, px for a length, the number for
   *  a weight, the string for a family. Empty for a text style. */
  value: string;
}
/** A variable collection, or the file's text styles as one more entry (`textStyles: true`). */
export interface StyleGuideCatalogCollection {
  id: string;
  name: string;
  modes: string[];
  items: StyleGuideCatalogItem[];
  textStyles?: true;
}
/** What the Build style guides page shows before a run (S11.2). */
export interface StyleGuideCatalog {
  /** Whether Set up file has run: the swatch and text cell sets exist, and so do both token pages. Without them every
   *  table would be skipped, so the page turns Draw off (owner decision P8). */
  setUp: boolean;
  collections: StyleGuideCatalogCollection[];
  tables: StyleGuideCatalogTable[];
  /** The planner's notes for an unfiltered run, the later-phase count among them. */
  notes: string[];
}
/** Where one table of a run stands (owner decision P1, variant 1). `failed` carries its reason: the run goes on past
 *  it (P6). */
export type StyleGuideTableStatus = 'waiting' | 'drawing' | 'done' | 'failed';

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
  | { type: 'apply-result'; ok: boolean; headline: string; summary: string;
    /** The summary's items, one per line, for the Activity drawer (#2177): the same words as `summary`, split where
     *  the builder joins them (per axis, per note), without the joining separator. Built from the one list `summary`
     *  is joined from (`fromClauses` in `apply-summary.ts`), so the drawer never re-parses the prose. The agent link's
     *  result leaves it out (`agent-dispatch.ts`), so what an agent reads is unchanged, its keys in their order. */
    lines: string[] }
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
  | { type: 'component-result'; ok: boolean; headline: string; summary: string;
    /** Did the build run to the end (UI redesign S8.2, owner decision C1)? `true` when the set was built, its misses
     *  (if any) in the summary; `false` when it stopped before building the set: an unknown or not-standalone def, or a
     *  throw. The Components page tells "Built with problems" from "Build failed" by this, never by the headline's
     *  words. REQUIRED: the plugin and the panel ship in one bundle, so a post without it is a type error here,
     *  not an older host to accommodate. */
    completed: boolean;
    /** The summary's items, one per line (#2177; see `apply-result`): the set, each note after it, what was built
     *  first, each page header. */
    lines: string[] }
  /** Result of the in-place update's dry run, or of a baseline capture (#2265) — the `{ok, headline, summary}`
   *  shape, its own kind for the one-kind-per-fact reason: "what would an update change" is not "did my build
   *  land", and must not overwrite the build's verdict on the Components page. Only the agent link sends the
   *  two commands today; the panel's control for them is held for the owner (PR 2). */
  | { type: 'component-update-result'; ok: boolean; headline: string; summary: string;
    /** The summary's items, one per line (#2177; see `apply-result`): one per set, then each closing line. */
    lines: string[] }
  /** Result of a `file-setup` scaffold (#1554) — the same `{ok, headline, summary}` shape as
   *  `apply-result` / `component-result`, a DISTINCT variant for the same one-kind-per-fact reason: "did
   *  the page skeleton get laid" is separately true and separately actionable from a theme or component
   *  write, so it needs its own state to be pending in and its own verdict slot. `headline` obeys the same
   *  ≤24-char pill budget; `summary` names the pages created and any font miss on the template assets. */
  | { type: 'file-setup-result'; ok: boolean; headline: string; summary: string }
  /** Result of a `style-guide` run (#259) — the same `{ok, headline, summary}` shape, its own kind and slot.
   *  `summary` names the tables created and updated, the tokens added, removed or changed, and every skip. */
  | { type: 'style-guide-result'; ok: boolean; headline: string; summary: string;
    /** Set when a `style-guide-cancel` stopped the run (S11.2): `done` of the run's `total` tables were reached. */
    stopped?: { done: number; total: number };
    /** The summary's items, one per line (#2177; see `apply-result`): each failed table, each count, each note. */
    lines: string[] }
  /** The answer to `style-guide-catalog-request` (S11.2). `error` is set, and the catalog empty, when the file could
   *  not be read: the page says so rather than showing an empty file as if it had nothing in it. */
  | { type: 'style-guide-catalog'; catalog: StyleGuideCatalog; error?: string }
  /** A PANEL's style-guide run is starting (S11.2): the tables it will draw, in order, every one `waiting`. Posted once,
   *  before the first `style-guide-table`. Not posted for an agent's run: the agent link's sink would count each
   *  of these as a verdict, and Activity already shows an agent's run by its `agent-progress` count (owner decision
   *  Q19). */
  | { type: 'style-guide-tables'; tables: { key: string; title: string; page: string }[] }
  /** One table of the panel's run moved (S11.2): `drawing` before it starts, then `done`, or `failed` with the reason. A
   *  failed table does not stop the run (owner decision P6). Indexes `style-guide-tables`' list. */
  | { type: 'style-guide-table'; index: number; status: Exclude<StyleGuideTableStatus, 'waiting'>; reason?: string }
  /** Result of a `prune` message (#1521) — a preview when `applied` is false, the outcome of the delete
   *  when it is true, told apart by that flag rather than by parsing `summary`. `count` is the number of
   *  items the preview WOULD remove, or the number the apply DID remove. `summary` is the review text
   *  (preview) or the verdict text (applied). A DISTINCT variant from `apply-result` / `component-result`
   *  for the same reason those two are distinct: one kind per fact — a prune preview must not overwrite a
   *  theme write's verdict, and the prune's own confirm dialog reads `count` to decide whether to open. */
  | { type: 'prune-result'; ok: boolean; applied: boolean; count: number; summary: string;
      /** Set on an AGENT's preview (the agent link): show it as a pill, never open the confirm dialog. The
       *  dialog's Confirm would prune against the panel's own knobs, not the input the agent previewed. */
      pillOnly?: boolean }
  /** A write the main thread DECLINED because a run of the same operation was already going (#1957,
   *  `run-guard.ts`). Not a verdict: the file is untouched and the running write is unaffected, so this
   *  must not land in the operation's verdict slot or settle its run, and it is its own kind for that
   *  reason. `agent` says whose request was declined: an agent's (the agent also gets `busy` in its own
   *  command result), or the panel's own. The Activity drawer adds it to the row's earlier results as
   *  "Refused" (the owner's call). */
  | { type: 'refused'; code: 'busy'; cmd: WriteCmd; agent: boolean; message: string }
  /** A component build is UNDERWAY (#684) — posted at every chunk boundary, many times per build.
   *
   *  THE ONLY NON-TERMINAL MESSAGE ON THIS BRIDGE, and the reason it had to exist: `build-components`
   *  used to post exactly one message, at the end. On the first live 648-member build that meant the pill
   *  read a frozen `Building…` for the whole run, then the file stayed unresponsive for **1 min 10 s**
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
  | { type: 'component-progress'; phase: 'build' | 'wire' | 'retry'; done: number; total: number; chunkMs: number }
  /** A style-guide run is UNDERWAY (#1778) — posted once before the first table (`done: 0`) and after each
   *  table, so the pending pill reads "Drawing table 7 of 22…" while the executor yields to the host between
   *  tables. Its own kind for the `component-progress` reason: a reading is not a verdict, and it must not
   *  land in either action's result slot. `tableMs` is what the last table cost, the live run's calibration
   *  data for the executor's yield spacing (`CELLS_PER_YIELD` in `style-guide.ts`); 0 on the first reading. */
  | { type: 'style-guide-progress'; done: number; total: number; tableMs: number }
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
  /*  `failed` is how many contract checks failed (0 when the contract holds, the file is unthemed, or the
   *  read threw). It travels for the Activity drawer's short verdict ("2 mismatches", owner decision #3 on
   *  #1956), for the same reason `present` does: a count read out of `summary`'s prose would make the
   *  wording load-bearing. */
  | { type: 'seed-info'; ok: boolean; present: boolean; summary: string; failed: number }
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
  | { type: 'font-list'; families: string[]; styles?: number[] }
  /** The agent link's published state (`agent-protocol.ts` `AgentLinkState`): on/off, which transport is
   *  listening, and the last command it ran with its headline. Sent on `ui-ready`, on every switch, and
   *  after every command, so the panel's control always shows what the link is doing. The shared UI body
   *  never reads it — the agent-link control (`agent-link-ui.ts`) is its only consumer. */
  | { type: 'agent-link-state'; state: AgentLinkState }
  /** The chrome theme this person last chose (`set-theme-pref`), read from `clientStorage` on `ui-ready`. Not sent
   *  when nothing was kept: the UI starts on Match Figma. Read by the plugin's UI entry (`ui/entry.ts`), never by the
   *  shared UI body's host messages. */
  | { type: 'theme-pref'; pref: 'figma' | 'light' | 'dark' }
  /** The Activity drawer's height this person last chose (`set-activity-height`, #2176), read from `clientStorage` on
   *  `ui-ready`. Not sent when nothing was kept: the drawer opens at its own height. Read by the plugin's UI entry. */
  | { type: 'activity-height'; px: number }
  /** The result of an `agent-command` — the protocol's own envelope, relayed to the bridge unchanged. */
  | { type: 'agent-result'; result: AgentResult }
  /** A build's progress reading while an agent command runs, streamed to the bridge (#684's reading). */
  | { type: 'agent-progress'; id: string; progress: AgentProgress }
  /** A console line printed while an agent command runs, streamed to the bridge. */
  | { type: 'agent-log'; id: string; line: string }
  /** An agent command has started, and has finished (UI redesign S11): what lets the panel's Activity
   *  drawer show it running and mark its result as the agent's. Sent for every valid command, `status`
   *  included; the panel decides which have an operation to show. `finished` follows the command's
   *  terminal verdict, and is sent even when its handler threw and posted none. */
  | { type: 'agent-started'; id: string; cmd: AgentCmd }
  | { type: 'agent-finished'; id: string; cmd: AgentCmd };

/** Narrow a discriminated union by its `type` tag — the payload a handler actually receives. */
export type OfType<U extends { type: string }, T extends U['type']> = Extract<U, { type: T }>;

/** Exhaustiveness guard: a `default:` branch calling this is a COMPILE error if a union
 *  variant is left unhandled — so a new message type can't be silently dropped. */
export const assertNever = (x: never): never => {
  throw new Error(`Unhandled message variant: ${JSON.stringify(x)}`);
};
