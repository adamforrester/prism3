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
 */
import { generateRamp, peakChromaL, autoPlaceStep, Step } from './ramp';
import { dimensionGrid, spaceScale, radiusScale, componentSizes, SpaceStep, RadiusStep, SizeStep, Density, iconSizes, IconSizeStep } from './scale';
import { oklchToRgb, RGB, contrast, hex as rgbHex, inGamut, maxChroma } from './color';
import type { ModeName, BuiltinModeName, ModeOverrides } from './modes';

/** The appearance modes the engine can generate. `light` is the required base; the rest
 *  are opt-in (docs/11 Pillar 1). Wireframe (docs/11 §Pillar 1b) is not yet a mode. */
// The DEFAULT mode set — generated when `input.modes` is omitted (back-compat; the
// four-mode golden is byte-identical). Wireframe is NOT here: it's opt-in only, never
// a default (docs/11 Pillar 1 — "most brands ship light only; dark/HC/wireframe opt-in").
export const ALL_MODES: ModeName[] = ['light', 'dark', 'hc-light', 'hc-dark'];
// The VALID mode set — the allow-list an input may request. Adds `wireframe` (1b): a
// generated greyscale mode (every non-neutral role → its equivalent neutral; radius → 0).
export const VALID_MODES: ModeName[] = [...ALL_MODES, 'wireframe'];

// The NB *measurement* fixture (reverse-engineered NB anchors) — the regression
// input for nbThemeFrom(). A DIFFERENT shape from the white-label BrandInput
// contract (schema/theme-schema.json + .example.json); it carries measured OKLCH
// + $source provenance and is consumed only by the NB regression, never by
// brandTheme(). The engine core stays pure: it takes the *parsed* fixture as an
// argument. File I/O (reading nb-measured.json) lives in the shell — nb-fixture.ts.
export type NbMeasured = {
  primaryColor: { oklch: OKLCH };
  statusColors: { success: { oklch: OKLCH }; warning: { oklch: OKLCH } };
  neutralHue: { hue: number; chroma: number };
  density?: { baseUnit?: number };
  radius?: { baseMd?: number };
};

// Semantic colour roles. `action` is FIRST-CLASS and distinct from `brand`:
// the brand's hero colour is not always the right interactive colour (poor
// contrast, or reserved by brand guidelines), so action maps independently.
export type Role = 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'action';
export type OKLCH = { l: number; c: number; h: number };

/** A generated primitive palette. */
export type PaletteBuild = { palette: string; role: Role; steps: Step[]; description: string };

/** Per-mode LEVER overrides for the non-colour axes (Phase D). A customizable mode may override
 *  an input lever the engine RE-DERIVES for that mode — today `radius` (the radius scale), with
 *  `tempo`/`density` slotting in the same way later. NOT `typeScale`: it shifts heading rungs,
 *  and per-mode rung shifts give modes different type SETS (#328) — per-mode type sizing is a
 *  per-rung size override over a mode-invariant set, never a per-mode scale lever. Distinct from the global
 *  `radiusScale` (the baseline every mode inherits); a `modeLevers` entry deviates a single mode. */
export type ModeLevers = {
  radius?: number;
  // Per-mode font FAMILY per family-role (display/text/mono) — a different font stack for this mode.
  // Same shape as `TypographyInput.families` minus `variable` (the variable flag stays from light).
  families?: { display?: string | string[]; text?: string | string[]; mono?: string | string[] };
  // Per-mode font WEIGHT per weight-role — a different NUMERIC value the role resolves to (e.g. dark's
  // `strong` = 600 not 700). Never changes WHICH roles exist; only their number.
  weights?: Partial<Record<WeightRoleName, number>>;
  // Per-mode LEADING RE-POINT (#296) — maps a rung to ANOTHER RUNG: `{ normal: 'relaxed' }` reads
  // "in this mode, styles that would use `normal` use `relaxed` instead". It names a rung, never a
  // number, because rungs are mode-invariant PRIMITIVES — a mode re-points, it never re-anchors.
  // (Re-anchoring what a rung is WORTH is `typography.lineHeights`, which is numeric and brand-wide.)
  // Naming the target rung rather than a value it snaps to means a request can never silently no-op.
  lineHeights?: Partial<Record<LineHeightKey, LineHeightKey>>;
  // Per-mode TRACKING RE-POINT — same contract: `{ normal: 'wide' }`.
  letterSpacings?: Partial<Record<LetterSpacingKey, LetterSpacingKey>>;
  // Per-mode MOTION TEMPO — a different tempo enum (scales the duration ramp + stagger for this mode).
  // The motion analog of radius: one lever re-derives the whole ramp. Mirrors the global `tempo` enum;
  // e.g. a `marketing` custom mode runs `relaxed` while the app mode stays `snappy`.
  tempo?: 'snappy' | 'standard' | 'relaxed';
  // Per-mode SHADOW personality — a different blur `softness` and/or `tint` (hue + amount) for this mode.
  // Same shape as the global `shadow` lever. Re-derives this mode's shadow ramp via the same buildShadow
  // the baseline uses, picking the mode's appearance layer-set (a dark/dark-based mode gets the reduced
  // layers; a light/light-based mode the full ones). The light/dark alpha reduction is intrinsic, so it
  // composes for free.
  shadow?: { softness?: number; tint?: { hue?: number; amount?: number } };
  // Per-mode DENSITY — a different component-size tier (compact/comfortable/spacious) for this mode. The
  // dimension analog of the tempo enum: re-derives `sizes` (control heights + paired padding) via the
  // same componentSizes the baseline uses. The `space.*` reference scale is density-free, so it doesn't
  // change; only the component tier does. e.g. a `touch` custom mode runs `spacious`.
  density?: Density;
  // Per-mode TYPE SIZE (#328) — `{ display: { '3xl': 96 } }` reads "in this mode, display.3xl is 96px".
  // Unlike the leading/tracking re-points above it names a NUMBER, not a rung key, and that asymmetry
  // is principled: a leading rung is a NAMED primitive with a brand-chosen value, so naming a number
  // there would re-anchor rather than re-point. A ladder STEP is the primitive here — all 22 are always
  // emitted, so any selection lands on a real leaf and no union mechanism is needed (unlike per-mode
  // weights, #337). Heading groups only, and it changes SIZES within a mode-invariant SET: the rung set
  // is fixed once at brand level by displayCeiling/titleFloor and is never re-derived per mode.
  typeSizes?: Partial<Record<PerModeSizeGroup, Record<string, number>>>;
};  // per-mode lever overrides; extensible (tempo/density later — NOT typeScale, see ModeLevers)

/** The non-color (dimension) axis: a primitive grid + space/radius/size scales. */
export type Dims = {
  grid: number[];
  space: SpaceStep[];        // reference tier — numbered multiplier, density-free
  radius: RadiusStep[];
  sizes: SizeStep[];         // component tier — t-shirt, density acts here
  // Icon tier (#324) — a FIXED enumerated ladder, not derived from a lever. The field research
  // prohibits arbitrary/off-grid icon sizes, so this is invariant across brands, modes and density;
  // what varies is only whether the brand's grid can express it (checked at emit).
  icons: IconSizeStep[];
  density: Density;
  radiusScaleValue: number;
  spaceBase: number;
  // Per-mode radius ramps (Phase D) — only modes whose `modeLevers.radius` deviates the baseline;
  // each re-derived via the SAME radiusScale(value, baseMd, 128) buildDims uses. Absent (field
  // omitted) when no modeLevers → the DTCG/Figma radius emit stays byte-identical.
  radiusByMode?: Record<string, RadiusStep[]>;
  // Per-mode component-size tiers (Phase D) — only modes whose `modeLevers.density` deviates the
  // baseline; each re-derived via the SAME componentSizes(density, spaceBase) buildDims uses. A size
  // sub-leaf (height / padding-x / padding-y) whose px differs from light carries a per-mode override.
  // Absent when no modeLevers.density → byte-identical.
  sizesByMode?: Record<string, SizeStep[]>;
};

/** A declared palette promoted to a full `interactive.<name>.*` column (docs/20 §3). `name` is
 *  the role suffix (`interactive.<name>.*`); `palette` is a defined palette; `anchorStep` is the
 *  fill step its rest colour anchors to (default 500 at generation time). */
export type InteractivePalette = { name: string; palette: string; anchorStep?: number };

/** Everything the emitter and the modes engine need to be brand-agnostic. */
export type Theme = {
  id: string;
  root: string;                      // 'nbds' | 'prism' (brand root namespace)
  namespace: string;                 // '<root>.palette' — the colour PRIMITIVE root (ramps live here; the semantic role layer is emitted under '<root>.color')
  colorFormat: 'rgb' | 'hex';
  modes: ModeName[];                 // the appearance modes to generate (light always present; customs appended last)
  // User-added custom modes (C1) — each `{ name, base }` clones a customizable built-in (light/dark)
  // under a new slug-safe name that LIVE-INHERITS the base's derivation each build, then deviates via
  // overrides[name] / modeAnchors[name]. Their names are already appended to `modes` above.
  customModes?: { name: string; base: BuiltinModeName }[];
  palettes: PaletteBuild[];
  roleToPalette: Record<Role, string>;
  roleAnchorStep: Record<Role, number>;
  surfaces?: SurfacesConfig;         // optional non-default surfaces (drives the contrast floor)
  // Per-mode colour override layer (Phase A1) — role → primitive-step repoints applied AFTER
  // generation, for the customizable modes only (light/dark). Distinct from `roleColors`
  // (a global palette rebase): overrides repoint one resolved role to one existing primitive
  // step in a given mode, WARNING (never blocking) if the tuned pick fails the role's contrast min.
  overrides?: Partial<Record<ModeName, ModeOverrides>>;
  // Per-mode interactive anchor overrides (A2b) — pin an interactive column's fill anchor to a
  // specific palette step for a given mode, so e.g. dark's CTA sits at a different step than light's.
  // The whole column (rest/hover/pressed/on-fill) re-derives from it, still floor-gated. Column keys:
  // 'primary' / 'destructive' / an accent (interactivePalettes) name. Customizable modes only.
  modeAnchors?: Partial<Record<ModeName, Record<string, number>>>;
  // Per-mode LEVER overrides for the non-colour axes (Phase D) — a customizable mode re-derives an
  // axis from an overridden input lever (radius now; tempo/density later — NOT typeScale, see ModeLevers). Distinct from
  // the global `radiusScale` baseline every mode inherits — modeLevers deviate a single mode. The
  // re-derived radius ramps land on `dims.radiusByMode`; this carries the raw levers for round-trip.
  modeLevers?: Partial<Record<ModeName, ModeLevers>>;
  // Disabled-state contrast. BOTH branches are gated — this system never ships disabled
  // ink below 3:1, so neither leans on the WCAG 1.4.3/1.4.11 inactive-component exemption
  // (owner decision, 2026-07-29; supersedes the old 'accessible'/'conventional' pair where
  // 'conventional' sat at ~2:1 ungated and, at the bottom of its range, 'accessible'
  // collapsed onto it).
  //   'full'    — promises AA text: a fixed 4.5:1. No dial; it's a guarantee, not a range.
  //   'reduced' — the default: a dialable `disabledMin` floor, 3–4.5. 3:1 is where
  //               Primer/USWDS sit — visibly dimmed but legible (the KB's `inactive`).
  // Both escalate to >=4.5:1 in high-contrast modes.
  disabledStrategy: 'full' | 'reduced';
  disabledMin: number;               // the 'reduced' floor (default 3:1, clamped 3–4.5; bumped in HC)
  // Icon contrast floor. 'text' (default): icons mirror text (4.5:1). '3:1':
  // icons resolve against the WCAG SC 1.4.11 non-text floor (3:1) — standards-
  // correct (graphical objects), letting secondary/semantic icons run lighter
  // than text. `icon.primary` stays strong either way.
  iconContrast: 'text' | '3:1';
  // How an OUTLINE / TEXT interactive control expresses hover/pressed/selected
  // (docs/20 §10). 'overlay-neutral' (default): a translucent neutral wash that
  // composites over any surface — the `interactive.<color>.overlay.*` tokens are
  // generated. 'solid-tint': an opaque subtle surface instead (`foreground.<color>-
  // subtle`), no overlays. 'none': no hover expression, no overlays. (`overlay-tint`
  // — the colour's own hue at low alpha — is scheduled; needs per-colour alpha ramps.)
  outlineInteraction: 'overlay-neutral' | 'solid-tint' | 'none';
  // Neutral interactive emphasis (docs/20 §10). 'subtle' (default): a light-grey neutral
  // fill; 'strong': a bold near-black (light) / near-white (dark) neutral fill.
  neutralEmphasis: 'subtle' | 'strong';
  // Inverse surface-context (docs/20 §9): generate `interactive.<color>.on-inverse` inks
  // for outline/text controls placed on a dark hero / inverse section. Default on.
  inverseContext: boolean;
  // Extensible interactive palettes (docs/20 §3). Each declared palette is promoted to a full
  // `interactive.<name>.*` column (fill+states / on-fill / text / border / on-inverse / overlay),
  // anchored at `anchorStep` (default 500). The built-in primary/neutral/destructive columns are
  // always generated; these are the OPT-IN extras (the generalised `accentPalette`). Empty = none.
  interactivePalettes: InteractivePalette[];
  // Optional fill-step overrides for the built-in primary / destructive interactive columns —
  // when set, the rest fill anchors at this palette step instead of the role's resolved default.
  actionAnchorStep?: number;
  destructiveAnchorStep?: number;
  dims: Dims;
  motion: MotionAxis;
  typography: Typography;
  shadow: ShadowAxis;
  layout: LayoutAxis;
  gradient: GradientAxis;
  notes: string[];                   // human-readable record of engine decisions
};

// The page-default surface is not always pure white/black. A brand can declare
// its primary surface per mode; the contrast FLOOR (the worst-case surface
// saturated foregrounds are validated against) follows it. `base` is 'white',
// 'black', or a neutral step number; `floorStep` names the neutral step used as
// the floor (defaults: white→50, black→950, a tinted base→one step more tinted).
export type SurfaceSpec = 'white' | 'black' | number;
export type SurfacesConfig = {
  light?: { base?: SurfaceSpec; floorStep?: number };
  dark?:  { base?: SurfaceSpec; floorStep?: number };
};

// ---- canonical status hues (engine-supplied; a brand need not specify them) ----
const STATUS_DEFAULTS: Record<'success' | 'warning' | 'danger' | 'info', OKLCH & { chroma: number }> = {
  success: { l: 0.55, c: 0.15, h: 145, chroma: 0.15 },
  warning: { l: 0.55, c: 0.15, h: 75, chroma: 0.15 },
  danger: { l: 0.55, c: 0.17, h: 27, chroma: 0.17 },
  info: { l: 0.55, c: 0.13, h: 245, chroma: 0.13 },
};

// Palette names the engine always mints — a brandColor may not collide with these, else
// `new Map(palettes)` / `palette[name] = node` (last-wins) would let a brandColor named
// `neutral`/`primary` REPLACE the ramp the whole surface model is built on, or a status name
// silently replace the brandColor — gates stay green on corrupted output (CR-03). Includes the
// tree.ts base swatches (`white`/`black`/`*-alpha`).
const RESERVED_PALETTES = new Set(['primary', 'neutral', 'success', 'warning', 'info', 'danger', 'white', 'black', 'black-alpha', 'white-alpha']);
// A brandColor name is a palette slug: it becomes a `{root.palette.<name>.<step>}` alias path,
// so it must be a single lowercase kebab segment — no dots (break alias paths), spaces, or
// symbols (also closes the CR-07 XSS vector at the source: an HTML-metachar name can't validate).
const PALETTE_NAME_RE = /^[a-z][a-z0-9-]*$/;

/** Angular distance between two hues (degrees, 0..180). */
const hueDist = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};
// A hue in the red window still needs enough chroma to READ as red — below this it's a warm
// grey/greige, not a danger signal (M-05). Reusing such a primary for `danger` would collapse
// destructive signalling to a near-neutral. ~0.08 is the floor where a red starts to register.
export const RED_CHROMA_FLOOR = 0.08;
/** Is this primary a SATURATED red — close enough in hue AND chromatic enough to BE the danger
 *  hue? A red-ish but desaturated (greige) primary is not red: danger must carve its own. */
export const inRedTerritory = (hue: number, chroma: number): boolean =>
  hueDist(hue, STATUS_DEFAULTS.danger.h) <= 20 && chroma >= RED_CHROMA_FLOOR;

/** Generate a vivid, unanchored status ramp from a canonical hue. */
const statusRamp = (hue: number, chroma: number): Step[] =>
  generateRamp({ hue, chroma, peakL: peakChromaL(hue) });

// ---------------------------------------------------------------------------
// White-label brand input -> Theme
// ---------------------------------------------------------------------------
export type BrandInput = {
  id: string;
  /** The single, mode-invariant token namespace. Every token emits under `<root>.*`
   *  (colour primitives at `<root>.palette`, semantic roles at `<root>.color`).
   *  Per-engagement/brand; defaults to the placeholder 'prism'. One segment only —
   *  no dots (two-segment namespaces are intentionally unsupported). A namespace is
   *  always present today; a future "no namespace" mode would flatten it at the emit
   *  boundary (see docs/00-progress "Namespace" note) — not by emptying `root`. */
  root?: string;
  /** Which appearance modes to generate. `light` is always emitted (the required base);
   *  `dark` / `hc-light` / `hc-dark` are opt-in. Omit for all four (back-compat); a brand
   *  that ships light only sets `['light']`. The export layout follows this — a collection
   *  only splits into per-mode files when it's multi-mode (docs/11 §4, Pillar 1). */
  modes?: ModeName[];
  /** User-added custom modes (Phase C1). Each `{ name, base }` adds an appearance mode that
   *  LIVE-INHERITS a CUSTOMIZABLE built-in (`base` is `light` or `dark` only — not hc/wireframe):
   *  it re-derives EXACTLY like its base each build (a cloned descriptor, same kind/family/mins,
   *  new name), then its own `overrides[name]` / `modeAnchors[name]` deviate it. `name` must be a
   *  slug (`/^[a-z0-9][a-z0-9-]*$/`), unique, and NOT a reserved built-in mode; `base` must be a
   *  mode this brand generates. Custom modes ARE customizable. Omit for none (byte-identical). */
  customModes?: { name: string; base: BuiltinModeName }[];
  primary: OKLCH;                    // the exact brand anchor (palette 'primary')
  /** The neutral ramp generator. By default the greys are *derived* from a hue + peak
   *  chroma (a small cast toward the brand for cohesion). A brand that ships a
   *  pre-defined neutral instead sets `anchor` — the exact grey, pinned verbatim at its
   *  lightness step, with the whole ramp built around it (hue/chroma taken from the
   *  anchor). `hue`/`chroma` stay present (the derived readout) but the anchor drives the
   *  ramp when set. (A neutral kept as its own *separate* palette is the outlier case —
   *  express it as an entry in `brandColors`, not here.) When `auto` is set the neutral hue
   *  *live-follows* the brand `primary` (re-tracking whenever the brand is recoloured) instead
   *  of the frozen stored `hue`; `chroma` still applies, and a set `anchor` (Pinned) wins over it. */
  neutral: { hue: number; chroma: number; anchor?: OKLCH; auto?: boolean };
  /** Additional brand colours — secondary, tertiary, accents. Any number; each
   *  becomes its own ramp and can be pointed at by `actionPalette` (or used
   *  decoratively). This is what makes the palette set open-ended. */
  brandColors?: { name: string; oklch: OKLCH }[];
  /** Which palette drives interactive/action colour. Defaults to 'primary', but
   *  brands whose hero colour is unsuitable for actions name another palette
   *  here (e.g. an accent, or even neutral). The engine FLAGS this decision in
   *  notes so it's an explicit, confirmable choice — never a silent assumption. */
  actionPalette?: string;
  /** Re-base any semantic role on a declared palette (docs/21). Value = a palette name:
   *  a status (`success`…), `primary`/`neutral`, or a `brandColors` entry. Custom colours
   *  are supplied via `brandColors` and named here. This is the general form of `actionPalette`
   *  (which stays as an ergonomic alias for `roleColors.action`): a red brand reuses its brand
   *  red for `danger`, a blue brand its blue for `info`. `brand`/`neutral` cannot be rebased
   *  (they define the surface model). Every remapped role re-derives + re-gates on the target
   *  ramp; a hue mismatch (a danger that isn't red) is ALLOWED but flagged in the design notes. */
  roleColors?: Partial<Record<Role, string>>;
  /** Non-default primary surfaces per mode (e.g. a warm off-white page). The
   *  contrast floor moves with the declared base, and the engine flags it in
   *  notes so the surface choice is confirmed. Omit for white/black defaults. */
  surfaces?: SurfacesConfig;
  /** Per-mode colour overrides (Phase A1): repoint individual resolved roles to an EXISTING
   *  primitive step (`{ palette, step }`, no raw colours), per mode. Applies only to the
   *  customizable modes (`light`/`dark`); targeting a generate-only mode (hc-light/hc-dark/
   *  wireframe) or a mode this brand doesn't generate throws. A role absent in a given mode is
   *  skipped. A tuned override that fails the role's contrast min still applies + emits but is
   *  recorded as a warning. Distinct from `roleColors`, which rebases a role's whole palette
   *  globally; overrides re-point one role to one step in one mode. */
  overrides?: Partial<Record<ModeName, ModeOverrides>>;
  /** Per-mode interactive anchors (A2b): re-anchor an interactive column's fill at a specific palette
   *  step for a given mode (column keys 'primary' / 'destructive' / an accent name). The whole column
   *  re-derives from it (still floor-gated). Customizable modes only. Distinct from the global
   *  actionAnchorStep / destructiveAnchorStep / interactivePalettes anchors, which set the baseline
   *  every mode inherits — modeAnchors deviate a single mode's column. */
  modeAnchors?: Partial<Record<ModeName, Record<string, number>>>;
  /** Per-mode NON-COLOUR lever overrides (Phase D): a customizable mode overrides an input lever the
   *  engine RE-DERIVES for that mode — today `radius` (the radius scale, 0=sharp…1=default…2=soft),
   *  with `tempo`/`density` slotting in the same map later (NOT `typeScale` — see ModeLevers). Customizable modes only
   *  (light/dark or a `customModes` name); a generate-only mode (hc/wireframe) or a mode this brand
   *  doesn't generate throws, and a radius outside [0,2] throws. Distinct from the GLOBAL `radiusScale`
   *  (the baseline every mode inherits) — modeLevers deviate a single mode. Omit for none (byte-identical). */
  modeLevers?: Partial<Record<ModeName, ModeLevers>>;
  /** Optional measured status overrides; omit to let the engine synthesise. */
  status?: Partial<Record<'success' | 'warning' | 'danger' | 'info', OKLCH & { chroma: number }>>;
  /** Disabled-state contrast. Default `'reduced'` — a dialable `disabledMin` floor
   *  (3–4.5, default 3, where Primer/USWDS sit); `'full'` promises AA text at a fixed
   *  4.5:1 and ignores `disabledMin`. Neither goes below 3:1.
   *  LEGACY ALIASES, accepted for back-compat: `'accessible'` → `'reduced'` (keeps its
   *  `disabledMin`, clamped to >=3); `'conventional'` → `'reduced'` at 3, which RAISES
   *  its contrast from the old ~2:1 exempt look — a deliberate breaking improvement. */
  disabledStrategy?: 'full' | 'reduced' | 'accessible' | 'conventional';
  disabledMin?: number;
  /** Icon contrast floor. Default 'text' (icons mirror text, 4.5:1). '3:1'
   *  resolves icons against the WCAG 1.4.11 non-text floor so they may diverge. */
  iconContrast?: 'text' | '3:1';
  /** How an outline/text interactive control expresses hover (docs/20 §10). Default
   *  'overlay-neutral' (generate translucent `interactive.<color>.overlay.*` washes);
   *  'solid-tint' uses opaque `foreground.<color>-subtle` instead; 'none' omits both. */
  outlineInteraction?: 'overlay-neutral' | 'solid-tint' | 'none';
  /** Neutral interactive emphasis (docs/20 §10). 'subtle' (default) is a light-grey
   *  neutral fill; 'strong' is a bold near-black/near-white neutral fill. */
  neutralEmphasis?: 'subtle' | 'strong';
  /** Generate the inverse surface-context (docs/20 §9) — `interactive.<color>.on-inverse`
   *  inks for outline/text controls on a dark hero / inverse section. Default true. */
  inverse?: boolean;
  /** Opt-in accent interactive colour (docs/20 §3) — the BACK-COMPAT single-column lever. Names a
   *  declared palette (typically a `brandColors` entry) to get a full `interactive.accent.*` column.
   *  Omit → no accent column (never falls back to primary). Must differ from the action palette.
   *  Superseded by `interactivePalettes` (which, when set, wins and ignores this). */
  accentPalette?: string;
  /** Extensible interactive palettes (docs/20 §3) — promote N declared palettes to full
   *  `interactive.<name>.*` columns. Each entry: `palette` (a defined palette — 'primary' or a
   *  `brandColors` name), an optional `name` (the role suffix → `interactive.<name>.*`; defaults to
   *  the palette name), and an optional `anchorStep` (the rest fill step; default 500). Names must
   *  be unique and must not collide with the built-ins (primary/neutral/destructive). This is the
   *  generalised form of `accentPalette`: when set, it WINS and `accentPalette` is ignored. */
  interactivePalettes?: { name?: string; palette: string; anchorStep?: number }[];
  /** Optional fill-step overrides for the built-in primary / destructive interactive columns —
   *  anchor their rest fill at a specific palette step instead of the role default. Omit to keep
   *  the resolved default (byte-identical to today). */
  actionAnchorStep?: number;
  destructiveAnchorStep?: number;
  /** Motion personality (schema-optional #6). `tempo` scales the duration ramp;
   *  `easingEmphasized` overrides the expressive curve. Reduce-motion variants are
   *  always derived. Omit for the 'standard' tempo. */
  motionPersonality?: MotionPersonality;
  /** Typography axis lever. `families` supply the display/text/mono faces (a
   *  single face is auto-padded with a system fallback stack; a full array is
   *  trusted as-is) + a variable-font flag; `weightRoles` map the function-named
   *  roles to the brand's numeric weights; `typeScale` shifts the semantic→
   *  primitive mapping (Phase 2). The rem size ladder is brand-invariant. */
  typography?: TypographyInput;
  /** Shadow / elevation axis lever (Phase A). `softness` is the blur:offset
   *  personality dial (low → crisp/product, high → soft/marketing); `tint` hue-
   *  shifts the shadow base off pure black (default a subtle neutral tint; set a
   *  brand hue + higher amount for brand-hued marketing shadows). */
  shadow?: { softness?: number; tint?: { hue?: number; amount?: number } };
  /** Layout axis lever. `breakpoints` is the min-width floor array (the real
   *  per-brand variable; names are auto sm/md/lg/xl/2xl); `columns` the base
   *  count (12 default; 16/24 for dense-data brands); `containerMax`/
   *  `containerNarrow` the content caps. Gutter/margin alias the spacing scale. */
  layout?: { breakpoints?: number[]; columns?: number; containerMax?: number; containerNarrow?: number };
  /** Gradient axis lever — OPT-IN (off by default; most systems abstain and
   *  gradients are contextual). `true` ships one default brand gradient
   *  (primary.600→primary.350, linear); an explicit array ships exactly those;
   *  `false`/omitted is off. Stop colours alias the colour ramp; OKLCH interp by
   *  default. (`false` is accepted so a UI toggle can write a plain boolean — the
   *  `buildGradient` `!spec` guard reads it as off, same as omitted.) */
  gradients?: boolean | GradientInput[];
  /** Dimension axis levers (schema-required #4/#5). Defaults reproduce a
   *  conventional 4px-grid / 8px-rhythm, sharp-corner system. */
  baseUnit?: number;                 // fine dimension grid base (px), default 4
  spaceBase?: number;                // spacing rhythm (px), default 8
  density?: Density;                 // default 'comfortable' (drives component sizes)
  radiusScale?: number;              // 0=sharp … 1=default … 2=soft, default 1
  baseMd?: number;                   // radius.md anchor (px) at scale 1, default 4
};

const buildDims = (baseUnit: number, spaceBase: number, density: Density, rScale: number, baseMd: number, extras: number[] = []): Dims => {
  // Space is `mult × spaceBase`; the dimension grid is `baseUnit`-stepped. At a non-default spaceBase the
  // half-steps (1.5×/0.25×/0.75×) land OFF the grid (e.g. spaceBase 12 → space.150 = 18px, absent from the
  // baseUnit-4 grid), so `space.<k> → {dimension.<px>}` would dangle (#274). Feed every space px into the
  // grid as extras, so each space alias resolves by construction. At the default spaceBase 8 these already
  // land on the grid, so committed out/* is byte-identical.
  const space = spaceScale(spaceBase);
  return {
    // Icon px join the grid extras for the same reason space does (#274): at a non-default baseUnit
    // (e.g. 6) the fixed icon ladder lands OFF the grid, and `icon.size.<k> -> {dimension.<px>}`
    // would dangle. Feeding them in makes every icon alias resolve by construction. At baseUnit 4
    // they are already grid members, so committed out/* is unaffected.
    grid: dimensionGrid(baseUnit, 128, [...extras, ...space.map((s) => s.px), ...iconSizes().map((i) => i.px)]),
    space,
    radius: radiusScale(rScale, baseMd, 128),
    sizes: componentSizes(density, spaceBase),
    icons: iconSizes(),
    density,
    radiusScaleValue: rScale,
    spaceBase,
  };
};

// ---------------------------------------------------------------------------
// Motion axis — generated from a single personality lever (`tempo`), the motion
// analog of the density/radius levers. Grounded in 18-motion-foundations + a
// 7-system field survey: a non-linear duration ramp scaled by tempo; the
// convergent easing roles (standard/enter=decelerate/exit=accelerate/emphasized)
// + a `calm` accessibility curve; M3-sourced springs by perceptual outcome;
// Atlassian-style composite transitions; and reduce-motion as a DERIVED output
// (Apple "substitute, don't delete": small informational motion preserved/floored,
// large/vestibular motion eliminated) — not a hand-maintained second list.
export type Bezier = [number, number, number, number];
export type MotionPersonality = {
  tempo?: 'snappy' | 'standard' | 'relaxed';   // scales the base duration ramp
  easingEmphasized?: Bezier;                    // optional override for the expressive curve
};
export type MotionAxis = {
  tempo: 'snappy' | 'standard' | 'relaxed';
  duration: Record<string, number>;            // ms, semantic roles (tempo-scaled)
  durationReduced: Record<string, number>;     // ms, reduce-motion variants (derived)
  easing: Record<string, Bezier>;
  spring: Record<string, { damping: number; stiffness: number }>;
  stagger: number;                             // ms between staggered siblings
  transitions: { name: string; duration: string; easing: string; desc: string }[];
  // Per-mode tempo (Phase D) — only modes whose `modeLevers.tempo` differs from the baseline tempo. Each
  // carries the RE-DERIVED duration ramp (+ reduce-motion + stagger) at that mode's tempo; easing/spring/
  // transitions are tempo-invariant, so they're not duplicated. Composites (motion.transition.*) reference
  // motion.duration.<role> by alias, so they inherit per-mode. Absent ⇒ byte-identical.
  motionByMode?: Record<string, { tempo: string; duration: Record<string, number>; durationReduced: Record<string, number>; stagger: number }>;
};

const DURATION_BASE: Record<string, number> = { instant: 50, fast: 100, normal: 200, moderate: 300, slow: 500, slower: 800 };
const TEMPO_FACTOR = { snappy: 0.8, standard: 1, relaxed: 1.3 } as const;
const round5 = (n: number) => Math.round(n / 5) * 5;

const buildMotion = (p: MotionPersonality = {}): MotionAxis => {
  const tempo = p.tempo ?? 'standard';
  const f = TEMPO_FACTOR[tempo];
  const duration: Record<string, number> = {};
  for (const [k, v] of Object.entries(DURATION_BASE)) duration[k] = round5(v * f);
  // reduce-motion: ≤100ms (informational) preserved; ≤200ms floored to 50; larger
  // (vestibular/decorative) → 0 (substituted by an instant cross-fade downstream).
  const durationReduced: Record<string, number> = {};
  for (const [k, v] of Object.entries(duration)) durationReduced[k] = v <= 100 ? v : v <= 200 ? 50 : 0;
  const easing: Record<string, Bezier> = {
    linear: [0, 0, 1, 1],
    standard: [0.2, 0, 0, 1],          // symmetric in-place (M3 standard)
    enter: [0, 0, 0.2, 1],             // decelerate — settles into place
    exit: [0.4, 0, 1, 1],              // accelerate — gets out of the way
    emphasized: p.easingEmphasized ?? [0.4, 0.14, 0.3, 1],  // expressive (Carbon expressive-standard)
    calm: [0.4, 0, 0.6, 1],            // a11y: soft onset for long/involuntary motion
  };
  const spring = {
    snappy: { damping: 0.9, stiffness: 700 },   // M3 standard spatial — fast settle, no overshoot
    gentle: { damping: 0.8, stiffness: 380 },   // M3 expressive spatial — natural settle
    bouncy: { damping: 0.6, stiffness: 800 },   // M3 expressive fast — overshoot (expressive layer)
  };
  return {
    tempo, duration, durationReduced, easing, spring, stagger: round5(40 * f),
    transitions: [
      { name: 'default', duration: 'normal', easing: 'standard', desc: 'standard in-place transition' },
      { name: 'enter', duration: 'normal', easing: 'enter', desc: 'entrance — element settles in' },
      { name: 'exit', duration: 'fast', easing: 'exit', desc: 'exit — element accelerates out' },
      { name: 'emphasized', duration: 'moderate', easing: 'emphasized', desc: 'expressive / hero moment' },
    ],
  };
};

// ---------------------------------------------------------------------------
// Typography axis (Phase 1 — primitive tier). Grounded in 23-typography-
// tokenisation + the Prism2 reference scale. Deliberate deviation from the KB's
// modular-ratio recommendation: the size ladder is a CURATED rem scale, not a
// ratio. A single ratio leaves gaps (1.25 off 16px skips 24/28/36 — the sizes
// designers reach for) and yields non-round values; the curated ladder has
// variable step density (fine for text, coarse for display) and covers all bases
// with clean values. Font-size primitives are brand-INVARIANT (16px is 16px in
// any brand, like the spacing scale); the white-label lever is the families, the
// weight role→numeric map, and the `typeScale` preset (consumed at the semantic
// tier in Phase 2). Weight roles are FUNCTION-named (subtle/default/emphasis/
// strong/max over a numeric reference tier) — the white-label-safe answer to "one
// brand's bold is 700, another's 600": the role is the stable contract, the
// numeric is the brand-variable part (23 §"Naming the weight ladder"). The role
/** The lowest disabled-ink contrast this system will emit, on either branch. 3:1 is the
 *  SC 1.4.11 non-text / SC 1.4.3 large-text threshold and where Primer + USWDS sit — the
 *  lowest ratio defensibly called legible. Below this we'd be relying on the WCAG
 *  inactive-component exemption, which this system deliberately does not do. */
export const DISABLED_FLOOR_MIN = 3;
/** The `'full'` branch's fixed promise, and the ceiling of the `'reduced'` dial: AA text. */
export const DISABLED_FLOOR_MAX = 4.5;
/** Normalize `disabledStrategy`, absorbing the two legacy aliases. Both map to `'reduced'`:
 *  `'accessible'` was already a gated floor, and `'conventional'` (~2:1, ungated) is retired
 *  because the floor is now absolute. Single source of truth for `brandTheme` + the read-model. */
export const normalizeDisabledStrategy = (s: string | undefined): 'full' | 'reduced' =>
  s === 'full' ? 'full' : 'reduced';
/** Normalize `disabledMin` into [3, 4.5]. A legacy `'conventional'` input carried no floor of
 *  its own (it targeted ~2:1), so it lands on the 3:1 minimum — RAISING its contrast. */
export const normalizeDisabledMin = (strategy: string | undefined, min: number | undefined): number => {
  if (strategy === 'conventional') return DISABLED_FLOOR_MIN;
  return Math.min(DISABLED_FLOOR_MAX, Math.max(DISABLED_FLOOR_MIN, min ?? DISABLED_FLOOR_MIN));
};

// set is data-driven (WEIGHT_ROLE_ORDER) so it extends without renames.
export type FontFamilyRole = { role: 'display' | 'text' | 'mono'; stack: string[]; variable: boolean };
export type FamilyRoleName = 'display' | 'text' | 'mono';
// A TYPEFACE is the primitive — the actual face, named after itself (`inter`,
// `clash-display`), carrying its fallback stack. A family ROLE is the semantic that
// binds to one (`display → clash-display`). Two tiers, mirroring colour: a palette is
// named after the thing (`strawberry`), a role after the job (`color.text.danger`).
// The role is the brand-INVARIANT handle a shared codebase binds to — it survives a
// face swap, which a direct `font.family.clash-display` reference would not. A brand
// binds ≤3 roles; the typeface library is shared ACROSS brands, each binding its own.
export type Typeface = { slug: string; name: string; stack: string[]; variable: boolean };
/** Slugify a face name for its token path: `"Clash Display"` → `clash-display`. Derived,
 *  never user-chosen, so there is no arbitrary-rename churn — you either have that face
 *  or you don't. */
export const typefaceSlug = (name: string): string =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unnamed';
// The canonical weight-role ladder, lightest→heaviest. DATA-DRIVEN: this ordered
// array is the single source — `WeightRoleName` derives from it, the defaults map
// keys off it, and the build emits one `font.weight-role.*` primitive per entry.
// Adding a role (e.g. a `light` between subtle and default) is a one-line edit
// here + a default value below; no consumer hardcodes the four original names.
// `max` is the heaviest slot (black/900 territory) — brands that ship a heavy
// hero weight bind to it; it stays defined-but-unused by default categories
// (same as `subtle`), so default output is unchanged bar the extra primitive.
export const WEIGHT_ROLE_ORDER = ['subtle', 'default', 'emphasis', 'strong', 'max'] as const;
export type WeightRoleName = typeof WEIGHT_ROLE_ORDER[number];
export type WeightRole = { role: WeightRoleName; value: number };
export type TypeGroup = 'display' | 'title' | 'body' | 'label' | 'caption' | 'eyebrow' | 'code';
// A semantic composite: a (group, variant) bundling family + size + weight role +
// line-height + tracking. Two composites may share a size primitive (e.g. title.xs
// and body.lg both at 18px) — they differ on family/line-height/weight/intent;
// family is a property of the GROUP, not the size. The size ladder underneath is
// single-source.
export type TypeComposite = {
  group: TypeGroup; variant: string; path: string; sizePx: number;   // desktop / max
  sizeMinPx: number;                               // mobile / min (== sizePx when static)
  family: FamilyRoleName; lineHeight: string; weightRole: WeightRoleName; tracking: string;
  // #296 — per-mode RE-POINT: the rung key this composite binds in a given mode, when it differs
  // from the light key. Absent ⇒ the composite uses one rung across every mode.
  lineHeightByMode?: Record<string, string>;
  trackingByMode?: Record<string, string>;
  // #328 — per-mode rung SIZE. Carries its OWN recomputed mobile endpoint: inheriting the brand-level
  // `sizeMinPx` would pair a re-sized desktop value with a floor derived from the size it replaced.
  sizeByMode?: Record<string, number>;
  sizeMinByMode?: Record<string, number>;
  textCase: 'none' | 'uppercase' | 'lowercase';   // baked style (not Figma-bindable; code/style-side)
  link: boolean;                                   // underlined link variant (textDecoration baked)
  italic: boolean;                                 // italic variant — orthogonal modifier PAIRED with the weight
                                                   // (`strong` + `strong-italic`), NOT a weight role; emits
                                                   // `fontStyle: 'italic'` on the composite $value (off-core-DTCG,
                                                   // the shared Token-Press contract), omitted when normal.
};
export type Typography = {
  families: FontFamilyRole[];
  /** The typeface PRIMITIVES the roles bind to — de-duplicated by slug, and unioned across
   *  every per-mode family override so a mode's alias always lands on a real leaf (the same
   *  contract `weightsRef` has for per-mode weight numerics). */
  typefaces: Typeface[];
  sizesPx: number[];                                  // curated ladder (px; rem = px/16)
  weightsRef: number[];                               // 100..900 numeric reference tier
  weightRoles: WeightRole[];                          // function-named roles → numeric
  lineHeights: { key: string; value: number }[];      // unitless multipliers
  letterSpacings: { key: string; em: number }[];      // em-relative tracking
  typeScale: 'compact' | 'default' | 'expressive';    // shifts heading sizes up/down the ladder
  composites: TypeComposite[];                        // semantic tier (Phase 2)
  fluid: boolean;                                     // responsive sizing on (Phase 3)
  minViewport: number;                                // px — fluid clamp() interpolation floor
  maxViewport: number;                                // px — fluid clamp() interpolation ceiling
  // Per-mode typography levers (Phase D) — only modes whose `modeLevers.families`/`weights` deviate
  // the baseline. Each carries the RE-DERIVED primitives (via the same helpers buildTypography uses):
  // family stacks per family-role, weight-role → numeric per weight-role. Every typography COMPOSITE
  // inherits automatically (its fontFamily/fontWeight alias the family/weight-role PRIMITIVE), so the
  // composite SET is untouched. Absent (field omitted) when no per-mode typography → byte-identical.
  familiesByMode?: Record<string, FontFamilyRole[]>;
  weightRolesByMode?: Record<string, WeightRole[]>;
  // Per-mode LINE HEIGHT / LETTER SPACING ramps (Phase D) — only modes whose `modeLevers.lineHeights`/
  // `letterSpacings` deviate the baseline. Each carries the FULL named ramp re-anchored for that mode
  // (steps at the light value where the mode didn't override). Composites inherit via their
  // line-height/letter-spacing key alias, so the composite set is untouched. Absent ⇒ byte-identical.
  // #296 — per-mode leading/tracking RE-POINT maps (rung → rung). Not per-mode ramps: the rungs are
  // mode-invariant primitives, so a mode records only which rung stands in for which.
  lineHeightRepointByMode?: Record<string, Record<string, string>>;
  letterSpacingRepointByMode?: Record<string, Record<string, string>>;
  /** #328 — mode → heading group → rung → px. Only DIFFERING rungs are recorded, so an inert
   *  declaration leaves this absent and the artifact byte-identical. */
  typeSizesByMode?: Record<string, Record<string, Record<string, number>>>;
};

const SANS_FALLBACK = ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'];
const MONO_FALLBACK = ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'];
// Line-height + letter-spacing are curated NAMED ramps (semantic keys → value). The key ORDER is the
// single source: `LineHeightKey`/`LetterSpacingKey` derive from it, and per-mode overrides
// (modeLevers.lineHeights/letterSpacings) are keyed by these names. Composites reference a key
// (lineHeightFor / trackingFor pick which). NOTE (#296): a per-mode override no longer re-anchors a
// key's VALUE — the rungs are mode-invariant primitives, and the mode re-points the composite at a
// different rung instead. What follows describes the BRAND-level ramp, which a brand may re-anchor
// freely (mode-invariantly); the per-mode path snaps to whichever rung it lands nearest. Was: every
// composite that uses it — the same seam as weight-role.
export const LINE_HEIGHT_KEYS = ['tight', 'snug', 'compact', 'normal', 'relaxed', 'loose'] as const;
export type LineHeightKey = typeof LINE_HEIGHT_KEYS[number];
export const LETTER_SPACING_KEYS = ['tighter', 'tight', 'snug', 'normal', 'wide', 'wider'] as const;
export type LetterSpacingKey = typeof LETTER_SPACING_KEYS[number];
const LINE_HEIGHTS: { key: LineHeightKey; value: number }[] = [
  { key: 'tight', value: 1.05 }, { key: 'snug', value: 1.15 }, { key: 'compact', value: 1.25 },
  { key: 'normal', value: 1.5 }, { key: 'relaxed', value: 1.65 }, { key: 'loose', value: 1.75 },
];
const LETTER_SPACINGS: { key: LetterSpacingKey; em: number }[] = [
  { key: 'tighter', em: -0.03 }, { key: 'tight', em: -0.02 }, { key: 'snug', em: -0.01 }, { key: 'normal', em: 0 },
  { key: 'wide', em: 0.02 }, { key: 'wider', em: 0.05 },
];
const WEIGHT_ROLE_DEFAULT: Record<WeightRoleName, number> = { subtle: 300, default: 400, emphasis: 600, strong: 700, max: 900 };

// Curated rem ladder: text [10–18] in 1–2px steps; ¼rem (4px) 20→40; ½rem (8px)
// 48→80; 1rem (16px) 96→160. 22 steps, all clean rem values (matches Prism2).
const fontSizeLadder = (): number[] => {
  const px = [10, 11, 12, 14, 16, 18];
  for (let p = 20; p <= 40; p += 4) px.push(p);
  for (let p = 48; p <= 80; p += 8) px.push(p);
  for (let p = 96; p <= 160; p += 16) px.push(p);
  return px;
};

const asStack = (fam: string | string[] | undefined, fallbackFace: string, fallback: string[]): string[] => {
  if (!fam) return [fallbackFace, ...fallback];
  const arr = Array.isArray(fam) ? fam : [fam];
  return arr.length > 1 ? arr : [...arr, ...fallback];   // single face → append fallback; full stack → trust it
};

export type TypographyInput = {
  /** The face bound to each family role. `mono: null` OPTS OUT — most brands have no mono
   *  face, and a brand without one ships no `code` category either. Omitted (undefined)
   *  keeps the default mono, so existing brands are unaffected. */
  families?: { display?: string | string[]; text?: string | string[]; mono?: string | string[] | null; variable?: boolean | Partial<Record<FamilyRoleName, boolean>> };
  weightRoles?: Partial<Record<WeightRoleName, number>>;
  typeScale?: 'compact' | 'default' | 'expressive';
  /** Which family role each semantic group consumes. Defaults: display/title/
   *  label/eyebrow → display (brand); body/caption → text; code → mono. Override
   *  per group (e.g. neutral buttons: `{ label: 'text' }`). Family is a property
   *  of the GROUP, not the size — this is what lets a small brand-font title share
   *  a size with body while staying a distinct token. */
  familyMap?: Partial<Record<TypeGroup, FamilyRoleName>>;
  /** Cap the display tier by RUNG, not by px (#328). Brands that don't need mega
   *  heroes stop lower (e.g. `'xl'`); the ladder is unchanged, the engine just omits
   *  display composites above the named rung. Default `'3xl'` (full).
   *
   *  Named by rung rather than by px deliberately: a px cap is compared against sizes
   *  that `typeScale` has already shifted, so the SAME cap yielded a different number
   *  of rungs per scale (96px kept 4 under compact/default but 3 under expressive) —
   *  a brand lever silently changing the type SET. The engine even shipped a note
   *  apologizing for the discrepancy. A rung name is invariant under the shift. */
  displayCeiling?: DisplayVariant;
  /** Whether the title tier includes `title.2xs`. `16` adds it — a 16px brand-font
   *  heading that deliberately overlaps `body.md`; `18` (default) omits it.
   *
   *  This is pure SET MEMBERSHIP: it decides whether a rung exists, and never clamps
   *  a size. It used to also do `Math.max(sizePx, titleFloor)`, which fed a size
   *  operation into the monotonic dedupe and silently deleted a rung — `compact`
   *  lost `title.sm` (floor 18) or `title.xs` (floor 16), leaving a GAP mid-ramp. */
  titleFloor?: 16 | 18;
  /** Per-size overrides for the heading groups, keyed group → rung → px. The BASELINE counterpart of
   *  `modeLevers.<mode>.typeSizes`, and it exists because the asymmetry ran the wrong way: a size could
   *  be pinned per mode but not at the brand level, so a single-mode brand — the common case — could
   *  not tune its ramp while a multi-mode one could.
   *
   *  Applied AFTER the typeScale shift, so a pinned size is ABSOLUTE: it does not move when the scale
   *  changes. That is deliberate and it is why changing `typeScale` with sizes pinned can collide —
   *  the ramp check rejects it rather than silently re-shifting the value the author fixed.
   *
   *  Modes then override on top of the customized baseline, not the derived one. */
  sizes?: Partial<Record<PerModeSizeGroup, Record<string, number>>>;
  /** Per-role weight set. Weight is an axis on every type role (every composite
   *  carries the weight in its name). Defaults: display/title `[strong]`, body
   *  `[default, strong]` (add `emphasis` for a 3rd), caption `[default, strong]`,
   *  label/eyebrow `[emphasis]`, code `[default]`. Override a role to ship a
   *  multi-weight ramp (e.g. `display: ['default','strong']`, or `['strong','max']`
   *  for a black hero). Roles use the canonical weight-role names
   *  (subtle/default/emphasis/strong/max, lightest→heaviest). */
  weights?: Partial<Record<TypeGroup, WeightRoleName[]>>;
  /** Which roles get an underlined `.link` variant for every size×weight. Default
   *  `['body','caption']`. Underline is baked; the link colour stays `text.link.*`. */
  links?: TypeGroup[];
  /** Which roles ship an `.*-italic` variant for every size×weight (and, for link
   *  roles, an italic-link too — italic and link are orthogonal). Italic is a
   *  weight-PAIRED modifier (`strong` + `strong-italic`), NOT a weight role; it
   *  emits `fontStyle: 'italic'` on the composite `$value`. Default `[]` — italics
   *  are a deliberate brand choice, so default output ships none (opt in per role,
   *  e.g. `['body','caption']` for emphasis in running text). */
  italics?: TypeGroup[];
  /** Responsive sizing (Phase 3). `fluid` (default true) gives heading groups a
   *  mobile endpoint (= desktop × a per-group factor, snapped to the ladder); the
   *  same min/max pair drives the web `clamp()` and the Figma desktop/mobile modes.
   *  Reading/UI text stays static. `minViewport`/`maxViewport` (px, default
   *  375/1280) bound the clamp interpolation. */
  responsive?: { fluid?: boolean; minViewport?: number; maxViewport?: number };
  /** Re-anchor a named LEADING rung for the whole brand (unitless multiplier,
   *  [0.8, 3]). The rung SET is fixed (tight…loose) — this changes what a rung is
   *  worth, not which rung a composite lands on, so every composite aliasing it
   *  reflows. Omitted rungs keep the curated default. */
  lineHeights?: Partial<Record<LineHeightKey, number>>;
  /** Re-anchor a named TRACKING rung for the whole brand (em, [-0.5, 0.5]). Same
   *  contract as `lineHeights`. */
  letterSpacings?: Partial<Record<LetterSpacingKey, number>>;
  /** Per-group LEADING nudge, in rungs (typically -1 / 0 / +1). The engine derives
   *  a size-sensitive rung per composite (`lineHeightFor` — bigger headings get
   *  tighter leading); this shifts that whole curve without flattening it, so the
   *  size-sensitivity survives. Positive = more open. Default 0. */
  leadingShift?: Partial<Record<TypeGroup, number>>;
  /** Per-group TRACKING nudge, in rungs. Same contract as `leadingShift`;
   *  positive = wider. Default 0. */
  trackingShift?: Partial<Record<TypeGroup, number>>;
};

// Semantic catalogue defaults (the 'default' typeScale, before levers). Family/
// weight/tracking are per-GROUP; line-height is size-derived for headings.
const TYPE_FAMILY_DEFAULT: Record<TypeGroup, FamilyRoleName> = {
  display: 'display', title: 'display', label: 'display', eyebrow: 'display',
  body: 'text', caption: 'text', code: 'mono',
};
// Weight is a CONFIGURABLE AXIS on every role (not a single baked weight): each
// role declares which weight roles it ships, and every composite carries the
// weight in its name (`type.body.md.strong`) so adding weights later never
// renames. Defaults stay lean — display/title single-weight (expandable: brands
// that ship multi-weight hero ramps just list more), body 2 (default + strong;
// `emphasis` is the opt-in 3rd), caption 2. Override per role via `weights`.
const TYPE_WEIGHTS_DEFAULT: Record<TypeGroup, WeightRoleName[]> = {
  display: ['strong'], title: ['strong'], label: ['emphasis'], eyebrow: ['emphasis'],
  body: ['default', 'strong'], caption: ['default', 'strong'], code: ['default'],
};
// Which roles get an underlined `.link` variant for EVERY size×weight (inline
// links inherit the surrounding text's size + weight). Underline is baked
// (textDecoration isn't Figma-bindable — a separate text style); the link COLOUR
// stays `text.link.*` and is applied alongside.
const TYPE_LINK_DEFAULT: TypeGroup[] = ['body', 'caption'];
const TYPE_TRACK_DEFAULT: Record<TypeGroup, string> = {
  display: 'tight', title: 'snug', label: 'normal', eyebrow: 'wider',
  body: 'normal', caption: 'normal', code: 'normal',
};
// Mega display tightens further (-0.03em): large type needs tighter tracking.
const trackingFor = (group: TypeGroup, px: number): string =>
  group === 'display' && px >= 96 ? 'tighter' : TYPE_TRACK_DEFAULT[group];
// base variant → px (default scale). title floor 18; 16 (title.2xs) is opt-in.
const TYPE_VARIANTS: Record<TypeGroup, [string, number][]> = {
  display: [['sm', 48], ['md', 64], ['lg', 80], ['xl', 96], ['2xl', 128], ['3xl', 160]],
  title: [['xs', 18], ['sm', 20], ['md', 24], ['lg', 28], ['xl', 32], ['2xl', 40]],
  body: [['sm', 14], ['md', 16], ['lg', 18]],
  label: [['sm', 12], ['md', 14]],
  caption: [['md', 11], ['lg', 12]],          // small print; lg=12 (standard), md=11 (denser). sm=10 (fine print) is a future opt-in.
  // Eyebrow is part of the HEADING system, not the UI-text system (#328): a kicker sits above a
  // title and scales with the heading it accompanies. It was a single SIZELESS rung, which made
  // `type.eyebrow.<weight>` the only composite path with no size segment. Three rungs now — `lg`
  // exists specifically for the hero kicker, which is also what makes the fluid rule below do
  // anything (with only 12/14 nothing would ever clear the threshold).
  eyebrow: [['sm', 12], ['md', 14], ['lg', 20]],
  code: [['inline', 14]],
};
const TYPE_SCALE_SHIFT = { compact: -1, default: 0, expressive: 1 } as const;
/** The display rung names, smallest→largest — the domain of `displayCeiling` (#328). */
export const DISPLAY_VARIANTS = ['sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
export type DisplayVariant = typeof DISPLAY_VARIANTS[number];
// Desktop → mobile endpoint — RESEARCH-VALIDATED (not a flat factor). The field
// (IBM Carbon fluid-display, Utopia, practitioner consensus) shrinks BIGGER sizes
// MORE: body/UI static, titles ~1 rung, display converging to a ~40–48px mobile
// "hero band" no matter how large desktop goes (Carbon fluid-display-04 is
// 40→176px ≈ 23%). A flat factor shrank a 96px hero and a 28px heading by the same
// proportion — the opposite of how systems behave, and it left a 160px hero at
// 120px (≈3 chars/line on a 360px phone) instead of ~48px (≈9–11 chars/line).
const oneRungDown = (ladder: number[], px: number): number => {
  const i = ladder.indexOf(px);
  return i > 0 ? ladder[i - 1] : px;
};
// Display mobile endpoints, anchored to Carbon's fluid-display curve (floor ~40–48px).
// Keyed by desktop px (always a ladder value); fallback ≈ one rung down.
const DISPLAY_MOBILE: Record<number, number> = {
  36: 32, 40: 32, 48: 36, 56: 40, 64: 40, 72: 40, 80: 40,
  96: 48, 112: 48, 128: 48, 144: 48, 160: 48,
};
const mobileEndpoint = (ladder: number[], group: TypeGroup, desktopPx: number): number => {
  if (group === 'display') return Math.min(desktopPx, DISPLAY_MOBILE[desktopPx] ?? Math.max(oneRungDown(ladder, desktopPx), 32));
  if (group === 'title') return desktopPx <= 20 ? desktopPx : Math.min(desktopPx, Math.max(oneRungDown(ladder, desktopPx), 20));
  // Eyebrow follows title's shape with its own numbers (#328) — fluid ABOVE a threshold, static at
  // or below it. Not a new mechanism and not an exception: `title` above is already exactly
  // "small ones don't move, large ones do". So sm=12/md=14 never shift across breakpoints and only
  // a hero kicker does. Floor 12 because it is uppercase and tracked wider, which costs legibility
  // that lowercase body text at the same px does not pay.
  if (group === 'eyebrow') return desktopPx <= 14 ? desktopPx : Math.min(desktopPx, Math.max(oneRungDown(ladder, desktopPx), 12));
  return desktopPx;   // body / label / caption / code — static (field consensus)
};
/** Per-mode rung SIZE overrides (#328) are heading-only. Each group's floor is the smallest value the
 *  brand-level machinery can ALREADY produce for it — display 32 (its mobile-endpoint floor), title 16
 *  (titleFloor's minimum), eyebrow 11 (what `compact` shifts sm to since #346). A mode may re-size a
 *  rung; it may not invent a size the rest of the system would never emit. Reading/UI text
 *  (body/label/caption/code) is absent BY CONTRACT, not by oversight: those groups are mode-invariant,
 *  and both the schema and brandTheme REJECT them rather than silently ignoring the request.
 *  These floors are ABSOLUTE and deliberately not a cross-category rule (display ≥ title ≥ body):
 *  titleFloor 16 already overlaps body.md on purpose, so a relative rule would forbid a shipped brand. */
export const HEADING_SIZE_FLOOR = { display: 32, title: 16, eyebrow: 11 } as const;
export type PerModeSizeGroup = keyof typeof HEADING_SIZE_FLOOR;
export const PER_MODE_SIZE_GROUPS = Object.keys(HEADING_SIZE_FLOOR) as PerModeSizeGroup[];
// Bigger heading → tighter line-height (display tightest; small titles open up).
const lineHeightFor = (group: TypeGroup, px: number): string => {
  if (group === 'display') return 'tight';
  if (group === 'title') return px >= 56 ? 'tight' : px >= 28 ? 'snug' : 'compact';
  if (group === 'label' || group === 'eyebrow') return 'snug';
  return 'normal';                                       // body, caption, code
};

// Shift a named rung along its ordered key list, clamped at both ends. Both ramps
// are ordered so that a POSITIVE shift is the more open direction (leading
// tight→loose, tracking tighter→wider), which keeps `leadingShift`/`trackingShift`
// reading the same way.
const shiftRung = (keys: readonly string[], key: string, by: number): string => {
  if (!by) return key;
  const i = keys.indexOf(key);
  return i < 0 ? key : keys[Math.max(0, Math.min(keys.length - 1, i + by))];
};

const buildComposites = (ladder: number[], t: TypographyInput, fluid: boolean, families: FontFamilyRole[]): TypeComposite[] => {
  const familyMap = { ...TYPE_FAMILY_DEFAULT, ...(t.familyMap ?? {}) };
  // A group whose family role isn't bound can't be built — with `mono: null` that drops
  // `code`, which is the only group binding mono.
  const boundRoles = new Set(families.map((f) => f.role));
  const leadShift = t.leadingShift ?? {};
  const trackShift = t.trackingShift ?? {};
  const shift = TYPE_SCALE_SHIFT[t.typeScale ?? 'default'];
  const ceilingIdx = DISPLAY_VARIANTS.indexOf(t.displayCeiling ?? '3xl');
  const titleFloor = t.titleFloor ?? 18;
  const shiftPx = (px: number): number => {
    const i = ladder.indexOf(px);
    if (i < 0) return px;
    return ladder[Math.max(0, Math.min(ladder.length - 1, i + shift))];
  };
  // Brand-level per-size overrides. Until now a size could be pinned per MODE but not at the baseline,
  // so a single-mode brand — the common case — could not tune its ramp at all while a multi-mode one
  // could. The shape checks run here; ORDERING is enforced by the ramp check below, which sees the
  // merged result and so catches an override colliding with a rung the author never touched.
  const brandSizes: Partial<Record<PerModeSizeGroup, Record<string, number>>> = t.sizes ?? {};
  const consumedSizes = new Set<string>();
  // `group` below is a TypeGroup (all seven); the override map is heading-only by contract. A lookup
  // for body/label/caption/code is legitimately undefined rather than a type error, so narrow here
  // once instead of casting at each call site.
  const brandSizeFor = (g: TypeGroup, v: string): number | undefined =>
    (brandSizes as Record<string, Record<string, number> | undefined>)[g]?.[v];
  const ladderSet = new Set(ladder);
  for (const [g, rungs] of Object.entries(brandSizes)) {
    if (!PER_MODE_SIZE_GROUPS.includes(g as PerModeSizeGroup))
      throw new Error(`typography.sizes: '${g}' is not a heading group — per-size overrides cover ${PER_MODE_SIZE_GROUPS.join('/')} only. Reading and UI text takes its size from the category, not from a lever.`);
    for (const [variant, px] of Object.entries(rungs ?? {})) {
      if (!ladderSet.has(px))
        throw new Error(`typography.sizes.${g}.${variant}: ${px}px is not a step on the size ladder (${ladder.join(', ')}).`);
      const floor = HEADING_SIZE_FLOOR[g as PerModeSizeGroup];
      if (px < floor)
        throw new Error(`typography.sizes.${g}.${variant}: ${px}px is below the ${g} floor of ${floor}px — the smallest size this system emits for ${g} anywhere.`);
    }
  }
  const weightsMap = { ...TYPE_WEIGHTS_DEFAULT, ...(t.weights ?? {}) };
  const linkGroups = new Set(t.links ?? TYPE_LINK_DEFAULT);
  const italicGroups = new Set(t.italics ?? []);   // default none — italics are opt-in per role
  const out: TypeComposite[] = [];
  // One (group, size) fans out to every weight the role ships, and — orthogonally —
  // an italic modifier and/or an underlined link modifier of each. The modifiers are
  // hyphenated suffixes on the weight, in a fixed order: `type.<group>.<size>.<weight>[-italic][-link]`
  // (size omitted for sizeless roles like eyebrow). Adding a weight/modifier later is
  // purely additive — no renames.
  const push = (group: TypeGroup, variant: string, sizePx: number) => {
    const sizeMinPx = fluid ? mobileEndpoint(ladder, group, sizePx) : sizePx;
    const emit = (weightRole: WeightRoleName, link: boolean, italic: boolean) => {
      // Modifiers are hyphenated suffixes on the weight (`strong-italic-link`), clean
      // SIBLING leaves of the bare weight — not `.italic`/`.link` children (that would
      // make `strong` a token-with-children, non-DTCG). Italic precedes link so the
      // ordering is stable regardless of which axes a role ships. Matches the
      // `-subtle`/`on-fill` convention.
      const weightSeg = `${weightRole}${italic ? '-italic' : ''}${link ? '-link' : ''}`;
      const segs = [group, variant, weightSeg].filter(Boolean);
      out.push({
        group, variant, weightRole, link, italic, path: segs.join('.'), sizePx, sizeMinPx,
        family: familyMap[group],
        // The derived rung is size-sensitive; the per-group nudge shifts that curve
        // rather than replacing it, so `title` keeps tightening as it grows.
        lineHeight: shiftRung(LINE_HEIGHT_KEYS, lineHeightFor(group, sizePx), leadShift[group] ?? 0),
        tracking: shiftRung(LETTER_SPACING_KEYS, trackingFor(group, sizePx), trackShift[group] ?? 0),
        textCase: group === 'eyebrow' ? 'uppercase' : 'none',
      });
    };
    // italic × link are orthogonal: a role that ships both gets the full cross
    // (bare / italic / link / italic-link). A role shipping neither gets just the bare weight.
    const italicStates = italicGroups.has(group) ? [false, true] : [false];
    const linkOn = linkGroups.has(group);
    for (const weightRole of weightsMap[group]) {
      for (const italic of italicStates) {
        emit(weightRole, false, italic);
        if (linkOn) emit(weightRole, true, italic);
      }
    }
  };
  for (const group of Object.keys(TYPE_VARIANTS) as TypeGroup[]) {
    if (!boundRoles.has(familyMap[group])) continue;   // unbound family role ⇒ no composites
    // The heading SYSTEM, not just the heading hierarchy (#328): eyebrow shifts with display/title
    // because a kicker sits directly above one and is read as a pair with it. Leave it out and an
    // `expressive` brand grows its titles a rung while the kicker stays put, which breaks the very
    // pairing that makes an eyebrow an eyebrow. Reading/UI text (body/label/caption/code) still
    // never moves — that boundary is the one the scale preset exists to respect.
    const isHeading = group === 'display' || group === 'title' || group === 'eyebrow';
    let prev = -Infinity;
    // title floor: a fixed 16px brand-font heading, PINNED (exempt from the
    // typeScale shift) so titleFloor:16 always delivers a literal 16px title that
    // overlaps body.md — the documented contract — regardless of typeScale.
    if (group === 'title' && titleFloor === 16) {
      // The 2xs rung is pinned at 16 by the floor, but a brand override still applies to it — the
      // floor decides that the rung EXISTS, never what it is worth (the set/size split, #328).
      const px = brandSizes.title?.['2xs'] ?? 16;
      if (brandSizes.title?.['2xs'] !== undefined) consumedSizes.add('title.2xs');
      push('title', '2xs', px); prev = px;
    }
    for (const [i, [variant, base]] of TYPE_VARIANTS[group].entries()) {
      // displayCeiling trims the top by RUNG POSITION, before any size is computed — set
      // membership, decided once here and never re-applied per mode (#328). Trimming from
      // the end is what keeps the surviving names stable: no rung is ever renumbered.
      if (group === 'display' && i > ceilingIdx) continue;
      // typeScale shifts the heading SYSTEM only (display + title + eyebrow); reading/UI text stays put.
      const shifted = isHeading ? shiftPx(base) : base;
      // A brand-level per-size override lands HERE — after the shift, before the ramp check. Absolute
      // px, exactly like the per-mode one: it pins the size, so it does NOT move when typeScale changes
      // (which is why changing the scale with sizes pinned can collide — and should, loudly).
      const sizePx = brandSizeFor(group, variant) ?? shifted;
      if (brandSizeFor(group, variant) !== undefined) consumedSizes.add(`${group}.${variant}`);
      // The ramp must be STRICTLY INCREASING. This used to `continue` — silently dropping
      // the colliding rung and leaving a gap mid-ramp (`compact` lost title.sm). Dropping a
      // rung is never the right answer: it changes the type SET, which is the one thing the
      // set/size split exists to keep stable. Reject instead. validateBrandInput catches the
      // one reachable combination (compact + titleFloor 16) with a friendlier message.
      if (sizePx <= prev) {
        const pinned = brandSizeFor(group, variant) !== undefined;
        throw new Error(`typography: ${group}.${variant} resolves to ${sizePx}px, which is not larger than the previous rung (${prev}px) — the ramp must be strictly increasing. ${pinned ? `typography.sizes.${group}.${variant} pins it to ${sizePx}px; a pinned size does not move when the scale does, so either release it or move its neighbor.` : `Check typeScale '${t.typeScale ?? 'default'}'${group === 'title' ? ` + titleFloor ${titleFloor}` : ''}.`}`);
      }
      push(group, variant, sizePx);
      prev = sizePx;
    }
  }
  for (const [g, rungs] of Object.entries(brandSizes))
    for (const variant of Object.keys(rungs ?? {}))
      if (!consumedSizes.has(`${g}.${variant}`)) {
        const shipped = [...new Set(out.filter((c) => c.group === g).map((c) => c.variant))];
        throw new Error(`typography.sizes.${g}.${variant}: that rung is not in this brand's ${g} set${shipped.length ? ` (${shipped.join('/')})` : ''} — it is trimmed by displayCeiling or not enabled by titleFloor. A size override re-sizes a rung that exists; it never adds one.`);
      }
  return out;
};

// Derive the three family-role stacks from a `families` input object (display/text/mono
// + variable). Single source for both the light build (buildTypography) and per-mode
// re-derivation (brandTheme's modeLevers.families): a per-mode override merges its stacks
// over the base `families` and re-runs this, keeping the `variable` flag from the base.
const deriveFamilies = (fam: TypographyInput['families'] = {}): FontFamilyRole[] => {
  const textFace = Array.isArray(fam.text) ? fam.text[0] : fam.text;
  // `variable` may be a single flag (applies to all) or per-family — the build
  // reads it per family to decide weight emission (KB 23 §Variable fonts).
  const isVar = (role: FamilyRoleName): boolean =>
    typeof fam.variable === 'object' ? fam.variable[role] ?? false : fam.variable ?? false;
  const out: FontFamilyRole[] = [
    { role: 'display', stack: asStack(fam.display ?? textFace, 'Inter', SANS_FALLBACK), variable: isVar('display') },
    { role: 'text', stack: asStack(fam.text, 'Inter', SANS_FALLBACK), variable: isVar('text') },
  ];
  // `mono: null` is the explicit opt-out; undefined keeps the default face (existing brands
  // are untouched). No mono role ⇒ no `code` category, since code is the only thing that binds it.
  if (fam.mono !== null) out.push({ role: 'mono', stack: asStack(fam.mono, 'JetBrains Mono', MONO_FALLBACK), variable: isVar('mono') });
  return out;
};

/** Collapse a set of family roles into the distinct TYPEFACE primitives they bind. Two roles on
 *  the same face share one primitive (NB binds display and text to Inter); `variable` ORs, since
 *  it is a property of the face rather than of the role. */
const deriveTypefaces = (...roleSets: FontFamilyRole[][]): Typeface[] => {
  const out: Typeface[] = [];
  for (const roles of roleSets) {
    for (const f of roles) {
      const name = f.stack[0];
      const slug = typefaceSlug(name);
      const hit = out.find((t) => t.slug === slug);
      if (hit) { hit.variable = hit.variable || f.variable; continue; }
      out.push({ slug, name, stack: f.stack, variable: f.variable });
    }
  }
  return out;
};

// The brand's leading/tracking ramps: the curated rungs, with any brand
// re-anchoring applied. Single source for the light build AND the per-mode
// re-derivation below, so a per-mode override layers on the BRAND's ramp rather
// than silently reverting to the curated default.
export const brandLineHeights = (t: TypographyInput = {}): { key: string; value: number }[] =>
  LINE_HEIGHTS.map((l) => ({ key: l.key, value: t.lineHeights?.[l.key] ?? l.value }));
export const brandLetterSpacings = (t: TypographyInput = {}): { key: string; em: number }[] =>
  LETTER_SPACINGS.map((l) => ({ key: l.key, em: t.letterSpacings?.[l.key] ?? l.em }));

const buildTypography = (t: TypographyInput = {}): Typography => {
  // Same bounds as the per-mode levers — guard typos, not taste.
  for (const [k, v] of Object.entries(t.lineHeights ?? {}))
    if (v !== undefined && (!Number.isFinite(v) || v < 0.8 || v > 3))
      throw new Error(`typography.lineHeights '${k}' ${v} is out of range — must be a finite multiplier in [0.8, 3]`);
  for (const [k, v] of Object.entries(t.letterSpacings ?? {}))
    if (v !== undefined && (!Number.isFinite(v) || v < -0.5 || v > 0.5))
      throw new Error(`typography.letterSpacings '${k}' ${v} is out of range — must be a finite em in [-0.5, 0.5]`);
  // A nudge beyond ±5 rungs is meaningless (both ramps are 6 long) — almost certainly a typo.
  for (const [field, map] of [['leadingShift', t.leadingShift], ['trackingShift', t.trackingShift]] as const)
    for (const [g, n] of Object.entries(map ?? {}))
      if (n !== undefined && (!Number.isInteger(n) || n < -5 || n > 5))
        throw new Error(`typography.${field} '${g}' ${n} is invalid — must be an integer number of rungs in [-5, 5]`);
  // Cross-field, so it can't live in theme-schema.json: `compact` shifts title.xs 18→16, which is
  // exactly where titleFloor 16 pins title.2xs. The old code resolved the collision by DROPPING a
  // rung (leaving a gap mid-ramp); rejecting is the honest answer (#328).
  if ((t.typeScale ?? 'default') === 'compact' && t.titleFloor === 16)
    throw new Error(`typography: titleFloor 16 is incompatible with typeScale 'compact' — compact already shifts title.xs down to 16px, so title.2xs would duplicate it. Use titleFloor 18 with 'compact', or titleFloor 16 with 'default'/'expressive'.`);
  const families = deriveFamilies(t.families);
  const wr = { ...WEIGHT_ROLE_DEFAULT, ...(t.weightRoles ?? {}) };
  const fluid = t.responsive?.fluid ?? true;
  return {
    families,
    typefaces: deriveTypefaces(families),
    sizesPx: fontSizeLadder(),
    // Minted from need, not the full 100–900 axis (#328): emit only the numerics some
    // weight ROLE actually points at. Every `weight-role.<role>` aliases `font.weight.<n>`,
    // so the role values ARE the complete set of referenced numerics — anything else was a
    // dead leaf (default roles use 5 of 9). Per-mode weights union onto this below, which is
    // what keeps a mode's deviating numeric resolvable.
    weightsRef: [...new Set(WEIGHT_ROLE_ORDER.map((role) => wr[role]))].sort((a, b) => a - b),
    weightRoles: WEIGHT_ROLE_ORDER.map((role) => ({ role, value: wr[role] })),
    lineHeights: brandLineHeights(t),
    letterSpacings: brandLetterSpacings(t),
    typeScale: t.typeScale ?? 'default',
    composites: buildComposites(fontSizeLadder(), t, fluid, families),
    fluid,
    minViewport: t.responsive?.minViewport ?? 375,
    maxViewport: t.responsive?.maxViewport ?? 1280,
  };
};

// ---------------------------------------------------------------------------
// Shadow / elevation axis (Phase A — the shadow ramp). Grounded in
// 31-color-systems §lift pattern + a 10-system field survey. Decisions:
//  - 6 steps (xs–2xl), the convergent count; + a single inset.
//  - 2 LAYERS per step (key + ambient — the field's physical model: a tight
//    directional key shadow for the edge, a soft diffuse ambient for distance).
//  - TINTED near-black, not pure black (Polaris/Radix/Comeau): a shadow base
//    colour from the neutral (or a brand) hue at low chroma. `shadow.tint` is the
//    expressive lever; `softness` (blur:offset ratio) is the personality lever.
//  - MODE-AWARE, LIFT-PRIMARY: full shadow in light; in dark the surface ladder
//    lift carries elevation and the shadow is REDUCED (faded, more present only at
//    the top steps) — NOT nulled (M3/Atlassian retain it), NOT heavier (rejecting
//    NB's `inverse`). The semantic surface↔shadow pairing is Phase B.
//  - offsetX = 0 (light directly above — the field-universal assumption); spread
//    negative-and-growing to keep large shadows tight (Tailwind/Polaris/Radix).
export type ShadowLayer = { offsetX: number; offsetY: number; blur: number; spread: number; alpha: number };
export type ShadowStep = { name: string; light: ShadowLayer[]; dark: ShadowLayer[] };
export type ShadowAxis = {
  steps: ShadowStep[];
  inset: ShadowStep;
  colorRgb: RGB;                 // the tinted shadow base (layers vary only alpha)
  softness: number;
  tint: { hue: number; amount: number };
  // Per-mode shadow (Phase D) — only modes whose `modeLevers.shadow` deviates. Each carries the
  // RE-DERIVED layer-set for that mode's APPEARANCE (light-based → full layers; dark-based → reduced) at
  // the mode's softness/tint, plus the mode's own tinted `colorRgb` (a tint override changes the colour).
  // `layers` is keyed by step name (incl. `inset`). Composites reference nothing here — the shadow leaf
  // attaches `$extensions.prism3.modes.<mode>` from this. Absent ⇒ byte-identical.
  shadowByMode?: Record<string, { appearance: 'light' | 'dark'; colorRgb: RGB; softness: number; tint: { hue: number; amount: number }; layers: Record<string, ShadowLayer[]> }>;
};
// Base ramp at softness 1 — [keyY, keyBlur, keySpread, keyAlpha, ambY, ambBlur, ambSpread, ambAlpha].
// Anchored to Tailwind/Polaris/NB curves; offsetY≈blur×0.6–0.7, spread tightens with size.
const SHADOW_BASE: { name: string; key: number[]; amb: number[] }[] = [
  { name: 'xs', key: [1, 2, 0, 0.10], amb: [1, 3, 0, 0.06] },
  { name: 'sm', key: [1, 2, -1, 0.10], amb: [2, 6, -1, 0.07] },
  { name: 'md', key: [2, 4, -2, 0.12], amb: [4, 12, -3, 0.08] },
  { name: 'lg', key: [3, 6, -3, 0.12], amb: [8, 20, -5, 0.08] },
  { name: 'xl', key: [4, 8, -4, 0.14], amb: [14, 32, -8, 0.10] },
  { name: '2xl', key: [6, 12, -6, 0.14], amb: [22, 52, -12, 0.12] },
];

const buildShadow = (neutralHue: number, input: BrandInput['shadow'] = {}): ShadowAxis => {
  const softness = input.softness ?? 1;
  const tint = { hue: input.tint?.hue ?? neutralHue, amount: input.tint?.amount ?? 0.15 };
  // Shadow base colour: amount 0 = pure black (the NB dialect); any tint lifts it to a hue-tinted
  // dark (Polaris/Comeau: a tinted near-black reads richer than dead grey). Layers reuse this RGB
  // and vary only alpha — one shadow colour per theme.
  //
  // Both L AND chroma scale with `amount` (#305). The old curve held l at 0.13 and scaled a fixed
  // `c: 0.05 * amount`, which made the lever PERCEPTUALLY INERT: shadow alphas are 10–14%, so a hue
  // shift on a near-black composited over a light surface moved ~1.0–1.5 ΔE00 across the lever's
  // ENTIRE range — under the ~2.3 "just noticeable" bar. The slider looked functional and did
  // nothing visible.
  //
  // Holding L and simply raising chroma cannot fix it: sRGB's chroma ceiling at l 0.13 is only
  // 0.023 (cyan) to 0.066 (blue), i.e. essentially the 0.05 already in use. Chroma capacity is a
  // function of lightness, so L has to rise for the hue to have anywhere to go.
  //
  // The 0.17 coefficient is the SMALLEST lift at which every hue clears the bar, swept at 5°
  // (not sampled at a few hues — doing that is what produced three wrong numbers in the first
  // draft of this comment). Measured at a mid-ramp 12% alpha over white, amount 1.0:
  //   · worst hue is yellow-green (~h70) at 2.88 ΔE00 — over the 2.3 bar, under 3.0
  //   · warm/blue hues reach 3.8–4.6 ΔE00
  //   · lift 0.13 leaves the worst hue at 2.28, i.e. still not reliably visible
  //
  // TWO consequences worth knowing, neither hidden:
  //   1. A tinted shadow reads MORE PRESENT, not just more coloured — ΔE00 against the bare
  //      surface ranges −8%…+59% vs a pure-black shadow across hues at max tint. That is
  //      inherent: a saturated dark differs from white more than black does at the same alpha.
  //      Removing it would mean lowering alpha as tint rises, and alpha is what encodes
  //      elevation, so the cure is worse than the symptom.
  //   2. The default (amount 0.15) is NOT byte-identical to the old curve — it drifts 0.86 ΔE00,
  //      driven by chroma now tracking the gamut ceiling rather than a flat 0.05. That is below
  //      the ~1.0 JND for a large flat field, so it is invisible in use, but committed artifacts
  //      for tinted brands DO change (NB ships amount 0 → pure black → byte-identical).
  //
  // Chroma is a fraction of the in-gamut ceiling at that L (verified in gamut across 72 hues ×
  // 6 amounts), so `amount` means "how far toward as-chromatic-as-this-dark-can-be".
  const tintL = 0.13 + 0.17 * tint.amount;
  const colorRgb = tint.amount === 0
    ? { r: 0, g: 0, b: 0 }
    : oklchToRgb({ l: tintL, c: maxChroma(tintL, tint.hue) * tint.amount, h: tint.hue });
  const layer = (a: number[]): ShadowLayer => ({ offsetX: 0, offsetY: a[0], blur: Math.round(a[1] * softness), spread: a[2], alpha: a[3] });
  // Dark: same geometry, alpha reduced and ramping UP with elevation (lower steps
  // nearly disappear — the surface lift does the work; top steps keep a whisper).
  const darkAlpha = (a: number, i: number): number => Math.round(a * (0.3 + 0.09 * i) * 100) / 100;
  const darkLayer = (a: number[], i: number): ShadowLayer => ({ offsetX: 0, offsetY: a[0], blur: Math.round(a[1] * softness), spread: a[2], alpha: darkAlpha(a[3], i) });
  const steps: ShadowStep[] = SHADOW_BASE.map((s, i) => ({
    name: s.name,
    light: [layer(s.key), layer(s.amb)],
    dark: [darkLayer(s.key, i), darkLayer(s.amb, i)],
  }));
  // Inset (wells, pressed states, inputs) — a single inner shadow, light/dark.
  const inset: ShadowStep = {
    name: 'inset',
    light: [{ offsetX: 0, offsetY: 2, blur: Math.round(4 * softness), spread: 0, alpha: 0.08 }],
    dark: [{ offsetX: 0, offsetY: 2, blur: Math.round(4 * softness), spread: 0, alpha: 0.3 }],
  };
  return { steps, inset, colorRgb, softness, tint };
};

// ---------------------------------------------------------------------------
// Layout axis (breakpoints + responsive grid + containers). Grounded in a
// 10-system survey. Decisions:
//  - 5 breakpoints, t-shirt named, min-width/mobile-first (the convergent shape);
//    ranges are derived (next − 1). The brand authors the floor ARRAY (the real
//    per-brand variable); names are constant.
//  - The 12-col grid is a DESIGN ARTIFACT (Figma layout-grid + mental model), not
//    the load-bearing code contract — modern layout is CSS Grid + container
//    queries. Columns emit as a 4/8/12 ladder (the design convention); base count
//    is one knob (12 default; 16/24 for dense-data brands).
//  - Gutter/margin are NOT independent tokens — they ALIAS the 8px spacing scale
//    (16→24→32 / 16→24→48), keyed to breakpoint index. Reuses the spacing engine.
//  - Containers: FLUID-first + a `container.max` cap (the 2026 default) + a
//    `narrow` reading container (~720). The fluid-vs-fixed duplication Prism2
//    shipped is collapsed; fixed-stepped is an opt-in modifier (deferred).
export type Breakpoint = { name: string; px: number };
export type GridStep = { bp: string; columns: number; gutterPx: number; marginPx: number };
export type LayoutAxis = {
  breakpoints: Breakpoint[];
  grid: GridStep[];
  baseColumns: number;
  containerMax: number;
  containerNarrow: number;
};
// Count-aware names: ≤5 tiers anchor at sm (sm/md/lg/xl/2xl — Tailwind); 6+ prepend
// xs (xs/sm/md/lg/xl/2xl — Bootstrap), so a small-phone tier is labelled correctly.
const bpNames = (n: number): string[] =>
  n <= 5 ? ['sm', 'md', 'lg', 'xl', '2xl'].slice(0, n) : ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'].slice(0, n);
// Shallow gutter/margin ramps (px), anchored to Atlassian/Prism2; margin runs a
// step larger at the top. Sliced/clamped to the breakpoint count.
const GUTTER_PX = [16, 16, 24, 24, 32, 32];
const MARGIN_PX = [16, 24, 24, 32, 48, 48];

const buildLayout = (input: BrandInput['layout'] = {}): LayoutAxis => {
  const floors = input.breakpoints ?? [0, 768, 1024, 1440, 1920];
  const base = input.columns ?? 12;
  const n = floors.length;
  const names = bpNames(n);
  const breakpoints: Breakpoint[] = floors.map((px, i) => ({ name: names[i] ?? `bp${i}`, px }));
  // column ladder: smallest = 4, next = 8, top reaches the base count.
  const cols = (i: number): number => i === 0 ? Math.min(4, base) : i === n - 1 ? base : i === 1 ? Math.min(8, base) : base;
  const grid: GridStep[] = breakpoints.map((b, i) => ({
    bp: b.name, columns: cols(i),
    gutterPx: GUTTER_PX[Math.min(i, GUTTER_PX.length - 1)],
    marginPx: MARGIN_PX[Math.min(i, MARGIN_PX.length - 1)],
  }));
  return { breakpoints, grid, baseColumns: base, containerMax: input.containerMax ?? 1440, containerNarrow: input.containerNarrow ?? 720 };
};

// ---------------------------------------------------------------------------
// Gradient axis (brand-opt-in). Grounded in a 10-system survey + the DTCG
// gradient spec (2025.10) + the Figma round-trip research. Decisions:
//  - OFF by default: most mature systems abstain (Material/Carbon/Atlassian/
//    Primer/USWDS), and gradients are contextual. A brand opts in — `true` ships
//    ONE default brand gradient; an explicit array ships exactly those. NB ships
//    none (it had none). This is NOT a derived-for-everyone axis like colour.
//  - DTCG `gradient` composite is the spine: $value = stops [{color, position}],
//    and stop COLOURS ALIAS the colour ramp (the Fluent/Carbon model; themeable),
//    never raw hex (the deprecated Polaris/SLDS trap).
//  - DTCG omits kind/angle/interpolation (issue #101 — still open); we carry them
//    in $extensions, the way the spec's own proposals would: kind (linear/radial),
//    angle | center+shape, interpolation (OKLCH default).
//  - OKLCH interpolation avoids the sRGB "grey dead zone". Figma interpolates in
//    sRGB ONLY, so we PRE-SAMPLE the OKLCH curve into N baked sRGB stops for the
//    Figma Paint Style (the one renderer that needs them); CSS keeps `in oklch`.
//  - Materializes as a Figma PAINT STYLE (the 4th style class beside effect/text/
//    grid); only stop COLOURS bind to variables — kind/angle/positions are baked.
//  - Worst-case-stop contrast is computed: text over a gradient must clear its
//    ratio at the LOWEST-contrast point, not the average (none of the surveyed
//    systems do this — our contract-checking ethos extended to gradients).
export type GradientStopInput = { palette: string; step: number; position: number };
export type GradientInput = {
  name: string;
  kind?: 'linear' | 'radial';
  angle?: number;                 // linear only — degrees (default 135, a brand diagonal)
  center?: [number, number];      // radial only — 0..1 (default [0.5, 0.5])
  shape?: 'circle' | 'ellipse';   // radial only (default 'ellipse')
  interpolation?: 'oklch' | 'srgb';
  samples?: number;               // sRGB pre-sample count for Figma (default 5)
  stops: GradientStopInput[];
};
export type GradientStop = { aliasOf: string; position: number; rgb: RGB; hex: string; oklch: OKLCH };
export type ResolvedGradient = {
  name: string; kind: 'linear' | 'radial'; angle: number; center: [number, number];
  shape: 'circle' | 'ellipse'; interpolation: 'oklch' | 'srgb';
  stops: GradientStop[];
  sampled: { hex: string; position: number }[];  // baked sRGB approximation (Figma)
  worstOnWhite: number; worstOnBlack: number;     // lowest contrast of any sampled stop
};
export type GradientAxis = { gradients: ResolvedGradient[] };

const DEFAULT_BRAND_GRADIENT = (brandPalette: string): GradientInput => ({
  name: 'brand', kind: 'linear', angle: 135,
  stops: [{ palette: brandPalette, step: 600, position: 0 }, { palette: brandPalette, step: 350, position: 1 }],
});
// Shortest-arc hue interpolation (degrees) — the perceptually correct path.
const lerpHue = (h1: number, h2: number, t: number): number => {
  const dh = (((h2 - h1) % 360) + 540) % 360 - 180;
  return (h1 + t * dh + 360) % 360;
};
const lerpOklch = (a: OKLCH, b: OKLCH, t: number): OKLCH => ({ l: a.l + (b.l - a.l) * t, c: a.c + (b.c - a.c) * t, h: lerpHue(a.h, b.h, t) });
const lerpRgb = (a: RGB, b: RGB, t: number): RGB => ({ r: Math.round(a.r + (b.r - a.r) * t), g: Math.round(a.g + (b.g - a.g) * t), b: Math.round(a.b + (b.b - a.b) * t) });

const buildGradient = (spec: BrandInput['gradients'], palettes: PaletteBuild[], root: string): GradientAxis => {
  if (!spec) return { gradients: [] };
  const inputs: GradientInput[] = spec === true ? [DEFAULT_BRAND_GRADIENT('primary')] : spec;
  // L-06: a gradient name becomes a token path segment (`<root>.gradient.<name>`), so it
  // needs the same slug charset palette names enforce (CR-03) — a dotted/spaced name would
  // break the `{a.b.c}` alias convention, caught only at emit if at all. Names live in the
  // gradient namespace (not the palette one), so RESERVED_PALETTES doesn't apply, but they
  // must be a valid slug and unique among gradients.
  const seenGradNames = new Set<string>();
  for (const g of inputs) {
    if (!PALETTE_NAME_RE.test(g.name))
      throw new Error(`gradient name '${g.name}' must be a single lowercase slug (letters/digits/hyphen, start with a letter — no dots, spaces, or symbols)`);
    if (seenGradNames.has(g.name))
      throw new Error(`duplicate gradient name '${g.name}' — gradient names must be unique`);
    seenGradNames.add(g.name);
  }
  const stepOf = (palette: string, step: number): Step => {
    const p = palettes.find((pp) => pp.palette === palette);
    if (!p) throw new Error(`gradient: palette '${palette}' is not defined (have: ${palettes.map((x) => x.palette).join(', ')})`);
    const s = p.steps.find((st) => st.num === step);
    if (!s) throw new Error(`gradient: '${palette}.${step}' is not a valid ramp step`);
    return s;
  };
  const gradients: ResolvedGradient[] = inputs.map((g) => {
    const kind = g.kind ?? 'linear';
    const interpolation = g.interpolation ?? 'oklch';
    const samples = Math.max(2, g.samples ?? 5);
    const stops: GradientStop[] = g.stops
      .slice().sort((a, b) => a.position - b.position)
      .map((st) => {
        const s = stepOf(st.palette, st.step);
        return { aliasOf: `${root}.palette.${st.palette}.${s.key}`, position: st.position, rgb: s.rgb, hex: s.hex, oklch: s.oklch };
      });
    // Pre-sample the curve at N evenly-spaced positions (the chosen interpolation
    // space), output sRGB — the baked stops Figma needs (it can't interpolate OKLCH).
    const sampleRgb = (p: number): RGB => {
      if (p <= stops[0].position) return stops[0].rgb;
      if (p >= stops[stops.length - 1].position) return stops[stops.length - 1].rgb;
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i], b = stops[i + 1];
        if (p >= a.position && p <= b.position) {
          const t = (p - a.position) / (b.position - a.position || 1);
          return interpolation === 'oklch' ? oklchToRgb(lerpOklch(a.oklch, b.oklch, t)) : lerpRgb(a.rgb, b.rgb, t);
        }
      }
      return stops[stops.length - 1].rgb;
    };
    const sampledRgb = Array.from({ length: samples }, (_, i) => sampleRgb(i / (samples - 1)));
    const sampled = sampledRgb.map((rgb, i) => ({ hex: rgbHex(rgb), position: Math.round((i / (samples - 1)) * 1000) / 1000 }));
    const WHITE: RGB = { r: 255, g: 255, b: 255 }, BLACK: RGB = { r: 0, g: 0, b: 0 };
    const worstOnWhite = Math.min(...sampledRgb.map((c) => contrast(c, WHITE)));
    const worstOnBlack = Math.min(...sampledRgb.map((c) => contrast(c, BLACK)));
    return {
      name: g.name, kind, angle: g.angle ?? 135, center: g.center ?? [0.5, 0.5],
      shape: g.shape ?? 'ellipse', interpolation, stops, sampled, worstOnWhite, worstOnBlack,
    };
  });
  return { gradients };
};

/** Per-mode NO-DIFF suppression, shared by the JSON-comparable lever axes (radius / families /
 *  weight-roles / line-heights / letter-spacings): assign `cand` to `map[mode]` ONLY when it differs
 *  from the global baseline, so a mode re-declaring the global value stays byte-identical. Returns
 *  whether it was assigned (the weight axis keys its `extraWeights` union off that). Density / tempo
 *  use a plain enum equality and shadow an appearance-gated compare, so they don't route through here. */
const diffAssign = <T>(map: Record<string, T>, mode: string, cand: T, baseJson: string): boolean => {
  if (JSON.stringify(cand) === baseJson) return false;
  map[mode] = cand;
  return true;
};

export const brandTheme = (input: BrandInput): Theme => {
  const notes: string[] = [];
  const root = input.root ?? 'prism';
  // Single lowercase segment — enforce the "no two-segment namespaces" contract here
  // too (not only in the schema), since brandTheme is also called with in-memory
  // BrandInput that never touched schema validation (the web app builds it directly).
  if (!/^[a-z][a-z0-9-]*$/.test(root)) {
    throw new Error(`root namespace '${root}' must be a single lowercase segment (letters/digits/hyphen, no dots or spaces)`);
  }
  // Appearance modes — light is the required base; dark/HC are opt-in. Validate here too
  // (in-memory BrandInput skips schema validation).
  const modes = input.modes ?? ALL_MODES;
  const badMode = modes.find((m) => !VALID_MODES.includes(m));
  if (badMode) throw new Error(`unknown mode '${badMode}' (valid: ${VALID_MODES.join(', ')})`);
  if (!modes.includes('light')) throw new Error('modes must include "light" (the required base mode)');
  // Note only the default (light/dark/HC) opt-out; wireframe is an opt-IN addition, noted separately.
  const stdModes = modes.filter((m) => m !== 'wireframe');
  if (stdModes.length < ALL_MODES.length) notes.push(`modes: generating ${stdModes.join(', ')} only (dark/HC opt-out)`);
  if (modes.includes('wireframe')) notes.push('modes: wireframe generated (grayscale — non-neutral roles → equivalent neutral; radius → 0)');
  // User-added custom modes (Phase C1) — each `{ name, base }` LIVE-INHERITS a customizable
  // built-in (`base` = light/dark only): it re-derives exactly like its base each build (a cloned
  // descriptor, same kind/family/mins, new name), then its own overrides/modeAnchors deviate it.
  // Names must be slug-safe, non-reserved (not a built-in), and unique; the base must be light/dark
  // AND a mode this brand generates. Validated here (in-memory BrandInput skips schema validation).
  const CUSTOM_MODE_RE = /^[a-z0-9][a-z0-9-]*$/;
  const customModes = input.customModes ?? [];
  const customNames: string[] = [];
  for (const cm of customModes) {
    if (!CUSTOM_MODE_RE.test(cm.name))
      throw new Error(`customModes: name '${cm.name}' must be a slug (lowercase letters/digits/hyphen, start with a letter or digit — no spaces, dots, or symbols)`);
    if (VALID_MODES.includes(cm.name))
      throw new Error(`customModes: name '${cm.name}' is a reserved built-in mode — custom mode names must be distinct`);
    if (customNames.includes(cm.name))
      throw new Error(`customModes: duplicate custom mode name '${cm.name}' — custom mode names must be unique`);
    if (cm.base !== 'light' && cm.base !== 'dark')
      throw new Error(`customModes: '${cm.name}' base '${cm.base}' must be a CUSTOMIZABLE built-in (light or dark) — hc/wireframe cannot be a custom-mode base`);
    if (!modes.includes(cm.base))
      throw new Error(`customModes: '${cm.name}' base '${cm.base}' is not in this brand's generated modes (${modes.join(', ')})`);
    customNames.push(cm.name);
  }
  // The full mode list: built-ins first, customs appended (canonical order). A fresh array so the
  // shared ALL_MODES constant is never mutated when `input.modes` was omitted.
  const modesAll: ModeName[] = customNames.length ? [...modes, ...customNames] : modes;
  if (customModes.length) notes.push(`customModes: ${customModes.map((cm) => `${cm.name} (live-inherits ${cm.base})`).join(', ')} — each re-derives like its base every build; customizable via overrides/modeAnchors`);
  // Per-mode colour overrides (Phase A1) — customizable modes only. A mode this brand doesn't
  // generate can't carry overrides; the generate-only built-ins (hc-light/hc-dark/wireframe) are
  // baseline-only (a later phase makes HC/wireframe customizable). Malformed palette/step refs
  // are caught at resolve time (modes.ts) since they need the built ramps. `light`/`dark` and any
  // declared custom mode (C1 — a custom mode IS customizable) accept overrides.
  const CUSTOMIZABLE_MODES: ModeName[] = ['light', 'dark', ...customNames];
  for (const m of Object.keys(input.overrides ?? {}) as ModeName[]) {
    if (!modesAll.includes(m))
      throw new Error(`overrides: mode '${m}' is not in this brand's modes (${modesAll.join(', ')}) — nothing to override`);
    if (!CUSTOMIZABLE_MODES.includes(m))
      throw new Error(`overrides: mode '${m}' is generate-only and not customizable — only ${CUSTOMIZABLE_MODES.join('/')} accept overrides`);
  }
  if (Object.keys(input.overrides ?? {}).length) notes.push(`overrides: per-mode color overrides applied for ${Object.keys(input.overrides!).join(', ')} (roles repointed to specific primitive steps; tuned picks that miss a contrast min are warned, not blocked)`);
  // Per-mode interactive anchors (A2b) — same customizable-mode rule as overrides. An anchor
  // re-derives the whole interactive column for that mode (still floor-gated via `chromatic`).
  for (const m of Object.keys(input.modeAnchors ?? {}) as ModeName[]) {
    if (!modesAll.includes(m))
      throw new Error(`modeAnchors: mode '${m}' is not in this brand's modes (${modesAll.join(', ')})`);
    if (!CUSTOMIZABLE_MODES.includes(m))
      throw new Error(`modeAnchors: mode '${m}' is generate-only and not customizable — only ${CUSTOMIZABLE_MODES.join('/')} accept per-mode anchors`);
  }
  if (Object.keys(input.modeAnchors ?? {}).length) notes.push(`modeAnchors: per-mode interactive anchors for ${Object.keys(input.modeAnchors!).join(', ')} (a column's fill re-anchored per mode; still floor-gated)`);
  // Per-mode LEVER overrides (Phase D) — a customizable mode may override a non-colour axis lever
  // (radius now; tempo/density later slot in here — NOT typeScale, see ModeLevers). SAME customizable-mode rule as
  // overrides/modeAnchors: the mode must be generated AND customizable (light/dark/custom); the
  // generate-only built-ins (hc-light/hc-dark/wireframe) and absent modes throw. A `radius` lever
  // must be a finite number in the lever's [0, 2] range.
  for (const m of Object.keys(input.modeLevers ?? {}) as ModeName[]) {
    if (!modesAll.includes(m))
      throw new Error(`modeLevers: mode '${m}' is not in this brand's modes (${modesAll.join(', ')})`);
    if (!CUSTOMIZABLE_MODES.includes(m))
      throw new Error(`modeLevers: mode '${m}' is generate-only and not customizable — only ${CUSTOMIZABLE_MODES.join('/')} accept per-mode levers`);
    // `light` is the GLOBAL baseline for the non-colour levers — its values ARE the global radius/density/
    // tempo/shadow/typography levers. A `modeLevers.light` entry would emit a `modes.light` override that
    // shadows the canonical `$value` (which stays the global), so the two disagree. Reject it: set the
    // global levers directly. (Distinct from `overrides`/`modeAnchors`, where light is a real colour mode.)
    if (m === 'light')
      throw new Error(`modeLevers: 'light' is the global baseline for the non-color levers — set the global radius/density/tempo/shadow/typography levers directly, not modeLevers.light`);
    const lev = input.modeLevers![m]!;
    if (lev.radius !== undefined && (!Number.isFinite(lev.radius) || lev.radius < 0 || lev.radius > 2))
      throw new Error(`modeLevers: mode '${m}' radius ${lev.radius} is out of range — must be a finite number in [0, 2]`);
    // Per-mode weight values must be a valid font-weight (finite, [100, 900]). Role ordering is NOT
    // enforced here (the UI owns that) — the engine accepts any valid weight per role.
    for (const [role, w] of Object.entries(lev.weights ?? {})) {
      if (w !== undefined && (!Number.isFinite(w) || w < 100 || w > 900))
        throw new Error(`modeLevers: mode '${m}' weight '${role}' ${w} is out of range — must be a finite number in [100, 900]`);
    }
    // #296 — per-mode leading/tracking name a RUNG on both sides (source key → target key). Both must
    // be real rungs; a NUMBER here is the old pre-#296 shape and is rejected with a pointer, because
    // silently coercing it would reintroduce exactly the mode-varying-primitive bug this replaced.
    const rungCheck = (obj: Record<string, unknown> | undefined, keys: readonly string[], label: string, brandField: string): void => {
      for (const [k, v] of Object.entries(obj ?? {})) {
        if (v === undefined) continue;
        if (typeof v === 'number')
          throw new Error(`modeLevers: mode '${m}' ${label} '${k}' is ${v} — per-mode ${label} names a TARGET RUNG (one of ${keys.join('/')}), not a value. To change what a rung is worth, set typography.${brandField} (brand-wide; rungs are mode-invariant primitives, #296).`);
        if (!keys.includes(String(v)))
          throw new Error(`modeLevers: mode '${m}' ${label} '${k}' → '${v}' is not a rung — must be one of ${keys.join('/')}`);
        if (!keys.includes(k))
          throw new Error(`modeLevers: mode '${m}' ${label} source '${k}' is not a rung — must be one of ${keys.join('/')}`);
      }
    };
    rungCheck(lev.lineHeights as Record<string, unknown> | undefined, LINE_HEIGHT_KEYS, 'lineHeight', 'lineHeights');
    rungCheck(lev.letterSpacings as Record<string, unknown> | undefined, LETTER_SPACING_KEYS, 'letterSpacing', 'letterSpacings');
    // Per-mode tempo must be one of the three tempo enums (the same set as the global lever).
    if (lev.tempo !== undefined && !['snappy', 'standard', 'relaxed'].includes(lev.tempo))
      throw new Error(`modeLevers: mode '${m}' tempo '${lev.tempo}' is invalid — must be one of snappy/standard/relaxed`);
    // Per-mode shadow must stay in the global lever's ranges — softness [0, 2], tint hue [0, 360],
    // tint amount [0, 1] (same bounds as the shadow lever + the shadow-tint object lever).
    if (lev.shadow?.softness !== undefined && (!Number.isFinite(lev.shadow.softness) || lev.shadow.softness < 0 || lev.shadow.softness > 2))
      throw new Error(`modeLevers: mode '${m}' shadow softness ${lev.shadow.softness} is out of range — must be a finite number in [0, 2]`);
    if (lev.shadow?.tint?.hue !== undefined && (!Number.isFinite(lev.shadow.tint.hue) || lev.shadow.tint.hue < 0 || lev.shadow.tint.hue > 360))
      throw new Error(`modeLevers: mode '${m}' shadow tint hue ${lev.shadow.tint.hue} is out of range — must be a finite number in [0, 360]`);
    if (lev.shadow?.tint?.amount !== undefined && (!Number.isFinite(lev.shadow.tint.amount) || lev.shadow.tint.amount < 0 || lev.shadow.tint.amount > 1))
      throw new Error(`modeLevers: mode '${m}' shadow tint amount ${lev.shadow.tint.amount} is out of range — must be a finite number in [0, 1]`);
    // Per-mode density must be one of the three density tiers (the same set as the global lever).
    if (lev.density !== undefined && !['comfortable', 'compact', 'spacious'].includes(lev.density))
      throw new Error(`modeLevers: mode '${m}' density '${lev.density}' is invalid — must be one of comfortable/compact/spacious`);
  }
  const leverModes = Object.entries(input.modeLevers ?? {}).filter(([, l]) => l && (l.radius !== undefined || l.families || l.weights || l.lineHeights || l.letterSpacings || l.tempo || l.shadow || l.density)).map(([m]) => m);
  if (leverModes.length) notes.push(`modeLevers: per-mode lever overrides for ${leverModes.join(', ')} (radius / font family / font weight / line-height / letter-spacing / motion tempo / shadow / density re-derived per mode via the same helpers as the baseline; a mode deviates the global lever, the composite/token set is untouched)`);
  if (root !== 'prism') notes.push(`namespace: tokens emit under '${root}.*' (custom, not the 'prism' default)`);
  const anchorStep = autoPlaceStep(input.primary.l);
  notes.push(`primary anchor (h${input.primary.h}) pinned exactly at step ${anchorStep}`);

  // M-03: a pinned anchor whose chroma is out of sRGB gamut can't be rendered exactly — the
  // engine clamps toward the boundary, which silently nudges lightness AND hue (independent-
  // channel clip). Surface it in the decisions log so the shift isn't invisible (the designer
  // can lower the chroma). Rendering is unchanged here; a constant-hue chroma projection is the
  // available upgrade (needs an all-emitter regen incl. emit-figma — see docs/00).
  const gamutNote = (name: string, o: { l: number; c: number; h: number }) => {
    if (inGamut(o)) return;
    const mc = Math.round(maxChroma(o.l, o.h, o.c) * 1000) / 1000;
    notes.push(`anchor '${name}' (L${o.l} C${o.c} h${o.h}) is OUT of sRGB gamut — max renderable chroma at this L/hue is ~${mc}; it ships clamped toward the boundary, so its lightness and hue may drift. Lower its chroma to ~${mc} for an exact match.`);
  };
  gamutNote('primary', input.primary);
  for (const bc of input.brandColors ?? []) gamutNote(bc.name, bc.oklch);
  if (input.neutral.anchor) gamutNote('neutral', input.neutral.anchor);

  // Neutral ramp: pinned around a pre-defined grey when `neutral.anchor` is set (built
  // from the anchor's hue/chroma, pinned verbatim at its lightness step — same mechanism
  // as the brand palettes), else derived from hue + peak chroma.
  const nAnchor = input.neutral.anchor;
  // `auto` derives the neutral hue from the brand primary at build time (a cohesive cast that
  // re-tracks on recolour) rather than a frozen stored hue; a pinned anchor still wins over it.
  const nHue = input.neutral.auto ? input.primary.h : input.neutral.hue;
  const neutralSteps = nAnchor
    ? generateRamp({ hue: nAnchor.h, chroma: nAnchor.c, anchor: { oklch: nAnchor, stepNum: autoPlaceStep(nAnchor.l) } })
    : generateRamp({ hue: nHue, chroma: input.neutral.chroma });
  if (nAnchor) notes.push(`neutral pinned around a pre-defined gray (L${nAnchor.l}) at step ${autoPlaceStep(nAnchor.l)} — ramp built from the anchor, not the hue/chroma cast`);
  else if (input.neutral.auto) notes.push(`neutral hue auto-follows the brand primary (H${Math.round(input.primary.h)}) — recoloring the brand re-tracks the cast`);

  const palettes: PaletteBuild[] = [
    { palette: 'primary', role: 'brand', description: 'Brand primary', steps: generateRamp({ hue: input.primary.h, chroma: input.primary.c, anchor: { oklch: input.primary, stepNum: anchorStep } }) },
    { palette: 'neutral', role: 'neutral', description: 'Neutral', steps: neutralSteps },
  ];

  // Additional brand colours (secondary / tertiary / accents) — arbitrary count.
  // Validate names first (CR-03): reject reserved collisions, bad charset, and duplicates —
  // all of which would otherwise silently corrupt the palette map with green gates.
  const seenNames = new Set<string>();
  for (const bc of input.brandColors ?? []) {
    if (!PALETTE_NAME_RE.test(bc.name))
      throw new Error(`brand color name '${bc.name}' must be a single lowercase slug (letters/digits/hyphen, start with a letter — no dots, spaces, or symbols)`);
    if (RESERVED_PALETTES.has(bc.name))
      throw new Error(`brand color name '${bc.name}' is reserved (an engine-generated palette) — it would overwrite that ramp; pick a distinct name`);
    if (seenNames.has(bc.name))
      throw new Error(`duplicate brand color name '${bc.name}' — brand color names must be unique`);
    seenNames.add(bc.name);
  }
  for (const bc of input.brandColors ?? []) {
    palettes.push({ palette: bc.name, role: 'brand', description: `Brand ${bc.name}`, steps: generateRamp({ hue: bc.oklch.h, chroma: bc.oklch.c, anchor: { oklch: bc.oklch, stepNum: autoPlaceStep(bc.oklch.l) } }) });
    notes.push(`brand color '${bc.name}' (h${bc.oklch.h}) added`);
  }

  const status = (k: 'success' | 'warning' | 'info') => {
    const supplied = input.status?.[k];
    const s = supplied ? input.status![k]! : STATUS_DEFAULTS[k];
    // L-07: a brand-supplied status override seeds a fresh VIVID, UNANCHORED ramp from its
    // hue + chroma cast (placed at peak-chroma L) — it is NOT pinned verbatim at its own
    // lightness step the way a brandColors accent is. This is by design (a status role needs
    // a full accessible ramp, not one measured swatch), but it means a measured status colour
    // won't round-trip exactly, so say so rather than imply the swatch is reproduced.
    notes.push(supplied
      ? `${k}: brand-supplied hue ${s.h} — seeds a vivid ramp from its hue+chroma (not pinned at its measured lightness; the exact swatch may not appear verbatim)`
      : `${k}: engine default hue ${s.h}`);
    return { palette: k, role: k as Role, description: `${k} status`, steps: statusRamp(s.h, s.chroma) };
  };
  palettes.push(status('success'), status('warning'), status('info'));

  // ---- action role (decoupled from brand) ----
  const actionPalette = input.actionPalette ?? 'primary';
  if (!palettes.some((p) => p.palette === actionPalette)) {
    throw new Error(`actionPalette '${actionPalette}' is not a defined palette (have: ${palettes.map((p) => p.palette).join(', ')})`);
  }
  notes.push(actionPalette === 'primary'
    ? `action color defaults to the PRIMARY brand palette — CONFIRM this hue is the intended interactive color for this brand`
    : `action color is decoupled: uses palette '${actionPalette}', NOT the primary brand palette — explicit brand decision`);

  // ---- danger carve ----
  const roleToPalette: Record<Role, string> = {
    brand: 'primary', neutral: 'neutral', success: 'success', warning: 'warning', danger: 'danger', info: 'info', action: actionPalette,
  };
  if (input.roleColors?.danger) {
    // Explicit rebasing (docs/21) wins over the carve heuristic — the general roleColors
    // pass below sets roleToPalette.danger; skip the carve/synth so no orphan danger ramp is minted.
  } else if (input.status?.danger) {
    palettes.push({ palette: 'danger', role: 'danger', description: 'danger status (brand-supplied)', steps: statusRamp(input.status.danger.h, input.status.danger.chroma) });
    notes.push(`danger: brand-supplied hue ${input.status.danger.h}`);
  } else if (inRedTerritory(input.primary.h, input.primary.c)) {
    // The brand's own colour IS a saturated red — seed danger FROM the primary ramp rather than
    // synthesising a near-duplicate red. But mint it as its own `danger` palette (a deep copy of
    // primary's steps), NOT a pointer at `primary`: keeping a stable `palette.danger.*` namespace
    // means the semantic danger tokens always alias `{…danger.<step>}`, so switching danger to a
    // distinct colour later re-seeds ONE ramp instead of re-aliasing every danger consumer. The
    // redundancy (danger ≈ primary while shared) is the deliberate price for that stable contract,
    // and it makes the red case consistent with the carve case (which already mints `danger`).
    const primarySteps = palettes.find((p) => p.palette === 'primary')!.steps;
    palettes.push({ palette: 'danger', role: 'danger', description: 'danger status (seeded from the red brand primary — its own ramp so danger stays re-pointable)', steps: primarySteps.map((s) => ({ ...s, oklch: { ...s.oklch }, rgb: { ...s.rgb } })) });
    notes.push(`danger: primary hue ${input.primary.h} (chroma ${input.primary.c}) is a saturated red → danger seeds from the primary ramp, minted as its own palette (semantic tokens alias palette.danger.*, so danger stays independently re-pointable)`);
  } else {
    // Primary is not a saturated red, so carve a dedicated danger red the brand never gave us.
    const d = STATUS_DEFAULTS.danger;
    palettes.push({ palette: 'danger', role: 'danger', description: 'danger status (engine-carved red — primary is not red)', steps: statusRamp(d.h, d.chroma) });
    // Distinguish the two carve reasons (M-05): a red-ish-but-greige primary must NOT be reused
    // for danger (a near-grey can't signal destruction), even though its hue is in the window.
    const hueIsRed = hueDist(input.primary.h, STATUS_DEFAULTS.danger.h) <= 20;
    notes.push(hueIsRed
      ? `danger: primary hue ${input.primary.h} is red-ish but its chroma ${input.primary.c} is below the ${RED_CHROMA_FLOOR} floor to read as danger → carved a dedicated saturated red at hue ${d.h} (a near-gray warm primary can't signal destructive actions)`
      : `danger: primary hue ${input.primary.h} is NOT red → carved a dedicated danger red at hue ${d.h}`);
  }
  // Knife-edge note (M-05): flag when the primary hue sits within 3° of the ±20° red boundary —
  // a small hue shift would flip danger between reuse-primary and carve-red.
  if (Math.abs(hueDist(input.primary.h, STATUS_DEFAULTS.danger.h) - 20) <= 3 && input.primary.c >= RED_CHROMA_FLOOR)
    notes.push(`danger: primary hue ${input.primary.h} is near the red-territory boundary (±20° of ${STATUS_DEFAULTS.danger.h}) — a small hue shift would flip the danger strategy`);

  // ---- roleColors: general semantic-role rebasing (docs/21) ----
  // Re-base any rebasable role on a declared palette (the general form of actionPalette).
  // Applied AFTER the action default + danger carve, so an explicit override always wins.
  // Contrast re-gates on the target ramp; a hue mismatch (a danger that isn't red, an info
  // that isn't blue) is ALLOWED but flagged so the signal loss is visible, not silent.
  const CANONICAL_HUE: Partial<Record<Role, number>> = {
    danger: STATUS_DEFAULTS.danger.h, success: STATUS_DEFAULTS.success.h, warning: STATUS_DEFAULTS.warning.h, info: STATUS_DEFAULTS.info.h,
  };
  const paletteHue = (pal: string): number | null => {
    if (pal === 'primary') return input.primary.h;
    const bc = input.brandColors?.find((b) => b.name === pal);
    if (bc) return bc.oklch.h;
    if (pal === 'danger' || pal === 'success' || pal === 'warning' || pal === 'info') return STATUS_DEFAULTS[pal].h;
    return null; // neutral / achromatic — no meaningful signal hue
  };
  for (const [r, pal] of Object.entries(input.roleColors ?? {}) as [Role, string][]) {
    if (r === 'brand' || r === 'neutral')
      throw new Error(`roleColors: '${r}' defines the surface model and cannot be rebased`);
    if (!palettes.some((p) => p.palette === pal))
      throw new Error(`roleColors.${r} → '${pal}' is not a defined palette (have: ${palettes.map((p) => p.palette).join(', ')})`);
    roleToPalette[r] = pal;
    notes.push(`roleColors: ${r} re-based on palette '${pal}' — the ${r} family regenerates on that ramp, re-gated (explicit brand decision)`);
    const want = CANONICAL_HUE[r], got = paletteHue(pal);
    if (want !== undefined && got !== null && hueDist(got, want) > 40)
      notes.push(`roleColors: ${r} → '${pal}' hue ${Math.round(got)}° is far from the canonical ${r} hue ${want}° (Δ${Math.round(hueDist(got, want))}°) — CONFIRM the ${r} signal still reads; contrast holds but the color may mislead`);
  }

  // ---- interactive palettes (docs/20 §3): N opt-in `interactive.<name>.*` columns ----
  // Generalises the single `accentPalette` lever into an array of promoted palettes. Each entry
  // becomes a full interactive column (fill+states / on-fill / text / border / on-inverse / overlay,
  // generated in modes.ts). Resolved here so the prune below keeps any palette a column points at.
  const RESERVED_INTERACTIVE = new Set(['primary', 'neutral', 'destructive']);
  // Rest-fill anchor for a palette: 'primary' → the primary anchor; a brandColor → its pinned
  // lightness; an unanchored palette (neutral / status) → the 500 mid pivot (matches the accent path).
  const interactiveStepFor = (pal: string): number => {
    if (pal === 'primary') return anchorStep;
    const bc = (input.brandColors ?? []).find((b) => b.name === pal);
    return bc ? autoPlaceStep(bc.oklch.l) : 500;
  };
  const interactivePalettes: InteractivePalette[] = (() => {
    let entries: { name?: string; palette: string; anchorStep?: number }[];
    if (input.interactivePalettes !== undefined) {
      if (input.accentPalette !== undefined)
        notes.push(`interactivePalettes is set → the legacy accentPalette '${input.accentPalette}' is IGNORED (interactivePalettes wins)`);
      entries = input.interactivePalettes;
    } else if (input.accentPalette !== undefined) {
      // Back-compat: a bare accentPalette is exactly one 'accent' interactive column (docs/20 §3),
      // preserving the accent≠action guard so it never ships two identical-looking columns. No
      // anchorStep → `interactiveStepFor` computes it, reproducing the legacy accent placement.
      if (input.accentPalette === actionPalette)
        throw new Error(`accentPalette '${input.accentPalette}' must differ from the action palette (docs/20 §3 — never ship two identical interactive columns)`);
      entries = [{ name: 'accent', palette: input.accentPalette }];
    } else {
      return [];
    }
    const seen = new Set<string>();
    const resolved: InteractivePalette[] = [];
    for (const e of entries) {
      const name = e.name ?? e.palette;
      if (!PALETTE_NAME_RE.test(name))
        throw new Error(`interactivePalettes: name '${name}' must be a single lowercase slug (letters/digits/hyphen, start with a letter) — it becomes the interactive.<name>.* role suffix`);
      if (RESERVED_INTERACTIVE.has(name))
        throw new Error(`interactivePalettes: name '${name}' collides with a built-in interactive column (primary/neutral/destructive) — pick a distinct name`);
      if (seen.has(name))
        throw new Error(`interactivePalettes: duplicate column name '${name}' — interactive column names must be unique`);
      if (!palettes.some((p) => p.palette === e.palette))
        throw new Error(`interactivePalettes: palette '${e.palette}' (column '${name}') is not a defined palette (have: ${palettes.map((p) => p.palette).join(', ')})`);
      seen.add(name);
      const anchor = e.anchorStep ?? interactiveStepFor(e.palette);
      resolved.push({ name, palette: e.palette, anchorStep: anchor });
      notes.push(`interactive column '${name}' → palette '${e.palette}' (fill step ${anchor}) → a full interactive.${name}.* column`);
    }
    return resolved;
  })();

  // Prune orphaned status ramps: success/warning/info are minted unconditionally above, but if
  // roleColors rebased that role onto another ramp, the synthesized status ramp is now used by no
  // role and would ship as a dead ramp. Drop it — symmetric with the danger carve, which already
  // skips minting when danger is rebased. (danger is not minted-then-pruned; it never mints when
  // rebased.) Keyed off the FINAL roleToPalette + interactive columns, so a status ramp survives
  // whenever anything still points at it (e.g. actionPalette/an interactive column aimed at a status).
  const usedPalettes = new Set<string>([...Object.values(roleToPalette), ...interactivePalettes.map((p) => p.palette)]);
  for (let i = palettes.length - 1; i >= 0; i--) {
    const p = palettes[i];
    if ((p.palette === 'success' || p.palette === 'warning' || p.palette === 'info') && !usedPalettes.has(p.palette)) {
      notes.push(`${p.palette}: rebased via roleColors → the synthesized ${p.palette} ramp is dropped (no role uses it)`);
      palettes.splice(i, 1);
    }
  }

  const baseUnit = input.baseUnit ?? 4;
  const spaceBase = input.spaceBase ?? 8;
  const density = input.density ?? 'comfortable';
  const rScale = input.radiusScale ?? 1;
  const baseMd = input.baseMd ?? 4;
  // Per-mode radius levers (Phase D): a customizable mode overriding `radius` re-derives its radius
  // ramp via the SAME radiusScale(value, baseMd, 128) buildDims uses (same baseMd). Only a mode whose
  // re-derived ramp DIFFERS from the global baseline gets an entry (no-diff suppression — mirrors the
  // tempo lever below); an override that equals the global scale stays byte-identical.
  const modeLevers = input.modeLevers ?? {};
  const radiusByMode: Record<string, RadiusStep[]> = {};
  const baseRadiusJson = JSON.stringify(radiusScale(rScale, baseMd, 128));   // == dims.radius, the baseline every mode inherits
  for (const [m, lev] of Object.entries(modeLevers)) {
    if (lev?.radius !== undefined) diffAssign(radiusByMode, m, radiusScale(lev.radius, baseMd, 128), baseRadiusJson);
  }
  // Per-mode DENSITY levers (Phase D): a customizable mode overriding `density` re-derives its component
  // -size tier via the SAME componentSizes(density, spaceBase) buildDims uses. Only a mode whose density
  // DIFFERS from the baseline gets an entry (no-diff suppression) → byte-identical when unused.
  const sizesByMode: Record<string, SizeStep[]> = {};
  for (const [m, lev] of Object.entries(modeLevers)) {
    if (lev?.density && lev.density !== density) sizesByMode[m] = componentSizes(lev.density, spaceBase);
  }
  notes.push(`dimension axis: ${baseUnit}px grid, ${spaceBase}px space rhythm, density '${density}' (drives component sizes), radius scale ${rScale} (baseMd ${baseMd}px)`);
  notes.push(`motion: tempo '${input.motionPersonality?.tempo ?? 'standard'}' scales the duration ramp; easing roles + springs + composite transitions generated; reduce-motion variants derived (informational preserved, vestibular → 0)`);
  // Per-mode MOTION TEMPO (Phase D): a customizable mode overriding `tempo` re-derives its duration ramp
  // (+ reduce-motion + stagger) via the SAME buildMotion the baseline uses, just at the mode's tempo.
  // Only a mode whose tempo DIFFERS from the baseline gets an entry (no-diff suppression) → byte-identical
  // when unused. Easing/spring/transitions are tempo-invariant, so they're not re-emitted.
  const motion = buildMotion(input.motionPersonality);
  const baseTempo = input.motionPersonality?.tempo ?? 'standard';
  const motionByMode: NonNullable<MotionAxis['motionByMode']> = {};
  for (const [m, lev] of Object.entries(modeLevers)) {
    if (lev?.tempo && lev.tempo !== baseTempo) {
      const mm = buildMotion({ ...input.motionPersonality, tempo: lev.tempo });
      motionByMode[m] = { tempo: mm.tempo, duration: mm.duration, durationReduced: mm.durationReduced, stagger: mm.stagger };
    }
  }
  if (Object.keys(motionByMode).length) motion.motionByMode = motionByMode;
  const shadow = buildShadow(input.neutral.hue, input.shadow);
  notes.push(`shadow: 6-step ramp (xs–2xl) + inset, 2-layer (key+ambient), softness ${shadow.softness}; tinted base (hue ${shadow.tint.hue}, amount ${shadow.tint.amount}${shadow.tint.amount === 0 ? ' = pure black' : ''}). Mode-aware, LIFT-primary: full shadow in light; reduced (faded, top-weighted) in dark — the surface ladder carries dark elevation. Composite shadow → Figma Effect Style.`);
  // Per-mode SHADOW (Phase D): a customizable mode overriding `shadow` re-derives its ramp via the SAME
  // buildShadow the baseline uses, at the mode's (softness/tint merged over the global). The APPEARANCE
  // decides the layer-set — a dark or dark-based custom mode gets the reduced dark layers; light/light-
  // based the full ones — so the alpha reduction composes for free. Each entry carries the mode's own
  // tinted colorRgb (a tint override changes the shadow colour). Only overriding modes get an entry.
  const shadowAppearance: Record<string, 'light' | 'dark'> = { light: 'light', dark: 'dark' };
  for (const cm of customModes) shadowAppearance[cm.name] = cm.base === 'dark' ? 'dark' : 'light';   // custom mode's appearance = its base (validated to light/dark)
  const shadowByMode: NonNullable<ShadowAxis['shadowByMode']> = {};
  const baseShadowJson = JSON.stringify(shadow);   // global ramp (pre-shadowByMode); a light mode with no entry inherits its light layers via shadow/*
  for (const [mo, lev] of Object.entries(modeLevers)) {
    if (!lev?.shadow) continue;
    const app = shadowAppearance[mo] ?? 'light';
    const sm = buildShadow(input.neutral.hue, {
      softness: lev.shadow.softness ?? input.shadow?.softness,
      tint: { hue: lev.shadow.tint?.hue ?? input.shadow?.tint?.hue, amount: lev.shadow.tint?.amount ?? input.shadow?.tint?.amount },
    });
    // No-diff suppression: a LIGHT-appearance mode whose re-derived ramp equals the global inherits the
    // canonical `shadow/*` light styles → an explicit "== global" override stays byte-identical. Dark-based
    // custom modes always keep their entry — the reduced dark layers aren't emitted for them any other way.
    if (app === 'light' && JSON.stringify(sm) === baseShadowJson) continue;
    const pick = (st: ShadowStep): ShadowLayer[] => (app === 'dark' ? st.dark : st.light);
    const layers: Record<string, ShadowLayer[]> = { inset: pick(sm.inset) };
    for (const s of sm.steps) layers[s.name] = pick(s);
    shadowByMode[mo] = { appearance: app, colorRgb: sm.colorRgb, softness: sm.softness, tint: sm.tint, layers };
  }
  // Dark-BASED custom modes inherit their base's reduced dark shadow even WITHOUT an override. Built-in
  // `dark` gets `modes.dark` from the tree unconditionally; a dark-based custom mode has no such default,
  // so absent this it would fall back to the light `$value` (a light shadow under a dark surface). Seed an
  // entry from the GLOBAL dark layers for any dark-based custom mode not already carrying an override.
  for (const cm of customModes) {
    if (cm.base !== 'dark' || shadowByMode[cm.name]) continue;
    const layers: Record<string, ShadowLayer[]> = { inset: shadow.inset.dark };
    for (const s of shadow.steps) layers[s.name] = s.dark;
    shadowByMode[cm.name] = { appearance: 'dark', colorRgb: shadow.colorRgb, softness: shadow.softness, tint: shadow.tint, layers };
  }
  if (Object.keys(shadowByMode).length) shadow.shadowByMode = shadowByMode;
  const gradient = buildGradient(input.gradients, palettes, root);
  if (gradient.gradients.length) {
    notes.push(`gradient: ${gradient.gradients.length} brand gradient(s) [${gradient.gradients.map((g) => `${g.name} ${g.kind}${g.kind === 'linear' ? ` ${g.angle}°` : ''} ${g.stops.length}-stop`).join(', ')}] — OPT-IN. DTCG composite spine, stop colors alias the ramp; kind/angle/${gradient.gradients[0].interpolation} interpolation in \$extensions (DTCG omits them — issue #101). OKLCH-interpolated + ${gradient.gradients[0].sampled.length}-stop sRGB pre-sample for Figma (sRGB-only); materializes as a Figma Paint Style (only stop colors bind). Worst-case-stop contrast computed for text-on-gradient.`);
  } else {
    notes.push('gradient: none (opt-in axis; brand declared no gradients — the field-common default).');
  }
  const layout = buildLayout(input.layout);
  notes.push(`layout: ${layout.breakpoints.length} breakpoints (${layout.breakpoints.map((b) => `${b.name} ${b.px}`).join(', ')}); grid base ${layout.baseColumns} cols (ladder ${layout.grid.map((g) => g.columns).join('/')}); gutter/margin alias the spacing scale (${layout.grid.map((g) => g.gutterPx).join('/')} · ${layout.grid.map((g) => g.marginPx).join('/')}); container max ${layout.containerMax}px + narrow ${layout.containerNarrow}px (fluid-first + cap). Breakpoints → a separate Figma layout collection (modes), composing with color light/dark.`);
  const typography = buildTypography(input.typography);
  // Per-mode typography levers (Phase D): a customizable mode may override the font FAMILY per
  // family-role and/or the font WEIGHT per weight-role. Re-derive the affected PRIMITIVES via the
  // SAME helpers buildTypography uses — family stacks by merging the mode's stacks over the base
  // `families` and re-running deriveFamilies (variable flag kept from light); weight-role numbers by
  // merging the mode's weights over the resolved defaults. Only modes that override get an entry, so
  // absent maps ⇒ byte-identical. The composite SET is untouched — every composite aliases the
  // family/weight-role primitive, so it inherits the per-mode value automatically (the seam).
  const baseFam = input.typography?.families ?? {};
  const baseWr = { ...WEIGHT_ROLE_DEFAULT, ...(input.typography?.weightRoles ?? {}) };
  const familiesByMode: Record<string, FontFamilyRole[]> = {};
  const weightRolesByMode: Record<string, WeightRole[]> = {};
  const extraWeights = new Set<number>();
  // No-diff suppression (mirrors the tempo/radius levers): only a mode whose re-derived families /
  // weight-roles DIFFER from the global baseline gets an entry — an override that resolves to the
  // global stack/weights stays byte-identical (and adds no font.weight.<num> leaves).
  const baseFamJson = JSON.stringify(deriveFamilies(baseFam));
  const baseWrJson = JSON.stringify(WEIGHT_ROLE_ORDER.map((role) => ({ role, value: baseWr[role] })));
  for (const [m, lev] of Object.entries(modeLevers)) {
    if (lev?.families) diffAssign(familiesByMode, m, deriveFamilies({ ...baseFam, ...lev.families }), baseFamJson);
    if (lev?.weights) {
      const wrMode = { ...baseWr, ...lev.weights };
      const cand = WEIGHT_ROLE_ORDER.map((role) => ({ role, value: wrMode[role] }));
      // Only mint the per-mode weight numerics when the mode's weight-roles actually deviate (diffAssign
      // returns whether it kept the entry) — an override equal to the global adds no font.weight.<num>.
      if (diffAssign(weightRolesByMode, m, cand, baseWrJson))
        for (const w of Object.values(lev.weights)) if (w !== undefined) extraWeights.add(w);
    }
  }
  // Weight numeric primitives must resolve: a per-mode weight value may not be in the global tier.
  // Emit the UNION (sorted, de-duped) so `weight-role.<role>`'s per-mode alias {font.weight.<value>}
  // always lands on a real `font.weight.<num>` leaf. This adds font.weight.<num> leaves — the ONLY
  // out/* change a per-mode-weight brand causes; a brand with no per-mode weights is byte-identical.
  if (extraWeights.size)
    typography.weightsRef = [...new Set([...typography.weightsRef, ...extraWeights])].sort((a, b) => a - b);
  if (Object.keys(familiesByMode).length) typography.familiesByMode = familiesByMode;
  // A per-mode face may not be one the light build binds. Emit the UNION so every per-mode
  // family alias lands on a real `font.typeface.<slug>` leaf — the same contract weightsRef
  // has for per-mode weight numerics. No per-mode families ⇒ unchanged.
  if (Object.keys(familiesByMode).length)
    typography.typefaces = deriveTypefaces(typography.families, ...Object.values(familiesByMode));
  if (Object.keys(weightRolesByMode).length) typography.weightRolesByMode = weightRolesByMode;
  // Per-mode LINE HEIGHT / LETTER SPACING (Phase D): a mode may re-anchor any named leading/tracking
  // step. Merge the mode's per-step overrides over the base ramp and emit the FULL ramp for that mode
  // (a step the mode didn't touch keeps the light value). Only overriding modes get an entry ⇒ absent
  // maps stay byte-identical. Composites reference the step by KEY, so they inherit automatically.
  // #296 — a per-mode leading/tracking lever is a RE-POINT MAP (rung → rung), stored as-is. The rung
  // primitives themselves are mode-invariant, so there is no per-mode ramp to derive: the mode simply
  // says which rung stands in for which. Composites resolve it below; `tree.ts` emits the swapped alias
  // on the semantic composite, never a per-mode value on the rung.
  const lineHeightRepointByMode: Record<string, Record<string, string>> = {};
  const letterSpacingRepointByMode: Record<string, Record<string, string>> = {};
  for (const [m, lev] of Object.entries(modeLevers)) {
    // Drop self-maps (`normal → normal`): a no-diff entry, same suppression the other axes use, so an
    // inert declaration can't create a mode entry or a spurious composite variant.
    const lh = Object.entries(lev?.lineHeights ?? {}).filter(([k, v]) => v && v !== k);
    const ls = Object.entries(lev?.letterSpacings ?? {}).filter(([k, v]) => v && v !== k);
    if (lh.length) lineHeightRepointByMode[m] = Object.fromEntries(lh) as Record<string, string>;
    if (ls.length) letterSpacingRepointByMode[m] = Object.fromEntries(ls) as Record<string, string>;
  }
  if (Object.keys(lineHeightRepointByMode).length) typography.lineHeightRepointByMode = lineHeightRepointByMode;
  if (Object.keys(letterSpacingRepointByMode).length) typography.letterSpacingRepointByMode = letterSpacingRepointByMode;
  // Resolve onto each composite: if this mode re-points the rung the composite uses, record the target.
  // No snapping and no nearest-match, so a request can never be quantised away — it either names a
  // different rung (and applies) or is a self-map (dropped above).
  for (const c of typography.composites) {
    for (const [m, map] of Object.entries(lineHeightRepointByMode))
      if (map[c.lineHeight]) (c.lineHeightByMode ??= {})[m] = map[c.lineHeight];
    for (const [m, map] of Object.entries(letterSpacingRepointByMode))
      if (map[c.tracking]) (c.trackingByMode ??= {})[m] = map[c.tracking];
  }
  // #328 — per-mode rung SIZES. Same re-point SHAPE as leading/tracking above, with one difference
  // that is easy to miss and silently wrong: a re-sized rung must recompute its OWN mobile endpoint.
  // Inheriting the brand-level `sizeMinPx` would pair a mode's 32px title with the 36px floor derived
  // from the 40px it replaced — a "fluid" pair that shrinks UPWARD on mobile.
  // Everything here THROWS rather than dropping. A silently ignored size request is precisely the
  // failure mode #341 removed from the ramp, and re-introducing it on a new axis would be worse:
  // the request is per-mode, so the drop would only be visible in one mode's output.
  const typeSizesByMode: Record<string, Record<string, Record<string, number>>> = {};
  const ladderSet = new Set(typography.sizesPx);
  for (const [m, lev] of Object.entries(modeLevers)) {
    const groups = lev?.typeSizes;
    if (!groups) continue;
    for (const [g, rungs] of Object.entries(groups)) {
      if (!PER_MODE_SIZE_GROUPS.includes(g as PerModeSizeGroup))
        throw new Error(`modeLevers.${m}.typeSizes: '${g}' is not a heading group — per-mode sizing covers ${PER_MODE_SIZE_GROUPS.join('/')} only. Reading and UI text (body/label/caption/code) is mode-invariant by contract.`);
      const inGroup = typography.composites.filter((c) => c.group === g);
      const known: string[] = [];
      for (const c of inGroup) if (!known.includes(c.variant)) known.push(c.variant);   // rung order, first-appearance
      const baseSize = new Map(inGroup.map((c) => [c.variant, c.sizePx]));
      for (const [variant, px] of Object.entries(rungs ?? {})) {
        if (!known.includes(variant))
          throw new Error(`modeLevers.${m}.typeSizes.${g}: rung '${variant}' does not exist — this brand ships ${g} ${known.join('/')}. A mode re-sizes the rungs it has; it can never add or remove one (the set is fixed at brand level by displayCeiling/titleFloor).`);
        if (!ladderSet.has(px))
          throw new Error(`modeLevers.${m}.typeSizes.${g}.${variant}: ${px}px is not a step on this brand's size ladder (${typography.sizesPx.join(', ')}).`);
        const floor = HEADING_SIZE_FLOOR[g as PerModeSizeGroup];
        if (px < floor)
          throw new Error(`modeLevers.${m}.typeSizes.${g}.${variant}: ${px}px is below the ${g} floor of ${floor}px — the smallest size this system emits for ${g} anywhere.`);
      }
      // The mode's ramp must hold the SAME invariant the brand ramp does (#341): strictly increasing.
      // Checked on the MERGED ramp, not the overrides alone — re-sizing one rung is exactly how you
      // collide with an untouched neighbour, and that is the case a per-override check would miss.
      const merged = known.map((v) => ({ v, px: (rungs as Record<string, number>)[v] ?? baseSize.get(v)! }));
      for (let i = 1; i < merged.length; i++)
        if (merged[i].px <= merged[i - 1].px)
          throw new Error(`modeLevers.${m}.typeSizes.${g}: ${merged[i].v} resolves to ${merged[i].px}px, which is not larger than ${merged[i - 1].v} (${merged[i - 1].px}px) — a mode's ramp must be strictly increasing, same as the brand's. Merged ramp: ${merged.map((x) => `${x.v}=${x.px}`).join(' ')}.`);
      // Drop self-sizes: an override equal to the brand size is inert, the same suppression the other
      // axes use, so a no-diff declaration can't create a mode entry or a spurious composite variant.
      const diff = Object.entries(rungs ?? {}).filter(([v, px]) => baseSize.get(v) !== px);
      if (diff.length) ((typeSizesByMode[m] ??= {})[g] = Object.fromEntries(diff));
    }
  }
  if (Object.keys(typeSizesByMode).length) typography.typeSizesByMode = typeSizesByMode;
  for (const c of typography.composites)
    for (const [m, groups] of Object.entries(typeSizesByMode)) {
      const px = groups[c.group]?.[c.variant];
      if (px === undefined) continue;
      (c.sizeByMode ??= {})[m] = px;
      (c.sizeMinByMode ??= {})[m] = typography.fluid ? mobileEndpoint(typography.sizesPx, c.group, px) : px;
    }
  const dispSizes = typography.composites.filter((c) => c.group === 'display').map((c) => c.sizePx);
  const reqCeiling = input.typography?.displayCeiling ?? '3xl';
  const effCap = dispSizes.length ? Math.max(...dispSizes) : 0;
  // The "requested Npx but effective Mpx" note is gone with the px ceiling (#328): a rung-named
  // ceiling cannot disagree with what ships, because it never compared against a shifted size.
  const capNote = dispSizes.length === 0
    ? ` — NOTE: display tier fully trimmed; composite count is below the 15–25 norm`
    : '';
  const varFams = typography.families.filter((f) => f.variable).map((f) => f.role);
  notes.push(`typography: curated rem size ladder (${typography.sizesPx.length} steps, ${typography.sizesPx[0]}–${typography.sizesPx[typography.sizesPx.length - 1]}px — NOT ratio-derived; covers all bases, clean values); weight roles ${typography.weightRoles.map((w) => w.role).join('/')} → ${typography.weightRoles.map((w) => w.value).join('/')}; families ${typography.families.map((f) => `${f.role}=${f.stack[0]}`).join(', ')}${varFams.length ? ` (variable: ${varFams.join('/')})` : ''}; typeScale '${typography.typeScale}'. ${typography.composites.length} semantic composites (title/display sizes shifted by typeScale; display capped at rung '${reqCeiling}' (${effCap}px); title tier ${(input.typography?.titleFloor ?? 18) === 16 ? 'includes' : 'omits'} title.2xs)${capNote}. ${typography.fluid ? `responsive: ${typography.composites.filter((c) => c.sizeMinPx !== c.sizePx).length} fluid composites (size-dependent mobile shrink — research-validated, Carbon fluid-display curve: body static, titles ~1 rung, display converges to ~40–48px; one min/max pair → web clamp() ${typography.minViewport}–${typography.maxViewport}px + Figma desktop/mobile modes)` : 'responsive: OFF (all sizes static)'}. Line-height unitless multiplier in \$value; px-from-ratio materialization for Figma in \$extensions.`);
  const dStrat = normalizeDisabledStrategy(input.disabledStrategy);
  const dMin = normalizeDisabledMin(input.disabledStrategy, input.disabledMin);
  notes.push(dStrat === 'full'
    ? `disabled: 'full' — disabled text/icon clears a fixed 4.5:1 (AA text) on the floor. Legibility is guaranteed, so the disabled AFFORDANCE rests on the fill / border / cursor / aria-disabled rather than on dimming — confirm a disabled control still reads as disabled.`
    : `disabled: 'reduced' (default) — disabled text/icon clears ${dMin}:1 on the floor: visibly dimmed but legible, where Primer/USWDS sit. Never below 3:1 — this system does not use the WCAG 1.4.3/1.4.11 inactive-component exemption. Set disabledStrategy:'full' to guarantee AA text instead.`);
  const oInt = input.outlineInteraction ?? 'overlay-neutral';
  notes.push(oInt === 'overlay-neutral'
    ? `interactive overlays: 'overlay-neutral' (default) — outline/text controls + rows/menus hover with a translucent neutral wash (interactive.<color>.overlay.*), contrast-verified on the composited surface. Set 'solid-tint' (opaque foreground.<color>-subtle) or 'none' to opt out.`
    : `interactive overlays: '${oInt}' — no translucent overlay tokens; outline/text hover uses ${oInt === 'solid-tint' ? 'opaque foreground.<color>-subtle surfaces' : 'no hover expression'}`);

  // ---- surface confirmation ----
  for (const [mode, sf] of Object.entries(input.surfaces ?? {})) {
    if (sf?.base !== undefined && sf.base !== 'white' && sf.base !== 'black') {
      notes.push(`${mode} primary surface is NON-default (neutral.${sf.base}) — CONFIRM this is the page color; the contrast floor moves with it${sf.floorStep ? ` (floor neutral.${sf.floorStep})` : ''}`);
    } else if (sf?.floorStep !== undefined) {
      notes.push(`${mode} contrast floor overridden to neutral.${sf.floorStep}`);
    }
  }

  // Action anchor step (M-06): honour the brand's PINNED accent when `actionPalette` names a
  // brandColor — resolve the action role at that accent's own step (matching the nbTheme fixture's
  // semantics, action=550=accent step), not the hardcoded 500 pivot which silently discarded the
  // brand's chosen shade while the note claimed the decision was honoured. `pickBrand` still nudges
  // to clear AA on the floor, so accessibility is preserved regardless. 'primary' → the primary
  // anchor; an unanchored palette (neutral / status) has no pinned step → the 500 mid pivot.
  const actionBrandColor = (input.brandColors ?? []).find((b) => b.name === actionPalette);
  const actionAnchorStep = actionPalette === 'primary' ? anchorStep
    : actionBrandColor ? autoPlaceStep(actionBrandColor.oklch.l)
    : 500;
  if (actionBrandColor) notes.push(`action anchored at accent '${actionPalette}' step ${actionAnchorStep} (its pinned lightness) — the brand's own shade, nudged only if it fails AA on the floor`);

  const neutralEmphasis = input.neutralEmphasis ?? 'subtle';
  const inverseContext = input.inverse ?? true;
  notes.push(`neutral interactive emphasis: '${neutralEmphasis}'${neutralEmphasis === 'strong' ? ' — bold near-black/white neutral fill' : ' (light-gray, default)'}; inverse surface-context: ${inverseContext ? 'on (interactive.<color>.on-inverse generated)' : 'off'}`);

  return {
    id: input.id, root, namespace: `${root}.palette`, colorFormat: 'hex', modes: modesAll, palettes, roleToPalette, notes,
    ...(customModes.length ? { customModes } : {}),
    ...(Object.keys(radiusByMode).length || Object.keys(familiesByMode).length || Object.keys(weightRolesByMode).length || Object.keys(lineHeightRepointByMode).length || Object.keys(letterSpacingRepointByMode).length || Object.keys(motionByMode).length || Object.keys(shadowByMode).length || Object.keys(sizesByMode).length ? { modeLevers } : {}),
    roleAnchorStep: { brand: anchorStep, neutral: 500, success: 500, warning: 500, danger: 500, info: 500, action: actionAnchorStep },
    surfaces: input.surfaces,
    overrides: input.overrides,
    modeAnchors: input.modeAnchors,
    disabledStrategy: dStrat,
    disabledMin: dMin,
    iconContrast: input.iconContrast ?? 'text',
    outlineInteraction: input.outlineInteraction ?? 'overlay-neutral',
    neutralEmphasis, inverseContext, interactivePalettes,
    actionAnchorStep: input.actionAnchorStep, destructiveAnchorStep: input.destructiveAnchorStep,
    dims: { ...buildDims(baseUnit, spaceBase, density, rScale, baseMd), ...(Object.keys(radiusByMode).length ? { radiusByMode } : {}), ...(Object.keys(sizesByMode).length ? { sizesByMode } : {}) },
    motion,
    typography,
    shadow,
    layout,
    gradient,
  };
};

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
  }));
  // NB ships no blue; synthesise an info palette so the semantic layer is complete.
  palettes.push({ palette: 'info', role: 'info', description: 'info status (engine-synthesized — NB has no blue)', steps: statusRamp(STATUS_DEFAULTS.info.h, STATUS_DEFAULTS.info.chroma) });
  const baseUnit = s.density?.baseUnit ?? 4;
  const baseMd = s.radius?.baseMd ?? 4;
  // Engine taxonomy (not NB's): 8px space rhythm reproducing Prism2's numbered
  // scale; NB's 4px grid still backs radius/borders. NB ships radius scale=1 and
  // a 720px layout outlier.
  const dims = buildDims(baseUnit, 8, 'comfortable', 1, baseMd, [720]);
  return {
    id: 'nb', root: 'nbds', namespace: 'nbds.palette', colorFormat: 'rgb', modes: ALL_MODES, palettes,
    roleToPalette: { brand: 'red', neutral: 'neutral', success: 'green', warning: 'amber', danger: 'red', info: 'info', action: 'red' },
    roleAnchorStep: { brand: 550, neutral: 500, success: 500, warning: 500, danger: 550, info: 500, action: 550 },
    disabledStrategy: 'reduced', disabledMin: 3, iconContrast: 'text', outlineInteraction: 'overlay-neutral',
    neutralEmphasis: 'subtle', inverseContext: true, interactivePalettes: [],
    dims, motion: buildMotion(),
    typography: buildTypography(),
    shadow: buildShadow(s.neutralHue.hue, { tint: { amount: 0 } }),  // NB ships pure-black shadows
    layout: buildLayout({ containerMax: 1920 }),                     // NB caps at 1920 + narrow 720
    gradient: { gradients: [] },                                     // NB ships no gradients (it had none)
    notes: [
      'NB regression: measured anchors; brand red also serves as danger (NB brand hue is its danger hue).',
      `dimension axis: ${baseUnit}px grid, 8px space rhythm (Prism2 numbered scale), comfortable density, radius scale 1 (baseMd ${baseMd}px).`,
      'typography: curated rem size ladder (22 steps, 10–160px) reproducing the Prism2 reference scale; weight roles subtle/default/emphasis/strong → 300/400/600/700.',
      'shadow: 6-step ramp + inset, 2-layer, pure-black (NB dialect); mode-aware lift-primary (reduced in dark, NOT NB\'s heavier inverse — the field-correct choice).',
      'layout: 5 breakpoints (engine default) + 12-col grid (4/8/12 ladder) + container max 1920 / narrow 720 (NB caps); gutter/margin alias the spacing scale.',
    ],
  };
};
