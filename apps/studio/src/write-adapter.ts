/**
 * The host seam (docs/22, GH #106): what differs between the web playground and the Figma plugin iframe, which
 * run one UI.
 *
 * The live PREVIEW is not here: both hosts paint it the same way, in a full DOM. What differs per host is the
 * COMMIT action (docs/22 #110), "materialise this theme":
 *   • web    → download design.md / tokens.json (the UI's existing export bar)
 *   • figma  → post the live `BrandInput` to the plugin main thread, which runs #108's
 *              `applyWritePlan` against `figma.variables`.
 * That's the `HostCommit` seam below, selected at BUILD time by `PRISM3_HOST` (esbuild `--define`), so the shared
 * UI bundle never carries the other host's code. And the INBOUND half: every `MainToUi` message is validated at
 * this boundary (`toHostMessage`) before the UI sees it.
 *
 * A CSS custom-property write adapter (`cssVarAdapter`, `makeWriteHost`) and its `cssVar`/`typeVar` names lived
 * here until #2487 PR 6: nothing in the UI read them, so they went (review finding A17).
 *
 * PURE-adjacent: imports only TYPES (the plugin's wire contract) + DOM. No `node:*`.
 */
import type { UiToMain, MainToUi, OfType, StyleGuideOptions, StyleGuideCatalog, StyleGuideCatalogCollection, StyleGuideCatalogTable, StyleGuideKind } from '../../plugin/src/messages';

/** A host→UI notification after the adapter has validated it at the boundary. Not a wire type: the
 *  wire carries `messages.ts` `MainToUi` (tagged `type`); the adapter checks each field and hands the UI
 *  this `kind`-tagged shape, with defaults filled in (`headline`, `styles`). See `onHostMessage`. */
export type HostMessage =
  // `lines` (#2177): the summary's items, one per line in the Activity drawer; `null` from a host that sends none, or a
  // malformed list, and the drawer then shows `summary` as its one line.
  | { kind: 'apply-result'; ok: boolean; headline: string; summary: string; lines: readonly string[] | null }
  | { kind: 'component-result'; ok: boolean; headline: string; summary: string; completed: boolean; lines: readonly string[] | null }
  // #2265 — the in-place update's dry run, or a baseline capture: what an update WOULD change, which is not
  // whether a build landed, so it has its own kind and never overwrites the build's verdict.
  | { kind: 'component-update-result'; ok: boolean; headline: string; summary: string; lines: readonly string[] | null; publish: string | null }
  // #1558 — the outcome of a `file-setup` scaffold. A FOURTH kind of the `{ok, headline, summary}`
  // shape, distinct for the same one-kind-per-fact reason `component-result` is: "did the page
  // skeleton get laid" is separately true and separately actionable from a theme or component write,
  // so it needs its own verdict slot and cannot overwrite theirs.
  | { kind: 'file-setup-result'; ok: boolean; headline: string; summary: string }
  // #259 — the outcome of a `style-guide` run, its own slot.
  | { kind: 'style-guide-result'; ok: boolean; headline: string; summary: string; stopped?: { done: number; total: number }; lines: readonly string[] | null;
    /** The cleanup offer (Q412 A, #2816): the tables the generator no longer draws that the run left, empty when none. */
    retired: readonly { id: string; name: string }[] }
  // Q412 A — the confirmed cleanup's outcome: the tables removed, by node id.
  | { kind: 'style-guide-cleanup-result'; ok: boolean; removed: readonly string[]; summary: string }
  // UI redesign S11.2 — the Build style guides page: what the file holds and which tables a run would draw (`error`
  // set when the host could not read it), a panel run's table list, and each table's move.
  | { kind: 'style-guide-catalog'; catalog: StyleGuideCatalog; error: string | null }
  | { kind: 'style-guide-tables'; tables: { key: string; title: string; page: string }[] }
  | { kind: 'style-guide-table'; index: number; status: 'drawing' | 'done' | 'failed'; reason: string | null }
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
  | { kind: 'agent-started'; id: string; cmd: string; confirmed?: true }
  // A style guide's reading arrives as phase `table` (#1778): `done` of `total` tables drawn.
  | { kind: 'agent-progress'; id: string; phase: 'build' | 'wire' | 'retry' | 'table'; done: number; total: number }
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
  // #2879: the host is reading the current page (at most 1.5 s) to tell a library file from a new one, and its answer: the
  // file uses a Prism3 library and holds no Prism3 tokens of its own. `name` is null without the team-library list.
  | { kind: 'restore-input-reading' }
  | { kind: 'restore-input-library'; library: LibraryFileView }
  | { kind: 'font-list'; families: string[]; styles: number[] }
  // #2909 — the file's Documentation settings (`apps/plugin/src/doc-settings.ts`): the usage-panel and cover switches,
  // and the Style guides tab's choices as the panel last saved them (`null` until it has). `error` when a save was refused.
  | { kind: 'doc-settings'; panels: boolean; cover: boolean; styleGuide: Record<string, unknown> | null; error: string | null }
  // #2909 — Update file's checklist: the def ids whose set the file holds, whether Set up file has run, and (Q2909.8 A)
  // what the as-built ledger says each present set is: current, due and why, or not recorded.
  | { kind: 'file-sets'; present: readonly string[]; setUp: boolean; error: string | null; due: Readonly<Record<string, SetDueView>> }
  // #3081 Q810 A — the badge's live recount: what is due against the panel's brand, and whether the file holds it.
  | { kind: 'file-due'; seq: number; present: readonly string[]; theme: boolean; error: string | null; due: Readonly<Record<string, SetDueView>> }
  // #2909 Q2909.8 A — one set's hand edits from the background pass after load, or its end.
  | { kind: 'hand-edits'; def: string; members: number; edited: number }
  | { kind: 'hand-edits-done' }
  // #2909 Q2909.8 A — the full check scoped to the flagged sets: each set's counts and the hash its update must echo.
  | { kind: 'update-check'; previewHash: string; sets: readonly CheckedSetView[]; missing: readonly string[]; error: string | null };

/** A set as the as-built ledger reads it (#2909 Q2909.8 A, `apps/plugin/src/as-built-ledger.ts`). */
export type SetDueView = { readonly state: 'current' | 'unrecorded' } | { readonly state: 'due'; readonly reason: 'definition' | 'engine' };
/** A set as the scoped check reads it (#2909, `CheckedSet` in `apps/plugin/src/messages.ts`). */
export type CheckedSetView = {
  readonly def: string; readonly hash: string; readonly members: number; readonly update: number; readonly add: number; readonly drop: number;
  readonly handEdited: number; readonly noBaseline: number; readonly blocked: boolean; readonly upToDate: boolean;
  /** #2831 — on a published set, what the update breaks for library consumers, as one line. Absent otherwise. */
  readonly breaks?: string;
};

/** What the library home states about the library a file uses (#2879), as the host found it on the current page. */
export type LibraryFileView = {
  readonly name: string | null;
  /** The engine versions its components were built by, ascending; empty when none carries a build stamp. */
  readonly versions: readonly string[];
  readonly instances: number;
  readonly bindings: number;
};

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
  /** Ask the host to open the docs in the browser (#2637, owner decision Q384 A; Figma only, no-op on web, where the
   *  bar's Docs is a link). Carries no address: the main thread holds it (`messages.ts` `open-docs`), so the iframe
   *  cannot point `figma.openExternal` anywhere else. */
  openDocs(): void;
  /** Ask the host to draw the style-guide tables (#259; Figma only, no-op on web, which has no canvas). The
   *  options are the panel's Customize fields, every one optional. Its result is `style-guide-result`, its own
   *  kind and slot for the one-kind-per-fact reason above. */
  postStyleGuide(options?: StyleGuideOptionsMsg): void;
  /** Ask the host for what the Build style guides page shows (S11.2; Figma only, no-op on web). Answered with a
   *  `style-guide-catalog` host message. */
  requestStyleGuideCatalog(): void;
  /** Ask the host to stop the running style guide after its current table (S11.2, owner decision P7; Figma only). */
  cancelStyleGuide(): void;
  /** Remove the tables the designer confirmed from a style-guide run's offer (Q412 A, #2816; Figma only, no-op on web),
   *  by node id. Answered with `style-guide-cleanup-result`. */
  cleanUpStyleGuide(ids: readonly string[]): void;
  /** Ask the host to PRUNE the styles/variables/collections the current config no longer emits (#1521;
   *  Figma only, no-op on web — the web host writes CSS custom properties, which have no stale-item
   *  problem). `confirm: false` asks for a preview (a `prune-result` with `applied: false`); `confirm:
   *  true` performs the delete. `input` is the `BrandInput`, typed `unknown` here for the same reason
   *  `postTheme` is — to keep this DOM layer free of the engine type import. */
  postPrune(input: unknown, confirm: boolean): void;
  /** #2830 Q2830.3 A: Documentation › Specs' Draw specs, the spec panels for the current page (`draw-specs`). Figma
   *  only; inert on the web. */
  postDrawSpecs(): void;
  /** #2909: keep Documentation's settings in the file (`doc-settings-save`). Figma only; inert on the web. */
  saveDocSettings(settings: unknown): void;
  /** #2909: ask which sets the file holds (`file-sets-request`), and what is due against `input`, the brand the panel
   *  holds (Q699 A; `unknown` for the reason `postTheme`'s is), or, `undefined` with Theme unticked, the file's stored
   *  brand (#3023 Q701 B). Figma only; inert on the web. */
  requestFileSets(input: unknown): void;
  /** #3081 Q810 A: the badge's live recount against `input`, the brand the panel holds (`due-request`), answered with
   *  the same `seq`. Figma only; inert on the web. */
  requestDue(input: unknown, seq: number): void;
  /** #2909 Q2909.8 A: start the background hand-edit pass (`hand-edits-request`). Figma only; inert on the web. */
  requestHandEdits(): void;
  /** #2909 Q2909.8 A: the full check, scoped to `defs` (`update-check-request`), against the panel's brand `input`
   *  (`undefined`: the file's stored brand, as `requestFileSets`'). Figma only; inert on the web. */
  requestUpdateCheck(defs: readonly string[], input: unknown): void;
  /** #2909: update `defs` in place under the check's hash (`update-sets`). Figma only; inert on the web. */
  postUpdateSets(defs: readonly string[], previewHash: string, handEdits: 'keep' | 'overwrite' | 'accept', input: unknown): void;
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
type VerdictKind = 'apply-result' | 'component-result' | 'component-update-result' | 'file-setup-result' | 'style-guide-result';
const verdict = <K extends VerdictKind>(kind: K, m: Untrusted<OfType<MainToUi, VerdictKind>>, okText: string, failText: string): { kind: K; ok: boolean; headline: string; summary: string } => {
  const headline = typeof m.headline === 'string' && m.headline ? m.headline : m.ok ? okText : failText;
  return { kind, ok: !!m.ok, headline, summary: String(m.summary ?? '') };
};

/** A verdict's `lines` (#2177): every entry a string, or none at all. A list with a non-string in it is dropped whole
 *  rather than shown with a hole, and the drawer falls back to the summary, which says every word. */
const linesOf = (x: unknown): readonly string[] | null =>
  Array.isArray(x) && x.length > 0 && x.every((l) => typeof l === 'string') ? x as string[] : null;

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
/** A style guide's reading (#1778): `done` of `total` tables, `null` when the numbers are unusable. */
const tableReading = (m: { done?: unknown; total?: unknown }): { done: number; total: number } | null => {
  const done = count(m.done);
  const total = count(m.total);
  return done !== null && total !== null && total > 0 && done <= total ? { done, total } : null;
};
const isId = (x: unknown): x is string => typeof x === 'string' && x.length > 0;
const str = (x: unknown): x is string => typeof x === 'string';
/** #2909 Q2909.8 A: the ledger's reading of each set; an entry of the wrong shape is left out, so the set reads as not
 *  known rather than as a state nobody sent. */
const dueOf = (x: unknown): Record<string, SetDueView> => {
  const out: Record<string, SetDueView> = {};
  if (!x || typeof x !== 'object' || Array.isArray(x)) return out;
  for (const [id, v] of Object.entries(x as Record<string, unknown>)) {
    const d = v as { state?: unknown; reason?: unknown } | null;
    if (!d || typeof d !== 'object') continue;
    if (d.state === 'current' || d.state === 'unrecorded') out[id] = { state: d.state };
    else if (d.state === 'due' && (d.reason === 'definition' || d.reason === 'engine')) out[id] = { state: 'due', reason: d.reason };
  }
  return out;
};
/** #2909: one checked set, or none when a count or a flag is malformed. */
const checkedSet = (x: unknown): CheckedSetView[] => {
  const c = x as Record<string, unknown> | null;
  if (!c || typeof c !== 'object' || !isId(c.def) || !str(c.hash) || typeof c.blocked !== 'boolean' || typeof c.upToDate !== 'boolean') return [];
  const n = (['members', 'update', 'add', 'drop', 'handEdited', 'noBaseline'] as const).map((k) => count(c[k]));
  if (n.some((v) => v === null)) return [];
  const [members, update, add, drop, handEdited, noBaseline] = n as number[];
  return [{ def: c.def, hash: c.hash, members, update, add, drop, handEdited, noBaseline, blocked: c.blocked, upToDate: c.upToDate, ...(str(c.breaks) ? { breaks: c.breaks } : {}) }];
};
const KINDS: readonly StyleGuideKind[] = ['color', 'dimension', 'font', 'text', 'effect', 'gradient'];
/** The style guide's catalog (S11.2), checked entry by entry: an entry with a field of the wrong type is dropped, and
 *  an item whose table index points at no table reads as one no phase draws (-1), so the page never offers a table
 *  the host did not name. `null` when the shape is not a catalog at all. */
const catalogOf = (c: unknown): StyleGuideCatalog | null => {
  if (!c || typeof c !== 'object') return null;
  const o = c as Record<string, unknown>;
  if (!Array.isArray(o.collections) || !Array.isArray(o.tables)) return null;
  const tables: StyleGuideCatalogTable[] = (o.tables as unknown[]).flatMap((t) => {
    const x = (t ?? {}) as Record<string, unknown>;
    return str(x.key) && str(x.title) && str(x.page) && KINDS.includes(x.kind as StyleGuideKind) && count(x.rows) !== null
      ? [{ key: x.key, title: x.title, kind: x.kind as StyleGuideKind, page: x.page, rows: count(x.rows)! }] : [];
  });
  const collections: StyleGuideCatalogCollection[] = (o.collections as unknown[]).flatMap((col) => {
    const x = (col ?? {}) as Record<string, unknown>;
    if (!str(x.id) || !str(x.name) || !Array.isArray(x.items)) return [];
    const items = (x.items as unknown[]).flatMap((it) => {
      const y = (it ?? {}) as Record<string, unknown>;
      if (!str(y.name)) return [];
      const t = Number.isInteger(y.table) && (y.table as number) >= 0 && (y.table as number) < tables.length ? y.table as number : -1;
      return [{ name: y.name, table: t, value: str(y.value) ? y.value : '' }];
    });
    const modes = Array.isArray(x.modes) ? (x.modes as unknown[]).filter(str) : [];
    return [{ id: x.id, name: x.name, modes, ...(x.textStyles === true ? { textStyles: true as const } : {}),
      ...(x.effectStyles === true ? { effectStyles: true as const } : {}), ...(x.gradientStyles === true ? { gradientStyles: true as const } : {}), items }];
  });
  const notes = Array.isArray(o.notes) ? (o.notes as unknown[]).filter(str) : [];
  return { setUp: o.setUp === true, collections, tables, notes };
};

/** One entry per `MainToUi` kind, keyed by the union itself, so a kind added in `messages.ts` is a compile
 *  error here until it is either handled or declared `null`. `null` means the kind is not this adapter's:
 *  it is dropped here, as any unknown `type` is. Every entry is a function or `null`, never a call, so the
 *  table has no side effects and the web bundle, which never calls `toHostMessage`, drops it whole. */
const INBOUND: { readonly [K in MainToUi['type']]: Validator<K> | null } = {
  'apply-result': (m) => ({ ...verdict('apply-result', m, '✓ applied', '✗ apply failed'), lines: linesOf(m.lines) }),
  // The default says "built" without a count, because an older host that sends no headline sends no
  // counts to put in one either.
  // `completed` (S8.2, C1): required of the host (`messages.ts`), and never inferred from `ok`. Only a literal `true`
  // reads as a build that ran to the end. A malformed value is not dropped (a dropped terminal result leaves the
  // panel on "Building…", #870); it reads as a build that did not finish, the claim that needs no evidence.
  'component-result': (m) => ({ ...verdict('component-result', m, '✓ built', '✗ build failed'), completed: m.completed === true, lines: linesOf(m.lines) }),
  'component-update-result': (m) => ({ ...verdict('component-update-result', m, '✓ checked', '✗ check failed'), lines: linesOf(m.lines),   // #2265
    publish: typeof m.publish === 'string' && m.publish ? m.publish : null }),   // #2858
  'file-setup-result': (m) => verdict('file-setup-result', m, '✓ file set up', '✗ setup failed'),   // #1558
  'style-guide-result': (m) => {   // #259
    // S11.2: a cancelled run says how far it got; a malformed `stopped` is left off rather than guessed.
    const st = m.stopped && typeof m.stopped === 'object' ? tableReading(m.stopped as { done?: unknown; total?: unknown }) : null;
    // Q412 A: an offer entry that is not an id and a name is dropped; a malformed list offers nothing.
    const retired = Array.isArray(m.retired) ? (m.retired as unknown[]).flatMap((x) => {
      const t = (x ?? {}) as Record<string, unknown>;
      return str(t.id) && str(t.name) && t.id ? [{ id: t.id, name: t.name }] : [];
    }) : [];
    return { ...verdict('style-guide-result', m, '✓ style guide written', '✗ style guide failed'), ...(st ? { stopped: st } : {}), lines: linesOf(m.lines), retired };
  },
  'style-guide-cleanup-result': (m) => ({   // Q412 A
    kind: 'style-guide-cleanup-result', ok: !!m.ok, summary: String(m.summary ?? ''),
    removed: Array.isArray(m.removed) ? (m.removed as unknown[]).filter((x): x is string => typeof x === 'string') : [],
  }),
  // S11.2. A catalog that is not one is dropped: the page keeps asking rather than drawing a tree from nothing.
  'style-guide-catalog': (m) => {
    const catalog = catalogOf(m.catalog);
    return catalog ? { kind: 'style-guide-catalog', catalog, error: str(m.error) && m.error ? m.error : null } : null;
  },
  'style-guide-tables': (m) => {
    if (!Array.isArray(m.tables)) return null;
    const tables = (m.tables as unknown[]).flatMap((t) => {
      const x = (t ?? {}) as Record<string, unknown>;
      return str(x.key) && str(x.title) && str(x.page) ? [{ key: x.key, title: x.title, page: x.page }] : [];
    });
    // Every entry or none: a list with a hole would shift every later `style-guide-table` index onto the wrong row.
    return tables.length === m.tables.length ? { kind: 'style-guide-tables', tables } : null;
  },
  'style-guide-table': (m) => {
    const index = count(m.index);
    const status = m.status === 'drawing' || m.status === 'done' || m.status === 'failed' ? m.status : null;
    return index !== null && status ? { kind: 'style-guide-table', index, status, reason: str(m.reason) && m.reason ? m.reason : null } : null;
  },
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
    const r = tableReading(m);
    return r ? { kind: 'style-guide-progress', ...r } : null;
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
  'restore-input-reading': () => ({ kind: 'restore-input-reading' }),
  // #2879. Validated at the boundary like every count here. A library message with nothing confirmed reads as
  // `restore-input-empty`, never as nothing: it follows `restore-input-reading`, so dropping it would leave "Reading this
  // file" up with no answer to come. The start window with its X is the agreed fallback (Q485 C).
  'restore-input-library': (m) => {
    const l = (m.library ?? null) as Record<string, unknown> | null;
    if (!l || typeof l !== 'object') return { kind: 'restore-input-empty' };
    const count = (v: unknown): number => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0);
    const instances = count(l.instances), bindings = count(l.bindings);
    if (instances + bindings === 0) return { kind: 'restore-input-empty' };
    const versions = Array.isArray(l.versions) ? l.versions.filter((v): v is string => typeof v === 'string' && /^\d+\.\d+\.\d+$/.test(v)) : [];
    const name = typeof l.name === 'string' && l.name.trim() ? l.name.trim() : null;
    return { kind: 'restore-input-library', library: { name, versions, instances, bindings } };
  },
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
  // The link strip's state (#2949): read by the agent-link control (`agent-link-ui.ts`), not here.
  'ui-minimized': null,
  // The chrome theme's kept choice: read by the plugin's UI entry (`apps/plugin/src/ui/entry.ts`), not here.
  'theme-pref': null,
  // The Activity drawer's kept height (#2176): read by the plugin's UI entry, not here.
  'activity-height': null,
  // #2909. A record with a switch that is not a boolean reads that switch as on, the main thread's own default.
  'doc-settings': (m) => {
    const x = (m.settings ?? {}) as Record<string, unknown>;
    const sg = x.styleGuide && typeof x.styleGuide === 'object' && !Array.isArray(x.styleGuide) ? x.styleGuide as Record<string, unknown> : null;
    return { kind: 'doc-settings', panels: x.panels !== false, cover: x.cover !== false, styleGuide: sg, error: str(m.error) && m.error ? m.error : null };
  },
  // #2909. Ids that are not strings are dropped; a malformed `setUp` reads as not set up, the claim that asks for more.
  'file-sets': (m) => ({ kind: 'file-sets', present: Array.isArray(m.present) ? (m.present as unknown[]).filter(str) : [], setUp: m.setUp === true,
    error: str(m.error) && m.error ? m.error : null, due: dueOf(m.due) }),
  // #3081 Q810 A. An answer with no number to match is dropped; a malformed `theme` reads as nothing to apply.
  'file-due': (m) => (typeof m.seq === 'number' ? { kind: 'file-due', seq: m.seq, present: Array.isArray(m.present) ? (m.present as unknown[]).filter(str) : [],
    theme: m.theme === true, error: str(m.error) && m.error ? m.error : null, due: dueOf(m.due) } : null),
  // #2909 Q2909.8 A. A reading with a field of the wrong type is dropped: a guessed count would be a status nobody read.
  'hand-edits': (m) => {
    if ('done' in m && m.done === true) return { kind: 'hand-edits-done' };
    const x = m as Record<string, unknown>;
    const members = count(x.members), edited = count(x.edited);
    return isId(x.def) && members !== null && edited !== null ? { kind: 'hand-edits', def: x.def, members, edited } : null;
  },
  'update-check': (m) => ({ kind: 'update-check', previewHash: str(m.previewHash) ? m.previewHash : '', missing: Array.isArray(m.missing) ? (m.missing as unknown[]).filter(str) : [],
    sets: Array.isArray(m.sets) ? (m.sets as unknown[]).flatMap(checkedSet) : [], error: str(m.error) && m.error ? m.error : null }),
  'agent-result': null,
  'agent-progress': (m) => {
    const raw = m.progress && typeof m.progress === 'object' ? m.progress as Record<string, unknown> : null;
    // An agent's style guide reads phase `table` (#1778, owner decision Q19 b); a build reads its own phases.
    const t = raw && raw.phase === 'table' ? tableReading(raw) : null;
    const p = t ? { phase: 'table' as const, ...t } : raw ? progressReading(raw) : null;
    return p && isId(m.id) ? { kind: 'agent-progress', id: m.id, ...p } : null;
  },
  'agent-log': null,
  'agent-started': (m) => (isId(m.id) && typeof m.cmd === 'string' ? { kind: 'agent-started', id: m.id, cmd: m.cmd, ...(m.apply === true ? { confirmed: true as const } : {}) } : null),
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
  openDocs() {
    post({ type: 'open-docs' });
  },
  postStyleGuide(options) {
    const msg: Extract<UiToMain, { type: 'style-guide' }> = options ? { type: 'style-guide', options } : { type: 'style-guide' };   // typed local, as above
    post(msg);
  },
  requestStyleGuideCatalog() {
    post({ type: 'style-guide-catalog-request' });
  },
  cancelStyleGuide() {
    post({ type: 'style-guide-cancel' });
  },
  cleanUpStyleGuide(ids) {
    post({ type: 'style-guide-cleanup', ids: [...ids] });
  },
  postPrune(input, confirm) {
    post({ type: 'prune', input: input as ApplyTheme['input'], confirm });
  },
  requestFileSets(input) {
    post({ type: 'file-sets-request', input: input as ApplyTheme['input'] });
  },
  requestDue(input, seq) {
    post({ type: 'due-request', input: input as ApplyTheme['input'], seq });
  },
  requestHandEdits() {
    post({ type: 'hand-edits-request' });
  },
  requestUpdateCheck(defs, input) {
    post({ type: 'update-check-request', defs: [...defs], input: input as ApplyTheme['input'] });
  },
  postUpdateSets(defs, previewHash, handEdits, input) {
    post({ type: 'update-sets', defs: [...defs], previewHash, handEdits, input: input as ApplyTheme['input'] });
  },
  saveDocSettings(settings) {
    post({ type: 'doc-settings-save', settings });
  },
  postDrawSpecs() {
    post({ type: 'draw-specs' });
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
  openDocs() {/* the web bar's Docs is a link to the site's own /docs/ (#2637 Q384) */},
  postStyleGuide() {/* no canvas on web — the style guide is drawn in Figma (#259) */},
  requestStyleGuideCatalog() {/* no file on web (S11.2) */},
  cancelStyleGuide() {/* no style guide runs on web (S11.2) */},
  cleanUpStyleGuide() {/* no style guide runs on web (Q412 A) */},
  postPrune() {/* no figma.variables on web — CSS custom properties have no stale-item problem (#1521) */},
  saveDocSettings() {/* no file on web (#2909) */},
  postDrawSpecs() {/* no canvas on web (#2830) */},
  requestFileSets() {/* no file on web (#2909) */},
  requestDue() {/* no file on web (#3081) */},
  requestHandEdits() {/* no file on web (#2909) */},
  requestUpdateCheck() {/* no file on web (#2909) */},
  postUpdateSets() {/* no file on web (#2909) */},
  onHostMessage() {/* no host messages on web */},
  requestResize() {/* the browser window is the user's to size on web */},
});

/** The single BUILD-TIME swap point. `PRISM3_HOST` is substituted by esbuild `--define`
 *  (`'web'` for the static site, `'figma'` for the plugin bundle); the unused branch is
 *  dead-code-eliminated, so neither bundle ships the other host's code. */
export const hostCommit = (): HostCommit => (PRISM3_HOST === 'figma' ? figmaCommit() : webCommit());
