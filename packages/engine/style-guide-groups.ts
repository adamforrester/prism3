/**
 * Prism3 engine — THE STYLE-GUIDE GROUPS (#2801, owner decisions Q378).
 *
 * The plugin's style-guide command draws one guide per variable family (`Style guide — <name>`) on
 * `↳ Primitive tokens` and `↳ Semantic tokens`. This table says which titled group each guide sits in when a
 * file is drawn fresh. It lives here, not in the plugin, so every surface reads one definition (decision 1).
 *
 * MAPPED GENERICALLY, NEVER BY A BRAND'S FAMILY NAMES (decision 1). A guide's group comes from three facts the
 * plugin reads off the variables, never from a ramp or role name:
 *   • its TIER: primitive (no variable in the guide aliases another) or semantic;
 *   • its TYPE: `color`, `dimension`, `borderWidth`, `opacity`, a font kind, `typography`, `shadow`, `gradient`;
 *   • for a semantic dimension, whether EVERY row is a radius (a corner, by scope or name).
 * So another brand's `accent` ramp lands in Palettes because it is a primitive color family, and an icon
 * family lands in Semantic colors when its variables are colors and in Space & size when they are sizes.
 *
 * A TYPE WITH NO GROUP STANDS ALONE (Q378 Q6 A): the effect styles, the gradient styles and any later type are
 * drawn ungrouped until this table gives them a group.
 *
 * INVERSE SHARES SEMANTIC COLORS (the owner's change on #2801, 2026-10-16): each inverse family is its own
 * guide, drawn in a second row under the default-surface family it re-states (`inverseRow`).
 *
 * PURE — no `node:*`, no I/O, no imports.
 */

export type StyleGuideTier = 'primitive' | 'semantic';

export interface StyleGuideGroup {
  /** Stable across runs: the plugin data a drawn group carries. Never shown. */
  id: string;
  tier: StyleGuideTier;
  /** The group's title as drawn (decision 2: a title, no description). */
  title: string;
  /** True for the one group that draws inverse guides in a second row, each under its default counterpart. */
  inverseRow?: boolean;
}

/** In the order the groups stack down each page (Q378 Q2 A). */
export const STYLE_GUIDE_GROUPS: readonly StyleGuideGroup[] = [
  { id: 'palettes', tier: 'primitive', title: 'Palettes' },
  { id: 'dimensions', tier: 'primitive', title: 'Dimensions' },
  { id: 'primitive-fonts', tier: 'primitive', title: 'Fonts' },
  { id: 'semantic-colors', tier: 'semantic', title: 'Semantic colors', inverseRow: true },
  { id: 'space-size', tier: 'semantic', title: 'Space & size' },
  { id: 'borders', tier: 'semantic', title: 'Borders' },
  { id: 'semantic-fonts', tier: 'semantic', title: 'Fonts' },
];

/** The font-variable kinds, each its own guide, all in the tier's Fonts group. */
const FONT_TYPES = new Set(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing']);

/** What a guide is, as the group rule reads it. */
export interface StyleGuideGuideFacts {
  type: string;
  tier: StyleGuideTier;
  /** Every row is a radius. Read for a semantic `dimension` guide only. */
  allRadius?: boolean;
}

/**
 * The group a guide is drawn in on a fresh file, by type and tier, or null for a type with no group.
 *   • color: Palettes (primitive) · Semantic colors (semantic, inverse included);
 *   • dimension, border width, opacity: Dimensions (primitive); semantic: Borders for a border width or a guide
 *     of radii, Space & size for the rest (space, size, icon size, control, opacity);
 *   • a font kind: the tier's Fonts; text styles: Fonts (semantic);
 *   • anything else (effect styles, gradient styles, a later type): null.
 */
export const styleGuideGroupOf = (g: StyleGuideGuideFacts): string | null => {
  const primitive = g.tier === 'primitive';
  if (g.type === 'color') return primitive ? 'palettes' : 'semantic-colors';
  if (g.type === 'dimension' || g.type === 'borderWidth' || g.type === 'opacity') {
    if (primitive) return 'dimensions';
    return g.type === 'borderWidth' || (g.type === 'dimension' && g.allRadius) ? 'borders' : 'space-size';
  }
  if (FONT_TYPES.has(g.type)) return primitive ? 'primitive-fonts' : 'semantic-fonts';
  if (g.type === 'typography') return 'semantic-fonts';
  return null;
};

export const styleGuideGroup = (id: string): StyleGuideGroup | undefined => STYLE_GUIDE_GROUPS.find((g) => g.id === id);
