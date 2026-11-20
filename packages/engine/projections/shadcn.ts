/**
 * Prism3 — THE SHADCN/UI ROLE MAP (#2997). shadcn/ui's theme variables, each pointed at the Prism3 role that fills it.
 *
 * This is the one authored part of the shadcn projection. It holds NO values: every row names a role path below the
 * brand root (`color.background.primary`, `radius.lg`), and `emit-shadcn.ts` reads that role's value, per mode, from the
 * emitted DTCG handoff. So a brand never retunes this file, and the projection has no second source of values.
 *
 * WHAT DECIDED EACH ROW. The owner's decisions on #2997 (2026-11-19): Q2997.1 B (`card` is `background.primary`, the
 * page white, edged by `border`), and every other question as recommended — Q2997.2 A (`popover`), 3 A (`accent`),
 * 4 A (`muted`), 9 A (`destructive-foreground` is emitted), 10 A (`chart-*`), 11 A (`sidebar`), 12 B (each
 * `--radius-*` rung set from our scale), 16 A (`--font-sans` and `--font-mono` only). The proposal's §2 table gives the
 * reasons row by row; this file does not restate them.
 *
 * WHAT HOLDS IT. Gate 3 (`shadcn-vars.ts --check`) holds the keys of `SHADCN_VARS` against the pinned shadcn variable
 * set in `schema/shadcn-vars.json`, both ways. Gate 4 (`lint-shadcn-contract.ts`) holds the rows that a Prism3
 * component contract also binds (Button, Text Field, Focus Ring) to that binding, and every role here to the
 * guaranteed name surface in `schema/token-contract.json`. Neither gate reads its expectation from this file.
 *
 * VERSIONING (#2997 §9). `SHADCN_MAP_VERSION` records which shadcn variable set the output targets. MAJOR when an
 * emitted shadcn name is dropped, MINOR when one is added. A remap moves values, not names, so it raises nothing here:
 * it is an engine change, declared in a `changes/` note. `CONTRACT_VERSION` never moves for this file: the names are
 * shadcn's, not ours.
 */

export const SHADCN_MAP_VERSION = '1.0.0';

/** A color row's role, per mode. One role serves both of shadcn's modes (`:root` and `.dark`); the emitted overlay
 *  supplies the dark value. */
export const SHADCN_COLOR_VARS: Readonly<Record<string, string>> = {
  'background': 'color.background.primary',
  'foreground': 'color.text.primary',
  // Q2997.1 B: shadcn's own look, the page surface plus a `border` edge, not Prism3's gray card fill.
  'card': 'color.background.primary',
  'card-foreground': 'color.text.primary',
  // Q2997.2 A: `foreground.raised` is ruled out off the scrim by its own avoid_when.
  'popover': 'color.foreground.primary',
  'popover-foreground': 'color.text.primary',
  'primary': 'color.interactive.primary.fill.rest',
  'primary-foreground': 'color.interactive.primary.on-fill',
  'secondary': 'color.interactive.neutral.fill.rest',
  'secondary-foreground': 'color.interactive.neutral.on-fill',
  // Q2997.4 A: the one page tier where `text.secondary` clears its floor.
  'muted': 'color.background.secondary',
  'muted-foreground': 'color.text.secondary',
  // Q2997.3 A: shadcn's `accent` is a hover surface, not the brand's accent palette.
  'accent': 'color.interactive.neutral.fill.hover',
  'accent-foreground': 'color.interactive.neutral.on-fill',
  // Q2997.8 A: shadcn also uses `destructive` as text; those pairs are recorded as known failures, and the engine
  // question is its own issue.
  'destructive': 'color.interactive.destructive.fill.rest',
  // Q2997.9 A: dropped from shadcn's theming page, still mapped by its manual-install `@theme inline`.
  'destructive-foreground': 'color.interactive.destructive.on-fill',
  'border': 'color.border.primary',
  'input': 'color.field.border.rest',
  'ring': 'color.border.focus',
  // Q2997.10 A: invented. Prism3 has no data-viz roles; these are the five guaranteed solid brand and status fills.
  'chart-1': 'color.foreground.brand',
  'chart-2': 'color.foreground.info',
  'chart-3': 'color.foreground.success',
  'chart-4': 'color.foreground.warning',
  'chart-5': 'color.foreground.danger',
  // Q2997.11 A: invented. No sidebar role; the page tier where the text floors hold.
  'sidebar': 'color.background.secondary',
  'sidebar-foreground': 'color.text.primary',
  'sidebar-primary': 'color.interactive.primary.fill.rest',
  'sidebar-primary-foreground': 'color.interactive.primary.on-fill',
  'sidebar-accent': 'color.interactive.neutral.fill.hover',
  'sidebar-accent-foreground': 'color.interactive.neutral.on-fill',
  'sidebar-border': 'color.border.primary',
  'sidebar-ring': 'color.border.focus',
};

/** The one non-color row in shadcn's `:root`. shadcn derives its whole radius scale from it; Q2997.12 B also sets
 *  each rung directly (`SHADCN_THEME_VARS`), so the derived values never reach a stock component. */
export const SHADCN_DIMENSION_VARS: Readonly<Record<string, string>> = {
  'radius': 'radius.lg',
};

/** Every shadcn theme variable this map emits in `:root` and `.dark` (radius in `:root` only, as shadcn does). */
export const SHADCN_VARS: Readonly<Record<string, string>> = { ...SHADCN_COLOR_VARS, ...SHADCN_DIMENSION_VARS };

/** Names emitted although shadcn's pinned set does not carry them, each with the decision that keeps it. Gate 3
 *  accepts a map key outside the pinned set only when it is named here. */
export const SHADCN_EXTRAS: Readonly<Record<string, string>> = {
  'destructive-foreground': 'Q2997.9 A — shadcn\'s manual-install page still maps --color-destructive-foreground',
};

/** The registry item's `cssVars.theme`, Tailwind v4 `@theme` keys. Q2997.12 B: every radius rung our scale has
 *  (shadcn's `radius-4xl` has no rung, so it keeps shadcn's derived value). Q2997.16 A: the sans and mono families
 *  only; the display and title families have no stock home. */
export const SHADCN_THEME_VARS: Readonly<Record<string, string>> = {
  'radius-sm': 'radius.sm',
  'radius-md': 'radius.md',
  'radius-lg': 'radius.lg',
  'radius-xl': 'radius.xl',
  'radius-2xl': 'radius.2xl',
  'radius-3xl': 'radius.3xl',
  'font-sans': 'core.font.family.body',
  'font-mono': 'core.font.family.code',
};

/** The CSS generic family appended after each mapped typeface, so a page without the brand font still gets the
 *  right kind of face. */
export const SHADCN_FONT_FALLBACK: Readonly<Record<string, string>> = {
  'font-sans': 'sans-serif',
  'font-mono': 'monospace',
};

/** Rows no Prism3 component contract binds for the same job, so gate 4 has nothing to hold them to yet. When a
 *  matching contract lands (Card, Menu), its row leaves this list and joins the gate's anchors. */
export const SHADCN_UNANCHORED = [
  'background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground', 'muted', 'muted-foreground',
  'accent', 'accent-foreground', 'border', 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5',
  'sidebar', 'sidebar-foreground', 'sidebar-primary', 'sidebar-primary-foreground', 'sidebar-accent',
  'sidebar-accent-foreground', 'sidebar-border', 'sidebar-ring', 'radius',
] as const;
