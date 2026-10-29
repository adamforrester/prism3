/**
 * Components, the levers panel (UI redesign S8.2; redesigned by #2700, the owner's approved wireframe, every call A).
 *
 * WHAT IT DRAWS: the list of component sets and the shown family's settings under its row (the focused family's preview
 * is the preview pane's, `preview/components.ts`).
 *   · Its sections (see SECTIONS WITH SETTINGS below for the first three): Buttons, Fields, Tag, Other components and
 *     Subcomponents (note 4, call 11 A; #2905). Outside the sections with settings, each row is a family (several sets on one Figma page,
 *     closed until one of its sets is selected or the row is focused, call 15 A) or a set of its own, alphabetical
 *     (note 2), labeled by page or by component name (call 14 A), with its members and the page it lands on (idea 12).
 *   · In the plugin, THE ADD QUEUE (#3129, owner decisions Q832 A, Q833 A, Q3129.4–6 A): a box on every set the file
 *     could add (buildable, not in the file), and a three-state box on each family and section over those sets (note 5,
 *     call 8 A), and one on the page under the intro, "Add every set not in this file", with how many of them are
 *     queued. A box queues its sets in the file (`add-queue`), and a queued set's tag reads To add; Update file builds
 *     the queue. A set the file holds has no box, and its cell stays empty so the names align; a family or section with
 *     nothing to add has none either. In a section with settings, a set's box takes the empty fold cell. Under a search
 *     the section and page boxes act on the rows shown (Q391 A). The boxes wait for the host's full read of the file.
 *     There is no Build bar: building is Update file's (Q2909.5 A).
 *   · On the web the list is read-only: no boxes, no queue (Q3129.12 A), and one line saying building needs the plugin.
 *
 * A NAME FOCUSES, A BOX QUEUES: focusing does not queue, and the preview pane shows the focused family. At the narrow
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
 * queue write or a verdict never resets it.
 *
 * SEARCH (the Studio's search, Q3) filters the rows: a family stays while any of its sets matches (#2700's edge state).
 * It also reaches the settings (#3093): a lever in a settings block matches by its label, its description or its key
 * (`leverBlock`'s words, `saidOf`), so its section shows even when none of its sets matches, the search opens its block
 * as it opens a family (call 7), and the block shows only the levers that match. Each matching lever is a hit.
 *
 * A DERIVED MODE holds nothing here: the list and its boxes edit no brand setting, so queuing stays available, and the
 * frame does not hold this page (#2700). The Button options, which do
 * edit, hold themselves (`domains/button-options.ts`), and repaint themselves on `brand` and `mode`.
 *
 * HOW IT REPAINTS: by store subscription only (plan §5): `host` and `host:components` for the statuses and the queue,
 * `search` for the filter, the page state (`state/components-page.ts`) for open and focus, and the frame's width tier. It never imports `main.ts` (`test-shell-imports.ts`), and
 * no component definition: the catalog is `state/component-catalog.ts`'s (`check:ignore` fails by name if a definition
 * reaches the web bundle).
 */
import { searchQuery, setSearchHits, subscribe } from '../state/store';
import { componentCatalog, type Catalog } from '../state/component-catalog';
import { componentsPage, setComponentsPage, watchComponentsPage } from '../state/components-page';
import {
  addableOf, boxOfSets, buildableOf, costOf, entryOf, familiesToOpen, fmt, GROUPS_COPY, tiersOf, rowMatches, rowOfFocus,
  SECTION_BLOCKS, setFocusKey, toggleSets, type BlockKey, type BoxState, type GroupRow, type GroupSection,
} from '../state/component-groups';
import { glyph, h, hook } from '../shell/dom';
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
  // #3129 (Q832 A): the plugin's boxes queue sets in the file; Update file builds them (Q2909.5 A), so no host draws a
  // Build bar. The web has no file, so no boxes (Q3129.12 A).
  const plugin = PRISM3_HOST === 'figma';
  const root = hook(h('div', 'p3-levers-body p3-cp'), 'components-levers');
  const list = hook(h('div', 'p3-cp-list'), 'components-list');
  root.append(list);
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
  /** #3129: the sets the file holds, once the host's full read has landed (else no box is drawn), and the queue. */
  const present = (): readonly string[] | null => (plugin ? lend.sets.present() : null);
  const queued = (): ReadonlySet<string> => new Set(lend.sets.queue() ?? []);
  /** A box's click: one queue write for the sets it could add (`toggleSets`). */
  const toggle = (ids: readonly string[], open?: string): void => {
    const p = present();
    if (!p) return;
    const w = toggleSets(componentCatalog(), ids, queued(), p);
    if (!w.ids.length) return;
    lend.sets.queueSets(w.ids, w.on);
    // Call 15 A: a family opens when one of its sets is queued from its box.
    if (open && w.on && !componentsPage().open.has(open)) setComponentsPage({ open: new Set([...componentsPage().open, open]) });
  };
  /** A box over `ids` when the file could add any of them, else the empty cell that keeps the names aligned (Q3129.6 A). */
  const boxOrCell = (key: string, ids: readonly string[], label: string, open: string | undefined, empty: 'p3-cp-nobox' | 'p3-cp-fold-space'): HTMLElement => {
    const p = present()!;
    const catalog = componentCatalog();
    return addableOf(catalog, ids, p).length ? box(key, boxOfSets(catalog, ids, queued(), p), label, () => toggle(ids, open)) : h('span', empty);
  };

  /** #2909 Q2909.8 A: a set's statuses in this file, as tags (plugin only; the web has no file). A family shows what its
   *  sets show, each status once, in the statuses' own order. */
  const STATUS_ORDER: readonly SetStatus[] = ['due', 'hand', 'unchecked', 'checking', 'queued', 'new', 'current'];
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
   *  edge (#2905, Q8 A), which focuses as itself, since its family has no row. `edge`: any row in a section with
   *  settings, whose box takes the fold cell (#3129). */
  const setRow = (catalog: Catalog, id: string, row: GroupRow, member: boolean, flat = false, edge = flat): HTMLElement => {
    const e = entryOf(catalog, id)!;
    const r = hook(h('div', member ? 'p3-cp-row p3-cp-member' : 'p3-cp-row'), member ? 'cp-member' : 'cp-row');
    r.dataset.set = id;
    if (!member) r.dataset.row = row.key;
    if (!e.buildable) r.dataset.off = 'true';
    const label = member ? e.name : row.label;
    // #3129: the box sits in the row's leading cell; in a section with settings it takes the empty fold cell (flat rows
    // have no leading cell).
    const boxes = !!present();
    if (boxes && !edge) r.append(boxOrCell(`set=${id}`, [id], GROUPS_COPY.addSet(label), row.family ? row.key : undefined, 'p3-cp-nobox'));
    if (boxes && edge) r.append(boxOrCell(`set=${id}`, [id], GROUPS_COPY.addSet(label), undefined, 'p3-cp-fold-space'));
    else r.append(h('span', 'p3-cp-fold-space'));
    r.append(nameButton(row, label, member, flat ? setFocusKey(id) : undefined));
    const meta = hook(h('span', 'p3-cp-meta'), 'cp-meta');
    if (!e.buildable) meta.append(hook(h('span', 'p3-cp-reason', SETS_COPY.cannot(e.reason ? e.reason.replace(/^\S+:\s*/, '') : SETS_COPY.noProjection)), 'cp-reason'));
    else if (e.members !== null) {
      meta.append(narrow() ? fmt(e.members) : GROUPS_COPY.members(e.members, e.unit));
      if (!member && row.page && !narrow()) meta.append(' ', hook(h('span', 'p3-cp-where', GROUPS_COPY.page(row.page)), 'cp-page'));
      const last = present() ? lend.sets.lastOf(id) : undefined;
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
    if (present()) r.append(boxOrCell(`row=${row.key}`, row.ids, GROUPS_COPY.addAllOf(row.label), row.key, 'p3-cp-nobox'));
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
    // #2825: the box sits in a cell one title line high, centered on it, so it centers on the title's first line as a
    // row's box centers on its name, however the count wraps. With nothing to add the cell stays, empty (Q3129.6 A).
    const line1 = (n: HTMLElement): HTMLElement => { const c = h('span', 'p3-cp-line1'); c.append(n); return c; };
    if (present()) head.append(line1(boxOrCell(`sec=${sec.kind}`, shown, GROUPS_COPY.addAll(sec.title), undefined, 'p3-cp-nobox')));
    // The count sits inside the title (TY2 A): at 380 it wraps under the name inside the heading, so the space after the
    // section title stays the level's space-300 rather than the gap to a wrapped count.
    const t = hook(h('h2', 'p3-lsec-title p3-cp-title'), 'cp-section-title');
    t.dataset.name = sec.title;
    t.append(sec.title, ' ', hook(h('span', 'p3-cp-count', GROUPS_COPY.sectionCount(sec.kind, sec.rows.length, ids.length)), 'cp-section-count'));
    head.append(t);
    el.append(head);
    const ul = h('ul', 'p3-cp-rows');
    const s = componentsPage();
    for (const row of rows) {
      if (sec.flat) {
        // Q8 A: the section title stands in for the family row, so each set is a row at the section's edge.
        for (const id of row.ids) {
          const li = hook(h('li', 'p3-cp-li'), 'cp-item');
          li.append(setRow(catalog, id, row, row.family, row.family, true));
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
      parts.push(hook(h('p', 'p3-intro', present() ? GROUPS_COPY.introPlugin(catalog.length) : GROUPS_COPY.intro(catalog.length)), 'components-intro'));
      // #3129 Q3129.5 A: the page's own box, under the intro, over the sets the rows shown could add.
      const p = present();
      if (p) {
        const shownIds = tiersOf(catalog).flatMap((tier) => tier.sections).flatMap((sec) => sec.rows.filter((r) => rowMatches(catalog, r, q)).flatMap((r) => r.ids));
        const can = addableOf(catalog, shownIds, p);
        if (can.length) {
          const q2 = queued();
          const st = boxOfSets(catalog, shownIds, q2, p);
          const b = box('all', st, '', () => toggle(shownIds));
          b.removeAttribute('aria-label');
          b.classList.add('p3-cp-all');
          hook(b, 'cp-add-every');
          b.append(h('span', 'p3-btn-label', GROUPS_COPY.addEvery), hook(h('span', 'p3-cp-count', GROUPS_COPY.addCount(can.filter((id) => q2.has(id)).length, can.length)), 'cp-add-count'));
          parts.push(b);
        }
      }
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
      // The host's one line, a hint line as it always was (the Studio's `stateLine`).
      parts.push(hook(stateLine(plugin ? SETS_COPY.plugin : SETS_COPY.web), 'components-web-line'));
    }
    list.replaceChildren(...parts);
    dropSettings(shownHere);
    filterBlocks();
    if (inSettings?.isConnected) inSettings.focus({ preventScroll: true });
    else if (key) root.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
    if (hostEl.scrollTop !== scrollTop) hostEl.scrollTop = scrollTop;
  };

  const paint = (): void => { paintList(); };
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
