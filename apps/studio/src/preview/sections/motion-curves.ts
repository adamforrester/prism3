/** The six curves (UI redesign S9.1 lifted the legacy `renderEasingEditor`'s curve set here; S9.2 drew it in the
 *  Depth & motion preview's Motion section): each easing curve drawn, named, with its token, its numbers and the motion
 *  roles that use it in the mode in view (concept v6's Curves board). The curves are fixed; which one each role uses is
 *  the Motion levers' easing pickers, per mode (#522). Read-only.
 *
 *  Also exports `motionStageSvg`, the curve plot the transitions draw too, and `curveOfRole`, the curve a role uses in a
 *  mode: the mode's own re-point (`easingRolesByMode`) where it has one, else the brand's. Both the role tags here and
 *  the traced transitions read it, so the preview shows the previewed mode's curves (#2046).
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="motion-curves"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The resolved motion axis, the mode in view and the block's copy. Nothing here reads the session. */
import type { Theme } from '@prism3/engine/theme';
import { el, hook, subHead, tokenPillWrapping } from './kit';

/** The SVG namespace, for the specimens drawn as inline SVG. */
const SVGNS = 'http://www.w3.org/2000/svg';

/** The curve a motion role uses in `mode`: the mode's re-point, else the brand's choice (`easingRoles`). */
export const curveOfRole = (mo: Theme['motion'], mode: string, role: string): string =>
  mo.easingRolesByMode?.[mode]?.[role] ?? mo.easingRoles.find((r) => r.role === role)?.curve ?? 'standard';

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

export const motionCurvesSection = (mo: Theme['motion'], mode: string, copy: { title: string; desc: string }): HTMLElement => {
  const wrap = hook(el('div', 'dm-block'), 'depth-curves');
  wrap.dataset.sgSection = 'motion-curves';   // the shared-section marker (`kit.ts`'s header)
  wrap.append(subHead(copy.title), el('p', 'dm-desc', copy.desc));
  const roles = mo.easingRoles.map((r) => r.role);
  const strip = el('div', 'mo-ez-strip');
  for (const [name, bez] of Object.entries(mo.easing)) {
    const card = hook(el('div', 'mo-ez-card'), 'curve-card');
    card.dataset.curve = name;
    const stage = el('div', 'mo-ez-stage'); stage.append(motionStageSvg(bez as number[]));
    const tags = el('div', 'mo-ez-roles');
    for (const r of roles.filter((x) => curveOfRole(mo, mode, x) === name)) tags.append(hook(el('span', 'mo-ez-role', r), 'curve-role'));
    card.append(stage, el('div', 'mo-ez-name', name), tokenPillWrapping(`motion.easing.${name}`),
      el('div', 'mo-ez-bez mono', `${(bez as number[]).join(', ')}`), tags);
    strip.append(card);
  }
  wrap.append(strip);
  return wrap;
};
