/** The type sample (#1942; UI redesign S6.2): a few of the brand's text styles, set in its faces, on the page
 *  color. Not the full ramp: one large display style, then a title, body, label and caption, each labeled with
 *  its token name. Shared: Brand's Style guide draws it first, before Background (owner decision Q67), and the
 *  Type preview draws it first too. Read-only.
 *
 *  ONE MODE (owner decision Q66): each line is the composite as it resolves in the mode handed in, its face from
 *  that mode's `font.family.<text type>`, its weight, size, line height and letter spacing from that mode's
 *  values. A line's face is ALWAYS its own text type's: the display line is set in `font.family.display`, never
 *  in the body face. `test:smoke` holds every line's first face to the emission's `core.font.family.<type>`.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="type-sample"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The section context, the resolved typography, the mode, and the ground's ink role (the
 *  Style guide can draw on the inverse fill). Nothing here reads the session. */
import type { Theme, TypeComposite } from '@prism3/engine/theme';
import { el, hook, palSection, specimen, tokenPillSpan, type SgCtx } from './kit';

/** The display style the sample opens with: large, but not the largest (owner decision Q67: the largest can be
 *  160px). `display.md.strong` is 64px in the default theme. A PROPOSAL, pending the owner's approval: change it
 *  here and nowhere else. A brand that emits no `display.md.strong` gets its largest display style. */
export const TYPE_SAMPLE_DISPLAY = 'display.md.strong';
/** The rest of the sample, in order: a title, body, label and caption, by text type, size and weight. A brand
 *  missing one falls back to that text type's first plain `md` style, then its first plain style. */
export const TYPE_SAMPLE_REST: ReadonlyArray<readonly [string, string, string]> = [
  ['title', 'md', 'strong'], ['body', 'md', 'default'], ['label', 'md', 'emphasis'], ['caption', 'md', 'default'],
];
/** The sample's words (owner decision Q67). */
export const TYPE_SAMPLE_TEXT = 'The quick brown fox jumps over the lazy dog';
/** The section's heading and description. DRAFT: pending the owner's approval. */
export const TYPE_SAMPLE_TITLE = 'Type sample';
export const TYPE_SAMPLE_DESC = 'A few of the brand’s text styles, set in its faces. Each line is named by its token.';

type Typography = Theme['typography'];
/** A style with no italic or link modifier in its name. */
const plain = (c: TypeComposite): boolean => !c.italic && !c.link;

/** The styles the sample draws, in order. Exported so a test can ask what a brand's sample holds. */
export const typeSamplePicks = (ty: Typography): TypeComposite[] => {
  const all = ty.composites.filter(plain);
  const display = all.find((c) => c.path === TYPE_SAMPLE_DISPLAY)
    ?? all.filter((c) => c.group === 'display').reduce<TypeComposite | undefined>((a, c) => (!a || c.sizePx > a.sizePx ? c : a), undefined);
  const rest = TYPE_SAMPLE_REST.map(([g, v, w]) => all.find((c) => c.path === `${g}.${v}.${w}`)
    ?? all.find((c) => c.group === g && c.variant === v) ?? all.find((c) => c.group === g));
  return [display, ...rest].filter((c): c is TypeComposite => !!c);
};

/** A family stack as CSS, each name quoted, so the first face reads back exactly. */
const cssStack = (stack: readonly string[]): string =>
  stack.map((f) => (/^[a-z-]+$/.test(f) ? f : `"${f.replace(/"/g, '')}"`)).join(', ');

export const typeSampleSection = (c: SgCtx, ty: Typography, mode: string, ground: { ink: string }): HTMLElement => {
  const sec = palSection(TYPE_SAMPLE_TITLE, TYPE_SAMPLE_DESC);
  sec.dataset.sgSection = 'type-sample';   // the shared-section marker (`kit.ts`'s header)
  const fams = ty.familiesByMode?.[mode] ?? ty.families;
  const wrs = ty.weightRolesByMode?.[mode] ?? ty.weightRoles;
  const list = el('div', 'tsm-list');
  for (const comp of typeSamplePicks(ty)) {
    const row = hook(el('div', 'tsm-row'), 'type-sample-line');
    row.dataset.group = comp.group;
    row.dataset.token = `type.${comp.path}`;
    const lh = ty.lineHeights.find((l) => l.key === (comp.lineHeightByMode?.[mode] ?? comp.lineHeight))?.value;
    const ls = ty.letterSpacings.find((l) => l.key === (comp.trackingByMode?.[mode] ?? comp.tracking))?.em;
    // A specimen inked with the ground's own ink role, marked with the role it paints so a test reads its color
    // against the emission.
    const text = c.painted(specimen(el('p', 'tsm-text', TYPE_SAMPLE_TEXT)), ground.ink, 'color');
    text.style.color = c.paint(c.cur, ground.ink);
    text.style.fontFamily = cssStack(fams.find((f) => f.group === comp.group)?.stack ?? []);
    text.style.fontSize = `${comp.sizeByMode?.[mode] ?? comp.sizePx}px`;
    text.style.fontWeight = String(wrs.find((w) => w.role === comp.weightRole)?.value ?? 400);
    if (lh !== undefined) text.style.lineHeight = String(lh);
    if (ls !== undefined) text.style.letterSpacing = `${ls}em`;
    if (comp.italicDefault) text.style.fontStyle = 'italic';
    if (comp.textCase !== 'none') text.style.textTransform = comp.textCase;
    row.append(tokenPillSpan(`type.${comp.path}`), text);
    list.append(row);
  }
  sec.append(list);
  return sec;
};
