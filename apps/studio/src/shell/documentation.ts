/**
 * Documentation, the plugin rail's third area (#2909 IA v2 phase 1; owner decisions Q667 A, Q2909.21 A, Q2909.23 A, and
 * #2977 for the cover's switch): everything Prism3 writes into the file for people to read, as settings only. There is
 * no Draw button here: Update file draws the style guides, the usage panels and the cover with these settings, which are
 * kept in the file (`apps/plugin/src/doc-settings.ts`) so they outlast the session and travel with the file.
 *
 * Its tabs (`DOC_TABS`, `pages.ts`), a select at the narrow tier as Theme's pages are:
 *   · Style guides: every setting the old Build style guides page had, mounted from `shell/style-guides.ts` in its
 *     settings-only mode;
 *   · Usage panels: one switch, on unless the file says off: a panel beside each set a build or an update writes (#846);
 *   · Cover: one switch, on unless the file says off: the library cover and the file thumbnail (#2977);
 *   · Specs: a placeholder for spec sheets (#2830), so the area's shape holds when they land.
 *
 * HOW IT TALKS TO THE REST: it reads the file's settings through `lend.read` and saves the whole record through
 * `lend.save`; it repaints on `host:docs`. It names no legacy repaint tier (`test-shell-imports.ts`).
 *
 * Every string here is a DRAFT placeholder, to be replaced with the owner's wording before merge (Q2909.10 A).
 */
import { subscribe } from '../state/store';
import type { DocSettingsView } from '../state/host-session';
import { DOC_TABS, type DocTabId } from './pages';
import { glyph, h, hook, switchEl } from './dom';
import { mountStyleGuides, type StyleGuidesLend } from './style-guides';

export type DocumentationLend = {
  /** The file's settings as the host last said them; `null` until it has. */
  readonly read: () => DocSettingsView | null;
  /** Keep the whole record in the file. */
  readonly save: (next: { readonly panels: boolean; readonly cover: boolean; readonly styleGuide: unknown }) => void;
  /** The style-guides page's reads and writes (`shell/style-guides.ts`), without its `settings`, which this adds. */
  readonly styleGuides: StyleGuidesLend;
};

export const DOCS_COPY = {
  heading: 'Documentation',
  panels: 'Usage panels',
  panelsDesc: 'A panel beside each component set, with its overview, anatomy, usage and accessibility notes. Update file draws one for each set it adds or changes. A panel edited by hand keeps its edits.',
  panelsOff: 'Off: Update file draws no new panels. Panels already in the file stay.',
  cover: 'Cover',
  coverDesc: 'The library cover, with the brand’s name and the Prism3 version, on the Cover page. Update file draws it and keeps it current, and sets it as the file thumbnail while Figma’s default is in place.',
  coverOff: 'Off: Update file leaves the Cover page and the file thumbnail alone.',
  specs: 'Spec sheets',
  specsDesc: 'Measured specs for each component, drawn into the file. Coming later.',
  saveError: 'Couldn’t save the setting in this file.',
} as const;

/** The tab open, kept for the session: leaving the area and coming back returns to it. */
let current: DocTabId = 'guides';

/** Mount the area into `root`. Its subscriptions and the style-guides page's go into `cleanups`. */
export const mountDocumentation = (root: HTMLElement, lend: DocumentationLend, narrow: () => boolean, cleanups: (() => void)[]): void => {
  const page = hook(h('div', 'p3-docs'), 'documentation');
  const head = hook(h('header', 'p3-docs-head'), 'docs-head');
  head.append(hook(h('h1', 'p3-sg-title', DOCS_COPY.heading), 'docs-heading'));
  const tabList = hook(h('div', 'p3-tabs p3-docs-tabs'), 'docs-tabs');
  tabList.setAttribute('role', 'tablist');
  tabList.setAttribute('aria-label', DOCS_COPY.heading);
  const tabs = DOC_TABS.map((t) => {
    const b = hook(h('button', 'p3-tab', t.label), `docs-tab-${t.id}`);
    b.type = 'button';
    b.id = `p3-docs-tab-${t.id}`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', 'p3-docs-body');
    b.onclick = () => show(t.id, false);
    return b;
  });
  tabList.append(...tabs);
  tabList.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(e.target as HTMLButtonElement);
    const to = i < 0 ? -1 : e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length
      : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    show(DOC_TABS[to].id, true);
  });
  const selWrap = h('div', 'p3-selwrap p3-docs-select');
  const sel = hook(h('select', 'p3-select'), 'docs-select');
  sel.setAttribute('aria-label', DOCS_COPY.heading);
  for (const t of DOC_TABS) { const o = h('option', undefined, t.label); o.value = t.id; sel.append(o); }
  sel.onchange = () => show(sel.value as DocTabId, false);
  selWrap.append(sel, glyph('chev'));
  head.append(tabList, selWrap);
  const body = hook(h('div', 'p3-docs-body'), 'docs-body');
  body.id = 'p3-docs-body';
  body.setAttribute('role', 'tabpanel');
  page.append(head, body);
  root.append(page);

  let tabCleanups: (() => void)[] = [];
  const release = (): void => { for (const c of tabCleanups) c(); tabCleanups = []; body.replaceChildren(); };
  cleanups.push(release, () => page.remove());

  /** The whole record, with one field changed. */
  const saveWith = (patch: Partial<{ panels: boolean; cover: boolean; styleGuide: unknown }>): void => {
    const d = lend.read();
    lend.save({ panels: d?.panels ?? true, cover: d?.cover ?? true, styleGuide: d?.styleGuide ?? null, ...patch });
  };

  /** A switch card: its title and switch on one row, its description, and the line for off. */
  const switchCard = (role: string, title: string, desc: string, offLine: string, on: () => boolean, set: (on: boolean) => void): (() => void) => {
    const card = hook(h('section', 'p3-docs-card'), `docs-${role}`);
    const row = h('div', 'p3-docs-cardrow');
    const sw = switchEl(`docs-${role}-switch`, title, (v) => set(v));
    row.append(h('h2', 'p3-docs-cardtitle', title), sw.el);
    const off = hook(h('p', 'p3-sub', offLine), `docs-${role}-off`);
    const err = hook(h('p', 'p3-sg-error', ''), `docs-${role}-error`);
    card.append(row, h('p', 'p3-sub', desc), off, err);
    body.append(card);
    const paint = (): void => {
      const d = lend.read();
      sw.set(on());
      sw.el.disabled = d === null;
      off.hidden = on();
      err.textContent = d?.error ? DOCS_COPY.saveError : '';
      err.hidden = !d?.error;
    };
    paint();
    return paint;
  };

  const mountTab = (id: DocTabId): void => {
    release();
    if (id === 'guides') {
      mountStyleGuides(body, { ...lend.styleGuides, settings: { saved: () => { const d = lend.read(); return d ? d.styleGuide : undefined; }, save: (rec) => saveWith({ styleGuide: rec }) } }, narrow, tabCleanups);
      return;
    }
    if (id === 'panels') {
      const paint = switchCard('panels', DOCS_COPY.panels, DOCS_COPY.panelsDesc, DOCS_COPY.panelsOff, () => lend.read()?.panels ?? true, (v) => saveWith({ panels: v }));
      tabCleanups.push(subscribe('host:docs', paint));
      return;
    }
    if (id === 'cover') {
      const paint = switchCard('cover', DOCS_COPY.cover, DOCS_COPY.coverDesc, DOCS_COPY.coverOff, () => lend.read()?.cover ?? true, (v) => saveWith({ cover: v }));
      tabCleanups.push(subscribe('host:docs', paint));
      return;
    }
    const card = hook(h('section', 'p3-docs-card p3-docs-later'), 'docs-specs');
    card.append(h('h2', 'p3-docs-cardtitle', DOCS_COPY.specs), h('p', 'p3-sub', DOCS_COPY.specsDesc));
    body.append(card);
  };

  const show = (id: DocTabId, focus: boolean): void => {
    current = id;
    tabs.forEach((b, i) => {
      const on = DOC_TABS[i].id === id;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    sel.value = id;
    body.setAttribute('aria-labelledby', `p3-docs-tab-${id}`);
    mountTab(id);
    if (focus) tabs[DOC_TABS.findIndex((t) => t.id === id)].focus();
  };
  show(current, false);
};
