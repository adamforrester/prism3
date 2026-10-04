/** The curve set (UI redesign S9.1, lifted from `main.ts`'s `renderEasingEditor`, unchanged in output): the six
 *  easing curves, each drawn, named, with its token and its numbers. Read-only. The legacy Motion page draws it
 *  as its Easing section and appends its Easing per mode table under it; the Depth & motion page (S9.2) will draw
 *  the same code. Also exports `motionStageSvg`, the curve plot the transitions specimen draws too.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="motion-curves"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The resolved curves (`theme.motion.easing`). Nothing here reads the session. */
import type { Theme } from '@prism3/engine/theme';
import { el, palSection, subHead, tokenPillWrapping } from './kit';

/** The SVG namespace, for the specimens drawn as inline SVG. */
const SVGNS = 'http://www.w3.org/2000/svg';

/** The easing curve for one stage, plotted 0→1 in a 100-unit viewBox (SVG). Y is flipped (SVG y grows
 *  down). Percent-based, not px, so the stage scales for free. */
export const motionStageSvg = (bez: number[]): SVGElement => {
  const W = 100, H = 100, P = 11.364;
  const x = (t: number): number => P + t * (W - 2 * P);
  const y = (v: number): number => H - P - v * (H - 2 * P);
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('class', 'mo-stage-svg');
  const axis = document.createElementNS(SVGNS, 'path');
  axis.setAttribute('d', `M${x(0)},${y(1)} L${x(0)},${y(0)} L${x(1)},${y(0)}`);
  axis.setAttribute('class', 'mo-stage-axis'); axis.setAttribute('fill', 'none');
  const [x1, y1, x2, y2] = bez.length === 4 ? bez : [0.4, 0, 0.2, 1];
  const line = document.createElementNS(SVGNS, 'path');
  line.setAttribute('d', `M${x(0)},${y(0)} C${x(x1)},${y(y1)} ${x(x2)},${y(y2)} ${x(1)},${y(1)}`);
  line.setAttribute('class', 'mo-stage-line'); line.setAttribute('fill', 'none');
  svg.append(axis, line);
  return svg;
};

export const motionCurvesSection = (easing: Theme['motion']['easing']): HTMLElement => {
  // "the Motion specimen's emphasized BAR" was a stale reference — the specimen was rebuilt as curve
  // cards and has had no bars since; the copy outlived the rendering it pointed at.
  // No backticks in visible copy — el() escapes its text, so markdown ships literally (doc 26).
  const wrap = palSection('Easing', 'Six curves, fixed — no curve’s numbers are authored or change per mode. What you choose is which curve each motion role uses: once for the brand, and per mode where a mode wants to differ. The Motion specimen traces the emphasized card.');
  wrap.dataset.sgSection = 'motion-curves';   // the shared-section marker (`kit.ts`'s header)
  // The four-input bezier editor for `emphasized` was removed here. It was the only curve whose numbers
  // could be hand-tuned, which made the section inconsistent with itself — and no brand had ever used
  // it: aurora, harbor, nb and wendys all emitted the identical default [0.4, 0.14, 0.3, 1]. The rare
  // capability had shipped while the common one (which curve a role uses) was not settable at all.
  // The curve set is now curated the way the type-size ladder is: you pick from it, you do not author
  // it. A brand that genuinely needs its own curve should get a seventh NAMED curve in the set, not a
  // role whose numbers drift away from what its name says.
  // Every curve, drawn. `linear` and `calm` appeared NOWHERE in the app before this — the section was
  // titled "Easing" and showed one of six. `calm` in particular is an accessibility role (soft onset
  // for long/involuntary motion), which is not a thing to leave undiscoverable.
  wrap.append(subHead('The curve set'));
  const strip = el('div', 'mo-ez-strip');
  for (const [name, bez] of Object.entries(easing)) {
    const card = el('div', 'mo-ez-card');
    const stage = el('div', 'mo-ez-stage'); stage.append(motionStageSvg(bez as number[]));
    card.append(stage, el('div', 'mo-ez-name', name), tokenPillWrapping(`motion.easing.${name}`),
      el('div', 'mo-ez-bez mono', `${(bez as number[]).join(', ')}`));
    strip.append(card);
  }
  wrap.append(strip);
  return wrap;
};
