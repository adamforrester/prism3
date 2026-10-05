/**
 * Components, the levers panel (UI redesign S8.2; concept v6's Components page, owner decisions G5 and G6 A).
 *
 * WHAT IT DRAWS: the intro, with the number of sets counted from the catalog; **Button** (the way to Shape › Density,
 * where heights and spacing are set, then Button icons, Button label & icon and Button label weight as chips, and
 * Button minimum width as a slider); **Component sets** (on the web, the line that building needs the plugin; in the
 * plugin, where the set is chosen). The list of sets and the Build button are the preview's (G2 A).
 *
 * WHICH MODE A CONTROL EDITS. None of the four Button options has a per-mode value (no `ModeLevers` field), so each
 * writes the same bytes from any editable mode (Q54); the preview still follows the previewed mode for the heights,
 * the label weight and the corner. A derived mode (HC light, HC dark, wireframe) is read-only, every control on the
 * page (Q59), under S4a's line; the preview is still drawn.
 *
 * BEHAVIOR-NEUTRAL (the S2 rule). Every write goes through `state/button-input.ts`, which writes what the legacy Size &
 * radius page wrote, byte for byte, its traps included: choosing a chip's default WRITES it rather than unsetting it,
 * and the minimum-width slider writes on every `input` step.
 *
 * HOW IT REPAINTS: by store subscription only (plan §5): `brand` and `mode`. A control writes, notes the edit for the
 * preview's reveal (`noteSectionEdit`, QA-B9), and calls `rebuild()`; the panel is redrawn whole, keeping focus on the
 * element that had it, except while the slider itself is being dragged, which updates in place. It never names a
 * legacy repaint tier and never imports `main.ts` (`test-shell-imports.ts`), and it imports no component definition:
 * the catalog is `state/component-catalog.ts`'s (`check:ignore` fails by name if a definition reaches the web bundle).
 */
import type { ButtonContentSize, ButtonIcons, ButtonLabelWeight } from '@prism3/engine/scale';
import { brandState, currentMode, getPath, lastError, rebuild, searchQuery, setPage, setSearchHits, subscribe } from '../state/store';
import { isDerived } from '../state/verdict';
import { setButtonContentSize, setButtonIcons, setButtonLabelWeight, setButtonMinWidth } from '../state/button-input';
import { brandDensity } from '../state/shape-input';
import { componentCatalog } from '../state/component-catalog';
import { noteSectionEdit } from '../preview/follow-edit';
import { COMPONENTS_INTRO, DOMAINS, pageOfTab, type Host, type PageData, type Section } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { glyph, h, hook } from '../shell/dom';
import { choice, leverBlock, leverOf, slider, sliderReadout, stateLine, subLine, type LeverBlock } from '../ui/lever-kit';
import { SETS_COPY } from '../preview/sections/component-sets';
import type { PageLends } from '../preview/brand';

const PAGE = DOMAINS.find((d) => d.id === 'components') as PageData;
/** The host this bundle was built for (`PRISM3_HOST`, a build-time define). */
const host = (): Host => (PRISM3_HOST === 'figma' ? 'figma' : 'web');

/** The page's own copy (S8.2). DRAFT, pending the owner (the PR's "Copy for owner approval" block). */
export const COMPONENTS_COPY = {
  densityLabel: 'Density',
  density: 'Density sets component heights and spacing.',
  densityLink: 'Set it in Shape › Density',
  /** The plugin's line under Component sets: where the set is chosen. */
  choose: 'Choose a set in the preview to build it.',
  derived: (m: string): string => `${m} is auto-derived — read-only. Edit Light or Dark and it follows.`,
} as const;

/** The Button option writes, by key, each through `state/button-input.ts` (S8.1's table, moved here from `main.ts`). */
const BUTTON_OPTION_WRITES: Readonly<Record<string, (v: string) => void>> = {
  buttonIcons: (v) => setButtonIcons(v as ButtonIcons),
  buttonContentSize: (v) => setButtonContentSize(v as ButtonContentSize),
  buttonLabelWeight: (v) => setButtonLabelWeight(v as ButtonLabelWeight),
};

/** Something drawn that search can hide and a refusal can mark. */
type Item = { el: HTMLElement; said: string; key: string; block?: LeverBlock };

/** Mount the Components levers into `hostEl`. Subscriptions are released through `cleanups`. */
export const mountComponentsLevers = (hostEl: HTMLElement, cleanups: (() => void)[], _lend: PageLends): void => {
  const root = hook(h('div', 'p3-levers-body p3-clevers'), 'components-levers');
  hostEl.replaceChildren(root);
  let lastEdited: string | null = null;
  let items: Item[] = [];
  /** The minimum-width slider and its in-place update (Shape's rule): its own edit updates the readout where it is,
   *  so a drag survives; any other brand change redraws the panel whole. */
  let dragging: { sync: () => void } | null = null;
  let sliding = false;

  const edit = (key: string, write: () => void): void => {
    lastEdited = key;
    write();
    noteSectionEdit();   // QA-B9: the edit, and only an edit, reveals its preview section
    rebuild();
  };
  const derivedLine = (): HTMLElement | null =>
    isDerived(currentMode) ? hook(stateLine(COMPONENTS_COPY.derived(modeLabel(currentMode))), 'components-derived') : null;

  // ── Button ──────────────────────────────────────────────────────────────────────────────────────
  /** The way to Shape › Density (v6's `densityLink`): the brand's density, and the link. No lever key. */
  const densityLink = (): Item => {
    const box = hook(h('div', 'p3-lever'), 'components-density');
    const head = h('div', 'p3-lever-head');
    const d = brandDensity();
    const label = (leverOf('density')?.options ?? []).find((o) => String(o.value) === d)?.label ?? d;
    const readout = h('span', 'p3-readout', label);
    head.append(h('span', 'p3-lever-name', COMPONENTS_COPY.densityLabel), readout);
    const go = hook(h('button', 'p3-btn p3-btn-ghost p3-deplink'), 'components-density-link');
    go.type = 'button';
    go.append(h('span', 'p3-btn-label', COMPONENTS_COPY.densityLink), glyph('chevr'));
    go.onclick = () => setPage(pageOfTab('shape', host()));
    const ctl = h('div', 'p3-lever-ctl');
    ctl.append(subLine(COMPONENTS_COPY.density), go);
    box.append(head, ctl);
    return { el: box, said: `${COMPONENTS_COPY.densityLabel} ${label} ${COMPONENTS_COPY.density} ${COMPONENTS_COPY.densityLink}`.toLowerCase(), key: 'densityLink' };
  };
  const chips = (key: string): Item => {
    const L = leverOf(key);
    const b = leverBlock(key, { group: true });
    const opts = (L?.options ?? []).map((o) => ({ v: String(o.value), l: o.label }));
    const role = `${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}-choice`;
    const c = choice(L?.label ?? key, role, opts, (v) => edit(key, () => BUTTON_OPTION_WRITES[key](v)));
    c.set(String(getPath(brandState, key) ?? L?.default ?? ''));
    b.ctl.append(c.el);
    return { el: b.el, said: `${b.said} ${opts.map((o) => o.l).join(' ')}`.toLowerCase(), key, block: b };
  };
  const minWidth = (): Item => {
    const key = 'buttonMinWidthMultiplier';
    const L = leverOf(key)!;
    const b = leverBlock(key, { forId: 'p3-button-min-width-multiplier' });
    const s = slider(key, 'button-min-width-slider', L.label, (v) => {
      sliding = true;
      try { edit(key, () => setButtonMinWidth(v)); } finally { sliding = false; }
    });
    const sync = (): void => {
      const v = Number(getPath(brandState, key) ?? L.default);
      s.set(v);
      b.setReadout(sliderReadout(L, v));
      b.setRefused(!!lastError && lastEdited === key);
    };
    sync();
    b.ctl.append(s.el);
    dragging = { sync };
    return { el: b.el, said: b.said, key, block: b };
  };

  // ── Component sets ──────────────────────────────────────────────────────────────────────────────
  const sets = (): Item => {
    const el = hook(h('div', 'p3-lever'), 'components-sets');
    el.append(host() === 'figma'
      ? hook(stateLine(COMPONENTS_COPY.choose), 'components-sets-hint')
      : hook(stateLine(SETS_COPY.web), 'components-sets-web'));
    return { el, said: `${PAGE.sections[1].title} ${SETS_COPY.web} ${COMPONENTS_COPY.choose}`.toLowerCase(), key: 'sets' };
  };

  // ── the sections ────────────────────────────────────────────────────────────────────────────────
  const sectionShell = (s: Section, i: number): HTMLElement => {
    const el = hook(h('section', 'p3-lsec'), 'lever-section');
    el.id = `p3-lsec-components-${i}`;
    const head = h('div', 'p3-lsec-head');
    const t = h('h3', 'p3-lsec-title', s.title);
    t.id = `${el.id}-t`;
    el.setAttribute('aria-labelledby', t.id);
    head.append(t);
    if (s.desc) head.append(h('p', 'p3-lsec-desc', s.desc));
    el.append(head);
    return el;
  };
  /** Each row the page data places, drawn by its builder: a lever key's, or a keyless row's control. A key or a
   *  control with no builder draws nothing, and `test:chrome`'s rendered coverage then fails it by name. */
  const BUILDERS: Record<string, () => Item> = {
    densityLink, sets,
    buttonIcons: () => chips('buttonIcons'), buttonContentSize: () => chips('buttonContentSize'), buttonLabelWeight: () => chips('buttonLabelWeight'),
    buttonMinWidthMultiplier: minWidth,
  };
  const section = (s: Section, i: number): { el: HTMLElement; items: Item[] } => {
    const el = sectionShell(s, i);
    const out: Item[] = [];
    for (const r of s.rows) for (const k of r.keys ?? [r.ctl]) { const b = BUILDERS[k]; if (!b) continue; const it = b(); el.append(it.el); out.push(it); }
    return { el, items: out };
  };

  const render = (): void => {
    const had = document.activeElement as HTMLElement | null;
    const focusKey = had && root.contains(had) ? had.getAttribute('data-p3') : null;
    const focusIndex = focusKey ? [...root.querySelectorAll(`[data-p3="${focusKey}"]`)].indexOf(had!) : -1;
    const scrollTop = hostEl.scrollTop;
    items = [];
    dragging = null;
    const derived = derivedLine();
    const parts: HTMLElement[] = [h('p', 'p3-intro', COMPONENTS_INTRO(componentCatalog().length)), ...(derived ? [derived] : [])];
    PAGE.sections.forEach((s, i) => { const x = section(s, i); parts.push(x.el); items.push(...x.items); });
    root.replaceChildren(...parts);
    // A derived mode is read-only, every control on the page (Q59). The info buttons only show a description, and the
    // way to Shape only navigates, so they stay live.
    if (derived) for (const n of root.querySelectorAll<HTMLButtonElement | HTMLInputElement>('.p3-lsec :is(button, input):not(.p3-info, [data-p3="components-density-link"])')) n.disabled = true;
    for (const it of items) it.block?.setRefused(!!lastError && !!lastEdited && it.key === lastEdited);
    filter();
    if (focusKey) {
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
    for (const n of root.querySelectorAll<HTMLElement>('.p3-intro')) n.hidden = !!q;
    setSearchHits(q ? items.filter((it) => !it.el.hidden).length : null);
  };

  cleanups.push(subscribe('brand', () => { if (sliding && dragging) dragging.sync(); else render(); }));
  cleanups.push(subscribe('mode', render));
  cleanups.push(subscribe('search', filter));
  cleanups.push(() => { if (searchQuery.trim()) setSearchHits(null); });
  render();
};
