/**
 * Components, the levers panel (UI redesign S8.2; redesigned by #2700, the owner's approved wireframe, every call A).
 *
 * WHAT IT DRAWS: the list of component sets, the shown family's settings under its row, and the one action bar (call 9 A:
 * the list and the action where the choosing happens; the focused family's preview is the preview pane's,
 * `preview/components.ts`).
 *   · Its sections (see SECTIONS WITH SETTINGS below for the first three): Buttons, Fields, Tag, Other components and
 *     Subcomponents (note 4, call 11 A; #2905). Outside the sections with settings, each row is a family (several sets on one Figma page,
 *     closed until one of its sets is selected or the row is focused, call 15 A) or a set of its own, alphabetical
 *     (note 2), labeled by page or by component name (call 14 A), with its members and the page it lands on (idea 12).
 *   · In the plugin, a box on every set, family and section (note 5, call 8 A: three-state, as Build style guides'), and
 *     Subcomponents' own "Build all" (call 10 A), which runs at once and leaves the selection alone.
 *   · The action bar at the foot of the pane (idea 9 A, as Draw is on Build style guides): "Build N sets" (call 17 A)
 *     and what it costs, the sets a build makes first when the file lacks them (idea 7 A), and, while it runs, its place
 *     and Stop (call 16 A); after a run of several sets, its summary and the way to Activity (idea 13 A).
 *   · On the web the list is read-only: no boxes, no bar, and one line saying building needs the plugin.
 * Nothing is selected when the page opens (call 13 A).
 *
 * A NAME FOCUSES, A BOX SELECTS: focusing does not select, and the preview pane shows the focused family. At the narrow
 * tier (one column) a row's meta drops to its count, and the preview is the frame's Preview, as on every page.
 *
 * SECTIONS WITH SETTINGS (#2905 phase 1, owner decisions Q538 and Q548 on wireframe v2, every call A). The components
 * that share settings are grouped, one section per group, its settings set once: **Buttons** (its sets, then Button
 * options, `domains/button-options.ts`), **Fields** (Password field, Search field, Select, Text field and Textarea, then
 * Field options, `domains/field-options.ts`, and below it Search options, `domains/search-options.ts`, #2952) and
 * **Tag** (Tag, then Tag options, `domains/tag-options.ts`). A section holds an ordered list of blocks
 * (`SECTION_BLOCKS`), each with its own disclosure line (Q7 A). The section title stands in for the family row (Q8 A), so a section's sets are
 * rows at its edge, and its settings start at that same edge (Q1 A: one edge for rows and blocks). Every other row is
 * drawn as before, in Other components (Q6 A); the grouping is `state/component-groups.ts`'s.
 *
 * SETTINGS AFTER THE SETS, COLLAPSED (#2815 step 1; placement #2844, Q439 A; kept by Q7 A and Q9 A on #2905). A
 * section's settings come AFTER its sets, behind one disclosure line that is closed on open: the sets are what the page
 * is for, so they come first. Opening the line also focuses the section's first set, unless one of its sets already has
 * focus, so the preview shows what the settings change; the open state lasts the session (`state/components-page.ts`).
 * Each block is mounted once and moved, not rebuilt, when the list redraws (hidden while closed), so a
 * selection or a verdict never resets it.
 *
 * SEARCH (the Studio's search, Q3) filters the rows: a family stays while any of its sets matches (#2700's edge state).
 * It also reaches the settings (#3093): a lever in a settings block matches by its label, its description or its key
 * (`leverBlock`'s words, `saidOf`), so its section shows even when none of its sets matches, the search opens its block
 * as it opens a family (call 7), and the block shows only the levers that match. Each matching lever is a hit.
 *
 * A DERIVED MODE holds nothing here: the list and the bar edit no brand setting, so building stays available, as it was
 * when the build bar sat in the preview pane, and the frame does not hold this page (#2700). The Button options, which do
 * edit, hold themselves (`domains/button-options.ts`), and repaint themselves on `brand` and `mode`.
 *
 * HOW IT REPAINTS: by store subscription only (plan §5): `host` and `host:components` for the bar and the last-build
 * lines, `search` for the filter, the page state (`state/components-page.ts`) for selection, open and focus, and the
 * frame's width tier. It never imports `main.ts` (`test-shell-imports.ts`), and
 * no component definition: the catalog is `state/component-catalog.ts`'s (`check:ignore` fails by name if a definition
 * reaches the web bundle).
 */
import { searchQuery, setSearchHits, subscribe } from '../state/store';
import { componentCatalog, type Catalog } from '../state/component-catalog';
import { componentsPage, setComponentsPage, watchComponentsPage } from '../state/components-page';
import {
  alsoBuilds, boxOfSets, buildableOf, costOf, entryOf, familiesToOpen, fmt, GROUPS_COPY, tiersOf, inListOrder, rowMatches, rowOfFocus,
  SECTION_BLOCKS, setFocusKey, toggleSets, type BlockKey, type BoxState, type GroupRow, type GroupSection,
} from '../state/component-groups';
import { currentOf, positionOf, RUN_COPY } from '../state/build-queue';
import { glyph, h, hook, pendingLabel, setBusy } from '../shell/dom';
import { saidOf, stateLine } from '../ui/lever-kit';
import { SETS_COPY } from '../preview/sections/component-sets';
import { UPDATE_COPY, type SetStatus } from '../state/update-file';
import type { PageLends } from '../preview/brand';
import { modeLabel } from '../shell/preview';
import { mountButtonOptions, BUTTON_OPTIONS_COPY } from './button-options';
import { mountFieldOptions, FIELD_OPTIONS_COPY } from './field-options';
import { mountSearchOptions, SEARCH_OPTIONS_COPY } from './search-options';
import { mountTagOptions, TAG_OPTIONS_COPY } from './tag-options';
import { mountDialogOptions, DIALOG_OPTIONS_COPY } from './dialog-options';
import { mountBannerOptions, BANNER_OPTIONS_COPY } from './banner-options';
import { mountLinkOptions, LINK_OPTIONS_COPY } from './link-options';
import { mountRadioOptions, RADIO_OPTIONS_COPY } from './radio-options';
import { mountSharedOptions } from './shared-options';
import { BUTTON_DESC, DOMAINS, SHARED_DESC, type PageData } from '../shell/pages';

/** Each settings block (#2905): its hook prefix, its title and description (Q10 A: wireframe v2's words), and its
 *  builder. Which blocks a section draws, and in what order, is `SECTION_BLOCKS` (#2952: Fields draws two). */
const SECTION_SETTINGS: Record<BlockKey, {
  readonly hook: string; readonly title: string; readonly desc: string;
  readonly mount: (el: HTMLElement, cleanups: (() => void)[], modeName: (m: string) => string) => void;
}> = {
  buttons: { hook: 'button-options', title: BUTTON_OPTIONS_COPY.title, desc: BUTTON_DESC, mount: mountButtonOptions },
  fields: { hook: 'field-options', title: FIELD_OPTIONS_COPY.title, desc: FIELD_OPTIONS_COPY.desc, mount: mountFieldOptions },
  search: { hook: 'search-options', title: SEARCH_OPTIONS_COPY.title, desc: SEARCH_OPTIONS_COPY.desc, mount: mountSearchOptions },
  tags: { hook: 'tag-options', title: TAG_OPTIONS_COPY.title, desc: TAG_OPTIONS_COPY.desc, mount: mountTagOptions },
  dialogs: { hook: 'dialog-options', title: DIALOG_OPTIONS_COPY.title, desc: DIALOG_OPTIONS_COPY.desc, mount: mountDialogOptions },
  banners: { hook: 'banner-options', title: BANNER_OPTIONS_COPY.title, desc: BANNER_OPTIONS_COPY.desc, mount: mountBannerOptions },
  links: { hook: 'link-options', title: LINK_OPTIONS_COPY.title, desc: LINK_OPTIONS_COPY.desc, mount: mountLinkOptions },
  radios: { hook: 'radio-options', title: RADIO_OPTIONS_COPY.title, desc: RADIO_OPTIONS_COPY.desc, mount: mountRadioOptions },
};

/** Mount the Components list into `hostEl`. Subscriptions are released through `cleanups`. */
export const mountComponentsLevers = (hostEl: HTMLElement, cleanups: (() => void)[], lend: PageLends): void => {
  // #2909 IA v2 phase 1 (Q2909.5 A): the plugin's one write is Update file, whose checklist adds the sets the file
  // lacks. So this page draws no boxes and no Build bar on either host: the list, its sections and their settings.
  const plugin = false;
  const root = hook(h('div', 'p3-levers-body p3-cp'), 'components-levers');
  const list = hook(h('div', 'p3-cp-list'), 'components-list');
  const bar = plugin ? hook(h('div', 'p3-cp-bar'), 'components-bar') : null;
  root.append(list);
  if (bar) root.append(bar);
  hostEl.replaceChildren(root);
  /** Each settings block (see the header), by block: the block, and the subscriptions its controls hold. */
  const settings = new Map<BlockKey, { el: HTMLElement; own: (() => void)[] }>();
  const dropSettings = (keep: ReadonlySet<BlockKey> = new Set()): void => {
    for (const [k, v] of settings) if (!keep.has(k)) { for (const fn of v.own) fn(); settings.delete(k); }
  };
  const optsId = (kind: BlockKey): string => `p3-cp-opts-${kind}`;
  /** A settings block, mounted once and kept while its section is shown. */
  const settingsOf = (kind: BlockKey): HTMLElement => {
    const def = SECTION_SETTINGS[kind];
    const had = settings.get(kind);
    if (had) return had.el;
    const own: (() => void)[] = [];
    // A group inside the L1 section, as Color › Interactive's button sets are (`.p3-icol`): its title L2, its levers' names
    // L3 (TY2 A). No name, so not a landmark: only Inspect and Activity carry landmark names (Q197, #2487).
    const el = hook(h('section', 'p3-icol p3-cp-optsec'), `${def.hook}-section`);
    el.id = optsId(kind);
    const head = h('div', 'p3-icol-head');
    const title = hook(h('h3', 'p3-icol-title', def.title), `${def.hook}-title`);
    head.append(title, hook(h('p', 'p3-lsec-desc p3-cp-opt-desc', def.desc), `${def.hook}-desc`));
    const opts = h('div', 'p3-cp-opts');
    def.mount(opts, own, modeLabel);
    el.append(head, opts);
    settings.set(kind, { el, own });
    return el;
  };
  const frame = (): HTMLElement | null => hostEl.closest<HTMLElement>('[data-w]');
  const narrow = (): boolean => frame()?.dataset.w === 'narrow';

  /** A checkbox in the chrome's pattern (a button with `role="checkbox"`, mixed included), as Build style guides'. */
  const box = (key: string, state: BoxState, label: string, onToggle: () => void): HTMLButtonElement => {
    const b = hook(h('button', 'p3-btn p3-btn-page p3-check p3-cp-check'), 'cp-box');
    b.type = 'button';
    b.dataset.key = key;
    b.setAttribute('role', 'checkbox');
    b.setAttribute('aria-checked', state === 'on' ? 'true' : state === 'mixed' ? 'mixed' : 'false');
    b.setAttribute('aria-label', label);
    const bx = h('span', 'p3-check-box');
    bx.setAttribute('aria-hidden', 'true');
    bx.append(glyph(state === 'mixed' ? 'dash' : 'check'));
    b.append(bx);
    b.onclick = onToggle;
    return b;
  };
  const select = (ids: readonly string[], open?: string): void => {
    const s = componentsPage();
    const sel = toggleSets(componentCatalog(), ids, s.sel);
    // Call 15 A: a family opens when one of its sets is selected.
    const nextOpen = open && [...sel].some((id) => ids.includes(id)) ? new Set([...s.open, open]) : s.open;
    setComponentsPage({ sel, open: nextOpen });
  };

  /** #2909 Q2909.8 A: a set's statuses in this file, as tags (plugin only; the web has no file). A family shows what its
   *  sets show, each status once, in the statuses' own order. */
  const STATUS_ORDER: readonly SetStatus[] = ['due', 'hand', 'unchecked', 'checking', 'new', 'current'];
  const statusTags = (ids: readonly string[]): HTMLElement | null => {
    const has = new Set(ids.flatMap((id) => lend.sets.status(id)));
    // A family whose sets are partly in the file and partly not reads by the ones it holds.
    if (has.size > 1) has.delete('current');
    const list = STATUS_ORDER.filter((s) => has.has(s));
    if (!list.length) return null;
    const box = hook(h('span', 'p3-cp-status'), 'cp-status');
    for (const s of list) { const t = hook(h('span', 'p3-sg-tag', UPDATE_COPY.status[s]), 'cp-status-tag'); t.dataset.status = s; box.append(t); }
    return box;
  };

  /** One set row inside a family, or a set on its own (`single` is its row). `flat`: a family's set listed at a section's
   *  edge (#2905, Q8 A), which focuses as itself, since its family has no row. */
  const setRow = (catalog: Catalog, id: string, row: GroupRow, member: boolean, flat = false): HTMLElement => {
    const e = entryOf(catalog, id)!;
    const r = hook(h('div', member ? 'p3-cp-row p3-cp-member' : 'p3-cp-row'), member ? 'cp-member' : 'cp-row');
    r.dataset.set = id;
    if (!member) r.dataset.row = row.key;
    if (!e.buildable) r.dataset.off = 'true';
    const label = member ? e.name : row.label;
    if (plugin && e.buildable) r.append(box(`set=${id}`, componentsPage().sel.has(id) ? 'on' : 'off', GROUPS_COPY.selectSet(label), () => select([id], row.family && !flat ? row.key : undefined)));
    else if (plugin) r.append(h('span', 'p3-cp-nobox'));
    r.append(h('span', 'p3-cp-fold-space'));
    r.append(nameButton(row, label, member, flat ? setFocusKey(id) : undefined));
    const meta = hook(h('span', 'p3-cp-meta'), 'cp-meta');
    if (!e.buildable) meta.append(hook(h('span', 'p3-cp-reason', SETS_COPY.cannot(e.reason ? e.reason.replace(/^\S+:\s*/, '') : SETS_COPY.noProjection)), 'cp-reason'));
    else if (e.members !== null) {
      meta.append(narrow() ? fmt(e.members) : GROUPS_COPY.members(e.members, e.unit));
      if (!member && row.page && !narrow()) meta.append(' ', hook(h('span', 'p3-cp-where', GROUPS_COPY.page(row.page)), 'cp-page'));
      const last = plugin ? lend.sets.lastOf(id) : undefined;
      if (last) meta.append(' ', hook(h('span', 'p3-cp-last', last === 'ok' ? SETS_COPY.built : last === 'issues' ? SETS_COPY.problems : SETS_COPY.failed), 'cp-last'));
    }
    r.append(meta);
    const st = e.buildable ? statusTags([id]) : null;
    if (st) r.append(st);
    return r;
  };
  /** The name: a button that focuses the row's family in the preview (focus is not selection). A set in a flat section
   *  focuses by its own key (`own`), which names the same family. */
  const nameButton = (row: GroupRow, label: string, member: boolean, own?: string): HTMLButtonElement => {
    const b = hook(h('button', 'p3-btn p3-btn-ghost p3-cp-name'), 'cp-name');
    b.type = 'button';
    b.dataset.key = `name=${row.key}=${label}`;
    // The row in focus is marked on its own name; a set inside it focuses the same family but is not the row.
    const mine = own ?? (member ? null : row.key);
    if (mine !== null && mine === componentsPage().focus) b.setAttribute('aria-current', 'true');
    b.append(h('span', 'p3-btn-label', label));
    b.onclick = () => {
      const s = componentsPage();
      // Call 15 A: a family opens when it is focused.
      if (own) setComponentsPage({ focus: own });
      else setComponentsPage({ focus: row.key, open: row.family ? new Set([...s.open, row.key]) : s.open });
    };
    return b;
  };

  const familyRow = (catalog: Catalog, row: GroupRow): HTMLElement => {
    const s = componentsPage();
    const open = s.open.has(row.key);
    const r = hook(h('div', 'p3-cp-row p3-cp-family'), 'cp-row');
    r.dataset.row = row.key;
    if (plugin) r.append(box(`row=${row.key}`, boxOfSets(catalog, row.ids, s.sel), GROUPS_COPY.selectAllOf(row.label), () => select(row.ids, row.key)));
    const fold = hook(h('button', 'p3-btn p3-btn-ghost p3-btn-icon p3-cp-fold'), 'cp-fold');
    fold.type = 'button';
    fold.dataset.key = `fold=${row.key}`;
    fold.setAttribute('aria-expanded', String(open));
    fold.setAttribute('aria-label', open ? GROUPS_COPY.close(row.label) : GROUPS_COPY.open(row.label));
    fold.append(glyph('chevr'));
    fold.onclick = () => {
      const o = new Set(componentsPage().open);
      if (o.has(row.key)) o.delete(row.key); else o.add(row.key);
      setComponentsPage({ open: o });
    };
    r.append(fold, nameButton(row, row.label, false));
    const c = costOf(catalog, row.ids);
    const meta = hook(h('span', 'p3-cp-meta'), 'cp-meta');
    meta.append(narrow() ? GROUPS_COPY.sets(row.ids.length) : `${GROUPS_COPY.sets(row.ids.length)} · ${fmt(c.variants + c.components)}`);
    if (row.page && !narrow()) meta.append(' ', hook(h('span', 'p3-cp-where', GROUPS_COPY.page(row.page)), 'cp-page'));
    r.append(meta);
    const st = statusTags(buildableOf(catalog, row.ids));
    if (st) r.append(st);
    return r;
  };

  /** The disclosure line for one settings block: a standard disclosure (`aria-expanded`, `aria-controls`), one job. */
  const optsToggle = (catalog: Catalog, sec: GroupSection, kind: BlockKey, open: boolean): HTMLElement => {
    const b = hook(h('button', 'p3-btn p3-btn-ghost p3-cp-optstoggle'), 'cp-opts-toggle');
    b.type = 'button';
    b.dataset.key = `opts=${kind}`;
    b.setAttribute('aria-expanded', String(open));
    b.setAttribute('aria-controls', optsId(kind));
    b.append(glyph('chevr'), h('span', 'p3-btn-label', SECTION_SETTINGS[kind].title));
    b.onclick = () => {
      const s = componentsPage();
      const o = new Set(s.optsOpen);
      if (o.has(kind)) { o.delete(kind); setComponentsPage({ optsOpen: o }); return; }
      o.add(kind);
      // Opening also focuses the section's first set, unless one of its sets has focus, so the preview shows what the
      // settings change (#2844, small call 2; wireframe v2 on #2905).
      const mine = rowOfFocus(catalog, s.focus);
      const first = sec.rows[0];
      const focus = mine && sec.rows.some((r) => r.key === mine.key) ? s.focus : first.family ? setFocusKey(first.ids[0]) : first.key;
      setComponentsPage({ optsOpen: o, focus });
    };
    const li = hook(h('div', 'p3-cp-optsline'), 'cp-opts-line');
    li.append(b);
    return li;
  };

  const sectionEl = (catalog: Catalog, sec: GroupSection, rows: readonly GroupRow[]): HTMLElement => {
    const el = hook(h('section', 'p3-lsec p3-cp-sec'), 'cp-section');
    el.dataset.kind = sec.kind;
    const head = hook(h('div', 'p3-cp-sec-head'), 'cp-section-head');
    const ids = sec.rows.flatMap((r) => r.ids);
    // Q391 A on #2812: under a search the section's box acts on the rows shown, and reads over them.
    const shown = rows.flatMap((r) => r.ids);
    // #2825: the box and Build all each sit in a cell one title line high, centered on it, so they center on the title's
    // first line as a row's box centers on its name, however the count wraps.
    const line1 = (n: HTMLElement): HTMLElement => { const c = h('span', 'p3-cp-line1'); c.append(n); return c; };
    if (plugin) head.append(line1(box(`sec=${sec.kind}`, boxOfSets(catalog, shown, componentsPage().sel), GROUPS_COPY.selectAll(sec.title), () => select(shown))));
    // The count sits inside the title (TY2 A): at 380 it wraps under the name inside the heading, so the space after the
    // section title stays the level's space-300 rather than the gap to a wrapped count.
    const t = hook(h('h2', 'p3-lsec-title p3-cp-title'), 'cp-section-title');
    t.dataset.name = sec.title;
    t.append(sec.title, ' ', hook(h('span', 'p3-cp-count', GROUPS_COPY.sectionCount(sec.kind, sec.rows.length, ids.length)), 'cp-section-count'));
    head.append(t);
    if (plugin && sec.kind === 'subcomponents') {
      // Call 10 A: Subcomponents' own action, which runs at once and leaves the selection alone.
      const all = buildableOf(catalog, ids);
      const b = hook(h('button', 'p3-btn p3-btn-secondary p3-cp-buildall'), 'cp-build-all');
      b.type = 'button';
      b.dataset.key = 'run-all';
      // A build that is out, any build, makes it busy (owner decision #4 on #1956): focusable, aria-busy, its click
      // refused by the run itself (`runSets`). Its busy label names its place while its own run is out.
      const r = lend.sets.current();
      const at = r?.kind === 'subcomponents' ? positionOf(r) : { at: 1, of: all.length };
      b.append(pendingLabel(GROUPS_COPY.buildAll(all.length), GROUPS_COPY.buildingAll(at.at, at.of)));
      b.disabled = all.length === 0;
      setBusy(b, lend.sets.busy());
      b.onclick = () => { if (!lend.sets.busy()) lend.sets.run('subcomponents', all); };
      head.append(line1(b));
    }
    el.append(head);
    const ul = h('ul', 'p3-cp-rows');
    const s = componentsPage();
    for (const row of rows) {
      if (sec.flat) {
        // Q8 A: the section title stands in for the family row, so each set is a row at the section's edge.
        for (const id of row.ids) {
          const li = hook(h('li', 'p3-cp-li'), 'cp-item');
          li.append(setRow(catalog, id, row, row.family, row.family));
          ul.append(li);
        }
        continue;
      }
      const li = hook(h('li', 'p3-cp-li'), 'cp-item');
      li.append(row.family ? familyRow(catalog, row) : setRow(catalog, row.ids[0], row, false));
      if (row.family && s.open.has(row.key)) {
        const sub = h('ul', 'p3-cp-sub');
        sub.setAttribute('role', 'group');
        sub.setAttribute('aria-label', row.label);
        for (const id of row.ids) { const m = h('li'); m.append(setRow(catalog, id, row, true)); sub.append(m); }
        li.append(sub);
      }
      ul.append(li);
    }
    if (ul.children.length) el.append(ul);
    for (const kind of SECTION_BLOCKS[sec.kind] ?? []) {
      // After the section's sets, never before them (Q9 A), in `SECTION_BLOCKS`' order (#2952): each block's own
      // disclosure (Q7 A), then the block, hidden while closed.
      const set = settingsOf(kind);
      const open = s.optsOpen.has(kind);
      el.append(optsToggle(catalog, sec, kind, open), set);
      set.hidden = !open;
      shownHere.add(kind);
    }
    return el;
  };

  /** #2909 Q2909.4 A: the shared block, first in the list: Density's read-only line and Control shape, mounted once and
   *  moved, not rebuilt, when the list redraws, as the settings blocks are. Its title is the page data's. */
  const SHARED = (DOMAINS.find((d) => d.id === 'components') as PageData).sections.find((x) => x.rows.some((r) => r.keys?.includes('controlShape')))!;
  const shared = hook(h('section', 'p3-lsec p3-cp-sec'), 'cp-shared');
  {
    // A levers section's own head (the title, its description under it), as every page's sections draw theirs (TY2 A).
    const head = hook(h('div', 'p3-lsec-head'), 'cp-section-head');
    const t = hook(h('h2', 'p3-lsec-title p3-cp-title', SHARED.title), 'cp-section-title');
    t.dataset.name = SHARED.title;
    head.append(t, h('p', 'p3-lsec-desc', SHARED_DESC));
    const body = h('div', 'p3-cp-opts');
    const own: (() => void)[] = [];
    mountSharedOptions(body, own, modeLabel);
    cleanups.push(() => { for (const fn of own) fn(); });
    shared.append(head, body);
  }
  /** Under a search the shared block stays only while its words, or a lever's in it (#3093: a key is never drawn),
   *  hold the query. */
  const sharedMatches = (q: string): boolean => !q || (shared.textContent ?? '').toLowerCase().includes(q.toLowerCase())
    || [...shared.querySelectorAll('.p3-lever')].some((n) => saidOf(n).includes(q.toLowerCase()));
  /** #3093: the levers in a settings block a search names, by each lever block's words (`saidOf`). The block is mounted
   *  to be read, as its section's draw mounts it; a block no draw places is dropped at the end of the draw. */
  const matchesIn = (kind: BlockKey, q: string): HTMLElement[] => {
    const t = q.trim().toLowerCase();
    return t ? [...settingsOf(kind).querySelectorAll<HTMLElement>('.p3-lever')].filter((n) => saidOf(n).includes(t)) : [];
  };
  /** Under a search, a block that holds a match shows only its matching levers; with no search, or no match in it,
   *  every lever. Run after each draw, and after a block repaints itself on an edit (it draws its levers anew). */
  const filterBlocks = (): void => {
    const t = searchQuery.trim().toLowerCase();
    for (const { el } of settings.values()) {
      const levers = [...el.querySelectorAll<HTMLElement>('.p3-lever')];
      const any = !!t && levers.some((n) => saidOf(n).includes(t));
      for (const n of levers) { const hide = any && !saidOf(n).includes(t); if (n.hidden !== hide) n.hidden = hide; }
    }
  };

  /** The blocks this draw placed (a search can hide a section's rows, and its blocks with them). */
  const shownHere = new Set<BlockKey>();
  const paintList = (): void => {
    const had = document.activeElement as HTMLElement | null;
    const key = had && root.contains(had) ? had.dataset.key ?? null : null;
    // A control inside the settings block is the same node after the redraw: it gets its focus back as itself.
    const inSettings = had && [...settings.values()].some((x) => x.el.contains(had)) ? had : null;
    const scrollTop = hostEl.scrollTop;
    shownHere.clear();
    const catalog = componentCatalog();
    const q = searchQuery.trim();
    const parts: HTMLElement[] = [];
    if (!catalog.length) {
      parts.push(hook(h('p', 'p3-sub p3-cp-empty', GROUPS_COPY.noCatalog), 'components-no-catalog'));
    } else {
      parts.push(hook(h('p', 'p3-intro', GROUPS_COPY.intro(catalog.length)), 'components-intro'));
      let hits = 0;
      if (sharedMatches(q)) { parts.push(shared); if (q) hits++; }
      // Q2909.17 A: the sections under their tiers, each tier a group named by its caption. The caption is not a heading:
      // the list's three heading levels are its sections, their settings and those settings' levers (TY2 A).
      const empty: string[] = [];
      for (const tier of tiersOf(catalog)) {
        if (!tier.sections.length) { empty.push(tier.title); continue; }
        const group = hook(h('div', 'p3-cp-tier'), 'cp-tier');
        group.dataset.tier = tier.id;
        group.setAttribute('role', 'group');
        const cap = hook(h('p', 'p3-cp-tier-cap', GROUPS_COPY.tier(tier.title, tier.sections.reduce((n, sec) => n + sec.rows.reduce((m, r) => m + r.ids.length, 0), 0))), 'cp-tier-caption');
        cap.id = `p3-cp-tier-${tier.id}`;
        group.setAttribute('aria-labelledby', cap.id);
        group.append(cap);
        for (const sec of tier.sections) {
          const rows = sec.rows.filter((r) => rowMatches(catalog, r, q));
          // #3093: a section whose settings hold a match shows, whether or not one of its sets matches.
          const levers = (SECTION_BLOCKS[sec.kind] ?? []).reduce((n, k) => n + matchesIn(k, q).length, 0);
          hits += rows.length + levers;
          if (rows.length || levers) group.append(sectionEl(catalog, sec, rows));
        }
        if (group.children.length > 1) parts.push(group);
      }
      if (empty.length && !q) parts.push(hook(h('p', 'p3-sub p3-cp-tiers-empty', GROUPS_COPY.tiersEmpty(empty)), 'cp-tiers-empty'));
      if (q && !hits) parts.push(hook(h('p', 'p3-sub p3-cp-empty', GROUPS_COPY.noMatch), 'components-no-match'));
      setSearchHits(q ? hits : null);
      // The web's one line, a hint line as it always was (the Studio's `stateLine`).
      if (!plugin) parts.push(hook(stateLine(PRISM3_HOST === 'figma' ? SETS_COPY.plugin : SETS_COPY.web), 'components-web-line'));
    }
    list.replaceChildren(...parts);
    dropSettings(shownHere);
    filterBlocks();
    if (inSettings?.isConnected) inSettings.focus({ preventScroll: true });
    else if (key) root.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
    if (hostEl.scrollTop !== scrollTop) hostEl.scrollTop = scrollTop;
  };

  /** The action bar (idea 9 A): before, during and after a run. Drawn in place, so a verdict never takes the focus. */
  const paintBar = (): void => {
    if (!bar) return;
    const had = document.activeElement as HTMLElement | null;
    const key = had && bar.contains(had) ? had.dataset.key ?? null : null;
    const catalog = componentCatalog();
    // Review N1 on #2812: the run builds in the list's order, not the order the boxes were ticked in.
    const sel = inListOrder(catalog, componentsPage().sel).filter((id) => entryOf(catalog, id)?.buildable);
    const run = lend.sets.current();
    const last = lend.sets.last();
    const rowEl = h('div', 'p3-cp-bar-row');
    const lines: HTMLElement[] = [];
    const btn = hook(h('button', 'p3-btn p3-btn-primary p3-cp-build'), 'components-build');
    btn.type = 'button';
    btn.dataset.key = 'run-sets';
    // One control in every state (the engine Button's `isPending`, #1957): "Build N sets", and while a run of the
    // selection is out "Building 2 of 4…" in the same cell, so it keeps its width; busy for any build that is out.
    const mine = run?.kind === 'selection' ? run : null;
    const at = mine ? positionOf(mine) : { at: 1, of: sel.length };
    btn.append(pendingLabel(RUN_COPY.runLabel(mine ? mine.ids.length : sel.length), RUN_COPY.building(at.at, at.of)));
    btn.disabled = !mine && sel.length === 0;
    setBusy(btn, lend.sets.busy());
    btn.onclick = () => { if (!lend.sets.busy() && sel.length) lend.sets.run('selection', sel); };
    rowEl.append(btn);
    if (mine) {
      const stop = hook(h('button', 'p3-btn p3-btn-secondary p3-cp-stop'), 'components-stop');
      stop.type = 'button';
      stop.dataset.key = 'stop';
      stop.append(pendingLabel(RUN_COPY.stop, RUN_COPY.stopping));
      setBusy(stop, mine.stopping);
      stop.onclick = () => { if (!mine.stopping) lend.sets.stop(); };
      rowEl.append(stop);
      const cur = currentOf(mine);
      const e = cur ? entryOf(catalog, cur) : undefined;
      if (e && e.members !== null) lines.push(hook(h('p', 'p3-sub p3-cp-sum', RUN_COPY.current(e.name, GROUPS_COPY.members(e.members, e.unit))), 'components-run-line'));
    } else {
      const sum = hook(h('span', 'p3-cp-sum'), 'components-summary');
      if (lend.sets.agentBusy()) sum.textContent = RUN_COPY.agent;
      else if (last && last.run.kind === 'selection' && !run) {
        sum.append(h('b', undefined, last.verdict.headline), ` ${RUN_COPY.justNow}`);
      } else if (sel.length) {
        const c = costOf(catalog, sel);
        sum.append(h('b', undefined, GROUPS_COPY.sets(c.sets)));
        if (c.variants) sum.append(` · ${GROUPS_COPY.members(c.variants, 'variants')}`);
        if (c.components) sum.append(` · ${GROUPS_COPY.members(c.components, 'components')}`);
      } else sum.textContent = RUN_COPY.nothing;
      rowEl.append(sum);
      if (last && !run && !lend.sets.agentBusy()) {
        // Idea 13 A: the run's summary, under the bar, and the way to its one Activity entry.
        if (last.run.ids.length > 1) {
          const ul = hook(h('ul', 'p3-cp-lines'), 'components-run-summary');
          for (const l of last.verdict.lines) ul.append(h('li', 'p3-sub', l));
          lines.push(ul);
        }
        const go = hook(h('button', 'p3-btn p3-btn-ghost p3-cp-show'), 'components-show-activity');
        go.type = 'button';
        go.dataset.key = 'show';
        go.append(h('span', 'p3-btn-label', RUN_COPY.showActivity), glyph('chevr'));
        go.onclick = () => lend.sets.showResult();
        lines.push(go);
      }
      const also = sel.length ? alsoBuilds(catalog, sel) : [];
      if (also.length) lines.push(hook(h('p', 'p3-sub', RUN_COPY.also(also)), 'components-also-builds'));
    }
    lines.push(hook(h('p', 'p3-sub', RUN_COPY.order), 'components-order-hint'));
    bar.replaceChildren(rowEl, ...lines);
    if (key) bar.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
  };

  const paint = (): void => { paintList(); paintBar(); };
  // Call 7 on #2812: a search opens each family one of whose sets matches, so the match is shown. The families stay open
  // once the search is cleared, as one opened by hand would.
  // #3093: and each settings block one of whose levers matches, the same way.
  const onSearch = (): void => {
    const s = componentsPage();
    const add = familiesToOpen(componentCatalog(), searchQuery).filter((k) => !s.open.has(k));
    const blocks = [...new Set(Object.values(SECTION_BLOCKS).flatMap((v) => v ?? []))].filter((k) => !s.optsOpen.has(k) && matchesIn(k, searchQuery).length);
    if (add.length || blocks.length) setComponentsPage({ open: new Set([...s.open, ...add]), optsOpen: new Set([...s.optsOpen, ...blocks]) });
    else paintList();
  };
  // The frame's width tier flips without a remount: the list redraws for the narrow rows.
  let tier = narrow();
  const mo = new MutationObserver(() => { const n = narrow(); if (n !== tier) { tier = n; paintList(); } });
  const f = frame();
  if (f) mo.observe(f, { attributes: true, attributeFilter: ['data-w'] });
  cleanups.push(
    () => mo.disconnect(),
    watchComponentsPage(paint),
    subscribe('host', paint), subscribe('host:components', paint), subscribe('search', onSearch),
    // A block repaints itself on an edit, drawing its levers anew, after this page's own subscribers run: filter after it.
    subscribe('brand', () => queueMicrotask(filterBlocks)), subscribe('mode', () => queueMicrotask(filterBlocks)),
    () => dropSettings(),
    () => { if (searchQuery.trim()) setSearchHits(null); },
  );
  paint();
};
