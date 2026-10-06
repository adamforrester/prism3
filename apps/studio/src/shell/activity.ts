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

/** One operation, as the drawer reads it. `ref` is the state's own value, so a new verdict that replaces
 *  an equal one is still a change. `verdict` and `summary` are the host's, once it has answered; `phase`
 *  and `progress` say how far it has got while it runs. */
export type OpState = 'idle' | 'running' | 'ok' | 'bad';
export type OpReading = {
  readonly state: OpState;
  readonly ref: unknown;
  readonly verdict: string | null;
  readonly summary: string | null;
  readonly phase: string | null;
  readonly progress: { readonly done: number; readonly total: number } | null;
  readonly agent: boolean;
  /** How far a style guide has got, for the closed strip at 380 only (S11.2); its row says it in words. */
  readonly strip?: { readonly done: number; readonly total: number } | null;
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
type Result = { readonly ok: boolean; readonly verdict: string; readonly summary: string | null; readonly agent: boolean; readonly t: string; readonly ref: unknown; readonly refused?: true };
/** One operation's record: what the drawer has seen of it this session. */
type Rec = { t: string; result: Result | null; history: Result[] };

const EMPTY: OpReading = { state: 'idle', ref: null, verdict: null, summary: null, phase: null, progress: null, agent: false };

/** Mount the drawer and its button. `narrow` reads the frame's width tier; `cleanups` takes the
 *  subscriptions and the pending collapse. `now` is the clock the times are read from. */
export const mountActivity = (opts: { readonly host: Host; readonly lend: ActivityLend; readonly narrow: () => boolean; readonly now?: () => Date;
  /** An operation the page in view shows itself (S11.2, owner decision P1 variant 1: the Build style guides page and
   *  the style guide): the drawer does not open by itself when it starts or fails. Its row, the bar row and the dot
   *  still record it. */
  readonly quiet?: (k: OpKey) => boolean }, cleanups: (() => void)[]): Activity => {
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
  body.append(close, rows, note);
  drawer.append(toggle, body);
  // A write's control says it is busy while the write runs, panel or agent, and a polite status line says
  // so once, when it starts (owner decision #4 on #1956, the engine Button's `isPending` aria note). One
  // line for every write, here, because the drawer is what hears an agent's run start. The words are the
  // row's: its title and its phase line.
  const live = hook(h('p', 'p3-sr p3-live'), 'activity-status');
  live.setAttribute('role', 'status');

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
      parts.push(hook(h('p', 'p3-op-summary', res.summary), 'op-summary'));
    }
    if (rec.history.length) {
      const d = hook(h('details', 'p3-op-history'), 'op-history');
      d.append(h('summary', undefined, `Earlier results (${rec.history.length})`));
      const ul = h('ul');
      for (const x of rec.history) ul.append(h('li', undefined, `${x.t} · ${x.verdict}${x.agent ? ' · Agent' : ''}${x.summary ? `: ${x.summary}` : ''}`));
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
      parts.push(d, text, h('span', 'p3-op-when', rec.t));
      // At 380, the closed strip carries the running style guide's progress (the S11.2 mockup, variant 1).
      if (run && lead === 'styleguide' && o.strip && narrow() && !open) {
        const bar = hook(h('progress', 'p3-op-prog p3-strip-prog'), 'activity-strip-progress') as HTMLProgressElement;
        bar.max = o.strip.total;
        bar.value = o.strip.done;
        bar.setAttribute('aria-hidden', 'true');
        parts.push(bar);
      }
    } else {
      parts.push(glyph('pulse'), h('span', 'p3-drawer-last', 'Activity'));
    }
    parts.push(h('span', 'p3-spacer'));
    const count = [running && `${running} running`, failed && attention(failed)].filter(Boolean).join(' · ');
    if (count) parts.push(h('span', 'p3-drawer-count', count));
    parts.push(glyph('chev'), h('span', 'p3-sr', `${open ? 'Collapse' : 'Expand'} Activity`));
    toggle.replaceChildren(...parts);
  };

  const paint = (): void => {
    const { running, failed } = counts(last);
    drawer.dataset.open = String(open);
    drawer.dataset.ever = String(recs.size > 0);
    body.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-expanded', String(open));
    const kind = running ? 'run' : failed ? 'bad' : unread ? 'unread' : 'none';
    // The tile's dot (the owner's D-RED A, 2026-10-05): red only for a failure. An attention state that is not one, a
    // warning (its verdict leads with ⚠, as every write's headline does: ✓ done, ⚠ done with problems, ✗ failed), draws
    // green like the rest. The drawer, and the names, keep counting both as needing attention.
    const failures = Object.values(last.ops).filter((o) => o.state === 'bad' && !(o.verdict ?? '').startsWith('⚠')).length;
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
  const resultOf = (o: OpReading, t: string): Result => ({ ok: o.state === 'ok', verdict: o.verdict ?? '', summary: o.summary, agent: o.agent, t, ref: o.ref });
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
    paint();
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

  button.onclick = () => show(!open, true);
  toggle.onclick = () => show(!open, true);
  close.onclick = () => { show(false, true); button.focus(); };
  cleanups.push(subscribe('host', onHost), subscribe('host:detail', onHost), subscribe('host:progress', onProgress), clear);
  linkWatchers.add(paint);
  cleanups.push(() => linkWatchers.delete(paint));
  paint();
  return { button, drawer, live };
};
