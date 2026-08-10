/**
 * Shared font-weight parsing utilities — the single source of truth for
 * turning a Figma font style name (e.g. "Semi Bold Italic", "ExtraBold") into
 * a canonical numeric weight or normalized weight name.
 *
 * Both the standalone-weight path (VariableCacheManager) and the typography
 * composite fallback path (TypographyConverter) delegate here so they cannot
 * drift. Normalization: lowercase -> strip italic/oblique -> remove all spaces
 * -> look up in FONT_WEIGHT_MAP. Removing spaces before lookup is what makes
 * both spaced ("Semi Bold") and unspaced ("SemiBold", "ExtraBold") canonical
 * face names resolve to the same weight. See VMLYR/token-forge#53.
 */

import { FONT_WEIGHT_MAP } from '../types/dtcg';

// Weight names ordered longest/most-specific first so compound names like
// "extrabold" match before the substring "bold".
const WEIGHT_NAMES = [
  'extrabold',
  'ultrabold',
  'extralight',
  'ultralight',
  'semibold',
  'demibold',
  'hairline',
  'thin',
  'light',
  'regular',
  'normal',
  'roman',
  'book',
  'medium',
  'bold',
  'black',
  'heavy',
];

/**
 * Normalizes a font style name for weight lookup: lowercases, strips
 * italic/oblique modifiers, and removes all whitespace.
 *
 * @param fontStyle Raw Figma font style name
 * @returns Normalized, space-free style string
 */
function normalizeStyle(fontStyle: string): string {
  return fontStyle
    .toLowerCase()
    .replace(/\s*italic\s*/g, ' ')
    .replace(/\s*oblique\s*/g, ' ')
    .replace(/[-\s]+/g, '');
}

/**
 * Gets the expected numeric font weight (100-900) from a font style name.
 * Recognizes an explicit numeric weight, then falls back to the canonical
 * FONT_WEIGHT_MAP lookup. Unknown styles default to 400.
 *
 * @param fontStyle Font style name (e.g. "Medium", "Bold Italic", "ExtraBold")
 * @returns Numeric font weight
 */
export function getExpectedFontWeight(fontStyle: string): number {
  // Only a standalone 3-digit token is a numeric weight (100-900). This avoids
  // reading a non-weight number out of a face name like "45 Light",
  // "Inter 18pt Regular", or "V2 Bold".
  const numericMatch = fontStyle.match(/\b(\d{3})\b/);
  if (numericMatch) {
    return parseInt(numericMatch[1], 10);
  }

  const normalizedStyle = normalizeStyle(fontStyle);

  // Direct table hit (e.g. "semibold", "extrabold").
  if (FONT_WEIGHT_MAP[normalizedStyle] !== undefined) {
    return FONT_WEIGHT_MAP[normalizedStyle];
  }

  // Family-prefixed names (e.g. "interextrabold"): find the embedded weight.
  for (let i = 0; i < WEIGHT_NAMES.length; i++) {
    const weight = WEIGHT_NAMES[i];
    if (normalizedStyle.indexOf(weight) !== -1) {
      return FONT_WEIGHT_MAP[weight] !== undefined ? FONT_WEIGHT_MAP[weight] : 400;
    }
  }

  return 400;
}

/**
 * Extracts the normalized weight name from a font style string, stripping
 * italic/oblique. Returns 'regular' when no weight is recognized.
 *
 * @param fontStyle Font style name
 * @returns Weight name (e.g. "bold", "semibold")
 */
export function extractWeightName(fontStyle: string): string {
  const normalizedStyle = normalizeStyle(fontStyle);

  for (let i = 0; i < WEIGHT_NAMES.length; i++) {
    const weight = WEIGHT_NAMES[i];
    if (normalizedStyle.indexOf(weight) !== -1) {
      return weight;
    }
  }

  return 'regular';
}
