/** The Shape preview's Radius section (UI redesign S7, owner decision D1 A): every radius size the engine emits, read
 *  from the ladder itself (`theme.dims.radius`, so the container sizes `xl`, `2xl` and `3xl` and the 1px `hairline`
 *  are drawn with no list to keep in step, #1881, #2053), each at its value in the previewed mode with the component
 *  definitions that bind it; then the four control shapes, the brand's own marked. Its heading and description are
 *  the Radius lever section's (Q23); the Base radius levers reveal it too (`PREVIEW_HEADING`). Read-only.
 *
 *  THE VALUE IN A MODE is the engine's, by the emission's own rule (`tree.ts`, the radius loop): a mode with its own
 *  radius softness re-derives the ladder (`dims.radiusByMode`), and wireframe draws every radius at 0. `test:smoke`
 *  holds each row against the committed emission for every mode, so a drift between this and `tree.ts` fails there.
 *
 *  DRAWN IN THE BRAND'S OWN COLORS ON ITS PAGE (owner decision D2 A): each sample is filled with
 *  `foreground.secondary` and edged with `border.primary` for the mode, on the section's ground, which is the
 *  brand's `background.primary`.
 *
 *  "USED BY" comes from the generated data-only index (`../used-by.ts`, technical call T4), read for the brand's
 *  Control shape: a pill brand's buttons use `radius.capsule`, not `radius.md`.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="radius"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The section context, the resolved dimensions, the brand's modes, the mode, the Control shape,
 *  the manifest's shape labels and the section's copy. Nothing here reads the session. */
import type { Theme } from '@prism3/engine/theme';
import type { ControlShape } from '@prism3/engine/scale';
import { USED_BY } from '../used-by';
import { el, hook, palSection, specimen, subHead, tokenPillSpan, type SgCtx } from './kit';

/** The fallback where no definition binds a size (APPROVED copy, owner, 2026-10-04). */
export const USED_BY_NONE = 'No component uses this yet.';
/** The label of the two pill sizes, `radius.round` and `radius.capsule` (APPROVED copy, owner, 2026-10-04, per #1177):
 *  a pill is height ÷ 2 whatever its px, so the px it is emitted at says nothing a reader can use. Chosen by which
 *  size it is (the engine marks the two pill sizes on the ladder), never by its px, so wireframe's 0px pills still
 *  read "Pill". */
export const PILL_LABEL = 'Pill';
/** The sub-heading over the four shapes. DRAFT. */
export const SHAPES_TITLE = 'Control shape';

export type RadiusRow = { name: string; px: number; pill: boolean };
/** Every radius size, in the ladder's order, at its value in `mode` (the emission's rule; see the header). */
export const radiusIn = (dims: Theme['dims'], modes: readonly string[], mode: string): RadiusRow[] => {
  const byMode = dims.radiusByMode?.[mode];
  const zero = mode === 'wireframe' && modes.includes('wireframe');
  return dims.radius.map((r) => ({ name: r.name, px: zero ? 0 : (byMode?.find((s) => s.name === r.name)?.px ?? r.px), pill: !!r.pill }));
};
/** The radius size `user` binds under each Control shape, by the index (the engine's repoint): a pill-able control
 *  by default, or another definition by its index name (#2361: `TextField` and `Checkbox.Control` move under Hairline).
 *  `fallback` is what it binds when the index names no `radius.*` size for it (the checkbox's own clamped corner). */
export const shapeRef = (shape: ControlShape, user = 'Button', fallback = 'radius.md'): string => {
  const m = USED_BY.radius[shape] as Record<string, readonly string[]>;
  return Object.keys(m).find((k) => m[k].includes(user)) ?? fallback;
};
/** The definitions that bind `ref` under `shape`. */
export const radiusUsers = (shape: ControlShape, ref: string): readonly string[] => (USED_BY.radius[shape] as Record<string, readonly string[]>)[ref] ?? [];

/** A sample painted in the brand's roles for the mode: `foreground.secondary` fill (or `fill`), `border.primary` edge;
 *  on the inverse ground (the Style guide's Inverse, `pre` = `inverse.`) the inverse counterparts. */
export const shapeSample = (c: SgCtx, cls: string, pre = '', fill = 'foreground.secondary'): HTMLElement => {
  // Marked with its fill, the paint a reader sees (one role per node); `test:chrome` holds the edge too.
  const s = c.painted(specimen(el('div', cls)), `${pre}${fill}`, 'background');
  s.style.background = c.paint(c.cur, `${pre}${fill}`);
  s.style.borderColor = c.paint(c.cur, `${pre}border.primary`);
  return s;
};

/** A table of rows: the label first with its token under it (QA-B2), what uses it (unless `withWho` is false), and a
 *  sample. */
export const shapeTable = (heads: readonly string[], rows: readonly { hook: string; key: string; label: string; token: string; who: string; sample: HTMLElement }[], withWho = true): HTMLElement => {
  const box = el('div', 'mtbl');
  const scroll = el('div', 'mtbl-scroll');
  const t = el('table', 'mtbl-tbl');
  const head = el('thead'), htr = el('tr');
  heads.forEach((x, i) => htr.append(el('th', i === 0 ? 'mtbl-stick' : i === heads.length - 1 ? 'mtbl-fill mtbl-spec' : 'mtbl-mode shp-who', x)));
  head.append(htr);
  const body = el('tbody');
  for (const r of rows) {
    const tr = hook(el('tr'), r.hook);
    tr.dataset.step = r.key;
    const nc = el('td', 'mtbl-stick');
    nc.append(hook(el('span', 'mtbl-name shp-label', r.label), 'shape-row-label'), tokenPillSpan(r.token));
    const spec = el('td', 'mtbl-fill mtbl-spec');
    spec.append(r.sample);
    if (withWho) {
      const who = el('td', 'mtbl-mode shp-who');
      who.append(hook(el('span', 'ltbl-who' + (r.who === USED_BY_NONE ? ' none' : ''), r.who), 'shape-row-used-by'));
      tr.append(nc, who, spec);
    } else tr.append(nc, spec);
    body.append(tr);
  }
  t.append(head, body); scroll.append(t); box.append(scroll);
  return box;
};

export const radiusSection = (c: SgCtx, o: {
  dims: Theme['dims']; modes: readonly string[]; mode: string; shape: ControlShape; shapeLabels: readonly { v: string; l: string }[];
  heightPx: number; copy: { title: string; desc: string };
}): HTMLElement => {
  const sec = palSection(o.copy.title, o.copy.desc);
  sec.dataset.sgSection = 'radius';   // the shared-section marker (`kit.ts`'s header)
  const rows = radiusIn(o.dims, o.modes, o.mode);
  sec.append(shapeTable(['Size', 'Used by', 'Sample'], rows.map((r) => {
    const users = radiusUsers(o.shape, `radius.${r.name}`);
    const sw = shapeSample(c, 'shp-sw');
    sw.style.borderRadius = `${r.px}px`;
    return { hook: 'radius-row', key: r.name, label: r.pill ? PILL_LABEL : `${r.px}px`, token: `radius.${r.name}`, who: users.length ? users.join(', ') : USED_BY_NONE, sample: sw };
  })));
  // The four control shapes, each the radius size it binds, drawn at the medium control height so a pill reads as
  // height ÷ 2 and a rounded corner at its true size against it.
  sec.append(subHead(SHAPES_TITLE));
  const list = hook(el('div', 'shp-shapes'), 'control-shapes');
  for (const s of o.shapeLabels) {
    const ref = shapeRef(s.v as ControlShape);
    const px = rows.find((r) => `radius.${r.name}` === ref)?.px ?? 0;
    const on = s.v === o.shape;
    const cell = hook(el('div', 'shp-shape' + (on ? ' on' : '')), 'control-shape');
    cell.dataset.shape = s.v;
    if (on) cell.setAttribute('aria-current', 'true');
    const bar = shapeSample(c, 'shp-bar');
    bar.style.height = `${o.heightPx}px`;
    bar.style.borderRadius = `${px}px`;
    cell.append(bar, el('span', 'mtbl-name shp-label', on ? `${s.l} · selected` : s.l), tokenPillSpan(ref));
    list.append(cell);
  }
  sec.append(list);
  return sec;
};
