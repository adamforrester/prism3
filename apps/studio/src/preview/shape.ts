/**
 * Shape, the preview (UI redesign S7; owner decision D1 A).
 *
 * WHAT IT SHOWS, in the legacy Style guide's markup (the owner's direction for the domain previews, as Type's): one
 * section per lever section, headed and described as its lever section is (Q23): **Density** (every control height
 * for the previewed mode, each named by what uses it, D6) and **Radius** (every radius size the engine emits, each
 * with what uses it, then the four control shapes; the Base radius levers reveal it too); then, read-only,
 * **Spacing** (the fixed 8px rhythm) and **Building blocks** (border widths, icon sizes and the 4px grid). All of it
 * in the previewed mode only, and drawn in a derived mode too (Q59 holds the controls, not the preview).
 *
 * LEGACY MARKUP IN A LIGHT-PINNED HOST, SPECIMENS ON THE BRAND'S PAGE (plan §9.1), as `preview/type.ts`: each
 * section's ground is a specimen root painted with the brand's own `background.primary` for the mode the preview
 * shows, and every sample on it is drawn in the brand's own roles (owner decision D2 A). The section container takes
 * the levers panel's gray (owner decision Q24, `p3-sgsec`).
 *
 * HOW IT REPAINTS: by store subscription (`brand`, `mode`), never through a legacy tier. Nothing else moves it but
 * an edit's reveal (QA-B9), which the frame runs: no scroll, no focus, no lever (V1).
 */
import { currentMode, rp, subscribe, theme } from '../state/store';
import { resolvedModes } from '../state/verdict';
import { brandControlShape } from '../state/shape-input';
import { leverManifest } from '@prism3/engine/levers';
import { h, hook } from '../shell/dom';
import { DOMAINS, type PageData } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import type { PageLends } from './brand';
import { controlHeightsSection, radiusSection, shapeBuildingBlocksSection, spacingSection, SHAPE_BUILDING_BLOCKS, SPACING_PREVIEW } from './sections/index';
import { heightsIn } from './sections/control-heights';
import { SG_SURFACES, ground, oppositeOf, sgContext, type SgRole } from './sections/kit';

const PAGE = DOMAINS.find((d) => d.id === 'shape') as PageData;
/** A lever section's heading and description, from the page data the levers draw them from (Q23). */
const copyOf = (title: string): { title: string; desc: string } => ({ title, desc: PAGE.sections.find((x) => x.title === title)?.desc ?? '' });
/** The four control shapes, by the manifest's own option labels. */
const shapeLabels = (): { v: string; l: string }[] => (leverManifest.find((l) => l.key === 'controlShape')?.options ?? []).map((o) => ({ v: String(o.value), l: o.label }));

/** Mount the Shape preview into `host`. Subscriptions are released through `cleanups`. */
export const mountShapePreview = (host: HTMLElement, cleanups: (() => void)[], _lend: PageLends): void => {
  const stack = hook(h('div', 'p3-stack p3-preview-stack'), 'shape-preview');
  const card = hook(h('div', 'p3-legacy-card'), 'shape-style-guide');
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
    const dims = theme.dims;
    const md = heightsIn(dims, cur).find((z) => z.name === 'md')?.height ?? 44;
    const secs = [
      controlHeightsSection(c, dims, cur, copyOf('Density')),
      radiusSection(c, { dims, modes: theme.modes, mode: cur, shape: brandControlShape(), shapeLabels: shapeLabels(), heightPx: md, copy: copyOf('Radius') }),
      spacingSection(c, dims, SPACING_PREVIEW),
      shapeBuildingBlocksSection(c, dims, SHAPE_BUILDING_BLOCKS),
    ];
    // Q24: each section's container on the levers panel's gray, as the other previews' are.
    for (const s of secs) s.classList.add('p3-sgsec');
    card.replaceChildren(...secs.map((s) => ground(c, s, SG_SURFACES[0])));
  };
  cleanups.push(subscribe('brand', paint), subscribe('mode', paint));
  paint();
};
