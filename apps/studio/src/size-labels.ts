/**
 * Column-header labelling for the studio's heading-SIZE tables (#1586).
 *
 * The size table lays out one column per THEME-axis mode (light/dark/…). But type sizes do NOT vary
 * by appearance — they vary by VIEWPORT (mobile/desktop), a separate axis the studio size table does
 * not expose: it is derived at generation time by the Responsive type lever. So the base value must
 * NOT read as the "Light" appearance mode. Framed as "LIGHT baseline" it implies appearance governs
 * sizes and sends the reader looking for a desktop/mobile control that lives elsewhere.
 *
 * A brand CAN still override size per theme mode (`sizeByMode`, e.g. a dark-mode tweak), so the dark
 * and derived columns keep their appearance labels — only the base column is reframed.
 *
 * This lives in its own module, not inside `main.ts`, so `test-size-labels.ts` can drive it under
 * `tsx`: `main.ts` calls `build()` (and touches `document`) at import time and cannot be loaded
 * there — the same reason `provenance.ts` and `export-settings.ts` are their own modules.
 */

/** The label shown for the viewport-independent BASE column of a size table. Deliberately NOT an
 *  appearance-mode name ("Light") — reverting this to the appearance form is the #1586 regression
 *  `test-size-labels.ts` catches by name. */
export const SIZE_BASE_LABEL = 'Base';

/** The base column's hover explanation. Voice-standard §3: declarative, present tense, system as
 *  subject; the em dash carries the why. */
export const SIZE_BASE_TITLE =
  'One base size — the Responsive type lever scales it between mobile and desktop.';

export interface SizeColumnHeader {
  /** The header text. */
  text: string;
  /** A muted qualifier rendered after the text, or '' when there is none. */
  suffix: string;
  /** A hover explanation, or undefined when there is none. */
  title?: string;
}

/**
 * The header parts for one column of a heading-SIZE table:
 *  - the base column (the theme axis's base, internally `light`) reads as a viewport-independent
 *    BASE, never the "Light" appearance mode;
 *  - a derived (non-editable) mode keeps its appearance label plus the " auto" qualifier (#423);
 *  - an editable non-base mode (e.g. dark) keeps its appearance label — its column edits a
 *    legitimate per-theme-mode size override (`sizeByMode`).
 */
export const sizeColumnHeader = (
  isBase: boolean,
  isEditable: boolean,
  modeLabel: string,
): SizeColumnHeader => {
  if (isBase) return { text: SIZE_BASE_LABEL, suffix: '', title: SIZE_BASE_TITLE };
  if (!isEditable) return { text: modeLabel, suffix: ' auto' };
  return { text: modeLabel, suffix: '' };
};
