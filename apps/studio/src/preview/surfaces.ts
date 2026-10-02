/**
 * Color › Surfaces & fills, the preview (UI redesign S4a).
 *
 * WHAT IT SHOWS: the legacy Style guide's Background, Foreground, Text color, Border and Icon sections, drawn
 * by the SAME code the Style guide draws them with (`preview/sections/`), each token chip with its ratio badge
 * beside it; then each gradient the brand ships, across the card at 160px (v5 review V8, "gradients large").
 * This departs from concept v6's own Surfaces & fills preview by the owner's decision (2026-10-01, Q5 in
 * `decisions-2026-10-01-qa.md`): the owner prefers the legacy sections. The gradients are the one part v6
 * draws that those five sections do not.
 *
 * LEGACY MARKUP IN A LIGHT-PINNED HOST. The sections draw in `styles.css`, which has no dark theme (D2), so
 * they sit in `p3-legacy-card` pinned light, as Inspect's lent views and the Style guide do.
 *
 * SPECIMENS SIT ON THE BRAND'S PAGE (plan §9.1). Each section's ground is a specimen root painted with the
 * brand's own `background.primary` for the mode the preview shows (the Page surface), never the chrome's card.
 *
 * HOW IT REPAINTS: by store subscription (`brand`, `mode`), never through a legacy tier. Nothing else moves
 * it: no scroll, no focus, no lever (V1).
 */
import type { ResolvedGradient } from '@prism3/engine/theme';
import { currentMode, rp, subscribe, theme } from '../state/store';
import { resolvedModes } from '../state/verdict';
import { h, hook } from '../shell/dom';
import { modeLabel } from '../shell/preview';
import { COLOR_SECTIONS } from './sections/index';
import { SG_SURFACES, el, ground, oppositeOf, palSection, sgContext, specimen, tokenPillSpan, type SgRole } from './sections/kit';

/** The CSS for a RESOLVED gradient: the engine's stops, at their positions, interpolated as it says. */
const gradientCss = (g: ResolvedGradient): string => {
  const stops = g.stops.slice().sort((a, b) => a.position - b.position).map((s) => `${s.hex} ${Math.round(s.position * 100)}%`).join(', ');
  return g.kind === 'radial'
    ? `radial-gradient(${g.shape} at ${Math.round(g.center[0] * 100)}% ${Math.round(g.center[1] * 100)}% in ${g.interpolation}, ${stops})`
    : `linear-gradient(${g.angle}deg in ${g.interpolation}, ${stops})`;
};

/** Mount the Surfaces & fills preview into `host`. Subscriptions are released through `cleanups`. */
export const mountSurfacesPreview = (host: HTMLElement, cleanups: (() => void)[]): void => {
  const stack = hook(h('div', 'p3-stack p3-preview-stack'), 'surfaces-preview');
  const card = hook(h('div', 'p3-legacy-card'), 'surfaces-style-guide');
  card.dataset.theme = 'light';
  stack.append(card);
  host.replaceChildren(stack);

  const paint = (): void => {
    const all = resolvedModes(theme);
    const rolesByMode = new Map<string, Record<string, SgRole | undefined>>(all.map((x) => [x.mode as string, x.roles as Record<string, SgRole | undefined>]));
    const cur: string = rolesByMode.has(currentMode) ? currentMode : rp.modes[0];
    const c = sgContext({
      rolesByMode, cur, opp: oppositeOf(cur, rp.modes, (m) => rolesByMode.has(m)), namespace: theme.namespace, modeLabel, badges: true,
      paletteHex: (p, s) => theme.palettes.find((x) => x.palette === p)?.steps.find((x) => x.key === s)?.hex ?? null,
    });
    // The Page surface: the brand's own `background.primary`, with its own ink and border set.
    const page = SG_SURFACES[0];
    const out: HTMLElement[] = COLOR_SECTIONS.map(([, section]) => ground(c, section(c), page));
    const grads = theme.gradient?.gradients ?? [];
    if (grads.length) {
      const sec = palSection('Gradients', 'Each gradient the brand ships, across the card. Stop colors alias the ramp.');
      const list = el('div', 'sg-grads');
      for (const g of grads) {
        const gw = el('div', 'sg-gcard');
        const bar = hook(specimen(el('div', 'sg-gbar')), 'gradient-specimen');
        bar.dataset.gradient = g.name;
        bar.style.background = gradientCss(g);
        const pills = el('div', 'sg-pills');
        pills.append(tokenPillSpan(`gradient.${g.name}`));
        gw.append(bar, pills);
        list.append(gw);
      }
      sec.append(list);
      out.push(ground(c, sec, page));
    }
    card.replaceChildren(...out);
  };
  cleanups.push(subscribe('brand', paint), subscribe('mode', paint));
  paint();
};
