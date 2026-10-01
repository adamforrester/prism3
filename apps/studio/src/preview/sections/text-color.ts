/** The Style guide's Text color section (UI redesign S4a: shared by the Style guide and Color › Surfaces &
 *  fills). Every text color at one size, on the current mode's surface and on its counterpart's, with the
 *  token beside it. Moved from `main.ts` unchanged. */
import { SEM, el, palSection, specimen, subHead, type SgCtx } from './kit';

export const textColorSection = (c: SgCtx): HTMLElement => {
  const { cur, opp, paint, fails } = c;
  const secText = palSection('Text color', 'Every text color at one size, shown on the current surface and its inverse counterpart. On-color text lives with the fills above.');
  secText.dataset.sgSection = 'text-color';   // the shared-section marker (`kit.ts`'s header)
  const curLabel = c.modeLabel(cur), oppLabel = c.modeLabel(opp);
  const lbg = paint(cur, 'background.primary'), dbg = paint(opp, 'background.primary');
  const tcHead = (txt: string, cls: string, color: string): HTMLElement => { const d = el('div', `sg-tc ${cls} sg-tchd`, txt); specimen(d).style.color = color; return d; };
  const tcCell = (nm: string, k: string, m: string, cls: string, ul: boolean): HTMLElement => {
    const d = c.painted(el('div', `sg-tc ${cls} sg-tcrow`), k, 'color', m); specimen(d).style.color = paint(m, k);
    const sp = el('span', 'sg-samp', nm); if (ul) sp.style.textDecoration = 'underline'; d.append(sp);
    if (fails(m, k)) d.append(el('b', 'sg-fx', '!'));
    return d;
  };
  const tcGroups: Array<[string, Array<[string, string]>, boolean]> = [
    ['Neutral', [['Primary', 'text.primary'], ['Secondary', 'text.secondary'], ['Tertiary', 'text.tertiary']], false],
    ['Semantic', SEM.map(([n, s]) => [n, `text.${s}`] as [string, string]), false],
    ['Semantic — subtle', SEM.map(([n, s]) => [n, `text.${s}-subtle`] as [string, string]), false],
    ['Links', [['Link', 'text.link.default'], ['Hover', 'text.link.hover'], ['Pressed', 'text.link.pressed'], ['Visited', 'text.link.visited'], ['Focused', 'text.link.focused']], true],
  ];
  for (const [glab, items, ul] of tcGroups) {
    secText.append(subHead(glab));
    const g = el('div', 'sg-tcg'); g.style.setProperty('--lbg', lbg); g.style.setProperty('--dbg', dbg);
    g.append(tcHead(`On ${curLabel} surface`, 'sg-l', paint(cur, 'text.tertiary')), tcHead(`On ${oppLabel} surface`, 'sg-r', paint(opp, 'text.tertiary')), tcHead('Token', 'sg-t', 'var(--faint)'));
    for (const [nm, k] of items) {
      g.append(tcCell(nm, k, cur, 'sg-l', ul), tcCell(nm, k, opp, 'sg-r', ul));
      const tc = el('div', 'sg-tc sg-t sg-tcrow'); tc.append(...c.chip(k)); g.append(tc);
    }
    secText.append(g);
  }
  const callout = el('div', 'sg-callout');
  // `LINK_STATES` has five (#1486 added `pressed`). Focused resolves to the same color as default BY DESIGN
  // (the focus ring carries the state), which is why the row reads as a duplicate and why it is said.
  callout.append(document.createTextNode('Links draw only from the action ramp — the engine defines '));
  callout.append(el('span', 'mono', 'text.link.default / hover / pressed / visited / focused'));
  callout.append(document.createTextNode(' and no neutral or accent link roles. The engaged states step by a perceptual interval, so hover, pressed, and visited stay clearly distinct even where the link color sits deep in the ramp. Focused resolves to the same color as default: the focus ring carries that state, so the link text does not shift.'));
  secText.append(callout);
  return secText;
};
