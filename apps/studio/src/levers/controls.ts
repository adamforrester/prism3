/**
 * Lever control helpers, DOM-free so `test-lever-controls.ts` imports them under `tsx` with no `document`: the one
 * palette list a palette-ref picker offers (`paletteRefOptions`, #1835) and a lever's `data-p3` hook (`leverHook`).
 *
 * The control descriptor that lived here (`describeControl`, #1675 / UI redesign F4: an enum of 2 to 4 options draws
 * as chips, otherwise a select) went in #2487 PR 6. No page read it: each page builds its own controls, so its
 * test proved a rule nothing followed (review finding A17).
 */
/** The one list of palettes a palette-ref picker offers (#1835): `primary`, `neutral`, then the
 *  brand colors in their declared order. Every palette picker in the studio reads this.
 *
 *  One exception, kept so this change moves no behavior: the Action palette select has never offered
 *  `neutral`. #1811 decides that it should, and its fix (#1827) lands as the removal of this line. */
export const paletteRefOptions = (key: string, brandColorNames: readonly string[]): string[] => {
  const neutral = key === 'actionPalette' ? [] : ['neutral'];
  return ['primary', ...neutral, ...brandColorNames];
};

/** The `data-p3` hook for a lever's control group: `lever-<key>` in kebab-case, so
 *  `motionPersonality.tempo` is `lever-motion-personality-tempo`. */
export const leverHook = (key: string): string =>
  `lever-${key.replace(/\./g, '-').replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
