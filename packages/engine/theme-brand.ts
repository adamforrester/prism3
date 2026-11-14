/** Prism3 engine — `brandTheme`: the white-label path. It validates a `BrandInput`, builds its palettes and roles, and
 *  composes every axis into one `Theme`.
 *
 *  Split out of `theme.ts` (#3698 R5), which re-exports its public names unchanged.
 */
import { generateRamp, autoPlaceStep, type Step } from './ramp';
import { radiusScale, componentSizes, type RadiusStep, type SizeStep, controlSizes, type ControlSizeStep, RADIO_DOT_SHARES, RADIO_DOT_DEFAULT, type RadioDotShare, SPACE_BASE, GRID_BASE } from './scale';
import { inGamut, maxChroma, deltaE2000, ACHROMATIC_C } from './color';
import type { ModeName } from './modes';
import { resolveVocabulary } from './vocabulary';
import { type BrandInputAuthored, type Theme, type BrandInput, ALL_MODES, VALID_MODES, validOutlineHoverFill, validOutlineWash, outlineWashSteps, OUTLINE_INTERACTION_VALUES, RAISED_SURFACE_VALUES, SCRIM_STRENGTH_VALUES, SECONDARY_TEXT_GROUND_VALUES, validGlassRoles, n2, n4, type PaletteBuild, type Role, type InteractivePalette, type InverseSurfaceSpec, type SurfaceStep, CORE_TIER } from './theme-types';
import { PALETTE_NAME_RE, RESERVED_PALETTES, STATUS_DEFAULTS, statusRamp, inRedTerritory, hueDist, RED_CHROMA_FLOOR, normalizeDisabledStrategy, normalizeDisabledMin } from './theme-color';
import { buildDims } from './theme-dims';
import { buildMotion, type MotionAxis } from './theme-motion';
import { LINE_HEIGHT_KEYS, LETTER_SPACING_KEYS, DISPLAY_VARIANTS, buildTypography, withLabelDefault, WEIGHT_ROLE_DEFAULT, type FontFamilyBinding, type WeightRole, deriveFamilies, WEIGHT_ROLE_ORDER, type TypeGroup, deriveTypefaces, PER_MODE_SIZE_GROUPS, type PerModeSizeGroup, HEADING_SIZE_FLOOR, mobileEndpoint, TYPE_GROUPS } from './theme-type';
import { buildShadow, type ShadowAxis, type ShadowStep, type ShadowLayer } from './theme-shadow';
import { buildLayout, gridGapNotes } from './theme-layout';
import { buildGradient } from './theme-gradient';

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

export const brandTheme = (brandInput: BrandInputAuthored): Theme => {
  const notes: string[] = [];
  // Descriptive vocabulary (#471) resolves FIRST, so everything downstream sees plain lever values
  // and needs no awareness that a word was ever involved. Named stops (`radiusScale: 'soft'`) become
  // numbers; `personality` traits fill levers the brief left absent, never one it set. Each
  // inference lands in `notes` alongside the engine's own defaults — the whole point is that a
  // choice made FOR the author is as visible as one they made themselves.
  const resolved = resolveVocabulary(brandInput);
  const input = resolved.input as BrandInput;
  notes.push(...resolved.notes);
  const root = input.root ?? 'prism';
  // Single lowercase segment — enforce the "no two-segment namespaces" contract here
  // too (not only in the schema), since brandTheme is also called with in-memory
  // BrandInput that never touched schema validation (the web app builds it directly).
  if (!/^[a-z][a-z0-9-]*$/.test(root)) {
    throw new Error(`root namespace '${root}' must be a single lowercase segment (letters/digits/hyphen, no dots or spaces)`);
  }
  // RESERVED ROOTS (#1283) ARE NOT CHECKED HERE, AND THE OMISSION IS THE DESIGN — DO NOT ADD IT BACK.
  //
  // `prism` and `pds3` are held for a future canonical default theme, and no brand this repo SHIPS may
  // root at either. That is a naming policy over the published catalog, and the first cut of #1283
  // enforced it right here, on `input.root`. Wrong scope, three ways: it refused the ~235 harness
  // fixtures that spell `root: 'prism'` for clarity, it made a policy about four example brands into a
  // validation every host and client caller passes through, and it could not have covered the brand
  // that actually needed covering — wendys declared no root at all and reached `prism` through the
  // fallback one line above, which no check on `input.root` can see.
  //
  // The check lives in `test.ts`'s #1283 block instead and keys off the SHIPPED BRAND CATALOG: every
  // committed `out/<id>.tokens.json`, read for the root it actually emitted. See `RESERVED_ROOTS`.
  // Appearance modes — light is the required base; dark/HC are opt-in. Validate here too
  // (in-memory BrandInput skips schema validation).
  const modes = input.modes ?? ALL_MODES;
  const badMode = modes.find((m) => !VALID_MODES.includes(m));
  if (badMode) throw new Error(`unknown mode '${badMode}' (valid: ${VALID_MODES.join(', ')})`);
  if (!modes.includes('light')) throw new Error('modes must include "light" (the required base mode)');
  // Note only the default (light/dark/HC) opt-out; wireframe is an opt-IN addition, noted separately.
  const stdModes = modes.filter((m) => m !== 'wireframe');
  // Note copy (#1883): every string pushed to `notes` ships — `theme.notes`, the MCP `theme_brand`
  // result, the emitted tree's `decisions`, and the studio's Decisions log — so it is written to the
  // voice standard's UI register: what the engine decided, then why, with no issue numbers, no
  // all-caps, no maintainer jargon. Provenance stays in the comments beside each push. `lint-voice.ts`
  // (DECISIONS LOG arm) renders every producer below and fails any note that drifts back.
  if (stdModes.length < ALL_MODES.length) notes.push(`modes: ${stdModes.join(', ')} only — the brand turns off ${ALL_MODES.filter((m) => !stdModes.includes(m)).join(', ')}.`);
  if (modes.includes('wireframe')) notes.push('modes: wireframe added — a grayscale mode: each color role takes its neutral equivalent, and every radius is 0.');
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
  if (customModes.length) notes.push(`custom modes: ${customModes.map((cm) => `${cm.name} (based on ${cm.base})`).join(', ')} — each rebuilds from its base on every build; overrides and modeAnchors adjust it.`);
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
  const outlineHoverFill = validOutlineHoverFill(input.outlineHoverFill, modesAll, CUSTOMIZABLE_MODES);
  if (outlineHoverFill && input.outlineInteraction !== 'opaque-fill')
    notes.push(`outlineHoverFill: set, and read only under outlineInteraction: opaque-fill; this brand's outline hover is '${input.outlineInteraction ?? 'overlay-neutral'}', so the picks are ignored.`);
  const outlineWash = validOutlineWash(input.outlineWash);
  // One step given: the other is the method's default, which must still leave pressed above hover.
  const washAt = outlineWashSteps(input.outlineInteraction ?? 'overlay-neutral', outlineWash);
  if (outlineWash && washAt && washAt.pressed <= washAt.hover)
    throw new Error(`outlineWash: pressed ${washAt.pressed} must be above hover ${washAt.hover} under '${input.outlineInteraction ?? 'overlay-neutral'}', so a press reads as coming forward (an unset step is the method's default, or the step above hover; 40 has none above it)`);
  if (outlineWash && input.outlineInteraction === 'none')
    notes.push(`outlineWash: set, and read only under a wash; this brand's outline hover is 'none', so the opacity is ignored.`);
  if (Object.keys(input.overrides ?? {}).length) notes.push(`overrides: color overrides in ${Object.keys(input.overrides!).join(', ')} — those roles point at the chosen ramp steps; a pick below its contrast floor is warned, not blocked.`);
  // Per-mode interactive anchors (A2b) — same customizable-mode rule as overrides. An anchor
  // re-derives the whole interactive column for that mode (still floor-gated via `chromatic`).
  for (const m of Object.keys(input.modeAnchors ?? {}) as ModeName[]) {
    if (!modesAll.includes(m))
      throw new Error(`modeAnchors: mode '${m}' is not in this brand's modes (${modesAll.join(', ')})`);
    if (!CUSTOMIZABLE_MODES.includes(m))
      throw new Error(`modeAnchors: mode '${m}' is generate-only and not customizable — only ${CUSTOMIZABLE_MODES.join('/')} accept per-mode anchors`);
  }
  if (Object.keys(input.modeAnchors ?? {}).length) notes.push(`modeAnchors: an interactive fill anchored per mode in ${Object.keys(input.modeAnchors!).join(', ')} — the contrast floor still applies.`);
  // Per-mode LEVER overrides (Phase D) — a customizable mode may override a non-colour axis lever
  // (radius, tempo, density, and the other ModeLevers axes — NOT typeScale, see ModeLevers). SAME customizable-mode rule as
  // overrides/modeAnchors: the mode must be generated AND customizable (light/dark/custom); the
  // generate-only built-ins (hc-light/hc-dark/wireframe) and absent modes throw. A `radius` lever
  // must be a finite number in the lever's [0, 2] range.
  // Shared with the GLOBAL lever check below (#332) — the per-mode value deviates from the global
  // one, so both must accept exactly the same set; one array, not two copies that can drift apart.
  const MOTION_TEMPO_VALUES = ['snappy', 'standard', 'relaxed'] as const;
  const DENSITY_VALUES = ['comfortable', 'compact', 'spacious'] as const;
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
    if (lev.tempo !== undefined && !(MOTION_TEMPO_VALUES as readonly string[]).includes(lev.tempo))
      throw new Error(`modeLevers: mode '${m}' tempo '${lev.tempo}' is invalid — must be one of ${MOTION_TEMPO_VALUES.join('/')}`);
    // Per-mode shadow must stay in the global lever's ranges — softness [0, 2], tint hue [0, 360],
    // tint amount [0, 1] (same bounds as the shadow lever + the shadow-tint object lever).
    if (lev.shadow?.softness !== undefined && (!Number.isFinite(lev.shadow.softness) || lev.shadow.softness < 0 || lev.shadow.softness > 2))
      throw new Error(`modeLevers: mode '${m}' shadow softness ${lev.shadow.softness} is out of range — must be a finite number in [0, 2]`);
    if (lev.shadow?.tint?.hue !== undefined && (!Number.isFinite(lev.shadow.tint.hue) || lev.shadow.tint.hue < 0 || lev.shadow.tint.hue > 360))
      throw new Error(`modeLevers: mode '${m}' shadow tint hue ${lev.shadow.tint.hue} is out of range — must be a finite number in [0, 360]`);
    if (lev.shadow?.tint?.amount !== undefined && (!Number.isFinite(lev.shadow.tint.amount) || lev.shadow.tint.amount < 0 || lev.shadow.tint.amount > 1))
      throw new Error(`modeLevers: mode '${m}' shadow tint amount ${lev.shadow.tint.amount} is out of range — must be a finite number in [0, 1]`);
    // Per-mode density must be one of the three density tiers (the same set as the global lever).
    if (lev.density !== undefined && !(DENSITY_VALUES as readonly string[]).includes(lev.density))
      throw new Error(`modeLevers: mode '${m}' density '${lev.density}' is invalid — must be one of ${DENSITY_VALUES.join('/')}`);
  }
  const leverModes = Object.entries(input.modeLevers ?? {}).filter(([, l]) => l && (l.radius !== undefined || l.families || l.weights || l.lineHeights || l.letterSpacings || l.tempo || l.shadow || l.density)).map(([m]) => m);
  if (leverModes.length) notes.push(`modeLevers: global levers overridden in ${leverModes.join(', ')} (radius, font family, weight, line height, letter spacing, motion tempo, shadow, density) — rebuilt the same way as the base; the token set is unchanged.`);

  // #332 — GLOBAL lever validation (enum + declared numeric range), covering every lever the modeLevers
  // checks above did NOT already cover for its own per-mode counterpart (tempo/density/shadow.softness
  // were already gated per-mode but never on the GLOBAL lever the per-mode value deviates from).
  //
  // WHY HERE, not at each caller: brandTheme() is the one choke point every entry path already goes
  // through — the CLI (`cli.ts`, which ALSO runs the file-based `validateOrExit` schema check first),
  // the MCP tool surface, the web playground, and `standardToBrandInput`'s `x-prism3` ingest (which
  // hands its result straight to this function, never validates it itself). Only `emit-dtcg.ts`'s
  // `validateBrandInput` ran the full `theme-schema.json` contract, and only file-driven CLI input ever
  // reached it — an in-memory BrandInput built by the web UI or an MCP call skipped it entirely. That
  // is how `typeScale: 'gigantic'` reached `TYPE_SCALE_SHIFT['gigantic']` (`undefined`, silently
  // propagated into every display/title/eyebrow composite's size) and `radiusScale: 47` reached
  // `radiusScale(47, 4, 128)` (`radius.md` = 188px against a manifest-declared max of 2) without
  // either ever throwing — the theme "built successfully" with corrupted output. `density: 'roomy'`
  // is the third shape: `DENSITY_START['roomy']` is `undefined`, so `componentSizes` throws a few
  // frames downstream reading `.x` off `undefined` — an *accepted* value that still breaks, just
  // later and with a worse error than a lever-name-and-valid-set message would give.
  //
  // NOT re-run against `theme-schema.json` itself (`validateBrandInput` in `emit-dtcg.ts`): that
  // module does Node file I/O (`readFileSync` of the schema) and imports `brandTheme` FROM this
  // module already, so importing it back here would be a real import cycle, not just an unwanted
  // dependency — and `theme.ts` is deliberately I/O-free (docs/07 §3's pure-core / I/O-shell split;
  // the plugin/web hosts bundle this file into a browser/Figma sandbox with no filesystem). Hand-rolled
  // checks, hardcoded here, are the same choice this function already made for `root`/`modes`/
  // `customModes`/`overrides`/`modeAnchors`/`modeLevers` above — this is that same pattern extended to
  // the levers it had not yet reached.
  //
  // SCOPE, and the two deliberate exclusions: this covers every lever `levers.ts` marks `control:
  // 'enum'` (nine total) and every `control: 'slider'` lever with a declared `[min, max]` EXCEPT —
  //   · `disabledMin` — already has its own, different, pre-existing policy (CLAMP, not reject) via
  //     `normalizeDisabledMin`, documented in the schema itself ("Clamped to 3–4.5"). Changing an
  //     already-shipped, already-documented clamp to a throw is a behavior change this issue did not
  //     ask for; left untouched.
  //   · `neutral.hue` — the schema's own `neutral.hue` number branch declares no `minimum`/`maximum`
  //     (unlike `neutral.chroma`, which declares `"minimum": 0`), and every hue consumer downstream
  //     (`oklchToRgb` et al.) resolves it through `cos`/`sin`, which is exact for any real degree value
  //     — 380° and 20° render identically. The manifest's [0, 360] is a color-picker UI convenience,
  //     not a domain boundary, so rejecting a technically-redundant-but-harmless hue would be a false
  //     positive, not a bug fix. `shadow.tint.hue`/`layout.breakpoints`/`weightRoles` etc. are likewise
  //     left alone: none has a `control: 'slider'` + declared range in `levers.ts` (they're `object`/
  //     `list`), so they're outside this fix's stated scope (full manifest of ENUM + declared-range
  //     SLIDER levers), not an oversight.
  //
  // Numeric levers here are REJECTED, not clamped, on an out-of-range value — the opposite choice from
  // `disabledMin` above, and deliberately so: the issue's own framing is that the manifest's min/max
  // "were never the gate," i.e. never enforced at all, so making them real means making them binding.
  // A silent clamp would still ship *a* value for `radiusScale: 47` — just a quieter wrong one — and
  // the corruption this issue reports is exactly a value nobody chose reaching the token tree unnoticed.
  // Rejecting also matches the enum levers' behavior for consistency: one policy ("bad input stops the
  // build with a clear diagnosis"), not two.
  const enumLevers: { path: string; value: unknown; options: readonly (string | number)[] }[] = [
    { path: 'density', value: input.density, options: DENSITY_VALUES },
    { path: 'controlShape', value: input.controlShape, options: ['rounded', 'pill', 'boxed', 'hairline'] },
    { path: 'fieldStyle', value: input.fieldStyle, options: ['outline', 'underline'] },
    { path: 'searchFieldStyle', value: input.searchFieldStyle, options: ['follow', 'outline', 'underline'] },
    { path: 'tagStyle', value: input.tagStyle, options: ['pill', 'underline'] },
    { path: 'dialogTitleSize', value: input.dialogTitleSize, options: ['large', 'medium', 'small'] },
    { path: 'bannerStyle', value: input.bannerStyle, options: ['tinted', 'outlined'] },
    { path: 'currentIndicator', value: input.currentIndicator, options: ['full', 'partial'] },
    { path: 'buttonIcons', value: input.buttonIcons, options: ['attached', 'edges'] },
    { path: 'buttonContentSize', value: input.buttonContentSize, options: ['match', 'smaller'] },
    { path: 'buttonLabelWeight', value: input.buttonLabelWeight, options: ['default', 'emphasis'] },
    { path: 'buttonTextHover', value: input.buttonTextHover, options: ['text', 'fill'] },
    { path: 'typography.typeScale', value: input.typography?.typeScale, options: ['compact', 'default', 'expressive'] },
    { path: 'typography.displayCeiling', value: input.typography?.displayCeiling, options: DISPLAY_VARIANTS },
    { path: 'typography.titleFloor', value: input.typography?.titleFloor, options: [16, 18] },
    { path: 'typography.captionFloor', value: input.typography?.captionFloor, options: [10, 11] },
    { path: 'typography.sizeFloor', value: input.typography?.sizeFloor, options: [8, 10] },
    { path: 'motionPersonality.tempo', value: input.motionPersonality?.tempo, options: MOTION_TEMPO_VALUES },
    { path: 'iconContrast', value: input.iconContrast, options: ['text', '3:1'] },
    { path: 'disabledStrategy', value: input.disabledStrategy, options: ['full', 'reduced', 'accessible', 'conventional'] },
    { path: 'outlineInteraction', value: input.outlineInteraction, options: OUTLINE_INTERACTION_VALUES },
    { path: 'neutralEmphasis', value: input.neutralEmphasis, options: ['subtle', 'strong'] },
    { path: 'raisedSurface', value: input.raisedSurface, options: RAISED_SURFACE_VALUES },
    { path: 'scrimStrength', value: input.scrimStrength, options: SCRIM_STRENGTH_VALUES },
    { path: 'secondaryTextGround', value: input.secondaryTextGround, options: SECONDARY_TEXT_GROUND_VALUES },
    { path: 'radioDot', value: input.radioDot, options: RADIO_DOT_SHARES },
  ];
  for (const { path, value, options } of enumLevers) {
    if (value !== undefined && !(options as readonly unknown[]).includes(value))
      throw new Error(`${path}: ${JSON.stringify(value)} is invalid — must be one of ${options.join('/')}`);
  }
  const glassRoles = validGlassRoles(input.glassRoles);
  const rangeLevers: { path: string; value: unknown; min: number; max: number }[] = [
    { path: 'radiusScale', value: input.radiusScale, min: 0, max: 2 },
    { path: 'baseMd', value: input.baseMd, min: 2, max: 12 },
    { path: 'buttonMinWidthMultiplier', value: input.buttonMinWidthMultiplier, min: 1, max: 4 },
    { path: 'shadow.softness', value: input.shadow?.softness, min: 0, max: 2 },
    { path: 'layout.columns', value: input.layout?.columns, min: 4, max: 24 },
    { path: 'layout.containerMax', value: input.layout?.containerMax, min: 960, max: 1920 },
    { path: 'layout.containerNarrow', value: input.layout?.containerNarrow, min: 480, max: 960 },
    { path: 'neutral.chroma', value: input.neutral.chroma, min: 0, max: 0.03 },
  ];
  for (const { path, value, min, max } of rangeLevers) {
    if (value === undefined) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
      throw new Error(`${path}: ${JSON.stringify(value)} is out of range — must be a finite number in [${min}, ${max}]`);
  }

  if (root !== 'prism') notes.push(`namespace: tokens emit under '${root}.*' instead of the default 'prism.*'.`);
  const anchorStep = autoPlaceStep(input.primary.l);
  notes.push(`primary: the brand color is pinned at step ${anchorStep} (${input.primary.c < ACHROMATIC_C ? 'no hue' : `hue ${n2(input.primary.h)}`}) — the ramp is built around it.`);

  // M-03: a pinned anchor whose chroma is out of sRGB gamut can't be rendered exactly — the
  // engine clamps toward the boundary, which silently nudges lightness AND hue (independent-
  // channel clip). Surface it in the decisions log so the shift isn't invisible (the designer
  // can lower the chroma). Rendering is unchanged here; a constant-hue chroma projection is the
  // available upgrade (needs an all-emitter regen incl. emit-figma — see docs/00).
  const gamutNote = (name: string, o: { l: number; c: number; h: number }) => {
    if (inGamut(o)) return;
    const mc = Math.round(maxChroma(o.l, o.h, o.c) * 1000) / 1000;
    notes.push(`anchor '${name}' (oklch ${n4(o.l)} ${n4(o.c)} ${n2(o.h)}) is outside the sRGB gamut — sRGB shows at most ${mc} chroma (±0.0005) at this lightness and hue, so it ships clamped and its lightness and hue can shift. A chroma at least 0.0005 below ${mc} ships exactly.`);
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
  // A hue-less primary (a gray, chroma below ACHROMATIC_C, #2241): its stored hue 0 is not a hue, so nothing may read it
  // as one. Follow primary then has no hue to follow, so the neutral is gray, chroma 0 (owner Q87 A), which also leaves
  // the shadow untinted through Q73 A's rule below. A pin still wins over Follow primary.
  const primaryHueless = input.primary.c < ACHROMATIC_C;
  const neutralChroma = input.neutral.auto && primaryHueless ? 0 : input.neutral.chroma;
  // The hue that actually builds the neutral ramp (#2184, owner decision 2026-10-06): the pinned gray's
  // when one is pinned, else `nHue` — the primary's under Follow primary, the custom tint otherwise. One
  // binding for the ramp AND the shadow tint's default, so the shadow cannot follow a stored
  // `neutral.hue` the ramp is not using (which it did under Follow primary and under a pinned gray).
  const neutralRampHue = nAnchor ? nAnchor.h : nHue;
  // A pure-gray pin (r = g = b) has NO hue: its chroma is ~1e-8 and the converter reports noise (~89.88°, #2241).
  // The ramp cannot show that noise at chroma ~0, but a shadow tint would (olive, ΔE00 2.23). So the shadow's
  // default is null below ACHROMATIC_C, read off the CHROMA, never off the noise hue (owner Q58 B, 2026-10-06).
  // ACHROMATIC_C (color.ts, #2241) is the same no-hue line the converter draws: one definition of "this gray has no hue".
  // ANY gray ramp, not only a pin (owner Q73 A): a Custom tint or Follow primary at `neutral.chroma` 0 builds a
  // gray ramp too, so the guard reads the chroma that BUILDS the ramp, the pin's or `neutral.chroma`.
  const neutralRampChroma = nAnchor ? nAnchor.c : neutralChroma;
  const shadowTintDefault = neutralRampChroma < ACHROMATIC_C ? null : neutralRampHue;
  const neutralSteps = nAnchor
    ? generateRamp({ hue: neutralRampHue, chroma: nAnchor.c, anchor: { oklch: nAnchor, stepNum: autoPlaceStep(nAnchor.l) } })
    : generateRamp({ hue: neutralRampHue, chroma: neutralChroma });
  if (nAnchor) notes.push(`neutral: pinned to the brand's gray (lightness ${n4(nAnchor.l)}) at step ${autoPlaceStep(nAnchor.l)} — the ramp is built from that gray, not from a hue and chroma.`);
  else if (input.neutral.auto) notes.push(primaryHueless
    ? `neutral: the grays follow the primary, which has no hue, so they are gray.`
    : `neutral: the grays follow the primary hue (${Math.round(input.primary.h)}) — change the brand color and the grays follow.`);

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
    notes.push(`brand color: '${bc.name}' added (${bc.oklch.c < ACHROMATIC_C ? 'no hue' : `hue ${n2(bc.oklch.h)}`}).`);
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
      ? `${k}: the brand's hue ${n2(s.h)} — the ramp is built from its hue and chroma, not pinned at its lightness, so the exact swatch may not appear.`
      : `${k}: default hue ${n2(s.h)} — status.${k} is not set.`);
    return { palette: k, role: k as Role, description: `${k} status`, hueSource: supplied ? 'brand' as const : 'default' as const, steps: statusRamp(s.h, s.chroma) };
  };
  palettes.push(status('success'), status('warning'), status('info'));

  // ---- action role (decoupled from brand) ----
  const actionPalette = input.actionPalette ?? 'primary';
  if (!palettes.some((p) => p.palette === actionPalette)) {
    throw new Error(`actionPalette '${actionPalette}' is not a defined palette (have: ${palettes.map((p) => p.palette).join(', ')})`);
  }
  notes.push(actionPalette === 'primary'
    ? `action: the primary palette, by default — actionPalette is not set.`
    : `action: uses the '${actionPalette}' palette instead of primary, as the brand sets.`);

  // ---- danger carve ----
  const roleToPalette: Record<Role, string> = {
    brand: 'primary', neutral: 'neutral', success: 'success', warning: 'warning', danger: 'danger', info: 'info', action: actionPalette,
  };
  if (input.roleColors?.danger) {
    // Explicit rebasing (docs/21) wins over the carve heuristic — the general roleColors
    // pass below sets roleToPalette.danger; skip the carve/synth so no orphan danger ramp is minted.
  } else if (input.status?.danger) {
    palettes.push({ palette: 'danger', role: 'danger', description: 'danger status (brand-supplied)', hueSource: 'brand', steps: statusRamp(input.status.danger.h, input.status.danger.chroma) });
    notes.push(`danger: the brand's hue ${n2(input.status.danger.h)}.`);
  } else if (inRedTerritory(input.primary.h, input.primary.c)) {
    // The brand's own colour IS a saturated red — seed danger FROM the primary ramp rather than
    // synthesising a near-duplicate red. But mint it as its own `danger` palette (a deep copy of
    // primary's steps), NOT a pointer at `primary`: keeping a stable `palette.danger.*` namespace
    // means the semantic danger tokens always alias `{…danger.<step>}`, so switching danger to a
    // distinct colour later re-seeds ONE ramp instead of re-aliasing every danger consumer. The
    // redundancy (danger ≈ primary while shared) is the deliberate price for that stable contract,
    // and it makes the red case consistent with the carve case (which already mints `danger`).
    const primarySteps = palettes.find((p) => p.palette === 'primary')!.steps;
    palettes.push({ palette: 'danger', role: 'danger', description: 'danger status (seeded from the red brand primary — its own ramp so danger stays re-pointable)', hueSource: 'brand', steps: primarySteps.map((s) => ({ ...s, oklch: { ...s.oklch }, rgb: { ...s.rgb } })) });
    notes.push(`danger: the primary (hue ${n2(input.primary.h)}, chroma ${n4(input.primary.c)}) is a saturated red, so danger reuses its ramp as a separate palette — danger can still be repointed on its own.`);
  } else {
    // Primary is not a saturated red, so carve a dedicated danger red the brand never gave us.
    const d = STATUS_DEFAULTS.danger;
    palettes.push({ palette: 'danger', role: 'danger', description: 'danger status', generated: 'red', hueSource: 'default', steps: statusRamp(d.h, d.chroma) });
    // Distinguish the two carve reasons (M-05): a red-ish-but-greige primary must NOT be reused
    // for danger (a near-grey can't signal destruction), even though its hue is in the window.
    const hueIsRed = hueDist(input.primary.h, STATUS_DEFAULTS.danger.h) <= 20;
    notes.push(primaryHueless
      ? `danger: the primary has no hue, so danger gets its own red at hue ${d.h}.`
      : hueIsRed
      ? `danger: the primary (hue ${n2(input.primary.h)}) is reddish, but its chroma ${n4(input.primary.c)} is below the ${RED_CHROMA_FLOOR} floor for danger — a separate red at hue ${d.h} carries destructive actions.`
      : `danger: the primary (hue ${n2(input.primary.h)}) is not red, so danger gets its own red at hue ${d.h}.`);
  }
  // Knife-edge note (M-05): flag when the primary hue sits within 3° of the ±20° red boundary —
  // a small hue shift would flip danger between reuse-primary and carve-red.
  if (Math.abs(hueDist(input.primary.h, STATUS_DEFAULTS.danger.h) - 20) <= 3 && input.primary.c >= RED_CHROMA_FLOOR)
    notes.push(`danger: the primary hue ${n2(input.primary.h)} sits near the edge of red (±20° of ${STATUS_DEFAULTS.danger.h}) — a small hue change switches danger between the primary's ramp and its own red.`);

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
    notes.push(`roleColors: ${r} uses the '${pal}' palette, as the brand sets — every ${r} role rebuilds on that ramp and is contrast-checked again.`);
    const want = CANONICAL_HUE[r], got = paletteHue(pal);
    if (want !== undefined && got !== null && hueDist(got, want) > 40)
      notes.push(`roleColors: '${pal}' (hue ${Math.round(got)}°) is ${Math.round(hueDist(got, want))}° from the usual ${r} hue (${want}°) — contrast holds, but the color may not read as ${r}.`);
  }

  // ---- interactive palettes (docs/20 §3): N opt-in `interactive.<name>.*` columns ----
  // Generalises the single `accentPalette` lever into an array of promoted palettes. Each entry
  // becomes a full interactive column (fill+states / on-fill / text / border / inverse / overlay,
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
        notes.push(`interactivePalettes: set, so accentPalette '${input.accentPalette}' is not used — interactivePalettes replaces it.`);
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
      resolved.push({ name, palette: e.palette, anchorStep: anchor, anchorPinned: e.anchorStep !== undefined });
      notes.push(`interactive column: '${name}' on the '${e.palette}' palette, fill at step ${anchor} — adds the full interactive.${name}.* set.`);
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
      notes.push(`${p.palette}: rebased by roleColors, so the ${p.palette} ramp is dropped — no role uses it.`);
      palettes.splice(i, 1);
    }
  }

  // Fixed, not brand levers — see SPACE_BASE / GRID_BASE in scale.ts for why each was locked.
  const baseUnit = GRID_BASE;
  const spaceBase = SPACE_BASE;
  const density = input.density ?? 'comfortable';
  const radioDot: RadioDotShare = input.radioDot ?? RADIO_DOT_DEFAULT;
  const rScale = input.radiusScale ?? 1;
  const baseMd = input.baseMd ?? 4;
  // The 1px hairline sentinel (#1362) is ALWAYS emitted since #2053 (owner, 2026-10-04): `radiusScale` pushes
  // it for every brand, so `controlShape: hairline` (#1371) always has its rung to bind, as `boxed` always has
  // `radius.none`. `radiusHairline` is still ACCEPTED, so existing brand files load, but changes nothing.
  // Per-mode radius levers (Phase D): a customizable mode overriding `radius` re-derives its radius
  // ramp via the SAME radiusScale(value, baseMd, 128) buildDims uses (same baseMd). Only a mode whose
  // re-derived ramp DIFFERS from the global baseline gets an entry (no-diff suppression — mirrors the
  // tempo lever below); an override that equals the global scale stays byte-identical.
  const modeLevers = input.modeLevers ?? {};
  const radiusByMode: Record<string, RadiusStep[]> = {};
  const baseRadiusJson = JSON.stringify(radiusScale(rScale, baseMd, 128, 999));   // == dims.radius, the baseline every mode inherits
  for (const [m, lev] of Object.entries(modeLevers)) {
    // The hairline sentinel is brand-level and unscaled, so it rides every mode's ramp identically —
    // pass it here too, and a per-mode `radius` override still no-diffs on it (1px is mode-invariant).
    if (lev?.radius !== undefined) diffAssign(radiusByMode, m, radiusScale(lev.radius, baseMd, 128, 999), baseRadiusJson);
  }
  // Per-mode DENSITY levers (Phase D): a customizable mode overriding `density` re-derives its component
  // -size tier via the SAME componentSizes(density, spaceBase) buildDims uses. Only a mode whose density
  // DIFFERS from the baseline gets an entry (no-diff suppression) → byte-identical when unused.
  const sizesByMode: Record<string, SizeStep[]> = {};
  const controlsByMode: Record<string, ControlSizeStep[]> = {};
  for (const [m, lev] of Object.entries(modeLevers)) {
    if (lev?.density && lev.density !== density) {
      sizesByMode[m] = componentSizes(lev.density, spaceBase);
      // The control ladder rides the same lever (#900). Same no-diff suppression by construction:
      // `controlSizes` is a pure function of the density, so a mode at the baseline density is
      // filtered out by the condition above rather than by a JSON compare.
      controlsByMode[m] = controlSizes(lev.density, radioDot);
    }
  }
  notes.push(`dimensions: ${baseUnit}px grid, ${spaceBase}px spacing rhythm, '${density}' density (sets component sizes), radius scale ${n2(rScale)} (base radius ${n2(baseMd)}px).`);
  // #2053: the lever is retired. A brand file that still sets it is told it changes nothing.
  if (input.radiusHairline !== undefined) notes.push(`radius: radiusHairline is retired — radius.hairline (1px) is always emitted, so the setting changes nothing.`);
  notes.push(`motion: '${input.motionPersonality?.tempo ?? 'standard'}' tempo sets the durations; reduced-motion variants keep informational motion and set vestibular motion to 0.`);
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
  // Per-mode EASING RE-POINT (#522) — role → another curve, validated against what actually exists so a
  // typo cannot resolve to nothing. Self-maps are dropped, the same no-diff suppression every other axis
  // uses, so an inert declaration cannot mint a mode entry or a spurious override.
  const CURVES = Object.keys(motion.easing);
  const ROLES = motion.easingRoles.map((r) => r.role);
  const easingRolesByMode: Record<string, Record<string, string>> = {};
  for (const [m, lev] of Object.entries(modeLevers)) {
    const pairs = Object.entries(lev?.easings ?? {}).filter(([, v]) => v) as [string, string][];
    for (const [role, curve] of pairs) {
      if (!ROLES.includes(role)) throw new Error(`modeLevers.${m}.easings: unknown motion role '${role}' (have: ${ROLES.join(', ')})`);
      if (!CURVES.includes(curve)) throw new Error(`modeLevers.${m}.easings.${role}: unknown easing curve '${curve}' (have: ${CURVES.join(', ')})`);
    }
    const base = Object.fromEntries(motion.easingRoles.map((r) => [r.role, r.curve]));
    const diff = pairs.filter(([role, curve]) => curve !== base[role]);
    if (diff.length) easingRolesByMode[m] = Object.fromEntries(diff);
  }
  if (Object.keys(easingRolesByMode).length) {
    motion.easingRolesByMode = easingRolesByMode;
    notes.push(`motion: easing roles use a different curve per mode — ${Object.entries(easingRolesByMode).map(([m, r]) => `${m} (${Object.entries(r).map(([k, v]) => `${k} → ${v}`).join(', ')})`).join('; ')}; the curves themselves are the same in every mode.`);
  }
  const shadow = buildShadow(shadowTintDefault, input.shadow);
  notes.push(`shadow: 6 steps (xs–2xl) of two layers each, plus a one-layer inset, softness ${n2(shadow.softness)}; ${shadow.tint.hue === null ? `untinted at ${n2(shadow.tint.amount)}${shadow.tint.amount === 0 ? ' (pure black)' : ''}, because ${nAnchor ? 'the pinned gray has no hue' : 'the neutral is gray'}` : `tinted to hue ${Math.round(shadow.tint.hue)} at ${n2(shadow.tint.amount)}${shadow.tint.amount === 0 ? ' (pure black)' : ''}`}. Full shadows in light, reduced in dark, where surface lightness carries elevation.`);
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
    const sm = buildShadow(shadowTintDefault, {
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
    // Kind, angle and interpolation sit in $extensions because DTCG has no field for them (#101).
    notes.push(`gradient: ${gradient.gradients.length} brand gradient(s) — ${gradient.gradients.map((g) => `${g.name} (${g.kind}${g.kind === 'linear' ? ` ${g.angle}°` : ''}, ${g.stops.length} stops)`).join(', ')}. Stops alias the color ramps and blend in ${gradient.gradients[0].interpolation}; a tool that blends only in sRGB gets a ${gradient.gradients[0].sampled.length}-stop sRGB version. Contrast for text on a gradient is computed at its worst-contrast stop.`);
  } else {
    notes.push('gradient: none — the brand declares no gradients, and none are added by default.');
  }
  const layout = buildLayout(input.layout);
  // #3052 — a gutter/margin off the spacing scale is named, never silent. The dims are the same call the
  // theme's own `dims` makes below, so the note and the emitted link read one grid.
  const gapNotes = gridGapNotes(layout, buildDims(baseUnit, spaceBase, density, rScale, baseMd, [], radioDot));
  notes.push(`layout: ${layout.breakpoints.length} breakpoints (${layout.breakpoints.map((b) => `${b.name} ${n2(b.px)}`).join(', ')}); ${layout.baseColumns}-column grid (${layout.grid.map((g) => g.columns).join('/')} by breakpoint); gutters ${layout.grid.map((g) => g.gutterPx).join('/')}px and margins ${layout.grid.map((g) => g.marginPx).join('/')}px, ${gapNotes.length ? 'from the spacing scale except as noted below' : 'from the spacing scale'}; containers max ${n2(layout.containerMax)}px, narrow ${n2(layout.containerNarrow)}px.`);
  notes.push(...gapNotes);
  // The label category always carries the `default` role (Q225 A, Q226 A: Tabs binds it unselected), before the
  // build so the composites, the Figma text styles and `weightAvailability` all see it. A button under
  // `buttonLabelWeight: 'default'` (#1752) rebinds to the same role.
  const typography = buildTypography(withLabelDefault(input.typography));
  if (input.buttonLabelWeight === 'default')
    notes.push('control label weight: default — buttons and tags bind type.label.*.default; badges keep emphasis.');
  // Per-mode typography levers (Phase D): a customizable mode may override the font FAMILY per
  // category and/or the font WEIGHT per weight-role. Re-derive the affected PRIMITIVES via the
  // SAME helpers buildTypography uses — family stacks by merging the mode's stacks over the base
  // `families` and re-running deriveFamilies (variable flag kept from light); weight-role numbers by
  // merging the mode's weights over the resolved defaults. Only modes that override get an entry, so
  // absent maps ⇒ byte-identical. The composite SET is untouched — every composite aliases the
  // family/weight-role primitive, so it inherits the per-mode value automatically (the seam).
  const baseFam = input.typography?.families ?? {};
  const baseWr = { ...WEIGHT_ROLE_DEFAULT, ...(input.typography?.weightRoles ?? {}) };
  const familiesByMode: Record<string, FontFamilyBinding[]> = {};
  const weightRolesByMode: Record<string, WeightRole[]> = {};
  const extraWeights = new Set<number>();
  // No-diff suppression (mirrors the tempo/radius levers): only a mode whose re-derived families /
  // weight-roles DIFFER from the global baseline gets an entry — an override that resolves to the
  // global stack/weights stays byte-identical (and adds no font.weight.<num> leaves).
  const baseFamJson = JSON.stringify(deriveFamilies(baseFam));
  const baseWrJson = JSON.stringify(WEIGHT_ROLE_ORDER.map((role) => ({ role, value: baseWr[role] })));
  // A per-mode `families` may only name a category the BRAND binds. `code` is the live case: with
  // `families.code: null` the brand ships no code category, and a dark override for it would derive a
  // binding the light build has no counterpart for — which the emitter silently drops, since it walks
  // the light bindings. Throw instead, on the same reasoning as the per-mode size guard (#328): a
  // per-mode request that is quietly ignored is only wrong in one mode's output, and that is exactly
  // where nobody is looking.
  const boundGroups = new Set(deriveFamilies(baseFam).map((f) => f.group));
  for (const [m, lev] of Object.entries(modeLevers)) {
    for (const g of Object.keys(lev?.families ?? {}))
      if (!boundGroups.has(g as TypeGroup))
        throw new Error(`modeLevers.${m}.families.${g}: '${g}' is not a category this brand binds a face for (${[...boundGroups].join('/')}) — a mode re-points the categories the brand has; it can never add one.`);
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
    typography.typefaces = deriveTypefaces(input.typography?.typefaceLibrary, typography.families, ...Object.values(familiesByMode));
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
  // #377 — resolve rung→rung into role→VALUE for emission. A mode re-points the semantic role at a
  // different ladder step; the step itself is mode-invariant, which is the #296 contract preserved.
  const lhValue = Object.fromEntries(typography.lineHeights.map((l) => [l.key, l.value]));
  const lsValue = Object.fromEntries(typography.letterSpacings.map((l) => [l.key, l.em]));
  const lhRoleByMode: Record<string, Record<string, number>> = {};
  const lsRoleByMode: Record<string, Record<string, number>> = {};
  for (const [m, map] of Object.entries(lineHeightRepointByMode))
    for (const [role, target] of Object.entries(map))
      if (lhValue[target] !== undefined) (lhRoleByMode[m] ??= {})[role] = lhValue[target];
  for (const [m, map] of Object.entries(letterSpacingRepointByMode))
    for (const [role, target] of Object.entries(map))
      if (lsValue[target] !== undefined) (lsRoleByMode[m] ??= {})[role] = lsValue[target];
  if (Object.keys(lhRoleByMode).length) typography.lineHeightRoleByMode = lhRoleByMode;
  if (Object.keys(lsRoleByMode).length) typography.letterSpacingRoleByMode = lsRoleByMode;
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
  // #415 — the per-mode FAMILY MAP (#390) is gone with the role tier that made it necessary. A mode
  // that wants `title` on a different face than `display` now says so directly, via
  // `modeLevers.<m>.families.title`; when two categories no longer share a role, giving one of them a
  // different face needs no indirection to express.
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
    ? '; the display tier is empty, so the style count is below the usual 15–25'
    : '';
  const varFams = typography.families.filter((f) => f.variable).map((f) => f.group);
  // The mobile shrink follows the fluid-display curve researched for the type ladder (docs record the
  // source); the line-height ratio and its Figma px materialization are format facts, not decisions,
  // so the note leaves them out.
  notes.push(`typography: ${typography.sizesPx.length}-step size ladder (${n2(typography.sizesPx[0])}–${n2(typography.sizesPx[typography.sizesPx.length - 1])}px), a fixed set rather than a ratio; weights ${typography.weightRoles.map((w) => w.role).join('/')} → ${typography.weightRoles.map((w) => w.value).join('/')}; families ${typography.families.map((f) => `${f.group} ${f.stack[0]}`).join(', ')}${varFams.length ? ` (variable: ${varFams.join('/')})` : ''}; '${typography.typeScale}' type scale. ${typography.composites.length} text styles: title and display sizes follow the type scale, display tops out at '${reqCeiling}' (${n2(effCap)}px), title.2xs is ${(input.typography?.titleFloor ?? 18) === 16 ? 'included' : 'left out'}${(input.typography?.captionFloor ?? 11) === 10 || (input.typography?.sizeFloor ?? 10) === 8 ? `, caption adds ${[(input.typography?.sizeFloor ?? 10) === 8 ? 'caption.xs (8px)' : '', (input.typography?.captionFloor ?? 11) === 10 ? 'caption.sm (10px)' : ''].filter(Boolean).join(' and ')}` : ''}${capNote}. ${typography.fluid ? `${typography.composites.filter((c) => c.sizeMinPx !== c.sizePx).length} styles shrink on mobile — body stays fixed, titles drop about one step, display settles near 40–48px — through clamp() from ${n2(typography.minViewport)} to ${n2(typography.maxViewport)}px and in desktop and mobile modes.` : 'Sizes are fixed at every viewport.'}`);
  // #3077 — the two opt-in levers say what they set, so a reader of the notes knows the caption and tracking
  // values are the brand's choice rather than the derived ones.
  const capSizes = Object.entries(input.typography?.sizes?.caption ?? {});
  if (capSizes.length) notes.push(`typography: caption sizes set by the brand: ${capSizes.map(([v, px]) => `caption.${v} ${px}px`).join(', ')}, one size in every mode.`);
  const trackPins = TYPE_GROUPS.filter((g) => input.typography?.tracking?.[g]).map((g) => `${g} ${input.typography!.tracking![g]}`);
  if (trackPins.length) notes.push(`typography: letter spacing pinned per text type: ${trackPins.join(', ')}. Every size in a pinned text type uses that letter spacing, in place of the size-based one and its nudge.`);
  // Sub-10px flag (#1363). 8px is below every practical legibility floor and below the size range
  // this system's contrast ratios were reasoned about, so an opted-in sub-10px rung is flagged here the
  // way `actionPalette` flags a decoupled action colour — a deliberate, recorded exception rather than a
  // rung reachable by accident. Off by default, so absent it this note never appears.
  if ((input.typography?.sizeFloor ?? 10) === 8)
    notes.push(`typography: sizeFloor 8 extends the size ladder to 8px and adds caption.xs at 8px — below the sizes this system's contrast ratios were reasoned about, and below practical legibility. Off by default; use it only for fine print (legal, footnotes, dense product attributes) that has an accessible alternative.`);
  const dStrat = normalizeDisabledStrategy(input.disabledStrategy);
  const dMin = normalizeDisabledMin(input.disabledStrategy, input.disabledMin);
  notes.push(dStrat === 'full'
    ? `disabled: 'full' — disabled text and icons clear 4.5:1 (AA text) against the contrast floor, so dimming does not mark them and a disabled control may not read as disabled; the fill, border, cursor and aria-disabled carry that state.`
    : `disabled: 'reduced' (default) — disabled text and icons clear ${dMin}:1 against the contrast floor: dimmed but legible, never below 3:1, without the WCAG 1.4.3/1.4.11 inactive-component exemption. disabledStrategy 'full' raises them to 4.5:1.`);
  const oInt = input.outlineInteraction ?? 'overlay-neutral';
  notes.push(oInt === 'overlay-neutral'
    ? `interactive overlays: 'overlay-neutral' (default) — outline and text controls, rows and menus hover with a translucent neutral wash (interactive.<color>.overlay.*), contrast-checked on the blended surface. 'solid-tint' uses the control's own fill at an opacity step instead; 'none' adds no hover.`
    : oInt === 'opaque-fill'
      ? `interactive overlays: 'opaque-fill' — outline and text buttons, icon buttons and flush icon buttons hover with an opaque palette step (interactive.<color>.hover-fill.*${input.outlineHoverFill ? `, picked in ${Object.keys(input.outlineHoverFill).join(', ')}` : ''}; the default rule elsewhere), and their label and icon are measured on it. Tags, segmented controls and pagination keep the neutral wash.`
      : `interactive overlays: '${oInt}' — no translucent overlay tokens; outline and text controls hover with ${oInt === 'solid-tint' ? 'interactive.<color>.subtle-fill.*, the control\'s own fill at an opacity step' : 'no change'}.`);

  // ---- surface confirmation + validation ----
  // #898: the INVERSE band alone may name a NON-neutral palette via `{ palette, step }` (a brand-navy dark
  // hero, a custom deep accent). The palette must be DECLARED and NOT a status hue — a status band would
  // use a semantic color decoratively, which the #898 decision excludes. Bare `number` / `white` /
  // `black` are always neutral and always fine. Thrown as a brand-input error, same shape as the others.
  // `base` (the page ground) stays NEUTRAL-ONLY: a brand-colored page ground is a separate, undesigned
  // capability that no contract validates, so an object `base` is rejected up front (defense in depth
  // beyond the schema, which also narrows `base`).
  const STATUS_ROLE_SET = new Set<string>(['success', 'warning', 'danger', 'info']);
  const surfaceLabel = (s: InverseSurfaceSpec): string =>
    (typeof s === 'object') ? `${s.palette}.${s.step}` : s === 'white' || s === 'black' ? s : `neutral.${s}`;
  const checkSurfacePalette = (spec: InverseSurfaceSpec | undefined, where: string): void => {
    if (spec == null || typeof spec !== 'object') return;
    const pb = palettes.find((p) => p.palette === spec.palette);
    if (!pb) throw new Error(`surfaces.${where}: palette '${spec.palette}' is not a declared palette (have: ${palettes.map((p) => p.palette).join(', ')}). A surface band names neutral (a bare step number), the brand (primary), or a custom brandColor — not an undeclared name.`);
    if (STATUS_ROLE_SET.has(pb.role)) throw new Error(`surfaces.${where}: palette '${spec.palette}' is a STATUS palette (role '${pb.role}') — a page band in a semantic status color would use it decoratively, which #898 excludes. Use neutral, the brand, or a custom palette.`);
  };
  // A value that must name a step on `pal`'s ramp, refused by name otherwise. A finite number off the ramp
  // names the nearest real step; anything else is not a `noun`. `alts` is what else the key accepts.
  const neutralPal = palettes.find((p) => p.role === 'neutral');
  const requireStep = (where: string, value: unknown, num: unknown, pal: typeof neutralPal, noun: string, alts: string): void => {
    const steps = (pal?.steps ?? []).map((st) => st.num);
    if (typeof num === 'number' && steps.includes(num)) return;
    const ramp = `a step on the ${pal?.palette ?? 'neutral'} ramp (${steps.join(', ')})`;
    if (typeof num === 'number' && Number.isFinite(num) && steps.length) {
      const nearest = steps.reduce((a, b) => (Math.abs(b - num) < Math.abs(a - num) ? b : a));
      throw new Error(`surfaces.${where}: ${JSON.stringify(value)} is not on the ${pal!.palette} ramp; the nearest step is ${nearest}. Use ${alts}${ramp}.`);
    }
    throw new Error(`surfaces.${where}: ${JSON.stringify(value)} is not ${noun}. Use ${alts}${ramp}.`);
  };
  for (const [mode, sf] of Object.entries(input.surfaces ?? {})) {
    for (const key of ['base', 'secondary', 'tertiary'] as const) {
      if (sf?.[key] != null && typeof sf[key] === 'object') {
        throw new Error(`surfaces.${mode}.${key} does not accept a palette band — only the inverse band may (#898). The page ground is neutral-only: use 'white', 'black', or a neutral step number.`);
      }
    }
    for (const key of ['inverseBase', 'inverseSecondary', 'inverseTertiary'] as const) checkSurfacePalette(sf?.[key], `${mode}.${key}`);
    // EVERY SURFACE ANCHOR is checked here, as well as in the schema, because the schema alone does not hold:
    // `json-schema-lite` skips `allOf`/`oneOf`, so `'grey'` passes it, and the resolver would snap it, or an
    // off-ramp step, to a step nobody chose. A surface names white, black, or a real step on its palette's ramp.
    // The four tiers got this in #1972; `base` and `inverseBase` in #1985 (owner, 2026-10-03, option A: a typo
    // must never silently pick a color). Off the ramp, the message names the nearest real step.
    for (const key of ['base', 'inverseBase', 'secondary', 'tertiary', 'inverseSecondary', 'inverseTertiary'] as const) {
      const spec: unknown = sf?.[key];
      if (spec == null || spec === 'white' || spec === 'black') continue;
      const pal = typeof spec === 'object' ? palettes.find((p) => p.palette === (spec as SurfaceStep).palette) : neutralPal;
      const num = typeof spec === 'object' ? (spec as SurfaceStep).step : spec;
      requireStep(`${mode}.${key}`, spec, num, pal, 'a surface', "'white', 'black', or ");
    }
    // `floorStep` is held to the same rule (#2033, owner go-ahead 2026-10-04): it decides what every
    // floor-gated role is measured against, and `modeConfigs` resolves it with `n()`, which snaps, so `333`
    // used to become neutral.350 with no error. It always indexes the NEUTRAL ramp, whatever the page or the
    // inverse band is on, and it has no white/black form.
    if (sf?.floorStep != null) requireStep(`${mode}.floorStep`, sf.floorStep, sf.floorStep, neutralPal, 'a step number', '');
    if (sf?.secondary !== undefined) {
      notes.push(`surfaces: the ${mode} second tier is ${surfaceLabel(sf.secondary)}, not the default — ${sf.floorStep !== undefined ? `the contrast floor stays at neutral.${sf.floorStep}` : 'the contrast floor moves with it'}.`);
    }
    if (sf?.base !== undefined && sf.base !== 'white' && sf.base !== 'black') {
      notes.push(`surfaces: the ${mode} page is ${surfaceLabel(sf.base)}, not the default${sf.secondary !== undefined ? '' : ` — the contrast floor moves with it${sf.floorStep ? ` (floor neutral.${sf.floorStep})` : ''}`}.`);
    } else if (sf?.floorStep !== undefined && sf?.secondary === undefined) {
      notes.push(`surfaces: the ${mode} contrast floor is set to neutral.${sf.floorStep}.`);
    }
    // A brand/custom inverse band re-derives ~60 roles against it and flags any that miss (#898);
    // surface it so the author sees the band and its knock-on contrast, same as `base` above.
    if (typeof sf?.inverseBase === 'object') {
      notes.push(`surfaces: the ${mode} inverse band is a brand color (${surfaceLabel(sf.inverseBase)}) — every role on it is re-derived, and any that miss its contrast floor are flagged.`);
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
  // A pinned `actionAnchorStep` is applied exactly (`modes.ts` `restFill`, `exact`, #331) and never moved, so
  // the note reports the pin, not the auto-placed step, and drops the auto-move clause (#1894). Its floor miss
  // is reported as the role's own ratio. Wording: DRAFT for the owner (#1894 Q-block).
  if (actionBrandColor) notes.push(input.actionAnchorStep !== undefined
    ? `action: pinned at '${actionPalette}' step ${input.actionAnchorStep} by actionAnchorStep — applied exactly, never moved; a miss of 3:1 (7:1 in high contrast) is reported, not corrected.`
    : `action: anchored at '${actionPalette}' step ${actionAnchorStep}, the brand's own shade — moved only if it misses 3:1 (7:1 in high contrast) against the contrast floor or background.tertiary.`);

  // ---- link palette (#1496) ----
  // Links DEFAULT to following the action colour: an unset `linkPalette` resolves to the palette the action
  // role RESOLVED to (`roleToPalette.action`, final after the roleColors pass above), not the `actionPalette`
  // lever. The two differ when `roleColors.action` rebases action, and links followed the lever there,
  // leaving them on primary under an accent CTA (#1895; owner decision 2026-10-01: links follow the action
  // color, roleColors.action included). Following the resolved name makes modes.ts take its
  // `linkFollowsAction` path, so the link anchors exactly as the action does. A brand may point links at a different palette — primary, neutral, or a brandColors
  // entry — without moving the rest of interactive colour. The link ink is still rated up to its own
  // contrast floor in modes.ts regardless of the palette (the a11y floor always holds, #1510).
  const linkPalette = input.linkPalette ?? roleToPalette.action;
  if (!palettes.some((p) => p.palette === linkPalette))
    throw new Error(`linkPalette '${linkPalette}' is not a defined palette (have: ${palettes.map((p) => p.palette).join(', ')})`);
  const linkBrandColor = (input.brandColors ?? []).find((b) => b.name === linkPalette);
  const linkAnchorStep = linkPalette === 'primary' ? anchorStep
    : linkBrandColor ? autoPlaceStep(linkBrandColor.oklch.l)
    : 500;
  // Compared against the RESOLVED action palette, not the `actionPalette` lever (#1895, owner 2026-10-01):
  // with `roleColors.action` set the two differ, and the note must say whether links match the color the
  // action fill actually uses.
  if (input.linkPalette !== undefined)
    notes.push(linkPalette === roleToPalette.action
      ? `link color: '${linkPalette}', the same palette as the action color, as the brand sets.`
      : `link color: links use the '${linkPalette}' palette instead of the action color '${roleToPalette.action}', as the brand sets.`);
  // WCAG 1.4.1 (Use of Color) — WARN, don't force (#1496, owner 2026-09-17). Body text (`text.primary`)
  // draws from the neutral ramp; if the link ink is not COLOUR-distinct from it, colour alone cannot tell a
  // link from surrounding text and the link must be underlined. Distinctness is measured HUE+CHROMA only,
  // by comparing the link and neutral ramps at a shared mid step (500) — lightness is deliberately factored
  // out, because a link that differs from body text ONLY in lightness is exactly the 1.4.1 failure (a
  // greyscale / colour-blind reader cannot use that difference). ΔE00 ≥ 7 (the `LINK_STATE_DE` family) reads
  // as a distinct colour; below it we flag — never force an underline, never block. Pairs with the
  // `typography.links` underlined-link roles lever. No corpus brand trips this (every one's action palette
  // is chromatic, ΔE ≥ ~17 vs neutral), so an unset `linkPalette` adds no note and moves no artifact.
  const rampSteps = (name: string) => palettes.find((p) => p.palette === name)!.steps;
  const midStep = (steps: Step[]) => (steps.find((s) => s.num === 500) ?? steps[Math.floor(steps.length / 2)]).rgb;
  const linkColorDistinct = deltaE2000(midStep(rampSteps(linkPalette)), midStep(rampSteps(roleToPalette.neutral))) >= 7;
  if (!linkColorDistinct)
    // The studio's link advisory reads this note by its `WCAG 1.4.1` (apps/studio/src/main.ts), so the
    // citation stays verbatim.
    notes.push(`links: the '${linkPalette}' palette is too close in color to body text for WCAG 1.4.1 (Use of Color) — links need an underline; typography.links adds an underlined link style. Warned, not forced.`);

  // The inverse surface context has no lever since #895.
  const neutralEmphasis = input.neutralEmphasis ?? 'subtle';
  notes.push(`neutral interactive emphasis: '${neutralEmphasis}'${neutralEmphasis === 'strong' ? ' — a bold near-black or near-white fill' : ' (default) — a light gray fill'}; inverse-surface variants are always generated.`);

  // Provenance: strict on is #1389 (destructive joined 2026-09-24); off keeps the colored on-fill of
  // #1244/#1384.
  const strictInteractiveContrast = input.strictInteractiveContrast ?? false;
  notes.push(`strict interactive contrast: ${strictInteractiveContrast ? 'on — text on inverse primary and destructive fills is the neutral extreme, clearing AA in every state.' : 'off (default) — text on inverse primary and destructive fills keeps its brand or danger color; rest clears AA, and hover and pressed can dip below it.'}`);

  return {
    id: input.id, root, namespace: `${root}.${CORE_TIER}.palette`, colorFormat: 'hex', modes: modesAll, palettes, roleToPalette, notes,
    ...(customModes.length ? { customModes } : {}),
    ...(Object.keys(radiusByMode).length || Object.keys(familiesByMode).length || Object.keys(weightRolesByMode).length || Object.keys(lineHeightRepointByMode).length || Object.keys(letterSpacingRepointByMode).length || Object.keys(motionByMode).length || Object.keys(easingRolesByMode).length || Object.keys(shadowByMode).length || Object.keys(sizesByMode).length ? { modeLevers } : {}),
    roleAnchorStep: { brand: anchorStep, neutral: 500, success: 500, warning: 500, danger: 500, info: 500, action: actionAnchorStep },
    linkPalette, linkAnchorStep,
    surfaces: input.surfaces,
    overrides: input.overrides,
    modeAnchors: input.modeAnchors,
    disabledStrategy: dStrat,
    disabledMin: dMin,
    iconContrast: input.iconContrast ?? 'text',
    outlineInteraction: input.outlineInteraction ?? 'overlay-neutral',
    ...(outlineHoverFill ? { outlineHoverFill } : {}),
    ...(outlineWash ? { outlineWash } : {}),
    neutralEmphasis, strictInteractiveContrast, interactivePalettes,
    ...(input.raisedSurface ? { raisedSurface: input.raisedSurface } : {}),
    ...(input.scrimStrength ? { scrimStrength: input.scrimStrength } : {}),
    ...(input.secondaryTextGround ? { secondaryTextGround: input.secondaryTextGround } : {}),
    ...(glassRoles ? { glassRoles } : {}),
    ...(radioDot !== RADIO_DOT_DEFAULT ? { radioDot } : {}),
    actionAnchorStep: input.actionAnchorStep, destructiveAnchorStep: input.destructiveAnchorStep,
    linkStateRungs: input.linkStateRungs,
    dims: { ...buildDims(baseUnit, spaceBase, density, rScale, baseMd, [], radioDot), ...(Object.keys(radiusByMode).length ? { radiusByMode } : {}), ...(Object.keys(sizesByMode).length ? { sizesByMode, controlsByMode } : {}) },
    motion,
    typography,
    shadow,
    layout,
    gradient,
  };
};
