/** The Focus ring section (UI redesign S4c: shared by the legacy Interactive page in `main.ts` and Color ›
 *  Surfaces & fills' preview, where it sits after Border, owner decision Q30). The ring geometry every
 *  focusable control shares, read-only, with a live specimen in the ring's color. Moved from `main.ts`
 *  unchanged in output, apart from the shared-section marker and the ring's role attributes.
 *
 *  FOCUS RING (review, 2026-08-04): 4 emitted tokens that appeared nowhere in the dashboard. A focus ring is
 *  an interaction state, and `color.border.focus` (its color) is the one part of it that was visible. These
 *  are the geometry: fixed constants in the engine, so read-only, shown with a live specimen because a 2px
 *  ring at 2px offset is a thing you judge by looking, not by reading two numbers. Making it customizable is
 *  #1966.
 *
 *  `ringColor` is the caller's: the previewed mode's `border.focus`. Each ring names that role and the
 *  property it paints (`data-sg-role`, `data-sg-paint="outline"`), so `test-smoke.mjs` can hold its computed
 *  outline color against the emission, as it does every painted swatch in the shared sections. */
import { el, palSection, tokenPillSpan, withInverseBadge } from './kit';

export const focusRingSection = (ringColor: string): HTMLElement => {
  const sec = palSection('Focus ring', 'The ring geometry every focusable control shares — width, how far it sits off the element, and its stroke style. Fixed for every brand (WCAG 2.4.13 sets the floor); its color is the color.border.focus role above.');
  sec.dataset.sgSection = 'focus-ring';   // the shared-section marker (`kit.ts`'s header)
  const frRows: Array<[string, string, string]> = [
    ['focus.ring.width', '2px', 'WCAG 2.4.13 floor'],
    ['focus.ring.offset', '2px', 'separates the ring from the element edge'],
    ['focus.ring.offset-field', '0px', 'form fields — the ring hugs the field'],
    ['focus.ring.style', 'solid', 'dashed and dotted fail at small sizes'],
  ];
  const frWrap = el('div', 'fr-wrap');
  const frList = el('div', 'fr-list');
  for (const [ref, val, why] of frRows) {
    const r = el('div', 'fr-row');
    r.append(withInverseBadge(ref, tokenPillSpan(ref)), el('span', 'fr-v mono', val), el('span', 'fr-why', why));
    frList.append(r);
  }
  const frEx = el('div', 'fr-ex');
  for (const [lab, off] of [['Control', '2px'], ['Form field', '0px']] as Array<[string, string]>) {
    const cell = el('div', 'fr-excell');
    const btn = el('div', 'fr-btn', lab);
    btn.dataset.sgRole = 'border.focus';
    btn.dataset.sgPaint = 'outline';
    btn.style.outline = `2px solid ${ringColor}`;
    btn.style.outlineOffset = off;
    cell.append(btn, el('span', 'fr-exlab', `offset ${off}`));
    frEx.append(cell);
  }
  frWrap.append(frList, frEx);
  sec.append(frWrap);
  return sec;
};
