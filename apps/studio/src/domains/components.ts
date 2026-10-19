/**
 * Components, the levers panel (UI redesign S8.2; redesigned by #2700, the owner's approved wireframe, every call A).
 *
 * WHAT IT DRAWS: the list of component sets and the one action bar (call 9 A: the list and the action where the choosing
 * happens; the focused family's preview and options are the preview pane's, `preview/components.ts`).
 *   · Two sections, Components and Subcomponents (note 4, call 11 A), each row a family (several sets on one Figma page,
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
 * tier (one column) the preview pane has nowhere to sit beside the list, so the focused family opens inline under its
 * row (`familyDetail`), and a row's meta drops to its count.
 *
 * SEARCH (the Studio's search, Q3) filters the rows: a family stays while any of its sets matches (#2700's edge state).
 *
 * A DERIVED MODE holds nothing here: the list and the bar edit no brand setting, so building stays available, as it was
 * when the build bar sat in the preview pane, and the frame does not hold this page (#2700). The Button options, which do
 * edit, hold themselves (`domains/button-options.ts`).
 *
 * HOW IT REPAINTS: by store subscription only (plan §5): `host` and `host:components` for the bar and the last-build
 * lines, `search` for the filter, the page state (`state/components-page.ts`) for selection, open and focus, `brand`
 * and `mode` for the inline block, and the frame's width tier. It never imports `main.ts` (`test-shell-imports.ts`), and
 * no component definition: the catalog is `state/component-catalog.ts`'s (`check:ignore` fails by name if a definition
 * reaches the web bundle).
 */
import { searchQuery, setSearchHits, subscribe } from '../state/store';
import { componentCatalog, type Catalog } from '../state/component-catalog';
import { componentsPage, setComponentsPage, watchComponentsPage } from '../state/components-page';
import {
  alsoBuilds, boxOfSets, buildableOf, costOf, entryOf, familiesToOpen, fmt, groupsOf, GROUPS_COPY, inListOrder, rowMatches, toggleSets,
  type BoxState, type GroupRow, type GroupSection,
} from '../state/component-groups';
import { currentOf, positionOf, RUN_COPY } from '../state/build-queue';
import { glyph, h, hook, pendingLabel, setBusy } from '../shell/dom';
import { stateLine } from '../ui/lever-kit';
import { SETS_COPY } from '../preview/sections/component-sets';
import { familyDetail, focusedRow } from '../preview/components';
import type { PageLends } from '../preview/brand';

/** Mount the Components list into `hostEl`. Subscriptions are released through `cleanups`. */
export const mountComponentsLevers = (hostEl: HTMLElement, cleanups: (() => void)[], lend: PageLends): void => {
  const plugin = PRISM3_HOST === 'figma';
  const root = hook(h('div', 'p3-levers-body p3-cp'), 'components-levers');
  const list = hook(h('div', 'p3-cp-list'), 'components-list');
  const bar = plugin ? hook(h('div', 'p3-cp-bar'), 'components-bar') : null;
  root.append(list);
  if (bar) root.append(bar);
  hostEl.replaceChildren(root);
  /** The block opened under the focused row at the narrow tier, and the subscriptions its controls hold. */
  let inlineOwn: (() => void)[] = [];
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

  /** One set row inside a family, or a set on its own (`single` is its row). */
  const setRow = (catalog: Catalog, id: string, row: GroupRow, member: boolean): HTMLElement => {
    const e = entryOf(catalog, id)!;
    const r = hook(h('div', member ? 'p3-cp-row p3-cp-member' : 'p3-cp-row'), member ? 'cp-member' : 'cp-row');
    r.dataset.set = id;
    if (!member) r.dataset.row = row.key;
    if (!e.buildable) r.dataset.off = 'true';
    const label = member ? e.name : row.label;
    if (plugin && e.buildable) r.append(box(`set=${id}`, componentsPage().sel.has(id) ? 'on' : 'off', GROUPS_COPY.selectSet(label), () => select([id], row.family ? row.key : undefined)));
    else if (plugin) r.append(h('span', 'p3-cp-nobox'));
    r.append(h('span', 'p3-cp-fold-space'));
    r.append(nameButton(row, label, member));
    const meta = hook(h('span', 'p3-cp-meta'), 'cp-meta');
    if (!e.buildable) meta.append(hook(h('span', 'p3-cp-reason', SETS_COPY.cannot(e.reason ? e.reason.replace(/^\S+:\s*/, '') : SETS_COPY.noProjection)), 'cp-reason'));
    else if (e.members !== null) {
      meta.append(narrow() ? fmt(e.members) : GROUPS_COPY.members(e.members, e.unit));
      if (!member && row.page && !narrow()) meta.append(' ', hook(h('span', 'p3-cp-where', GROUPS_COPY.page(row.page)), 'cp-page'));
      const last = plugin ? lend.sets.lastOf(id) : undefined;
      if (last) meta.append(' ', hook(h('span', 'p3-cp-last', last === 'ok' ? SETS_COPY.built : last === 'issues' ? SETS_COPY.problems : SETS_COPY.failed), 'cp-last'));
    }
    r.append(meta);
    return r;
  };
  /** The name: a button that focuses the row's family in the preview (focus is not selection). */
  const nameButton = (row: GroupRow, label: string, member: boolean): HTMLButtonElement => {
    const b = hook(h('button', 'p3-btn p3-btn-ghost p3-cp-name'), 'cp-name');
    b.type = 'button';
    b.dataset.key = `name=${row.key}=${label}`;
    // The row in focus is marked on its own name; a set inside it focuses the same family but is not the row.
    if (!member && componentsPage().focus === row.key) b.setAttribute('aria-current', 'true');
    b.append(h('span', 'p3-btn-label', label));
    b.onclick = () => {
      const s = componentsPage();
      // Call 15 A: a family opens when it is focused.
      setComponentsPage({ focus: row.key, open: row.family ? new Set([...s.open, row.key]) : s.open });
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
    return r;
  };

  const sectionEl = (catalog: Catalog, sec: GroupSection, rows: readonly GroupRow[]): HTMLElement => {
    const el = hook(h('section', 'p3-lsec p3-cp-sec'), 'cp-section');
    el.dataset.kind = sec.kind;
    const head = hook(h('div', 'p3-cp-sec-head'), 'cp-section-head');
    const ids = sec.rows.flatMap((r) => r.ids);
    // Q391 A on #2812: under a search the section's box acts on the rows shown, and reads over them.
    const shown = rows.flatMap((r) => r.ids);
    if (plugin) head.append(box(`sec=${sec.kind}`, boxOfSets(catalog, shown, componentsPage().sel), GROUPS_COPY.selectAll(sec.title), () => select(shown)));
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
      head.append(b);
    }
    el.append(head);
    const ul = h('ul', 'p3-cp-rows');
    const s = componentsPage();
    for (const row of rows) {
      const li = hook(h('li', 'p3-cp-li'), 'cp-item');
      li.append(row.family ? familyRow(catalog, row) : setRow(catalog, row.ids[0], row, false));
      if (row.family && s.open.has(row.key)) {
        const sub = h('ul', 'p3-cp-sub');
        sub.setAttribute('role', 'group');
        sub.setAttribute('aria-label', row.label);
        for (const id of row.ids) { const m = h('li'); m.append(setRow(catalog, id, row, true)); sub.append(m); }
        li.append(sub);
      }
      if (narrow() && focusedRow(catalog, s.focus)?.key === row.key && s.focus === row.key) {
        const inl = h('div', 'p3-cp-inline');
        inl.append(familyDetail(row, { catalog, inline: true, plugin, lend, cleanups: inlineOwn }));
        li.append(inl);
      }
      ul.append(li);
    }
    el.append(ul);
    return el;
  };

  const paintList = (): void => {
    const had = document.activeElement as HTMLElement | null;
    const key = had && root.contains(had) ? had.dataset.key ?? null : null;
    const scrollTop = hostEl.scrollTop;
    for (const f of inlineOwn) f();
    inlineOwn = [];
    const catalog = componentCatalog();
    const q = searchQuery.trim();
    const parts: HTMLElement[] = [];
    if (!catalog.length) {
      parts.push(hook(h('p', 'p3-sub p3-cp-empty', GROUPS_COPY.noCatalog), 'components-no-catalog'));
    } else {
      parts.push(hook(h('p', 'p3-intro', GROUPS_COPY.intro(catalog.length)), 'components-intro'));
      let hits = 0;
      for (const sec of groupsOf(catalog)) {
        const rows = sec.rows.filter((r) => rowMatches(catalog, r, q));
        hits += rows.length;
        if (rows.length) parts.push(sectionEl(catalog, sec, rows));
      }
      if (q && !hits) parts.push(hook(h('p', 'p3-sub p3-cp-empty', GROUPS_COPY.noMatch), 'components-no-match'));
      setSearchHits(q ? hits : null);
      // The web's one line, a hint line as it always was (the Studio's `stateLine`).
      if (!plugin) parts.push(hook(stateLine(SETS_COPY.web), 'components-web-line'));
    }
    list.replaceChildren(...parts);
    if (key) root.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
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
  const onSearch = (): void => {
    const add = familiesToOpen(componentCatalog(), searchQuery).filter((k) => !componentsPage().open.has(k));
    if (add.length) setComponentsPage({ open: new Set([...componentsPage().open, ...add]) });
    else paintList();
  };
  // The frame's width tier flips without a remount: the list redraws for the narrow rows and the inline block.
  let tier = narrow();
  const mo = new MutationObserver(() => { const n = narrow(); if (n !== tier) { tier = n; paintList(); } });
  const f = frame();
  if (f) mo.observe(f, { attributes: true, attributeFilter: ['data-w'] });
  cleanups.push(
    () => mo.disconnect(),
    watchComponentsPage(paint),
    subscribe('host', paint), subscribe('host:components', paint), subscribe('search', onSearch),
    subscribe('brand', () => { if (narrow()) paintList(); }), subscribe('mode', () => { if (narrow()) paintList(); }),
    () => { for (const fn of inlineOwn) fn(); },
    () => { if (searchQuery.trim()) setSearchHits(null); },
  );
  paint();
};
