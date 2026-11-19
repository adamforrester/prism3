/** Prism3 engine — Color: the canonical status hues, the palette names the engine always mints, the red-territory
 *  test the danger palette is carved by, and the disabled-ink contrast floor.
 *
 *  Split out of `theme.ts` (#3698 R5), which re-exports its public names unchanged.
 */
import { generateRamp, peakChromaL, type Step } from './ramp';
import type { OKLCH } from './theme-types';

// ---- canonical status hues (engine-supplied; a brand need not specify them) ----
export const STATUS_DEFAULTS: Record<'success' | 'warning' | 'danger' | 'info', OKLCH & { chroma: number }> = {
  success: { l: 0.55, c: 0.15, h: 145, chroma: 0.15 },
  warning: { l: 0.55, c: 0.15, h: 75, chroma: 0.15 },
  danger: { l: 0.55, c: 0.17, h: 27, chroma: 0.17 },
  info: { l: 0.55, c: 0.13, h: 245, chroma: 0.13 },
};

// Palette names the engine always mints — a brandColor may not collide with these, else
// `new Map(palettes)` / `palette[name] = node` (last-wins) would let a brandColor named
// `neutral`/`primary` REPLACE the ramp the whole surface model is built on, or a status name
// silently replace the brandColor — gates stay green on corrupted output (CR-03). Includes the
// tree.ts base swatches (`white`/`black`/`transparent`/`*-alpha`).
export const RESERVED_PALETTES = new Set(['primary', 'neutral', 'success', 'warning', 'info', 'danger', 'white', 'black', 'transparent', 'black-alpha', 'white-alpha']);
/** Whether `name` is a palette the engine always mints, so a brand color may not take it (#3562: the studio's
 *  rename checks this rather than keeping its own list). */
export const isReservedPalette = (name: string): boolean => RESERVED_PALETTES.has(name);
// A brandColor name is a palette slug: it becomes a `{root.palette.<name>.<step>}` alias path,
// so it must be a single lowercase kebab segment — no dots (break alias paths), spaces, or
// symbols (also closes the CR-07 XSS vector at the source: an HTML-metachar name can't validate).
export const PALETTE_NAME_RE = /^[a-z][a-z0-9-]*$/;

/** Angular distance between two hues (degrees, 0..180). */
export const hueDist = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};
// A hue in the red window still needs enough chroma to READ as red — below this it's a warm
// grey/greige, not a danger signal (M-05). Reusing such a primary for `danger` would collapse
// destructive signaling to a near-neutral. ~0.08 is the floor where a red starts to register.
export const RED_CHROMA_FLOOR = 0.08;
/** Is this primary a SATURATED red — close enough in hue AND chromatic enough to BE the danger
 *  hue? A red-ish but desaturated (greige) primary is not red: danger must carve its own. */
export const inRedTerritory = (hue: number, chroma: number): boolean =>
  hueDist(hue, STATUS_DEFAULTS.danger.h) <= 20 && chroma >= RED_CHROMA_FLOOR;

/** Generate a vivid, unanchored status ramp from a canonical hue. */
export const statusRamp = (hue: number, chroma: number): Step[] =>
  generateRamp({ hue, chroma, peakL: peakChromaL(hue) });
/** The lowest disabled-ink contrast this system will emit, on either branch. 3:1 is the
 *  SC 1.4.11 non-text / SC 1.4.3 large-text threshold and where Primer + USWDS sit — the
 *  lowest ratio defensibly called legible. Below this we'd be relying on the WCAG
 *  inactive-component exemption, which this system deliberately does not do. */
export const DISABLED_FLOOR_MIN = 3;
/** The `'full'` branch's fixed promise, and the ceiling of the `'reduced'` dial: AA text. */
export const DISABLED_FLOOR_MAX = 4.5;
/** Normalize `disabledStrategy`, absorbing the two legacy aliases. Both map to `'reduced'`:
 *  `'accessible'` was already a gated floor, and `'conventional'` (~2:1, ungated) is retired
 *  because the floor is now absolute. Single source of truth for `brandTheme` + the read-model. */
export const normalizeDisabledStrategy = (s: string | undefined): 'full' | 'reduced' =>
  s === 'full' ? 'full' : 'reduced';
/** Normalize `disabledMin` into [3, 4.5]. A legacy `'conventional'` input carried no floor of
 *  its own (it targeted ~2:1), so it lands on the 3:1 minimum — RAISING its contrast. */
export const normalizeDisabledMin = (strategy: string | undefined, min: number | undefined): number => {
  if (strategy === 'conventional') return DISABLED_FLOOR_MIN;
  return Math.min(DISABLED_FLOOR_MAX, Math.max(DISABLED_FLOOR_MIN, min ?? DISABLED_FLOOR_MIN));
};
