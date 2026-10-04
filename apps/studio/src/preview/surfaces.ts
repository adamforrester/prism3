/**
 * Color › Surfaces & fills, the preview (UI redesign S4a).
 *
 * WHAT IT SHOWS: the legacy Style guide's Background, Foreground, Text color, Border and Icon sections, drawn
 * by the SAME code the Style guide draws them with (`preview/sections/`), each token chip with its ratio badge
 * beside it; the legacy Interactive page's Focus ring section after Border, read-only (owner decision Q30,
 * S4c; customizing it is #1966); then each gradient the brand ships, across the card at 160px (v5 review V8, "gradients large").
 * This departs from concept v6's own Surfaces & fills preview by the owner's decision (2026-10-01, Q5 in
 * `decisions-2026-10-01-qa.md`): the owner prefers the legacy sections. The gradients are the one part v6
 * draws that those five sections do not.
 *
 * S4f ADDS, each its own shared module so it carries its marker: **Scrim** after Background, out of it (the owner's
 * QA-B10; the Background section then ends on its inverse tiers, with the levers' description, Q23), and **Fields**
 * after Icon (#2016, Q80), the field roles in each state on the page and on the inverse fill.
 *
 * WHICH SECTIONS SIT ON THE PAGE (S4f, the owner's #1971, Q81). Background and Foreground are the grounds the other
 * colors are measured against, so they sit in WHITE containers (`whiteGround`) and carry no ratio badge (their
 * context is built with `badges: false`). Every other section checks contrast against the page, so it sits on the
 * page color with its badges. A badge's pass or miss mark takes the chrome's success or danger icon color, from the
 * chrome theme that reads best on the ground under it (`badge-marks.ts`, QA-I2).
 *
 * LEGACY MARKUP IN A LIGHT-PINNED HOST. The sections draw in `styles.css`, which has no dark theme (D2), so
 * they sit in `p3-legacy-card` pinned light, as Inspect's lent views and the Style guide do. Each section's
 * container takes the levers panel's gray (`p3-sgsec` in `chrome.css`, owner decision Q24), read in
 * the host's pinned light theme; the specimen ground inside it keeps the brand's page color, or white (above).
 *
 * SPECIMENS SIT ON THE BRAND'S PAGE (plan §9.1). Each contrast-checking section's ground is a specimen root painted
 * with the brand's own `background.primary` for the mode the preview shows (the Page surface), never the chrome's card.
 *
 * HOW IT REPAINTS: by store subscription (`brand`, `mode`), never through a legacy tier. Nothing else moves
 * it: no scroll, no focus, no lever (V1).
 */
import type { ResolvedGradient } from '@prism3/engine/theme';
import { currentMode, rp, subscribe, theme } from '../state/store';
import { resolvedModes } from '../state/verdict';
import { h, hook } from '../shell/dom';
import { BACKGROUND_FILLS_DESC, FIELDS_DESC, SCRIM_DESC } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { backgroundSection, borderSection, fieldsSection, focusRingSection, foregroundSection, iconSection, scrimSection, textColorSection } from './sections/index';
import { SG_SURFACES, el, ground, oppositeOf, palSection, sgContext, specimen, tokenPillSpan, whiteGround, type SgRole } from './sections/kit';
import { themeBadgeMarks } from './badge-marks';

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
  const card = hook(h('div', 'p3-legacy-card p3-marks'), 'surfaces-style-guide');
  card.dataset.theme = 'light';
  stack.append(card);
  host.replaceChildren(stack);

  const paint = (): void => {
    const all = resolvedModes(theme);
    const rolesByMode = new Map<string, Record<string, SgRole | undefined>>(all.map((x) => [x.mode as string, x.roles as Record<string, SgRole | undefined>]));
    const cur: string = rolesByMode.has(currentMode) ? currentMode : rp.modes[0];
    const ctx = (badges: boolean): ReturnType<typeof sgContext> => sgContext({
      rolesByMode, cur, opp: oppositeOf(cur, rp.modes, (m) => rolesByMode.has(m)), namespace: theme.namespace, modeLabel, badges,
      paletteHex: (p, s) => theme.palettes.find((x) => x.palette === p)?.steps.find((x) => x.key === s)?.hex ?? null,
    });
    const c = ctx(true);
    // #1971 (Q81): the grounds themselves, on white and without badges.
    const plain = ctx(false);
    // The Page surface: the brand's own `background.primary`, with its own ink and border set.
    const page = SG_SURFACES[0];
    const out: HTMLElement[] = [
      whiteGround(backgroundSection(plain, { desc: BACKGROUND_FILLS_DESC })),
      ground(c, scrimSection(c, SCRIM_DESC), page),
      whiteGround(foregroundSection(plain)),
      ground(c, textColorSection(c), page),
      ground(c, borderSection(c), page),
      // The focus ring, read-only, right after Border (owner decision Q30), in the previewed mode's ring color.
      ground(c, focusRingSection(c.paint(cur, 'border.focus')), page),
      ground(c, iconSection(c), page),
      ground(c, fieldsSection(c, FIELDS_DESC), page),
    ];
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
    // Q24: each section container on the levers panel's gray (the class S5.2's Interactive preview uses too).
    for (const s of out) s.classList.add('p3-sgsec');
    card.replaceChildren(...out);
    // QA-I2: the marks read the composited ground under them, so they are themed once the card is drawn in place.
    themeBadgeMarks(card);
  };
  cleanups.push(subscribe('brand', paint), subscribe('mode', paint));
  paint();
};
