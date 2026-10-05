/**
 * Prism3 engine — the LEVER MANIFEST (docs/08 §4).
 *
 * The shared-control contract: a machine-readable description of every `BrandInput`
 * knob — grouped, labeled, typed, ranged, with defaults and enum options — that
 * the Figma plugin, the web playground, and the MCP tool schema all RENDER FROM.
 * One source, so a lever added once appears in every surface and the two visual
 * editors stay in continuity by construction (not a manual sync).
 *
 * This is the PRESENTATION half. `schema/theme-schema.json` is the VALIDATION half
 * (what the engine actually accepts). The two must agree — `test.ts` asserts every
 * lever key resolves in the schema, every enum's options match the schema enum, and
 * every default matches the schema default — so the manifest can never drift from
 * the engine.
 *
 * PURE — no `node:*`, no I/O (the plugin / playground / MCP bundle this into a
 * browser/Figma sandbox, so it must stay Node-free — the same pure-core / I/O-shell
 * split as `theme.ts` vs `nb-fixture.ts`, docs/07 §3). The emit step lives in the
 * shell `emit-levers.ts` (`npx tsx packages/engine/emit-levers.ts` → `schema/lever-manifest.json`).
 *
 * `id` and `root` are intentionally NOT levers (see `identityFields`): they are brand
 * *identity* / namespace the host supplies (CLI derives `id` from the file/name, the
 * plugin from the Figma file, an MCP call passes them as arguments; `root` is the
 * per-engagement token namespace, default 'prism') — not design knobs a surface
 * renders in the lever-driven form. The drift gate enforces that every *other*
 * required BrandInput field IS a lever.
 */
import { SLIDER_STOPS } from './vocabulary';

export type LeverGroup = 'color' | 'form' | 'type' | 'motion' | 'elevation' | 'layout' | 'advanced';
/** The UI affordance a surface renders for this lever. `object`/`list` denote a
 *  structured sub-input (the surface renders a sub-form); the rest are atomic. */
export type LeverControl = 'color' | 'slider' | 'enum' | 'toggle' | 'list' | 'palette-ref' | 'object' | 'text';

export type Lever = {
  key: string;                          // dot-path into BrandInput (e.g. 'motionPersonality.tempo')
  group: LeverGroup;
  label: string;
  description: string;
  control: LeverControl;
  required?: boolean;                   // a required BrandInput field (no default; must be set)
  advanced?: boolean;                   // hidden behind progressive disclosure by default
  /** Must equal the schema default where the schema defines one, AND be what the engine does with the
   *  lever unset (`test.ts` #1812 runs the engine both ways). Omitted when the engine's unset behavior is
   *  not one static value: `linkPalette` follows whatever palette the action role resolves to. */
  default?: unknown;
  // slider (UI bounds — the presentation half; the schema leaves these open):
  min?: number; max?: number; step?: number; unit?: string;
  // enum (values MUST match the schema enum at `key`):
  options?: { value: string | number; label: string }[];
  // list/object (informational item hint):
  itemLabel?: string;
  /** Present on a lever that is retired but still ACCEPTED in brand input (#2053): the note says what to do
   *  instead. Additive and optional, so a reader that ignores it still reads the lever as before. */
  deprecated?: string;
  /** Named stops a slider also accepts (#471) — `{ soft: 1.5 }`, so `radiusScale: 'soft'` is legal
   *  input. Present only on the six sliders where a word genuinely names a design intent; a bare
   *  quantity like `disabledMin` has none, deliberately. Emitted from `SLIDER_STOPS` rather than
   *  restated, so the manifest an agent reads and the table the engine resolves against cannot
   *  drift — the same continuity-by-source rule the rest of this file follows. */
  stops?: Record<string, number>;
};

const enumOpts = (...pairs: [string | number, string][]): { value: string | number; label: string }[] =>
  pairs.map(([value, label]) => ({ value, label }));

// ---------------------------------------------------------------------------
// The manifest. Ordered by group; `advanced` marks the progressive-disclosure set
// so a surface can show a lean default (primary + form + type/motion basics) and
// reveal the rest on demand.
export const leverManifest: Lever[] = [
  // ---- COLOR ----
  { key: 'primary', group: 'color', label: 'Primary brand color', control: 'color', required: true,
    description: 'The exact brand anchor. Pinned, never shifted; the engine places it on the ramp by its lightness.' },
  { key: 'neutral.hue', group: 'color', label: 'Neutral hue', control: 'slider', required: true, min: 0, max: 360, step: 1, unit: '°',
    description: 'Hue the grays lean toward (a small chroma tints them to the brand for cohesion).' },
  { key: 'neutral.chroma', group: 'color', label: 'Neutral chroma', control: 'slider', required: true, min: 0, max: 0.03, step: 0.001,
    description: 'Peak neutral chroma (~0.004–0.02); tapers to near-0 at the ramp ends. 0 = pure gray.' },
  { key: 'neutral.anchor', group: 'color', label: 'Pin a neutral', control: 'color', advanced: true,
    description: 'Optional. A pre-defined brand gray, pinned verbatim at its lightness step; the ramp is built around it (hue/chroma from the anchor) instead of the cast. Set for a client that ships their own neutral; omit to derive from hue + chroma.' },
  { key: 'brandColors', group: 'color', label: 'Additional brand colors', control: 'list', itemLabel: 'brand color (name + OKLCH)',
    description: 'Secondary / tertiary / accents — any number; each becomes its own ramp and can drive actions.' },
  { key: 'actionPalette', group: 'color', label: 'Action palette', control: 'palette-ref', default: 'primary',
    description: 'Which palette drives interactive/action color. Defaults to primary; point at an accent when the hero color is a poor CTA.' },
  { key: 'linkPalette', group: 'color', label: 'Link palette', control: 'palette-ref',
    description: 'Which palette drives link color. Defaults to following the action color, including a roleColors.action override; point at primary, neutral, or an accent to give links their own color. The contrast floor holds either way. A link palette that is not color-distinct from body text (e.g. neutral) prompts a warning to underline links for WCAG 1.4.1 — pair it with an underlined link role.' },
  { key: 'status.success', group: 'color', label: 'Success color', control: 'color', advanced: true,
    description: 'Optional measured override; omit to let the engine synthesize from a canonical hue.' },
  { key: 'status.warning', group: 'color', label: 'Warning color', control: 'color', advanced: true,
    description: 'Optional measured override; omit to synthesize.' },
  { key: 'status.danger', group: 'color', label: 'Danger color', control: 'color', advanced: true,
    description: 'Optional measured override; omit to reuse the brand red (if red) or carve a dedicated one.' },
  { key: 'status.info', group: 'color', label: 'Info color', control: 'color', advanced: true,
    description: 'Optional measured override; omit to synthesize from the canonical blue hue.' },
  { key: 'surfaces', group: 'color', label: 'Page surfaces', control: 'object', advanced: true,
    description: 'Non-default page and inverse surfaces per mode. The contrast floor follows the second tier.' },
  { key: 'strictInteractiveContrast', group: 'color', label: 'Strict interactive contrast', control: 'toggle', advanced: true, default: false,
    description: 'Opt-in (off by default). The inverse filled button steps its fill per state; the primary and destructive labels’ colored ink clears AA at rest but dips on the transient hover/pressed steps. On swaps both inverse labels to the neutral high-contrast ink so every state clears AA — guaranteed legibility over brand color.' },
  { key: 'linkStateRungs', group: 'color', label: 'Link states', control: 'object', advanced: true,
    description: 'Optional. Set how far each engaged link state — hover, pressed, visited — steps from the resting link, one state at a time, as a count of ramp steps. An unset state keeps the tuned walk; the resting link and its focus follow the link palette. Each step is held to the link’s contrast floor, so it respaces a state without dropping the link below 4.5:1.' },

  // ---- FORM ----
  { key: 'radiusScale', group: 'form', label: 'Radius softness', control: 'slider', default: 1, min: 0, max: 2, step: 0.5,
    description: 'How round every radius size is, from sharp (0) to round (2). The pill sizes and the 1px radius stay fixed.' },
  { key: 'density', group: 'form', label: 'Density', control: 'enum', default: 'comfortable',
    options: enumOpts(['comfortable', 'Comfortable'], ['compact', 'Compact'], ['spacious', 'Spacious']),
    description: 'Sets control heights, and moves each component’s padding and gaps one step on the spacing scale. Token names stay the same; their values change. Spacing follows the brand’s density, not the mode’s: a mode’s density changes control heights only.' },
  { key: 'controlShape', group: 'form', label: 'Control shape', control: 'enum', default: 'rounded',
    options: enumOpts(['boxed', 'Boxed'], ['hairline', 'Hairline'], ['rounded', 'Rounded'], ['pill', 'Pill']),
    description: 'The corner shape of buttons and other controls that can round fully. Boxed is sharp (0px). Hairline is a 1px corner. Rounded follows radius softness. Pill rounds the ends fully, whatever the softness.' },
  // The button levers (#1667). Labels and option labels are the owner's exact words.
  { key: 'buttonIcons', group: 'form', label: 'Button icons', control: 'enum', default: 'attached',
    options: enumOpts(['attached', 'Attached to label'], ['edges', 'Locked to edges']),
    description: 'Where button icons sit. Attached to label keeps them beside the label. Locked to edges pins them to the button edges and centers the label in the space between.' },
  { key: 'buttonContentSize', group: 'form', label: 'Button label & icon', control: 'enum', default: 'match',
    options: enumOpts(['match', 'Match button size'], ['smaller', 'One step smaller']),
    description: 'The label and icon size of a medium button. One step smaller gives it the small button’s label and icon at the same height and padding. Small and large buttons are unchanged.' },
  // #1752 — label and option labels are the owner's exact words (2026-09-28). Buttons only.
  { key: 'buttonLabelWeight', group: 'form', label: 'Button label weight', control: 'enum', default: 'emphasis',
    options: enumOpts(['default', 'Default'], ['emphasis', 'Emphasis']),
    description: 'The weight of a button label: Emphasis (600 by default) or Default (400). Default adds that weight to the label styles. Tags and badges keep Emphasis.' },
  { key: 'buttonMinWidthMultiplier', group: 'form', label: 'Button minimum width', control: 'slider', default: 2.25, min: 1, max: 4, step: 0.25, unit: '× height',
    description: 'A button is at least its height times this wide, rounded up to the 8px grid, so a short label never makes a stubby button.' },
  { key: 'baseMd', group: 'form', label: 'Base radius', control: 'slider', advanced: true, default: 4, min: 2, max: 12, step: 1, unit: 'px',
    description: 'The medium radius at standard softness. Every other radius size is a multiple of it.' },
  { key: 'radiusHairline', group: 'form', label: 'Hairline radius', control: 'toggle', advanced: true, default: false,
    description: 'Retired. radius.hairline, a fixed 1px corner, is always emitted, so this setting changes nothing.',
    deprecated: 'Always on since #2053: radius.hairline is emitted for every brand. Accepted so existing brand files still load.' },

  // ---- TYPE ----
  { key: 'typography.typeScale', group: 'type', label: 'Type scale', control: 'enum', default: 'default',
    options: enumOpts(['compact', 'Compact'], ['default', 'Default'], ['expressive', 'Expressive']),
    description: 'Moves every heading size one step up or down the size ladder. Body, label, caption and code stay put.' },
  { key: 'typography.families', group: 'type', label: 'Font families', control: 'object',
    description: 'The font family each text type uses, and whether it is a variable font. A single family name gets a system fallback stack added. Setting code to none ships no code styles.' },
  { key: 'typography.weightRoles', group: 'type', label: 'Weights', control: 'object', advanced: true,
    description: 'The weight number behind each name. The names read in order, from subtle to max. The defaults are 300, 400, 600, 700 and 900.' },
  { key: 'typography.displayCeiling', group: 'type', label: 'Largest display size', control: 'enum', advanced: true, default: '3xl',
    options: enumOpts(['sm', 'display.sm (1 rung)'], ['md', 'display.md (2 rungs)'], ['lg', 'display.lg (3 rungs)'],
      ['xl', 'display.xl (4 rungs)'], ['2xl', 'display.2xl (5 rungs)'], ['3xl', 'display.3xl (all 6)']),
    description: 'The largest display size the brand makes. Display sizes above it are left out. It names a step, not a pixel value, so changing the type scale never changes how many display sizes are kept.' },
  { key: 'typography.titleFloor', group: 'type', label: 'Smallest title size', control: 'enum', advanced: true, default: 18,
    options: enumOpts([18, '18px (title.xs)'], [16, '16px (adds title.2xs)']),
    description: '16px adds a title at body size. The Compact scale already places a title at 16px, so the engine refuses 16px with it.' },
  { key: 'typography.captionFloor', group: 'type', label: 'Smallest caption size', control: 'enum', advanced: true, default: 11,
    options: enumOpts([11, '11px (caption.md)'], [10, '10px (adds caption.sm)']),
    description: '10px adds a fine-print caption, for dense legal, footer or product details. The default smallest caption is 11px.' },
  { key: 'typography.sizeFloor', group: 'type', label: 'Smallest type size', control: 'enum', advanced: true, default: 10,
    options: enumOpts([10, '10px (default floor)'], [8, '8px (adds caption.xs — escape hatch)']),
    description: '8px adds the smallest caption and moves the smallest type size down to 8px. That is below the sizes the contrast checks were set for, so the engine notes it: use it only for fine print that has an accessible alternative.' },
  { key: 'typography.responsive', group: 'type', label: 'Headings scale between mobile and desktop', control: 'object', advanced: true,
    description: 'Display, title and eyebrow sizes shrink smoothly from desktop to mobile between these two screen widths. Body text keeps one size.' },
  { key: 'typography.weights', group: 'type', label: 'Weights each text type ships', control: 'object', advanced: true,
    description: 'Which weights each text type ships. Each weight is a text style at every size. Every text type keeps at least one; label keeps Emphasis, and body and caption keep Default, because buttons and form controls use them.' },
  { key: 'typography.links', group: 'type', label: 'Underlined link styles', control: 'list', advanced: true, itemLabel: 'type role',
    description: 'Which text types get an underlined link style. The default is body and caption.' },
  { key: 'typography.italics', group: 'type', label: 'Italic styles', control: 'list', advanced: true, itemLabel: 'type role',
    description: 'Which text types ship an italic style for each weight. The default is none.' },
  { key: 'typography.italicDefault', group: 'type', label: 'Italic-only text types', control: 'list', advanced: true, itemLabel: 'type role',
    description: 'Which text types are italic only: every style is italic, with no upright style. The default is none. A text type here can’t also be in Italic styles.' },

  // ---- MOTION ----
  { key: 'motionPersonality.tempo', group: 'motion', label: 'Motion tempo', control: 'enum', default: 'standard',
    options: enumOpts(['snappy', 'Snappy'], ['standard', 'Standard'], ['relaxed', 'Relaxed']),
    description: 'How fast every duration runs: Snappy is 0.8×, Standard 1×, Relaxed 1.3×. Reduced motion is set for you.' },
  // ---- ELEVATION ----
  { key: 'shadow.softness', group: 'elevation', label: 'Shadow softness', control: 'slider', default: 1, min: 0, max: 2, step: 0.1,
    description: 'Blur:offset dial. Low → crisp/product; high → soft/marketing.' },
  { key: 'shadow.tint', group: 'elevation', label: 'Shadow tint', control: 'object', advanced: true,
    description: 'How far the shadow color moves off pure black, and toward which hue. Amount 0 is pure black; the default is a slight neutral tint.' },

  // ---- LAYOUT ----
  { key: 'layout.breakpoints', group: 'layout', label: 'Breakpoints', control: 'list', advanced: true, itemLabel: 'min-width (px)',
    description: 'The screen width where each layout starts, smallest first. The first is always 0px. Names follow the count: up to five start at sm, six run xs to 2xl, and seven run xs to 3xl. The default is 0, 768, 1024, 1440 and 1920.' },
  { key: 'layout.columns', group: 'layout', label: 'Grid columns', control: 'slider', advanced: true, default: 12, min: 4, max: 24, step: 1,
    description: 'How many columns the grid has on the widest breakpoints. Smaller breakpoints step up to it: 4, then 8, then this count.' },
  { key: 'layout.containerMax', group: 'layout', label: 'Maximum width', control: 'slider', advanced: true, default: 1440, min: 960, max: 1920, step: 40, unit: 'px',
    description: 'The widest content gets. Below this width, content fills the screen.' },
  { key: 'layout.containerNarrow', group: 'layout', label: 'Content container', control: 'slider', advanced: true, default: 720, min: 480, max: 960, step: 20, unit: 'px',
    description: 'A narrower width for long text, so lines stay a readable length.' },

  // ---- ADVANCED (accessibility + opt-in) ----
  { key: 'iconContrast', group: 'advanced', label: 'Icon contrast floor', control: 'enum', default: 'text',
    options: enumOpts(['text', 'Match text (4.5:1)'], ['3:1', 'Non-text floor (3:1)']),
    description: 'Whether icons mirror text contrast or run against the WCAG 1.4.11 non-text floor. Matching text is the default on purpose: icons usually sit beside text, and an icon that is lighter than the label next to it reads as a mistake even though 3:1 conforms. Choose the non-text floor when icons stand alone or you want them to recede.' },
  { key: 'disabledStrategy', group: 'advanced', label: 'Disabled contrast', control: 'enum', default: 'reduced',
    options: enumOpts(['full', 'Full contrast (4.5:1 — AA text)'], ['reduced', 'Reduced contrast (3:1 minimum)']),
    description: 'Full guarantees AA text on disabled controls — legibility is certain, but the disabled look then rests on fill / border / cursor rather than dimming. Reduced dims it to a floor you set, never below 3:1.' },
  { key: 'disabledMin', group: 'advanced', label: 'Reduced contrast floor', control: 'slider', default: 3, min: 3, max: 4.5, step: 0.5,
    description: 'How dim Reduced goes. 3:1 is the WCAG non-text / large-text threshold and where Primer and USWDS sit — the lowest ratio still legible. Escalates to 4.5:1 in high-contrast modes. Ignored on Full.' },
  { key: 'outlineInteraction', group: 'advanced', label: 'Outline hover', control: 'enum', default: 'overlay-neutral',
    options: enumOpts(['overlay-neutral', 'Neutral overlay wash'], ['solid-tint', 'Tinted wash'], ['none', 'No hover fill']),
    description: 'How outline/text controls express hover/pressed/selected. Overlay = translucent neutral wash (composites over any surface); solid-tint = the control\'s own fill at 20% opacity (30% pressed), stepped down the opacity scale where the label needs more contrast and up where the hover would not show, so a destructive outline hovers red-tinted rather than gray; none = omit.' },
  { key: 'neutralEmphasis', group: 'advanced', label: 'Neutral emphasis', control: 'enum', default: 'subtle',
    options: enumOpts(['subtle', 'Subtle (light gray)'], ['strong', 'Strong (bold near-black/white)']),
    description: 'The neutral interactive fill boldness — subtle light gray (a surface) or a strong near-black/near-white fill.' },
  { key: 'interactivePalettes', group: 'color', label: 'Interactive palettes', control: 'list', advanced: true, itemLabel: 'accent column (name + palette [+ anchorStep])',
    description: 'Promote declared palettes (a `brandColors` entry, or `primary`) to full interactive.<name>.* columns — fill/states, on-fill, text, border, overlay. The generalized accent lever; edit via the interactive cards. Supersedes the back-compat single-column `accentPalette` input.' },
  { key: 'gradients', group: 'advanced', label: 'Gradients', control: 'toggle', default: false,
    description: 'Opt-in (off by default). On ships one default brand gradient; an explicit array ships specific ones.' },
];

// Attach the named stops (#471) by JOINING against `SLIDER_STOPS` rather than restating them on each
// lever. Two copies of "soft means 1.5" is exactly how the catalogue an agent reads drifts from the
// table the engine resolves against — the same failure the `nonLeverFields` diff was written to stop.
// `test.ts` asserts every key in SLIDER_STOPS matched a real lever, so a renamed lever cannot leave a
// vocabulary entry orphaned and silently unadvertised.
for (const lever of leverManifest) {
  const stops = SLIDER_STOPS[lever.key];
  if (stops) lever.stops = stops;
}

/** Group order + human labels for a surface's section layout. */
export const leverGroups: { group: LeverGroup; label: string }[] = [
  { group: 'color', label: 'Color' },
  { group: 'form', label: 'Form factor' },
  { group: 'type', label: 'Typography' },
  { group: 'motion', label: 'Motion' },
  { group: 'elevation', label: 'Elevation' },
  { group: 'layout', label: 'Layout' },
  { group: 'advanced', label: 'Advanced' },
];

/** Required `BrandInput` fields that are brand *identity*, not design levers — the
 *  host supplies them, so they are deliberately absent from the manifest. The drift
 *  gate subtracts these before asserting every required field is a lever, so the
 *  omission is explicit and a *new* required field (or a dropped `primary`/`neutral`)
 *  is still caught. */
export const identityFields = ['id', 'root'] as const;

export const buildLeverManifest = () => ({
  $schema: 'https://prism3.dev/schema/lever-manifest.json',
  description: 'Presentation contract for the BrandInput controls (labels/groups/UI ranges/knob types). Rendered by the Figma plugin, the web playground, and the MCP tool schema. Kept in sync with theme-schema.json by engine/test.ts. Emitted by engine/emit-levers.ts. Note: brand `id` is host-supplied identity, not a lever.',
  groups: leverGroups,
  levers: leverManifest,
});
