/** The Style guide's radius sample (UI redesign S7, owner decision D18 B): a small sample of the brand's radius on
 *  Brand's Style guide, beside the type sample, so the brand's shape reads without opening Shape. A panel at the
 *  first container size (`radius.xl`) holding a field (`radius.sm`, as TextField binds it), a button (the radius
 *  Button binds under the brand's Control shape) and a tag (`radius.round`, as Tag binds it), each at the control
 *  height its definition uses in the previewed mode, each named by its token.
 *
 *  RADIUS AND SHADOW (D18 B asks for one radius-and-shadow sample; S7 drew the radius, S9.2 added the shadow). The
 *  panel is the one element a shadow sits on: it takes `shadow.sm`, the step the preview spec's Card binds, resolved for
 *  the previewed mode, and names it by its token beside `radius.xl`. The heading and description are DRAFT (S9.2
 *  renamed them to cover the shadow), pending the owner.
 *
 *  Drawn in the brand's own colors on the chosen ground (D2 A): the panel in `background.secondary`, the controls on it
 *  in `background.primary`, every edge `border.primary`; on the Style guide's Inverse ground, the inverse counterparts.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="radius-sample"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The section context, the resolved dimensions, the brand's modes, the mode, the Control shape
 *  and the section's copy. Nothing here reads the session. */
import type { Theme } from '@prism3/engine/theme';
import type { ControlShape } from '@prism3/engine/scale';
import { el, hook, palSection, specimen, tokenPillSpan, type SgCtx } from './kit';
import { radiusIn, shapeRef, shapeSample } from './radius';
import { heightsIn } from './control-heights';

/** The section's copy. DRAFT, pending the owner (S9.2 widened S7's draft, "Radius sample" / "The brand’s radius on a
 *  panel, a field, a button and a tag.", to cover the shadow). */
export const RADIUS_SAMPLE = { title: 'Radius and shadow sample', desc: 'The brand’s radius on a panel, a field, a button and a tag, and its shadow on the panel.' };
/** The shadow step the panel takes: the preview spec's Card binding (`packages/engine/preview.ts`). */
export const SAMPLE_SHADOW = 'shadow.sm';

export const radiusSampleSection = (c: SgCtx, o: {
  dims: Theme['dims']; modes: readonly string[]; mode: string; shape: ControlShape; copy: { title: string; desc: string };
  /** The ground is the inverse band: draw in the inverse roles. */
  inverse?: boolean; shadow?: string;
}): HTMLElement => {
  const sec = palSection(o.copy.title, o.copy.desc);
  sec.dataset.sgSection = 'radius-sample';   // the shared-section marker (`kit.ts`'s header)
  const radii = radiusIn(o.dims, o.modes, o.mode);
  const px = (ref: string): number => radii.find((r) => `radius.${r.name}` === ref)?.px ?? 0;
  const h = (step: string): number => heightsIn(o.dims, o.mode).find((z) => z.name === step)?.height ?? 0;
  const pre = o.inverse ? 'inverse.' : '';
  const panel = c.painted(specimen(hook(el('div', 'shp-panel'), 'radius-sample-panel')), `${pre}background.secondary`, 'background');
  panel.style.background = c.paint(c.cur, `${pre}background.secondary`);
  panel.style.borderColor = c.paint(c.cur, `${pre}border.primary`);
  panel.style.borderRadius = `${px('radius.xl')}px`;
  if (o.shadow) panel.style.boxShadow = o.shadow;   // the resolved CSS for the previewed mode
  const item = (ref: string, cls: string, height: number, role: string): HTMLElement => {
    const wrap = hook(el('div', 'shp-item'), role);
    wrap.dataset.ref = ref;
    // The controls on the panel take the page color, so they read against the panel's second tier.
    const s = shapeSample(c, cls, pre, 'background.primary');
    s.style.height = `${height}px`;
    s.style.borderRadius = `${px(ref)}px`;
    wrap.append(s, tokenPillSpan(ref));
    return wrap;
  };
  const row = el('div', 'shp-items');
  row.append(item('radius.sm', 'shp-field', h('md'), 'radius-sample-field'), item(shapeRef(o.shape), 'shp-button', h('md'), 'radius-sample-button'),
    item('radius.round', 'shp-tag', h('sm'), 'radius-sample-tag'));
  const pills = el('div', 'shp-pills');
  pills.append(tokenPillSpan('radius.xl'), ...(o.shadow ? [hook(tokenPillSpan(SAMPLE_SHADOW), 'radius-sample-shadow')] : []));
  panel.append(row, pills);
  sec.append(panel);
  return sec;
};
