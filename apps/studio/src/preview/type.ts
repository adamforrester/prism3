/**
 * Type, the preview (UI redesign S6.2).
 *
 * WHAT IT SHOWS, in the legacy Style guide's markup (owner direction for the domain previews, as S4a's Surfaces &
 * fills and S5.2's Interactive): the shared **Type sample** (#1942), the one Brand's Style guide opens with (owner
 * decision Q67); **Faces**, headed and described as the Faces lever section is (Q23); then the legacy Typography
 * Preview tab's sections, lifted in S6.1: **Weight roles by face**, **The full type ramp**, and Layout's fluid
 * read-out under "Headings scale between mobile and desktop" (Q70's words). All of it in the previewed mode only
 * (Q66): the ramp shows that one mode's column, and Weight roles by face is mode-blind by an earlier decision.
 *
 * LEGACY MARKUP IN A LIGHT-PINNED HOST, SPECIMENS ON THE BRAND'S PAGE (plan §9.1), as `preview/interactive.ts`:
 * each section's ground is a specimen root painted with the brand's own `background.primary` for the mode the
 * preview shows. The section container takes the levers panel's gray (owner decision Q24, `p3-sgsec`).
 *
 * HOW IT REPAINTS: by store subscription (`brand`, `mode`, and `fonts` for the availability the Faces section
 * reads), never through a legacy tier. Nothing else moves it: no scroll, no focus, no lever (V1).
 */
import { currentMode, rp, subscribe, theme } from '../state/store';
import { resolvedModes } from '../state/verdict';
import { h, hook } from '../shell/dom';
import { FACES_DESC } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { faceStatus } from '../ui/fonts';
import type { PageLends } from './brand';
import { facesSection, paintTypeFluid, typeRampSection, typeSampleSection, weightsByFaceSection } from './sections/index';
import { SG_SURFACES, el, ground, oppositeOf, palSection, sgContext, type SgRole } from './sections/kit';

/** The fluid read-out's heading: the owner's plain words for fluid sizing (Q70, APPROVED). Its description is
 *  DRAFT, pending the owner. */
export const FLUID_TITLE = 'Headings scale between mobile and desktop';
export const FLUID_DESC = 'Each heading that scales, from its mobile size to its desktop size.';

/** Mount the Type preview into `host`. Subscriptions are released through `cleanups`. */
export const mountTypePreview = (host: HTMLElement, cleanups: (() => void)[], lend: PageLends): void => {
  const stack = hook(h('div', 'p3-stack p3-preview-stack'), 'type-preview');
  const card = hook(h('div', 'p3-legacy-card'), 'type-style-guide');
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
    const page = SG_SURFACES[0];
    const ty = theme.typography;
    const fonts = lend.fonts();
    const fluid = palSection(FLUID_TITLE, FLUID_DESC);
    const read = el('div');
    paintTypeFluid(read, ty);
    fluid.append(read);
    const secs = [
      typeSampleSection(c, ty, cur, { ink: page.ink }),
      facesSection(c, ty, cur, { title: 'Faces', desc: FACES_DESC }, (f) => faceStatus(f, fonts)),
      weightsByFaceSection(ty, rp.modes),
      typeRampSection(ty, [cur]),
      fluid,
    ];
    // Q24: each section's container on the levers panel's gray, as the Color previews' are.
    for (const s of secs) s.classList.add('p3-sgsec');
    card.replaceChildren(...secs.map((s) => ground(c, s, page)));
  };
  cleanups.push(subscribe('brand', paint), subscribe('mode', paint), subscribe('fonts', paint));
  paint();
};
