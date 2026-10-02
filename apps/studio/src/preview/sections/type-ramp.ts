/** The Typography Preview tab's full type ramp (UI redesign S6.1: lifted out of `main.ts`'s `renderTypeRamp`
 *  unchanged in output, so the new Type page can draw the same section). Every generated style at true size,
 *  grouped by category, largest first, EVERY MODE SIDE BY SIDE (owner decision, #268 follow-up): a per-mode
 *  deviation (face, weight, line height, letter spacing, size) is a property of the table, not of the session.
 *  Every row shows every mode, including modes where nothing differs. Read-only.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="type-ramp"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The resolved typography and the brand's modes. Nothing here reads the session. */
import type { Theme, TypeComposite } from '@prism3/engine/theme';
import { TYPE_GROUP_ORDER } from '../../state/type-input';
import { el, palSection, tokenPillSpan, withInverseBadge } from './kit';

/** One line per category, for the ramp's bands and the face bindings table. (Moved from `main.ts`.) */
export const TYPE_GROUP_BLURB: Record<string, string> = {
  display: 'Hero and marketing-scale statements.', title: 'Section and page headings.',
  body: 'Running copy and UI text.', label: 'Form labels, buttons, dense UI.',
  caption: 'Secondary and supporting text.', eyebrow: 'Small uppercase kickers above headings.',
  code: 'Inline code and tabular figures.',
};
/** ONE string at every size and in every category, owner-directed, so every row compares the same
 *  letterforms. `.tr-samp` clips with an ellipsis, so the big rows show real letterforms cut off. */
const RAMP_SAMPLE = 'The quick brown fox';

export const typeRampSection = (ty: Theme['typography'], modes: readonly string[]): HTMLElement => {
  // Resolve the whole composite FOR ONE MODE. Each axis falls back to the brand-level value, so an untouched
  // mode renders identically rather than blank. The rungs are mode-invariant (#296): what varies is WHICH
  // rung a composite uses, so the key resolves first and the value second.
  const lhOf = (k: string): number => ty.lineHeights.find((l) => l.key === k)?.value ?? 1.5;
  const lsOf = (k: string): number => ty.letterSpacings.find((l) => l.key === k)?.em ?? 0;
  const inMode = (c: TypeComposite, m: string) => {
    const fams = ty.familiesByMode?.[m] ?? ty.families;
    const wrs = ty.weightRolesByMode?.[m] ?? ty.weightRoles;
    const lhKey = c.lineHeightByMode?.[m] ?? c.lineHeight;
    const lsKey = c.trackingByMode?.[m] ?? c.tracking;
    // #347: a re-sized rung carries its OWN mobile endpoint, so the pair is read together.
    const sizePx = c.sizeByMode?.[m] ?? c.sizePx;
    const sizeMinPx = c.sizeMinByMode?.[m] ?? (c.sizeByMode?.[m] !== undefined ? sizePx : c.sizeMinPx);
    return {
      sizePx, sizeMinPx, lhKey, lsKey,
      stack: fams.find((f) => f.group === c.group)?.stack.join(', ') ?? 'inherit',
      weight: wrs.find((w) => w.role === c.weightRole)?.value ?? 400,
    };
  };

  const sec = palSection('The full type ramp', `Every style the system generates — ${ty.composites.length} in total, grouped by category — resolved in all ${modes.length} ${modes.length === 1 ? 'mode' : 'modes'} side by side. This is what ships as tokens.`);
  sec.dataset.sgSection = 'type-ramp';   // the shared-section marker (`kit.ts`'s header)
  for (const g of TYPE_GROUP_ORDER) {
    // Largest first. A STABLE sort on size alone keeps rows sharing a size (the weight roles, the italic and
    // link variants) in their relative order.
    const comps = ty.composites.filter((c) => c.group === g).sort((a, b) => b.sizePx - a.sizePx);
    if (!comps.length) continue;
    const block = el('div', 'tr-block');
    const band = el('div', 'tr-band');
    band.append(el('span', 'tr-band-n', g), el('span', 'tr-band-c mono', `${comps.length} ${comps.length === 1 ? 'style' : 'styles'}`),
      el('span', 'tr-band-d', TYPE_GROUP_BLURB[g] ?? ''));
    block.append(band);
    for (const c of comps) {
      const row = el('div', 'tr-row');
      const meta = el('div', 'tr-meta');
      const path = `type.${c.path}`;
      meta.append(withInverseBadge(path, tokenPillSpan(path)));
      meta.append(el('span', 'tr-attr mono', `${c.weightRole} · ${c.group}`));
      row.append(meta);
      // One column per mode, scrolling horizontally rather than wrapping: a wrapped column would read as a row.
      const cols = el('div', 'tr-modes');
      cols.style.gridTemplateColumns = `repeat(${modes.length}, minmax(220px, 1fr))`;
      for (const m of modes) {
        const v = inMode(c, m);
        const col = el('div', 'tr-mode');
        col.append(el('span', 'tr-mode-n', m));
        const fluidTag = v.sizeMinPx !== v.sizePx ? ` · fluid ${v.sizeMinPx}→${v.sizePx}` : '';
        col.append(el('span', 'tr-attr mono', `${v.sizePx}px · ${v.weight} · ${v.lhKey} ${lhOf(v.lhKey)}× · ${v.lsKey} ${lsOf(v.lsKey)}em${fluidTag}`));
        const samp = el('div', 'tr-samp', RAMP_SAMPLE);
        samp.style.fontFamily = v.stack;
        samp.style.fontSize = `${v.sizePx}px`;
        samp.style.fontWeight = String(v.weight);
        samp.style.lineHeight = String(lhOf(v.lhKey));
        samp.style.letterSpacing = `${lsOf(v.lsKey)}em`;
        if (c.link) samp.style.textDecoration = 'underline';
        // The modifier, or an italic-default category's bare style (#1296): the tree's `fontStyle` rule.
        if (c.italic || c.italicDefault) samp.style.fontStyle = 'italic';
        if (c.textCase === 'uppercase') samp.style.textTransform = 'uppercase';
        col.append(samp);
        cols.append(col);
      }
      row.append(cols);
      block.append(row);
    }
    sec.append(block);
  }
  return sec;
};
