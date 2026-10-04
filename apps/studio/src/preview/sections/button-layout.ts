/** The button-layout specimen (#1667; UI redesign S8.1, lifted from `main.ts`'s `paintButtonLayoutPreview`, unchanged
 *  in output): per size, a short-label button at its derived minimum width, and two WIDENED buttons — leading +
 *  trailing icons, and trailing only — so "Locked to edges" is visible: the icons sit at the edges and the label
 *  centers in the space between them, which puts a trailing-only label slightly left of the button's center. The same
 *  construction as the Figma build: floor = height × multiplier rounded up to 8 (`buttonMinWidth`), padding split by
 *  side (#326), and under "Locked to edges" each icon absolutely positioned at the visual padding with its side padded
 *  by that padding + icon + gap, so the button still hugs a longer label. Under "One step smaller" the medium size
 *  takes small's label size and icon, and every label takes the weight "Button label weight" picks (#1752). Geometry
 *  and weight only, in the page ink — the colors are the Colors page's job. Mode-aware: the heights are the mode's own
 *  (`sizesByMode`). Read-only. The legacy Size & radius page draws it; the Components page (S8.2) will draw the same
 *  code.
 *
 *  THE CORNER IS HANDED IN (`radiusPx`), and the legacy caller hands it `rp.dims['radius.md']`, the base value, which
 *  ignores Control shape and the previewed mode's corner: that is #2049, kept here on purpose (S8.1 is behavior-
 *  neutral; S8.2 fixes it, owner decision G7). `lint-ramp-values` arm C watches that literal read where it stands.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="button-layout"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The four Button options as the brand sets them, the resolved theme, the mode in view and the
 *  corner. Nothing here reads the session. */
import type { Theme } from '@prism3/engine/theme';
import { buttonMinWidth, ICON_SIZES, sizeRefPx, densitySpacingStep } from '@prism3/engine/scale';
import { BUTTON_SPACING } from '@prism3/engine/button-spacing';
import type { ButtonLayoutView } from '../../state/button-input';
import { el } from './kit';

/** The three sizes the specimen draws: the size step, the icon size and the label variant each binds. */
export const BUTTON_SIZES: { size: string; step: string; icon: string; label: string }[] = [
  { size: 'Small', step: 'sm', icon: 'xs', label: 'sm' },
  { size: 'Medium', step: 'md', icon: 'sm', label: 'md' },
  { size: 'Large', step: 'lg', icon: 'md', label: 'lg' },
];

export const buttonLayoutSection = (layout: ButtonLayoutView, theme: Theme, mode: string, radiusPx: number): HTMLElement => {
  const { edges, smaller, mult, labelRole } = layout;
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
    const button = (text: string, lead: boolean, trail: boolean, width?: number): HTMLElement => {
      const btn = el('div', 'btnl-btn');
      btn.style.height = `${z.height}px`;
      btn.style.minWidth = `${floor}px`;
      btn.style.borderRadius = `${radiusPx}px`;
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
      const label = el('span', 'btnl-label', text);
      label.style.fontSize = `${labelPx}px`;
      label.style.fontWeight = String(labelWeight);
      if (lead) btn.append(glyph('left'));
      btn.append(label);
      if (trail) btn.append(glyph('right'));
      return btn;
    };
    const row = el('div', 'btnl-row');
    row.append(
      el('div', 'btnl-lab mono', `${b.size} · ${z.height}px high · min ${floor}px${off ? ' · small label & icon' : ''}`),
      button('OK', false, false),
      button('Continue', true, true, wide),
      button('Continue', false, true, wide),
    );
    list.append(row);
  }
  return list;
};
