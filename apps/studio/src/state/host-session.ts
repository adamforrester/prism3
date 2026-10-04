/**
 * The host session: what the Figma host has told the UI, and where each of the UI's host actions
 * stands (UI redesign F3).
 *
 * WHY THIS IS ITS OWN MODULE. These slots were module-level `let`s in `main.ts`, and the handler that
 * wrote them also repainted. So the question "does a component verdict reach the state the Components
 * page reads, and does that page get repainted?" could only be answered in a browser. #870 was exactly
 * that bug: the verdict repainted the bar and left the page's build button reading "Building…". Here the
 * state change is `reduce`, what changed is `topicsFor`, and what the message does to the brand session is
 * `brandEffectFor`. All three are pure, and `test-host-session.ts` asserts on them in Node.
 *
 * WHAT STAYS IN `main.ts`. Every effect: `loadBrand` for a restored brand, the fresh-file start
 * (`clearOrigin` + `build`), which is guarded on the brand session's provenance and so is not host state,
 * and the painters. `handleHostMessage` there calls `reduce`, runs `brandEffectFor`'s effect, then
 * `invalidate`s each of `topicsFor`'s topics in order. It names no painter: each painter subscribes to the
 * topics it reads (P2).
 *
 * The UI's own writes (a button setting a slot to `pending`, a pill toggling `openDetail`) also stay in
 * `main.ts`, as whole-object reassignments of the one `HostSession` value.
 */
import { brandTheme } from '@prism3/engine/theme';
import type { BrandInput } from '@prism3/engine/theme';
import type { HostMessage } from '../write-adapter';
import { joinSeed, withRecovered, type SeedOutcome } from '../provenance';
import type { HostTopic } from './store';

/** A terminal verdict on a host action: the pill's headline and the detail behind it. */
export type Verdict = { ok: boolean; headline: string; summary: string };
/** An action's slot: `null` = never run this session, `pending` = posted and not answered yet, else the
 *  host's verdict. */
export type ActionState = Verdict | 'pending' | null;
/** Whose detail row is open, at most one. */
export type DetailKey = 'apply' | 'components' | 'filesetup' | 'styleguide';
/** The operations the Activity drawer shows (UI redesign S11): the four writes with a verdict slot, the
 *  prune, and the boot read-back. */
export type OpKey = DetailKey | 'prune' | 'readback';
/** The operation an agent command runs, by the command's name. `status` writes nothing and posts no
 *  verdict, so it has none. Keyed by the plugin's `AgentCmd` names, which arrive as strings. */
export const AGENT_OP: Readonly<Record<string, OpKey>> = {
  'apply-theme': 'apply', 'build-components': 'components', 'file-setup': 'filesetup', 'style-guide': 'styleguide',
  prune: 'prune', readback: 'readback',
};
/** Which operation's verdict a host message is. */
const VERDICT_OP: Partial<Record<HostMessage['kind'], OpKey>> = {
  'apply-result': 'apply', 'component-result': 'components', 'file-setup-result': 'filesetup', 'style-guide-result': 'styleguide',
  'prune-result': 'prune', 'seed-info': 'readback',
};

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
   *  pre-#341/#415 shape is exactly this case). A separate slot from `seedOutcome` for the same reason
   *  the other boot facts are separate — this answers "could your saved knobs be restored", which
   *  `seedOutcome` (the file's Figma-variable contract) does not. */
  readonly restoreError: string | null;
  /** The state of the Apply-to-Figma write. `null` = never run this session; `pending` = posted and the
   *  host has not answered yet; otherwise the host's verdict.
   *
   *  A SEPARATE slot from `seedOutcome` on purpose. Both arrive as `{ok, summary}` and both wanted the one
   *  pill, so an apply used to overwrite the boot read-back and render as if it WERE the boot read-back —
   *  the only surface for "what happened when I pressed the button" was a pill labeled with what was in
   *  the file before it. And with no slot of its own there was nowhere for `pending` to live, so a write
   *  over a large file looked like a button that did nothing. Two facts, two slots. */
  readonly applyState: ActionState;
  /** The state of the Build-Button-set write (#483) — same shape, its own slot, for the same reason
   *  `applyState` is not `seedOutcome`: two actions, two buttons, two verdicts. A component build cannot
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
  /** The set the panel's own pending build is for (UI redesign S8.2), `null` when the panel has no build out. The
   *  wire's `component-result` does not name its set, so the panel remembers the one it posted, and the verdict that
   *  answers it is recorded against that set in `setBuilds`. */
  readonly componentDef: string | null;
  /** Each set's last build result in THIS session (owner decision G9 A, S8.2): `true` built cleanly, `false` built
   *  with problems; a set with no entry was not built from this panel this session. Recorded only for the panel's
   *  own builds: an agent's build carries no set id over the wire, so it is not attributed (it still lands in the
   *  Activity drawer). Never persisted, and never read from the file. */
  readonly setBuilds: ReadonlyMap<string, boolean>;
  /** OPT-IN PRUNE (#1521) — Figma-only, and three slots for the same reason `applyState` is not
   *  `seedOutcome`: the prune is its own action and its verdict must not land in another write's pill.
   *  `pruneBusy` is the in-flight state — a preview being computed or a delete running — and disables the
   *  button; `prunePreview` holds a ready preview whose confirm dialog is open; `pruneVerdict` is the pill
   *  text after a preview finds nothing stale or after a delete completes. */
  readonly pruneBusy: false | 'preview' | 'delete';
  readonly prunePreview: { count: number; summary: string } | null;
  readonly pruneVerdict: { ok: boolean; applied: boolean; count: number; summary: string } | null;
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
  /** The agent command the Activity drawer shows as running (UI redesign S11), `null` when none is.
   *
   *  A SLOT OF ITS OWN, not the action's `pending`. The action slots say what the panel posted, and the
   *  panel's own controls read them: `applyState === 'pending'` disables Apply and the prune. An agent's
   *  command does not go through them, and setting them would change what those controls do while it
   *  runs, which is not this slice's to change. So the drawer reads both: an operation is running when
   *  its slot is pending OR this names it and is not `settled`.
   *
   *  `settled` turns true when the command's verdict lands (it is forwarded as the panel's own), so the
   *  verdict is recorded as the agent's. `agent-finished` clears the slot. A command that ends with no
   *  verdict (its handler threw) leaves the operation's slot as it was. `progress` is the agent build's
   *  own reading, which the panel's `componentProgress` does not take: that one is accepted only while
   *  the panel's own build is pending. */
  readonly agentRun: { readonly id: string; readonly op: OpKey; readonly settled: boolean; readonly progress: { phase: 'build' | 'wire' | 'retry'; done: number; total: number } | null } | null;
  /** The last write the main thread declined because a run of the same operation was already going
   *  (#1957), `null` until one is. `n` counts them, so the drawer can tell a second refusal from the first
   *  when the words are the same. A refusal is not a verdict: it settles no run and fills no verdict slot.
   *  The one slot it moves is the panel's own `pending`, and only when an agent's run holds the operation:
   *  the panel's request was then the one declined, and nothing is coming to answer it. */
  readonly refused: { readonly op: OpKey; readonly message: string; readonly agent: boolean; readonly n: number } | null;
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
  componentDef: null,
  setBuilds: new Map(),
  pruneBusy: false,
  prunePreview: null,
  pruneVerdict: null,
  openDetail: null,
  hostFonts: [],
  hostFontStyles: new Map(),
  agentRun: null,
  refused: null,
});

/** The panel's own slot for `op`, out of `pending` (#1957). The slot's last verdict was replaced by
 *  `pending` when the panel posted, so it goes back to never-run rather than to a verdict it no longer has;
 *  the agent's run, which holds the operation, fills it when its verdict lands. */
const unpend = (op: OpKey, s: HostSession): Partial<HostSession> => {
  switch (op) {
    case 'apply': return s.applyState === 'pending' ? { applyState: null } : {};
    case 'components': return s.componentState === 'pending' ? { componentState: null, componentProgress: null, componentDef: null } : {};
    case 'filesetup': return s.fileSetupState === 'pending' ? { fileSetupState: null } : {};
    case 'styleguide': return s.styleGuideState === 'pending' ? { styleGuideState: null } : {};
    case 'prune': return s.pruneBusy === 'delete' ? { pruneBusy: false } : {};
    case 'readback': return {};
  }
};

/** The session with the agent's run marked settled, when `m` is that run's verdict. */
const settleAgent = (s: HostSession, m: HostMessage): HostSession => {
  const r = s.agentRun;
  return r && !r.settled && VERDICT_OP[m.kind] === r.op ? { ...s, agentRun: { ...r, settled: true, progress: null } } : s;
};

/**
 * The next session after a host message. Pure: no DOM, no repaint, no brand-session write.
 *
 * Returns the SAME object when the message is refused or carries no host state: a `restore-input`
 * whose blob `brandTheme` rejects, a `component-progress` outside a pending build, and
 * `restore-input-empty` (its effect is on the brand session, in `main.ts`). Every accepted message
 * returns a new object, so `topicsFor` and `brandEffectFor` can tell a refusal from an acceptance by identity.
 */
export const reduce = (prev: HostSession, m: HostMessage): HostSession => {
  // Every verdict settles the agent's run of its operation first; the cases below read `s`.
  const s = settleAgent(prev, m);
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
    case 'agent-started': {
      const op = AGENT_OP[m.cmd];
      return op ? { ...s, agentRun: { id: m.id, op, settled: false, progress: null } } : s;
    }
    case 'agent-progress': {
      const r = s.agentRun;
      if (!r || r.id !== m.id || r.settled || r.op !== 'components') return s;
      return { ...s, agentRun: { ...r, progress: { phase: m.phase, done: m.done, total: m.total } } };
    }
    case 'agent-finished':
      return s.agentRun && s.agentRun.id === m.id ? { ...s, agentRun: null } : s;
    case 'refused': {
      const op = AGENT_OP[m.cmd];
      if (!op || op === 'readback') return s;
      const next = { ...s, refused: { op, message: m.message, agent: m.agent, n: (s.refused?.n ?? 0) + 1 } };
      // The panel's own request, declined behind an agent's run: it posted, set `pending`, and will get no
      // verdict. A panel request declined behind the panel's own run leaves `pending` to that run's verdict.
      if (m.agent || s.agentRun?.op !== op) return next;
      return { ...next, ...unpend(op, s) };
    }
    case 'restore-input-error':
      return { ...s, restoreError: m.message };
    case 'font-list':
      return { ...s, hostFonts: m.families, hostFontStyles: new Map(m.families.map((f, i) => [f, m.styles[i] ?? 0])) };
    case 'apply-result':
      // A bad result opens its own detail; a clean one closes whatever was open, whose counts would
      // otherwise sit beside a pill that has just been replaced.
      return { ...s, applyState: { ok: m.ok, headline: m.headline, summary: m.summary }, openDetail: m.ok ? null : 'apply' };
    case 'component-result': {
      // The progress clears with the verdict, so a next build's first render cannot show this run's fraction.
      // S8.2 (G9): the verdict that answers the panel's own pending build is recorded against the set it posted.
      const own = s.componentState === 'pending' && s.componentDef !== null;
      const setBuilds = own ? new Map([...s.setBuilds, [s.componentDef as string, m.ok]]) : s.setBuilds;
      return { ...s, componentState: { ok: m.ok, headline: m.headline, summary: m.summary }, openDetail: m.ok ? null : 'components', componentProgress: null, componentDef: null, setBuilds };
    }
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
      if (m.applied) return { ...s, pruneBusy: false, pruneVerdict: { ok: m.ok, applied: true, count: m.count, summary: m.summary }, prunePreview: null };
      // An agent's preview: a pill, never the dialog, whose Confirm would prune against this panel's knobs.
      if (m.count > 0 && m.pillOnly) return { ...s, pruneBusy: false, prunePreview: null, pruneVerdict: { ok: m.ok, applied: false, count: m.count, summary: `Agent preview: ${m.summary}` } };
      if (m.count > 0) return { ...s, pruneBusy: false, prunePreview: { count: m.count, summary: m.summary }, pruneVerdict: null };
      return { ...s, pruneBusy: false, prunePreview: null, pruneVerdict: { ok: m.ok, applied: false, count: 0, summary: m.summary } };
    case 'seed-info':
      // Joins the two independent boot reads into one outcome (#721); `restore-input` repairs it if it lands later.
      return { ...s, seedOutcome: joinSeed({ present: m.present, ok: m.ok, detail: m.summary, failed: m.failed }, s.inputRecovered) };
  }
};

/**
 * The one thing a host message can do to the BRAND session rather than to this one, after `reduce`:
 *   - `loadBrand`: load the restored input as the file's brand (origin `file`).
 *   - `startFresh`: the fresh-file start moment (#1197), which `main.ts` runs only while nothing has been
 *     chosen yet — a guard on the brand session's provenance, so it stays there.
 * An EFFECT, not a repaint: it writes the brand session, whose own setters then invalidate `origin`,
 * `brand`, `page` and `mode`. No message both loads a brand and invalidates a host topic. Pure.
 */
export type BrandEffect = 'loadBrand' | 'startFresh';
export const brandEffectFor = (m: HostMessage, prev: HostSession, next: HostSession): BrandEffect | null => {
  if (m.kind === 'restore-input') return next === prev ? null : 'loadBrand';
  if (m.kind === 'restore-input-empty') return 'startFresh';
  return null;
};

/**
 * The host topics a message invalidates, given the session before (`prev`) and after (`next`) it, in the
 * order `main.ts` invalidates them. Pure (UI redesign P2; was `repaintsFor`, a list of repaint tags that a
 * switch in `main.ts` turned into calls).
 *
 * The switch is gone. Each surface that reads a topic subscribes to it beside its own painter
 * (`subscribe` in `state/store.ts`), so this function says WHAT CHANGED and never who paints it. That is
 * the split #1845 asked for: the tag list was tested here, the tag-to-repaint mapping was not, and
 * dropping the File setup case passed every gate. The mapping is now a subscription, and
 * `apps/plugin/test-build-verdict.mjs` tests it the only way it can be — by posting each message to the
 * built panel and reading the surface back.
 *
 * A verdict invalidates its page row's topic as well as the chrome's (#870): the action's button is page
 * content, so a verdict that reached only the chrome left the button disabled.
 */
export const topicsFor = (m: HostMessage, prev: HostSession, next: HostSession): readonly HostTopic[] => {
  switch (m.kind) {
    case 'restore-input': return [];
    case 'restore-input-empty': return [];
    case 'restore-input-error': return ['host'];
    case 'font-list': return ['fonts'];
    case 'apply-result': return ['host', 'host:detail'];
    case 'component-result': return ['host', 'host:detail', 'host:components'];
    case 'file-setup-result': return ['host', 'host:detail', 'host:filesetup'];
    case 'style-guide-result': return ['host', 'host:detail', 'host:styleguide'];
    case 'component-progress': return next === prev ? [] : ['host:progress'];
    case 'prune-result': return ['host'];
    case 'seed-info': return ['host'];
    // UI redesign S11: the Activity drawer's agent rows. A start or an end it does not show moves nothing.
    case 'agent-started': return next === prev ? [] : ['host'];
    case 'agent-finished': return next === prev ? [] : ['host'];
    case 'agent-progress': return next === prev ? [] : ['host:progress'];
    // #1957: the drawer's row, plus the page row whose control a declined panel request left pending.
    case 'refused': {
      if (next === prev) return [];
      const page: HostTopic | null = next.componentState !== prev.componentState ? 'host:components'
        : next.fileSetupState !== prev.fileSetupState ? 'host:filesetup' : next.styleGuideState !== prev.styleGuideState ? 'host:styleguide' : null;
      return page ? ['host', page] : ['host'];
    }
  }
};
