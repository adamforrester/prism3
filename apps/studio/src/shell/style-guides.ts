/**
 * The Build style guides page (UI redesign S11.2, plugin only), opened from the Figma menu's "Build style guides…".
 * Built to the approved mockup (`sg-mockup`, owner decisions P1–P12 and H4–H11, 2026-10-05): what to draw on the left,
 * the run and the options on the right at full width; at 380 one column, the run's table list first and Draw pinned
 * to the bottom.
 *
 * WHAT IT READS AND WRITES, and how. The page's model (the tree, the selection, what Draw sends) is
 * `state/style-guides.ts`, pure. What the host said (the catalog, the panel's run table by table, the run's verdict) is
 * the host session, read through `lend.read`; every write goes through the lend too: ask for the catalog, draw, cancel,
 * Set up file, close, show the result in Activity. So this file names no legacy repaint tier (`test-shell-imports.ts`).
 * It subscribes to the host topics it reads, on mount, and drops them on unmount.
 *
 * PROGRESS (P1, variant 1): the panel's run is shown here, table by table, and recorded in Activity. While this page
 * is open, Activity does not open by itself for the style guide (the frame tells the drawer so); its row, the bar
 * row and the dot still say what happened.
 *
 * Copy: every string here is the mockup's, approved by the owner (P12, H4–H10), or shipped. Shipped UI text: US
 * English and `docs/voice-standard.md`. Classes take the `p3-` scope; state is in ARIA attributes.
 */
import { subscribe } from '../state/store';
import type { ActionState, SgRunTable } from '../state/host-session';
import type { StyleGuideCatalog, StyleGuideKind, StyleGuideOptions } from '../../../plugin/src/messages';
import {
  treesOf, defaultOpen, boxOf, countsOf, summaryText, drawLabel, kindsOf, hasLengths, byTitles, drawOptions, DEFAULT_OPTIONS,
  keepSelection, type SgNode, type PageOptions,
} from '../state/style-guides';
import { glyph, h, hook, type P3Class } from './dom';

/** What `main.ts` lends the page: the host's facts, and the writes. */
export type StyleGuidesLend = {
  readonly read: () => {
    readonly catalog: { readonly catalog: StyleGuideCatalog; readonly error: string | null } | null;
    /** The panel's last run, table by table. */
    readonly run: { readonly tables: readonly SgRunTable[]; readonly stopped: { done: number; total: number } | null } | null;
    /** The panel's own style-guide slot: pending while its run is out, else its last verdict. */
    readonly state: ActionState;
    /** A style guide is running, the panel's or an agent's: Draw waits (owner decision #4 on #1956). */
    readonly busy: boolean;
    /** The panel's run's reading, "done of total", while it runs. */
    readonly progress: { readonly done: number; readonly total: number } | null;
    /** Set up file is running. */
    readonly setupBusy: boolean;
    /** The writes that change what the catalog holds (Apply Theme's and Set up file's slots): when one lands, the page
     *  asks for the catalog again. */
    readonly writes: readonly unknown[];
  };
  readonly request: () => void;
  readonly draw: (o: StyleGuideOptions) => void;
  readonly cancel: () => void;
  readonly setUp: () => void;
  readonly close: () => void;
  /** Open Activity on the style guide's result (the verdict pill). */
  readonly showResult: () => void;
};

// ── the approved words (P12, H4–H10) ──────────────────────────────────────────────────────────────
const HEADING = 'Build style guides';
const INTRO = 'Draws a table for each group of tokens in this file. A rerun updates each table in place.';
const NOTE = 'Needs the pages and cells Set up file adds.';
const SET_UP = 'Set up file';
/** A catalog the host could not read (owner decision SG4). */
const READ_ERROR = "Couldn't read this file's variables. Close the page and open it again.";
const KIND_LABEL: Record<StyleGuideKind, string> = { color: 'Color', dimension: 'Spacing and size', font: 'Font variables', text: 'Text styles' };
const KINDS: readonly StyleGuideKind[] = ['color', 'dimension', 'font', 'text'];
const STATUS: Record<SgRunTable['status'] | 'stopped', string> = { waiting: 'Waiting', drawing: 'Drawing', done: 'Done', failed: 'Not drawn', stopped: 'Not drawn' };

/** The page's own state, kept for the session (not persisted): the selection survives leaving and coming back. */
const S = {
  /** The catalog the selection was made against, so a new one maps it across by table key. */
  catalog: null as StyleGuideCatalog | null,
  sel: new Set<number>(),
  view: null as string | null,
  open: new Set<string>(),
  titles: '',
  opt: { ...DEFAULT_OPTIONS } as PageOptions,
  /** How many tables the page's own run asked for, until the main thread lists them (0 when none is running). */
  pending: 0,
};
/** The run line (approved, P12, and #1784's): the table being drawn, counted from 1. */
const runLine = (at: number, n: number): string => `Drawing table ${at} of ${n}…`;

/** Mount the page into `root`. Returns nothing; its subscriptions go into `cleanups`. */
export const mountStyleGuides = (root: HTMLElement, lend: StyleGuidesLend, narrow: () => boolean, cleanups: (() => void)[]): void => {
  const page = hook(h('div', 'p3-sg'), 'style-guides');

  /** Adopt the host's catalog: the first one selects every table; a later one keeps the selection by key. */
  const adopt = (): StyleGuideCatalog | null => {
    const c = lend.read().catalog?.catalog ?? null;
    if (c && c !== S.catalog) {
      S.sel = S.catalog ? keepSelection(S.catalog, S.sel, c) : new Set(c.tables.map((_, i) => i));
      if (!S.catalog || (S.view && !c.collections.some((x) => x.id === S.view))) { S.view = S.view && c.collections.some((x) => x.id === S.view) ? S.view : null; S.open = defaultOpen(treesOf(c), S.view === null); }
      S.catalog = c;
    }
    return S.catalog;
  };

  // Ask again when a write that changes the file lands, and when this page's own run ends.
  let seen = lend.read();
  const refresh = (): void => {
    const r = lend.read();
    const landed = r.writes.some((w, i) => w !== seen.writes[i] && w !== 'pending') || (seen.state === 'pending' && r.state !== 'pending');
    seen = r;
    if (landed) lend.request();
  };
  // THE ONE LIVE REGION (review of #2171): a node of its own, outside the content `paint` replaces, that holds the run
  // line alone ("Drawing table 3 of 32…") and has its text changed in place, so a screen reader hears each table and
  // nothing else. Empty between runs.
  const live = hook(h('p', 'p3-sr'), 'sg-live');
  live.setAttribute('aria-live', 'polite');
  /** Where focus goes after the next paint: Cancel, once a run this page started is drawn (review of #2171). */
  let focusCancel = false;
  const start = (o: StyleGuideOptions, tables: number): void => {
    S.pending = tables;
    focusCancel = true;
    lend.draw(o);
  };
  const paint = (): void => {
    refresh();
    const cat = adopt();
    const r = lend.read();
    const inPage = document.activeElement instanceof HTMLElement && page.contains(document.activeElement);
    const f = inPage ? keyOf(document.activeElement as HTMLElement) : null;
    const caret = document.activeElement instanceof HTMLTextAreaElement ? document.activeElement.selectionStart : null;
    page.replaceChildren(...compose(cat));
    const line = r.state === 'pending' && (r.run || S.pending) ? runLine(r.progress ? Math.min(r.progress.done + 1, r.progress.total) : 1, r.run?.tables.length || S.pending) : '';
    if (live.textContent !== line) live.textContent = line;
    if (r.state !== 'pending') S.pending = 0;
    const cancel = page.querySelector<HTMLElement>('[data-key="cancel"]');
    if (focusCancel && cancel) { focusCancel = false; cancel.focus({ preventScroll: true }); return; }
    if (r.state !== 'pending') focusCancel = false;
    if (f) {
      const back = page.querySelector<HTMLElement>(f);
      if (back && !(back as HTMLButtonElement).disabled) {
        back.focus({ preventScroll: true });
        if (back instanceof HTMLTextAreaElement && caret !== null) back.setSelectionRange(caret, caret);
        return;
      }
      // What had focus is gone (Cancel, once the run ends; a Draw it again that redrew): to Draw, or the run line.
      const draw = page.querySelector<HTMLButtonElement>('[data-key="draw"]');
      (draw && !draw.disabled ? draw : page.querySelector<HTMLElement>('[data-key="run-line"]') ?? draw)?.focus({ preventScroll: true });
    }
  };

  // ── pieces ──────────────────────────────────────────────────────────────────────────────────
  const btn = (cls: P3Class, role: string, label: string, onClick: () => void): HTMLButtonElement => {
    const b = hook(h('button', cls), role);
    b.type = 'button';
    b.append(h('span', 'p3-btn-label', label));
    b.onclick = onClick;
    return b;
  };
  /** A checkbox in the chrome's pattern (a button with `role="checkbox"`), mixed included. */
  const box = (role: string, key: string, state: 'on' | 'mixed' | 'off', disabled: boolean, label: Node[], onToggle: () => void): HTMLButtonElement => {
    const b = hook(h('button', 'p3-btn p3-btn-page p3-check p3-sg-check'), role);
    b.type = 'button';
    b.dataset.key = key;
    b.setAttribute('role', 'checkbox');
    b.setAttribute('aria-checked', state === 'on' ? 'true' : state === 'mixed' ? 'mixed' : 'false');
    if (disabled) b.setAttribute('aria-disabled', 'true');
    const bx = h('span', 'p3-check-box');
    bx.setAttribute('aria-hidden', 'true');
    bx.append(glyph(state === 'mixed' ? 'dash' : 'check'));
    b.append(bx, ...label);
    b.onclick = () => { if (!disabled) onToggle(); };
    return b;
  };
  /** The switch (SG5 A, concept v6's track and knob): a button with `role="switch"`, so its focus ring is its own
   *  outline, on the chrome's focus color (FR1 A), where the ring audit reads it. */
  const sw = (key: keyof PageOptions, label: string): HTMLElement => {
    const b = hook(h('button', 'p3-sg-switch'), `sg-opt-${kebab(String(key))}`);
    b.type = 'button';
    b.setAttribute('role', 'switch');
    b.setAttribute('aria-label', label);
    b.dataset.key = String(key);
    b.setAttribute('aria-checked', String(S.opt[key] === true));
    b.onclick = () => { (S.opt as Record<string, unknown>)[key] = !(S.opt[key] === true); paint(); };
    const track = h('span', 'p3-sg-track');
    track.setAttribute('aria-hidden', 'true');
    track.append(h('span', 'p3-sg-knob'));
    b.append(track);
    return b;
  };
  const select = (role: string, label: string, opts: readonly (readonly [string, string])[], cur: string, onChange: (v: string) => void, disabled = false): HTMLElement => {
    const wrap = h('div', 'p3-selwrap');
    const s = hook(h('select', 'p3-select'), role);
    s.setAttribute('aria-label', label);
    s.dataset.key = role;
    for (const [v, l] of opts) { const o = h('option', undefined, l); o.value = v; s.append(o); }
    s.value = cur;
    s.disabled = disabled;
    s.onchange = () => onChange(s.value);
    wrap.append(s, glyph('chev'));
    return wrap;
  };
  const seg = (key: keyof PageOptions, opts: readonly (readonly [string, string])[], label: string): HTMLElement => {
    const g = hook(h('div', 'p3-seg p3-choice'), `sg-opt-${kebab(String(key))}`);
    g.setAttribute('role', 'radiogroup');
    g.setAttribute('aria-label', label);
    const btns = opts.map(([v, l]) => {
      const b = hook(h('button', 'p3-seg-tab', l), `sg-opt-${kebab(String(key))}-${v}`);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.dataset.key = `${String(key)}=${v}`;
      const on = S.opt[key] === v;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
      b.onclick = () => { (S.opt as Record<string, unknown>)[key] = v; paint(); };
      return b;
    });
    g.addEventListener('keydown', (e) => {
      const i = btns.indexOf(e.target as HTMLButtonElement);
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (i < 0 || !step) return;
      e.preventDefault();
      btns[(i + step + btns.length) % btns.length].click();
    });
    g.append(...btns);
    return g;
  };
  const lever = (label: string, ctl: HTMLElement, hint = '', wide = false): HTMLElement => {
    const el = h('div', wide ? 'p3-sg-lever p3-sg-lever-wide' : 'p3-sg-lever');
    el.append(h('span', 'p3-sg-lever-name', label), ctl);
    if (hint) el.append(h('p', 'p3-sub p3-sg-hint', hint));
    return el;
  };

  // ── the header ──────────────────────────────────────────────────────────────────────────────
  const header = (setUp: boolean): HTMLElement => {
    const head = hook(h('header', 'p3-sg-head'), 'sg-head');
    const row = h('div', 'p3-sg-hrow');
    const h1 = hook(h('h1', 'p3-sg-title', HEADING), 'sg-heading');
    const close = hook(h('button', 'p3-btn p3-btn-ghost p3-sg-close'), 'sg-close');
    close.type = 'button';
    close.dataset.key = 'close';
    close.append(glyph('x'), h('span', 'p3-btn-label', 'Close'));
    close.onclick = lend.close;
    row.append(h1, close);
    head.append(row, h('p', 'p3-sg-intro', INTRO));
    if (setUp) {
      const n = hook(h('p', 'p3-sg-note'), 'sg-note');
      n.append(glyph('info'), h('span', undefined, NOTE));
      head.append(n);
    } else {
      // P8: the note becomes a warning with a Set up file button, and Draw is off.
      const n = hook(h('div', 'p3-sg-note p3-sg-warn'), 'sg-setup-warning');
      n.id = 'p3-sg-setup-note';
      const busy = lend.read().setupBusy;
      const b = btn('p3-btn p3-btn-page p3-sg-setup', 'sg-setup', SET_UP, () => { if (!lend.read().setupBusy) lend.setUp(); });
      b.dataset.key = 'setup';
      if (busy) { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-busy', 'true'); }
      n.append(glyph('warn'), h('span', 'p3-sg-warn-text', NOTE), b);
      head.append(n);
    }
    // The host could not read the file (owner decision SG4, 2026-10-05): the approved words, never the host's message.
    if (lend.read().catalog?.error) head.append(hook(h('p', 'p3-sub p3-sg-error', READ_ERROR), 'sg-read-error'));
    return head;
  };

  // ── what to draw ────────────────────────────────────────────────────────────────────────────
  const selection = (cat: StyleGuideCatalog | null, busy: boolean): HTMLElement => {
    const sec = hook(h('section', 'p3-sg-sec'), 'sg-what');
    sec.setAttribute('aria-labelledby', 'p3-sg-what-h');
    const h2 = h('h2', 'p3-sg-sec-title', 'What to draw');
    h2.id = 'p3-sg-what-h';
    sec.append(h2);
    const body = h('fieldset', 'p3-sg-plain');
    body.disabled = busy;
    const trees = cat ? treesOf(cat) : [];
    const inView = (i: number): boolean => S.view === null || cat!.collections[i].id === S.view;
    const viewTables = [...new Set(trees.filter((_, i) => inView(i)).flatMap((t) => t.tables))].sort((a, b) => a - b);

    // Collection and Mode (P4 A: every mode, the select fixed).
    const selrow = h('div', 'p3-sg-selrow');
    const colField = h('label', 'p3-sg-field');
    colField.append(h('span', 'p3-sg-field-name', 'Collection'), select('sg-collection', 'Collection',
      [['', 'Every collection'], ...(cat?.collections ?? []).map((c) => [c.id, c.name] as const)], S.view ?? '', (v) => {
        S.view = v || null;
        S.open = defaultOpen(trees.filter((_, i) => S.view === null || cat!.collections[i].id === S.view), S.view === null);
        paint();
      }));
    const modeField = h('label', 'p3-sg-field');
    modeField.append(h('span', 'p3-sg-field-name', 'Mode'), select('sg-mode', 'Mode', [['', 'Every mode']], '', () => {}, true));
    selrow.append(colField, modeField);
    body.append(selrow);

    // The kind boxes (P2 A): shortcuts over the tree.
    const kinds = hook(h('fieldset', 'p3-sg-kinds'), 'sg-kinds');
    kinds.append(h('legend', 'p3-sg-field-name', 'Kinds'));
    const chips = h('div', 'p3-sg-chips');
    for (const k of KINDS) {
      const ts = viewTables.filter((t) => cat!.tables[t].kind === k);
      const n = cat ? cat.collections.filter((_, i) => inView(i)).flatMap((c) => c.items).filter((it) => it.table >= 0 && cat.tables[it.table].kind === k).length : 0;
      const st = boxOf(ts, S.sel);
      chips.append(box(`sg-kind-${k}`, `kind=${k}`, st, ts.length === 0, [h('span', undefined, KIND_LABEL[k]), h('span', 'p3-sg-n', String(n))], () => {
        if (st === 'on') for (const t of ts) S.sel.delete(t); else for (const t of ts) S.sel.add(t);
        S.titles = '';
        paint();
      }));
    }
    kinds.append(chips);
    body.append(kinds);

    // The tree.
    const bar = h('div', 'p3-sg-treebar');
    const any = viewTables.some((t) => S.sel.has(t));
    bar.append(h('span', 'p3-sub p3-sg-grow', S.view === null ? 'Open a collection to pick its groups.' : 'Groups and variables in this collection.'),
      btn('p3-btn p3-btn-page p3-sg-all', 'sg-select-all', any ? 'Deselect all' : 'Select all', () => {
        for (const t of viewTables) if (any) S.sel.delete(t); else S.sel.add(t);
        S.titles = '';
        paint();
      }));
    bar.lastElementChild!.setAttribute('data-key', 'all');
    body.append(bar);
    const ul = hook(h('ul', 'p3-sg-tree'), 'sg-tree');
    ul.setAttribute('aria-label', 'Variables and text styles');
    trees.forEach((t, i) => { if (inView(i)) ul.append(row(t, 0)); });
    body.append(ul);

    // Draw by table title (H8).
    const det = hook(h('details', 'p3-sg-titles'), 'sg-titles');
    if (S.titles) det.open = true;
    const sum = hook(h('summary', 'p3-sg-titles-sum'), 'sg-titles-summary');
    sum.append(glyph('chevr'), h('span', undefined, 'Draw by table title'));
    const ta = hook(h('textarea', 'p3-text-input p3-sg-textarea'), 'sg-titles-input');
    ta.rows = 2; ta.spellcheck = false; ta.placeholder = 'Every table';
    ta.dataset.key = 'titles';
    ta.value = S.titles;
    ta.setAttribute('aria-label', 'Table titles, one per line');
    ta.setAttribute('aria-describedby', 'p3-sg-titles-h p3-sg-titles-e');
    ta.oninput = () => {
      S.titles = ta.value;
      if (cat) {
        const { tables } = byTitles(cat, ta.value, viewTables);
        const named = ta.value.trim().length > 0;
        for (const t of viewTables) S.sel.delete(t);
        for (const t of named ? tables : viewTables) S.sel.add(t);
      }
      paint();
    };
    const hint = h('p', 'p3-sub', 'One title per line. Empty draws every table.');
    hint.id = 'p3-sg-titles-h';
    const unknown = cat ? byTitles(cat, S.titles, viewTables).unknown : [];
    const err = hook(h('p', 'p3-sg-err', unknown.length ? `No table is titled ${unknown.map((n) => `“${n}”`).join(', ')}.` : ''), 'sg-titles-error');
    err.id = 'p3-sg-titles-e';
    const tb = h('div', 'p3-sg-titles-body');
    tb.append(ta, hint, err);
    det.append(sum, tb);
    body.append(det);
    sec.append(body);
    return sec;
  };

  /** One tree row: a group, with its fold and box, or a variable. */
  const row = (n: SgNode, depth: number): HTMLElement => {
    const li = h('li', 'p3-sg-li');
    const r = hook(h('div', 'p3-sg-row'), n.item ? 'sg-leaf' : 'sg-group');
    r.dataset.depth = String(Math.min(depth, 8));
    r.dataset.id = n.id;
    const later = n.drawable === 0;
    if (later) r.dataset.later = 'true';
    const open = S.open.has(n.id);
    if (!n.item && n.kids.length) {
      const tw = hook(h('button', 'p3-btn p3-btn-ghost p3-btn-icon p3-sg-fold'), 'sg-fold');
      tw.type = 'button';
      tw.dataset.key = `fold=${n.id}`;
      tw.setAttribute('aria-expanded', String(open));
      tw.setAttribute('aria-label', `${open ? 'Collapse' : 'Expand'} ${n.label}`);
      tw.append(glyph('chevr'));
      tw.onclick = () => { if (S.open.has(n.id)) S.open.delete(n.id); else S.open.add(n.id); paint(); };
      r.append(tw);
    } else r.append(h('span', 'p3-sg-fold-space'));
    const st = boxOf(n.tables, S.sel);
    const on = n.item ? (n.item.table >= 0 && S.sel.has(n.item.table) ? 1 : 0) : 0;
    const meta = h('span', 'p3-sg-meta');
    if (n.item) {
      if (n.item.value) {
        if (/^#[0-9A-F]{6}/i.test(n.item.value)) {
          const chip = h('span', 'p3-sg-swatch');
          chip.setAttribute('aria-hidden', 'true');
          const fill = h('span');
          fill.setAttribute('data-content', '');
          fill.style.background = cssColorOf(n.item.value);
          chip.append(fill);
          meta.append(chip);
        }
        meta.append(h('span', 'p3-sg-mono', n.item.value));
      }
    } else {
      // A group's count: its variables, or "62 of 245" while part of it is selected (the mockup's call 16).
      const sel = countSelected(n, S.sel);
      meta.append(later ? String(n.leaves) : sel === n.drawable ? String(n.drawable) : `${sel} of ${n.drawable}`);
    }
    const nameNodes: Node[] = [h('span', 'p3-sg-name', n.label)];
    if (later) nameNodes.push(hook(h('span', 'p3-sg-tag', 'Later phase'), 'sg-later'));
    nameNodes.push(meta);
    if (n.box || (n.item && later)) {
      // A box: at or above the table level (P3 B). A later-phase row's box is off and cannot be checked (P5 A).
      r.append(box('sg-box', `box=${n.id}`, later ? 'off' : st, later, nameNodes, () => {
        if (st === 'on') for (const t of n.tables) S.sel.delete(t); else for (const t of n.tables) S.sel.add(t);
        S.titles = '';
        paint();
      }));
    } else {
      const lab = h('span', 'p3-sg-label');
      lab.append(...nameNodes);
      r.append(lab);
      void on;
    }
    li.append(r);
    if (!n.item && open && n.kids.length) {
      const ul = h('ul', 'p3-sg-sub');
      ul.setAttribute('role', 'group');
      for (const k of n.kids) ul.append(row(k, depth + 1));
      li.append(ul);
    }
    return li;
  };

  // ── the run: summary, Draw, the table list ─────────────────────────────────────────────────
  const runbar = (cat: StyleGuideCatalog | null, setUp: boolean): HTMLElement => {
    const r = lend.read();
    const bar = hook(h('div', 'p3-sg-runbar'), 'sg-runbar');
    const c = cat ? countsOf(cat, S.sel) : { tables: 0, variables: 0, textStyles: 0 };
    const verdict = r.state && r.state !== 'pending' && r.run ? r.state : null;
    if (verdict) {
      const pill = hook(h('button', verdict.ok ? 'p3-pill' : 'p3-pill p3-pill-bad'), 'sg-verdict');
      pill.type = 'button';
      pill.dataset.key = 'verdict';
      pill.textContent = verdict.headline;
      pill.onclick = lend.showResult;
      const s = h('span', 'p3-sg-sum');
      s.append(pill);
      bar.append(s);
    } else {
      const t = summaryText(c);
      const s = hook(h('span', 'p3-sg-sum'), 'sg-summary');
      if (t) { s.append(h('b', undefined, t.lead)); if (t.rest) s.append(` · ${t.rest}`); }
      else s.textContent = 'Nothing selected.';
      bar.append(s);
    }
    const d = hook(h('button', 'p3-btn p3-btn-primary p3-sg-draw'), 'sg-draw');
    d.type = 'button';
    d.dataset.key = 'draw';
    d.textContent = drawLabel(c.tables);
    d.disabled = c.tables === 0 || !setUp || r.busy || !cat;
    if (!setUp) d.setAttribute('aria-describedby', 'p3-sg-setup-note');
    d.onclick = () => {
      if (!cat || d.disabled) return;
      start(drawOptions(cat, S.sel, S.opt), S.sel.size);
    };
    bar.append(d);
    return bar;
  };

  const progress = (): HTMLElement | null => {
    const r = lend.read();
    const drawing = r.state === 'pending';
    // Before the main thread lists the run's tables, the page's own run is already under way: its line and Cancel.
    const run = r.run ?? (drawing && S.pending ? { tables: [], stopped: null } : null);
    if (!run) return null;
    const wrap = hook(h('div', 'p3-sg-prog'), 'sg-progress');
    const n = run.tables.length || S.pending;
    const state = (t: SgRunTable): SgRunTable['status'] | 'stopped' => (!drawing && run.stopped && t.status === 'waiting' ? 'stopped' : t.status);
    if (drawing) {
      const at = r.progress ? Math.min(r.progress.done + 1, r.progress.total) : 1;
      const head = h('div', 'p3-sg-runhead');
      const t = hook(h('span', 'p3-sg-runline', runLine(at, n)), 'sg-run-line');
      t.tabIndex = -1;
      t.dataset.key = 'run-line';
      head.append(t, btn('p3-btn p3-btn-page p3-sg-cancel', 'sg-cancel', 'Cancel', lend.cancel));
      head.lastElementChild!.setAttribute('data-key', 'cancel');
      const bar = h('progress', 'p3-op-prog') as HTMLProgressElement;
      bar.max = n; bar.value = r.progress?.done ?? 0;
      bar.setAttribute('aria-hidden', 'true');
      wrap.append(head, bar, h('p', 'p3-sub', 'You can leave this page. The run goes on, and Activity keeps the result.'));
    } else if (run.stopped) {
      wrap.append(hook(h('p', 'p3-sg-summary', `Stopped after table ${run.stopped.done} of ${run.stopped.total}. The tables already drawn stay`), 'sg-stopped'));
    } else if (r.state && typeof r.state === 'object') {
      wrap.append(hook(h('p', 'p3-sg-summary', r.state.summary), 'sg-run-summary'));
    }
    // Once the run is over, a table that was not drawn comes first, so it is in view (the mockup's call 14).
    const order = run.tables.map((t, i) => ({ t, i }));
    if (!drawing) order.sort((a, b) => Number(state(b.t) === 'failed') - Number(state(a.t) === 'failed'));
    const ul = hook(h('ul', 'p3-sg-tlist'), 'sg-tables');
    ul.setAttribute('aria-label', 'Tables');
    for (const { t, i } of order) {
      const s = state(t);
      const li = hook(h('li', 'p3-sg-trow'), 'sg-table');
      li.dataset.status = s;
      li.dataset.index = String(i);
      const icon = s === 'done' ? glyph('check') : s === 'failed' ? glyph('error') : s === 'drawing' ? h('span', 'p3-spin', '…') : h('span', 'p3-sg-wait');
      icon.setAttribute('aria-hidden', 'true');
      const nm = h('span', 'p3-sg-tname');
      nm.append(h('b', undefined, t.title), ` · ${t.page}`);
      li.append(icon, nm, hook(h('span', 'p3-sg-tstatus', STATUS[s]), 'sg-table-status'));
      if (s === 'failed') {
        const why = h('span', 'p3-sg-why');
        why.append(hook(h('span', 'p3-sg-reason', t.reason ?? ''), 'sg-table-reason'));
        const again = btn('p3-btn p3-btn-page p3-sg-again', 'sg-again', 'Draw it again', () => {
          const cat = S.catalog;
          const ix = cat ? cat.tables.findIndex((x) => x.key === t.key) : -1;
          if (!cat || ix < 0 || lend.read().busy) return;
          // The mockup's retry: the title box names the table, so the tree shows what is drawn (P6).
          S.titles = cat.tables[ix].title;
          S.sel = new Set([ix]);
          start(drawOptions(cat, S.sel, S.opt), 1);
        });
        again.dataset.key = `again=${t.key}`;
        if (lend.read().busy) again.disabled = true;
        why.append(again);
        li.append(why);
      }
      ul.append(li);
    }
    wrap.append(ul);
    return wrap;
  };

  // ── the options (H4–H9), grouped by kind and shown only for the kinds selected ────────────────
  const options = (cat: StyleGuideCatalog | null, busy: boolean): HTMLElement => {
    const sec = hook(h('section', 'p3-sg-sec'), 'sg-options');
    sec.setAttribute('aria-labelledby', 'p3-sg-opt-h');
    const h2 = h('h2', 'p3-sg-sec-title', 'Options');
    h2.id = 'p3-sg-opt-h';
    const body = h('fieldset', 'p3-sg-plain');
    body.disabled = busy;
    const k = cat ? kindsOf(cat, S.sel) : new Set<StyleGuideKind>();
    const grp = (role: string, title: string, levers: HTMLElement[]): HTMLElement => {
      const g = hook(h('div', 'p3-sg-ogroup'), role);
      g.append(h('h3', 'p3-sg-ogroup-title', title), ...levers);
      return g;
    };
    body.append(grp('sg-group-all', 'All tables', [
      lever('Table header', seg('header', [['dark', 'Dark'], ['light', 'Light']], 'Table header'), 'The header row’s fill.'),
      lever('Aliases', sw('aliases', 'Aliases'), 'Show the variable each value aliases, as a chip beside it.'),
      lever('Description', sw('description', 'Description'), 'Adds each variable’s description to its row.'),
      lever('Name cell', sw('nameCell', 'Name cell'), 'Adds a name you can edit to each row, such as “Text Primary”. A rerun keeps your edits.'),
      ...(hasLengths(k) ? [lever('REM', sw('rem', 'REM'), 'Shows each length in REM too, in its own cell, at a 16px base.')] : []),
    ]));
    if (k.has('color')) body.append(grp('sg-group-color', 'Color', [
      lever('Color value', select('sg-opt-value-format', 'Color value', [['hex', 'Hex'], ['rgba', 'RGB-A'], ['hsl', 'HSL'], ['hsb', 'HSB']], S.opt.valueFormat, (v) => { S.opt.valueFormat = v as PageOptions['valueFormat']; }),
        'How each value cell prints the color. A translucent hex adds its alpha as a percentage.', true),
      lever('Color sample', select('sg-opt-color-sample', 'Color sample', [['auto', 'From each token’s role'], ['default', 'Generic'], ['text', 'Text'], ['border', 'Border'], ['icon', 'Icon'], ['transparency', 'Transparency']], S.opt.colorSample, (v) => { S.opt.colorSample = v as PageOptions['colorSample']; }),
        'By default a text role draws “Aa”, a border role an outline, an icon role a diamond, and a translucent value a checkerboard.', true),
    ]));
    if (k.has('dimension')) body.append(grp('sg-group-dimension', 'Spacing and size', [
      lever('Dimension display', seg('dimensionDisplay', [['filled', 'Filled bar'], ['line', 'Bracket']], 'Dimension display'), 'One style for every dimension row, drawn at its value. A radius draws a rounded corner either way.'),
    ]));
    if (k.has('font')) body.append(grp('sg-group-font', 'Font variables', [
      lever('Font sample', select('sg-opt-font-sample', 'Font sample', [['auto', 'From each variable’s kind'], ['generic', 'Generic'], ['family', 'Family'], ['size', 'Size'], ['weight', 'Weight'], ['letterSpacing', 'Letter spacing'], ['lineHeight', 'Line height']], S.opt.fontSample, (v) => { S.opt.fontSample = v as PageOptions['fontSample']; }),
        '“Abc 123” with one property bound to the variable. By default each variable binds the property it is for.', true),
    ]));
    if (k.has('text')) body.append(grp('sg-group-text', 'Text styles', [
      lever('Paragraph spacing', sw('paragraphSpacing', 'Paragraph spacing')),
      lever('Text decoration', sw('textDecoration', 'Text decoration')),
    ]));
    sec.append(h2, body);
    return sec;
  };

  const compose = (cat: StyleGuideCatalog | null): HTMLElement[] => {
    const r = lend.read();
    const setUp = cat?.setUp ?? true;
    const busy = r.busy;
    const prog = progress();
    if (narrow()) {
      const parts: HTMLElement[] = [header(setUp)];
      if (prog) { const s = hook(h('section', 'p3-sg-sec p3-sg-progsec'), 'sg-run'); s.setAttribute('aria-label', 'Progress'); s.append(prog); parts.push(s); }
      const cols = h('div', 'p3-sg-cols');
      cols.append(selection(cat, busy), options(cat, busy));
      const act = hook(h('div', 'p3-sg-actbar'), 'sg-actbar');
      act.append(runbar(cat, setUp));
      parts.push(cols, act);
      return parts;
    }
    const cols = h('div', 'p3-sg-cols');
    const right = h('div', 'p3-sg-right');
    const run = hook(h('section', 'p3-sg-sec p3-sg-runsec'), 'sg-run');
    run.setAttribute('aria-label', 'Draw');
    run.append(runbar(cat, setUp));
    if (prog) run.append(prog);
    right.append(run, options(cat, busy));
    cols.append(selection(cat, busy), right);
    return [header(setUp), cols];
  };

  root.append(page, live);
  lend.request();
  paint();
  for (const t of ['host', 'host:styleguide', 'host:sgpage', 'host:progress', 'host:filesetup'] as const) cleanups.push(subscribe(t, paint));
  // A repaint follows the width tier: the two layouts differ in structure, not only in style.
  const ro = new ResizeObserver(() => { const n = narrow(); if (n !== (page.dataset.narrow === 'true')) { page.dataset.narrow = String(n); paint(); } });
  ro.observe(root);
  page.dataset.narrow = String(narrow());
  cleanups.push(() => ro.disconnect(), () => page.remove(), () => live.remove());
};

/** A hook's spelling of an option key: `nameCell` → `name-cell`. */
const kebab = (k: string): string => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
/** A focused control's selector, so a repaint puts focus back on the same one. */
const keyOf = (el: HTMLElement): string | null => {
  const k = el.dataset.key;
  return k ? `[data-key="${CSS.escape(k)}"]` : null;
};
/** How many drawable variables under `n` are in a selected table. */
const countSelected = (n: SgNode, sel: ReadonlySet<number>): number =>
  n.item ? (n.item.table >= 0 && sel.has(n.item.table) ? 1 : 0) : n.kids.reduce((a, k) => a + countSelected(k, sel), 0);
/** A catalog value ("#RRGGBB", or "#RRGGBB · 50%") as a CSS color for its swatch. */
const cssColorOf = (v: string): string => {
  const hex = v.slice(0, 7);
  const pct = /·\s*(\d+(?:\.\d+)?)%/.exec(v);
  if (!pct) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Number(pct[1]) / 100})`;
};
