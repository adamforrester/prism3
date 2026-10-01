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
import { interactiveSection, type InteractiveSectionOptions } from './interactive';
import type { SgCtx } from './kit';

export { backgroundSection, foregroundSection, textColorSection, borderSection, iconSection };
/** The Style guide's last two sections (UI redesign S5.1): Disabled, then Interactive, which also takes the
 *  brand's outline method and the ground it sits on. Shared so Color › Interactive can draw them too. */
export { disabledSection, interactiveSection, type InteractiveSectionOptions };
/** The five, in order, by the title each section draws. */
export const COLOR_SECTIONS: ReadonlyArray<readonly [string, (c: SgCtx) => HTMLElement]> = [
  ['Background', backgroundSection], ['Foreground', foregroundSection], ['Text color', textColorSection], ['Border', borderSection], ['Icon', iconSection],
];
