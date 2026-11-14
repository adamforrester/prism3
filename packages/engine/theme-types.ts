/** Prism3 engine — The shared types every axis module imports: `Theme` (the output), `BrandInput` (the input contract),
 *  `ModeLevers`, `Dims`, the palette and surface types, and the input enumerations and validators those types are
 *  built from. It imports other theme modules for types only, so no axis reaches it at run time through a cycle.
 *
 *  Split out of `theme.ts` (#3698 R5), which re-exports its public names unchanged.
 */
import type { Step } from './ramp';
import type { SpaceStep, RadiusStep, SizeStep, Density, ControlShape, FieldStyle, SearchFieldStyle, TagStyle, DialogTitleSize, BannerStyle, CurrentIndicator, ButtonIcons, ButtonContentSize, ButtonLabelWeight, ButtonTextHover, IconSizeStep, ControlSizeStep, RadioDotShare } from './scale';
import type { ModeName, BuiltinModeName, ModeOverrides } from './modes';
import type { MotionAxis, MotionPersonality } from './theme-motion';
import type { TypeGroup, WeightRoleName, LineHeightKey, LetterSpacingKey, PerModeSizeGroup, Typography, TypographyInput } from './theme-type';
import type { ShadowAxis } from './theme-shadow';
import type { LayoutAxis } from './theme-layout';
import type { GradientAxis, GradientInput } from './theme-gradient';

/** The appearance modes the engine can generate. `light` is the required base; the rest
 *  are opt-in (docs/11 Pillar 1). Wireframe (docs/11 §Pillar 1b) IS a shipped mode — a
 *  generated greyscale mode (every non-neutral role maps to its equivalent neutral; radius
 *  zeroes to 0, `tree.ts`) — but it is opt-in only, never a default (see `ALL_MODES` below). */
// The DEFAULT mode set — generated when `input.modes` is omitted (back-compat; the
// four-mode golden is byte-identical). Wireframe is NOT here: it's opt-in only, never
// a default (docs/11 Pillar 1 — "most brands ship light only; dark/HC/wireframe opt-in").
export const ALL_MODES: ModeName[] = ['light', 'dark', 'hc-light', 'hc-dark'];
// The VALID mode set — the allow-list an input may request. Adds `wireframe` (1b): a
// generated greyscale mode (every non-neutral role → its equivalent neutral; radius → 0).
export const VALID_MODES: ModeName[] = [...ALL_MODES, 'wireframe'];

/**
 * Root namespaces no REGISTERED BRAND may root at (#1283) — held for a future CANONICAL DEFAULT THEME.
 *
 * `prism` is the engine's fallback root and, by that fact, the namespace the default theme will occupy;
 * `pds3` is reserved alongside it as the name that theme is expected to ship under. A brand the engine
 * SHIPS takes a root of its own under the `<brand>ds` convention New Balance has always used: `nbds`,
 * and as of #1283 `ads` (Aurora), `hds` (Harbor) and `wds` (Wendy's).
 *
 * ── THE SCOPE IS THE SHIPPED BRAND CATALOG, AND `brandTheme` IS DELIBERATELY NOT WHERE IT LIVES ────
 *
 * This list is a NAMING POLICY over the brands this repo publishes, not an input validation. Three
 * things follow, and each is a thing an earlier cut of #1283 got wrong by enforcing it here:
 *
 *   · **`input.root ?? 'prism'` is untouched.** `prism` is still what an undeclared root resolves to,
 *     and the sparsest brief in the corpus depends on that. Reserving a namespace is not retiring it.
 *   · **An arbitrary `BrandInput` may still declare `prism`.** A caller building a theme in a test, a
 *     host, or a client's own repo is not publishing an example brand, and a throw in `brandTheme`
 *     would have refused ~235 harness fixtures for a policy that has nothing to say about them.
 *   · **The catalog, not the input, is the subject.** So the check is a GATE that reads the committed
 *     emission — every `out/<id>.tokens.json` the engine actually writes — rather than a guard on a
 *     function every caller reaches. `test.ts`'s `#1283` block is where it lives, and it asserts both
 *     directions: a registered brand at a reserved root FAILS, and a fixture at one does not.
 *
 * The default theme itself is deliberately NOT authored here; this only stops the namespace being
 * taken before it exists. Policy and rationale: `docs/30`.
 */
export const RESERVED_ROOTS = ['prism', 'pds3'] as const;

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
/** `generated` names the hue of a status ramp the engine generated because the brand supplies none (e.g.
 *  `'red'`), so a surface can say so from a field rather than by reading `description` (#1623 FG/F-14). */
/** `hueSource` (#2411, owner Q167) records, for a STATUS palette, whether its hue came from the brand or is the
 *  engine's default. It is emitted as data on each step of the palette so `$description` carries purpose only. */
export type PaletteBuild = { palette: string; role: Role; steps: Step[]; description: string; generated?: string; hueSource?: 'brand' | 'default' };

/** Per-mode LEVER overrides for the non-colour axes (Phase D). A customizable mode may override
 *  an input lever the engine RE-DERIVES for that mode — the radius scale, motion tempo, component
 *  density, font families/weights, leading/tracking re-points, easing re-points, shadow personality
 *  and per-mode type sizes (nine axes below). NOT `typeScale`: it shifts heading rungs,
 *  and per-mode rung shifts give modes different type SETS (#328) — per-mode type sizing is a
 *  per-rung size override over a mode-invariant set, never a per-mode scale lever. Distinct from the global
 *  `radiusScale` (the baseline every mode inherits); a `modeLevers` entry deviates a single mode. */
export type ModeLevers = {
  radius?: number;
  // Per-mode font FAMILY per CATEGORY (#415) — a different font stack for this mode. Same shape as
  // `TypographyInput.families` minus `variable` (the variable flag stays from light) and minus the
  // `null` opt-out (a mode re-points the categories the brand ships; it never adds or drops one).
  // Category-keyed, this is the WHOLE per-mode family mechanism: a mode moving `title` to another face
  // leaves `display` alone, which is what the separate per-mode `familyMap` (#390) was invented to do
  // back when both categories shared one role.
  families?: Partial<Record<TypeGroup, string | string[]>>;
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
  // Per-mode EASING RE-POINT (#522) — maps a motion ROLE to another CURVE: `{ emphasized: 'calm' }`
  // reads "in this mode, transitions that would use the emphasized curve use calm instead". Identical
  // contract to `lineHeights` / `letterSpacings`: it names an existing curve, never a number, because
  // the six curves are mode-invariant primitives and a mode re-points rather than re-anchors.
  //
  // This is why it is a re-point and not a per-mode bezier. Every per-mode override the engine emits
  // sits on a token marked `semantic` or `composite` — 157 of them in harbor, none on a bare primitive
  // — and `motion.easing.*` carries no role marking. Tuning the curve numbers per mode would have made
  // this the first mode-varying primitive in the system. `calm` exists precisely for the case that
  // motivates this ('a11y: soft onset for long/involuntary motion'), so there is something worth
  // pointing AT — which is the part I had wrong when I first scoped it.
  easings?: Partial<Record<string, string>>;
  // Per-mode SHADOW personality — a different blur `softness` and/or `tint` (hue + amount) for this mode.
  // Same shape as the global `shadow` lever. Re-derives this mode's shadow ramp via the same buildShadow
  // the baseline uses, picking the mode's appearance layer-set (a dark/dark-based mode gets the reduced
  // layers; a light/light-based mode the full ones). The light/dark alpha reduction is intrinsic, so it
  // composes for free.
  shadow?: { softness?: number; tint?: { hue?: number; amount?: number } };
  // Per-mode DENSITY — a different component-size tier (compact/comfortable/spacious) for this mode. The
  // dimension analog of the tempo enum: re-derives `sizes` (control heights) via the same componentSizes
  // the baseline uses. The `space.*` reference scale is density-free, so it doesn't change; only the
  // component tier does. A component's padding is its own `space.*` step, moved by the BRAND's density at
  // materialization (the spacing model), so a mode's own density moves heights only. e.g. a `touch` mode.
  density?: Density;
  // Per-mode TYPE SIZE (#328) — `{ display: { '3xl': 96 } }` reads "in this mode, display.3xl is 96px".
  // Unlike the leading/tracking re-points above it names a NUMBER, not a rung key, and that asymmetry
  // is principled: a leading rung is a NAMED primitive with a brand-chosen value, so naming a number
  // there would re-anchor rather than re-point. A ladder STEP is the primitive here — all 22 are always
  // emitted, so any selection lands on a real leaf and no union mechanism is needed (unlike per-mode
  // weights, #337). Heading groups only, and it changes SIZES within a mode-invariant SET: the rung set
  // is fixed once at brand level by displayCeiling/titleFloor and is never re-derived per mode.
  typeSizes?: Partial<Record<PerModeSizeGroup, Record<string, number>>>;
};  // per-mode lever overrides — radius/tempo/density/families/weights/lineHeights/letterSpacings/
    // easings/shadow/typeSizes (NOT typeScale, see ModeLevers)

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
  // Control tier (#900) — a small control's OWN box (checkbox square, radio circle, switch track).
  // Unlike `icons` this IS density-derived, through the same window `sizes` uses: a control box is
  // chosen with the control it belongs to, so a compact brand's boxes sit one rung below a
  // comfortable brand's. See `controlSizes` for the ladder and why it is not the icon one.
  controls: ControlSizeStep[];
  density: Density;
  radiusScaleValue: number;
  spaceBase: number;
  // Per-mode radius ramps (Phase D) — only modes whose `modeLevers.radius` deviates the baseline;
  // each re-derived via the SAME radiusScale(value, baseMd, 128) buildDims uses. Absent (field
  // omitted) when no modeLevers → the DTCG/Figma radius emit stays byte-identical.
  radiusByMode?: Record<string, RadiusStep[]>;
  // Per-mode component-size tiers (Phase D) — only modes whose `modeLevers.density` deviates the
  // baseline; each re-derived via the SAME componentSizes(density, spaceBase) buildDims uses. A size
  // height whose px differs from light carries a per-mode override.
  // Absent when no modeLevers.density → byte-identical.
  sizesByMode?: Record<string, SizeStep[]>;
  // Per-mode CONTROL tiers (#900) — the same seam, for the same reason. A mode running a different
  // density re-derives its control ladder via the SAME `controlSizes(density)` buildDims uses. Wired
  // rather than deferred because the alternative is the #708 shape: the box would keep the baseline
  // mode's dimension while its row and padding moved, resolving to a real value and the wrong one.
  controlsByMode?: Record<string, ControlSizeStep[]>;
};

/** A declared palette promoted to a full `interactive.<name>.*` column (docs/20 §3). `name` is
 *  the role suffix (`interactive.<name>.*`); `palette` is a defined palette; `anchorStep` is the
 *  fill step its rest colour anchors to (default 500 at generation time). */
export type InteractivePalette = { name: string; palette: string; anchorStep?: number;
  /** True when `anchorStep` was AUTHORED rather than derived. `brandTheme` always resolves
   *  `anchorStep` (pinned ?? computed), so by the time `modes.ts` reads it the two are
   *  indistinguishable — and they must not be: an authored pin is applied verbatim under the
   *  apply-but-warn policy (#331), while a derived default is still floor-clamped. The
   *  provenance has to travel with the value; inferring it at the point of use is what got
   *  this wrong the first time. */
  anchorPinned?: boolean };

/** Per-state link override (#1510). The link role ships a global state walk (#1486): `default` sits on
 *  the action ramp at the ink bar and the ENGAGED states — hover, pressed, visited — step away from it by
 *  a tuned PERCEPTUAL interval. This lever lets a brand pin how far each engaged state steps, independently
 *  of the others: the value is a RUNG COUNT — how many floor-clearing steps past the resting link that
 *  state sits, along the engagement direction. An unset state keeps the tuned #1486 walk; `default` (which
 *  `focused` follows) has no key — it is the resting link, moved by the action palette / anchor, not by
 *  this lever.
 *
 *  A rung COUNT rather than an absolute step is the deliberate shape (#1510): a link's engagement
 *  direction FLIPS between contexts — deeper is a higher ramp step on a light page but a lower one on a
 *  dark band, and both grounds are emitted within a single mode — so one absolute step cannot be right for
 *  every `link.*` family at once, while a rung count is read against each ground's own direction and stays
 *  coherent across all four (`text` / `icon` × page / inverse) and both mode families. Each override runs
 *  through the same walk as the tuned ladder, so it is FLOOR-CLAMPED (reflects inward at a ramp end, and
 *  every counted step clears the link's 4.5:1 contract): an override can respace a link state but can
 *  never drop it below its floor. */
export type LinkStateRungs = { hover?: number; pressed?: number; visited?: number };

/**
 * THE PRIMITIVE TIER'S OWN PATH SEGMENT (#1102).
 *
 * `palette.*`, `dimension.*` and `font.*` sit one level down, under `<root>.core.*`, so the tier a
 * path belongs to is legible from the path itself — `prism.core.palette.red.550` says "primitive"
 * where `prism.palette.red.550` left the reader to know it. That legibility was already bought for
 * the designer (the Figma `core` collection, #1097); this buys the same thing for the developer
 * reading the JSON, and it is the reason the two halves land in one emission: a Figma variable's name
 * IS its DTCG path, so this move renames the same variables #1097 renames.
 *
 * Spelled once, here, because `theme.namespace` (the colour-primitive root every resolved role path
 * is built from — see `modes.ts`) and `tree.ts`'s group nesting have to agree; they were two
 * literals before, and a tier that existed in one and not the other would emit ~2,900 aliases
 * pointing at paths no longer in the tree.
 *
 * Deliberately NOT reachable from `materialization-renames.ts` — the migration record states the
 * transformation as a second, literal expression (`docs/34` shape 11), so importing this constant
 * there would delete the check it is the subject of.
 */
export const CORE_TIER = 'core';

/** Everything the emitter and the modes engine need to be brand-agnostic. */
/** The `raisedSurface` lever's values (#3049, owner Q3049.4): the card surface (default), the page, or white. */
export const RAISED_SURFACE_VALUES = ['card', 'page', 'white'] as const;
export type RaisedSurface = typeof RAISED_SURFACE_VALUES[number];
/** The `scrimStrength` lever's values (#3050, owner Q825 B): today's scrim (default), or a heavier one. */
export const SCRIM_STRENGTH_VALUES = ['standard', 'strong'] as const;
export type ScrimStrength = typeof SCRIM_STRENGTH_VALUES[number];
/** The `secondaryTextGround` setting's values (owner Q-TXT1 A): the ground `text.secondary` and `icon.secondary` are
 *  fitted against on the page. 'floor' (default) is the contrast floor, `background.secondary` unless `floorStep` moves
 *  it; 'page' is the page itself, `background.primary`, the lightest secondary ink that still clears its bar there. */
export const SECONDARY_TEXT_GROUND_VALUES = ['floor', 'page'] as const;
export type SecondaryTextGround = typeof SECONDARY_TEXT_GROUND_VALUES[number];

/**
 * A brand-added glass role (#3073, owner Q806, Q807 A): `color.glass.<name>`, a translucent fill beside the shipped
 * `color.glass.surface`. Its color is EITHER a semantic role's palette color, resolved per mode (`role:
 * 'foreground.primary'`, the card ground), OR one palette color (`palette: 'neutral.050'`, or `white` / `black`),
 * at `alpha` percent in every mode. The engine emits it as a translucent palette alpha step, so the Figma variable
 * carries the alpha and a fill bound to it stays translucent. Brand-dependent: never in the guaranteed contract.
 */
export type GlassRoleInput = { role?: string; palette?: string; alpha: number };
/** The glass role the engine ships in every brand; a brand role may not take its name. */
export const SHIPPED_GLASS_ROLE = 'surface';
/** A glass role name: lower-case kebab, the canon's segment shape (`card`, `card-dark`). */
export const GLASS_ROLE_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * Validate the `glassRoles` input's shape (#3073). What can only be checked against a resolved mode — that the
 * role exists there and sits on an opaque palette step — is checked in `modes.ts`, where it resolves.
 */
export const validGlassRoles = (raw: unknown): Record<string, GlassRoleInput> | undefined => {
  if (raw === undefined) return undefined;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error(`glassRoles: must be a map of role name to { role | palette, alpha } (got ${JSON.stringify(raw)})`);
  const out: Record<string, GlassRoleInput> = {};
  for (const [name, v] of Object.entries(raw as Record<string, unknown>)) {
    const at = `glassRoles.${name}`;
    if (name === SHIPPED_GLASS_ROLE)
      throw new Error(`${at}: 'surface' is the glass role every brand ships (white or black glass) and cannot be redefined. Name the brand's glass something else, such as 'card'.`);
    if (!GLASS_ROLE_NAME.test(name))
      throw new Error(`${at}: a glass role name is lower-case kebab-case, letters and digits, starting with a letter (such as 'card' or 'card-dark')`);
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`${at}: must be { role | palette, alpha }`);
    const { role, palette, alpha, ...rest } = v as Record<string, unknown>;
    if (Object.keys(rest).length) throw new Error(`${at}: unknown field(s) ${Object.keys(rest).join(', ')} (allowed: role, palette, alpha)`);
    if ((role === undefined) === (palette === undefined))
      throw new Error(`${at}: name exactly one color source, a semantic role ('role: foreground.primary') or a palette color ('palette: neutral.050')`);
    if (role !== undefined && (typeof role !== 'string' || !/^[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+$/.test(role)))
      throw new Error(`${at}.role: '${role}' is not a role path (such as 'foreground.primary')`);
    if (typeof role === 'string' && role.startsWith('glass.'))
      throw new Error(`${at}.role: a glass role cannot take its color from another glass role ('${role}'), which is already translucent`);
    if (palette !== undefined && (typeof palette !== 'string' || !/^(?:white|black|[a-z][a-z0-9-]*\.[0-9]+)$/.test(palette)))
      throw new Error(`${at}.palette: '${palette}' is not a palette color (such as 'neutral.050', 'white' or 'black')`);
    if (typeof alpha !== 'number' || !Number.isInteger(alpha) || alpha < 1 || alpha > 99)
      throw new Error(`${at}.alpha: must be a whole percent from 1 to 99 (got ${JSON.stringify(alpha)})`);
    out[name] = { ...(role !== undefined ? { role: role as string } : { palette: palette as string }), alpha };
  }
  return Object.keys(out).length ? out : undefined;
};

/** How an outline or text control shows hover and pressed (docs/20 §10; `opaque-fill` since #3071). */
export const OUTLINE_INTERACTION_VALUES = ['overlay-neutral', 'solid-tint', 'opaque-fill', 'none'] as const;
export type OutlineInteraction = typeof OUTLINE_INTERACTION_VALUES[number];
/** One set's (or the mode-wide) opaque outline hover fill: a palette step per state (`neutral.050`). */
export type OutlineHoverPick = { hover: string; pressed?: string };
/** The opaque outline hover fill's page step per mode (#3071, owner Q824 A): a palette step (`neutral.050`). #3335 (the
 *  owner's Q3335.5 A): a mode may also pick per button set (`sets.<set>`), and the mode-wide pick stays every set's
 *  default, so a brief that sets only the mode-wide pick resolves as it did. With `sets` the mode-wide `hover` is
 *  optional: a set it leaves out takes the default rule. */
export type OutlineHoverFill = Partial<Record<ModeName, { hover?: string; pressed?: string; sets?: Record<string, OutlineHoverPick> }>>;

/**
 * Validate `outlineHoverFill` (#3071): keyed by an editable mode the brand declares, each `{ hover, pressed? }` a
 * `palette.step`. Whether the step exists is checked where the palettes resolve (`modes.ts`). It is read only under
 * `outlineInteraction: 'opaque-fill'`; under another method it is kept and ignored, with a note, so a brief that
 * switches method keeps its picks (every lever varies on its own, as the lever sweep builds them).
 */
export const validOutlineHoverFill = (raw: unknown, modes: readonly string[], editable: readonly string[]): OutlineHoverFill | undefined => {
  if (raw === undefined) return undefined;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error(`outlineHoverFill: must be a map of mode to { hover, pressed?, sets? } (got ${JSON.stringify(raw)})`);
  const STEP = /^[a-z][a-z0-9-]*\.[0-9]+$/;
  /** One `{ hover, pressed? }` pick: hover a step (optional only where `hoverOptional`), pressed a step when given. */
  const pickOf = (at: string, v: Record<string, unknown>, hoverOptional: boolean): Partial<OutlineHoverPick> => {
    const { hover, pressed } = v;
    if (hover === undefined && pressed !== undefined) throw new Error(`${at}.pressed: set without ${at}.hover; pressed follows a hover pick`);
    for (const [k, x] of [['hover', hover], ['pressed', pressed]] as const)
      if ((k === 'hover' ? !hoverOptional || x !== undefined : x !== undefined) && (typeof x !== 'string' || !STEP.test(x)))
        throw new Error(`${at}.${k}: ${JSON.stringify(x)} is not a palette step (such as 'neutral.050')`);
    return { ...(hover !== undefined ? { hover: hover as string } : {}), ...(pressed !== undefined ? { pressed: pressed as string } : {}) };
  };
  const out: OutlineHoverFill = {};
  for (const [m, v] of Object.entries(raw as Record<string, unknown>)) {
    const at = `outlineHoverFill.${m}`;
    if (!modes.includes(m)) throw new Error(`${at}: mode '${m}' is not in this brand's modes (${modes.join(', ')})`);
    if (!editable.includes(m))
      throw new Error(`${at}: mode '${m}' is generate-only and takes the default rule; only ${editable.join('/')} accept a pick`);
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`${at}: must be { hover, pressed?, sets? }`);
    const { hover: _h, pressed: _p, sets, ...rest } = v as Record<string, unknown>;
    if (Object.keys(rest).length) throw new Error(`${at}: unknown field(s) ${Object.keys(rest).join(', ')} (allowed: hover, pressed, sets)`);
    // #3335 (Q3335.5 A): the per-set picks. Which sets the brand has is checked where the sets resolve (`modes.ts`).
    let setPicks: Record<string, OutlineHoverPick> | undefined;
    if (sets !== undefined) {
      if (!sets || typeof sets !== 'object' || Array.isArray(sets)) throw new Error(`${at}.sets: must be a map of button set to { hover, pressed? }`);
      setPicks = {};
      for (const [c, sv] of Object.entries(sets as Record<string, unknown>)) {
        const sat = `${at}.sets.${c}`;
        if (!sv || typeof sv !== 'object' || Array.isArray(sv)) throw new Error(`${sat}: must be { hover, pressed? }`);
        const { hover: _sh, pressed: _sp, ...srest } = sv as Record<string, unknown>;
        if (Object.keys(srest).length) throw new Error(`${sat}: unknown field(s) ${Object.keys(srest).join(', ')} (allowed: hover, pressed)`);
        setPicks[c] = pickOf(sat, sv as Record<string, unknown>, false) as OutlineHoverPick;
      }
      if (!Object.keys(setPicks).length) setPicks = undefined;
    }
    const wide = pickOf(at, v as Record<string, unknown>, !!setPicks);
    if (!wide.hover && !setPicks) continue;
    out[m as ModeName] = { ...wide, ...(setPicks ? { sets: setPicks } : {}) };
  }
  return Object.keys(out).length ? out : undefined;
};

/** #3335 (the owner's Q3335.3 A): the outline wash's opacity, brand-wide, one step of the opacity scale for hover and one
 *  for pressed (selected follows pressed, as it always has). Read by the two wash methods: the neutral wash
 *  (`overlay-neutral`, and `opaque-fill`, whose Tag, Segmented control and Pagination keep the wash, Q3335.4 A) and the
 *  tinted wash (`solid-tint`, where the pick is the step the engine starts from before its label and visibility guards). */
export type OutlineWash = { hover?: number; pressed?: number };
/** The steps a wash may take (#3335, the owner's DRAFT options): the light end of the opacity scale (`OPACITY_STEPS` in
 *  `modes.ts`), 5 to 40. Past 40 a wash stops reading as a wash over its ground. Typed here, as the scale's own values,
 *  because `modes.ts` imports this file. */
export const OUTLINE_WASH_STEPS = [5, 10, 20, 30, 40] as const;
/** Each wash method's own default, the constants the engine held before the input (`OVERLAY_ALPHA`, `TINT_NOMINAL`). */
export const OUTLINE_WASH_DEFAULTS = { neutral: { hover: 10, pressed: 20 }, tinted: { hover: 20, pressed: 30 } } as const;

/** Validate `outlineWash` (#3335): `{ hover?, pressed? }`, each an `OUTLINE_WASH_STEPS` value, pressed above hover when both
 *  are set. Under `none` it is kept and ignored, with a note, as `outlineHoverFill` is under another method. */
export const validOutlineWash = (raw: unknown): OutlineWash | undefined => {
  if (raw === undefined) return undefined;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`outlineWash: must be { hover?, pressed? } (got ${JSON.stringify(raw)})`);
  const { hover, pressed, ...rest } = raw as Record<string, unknown>;
  if (Object.keys(rest).length) throw new Error(`outlineWash: unknown field(s) ${Object.keys(rest).join(', ')} (allowed: hover, pressed)`);
  for (const [k, x] of [['hover', hover], ['pressed', pressed]] as const)
    if (x !== undefined && !(OUTLINE_WASH_STEPS as readonly unknown[]).includes(x))
      throw new Error(`outlineWash.${k}: ${JSON.stringify(x)} is not an opacity step (${OUTLINE_WASH_STEPS.join(', ')})`);
  if (typeof hover === 'number' && typeof pressed === 'number' && pressed <= hover)
    throw new Error(`outlineWash: pressed ${pressed} must be above hover ${hover}, so a press reads as coming forward`);
  const out: OutlineWash = { ...(hover !== undefined ? { hover: hover as number } : {}), ...(pressed !== undefined ? { pressed: pressed as number } : {}) };
  return Object.keys(out).length ? out : undefined;
};

/** The wash's hover and pressed step for a method (#3335): the brand's pick, else the method's default. A pressed left
 *  unset that would not sit above a picked hover takes the next step above it. `none` has no wash. */
export const outlineWashSteps = (method: OutlineInteraction, wash: OutlineWash | undefined): { hover: number; pressed: number } | null => {
  if (method === 'none') return null;
  const d = method === 'solid-tint' ? OUTLINE_WASH_DEFAULTS.tinted : OUTLINE_WASH_DEFAULTS.neutral;
  const hover = wash?.hover ?? d.hover;
  const above = OUTLINE_WASH_STEPS.find((x) => x > hover) ?? hover;
  const pressed = wash?.pressed ?? (d.pressed > hover ? d.pressed : above);
  return { hover, pressed };
};

export type Theme = {
  id: string;
  root: string;                      // 'nbds' | 'prism' (brand root namespace)
  namespace: string;                 // '<root>.core.palette' — the colour PRIMITIVE root (ramps live here; the semantic role layer is emitted under '<root>.color')
  colorFormat: 'rgb' | 'hex';
  modes: ModeName[];                 // the appearance modes to generate (light always present; customs appended last)
  // User-added custom modes (C1) — each `{ name, base }` clones a customizable built-in (light/dark)
  // under a new slug-safe name that LIVE-INHERITS the base's derivation each build, then deviates via
  // overrides[name] / modeAnchors[name]. Their names are already appended to `modes` above.
  customModes?: { name: string; base: BuiltinModeName }[];
  palettes: PaletteBuild[];
  roleToPalette: Record<Role, string>;
  roleAnchorStep: Record<Role, number>;
  // The palette the LINK role draws from (#1496). Resolved to a concrete palette name: `input.linkPalette`
  // when set, else the palette the action role resolved to, `roleToPalette.action` (so an unset
  // `linkPalette` is byte-identical to pre-#1496 output — links follow interactive color, including a
  // `roleColors.action` rebase, #1895). `link` is not a `Role` (the semantic-role machinery does not gain a
  // member), just the resolved input `modes.ts` reads to derive `linkBase`.
  linkPalette: string;
  // The fill/ink anchor step for the link palette (#1496), computed exactly like `roleAnchorStep.action`
  // but for the resolved link palette. Only consulted by `modes.ts` when links are DECOUPLED from the
  // action palette; when they follow it, the action's own per-mode anchor path is used (byte-identical).
  linkAnchorStep: number;
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
  // axis from an overridden input lever (radius, tempo, density, and six more — NOT typeScale, see
  // ModeLevers). Distinct from the global `radiusScale` baseline every mode inherits — modeLevers
  // deviate a single mode. The re-derived radius ramps land on `dims.radiusByMode`; this carries the
  // raw levers for round-trip.
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
  // Icon contrast floor. 'text' (default): icons mirror text tier for tier. '3:1':
  // icons resolve against the WCAG SC 1.4.11 non-text floor (3:1) — the minimum the
  // standard requires of graphical objects — letting secondary/semantic icons run
  // lighter than text. `icon.primary` stays strong either way.
  //
  // THE DEFAULT IS 'text' BY DECISION, NOT BY OVERSIGHT — do not "correct" it to '3:1'
  // on the grounds that 3:1 is what WCAG requires. It is, and that is precisely why the
  // lever exists. Owner's call (#352): icons sit NEXT TO text and should match it; a
  // conforming-but-lighter icon beside 4.5:1 body copy reads as a rendering bug, and
  // WCAG floors are minimums rather than targets. Brands that want the looser floor opt
  // in via the lever. This has already been re-proposed once from the standards angle
  // (#352's own plan listed "flip the default to '3:1'"), which is why it is written
  // here at the type rather than only in the progress log — and why test.ts pins it.
  //
  // Note `icon.secondary` 4.5 vs `icon.tertiary` 3 is the TIER LADDER mirrored from text
  // (primary 7 / secondary 4.5 / tertiary 3), not an inconsistency inside the family.
  iconContrast: 'text' | '3:1';
  // How an OUTLINE / TEXT interactive control expresses hover/pressed/selected
  // (docs/20 §10). 'overlay-neutral' (default): a translucent neutral wash that
  // composites over any surface — the `interactive.<color>.overlay.*` tokens are
  // generated. 'solid-tint': the control's own fill at an opacity-scale step instead
  // (`interactive.<color>.subtle-fill.{hover,pressed,selected}`, #1614), no overlays.
  // 'opaque-fill' (#3071): an opaque palette step per state (`interactive.<color>.hover-fill.{hover,pressed}`), the
  // step from `outlineHoverFill` or the default rule, with the label and icon measured and clamped on it; the wash is
  // still emitted, for the controls that keep it (Tag, Segmented control, Pagination).
  // 'none': no hover expression, no overlays. (`overlay-tint` — the colour's own
  // hue at low alpha — is scheduled; needs per-colour alpha ramps.)
  outlineInteraction: OutlineInteraction;
  // The opaque hover fill's page step per mode (#3071), read only under 'opaque-fill' (ignored, with a note, otherwise).
  // Unset modes take the default rule. #3335: per button set too (`sets`), the mode-wide pick their default.
  outlineHoverFill?: OutlineHoverFill;
  // The outline wash's opacity (#3335), as the brand set it; `outlineWashSteps` resolves it per method. Unset is each
  // method's own default, so a brand that never sets it is byte-identical.
  outlineWash?: OutlineWash;
  // Neutral interactive emphasis (docs/20 §10). 'subtle' (default): a light-grey neutral
  // fill; 'strong': a bold near-black (light) / near-white (dark) neutral fill.
  neutralEmphasis: 'subtle' | 'strong';
  // The raised surface (#3049, owner Q721 A, Q3049.1 C–Q3049.4): what `color.foreground.raised`, Dialog's panel,
  // holds in the light-family modes. Unset reads as `card`. The dark family always holds the card, whatever this says.
  raisedSurface?: RaisedSurface;
  // The scrim's strength (#3050, owner Q825 B): which `black-alpha` step `color.scrim.default` aliases in each mode.
  // Unset reads as `standard`, today's steps; `scrimStep` in `modes.ts` holds the table.
  scrimStrength?: ScrimStrength;
  // The ground the page's secondary ink is fitted against (owner Q-TXT1 A). Unset reads as 'floor', today's fit:
  // `text.secondary` clears its bar on the contrast floor, `background.secondary` by default. 'page' fits it on
  // `background.primary`, so it runs lighter and no longer clears the bar on the floor; the role's description and
  // `.ai.json` per-surface wording say so, because both are measured. Light and dark only (owner Q3212.3 B): high
  // contrast and the inverse band keep their floor.
  secondaryTextGround?: SecondaryTextGround;
  // Brand-added glass roles (#3073, owner Q806, Q807 A), `color.glass.<name>`, validated by `validGlassRoles`. Unset
  // adds none: the brand ships `color.glass.surface` alone.
  glassRoles?: Record<string, GlassRoleInput>;
  // The radio dot (#3086, owner Q816 A): `control.size.*.dot` as a share of the box edge, in percent. Unset reads as 50,
  // half the edge. Already applied to `dims.controls`; carried here so the token descriptions can name the share.
  radioDot?: RadioDotShare;
  // Strict interactive contrast (#1389, B4a). false (default): the inverse PRIMARY filled button
  // carries the vivid brand `on-fill` ink (#1244), which clears AA at `rest` but may dip below it on
  // the TRANSIENT hover / pressed states now that the fill steps toward the ground. true: primary's and
  // destructive's inverse `on-fill` swap to the neutral high-contrast extreme (near-black / near-white, the ink the
  // other families already use), so every interactive state clears AA — trading the brand-colored
  // label for guaranteed legibility. The per-state on-fill contract enforces the hover/pressed floor
  // only when this is on; `rest` is a hard floor either way.
  strictInteractiveContrast: boolean;
  // Extensible interactive palettes (docs/20 §3). Each declared palette is promoted to a full
  // `interactive.<name>.*` column (fill+states / on-fill / text / border / inverse / overlay),
  // anchored at `anchorStep` (default 500). The built-in primary/neutral/destructive columns are
  // always generated; these are the OPT-IN extras (the generalised `accentPalette`). Empty = none.
  interactivePalettes: InteractivePalette[];
  // Optional fill-step overrides for the built-in primary / destructive interactive columns —
  // when set, the rest fill anchors at this palette step instead of the role's resolved default.
  actionAnchorStep?: number;
  destructiveAnchorStep?: number;
  // Optional per-state link override (#1510) — pin how many rungs each engaged link state steps from the
  // resting link, floor-clamped; unset states keep the perceptual walk (#1486). See `LinkStateRungs`.
  linkStateRungs?: LinkStateRungs;
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
// A surface anchor. `'white'`/`'black'` are the pure extremes; a bare `number` is a NEUTRAL ramp step
// (the historical form — every corpus brand uses it, and it stays byte-identical). This is the type of
// `base` — the page ground — and it is deliberately NEUTRAL-ONLY: a brand-colored page ground is a
// separate, undesigned capability that no contract validates, so `base` never accepts a `{ palette, step }`.
export type SurfaceSpec = 'white' | 'black' | number;
// `{ palette, step }` (#898) names a NON-neutral, NON-status palette + step, so a brand's dark hero band
// can be brand navy or a custom deep accent rather than a near-black neutral. `palette` must be a declared
// palette that is not a status hue (success/warning/danger/info) — `surfacePaletteError` gates that; status
// is excluded because a page band in "success green" would use a semantic color decoratively (#898 decision).
export type SurfaceStep = { palette: string; step: number };
// The INVERSE band alone may widen to the palette form: neutral (`SurfaceSpec`) OR a brand/custom band.
export type InverseSurfaceSpec = SurfaceSpec | SurfaceStep;
// `inverseBase` anchors the INVERSE band — the dark hero / inverse section. It lives HERE, next to
// `base`, rather than being reached through the `overrides` map, and that placement is the whole fix
// in #956: **a ground is not a value.** Setting one has to re-derive everything measured against it,
// and only this layer runs early enough. `resolve()` feeds it to the same `bgLadder`/`fgLadder` pair
// `base` uses, so one number moves `inverse.background.*`, `inverse.foreground.*` and every one of
// the ~60 roles gated on the band together, each re-measured against where the band actually landed.
//
// The override post-pass structurally cannot do this: it runs after all derivation and rewrites a
// single role. Routed through it, an inverse band of `neutral 300` left 53 of 53 gated roles claiming
// contrast they did not have, and zero warnings — the flag is computed from the stale ratio, so
// allow-and-flag degraded to allow-and-silently-lie. `base` never had that defect precisely because
// it was always declared here; this gives the inverse band the same footing.
//
// The second and third TIERS of both ladders are declarable too (#1972), for the same reason: each is a
// ground that other roles are measured against. Unset, a tier is the ladder's own step off its anchor.
// The page tiers take the page's type (neutral-only) and the inverse tiers the inverse band's. A declared
// `secondary` also carries the contrast floor with it unless `floorStep` names one (see `modeConfigs`).
export type SurfaceMode = {
  base?: SurfaceSpec; floorStep?: number; inverseBase?: InverseSurfaceSpec;
  secondary?: SurfaceSpec; tertiary?: SurfaceSpec;
  inverseSecondary?: InverseSurfaceSpec; inverseTertiary?: InverseSurfaceSpec;
};
export type SurfacesConfig = { light?: SurfaceMode; dark?: SurfaceMode };

// ---------------------------------------------------------------------------
// White-label brand input -> Theme
// ---------------------------------------------------------------------------
export type BrandInput = {
  id: string;
  /** The brand's display name, as people read it (`Aurora`, `Harbor Fleet Services`) — #2859, owner decision Q509 A.
   *  Optional: unset, a reader that shows the brand by name uses `id` as written. No token emits from it, so the
   *  token contract does not move with it; today the plugin's library cover is its one reader. */
  name?: string;
  /** The single, mode-invariant token namespace. Every token emits under `<root>.*`
   *  (colour primitives at `<root>.core.palette`, semantic roles at `<root>.color`).
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
  /** Which palette drives the LINK colour (#1496). Defaults to FOLLOWING the action colour — an unset
   *  `linkPalette` resolves to whatever palette the action role resolves to: `actionPalette`, or
   *  `roleColors.action` when that rebases it (#1895).
   *  Set it to point links at `primary`, `neutral`, or a `brandColors` entry INDEPENDENTLY of the action
   *  palette (a brand whose CTA colour is not the right link colour). Whatever the choice, the link ink is
   *  still rated up to its own contrast floor. When the chosen palette is not colour-distinct from body
   *  text (e.g. `neutral`), the engine FLAGS in notes that links must be underlined for WCAG 1.4.1 (Use of
   *  Color) — a warning paired with `typography.links`, never a forced underline or a hard block. */
  linkPalette?: string;
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
   *  engine RE-DERIVES for that mode — `radius` (the radius scale, 0=sharp…1=default…2=soft), `tempo`,
   *  `density`, and the other `ModeLevers` axes (NOT `typeScale` — see ModeLevers). Customizable modes only
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
  /** Icon contrast floor. Default 'text' (icons mirror text, tier for tier). '3:1'
   *  resolves icons against the WCAG 1.4.11 non-text floor so they may diverge.
   *  The 'text' default is a deliberate decision, not an oversight — see the note on
   *  `iconContrast` in the resolved-theme type above before changing it. */
  iconContrast?: 'text' | '3:1';
  /** How an outline/text interactive control expresses hover (docs/20 §10). Default
   *  'overlay-neutral' (generate translucent `interactive.<color>.overlay.*` washes);
   *  'solid-tint' uses the control's own fill at an opacity-scale step instead
   *  (`interactive.<color>.subtle-fill.{hover,pressed,selected}`, #1614); 'opaque-fill' (#3071) an opaque palette
   *  step (`interactive.<color>.hover-fill.{hover,pressed}`, picked by `outlineHoverFill`), keeping the wash for
   *  Tag, Segmented control and Pagination; 'none' omits both. */
  outlineInteraction?: OutlineInteraction;
  /** The opaque outline hover fill's page step (#3071), per editable mode: `{ light: { hover: 'neutral.050' } }`.
   *  `pressed` defaults to the next step toward the ink. A mode not named, the inverse band and the generate-only
   *  modes take the default rule (the neutral step nearest 1.15:1 against the ground). Read only under 'opaque-fill'.
   *  #3335: `{ light: { sets: { primary: { hover: 'primary.050' } } } }` picks one button set's fill; the mode-wide
   *  pick is every other set's default. */
  outlineHoverFill?: OutlineHoverFill;
  /** The outline wash's opacity (#3335): `{ hover: 10, pressed: 20 }`, steps of the opacity scale, pressed above hover.
   *  The neutral wash defaults to 10/20 and the tinted wash to 20/30; under the tinted wash the pick is the step the
   *  engine starts from, still stepped for the label's floor and for visibility. Selected follows pressed. */
  outlineWash?: OutlineWash;
  /** Neutral interactive emphasis (docs/20 §10). 'subtle' (default) is a light-grey
   *  neutral fill; 'strong' is a bold near-black/near-white neutral fill. */
  neutralEmphasis?: 'subtle' | 'strong';
  /** The raised surface (#3049): what a dialog's panel, `color.foreground.raised`, sits on in light and hc-light.
   *  'card' (default) is the card surface, `foreground.primary`; 'page' is the page, `background.primary`; 'white'
   *  is the palette's white. Dark and hc-dark always take the card surface, so a dialog keeps its lift there. */
  raisedSurface?: RaisedSurface;
  /** The scrim's strength (#3050): how heavily `color.scrim.default`, the backdrop behind a dialog, dims the page.
   *  'standard' (default) is 40% light, 60% dark, 60% hc-light, 70% hc-dark; 'strong' is 80% light and dark and 90%
   *  in both high-contrast modes. It moves the alias to an existing `black-alpha` step; no token name changes. */
  scrimStrength?: ScrimStrength;
  /** The ground the page's secondary ink is fitted against (owner Q-TXT1 A). 'floor' (default): `text.secondary` and
   *  `icon.secondary` clear their bar on the contrast floor, `background.secondary` unless `floorStep` moves it, so
   *  they hold on every page tier down to it. 'page': they clear it on `background.primary` only, the lightest
   *  secondary that still passes on the page; on `background.secondary` they may fall below it. 'page' applies in
   *  light and dark; high contrast and the inverse band keep their floor. No token name changes. */
  secondaryTextGround?: SecondaryTextGround;
  /** Brand-added glass roles (#3073): `color.glass.<name>`, each a semantic role's palette color (`role`, per mode)
   *  or one palette color (`palette`), at `alpha` percent. `surface` is the shipped glass and cannot be redefined. */
  glassRoles?: Record<string, GlassRoleInput>;
  /** The radio dot (#3086, owner Q816 A): the checked radio's dot as a share of the radio's size, in percent, at sm, md and
   *  lg alike. 50 (default) is half the box edge, today's dot. Snapped to the 2px sub-grid and never wider than the box
   *  minus its 2px ring. It moves the value of `control.size.{sm,md,lg}.dot` only; no token is added. */
  radioDot?: RadioDotShare;
  /** Strict interactive contrast (#1389, B4a). OPTIONAL, OPT-IN (off by default). The inverse filled
   *  button steps its fill per state; the primary and destructive labels' brand ink (#1244/#1384) clears AA at
   *  `rest` but dips on the transient hover/pressed steps. Off keeps the brand ink (rest AA held, later states
   *  exempt). `true` swaps the primary and destructive inverse `on-fill` to the neutral high-contrast extreme so every
   *  state clears AA, trading brand color for guaranteed legibility. */
  strictInteractiveContrast?: boolean;
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
  /** Optional per-state link override (#1510). Pin how far each ENGAGED link state — `hover`, `pressed`,
   *  `visited` — steps from the resting link, independently of the others: the value is a RUNG COUNT (how
   *  many floor-clearing steps past `default` that state sits, along the engagement direction). An unset
   *  state keeps the tuned perceptual walk (#1486); `default`/`focused` are the resting link (moved by the
   *  action palette / anchor, not here). Each override is FLOOR-CLAMPED through the same walk as the tuned
   *  ladder, so it can respace a link state but never drop it below its 4.5:1 contract. A rung count, not an
   *  absolute step, because a link's engagement direction flips between the page and the inverse band —
   *  see `LinkStateRungs`. Omit for the tuned default walk (byte-identical to today). */
  linkStateRungs?: LinkStateRungs;
  /** Motion personality (schema-optional #6). `tempo` scales the duration ramp;
   *  The six curves are fixed; `easingRoles` picks which one a role uses. Reduce-motion variants are
   *  always derived. Omit for the 'standard' tempo. */
  motionPersonality?: MotionPersonality;
  /** Typography axis lever. `families` supply the face each text CATEGORY draws from (a
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
  layout?: { breakpoints?: number[]; columns?: number; containerMax?: number; containerNarrow?: number;
    /** Per-breakpoint column OVERRIDES, keyed by breakpoint name (`sm`/`md`/… — the same names
     *  `buildLayout` assigns from the count). A set entry wins over the 4/8/…/base ladder for that
     *  breakpoint; an unset breakpoint keeps the ladder value. Clamped to the base `columns` slider
     *  bounds (4..24, rounded) so an out-of-range authored value can never emit a degenerate grid. */
    columnOverrides?: Record<string, number>;
    /** Per-breakpoint GUTTER / MARGIN OVERRIDES, keyed by breakpoint name (like `columnOverrides`).
     *  A set entry wins over the `GUTTER_PX` / `MARGIN_PX` ladder for that breakpoint; an unset one
     *  keeps the ladder value. Unlike columns, a set value is validated ON-LADDER (THROW off-ladder,
     *  #1593): gutter/margin emit as aliases to `space/*` (`grid/gutter`·`grid/margin`), so a value
     *  MUST be a real spacing-scale step (px) or the alias would have no space token to point at.
     *  The scale reaches down to `space/050`=4px (and `025`/`0`), which is how a 4px mobile gutter
     *  becomes reachable rather than flooring at the derived 16px. */
    gutterOverrides?: Record<string, number>;
    marginOverrides?: Record<string, number> };
  /** Gradient axis lever — OPT-IN (off by default; most systems abstain and
   *  gradients are contextual). `true` ships one default brand gradient
   *  (primary.600→primary.350, linear); an explicit array ships exactly those;
   *  `false`/omitted is off. Stop colours alias the colour ramp; OKLCH interp by
   *  default. (`false` is accepted so a UI toggle can write a plain boolean — the
   *  `buildGradient` `!spec` guard reads it as off, same as omitted.) */
  gradients?: boolean | GradientInput[];
  /** Dimension axis levers (schema-required #4/#5). Defaults reproduce a
   *  conventional 4px-grid / 8px-rhythm, sharp-corner system. */
  density?: Density;                 // default 'comfortable' (drives component sizes)
  radiusScale?: number;              // 0=sharp … 1=default … 2=soft, default 1
  baseMd?: number;                   // radius.md anchor (px) at scale 1, default 4
  controlShape?: ControlShape;       // 'rounded' (default) | 'pill' | 'boxed' | 'hairline' — corner shape for pill-able controls (#1371)
  fieldStyle?: FieldStyle;           // 'outline' (default) | 'underline' — the edge every field component draws (#2695)
  searchFieldStyle?: SearchFieldStyle; // 'follow' (default) | 'outline' | 'underline' — the search field's own edge (#2888)
  tagStyle?: TagStyle;               // 'pill' (default) | 'underline' — the shape every tag draws (#2887)
  dialogTitleSize?: DialogTitleSize; // 'large' (default) | 'medium' | 'small' — the title size of every dialog (#2958)
  bannerStyle?: BannerStyle;         // 'tinted' (default) | 'outlined' — the surface every banner draws (#2924)
  currentIndicator?: CurrentIndicator; // 'partial' (default, Q10 B) | 'full' — the current page's 2px bar: the title's width, or half of it centered (#3345)
  /** RETIRED (#2053, owner 2026-10-04). `radius.hairline` (1px) is always emitted, so this changes nothing.
   *  Still ACCEPTED, so brand files that set it keep loading; a note says it is ignored. It was the opt-in
   *  for that rung (#1362): the scaled ramp rides an even 2px sub-grid, so 1px is otherwise unreachable. */
  radiusHairline?: boolean;
  /** Button-family FORM levers (#1667) — materialized into the button defs before projection
   *  (`applyButtonLayout`); they emit no token and move no token name. `buttonIcons`: 'attached' (default,
   *  icons next to the label) | 'edges' (icons pinned to the edges, the label centered in the space
   *  between). `buttonContentSize`: 'match' (default) | 'smaller' (medium binds small's label and icon).
   *  `buttonMinWidthMultiplier`: a button's minimum width is height × this, rounded up to the 8px grid
   *  (default 2.25, Spectrum's multiplier). */
  buttonIcons?: ButtonIcons;
  buttonContentSize?: ButtonContentSize;
  buttonMinWidthMultiplier?: number;
  /** #1752 — the button label's weight role, and since #2945 (owner Q591 A, "Control label weight") the tag
   *  label's too; the key keeps its #1752 name (Q591.2 A): 'emphasis' (default, `type.label.*.emphasis`) | 'default'
   *  (`type.label.*.default`). Materialized by `applyButtonLayout` like the three above, and composes with
   *  `buttonContentSize: 'smaller'` (a medium button then binds `type.label.sm.default`). Unlike them it can
   *  ADD token paths: under 'default' the label category ships the `default` role (unioned into
   *  `typography.weights.label` in `brandTheme`), so the binding always names a style the brand emits. */
  buttonLabelWeight?: ButtonLabelWeight;
  /** #2324 — "Text button hover": 'text' (default, "Text & icon only": the label and icon change color) | 'fill'
   *  (the container also takes the overlay wash on hover and pressed, never at rest). Materialized by
   *  `applyButtonLayout` like the levers above; it emits no token and moves no token name. */
  buttonTextHover?: ButtonTextHover;
};

/**
 * The AUTHORING surface (#471) — what a human or agent may write — as distinct from `BrandInput`,
 * which is the validated IR everything downstream consumes.
 *
 * The distinction is the whole reason the vocabulary layer is safe to add. Authors may write a
 * named stop (`radiusScale: 'soft'`) or a cross-cutting `personality`; `resolveVocabulary` narrows
 * both away at the top of `brandTheme`, so every consumer past that line still sees plain numbers
 * and needs no awareness that a word was ever involved. Widening `BrandInput` itself instead would
 * have pushed `number | string` through hundreds of arithmetic call sites — a type that lies about
 * a value that is, by then, always a number.
 *
 * `BrandInput` is assignable to this, so every existing caller keeps working unchanged.
 *
 * Scope limit worth stating: stops resolve on TOP-LEVEL levers only. `modeLevers.<mode>.radiusScale`
 * still takes a number, because a per-mode deviation is a precision instrument — reaching for one
 * means you know the value you want.
 */
export type BrandInputAuthored =
  Omit<BrandInput, 'neutral' | 'radiusScale' | 'shadow' | 'layout'> & {
    neutral: { hue: number | string; chroma: number | string; anchor?: OKLCH; auto?: boolean };
    radiusScale?: number | string;
    shadow?: { softness?: number | string; tint?: { hue?: number; amount?: number } };
    layout?: { breakpoints?: number[]; columns?: number; containerMax?: number | string; containerNarrow?: number | string; columnOverrides?: Record<string, number>; gutterOverrides?: Record<string, number>; marginOverrides?: Record<string, number> };
    /** Cross-cutting brand traits, resolved by `vocabulary.ts`. Fills only levers left absent. */
    personality?: string[];
  };

/** Note prose prints input numbers compactly (#2242). The notes ship (every brand's `$extensions.prism3.decisions`,
 *  the reports), and an input can carry full converter precision. `n2` is for hues and the other numbers, `n4` for lightness and chroma: the
 *  precision the corpus already printed, with no trailing zeros (262.10 reads 262.1). */
export const n2 = (x: number): number => +x.toFixed(2);
export const n4 = (x: number): number => +x.toFixed(4);
