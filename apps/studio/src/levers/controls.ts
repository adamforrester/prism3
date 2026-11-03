/**
 * Lever control helpers, DOM-free so `test-lever-controls.ts` imports them under `tsx` with no `document`: the one
 * palette list a palette-ref picker offers (`paletteRefOptions`, #1835) and a lever's `data-p3` hook (`leverHook`).
 *
 * The control descriptor that lived here (`describeControl`, #1675 / UI redesign F4: an enum of 2 to 4 options draws
 * as chips, otherwise a select) went in #2487 PR 6. No page read it: each page builds its own controls, so its
 * test proved a rule nothing followed (review finding A17).
 */
/** The one list of palettes a palette-ref picker offers (#1835): `primary`, `neutral`, then the
 *  brand colors in their declared order. Every palette picker in the studio, and so the plugin, reads this.
 *
 *  The Action palette select offers `neutral` too since #3365 (owner, 2026-11-03): a brand whose buttons and links
 *  are near-black picks `neutral` directly instead of adding a duplicate gray. The engine has always accepted it
 *  (`theme.ts` checks `actionPalette` against every defined palette), and it moves only the action family. */
export const paletteRefOptions = (_key: string, brandColorNames: readonly string[]): string[] =>
  ['primary', 'neutral', ...brandColorNames];

/** The `data-p3` hook for a lever's control group: `lever-<key>` in kebab-case, so
 *  `motionPersonality.tempo` is `lever-motion-personality-tempo`. */
export const leverHook = (key: string): string =>
  `lever-${key.replace(/\./g, '-').replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
