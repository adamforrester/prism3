/** The Type preview's Building blocks section (UI redesign S6.3, owner decision Q73): the fixed steps every brand
 *  shares, read-only, so every typography primitive has a row somewhere (Q20): the size ladder, the line height
 *  steps and the letter spacing steps, each with what uses it in the previewed mode and a specimen. They are fixed
 *  by design (#377, #384), so no lever section pairs with this one. It lifts the legacy Primitives tab's size
 *  ladder and its line height and letter spacing ladders (`main.ts`' `renderSizeLadder` and `renderRungLadders`).
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="building-blocks"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The section context, the resolved typography, the mode and the section's copy. Nothing here
 *  reads the session. */
import { LINE_HEIGHT_LADDER, LETTER_SPACING_LADDER, type Theme } from '@prism3/engine/theme';
import { emToPercentLabel } from '../../em-percent';
import { el, hook, palSection, specimen, subHead, type SgCtx } from './kit';

export const buildingBlocksSection = (c: SgCtx, ty: Theme['typography'], mode: string, copy: { title: string; desc: string }): HTMLElement => {
  const sec = palSection(copy.title, copy.desc);
  sec.dataset.sgSection = 'building-blocks';   // the shared-section marker (`kit.ts`'s header)
  const fams = ty.familiesByMode?.[mode] ?? ty.families;
  const stack = (g: string): string => fams.find((f) => f.group === g)?.stack.map((x) => (/^[a-z-]+$/.test(x) ? x : `"${x}"`)).join(', ') ?? 'inherit';
  const table = (caption: string, hk: string, rows: { name: string; who: string; paint: (e: HTMLElement) => void }[]): void => {
    sec.append(subHead(caption));
    const box = el('div', 'mtbl');
    const scroll = el('div', 'mtbl-scroll');
    const t = el('table', 'mtbl-tbl');
    const head = el('thead'), htr = el('tr');
    ['Step', 'Used by', 'Specimen'].forEach((x, i) => htr.append(el('th', i === 0 ? 'mtbl-stick' : i === 2 ? 'mtbl-fill mtbl-spec' : 'mtbl-mode', x)));
    head.append(htr);
    const tb = el('tbody');
    for (const r of rows) {
      const tr = hook(el('tr'), hk);
      tr.dataset.step = r.name;
      const nc = el('td', 'mtbl-stick');
      nc.append(el('span', 'mtbl-name mono', r.name));
      const who = el('td', 'mtbl-mode');
      who.append(el('span', 'ltbl-who' + (r.who === 'Not used' ? ' none' : ''), r.who));
      const spec = el('td', 'mtbl-fill mtbl-spec');
      const samp = c.painted(specimen(el('div', 'ltbl-samp')), 'text.primary', 'color');
      samp.style.color = c.paint(c.cur, 'text.primary');
      r.paint(samp);
      spec.append(samp);
      tr.append(nc, who, spec);
      tb.append(tr);
    }
    t.append(head, tb); scroll.append(t); box.append(scroll);
    sec.append(box);
  };
  // Sizes, largest first: every lever acts on the heading end, so the steps that move are the ones in view.
  const sizeIn = (x: Theme['typography']['composites'][number]): number => x.sizeByMode?.[mode] ?? x.sizePx;
  table('Size', 'building-size', [...ty.sizesPx].reverse().map((px) => {
    const who = [...new Set(ty.composites.filter((x) => sizeIn(x) === px).map((x) => x.group))];
    return { name: `${px}px`, who: who.length ? who.join(', ') : ty.composites.some((x) => x.sizeMinPx === px) ? 'Mobile only' : 'Not used',
      paint: (e) => { e.textContent = 'Ag'; e.style.fontFamily = stack('display'); e.style.fontSize = `${Math.min(px, 64)}px`; e.style.lineHeight = '1.1'; } };
  }));
  const lhSwap = ty.lineHeightRepointByMode?.[mode] ?? {};
  const lsSwap = ty.letterSpacingRepointByMode?.[mode] ?? {};
  table('Line height', 'building-lh', LINE_HEIGHT_LADDER.map((v) => {
    const names = ty.lineHeights.filter((l) => Math.abs((ty.lineHeights.find((x) => x.key === (lhSwap[l.key] ?? l.key))?.value ?? l.value) - v) < 1e-9).map((l) => l.key);
    return { name: `${v.toFixed(2)}×`, who: names.length ? names.join(', ') : 'Not used',
      paint: (e) => { e.textContent = 'Line height sets the space between the lines of a paragraph.'; e.style.fontFamily = stack('body'); e.style.lineHeight = String(v); } };
  }));
  table('Letter spacing', 'building-ls', LETTER_SPACING_LADDER.map((v) => {
    const names = ty.letterSpacings.filter((l) => Math.abs((ty.letterSpacings.find((x) => x.key === (lsSwap[l.key] ?? l.key))?.em ?? l.em) - v) < 1e-9).map((l) => l.key);
    return { name: `${v}em · ${emToPercentLabel(v)}`, who: names.length ? names.join(', ') : 'Not used',
      paint: (e) => { e.textContent = 'Letter spacing'; e.style.fontFamily = stack('body'); e.style.letterSpacing = `${v}em`; e.style.fontSize = '16px'; } };
  }));
  return sec;
};
