/**
 * Type, the preview (UI redesign S6.2; S6.3 the sections after Font families).
 *
 * WHAT IT SHOWS, in the legacy Style guide's markup (owner direction for the domain previews, as S4a's Surfaces &
 * fills and S5.2's Interactive): the shared **Type sample** (#1942), the one Brand's Style guide opens with (owner
 * decision Q67); then one section per lever section, each headed and described as its lever section is (Q23):
 * **Font families**; **Scale** (every style at its size, desktop and mobile, then the sizes that merge on mobile;
 * the Scale limits levers pair with it too, `PREVIEW_HEADING`); **Weights and styles**; **Line height and letter
 * spacing**; and last, read-only, **Building blocks**, the fixed steps every brand shares (Q73). All of it in the
 * previewed mode only (Q66).
 *
 * LEGACY MARKUP IN A LIGHT-PINNED HOST, SPECIMENS ON THE BRAND'S PAGE (plan §9.1), as `preview/interactive.ts`:
 * each section's ground is a specimen root painted with the brand's own `background.primary` for the mode the
 * preview shows. The section container takes the levers panel's gray (owner decision Q24, `p3-sgsec`).
 *
 * HOW IT REPAINTS: by store subscription (`brand`, `mode`, and `fonts` for the availability the Font families
 * section reads), never through a legacy tier. Nothing else moves it but an edit's reveal (QA-B9), which the frame
 * runs: no scroll, no focus, no lever (V1).
 */
import { currentMode, rp, subscribe, theme } from '../state/store';
import { resolvedModes } from '../state/verdict';
import { h, hook } from '../shell/dom';
import { DOMAINS, FACES_DESC, type PageData } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { faceStatus } from '../ui/fonts';
import type { PageLends } from './brand';
import { buildingBlocksSection, facesSection, lineSpacingSection, typeSampleSection, typeScaleSection, weightsByFaceSection } from './sections/index';
import { SG_SURFACES, ground, oppositeOf, sgContext, type SgRole } from './sections/kit';

const PAGE = DOMAINS.find((d) => d.id === 'type') as PageData;
/** A lever section's heading and description, from the page data the levers draw them from (Q23). */
const copyOf = (title: string): { title: string; desc: string } => ({ title, desc: PAGE.sections.find((x) => x.title === title)?.desc ?? '' });
/** The read-only Building blocks section (owner decision Q73): its heading (the scope's, Q73) and description
 *  (APPROVED, owner, 2026-10-03). */
export const BUILDING_BLOCKS = { title: 'Building blocks', desc: 'The fixed size, line height and letter spacing steps every brand shares. Read-only.' };

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
    const secs = [
      typeSampleSection(c, ty, cur, { ink: page.ink }),
      facesSection(c, ty, cur, { title: 'Font families', desc: FACES_DESC }, (f) => faceStatus(f, fonts)),
      typeScaleSection(c, ty, cur, copyOf('Scale')),
      weightsByFaceSection(ty, cur, copyOf('Weights and styles')),
      lineSpacingSection(c, ty, cur, copyOf('Line height and letter spacing')),
      buildingBlocksSection(c, ty, cur, BUILDING_BLOCKS),
    ];
    // Q24: each section's container on the levers panel's gray, as the Color previews' are.
    for (const s of secs) s.classList.add('p3-sgsec');
    card.replaceChildren(...secs.map((s) => ground(c, s, page)));
  };
  cleanups.push(subscribe('brand', paint), subscribe('mode', paint), subscribe('fonts', paint));
  paint();
};
