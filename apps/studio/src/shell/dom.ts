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

import { TABLER, type TablerIcon } from './icons/tabler';

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

/**
 * #3150, the chrome's motion: a mark that lasts until the next frame. A toggle that opens its content (a fold-out, Expand)
 * or a host answer that lands rows in a dialog calls `armEnter(key)`; every redraw before the next frame passes what it
 * draws for that key through `enterMark`, which marks it `data-enter="true"`, and `chrome.css` fades it in once. A redraw
 * after that frame (an edit, a run's progress, a page change) draws it unmarked, so nothing replays. A frame, not one
 * redraw, because a change often repaints twice in one task.
 */
const armed = new Set<string>();
export const armEnter = (key: string): void => { armed.add(key); requestAnimationFrame(() => { armed.delete(key); }); };
export const enterMark = <E extends HTMLElement>(el: E, key: string): E => {
  if (armed.has(key)) el.dataset.enter = 'true'; else delete el.dataset.enter;
  return el;
};
/** Whether `key` was armed this frame. */
export const entering = (key: string): boolean => armed.has(key);

/** #3207, THE EXIT OF A SURFACE THE SHELL REMOVES (a menu, a dialog's scrim, the bar row's unread dot). CSS cannot animate
 *  a node once it is out of the DOM, so the removal is deferred: the node is marked `data-leaving`, which the stylesheet
 *  gives its exit (`motion-fast`, the exit curve; under reduced motion a 100ms fade, Q3150.3 A), and it is removed once
 *  the exit's own animations finish. While it leaves it is `inert`, so nothing in it holds or takes focus or a click, and
 *  every reader of "is it open" reads it as closed (`isLeaving`). With no exit running (the motion durations at 0s, or a
 *  node that is not drawn) it is removed at once, as before. Called again on a leaving node, it does nothing; `unleave`
 *  takes the mark back, and an exit already under way then removes nothing. */
const leaves = new WeakMap<HTMLElement, number>();
let leaveSeq = 0;
export const isLeaving = (n: Element | null | undefined): boolean => !!n && !!n.closest('[data-leaving="true"]');
export const leave = (node: HTMLElement): void => {
  if (!node.isConnected || node.dataset.leaving === 'true') return;
  node.dataset.leaving = 'true';
  node.inert = true;
  const id = ++leaveSeq;
  leaves.set(node, id);
  const moving = typeof node.getAnimations === 'function'
    ? node.getAnimations({ subtree: true }).filter((a) => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity))
    : [];
  const gone = (): void => { if (leaves.get(node) === id && node.dataset.leaving === 'true') node.remove(); };
  if (!moving.length) { gone(); return; }
  void Promise.all(moving.map((a) => a.finished.catch(() => undefined))).then(gone);
};
export const unleave = (node: HTMLElement): void => {
  if (node.dataset.leaving !== 'true') return;
  leaves.delete(node);
  delete node.dataset.leaving;
  node.inert = false;
};

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

/**
 * Chrome glyphs (#3083, Q813 A): each chrome name draws one Tabler outline icon, vendored as path data in
 * `icons/tabler.ts`, never a hand-drawn path. The names are the chrome's own, so a control and its tests say what
 * it means (`chev`, `warn`) and the icon behind it can change in one place. Each maps to the nearest Tabler icon;
 * Minimize's `collapse` and the strip's `restore` are one diagonal's arrows turned inward and outward, an exact
 * mirror (#2909 rail polish, the owner, 2026-10-26).
 */
const GLYPHS = {
  chev: 'chevron-down',
  chevl: 'chevron-left',
  chevr: 'chevron-right',
  check: 'check',
  dash: 'minus',
  x: 'x',
  plus: 'plus',
  search: 'search',
  info: 'info-circle',
  warn: 'alert-triangle',
  error: 'alert-circle',
  help: 'help',
  // Appearance draws the current choice's glyph (Q2995.3 B): Match Figma, light, dark.
  system: 'device-desktop',
  sun: 'sun',
  moon: 'moon',
  layers: 'stack-2',
  pulse: 'activity',
  agent: 'robot-face',
  // Surfaces & fills' icon pairing button (S4f, QA-B12): locked while icons follow their text, unlocked while set on their own.
  lock: 'lock',
  unlock: 'lock-open',
  restore: 'arrows-diagonal',
  collapse: 'arrows-diagonal-minimize-2',
  // The plugin rail (Q2909.14 A, Q2909.19 A): Theme, Components, Documentation, Export; the Agent link. Theme draws
  // Tabler's color swatch since #3164 (the owner, 2026-10-30), three circles before.
  swatches: 'color-swatch',
  diamonds: 'components',
  page: 'file-text',
  send: 'upload',
  link: 'link',
} as const satisfies Record<string, TablerIcon>;
export type Glyph = keyof typeof GLYPHS;

const SVG_NS = 'http://www.w3.org/2000/svg';
/** A decorative glyph, hidden from assistive technology: the control it sits in carries the name. Drawn on
 *  Tabler's 24-unit grid with a 1.5 stroke in `currentColor`, round caps and joins, at the size `chrome.css`
 *  gives `.p3-ico`. */
export const glyph = (name: Glyph): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'p3-ico');
  svg.setAttribute('viewBox', '0 0 24 24');
  for (const [k, v] of [['fill', 'none'], ['stroke', 'currentColor'], ['stroke-width', '1.5'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round']]) svg.setAttribute(k, v);
  svg.setAttribute('aria-hidden', 'true');
  // Its name, so a test can say which glyph a control draws (#2995: the rail's icons, read against Q2909.19 A),
  // and the Tabler icon it draws (#3083).
  svg.dataset.glyph = name;
  svg.dataset.icon = GLYPHS[name];
  for (const d of TABLER[GLYPHS[name]]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
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
 * A `null` label draws the mark alone at every tier, with no label node (`p3-tile-bare`): the rail foot's Minimize, Help
 * and Appearance (#3083, the owner, 2026-10-28). The name and the tooltip are the caller's, as for every tile.
 */
export type Tile = { readonly btn: HTMLButtonElement; readonly mark: HTMLElement; readonly tip: HTMLElement };
export const tile = (role: string, label: string | null, start = false): Tile => {
  const btn = hook(h('button', start ? 'p3-btn p3-tile p3-tile-start' : 'p3-btn p3-tile'), role);
  btn.type = 'button';
  return tileParts(btn, role, label);
};
const tileParts = <B extends HTMLElement>(btn: B, role: string, label: string | null): { readonly btn: B; readonly mark: HTMLElement; readonly tip: HTMLElement } => {
  const mark = h('span', 'p3-tile-mark');
  const tip = hook(h('span', 'p3-tile-tip'), `${role}-tip`);
  tip.setAttribute('aria-hidden', 'true');
  if (label === null) { btn.classList.add('p3-tile-bare'); btn.append(mark, tip); return { btn, mark, tip }; }
  const lab = h('span', 'p3-tile-label', label);
  lab.setAttribute('aria-hidden', 'true');
  btn.append(mark, lab, tip);
  return { btn, mark, tip };
};
/** A bar tile that is a link (#2637 Q384: the web's Docs): the same parts and tiers as `tile`, on an anchor, so it
 *  opens in a new tab and the brand being edited stays put. */
export const linkTile = (role: string, label: string | null, href: string): { readonly btn: HTMLAnchorElement; readonly mark: HTMLElement; readonly tip: HTMLElement } => {
  const btn = hook(h('a', 'p3-btn p3-tile'), role);
  btn.setAttribute('href', href);
  btn.setAttribute('target', '_blank');
  btn.setAttribute('rel', 'noopener');
  return tileParts(btn, role, label);
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
  // #3207: a closing menu stays in the DOM through its exit (`leave`), and reads as closed from the moment it closes.
  const isOpen = (): boolean => menu.isConnected && menu.dataset.leaving !== 'true';
  const onDown = (e: MouseEvent): void => { if (!wrap.contains(e.target as Node)) close(false); };
  const open = (): void => {
    o.before?.();
    // Opened again mid-exit: the leaving menu goes at once and enters afresh.
    if (menu.dataset.leaving === 'true') { unleave(menu); menu.remove(); }
    wrap.append(menu);
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('mousedown', onDown);
    (first() ?? btn).focus();
  };
  function close(refocus: boolean): void {
    if (!isOpen()) return;
    leave(menu);
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
