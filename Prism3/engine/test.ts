/**
 * Prism3 engine — test suite (dependency-free, run via tsx).
 *
 *   npx tsx Prism3/engine/test.ts
 *
 * Two layers the functional checks (nb-regression, emit-dtcg) don't cover:
 *  1. colour-math invariants in color.ts (round-trips, contrast, gamut, ΔE).
 *  2. extreme white-label brands run end-to-end — a near-black primary, a red
 *     primary (danger-reuse), a light high-chroma yellow (hard-to-make-accessible
 *     action), an action palette decoupled to neutral, and a bare-minimum brand.
 *     Each must build and clear EVERY mode contract — the real robustness test.
 * Exits non-zero on any failure.
 */
import { rgbToOklch, oklchToRgb, hex, hexToRgb, contrast, luminance, maxChroma, inGamut, deltaE2000, dualContrastWindow, RGB } from './color';
import { generateRamp, autoPlaceStep, STEP_NUMS } from './ramp';
import { radiusScale, ICON_SIZES, componentSizes } from './scale';
import { at, deref, pxOf, buildTree, familyOf } from './tree';
import { brandTheme, BrandInput, inRedTerritory, normalizeDisabledStrategy, normalizeDisabledMin } from './theme';
import { nbTheme } from './nb-fixture';
import { resolveAllModes } from './modes';
import { parseDesignMd, parseYamlSubset, toDesignMd } from './design-md';
import { parseStandardDesignMd, standardToBrandInput, applyXPrism3 } from './standard-design-md';
import { classifyColors } from './classify-colors';
import { leverManifest, leverGroups, buildLeverManifest, identityFields } from './levers';
import { previewSpec, previewTokenRefs, buildPreviewSpec } from './preview';
import { resolvePreview } from './resolve-preview';
import { exampleBrands, exampleBrandsJson, EXAMPLE_IDS } from './emit-brandinput';
import { buildFigmaColor, buildFigmaFont, buildFigmaFontFluid, buildFigmaTextStyles, buildFigmaDims, buildFigmaLayout, buildFigmaShadow, buildFigmaGradient, fontStyleName, figName, parseColor, COLOR_MODES, FONT_FLUID_MODES, LAYOUT_MODES } from './emit-figma';
import { buildTree, validateBrandInput } from './emit-dtcg';
import { buildAiMetadata } from './ai-metadata';
import { handleRpc, callTool, toolDefs } from './mcp';
import { scoreConsumption, scoreContractCompliance, tokenPaths, normalizeRef, isPrimitiveRef, PRIMITIVE_TIERS } from './eval';
import { runEval, buildPrompt, extractRefs, extractPairs, SAMPLE_TASKS } from './eval-run';
import { aliasRows, floatCollections, passJs, passOrder } from './materialise-to-figma';
import { buildWritePlan, buildFloatWritePlan, buildStylesPlan, gradientTransformFor, buildFontVarPlan, buildTextStylePlan } from './write-plan';
import { verifyReadback, verifyFloatReadback, verifyTypographyReadback, ReadbackSnapshot } from './read-back';
import { serializeBrandInput, deserializeBrandInput, PERSIST_VERSION } from './persist-input';
import { validateComponentDef, ComponentDef, AnatomyDef } from './component-schema';
import { figmaAnatomyPlan, planBindingErrors, planPartNames, planBoundVars, planToPluginJs, figmaVarName } from './anatomy-figma';
import { button } from './components/button';
import { iconButton } from './components/icon-button';
import { fieldLabel } from './components/field-label';
import { fieldMessage } from './components/field-message';
import { textField } from './components/text-field';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join, relative } from 'node:path';
const HERE = dirname(fileURLToPath(import.meta.url));

let pass = 0; const fails: string[] = [];
const ok = (cond: boolean, msg: string) => { if (cond) pass++; else fails.push(msg); };
const approx = (a: number, b: number, eps: number) => Math.abs(a - b) <= eps;

// ---------------------------------------------------------------- colour math
const WHITE: RGB = { r: 255, g: 255, b: 255 };
const BLACK: RGB = { r: 0, g: 0, b: 0 };

// round-trip sRGB → OKLCH → sRGB (within ±2/255)
for (const rgb of [WHITE, BLACK, { r: 207, g: 10, b: 44 }, { r: 18, g: 120, b: 200 }, { r: 120, g: 200, b: 30 }, { r: 250, g: 240, b: 5 }]) {
  const rt = oklchToRgb(rgbToOklch(rgb));
  ok(approx(rt.r, rgb.r, 2) && approx(rt.g, rgb.g, 2) && approx(rt.b, rgb.b, 2), `round-trip ${hex(rgb)} → ${hex(rt)}`);
}

// hex formatting
ok(hex(WHITE) === '#ffffff', 'hex(white)');
ok(hex(BLACK) === '#000000', 'hex(black)');
ok(hex({ r: 207, g: 10, b: 44 }) === '#cf0a2c', 'hex(nb red)');

// WCAG contrast: white/black = 21; identical = 1; symmetric
ok(approx(contrast(WHITE, BLACK), 21, 0.05), `contrast(white,black)=${contrast(WHITE, BLACK)}`);
ok(approx(contrast(WHITE, WHITE), 1, 0.001), 'contrast(white,white)=1');
ok(approx(contrast({ r: 80, g: 80, b: 80 }, WHITE), contrast(WHITE, { r: 80, g: 80, b: 80 }), 1e-9), 'contrast symmetric');
ok(contrast({ r: 117, g: 117, b: 117 }, WHITE) >= 4.4 && contrast({ r: 117, g: 117, b: 117 }, WHITE) <= 4.7, 'contrast grey/white ≈ 4.5 (AA pivot)');
// CR-01 regression: contrast() must return the RAW ratio so a pass/fail test is WCAG-correct.
// #007ea1 on black measures 4.4990 — it must read BELOW 4.5 (a genuine AA fail), not round up
// to a false pass. Guards against re-introducing a round() inside contrast().
{
  const marginal = contrast(hexToRgb('#007ea1'), BLACK);
  ok(marginal < 4.5 && marginal > 4.49, `contrast() raw: #007ea1/black = ${marginal.toFixed(5)} < 4.5 (no round-up false AA pass)`);
  ok(marginal !== Math.round(marginal * 100) / 100, 'contrast() returns un-rounded ratio (not pre-rounded to 2dp)');
}

// M-13: hexToRgb accepts 8-digit alpha hex (`#RRGGBBAA`, common in real extractions) and 4-digit
// `#RGBA` by dropping the alpha (anchors are opaque) — a trailing FF must not read as "invalid
// hex" and crash the standard-dialect CLI. Genuinely malformed hex is still rejected.
{
  ok(hex(hexToRgb('#C8102EFF')) === '#c8102e', 'M-13: 8-digit alpha hex drops the alpha (#C8102EFF → #c8102e)');
  ok(hex(hexToRgb('#c8102e88')) === '#c8102e', 'M-13: a non-FF alpha is dropped to the opaque colour');
  ok(hex(hexToRgb('#f008')) === '#ff0000', 'M-13: 4-digit #RGBA expands + drops alpha');
  let bad = false; try { hexToRgb('#12345'); } catch { bad = true; }
  ok(bad, 'M-13: a malformed (5-digit) hex is still rejected');
}

// relative luminance bounds
ok(approx(luminance(WHITE), 1, 1e-6), 'luminance(white)=1');
ok(approx(luminance(BLACK), 0, 1e-6), 'luminance(black)=0');

// gamut: maxChroma returns an in-gamut boundary; a hair past it is out
for (const l of [0.3, 0.5, 0.7]) for (const h of [0, 120, 240]) {
  const c = maxChroma(l, h);
  ok(inGamut({ l, c, h }), `maxChroma in-gamut l${l} h${h} (c=${c.toFixed(3)})`);
  ok(!inGamut({ l, c: c + 0.05, h }), `maxChroma+0.05 out-of-gamut l${l} h${h}`);
}

// ΔE2000: identity 0, symmetric, white/black large
ok(approx(deltaE2000(WHITE, WHITE), 0, 1e-9), 'ΔE(x,x)=0');
ok(approx(deltaE2000(WHITE, BLACK), deltaE2000(BLACK, WHITE), 1e-9), 'ΔE symmetric');
ok(deltaE2000(WHITE, BLACK) > 95, 'ΔE(white,black) large');

// autoPlaceStep: lighter → lower step number, darker → higher; always a valid step
ok(STEP_NUMS.includes(autoPlaceStep(0.5)), 'autoPlaceStep returns a valid step');
ok(autoPlaceStep(0.9) < autoPlaceStep(0.3), 'autoPlaceStep: lighter < darker');

// anchor preservation: a pinned step reproduces the anchor OKLCH (the thesis)
{
  const anchorOklch = { l: 0.542, c: 0.215, h: 23 };
  const ramp = generateRamp({ hue: 23, chroma: 0.215, anchor: { oklch: anchorOklch, stepNum: 550 } });
  const step = ramp.find((s) => s.num === 550)!;
  ok(deltaE2000(step.rgb, oklchToRgb(anchorOklch)) < 1, `anchor preserved (ΔE ${deltaE2000(step.rgb, oklchToRgb(anchorOklch)).toFixed(2)})`);

  // M-01: every ramp step must be a well-formed #rrggbb — a degenerate anchor L (== lMax/lMin)
  // used to divide by zero in the chroma arc → `#NaNNaNNaN`. Cover normal + extreme-L anchors.
  const hexOk = (r: ReturnType<typeof generateRamp>) => r.every((s) => /^#[0-9a-f]{6}$/.test(s.hex));
  ok(hexOk(ramp), 'M-01: normal ramp emits only #rrggbb hex');
  ok(hexOk(generateRamp({ hue: 285, chroma: 0.18, anchor: { oklch: { l: 0.975, c: 0.1, h: 285 }, stepNum: 500 } })), 'M-01: anchor L at lMax (mismatched step) — no NaN hex');
  ok(hexOk(generateRamp({ hue: 285, chroma: 0.18, anchor: { oklch: { l: 0.16, c: 0.05, h: 285 }, stepNum: 500 } })), 'M-01: anchor L at lMin (mismatched step) — no NaN hex');
  ok(hexOk(generateRamp({ hue: 145, chroma: 0.3, peakL: 0.9 })), 'M-01: unanchored vivid arc — no NaN hex');

  // M-02: a pinned anchor whose lightness disagrees with its step position used to leave the
  // ramp non-monotonic (a later step lighter than an earlier one — mode pickers misread it).
  // Now it throws; a consistent anchor stays strictly light→dark.
  const monotonic = (r: ReturnType<typeof generateRamp>) => r.every((s, i) => i === 0 || s.oklch.l <= r[i - 1].oklch.l + 1e-9);
  ok(monotonic(ramp), 'M-02: a consistent ramp is monotonic non-increasing in L');
  let m2 = false;
  try { generateRamp({ hue: 285, chroma: 0.18, anchor: { oklch: { l: 0.985, c: 0.1, h: 285 }, stepNum: 50 } }); } catch { m2 = true; }
  ok(m2, 'M-02: an anchor L that inverts the light→dark order throws (not a silent broken ramp)');

  // M-03: an out-of-gamut anchor can't render exactly; the independent-channel clamp silently
  // shifts L AND hue. The rendered colour genuinely drifts (the old anchor-ΔE gate compared two
  // identically-clipped values → tautologically ~0, blind to this), and brandTheme now SURFACES
  // it in the decisions log instead of shipping a quietly-shifted brand colour.
  const oog = { l: 0.55, c: 0.32, h: 145 };
  const rendered = rgbToOklch(generateRamp({ hue: 145, chroma: 0.2, anchor: { oklch: oog, stepNum: 500 } }).find((s) => s.num === 500)!.rgb);
  ok(Math.abs(rendered.h - oog.h) > 1 || Math.abs(rendered.l - oog.l) > 0.02, 'M-03: an out-of-gamut anchor genuinely drifts in hue/L (the old anchor ΔE gate compared two identically-clipped values — tautological)');
  const mkTheme = (o: { l: number; c: number; h: number }) => brandTheme({ id: 't', primary: { l: 0.6, c: 0.03, h: 200 }, neutral: { hue: 200, chroma: 0.01 }, brandColors: [{ name: 'x', oklch: o }] });
  ok(mkTheme(oog).notes.some((n) => n.includes("anchor 'x'") && n.includes('OUT of sRGB gamut')), 'M-03: brandTheme surfaces an out-of-gamut anchor in the decisions log (not silent)');
  ok(!mkTheme({ l: 0.5, c: 0.04, h: 200 }).notes.some((n) => n.includes('OUT of sRGB gamut')), 'M-03: an all-in-gamut brand produces no gamut warning');
}

// ------------------------------------------------ extreme white-label brands
const brands: BrandInput[] = [
  { id: 't-dark', primary: { l: 0.22, c: 0.06, h: 264 }, neutral: { hue: 264, chroma: 0.01 } },                 // near-black primary
  { id: 't-red', primary: { l: 0.55, c: 0.2, h: 25 }, neutral: { hue: 25, chroma: 0.01 }, actionPalette: 'neutral' }, // red (danger-reuse) + action≠brand→neutral
  { id: 't-yellow', primary: { l: 0.85, c: 0.18, h: 95 }, neutral: { hue: 95, chroma: 0.015 } },                // light high-chroma yellow (hard accessible action)
  { id: 't-min', primary: { l: 0.5, c: 0.15, h: 200 }, neutral: { hue: 200, chroma: 0.008 } },                  // bare minimum (all defaults)
  { id: 't-hcdark', primary: { l: 0.5, c: 0.12, h: 300 }, neutral: { hue: 300, chroma: 0.01 }, surfaces: { light: { base: 100 }, dark: { base: 950 } }, motionPersonality: { tempo: 'relaxed' }, iconContrast: '3:1', disabledStrategy: 'full' }, // every lever exercised (disabledStrategy on its non-default LIVE branch; the legacy aliases are covered directly in (7b))
];

for (const b of brands) {
  let theme;
  try { theme = brandTheme(b); } catch (e) { fails.push(`[${b.id}] brandTheme threw: ${(e as Error).message}`); continue; }
  const modes = resolveAllModes(theme);
  ok(modes.length === 4, `[${b.id}] 4 modes`);
  for (const m of modes) {
    const checked = Object.entries(m.roles).filter(([, r]) => r.min > 0);
    const broken = checked.filter(([, r]) => r.ratio < r.min);
    ok(broken.length === 0, `[${b.id}/${m.mode}] all ${checked.length} contracts pass` + (broken.length ? ` — FAILED: ${broken.map(([k, r]) => `${k} ${r.ratio}<${r.min}`).join(', ')}` : ''));
    // L-01: stateful groups must stay visually distinct — a `walk` that saturated
    // at a ramp end would collapse hover/pressed onto rest. rest (walk 0)
    // ≠ hover (walk 1) ≠ pressed (walk 2), by path, for every interactive fill + link group.
    const path = (k: string) => (m.roles as any)[k]?.path;
    for (const g of ['interactive.primary', 'interactive.destructive']) {
      const [d, h, p] = [path(`${g}.fill.rest`), path(`${g}.fill.hover`), path(`${g}.fill.pressed`)];
      if (d && h && p) ok(d !== h && d !== p && h !== p, `[${b.id}/${m.mode}] ${g} fill states are distinct (rest/hover/pressed = ${d?.split('.').pop()}/${h?.split('.').pop()}/${p?.split('.').pop()})`);
    }
    const [ld, lh, lv] = [path('text.link.default'), path('text.link.hover'), path('text.link.visited')];
    if (ld && lh && lv) ok(ld !== lh && ld !== lv && lh !== lv, `[${b.id}/${m.mode}] text.link states are distinct`);
  }
}

// nbTheme regression theme also clears every contract
{
  const modes = resolveAllModes(nbTheme());
  const broken = modes.flatMap((m) => Object.entries(m.roles).filter(([, r]) => r.min > 0 && r.ratio < r.min).map(([k]) => `${m.mode}.${k}`));
  ok(broken.length === 0, 'nbTheme all contracts pass' + (broken.length ? ` — FAILED: ${broken.join(', ')}` : ''));
}

// INTERACTIVE COLOUR FAMILY (docs/20) — pin the family's intent where the frozen
// real-NB fixture no longer can: the legacy action.* / foreground.danger.* fills are
// REMOVED (task #14 — components bind interactive.*), the interactive.<color> family has
// the full slot/state shape, the historical neutral miss (§12) is a GATED contract that
// passes in every mode, and the Figma slots carry slot-aware scopes.
{
  const modes = resolveAllModes(nbTheme());
  const light = modes.find((m) => m.mode === 'light')!.roles;

  // (a) the legacy interactive fills are gone — action.* and the stateful foreground.danger.*
  //     no longer generated; danger is now a bare foreground.danger fill (like the others).
  const legacyPresent = [
    ...['default', 'hover', 'pressed', 'focused', 'selected', 'disabled'].map((s) => `action.${s}`),
    ...['default', 'hover', 'pressed', 'focused', 'selected', 'disabled'].map((s) => `foreground.danger.${s}`),
  ].filter((k) => k in light);
  ok(legacyPresent.length === 0, 'interactive: legacy action.* / foreground.danger.* fills removed' + (legacyPresent.length ? ` — STILL PRESENT ${legacyPresent.join(',')}` : ''));
  ok('foreground.danger' in light, 'interactive: danger is a bare foreground.danger fill (stateful/interactive expression is interactive.destructive.*)');

  // (b) interactive.<color> shape — three colours, each fill(+5 states, no per-colour
  //     disabled)/on-fill/text/border. Disabled is the cross-cutting disabled.* family.
  const shapeMissing: string[] = [];
  for (const c of ['primary', 'neutral', 'destructive']) {
    for (const st of ['rest', 'hover', 'pressed', 'focused', 'selected'])
      if (!(`interactive.${c}.fill.${st}` in light)) shapeMissing.push(`interactive.${c}.fill.${st}`);
    for (const slot of ['on-fill', 'text.rest', 'text.hover', 'text.pressed', 'border'])
      if (!(`interactive.${c}.${slot}` in light)) shapeMissing.push(`interactive.${c}.${slot}`);
  }
  ok(shapeMissing.length === 0, 'interactive: primary/neutral/destructive each carry fill(+5 states)/on-fill/text.{rest,hover,pressed}/border' + (shapeMissing.length ? ` — MISSING ${shapeMissing.slice(0, 4).join(',')}` : ''));
  // (b2) per-colour disabled fill is retired — no interactive.<color>.fill.disabled.
  const perColourDisabled = ['primary', 'neutral', 'destructive'].map((c) => `interactive.${c}.fill.disabled`).filter((k) => k in light);
  ok(perColourDisabled.length === 0, 'interactive: per-colour fill.disabled retired (cross-cutting disabled.* instead)' + (perColourDisabled.length ? ` — STILL PRESENT ${perColourDisabled.join(',')}` : ''));

  // (c) neutral fill.rest is a subtle SURFACE (min 0) — the gated pair is its ink, not the fill.
  ok(light['interactive.neutral.fill.rest'].min === 0, 'interactive: neutral.fill.rest is a min-0 subtle surface');

  // (d) the historical neutral MISS (§12) is now a passing gated contract in EVERY mode:
  //     on-fill contrast-verified against fill.rest at onMin (4.5).
  const neutralFails: string[] = [];
  for (const m of modes) {
    const r = m.roles['interactive.neutral.on-fill'];
    if (!r) { neutralFails.push(`${m.mode}:absent`); continue; }
    if (r.min < 4.5) neutralFails.push(`${m.mode}:min=${r.min}`);
    if (r.against !== 'interactive.neutral.fill.rest') neutralFails.push(`${m.mode}:against=${r.against}`);
    if (r.ratio < r.min) neutralFails.push(`${m.mode}:${r.ratio.toFixed(2)}<${r.min}`);
  }
  ok(neutralFails.length === 0, 'interactive: neutral on-fill is a passing gated contract in every mode' + (neutralFails.length ? ` — ${neutralFails.join(',')}` : ''));

  // (e) Figma slots are scoped by SLOT (fill→paint, text→TEXT_FILL, border→STROKE_COLOR).
  const { color } = buildFigmaColor(nbTheme());
  const byName = new Map<string, any>(color.find((c) => c.$mode === 'light')!.variables.map((v: any) => [v.name, v]));
  const scopeOf = (n: string) => JSON.stringify(byName.get(n)?.scopes ?? null);
  const scopeBad: string[] = [];
  if (scopeOf('color/interactive/primary/text/rest') !== JSON.stringify(['TEXT_FILL'])) scopeBad.push('primary/text/rest');
  if (scopeOf('color/interactive/primary/border') !== JSON.stringify(['STROKE_COLOR'])) scopeBad.push('primary/border');
  if (scopeOf('color/interactive/primary/fill/rest') !== JSON.stringify(['FRAME_FILL', 'SHAPE_FILL'])) scopeBad.push('primary/fill/rest');
  ok(scopeBad.length === 0, 'interactive: Figma slots carry slot-aware scopes' + (scopeBad.length ? ` — ${scopeBad.join(',')}` : ''));

  // (e2) disabled.<slot> is also slot-scoped — surface/on-disabled paint, text=TEXT_FILL,
  //     icon=[FRAME,SHAPE,STROKE], border=STROKE. Before this gate, disabled had no entry
  //     in COLOR_SCOPES so the family fell through to fill scopes and inks miscased —
  //     the NB fixture doesn't carry disabled/*, so the round-trip test was the only
  //     signal. This pins all five slots.
  const disabledScopeBad: string[] = [];
  if (scopeOf('color/disabled/fill') !== JSON.stringify(['FRAME_FILL', 'SHAPE_FILL'])) disabledScopeBad.push('disabled/fill');
  if (scopeOf('color/disabled/on-fill') !== JSON.stringify(['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL'])) disabledScopeBad.push('disabled/on-fill');
  if (scopeOf('color/disabled/text') !== JSON.stringify(['TEXT_FILL'])) disabledScopeBad.push('disabled/text');
  if (scopeOf('color/disabled/icon') !== JSON.stringify(['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR'])) disabledScopeBad.push('disabled/icon');
  if (scopeOf('color/disabled/border') !== JSON.stringify(['STROKE_COLOR'])) disabledScopeBad.push('disabled/border');
  ok(disabledScopeBad.length === 0, 'disabled: Figma slots carry slot-aware scopes' + (disabledScopeBad.length ? ` — ${disabledScopeBad.join(',')}` : ''));

  // (e3) field.<slot> (docs/20 §17) is slot-scoped too — surface paints, border strokes,
  //      placeholder = TEXT_FILL. Same fall-through risk as disabled if it lacked a branch.
  const fieldScopeBad: string[] = [];
  if (scopeOf('color/field/fill') !== JSON.stringify(['FRAME_FILL', 'SHAPE_FILL'])) fieldScopeBad.push('field/fill');
  if (scopeOf('color/field/border/rest') !== JSON.stringify(['STROKE_COLOR'])) fieldScopeBad.push('field/border/rest');
  if (scopeOf('color/field/border/hover') !== JSON.stringify(['STROKE_COLOR'])) fieldScopeBad.push('field/border/hover');
  if (scopeOf('color/field/placeholder') !== JSON.stringify(['TEXT_FILL'])) fieldScopeBad.push('field/placeholder');
  ok(fieldScopeBad.length === 0, 'field: Figma slots carry slot-aware scopes' + (fieldScopeBad.length ? ` — ${fieldScopeBad.join(',')}` : ''));

  // (f) overlays (docs/20 §6): each colour has hover/pressed/selected washes, mode-adaptive
  //     (black-alpha light / white-alpha dark), and the COMPOSITED result is a gated contract
  //     — text.primary stays ≥ AA on the tinted surface in every mode (the wash-out guard).
  const overlayFails: string[] = [];
  for (const m of modes) {
    const pal = m.mode.includes('dark') ? 'white-alpha' : 'black-alpha';
    for (const c of ['primary', 'neutral', 'destructive'])
      for (const st of ['hover', 'pressed', 'selected']) {
        const r = m.roles[`interactive.${c}.overlay.${st}`];
        if (!r) { overlayFails.push(`${m.mode}:${c}.${st}:absent`); continue; }
        if (r.min < 4.5 || r.ratio < r.min) overlayFails.push(`${m.mode}:${c}.${st}:${r.ratio.toFixed(2)}<${r.min}`);
        if (!r.path.includes(pal)) overlayFails.push(`${m.mode}:${c}.${st}:pal=${r.path}`);
      }
  }
  ok(overlayFails.length === 0, 'interactive: overlays present, mode-adaptive, composited-contrast gated in every mode' + (overlayFails.length ? ` — ${overlayFails.slice(0, 3).join(',')}` : ''));

  // (g) the outlineInteraction lever opts out: 'none' emits NO overlay tokens.
  const noOverlay = resolveAllModes({ ...nbTheme(), outlineInteraction: 'none' })
    .flatMap((m) => Object.keys(m.roles)).filter((k) => k.includes('.overlay.'));
  ok(noOverlay.length === 0, 'interactive: outlineInteraction=none emits no overlays' + (noOverlay.length ? ` — ${noOverlay.slice(0, 2).join(',')}` : ''));

  // (h) `solid-tint` emits a REAL per-column tint (#288). Before this, the value was selectable and
  // emitted nothing for any brand — behaviourally identical to `none` — because the doc comment
  // pointed at `foreground.<color>-subtle`, a role only ever keyed by the five SEMANTICS names, never
  // by an interactive COLUMN name. The bug was invisible precisely because nothing asserted the
  // difference, so the first thing checked here is that the two values DIFFER at all.
  {
    const tintRoles = (t: any) => resolveAllModes({ ...t, outlineInteraction: 'solid-tint' });
    const noneRoles = (t: any) => resolveAllModes({ ...t, outlineInteraction: 'none' });
    const keysOf = (ms: any[]) => ms.flatMap((m) => Object.keys(m.roles)).filter((k) => k.includes('.subtle-fill.'));

    ok(keysOf(tintRoles(nbTheme())).length > 0, '#288 solid-tint emits subtle-fill roles (it emitted NOTHING before)');
    ok(keysOf(noneRoles(nbTheme())).length === 0, '#288 outlineInteraction=none still emits no subtle-fill');
    ok(keysOf(resolveAllModes(nbTheme())).length === 0, '#288 the default (overlay-neutral) emits no subtle-fill — existing artifacts unmoved');

    // The contract, on every brand INCLUDING the extremes — two example brands generalising is an
    // assumption, and the nominal step is only a starting point for the contract-driven walk.
    const brands: Array<[string, any]> = [
      ['nb', nbTheme()],
      ['aurora', brandTheme(parseDesignMd(readFileSync(resolve(HERE, '../examples/aurora.design.md'), 'utf8')).input)],
      ['harbor', brandTheme(parseDesignMd(readFileSync(resolve(HERE, '../examples/harbor.design.md'), 'utf8')).input)],
      // near-black primary + a light high-chroma yellow: the two hardest ink/tint pairings the suite has.
      ['near-black', brandTheme({ id: 'nbk', primary: { l: 0.18, c: 0.04, h: 260 }, neutral: { hue: 260, chroma: 0.006, auto: true } } as any)],
      ['hot-yellow', brandTheme({ id: 'hy', primary: { l: 0.86, c: 0.19, h: 95 }, neutral: { hue: 95, chroma: 0.006, auto: true } } as any)],
    ];
    const bad: string[] = [];
    let checked = 0;
    for (const [id, t] of brands) {
      for (const m of tintRoles(t)) {
        for (const [key, r] of Object.entries(m.roles) as [string, any][]) {
          if (!key.includes('.subtle-fill.')) continue;
          checked++;
          // The published promise is ink-on-tint, so hold it to its own stated minimum.
          if (r.min > 0 && r.ratio < r.min - 0.005) bad.push(`${id}/${m.mode}/${key} ${r.ratio.toFixed(2)} < ${r.min}`);
        }
      }
    }
    ok(bad.length === 0, `#288 every subtle-fill keeps its state ink legible (${checked} roles across ${brands.length} brands)`
      + (bad.length ? ` — FAILING: ${bad.slice(0, 4).join(', ')}` : ''));
    ok(checked > 0, '#288 the subtle-fill contract check is live (it found roles to judge)');

    // And the tint must be VISIBLE against the page, or the hover does nothing — the inert-control
    // class this repo has now hit three times (#288 itself, #305, pre-#297 leading). ΔE00 2.3 is the
    // classic just-noticeable bar; measured worst across the example brands was 5.81.
    const invisible: string[] = [];
    for (const [id, t] of brands) {
      for (const m of tintRoles(t)) {
        const page = m.roles['background.primary'];
        if (!page) continue;
        for (const [key, r] of Object.entries(m.roles) as [string, any][]) {
          if (!key.includes('.subtle-fill.')) continue;
          const d = deltaE2000(hexToRgb(r.hex), hexToRgb(page.hex));
          if (d < 2.3) invisible.push(`${id}/${m.mode}/${key} ΔE ${d.toFixed(2)}`);
        }
      }
    }
    ok(invisible.length === 0, '#288 every subtle-fill is perceptibly different from the page (ΔE00 ≥ 2.3)'
      + (invisible.length ? ` — INVISIBLE: ${invisible.slice(0, 4).join(', ')}` : ''));
  }
}


// ICON SIZE TIER (#324). There was no `icon` category in the emitted tree at all, so a component's
// visual slot had nothing to bind for size — the one gap that stopped the Button Figma round-trip
// outright rather than degrading it (docs/28 §3.2).
//
// Asserts the DERIVATION, not the numbers: the issue's own verify list calls that out, because a test
// that only restates the emitted px passes just as happily when the tier stops aliasing the grid and
// starts carrying literals. The load-bearing property is that every step resolves through
// `dimension.*` — that is what makes this a tier rather than five magic numbers.
{
  const brands: Array<[string, any]> = [
    ['nb', nbTheme()],
    ['aurora', brandTheme(parseDesignMd(readFileSync(resolve(HERE, '../examples/aurora.design.md'), 'utf8')).input)],
    ['harbor', brandTheme(parseDesignMd(readFileSync(resolve(HERE, '../examples/harbor.design.md'), 'utf8')).input)],
    // A coarse baseUnit is the case that would dangle: the fixed icon ladder is NOT a multiple of 6,
    // so without buildDims feeding icon px into the grid extras these aliases would break (#274's shape).
    ['baseUnit-6', brandTheme({ id: 'b6', root: 'prism', baseUnit: 6, primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.006, auto: true } } as any)],
  ];
  for (const [id, t] of brands) {
    const built = buildTree(t);
    const root = (built.tree as any)[Object.keys(built.tree)[0]];
    const grp = root.icon?.size;
    ok(!!grp, `#324 ${id}: icon.size.* exists (there was no icon category at all before)`);
    if (!grp) continue;
    ok(ICON_SIZES.every((s) => grp[s.name]), `#324 ${id}: all ${ICON_SIZES.length} steps present (${ICON_SIZES.map((s) => s.name).join('/')})`);
    // THE derivation assertion: an alias into the dimension grid, not a literal.
    const notAliased = ICON_SIZES.filter((s) => typeof grp[s.name]?.$value !== 'string' || !/^\{.+\.dimension\..+\}$/.test(grp[s.name].$value));
    ok(notAliased.length === 0, `#324 ${id}: every step aliases dimension.* rather than carrying a literal`
      + (notAliased.length ? ` — LITERAL: ${notAliased.map((s) => `${s.name}=${JSON.stringify(grp[s.name].$value)}`).join(', ')}` : ''));
    // …and the alias must actually resolve, which is the half a shape-check alone would miss.
    const dangling = ICON_SIZES.filter((s) => {
      const m = String(grp[s.name].$value).match(/^\{(.+)\}$/);
      return !m || !at(built.tree, m[1]);
    });
    ok(dangling.length === 0, `#324 ${id}: every icon alias resolves` + (dangling.length ? ` — DANGLING: ${dangling.map((s) => s.name).join(', ')}` : ''));
  }

  // Invariance: the ladder is a fixed enumerated set, so it must NOT pick up a per-mode or per-density
  // variant. Density is the live risk — it shifts `size.*`, and icon size co-varies with control size,
  // so it is the change someone would reasonably make. The field research forbids it (off-grid).
  const density = (d: string) => {
    const t = brandTheme({ id: 'd', root: 'prism', density: d, modes: ['light', 'dark'],
      primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.006, auto: true } } as any);
    return JSON.stringify((buildTree(t).tree as any).prism.icon.size);
  };
  ok(density('compact') === density('comfortable') && density('spacious') === density('comfortable'),
    '#324 icon.size is density-invariant (a fixed artboard ladder; density must not scale it off-grid)');
  const withModes = (buildTree(brandTheme({ id: 'm', root: 'prism', modes: ['light', 'dark'],
    primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.006, auto: true },
    modeLevers: { dark: { density: 'compact' } } } as any)).tree as any).prism.icon.size;
  const modeCarrying = ICON_SIZES.filter((s) => withModes[s.name]?.$extensions?.prism3?.modes);
  ok(modeCarrying.length === 0, '#324 icon.size carries no per-mode variant (primitive tier, #296)'
    + (modeCarrying.length ? ` — CARRIES: ${modeCarrying.map((s) => s.name).join(', ')}` : ''));

  // The ladder pairs 1:1 with the component-size names, which is what lets the anatomy layer (#327)
  // map control size -> icon size by identity instead of reconciling two differently-shaped scales.
  const sizeNames = nbTheme().dims.sizes.map((s: any) => s.name).join(',');
  ok(ICON_SIZES.map((s) => s.name).join(',') === sizeNames,
    `#324 icon steps pair 1:1 with size.* names (icon ${ICON_SIZES.map((s) => s.name).join('/')} vs size ${sizeNames})`);
}


// SIZE GAP (#325) — the label<->visual space. `size.*` carried height/padding-x/padding-y but nothing
// for the space between a leading visual, the label, and a trailing visual, so a Button with an icon
// had no token for the one measurement that makes it read as assembled.
//
// The owner's hesitation on filing was the right one to design against: "teams will just use standard
// spacing variables, and then you'll have some things as gaps and others as generic spacing." The
// answer is structural — the component tier ALIASES the space scale rather than minting values, so
// `size.md.gap` is `{space.100}`, a named pointer, not a competing 8px. These assert that property
// holds rather than trusting it.
{
  // 1. The CONTRACT, not the numbers: gap must be strictly tighter than the padding that separates
  //    content from the control edge. That is proximity — elements inside a group must sit closer to
  //    each other than to the group's boundary, or the icon and label stop reading as one unit. The
  //    exact fraction is a tuning knob; this inequality is what must never break.
  const violations: string[] = [];
  for (const d of ['compact', 'comfortable', 'spacious'] as const) {
    for (const base of [4, 8, 12]) {
      for (const z of componentSizes(d, base)) {
        if (!(z.gap < z.padX)) violations.push(`${d}/base${base}/${z.name}: gap ${z.gap} !< padX ${z.padX}`);
        if (z.gap <= 0) violations.push(`${d}/base${base}/${z.name}: gap ${z.gap} is not positive`);
      }
    }
  }
  ok(violations.length === 0, '#325 gap is always tighter than padding-x, at every size / density / spaceBase (proximity)'
    + (violations.length ? ` — VIOLATIONS: ${violations.slice(0, 4).join(', ')}` : ''));

  // #326 — the THREE-WAY ordering, which is the whole optical model in one assertion:
  //     gap  <  padXVisual  <  padX
  // tightest inside the group; looser where a glyph's own bounding box already contributes apparent
  // space; loosest against plain text. The ratios are tuning knobs — this chain is the contract, so it
  // is what gets locked rather than the numbers (which would pass just as happily if the ordering
  // inverted and someone had updated the expected values to match).
  const chain: string[] = [];
  for (const d of ['compact', 'comfortable', 'spacious'] as const) {
    for (const base of [4, 8, 12]) {
      for (const z of componentSizes(d, base)) {
        if (!(z.gap < z.padXVisual && z.padXVisual < z.padX))
          chain.push(`${d}/base${base}/${z.name}: ${z.gap} < ${z.padXVisual} < ${z.padX}`);
      }
    }
  }
  ok(chain.length === 0, '#326 the ordering holds everywhere: gap < padding-x-visual < padding-x'
    + (chain.length ? ` — BROKEN: ${chain.slice(0, 4).join(' | ')}` : ''));

  // #326 is ADDITIVE — `padding-x` keeps its meaning (the label side) so no existing binding moves.
  // The claim is only true if the visual-side value is a DIFFERENT leaf, never a mutation of padX.
  for (const d of ['compact', 'comfortable', 'spacious'] as const) {
    const sizes = componentSizes(d, 8);
    const padXs = sizes.map((z) => z.padX).join(',');
    const expected = { compact: '8,8,16,16,24', comfortable: '8,16,16,24,24', spacious: '16,16,24,24,24' }[d];
    ok(padXs === expected, `#326 ${d}: padding-x is unchanged by the split (${padXs})`);
  }

  // …and it must alias the space scale like its siblings, not mint an off-scale literal.
  {
    const built = buildTree(nbTheme());
    const size = (built.tree as any)[Object.keys(built.tree)[0]].size;
    const bad = Object.keys(size).filter((k) => {
      const v = size[k]?.['padding-x-visual']?.$value;
      return typeof v !== 'string' || !/^\{.+\.space\..+\}$/.test(v);
    });
    ok(bad.length === 0, '#326 every padding-x-visual aliases space.* rather than carrying a literal'
      + (bad.length ? ` — LITERAL: ${bad.join(', ')}` : ''));
  }

  // 2. The issue's own bar: "visibly proportionate across the sizes (not a constant)". A gap that is
  //    the same at every size would make the token pure overhead — space.* would do.
  const gaps = componentSizes('comfortable', 8).map((z) => z.gap);
  ok(new Set(gaps).size >= 3, `#325 gap varies across sizes — a constant would make the token pointless (${gaps.join('/')})`);
  ok(gaps.every((g, i) => i === 0 || g >= gaps[i - 1]), `#325 gap never shrinks as the control grows (${gaps.join('/')})`);

  // 3. It ALIASES the space scale — the whole answer to "isn't this a second spacing system?". A
  //    literal here would be exactly the duplicate-value problem the design set out to avoid.
  for (const [id, t] of [['nb', nbTheme()], ['aurora', brandTheme(parseDesignMd(readFileSync(resolve(HERE, '../examples/aurora.design.md'), 'utf8')).input)]] as Array<[string, any]>) {
    const built = buildTree(t);
    const size = (built.tree as any)[Object.keys(built.tree)[0]].size;
    const bad = Object.keys(size).filter((k) => {
      const v = size[k]?.gap?.$value;
      return typeof v !== 'string' || !/^\{.+\.space\..+\}$/.test(v);
    });
    ok(bad.length === 0, `#325 ${id}: every gap aliases space.* rather than carrying a literal`
      + (bad.length ? ` — LITERAL: ${bad.map((k) => `${k}=${JSON.stringify(size[k]?.gap?.$value)}`).join(', ')}` : ''));
    const dangling = Object.keys(size).filter((k) => {
      const m = String(size[k].gap.$value).match(/^\{(.+)\}$/);
      return !m || !at(built.tree, m[1]);
    });
    ok(dangling.length === 0, `#325 ${id}: every gap alias resolves` + (dangling.length ? ` — DANGLING: ${dangling.join(', ')}` : ''));
  }

  // 4. Gap rides the per-mode density seam like padding does — a mode at a different density
  //    re-derives its ladder, so its gap must move with it rather than freezing at the base value.
  const perMode = (buildTree(brandTheme({ id: 'g', root: 'prism', modes: ['light', 'dark'],
    primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.006, auto: true },
    modeLevers: { dark: { density: 'compact' } } } as any)).tree as any).prism.size;
  const moved = Object.keys(perMode).filter((k) => perMode[k].gap?.$extensions?.prism3?.modes?.dark);
  ok(moved.length > 0, '#325 gap carries a per-mode override where density deviates (it must not freeze at the base density)');
}

// DISABLED — cross-cutting family (docs/20 §7): one treatment regardless of intent,
// present in every mode, with its on-ink gated against the disabled surface.
{
  const modes = resolveAllModes(nbTheme());
  const shapeMissing: string[] = [];
  for (const m of modes)
    for (const k of ['fill', 'on-fill', 'text', 'icon', 'border'])
      if (!(`disabled.${k}` in m.roles)) shapeMissing.push(`${m.mode}:disabled.${k}`);
  ok(shapeMissing.length === 0, 'disabled: surface/on-disabled/text/icon/border in every mode' + (shapeMissing.length ? ` — ${shapeMissing.slice(0, 3).join(',')}` : ''));

  const onFails: string[] = [];
  for (const m of modes) {
    const r = m.roles['disabled.on-fill'];
    if (r.against !== 'disabled.fill') onFails.push(`${m.mode}:against=${r.against}`);
    if (r.min > 0 && r.ratio < r.min) onFails.push(`${m.mode}:${r.ratio.toFixed(2)}<${r.min}`);
  }
  ok(onFails.length === 0, 'disabled: on-disabled is gated against disabled.fill (accessible strategy)' + (onFails.length ? ` — ${onFails.join(',')}` : ''));
}

// FIELD — form-element chrome (docs/20 §17). Minimal + gated: a surface + a PERCEIVABLE resting
// border (≥3:1 vs the page — the Prism2 improvement) + a READABLE placeholder (≥4.5 on the fill).
// Everything stateful composes from other families (focus→border.focus, disabled→disabled.*).
{
  const modes = resolveAllModes(nbTheme());
  const shapeMissing: string[] = [];
  for (const m of modes)
    for (const k of ['fill', 'border.rest', 'border.hover', 'placeholder'])
      if (!(`field.${k}` in m.roles)) shapeMissing.push(`${m.mode}:field.${k}`);
  ok(shapeMissing.length === 0, 'field: fill/border.rest/border.hover/placeholder present in every mode' + (shapeMissing.length ? ` — ${shapeMissing.slice(0, 3).join(',')}` : ''));

  const fails: string[] = [];
  for (const m of modes) {
    const b = m.roles['field.border.rest'], bh = m.roles['field.border.hover'], p = m.roles['field.placeholder'];
    // resting border is a perceivable boundary (SC 1.4.11) vs the page — NOT the sub-3:1 Prism2 shipped.
    if (b.against !== 'background.primary' || b.min < 3 || b.ratio < b.min) fails.push(`${m.mode}:border ${b.ratio.toFixed(2)}<${b.min}@${b.against}`);
    // hover border is a STRONGER boundary than rest (gated ≥4.5), same page ground — a perceptible, not sole, state cue.
    if (bh.against !== 'background.primary' || bh.min < 4.5 || bh.ratio < bh.min || bh.ratio < b.ratio) fails.push(`${m.mode}:border.hover ${bh.ratio.toFixed(2)}<${bh.min}@${bh.against}`);
    // placeholder is readable on the field fill — NOT a sub-AA hint.
    if (p.against !== 'field.fill' || p.min < 4.5 || p.ratio < p.min) fails.push(`${m.mode}:placeholder ${p.ratio.toFixed(2)}<${p.min}@${p.against}`);
  }
  ok(fails.length === 0, 'field: rest border ≥3:1 + hover border ≥4.5 (≥rest) on the page + placeholder ≥4.5 on the fill, every mode' + (fails.length ? ` — ${fails.join(',')}` : ''));
}

// MATERIALISE-TO-FIGMA — the colour aliases MUST bind a distinct target per mode. This locks
// the collapse-proofing into the suite (the #85 round-trip hit a hand-rolled script that bound
// light's target to all four modes → every mode identical). Pure + Figma-free: assert on the
// generated alias rows directly, so the guarantee doesn't rest solely on a manual round-trip.
{
  const { modes, rows } = aliasRows('nb');
  ok(modes.length === 4, `materialise: nb emits 4 colour modes (${modes.join('/')})`);
  ok(rows.length > 0 && rows.every(([, t]) => t.length === modes.length), 'materialise: every alias row carries one target per mode');
  ok(rows.some(([, t]) => new Set(t).size > 1), 'materialise: alias rows carry distinct per-mode targets (collapse-proof — not one target repeated)');
  const bg = rows.find(([n]) => n === 'color/background/primary');
  ok(!!bg && new Set(bg![1]).size > 1, 'materialise: background/primary binds a different palette step per mode (the collapse-guard probe)');
}

// WRITE-PLAN — the host-neutral plan the live plugin executor consumes (#108). Built IN-MEMORY
// from buildFigmaColor(theme) — the exact path the plugin main thread runs (no disk) — so the
// plan the executor writes is pinned independently of the disk-backed CLI. The collapse-guard is
// re-asserted at the plan level: each colour var carries one create-value AND one alias-target
// per mode, and background/primary's targets differ per mode.
{
  const plan = buildWritePlan(buildFigmaColor(nbTheme()));
  const { modes, create, aliases } = plan.color;
  ok(modes.length === 4, `write-plan: nb plan carries 4 colour modes (${modes.join('/')})`);
  ok(plan.palette.length > 0 && plan.palette.every((r) => r.hidden), 'write-plan: every core-palette primitive is hidden from publishing');
  ok(plan.palette.every((r) => r.scopes.length > 0 && r.value && typeof r.value.r === 'number'), 'write-plan: palette rows carry scopes + a literal RGBA value');
  ok(create.length > 0 && create.every((r) => r.valuesByMode.length === modes.length), 'write-plan: every colour create-row carries one literal value per mode');
  ok(aliases.length === create.length && aliases.every((r) => r.targetsByMode.length === modes.length), 'write-plan: every colour alias-row carries one target per mode (parallel to create-rows)');
  ok(aliases.some((r) => new Set(r.targetsByMode).size > 1), 'write-plan: alias rows carry distinct per-mode targets (collapse-proof at the plan level)');
  const bgp = aliases.find((r) => r.name === 'color/background/primary');
  ok(!!bgp && new Set(bgp!.targetsByMode).size > 1, 'write-plan: background/primary binds a different palette step per mode (plan-level collapse-guard probe)');
}

// READ-BACK verify (#109) — the read leg's contract, pure. Build a ReadbackSnapshot that mirrors a
// faithful read of a freshly-written NB file (straight off the WritePlan) and assert verifyReadback
// passes every check; then a NEGATIVE test — collapse background/primary to one target per mode —
// must fail modesDistinct (the collapse guard the live verify pass has always caught).
{
  const plan = buildWritePlan(buildFigmaColor(nbTheme()));
  // Snapshot = what a read yields right after applyWritePlan: palette primitives + colour roles whose
  // per-mode value is the alias target NAME from the plan.
  const snapFrom = (aliasRowsIn: typeof plan.color.aliases): ReadbackSnapshot => ({
    collections: [
      { name: 'core-palette', modes: ['Default'] },
      { name: 'color', modes: plan.color.modes },
    ],
    palette: plan.palette.map((p) => ({ name: p.name, scopes: p.scopes, hidden: p.hidden })),
    color: plan.color.create.map((c, i) => ({
      name: c.name,
      scopes: c.scopes,
      valuesByMode: Object.fromEntries(
        plan.color.modes.map((m, mi) => [m, { alias: aliasRowsIn[i].targetsByMode[mi] }]),
      ),
    })),
  });

  const good = verifyReadback(snapFrom(plan.color.aliases));
  ok(good.ok, 'read-back: a faithful NB read passes every contract check' + (good.ok ? '' : ` — ${Object.entries(good.checks).filter(([, v]) => !v).map(([k]) => k).join(',')}`));
  ok(good.checks.modesDistinct, 'read-back: background/primary distinct per mode (collapse-guard holds)');
  ok(good.checks.aliasesResolve && good.details.danglingAliases.length === 0, 'read-back: every alias target resolves (0 dangling)');
  ok(good.checks.slotScopes && good.checks.fieldFamilyPresent, 'read-back: slot scopes + field family match the contract');
  ok(good.checks.retiredRolesAbsent && good.checks.renamedRolesAbsent && good.checks.bareDangerPresent, 'read-back: retired/renamed roles absent, bare foreground/danger present');
  ok(good.checks.primitivesHidden, 'read-back: core-palette primitives hidden from publishing');

  // NEGATIVE: collapse every mode of background/primary to a single target → modesDistinct must fail.
  const collapsed = plan.color.aliases.map((r) =>
    r.name === 'color/background/primary' ? { ...r, targetsByMode: r.targetsByMode.map(() => r.targetsByMode[0]) } : r,
  );
  const bad = verifyReadback(snapFrom(collapsed));
  ok(!bad.checks.modesDistinct && !bad.ok, 'read-back: collapsed background/primary FAILS modesDistinct (negative — the collapse guard bites)');
}

// BrandInput PERSISTENCE (#131): the shared-data round-trip + version guard. A persisted brand
// must deserialise back to the EXACT input (so re-opening a themed file rehydrates the knobs), and
// any untrusted blob (garbage / drift / non-object) must collapse to null (= start from defaults).
{
  const brand = exampleBrands()['aurora'] as BrandInput;
  const back = deserializeBrandInput(serializeBrandInput(brand));
  ok(JSON.stringify(back) === JSON.stringify(brand), 'persist: serialize→deserialize round-trips a BrandInput exactly (knob rehydration)');

  ok(deserializeBrandInput('not json {') === null, 'persist: corrupt/non-JSON blob → null (fall back to defaults)');
  ok(deserializeBrandInput('') === null, 'persist: empty blob → null (unset shared-data key)');
  ok(deserializeBrandInput(JSON.stringify({ v: PERSIST_VERSION + 1, input: brand })) === null, 'persist: version mismatch → null (schema drift ignored, not mis-read)');
  ok(deserializeBrandInput(JSON.stringify({ v: PERSIST_VERSION })) === null, 'persist: missing input → null');
  ok(deserializeBrandInput(JSON.stringify({ input: brand })) === null, 'persist: missing version → null');
  ok(deserializeBrandInput('42') === null && deserializeBrandInput('null') === null, 'persist: non-object JSON → null');

  // The envelope guard (version + input-is-object) is deliberately shallow — the persisted blob is
  // PUBLIC shared-data, so a versioned-but-shape-invalid payload (`{v:1, input:{}}`) clears it and
  // deserialises to a non-null object. The SHAPE gate is downstream: the restore handler runs
  // `brandTheme` (exactly as Import does) before loading, and rejects it — so the boot render never
  // sees a brand with no `primary`. Assert both halves of that contract here.
  const malformed = deserializeBrandInput(JSON.stringify({ v: PERSIST_VERSION, input: {} }));
  ok(malformed !== null, 'persist: versioned-but-empty input clears the envelope (shape gate is downstream, not here)');
  let rejected = false;
  try { brandTheme(malformed as BrandInput); } catch { rejected = true; }
  ok(rejected, 'persist: brandTheme rejects a shape-invalid restored input (the restore handler guard bites)');
}

// FLOAT WRITE PLAN (#146): the geometric axes reshaped for the plugin write executor. The plan must
// carry the nine collections with the right modes, every cross-collection alias must resolve within
// the plan (0 dangling — the executor binds against one global name map), opacity must be 0–100 (the
// Figma OPACITY-percent convention), and a wireframe brand must add a distinct `wireframe` radius mode.
{
  const auroraFloat = buildFloatWritePlan(brandTheme(exampleBrands()['aurora'] as BrandInput));
  const names = auroraFloat.map((c) => c.name);
  const EXPECTED = ['core-dimension', 'space', 'radius', 'size', 'icon', 'border-width', 'focus', 'opacity', 'layout'];
  ok(EXPECTED.every((n) => names.includes(n)) && names.length === EXPECTED.length,
    `float-plan: nine collections present (${names.join(', ')})`);

  // Single-mode dims axes vs per-breakpoint layout.
  ok(auroraFloat.find((c) => c.name === 'core-dimension')!.modes.join(',') === 'Default',
    'float-plan: core-dimension is single Default mode');
  const layout = auroraFloat.find((c) => c.name === 'layout')!;
  ok(layout.modes.length >= 4 && layout.create.length > 0,
    `float-plan: layout carries one mode per breakpoint (${layout.modes.join('/')})`);

  // Every alias target resolves within the plan (the executor's global name map covers all axes).
  const allNames = new Set(auroraFloat.flatMap((c) => c.create.map((r) => r.name)));
  const danglers: string[] = [];
  for (const c of auroraFloat)
    for (const a of c.aliases)
      for (const t of a.targetsByMode)
        if (t && !allNames.has(t)) danglers.push(`${a.name} -> ${t}`);
  ok(danglers.length === 0, `float-plan: every cross-collection alias resolves (0 dangling)${danglers.length ? ' — ' + danglers.slice(0, 3).join(', ') : ''}`);

  // space aliases dimension; core-dimension + opacity are primitives (no aliases).
  const space = auroraFloat.find((c) => c.name === 'space')!;
  ok(space.aliases.every((a) => a.targetsByMode.every((t) => t === null || t.startsWith('dimension/'))),
    'float-plan: space vars alias core-dimension primitives');
  ok(auroraFloat.find((c) => c.name === 'core-dimension')!.aliases.every((a) => a.targetsByMode.every((t) => t === null)),
    'float-plan: core-dimension primitives carry no aliases');

  // opacity values are 0–100 (Figma OPACITY percent), not the DTCG 0–1 fraction.
  const opVals = auroraFloat.find((c) => c.name === 'opacity')!.create.flatMap((r) => r.valuesByMode);
  ok(opVals.length > 0 && opVals.every((n) => n >= 0 && n <= 100) && opVals.some((n) => n > 1),
    `float-plan: opacity is 0–100 percent (max ${Math.max(...opVals)})`);

  // core-dimension primitives hidden from publishing; opacity NOT hidden (#79 — directly consumable).
  ok(auroraFloat.find((c) => c.name === 'core-dimension')!.create.every((r) => r.hidden),
    'float-plan: core-dimension primitives hidden from publishing');
  ok(auroraFloat.find((c) => c.name === 'opacity')!.create.every((r) => !r.hidden),
    'float-plan: opacity NOT hidden (directly consumable)');

  // Wireframe brand: radius gains a distinct wireframe mode where every radius aliases dimension/0.
  const wfFloat = buildFloatWritePlan(brandTheme({ ...(exampleBrands()['aurora'] as BrandInput), modes: ['light', 'dark', 'wireframe'] }));
  const wfRadius = wfFloat.find((c) => c.name === 'radius')!;
  const wfIdx = wfRadius.modes.indexOf('wireframe');
  ok(wfIdx > 0 && wfRadius.modes.includes('Default'), `float-plan: wireframe brand adds a wireframe radius mode (${wfRadius.modes.join('/')})`);
  ok(wfRadius.aliases.length > 0 && wfRadius.aliases.every((a) => a.targetsByMode[wfIdx] === 'dimension/0'),
    'float-plan: every radius aliases dimension/0 in the wireframe mode (sharp corners)');

  // verifyFloatReadback guard: a colour-only snapshot (no `float`) is NOT a float failure; a dangling
  // FLOAT alias IS caught. (The full write→read→verify round-trip is covered in plugin/test-readback.)
  const colourOnly = verifyFloatReadback({ collections: [], palette: [], color: [] }, false);
  ok(colourOnly.ok, 'verifyFloatReadback: colour-only snapshot passes (float axes absent, not failed)');
  const dangling = verifyFloatReadback({
    collections: [{ name: 'space', modes: ['Default'] }],
    palette: [], color: [],
    float: {
      'core-dimension': [{ name: 'dimension/0', scopes: ['GAP'], hidden: true, valuesByMode: { Default: 0 } }],
      space: [{ name: 'space/100', scopes: ['GAP'], hidden: false, valuesByMode: { Default: { alias: 'dimension/NOPE' } } }],
      radius: [], size: [], 'border-width': [], focus: [], opacity: [],
    },
  }, false);
  ok(!dangling.ok && !dangling.checks.aliasesResolve, 'verifyFloatReadback: a dangling FLOAT alias fails the verdict (negative)');
}

// STYLES WRITE PLAN (shadow/gradient lane): shadow → Effect Style rows (both light + dark), gradient →
// Paint Style rows with baked resolved stops + a Figma gradientTransform. Plus the angle→matrix helper.
{
  // gradientTransformFor — the one bit of new math. The angle is the CSS linear-gradient() angle the
  // web renderer uses, so the two surfaces must agree: CSS 90° = to right (L→R), 0° = to top (vertical).
  // Internally φ = 90 − θ, so θ=90 → φ=0 → identity (the horizontal gradient), θ=0 → φ=90 → vertical.
  const t90 = gradientTransformFor('GRADIENT_LINEAR', 90);
  ok(JSON.stringify(t90) === JSON.stringify([[1, 0, 0], [0, 1, 0]]), 'styles: CSS 90° (to right) → identity transform (horizontal L→R), matching the web preview');
  const t0 = gradientTransformFor('GRADIENT_LINEAR', 0);
  // θ=0 → φ=90: cos90≈0, sin90≈1 → rotation block [[0,-1],[1,0]] (vertical), matching CSS "to top".
  ok(Math.abs(t0[0][0]) < 1e-4 && Math.abs(t0[1][0] - 1) < 1e-4 && Math.abs(t0[0][1] + 1) < 1e-4, 'styles: CSS 0° (to top) → vertical transform (finite, unit rotation)');
  const radial = gradientTransformFor('GRADIENT_RADIAL', undefined, [0.5, 0.5]);
  ok(radial.every((row) => row.every((n) => Number.isFinite(n))), 'styles: radial gradient transform is finite');

  // NB — 7 shadow steps → 14 effect rows (light + dark), 0 gradients.
  const nbStyles = buildStylesPlan(nbTheme());
  const nbLight = nbStyles.effects.filter((e) => e.name.startsWith('shadow/')).length;
  const nbDark = nbStyles.effects.filter((e) => e.name.startsWith('shadow-dark/')).length;
  ok(nbLight > 0 && nbLight === nbDark, `styles: NB emits N light + N dark effect rows (${nbLight}L / ${nbDark}D)`);
  ok(nbStyles.paints.length === 0, 'styles: NB has no gradients → 0 paint rows');
  ok(nbStyles.effects.every((e) => e.effects.length > 0 && e.effects.every((fx) => ['DROP_SHADOW', 'INNER_SHADOW'].includes(fx.type))), 'styles: every effect row carries ≥1 drop/inner shadow');

  // Aurora — opts into gradients → paint rows with valid paintType, baked RGBA stops, finite transform.
  const auroraStyles = buildStylesPlan(brandTheme(exampleBrands()['aurora'] as BrandInput));
  ok(auroraStyles.paints.length > 0, `styles: aurora emits gradient paint rows (${auroraStyles.paints.length})`);
  const paintBad: string[] = [];
  for (const p of auroraStyles.paints) {
    if (!['GRADIENT_LINEAR', 'GRADIENT_RADIAL'].includes(p.paintType)) paintBad.push(`${p.name}: paintType`);
    if (p.stops.length < 2) paintBad.push(`${p.name}: <2 stops`);
    if (!p.stops.every((s) => [s.color.r, s.color.g, s.color.b, s.color.a].every((c) => c >= 0 && c <= 1))) paintBad.push(`${p.name}: stop RGBA out of gamut`);
    if (!p.gradientTransform.every((row) => row.every((n) => Number.isFinite(n)))) paintBad.push(`${p.name}: transform not finite`);
  }
  ok(paintBad.length === 0, 'styles: every aurora gradient row has paintType + ≥2 baked in-gamut stops + finite transform' + (paintBad.length ? ` — ${paintBad.slice(0, 3).join('; ')}` : ''));

  // Light-only brand → NO shadow-dark rows (Effect Styles only get the light set).
  const lightOnly = buildStylesPlan(brandTheme({ ...(exampleBrands()['aurora'] as BrandInput), modes: ['light'] }));
  ok(lightOnly.effects.some((e) => e.name.startsWith('shadow/')) && !lightOnly.effects.some((e) => e.name.startsWith('shadow-dark/')),
    'styles: a light-only brand emits shadow/* but NO shadow-dark/*');
}

// TYPOGRAPHY WRITE PLANS (#237): core-font/type-sets VARIABLE plan + the Text Style plan.
{
  const nb = nbTheme();
  const fontVars = buildFontVarPlan(nb);
  const coreFont = fontVars.find((c) => c.name === 'core-font')!;
  const typeSets = fontVars.find((c) => c.name === 'type-sets')!;
  ok(!!coreFont && !!typeSets && fontVars.length === 2, 'font-plan: two collections — core-font + type-sets');

  // core-font mixes STRING (family) + FLOAT (size/weight/weight-role); families are STRING with string values.
  const familyRows = coreFont.rows.filter((r) => r.name.startsWith('font/family/'));
  ok(familyRows.length > 0 && familyRows.every((r) => r.resolvedType === 'STRING' && typeof r.valuesByMode[0] === 'string'),
    'font-plan: font/family/* rows are STRING with a string face value');
  ok(coreFont.rows.some((r) => r.name.startsWith('font/size/') && r.resolvedType === 'FLOAT'), 'font-plan: font/size/* rows are FLOAT');

  // weight-role rows alias font/weight/N (within core-font — resolves against the same collection).
  const wr = coreFont.rows.filter((r) => r.name.startsWith('font/weight-role/'));
  const coreNames = new Set(coreFont.rows.map((r) => r.name));
  const wrDangling = wr.flatMap((r) => r.aliasByMode.filter((a): a is string => !!a)).filter((t) => !coreNames.has(t));
  ok(wr.length > 0 && wr.every((r) => r.aliasByMode.every((a) => a === null || a.startsWith('font/weight/'))) && wrDangling.length === 0,
    'font-plan: weight-role rows alias font/weight/N, all resolving within core-font');

  // type-sets is FLOAT, mobile/desktop.
  ok(typeSets.modes.join(',') === 'mobile,desktop' && typeSets.rows.every((r) => r.resolvedType === 'FLOAT'),
    `font-plan: type-sets is FLOAT with mobile/desktop modes (${typeSets.modes.join('/')})`);

  // Text Style plan — one row per composite; bound vars named + fontStyle/lineHeight baked.
  const ts = buildTextStylePlan(nb);
  ok(ts.length > 0, `font-plan: text-style plan has rows (${ts.length})`);
  const tbad: string[] = [];
  for (const r of ts) {
    if (!r.fontFamilyVar.startsWith('font/family/')) tbad.push(`${r.name}: familyVar`);
    if (!r.fontFamilyPrimary) tbad.push(`${r.name}: no primary face`);
    if (!(r.fontSizeCollection === 'core-font' || r.fontSizeCollection === 'type-sets')) tbad.push(`${r.name}: sizeColl`);
    if (!r.fontWeightVar.startsWith('font/weight-role/')) tbad.push(`${r.name}: weightVar`);
    if (!r.fontStyle) tbad.push(`${r.name}: no fontStyle`);
    if (typeof r.lineHeightPct !== 'number') tbad.push(`${r.name}: lineHeight`);
  }
  ok(tbad.length === 0, 'font-plan: every text-style row names bound vars + a primary face + baked fontStyle/lineHeight' + (tbad.length ? ` — ${tbad.slice(0, 3).join('; ')}` : ''));

  // Italic axis: an italics-opted brand carries italic style-names on the italic composites.
  const italicPlan = buildTextStylePlan(brandTheme({ id: 'ts-it', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 }, typography: { italics: ['body'], links: ['body'] } }));
  const italicRows = italicPlan.filter((r) => r.name.includes('-italic'));
  ok(italicRows.length > 0 && italicRows.every((r) => /Italic/.test(r.fontStyle)), 'font-plan: italic composites carry an Italic style-name');
  ok(buildTextStylePlan(nb).every((r) => !/Italic/.test(r.fontStyle)), 'font-plan: a no-italics brand carries no Italic style-names');

  // verifyTypographyReadback guard: absent → all-pass (typography-less read isn't a failure); a
  // dangling weight-role alias fails; a well-formed snapshot passes.
  ok(verifyTypographyReadback({ collections: [], palette: [], color: [] }).ok, 'verifyTypographyReadback: typography-absent snapshot passes (not a failure)');
  const goodTypo = verifyTypographyReadback({
    collections: [], palette: [], color: [],
    font: { 'core-font': [
      { name: 'font/weight/700', scopes: [], hidden: true, valuesByMode: { Default: 700 } },
      { name: 'font/weight-role/strong', scopes: [], hidden: false, valuesByMode: { Default: { alias: 'font/weight/700' } } },
    ] },
    textStyles: ['body/md/default'],
  });
  ok(goodTypo.ok, 'verifyTypographyReadback: well-formed core-font + text style passes');
  const danglingTypo = verifyTypographyReadback({
    collections: [], palette: [], color: [],
    font: { 'core-font': [{ name: 'font/weight-role/strong', scopes: [], hidden: false, valuesByMode: { Default: { alias: 'font/weight/999' } } }] },
    textStyles: ['x'],
  });
  ok(!danglingTypo.ok && !danglingTypo.checks.weightAliasesResolve, 'verifyTypographyReadback: a dangling weight-role alias fails (negative)');
}

// INVERSE + neutralEmphasis + accentPalette (docs/20 §9/§10/§3, increment 4).
{
  // (a) inverse surface-context: interactive.<color>.on-inverse present + gated against the
  //     inverse surface in every mode; the `inverse` lever opts out.
  const modes = resolveAllModes(nbTheme());
  const invFails: string[] = [];
  for (const m of modes)
    for (const c of ['primary', 'neutral', 'destructive']) {
      const r = m.roles[`interactive.${c}.on-inverse.text.rest`];
      if (!r) { invFails.push(`${m.mode}:${c}:absent`); continue; }
      if (r.against !== 'background.inverse.primary') invFails.push(`${m.mode}:${c}:against=${r.against}`);
      if (r.min > 0 && r.ratio < r.min) invFails.push(`${m.mode}:${c}:${r.ratio.toFixed(2)}<${r.min}`);
    }
  ok(invFails.length === 0, 'inverse: interactive.<color>.on-inverse.text.rest gated on the inverse surface in every mode' + (invFails.length ? ` — ${invFails.slice(0, 3).join(',')}` : ''));
  const noInv = resolveAllModes({ ...nbTheme(), inverseContext: false })
    .flatMap((m) => Object.keys(m.roles)).filter((k) => k.startsWith('interactive.') && k.includes('.on-inverse'));
  ok(noInv.length === 0, 'inverse: inverse=false emits no on-inverse inks' + (noInv.length ? ` — ${noInv.slice(0, 2).join(',')}` : ''));

  // (b) neutralEmphasis 'strong' → a bold neutral fill that clears the non-text floor, on-fill still gated.
  const strong = resolveAllModes({ ...nbTheme(), neutralEmphasis: 'strong' });
  const strongFails = strong.flatMap((m) => {
    const fill = m.roles['interactive.neutral.fill.rest'], on = m.roles['interactive.neutral.on-fill'];
    const bad: string[] = [];
    if (!(fill.min >= 3) || fill.ratio < fill.min) bad.push(`${m.mode}:fill ${fill.ratio.toFixed(2)}<${fill.min}`);
    if (on.ratio < on.min) bad.push(`${m.mode}:on ${on.ratio.toFixed(2)}<${on.min}`);
    return bad;
  });
  ok(strongFails.length === 0, 'neutralEmphasis: strong gives a floor-clearing neutral fill with a gated on-ink' + (strongFails.length ? ` — ${strongFails.slice(0, 2).join(',')}` : ''));

  // (c) interactivePalettes: opt-in → a full interactive.<name>.* column, all contracts hold; absent by default.
  const noAccent = resolveAllModes(nbTheme()).flatMap((m) => Object.keys(m.roles)).filter((k) => k.startsWith('interactive.accent'));
  ok(noAccent.length === 0, 'accent: no extra column with an empty interactivePalettes (never falls back to primary)' + (noAccent.length ? ` — ${noAccent.slice(0, 2).join(',')}` : ''));
  const acc = resolveAllModes({ ...nbTheme(), interactivePalettes: [{ name: 'accent', palette: 'green', anchorStep: 500 }] });
  const accLight = acc.find((m) => m.mode === 'light')!.roles;
  const accMissing = ['fill.rest', 'on-fill', 'text.rest', 'border', 'on-inverse.text.rest', 'on-inverse.fill.rest', 'on-inverse.on-fill', 'overlay.hover'].filter((s) => !(`interactive.accent.${s}` in accLight));
  const accFails = acc.flatMap((m) => Object.entries(m.roles).filter(([k, r]) => k.startsWith('interactive.accent') && r.min > 0 && r.ratio < r.min).map(([k]) => `${m.mode}.${k}`));
  ok(accMissing.length === 0 && accFails.length === 0, 'accent: opt-in emits a full gated interactive.accent.* column' + (accMissing.length ? ` — MISSING ${accMissing.join(',')}` : '') + (accFails.length ? ` — FAILS ${accFails.slice(0, 2).join(',')}` : ''));

  // (d) BACK-COMPAT accentPalette must differ from the action palette (no two identical columns).
  let threw = false;
  try { brandTheme({ id: 'x', primary: { l: 0.5, c: 0.2, h: 20 }, neutral: { hue: 20, chroma: 0.01 }, actionPalette: 'primary', accentPalette: 'primary' } as unknown as BrandInput); }
  catch { threw = true; }
  ok(threw, 'accent: accentPalette === actionPalette is rejected');
}

// EXTENSIBLE interactive palettes (docs/20 §3) — N opt-in interactive.<name>.* columns, anchor-step
// overrides for the built-ins, and back-compat with the single accentPalette lever.
{
  const base = { id: 'ext', primary: { l: 0.55, c: 0.18, h: 260 }, neutral: { hue: 260, chroma: 0.01 },
    brandColors: [{ name: 'accent', oklch: { l: 0.6, c: 0.15, h: 200 } }, { name: 'grape', oklch: { l: 0.5, c: 0.18, h: 320 } }] };
  const rolesOf = (t: any, mode = 'light') => resolveAllModes(t).find((m) => m.mode === mode)!.roles;

  // (a) one entry promotes a defined palette to a full interactive.accent.* column.
  const oneT = brandTheme({ ...base, interactivePalettes: [{ palette: 'accent' }] } as unknown as BrandInput);
  const one = rolesOf(oneT);
  const oneMissing = ['fill.rest', 'on-fill', 'text.rest', 'border'].filter((s) => !(`interactive.accent.${s}` in one));
  ok(oneMissing.length === 0, 'interactivePalettes: [{palette:accent}] emits a full interactive.accent.* column' + (oneMissing.length ? ` — MISSING ${oneMissing.join(',')}` : ''));

  // (b) a second entry with a distinct name emits a second column alongside the first.
  const twoT = brandTheme({ ...base, interactivePalettes: [{ palette: 'accent' }, { name: 'grape', palette: 'grape' }] } as unknown as BrandInput);
  const two = rolesOf(twoT);
  const twoMissing = ['interactive.accent.fill.rest', 'interactive.grape.fill.rest', 'interactive.grape.on-fill', 'interactive.grape.overlay.hover'].filter((k) => !(k in two));
  ok(twoMissing.length === 0, 'interactivePalettes: two entries emit both interactive.accent.* and interactive.grape.*' + (twoMissing.length ? ` — MISSING ${twoMissing.join(',')}` : ''));
  const twoFails = resolveAllModes(twoT).flatMap((m) => Object.entries(m.roles).filter(([k, r]) => (k.startsWith('interactive.accent') || k.startsWith('interactive.grape')) && r.min > 0 && r.ratio < r.min).map(([k]) => `${m.mode}.${k}`));
  ok(twoFails.length === 0, 'interactivePalettes: both extra columns clear every contract in every mode' + (twoFails.length ? ` — FAILS ${twoFails.slice(0, 2).join(',')}` : ''));

  // ---------------------------------------------------------- #331: apply-but-warn on an ANCHOR
  // The anchor was the one override in the app that SUBSTITUTED instead of applying: a pinned step
  // that missed the floor got silently bumped to the nearest passing one, so the author never saw
  // what their own pick looked like — while the identical pin authored through design.md/BrandInput
  // would have been honoured. Owner decision: apply-but-warn all the way through.
  //
  // The distinction that makes this safe is AUTHORED vs DERIVED. Only a pin is applied verbatim;
  // an unpinned column still clamps, because there the substitution is the engine choosing a sane
  // default rather than overruling anybody.
  {
    const pinAt = (step?: number) => brandTheme({ ...base,
      interactivePalettes: [{ palette: 'accent', ...(step === undefined ? {} : { anchorStep: step }) }] } as unknown as BrandInput);
    const fillOf = (t: any, mode = 'light') => resolveAllModes(t).find((m) => m.mode === mode)!.roles['interactive.accent.fill.rest'];

    // 100 is far too light to clear 4.5:1 on a light floor — the exact case the owner hit.
    const pinned = fillOf(pinAt(100));
    ok(/\.100$/.test(pinned.path), `#331: an AUTHORED anchor is applied verbatim, not substituted (${pinned.path})`);
    ok(pinned.ratio < pinned.min, `#331: ...and its contrast miss is reported, not corrected (${pinned.ratio.toFixed(2)} < ${pinned.min})`);

    // The derived path is UNTOUCHED — this is what stops apply-but-warn leaking into every column.
    const derived = fillOf(pinAt(undefined));
    ok(derived.ratio >= derived.min, `#331: an UNPINNED column still clamps to a passing step (${derived.path}, ${derived.ratio.toFixed(2)} >= ${derived.min})`);
    ok(!/\.100$/.test(derived.path), '#331: the derived anchor is not the pinned one — the two paths are genuinely different');

    // hover/pressed derive from the RAW step, not a clamped one. Without this the family would
    // still be built on the substituted anchor and the pin would remain invisible in the example.
    const roles = resolveAllModes(pinAt(100)).find((m) => m.mode === 'light')!.roles;
    const hover = roles['interactive.accent.fill.hover'], pressed = roles['interactive.accent.fill.pressed'];
    const stepNum = (p: string) => Number(p.split('.').pop());
    ok(stepNum(hover.path) > 100 && stepNum(hover.path) <= 300 && stepNum(pressed.path) > stepNum(hover.path),
      `#331: hover/pressed walk forward from the RAW pinned step (100 -> ${stepNum(hover.path)} -> ${stepNum(pressed.path)})`);

    // The built-in columns take the same route, and there presence IS provenance — brandTheme
    // passes actionAnchorStep through undefined-preserving, so no extra flag is needed.
    const actPin = resolveAllModes(brandTheme({ ...base, actionAnchorStep: 100 } as unknown as BrandInput))
      .find((m) => m.mode === 'light')!.roles['interactive.primary.fill.rest'];
    ok(/\.100$/.test(actPin.path) && actPin.ratio < actPin.min, `#331: a pinned actionAnchorStep is applied verbatim too (${actPin.path}, ${actPin.ratio.toFixed(2)} < ${actPin.min})`);
  }

  // (c) an anchorStep override changes the accent fill vs the default placement.
  const defFill = rolesOf(brandTheme({ ...base, interactivePalettes: [{ palette: 'accent' }] } as unknown as BrandInput))['interactive.accent.fill.rest'].path;
  const ovrFill = rolesOf(brandTheme({ ...base, interactivePalettes: [{ palette: 'accent', anchorStep: 700 }] } as unknown as BrandInput))['interactive.accent.fill.rest'].path;
  ok(defFill !== ovrFill, `interactivePalettes: anchorStep override moves the accent fill (${defFill.split('.').slice(-2).join('.')} → ${ovrFill.split('.').slice(-2).join('.')})`);

  // (d) BACK-COMPAT: accentPalette:'accent' is byte-identical to interactivePalettes:[{name:'accent',palette:'accent'}].
  const legacy = rolesOf(brandTheme({ ...base, accentPalette: 'accent' } as unknown as BrandInput));
  const modern = rolesOf(brandTheme({ ...base, interactivePalettes: [{ name: 'accent', palette: 'accent' }] } as unknown as BrandInput));
  const accKeys = Object.keys(legacy).filter((k) => k.startsWith('interactive.accent'));
  const drift = accKeys.filter((k) => !modern[k] || JSON.stringify(legacy[k]) !== JSON.stringify(modern[k]));
  ok(accKeys.length > 0 && drift.length === 0, 'interactivePalettes: back-compat accentPalette reproduces interactive.accent.* byte-for-byte' + (drift.length ? ` — DRIFT ${drift.slice(0, 2).join(',')}` : ''));

  // (e) a bad palette name (not a defined palette) throws.
  let badThrew = false;
  try { brandTheme({ ...base, interactivePalettes: [{ palette: 'nope' }] } as unknown as BrandInput); } catch { badThrew = true; }
  ok(badThrew, 'interactivePalettes: an undefined palette throws');
  // and a name colliding with a built-in interactive column throws.
  let collideThrew = false;
  try { brandTheme({ ...base, interactivePalettes: [{ name: 'primary', palette: 'accent' }] } as unknown as BrandInput); } catch { collideThrew = true; }
  ok(collideThrew, 'interactivePalettes: a name colliding with a built-in column (primary) throws');

  // (f) actionAnchorStep override moves interactive.primary.fill.rest.
  const primDef = rolesOf(brandTheme({ ...base } as unknown as BrandInput))['interactive.primary.fill.rest'].path;
  const primOvr = rolesOf(brandTheme({ ...base, actionAnchorStep: 800 } as unknown as BrandInput))['interactive.primary.fill.rest'].path;
  ok(primDef !== primOvr, `interactivePalettes: actionAnchorStep override moves interactive.primary.fill.rest (${primDef.split('.').slice(-2).join('.')} → ${primOvr.split('.').slice(-2).join('.')})`);
}

// PER-MODE COLOUR OVERRIDE LAYER (Phase A1) — repoint a resolved role at an EXISTING primitive
// step, customizable modes only (light/dark), WARN-don't-block on a failed contrast min, and a
// byte-identical no-op when absent. Distinct from roleColors (a global palette rebase).
{
  const roleKey = 'interactive.primary.fill.rest';
  const root = 'prism';
  const base = { id: 'ovr', primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 } } as unknown as BrandInput;
  const nodeAt = (t: any) => roleKey.split('.').reduce((n, k) => n?.[k], t.color);
  const threw = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
  const stable = (v: any): any => Array.isArray(v) ? v.map(stable)
    : (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v);

  // (a) a dark override repoints ONLY the dark per-mode value; the light canonical $value is untouched.
  const overStep = '750';
  const withOv = { ...base, overrides: { dark: { [roleKey]: { palette: 'primary', step: overStep } } } } as unknown as BrandInput;
  const baseNode = nodeAt(buildTree(brandTheme(base)).tree[root]);
  const ovNode = nodeAt(buildTree(brandTheme(withOv)).tree[root]);
  ok(ovNode.$extensions.prism3.modes.dark.$value === `{${root}.palette.primary.${overStep}}`,
    `A1(a): dark override → primary.${overStep} in $extensions.prism3.modes.dark (got ${ovNode.$extensions.prism3.modes.dark.$value})`);
  ok(ovNode.$value === baseNode.$value, `A1(a): light canonical $value unchanged by the dark override (${ovNode.$value})`);
  ok(baseNode.$extensions.prism3.modes.dark.$value !== ovNode.$extensions.prism3.modes.dark.$value,
    'A1(a): the dark override actually differs from the generated baseline dark value');

  // (b) a dark override deliberately below the fill's contrast min still APPLIES + emits, recorded
  // as a warning (never throws) — primary.900 is a near-black violet on the near-black dark surface.
  const failStep = '900';
  const failing = { ...base, overrides: { dark: { [roleKey]: { palette: 'primary', step: failStep } } } } as unknown as BrandInput;
  let failThrew = false, darkRes: any;
  try { darkRes = resolveAllModes(brandTheme(failing)).find((m) => m.mode === 'dark'); } catch { failThrew = true; }
  ok(!failThrew, 'A1(b): a contrast-failing override does NOT throw (WARN, not block)');
  ok(darkRes && Array.isArray(darkRes.warnings) && darkRes.warnings.some((w: any) => w.role === roleKey && w.ratio < w.min),
    'A1(b): the failing override is recorded in ModeResult.warnings (ratio < min)');
  ok(darkRes && darkRes.roles[roleKey].path === `${root}.palette.primary.${failStep}`,
    'A1(b): the failing override still emits — the role is repointed despite the warning');
  ok(!threw(() => buildTree(brandTheme(failing))), 'A1(b): buildTree emits a contrast-failing override without throwing');

  // (c) rejections: generate-only / absent modes throw in brandTheme; a malformed ref throws at resolve.
  ok(threw(() => brandTheme({ ...base, overrides: { 'hc-light': { [roleKey]: { palette: 'primary', step: '600' } } } } as unknown as BrandInput)),
    'A1(c): override targeting hc-light (generate-only) throws');
  ok(threw(() => brandTheme({ ...base, overrides: { wireframe: { [roleKey]: { palette: 'primary', step: '600' } } } } as unknown as BrandInput)),
    'A1(c): override targeting wireframe (not in the mode set) throws');
  ok(threw(() => brandTheme({ ...base, modes: ['light'], overrides: { dark: { [roleKey]: { palette: 'primary', step: '600' } } } } as unknown as BrandInput)),
    'A1(c): override targeting a mode this brand does not generate throws');
  ok(threw(() => resolveAllModes(brandTheme({ ...base, overrides: { dark: { [roleKey]: { palette: 'nope', step: '600' } } } } as unknown as BrandInput))),
    'A1(c): an unknown palette in an override throws (malformed input)');
  ok(threw(() => resolveAllModes(brandTheme({ ...base, overrides: { dark: { [roleKey]: { palette: 'primary', step: '999' } } } } as unknown as BrandInput))),
    'A1(c): an unknown step in an override throws (malformed input)');

  // (d) design.md round-trip preserves overrides through parse∘serialize (the export leg).
  const rtInput = { ...base, overrides: { dark: { [roleKey]: { palette: 'primary', step: overStep } } } } as unknown as BrandInput;
  ok(JSON.stringify(stable(parseDesignMd(toDesignMd(rtInput)).input)) === JSON.stringify(stable(rtInput)),
    'A1(d): parseDesignMd(toDesignMd(inputWithOverrides)) preserves overrides');

  // (e) an ABSENT override map is a byte-identical no-op (the primary guard) — same tree + no warnings.
  const plain = resolveAllModes(brandTheme(base));
  ok(plain.every((m) => m.warnings === undefined), 'A1(e): no overrides → no warnings on any mode');
  ok(JSON.stringify(buildTree(brandTheme(base)).tree) === JSON.stringify(buildTree(brandTheme({ ...base, overrides: {} } as unknown as BrandInput)).tree),
    'A1(e): an empty overrides map produces byte-identical output');
}

// PER-MODE INTERACTIVE ANCHOR (Phase A2b) — a per-mode anchor re-anchors an interactive column's
// WHOLE cluster (rest → hover/pressed/on-fill) for that mode, still floor-gated; byte-identical when
// absent; customizable modes only. Distinct from the global actionAnchorStep (the shared baseline).
{
  const REST = 'interactive.primary.fill.rest';
  const base = { id: 'ma', primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 } } as unknown as BrandInput;
  const threw = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
  const darkOf = (input: BrandInput) => resolveAllModes(brandTheme(input)).find((m) => m.mode === 'dark')!;
  const lightOf = (input: BrandInput) => resolveAllModes(brandTheme(input)).find((m) => m.mode === 'light')!;
  const anchored = (step: number) => ({ ...base, modeAnchors: { dark: { primary: step } } }) as unknown as BrandInput;

  // (a) the per-mode dark anchor actually drives dark's primary fill (two anchors → two fills); light is untouched.
  const dA = darkOf(anchored(100)).roles[REST].path, dB = darkOf(anchored(500)).roles[REST].path;
  ok(dA !== dB, `A2b(a): the per-mode dark anchor changes the fill (100→${dA} vs 500→${dB})`);
  ok(lightOf(base).roles[REST].path === lightOf(anchored(100)).roles[REST].path,
    'A2b(a): light interactive.primary.fill.rest is untouched by a dark anchor');

  // (b) the WHOLE cluster re-derives consistently — hover follows the anchor, and on-fill still clears
  // its contrast min (the reason a single-role override can't express a re-anchored CTA).
  const d1 = darkOf(anchored(100)), d0 = darkOf(base);
  ok(d1.roles['interactive.primary.fill.hover'].path !== d0.roles['interactive.primary.fill.hover'].path,
    'A2b(b): hover re-derives from the new anchor (the cluster moves together)');
  const onFill = d1.roles['interactive.primary.on-fill'];
  ok(onFill.ratio >= onFill.min, `A2b(b): on-fill still clears its contrast min after the re-anchor (${onFill.ratio.toFixed(2)} >= ${onFill.min})`);

  // (c) validation: a per-mode anchor on a generate-only or absent mode throws (customizable modes only).
  ok(threw(() => brandTheme({ ...base, modeAnchors: { 'hc-light': { primary: 500 } } } as unknown as BrandInput)),
    'A2b(c): modeAnchors on hc-light (generate-only) throws');
  ok(threw(() => brandTheme({ ...base, modes: ['light'], modeAnchors: { dark: { primary: 500 } } } as unknown as BrandInput)),
    'A2b(c): modeAnchors on a mode this brand does not generate throws');

  // (d) an absent map is a byte-identical no-op (the primary guard).
  ok(JSON.stringify(buildTree(brandTheme(base)).tree) === JSON.stringify(buildTree(brandTheme({ ...base, modeAnchors: {} } as unknown as BrandInput)).tree),
    'A2b(d): an empty modeAnchors map produces byte-identical output');
}

// USER-ADDED CUSTOM MODES (Phase C1) — a custom mode `{ name, base }` LIVE-INHERITS a customizable
// built-in (light/dark): it re-derives EXACTLY like its base each build, then its own overrides/
// modeAnchors deviate it. Reserved/duplicate/bad-base/bad-slug names throw; byte-identical when absent.
{
  const roleKey = 'interactive.primary.fill.rest';
  const root = 'prism';
  const base = { id: 'c1', modes: ['light', 'dark'], primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 } } as unknown as BrandInput;
  const withCustom = { ...base, customModes: [{ name: 'marketing-dark', base: 'dark' }] } as unknown as BrandInput;
  const threw = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
  const stable = (v: any): any => Array.isArray(v) ? v.map(stable)
    : (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v);
  const nodeAt = (t: any) => roleKey.split('.').reduce((n, k) => n?.[k], t.color);
  const modeOf = (input: BrandInput, m: string) => resolveAllModes(brandTheme(input)).find((r) => r.mode === m);

  // (a) resolveAllModes includes the custom mode, and with NO deviation its roles EQUAL the base's.
  const md = modeOf(withCustom, 'marketing-dark'), dk = modeOf(withCustom, 'dark');
  ok(!!md, 'C1(a): resolveAllModes includes the custom mode marketing-dark');
  ok(!!md && !!dk && JSON.stringify(md!.roles) === JSON.stringify(dk!.roles),
    'C1(a): live-inherit — the custom mode with no overrides resolves byte-identically to its base (dark)');

  // (b) an override on the custom mode DEVIATES it while its base (dark) stays unchanged.
  const deviated = { ...withCustom, overrides: { 'marketing-dark': { [roleKey]: { palette: 'primary', step: '750' } } } } as unknown as BrandInput;
  const mdD = modeOf(deviated, 'marketing-dark'), dkD = modeOf(deviated, 'dark');
  ok(mdD!.roles[roleKey].path === `${root}.palette.primary.750`, `C1(b): a custom-mode override repoints marketing-dark (${mdD!.roles[roleKey].path})`);
  ok(dkD!.roles[roleKey].path === dk!.roles[roleKey].path, 'C1(b): the base dark mode is untouched by the custom-mode override');
  // and a per-mode interactive anchor on the custom mode also deviates it.
  const anchored = { ...withCustom, modeAnchors: { 'marketing-dark': { primary: 100 } } } as unknown as BrandInput;
  ok(modeOf(anchored, 'marketing-dark')!.roles[roleKey].path !== md!.roles[roleKey].path,
    'C1(b): a per-mode interactive anchor on the custom mode re-anchors its fill');

  // (c) buildTree emits the custom value under $extensions.prism3.modes['marketing-dark']; light $value unchanged.
  const baseTree = nodeAt(buildTree(brandTheme(base)).tree[root]);
  const custTree = nodeAt(buildTree(brandTheme(deviated)).tree[root]);
  ok(custTree.$extensions.prism3.modes['marketing-dark']?.$value === `{${root}.palette.primary.750}`,
    `C1(c): buildTree emits the custom mode under $extensions.prism3.modes['marketing-dark'] (${custTree.$extensions.prism3.modes['marketing-dark']?.$value})`);
  ok(custTree.$value === baseTree.$value, `C1(c): light canonical $value is unchanged by the custom mode (${custTree.$value})`);

  // (d) the Figma colour emit produces a marketing-dark mode file/entry.
  const figColor = buildFigmaColor(brandTheme(withCustom)).color;
  const figCustom = figColor.find((c) => c.$mode === 'marketing-dark');
  ok(!!figCustom && figCustom.variables.length > 0, 'C1(d): buildFigmaColor emits a marketing-dark colour collection (color.marketing-dark.json)');

  // (e) validation throws — reserved name, duplicate, non-customizable base, base not generated, bad slug.
  ok(threw(() => brandTheme({ ...base, customModes: [{ name: 'dark', base: 'light' }] } as unknown as BrandInput)), 'C1(e): a reserved built-in name (dark) throws');
  ok(threw(() => brandTheme({ ...base, customModes: [{ name: 'x', base: 'dark' }, { name: 'x', base: 'dark' }] } as unknown as BrandInput)), 'C1(e): a duplicate custom mode name throws');
  ok(threw(() => brandTheme({ ...base, customModes: [{ name: 'y', base: 'hc-light' }] } as unknown as BrandInput)), 'C1(e): a non-customizable base (hc-light) throws');
  ok(threw(() => brandTheme({ ...base, modes: ['light'], customModes: [{ name: 'z', base: 'dark' }] } as unknown as BrandInput)), "C1(e): a base not in the brand's generated modes throws");
  ok(threw(() => brandTheme({ ...base, customModes: [{ name: 'Marketing Dark', base: 'dark' }] } as unknown as BrandInput)), 'C1(e): a non-slug name (Marketing Dark) throws');

  // (f) design.md round-trip preserves customModes through parse∘serialize.
  ok(JSON.stringify(stable(parseDesignMd(toDesignMd(withCustom)).input)) === JSON.stringify(stable(withCustom)),
    'C1(f): parseDesignMd(toDesignMd(inputWithCustomModes)) preserves customModes');

  // (g) byte-identical guard — a brand with no customModes (or []) matches the field-absent build.
  ok(JSON.stringify(buildTree(brandTheme(base)).tree) === JSON.stringify(buildTree(brandTheme({ ...base, customModes: [] } as unknown as BrandInput)).tree),
    'C1(g): an empty customModes array produces byte-identical output (the primary guard)');
}

// PER-MODE RADIUS LEVER (Phase D) — a customizable mode overrides the `radius` scale; the engine
// RE-DERIVES that mode's radius ramp (the SAME radiusScale as the baseline) and a rung whose px
// DIFFERS from light carries a `$extensions.prism3.modes.<mode>` override aliasing `dimension.<px>`.
// Light stays canonical; a no-diff lever (radius == default) adds nothing; byte-identical when absent.
// Extensible: radius now, typeScale/tempo/density slot into the same modeLevers map later.
{
  const root = 'prism';
  const base = { id: 'd', modes: ['light', 'dark'], primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 } } as unknown as BrandInput;
  const threw = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
  const stable = (v: any): any => Array.isArray(v) ? v.map(stable)
    : (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v);

  // (a) modeLevers:{dark:{radius:0}} — a non-zero rung (md) gets a dark override aliasing dimension.0;
  //     light's canonical $value is untouched, and radius.none (already 0) carries no override.
  const sharpDark = { ...base, modeLevers: { dark: { radius: 0 } } } as unknown as BrandInput;
  const baseRadius = buildTree(brandTheme(base)).tree[root].radius;
  const dRadius = buildTree(brandTheme(sharpDark)).tree[root].radius;
  ok(baseRadius.md.px !== 0 && dRadius.md.$extensions.prism3.modes.dark.$value === `{${root}.dimension.0}`,
    `D(a): dark radius:0 → radius.md carries a modes.dark override aliasing dimension.0 (got ${dRadius.md.$extensions.prism3.modes?.dark?.$value})`);
  ok(dRadius.md.$extensions.prism3.modes.dark.px === 0, 'D(a): the dark override records px 0');
  ok(dRadius.md.$value === baseRadius.md.$value, `D(a): light canonical radius.md $value is unchanged by the dark lever (${dRadius.md.$value})`);
  ok(dRadius.none.$extensions?.prism3?.modes === undefined, 'D(a): radius.none (already 0) carries no override (px equal → no diff)');

  // (a′) a lever equal to the default scale (radius:1) produces NO leaf override — every rung px equals
  //      light, so the DTCG radius tree is byte-identical to the baseline.
  const sameScale = { ...base, modeLevers: { dark: { radius: 1 } } } as unknown as BrandInput;
  ok(JSON.stringify(buildTree(brandTheme(sameScale)).tree[root].radius) === JSON.stringify(baseRadius),
    'D(a): radius:1 (== default) adds no override (px equal → byte-identical radius tree)');

  // (a″) a custom mode can carry a radius lever too (customizable modes only).
  const custom = { ...base, customModes: [{ name: 'marketing', base: 'light' }], modeLevers: { marketing: { radius: 2 } } } as unknown as BrandInput;
  const cMd = buildTree(brandTheme(custom)).tree[root].radius.md.$extensions.prism3.modes.marketing;
  ok(!!cMd && cMd.px === 8, `D(a): a custom mode carries a radius lever (marketing radius:2 → md ${cMd?.px}px)`);

  // (b) the Figma radius emit produces a dark radius mode/file with the override materialised.
  const figRadius = buildFigmaDims(brandTheme(sharpDark)).radius;
  const figDark = figRadius.find((f) => f.$mode === 'dark');
  const figMd = figDark?.variables.find((v) => v.name === 'radius/md');
  ok(!!figDark && figMd?.value === 0 && figMd?.alias?.name === 'dimension/0',
    `D(b): buildFigmaDims emits a dark radius file with radius/md → dimension/0 (value ${figMd?.value})`);

  // (c) validation throws — generate-only mode (hc-light/wireframe), a mode not generated, out-of-range.
  ok(threw(() => brandTheme({ ...base, modes: ['light', 'dark', 'hc-light', 'hc-dark'], modeLevers: { 'hc-light': { radius: 0 } } } as unknown as BrandInput)), 'D(c): modeLevers on hc-light (generate-only) throws');
  ok(threw(() => brandTheme({ ...base, modes: ['light', 'wireframe'], modeLevers: { wireframe: { radius: 0 } } } as unknown as BrandInput)), 'D(c): modeLevers on wireframe (generate-only) throws');
  ok(threw(() => brandTheme({ ...base, modes: ['light'], modeLevers: { dark: { radius: 0 } } } as unknown as BrandInput)), 'D(c): modeLevers on a mode this brand does not generate throws');
  ok(threw(() => brandTheme({ ...base, modeLevers: { dark: { radius: 3 } } } as unknown as BrandInput)), 'D(c): a radius lever above 2 throws');
  ok(threw(() => brandTheme({ ...base, modeLevers: { dark: { radius: -1 } } } as unknown as BrandInput)), 'D(c): a radius lever below 0 throws');

  // (d) design.md round-trip preserves modeLevers through parse∘serialize (the export leg).
  ok(JSON.stringify(stable(parseDesignMd(toDesignMd(sharpDark)).input)) === JSON.stringify(stable(sharpDark)),
    'D(d): parseDesignMd(toDesignMd(inputWithModeLevers)) preserves modeLevers');

  // (e) validateBrandInput ACCEPTS a brand with modeLevers — it RETURNS an error array (never throws).
  const accept = { id: 'd-schema', primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 }, modes: ['light', 'dark'], modeLevers: { dark: { radius: 0 } } } as unknown as BrandInput;
  ok(validateBrandInput(accept).length === 0, `D(e): validateBrandInput accepts modeLevers (errors: ${JSON.stringify(validateBrandInput(accept))})`);

  // (f) byte-identical guard — a brand with no modeLevers (or {}) matches the field-absent build.
  ok(JSON.stringify(buildTree(brandTheme(base)).tree) === JSON.stringify(buildTree(brandTheme({ ...base, modeLevers: {} } as unknown as BrandInput)).tree),
    'D(f): an empty modeLevers map produces byte-identical output (the primary guard)');
}

// PER-MODE TYPOGRAPHY LEVER (Phase D) — a customizable mode overrides the font FAMILY per family-role
// and/or the font WEIGHT per weight-role. Only VALUES change: the engine attaches a
// `$extensions.prism3.modes.<mode>` override to the `family.<role>` / `weight-role.<role>` PRIMITIVE;
// every composite inherits via its alias, so the composite SET is untouched (the seam). A per-mode
// weight value joins the weightsRef UNION so its `{font.weight.<value>}` alias resolves. Light stays
// canonical; a no-diff override adds nothing; byte-identical when absent.
{
  const root = 'prism';
  const base = { id: 'dtypo', modes: ['light', 'dark'], primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 } } as unknown as BrandInput;
  const threw = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
  const stable = (v: any): any => Array.isArray(v) ? v.map(stable)
    : (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v);
  // 500 is deliberately a weight NO default role points at (roles are 300/400/600/700/900), so the
  // union assertion below is non-vacuous now that weightsRef is minted from need (#328) rather than
  // hardcoding 100–900 — with a role-owned value like 600 the primitive would exist regardless.
  const perMode = { ...base, modeLevers: { dark: { families: { display: 'Georgia' }, weights: { strong: 500 } } } } as unknown as BrandInput;
  const baseTree = buildTree(brandTheme(base)).tree[root];
  const built = buildTree(brandTheme(perMode));
  const pmTree = built.tree[root];

  // (a) family.display carries a modes.dark override that RE-POINTS the role to a different
  //     typeface primitive (#269) rather than re-valuing it — the alias-preserving shape. The
  //     overridden face is unioned into the typeface set, so the alias always lands on a real leaf.
  const famDark = pmTree.font.family.display.$extensions.prism3.modes?.dark;
  ok(!!famDark && famDark.$value === `{${root}.font.typeface.georgia}` && famDark.face === 'Georgia',
    `D-typo(a): dark family override RE-POINTS family.display to the georgia typeface (got ${famDark?.$value})`);
  ok(!!pmTree.font.typeface.georgia, 'D-typo(a): a per-mode-only face is unioned into the typeface primitives so its alias resolves');
  ok(pmTree.font.family.display.$value === baseTree.font.family.display.$value,
    `D-typo(a): light canonical family.display $value is unchanged by the dark lever (${pmTree.font.family.display.$value})`);
  ok(pmTree.font.family.text.$extensions.prism3.modes === undefined, 'D-typo(a): an un-overridden family (text) carries no modes override');

  // (b) weight-role.strong carries a modes.dark override aliasing font.weight.500; light stays 700.
  const wrDark = pmTree.font['weight-role'].strong.$extensions.prism3.modes?.dark;
  ok(!!wrDark && wrDark.$value === `{${root}.font.weight.500}` && wrDark.weight === 500,
    `D-typo(b): dark weight override → weight-role.strong modes.dark aliases font.weight.500 (got ${wrDark?.$value})`);
  ok(pmTree.font['weight-role'].strong.$value === baseTree.font['weight-role'].strong.$value,
    `D-typo(b): light canonical weight-role.strong $value is unchanged (${pmTree.font['weight-role'].strong.$value})`);
  ok(!!pmTree.font.weight['500'], 'D-typo(b): the font.weight.500 primitive EXISTS (weightsRef union) so the per-mode alias resolves — 500 is role-owned by nothing, so this fails if the union is dropped');

  // (c) a composite that binds display + strong is UNCHANGED — it just aliases the primitives, so the
  //     per-mode value is inherited via the alias, not stamped on the composite (the composite SET is fixed).
  ok(JSON.stringify(pmTree.type.display.sm.strong) === JSON.stringify(baseTree.type.display.sm.strong),
    'D-typo(c): the display.sm.strong composite leaf is unchanged (inheritance via the family/weight alias)');

  // (d) every DTCG alias resolves — incl. the per-mode weight override alias (walked from modes.<m>.$value).
  ok(built.stats.broken.length === 0 && built.stats.aliases > 0, `D-typo(d): all ${built.stats.aliases} aliases resolve` + (built.stats.broken.length ? ` — BROKEN ${built.stats.broken.slice(0, 3).map((b: any) => b.ref).join(',')}` : ''));

  // (e) the Figma font emit produces a `dark` core-font mode file with the family/weight overrides
  //     materialised; the Default (light) file keeps the canonical weight-role numeric.
  const fontFiles = buildFigmaFont(brandTheme(perMode));
  const darkFile = fontFiles.find((f) => f.$mode === 'dark');
  const figFamDark = darkFile?.variables.find((v) => v.name === 'font/family/display');
  const figWrDark = darkFile?.variables.find((v) => v.name === 'font/weight-role/strong');
  const defWr = fontFiles.find((f) => f.$mode === 'Default')?.variables.find((v) => v.name === 'font/weight-role/strong');
  ok(fontFiles.length === 2 && !!darkFile, `D-typo(e): buildFigmaFont emits Default + dark core-font files (${fontFiles.map((f) => f.$mode).join(',')})`);
  ok(figFamDark?.value === 'Georgia', `D-typo(e): dark font/family/display bound to Georgia (${figFamDark?.value})`);
  ok(figWrDark?.value === 500 && figWrDark?.alias?.name === 'font/weight/500', `D-typo(e): dark font/weight-role/strong → font/weight/500 (value ${figWrDark?.value})`);
  ok(defWr?.value === 700 && defWr?.alias?.name === 'font/weight/700', `D-typo(e): Default (light) font/weight-role/strong stays 700 (${defWr?.value})`);

  // (f) validation throws — families/weights on a generate-only mode (hc-light), on an un-generated
  //     mode, and a weight outside [100, 900].
  ok(threw(() => brandTheme({ ...base, modes: ['light', 'dark', 'hc-light', 'hc-dark'], modeLevers: { 'hc-light': { families: { display: 'Georgia' } } } } as unknown as BrandInput)), 'D-typo(f): families on hc-light (generate-only) throws');
  ok(threw(() => brandTheme({ ...base, modeLevers: { 'hc-light': { weights: { strong: 600 } } } } as unknown as BrandInput)), 'D-typo(f): weights on a mode this brand does not generate throws');
  ok(threw(() => brandTheme({ ...base, modeLevers: { dark: { weights: { strong: 50 } } } } as unknown as BrandInput)), 'D-typo(f): a weight of 50 (<100) throws');
  ok(threw(() => brandTheme({ ...base, modeLevers: { dark: { weights: { strong: 1000 } } } } as unknown as BrandInput)), 'D-typo(f): a weight of 1000 (>900) throws');

  // (g) design.md round-trip preserves modeLevers.families/weights through parse∘serialize.
  ok(JSON.stringify(stable(parseDesignMd(toDesignMd(perMode)).input)) === JSON.stringify(stable(perMode)),
    'D-typo(g): parseDesignMd(toDesignMd(input)) preserves modeLevers.families/weights');

  // (h) validateBrandInput ACCEPTS per-mode typography — it RETURNS an empty error array (never throws).
  const accept = { id: 'dtypo-schema', primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 }, modes: ['light', 'dark'], modeLevers: { dark: { weights: { strong: 600 } } } } as unknown as BrandInput;
  ok(validateBrandInput(accept).length === 0, `D-typo(h): validateBrandInput accepts per-mode typography (errors: ${JSON.stringify(validateBrandInput(accept))})`);

  // (i) byte-identical guard — a mode entry with no radius/families/weights adds nothing.
  ok(JSON.stringify(buildTree(brandTheme(base)).tree) === JSON.stringify(buildTree(brandTheme({ ...base, modeLevers: { dark: {} } } as unknown as BrandInput)).tree),
    'D-typo(i): a modeLevers entry with no typography lever produces byte-identical output');
}

// PER-MODE LINE HEIGHT / LETTER SPACING (Phase D) — a mode re-anchors any named leading/tracking step.
// Same seam as weight-role: the engine attaches `$extensions.prism3.modes.<mode>` to the
// `line-height.<key>` / `letter-spacing.<key>` PRIMITIVE; every composite inherits via its key alias, so
// the composite SET is untouched. Light stays canonical; a no-diff override adds nothing; byte-identical
// when absent. Figma text styles bake LH/LS, so the per-mode value rides the DTCG primitive (not a
// core-font variable) — buildFigmaFont is unaffected.
{
  const root = 'prism';
  const base = { id: 'dlhls', modes: ['light', 'dark'], primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 } } as unknown as BrandInput;
  const threw = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
  const stable = (v: any): any => Array.isArray(v) ? v.map(stable)
    : (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v);
  // dark opens `normal` leading to 1.55 and loosens `normal` tracking to +0.01em.
  // #296 — per-mode leading/tracking NAME A TARGET RUNG: dark substitutes `relaxed` wherever a style
  // would use `normal`, and `wide` wherever it would use `normal` tracking. No values, no snapping.
  const perMode = { ...base, modeLevers: { dark: { lineHeights: { normal: 'relaxed' }, letterSpacings: { normal: 'wide' } } } } as unknown as BrandInput;
  const baseTree = buildTree(brandTheme(base)).tree[root];
  const built = buildTree(brandTheme(perMode));
  const pmTree = built.tree[root];

  // (a) #296 INVERTED CONTRACT: the rung PRIMITIVES are mode-invariant — no `modes` override, and the
  //     value is identical to the no-per-mode build. Previously each rung carried a per-mode $value,
  //     which redefined what `normal` MEANS for all 35 composite references.
  ok(pmTree.font['line-height'].normal.$extensions.prism3.modes === undefined,
    'D-lhls(a): line-height.normal carries NO per-mode override — it is a primitive (#296)');
  ok(pmTree.font['line-height'].normal.$value === baseTree.font['line-height'].normal.$value,
    `D-lhls(a): line-height.normal $value is mode-invariant (${pmTree.font['line-height'].normal.$value})`);
  ok(pmTree.font['line-height'].relaxed.$value === baseTree.font['line-height'].relaxed.$value,
    'D-lhls(a): the rung the mode re-points TO is also unchanged');

  // (b) same for letter-spacing.
  ok(pmTree.font['letter-spacing'].normal.$extensions.prism3.modes === undefined,
    'D-lhls(b): letter-spacing.normal carries NO per-mode override — it is a primitive (#296)');
  ok(pmTree.font['letter-spacing'].normal.$value === baseTree.font['letter-spacing'].normal.$value,
    'D-lhls(b): letter-spacing.normal $value is mode-invariant');

  // (c) the per-mode change now lives on the semantic COMPOSITE, which RE-POINTS its alias at a
  //     different rung — the `radius.md → {dimension.N}` shape applied to typography.
  const bodyMd = pmTree.type.body.md.default;
  const cDark = bodyMd.$extensions.prism3.modes?.dark;
  ok(!!cDark, 'D-lhls(c): body.md.default carries a modes.dark variant (the re-point lives on the semantic)');
  ok(cDark?.$value?.lineHeight === `{${root}.font.line-height.relaxed}`,
    `D-lhls(c): dark re-points lineHeight to the relaxed rung (got ${cDark?.$value?.lineHeight})`);
  ok(cDark?.$value?.letterSpacing === `{${root}.font.letter-spacing.wide}`,
    `D-lhls(c): dark re-points letterSpacing to the wide rung (got ${cDark?.$value?.letterSpacing})`);
  ok(bodyMd.$value.lineHeight === `{${root}.font.line-height.normal}`,
    'D-lhls(c): the light canonical $value still points at the normal rung');
  // Every field the variant changed must be an ALIAS — never a baked value. This is the invariant
  // #296's guard enforces globally; asserted here at the point of change too.
  ok(Object.keys(cDark.$value).filter((k) => JSON.stringify(cDark.$value[k]) !== JSON.stringify((bodyMd.$value as any)[k]))
      .every((k) => /^\{.+\}$/.test(String(cDark.$value[k]))),
    'D-lhls(c): the mode variant changes ONLY alias fields (re-point, never re-value)');

  // (d) A NUMBER is the retired pre-#296 shape and must be REJECTED, not coerced — coercing it would
  //     quietly reintroduce the mode-varying-primitive bug. The message points at the brand-wide field.
  let numErr = '';
  try { brandTheme({ ...base, modeLevers: { dark: { lineHeights: { normal: 1.66 } } } } as unknown as BrandInput); }
  catch (e) { numErr = (e as Error).message; }
  ok(/names a TARGET RUNG/.test(numErr) && /typography\.lineHeights/.test(numErr),
    'D-lhls(d): a per-mode NUMBER is rejected and points at typography.lineHeights (got: ' + numErr.slice(0, 60) + ')');
  ok(threw(() => brandTheme({ ...base, modeLevers: { dark: { lineHeights: { normal: 'nope' } } } } as unknown as BrandInput)),
    'D-lhls(d): an unknown target rung is rejected');

  // (e) a SELF-MAP is inert — dropped before it can create a mode entry or a composite variant.
  const selfMap = buildTree(brandTheme({ ...base, modeLevers: { dark: { lineHeights: { normal: 'normal' } } } } as unknown as BrandInput));
  ok(selfMap.tree[root].type.body.md.default.$extensions.prism3.modes === undefined,
    'D-lhls(e): a self-map (normal → normal) produces no per-mode variant');

  // (d) every DTCG alias resolves.
  ok(built.stats.broken.length === 0 && built.stats.aliases > 0, `D-lhls(d): all ${built.stats.aliases} aliases resolve` + (built.stats.broken.length ? ` — BROKEN ${built.stats.broken.slice(0, 3).map((b: any) => b.ref).join(',')}` : ''));

  // (e) buildFigmaFont is UNAFFECTED — LH/LS aren't core-font variables (baked into text styles), so a
  //     brand overriding only LH/LS still emits a single Default core-font file (no per-mode font file).
  const fontFiles = buildFigmaFont(brandTheme(perMode));
  ok(fontFiles.length === 1 && fontFiles[0].$mode === 'Default', `D-lhls(e): LH/LS-only override leaves core-font single-mode (${fontFiles.map((f) => f.$mode).join(',')})`);

  // (f) validation throws — LH/LS on a generate-only mode (hc-light), and values out of the sane range.
  ok(threw(() => brandTheme({ ...base, modes: ['light', 'dark', 'hc-light', 'hc-dark'], modeLevers: { 'hc-light': { lineHeights: { normal: 'relaxed' } } } } as unknown as BrandInput)), 'D-lhls(f): lineHeights on hc-light (generate-only) throws');
  ok(threw(() => brandTheme({ ...base, typography: { lineHeights: { normal: 5 } } } as unknown as BrandInput)), 'D-lhls(f): a BRAND line-height of 5 (>3) throws — the numeric range guard lives on the brand-wide field now');
  ok(threw(() => brandTheme({ ...base, modeLevers: { dark: { letterSpacings: { normal: 1 } } } } as unknown as BrandInput)), 'D-lhls(f): a letter-spacing of 1em (>0.5) throws');

  // (g) design.md round-trip preserves modeLevers.lineHeights/letterSpacings through parse∘serialize.
  ok(JSON.stringify(stable(parseDesignMd(toDesignMd(perMode)).input)) === JSON.stringify(stable(perMode)),
    'D-lhls(g): parseDesignMd(toDesignMd(input)) preserves modeLevers.lineHeights/letterSpacings');

  // (h) validateBrandInput ACCEPTS per-mode LH/LS — RETURNS an empty error array (never throws).
  const accept = { id: 'dlhls-schema', primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 }, modes: ['light', 'dark'], modeLevers: { dark: { lineHeights: { normal: 'relaxed' }, letterSpacings: { normal: 'wide' } } } } as unknown as BrandInput;
  ok(validateBrandInput(accept).length === 0, `D-lhls(h): validateBrandInput accepts per-mode LH/LS (errors: ${JSON.stringify(validateBrandInput(accept))})`);

  // (i) no-diff suppression at the TOKEN level — a per-mode value EQUAL to light attaches NO leaf
  //     override (the primitive/composite tokens are byte-identical; only the decisions log records the
  //     lever was set — same as radius/weight when a lever matches the baseline).
  const equalTree = buildTree(brandTheme({ ...base, modeLevers: { dark: { lineHeights: { normal: 'normal' }, letterSpacings: { normal: 'normal' } } } } as unknown as BrandInput)).tree[root];
  ok(equalTree.font['line-height'].normal.$extensions.prism3.modes === undefined && equalTree.font['letter-spacing'].normal.$extensions.prism3.modes === undefined,
    'D-lhls(i): a per-mode LH/LS equal to the light value attaches no leaf override (no-diff suppression)');

  // (j) byte-identical guard — a modeLevers entry with no LH/LS lever adds nothing at all (absent feature).
  ok(JSON.stringify(buildTree(brandTheme(base)).tree) === JSON.stringify(buildTree(brandTheme({ ...base, modeLevers: { dark: {} } } as unknown as BrandInput)).tree),
    'D-lhls(j): a modeLevers entry with no LH/LS lever produces byte-identical output');
}

// PER-MODE MOTION TEMPO (Phase D) — a mode runs a different tempo, re-deriving the duration ramp (+
// reduce-motion + stagger) via the SAME buildMotion the baseline uses. Same seam: the engine attaches
// `$extensions.prism3.modes.<mode>` to the `motion.duration.<role>` / `duration-reduced.<role>` /
// `stagger` PRIMITIVE; composite transitions inherit via the duration alias, so the transition SET is
// untouched. Motion is DTCG + web only (not a Figma variable), so buildFigmaFont is unaffected.
{
  const root = 'prism';
  const base = { id: 'dmotion', modes: ['light', 'dark'], primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 } } as unknown as BrandInput;
  const threw = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
  const stable = (v: any): any => Array.isArray(v) ? v.map(stable)
    : (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v);
  // dark runs `relaxed` (×1.3) — standard normal 200ms → 260ms; stagger 40 → 50 (round5).
  const perMode = { ...base, modeLevers: { dark: { tempo: 'relaxed' } } } as unknown as BrandInput;
  const baseTree = buildTree(brandTheme(base)).tree[root];
  const built = buildTree(brandTheme(perMode));
  const pmTree = built.tree[root];

  // (a) #296 INVERTED CONTRACT: `duration.normal` is a SEMANTIC that ALIASES an ms primitive, and a
  //     per-mode tempo re-points the alias rather than re-valuing a leaf. Tempo scales the ramp, so
  //     relaxed's 260ms is a new value — hence a value-keyed primitive grid (the radius/dimension
  //     shape, and the naming KB 18-motion-foundations prescribes), not a re-point at a named rung.
  const durDark = pmTree.motion.duration.normal.$extensions.prism3.modes?.dark;
  ok(!!durDark && durDark.$value === `{${root}.motion.duration-ms.260}` && durDark.ms === 260,
    `D-motion(a): dark tempo re-points duration.normal at the 260ms primitive (got ${durDark?.$value})`);
  ok(pmTree.motion.duration.normal.$value === `{${root}.motion.duration-ms.200}`,
    `D-motion(a): light canonical duration.normal aliases the 200ms primitive (${pmTree.motion.duration.normal.$value})`);
  ok(pmTree.motion.duration.normal.$extensions.prism3.role === 'semantic',
    'D-motion(a): duration.normal is declared semantic');
  // Both endpoints exist as INVARIANT primitives, and neither carries a per-mode variant.
  for (const v of ['200', '260']) {
    const prim = pmTree.motion['duration-ms'][v];
    ok(!!prim && prim.$value === `${v}ms`, `D-motion(a): duration-ms.${v} primitive exists and is literal`);
    ok(prim.$extensions.prism3.modes === undefined, `D-motion(a): duration-ms.${v} carries NO per-mode variant`);
  }
  // stagger + duration-reduced ride the same tier.
  ok(pmTree.motion.stagger.$value === `{${root}.motion.duration-ms.40}`
    && pmTree.motion.stagger.$extensions.prism3.modes?.dark?.$value === `{${root}.motion.duration-ms.50}`,
    'D-motion(a): stagger is a semantic alias that re-points per mode (40 → 50)');
  ok(pmTree.motion['duration-reduced'].instant.$extensions.prism3.role === 'semantic',
    'D-motion(a): duration-reduced is on the semantic tier too');

  // (b) stagger + a reduce-motion step also carry the per-mode override (the whole ramp scales).
  ok(pmTree.motion.stagger.$extensions.prism3.modes?.dark?.ms === 50, `D-motion(b): stagger modes.dark → 50ms (got ${pmTree.motion.stagger.$extensions.prism3.modes?.dark?.ms})`);
  ok(!!pmTree.motion['duration-reduced'].normal.$extensions.prism3.modes?.dark, 'D-motion(b): a reduce-motion step (normal) carries the per-mode override too');

  // (c) the composite transition leaf is UNCHANGED — it aliases motion.duration.<role>, so the per-mode
  //     value is inherited via the alias (the transition SET is fixed).
  ok(JSON.stringify(pmTree.motion.transition.default) === JSON.stringify(baseTree.motion.transition.default),
    'D-motion(c): the transition.default composite leaf is unchanged (inheritance via the duration alias)');

  // (d) every DTCG alias resolves.
  ok(built.stats.broken.length === 0 && built.stats.aliases > 0, `D-motion(d): all ${built.stats.aliases} aliases resolve` + (built.stats.broken.length ? ` — BROKEN ${built.stats.broken.slice(0, 3).map((b: any) => b.ref).join(',')}` : ''));

  // (e) buildFigmaFont is UNAFFECTED — motion isn't a Figma variable (DTCG + web only), so a motion-only
  //     override still emits a single Default core-font file.
  const fontFiles = buildFigmaFont(brandTheme(perMode));
  ok(fontFiles.length === 1 && fontFiles[0].$mode === 'Default', `D-motion(e): motion-only override leaves core-font single-mode (${fontFiles.map((f) => f.$mode).join(',')})`);

  // (f) validation throws — tempo on a generate-only mode (hc-light), and an invalid tempo value.
  ok(threw(() => brandTheme({ ...base, modes: ['light', 'dark', 'hc-light', 'hc-dark'], modeLevers: { 'hc-light': { tempo: 'relaxed' } } } as unknown as BrandInput)), 'D-motion(f): tempo on hc-light (generate-only) throws');
  ok(threw(() => brandTheme({ ...base, modeLevers: { dark: { tempo: 'turbo' } } } as unknown as BrandInput)), 'D-motion(f): an invalid tempo value throws');

  // (g) design.md round-trip preserves modeLevers.tempo through parse∘serialize.
  ok(JSON.stringify(stable(parseDesignMd(toDesignMd(perMode)).input)) === JSON.stringify(stable(perMode)),
    'D-motion(g): parseDesignMd(toDesignMd(input)) preserves modeLevers.tempo');

  // (h) validateBrandInput ACCEPTS per-mode tempo — RETURNS an empty error array (never throws).
  const accept = { id: 'dmotion-schema', primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 }, modes: ['light', 'dark'], modeLevers: { dark: { tempo: 'relaxed' } } } as unknown as BrandInput;
  ok(validateBrandInput(accept).length === 0, `D-motion(h): validateBrandInput accepts per-mode tempo (errors: ${JSON.stringify(validateBrandInput(accept))})`);

  // (i) no-diff suppression at the TOKEN level — a per-mode tempo EQUAL to the baseline attaches no leaf
  //     override (the duration/stagger tokens are byte-identical; only the decisions log records the lever).
  const equalTree = buildTree(brandTheme({ ...base, modeLevers: { dark: { tempo: 'standard' } } } as unknown as BrandInput)).tree[root];
  ok(equalTree.motion.duration.normal.$extensions.prism3.modes === undefined && equalTree.motion.stagger.$extensions.prism3.modes === undefined,
    'D-motion(i): a per-mode tempo equal to the baseline (standard) attaches no leaf override (no-diff suppression)');

  // (j) byte-identical guard — a modeLevers entry with no tempo lever adds nothing at all (absent feature).
  ok(JSON.stringify(buildTree(brandTheme(base)).tree) === JSON.stringify(buildTree(brandTheme({ ...base, modeLevers: { dark: {} } } as unknown as BrandInput)).tree),
    'D-motion(j): a modeLevers entry with no tempo lever produces byte-identical output');
}

// SHADOW TINT IS PERCEPTIBLE (#305). The lever used to be expressible but visually inert: its ENTIRE
// range moved ~1.0–1.5 ΔE00, under the ~2.3 "just noticeable" bar, so a designer sliding it saw
// nothing and reported the control as broken. A lever that cannot be seen is worse than no lever,
// because it teaches distrust of every other control on the page.
//
// Guards the perceptual OUTCOME, not the formula — the coefficients may be retuned, but max tint must
// stay visible on EVERY hue. Measures the shadow composited over white, which is what the eye gets;
// comparing the raw base colours would pass even when the composite is indistinguishable, which is
// exactly how the original defect survived.
{
  const over = (c: RGB, a: number): RGB => ({
    r: Math.round(a * c.r + (1 - a) * 255), g: Math.round(a * c.g + (1 - a) * 255), b: Math.round(a * c.b + (1 - a) * 255) });
  const BLACK_RGB: RGB = { r: 0, g: 0, b: 0 };
  const A = 0.12; // a mid-ramp shadow alpha — the ramp runs 10–14%
  const tintBase = (amount: number, hue: number): RGB =>
    brandTheme({ id: 't', root: 'prism', primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.006, auto: true },
      shadow: { tint: { hue, amount } } } as any).shadow.colorRgb;

  // Swept at 15° rather than spot-checked: sampling three hues is what produced wrong numbers while
  // writing this, because the sRGB chroma floor sits at yellow-green, not at either end.
  let worstVis = Infinity, worstHue = -1;
  for (let h = 0; h < 360; h += 15) {
    const vis = deltaE2000(over(tintBase(1, h), A), over(BLACK_RGB, A));
    if (vis < worstVis) { worstVis = vis; worstHue = h; }
  }
  ok(worstVis >= 2.3,
    `#305 shadow tint at amount 1.0 is perceptible on every hue (worst h${worstHue} = ${worstVis.toFixed(2)} ΔE00, bar 2.3)`);

  // amount 0 is the NB dialect and must stay EXACTLY pure black — NB's committed artifacts depend on it.
  const zero = tintBase(0, 30);
  ok(zero.r === 0 && zero.g === 0 && zero.b === 0, '#305 tint amount 0 is still exactly pure black (NB dialect)');

  // Monotonic where it matters: once the tint is perceptible at all, more amount must not mean less
  // visible tint. Below ~0.3 everything sits under 1 ΔE00 where 8-bit rounding dominates, so the
  // check starts where a user can actually see the difference.
  for (const h of [30, 200, 262]) {
    const seq = [0.3, 0.5, 0.75, 1].map((a) => deltaE2000(over(tintBase(a, h), A), over(BLACK_RGB, A)));
    ok(seq.every((v, i) => i === 0 || v >= seq[i - 1] - 0.05),
      `#305 tint visibility rises with amount at h${h} (${seq.map((v) => v.toFixed(2)).join(' → ')})`);
  }

  // The tint must never push the base out of sRGB — an out-of-gamut oklch would clip unpredictably
  // and the emitted hex would stop matching the requested hue.
  let outOfGamut = 0;
  for (let h = 0; h < 360; h += 30) for (const a of [0.15, 0.5, 1]) {
    const c = tintBase(a, h);
    if (c.r < 0 || c.r > 255 || c.g < 0 || c.g > 255 || c.b < 0 || c.b > 255) outOfGamut++;
  }
  ok(outOfGamut === 0, '#305 every tinted shadow base is inside sRGB');
}

// PER-MODE SHADOW (Phase D) — a mode re-derives its shadow ramp at its own softness/tint via the SAME
// buildShadow the baseline uses, picking the layer-set for the mode's APPEARANCE (dark/dark-based →
// reduced; light/light-based → full) with the mode's own tinted colorRgb. Rides
// `$extensions.prism3.modes.<mode>` on the shadow leaf + a `shadow-<mode>/*` Figma effect-style set.
{
  const root = 'prism';
  const base = { id: 'dshadow', modes: ['light', 'dark'], primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 } } as unknown as BrandInput;
  const threw = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
  const stable = (v: any): any => Array.isArray(v) ? v.map(stable)
    : (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v);
  // dark runs crisper shadows (softness 0.5); a light-based custom mode runs soft + warm (softness 2, tint 0.6).
  const perMode = {
    ...base,
    customModes: [{ name: 'marketing', base: 'light' }],
    modeLevers: { dark: { shadow: { softness: 0.5 } }, marketing: { shadow: { softness: 2, tint: { amount: 0.6 } } } },
  } as unknown as BrandInput;
  const baseTree = buildTree(brandTheme(base)).tree[root];
  const built = buildTree(brandTheme(perMode));
  const pmTree = built.tree[root];

  // (a) shadow.md modes.dark is RE-DERIVED at the override softness (crisper blur) — differs from the
  //     baseline derived dark reduction; light $value is unchanged.
  ok(JSON.stringify(pmTree.shadow.md.$extensions.prism3.modes.dark) !== JSON.stringify(baseTree.shadow.md.$extensions.prism3.modes.dark),
    'D-shadow(a): dark shadow override re-derives modes.dark (crisper) — differs from the baseline reduction');
  ok(JSON.stringify(pmTree.shadow.md.$value) === JSON.stringify(baseTree.shadow.md.$value),
    'D-shadow(a): light canonical shadow.md $value is unchanged by the dark override');
  // the crisper softness (0.5) halves the blur — md ambient blur 12 → 6.
  ok(pmTree.shadow.md.$extensions.prism3.modes.dark[1].blur === '6px', `D-shadow(a): dark md ambient blur halved to 6px at softness 0.5 (got ${pmTree.shadow.md.$extensions.prism3.modes.dark[1].blur})`);

  // (b) a LIGHT-based custom mode gets modes.marketing with the FULL (light-appearance) layers at its
  //     override — soft blur (softness 2 → doubled) + a warmer tinted colour (amount 0.6, not the global).
  const mkt = pmTree.shadow.md.$extensions.prism3.modes.marketing;
  ok(!!mkt && mkt.length === 2 && mkt[1].blur === '24px', `D-shadow(b): marketing (light-based) md ambient blur doubled to 24px at softness 2 (got ${mkt?.[1]?.blur})`);
  ok(mkt[0].color !== baseTree.shadow.md.$value[0].color, `D-shadow(b): marketing shadow colour reflects the tint override (differs from the global-tint colour)`);

  // (c) inset also carries the per-mode overrides (the whole ramp re-derives).
  ok(!!pmTree.shadow.inset.$extensions.prism3.modes.marketing, 'D-shadow(c): the inset shadow carries the per-mode override too');

  // (d) every DTCG alias resolves.
  ok(built.stats.broken.length === 0 && built.stats.aliases > 0, `D-shadow(d): all ${built.stats.aliases} aliases resolve` + (built.stats.broken.length ? ` — BROKEN ${built.stats.broken.slice(0, 3).map((b: any) => b.ref).join(',')}` : ''));

  // (e) buildFigmaShadow emits a shadow-marketing/* effect-style set alongside shadow-dark/* + shadow/*.
  const figShadows = buildFigmaShadow(brandTheme(perMode)).styles.map((s) => s.name);
  ok(figShadows.includes('shadow-marketing/md') && figShadows.includes('shadow-dark/md') && figShadows.includes('shadow/md'),
    `D-shadow(e): effect styles include shadow/md + shadow-dark/md + shadow-marketing/md (got ${figShadows.filter((n) => n.endsWith('/md')).join(', ')})`);

  // (f) validation throws — shadow on a generate-only mode (hc-light), softness out of range, tint amount out of range.
  ok(threw(() => brandTheme({ ...base, modes: ['light', 'dark', 'hc-light', 'hc-dark'], modeLevers: { 'hc-light': { shadow: { softness: 1 } } } } as unknown as BrandInput)), 'D-shadow(f): shadow on hc-light (generate-only) throws');
  ok(threw(() => brandTheme({ ...base, modeLevers: { dark: { shadow: { softness: 3 } } } } as unknown as BrandInput)), 'D-shadow(f): a shadow softness of 3 (>2) throws');
  ok(threw(() => brandTheme({ ...base, modeLevers: { dark: { shadow: { tint: { amount: 2 } } } } } as unknown as BrandInput)), 'D-shadow(f): a shadow tint amount of 2 (>1) throws');

  // (g) design.md round-trip preserves modeLevers.shadow through parse∘serialize.
  ok(JSON.stringify(stable(parseDesignMd(toDesignMd(perMode)).input)) === JSON.stringify(stable(perMode)),
    'D-shadow(g): parseDesignMd(toDesignMd(input)) preserves modeLevers.shadow');

  // (h) validateBrandInput ACCEPTS per-mode shadow — RETURNS an empty error array (never throws).
  const accept = { id: 'dshadow-schema', primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 }, modes: ['light', 'dark'], modeLevers: { dark: { shadow: { softness: 0.5, tint: { hue: 20, amount: 0.4 } } } } } as unknown as BrandInput;
  ok(validateBrandInput(accept).length === 0, `D-shadow(h): validateBrandInput accepts per-mode shadow (errors: ${JSON.stringify(validateBrandInput(accept))})`);

  // (i) byte-identical guard — a modeLevers entry with no shadow lever adds nothing (absent feature).
  ok(JSON.stringify(buildTree(brandTheme(base)).tree) === JSON.stringify(buildTree(brandTheme({ ...base, modeLevers: { dark: {} } } as unknown as BrandInput)).tree),
    'D-shadow(i): a modeLevers entry with no shadow lever produces byte-identical output');
}

// PER-MODE DENSITY (Phase D) — a mode re-derives its component-size tier (size.* control heights + paired
// padding) at a different density via the SAME componentSizes the baseline uses. Same seam: the engine
// attaches `$extensions.prism3.modes.<mode>` to the `size.<name>.{height,padding-x,padding-y}` PRIMITIVE
// (aliasing the dimension grid / space scale on-grid, else a literal px). The `space.*` reference scale
// is density-free, so it's untouched. Byte-identical when absent.
{
  const root = 'prism';
  const base = { id: 'ddensity', modes: ['light', 'dark'], primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 } } as unknown as BrandInput;
  const threw = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
  const stable = (v: any): any => Array.isArray(v) ? v.map(stable)
    : (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v);
  // dark runs `spacious` (looser controls) while light stays comfortable.
  const perMode = { ...base, modeLevers: { dark: { density: 'spacious' } } } as unknown as BrandInput;
  const baseTree = buildTree(brandTheme(base)).tree[root];
  const built = buildTree(brandTheme(perMode));
  const pmTree = built.tree[root];

  // (a) at least one size rung's height carries a modes.dark override (spacious raises control heights);
  //     light's canonical $value is unchanged. Find a rung that actually differs.
  const sizeNames = Object.keys(pmTree.size);
  const changed = sizeNames.find((n) => pmTree.size[n].height.$extensions.prism3.modes?.dark);
  ok(!!changed, `D-density(a): a size rung's height carries a modes.dark override under spacious (rung: ${changed})`);
  ok(pmTree.size[changed!].height.$value === baseTree.size[changed!].height.$value,
    `D-density(a): light canonical size.${changed}.height $value is unchanged by the dark density lever`);
  // the override aliases the dimension grid (on-grid) or is a literal px — either way carries `px`.
  ok(typeof pmTree.size[changed!].height.$extensions.prism3.modes.dark.px === 'number',
    'D-density(a): the height override carries a resolved px');

  // (b) padding also re-derives per mode (spacious loosens insets) on at least one rung.
  const padChanged = sizeNames.find((n) => pmTree.size[n]['padding-x'].$extensions.prism3.modes?.dark || pmTree.size[n]['padding-y'].$extensions.prism3.modes?.dark);
  ok(!!padChanged, `D-density(b): a size rung's padding carries a modes.dark override under spacious (rung: ${padChanged})`);

  // (c) the space.* REFERENCE scale is density-free — it carries NO per-mode override.
  ok(Object.keys(pmTree.space).every((k) => pmTree.space[k].$extensions.prism3.modes === undefined),
    'D-density(c): the density-free space.* scale carries no per-mode override');

  // (d) every DTCG alias resolves — incl. the per-mode height/padding aliases.
  ok(built.stats.broken.length === 0 && built.stats.aliases > 0, `D-density(d): all ${built.stats.aliases} aliases resolve` + (built.stats.broken.length ? ` — BROKEN ${built.stats.broken.slice(0, 3).map((b: any) => b.ref).join(',')}` : ''));

  // (e) validation throws — density on a generate-only mode (hc-light), and an invalid density value.
  ok(threw(() => brandTheme({ ...base, modes: ['light', 'dark', 'hc-light', 'hc-dark'], modeLevers: { 'hc-light': { density: 'spacious' } } } as unknown as BrandInput)), 'D-density(e): density on hc-light (generate-only) throws');
  ok(threw(() => brandTheme({ ...base, modeLevers: { dark: { density: 'roomy' } } } as unknown as BrandInput)), 'D-density(e): an invalid density value throws');

  // (f) design.md round-trip preserves modeLevers.density through parse∘serialize.
  ok(JSON.stringify(stable(parseDesignMd(toDesignMd(perMode)).input)) === JSON.stringify(stable(perMode)),
    'D-density(f): parseDesignMd(toDesignMd(input)) preserves modeLevers.density');

  // (g) validateBrandInput ACCEPTS per-mode density — RETURNS an empty error array (never throws).
  const accept = { id: 'ddensity-schema', primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 }, modes: ['light', 'dark'], modeLevers: { dark: { density: 'compact' } } } as unknown as BrandInput;
  ok(validateBrandInput(accept).length === 0, `D-density(g): validateBrandInput accepts per-mode density (errors: ${JSON.stringify(validateBrandInput(accept))})`);

  // (h) no-diff suppression — a per-mode density EQUAL to the baseline attaches no leaf override.
  const equalTree = buildTree(brandTheme({ ...base, modeLevers: { dark: { density: 'comfortable' } } } as unknown as BrandInput)).tree[root];
  ok(Object.keys(equalTree.size).every((n) => equalTree.size[n].height.$extensions.prism3.modes === undefined),
    'D-density(h): a per-mode density equal to the baseline (comfortable) attaches no leaf override');

  // (i) byte-identical guard — a modeLevers entry with no density lever adds nothing (absent feature).
  ok(JSON.stringify(buildTree(brandTheme(base)).tree) === JSON.stringify(buildTree(brandTheme({ ...base, modeLevers: { dark: {} } } as unknown as BrandInput)).tree),
    'D-density(i): a modeLevers entry with no density lever produces byte-identical output');
}

// #274 — space.* aliases must resolve at ANY spaceBase. Space is `mult × spaceBase`; the dimension grid is
// `baseUnit`-stepped, so a non-default spaceBase pushes the half-steps (1.5×/0.25×/0.75×) OFF the grid
// (spaceBase 12 → space.150 = 18px, not a baseUnit-4 multiple) and the `space.<k> → {dimension.<px>}` alias
// would dangle. buildDims feeds every space px into the grid as extras, so they resolve by construction.
{
  const root = 'prism';
  const mk = (spaceBase: number) => buildTree(brandTheme({ id: 'sb', primary: { l: 0.5, c: 0.15, h: 260 }, neutral: { hue: 260, chroma: 0.008 }, spaceBase } as unknown as BrandInput));
  // Off-grid bases (whose half-steps miss the baseUnit-4 grid) + the default: all must be dangle-free.
  for (const sb of [8, 12, 5, 10]) {
    const built = mk(sb);
    ok(built.stats.broken.length === 0, `#274: spaceBase ${sb} — 0 dangling aliases` + (built.stats.broken.length ? ` — BROKEN ${built.stats.broken.slice(0, 4).map((b: any) => b.ref).join(',')}` : ''));
    const data = built.tree[root];
    const s150 = at(data, 'space.150');
    const target = String(s150.$value).replace(/^\{|\}$/g, '');
    ok(at(built.tree, target) !== undefined, `#274: spaceBase ${sb} — space.150 (${Math.round(1.5 * sb)}px) target ${target} exists`);
  }
  // Guard the byte-identity claim explicitly: at the default spaceBase 8, space px already land on the grid,
  // so feeding them as extras changes nothing — a default brand's tree is unaffected by the fix.
  ok(mk(8).stats.broken.length === 0, '#274: default spaceBase 8 stays dangle-free (committed fixtures unaffected)');
}

// PHASE D — ENGINE REVIEW FIXES. Correctness + consistency findings from the engine code review.
{
  const root = 'prism';
  const base = { id: 'drev', modes: ['light', 'dark'], primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 } } as unknown as BrandInput;
  const threw = (f: () => unknown) => { try { f(); return false; } catch { return true; } };

  // (a) FIX #1 — a DARK-based custom mode inherits its base's reduced dark shadow even WITHOUT a shadow
  //     override (previously it fell back to the light `$value`). modes.<custom> is emitted, and it equals
  //     the built-in dark reduction (modes.dark) — a light-based custom mode still gets NO shadow entry.
  const withCustoms = { ...base, customModes: [{ name: 'marketing-dark', base: 'dark' }, { name: 'promo-light', base: 'light' }] } as unknown as BrandInput;
  const ct = buildTree(brandTheme(withCustoms)).tree[root];
  const mdModes = ct.shadow.md.$extensions.prism3.modes;
  ok(!!mdModes['marketing-dark'], 'D-rev(a): a dark-based custom mode gets a per-mode shadow entry (no light-shadow fallback)');
  ok(JSON.stringify(mdModes['marketing-dark']) === JSON.stringify(mdModes.dark), 'D-rev(a): the dark-based custom mode inherits exactly the built-in dark reduction');
  ok(mdModes['promo-light'] === undefined, 'D-rev(a): a light-based custom mode with no override carries no shadow entry (inherits light $value)');

  // (b) FIX #1 — the dark-based custom mode also reaches Figma as its own effect-style set.
  const figNames = buildFigmaShadow(brandTheme(withCustoms)).styles.map((s) => s.name);
  ok(figNames.includes('shadow-marketing-dark/md'), `D-rev(b): a dark-based custom mode emits shadow-marketing-dark/* effect styles (got ${figNames.filter((n) => n.endsWith('/md')).join(', ')})`);

  // (c) FIX #3 — modeLevers on the base `light` mode is rejected (light IS the global baseline for the
  //     non-colour levers; a modes.light override would shadow the canonical $value).
  ok(threw(() => brandTheme({ ...base, modeLevers: { light: { radius: 0 } } } as unknown as BrandInput)), 'D-rev(c): modeLevers.light throws (use the global levers)');

  // (d) FIX #2 — line-height / letter-spacing now suppress the per-mode MAP when a mode re-declares the
  //     global ramp (mirrors radius/family/weight): no leaf override AND no lineHeightsByMode entry.
  const equalLh = brandTheme({ ...base, modeLevers: { dark: { lineHeights: { normal: 'normal' }, letterSpacings: { normal: 'normal' } } } } as unknown as BrandInput);
  ok(equalLh.typography.lineHeightRepointByMode === undefined && equalLh.typography.letterSpacingRepointByMode === undefined,
    'D-rev(d): a SELF-MAP (normal → normal) leaves the re-point maps unset (no-diff suppression, #296)');
  ok(equalLh.modeLevers === undefined, 'D-rev(d): an all-equal LH/LS override leaves modeLevers off the Theme (byte-identical)');
  // a genuinely divergent LH still populates the map.
  const diffLh = brandTheme({ ...base, modeLevers: { dark: { lineHeights: { normal: 'relaxed' } } } } as unknown as BrandInput);
  ok(diffLh.typography.lineHeightRepointByMode?.dark?.normal === 'relaxed',
    'D-rev(d): a genuine rung→rung re-point still populates the map');
}

// Brand-level leading/tracking rung values (#270) + per-group leading/tracking nudge.
// The rung SET stays fixed; a brand re-anchors what a rung is WORTH, and nudges which
// rung a group lands on — without flattening the engine's size-sensitive curve.
{
  const threw = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
  const mk = (typography: any) => brandTheme({ id: 'lhls', primary: { l: 0.5, c: 0.12, h: 250 }, neutral: { hue: 250, chroma: 0.01 }, typography } as unknown as BrandInput);
  const lhOf = (t: any, k: string) => t.typography.lineHeights.find((x: any) => x.key === k).value;
  const lsOf = (t: any, k: string) => t.typography.letterSpacings.find((x: any) => x.key === k).em;
  const titleRungs = (t: any) => t.typography.composites.filter((c: any) => c.group === 'title').map((c: any) => c.lineHeight);

  // (a) defaults are untouched — the curated ramp is the baseline, so no-input is byte-identical.
  ok(lhOf(mk({}), 'normal') === 1.5 && lsOf(mk({}), 'wider') === 0.05, 'type-ramp(a): omitted rungs keep the curated defaults');

  // (b) a brand re-anchors a rung VALUE; the composite keeps its KEY and inherits the new value.
  const re = mk({ lineHeights: { normal: 1.4 }, letterSpacings: { wider: 0.08 } });
  ok(lhOf(re, 'normal') === 1.4 && lsOf(re, 'wider') === 0.08, 'type-ramp(b): brand re-anchors a named rung value');
  ok(re.typography.composites.find((c: any) => c.group === 'body').lineHeight === 'normal',
    'type-ramp(b): a re-anchored rung does not change which key a composite references');
  ok(re.typography.lineHeights.length === 6 && re.typography.letterSpacings.length === 6,
    'type-ramp(b): re-anchoring never adds or drops a rung — the set is fixed');

  // (c) the per-group nudge SHIFTS the derived curve; it must stay size-sensitive, not flatten.
  const base0 = titleRungs(mk({}));
  const up1 = titleRungs(mk({ leadingShift: { title: 1 } }));
  ok(new Set(base0).size > 1, 'type-ramp(c): title leading is size-sensitive by default (precondition)');
  ok(up1.every((k: string, i: number) => k !== base0[i]), 'type-ramp(c): +1 leading nudge moves every title rung');
  ok(new Set(up1).size > 1, 'type-ramp(c): the nudged title curve is STILL size-sensitive (shifted, not flattened)');
  ok(mk({ trackingShift: { eyebrow: -1 } }).typography.composites.find((c: any) => c.group === 'eyebrow').tracking === 'wide',
    'type-ramp(c): a -1 tracking nudge moves eyebrow wider→wide');

  // (d) a nudge past the end of the ramp clamps rather than wrapping or going out of bounds.
  ok(mk({ leadingShift: { display: -5 } }).typography.composites.find((c: any) => c.group === 'display').lineHeight === 'tight',
    'type-ramp(d): an over-large negative nudge clamps at the tightest rung');
  ok(mk({ leadingShift: { body: 5 } }).typography.composites.find((c: any) => c.group === 'body').lineHeight === 'loose',
    'type-ramp(d): an over-large positive nudge clamps at the loosest rung');

  // (e) bounds guard typos, not taste — same ranges as the per-mode levers.
  ok(threw(() => mk({ lineHeights: { normal: 99 } })), 'type-ramp(e): a line-height of 99 (>3) throws');
  ok(threw(() => mk({ letterSpacings: { normal: 2 } })), 'type-ramp(e): a letter-spacing of 2em (>0.5) throws');
  ok(threw(() => mk({ leadingShift: { title: 1.5 } })), 'type-ramp(e): a fractional rung nudge throws');

  // (f) #296 — the two operations COMPOSE without colliding: a brand re-anchors what a rung is worth
  //     (numeric, mode-invariant), and a mode re-points which rung is used (a rung name). The mode's
  //     target therefore resolves through the brand's re-anchored value automatically.
  const both = brandTheme({ id: 'lhls2', primary: { l: 0.5, c: 0.12, h: 250 }, neutral: { hue: 250, chroma: 0.01 },
    modes: ['light', 'dark'], typography: { lineHeights: { relaxed: 1.9 } },
    modeLevers: { dark: { lineHeights: { normal: 'relaxed' } } } } as unknown as BrandInput);
  ok(both.typography.lineHeights.find((l: any) => l.key === 'relaxed')?.value === 1.9,
    'type-ramp(f): the brand re-anchor of `relaxed` holds (one value, every mode)');
  ok(both.typography.lineHeightRepointByMode?.dark?.normal === 'relaxed',
    'type-ramp(f): the mode records a rung→rung re-point, not a ramp');
  const bodyC = both.typography.composites.find((c: any) => c.group === 'body' && c.lineHeight === 'normal');
  ok(bodyC?.lineHeightByMode?.dark === 'relaxed',
    'type-ramp(f): a body composite using `normal` re-points to `relaxed` in dark — resolving to the brand value 1.9');
  // A rung the mode did NOT re-point keeps its own key everywhere — the re-point is per-rung, not global.
  const tightC = both.typography.composites.find((c: any) => c.lineHeight === 'tight');
  ok(!tightC || tightC.lineHeightByMode === undefined,
    'type-ramp(f): a rung the mode did not re-point is untouched in that mode');

  // (g) the new levers must survive the design.md round-trip, or a brand authored in the
  //     dashboard would silently lose them on export→import.
  const rt = { id: 'rt', primary: { l: 0.5, c: 0.12, h: 250 }, neutral: { hue: 250, chroma: 0.01 },
    typography: { lineHeights: { normal: 1.4 }, letterSpacings: { wider: 0.08 },
      leadingShift: { title: 1 }, trackingShift: { eyebrow: -1 } } } as unknown as BrandInput;
  ok(JSON.stringify(parseDesignMd(toDesignMd(rt)).input) === JSON.stringify(rt),
    'type-ramp(g): parseDesignMd(toDesignMd(x)) preserves lineHeights/letterSpacings/leadingShift/trackingShift');
}

// roleColors — general semantic-role rebasing (docs/21): re-base any role on a declared palette,
// with the contrast guarantee preserved and a hue-mismatch note (not a block).
{
  const mk = (roleColors: any, extra: any = {}) => brandTheme({ id: 'rc', primary: { l: 0.5, c: 0.12, h: 250 }, neutral: { hue: 250, chroma: 0.01 }, roleColors, ...extra } as unknown as BrandInput);
  // (a) the gap-closer: a blue brand reuses its blue for info (no override existed before #21).
  ok(mk({ info: 'primary' }).roleToPalette.info === 'primary', 'roleColors: info re-bases on the brand (primary) palette');
  // (b) explicit danger rebase wins over the carve AND mints no orphan danger ramp.
  const red = brandTheme({ id: 'red', primary: { l: 0.5, c: 0.2, h: 25 }, neutral: { hue: 25, chroma: 0.01 }, roleColors: { danger: 'primary' } } as unknown as BrandInput);
  ok(red.roleToPalette.danger === 'primary' && !red.palettes.some((p) => p.palette === 'danger'), 'roleColors: explicit danger→primary reuses the brand red with no orphan danger palette');
  // (b2) success/warning/info are minted unconditionally, so a rebase must PRUNE the now-dead ramp
  //      (symmetric with danger's no-orphan behaviour) — else a borrowed status ramp ships as a dead one.
  const reInfo = mk({ info: 'primary' });
  ok(reInfo.roleToPalette.info === 'primary' && !reInfo.palettes.some((p) => p.palette === 'info'), 'roleColors: info→primary prunes the orphaned info ramp (no dead ramp)');
  ok(mk({ success: 'primary' }).palettes.every((p) => p.palette !== 'success') && mk({}).palettes.some((p) => p.palette === 'success'), 'roleColors: success ramp is pruned when rebased, present when not');
  // and a status ramp still SURVIVES if actionPalette points at it (used by another role).
  ok(mk({ info: 'primary' }, { actionPalette: 'warning' }).palettes.some((p) => p.palette === 'warning'), 'roleColors: a status ramp survives pruning when actionPalette still points at it');
  // (c) action via roleColors (the general form of actionPalette).
  ok(mk({ action: 'cta' }, { brandColors: [{ name: 'cta', oklch: { l: 0.5, c: 0.15, h: 30 } }] }).roleToPalette.action === 'cta', 'roleColors: action re-bases like actionPalette');
  // (d) THE GUARANTEE — every contract still passes when roles are rebased, all modes.
  const rebased = resolveAllModes(mk({ info: 'primary', danger: 'primary' }));
  const broken = rebased.flatMap((m) => Object.entries(m.roles).filter(([, r]) => r.min > 0 && r.ratio < r.min).map(([k]) => `${m.mode}.${k}`));
  ok(broken.length === 0, 'roleColors: a rebased brand still clears every contract in every mode' + (broken.length ? ` — FAILED ${broken.slice(0, 3).join(',')}` : ''));
  const infoPath = rebased.find((m) => m.mode === 'light')!.roles['text.info'].path;
  ok(/\.primary\./.test(infoPath), `roleColors: text.info now resolves on the primary ramp (${infoPath.split('.').slice(-2).join('.')})`);
  // (e) hue-mismatch is flagged, not blocked.
  const mis = brandTheme({ id: 'mis', primary: { l: 0.5, c: 0.15, h: 150 }, neutral: { hue: 150, chroma: 0.01 }, brandColors: [{ name: 'lime', oklch: { l: 0.7, c: 0.15, h: 135 } }], roleColors: { danger: 'lime' } } as unknown as BrandInput);
  ok(mis.roleToPalette.danger === 'lime' && mis.notes.some((n) => /CONFIRM the danger signal/.test(n)), 'roleColors: a hue mismatch (danger not red) is allowed but flagged in notes');
  // (f) guards: brand/neutral cannot be rebased; unknown palette rejected.
  let tn = false, tu = false;
  try { mk({ neutral: 'primary' }); } catch { tn = true; }
  try { mk({ info: 'nope' }); } catch { tu = true; }
  ok(tn, 'roleColors: rebasing neutral (the surface model) is rejected');
  ok(tu, 'roleColors: an unknown target palette is rejected');
}

// status.info — the fourth validation colour is now directly hue-settable (was synthesise-only,
// the docs/21 §2 gap). Symmetric with success/warning: a measured hue seeds a fresh vivid ramp,
// contrast still re-gates. (danger keeps its own carve path; success/warning already worked.)
{
  const base = { id: 'si', primary: { l: 0.5, c: 0.12, h: 250 }, neutral: { hue: 250, chroma: 0.01 } };
  const def = brandTheme(base as unknown as BrandInput);
  // A deliberately non-blue info (teal-green) to prove the override actually moves the ramp hue.
  const teal = brandTheme({ ...base, status: { info: { l: 0.55, c: 0.12, h: 175 } } } as unknown as BrandInput);
  const infoStep = (t: typeof def) => t.palettes.find((p) => p.palette === 'info')!.steps.find((s) => s.num === 500)!;
  ok(Math.abs(infoStep(teal).oklch.h - 175) < 12, `status.info: a measured info hue seeds the info ramp (got h${infoStep(teal).oklch.h.toFixed(0)})`);
  ok(Math.abs(infoStep(def).oklch.h - infoStep(teal).oklch.h) > 30, 'status.info: the override actually moves the info ramp off the canonical blue default');
  ok(teal.notes.some((n) => /^info: brand-supplied hue/.test(n)), 'status.info: a supplied info hue is recorded in the decisions log');
  // contrast still holds: text.info clears its floor in every mode on the re-hued ramp.
  const infoFail = resolveAllModes(teal).filter((m) => { const r = m.roles['text.info']; return r.ratio < r.min; }).map((m) => m.mode);
  ok(infoFail.length === 0, 'status.info: text.info still clears its contract in every mode after the re-hue' + (infoFail.length ? ` — ${infoFail.join(',')}` : ''));
  ok(leverManifest.some((l) => l.key === 'status.info' && l.control === 'color'), 'status.info: exposed as a colour lever in the manifest (parity with success/warning/danger)');
}

// L-02: dualContrastWindow is only defined up to √21 ≈ 4.583 (the max ratio any single
// luminance clears on BOTH extremes). At 4.5 it returns a valid non-empty window; past
// √21 it must THROW rather than hand back an inverted [min>max] pair.
{
  const [lo, hi] = dualContrastWindow(4.5);
  ok(lo < hi && lo > 0 && hi < 1, `L-02: dualContrastWindow(4.5) is a valid non-empty window [${lo.toFixed(3)}, ${hi.toFixed(3)}]`);
  let threw = false;
  try { dualContrastWindow(7); } catch { threw = true; }
  ok(threw, 'L-02: dualContrastWindow(7) throws — no luminance clears 7:1 on both black and white (would have been an inverted window)');
  ok(dualContrastWindow(Math.sqrt(21))[0] <= dualContrastWindow(Math.sqrt(21))[1] + 1e-9, 'L-02: exactly √21 is the degenerate boundary (min ≈ max), still allowed');
}

// L-03: radiusScale is weakly monotone (none ≤ sm ≤ md ≤ lg) for any scale ≥ 0 — small
// scales legitimately snap rungs together, but a rung is never SMALLER than its predecessor.
// A non-monotone input (negative scale) trips the gate.
{
  for (const s of [0, 0.25, 0.5, 1, 1.5, 2]) {
    const ladder = radiusScale(s).filter((r) => !r.pill);
    const mono = ladder.every((r, i) => i === 0 || r.px >= ladder[i - 1].px);
    ok(mono, `L-03: radiusScale(${s}) is weakly monotone (${ladder.map((r) => r.px).join('≤')})`);
  }
  ok(radiusScale(0).filter((r) => !r.pill).every((r) => r.px === 0), 'L-03: scale=0 collapses the ladder to all-sharp by design (equality allowed)');
  ok(radiusScale(0.25).filter((r) => !r.pill).map((r) => r.px).join(',') === '0,0,2,2', 'L-03: a small scale quantises onto the 2px sub-grid (none=sm=0, md=lg=2) — a documented resolution limit, not a bug');
  // The gate itself is a construction-time tripwire: RADIUS_LADDER factors are
  // monotone and Math.max(0,·)/snap2 preserve that for any scale ≥ 0, so no scalar
  // input can violate it — it guards a FUTURE non-monotone ladder edit. Assert the
  // property holds at the extremes rather than trying to force the (unreachable) throw.
  ok(radiusScale(1000).filter((r) => !r.pill).every((r, i, a) => i === 0 || r.px >= a[i - 1].px), 'L-03: monotonicity holds even at an absurd scale (gate never false-trips a valid ladder)');
}

// L-05: pxOf is rem-aware (a rem leaf scales by 16, not truncated as px), and deref reports
// a runaway/cyclic alias chain as missing (undefined) rather than a mid-chain node.
{
  const tree: any = { root: { a: { $value: '1.5rem' }, b: { $value: '8px' }, loop: { $value: '{root.loop}' } } };
  ok(pxOf(tree, tree.root.b) === 8, 'L-05: pxOf reads a px leaf directly (8px → 8)');
  ok(pxOf(tree, tree.root.a) === 24, 'L-05: pxOf scales a rem leaf by 16 (1.5rem → 24px), not parseInt→1');
  ok(deref(tree, tree.root.loop) === undefined, 'L-05: deref returns undefined on a cyclic alias chain (missing), not a mid-chain alias node');
  ok(deref(tree, tree.root.b)?.$value === '8px' && at(tree, 'root.b')?.$value === '8px', 'L-05: deref/at resolve a normal leaf unchanged');
}

// M-05: red-territory detection is chroma-aware. A red-ish but DESATURATED (greige) primary
// must NOT be reused as danger — a near-grey can't signal destruction — so it carves a real
// saturated red; a genuinely saturated red primary still reuses itself.
{
  ok(!inRedTerritory(30, 0.03), 'M-05: a warm greige (h30, c0.03) is NOT red territory (chroma below floor)');
  ok(inRedTerritory(27, 0.17), 'M-05: a saturated red (h27, c0.17) IS red territory');
  const greige = brandTheme({ id: 'greige', primary: { l: 0.5, c: 0.03, h: 30 }, neutral: { hue: 30, chroma: 0.01 } });
  ok(greige.roleToPalette.danger === 'danger', 'M-05: a greige-warm primary carves a dedicated danger palette (does NOT reuse the near-grey primary)');
  const dMid = greige.palettes.find((p) => p.palette === 'danger')!.steps.find((s) => s.num === 500)!;
  ok(dMid.oklch.c > 0.08, `M-05: the carved danger is a saturated red (mid chroma ${dMid.oklch.c.toFixed(3)} > floor), not a near-grey`);
  const satRed = brandTheme({ id: 'red', primary: { l: 0.55, c: 0.17, h: 27 }, neutral: { hue: 27, chroma: 0.01 } });
  // A saturated red primary SEEDS danger from its own ramp — but mints a stable `palette.danger`
  // (a deep copy of primary's steps), NOT a pointer at 'primary', so semantic danger tokens alias
  // `palette.danger.*` and danger stays independently re-pointable later (roleToPalette invariant:
  // danger === 'danger' in every auto path — reuse, greige-carve, and non-red carve alike).
  ok(satRed.roleToPalette.danger === 'danger', 'M-05: a saturated red primary mints its own danger palette (roleToPalette.danger stays "danger", not "primary")');
  const satRedPrimary = satRed.palettes.find((p) => p.palette === 'primary')!;
  const satRedDanger = satRed.palettes.find((p) => p.palette === 'danger');
  ok(!!satRedDanger, 'M-05: a saturated red primary mints a stable palette.danger namespace (not collapsed into primary)');
  ok(satRedDanger!.steps.every((s, i) => s.hex === satRedPrimary.steps[i].hex), 'M-05: the red-seeded danger ramp duplicates the primary ramp step-for-step (danger ≈ primary while shared)');
  ok(satRedDanger!.steps !== satRedPrimary.steps && satRedDanger!.steps[0] !== satRedPrimary.steps[0], 'M-05: the danger ramp is a deep copy, not the same Step objects (editing one never mutates the other)');
  ok(greige.notes.some((n) => n.includes('below the') && n.includes('floor')), 'M-05: the greige carve reason is surfaced in the decisions log');
}

// M-06: a non-primary actionPalette anchors the action role at the brand's PINNED accent step
// (matching nbTheme's action=550=accent step), not the hardcoded 500 pivot that silently
// discarded the brand's chosen shade. pickBrand still nudges to clear AA, so a11y is preserved.
{
  const step = autoPlaceStep(0.35);   // a dark accent pins well below 500
  ok(step !== 500, `precondition: a dark accent pins off the 500 pivot (step ${step})`);
  const acted = brandTheme({ id: 'act', primary: { l: 0.5, c: 0.08, h: 260 }, neutral: { hue: 260, chroma: 0.01 }, brandColors: [{ name: 'cta', oklch: { l: 0.35, c: 0.1, h: 260 } }], actionPalette: 'cta' });
  ok(acted.roleAnchorStep.action === step, `M-06: a non-primary actionPalette anchors the action at the accent's pinned step ${step}, not 500`);
  const prim = brandTheme({ id: 'p', primary: { l: 0.35, c: 0.1, h: 260 }, neutral: { hue: 260, chroma: 0.01 } });
  ok(prim.roleAnchorStep.action === prim.roleAnchorStep.brand, 'M-06: actionPalette=primary still anchors the action at the primary step');
}

// ------------------------------------------- typography composite invariants
// Guard the composite generator across lever combos: every sub-reference must
// resolve to a real primitive, sizes stay on the ladder, no duplicate size within
// a group, monotonic per group, count inside the KB's 15–25 (12 floor when a brand
// caps display), and the floor/ceiling levers behave.
const FAM = new Set(['display', 'text', 'mono']);
const tBrand = (id: string, ty: any) => brandTheme({ id, primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 }, typography: ty });
const typeCases: [string, any][] = [
  ['default', {}],
  ['expressive', { typeScale: 'expressive' }],
  ['compact', { typeScale: 'compact' }],
  ['default+floor16', { titleFloor: 16 }],
  ['ceiling-xl', { displayCeiling: 'xl' }],
  ['ceiling-sm', { displayCeiling: 'sm' }],
  ['familyMap+singleface', { families: { text: 'Foo' }, familyMap: { label: 'text', title: 'text' } }],
];
for (const [label, ty] of typeCases) {
  const t = tBrand('ty-' + label, ty);
  const comps = t.typography.composites;
  const ladder = new Set(t.typography.sizesPx);
  const lh = new Set(t.typography.lineHeights.map((x) => x.key));
  const ls = new Set(t.typography.letterSpacings.map((x) => x.key));
  const wr = new Set(t.typography.weightRoles.map((x) => x.role));
  // base "style slots" = unique (group, variant); each fans out to weights (× link).
  const slots = new Set(comps.map((c) => `${c.group}.${c.variant}`));
  ok(slots.size >= 12 && slots.size <= 30, `[type/${label}] ${slots.size} style slots in 12..30 (×weights×link = ${comps.length} composites)`);
  ok(new Set(comps.map((c) => c.path)).size === comps.length, `[type/${label}] all composite paths unique`);
  let bad = '', mono = '';
  const byGroup: Record<string, number[]> = {};
  for (const c of comps) {
    (byGroup[c.group] ??= []).push(c.sizePx);
    if (!ladder.has(c.sizePx)) bad ||= `${c.path} off-ladder ${c.sizePx}`;
    if (!FAM.has(c.family)) bad ||= `${c.path} bad family ${c.family}`;
    if (!wr.has(c.weightRole)) bad ||= `${c.path} bad weight ${c.weightRole}`;
    if (!lh.has(c.lineHeight)) bad ||= `${c.path} bad line-height ${c.lineHeight}`;
    if (!ls.has(c.tracking)) bad ||= `${c.path} bad tracking ${c.tracking}`;
    // the weight role is always the trailing name segment (minus an optional -link)
    if (c.path.split('.').pop()!.replace('-link', '').replace('-italic', '') !== c.weightRole) bad ||= `${c.path} weight not in name`;
  }
  // sizes are size-major within a group (weights repeat a size); DISTINCT sizes ascend.
  for (const [g, sizes] of Object.entries(byGroup)) {
    for (let i = 1; i < sizes.length; i++) if (sizes[i] < sizes[i - 1]) mono ||= `${g}:${sizes[i - 1]}->${sizes[i]}`;
  }
  ok(!bad, `[type/${label}] all composite refs resolve + weight in name${bad ? ` — ${bad}` : ''}`);
  ok(!mono, `[type/${label}] sizes non-decreasing within group${mono ? ` — ${mono}` : ''}`);
  // fluid (Phase 3): mobile endpoint never above desktop, always a real ladder rung,
  // and only the heading SYSTEM ever goes fluid — display/title, plus eyebrow since #328 made it a
  // heading category. Reading/UI text (body/label/caption/code) stays static; that is the contract
  // this guards, and it is the reason the list is enumerated rather than inferred.
  let flbad = '';
  for (const c of comps) {
    if (c.sizeMinPx > c.sizePx) flbad ||= `${c.path} min>${c.sizePx}`;
    if (!ladder.has(c.sizeMinPx)) flbad ||= `${c.path} min off-ladder ${c.sizeMinPx}`;
    if (c.sizeMinPx !== c.sizePx && !['display', 'title', 'eyebrow'].includes(c.group)) flbad ||= `${c.path} non-heading is fluid`;
    // Eyebrow is fluid ABOVE 14px only — the small kickers must NOT move (#328).
    if (c.group === 'eyebrow' && c.sizePx <= 14 && c.sizeMinPx !== c.sizePx) flbad ||= `${c.path} small eyebrow (${c.sizePx}px) must stay static`;
  }
  ok(!flbad, `[type/${label}] fluid endpoints valid${flbad ? ` — ${flbad}` : ''}`);
}
// responsive OFF → every composite static (min == max)
ok(tBrand('static', { responsive: { fluid: false } }).typography.composites.every((c) => c.sizeMinPx === c.sizePx), 'responsive:{fluid:false} → all composites static');
// default fluid → at least the display tier is fluid (min < max somewhere)
ok(tBrand('fl', {}).typography.composites.some((c) => c.group === 'display' && c.sizeMinPx < c.sizePx), 'default fluid → display tier shrinks on mobile');
ok(!tBrand('tf-d', {}).typography.composites.some((c) => c.group === 'title' && c.variant === '2xs'), 'titleFloor default 18 → no title.2xs');
// C1: titleFloor 16 delivers a LITERAL 16px title.2xs (pinned, exempt from the shift). Only the two
// scales it is legal with — 'compact' is rejected outright (see C1c).
for (const scale of ['default', 'expressive'] as const) {
  const c = tBrand('tf16-' + scale, { titleFloor: 16, typeScale: scale }).typography.composites.find((x) => x.group === 'title' && x.variant === '2xs');
  ok(!!c && c.sizePx === 16, `titleFloor 16 + ${scale} → title.2xs pinned at 16px (got ${c?.sizePx})`);
}
// C1b (#328): the SET IS COMPLETE under every typeScale — this is the regression test for the bug
// C1 above could never have caught. It asserted only that title.2xs EXISTS; it never counted the
// ramp, so `compact` silently shipping 5 title rungs (a GAP at .sm, floor 18) or losing .xs
// (floor 16) passed it for months, and reached out/harbor.tokens.json in production.
{
  const rungOrder = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  for (const scale of ['compact', 'default', 'expressive'] as const) {
    const t = tBrand('setc-' + scale, { typeScale: scale });
    const got = [...new Set(t.typography.composites.filter((c) => c.group === 'title').map((c) => c.variant))]
      .sort((a, b) => rungOrder.indexOf(a) - rungOrder.indexOf(b));
    ok(got.length === 6 && got.join(',') === 'xs,sm,md,lg,xl,2xl',
      `[#328] typeScale '${scale}' → COMPLETE 6-rung title ramp, no gap (got ${got.length}: ${got.join(',')})`);
    const sizes = t.typography.composites.filter((c) => c.group === 'title').map((c) => c.sizePx);
    ok(new Set(sizes).size === new Set(t.typography.composites.filter((c) => c.group === 'title').map((c) => c.variant)).size,
      `[#328] typeScale '${scale}' → every title rung has a distinct size`);
  }
}
// C1c (#328): compact + titleFloor 16 is REJECTED, not silently resolved by dropping a rung.
{
  const threwC1 = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
  ok(threwC1(() => tBrand('tf16-compact', { titleFloor: 16, typeScale: 'compact' })),
    '[#328] compact + titleFloor 16 throws (compact already puts a title at 16px; 2xs would duplicate it)');
}
// C2 (#328): the ceiling names a RUNG, so the surviving rung COUNT is invariant under typeScale.
// The old px ceiling was compared against already-shifted sizes, so `96` kept 4 rungs under
// compact/default but only 3 under expressive — a brand lever silently changing the type SET.
{
  const counts = (['compact', 'default', 'expressive'] as const).map((scale) =>
    tBrand('cap-' + scale, { typeScale: scale, displayCeiling: 'xl' }).typography.composites
      .filter((c) => c.group === 'display').reduce((s, c) => s.add(c.variant), new Set<string>()).size);
  ok(new Set(counts).size === 1 && counts[0] === 4,
    `[#328] displayCeiling 'xl' → 4 display rungs under EVERY typeScale (got ${counts.join('/')})`);
  const top = tBrand('cap-top', { displayCeiling: 'xl' }).typography.composites.filter((c) => c.group === 'display');
  ok(!top.some((c) => ['2xl', '3xl'].includes(c.variant)) && top.some((c) => c.variant === 'xl'),
    "[#328] displayCeiling 'xl' → trims from the TOP; xl survives, 2xl/3xl are gone, nothing renumbered");
}
ok(tBrand('eb', {}).typography.composites.find((c) => c.group === 'eyebrow')?.textCase === 'uppercase', 'eyebrow carries uppercase textCase');
// EYEBROW AS A HEADING CATEGORY (#328). Was one SIZELESS rung — the only composite path with no
// size segment. The `lg` rung exists for the hero kicker, and it is what makes the fluid rule do
// anything: with only 12/14 nothing clears the 14px threshold and the rule would be dead code.
{
  const eb = tBrand('eb2', {}).typography.composites.filter((c) => c.group === 'eyebrow');
  const byVariant = new Map(eb.map((c) => [c.variant, c]));
  ok(byVariant.size === 3 && [...byVariant.keys()].sort().join(',') === 'lg,md,sm',
    `[#328] eyebrow ships 3 sized rungs (got ${[...byVariant.keys()].join(',')})`);
  ok(byVariant.get('sm')?.sizePx === 12 && byVariant.get('md')?.sizePx === 14 && byVariant.get('lg')?.sizePx === 20,
    '[#328] eyebrow rungs are sm=12 / md=14 / lg=20');
  ok(eb.every((c) => c.path.split('.').length === 3 && c.path.startsWith('eyebrow.')),
    `[#328] eyebrow paths now carry a size segment — eyebrow.<size>.<weight> (got ${eb[0]?.path})`);
  // The whole point of the threshold: small kickers hold their size, the hero one does not.
  ok(byVariant.get('sm')!.sizeMinPx === 12 && byVariant.get('md')!.sizeMinPx === 14,
    '[#328] eyebrow sm/md are STATIC across breakpoints (at/below the 14px threshold)');
  ok(byVariant.get('lg')!.sizeMinPx === 18,
    `[#328] eyebrow lg is fluid — 20px desktop → 18px mobile, one rung down (got ${byVariant.get('lg')!.sizeMinPx})`);
  // Floor 12: uppercase + wider tracking costs legibility lowercase body text at the same px does not.
  ok(eb.every((c) => c.sizeMinPx >= 12), '[#328] no eyebrow rung shrinks below the 12px floor');
}
// EYEBROW SHIFTS WITH typeScale (#328). A kicker sits directly above a display/title and is read as
// a pair with it — leave it out of the shift and `expressive` grows the title a rung while the
// kicker stays put. The set must stay COMPLETE and strictly increasing under every scale, the same
// contract C1b pins for title: this is where a shifted category silently loses a rung.
{
  const expected: Record<string, number[]> = { compact: [11, 12, 18], default: [12, 14, 20], expressive: [14, 16, 24] };
  for (const scale of ['compact', 'default', 'expressive'] as const) {
    const eb = tBrand('ebts-' + scale, { typeScale: scale }).typography.composites.filter((c) => c.group === 'eyebrow');
    const byV = new Map(eb.map((c) => [c.variant, c.sizePx]));
    const got = ['sm', 'md', 'lg'].map((v) => byV.get(v)!);
    ok(byV.size === 3 && JSON.stringify(got) === JSON.stringify(expected[scale]),
      `[#328] typeScale '${scale}' → eyebrow sm/md/lg = ${expected[scale].join('/')} (got ${got.join('/')}, ${byV.size} rungs)`);
    ok(got.every((v, i) => i === 0 || v > got[i - 1]),
      `[#328] typeScale '${scale}' → eyebrow ramp strictly increasing, no collision-drop`);
  }
  // BRAND-LEVEL per-size overrides. The baseline counterpart of the per-mode map: until now a size
  // could be pinned per MODE but not at the brand level, so a single-mode brand — the common case —
  // could not tune its ramp while a multi-mode one could. The asymmetry ran the wrong way.
  {
    const sz = (g: string, v: string, t: any) => t.typography.composites.find((c: any) => c.group === g && c.variant === v)!.sizePx;
    const thr = (f: () => unknown) => { try { f(); return false; } catch { return true; } };

    // 56, not 26: there is no ladder step between md 24 and xl 32 other than 28, which lg already is.
    const t1 = tBrand('bsz', { sizes: { title: { '2xl': 56 } } } as any);
    ok(sz('title', '2xl', t1) === 56, '[baseline] a per-size override pins the brand ramp (title.2xl → 56)');
    ok(sz('title', 'xl', t1) === 32 && sz('title', 'md', t1) === 24, '[baseline] …and leaves its neighbours alone');
    // Pins are ABSOLUTE, so they do not travel with the scale. That is the whole reason a scale change
    // can collide, and it must fail rather than silently re-shifting the value the author fixed.
    const t2 = tBrand('bsz2', { typeScale: 'expressive', sizes: { title: { '2xl': 56 } } } as any);
    ok(sz('title', '2xl', t2) === 56, '[baseline] a pinned size does NOT move when typeScale changes');
    ok(sz('title', 'xl', t2) === 36, '[baseline] …while unpinned neighbours do shift');
    // Modes stack on the CUSTOMIZED baseline, not the derived one.
    const t3 = brandTheme({ id: 'bsz3', modes: ['light', 'dark'], primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 },
      typography: { sizes: { title: { '2xl': 56 } } }, modeLevers: { dark: { typeSizes: { title: { '2xl': 48 } } } } } as any);
    const c3 = t3.typography.composites.find((c: any) => c.group === 'title' && c.variant === '2xl')!;
    ok(c3.sizePx === 56 && c3.sizeByMode?.dark === 48, '[baseline] a mode overrides on top of the customized baseline');
    // titleFloor decides the rung EXISTS; a size override still governs what it is worth.
    // 2xs sits at 16 with xs at 18 and no ladder step between, so the only legal value IS 16 — this
    // asserts the rung is RECOGNIZED (an unknown rung throws before the value is ever considered).
    ok(!thr(() => tBrand('bsz4', { titleFloor: 16, sizes: { title: { '2xs': 16 } } } as any)),
      '[baseline] the floor-enabled 2xs rung accepts a size override');

    ok(thr(() => tBrand('e1', { sizes: { body: { md: 18 } } } as any)), '[baseline] a per-size override on reading text throws');
    ok(thr(() => tBrand('e2', { sizes: { title: { lg: 27 } } } as any)), '[baseline] a size that is not a ladder step throws');
    ok(thr(() => tBrand('e3', { sizes: { title: { lg: 14 } } } as any)), '[baseline] a size below the group floor throws');
    ok(thr(() => tBrand('e4', { sizes: { title: { '2xl': 32 } } } as any)), '[baseline] a size colliding with an untouched neighbour throws');
    // A no-op override is the #341 failure shape on a new axis: the request is accepted and does
    // nothing, and you only notice when the output is wrong.
    ok(thr(() => tBrand('e5', { displayCeiling: 'xl', sizes: { display: { '3xl': 144 } } } as any)), '[baseline] an override on a rung trimmed by displayCeiling throws rather than no-opping');
    ok(thr(() => tBrand('e6', { sizes: { title: { '2xs': 16 } } } as any)), '[baseline] an override on title.2xs throws when titleFloor omits that rung');
    // The error must blame the pin, not the scale — the old message sent you to typeScale for a
    // collision typeScale did not cause.
    let msg = '';
    try { tBrand('e7', { sizes: { title: { '2xl': 32 } } } as any); } catch (e: any) { msg = e.message; }
    ok(/typography\.sizes\.title\.2xl pins it/.test(msg), '[baseline] the ramp error names the pin, not typeScale');
  }
  // PER-MODE RUNG SIZES (#328, PR C). A mode re-sizes rungs within a mode-invariant SET.
  {
    const pmBase = { id: 'pm', modes: ['light', 'dark'], primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 } } as any;
    const thr = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
    const mk = (typeSizes: any, ty: any = {}) => brandTheme({ ...pmBase, typography: ty, modeLevers: { dark: { typeSizes } } } as any);
    const comp = (t: any, g: string, v: string) => t.typography.composites.find((c: any) => c.group === g && c.variant === v)!;

    // A realistic override shrinks the whole top of the display ramp, not one rung in isolation —
    // my first attempt at this fixture set 3xl=96 alone and the merged-ramp guard rejected it for
    // colliding with an untouched 2xl=128. That is the guard earning its place, on the author of it.
    const t1 = mk({ display: { '2xl': 112, '3xl': 128 }, title: { '2xl': 36 } });
    ok(comp(t1, 'display', '3xl').sizeByMode?.dark === 128, '[#328] per-mode size: dark display.3xl re-points to 128px');
    ok(comp(t1, 'display', '3xl').sizePx === 160, '[#328] per-mode size leaves the light/canonical size untouched');
    // THE ONE THAT SILENTLY BREAKS: a re-sized rung must recompute its OWN mobile endpoint. Inheriting
    // the brand-level sizeMinPx would pair dark's 32px title with 36px — derived from the 40px it
    // replaced — i.e. a "fluid" pair that shrinks UPWARD on mobile.
    ok(comp(t1, 'title', '2xl').sizeMinPx === 36, '[#328] baseline title.2xl (40px) keeps its 36px mobile endpoint');
    ok(comp(t1, 'title', '2xl').sizeMinByMode?.dark === 32, '[#328] a re-sized rung recomputes its OWN mobile endpoint (36px → 32, not the inherited 36)');
    ok(comp(t1, 'title', '2xl').sizeMinByMode!.dark < comp(t1, 'title', '2xl').sizeByMode!.dark, '[#328] the per-mode fluid pair still shrinks downward');
    ok(comp(t1, 'display', '3xl').sizeMinByMode?.dark === 48, '[#328] display.3xl at 128px takes the Carbon 48px mobile endpoint');
    // The SET is mode-invariant — sizes vary, membership never does.
    for (const g of ['display', 'title', 'eyebrow']) {
      const vs = t1.typography.composites.filter((c: any) => c.group === g).map((c: any) => c.variant);
      const bs = brandTheme({ ...pmBase, typography: {} } as any).typography.composites.filter((c: any) => c.group === g).map((c: any) => c.variant);
      ok(JSON.stringify(vs) === JSON.stringify(bs), `[#328] per-mode sizing leaves the ${g} rung SET identical (membership is fixed at brand level)`);
    }
    // Inert declaration ⇒ no entry at all, so an artifact stays byte-identical.
    const inert = mk({ title: { '2xl': 40 } });
    ok(comp(inert, 'title', '2xl').sizeByMode === undefined && inert.typography.typeSizesByMode === undefined,
      '[#328] a per-mode size equal to the brand size is dropped (no mode entry, byte-identical)');
    // Emission: fontSize re-points, and the mode carries its own responsive pair.
    const leaf = (tree: any, path: string) => path.split('.').reduce((o, k) => o?.[k], tree);
    const em = leaf(buildTree(t1).tree, 'prism.type.title.2xl.strong');
    ok(em.$extensions.prism3.modes.dark.$value.fontSize === '{prism.font.size.36}', '[#328] emitted dark $value.fontSize aliases the re-sized ladder step');
    ok(em.$value.fontSize === '{prism.font.size.40}', '[#328] emitted canonical $value.fontSize still aliases the light step');
    ok(em.$extensions.prism3.modes.dark.responsive?.max?.px === 36 && em.$extensions.prism3.modes.dark.responsive?.min?.px === 32,
      '[#328] the emitted per-mode responsive pair is the RECOMPUTED one (32→36), not the inherited 36→40');
    // The fidelity gate DOES reach into `$extensions.prism3.modes.<m>.$value` — hardened in #301 for
    // exactly this shape. What was missing was an assertion USING it: no committed artifact contains a
    // per-mode TYPE composite (the 154 per-brand mode blocks are all color + shadow), so without this
    // the emitted re-point's aliases were only ever checked as strings by the tests above. Pinning the
    // delta as well as `broken` matters — an alias the walker silently skipped would also report zero
    // broken, which is the #281 shape: a gate reporting clean because it never looked.
    const btBase = buildTree(brandTheme({ ...pmBase, typography: {} } as any));
    const btMode = buildTree(t1);
    ok(btMode.stats.broken.length === 0, '[#328] a theme with per-mode sizes has no broken aliases');
    ok(btMode.stats.aliases - btBase.stats.aliases === 15,
      `[#328] per-mode sizes CONTRIBUTE aliases to the gate (+15 = 3 re-sized composites × the 5 alias fields of a per-mode $value, got +${btMode.stats.aliases - btBase.stats.aliases})`);
    // A size re-point and a leading re-point on the same composite compose rather than clobber.
    const both = brandTheme({ ...pmBase, typography: {}, modeLevers: { dark: { typeSizes: { title: { '2xl': 36 } }, lineHeights: { snug: 'relaxed' } } } } as any);
    const bl = leaf(buildTree(both).tree, 'prism.type.title.2xl.strong').$extensions.prism3.modes.dark;
    ok(bl.$value.fontSize === '{prism.font.size.36}' && bl.$value.lineHeight === '{prism.font.line-height.relaxed}',
      '[#328] a per-mode size and a per-mode leading re-point compose on one composite');

    // Validation THROWS — never drops. A silently ignored per-mode request is only visible in one mode.
    ok(thr(() => mk({ body: { md: 18 } })), '[#328] per-mode sizing on body (reading text) throws — rejected, not ignored');
    ok(thr(() => mk({ caption: { md: 12 } })), '[#328] per-mode sizing on caption throws');
    ok(thr(() => mk({ title: { '9xl': 32 } })), '[#328] per-mode sizing on a rung this brand does not ship throws');
    // Rung existence is BRAND-relative, not a fixed list: title.2xs exists only under titleFloor 16.
    // (16 is the only legal value for it — xs sits at 18 and 17 is not a ladder step — so this pair
    // tests recognition: unknown-rung throws BEFORE the inert-drop, so 'no throw' proves it is known.)
    ok(thr(() => mk({ title: { '2xs': 16 } }, {})), '[#328] per-mode sizing on title.2xs throws when titleFloor omits that rung');
    ok(!thr(() => mk({ title: { '2xs': 16 } }, { titleFloor: 16 })), '[#328] …and is recognized when titleFloor 16 ships it');
    ok(thr(() => mk({ title: { '2xl': 33 } })), '[#328] a per-mode size that is not a ladder step throws');
    // The CASCADE, pinned as a real property rather than a surprise: the ladder is dense at the small
    // end, so shrinking a top rung past its neighbour forces you to move the neighbour too. Both of my
    // first two fixture attempts hit this. It is the guard working, but it IS the feature's sharp edge.
    ok(thr(() => mk({ title: { '2xl': 32 } })), "[#328] shrinking title.2xl to 32 alone throws — it collides with the untouched xl (32); the neighbor must move too");
    ok(!thr(() => mk({ title: { xs: 16, sm: 18, md: 20, lg: 24, xl: 28, '2xl': 32 } })), '[#328] …and is accepted once the cascade is carried all the way down the ramp');
    ok(thr(() => mk({ title: { '2xl': 14 } })), '[#328] a per-mode title size below the 16px floor throws');
    ok(thr(() => mk({ display: { sm: 28 } })), '[#328] a per-mode display size below the 32px floor throws');
    ok(thr(() => mk({ eyebrow: { sm: 10 } })), '[#328] a per-mode eyebrow size below the 11px floor throws');
    // The merged-ramp check is the point: colliding with an UNTOUCHED neighbour is the realistic mistake.
    ok(thr(() => mk({ title: { md: 32 } })), '[#328] a per-mode size that collides with an untouched neighbor throws (merged ramp, not overrides alone)');
    ok(thr(() => mk({ title: { xl: 20 } })), '[#328] a per-mode size that inverts the ramp throws');
    ok(!thr(() => mk({ title: { xl: 36 } })), '[#328] a per-mode size that keeps the merged ramp increasing is accepted');
  }
  // #349 review — a module imported for its EXPORTS must not run its CLI as a side effect. `regen.ts`
  // shipped its dispatch unguarded at top level, so `import { SCHEMA_ARTIFACTS } from './regen'` ran a
  // full regenerate(): the linter silently rewrote every committed artifact, discarding local edits,
  // and would have reported a regeneration stack trace as a spelling failure. Pinned at the source
  // level because the behavioral proof needs process isolation — the tamper test (append a marker to a
  // committed artifact, run only the linter, confirm it survives) is the runtime check, and it can't
  // live in-process here. `materialise-to-figma.ts` already carried this guard for `test.ts`'s own
  // import of `aliasRows`; regen was the one module that never got it.
  {
    const src = readFileSync(new URL('./regen.ts', import.meta.url), 'utf8');
    const guard = src.indexOf('resolve(process.argv[1]) === fileURLToPath(import.meta.url)');
    const dispatch = src.indexOf("process.argv.includes('--check')");
    ok(guard !== -1 && dispatch > guard,
      '[#349] regen.ts guards its CLI dispatch behind an entry-point check — importing it for the ARTIFACTS constants must not regenerate');
  }
  // Reading/UI text is the boundary the preset exists to respect — it must NOT move.
  for (const scale of ['compact', 'expressive'] as const) {
    const t = tBrand('ebfix-' + scale, { typeScale: scale }).typography.composites;
    const base = tBrand('ebfix-base', {}).typography.composites;
    const key = (c: any) => `${c.group}.${c.variant}`;
    const baseSize = new Map(base.map((c) => [key(c), c.sizePx]));
    const moved = t.filter((c) => ['body', 'label', 'caption', 'code'].includes(c.group) && baseSize.get(key(c)) !== c.sizePx);
    ok(moved.length === 0, `[#328] typeScale '${scale}' leaves body/label/caption/code untouched (moved: ${moved.map(key).join(',') || 'none'})`);
  }
}

// ---- weight axis + link modifier ----
{
  const d = tBrand('w', {}).typography.composites;
  const at = (path: string) => d.find((c) => c.path === path);
  // default body weights: default + strong (2), each with a -link sibling
  ok(at('body.md.default') && at('body.md.strong'), 'body ships default + strong weights by default');
  ok(at('body.md.default-link')?.link === true && at('body.md.strong-link')?.link === true, 'body has a -link variant per weight (link=true)');
  ok(!at('body.md.emphasis'), 'body emphasis is opt-in (not default)');
  // caption: 2 sizes (md=11, lg=12), 2 weights, + link
  ok(at('caption.md.default')?.sizePx === 11 && at('caption.lg.default')?.sizePx === 12, 'caption has md=11 + lg=12 sizes');
  ok(at('caption.lg.strong-link')?.link === true, 'caption gets link variants');
  // single-weight roles still carry the weight in the name (consistency)
  ok(at('display.lg.strong') && at('title.md.strong'), 'single-weight roles carry the weight in the name');
  ok(!d.some((c) => c.group === 'display' && c.link), 'display has no link variants (not a link role)');
  // weights lever: add emphasis to body, multi-weight display
  const lev = tBrand('wl', { weights: { body: ['default', 'emphasis', 'strong'], display: ['default', 'strong'] }, links: ['body'] }).typography.composites;
  ok(lev.some((c) => c.path === 'body.md.emphasis'), 'weights lever → body gains emphasis');
  ok(lev.some((c) => c.path === 'display.lg.default') && lev.some((c) => c.path === 'display.lg.strong'), 'weights lever → multi-weight display ramp');
  ok(!lev.some((c) => c.group === 'caption' && c.link), 'links lever → caption link variants removed when not listed');
}

// ---- weight-role set: extensible + `max` (105.1) ----
{
  const roles = tBrand('wr-max', {}).typography.weightRoles;
  // `max` is a canonical role, always emitted (defined-but-unused, like `subtle`),
  // defaulting to 900 — a black/display hero weight slot brands bind to.
  ok(roles.map((r) => r.role).join('/') === 'subtle/default/emphasis/strong/max', 'canonical weight-role order is subtle→default→emphasis→strong→max');
  ok(roles.find((r) => r.role === 'max')?.value === 900, 'max defaults to 900');
  // remappable like any role
  ok(tBrand('wr-remap', { weightRoles: { max: 950 } }).typography.weightRoles.find((r) => r.role === 'max')?.value === 950, 'max is remappable via weightRoles');
  // default output ships NO category at max (lean); the primitive still exists.
  ok(!tBrand('wr-lean', {}).typography.composites.some((c) => c.weightRole === 'max'), 'no default category ships max (default output stays lean)');
  // but a brand can put max on a role — a black display hero ramp
  const heroed = tBrand('wr-hero', { weights: { display: ['strong', 'max'] } }).typography.composites;
  ok(heroed.some((c) => c.group === 'display' && c.weightRole === 'max'), 'display can ship a max-weight composite when requested');
}

// ---- italic axis: weight-paired modifier, opt-in per role (105.2) ----
{
  // default output ships NO italics — goldens byte-identical (like max).
  ok(!tBrand('it-none', {}).typography.composites.some((c) => c.italic), 'no italic composites by default (italics opt-in)');
  ok(!tBrand('it-none', {}).typography.composites.some((c) => c.path.includes('-italic')), 'no `-italic` in any path by default');

  const it = tBrand('it', { italics: ['body'], links: ['body'] }).typography.composites;
  const at = (path: string) => it.find((c) => c.path === path);
  // italic is a per-weight sibling: body ships default+strong → each gains an italic sibling.
  ok(at('body.md.default-italic')?.italic === true && at('body.md.strong-italic')?.italic === true, 'italics lever → an -italic sibling per weight');
  // italic × link are orthogonal — a role that ships both gets the full cross.
  ok(at('body.md.default-italic-link')?.italic === true && at('body.md.default-italic-link')?.link === true, 'italic × link cross → default-italic-link (both true)');
  ok(!!at('body.md.default') && !!at('body.md.default-link') && !!at('body.md.strong-italic-link'), 'all four modifier combos present when a role ships both axes');
  // the bare weight stays non-italic; italic never leaks into unlisted roles.
  ok(at('body.md.default')?.italic === false, 'the bare weight is not italic');
  ok(!it.some((c) => c.group === 'display' && c.italic), 'italics do not leak into unlisted roles (display stays roman)');
  // the composite emits fontStyle:italic on $value; the Figma text style names the italic instance.
  const { tree } = buildTree(tBrand('it2', { italics: ['body'] }));
  const root = Object.keys(tree)[0];
  ok((tree[root] as any).type.body.md['default-italic'].$value.fontStyle === 'italic', 'italic composite carries fontStyle:italic on $value');
  ok((tree[root] as any).type.body.md.default.$value.fontStyle === undefined, 'roman composite omits fontStyle');
  ok(fontStyleName('text', 700, true) === 'Bold Italic' && fontStyleName('text', 400, true) === 'Italic', 'Figma style name: 700→Bold Italic, 400→Italic (not Regular Italic)');
}

// ---- font families: typeface PRIMITIVES + family-ROLE semantics (#269) ----
// Two tiers, mirroring colour: the primitive is named after the face (`typeface.inter`)
// and carries the fallback stack; the role is named after the job (`family.text`) and
// aliases it. The role is the brand-invariant handle a consumer binds to.
{
  const t = tBrand('fam', { families: { display: 'Poppins', text: 'Inter', mono: 'Fira Code' } });
  const { tree } = buildTree(t);
  const root = Object.keys(tree)[0];
  const fam = (tree[root] as any).font.family;
  const tf = (tree[root] as any).font.typeface;

  // tier 1 — a primitive per distinct face, slugged from its own name.
  ok(!!tf.poppins && !!tf.inter && !!tf['fira-code'], 'a typeface primitive is emitted per face, slugged from the face name');
  ok(tf.inter.$value === 'Inter' && typeof tf.inter.$value === 'string', 'typeface $value is the single primary face (string), not an array');
  const fb = tf.inter.$extensions.prism3.fallbackStack;
  ok(Array.isArray(fb) && fb.length > 0 && !fb.includes('Inter'), 'the fallback tail lives on the TYPEFACE, primary excluded');

  // tier 2 — roles alias the primitives; no role carries a literal face any more.
  ok(fam.text.$value === `{${root}.font.typeface.inter}`, 'family role aliases its typeface primitive');
  ok(fam.display.$value === `{${root}.font.typeface.poppins}`, 'each role aliases the face it binds');
  ok(fam.text.$extensions.prism3.aliasOf === `${root}.font.typeface.inter`, 'the role records aliasOf, like every other semantic');

  // the invariant that matters downstream: resolution is unchanged.
  const full = familyOf(tree, fam.text);
  ok(full.startsWith('Inter, ') && full === ['Inter', ...fb].join(', '), 'familyOf follows the alias and reassembles [primary, ...fallbackStack]');

  // two roles on ONE face share a single primitive (variable ORs across them).
  const shared = buildTree(tBrand('shared', { families: { display: 'Inter', text: 'Inter' } })).tree;
  const sroot = Object.keys(shared)[0];
  const stf = (shared[sroot] as any).font.typeface;
  ok(Object.keys(stf).filter((k) => k === 'inter').length === 1 && (shared[sroot] as any).font.family.display.$value === (shared[sroot] as any).font.family.text.$value,
    'two roles bound to the same face share one typeface primitive');

  // Figma family variable: value = primary, description still leads with the FULL stack.
  const figFam = buildFigmaFont(t)[0].variables.filter((v) => v.name.startsWith('font/family/'));
  const textVar = figFam.find((v) => v.name === 'font/family/text')!;
  ok(textVar.value === 'Inter', 'Figma family variable binds the primary face as value');
  ok(textVar.description.startsWith('stack: Inter, '), 'Figma family description still leads with the full reassembled stack (fix #4 preserved)');
}

// ---- the authored typeface library (#287) ----
// A face used to exist only if a role bound it. The library lets a brand stage a face first and
// decide its job later, so `deriveTypefaces` is now a UNION of role-bound faces and authored ones.
{
  const bare = tBrand('lib-none', { families: { text: 'Inter' } });
  const staged = tBrand('lib-one', { families: { text: 'Inter' }, typefaceLibrary: ['Fraunces'] });
  ok(!bare.typography.typefaces.some((t: any) => t.slug === 'fraunces'), 'no library ⇒ no staged primitive');
  ok(staged.typography.typefaces.some((t: any) => t.slug === 'fraunces'), 'a library face with NO role bound still emits its typeface primitive');
  ok(!staged.typography.families.some((f: any) => f.stack[0] === 'Fraunces'), 'a staged face binds no family role — staging is not binding');
  ok(buildTree(staged).tree[Object.keys(buildTree(staged).tree)[0]] !== undefined, 'a brand with a staged face still builds a tree');
  const stagedRoot = Object.keys(buildTree(staged).tree)[0];
  ok(!!(buildTree(staged).tree[stagedRoot] as any).font.typeface.fraunces, 'the staged face reaches the emitted tree as font.typeface.fraunces');
  ok(!(buildTree(staged).tree[stagedRoot] as any).font.family.fraunces, 'a staged face emits NO family role leaf (nothing binds it)');

  // Existing brands must be untouched: same list, same ORDER, which is why the library appends last.
  ok(JSON.stringify(bare.typography.typefaces) === JSON.stringify(tBrand('lib-none2', { families: { text: 'Inter' }, typefaceLibrary: [] }).typography.typefaces),
    'an empty library derives a byte-identical typeface list (feature is additive)');

  // Staged THEN bound is one primitive, not two — and the ROLE's stack wins the dedupe, which is the
  // reason role sets are walked before the library rather than after.
  const bound = tBrand('lib-bound', { families: { text: 'Inter', mono: 'Fira Code' }, typefaceLibrary: ['Fira Code'] });
  const fira = bound.typography.typefaces.filter((t: any) => t.slug === 'fira-code');
  ok(fira.length === 1, `a face both staged and bound yields ONE primitive (got ${fira.length})`);
  ok(fira[0].stack[fira[0].stack.length - 1] === 'monospace', 'the bound role’s stack wins the dedupe — a staged+bound mono face keeps its MONO fallback tail');
  const stagedOnlyMono = tBrand('lib-mono-unbound', { families: { text: 'Inter' }, typefaceLibrary: ['Fira Code'] });
  const unboundFira = stagedOnlyMono.typography.typefaces.find((t: any) => t.slug === 'fira-code');
  ok(unboundFira.stack[unboundFira.stack.length - 1] !== 'monospace', 'an UNBOUND face has no role to take a tail from, so it gets the sans one — self-corrects on binding');

  // Removal semantics (owner decision, 2026-08-01: only UNBOUND entries are deletable). The engine
  // needs no cascade for this, and that absence is the thing worth asserting: dropping a still-bound
  // name from the library cannot make its primitive disappear, because the role keeps deriving it.
  const droppedWhileBound = tBrand('lib-drop-bound', { families: { text: 'Inter', mono: 'Fira Code' }, typefaceLibrary: [] });
  ok(droppedWhileBound.typography.typefaces.some((t: any) => t.slug === 'fira-code'),
    'removing a still-BOUND face from the library does NOT drop its primitive — no cascade needed (#287)');
  ok(!tBrand('lib-drop-unbound', { families: { text: 'Inter' }, typefaceLibrary: [] }).typography.typefaces.some((t: any) => t.slug === 'fraunces'),
    'removing an UNBOUND face from the library drops its primitive cleanly');

  // Typo guards — an empty entry would emit an empty slug; two spellings would silently swallow one.
  const rejects = (lib: any, label: string) => {
    let threw = false;
    try { tBrand('lib-bad', { families: { text: 'Inter' }, typefaceLibrary: lib }); } catch { threw = true; }
    ok(threw, label);
  };
  rejects([''], 'an empty typefaceLibrary entry throws');
  rejects(['   '], 'a whitespace-only typefaceLibrary entry throws');
  rejects(['Fraunces', 'fraunces'], 'the same face listed twice (differing only in case) throws');
  let variantThrew = false;
  try { tBrand('lib-ok', { families: { text: 'Inter' }, typefaceLibrary: ['Fraunces', 'Fira Code'] }); } catch { variantThrew = true; }
  ok(!variantThrew, 'two DISTINCT faces in the library are accepted');
}

// ---- mono is optional (#269) ----
// Most brands have no mono face. `mono: null` opts out, and `code` is the only category
// binding mono, so it disappears with it.
{
  const withMono = tBrand('mono-on', { families: { text: 'Inter' } });
  const noMono = tBrand('mono-off', { families: { text: 'Inter', mono: null } });
  ok(withMono.typography.families.some((f: any) => f.role === 'mono'), 'omitted mono keeps the default face (existing brands unaffected)');
  ok(!noMono.typography.families.some((f: any) => f.role === 'mono'), 'mono: null drops the mono family role');
  ok(withMono.typography.composites.some((c: any) => c.group === 'code'), 'a brand with mono ships the code category');
  ok(!noMono.typography.composites.some((c: any) => c.group === 'code'), 'a brand without mono ships NO code category');
  ok(!noMono.typography.typefaces.some((t: any) => t.slug === 'jetbrains-mono'), 'no mono role ⇒ no orphan mono typeface primitive');
  const noMonoTree = buildTree(noMono).tree;
  const nmRoot = Object.keys(noMonoTree)[0];
  ok(!(noMonoTree[nmRoot] as any).font.family.mono, 'no mono role emits no font.family.mono leaf');
  ok(!(noMonoTree[nmRoot] as any).type?.code, 'no mono role emits no type.code composites');
}

// ------------------------------------------------- shadow / elevation invariants
{
  const shBrand = (id: string, shadow: any) => brandTheme({ id, primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 }, shadow });
  const sh = shBrand('sh', undefined).shadow;
  ok(sh.steps.length === 6, `shadow ramp is 6 steps (got ${sh.steps.length})`);
  ok(!!sh.inset, 'shadow ramp has an inset step');
  ok(sh.steps.every((s) => s.light.length === 2 && s.dark.length === 2), 'every shadow step is 2-layer (key+ambient), light+dark');
  ok(sh.steps.every((s) => [...s.light, ...s.dark].every((l) => l.offsetX === 0)), 'all shadow layers have offsetX 0 (light from above)');
  // monotonic ambient offsetY/blur across steps (elevation grows)
  let mono = true;
  for (let i = 1; i < sh.steps.length; i++) { const a = sh.steps[i].light[1], b = sh.steps[i - 1].light[1]; if (a.offsetY < b.offsetY || a.blur < b.blur) mono = false; }
  ok(mono, 'shadow ambient layer offsetY + blur grow monotonically with elevation');
  // dark is REDUCED vs light (lift-primary), never heavier
  ok(sh.steps.every((s) => s.light.every((l, j) => s.dark[j].alpha <= l.alpha)), 'dark shadow alpha ≤ light (reduced, lift-primary — not NB-heavier)');
  // softness scales blur
  const soft = shBrand('sh-soft', { softness: 2 }).shadow;
  ok(soft.steps[3].light[1].blur > sh.steps[3].light[1].blur, 'higher softness → larger blur');
  // tint amount 0 → pure black base
  const black = shBrand('sh-blk', { tint: { amount: 0 } }).shadow;
  ok(black.colorRgb.r === 0 && black.colorRgb.g === 0 && black.colorRgb.b === 0, 'tint amount 0 → pure-black shadow base');
  // tinted base is non-black
  const tinted = shBrand('sh-tint', { tint: { hue: 285, amount: 0.6 } }).shadow;
  ok(tinted.colorRgb.r + tinted.colorRgb.g + tinted.colorRgb.b > 0, 'tinted shadow base is not pure black');
}

// ------------------------------------------------- layout / breakpoint invariants
{
  const lyBrand = (id: string, layout: any) => brandTheme({ id, primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 }, layout });
  const d = lyBrand('ly', undefined).layout;
  ok(d.breakpoints.length === 5, `default layout is 5 breakpoints (got ${d.breakpoints.length})`);
  ok(d.breakpoints[0].px === 0, 'breakpoints start at 0 (mobile-first)');
  let asc = true;
  for (let i = 1; i < d.breakpoints.length; i++) if (d.breakpoints[i].px <= d.breakpoints[i - 1].px) asc = false;
  ok(asc, 'breakpoint floors strictly ascending');
  ok(d.breakpoints.map((b) => b.name).join(',') === 'sm,md,lg,xl,2xl', '5-tier names are sm/md/lg/xl/2xl');
  // column ladder: starts at ≤4, never exceeds base, top reaches base, monotonic
  ok(d.grid[0].columns <= 4 && d.grid[d.grid.length - 1].columns === d.baseColumns, 'column ladder: small ≤4, top = base');
  ok(d.grid.every((g) => g.columns <= d.baseColumns), 'no breakpoint exceeds the base column count');
  let cmono = true; for (let i = 1; i < d.grid.length; i++) if (d.grid[i].columns < d.grid[i - 1].columns) cmono = false;
  ok(cmono, 'column ladder is non-decreasing');
  // gutter/margin grow (shallow) and stay on the spacing scale (multiples of 8 or 4)
  ok(d.grid.every((g) => g.gutterPx % 4 === 0 && g.marginPx % 4 === 0), 'gutter/margin land on the 4px grid (spacing-scale aliases)');
  ok(d.grid[d.grid.length - 1].gutterPx >= d.grid[0].gutterPx, 'gutter grows toward the top breakpoint');
  // 6-tier prepends xs (Bootstrap convention)
  const six = lyBrand('ly6', { breakpoints: [0, 480, 768, 1024, 1440, 1920] }).layout;
  ok(six.breakpoints[0].name === 'xs' && six.breakpoints.map((b) => b.name).join(',') === 'xs,sm,md,lg,xl,2xl', '6-tier names prepend xs');
  // base column lever
  ok(lyBrand('ly16', { columns: 16 }).layout.grid.some((g) => g.columns === 16), 'columns lever → base 16 reachable');
  // 2-tier (NB-style minimal): smallest 4, top = base
  const two = lyBrand('ly2', { breakpoints: [0, 1024] }).layout;
  ok(two.grid[0].columns === 4 && two.grid[1].columns === two.baseColumns, '2-tier ladder = [4, base]');
}

// ------------------------------------------------- gradient invariants (opt-in)
{
  const grBrand = (id: string, gradients: any) => brandTheme({ id, primary: { l: 0.5, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 }, brandColors: [{ name: 'accent', oklch: { l: 0.55, c: 0.15, h: 235 } }], gradients });
  // OFF by default: no opt-in → no gradients (the field-common default).
  ok(grBrand('gr-off', undefined).gradient.gradients.length === 0, 'gradients OFF by default (no opt-in → none)');
  // `true` → exactly one default brand gradient (primary.600→primary.350, linear).
  const def = grBrand('gr-true', true).gradient.gradients;
  ok(def.length === 1 && def[0].name === 'brand' && def[0].kind === 'linear', '`gradients: true` ships one default linear brand gradient');
  ok(def[0].stops.length === 2 && def[0].stops[0].aliasOf === 'prism.palette.primary.600' && def[0].stops[1].aliasOf === 'prism.palette.primary.350', 'default gradient stops alias primary.600 → primary.350');
  // explicit array: linear + radial, cross-palette, stop colours alias the ramp.
  const ex = grBrand('gr-ex', [
    { name: 'brand', kind: 'linear', angle: 135, stops: [{ palette: 'primary', step: 600, position: 0 }, { palette: 'accent', step: 500, position: 1 }] },
    { name: 'glow', kind: 'radial', center: [0.5, 0.4], shape: 'circle', stops: [{ palette: 'accent', step: 400, position: 0 }, { palette: 'accent', step: 700, position: 1 }] },
  ]).gradient.gradients;
  ok(ex.length === 2 && ex[0].kind === 'linear' && ex[1].kind === 'radial', 'explicit array → both linear + radial kinds');
  ok(ex.every((g) => g.stops.every((s) => s.aliasOf.startsWith('prism.palette.'))), 'every gradient stop aliases the colour ramp (never raw hex)');
  // stops sorted ascending by position; positions in [0,1].
  ok(ex.every((g) => g.stops.every((s, i) => i === 0 || s.position >= g.stops[i - 1].position)), 'stops are ordered ascending by position');
  ok(ex.every((g) => g.stops.every((s) => s.position >= 0 && s.position <= 1)), 'stop positions are within [0,1]');
  // OKLCH pre-sampling for Figma: N≥2 sRGB stops, endpoints hex, p 0→1.
  ok(ex.every((g) => g.sampled.length >= 2 && g.sampled[0].position === 0 && g.sampled[g.sampled.length - 1].position === 1), 'sampled sRGB stops span positions 0→1');
  ok(ex.every((g) => g.sampled.every((s) => /^#[0-9a-f]{6}$/.test(s.hex))), 'sampled stops are 6-digit hex (baked sRGB for Figma)');
  // OKLCH midpoint is more chromatic than the naive sRGB midpoint (no grey dead zone).
  const oklchG = grBrand('gr-ok', [{ name: 'g', kind: 'linear', samples: 3, interpolation: 'oklch', stops: [{ palette: 'primary', step: 600, position: 0 }, { palette: 'accent', step: 500, position: 1 }] }]).gradient.gradients[0];
  const srgbG = grBrand('gr-sr', [{ name: 'g', kind: 'linear', samples: 3, interpolation: 'srgb', stops: [{ palette: 'primary', step: 600, position: 0 }, { palette: 'accent', step: 500, position: 1 }] }]).gradient.gradients[0];
  const chroma = (hexStr: string) => { const r = parseInt(hexStr.slice(1, 3), 16), g = parseInt(hexStr.slice(3, 5), 16), b = parseInt(hexStr.slice(5, 7), 16); return Math.max(r, g, b) - Math.min(r, g, b); };
  ok(chroma(oklchG.sampled[1].hex) >= chroma(srgbG.sampled[1].hex), 'OKLCH midpoint is no less chromatic than the sRGB midpoint (avoids the grey dead zone)');
  // worst-case-stop contrast is computed and is the MIN across sampled stops.
  ok(ex.every((g) => g.worstOnWhite > 0 && g.worstOnBlack > 0), 'worst-case-stop contrast computed for both white and black text');
  // invalid stop reference throws a clear error.
  let threw = false;
  try { grBrand('gr-bad', [{ name: 'x', stops: [{ palette: 'nope', step: 600, position: 0 }, { palette: 'primary', step: 600, position: 1 }] }]); } catch { threw = true; }
  ok(threw, 'gradient referencing an undefined palette throws');
  // L-06: a gradient name becomes a token path segment, so it needs the same slug charset
  // palette names enforce (CR-03) and must be unique among gradients.
  const goodStops = [{ palette: 'primary', step: 600, position: 0 }, { palette: 'accent', step: 500, position: 1 }];
  let badName = false;
  try { grBrand('gr-dot', [{ name: 'brand.fade', stops: goodStops }]); } catch { badName = true; }
  ok(badName, "L-06: a dotted gradient name ('brand.fade') throws (would break the {a.b.c} alias convention)");
  let dupGrad = false;
  try { grBrand('gr-dup', [{ name: 'fade', stops: goodStops }, { name: 'fade', stops: goodStops }]); } catch { dupGrad = true; }
  ok(dupGrad, 'L-06: two gradients named the same throw (duplicate gradient name)');
  ok(grBrand('gr-ok-name', [{ name: 'brand-fade', stops: goodStops }]).gradient.gradients.length === 1, 'L-06: a valid slug gradient name still builds');
  // NB ships no gradients.
  ok(nbTheme().gradient.gradients.length === 0, 'NB ships no gradients (it had none)');
}

// L-07: a brand-SUPPLIED status override seeds a vivid, UNANCHORED ramp from its hue+chroma
// (not pinned at its measured lightness) — say so in the decisions log so a measured swatch
// isn't wrongly implied to round-trip. The engine-default branch note is unchanged.
{
  const withOverride = brandTheme({ id: 'st', primary: { l: 0.5, c: 0.12, h: 200 }, neutral: { hue: 200, chroma: 0.01 }, status: { success: { l: 0.5, c: 0.15, h: 150, chroma: 0.15 } } });
  ok(withOverride.notes.some((n) => n.startsWith('success: brand-supplied hue 150') && n.includes('not pinned at its measured lightness')), 'L-07: a brand-supplied status note flags that the ramp is unanchored (measured swatch may not appear verbatim)');
  const noOverride = brandTheme({ id: 'st2', primary: { l: 0.5, c: 0.12, h: 200 }, neutral: { hue: 200, chroma: 0.01 } });
  ok(noOverride.notes.some((n) => n === 'success: engine default hue 145'), 'L-07: the engine-default status note is unchanged (byte-identical for brands without overrides)');
}

// ------------------------------------------- surface/content model invariants
{
  const th = brandTheme({ id: 'sm', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 } });
  const modes = resolveAllModes(th);
  const byMode = Object.fromEntries(modes.map((m) => [m.mode, m.roles] as const));
  const L = byMode['light'], D = byMode['dark'], HCD = byMode['hc-dark'];
  const p = (roles: any, k: string) => roles[k]?.path;
  // tonal ladders — the all-white-light complaint is fixed; dark lifts too
  ok(p(L, 'background.primary') !== p(L, 'background.secondary'), 'light background tiers are tonal (primary != secondary)');
  ok(p(L, 'foreground.primary') !== p(L, 'foreground.secondary'), 'light foreground tiers are tonal');
  ok(p(D, 'background.primary') !== p(D, 'background.secondary'), 'dark background tiers are tonal (lift)');
  // the relationship rule: a foreground surface differs from the page under it
  ok(p(L, 'foreground.primary') !== p(L, 'background.primary'), 'foreground.primary differs from background.primary');
  // inverse ladders on both layers
  ok(p(L, 'background.inverse.primary') && p(L, 'foreground.inverse.primary'), 'inverse ladders present on both layers');
  // legacy interactive fills gone (action.* retired task #14; foreground.interactive earlier)
  ok(p(L, 'action.default') === undefined, 'legacy action.* removed (components bind interactive.*)');
  ok(L['foreground.interactive.default'] === undefined, 'legacy foreground.interactive removed');
  // elevation colour group + dropped surfaces gone
  ok(!Object.keys(L).some((k) => k.startsWith('elevation')), 'no elevation.* colour group');
  ok(L['background.subtle'] === undefined && L['background.sunken'] === undefined && L['background.quaternary'] === undefined, 'background.subtle/sunken/quaternary removed');
  // renames
  ok(L['text.on-inverse'] !== undefined && L['text.on-emphasis'] === undefined, 'text.on-emphasis → on-inverse');
  ok(L['text.link.default'] !== undefined && L['text.interactive.default'] === undefined, 'links use text.link.*');
  // subtle semantic foreground + ink present (suffix form)
  ok(L['foreground.danger-subtle'] !== undefined && L['text.danger-subtle'] !== undefined, 'subtle semantic foreground + ink present');
  // HC carries elevation by border: raised tiers collapse to the base
  ok(p(HCD, 'background.secondary') === p(HCD, 'background.primary'), 'HC flattens background tiers to the base');
  ok(p(HCD, 'foreground.secondary') === p(HCD, 'foreground.primary'), 'HC flattens foreground tiers to the base');
  // harshness: no pure black anywhere in STANDARD modes; inverse surfaces softened
  const HCL = byMode['hc-light'];
  const isBlack = (path?: string) => /\.black$/.test(path ?? '');
  const isWhite = (path?: string) => /\.white$/.test(path ?? '');
  for (const m of ['light', 'dark'] as const) {
    const roles = byMode[m];
    const blacks = Object.entries(roles).filter(([, r]: any) => isBlack(r.path)).map(([k]) => k);
    ok(blacks.length === 0, `${m}: no pure black in standard mode (found: ${blacks.join(', ') || 'none'})`);
  }
  ok(!isBlack(p(L, 'background.inverse.primary')), 'light inverse surface is near-black, not pure black');
  ok(!isWhite(p(D, 'background.inverse.primary')), 'dark inverse surface is near-white, not pure white');
  ok(isWhite(p(L, 'background.primary')), 'light base page stays pure white (the one allowed pure extreme)');
  // on-fill softening: dark interactive on-fill is near-black (950), light keeps pure white; HC keeps pure
  ok(!isBlack(p(D, 'interactive.primary.on-fill')), 'dark interactive on-fill is softened (near-black, not pure)');
  ok(isWhite(p(L, 'interactive.primary.on-fill')), 'light interactive on-fill stays pure white (user preference)');
  ok(isWhite(p(HCD, 'interactive.primary.on-fill')) || isBlack(p(HCD, 'interactive.primary.on-fill')), 'HC keeps pure extremes for on-fill (max contrast)');
  ok(isBlack(p(HCL, 'background.inverse.primary')), 'HC inverse stays a pure extreme (max contrast)');
  // (the ink on a disabled fill is the cross-cutting disabled.on-fill — tested in the DISABLED block above.)
}

// -------------------------------------------------- design.md + CLI adapter
// The authoring front door (docs/07 §6): the YAML-subset parser, then the two
// example briefs as regressions on the CLI path — Aurora (faithfulness: byte-
// exact vs the committed golden) and Harbor (coverage: net-new, behavioural).

// (1) YAML-subset parser — every shape BrandInput actually uses.
{
  const y = parseYamlSubset([
    'id: demo',
    'primary: { l: 0.5, c: 0.18, h: 285 }',
    'flag: true',
    'count: 3',
    'name: "3:1"',
    'list: [0, 480, 768]',
    'brandColors:',
    '  - name: accent',
    '    oklch: { l: 0.55, c: 0.15, h: 235 }',
    'nested:',
    '  a: 1',
    '  b: two words',
  ].join('\n')) as any;
  ok(y.id === 'demo' && typeof y.id === 'string', 'parser: bare string scalar');
  ok(y.primary && y.primary.l === 0.5 && y.primary.h === 285, 'parser: flow map of numbers');
  ok(y.flag === true && typeof y.flag === 'boolean', 'parser: boolean scalar');
  ok(y.count === 3 && typeof y.count === 'number', 'parser: number scalar');
  ok(y.name === '3:1', 'parser: quoted string keeps its colon (3:1)');
  ok(Array.isArray(y.list) && y.list.length === 3 && y.list[1] === 480, 'parser: flow sequence of numbers');
  ok(Array.isArray(y.brandColors) && y.brandColors.length === 1 && y.brandColors[0].name === 'accent' && y.brandColors[0].oklch.h === 235,
    'parser: block sequence of maps + nested flow map');
  ok(y.nested && y.nested.a === 1 && y.nested.b === 'two words', 'parser: nested block map + multi-word bare string');

  // CR-05: a misindented line (or a stray no-colon/prose line) used to end the block loop
  // early and SILENTLY drop that line + everything after it. Now every line must be consumed
  // or the parser throws with the offending line number — a designer's lever can't vanish.
  const threwOn = (s: string) => { try { parseYamlSubset(s); return false; } catch { return true; } };
  ok(threwOn('id: x\nneutral:\n  hue: 200\n   chroma: 0.01\nradiusScale: 1'), 'CR-05: a key over-indented by one space throws (not silently dropped with the rest)');
  ok(threwOn('id: x\nstray prose line\nneutral:\n  hue: 200'), 'CR-05: a stray no-colon line inside frontmatter throws (does not truncate the rest)');
  ok(!threwOn('id: x\nneutral:\n  hue: 200\n  chroma: 0.01\nradiusScale: 1'), 'CR-05: correctly-indented equivalent still parses clean');
  // the error names the offending source line (actionable)
  let msg = '';
  try { parseYamlSubset('id: x\nneutral:\n  hue: 200\n   chroma: 0.01'); } catch (e) { msg = (e as Error).message; }
  ok(/line 4/.test(msg) && /chroma/.test(msg), 'CR-05: the error points at the offending line (number + content)');
  // L-08: a duplicate key at the same level silently last-wins in object assignment — now it
  // throws (a pasted-twice `id:`/`primary:` block can't quietly lose one).
  ok(threwOn('id: a\nid: b'), 'L-08: a duplicate top-level key throws (no silent last-win)');
  ok(threwOn('neutral:\n  hue: 200\n  hue: 300'), 'L-08: a duplicate nested key throws');
  ok(!threwOn('id: a\nneutral:\n  hue: 200'), 'L-08: distinct keys at the same level still parse clean');
}
// (2) parseDesignMd — frontmatter/prose split; a missing fence is an error.
{
  const { input, prose } = parseDesignMd('---\nid: x\nprimary: { l: 0.5, c: 0.1, h: 200 }\n---\n\n# Title\n\nBody prose.\n');
  ok((input as any).id === 'x' && (input as any).primary.h === 200, 'parseDesignMd: frontmatter → BrandInput');
  ok(prose.includes('Body prose.') && !prose.includes('id: x'), 'parseDesignMd: prose separated from frontmatter');
  let threw = false;
  try { parseDesignMd('no fence here\nid: x\n'); } catch { threw = true; }
  ok(threw, 'parseDesignMd: missing frontmatter fence throws');
  // L-08: the closing fence is an EXACT `---` line, not any line that starts with `---`. A
  // frontmatter line like `name: --- x ---` (or a `----` rule in prose) must not close early.
  const fenced = parseDesignMd('---\nid: x\nname: "--- not a fence ---"\nprimary: { l: 0.5, c: 0.1, h: 200 }\n---\n\nBody.\n');
  ok((fenced.input as any).name === '--- not a fence ---' && (fenced.input as any).primary.h === 200, 'L-08: a `---`-containing VALUE inside frontmatter does not close the fence early (whole block parsed)');
  ok(fenced.prose === 'Body.', 'L-08: prose still starts after the real (exact-`---`) closing fence');
}
// (3) FAITHFULNESS — aurora.design.md compiles to the committed golden, byte-for-byte.
{
  const { input } = parseDesignMd(readFileSync(resolve(HERE, '../examples/aurora.design.md'), 'utf8'));
  ok(validateBrandInput(input).length === 0, 'aurora.design.md: schema-conforms');
  const generated = JSON.stringify(buildTree(brandTheme(input)).tree, null, 2) + '\n';
  const committed = readFileSync(resolve(HERE, 'out/aurora.tokens.json'), 'utf8');
  ok(generated === committed, 'aurora.design.md → byte-identical to out/aurora.tokens.json (CLI path ≡ hardcoded path)');
}
// (4) COVERAGE — harbor.design.md (net-new, no golden): conforms, resolves, all contracts hold.
{
  const { input } = parseDesignMd(readFileSync(resolve(HERE, '../examples/harbor.design.md'), 'utf8'));
  ok(validateBrandInput(input).length === 0, 'harbor.design.md: schema-conforms');
  const theme = brandTheme(input);
  const modes = resolveAllModes(theme);
  const broken = modes.flatMap((m) => Object.entries(m.roles).filter(([, r]) => r.min > 0 && r.ratio < r.min).map(([k]) => `${m.mode}.${k}`));
  ok(broken.length === 0, 'harbor: all mode contrast contracts hold' + (broken.length ? ` — FAILED: ${broken.join(', ')}` : ''));
  const built = buildTree(theme);
  ok(built.stats.broken.length === 0 && built.stats.aliases > 0, `harbor: all ${built.stats.aliases} aliases resolve`);
  ok(theme.notes.some((n) => n.toLowerCase().includes('action color defaults to the primary')), 'harbor: default action=primary flagged in notes');

  // M-11: the alias gate must include fluid-typography responsive refs (`responsive.{min,max}.ref`)
  // — a dangling {root.font.size.NN} used to ship while the gate reported clean. Independently
  // count every {…} ref in the tree INCLUDING the fluid refs; buildTree's own count must match
  // (if its walk skipped them — the bug — its count would be lower than this independent one).
  {
    const brandRoot = (built.tree as any)[Object.keys(built.tree)[0]];
    let refs = 0, fluidRefs = 0;
    const isRef = (s: any) => typeof s === 'string' && /^\{.+\}$/.test(s);
    const count = (n: any): void => {
      if (!n || typeof n !== 'object') return;
      if (n.$type !== undefined) {
        if (isRef(n.$value)) refs++;
        else if (n.$value && typeof n.$value === 'object' && !Array.isArray(n.$value)) for (const s of Object.values(n.$value)) if (isRef(s)) refs++;
        else if (Array.isArray(n.$value)) for (const it of n.$value) if (it && typeof it === 'object') for (const s of Object.values(it)) if (isRef(s)) refs++;
        // Mode overrides: a string `$value` alias (colour roles) OR a composite's raw sub-value shape
        // (shadow's modes.<m> is a layer array). Mirrors the gate's walk — the two must agree BY
        // CONSTRUCTION, or this check drifts into comparing two different definitions of "a ref"
        // (#301: both sides previously read only a string `$value`, so both missed the same case and
        // agreed for the wrong reason).
        const mo = n.$extensions?.prism3?.modes;
        if (mo && !Array.isArray(mo)) for (const mv of Object.values(mo)) {
          if (Array.isArray(mv)) { for (const it of mv) if (it && typeof it === 'object') for (const s of Object.values(it)) if (isRef(s)) refs++; continue; }
          const sv = (mv as any)?.$value;
          if (isRef(sv)) refs++;
          else if (Array.isArray(sv)) { for (const it of sv) if (it && typeof it === 'object') for (const s of Object.values(it)) if (isRef(s)) refs++; }
          else if (sv && typeof sv === 'object') { for (const s of Object.values(sv)) if (isRef(s)) refs++; }
        }
        const r = n.$extensions?.prism3?.responsive;
        if (r?.fluid) for (const e of [r.min, r.max]) if (isRef(e?.ref)) { refs++; fluidRefs++; }
        return;
      }
      for (const [k, v] of Object.entries(n)) if (!k.startsWith('$')) count(v);
    };
    count(brandRoot);
    ok(fluidRefs > 0, `M-11: precondition — harbor has fluid composites (${fluidRefs} responsive refs)`);
    ok(built.stats.aliases === refs, `M-11: the alias gate counts every ref incl. fluid responsive refs (gate ${built.stats.aliases} === independent ${refs})`);
  }
}
// M-10: the .ai.json `aliased_by` reverse index must count mode-override (dark/HC) + fluid
// consumers, not just $value refs — else a primitive consumed ONLY by a dark override shows zero
// consumers, contradicting the sidecar's own "cannot drift" note. (The sidecar was otherwise
// entirely ungated.) Prove mode/fluid refs add direct consumer edges a $value-only index misses.
{
  const t = brandTheme(parseDesignMd(readFileSync(resolve(HERE, '../examples/aurora.design.md'), 'utf8')).input);
  const tree = buildTree(t).tree as any;
  const R = t.root;
  const refsInV = (v: any): string[] => { if (typeof v === 'string') { const m = v.match(/^\{(.+)\}$/); return m ? [m[1]] : []; } if (v && typeof v === 'object') return Object.values(v).flatMap(refsInV); return []; };
  const strip = (ref: string) => (ref.startsWith(R + '.') ? ref.slice(R.length + 1) : ref);
  const edgesValue = new Set<string>(), edgesAll = new Set<string>();
  const wp = (o: any, p: string[]): void => {
    if (!o || typeof o !== 'object') return;
    if (o.$type !== undefined) {
      for (const ref of refsInV(o.$value)) { const e = strip(ref) + '←' + p.join('.'); edgesValue.add(e); edgesAll.add(e); }
      const mo = o.$extensions?.prism3?.modes; if (mo && !Array.isArray(mo)) for (const mv of Object.values(mo)) for (const ref of refsInV((mv as any)?.$value)) edgesAll.add(strip(ref) + '←' + p.join('.'));
      const r = o.$extensions?.prism3?.responsive; if (r?.fluid) for (const end of [r.min, r.max]) { const m = String(end?.ref).match(/^\{(.+)\}$/); if (m) edgesAll.add(strip(m[1]) + '←' + p.join('.')); }
      return;
    }
    for (const [k, v] of Object.entries(o)) if (!k.startsWith('$')) wp(v, [...p, k]);
  };
  wp(tree[R], []);
  ok(edgesAll.size > edgesValue.size, `M-10: mode-override + fluid refs add ${edgesAll.size - edgesValue.size} direct consumer edges the $value-only index missed`);
  const ai = buildAiMetadata(t, tree) as any;
  ok(Object.values(ai.primitives).some((pr: any) => (pr.aliased_by?.length ?? 0) > 0), 'M-10: the emitted sidecar carries a populated aliased_by reverse index (was ungated)');

  // Sidecar-reference gate: every `paired_with` entry must resolve to a real role key in the SAME
  // sidecar. This is the gate that was missing — the field.border → field.border.rest rename left
  // a stale `field.fill` paired_with pointing at the gone `field.border`, and nothing caught it
  // because the sidecar's cross-references were never validated. Now a rename that orphans a
  // paired_with ref fails here instead of shipping a broken .ai.json.
  const roleKeys = new Set(Object.keys(ai.color));
  const dangling: string[] = [];
  for (const [k, r] of Object.entries(ai.color as Record<string, any>))
    for (const ref of (r.paired_with ?? []))
      if (!roleKeys.has(ref)) dangling.push(`${k} → ${ref}`);
  ok(dangling.length === 0, 'sidecar: every .ai.json paired_with resolves to a real role in the sidecar' + (dangling.length ? ` — ${dangling.slice(0, 5).join(', ')}` : ''));
}
// (5) STANDARD dialect — the brand-skills / google-labs design.md path (docs/07 §11):
// the reader + colour-role classifier + x-prism3 levers, on the real Wendy's file.
{
  const std = parseStandardDesignMd(readFileSync(resolve(HERE, '../examples/wendys.design.md'), 'utf8'));
  ok(Object.keys(std.colors).length === 24 && Object.keys(std.typography).length === 25, 'wendys standard: reader sees 24 colours + 25 type tokens');
  // L-15: an UNQUOTED `#hex` colour value is read as a YAML comment and stripped to null. Give
  // an actionable error at the reader ("quote it") rather than a baffling `invalid hex 'null'`
  // two layers down. A quoted hex reads back fine.
  let hexComment = '';
  try { parseStandardDesignMd('---\nname: b\ncolors:\n  primary: #ff0000\n---\n'); } catch (e) { hexComment = (e as Error).message; }
  ok(/primary/.test(hexComment) && /quote it/.test(hexComment), "L-15: an unquoted '#hex' colour throws a quote-it hint, not a downstream 'invalid hex null'");
  ok(parseStandardDesignMd('---\nname: b\ncolors:\n  primary: "#ff0000"\n---\n').colors.primary === '#ff0000', 'L-15: a quoted hex reads back verbatim');
  const cls = classifyColors(std.colors);
  ok(!!cls.input.status.danger, 'classifier: error → status.danger (the one rename)');
  ok(!!cls.input.status.success && !!cls.input.status.warning, 'classifier: success + warning classified from the flat map');
  ok(cls.input.brandColors.some((b) => b.name === 'secondary') && cls.input.brandColors.some((b) => b.name === 'tertiary'), 'classifier: secondary + tertiary → brandColors[]');
  // M-12: classification lowercases, so anchor EXTRACTION must too — a mixed/upper-case map
  // must anchor identically, not silently drop the anchor (or throw "no primary").
  const mixed = classifyColors({ Primary: '#3366cc', Error: '#cc2222', Secondary: '#22aa88', Neutral: '#888888' });
  ok(!!mixed.input.primary && !!mixed.input.status.danger && mixed.input.brandColors.some((b) => b.name === 'secondary'),
    'M-12: mixed-case keys (Primary/Error/Secondary) classify + extract identically to lowercase');
  let m12threw = false;
  try { classifyColors({ PRIMARY: '#123456' }); } catch { m12threw = true; }
  ok(!m12threw, 'M-12: an all-caps PRIMARY no longer throws "no primary"');
  const { input, xApplied } = standardToBrandInput(std);
  ok(input.id === 'wendys', "standardToBrandInput: id derived from name (Wendy's → wendys)");
  ok(xApplied.length === 0, 'wendys: no x-prism3 block → engine defaults (the plain-spec guarantee)');
  ok(validateBrandInput(input).length === 0, 'wendys standard: classified BrandInput schema-conforms');
  const theme = brandTheme(input);
  ok(theme.roleToPalette.danger === 'danger', 'wendys: error→danger carved as a distinct palette');
  const built = buildTree(theme);
  ok(built.stats.broken.length === 0 && built.stats.aliases > 0, `wendys: all ${built.stats.aliases} aliases resolve`);
  const broken = resolveAllModes(theme).flatMap((m) => Object.entries(m.roles).filter(([, r]) => r.min > 0 && r.ratio < r.min).map(([k]) => `${m.mode}.${k}`));
  ok(broken.length === 0, 'wendys: all mode contrast contracts hold' + (broken.length ? ` — FAILED: ${broken.join(', ')}` : ''));
  // exact-anchor preservation: the generated primary ramp contains the observed hex at ΔE00 ~0.
  const pPal = theme.palettes.find((p) => p.palette === 'primary')!;
  const bestDe = Math.min(...pPal.steps.map((s) => deltaE2000(s.rgb, hexToRgb(std.colors.primary))));
  ok(bestDe < 0.5, `wendys: primary anchor reproduced at ΔE00 ${bestDe.toFixed(2)} (< 0.5, exact-anchor preservation)`);
}
// (6) x-prism3 lever mapping + dialect detection.
{
  const probe = { id: 'p', primary: { l: 0.5, c: 0.1, h: 20 }, neutral: { hue: 20, chroma: 0.01 } } as BrandInput;
  const applied = applyXPrism3(probe, { radiusScale: 2, typeScale: 'expressive', motionTempo: 'snappy', density: 'compact' });
  ok(probe.radiusScale === 2 && probe.typography?.typeScale === 'expressive' && probe.motionPersonality?.tempo === 'snappy' && probe.density === 'compact' && applied.length === 4,
    'applyXPrism3: levers map onto BrandInput (brand-skills → engine round-trip)');
  // M-14: a non-numeric radiusScale (`Number('soft')` → NaN) must be rejected at ingest, not
  // slipped through to NaNpx radius tokens (NaN passes typeof-number + every min/max compare).
  let m14ingest = false;
  try { applyXPrism3({ id: 'p', primary: { l: 0.5, c: 0.1, h: 20 }, neutral: { hue: 20, chroma: 0.01 } } as BrandInput, { radiusScale: 'soft' }); } catch { m14ingest = true; }
  ok(m14ingest, 'M-14: x-prism3.radiusScale="soft" throws at ingest (not a NaN radius)');
  ok(applyXPrism3({ id: 'p', primary: { l: 0.5, c: 0.1, h: 20 }, neutral: { hue: 20, chroma: 0.01 } } as BrandInput, { radiusScale: 1.5 }).length === 1, 'M-14: a numeric radiusScale still applies');
  ok(validateBrandInput({ id: 't', primary: { l: 0.5, c: 0.05, h: 200 }, neutral: { hue: 200, chroma: 0.01 }, radiusScale: NaN } as any).length > 0, 'M-14: the validator rejects a NaN number (backstop)');
  const nativeStd = parseStandardDesignMd(readFileSync(resolve(HERE, '../examples/harbor.design.md'), 'utf8'));
  ok(Object.keys(nativeStd.colors).length === 0, 'dialect detection: an engine-native brief has no top-level colors map (routes native)');
}
// (7) LEVER MANIFEST — the shared-control contract (docs/08 §4). The presentation
// half must NOT drift from theme-schema.json (the validation half): every key
// resolves, every enum's options match the schema enum (as a set), every default
// matches the schema default, and the committed JSON is up to date.
{
  const schema = JSON.parse(readFileSync(resolve(HERE, '../schema/theme-schema.json'), 'utf8'));
  const resolveNode = (key: string): any => {
    let node: any = schema;
    for (const p of key.split('.')) { const props = node?.properties; if (!props || !props[p]) return undefined; node = props[p]; }
    return node;
  };
  const setEq = (a: unknown[], b: unknown[]) => JSON.stringify([...a].map(String).sort()) === JSON.stringify([...b].map(String).sort());
  const groups = new Set(leverGroups.map((g) => g.group));
  const controls = new Set(['color', 'slider', 'enum', 'toggle', 'list', 'palette-ref', 'object', 'text']);

  const unresolved = leverManifest.filter((l) => !resolveNode(l.key)).map((l) => l.key);
  ok(unresolved.length === 0, 'lever manifest: every key resolves in theme-schema.json' + (unresolved.length ? ` — MISSING: ${unresolved.join(', ')}` : ''));

  const badGC = leverManifest.filter((l) => !groups.has(l.group) || !controls.has(l.control)).map((l) => l.key);
  ok(badGC.length === 0, 'lever manifest: every group + control is from the allowed set' + (badGC.length ? ` — BAD: ${badGC.join(', ')}` : ''));

  // Enum parity, two-sided but asymmetric. The hard invariant: the UI may never offer a value the
  // schema would REJECT (options ⊆ enum). The other direction is softer, because the schema can
  // legitimately accept more than the UI offers — a retired value kept as a back-compat alias
  // (`disabledStrategy`'s `accessible`/`conventional`). Those must be MARKED: an unoffered enum
  // value is only allowed if the schema description flags it as a legacy alias. So forgetting to
  // surface a genuinely new option still fails, while a documented alias passes.
  const enumDrift = leverManifest.filter((l) => l.control === 'enum').filter((l) => {
    const node = resolveNode(l.key);
    const e: string[] | undefined = node?.enum;
    if (!e) return true;
    const offered = (l.options ?? []).map((o) => String(o.value));
    if (offered.some((v) => !e.map(String).includes(v))) return true;      // UI offers a schema-invalid value
    const unoffered = e.map(String).filter((v) => !offered.includes(v));
    if (!unoffered.length) return false;
    return !/LEGACY ALIAS/i.test(String(node.description ?? ''));          // unoffered ⇒ must be documented legacy
  }).map((l) => l.key);
  ok(enumDrift.length === 0, 'lever manifest: enum options ⊆ schema enum, and any schema-only value is a documented legacy alias' + (enumDrift.length ? ` — DRIFT: ${enumDrift.join(', ')}` : ''));

  const defDrift = leverManifest.filter((l) => {
    const n = resolveNode(l.key);
    return n && n.default !== undefined && l.default !== undefined && JSON.stringify(n.default) !== JSON.stringify(l.default);
  }).map((l) => l.key);
  ok(defDrift.length === 0, 'lever manifest: every lever default matches the schema default' + (defDrift.length ? ` — DRIFT: ${defDrift.join(', ')}` : ''));

  // Every schema-root-required field (minus host-supplied identity, e.g. `id`) must be
  // covered by a required lever — as an exact key, or (for object fields like `neutral`)
  // by a required lever nested under it. Catches a NEW required field or a dropped one.
  const req = new Set(leverManifest.filter((l) => l.required).map((l) => l.key));
  const schemaRequired: string[] = (schema.required ?? []).filter((k: string) => !(identityFields as readonly string[]).includes(k));
  const uncovered = schemaRequired.filter((k) => !req.has(k) && ![...req].some((rk) => rk.startsWith(k + '.')));
  ok(uncovered.length === 0, 'lever manifest: every required BrandInput field (minus identity) is a required lever' + (uncovered.length ? ` — UNCOVERED: ${uncovered.join(', ')}` : ''));

  const committed = readFileSync(resolve(HERE, '../schema/lever-manifest.json'), 'utf8');
  ok(committed === JSON.stringify(buildLeverManifest(), null, 2) + '\n',
    'lever manifest: schema/lever-manifest.json is up to date (run `npx tsx engine/emit-levers.ts`)');
}

// (7b) DISABLED CONTRAST — the absolute 3:1 floor (#290). Both branches gate: 'full' promises a
// fixed 4.5:1, 'reduced' a dialable 3–4.5. Nothing may emit disabled ink below 3:1, so the WCAG
// 1.4.3/1.4.11 inactive-component exemption is never relied on. The old model failed exactly here:
// 'conventional' sat ungated at ~2:1, and 'accessible' at the bottom of its 2–4.5 dial collapsed
// onto it while still calling itself accessible.
{
  const dRoles = (input: any, mode: string) => {
    const R = resolveAllModes(brandTheme(input)).find((x) => x.mode === mode)!;
    return R.roles as Record<string, { ratio?: number; min?: number } | undefined>;
  };
  const seed = { id: 'd', root: 'prism', modes: ['light', 'dark', 'hc-light'], primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.006, auto: true } };

  // The floor is absolute — every reachable strategy/min combination, in every mode.
  const combos: any[] = [
    { ...seed }, { ...seed, disabledStrategy: 'full' }, { ...seed, disabledStrategy: 'reduced' },
    { ...seed, disabledStrategy: 'reduced', disabledMin: 3 }, { ...seed, disabledStrategy: 'reduced', disabledMin: 4.5 },
    { ...seed, disabledStrategy: 'accessible' }, { ...seed, disabledStrategy: 'conventional' },
    // out-of-range inputs a hand-authored design.md could carry — must clamp, not honour.
    { ...seed, disabledStrategy: 'reduced', disabledMin: 1 }, { ...seed, disabledStrategy: 'reduced', disabledMin: 0 },
    { ...seed, disabledStrategy: 'reduced', disabledMin: 9 },
  ];
  let worst = Infinity, ungated = 0;
  for (const c of combos) for (const m of ['light', 'dark', 'hc-light']) {
    for (const k of ['disabled.text', 'disabled.icon', 'disabled.on-fill']) {
      const r = dRoles(c, m)[k];
      if (!r) continue;
      if (!r.min || r.min < 3) ungated++;
      worst = Math.min(worst, r.ratio ?? 0);
    }
  }
  ok(ungated === 0, `#290 disabled: every disabled ink role is gated at >=3:1 across all strategies/mins/modes (ungated or sub-3 contracts: ${ungated})`);
  ok(worst >= 3, `#290 disabled: worst measured disabled ratio across every combination is >=3:1 (got ${worst.toFixed(2)})`);

  // 'full' is a fixed promise, not a range — disabledMin cannot pull it below AA text.
  const fullLow = dRoles({ ...seed, disabledStrategy: 'full', disabledMin: 3 }, 'light')['disabled.text'];
  ok(fullLow?.min === 4.5, `#290 disabled: 'full' ignores disabledMin and holds 4.5 (got min ${fullLow?.min})`);

  // 'reduced' honours its dial, and clamps out-of-range input into [3, 4.5].
  ok(dRoles({ ...seed, disabledStrategy: 'reduced', disabledMin: 4 }, 'light')['disabled.text']?.min === 4,
    `#290 disabled: 'reduced' honours an in-range floor (4)`);
  ok(normalizeDisabledMin('reduced', 1) === 3 && normalizeDisabledMin('reduced', 9) === 4.5,
    '#290 disabled: disabledMin clamps into [3, 4.5]');

  // Legacy aliases: both normalize to 'reduced'; 'conventional' RAISES to the 3:1 floor.
  ok(normalizeDisabledStrategy('accessible') === 'reduced' && normalizeDisabledStrategy('conventional') === 'reduced'
    && normalizeDisabledStrategy('full') === 'full' && normalizeDisabledStrategy(undefined) === 'reduced',
    '#290 disabled: legacy accessible/conventional both normalize to reduced; full and the default survive');
  ok(normalizeDisabledMin('conventional', undefined) === 3,
    '#290 disabled: legacy conventional lands on the 3:1 floor (raised from its old ~2:1 exempt look)');
  ok(normalizeDisabledMin('accessible', 4) === 4, `#290 disabled: legacy accessible keeps its own floor`);

  // HC escalates BOTH branches — the old model escalated only the gated one, so 'conventional'
  // shipped ~2:1 disabled text even inside a high-contrast mode.
  for (const s of ['full', 'reduced', 'conventional']) {
    const r = dRoles({ ...seed, disabledStrategy: s, disabledMin: 3 }, 'hc-light')['disabled.text'];
    ok((r?.min ?? 0) >= 4.5, `#290 disabled: high-contrast escalates '${s}' to >=4.5 (got ${r?.min})`);
  }

  // The schema must REJECT a sub-3 floor rather than rely on the engine clamp — the clamp protects
  // the emit, the schema protects the author from thinking 2:1 was accepted.
  const dSchema = JSON.parse(readFileSync(resolve(HERE, '../schema/theme-schema.json'), 'utf8'));
  const dm = dSchema.properties.disabledMin;
  ok(dm.minimum === 3 && dm.maximum === 4.5, '#290 disabled: schema pins disabledMin to [3, 4.5]');
  ok(validateBrandInput({ ...seed, disabledMin: 2 }).length > 0, '#290 disabled: schema rejects disabledMin 2');
  ok(validateBrandInput({ ...seed, disabledMin: 3 }).length === 0, '#290 disabled: schema accepts disabledMin 3');
}
// (7c) PRIMITIVES ARE MODE-INVARIANT (#296). The rule: a token may carry a per-mode variant
// (`$extensions.prism3.modes`) ONLY if it is a SEMANTIC — i.e. its `$value` is an alias into a
// primitive, so the mode moves the POINTER and every primitive keeps one value across all modes.
// Colour, radius and density already satisfy this (`{palette.*}`, `{dimension.*}`); `font.weight-role`
// is the canonical shape (semantic name → `{font.weight.<numeric>}` primitive).
//
// The list below WAS a migration ledger — axes awaiting a primitive tier, each deleted as it landed,
// with "an empty list is the finish line". Line-height/letter-spacing (#294) and motion (#300) were
// deleted that way. Shadow was the last entry, and #301 resolved it by NARROWING THE INVARIANT rather
// than by tiering. The amendment, so a future reader does not re-open a settled question:
//
//   A TERMINAL COMPOSITE — one that neither references a primitive nor is referenced by anything —
//   MAY swap raw sub-values per mode.
//
// Why, from the #301 spike (evidence, not preference): a `shadow` leaf's `$value` is an ARRAY OF
// OBJECTS, and no consumer resolves an alias inside it. `emit-figma` turns `{…}` into `radius: 0` via
// `pxToNum`'s `|| 0`; the plugin's `write-plan` inherits that and writes the wrong effect INTO FIGMA;
// `resolve-preview` interpolates the raw `{…}` into a `box-shadow` string, which the browser drops as
// invalid CSS; `visualize` leaks it into `tokens.html`. Three of the four exit 0 while emitting a wrong
// artifact. So tiering shadow means shipping a nested-composite alias resolver to four consumers —
// including the Figma write path — to buy mode-invariance on tokens no one consumes individually
// (designers reach for `shadow.md`, never a raw blur).
//
// The exemption is NOT a blanket pass. `assertTerminal` below re-derives "terminal" from the tree on
// every run: if a shadow leaf ever gains an alias, or anything ever aliases INTO shadow, the premise
// is false and this fails — forcing the decision to be re-made rather than inherited. That is what
// keeps this an amendment with teeth instead of the excuse list the original comment warned about.
//
// If #305's tint work makes shadow values genuinely brand-expressive enough that consumers want to
// re-point them, revisit — that is the trigger, not the mere existence of the exemption.
{
  const TERMINAL_COMPOSITE_EXEMPTIONS = [
    // line-height + letter-spacing were here and are now FIXED — the rungs stayed primitives and the
    // semantic composites re-point instead. Their absence is what the ledger looks like when an axis lands.
    // motion (duration / duration-reduced / stagger) was here and is now FIXED — a value-keyed
    // `motion.duration-ms.*` primitive tier, with the named rungs re-pointing into it per mode.
    { re: /^prism\.shadow\./, group: 'shadow', why: '#301 — terminal composite; no consumer resolves nested aliases' },
  ];
  const KNOWN_VIOLATIONS = TERMINAL_COMPOSITE_EXEMPTIONS.map((e) => e.re);
  const t: any = brandTheme({
    id: 'inv', root: 'prism', modes: ['light', 'dark'],
    primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.006, auto: true },
    // Every per-mode axis engaged at once, so the walk sees the full violation surface.
    modeLevers: { dark: {
      radius: 2, density: 'compact', tempo: 'relaxed',
      families: { display: 'Georgia' }, weights: { default: 500 },
      lineHeights: { normal: 'relaxed' }, letterSpacings: { normal: 'wide' },
      shadow: { softness: 2, tint: { hue: 10, amount: 0.4 } },
    } },
  } as any);
  const built: any = buildTree(t);
  const tree = built.tree ?? built;

  const offenders: string[] = [];
  const allowed: string[] = [];
  const walk = (node: any, path: string): void => {
    if (!node || typeof node !== 'object') return;
    if (node.$value !== undefined) {
      const x = node.$extensions?.prism3;
      if (!x?.modes) return;
      // The rule: a per-mode variant must RE-POINT, never re-value.
      //  · a scalar leaf re-points iff its $value is an alias string
      //  · `role: semantic` is declared as such
      //  · a DTCG COMPOSITE ($value is an object of aliases + baked literals) re-points iff every
      //    field the variant CHANGED is an alias — so `type.*` swapping `{font.line-height.normal}`
      //    for `{font.line-height.relaxed}` passes, while `shadow.*` swapping raw colour/px objects
      //    does not. Baked literals that didn't change (textCase, textDecoration) are irrelevant.
      const isAliasStr = (v: unknown): boolean => typeof v === 'string' && /^\{.+\}$/.test(v);
      const changedFieldsAllAliases = (): boolean => {
        const base = node.$value;
        if (base === null || typeof base !== 'object' || Array.isArray(base)) return false;
        return Object.values(x.modes as Record<string, any>).every((mv: any) => {
          const v = mv?.$value;
          if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
          const changed = Object.keys(v).filter((k) => JSON.stringify(v[k]) !== JSON.stringify((base as any)[k]));
          return changed.length > 0 && changed.every((k) => isAliasStr(v[k]));
        });
      };
      if (isAliasStr(node.$value) || x.role === 'semantic') return;
      if (x.role === 'composite' && changedFieldsAllAliases()) return;
      (KNOWN_VIOLATIONS.some((re) => re.test(path)) ? allowed : offenders).push(path);
      return;
    }
    for (const k of Object.keys(node)) if (!k.startsWith('$')) walk(node[k], path ? `${path}.${k}` : k);
  };
  walk(tree, '');

  ok(offenders.length === 0,
    '#296 primitives are mode-invariant: no NEW literal-valued leaf carries a per-mode variant'
    + (offenders.length ? ` — OFFENDERS: ${[...new Set(offenders.map((p) => p.split('.').slice(0, 3).join('.')))].join(', ')}` : ''));
  // The list must stay honest in BOTH directions: an entry that no longer matches anything is a
  // fixed axis whose exemption should be deleted, which this catches instead of letting it rot.
  ok(allowed.length > 0, '#296 exemption list still matches real leaves (delete stale entries as axes are tiered)');

  // THE EXEMPTION'S PREMISE, RE-DERIVED (#301). "Terminal" is not an assertion in a comment — it is
  // re-checked here every run: an exempt group must contain no alias, and nothing outside it may alias
  // into it. If either becomes false, the group is participating in the reference graph after all, the
  // reason for exempting it is gone, and this fails loudly rather than letting a stale exemption
  // quietly excuse a real violation.
  {
    const refsOf = (v: unknown): string[] => {
      if (typeof v === 'string') { const m = v.match(/^\{(.+)\}$/); return m ? [m[1]] : []; }
      if (Array.isArray(v)) return v.flatMap(refsOf);
      if (v && typeof v === 'object') return Object.values(v).flatMap(refsOf);
      return [];
    };
    for (const ex of TERMINAL_COMPOSITE_EXEMPTIONS) {
      const outgoing: string[] = [];   // an alias INSIDE the exempt group
      const incoming: string[] = [];   // an alias elsewhere POINTING AT the exempt group
      const scan = (node: any, path: string): void => {
        if (!node || typeof node !== 'object') return;
        if (node.$value !== undefined) {
          const inGroup = ex.re.test(path);
          const all = [...refsOf(node.$value), ...refsOf(node.$extensions?.prism3?.modes ?? {})];
          for (const r of all) {
            if (inGroup) outgoing.push(`${path} → {${r}}`);
            // `prism.` prefix: refs are absolute paths from the tree root, same shape the regex matches.
            else if (ex.re.test(r.startsWith('prism.') ? r : `prism.${r}`)) incoming.push(`${path} → {${r}}`);
          }
          return;
        }
        for (const k of Object.keys(node)) if (!k.startsWith('$')) scan(node[k], path ? `${path}.${k}` : k);
      };
      scan(tree, '');
      ok(outgoing.length === 0,
        `#301 '${ex.group}' is still TERMINAL — no alias inside it (exemption assumes it references nothing)`
        + (outgoing.length ? ` — FOUND: ${outgoing.slice(0, 3).join(', ')}. It now participates in the reference graph; re-decide the exemption.` : ''));
      ok(incoming.length === 0,
        `#301 '${ex.group}' is still TERMINAL — nothing aliases into it (exemption assumes nothing depends on it)`
        + (incoming.length ? ` — FOUND: ${incoming.slice(0, 3).join(', ')}. Consumers now depend on it; re-decide the exemption.` : ''));
      // And the group must actually EXIST — a renamed group would make both checks vacuously true.
      let present = false;
      const findGroup = (node: any, path: string): void => {
        if (present || !node || typeof node !== 'object') return;
        if (node.$value !== undefined) { if (ex.re.test(path)) present = true; return; }
        for (const k of Object.keys(node)) if (!k.startsWith('$')) findGroup(node[k], path ? `${path}.${k}` : k);
      };
      findGroup(tree, '');
      ok(present, `#301 '${ex.group}' exists in the tree (a renamed group would make its terminal checks vacuous)`);
    }
  }
  // And the axes we HAVE tiered must stay TIERED — the real regression risk. Re-walk each one in
  // isolation with the ledger disabled, so a future change that turns an alias back into a literal
  // fails here even though the global check above would have excused nothing.
  const root = tree.prism;
  const literalModeLeaves = (sub: any, base: string): string[] => {
    const hits: string[] = [];
    const rec = (node: any, path: string): void => {
      if (!node || typeof node !== 'object') return;
      if (node.$value !== undefined) {
        const x = node.$extensions?.prism3;
        if (!x?.modes) return;
        const isAlias = typeof node.$value === 'string' && /^\{.+\}$/.test(node.$value);
        if (!isAlias && x.role !== 'semantic') hits.push(path);
        return;
      }
      for (const k of Object.keys(node)) if (!k.startsWith('$')) rec(node[k], `${path}.${k}`);
    };
    rec(sub, base);
    return hits;
  };
  for (const g of ['color', 'radius', 'size']) {
    const hits = literalModeLeaves(root[g] ?? {}, g);
    ok(hits.length === 0, `#296 '${g}' stays tiered — per-mode variants only on alias/semantic leaves` + (hits.length ? ` — REGRESSED: ${hits.slice(0, 4).join(', ')}` : ''));
  }
  // Sanity: the walk must actually be reaching mode-carrying leaves, or the checks above are vacuous.
  ok(allowed.length + offenders.length > 0, '#296 guard is live — the tree walk found mode-carrying leaves to judge');
}

// (8) PREVIEW SPEC — the shared live-preview contract (docs/08 §7, B1a). Every bound
// token path (bindings + contract endpoints) must resolve to a real leaf in the
// emitted token tree (binding-validity), contract mins are sane, and the committed
// JSON stays current. The semantic role layer is brand-agnostic, so harbor's tree
// is representative.
{
  const previewTheme = brandTheme(parseDesignMd(readFileSync(resolve(HERE, '../examples/harbor.design.md'), 'utf8')).input);
  const tree = buildTree(previewTheme).tree;
  const root = Object.keys(tree)[0];
  const isLeaf = (path: string): boolean => {
    let node: any = tree[root];
    for (const seg of path.split('.')) { node = node?.[seg]; if (node == null) return false; }
    return node.$value !== undefined;
  };
  const missing = previewTokenRefs().filter((p) => !isLeaf(p));
  ok(missing.length === 0, 'preview spec: every bound token path resolves to a leaf in the token tree' + (missing.length ? ` — MISSING: ${missing.join(', ')}` : ''));

  const badContracts: string[] = [];
  for (const c of previewSpec.components) for (const v of c.variants) for (const ct of v.contracts ?? []) {
    if (![3, 4.5].includes(ct.min) || ct.fg === ct.bg) badContracts.push(`${c.id}/${v.name}`);
  }
  ok(badContracts.length === 0, 'preview spec: every contract has a sane min (3|4.5) and distinct fg/bg' + (badContracts.length ? ` — BAD: ${badContracts.join(', ')}` : ''));

  // A declared contract must not CLAIM MORE than the engine guarantees. For any pair
  // whose (fg role, bg) equals an engine role's (path key, `against`), require
  // declared min ≤ the engine's min — so a component can't assert a 3:1 boundary on a
  // role the engine ships decorative (the input/border.primary defect, PR #20 review).
  const modes = resolveAllModes(previewTheme);
  const strip = (p: string) => p.replace(/^color\./, '');
  const overclaims: string[] = [];
  for (const c of previewSpec.components) for (const v of c.variants) for (const ct of v.contracts ?? []) {
    const fgRole = strip(ct.fg), bgRole = strip(ct.bg);
    for (const m of modes) {
      const role = m.roles[fgRole];
      if (role && role.against === bgRole && ct.min > role.min) overclaims.push(`${c.id}/${v.name} ${fgRole}-on-${bgRole} ${m.mode}: declares ${ct.min} > engine ${role.min}`);
    }
  }
  ok(overclaims.length === 0, 'preview spec: no contract over-claims the engine guarantee' + (overclaims.length ? ` — ${overclaims.join('; ')}` : ''));

  const committedPreview = readFileSync(resolve(HERE, '../schema/preview-spec.json'), 'utf8');
  ok(committedPreview === JSON.stringify(buildPreviewSpec(), null, 2) + '\n',
    'preview spec: schema/preview-spec.json is up to date (run `npx tsx engine/emit-preview.ts`)');
}
// (9) RESOLVED PREVIEW (docs/08 §7, B1b) — project the spec to concrete colours per
// mode + compute each declared contract on the REAL resolved colours. Gates: every
// referenced colour role resolves to a hex in every mode, and every declared a11y
// contract actually HOLDS in every mode — the automated version of the PR #20 manual
// contrast check (the overlay's claims are true on the resolved colours, not assumed).
{
  const pinput = parseDesignMd(readFileSync(resolve(HERE, '../examples/harbor.design.md'), 'utf8')).input;
  const rp = resolvePreview(brandTheme(pinput));
  ok(rp.modes.length === 4, 'resolved preview: all four modes projected' + (rp.modes.length !== 4 ? ` — got ${rp.modes.length}` : ''));

  const noHex = Object.entries(rp.colors).filter(([, byMode]) => rp.modes.some((m) => !byMode[m])).map(([k]) => k);
  ok(noHex.length === 0, 'resolved preview: every referenced colour role resolves to a hex in every mode' + (noHex.length ? ` — MISSING: ${noHex.join(', ')}` : ''));

  const failures = rp.contracts.flatMap((c) =>
    rp.modes.filter((m) => c.byMode[m] && !c.byMode[m].pass).map((m) => `${c.component}/${c.variant} ${c.fg.replace('color.', '')}-on-${c.bg.replace('color.', '')} ${m}: ${c.byMode[m].ratio}<${c.min}`));
  ok(failures.length === 0, 'resolved preview: every declared contract holds on the resolved colours (all 4 modes)' + (failures.length ? ` — FAIL: ${failures.join('; ')}` : ''));

  // Geometry/type read-model (docs/09 PR B): every dimension binding resolves to a
  // positive px, every type binding to a real family + positive size — so the hosts
  // render real radius/padding/type, not fallbacks.
  const badDim = Object.entries(rp.dims).filter(([, px]) => !(px > 0)).map(([k, px]) => `${k}=${px}`);
  ok(Object.keys(rp.dims).length > 0 && badDim.length === 0, 'resolved preview: every dimension binding → positive px' + (badDim.length ? ` — BAD: ${badDim.join(', ')}` : ''));
  const badType = Object.entries(rp.type).filter(([, t]) => !t.fontFamily || !(t.fontSizePx > 0)).map(([k]) => k);
  ok(Object.keys(rp.type).length > 0 && badType.length === 0, 'resolved preview: every type binding → family + positive size' + (badType.length ? ` — BAD: ${badType.join(', ')}` : ''));

  // Per-mode geometry (docs/11 1b): with no wireframe, dims carry NO overrides; opting into
  // wireframe surfaces a radius→0 override the preview reads for the wireframe column, while
  // the canonical `dims` baseline stays positive (light) and space/size stay override-free.
  ok(Object.keys(rp.dimOverrides).length === 0, 'resolved preview: default modes carry no per-mode dim overrides');
  const wfRp = resolvePreview(brandTheme({ ...pinput, modes: ['light', 'wireframe'] }));
  const radiusRef = Object.keys(wfRp.dims).find((k) => k.startsWith('radius.') && wfRp.dims[k] > 0)!;
  ok(wfRp.dimOverrides[radiusRef]?.wireframe === 0 && wfRp.dims[radiusRef] > 0,
    `resolved preview: wireframe zeroes ${radiusRef} via an override (baseline ${wfRp.dims[radiusRef]}px stays)`);
  const spaceRef = Object.keys(wfRp.dims).find((k) => k.startsWith('space.'));
  ok(!spaceRef || !wfRp.dimOverrides[spaceRef], 'resolved preview: wireframe leaves space untouched (only radius zeroes)');

  // Shadows (#98): every shadow binding → a CSS box-shadow per mode, and dark is the
  // REDUCED lift-primary shadow (lower alpha), never identical to light.
  const shRefs = Object.keys(rp.shadows);
  ok(shRefs.length > 0, 'resolved preview: shadow bindings resolved' + (shRefs.length ? ` (${shRefs.join(', ')})` : ' — NONE'));
  const badSh = shRefs.filter((k) => { const s = rp.shadows[k].light; return !s || !/\dpx/.test(s) || !/(#|rgb|oklch|hsl|color\()/i.test(s); });
  ok(badSh.length === 0, 'resolved preview: each shadow → a real CSS box-shadow string (colour + px offsets, any colorFormat)' + (badSh.length ? ` — BAD: ${badSh.join(', ')}` : ''));
  const notReduced = shRefs.filter((k) => { const b = rp.shadows[k]; return b.dark && b.light && b.dark === b.light; });
  ok(notReduced.length === 0, 'resolved preview: dark shadow differs from light (reduced, lift-primary)' + (notReduced.length ? ` — SAME: ${notReduced.join(', ')}` : ''));
  // #99 elevation specimen: the WHOLE ramp resolves (not just the bound `shadow.sm`), so the
  // specimen can show xs→2xl. Monotonic-ish: 2xl's blur exceeds xs's (elevation grows).
  const rampSteps = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'].filter((s) => rp.shadows[`shadow.${s}`]?.light);
  ok(rampSteps.length >= 5, `resolved preview: full shadow ramp resolved for the specimen (${rampSteps.join('/')})`);
  const blurOf = (s: string) => Math.max(...(rp.shadows[`shadow.${s}`].light!.match(/(\d+)px/g) ?? ['0px']).map((x) => parseInt(x)));
  ok(blurOf('2xl') > blurOf('xs'), `resolved preview: elevation grows across the ramp (xs blur ${blurOf('xs')} < 2xl blur ${blurOf('2xl')})`);

  // Translucent roles (#99 2a): overlay washes carry their alpha, and the preview folds it into
  // an 8-digit hex so the outline hover/pressed wash renders as a real composite (not opaque).
  const overlayRole = resolveAllModes(brandTheme(pinput))[0].roles['interactive.primary.overlay.hover'];
  ok(overlayRole?.alpha === 0.1, `resolved role: overlay.hover carries alpha 0.1 (got ${overlayRole?.alpha})`);
  const hoverCss = rp.colors['color.interactive.primary.overlay.hover']?.light;
  ok(!!hoverCss && /^#[0-9a-f]{8}$/i.test(hoverCss), `resolved preview: overlay wash is an 8-digit (alpha) hex (got ${hoverCss})`);
  const pressedCss = rp.colors['color.interactive.primary.overlay.pressed']?.light;
  ok(!!pressedCss && pressedCss !== hoverCss, 'resolved preview: pressed wash differs from hover (20% vs 10%)');
}
// (10) EXAMPLE-BRANDS ARTIFACT (docs/09) — the browser hosts boot from
// schema/example-brands.json (the design.md parser is node-only). Gate that the
// committed JSON is current AND that EVERY emitted brand resolves all-green on the
// preview contracts — so a host can trust whatever it boots from (extends the B1b
// check beyond harbor to every host-facing example, incl. the web's aurora default).
{
  const committed = readFileSync(resolve(HERE, '../schema/example-brands.json'), 'utf8');
  ok(committed === exampleBrandsJson(), 'example brands: schema/example-brands.json is up to date (run `npx tsx engine/emit-brandinput.ts`)');

  const brands = exampleBrands();
  for (const id of EXAMPLE_IDS) {
    const rp = resolvePreview(brandTheme(brands[id] as BrandInput));
    const broken = rp.contracts.flatMap((c) =>
      rp.modes.filter((m) => c.byMode[m] && !c.byMode[m].pass).map((m) => `${c.component}/${c.variant} ${m}:${c.byMode[m].ratio}<${c.min}`));
    ok(broken.length === 0, `example brand '${id}': every preview contract holds (all 4 modes)` + (broken.length ? ` — FAIL: ${broken.join('; ')}` : ''));
  }
}
// (10b) #63 — nb's HAND-AUTHORED semantic text on the `-subtle` tint surface lands ~4.0–4.2:1 in
// LIGHT, under AA 4.5 (the banner/badge pairing; a CR-02 sibling — the role is contracted vs the
// mode floor but USED on a specific lighter tint). This exists ONLY in the hand-authored NB
// reproduction: engine-GENERATED brands (aurora/harbor, gated all-green above) place these to clear
// 4.5. Option 1 (large-text 3:1) does NOT apply — measured: the alert text is body 16px regular and
// the badge is label 12px; neither qualifies. Option 2 (re-target the inks) would move NB tokens +
// the regression baseline. OWNER DECISION (#63): Option 3 — ACCEPT as a documented NB-source
// divergence (the engine is already correct; NB is the legacy regression fixture, not the generator).
// Pinned as KNOWN outliers so the fact stays VISIBLE and can't DRIFT: a NEW light shortfall
// (regression) or a VANISHED known one (something fixed it → re-review / close #63) both fail here.
{
  const KNOWN_NB_LIGHT_TINT_SHORTFALLS = new Set([
    'success text on tint', 'danger text on tint', 'info text on tint', 'label on tint',
  ]);
  const nbLightFails = resolvePreview(nbTheme()).contracts.filter((c) => c.byMode.light && !c.byMode.light.pass);
  const labels = new Set(nbLightFails.map((c) => c.label ?? ''));
  const unexpected = [...labels].filter((l) => !KNOWN_NB_LIGHT_TINT_SHORTFALLS.has(l));
  const vanished = [...KNOWN_NB_LIGHT_TINT_SHORTFALLS].filter((l) => !labels.has(l));
  ok(unexpected.length === 0, '#63: no NEW nb light-mode shortfall beyond the 4 known tint outliers' + (unexpected.length ? ` — NEW: ${unexpected.join('; ')}` : ''));
  ok(vanished.length === 0, '#63: the 4 known nb tint outliers still exist (a vanished one → re-review, maybe close #63)' + (vanished.length ? ` — VANISHED: ${vanished.join('; ')}` : ''));
  ok(nbLightFails.every((c) => /tint/.test(c.label ?? '')), '#63: every nb light shortfall is a semantic-text-on-subtle-tint pairing (CR-02 sibling)');
  ok(nbLightFails.every((c) => c.byMode.light!.ratio >= 4.0 && c.byMode.light!.ratio < 4.5), '#63: each accepted nb tint outlier sits in the documented band [4.0, 4.5) — a drop below 4.0 is a real regression, not an accepted outlier');
}

// (11) EMIT-FIGMA COLOUR (docs/10) — buildFigmaColor(nbTheme) must reproduce the frozen
// Token Press export (fixtures/figma/nb): same variable names per collection/mode, same
// scopes, and — the load-bearing property — every semantic aliases the SAME palette
// variable by name in every mode (0 broken/mismatched). Values compared to float32
// tolerance (Figma stores colour as float32; the importer's rounding differs by ~5e-7).
// NB (#66): the byte-repro is on variable NAMES / scopes / aliases / values — NOT the
// `$collection` label. The emitter now labels the primitives `core-palette` / `core-font`
// / `type-sets` (#66), while the frozen fixture keeps the pre-rename labels; the fixture is
// the Token Press byte-repro target and stays put until Token Press confirms the new labels
// (#67). The load-bearing contract (names/aliases/values) is unchanged, which is what this gates.
{
  const FIXDIR = resolve(HERE, '../fixtures/figma/nb');
  const { palette, color } = buildFigmaColor(nbTheme());
  const emitted: Record<string, any> = { palette };
  for (const c of color) emitted[`color.${c.$mode}`] = c;

  // NB opts into the default four modes (no wireframe), so `color` here has 4 entries.
  // Iterate the modes actually emitted rather than the full COLOR_MODES set — the
  // wireframe mode is opt-in and has no NB fixture (docs/11 Pillar 1b).
  for (const key of ['palette', ...color.map((c) => `color.${c.$mode}`)]) {
    const fix = JSON.parse(readFileSync(resolve(FIXDIR, `${key}.json`), 'utf8'));
    const out = emitted[key];
    const fixByName = new Map<string, any>(fix.variables.map((v: any) => [v.name, v]));
    const outByName = new Map<string, any>(out.variables.map((v: any) => [v.name, v]));
    // The fixture is the FROZEN real NB Token Press export. `missing === 0` keeps the
    // byte-repro guarantee (every real-NB var is still emitted, and the scope/alias/value
    // checks below verify them). Engine-invented FAMILIES that NB's export predates
    // (interactive.* — docs/20) are allow-listed out of the `extra` check: they are
    // pinned for shape/scope in the dedicated interactive block below, not here — so this
    // gate still fails on a spurious var inside a REAL family. (Fixture-character decision,
    // 2026-07-06; pairs with #67.)
    const ENGINE_ADDED_FAMILIES = ['color/interactive/', 'color/disabled/', 'color/field/'];
    const missing = [...fixByName.keys()].filter((n) => !outByName.has(n));
    const extra = [...outByName.keys()].filter((n) => !fixByName.has(n) && !ENGINE_ADDED_FAMILIES.some((p) => n.startsWith(p)));
    ok(missing.length === 0 && extra.length === 0, `figma ${key}: variable names match fixture (${fix.variables.length})` + (missing.length ? ` — MISSING ${missing.slice(0, 3).join(',')}` : '') + (extra.length ? ` — EXTRA ${extra.slice(0, 3).join(',')}` : ''));

    const scopeBad: string[] = [], aliasBad: string[] = [], valBad: string[] = [];
    for (const [name, fv] of fixByName) {
      const ov = outByName.get(name); if (!ov) continue;
      if (JSON.stringify([...fv.scopes].sort()) !== JSON.stringify([...ov.scopes].sort())) scopeBad.push(name);
      if ((fv.alias?.name ?? null) !== (ov.alias?.name ?? null)) aliasBad.push(name);
      for (const ch of ['r', 'g', 'b', 'a']) if (Math.abs((fv.value?.[ch] ?? 0) - (ov.value?.[ch] ?? 0)) > 1e-5) valBad.push(`${name}.${ch}`);
    }
    ok(scopeBad.length === 0, `figma ${key}: scopes match fixture` + (scopeBad.length ? ` — ${scopeBad.slice(0, 3).join(',')}` : ''));
    ok(aliasBad.length === 0, `figma ${key}: every alias targets the same palette var as the fixture` + (aliasBad.length ? ` — ${aliasBad.slice(0, 3).join(',')}` : ''));
    ok(valBad.length === 0, `figma ${key}: resolved values match fixture (float32 tol)` + (valBad.length ? ` — ${valBad.slice(0, 3).join(',')}` : ''));
  }
}

// (12) EMIT-FIGMA TYPOGRAPHY (docs/10 §4) — byte-reproduce the frozen font.json +
// font-fluid.{desktop,mobile}.json (names/scopes/values/aliases exact), and gate
// the 36 text styles against the CORRECTED expectation (NOT the pre-fix
// text-styles.json fixture — that's a structural reference only; the six §4
// fixes intentionally diverge). Fixes checked: (1) no `text/` wrapper prefix;
// (2) prescribed collection names (`font`, `font-fluid`); (3a) lineHeight
// PERCENT; (3b) letterSpacing PERCENT baked; (4) primary family bound; (5)
// fontStyle derived from weight-role via the named-instance table.
{
  const FIXDIR = resolve(HERE, '../fixtures/figma/nb');
  const theme = nbTheme();

  // (a) font.json — byte-reproduce (35 vars: 3 family + 22 size + 5 weight + 5 weight-role).
  // Was 9 weight until #328: weight numerics are minted from the roles that reference them,
  // so 100/200/500/800 — which no role pointed at and nothing aliased — are no longer emitted.
  const font = buildFigmaFont(theme)[0];
  const fontFix = JSON.parse(readFileSync(resolve(FIXDIR, 'font.json'), 'utf8'));
  const fontByName = new Map<string, any>(fontFix.variables.map((v: any) => [v.name, v]));
  const emitByName = new Map<string, any>(font.variables.map((v: any) => [v.name, v]));
  const missingF = [...fontByName.keys()].filter((n) => !emitByName.has(n));
  const extraF = [...emitByName.keys()].filter((n) => !fontByName.has(n));
  ok(missingF.length === 0 && extraF.length === 0, `figma font: variable names match fixture (${fontFix.variables.length})` + (missingF.length ? ` — MISSING ${missingF.slice(0, 3).join(',')}` : '') + (extraF.length ? ` — EXTRA ${extraF.slice(0, 3).join(',')}` : ''));

  // Scopes are restored to their real per-family targets across primitive +
  // semantic (this PR keeps the fixture-match here — hidden-from-publishing
  // handles the hide, scopes remain guidance for bespoke picker use).
  // Family descriptions now lead with the fixture's stack line (fix #4) and
  // have the DTCG $description appended — assert `startsWith` on the fixture.
  const badFT: string[] = [], badFS: string[] = [], badFV: string[] = [], badFA: string[] = [], badFD: string[] = [];
  for (const [name, fv] of fontByName) {
    const ov = emitByName.get(name); if (!ov) continue;
    if (fv.resolvedType !== ov.resolvedType) badFT.push(name);
    if (JSON.stringify([...fv.scopes].sort()) !== JSON.stringify([...ov.scopes].sort())) badFS.push(name);
    if (fv.value !== ov.value) badFV.push(name);
    if ((fv.alias?.name ?? null) !== (ov.alias?.name ?? null)) badFA.push(name);
    if (name.startsWith('font/family/') && !ov.description.startsWith(fv.description)) badFD.push(name);
  }
  ok(badFT.length === 0, 'figma font: resolvedType matches fixture' + (badFT.length ? ` — ${badFT.slice(0, 3).join(',')}` : ''));
  ok(badFS.length === 0, 'figma font: scopes match fixture' + (badFS.length ? ` — ${badFS.slice(0, 3).join(',')}` : ''));
  ok(badFV.length === 0, 'figma font: values match fixture' + (badFV.length ? ` — ${badFV.slice(0, 3).join(',')}` : ''));
  ok(badFA.length === 0, 'figma font: weight-role aliases target the same numeric weight as fixture' + (badFA.length ? ` — ${badFA.slice(0, 3).join(',')}` : ''));
  ok(badFD.length === 0, 'figma font: family descriptions still lead with the full fallback stack (fix #4 preserved)' + (badFD.length ? ` — ${badFD.slice(0, 3).join(',')}` : ''));

  // (b) font-fluid.{mobile,desktop} — byte-reproduce (10 vars per mode).
  const fluid = buildFigmaFontFluid(theme);
  for (const mode of FONT_FLUID_MODES) {
    const emitted = fluid.find((f) => f.$mode === mode)!;
    const fx = JSON.parse(readFileSync(resolve(FIXDIR, `font-fluid.${mode}.json`), 'utf8'));
    const fxByName = new Map<string, any>(fx.variables.map((v: any) => [v.name, v]));
    const outByName = new Map<string, any>(emitted.variables.map((v: any) => [v.name, v]));
    const missing = [...fxByName.keys()].filter((n) => !outByName.has(n));
    const extra = [...outByName.keys()].filter((n) => !fxByName.has(n));
    ok(missing.length === 0 && extra.length === 0, `figma font-fluid.${mode}: variable names match fixture (${fx.variables.length})` + (missing.length ? ` — MISSING ${missing.slice(0, 3).join(',')}` : '') + (extra.length ? ` — EXTRA ${extra.slice(0, 3).join(',')}` : ''));
    const scBad: string[] = [], vBad: string[] = [], tBad: string[] = [];
    for (const [name, fv] of fxByName) {
      const ov = outByName.get(name); if (!ov) continue;
      if (fv.resolvedType !== ov.resolvedType) tBad.push(name);
      if (JSON.stringify([...fv.scopes].sort()) !== JSON.stringify([...ov.scopes].sort())) scBad.push(name);
      if (fv.value !== ov.value) vBad.push(name);
    }
    ok(tBad.length === 0 && scBad.length === 0, `figma font-fluid.${mode}: scopes + resolvedType match fixture` + (tBad.length ? ` — types: ${tBad.slice(0, 3).join(',')}` : '') + (scBad.length ? ` — scopes: ${scBad.slice(0, 3).join(',')}` : ''));
    ok(vBad.length === 0, `figma font-fluid.${mode}: per-mode FONT_SIZE values match fixture` + (vBad.length ? ` — ${vBad.slice(0, 3).join(',')}` : ''));
  }

  // (c) text-styles — the six §4 fixes, gated against the CORRECTED expectation
  // (the pre-fix fixture is a structural reference; use it to build the expected
  // fluid/underline set + resolved fontSize per mode, then verify the fixes).
  const ts = buildFigmaTextStyles(theme);
  const preFix = JSON.parse(readFileSync(resolve(FIXDIR, 'text-styles.json'), 'utf8'));
  // Fixture strips the `text/` prefix → the corrected name is the composite path.
  const expectedByCorrectedName = new Map<string, any>(preFix.styles.map((s: any) => [String(s.name).replace(/^text\//, ''), s]));
  const emittedByName = new Map<string, any>(ts.styles.map((s: any) => [s.name, s]));
  const missS = [...expectedByCorrectedName.keys()].filter((n) => !emittedByName.has(n));
  const extraS = [...emittedByName.keys()].filter((n) => !expectedByCorrectedName.has(n));
  ok(missS.length === 0 && extraS.length === 0, `figma text-styles: same 36 styles as fixture — fix #1 (no \`text/\` wrapper)` + (missS.length ? ` — MISSING ${missS.slice(0, 3).join(',')}` : '') + (extraS.length ? ` — EXTRA ${extraS.slice(0, 3).join(',')}` : ''));

  // fix #1 sanity — no emitted style starts with `text/`.
  const wrapped = ts.styles.filter((s) => s.name.startsWith('text/'));
  ok(wrapped.length === 0, 'figma text-styles: fix #1 — no emitted style name starts with `text/`');

  const collBad: string[] = [], famBad: string[] = [], sizeBind: string[] = [], weightBind: string[] = [];
  const lhWrong: string[] = [], lsWrong: string[] = [], styleWrong: string[] = [];
  const upperMismatch: string[] = [], decoMismatch: string[] = [];
  for (const s of ts.styles) {
    const p = s.properties;
    // fix #2 — collection is the typography primitive `core-font` (renamed from `font`, #66) or
    // `type-sets` (renamed from `font-fluid`) for the fluid composites. The bound VARIABLE names
    // still mirror the DTCG paths (`font/…`, `font-fluid/…`) — the rename is a collection label only.
    const fx = expectedByCorrectedName.get(s.name);
    if (!fx) continue;
    if (!(p.fontFamily as any).bound || (p.fontFamily as any).collection !== 'core-font') collBad.push(`${s.name}:family`);
    if (!(p.fontSize as any).bound || !['core-font', 'type-sets'].includes((p.fontSize as any).collection)) collBad.push(`${s.name}:size`);
    if (!(p.fontWeight as any).bound || (p.fontWeight as any).collection !== 'core-font') collBad.push(`${s.name}:weight`);
    // The pre-fix fixture bound fontSize to the same collection the corrected
    // emit chooses (font-fluid for fluid composites, font for static) — that
    // structure survives the fixes. Verify same binding target.
    if ((p.fontSize as any).variable !== fx.properties.fontSize.variable) sizeBind.push(`${s.name}: ${(p.fontSize as any).variable} ≠ ${fx.properties.fontSize.variable}`);
    if ((p.fontWeight as any).variable !== fx.properties.fontWeight.variable) weightBind.push(`${s.name}: ${(p.fontWeight as any).variable} ≠ ${fx.properties.fontWeight.variable}`);
    if ((p.fontFamily as any).variable !== fx.properties.fontFamily.variable) famBad.push(`${s.name}: ${(p.fontFamily as any).variable} ≠ ${fx.properties.fontFamily.variable}`);

    // fix #3a — lineHeight PERCENT, matches fontSize×multiplier / fontSize×100.
    const lh = (p.lineHeight as any).value;
    if (lh.unit !== 'PERCENT') lhWrong.push(`${s.name}:unit=${lh.unit}`);
    // Compare to the pre-fix PIXELS bake: percent × (fixture fontSize) / 100 should equal fixture PIXELS,
    // within a rounding tolerance (fixture bakes at desktop size for fluid composites).
    const fxLhPx = fx.properties.lineHeight.value.value;
    // Reconstruct the multiplier the fixture implies: fx px / fx desktop fontSize.
    const fxDesktopSize = (fx.properties.fontSize.resolvedByMode?.desktop ?? fx.properties.fontSize.resolvedByMode?.Default) as number;
    const expectedPercent = Math.round((fxLhPx / fxDesktopSize) * 100);
    if (Math.abs(lh.value - expectedPercent) > 1) lhWrong.push(`${s.name}:${lh.value}%≠${expectedPercent}% (fixture ${fxLhPx}px/${fxDesktopSize}px)`);

    // fix #3b (partial: PERCENT baked, not yet bindable). Same reconstruction —
    // fixture LS px / fx desktop size → PERCENT × 100 rounded.
    const ls = (p.letterSpacing as any).value;
    if (ls.unit !== 'PERCENT') lsWrong.push(`${s.name}:unit=${ls.unit}`);
    const fxLsPx = fx.properties.letterSpacing.value.value;
    const expectedLsPct = Math.round((fxLsPx / fxDesktopSize) * 10000) / 100;
    if (Math.abs(ls.value - expectedLsPct) > 0.01) lsWrong.push(`${s.name}:${ls.value}%≠${expectedLsPct}% (fixture ${fxLsPx}px/${fxDesktopSize}px)`);

    // fix #5 — fontStyle derived from weight-role numeric via named-instance table.
    // Compare against the derived expectation (not the fixture's baked string —
    // it happens to agree today for NB's weights + Inter).
    const fxStyle = fx.properties.fontStyle.value;
    if ((p.fontStyle as any).value !== fxStyle) styleWrong.push(`${s.name}: emitted ${(p.fontStyle as any).value} ≠ fixture ${fxStyle}`);

    // Preserved from spec: eyebrow uppercase + link underline.
    if ((p.textCase as any).value !== fx.properties.textCase.value) upperMismatch.push(`${s.name}: ${(p.textCase as any).value} ≠ ${fx.properties.textCase.value}`);
    if ((p.textDecoration as any).value !== fx.properties.textDecoration.value) decoMismatch.push(`${s.name}: ${(p.textDecoration as any).value} ≠ ${fx.properties.textDecoration.value}`);
  }
  ok(collBad.length === 0, 'figma text-styles: fix #2 — every bound property uses the prescribed collection (core-font / type-sets)' + (collBad.length ? ` — ${collBad.slice(0, 3).join(', ')}` : ''));
  ok(famBad.length === 0, 'figma text-styles: fix #4 — fontFamily binds font/family/<role> (primary face; full stack in variable description)' + (famBad.length ? ` — ${famBad.slice(0, 3).join('; ')}` : ''));
  ok(sizeBind.length === 0, 'figma text-styles: fontSize binds the same var as the fixture (font/<size> or font-fluid/<path>)' + (sizeBind.length ? ` — ${sizeBind.slice(0, 3).join('; ')}` : ''));
  ok(weightBind.length === 0, 'figma text-styles: fontWeight binds font/weight-role/<role>' + (weightBind.length ? ` — ${weightBind.slice(0, 3).join('; ')}` : ''));
  ok(lhWrong.length === 0, 'figma text-styles: fix #3a — lineHeight baked as PERCENT (unit=PERCENT, value = round(multiplier×100))' + (lhWrong.length ? ` — ${lhWrong.slice(0, 3).join('; ')}` : ''));
  ok(lsWrong.length === 0, 'figma text-styles: fix #3b — letterSpacing baked as PERCENT (unit=PERCENT, value = em×100)' + (lsWrong.length ? ` — ${lsWrong.slice(0, 3).join('; ')}` : ''));
  ok(styleWrong.length === 0, 'figma text-styles: fix #5 — fontStyle derived from weight-role via the named-instance table' + (styleWrong.length ? ` — ${styleWrong.slice(0, 3).join('; ')}` : ''));
  ok(upperMismatch.length === 0, 'figma text-styles: textCase preserved (eyebrow UPPER, else ORIGINAL)' + (upperMismatch.length ? ` — ${upperMismatch.slice(0, 3).join('; ')}` : ''));
  ok(decoMismatch.length === 0, 'figma text-styles: textDecoration preserved (-link → UNDERLINE, else NONE)' + (decoMismatch.length ? ` — ${decoMismatch.slice(0, 3).join('; ')}` : ''));

  // fontStyleName table sanity — mono collapses 600 to Medium (JetBrains Mono has no Semi Bold).
  ok(fontStyleName('text', 700) === 'Bold' && fontStyleName('display', 600) === 'Semi Bold', 'figma fontStyleName: sans/display weight → real style name (700=Bold, 600=Semi Bold)');
  ok(fontStyleName('mono', 600) === 'Medium' && fontStyleName('mono', 400) === 'Regular', 'figma fontStyleName: mono collapses 600→Medium (JetBrains Mono lacks Semi Bold)');
}
// (13) EMIT-FIGMA DIMS (docs/10 §7 item 2) — the geometric axis has NO fixtures
// (§2 freezes only colour + typography). Gate structurally: variable counts vs
// the DTCG tree, every alias resolves within the emitted collections, scopes +
// resolvedType consistent per family. Materialisation-to-verify runs separately
// via the Figma MCP (docs/10 DoD).
{
  const theme = nbTheme();
  const { tree } = buildTree(theme);
  const root = Object.keys(tree)[0];
  const brand = tree[root];
  const dims = buildFigmaDims(theme);

  // (a) Counts match the DTCG tree exactly. Focus is -1 because the
  // strokeStyle leaf (`focus.ring.style: 'solid'`) is intentionally skipped —
  // Figma has no strokeStyle variable primitive.
  const expected = {
    dimension: Object.keys(brand.dimension).length,
    space: Object.keys(brand.space).length,
    radius: Object.keys(brand.radius).length,
    // Counted from the tree, not `× <n> props per t-shirt`: that constant silently went stale the
    // moment `gap` was added (#325), reporting a Figma/DTCG mismatch that was really a stale
    // expectation. Deriving it means a new size sub-leaf is covered automatically.
    size: Object.values(brand.size).reduce((n: number, v: any) => n + Object.keys(v).length, 0),
    'border-width': Object.keys(brand['border-width']).length,
    focus: Object.keys(brand.focus.ring).filter((k) => brand.focus.ring[k].$type === 'dimension').length,
    opacity: Object.keys(brand.opacity).length,
  };
  const got = {
    dimension: dims.dimension.variables.length,
    space: dims.space.variables.length,
    radius: dims.radius[0].variables.length,
    size: dims.size.variables.length,
    'border-width': dims.borderWidth.variables.length,
    focus: dims.focus.variables.length,
    opacity: dims.opacity.variables.length,
  };
  for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
    ok(expected[key] === got[key], `figma dims.${key}: variable count matches DTCG tree (${expected[key]})` + (expected[key] !== got[key] ? ` — got ${got[key]}` : ''));
  }

  // (b) Every FLOAT var carries a valid non-empty scope set and resolvedType=FLOAT.
  // radius is now per-mode (Pillar 1b); the Default-mode file is [0], byte-identical
  // to the pre-1b world for a non-wireframe brand like NB.
  const allDimColls = [dims.dimension, dims.space, dims.radius[0], dims.size, dims.borderWidth, dims.focus, dims.opacity];
  const badType: string[] = [], badScope: string[] = [];
  for (const c of allDimColls) for (const v of c.variables) {
    if (v.resolvedType !== 'FLOAT') badType.push(`${c.$collection}:${v.name}`);
    if (!v.scopes || v.scopes.length === 0) badScope.push(`${c.$collection}:${v.name}`);
  }
  ok(badType.length === 0, 'figma dims: every variable is resolvedType FLOAT' + (badType.length ? ` — ${badType.slice(0, 3).join(', ')}` : ''));
  ok(badScope.length === 0, 'figma dims: every variable declares at least one scope' + (badScope.length ? ` — ${badScope.slice(0, 3).join(', ')}` : ''));

  // (c) Every alias target resolves within the emitted collections.
  const allNames = new Set<string>();
  for (const c of allDimColls) for (const v of c.variables) allNames.add(v.name);
  const missingTargets: string[] = [];
  for (const c of allDimColls) for (const v of c.variables) {
    if (v.alias && !allNames.has(v.alias.name)) missingTargets.push(`${c.$collection}:${v.name} → ${v.alias.name}`);
  }
  ok(missingTargets.length === 0, 'figma dims: every alias resolves within the emitted collections' + (missingTargets.length ? ` — ${missingTargets.slice(0, 3).join(', ')}` : ''));

  // (d) Scopes narrow correctly per family — the picker in Figma should only
  // show `space/*` under GAP contexts, `radius/*` under CORNER_RADIUS, etc.
  // `dimension` (ref-tier primitive) keeps its broad scope so, if a component
  // author unhides + uses one directly, guidance is still correct.
  const scopeFor: Record<string, string[]> = {
    dimension: ['WIDTH_HEIGHT', 'GAP', 'CORNER_RADIUS', 'STROKE_FLOAT'],
    space: ['GAP'],
    radius: ['CORNER_RADIUS'],
    'border-width': ['STROKE_FLOAT'],
    focus: ['STROKE_FLOAT'],
    opacity: ['OPACITY'],
  };
  const scopeMismatch: string[] = [];
  for (const c of allDimColls) {
    const expect = scopeFor[c.$collection];
    if (!expect) continue; // size scopes vary per prop — checked separately below
    for (const v of c.variables) {
      if (JSON.stringify(v.scopes) !== JSON.stringify(expect)) scopeMismatch.push(`${c.$collection}:${v.name} = ${v.scopes.join(',')}`);
    }
  }
  ok(scopeMismatch.length === 0, 'figma dims: scopes narrow per family (space→GAP, radius→CORNER_RADIUS, border-width/focus→STROKE_FLOAT, opacity→OPACITY, dimension broad)' + (scopeMismatch.length ? ` — ${scopeMismatch.slice(0, 3).join('; ')}` : ''));

  // (e) size — height binds WIDTH_HEIGHT + aliases dimension; padding binds
  // GAP + aliases space. Verifies the component tier composes the shared
  // primitives correctly.
  const sizeBad: string[] = [];
  for (const v of dims.size.variables) {
    const isHeight = v.name.endsWith('/height');
    const isPadding = v.name.includes('/padding-');
    if (isHeight) {
      if (JSON.stringify(v.scopes) !== JSON.stringify(['WIDTH_HEIGHT'])) sizeBad.push(`${v.name}:scope=${v.scopes.join(',')}`);
      if (v.alias && !v.alias.name.startsWith('dimension/')) sizeBad.push(`${v.name}:alias=${v.alias.name} (want dimension/*)`);
    } else if (isPadding) {
      if (JSON.stringify(v.scopes) !== JSON.stringify(['GAP'])) sizeBad.push(`${v.name}:scope=${v.scopes.join(',')}`);
      if (v.alias && !v.alias.name.startsWith('space/')) sizeBad.push(`${v.name}:alias=${v.alias.name} (want space/*)`);
    }
  }
  ok(sizeBad.length === 0, 'figma size: heights alias dimension/* (WIDTH_HEIGHT); paddings alias space/* (GAP) — component tier composes shared primitives' + (sizeBad.length ? ` — ${sizeBad.slice(0, 3).join('; ')}` : ''));

  // (f) opacity — Figma's OPACITY-scoped FLOAT is PERCENT (0–100), not fraction.
  // The adapter multiplies the DTCG 0–1 by 100 (see the comment in buildFigmaDims).
  // Verify each emitted value is a number in [0,100] AND matches DTCG × 100.
  const opBad = dims.opacity.variables.filter((v) => typeof v.value !== 'number' || (v.value as number) < 0 || (v.value as number) > 100);
  ok(opBad.length === 0, `figma opacity: every value is a number in [0,100] (PERCENT for Figma OPACITY scope)` + (opBad.length ? ` — ${opBad.slice(0, 3).map((v) => `${v.name}=${v.value}`).join(', ')}` : ''));
  const opMismatch: string[] = [];
  for (const v of dims.opacity.variables) {
    const key = v.name.split('/')[1];
    const dtcg = brand.opacity[key]?.$value as number;
    if (Math.abs((v.value as number) - Math.round(dtcg * 100)) > 0) opMismatch.push(`${v.name}: ${v.value} ≠ ${Math.round(dtcg * 100)} (DTCG ${dtcg} × 100)`);
  }
  ok(opMismatch.length === 0, `figma opacity: every emitted value = DTCG fraction × 100` + (opMismatch.length ? ` — ${opMismatch.slice(0, 3).join(', ')}` : ''));

  // (g) focus does NOT include the strokeStyle leaf (no Figma variable primitive
  // for strokeStyle — 'solid' stays a code-side literal).
  const hasStrokeStyle = dims.focus.variables.some((v) => v.name === 'focus/ring/style');
  ok(!hasStrokeStyle, `figma focus: strokeStyle leaf skipped (no Figma primitive for strokeStyle; the 'solid' literal stays code-side)`);

  // (h) Every dims var carries a non-empty description from the DTCG tree — the
  // source-of-truth prose lands in Figma's Variables-panel sidebar (namespace
  // stays out of the variable name per §3, but the DTCG `nbds.space.100 — 8px
  // (1× 8px base)` prose is visible on hover).
  const emptyDescs: string[] = [];
  for (const c of allDimColls) for (const v of c.variables) {
    if (!v.description || v.description.length === 0) emptyDescs.push(`${c.$collection}:${v.name}`);
  }
  ok(emptyDescs.length === 0, 'figma dims: every variable carries the DTCG $description (namespace-stripped names + rich prose in the Variables sidebar)' + (emptyDescs.length ? ` — ${emptyDescs.slice(0, 3).join(', ')}` : ''));
}
// (14) EMIT-FIGMA SHADOW + GRADIENT (docs/10 §7 item 3) — styles, not variables.
// Figma Effect Styles + Paint Styles ride the Plugin API (docs/08 §5). Shadow
// is mode-aware via two style sets (light + dark); gradient is opt-in per brand.
// No fixtures for this axis either — gate structurally + verify the aurora
// (opt-in) path emits non-empty gradient styles.
{
  const nb = nbTheme();
  const { tree: nbTree } = buildTree(nb);
  const nbRoot = Object.keys(nbTree)[0];
  const nbShadowKeys = Object.keys(nbTree[nbRoot].shadow ?? {});
  const shadows = buildFigmaShadow(nb);

  // (a) One style per shadow step, TWO SETS (light + dark). NB ships 7 steps
  // (xs..2xl + inset) × 2 modes = 14 styles.
  ok(shadows.styles.length === nbShadowKeys.length * 2, `figma shadow: emits N×2 styles for N shadow steps (light + dark mode sets) — expected ${nbShadowKeys.length * 2}, got ${shadows.styles.length}`);

  // (b) Names split cleanly by prefix.
  const lightNames = shadows.styles.filter((s) => s.name.startsWith('shadow/')).map((s) => s.name);
  const darkNames = shadows.styles.filter((s) => s.name.startsWith('shadow-dark/')).map((s) => s.name);
  ok(lightNames.length === nbShadowKeys.length && darkNames.length === nbShadowKeys.length, `figma shadow: N light styles ('shadow/*') + N dark styles ('shadow-dark/*') — got ${lightNames.length}L / ${darkNames.length}D`);

  // (c) Every effect layer has color + offset + radius + spread + type +
  // blendMode. Colours have {r,g,b,a} in [0,1].
  const badEffect: string[] = [], badColor: string[] = [];
  for (const s of shadows.styles) for (const e of s.effects) {
    if (!e.type || !e.offset || typeof e.radius !== 'number' || typeof e.spread !== 'number' || !e.color || e.blendMode !== 'NORMAL') badEffect.push(`${s.name}: missing fields`);
    for (const ch of ['r', 'g', 'b', 'a'] as const) {
      const v = (e.color as any)[ch];
      if (typeof v !== 'number' || v < 0 || v > 1) badColor.push(`${s.name}: color.${ch}=${v}`);
    }
  }
  ok(badEffect.length === 0, 'figma shadow: every effect has type/offset/radius/spread/color/blendMode' + (badEffect.length ? ` — ${badEffect.slice(0, 3).join('; ')}` : ''));
  ok(badColor.length === 0, 'figma shadow: every colour channel is in [0,1] (Figma float32)' + (badColor.length ? ` — ${badColor.slice(0, 3).join('; ')}` : ''));

  // (d) The `inset` shadow uses INNER_SHADOW; the rest DROP_SHADOW.
  const insetStyle = shadows.styles.find((s) => s.name === 'shadow/inset');
  const dropStyle = shadows.styles.find((s) => s.name === 'shadow/xs' || s.name === 'shadow/sm');
  ok(!!insetStyle && insetStyle.effects.every((e) => e.type === 'INNER_SHADOW'), `figma shadow: 'shadow/inset' uses INNER_SHADOW`);
  ok(!!dropStyle && dropStyle.effects.every((e) => e.type === 'DROP_SHADOW'), `figma shadow: elevation steps use DROP_SHADOW`);

  // (e) Dark alphas are LOWER than light (reduced — the surface-lift pattern).
  // Cross-check the same step in shadow/xs vs shadow-dark/xs.
  const lightXs = shadows.styles.find((s) => s.name === 'shadow/xs');
  const darkXs = shadows.styles.find((s) => s.name === 'shadow-dark/xs');
  const lightAlpha = lightXs?.effects[0].color.a ?? 0;
  const darkAlpha = darkXs?.effects[0].color.a ?? 0;
  ok(darkAlpha > 0 && darkAlpha < lightAlpha, `figma shadow: dark shadow is REDUCED vs light (surface-lift; dark ${darkAlpha.toFixed(3)} < light ${lightAlpha.toFixed(3)})`);

  // (f) Descriptions carry the DTCG prose + mode annotation.
  const badDesc = shadows.styles.filter((s) => !s.description || (!s.description.includes('light mode') && !s.description.includes('dark mode')));
  ok(badDesc.length === 0, 'figma shadow: every style description names its mode (light/dark)' + (badDesc.length ? ` — ${badDesc.slice(0, 3).map((s) => s.name).join(', ')}` : ''));

  // (g) GRADIENT — NB opts out → 0 styles emitted (empty file, consistent shape).
  const nbGradient = buildFigmaGradient(nb);
  ok(nbGradient.styles.length === 0, 'figma gradient: NB has no gradients — emits empty styles[] (consistent shape across brands)');
  ok(nbGradient.$collection === 'gradient-styles', `figma gradient: collection name 'gradient-styles' even when empty`);

  // (h) Aurora opts in → 2 gradients (brand + glow). Every stop's alias
  // resolves to a real palette leaf via the tree.
  const aurora = brandTheme(exampleBrands()['aurora'] as BrandInput);
  const { tree: auroraTree } = buildTree(aurora);
  const auroraGradient = buildFigmaGradient(aurora);
  ok(auroraGradient.styles.length > 0, `figma gradient (aurora): opt-in brand emits gradients — got ${auroraGradient.styles.length}`);

  const paintBad: string[] = [];
  for (const s of auroraGradient.styles) {
    if (!['GRADIENT_LINEAR', 'GRADIENT_RADIAL'].includes(s.paintType)) paintBad.push(`${s.name}: paintType=${s.paintType}`);
    if (!s.stops || s.stops.length < 2) paintBad.push(`${s.name}: <2 stops`);
    if (!s.sampledStops || s.sampledStops.length < 3) paintBad.push(`${s.name}: sampledStops<3`);
  }
  ok(paintBad.length === 0, 'figma gradient (aurora): every style has paintType + stops≥2 + sampledStops≥3 (OKLCH pre-sample)' + (paintBad.length ? ` — ${paintBad.slice(0, 3).join('; ')}` : ''));

  const aliasBad: string[] = [];
  for (const s of auroraGradient.styles) for (const stop of s.stops) {
    if (!stop.alias) { aliasBad.push(`${s.name}: stop@${stop.position} has no alias`); continue; }
    // Resolve `palette/primary/600` → the DTCG path `<root>.palette.primary.600` → leaf must exist.
    const path = `${Object.keys(auroraTree)[0]}.${stop.alias.replace(/\//g, '.')}`;
    const leaf = path.split('.').reduce((n: any, seg) => n?.[seg], auroraTree);
    if (!leaf || leaf.$type !== 'color') aliasBad.push(`${s.name}: alias ${stop.alias} does not resolve`);
  }
  ok(aliasBad.length === 0, 'figma gradient (aurora): every stop alias resolves to a real palette colour leaf' + (aliasBad.length ? ` — ${aliasBad.slice(0, 3).join('; ')}` : ''));

  // (i) a11y worst-case ratios ride alongside so plugins can flag text-on-gradient risks.
  const noA11y = auroraGradient.styles.filter((s) => !s.a11y || typeof s.a11y.worstOnWhite !== 'number');
  ok(noA11y.length === 0, `figma gradient (aurora): every style carries a11y.worstOnWhite / worstOnBlack — the text-on-gradient contract`);
}

// (15) NAMESPACE (docs/00 "Namespace") — `root` is the single, customizable, mode-
// invariant token namespace. Default is the 'prism' placeholder; a custom root re-homes
// EVERY token under `<root>.*` with no 'prism' leaking into any alias (the gradient-stop
// hardcode class of bug). One segment only — a dotted/spaced root is rejected.
{
  const { input } = parseDesignMd(readFileSync(resolve(HERE, '../examples/aurora.design.md'), 'utf8'));

  // default: no root → the 'prism' placeholder, byte-identical world (asserted in block 3)
  const def = brandTheme(input);
  ok(def.root === 'prism' && def.namespace === 'prism.palette', 'namespace: omitted root defaults to the prism placeholder');
  ok(Object.keys(buildTree(def).tree)[0] === 'prism', 'namespace: default tree is rooted at prism');

  // custom: re-home under 'acme'
  const custom = brandTheme({ ...input, root: 'acme' });
  ok(custom.root === 'acme' && custom.namespace === 'acme.palette', 'namespace: custom root sets root + <root>.palette');
  const ctree = buildTree(custom).tree;
  ok(Object.keys(ctree)[0] === 'acme' && !('prism' in ctree), 'namespace: custom tree is rooted at acme, no prism key');

  // the load-bearing assertion: every alias in the tree re-homes to {acme.…} — nothing
  // keeps a {prism.…} target (walks composite $values: typography/gradient/shadow/motion).
  const aliases: string[] = [];
  const walk = (n: any): void => {
    if (typeof n === 'string') { if (/^\{[^}]+\}$/.test(n)) aliases.push(n); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n && typeof n === 'object') { for (const v of Object.values(n)) walk(v); }
  };
  walk(ctree.acme);
  const leaked = aliases.filter((a) => !a.startsWith('{acme.'));
  ok(aliases.length > 0 && leaked.length === 0, `namespace: every alias re-homes to {acme.…} (${aliases.length} aliases)` + (leaked.length ? ` — LEAKED ${leaked.slice(0, 3).join(', ')}` : ''));

  // one segment only — a dotted or spaced root is rejected at the engine boundary
  let threw = false;
  try { brandTheme({ ...input, root: 'ac.me' }); } catch { threw = true; }
  ok(threw, 'namespace: a two-segment (dotted) root throws');

  // schema half agrees: accepts a clean root, rejects a dotted one
  ok(validateBrandInput({ ...input, root: 'acme' }).length === 0, 'namespace: schema accepts a single-segment root');
  ok(validateBrandInput({ ...input, root: 'ac.me' }).length > 0, 'namespace: schema rejects a dotted root');

  // CR-03: brand-colour names are validated at the engine boundary. A last-wins palette map
  // means a name colliding with an engine ramp (neutral/primary/status) or a duplicate would
  // silently corrupt output with green gates — so reserved / bad-charset / duplicate all throw.
  // (aurora's gradient references its 'accent' brandColor, so drop both here to isolate the name guard)
  const bc = (name: string) => ({ ...input, actionPalette: 'primary', gradients: [], brandColors: [{ name, oklch: { l: 0.55, c: 0.15, h: 235 } }] });
  const rejects = (name: string) => { try { brandTheme(bc(name)); return false; } catch { return true; } };
  ok(brandTheme(bc('brand-blue')).palettes.some((p) => p.palette === 'brand-blue'), 'CR-03: a valid slug brand-colour name is accepted');
  ok(rejects('neutral') && rejects('primary'), 'CR-03: a brand color named after an engine ramp (neutral/primary) throws (would hijack it)');
  ok(rejects('success') && rejects('white'), 'CR-03: a brand color named after a reserved palette (status / base swatch) throws');
  ok(rejects('my.accent') && rejects('brand blue') && rejects('<img>'), 'CR-03: dotted / spaced / symbol brand-colour names throw (alias-path + XSS charset guard)');
  let dupThrew = false;
  try { brandTheme({ ...input, actionPalette: 'primary', gradients: [], brandColors: [{ name: 'twin', oklch: { l: 0.5, c: 0.1, h: 10 } }, { name: 'twin', oklch: { l: 0.6, c: 0.1, h: 200 } }] }); } catch { dupThrew = true; }
  ok(dupThrew, 'CR-03: duplicate brand-colour names throw');
  ok(validateBrandInput(bc('brand-blue')).length === 0 && validateBrandInput(bc('my.accent')).length > 0, 'CR-03: schema pattern accepts a slug, rejects a dotted brand-colour name');

  // CR-04: the hand-rolled validator must enforce keyword classes it used to ignore — else
  // `[schema] ✓ conforms` vouches for inputs brandTheme then crashes on / mis-emits. Baseline:
  // aurora conforms (its `variable` is a per-face object — the schema now describes boolean|object).
  ok(validateBrandInput(input).length === 0, 'CR-04: a valid brand (aurora) conforms');
  // boolean branch (via gradients oneOf: [boolean, array]) — the headline probe.
  ok(validateBrandInput({ ...input, gradients: 'banana' as any }).length > 0, 'CR-04: gradients:"banana" rejected (no boolean branch used to let it match the oneOf)');
  ok(validateBrandInput({ ...input, gradients: true as any }).length === 0, 'CR-04: gradients:true still accepted (valid boolean)');
  // numeric enum (was only checked under type:string)
  ok(validateBrandInput({ ...input, typography: { ...(input.typography ?? {}), titleFloor: 17 } as any }).length > 0, 'CR-04: titleFloor:17 rejected (numeric enum [16,18] now enforced)');
  ok(validateBrandInput({ ...input, typography: { ...(input.typography ?? {}), titleFloor: 18 } as any }).length === 0, 'CR-04: titleFloor:18 accepted (in enum)');
  // minItems / maxItems (never checked before)
  ok(validateBrandInput({ ...input, motionPersonality: { easingEmphasized: [0.2, 0] } as any }).length > 0, 'CR-04: easingEmphasized [0.2,0] rejected (minItems 4)');
  ok(validateBrandInput({ ...input, motionPersonality: { easingEmphasized: [0.2, 0, 0.4, 1] } as any }).length === 0, 'CR-04: a 4-length easing accepted');
  // families.variable is boolean|per-face-object — a string matches neither
  ok(validateBrandInput({ ...input, typography: { families: { variable: 'yes' } } as any }).length > 0, 'CR-04: families.variable:"yes" rejected (boolean|object, not string)');
  ok(validateBrandInput({ ...input, typography: { families: { variable: { display: true } } } as any }).length === 0, 'CR-04: families.variable per-face object accepted');
}

// (16) PIN-A-NEUTRAL (docs/00 "pin-a-neutral") — a brand that ships a pre-defined grey sets
// `neutral.anchor`; the ramp is then built AROUND it (pinned verbatim at its lightness step,
// same mechanism as the brand palettes) instead of derived from the hue/chroma cast. Verifies
// the pinned grey is reproduced, the derived ramp genuinely differs, it reaches the DTCG tree,
// and the schema accepts it.
{
  const { input } = parseDesignMd(readFileSync(resolve(HERE, '../examples/aurora.design.md'), 'utf8'));
  const grey = { l: 0.55, c: 0.006, h: 70 };           // a warm grey, hue ≠ aurora's neutral cast (285)
  const placed = autoPlaceStep(grey.l);

  const pinnedTheme = brandTheme({ ...input, neutral: { ...input.neutral, anchor: grey } });
  const derivedTheme = brandTheme(input);
  const pinnedStep = pinnedTheme.palettes.find((p) => p.palette === 'neutral')!.steps.find((s) => s.num === placed)!;
  const derivedStep = derivedTheme.palettes.find((p) => p.palette === 'neutral')!.steps.find((s) => s.num === placed)!;

  ok(deltaE2000(pinnedStep.rgb, oklchToRgb(grey)) < 1, `pin-a-neutral: the pinned grey is reproduced at neutral.${placed} (ΔE ${deltaE2000(pinnedStep.rgb, oklchToRgb(grey)).toFixed(2)})`);
  ok(deltaE2000(derivedStep.rgb, oklchToRgb(grey)) > 1, 'pin-a-neutral: the derived ramp genuinely differs (pin actually re-homes the ramp)');

  // reaches the DTCG tree: the pinned hex lands at that step under <root>.palette.neutral
  const ntree = buildTree(pinnedTheme).tree as any;
  ok(ntree.prism.palette.neutral[pinnedStep.key].$value === pinnedStep.hex, 'pin-a-neutral: the pinned grey flows through to the DTCG neutral primitive');

  // schema accepts a pinned neutral
  ok(validateBrandInput({ ...input, neutral: { ...input.neutral, anchor: grey } }).length === 0, 'pin-a-neutral: schema accepts neutral.anchor');
}

// (17) DESIGN.MD ROUND-TRIP (docs/07 §6) — `toDesignMd` is the inverse of `parseDesignMd`:
// serialize a BrandInput to frontmatter, parse it back, and get the SAME input. Guards the
// export leg (the web download) against drift from the parser. Key order is ignored (stable
// deep-compare); only defined keys are emitted so an omitted optional stays omitted.
{
  const stable = (v: any): any => Array.isArray(v) ? v.map(stable)
    : (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v);
  const same = (a: any, b: any) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

  for (const name of ['aurora', 'harbor']) {
    const { input } = parseDesignMd(readFileSync(resolve(HERE, `../examples/${name}.design.md`), 'utf8'));
    ok(same(parseDesignMd(toDesignMd(input)).input, input), `design.md round-trip: toDesignMd→parseDesignMd is identity for ${name}`);
  }

  // a synthetic brand exercising the optional/nested surface: custom root, neutral.anchor,
  // brandColors (array of mappings), actionPalette.
  const synth: any = {
    id: 'synth', root: 'acme', primary: { l: 0.5, c: 0.15, h: 30 },
    neutral: { hue: 30, chroma: 0.006, anchor: { l: 0.5, c: 0.006, h: 30 } },
    brandColors: [{ name: 'accent', oklch: { l: 0.6, c: 0.12, h: 200 } }], actionPalette: 'accent',
  };
  ok(same(parseDesignMd(toDesignMd(synth)).input, synth), 'design.md round-trip: identity for root + neutral.anchor + brandColors + actionPalette');

  // an omitted optional stays omitted (no phantom `root`), and prose survives the fence
  const minimal: any = { id: 'x', primary: { l: 0.5, c: 0.1, h: 200 }, neutral: { hue: 200, chroma: 0.006 } };
  ok(!('root' in parseDesignMd(toDesignMd(minimal)).input), 'design.md round-trip: an omitted optional is not emitted');
  ok(parseDesignMd(toDesignMd(minimal as any, 'Hello prose.')).prose === 'Hello prose.', 'design.md round-trip: prose survives the fence');
}

// (18) MODE CONFIG (docs/11 Pillar 1) — light is the required base; dark/HC/wireframe opt-in.
// Omitted → the default four (back-compat, byte-identical golden in block 3). A light-only
// brand resolves + emits ONE mode with no per-mode colour overrides; light+dark carries the
// dark override but not HC. Wireframe (1b) is a generated greyscale mode (non-neutral roles →
// equivalent neutral; radius → 0), opt-in only. Guards: must include light; unknown mode throws.
{
  const { input } = parseDesignMd(readFileSync(resolve(HERE, '../examples/aurora.design.md'), 'utf8'));

  const def = brandTheme(input);
  ok(def.modes.length === 4 && resolvePreview(def).modes.length === 4, 'mode config: omitted modes → all four');

  const lo = brandTheme({ ...input, modes: ['light'] });
  const loRp = resolvePreview(lo);
  ok(loRp.modes.length === 1 && loRp.modes[0] === 'light', 'mode config: modes:[light] → light only');
  const loTree = (buildTree(lo).tree as any).prism;
  ok(Object.keys(loTree.color.interactive.primary.fill.rest.$extensions.prism3.modes).length === 0, 'mode config: light-only tree emits no per-mode colour overrides');
  ok(Object.keys(loTree.shadow.xs.$extensions.prism3.modes).length === 0, 'mode config: light-only tree emits no per-mode SHADOW overrides (dark reduction gated)');

  const ld = brandTheme({ ...input, modes: ['light', 'dark'] });
  ok(resolvePreview(ld).modes.length === 2, 'mode config: modes:[light,dark] → two modes');
  const ldTree = (buildTree(ld).tree as any).prism;
  ok('dark' in ldTree.color.interactive.primary.fill.rest.$extensions.prism3.modes && !('hc-light' in ldTree.color.interactive.primary.fill.rest.$extensions.prism3.modes), 'mode config: [light,dark] carries the dark override, not HC');
  ok('dark' in ldTree.shadow.xs.$extensions.prism3.modes, 'mode config: [light,dark] keeps the dark shadow reduction');

  let t1 = false, t2 = false;
  try { brandTheme({ ...input, modes: ['dark'] as any }); } catch { t1 = true; }
  try { brandTheme({ ...input, modes: ['light', 'bogus'] as any }); } catch { t2 = true; }
  ok(t1, 'mode config: modes without light throws');
  ok(t2, 'mode config: an unknown mode throws');

  ok(validateBrandInput({ ...input, modes: ['light', 'dark'] }).length === 0, 'mode config: schema accepts a valid modes subset');
  ok(validateBrandInput({ ...input, modes: ['light', 'wireframe'] }).length === 0, 'mode config: schema accepts wireframe (opt-in)');
  ok(validateBrandInput({ ...input, modes: ['light', 'bogus'] }).length > 0, 'mode config: schema rejects an unknown mode');

  // Wireframe (1b): opt-in greyscale mode. Non-neutral roles remap to the neutral ramp at the
  // same position (still clearing each min); radius zeroes. Never a default.
  const wf = brandTheme({ ...input, modes: ['light', 'wireframe'] });
  ok(wf.modes.includes('wireframe') && resolvePreview(wf).modes.includes('wireframe'), 'wireframe: opt-in mode resolves + previews');
  ok(!brandTheme(input).modes.includes('wireframe'), 'wireframe: never a default (opt-in only)');
  const R = wf.root, neutralPal = wf.roleToPalette.neutral, actionPal = wf.roleToPalette.action;
  const wfBuilt = buildTree(wf);
  const wfTree = (wfBuilt.tree as any)[R];
  const act = wfTree.color.interactive.primary.fill.rest;
  ok(actionPal !== neutralPal && act.$value.includes(`.${actionPal}.`), 'wireframe: light $value stays the chromatic (accent) pick');
  ok(act.$extensions.prism3.modes.wireframe.$value.includes(`.${neutralPal}.`), 'wireframe: the wireframe override remaps a chromatic role → neutral (greyscale)');
  ok(wfTree.radius.md.$extensions.prism3.modes?.wireframe?.$value === `{${R}.dimension.0}`, 'wireframe: radius.md carries a wireframe → dimension.0 override');
  ok(!wfTree.radius.none.$extensions?.prism3?.modes, 'wireframe: radius.none (already 0) carries no redundant override');
  const wfMode = wfBuilt.modes.find((m) => m.mode === 'wireframe')!;
  const wfChecks = Object.values(wfMode.roles).filter((r) => r.min > 0);
  ok(wfChecks.length > 0 && wfChecks.every((r) => r.ratio >= r.min), `wireframe: every contrast contract holds on the greyscale (${wfChecks.length} checks)`);
}

// (19) EMIT-FIGMA LAYOUT (docs/10 §7 item 4) — one `layout` variable collection
// with FIVE breakpoint modes (sm/md/lg/xl/2xl). The mode-column here is the
// VIEWPORT (composes independently with the colour light/dark collection).
// No fixtures — gate structurally: 5 mode files, same variable names across
// modes, per-mode alias resolution into space/*, scopes per family, breakpoint
// + container values invariant across modes, container/fluid intentionally
// skipped (no Figma primitive for percentage-of-parent).
{
  const theme = nbTheme();
  const { tree } = buildTree(theme);
  const root = Object.keys(tree)[0];
  const brand = tree[root];
  const dims = buildFigmaDims(theme);
  const layout = buildFigmaLayout(theme);

  // (a) one mode file per breakpoint the brand SHIPS (CR-08 — derived from the grid node, not a
  // hardcoded 5), in ascending order. NB ships the default 5 (sm..2xl == LAYOUT_MODES).
  const gridKeys = Object.keys(brand.grid);
  ok(layout.length === gridKeys.length && layout.length === 5, `figma layout: one mode file per breakpoint (got ${layout.length}, grid has ${gridKeys.length})`);
  const modeSeq = layout.map((l) => l.$mode).join(',');
  ok(modeSeq === gridKeys.join(',') && modeSeq === LAYOUT_MODES.join(','), `figma layout: modes follow the brand's breakpoints [${gridKeys.join(',')}] (got [${modeSeq}])`);
  ok(layout.every((l) => l.$collection === 'layout'), `figma layout: every file is $collection = 'layout'`);

  // (b) Every mode file carries the SAME variable-name set — the mode column
  // is *just* the value axis. Compute the sm names and check the rest against it.
  const nameSets = layout.map((l) => l.variables.map((v) => v.name).sort().join('|'));
  const nameDrift = nameSets.filter((s) => s !== nameSets[0]);
  ok(nameDrift.length === 0, `figma layout: every mode carries the same variable-name set (${layout[0].variables.length} vars)`);

  // (c) Every var is resolvedType FLOAT with a non-empty scope + non-empty description.
  const badType: string[] = [], badScope: string[] = [], emptyDesc: string[] = [];
  for (const l of layout) for (const v of l.variables) {
    if (v.resolvedType !== 'FLOAT') badType.push(`${l.$mode}:${v.name}`);
    if (!v.scopes || v.scopes.length === 0) badScope.push(`${l.$mode}:${v.name}`);
    if (!v.description || v.description.length === 0) emptyDesc.push(`${l.$mode}:${v.name}`);
  }
  ok(badType.length === 0, 'figma layout: every variable is resolvedType FLOAT' + (badType.length ? ` — ${badType.slice(0, 3).join(', ')}` : ''));
  ok(badScope.length === 0, 'figma layout: every variable declares at least one scope' + (badScope.length ? ` — ${badScope.slice(0, 3).join(', ')}` : ''));
  ok(emptyDesc.length === 0, 'figma layout: every variable carries the DTCG $description' + (emptyDesc.length ? ` — ${emptyDesc.slice(0, 3).join(', ')}` : ''));

  // (d) Scopes narrow correctly per family. grid/columns is ALL_SCOPES (no
  // narrow scope fits a count); grid/{gutter,margin} → GAP (matches space);
  // container/{max,narrow} + breakpoint/* → WIDTH_HEIGHT.
  const scopeFor = (name: string): string[] => {
    if (name === 'grid/columns') return ['ALL_SCOPES'];
    if (name === 'grid/gutter' || name === 'grid/margin') return ['GAP'];
    if (name.startsWith('container/') || name.startsWith('breakpoint/')) return ['WIDTH_HEIGHT'];
    return [];
  };
  const scopeMismatch: string[] = [];
  for (const l of layout) for (const v of l.variables) {
    const expect = scopeFor(v.name);
    if (JSON.stringify(v.scopes) !== JSON.stringify(expect)) scopeMismatch.push(`${l.$mode}:${v.name}=${v.scopes.join(',')} (want ${expect.join(',')})`);
  }
  ok(scopeMismatch.length === 0, 'figma layout: scopes narrow per family (grid.columns→ALL_SCOPES; grid.gutter/margin→GAP; container/*+breakpoint/*→WIDTH_HEIGHT)' + (scopeMismatch.length ? ` — ${scopeMismatch.slice(0, 3).join('; ')}` : ''));

  // (e) grid/gutter + grid/margin are ALIASES into space/* (per-mode — the
  // point of the mode column is that gutter+margin grow with the breakpoint).
  // Every alias must resolve to a real space var in the emitted dims artifact.
  const spaceNames = new Set(dims.space.variables.map((v) => v.name));
  const aliasBad: string[] = [];
  for (const l of layout) for (const v of l.variables) {
    if (v.name === 'grid/gutter' || v.name === 'grid/margin') {
      if (!v.alias) { aliasBad.push(`${l.$mode}:${v.name} has no alias`); continue; }
      if (!v.alias.name.startsWith('space/')) aliasBad.push(`${l.$mode}:${v.name} → ${v.alias.name} (want space/*)`);
      if (!spaceNames.has(v.alias.name)) aliasBad.push(`${l.$mode}:${v.name} → ${v.alias.name} (not in space collection)`);
    }
  }
  ok(aliasBad.length === 0, 'figma layout: grid/gutter + grid/margin alias into space/* (per-mode) and every target resolves' + (aliasBad.length ? ` — ${aliasBad.slice(0, 3).join('; ')}` : ''));

  // (f) grid/columns is a plain FLOAT (no alias — it's a count, not a
  // dimension). columns matches the DTCG's per-breakpoint value.
  const colsBad: string[] = [];
  for (const l of layout) {
    const cols = l.variables.find((v) => v.name === 'grid/columns');
    if (!cols) { colsBad.push(`${l.$mode}: no grid/columns`); continue; }
    if (cols.alias !== null) colsBad.push(`${l.$mode}: grid/columns has alias (want plain FLOAT)`);
    const dtcg = brand.grid[l.$mode].columns.$value;
    if (cols.value !== dtcg) colsBad.push(`${l.$mode}: grid/columns=${cols.value} ≠ DTCG ${dtcg}`);
  }
  ok(colsBad.length === 0, 'figma layout: grid/columns is a plain FLOAT count matching the DTCG per-breakpoint value' + (colsBad.length ? ` — ${colsBad.slice(0, 3).join('; ')}` : ''));

  // (g) container/max + container/narrow are viewport-invariant — SAME value
  // in every mode. Same for breakpoint/* (min-width thresholds are constants;
  // the breakpoint COLUMN varies, but each named breakpoint's px is fixed).
  const invariantBad: string[] = [];
  for (const name of ['container/max', 'container/narrow', 'breakpoint/sm', 'breakpoint/md', 'breakpoint/lg', 'breakpoint/xl', 'breakpoint/2xl']) {
    const vals = layout.map((l) => l.variables.find((v) => v.name === name)?.value);
    const distinct = new Set(vals);
    if (distinct.size !== 1) invariantBad.push(`${name} varies across modes: ${[...distinct].join(',')}`);
  }
  ok(invariantBad.length === 0, 'figma layout: container/* + breakpoint/* are viewport-invariant (same value in every mode)' + (invariantBad.length ? ` — ${invariantBad.slice(0, 3).join('; ')}` : ''));

  // (h) container/fluid is INTENTIONALLY SKIPPED — Figma has no FLOAT primitive
  // for `100%` (percentage-of-parent). Same class of "no Figma primitive" skip
  // as focus.ring.style in the dims axis. This is a load-bearing skip: it
  // documents the intentional omission so a future contributor doesn't add it
  // back by mistake.
  const hasFluid = layout.some((l) => l.variables.some((v) => v.name === 'container/fluid'));
  ok(!hasFluid, `figma layout: container/fluid (100%) is intentionally skipped (no Figma primitive for percentage-of-parent; stays code-side)`);

  // (i) A variable count sanity — the exact shape a Figma-MCP materialiser
  // will import: 10 vars × 5 modes (5 breakpoint + 3 grid + 2 container).
  ok(layout[0].variables.length === 10, `figma layout: 10 vars per mode (5 breakpoint + 3 grid + 2 container) — got ${layout[0].variables.length}`);
}

// (19b) CR-08 (#65) — the layout axis must follow the brand's ACTUAL breakpoints, not a hardcoded
// 5. AURORA ships SIX breakpoints (xs..2xl); `buildFigmaLayout` used to iterate LAYOUT_MODES
// (sm..2xl) and read gridNode[mode] by name, silently DROPPING aurora's base `xs` grid (0px,
// 4-col mobile-first) on every regen while still emitting `breakpoint/xs` as a constant — an
// internally inconsistent artifact. This gates the emit LAYER on a non-5-breakpoint brand (the
// engine grid layer was tested, the Figma emit layer wasn't — the gate blind spot the review named).
{
  const aurora = brandTheme(parseDesignMd(readFileSync(resolve(HERE, '../examples/aurora.design.md'), 'utf8')).input);
  const { tree } = buildTree(aurora);
  const brand = tree[Object.keys(tree)[0]];
  const gridKeys = Object.keys(brand.grid); // [xs, sm, md, lg, xl, 2xl]
  const layout = buildFigmaLayout(aurora);
  const dims = buildFigmaDims(aurora);
  ok(gridKeys.length === 6 && gridKeys[0] === 'xs', `CR-08: aurora ships 6 breakpoints starting at xs (got [${gridKeys.join(',')}])`);
  ok(layout.length === 6 && layout.map((l) => l.$mode).join(',') === gridKeys.join(','), `CR-08: aurora emits a layout mode per breakpoint incl. the base xs (got [${layout.map((l) => l.$mode).join(',')}])`);
  const xs = layout.find((l) => l.$mode === 'xs');
  const xsCols = xs?.variables.find((v) => v.name === 'grid/columns');
  ok(!!xsCols && xsCols.value === brand.grid.xs.columns.$value, `CR-08: the xs grid carries aurora's base column count (${brand.grid.xs.columns.$value}), not dropped`);
  const spaceNames = new Set(dims.space.variables.map((v) => v.name));
  const dangling = layout.flatMap((l) => l.variables.filter((v) => v.alias && !spaceNames.has(v.alias.name)).map((v) => `${l.$mode}:${v.name}`));
  ok(dangling.length === 0, `CR-08: every aurora layout alias resolves into space/* across all 6 modes (${dangling.length} dangling)`);
  ok(layout[0].variables.length === 11, `CR-08: aurora emits 11 vars per mode (6 breakpoint + 3 grid + 2 container), got ${layout[0].variables.length}`);
}

// (20) EMIT-FIGMA MODE OPT-OUT (post-#42 follow-up; #45 audit; reviewer flag on #46).
// BrandInput.modes lets a brand ship any subset of {light, dark, hc-light, hc-dark}.
// emit-figma's colour axis previously hardcoded all four; a light-only brand's
// output would silently carry color.dark.json with light values (the alias fallback).
// The fix reads theme.modes and intersects with the canonical COLOR_MODES ordering.
// Gates: (a) NB (opts into all four) → four files, byte-identical to the pre-fix world
// (asserted by the existing block 3 golden — this block adds mode-count coverage);
// (b) light-only → ONE color file, `color.light.json`, no dark/hc-* silently emitted;
// (c) [light,dark] → TWO files in canonical order; (d) canonical ORDER preserved
// regardless of the order the user typed modes into their brief; (e) shadow already
// gated the dark-mode extension key present (block 14 (e)) — reconfirm here that a
// light-only brand emits NO shadow-dark/* styles (defensive, since the shadow builder
// iterates $extensions.prism3.modes.dark and would emit if it existed).
{
  const { input } = parseDesignMd(readFileSync(resolve(HERE, '../examples/aurora.design.md'), 'utf8'));

  // (a) default (all four modes) — unchanged from the shipped world
  const full = brandTheme(input);
  const fullColor = buildFigmaColor(full).color;
  ok(fullColor.length === 4, `emit-figma mode opt-out: default brand emits four color files (got ${fullColor.length})`);
  ok(fullColor.map((f) => f.$mode).join(',') === 'light,dark,hc-light,hc-dark', `emit-figma mode opt-out: default order is light,dark,hc-light,hc-dark`);

  // (b) light-only — ONE file, the load-bearing fix
  const lo = brandTheme({ ...input, modes: ['light'] });
  const loColor = buildFigmaColor(lo).color;
  ok(loColor.length === 1, `emit-figma mode opt-out: light-only brand emits ONE color file (got ${loColor.length})`);
  ok(loColor[0].$mode === 'light', `emit-figma mode opt-out: light-only emits color.light.json (got color.${loColor[0].$mode}.json)`);
  // The pre-fix bug would emit four files here — the alias fallback in the light branch
  // would silently carry through. This gate is the fix's regression fence.
  ok(loColor.every((f) => f.$mode === 'light'), `emit-figma mode opt-out: NO silent dark/hc-* emission for a light-only brand`);

  // Shadow: a light-only brand emits NO shadow-dark/* styles (defensive — block 14 (e)
  // already asserted the dark extension exists for NB; here we assert the negative).
  const loShadow = buildFigmaShadow(lo);
  const loDarkShadows = loShadow.styles.filter((s) => s.name.startsWith('shadow-dark/'));
  ok(loDarkShadows.length === 0, `emit-figma mode opt-out: light-only brand emits NO shadow-dark/* styles (got ${loDarkShadows.length})`);

  // (c) [light, dark] — two files, canonical order
  const ld = brandTheme({ ...input, modes: ['light', 'dark'] });
  const ldColor = buildFigmaColor(ld).color;
  ok(ldColor.length === 2, `emit-figma mode opt-out: [light,dark] emits two color files (got ${ldColor.length})`);
  ok(ldColor.map((f) => f.$mode).join(',') === 'light,dark', `emit-figma mode opt-out: [light,dark] modes in canonical order (got ${ldColor.map((f) => f.$mode).join(',')})`);

  // (d) canonical ORDER preserved regardless of user-typed order. Typing [light, hc-light, dark]
  // should still emit light,dark,hc-light (canonical), not the typed order.
  const shuffled = brandTheme({ ...input, modes: ['light', 'hc-light', 'dark'] });
  const shColor = buildFigmaColor(shuffled).color;
  ok(shColor.map((f) => f.$mode).join(',') === 'light,dark,hc-light',
    `emit-figma mode opt-out: canonical order preserved regardless of user-typed order (got ${shColor.map((f) => f.$mode).join(',')})`);

  // (e) every emitted color file's per-role value comes from the RIGHT mode extension
  // (not a silent light fallback). For [light, dark]: the dark file's interactive.primary.fill.rest
  // value must equal the dark extension's alias target, not the light $value.
  const ldTree = (buildTree(ld).tree as any)[Object.keys(buildTree(ld).tree)[0]];
  const darkFile = ldColor.find((f) => f.$mode === 'dark')!;
  const darkAction = darkFile.variables.find((v) => v.name === 'color/interactive/primary/fill/rest')!;
  const darkExtAlias = ldTree.color.interactive.primary.fill.rest.$extensions.prism3.modes.dark.$value.replace(/^\{|\}$/g, '');
  ok(darkAction.alias?.name === figName(darkExtAlias),
    `emit-figma mode opt-out: dark file's color/interactive/primary/fill/rest alias is the DARK extension target, not a light fallback (got ${darkAction.alias?.name}, want ${figName(darkExtAlias)})`);
}

// (21) EMIT-FIGMA GENERALISE (docs/10 §7 item 6) — the queue's closing check:
// the emit-figma adapter is brand-agnostic. Run it against aurora (engine-native
// design.md, opts INTO gradients, action = accent) and wendys (STANDARD-dialect
// through parseStandard + classifier + brandTheme) and gate every axis. This
// isn't asserting fixture byte-identity (no fixtures for these brands — §2 only
// freezes NB colour + typography); the gate is that (a) every axis produces
// output with the right shape, (b) every alias resolves WITHIN each brand's
// own emitted collections, (c) the namespace transform (figName) strips
// whichever root the brand carries — aurora=prism (default), wendys=prism
// (default), NB=nbds — with no leakage across brands, and (d) the aurora
// gradient axis actually ships alias-driven stops that resolve to palette leaves
// in the aurora tree (the alias-driven Paint Style form parked in the shadow +
// gradient PR now materialises through the generalise pass).
{
  const auroraTheme = brandTheme(parseDesignMd(readFileSync(resolve(HERE, '../examples/aurora.design.md'), 'utf8')).input);
  const wendysStd = parseStandardDesignMd(readFileSync(resolve(HERE, '../examples/wendys.design.md'), 'utf8'));
  const wendysTheme = brandTheme(standardToBrandInput(wendysStd).input);

  // Each brand runs through every axis. We assert structural claims uniformly:
  // - palette + color(×4 modes when default) shape correct
  // - every alias in EACH brand's emitted collections resolves WITHIN that brand
  // - namespace lever holds — figName strips the brand's own root exactly once
  // - every axis produces non-empty output where it should (gradient is opt-in;
  //   aurora HAS gradients, wendys does not)
  for (const [id, theme] of [['aurora', auroraTheme], ['wendys', wendysTheme]] as const) {
    const { palette, color } = buildFigmaColor(theme);
    const dims = buildFigmaDims(theme);
    const layout = buildFigmaLayout(theme);
    const font = buildFigmaFont(theme)[0];
    const fluid = buildFigmaFontFluid(theme);
    const textStyles = buildFigmaTextStyles(theme);
    const shadow = buildFigmaShadow(theme);
    const gradient = buildFigmaGradient(theme);

    // (a) Shape sanity — colour + palette + font + fluid + text-styles all present.
    ok(palette.variables.length > 0, `figma generalise (${id}): palette has variables (${palette.variables.length})`);
    ok(color.length === 4, `figma generalise (${id}): 4 colour modes emitted (default all four; got ${color.length})`);
    ok(color.every((c) => c.variables.length === color[0].variables.length), `figma generalise (${id}): every colour mode file has the same variable-name set`);
    ok(font.variables.length > 0, `figma generalise (${id}): font primitives emitted (${font.variables.length})`);
    ok(fluid.length === 2 && fluid.every((f) => f.variables.length > 0), `figma generalise (${id}): font-fluid has both mobile + desktop modes`);
    ok(textStyles.styles.length > 0, `figma generalise (${id}): text-styles emitted (${textStyles.styles.length})`);
    ok(shadow.styles.length > 0, `figma generalise (${id}): shadow effect styles emitted (${shadow.styles.length})`);
    const gridKeys = (() => { const t = buildTree(theme).tree; return Object.keys(t[Object.keys(t)[0]].grid); })();
    ok(layout.length === gridKeys.length && layout.map((l) => l.$mode).join(',') === gridKeys.join(','), `figma generalise (${id}): one layout mode file per breakpoint [${gridKeys.join(',')}] — got [${layout.map((l) => l.$mode).join(',')}]`); // CR-08: follows the brand's breakpoints (aurora 6 / wendys 5)

    // (b) COLOUR aliases — every per-mode alias name resolves within palette (name-based).
    const paletteNames = new Set(palette.variables.map((v) => v.name));
    const colorAliasBad: string[] = [];
    for (const c of color) for (const v of c.variables) {
      if (!v.alias || !paletteNames.has(v.alias.name)) colorAliasBad.push(`${c.$mode}:${v.name} → ${v.alias?.name ?? '<none>'}`);
    }
    ok(colorAliasBad.length === 0, `figma generalise (${id}): every colour alias resolves to a real palette variable within THIS brand` + (colorAliasBad.length ? ` — ${colorAliasBad.slice(0, 3).join(', ')}` : ''));

    // (c) DIMS aliases — cross-collection resolution within the 7 emitted collections.
    const dimNames = new Set<string>();
    const allDimColls = [dims.dimension, dims.space, dims.radius[0], dims.size, dims.borderWidth, dims.focus, dims.opacity];
    for (const c of allDimColls) for (const v of c.variables) dimNames.add(v.name);
    const dimsAliasBad: string[] = [];
    for (const c of allDimColls) for (const v of c.variables) {
      if (v.alias && !dimNames.has(v.alias.name)) dimsAliasBad.push(`${c.$collection}:${v.name} → ${v.alias.name}`);
    }
    ok(dimsAliasBad.length === 0, `figma generalise (${id}): every dims alias resolves within the emitted collections` + (dimsAliasBad.length ? ` — ${dimsAliasBad.slice(0, 3).join(', ')}` : ''));

    // (d) LAYOUT aliases — grid/gutter + grid/margin resolve into THIS brand's space collection.
    const spaceNames = new Set(dims.space.variables.map((v) => v.name));
    const layoutAliasBad: string[] = [];
    for (const l of layout) for (const v of l.variables) {
      if (v.name === 'grid/gutter' || v.name === 'grid/margin') {
        if (!v.alias || !spaceNames.has(v.alias.name)) layoutAliasBad.push(`${l.$mode}:${v.name} → ${v.alias?.name ?? '<none>'}`);
      }
    }
    ok(layoutAliasBad.length === 0, `figma generalise (${id}): every layout grid alias resolves within THIS brand's space collection` + (layoutAliasBad.length ? ` — ${layoutAliasBad.slice(0, 3).join(', ')}` : ''));

    // (e) NAMESPACE strip — Figma variable names carry no brand prefix. figName
    // strips exactly one root segment; walking every emitted name proves the
    // transform is idempotent regardless of what root the brand carries. NB
    // uses `nbds`; aurora + wendys both default to `prism` (no leakage back
    // into the emitted names).
    const allEmittedNames: string[] = [
      ...palette.variables.map((v) => v.name),
      ...color.flatMap((c) => c.variables.map((v) => v.name)),
      ...allDimColls.flatMap((c) => c.variables.map((v) => v.name)),
      ...layout.flatMap((l) => l.variables.map((v) => v.name)),
      ...font.variables.map((v) => v.name),
      ...fluid.flatMap((f) => f.variables.map((v) => v.name)),
    ];
    const namespaceLeaks = allEmittedNames.filter((n) => n.startsWith('prism/') || n.startsWith('nbds/') || n.startsWith('acme/'));
    ok(namespaceLeaks.length === 0, `figma generalise (${id}): no brand-namespace leakage in emitted variable names (${allEmittedNames.length} names checked)` + (namespaceLeaks.length ? ` — LEAKS: ${namespaceLeaks.slice(0, 3).join(', ')}` : ''));
  }

  // (f) AURORA GRADIENTS — the alias-driven Paint Style form. Aurora opts in
  // (gradients: true, custom array); its gradient axis emits ≥1 style, every
  // stop carries a real alias, and every alias resolves to a palette leaf in
  // aurora's DTCG tree.
  const auroraGradient = buildFigmaGradient(auroraTheme);
  ok(auroraGradient.styles.length > 0, `figma generalise (aurora): gradient axis emits ≥1 style (got ${auroraGradient.styles.length})`);
  const auroraTree = buildTree(auroraTheme).tree as any;
  const auroraRoot = Object.keys(auroraTree)[0];
  const stopAliasBad: string[] = [];
  for (const s of auroraGradient.styles) for (const stop of s.stops) {
    if (!stop.alias) { stopAliasBad.push(`${s.name}@${stop.position} has no alias`); continue; }
    const dottedPath = `${auroraRoot}.${stop.alias.replace(/\//g, '.')}`;
    const leaf = dottedPath.split('.').reduce((n: any, seg) => n?.[seg], auroraTree);
    if (!leaf || leaf.$type !== 'color') stopAliasBad.push(`${s.name}@${stop.position} → ${stop.alias} does not resolve to a colour leaf`);
  }
  ok(stopAliasBad.length === 0, `figma generalise (aurora): every gradient stop alias resolves to a colour leaf in aurora's DTCG` + (stopAliasBad.length ? ` — ${stopAliasBad.slice(0, 3).join('; ')}` : ''));

  // (g) WENDYS carries no gradients (didn't opt in) — the axis emits an empty
  // consistent shape, exactly like NB. Documents that opt-in works negatively
  // on the standard-dialect front door too.
  const wendysGradient = buildFigmaGradient(wendysTheme);
  ok(wendysGradient.styles.length === 0 && wendysGradient.$collection === 'gradient-styles', `figma generalise (wendys): no gradients opted in → empty consistent-shape file (collection='gradient-styles')`);
}

// (22) EMIT-FIGMA WIREFRAME (docs/10 §7 item 1; docs/11 Pillar 1b — #48 in the engine,
// this PR in emit-figma). `'wireframe'` is a valid opt-in mode: two materialisation
// changes fire, gated behind `theme.modes.includes('wireframe')` so the default four-mode
// world is unchanged.
//
//   (a) COLOUR — the color collection gains a `wireframe` MODE. Every role's
//       `$extensions.prism3.modes.wireframe.$value` (already emitted by tree.ts) aliases
//       a `palette/neutral/*` step (greyscale); the emit-figma iteration path is the same
//       as dark/hc-* — the load-bearing change is `COLOR_MODES` gaining `'wireframe'` so
//       the intersection with `theme.modes` picks it up.
//   (b) GEOMETRY — this is the NEW shape. Non-zero `radius.*` DTCG leaves carry a
//       `$extensions.prism3.modes.wireframe → {root.dimension.0}` override (tree.ts).
//       emit-figma materialises that as a wireframe MODE on the `radius` variable
//       collection: `radius/*` in the wireframe mode file aliases `dimension/0`.
//       `radius.none` (already 0) carries no override in the DTCG → stays 0 in both modes.
//       This is the FIRST non-colour/shadow axis to be MODE-VARYING, and the
//       load-bearing precedent for any future mode-varying geometry.
//
// No example brand opts into wireframe today, so we gate against a SYNTHETIC
// wireframe-enabled brand (same pattern as blocks 18 + 20: `brandTheme({ …input,
// modes: [..., 'wireframe'] })`). Default (four-mode) behaviour is untouched —
// verified by the byte-identical `out/*` regeneration and blocks 3/11 still green.
{
  const { input } = parseDesignMd(readFileSync(resolve(HERE, '../examples/aurora.design.md'), 'utf8'));

  // ---- COLOUR AXIS ----------------------------------------------------------
  // (a1) A default (no wireframe) brand emits four colour files — same as pre-1b. This
  // asserts wireframe adds no silent phantom mode; block 20 (d) already checks canonical
  // ordering — this reconfirms the four-file world stays four files when wireframe is off.
  const def = brandTheme(input);
  const defColor = buildFigmaColor(def).color;
  ok(defColor.length === 4, `emit-figma wireframe: default (no wireframe) still emits 4 colour files (got ${defColor.length})`);
  ok(!defColor.some((c) => c.$mode === 'wireframe'), `emit-figma wireframe: no phantom wireframe file when the brand didn't opt in`);

  // (a2) Synthetic wireframe-opted-in brand — colour axis gains a 5th mode file, canonical
  // position last (matches COLOR_MODES order). Every role's per-mode value comes from
  // the wireframe extension in the DTCG tree, not a silent light fallback.
  const wf = brandTheme({ ...input, modes: ['light', 'dark', 'hc-light', 'hc-dark', 'wireframe'] });
  const wfColor = buildFigmaColor(wf).color;
  ok(wfColor.length === 5, `emit-figma wireframe: opted-in brand emits 5 colour files (got ${wfColor.length})`);
  ok(wfColor.map((c) => c.$mode).join(',') === 'light,dark,hc-light,hc-dark,wireframe',
    `emit-figma wireframe: canonical mode order preserved (got ${wfColor.map((c) => c.$mode).join(',')})`);
  const wfMode = wfColor.find((c) => c.$mode === 'wireframe')!;

  // (a3) The wireframe file's role names + shape match the light file (same variable
  // set — modes carry the same names by different values, per docs/06 §7b).
  const lightNames = new Set(wfColor.find((c) => c.$mode === 'light')!.variables.map((v) => v.name));
  const wfNames = new Set(wfMode.variables.map((v) => v.name));
  ok(lightNames.size === wfNames.size && [...lightNames].every((n) => wfNames.has(n)),
    `emit-figma wireframe: wireframe file carries the same variable-name set as light (${lightNames.size} vars)`);

  // (a4) Every wireframe-mode alias points at a `palette/neutral/*` step (greyscale —
  // the point of the mode). Also verify per-role that the alias matches the DTCG
  // extension target byte-for-byte (no silent light fallback).
  const wfTreeBuilt = buildTree(wf);
  const wfTree = (wfTreeBuilt.tree as any)[wf.root];
  const nonNeutralAliases: string[] = [];
  const mismatchedAliases: string[] = [];
  for (const v of wfMode.variables) {
    // trace the DTCG leaf back for this Figma name (color/<family>/…)
    const dtcgPath = v.name.split('/').slice(1); // drop the 'color' segment
    let node: any = wfTree.color;
    for (const seg of dtcgPath) node = node?.[seg];
    if (!node) continue;
    const ext = node.$extensions?.prism3?.modes?.wireframe?.$value;
    if (typeof ext !== 'string') continue; // some roles may keep the light value in wireframe (already-neutral); accept whatever the tree emits
    const wantName = figName(ext.replace(/^\{|\}$/g, ''));
    if (v.alias?.name !== wantName) mismatchedAliases.push(`${v.name} → ${v.alias?.name} (want ${wantName})`);
    if (v.alias && !v.alias.name.startsWith('palette/neutral/') && !v.alias.name.startsWith('palette/white') && !v.alias.name.startsWith('palette/black')) {
      // Wireframe is a greyscale mode — every chromatic role should route to the neutral
      // ramp (or pure white/black for those specific primitive roles).
      nonNeutralAliases.push(`${v.name} → ${v.alias.name}`);
    }
  }
  ok(mismatchedAliases.length === 0, `emit-figma wireframe: every wireframe-mode alias matches the DTCG wireframe extension exactly (no silent fallback)` + (mismatchedAliases.length ? ` — ${mismatchedAliases.slice(0, 3).join('; ')}` : ''));
  ok(nonNeutralAliases.length === 0, `emit-figma wireframe: every wireframe alias routes to palette/neutral/* (greyscale contract)` + (nonNeutralAliases.length ? ` — ${nonNeutralAliases.slice(0, 3).join('; ')}` : ''));

  // (a5) The wireframe file's non-alias fallback values (belt-and-suspenders {r,g,b,a})
  // are neutral too — verify a representative saturated role (interactive.primary.fill.rest
  // in the light file uses the accent palette; wireframe collapses to neutral). Structural
  // proof the value shipped alongside the alias is the neutral colour, not the light
  // chromatic one.
  const wfAction = wfMode.variables.find((v) => v.name === 'color/interactive/primary/fill/rest')!;
  const lightAction = wfColor.find((c) => c.$mode === 'light')!.variables.find((v) => v.name === 'color/interactive/primary/fill/rest')!;
  const rgbDist = Math.abs((wfAction.value as any).r - (wfAction.value as any).g)
                + Math.abs((wfAction.value as any).g - (wfAction.value as any).b);
  const lightRgbDist = Math.abs((lightAction.value as any).r - (lightAction.value as any).g)
                     + Math.abs((lightAction.value as any).g - (lightAction.value as any).b);
  ok(rgbDist < 0.02, `emit-figma wireframe: color/interactive/primary/fill/rest resolves to a neutral (r≈g≈b, spread ${rgbDist.toFixed(3)})`);
  ok(lightRgbDist > 0.05, `emit-figma wireframe: baseline sanity — light action is CHROMATIC (spread ${lightRgbDist.toFixed(3)}, > 0.05)`);

  // ---- GEOMETRY AXIS — the NEW mode-varying shape (radius) ------------------
  // (b1) Default (no wireframe) brand's `radius` remains a single Default-mode file —
  // byte-identical to the pre-1b world. Non-wireframe brands ship as before.
  const defDims = buildFigmaDims(def);
  ok(Array.isArray(defDims.radius) && defDims.radius.length === 1, `emit-figma wireframe: non-wireframe brand's radius is a single Default file (got length ${defDims.radius.length})`);
  ok(defDims.radius[0].$mode === 'Default', `emit-figma wireframe: non-wireframe brand's radius mode is Default (got ${defDims.radius[0].$mode})`);

  // (b2) Wireframe-opted-in brand's `radius` collection carries TWO modes — Default
  // + wireframe. Both files carry the same variable-name set (mode column is the
  // value axis, same shape as colour). This is the FIRST non-colour/shadow axis
  // to be mode-varying — the load-bearing precedent for future mode-varying
  // geometry (docs/00 progress + docs/11 Pillar 1b).
  const wfDims = buildFigmaDims(wf);
  ok(wfDims.radius.length === 2, `emit-figma wireframe: wireframe-opted brand's radius has 2 modes (got ${wfDims.radius.length})`);
  const modeSeq = wfDims.radius.map((r) => r.$mode).join(',');
  ok(modeSeq === 'Default,wireframe', `emit-figma wireframe: radius modes in canonical order Default,wireframe (got ${modeSeq})`);

  const defaultRadiusFile = wfDims.radius[0];
  const wfRadiusFile = wfDims.radius[1];
  const defaultNames = new Set(defaultRadiusFile.variables.map((v) => v.name));
  const wfRadiusNames = new Set(wfRadiusFile.variables.map((v) => v.name));
  ok(defaultNames.size === wfRadiusNames.size && [...defaultNames].every((n) => wfRadiusNames.has(n)),
    `emit-figma wireframe: radius wireframe mode carries the same variable-name set as Default (${defaultNames.size} vars)`);

  // (b3) Every NON-ZERO radius var aliases `dimension/0` in the wireframe mode. Zero
  // radius (`radius.none`) stays 0 with no override (matches tree.ts:345 — the
  // "already-0 needs no override" invariant), so its wireframe entry keeps its
  // Default alias.
  const wfAliasBad: string[] = [];
  for (const wfVar of wfRadiusFile.variables) {
    const defVar = defaultRadiusFile.variables.find((v) => v.name === wfVar.name)!;
    if (defVar.value === 0) {
      // Zero radius keeps its Default form — the DTCG carries no wireframe override.
      if (wfVar.value !== 0) wfAliasBad.push(`${wfVar.name}: zero-radius should stay 0 in wireframe (got ${wfVar.value})`);
    } else {
      // Non-zero radius must alias dimension/0 (value 0) in the wireframe mode.
      if (wfVar.value !== 0) wfAliasBad.push(`${wfVar.name}: non-zero-radius should be 0 in wireframe (got ${wfVar.value})`);
      if (wfVar.alias?.name !== 'dimension/0') wfAliasBad.push(`${wfVar.name}: alias=${wfVar.alias?.name} (want dimension/0)`);
    }
  }
  ok(wfAliasBad.length === 0, `emit-figma wireframe: every non-zero radius aliases dimension/0 in wireframe mode; radius.none stays 0` + (wfAliasBad.length ? ` — ${wfAliasBad.slice(0, 3).join('; ')}` : ''));

  // (b4) Default-mode radius file for the wireframe-opted brand is IDENTICAL in shape
  // (name, scopes, value, alias) to the non-wireframe brand's radius file — the
  // Default mode is the light-canonical world; wireframe is purely additive. This
  // gates the invariant that opting into wireframe never mutates the Default mode.
  const defRadiusFile = defDims.radius[0];
  const shapeDrift: string[] = [];
  for (const dv of defRadiusFile.variables) {
    const wv = defaultRadiusFile.variables.find((v) => v.name === dv.name);
    if (!wv) { shapeDrift.push(`${dv.name}: missing in wireframe-opted Default file`); continue; }
    if (dv.value !== wv.value) shapeDrift.push(`${dv.name}: value ${dv.value} vs ${wv.value}`);
    if ((dv.alias?.name ?? null) !== (wv.alias?.name ?? null)) shapeDrift.push(`${dv.name}: alias ${dv.alias?.name} vs ${wv.alias?.name}`);
    if (JSON.stringify(dv.scopes) !== JSON.stringify(wv.scopes)) shapeDrift.push(`${dv.name}: scopes ${dv.scopes.join(',')} vs ${wv.scopes.join(',')}`);
  }
  ok(shapeDrift.length === 0, `emit-figma wireframe: opting in preserves Default-mode radius byte-shape (name/value/alias/scopes)` + (shapeDrift.length ? ` — ${shapeDrift.slice(0, 3).join('; ')}` : ''));
}

// ---------------------------------------------------- M-08: parseColor loud-fail + hex forms
// parseColor used to return a silent {0,0,0,1} BLACK for anything it couldn't parse —
// so an unresolvable alias target (`parseColor(undefined)`) or a malformed value would
// ship a black swatch carrying a dangling alias. Now it (a) handles 3-digit and 8-digit
// hex, and (b) THROWS on genuinely unparseable input rather than degrading to black.
{
  const eq = (a: any, b: any) => a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;

  // 3-digit hex expands like CSS: #f00 → #ff0000.
  ok(eq(parseColor('#f00'), parseColor('#ff0000')), 'M-08: 3-digit hex #f00 expands to #ff0000');
  ok(eq(parseColor('#abc'), parseColor('#aabbcc')), 'M-08: 3-digit hex #abc expands to #aabbcc');

  // 8-digit hex carries the alpha byte.
  const withAlpha = parseColor('#12345678');
  ok(withAlpha.a === Math.fround(0x78 / 255), `M-08: 8-digit hex #RRGGBBAA parses alpha (got a=${withAlpha.a})`);
  ok(withAlpha.r === Math.fround(0x12 / 255) && withAlpha.g === Math.fround(0x34 / 255) && withAlpha.b === Math.fround(0x56 / 255), 'M-08: 8-digit hex parses RGB alongside alpha');

  // 6-digit hex + rgb()/rgba() still work (no regression).
  ok(eq(parseColor('#ffffff'), { r: 1, g: 1, b: 1, a: 1 }), 'M-08: 6-digit hex still parses');
  ok(parseColor('rgba(0, 0, 0, 0.6)').a === Math.fround(0.6), 'M-08: rgba() alpha still parses');
  ok(parseColor('rgb(255, 0, 0)').r === 1, 'M-08: rgb() still parses');

  // The load-bearing change: unparseable input THROWS (loud-fail), never a silent black.
  const throws = (v: unknown, label: string) => {
    let threw = false;
    try { parseColor(v); } catch { threw = true; }
    ok(threw, `M-08: parseColor(${label}) THROWS instead of returning silent black`);
  };
  throws(undefined, 'undefined');           // the unresolvable-alias path (targetLeaf?.$value)
  throws('{prism.color.no.such.role}', 'an unresolved brace alias'); // a raw alias reaching the emitter
  throws('not-a-colour', 'garbage');
  throws('#ff', '2-digit hex');             // not a valid hex length
}

// ---------------------------------------------------- M-09: space alias guarded like siblings
// buildFigmaDims emitted the `space` alias UNCONDITIONALLY — so a space leaf carrying a
// raw px value (not a `{…}` reference) would ship `alias.name: ''` (a dangling empty-named
// binding). Every sibling axis (radius/size/border/focus) guards with `isAlias ? … : null`;
// space now matches.
{
  const dims = buildFigmaDims(nbTheme());

  // Engine brands alias every space step into dimension — so all aliases resolve to a
  // non-empty `dimension/*` name, and NONE carries the empty-string dangling name that
  // the pre-M-09 unconditional-alias code would emit off a non-brace value.
  const emptyNamed = dims.space.variables.filter((v) => v.alias && !v.alias.name);
  ok(emptyNamed.length === 0, `M-09: no space var ships an empty-named alias (got ${emptyNamed.length})`);
  ok(dims.space.variables.every((v) => v.alias && v.alias.name.startsWith('dimension/')), 'M-09: every space var aliases a dimension/* primitive');

  // The invariant the guard enforces: a space alias is either null or a NON-EMPTY
  // VARIABLE_ALIAS — never the `{ name: '' }` dangling binding. This is the same shape
  // contract radius/size/border/focus already satisfy; space now joins them.
  ok(dims.space.variables.every((v) => v.alias === null || (v.alias.type === 'VARIABLE_ALIAS' && v.alias.name.length > 0)),
    'M-09: every space alias is either null or a non-empty VARIABLE_ALIAS (never { name: \'\' })');
}

// ---------------------------------------------------- MCP adapter (docs/08 §5, roadmap C)
// The agent-callable surface over the core: dependency-free JSON-RPC. Gate the handshake,
// the tool catalogue, the "derives from the lever manifest" tie, and a full theme_brand
// round-trip — all against the PURE handleRpc/callTool (no stdio needed).
{
  const brandSchema = JSON.parse(readFileSync(resolve(HERE, '../schema/theme-schema.json'), 'utf8'));
  const rpc = (method: string, params?: any) => handleRpc({ jsonrpc: '2.0', id: 1, method, params }, brandSchema);

  // handshake
  const init = rpc('initialize');
  ok((init?.result as any)?.protocolVersion && (init?.result as any)?.serverInfo?.name === 'prism3-engine', 'MCP: initialize returns protocolVersion + serverInfo');
  ok(rpc('notifications/initialized') === null, 'MCP: a notification (initialized) gets no response');
  ok((rpc('bogus/method') as any)?.error?.code === -32601, 'MCP: an unknown method → JSON-RPC -32601 (method not found)');

  // tool catalogue
  const tools = (rpc('tools/list')?.result as any)?.tools as any[];
  ok(Array.isArray(tools) && tools.map((t) => t.name).sort().join(',') === 'list_levers,theme_brand,validate_brand', 'MCP: tools/list advertises list_levers + theme_brand + validate_brand');
  ok(tools.find((t) => t.name === 'theme_brand')?.inputSchema === brandSchema, 'MCP: theme_brand inputSchema IS the BrandInput schema (precise OKLCH-aware shape)');
  ok(toolDefs(brandSchema).length === 3, 'MCP: toolDefs is a pure function of the brand schema');

  // list_levers derives from the manifest (can't drift — the surface IS the manifest)
  const leversText = (callTool('list_levers', {}).content[0].text);
  const leversPayload = JSON.parse(leversText);
  ok(leversPayload.levers.length === leverManifest.length && leversPayload.groups.length === leverGroups.length, 'MCP: list_levers returns the lever manifest verbatim (every lever an agent can turn)');

  // theme_brand round-trip: a valid brand → tokens + metadata + all contracts pass
  const themed = callTool('theme_brand', { id: 'mcp-probe', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 } });
  ok(themed.isError !== true, 'MCP: theme_brand on a valid brand is not an error');
  const payload = JSON.parse(themed.content[0].text);
  ok(payload.tokens?.prism && payload.id === 'mcp-probe', 'MCP: theme_brand returns the DTCG token tree under the root namespace');
  ok(payload.contracts.checks > 0 && payload.contracts.pass === payload.contracts.checks && payload.contracts.failures.length === 0, `MCP: theme_brand reports all ${payload.contracts.checks} contrast contracts passing`);
  ok(payload.aliases.broken.length === 0 && payload.aliases.resolved === payload.aliases.total, 'MCP: theme_brand reports every alias resolving');
  ok(payload.aiMetadata && Array.isArray(payload.notes), 'MCP: theme_brand includes the .ai.json metadata + the decisions log');

  // validate_brand: bad input → errors; good input → clean; and theme_brand rejects a bad brand loudly
  ok(JSON.parse(callTool('validate_brand', { id: 'x' }).content[0].text).valid === false, 'MCP: validate_brand flags an incomplete brand (missing primary/neutral)');
  ok(JSON.parse(callTool('validate_brand', { id: 'ok', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 } }).content[0].text).valid === true, 'MCP: validate_brand passes a complete brand');
  ok(callTool('theme_brand', { id: 'bad' }).isError === true, 'MCP: theme_brand on an invalid brand returns a tool-level error (isError), not a crash');
  ok(callTool('no_such_tool', {}).isError === true, 'MCP: an unknown tool name → isError result');
}

// ------------------------------------------- consumption eval (docs/17, roadmap C follow-on)
// The PURE, deterministic scoring half: given the token refs an agent's output uses + the tree,
// compute the invented-token rate (hallucination) and the primitive-leak rate (reaching past the
// semantic layer into palette/dimension/font). No LLM needed — the name contract is locked.
{
  const theme = brandTheme({ id: 'eval', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 } });
  const { tree } = buildTree(theme);
  const paths = [...tokenPaths(tree, 'prism')];
  const semantic = paths.find((p) => !isPrimitiveRef(p))!;   // a real semantic leaf (color.*/space.* …)
  const primitive = paths.find((p) => isPrimitiveRef(p))!;   // a real primitive leaf (palette.*/dimension.*/font.*)
  ok(paths.length > 100 && !!semantic && !!primitive, `eval: tokenPaths enumerates the tree's leaves (${paths.length}) incl. semantic + primitive tiers`);
  ok(PRIMITIVE_TIERS.has('palette') && PRIMITIVE_TIERS.has('dimension') && PRIMITIVE_TIERS.has('font') && !PRIMITIVE_TIERS.has('color'),
    'eval: primitive tiers = palette/dimension/font (the core-* grouping); color is semantic');

  // all-semantic output → 0 invented, 0 leak
  const clean = scoreConsumption([semantic, semantic], tree, 'prism');
  ok(clean.invented.length === 0 && clean.inventedRate === 0 && clean.primitiveLeakRate === 0, 'eval: valid semantic refs → 0 invented, 0 primitive-leak');

  // invented refs (hallucinated token names) → counted with the right rate
  const inv = scoreConsumption(['color.nope.nope', 'space.999999', semantic], tree, 'prism');
  ok(inv.invented.length === 2 && inv.valid === 1 && Math.abs(inv.inventedRate - 2 / 3) < 1e-9, 'eval: nonexistent refs → invented, rate 2/3, the one real ref valid');

  // a primitive ref among valid refs → leak rate reflects reaching past the semantic layer
  const leak = scoreConsumption([primitive, semantic], tree, 'prism');
  ok(leak.invented.length === 0 && leak.primitiveLeaks.length === 1 && Math.abs(leak.primitiveLeakRate - 0.5) < 1e-9, 'eval: a primitive ref among 2 valid refs → primitive-leak rate 0.5');

  // normalizeRef: brace + root-qualified forms resolve identically to relative
  ok(normalizeRef(`{prism.${semantic}}`, 'prism') === semantic && normalizeRef(`prism.${semantic}`, 'prism') === semantic, 'eval: normalizeRef strips the brace wrapper + the root namespace');
  const braced = scoreConsumption([`{prism.${semantic}}`, `prism.${primitive}`], tree, 'prism');
  ok(braced.valid === 2 && braced.primitiveLeaks.length === 1, 'eval: braced + root-qualified refs normalise and score like relative refs');

  // occurrence-based rate: a duplicated invented ref counts twice in the rate, once in the list
  const dup = scoreConsumption(['color.nope.nope', 'color.nope.nope', semantic, semantic], tree, 'prism');
  ok(dup.invented.length === 1 && Math.abs(dup.inventedRate - 0.5) < 1e-9, 'eval: a repeated hallucination is listed once but rated by occurrence (2/4)');

  // empty → no NaN
  const empty = scoreConsumption([], tree, 'prism');
  ok(empty.total === 0 && empty.inventedRate === 0 && empty.primitiveLeakRate === 0, 'eval: empty ref list scores 0/0 without NaN');

  // contract compliance (docs/17 §4): did the agent pair legible colours, in every mode?
  const good = scoreContractCompliance([{ fg: 'color.text.primary', bg: 'color.background.primary' }], theme);
  ok(good.checked === 4 && good.pass === 4 && good.rate === 1 && good.failures.length === 0, 'eval: text.primary on background.primary clears 4.5 in all 4 modes (compliant)');
  const bad = scoreContractCompliance([{ fg: 'color.background.secondary', bg: 'color.background.primary' }], theme);
  ok(bad.pass === 0 && bad.failures.length === bad.checked && bad.checked > 0 && bad.rate === 0, 'eval: two adjacent page surfaces as a text pair fail 4.5 in every mode');
  ok(bad.failures.every((f) => f.min === 4.5) && bad.failures[0].ratio < 4.5, 'eval: a text-kind failure records the 4.5 floor + the (raw, rounded) ratio below it');
  // kind lowers the floor to 3 (WCAG 1.4.11 / large text)
  const ui = scoreContractCompliance([{ fg: 'color.background.secondary', bg: 'color.background.primary', kind: 'ui' }], theme);
  ok(ui.failures.every((f) => f.min === 3), 'eval: kind:ui/large-text drops the contract floor to 3:1');
  // mixed pass+fail → rate strictly between 0 and 1; unresolved pair flagged, not counted
  const mixed = scoreContractCompliance([
    { fg: 'color.text.primary', bg: 'color.background.primary' },
    { fg: 'color.background.secondary', bg: 'color.background.primary' },
    { fg: 'color.made.up.role', bg: 'color.background.primary' },
  ], theme);
  ok(mixed.rate > 0 && mixed.rate < 1, 'eval: a mix of passing + failing pairs → compliance rate between 0 and 1');
  ok(mixed.unresolved.length === 1 && /made\.up/.test(mixed.unresolved[0]), 'eval: a pair naming a non-colour role is reported unresolved, not scored');
  ok(scoreContractCompliance([], theme).rate === 1 && scoreContractCompliance([], theme).checked === 0, 'eval: no pairs → vacuously compliant (rate 1, checked 0), no NaN');
}

// -------------------------------------------- consumption-eval harness (docs/17 §3, eval-run.ts)
// The model call is INJECTED, so the whole pipeline (prompt → [mock model] → extract → score)
// is deterministic + gated without an LLM. A keyed shell swaps the mock for a real Claude client.
{
  const theme = brandTheme({ id: 'evalrun', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 } });
  const { tree } = buildTree(theme);
  const paths = [...tokenPaths(tree, 'prism')];
  const S = paths.find((p) => !isPrimitiveRef(p))!, P = paths.find((p) => isPrimitiveRef(p))!;

  ok(SAMPLE_TASKS.length === 4 && SAMPLE_TASKS.every((t) => t.name && t.brief), 'eval-run: SAMPLE_TASKS is the 4-task fixed set');
  ok(buildPrompt(SAMPLE_TASKS, [S]).includes(S) && /reference ONLY these/.test(buildPrompt(SAMPLE_TASKS, [S])), 'eval-run: WITH-surface prompt embeds the catalogue');
  ok(/best guess/.test(buildPrompt(SAMPLE_TASKS)) && !buildPrompt(SAMPLE_TASKS).includes('reference ONLY'), 'eval-run: WITHOUT-surface prompt tells the agent to guess (no catalogue)');

  // extractRefs: JSON object, fenced JSON, and prose fallback
  ok(extractRefs('{"a":["x.y","z.w"]}').flat.join(',') === 'x.y,z.w', 'eval-run: extractRefs reads a JSON {task:[refs]} object');
  ok(extractRefs('```json\n{"a":["p.q"]}\n```').byTask.a?.[0] === 'p.q', 'eval-run: extractRefs tolerates ```json fences + surrounding prose');
  ok(extractRefs('use color.interactive.primary.fill.rest and space.400 here').flat.sort().join(',') === 'color.interactive.primary.fill.rest,space.400', 'eval-run: extractRefs falls back to scraping dotted paths from prose');

  // full run with a mock runner: 1 valid semantic + 1 invented + 1 valid primitive
  const mock = async () => JSON.stringify({ 'primary-button': [S, 'color.totally.invented', P] });
  const res = await runEval(tree, 'prism', mock, { catalog: [S], tasks: [{ name: 'primary-button', brief: 'x' }] });
  ok(res.arm === 'with-surface', 'eval-run: catalogue present → with-surface arm');
  const pb = res.byTask['primary-button'];
  ok(pb.total === 3 && pb.invented.length === 1 && Math.abs(pb.inventedRate - 1 / 3) < 1e-9, 'eval-run: runEval scores the task — 1 invented of 3 (1/3)');
  ok(pb.primitiveLeaks.length === 1 && Math.abs(pb.primitiveLeakRate - 0.5) < 1e-9, 'eval-run: the primitive ref among 2 valid → leak 0.5');
  ok(res.aggregate.total === 3 && res.aggregate.valid === 2, 'eval-run: aggregate rolls up all refs (2 valid / 3)');
  const without = await runEval(tree, 'prism', async () => '{"t":[]}', { tasks: [{ name: 't', brief: 'x' }] });
  ok(without.arm === 'without-surface', 'eval-run: no catalogue → without-surface arm');

  // pairs mode (contract-compliance on real agent output): prompt elicits fg/bg pairs, runEval scores them
  ok(/PAIRINGS/.test(buildPrompt(SAMPLE_TASKS, undefined, true)) && /"pairs"/.test(buildPrompt(SAMPLE_TASKS, undefined, true)), 'eval-run: pairs-mode prompt elicits {fg,bg,kind} pairings');
  ok(!/PAIRINGS/.test(buildPrompt(SAMPLE_TASKS)), 'eval-run: refs-mode prompt does not ask for pairings');
  const pairsJson = '{"card": {"refs": ["color.text.primary","color.background.primary"], "pairs": [{"fg":"color.text.primary","bg":"color.background.primary","kind":"text"},{"fg":"color.background.secondary","bg":"color.background.primary"}]}}';
  ok(extractPairs(pairsJson).all.length === 2 && extractPairs(pairsJson).byTask.card[0].kind === 'text', 'eval-run: extractPairs pulls the {fg,bg,kind} pairs from a pairs-mode object');
  ok(extractRefs(pairsJson).flat.length === 2, 'eval-run: extractRefs still recovers the refs[] from a pairs-mode object');
  const withPairs = await runEval(tree, 'prism', async () => pairsJson, { theme, tasks: [{ name: 'card', brief: 'x' }] });
  ok(withPairs.complianceAggregate !== undefined && withPairs.complianceByTask?.card !== undefined, 'eval-run: supplying a theme enables compliance scoring on the elicited pairs');
  ok(withPairs.complianceAggregate!.checked > 0 && withPairs.complianceAggregate!.pass < withPairs.complianceAggregate!.checked, 'eval-run: the good text pair passes + the adjacent-surface pair fails → compliance rate < 1');
  const refsOnly = await runEval(tree, 'prism', async () => pairsJson, { tasks: [{ name: 'card', brief: 'x' }] });
  ok(refsOnly.complianceAggregate === undefined, 'eval-run: no theme → refs-only, no compliance scoring (back-compat)');

  // guidance arm (the .ai.json metadata differential): the prompt carries when_to_use/avoid_when so the
  // agent can skip contrast checks the raw names can't convey (decorative border / disabled label).
  const guided = buildPrompt(SAMPLE_TASKS, ['color.border.primary'], true, 'border.primary — decorative hairline; avoid_when: NOT a 3:1 target');
  ok(/Semantic guidance/.test(guided) && /decorative hairline/.test(guided), 'eval-run: guidance is embedded in the prompt surface');
  ok(!/Semantic guidance/.test(buildPrompt(SAMPLE_TASKS, ['color.border.primary'], true)), 'eval-run: no guidance → prompt has no guidance block');
  let seen = '';
  await runEval(tree, 'prism', async (p) => { seen = p; return pairsJson; }, { theme, guidance: 'border.primary — decorative', catalog: ['color.border.primary'], tasks: [{ name: 'card', brief: 'x' }] });
  ok(/Semantic guidance/.test(seen) && /decorative/.test(seen), 'eval-run: runEval threads guidance into the prompt the runner sees');

  // skill arm (the portable-instructions differential, docs/17 §4): unlike `guidance` (per-brand
  // .ai.json data), the skill carries brand-agnostic RULES and composes on top of the catalogue.
  const SKILL = 'Reach for the semantic role, not the primitive. border.primary is decorative — not a 3:1 target.';
  const skilled = buildPrompt(SAMPLE_TASKS, ['color.border.primary'], true, undefined, SKILL);
  ok(/Consumption skill/.test(skilled) && skilled.includes(SKILL), 'eval-run: skill is embedded in the prompt surface');
  ok(!/Consumption skill/.test(buildPrompt(SAMPLE_TASKS, ['color.border.primary'], true)), 'eval-run: no skill → prompt has no skill block');
  // skill composes WITH guidance (both blocks present) — they are different layers, not exclusive.
  const both = buildPrompt(SAMPLE_TASKS, ['color.border.primary'], true, 'border.primary — decorative', SKILL);
  ok(/Semantic guidance/.test(both) && /Consumption skill/.test(both), 'eval-run: skill + guidance compose (both blocks present)');
  // back-compat: a call with neither guidance nor skill is byte-identical to the pre-skill prompt.
  ok(buildPrompt(SAMPLE_TASKS, ['color.border.primary'], true) === buildPrompt(SAMPLE_TASKS, ['color.border.primary'], true, undefined, undefined), 'eval-run: omitting skill leaves the prompt byte-identical (back-compat)');
  let seenSkill = '';
  await runEval(tree, 'prism', async (p) => { seenSkill = p; return pairsJson; }, { theme, skill: SKILL, catalog: ['color.border.primary'], tasks: [{ name: 'card', brief: 'x' }] });
  ok(/Consumption skill/.test(seenSkill) && seenSkill.includes(SKILL), 'eval-run: runEval threads the skill into the prompt the runner sees');
}

// (23) EMIT-FIGMA — hide primitives + thread descriptions (docs/10 §3, this PR).
// Two intent policies gated together because they land in the same emit pass.
//
// (a) PRIMITIVE TIER is hidden from library consumers. Every var in a
//     ref-tier collection (palette, dimension, font/family/*, font/size/*,
//     font/weight/*) carries `hiddenFromPublishing: true` (Figma's official
//     mechanism for "consumers of this file as a library shouldn't see this in
//     the picker"). NOTE: opacity is NOT in this set — it is directly consumable
//     (#79), so it sits in the visible tier below. Scopes stay at their real role-family targets
//     — Figma's Plugin API rejects "bogus" scopes ("Invalid scope for this
//     variable type" if you try `TEXT_CONTENT` on a COLOR/FLOAT var), and
//     `scopes: []` is documented as ALL_SCOPES (probe-verified 2026-07-04:
//     setBoundVariableForPaint succeeds on a var with scopes=[]), so
//     there is no scopes-based mechanism to hide a variable from LOCAL
//     pickers in the definer file. The production discipline: publish
//     tokens as a library and consume in a separate authoring file —
//     hidden-from-publishing narrows the picker end-to-end there.
//
// (b) SEMANTIC + DIRECTLY-CONSUMABLE TIER stays visible. `color/*`, `space`,
//     `radius`, `size`, `border-width`, `focus`, `opacity` (#79 — consumable, no
//     semantic layer to prefer), `font-fluid`, `font/weight-role/*`, `layout` all
//     keep their role-family scopes and carry no `hiddenFromPublishing` field
//     (JSON stays clean — bytes are unchanged modulo the new descriptions).
//
// (c) DESCRIPTIONS ARE THREADED. Every Figma variable's `description` reads
//     from the underlying DTCG leaf's `$description` — the source of truth for
//     token metadata (see nb.tokens.json + nb.ai.json). Zero empty descriptions
//     across every emit-figma variable. Designers see the same prose in
//     Figma's Variables panel that appears in DTCG consumers + the AI sidecar.
{
  const theme = nbTheme();
  const { palette, color } = buildFigmaColor(theme);
  const font = buildFigmaFont(theme)[0];
  const fluid = buildFigmaFontFluid(theme);
  const dims = buildFigmaDims(theme);
  const layout = buildFigmaLayout(theme);

  // Primitive-tier: every var must have hiddenFromPublishing=true. Scopes stay
  // at real role-family targets (Figma's Plugin API rejects "bogus"/non-matching
  // scopes and treats scopes=[] as ALL_SCOPES; hidden-from-publishing is
  // the only scopes-safe mechanism).
  const primitiveGroups: Array<{ tag: string; vars: any[]; expectScopes: string[] }> = [
    { tag: 'palette', vars: palette.variables, expectScopes: ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR'] },
    { tag: 'dimension', vars: dims.dimension.variables, expectScopes: ['WIDTH_HEIGHT', 'GAP', 'CORNER_RADIUS', 'STROKE_FLOAT'] },
    { tag: 'font/family', vars: font.variables.filter((v) => v.name.startsWith('font/family/')), expectScopes: ['FONT_FAMILY'] },
    { tag: 'font/size', vars: font.variables.filter((v) => v.name.startsWith('font/size/')), expectScopes: ['FONT_SIZE'] },
    { tag: 'font/weight', vars: font.variables.filter((v) => v.name.startsWith('font/weight/')), expectScopes: ['FONT_WEIGHT'] },
  ];
  const notHidden: string[] = [];
  const wrongScope: string[] = [];
  for (const g of primitiveGroups) {
    for (const v of g.vars) {
      if (v.hiddenFromPublishing !== true) notHidden.push(`${g.tag}:${v.name}`);
      // Scope sets are unordered — compare as sorted sets.
      if (JSON.stringify([...v.scopes].sort()) !== JSON.stringify([...g.expectScopes].sort()))
        wrongScope.push(`${g.tag}:${v.name} = [${v.scopes.join(',')}]`);
    }
  }
  ok(notHidden.length === 0, `figma primitives: every ref-tier var has hiddenFromPublishing=true (${primitiveGroups.reduce((n, g) => n + g.vars.length, 0)} vars across ${primitiveGroups.length} collections)` + (notHidden.length ? ` — ${notHidden.slice(0, 3).join(', ')}` : ''));
  ok(wrongScope.length === 0, 'figma primitives: each ref-tier collection carries its role-family scopes (hidden-from-publishing does the hide; scopes still guide bespoke use)' + (wrongScope.length ? ` — ${wrongScope.slice(0, 3).join(', ')}` : ''));

  // Semantic-tier: every var must NOT be hidden.
  const semanticGroups: Array<{ tag: string; vars: any[] }> = [
    { tag: 'color', vars: color.flatMap((c) => c.variables) },
    { tag: 'space', vars: dims.space.variables },
    { tag: 'radius', vars: dims.radius.flatMap((c) => c.variables) },
    { tag: 'size', vars: dims.size.variables },
    { tag: 'border-width', vars: dims.borderWidth.variables },
    { tag: 'focus', vars: dims.focus.variables },
    { tag: 'opacity', vars: dims.opacity.variables },
    { tag: 'font-fluid', vars: fluid.flatMap((c) => c.variables) },
    { tag: 'font/weight-role', vars: font.variables.filter((v) => v.name.startsWith('font/weight-role/')) },
    { tag: 'layout', vars: layout.flatMap((c) => c.variables) },
  ];
  const wronglyHidden: string[] = [];
  for (const g of semanticGroups) {
    for (const v of g.vars) {
      if (v.hiddenFromPublishing) wronglyHidden.push(`${g.tag}:${v.name}`);
    }
  }
  ok(wronglyHidden.length === 0, `figma semantics: no semantic-tier var is hidden from publishing (${semanticGroups.reduce((n, g) => n + g.vars.length, 0)} vars across ${semanticGroups.length} collections)` + (wronglyHidden.length ? ` — ${wronglyHidden.slice(0, 3).join(', ')}` : ''));

  // Descriptions: every var across every collection has a non-empty description.
  const allColls: Array<{ tag: string; vars: any[] }> = [...primitiveGroups, ...semanticGroups];
  const emptyDesc: string[] = [];
  for (const g of allColls) for (const v of g.vars) {
    if (!v.description || v.description.length === 0) emptyDesc.push(`${g.tag}:${v.name}`);
  }
  ok(emptyDesc.length === 0, `figma descriptions: every variable carries a non-empty description sourced from the DTCG $description (${allColls.reduce((n, g) => n + g.vars.length, 0)} vars total)` + (emptyDesc.length ? ` — ${emptyDesc.slice(0, 3).join(', ')}` : ''));

  // Descriptions actually match the DTCG source (spot-check a handful of paths
  // across axes so a silent decoupling — someone writing custom description
  // text in the adapter — would be caught).
  const { tree } = buildTree(theme);
  const R = Object.keys(tree)[0];
  const spotChecks: Array<[string, any, string]> = [
    ['palette/red/550', tree[R].palette.red['550'], palette.variables.find((v) => v.name === 'palette/red/550')!.description],
    ['color/background/primary', tree[R].color.background.primary, color[0].variables.find((v) => v.name === 'color/background/primary')!.description],
    ['space/100', tree[R].space['100'], dims.space.variables.find((v) => v.name === 'space/100')!.description],
    ['radius/md', tree[R].radius.md, dims.radius[0].variables.find((v) => v.name === 'radius/md')!.description],
    ['opacity/50', tree[R].opacity['50'], dims.opacity.variables.find((v) => v.name === 'opacity/50')!.description],
    ['font/size/16', tree[R].font.size['16'], font.variables.find((v) => v.name === 'font/size/16')!.description],
    ['font/weight/400', tree[R].font.weight['400'], font.variables.find((v) => v.name === 'font/weight/400')!.description],
  ];
  const descMismatch: string[] = [];
  for (const [name, leaf, actual] of spotChecks) {
    // family carries the stack line FIRST, then the description; other tokens are exact.
    if (name.startsWith('font/family/')) continue;
    if (actual !== String(leaf.$description ?? '')) descMismatch.push(name);
  }
  ok(descMismatch.length === 0, 'figma descriptions: spot-check across axes matches the DTCG $description verbatim' + (descMismatch.length ? ` — ${descMismatch.slice(0, 3).join(', ')}` : ''));

  // font/family descriptions: still lead with the stack (fix #4 preserved),
  // AND the DTCG $description is threaded onto the end.
  const familyFusion: string[] = [];
  for (const v of font.variables.filter((v) => v.name.startsWith('font/family/'))) {
    const role = v.name.split('/')[2];
    const leaf = tree[R].font.family[role];
    const stackFirst = /^stack: [^—]+/.test(v.description);
    const carriesDtcg = v.description.includes(String(leaf.$description ?? ''));
    if (!stackFirst || !carriesDtcg) familyFusion.push(v.name);
  }
  ok(familyFusion.length === 0, 'figma font/family: description leads with the stack (fix #4) AND ends with the DTCG $description' + (familyFusion.length ? ` — ${familyFusion.slice(0, 3).join(', ')}` : ''));

  // Drift fence: same brand emits deterministically. Regenerate twice; the
  // sorted-keys JSON MUST be byte-identical. Catches accidental
  // Math.random / Date.now use, which the workflow rules ban.
  const first = JSON.stringify(buildFigmaColor(theme).palette);
  const second = JSON.stringify(buildFigmaColor(theme).palette);
  ok(first === second, 'figma palette: emit is deterministic (regeneration byte-identical)');
}

// ----------------------------------------- component-definition schema (docs/14 §2, DRAFT v0)
// Button, the first component def, validated against component-schema.ts — and its token
// bindings resolved against TWO brands' generated trees. That proves the definition is
// brand-INVARIANT structure bound to a VERIFIED contract (docs/14 §2), not observed values:
// build the def once, every brand materialises because the bindings resolve through roles.
{
  const nbT = nbTheme();
  const nbTree = buildTree(nbT).tree;
  const auroraT = brandTheme(parseDesignMd(readFileSync(resolve(HERE, '../examples/aurora.design.md'), 'utf8')).input);
  const auroraTree = buildTree(auroraT).tree;

  // Both calibration defs: structurally valid, and every token binding resolves across TWO
  // brands (build-once / materialise-everywhere), binding only semantic roles (no primitive leak).
  for (const [name, def] of [['Button', button], ['IconButton', iconButton], ['FieldLabel', fieldLabel], ['FieldMessage', fieldMessage], ['TextField', textField]] as [string, ComponentDef][]) {
    const s = validateComponentDef(def);
    ok(s.errors.length === 0, `component: ${name} def is structurally valid${s.errors.length ? ' — ' + s.errors.join('; ') : ''}`);
    const vnb = validateComponentDef(def, nbTree, nbT.root);
    const vau = validateComponentDef(def, auroraTree, auroraT.root);
    ok(vnb.errors.length === 0, `component: every ${name} token binding resolves in nb${vnb.errors.length ? ' — ' + vnb.errors.join('; ') : ''}`);
    ok(vau.errors.length === 0, `component: every ${name} token binding resolves in aurora${vau.errors.length ? ' — ' + vau.errors.join('; ') : ''}`);
    ok(vnb.warnings.length === 0 && vau.warnings.length === 0, `component: ${name} binds only semantic roles, no primitive-tier leak${[...vnb.warnings, ...vau.warnings].length ? ' — ' + [...vnb.warnings, ...vau.warnings].join('; ') : ''}`);
  }

  // Button carries the reconciled two-axis model bound to interactive.* (docs/20): intent
  // {primary,neutral,destructive} × appearance {filled,outline,text}, neutral default.
  ok(button.props.find((p) => p.name === 'intent')?.default === 'neutral', 'component: Button intent defaults to neutral (one primary per view)');
  ok(JSON.stringify(button.variants.appearance) === JSON.stringify(['filled', 'outline', 'text']), 'component: Button appearance axis is filled/outline/text (reconciled)');
  ok(!Object.values(button.tokens).some((v) => /color\.action\.|color\.foreground\.danger\.|foreground\.secondary/.test(String(v))), 'component: Button binds interactive.*/disabled.*, not the legacy action./danger./secondary roles');
  ok(iconButton.inherits === 'button' && !!iconButton.props.find((p) => p.name === 'aria-label')?.required, 'component: IconButton inherits button + REQUIRES an accessible name');

  // The field FAMILY (docs/20 §17, KB text-field): TextField is a HOST that composes the two
  // shared parts, and binds INPUT CHROME only — label/message colour+type live in their own defs.
  ok(['field-label', 'field-message'].every((p) => textField.composition?.composesWith?.includes(p)), 'component: TextField composes field-label + field-message (the shared parts, not re-declared)');
  ok(!Object.keys(textField.tokens).some((k) => /label|caption|message/.test(k)), 'component: TextField binds input chrome only — no label/message tokens (those live in the part defs)');
  ok(textField.tokens['border.rest'] === 'color.field.border.rest' && textField.tokens['border.hover'] === 'color.field.border.hover', 'component: TextField binds the stateful field border (rest + hover)');
  // read-only ≠ disabled — the live edge: read-only keeps full-contrast text.primary, not a dimmed disabled ink.
  ok(textField.tokens['text'] === 'color.text.primary' && textField.tokens['border.readonly'] === 'color.border.secondary', 'component: TextField read-only stays full-contrast (text.primary + border.secondary), not disabled.*');
  ok(textField.tokens['border.error'] === 'color.border.danger', 'component: TextField error is a border-only swap (border.danger)');
  // FieldMessage: every validation tone re-points BOTH ink + icon at the matching semantic role.
  ok(([['error', 'danger'], ['warning', 'warning'], ['success', 'success']] as const).every(([tone, role]) => fieldMessage.tokens[`${tone}.text`] === `color.text.${role}` && fieldMessage.tokens[`${tone}.icon`] === `color.icon.${role}`), 'component: FieldMessage tones bind text.<role> + icon.<role> (icon + text, never colour-only)');
  ok(fieldMessage.states.length === 0 && JSON.stringify(fieldMessage.variants.tone) === JSON.stringify(['default', 'error', 'warning', 'success']), 'component: FieldMessage is presentational with a tone axis');
  ok(!!fieldLabel.props.find((p) => p.name === 'children')?.required && fieldLabel.tokens['text'] === 'color.text.primary', 'component: FieldLabel requires text + binds the primary label ink');

  // The drift gate bites: a broken def is caught (missing avoid_when + an unresolvable binding).
  const broken = { ...button, ai: { ...button.ai, avoidWhen: '' }, tokens: { ...button.tokens, bogus: 'color.nope.nope' } } as ComponentDef;
  const vb = validateComponentDef(broken, nbTree, nbT.root);
  ok(vb.errors.some((e) => /avoidWhen/.test(e)), 'component: missing ai.avoidWhen fails the gate');
  ok(vb.errors.some((e) => /bogus/.test(e) && /does not resolve/.test(e)), 'component: a broken token binding fails the gate');

  // ------------------------------------------------- ANATOMY: the structural layer (#327, docs/28)
  // The schema gate above already proves every anatomy binding key resolves to a real leaf in BOTH
  // brands — because anatomy names keys in `tokens`, and `tokens` is what that loop validates. That
  // indirection is the reason this block doesn't need its own resolution pass: one check covers
  // both layers, and a typo in anatomy fails before a tree is even supplied.
  {
    const a = button.anatomy!;
    ok(!!a, 'anatomy: Button carries a structural layer');

    // The ceilings list is REQUIRED and asserted non-empty. A schema claiming Figma carries every
    // part is making a false claim; docs/14 §3 set this discipline for tokens and it is the same
    // discipline here. Touch-target expansion is the load-bearing entry — it is the one part of the
    // KB brief §2 that has no Figma expression at all.
    ok(a.codeOnly.length > 0, 'anatomy: codeOnly is non-empty — the Figma ceilings are stated, not silently lost');
    ok(a.codeOnly.some((c) => /touch-target/.test(c)), 'anatomy: touch-target expansion is declared code-only (no Figma equivalent for a hit area larger than the frame)');

    // Exactly one interaction target — the node that owns hit area, radius, fill and border, and
    // the one a materializer attaches the a11y role and focus ring to.
    ok(Object.values(a.parts).filter((p) => p.role === 'target').length === 1, 'anatomy: exactly one part is the interaction target');

    // The brief's parts are all present under the *Visual vocabulary (not *Icon — the slot holds
    // avatars, counters and spinners, KB button.md §2).
    ok(['container', 'leadingVisual', 'label', 'trailingVisual', 'spinner'].every((p) => p in a.parts), 'anatomy: the brief\'s parts are all declared');
    ok(!Object.keys(a.parts).some((p) => /Icon$/.test(p)), 'anatomy: slots use the *Visual vocabulary, not *Icon');
    // The spinner takes the LEADING VISUAL's position, never the label's — replacing a centred
    // label collapses the width, which the brief's don't-list prohibits by name.
    ok(a.parts.spinner.kind === 'overlay' && a.parts.spinner.replaces === 'leadingVisual', 'anatomy: the pending spinner replaces the leading visual (width-preserving), not the label');

    // ---- the projection ----------------------------------------------------------------------
    // #326's asymmetry is the reason a plan is built per slot-fill rather than per size alone. Two
    // plans at the same size must differ ONLY in the inline padding, and only on the filled side.
    const plain = figmaAnatomyPlan(button, 'medium');
    const lead = figmaAnatomyPlan(button, 'medium', { leading: true });
    const both = figmaAnatomyPlan(button, 'medium', { leading: true, trailing: true });
    const padOf = (p: typeof plain) => [p.root.bound.paddingLeft, p.root.bound.paddingRight];

    const labelSide = figmaVarName(button.tokens['size.medium.padding-x']);
    const visualSide = figmaVarName(button.tokens['size.medium.padding-x-visual']);
    ok(labelSide !== visualSide, `anatomy: the label side and visual side are different variables (${labelSide} vs ${visualSide})`);
    ok(JSON.stringify(padOf(plain)) === JSON.stringify([labelSide, labelSide]), 'anatomy: with no slots filled the button is symmetric — both sides take the label inset');
    ok(JSON.stringify(padOf(lead)) === JSON.stringify([visualSide, labelSide]), 'anatomy: a leading visual pulls in the LEADING inset only (Material 3 with-leading-icon-leading-space)');
    ok(JSON.stringify(padOf(both)) === JSON.stringify([visualSide, visualSide]), 'anatomy: visuals on both sides pull in both insets');

    // Optional slots materialize only when filled — otherwise every button would carry two empty
    // instance-swap nodes, which is the failure mode of projecting the schema rather than an instance.
    ok(!planPartNames(plain.root).includes('leadingVisual'), 'anatomy: an unfilled optional slot is absent from the plan');
    ok(planPartNames(lead.root).includes('leadingVisual'), 'anatomy: a filled optional slot is present in the plan');
    ok(planPartNames(plain.root).includes('label'), 'anatomy: the required label is always present');
    // An overlay is not a row cell — it takes another part's position, so it must never appear as
    // a child or the materializer would append a third item to the auto-layout row.
    ok(!planPartNames(both.root).includes('spinner'), 'anatomy: the overlay is not projected as a child node');

    // Layout survives the projection as Figma's own vocabulary.
    ok(plain.root.layoutMode === 'HORIZONTAL' && plain.root.counterAxisAlignItems === 'CENTER', 'anatomy: the row projects to horizontal auto-layout, centred on the cross axis');
    ok(plain.root.primaryAxisSizingMode === 'AUTO' && plain.root.counterAxisSizingMode === 'FIXED', 'anatomy: sizing {x: hug, y: fixed} projects to AUTO/FIXED');

    // Every size projects, and the geometry MOVES with the size — a projection that resolved every
    // size to the same variables would pass every check above while being useless.
    const perSize = (button.variants.size).map((s) => JSON.stringify(planBoundVars(figmaAnatomyPlan(button, s, { leading: true }).root)));
    ok(new Set(perSize).size === button.variants.size.length, `anatomy: each size projects to a distinct set of variables (${perSize.length} sizes, ${new Set(perSize).size} distinct)`);

    // ---- the binding cross-check: does the engine actually EMIT what the plan binds? ------------
    // This is what makes the projection more than an assertion about itself. `tokens` resolving in
    // the DTCG tree does not imply the variable reaches a Figma collection — those are two emitters.
    const emitted = new Set<string>();
    const emittedStyles = new Set<string>();
    for (const f of readdirSync(resolve(HERE, 'out/figma/nb'))) {
      if (!f.endsWith('.json')) continue;
      const j = JSON.parse(readFileSync(resolve(HERE, `out/figma/nb/${f}`), 'utf8'));
      for (const v of j.variables ?? []) emitted.add(v.name);
      for (const s of j.styles ?? []) emittedStyles.add(s.name);
    }
    ok(emitted.size > 0 && emittedStyles.size > 0, `anatomy: read the emitted Figma names (${emitted.size} variables, ${emittedStyles.size} styles)`);
    const bindErrs = button.variants.size.flatMap((s) =>
      [[false, false], [true, false], [true, true]].map(([l, t]) => planBindingErrors(figmaAnatomyPlan(button, s, { leading: l, trailing: t }), emitted, emittedStyles)).flat());
    ok(bindErrs.length === 0, `anatomy: every bound variable + text style exists in the emitted Figma set${bindErrs.length ? ` — MISSING: ${[...new Set(bindErrs)].slice(0, 4).join(', ')}` : ''}`);

    // The label's composite type is a Figma TEXT STYLE, not a variable — a different API and a
    // different namespace. It first projected into nothing at all (the plan carried an empty
    // `bound` on the label and dropped the typography silently), which is the exact class of loss
    // the codeOnly discipline exists to prevent — so it is asserted, not assumed.
    const labelNode = lead.root.children.find((c) => c.name === 'label')!;
    ok(!!labelNode.textStyle, 'anatomy: the label carries a text style — composite type is not silently dropped');
    ok(!Object.keys(labelNode.bound).length, 'anatomy: the text style is NOT in `bound` — it is applied via setTextStyleIdAsync, not setBoundVariable');
    ok(emittedStyles.has(labelNode.textStyle!), `anatomy: the label's text style resolves in the emitted styles (${labelNode.textStyle})`);
    // The two name mappings are NOT the same function: variables keep their full dotted path,
    // text styles drop the `type.` root. Asserting the asymmetry stops a future "simplification".
    ok(figmaVarName('type.label.md.emphasis') !== labelNode.textStyle, 'anatomy: text-style naming differs from variable naming (the `type.` root is dropped)');

    // The plugin shell is the transport, not the contract — but it must at least carry the plan and
    // the ceilings, and resolve variables by NAME so one plan works in any file with the token
    // passes already run (the same property `materialise-to-figma.ts` relies on).
    const js = planToPluginJs(lead);
    ok(js.includes('getLocalVariablesAsync') && js.includes('setBoundVariable'), 'anatomy: the plugin payload binds variables through the Plugin API');
    ok(js.includes(visualSide), 'anatomy: the plugin payload carries the asymmetric inset it was projected with');

    // A def whose anatomy is structurally broken must FAIL, not warn. Four shapes, each a real
    // authoring mistake rather than a synthetic one.
    const withAnatomy = (patch: (a: AnatomyDef) => AnatomyDef): ComponentDef =>
      ({ ...button, anatomy: patch(JSON.parse(JSON.stringify(a))) });
    const broke = (label: string, re: RegExp, patch: (a: AnatomyDef) => AnatomyDef) => {
      const errs = validateComponentDef(withAnatomy(patch), nbTree, nbT.root).errors;
      ok(errs.some((x) => re.test(x)), `anatomy gate: ${label}${errs.some((x) => re.test(x)) ? '' : ` — got [${errs.join('; ')}]`}`);
    };
    broke('an empty codeOnly list fails (the false claim that Figma holds everything)', /codeOnly/, (x) => ({ ...x, codeOnly: [] }));
    broke('a binding key tokens does not bind fails', /is not a slot in tokens/, (x) => ({ ...x, parts: { ...x.parts, container: { ...x.parts.container, gap: 'size.{size}.nope' } } }));
    broke('an orphan part fails (a materializer would silently drop it)', /unreachable/, (x) => ({ ...x, parts: { ...x.parts, container: { ...x.parts.container, children: ['label', 'trailingVisual'] } } }));
    broke('two interaction targets fail', /exactly one part must have role/, (x) => ({ ...x, parts: { ...x.parts, label: { ...x.parts.label, role: 'target' } } }));
    broke('a text part carrying layout fails', /only a 'box' lays out/, (x) => ({ ...x, parts: { ...x.parts, label: { ...x.parts.label, gap: 'size.{size}.gap' } } }));

    // ---- can the spike actually RUN? (#342) ---------------------------------------------------
    // The projection above is worthless if the variables it binds can't be got into a Figma file.
    // The plugin executor has written the float axes since #108, but the CLI paste path — the only
    // one an MCP-driven session can use — had colour passes and nothing else, so `size/*`,
    // `radius/*` and `icon/size/*` were unreachable. These assertions close the loop: every
    // variable the anatomy plan binds must appear in the payload that would be pasted.
    const dimsCreate = passJs('nb', 'dims-create');
    const wanted = [...new Set(button.variants.size.flatMap((s) => planBoundVars(figmaAnatomyPlan(button, s, { leading: true, trailing: true }).root)))];
    const unreachable = wanted.filter((v) => !dimsCreate.includes(`"${v}"`));
    ok(unreachable.length === 0, `anatomy: every variable the plan binds is in the dims-create payload${unreachable.length ? ` — UNREACHABLE: ${unreachable.join(', ')}` : ` (${wanted.length} vars)`}`);
    ok(passOrder().indexOf('dims-create') < passOrder().indexOf('dims-aliases'), 'materialise: dims-create is pasted before dims-aliases (a target must exist before it can be bound)');
  }
}

// ------------------------------------------- materialise-to-figma: the FLOAT paste path (#342)
// The two write paths — the CLI paste string and the live plugin executor — are supposed to be
// projections of ONE plan. They weren't: the plugin has written floats since #108 while the CLI
// had no pass for them at all, and nothing asserted the two agreed. This is that assertion.
{
  const pluginAxes = buildFloatWritePlan(nbTheme()).map((p) => p.name).sort();
  const pasteAxes = floatCollections('nb').sort();
  ok(JSON.stringify(pluginAxes) === JSON.stringify(pasteAxes),
    `materialise: the paste path covers every float axis the plugin path writes${JSON.stringify(pluginAxes) === JSON.stringify(pasteAxes) ? ` (${pasteAxes.length})` : ` — plugin [${pluginAxes}] vs paste [${pasteAxes}]`}`);

  const create = passJs('nb', 'dims-create');
  const aliases = passJs('nb', 'dims-aliases');

  // FLOAT, not COLOR — a float variable created with the colour type silently accepts no numeric
  // value, and the failure surfaces only when something tries to bind it.
  ok(create.includes("'FLOAT'") && !create.includes("'COLOR'"), 'materialise: dims-create creates FLOAT variables');

  // Every scope must decode. An unknown scope encodes to '?', which would reach the Plugin API as
  // `undefined` and throw at paste time — the exact class of error a payload should never carry.
  ok(!/"[a-z*]*\?[a-z*]*"/.test(create), 'materialise: every float scope encodes to a known code (no `?` in the payload)');

  // Alias targets must resolve WITHIN the float lane — `size/md/gap → space/100`,
  // `icon/size/md → dimension/24`. A target naming a variable no create pass makes would paste
  // clean and then miss silently at bind time.
  const created = new Set<string>();
  // `?` is in the class deliberately: a bad scope code must fail the scope assertion above on its
  // own, not by quietly shrinking this set and making the dangling check fail for the wrong reason.
  for (const m of create.matchAll(/\["([a-z0-9/\-.]+)","[a-z*?]*",/g)) created.add(m[1]);
  const targets = new Set<string>();
  for (const m of aliases.matchAll(/\["([a-z0-9/\-.]+)",\[([^\]]*)\]\]/g))
    for (const t of m[2].split(',')) { const s = t.replace(/"/g, '').trim(); if (s && s !== 'null') targets.add(s); }
  ok(created.size > 0 && targets.size > 0, `materialise: parsed the float payloads (${created.size} created, ${targets.size} distinct alias targets)`);
  const dangling = [...targets].filter((t) => !created.has(t));
  ok(dangling.length === 0, `materialise: every float alias target is created by the same pass${dangling.length ? ` — DANGLING: ${dangling.slice(0, 5).join(', ')}` : ''}`);

  // The component tier is the reason this pass exists (#327 binds it), so name it explicitly
  // rather than trusting the axis-coverage check to imply it.
  for (const v of ['size/md/gap', 'size/md/padding-x-visual', 'icon/size/md', 'radius/md'])
    ok(create.includes(`"${v}"`), `materialise: dims-create carries ${v}`);

  // Payload budget — the reason the colour lane is split across three passes in the first place.
  for (const name of passOrder())
    ok(Buffer.byteLength(passJs('nb', name), 'utf8') < 45_000, `materialise: pass '${name}' is inside the figma_execute budget (${Buffer.byteLength(passJs('nb', name), 'utf8')} bytes)`);
}

// ------------------------------------------------------------------- neutral.auto
// `neutral.auto` derives the cast hue from the brand primary at build (re-tracks on recolour); an
// explicit (non-auto) hue stays frozen. Chroma 0.03 makes the hue visible in the generated steps.
{
  const nSteps = (h: number, opts: { auto?: boolean } = {}) =>
    JSON.stringify(brandTheme({ id: 'na', primary: { l: 0.55, c: 0.15, h }, neutral: { hue: 200, chroma: 0.03, ...opts } })
      .palettes.find((p) => p.palette === 'neutral')!.steps.map((s) => s.hex));
  ok(nSteps(30, { auto: true }) !== nSteps(300, { auto: true }), 'neutral.auto: the cast follows the brand primary hue (differs when primary differs)');
  ok(nSteps(200, { auto: true }) === nSteps(200), 'neutral.auto: at hue == primary.h it is byte-identical to the frozen (non-auto) snapshot');
  ok(nSteps(30) === nSteps(300), 'neutral (non-auto): an explicit hue stays frozen regardless of the primary');
  // #231 review — the no-neutral path injects `neutral.auto`, which MUST satisfy the BrandInput schema,
  // else `validateBrandInput` hard-fails the standard-dialect CLI/MCP path (it runs before build).
  const noNeutral = standardToBrandInput(parseStandardDesignMd('---\nname: b\ncolors:\n  primary: "#3366cc"\n---\n')).input;
  ok(noNeutral.neutral.auto === true, 'neutral.auto: a standard brief with no neutral classifies to auto-follow');
  const withAuto = { id: 'x', primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.006, auto: true } };
  ok(validateBrandInput(withAuto).length === 0, `neutral.auto: a BrandInput carrying neutral.auto satisfies the schema (errors: ${JSON.stringify(validateBrandInput(withAuto))})`);
}

// ------------------------------------------------------------------- source hygiene: no NUL bytes
// A raw 0x00 in a TypeScript source is legal to the compiler and invisible in an editor, but it makes
// the file BINARY to the whole grep/ripgrep family — content searches return "binary file matches"
// with no lines, silently hiding the file from exactly the tool used to navigate it. It bit twice:
// once in `web/src/main.ts` (typed as a separator, broke a Playwright `select_option` because the
// option values no longer matched) and once in `tree.ts:548`'s `stackKey`, where it hid the engine's
// largest source file from content search.
//
// Both cases were the same slip: intending the ESCAPE (a backslash-u sequence) and emitting the CHARACTER. The
// escape is byte-identical at runtime, so there is never a reason for the literal byte to be here —
// which makes this a cheap total ban rather than a judgement call. Scans the engine plus both
// bundled surfaces, since the class has now appeared in each.
{
  const roots = [HERE, resolve(HERE, '../../web/src'), resolve(HERE, '../../plugin/src')];
  const TEXT = /\.(ts|tsx|js|mjs|json|md|html|css)$/;
  const sources: string[] = [];
  const walk = (dir: string, into: string[]): void => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
      const p = join(dir, e.name);
      // `out/` is generated wholesale and gated by regen.ts --check; this is about hand-written source.
      if (e.isDirectory()) { if (e.name !== 'out') walk(p, into); }
      else if (TEXT.test(e.name)) into.push(p);
    }
  };
  // Per-root counts, so the liveness check below can name the root that went dark. A total-count
  // threshold would be the obvious thing and is the wrong thing — it drifts with ordinary file churn,
  // so it either rots into noise or gets set so low it stops proving anything.
  const perRoot = roots.map((r) => { const found: string[] = []; walk(r, found); sources.push(...found); return { r, n: found.length }; });

  const offenders: string[] = [];
  for (const p of sources) {
    const buf = readFileSync(p);
    const at = buf.indexOf(0);
    if (at !== -1) {
      // Report line:col so the fix is a jump, not a hunt — the byte is invisible in an editor.
      const line = buf.subarray(0, at).toString('utf8').split('\n').length;
      offenders.push(`${relative(resolve(HERE, '../..'), p)}:${line}`);
    }
  }
  ok(offenders.length === 0,
    `source hygiene: no raw NUL byte in hand-written source (use the escape '\\u0000' — byte-identical at runtime, and keeps the file greppable)`
    + (offenders.length ? ` — OFFENDERS: ${offenders.join(', ')}` : ''));
  // Guard against the scan silently going dark — a renamed/moved surface, or a tightened extension
  // list, would make the check above vacuously green. Every root must contribute at least one file.
  const dark = perRoot.filter((x) => x.n === 0).map((x) => relative(resolve(HERE, '../..'), x.r));
  ok(dark.length === 0,
    `source hygiene: the scan is live — every scanned root contributed files (${perRoot.map((x) => x.n).join('+')} = ${sources.length})`
    + (dark.length ? ` — EMPTY ROOTS: ${dark.join(', ')} (moved or renamed? point the scan at the new path)` : ''));
}

// ------------------------------------------------------------------- report
console.log(`\nPrism3 engine tests: ${pass} passed, ${fails.length} failed`);
if (fails.length) { fails.forEach((f) => console.log(`  ❌ ${f}`)); process.exitCode = 1; }
else console.log('  ✓ colour math + extreme-brand contracts all hold');
