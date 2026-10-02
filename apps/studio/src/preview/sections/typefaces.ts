/** The Typography Preview tab's Typefaces section (UI redesign S6.1: lifted out of `renderTypePreview` in
 *  `main.ts` unchanged in output, so the new Type page can draw the same section). The face each text category
 *  resolves to, per mode, with a specimen in the Light face. Read-only.
 *
 *  Rows are CATEGORIES, which is what `font.family.*` is keyed by since #415. Stamps its root with the
 *  shared-section marker (`data-sg-section="typefaces"`, `kit.ts`'s header).
 *
 *  WHAT IT IS HANDED. The resolved typography, the brand's modes in order, and each mode's label. Nothing here
 *  reads the session. */
import type { Theme } from '@prism3/engine/theme';
import { el, palSection } from './kit';

export const typefacesSection = (ty: Theme['typography'], modes: readonly string[], modeLabel: (m: string) => string): HTMLElement => {
  const fam = palSection('Typefaces', `The face each category resolves to${modes.length > 1 ? ', per mode' : ''}. Everything below is set in these.`);
  fam.dataset.sgSection = 'typefaces';   // the shared-section marker (`kit.ts`'s header)
  const ftbl = el('div', 'mtbl');
  const fscroll = el('div', 'mtbl-scroll');
  const ft = el('table', 'mtbl-tbl');
  const fhead = el('thead'), fhtr = el('tr');
  fhtr.append(el('th', 'mtbl-stick', 'Category'));
  for (const m of modes) {
    const th = el('th', 'mtbl-mode');
    th.append(document.createTextNode(modeLabel(m)));
    if (m === 'light') th.append(el('span', 'mtbl-ro', ' baseline'));
    fhtr.append(th);
  }
  fhtr.append(el('th', 'mtbl-fill mtbl-spec', 'Specimen'));
  fhead.append(fhtr); ft.append(fhead);
  const fb = el('tbody');
  for (const f of ty.families) {
    const tr = el('tr');
    const nc = el('td', 'mtbl-stick');
    nc.append(el('span', 'mtbl-name mono', f.group));
    tr.append(nc);
    let stack = f.stack.join(', ');
    for (const m of modes) {
      const per = ty.familiesByMode?.[m]?.find((x) => x.group === f.group)?.stack.join(', ');
      const resolved = per ?? f.stack.join(', ');
      if (m === 'light') stack = resolved;
      const td = el('td', 'mtbl-mode');
      const nm = el('span', 'tp-fam', resolved.split(',')[0].replace(/["']/g, '').trim());
      nm.title = resolved;
      td.append(nm);
      tr.append(td);
    }
    const spec = el('td', 'mtbl-fill mtbl-spec');
    const samp = el('span', 'mtbl-spec-t', 'The quick brown fox jumps');
    samp.style.fontFamily = stack;
    spec.append(samp);
    tr.append(spec);
    fb.append(tr);
  }
  ft.append(fb); fscroll.append(ft); ftbl.append(fscroll); fam.append(ftbl);
  return fam;
};
