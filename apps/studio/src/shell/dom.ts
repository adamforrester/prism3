/**
 * DOM helpers for the new shell (UI redesign S1.2). The legacy `el()` and `hook()` live in `main.ts`,
 * which the shell must not import: `main.ts` imports the shell, and the shell talks to the rest of the
 * app through the store's setters and topics only (plan §3.10).
 *
 * The class-scope law (#770) still holds here, more strictly: every class the shell mints is in the
 * `p3-` scope, and `h()` refuses anything else at runtime, so a shell element can never pick up a rule
 * written for a legacy surface. State is carried by ARIA attributes (`aria-selected`, `aria-checked`,
 * `aria-expanded`, `aria-pressed`), never by a shared state class.
 */

/** A class list in the shell's scope. The type catches a literal that does not start `p3-`; `h()`
 *  checks every token at runtime. */
export type P3Class = `p3-${string}`;

const checkP3 = (cls: string): string => {
  const off = cls.split(/\s+/).filter((t) => t && !t.startsWith('p3-'));
  if (off.length) throw new Error(`apps/studio shell: class list "${cls}" has ${off.map((t) => `'${t}'`).join(', ')} outside the p3- scope`);
  return cls;
};

/** An element, with optional `p3-` classes and text. */
export const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: P3Class, text?: string): HTMLElementTagNameMap[K] => {
  const n = document.createElement(tag);
  if (cls) n.className = checkP3(cls);
  if (text !== undefined) n.textContent = text;
  return n;
};

/** A stable test hook, `data-p3="<role>"`, the same contract as `main.ts`'s `hook()`: the browser suites
 *  locate elements by it, no style rule keys on it, and it does not change across a redesign. */
export const hook = <E extends Element>(n: E, role: string): E => { n.setAttribute('data-p3', role); return n; };

/** Chrome glyphs: 16 px, a 1.5 px stroke in `currentColor` (concept v6's set, plus `pages` and `export`; S1.3 adds `layers` and `chevl` for Inspect;
 *  S1.4 adds concept v6's `pulse` for Activity and `agent` for the Agent chip; S2 adds `info`, `plus` and `chevr` for the levers panel;
 *  S3 adds concept v6's `warn`). */
const GLYPHS = {
  chev: '<path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  check: '<path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  sun: '<circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  moon: '<path d="M13.2 10.1A5.6 5.6 0 0 1 5.9 2.8a5.6 5.6 0 1 0 7.3 7.3z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  system: '<rect x="1.8" y="2.8" width="12.4" height="8.4" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 14h5M8 11.2V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  pages: '<path d="M2.5 4h11M2.5 8h11M2.5 12h11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  export: '<path d="M8 2.5v7.5M4.8 7L8 10.2 11.2 7M2.5 13.5h11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  x: '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  layers: '<path d="M8 2.2l5.8 3L8 8.2 2.2 5.2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M2.2 8.2L8 11.2l5.8-3M2.2 11.1L8 14.1l5.8-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  chevl: '<path d="M10 4L6 8l4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  pulse: '<path d="M1.5 8.5h3l1.8-4.5 3.2 8 1.8-3.5h3.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  agent: '<rect x="3" y="5" width="10" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 2.5V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="6" cy="9" r="0.9" fill="currentColor"/><circle cx="10" cy="9" r="0.9" fill="currentColor"/>',
  // S2: the levers panel's info toggletip, the dashed add row, and the Show advanced disclosure.
  info: '<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 7.2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="4.9" r="0.9" fill="currentColor"/>',
  plus: '<path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  chevr: '<path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  search: '<circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.4 10.4l3.6 3.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  // S3: concept v6's warning triangle, for a state line that warns (the namespace placeholder, T2).
  warn: '<path d="M8 1.8l6.6 11.7H1.4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 6.3v3.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="11.6" r="0.9" fill="currentColor"/>',
  // S4f (QA-B12): a closed and an open padlock, for Surfaces & fills' icon pairing button: locked while icons follow
  // their text, unlocked while they are set on their own. The same body; only the shackle differs.
  lock: '<rect x="3.2" y="7.2" width="9.6" height="6.6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.4 7.2V5.2a2.6 2.6 0 0 1 5.2 0v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  unlock: '<rect x="3.2" y="7.2" width="9.6" height="6.6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.4 7.2V5.2a2.6 2.6 0 0 1 5.1-.7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  // S11.2: the Build style guides page's part-checked box (a dash) and a table that was not drawn (concept v6's error).
  dash: '<path d="M4 8h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  error: '<circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.6v4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11.2" r="0.95" fill="currentColor"/>',
} as const;
export type Glyph = keyof typeof GLYPHS;

/** A decorative glyph, hidden from assistive technology: the control it sits in carries the name. */
export const glyph = (name: Glyph): SVGSVGElement => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'p3-ico');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = GLYPHS[name];
  return svg;
};

/**
 * A write's control while that write runs, panel or agent (owner decision #4 on #1956, which also fixes
 * #1957): the engine Button's `isPending` (`packages/engine/components/button.ts`, the prop and its `aria`
 * note). The control stays focusable and says it is busy (`aria-disabled` and `aria-busy`, never native
 * `disabled`), its click does nothing until the write ends, and it keeps its width: both labels sit in one
 * cell, the one not showing held invisible, so the wider sets the width in either state. The busy label
 * opens on "…" in a cell of its own, which the stylesheet turns into a spinner after a short delay, so a
 * quick write never flashes one. That cell is `aria-hidden`: the label names the control, and the
 * Activity drawer's status line announces the run. `busy` is the busy label without its "…"; which of the
 * two shows is read from the control's `aria-busy`.
 */
export const pendingLabel = (idle: string, busy: string): HTMLElement => {
  const cell = h('span', 'p3-pend');
  const spin = h('span', 'p3-spin', '…');
  spin.setAttribute('aria-hidden', 'true');
  const on = hook(h('span', 'p3-pend-busy'), 'label-busy');
  on.append(spin, ` ${busy}`);
  cell.append(hook(h('span', 'p3-pend-idle', idle), 'label-idle'), on);
  return cell;
};
/** Marks `b` busy or not, as `pendingLabel` describes. The click is refused by the write the control runs,
 *  which knows whether its own write is out; this only says so. */
export const setBusy = (b: HTMLElement, busy: boolean): void => {
  if (busy) { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-busy', 'true'); }
  else { b.removeAttribute('aria-disabled'); b.removeAttribute('aria-busy'); }
};

/**
 * A bar tile (the owner's top-bar decision, 2026-10-05, "A · Menu bar"): a borderless control, its mark (a glyph, or
 * a glyph and a count) over a small label, with a tooltip under it on hover and on keyboard focus. The label shows
 * above the narrow tier and drops at it (`NARROW_MAX`), leaving the mark and the tooltip. The accessible name is the
 * control's `aria-label` in every tier, so it never depends on the label or the tooltip, and both are `aria-hidden`
 * (they repeat what the name says). The tooltip is drawn by the stylesheet alone, so it carries no inline value.
 * `start`: the tooltip hangs from the tile's left edge rather than its right (a tile on the bar's left side).
 */
export type Tile = { readonly btn: HTMLButtonElement; readonly mark: HTMLElement; readonly tip: HTMLElement };
export const tile = (role: string, label: string, start = false): Tile => {
  const btn = hook(h('button', start ? 'p3-btn p3-tile p3-tile-start' : 'p3-btn p3-tile'), role);
  btn.type = 'button';
  const mark = h('span', 'p3-tile-mark');
  const lab = h('span', 'p3-tile-label', label);
  lab.setAttribute('aria-hidden', 'true');
  const tip = hook(h('span', 'p3-tile-tip'), `${role}-tip`);
  tip.setAttribute('aria-hidden', 'true');
  btn.append(mark, lab, tip);
  return { btn, mark, tip };
};

/** The controls Tab can reach inside `root`, in order: drawn, not inert. Shared by every modal window (S12's start
 *  window and its guard, S13.1's export and prune dialogs). */
const FOCUSABLE = 'button:not([disabled]), input:not([type="hidden"]):not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';
export const focusables = (root: HTMLElement): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.getClientRects().length > 0 && !n.closest('[inert]'));

/** Keep Tab inside `dlg`, wrapping at both ends: a modal (`aria-modal`) window's keyboard trap. It takes over Tab only at
 *  the two ends of the list (and from the window itself, its fallback focus); anywhere else the browser moves focus in
 *  document order. So a focusable node the list does not name (a scroll region Chromium makes focusable, #2124 review)
 *  is passed through, never mistaken for an end. */
export const trapTab = (dlg: HTMLElement, e: KeyboardEvent): void => {
  if (e.key !== 'Tab') return;
  const f = focusables(dlg);
  if (!f.length) { e.preventDefault(); return; }
  const at = document.activeElement as HTMLElement;
  const i = f.indexOf(at);
  if (i < 0) {
    if (at === dlg || !dlg.contains(at)) { e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus(); }
    return;
  }
  if (e.shiftKey && i === 0) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
};
