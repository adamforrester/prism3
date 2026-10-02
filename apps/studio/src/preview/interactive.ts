/**
 * Color › Interactive, the preview (UI redesign S5.2).
 *
 * WHAT IT SHOWS, in the legacy Style guide's markup (owner direction for the Color previews, as S4a's
 * Surfaces & fills): the Style guide's **Interactive** section, drawn by the SAME code the Style guide draws
 * it with (`preview/sections/interactive.ts`), with every column the brand ships, accents included (owner
 * decision Q39), and the Text row (Q32); the shared **Disabled** section; and **Links**, the link role in each
 * state on the page and on the inverse fill. Every token chip carries its ratio badge (owner decision Q5).
 * No Icons section (S5.3, the owner's QA-I10): the icon contrast control left the levers, so the preview's
 * sections still match the levers' one for one (Q23).
 *
 * THE BADGE MARKS (S5.3, QA-I2): a pass in the chrome's success icon color, a miss in its danger icon color
 * (`chrome.css`, `.p3-ipv`). The marks sit on the brand's page, or on its inverse fill in an Inverse row, and either
 * can be light or dark, so each mark carries the chrome theme (`data-theme`) whose icon colors are made for a ground
 * of that lightness: the light theme's on a light ground, the dark theme's on a dark one.
 *
 * LEGACY MARKUP IN A LIGHT-PINNED HOST, SPECIMENS ON THE BRAND'S PAGE (plan §9.1), as `preview/surfaces.ts`:
 * each section's ground is a specimen root painted with the brand's own `background.primary` for the mode the
 * preview shows. The section container takes the levers panel's gray (owner decision Q24, `p3-sgsec`).
 *
 * HOW IT REPAINTS: by store subscription (`brand`, `mode`), never through a legacy tier. Nothing else moves
 * it: no scroll, no focus, no lever (V1).
 */
import { brandState, currentMode, rp, subscribe, theme } from '../state/store';
import { resolvedModes } from '../state/verdict';
import { h, hook } from '../shell/dom';
import { LINKS_DESC } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { BUILT_IN_SECTION_COLUMNS, disabledSection, interactiveSection, linksSection } from './sections/index';
import { SG_SURFACES, ground, legibleInkOn, oppositeOf, sgContext, type SgRole } from './sections/kit';

/** The ink `legibleInkOn` weighs a ground with: when this dark ink reads better than a light one, the ground is light. */
const DARK_INK = '#191920';

/** Every column the brand ships, in the levers' order: Primary, Neutral, Destructive, then each accent by
 *  its column name, named as the levers name it. */
export const previewColumns = (): ReadonlyArray<readonly [string, string]> => [
  ...BUILT_IN_SECTION_COLUMNS,
  ...(brandState.interactivePalettes ?? []).map((e) => { const n = e.name ?? e.palette; return [n.charAt(0).toUpperCase() + n.slice(1), n] as const; }),
];

/** Mount the Interactive preview into `host`. Subscriptions are released through `cleanups`. */
export const mountInteractivePreview = (host: HTMLElement, cleanups: (() => void)[]): void => {
  const stack = hook(h('div', 'p3-stack p3-preview-stack'), 'interactive-preview');
  const card = hook(h('div', 'p3-legacy-card p3-ipv'), 'interactive-style-guide');
  card.dataset.theme = 'light';
  stack.append(card);
  host.replaceChildren(stack);

  const paint = (): void => {
    const all = resolvedModes(theme);
    const rolesByMode = new Map<string, Record<string, SgRole | undefined>>(all.map((x) => [x.mode as string, x.roles as Record<string, SgRole | undefined>]));
    const cur: string = rolesByMode.has(currentMode) ? currentMode : rp.modes[0];
    const c = sgContext({
      rolesByMode, cur, opp: oppositeOf(cur, rp.modes, (m) => rolesByMode.has(m)), namespace: theme.namespace, modeLabel, badges: true,
      paletteHex: (p, s) => theme.palettes.find((x) => x.palette === p)?.steps.find((x) => x.key === s)?.hex ?? null,
    });
    const page = SG_SURFACES[0];
    // Only columns the engine resolved are drawn (an accent whose palette is gone resolves nothing).
    const columns = previewColumns().filter(([, col]) => !!c.role(cur, `interactive.${col}.fill.rest`));
    const secs = [
      interactiveSection(c, { method: theme.outlineInteraction, surface: page.key, columns }),
      disabledSection(c),
      linksSection(c, LINKS_DESC),
    ];
    // Q24: each section's container on the levers panel's gray. A class in the chrome's scope, beside the
    // legacy one, so `styles.css` keeps everything else about the section.
    for (const s of secs) s.classList.add('p3-sgsec');
    card.replaceChildren(...secs.map((s) => ground(c, s, page)));
    // QA-I2: each badge mark takes the chrome theme made for its ground, the inverse fill in an Inverse row, else the page.
    const themeOn = (hex: string): string => (legibleInkOn(hex, DARK_INK) === DARK_INK ? 'light' : 'dark');
    const onPage = themeOn(c.paint(cur, page.key));
    const onInverse = themeOn(c.paint(cur, 'inverse.background.primary'));
    for (const mk of card.querySelectorAll<HTMLElement>('.sg-ratio-mk')) mk.dataset.theme = mk.closest('.sg-inv') ? onInverse : onPage;
  };
  cleanups.push(subscribe('brand', paint), subscribe('mode', paint));
  paint();
};
