/** The Layout preview's Grid section (UI redesign S10, owner decision D14, concept v6's V11): for each breakpoint, its
 *  columns drawn as bars in its primary tint on a gray margin, then its columns, gutter and margin, label first and
 *  token under each (QA-B2). The gutter is drawn at a quarter and the margin at a half of their px, so a 48px margin
 *  stays on a narrow pane. It shows what the lever section of the same name sets (Q23). Read-only.
 *
 *  THE READOUT IS THE ENGINE'S GRID. Each value is read straight off `theme.layout.grid`, the derivation the Figma
 *  grid-style emitter ships from (#1480), so it cannot disagree with what a brand exports. `data-bpcol`,
 *  `data-bpgut` and `data-bpmar` name each value for `test:smoke`'s #1532 check, whose oracle is the emitted
 *  `grid-styles.json`.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="grid"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The layout context, the section's copy, the hint under it and the three row labels. Nothing
 *  here reads the session. */
import { el, hook, palSection } from './kit';
import { layoutLabel, tinted, type LayoutCtx } from './layout-kit';

export const gridSection = (x: LayoutCtx, copy: { title: string; desc: string }, hint: string,
  labels: { columns: string; gutter: string; margin: string }): HTMLElement => {
  const sec = palSection(copy.title, copy.desc);
  sec.dataset.sgSection = 'grid';   // the shared-section marker (`kit.ts`'s header)
  sec.append(el('p', 'lyv-hint', hint));
  const ly = x.ly;
  ly.grid.forEach((g, i) => {
    const px = ly.breakpoints.find((b) => b.name === g.bp)?.px ?? 0;
    const row = hook(el('div', 'lyv-bprow'), 'layout-grid-row');
    row.dataset.bp = g.bp;
    const head = el('div', 'lyv-bphead');
    head.append(el('b', 'lyv-label', g.bp), el('span', 'lyv-sub mono', `${px}px`));
    const bars = tinted(x, 'lyv-cols', x.gray);
    bars.style.padding = `0 ${Math.max(4, g.marginPx / 2)}px`;
    bars.style.gap = `${Math.max(2, g.gutterPx / 4)}px`;
    bars.style.gridTemplateColumns = `repeat(${g.columns}, minmax(0, 1fr))`;
    for (let k = 0; k < g.columns; k++) bars.append(tinted(x, 'lyv-col', x.tint(i)));
    const vals = el('div', 'lyv-vals');
    vals.append(
      layoutLabel(labels.columns, `grid.${g.bp}.columns`, String(g.columns), ['bpcol', g.bp]),
      layoutLabel(labels.gutter, `grid.${g.bp}.gutter`, `${g.gutterPx}px`, ['bpgut', g.bp]),
      layoutLabel(labels.margin, `grid.${g.bp}.margin`, `${g.marginPx}px`, ['bpmar', g.bp]),
    );
    row.append(head, bars, vals);
    sec.append(row);
  });
  return sec;
};
