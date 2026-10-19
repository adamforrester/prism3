/**
 * Components, the preview (UI redesign S8.2; redesigned by #2700, the owner's approved wireframe, every call A).
 *
 * WHAT IT SHOWS: the family in focus (call 9 A, note 1: previews sit with their component). The list and the action
 * bar are the levers pane's (`domains/components.ts`); this pane shows what a row holds:
 *   · its head: the family's label, its set count and members, its category and the page a build places it on (idea 12);
 *   · its preview, where the engine draws one: the Button specimen for Buttons, small, medium and large, each at its
 *     minimum width and widened with icons, in the brand's action colors on its page (#2049);
 *   · its options, where it has any: Button options for Buttons (`domains/button-options.ts`);
 *   · its sets: each one's summary, members, what it contains, its spacing at the brand's density and how its last build
 *     in this session went (G9), in the approved set view's own words (`setsView`).
 * With nothing focused, it shows Buttons, the one family with a preview (the wireframe's own default).
 *
 * ONE BUILDER, TWO PLACES. At the narrow tier the preview pane has nowhere to sit beside the list, so the same block
 * opens inline under the focused row (`familyDetail`, which the list calls). The head drops there, and the page name
 * moves into the block.
 *
 * LEGACY MARKUP IN A LIGHT-PINNED HOST, SPECIMENS ON THE BRAND'S PAGE (plan §9.1), as `preview/shape.ts`: each
 * section's ground is a specimen root painted with the brand's own `background.primary` for the previewed mode, and
 * the section container takes the levers panel's gray (Q24, `p3-sgsec`).
 *
 * HOW IT REPAINTS: by store subscription only: `brand` and `mode` redraw the block; `host` and `host:components` the
 * last-build lines, in place; the page state (`state/components-page.ts`) the focused family.
 */
import { currentMode, rp, subscribe, theme } from '../state/store';
import { resolvedModes } from '../state/verdict';
import { brandControlShape } from '../state/shape-input';
import { buttonLayout } from '../state/button-input';
import { componentCatalog, type Catalog } from '../state/component-catalog';
import { componentsPage, watchComponentsPage } from '../state/components-page';
import { costOf, entryOf, groupsOf, GROUPS_COPY, type GroupRow } from '../state/component-groups';
import { leverManifest } from '@prism3/engine/levers';
import { sizeRefPx } from '@prism3/engine/scale';
import { h, hook } from '../shell/dom';
import { BUTTON_DESC } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import type { PageLends } from './brand';
import { buttonLayoutSection, type ButtonLayoutCopy } from './sections/index';
import { SG_SURFACES, el, ground, oppositeOf, palSection, sgContext, type SgRole } from './sections/kit';
import { setsView, SETS_COPY } from './sections/component-sets';
import { mountButtonOptions, BUTTON_OPTIONS_COPY } from '../domains/button-options';

/** The button specimen's row label (DRAFT, S8.2). */
export const BUTTON_PREVIEW_COPY: ButtonLayoutCopy = {
  row: (size, height, minWidth) => `${size} · ${height}px high · at least ${minWidth}px wide`,
  smaller: ' · small label and icon',
};

/** The block's copy. DRAFT, the approved wireframe's words (#2700). */
export const DETAIL_COPY = {
  preview: 'Preview',
  setsInFamily: 'Sets in this family',
  set: 'Set',
  selected: 'selected',
} as const;

/** The family the page shows when nothing is focused: Buttons (the one with a preview), else the first row. */
export const PREVIEW_DEFAULT_PAGE = 'Buttons';

/** The row a focus key names, or the default. */
export const focusedRow = (catalog: Catalog, focus: string | null): GroupRow | null => {
  const rows = groupsOf(catalog).flatMap((s) => s.rows);
  return rows.find((r) => r.key === focus) ?? rows.find((r) => r.page === PREVIEW_DEFAULT_PAGE) ?? rows[0] ?? null;
};

/** The brand's density, by the manifest's option label. */
const densityLabel = (): string => {
  const d = theme.dims.density;
  return (leverManifest.find((l) => l.key === 'density')?.options ?? []).find((o) => String(o.value) === d)?.label ?? d;
};

/** What a member says about its cost, and whether it is selected. */
const partsLine = (catalog: Catalog, id: string): string | null => {
  const e = entryOf(catalog, id);
  if (!e?.buildable || e.members === null) return null;
  return GROUPS_COPY.members(e.members, e.unit) + (componentsPage().sel.has(id) ? ` · ${DETAIL_COPY.selected}` : '');
};

/** One family's block (see the header). `inline` drops the head and puts the page name in the block (the narrow
 *  tier). `cleanups` takes the subscriptions the block's own controls hold; the caller releases them on its next draw. */
export const familyDetail = (row: GroupRow, o: {
  catalog: Catalog; inline: boolean; plugin: boolean; lend: PageLends; cleanups: (() => void)[];
}): HTMLElement => {
  const card = hook(h('div', 'p3-legacy-card p3-cp-detail'), o.inline ? 'components-inline' : 'components-style-guide');
  card.dataset.theme = 'light';
  card.dataset.family = row.key;
  const all = resolvedModes(theme);
  const rolesByMode = new Map<string, Record<string, SgRole | undefined>>(all.map((x) => [x.mode as string, x.roles as Record<string, SgRole | undefined>]));
  const cur: string = rolesByMode.has(currentMode) ? currentMode : rp.modes[0];
  const c = sgContext({
    rolesByMode, cur, opp: oppositeOf(cur, rp.modes, (m) => rolesByMode.has(m)), namespace: theme.namespace, modeLabel, badges: false,
    paletteHex: (p, s) => theme.palettes.find((x) => x.palette === p)?.steps.find((x) => x.key === s)?.hex ?? null,
  });
  const entries = row.ids.map((id) => entryOf(o.catalog, id)).filter((e) => !!e);
  const cost = costOf(o.catalog, row.ids);
  const unit = entries[0]?.unit ?? 'variants';
  const total = unit === 'components' ? cost.components : cost.variants;
  const cat = entries[0]?.category ?? '';
  const parts: HTMLElement[] = [];
  if (!o.inline) {
    const head = hook(h('div', 'p3-cp-dhead'), 'components-detail-head');
    head.append(hook(h('h2', 'p3-cp-dtitle', row.label), 'components-detail-title'));
    const meta = `${row.family ? `${GROUPS_COPY.sets(row.ids.length)} · ` : ''}${GROUPS_COPY.members(total, unit)}${cat ? ` · ${cat[0].toUpperCase()}${cat.slice(1)}` : ''}`;
    head.append(hook(h('p', 'p3-sub', meta), 'components-detail-meta'));
    if (row.page) head.append(hook(h('p', 'p3-sub p3-cp-where', GROUPS_COPY.page(row.page)), 'components-detail-page'));
    parts.push(head);
  } else if (row.page) {
    parts.push(hook(h('p', 'p3-sub p3-cp-where', GROUPS_COPY.page(row.page)), 'components-detail-page'));
  }
  const secs: HTMLElement[] = [];
  let opts: HTMLElement | null = null;
  // The preview, where the engine draws one (only Buttons today), then the family's options. The options are chrome
  // controls, so they sit on the card in the chrome's own inks, never on a specimen ground: a ground is the brand's page
  // for the previewed mode, and the chrome's light inks on a brand's dark page measured 1:1.
  if (row.page === PREVIEW_DEFAULT_PAGE) {
    const button = palSection(DETAIL_COPY.preview, '');
    button.append(buttonLayoutSection(buttonLayout(), theme, c, { shape: brandControlShape(), modes: theme.modes, copy: BUTTON_PREVIEW_COPY }));
    secs.push(button);
    opts = hook(h('section', 'p3-cp-optsec'), 'button-options-section');
    const head = h('div', 'p3-lsec-head');
    head.append(hook(h('h3', 'p3-cp-opt-title', BUTTON_OPTIONS_COPY.title), 'button-options-title'), hook(h('p', 'p3-lsec-desc', BUTTON_DESC), 'button-options-desc'));
    const host = h('div', 'p3-cp-opts');
    mountButtonOptions(host, o.cleanups, modeLabel);
    opts.append(head, host);
  }
  // The sets: each one's own lines, from the approved set view (S8.2), so a set says here what it always said.
  const view = setsView(o.catalog, { density: theme.dims.density, spacePx: sizeRefPx(theme.dims.sizes), plugin: o.plugin, lastOf: o.lend.sets.lastOf })
    .filter((v) => row.ids.includes(v.id));
  const sets = palSection(row.family ? DETAIL_COPY.setsInFamily : DETAIL_COPY.set, SETS_COPY.spacingAt(densityLabel()));
  const list = hook(el('ul', 'cset-list'), 'component-set-list');
  for (const id of row.ids) {
    const v = view.find((x) => x.id === id);
    if (!v) continue;
    const item = hook(el('li', 'cset-item' + (v.offered ? '' : ' cset-off')), 'component-set');
    item.dataset.set = v.id;
    item.dataset.offered = String(v.offered);
    const headRow = el('div', 'cset-head');
    headRow.append(hook(el('b', 'cset-name', v.name), 'component-set-name'));
    const p = partsLine(o.catalog, id);
    if (p) headRow.append(hook(el('span', 'cset-parts', p), 'component-set-parts'));
    if (v.last) headRow.append(hook(el('span', 'cset-last', v.last), 'component-set-last'));
    item.append(headRow);
    const body = el('div', 'cset-body');
    body.append(el('p', 'cset-summary', v.summary), el('p', 'cset-meta', `${v.category} · ${v.contains}`));
    if (v.reason) body.append(hook(el('p', 'cset-reason', v.reason), 'component-set-reason'));
    for (const line of v.spacing) body.append(hook(el('p', 'cset-spacing mono', line), 'component-set-spacing'));
    item.append(body);
    list.append(item);
  }
  sets.append(list);
  if (!o.plugin) sets.append(hook(el('p', 'cset-note', SETS_COPY.web), 'components-web-line'));
  secs.push(sets);
  // Q24: each section's container on the levers panel's gray, as the other previews' are.
  for (const s of secs) s.classList.add('p3-sgsec');
  const grounded = secs.map((s) => ground(c, s, SG_SURFACES[0]));
  // The options after the Preview (the first grounded section), before the sets.
  card.replaceChildren(...parts, ...(opts ? [grounded[0], opts, ...grounded.slice(1)] : grounded));
  return card;
};

/** Mount the Components preview into `hostEl`. Subscriptions are released through `cleanups`. */
export const mountComponentsPreview = (hostEl: HTMLElement, cleanups: (() => void)[], lend: PageLends): void => {
  const plugin = PRISM3_HOST === 'figma';
  const stack = hook(h('div', 'p3-stack p3-preview-stack'), 'components-preview');
  hostEl.replaceChildren(stack);
  let own: (() => void)[] = [];
  let shown: string | null = null;
  const paint = (): void => {
    for (const f of own) f();
    own = [];
    const catalog = componentCatalog();
    const row = focusedRow(catalog, componentsPage().focus);
    shown = row?.key ?? null;
    stack.replaceChildren(...(row ? [familyDetail(row, { catalog, inline: false, plugin, lend, cleanups: own })] : []));
  };
  /** A host message moves only the last-build lines (G9), in place, so a verdict never moves a designer's focus. */
  const syncLast = (): void => {
    for (const v of setsView(componentCatalog(), { density: theme.dims.density, spacePx: sizeRefPx(theme.dims.sizes), plugin, lastOf: lend.sets.lastOf })) {
      const n = stack.querySelector<HTMLElement>(`[data-p3="component-set"][data-set="${v.id}"] [data-p3="component-set-last"]`);
      if (n && v.last !== null && n.textContent !== v.last) n.textContent = v.last;
    }
  };
  /** A focus change redraws the block; a selection change moves only the "· selected" marks. */
  const onPage = (): void => {
    const catalog = componentCatalog();
    const row = focusedRow(catalog, componentsPage().focus);
    if ((row?.key ?? null) !== shown) { paint(); return; }
    for (const id of row?.ids ?? []) {
      const n = stack.querySelector<HTMLElement>(`[data-p3="component-set"][data-set="${id}"] [data-p3="component-set-parts"]`);
      const p = partsLine(catalog, id);
      if (n && p && n.textContent !== p) n.textContent = p;
    }
  };
  cleanups.push(subscribe('brand', paint), subscribe('mode', paint), subscribe('host', syncLast), subscribe('host:components', syncLast),
    watchComponentsPage(onPage), () => { for (const f of own) f(); });
  paint();
};
