/**
 * Prism3 engine — appearance modes (light / dark / high-contrast).
 *
 * Modes do NOT regenerate primitives. The ramps are shared; what changes per
 * mode is which primitive STEP each semantic role resolves to — derived by
 * contrast target against the mode's own surface, not hand-mapped.
 *
 * Semantic model — the surface & content vocabulary (see docs/06):
 *   - background — the CANVAS: thin, page-level inert surfaces. `primary`/
 *                  `secondary`/`tertiary` (tonal in BOTH modes) + an `inverse.*`
 *                  sibling ladder. The page you build on.
 *   - foreground — the SURFACES/FILLS placed on the canvas (Prism2's `surface`,
 *                  renamed): a tonal `primary/secondary/tertiary` ladder (cards →
 *                  panels → nested) + `inverse.*` (dark fills in light) + bold
 *                  semantic fills + `-subtle` tints. `foreground.primary` sits on
 *                  `background.primary`, a different shade. NOT ink.
 *   - text/icon  — INK on a surface: neutral emphasis + semantic + `-subtle` +
 *                  `on-*` pairs (ink on a solid fill) + `link` (no disabled).
 *                  Split only by contrast floor (text 4.5 / icon optional 3:1).
 *   - interactive — the coherent interactive colour family (docs/20): every
 *                  interactive element's colour, `interactive.<color>.<slot>`.
 *   - disabled   — the one cross-cutting disabled treatment, any intent.
 *   - border     — neutral (`primary`/`secondary`), `inverse`, semantic, `focus`.
 *
 * Light & dark step surfaces tonally and SYMMETRICALLY (light is no longer all
 * white); shadow is an additive elevation cue, not the sole differentiator. In
 * HIGH CONTRAST the neutral surface ladders flatten to the base — HC separates
 * regions by BORDER (the ≥4.5:1 border target), not by near-invisible tints.
 */
import { RGB, contrast, hex, hexToRgb, composite } from './color';
import { Step } from './ramp';
import { Theme, SurfaceSpec, SurfacesConfig, Role } from './theme';

// The five built-in appearance modes — the closed set the engine ships with autocomplete.
export type BuiltinModeName = 'light' | 'dark' | 'hc-light' | 'hc-dark' | 'wireframe';
// A mode name is a built-in OR any slug-safe custom-mode name (C1). `(string & {})` keeps the
// built-in literals in autocomplete while allowing arbitrary user-added mode names through.
export type ModeName = BuiltinModeName | (string & {});

const WHITE: RGB = { r: 255, g: 255, b: 255 };
const BLACK: RGB = { r: 0, g: 0, b: 0 };

type Cand = { path: string; rgb: RGB };
type Rated = Cand & { ratio: number };
type RatedNum = Rated & { num: number };

/** Least-extreme candidate that clears `min` against `surface` (closest to the floor). */
const pickMinPass = (cands: Cand[], surface: RGB, min: number): Rated => {
  const rated = cands.map((c) => ({ ...c, ratio: contrast(c.rgb, surface) }));
  const passing = rated.filter((c) => c.ratio >= min).sort((a, b) => a.ratio - b.ratio);
  return passing[0] ?? rated.sort((a, b) => b.ratio - a.ratio)[0]; // fallback: most extreme
};

/** Most-extreme candidate against `surface` — for primary text (max legibility). */
const pickMostExtreme = (cands: Cand[], surface: RGB): Rated =>
  cands.map((c) => ({ ...c, ratio: contrast(c.rgb, surface) })).sort((a, b) => b.ratio - a.ratio)[0];

/** Candidate whose contrast is closest to a target (for decorative borders). */
const pickClosest = (cands: Cand[], surface: RGB, target: number): Rated =>
  cands
    .map((c) => ({ ...c, ratio: contrast(c.rgb, surface) }))
    .sort((a, b) => Math.abs(a.ratio - target) - Math.abs(b.ratio - target))[0];

/**
 * Keep the anchor step if it clears `min`; otherwise the nearest step that does.
 *
 * `alsoClear` names ADDITIONAL grounds the step must clear `min` against — for a role placed on more
 * than one surface (semantic ink sits on the page AND on its own subtle tint). The reported `ratio`
 * stays measured against `surface`, which is the ground the role's `against` names; the extra grounds
 * only tighten which step is eligible. Empty by default, so a single-ground role is unaffected.
 */
const pickBrand = (steps: Step[], ns: string, palette: string, anchorNum: number, surface: RGB, min: number, exact = false, alsoClear: RGB[] = []): RatedNum => {
  const cands = steps.map((s) => ({ path: `${ns}.${palette}.${s.key}`, rgb: s.rgb, num: s.num }));
  const anchor = cands.find((c) => c.num === anchorNum) ?? cands.find((c) => c.num === 500)!;
  const clearsExtra = (rgb: RGB) => alsoClear.every((g) => contrast(rgb, g) >= min);
  // `exact` = the anchor was AUTHORED (a pinned step, not the engine's derived default), so it is
  // applied verbatim even when it misses the floor — the app's apply-but-warn policy (#331). The
  // substitution below is a DERIVATION aid for an unpinned role, not an override guard: silently
  // bumping an explicit pick means the author never sees what their own choice looks like, while
  // the same pick authored through `design.md`/`BrandInput` would be honoured. The contrast miss
  // still travels — `ratio` is the raw measurement, so every consumer's gate reports it.
  if (exact || (contrast(anchor.rgb, surface) >= min && clearsExtra(anchor.rgb)))
    return { ...anchor, ratio: contrast(anchor.rgb, surface) };
  const passing = cands
    .map((c) => ({ ...c, ratio: contrast(c.rgb, surface) }))
    .filter((c) => c.ratio >= min && clearsExtra(c.rgb))
    .sort((a, b) => Math.abs(a.num - anchor.num) - Math.abs(b.num - anchor.num));
  return passing[0] ?? { ...anchor, ratio: contrast(anchor.rgb, surface) };
};

// A tonal surface ladder for a mode: primary/secondary/tertiary (3 steps).
type SurfSet = { primary: Cand; secondary: Cand; tertiary: Cand };

export type ModeCfg = {
  surface: Cand;                   // base page surface (background.primary)
  floor: Cand; floorName: string;  // contrast floor (worst-case supported surface)
  bg: SurfSet; bgInverse: SurfSet; // background canvas ladders
  fg: SurfSet; fgInverse: SurfSet; // foreground surface ladders
  inverseSurface: RGB;             // the primary inverse surface (for the inverse column / border.inverse)
  family: 'light' | 'dark';
  // Mode KIND (B — mode identity as data): drives resolveMode's behaviour instead of matching the
  // mode NAME. 'standard' = the plain light/dark derivation; 'hc' = high-contrast (pure black/white
  // extremes + escalated borders); 'wireframe' = chromatic roles redirect to the neutral ramp.
  kind: 'standard' | 'hc' | 'wireframe';
  primaryMin: number; secondaryMin: number; tertiaryMin: number; actionMin: number;
  borderTarget: number; nonTextMin: number;
};

// `ratio` is the RAW WCAG contrast (un-rounded) — compare it directly against `min`; round
// only when serialising (CR-01). `min` of 0 means "not a contrast-gated role" (surfaces).
export type ResolvedRole = { path: string; description: string; ratio: number; against: string; min: number; hex: string; alpha?: number };
// Per-mode colour override layer (Phase A1). A `PrimitiveRef` repoints a resolved role at an
// EXISTING primitive step in ANY palette (no raw colours); a `ModeOverrides` map is rolePath →
// ref, applied only to the customizable modes (light/dark). An `OverrideWarning` records a
// hand-tuned override that still applies + emits but fails its role's contrast min (WARN, never block).
export type PrimitiveRef = { palette: string; step: string };
export type ModeOverrides = Record<string, PrimitiveRef>;   // rolePath -> primitive step ref
export type OverrideWarning = { role: string; ratio: number; min: number };
export type ModeResult = { mode: ModeName; surface: RGB; roles: Record<string, ResolvedRole>; warnings?: OverrideWarning[] };

/**
 * Which role family carries an outline/text control's hover fill, for the selected method — and
 * whether that fill is OPAQUE.
 *
 * `outlineInteraction` decides which of two mutually exclusive families gets emitted (see the
 * `overlay-neutral` and `solid-tint` branches in `resolveMode`, which are the authority this
 * mirrors): the wash, the opaque tint, or neither. A consumer that reads the wrong one asks for a
 * role that does not exist, and `undefined` is indistinguishable from "no fill by design" — so it
 * renders the `none` treatment and looks like a *working* system with a boring answer. That is
 * #288, and it shipped twice: once in `renderGlobalBehavior` (fixed) and once in the style guide
 * (#575). A helper exists so that a FOURTH method cannot be added and miss a site — the exhaustive
 * switch below makes an unhandled value a compile error rather than a silently transparent swatch.
 *
 * `opaque` is the second half, and it is not decoration. The wash is translucent (it composites
 * over whatever ground it is on, which is the point of `overlay-neutral`), but the tint is a real
 * palette step that COVERS its ground. So under `solid-tint` a hovered control on an inverse band
 * is no longer on the band — it is on a page-tuned tint, and ink chosen for the band is measured
 * against the wrong thing. Consumers need to know which case they are in; `family` alone cannot
 * tell them.
 */
export const outlineFillFamily = (
  method: Theme['outlineInteraction'],
): { family: 'overlay' | 'subtle-fill' | null; opaque: boolean } => {
  switch (method) {
    case 'overlay-neutral': return { family: 'overlay', opaque: false };
    case 'solid-tint':      return { family: 'subtle-fill', opaque: true };
    case 'none':            return { family: null, opaque: false };
  }
};

/** The role key holding `color`'s outline hover fill for `state`, or null when the method emits none. */
export const outlineFillRole = (method: Theme['outlineInteraction'], color: string, state: string): string | null => {
  const { family } = outlineFillFamily(method);
  return family ? `interactive.${color}.${family}.${state}` : null;
};

const cand = (path: string, rgb: RGB): Cand => ({ path, rgb });

// B — the appearance modes as DATA. A mode's identity (name + kind + family + contrast mins) lives in
// this registry, so adding a mode is a descriptor, not a new code branch. `kind` drives resolveMode's
// behaviour (hc / wireframe specialisations) in place of matching the mode name. `wireframe` reuses the
// LIGHT family's surfaces (its greyscale redirect happens in resolveMode). Extended by custom modes (C).
export type MinSet = Pick<ModeCfg, 'primaryMin' | 'secondaryMin' | 'tertiaryMin' | 'actionMin' | 'borderTarget' | 'nonTextMin'>;
export type ModeDescriptor = { name: ModeName; kind: 'standard' | 'hc' | 'wireframe'; family: 'light' | 'dark'; mins: MinSet };
export const BUILTIN_MODES: ModeDescriptor[] = [
  { name: 'light',     kind: 'standard',  family: 'light', mins: { primaryMin: 7,  secondaryMin: 4.5, tertiaryMin: 3,   actionMin: 4.5, borderTarget: 1.4, nonTextMin: 3 } },
  { name: 'dark',      kind: 'standard',  family: 'dark',  mins: { primaryMin: 7,  secondaryMin: 4.5, tertiaryMin: 3,   actionMin: 4.5, borderTarget: 1.8, nonTextMin: 3 } },
  { name: 'hc-light',  kind: 'hc',        family: 'light', mins: { primaryMin: 15, secondaryMin: 7,   tertiaryMin: 4.5, actionMin: 7,   borderTarget: 4.5, nonTextMin: 4.5 } },
  { name: 'hc-dark',   kind: 'hc',        family: 'dark',  mins: { primaryMin: 15, secondaryMin: 7,   tertiaryMin: 4.5, actionMin: 7,   borderTarget: 4.5, nonTextMin: 4.5 } },
  { name: 'wireframe', kind: 'wireframe', family: 'light', mins: { primaryMin: 7,  secondaryMin: 4.5, tertiaryMin: 3,   actionMin: 4.5, borderTarget: 1.4, nonTextMin: 3 } },
];

const modeConfigs = (ns: string, neutralPalette: string, neutral: Step[], surfaces: SurfacesConfig = {}, descriptors: ModeDescriptor[] = BUILTIN_MODES): Record<ModeName, ModeCfg> => {
  const nNear = (num: number): Step => neutral.reduce((a, b) => (Math.abs(b.num - num) < Math.abs(a.num - num) ? b : a));
  const n = (num: number) => { const s = nNear(num); return cand(`${ns}.${neutralPalette}.${s.key}`, s.rgb); };
  const white = cand(`${ns}.white`, WHITE);
  const black = cand(`${ns}.black`, BLACK);
  const short = (c: Cand) => c.path.replace(`${ns}.`, '');
  // A neutral surface step by number, snapping the extremes to pure white/black.
  const surfAt = (num: number): Cand => (num <= 0 ? white : num >= 1000 ? black : n(num));
  // Background ladder: base → +1 → +2 steps (50 each), in the mode's tonal direction.
  const bgLadder = (baseNum: number, dir: number): SurfSet => ({ primary: surfAt(baseNum), secondary: surfAt(baseNum + dir * 50), tertiary: surfAt(baseNum + dir * 100) });
  // Foreground ladder: surfaces placed on the canvas — offset one step deeper than
  // the page so a card reads against the default page, then stepping on.
  const fgLadder = (baseNum: number, dir: number): SurfSet => ({ primary: surfAt(baseNum + dir * 50), secondary: surfAt(baseNum + dir * 100), tertiary: surfAt(baseNum + dir * 150) });

  const resolve = (family: 'light' | 'dark', defBase: SurfaceSpec): { base: Cand; floor: Cand; bg: SurfSet; fg: SurfSet; bgInverse: SurfSet; fgInverse: SurfSet; invRgb: RGB } => {
    const cfg = surfaces[family] ?? {};
    const baseSpec = cfg.base ?? defBase;
    const baseNum = baseSpec === 'white' ? 0 : baseSpec === 'black' ? 1000 : baseSpec;
    const defFloor = typeof baseSpec === 'number' ? (family === 'light' ? baseSpec + 50 : baseSpec - 50)
      : baseSpec === 'white' ? 50 : 950;
    const floorStep = cfg.floorStep ?? defFloor;
    const dir = family === 'light' ? +1 : -1;           // light steps darker; dark steps lighter
    // Inverse anchors NEAR the opposite extreme, not AT it — pure black reads
    // harsh/muddy and pure white halates in dark UIs (KB 31 §halation, §tint-not-
    // black). Light inverse = near-black 950; dark inverse = near-white 25. HC
    // restores the pure extremes (below) for low-vision max contrast.
    const invBaseNum = family === 'light' ? 950 : 25;
    const invDir = -dir;
    return {
      base: surfAt(baseNum), floor: n(floorStep),
      bg: bgLadder(baseNum, dir), fg: fgLadder(baseNum, dir),
      bgInverse: bgLadder(invBaseNum, invDir), fgInverse: fgLadder(invBaseNum, invDir),
      invRgb: surfAt(invBaseNum).rgb,
    };
  };

  const resolved = { light: resolve('light', 'white'), dark: resolve('dark', 950) } as const;
  // High contrast flattens the neutral surface ladders to a single base — HC carries
  // elevation by BORDER (escalated to ≥4.5:1), not by near-invisible surface tints.
  const flat = (c: Cand): SurfSet => ({ primary: c, secondary: c, tertiary: c });

  const mk = (r: ReturnType<typeof resolve>, kind: ModeCfg['kind'], family: 'light' | 'dark', mins: MinSet): ModeCfg =>
    ({ surface: r.base, floor: r.floor, floorName: short(r.floor), bg: r.bg, bgInverse: r.bgInverse, fg: r.fg, fgInverse: r.fgInverse, inverseSurface: r.invRgb, family, kind, ...mins });
  const hcMk = (base: Cand, inv: Cand, floor: Cand, family: 'light' | 'dark', mins: MinSet): ModeCfg =>
    ({ surface: base, floor, floorName: short(floor), bg: flat(base), bgInverse: flat(inv), fg: flat(base), fgInverse: flat(inv), inverseSurface: inv.rgb, family, kind: 'hc', ...mins });

  // Build the per-mode config table from the descriptor registry (B). Standard + wireframe modes use
  // their family's resolved surfaces (wireframe = light); HC restores the pure black/white extremes
  // and anchors its floor on the same-family standard floor. Byte-identical to the old literal table.
  const out = {} as Record<ModeName, ModeCfg>;
  for (const d of descriptors) {
    out[d.name] = d.kind === 'hc'
      ? hcMk(d.family === 'light' ? white : black, d.family === 'light' ? black : white, resolved[d.family].floor, d.family, d.mins)
      : mk(resolved[d.family], d.kind, d.family, d.mins);
  }
  return out;
};

// Per-property interactive state members (the applicable subset of the vocabulary).
// Links (text.link) carry NO disabled state: a disabled link is an a11y anti-pattern
// (you remove the href / element, not grey it). Disabled uses the cross-cutting disabled.*.
// Interactive fill states (docs/20 §2): rest/hover/pressed + focused/selected. Disabled is
// NOT a per-fill state — it's the one cross-cutting disabled.* family (one treatment, any intent).
const FILL_STATES = ['default', 'hover', 'pressed', 'focused', 'selected'] as const;
const LINK_STATES = ['default', 'hover', 'visited', 'focused'] as const;
const SEMANTICS = ['brand', 'success', 'warning', 'danger', 'info'] as const;

const resolveMode = (mode: ModeName, cfg: ModeCfg, theme: Theme, ramps: Map<string, Step[]>): ModeResult => {
  const ns = theme.namespace;
  const r2p = theme.roleToPalette;
  const neutral = ramps.get(r2p.neutral)!;
  const ramp: Cand[] = neutral.map((s) => cand(`${ns}.${r2p.neutral}.${s.key}`, s.rgb));
  const hc = cfg.kind === 'hc';                              // B — behaviour by kind, not name
  const textCands: Cand[] = hc ? [cand(`${ns}.white`, WHITE), ...ramp, cand(`${ns}.black`, BLACK)] : ramp;
  const baseRgb = cfg.surface.rgb;
  const floorRgb = cfg.floor.rgb;
  const invRgb = cfg.inverseSurface;
  const onMin = 4.5; // text on a saturated fill targets AA (a vivid mid-tone is gamut-bounded)
  // The bar a BOLD FILL clears against the floor surface. A fill carries no text of its own, so the
  // governing criterion is SC 1.4.11 non-text, not 1.4.3 — the label's legibility is `on-fill`'s
  // contract, measured against the fill (#352).
  //
  // HC IS EXEMPT, and deliberately so. Every other mode reads its own `nonTextMin`, but HC exists to
  // EXCEED minimums, not to meet them; deriving its fills from a WCAG-floor rule erases the thing
  // users switch to HC for. Measured, which is what settled it: routing HC through `nonTextMin`
  // (4.5 in HC) made hc-light's `foreground.brand` and `foreground.danger` resolve to `red.550` at
  // 4.62 — byte-identical to STANDARD light. A high-contrast mode whose brand and danger fills are
  // indistinguishable from the standard mode has stopped being high-contrast on that axis. HC keeps
  // its own text bar (7:1) for fills instead.
  const fillFloorMin = cfg.kind === 'hc' ? cfg.actionMin : cfg.nonTextMin;

  const roles: Record<string, ResolvedRole> = {};
  // The resolved rgb behind each role key — the override post-pass (Phase A1) reads it to
  // re-derive an overridden role's contrast against its `against` role's actual colour.
  const rgbByRole = new Map<string, RGB>();
  const rated = (c: Cand, surf: RGB): Rated => ({ ...c, ratio: contrast(c.rgb, surf) });
  // ratio is the RAW contrast — every gate/pass check compares it against `min` un-rounded
  // (CR-01). Rounding to 2dp happens only where it's serialised (tree.ts / ai-metadata.ts).
  const put = (key: string, r: Rated, description: string, against: string, min: number) =>
    { roles[key] = { path: r.path, description, ratio: r.ratio, against, min, hex: hex(r.rgb) }; rgbByRole.set(key, r.rgb); };
  const putSurf = (key: string, c: Cand, description: string) =>
    { roles[key] = { path: c.path, description, ratio: 1, against: 'self', min: 0, hex: hex(c.rgb) }; rgbByRole.set(key, c.rgb); };

  const pStep = (palette: string, num: number): Cand => {
    const steps = ramps.get(palette)!;
    const s = steps.reduce((a, b) => (Math.abs(b.num - num) < Math.abs(a.num - num) ? b : a));
    return cand(`${ns}.${palette}.${s.key}`, s.rgb);
  };
  // Ink on a solid fill. The pure black/white extremes are softened to near-
  // extremes in standard modes (pure black reads harsh; pure white halates on a
  // dark ground) — but only where it applies: pure white survives in LIGHT mode
  // (the light fill isn't a dark ground), while DARK mode softens white → 025.
  // Black always softens → 950. HC keeps the pure extremes (low-vision contrast).
  // A pure-extreme fallback fires only if the softened pick can't clear `onMin`.
  const N025 = (): Cand => pStep(r2p.neutral, 25);
  const N950 = (): Cand => pStep(r2p.neutral, 950);
  const onColor = (fill: RGB): Rated => {
    if (hc) return pickMostExtreme([cand(`${ns}.white`, WHITE), cand(`${ns}.black`, BLACK)], fill);
    const lightCand = cfg.family === 'light' ? cand(`${ns}.white`, WHITE) : N025();  // light side: pure white in light, soft in dark
    const cL = rated(lightCand, fill), cD = rated(N950(), fill);
    const win = cL.ratio >= cD.ratio ? cL : cD;
    if (win.ratio >= onMin) return win;
    // Escalation re-opens the choice rather than committing to whichever SOFT candidate won — they
    // are different questions. The soft pair can favour one side while the escalated OTHER side is
    // what actually clears `onMin`: on a mid-tone danger fill, N950 measured 4.26 and won the soft
    // round, but pure black (4.60) and pure white (4.56) both clear, and the old line could only
    // reach the winner's side. Filed as latent in #375; reachable now that fills relax.
    //
    // Pure black is permitted HERE and only here. This is ink on a saturated FILL, where black on a
    // bright amber is the legible, conventional answer; the no-pure-black rule is about ink on the
    // page CANVAS, and is scoped to that in test.ts rather than applied to every role blindly.
    return pickMostExtreme([cand(`${ns}.white`, WHITE), cand(`${ns}.black`, BLACK)], fill);
  };
  // Wireframe (docs/11 Pillar 1b): a mechanical greyscale. Every CHROMATIC role resolves on
  // the NEUTRAL ramp at the position its colour pick would land — then re-nudged to clear the
  // same min on the neutral ramp, so the greyscale still holds each contrast contract. Roles
  // already neutral (backgrounds, text, borders) + white/black/alpha pass through untouched.
  const wf = cfg.kind === 'wireframe';                       // B — behaviour by kind, not name
  const neutralPal = r2p.neutral;
  const palOf = (palette: string): string => (wf && palette !== neutralPal ? neutralPal : palette);
  const chromatic = (palette: string, anchorNum: number, surf: RGB, min: number, exact = false, alsoClear: RGB[] = []): RatedNum => {
    const pick = pickBrand(ramps.get(palette)!, ns, palette, anchorNum, surf, min, exact, alsoClear);
    return wf && palette !== neutralPal
      ? pickBrand(ramps.get(neutralPal)!, ns, neutralPal, pick.num, surf, min, exact, alsoClear) // same position, greyscaled
      : pick;
  };
  const paletteRole = (r: Role, surf: RGB, min: number): RatedNum =>
    chromatic(r2p[r], theme.roleAnchorStep[r], surf, min);
  // Interactive-state direction: hover/pressed step the fill toward MORE contrast with the
  // page it sits on — darker in a light mode (dir +1 = higher/darker step), lighter in a dark
  // mode (dir -1). As the user engages (rest → hover → pressed) the control grows more prominent
  // ("comes forward"), and the same move keeps the on-fill label legible (a darker fill lifts a
  // white label's contrast; a lighter fill lifts a dark label's). At a ramp END the forward walk
  // would overshoot and collapse the states onto one step — `walk` reflects inward there (L-01),
  // i.e. an action colour pinned at the far end steps the OTHER way rather than saturating.
  const dir = cfg.family === 'light' ? +1 : -1;
  // `d` overrides the walk direction — the page dir by default; the inverse-context text walks the OTHER
  // way (toward MORE contrast with the dark band, i.e. lighter in a light mode) so its ink comes forward.
  const walk = (palette: string, fromNum: number, steps: number, d: number = dir, guard?: { surf: RGB; min: number }): Cand => {
    const pal = palOf(palette);
    const ramp = ramps.get(pal)!;
    const near = (n: number) => ramp.reduce((a, b) => (Math.abs(b.num - n) < Math.abs(a.num - n) ? b : a));
    const lo = ramp.reduce((m, s) => Math.min(m, s.num), Infinity);
    const hi = ramp.reduce((m, s) => Math.max(m, s.num), -Infinity);
    // Distinctness (L-01): the forward walk is fromNum + dir*50*steps. When that
    // OVERSHOOTS the ramp end, `near` clamps it to the terminal step — so two
    // different step-counts (hover=1, pressed=2) collapse onto the SAME terminal
    // step and the interactive states become visually indistinguishable. Each
    // state's contrast is gated, but their mutual distinctness never was. On
    // overshoot, reflect and walk inward the other way, preserving the step-count
    // separation. Inward is toward mid-ramp, so it stays within the gamut the
    // ramp already vetted; the contract gate still guards each state's contrast.
    //
    // ---- FLOOR RE-VERIFICATION (#557) -------------------------------------------------------
    // `guard` (the state's own ground + min) makes each counted step a step that ACTUALLY clears
    // the floor, instead of trusting that stepping away from `rest` can only add contrast.
    //
    // That trust is what broke. Exact-anchor preservation (ramp.ts, invariant #2) writes the
    // pinned brand step at FULL chroma while its generated neighbours take the ramp curve's lower
    // chroma, and for hues where chroma RAISES relative luminance (green/cyan/orange) the anchor's
    // WCAG Y lands ABOVE its lighter neighbour's. The ramp is then non-monotonic in CONTRAST while
    // still monotonic in LIGHTNESS — so ramp.ts's M-02 monotonicity guard passes, because it checks
    // OKLCH `l`, which is the ordering the pickers need. Nothing checked the ordering the walk
    // needs. A `{ l: .55, c: .30, h: 180 }` primary steps light-mode hover from a gated 3.18:1 onto
    // 2.77:1 — under the floor `rest` was placed to clear, with every gate green.
    //
    // Counting QUALIFYING steps, rather than repairing a failed landing, is what makes this
    // compose with L-01 above. The tempting repair — keep walking until the floor clears — moves
    // hover onto the step pressed already occupies, buying the floor by collapsing exactly the
    // distinctness L-01 exists to defend. "The nth step that clears" keeps hover ≠ pressed AND
    // clears the floor, both by construction.
    //
    // The step arithmetic below is deliberately the SAME `fromNum ± 50·k` walk as the unguarded
    // path, not an index scan over `ramp`. Those two are not equivalent: the ramp's 25↔50 gap is
    // 25, not 50, so an index scan diverges from the shipped formula in 2 of the 80
    // from × steps × direction combos (both near step 25) and would have drifted the corpus for
    // reasons that have nothing to do with this bug. Same arithmetic ⇒ when every step qualifies,
    // the nth qualifying step IS the nth step, so a monotonic ramp is byte-identical and only the
    // non-monotonic region moves.
    const clears = (r: RGB) => !guard || contrast(r, guard.surf) >= guard.min;
    const scan = (dd: number): Step | undefined => {
      let seen = 0;
      for (let k = 1; ; k++) {
        const at = fromNum + dd * 50 * k;
        if (at < lo || at > hi) return undefined;         // ran out of ramp this way
        const s = near(at);
        if (!clears(s.rgb)) continue;                     // not a candidate; keep looking
        if (++seen === steps) return s;                   // the nth step that actually clears
      }
    };
    // Forward first (the affordance direction — the control comes forward as the user engages),
    // then reflect and walk inward, which is what the pre-#557 formula did on overshoot.
    // Last resort (neither direction can supply `steps` qualifying steps): the plain landing.
    // Keep it rather than invent a colour — `put` then reports the miss through the normal
    // contract channel, which is how an over-constrained brand is supposed to surface.
    const s = scan(d) ?? scan(-d) ?? near(fromNum + d * 50 * steps);
    return cand(`${ns}.${pal}.${s.key}`, s.rgb);
  };
  // #557 × #331: guard a walk ONLY when its ORIGIN actually cleared the floor.
  //
  // The walk's promise was "a walked state inherits rest's verified floor", and #557 is that the
  // inheritance silently fails on a non-monotonic ramp. Where `rest` never had the floor in the
  // first place there is nothing to inherit, and guarding would not be preserving a contract — it
  // would be inventing one `rest` itself is exempt from. That case is real and deliberate: #331's
  // apply-but-warn means an AUTHORED anchor pin is applied verbatim and its miss REPORTED, so the
  // author sees their own pick. Guarding the states off a failing pin would walk hover/pressed
  // away to wherever the floor is met, burying the pin in exactly the states meant to show it —
  // re-introducing the substitution #331 removed, one level down.
  //
  // So an unmet origin keeps the plain step arithmetic and `put` reports the miss, which is both
  // honest and byte-identical to pre-#557. `min: 0` roles (the subtle neutral fill) degenerate to
  // the same thing for free.
  const guardFrom = (ratio: number, surf: RGB, min: number): { surf: RGB; min: number } | undefined =>
    ratio >= min ? { surf, min } : undefined;
  const neutralLow = (): Cand => pStep(r2p.neutral, cfg.family === 'light' ? 200 : 750);
  const tintStep = cfg.family === 'light' ? 100 : 900;       // subtle semantic SURFACE tint
  const mutedStep = cfg.family === 'light' ? 450 : 350;      // muted semantic INK
  // The subtle tint SURFACE for a semantic role, resolved once. `foreground.<r>-subtle` paints it and
  // the semantic ink is gated against it (below), so the two must not be able to drift apart.
  const subtleTint = (r: Role): Cand => pStep(palOf(r2p[r]), tintStep);
  // Bold semantic ink — gated against BOTH grounds it is placed on. See the call site in
  // `buildContent` for why the floor alone was not enough.
  const semanticInk = (r: Role, min: number): RatedNum =>
    chromatic(r2p[r], theme.roleAnchorStep[r], floorRgb, min, false, [subtleTint(r).rgb]);

  // Disabled-state contrast (theme-level). BOTH branches gate now: 'full' promises AA text at a
  // fixed 4.5:1, 'reduced' clears the dialable `disabledMin` (3–4.5). The old ungated
  // 'conventional' path — `pickClosest(..., 2)` with `min: 0` — is gone: this system no longer
  // uses the WCAG 1.4.3/1.4.11 inactive-component exemption, so there is no un-contracted disabled
  // ink. (That path also made the two strategies indistinguishable at the bottom of the old 2–4.5
  // dial, while still labelling the result "accessible".) HC escalates BOTH branches to >=4.5 —
  // previously only the gated one escalated, so 'conventional' shipped ~2:1 disabled text even in
  // a high-contrast mode.
  const disabledFloor = theme.disabledStrategy === 'full' ? 4.5 : theme.disabledMin;
  const disabledTarget = hc ? Math.max(disabledFloor, 4.5) : disabledFloor;
  const disabledText = (): { r: Rated; against: string; min: number } =>
    ({ r: pickMinPass(textCands, floorRgb, disabledTarget), against: cfg.floorName, min: disabledTarget });
  // The label/ink on a DISABLED fill (disabled.fill, a muted neutral). A dedicated
  // pair — Carbon's `text-on-color-disabled` — resolved against the disabled FILL (not
  // the page), so it stays muted-but-legible on it rather than landing at the wrong
  // contrast like `disabled.text`. Feeds the cross-cutting `disabled.on-fill`.
  const onDisabled = (): { r: Rated; against: string; min: number } =>
    ({ r: pickMinPass(textCands, neutralLow().rgb, disabledTarget), against: 'disabled.fill', min: disabledTarget });

  // -------------------------------------------------------------- backgrounds
  // The canvas: thin, page-level, tonal in both modes. `inverse.*` is the opposite-
  // polarity ladder (a dark band on a light page). In HC every tier == the base.
  putSurf('background.primary', cfg.bg.primary, 'Page surface — the canvas / base');
  putSurf('background.secondary', cfg.bg.secondary, 'Page surface, second tier — a slightly tinted page / band');
  putSurf('background.tertiary', cfg.bg.tertiary, 'Page surface, third tier');
  putSurf('background.inverse.primary', cfg.bgInverse.primary, 'Inverse page surface — a dark band in light mode');
  putSurf('background.inverse.secondary', cfg.bgInverse.secondary, 'Inverse page surface, second tier');
  putSurf('background.inverse.tertiary', cfg.bgInverse.tertiary, 'Inverse page surface, third tier');
  // scrim — semi-transparent backdrop behind modals/drawers (alpha; heavier in dark).
  const scrimStep = hc ? (cfg.family === 'light' ? 60 : 70) : (cfg.family === 'light' ? 40 : 60);
  put('scrim.default', { path: `${ns}.black-alpha.${scrimStep}`, rgb: BLACK, ratio: 1 },
    `Scrim — ${scrimStep}% black backdrop (modals / drawers)`, 'self', 0);
  // Record the alpha, exactly as the overlay washes below do. `hex` is the opaque BASE (black); the
  // translucency lives only here, so a role view without it reports the scrim as solid black — which
  // is what every consumer of `resolveAllModes` painted. The DTCG emit was always right (it aliases
  // `black-alpha.<step>`, and the alpha is on the primitive), so no artifact ever drifted; the bug
  // could only surface where a UI rendered the RESOLVED role, and until now nothing rendered scrim.
  roles['scrim.default'].alpha = scrimStep / 100;

  // -------------------------------------------------------------- foregrounds
  // Surfaces & fills placed on the canvas. Neutral tonal ladder + inverse + bold
  // semantic fills + `-subtle` tints + the stateful `danger` fill. (`action` is
  // top-level, below.) `foreground.primary` sits on `background.primary`.
  putSurf('foreground.primary', cfg.fg.primary, 'Default surface placed on the page — a card');
  putSurf('foreground.secondary', cfg.fg.secondary, 'A second surface — a panel / nested container');
  putSurf('foreground.tertiary', cfg.fg.tertiary, 'A third surface step');
  putSurf('foreground.inverse.primary', cfg.fgInverse.primary, 'Inverse / bold surface — a dark fill in light mode');
  putSurf('foreground.inverse.secondary', cfg.fgInverse.secondary, 'Inverse surface, second tier');
  putSurf('foreground.inverse.tertiary', cfg.fgInverse.tertiary, 'Inverse surface, third tier');
  // bold semantic fills (filled badge / banner / button at rest) — static.
  const fills: Partial<Record<Role, RatedNum>> = {};
  for (const r of ['brand', 'success', 'warning', 'info'] as const) {
    const f = paletteRole(r, floorRgb, fillFloorMin);
    fills[r] = f;
    put(`foreground.${r}`, f, `Bold ${r} fill — clears ${fillFloorMin}:1 on the floor (${cfg.floorName})`, cfg.floorName, fillFloorMin);
  }
  // subtle semantic tint SURFACES (light banner/badge fills) — pair with text.{r}.
  for (const r of SEMANTICS)
    putSurf(`foreground.${r}-subtle`, subtleTint(r), `Subtle ${r} tint surface — banners, badges, selected rows`);
  // danger — a bold semantic fill like the others (kept out of the loop above only to
  // preserve its position + set fills.danger for the on-danger ink pairing). Its stateful /
  // interactive expression now lives in `interactive.destructive.*` (docs/20), so the fill
  // itself is static — there is no per-state danger fill.
  const dangerRest = paletteRole('danger', floorRgb, fillFloorMin);
  fills.danger = dangerRest;
  put('foreground.danger', dangerRest, `Bold danger fill — clears ${fillFloorMin}:1 on the floor (${cfg.floorName})`, cfg.floorName, fillFloorMin);
  // Interactive fill states walk the palette (rest → hover/focused +1 → pressed/selected +2).
  // `fillMin` is the floor the walked step is guarded against (#557) — the SAME floor `put` then
  // measures it by, so the walk can no longer land a state under its own declared contract.
  const fillStateCand = (rest: RatedNum, palette: string, st: typeof FILL_STATES[number], fillMin: number): Cand => {
    // Measure the origin here rather than trusting `rest.ratio` — an `exact` pin carries the ratio
    // it was picked with, and this must be the contrast against the ground `put` will use.
    const g = guardFrom(contrast(rest.rgb, floorRgb), floorRgb, fillMin);
    return st === 'default' ? rest
      : st === 'hover' || st === 'focused' ? walk(palette, rest.num, 1, dir, g)
      : walk(palette, rest.num, 2, dir, g); // pressed | selected
  };

  // The action palette's rest colour — the source for interactive.primary, the focus ring,
  // and link states. (The legacy top-level `action.*` fill is retired: components bind
  // `interactive.primary.*`, docs/20 §16.) `actionAnchorStep` overrides the resolved anchor
  // (docs/20 §3) — anchor the action rest at an explicit palette step; unset keeps today's pick.
  // A2b — a per-mode interactive anchor (`theme.modeAnchors[mode][col]`) re-anchors the whole
  // column for THIS mode (rest → hover/pressed/on-fill all re-derive from it), still floor-gated;
  // absent → the global anchor, so an unset map is byte-identical. Columns: 'primary'/'destructive'/accent.
  const modeAnchor = (col: string): number | undefined => theme.modeAnchors?.[mode]?.[col];
  const paAnchor = modeAnchor('primary') ?? theme.actionAnchorStep;
  // Authored pin → `exact` (#331): applied as picked, floor miss reported not corrected.
  const actionRest = paAnchor !== undefined
    ? chromatic(r2p.action, paAnchor, floorRgb, fillFloorMin, true)
    : paletteRole('action', floorRgb, fillFloorMin);

  // ------------------------------------------------------- interactive family
  // The coherent, generated, contrast-gated interactive colour family (docs/20) — the ONE
  // home for every interactive element's colour: `interactive.<color>.<slot>`. Colours:
  // primary (the action palette) · neutral · destructive; any number of extra columns are opt-in
  // via `interactivePalettes` (docs/20 §3). Slots: fill (+ its rest/hover/pressed/focused/selected states),
  // on-fill (ink), text (outline/text ink), border. Disabled is NOT per-colour here — it is
  // the cross-cutting disabled.* family below. This is what components bind (docs/20 §16.3).
  const iFill = (name: string, rest: RatedNum, palette: string, fillMin: number) => {
    for (const st of FILL_STATES) {
      const c = fillStateCand(rest, palette, st, fillMin);
      // The interactive family leads with `rest` (docs/20 §2 — rest/hover/pressed);
      // the base-state key `default` is kept only on the non-interactive roles.
      const stKey = st === 'default' ? 'rest' : st;
      // Every fill state — rest included — is measured against the floor at the NON-TEXT bar. A
      // fill carries no text of its own; the label's legibility is `on-fill`'s contract, measured
      // against the fill. #375 split rest (4.5) from the other states (3) only because relaxing
      // rest then broke the NB fixture and forced a banned ink; both are handled deliberately here,
      // so the split is degenerate and gone.
      put(`interactive.${name}.fill.${stKey}`, rated(c, floorRgb),
        `${name} interactive fill — ${stKey}`, cfg.floorName, fillMin);
    }
    put(`interactive.${name}.on-fill`, onColor(rest.rgb), `Ink on the ${name} interactive fill`, `interactive.${name}.fill.rest`, onMin);
  };
  // Neutral fill anchor — a subtle grey by default (neutralEmphasis lever, later).
  // Returns a RatedNum so its states can walk the neutral ramp like any palette.
  const neutralStepR = (num: number): RatedNum => {
    const steps = ramps.get(r2p.neutral)!;
    const s = steps.reduce((a, b) => (Math.abs(b.num - num) < Math.abs(a.num - num) ? b : a));
    return { path: `${ns}.${r2p.neutral}.${s.key}`, rgb: s.rgb, num: s.num, ratio: contrast(s.rgb, floorRgb) };
  };
  // The outline / text ink, per interactive state (docs/20 §2) — `text.{rest,hover,pressed}`. rest is
  // the gated pick; hover/pressed walk the palette toward MORE contrast (like the fill states), so an
  // outline/text control "comes forward" as the user engages. `walkable` is false for neutral, whose ink
  // is already the strongest neutral (no palette position to step) — its states collapse onto rest.
  const iText = (name: string, restCand: Cand, palette: string, walkable: boolean): Record<string, Cand> => {
    const restNum = (restCand as RatedNum).num;
    const byState: Record<string, Cand> = {};
    for (const st of ['default', 'hover', 'pressed'] as const) {
      const stKey = st === 'default' ? 'rest' : st;
      const c: Cand = (st === 'default' || !walkable) ? restCand
        : walk(palette, restNum, st === 'hover' ? 1 : 2, dir, guardFrom(contrast(restCand.rgb, baseRgb), baseRgb, cfg.secondaryMin));
      put(`interactive.${name}.text.${stKey}`, rated(c, baseRgb),
        `${name} interactive ink — ${stKey} (outline / text appearance)`, 'background.primary', cfg.secondaryMin);
      byState[stKey] = c;
    }
    return byState;
  };
  /**
   * The outline EDGE, per state — `border.{rest,hover,pressed}`, the same shape as `text.*` and
   * `fill.*` (#576). It used to be ONE value pinned at step 500, which made two promises the engine
   * could not keep: the Interactive page's `outlineInteraction: 'none'` blurb says "the border and
   * ink carry the state on their own" while the border had no states to carry them with, and the
   * common intent "make the outline's edge match its label" was unreachable — measured across the
   * corpus, 16 of 20 brand×mode combinations put the pinned 500 border on a different ramp step
   * from the ink, and EVERY dark mode did.
   *
   * The default is therefore to FOLLOW THE INK, and it does so by consuming the very candidates
   * `iText` resolved rather than re-deriving the step from the palette. That is deliberate: two
   * derivations of "the same step" are two things that can drift, and the whole defect this closes
   * was a second site re-deriving a mapping (#575). One derivation, passed by value.
   *
   * The gate stays at `nonTextMin`, not the ink's `secondaryMin`: a border carries no text, so SC
   * 1.4.11 governs it (the same category correction #352 made for fills). Following the ink can
   * never FAIL that gate — the ink already cleared the stricter text bar — so matching is always
   * contrast-safe, which is a large part of why it is the right default rather than merely a
   * convenient one. The declared minimum is still the border's own, so a future non-matching source
   * is held to the right bar rather than inheriting the ink's.
   */
  // `where` qualifies the description for the ground the edge is drawn on. It is a parameter
  // rather than derived from `slot`, because the two callers differ in the GROUND they are
  // verified against, and that is the thing a reader of the description needs. Before #891 this
  // was one hardcoded sentence, so the inverse edge shipped prose verbatim identical to the page
  // edge — a description that never mentioned the dark band it exists for.
  const iBorder = (name: string, inkByState: Record<string, Cand>, ground: RGB, slot: string, against: string, where = ''): void => {
    for (const stKey of ['rest', 'hover', 'pressed'] as const)
      put(`interactive.${name}.${slot}${stKey}`, rated(inkByState[stKey], ground),
        `${name} interactive border${where} — ${stKey} (the outline edge; follows the ink)`, against, cfg.nonTextMin);
  };

  // primary — the action palette, contrast-verified.
  iFill('primary', actionRest, r2p.action, fillFloorMin);
  iBorder('primary', iText('primary', paletteRole('action', baseRgb, cfg.secondaryMin), r2p.action, true), baseRgb, 'border.', 'background.primary');

  // destructive — the danger palette (its own interactive column, no scavenging).
  // `destructiveAnchorStep` overrides the resolved anchor (docs/20 §3); unset keeps today's pick.
  const daAnchor = modeAnchor('destructive') ?? theme.destructiveAnchorStep;
  const iDestructiveRest = daAnchor !== undefined
    ? chromatic(r2p.danger, daAnchor, floorRgb, fillFloorMin, true)
    : paletteRole('danger', floorRgb, fillFloorMin);
  iFill('destructive', iDestructiveRest, r2p.danger, fillFloorMin);
  iBorder('destructive', iText('destructive', paletteRole('danger', baseRgb, cfg.secondaryMin), r2p.danger, true), baseRgb, 'border.', 'background.primary');

  // neutral — the achromatic column that was the historical miss (docs/20 §12). The
  // `neutralEmphasis` lever picks the fill: 'subtle' (default) a light grey (min 0 — a
  // subtle surface); 'strong' a bold near-black (light) / near-white (dark) fill that
  // clears the non-text floor. Either way the LOAD-BEARING contract is the on-fill ink,
  // derived + gated to onMin, so a failing neutral pair can't ship.
  const neutralStrong = theme.neutralEmphasis === 'strong';
  const neutralAnchor = neutralStrong ? (cfg.family === 'light' ? 800 : 150) : (cfg.family === 'light' ? 150 : 850);
  iFill('neutral', neutralStepR(neutralAnchor), r2p.neutral, neutralStrong ? cfg.nonTextMin : 0);
  iText('neutral', pickMostExtreme(textCands, baseRgb), r2p.neutral, false);   // strongest neutral — states collapse onto rest
  // Neutral is the ONE column whose border does NOT follow the ink, and the reason is measurable
  // rather than aesthetic: its ink is `pickMostExtreme` (step 950 light / 025 dark — near-black or
  // near-white) while its edge is `pickMinPass` (400–550, a mid grey). Those are opposite ends of
  // the ramp ON PURPOSE, and the ink is `walkable: false`, so its three states all collapse onto
  // rest. Following it would therefore do BOTH wrong things at once — repaint every neutral outline
  // near-black, and leave the border stateless again, which is the defect this closes.
  //
  // So neutral keeps its own anchor and walks the neutral ramp for its states, which is exactly the
  // `field.border` idiom (rest + a two-step-stronger hover, re-gated at `nonTextMin`) extended to a
  // third state. Two steps per state, matching `field.border.hover`'s reasoning verbatim: a border
  // is a hairline, and one step is a far weaker cue on 1px of chrome than on a filled button.
  const nBdRest = pickMinPass(ramp, baseRgb, cfg.nonTextMin);
  const nBdNum = neutral.find((s) => `${ns}.${r2p.neutral}.${s.key}` === nBdRest.path)!.num;
  const nBdGuard = guardFrom(contrast(nBdRest.rgb, baseRgb), baseRgb, cfg.nonTextMin);
  iBorder('neutral', {
    rest: nBdRest,
    hover: walk(r2p.neutral, nBdNum, 2, dir, nBdGuard),
    pressed: walk(r2p.neutral, nBdNum, 4, dir, nBdGuard),
  }, baseRgb, 'border.', 'background.primary');

  // extensible interactive columns (docs/20 §3) — N opt-in `interactive.<name>.*` families, each
  // promoting a declared palette (the generalised accent lever). Same fill+states / text / border
  // generation as the built-ins, anchored at the entry's fill step (default 500). A brand with no
  // extra columns (the common case) runs an empty loop → only primary/neutral/destructive ship.
  // Never falls back to primary — the resolver only lists palettes the brand actually declared.
  for (const entry of theme.interactivePalettes) {
    // Exact only when the anchor was AUTHORED — a per-mode anchor, or `anchorPinned` from the
    // brand input. `entry.anchorStep` alone will not do: brandTheme resolves it for every column,
    // so a derived default is indistinguishable from a pin by the time it arrives here.
    const anchor = modeAnchor(entry.name) ?? entry.anchorStep ?? 500;
    const pinned = modeAnchor(entry.name) !== undefined || !!entry.anchorPinned;
    const rest = chromatic(entry.palette, anchor, floorRgb, fillFloorMin, pinned);
    iFill(entry.name, rest, entry.palette, fillFloorMin);
    iBorder(entry.name, iText(entry.name, chromatic(entry.palette, anchor, baseRgb, cfg.secondaryMin), entry.palette, true), baseRgb, 'border.', 'background.primary');
  }

  // inverse surface-context (docs/20 §9): the ink for an OUTLINE / TEXT interactive control
  // placed on a dark hero / inverse section — a light CTA on dark, generated + contrast-verified
  // against the inverse surface (not a hand-mirrored -inverse twin). Independent of light/dark
  // theme; a light-only brand still needs it. The `inverse` lever gates it.
  if (theme.inverseContext) {
    // The full inverse column (docs/20 §9) — a filled CTA + outline/text control placed on a dark hero /
    // inverse band, generated + contrast-verified against `background.inverse.primary` (not a hand-mirrored
    // twin). `inverse.text.{rest,hover,pressed}` = the light outline/text ink (states walk toward MORE
    // contrast on the dark band); `inverse.fill.{rest,hover,pressed}` = a light filled CTA on the dark
    // band (states walk toward the palette like the page fill); `inverse.on-fill` = the dark ink on it.
    //
    // The qualifier is `inverse`, not `on-inverse`, since #891. `on-` means exactly one thing in this
    // tree — INK ON the named ground (`on-fill`, `text.on-brand`) — and a context qualifier wearing it
    // put both senses in one path: `primary.on-inverse.on-fill` read as ink-on-ink. `inverse.fill.rest`
    // is the case that settles it — the token is a FILL, and the old name called it ink.
    const invColumn = (name: string, palette: string | null, anchor: number): void => {
      const textRest: Rated = palette ? rated(chromatic(palette, anchor, invRgb, cfg.secondaryMin), invRgb) : pickMostExtreme(textCands, invRgb);
      const textNum = (textRest as RatedNum).num;
      const invInk: Record<string, Cand> = {};
      for (const st of ['default', 'hover', 'pressed'] as const) {
        const stKey = st === 'default' ? 'rest' : st;
        const c: Cand = (st === 'default' || !palette) ? textRest
          : walk(palette, textNum, st === 'hover' ? 1 : 2, -dir, guardFrom(contrast(textRest.rgb, invRgb), invRgb, cfg.secondaryMin));
        put(`interactive.${name}.inverse.text.${stKey}`, rated(c, invRgb),
          `${name} interactive ink on a dark / inverse surface — ${stKey} (outline / text on a dark hero)`, 'background.inverse.primary', cfg.secondaryMin);
        invInk[stKey] = c;
      }
      // A light filled CTA on the dark band (a dark fill on the light band in dark mode) — anchored at the
      // light / dark extreme so it reads as an inverted button AND its on-fill ink resolves clean (a mid
      // fill makes onColor fall back to pure black). States walk toward MORE contrast on the inverse band.
      const fillRest: RatedNum = palette ? chromatic(palette, cfg.family === 'light' ? 100 : 900, invRgb, cfg.nonTextMin) : neutralStepR(cfg.family === 'light' ? 50 : 850);
      for (const st of ['default', 'hover', 'pressed'] as const) {
        const stKey = st === 'default' ? 'rest' : st;
        const c: Cand = st === 'default' ? fillRest
          : walk(palette ?? r2p.neutral, fillRest.num, st === 'hover' ? 1 : 2, -dir, guardFrom(contrast(fillRest.rgb, invRgb), invRgb, cfg.nonTextMin));
        put(`interactive.${name}.inverse.fill.${stKey}`, rated(c, invRgb),
          `${name} interactive fill on a dark / inverse surface — ${stKey} (a light filled CTA on a dark hero)`, 'background.inverse.primary', cfg.nonTextMin);
      }
      put(`interactive.${name}.inverse.on-fill`, onColor(fillRest.rgb),
        `Ink on the ${name} inverse fill (a dark label on the light on-dark CTA)`, `interactive.${name}.inverse.fill.rest`, onMin);
      // The outline EDGE on the dark band, now per state (#576) and following the inverse-context ink,
      // for the same reason the page border does — the intent "the edge matches its label" is no
      // less true on a dark hero, and `invInk` is already resolved and gated against `invRgb`.
      //
      // This REPLACES a step-500 pick nudged against `invRgb`, and #467's finding is why the
      // replacement is safe rather than merely equivalent. That pick was declared against the
      // inverse surface so the contract covers it; before it existed the page border was the only
      // edge emitted and was verified against `background.primary` alone — a mid-tone clears 3:1 on
      // BOTH grounds just inside a window (page-contrast 3.00 … ~6.48 for the emitted inverse
      // surface) and nothing checked the far edge. Wendy's brand red, never nudged, landed 3.30 on
      // the inverse band — 0.30 from failing with every gate green, and a darker action color fails
      // outright. Following the ink retires that whole margin problem: the ink is gated at
      // `secondaryMin` against `invRgb`, a STRICTER bar than the border's `nonTextMin`, so the edge
      // now inherits a pick that has already cleared 4.5:1 on this exact ground instead of one
      // sitting 0.30 above 3:1. The declared minimum stays the border's own — a future
      // non-matching source must be held to its own bar, not to the ink's.
      //
      // Neutral has no palette, so its ink is `pickMostExtreme` and its states collapse; it takes
      // the same own-anchor treatment as the page-ground neutral border above.
      if (palette) iBorder(name, invInk, invRgb, 'inverse.border.', 'background.inverse.primary', ' on a dark / inverse surface');
      else {
        const iBdRest = pickMinPass(ramp, invRgb, cfg.nonTextMin);
        const iBdNum = neutral.find((s) => `${ns}.${r2p.neutral}.${s.key}` === iBdRest.path)!.num;
        const iBdGuard = guardFrom(contrast(iBdRest.rgb, invRgb), invRgb, cfg.nonTextMin);
        iBorder(name, {
          rest: iBdRest,
          hover: walk(r2p.neutral, iBdNum, 2, -dir, iBdGuard),
          pressed: walk(r2p.neutral, iBdNum, 4, -dir, iBdGuard),
        }, invRgb, 'inverse.border.', 'background.inverse.primary', ' on a dark / inverse surface');
      }
    };
    invColumn('primary', r2p.action, modeAnchor('primary') ?? theme.actionAnchorStep ?? theme.roleAnchorStep.action);
    invColumn('destructive', r2p.danger, modeAnchor('destructive') ?? theme.destructiveAnchorStep ?? theme.roleAnchorStep.danger);
    invColumn('neutral', null, 0);
    for (const entry of theme.interactivePalettes) invColumn(entry.name, entry.palette, modeAnchor(entry.name) ?? entry.anchorStep ?? 500);
  }

  // interactive overlays (docs/20 §6) — translucent hover/pressed/selected washes that
  // composite over ANY surface (page, dark hero, image), the outline/text-appearance and
  // row/menu/card hover story. `overlay-neutral` (default) uses the mode-adaptive neutral
  // alpha ramp (darken in light, lighten in dark). The composited RESULT is contrast-gated
  // (§13): text.primary must stay ≥ AA on the page once the overlay sits on it — a real
  // contract that fails on too-heavy a wash (notably a lightening overlay in dark mode).
  // `solid-tint` (opaque foreground.<color>-subtle) and `none` opt out — no overlay tokens.
  // This branch deliberately tests the LEVER, not `outlineFillFamily`. Routing it through the helper
  // was tried and reverted: it makes the emitter and the helper agree by construction, and (10h) —
  // the gate that exists to catch them disagreeing — becomes unfalsifiable. Measured: with the
  // emitter keyed off the helper, corrupting the helper's mapping fired 7 test failures and **not one
  // of them was (10h)**. The gate passed while asserting a tautology.
  //
  // So the duplication here is load-bearing, which is the opposite of the lesson #575 taught about
  // duplication in CONSUMERS. A consumer that re-derives the mapping renders `transparent` and no one
  // hears about it; two independent derivations with a gate between them is how the mapping gets
  // checked at all. Keep them separate, and let (10h) be the thing that binds them.
  if (theme.outlineInteraction === 'overlay-neutral') {
    const overlayPal = cfg.family === 'light' ? 'black-alpha' : 'white-alpha';
    const overlayBase = cfg.family === 'light' ? BLACK : WHITE;
    const OVERLAY_ALPHA: [string, number][] = [['hover', 10], ['pressed', 20], ['selected', 20]];
    const contentRgb = pickMostExtreme(textCands, baseRgb).rgb;   // text.primary — the strongest content ink
    const overlayColors = ['primary', 'neutral', 'destructive', ...theme.interactivePalettes.map((p) => p.name)];
    for (const color of overlayColors) {
      for (const [st, step] of OVERLAY_ALPHA) {
        const ratio = contrast(contentRgb, composite(baseRgb, overlayBase, step / 100));
        put(`interactive.${color}.overlay.${st}`,
          { path: `${ns}.${overlayPal}.${step}`, rgb: overlayBase, ratio },
          `${color} interactive overlay — ${st} (${step}% neutral wash; composites over any surface)`,
          'text.primary', cfg.secondaryMin);
        // The wash is TRANSLUCENT (`step`% over the base) — record the alpha so consumers can
        // render the real composite. `hex` stays the opaque base (contrast gates on the composited
        // result separately); a renderer uses hex+alpha.
        roles[`interactive.${color}.overlay.${st}`].alpha = step / 100;
      }
    }
  }

  // `solid-tint` — the OPAQUE sibling of the overlay wash (#288). Same three states, same consumers,
  // but a real palette step instead of a translucent neutral: the outline/text control's hover fill is
  // a tint of ITS OWN column's palette, so a destructive outline hovers red-tinted rather than grey.
  //
  // This branch did not exist. The lever value was selectable and emitted NOTHING for any brand, ever
  // — the doc comment above claimed it used `foreground.<color>-subtle`, but that role is only emitted
  // for the five fixed SEMANTICS names (brand/success/warning/danger/info), never keyed by an
  // interactive COLUMN name. Those are different naming spaces: `interactive.primary` follows
  // `roleToPalette.action`, which for aurora is `accent`, not `brand`. So the dashboard had nothing
  // correct to read and showed an empty swatch.
  //
  // The step choice has two constraints pulling opposite ways, and both are checked rather than
  // assumed:
  //   1. it must be DISTINGUISHABLE FROM THE PAGE, or the hover state is invisible and the lever is
  //      inert — the #305 failure mode, which this repo has now hit three times;
  //   2. the control's own label must STAY LEGIBLE on it.
  // Pairing each tint with the ink of the SAME state is what makes both hold at once: `iText` already
  // walks hover/pressed toward more contrast, so a darker pressed tint meets a stronger pressed ink
  // and the ratio IMPROVES rather than degrading. Measured across aurora + harbor, light + dark,
  // primary + destructive: worst ink-on-tint 4.90:1 (AA), worst tint-vs-page ΔE00 5.81 (well clear of
  // the ~2.3 noticeable bar).
  //
  // The nominal step is a starting point, not a guarantee — an extreme brand can put the ink closer to
  // the tint than the examples do. So the pick WALKS TOWARD THE PAGE (a lighter tint in a light mode)
  // until the state's ink clears the text minimum, the same "pick a value that satisfies the contract"
  // shape the rest of this file uses, rather than trusting two example brands to generalise.
  // Tests the lever directly, for the reason spelled out at the `overlay-neutral` branch above.
  if (theme.outlineInteraction === 'solid-tint') {
    // Nominal: one subtle step for hover, one further for pressed/selected — the same "comes forward"
    // progression the fill and ink states use.
    const NOMINAL: [string, number][] = cfg.family === 'light'
      ? [['hover', 100], ['pressed', 150], ['selected', 150]]
      : [['hover', 900], ['pressed', 850], ['selected', 850]];
    const tintColumns: [string, string][] = [
      ['primary', r2p.action], ['neutral', r2p.neutral], ['destructive', r2p.danger],
      ...theme.interactivePalettes.map((p) => [p.name, p.palette] as [string, string]),
    ];
    for (const [color, palette] of tintColumns) {
      const ramp = ramps.get(palOf(palette));
      if (!ramp) continue;                                   // a column whose palette the brand doesn't carry
      for (const [st, nominal] of NOMINAL) {
        // The ink this tint sits under: `selected` reuses the pressed ink (same emphasis level).
        const inkRole = roles[`interactive.${color}.text.${st === 'selected' ? 'pressed' : st}`];
        const inkRgb = inkRole ? hexToRgb(inkRole.hex) : pickMostExtreme(textCands, baseRgb).rgb;
        // Order the ramp from the nominal step TOWARD THE PAGE, so the first passing candidate is the
        // most saturated tint that still keeps the label legible — never weaker than it needs to be.
        const toward = [...ramp].sort((a, b) => {
          const key = (n: number) => (cfg.family === 'light' ? n - nominal : nominal - n);
          const ka = key(a.num), kb = key(b.num);
          // candidates at/inside the nominal first (ascending distance), then the rest
          return (ka >= 0 ? ka : 1e6 - ka) - (kb >= 0 ? kb : 1e6 - kb);
        });
        const chosen = toward.find((s) => contrast(inkRgb, s.rgb) >= cfg.secondaryMin) ?? toward[0];
        const ratio = contrast(inkRgb, chosen.rgb);
        put(`interactive.${color}.subtle-fill.${st}`,
          { path: `${ns}.${palOf(palette)}.${chosen.key}`, rgb: chosen.rgb, ratio },
          `${color} interactive subtle fill — ${st} (opaque tint of the ${palOf(palette)} ramp; the outline/text control's ${st} background)`,
          // NOTE the direction: `against` normally names the surface a role sits ON, but this role IS
          // the surface. The variable being chosen is the tint; the ink is already fixed by `iText`.
          // So the promise worth publishing is "this tint keeps its own state ink legible", and the
          // ink is what it is measured against.
          `interactive.${color}.text.${st === 'selected' ? 'pressed' : st}`, cfg.secondaryMin);
      }
    }
  }

  // ---- disabled — cross-cutting (docs/20 §7): ONE treatment, not per-colour. A disabled
  // control looks disabled regardless of intent (fill / on-fill / text / icon /
  // border), governed by the `disabledStrategy` lever. This is the SOLE disabled family:
  // the per-colour action.disabled / foreground.danger.disabled / interactive.*.fill.disabled
  // are retired — components bind these five roles for any disabled control (docs/20 §16).
  putSurf('disabled.fill', neutralLow(), 'Disabled control fill — one muted neutral, any intent');
  // Both branches carry a real ratio now, so the description states the number and which promise
  // it comes from — no "sub-AA (WCAG-exempt)" variant remains to describe.
  const dBranch = theme.disabledStrategy === 'full' ? 'full contrast, AA text' : 'reduced contrast, legible';
  { const d = onDisabled(); put('disabled.on-fill', d.r, `Label / icon on a disabled fill — muted but clears ${d.min}:1`, 'disabled.fill', d.min); }
  { const d = disabledText(); put('disabled.text', d.r, `Disabled text — clears ${disabledTarget}:1 (${dBranch})`, d.against, d.min); }
  { const d = disabledText(); put('disabled.icon', d.r, `Disabled icon — clears ${disabledTarget}:1 (${dBranch})`, d.against, d.min); }
  put('disabled.border', rated(neutralLow(), baseRgb), 'Disabled control border — muted neutral', 'background.primary', 0);

  // ---- field — form-element chrome (docs/20 §17). Deliberately MINIMAL + gated: a field
  // surface, a PERCEIVABLE resting border, and a READABLE placeholder. Everything stateful
  // composes from existing families (focus → border.focus, validation → border.<semantic> +
  // foreground.<semantic>-subtle, disabled → disabled.*), so `field.*` is not re-authored per
  // state or hand-mirrored for inverse — the field research (Prism2 surface/border.input.*)
  // showed those are the tokens generic roles already cover better.
  putSurf('field.fill', cfg.bg.secondary, 'Form field fill — a subtly inset surface for inputs (the value ink is text.primary; it tracks the page tier so text clears)');
  // Border is the one stateful field slot (rest + hover), same shape as interactive.*.fill.<state>.
  // Rest is a perceivable boundary; hover is a subtly STRONGER boundary — never the sole state
  // carrier (KB §4). Focus swaps to border.focus, validation to border.<semantic>, disabled to
  // disabled.border — those compose from generic families, so only rest/hover live in field.*.
  const fieldRest = pickMinPass(ramp, baseRgb, cfg.nonTextMin);
  put('field.border.rest', fieldRest, `Form field resting border — a perceivable boundary, ${cfg.nonTextMin}:1 (SC 1.4.11) — better than a sub-3:1 resting border`, 'background.primary', cfg.nonTextMin);
  // Hover is a STATE DELTA expressed as a step offset from rest, not a second absolute ratio.
  //
  // It used to target `secondaryMin` — a TEXT constant — which is the same category error the bold
  // fills had (#352): a border carries no text, so SC 1.4.11 governs it, and the hover state's job
  // is to be perceptibly DIFFERENT from rest rather than to clear a higher bar. Chasing an absolute
  // ratio also made the perceptual delta vary by mode, because it depends on wherever `rest` landed:
  // 2 steps in light/dark but 3 in HC. A fixed offset is the same idiom `iFill` already uses for
  // interactive fill states, and it makes the delta uniform.
  //
  // TWO is the offset because that is what light and dark already resolved to, so both are
  // byte-identical to before; only HC changes, tightening 3 steps to 2. One step was the tempting
  // choice for consistency with `iFill`'s hover, but a field border is a hairline — a single step is
  // a far weaker cue on 1px of chrome than on a filled button, and this would have been a silent
  // regression in the affordance.
  const fieldRestNum = neutral.find((s) => `${ns}.${r2p.neutral}.${s.key}` === fieldRest.path)!.num;
  put('field.border.hover', rated(walk(r2p.neutral, fieldRestNum, 2, dir, guardFrom(contrast(fieldRest.rgb, baseRgb), baseRgb, cfg.nonTextMin)), baseRgb), `Form field hover border — two ramp steps stronger than rest, gated at ${cfg.nonTextMin}:1 (never the sole state carrier — KB §4)`, 'background.primary', cfg.nonTextMin);
  put('field.placeholder', pickMinPass(textCands, cfg.bg.secondary.rgb, cfg.secondaryMin), `Form field placeholder ink — a READABLE hint, ${cfg.secondaryMin}:1 on the field fill (not a sub-AA placeholder)`, 'field.fill', cfg.secondaryMin);

  // -------------------------------------------------------------- text (+ icon)
  // Ink. Built from a floor PROFILE so `text` (4.5:1) and `icon` can diverge: with
  // iconContrast '3:1' icons resolve against the WCAG 1.4.11 non-text floor for
  // secondary/tertiary/semantic — `primary` stays strong either way.
  type Spec = { key: string; r: Rated; desc: string; against: string; min: number };
  type Profile = { label: string; secondaryMin: number; tertiaryMin: number; semanticMin: number };
  const buildContent = (p: Profile): Spec[] => {
    const out: Spec[] = [];
    const T = (key: string, r: Rated, desc: string, against: string, min: number) => out.push({ key, r, desc, against, min });
    T('primary', pickMostExtreme(textCands, baseRgb), `Primary ${p.label} — strongest neutral`, 'background.primary', cfg.primaryMin);
    T('secondary', pickMinPass(textCands, floorRgb, p.secondaryMin), `Secondary ${p.label} — ${p.secondaryMin}:1 on the floor`, cfg.floorName, p.secondaryMin);
    T('tertiary', pickMinPass(textCands, floorRgb, p.tertiaryMin), `Tertiary ${p.label} — ${p.tertiaryMin}:1 on the floor`, cfg.floorName, p.tertiaryMin);
    // (disabled ink is the cross-cutting disabled.text / disabled.icon, not a per-family role.)
    // Bold semantic ink. Gated against the WORSE of the two grounds it is actually placed on: the
    // page floor AND its own subtle tint (`foreground.<r>-subtle`), which is where the alert/banner
    // and subtle-badge patterns put it (preview.ts alert + badge/info-subtle bind exactly this pair).
    //
    // WHY BOTH. The floor is the DARKEST supported page, so a light-mode floor bound the ink from
    // below and the tint came along for free — while the page stayed tinted. On a WHITE page the
    // floor drops (neutral.100 -> neutral.050), the ink relaxes a rung to 550, and the tint is
    // suddenly the harder ground: measured 4.01-4.27 against it, an AA text failure in the exact
    // pattern the tint exists for. It was never the floor's job to bound this — the two grounds are
    // independent, and gating on one while shipping on the other is what made the miss silent.
    // Measured across the corpus: 4 of 5 brands failed in light mode (nb, aurora, wendys, minimal —
    // every white-page member, plus the web start screen's own default brand), harbor passed only
    // because its warm off-white canvas held the floor high. Costs exactly one rung (550 -> 600),
    // light mode only; dark modes already cleared both. The ink also gets MORE legible on the page,
    // so nothing regresses. Contract-safe: this moves values, not names.
    for (const r of SEMANTICS)
      T(r, semanticInk(r, p.semanticMin), `${r} ${p.label} — ${p.semanticMin}:1 on the floor (${cfg.floorName}) and on its own tint`, cfg.floorName, p.semanticMin);
    // Muted semantic ink (the "quiet" variant) — GATED at the large-text / non-text bar
    // (`tertiaryMin`: 3:1 standard, 4.5:1 in HC), rated against the page it sits on.
    //
    // It used to ship UNGATED at a fixed rung (`min: 0`), which produced the one thing a contrast
    // system must not do: report loudly about a better value while staying silent about a worse one.
    // Pinning `text.danger` to 500 surfaces a FAILURE at 3.76, while muted sat at 3.23 with no badge
    // at all — the UI suppresses badges for ungated roles, so the absence read as "unmeasured" and
    // looked like a pass. Same page, same role family, same kind of text; only one was reporting.
    //
    // 3:1 rather than the 4.5 bold ink clears, and the measurement is the reason. Every light muted
    // in the corpus ALREADY clears 3 (min: harbor 3.16), so this moves no value today — it converts a
    // coincidence into a contract. At 4.5 it moves 24 of 25 light combos and halves muted↔bold
    // separation from **1.45–1.78** to 1.21–1.48, which erases the visual distinction the role exists
    // to provide: a "quiet danger" that reads as loud as the loud one is not worth emitting. So the bar
    // is the one that matches how the role is actually used (large text and non-text accents), and
    // the studio LABELS it as such rather than leaving the promise implicit.
    //
    // That range said "~1.73" until #578 re-measured it. The floor is **wendys/brand at 1.45**, not
    // 1.73, so the headroom over the 4.5 option's 1.48 ceiling is a hair rather than the comfortable
    // gap the old number implied — the ordering that decided the bar survives, the margin does not.
    // Two traps for whoever re-checks this, both of which caught a previous pass:
    //   1. Measure bold-against-muted DIRECTLY. The tempting probe — subtracting the two page-contrast
    //      ratios — is a different quantity and reads 2.15–3.05 on the same corpus. Easy to conflate.
    //   2. These are the 25 LIGHT `text` combos, the set the option table compares. Widen to `icon` or
    //      to every mode and the floor drops to 1.16 (aurora/light/icon.danger; hc-dark worst overall),
    //      which is why test.ts (10d) quotes 1.16 — a different scope, not a contradiction. Neither
    //      figure is wrong; a separation number without its scope is unusable.
    //
    // Gating also fixes a second bug the fixed rung hid: muted ignored HC entirely — identical in
    // light and hc-light (nb: 3.85 in both) — because a fixed step cannot respond to a raised bar.
    // Reading `tertiaryMin` makes HC escalate it to 4.5 like every other gated ink.
    //
    // NOT enforced here: that muted stays a distinct step from bold. Nothing prevents a flat ramp
    // from floating both onto the same rung; test.ts asserts the separation corpus-wide instead, so
    // a collision surfaces as a failure rather than needing speculative machinery now (cf. the L-01
    // distinctness note on interactive states above, which needed the mechanism because it HAD
    // collided).
    for (const r of SEMANTICS)
      T(`${r}-subtle`, rated(chromatic(r2p[r], mutedStep, baseRgb, p.tertiaryMin), baseRgb), `Muted ${r} ${p.label} — low-emphasis accent, ${p.tertiaryMin}:1 on the page`, 'background.primary', p.tertiaryMin);
    // on-* pairs (ink on a solid fill) — AA on a vivid fill. `on-action` / `on-disabled`
    // are retired: the ink on an interactive fill is interactive.<color>.on-fill, and the
    // ink on a disabled fill is disabled.on-fill (docs/20 §16).
    for (const r of SEMANTICS)
      T(`on-${r}`, onColor(fills[r]!.rgb), `${p.label} on a solid ${r} fill`, `foreground.${r}`, onMin);
    T('on-inverse', pickMostExtreme(textCands, invRgb), `${p.label} on an inverse surface`, 'background.inverse.primary', cfg.secondaryMin);
    // link (interactive text) + states — no disabled.
    //
    // Link ink derives its OWN step on the action palette at THIS profile's ink bar. It used to
    // reuse `actionRest` — the literal button-fill object — which made a text role's legibility an
    // accident of how the FILL happened to be gated (#352). Same anchor, so a link still reads as
    // the brand's action colour; different floor, because ink and a fill are different contracts.
    //
    // Two consequences worth naming: relaxing the fill toward its anchor can no longer drag link
    // text below AA, and `icon.link.*` now honours `iconContrast` for its COLOUR and not merely
    // its reported min — previously the lever moved the number while the ink stayed text-gated.
    //
    // Clamped, not `exact`: an authored `actionAnchorStep` pins a FILL step, and inheriting that
    // pin here would let a deliberate fill choice silently push link text below its floor. A link
    // colour is overridable in its own right.
    const linkBase = chromatic(r2p.action, paAnchor ?? theme.roleAnchorStep.action, floorRgb, p.semanticMin);
    // Guarded (#557) at the profile's OWN semanticMin — so `icon.link.*` under iconContrast '3:1'
    // is verified at 3, and `text.link.*` at the text bar, each against the floor `put` uses.
    const linkGuard = guardFrom(contrast(linkBase.rgb, floorRgb), floorRgb, p.semanticMin);
    const linkStateCand = (st: typeof LINK_STATES[number]): Cand =>
      st === 'default' || st === 'focused' ? linkBase
      : st === 'hover' ? walk(r2p.action, linkBase.num, 1, dir, linkGuard)
      : walk(r2p.action, linkBase.num, 2, dir, linkGuard); // visited
    for (const st of LINK_STATES)
      T(`link.${st}`, rated(linkStateCand(st), floorRgb), `Link ${p.label} — ${st}`, cfg.floorName, p.semanticMin);
    return out;
  };

  const textProfile: Profile = { label: 'text', secondaryMin: cfg.secondaryMin, tertiaryMin: cfg.tertiaryMin, semanticMin: cfg.actionMin };
  for (const s of buildContent(textProfile)) put(`text.${s.key}`, s.r, s.desc, s.against, s.min);
  const iconSpecs = theme.iconContrast === '3:1'
    ? buildContent({ label: 'icon', secondaryMin: cfg.nonTextMin, tertiaryMin: cfg.nonTextMin, semanticMin: cfg.nonTextMin })
    : buildContent({ ...textProfile, label: 'icon' });
  for (const s of iconSpecs) put(`icon.${s.key}`, s.r, s.desc, s.against, s.min);

  // ------------------------------------------------------------------- borders
  // Neutral (primary/secondary), inverse, semantic, and the focus ring. In HC the
  // border targets escalate — borders carry structure when surfaces flatten.
  put('border.primary', pickClosest(ramp, baseRgb, cfg.borderTarget), `Default border — decorative, ~${cfg.borderTarget}:1`, 'background.primary', 0);
  put('border.secondary', pickClosest(ramp, baseRgb, cfg.borderTarget * 2.2), 'Stronger border / divider', 'background.primary', 0);
  // `border.inverse` is a GROUP, not a leaf: `default` is the decorative edge, `focus` the ring
  // below. Promoted from a leaf in #891 so that context-before-role holds in every family that has
  // an inverse variant — `background.inverse.<tier>`, `foreground.inverse.<tier>`,
  // `interactive.<palette>.inverse.<role>.<state>` and now `border.inverse.<role>`. #892 adds the
  // remaining seven roles into this container; the alternative shape (`border.<role>.inverse`) would
  // have needed a leaf-to-group cascade per role and put context last in all of them.
  put('border.inverse.default', pickClosest(ramp, invRgb, cfg.borderTarget), 'Border on inverse surfaces', 'background.inverse.primary', 0);
  for (const r of SEMANTICS)
    put(`border.${r}`, rated(chromatic(r2p[r], 500, baseRgb, cfg.nonTextMin), baseRgb), `${r} border — ${cfg.nonTextMin}:1 (SC 1.4.11)`, 'background.primary', cfg.nonTextMin);
  put('border.focus', rated(actionRest, baseRgb), 'Focus ring color (keyboard focus)', 'background.primary', cfg.nonTextMin);
  // The same ring, for when it is drawn on an inverse surface. One ring cannot serve both grounds:
  // measured against `background.inverse.primary`, the page-gated ring scored 3.46 (light) / 5.24
  // (dark) but **2.09 (hc-light) / 2.40 (hc-dark)** — it failed SC 1.4.11 worst in exactly the two
  // modes that exist to serve users who most depend on seeing focus. A ring gated against one ground
  // and painted on another is the same shape of bug as #63 (ink gated on the page, placed on a tint)
  // and #570 (a fixed rung that could not answer a raised bar): the gate measured a contrast the role
  // was never asked to survive.
  //
  // Gated at `cfg.nonTextMin` against the INVERSE surface — deliberately NOT `border.inverse.default`'s
  // `cfg.borderTarget` one line above, which is decorative. This is a focus indicator first and an
  // inverse token second, so it keeps the accessibility floor its non-inverse sibling has; copying
  // the neighbouring inverse border wholesale would silently pick the weaker gate. (#573)
  //
  // An authored action pin (#331) is honoured as the ANCHOR but not applied `exact` here: a pin is a
  // statement about the brand's action colour on the page, and reproducing it verbatim on a different
  // ground is precisely the fixed-value-cannot-answer-a-different-ground failure above. The gate is
  // free to walk it, so the ring clears 3:1 on the inverse surface in every mode.
  put('border.inverse.focus', rated(chromatic(r2p.action, paAnchor ?? theme.roleAnchorStep.action, invRgb, cfg.nonTextMin), invRgb),
      'Focus ring color on inverse surfaces (keyboard focus)', 'background.inverse.primary', cfg.nonTextMin);

  // ---- per-mode colour override layer (Phase A1) ----
  // A brand may repoint a resolved role at an EXISTING primitive step in ANY palette (no raw
  // colours). Overrides live only on the customizable modes (light/dark) — `theme.overrides`
  // carries none for the generate-only modes. Each override re-derives the role's contrast
  // against its own `against` surface and WARNS (never blocks) when a hand-tuned pick fails the
  // role's contrast min: the generated baseline always passes; a failing tuned override still
  // applies + emits, recorded as a warning. A role absent in this mode is skipped (roles vary by
  // mode). A malformed ref (unknown palette / step) is a hard error.
  const warnings: OverrideWarning[] = [];
  const ov = theme.overrides?.[mode];
  if (ov) {
    for (const [rolePath, ref] of Object.entries(ov)) {
      const existing = roles[rolePath];
      if (!existing) continue;                             // role absent in this mode → skip (no throw)
      const steps = ramps.get(ref.palette);
      if (!steps) throw new Error(`overrides[${mode}]: unknown palette '${ref.palette}' (role '${rolePath}')`);
      const step = steps.find((s) => s.key === ref.step);
      if (!step) throw new Error(`overrides[${mode}]: unknown step '${ref.step}' in palette '${ref.palette}' (role '${rolePath}')`);
      const newRgb = step.rgb;
      const againstRgb = existing.against === 'self' ? newRgb : (rgbByRole.get(existing.against) ?? baseRgb);
      const ratio = contrast(newRgb, againstRgb);
      roles[rolePath] = { ...existing, path: `${ns}.${ref.palette}.${ref.step}`, ratio, hex: hex(newRgb) };
      if (existing.min > 0 && ratio < existing.min) warnings.push({ role: rolePath, ratio, min: existing.min });
    }
  }

  return { mode, surface: baseRgb, roles, ...(warnings.length ? { warnings } : {}) };
};

export const resolveAllModes = (theme: Theme): ModeResult[] => {
  const ramps = new Map(theme.palettes.map((p) => [p.palette, p.steps] as const));
  const neutral = ramps.get(theme.roleToPalette.neutral)!;
  // Custom modes (C1) — LIVE-INHERIT: each declared custom mode clones its base built-in
  // descriptor (same kind/family/mins) under the new name, so it re-derives EXACTLY like its
  // base each build; its own overrides[name]/modeAnchors[name] (A1/A2b) then deviate it. A custom
  // mode with an unknown base was rejected in brandTheme — guard defensively (skip if not found).
  const custom: ModeDescriptor[] = (theme.customModes ?? []).flatMap((cm) => {
    const baseDesc = BUILTIN_MODES.find((d) => d.name === cm.base);
    return baseDesc ? [{ ...baseDesc, name: cm.name }] : [];
  });
  const descriptors = [...BUILTIN_MODES, ...custom];
  const cfgs = modeConfigs(theme.namespace, theme.roleToPalette.neutral, neutral, theme.surfaces, descriptors);
  // Only the modes the brand opted into (light always; dark/HC opt-in — docs/11 Pillar 1; customs
  // appended last). Canonical order preserved (Object.keys order: built-ins first, then customs),
  // so `rp.modes` is stable regardless of input order.
  return (Object.keys(cfgs) as ModeName[]).filter((m) => theme.modes.includes(m)).map((m) => resolveMode(m, cfgs[m], theme, ramps));
};
