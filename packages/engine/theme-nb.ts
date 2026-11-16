/** Prism3 engine — The regression theme: `nbThemeFrom` builds a theme from the measured fixture, in its own dialect.
 *
 *  Split out of `theme.ts` (#3698 R5), which re-exports its public names unchanged.
 */
import { generateRamp, type Step } from './ramp';
import { type OKLCH, type Role, type NbMeasured, type Theme, type PaletteBuild, CORE_TIER, ALL_MODES } from './theme-types';
import { statusRamp, STATUS_DEFAULTS } from './theme-color';
import { buildDims } from './theme-dims';
import { buildMotion } from './theme-motion';
import { buildTypography, withLabelDefault } from './theme-type';
import { buildShadow } from './theme-shadow';
import { buildLayout } from './theme-layout';

// ---------------------------------------------------------------------------
// New Balance regression theme (measured anchors, NB dialect)
// ---------------------------------------------------------------------------
const oklchOf = (o: any): OKLCH => ({ l: o.l, c: o.c, h: o.h });

export type RampSpec = {
  name: string; palette: string; role: Role; hue: number; chroma: number;
  anchor?: { oklch: OKLCH; stepNum: number };
};

/** NB regression specs from parsed measured data (kept stable so the regression stays comparable). */
export const nbSpecsFrom = (s: NbMeasured): RampSpec[] => {
  return [
    { name: 'brand (red)', palette: 'red', role: 'brand', hue: s.primaryColor.oklch.h, chroma: s.primaryColor.oklch.c, anchor: { oklch: oklchOf(s.primaryColor.oklch), stepNum: 550 } },
    { name: 'success (green)', palette: 'green', role: 'success', hue: s.statusColors.success.oklch.h, chroma: s.statusColors.success.oklch.c, anchor: { oklch: oklchOf(s.statusColors.success.oklch), stepNum: 500 } },
    { name: 'warning (amber)', palette: 'amber', role: 'warning', hue: s.statusColors.warning.oklch.h, chroma: s.statusColors.warning.oklch.c, anchor: { oklch: oklchOf(s.statusColors.warning.oklch), stepNum: 500 } },
    { name: 'neutral', palette: 'neutral', role: 'neutral', hue: s.neutralHue.hue, chroma: s.neutralHue.chroma },
  ];
};

export const buildRamp = (spec: RampSpec): Step[] =>
  generateRamp({ hue: spec.hue, chroma: spec.chroma, anchor: spec.anchor });

export const nbThemeFrom = (s: NbMeasured): Theme => {
  const specs = nbSpecsFrom(s);
  const palettes: PaletteBuild[] = specs.map((spec) => ({
    palette: spec.palette, role: spec.role, description: spec.name, steps: buildRamp(spec),
    ...(spec.role === 'success' || spec.role === 'warning' ? { hueSource: 'brand' as const } : {}),
  }));
  // NB ships no blue; synthesise an info palette so the semantic layer is complete.
  palettes.push({ palette: 'info', role: 'info', description: 'info status', generated: 'blue', hueSource: 'default', steps: statusRamp(STATUS_DEFAULTS.info.h, STATUS_DEFAULTS.info.chroma) });
  const baseUnit = s.density?.baseUnit ?? 4;
  const baseMd = s.radius?.baseMd ?? 4;
  // Engine taxonomy (not NB's): 8px space rhythm reproducing Prism2's numbered
  // scale; NB's 4px grid still backs radius/borders. NB ships radius scale=1 and
  // a 720px layout outlier.
  // The reference brand's radio dot is 70% of the box (#3086, owner Q816 A): 14px at medium, its master's hand edit.
  const dims = buildDims(baseUnit, 8, 'comfortable', 1, baseMd, [720], 70);
  return {
    id: 'nb', root: 'nbds', namespace: `nbds.${CORE_TIER}.palette`, colorFormat: 'rgb', modes: ALL_MODES, palettes,
    roleToPalette: { brand: 'red', neutral: 'neutral', success: 'green', warning: 'amber', danger: 'red', info: 'info', action: 'red' },
    roleAnchorStep: { brand: 550, neutral: 500, success: 500, warning: 500, danger: 550, info: 500, action: 550 },
    linkPalette: 'red', linkAnchorStep: 550,   // NB links follow its action palette (brand red) — unset lever, byte-identical (#1496)
    disabledStrategy: 'reduced', disabledMin: 3, iconContrast: 'text',
    // The reference brand's outline and text hover fill (#3071, owner Q824 A): `neutral.050` on the light page, pressed
    // the next step (`neutral.100`). Not 025, which is the card ground: on a card the hover would disappear.
    outlineInteraction: 'opaque-fill', outlineHoverFill: { light: { hover: 'neutral.050' } },
    neutralEmphasis: 'subtle', strictInteractiveContrast: false, interactivePalettes: [],
    // The reference brand's own designs put dialogs on white (#3049, owner Q3049.4), not on its card surface.
    raisedSurface: 'white',
    // The reference brand's designs put a heavy black backdrop behind its dialogs (#3050, owner Q825 B): the strong scrim.
    scrimStrength: 'strong',
    // The reference brand's secondary ink is fitted on the page, not the floor (owner Q-TXT1 A, 2026-10-31): its designs
    // run placeholders and secondary copy lighter, so it takes the lightest secondary that clears 4.5:1 on
    // `background.primary`. It no longer clears 4.5:1 on `background.secondary`, and its description says so.
    secondaryTextGround: 'page',
    // The reference brand's card glass (#3073, owner Q807 A; 70%, the owner's correction of 2026-10-27): the card
    // ground, `foreground.primary`'s palette color in each mode, at 70%.
    glassRoles: { card: { role: 'foreground.primary', alpha: 70 } },
    radioDot: 70,
    dims, motion: buildMotion(),
    // The label category always ships the `default` role (Q225 A, Q226 A), here as in every brand.
    // #3077 (owner decisions 2026-10-27): caption.md is 10px, and display, title, body, caption and label are pinned
    // to the `open` letter spacing (+1%) at every size; eyebrow keeps its nudge, one step in from `wider` (+2%).
    // The rest of the fixture's type is the engine default, so its title ramp starts at xs 18 and the brand's
    // 20px title.2xs has no room under it: that part lives in the redesign seed only.
    // #2942 (owner, 2026-10-27): the reference brand's link underline is 5% thick, 25% below the baseline.
    typography: buildTypography(withLabelDefault({
      sizes: { caption: { md: 10 } },
      tracking: { display: 'open', title: 'open', body: 'open', caption: 'open', label: 'open' },
      trackingShift: { eyebrow: -1 },
      underline: { thickness: 0.05, offset: 0.25 },
    })),
    shadow: buildShadow(s.neutralHue.hue, { tint: { amount: 0 } }),  // NB ships pure-black shadows
    // NB caps at 1920 + narrow 720. Its md margin is 44 (#3052, Q785 A). The 41px figure behind it is the
    // brand's desktop spec in its own two-mode layout, where md carries the 24-column, 16px-gutter grid:
    // whole-pixel 41px columns at 1440. It is not a property of this fixture's 5-breakpoint grid, where md
    // is 8 columns and a 44 margin gives 71px columns at 768 (#3070). 44 is no spacing step, so
    // `grid/margin` md links to `core/dimension/44`.
    layout: buildLayout({ containerMax: 1920, marginOverrides: { md: 44 } }),
    gradient: { gradients: [] },                                     // NB ships no gradients (it had none)
    notes: [
      // The regression fixture's own record. Its dark shadows are reduced, not the reference system's
      // heavier inverse shadows: lift-primary is the field's common choice.
      'reference brand: anchors measured from the shipped system; the brand red also serves as danger, since the brand hue is its danger hue.',
      `dimensions: ${baseUnit}px grid, 8px spacing rhythm (numbered scale), 'comfortable' density, radius scale 1 (base radius ${baseMd}px).`,
      'typography: 22-step size ladder (10–160px); weights subtle/default/emphasis/strong/max → 300/400/600/700/900; caption.md 10px; letter spacing open (+1%) for display, title, body, caption and label, wide (+2%) for eyebrow; link underline 5% thick, 25% offset, as the reference sets it.',
      'shadow: 6 steps plus inset, two layers, pure black as the reference ships; full in light and reduced in dark, rather than the reference\'s heavier dark shadows.',
      'layout: 5 breakpoints (the default); 12-column grid (4/8/12 by breakpoint); containers max 1920px, narrow 720px, as the reference caps them; gutters and margins from the spacing scale, except the md margin: 44px, as the reference sets it, which is not a spacing step, so it links to core dimension 44.',
    ],
  };
};

