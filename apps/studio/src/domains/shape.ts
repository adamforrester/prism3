/**
 * Shape, the levers panel (UI redesign S7; concept v6's Shape page, with the owner's names, E2).
 *
 * WHAT IT DRAWS: the intro; **Density** (three chips, then the way to Components, where padding is set);
 * **Radius** (the radius softness slider over the manifest's named stops, then the four Control shape chips); behind
 * the page's Show advanced (Q69: the manifest flags it advanced), **Base radius** (a value picker over 2 to 12px,
 * Q65's control, owner decision D15); last, the way on to Depth & motion. The retired "Hairline radius" switch is gone
 * with the legacy page: the engine always emits `radius.hairline` (#2053), so there is nothing to switch.
 *
 * WHICH MODE A CONTROL EDITS (owner decision Q22, as Type's Q62): the mode the preview shows. Density and radius
 * softness are per mode: previewing Light they write the brand value, previewing another editable mode they write
 * `modeLevers[mode]`, shown as "Auto: follows Light (‹value›)" until set, with Return to Auto. Auto names LIGHT for
 * every other mode, a custom one included, because that is what the engine resolves an unset mode from (scope
 * finding 7; `state/shape-input.ts`). In another mode the Density lever keeps the decided sentence ("Spacing follows
 * the brand's density, not the mode's …"). Control shape and Base radius are brand-wide: the same bytes from any
 * editable mode (Q54). A derived mode (HC light, HC dark, wireframe) is read-only, every control on the page (Q59),
 * held by the frame: the whole levers panel is inert and disabled under one line (N-3 A, #1984); the preview is still drawn.
 *
 * AN AUTO CHIP. Under Auto the chip of the value the mode follows is the checked one, and choosing it again writes
 * nothing: as Type's selects (which offer "Auto: follows Light (X)" and leave X out), a mode does not pin Light's own
 * value while it already follows it. Choosing another value pins it; Return to Auto unpins.
 *
 * BEHAVIOR-NEUTRAL (the S2 rule). Every write goes through `state/shape-input.ts`, which writes what the legacy Size &
 * radius page wrote, byte for byte, its traps included (the default is written, not unset).
 *
 * HOW IT REPAINTS: by store subscription only (plan §5): `brand` and `mode`. A control writes, notes the edit for the
 * preview's reveal (`noteSectionEdit`, QA-B9), and calls `rebuild()`; the panel is redrawn whole, keeping focus on the
 * element that had it (a slider being dragged keeps its focus and its value). It never names a legacy repaint tier
 * and never imports `main.ts` (`test-shell-imports.ts`).
 */
import { brandState, currentMode, getPath, lastError, rebuild, searchQuery, setPage, setSearchHits, subscribe } from '../state/store';
import { isDerived } from '../state/verdict';
import { brandBaseMd, brandControlShape, densityIn, radiusScaleIn, setBaseMd, setControlShape, setDensity, setRadiusScale } from '../state/shape-input';
import type { ControlShape, Density } from '@prism3/engine/scale';
import { noteSectionEdit } from '../preview/follow-edit';
import { DOMAINS, pageOfTab, type PageData, type Section } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { glyph, h, hook } from '../shell/dom';
import { choice, leverBlock, leverOf, promoteLever, slider, sliderReadout, stateLine, subLine, type LeverBlock } from '../ui/lever-kit';
import { valuePicker } from '../ui/value-picker';
import type { PageLends } from '../preview/brand';

const PAGE = DOMAINS.find((d) => d.id === 'shape') as PageData;

/** The page's own copy (S7). APPROVED by the owner on 2026-10-04 unless marked DRAFT. */
export const SHAPE_COPY = {
  /** Q22, Type's approved line. */
  editing: (m: string): string => `Editing ${m}, the mode the preview shows.`,
  auto: (v: string): string => `Auto: follows Light (${v})`,
  toAuto: 'Return to Auto',
  /** The decided per-mode density sentence (owner, 2026-09-29, docs/28 §5.4.3), kept. */
  densityMode: 'Spacing follows the brand’s density, not the mode’s: a mode’s density changes control heights only.',
  padding: 'Padding is set per component.',
  paddingLink: 'See Components',
  next: 'Continue to Depth & motion',
  // DRAFT, pending the owner: the labels and tooltips in plain words (D16, E2).
  densityTip: 'Sets every control height, and moves each component’s padding and gaps one step on the spacing scale.',
  softnessLabel: 'Radius softness',
  softnessTip: 'How round every radius size is, from sharp (0) to round (2). The pill sizes and the 1px radius stay fixed.',
  // #2361 — DRAFT for the owner: hairline now reaches fields and checkboxes too.
  shapeTip: 'The shape of buttons and icon buttons. Boxed is square, and rounded follows radius softness. Hairline gives buttons, fields and checkboxes a 1px radius. Pill is fully round at any height.',
  baseLabel: 'Base radius',
  baseTip: 'The medium radius at standard softness, from 2 to 12px. Every other radius size is a multiple of it.',
  baseHint: 'The medium radius at standard softness. The other sizes scale from it.',
} as const;
/** The base radius values the picker offers: the manifest's own range and step. */
const baseValues = (): number[] => {
  const L = leverOf('baseMd');
  const out: number[] = [];
  for (let v = L?.min ?? 2; v <= (L?.max ?? 12) + 1e-9; v += L?.step ?? 1) out.push(Math.round(v * 100) / 100);
  return out;
};

/** Something drawn that search can hide and a refusal can mark. */
type Item = { el: HTMLElement; said: string; key: string; block?: LeverBlock };

/** Mount the Shape levers into `host`. Subscriptions are released through `cleanups`. */
export const mountShapeLevers = (hostEl: HTMLElement, cleanups: (() => void)[], _lend: PageLends): void => {
  const root = hook(h('div', 'p3-levers-body'), 'shape-levers');
  hostEl.replaceChildren(root);
  let advOpen = false;
  let pickOpen = false;
  let focusPick = false;
  let pickFocus: (() => void) | null = null;
  let lastEdited: string | null = null;
  let items: Item[] = [];
  /** The radius softness slider and its in-place update: an edit the slider itself makes (a drag, or arrow keys)
   *  updates its readout and state where they are rather than redrawing the panel, so the drag survives (Palettes'
   *  rule). Any other brand change redraws the panel whole, whatever has focus. */
  let dragging: { el: HTMLInputElement; sync: () => void } | null = null;
  /** Set while the slider's own edit runs, so the repaint it causes is the in-place one. */
  let sliding = false;

  const edit = (key: string, write: () => void): void => {
    lastEdited = key;
    write();
    noteSectionEdit();   // QA-B9: the edit, and only an edit, reveals its preview section
    rebuild();
  };

  /** The per-mode state under a per-mode control: Auto and what it follows, or Return to Auto. */
  const perModeNode = (hk: string, own: boolean, follows: string, onAuto: () => void): HTMLElement => {
    if (!own) return hook(stateLine(SHAPE_COPY.auto(follows)), `${hk}-auto`);
    const reset = hook(h('button', 'p3-btn p3-btn-page p3-shape-reset'), `${hk}-reset`);
    reset.type = 'button';
    reset.append(h('span', 'p3-btn-label', SHAPE_COPY.toAuto));
    reset.onclick = onAuto;
    return reset;
  };
  const perModeState = (b: LeverBlock, hk: string, own: boolean, follows: string, onAuto: () => void): void => b.setState(perModeNode(hk, own, follows, onAuto));

  // ── Density ─────────────────────────────────────────────────────────────────────────────────────
  const density = (): Item => {
    const mode = currentMode;
    const light = mode === 'light';
    const L = leverOf('density');
    const b = leverBlock('density', { group: true, desc: SHAPE_COPY.densityTip });
    const now = densityIn(mode);
    const opts = (L?.options ?? []).map((o) => ({ v: String(o.value) as Density, l: o.label }));
    const labelOf = (v: string): string => opts.find((o) => o.v === v)?.l ?? v;
    if (!light && !isDerived(mode)) b.ctl.append(subLine(SHAPE_COPY.editing(modeLabel(mode))));
    const c = choice(L?.label ?? 'Density', 'density-choice', opts, (v) => edit('density', () => setDensity(mode, v)));
    c.set(now.value);
    b.ctl.append(c.el);
    if (!light) {
      // Auto (or Return to Auto) under the chips it is about, then the decided sentence.
      if (!isDerived(mode)) b.ctl.append(perModeNode('density', now.own, labelOf(densityIn('light').value), () => edit('density', () => setDensity(mode, undefined))));
      b.ctl.append(hook(subLine(SHAPE_COPY.densityMode), 'shape-density-mode'));
    }
    const pad = hook(h('div', 'p3-shape-pad'), 'shape-padding');
    const go = hook(h('button', 'p3-btn p3-btn-ghost p3-deplink'), 'shape-see-components');
    go.type = 'button';
    go.append(h('span', 'p3-btn-label', SHAPE_COPY.paddingLink), glyph('chevr'));
    go.onclick = () => setPage(pageOfTab('components'));
    pad.append(subLine(SHAPE_COPY.padding), go);
    b.ctl.append(pad);
    return { el: b.el, said: `${b.said} ${opts.map((o) => o.l).join(' ')}`.toLowerCase(), key: 'density', block: b };
  };

  // ── Radius ──────────────────────────────────────────────────────────────────────────────────────
  const softness = (): Item => {
    const mode = currentMode;
    const light = mode === 'light';
    const L = leverOf('radiusScale')!;
    const b = leverBlock('radiusScale', { label: SHAPE_COPY.softnessLabel, desc: SHAPE_COPY.softnessTip, forId: 'p3-radius-scale' });
    const now = radiusScaleIn(mode);
    if (!light && !isDerived(mode)) b.ctl.append(subLine(SHAPE_COPY.editing(modeLabel(mode))));
    const s = slider('radiusScale', 'radius-scale-slider', `${SHAPE_COPY.softnessLabel}, ${modeLabel(mode)}`, (v) => {
      sliding = true;
      try { edit('radiusScale', () => setRadiusScale(mode, v)); } finally { sliding = false; }
    });
    const sync = (): void => {
      const x = radiusScaleIn(mode);
      s.set(x.value);
      b.setReadout(sliderReadout(L, x.value));
      if (!light && !isDerived(mode)) perModeState(b, 'radius-scale', x.own, sliderReadout(L, radiusScaleIn('light').value), () => edit('radiusScale', () => setRadiusScale(mode, undefined)));
      b.setRefused(!!lastError && lastEdited === 'radiusScale');
    };
    sync();
    b.ctl.append(s.el);
    dragging = { el: s.el, sync };
    const stops = Object.keys(L.stops ?? {});
    return { el: b.el, said: `${b.said} ${stops.join(' ')}`.toLowerCase(), key: 'radiusScale', block: b };
  };
  const controlShape = (): Item => {
    const L = leverOf('controlShape');
    const b = leverBlock('controlShape', { group: true, desc: SHAPE_COPY.shapeTip });
    const opts = (L?.options ?? []).map((o) => ({ v: String(o.value) as ControlShape, l: o.label }));
    const c = choice(L?.label ?? 'Control shape', 'control-shape-choice', opts, (v) => edit('controlShape', () => setControlShape(v)));
    c.set(brandControlShape());
    b.ctl.append(c.el);
    return { el: b.el, said: `${b.said} ${opts.map((o) => o.l).join(' ')}`.toLowerCase(), key: 'controlShape', block: b };
  };

  // ── Base radius (advanced) ──────────────────────────────────────────────────────────────────────
  const baseRadius = (): Item => {
    const b = leverBlock('baseMd', { label: SHAPE_COPY.baseLabel, desc: SHAPE_COPY.baseTip, forId: 'p3-base-radius' });
    const cur = brandBaseMd();
    const btn = hook(h('button', 'p3-btn p3-btn-page p3-pick'), 'base-radius-pick');
    btn.type = 'button';
    btn.id = 'p3-base-radius';
    if (getPath(brandState, 'baseMd') !== undefined) btn.dataset.set = 'true';
    btn.setAttribute('aria-expanded', String(pickOpen));
    btn.setAttribute('aria-label', `${SHAPE_COPY.baseLabel}: ${cur}px. Pick a value`);
    btn.append(h('span', 'p3-btn-label', `${cur}px`), glyph('chev'));
    btn.onclick = () => { pickOpen = !pickOpen; focusPick = pickOpen; render(); };
    b.ctl.append(btn);
    if (pickOpen && !isDerived(currentMode)) {
      const pk = valuePicker({
        name: SHAPE_COPY.baseLabel, modeLabel: modeLabel(currentMode), hint: SHAPE_COPY.baseHint, current: cur,
        values: baseValues().map((v) => ({ v, label: `${v}px`, sample: (e: HTMLElement) => { const s = h('span', 'p3-radius-sample'); s.style.borderRadius = `${v}px`; e.append(s); } })),
        onPick: (v) => edit('baseMd', () => setBaseMd(v)),
        onClose: () => { pickOpen = false; render(); root.querySelector<HTMLElement>('#p3-base-radius')?.focus(); },
      });
      pickFocus = pk.focusCurrent;
      b.ctl.append(pk.el);
    }
    return { el: b.el, said: b.said, key: 'baseMd', block: b };
  };

  // ── the sections ────────────────────────────────────────────────────────────────────────────────
  const sectionShell = (s: Section, i: number): HTMLElement => {
    const el = hook(h('section', 'p3-lsec'), 'lever-section');
    el.id = `p3-lsec-shape-${i}`;
    const head = h('div', 'p3-lsec-head');
    const t = h('h2', 'p3-lsec-title', s.title);
    t.id = `${el.id}-t`;
    el.setAttribute('aria-labelledby', t.id);
    head.append(t);
    if (s.desc) head.append(h('p', 'p3-lsec-desc', s.desc));
    el.append(head);
    return el;
  };
  /** Each lever key the page data places, drawn by its builder. A key with no builder draws nothing, and
   *  `test:chrome`'s rendered coverage then fails it by name. */
  const BUILDERS: Record<string, () => Item> = { density, radiusScale: softness, controlShape, baseMd: baseRadius };
  const section = (s: Section, i: number): { el: HTMLElement; items: Item[] } => {
    const el = sectionShell(s, i);
    const out: Item[] = [];
    for (const r of s.rows) for (const k of r.keys ?? []) { const b = BUILDERS[k]; if (!b) continue; const it = b(); el.append(it.el); out.push(it); }
    // BG1 A: a lever named as its section (Density, Base radius) says its name once, in the section's title.
    for (const it of out) if (it.block && it.block.label === s.title) promoteLever(el, it.block);
    return { el, items: out };
  };
  /** The page's Show advanced (Type's form): a disclosure button and the body it opens. */
  const advFold = (open: boolean, n: number, body: () => HTMLElement[]): HTMLElement => {
    const row = h('div', 'p3-advrow');
    const btn = hook(h('button', 'p3-btn p3-btn-page'), 'shape-advanced');
    btn.type = 'button';
    btn.id = 'p3-adv-shape';
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-controls', 'p3-advb-shape');
    btn.append(glyph(open ? 'chev' : 'chevr'), h('span', 'p3-btn-label', `${open ? 'Hide' : 'Show'} ${n} advanced`));
    btn.onclick = () => { advOpen = !advOpen; render(); };
    const b = h('div', 'p3-advbody');
    b.id = 'p3-advb-shape';
    b.hidden = !open;
    if (open) b.append(...body());
    row.append(btn, b);
    return row;
  };

  const render = (): void => {
    const had = document.activeElement as HTMLElement | null;
    const focusKey = had && root.contains(had) ? had.getAttribute('data-p3') : null;
    const focusIndex = focusKey ? [...root.querySelectorAll(`[data-p3="${focusKey}"]`)].indexOf(had!) : -1;
    const scrollTop = hostEl.scrollTop;
    items = [];
    pickFocus = null;
    dragging = null;
    const parts: HTMLElement[] = [h('p', 'p3-intro', PAGE.intro)];
    const everyday = PAGE.sections.filter((s) => !s.advanced);
    const adv = PAGE.sections.filter((s) => s.advanced);
    everyday.forEach((s) => { const x = section(s, PAGE.sections.indexOf(s)); parts.push(x.el); items.push(...x.items); });
    const showAll = advOpen || !!searchQuery.trim();
    const n = adv.reduce((a, s) => a + s.rows.length, 0);
    if (adv.length) parts.push(advFold(showAll, n, () => adv.map((s) => { const x = section(s, PAGE.sections.indexOf(s)); items.push(...x.items); return x.el; })));
    const next = hook(h('button', 'p3-btn p3-btn-page p3-next'), 'shape-continue');
    next.type = 'button';
    next.append(h('span', 'p3-btn-label', SHAPE_COPY.next), glyph('chevr'));
    next.onclick = () => setPage(pageOfTab('depth'));
    const nr = h('div', 'p3-nextrow');
    nr.append(next);
    parts.push(nr);
    root.replaceChildren(...parts);
    for (const it of items) it.block?.setRefused(!!lastError && !!lastEdited && it.key === lastEdited);
    filter();
    if (focusPick && pickFocus) { focusPick = false; (pickFocus as () => void)(); }
    else if (focusKey) {
      const same = [...root.querySelectorAll<HTMLElement>(`[data-p3="${focusKey}"]`)];
      (same[Math.max(0, focusIndex)] ?? same[0])?.focus({ preventScroll: true });
    }
    if (hostEl.scrollTop !== scrollTop) hostEl.scrollTop = scrollTop;
  };

  /** Search (Q3): hide what does not match, report the count. */
  const filter = (): void => {
    const q = searchQuery.trim().toLowerCase();
    for (const it of items) it.el.hidden = !!q && !it.said.includes(q);
    for (const s of root.querySelectorAll<HTMLElement>('.p3-lsec')) s.hidden = !!q && !s.querySelector('.p3-lever:not([hidden])');
    for (const n of root.querySelectorAll<HTMLElement>('.p3-intro, .p3-nextrow, .p3-advrow > .p3-btn')) n.hidden = !!q;
    setSearchHits(q ? items.filter((it) => !it.el.hidden).length : null);
  };
  /** Whether the advanced section is drawn now (a search draws it). */
  const drawnAll = (): boolean => !!root.querySelector('#p3-advb-shape:not([hidden])');

  cleanups.push(subscribe('brand', () => { if (sliding && dragging) dragging.sync(); else render(); }));
  cleanups.push(subscribe('mode', () => { pickOpen = false; render(); }));
  cleanups.push(subscribe('search', () => { if ((advOpen || !!searchQuery.trim()) !== drawnAll()) render(); else filter(); }));
  cleanups.push(() => { if (searchQuery.trim()) setSearchHits(null); });
  render();
};
