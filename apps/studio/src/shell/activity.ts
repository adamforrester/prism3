/**
 * The Activity drawer and the Activity button (UI redesign S1.4, `docs/superpowers/ui-redesign/implementation-plan.md`
 * §3.9; the owner's F2, and v5 Q9 for the 4 s collapse).
 *
 * WHAT IT HOLDS IN S1.4. What exists today, moved here from the top bar: the status pills (the boot
 * read-back, each write's verdict, the prune outcome) and the apply detail, the one row that spells a
 * verdict out. Both stay legacy-rendered and keep their hooks (`status-pill`, `status-verdict`,
 * `apply-detail`), so `test:verdict` reads them where it always did. The drawer lends two slots to
 * `main.ts`: the drawer's bar row, which the legacy bar paints the pills into (hook `bar`, the name the
 * verdict suite reads them under), and its body, where the apply detail is mounted. The per-operation
 * activity model (progress, causes, history, agent-started work) is S11.
 *
 * F2, AS BUILT HERE. The Activity button in the top bar shows and hides the drawer at any time, and its
 * status dot says what concept v6's says: an operation running, a result that needs attention, or a new
 * result nobody has opened. The drawer opens by itself when an operation starts, collapses by itself
 * `COLLAPSE_MS` after a success (unless it was opened by hand, another operation is still running, or
 * focus or the pointer is inside it), and stays open on a failure or a warning until it is closed. A
 * write's verdict is `ok: false` for both a failure and a warning, so both keep it open. At 380 an
 * operation shows in the strip (the drawer's bar row, pinned to the bottom edge) instead of opening the
 * drawer, and a failure or a warning opens the full-pane sheet.
 *
 * HOW IT LEARNS WHAT HAPPENED: store topics, never a legacy repaint tier (plan §3.10). `main.ts` lends a
 * pure reading of its host session (`ActivitySource`): each write's state, and whether a result's detail
 * is open. The drawer subscribes to `host` and `host:detail`, compares the reading with the last one, and
 * reacts to the change: a write that started, one that finished well, one that finished badly. The legacy
 * writers say a write started by invalidating `host`, the topic a host verdict invalidates.
 *
 * The drawer sits at the bottom of the frame, pinned to the bottom edge, so it works on every page while
 * every page is legacy: under the legacy frame, or under the preview pane once a page moves (S2).
 */
import { subscribe } from '../state/store';
import type { Host } from './pages';
import { glyph, h, hook } from './dom';

/** F2, v5 Q9: how long the drawer stays open after a success before it collapses by itself. */
export const COLLAPSE_MS = 4000;
/** A collapse that comes due while focus or the pointer is inside the drawer waits this long, then looks
 *  again (concept v6). */
export const COLLAPSE_RECHECK_MS = 1500;

/** One write, as the drawer reads it. `ref` is the state's own value, so a new verdict that replaces an
 *  equal one is still a change. */
export type OpState = 'idle' | 'running' | 'ok' | 'bad';
export type OpReading = { readonly state: OpState; readonly ref: unknown };
/** What `main.ts` lends: every write by name, and whether a result's detail is open. Pure; no DOM. */
export type ActivityReading = { readonly ops: Readonly<Record<string, OpReading>>; readonly detail: boolean };
export type ActivitySource = () => ActivityReading;

export type Activity = {
  /** The Activity button, for the top bar. */
  readonly button: HTMLButtonElement;
  /** The drawer, at the bottom of the frame. */
  readonly drawer: HTMLElement;
  /** Slot: the status pills, painted by the legacy bar. */
  readonly pills: HTMLElement;
  /** Slot: the apply detail, mounted by the chrome surfaces. */
  readonly detail: HTMLElement;
};

/** The words the Activity button's name adds, as concept v6 has them. */
const statusWords = (running: number, failed: number, unread: boolean): string =>
  [running && `${running} running`, failed && `${failed} ${failed === 1 ? 'needs' : 'need'} attention`, !running && !failed && unread && 'new result']
    .filter(Boolean).join(', ');

/** Mount the drawer and its button. `narrow` reads the frame's width tier; `cleanups` takes the
 *  subscriptions and the pending collapse. */
export const mountActivity = (opts: { readonly host: Host; readonly read: ActivitySource; readonly narrow: () => boolean }, cleanups: (() => void)[]): Activity => {
  const { read, narrow } = opts;

  // ── the button, in the top bar ─────────────────────────────────────────────────────────────────
  // The word at full width, the glyph alone when narrow; the name stays "Activity" plus the status words.
  const button = hook(h('button', 'p3-btn p3-btn-collapse p3-activity-btn'), 'activity-open');
  button.type = 'button';
  button.setAttribute('aria-controls', 'p3-activity');
  const dot = h('span', 'p3-dot p3-status-dot');
  dot.setAttribute('aria-hidden', 'true');
  button.append(glyph('pulse'), h('span', 'p3-btn-label', 'Activity'), dot);

  // ── the drawer ─────────────────────────────────────────────────────────────────────────────────
  const drawer = hook(h('section', 'p3-drawer'), 'activity-drawer');
  drawer.id = 'p3-activity';
  drawer.setAttribute('aria-label', 'Activity');
  const barRow = h('div', 'p3-drawer-bar');
  const toggle = hook(h('button', 'p3-btn p3-btn-ghost p3-drawer-toggle'), 'activity-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', 'p3-activity-body');
  toggle.append(glyph('pulse'), h('span', 'p3-btn-label', 'Activity'), glyph('chev'));
  // The pills' slot carries the hook the verdict suite reads them under (`bar`): they were the bar's.
  const pills = hook(h('div', 'p3-drawer-pills'), 'bar');
  barRow.append(toggle, pills);
  const body = hook(h('div', 'p3-drawer-body'), 'activity-body');
  body.id = 'p3-activity-body';
  const detail = h('div', 'p3-drawer-slot');
  // Shown while no result's detail is open. The plugin's line is concept v6's; the studio runs no write.
  const note = hook(h('p', 'p3-note p3-drawer-note', opts.host === 'figma'
    ? 'Results of Apply, Build and Prune appear here after they run.'
    : 'Nothing has run in this session.'), 'activity-note');
  body.append(detail, note);
  drawer.append(barRow, body);

  // ── state ──────────────────────────────────────────────────────────────────────────────────────
  let open = false;     // the body shows
  let auto = false;     // it opened by itself, so it may collapse by itself
  let unread = false;   // a result landed while it was closed
  let timer: ReturnType<typeof setTimeout> | null = null;
  let last = read();

  const counts = (r: ActivityReading): { running: number; failed: number } => {
    const ops = Object.values(r.ops);
    return { running: ops.filter((o) => o.state === 'running').length, failed: ops.filter((o) => o.state === 'bad').length };
  };
  const clear = (): void => { if (timer !== null) clearTimeout(timer); timer = null; };

  const paint = (): void => {
    const { running, failed } = counts(last);
    drawer.dataset.open = String(open);
    body.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-expanded', String(open));
    const kind = running ? 'run' : failed ? 'bad' : unread ? 'unread' : 'none';
    dot.dataset.state = kind;
    drawer.dataset.state = kind;
    const words = statusWords(running, failed, unread);
    button.setAttribute('aria-label', words ? `Activity, ${words}` : 'Activity');
  };

  /** The collapse that comes due `COLLAPSE_MS` after a success. */
  const tick = (): void => {
    timer = null;
    if (!open || !auto) return;
    if (drawer.matches(':hover') || drawer.contains(document.activeElement)) { timer = setTimeout(tick, COLLAPSE_RECHECK_MS); return; }
    if (counts(last).running) return;   // another write started; its own result decides
    open = false;
    auto = false;
    paint();
  };

  const show = (yes: boolean, byHand: boolean): void => {
    open = yes;
    if (byHand) auto = false;
    if (yes) unread = false;
    clear();
    paint();
  };

  /** Compare the host's reading with the last one, and act on what moved (F2). */
  const onHost = (): void => {
    const now = read();
    let started = false, settledOk = false, settledBad = false, landedOk = false;
    for (const [k, n] of Object.entries(now.ops)) {
      const p = last.ops[k] ?? { state: 'idle', ref: null };
      if (n.state === 'running') { if (p.state !== 'running') started = true; }
      else if (n.state === 'bad') { if (p.state !== 'bad' || n.ref !== p.ref) settledBad = true; }
      else if (n.state === 'ok') {
        if (p.state === 'running') settledOk = true;
        else if (n.ref !== p.ref) landedOk = true;
      }
    }
    const detailOpened = now.detail && !last.detail;
    last = now;
    const stillRunning = counts(now).running > 0;
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
    // A result opened for reading (its pill clicked) opens the drawer, by hand: it does not collapse.
    if (detailOpened && !open) { open = true; auto = false; unread = false; clear(); }
    paint();
  };

  button.onclick = () => show(!open, true);
  toggle.onclick = () => show(!open, true);
  cleanups.push(subscribe('host', onHost), subscribe('host:detail', onHost), clear);
  paint();
  return { button, drawer, pills, detail };
};
