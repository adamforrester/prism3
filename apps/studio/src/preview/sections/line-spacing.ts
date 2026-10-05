/** The Type preview's Line height and letter spacing section (UI redesign S6.3, owner decision Q64): each name, the
 *  step it uses in the previewed mode (a mode's swap included), the text types that use it, and a specimen at that
 *  step. It shows what the lever section of the same name sets (Q23), for one mode at a time (Q66). Read-only.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="line-spacing"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The section context, the resolved typography, the mode and the section's copy. Nothing here
 *  reads the session. */
import type { Theme } from '@prism3/engine/theme';
import { emToPercentLabel } from '../../em-percent';
import { el, hook, palSection, specimen, subHead, type SgCtx } from './kit';

/** The specimens' words. APPROVED (owner, 2026-10-03), as the section's copy is. */
const LH_TEXT = 'Line height sets the space between the lines of a paragraph, so a long passage reads evenly.';
const LS_TEXT = 'Letter spacing';

export const lineSpacingSection = (c: SgCtx, ty: Theme['typography'], mode: string, copy: { title: string; desc: string }): HTMLElement => {
  const sec = palSection(copy.title, copy.desc);
  sec.dataset.sgSection = 'line-spacing';   // the shared-section marker (`kit.ts`'s header)
  const body = (ty.familiesByMode?.[mode] ?? ty.families).find((f) => f.group === 'body')?.stack.map((x) => (/^[a-z-]+$/.test(x) ? x : `"${x}"`)).join(', ') ?? 'inherit';
  const table = (caption: string, rows: { key: string; to: string; val: number; fmt: string; who: string[] }[], paint: (e: HTMLElement, v: number) => void, hk: string): void => {
    sec.append(subHead(caption));
    const box = el('div', 'mtbl');
    const scroll = el('div', 'mtbl-scroll');
    const t = el('table', 'mtbl-tbl');
    const head = el('thead'), htr = el('tr');
    ['Name', 'Step', 'Used by', 'Specimen'].forEach((x, i) => htr.append(el('th', i === 0 ? 'mtbl-stick' : i === 3 ? 'mtbl-fill mtbl-spec' : 'mtbl-mode', x)));
    head.append(htr);
    const tb = el('tbody');
    for (const r of rows) {
      const tr = hook(el('tr'), hk);
      tr.dataset.key = r.key;
      const nc = el('td', 'mtbl-stick');
      nc.append(el('span', 'mtbl-name mono', r.key));
      const step = el('td', 'mtbl-mode', r.to === r.key ? r.fmt : `${r.fmt} (${r.to})`);
      const who = el('td', 'mtbl-mode');
      who.append(el('span', 'ltbl-who' + (r.who.length ? '' : ' none'), r.who.length ? r.who.join(', ') : 'Not used'));
      const spec = el('td', 'mtbl-fill mtbl-spec');
      const samp = c.painted(specimen(el('div', 'ltbl-samp')), 'text.primary', 'color');
      samp.style.color = c.paint(c.cur, 'text.primary');
      samp.style.fontFamily = body;
      paint(samp, r.val);
      spec.append(samp);
      tr.append(nc, step, who, spec);
      tb.append(tr);
    }
    t.append(head, tb); scroll.append(t); box.append(scroll);
    sec.append(box);
  };
  const lhSwap = ty.lineHeightRepointByMode?.[mode] ?? {};
  const lsSwap = ty.letterSpacingRepointByMode?.[mode] ?? {};
  table('Line height', ty.lineHeights.map((l) => {
    const to = lhSwap[l.key] ?? l.key;
    const val = ty.lineHeights.find((x) => x.key === to)?.value ?? l.value;
    return { key: l.key, to, val, fmt: `${val.toFixed(2)}×`,
      who: [...new Set(ty.composites.filter((x) => x.lineHeight === l.key).map((x) => x.group))] };
  }), (e, v) => { e.textContent = LH_TEXT; e.style.lineHeight = String(v); }, 'line-spacing-lh');
  table('Letter spacing', ty.letterSpacings.map((l) => {
    const to = lsSwap[l.key] ?? l.key;
    const val = ty.letterSpacings.find((x) => x.key === to)?.em ?? l.em;
    return { key: l.key, to, val, fmt: `${val}em · ${emToPercentLabel(val)}`,
      who: [...new Set(ty.composites.filter((x) => x.tracking === l.key).map((x) => x.group))] };
  }), (e, v) => { e.textContent = LS_TEXT; e.style.letterSpacing = `${v}em`; e.style.fontSize = '16px'; }, 'line-spacing-ls');
  return sec;
};
