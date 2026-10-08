// Prism3 chrome spec: which token each chrome variable reads, which pairs and layers it must clear.
//
// Lifted verbatim out of `docs/superpowers/ui-redesign/build-v6.mjs` in S1.1 of the UI redesign
// (`implementation-plan.md` §3.1): V6_VARS, VARS_FOR, ALIAS, PAIRS, LAYER_STEP and LAYERS are the
// mockup's, unchanged, and `build-v6.mjs` imports them from here. The product build
// (`esbuild-plugin.mjs`) reads the same rows, so the mockup and the product cannot name different
// tokens for one variable. The only thing here that is the product's own is SHELL_VARS, at the end.
//
// Zero dependencies, no network. Nothing here reads a file.

import { TILE_VARS, C, D, T, E } from './tokens.mjs';

// The tile's map, plus v6's layering and edge roles. A v6 row may name a different token per theme,
// because IA-2 and B1 are orderings and thresholds, not one role: the same ladder position lands on a
// different step in the dark overlay. Each entry is [variable, light path, dark path, kind, what].
export const V6_VARS = [
  // IA-2. Neutral 025 has no semantic role in light, so the light side reads the ramp step directly. It
  // is noted as a possible engine role, not filed. Dark has no step between 950 and 900, so the same
  // "a little off the page" position is background.secondary (neutral 900).
  ['levers-bg', 'core.palette.neutral.025', 'color.background.secondary', C, 'levers panel (IA-2)'],
  // The top bar: light background.secondary (neutral 050); dark background.tertiary (neutral 850),
  // one more step up the dark ladder, so the three surfaces keep their order in both themes. Secondary
  // text is 4.17:1 on neutral 850, so nothing on the bar is set in text-2: the bar carries primary text,
  // glyphs (3:1) and white-filled controls. The audit measures every text node on it.
  ['bar-bg', 'color.background.secondary', 'color.background.tertiary', C, 'top bar (IA-2)'],
  // B1. The control edge on the page and on the levers panel: neutral 400 (border.secondary) in light,
  // 3.28:1 on white and 3.06:1 on neutral 025. In dark the token that clears 3:1 closest on neutral
  // 950 and 900 is field.border.rest (neutral 550: 3.52 and 3.25; neutral 600 is 2.91 and 2.68).
  ['edge', 'color.border.secondary', 'color.field.border.rest', C, 'control edge on the page and levers (B1)'],
  // B1. On the top bar border.secondary fails in light (2.70:1 on neutral 050), so the bar keeps
  // field.border.rest (3.18:1). In dark, field.border.rest fails on neutral 850 (2.92:1) and
  // border.secondary (neutral 500) clears it closest (3.52:1).
  ['edge-bar', 'color.field.border.rest', 'color.border.secondary', C, 'control edge on the top bar (B1)'],
  // Type for the hierarchy the owner asked for (V8): a 20px view title, and tracked small capitals for
  // card titles. Same token in both themes.
  ['fs-20', 'core.font.size.20', 'core.font.size.20', D, 'view title'],
  ['ls-wide', 'core.font.letter-spacing-role.wide', 'core.font.letter-spacing-role.wide', D, 'card title tracking'],
];
export const VARS_FOR = (mode) => [...TILE_VARS, ...V6_VARS.map(([n, l, d, k]) => [n, mode === 'light' ? l : d, k])];

export const ALIAS = { Inter: 'P3 Chrome UI', 'JetBrains Mono': 'P3 Chrome Mono' };

// Declared chrome pairs: [fg var, bg var, floor, what]. The design intent, checked before anything
// renders; audit-v6.mjs measures every rendered element independently. B1: every edge-on-ground
// combination the chrome draws is here, in both themes. Grounds: bg-page (the preview, cards, fields,
// menus), levers-bg (the levers panel), bar-bg (the top bar), fill-1 (insets: tracks, pickers, tips).
export const PAIRS = [
  ['text', 'bg-page', 4.5, 'body text on the page'],
  ['text', 'levers-bg', 4.5, 'text on the levers panel'],
  ['text', 'bar-bg', 4.5, 'text on the top bar'],
  ['text', 'fill-1', 4.5, 'text on an inset'],
  ['text-2', 'bg-page', 4.5, 'secondary text on the page'],
  ['text-2', 'levers-bg', 4.5, 'secondary text on the levers panel (intro, tabs)'],
  ['text-2', 'fill-1', 4.5, 'secondary text on an inset (tags, derived hatch, unselected segment)'],
  ['inv-text', 'inv-bg', 4.5, 'Apply Theme and Continue'], ['inv-text', 'inv-bg-2', 4.5, 'Apply Theme and Continue, hover'],
  ['bad-text', 'bg-page', 4.5, 'danger text on the page'], ['bad-text', 'fill-1', 4.5, 'danger text on an inset (error cause)'],
  // B1 edges
  ['edge', 'bg-page', 3, 'control edge on the page, a card or a menu'],
  ['edge', 'levers-bg', 3, 'control edge on the levers panel (search, tab-row controls)'],
  ['edge-bar', 'bar-bg', 3, 'control edge on the top bar (brand, verdict, Export, Figma, agent chip)'],
  ['field-edge', 'fill-1', 3, 'control edge in an inset (selected segment, picker step, per-mode body)'],
  ['field-edge', 'bg-page', 3, 'edge of a selected segment on a page-colored track (the 380 top row)'],
  ['field-edge-hover', 'bg-page', 3, 'edge on hover; slider thumb edge'],
  ['field-edge-hover', 'levers-bg', 3, 'edge on hover on the levers panel'],
  // Added by the product (S1.2): a top-bar control's edge on hover. The mockup drew a hover wash there.
  ['field-edge-hover', 'bar-bg', 3, 'edge on hover on the top bar'],
  ['ctl-edge', 'bg-page', 3, 'selected chip edge on the page'],
  ['ctl-edge', 'levers-bg', 3, 'selected chip edge on the levers panel'],
  ['ctl-edge', 'bar-bg', 3, 'pressed edge on the top bar'],
  ['ctl-edge', 'fill-1', 3, 'selected edge on an inset'],
  ['text', 'bg-page', 3, 'selected tab underline in the preview'],
  ['text', 'levers-bg', 3, 'selected tab underline on the levers panel'],
  ['line-2', 'bg-page', 3, 'slider rail; menu and dialog edge'], ['icon', 'bg-page', 3, 'slider fill'],
  ['inv-bg', 'bg-page', 3, 'switch on track'],
  ['icon-2', 'bg-page', 3, 'info glyph, chevrons, switch off knob'], ['icon-2', 'fill-1', 3, 'glyph on an inset'],
  ['icon-2', 'levers-bg', 3, 'glyph on the levers panel'], ['icon-2', 'bar-bg', 3, 'glyph on the top bar'],
  // Added by the product (S1.4): the Activity button's status dot, running (a ring) or a new result.
  ['icon', 'bar-bg', 3, 'Activity status dot on the top bar'],
  ['ok-icon', 'bar-bg', 3, 'verdict dot on the top bar'], ['ok-icon', 'bg-page', 3, 'check in a badge'], ['ok-icon', 'fill-1', 3, 'check in a status pill'],
  ['bad-icon', 'bar-bg', 3, 'failure dot on the top bar'], ['bad-icon', 'bg-page', 3, 'refused-field outline'], ['bad-icon', 'fill-1', 3, 'error glyph in a pill or card'],
  ['warn-icon', 'bg-page', 3, 'warning glyph'], ['warn-icon', 'fill-1', 3, 'warning glyph in a pill'],
  // Added by the product (S12, owner decision S5): the guard's Discard, Prism3's destructive button, on the window.
  ['danger-on', 'danger-fill', 4.5, 'Discard: the destructive button\'s label on its fill'],
  ['danger-fill', 'bg-page', 3, 'Discard: the destructive button\'s fill against the window'],
  ['danger-edge-hover', 'bg-page', 3, 'Discard: its edge on hover'],
  ['text', 'fill-2', 3, 'progress fill on its track'], ['icon', 'fill-2', 3, 'spinner arc on its track'],
];

// IA-2 layers: the preview, the levers panel and the top bar must be three distinct steps, in one
// direction, in both themes. A literal floor per step: 1.04:1 separates neighboring neutral steps
// (the smallest pair here is 1.07:1) and rejects a panel pointed back at the page (1.00:1).
export const LAYER_STEP = 1.04;
export const LAYERS = [['bg-page', 'preview'], ['levers-bg', 'levers panel'], ['bar-bg', 'top bar']];

// ── the product's map ──────────────────────────────────────────────────────────────────────────
// The variables the shipped chrome defines, by NAME. Each name is looked up in the mockup's rows
// (TILE_VARS, then V6_VARS through VARS_FOR), then in the product's own rows below, so the product
// inherits the mockup's token path for each theme and cannot fork it. The fonts are always defined
// (CHROME_FONTS in `tokens.mjs`).
//
// The map grows with the shell (§3.1): the product build fails on a variable defined here that
// `apps/studio/src/chrome.css` never reads, so each slice adds a name in the same change that adds the
// rule reading it. S1.1 mapped the page ground and the text. S1.2 adds what the frame draws: the three
// layers (IA-2), the B1 edges for the top bar and the gray tab row, the controls' geometry, type, space
// and focus, and the radius split below.
//
// RADIUS, decided by the owner on 2026-10-01: #1852 landed `radius.xl`, `2xl` and `3xl` (8, 12 and 16 at
// the default scale). Containers (cards, panels, the drawer, a menu) take `radius.xl`; controls (fields,
// chips, buttons, segments, tabs) take `radius.lg`. Both map from those role tokens, never from a
// dimension primitive, so they follow the radius lever. The mockup's rows have `radius-lg` (TILE_VARS) and
// no `radius.xl`, so `radius-xl` is the product's own row, in PRODUCT_VARS. S1.2 draws the first container
// (the theme menu, and the segmented track concentric around its segments) and maps it.
//
// Neutral 025 is read directly from `core.palette.neutral.025` through v6's `levers-bg` row, as IA-2
// decided; the engine role for it is not filed yet (D7).

/** Rows the product adds beyond the mockup's: [variable, light path, dark path, kind, what]. Same shape
 *  as V6_VARS, and held to the same checks (the brand-leak scan, the pairs below when they name one). */
export const PRODUCT_VARS = [
  ['radius-xl', 'radius.xl', 'radius.xl', D, 'containers and the segmented track (owner, 2026-10-01)'],
  // S2: concept v6's 56px hero swatch (V7, its `l-hero-sw`) and the step picker's 72px step (V9, its
  // `l-step`), from the dimension grid rather than as raw lengths.
  ['hero-sw', 'core.dimension.56', 'core.dimension.56', D, 'the Palettes hero swatch (V7)'],
  ['step-w', 'core.dimension.72', 'core.dimension.72', D, 'the step picker\'s smallest step (V9)'],
  // S4a: concept v6's 44px gradient bar in the levers (its `gbar2`), which says which gradient a card edits.
  ['gbar-h', 'core.dimension.44', 'core.dimension.44', D, 'the gradient editor\'s bar (V8)'],
  // QA-B9, QA-B17: the eased scroll's duration and curve, both read from the one composite the engine emits for
  // them, `motion.transition.default` (its `duration` and `timingFunction` members), so the two cannot drift apart
  // (the shared styling pass; #2015 read `motion.duration.normal` and the mockup's `ease` row separately).
  ['transition-dur', 'motion.transition.default#duration', 'motion.transition.default#duration', T, 'the eased scroll of the edit-reveal and the jump links'],
  ['transition-ease', 'motion.transition.default#timingFunction', 'motion.transition.default#timingFunction', E, 'the eased scroll\'s curve'],
  // S13.1: the layout column the brand menu (four, concept's 288px popover) and the export dialog (twelve, 864px,
  // the legacy dialog's width) are measured in, from the dimension grid; and the dialogs' scrim, the engine's role.
  ['l-col', 'core.dimension.72', 'core.dimension.72', D, 'the brand menu\'s and the export dialog\'s column'],
  ['scrim', 'color.scrim.default', 'color.scrim.default', C, 'the scrim behind the export and prune dialogs'],
  // F1 A (owner, 2026-10-05): a disabled text field takes Prism3's own disabled text field skin, the three roles the
  // engine's text field definition binds (`packages/engine/components/text-field.ts`: `disabled.fill`, `disabled.border`
  // and the ON-FILL ink, since the field always has a fill). It sits on no surface, so no `inverse.*` set. Same role in
  // both themes; the dark overlay moves the value. Contrast-exempt as inactive (INACTIVE, below).
  ['disabled-fill', 'color.disabled.fill', 'color.disabled.fill', C, 'a disabled text field\'s fill; a disabled filled button\'s fill (F1 A, X4 A)'],
  ['disabled-edge', 'color.disabled.border', 'color.disabled.border', C, 'a disabled text field\'s edge (F1 A)'],
  ['disabled-ink', 'color.disabled.on-fill', 'color.disabled.on-fill', C, 'a disabled text field\'s value; a disabled filled button\'s label and glyph (F1 A, X4 A)'],
  // X4 A (owner, 2026-10-05, #2155): a disabled button takes Prism3's own disabled button skin, per appearance, as
  // `packages/engine/components/button.ts` and `icon-button.ts` bind it. Filled (Apply Theme, Continue, Discard): the
  // fill above and the on-fill ink, no edge. Outline (every page-colored button) and text (every ghost button): no
  // fill, the label on `disabled.text` and the glyph on `disabled.icon`; outline's edge binds `disabled.icon` too
  // (#1349), never `disabled.border`. These two are the only roles a button binds that the text field does not.
  ['disabled-text', 'color.disabled.text', 'color.disabled.text', C, 'a disabled outline or ghost button\'s label (X4 A)'],
  ['disabled-icon', 'color.disabled.icon', 'color.disabled.icon', C, 'a disabled outline or ghost button\'s glyph, and the outline button\'s edge (X4 A)'],
  // #2144 (owner decision FR1 A, 2026-10-05): every chrome focus ring draws in Prism3's focus color. It resolves
  // through `core.palette.primary`, so `brandLeaks` lets it through by this name only (BRAND_ALLOW, `tokens.mjs`).
  ['focus-ring', 'color.border.focus', 'color.border.focus', C, 'every chrome focus ring (#2144)'],
  // S12: the start window's width unit, from the dimension grid: the window is five of these (640px, the mockup's) and
  // the guard over it three and three quarters (480px).
  ['dlg-unit', 'core.dimension.128', 'core.dimension.128', D, 'the start window\'s and the guard\'s widths'],
  // S12 (owner decision S5): the guard's Discard wears Prism3's destructive button, the Button.Destructive component's
  // default (filled) appearance: its fill and its on-fill ink at rest, from the same tokens in both themes. Hover moves
  // the edge to the destructive border's hover step, the way the outline appearance carries state: the filled hover
  // step under the on-fill ink measures 3.31:1 in dark (#2135), below the 4.5:1 text floor.
  ['danger-fill', 'color.interactive.destructive.fill.rest', 'color.interactive.destructive.fill.rest', C, 'the destructive button\'s fill (S5)'],
  ['danger-on', 'color.interactive.destructive.on-fill', 'color.interactive.destructive.on-fill', C, 'the destructive button\'s label (S5)'],
  ['danger-edge-hover', 'color.interactive.destructive.border.hover', 'color.interactive.destructive.border.hover', C, 'the destructive button\'s edge on hover (S5)'],
];
/** Pairs the product adds beyond the mockup's PAIRS, for PRODUCT_VARS rows the mockup never maps (`build-v6.mjs` reads
 *  PAIRS and would refuse a name it has no row for). Same shape as PAIRS; the product build evaluates both. */
export const PRODUCT_PAIRS = [
  // #2144 (owner decision FR1 A): every chrome focus ring, 2px outside the control, on each ground it sits on.
  ['focus-ring', 'bg-page', 3, 'focus ring on the page'],
  ['focus-ring', 'levers-bg', 3, 'focus ring on the levers panel'],
  ['focus-ring', 'bar-bg', 3, 'focus ring on the top bar'],
  ['focus-ring', 'fill-1', 3, 'focus ring on an inset'],
];
export const PRODUCT_FOR = (mode) => PRODUCT_VARS.map(([n, l, d, k]) => [n, mode === 'light' ? l : d, k]);

export const SHELL_VARS = [
  // the three layers (IA-2) and the hairlines between them
  'bg-page', 'levers-bg', 'bar-bg', 'fill-1', 'line-1', 'line-2',
  // text, glyphs, status
  'text', 'text-2', 'icon', 'icon-2', 'bad-text',
  // S1.3: the verdict's and the mode control's status dots, Health's glyphs
  'ok-icon', 'bad-icon', 'dot',
  // edges (B1), hover and focus
  'edge', 'edge-bar', 'field-edge-hover', 'ctl-edge', 'focus-ring', 'focus-width', 'focus-offset',
  // the inverse fill: Apply, and nothing else
  'inv-bg', 'inv-bg-2', 'inv-text',
  // geometry
  'bar-h', 'ctl-h', 'ctl-h-sm', 'ctl-h-xs', 'hit-min', 'icon-xs', 'bw-hairline', 'bw-thick',
  'radius-md', 'radius-lg', 'radius-xl', 'radius-pill',
  'space-025', 'space-050', 'space-075', 'space-100', 'space-150', 'space-200', 'space-300', 'space-400', 'space-500',
  // type
  'fs-12', 'fs-14', 'fw-default', 'fw-emphasis', 'lh-compact', 'lh-normal',
  // S1.3: the preview title (V8's 20px view title) and the cards' tracked small-capital titles
  'fs-20', 'ls-wide',
  // S2: the levers panel, the Palettes preview (V7, V8) and the step picker (V9): section and palette titles
  // at 16, the strong weight and snug tracking v6 sets them in, cozy leading for notes, the warning glyph, the
  // checkerboard's second ground, the picker step's edge, and the two sizes above.
  'fs-16', 'fw-strong', 'ls-snug', 'lh-cozy', 'warn-icon', 'fill-2', 'field-edge', 'hero-sw', 'step-w',
  // #2322: the headings' tracking (view titles, section and group headings, card titles) and the view titles' Bold.
  'ls-tightest', 'ls-tighter', 'ls-snugger', 'ls-open', 'fw-bold',
  // S4a: the gradient editor's bar on Color › Surfaces & fills.
  'gbar-h',
  // S11 (owner decision #4 on #1956): a running write's spinner, its delay and turn, and the reduced turn.
  'dur-fast', 'dur-spin', 'dur-spin-reduced',
  // QA-B9, QA-B17: the edit-reveal's and the jump links' eased scroll, on the default transition's duration and
  // curve (\`preview/follow-edit.ts\`), from the composite.
  'transition-dur', 'transition-ease',
  // QA-B11: the fill rows' swatch, as tall as a row's label and token (the mockup's 40px swatch row).
  'swatch-h',
  // S13.1: the brand menu's and the export dialog's column, and the dialogs' scrim.
  'l-col', 'scrim',
  // F1 A: a disabled text field in Prism3's disabled skin.
  'disabled-fill', 'disabled-edge', 'disabled-ink',
  // X4 A: a disabled button in Prism3's disabled button skin.
  'disabled-text', 'disabled-icon',
  // S12: the start window and its guard: the scrim, the window's width unit and its card padding, and the guard's
  // destructive Discard (S5).
  'overlay-pressed', 'dlg-unit', 'space-250', 'danger-fill', 'danger-on', 'danger-edge-hover',
  // S11.2: the Build style guides page's switch, concept v6's track and knob.
  'track-w', 'track-h', 'thumb', 'thumb-inset',
];

// Mapped color variables that carry no contrast duty: a hairline that splits regions, a hover wash.
// The product build evaluates every PAIRS entry whose two variables are both in SHELL_VARS, in both
// themes, and fails on a mapped color variable that takes part in none of them. A name listed here is
// exempt from that, and only from that. Each entry says why it is decorative. S1.2 lists one: the
// hairline (`border.primary`) that splits the bar, the tab row, the sub-nav and the two panes, and rings the
// brand swatch. It is never a control's boundary; every control edge is a declared pair at 3:1. S1.2 maps
// no hover wash: a hover shows an edge (a declared pair) or the inset fill (`fill-1`, paired with text).
// S13.1 adds the scrim: a translucent wash over the page behind a modal dialog. Nothing is read on it; the dialog
// draws its own opaque ground (`bg-page`), and every pair inside the dialog is declared on that ground. S12 lists a
// third: the start window's scrim (`overlay-pressed`, concept v6's), a wash over the studio behind the window. Nothing
// is read on it; the window it holds is opaque.
export const DECORATIVE = ['line-1', 'overlay-pressed', 'scrim'];

// Mapped color variables that paint only an INACTIVE control (owner decisions F1 A and X4 A, 2026-10-05). WCAG 2.2 exempts a
// user interface component that is not available for user interaction from SC 1.4.3 (text) and SC 1.4.11 (non-text),
// so these take part in no PAIRS entry. A name listed here is exempt from the [pairs] "in no declared pair" check, and
// only from that. It is not a free pass: the build refuses an INACTIVE name whose token is not a `color.disabled.*`
// role in either theme, so a live color cannot be parked here; and `test:chrome` exempts a drawn node only when it is
// really disabled, and then holds it to these exact Prism3 roles, read from the emission.
export const INACTIVE = ['disabled-fill', 'disabled-edge', 'disabled-ink', 'disabled-text', 'disabled-icon'];
