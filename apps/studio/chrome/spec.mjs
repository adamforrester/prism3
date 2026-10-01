// Prism3 chrome spec: which token each chrome variable reads, which pairs and layers it must clear.
//
// Lifted verbatim out of `docs/superpowers/ui-redesign/build-v6.mjs` in S1.1 of the UI redesign
// (`implementation-plan.md` §3.1): V6_VARS, VARS_FOR, ALIAS, PAIRS, LAYER_STEP and LAYERS are the
// mockup's, unchanged, and `build-v6.mjs` imports them from here. The product build
// (`esbuild-plugin.mjs`) reads the same rows, so the mockup and the product cannot name different
// tokens for one variable. The only thing here that is the product's own is SHELL_VARS, at the end.
//
// Zero dependencies, no network. Nothing here reads a file.

import { TILE_VARS, C, D } from './tokens.mjs';

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
  ['inv-text', 'inv-bg', 4.5, 'Apply Theme'], ['inv-text', 'inv-bg-2', 4.5, 'Apply Theme, hover'],
  ['bad-text', 'bg-page', 4.5, 'danger text on the page'], ['bad-text', 'fill-1', 4.5, 'danger text on an inset (error cause)'],
  // B1 edges
  ['edge', 'bg-page', 3, 'control edge on the page, a card or a menu'],
  ['edge', 'levers-bg', 3, 'control edge on the levers panel (search, tab-row controls)'],
  ['edge-bar', 'bar-bg', 3, 'control edge on the top bar (brand, verdict, Export, Figma, agent chip)'],
  ['field-edge', 'fill-1', 3, 'control edge in an inset (selected segment, picker step, per-mode body)'],
  ['field-edge', 'bg-page', 3, 'edge of a selected segment on a page-colored track (the 380 top row)'],
  ['field-edge-hover', 'bg-page', 3, 'edge on hover; slider thumb edge'],
  ['field-edge-hover', 'levers-bg', 3, 'edge on hover on the levers panel'],
  ['ctl-edge', 'bg-page', 3, 'selected chip edge; focus ring on the page'],
  ['ctl-edge', 'levers-bg', 3, 'focus ring on the levers panel'],
  ['ctl-edge', 'bar-bg', 3, 'focus ring and pressed edge on the top bar'],
  ['ctl-edge', 'fill-1', 3, 'focus ring and selected edge on an inset'],
  ['text', 'bg-page', 3, 'selected tab underline in the preview'],
  ['text', 'levers-bg', 3, 'selected tab underline on the levers panel'],
  ['line-2', 'bg-page', 3, 'slider rail; menu and dialog edge'], ['icon', 'bg-page', 3, 'slider fill'],
  ['inv-bg', 'bg-page', 3, 'switch on track'],
  ['icon-2', 'bg-page', 3, 'info glyph, chevrons, switch off knob'], ['icon-2', 'fill-1', 3, 'glyph on an inset'],
  ['icon-2', 'levers-bg', 3, 'glyph on the levers panel'], ['icon-2', 'bar-bg', 3, 'glyph on the top bar'],
  ['ok-icon', 'bar-bg', 3, 'verdict dot on the top bar'], ['ok-icon', 'bg-page', 3, 'check in a badge'], ['ok-icon', 'fill-1', 3, 'check in a status pill'],
  ['bad-icon', 'bar-bg', 3, 'failure dot on the top bar'], ['bad-icon', 'bg-page', 3, 'refused-field outline'], ['bad-icon', 'fill-1', 3, 'error glyph in a pill or card'],
  ['warn-icon', 'bg-page', 3, 'warning glyph'], ['warn-icon', 'fill-1', 3, 'warning glyph in a pill'],
  ['text', 'fill-2', 3, 'progress fill on its track'], ['icon', 'fill-2', 3, 'spinner arc on its track'],
];

// IA-2 layers: the preview, the levers panel and the top bar must be three distinct steps, in one
// direction, in both themes. A literal floor per step: 1.04:1 separates neighboring neutral steps
// (the smallest pair here is 1.07:1) and rejects a panel pointed back at the page (1.00:1).
export const LAYER_STEP = 1.04;
export const LAYERS = [['bg-page', 'preview'], ['levers-bg', 'levers panel'], ['bar-bg', 'top bar']];

// ── the product's map ──────────────────────────────────────────────────────────────────────────
// The variables the shipped chrome defines, by NAME. Each name is looked up in the mockup's rows
// (TILE_VARS, then V6_VARS through VARS_FOR), so the product inherits the mockup's token path for
// each theme and cannot fork it. The fonts are always defined (CHROME_FONTS in `tokens.mjs`).
//
// The map grows with the shell (§3.1): the product build fails on a variable defined here that
// `apps/studio/src/chrome.css` never reads, so each slice adds a name in the same change that adds the
// rule reading it. S1.1 maps the page ground and the text, and nothing else.
//
// RADIUS, decided by the owner on 2026-10-01, for the slice that first draws a container or a control:
// #1852 landed `radius.xl`, `2xl` and `3xl` (8, 12 and 16 at the default scale). Containers (cards,
// panels, the drawer) take `radius.xl`; controls (fields, chips, buttons, segments) take `radius.lg`.
// Both map from those role tokens, never from a dimension primitive, so they follow the radius lever.
// The mockup's rows have `radius-lg` (TILE_VARS) and no `radius.xl`, so the slice that adds containers
// adds that row as the product's own. Neither is mapped yet: S1.1 draws no container and no control.
export const SHELL_VARS = ['bg-page', 'text'];

// Mapped color variables that carry no contrast duty: a hairline that splits regions, a hover wash.
// The product build evaluates every PAIRS entry whose two variables are both in SHELL_VARS, in both
// themes, and fails on a mapped color variable that takes part in none of them. A name listed here is
// exempt from that, and only from that. Each entry says why it is decorative. Empty in S1.1: the two
// mapped colors are a pair.
export const DECORATIVE = [];
