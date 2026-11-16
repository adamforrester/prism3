/**
 * Prism3 engine — theme building.
 *
 * Two entry points:
 *  - nbTheme()      — the New Balance regression theme: reads measured anchors
 *                     from the schema, names palettes by hue (red/green/amber),
 *                     emits in NB's dialect (nbds.* / rgb; primitives under palette). Used to prove the
 *                     engine reproduces a real brand.
 *  - brandTheme()   — the white-label path: a brand supplies primary + neutral
 *                     (+ optional status overrides) and the engine SYNTHESISES
 *                     status palettes from canonical hues, carving a separate
 *                     danger red when the primary isn't already red. Names
 *                     palettes by role and emits the product dialect (prism.*
 *                     / hex; primitives under palette). This is what makes the system white-label.
 *
 * This file is the barrel (#3698 R5): each axis lives in its own `theme-*.ts` module, and this file
 * re-exports exactly the names `theme.ts` exported before the split, so no importer changes. It holds
 * nothing but re-exports; `lint-theme-split.ts` holds it to that.
 */
export { ALL_MODES, VALID_MODES, RESERVED_ROOTS, CORE_TIER, RAISED_SURFACE_VALUES, SCRIM_STRENGTH_VALUES, SECONDARY_TEXT_GROUND_VALUES, SHIPPED_GLASS_ROLE, GLASS_ROLE_NAME, validGlassRoles, OUTLINE_INTERACTION_VALUES, validOutlineHoverFill, OUTLINE_WASH_STEPS, OUTLINE_WASH_DEFAULTS, validOutlineWash, outlineWashSteps } from './theme-types';
export type { NbMeasured, Role, OKLCH, PaletteBuild, ModeLevers, Dims, InteractivePalette, LinkStateRungs, RaisedSurface, ScrimStrength, SecondaryTextGround, GlassRoleInput, OutlineInteraction, OutlineHoverPick, OutlineHoverFill, OutlineWash, Theme, SurfaceSpec, SurfaceStep, InverseSurfaceSpec, SurfaceMode, SurfacesConfig, BrandInput, BrandInputAuthored } from './theme-types';
export { isReservedPalette, RED_CHROMA_FLOOR, inRedTerritory, DISABLED_FLOOR_MIN, DISABLED_FLOOR_MAX, normalizeDisabledStrategy, normalizeDisabledMin } from './theme-color';
export { buildDims } from './theme-dims';
export { EASING_ROLE_DEFAULTS, SPIN_ROLE, SPIN_MS, SPIN_REDUCED_MS, SWEEP_ROLE, SWEEP_MS, SWEEP_REDUCED_MS, LOOP_ROLES } from './theme-motion';
export type { Bezier, MotionPersonality, MotionAxis } from './theme-motion';
export { typefaceSlug, WEIGHT_ROLE_ORDER, TYPE_GROUPS, isItalicCut, LINE_HEIGHT_KEYS, LETTER_SPACING_KEYS, TRACKING_SHIFT_KEYS, LINE_HEIGHT_LADDER, LETTER_SPACING_LADDER, lineHeightStepKey, letterSpacingStepKey, TYPE_WEIGHTS_DEFAULT, REQUIRED_WEIGHT_ROLES, BUTTON_LABEL_DEFAULT_ROLE, weightAvailability, TYPE_LINK_DEFAULT, TYPE_LINK_ALWAYS, UNDERLINE_BOUNDS, UNDERLINE_ON_DEFAULT, resolveUnderline, BODY_XS_DESCRIPTION, DISPLAY_VARIANTS, mobileEndpoint, HEADING_SIZE_FLOOR, PER_MODE_SIZE_GROUPS, CAPTION_SIZE_FLOOR, BRAND_SIZE_GROUPS, derivedRungFor, shiftRung, brandLineHeights, brandLetterSpacings } from './theme-type';
export type { FontFamilyBinding, Typeface, WeightRoleName, WeightRole, TypeGroup, FacePin, TypeComposite, Typography, LineHeightKey, LetterSpacingKey, TypographyInput, ResolvedUnderline, DisplayVariant, PerModeSizeGroup, BrandSizeGroup } from './theme-type';
export type { ShadowLayer, ShadowStep, ShadowAxis } from './theme-shadow';
export { CONTAINER_MIN_PX, gridGapLink, gridGapNotes } from './theme-layout';
export type { Breakpoint, GridStep, LayoutAxis, GapLink } from './theme-layout';
export type { GradientStopInput, GradientInput, GradientStop, ResolvedGradient, GradientAxis } from './theme-gradient';
export { brandTheme } from './theme-brand';
export { nbSpecsFrom, buildRamp, nbThemeFrom } from './theme-nb';
export type { RampSpec } from './theme-nb';
