/**
 * The Activity drawer and the Activity button (UI redesign S1.4 and S11, `docs/superpowers/ui-redesign/implementation-plan.md`
 * §3.9; the owner's F2, and v5 Q9 for the 4 s collapse).
 *
 * WHAT IT HOLDS SINCE S11: concept v6's activity model. One row per operation that has run in this session
 * (Apply Theme, Build set, Set up file, Style guides, Prune stale, Read-back, Specs), each with its verdict, the
 * time it started, a body that says what it is doing or what it found, and its earlier results. An
 * operation an agent ran is tagged Agent, running and after (#1788). The drawer's bar row is v6's: the
 * newest operation's title and phase or verdict, its time, and how many are running or need attention.
 *
 * The verdicts are the host's own headlines, unchanged, and the bodies its summaries: this slice moves
 * where they are shown and invents none of them. Errors grouped by cause, the counts toggles and the modes
 * table v6 draws need structured results from the writers, which today send prose; they are a follow-up.
 *
 * F2, AS BUILT HERE. The Activity button in the top bar shows and hides the drawer at any time, and its
 * status dot says what concept v6's says: an operation running, a result that needs attention, or a new
 * result nobody has opened. The drawer opens by itself when an operation starts, collapses by itself
 * `COLLAPSE_MS` after a success (unless it was opened by hand, another operation is still running, or
 * focus or the pointer is inside it), and stays open on a failure or a warning until it is closed. A
 * write's verdict is `ok: false` for both a failure and a warning, so both keep it open, and both count
 * as needing attention. At 380 an operation shows in the strip (the drawer's bar row, pinned to the
 * bottom edge) instead of opening the drawer, and a failure or a warning opens the full-pane sheet.
 *
 * HOW IT LEARNS WHAT HAPPENED: store topics, never a legacy repaint tier (plan §3.10). `main.ts` lends a
 * pure reading of its host session (`ActivitySource`): each operation's state, its verdict and summary,
 * its phase and progress while it runs, and whether an agent ran it; and which result a page asked to be
 * shown. The drawer subscribes to `host` and `host:detail`, compares the reading with the last one, and
 * reacts to the change: an operation that started, one that finished well, one that finished badly. The
 * history and the times are the drawer's own: they are what it saw happen, not host state. `host:progress`
 * rewrites the running build's progress in place, as the page's pill does.
 *
 * The drawer sits at the bottom of the frame, pinned to the bottom edge, so it works on every page while
 * every page is legacy: under the legacy frame, or under the preview pane once a page moves (S2).
 *
 * DIRECTION A OF #3113 (the owner, 2026-10-28: Q3113.1–10 all A). The bar row leads with one state glyph in its status
 * ink, the newest result and its time, then split counts ("1 failed", "1 warning"; "n running" only while more than one
 * runs), and the agent link as a glyph, a dot and one word. The rows put attention first; each marks its verdict with a
 * glyph in its status ink and the verdict's words, never a pill. A bad result leads with its reason in the UI face, then
 * offers generic next steps (`AGAIN`, Copy details). Earlier results are one line each. At 380 the open sheet has a header
 * row of its own (a close icon, "Activity", the counts, the agent dot). In the plugin the bar row is drawn from launch, and
 * a dot on it marks a result nobody has opened. Fixes for a specific cause wait for structured results from the writers.
 */
import { subscribe } from '../state/store';
import type { OpKey } from '../state/host-session';
import type { Host } from './pages';
import { glyph, h, hook, tile } from './dom';

/** Whether the plugin's agent link is on (the owner's top-bar decision, 2026-10-05: Activity's name and tooltip say
 *  "agent link on" while it is). The plugin's Agent tile (`apps/plugin/src/agent-link-ui.ts`) reports each state the
 *  main thread publishes; the studio never sets it, so on the web it stays off. */
let agentLinkOn = false;
const linkWatchers = new Set<() => void>();
export const setAgentLinkOn = (on: boolean): void => {
  if (on === agentLinkOn) return;
  agentLinkOn = on;
  for (const f of linkWatchers) f();
};

/** The agent link's status (#2213; the owner's N1 A and AS1 A, 2026-10-06), as the plugin words it
 *  (`apps/plugin/src/agent-link-ui.ts`). `short` is the bar row's one word ("Listening", Q3113.7 A), drawn at the far
 *  right of the drawer's bar row beside the caret after the link's glyph and a dot (the glyph and the dot alone at 380),
 *  `error` drawing the dot and the word in the chrome's error inks and otherwise quiet; `null` draws none. `full` is the link's whole status line (`agentLinkStatusText`), the open drawer's first line
 *  and the short status's tooltip and accessible name; `null` draws none. The plugin's Agent tile reports it with each
 *  published state; the studio never sets it, so on the web there is none. */
export type AgentLinkStatus = { readonly short: string | null; readonly error: boolean; readonly full: string | null };
let agentLinkStatus: AgentLinkStatus = { short: null, error: false, full: null };
export const setAgentLinkStatus = (st: AgentLinkStatus): void => {
  if (st.short === agentLinkStatus.short && st.error === agentLinkStatus.error && st.full === agentLinkStatus.full) return;
  agentLinkStatus = { short: st.short, error: st.error, full: st.full };
  for (const f of linkWatchers) f();
};

/** F2, v5 Q9: how long the drawer stays open after a success before it collapses by itself. */
export const COLLAPSE_MS = 4000;
/** A collapse that comes due while focus or the pointer is inside the drawer waits this long, then looks
 *  again (concept v6). */
export const COLLAPSE_RECHECK_MS = 1500;
/** Earlier results kept per operation (concept v6). */
export const HISTORY_MAX = 5;

/** Concept v6's operation titles (`OP_TITLE`). The drawer lists operations in the order they first ran. */
export const OP_TITLE: Readonly<Record<OpKey, string>> = {
  // "Style guides" since S11.2 (owner decision P11), matching the Build style guides page.
  'apply': 'Apply Theme', components: 'Build set', filesetup: 'Set up file', styleguide: 'Style guides', prune: 'Prune stale', readback: 'Read-back',
  // #2830 Q713 A: Documentation › Specs' Draw specs, a row of its own. DRAFT wording (Q685 A).
  specs: 'Specs',
};

// ── the open drawer's height (#2176, the owner's AD1–AD3, 2026-10-05) ───────────────────────────────
// At the wide tier, while the drawer is open, a handle on its top edge drags it taller: from today's open height (the
// drawer as it draws with no height set) up to just under the preview header. The handle is a window splitter
// (`role="separator"`): Arrow Up and Arrow Down move it by `HEIGHT_STEP`, Home and End go to the least and the most.
// The height is kept per person under `prism3:activity-height`: the web keeps it in `localStorage` (`entry.ts`,
// `persist-local.ts`); the plugin's iframe has no storage, so its UI entry posts each kept height to the main thread,
// which keeps it in `figma.clientStorage` and sends it back on `ui-ready`, like the Theme choice
// (`apps/plugin/src/ui/entry.ts`, `apps/plugin/src/main.ts`). At 380 the drawer stays a sheet and draws no handle (AD2).

/** How far one Arrow Up or Arrow Down moves the handle, in CSS pixels. */
export const HEIGHT_STEP = 24;
/** A kept height is a positive, finite number of pixels; anything else is no height (today's). */
export const heightOf = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null);
let keptHeight: number | null = null;
let keepHeight: ((px: number) => void) | null = null;
const heightWatchers = new Set<() => void>();
/** Each host hands over the height it kept, if any, and how to keep the next one: the web before the first render,
 *  the plugin's UI entry right after it (its kept height arrives later, through `restoreActivityHeight`). */
export const initActivityHeight = (kept: unknown, keep: (px: number) => void): void => {
  keptHeight = heightOf(kept);
  keepHeight = keep;
  for (const f of heightWatchers) f();
};
/** Plugin only: the height the main thread kept, arriving after launch. Anything that is not a height is ignored. */
export const restoreActivityHeight = (v: unknown): void => {
  const px = heightOf(v);
  if (px === null || px === keptHeight) return;
  keptHeight = px;
  for (const f of heightWatchers) f();
};

/**
 * THE LIBRARY PUBLISH DESCRIPTION (#2858, owner decision Q479): after an Update, the text for Figma's Publish library
 * dialog, with a Copy button. No Plugin API call sets a library's publish description, so the designer pastes it.
 * A Figma plugin's iframe may refuse the async clipboard, so the copy falls back to a selected textarea and
 * `execCommand('copy')`, and when that is refused too it selects the text and says so. DRAFT wording.
 */
/** Copy text from a Figma plugin's iframe, which may refuse the async clipboard: then a selected textarea and
 *  `execCommand('copy')`. Whether it was copied. */
const copyText = async (text: string): Promise<boolean> => {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* the iframe refused it: try the textarea */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.append(ta);
  ta.select();
  let done = false;
  try { done = document.execCommand('copy'); } catch { done = false; }
  ta.remove();
  return done;
};

export const publishBlock = (text: string): HTMLElement => {
  const box = hook(h('div', 'p3-op-publish'), 'op-publish');
  const head = h('div', 'p3-op-publish-head');
  const copy = hook(h('button', 'p3-btn', 'Copy'), 'op-publish-copy');
  copy.type = 'button';
  head.append(h('b', undefined, 'Publish description'), copy);
  const body = hook(h('pre', 'p3-op-publish-text', text), 'op-publish-text');
  const state = hook(h('p', 'p3-note', "Paste it into Publish library in Figma's Assets panel."), 'op-publish-state');
  state.setAttribute('aria-live', 'polite');
  const select = (): void => {
    const r = document.createRange();
    r.selectNodeContents(body);
    const sel = getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  };
  copy.onclick = async () => {
    const done = await copyText(text);
    if (done) state.textContent = 'Copied.';
    else { select(); state.textContent = 'Selected. Copy it with your keyboard.'; }
  };
  box.append(head, body, state);
  return box;
};

/** One operation, as the drawer reads it. `ref` is the state's own value, so a new verdict that replaces
 *  an equal one is still a change. `verdict` and `summary` are the host's, once it has answered; `phase`
 *  and `progress` say how far it has got while it runs. */
export type OpState = 'idle' | 'running' | 'ok' | 'bad';
export type OpReading = {
  readonly state: OpState;
  readonly ref: unknown;
  readonly verdict: string | null;
  readonly summary: string | null;
  /** The summary's items, one line each (#2177), when the host sent them; otherwise the summary is one line. */
  readonly lines?: readonly string[] | null;
  /** #2858: an Update's library publish description, offered with a Copy button under the result's lines. */
  readonly publish?: string | null;
  readonly phase: string | null;
  readonly progress: { readonly done: number; readonly total: number } | null;
  readonly agent: boolean;
  /** How far a style guide has got, for the closed strip at 380 only (S11.2); its row says it in words. */
  readonly strip?: { readonly done: number; readonly total: number } | null;
  /** How many of the things the run was asked to make failed, when the write reports it as data (the style guide's
   *  tables, S11.2). Above 0, a result is a failure whatever its headline's mark (D-RED A, decision (a)). */
  readonly failed?: number;
};
/** A write the main thread declined while a run of the same operation was going (#1957). `n` counts
 *  them, so each is a change. */
export type Refusal = { readonly op: OpKey; readonly message: string; readonly agent: boolean; readonly n: number };
/** What `main.ts` lends: every operation by key, the result a page asked to show (a page's verdict
 *  pill clicked, or a bad verdict landing), `null` when none is, and the last refusal. Pure; no DOM. */
export type ActivityReading = { readonly ops: Readonly<Record<OpKey, OpReading>>; readonly detail: OpKey | null; readonly refused: Refusal | null };
export type ActivitySource = () => ActivityReading;
/** What `main.ts` lends the drawer: the reading, and how to say a requested result has been shown. `again` (#3113,
 *  Q3113.4 A) runs an operation again through the write call Update file, Components or Documentation already makes, with
 *  no new message: `can` says whether it may start now (nothing else in its way), `run` starts it. Absent, no
 *  operation offers to run again. */
export type ActivityLend = { readonly read: ActivitySource; readonly closeDetail: () => void;
  readonly again?: { readonly can: (k: OpKey) => boolean; readonly run: (k: OpKey) => void } };

/** Q3113.4 A: a bad result's next step that runs it again, by operation (DRAFT wording). The boot read-back has none:
 *  nothing in the panel asks for it. */
export const AGAIN: Readonly<Partial<Record<OpKey, string>>> = {
  'apply': 'Apply again', components: 'Build again', filesetup: 'Set up again', styleguide: 'Run again', prune: 'Run again', specs: 'Run again',
};
/** Q3113.4 A: every bad result's last next step (DRAFT wording). */
export const COPY_DETAILS = 'Copy details';

/** How a result reads (Q3113.2 A): clean, a warning or a failure. A write's verdict is `ok: false` for a failure and a
 *  warning alike. A bad result is a warning when its headline leads with "⚠" and it reports nothing it was asked to make as
 *  failed; any other bad result is a failure (the owner's D-RED A). */
export type Kind = 'ok' | 'warn' | 'bad';
export const kindOf = (ok: boolean, verdict: string | null, failed?: number): Kind =>
  ok ? 'ok' : (verdict ?? '').startsWith('\u26a0') && !((failed ?? 0) > 0) ? 'warn' : 'bad';
/** A verdict's words without its leading mark (Q3113.2 A): the glyph says what the mark said. */
export const verdictWords = (verdict: string | null): string => (verdict ?? '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
/** Q3113.3 A: the split counts (DRAFT wording). */
export const failedWords = (n: number): string => `${n} failed`;
export const warningWords = (n: number): string => `${n} ${n === 1 ? 'warning' : 'warnings'}`;
const KIND_GLYPH = { ok: 'check', warn: 'warn', bad: 'error' } as const;

export type Activity = {
  /** The Activity button, for the top bar. */
  readonly button: HTMLButtonElement;
  /** The drawer, at the bottom of the frame. */
  readonly drawer: HTMLElement;
  /** The status line a write's start and finish are announced on, for the top bar: outside the drawer, which is not
   *  drawn until something has run, so it is in the document before its first announcement. */
  readonly live: HTMLElement;
};

/** The words the Activity button's name adds: concept v6's, with the attention count split (Q3113.3 A). */
const statusWords = (running: number, failures: number, warnings: number, unread: boolean): string =>
  [running && `${running} running`, failures && failedWords(failures), warnings && warningWords(warnings), !running && !failures && !warnings && unread && 'new result']
    .filter(Boolean).join(', ');

/** The status line's words when a run finishes (Q194, #2487; DRAFT wording). A clean run is "finished"; a bad one names
 *  its reason, the first line of the host's detail (or its headline, without the leading mark, when it sent none). A
 *  warning reads "finished with a warning", since the run did finish; a failure reads "failed", told apart as the Activity
 *  button counts them (a "⚠" verdict is a warning unless the run reports something it was asked to make failed). */
export const finishLine = (k: OpKey, o: Pick<OpReading, 'state' | 'verdict' | 'summary' | 'lines' | 'failed'>): string => {
  if (o.state !== 'bad') return `${OP_TITLE[k]} finished.`;
  const bare = (o.verdict ?? '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  const reason = (o.lines?.find((l) => l.trim()) ?? o.summary?.split('\n').find((l) => l.trim()) ?? bare).trim().replace(/[.\s]+$/, '');
  const warning = kindOf(false, o.verdict, o.failed) === 'warn';
  return `${OP_TITLE[k]} ${warning ? 'finished with a warning' : 'failed'}${reason ? `: ${reason}` : ''}.`;
};

/** A clock time, HH:MM, as concept v6 stamps an operation. */
const clock = (d: Date): string => d.toTimeString().slice(0, 5);

/** One result, as the drawer recorded it. `refused` marks a declined request (#1957), which is only ever
 *  history: it is not the operation's result, so a run that ends with no verdict skips it. */
type Result = { readonly ok: boolean; readonly verdict: string; readonly summary: string | null; readonly lines?: readonly string[] | null; readonly publish?: string | null; readonly agent: boolean; readonly t: string; readonly ref: unknown; readonly refused?: true;
  /** What the run reported as failed, as data (`OpReading.failed`), so a "⚠" result with a failed item is a failure. */
  readonly failed?: number };
/** A recorded result's kind. A declined request (#1957) is not a failure: the running write goes on. */
const kindOfResult = (r: Result): Kind => (r.refused ? 'ok' : kindOf(r.ok, r.verdict, r.failed));
/** The state's mark (Q3113.2 A): a glyph in its status ink, or the running ring, which says what the bar's dot said. */
const markOf = (state: Kind | 'run'): HTMLElement => {
  const m = h('span', state === 'run' ? 'p3-dot p3-status-dot p3-op-mark' : 'p3-op-mark');
  m.dataset.state = state;
  m.setAttribute('aria-hidden', 'true');
  if (state !== 'run') m.append(glyph(KIND_GLYPH[state]));
  return m;
};
/** Where a bad result's details split (Q3113.5 A): its reason, the first line, set in the UI face; the rest, mono. */
const splitLines = (r: Pick<Result, 'summary' | 'lines'>): { reason: string | null; rest: readonly string[] } => {
  const all = (r.lines?.length ? r.lines : r.summary ? [r.summary] : []).filter((l) => l.trim());
  return { reason: all[0] ?? null, rest: all.slice(1) };
};
/** One operation's record: what the drawer has seen of it this session. */
type Rec = { t: string; result: Result | null; history: Result[] };

const EMPTY: OpReading = { state: 'idle', ref: null, verdict: null, summary: null, phase: null, progress: null, agent: false };

/** Mount the drawer and its button. `narrow` reads the frame's width tier; `cleanups` takes the
 *  subscriptions and the pending collapse. `now` is the clock the times are read from. */
export const mountActivity = (opts: { readonly host: Host; readonly lend: ActivityLend; readonly narrow: () => boolean; readonly now?: () => Date;
  /** An operation the page in view shows itself (S11.2, owner decision P1 variant 1: the Build style guides page and
   *  the style guide): the drawer does not open by itself when it starts or fails. Its row, the bar row and the dot
   *  still record it. */
  readonly quiet?: (k: OpKey) => boolean;
  /** #2176: the frame the drawer sits in, which carries the drawn height (`--p3-activity-h`) for the preview pane's
   *  layout too, and the y, in the viewport, the drawer may grow up to: the preview header's bottom. */
  readonly room?: { readonly frame: HTMLElement; readonly ceiling: () => number } }, cleanups: (() => void)[]): Activity => {
  const { narrow } = opts;
  const now = opts.now ?? (() => new Date());
  const { read, closeDetail } = opts.lend;

  // ── the button, in the top bar ─────────────────────────────────────────────────────────────────
  // A bar tile (the owner's top-bar decision, 2026-10-05): the glyph and its status dot over "Activity", the glyph
  // alone when narrow. The name, and the tooltip, are "Activity" plus the agent link and the status words.
  const { btn: button, mark, tip } = tile('activity-open', 'Activity');
  button.classList.add('p3-activity-btn');
  button.setAttribute('aria-controls', 'p3-activity');
  const dot = h('span', 'p3-dot p3-status-dot');
  dot.setAttribute('aria-hidden', 'true');
  mark.append(glyph('pulse'), dot);

  // ── the drawer ─────────────────────────────────────────────────────────────────────────────────
  const drawer = hook(h('section', 'p3-drawer'), 'activity-drawer');
  drawer.id = 'p3-activity';
  drawer.setAttribute('aria-label', 'Activity');
  // The bar row is one button, as v6's is: the newest operation, its time, the counts, and the chevron.
  const toggle = hook(h('button', 'p3-drawer-bar'), 'activity-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', 'p3-activity-body');
  const body = hook(h('div', 'p3-drawer-body'), 'activity-body');
  body.id = 'p3-activity-body';
  // v6's "Close Activity", which only the full-pane sheet at 380 shows: since Q3113.8 A a 24 × 24 icon in its header row,
  // named by its words.
  const close = hook(h('button', 'p3-btn p3-btn-ghost p3-btn-icon p3-drawer-close'), 'activity-close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close Activity');
  close.title = 'Close Activity';
  close.append(glyph('x'));
  const rows = h('div', 'p3-ops');
  // Q3113.8 A: the 380 sheet's header row: a close icon, "Activity", the counts and the agent dot. Only the full-pane
  // sheet draws it (the stylesheet hides it wider), and there the bar row gives way to it.
  const sheetHead = hook(h('div', 'p3-drawer-head'), 'activity-sheet-head');
  const sheetCounts = h('span', 'p3-drawer-counts');
  // Shown while nothing has run. The plugin's line is concept v6's; the studio runs no write.
  const note = hook(h('p', 'p3-note p3-drawer-note', opts.host === 'figma'
    ? 'Results of Apply, Build and Prune appear here after they run.'
    : 'Nothing has run in this session.'), 'activity-note');
  // The agent link's full status line (#2213, AS1 A): the open drawer's first line, above the runs, while the plugin
  // reports one.
  const linkDetail = hook(h('p', 'p3-note p3-drawer-note p3-drawer-linkline'), 'activity-agent-detail');
  const linkDot = h('span', 'p3-dot p3-drawer-link-dot');
  linkDot.setAttribute('aria-hidden', 'true');
  const linkText = h('span');
  linkDetail.append(glyph('agent'), linkDot, linkText);
  sheetHead.append(close, h('b', 'p3-drawer-title', 'Activity'), h('span', 'p3-spacer'), sheetCounts);
  body.append(sheetHead, linkDetail, rows, note);
  drawer.append(toggle, body);
  // A write's control says it is busy while the write runs, panel or agent, and a polite status line says
  // so once, when it starts (owner decision #4 on #1956, the engine Button's `isPending` aria note), and again when it
  // finishes (Q194, #2487: `finishLine`). One
  // line for every write, here, because the drawer is what hears an agent's run start. The words are the
  // row's: its title and its phase line.
  const live = hook(h('p', 'p3-sr p3-live'), 'activity-status');
  live.setAttribute('role', 'status');

  // ── the handle (#2176, AD1–AD3): drag the open drawer taller, at the wide tier ─────────────────────
  // A window splitter (the WAI-ARIA pattern): focusable, named "Resize Activity" (AD3), its value the drawer's height
  // in pixels, from today's open height to the room under the preview header. Shown only while the drawer is open;
  // the stylesheet drops it at the narrow tier (AD2). Its one mark is the pill inside it.
  const grip = hook(h('div', 'p3-drawer-grip'), 'activity-grip');
  grip.setAttribute('role', 'separator');
  grip.setAttribute('aria-orientation', 'horizontal');
  grip.setAttribute('aria-label', 'Resize Activity');
  grip.setAttribute('aria-controls', 'p3-activity');
  grip.tabIndex = 0;
  const pill = h('span', 'p3-drawer-pill');
  pill.setAttribute('aria-hidden', 'true');
  grip.append(pill);
  drawer.prepend(grip);

  // ── state ──────────────────────────────────────────────────────────────────────────────────────
  let open = false;     // the body shows
  let auto = false;     // it opened by itself, so it may collapse by itself
  let unread = false;   // a result landed while it was closed
  let timer: ReturnType<typeof setTimeout> | null = null;
  let last = read();
  /** Whether the status line holds a run's words (its start, or a declined request) rather than a finish (Q194). */
  let liveRunning = false;
  /** Every operation seen this session, in the order it first ran (v6). */
  const recs = new Map<OpKey, Rec>();
  /** The operations whose bodies are expanded. */
  const expanded = new Set<OpKey>();
  /** The rendered rows, keyed, so a repaint keeps the header that holds focus. */
  const rowEls = new Map<OpKey, { root: HTMLElement; head: HTMLButtonElement; mark: HTMLElement; tag: HTMLElement; words: HTMLElement; when: HTMLElement; body: HTMLElement; progress: HTMLElement | null }>();

  /** How many run, and how many results are bad (`failed`), split into failures and warnings (Q3113.3 A). */
  const counts = (r: ActivityReading): { running: number; failed: number; failures: number; warnings: number } => {
    const ops = Object.values(r.ops);
    const bad = ops.filter((o) => o.state === 'bad');
    const failures = bad.filter((o) => kindOf(false, o.verdict, o.failed) === 'bad').length;
    return { running: ops.filter((o) => o.state === 'running').length, failed: bad.length, failures, warnings: bad.length - failures };
  };
  /** The split counts as drawn (Q3113.3 A): "1 failed" in the error ink after the error glyph, "1 warning" in the text ink
   *  after the warning glyph, and "n running" only while more than one runs (the lead row says a lone run). */
  const countEls = (): HTMLElement[] => {
    const { running, failures, warnings } = counts(last);
    const one = (kind: 'bad' | 'warn' | 'run', words: string): HTMLElement => {
      const c = hook(h('span', 'p3-drawer-count'), 'activity-count');
      c.dataset.kind = kind;
      if (kind !== 'run') c.append(glyph(KIND_GLYPH[kind]));
      c.append(words);
      return c;
    };
    return [failures && one('bad', failedWords(failures)), warnings && one('warn', warningWords(warnings)), running > 1 && one('run', `${running} running`)]
      .filter((x): x is HTMLElement => !!x);
  };
  const clear = (): void => { if (timer !== null) clearTimeout(timer); timer = null; };
  const collapse = (): void => { open = false; auto = false; };

  // ── the height (#2176) ─────────────────────────────────────────────────────────────────────────
  /** Whether the handle can size the drawer now: open, wide, and in the document. */
  const sizable = (): boolean => open && !narrow() && drawer.isConnected;
  /** The drawer's range now: today's open height (the drawer as it draws with no height set), up to the room under the
   *  ceiling the frame lends. Never less than the first. */
  const range = (): { min: number; max: number } => {
    const was = drawer.dataset.sized;
    drawer.dataset.sized = 'false';
    const box = drawer.getBoundingClientRect();
    if (was !== undefined) drawer.dataset.sized = was;
    const min = Math.ceil(box.height);
    const max = opts.room ? Math.floor(box.bottom - opts.room.ceiling()) : min;
    return { min, max: Math.max(min, max) };
  };
  const within = (px: number, r: { min: number; max: number }): number => Math.min(r.max, Math.max(r.min, Math.round(px)));
  /** Draw the kept height, clamped to the range, and say it on the handle. With no kept height the drawer draws as it
   *  always has. Closed or narrow, no height is drawn. */
  const sizeDrawer = (): void => {
    if (!sizable()) {
      drawer.dataset.sized = 'false';
      opts.room?.frame.style.removeProperty('--p3-activity-h');
      return;
    }
    const r = range();
    const px = keptHeight === null ? r.min : within(keptHeight, r);
    if (keptHeight !== null) opts.room?.frame.style.setProperty('--p3-activity-h', `${px}px`);
    drawer.dataset.sized = String(keptHeight !== null && !!opts.room);
    grip.setAttribute('aria-valuemin', String(r.min));
    grip.setAttribute('aria-valuemax', String(r.max));
    grip.setAttribute('aria-valuenow', String(px));
  };
  /** The height drawn now, as the handle reads it. */
  const drawnHeight = (r: { min: number; max: number }): number => (keptHeight === null ? r.min : within(keptHeight, r));
  /** Keep the height the person chose, through the host's store. */
  const keepNow = (): void => { if (keptHeight !== null) keepHeight?.(keptHeight); };
  const resize = (px: number, r: { min: number; max: number }): void => { keptHeight = within(px, r); sizeDrawer(); };

  // ── painting ───────────────────────────────────────────────────────────────────────────────────
  /** The running operation's phase line and progress bar (v6 `progressHtml`). */
  const progressEl = (title: string, o: OpReading): HTMLElement => {
    const wrap = hook(h('div', 'p3-op-phase'), 'op-progress');
    const line = h('span');
    line.append(h('b', undefined, o.phase ?? 'Running'));
    if (o.progress && o.progress.total > 1) line.append(` ${o.progress.done} of ${o.progress.total}`);
    wrap.append(line);
    if (o.progress) {
      // A native `progress`, where v6 sized an `<i>` with an inline width: the chrome sets no inline value
      // and its stylesheet reads only its own variables, and the element carries the progressbar role itself.
      const bar = h('progress', 'p3-op-prog') as HTMLProgressElement;
      bar.max = o.progress.total;
      bar.value = o.progress.done;
      bar.setAttribute('aria-label', o.phase ?? title);
      wrap.append(bar);
    }
    return wrap;
  };

  /** Q3113.4 A: a bad result's next steps: run it again (a panel result only: an agent's ran with the agent's input, not
   *  the panel's), then Copy details. Available only while nothing is in the run's way (`again.can`). */
  const nextSteps = (k: OpKey, res: Result): HTMLElement => {
    const box = hook(h('div', 'p3-op-next'), 'op-next');
    const label = AGAIN[k];
    const again = opts.lend.again;
    if (label && again && !res.agent) {
      const b = hook(h('button', 'p3-btn', label), 'op-again');
      b.type = 'button';
      const can = again.can(k);
      if (!can) b.setAttribute('aria-disabled', 'true');
      b.onclick = () => { if (again.can(k)) again.run(k); };
      box.append(b);
    }
    const copy = hook(h('button', 'p3-btn p3-btn-ghost', COPY_DETAILS), 'op-copy');
    copy.type = 'button';
    const said = hook(h('span', 'p3-note p3-op-copied'), 'op-copied');
    said.setAttribute('aria-live', 'polite');
    const text = [`${OP_TITLE[k]}: ${res.verdict}`, ...(res.lines?.length ? res.lines : res.summary ? [res.summary] : [])].join('\n');
    copy.onclick = async () => { said.textContent = (await copyText(text)) ? 'Copied.' : 'Not copied. Select the lines and copy them with your keyboard.'; };
    box.append(copy, said);
    return box;
  };

  /** A result's lines (#2177): one per item, each in the chrome's mono font, a long one wrapping inside the drawer. A
   *  list, so a screen reader reads them in order and says how many. A bad result's first line is its reason, set apart
   *  in the UI face (Q3113.5 A). */
  const linesOf = (res: Result, hookOf: { list: string; line: string; reason: string }): HTMLElement[] => {
    const bad = kindOfResult(res) !== 'ok';
    const { reason, rest } = bad ? splitLines(res) : { reason: null, rest: (res.lines?.length ? res.lines : res.summary ? [res.summary] : []) };
    const out: HTMLElement[] = [];
    if (reason) out.push(hook(h('p', 'p3-op-reason', reason), hookOf.reason));
    if (rest.length) {
      const list = hook(h('ul', 'p3-op-summary'), hookOf.list);
      for (const line of rest) list.append(hook(h('li', 'p3-op-line', line), hookOf.line));
      out.push(list);
    }
    return out;
  };

  const paintRow = (k: OpKey, rec: Rec, o: OpReading): void => {
    let el = rowEls.get(k);
    if (!el) {
      const root = hook(h('div', 'p3-op'), 'activity-op');
      root.dataset.op = k;
      const head = hook(h('button', 'p3-op-head'), 'op-head');
      head.type = 'button';
      head.id = `p3-op-${k}-h`;
      head.setAttribute('aria-controls', `p3-op-${k}-b`);
      const tag = h('span', 'p3-op-agent');
      tag.append(glyph('agent'), 'Agent');
      // Q3113.2 A: the verdict's words, after the mark, where the pill was.
      const words = hook(h('span', 'p3-op-verdict'), 'op-verdict');
      const mark = h('span', 'p3-op-markslot');
      const when = h('span', 'p3-op-when');
      head.append(glyph('chevr'), mark, h('b', undefined, OP_TITLE[k]), words, tag, when);
      const b = hook(h('div', 'p3-op-body'), 'op-body');
      b.id = `p3-op-${k}-b`;
      head.onclick = () => { if (expanded.has(k)) expanded.delete(k); else expanded.add(k); paint(); };
      root.append(head, b);
      el = { root, head, mark, tag, words, when, body: b, progress: null };
      rowEls.set(k, el);
    }
    const running = o.state === 'running';
    const res = rec.result;
    const kind: Kind | 'run' | null = running ? 'run' : res ? kindOfResult(res) : null;
    el.tag.hidden = !(running ? o.agent : res?.agent);
    if (el.mark.firstElementChild?.getAttribute('data-state') !== kind) el.mark.replaceChildren(...(kind ? [markOf(kind)] : []));
    el.words.dataset.state = kind ?? 'idle';
    const words = running ? 'Running' : res ? verdictWords(res.verdict) : '';
    if (el.words.textContent !== words) el.words.textContent = words;
    el.words.hidden = !running && !res;
    el.root.dataset.state = running ? 'running' : res ? (res.ok ? 'ok' : 'bad') : 'idle';
    el.root.dataset.kind = kind ?? 'idle';
    if (el.when.textContent !== rec.t) el.when.textContent = rec.t;
    const isOpen = expanded.has(k);
    el.head.setAttribute('aria-expanded', String(isOpen));
    el.body.hidden = !isOpen;
    const parts: Node[] = [];
    el.progress = null;
    if (running) {
      el.progress = progressEl(OP_TITLE[k], o);
      parts.push(el.progress);
      // True of this plugin: the build lands each set on its own page and shows it (v6's line).
      if (k === 'components') parts.push(h('p', 'p3-note', "Build set switches Figma to the set's page."));
    } else if (res) {
      parts.push(...linesOf(res, { list: 'op-summary', line: 'op-line', reason: 'op-reason' }));
      if (res.publish) parts.push(publishBlock(res.publish));
      if (!res.ok) parts.push(nextSteps(k, res));
    }
    if (rec.history.length) {
      const d = hook(h('details', 'p3-op-history'), 'op-history');
      d.append(h('summary', undefined, `Earlier results (${rec.history.length})`));
      const ul = h('ul');
      // Q3113.6 A: each earlier result is one line, its time, its mark and its words (and Agent), that opens its own
      // lines (#2281's mono list). Never in the live region, so nothing here is announced.
      const wasOpen = new Set([...el.body.querySelectorAll<HTMLDetailsElement>('details.p3-op-entry')].map((x, i) => (x.open ? i : -1)));
      rec.history.forEach((x, i) => {
        const entry = hook(h('li', 'p3-op-entry-row'), 'op-history-entry');
        const head = hook(h('span', 'p3-op-entry-head'), 'op-history-head');
        head.append(markOf(kindOfResult(x)), h('span', 'p3-op-when', x.t), h('span', undefined, x.refused ? x.verdict : verdictWords(x.verdict)));
        if (x.agent) { const tag = h('span', 'p3-op-agent'); tag.append(glyph('agent'), 'Agent'); head.append(tag); }
        const lines = x.summary ? linesOf(x, { list: 'op-history-lines', line: 'op-history-line', reason: 'op-history-reason' }) : [];
        if (lines.length) {
          head.prepend(glyph('chevr'));
          const one = h('details', 'p3-op-entry') as HTMLDetailsElement;
          const sum = h('summary');
          sum.append(head);
          one.append(sum, ...lines);
          if (wasOpen.has(i)) one.open = true;
          entry.append(one);
        } else entry.append(head);
        ul.append(entry);
      });
      d.append(ul);
      // A repaint keeps an open history open.
      const was = el.body.querySelector('details.p3-op-history');
      if ((was as HTMLDetailsElement | null)?.open) d.open = true;
      parts.push(d);
    }
    el.body.replaceChildren(...parts);
  };

  /** The operation the bar row leads with: one running, else the newest result (v6). */
  const leadOf = (): OpKey | null => {
    const keys = [...recs.keys()];
    const run = keys.find((k) => last.ops[k].state === 'running');
    if (run) return run;
    return keys.reduce<OpKey | null>((a, k) => (a === null || recs.get(k)!.t >= recs.get(a)!.t ? k : a), null);
  };

  /** The agent link's status as drawn (Q3113.7 A): the link's glyph, a dot and its one word, the word hidden at 380 by the
   *  stylesheet. Its tooltip, and the rest of its accessible name, are the link's full line. */
  const linkEl = (): HTMLElement | null => {
    if (!agentLinkStatus.short) return null;
    const ln = hook(h('span', 'p3-drawer-link'), 'activity-agent-link');
    ln.dataset.error = String(agentLinkStatus.error);
    const dot = h('span', 'p3-dot p3-drawer-link-dot');
    dot.setAttribute('aria-hidden', 'true');
    ln.append(glyph('agent'), dot, hook(h('span', 'p3-drawer-link-word', agentLinkStatus.short), 'activity-agent-word'));
    if (agentLinkStatus.full) { ln.title = agentLinkStatus.full; ln.append(h('span', 'p3-sr', agentLinkStatus.full)); }
    return ln;
  };

  const paintBar = (): void => {
    const lead = leadOf();
    // The row's text runs (the summary, its time, the counts and the agent status) share one baseline: they sit in a
    // baseline-aligned run of their own (#2213, the owner's review), centered in the row with the mark and the caret,
    // because centering texts of two sizes one by one sets their baselines apart.
    const lead0: Node[] = [];
    const parts: Node[] = [];
    if (lead) {
      const o = last.ops[lead];
      const rec = recs.get(lead)!;
      const run = o.state === 'running';
      const kind: Kind | 'run' = run ? 'run' : rec.result ? kindOfResult(rec.result) : 'ok';
      lead0.push(markOf(kind));
      const text = h('span', 'p3-drawer-last');
      const words = hook(h('span', 'p3-drawer-verdict', run ? o.phase ?? 'Running' : verdictWords(rec.result?.verdict ?? null)), 'activity-verdict');
      words.dataset.state = kind;
      text.append(h('b', undefined, OP_TITLE[lead]), ' ', words);
      parts.push(text, h('span', 'p3-op-when', rec.t));
      // At 380, the closed strip carries the running style guide's progress (the S11.2 mockup, variant 1).
      if (run && lead === 'styleguide' && o.strip && narrow() && !open) {
        const bar = hook(h('progress', 'p3-op-prog p3-strip-prog'), 'activity-strip-progress') as HTMLProgressElement;
        bar.max = o.strip.total;
        bar.value = o.strip.done;
        bar.setAttribute('aria-hidden', 'true');
        parts.push(bar);
      }
    } else {
      lead0.push(glyph('pulse'));
      parts.push(h('span', 'p3-drawer-last', 'Activity'));
    }
    // Q3113.9 A: a dot on the bar row marks a result nobody has opened, now that no Activity tile carries it.
    if (unread) {
      const u = hook(h('span', 'p3-dot p3-status-dot'), 'activity-unread');
      u.dataset.state = 'unread';
      u.setAttribute('aria-hidden', 'true');
      lead0.push(u);
      parts.push(h('span', 'p3-sr', 'New result'));
    }
    parts.push(h('span', 'p3-spacer'));
    parts.push(...countEls());
    // The agent link's status (#2213, AS1 A; Q3113.7 A), last before the caret.
    const ln = linkEl();
    if (ln) parts.push(ln);
    const runs = h('span', 'p3-drawer-text');
    runs.append(...parts);
    toggle.replaceChildren(...lead0, runs, glyph('chev'), h('span', 'p3-sr', `${open ? 'Collapse' : 'Expand'} Activity`));
    // The sheet's header row carries the same counts and the agent dot (Q3113.8 A).
    const sheetLink = linkEl();
    sheetCounts.replaceChildren(...countEls(), ...(sheetLink ? [sheetLink] : []));
  };

  /** Q3113.2 A: attention first (failures, then warnings), then what runs, then the rest, each in the order it first ran. */
  const rank = (k: OpKey): number => {
    const o = last.ops[k];
    if (o.state === 'running') return 2;
    const r = recs.get(k)?.result;
    const kind = r ? kindOfResult(r) : 'ok';
    return kind === 'bad' ? 0 : kind === 'warn' ? 1 : 3;
  };

  const paint = (): void => {
    const { running, failed, failures, warnings } = counts(last);
    drawer.dataset.open = String(open);
    // Q3113.9 A: the plugin draws the bar row from launch; the studio runs no write, so its drawer stays undrawn.
    drawer.dataset.ever = String(opts.host === 'figma' || recs.size > 0);
    grip.hidden = !open;
    // #2176: sized once this paint is done, so today's open height is measured with its rows in place.
    queueMicrotask(sizeDrawer);
    body.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-expanded', String(open));
    const kind = running ? 'run' : failed ? 'bad' : unread ? 'unread' : 'none';
    // The tile's dot (the owner's D-RED A, 2026-10-05): red only for a failure; a warning draws green like the rest.
    dot.dataset.state = kind === 'bad' && !failures ? 'warn' : kind;
    drawer.dataset.state = kind;
    const name = ['Activity', agentLinkOn && 'agent link on', statusWords(running, failures, warnings, unread)].filter(Boolean).join(', ');
    button.setAttribute('aria-label', name);
    // Only when it differs (#2487 A9): a same-value write replaces the text node, and the bar re-measures.
    if (tip.textContent !== name) tip.textContent = name;
    const had = document.activeElement;
    /** The row that holds focus, if one does, so a repaint that rebuilds its body (a next step that started a run) puts
     *  focus back on the row's header rather than on BODY. */
    const focusRow = [...rowEls.values()].find((r) => had instanceof Node && r.root.contains(had)) ?? null;
    paintBar();
    for (const [k, rec] of recs) paintRow(k, rec, last.ops[k]);
    const keys = [...recs.keys()];
    const order = keys.map((k, i) => [k, i] as const).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([k]) => rowEls.get(k)!.root);
    if (order.length !== rows.children.length || order.some((n, i) => rows.children[i] !== n)) {
      rows.replaceChildren(...order);
      // A row that moves keeps the focus it held (its header, or a control in it).
      if (had instanceof HTMLElement && had.isConnected && document.activeElement !== had && rows.contains(had)) had.focus({ preventScroll: true });
    }
    // A next step that started its run is gone with the body it sat in: focus goes to its row's header.
    if (focusRow && had instanceof HTMLElement && !had.isConnected && focusRow.root.isConnected) focusRow.head.focus({ preventScroll: true });
    note.hidden = recs.size > 0;
    // The agent link's full line heads the open drawer (Q3113.7 A), after the link's glyph and dot.
    if (linkText.textContent !== (agentLinkStatus.full ?? '')) linkText.textContent = agentLinkStatus.full ?? '';
    linkDetail.dataset.error = String(agentLinkStatus.error);
    linkDetail.hidden = !agentLinkStatus.full;
  };

  /** The collapse that comes due `COLLAPSE_MS` after a success. */
  const tick = (): void => {
    timer = null;
    if (!open || !auto) return;
    if (drawer.matches(':hover') || drawer.contains(document.activeElement)) { timer = setTimeout(tick, COLLAPSE_RECHECK_MS); return; }
    if (counts(last).running) return;   // another write started; its own result decides
    collapse();
    paint();
  };

  const show = (yes: boolean, byHand: boolean): void => {
    clear();
    if (yes) { open = true; unread = false; if (byHand) auto = false; }
    else collapse();
    paint();
  };

  const recOf = (k: OpKey): Rec => {
    let r = recs.get(k);
    if (!r) { r = { t: '', result: null, history: [] }; recs.set(k, r); }
    return r;
  };
  const resultOf = (o: OpReading, t: string): Result => ({ ok: o.state === 'ok', verdict: o.verdict ?? '', summary: o.summary, lines: o.lines ?? null, publish: o.publish ?? null, agent: o.agent, t, ref: o.ref, failed: o.failed ?? 0 });
  /** The previous result moves to the history, newest first, at most `HISTORY_MAX`. */
  const retire = (rec: Rec): void => {
    if (rec.result) rec.history = [rec.result, ...rec.history].slice(0, HISTORY_MAX);
    rec.result = null;
  };

  /** Compare the host's reading with the last one, and act on what moved (F2). */
  const onHost = (): void => {
    const cur = read();
    let started = false, settledOk = false, settledBad = false, landedOk = false, ended = false;
    /** What this reading says on the status line when a run finishes (Q194), in the order the runs are read. */
    const said: string[] = [];
    // A quiet operation (S11.2) is recorded like any other, but opens nothing by itself.
    const loud = (k: OpKey): boolean => !opts.quiet?.(k);
    /** Quiet operations whose result landed in this reading: the verdict's own request to show it is not by hand. */
    const quietlySettled = new Set<OpKey>();
    for (const k of Object.keys(cur.ops) as OpKey[]) {
      const n = cur.ops[k];
      const p = last.ops[k] ?? EMPTY;
      if (n.state === 'running') {
        if (p.state !== 'running') {
          // v6 `startOp`: the last result becomes history, and the row opens on the run.
          const rec = recOf(k);
          retire(rec);
          rec.t = clock(now());
          expanded.add(k);
          if (loud(k)) started = true;
          live.textContent = `${OP_TITLE[k]}, ${n.phase ?? 'Running'}`;
          liveRunning = true;
        }
        continue;
      }
      if (p.state === 'running') {
        const rec = recOf(k);
        // A run that ended with no verdict of its own (an agent command whose handler threw) leaves the
        // operation where it was: its last result comes back from the history, and nothing is announced.
        const at = rec.history.findIndex((x) => !x.refused);
        const back = at < 0 ? undefined : rec.history[at];
        if (n.state === 'idle' || n.ref === back?.ref) {
          rec.result = back && n.state !== 'idle' ? back : null;
          if (rec.result) rec.history = rec.history.filter((_, i) => i !== at);
          if (!rec.result && !rec.history.length) { recs.delete(k); rowEls.delete(k); expanded.delete(k); }
          ended = true;
          continue;
        }
        rec.result = resultOf(n, rec.t);
        // A clean result collapses its row (#483, owner decision #1 on #1956); a bad one opens it. A quiet one's
        // result marks the drawer unread, never opens it (S11.2).
        if (n.state === 'bad') { expanded.add(k); if (loud(k)) settledBad = true; else { quietlySettled.add(k); if (!open) unread = true; } } else { settledOk = true; expanded.delete(k); }
        said.push(finishLine(k, n));
        continue;
      }
      if (n.state === 'idle' || (n.state === p.state && n.ref === p.ref)) continue;
      // A result that arrived without a run the drawer saw: the boot read-back, or a prune preview.
      const rec = recOf(k);
      retire(rec);
      rec.t = clock(now());
      rec.result = resultOf(n, rec.t);
      if (n.state === 'bad') { settledBad = true; expanded.add(k); } else { landedOk = true; expanded.delete(k); }
    }
    // A request the main thread declined (#1957, the owner's call): straight into the row's earlier results,
    // "Refused", with the reason as its details. The file is fine and the running write goes on, so it is
    // not a failure: the row keeps showing the run, nothing counts it, and the drawer does not open for it.
    const r = cur.refused;
    if (r && r.n !== last.refused?.n) {
      const rec = recOf(r.op);
      const t = clock(now());
      if (!rec.t) rec.t = t;
      rec.history = [{ ok: true, verdict: 'Refused', summary: r.message, agent: r.agent, t, ref: r, refused: true } as Result, ...rec.history].slice(0, HISTORY_MAX);
      live.textContent = `${OP_TITLE[r.op]} already running; the second request was declined.`;
      liveRunning = true;
    }
    // A result a page asked to show (its verdict pill clicked, or a bad verdict) opens the drawer on it.
    const reveal = cur.detail !== null && cur.detail !== last.detail && !quietlySettled.has(cur.detail) ? cur.detail : null;
    last = cur;
    const stillRunning = counts(cur).running > 0;
    // Q194 (#2487, amending decision #4 on #1956): a run's finish is announced too, so a reader knows the file is safe
    // to use again: a success briefly, a failure with its reason. The line then stands until the next start, whose
    // words differ from it; a later reading with nothing to say (`closeDetail` brings one at once) leaves it. A run that
    // ended with no verdict says nothing: its start's words are emptied once nothing runs, so the next start is a change
    // even when its words are the same.
    if (said.length) { live.textContent = said.join(' '); liveRunning = false; }
    else if (!stillRunning && liveRunning) { live.textContent = ''; liveRunning = false; }
    if (settledBad) {
      // A failure or a warning stays open until it is closed, and at 380 it opens the sheet.
      open = true; auto = false; unread = false; clear();
    } else if (started) {
      clear();
      // At 380 the strip shows the run instead (F2); the sheet opens only for a failure or a warning.
      if (!open && !narrow()) { open = true; auto = true; unread = false; }
    }
    if (!settledBad && (settledOk || landedOk)) {
      if (!open) unread = true;
      else if (auto && !stillRunning && settledOk) { clear(); timer = setTimeout(tick, COLLAPSE_MS); }
    }
    if (!settledBad && !started && ended && open && auto && !stillRunning) { clear(); timer = setTimeout(tick, COLLAPSE_MS); }
    if (reveal && recs.has(reveal)) {
      // Opened for reading, by hand: it does not collapse.
      expanded.add(reveal);
      if (!open) { open = true; auto = false; unread = false; clear(); }
    }
    const had = document.activeElement;
    paint();
    // At 380 the open sheet hides the panes, and with them a focused lever, which would leave focus on BODY
    // (#2487 A8). Focus moves to the sheet's Close, the first thing in its header row (Q3113.8 A).
    if (open && narrow() && had instanceof HTMLElement && had !== document.body && !drawer.contains(had) && !had.getClientRects().length) {
      close.focus({ preventScroll: true });
    }
    // The request is answered: clear it, so the same pill asks again next time. `closeDetail` tells `host`
    // and `host:detail`, so `onHost` runs inside it and finds nothing to act on.
    if (cur.detail !== null) closeDetail();
  };

  /** A chunk boundary of the running build: rewrite its progress in place, not the row (focus, open details). */
  const onProgress = (): void => {
    const cur = read();
    for (const [k, el] of rowEls) {
      const o = cur.ops[k];
      if (o.state !== 'running' || !el.progress || !el.progress.isConnected) continue;
      const next = progressEl(OP_TITLE[k], o);
      el.progress.replaceWith(next);
      el.progress = next;
    }
    last = { ...last, ops: { ...last.ops, ...Object.fromEntries((Object.keys(cur.ops) as OpKey[]).filter((k) => cur.ops[k].state === 'running' && last.ops[k]?.state === 'running').map((k) => [k, cur.ops[k]])) } };
    paintBar();
  };

  // The handle (#2176): a drag follows the pointer and keeps the height when it lets go; Arrow Up and Arrow Down step it,
  // Home and End go to the least and the most (the window splitter pattern), each kept as it lands.
  let drag: { readonly id: number; readonly y: number; readonly px: number } | null = null;
  grip.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !sizable()) return;
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, y: e.clientY, px: drawnHeight(range()) };
  });
  grip.addEventListener('pointermove', (e) => {
    if (drag?.id !== e.pointerId) return;
    resize(drag.px + (drag.y - e.clientY), range());
  });
  const letGo = (e: PointerEvent): void => {
    if (drag?.id !== e.pointerId) return;
    drag = null;
    keepNow();
  };
  grip.addEventListener('pointerup', letGo);
  grip.addEventListener('pointercancel', letGo);
  grip.addEventListener('keydown', (e) => {
    if (!sizable() || e.altKey || e.ctrlKey || e.metaKey) return;
    const r = range();
    const now = drawnHeight(r);
    const to = e.key === 'ArrowUp' ? now + HEIGHT_STEP : e.key === 'ArrowDown' ? now - HEIGHT_STEP : e.key === 'Home' ? r.min : e.key === 'End' ? r.max : null;
    if (to === null) return;
    e.preventDefault();
    resize(to, r);
    keepNow();
  });
  // The room changes with the window, and a kept height can arrive from the plugin's main thread after launch.
  const onWindow = (): void => sizeDrawer();
  window.addEventListener('resize', onWindow);
  heightWatchers.add(sizeDrawer);
  // A page change can move the frame between its layouts, and so the ceiling: sized again once the frame has drawn it.
  cleanups.push(subscribe('page', () => queueMicrotask(sizeDrawer)));
  cleanups.push(() => { window.removeEventListener('resize', onWindow); heightWatchers.delete(sizeDrawer); });

  button.onclick = () => show(!open, true);
  toggle.onclick = () => show(!open, true);
  // Focus back on the bar's Activity button; on the plugin's rail shell (#2909), which draws no Activity tile (the drawer is
  // Activity, Q2909.15 A), on the drawer's own row, so a closed sheet never leaves focus on BODY.
  const focusBack = (): void => (button.isConnected ? button : toggle).focus();
  close.onclick = () => { show(false, true); focusBack(); };
  // The full-pane sheet at 380 closes on Escape, as its Close does, focus back on the bar's Activity button (#2487 A8).
  drawer.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !open || !narrow()) return;
    e.preventDefault();
    e.stopPropagation();
    show(false, true);
    focusBack();
  });
  cleanups.push(subscribe('host', onHost), subscribe('host:detail', onHost), subscribe('host:progress', onProgress), clear);
  linkWatchers.add(paint);
  // #2909: the agent status's words follow the width tier, which the frame sets on itself.
  if (opts.room) {
    const tierWatch = new MutationObserver(() => paint());
    tierWatch.observe(opts.room.frame, { attributes: true, attributeFilter: ['data-w'] });
    cleanups.push(() => tierWatch.disconnect());
  }
  cleanups.push(() => linkWatchers.delete(paint));
  paint();
  return { button, drawer, live };
};
