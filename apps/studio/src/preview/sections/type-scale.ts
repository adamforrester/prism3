/** The Type preview's Scale section (UI redesign S6.3; scope §3, concept v6's Scale board): every heading and text
 *  style at its size, one row per style (`type.<text type>.<size>`), with a sample in the style's family, its
 *  desktop and mobile sizes, its line height and letter spacing, and the weights it ships; then the sizes that
 *  merge on mobile. It replaces the legacy Preview tab's full type ramp and Layout's fluid read-out (S6.1's
 *  `type-ramp.ts` and `type-fluid.ts`), for one mode at a time (owner decision Q66). Its heading and description
 *  are the Scale lever section's (Q23); the Scale limits levers reveal it too. Read-only.
 *
 *  The sample is capped, as v6 caps it at 44px, so a 160px display style fits its row; the desktop column states
 *  the true size.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="type-scale"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The section context, the resolved typography, the mode and the section's copy. Nothing here
 *  reads the session. */
import type { Theme, TypeComposite } from '@prism3/engine/theme';
import { TYPE_GROUP_ORDER } from '../../state/type-input';
import { el, hook, palSection, specimen, tokenPillSpan, type SgCtx } from './kit';

/** The largest a row's sample is drawn (v6's cap). */
export const SCALE_SAMPLE_CAP = 44;
/** The sizes-that-merge heading (the legacy read-out's words, kept). */
export const MERGE_TITLE = 'Sizes that merge on mobile';

/** One row per style: the composites of one text type and size, with every weight it ships. */
type Style = { group: string; variant: string; first: TypeComposite; weights: string[] };

export const typeScaleSection = (c: SgCtx, ty: Theme['typography'], mode: string, copy: { title: string; desc: string }): HTMLElement => {
  const sec = palSection(copy.title, copy.desc);
  sec.dataset.sgSection = 'type-scale';   // the shared-section marker (`kit.ts`'s header)
  const fams = ty.familiesByMode?.[mode] ?? ty.families;
  const wrs = ty.weightRolesByMode?.[mode] ?? ty.weightRoles;
  const lhOf = (k: string): number | undefined => ty.lineHeights.find((l) => l.key === k)?.value;
  const lsOf = (k: string): number | undefined => ty.letterSpacings.find((l) => l.key === k)?.em;
  const wOf = (r: string): number => wrs.find((w) => w.role === r)?.value ?? 400;
  const styles: Style[] = [];
  for (const g of TYPE_GROUP_ORDER) {
    for (const comp of ty.composites.filter((x) => x.group === g).sort((a, b) => b.sizePx - a.sizePx)) {
      const s = styles.find((x) => x.group === g && x.variant === comp.variant);
      if (s) { if (!s.weights.includes(comp.weightRole)) s.weights.push(comp.weightRole); continue; }
      styles.push({ group: g, variant: comp.variant, first: comp, weights: [comp.weightRole] });
    }
  }
  const box = el('div', 'mtbl');
  const scroll = el('div', 'mtbl-scroll');
  const t = el('table', 'mtbl-tbl');
  const head = el('thead'), htr = el('tr');
  ['Style', 'Sample', 'Desktop', 'Mobile', 'Line height', 'Letter spacing', 'Weights'].forEach((x, i) =>
    htr.append(el('th', i === 0 ? 'mtbl-stick' : i === 1 ? 'mtbl-fill mtbl-spec' : 'mtbl-mode', x)));
  head.append(htr);
  const body = el('tbody');
  for (const s of styles) {
    const comp = s.first;
    const desk = comp.sizeByMode?.[mode] ?? comp.sizePx;
    // A re-sized size carries its own mobile endpoint (#347), so the pair is read together.
    const mob = comp.sizeMinByMode?.[mode] ?? (comp.sizeByMode?.[mode] !== undefined ? desk : comp.sizeMinPx);
    const lhKey = comp.lineHeightByMode?.[mode] ?? comp.lineHeight;
    const lsKey = comp.trackingByMode?.[mode] ?? comp.tracking;
    const tr = hook(el('tr'), 'type-scale-row');
    tr.dataset.style = `${s.group}.${s.variant}`;
    const tc = el('td', 'mtbl-stick');
    tc.append(tokenPillSpan(`type.${s.group}.${s.variant}`));
    const sc = el('td', 'mtbl-fill mtbl-spec');
    const samp = c.painted(specimen(el('span', 'mtbl-spec-t', 'Aa')), 'text.primary', 'color');
    samp.style.color = c.paint(c.cur, 'text.primary');
    samp.style.fontFamily = (fams.find((f) => f.group === s.group)?.stack ?? []).map((x) => (/^[a-z-]+$/.test(x) ? x : `"${x}"`)).join(', ');
    samp.style.fontSize = `${Math.min(desk, SCALE_SAMPLE_CAP)}px`;
    samp.style.fontWeight = String(wOf(comp.weightRole));
    if (comp.italicDefault) samp.style.fontStyle = 'italic';
    if (comp.textCase === 'uppercase') samp.style.textTransform = 'uppercase';
    sc.append(samp);
    const lh = lhOf(lhKey), ls = lsOf(lsKey);
    tr.append(tc, sc,
      hook(el('td', 'mtbl-mode', `${desk}px`), 'type-scale-desktop'),
      hook(el('td', 'mtbl-mode', mob !== desk ? `${mob}px` : 'Same'), 'type-scale-mobile'),
      el('td', 'mtbl-mode', `${lhKey}${lh !== undefined ? ` ${lh}×` : ''}`),
      el('td', 'mtbl-mode', `${lsKey}${ls !== undefined ? ` ${ls}em` : ''}`),
      hook(el('td', 'mtbl-mode', s.weights.map((w) => `${w} ${wOf(w)}`).join(', ')), 'type-scale-weights'));
    body.append(tr);
  }
  t.append(head, body); scroll.append(t); box.append(scroll);
  sec.append(box);
  // Several desktop sizes can share one mobile size: deliberate (display converges on a phone), but invisible
  // unless named. Only while headings scale between mobile and desktop.
  const byFloor = new Map<number, string[]>();
  for (const s of styles) {
    const desk = s.first.sizeByMode?.[mode] ?? s.first.sizePx;
    const mob = s.first.sizeMinByMode?.[mode] ?? (s.first.sizeByMode?.[mode] !== undefined ? desk : s.first.sizeMinPx);
    if (mob === desk) continue;
    byFloor.set(mob, [...(byFloor.get(mob) ?? []), `${s.group}.${s.variant}`]);
  }
  const merged = [...byFloor.entries()].filter(([, v]) => v.length > 1);
  if (merged.length) {
    const w = hook(el('p', 'fz-warn'), 'type-scale-merge');
    w.append(el('b', undefined, `${MERGE_TITLE}. `));
    w.append(document.createTextNode(`${merged.map(([px, v]) => `${v.join(' + ')} all land on ${px}px`).join('; ')}. Distinct on desktop, the same on a phone.`));
    sec.append(w);
  }
  return sec;
};
