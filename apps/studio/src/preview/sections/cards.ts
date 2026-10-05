/**
 * The Style guide's specimen cards (UI redesign S4a), shared by the sections in this folder. Moved out of
 * `renderPreviewStyleGuide` in `main.ts` unchanged in output; each painted node now also names the role and
 * the property it paints (`ctx.painted`), so a test can hold its computed color against the emission.
 */
import { el, specimen, type SgCtx } from './kit';

/** A color plane, an optional in-card label (and sub-label) in its ink, and the token chip(s) underneath. With
 *  `inkBadge` (#1971, Q13(a)), the plane's chip carries the badge of what the card draws, its ink on the plane, in
 *  place of the plane's own badge against its ground. */
export const surfaceCard = (c: SgCtx, k: string, label: string, inkRole: string, sub?: string, extra: HTMLElement[] = [], inkBadge = false): HTMLElement => {
  const { cur, paint, fails } = c;
  const cw = el('div', 'sg-cw');
  const card = c.painted(el('div', 'sg-card'), k, 'background'); card.style.background = paint(cur, k);
  if (fails(cur, k)) card.append(el('span', 'sg-failmk', '!'));
  const lab = c.painted(el('div', 'sg-lab', label), inkRole, 'color'); specimen(lab).style.color = paint(cur, inkRole); card.append(lab);
  if (sub) { const sb = c.painted(el('div', 'sg-sub', sub), inkRole, 'color'); specimen(sb).style.color = paint(cur, inkRole); card.append(sb); }
  const own = inkBadge ? [c.pill(k), c.onFillBadge(inkRole, k, k)].filter((n): n is HTMLElement => n !== null) : c.chip(k);
  cw.append(card, c.pills(...own, ...extra));
  return cw;
};

/** A scrim only means anything OVER something, so the card composites it on the page surface, dimming the
 *  page behind a panel (the token's job), rather than painting the alpha alone. */
export const scrimCard = (c: SgCtx, k: string): HTMLElement => {
  const { cur, paint } = c;
  const cw = el('div', 'sg-cw');
  const card = c.painted(el('div', 'sg-card sg-scrimcard'), 'background.primary', 'background');
  card.style.background = paint(cur, 'background.primary');
  const dim = el('div', 'sg-scrimdim'); dim.style.background = paint(cur, k);
  const panel = c.painted(el('div', 'sg-scrimpanel'), 'foreground.primary', 'background'); panel.style.background = paint(cur, 'foreground.primary');
  const lab = c.painted(el('div', 'sg-lab', 'Modal'), 'text.primary', 'color'); specimen(lab).style.color = paint(cur, 'text.primary');
  panel.append(lab); dim.append(panel); card.append(dim);
  cw.append(card, c.pills(...c.chip(k)));
  return cw;
};

/** A card drawn by its 2px border in the role. */
export const borderCard = (c: SgCtx, k: string): HTMLElement => {
  const { cur, paint, fails } = c;
  const cw = el('div', 'sg-cw');
  const card = c.painted(el('div', 'sg-card sg-bcard'), k, 'border'); card.style.border = `2px solid ${paint(cur, k)}`;
  if (fails(cur, k)) card.append(el('span', 'sg-failmk', '!'));
  cw.append(card, c.pills(...c.chip(k)));
  return cw;
};

/** The star glyph an icon card strokes in its role. */
export const SG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 15 9l7 .5-5.3 4.6L18.2 21 12 17l-6.2 4 1.5-6.9L2 9.5 9 9z"/></svg>';

/** An icon in the role, on the section's ground or, for an on-color icon, on its fill. */
export const iconCard = (c: SgCtx, k: string, bgRole?: string): HTMLElement => {
  const { cur, paint } = c;
  const cw = el('div', 'sg-cw');
  const card = el('div', 'sg-card sg-icard');
  if (bgRole) { c.painted(card, bgRole, 'background'); card.style.background = paint(cur, bgRole); card.style.border = 'none'; }
  const ico = c.painted(el('span', 'sg-ico'), k, 'color'); specimen(ico).style.color = paint(cur, k); ico.innerHTML = SG_ICON; card.append(ico);
  cw.append(card, c.pills(...c.chip(k)));
  return cw;
};
