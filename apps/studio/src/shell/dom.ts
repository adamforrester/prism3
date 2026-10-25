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

/** THE CHROME'S ONE SWITCH (SG5 A, #2183; concept v6's track and knob): a button with `role="switch"` holding a track
 *  and a knob, named by `label`. Its state is `aria-checked` alone, with no state words (the owner, 2026-10-08), and its
 *  focus ring is its own outline (FR1 A). Disabled, it draws Prism3's own disabled switch roles (#2237, `chrome.css`).
 *  Every chrome switch is made here: the levers' (`switchButton`) and Build style guides'. */
export const switchEl = (role: string, label: string, onToggle: (on: boolean) => void): { el: HTMLButtonElement; set: (on: boolean) => void } => {
  const el = hook(h('button', 'p3-switch'), role);
  el.type = 'button';
  el.setAttribute('role', 'switch');
  el.setAttribute('aria-label', label);
  const track = h('span', 'p3-switch-track');
  track.setAttribute('aria-hidden', 'true');
  track.append(h('span', 'p3-switch-knob'));
  el.append(track);
  el.onclick = () => onToggle(el.getAttribute('aria-checked') !== 'true');
  return { el, set: (on) => el.setAttribute('aria-checked', String(on)) };
};

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
  docs: '<path d="M8 4.4C6.6 3.4 4.6 3 2.2 3.2v9.2c2.4-.2 4.4.2 5.8 1.2 1.4-1 3.4-1.4 5.8-1.2V3.2C11.4 3 9.4 3.4 8 4.4zM8 4.4v9.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
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
  // #2949: the agent link strip's Restore (two arrows, out to opposite corners).
  restore: '<path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5L9 7M2.5 13.5L7 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  // S11.2: the Build style guides page's part-checked box (a dash) and a table that was not drawn (concept v6's error).
  dash: '<path d="M4 8h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  error: '<circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.6v4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11.2" r="0.95" fill="currentColor"/>',
  // #2909 IA v2 phase 1: the plugin rail's icons (Q2909.14 A; Q2909.19 A, Chunk 2, 2026-10-24): three swatches (Theme), four diamonds (Components), a page with ruled lines (Documentation), an arrow up out
  // of a tray (Export), a chain link (Agent), a question mark in a circle (Help). Appearance draws the current choice's glyph (Q2995.3 B).
  swatches: '<circle cx="5.3" cy="6" r="2.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10.7" cy="6" r="2.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="10.8" r="2.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  diamonds: '<path d="M8 1.9l2 2-2 2-2-2zM3.9 6l2 2-2 2-2-2zM12.1 6l2 2-2 2-2-2zM8 10.1l2 2-2 2-2-2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  page: '<path d="M4 2h5.3L12 4.7V14H4zM9.3 2v2.7H12M6 8h4M6 10.4h4M6 5.8h1.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  send: '<path d="M8 10V2.7M5.2 5.5L8 2.7l2.8 2.8M3.3 9.3v4h9.4v-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  link: '<path d="M6.7 9.3a2.7 2.7 0 0 0 3.8 0l2-2a2.7 2.7 0 0 0-3.8-3.8l-.7.7M9.3 6.7a2.7 2.7 0 0 0-3.8 0l-2 2a2.7 2.7 0 0 0 3.8 3.8l.7-.7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  help: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.4 6.4a1.7 1.7 0 0 1 3.2.6c0 1.1-1.6 1.4-1.6 2.4M8 11.3v.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
} as const;
export type Glyph = keyof typeof GLYPHS;

/** A decorative glyph, hidden from assistive technology: the control it sits in carries the name. */
export const glyph = (name: Glyph): SVGSVGElement => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'p3-ico');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  // Its name, so a test can say which glyph a control draws (#2995: the rail's icons, read against Q2909.19 A).
  svg.dataset.glyph = name;
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
 * above the narrow tier and drops at it (`NARROW_MAX`), and above it whenever the full bar would not fit on one row
 * (`frame.ts`'s `fitBar`, #2214), leaving the mark and the tooltip. The accessible name is the
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
/** A bar tile that is a link (#2637 Q384: the web's Docs): the same parts and tiers as `tile`, on an anchor, so it
 *  opens in a new tab and the brand being edited stays put. */
export const linkTile = (role: string, label: string, href: string): { readonly btn: HTMLAnchorElement; readonly mark: HTMLElement; readonly tip: HTMLElement } => {
  const btn = hook(h('a', 'p3-btn p3-tile'), role);
  btn.setAttribute('href', href);
  btn.setAttribute('target', '_blank');
  btn.setAttribute('rel', 'noopener');
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

/**
 * A menu button's open, close and keys, in one place (#2487 B5). The bar's Theme, Figma and the preview's Inspect menus
 * each carried their own copy, and the copies drifted: only Figma opened on ArrowDown, and Theme's Escape did not stop
 * propagation, so it also closed whatever sat under it. Each now hands its parts here:
 *   · the button toggles the menu, and ArrowDown on it opens the menu;
 *   · in the menu, Escape closes it onto the button and goes no further, Tab closes it and moves on, and ArrowDown,
 *     ArrowUp, Home and End move along `list()` (wrapping), which a menu may narrow (Figma's enabled items);
 *   · a press outside closes it; `open` focuses `first()` (the current choice, or the first item), or the button;
 *   · `before` runs as it opens (a menu that fills or paints itself then).
 * The menu's own items, labels and `onclick`s stay the caller's.
 */
export const menuButton = (o: {
  readonly wrap: HTMLElement; readonly btn: HTMLElement; readonly menu: HTMLElement;
  readonly list: () => HTMLElement[]; readonly first: () => HTMLElement | undefined;
  readonly before?: () => void; readonly cleanups: (() => void)[];
}): { readonly isOpen: () => boolean; readonly open: () => void; readonly close: (refocus: boolean) => void } => {
  const { wrap, btn, menu, list, first } = o;
  const isOpen = (): boolean => menu.isConnected;
  const onDown = (e: MouseEvent): void => { if (!wrap.contains(e.target as Node)) close(false); };
  const open = (): void => {
    o.before?.();
    wrap.append(menu);
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('mousedown', onDown);
    (first() ?? btn).focus();
  };
  function close(refocus: boolean): void {
    if (!isOpen()) return;
    menu.remove();
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', onDown);
    if (refocus) btn.focus();
  }
  btn.onclick = () => (isOpen() ? close(true) : open());
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && !isOpen()) { e.preventDefault(); open(); }
  });
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
    if (e.key === 'Tab') { close(false); return; }
    const l = list();
    if (!l.length) return;
    const i = l.indexOf(document.activeElement as HTMLElement);
    const to = e.key === 'ArrowDown' ? l[(i + 1) % l.length]
      : e.key === 'ArrowUp' ? l[(i - 1 + l.length) % l.length]
        : e.key === 'Home' ? l[0] : e.key === 'End' ? l[l.length - 1] : null;
    if (to) { e.preventDefault(); to.focus(); }
  });
  btn.setAttribute('aria-expanded', 'false');
  o.cleanups.push(() => document.removeEventListener('mousedown', onDown));
  return { isOpen, open, close };
};
