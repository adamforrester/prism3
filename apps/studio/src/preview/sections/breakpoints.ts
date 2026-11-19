/** The Layout preview's Breakpoints section (UI redesign S10, owner decision D14, concept v6's V11): every breakpoint's
 *  range on one strip, to scale, each in its own primary tint with its name; the width each starts at under the strip;
 *  then each breakpoint, label first and its token under it, with the type mode its frames use by default (#2935). It
 *  shows what the lever section of the same name sets (Q23). Read-only.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="breakpoints"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The layout context, the section's copy and the hint under it. Nothing here reads the session. */
import { defaultTypeMode } from '@prism3/engine';
import { el, hook, palSection } from './kit';
import { layoutLabel, tinted, type LayoutCtx } from './layout-kit';

export const breakpointsSection = (x: LayoutCtx, copy: { title: string; desc: string }, hint: string): HTMLElement => {
  const sec = palSection(copy.title, copy.desc);
  sec.dataset.sgSection = 'breakpoints';   // the shared-section marker (`kit.ts`'s header)
  const bps = x.ly.breakpoints;
  // The strip runs a quarter past the widest breakpoint, so the last range has room to read (v6's scale).
  const top = Math.max(1, ...bps.map((b) => b.px)) * 1.25;
  sec.append(el('p', 'lyv-hint', hint));
  const strip = hook(el('div', 'lyv-strip'), 'layout-strip');
  const ticks = el('div', 'lyv-ticks');
  ticks.setAttribute('aria-hidden', 'true');
  bps.forEach((b, i) => {
    const next = bps[i + 1]?.px ?? top;
    const r = tinted(x, 'lyv-range', x.tint(i), b.name);
    r.style.width = `${((next - b.px) / top) * 100}%`;
    r.dataset.bp = b.name;
    hook(r, 'layout-range');
    strip.append(r);
    const t = el('span', i === 0 ? 'lyv-tick lyv-tick-first mono' : 'lyv-tick mono', `${b.px}`);
    t.style.left = `${(b.px / top) * 100}%`;
    ticks.append(t);
  });
  sec.append(strip, ticks);
  const list = el('div', 'lyv-list');
  // #2935: with fluid type, each breakpoint also says which type mode its frames start from, the engine's rule.
  for (const b of bps) {
    const lab = layoutLabel(b.name, `breakpoint.${b.name}`, x.fluidType ? `${b.px}px, ${defaultTypeMode(b.px)} type` : `${b.px}px`, ['bppx', b.name]);
    if (x.fluidType) lab.dataset.bptype = defaultTypeMode(b.px);
    list.append(lab);
  }
  sec.append(list);
  return sec;
};
