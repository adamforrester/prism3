/**
 * Layout, the preview (UI redesign S10; concept v6's V11, owner decision D14).
 *
 * WHAT IT SHOWS, in the legacy Style guide's markup (owner direction for the domain previews, as S4a's Surfaces &
 * fills, S5.2's Interactive and S6's Type): one section per lever section, each headed and described as its lever
 * section is (Q23). **Breakpoints**: the ranges to scale, each in a primary tint. **Grid**: each breakpoint's columns as
 * tinted bars on a gray margin, with its columns, gutter and margin. **Containers**: the full width, the maximum width
 * and the content container to scale against the widest breakpoint (T10). Token names under each label (QA-B2).
 *
 * NOTHING IN LAYOUT VARIES BY MODE. The values are the same in every mode; only the ground changes with the mode the
 * preview shows (the specimen rule, plan §9.1): each section's ground is a specimen root painted with the brand's own
 * `background.primary` for that mode, and a derived mode still draws (Q59).
 *
 * HOW IT REPAINTS: by store subscription (`brand`, `mode`), never through a legacy tier. Nothing else moves it but an
 * edit's reveal (QA-B9), which the frame runs: no scroll, no focus, no lever (V1).
 */
import { currentMode, rp, subscribe, theme } from '../state/store';
import { resolvedModes } from '../state/verdict';
import { h, hook } from '../shell/dom';
import { DOMAINS, LAYOUT_LABELS, type PageData } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { breakpointsSection, containersSection, gridSection, layoutCtx } from './sections/index';
import { SG_SURFACES, ground, oppositeOf, sgContext, type SgRole } from './sections/kit';

const PAGE = DOMAINS.find((d) => d.id === 'layout') as PageData;
/** A lever section's heading and description, from the page data the levers draw them from (Q23). */
const copyOf = (title: string): { title: string; desc: string } => ({ title, desc: PAGE.sections.find((x) => x.title === title)?.desc ?? '' });
/** The preview's hints, APPROVED (owner, S10 scope), verbatim. */
export const LAYOUT_HINTS = {
  breakpoints: 'To scale. Each color is the range one layout covers.',
  grid: 'Bars are columns; the gray is the margin.',
  containers: (px: number): string => `To scale against the widest breakpoint, ${px}px.`,
} as const;
/** The full-width row's label. DRAFT, pending the owner's approval (listed in the PR). */
export const LAYOUT_PREVIEW_DRAFT = { fluid: 'Full width' } as const;

/** Mount the Layout preview into `host`. Subscriptions are released through `cleanups`. */
export const mountLayoutPreview = (host: HTMLElement, cleanups: (() => void)[]): void => {
  const stack = hook(h('div', 'p3-stack p3-preview-stack'), 'layout-preview');
  const card = hook(h('div', 'p3-legacy-card'), 'layout-style-guide');
  card.dataset.theme = 'light';
  stack.append(card);
  host.replaceChildren(stack);

  const paint = (): void => {
    const all = resolvedModes(theme);
    const rolesByMode = new Map<string, Record<string, SgRole | undefined>>(all.map((x) => [x.mode as string, x.roles as Record<string, SgRole | undefined>]));
    const cur: string = rolesByMode.has(currentMode) ? currentMode : rp.modes[0];
    const c = sgContext({
      rolesByMode, cur, opp: oppositeOf(cur, rp.modes, (m) => rolesByMode.has(m)), namespace: theme.namespace, modeLabel, badges: false,
      paletteHex: (p, s) => theme.palettes.find((x) => x.palette === p)?.steps.find((x) => x.key === s)?.hex ?? null,
    });
    const x = layoutCtx(c, theme);
    const secs = [
      breakpointsSection(x, copyOf('Breakpoints'), LAYOUT_HINTS.breakpoints),
      gridSection(x, copyOf('Grid'), LAYOUT_HINTS.grid, LAYOUT_LABELS),
      containersSection(x, copyOf('Containers'), LAYOUT_HINTS.containers, { fluid: LAYOUT_PREVIEW_DRAFT.fluid, max: LAYOUT_LABELS.max, narrow: LAYOUT_LABELS.narrow }),
    ];
    // Q24: each section's container on the levers panel's gray, as the other previews' are.
    for (const s of secs) s.classList.add('p3-sgsec');
    card.replaceChildren(...secs.map((s) => ground(c, s, SG_SURFACES[0])));
  };
  cleanups.push(subscribe('brand', paint), subscribe('mode', paint));
  paint();
};
