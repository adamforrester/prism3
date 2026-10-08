/**
 * The preview pane's header and Inspect (UI redesign S1.3, `docs/superpowers/ui-redesign/implementation-plan.md`
 * §3.5, §3.7 and §3.8): the mode control, the Inspect menu, the Inspect views, and the verdict on the bar.
 *
 * THE MODE CONTROL (Q1, model B). The preview owns the viewing mode: a radio group in the preview header,
 * one radio per mode the brand ships, derived modes hatched. It writes `setCurrentMode`, the same setter the
 * legacy mode strip uses, and repaints from the `mode` topic, so the two can never disagree: a mode chosen
 * here is the mode a legacy page renders in, and the other way round.
 *
 * INSPECT (F1, V1). Contrast, Tokens and the Decisions log open over the current page's preview and close
 * back to it. They never become a page's home (`pages.ts`). Contrast opens with Health at the top (v5 Q2,
 * Q7), which says what the verdict counts; the verdict on the bar opens it. Contrast's pair table and the
 * token list are the legacy renderers, lent by `main.ts` until a later slice replaces them; they draw in the
 * legacy styles, so their host is pinned light (D2), like every other legacy surface. Health and the
 * Decisions log are the shell's own and follow the chrome theme. The Decisions log is the engine's notes,
 * as the engine words them (`theme.notes`); this file never rewrites one.
 *
 * Repaints come from store topics (plan §3.10): `brand` (every rebuild) and `mode`. Nothing here calls a
 * legacy repaint tier.
 */
import { currentMode, rp, setCurrentMode, subscribe, theme } from '../state/store';
import { breadthLine, healthLine, isDerived, modeLine, verdictLine, verdictOf, type Verdict } from '../state/verdict';
import { INSPECT, type InspectId } from './pages';
import { glyph, h, hook, tile } from './dom';
import { ENGINE_VERSION } from '@prism3/engine/version';
import { buildChip, buildTitle } from '../build-identity';

/** Short mode names, as the legacy mode strip and concept v6 show them. A custom mode shows its own name. */
const MODE_LABEL: Record<string, string> = { light: 'Light', dark: 'Dark', 'hc-light': 'HC light', 'hc-dark': 'HC dark', wireframe: 'Wireframe' };
/** Full mode names, for Health's per-mode lines (concept v6's `FULL_MODE_LABEL`). */
const MODE_NAME: Record<string, string> = { light: 'Light', dark: 'Dark', 'hc-light': 'High contrast light', 'hc-dark': 'High contrast dark', wireframe: 'Wireframe' };
export const modeLabel = (m: string): string => MODE_LABEL[m] ?? m;

/** The verdict for the resolved theme, over the modes it ships. */
export const verdict = (): Verdict => verdictOf(theme, rp.modes);

/** The legacy views Inspect shows until their slices replace them, lent by `main.ts`. */
export type InspectLegacy = {
  /** The all-modes contrast contract table (`renderPreviewContracts`). */
  readonly contrast: (host: HTMLElement) => void;
  /** The token list (`renderPreviewTokens`). Its own controls call `repaint` to redraw it in place. */
  readonly tokens: (host: HTMLElement, repaint: () => void) => void;
};

/** Arrow keys, Home and End along a row of radios or tabs. Null for any other key. */
export const stepKey = (list: readonly HTMLElement[], from: HTMLElement, key: string): HTMLElement | null => {
  const i = list.indexOf(from);
  if (i < 0) return null;
  if (key === 'Home') return list[0];
  if (key === 'End') return list[list.length - 1];
  if (key === 'ArrowRight' || key === 'ArrowDown') return list[(i + 1) % list.length];
  if (key === 'ArrowLeft' || key === 'ArrowUp') return list[(i - 1 + list.length) % list.length];
  return null;
};

// ── the mode control ───────────────────────────────────────────────────────────────────────────────
/** A radio group of the brand's modes. Each radio carries a status dot (and the count below floor, when
 *  there is one), as in concept v6; a derived mode is hatched while it is not the one selected.
 *
 *  NO OPTION IS EVER CLIPPED (orchestrator review of #1939). The header is one row (Q2), so a brand with more
 *  modes than fit beside the title (a custom mode or two) does not wrap it. Instead the radios give way to a
 *  select of the same modes, as concept v6 does when its preview is slim (its `modesel`), and come back when
 *  they fit again. Which one shows is measured from the radios' own widths whenever the header resizes or the
 *  mode set changes; a scroll that hides an option is never left on screen. */
export type ModeControl = {
  readonly el: HTMLElement;
  /** PM1 B (owner, 2026-10-08; #2321): hold the control in Prism3's disabled skin, every radio and the select by
   *  their own `disabled` (#2284's pattern: out of the tab order, disabled to assistive technology), described by
   *  `why`, the id of the line that says why. `null` releases it. */
  readonly hold: (why: string | null) => void;
};
export const modeControl = (cleanups: (() => void)[]): ModeControl => {
  const wrap = h('div', 'p3-modes-wrap');
  const group = hook(h('div', 'p3-seg p3-modes'), 'mode-control');
  const selWrap = h('div', 'p3-selwrap p3-modes-select');
  const select = hook(h('select', 'p3-select'), 'mode-select');
  select.setAttribute('aria-label', 'Preview mode');
  select.onchange = () => { if (currentMode !== select.value) setCurrentMode(select.value as typeof currentMode); };
  selWrap.append(select, glyph('chev'));
  wrap.append(group, selWrap);
  wrap.dataset.fit = 'radios';
  /** Radios when every one fits, the select otherwise. */
  const fit = (): void => {
    if (!wrap.isConnected) return;
    if (wrap.dataset.fit !== 'radios') wrap.dataset.fit = 'radios';
    const over = group.scrollWidth > group.clientWidth + 1;
    if (over) wrap.dataset.fit = 'select';
  };
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', 'Preview mode');
  let radios: HTMLButtonElement[] = [];
  let shape = '';
  let why: string | null = null;
  /** The hold, put on every radio and the select; re-run when the radios are redrawn for a new mode set. */
  const applyHold = (): void => {
    for (const n of [...radios, select]) {
      if (n.disabled !== (why !== null)) n.disabled = why !== null;
      if (why) n.setAttribute('aria-describedby', why); else n.removeAttribute('aria-describedby');
    }
  };
  const paint = (): void => {
    const v = verdict();
    const modes = rp.modes as readonly string[];
    if (modes.join(' ') !== shape) {
      shape = modes.join(' ');
      radios = modes.map((m) => {
        const b = hook(h('button', 'p3-seg-tab p3-mode'), 'mode-option');
        b.type = 'button';
        b.dataset.mode = m;
        b.setAttribute('role', 'radio');
        if (isDerived(m)) b.dataset.derived = 'true';
        b.onclick = () => { if (currentMode !== m) setCurrentMode(m as typeof currentMode); };
        return b;
      });
      group.replaceChildren(...radios);
      applyHold();
      queueMicrotask(fit);
    }
    for (const b of radios) {
      const m = b.dataset.mode!;
      const f = v.per.find((x) => x.mode === m)?.f ?? 0;
      const on = m === currentMode;
      // Redrawn only when what it says moved (S2: the control is on screen beside the levers now, so a
      // same-value redraw on every edit cost a layout of the header each time).
      const sig = `${f}|${on}`;
      if (b.dataset.sig === sig) continue;
      b.dataset.sig = sig;
      const dot = h('span', f ? 'p3-dot p3-dot-bad' : 'p3-dot p3-dot-ok');
      dot.setAttribute('aria-hidden', 'true');
      const parts: (Node | string)[] = [h('span', 'p3-mode-name', modeLabel(m)), dot];
      if (f) parts.push(h('span', 'p3-mode-count', String(f)));
      b.replaceChildren(...parts);
      b.setAttribute('aria-label', `${modeLabel(m)}${isDerived(m) ? ', derived' : ''}, ${f ? `${f} below floor` : 'all pairs at or above floor'}`);
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    // The select carries the same modes in the same words (concept v6's `modesel`).
    const opts = modes.map((m) => {
      const f = v.per.find((x) => x.mode === m)?.f ?? 0;
      return [m, `${modeLabel(m)}${isDerived(m) ? ' (derived)' : ''} · ${f ? `${f} below floor` : 'all pass'}`];
    });
    const sig = JSON.stringify(opts);
    if (select.dataset.sig !== sig) {
      select.dataset.sig = sig;
      select.replaceChildren(...opts.map(([m, l]) => { const o = h('option', undefined, l); o.value = m; return o; }));
    }
    if (select.value !== currentMode) select.value = currentMode;
  };
  group.addEventListener('keydown', (e) => {
    const to = stepKey(radios, e.target as HTMLElement, e.key);
    if (!to) return;
    e.preventDefault();
    to.focus();
    to.click();
  });
  cleanups.push(subscribe('mode', paint), subscribe('brand', paint));
  paint();
  // The header's width decides the fit; it is observed once the control is placed in it. Toggling between the
  // radios and the select never changes the header's own size, so this cannot loop.
  const ro = new ResizeObserver(fit);
  queueMicrotask(() => { if (wrap.parentElement) ro.observe(wrap.parentElement); fit(); });
  cleanups.push(() => ro.disconnect());
  return { el: wrap, hold: (w) => { why = w; applyHold(); } };
};

// ── the verdict on the top bar ─────────────────────────────────────────────────────────────────────
/** Contrast, a bar tile (the owner's top-bar decision, 2026-10-05): a check while every pair passes, a warning
 *  glyph and the count below floor otherwise, over the label "Contrast". The verdict's line is the tooltip; the
 *  name carries the line in every tier, unchanged ("Verdict: <line>. Open Inspect, Contrast"). A click opens
 *  Inspect › Contrast, as before. */
export const verdictButton = (open: (opener: HTMLElement) => void, cleanups: (() => void)[]): HTMLButtonElement => {
  const { btn: b, mark, tip } = tile('verdict', 'Contrast', true);
  const paint = (): void => {
    const v = verdict();
    const line = verdictLine(v);
    if (b.dataset.line === line) return;   // unchanged: no redraw (S2, as the mode control)
    b.dataset.line = line;
    const g = glyph(v.fail ? 'warn' : 'check');
    g.classList.add(v.fail ? 'p3-tile-bad' : 'p3-tile-ok');
    if (v.fail) mark.replaceChildren(g, hook(h('span', 'p3-tile-count', String(v.fail)), 'verdict-count'));
    else mark.replaceChildren(g);
    tip.textContent = line;
    b.dataset.state = v.fail ? 'fail' : 'ok';
    b.setAttribute('aria-label', `Verdict: ${line}. Open Inspect, Contrast`);
  };
  b.onclick = () => open(b);
  cleanups.push(subscribe('brand', paint));
  paint();
  return b;
};

// ── the Inspect menu, in the preview header ────────────────────────────────────────────────────────
/** "Inspect", a button that opens a menu of the three views (concept v6). Contrast's item says how the
 *  verdict stands. */
export const inspectMenu = (open: (v: InspectId, opener: HTMLElement) => void, cleanups: (() => void)[]): HTMLElement => {
  const wrap = h('div', 'p3-popwrap');
  const btn = hook(h('button', 'p3-btn p3-btn-page'), 'inspect-open');
  btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-controls', 'p3-inspect-menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.append(glyph('layers'), h('span', 'p3-btn-label', 'Inspect'), glyph('chev'));
  const menu = hook(h('div', 'p3-menu'), 'inspect-menu');
  menu.id = 'p3-inspect-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Inspect');
  const items = INSPECT.map(([v, label]) => {
    const it = hook(h('button', 'p3-menu-item'), `inspect-option-${v}`);
    it.type = 'button';
    it.setAttribute('role', 'menuitem');
    it.tabIndex = -1;
    it.append(h('span', 'p3-menu-label', label));
    if (v === 'contrast') it.append(h('span', 'p3-menu-note'));
    it.onclick = () => { close(false); open(v, btn); };
    return it;
  });
  menu.append(...items);
  // THE BUILD STAMP (#474; owner decision C3 A, 2026-10-05): which engine and which build this is, at the foot of the
  // menu in small text. It stood at the foot of the Pages menu until S8.2 removed that menu on the web (G19); it moved
  // here on both hosts, since the plugin showed it too. Its text is unchanged: `engine <version>`, then the build chip
  // (`build-identity.ts`, asserted in `test-build-identity.ts`), the full reading in its title. Not a menu item: it is
  // read and selected, never chosen, so arrow keys pass it by.
  const stamp = hook(h('p', 'p3-menu-stamp'), 'build-stamp');
  stamp.setAttribute('role', 'none');
  stamp.append(h('span', undefined, `engine ${ENGINE_VERSION}`), h('span', 'p3-menu-stamp-b', buildChip(PRISM3_BUILD)));
  stamp.title = buildTitle(PRISM3_BUILD);
  menu.append(stamp);
  const note = items[0].querySelector('.p3-menu-note')!;
  const paint = (): void => { const v = verdict(); note.textContent = v.fail ? `${v.fail} below floor` : 'all pass'; };
  const isOpen = (): boolean => menu.isConnected;
  const onDown = (e: MouseEvent): void => { if (!wrap.contains(e.target as Node)) close(false); };
  const show = (): void => {
    paint();
    wrap.append(menu);
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('mousedown', onDown);
    items[0].focus();
  };
  function close(refocus: boolean): void {
    if (!isOpen()) return;
    menu.remove();
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', onDown);
    if (refocus) btn.focus();
  }
  btn.onclick = () => (isOpen() ? close(true) : show());
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
    if (e.key === 'Tab') { close(false); return; }
    const to = stepKey(items, document.activeElement as HTMLElement, e.key);
    if (to) { e.preventDefault(); to.focus(); }
  });
  cleanups.push(() => document.removeEventListener('mousedown', onDown));
  wrap.append(btn);
  return wrap;
};

// ── the Inspect views ──────────────────────────────────────────────────────────────────────────────
/** A container with a tracked small-capital title, as concept v6's cards. */
const card = (title: string, sub: string | null, role: string): { el: HTMLElement; body: HTMLElement } => {
  const el = hook(h('section', 'p3-card'), role);
  const head = h('header', 'p3-card-head');
  const t = h('h3', 'p3-card-title', title);
  head.append(t);
  if (sub) head.append(h('span', 'p3-card-sub', sub));
  const body = h('div', 'p3-card-body');
  el.append(head, body);
  return { el, body };
};

/** Health: what the verdict counts, per mode (v5 Q2, Q7). The top of Inspect › Contrast. */
const health = (): HTMLElement => {
  const v = verdict();
  const { el, body } = card('Health', 'What the verdict counts', 'health');
  const row = h('p', 'p3-health-row');
  const pill = hook(h('span', v.fail ? 'p3-vpill p3-vpill-bad' : 'p3-vpill'), 'health-summary');
  pill.append(glyph(v.fail ? 'x' : 'check'), h('span', undefined, healthLine(v)));
  row.append(pill, h('span', 'p3-note', breadthLine(v, modeLabel)));
  const list = hook(h('ul', 'p3-health-modes'), 'health-modes');
  for (const m of v.per) {
    const li = h('li', 'p3-health-mode');
    const dot = h('span', m.f ? 'p3-dot p3-dot-bad' : 'p3-dot p3-dot-ok');
    dot.setAttribute('aria-hidden', 'true');
    li.append(dot, h('span', undefined, modeLine(m, MODE_NAME[m.mode] ?? m.mode)));
    list.append(li);
  }
  body.append(row, list);
  return el;
};

/** The Decisions log: the engine's notes for this brand, in its order and its words (D4). */
const decisionsLog = (): HTMLElement => {
  const notes = theme.notes;
  const wrap = h('div', 'p3-stack');
  const { el, body } = card('Decisions log', `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`, 'decisions-log');
  const list = hook(h('ul', 'p3-log'), 'decisions-list');
  for (const n of notes) list.append(hook(h('li', 'p3-log-item', n), 'decision'));
  body.append(list);
  wrap.append(el, h('p', 'p3-note', `${notes.length} ${notes.length === 1 ? 'decision' : 'decisions'} the engine recorded for this brand, in the engine's own words.`));
  return wrap;
};

/** A host for a legacy view, pinned light: it draws in `styles.css`, which has no dark theme (D2). */
const legacyHost = (role: string): HTMLElement => {
  const n = hook(h('div', 'p3-legacy-card'), role);
  n.dataset.theme = 'light';
  return n;
};

/** Paint one Inspect view into `body`. */
export const paintInspectView = (v: InspectId, body: HTMLElement, legacy: InspectLegacy, repaint: () => void): void => {
  const stack = h('div', 'p3-stack');
  if (v === 'contrast') {
    stack.append(health());
    const host = legacyHost('inspect-contrast-table');
    legacy.contrast(host);
    stack.append(host);
  } else if (v === 'tokens') {
    const host = legacyHost('inspect-token-list');
    legacy.tokens(host, repaint);
    stack.append(host);
  } else {
    stack.append(decisionsLog());
  }
  body.replaceChildren(stack);
};
