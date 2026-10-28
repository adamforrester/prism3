/**
 * Link options (#2942, owner Q3 A). Link's first settings block: one read-only line for the link underline, whose one
 * home is Theme › Type › Weights and styles (`typography.underline`, beside Underlined link styles). Nothing here edits,
 * so a derived mode leaves the line as it is (`ui/home-line.ts`).
 *
 * WHERE IT IS DRAWN: once, in the Components page's Link section, after its one set, as Banner options are
 * (`domains/components.ts`). Its row in the page data is Components › Link (`shell/pages.ts`).
 *
 * HOW IT REPAINTS: by store subscription only (`brand` and `mode`).
 */
import { setPage, subscribe, theme } from '../state/store';
import { LINK_DESC, pageOfTab } from '../shell/pages';
import { h, hook } from '../shell/dom';
import { homeLine } from '../ui/home-line';

/** The block's copy. DRAFT placeholders (owner Q2 A): the owner replaces the wording before merge. */
export const LINK_OPTIONS_COPY = {
  title: 'Link options',
  desc: LINK_DESC,
  underlineLabel: 'Underline',
  /** The proposal's line, "Underline · 5% thick · 25% offset · set in Theme ›", split into value and link. */
  underlineValue: (thickness: number | 'auto', offset: number | 'auto'): string =>
    thickness === 'auto' && offset === 'auto' ? 'Auto'
      : `${thickness === 'auto' ? 'Auto' : `${thickness}%`} thick · ${offset === 'auto' ? 'Auto' : `${offset}%`} offset`,
  underlineLink: 'Set in Theme › Type › Weights and styles',
} as const;

/** The underline's read-only line, as Type › Weights and styles shows it. */
export const underlineLine = (): HTMLElement => {
  const u = theme.typography.underline;
  return homeLine({
    role: 'components-link-underline', label: LINK_OPTIONS_COPY.underlineLabel,
    value: LINK_OPTIONS_COPY.underlineValue(u.thickness, u.offset),
    link: LINK_OPTIONS_COPY.underlineLink, go: () => setPage(pageOfTab('type')),
  });
};

/** Mount the Link options into `hostEl`. Subscriptions are released through `cleanups`. */
export const mountLinkOptions = (hostEl: HTMLElement, cleanups: (() => void)[]): void => {
  const root = hook(h('div', 'p3-bopts'), 'link-options');
  hostEl.replaceChildren(root);
  const render = (): void => root.replaceChildren(underlineLine());
  cleanups.push(subscribe('brand', render), subscribe('mode', render));
  render();
};
