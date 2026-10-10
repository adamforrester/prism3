/**
 * The Activity drawer and the Activity button (UI redesign S1.4 and S11, `docs/superpowers/ui-redesign/implementation-plan.md`
 * §3.9; the owner's F2, and v5 Q9 for the 4 s collapse).
 *
 * WHAT IT HOLDS SINCE S11: concept v6's activity model. One row per operation that has run in this session
 * (Apply Theme, Build set, Set up file, Style guides, Prune stale, Read-back), each with its verdict, the
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
 *  (`apps/plugin/src/agent-link-ui.ts`). `short` is the closed row's high-level status ("Agent listening", …), drawn at
 *  the far right of the drawer's bar row beside the caret, `error` drawing it in the chrome's error ink and otherwise
 *  quiet; `null` draws none. `full` is the link's whole status line (`agentLinkStatusText`), the open drawer's first line
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
/** What `main.ts` lends the drawer: the reading, and how to say a requested result has been shown. */
export type ActivityLend = { readonly read: ActivitySource; readonly closeDetail: () => void };

export type Activity = {
  /** The Activity button, for the top bar. */
  readonly button: HTMLButtonElement;
  /** The drawer, at the bottom of the frame. */
  readonly drawer: HTMLElement;
  /** The status line a write's start is announced on, for the top bar: outside the drawer, which is not
   *  drawn until something has run, so it is in the document before its first announcement. */
  readonly live: HTMLElement;
};

/** The words the Activity button's name adds, as concept v6 has them. */
const statusWords = (running: number, failed: number, unread: boolean): string =>
  [running && `${running} running`, failed && attention(failed), !running && !failed && unread && 'new result']
    .filter(Boolean).join(', ');
const attention = (n: number): string => `${n} ${n === 1 ? 'needs' : 'need'} attention`;

/** A clock time, HH:MM, as concept v6 stamps an operation. */
const clock = (d: Date): string => d.toTimeString().slice(0, 5);

/** One result, as the drawer recorded it. `refused` marks a declined request (#1957), which is only ever
 *  history: it is not the operation's result, so a run that ends with no verdict skips it. */
type Result = { readonly ok: boolean; readonly verdict: string; readonly summary: string | null; readonly lines?: readonly string[] | null; readonly agent: boolean; readonly t: string; readonly ref: unknown; readonly refused?: true };
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
  // v6's "Close Activity", which only the full-pane sheet at 380 shows (the stylesheet hides it wider).
  const close = hook(h('button', 'p3-btn p3-btn-ghost p3-drawer-close'), 'activity-close');
  close.type = 'button';
  close.append(glyph('x'), h('span', undefined, 'Close Activity'));
  const rows = h('div', 'p3-ops');
  // Shown while nothing has run. The plugin's line is concept v6's; the studio runs no write.
  const note = hook(h('p', 'p3-note p3-drawer-note', opts.host === 'figma'
    ? 'Results of Apply, Build and Prune appear here after they run.'
    : 'Nothing has run in this session.'), 'activity-note');
  // The agent link's full status line (#2213, AS1 A): the open drawer's first line, above the runs, while the plugin
  // reports one.
  const linkDetail = hook(h('p', 'p3-note p3-drawer-note'), 'activity-agent-detail');
  body.append(close, linkDetail, rows, note);
  drawer.append(toggle, body);
  // A write's control says it is busy while the write runs, panel or agent, and a polite status line says
  // so once, when it starts (owner decision #4 on #1956, the engine Button's `isPending` aria note). One
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
  /** Every operation seen this session, in the order it first ran (v6). */
  const recs = new Map<OpKey, Rec>();
  /** The operations whose bodies are expanded. */
  const expanded = new Set<OpKey>();
  /** The rendered rows, keyed, so a repaint keeps the header that holds focus. */
  const rowEls = new Map<OpKey, { root: HTMLElement; head: HTMLButtonElement; tag: HTMLElement; pill: HTMLElement; when: HTMLElement; body: HTMLElement; progress: HTMLElement | null }>();

  const counts = (r: ActivityReading): { running: number; failed: number } => {
    const ops = Object.values(r.ops);
    return { running: ops.filter((o) => o.state === 'running').length, failed: ops.filter((o) => o.state === 'bad').length };
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
      const pill = hook(h('span', 'p3-pill'), 'op-verdict');
      const when = h('span', 'p3-op-when');
      head.append(glyph('chevr'), h('b', undefined, OP_TITLE[k]), tag, pill, when);
      const b = hook(h('div', 'p3-op-body'), 'op-body');
      b.id = `p3-op-${k}-b`;
      head.onclick = () => { if (expanded.has(k)) expanded.delete(k); else expanded.add(k); paint(); };
      root.append(head, b);
      el = { root, head, tag, pill, when, body: b, progress: null };
      rowEls.set(k, el);
    }
    const running = o.state === 'running';
    const res = rec.result;
    const bad = running ? false : res ? !res.ok : false;
    el.tag.hidden = !(running ? o.agent : res?.agent);
    el.pill.className = bad ? 'p3-pill p3-pill-bad' : 'p3-pill';
    el.pill.textContent = running ? 'Running' : res?.verdict ?? '';
    el.pill.hidden = !running && !res;
    el.root.dataset.state = running ? 'running' : res ? (res.ok ? 'ok' : 'bad') : 'idle';
    el.when.textContent = rec.t;
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
    } else if (res?.summary) {
      // One line per item, console-style (#2177): the items the host's summary joins, each in the chrome's mono font, a
      // long one wrapping inside the drawer. A list, so a screen reader reads them in order and says how many. A
      // summary sent without items is its own one line, in the same words.
      const list = hook(h('ul', 'p3-op-summary'), 'op-summary');
      for (const line of res.lines?.length ? res.lines : [res.summary]) list.append(hook(h('li', 'p3-op-line', line), 'op-line'));
      parts.push(list);
    }
    if (rec.history.length) {
      const d = hook(h('details', 'p3-op-history'), 'op-history');
      d.append(h('summary', undefined, `Earlier results (${rec.history.length})`));
      const ul = h('ul');
      // Each earlier result is its time and verdict, then its details one line per item, as the current run's are
      // (#2281, owner decision Q90 A): the same mono list, never in the live region, so nothing here is announced.
      for (const x of rec.history) {
        const entry = hook(h('li', 'p3-op-entry'), 'op-history-entry');
        entry.append(hook(h('span', undefined, `${x.t} · ${x.verdict}${x.agent ? ' · Agent' : ''}`), 'op-history-head'));
        if (x.summary) {
          const list = hook(h('ul', 'p3-op-summary'), 'op-history-lines');
          for (const line of x.lines?.length ? x.lines : [x.summary]) list.append(hook(h('li', 'p3-op-line', line), 'op-history-line'));
          entry.append(list);
        }
        ul.append(entry);
      }
      d.append(ul);
      // A repaint keeps an open history open.
      const was = el.body.querySelector('details');
      if (was?.open) d.open = true;
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

  const paintBar = (): void => {
    const { running, failed } = counts(last);
    const lead = leadOf();
    // The row's text runs (the summary, its time, the counts and the agent status) share one baseline: they sit in a
    // baseline-aligned run of their own (#2213, the owner's review), centered in the row with the dot and the caret,
    // because centering texts of two sizes one by one sets their baselines apart.
    const lead0: Node[] = [];
    const parts: Node[] = [];
    if (lead) {
      const o = last.ops[lead];
      const rec = recs.get(lead)!;
      const run = o.state === 'running';
      const d = h('span', 'p3-dot p3-status-dot');
      d.setAttribute('aria-hidden', 'true');
      d.dataset.state = run ? 'run' : rec.result && !rec.result.ok ? 'bad' : 'ok';
      const text = h('span', 'p3-drawer-last');
      text.append(h('b', undefined, OP_TITLE[lead]), ` · ${run ? o.phase ?? 'Running' : rec.result?.verdict ?? ''}`);
      lead0.push(d);
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
    parts.push(h('span', 'p3-spacer'));
    const count = [running && `${running} running`, failed && attention(failed)].filter(Boolean).join(' · ');
    if (count) parts.push(h('span', 'p3-drawer-count', count));
    // The agent link's short status (#2213, AS1 A), last before the caret. One line, cut short with an ellipsis if the
    // row has no room for it. Its tooltip is the link's full status line, and so is the rest of its accessible name,
    // after its visible words.
    if (agentLinkStatus.short) {
      const ln = hook(h('span', 'p3-drawer-link', agentLinkStatus.short), 'activity-agent-link');
      ln.dataset.error = String(agentLinkStatus.error);
      if (agentLinkStatus.full) { ln.title = agentLinkStatus.full; ln.append(h('span', 'p3-sr', agentLinkStatus.full)); }
      parts.push(ln);
    }
    const runs = h('span', 'p3-drawer-text');
    runs.append(...parts);
    toggle.replaceChildren(...lead0, runs, glyph('chev'), h('span', 'p3-sr', `${open ? 'Collapse' : 'Expand'} Activity`));
  };

  const paint = (): void => {
    const { running, failed } = counts(last);
    drawer.dataset.open = String(open);
    drawer.dataset.ever = String(recs.size > 0);
    grip.hidden = !open;
    // #2176: sized once this paint is done, so today's open height is measured with its rows in place.
    queueMicrotask(sizeDrawer);
    body.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-expanded', String(open));
    const kind = running ? 'run' : failed ? 'bad' : unread ? 'unread' : 'none';
    // The tile's dot (the owner's D-RED A, 2026-10-05): red only for a failure. An attention state that is not one, a
    // warning (its verdict leads with ⚠, as every write's headline does: ✓ done, ⚠ done with problems, ✗ failed), draws
    // green like the rest. The drawer, and the names, keep counting both as needing attention.
    // A failure: a bad result whose headline leads with anything but ⚠ (✗, or a short word such as "Failed"), or one
    // that reports a failed item as data (`failed`), e.g. a style-guide run where a table failed: something asked for
    // was not made. ⚠ with nothing failed ("⚠ 4 misses") is a warning, and draws green.
    const failures = Object.values(last.ops).filter((o) => o.state === 'bad' && (!(o.verdict ?? '').startsWith('⚠') || (o.failed ?? 0) > 0)).length;
    dot.dataset.state = kind === 'bad' && !failures ? 'warn' : kind;
    drawer.dataset.state = kind;
    const name = ['Activity', agentLinkOn && 'agent link on', statusWords(running, failed, unread)].filter(Boolean).join(', ');
    button.setAttribute('aria-label', name);
    tip.textContent = name;
    paintBar();
    for (const [k, rec] of recs) paintRow(k, rec, last.ops[k]);
    const order = [...recs.keys()].map((k) => rowEls.get(k)!.root);
    if (order.length !== rows.children.length || order.some((n, i) => rows.children[i] !== n)) rows.replaceChildren(...order);
    note.hidden = recs.size > 0;
    linkDetail.textContent = agentLinkStatus.full ?? '';
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
  const resultOf = (o: OpReading, t: string): Result => ({ ok: o.state === 'ok', verdict: o.verdict ?? '', summary: o.summary, lines: o.lines ?? null, agent: o.agent, t, ref: o.ref });
  /** The previous result moves to the history, newest first, at most `HISTORY_MAX`. */
  const retire = (rec: Rec): void => {
    if (rec.result) rec.history = [rec.result, ...rec.history].slice(0, HISTORY_MAX);
    rec.result = null;
  };

  /** Compare the host's reading with the last one, and act on what moved (F2). */
  const onHost = (): void => {
    const cur = read();
    let started = false, settledOk = false, settledBad = false, landedOk = false, ended = false;
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
    }
    // A result a page asked to show (its verdict pill clicked, or a bad verdict) opens the drawer on it.
    const reveal = cur.detail !== null && cur.detail !== last.detail && !quietlySettled.has(cur.detail) ? cur.detail : null;
    last = cur;
    const stillRunning = counts(cur).running > 0;
    // Emptied once nothing runs, so the next start is a change even when its words are the same.
    if (!stillRunning) live.textContent = '';
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
    // (#2487 A8). Focus moves to the sheet's own toggle, the first thing in it.
    if (open && narrow() && had instanceof HTMLElement && had !== document.body && !drawer.contains(had) && !had.getClientRects().length) {
      toggle.focus({ preventScroll: true });
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
  close.onclick = () => { show(false, true); button.focus(); };
  // The full-pane sheet at 380 closes on Escape, as its Close does, focus back on the bar's Activity button (#2487 A8).
  drawer.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !open || !narrow()) return;
    e.preventDefault();
    e.stopPropagation();
    show(false, true);
    button.focus();
  });
  cleanups.push(subscribe('host', onHost), subscribe('host:detail', onHost), subscribe('host:progress', onProgress), clear);
  linkWatchers.add(paint);
  cleanups.push(() => linkWatchers.delete(paint));
  paint();
  return { button, drawer, live };
};
