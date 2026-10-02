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
import { typefacesSection } from './typefaces';
import { weightsByFaceSection } from './weights-by-face';
import { typeRampSection, TYPE_GROUP_BLURB } from './type-ramp';
import { paintTypeFluid } from './type-fluid';
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
/** The Typography Preview tab's three sections and Layout's fluid read-out (UI redesign S6.1), shared so the
 *  new Type page draws the same code. Read-only. */
export { typefacesSection, weightsByFaceSection, typeRampSection, TYPE_GROUP_BLURB, paintTypeFluid };
/** The five, in order, by the title each section draws. */
export const COLOR_SECTIONS: ReadonlyArray<readonly [string, (c: SgCtx) => HTMLElement]> = [
  ['Background', backgroundSection], ['Foreground', foregroundSection], ['Text color', textColorSection], ['Border', borderSection], ['Icon', iconSection],
];
