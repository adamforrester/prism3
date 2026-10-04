/**
 * Layout, the levers panel (UI redesign S10; concept v6's Layout page, V11).
 *
 * WHAT IT DRAWS, from the page's sections in `shell/pages.ts`, each headed and described as the preview section it
 * pairs with (owner decision Q23): the intro, then **Breakpoints** (the list: the first fixed at 0px, each other
 * width a field with its Remove, then Add breakpoint; two to seven, owner decision D13), **Grid** (the base grid
 * columns, then each breakpoint's columns, gutter and margin, each Auto or a value, D12) and **Containers** (the
 * maximum width and the content container, sliders over today's stops, D15). Every lever is shown: Layout is
 * FIRST_CLASS, no Show advanced (Q4, R2). Last, the way on to Components.
 *
 * NOTHING HERE VARIES BY MODE. Every lever is brand-wide and writes the same bytes from any editable mode (Q54). A
 * derived mode is read-only, every control on the page (Q59), under S4a's approved line, once at the top; the preview
 * is still drawn.
 *
 * THE CONTROLS (owner decision D15). The grid columns and each breakpoint's columns, gutter and margin are value
 * pickers (Q65, `ui/value-picker.ts`); a button shows the value the brand holds, even a column count off the offered
 * list (any whole number 4–24 is legal; #2047). Gutter and margin offer only the spacing steps: the engine refuses an
 * off-scale px (#1593). The container widths are sliders over the manifest's range and step.
 *
 * WRITES. Every write goes through `state/layout-input.ts`, which writes what the legacy page wrote, byte for byte,
 * except D13's re-keying: a per-breakpoint setting stays with its breakpoint when names move (#2045), and one on a
 * removed breakpoint is dropped, which the page says in one line.
 *
 * WORDS (owner decision D16). Visible copy says "range", "where each layout starts" and "content container", and
 * "column" only for the grid (D11). The engine's names are unchanged (D17: the studio shows "Maximum width").
 *
 * HOW IT REPAINTS: by store subscription only (plan §5): a control writes and calls `rebuild()`; the panel is
 * redrawn whole, keeping focus on the element that had it. It never names a legacy repaint tier and never imports
 * `main.ts` (`test-shell-imports.ts`).
 */
import { brandState, currentMode, lastError, rebuild, searchQuery, setPage, setSearchHits, subscribe, theme } from '../state/store';
import { isDerived } from '../state/verdict';
import {
  COLUMN_CHOICES, MAX_BREAKPOINTS, MIN_BREAKPOINTS, addBreakpoint, autoGrid, breakpointsOf, editBreakpoint, overrideOf,
  namesFor, removeBreakpoint, setColumnOverride, setColumns, setContainer, setGapOverride, type BreakpointResult, type ContainerKey, type GapField,
} from '../state/layout-input';
import { DOMAINS, LAYOUT_LABELS, pageOfTab, type Host, type PageData, type Section } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { glyph, h, hook } from '../shell/dom';
import { addRowButton, leverBlock, leverOf, slider, sliderReadout, stateLine, textField, tokenLabel, type LeverBlock } from '../ui/lever-kit';
import { noteSectionEdit } from '../preview/follow-edit';
import { valuePicker, type PickerValue, type ValuePickerOpts } from '../ui/value-picker';

const PAGE = DOMAINS.find((d) => d.id === 'layout') as PageData;
/** The host this bundle runs in (the build's define, as Shape reads it), for routing Continue by tab. */
const hostKind = (): Host => (PRISM3_HOST === 'figma' ? 'figma' : 'web');

/** The page's copy, APPROVED by the owner (S10 scope, D11–D17), verbatim. */
export const LAYOUT_COPY = {
  first: 'Always 0px.',
  add: 'Add breakpoint',
  remove: (name: string): string => `Remove ${name}`,
  dropped: (name: string): string => `Removed ${name}: its column, gutter and margin settings went with it.`,
  ...LAYOUT_LABELS,
  auto: (v: string): string => `Auto: ${v}`,
  gridColumns: 'Grid columns',
  next: 'Continue to Components',
  toAuto: 'Return to Auto',   // the value picker's reset, Type's approved words (S6.3)
} as const;
/** Copy this slice needed that the owner has not approved yet: DRAFT, listed in the PR for approval. Tooltips in
 *  D16's plain words (the manifest's own descriptions say "min-width floors" and "reading-measure content column",
 *  which D16 retires from visible copy), the value pickers' one-line hints, and the line at the breakpoint limit. */
export const LAYOUT_DRAFT = {
  breakpointsTip: 'The screen width where each layout starts, smallest first. The first is always 0px. Names follow the count: up to five run sm to 2xl, six or seven run xs to 3xl.',
  columnsTip: 'How many columns the grid has on the widest breakpoints. Smaller breakpoints step up to it: 4, then 8, then this count.',
  maxTip: 'The widest content gets. Below this width, content fills the screen.',
  narrowTip: 'A narrower width for long text, so lines stay a readable length.',
  columnsHint: 'Column counts the grid can use. Any whole number from 4 to 24 works; these are the common ones.',
  gapHint: 'Gutter and margin use the spacing steps, so each stays a spacing token.',
  limit: 'Seven breakpoints at most, xs to 3xl.',
} as const;

/** Something drawn that search can hide and a refusal can mark. */
type Item = { el: HTMLElement; said: string; key: string; block?: LeverBlock };

/** Mount the Layout levers into `host`. Subscriptions are released through `cleanups`. */
export const mountLayoutLevers = (host: HTMLElement, cleanups: (() => void)[]): void => {
  const root = hook(h('div', 'p3-levers-body p3-llevers'), 'layout-levers');
  host.replaceChildren(root);
  let items: Item[] = [];
  /** The key the last edit wrote, so an engine refusal marks the lever that caused it. */
  let lastEdited: string | null = null;
  /** The picker that is open, by its key, or null. One at a time, under its row. */
  let openPick: string | null = null;
  let focusPick = false;
  let pickFocus: (() => void) | null = null;
  /** The breakpoints whose settings the last breakpoint change dropped (D13), shown until the next edit. */
  let dropped: readonly string[] = [];

  const edit = (key: string, write: () => void): void => {
    lastEdited = key;
    dropped = [];
    write();
    noteSectionEdit();   // QA-B9: the edit, and only an edit, reveals its preview section
    rebuild();
  };
  const bpEdit = (write: () => BreakpointResult): void => {
    lastEdited = 'layout.breakpoints';
    // The names may move, so an open picker would now sit under another breakpoint: close it.
    openPick = null;
    const r = write();
    dropped = r.dropped;
    noteSectionEdit();
    rebuild();
  };

  /** A derived mode's one line, at the top of the levers (Q59): S4a's approved line. */
  const derivedLine = (): HTMLElement | null =>
    isDerived(currentMode) ? hook(stateLine(`${modeLabel(currentMode)} is auto-derived — read-only. Edit Light or Dark and it follows.`), 'layout-derived') : null;

  const sectionShell = (s: Section, i: number): HTMLElement => {
    const el = hook(h('section', 'p3-lsec'), 'lever-section');
    el.id = `p3-lsec-layout-${i}`;
    const head = h('div', 'p3-lsec-head');
    const title = h('h3', 'p3-lsec-title', s.title);
    title.id = `${el.id}-t`;
    el.setAttribute('aria-labelledby', title.id);
    head.append(title);
    if (s.desc) head.append(h('p', 'p3-lsec-desc', s.desc));
    el.append(head);
    return el;
  };

  /** A button that opens the value picker under its row, one open at a time (Q65). */
  const pickButton = (key: string, id: string, role: string, name: string, now: string, set: boolean): HTMLButtonElement => {
    const btn = hook(h('button', 'p3-btn p3-btn-page p3-pick'), role);
    btn.type = 'button';
    btn.id = id;
    btn.dataset.key = key;
    if (set) btn.dataset.set = 'true';
    btn.setAttribute('aria-expanded', String(openPick === key));
    btn.setAttribute('aria-label', `${name}: ${now}. Pick a value`);
    btn.append(h('span', 'p3-btn-label', now), glyph('chev'));
    btn.onclick = () => {
      const opening = openPick !== key;
      openPick = opening ? key : null;
      focusPick = opening;
      render();
    };
    return btn;
  };
  const pickerFor = (key: string, btnId: string, o: Omit<ValuePickerOpts, 'modeLabel' | 'onClose'>): HTMLElement | null => {
    if (openPick !== key || isDerived(currentMode)) return null;
    const pk = valuePicker({ ...o, modeLabel: modeLabel(currentMode), onClose: () => { openPick = null; render(); root.querySelector<HTMLElement>(`#${btnId}`)?.focus(); } });
    pickFocus = pk.focusCurrent;
    return pk.el;
  };
  /** The primary ramp, for the pickers' samples (brand content: the samples carry `data-content`). */
  const tint = (): string => {
    const ramp = theme.palettes.find((p) => p.palette === 'primary') ?? theme.palettes[0];
    return ramp?.steps[Math.min(ramp.steps.length - 1, 8)]?.hex ?? '#808080';
  };
  /** A column count's sample: that many bars. */
  const colSample = (n: number) => (el: HTMLElement): void => {
    const row = h('span', 'p3-lsamp-cols');
    for (let i = 0; i < n; i++) { const b = h('i', 'p3-lsamp-bar'); b.style.background = tint(); row.append(b); }
    el.append(row);
  };
  /** A width's sample: a bar that wide (capped at 96px, the widest spacing step). */
  const gapSample = (px: number) => (el: HTMLElement): void => {
    const b = h('i', 'p3-lsamp-gap');
    b.style.width = `${Math.min(px, 96)}px`;
    b.style.background = tint();
    el.append(b);
  };
  const colValues = (cur: number | undefined): PickerValue[] => {
    const vs = [...COLUMN_CHOICES];
    // #2047: a count off the list is shown as it is, in its place in the list, never as another value.
    if (cur !== undefined && !vs.includes(cur)) vs.push(cur);
    return vs.sort((a, b) => a - b).map((v) => ({ v, label: String(v), sample: colSample(v) }));
  };
  const gapValues = (): PickerValue[] => theme.dims.space.map((s) => ({ v: s.px, label: `${s.px}px · space.${s.key}`, sample: gapSample(s.px) }));

  // ── Breakpoints ────────────────────────────────────────────────────────────────────────────────
  const breakpoints = (s: Section, i: number): { el: HTMLElement; items: Item[] } => {
    const el = sectionShell(s, i);
    const b = leverBlock('layout.breakpoints', { desc: LAYOUT_DRAFT.breakpointsTip, group: true });
    const bps = breakpointsOf();
    const names = namesFor(bps);
    const list = hook(h('div', 'p3-bplist'), 'bp-list');
    bps.forEach((px, j) => {
      const row = hook(h('div', 'p3-bprow'), 'bp-row');
      row.dataset.bp = names[j];
      const id = `p3-bp-${j}`;
      const t = textField(id, 'bp-input', { label: `${names[j]}, px`,
        // A value that is not a width (empty, not a number, below 0) is put back rather than written: the legacy
        // clean-up would drop the breakpoint, and with it its settings.
        onCommit: (v, f) => { const n = Number(v.trim()); if (String(px) === v.trim()) return; if (!v.trim() || !Number.isFinite(n) || n < 0) { f.value = String(px); return; } bpEdit(() => editBreakpoint(j, n)); } });
      t.el.inputMode = 'numeric';
      t.set(String(px));
      const unit = h('span', 'p3-bp-unit', 'px');
      row.append(tokenLabel(`breakpoint.${names[j]}`, names[j], id), t.el, unit);
      if (j === 0) {
        // D13: the first breakpoint is fixed at 0px.
        t.el.disabled = true;
        t.el.dataset.fixed = 'true';
        row.append(hook(h('span', 'p3-bp-note', LAYOUT_COPY.first), 'bp-first-note'));
      } else if (bps.length > MIN_BREAKPOINTS) {
        const rm = hook(h('button', 'p3-btn p3-btn-page'), 'bp-remove');
        rm.type = 'button';
        rm.dataset.bp = names[j];
        rm.append(h('span', 'p3-btn-label', LAYOUT_COPY.remove(names[j])));
        rm.onclick = () => bpEdit(() => removeBreakpoint(j));
        row.append(rm);
      }
      list.append(row);
    });
    b.ctl.append(list);
    if (bps.length < MAX_BREAKPOINTS) b.ctl.append(addRowButton('bp-add', LAYOUT_COPY.add, () => bpEdit(() => addBreakpoint())));
    else b.ctl.append(hook(subHint(LAYOUT_DRAFT.limit), 'bp-limit'));
    if (dropped.length) b.setState(hook(stateLine(dropped.map(LAYOUT_COPY.dropped).join(' ')), 'bp-dropped'));
    el.append(b.el);
    return { el, items: [{ el: b.el, said: b.said, key: 'layout.breakpoints', block: b }] };
  };
  const subHint = (t: string): HTMLElement => h('p', 'p3-sub', t);

  // ── Grid ───────────────────────────────────────────────────────────────────────────────────────
  const grid = (s: Section, i: number): { el: HTMLElement; items: Item[] } => {
    const el = sectionShell(s, i);
    const out: Item[] = [];
    // The base grid columns (D15): a value picker that shows the value the brand holds, on the list or not (#2047).
    {
      const L = leverOf('layout.columns')!;
      const cur = Number(brandState.layout?.columns ?? theme.layout.baseColumns);
      const id = 'p3-layout-columns';
      const b = leverBlock('layout.columns', { label: LAYOUT_COPY.gridColumns, desc: LAYOUT_DRAFT.columnsTip, forId: id });
      const btn = pickButton('columns', id, 'layout-columns-pick', LAYOUT_COPY.gridColumns, String(cur), brandState.layout?.columns !== undefined);
      btn.dataset.value = String(cur);
      b.ctl.append(btn);
      const pk = pickerFor('columns', id, { name: LAYOUT_COPY.gridColumns, hint: LAYOUT_DRAFT.columnsHint, values: colValues(cur), current: cur,
        onPick: (v) => edit('layout.columns', () => setColumns(v)) });
      if (pk) b.ctl.append(pk);
      el.append(b.el);
      out.push({ el: b.el, said: `${b.said} ${L.label}`.toLowerCase(), key: 'layout.columns', block: b });
    }
    // Each breakpoint's columns, gutter and margin (D12): Auto or a value, the Auto naming what it resolves to. A
    // group per breakpoint, named by it; the rows are labeled first, their token under (QA-B2). Schema inputs, not
    // manifest levers, so no lever block: the section's description says what they do.
    {
      const auto = autoGrid();
      const box = hook(h('div', 'p3-lgrid'), 'grid-breakpoints');
      for (const g of theme.layout.grid) {
        const bpPx = theme.layout.breakpoints.find((x) => x.name === g.bp)?.px ?? 0;
        const a = auto.find((x) => x.bp === g.bp);
        const grp = hook(h('fieldset', 'p3-lgrid-bp'), 'grid-bp');
        grp.dataset.bp = g.bp;
        const lg = h('legend', 'p3-lgrid-name');
        lg.append(h('b', undefined, g.bp), h('span', 'p3-fill-tok', `${bpPx}px`));
        grp.append(lg);
        const said: string[] = [g.bp];
        const row = (field: 'columnOverrides' | GapField, label: string, token: string, role: string, autoTxt: string, values: PickerValue[], write: (v: number | undefined) => void): void => {
          const ov = overrideOf(field, g.bp);
          const key = `${field}:${g.bp}`;
          const id = `p3-lgrid-${field}-${g.bp}`;
          const unit = field === 'columnOverrides' ? '' : 'px';
          const now = ov === undefined ? LAYOUT_COPY.auto(autoTxt) : `${ov}${unit}`;
          const r = h('div', 'p3-lrow');
          const name = `${g.bp} ${label.toLowerCase()}`;
          const btn = pickButton(key, id, role, name, now, ov !== undefined);
          btn.dataset.bp = g.bp;
          r.append(tokenLabel(token, label, id), btn);
          grp.append(r);
          said.push(label, token);
          const resolved = field === 'columnOverrides' ? g.columns : field === 'gutterOverrides' ? g.gutterPx : g.marginPx;
          const pk = pickerFor(key, id, {
            name, hint: field === 'columnOverrides' ? LAYOUT_DRAFT.columnsHint : LAYOUT_DRAFT.gapHint,
            values, current: ov ?? resolved, reset: { label: LAYOUT_COPY.toAuto, enabled: ov !== undefined },
            onPick: (v) => edit(key, () => write(v)), onReset: () => edit(key, () => write(undefined)),
          });
          if (pk) grp.append(pk);
        };
        row('columnOverrides', LAYOUT_COPY.columns, `grid.${g.bp}.columns`, 'bp-cols-pick', String(a?.columns ?? g.columns), colValues(overrideOf('columnOverrides', g.bp)), (v) => setColumnOverride(g.bp, v));
        row('gutterOverrides', LAYOUT_COPY.gutter, `grid.${g.bp}.gutter`, 'bp-gutter-pick', `${a?.gutterPx ?? g.gutterPx}px`, gapValues(), (v) => setGapOverride('gutterOverrides', g.bp, v));
        row('marginOverrides', LAYOUT_COPY.margin, `grid.${g.bp}.margin`, 'bp-margin-pick', `${a?.marginPx ?? g.marginPx}px`, gapValues(), (v) => setGapOverride('marginOverrides', g.bp, v));
        box.append(grp);
        out.push({ el: grp, said: said.join(' ').toLowerCase(), key: `grid:${g.bp}` });
      }
      el.append(box);
    }
    return { el, items: out };
  };

  // ── Containers ─────────────────────────────────────────────────────────────────────────────────
  const containers = (s: Section, i: number): { el: HTMLElement; items: Item[] } => {
    const el = sectionShell(s, i);
    const out: Item[] = [];
    for (const [key, label, tip] of [['containerMax', LAYOUT_COPY.max, LAYOUT_DRAFT.maxTip], ['containerNarrow', LAYOUT_COPY.narrow, LAYOUT_DRAFT.narrowTip]] as const) {
      const k = `layout.${key}`;
      const L = leverOf(k)!;
      const b = leverBlock(k, { label, desc: tip, forId: `p3-${k.replace(/\./g, '-').replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}` });
      const cur = Number(brandState.layout?.[key as ContainerKey] ?? theme.layout[key as ContainerKey]);
      const sl = slider(k, `container-${key === 'containerMax' ? 'max' : 'narrow'}-range`, label, (v) => {
        b.setReadout(sliderReadout(L, v));
        edit(k, () => setContainer(key, v));
      });
      sl.el.id = `p3-${k.replace(/\./g, '-').replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
      sl.set(cur);
      b.setReadout(sliderReadout(L, cur));
      b.ctl.append(sl.el);
      el.append(b.el);
      out.push({ el: b.el, said: b.said, key: k, block: b });
    }
    return { el, items: out };
  };

  const BUILDERS: Record<string, (s: Section, i: number) => { el: HTMLElement; items: Item[] }> = {
    Breakpoints: breakpoints, Grid: grid, Containers: containers,
  };

  const render = (): void => {
    const had = document.activeElement as HTMLElement | null;
    const focusKey = had && root.contains(had) ? had.getAttribute('data-p3') : null;
    const focusIndex = focusKey ? [...root.querySelectorAll(`[data-p3="${focusKey}"]`)].indexOf(had!) : -1;
    const scrollTop = host.scrollTop;
    items = [];
    pickFocus = null;
    const derived = derivedLine();
    const parts: HTMLElement[] = [h('p', 'p3-intro', PAGE.intro), ...(derived ? [derived] : [])];
    PAGE.sections.forEach((s, i) => { const x = BUILDERS[s.title]?.(s, i); if (x) { parts.push(x.el); items.push(...x.items); } });
    // T8: Continue opens the Components TAB on either host (the web's Buttons page until S8; the plugin's Components
    // page), routed by the tab through `pageOfTab` (S7's), never by a hard-coded legacy page key.
    const next = hook(h('button', 'p3-btn p3-btn-page p3-next'), 'layout-continue');
    next.type = 'button';
    next.append(h('span', 'p3-btn-label', LAYOUT_COPY.next), glyph('chevr'));
    next.onclick = () => setPage(pageOfTab('components', hostKind()));
    const nr = h('div', 'p3-nextrow');
    nr.append(next);
    parts.push(nr);
    root.replaceChildren(...parts);
    // Q59: a derived mode is read-only, every control on the page. The info buttons only show a description.
    if (derived) for (const n of root.querySelectorAll<HTMLButtonElement | HTMLSelectElement | HTMLInputElement>('.p3-lsec :is(button, select, input):not(.p3-info)')) n.disabled = true;
    for (const it of items) it.block?.setRefused(!!lastError && !!lastEdited && it.key === lastEdited);
    filter();
    if (focusPick && pickFocus) { focusPick = false; (pickFocus as () => void)(); }
    else if (focusKey) {
      const same = [...root.querySelectorAll<HTMLElement>(`[data-p3="${focusKey}"]`)];
      (same[Math.max(0, focusIndex)] ?? same[0])?.focus({ preventScroll: true });
    }
    if (host.scrollTop !== scrollTop) host.scrollTop = scrollTop;
  };

  /** Search (Q3): hide what does not match, report the count. */
  const filter = (): void => {
    const q = searchQuery.trim().toLowerCase();
    for (const it of items) it.el.hidden = !!q && !it.said.includes(q);
    for (const s of root.querySelectorAll<HTMLElement>('.p3-lsec')) s.hidden = !!q && !s.querySelector(':is(.p3-lever, .p3-lgrid-bp):not([hidden])');
    for (const n of root.querySelectorAll<HTMLElement>('.p3-intro, .p3-nextrow')) n.hidden = !!q;
    setSearchHits(q ? items.filter((it) => !it.el.hidden).length : null);
  };

  cleanups.push(subscribe('brand', render), subscribe('mode', () => { openPick = null; render(); }), subscribe('search', filter));
  cleanups.push(() => { if (searchQuery.trim()) setSearchHits(null); });
  render();
};
