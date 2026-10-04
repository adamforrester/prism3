/**
 * The frame (UI redesign S1.2, `docs/superpowers/ui-redesign/implementation-plan.md` §3.3–3.6 and §4):
 * the top bar, the tab row with Color's sub-row, the two panes, the legacy frame, and narrow mode.
 *
 * WHAT IT OWNS AND WHAT IT LENDS. The frame is mounted once per app view and outlives every legacy
 * render, so a tab keeps focus across the page change it causes. It lends slots to the legacy code in
 * `main.ts`, which fills them on every `build()`: the bar's legacy controls (brand switcher, Export, Pages
 * and the plugin's Apply Theme), the notices (the engine error) and the legacy page itself. Everything
 * else here is the shell's own.
 *
 * HOW IT TALKS TO THE REST OF THE APP: store setters out, store topics in (plan §3.10). A tab click calls
 * `setPage`; the legacy frame repaints because `main.ts` subscribes to `page`, and the tab row repaints
 * its selection because it subscribes too. Nothing here calls a legacy repaint tier, and
 * `test-shell-imports.ts` (a test, run by `npm test`) fails any file under `shell/` that names one.
 *
 * WHAT EACH PAGE SHOWS. A legacy page (`pages.ts`, `status: 'legacy'`) shows its legacy page in the
 * full-width legacy frame under the tab row, pinned light (D1, D2); Depth & motion carries a local switch
 * between its two legacy pages (D8). A moved page (`status: 'new'`: Color › Palettes from S2, Brand from S3, Surfaces & fills
 * from S4a, Interactive from S5.2, Type from S6.2) shows the two panes: its levers module draws the levers pane and its preview module the preview body (`NEW_PAGES`
 * below), each mounted once per visit and released, subscriptions included, when the place changes.
 *
 * S1.3 fills the preview header and adds Inspect (`preview.ts`): the title of the page's one home view
 * (V1), the mode control (Q1) and the Inspect menu, on one row (Q2). The preview body names its home in
 * `data-view`, which changes on a place change and nothing else. Inspect opens over the preview, or over
 * the legacy frame while the page is legacy (it is the page's preview until its slice moves it), and closes
 * back to it, scroll and focus included. A place change closes it. The verdict on the bar opens it on
 * Contrast. `main.ts` lends Inspect two legacy views as callbacks, `inspect.contrast` (the contract table)
 * and `inspect.tokens` (the token list, which takes Inspect's own `repaint`). Their bodies live in `main.ts`,
 * so `test-shell-imports.ts` cannot see what they call; that limit is stated in its header. The same holds
 * for S1.4's lends below, `activity` (the host session's writes) and `figma` (the write functions).
 *
 * S1.4 adds the Activity drawer (`activity.ts`) at the bottom of the frame, the Activity button and, in the
 * plugin, the Figma menu (`figma.ts`) and the Agent chip's slot (IA-3) on the top bar. The legacy bar places
 * those three where concept v6 draws them, as it places the verdict. Since S11 the drawer draws every write's
 * result itself, from the host session `main.ts` lends it, so it lends no slot. The plugin's own entry mounts the
 * Agent chip into its slot (`apps/plugin/src/agent-link-ui.ts`); the slot is never cleared.
 *
 * THE PRODUCT MARK (owner, 2026-10-04) starts the studio's top bar: the logo, then "Prism3 Studio", ahead of the
 * brand switcher. It names the product and goes nowhere, so it is not a control. Its logo is `main.ts`'s, lent
 * as `logo`: it is `styles.css`'s `.logo`, a fixed conic gradient, and this stylesheet may hold no raw color.
 * The plugin draws no mark: Figma's own title bar names the plugin, and its width is tight. Narrow keeps the
 * logo and drops the name, which the mark's accessible name still carries.
 *
 * NARROW MODE (Q7) is a width class, `data-w="narrow"`, set from the frame's own width, because the chrome
 * stylesheet may not hold a raw length and a media or container query needs one. Under it the tab row
 * becomes a select, only the top row stays sticky, and the bar's text buttons drop to their glyphs.
 */
import { page, searchHits, searchQuery, setPage, setSearch, subscribe } from '../state/store';
import { INSPECT, LEGACY_LABEL, TABS, homeOf, isNewPage, legacyOf, newPageOf, placeId, placeOfPage, placeOfTab, viewLabel, type Host, type InspectId, type LegacyPageKey, type NewPageKey, type Place, type TabId } from './pages';
import { glyph, h, hook } from './dom';
import { inspectMenu, modeControl, paintInspectView, stepKey, verdictButton, type InspectLegacy } from './preview';
import { mountActivity, type ActivityLend } from './activity';
import { figmaMenu, type FigmaSource } from './figma';
import { THEME_CHOICES, setThemePref, themePref, type ThemePref } from './theme';
import { mountPalettesLevers } from '../domains/color-palettes';
import { mountPalettesPreview } from '../preview/palettes';
import { mountBrandLevers } from '../domains/brand';
import { mountBrandPreview, type PageLends } from '../preview/brand';
import { mountFillsLevers } from '../domains/color-fills';
import { mountSurfacesPreview } from '../preview/surfaces';
import { mountInteractiveLevers } from '../domains/color-interactive';
import { mountInteractivePreview } from '../preview/interactive';
import { mountTypeLevers } from '../domains/type';
import { mountTypePreview } from '../preview/type';
import { cancelEasedScroll, dropEdits, revealSection, takeSectionEdit, trackLeverSections } from '../preview/follow-edit';

/** The moved pages (S2 on): what each draws in the levers pane and in the preview body. A slice that moves
 *  a page adds its row; `NewPageKey` comes from the page data, so a page set to `new` with no row here is a
 *  compile error. Each mount subscribes to the store and hands back its cleanups. */
const NEW_PAGES: Record<NewPageKey, {
  /** `lend`: as the preview's (S6.2: Type's levers read the host's font list through it; S6.3 retired the
   *  legacy "Scale and weights" region it also lent). */
  readonly levers: (host: HTMLElement, cleanups: (() => void)[], lend: PageLends) => void;
  /** `lend`: the legacy renderers `main.ts` lends a preview until its slice replaces them (S3: Brand's
   *  Style guide), as Inspect is lent its two legacy views. */
  readonly preview: (host: HTMLElement, cleanups: (() => void)[], lend: PageLends) => void;
}> = {
  brand: { levers: mountBrandLevers, preview: mountBrandPreview },
  palettes: { levers: mountPalettesLevers, preview: mountPalettesPreview },
  fills: { levers: mountFillsLevers, preview: mountSurfacesPreview },
  interactive: { levers: mountInteractiveLevers, preview: mountInteractivePreview },
  type: { levers: mountTypeLevers, preview: mountTypePreview },
};

/** The product's name, as the studio's top bar shows it (owner, 2026-10-04). */
const PRODUCT_NAME = 'Prism3 Studio';

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
  /** The verdict (S1.3). The shell owns it and keeps it current; `renderBar` places it after the brand
   *  switcher on every render, the same node each time. */
  readonly verdict: HTMLElement;
  /** The Activity button (S1.4), placed by `renderBar` before Export, the same node each time. */
  readonly activity: HTMLElement;
  /** The Figma menu (S1.4, plugin only), placed by `renderBar` after the Pages menu. */
  readonly figma: HTMLElement | null;
  /** The Agent chip's stable, empty slot (IA-3, plugin only), placed by `renderBar` after the spacer. The
   *  plugin's entry mounts the chip into it; nothing here or in `renderBar` ever clears it. */
  readonly agent: HTMLElement | null;
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

export const mountFrame = (app: HTMLElement, opts: {
  readonly host: Host;
  readonly inspect: InspectLegacy;
  /** The host session's writes, as the Activity drawer reads them, and how it answers a request to show one (S1.4, S11). */
  readonly activity: ActivityLend;
  /** The Figma menu's writes (S1.4), or null where there is no Figma file (the studio). */
  readonly figma: FigmaSource | null;
  /** The legacy renderers lent to the moved pages (S3: the Style guide, to Brand's preview), and the host's font
   *  list (S6.2, Type). */
  readonly lend: PageLends;
  /** The product logo (`styles.css`'s `.logo`), for the studio's product mark. The plugin draws no mark. */
  readonly logo: () => HTMLElement;
}): Frame => {
  const { host } = opts;
  const cleanups: (() => void)[] = [];
  let place: Place | null = placeOfPage(page, host, null);

  app.classList.add('p3-app');
  const root = hook(h('div', 'p3-frame'), 'frame');
  const head = hook(h('header', 'p3-head'), 'frame-head');

  // ── the top bar ────────────────────────────────────────────────────────────────────────────────
  const bar = hook(h('div', 'p3-bar'), 'top-bar');
  const barSlot = h('div', 'p3-bar-slot');
  // The product mark, studio only, first in the bar (owner, 2026-10-04). An image with a name, not a control.
  if (host === 'web') {
    const mark = hook(h('div', 'p3-mark'), 'product-mark');
    mark.setAttribute('role', 'img');
    mark.setAttribute('aria-label', PRODUCT_NAME);
    const logo = opts.logo();
    logo.setAttribute('aria-hidden', 'true');
    mark.append(logo, h('span', 'p3-mark-name', PRODUCT_NAME));
    bar.append(mark);
  }
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
  levers.id = 'p3-levers';
  const preview = hook(h('section', 'p3-preview'), 'preview-pane');
  preview.setAttribute('aria-label', 'Preview');
  // Q2: the preview's title row shares one header height with the tab row, so the two dividers meet at
  // one y across the split. So the title, the mode control and Inspect sit on ONE row (S1.3): concept v6
  // put the modes on a second row, which is what offset the two dividers.
  const previewHead = hook(h('div', 'p3-preview-head'), 'preview-head');
  const previewTitle = hook(h('h2', 'p3-preview-title'), 'preview-title');
  previewTitle.id = 'p3-preview-title';
  previewHead.append(previewTitle, modeControl(cleanups), inspectMenu((v, opener) => openInspect(v, opener), cleanups));
  // V1: the body shows the page's one home view, named by `data-view`. It changes on a tab or sub-page
  // change and on nothing else. Each domain slice draws its view here (S2 first).
  const previewBody = hook(h('div', 'p3-preview-body'), 'preview-body');
  previewBody.setAttribute('role', 'region');
  previewBody.setAttribute('aria-labelledby', 'p3-preview-title');
  preview.append(previewHead, previewBody);
  panes.append(levers, preview);

  // ── Inspect (F1): over the preview, or over the legacy frame while the page is legacy ──────────────
  // The legacy frame is the page's preview until its slice moves it, so Inspect covers it the same way
  // and closes back to it, with its scroll position.
  const inspect = hook(h('section', 'p3-inspect'), 'inspect');
  inspect.setAttribute('aria-label', 'Inspect');
  const inspectHead = hook(h('div', 'p3-inspect-head'), 'inspect-head');
  const inspectTabs = h('div', 'p3-tabs p3-inspect-tabs');
  inspectTabs.setAttribute('role', 'tablist');
  inspectTabs.setAttribute('aria-label', 'Inspect');
  const inspectTabEls = INSPECT.map(([v, label]) => {
    const b = tabButton('p3-tab', `p3-inspect-tab-${v}`, `inspect-tab-${v}`, label, 'p3-inspect-body');
    b.onclick = () => openInspect(v, null);
    return b;
  });
  inspectTabs.append(...inspectTabEls);
  inspectTabs.addEventListener('keydown', (e) => {
    const to = stepKey(inspectTabEls, e.target as HTMLElement, e.key);
    if (!to) return;
    e.preventDefault();
    to.focus();
    openInspect(INSPECT[inspectTabEls.indexOf(to as HTMLButtonElement)][0], null);
  });
  const backBtn = hook(h('button', 'p3-btn p3-btn-page p3-inspect-close'), 'inspect-close');
  backBtn.type = 'button';
  const backLabel = h('span', 'p3-btn-label');
  backBtn.append(glyph('chevl'), backLabel);
  backBtn.onclick = () => closeInspect();
  inspectHead.append(inspectTabs, h('span', 'p3-spacer'), backBtn);
  const inspectBody = hook(h('div', 'p3-inspect-body'), 'inspect-body');
  inspectBody.id = 'p3-inspect-body';
  inspectBody.setAttribute('role', 'tabpanel');
  inspect.append(inspectHead, inspectBody);
  inspect.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); closeInspect(); }
  });

  // ── Activity (F2), the Figma menu and the Agent chip's slot (S1.4) ───────────────────────────────
  // The drawer sits last in the frame, pinned to the bottom edge, under whichever region shows the page.
  const activity = mountActivity({ host, lend: opts.activity, narrow: () => root.dataset.w === 'narrow' }, cleanups);
  const figma = host === 'figma' && opts.figma ? figmaMenu(opts.figma, cleanups) : null;
  const agent = host === 'figma' ? hook(h('div', 'p3-agent-slot'), 'bar-agent') : null;

  // The Activity status line rides in the top bar, which is always drawn, on the bar's own ground.
  bar.append(activity.live);
  root.append(head, legacy, panes, inspect, activity.drawer);
  app.append(root);

  // The verdict, on the bar (lent to `renderBar`, which places it after the brand switcher).
  const verdict = verdictButton((opener) => openInspect('contrast', opener), cleanups);

  // ── Inspect state ───────────────────────────────────────────────────────────────────────────────
  let inspecting: InspectId | null = null;
  let opener: HTMLElement | null = null;
  let scrollBack = 0;
  let previewBack = 0;
  let painting = false;
  const paintInspect = (): void => {
    if (!inspecting || painting) return;
    painting = true;   // a legacy view can rebuild the theme as it draws, which notifies `brand` again
    try {
      const keep = inspectBody.scrollTop;
      paintInspectView(inspecting, inspectBody, opts.inspect, paintInspect);
      inspectBody.scrollTop = keep;
    } finally { painting = false; }
  };
  cleanups.push(subscribe('brand', paintInspect));

  /** Open Inspect on view `v`. `from` is the control that opened it, which gets focus back on close; a
   *  switch between Inspect's own tabs keeps the first opener. */
  function openInspect(v: InspectId, from: HTMLElement | null): void {
    if (!inspecting) {
      opener = from;
      scrollBack = window.scrollY;
      previewBack = previewBody.scrollTop;   // a moved page scrolls in its preview body, which Inspect hides
    }
    const first = inspecting !== v;
    inspecting = v;
    pane = 'preview';   // at narrow widths the preview pane is the one Inspect covers
    render();
    if (first) paintInspect();
    inspectTabEls[INSPECT.findIndex(([id]) => id === v)].focus();
  }
  /** Close Inspect, back to the page's preview (or its legacy page), where it was. */
  function closeInspect(refocus = true): void {
    if (!inspecting) return;
    inspecting = null;
    inspectBody.replaceChildren();
    render();
    window.scrollTo(0, scrollBack);
    previewBody.scrollTop = previewBack;
    const back = opener && opener.isConnected && opener.getClientRects().length ? opener : null;
    opener = null;
    if (refocus) (back ?? (root.dataset.layout === 'panes' ? previewTitle : legacy)).focus?.();
  }
  previewTitle.tabIndex = -1;
  legacy.tabIndex = -1;

  // ── selection ───────────────────────────────────────────────────────────────────────────────────
  let subFor: TabId | null = null;
  let subTabs: HTMLButtonElement[] = [];
  let switchFor: string | null = null;
  let switchTabs: HTMLButtonElement[] = [];

  /** Select a place. A moved page is the store's page itself; a legacy place shows its first legacy page
   *  unless it already shows the current one. */
  const go = (p: Place): void => {
    // V1: a page change shows the new page's home, so Inspect closes with it (as in concept v6).
    if (inspecting && (p.tab !== place?.tab || p.sub !== place?.sub)) closeInspect(false);
    place = p;
    const moved = newPageOf(p);
    if (moved) { if (page !== moved) setPage(moved); else render(); return; }
    const pages = legacyOf(p, host);
    if (pages.length && !(pages as readonly string[]).includes(page)) setPage(pages[0]);   // `page` repaints the legacy frame
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
  const buildSwitch = (pages: readonly LegacyPageKey[]): void => {
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

  // ── the moved page in the two panes (S2 on) ─────────────────────────────────────────────────────
  let mounted: NewPageKey | null = null;
  let paneCleanups: (() => void)[] = [];
  /** QA-I11: each page's two scroll positions, for this session, keyed by page. Saved as a page is released
   *  and put back, without animating, as it is mounted again. A pane not drawn when its page is released (the
   *  hidden one at narrow widths reads 0) keeps what it had. Nothing persists it: a reload starts afresh. */
  const scrollMemo = new Map<NewPageKey, { levers: number; preview: number }>();
  const drawn = (n: HTMLElement): boolean => n.getClientRects().length > 0;
  const unmountPanes = (): void => {
    if (mounted) {
      const was = scrollMemo.get(mounted);
      // While Inspect covers the preview (or did until this render), its position is the one Inspect saved.
      const covered = !!inspecting || !!root.dataset.inspect;
      scrollMemo.set(mounted, {
        levers: drawn(levers) ? levers.scrollTop : was?.levers ?? 0,
        preview: covered ? previewBack : drawn(previewBody) ? previewBody.scrollTop : was?.preview ?? 0,
      });
    }
    // A glide in flight belongs to the page being released, and so does any edit note.
    cancelEasedScroll(levers);
    cancelEasedScroll(previewBody);
    dropEdits();
    for (const c of paneCleanups) c();
    paneCleanups = [];
    levers.replaceChildren();
    previewBody.replaceChildren();
    mounted = null;
  };
  cleanups.push(unmountPanes);
  // QA-B9: record which lever section each interaction is in. Records only; an edit handler turns a record
  // into a note, and nothing else moves the preview (V1).
  cleanups.push(trackLeverSections(levers));

  let lastLayout: string | null = null;
  const render = (): void => {
    const pages = place ? legacyOf(place, host) : isNewPage(page) ? [] : [page];
    const isLegacy = pages.length > 0;
    // Written only when the layout a place calls for changes, never on every render.
    const layout = isLegacy ? 'legacy' : 'panes';
    if (layout !== lastLayout) { root.dataset.layout = layout; lastLayout = layout; }
    root.dataset.pane = pane;
    for (const b of paneButtons) b.setAttribute('aria-pressed', String(b === paneButtons[pane === 'settings' ? 0 : 1]));

    select(tabs, place ? tabs[TABS.findIndex((t) => t.id === place!.tab)] : null);
    domSelect.value = place?.tab ?? '';
    buildSubRow();
    select(subTabs, place?.sub ? subTabs[TABS.find((t) => t.id === place!.tab)!.subs!.findIndex((s) => s.id === place!.sub)] : null);
    buildSwitch(isLegacy ? pages : []);
    // The moved page's levers and preview are mounted once per visit, and released when the place changes.
    const moved = place ? newPageOf(place) : null;
    if (moved !== mounted) {
      unmountPanes();
      if (moved) {
        const row = NEW_PAGES[moved];
        row.levers(levers, paneCleanups, opts.lend);
        row.preview(previewBody, paneCleanups, opts.lend);
        // QA-B9: an edit the levers noted (`noteSectionEdit`, called by Surfaces & fills' and Interactive's edit
        // handlers) reveals the preview section its lever section pairs with. A page whose levers never note one
        // (Palettes reveals its palette itself; Brand has no pairs) is never moved by this. Subscribed after the
        // preview, so the reveal measures the preview this edit repainted.
        paneCleanups.push(subscribe('brand', () => { const s = takeSectionEdit(); if (s) revealSection(previewBody, s); }));
        // QA-I11: back where this page was, at once (a restore is not an edit, and does not glide).
        const at = scrollMemo.get(moved);
        levers.scrollTo({ top: at?.levers ?? 0, behavior: 'instant' });
        previewBody.scrollTo({ top: at?.preview ?? 0, behavior: 'instant' });
      }
      mounted = moved;
    }
    select(switchTabs, switchTabs.find((b) => b.id === `p3-switch-${kebab(page)}`) ?? null);

    // The legacy frame is the panel the tabs control. With nothing selected (a page no tab shows, such as
    // the plugin's Style guide) it is a plain region.
    // On a moved page the levers pane is that panel instead, and the tabs point at it.
    const labelledBy = place ? (place.sub ? `p3-sub-${place.sub}` : `p3-tab-${place.tab}`) : null;
    const panel = isLegacy ? legacy : levers;
    const other = isLegacy ? levers : legacy;
    other.removeAttribute('role'); other.removeAttribute('aria-labelledby');
    if (!isLegacy) levers.setAttribute('aria-label', 'Settings'); else levers.removeAttribute('aria-label');
    if (labelledBy) { panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', labelledBy); }
    else { panel.removeAttribute('role'); panel.removeAttribute('aria-labelledby'); }
    for (const t of [...tabs, ...subTabs]) t.setAttribute('aria-controls', panel.id);
    if (isLegacy) legacy.dataset.legacyPage = kebab(page); else delete legacy.dataset.legacyPage;
    root.dataset.place = place ? placeId(place) : '';

    // V1: the preview names the page's one home view. Nothing but a place change moves it.
    const home = place ? homeOf(place) : null;
    previewTitle.textContent = home ? viewLabel(home) : '';
    if (home) previewBody.dataset.view = home; else delete previewBody.dataset.view;

    root.dataset.inspect = inspecting ?? '';
    if (inspecting) {
      select(inspectTabEls, inspectTabEls[INSPECT.findIndex(([id]) => id === inspecting)]);
      inspectBody.setAttribute('aria-labelledby', `p3-inspect-tab-${inspecting}`);
      backLabel.textContent = `Back to ${home ? viewLabel(home) : 'the page'}`;
      backBtn.setAttribute('aria-label', backLabel.textContent);   // the name holds when narrow hides the words
    }
  };

  // A page change from anywhere: a tab, the switch, the Pages menu, a brand load.
  cleanups.push(subscribe('page', () => {
    const was = place;
    place = placeOfPage(page, host, place);
    if (inspecting && (place?.tab !== was?.tab || place?.sub !== was?.sub)) closeInspect(false);
    render();
  }));

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
    head, bar: barSlot, notices, legacyPage, verdict, syncSticky,
    activity: activity.button, figma, agent,
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
