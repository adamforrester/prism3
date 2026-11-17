/**
 * `@prism3/engine` — THE ENGINE'S PUBLIC ENTRY FOR THE SURFACES (#3698 F4, R5 item 3).
 *
 * The studio (`apps/studio`) and the plugin (`apps/plugin`) import the engine through four entries and nothing
 * else; `lint-engine-facade.ts` fails a deep path (`@prism3/engine/theme`) or a relative one into this package.
 * A file move or split inside the engine then edits one of these four files and no surface.
 *
 *   `@prism3/engine`             this file — the token core: theme, color, modes, tree, scale, levers, design.md,
 *                                and the component rename record. Web-safe: no module here defines a component or
 *                                imports the projector, so the web studio imports it without pulling in a
 *                                definition (`vercel-ignore-check.mjs`). The rename record (`component-renames.ts`,
 *                                data with no imports) sits here, not in `/components`, for two readers that must
 *                                not reach the projector: the plugin's MCP paste steps (`reactions.ts`), which
 *                                `mcp-paste.ts` serves `anatomy-figma` as one lifted function, and the studio's
 *                                typecheck, which reaches `apps/plugin/src/executor-reach.ts`.
 *   `@prism3/engine/components`  `index-components.ts` — the definitions, their schema, the Figma projector and
 *                                its readback. Kept out of the web bundle by name (`test-shell-imports.ts`).
 *   `@prism3/engine/figma`       `index-figma.ts` — the plugin's writers: write plans, Figma emitters, readback,
 *                                file facts, and the variable and style rename records. None is in the web bundle.
 *   `@prism3/engine/harness`     `index-harness.ts` — node-only helpers for the surfaces' tests and gates (fixtures
 *                                read from disk, the MCP server's identity, the comparison base). Never bundled.
 *
 * Each entry re-exports, by name, only what a surface uses: no `export *`, so the list is the seam. Adding a
 * name is a one-line edit in its entry's file. The engine's own modules never import an entry; they import each
 * other directly. The deep subpaths stay in `package.json` `exports` for the engine's own tools and `tools/`, which
 * are not surfaces.
 *
 * Re-exports only, no code. With `sideEffects: false` in `package.json`, a bundler drops a re-exported module that
 * a bundle uses nothing from, so a surface bundle holds the same modules as when it imported them by path.
 */
export {
  ALL_MODES, CAPTION_SIZE_FLOOR, DISPLAY_VARIANTS, EASING_ROLE_DEFAULTS, GLASS_ROLE_NAME, HEADING_SIZE_FLOOR,
  LETTER_SPACING_KEYS, LETTER_SPACING_LADDER, LINE_HEIGHT_KEYS, LINE_HEIGHT_LADDER, LOOP_ROLES,
  OUTLINE_WASH_DEFAULTS, OUTLINE_WASH_STEPS, PER_MODE_SIZE_GROUPS, REQUIRED_WEIGHT_ROLES, SHIPPED_GLASS_ROLE,
  SPIN_ROLE, TRACKING_SHIFT_KEYS, TYPE_LINK_ALWAYS, TYPE_LINK_DEFAULT, UNDERLINE_BOUNDS, UNDERLINE_ON_DEFAULT,
  brandTheme, derivedRungFor, isReservedPalette, nbThemeFrom, normalizeDisabledStrategy, shiftRung, typefaceSlug,
  weightAvailability,
} from './theme';
export type {
  BrandInput, FacePin, GlassRoleInput, GradientInput, LayoutAxis, OutlineHoverFill, OutlineWash, PerModeSizeGroup,
  RaisedSurface, ResolvedGradient, ScrimStrength, Theme, TypeComposite, TypographyInput,
} from './theme';
export {
  ACHROMATIC_C, composite, contrast, formatRatio, hex, hexToRgb, oklchToRgb, rgbToOklch, storedOklch,
} from './color';
export type { RGB } from './color';
export { BUILTIN_MODES, GROUND_INPUT, outlineFillRole, resolveAllModes, withIconTwins } from './modes';
export type { ModeResult, PrimitiveRef } from './modes';
export { buildTree, deref, familyOf, numOf, pxOf, remPxOf, subNode } from './tree';
export type { TreeNode } from './tree';
export {
  DEFAULT_MIN_WIDTH_MULTIPLIER, ICON_SIZES, SPACE_BASE, buttonMinWidth, componentSizes, controlRadius,
  densitySpacingStep, sizeRefPx,
} from './scale';
export type {
  BannerStyle, ButtonContentSize, ButtonIcons, ButtonLabelWeight, ButtonTextHover, ControlShape, CurrentIndicator,
  Density, DialogTitleSize, FieldStyle, RadioDotShare, SearchFieldStyle, SizeStep, TagStyle,
} from './scale';
export { CONTRACT_VERSION, ENGINE_VERSION } from './version';
export { leverManifest } from './levers';
export type { Lever } from './levers';
export { parseDesignMd, toDesignMd } from './design-md';
export { isStandardDesignMd, parseStandardDesignMd, standardToBrandInput } from './standard-design-md';
export {
  PERSIST_VERSION, UnrecognizedPersistedInputError, deserializeBrandInput, serializeBrandInput,
} from './persist-input';
export { resolvePreview } from './resolve-preview';
export type { ResolvedPreview } from './resolve-preview';
export { autoPlaceStep } from './ramp';
export { isInverseRole } from './inverse-roles';
export { TRAITS } from './vocabulary';
export { colorVariablesOutOfOrder } from './color-order';
export { buildBase, buildOverlaySet, stripExtensions } from './emit-dtcg-overlay';
export { BUTTON_SPACING } from './button-spacing';
export { default as EXAMPLE_BRANDS_JSON } from './schema/example-brands.json';
export {
  COMPONENT_RENAMES, coordKey, coordPairs, currentDefId, formerDefIds, partRenames, renameCoordinate, renameProperty,
  slotMigrationOf, slotTextMigrationOf,
} from './component-renames';
export type { ComponentRename } from './component-renames';
