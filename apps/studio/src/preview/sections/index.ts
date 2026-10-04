/**
 * The Style guide's color sections, shared (UI redesign S4a; owner decision Q5, `decisions-2026-10-01-qa.md`):
 * Background, Foreground, Text color, Border and Icon, in the Style guide's order. The legacy Style guide and
 * Color › Surfaces & fills' preview both draw these and nothing else for the five, so the two cannot drift.
 */
import { backgroundSection } from './background';
import { foregroundSection } from './foreground';
import { textColorSection } from './text-color';
import { borderSection } from './border';
import { iconSection } from './icon';
import { disabledSection } from './disabled';
import { BUILT_IN_SECTION_COLUMNS, interactiveSection, type InteractiveSectionOptions } from './interactive';
import { linksSection } from './links';
import { focusRingSection } from './focus-ring';
import { weightsByFaceSection } from './weights-by-face';
import { typeScaleSection, SCALE_SAMPLE_CAP, MERGE_TITLE } from './type-scale';
import { lineSpacingSection } from './line-spacing';
import { buildingBlocksSection } from './building-blocks';
import { typeSampleSection, typeSamplePicks, TYPE_SAMPLE_DISPLAY } from './type-sample';
import { facesSection } from './faces';
import { radiusSection, USED_BY_NONE } from './radius';
import { controlHeightsSection, buttonHeightLabel } from './control-heights';
import { spacingSection, SPACING_PREVIEW } from './spacing';
import { shapeBuildingBlocksSection, SHAPE_BUILDING_BLOCKS } from './shape-building-blocks';
import { radiusSampleSection, RADIUS_SAMPLE } from './radius-sample';
import type { SgCtx } from './kit';

export { backgroundSection, foregroundSection, textColorSection, borderSection, iconSection };
/** The Style guide's last two sections (UI redesign S5.1): Disabled, then Interactive, which also takes the
 *  brand's outline method and the ground it sits on. Shared so Color › Interactive can draw them too. */
export { disabledSection, interactiveSection, BUILT_IN_SECTION_COLUMNS, type InteractiveSectionOptions };
/** Color › Interactive's Links section (UI redesign S5.2). The Style guide does not draw it. */
export { linksSection };
/** The Focus ring section (UI redesign S4c), shared so Color › Surfaces & fills can draw it after Border
 *  (owner decision Q30). Read-only. */
export { focusRingSection };
/** The Type preview's sections (UI redesign S6.1 lifted Weights and styles out of `main.ts`; S6.3 replaced the full
 *  type ramp and Layout's fluid read-out with Scale, and added Line height and letter spacing and the read-only
 *  Building blocks). Read-only. */
export { weightsByFaceSection, typeScaleSection, SCALE_SAMPLE_CAP, MERGE_TITLE, lineSpacingSection, buildingBlocksSection };
/** The type sample (#1942, S6.2): Brand's Style guide draws it first, and the Type preview too (owner decision
 *  Q67). The Type preview's Faces section (S6.2). Read-only. */
export { typeSampleSection, typeSamplePicks, TYPE_SAMPLE_DISPLAY, facesSection };
/** The Shape preview's sections (UI redesign S7): Density's control heights, Radius, and the read-only Spacing and
 *  Building blocks. The radius sample is the Style guide's (owner decision D18 B). Read-only. */
export { radiusSection, USED_BY_NONE, controlHeightsSection, buttonHeightLabel, spacingSection, SPACING_PREVIEW, shapeBuildingBlocksSection, SHAPE_BUILDING_BLOCKS,
  radiusSampleSection, RADIUS_SAMPLE };
/** The five, in order, by the title each section draws. */
export const COLOR_SECTIONS: ReadonlyArray<readonly [string, (c: SgCtx) => HTMLElement]> = [
  ['Background', backgroundSection], ['Foreground', foregroundSection], ['Text color', textColorSection], ['Border', borderSection], ['Icon', iconSection],
];
