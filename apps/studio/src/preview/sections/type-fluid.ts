/** What fluid heading sizing does (UI redesign S6.1: lifted out of `main.ts`'s `paintFluidPreview` unchanged in
 *  output, so the new Type page can draw it when responsive moves there). Each scaling style's mobile and
 *  desktop px with a bar, its generated `clamp()`, and the sizes that merge on mobile. Read-only.
 *
 *  A PAINT, NOT A SECTION. It fills a node the caller owns (Layout's "Responsive type sizing" preview region,
 *  repainted on every `apply()`), so it stamps the shared-section marker on THAT node
 *  (`data-sg-section="type-fluid"`, `kit.ts`'s header) rather than on a root of its own: wrapping the output
 *  would change it.
 *  WHAT IT IS HANDED. The node and the resolved typography. Nothing here reads the session. */
import type { Theme } from '@prism3/engine/theme';
import { el, subHead } from './kit';

export const paintTypeFluid = (into: HTMLElement, ty: Theme['typography']): void => {
  into.dataset.sgSection = 'type-fluid';   // the shared-section marker (`kit.ts`'s header)
  into.innerHTML = '';
  const seen = new Set<string>();
  const uniq = ty.composites.filter((c) => c.sizeMinPx !== c.sizePx)
    .filter((c) => { const k = `${c.group}.${c.variant}`; if (seen.has(k)) return false; seen.add(k); return true; });
  // Fluid off (or nothing scaling) is a real state, not an empty one: say why the panel is bare.
  if (!uniq.length) { into.append(el('p', 'sl-note', 'Nothing is scaling right now — every style resolves to a single size across the whole viewport range. Turn on fluid heading sizing to see the mobile floor and the generated clamp() for each style that scales.')); return; }
  into.append(subHead(`What fluid does — ${uniq.length} scaling styles`));
  const maxPx = Math.max(...uniq.map((c) => c.sizePx));
  const list = el('div', 'fz-list');
  for (const c of uniq) {
    const row = el('div', 'fz-row');
    row.append(el('span', 'fz-name mono', `${c.group}.${c.variant}`), el('span', 'fz-pair mono', `${c.sizeMinPx} → ${c.sizePx}px`));
    const right = el('div', 'fz-right');
    const bar = el('div', 'fz-bar');
    const fill = el('div', 'fz-fill');
    fill.style.left = `${(c.sizeMinPx / maxPx) * 100}%`;
    fill.style.width = `${((c.sizePx - c.sizeMinPx) / maxPx) * 100}%`;
    bar.append(fill);
    const slope = (c.sizePx - c.sizeMinPx) / (ty.maxViewport - ty.minViewport);
    const intercept = (c.sizeMinPx - slope * ty.minViewport) / 16;
    const clamp = `clamp(${+(c.sizeMinPx / 16).toFixed(4)}rem, ${+intercept.toFixed(4)}rem + ${+(slope * 100).toFixed(4)}vw, ${+(c.sizePx / 16).toFixed(4)}rem)`;
    const cl = el('div', 'fz-clamp mono', clamp); cl.title = clamp;
    right.append(bar, cl);
    row.append(right);
    list.append(row);
  }
  into.append(list);
  into.append(el('p', 'sl-note', 'The mobile floor is derived, not chosen: you set whether headings scale and the viewport range, but the floor comes from a fixed curve — titles drop about one rung, display converges hard so hero type stays usable on a phone.'));
  // The convergence is deliberate but invisible: several desktop sizes can share one floor.
  const byFloor = new Map<number, string[]>();
  for (const c of uniq) { const k = c.sizeMinPx; byFloor.set(k, [...(byFloor.get(k) ?? []), `${c.group}.${c.variant}`]); }
  const merged = [...byFloor.entries()].filter(([, v]) => v.length > 1);
  if (merged.length) {
    const w = el('p', 'fz-warn');
    w.append(el('b', undefined, 'Sizes that merge on mobile. '));
    w.append(document.createTextNode(`${merged.map(([px, v]) => `${v.join(' + ')} all land on ${px}px`).join('; ')} — distinct on desktop, identical on a phone. Fine if deliberate; a sign of more display steps than the mobile curve can express if not.`));
    into.append(w);
  }
};
