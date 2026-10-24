/**
 * The plugin's left rail (#2909 IA v2 phase 1; the owner's decisions of 2026-10-24 on the round-3 wireframe, and the
 * round-4 wireframe's drafts): a 60px column of tiles, each its icon over a one-word label, the pattern Figma's own left
 * rail uses. Plugin only: the web studio keeps its top bar and tab row until Q2909.9 is built (phase 2).
 *
 * WHAT IT HOLDS, top to bottom:
 *   · the product mark (the logo; its name is the mark's accessible name);
 *   · the four areas, Theme · Components · Documentation · Export (`RAIL_AREAS`, `pages.ts`), each a place the panel
 *     opens: the area's current tile is filled and carries `aria-current="page"`;
 *   · at the foot, after a divider, the nodes the frame places: the Agent tile's slot (the plugin's own entry mounts the
 *     one-click toggle there, `apps/plugin/src/agent-link-ui.ts`; it fills and shows a green dot while the link is on),
 *     Help (the old bar's Docs, renamed so it does not collide with Documentation) and Appearance (the old bar's Theme
 *     menu, renamed so it does not collide with the Theme area).
 * Update file is not a rail item: it is the top bar's one global action (Q668 A).
 *
 * HOW IT TALKS TO THE REST: a tile click calls `go(area)`, which the frame turns into a page change; the frame calls
 * `paint(area)` after every render. Nothing here names a legacy repaint tier (`test-shell-imports.ts`).
 *
 * KEYBOARD: the rail is a `nav` landmark ("Areas") of plain buttons in the tab order. Arrow Up and Arrow Down move
 * between the area tiles, Home and End to the first and the last, as a toolbar of tiles would.
 *
 * The labels and icons are the owner's (Chunk 2, 2026-10-24: Q2909.19 A icons, Q2909.20 A labels). The rail keeps its
 * labels at 380 (Q2909.16 A). Its selected tile's fill is the mapped `fill-2` (Q2909.24 A).
 */
import { RAIL_AREAS, type AreaId } from './pages';
import { glyph, h, hook, tile } from './dom';

export type Rail = {
  readonly node: HTMLElement;
  /** Mark `area` as the current one. */
  readonly paint: (area: AreaId | null) => void;
};

/** Mount the rail. `foot` is the frame's own nodes for the rail's foot, in order (the Agent slot, Help, Appearance). */
export const mountRail = (opts: { readonly logo: HTMLElement; readonly go: (area: AreaId) => void; readonly foot: readonly HTMLElement[] }): Rail => {
  const node = hook(h('nav', 'p3-rail'), 'rail');
  node.setAttribute('aria-label', 'Areas');
  const mark = hook(h('div', 'p3-rail-mark'), 'rail-mark');
  mark.setAttribute('role', 'img');
  mark.setAttribute('aria-label', 'Prism3');
  opts.logo.setAttribute('aria-hidden', 'true');
  mark.append(opts.logo);
  const tiles = RAIL_AREAS.map((a) => {
    const { btn, mark: m, tip } = tile(`rail-${a.id}`, a.label);
    btn.classList.add('p3-rail-tile');
    btn.setAttribute('aria-label', a.name);
    tip.textContent = a.name;
    m.append(glyph(a.glyph));
    btn.onclick = () => opts.go(a.id);
    return btn;
  });
  const areas = hook(h('div', 'p3-rail-areas'), 'rail-areas');
  areas.append(...tiles);
  areas.addEventListener('keydown', (e) => {
    const i = tiles.indexOf(e.target as HTMLButtonElement);
    if (i < 0) return;
    const to = e.key === 'ArrowDown' ? tiles[(i + 1) % tiles.length] : e.key === 'ArrowUp' ? tiles[(i - 1 + tiles.length) % tiles.length]
      : e.key === 'Home' ? tiles[0] : e.key === 'End' ? tiles[tiles.length - 1] : null;
    if (!to) return;
    e.preventDefault();
    to.focus();
  });
  const foot = hook(h('div', 'p3-rail-foot'), 'rail-foot');
  foot.append(h('span', 'p3-rail-div'), ...opts.foot);
  node.append(mark, areas, foot);
  const paint = (area: AreaId | null): void => {
    RAIL_AREAS.forEach((a, i) => {
      if (a.id === area) tiles[i].setAttribute('aria-current', 'page');
      else tiles[i].removeAttribute('aria-current');
    });
  };
  return { node, paint };
};
