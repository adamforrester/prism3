/**
 * THE GENERIC CLASS OF A NAMED FAMILY (#3140; owner decision Q3138.6 A).
 *
 * A face named by a brand is emitted as a stack: the face, then a system fallback tail, ending in a CSS generic.
 * Before this, every non-code text type took the sans tail, so a serif face (Playfair Display, Instrument Serif)
 * shipped `…, sans-serif`, and anything that could not load the face drew a sans instead: the studio's preview, and
 * every consumer page. The engine cannot tell a serif from a name, so it is told: this curated map. A known serif or
 * serif display family gets the serif tail; a family the map does not know keeps the sans tail, as before. No brand
 * setting: the owner prefers no new lever.
 *
 * CURATED, NOT INFERRED. Each entry is a family a designer is likely to name, matched case-insensitively on the whole
 * name. A name is never parsed for "Serif": the word is in "Sans Serif" too, and a guess that misfires ships a wrong
 * tail to every consumer. A family missing here is a one-line addition, and its tail moves in the next `regen`.
 *
 * DEPENDENCY-FREE and pure, as the rest of the engine.
 */

/** Serif and serif display families, by name. Sorted; add a family where it sorts. */
export const SERIF_FAMILIES: readonly string[] = [
  'Abril Fatface', 'Alegreya', 'Baskerville', 'Bitter', 'Bodoni Moda', 'Book Antiqua', 'Cambria', 'Cormorant',
  'Cormorant Garamond', 'Crimson Pro', 'Crimson Text', 'DM Serif Display', 'DM Serif Text', 'EB Garamond',
  'Fraunces', 'Garamond', 'Georgia', 'IBM Plex Serif', 'Instrument Serif', 'Libre Baskerville', 'Libre Caslon Text',
  'Lora', 'Merriweather', 'Newsreader', 'Noto Serif', 'Noto Serif Display', 'Palatino', 'Palatino Linotype',
  'Playfair', 'Playfair Display', 'PT Serif', 'Roboto Serif', 'Source Serif 4', 'Source Serif Pro', 'Spectral',
  'Times', 'Times New Roman', 'Young Serif', 'Zilla Slab',
];
const SERIF_LC = new Set(SERIF_FAMILIES.map((f) => f.toLowerCase()));

/** The serif tail: system serifs first, then the CSS generic. */
export const SERIF_FALLBACK = ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'];

/** `serif` for a family the map knows as one, else null: the caller keeps its own tail. */
export const genericClassOf = (family: string): 'serif' | null => (SERIF_LC.has(family.trim().toLowerCase()) ? 'serif' : null);
