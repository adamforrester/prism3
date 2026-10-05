/** The Links section (UI redesign S5.2): the one global link role (#1486) as a reader meets it, a text link
 *  and an icon link in each of the five states the engine emits, in the walk's depth order, then the same two
 *  on the inverse band. Each chip carries its ratio badge when the context draws badges (Color › Interactive).
 *
 *  Drawn in the Style guide's legacy markup (`sg-*`, owner direction for the Color previews), with the row
 *  layout the Interactive section uses, so the two read as one board. Only Color › Interactive draws it; the
 *  Style guide does not (its sections are the owner's list, Q32 and Q39).
 *
 *  WHAT IT IS HANDED. The section context, and the copy the levers' Links section shows (owner decision Q23:
 *  the levers and the preview section they drive say the same thing; `LINKS_DESC` in `shell/pages.ts`). */
import { SG_ICON } from './cards';
import { el, hook, legibleInkOn, palSection, specimen, type SgCtx } from './kit';

/** The link states, in the depth order the engine walks them, `focused` last (it equals the resting link). */
export const LINK_PREVIEW_STATES = ['default', 'hover', 'pressed', 'visited', 'focused'] as const;
/** The link families, by role prefix, with the row label each draws. Page first, then the inverse band. */
export const LINK_PREVIEW_ROWS: ReadonlyArray<readonly [string, string, boolean]> = [
  ['text', 'Text link', false], ['icon', 'Icon link', false],
  ['inverse.text', 'Text link · inverse', true], ['inverse.icon', 'Icon link · inverse', true],
];

export const linksSection = (c: SgCtx, desc: string): HTMLElement => {
  const { cur, paint } = c;
  const sec = palSection('Links', desc);
  sec.dataset.sgSection = 'links';   // the shared-section marker (`kit.ts`'s header)
  for (const [prefix, label, inv] of LINK_PREVIEW_ROWS) {
    const row = hook(el('div', 'sg-trow'), 'style-guide-link-row');
    row.dataset.family = prefix;
    const bs = hook(el('div', 'sg-btns' + (inv ? ' sg-inv' : '')), 'style-guide-links');
    if (inv) {
      // The band this row is measured against, painted, with a state-label ink that reads on it (#555).
      const band = paint(cur, 'inverse.background.primary');
      bs.style.setProperty('--sg-invp', band);
      bs.style.setProperty('--sg-invp-ink', legibleInkOn(band, '#191920', '#c9ccce'));
    }
    for (const st of LINK_PREVIEW_STATES) {
      const role = `${prefix}.link.${st}`;
      if (!c.role(cur, role)) continue;
      const col = hook(el('div', 'sg-bcol'), 'style-guide-state');
      const isIcon = prefix.endsWith('icon');
      const spec = c.painted(isIcon ? el('span', 'sg-ico') : el('span', 'sg-lab', 'Link'), role, 'color');
      specimen(spec).style.color = paint(cur, role);
      if (isIcon) spec.innerHTML = SG_ICON;
      else spec.style.textDecoration = 'underline';
      col.append(spec, hook(el('span', 'sg-st', st), 'style-guide-state-name'), ...c.chip(role));
      bs.append(col);
    }
    row.append(el('div', 'sg-tlab', label), bs);
    sec.append(row);
  }
  return sec;
};
