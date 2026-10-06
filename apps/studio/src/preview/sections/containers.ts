/** The Layout preview's Containers section (UI redesign S10, owner decision D14): the full width, the maximum width and
 *  the content container as bars to scale, each label first and token under it (QA-B2). It shows what the lever
 *  section of the same name sets (Q23). Read-only.
 *
 *  TO SCALE AGAINST THE WIDEST BREAKPOINT (the scope's T10, today's rule): not against the maximum width, which made
 *  that bar 100% by construction, so its own slider could never move it. A cap wider than the widest breakpoint draws
 *  the full track, which is what it does on that screen.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="containers"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The layout context, the section's copy, the hint (given the reference width) and the three
 *  labels. Nothing here reads the session. */
import { el, hook, palSection } from './kit';
import { layoutLabel, tinted, type LayoutCtx } from './layout-kit';

/** The width the container bars are drawn against: the widest breakpoint. */
export const containerReference = (x: LayoutCtx): number => Math.max(1, ...x.ly.breakpoints.map((b) => b.px));

export const containersSection = (x: LayoutCtx, copy: { title: string; desc: string }, hint: (px: number) => string,
  labels: { fluid: string; max: string; narrow: string }): HTMLElement => {
  const sec = palSection(copy.title, copy.desc);
  sec.dataset.sgSection = 'containers';   // the shared-section marker (`kit.ts`'s header)
  const ref = containerReference(x);
  sec.append(el('p', 'lyv-hint', hint(ref)));
  const ly = x.ly;
  const rows: [string, string, number, string, number][] = [
    [labels.fluid, 'container.fluid', ref, '100%', 0],
    [labels.max, 'container.max', ly.containerMax, `${ly.containerMax}px`, 1],
    [labels.narrow, 'container.narrow', ly.containerNarrow, `${ly.containerNarrow}px`, 3],
  ];
  for (const [label, token, px, value, step] of rows) {
    const row = hook(el('div', 'lyv-cont'), 'layout-container');
    row.dataset.token = token;
    const track = tinted(x, 'lyv-track', x.gray);
    const bar = tinted(x, 'lyv-bar', x.tint(step));
    bar.style.width = `${Math.max(2, Math.min(100, (px / ref) * 100))}%`;
    hook(bar, 'layout-container-bar');
    track.append(bar);
    row.append(layoutLabel(label, token, value), track);
    sec.append(row);
  }
  return sec;
};
