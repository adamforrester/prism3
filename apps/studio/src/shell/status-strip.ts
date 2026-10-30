/**
 * The status strip at the panel's foot (#3170 part 2, Q3170.1–6 A), plugin only: the read after open, Update file's run
 * with its Stop, and the run's verdict line. What it says, and why it can say it honestly, is `state/status-strip.ts`;
 * this draws it, over the reading `main.ts` lends, and repaints on `host:run`.
 *
 * It sits first in the Activity drawer, above the drawer's bar row, so it is at the foot of every page and over nothing.
 * The bar is a native `progress` (the drawer's own `.p3-op-prog`), so the chrome sets no inline value: no value is
 * indeterminate, and it carries the progressbar role itself. While a run is out the strip ticks once a second, for its
 * clock and for "Still working on <set>" (`SILENCE_MS`); idle, it ticks not at all. The line is a polite live region,
 * named by what it says.
 */
import { subscribe } from '../state/store';
import type { StripView } from '../state/status-strip';
import { glyph, h, hook } from './dom';

export type StatusLend = {
  /** The strip now, from the run and the clock (`stripView`). */
  readonly read: () => StripView;
  /** "Stop after <set>" (Q3170.4 A). */
  readonly stop: () => void;
};

const TICK_MS = 1000;
/** The verdict's mark, as Activity marks a result (Q3113 A): its glyph in its status ink. */
const TONE_GLYPH = { ok: 'check', warn: 'warn', bad: 'error' } as const;

export const mountStatusStrip = (lend: StatusLend, cleanups: (() => void)[]): HTMLElement => {
  const node = hook(h('div', 'p3-status'), 'status-strip');
  node.hidden = true;
  const top = h('div', 'p3-status-top');
  const mark = hook(h('span', 'p3-op-mark'), 'status-mark');
  mark.setAttribute('aria-hidden', 'true');
  const what = hook(h('span', 'p3-status-what'), 'status-what');
  const n = hook(h('span', 'p3-status-n'), 'status-n');
  top.append(mark, what, n);
  const bar = hook(h('progress', 'p3-op-prog p3-status-prog'), 'status-bar') as HTMLProgressElement;
  bar.max = 1;
  const sub = h('div', 'p3-status-sub');
  const line = hook(h('span', 'p3-status-line'), 'status-line');
  const stop = hook(h('button', 'p3-btn p3-btn-ghost p3-status-stop'), 'status-stop');
  stop.type = 'button';
  stop.onclick = () => { if (!stop.disabled) lend.stop(); };
  sub.append(line, stop);
  // The words only: the clock's second-by-second change is not announced.
  const live = hook(h('span', 'p3-sr'), 'status-live');
  live.setAttribute('role', 'status');
  node.append(top, bar, sub, live);

  let timer: ReturnType<typeof setInterval> | null = null;
  const paint = (): void => {
    const v = lend.read();
    node.dataset.kind = v.kind;
    node.hidden = v.kind === 'idle';
    if (v.kind === 'running') { if (timer === null) timer = setInterval(paint, TICK_MS); }
    else if (timer !== null) { clearInterval(timer); timer = null; }
    if (v.kind === 'idle') { live.textContent = ''; return; }
    what.textContent = v.what;
    n.textContent = v.n ?? '';
    n.hidden = !v.n;
    mark.replaceChildren();
    mark.hidden = v.kind !== 'verdict';
    if (v.kind === 'verdict') { mark.dataset.state = v.tone; mark.append(glyph(TONE_GLYPH[v.tone])); node.dataset.tone = v.tone; }
    else delete node.dataset.tone;
    // A determinate bar while there is a count; none at all on the verdict line.
    bar.hidden = v.kind === 'verdict';
    if (v.kind !== 'verdict') {
      if (v.fill === null) bar.removeAttribute('value'); else bar.value = v.fill;
      bar.setAttribute('aria-label', v.what);
    }
    const text = v.kind === 'running' ? v.still ?? '' : v.sub;
    line.textContent = text;
    line.hidden = !text;
    stop.hidden = v.kind !== 'running';
    if (v.kind === 'running') { stop.textContent = v.stop.label; stop.disabled = v.stop.disabled; }
    const say = [v.what, v.kind === 'running' ? v.still : null].filter(Boolean).join('. ');
    if (live.textContent !== say) live.textContent = say;
  };
  cleanups.push(subscribe('host:run', paint), () => { if (timer !== null) clearInterval(timer); });
  paint();
  return node;
};
