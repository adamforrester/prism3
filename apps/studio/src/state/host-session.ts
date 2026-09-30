/**
 * The host session: what the Figma host has told the UI, and where each of the UI's host actions
 * stands (UI redesign F3).
 *
 * WHY THIS IS ITS OWN MODULE. These slots were module-level `let`s in `main.ts`, and the handler that
 * wrote them also repainted. So the question "does a component verdict reach the state the Components
 * page reads, and does that page get repainted?" could only be answered in a browser. #870 was exactly
 * that bug: the verdict repainted the bar and left the page's build button reading "Building…". Here the
 * state change is `reduce` and the repaint list is `repaintsFor`. Both are pure, and `test-host-session.ts`
 * asserts on them in Node.
 *
 * WHAT STAYS IN `main.ts`. Every effect: the repaints themselves, `loadBrand` for a restored brand, and
 * the fresh-file start (`clearOrigin` + `build`), which is guarded on the brand session's provenance and
 * so is not host state. `handleHostMessage` there calls `reduce`, then runs `repaintsFor` in order.
 *
 * The UI's own writes (a button setting a slot to `pending`, a pill toggling `openDetail`) also stay in
 * `main.ts`, as whole-object reassignments of the one `HostSession` value.
 */
import { brandTheme } from '@prism3/engine/theme';
import type { BrandInput } from '@prism3/engine/theme';
import type { HostMessage } from '../write-adapter';
import { joinSeed, withRecovered, type SeedOutcome } from '../provenance';

/** A terminal verdict on a host action: the pill's headline and the detail behind it. */
export type Verdict = { ok: boolean; headline: string; summary: string };
/** An action's slot: `null` = never run this session, `pending` = posted and not answered yet, else the
 *  host's verdict. */
export type ActionState = Verdict | 'pending' | null;
/** Whose detail row is open, at most one. */
export type DetailKey = 'apply' | 'components' | 'filesetup' | 'styleguide';

/** Every host-fed slot, one per fact: the host sends one kind per fact, and the UI keeps a slot per
 *  kind. Moved from `main.ts` with their rationale. */
export interface HostSession {
  /**
   * What opening this file yielded (#722, implementing #721) — `null` until the host's boot read-back
   * answers, and always `null` on web (no file to read).
   *
   * WAS `{ok, summary}`, WHICH COULD NOT EXPRESS #721's STATE 2. A file holding Prism3 variables whose
   * stored `BrandInput` did not come back — a copied template, a hand-built file, one themed by an
   * older schema — had to arrive as either a success (silently wrong: the user believes the knobs are
   * the file's, and they are the demo) or a failure (wrong the other way: nothing failed, and the
   * user can still theme and apply). It shipped as the success, so the plugin says "contract holds ✓"
   * over knobs that have nothing to do with the file.
   *
   * `SeedOutcome` carries the third case as a success with a limitation. Not fixable by us: rebuilding
   * a `BrandInput` from emitted tokens is the undetermined inverse #677 rules out.
   */
  readonly seedOutcome: SeedOutcome | null;
  /**
   * Did the host restore the stored input (#131)? The OTHER half of the seed, and the reason it needs
   * its own slot: `restore-input` and `seed-info` are independent messages on independent reads
   * (`restoreToUi` and `seedFromFile` in the plugin's main thread do not gate each other), so neither
   * can be derived from the other and EITHER MAY ARRIVE FIRST. Recorded here and read when `seed-info`
   * lands, which is what joins the two mechanisms into one outcome without assuming an order.
   */
  readonly inputRecovered: boolean;
  /** Set when the host REFUSED to rehydrate the knobs (#480): a `BrandInput` blob is stored in this
   *  file, but it's an old/foreign shape or a schema version this build doesn't recognize (the
   *  pre-#341/#415 shape is exactly this case). A separate slot from `seedInfo` for the same reason
   *  the other boot facts are separate — this answers "could your saved knobs be restored", which
   *  `seedInfo` (the file's Figma-variable contract) does not. */
  readonly restoreError: string | null;
  /** The state of the Apply-to-Figma write. `null` = never run this session; `pending` = posted and the
   *  host has not answered yet; otherwise the host's verdict.
   *
   *  A SEPARATE slot from `seedInfo` on purpose. Both arrive as `{ok, summary}` and both wanted the one
   *  pill, so an apply used to overwrite the boot read-back and render as if it WERE the boot read-back —
   *  the only surface for "what happened when I pressed the button" was a pill labeled with what was in
   *  the file before it. And with no slot of its own there was nowhere for `pending` to live, so a write
   *  over a large file looked like a button that did nothing. Two facts, two slots. */
  readonly applyState: ActionState;
  /** The state of the Build-Button-set write (#483) — same shape, its own slot, for the same reason
   *  `applyState` is not `seedInfo`: two actions, two buttons, two verdicts. A component build cannot
   *  report into the theme write's pill without claiming something about the variables it never touched,
   *  and with no slot of its own it would have nowhere to be `pending` while it writes hundreds of nodes. */
  readonly componentState: ActionState;
  /** The state of the file-setup scaffold (#1558) — same shape, its own slot, for the same reason
   *  `componentState` is separate from `applyState`: three actions, three buttons, three verdicts. A
   *  file-setup verdict cannot report into the theme or component write's pill without claiming something
   *  about work it never did, and with no slot of its own it would have nowhere to be `pending` while the
   *  host lays the page skeleton and builds the two template assets. Unlike the component build there is no
   *  progress sibling: file-setup posts a single terminal result, so `pending` is a static "in flight". */
  readonly fileSetupState: ActionState;
  /** The state of the style-guide run (#259) — its own slot, for the one-verdict-per-action reason above. */
  readonly styleGuideState: ActionState;
  /** How far the in-flight component build has got (#684) — `null` between builds and until the first
   *  chunk boundary reports.
   *
   *  A SIBLING OF `componentState` RATHER THAN A VARIANT OF IT, which is the same call the wire makes and
   *  for the same reason: this is not a verdict. `componentState` holds at most one value per action and
   *  the whole UI treats it as the answer; a progress reading is one of dozens, is stale the moment the
   *  next one lands, and has no `ok`. Folded in as a third variant it would also widen the type
   *  `renderApplyStatus` shares with `applyState`, forcing the theme write to handle a state it can never
   *  be in. Kept beside it, `componentState === 'pending'` still means exactly "in flight" and this only
   *  says how far. */
  readonly componentProgress: { phase: 'build' | 'wire' | 'retry'; done: number; total: number } | null;
  /** OPT-IN PRUNE (#1521) — Figma-only, and three slots for the same reason `applyState` is not
   *  `seedInfo`: the prune is its own action and its verdict must not land in another write's pill.
   *  `pruneBusy` is the in-flight state — a preview being computed or a delete running — and disables the
   *  button; `prunePreview` holds a ready preview whose confirm dialog is open; `pruneVerdict` is the pill
   *  text after a preview finds nothing stale or after a delete completes. */
  readonly pruneBusy: false | 'preview' | 'delete';
  readonly prunePreview: { count: number; summary: string } | null;
  readonly pruneVerdict: { ok: boolean; count: number; summary: string } | null;
  /** WHICH result's full detail is expanded, at most one. Collapsed by default: the headline answers the
   *  question ninety-nine times out of a hundred, and the detail is counts across five or six axes.
   *
   *  One discriminant rather than a boolean per pill, because there is one detail ROW: the row lives in the
   *  chrome (see `syncApplyDetail`) and everything sticky below is positioned from `--chrome-h`, so two
   *  independently-openable rows would both be pushing that height around. One row also means the open
   *  detail always belongs to a named pill — two rows could leave the theme write's counts sitting under a
   *  component verdict with nothing saying which was which. */
  readonly openDetail: DetailKey | null;
  // The font families the host can load (#113 Figma arm; empty on web and until the host answers).
  // Deliberately NOT part of `brandState`: it is an environment fact about one machine at one moment,
  // not brand data — persisting it or letting it reach `BrandInput` would make emitted artifacts
  // machine-dependent. Read to drive type-ahead on the typeface input AND to answer "will this face
  // load?" in the library table.
  readonly hostFonts: readonly string[];
  /** `hostFonts` family → how many styles Figma has for it (0 = count unknown). Exact-match keyed on
   *  purpose: `loadFontAsync` is case- AND whitespace-sensitive — measured against real Figma,
   *  `Roboto` loads while `roboto`, `ROBOTO` and `" Regular"` all fail — so a case-insensitive lookup
   *  here would claim a face will load when the write is going to skip it. */
  readonly hostFontStyles: ReadonlyMap<string, number>;
}

/** The session before the host has said anything — and, on web, forever. */
export const initialHostSession = (): HostSession => ({
  seedOutcome: null,
  inputRecovered: false,
  restoreError: null,
  applyState: null,
  componentState: null,
  fileSetupState: null,
  styleGuideState: null,
  componentProgress: null,
  pruneBusy: false,
  prunePreview: null,
  pruneVerdict: null,
  openDetail: null,
  hostFonts: [],
  hostFontStyles: new Map(),
});

/**
 * The next session after a host message. Pure: no DOM, no repaint, no brand-session write.
 *
 * Returns the SAME object when the message is refused or carries no host state: a `restore-input`
 * whose blob `brandTheme` rejects, a `component-progress` outside a pending build, and
 * `restore-input-empty` (its effect is on the brand session, in `main.ts`). Every accepted message
 * returns a new object, so `repaintsFor` can tell a refusal from an acceptance by identity.
 */
export const reduce = (s: HostSession, m: HostMessage): HostSession => {
  switch (m.kind) {
    case 'restore-input': {
      // The blob is public shared-data (any plugin can write it), so its shape is validated the way
      // Import does, by `brandTheme` accepting it. A refusal keeps the defaults silently.
      try { brandTheme(m.input as BrandInput); } catch { return s; }
      // Repair a seed outcome already joined without this: the two reads are independent, so this can
      // land after `seed-info`.
      return { ...s, inputRecovered: true, seedOutcome: s.seedOutcome ? withRecovered(s.seedOutcome, true) : s.seedOutcome };
    }
    case 'restore-input-empty':
      return s;
    case 'restore-input-error':
      return { ...s, restoreError: m.message };
    case 'font-list':
      return { ...s, hostFonts: m.families, hostFontStyles: new Map(m.families.map((f, i) => [f, m.styles[i] ?? 0])) };
    case 'apply-result':
      // A bad result opens its own detail; a clean one closes whatever was open, whose counts would
      // otherwise sit beside a pill that has just been replaced.
      return { ...s, applyState: { ok: m.ok, headline: m.headline, summary: m.summary }, openDetail: m.ok ? null : 'apply' };
    case 'component-result':
      // The progress clears with the verdict, so a next build's first render cannot show this run's fraction.
      return { ...s, componentState: { ok: m.ok, headline: m.headline, summary: m.summary }, openDetail: m.ok ? null : 'components', componentProgress: null };
    case 'file-setup-result':
      return { ...s, fileSetupState: { ok: m.ok, headline: m.headline, summary: m.summary }, openDetail: m.ok ? null : 'filesetup' };
    case 'style-guide-result':
      return { ...s, styleGuideState: { ok: m.ok, headline: m.headline, summary: m.summary }, openDetail: m.ok ? null : 'styleguide' };
    case 'component-progress':
      // Accepted only while the build is in flight. A boundary message still queued behind the verdict
      // would otherwise bring back the fraction the verdict just cleared.
      if (s.componentState !== 'pending') return s;
      return { ...s, componentProgress: { phase: m.phase, done: m.done, total: m.total } };
    case 'prune-result':
      // Three outcomes, told apart by `applied` and `count`: a finished delete, a preview with something
      // to remove (the confirm dialog), or a preview with nothing stale (a pill, never an empty dialog).
      if (m.applied) return { ...s, pruneBusy: false, pruneVerdict: { ok: m.ok, count: m.count, summary: m.summary }, prunePreview: null };
      // An agent's preview: a pill, never the dialog, whose Confirm would prune against this panel's knobs.
      if (m.count > 0 && m.pillOnly) return { ...s, pruneBusy: false, prunePreview: null, pruneVerdict: { ok: m.ok, count: m.count, summary: `Agent preview: ${m.summary}` } };
      if (m.count > 0) return { ...s, pruneBusy: false, prunePreview: { count: m.count, summary: m.summary }, pruneVerdict: null };
      return { ...s, pruneBusy: false, prunePreview: null, pruneVerdict: { ok: m.ok, count: 0, summary: m.summary } };
    case 'seed-info':
      // Joins the two independent boot reads into one outcome (#721); `restore-input` repairs it if it lands later.
      return { ...s, seedOutcome: joinSeed({ present: m.present, ok: m.ok, detail: m.summary }, s.inputRecovered) };
  }
};

/**
 * What `main.ts` does after `reduce`, in this order:
 *   - `loadBrand`: load the restored input as the file's brand.
 *   - `startFresh`: the fresh-file start moment (#1197), which `main.ts` runs only while nothing has
 *     been chosen yet.
 *   - `bar`, `applyDetail`: the chrome (only once it is mounted).
 *   - `workspace`: re-render the current page.
 *   - `componentRow`, `fileSetupRow`, `styleGuideRow`: a page's own action row.
 *   - `componentPending`: rewrite the text of every live component-progress pill, no re-render.
 */
export type Repaint =
  | 'loadBrand' | 'startFresh' | 'bar' | 'applyDetail' | 'workspace'
  | 'componentRow' | 'fileSetupRow' | 'styleGuideRow' | 'componentPending';

/**
 * The effects a message needs, given the session before (`prev`) and after (`next`) it. Pure.
 *
 * A verdict repaints the chrome AND the page row that holds that action's button (#870): the build's
 * control is page content, so a verdict that reached only the chrome left the button disabled.
 */
export const repaintsFor = (m: HostMessage, prev: HostSession, next: HostSession): readonly Repaint[] => {
  switch (m.kind) {
    case 'restore-input': return next === prev ? [] : ['loadBrand'];
    case 'restore-input-empty': return ['startFresh'];
    case 'restore-input-error': return ['bar'];
    case 'font-list': return ['workspace'];
    case 'apply-result': return ['bar', 'applyDetail'];
    case 'component-result': return ['bar', 'applyDetail', 'componentRow'];
    case 'file-setup-result': return ['bar', 'applyDetail', 'fileSetupRow'];
    case 'style-guide-result': return ['bar', 'applyDetail', 'styleGuideRow'];
    case 'component-progress': return next === prev ? [] : ['componentPending'];
    case 'prune-result': return ['bar'];
    case 'seed-info': return ['bar'];
  }
};
