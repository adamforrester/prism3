/** The button-layout specimen (#1667; UI redesign S8.1 lifted it from `main.ts`, S8.2 draws it on Components): per
 *  size, a short-label button at its derived minimum width, and two WIDENED buttons — leading + trailing icons, and
 *  trailing only — so "Locked to edges" is visible: the icons sit at the edges and the label centers in the space
 *  between them, which puts a trailing-only label slightly left of the button's center. The same construction as the
 *  Figma build: floor = height × multiplier rounded up to 8 (`buttonMinWidth`), padding split by side (#326), and under
 *  "Locked to edges" each icon absolutely positioned at the visual padding with its side padded by that padding + icon
 *  + gap, so the button still hugs a longer label. Under "One step smaller" the medium size takes small's label size and
 *  icon, and every label takes the weight "Button label weight" picks (#1752). Mode-aware: the heights are the mode's
 *  own (`sizesByMode`). Read-only.
 *
 *  THE CORNER IS THE ENGINE'S (#2049, fixed in S8.2, owner decision G7 A). A button binds the radius size its brand's
 *  Control shape repoints it to (`applyControlShape`: rounded keeps `radius.md`, pill takes `radius.capsule`, boxed
 *  `radius.none`, hairline `radius.hairline`), read here from the generated "used by" index (`shapeRef`), at that
 *  size's value IN THE PREVIEWED MODE (`radiusIn`, the emission's rule: a mode's own radius softness, wireframe's 0).
 *  Drawn clamped to half the button's height, which is what both CSS and Figma draw for a larger corner, so Pill
 *  (999px) is fully round at any height. `buttonCornerPx` is the one function; `test-button-input.ts` holds it against
 *  the engine's own `applyControlShape` and the brand's emission, and `test:smoke` holds the drawn corner.
 *
 *  DRAWN IN THE BRAND'S ACTION COLORS ON ITS PAGE (G7 A): each button is filled with `interactive.primary.fill.rest`
 *  and its label and icons drawn in `interactive.primary.on-fill`, for the mode, on the section's ground (the brand's
 *  `background.primary`). Each button is a specimen (the brand's ink, not the chrome's), and `test:smoke` holds each
 *  label to the contract the emission declares for that pair (`interactive.primary.on-fill` against `fill.rest`).
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="button-layout"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The four Button options as the brand sets them, the resolved theme, the section context (the
 *  mode in view and the brand's roles), the brand's Control shape and the label copy. Nothing here reads the session. */
import type { Theme } from '@prism3/engine/theme';
import { buttonMinWidth, ICON_SIZES, sizeRefPx, densitySpacingStep, type ControlShape } from '@prism3/engine/scale';
import { BUTTON_SPACING } from '@prism3/engine/button-spacing';
import type { ButtonLayoutView } from '../../state/button-input';
import { el, specimen, type SgCtx } from './kit';
import { radiusIn, shapeRef } from './radius';

/** The roles a button is drawn in (G7 A): the primary action's resting fill and the ink on it. */
export const BUTTON_FILL = 'interactive.primary.fill.rest';
export const BUTTON_INK = 'interactive.primary.on-fill';

/** The corner a button of `heightPx` takes, in px: the radius size the brand's Control shape binds (`shapeRef`), at
 *  its value in `mode` (`radiusIn`), clamped to half the height (see the header). */
export const buttonCornerPx = (dims: Theme['dims'], modes: readonly string[], mode: string, shape: ControlShape, heightPx: number): number => {
  const ref = shapeRef(shape);
  const px = radiusIn(dims, modes, mode).find((r) => `radius.${r.name}` === ref)?.px ?? 0;
  return Math.min(px, heightPx / 2);
};

/** The row label under each size (DRAFT copy, S8.2). */
export type ButtonLayoutCopy = { row: (size: string, height: number, minWidth: number) => string; smaller: string };

/** The three sizes the specimen draws: the size step, the icon size and the label variant each binds. */
export const BUTTON_SIZES: { size: string; step: string; icon: string; label: string }[] = [
  { size: 'Small', step: 'sm', icon: 'xs', label: 'sm' },
  { size: 'Medium', step: 'md', icon: 'sm', label: 'md' },
  { size: 'Large', step: 'lg', icon: 'md', label: 'lg' },
];

export const buttonLayoutSection = (layout: ButtonLayoutView, theme: Theme, c: SgCtx, o: { shape: ControlShape; modes: readonly string[]; copy: ButtonLayoutCopy }): HTMLElement => {
  const { edges, smaller, mult, labelRole } = layout;
  const mode = c.cur;
  const fill = c.paint(mode, BUTTON_FILL), ink = c.paint(mode, BUTTON_INK);
  // #1752 — the label's weight is the brand's number for the role "Button label weight" picks, in the mode in view.
  // Both lists carry every weight role (the engine maps `WEIGHT_ROLE_ORDER`), so the role is always found.
  const labelWeight = (theme.typography.weightRolesByMode?.[mode] ?? theme.typography.weightRoles).find((w) => w.role === labelRole)!.value;
  const sizes = theme.dims.sizesByMode?.[mode] ?? theme.dims.sizes;
  // Button's spacing is its own spec's (the spacing model): its comfortable `space.*` steps, moved one step for
  // the brand's density, exactly as the Figma build materializes them. The brand's BASELINE density — a Figma
  // component binds one space variable per side, so a mode's own density moves its heights, not this.
  // Read from the data-only `button-spacing.ts`, never from `componentDefs`: a reference to the defs would pull every
  // def's prose into the web bundle (`vercel-ignore-check.mjs` fails by name when one does).
  const spacePx = sizeRefPx(theme.dims.sizes);
  const list = el('div', 'btnl-list');
  list.dataset.sgSection = 'button-layout';   // the shared-section marker (`kit.ts`'s header)
  for (const b of BUTTON_SIZES) {
    const h = sizes.find((x) => x.name === b.step);
    if (!h) continue;
    const at = (k: string): number => { const key = `size.${b.size.toLowerCase()}.${k}`; return spacePx(densitySpacingStep(key, (BUTTON_SPACING as Record<string, string>)[key], theme.dims.density)) ?? 0; };
    const z = { height: h.height, padX: at('padding-x'), padXVisual: at('padding-x-visual'), gap: at('gap') };
    const off = smaller && b.step === 'md';
    const iconPx = ICON_SIZES.find((i) => i.name === (off ? 'xs' : b.icon))?.px ?? 16;
    const labelPx = theme.typography.composites.find((c) => c.group === 'label' && c.variant === (off ? 'sm' : b.label))?.sizePx ?? 14;
    const floor = buttonMinWidth(z.height, mult);
    const wide = Math.max(floor, 240);
    const corner = buttonCornerPx(theme.dims, o.modes, mode, o.shape, z.height);
    const button = (text: string, lead: boolean, trail: boolean, width?: number): HTMLElement => {
      const btn = specimen(c.painted(el('div', 'btnl-btn'), BUTTON_FILL, 'background'));
      btn.style.height = `${z.height}px`;
      btn.style.minWidth = `${floor}px`;
      btn.style.borderRadius = `${corner}px`;
      btn.dataset.corner = String(corner);
      btn.dataset.step = b.step;
      btn.style.background = fill;
      btn.style.color = ink;
      btn.style.gap = `${z.gap}px`;
      const reserve = z.padXVisual + iconPx + z.gap;
      btn.style.paddingLeft = `${lead ? (edges ? reserve : z.padXVisual) : z.padX}px`;
      btn.style.paddingRight = `${trail ? (edges ? reserve : z.padXVisual) : z.padX}px`;
      if (width !== undefined) btn.style.width = `${width}px`;
      const glyph = (side: 'left' | 'right'): HTMLElement => {
        const g = el('span', 'btnl-icon' + (edges ? ' btnl-pinned' : ''));
        g.style.width = g.style.height = `${iconPx}px`;
        if (edges) g.style[side] = `${z.padXVisual}px`;
        return g;
      };
      const label = c.painted(el('span', 'btnl-label', text), BUTTON_INK, 'color');
      label.style.color = ink;
      label.style.fontSize = `${labelPx}px`;
      label.style.fontWeight = String(labelWeight);
      if (lead) btn.append(glyph('left'));
      btn.append(label);
      if (trail) btn.append(glyph('right'));
      return btn;
    };
    const row = el('div', 'btnl-row');
    row.append(
      el('div', 'btnl-lab mono', `${o.copy.row(b.size, z.height, floor)}${off ? o.copy.smaller : ''}`),
      button('OK', false, false),
      button('Continue', true, true, wide),
      button('Continue', false, true, wide),
    );
    list.append(row);
  }
  return list;
};
