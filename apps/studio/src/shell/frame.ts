/**
 * The frame (UI redesign S1.2, `docs/superpowers/ui-redesign/implementation-plan.md` §3.3–3.6 and §4):
 * the top bar, the tab row with Color's sub-row, the two panes, the menu page, and narrow mode.
 *
 * WHAT IT OWNS AND WHAT IT LENDS. The frame is mounted once per app view and outlives every render, so a tab keeps
 * focus across the page change it causes. It lends one slot to `main.ts`, which fills it on every `build()`: the
 * notices row (the error strip, which the shell draws, `notices.ts`, mounted where `main.ts` declares the `error`
 * surface). Since S13.1 the top bar's controls are the shell's (`bar.ts`): the brand switcher and its menu, Export and
 * its dialog, and the plugin's Apply Theme and prune review, drawn over the state `main.ts` lends. The legacy frame
 * and the plugin's Pages menu, the last legacy nodes, went in H12 (#2289). Everything else here is the shell's own.
 *
 * HOW IT TALKS TO THE REST OF THE APP: store setters out, store topics in (plan §3.10). A tab click calls
 * `setPage`, and the tab row repaints its selection because it subscribes to `page`. Nothing here calls a legacy
 * repaint tier, and `test-shell-imports.ts` (a test, run by `npm test`) fails any file under `shell/` that names one.
 *
 * WHAT EACH PAGE SHOWS. Every tab's page (`pages.ts`; Color › Palettes from S2, Brand from S3, Surfaces & fills
 * from S4a, Interactive from S5.2, Type from S6.2, Shape from S7, Depth & motion from S9.2, Layout from S10, Components
 * from S8.2) shows the two panes: its levers module draws the levers pane and its preview module the preview body (`NEW_PAGES`
 * below), each mounted once per visit and released, subscriptions included, when the place changes. A page a menu
 * opens (the Figma menu's Build style guides, S11.2) shows full width, in the `page` layout.
 *
 * S1.3 fills the preview header and adds Inspect (`preview.ts`): the title of the page's one home view
 * (V1), the mode control (Q1) and the Inspect menu, on one row (Q2). The preview body names its home in
 * `data-view`, which changes on a place change and nothing else. Inspect opens over the preview and closes
 * back to it, scroll and focus included. A place change closes it. The verdict on the bar opens it on
 * Contrast. `main.ts` lends Inspect two legacy views as callbacks, `inspect.contrast` (the contract table)
 * and `inspect.tokens` (the token list, which takes Inspect's own `repaint`). Their bodies live in `main.ts`,
 * so `test-shell-imports.ts` cannot see what they call; that limit is stated in its header. The same holds
 * for S1.4's lends below, `activity` (the host session's writes) and `figma` (the write functions).
 *
 * S1.4 adds the Activity drawer (`activity.ts`) at the bottom of the frame, the Activity button and, in the
 * plugin, the Figma menu (`figma.ts`) and the Agent tile's slot (IA-3; T7) on the top bar. The bar (`bar.ts`) places
 * those three where concept v6 draws them, as it places the verdict. Since S11 the drawer draws every write's
 * result itself, from the host session `main.ts` lends it, so it lends no slot. The plugin's own entry mounts the
 * Agent tile into its slot (`apps/plugin/src/agent-link-ui.ts`); the slot is never cleared.
 *
 * THE PRODUCT MARK (owner, 2026-10-04; on the plugin too since the owner's top-bar decision of 2026-10-05) starts
 * the top bar: the logo, then "Prism3 Studio", ahead of the brand switcher. It names the product and goes nowhere,
 * so it is not a control. Its logo is `main.ts`'s, lent as `logo`: it is `styles.css`'s `.logo`, a fixed conic
 * gradient, and this stylesheet may hold no raw color. The bar places it, first among its controls, so a second row
 * starts at the bar's own edge. Narrow keeps the logo and drops the name, which the mark's accessible name still
 * carries.
 *
 * NARROW MODE (Q7) is a width class, `data-w="narrow"`, set from the frame's own width, because the chrome
 * stylesheet may not hold a raw length and a media or container query needs one. Under it the tab row
 * becomes a select, only the top row stays sticky, and the bar's text buttons drop to their glyphs.
 *
 * THE BAR'S FIT (#2214, the owner's BL1 A+B, BL2 A, BL3 A). Above the narrow tier, when the full bar would not fit on
 * one row, the tile labels, then the product name, then the plugin's file row, then the brand name (cut short, Q83 A)
 * give way, each by a measured check that sets `data-bar-fit`, reusing the narrow tier's rules where it has them. At the
 * narrow tier (#2262, the owner's A), whose rows are its own, only the last step applies: the brand name is cut. See
 * `fitBar`.
 */
import { currentMode, page, rp, searchHits, searchQuery, setCurrentMode, setPage, setSearch, subscribe } from '../state/store';
import { isDerived } from '../state/verdict';
import { INSPECT, TABS, homeOf, isMenuPage, newPageOf, placeId, placeOfPage, placeOfTab, viewLabel, type Host, type InspectId, type NewPageKey, type Place, type TabId } from './pages';
import { glyph, h, hook, tile } from './dom';
import { inspectMenu, modeControl, modeLabel, paintInspectView, stepKey, verdictButton, type InspectLegacy } from './preview';
import { mountActivity, type ActivityLend } from './activity';
import { figmaMenu, type FigmaAction, type FigmaSource } from './figma';
import { mountBar, type BarLend } from './bar';
import { mountStyleGuides, type StyleGuidesLend } from './style-guides';
import { THEME_CHOICES, onThemeChange, setThemePref, themeChoice } from './theme';
import { mountPalettesLevers } from '../domains/color-palettes';
import { PALETTES_LIGHT_NOTE_ID, mountPalettesPreview } from '../preview/palettes';
import { mountBrandLevers } from '../domains/brand';
import { mountBrandPreview, type PageLends } from '../preview/brand';
import { mountFillsLevers } from '../domains/color-fills';
import { mountSurfacesPreview } from '../preview/surfaces';
import { mountInteractiveLevers } from '../domains/color-interactive';
import { mountInteractivePreview } from '../preview/interactive';
import { mountTypeLevers } from '../domains/type';
import { mountTypePreview } from '../preview/type';
import { mountDepthLevers } from '../domains/depth';
import { mountDepthPreview } from '../preview/depth';
import { mountShapeLevers } from '../domains/shape';
import { mountShapePreview } from '../preview/shape';
import { mountLayoutLevers } from '../domains/layout';
import { mountLayoutPreview } from '../preview/layout';
import { mountComponentsLevers } from '../domains/components';
import { mountComponentsPreview } from '../preview/components';
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
  /** N-3 A (#1984): the page edits the previewed mode, so while the preview shows a derived mode its whole levers
   *  panel is read-only (`syncDerivedReadOnly` below). Brand and Palettes are brand-wide and stay editable. */
  readonly derivedReadOnly?: true;
  /** PM1 B (owner, 2026-10-08; #2321): the page always shows Light, and the mode control is held disabled while it is
   *  up, described by the page's line at `id` (`syncModePin` below). */
  readonly pinsLight?: { readonly why: string };
}> = {
  brand: { levers: mountBrandLevers, preview: mountBrandPreview },
  palettes: { levers: mountPalettesLevers, preview: mountPalettesPreview, pinsLight: { why: PALETTES_LIGHT_NOTE_ID } },
  fills: { levers: mountFillsLevers, preview: mountSurfacesPreview, derivedReadOnly: true },
  interactive: { levers: mountInteractiveLevers, preview: mountInteractivePreview, derivedReadOnly: true },
  type: { levers: mountTypeLevers, preview: mountTypePreview, derivedReadOnly: true },
  depth: { levers: mountDepthLevers, preview: mountDepthPreview, derivedReadOnly: true },
  shape: { levers: mountShapeLevers, preview: mountShapePreview, derivedReadOnly: true },
  layout: { levers: mountLayoutLevers, preview: mountLayoutPreview, derivedReadOnly: true },
  components: { levers: mountComponentsLevers, preview: mountComponentsPreview, derivedReadOnly: true },
};

/** The levers panel's one line while the preview shows a derived mode (N-3 A, #1984). APPROVED (owner, RO1 A,
 *  2026-10-07). `m` is the mode's name as the mode control shows it (`modeLabel`). */
export const DERIVED_READONLY_NOTE = (m: string): string => `${m} is auto-derived and can't be edited here. Switch the preview to Light or Dark to edit.`;

/** RX1 A (owner, 2026-10-07): what stays usable in a derived mode's read-only levers panel, because it edits nothing:
 *  the ⓘ help buttons, the Show advanced folds (each names its body `p3-advb-…`), the Jump to links, the "way to" links
 *  between pages, and Continue. Everything else in the panel that a keyboard or a pointer can operate is a setting. */
const STAYS_LIVE = ['.p3-info', '[aria-controls^="p3-advb-"]', '.p3-jump-link', '.p3-deplink', '.p3-next'].join(', ');
/** Everything a keyboard or a pointer can operate (#1991's reach: native controls, ARIA widgets, editable regions and
 *  anything in the tab order). */
const OPERABLE = ['button', 'select', 'textarea', 'input:not([type="hidden"])', 'a[href]', '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])', ...['button', 'switch', 'checkbox', 'radio', 'slider', 'spinbutton', 'tab', 'menuitem', 'menuitemradio',
    'menuitemcheckbox', 'option', 'combobox', 'textbox'].map((r) => `[role="${r}"]`)].join(', ');

/** The product's name, as the studio's top bar shows it (owner, 2026-10-04). */
const PRODUCT_NAME = 'Prism3 Studio';

/** The frame width at or below which it lays out as one narrow column (concept v6's `appNarrow`). */
export const NARROW_MAX = 560;

export type Frame = {
  /** The sticky region: the bar, the notices and the tab row. */
  readonly head: HTMLElement;
  /** The bar's slot, which holds `barMain`. */
  readonly bar: HTMLElement;
  /** The bar's controls (`bar.ts`), the `brand-bar` chrome surface `main.ts` declares. */
  readonly barMain: HTMLElement;
  /** The shell's own bar nodes, which the bar places (S1.3, S1.4): the verdict (Contrast), the Activity button and the
   *  Figma menu (plugin only). Kept on the frame beside `barMain`, as main has them. */
  readonly verdict: HTMLElement;
  readonly activity: HTMLElement;
  readonly figma: HTMLElement | null;
  /** Slot: the notices row, under the top bar: the error strip (`notices.ts`). */
  readonly notices: HTMLElement;
  /** The Agent tile's stable, empty slot (IA-3, plugin only), placed by the bar between Theme and Activity (T7). The
   *  plugin's entry mounts the tile into it; nothing here or in the bar ever clears it. */
  readonly agent: HTMLElement | null;
  /** Publish the sticky region's height as `--chrome-h`. */
  readonly syncSticky: () => void;
  /** The layer a window opens in, over everything the frame draws (S12: the start window and its guard). Empty, and
   *  drawn as nothing, while no window is open. */
  readonly layer: HTMLElement;
  /** Remove the frame and drop its subscriptions and listeners. */
  readonly unmount: () => void;
};

/** The levers pane, the panel the tabs control. */
const PANEL_ID = 'p3-levers';

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
  /** The bar's Apply Theme (#2178: no longer a Figma menu item), or null where there is no Figma file. */
  readonly applyTheme: (() => FigmaAction) | null;
  /** The legacy renderers lent to the moved pages (S3: the Style guide, to Brand's preview), and the host's font
   *  list (S6.2, Type). */
  readonly lend: PageLends;
  /** The product logo (`styles.css`'s `.logo`), for the product mark, on both hosts. */
  readonly logo: () => HTMLElement;
  /** The top bar's controls' state and actions (S13.1, `bar.ts`). */
  readonly bar: BarLend;
  /** The Build style guides page's reads and writes (S11.2), or null where there is no Figma file. */
  readonly styleGuides: StyleGuidesLend | null;
}): Frame => {
  const { host } = opts;
  const cleanups: (() => void)[] = [];
  let place: Place | null = placeOfPage(page);

  app.classList.add('p3-app');
  const root = hook(h('div', 'p3-frame'), 'frame');
  const head = hook(h('header', 'p3-head'), 'frame-head');

  // ── the top bar ────────────────────────────────────────────────────────────────────────────────
  const bar = hook(h('div', 'p3-bar'), 'top-bar');
  const barSlot = h('div', 'p3-bar-slot');
  // The product mark, first in the bar on both hosts (owner, 2026-10-04 and 2026-10-05). An image with a name, not a
  // control. The bar places it.
  const mark = hook(h('div', 'p3-mark'), 'product-mark');
  mark.setAttribute('role', 'img');
  mark.setAttribute('aria-label', PRODUCT_NAME);
  const logo = opts.logo();
  logo.setAttribute('aria-hidden', 'true');
  mark.append(logo, h('span', 'p3-mark-name', PRODUCT_NAME));
  bar.append(barSlot);

  // The narrow Settings / Preview toggle (Q7). It switches the two panes.
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

  // The theme menu (F3; on the plugin too since the owner's top-bar decision of 2026-10-05, with Match Figma first).
  // The bar places it, before Activity and Export.
  const theme = themeToggle(cleanups);

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

  // ── notices, the panes ──────────────────────────────────────────────────────────────────────────
  // The notices row sits under the top bar, full width (S13.1): the error strip, in the chrome's theme.
  const notices = hook(h('div', 'p3-notices'), 'notices');
  head.append(bar, notices, nav, subRow);

  const panes = hook(h('div', 'p3-panes'), 'panes');
  const levers = hook(h('section', 'p3-levers'), 'levers-pane');
  levers.id = PANEL_ID;
  // N-3 A (owner, 2026-10-05; #1984) and RX1 A, RX2 A (owner, 2026-10-07): ONE read-only state for the levers panel
  // while the preview shows a derived mode (HC light, HC dark, wireframe), in place of each page disabling its own
  // controls. The page's levers are mounted inside `leversRegion` (`display: contents`, so it adds no box). In a derived
  // mode `holdSettings` disables every setting in it, the pages' own redraws included (a MutationObserver re-applies it),
  // and leaves help and navigation usable (`STAYS_LIVE`, RX1 A). A native control gets its own `disabled`, so it keeps
  // Prism3's disabled skin (F1 A, X4 A), leaves the tab order and reads disabled to assistive technology; any other
  // widget gets `aria-disabled` and leaves the tab order. One source of truth: a new lever is held without doing
  // anything, and only what this frame held is released. The line that says why, `leversNote`, sits OUTSIDE the region,
  // first in the pane, in the studio's boxed note (Build style guides' `.p3-sg-note.p3-sg-warn`, its own warning glyph;
  // RX2 A, RX3 A), and takes focus; in an editable mode it is not in the document. The writes keep their own guards (#2096).
  const leversRegion = hook(h('div', 'p3-levers-region'), 'levers-region');
  const leversNote = hook(h('p', 'p3-sg-note p3-sg-warn p3-levers-note'), 'levers-derived-note');
  const leversNoteText = h('span', 'p3-sg-warn-text');
  leversNote.append(glyph('warn'), leversNoteText);
  leversNote.tabIndex = -1;
  let holding = false;
  /** Hold every setting in the region that is not already off: a native control by its `disabled`, any other widget by
   *  `aria-disabled` and out of the tab order. Marked `data-held`, so a release frees only what this held. */
  const holdSettings = (): void => {
    for (const n of leversRegion.querySelectorAll<HTMLElement>(OPERABLE)) {
      if (n.closest(STAYS_LIVE)) continue;
      const native = n instanceof HTMLButtonElement || n instanceof HTMLInputElement || n instanceof HTMLSelectElement || n instanceof HTMLTextAreaElement;
      const held = n.getAttribute('data-held');
      // Held already: skipped only while it is still held. A page that toggles a control in place (Depth's tint hue on
      // a brand change, #2284 review) lifts the hold, and it is put back here, its first recorded state kept.
      if (held !== null) {
        if (held === 'native' ? (n as HTMLButtonElement).disabled : n.getAttribute('aria-disabled') === 'true' && n.tabIndex === -1) continue;
        if (held === 'native') (n as HTMLButtonElement).disabled = true;
        else { n.setAttribute('aria-disabled', 'true'); n.tabIndex = -1; }
        continue;
      }
      if (native) {
        if (n.disabled) continue;
        n.disabled = true;
        n.setAttribute('data-held', 'native');
      } else {
        n.setAttribute('data-held', n.getAttribute('tabindex') ?? '');
        n.setAttribute('aria-disabled', 'true');
        n.tabIndex = -1;
      }
    }
  };
  const releaseSettings = (): void => {
    for (const n of leversRegion.querySelectorAll<HTMLElement>('[data-held]')) {
      const was = n.getAttribute('data-held')!;
      n.removeAttribute('data-held');
      if (was === 'native') { (n as HTMLButtonElement).disabled = false; continue; }
      n.removeAttribute('aria-disabled');
      if (was === '') n.removeAttribute('tabindex'); else n.setAttribute('tabindex', was);
    }
  };
  // A page redraws its levers whole on most edits and on its own subscriptions, and toggles some controls in place; what
  // it draws or re-enables while held is held again. The hold sets the same attributes it watches, so the records it
  // makes itself are taken and dropped, never fed back (and a second pass would change nothing: it is idempotent).
  const leversHold = new MutationObserver(() => {
    if (!holding) return;
    holdSettings();
    leversHold.takeRecords();
  });
  /** What the hold watches: nodes drawn, and the three attributes a page can lift a hold with. */
  const HOLD_WATCH: MutationObserverInit = { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'tabindex'] };
  cleanups.push(() => leversHold.disconnect());
  const preview = hook(h('section', 'p3-preview'), 'preview-pane');
  preview.setAttribute('aria-label', 'Preview');
  // Q2: the preview's title row shares one header height with the tab row, so the two dividers meet at
  // one y across the split. So the title, the mode control and Inspect sit on ONE row (S1.3): concept v6
  // put the modes on a second row, which is what offset the two dividers.
  const previewHead = hook(h('div', 'p3-preview-head'), 'preview-head');
  const previewTitle = hook(h('h2', 'p3-preview-title'), 'preview-title');
  previewTitle.id = 'p3-preview-title';
  const modes = modeControl(cleanups);
  previewHead.append(previewTitle, modes.el, inspectMenu((v, opener) => openInspect(v, opener), cleanups));
  // V1: the body shows the page's one home view, named by `data-view`. It changes on a tab or sub-page
  // change and on nothing else. Each domain slice draws its view here (S2 first).
  const previewBody = hook(h('div', 'p3-preview-body'), 'preview-body');
  previewBody.setAttribute('role', 'region');
  previewBody.setAttribute('aria-labelledby', 'p3-preview-title');
  preview.append(previewHead, previewBody);
  panes.append(levers, preview);

  // ── Inspect (F1): over the preview ────────────────────────────────────────────────────────────────
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

  // ── Activity (F2), the Figma menu and the Agent tile's slot (S1.4) ───────────────────────────────
  // The drawer sits last in the frame, pinned to the bottom edge, under whichever region shows the page.
  // S11.2 (P1, variant 1): while the Build style guides page shows its run, the drawer does not open by itself for it.
  const activity = mountActivity({ host, lend: opts.activity, narrow: () => root.dataset.w === 'narrow', quiet: (k) => k === 'styleguide' && isMenuPage(page),
    // #2176: the open drawer grows up to just under the preview header (or Inspect's, in its place; or, on a page of
    // the shell's own, the head). A region not drawn measures 0, so the lowest bottom is the one shown.
    room: { frame: root, ceiling: () => Math.max(...[head, previewHead, inspectHead].map((n) => n.getBoundingClientRect().bottom)) } }, cleanups);
  const figma = host === 'figma' && opts.figma ? figmaMenu(opts.figma, cleanups) : null;
  const agent = host === 'figma' ? hook(h('div', 'p3-agent-slot'), 'bar-agent') : null;

  // The Activity status line rides in the top bar, which is always drawn, on the bar's own ground.
  bar.append(activity.live);
  // The Build style guides page (S11.2): a full-width page of the shell's own, shown in the `page` layout.
  const menuPage = hook(h('main', 'p3-sgpage'), 'menu-page');
  menuPage.id = 'p3-menu-page';
  menuPage.tabIndex = -1;
  // S12: the window layer, last, so a window is drawn over the drawer too.
  const layer = hook(h('div', 'p3-layer'), 'layer');
  root.append(head, panes, menuPage, inspect, activity.drawer, layer);
  app.append(root);

  // The verdict, on the bar, after the brand switcher; then the bar's controls (S13.1), which place the shell's nodes.
  const verdict = verdictButton((opener) => openInspect('contrast', opener), cleanups);
  const barMain = mountBar(opts.bar, { mark, verdict, activity: activity.button, agent, figma, theme, applyTheme: host === 'figma' ? opts.applyTheme : null }, cleanups);
  barSlot.append(barMain);

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
  /** Close Inspect, back to the page's preview, where it was. */
  function closeInspect(refocus = true): void {
    if (!inspecting) return;
    inspecting = null;
    inspectBody.replaceChildren();
    render();
    window.scrollTo(0, scrollBack);
    previewBody.scrollTop = previewBack;
    const back = opener && opener.isConnected && opener.getClientRects().length ? opener : null;
    opener = null;
    if (refocus) (back ?? (root.dataset.layout === 'page' ? menuPage : previewTitle)).focus?.();
  }
  previewTitle.tabIndex = -1;

  // ── selection ───────────────────────────────────────────────────────────────────────────────────
  let subFor: TabId | null = null;
  let subTabs: HTMLButtonElement[] = [];

  /** Select a place: its page is the store's page itself. */
  const go = (p: Place): void => {
    // V1: a page change shows the new page's home, so Inspect closes with it (as in concept v6).
    if (inspecting && (p.tab !== place?.tab || p.sub !== place?.sub)) closeInspect(false);
    place = p;
    const moved = newPageOf(p);
    if (moved && page !== moved) setPage(moved); else render();
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
    leversRegion.replaceChildren();
    previewBody.replaceChildren();
    mounted = null;
    syncDerivedReadOnly();
  };
  /** N-3 A (#1984): the levers panel read-only, with its one line, exactly while a page that edits the previewed mode
   *  shows a derived mode. Run on every mount, release and mode change. */
  function syncDerivedReadOnly(): void {
    const on = mounted !== null && NEW_PAGES[mounted].derivedReadOnly === true && isDerived(currentMode);
    holding = on;
    if (on) {
      holdSettings();
      leversHold.observe(leversRegion, HOLD_WATCH);
      leversNoteText.textContent = DERIVED_READONLY_NOTE(modeLabel(currentMode));
      if (leversNote.parentNode !== levers || levers.firstChild !== leversNote) levers.prepend(leversNote);
    } else {
      leversHold.disconnect();
      releaseSettings();
      leversNote.remove();
    }
  }
  cleanups.push(subscribe('mode', syncDerivedReadOnly));
  // PM1 B (owner, 2026-10-08; #2321): a page that pins Light (Palettes). On the way in, the preview is switched to
  // Light, the mode the person had is kept, and the mode control is held in the disabled skin. On the way out, the
  // kept mode is put back, if the brand still ships it. The pin writes the store's own mode, so everything that reads
  // it (the page, Inspect, the verdict) agrees with what the held control shows. A mode written by anything else
  // while pinned (a brand loaded, which starts at the brand's first mode) is the new starting point: the kept mode is
  // dropped, and nothing is put back.
  let pinned = false;
  let keptMode: typeof currentMode | null = null;
  let pinWriting = false;
  const pinWrite = (m: typeof currentMode): void => { pinWriting = true; try { setCurrentMode(m); } finally { pinWriting = false; } };
  /** Run as the place changes, before the next page is mounted, so it mounts in the mode it will show. */
  const syncModePin = (next: NewPageKey | null): void => {
    const pin = next !== null ? NEW_PAGES[next].pinsLight ?? null : null;
    if (pin && !pinned) {
      pinned = true;
      keptMode = currentMode === 'light' ? null : currentMode;
      if (keptMode !== null) pinWrite('light');
    } else if (!pin && pinned) {
      pinned = false;
      const back = keptMode;
      keptMode = null;
      if (back !== null && back !== currentMode && (rp.modes as readonly string[]).includes(back)) pinWrite(back);
    }
    modes.hold(pin ? pin.why : null);
  };
  cleanups.push(subscribe('mode', () => { if (pinned && !pinWriting) keptMode = null; }));
  cleanups.push(unmountPanes, () => { for (const c of menuCleanups ?? []) c(); menuCleanups = null; });
  // QA-B9: record which lever section each interaction is in. Records only; an edit handler turns a record
  // into a note, and nothing else moves the preview (V1).
  cleanups.push(trackLeverSections(levers));

  let lastLayout: string | null = null;
  // The menu page, mounted while it is the page and released, subscriptions included, when it is not.
  let menuCleanups: (() => void)[] | null = null;
  const render = (): void => {
    const onMenu = isMenuPage(page) && !!opts.styleGuides;
    // Written only when the layout a place calls for changes, never on every render.
    const layout = onMenu ? 'page' : 'panes';
    if (onMenu && !menuCleanups) {
      menuCleanups = [];
      mountStyleGuides(menuPage, opts.styleGuides!, () => root.dataset.w === 'narrow', menuCleanups);
    } else if (!onMenu && menuCleanups) {
      for (const c of menuCleanups) c();
      menuCleanups = null;
      menuPage.replaceChildren();
    }
    if (layout !== lastLayout) { root.dataset.layout = layout; lastLayout = layout; }
    root.dataset.pane = pane;
    for (const b of paneButtons) b.setAttribute('aria-pressed', String(b === paneButtons[pane === 'settings' ? 0 : 1]));

    select(tabs, place ? tabs[TABS.findIndex((t) => t.id === place!.tab)] : null);
    domSelect.value = place?.tab ?? '';
    buildSubRow();
    select(subTabs, place?.sub ? subTabs[TABS.find((t) => t.id === place!.tab)!.subs!.findIndex((s) => s.id === place!.sub)] : null);
    // The moved page's levers and preview are mounted once per visit, and released when the place changes.
    const moved = place && !onMenu ? newPageOf(place) : null;
    if (moved !== mounted) {
      unmountPanes();
      syncModePin(moved);
      if (moved) {
        const row = NEW_PAGES[moved];
        row.levers(levers, paneCleanups, opts.lend);
        // The page mounted into the pane (its scroll container, which it reads as `host`); its nodes move into the
        // read-only region (N-3 A), which then becomes the pane's content.
        leversRegion.replaceChildren(...levers.childNodes);
        levers.replaceChildren(leversRegion);
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
      syncDerivedReadOnly();
    }

    // The levers pane is the panel the tabs control. With nothing selected (a page no tab shows, the menu page) it
    // is a plain region.
    const labelledBy = place ? (place.sub ? `p3-sub-${place.sub}` : `p3-tab-${place.tab}`) : null;
    levers.setAttribute('aria-label', 'Settings');
    if (labelledBy) { levers.setAttribute('role', 'tabpanel'); levers.setAttribute('aria-labelledby', labelledBy); }
    else { levers.removeAttribute('role'); levers.removeAttribute('aria-labelledby'); }
    for (const t of [...tabs, ...subTabs]) t.setAttribute('aria-controls', PANEL_ID);
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

  // A page change from anywhere: a tab, the Pages menu, a Continue button, a brand load.
  cleanups.push(subscribe('page', () => {
    const was = place;
    place = placeOfPage(page);
    if (inspecting && (place?.tab !== was?.tab || place?.sub !== was?.sub)) closeInspect(false);
    render();
  }));

  // ── width class and the sticky height ───────────────────────────────────────────────────────────
  const syncSticky = (): void => {
    const sticky = getComputedStyle(head).display === 'contents' ? bar : head;
    document.documentElement.style.setProperty('--chrome-h', `${sticky.offsetHeight}px`);
  };
  // ── the bar's fit (#2214; the owner's BL1 A+B, BL2 A and BL3 A, 2026-10-06) ─────────────────────────────────────
  // Above the narrow tier, on both hosts, the bar is one row whenever it fits. When the full bar would not, these give
  // way in order, each by a measured fit check (`data-bar-fit`): every tile label together (`glyphs`; Apply Theme keeps
  // its text), then the product name beside the logo (`logo`, the logo kept, as at the narrow tier), then the narrow
  // tier's two rows (`rows`: Pages, Figma and Apply Theme on the second, Apply Theme at the right; only where the bar
  // has that file row), then the brand switcher's name, cut short with an ellipsis (`trim`, the owner's Q83 A), so the
  // first row still holds. While it is cut, the full name stays its accessible name (its text) and its tooltip
  // (`title`). The bar is never wrapped any other way. Each step's width is derived from ONE measurement of
  // the full bar, everything shown, so it never depends on the step that happens to be drawn and the state cannot
  // flap; it is taken once per content change (a mutation in the bar's controls, a font load, a change of tier) and
  // reused while only the width moves. A breakpoint would not hold: a longer brand name needs the steps sooner.
  // At the narrow tier only the cut name applies (#2262); see `fitBar`.
  type FitWidths = { readonly full: number; readonly glyphs: number; readonly logo: number; readonly rows: number | null };
  let fitWidths: FitWidths | null = null;
  const measureFit = (): FitWidths => {
    delete root.dataset.barFit;   // everything shown; the step is set again before anything is drawn
    const w = (n: Element | null): number => (n ? n.getBoundingClientRect().width : 0);
    const gap = parseFloat(getComputedStyle(barMain).columnGap);
    const rowBreak = barMain.querySelector(':scope > .p3-bar-break');
    let full = 0, first = 0, n = 0, nFirst = 0, beforeBreak = true, labels = 0, name = 0;
    for (const c of barMain.children) {
      if (c === rowBreak) beforeBreak = false;
      if (c.getClientRects().length === 0) continue;   // not drawn, or a box-less layer (`display: contents`)
      const cs = getComputedStyle(c);
      if (cs.position === 'absolute' || cs.position === 'fixed') continue;
      n++;
      if (beforeBreak) nFirst++;
      // A spacer grows into the free space and asks for none, so it adds only its gaps.
      const own = parseFloat(cs.flexGrow) > 0 ? 0 : w(c) + parseFloat(cs.marginLeft) + parseFloat(cs.marginRight);
      full += own;
      if (beforeBreak) first += own;
    }
    // A tile is a column, as wide as its widest child: without its label, as wide as its mark.
    for (const t of barMain.querySelectorAll('.p3-tile')) {
      if (t.getClientRects().length === 0) continue;
      labels += Math.max(0, w(t.querySelector('.p3-tile-label')) - w(t.querySelector('.p3-tile-mark')));
    }
    const nameNode = barMain.querySelector('.p3-mark-name');
    if (nameNode && nameNode.getClientRects().length) name = w(nameNode) + parseFloat(getComputedStyle(nameNode.parentElement!).columnGap);
    full += Math.max(0, n - 1) * gap;
    first += Math.max(0, nFirst - 1) * gap;
    return { full, glyphs: full - labels, logo: full - labels - name, rows: rowBreak ? first - labels - name : null };
  };
  const fitBar = (): void => {
    const room = barMain.getBoundingClientRect().width;
    if (!room) return;   // not laid out yet: the observer calls again once it is
    fitWidths ??= measureFit();
    const fits = (x: number): boolean => x <= room + 0.01;
    const f = fitWidths;
    // The narrow tier (#2262, the owner's A, 2026-10-09) already draws its own rows: the labels and the product name
    // dropped, and on the plugin the file row below. Its one step is Q83 A's: when its first row would not fit, the
    // brand switcher's name is cut, by the same measured check, so a long name never wraps that row anywhere else. The
    // measurement is taken under the narrow rules (a change of tier clears it), so the labels and name add nothing.
    const step = root.dataset.w === 'narrow' ? (fits(f.rows ?? f.full) ? null : 'trim')
      : fits(f.full) ? null : fits(f.glyphs) ? 'glyphs' : fits(f.logo) ? 'logo' : f.rows !== null && fits(f.rows) ? 'rows' : 'trim';
    if (step) root.dataset.barFit = step; else delete root.dataset.barFit;
    const sw = barMain.querySelector<HTMLElement>('[data-p3="brand-switcher"]');
    const nameEl = sw?.querySelector<HTMLElement>('.p3-brand-name');
    const full = nameEl?.textContent ?? '';
    // The tooltip follows the cut, not the step (#2272). A `trim` can leave the name whole, when the measurement it was
    // picked from runs wider than the bar now draws, and then nothing is cut and nothing needs repeating. Read on the
    // drawn name, `trim` already set: its text's own width (a Range) past its box, beyond one layout unit, to the
    // fraction of a pixel that whole-pixel `scrollWidth` and `clientWidth` round away.
    let cut = false;
    if (nameEl && step === 'trim') {
      const r = document.createRange();
      r.selectNodeContents(nameEl);
      cut = r.getBoundingClientRect().width > nameEl.getBoundingClientRect().width + 1 / 64;
    }
    if (sw && cut && full) sw.title = full; else sw?.removeAttribute('title');
  };
  const refit = (): void => { fitWidths = null; fitBar(); };
  const mo = new MutationObserver(refit);
  mo.observe(barMain, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden', 'aria-busy', 'disabled'] });
  document.fonts.addEventListener('loadingdone', refit);
  cleanups.push(() => mo.disconnect(), () => document.fonts.removeEventListener('loadingdone', refit));
  const ro = new ResizeObserver(() => {
    const w = root.getBoundingClientRect().width;
    const tier = w <= NARROW_MAX ? 'narrow' : 'wide';
    if (root.dataset.w !== tier) { root.dataset.w = tier; fitWidths = null; }
    fitBar();
    syncSticky();
  });
  ro.observe(root);
  ro.observe(head);
  ro.observe(bar);
  cleanups.push(() => ro.disconnect());
  root.dataset.w = app.getBoundingClientRect().width <= NARROW_MAX ? 'narrow' : 'wide';

  render();

  return {
    head, bar: barSlot, barMain, notices, verdict, syncSticky, layer,
    activity: activity.button, figma, agent,
    unmount: () => {
      for (const c of cleanups) c();
      root.remove();
      app.classList.remove('p3-app');
      document.documentElement.style.removeProperty('--chrome-h');
    },
  };
};

/** The theme menu: a bar tile, "Theme", that opens a menu of radio items (concept v6): Light, Dark and System on the
 *  studio, Match Figma, Light and Dark on the plugin (`theme.ts`). The tile shows the current choice's glyph; its
 *  name and tooltip say the choice ("Theme: System"). */
const themeToggle = (cleanups: (() => void)[]): HTMLElement => {
  const wrap = h('div', 'p3-popwrap');
  const { btn, mark, tip } = tile('theme-toggle', 'Theme');
  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-controls', 'p3-theme-menu');
  const menu = hook(h('div', 'p3-menu'), 'theme-menu');
  menu.id = 'p3-theme-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Theme');
  const items = THEME_CHOICES.map((c) => {
    const it = hook(h('button', 'p3-menu-item'), `theme-option-${c.pref}`);
    it.type = 'button';
    it.setAttribute('role', 'menuitemradio');
    it.tabIndex = -1;
    const label = h('span', 'p3-menu-label', c.label);
    it.append(glyph(c.glyph), label);
    if (c.note) it.append(h('span', 'p3-menu-note', c.note));
    it.append(glyph('check'));
    it.onclick = () => { setThemePref(c.pref); close(true); paint(); };
    return it;
  });
  menu.append(...items);

  const paint = (): void => {
    const cur = themeChoice();
    mark.replaceChildren(glyph(cur.glyph));
    btn.setAttribute('aria-label', `Theme: ${cur.label}`);
    tip.textContent = `Theme: ${cur.label}`;
    for (const [i, c] of THEME_CHOICES.entries()) items[i].setAttribute('aria-checked', String(c.pref === cur.pref));
  };
  cleanups.push(onThemeChange(paint));
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
