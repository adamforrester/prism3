/**
 * Prism3 — THE TAILWIND v4 `@theme` ROLE MAP (#2997 PR 3). Holds no values, like `projections/shadcn.ts`.
 *
 * Decided on #2997 (2026-11-19): Q2997.7 A (v4 `@theme` only), Q2997.15 A (colors under shadcn's names only, as
 * shadcn's own `@theme inline` maps them, so the color rows are `SHADCN_COLOR_VARS` and are not restated here),
 * Q2997.12 B (every radius rung from our scale), Q2997.16 A (`--font-sans` and `--font-mono` only). Shadows and
 * `--spacing` are the proposal's §2 list.
 *
 * Shadow values differ per mode, so each `--shadow-<rung>` reads a per-mode variable, `--pds3-shadow-<rung>`, which the
 * file sets in `:root` and `.dark`. Tailwind's `--shadow-2xs` and `--radius-4xl` have no rung here, so they keep
 * Tailwind's defaults.
 *
 * `TAILWIND_MAP_VERSION` follows `SHADCN_MAP_VERSION`'s rule (#2997 §9): MAJOR when an emitted Tailwind name is
 * dropped, MINOR when one is added; a remap is an engine change, not a version.
 */
export const TAILWIND_MAP_VERSION = '1.0.0';

/** Mode-independent `@theme` rows, written as literals. */
export const TAILWIND_DIMENSIONS: Readonly<Record<string, string>> = {
  'radius-sm': 'radius.sm',
  'radius-md': 'radius.md',
  'radius-lg': 'radius.lg',
  'radius-xl': 'radius.xl',
  'radius-2xl': 'radius.2xl',
  'radius-3xl': 'radius.3xl',
  // Tailwind multiplies this one base: `p-2` is `calc(var(--spacing) * 2)`, so every `space.*` step lands on a whole
  // or half unit of 4px.
  'spacing': 'space.050',
};

export const TAILWIND_FONTS: Readonly<Record<string, string>> = {
  'font-sans': 'core.font.family.body',
  'font-mono': 'core.font.family.code',
};

/** Per-mode `@theme` rows: `--shadow-<rung>: var(--pds3-shadow-<rung>)`. */
export const TAILWIND_SHADOWS: Readonly<Record<string, string>> = {
  'shadow-xs': 'shadow.xs',
  'shadow-sm': 'shadow.sm',
  'shadow-md': 'shadow.md',
  'shadow-lg': 'shadow.lg',
  'shadow-xl': 'shadow.xl',
  'shadow-2xl': 'shadow.2xl',
};

/** The per-mode variable a shadow row reads. */
export const shadowModeVar = (key: string): string => `pds3-${key}`;
