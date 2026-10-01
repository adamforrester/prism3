/**
 * The frame (UI redesign S1.2, `docs/superpowers/ui-redesign/implementation-plan.md` §3.3–3.6 and §4):
 * the top bar, the tab row with Color's sub-row, the two panes, the legacy frame, and narrow mode.
 *
 * WHAT IT OWNS AND WHAT IT LENDS. The frame is mounted once per app view and outlives every legacy
 * render, so a tab keeps focus across the page change it causes. It lends four slots to the legacy code
 * in `main.ts`, which fills them on every `build()`: the bar's legacy controls (brand switcher, Export,
 * Pages, and the plugin's write actions until S1.4), the notices (the engine error and the apply detail),
 * and the legacy page itself. Everything else here is the shell's own.
 *
 * HOW IT TALKS TO THE REST OF THE APP: store setters out, store topics in (plan §3.10). A tab click calls
 * `setPage`; the legacy frame repaints because `main.ts` subscribes to `page`, and the tab row repaints
 * its selection because it subscribes too. Nothing here calls a legacy repaint tier, and
 * `test-shell-imports.ts` fails the build of any file under `shell/` that names one.
 *
 * WHAT EACH PAGE SHOWS IN S1.2. Every tab and sub-page is still legacy (`pages.ts`), so each shows its
 * legacy page in the full-width legacy frame under the tab row, pinned light (D1, D2). The two panes are
 * built and laid out, and hidden until a domain slice moves a page (S2 first). Depth & motion carries a
 * local switch between its two legacy pages (D8).
 *
 * NARROW MODE (Q7) is a width class, `data-w="narrow"`, set from the frame's own width, because the chrome
 * stylesheet may not hold a raw length and a media or container query needs one. Under it the tab row
 * becomes a select, only the top row stays sticky, and the bar's text buttons drop to their glyphs.
 */
import { page, searchHits, searchQuery, setPage, setSearch, subscribe, type PageKey } from '../state/store';
import { LEGACY_LABEL, TABS, legacyOf, placeId, placeOfPage, placeOfTab, type Host, type Place, type TabId } from './pages';
import { glyph, h, hook } from './dom';
import { THEME_CHOICES, setThemePref, themePref, type ThemePref } from './theme';

/** The frame width at or below which it lays out as one narrow column (concept v6's `appNarrow`). */
export const NARROW_MAX = 560;

export type Frame = {
  /** The sticky region: the bar, the tab row and the notices. */
  readonly head: HTMLElement;
  /** Slot: the bar's legacy controls. */
  readonly bar: HTMLElement;
  /** Slot: the legacy notices, pinned light. */
  readonly notices: HTMLElement;
  /** Slot: the legacy page, inside the legacy frame. */
  readonly legacyPage: HTMLElement;
  /** Publish the sticky region's height as `--chrome-h`, which the legacy mode strip sticks below. */
  readonly syncSticky: () => void;
  /** Remove the frame and drop its subscriptions and listeners. */
  readonly unmount: () => void;
};

const kebab = (k: string): string => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const PANEL_ID = 'p3-panel';
const LEGACY_PAGE_ID = 'p3-legacy-page';

/** Arrow keys, Home and End move along a tablist and select as they go (automatic activation, as in
 *  concept v6). Returns the tab to select, or null for any other key. */
const nextTab = (list: readonly HTMLElement[], from: HTMLElement, key: string): HTMLElement | null => {
  const i = list.indexOf(from);
  if (i < 0) return null;
  if (key === 'Home') return list[0];
  if (key === 'End') return list[list.length - 1];
  if (key === 'ArrowRight') return list[(i + 1) % list.length];
  if (key === 'ArrowLeft') return list[(i - 1 + list.length) % list.length];
  return null;
};

/** One tab button. Selection is `aria-selected` plus a roving `tabindex`, set by the caller. */
const tabButton = (cls: 'p3-tab' | 'p3-seg-tab', id: string, role: string, label: string, controls: string): HTMLButtonElement => {
  const b = hook(h('button', cls, label), role);
  b.type = 'button';
  b.id = id;
  b.setAttribute('role', 'tab');
  b.setAttribute('aria-controls', controls);
  return b;
};

const select = (tabs: readonly HTMLElement[], on: HTMLElement | null): void => {
  for (const t of tabs) {
    const yes = t === on;
    t.setAttribute('aria-selected', String(yes));
    t.tabIndex = yes || (!on && t === tabs[0]) ? 0 : -1;
  }
};

export const mountFrame = (app: HTMLElement, opts: { readonly host: Host }): Frame => {
  const { host } = opts;
  const cleanups: (() => void)[] = [];
  let place: Place | null = placeOfPage(page, host, null);

  app.classList.add('p3-app');
  const root = hook(h('div', 'p3-frame'), 'frame');
  const head = hook(h('header', 'p3-head'), 'frame-head');

  // ── the top bar ────────────────────────────────────────────────────────────────────────────────
  const bar = hook(h('div', 'p3-bar'), 'top-bar');
  const barSlot = h('div', 'p3-bar-slot');
  bar.append(barSlot);

  // The narrow Settings / Preview toggle (Q7). It switches the two panes, so it is hidden while the page
  // is legacy, which in S1.2 is always.
  const paneToggle = hook(h('div', 'p3-seg p3-pane-toggle'), 'pane-toggle');
  paneToggle.setAttribute('role', 'group');
  paneToggle.setAttribute('aria-label', 'Show');
  let pane: 'settings' | 'preview' = 'settings';
  const paneButtons = (['settings', 'preview'] as const).map((p) => {
    const b = hook(h('button', 'p3-seg-tab', p === 'settings' ? 'Settings' : 'Preview'), `pane-toggle-${p}`);
    b.type = 'button';
    b.onclick = () => { pane = p; render(); };
    return b;
  });
  paneToggle.append(...paneButtons);
  bar.append(paneToggle);

  // The theme toggle, studio only (F3). The plugin follows Figma's theme and offers no choice.
  if (host === 'web') bar.append(themeToggle(cleanups));

  // ── the tab row and Color's sub-row ─────────────────────────────────────────────────────────────
  const nav = hook(h('div', 'p3-nav'), 'tab-row');
  const tabList = h('div', 'p3-tabs');
  tabList.setAttribute('role', 'tablist');
  tabList.setAttribute('aria-label', 'Settings domains');
  const tabs = TABS.map((t) => {
    const b = tabButton('p3-tab', `p3-tab-${t.id}`, `tab-${t.id}`, t.label, PANEL_ID);
    b.onclick = () => go(placeOfTab(t.id));
    return b;
  });
  tabList.append(...tabs);
  tabList.addEventListener('keydown', (e) => {
    const to = nextTab(tabs, e.target as HTMLElement, e.key);
    if (!to) return;
    e.preventDefault();
    to.focus();
    go(placeOfTab(TABS[tabs.indexOf(to as HTMLButtonElement)].id));
  });

  // At narrow widths the tabs become a select (Q7).
  const domRow = h('div', 'p3-domrow');
  const domSelect = hook(h('select', 'p3-select'), 'tab-select');
  domSelect.setAttribute('aria-label', 'Settings domain');
  for (const t of TABS) {
    const o = h('option');
    o.value = t.id; o.textContent = t.label;
    domSelect.append(o);
  }
  domSelect.onchange = () => go(placeOfTab(domSelect.value as TabId));
  const domWrap = h('div', 'p3-selwrap');
  domWrap.append(domSelect, glyph('chev'));
  domRow.append(domWrap);

  // Q3 (the owner's QA notes, 2026-10-01): search sits behind an icon in the levers header.
  nav.append(tabList, domRow, searchControl(cleanups));

  // Q1: Color's sub-pages sit UNDER the tab row's divider, at the top of the levers panel, never above
  // the line. So they are their own row, after the tab row, rather than part of it.
  const subRow = hook(h('div', 'p3-subnav'), 'sub-nav');

  // ── notices, the legacy frame, the panes ────────────────────────────────────────────────────────
  // The notices and the legacy frame are legacy surfaces, pinned light (D2): `data-theme="light"` resets
  // the chrome variables and `color-scheme` beneath them, so their fields keep dark UA ink (#1031).
  const notices = hook(h('div', 'p3-notices'), 'notices');
  notices.dataset.theme = 'light';
  head.append(bar, nav, subRow, notices);

  const legacy = hook(h('main', 'p3-legacy'), 'legacy-frame');
  legacy.id = PANEL_ID;
  legacy.dataset.theme = 'light';
  const switchRow = h('div', 'p3-switchrow');
  const legacyPage = hook(h('div', 'p3-legacy-page'), 'legacy-page');
  legacyPage.id = LEGACY_PAGE_ID;
  legacy.append(switchRow, legacyPage);

  const panes = hook(h('div', 'p3-panes'), 'panes');
  const levers = hook(h('section', 'p3-levers'), 'levers-pane');
  levers.setAttribute('aria-label', 'Settings');
  const preview = hook(h('section', 'p3-preview'), 'preview-pane');
  preview.setAttribute('aria-label', 'Preview');
  // Q2: the preview's title row shares one header height with the tab row, so the two dividers meet at
  // one y across the split. S1.3 fills it with the title, the mode control and Inspect.
  const previewHead = hook(h('div', 'p3-preview-head'), 'preview-head');
  const previewBody = hook(h('div', 'p3-preview-body'), 'preview-body');
  preview.append(previewHead, previewBody);
  panes.append(levers, preview);

  root.append(head, legacy, panes);
  app.append(root);

  // ── selection ───────────────────────────────────────────────────────────────────────────────────
  let subFor: TabId | null = null;
  let subTabs: HTMLButtonElement[] = [];
  let switchFor: string | null = null;
  let switchTabs: HTMLButtonElement[] = [];

  /** Select a place. Shows its first legacy page unless it already shows the current one. */
  const go = (p: Place): void => {
    place = p;
    const pages = legacyOf(p, host);
    if (pages.length && !pages.includes(page)) setPage(pages[0]);   // `page` repaints the legacy frame
    else render();
  };

  const buildSubRow = (): void => {
    const tab = place ? TABS.find((t) => t.id === place!.tab) : undefined;
    const want = tab?.subs ? tab.id : null;
    if (want === subFor) return;
    subFor = want;
    subRow.replaceChildren();
    subTabs = [];
    if (!tab?.subs) return;
    const seg = hook(h('div', 'p3-seg p3-subseg'), `${tab.id}-sub-row`);
    seg.setAttribute('role', 'tablist');
    seg.setAttribute('aria-label', `${tab.label} pages`);
    subTabs = tab.subs.map((s) => {
      const b = tabButton('p3-seg-tab', `p3-sub-${s.id}`, `${tab.id}-sub-${s.id}`, s.label, PANEL_ID);
      b.onclick = () => go({ tab: tab.id, sub: s.id });
      return b;
    });
    seg.addEventListener('keydown', (e) => {
      const to = nextTab(subTabs, e.target as HTMLElement, e.key);
      if (!to) return;
      e.preventDefault();
      to.focus();
      go({ tab: tab.id, sub: tab.subs![subTabs.indexOf(to as HTMLButtonElement)].id });
    });
    seg.append(...subTabs);
    subRow.append(seg);
  };

  /** D8: a place with two legacy pages gets a local switch, labeled with their names, in the frame. */
  const buildSwitch = (pages: readonly PageKey[]): void => {
    const want = pages.length > 1 ? pages.join(' ') : null;
    if (want === switchFor) return;
    switchFor = want;
    switchRow.replaceChildren();
    switchTabs = [];
    if (!want) return;
    const seg = hook(h('div', 'p3-seg p3-switchseg'), 'legacy-switch');
    seg.setAttribute('role', 'tablist');
    seg.setAttribute('aria-label', `${TABS.find((t) => t.id === place?.tab)?.label ?? ''} pages`);
    switchTabs = pages.map((k) => {
      const b = tabButton('p3-seg-tab', `p3-switch-${kebab(k)}`, `legacy-switch-${kebab(k)}`, LEGACY_LABEL[k] ?? k, LEGACY_PAGE_ID);
      b.onclick = () => { if (page !== k) setPage(k); };
      return b;
    });
    seg.addEventListener('keydown', (e) => {
      const to = nextTab(switchTabs, e.target as HTMLElement, e.key);
      if (!to) return;
      e.preventDefault();
      to.focus();
      const k = pages[switchTabs.indexOf(to as HTMLButtonElement)];
      if (page !== k) setPage(k);
    });
    seg.append(...switchTabs);
    switchRow.append(seg);
  };

  const render = (): void => {
    const pages = place ? legacyOf(place, host) : [page];
    const isLegacy = pages.length > 0;
    root.dataset.layout = isLegacy ? 'legacy' : 'panes';
    root.dataset.pane = pane;
    for (const b of paneButtons) b.setAttribute('aria-pressed', String(b === paneButtons[pane === 'settings' ? 0 : 1]));

    select(tabs, place ? tabs[TABS.findIndex((t) => t.id === place!.tab)] : null);
    domSelect.value = place?.tab ?? '';
    buildSubRow();
    select(subTabs, place?.sub ? subTabs[TABS.find((t) => t.id === place!.tab)!.subs!.findIndex((s) => s.id === place!.sub)] : null);
    buildSwitch(isLegacy ? pages : []);
    select(switchTabs, switchTabs.find((b) => b.id === `p3-switch-${kebab(page)}`) ?? null);

    // The legacy frame is the panel the tabs control. With nothing selected (a page no tab shows, such as
    // the plugin's Style guide) it is a plain region.
    const labelledBy = place ? (place.sub ? `p3-sub-${place.sub}` : `p3-tab-${place.tab}`) : null;
    if (labelledBy) { legacy.setAttribute('role', 'tabpanel'); legacy.setAttribute('aria-labelledby', labelledBy); }
    else { legacy.removeAttribute('role'); legacy.removeAttribute('aria-labelledby'); }
    legacy.dataset.legacyPage = kebab(page);
    root.dataset.place = place ? placeId(place) : '';
  };

  // A page change from anywhere: a tab, the switch, the Pages menu, a brand load.
  cleanups.push(subscribe('page', () => { place = placeOfPage(page, host, place); render(); }));

  // ── width class and the sticky height ───────────────────────────────────────────────────────────
  const syncSticky = (): void => {
    const sticky = getComputedStyle(head).display === 'contents' ? bar : head;
    document.documentElement.style.setProperty('--chrome-h', `${sticky.offsetHeight}px`);
  };
  const ro = new ResizeObserver(() => {
    const w = root.getBoundingClientRect().width;
    const tier = w <= NARROW_MAX ? 'narrow' : 'wide';
    if (root.dataset.w !== tier) root.dataset.w = tier;
    syncSticky();
  });
  ro.observe(root);
  ro.observe(head);
  ro.observe(bar);
  cleanups.push(() => ro.disconnect());
  root.dataset.w = app.getBoundingClientRect().width <= NARROW_MAX ? 'narrow' : 'wide';

  render();

  return {
    head, bar: barSlot, notices, legacyPage, syncSticky,
    unmount: () => {
      for (const c of cleanups) c();
      root.remove();
      app.classList.remove('p3-app');
      document.documentElement.style.removeProperty('--chrome-h');
    },
  };
};

/** The studio's theme toggle: an icon button that opens a menu of three radio items (concept v6). */
const themeToggle = (cleanups: (() => void)[]): HTMLElement => {
  const wrap = h('div', 'p3-popwrap');
  const btn = hook(h('button', 'p3-btn p3-btn-ghost p3-btn-icon'), 'theme-toggle');
  btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-controls', 'p3-theme-menu');
  const menu = hook(h('div', 'p3-menu'), 'theme-menu');
  menu.id = 'p3-theme-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Theme');
  const GLYPH: Record<ThemePref, 'sun' | 'moon' | 'system'> = { light: 'sun', dark: 'moon', system: 'system' };
  const items = THEME_CHOICES.map((c) => {
    const it = hook(h('button', 'p3-menu-item'), `theme-option-${c.pref}`);
    it.type = 'button';
    it.setAttribute('role', 'menuitemradio');
    it.tabIndex = -1;
    const label = h('span', 'p3-menu-label', c.label);
    it.append(glyph(GLYPH[c.pref]), label);
    if (c.note) it.append(h('span', 'p3-menu-note', c.note));
    it.append(glyph('check'));
    it.onclick = () => { setThemePref(c.pref); close(true); paint(); };
    return it;
  });
  menu.append(...items);

  const paint = (): void => {
    const cur = THEME_CHOICES.find((c) => c.pref === themePref())!;
    btn.replaceChildren(glyph(GLYPH[cur.pref]));
    btn.setAttribute('aria-label', `Theme: ${cur.label}`);
    for (const [i, c] of THEME_CHOICES.entries()) items[i].setAttribute('aria-checked', String(c.pref === cur.pref));
  };
  const isOpen = (): boolean => menu.isConnected;
  const onDown = (e: MouseEvent): void => { if (!wrap.contains(e.target as Node)) close(false); };
  const open = (): void => {
    wrap.append(menu);
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('mousedown', onDown);
    (items.find((i) => i.getAttribute('aria-checked') === 'true') ?? items[0]).focus();
  };
  function close(refocus: boolean): void {
    if (!isOpen()) return;
    menu.remove();
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', onDown);
    if (refocus) btn.focus();
  }
  btn.onclick = () => (isOpen() ? close(true) : open());
  menu.addEventListener('keydown', (e) => {
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'Tab') close(false);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
    } else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); items[e.key === 'Home' ? 0 : items.length - 1].focus(); }
  });
  cleanups.push(() => document.removeEventListener('mousedown', onDown));
  btn.setAttribute('aria-expanded', 'false');
  paint();
  wrap.append(btn);
  return wrap;
};

/** Settings search (the owner's QA note Q3, for review: keep or remove). A magnifier in the levers header
 *  opens a field in place; Escape closes it, clears the query and returns focus to the magnifier.
 *
 *  THE FIELD IS BUILT ONCE AND NEVER REBUILT. Typing writes the query to the store (`setSearch`); the page
 *  in view filters itself to it and reports its count (`search:hits`), which only the status line beside
 *  the field reads. Nothing a keystroke causes touches the input element, so the caret and the typed order
 *  hold. (Concept v6's search typed backwards because it re-rendered the field on every keystroke.)
 *
 *  What it searches in S1.2: the settings of the page in view, by name, description and key. Search
 *  across every page, and results that say which page a setting lives on, arrive with the levers panel,
 *  page by page, from S2. */
const searchControl = (cleanups: (() => void)[]): HTMLElement => {
  const wrap = hook(h('div', 'p3-search'), 'search');
  const open = hook(h('button', 'p3-btn p3-btn-ghost p3-btn-icon p3-search-open'), 'search-open');
  open.type = 'button';
  open.setAttribute('aria-label', 'Search settings');
  open.setAttribute('aria-expanded', 'false');
  open.setAttribute('aria-controls', 'p3-search-box');
  open.append(glyph('search'));
  const box = h('div', 'p3-search-box');
  box.id = 'p3-search-box';
  const input = hook(h('input', 'p3-search-input'), 'search-input');
  input.type = 'search';
  input.placeholder = 'Search settings';
  input.setAttribute('aria-label', 'Search settings');
  input.setAttribute('aria-describedby', 'p3-search-status');
  input.autocomplete = 'off';
  input.spellcheck = false;
  const status = hook(h('span', 'p3-search-status'), 'search-status');
  status.id = 'p3-search-status';
  status.setAttribute('role', 'status');
  // Closing is Escape in the field, or this button for a pointer. Either clears the query.
  const closeBtn = hook(h('button', 'p3-btn p3-btn-ghost p3-btn-icon p3-search-close'), 'search-close');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close search');
  closeBtn.append(glyph('x'));
  box.append(glyph('search'), input, status, closeBtn);
  wrap.append(open, box);

  const show = (yes: boolean): void => {
    wrap.dataset.open = String(yes);
    open.setAttribute('aria-expanded', String(yes));
  };
  open.onclick = () => { show(true); input.focus(); };
  const close = (): void => {
    input.value = '';
    setSearch('');
    show(false);
    open.focus();
  };
  input.addEventListener('input', () => setSearch(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    close();
  });
  closeBtn.onclick = close;
  const paint = (): void => {
    const n = searchHits;
    status.textContent = !searchQuery.trim() || n === null ? ''
      : n === 0 ? 'No setting on this page matches' : n === 1 ? '1 setting matches' : `${n} settings match`;
  };
  cleanups.push(subscribe('search:hits', paint));
  // A query left from an earlier frame (the start screen and back) reopens with it, rather than filtering
  // a page behind a closed field.
  if (searchQuery) { input.value = searchQuery; show(true); } else show(false);
  paint();
  return wrap;
};
