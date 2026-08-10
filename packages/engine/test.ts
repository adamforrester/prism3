/**
 * Prism3 engine — test suite (dependency-free, run via tsx).
 *
 *   npx tsx packages/engine/test.ts
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
import { radiusScale, ICON_SIZES, componentSizes, dimensionGrid, spaceScale, SPACE_BASE, GRID_BASE, MIN_TARGET_PX } from './scale';
import { at, deref, pxOf, buildTree, familyOf } from './tree';
import { brandTheme, BrandInput, inRedTerritory, normalizeDisabledStrategy, normalizeDisabledMin, derivedRungFor, LINE_HEIGHT_KEYS, LETTER_SPACING_KEYS, LINE_HEIGHT_LADDER, LETTER_SPACING_LADDER, lineHeightStepKey, letterSpacingStepKey } from './theme';
import { nbTheme } from './nb-fixture';
import { resolveAllModes, outlineFillFamily, outlineFillRole } from './modes';
import { parseDesignMd, parseYamlSubset, toDesignMd } from './design-md';
import { parseStandardDesignMd, standardToBrandInput, applyXPrism3 } from './standard-design-md';
import { classifyColors } from './classify-colors';
import { SLIDER_STOPS, TRAITS, resolveVocabulary } from './vocabulary';
import { leverManifest, leverGroups, buildLeverManifest, identityFields } from './levers';
import { previewSpec, previewTokenRefs, buildPreviewSpec } from './preview';
import { resolvePreview } from './resolve-preview';
import { exampleBrands, exampleBrandsJson, EXAMPLE_IDS } from './emit-brandinput';
import { buildFigmaColor, buildFigmaFont, buildFigmaFontFluid, buildFigmaTextStyles, buildFigmaDims, buildFigmaLayout, buildFigmaShadow, buildFigmaGradient, fontStyleName, figName, parseColor, figmaArtifacts, COLOR_MODES, FONT_FLUID_MODES, LAYOUT_MODES } from './emit-figma';
import { buildBase, buildOverlay, overlayModes, buildOverlaySet, leafCount, DTCG_TYPES } from './emit-dtcg-overlay';
import { callTool as mcpCallTool, unsafeOutDir, EXPORT_SECTIONS } from './mcp';
import { buildTree, validateBrandInput } from './emit-dtcg';
import { buildAiMetadata } from './ai-metadata';
import { handleRpc, callTool, toolDefs, manifestRootKeys, LATEST_PROTOCOL_VERSION, SERVER_INFO } from './mcp';
import { ENGINE_VERSION, CONTRACT_VERSION, classify, satisfiesBump } from './version';
import { buildContract, corpus, pathsOf, MINIMAL_BRAND } from './token-contract';
import { scoreConsumption, scoreContractCompliance, tokenPaths, normalizeRef, isPrimitiveRef, PRIMITIVE_TIERS } from './eval';
import { runEval, buildPrompt, extractRefs, extractPairs, SAMPLE_TASKS } from './eval-run';
import { aliasRows, floatCollections, fontCollections, passJs, passOrder, pruneReport } from './materialise-to-figma';
import { buildWritePlan, buildFloatWritePlan, buildStylesPlan, gradientTransformFor, buildFontVarPlan, buildTextStylePlan, fontVarPlanFrom, stylesPlanFromFiles, textStylePlanFromFiles } from './write-plan';
import { verifyReadback, verifyFloatReadback, verifyTypographyReadback, ReadbackSnapshot } from './read-back';
import { serializeBrandInput, deserializeBrandInput, PERSIST_VERSION, UnrecognizedPersistedInputError } from './persist-input';
import { validateComponentDef, figmaPropertyErrors, figmaAxisNames, figmaVariantCount, ComponentDef, AnatomyDef } from './component-schema';
import { figmaAnatomyPlan, figmaAnatomySet, planBindingErrors, planSetProperties, planSetLayout, planPartNames, planBoundVars, planPaintVars, planEffectStyles, planTextStyles, planToPluginJs, planSetToPluginJs, planSetChunks, stripPayloadComments, SET_CHUNK_BYTES, planComponentName, figmaVarName, type AnatomyPlan } from './anatomy-figma';
// The one import this suite makes ACROSS the engine/plugin boundary, and the parity gate (#487 step 5)
// is why: with two executors for one `AnatomyPlan`, a gate that only ever sees one of them cannot say
// they agree. `write-components.ts` is pure TypeScript against a declared port — it touches no `figma`
// global at runtime — so importing it into a Node harness costs nothing and needs no shim of its own.
import { applyComponentPlan } from '../../apps/plugin/src/write-components';
import type { AnatomyPlan } from './anatomy-figma';
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
  // L-02 (#557): a NON-MONOTONIC-IN-CONTRAST ramp. High chroma at a hue where chroma raises
  // luminance (cyan) makes the pinned anchor's WCAG Y exceed its own lighter neighbour's, so a
  // state walk toward "more contrast" walked DOWN. Held here — not only in the block below — so
  // this shape is covered by the all-contracts and L-01 sweeps like any other corpus brand.
  { id: 't-nonmono', primary: { l: 0.55, c: 0.30, h: 180 }, neutral: { hue: 180, chroma: 0.01 } },
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

// L-02 (#557) — the state WALK re-verifies each step against the state's own floor.
//
// Why this needs its own block on top of the corpus sweep above: that sweep would catch the
// regression, but it reports "some contract failed", and the same symptom has a dozen causes.
// This pins the MECHANISM, so a refactor that drops the `guard` argument fails with a message
// naming what broke and why the ramp misleads.
{
  // The premise the walk used to rely on: step away from rest ⇒ more contrast. Establish FIRST
  // that this brand's ramp genuinely violates it, so the assertions below can't pass vacuously
  // (if a future ramp change made the ramp monotonic again, this brand stops being a test case —
  // fail loudly rather than keep asserting something the input no longer exercises).
  const theme = brandTheme({ id: 't-nonmono', primary: { l: 0.55, c: 0.30, h: 180 }, neutral: { hue: 180, chroma: 0.01 } });
  const steps = theme.palettes.find((p) => p.palette === theme.roleToPalette.action)!.steps;
  const y = (n: number) => luminance(steps.find((s) => s.num === n)!.rgb);
  ok(y(500) > y(450), `L-02: the fixture's ramp really is non-monotonic in luminance — step 500 (Y ${y(500).toFixed(4)}) is LIGHTER than 450 (Y ${y(450).toFixed(4)}) despite being nominally darker, because exact-anchor preservation keeps 500 at full chroma. Without this the walk assertions below prove nothing.`);
  ok(steps.every((s, i) => i === 0 || s.oklch.l <= steps[i - 1].oklch.l + 1e-9), 'L-02: …while that SAME ramp is monotonic in OKLCH lightness — which is why ramp.ts M-02 passes it. Lightness order is what the pickers need; luminance order is what the walk needs, and only one was ever checked.');

  const light = resolveAllModes(theme).find((m) => m.mode === 'light')!;
  const walked = Object.entries(light.roles).filter(([k, r]) => r.min > 0 && /\.(hover|pressed|focused|selected|visited)$/.test(k));
  ok(walked.length > 0, 'L-02: the light mode emits walked, contrast-gated states to check');
  const under = walked.filter(([, r]) => r.ratio < r.min);
  ok(under.length === 0, `L-02: every walked state clears its OWN floor on a non-monotonic ramp` + (under.length ? ` — FAILED: ${under.map(([k, r]) => `${k} ${r.ratio.toFixed(3)}<${r.min}`).join(', ')}` : ''));

  // The exact roles the bug produced: BOTH hover and focused walk +1, so it was two roles per
  // palette per mode, not one — the issue named only hover.
  for (const st of ['hover', 'focused']) {
    const r = light.roles[`interactive.primary.fill.${st}`];
    ok(r.ratio >= r.min, `L-02: interactive.primary.fill.${st} (walk +1, the step that landed on the non-monotonic 500) clears ${r.min}:1 — got ${r.ratio.toFixed(3)} at ${r.path}`);
  }
  // Distinctness is bought BY CONSTRUCTION, not repaired after: counting QUALIFYING steps means
  // hover takes the 1st clearing step and pressed the 2nd, so they cannot coincide. The naive
  // fix (keep walking until the floor clears) lands hover exactly on pressed's step — it buys
  // the floor with the collapse L-01 exists to prevent. This asserts the shape, not just the floor.
  const p = (k: string) => light.roles[k].path;
  ok(p('interactive.primary.fill.hover') !== p('interactive.primary.fill.pressed'),
    `L-02: skipping a non-qualifying step does NOT collapse hover onto pressed (${p('interactive.primary.fill.hover').split('.').pop()} vs ${p('interactive.primary.fill.pressed').split('.').pop()}) — the naive "walk until it clears" repair would have made these equal`);
  ok(p('interactive.primary.fill.rest') !== p('interactive.primary.fill.hover'), 'L-02: rest and hover stay distinct on a non-monotonic ramp');

  // L-02 × #331 — the guard applies only where a floor was actually INHERITED. An authored anchor
  // pin that misses its floor is applied verbatim and reported (#331 apply-but-warn), so its
  // walked states have no verified floor to inherit; guarding them would walk hover/pressed off to
  // wherever the floor is met and bury the pin in the very states meant to reveal it — the
  // substitution #331 deleted, one level down. This is the assertion that caught it: guarding
  // unconditionally failed #331's own "walk forward from the RAW pinned step" check.
  {
    const pinnedT = brandTheme({ id: 't-pin-nonmono', primary: { l: 0.55, c: 0.30, h: 180 }, neutral: { hue: 180, chroma: 0.01 },
      brandColors: [{ name: 'accent', oklch: { l: 0.55, c: 0.30, h: 180 } }],   // same high-chroma cyan → non-monotonic ramp
      interactivePalettes: [{ palette: 'accent', anchorStep: 100 }] } as unknown as BrandInput);
    const r = resolveAllModes(pinnedT).find((m) => m.mode === 'light')!.roles;
    const num = (k: string) => Number(r[k].path.split('.').pop());
    ok(r['interactive.accent.fill.rest'].ratio < r['interactive.accent.fill.rest'].min, 'L-02×#331: the pinned anchor still misses its floor (applied, not substituted) — the precondition for the next assertion');
    // ADJACENCY, not merely direction: the plain walk off 100 is exactly 150 then 200. A
    // "forward and increasing" assertion is VACUOUS here — with the guard wrongly applied these
    // land on 450/550, which is still forward and still increasing, so only pinning the exact
    // steps distinguishes "kept the pin" from "relocated to wherever the floor is met".
    ok(num('interactive.accent.fill.hover') === 150 && num('interactive.accent.fill.pressed') === 200,
      `L-02×#331: states off a FAILING pin keep the plain adjacent walk (100 -> ${num('interactive.accent.fill.hover')} -> ${num('interactive.accent.fill.pressed')}, want 150 -> 200) — the floor guard must not relocate them to where the floor happens to be met`);
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
    for (const slot of ['on-fill', 'text.rest', 'text.hover', 'text.pressed', 'border.rest', 'border.hover', 'border.pressed'])
      if (!(`interactive.${c}.${slot}` in light)) shapeMissing.push(`interactive.${c}.${slot}`);
    // The bare leaf is GONE, not merely superseded (#576). Asserted explicitly because the loop
    // above cannot see it: adding `border.rest` while leaving `border` behind would satisfy every
    // check there and ship the exact leaf-and-group shape that stock Style Dictionary silently
    // flattens, dropping all three states for a conforming consumer.
    if (`interactive.${c}.border` in light) shapeMissing.push(`interactive.${c}.border STILL PRESENT as a bare leaf`);
  }
  ok(shapeMissing.length === 0, 'interactive: primary/neutral/destructive each carry fill(+5 states)/on-fill/text.{rest,hover,pressed}/border.{rest,hover,pressed}' + (shapeMissing.length ? ` — MISSING ${shapeMissing.slice(0, 4).join(',')}` : ''));
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
  // Every border STATE must carry the stroke scope, not just the one that used to be the whole slot
  // — a state emitted without it would land in Figma unusable as a stroke (#576).
  for (const st of ['rest', 'hover', 'pressed'])
    if (scopeOf(`color/interactive/primary/border/${st}`) !== JSON.stringify(['STROKE_COLOR'])) scopeBad.push(`primary/border/${st}`);
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
      ['aurora', brandTheme(parseDesignMd(readFileSync(resolve(HERE, './examples/aurora.design.md'), 'utf8')).input)],
      ['harbor', brandTheme(parseDesignMd(readFileSync(resolve(HERE, './examples/harbor.design.md'), 'utf8')).input)],
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
    ['aurora', brandTheme(parseDesignMd(readFileSync(resolve(HERE, './examples/aurora.design.md'), 'utf8')).input)],
    ['harbor', brandTheme(parseDesignMd(readFileSync(resolve(HERE, './examples/harbor.design.md'), 'utf8')).input)],
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

  // THE GATE THIS TIER LACKED: five names must be five DISTINCT, INCREASING heights, at every
  // density and every rhythm. The tier asserted its PADDING contract thoroughly and never once
  // checked the heights, so a clamped density shift published `compact` xs==sm and `spacious`
  // lg==xl for as long as those densities have existed — visible in committed output (aurora is
  // compact) and invisible to 1269 passing tests. A size step whose height equals its neighbour's
  // is not a smaller size, it is the same size under a second name.
  const heightBreaks: string[] = [];
  for (const d of ['compact', 'comfortable', 'spacious'] as const) {
    for (const base of [4, 8, 12]) {
      const hs = componentSizes(d, base).map((z) => z.height);
      for (let i = 1; i < hs.length; i++)
        if (!(hs[i] > hs[i - 1])) heightBreaks.push(`${d}/base${base}: ${hs.join('/')} — step ${i} does not increase`);
    }
  }
  ok(heightBreaks.length === 0, 'size heights are strictly increasing across xs…xl, at every density / spaceBase'
    + (heightBreaks.length ? ` — BROKEN: ${heightBreaks.slice(0, 4).join(' | ')}` : ''));

  // WCAG 2.2 SC 2.5.8 Target Size (Minimum), AA — no reachable control may be under 24 CSS px.
  //
  // The reachable set is now FINITE and small: the spacing rhythm is fixed and density is an enum of
  // three, so `3 densities × 5 steps` is the whole space a brand can produce — this enumerates 100%
  // of it rather than sampling. (Before the rhythm was locked, `spaceBase 4` put compact xs/sm/md at
  // 16/16/20px with nothing to catch it; that is unreachable now, and this is what keeps it so.)
  //
  // `compact` xs sits on exactly 24 — the floor is held by arithmetic, not by construction, which is
  // the reason to pin it: one more rung below the ladder, or a wider density window, drops it under
  // the criterion silently.
  const tooSmall: string[] = [];
  for (const d of ['compact', 'comfortable', 'spacious'] as const)
    for (const z of componentSizes(d, SPACE_BASE))
      if (z.height < MIN_TARGET_PX) tooSmall.push(`${d}/${z.name}: ${z.height}px`);
  ok(tooSmall.length === 0, `WCAG 2.2 SC 2.5.8 — every reachable control height is >= ${MIN_TARGET_PX}px`
    + (tooSmall.length ? ` — UNDER: ${tooSmall.join(', ')}` : ''));

  // And the floor is actually EXERCISED — a gate that only ever runs far above its threshold would
  // pass just as happily if the threshold were wrong. The smallest reachable control must sit ON it.
  ok(Math.min(...componentSizes('compact', SPACE_BASE).map((z) => z.height)) === MIN_TARGET_PX,
    `the smallest reachable control is exactly the ${MIN_TARGET_PX}px floor (the gate is load-bearing, not slack)`);

  // `comfortable` is the historical ladder and must not have moved — the window reframing is a fix
  // for the ENDS, so the untouched middle is the proof it changed only what was broken.
  ok(componentSizes('comfortable', 8).map((z) => z.height).join('/') === '32/40/48/56/64',
    'comfortable @ base 8 is unchanged by the window reframing (32/40/48/56/64)');

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
    const expected = { compact: '8,8,16,16,24', comfortable: '8,16,16,24,24', spacious: '16,16,24,24,32' }[d];
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
  for (const [id, t] of [['nb', nbTheme()], ['aurora', brandTheme(parseDesignMd(readFileSync(resolve(HERE, './examples/aurora.design.md'), 'utf8')).input)]] as Array<[string, any]>) {
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
    // hover border is a STRONGER boundary than rest, on the same page ground — a perceptible, not
    // sole, state cue. Gated at the NON-TEXT bar like rest (#352 item 4): a border carries no text,
    // so the old `secondaryMin` target was a text constant doing a non-text job. The state cue is
    // carried by a step OFFSET instead, so what is asserted here is "strictly stronger than rest",
    // not a second absolute ratio.
    if (bh.against !== 'background.primary' || bh.min < 3 || bh.ratio < bh.min || bh.ratio <= b.ratio) fails.push(`${m.mode}:border.hover ${bh.ratio.toFixed(2)}<${bh.min}@${bh.against}`);
    // placeholder is readable on the field fill — NOT a sub-AA hint.
    if (p.against !== 'field.fill' || p.min < 4.5 || p.ratio < p.min) fails.push(`${m.mode}:placeholder ${p.ratio.toFixed(2)}<${p.min}@${p.against}`);
  }
  ok(fails.length === 0, 'field: rest border ≥3:1 + hover border stronger than rest on the page + placeholder ≥4.5 on the fill, every mode' + (fails.length ? ` — ${fails.join(',')}` : ''));

  // ...and the delta is UNIFORM across modes, which is the whole point of an offset over a ratio.
  // Chasing an absolute ratio made the perceptual delta depend on wherever `rest` happened to land:
  // 2 ramp steps in light/dark but 3 in HC, for the same nominal "hover" affordance.
  const fbStep = (r: any) => Number(r.path.split('.').pop());
  const fbDeltas = modes.map((m: any) => Math.abs(fbStep(m.roles['field.border.hover']) - fbStep(m.roles['field.border.rest'])));
  ok(new Set(fbDeltas).size === 1 && fbDeltas[0] === 100,
    `field: hover sits a uniform 2 ramp steps from rest in every mode (deltas ${fbDeltas.join(', ')})`);
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

// #479 — pruneReport: the paste path's plan-vs-file diff. REPORT ONLY (the function has no
// deletion path to test the absence of, unlike the plugin's `orphansOf` — this is pure name-set
// arithmetic, so the whole contract is: which names come back, and with which reason). Synthetic
// existing/planned sets throughout — no live Figma file is needed for the algorithm itself; see the
// `verify` pass wiring test below for what still needs a real file to close the loop end to end.
{
  // The set-difference direction, first — must not flag a planned-but-not-yet-created name (that's
  // a create, not an orphan), mirroring the same direction check the plugin's `orphansOf` carries.
  const basic = pruneReport(['a', 'b', 'c'], ['a', 'c']);
  ok(basic.length === 1 && basic[0].name === 'b', 'pruneReport: a name in the file but not the plan is the one orphan reported');
  ok(pruneReport(['a'], ['a', 'b']).length === 0, 'pruneReport: a name in the PLAN but not the file is NOT an orphan (that is a create)');
  ok(pruneReport(['z', 'a'], []).map((o) => o.name).join() === 'a,z', 'pruneReport: sorted, so two runs diff cleanly');
  ok(pruneReport([], ['a', 'b']).length === 0, 'pruneReport: nothing in the file — nothing to report, regardless of plan size');

  // The two live-drive ghost shapes from #479's own report, reason-classified.
  const ghosts = pruneReport(
    ['palette/accent/550', 'color/interactive/primary/text', 'color/interactive/primary/text/rest', 'color/background/primary'],
    ['color/interactive/primary/text/rest', 'color/background/primary'],
  );
  const byName = new Map(ghosts.map((o) => [o.name, o.reason]));
  ok(ghosts.length === 2, `pruneReport: reports exactly the two names absent from the plan (got ${ghosts.map((o) => o.name).join(', ')})`);
  ok(byName.get('color/interactive/primary/text') === 'path now used as a group prefix, not a leaf',
    'pruneReport: a flat leaf stranded when its path became a stateful group is classified as a group-prefix orphan (class 1)');
  ok(byName.get('palette/accent/550') === 'no longer referenced by any current plan',
    'pruneReport: a name with no structural relation to the plan at all is classified as simply gone (class 2 — the pre-rename palette generation)');

  // A prefix relationship must be a REAL path segment boundary, not a string-prefix coincidence —
  // 'color/text' is not a stray leaf of 'color/texture/pattern' just because the characters line up.
  const noFalsePrefix = pruneReport(['color/text'], ['color/texture/pattern']);
  ok(noFalsePrefix.length === 1 && noFalsePrefix[0].reason === 'no longer referenced by any current plan',
    'pruneReport: a bare string-prefix match with no path separator is NOT a group-prefix classification (color/text vs color/texture)');
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

// BrandInput PERSISTENCE (#131, #480): the shared-data round-trip + version guard. A persisted
// brand must deserialise back to the EXACT input (so re-opening a themed file rehydrates the
// knobs); genuine absence (nothing ever stored) collapses to `null`; anything NON-EMPTY that can't
// be trusted (garbage / drift / non-object) must REFUSE LOUDLY (throw `UnrecognizedPersistedInputError`)
// rather than collapsing to `null` — #480 found that a silent `null` here is indistinguishable from
// "no theme yet", which is exactly how a pre-#341/#415 blob's numeric `displayCeiling` risked being
// silently accepted rather than refused.
{
  const brand = exampleBrands()['aurora'] as BrandInput;
  const back = deserializeBrandInput(serializeBrandInput(brand));
  ok(JSON.stringify(back) === JSON.stringify(brand), 'persist: serialize→deserialize round-trips a BrandInput exactly (knob rehydration)');

  const throwsUnrecognized = (fn: () => unknown): boolean => {
    try { fn(); return false; } catch (e) { return e instanceof UnrecognizedPersistedInputError; }
  };

  ok(deserializeBrandInput('') === null, 'persist: empty blob → null (unset shared-data key — genuinely never stored)');
  ok(throwsUnrecognized(() => deserializeBrandInput('not json {')), 'persist: corrupt/non-JSON blob → throws (#480, not null)');
  ok(throwsUnrecognized(() => deserializeBrandInput(JSON.stringify({ v: PERSIST_VERSION + 1, input: brand }))), 'persist: version newer than this build → throws (#480, not null)');
  // The reported #480 case: a pre-#341/#415 blob is stamped `v: 1` (the version in force before
  // those PRs, and before this fix bumped PERSIST_VERSION to 2) — it must be refused, not silently
  // decoded as the current shape.
  ok(throwsUnrecognized(() => deserializeBrandInput(JSON.stringify({ v: 1, input: brand }))), 'persist: pre-#341/#415 version stamp (v:1) → throws (#480), not silently mis-read as current shape');
  ok(throwsUnrecognized(() => deserializeBrandInput(JSON.stringify({ v: PERSIST_VERSION }))), 'persist: missing input → throws (#480, not null)');
  ok(throwsUnrecognized(() => deserializeBrandInput(JSON.stringify({ input: brand }))), 'persist: missing version stamp ("no stamp") → throws (#480, not null)');
  ok(throwsUnrecognized(() => deserializeBrandInput('42')) && throwsUnrecognized(() => deserializeBrandInput('null')), 'persist: non-object JSON → throws (#480, not null)');

  // The envelope guard (version + input-is-object) is deliberately shallow — the persisted blob is
  // PUBLIC shared-data, so a versioned-but-shape-invalid payload (`{v:2, input:{}}`) clears the
  // envelope and deserialises to a non-null object. The SHAPE gate is downstream: the restore
  // handler runs `brandTheme` (exactly as Import does) before loading, and rejects it — so the boot
  // render never sees a brand with no `primary`. Assert both halves of that contract here. This is
  // deliberately NOT part of the version guard's job (#480 is the version stamp only, option 1; a
  // migration for the specific pre-#341/#415 shape is option 2, deferred — see docs/00-progress.md).
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
  // FLOAT alias IS caught. (The full write→read→verify round-trip is covered in apps/plugin/test-readback.)
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

  // (a2) the outline EDGE on the dark band (#467). Before this the border was emitted once against
  //      `background.primary` and reused on the inverse band, so the pair was never measured — the
  //      432 contracts all passed without checking it. This asserts the ground and the floor, which
  //      is the whole point: it makes a failing edge a gate failure rather than a silent ship.
  //      Now per STATE (#576) — and every state is checked, not just rest. A hovered outline on a
  //      dark hero is as real as a resting one, and #467's finding was precisely that an unmeasured
  //      edge on this ground passes every other gate: Wendy's landed 3.30:1 with the whole suite
  //      green. Three states means three chances to repeat that, so all three are measured.
  const invBdFails: string[] = [];
  for (const m of modes)
    for (const c of ['primary', 'neutral', 'destructive'])
      for (const st of ['rest', 'hover', 'pressed']) {
        const r = m.roles[`interactive.${c}.on-inverse.border.${st}`];
        if (!r) { invBdFails.push(`${m.mode}:${c}:${st}:absent`); continue; }
        if (r.against !== 'background.inverse.primary') invBdFails.push(`${m.mode}:${c}:${st}:against=${r.against}`);
        if (r.min > 0 && r.ratio < r.min) invBdFails.push(`${m.mode}:${c}:${st}:${r.ratio.toFixed(2)}<${r.min}`);
      }
  ok(invBdFails.length === 0, 'inverse: interactive.<color>.on-inverse.border.{rest,hover,pressed} each gated on the inverse surface in every mode' + (invBdFails.length ? ` — ${invBdFails.slice(0, 3).join(',')}` : ''));

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
  const accMissing = ['fill.rest', 'on-fill', 'text.rest', 'border.rest', 'border.hover', 'border.pressed', 'on-inverse.text.rest', 'on-inverse.fill.rest', 'on-inverse.on-fill', 'overlay.hover'].filter((s) => !(`interactive.accent.${s}` in accLight));
  const accFails = acc.flatMap((m) => Object.entries(m.roles).filter(([k, r]) => k.startsWith('interactive.accent') && r.min > 0 && r.ratio < r.min).map(([k]) => `${m.mode}.${k}`));
  ok(accMissing.length === 0 && accFails.length === 0, 'accent: opt-in emits a full gated interactive.accent.* column' + (accMissing.length ? ` — MISSING ${accMissing.join(',')}` : '') + (accFails.length ? ` — FAILS ${accFails.slice(0, 2).join(',')}` : ''));

  // (d) BACK-COMPAT accentPalette must differ from the action palette (no two identical columns).
  let threw = false;
  try { brandTheme({ id: 'x', primary: { l: 0.5, c: 0.2, h: 20 }, neutral: { hue: 20, chroma: 0.01 }, actionPalette: 'primary', accentPalette: 'primary' } as unknown as BrandInput); }
  catch { threw = true; }
  ok(threw, 'accent: accentPalette === actionPalette is rejected');
}

// ------------------------------------- the iconContrast DEFAULT is pinned, not merely documented
// The default is 'text' (icons mirror text tier for tier) by OWNER DECISION, not by oversight:
// icons sit next to text, and a conforming-but-lighter icon beside 4.5:1 body copy reads as a
// rendering bug. WCAG's 3:1 for graphical objects is a minimum, not a target — which is exactly
// what the lever is for.
//
// This is pinned rather than documented because documenting it already failed once. The decision
// was recorded in 00-progress.md, and #352's own plan then listed "flip the iconContrast default
// to '3:1'" as a work item — written after the decision, from the standards-correctness angle,
// and nothing in the suite would have caught it. Flipping the default is a REVERSAL that needs a
// new owner call; if that call is made, change this test deliberately rather than deleting it.
{
  const resolved = brandTheme({ id: 'icd', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 } } as any);
  ok((resolved as any).iconContrast === 'text', `#352: iconContrast defaults to 'text' (got '${(resolved as any).iconContrast}')`);
  const lever = leverManifest.find((l: any) => l.key === 'iconContrast');
  ok(lever?.default === 'text', `#352: the iconContrast LEVER default agrees with the engine ('${lever?.default}')`);

  // ...and the default actually MEANS mirroring: every icon tier carries its text tier's bar.
  // A default of 'text' that silently resolved icons somewhere else would pass the two checks
  // above while shipping the thing the decision exists to prevent.
  const roles = resolveAllModes(resolved).find((m: any) => m.mode === 'light')!.roles;
  const unmirrored = ['primary', 'secondary', 'tertiary', 'brand', 'success', 'warning', 'danger', 'info']
    .filter((k) => roles[`text.${k}`] && roles[`icon.${k}`] && roles[`text.${k}`].min !== roles[`icon.${k}`].min);
  ok(unmirrored.length === 0, `#352: with the default, every icon tier mirrors its text tier's bar (${unmirrored.join(', ') || 'all mirrored'})`);
  // The ladder itself is NOT an inconsistency — secondary 4.5 over tertiary 3 is the tier ladder
  // mirrored from text, and #352's audit misread it as drift inside the icon family.
  ok(roles['icon.secondary'].min === 4.5 && roles['icon.tertiary'].min === 3,
    `#352: the icon tier LADDER is intact (secondary ${roles['icon.secondary'].min} over tertiary ${roles['icon.tertiary'].min})`);
}

// ---------------------------------------------- link ink is INK, not the fill anchor (#352)
// `text.link.*` used to BE `actionRest` — the literal button-fill object — so a text role's
// legibility was an accident of how the FILL happened to be gated. Link ink now derives its own
// step on the action palette at its own bar. Two properties are locked here: the text bar is
// unchanged (this decoupling is a no-op for `text.link.*`), and `iconContrast` now governs the
// icon link's COLOUR rather than only the number reported beside it.
{
  const stepOf = (r: any) => Number(r.path.split('.').pop());
  const linkRoles = (t: any, mode = 'light') => resolveAllModes(t).find((m: any) => m.mode === mode)!.roles;

  // (a) With the lever OFF both families share a bar, so they must still agree — this is what
  //     makes the change a no-op for every brand that hasn't opted into the looser icon floor.
  const off = linkRoles(nbTheme());
  ok(stepOf(off['text.link.default']) === stepOf(off['icon.link.default']),
    `#352: with iconContrast='text' the link families agree (${off['text.link.default'].path.split('.').pop()})`);

  // (b) With the lever ON they must DIVERGE — the icon link relaxes to its 3:1 floor while the
  //     text link holds 4.5:1. Before the decoupling both rendered the text-gated step and only
  //     the reported `min` moved, which is a gate that says 3 while showing you 4.5.
  const on = linkRoles({ ...nbTheme(), iconContrast: '3:1' });
  ok(stepOf(on['text.link.default']) === stepOf(off['text.link.default']),
    '#352: the icon lever does not disturb text link ink');
  // Never DARKER than the text link — a looser floor can only relax, never tighten.
  ok(stepOf(on['icon.link.default']) <= stepOf(on['text.link.default']),
    `#352: a looser icon floor never darkens the link (${on['icon.link.default'].path.split('.').pop()} <= ${on['text.link.default'].path.split('.').pop()})`);
  // nb does NOT move, and that is correct rather than a miss: its action anchor (550) already
  // clears BOTH bars, and `pickBrand` keeps a passing anchor. The relaxation is only observable
  // where the anchor is actually constrained — aurora, the one example brand that ships the lever.
  const au = linkRoles(brandTheme(exampleBrands()['aurora'] as BrandInput));
  ok(stepOf(au['icon.link.default']) < stepOf(au['text.link.default']),
    `#352: aurora's icon link genuinely LIGHTENS vs its text link (${au['icon.link.default'].path.split('.').pop()} < ${au['text.link.default'].path.split('.').pop()}) — the lever moves the COLOUR, not just the reported min`);
  ok(au['icon.link.default'].ratio < 4.5 && au['icon.link.default'].ratio >= au['icon.link.default'].min,
    `#352: ...landing genuinely below the text bar while clearing its own (${au['icon.link.default'].ratio.toFixed(2)}, min ${au['icon.link.default'].min})`);

  // (c) The invariant that must survive relaxing the FILLS: every link state clears its own floor,
  //     in every mode, for every example brand. This is the assertion the fill work is measured by.
  const bad: string[] = [];
  for (const [id, input] of Object.entries(exampleBrands())) {
    for (const m of resolveAllModes(brandTheme(input as BrandInput))) {
      for (const [k, r] of Object.entries(m.roles)) {
        if (!/^(text|icon)\.link\./.test(k)) continue;
        if ((r as any).min > 0 && (r as any).ratio < (r as any).min) bad.push(`${id}/${m.mode}.${k} ${(r as any).ratio.toFixed(2)}<${(r as any).min}`);
      }
    }
  }
  ok(bad.length === 0, `#352: every link state clears its own floor, every brand, every mode${bad.length ? ` — ${bad.slice(0, 3).join(', ')}` : ''}`);
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
  const oneMissing = ['fill.rest', 'on-fill', 'text.rest', 'border.rest', 'border.hover', 'border.pressed'].filter((s) => !(`interactive.accent.${s}` in one));
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

  // (a0) modeLevers:{dark:{easings:{...}}} — the ROLE tier re-points, the curve primitive does not move.
  //      #522: this is the invariant the whole design turns on, so it is asserted rather than assumed.
  {
    const rp = { ...base, modeLevers: { dark: { easings: { emphasized: 'calm' } } } } as unknown as BrandInput;
    const mo = buildTree(brandTheme(rp)).tree[root].motion;
    const role = mo['easing-role'].emphasized;
    ok(role.$value === `{${root}.motion.easing.expressive}`,
      `D(a0): light keeps the baseline curve (got ${role.$value})`);
    ok(role.$extensions.prism3.modes?.dark?.$value === `{${root}.motion.easing.calm}`,
      `D(a0): dark re-points the ROLE at calm (got ${role.$extensions.prism3.modes?.dark?.$value})`);
    ok(mo.easing.expressive.$extensions?.prism3?.modes === undefined,
      'D(a0): the CURVE primitive carries no per-mode override — a mode re-points, it never redefines');
    ok(mo.transition.emphasized.$value.timingFunction === `{${root}.motion.easing-role.emphasized}`,
      `D(a0): the transition names the role, so it inherits the re-point (got ${mo.transition.emphasized.$value.timingFunction})`);
    ok(mo['easing-role'].default.$extensions?.prism3?.modes === undefined,
      'D(a0): an unre-pointed role is untouched (no blanket override)');
    // The BASELINE is settable too, and a mode deviates from it — without that, a mode could override
    // a binding nobody could set (you could change Dark but not Light).
    {
      const bl = { ...base, motionPersonality: { easingRoles: { default: 'calm' } } } as unknown as BrandInput;
      const mb = buildTree(brandTheme(bl)).tree[root].motion;
      ok(mb['easing-role'].default.$value === `{${root}.motion.easing.calm}`,
        `D(a0): the brand-wide baseline re-points the role (got ${mb['easing-role'].default.$value})`);
      ok(mb.easing.default === undefined && mb.easing.calm.$extensions?.prism3?.modes === undefined,
        'D(a0): setting the baseline still does not touch any curve primitive');
      ok(threw(() => brandTheme({ ...base, motionPersonality: { easingRoles: { default: 'nope' } } } as unknown as BrandInput)),
        'D(a0): an unknown baseline curve is rejected');
    }
    // no-diff suppression, matching every other axis
    // A self-map is now role → ITS OWN BASELINE CURVE rather than a literal `x: 'x'`, because curves are
    // named for shape and roles for use. The suppression keys on the resolved baseline, not on the name.
    const selfMap = { ...base, modeLevers: { dark: { easings: { emphasized: 'expressive' } } } } as unknown as BrandInput;
    ok(buildTree(brandTheme(selfMap)).tree[root].motion['easing-role'].emphasized.$extensions?.prism3?.modes === undefined,
      'D(a0): a self-map is dropped — an inert declaration cannot mint an override');
    // both halves of the reference validated, so a typo cannot resolve to nothing
    ok(threw(() => brandTheme({ ...base, modeLevers: { dark: { easings: { emphasized: 'nope' } } } } as unknown as BrandInput)),
      'D(a0): an unknown CURVE is rejected');
    ok(threw(() => brandTheme({ ...base, modeLevers: { dark: { easings: { nope: 'calm' } } } } as unknown as BrandInput)),
      'D(a0): an unknown ROLE is rejected');
  }

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

  // #391 — schema-valued `additionalProperties`. `validate()` implemented only the `false` form (the
  // unknown-key guard) and not the OBJECT form (a sub-schema applied to every value `properties` does
  // not cover). `modeLevers` is exactly that shape, so its ENTIRE subtree was walked into and dropped:
  // radius range, density enum, typeSizes floors and per-mode family keys were all unenforced by the
  // published contract. `brandTheme()` still threw at resolve time, so the ENGINE was never at risk —
  // what was inert was the contract external authors read before they ever reach the engine.
  //
  // These RUN the validator rather than reading the schema. That distinction is the whole lesson: the
  // gap survived the entire life of the `modeLevers` contract and two passes of adding fields to it
  // (#367, #390), both of which inspected the schema and concluded it was covered.
  {
    const mlBase = { id: 'ap', primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 }, modes: ['light', 'dark'] };
    const v = (ml: unknown) => validateBrandInput({ ...mlBase, modeLevers: ml } as unknown as BrandInput);
    const rejects = (label: string, ml: unknown) => ok(v(ml).length > 0, `[#391] REJECTS ${label}`);
    const accepts = (label: string, ml: unknown) => ok(v(ml).length === 0, `[#391] accepts ${label} (errors: ${JSON.stringify(v(ml))})`);
    // One per affected node kind: enum, nested unknown-key, nested numeric bound, top-level unknown
    // key, and both halves of the newest field (#390) — the one that exposed this.
    rejects('a bad density enum inside modeLevers', { dark: { density: 'nope' } });
    rejects('a typeSizes group that is not a heading group', { dark: { typeSizes: { body: { md: 18 } } } });
    rejects('a typeSizes value below the group floor', { dark: { typeSizes: { display: { '3xl': 8 } } } });
    rejects('an unknown lever key inside a mode', { dark: { nonsenseKey: 1 } });
    rejects('a per-mode families key that is not a category', { dark: { families: { heading: 'Georgia' } } });
    rejects('a per-mode families value that is neither a name nor a stack', { dark: { families: { title: 7 } } });
    rejects('a radius outside [0, 2]', { dark: { radius: 5 } });
    // The pre-#296 shape: a NUMBER where the re-point map wants a rung name.
    rejects('a lineHeights re-point naming a number instead of a rung', { dark: { lineHeights: { normal: 1.6 } } });
    // The other half — the fix must not start rejecting legal input. `true`/absent
    // `additionalProperties` stay permissive; only the object form applies a sub-schema.
    accepts('a valid density', { dark: { density: 'compact' } });
    accepts('a valid per-mode families override', { dark: { families: { title: 'Georgia' } } });
    accepts('a valid typeSizes override', { dark: { typeSizes: { title: { '2xl': 36 } } } });
    accepts('a valid radius', { dark: { radius: 1.5 } });
    accepts('a valid lineHeights re-point', { dark: { lineHeights: { normal: 'relaxed' } } });
    // The error must NAME the path — a sub-schema applied at the wrong depth would still reject, but
    // point at `modeLevers` and leave the author hunting.
    ok(/modeLevers\.dark\.density/.test(v({ dark: { density: 'nope' } })[0] ?? ''),
      `[#391] the error names the full path, not just the map (got: ${v({ dark: { density: 'nope' } })[0]})`);
  }

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
  ok(pmTree.font.family.body.$extensions.prism3.modes === undefined, 'D-typo(a): an un-overridden category (body) carries no modes override');
  // #415 — the sibling that USED to move with it. display/title/label/eyebrow all sat on the old
  // `display` family role, so a per-mode `families.display` dragged all four; category-keyed, it moves
  // exactly the one named. This is the whole reason the per-mode familyMap lever (#390) could retire.
  ok(pmTree.font.family.title.$extensions.prism3.modes === undefined,
    '[#415] a per-mode families.display moves ONLY display — title, its old role-mate, is untouched');

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

  // (a) #296's INVERTED CONTRACT still holds, and #377 made it easier to state rather than weakening it:
  //     the LADDER STEP is mode-invariant. Under the old single tier the adjective WAS the primitive, so
  //     this assertion had to read `line-height.normal`; now the primitive is the numeric step and the
  //     adjective is a semantic role above it. The rule is unchanged — a mode never re-values a step.
  const lhStep = (v: number) => pmTree.font['line-height'][lineHeightStepKey(v)];
  const lsStep = (v: number) => pmTree.font['letter-spacing'][letterSpacingStepKey(v)];
  ok(Object.values(pmTree.font['line-height']).every((n: any) => n.$extensions.prism3.modes === undefined),
    'D-lhls(a): NO line-height ladder step carries a per-mode override — every step is a primitive (#296)');
  ok(lhStep(1.5).$value === baseTree.font['line-height'][lineHeightStepKey(1.5)].$value,
    'D-lhls(a): the 1.5 step is mode-invariant');
  ok(lhStep(1.65).$value === baseTree.font['line-height'][lineHeightStepKey(1.65)].$value,
    'D-lhls(a): the step the mode re-points TO is also unchanged');

  // (b) same for letter-spacing.
  ok(Object.values(pmTree.font['letter-spacing']).every((n: any) => n.$extensions.prism3.modes === undefined),
    'D-lhls(b): NO letter-spacing ladder step carries a per-mode override (#296)');
  ok(lsStep(0).$value === baseTree.font['letter-spacing'][letterSpacingStepKey(0)].$value,
    'D-lhls(b): the 0em step is mode-invariant');

  // (c) #377 — the per-mode change now lives on the semantic ROLE, stated ONCE, instead of being fanned
  //     onto all 38 composites. That is the whole reason the tier exists.
  const lhRole = pmTree.font['line-height-role'].normal;
  const roleDark = lhRole.$extensions.prism3.modes?.dark;
  ok(!!roleDark, 'D-lhls(c): the line-height ROLE carries the modes.dark override (#377 — stated once)');
  ok(roleDark?.$value === `{${root}.font.line-height.${lineHeightStepKey(1.65)}}`,
    `D-lhls(c): dark re-points the role at the 1.65 step (got ${roleDark?.$value})`);
  ok(lhRole.$value === `{${root}.font.line-height.${lineHeightStepKey(1.5)}}`,
    'D-lhls(c): the role\'s light canonical value still points at the 1.5 step');
  ok(pmTree.font['letter-spacing-role'].normal.$extensions.prism3.modes?.dark?.$value
      === `{${root}.font.letter-spacing.${letterSpacingStepKey(0.02)}}`,
    'D-lhls(c): the tracking role re-points at the 0.02em step in dark');

  // (c2) …and the composite is now CLEAN: it aliases the role and carries no leading/tracking variant
  //      of its own. This is the assertion that proves the fan-out is gone rather than duplicated.
  const bodyMd = pmTree.type.body.md.default;
  ok(bodyMd.$value.lineHeight === `{${root}.font.line-height-role.normal}`,
    'D-lhls(c2): the composite aliases the semantic ROLE, not the primitive');
  const cDark = bodyMd.$extensions.prism3.modes?.dark;
  ok(cDark?.$value?.lineHeight === undefined && cDark?.$value?.letterSpacing === undefined,
    'D-lhls(c2): the composite carries NO per-mode leading/tracking — it inherits through the role');

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
  // #377 — assert on the ROLE now, which is where a real override would land. Checking the step would
  // pass vacuously (a step never carries modes), so this had to move with the tier or it would have
  // become a test that cannot fail.
  ok(equalTree.font['line-height-role'].normal.$extensions.prism3.modes === undefined
      && equalTree.font['letter-spacing-role'].normal.$extensions.prism3.modes === undefined,
    'D-lhls(i): a per-mode LH/LS equal to the light value attaches no role override (no-diff suppression)');

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

// #274 — every `space.<k> → {dimension.<px>}` alias must resolve. The rhythm and the grid base are now
// FIXED (SPACE_BASE 8 / GRID_BASE 4), so the off-grid case a brand could once configure is unreachable;
// what remains reachable is the invariant itself, asserted against the real constants rather than through
// a brand that can no longer differ. The `extras` feeding in buildDims is what makes it true, so the
// second assertion keeps that mechanism under test at bases a brand can no longer request — deleting it
// would leave the mechanism live and unguarded.
{
  const gridPx = new Set(dimensionGrid(GRID_BASE, 128, spaceScale(SPACE_BASE).map((sp) => sp.px)));
  const offGrid = spaceScale(SPACE_BASE).map((sp) => sp.px).filter((px) => !gridPx.has(px));
  ok(offGrid.length === 0, `#274: every space px lands on the dimension grid at the fixed bases (${SPACE_BASE}/${GRID_BASE})`
    + (offGrid.length ? ` — OFF-GRID: ${offGrid.join(',')}` : ''));

  // The mechanism, at bases only the pure functions can now be handed: without extras these would dangle.
  for (const [sb, gb] of [[12, 4], [5, 4], [10, 4], [8, 6]] as const) {
    const g = new Set(dimensionGrid(gb, 128, spaceScale(sb).map((sp) => sp.px)));
    const miss = spaceScale(sb).map((sp) => sp.px).filter((px) => !g.has(px));
    ok(miss.length === 0, `#274: extras keep every space px on the grid at base ${sb}/${gb}`
      + (miss.length ? ` — MISSING: ${miss.join(',')}` : ''));
  }
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
  // Against the canonical key lists, not literals: the intent is "the resolved set matches the contract",
  // and a literal 6 asserts the count of the day — it went red for the RIGHT reason when #388 added `cozy`,
  // but a count is not what this test is about.
  ok(re.typography.lineHeights.length === LINE_HEIGHT_KEYS.length && re.typography.letterSpacings.length === LETTER_SPACING_KEYS.length,
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
  // #377 — this used to re-anchor `relaxed` to 1.9, which is BOTH off-ladder and ABOVE `loose` (1.75).
  // The test was asserting an inverted ramp: a rung named "relaxed" resolving looser than the one named
  // "loose". That is precisely the defect #377 was filed for, encoded as an expectation. 1.6 is a real
  // re-anchor (default 1.65), on the ladder, and keeps the ramp ordered.
  const both = brandTheme({ id: 'lhls2', primary: { l: 0.5, c: 0.12, h: 250 }, neutral: { hue: 250, chroma: 0.01 },
    modes: ['light', 'dark'], typography: { lineHeights: { relaxed: 1.6 } },
    modeLevers: { dark: { lineHeights: { normal: 'relaxed' } } } } as unknown as BrandInput);
  ok(both.typography.lineHeights.find((l: any) => l.key === 'relaxed')?.value === 1.6,
    'type-ramp(f): the brand re-anchor of `relaxed` holds (one value, every mode)');
  ok(both.typography.lineHeightRepointByMode?.dark?.normal === 'relaxed',
    'type-ramp(f): the mode records a rung→rung re-point, not a ramp');
  const bodyC = both.typography.composites.find((c: any) => c.group === 'body' && c.lineHeight === 'normal');
  ok(bodyC?.lineHeightByMode?.dark === 'relaxed',
    'type-ramp(f): a body composite using `normal` re-points to `relaxed` in dark — resolving to the brand value 1.6');
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
const tBrand = (id: string, ty: any) => brandTheme({ id, primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 }, typography: ty });
const typeCases: [string, any][] = [
  ['default', {}],
  ['expressive', { typeScale: 'expressive' }],
  ['compact', { typeScale: 'compact' }],
  ['default+floor16', { titleFloor: 16 }],
  ['ceiling-xl', { displayCeiling: 'xl' }],
  ['ceiling-sm', { displayCeiling: 'sm' }],
  ['singleface', { families: { display: 'Foo', title: 'Foo', body: 'Foo', label: 'Foo', caption: 'Foo', eyebrow: 'Foo' } }],
];
for (const [label, ty] of typeCases) {
  const t = tBrand('ty-' + label, ty);
  const comps = t.typography.composites;
  const ladder = new Set(t.typography.sizesPx);
  const lh = new Set(t.typography.lineHeights.map((x) => x.key));
  const ls = new Set(t.typography.letterSpacings.map((x) => x.key));
  const wr = new Set(t.typography.weightRoles.map((x) => x.role));
  // #415 — a composite's family is its CATEGORY, so the check that used to read `c.family` against a
  // fixed role set now reads the category against the faces THIS brand binds. Stronger, not weaker: it
  // catches a composite built for a category with no face, which is the state `families.code: null`
  // creates and the only way a composite can reach a dangling `font.family.*` alias.
  const fam = new Set(t.typography.families.map((f) => f.group));
  // base "style slots" = unique (group, variant); each fans out to weights (× link).
  const slots = new Set(comps.map((c) => `${c.group}.${c.variant}`));
  ok(slots.size >= 12 && slots.size <= 30, `[type/${label}] ${slots.size} style slots in 12..30 (×weights×link = ${comps.length} composites)`);
  ok(new Set(comps.map((c) => c.path)).size === comps.length, `[type/${label}] all composite paths unique`);
  let bad = '', mono = '';
  const byGroup: Record<string, number[]> = {};
  for (const c of comps) {
    (byGroup[c.group] ??= []).push(c.sizePx);
    if (!ladder.has(c.sizePx)) bad ||= `${c.path} off-ladder ${c.sizePx}`;
    if (!fam.has(c.group)) bad ||= `${c.path} category ${c.group} has no bound family`;
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
    // A size re-point and a leading re-point compose — but #377 moved them to DIFFERENT tiers, and that
    // separation is the point rather than a regression. Size is genuinely per-composite (#328 keys it by
    // group AND rung), so it stays on the composite. Leading is rung-wide, so it now lives on the
    // semantic role and every composite using that role inherits it. Asserting both on the composite
    // would be asserting the fan-out this issue removed.
    const bothT = brandTheme({ ...pmBase, typography: {}, modeLevers: { dark: { typeSizes: { title: { '2xl': 36 } }, lineHeights: { snug: 'relaxed' } } } } as any);
    const bothTree = buildTree(bothT).tree;
    const bl = leaf(bothTree, 'prism.type.title.2xl.strong').$extensions.prism3.modes.dark;
    ok(bl.$value.fontSize === '{prism.font.size.36}',
      '[#328] the per-mode SIZE still re-points on the composite — size is per-composite by contract');
    // A mode variant is a FULL-value snapshot (`{ ...value, ...parts }`), so `lineHeight` is present by
    // spread. The real proof the fan-out is gone is that it is UNCHANGED from light — the composite was
    // not re-pointed; the role beneath it was.
    ok(bl.$value.lineHeight === '{prism.font.line-height-role.snug}',
      '[#377] the composite\'s per-mode lineHeight is IDENTICAL to light — no fan-out, the role carries the change');
    ok(leaf(bothTree, 'prism.font.line-height-role.snug').$extensions.prism3.modes.dark.$value
        === `{prism.font.line-height.${lineHeightStepKey(1.65)}}`,
      '[#377] the leading re-point lives on the role, stated once, and title.2xl inherits it');

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
  // PER-MODE FAMILIES (#390, re-founded by #415). A mode gives ONE CATEGORY a different face.
  //
  // #390 solved this with a separate per-mode `familyMap` lever, because the family tier was keyed by
  // an abstract display|text|mono ROLE: title and display both sat on `display`, so the only per-mode
  // family lever moved both, and re-pointing one category needed a second mechanism that fanned a
  // fontFamily override onto every composite in the category. #415 keys the tier by category, so the
  // divergence is the base case — `modeLevers.<m>.families.title` is the whole feature, and it lands
  // on ONE semantic leaf instead of N composites. These assertions carry #390's intent onto the shape
  // that replaced it; the ones that no longer have a subject (an unbound ROLE, a self-map to a role)
  // are gone because the states they guarded are unrepresentable.
  {
    const fmBase = { id: 'fm', modes: ['light', 'dark'], primary: { l: 0.55, c: 0.18, h: 285 }, neutral: { hue: 285, chroma: 0.01 } } as any;
    const thr = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
    const mk = (families: any, ty: any = {}) => brandTheme({ ...fmBase, typography: ty, modeLevers: { dark: { families } } } as any);
    const leaf = (tree: any, path: string) => path.split('.').reduce((o: any, k: string) => o?.[k], tree);
    const modesOf = (t: any, cat: string) => leaf(buildTree(t).tree, `prism.font.family.${cat}`).$extensions.prism3.modes;

    // THE WHOLE POINT: dark moves title onto Georgia and NOTHING else moves.
    const t1 = mk({ title: 'Georgia' });
    ok(modesOf(t1, 'title')?.dark?.$value === '{prism.font.typeface.georgia}',
      `[#415] per-mode families: dark title RE-POINTS to the georgia typeface (got ${modesOf(t1, 'title')?.dark?.$value})`);
    ok(leaf(buildTree(t1).tree, 'prism.font.family.title').$value === '{prism.font.typeface.inter}',
      '[#415] the light/canonical binding is untouched — a mode re-points the alias, it never re-values it');
    ok(modesOf(t1, 'display') === undefined,
      '[#415] display — title’s mate on the old `display` role — does NOT move (the coupling that made #390 necessary)');
    // The negative above is only worth something if display CAN be moved from here; otherwise it would
    // pass structurally rather than behaviorally, which is how a test quietly stops testing.
    ok(modesOf(mk({ title: 'Georgia', display: 'Georgia' }), 'display')?.dark?.$value === '{prism.font.typeface.georgia}',
      '[#415] …and display DOES move when it is named — the sibling assertion above is behavioral, not vacuous');
    ok(!!leaf(buildTree(t1).tree, 'prism.font.typeface.georgia'),
      '[#415] a per-mode-only face is unioned into the typeface primitives so its alias lands on a real leaf');

    // Emission — #415’s real dividend over #390. The COMPOSITES are byte-identical to a brand with
    // no per-mode families at all: they alias `font.family.<category>` and inherit through it. #390 had
    // to stamp a `modes.dark` block on every composite in the category, which is what made the Styles
    // table read as a re-point into its own axis (the same complaint #377 fixed for leading/tracking).
    const btBase = buildTree(brandTheme({ ...fmBase, typography: {} } as any));
    const btMode = buildTree(t1);
    ok(JSON.stringify(btMode.tree.prism.type) === JSON.stringify(btBase.tree.prism.type),
      '[#415] the ENTIRE composite tree is unchanged by a per-mode family — inheritance happens at the semantic, not on 38 composites');
    // Alias integrity — the re-pointed alias must resolve, and must be COUNTED. A walker that silently
    // skipped it would also report zero broken, which is the #281 shape: clean because it never looked.
    ok(btMode.stats.broken.length === 0, '[#415] a theme with a per-mode family has no broken aliases');
    ok(btMode.stats.aliases > btBase.stats.aliases, '[#415] the per-mode family CONTRIBUTES aliases to the resolution gate');

    // Inert declaration ⇒ no entry at all, so the TOKENS stay byte-identical. Scoped to `font` + `type`
    // rather than the whole tree on purpose: declaring ANY modeLevers entry adds a line to the root
    // `$extensions.prism3.decisions` prose whether or not it resolved to a diff — pre-existing, and
    // true of every lever. Claiming whole-tree identity here would claim something this feature
    // neither owns nor can deliver.
    const inert = mk({ title: 'Inter' });
    ok(inert.typography.familiesByMode === undefined
      && JSON.stringify(buildTree(inert).tree.prism.font) === JSON.stringify(btBase.tree.prism.font)
      && JSON.stringify(buildTree(inert).tree.prism.type) === JSON.stringify(btBase.tree.prism.type),
      '[#415] a per-mode face equal to the brand’s is dropped (no mode entry, byte-identical tokens)');

    // Validation THROWS — never drops, for the same reason as #328: a silently ignored per-mode request
    // is only visible in one mode’s output, which is where nobody is looking.
    ok(thr(() => mk({ heading: 'Georgia' } as any)), '[#415] a per-mode family on a category that does not exist throws');
    // The live case: `families.code: null` drops the category, so a dark override for it would derive a
    // binding the light build has no counterpart for — and the emitter walks the LIGHT bindings, so it
    // would vanish rather than fail.
    ok(thr(() => mk({ code: 'Georgia' }, { families: { code: null } })), '[#415] a per-mode family on a category the brand opted out of (code: null) throws');
    ok(!thr(() => mk({ code: 'Georgia' })), '[#415] …and is accepted when the brand does ship code');
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
  ok(fontStyleName(false, 700, true) === 'Bold Italic' && fontStyleName(false, 400, true) === 'Italic', 'Figma style name: 700→Bold Italic, 400→Italic (not Regular Italic)');
}

// ---- font families: typeface PRIMITIVES + family-ROLE semantics (#269) ----
// Two tiers, mirroring colour: the primitive is named after the face (`typeface.inter`)
// and carries the fallback stack; the role is named after the job (`family.text`) and
// aliases it. The role is the brand-invariant handle a consumer binds to.
{
  const t = tBrand('fam', { families: { display: 'Poppins', body: 'Inter', code: 'Fira Code' } });
  const { tree } = buildTree(t);
  const root = Object.keys(tree)[0];
  const fam = (tree[root] as any).font.family;
  const tf = (tree[root] as any).font.typeface;

  // tier 1 — a primitive per distinct face, slugged from its own name.
  ok(!!tf.poppins && !!tf.inter && !!tf['fira-code'], 'a typeface primitive is emitted per face, slugged from the face name');
  ok(tf.inter.$value === 'Inter' && typeof tf.inter.$value === 'string', 'typeface $value is the single primary face (string), not an array');
  const fb = tf.inter.$extensions.prism3.fallbackStack;
  ok(Array.isArray(fb) && fb.length > 0 && !fb.includes('Inter'), 'the fallback tail lives on the TYPEFACE, primary excluded');

  // tier 2 — one semantic per CATEGORY (#415), each aliasing a primitive; none carries a literal face.
  ok(fam.body.$value === `{${root}.font.typeface.inter}`, 'a category semantic aliases its typeface primitive');
  ok(fam.display.$value === `{${root}.font.typeface.poppins}`, 'each category aliases the face it binds');
  ok(fam.body.$extensions.prism3.aliasOf === `${root}.font.typeface.inter`, 'the semantic records aliasOf, like every other semantic');
  // Unset categories take the default face rather than disappearing — the tier is complete by
  // construction, so every composite has a `font.family.<its group>` to point at.
  ok(Object.keys(fam).length === 7 && fam.caption.$value === `{${root}.font.typeface.inter}`,
    `[#415] every category gets a semantic; an unset one (caption) takes the default face (${Object.keys(fam).join('/')})`);

  // the invariant that matters downstream: resolution is unchanged.
  const full = familyOf(tree, fam.body);
  ok(full.startsWith('Inter, ') && full === ['Inter', ...fb].join(', '), 'familyOf follows the alias and reassembles [primary, ...fallbackStack]');

  // two categories on ONE face share a single primitive (variable ORs across them).
  const shared = buildTree(tBrand('shared', { families: { display: 'Inter', body: 'Inter' } })).tree;
  const sroot = Object.keys(shared)[0];
  const stf = (shared[sroot] as any).font.typeface;
  ok(Object.keys(stf).filter((k) => k === 'inter').length === 1 && (shared[sroot] as any).font.family.display.$value === (shared[sroot] as any).font.family.body.$value,
    'two categories bound to the same face share one typeface primitive');

  // Figma family variable: value = primary, description still leads with the FULL stack.
  const figFam = buildFigmaFont(t)[0].variables.filter((v) => v.name.startsWith('font/family/'));
  const textVar = figFam.find((v) => v.name === 'font/family/body')!;
  ok(textVar.value === 'Inter', 'Figma family variable binds the primary face as value');
  ok(textVar.description.startsWith('stack: Inter, '), 'Figma family description still leads with the full reassembled stack (fix #4 preserved)');
}

// ---- the rung ladders: on-ladder + ordered (#377) ----
// The defect this issue was filed for: `{ tight: 2.5, loose: 0.9 }` was ACCEPTED, resolving to
// `2.5, 1.15, 1.25, 1.5, 1.65, 0.9` — a ramp whose "tight" renders looser than its "loose", silently,
// across every composite. Font sizes already refused this shape; leading and tracking did nothing.
{
  const lh = (v: any) => () => tBrand('ladder-lh', { lineHeights: v });
  const ls = (v: any) => () => tBrand('ladder-ls', { letterSpacings: v });
  const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };

  ok(throws(lh({ tight: 2.5, loose: 0.9 })), 'a fully inverted leading ramp now THROWS (#377\'s founding defect)');
  ok(throws(lh({ compact: 2.0 })), 'crossing one adjacent pair throws — compact above normal');
  ok(throws(ls({ tighter: 0.05, wider: -0.05 })), 'an inverted tracking ramp throws');

  ok(throws(lh({ normal: 1.52 })), 'an off-ladder leading value throws rather than snapping (#341: no silent quantisation)');
  ok(throws(ls({ normal: 0.007 })), 'an off-ladder tracking value throws');
  ok(!throws(lh({ normal: 1.55 })), '1.55 IS a ladder step — the body range brands actually need');
  ok(!throws(lh({ normal: 1.4 })), '1.40 is a ladder step — the dense/expert end the old ladder could not express');

  // The ladder must cover the ranges the KB's archetype guidance calls for, or brand voice is
  // unexpressible. The old six offered ONE value across the whole 1.40–1.60 body range.
  const inRange = (lo: number, hi: number) => LINE_HEIGHT_LADDER.filter((v) => v >= lo - 1e-9 && v <= hi + 1e-9).length;
  ok(inRange(1.40, 1.60) >= 3, `body 1.40–1.60 offers ${inRange(1.40, 1.60)} steps (was 1 — every brand got 1.5)`);
  ok(inRange(1.10, 1.30) >= 4, `display/title 1.10–1.30 offers ${inRange(1.10, 1.30)} steps`);
  ok(LINE_HEIGHT_LADDER.includes(1.0 as any), 'the ladder reaches 1.0 — hero display had no rung below 1.05');
  ok(LINE_HEIGHT_LADDER.every((v, i, a) => i === 0 || v > a[i - 1]), 'the leading ladder is strictly ascending');
  ok(LETTER_SPACING_LADDER.every((v, i, a) => i === 0 || v > a[i - 1]), 'the tracking ladder is strictly ascending');
  // Keys are the emitted primitive names, so collisions would silently merge two steps into one.
  const lhKeys = LINE_HEIGHT_LADDER.map(lineHeightStepKey);
  ok(new Set(lhKeys).size === lhKeys.length, 'every leading ladder step has a distinct emitted key');
  const lsKeys = LETTER_SPACING_LADDER.map(letterSpacingStepKey);
  ok(new Set(lsKeys).size === lsKeys.length, 'every tracking ladder step has a distinct emitted key');
  ok(lineHeightStepKey(1.5) === '150' && lineHeightStepKey(1.05) === '105', 'leading keys follow Prism2 (value × 100)');
  ok(letterSpacingStepKey(-0.015) === 'neg-15' && letterSpacingStepKey(0) === '0',
    'tracking keys use a neg- prefix, since `-` reads as a path separator in a slug');
}

// ---- derivedRungFor: the nudge range must be COMPUTED, not guessed (#377) ----
// `shiftRung` clamps, so a fixed ±2 was wrong in both directions at once — dead steps for categories
// mid-ramp, hidden live steps for categories at an end. This is the export that lets the UI derive it.
{
  const dTheme = tBrand('nudge-range', { families: { text: 'Inter' } });
  const idxOf = (field: 'leadingShift' | 'trackingShift', g: any, px: number) =>
    (field === 'leadingShift' ? LINE_HEIGHT_KEYS : LETTER_SPACING_KEYS).indexOf(derivedRungFor(field, g, px) as any);
  // display sits at the TIGHT end of the leading ramp, which is why a ±2 cap made `loose` unreachable.
  ok(idxOf('leadingShift', 'display', 160) === 0, 'display derives the tightest leading rung');
  // The DISTANCE display must travel to reach `loose`, whatever the ramp length — the point is that a
  // fixed ±2 cap hides reachable steps, not that the number is 5 (it became 6 when #388 added `cozy`).
  ok(LINE_HEIGHT_KEYS.length - 1 - idxOf('leadingShift', 'display', 160) === LINE_HEIGHT_KEYS.length - 1,
    `display → loose needs +${LINE_HEIGHT_KEYS.length - 1}, so any smaller cap hides a reachable rung`);
  // eyebrow sits at the WIDE end of the tracking ramp — the opposite failure: +1/+2 were no-ops.
  ok(idxOf('trackingShift', 'eyebrow', 12) === LETTER_SPACING_KEYS.length - 1,
    'eyebrow derives the widest tracking rung, so every positive tracking nudge on it is a no-op');
  // body sits mid-ramp: both directions live, neither reaching the engine's ±5 bound.
  // By NAME plus a mid-ramp check, not by index: the index moved when #388 inserted `cozy` above it,
  // and "body derives normal" was always the claim — the number was incidental.
  ok(LINE_HEIGHT_KEYS[idxOf('leadingShift', 'body', 16)] === 'normal', 'body derives `normal`');
  ok(idxOf('leadingShift', 'body', 16) > 0 && idxOf('leadingShift', 'body', 16) < LINE_HEIGHT_KEYS.length - 1,
    'body sits mid-ramp — both nudge directions live');
  // #388 — CAPTION has its own band. It shared `normal` (1.50) with body, so the smallest running text
  // the system emits carried long-form body leading. `cozy` (1.40) is the first BODY step on the ladder,
  // so caption lands tighter than body while staying a reading leading rather than a heading one.
  ok(LINE_HEIGHT_KEYS[idxOf('leadingShift', 'caption', 11)] === 'cozy', '[#388] caption derives `cozy`, its own band');
  ok(idxOf('leadingShift', 'caption', 11) < idxOf('leadingShift', 'body', 16),
    '[#388] caption is TIGHTER than body — the whole point of giving it a band');
  ok(idxOf('leadingShift', 'caption', 11) > idxOf('leadingShift', 'title', 18),
    '[#388] …and still looser than title, so it did not fall into heading leading');
  {
    const lh = dTheme.typography.lineHeights;
    ok(lh.find((l: any) => l.key === 'cozy')?.value === 1.4, '[#388] `cozy` resolves to 1.40');
    // The ramp must stay monotonic with the insert — the ordering guard runs on AUTHORED brands, and a
    // badly placed default would ship a permanently inverted ramp that no brand input could fix.
    const vals = lh.map((l: any) => l.value);
    ok(vals.every((v: number, i: number) => i === 0 || v > vals[i - 1]),
      `[#388] the default leading ramp is still strictly increasing (${vals.join(' < ')})`);
    ok(LINE_HEIGHT_LADDER.includes(1.4), '[#388] `cozy` binds a real ladder step, not an invented value');
  }

  // A category deriving several rungs (title bands by size) must span all of them.
  const titleIdx = [18, 24, 28, 40].map((px) => idxOf('leadingShift', 'title', px));
  ok(new Set(titleIdx).size > 1, 'title derives more than one leading rung across its size bands');
  ok(Math.min(...titleIdx) >= 0 && Math.max(...titleIdx) < LINE_HEIGHT_KEYS.length, 'every derived title rung is on the ramp');
  ok(dTheme.typography.composites.every((c: any) => LINE_HEIGHT_KEYS.includes(c.lineHeight as any)),
    'every composite lands on a real leading rung after derivation + nudge');
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
  ok(!(buildTree(staged).tree[stagedRoot] as any).font.family.fraunces, 'a staged face emits NO family semantic leaf (nothing binds it)');

  // Existing brands must be untouched: same list, same ORDER, which is why the library appends last.
  ok(JSON.stringify(bare.typography.typefaces) === JSON.stringify(tBrand('lib-none2', { families: { body: 'Inter' }, typefaceLibrary: [] }).typography.typefaces),
    'an empty library derives a byte-identical typeface list (feature is additive)');

  // Staged THEN bound is one primitive, not two — and the BINDING's stack wins the dedupe, which is the
  // reason binding sets are walked before the library rather than after.
  const bound = tBrand('lib-bound', { families: { body: 'Inter', code: 'Fira Code' }, typefaceLibrary: ['Fira Code'] });
  const fira = bound.typography.typefaces.filter((t: any) => t.slug === 'fira-code');
  ok(fira.length === 1, `a face both staged and bound yields ONE primitive (got ${fira.length})`);
  ok(fira[0].stack[fira[0].stack.length - 1] === 'monospace', 'the bound category’s stack wins the dedupe — a staged+bound code face keeps its MONO fallback tail');
  const stagedOnlyMono = tBrand('lib-mono-unbound', { families: { body: 'Inter' }, typefaceLibrary: ['Fira Code'] });
  const unboundFira = stagedOnlyMono.typography.typefaces.find((t: any) => t.slug === 'fira-code');
  ok(unboundFira.stack[unboundFira.stack.length - 1] !== 'monospace', 'an UNBOUND face has no binding to take a tail from, so it gets the sans one — self-corrects on binding');

  // Removal semantics (owner decision, 2026-08-01: only UNBOUND entries are deletable). The engine
  // needs no cascade for this, and that absence is the thing worth asserting: dropping a still-bound
  // name from the library cannot make its primitive disappear, because the binding keeps deriving it.
  const droppedWhileBound = tBrand('lib-drop-bound', { families: { body: 'Inter', code: 'Fira Code' }, typefaceLibrary: [] });
  ok(droppedWhileBound.typography.typefaces.some((t: any) => t.slug === 'fira-code'),
    'removing a still-BOUND face from the library does NOT drop its primitive — no cascade needed (#287)');
  ok(!tBrand('lib-drop-unbound', { families: { body: 'Inter' }, typefaceLibrary: [] }).typography.typefaces.some((t: any) => t.slug === 'fraunces'),
    'removing an UNBOUND face from the library drops its primitive cleanly');

  // Typo guards — an empty entry would emit an empty slug; two spellings would silently swallow one.
  const rejects = (lib: any, label: string) => {
    let threw = false;
    try { tBrand('lib-bad', { families: { body: 'Inter' }, typefaceLibrary: lib }); } catch { threw = true; }
    ok(threw, label);
  };
  rejects([''], 'an empty typefaceLibrary entry throws');
  rejects(['   '], 'a whitespace-only typefaceLibrary entry throws');
  rejects(['Fraunces', 'fraunces'], 'the same face listed twice (differing only in case) throws');
  let variantThrew = false;
  try { tBrand('lib-ok', { families: { body: 'Inter' }, typefaceLibrary: ['Fraunces', 'Fira Code'] }); } catch { variantThrew = true; }
  ok(!variantThrew, 'two DISTINCT faces in the library are accepted');
}

// ---- code is optional (#269, re-keyed by #415) ----
// Most brands have no mono face. `families.code: null` opts the category out; it used to be
// `families.mono: null`, saying the same thing one tier up. `code` is the ONLY category that may opt
// out — nulling any other would silently delete a tier of the type system, so it is refused.
{
  const withCode = tBrand('code-on', { families: { body: 'Inter' } });
  const noCode = tBrand('code-off', { families: { body: 'Inter', code: null } });
  ok(withCode.typography.families.some((f: any) => f.group === 'code'), 'omitted code keeps the default mono face (existing brands unaffected)');
  ok(!noCode.typography.families.some((f: any) => f.group === 'code'), 'code: null drops the code family binding');
  ok(withCode.typography.composites.some((c: any) => c.group === 'code'), 'a brand with a code face ships the code category');
  ok(!noCode.typography.composites.some((c: any) => c.group === 'code'), 'a brand without one ships NO code category');
  ok(!noCode.typography.typefaces.some((t: any) => t.slug === 'jetbrains-mono'), 'no code binding ⇒ no orphan mono typeface primitive');
  const noCodeTree = buildTree(noCode).tree;
  const nmRoot = Object.keys(noCodeTree)[0];
  ok(!(noCodeTree[nmRoot] as any).font.family.code, 'no code binding emits no font.family.code leaf');
  ok(!(noCodeTree[nmRoot] as any).type?.code, 'no code binding emits no type.code composites');
  // The carve-out is deliberate and enforced, not a happy accident of `code` being last in the list.
  const thrN = (g: string) => { try { tBrand('null-' + g, { families: { [g]: null } }); return false; } catch { return true; } };
  ok(['display', 'title', 'body', 'label', 'caption', 'eyebrow'].every(thrN),
    '[#415] nulling any category OTHER than code throws — the opt-out is a carve-out for code, not a general delete');
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
  // Harshness is a claim about ink on the page CANVAS — pure black on a near-white page is the
  // complaint the rule exists for. Ink on a saturated FILL is a different relationship: black on a
  // bright amber is the legible, conventional answer, and forcing it to a soft near-black instead is
  // precisely what pushed `text.on-danger` / `on-info` below their 4.5 floor once the fills relaxed
  // toward their anchors (#352 item 2). Scoped by each role's own `against` rather than by name, so
  // a newly added `on-*` role inherits the carve-out without anyone remembering to list it.
  const isOnFill = (r: any) => /^foreground\./.test(r.against ?? '') || /\.fill\./.test(r.against ?? '');
  for (const m of ['light', 'dark'] as const) {
    const roles = byMode[m];
    const blacks = Object.entries(roles).filter(([, r]: any) => isBlack(r.path) && !isOnFill(r)).map(([k]) => k);
    ok(blacks.length === 0, `${m}: no pure black on the canvas in standard mode (found: ${blacks.join(', ') || 'none'})`);
    // ...and the carve-out is a carve-out, not a hole: anything that DID go black must be ink on a
    // fill, and must actually be clearing its floor. A black that fails its own min is a bug either
    // way, and would otherwise now pass silently.
    const badBlacks = Object.entries(roles)
      .filter(([, r]: any) => isBlack(r.path) && (!isOnFill(r) || r.ratio < r.min)).map(([k]) => k);
    ok(badBlacks.length === 0, `${m}: every pure black is ink on a fill and clears its min (${badBlacks.join(', ') || 'none'})`);
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
  const { input } = parseDesignMd(readFileSync(resolve(HERE, './examples/aurora.design.md'), 'utf8'));
  ok(validateBrandInput(input).length === 0, 'aurora.design.md: schema-conforms');
  const generated = JSON.stringify(buildTree(brandTheme(input)).tree, null, 2) + '\n';
  const committed = readFileSync(resolve(HERE, 'out/aurora.tokens.json'), 'utf8');
  ok(generated === committed, 'aurora.design.md → byte-identical to out/aurora.tokens.json (CLI path ≡ hardcoded path)');
}
// (4) COVERAGE — harbor.design.md (net-new, no golden): conforms, resolves, all contracts hold.
{
  const { input } = parseDesignMd(readFileSync(resolve(HERE, './examples/harbor.design.md'), 'utf8'));
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
  const t = brandTheme(parseDesignMd(readFileSync(resolve(HERE, './examples/aurora.design.md'), 'utf8')).input);
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

  // #621 — avoid_when_level (RFC 2119 MUST/SHOULD), DERIVED from whether a real contrast contract
  // backs the token, never hand-typed. "Every emitted MUST maps to a named gate" (#621's own Verify
  // section) is exactly this structural check: MUST iff contrast_with is present, over every real
  // role this brand emits — not a synthetic sample.
  const colorEntries = Object.entries(ai.color as Record<string, any>);
  const mustNoGate = colorEntries.filter(([, r]) => r.avoid_when_level === 'MUST' && !(r.contrast_with?.length));
  const gatedButShould = colorEntries.filter(([, r]) => r.avoid_when_level === 'SHOULD' && r.contrast_with?.length);
  ok(mustNoGate.length === 0, 'sidecar: every avoid_when_level MUST carries a computed contrast_with contract' + (mustNoGate.length ? ` — ${mustNoGate.map(([k]) => k).slice(0, 5).join(', ')}` : ''));
  ok(gatedButShould.length === 0, 'sidecar: every role with a computed contrast_with is labelled MUST, not SHOULD' + (gatedButShould.length ? ` — ${gatedButShould.map(([k]) => k).slice(0, 5).join(', ')}` : ''));
  // Concrete values, not just the structural pairing — docs/34 shape 5 ("it resolves" is not "it is
  // right"). Two real, independently-meaningful tokens picked because their status is verifiable by
  // inspection, not because they happen to pass: text.primary MUST hold a real AAA text contract
  // against its surface; border.primary is explicitly a "decorative" border whose own avoid_when
  // says a contract-bound border is a DIFFERENT token (border.secondary/border.focus) — SHOULD is
  // the semantically correct answer here, not a gap.
  ok(ai.color['text.primary']?.avoid_when_level === 'MUST' && ai.color['text.primary']?.contrast_with?.[0]?.min === '7:1',
    'sidecar: text.primary is MUST with its real 7:1 AAA contract, not asserted in the abstract');
  ok(ai.color['border.primary']?.avoid_when_level === 'SHOULD' && !ai.color['border.primary']?.contrast_with,
    'sidecar: border.primary (decorative, no contract of its own) is SHOULD, not a false MUST');
}
// (5) STANDARD dialect — the brand-skills / google-labs design.md path (docs/07 §11):
// the reader + colour-role classifier + x-prism3 levers, on the real Wendy's file.
{
  const std = parseStandardDesignMd(readFileSync(resolve(HERE, './examples/wendys.design.md'), 'utf8'));
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
  // M-14's GUARANTEE is preserved; only its example moved. The original asserted `radiusScale:
  // 'soft'` throws, which was correct when `Number('soft')` → NaN was the only reading of it — and
  // became the thing ENFORCING a bug the moment #471 made named stops legal natively. The property
  // that actually matters is "nothing that isn't a real value reaches the radius ramp", so the
  // garbage case keeps the assertion and `soft` moves to the parity block below.
  // Fail SOFT — records the throw and returns [] rather than taking the run down. This is the THIRD
  // time in one session that an unguarded helper turned one defect into a silent zero-assertion run,
  // and the second time AFTER the lesson was written down. A note is evidently not enough: any helper
  // that wraps a throwing call in this suite needs the guard built in, not remembered.
  const xp = (x: Record<string, unknown>): string[] => {
    try { return applyXPrism3({ id: 'p', primary: { l: 0.5, c: 0.1, h: 20 }, neutral: { hue: 20, chroma: 0.01 } } as BrandInput, x); }
    catch (e) { fails.push(`x-prism3: applyXPrism3(${JSON.stringify(x)}) threw — ${(e as Error).message}`); return []; }
  };
  // Bypasses `xp` deliberately: the helper swallows throws to keep the run alive, and throwing is
  // precisely the behaviour under test here. (Caught by running it — routed through `xp` this
  // asserted its own opposite and reported two failures.)
  let m14ingest = false;
  try { applyXPrism3({ id: 'p', primary: { l: 0.5, c: 0.1, h: 20 }, neutral: { hue: 20, chroma: 0.01 } } as BrandInput, { radiusScale: 'banana' }); } catch { m14ingest = true; }
  ok(m14ingest, 'M-14: an x-prism3.radiusScale that is neither a number nor a declared stop throws at ingest (not a NaN radius)');
  ok(xp({ radiusScale: 1.5 }).length === 1, 'M-14: a numeric radiusScale still applies');

  // ---- DIALECT PARITY (#471 follow-up) ------------------------------------------------------
  // The two front doors must accept the same values for the same lever. They diverged silently:
  // #471 widened the engine-native dialect and left `x-prism3` rejecting `'soft'` — with an error
  // message that named `soft` as the invalid example. `vocabulary.ts` records the schema-vs-engine
  // version of this trap; this is dialect-vs-dialect. Structural rather than spot-checked, so a
  // stop added to SLIDER_STOPS later cannot quietly become native-only.
  for (const [stop, value] of Object.entries(SLIDER_STOPS.radiusScale)) {
    const viaX = xp({ radiusScale: stop });
    const probeX = { id: 'p', primary: { l: 0.5, c: 0.1, h: 20 }, neutral: { hue: 20, chroma: 0.01 } } as BrandInput;
    try { applyXPrism3(probeX, { radiusScale: stop }); } catch { /* recorded by xp above */ }
    ok(probeX.radiusScale === value && viaX.length === 1,
      `dialect parity: x-prism3.radiusScale='${stop}' resolves to ${value}, the same as the engine-native dialect`);
  }
  // `personality` is the vocabulary's headline affordance and a brand-skills brief is exactly the
  // "prose, not numbers" case it exists for. It was dropped SILENTLY — no passthrough — which is
  // the failure mode #471 was filed to eliminate.
  const pProbe = { id: 'p', primary: { l: 0.5, c: 0.1, h: 20 }, neutral: { hue: 20, chroma: 0.01 } } as BrandInput;
  const pApplied = applyXPrism3(pProbe, { personality: ['soft', 'generous'] });
  ok((pProbe as any).personality?.length === 2 && pApplied.some((a) => a.startsWith('personality=')),
    'dialect parity: x-prism3.personality passes through AND is reported as applied (it was silently dropped)');
  ok(brandTheme(pProbe).dims.radiusScaleValue === SLIDER_STOPS.radiusScale.soft,
    "dialect parity: a personality arriving via x-prism3 resolves identically to the native dialect (['soft'] → radiusScale soft)");
  ok(validateBrandInput({ id: 't', primary: { l: 0.5, c: 0.05, h: 200 }, neutral: { hue: 200, chroma: 0.01 }, radiusScale: NaN } as any).length > 0, 'M-14: the validator rejects a NaN number (backstop)');
  const nativeStd = parseStandardDesignMd(readFileSync(resolve(HERE, './examples/harbor.design.md'), 'utf8'));
  ok(Object.keys(nativeStd.colors).length === 0, 'dialect detection: an engine-native brief has no top-level colors map (routes native)');
}
// (7) LEVER MANIFEST — the shared-control contract (docs/08 §4). The presentation
// half must NOT drift from theme-schema.json (the validation half): every key
// resolves, every enum's options match the schema enum (as a set), every default
// matches the schema default, and the committed JSON is up to date.
{
  const schema = JSON.parse(readFileSync(resolve(HERE, './schema/theme-schema.json'), 'utf8'));
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

  const committed = readFileSync(resolve(HERE, './schema/lever-manifest.json'), 'utf8');
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
  const dSchema = JSON.parse(readFileSync(resolve(HERE, './schema/theme-schema.json'), 'utf8'));
  const dm = dSchema.properties.disabledMin;
  ok(dm.minimum === 3 && dm.maximum === 4.5, '#290 disabled: schema pins disabledMin to [3, 4.5]');
  ok(validateBrandInput({ ...seed, disabledMin: 2 }).length > 0, '#290 disabled: schema rejects disabledMin 2');
  ok(validateBrandInput({ ...seed, disabledMin: 3 }).length === 0, '#290 disabled: schema accepts disabledMin 3');

  // (7b-ii) THE FLOOR DRIVES TWO INKS THAT DIVERGE (#561). `disabled.on-fill` is rated against
  // `disabled.fill`, `disabled.text` against the page floor — two different grounds, so the two cross
  // a neutral rung at DIFFERENT floors. This is why the web studio's Disabled specimen must show both:
  // when it showed only `on-fill`, a stop where `on-fill` held still while `text` moved reported as no
  // change at all, and the dial looked like it had dead granularity it did not have.
  //
  // Gated here rather than left to a throwaway probe because the number this asserts is the reason the
  // specimen has the shape it has. If a future ramp or floor change collapses the two inks onto each
  // other, the second specimen becomes redundant and someone should be told — a passing test that
  // silently stopped meaning anything is how the FIRST wrong diagnosis got written (the recommendation
  // on #561 was to coarsen the dial, on the premise that the top stop was inert; measuring both inks
  // is what overturned it).
  {
    const STOPS = [3, 3.5, 4, 4.5];
    let identical = 0, pairs = 0, darkPairs = 0, darkDiverged = 0;
    for (const { theme } of corpus()) {
      for (const mode of ['light', 'dark']) {
        if (!theme.modes.includes(mode as never)) continue;
        const fill: string[] = [], text: string[] = [];
        for (const min of STOPS) {
          const R = resolveAllModes({ ...theme, disabledStrategy: 'reduced', disabledMin: min })
            .find((x) => x.mode === mode)!.roles as Record<string, { hex: string }>;
          fill.push(R['disabled.on-fill'].hex); text.push(R['disabled.text'].hex);
        }
        pairs++;
        // The claim the specimen rests on: the two SEQUENCES differ, so `on-fill` can never stand in
        // for `text`. Stronger and stabler than counting per-stop divergences (see below).
        if (fill.join() === text.join()) identical++;
        let diverges = false;
        for (let i = 1; i < STOPS.length; i++)
          if ((fill[i] !== fill[i - 1]) !== (text[i] !== text[i - 1])) { diverges = true; break; }
        if (mode === 'dark') { darkPairs++; if (diverges) darkDiverged++; }
      }
    }
    // RE-ANCHORED (was `diverged >= pairs - 2`, a corpus headcount). That threshold passed 8/10 and
    // broke the moment aurora's page went white — not because the specimen's justification weakened,
    // but because per-stop divergence in LIGHT depends on whether the TOP dial stop is already dead,
    // which depends on the page's floor. A white page (floor neutral.050) clears 4.0 before the dial
    // reaches 4.5, so stops 4.0 and 4.5 resolve identically and both inks hold still together —
    // measured: light diverges in 2/5 brands (only the tinted-page ones), dark in 5/5.
    //
    // "N of the corpus does X" is a fact about who is in the corpus. Adding a brand or moving one
    // brand's surface re-rolls it, and the fix is then indistinguishable from suppressing a real
    // regression. So this asserts the two INVARIANTS instead: the sequences are never identical
    // (what makes two specimens necessary at all), and every DARK mode diverges per-stop (dark's
    // floor sits mid-ramp, so the top stop is never dead there — the case that must not collapse).
    ok(identical === 0,
      `#561 disabled: on-fill and text never trace the same sequence across the dial — ${pairs - identical}/${pairs} corpus brand+modes differ (a single specimen cannot report both)`);
    ok(darkPairs > 0 && darkDiverged === darkPairs,
      `#561 disabled: every dark mode has a stop where only one of on-fill/text moves — ${darkDiverged}/${darkPairs} (dark's floor is mid-ramp, so no stop is dead)`);

    // HC escalates BOTH inks to >=4.5, so every stop resolves identically there. Asserted so the
    // collapse reads as designed rather than as the bug above — and so a future change that makes HC
    // dialable has to come here and say so.
    const hcSeed = { ...seed, modes: ['light', 'hc-light'] };
    const hcHexes = new Set(STOPS.map((min) => {
      const R = dRoles({ ...hcSeed, disabledStrategy: 'reduced', disabledMin: min }, 'hc-light') as Record<string, { hex?: string } | undefined>;
      return `${R['disabled.on-fill']?.hex}|${R['disabled.text']?.hex}`;
    }));
    ok(hcHexes.size === 1,
      `#561 disabled: in high-contrast every disabledMin stop resolves identically (both inks escalate to >=4.5) — got ${hcHexes.size} distinct`);
  }
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
  const previewTheme = brandTheme(parseDesignMd(readFileSync(resolve(HERE, './examples/harbor.design.md'), 'utf8')).input);
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

  const committedPreview = readFileSync(resolve(HERE, './schema/preview-spec.json'), 'utf8');
  ok(committedPreview === JSON.stringify(buildPreviewSpec(), null, 2) + '\n',
    'preview spec: schema/preview-spec.json is up to date (run `npx tsx engine/emit-preview.ts`)');
}
// (9) RESOLVED PREVIEW (docs/08 §7, B1b) — project the spec to concrete colours per
// mode + compute each declared contract on the REAL resolved colours. Gates: every
// referenced colour role resolves to a hex in every mode, and every declared a11y
// contract actually HOLDS in every mode — the automated version of the PR #20 manual
// contrast check (the overlay's claims are true on the resolved colours, not assumed).
{
  const pinput = parseDesignMd(readFileSync(resolve(HERE, './examples/harbor.design.md'), 'utf8')).input;
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

  // `scrim.default` is the OTHER translucent role, and it shipped without its alpha — its `hex` is the
  // opaque black base, so a role view reported a 40%-black backdrop as solid black. Pinned per mode
  // because the step is mode-dependent (40 light / 60 dark), and pinned alongside an OPAQUE control
  // (`background.primary`, alpha absent) so the assertion fails if alpha is ever set system-wide.
  {
    const byMode = new Map(resolveAllModes(brandTheme({ ...pinput, modes: ['light', 'dark'] })).map((m) => [m.mode, m.roles]));
    const scrimL = byMode.get('light')?.['scrim.default'], scrimD = byMode.get('dark')?.['scrim.default'];
    ok(scrimL?.alpha === 0.4, `resolved role: light scrim carries alpha 0.4 (got ${scrimL?.alpha})`);
    ok(scrimD?.alpha === 0.6, `resolved role: dark scrim carries alpha 0.6 (got ${scrimD?.alpha})`);
    ok(byMode.get('light')?.['background.primary']?.alpha === undefined, 'resolved role: an opaque surface still carries no alpha');
  }
}
// (10) EXAMPLE-BRANDS ARTIFACT (docs/09) — the browser hosts boot from
// schema/example-brands.json (the design.md parser is pure/portable, but reading the raw
// examples/*.design.md text off disk needs node:fs, which the sandbox doesn't have). Gate that the
// committed JSON is current AND that EVERY emitted brand resolves all-green on the
// preview contracts — so a host can trust whatever it boots from (extends the B1b
// check beyond harbor to every host-facing example, incl. the web's aurora default).
{
  const committed = readFileSync(resolve(HERE, './schema/example-brands.json'), 'utf8');
  ok(committed === exampleBrandsJson(), 'example brands: schema/example-brands.json is up to date (run `npx tsx engine/emit-brandinput.ts`)');

  const brands = exampleBrands();
  for (const id of EXAMPLE_IDS) {
    const rp = resolvePreview(brandTheme(brands[id] as BrandInput));
    const broken = rp.contracts.flatMap((c) =>
      rp.modes.filter((m) => c.byMode[m] && !c.byMode[m].pass).map((m) => `${c.component}/${c.variant} ${m}:${c.byMode[m].ratio}<${c.min}`));
    ok(broken.length === 0, `example brand '${id}': every preview contract holds (all 4 modes)` + (broken.length ? ` — FAIL: ${broken.join('; ')}` : ''));
  }
}
// (10b) #63 — CLOSED, by fixing the cause rather than accepting it. History, because the shape of the
// mistake is the reusable part: nb's semantic text on the `-subtle` tint measured ~4.0–4.2:1 in LIGHT,
// under AA 4.5 (the banner/badge pairing; a CR-02 sibling — contracted vs the mode FLOOR but USED on a
// specific lighter tint). It was accepted as an NB-source divergence on the premise that the engine was
// already correct, because "engine-GENERATED brands place these to clear 4.5" — which was TRUE of the
// brands then in the corpus and FALSE of the engine. Both example brands had TINTED pages; a tinted page
// holds the floor high (neutral.100), the ink stayed dark enough for the tint by luck, and the fault
// looked like it belonged to the fixture. The moment aurora took a WHITE page the floor dropped to
// neutral.050, the ink relaxed a rung, and the same shortfall appeared in 4 of the 5 corpus brands
// (nb, aurora, wendys, minimal — every white-page member, incl. the web start screen's default).
//
// THE LESSON, which is not about tints: a fixture-shaped waiver is only as good as the corpus that
// convinced you the generator was fine. Every generated brand shared one property (a tinted page) that
// nothing named or gated, so "generated brands pass" read as "the derivation is right" when it meant
// "no generated brand exercises this path". A waiver justified by corpus agreement needs the corpus to
// actually VARY on the axis in question — otherwise it records a coincidence as a decision.
//
// `semanticInk` (modes.ts) now gates these inks against the tint as well as the floor, so NB resolves
// them one rung darker than it authored (recorded in NB_KNOWN_DIVERGENCES) and every mode is clean.
// The gate is inverted accordingly: it asserts the shortfall is GONE, in all four modes, for the
// fixture that used to own it. It fails if the pairing ever regresses below AA again.
{
  const rp = resolvePreview(nbTheme());
  for (const mode of rp.modes) {
    const fails = rp.contracts.filter((c) => c.byMode[mode] && !c.byMode[mode]!.pass);
    ok(fails.length === 0, `#63 (closed): nb has no preview-contract shortfall in ${mode} — the semantic-text-on-subtle-tint pairing clears AA`
      + (fails.length ? ` — FAIL: ${fails.map((c) => `${c.label}:${c.byMode[mode]!.ratio}<${c.min}`).join('; ')}` : ''));
  }
  // The specific pairing #63 was about, asserted directly rather than only via the preview specs, so
  // this keeps meaning something if the alert/badge previews are ever restructured.
  const light = resolveAllModes(nbTheme()).find((m) => m.mode === 'light')!;
  for (const sem of ['brand', 'success', 'warning', 'danger', 'info']) {
    const ink = light.roles[`text.${sem}`], tint = light.roles[`foreground.${sem}-subtle`];
    if (!ink || !tint) continue;
    const r = contrast(hexToRgb(ink.hex), hexToRgb(tint.hex));
    ok(r >= 4.5, `#63 (closed): nb light text.${sem} clears AA on foreground.${sem}-subtle (${r.toFixed(2)} >= 4.5)`);
  }
}
// (10c) The general form of #63, across the WHOLE corpus and EVERY mode — the assertion whose absence
// is what let the shortfall live behind a fixture waiver. `text.<sem>` and `icon.<sem>` are placed on
// their own `-subtle` tint by the alert/banner and subtle-badge patterns, so the pairing must clear the
// role's own bar there, not only against the page floor it is contracted against.
//
// Deliberately corpus-wide rather than example-brand-wide: the corpus is the set that VARIES the input
// space (both dialects, the legacy fixture, and the sparsest accepted input), and a per-example check is
// exactly what proved too narrow last time. Icons ride along because `iconContrast: '3:1'` gives them a
// different bar — aurora sets it, so the loop reads each role's own `min` instead of assuming 4.5.
{
  for (const { id, theme } of corpus()) {
    const bad: string[] = [];
    for (const m of resolveAllModes(theme)) {
      for (const fam of ['text', 'icon'] as const) {
        for (const sem of ['brand', 'success', 'warning', 'danger', 'info']) {
          const ink = m.roles[`${fam}.${sem}`], tint = m.roles[`foreground.${sem}-subtle`];
          if (!ink || !tint || ink.min <= 0) continue;
          const r = contrast(hexToRgb(ink.hex), hexToRgb(tint.hex));
          if (r < ink.min) bad.push(`${m.mode} ${fam}.${sem} ${r.toFixed(2)}<${ink.min}`);
        }
      }
    }
    ok(bad.length === 0, `semantic ink on its own subtle tint clears its bar — ${id}`
      + (bad.length ? ` — FAIL: ${bad.join('; ')}` : ''));
  }
}

// (10d) #570 — MUTED semantic ink is gated, and stays DISTINCT from bold. Two invariants, because
// the fix has two ways to go wrong and they pull against each other: raise the bar and muted
// converges on bold (losing the point of the role), leave it ungated and it can sink under the page.
//
// (i) Every `-subtle` ink clears its own declared `min` against the page. This must not read `> 0`
// and skip — that is precisely the escape hatch that let the old `min: 0` sit at 3.16 unnoticed. So
// the loop asserts the role is GATED first: an accidental return to `min: 0` fails here rather than
// silently opting out of its own check. (10c) taught this lesson about `ink.min <= 0` being a legal
// skip; here a zero min is itself the bug.
//
// (ii) Muted and bold never resolve to the same colour. The gate floats muted now, so a flat or
// short ramp could float it onto bold's rung and the "quiet" variant would stop being quiet — a
// regression no contrast assertion can see, because both values would be perfectly accessible.
// Measured floor at the time of writing: 1.16 worst-case separation, 0 identical-hex collisions.
// That 1.16 is over EVERYTHING this loop walks — 200 combos, both families, all four modes (worst:
// harbor + nb hc-dark warning/danger, and aurora/light/icon.*). It is not the 1.45–1.78 the #570 entry
// and `modes.ts` quote, which is the 25 LIGHT `text` combos the option table compared. Both are right;
// a separation figure means nothing without its scope, and the two were briefly read as a conflict
// (#578). State the scope with the number wherever one of these is quoted.
// Asserting non-identity rather than a ratio threshold is deliberate: the ramp step count is a
// brand lever, so a fixed separation minimum would fail honest brands. Identity is the real defect.
{
  const SEMS = ['brand', 'success', 'warning', 'danger', 'info'];
  for (const { id, theme } of corpus()) {
    const ungated: string[] = [], short: string[] = [], collided: string[] = [];
    for (const m of resolveAllModes(theme)) {
      const page = m.roles['background.primary'];
      if (!page) continue;
      for (const fam of ['text', 'icon'] as const) {
        for (const sem of SEMS) {
          const muted = m.roles[`${fam}.${sem}-subtle`], bold = m.roles[`${fam}.${sem}`];
          if (!muted) continue;
          if (muted.min <= 0) { ungated.push(`${m.mode} ${fam}.${sem}-subtle`); continue; }
          const r = contrast(hexToRgb(muted.hex), hexToRgb(page.hex));
          if (r < muted.min) short.push(`${m.mode} ${fam}.${sem}-subtle ${r.toFixed(2)}<${muted.min}`);
          if (bold && bold.hex === muted.hex) collided.push(`${m.mode} ${fam}.${sem} both ${bold.hex}`);
        }
      }
    }
    ok(ungated.length === 0, `muted semantic ink declares a contrast bar — ${id}`
      + (ungated.length ? ` — UNGATED: ${ungated.join('; ')}` : ''));
    ok(short.length === 0, `muted semantic ink clears its bar on the page — ${id}`
      + (short.length ? ` — FAIL: ${short.join('; ')}` : ''));
    ok(collided.length === 0, `muted semantic ink stays distinct from bold — ${id}`
      + (collided.length ? ` — COLLISION: ${collided.join('; ')}` : ''));
  }
}

// (10e) #570 — muted ink RESPONDS to the high-contrast bar. The fixed-rung version could not: it
// emitted the identical value in `light` and `hc-light` (nb measured 3.85 in both), so a user who
// switched to HC for legibility got no change in the one ink family named for being low-emphasis.
// A fixed step cannot answer a raised bar, and nothing was asserting that it should.
//
// Stated as hc >= standard rather than hc > standard: a brand whose standard value already clears
// 4.5 correctly stays put (wendys' brand muted does exactly that at 4.80), so strict inequality
// would fail an honest brand. The regression this catches is hc coming back LOWER or unchanged-and-
// failing, which the `min` comparison below pins down.
{
  for (const { id, theme } of corpus()) {
    const bad: string[] = [];
    const modes = resolveAllModes(theme);
    const std = modes.find((m) => m.mode === 'light'), hc = modes.find((m) => m.mode === 'hc-light');
    if (!std || !hc) continue;
    for (const sem of ['brand', 'success', 'warning', 'danger', 'info']) {
      const s = std.roles[`text.${sem}-subtle`], h = hc.roles[`text.${sem}-subtle`];
      if (!s || !h) continue;
      if (h.min <= s.min) bad.push(`${sem}: hc bar ${h.min} !> standard ${s.min}`);
      const sr = contrast(hexToRgb(s.hex), hexToRgb(std.roles['background.primary'].hex));
      const hr = contrast(hexToRgb(h.hex), hexToRgb(hc.roles['background.primary'].hex));
      if (hr < h.min) bad.push(`${sem}: hc ${hr.toFixed(2)}<${h.min}`);
      if (hr < sr - 0.01) bad.push(`${sem}: hc ${hr.toFixed(2)} < standard ${sr.toFixed(2)}`);
    }
    ok(bad.length === 0, `muted ink escalates with the HC bar — ${id}`
      + (bad.length ? ` — FAIL: ${bad.join('; ')}` : ''));
  }
}

// (10f) #573 — the focus ring is legible on the ground it is DRAWN on, not just the page. There was
// one `border.focus`, gated against `background.primary` and reused on inverse surfaces, where it
// measured 3.46 (light) / 5.24 (dark) but **2.09 (hc-light) / 2.40 (hc-dark)** — sub-3:1 in the two
// modes whose whole purpose is serving users who depend on seeing focus. Those four numbers are the
// fixture values below.
//
// This is the third instance of one shape of bug: a role gated against one ground and painted on
// another (#63 ink-on-tint, #570 fixed-rung-vs-raised-bar, this). So the assertion is deliberately
// written against the CONTRACT rather than against `focus-inverse` by name: every `border.*` role
// that declares a `min` must clear it against whatever surface its own `against` names. A future
// inverse-sensitive border then arrives already covered, instead of needing someone to remember to
// add a fourth near-identical block.
//
// What this canNOT see, because it reads the contract: whether `against` names the RIGHT ground. A
// role that quietly re-declares an easier surface passes here while being invisible where it is
// actually painted. That is (10f-ii)'s job — see the mutation recorded there.
{
  for (const { id, theme } of corpus()) {
    const bad: string[] = [];
    for (const m of resolveAllModes(theme)) {
      // The ring must EXIST on both grounds — a missing inverse ring is the defect itself, so its
      // absence has to fail rather than skip (the (10d) lesson: a legal skip hides a removal).
      const inv = m.roles['border.focus-inverse'];
      if (!inv) { bad.push(`${m.mode}: border.focus-inverse missing`); continue; }
      if (inv.min < 3) bad.push(`${m.mode}: focus-inverse min ${inv.min} — a focus ring below the SC 1.4.11 floor`);
      for (const [key, r] of Object.entries(m.roles)) {
        if (!key.startsWith('border.') || r.min <= 0) continue;
        const ground = m.roles[r.against];
        if (!ground) { bad.push(`${m.mode} ${key}: against '${r.against}' resolves to no role`); continue; }
        const actual = contrast(hexToRgb(r.hex), hexToRgb(ground.hex));
        if (actual < r.min) bad.push(`${m.mode} ${key}: ${actual.toFixed(2)}<${r.min} on ${r.against}`);
      }
    }
    ok(bad.length === 0, `every gated border clears its bar on the surface it names — ${id}`
      + (bad.length ? ` — FAIL: ${bad.join('; ')}` : ''));
  }
}

// (10f-ii) #573 — a role whose NAME claims an inverse context must be MEASURED against an inverse
// surface. This exists because (10f) above has a blind spot I only found by mutating into it: it
// trusts each role's own `against` string, so a role can satisfy it by declaring an easier ground.
// Mutating `border.focus-inverse` to gate against `background.primary` while keeping its name — a
// one-word edit, self-consistent, and still distinct from `border.focus` so (10g) stays quiet — slips
// through both. The resulting ring measures **1.00:1 on the surface it is painted on** (wendys,
// minimal, every mode): perfectly invisible, and reported as a comfortable 5.94 pass.
//
// So the gate that reads the contract cannot be the only gate on the contract. `against` is an
// assertion by the derivation about itself; this checks that assertion against the role's name, which
// is the one thing the derivation does not get to choose freely once consumers reference it.
{
  for (const { id, theme } of corpus()) {
    const bad: string[] = [];
    for (const m of resolveAllModes(theme))
      for (const [key, r] of Object.entries(m.roles)) {
        // `on-inverse` / `-inverse` / `.inverse.` all mark "for use on an inverse surface".
        if (!/(^|[.-])inverse([.-]|$)/.test(key.replace('on-inverse', 'inverse'))) continue;
        if (key.startsWith('background.inverse') || key.startsWith('foreground.inverse')) continue; // the surfaces themselves
        if (r.min <= 0) continue;                                    // ungated by design — (10f) covers the gated set
        if (!/inverse/.test(r.against)) bad.push(`${m.mode} ${key}: gated against '${r.against}', which is not an inverse surface`);
      }
    ok(bad.length === 0, `every gated inverse-context role is measured on an inverse surface — ${id}`
      + (bad.length ? ` — FAIL: ${bad.slice(0, 4).join('; ')}` : ''));
  }
}

// (10g) #573 — the inverse ring is a SEPARATE value from the page ring, in at least one mode. Both
// derive from the action palette, so a mistake that pointed them at the same pick would still pass
// (10f) in the standard modes (where the page ring happens to clear 3:1 on the inverse surface too)
// and only fail in HC. This pins the reason the role exists: if the two are byte-identical in every
// mode, the second token is dead weight and the bug is back.
{
  for (const { id, theme } of corpus()) {
    const modes = resolveAllModes(theme);
    const differs = modes.filter((m) => m.roles['border.focus']?.hex !== m.roles['border.focus-inverse']?.hex);
    ok(differs.length > 0, `the inverse focus ring is its own value — ${id}`
      + (differs.length ? ` (${differs.length}/${modes.length} modes)` : ' — FAIL: identical to border.focus in every mode'));
  }
}

// (10h) #575 — the OUTLINE-METHOD contract: for every `outlineInteraction` value, the role
// `outlineFillFamily` names is the role the engine actually emits, and the family it does NOT name
// is absent.
//
// The bug this closes was not in the tokens — they were always correct — but in a consumer's read of
// them, and that is precisely why nothing caught it. `emit-dtcg`'s contrast contracts pass either
// way; the style guide asked for `overlay.hover` under `solid-tint`, got `undefined`, and painted
// `transparent`. **An absent role and a deliberately-empty one are indistinguishable at the point of
// use**, so the failure renders as a plausible design decision rather than as an error. No amount of
// gating the artifact would have found it.
//
// So this gate is on the MAPPING, which is the thing both sides now share: if the helper the
// dashboard reads ever disagrees with the branch the emitter takes, one of these two assertions
// fails for every brand at once. The exhaustiveness of the switch is enforced separately and for
// free — `outlineFillFamily` has no `default`, so a fourth lever value is a compile error at the
// helper rather than a silently transparent swatch (verified by adding one).
//
// Note `none` is asserted just as hard as the other two. It is the value the bug MASQUERADED as, so
// "both families absent" is a real claim worth pinning: if `none` ever started emitting a family,
// the two working methods would keep working and only the bug's disguise would get better.
{
  const METHODS = ['overlay-neutral', 'solid-tint', 'none'] as const;
  const FAMILIES = ['overlay', 'subtle-fill'] as const;
  for (const { id, theme } of corpus()) {
    for (const method of METHODS) {
      const { family, opaque } = outlineFillFamily(method);
      const missing: string[] = [], spurious: string[] = [];
      for (const m of resolveAllModes({ ...theme, outlineInteraction: method })) {
        for (const color of ['primary', 'neutral', 'destructive']) {
          for (const st of ['hover', 'pressed', 'selected']) {
            for (const fam of FAMILIES) {
              const present = m.roles[`interactive.${color}.${fam}.${st}`] !== undefined;
              if (fam === family && !present) missing.push(`${m.mode} ${color}.${fam}.${st}`);
              if (fam !== family && present) spurious.push(`${m.mode} ${color}.${fam}.${st}`);
            }
            // The role key the helper hands a consumer must be the one that resolves — the read the
            // dashboard performs, asserted directly rather than inferred from the two sets above.
            const key = outlineFillRole(method, color, st);
            if (key !== null && m.roles[key] === undefined) missing.push(`${m.mode} via helper: ${key}`);
            if (key === null && family !== null) missing.push(`${m.mode} helper returned null for an emitting method`);
            // ...and it must resolve to the STATE THAT WAS ASKED FOR, which "it resolves" does not
            // imply: `subtle-fill.hover` resolves perfectly well when the caller asked for `pressed`.
            // Found by review mutation, not by writing this gate: a one-token slip inside the helper
            // (`state === 'pressed' ? 'hover' : state`) passed all 1852 tests. The result is visible
            // and wrong — on harbor/light the two fills are distinct (hover #d3dedd, pressed #c2d1d1),
            // so pressed would paint as hover. That is the SAME SHAPE as the bug this gate closes:
            // a plausible-looking render rather than an error, which is exactly why #575 went unseen.
            // Asserted against the family the helper itself returned, so it constrains the state axis
            // without re-deriving the family and re-introducing the tautology the comment in modes.ts
            // warns about.
            if (key !== null && key !== `interactive.${color}.${family}.${st}`)
              missing.push(`${m.mode} helper key ${key} ≠ requested ${color}.${st}`);
          }
        }
      }
      ok(missing.length === 0, `outline method '${method}' emits the family the helper names — ${id}`
        + (missing.length ? ` — MISSING: ${missing.slice(0, 4).join('; ')}${missing.length > 4 ? ` (+${missing.length - 4})` : ''}` : ''));
      ok(spurious.length === 0, `outline method '${method}' emits ONLY that family — ${id}`
        + (spurious.length ? ` — SPURIOUS: ${spurious.slice(0, 4).join('; ')}${spurious.length > 4 ? ` (+${spurious.length - 4})` : ''}` : ''));
      // `opaque` drives a per-state ink switch in the style guide (see 10h-ii), so it is part of the
      // contract, not a rendering hint: only the tint covers its ground.
      ok(opaque === (method === 'solid-tint'), `outline method '${method}' reports opacity correctly — ${id}`);
    }
  }
}

// (10h-ii) #575 — the OPAQUE tint covers its ground, so ink chosen for the ground beneath it is
// measured against something that is no longer there.
//
// This is the trap that fixing (10h)'s bug walks into. The style guide switches the Outline row's ink
// to `on-inverse.text.*` on an inverse preview ground, which is right for the translucent wash — it
// composites, so the band is still the ground. The `solid-tint` fill is a real palette step: from
// `hover` onward the ground is a page-tuned tint, and the band's ink fails on it in **79 of 80**
// corpus combinations, worst measured 1.32:1. The engine gates the tint against the control's own
// PAGE ink for that state, so the page ink is the measured-correct answer there, not a fallback.
//
// Asserted here rather than in the web because the web has no test suite (#333) — but the fact being
// asserted is an ENGINE fact (which ink the tint was gated against), and it is what makes the
// dashboard's per-state switch correct. Same family as #63/#570/#573: a value measured against one
// ground and painted on another. Third gate in this repo written to catch that shape.
{
  for (const { id, theme } of corpus()) {
    const t = { ...theme, outlineInteraction: 'solid-tint' as const };
    const pageBad: string[] = [], bandOk: string[] = [], bandBad: string[] = [];
    for (const m of resolveAllModes(t)) {
      for (const color of ['primary', 'neutral', 'destructive']) {
        for (const st of ['hover', 'pressed']) {
          const tint = m.roles[`interactive.${color}.subtle-fill.${st}`];
          if (!tint) continue;
          const pageInk = m.roles[`interactive.${color}.text.${st}`];
          const bandInk = m.roles[`interactive.${color}.on-inverse.text.${st}`];
          // The page ink is what the engine gated this tint against — it must hold.
          if (pageInk) {
            const r = contrast(hexToRgb(pageInk.hex), hexToRgb(tint.hex));
            if (r < tint.min) pageBad.push(`${m.mode} ${color}.${st} ${r.toFixed(2)}<${tint.min}`);
          }
          // And the band ink must not be ASSUMED usable on it. Counted, not asserted per row: one
          // combination in the corpus (minimal / dark / primary.hover) does clear 3:1, by coincidence
          // rather than by contract — the engine never gated it there. A "every row fails" assertion
          // would have been the more satisfying claim and it is simply false; writing it that way
          // first is how this got measured properly. What the switch needs is that the band ink
          // cannot be RELIED on, i.e. that it fails somewhere — asserted after the loop.
          if (bandInk && contrast(hexToRgb(bandInk.hex), hexToRgb(tint.hex)) >= 3) bandOk.push(`${m.mode} ${color}.${st}`);
          else if (bandInk) bandBad.push(`${m.mode} ${color}.${st}`);
        }
      }
    }
    ok(pageBad.length === 0, `solid-tint keeps its own state ink legible — ${id}`
      + (pageBad.length ? ` — FAIL: ${pageBad.join('; ')}` : ''));
    // The switch is load-bearing iff the band ink fails on the tint somewhere in this brand. If a
    // brand ever reaches ZERO failures, the coincidence has become universal for it and this gate
    // says so — that is a prompt to check whether the engine now gates the tint for both grounds, in
    // which case the style guide's per-state switch is dead code, not a silent pass.
    ok(bandBad.length > 0, `inverse ink cannot be relied on over the page-tuned tint (the per-state switch is load-bearing) — ${id}`
      + (bandBad.length ? ` — ${bandBad.length} of ${bandBad.length + bandOk.length} rows fail 3:1` : ' — NO row fails: revisit the switch'));
  }
}

// (11) EMIT-FIGMA COLOUR (docs/10) — buildFigmaColor(nbTheme) must reproduce the frozen
// #352 item 2 — the enumerated, deliberate divergences from the frozen real-NB export.
//
// The fixture is NOT re-baselined. It is the real Token Press export, and its whole value is being
// an INDEPENDENT target: overwriting it with engine output would make it self-referential and
// unable to ever catch a real-NB regression again. So the divergence is recorded here instead,
// following the `KNOWN_OUTLIERS` precedent in nb-regression.ts — listed exactly, with the from→to
// pair, so a NEW or CHANGED divergence still fails rather than being waved through.
//
// Why these move: bold fills now gate against the floor at each mode's NON-TEXT bar (SC 1.4.11)
// instead of its text bar. NB hand-authored them at the stricter bar, so the engine's fills now sit
// CLOSER TO THEIR ANCHOR than NB shipped. Owner's call, recorded on #352: "NB fidelity is NB's own
// conservatism showing up as a regression target, not a reason to keep the bar."
//
// Three groups, and the second two are consequences rather than independent decisions:
//   1. `foreground/*` — the relaxed bold fills themselves.
//   2. `text|icon/on-*` (dark) — the fill moved toward its anchor and got DARKER, so the winning ink
//      side FLIPS from NB's dark 950 to a light 025 (or to black, now permitted on a fill).
//   3. `border/focus` — derives from `actionRest`, so it follows the primary fill by construction.
//
// There are deliberately NO `hc-*` rows. HC is exempt from the relaxation (see `fillFloorMin` in
// modes.ts) and so still reproduces NB exactly in both HC modes. Routing HC through the non-text bar
// made hc-light's brand and danger fills resolve identically to STANDARD light, which is the mode
// ceasing to be high-contrast on that axis; HC keeps its own 7:1 text bar for fills instead.
// A FOURTH group joined in the semantic-ink-on-tint fix, and it moves the opposite way from group 1:
// light-mode `text|icon/<sem>` now gate against their own `-subtle` tint as well as the page floor
// (see `semanticInk` in modes.ts), so they resolve one rung DARKER than NB hand-authored — 550→600.
// This is #63's Option 2 arriving on its own: those NB inks measured 4.02–4.22:1 on the tint they are
// used against, and #63 accepted that only because the engine's own brands looked green (both example
// brands had TINTED pages, which held the floor high enough to hide it). A white page drops the floor
// and the miss showed up across 4 of 5 corpus brands. Same owner call as group 1 applies, and more
// strongly: NB's authored value is a real AA failure in the banner/badge pattern, not conservatism.
// `warning` is absent because NB already shipped it at 600 — it needed no move, which is a useful
// independent check that the new gate gives back the authored step whenever the authored step passes.
const NB_KNOWN_DIVERGENCES: { mode: string; name: string; nb: string; engine: string }[] = [
  { mode: 'light', name: 'color/foreground/success', nb: 'palette/green/550', engine: 'palette/green/500' },
  { mode: 'light', name: 'color/foreground/warning', nb: 'palette/amber/600', engine: 'palette/amber/500' },
  { mode: 'light', name: 'color/foreground/info', nb: 'palette/info/550', engine: 'palette/info/500' },
  { mode: 'light', name: 'color/text/brand', nb: 'palette/red/550', engine: 'palette/red/600' },
  { mode: 'light', name: 'color/text/success', nb: 'palette/green/550', engine: 'palette/green/600' },
  { mode: 'light', name: 'color/text/danger', nb: 'palette/red/550', engine: 'palette/red/600' },
  { mode: 'light', name: 'color/text/info', nb: 'palette/info/550', engine: 'palette/info/600' },
  { mode: 'light', name: 'color/icon/brand', nb: 'palette/red/550', engine: 'palette/red/600' },
  { mode: 'light', name: 'color/icon/success', nb: 'palette/green/550', engine: 'palette/green/600' },
  { mode: 'light', name: 'color/icon/danger', nb: 'palette/red/550', engine: 'palette/red/600' },
  { mode: 'light', name: 'color/icon/info', nb: 'palette/info/550', engine: 'palette/info/600' },
  { mode: 'dark', name: 'color/foreground/brand', nb: 'palette/red/450', engine: 'palette/red/550' },
  { mode: 'dark', name: 'color/foreground/success', nb: 'palette/green/400', engine: 'palette/green/500' },
  { mode: 'dark', name: 'color/foreground/warning', nb: 'palette/amber/450', engine: 'palette/amber/500' },
  { mode: 'dark', name: 'color/foreground/info', nb: 'palette/info/450', engine: 'palette/info/500' },
  { mode: 'dark', name: 'color/foreground/danger', nb: 'palette/red/450', engine: 'palette/red/550' },
  { mode: 'dark', name: 'color/text/on-brand', nb: 'palette/neutral/950', engine: 'palette/neutral/025' },
  { mode: 'dark', name: 'color/text/on-success', nb: 'palette/neutral/950', engine: 'palette/neutral/025' },
  { mode: 'dark', name: 'color/text/on-warning', nb: 'palette/neutral/950', engine: 'palette/black' },
  { mode: 'dark', name: 'color/text/on-danger', nb: 'palette/neutral/950', engine: 'palette/neutral/025' },
  { mode: 'dark', name: 'color/text/on-info', nb: 'palette/neutral/950', engine: 'palette/black' },
  { mode: 'dark', name: 'color/icon/on-brand', nb: 'palette/neutral/950', engine: 'palette/neutral/025' },
  { mode: 'dark', name: 'color/icon/on-success', nb: 'palette/neutral/950', engine: 'palette/neutral/025' },
  { mode: 'dark', name: 'color/icon/on-warning', nb: 'palette/neutral/950', engine: 'palette/black' },
  { mode: 'dark', name: 'color/icon/on-danger', nb: 'palette/neutral/950', engine: 'palette/neutral/025' },
  { mode: 'dark', name: 'color/icon/on-info', nb: 'palette/neutral/950', engine: 'palette/black' },
  { mode: 'dark', name: 'color/border/focus', nb: 'palette/red/450', engine: 'palette/red/550' },
  // FIFTH group (#570): muted semantic ink in HC-LIGHT only. NB authored muted at a FIXED rung, so
  // its hc-light values are byte-identical to its light ones — the high-contrast mode did nothing for
  // the one ink family named for being low-emphasis (measured 3.85 in both, against a 4.5 HC bar).
  // The engine now gates muted on `tertiaryMin`, which escalates in HC, so it resolves one rung
  // darker there. Note what is NOT in this list: the standard `light` and `dark` modes, where the
  // gate returns NB's authored 450/350 untouched. That absence is the useful part — it shows the
  // change is an HC fix rather than a broad revaluation, and it is checked, since a stale waiver
  // fails as loudly as a missing one.
  { mode: 'hc-light', name: 'color/text/brand-subtle', nb: 'palette/red/450', engine: 'palette/red/500' },
  { mode: 'hc-light', name: 'color/text/success-subtle', nb: 'palette/green/450', engine: 'palette/green/500' },
  { mode: 'hc-light', name: 'color/text/warning-subtle', nb: 'palette/amber/450', engine: 'palette/amber/500' },
  { mode: 'hc-light', name: 'color/text/danger-subtle', nb: 'palette/red/450', engine: 'palette/red/500' },
  { mode: 'hc-light', name: 'color/text/info-subtle', nb: 'palette/info/450', engine: 'palette/info/500' },
  { mode: 'hc-light', name: 'color/icon/brand-subtle', nb: 'palette/red/450', engine: 'palette/red/500' },
  { mode: 'hc-light', name: 'color/icon/success-subtle', nb: 'palette/green/450', engine: 'palette/green/500' },
  { mode: 'hc-light', name: 'color/icon/warning-subtle', nb: 'palette/amber/450', engine: 'palette/amber/500' },
  { mode: 'hc-light', name: 'color/icon/danger-subtle', nb: 'palette/red/450', engine: 'palette/red/500' },
  { mode: 'hc-light', name: 'color/icon/info-subtle', nb: 'palette/info/450', engine: 'palette/info/500' },
];

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
  const FIXDIR = resolve(HERE, './fixtures/figma/nb');
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
    // Engine-added vars inside a REAL family, allow-listed by EXACT name rather than by prefix.
    // `color/border/focus-inverse` (#573) is the accessibility fix for a ring NB never had: NB's
    // export carries one `color/border/focus`, which measured 2.09:1 on hc-light's inverse surface.
    // Deliberately not widened to a `color/border/` prefix — that would stop this gate noticing a
    // spurious var anywhere in a family the fixture really does define, which is the one thing it is
    // here to do. An exact name costs a line per addition and keeps the rest of the family pinned.
    const ENGINE_ADDED_VARS = ['color/border/focus-inverse'];
    const missing = [...fixByName.keys()].filter((n) => !outByName.has(n));
    const extra = [...outByName.keys()].filter((n) => !fixByName.has(n)
      && !ENGINE_ADDED_FAMILIES.some((p) => n.startsWith(p)) && !ENGINE_ADDED_VARS.includes(n));
    ok(missing.length === 0 && extra.length === 0, `figma ${key}: variable names match fixture (${fix.variables.length})` + (missing.length ? ` — MISSING ${missing.slice(0, 3).join(',')}` : '') + (extra.length ? ` — EXTRA ${extra.slice(0, 3).join(',')}` : ''));

    const scopeBad: string[] = [], aliasBad: string[] = [], valBad: string[] = [];
    const modeOf = key.startsWith('color.') ? key.slice('color.'.length) : '';
    const hit = new Set<string>();
    for (const [name, fv] of fixByName) {
      const ov = outByName.get(name); if (!ov) continue;
      if (JSON.stringify([...fv.scopes].sort()) !== JSON.stringify([...ov.scopes].sort())) scopeBad.push(name);
      // A role may diverge from real NB only if it is enumerated below AND diverges EXACTLY as
      // recorded. A changed divergence is a new finding, not a covered one, so it still fails.
      const known = NB_KNOWN_DIVERGENCES.find((d) => d.mode === modeOf && d.name === name);
      if (known) {
        hit.add(`${known.mode}|${known.name}`);
        if ((fv.alias?.name ?? null) !== known.nb || (ov.alias?.name ?? null) !== known.engine)
          aliasBad.push(`${name} [divergence CHANGED: recorded ${known.nb}→${known.engine}, got ${fv.alias?.name}→${ov.alias?.name}]`);
        continue; // the value differs *because* the alias does — one finding, not two
      }
      if ((fv.alias?.name ?? null) !== (ov.alias?.name ?? null)) aliasBad.push(name);
      for (const ch of ['r', 'g', 'b', 'a']) if (Math.abs((fv.value?.[ch] ?? 0) - (ov.value?.[ch] ?? 0)) > 1e-5) valBad.push(`${name}.${ch}`);
    }
    // Stale entries are as much a bug as missing ones: a waiver that no longer applies is a claim
    // the engine still diverges where it doesn't, and it would silently cover a REAL future
    // divergence at that role. Fail until it is removed.
    const stale = NB_KNOWN_DIVERGENCES.filter((d) => d.mode === modeOf && !hit.has(`${d.mode}|${d.name}`)).map((d) => d.name);
    ok(stale.length === 0, `figma ${key}: no stale NB divergence waivers` + (stale.length ? ` — ${stale.join(', ')} no longer diverge; remove them` : ''));
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
  const FIXDIR = resolve(HERE, './fixtures/figma/nb');
  const theme = nbTheme();

  // (a) font.json — byte-reproduce (39 vars: 7 family + 22 size + 5 weight + 5 weight-role).
  // Was 9 weight until #328: weight numerics are minted from the roles that reference them,
  // so 100/200/500/800 — which no role pointed at and nothing aliased — are no longer emitted.
  // Was 3 family until #415: the display|text|mono ROLE tier is gone and each text CATEGORY binds a
  // typeface directly, so `font/family/*` is one variable per category. The fixture moved with it —
  // the same stance #328 took when the weight list shrank, and for the same reason: the typography
  // half of `fixtures/figma/nb` is an ENGINE snapshot (the color/palette half is the frozen real
  // export). Here the real-world evidence points the same way — Prism2's own brand-theme binds
  // `pds/font/family/{display,title,body,detail}`, category names, no role tier. `display` and the two
  // faces NB binds keep their variable IDs; only the four genuinely-new variables get fresh ones.
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
  ok(famBad.length === 0, 'figma text-styles: fix #4 — fontFamily binds font/family/<category> (primary face; full stack in variable description)' + (famBad.length ? ` — ${famBad.slice(0, 3).join('; ')}` : ''));
  ok(sizeBind.length === 0, 'figma text-styles: fontSize binds the same var as the fixture (font/<size> or font-fluid/<path>)' + (sizeBind.length ? ` — ${sizeBind.slice(0, 3).join('; ')}` : ''));
  ok(weightBind.length === 0, 'figma text-styles: fontWeight binds font/weight-role/<role>' + (weightBind.length ? ` — ${weightBind.slice(0, 3).join('; ')}` : ''));
  ok(lhWrong.length === 0, 'figma text-styles: fix #3a — lineHeight baked as PERCENT (unit=PERCENT, value = round(multiplier×100))' + (lhWrong.length ? ` — ${lhWrong.slice(0, 3).join('; ')}` : ''));
  ok(lsWrong.length === 0, 'figma text-styles: fix #3b — letterSpacing baked as PERCENT (unit=PERCENT, value = em×100)' + (lsWrong.length ? ` — ${lsWrong.slice(0, 3).join('; ')}` : ''));
  ok(styleWrong.length === 0, 'figma text-styles: fix #5 — fontStyle derived from weight-role via the named-instance table' + (styleWrong.length ? ` — ${styleWrong.slice(0, 3).join('; ')}` : ''));
  ok(upperMismatch.length === 0, 'figma text-styles: textCase preserved (eyebrow UPPER, else ORIGINAL)' + (upperMismatch.length ? ` — ${upperMismatch.slice(0, 3).join('; ')}` : ''));
  ok(decoMismatch.length === 0, 'figma text-styles: textDecoration preserved (-link → UNDERLINE, else NONE)' + (decoMismatch.length ? ` — ${decoMismatch.slice(0, 3).join('; ')}` : ''));

  // fontStyleName table sanity (#538): the mono-specific collapse table is gone — it was a hardcoded
  // guess (600→Medium) working around a spelling-variance bug the write-time resolver (#499/#530) now
  // handles properly against the family's REAL loaded styles. So mono and non-mono now AGREE on every
  // weight; asserting agreement (rather than pinning the old 600→Medium collapse) is the regression
  // guard — if a mono-specific table ever creeps back in, this fails.
  ok(fontStyleName(false, 700) === 'Bold' && fontStyleName(false, 600) === 'Semi Bold', 'figma fontStyleName: sans weight → real style name (700=Bold, 600=Semi Bold)');
  ok(fontStyleName(true, 600) === fontStyleName(false, 600) && fontStyleName(true, 400) === fontStyleName(false, 400),
    'figma fontStyleName: mono and non-mono tables agree at every weight (#538 — no more hardcoded mono collapse)');
  {
    // #415's regression, re-verified post-#538: a mono face on a NON-code category (`body`) must not
    // be treated differently from a sans face (`display`) in the same brand — both now emit the SAME
    // guess (`Semi Bold`), since the mono/non-mono tables agree. The `mono` flag stays plumbed through
    // to `fontStyleName` — keyed on the FACE, not the category, per #415 — but no longer selects a
    // different table. If the family genuinely lacks `Semi Bold` under any spelling, the plugin write
    // lane (#499/#530) resolves that against Figma's real loaded styles and skips-with-warning (#237)
    // rather than the engine silently guessing a substitute here.
    const monoBody = brandTheme({ id: 'mono-body', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 },
      typography: { families: { body: 'JetBrains Mono' }, weights: { body: ['default', 'emphasis'], display: ['emphasis'] } } } as any);
    const st = buildFigmaTextStyles(monoBody).styles;
    const bodyEmph = st.filter((x: any) => /^body\/.*\/emphasis$/.test(x.name));
    const dispEmph = st.filter((x: any) => /^display\/.*\/emphasis$/.test(x.name));
    ok(bodyEmph.length > 0 && bodyEmph.every((x: any) => (x.properties.fontStyle as any).value === 'Semi Bold'),
      `figma fontStyleName: a MONO face on body no longer collapses 600→Medium — got ${(bodyEmph[0]?.properties.fontStyle as any)?.value}`);
    ok(dispEmph.length > 0 && dispEmph.every((x: any) => (x.properties.fontStyle as any).value === 'Semi Bold'),
      'figma fontStyleName: …and a SANS face in the same brand still says Semi Bold — mono and non-mono agree (#538)');
  }
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
  const { input } = parseDesignMd(readFileSync(resolve(HERE, './examples/aurora.design.md'), 'utf8'));

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
  // The per-curve bezier editor was removed: the six curves are curated, and a role picks among them.
  // `motionPersonality` is additionalProperties:false, so a stale `easingEmphasized` is REJECTED rather
  // than silently ignored — which is the behavior worth asserting, since silently dropping it would
  // leave a brand thinking it had set a curve.
  ok(validateBrandInput({ ...input, motionPersonality: { easingEmphasized: [0.2, 0, 0.4, 1] } as any }).length > 0, 'CR-04: the retired easingEmphasized is rejected, not ignored');
  ok(validateBrandInput({ ...input, motionPersonality: { easingRoles: { emphasized: 'calm' } } as any }).length === 0, 'CR-04: easingRoles accepts a known curve');
  ok(validateBrandInput({ ...input, motionPersonality: { easingRoles: { emphasized: 'nope' } } as any }).length > 0, 'CR-04: easingRoles rejects an unknown curve at the schema layer');
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
  const { input } = parseDesignMd(readFileSync(resolve(HERE, './examples/aurora.design.md'), 'utf8'));
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
    const { input } = parseDesignMd(readFileSync(resolve(HERE, `./examples/${name}.design.md`), 'utf8'));
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
  const { input } = parseDesignMd(readFileSync(resolve(HERE, './examples/aurora.design.md'), 'utf8'));

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
  const aurora = brandTheme(parseDesignMd(readFileSync(resolve(HERE, './examples/aurora.design.md'), 'utf8')).input);
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
  const { input } = parseDesignMd(readFileSync(resolve(HERE, './examples/aurora.design.md'), 'utf8'));

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
  const auroraTheme = brandTheme(parseDesignMd(readFileSync(resolve(HERE, './examples/aurora.design.md'), 'utf8')).input);
  const wendysStd = parseStandardDesignMd(readFileSync(resolve(HERE, './examples/wendys.design.md'), 'utf8'));
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
  const { input } = parseDesignMd(readFileSync(resolve(HERE, './examples/aurora.design.md'), 'utf8'));

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
  const brandSchema = JSON.parse(readFileSync(resolve(HERE, './schema/theme-schema.json'), 'utf8'));
  const rpc = (method: string, params?: any) => handleRpc({ jsonrpc: '2.0', id: 1, method, params }, brandSchema);

  // ---- 2026-07-28: stateless, server/discover, resultType, cache hints -----------------------
  const disco = rpc('server/discover')?.result as any;
  ok(Array.isArray(disco?.protocolVersions) && disco.protocolVersions[0] === LATEST_PROTOCOL_VERSION && disco.serverInfo?.name === 'prism3-engine',
    `MCP: server/discover advertises versions + identity (newest ${LATEST_PROTOCOL_VERSION}) — a MUST in 2026-07-28`);
  ok(disco.capabilities?.tools && disco.capabilities.tools.listChanged === false, 'MCP: server/discover states tools capability with listChanged:false (a static catalogue)');
  // Every result, not just some: a missing resultType is read as "complete" by newer clients, so the
  // only way this can be wrong is inconsistently.
  for (const m of ['server/discover', 'initialize', 'tools/list', 'ping']) {
    ok((rpc(m)?.result as any)?.resultType === 'complete', `MCP: ${m} result carries resultType:'complete'`);
    ok((rpc(m)?.result as any)?._meta?.['io.modelcontextprotocol/serverInfo']?.name === 'prism3-engine', `MCP: ${m} identifies the server in _meta`);
  }
  const listed = rpc('tools/list')?.result as any;
  ok(listed.ttlMs > 0 && listed.cacheScope === 'public', 'MCP: tools/list carries the required ttlMs + cacheScope cache hints');
  ok(JSON.stringify(((rpc('tools/list')?.result as any).tools as any[]).map((t) => t.name)) === JSON.stringify((listed.tools as any[]).map((t) => t.name)),
    'MCP: tools/list order is deterministic across calls');
  // Version negotiation arrives per-REQUEST now. A version we speak passes; one we do not is rejected
  // with the renumbered code, and an ABSENT version is allowed (older clients never send one).
  const verOk = handleRpc({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': LATEST_PROTOCOL_VERSION } } }, brandSchema);
  ok((verOk?.result as any)?.tools?.length === 6, 'MCP: a request carrying a supported protocolVersion in _meta is served');
  const verBad = handleRpc({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '1999-01-01' } } }, brandSchema);
  ok((verBad as any)?.error?.code === -32022 && Array.isArray((verBad as any)?.error?.data?.supported), 'MCP: an unsupported protocolVersion → -32022 (the reserved range) with the supported list attached');
  ok((rpc('tools/list')?.result as any)?.tools?.length === 6, 'MCP: a request with NO protocolVersion is still served (older clients never send one)');

  // ---- 2024-11-05 dual support: the old handshake still answers ------------------------------
  const init = rpc('initialize')?.result as any;
  ok(init?.protocolVersion === LATEST_PROTOCOL_VERSION && init?.serverInfo?.name === 'prism3-engine', 'MCP: initialize still answers for pinned clients');
  const initOld = handleRpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } }, brandSchema);
  ok((initOld?.result as any)?.protocolVersion === '2024-11-05', 'MCP: initialize echoes an older version we still speak, rather than forcing the newest');
  ok(rpc('notifications/initialized') === null, 'MCP: a notification (initialized) gets no response');
  ok((rpc('bogus/method') as any)?.error?.code === -32601, 'MCP: an unknown method → JSON-RPC -32601 (method not found)');
  ok((rpc('tools/call', { name: 'nope' }) as any)?.error?.code === -32602, 'MCP: an unknown TOOL name is a protocol error (-32602), not a tool result');

  // tool catalogue
  const tools = (rpc('tools/list')?.result as any)?.tools as any[];
  ok(Array.isArray(tools) && tools.map((t) => t.name).sort().join(',') === 'export_theme,list_levers,score_consumption,theme_brand,theme_from_brief,validate_brand', 'MCP: tools/list advertises all six tools');
  ok(tools.find((t) => t.name === 'theme_brand')?.inputSchema?.properties?.brand === brandSchema, 'MCP: theme_brand takes { brand, include } with the BrandInput schema under `brand`');
  ok(toolDefs(brandSchema).length === 6, 'MCP: toolDefs is a pure function of the brand schema');
  // Current MCP tool UX: a display title and behaviour annotations on every tool. Every tool is
  // idempotent + closed-world; all but one are pure reads.
  ok(tools.every((t) => typeof t.title === 'string' && t.annotations?.idempotentHint === true && t.annotations?.openWorldHint === false),
    'MCP: every tool declares a title + idempotent/closed-world annotations');
  // readOnlyHint is asserted by EXCEPTION rather than universally, because a client uses it to decide
  // what to auto-approve — so both directions have to be pinned. `export_theme` writes files and must
  // say so; everything else must keep the guarantee. Flipping either way fails here, which is the
  // point: an annotation that silently drifts from behaviour is worse than no annotation.
  const writers = tools.filter((t) => t.annotations?.readOnlyHint !== true).map((t) => t.name).sort();
  ok(writers.join(',') === 'export_theme',
    `MCP: export_theme is the ONLY non-read-only tool (got: ${writers.join(',') || 'none'})`);
  ok(tools.find((t) => t.name === 'export_theme')?.annotations?.readOnlyHint === false,
    'MCP: export_theme states readOnlyHint:false explicitly rather than omitting it');
  // The 52KB brand schema is inlined ONCE. Two copies made tools/list ~91,500 chars (~23k tokens) to
  // discover three tools, and the second copy told a client nothing the first had not.
  const listChars = JSON.stringify(tools).length;
  ok(listChars < 60_000, `MCP: tools/list stays under 60,000 chars — the schema is inlined once (${listChars.toLocaleString()})`);

  // list_levers now covers the WHOLE input surface, not just the UI knobs. This is the gate on the
  // defect it was written for: the manifest advertised 21 of the schema's 33 top-level fields, and the
  // 12 it omitted included REQUIRED `id` and the entire per-mode override layer.
  const leversPayload = JSON.parse(callTool('list_levers', {}, brandSchema).content[0].text);
  ok(leversPayload.levers.levers.length === leverManifest.length, 'MCP: list_levers still returns the lever manifest verbatim');
  const advertised = new Set<string>([
    ...manifestRootKeys(leversPayload.levers),
    ...leversPayload.nonLeverFields.map((f: { key: string }) => f.key),
  ]);
  const schemaProps = Object.keys((brandSchema as any).properties);
  const unadvertised = schemaProps.filter((k) => !advertised.has(k));
  ok(unadvertised.length === 0, `MCP: list_levers advertises EVERY BrandInput field (${schemaProps.length} of ${schemaProps.length}); unadvertised: ${unadvertised.join(', ') || 'none'}`);
  ok(leversPayload.nonLeverFields.some((f: any) => f.key === 'id' && f.required === true), 'MCP: list_levers names `id` and marks it required (the field an agent omitted)');
  ok(['overrides', 'modeAnchors', 'modeLevers'].every((k) => advertised.has(k)), 'MCP: the per-mode override layers are discoverable through list_levers');

  // theme_brand round-trip: verification payload by DEFAULT, the two huge sections opt-in.
  const brand = { id: 'mcp-probe', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 } };
  const themed = callTool('theme_brand', { brand });
  ok(themed.isError !== true, 'MCP: theme_brand on a valid brand is not an error');
  const payload = JSON.parse(themed.content[0].text);
  ok(payload.contracts.checks > 0 && payload.contracts.pass === payload.contracts.checks && payload.contracts.failures.length === 0, `MCP: theme_brand reports all ${payload.contracts.checks} contrast contracts passing`);
  ok(payload.aliases.broken.length === 0 && payload.aliases.resolved === payload.aliases.total, 'MCP: theme_brand reports every alias resolving');
  ok(payload.tokens === undefined && payload.aiMetadata === undefined, 'MCP: theme_brand withholds the token tree + ai metadata by default (they measure ~824KB together)');
  ok(typeof payload.hint === 'string' && payload.omitted.includes('tokens'), 'MCP: theme_brand SAYS what it withheld and how to ask for it');
  // The default result has to be small enough to actually spend on.
  ok(themed.content[0].text.length < 20_000, `MCP: the default theme_brand result stays under 20,000 chars (${themed.content[0].text.length.toLocaleString()})`);
  const full = JSON.parse(callTool('theme_brand', { brand, include: ['tokens', 'aiMetadata', 'notes'] }).content[0].text);
  ok(full.tokens?.prism && full.aiMetadata && Array.isArray(full.notes), 'MCP: include:[tokens,aiMetadata,notes] returns the DTCG tree, the .ai.json metadata and the decisions log');
  ok(themed.structuredContent !== undefined, 'MCP: results carry structuredContent alongside the text block');

  // The decisions log ships BY DEFAULT. It was opt-in, grouped with `tokens` and `aiMetadata` under
  // "withheld by default" — a grouping by CATEGORY when the only thing justifying it is COST, and
  // the costs differ by two-to-three orders of magnitude (536,770 / 287,283 / 3,653 chars). The tool's own
  // description already claimed it returned "the decisions log by default", so description and
  // behaviour disagreed and the description was the correct half. These assert the fixed direction.
  ok(Array.isArray(payload.notes) && payload.notes.length > 0,
    `MCP: theme_brand returns the decisions log by DEFAULT (${payload.notes?.length} decisions the engine made for this brand, incl. ones flagged for human confirmation)`);
  ok(!payload.omitted.includes('notes'), 'MCP: notes are not reported as withheld when they were in fact returned');
  ok(Array.isArray(JSON.parse(callTool('theme_brand', brand).content[0].text).notes),
    'MCP: the bare-BrandInput calling convention gets the decisions log too (both entry points default alike)');
  const noNotes = JSON.parse(callTool('theme_brand', { brand, include: [] }).content[0].text);
  ok(noNotes.notes === undefined, 'MCP: include:[] still opts OUT of everything — a default, not a floor');
  // Guard the reason the default is affordable at all. If notes ever grow into a payload rather than
  // a log, this fails rather than quietly making every call expensive.
  const notesCost = themed.content[0].text.length - callTool('theme_brand', { brand, include: [] }).content[0].text.length;
  ok(notesCost < 25_000, `MCP: the decisions log stays cheap enough to be a default (${notesCost.toLocaleString()} chars vs ~537,000 for tokens)`);
  ok(toolDefs(brandSchema).find((t) => t.name === 'theme_brand')?.description.includes('decisions log by default'),
    'MCP: the tool description still advertises the default it actually has (these drifted apart once)');
  // The pre-wrap calling convention (a bare BrandInput) still works.
  ok(JSON.parse(callTool('theme_brand', brand).content[0].text).contracts.checks > 0, 'MCP: a bare BrandInput (the old calling convention) is still accepted');

  // ---- score_consumption: the metric eval.ts was written FOR, now reachable over MCP -----------
  // Its own docstring says it "measures whether an agent handed the MCP surface produced COMPLIANT
  // output" — and until now it was not callable from that surface.
  const scored = JSON.parse(callTool('score_consumption', {
    brand,
    refs: ['color.text.primary', '{prism.color.background.primary}', 'palette.primary.600', 'color.nope.missing'],
    pairs: [{ fg: 'color.text.primary', bg: 'color.background.primary' }, { fg: 'color.text.tertiary', bg: 'color.background.primary', kind: 'ui' }],
  }).content[0].text);
  ok(scored.consumption.invented.length === 1 && scored.consumption.invented[0] === 'color.nope.missing',
    'MCP: score_consumption catches an invented token ref');
  ok(scored.consumption.primitiveLeaks.length === 1 && scored.consumption.primitiveLeaks[0] === 'palette.primary.600',
    'MCP: score_consumption catches a reach past the semantic layer into a raw primitive');
  // Non-vacuous: brace syntax and a root-qualified path must BOTH be accepted, or the two valid refs
  // above would have been miscounted as invented and the assertion would pass for the wrong reason.
  ok(scored.consumption.valid === 3 && scored.consumption.total === 4, `MCP: score_consumption normalises brace + root-qualified refs (valid ${scored.consumption.valid}/4)`);
  ok(scored.contracts && scored.contracts.checked > 0, 'MCP: score_consumption checks the fg/bg pairs across every mode');
  ok(JSON.parse(callTool('score_consumption', { brand, refs: [] }).content[0].text).contracts === undefined,
    'MCP: contract scoring is omitted when no pairs were supplied (ref hygiene is a separate question)');
  ok(callTool('score_consumption', { brand: { id: 'bad' }, refs: [] }).isError === true, 'MCP: score_consumption rejects an invalid brand loudly');

  // ---- theme_from_brief: the design.md path, for agents working from prose --------------------
  const brief = ['---', 'id: brief-probe', 'primary: { l: 0.5, c: 0.15, h: 250 }', 'neutral: { hue: 250, chroma: 0.01 }', '---', '', 'A calm, considered brand.'].join('\n');
  const fromBrief = callTool('theme_from_brief', { brief });
  ok(fromBrief.isError !== true, 'MCP: theme_from_brief generates from a design.md brief');
  const bp = JSON.parse(fromBrief.content[0].text);
  ok(bp.id === 'brief-probe' && bp.contracts.checks > 0, 'MCP: theme_from_brief returns the same verification payload as theme_brand');
  ok(bp.derivedBrandInput?.primary?.h === 250, 'MCP: theme_from_brief reports the BrandInput it derived (a brief is lossy — the round trip has to be inspectable)');
  ok(callTool('theme_from_brief', { brief: 'no frontmatter here' }).isError === true, 'MCP: a malformed brief is a tool error the model can correct, not an RPC error');
  // The two entry points must not be able to describe the same brand differently.
  ok(JSON.stringify(bp.contracts) === JSON.stringify(JSON.parse(callTool('theme_brand', { brand: bp.derivedBrandInput }).content[0].text).contracts),
    'MCP: theme_from_brief and theme_brand report an identical payload for the same brand (one shared path)');

  // validate_brand: bad input → errors; good input → clean; and theme_brand rejects a bad brand loudly
  ok(JSON.parse(callTool('validate_brand', { id: 'x' }).content[0].text).valid === false, 'MCP: validate_brand flags an incomplete brand (missing primary/neutral)');
  ok(JSON.parse(callTool('validate_brand', { id: 'ok', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 } }).content[0].text).valid === true, 'MCP: validate_brand passes a complete brand');
  ok(callTool('theme_brand', { id: 'bad' }).isError === true, 'MCP: theme_brand on an invalid brand returns a tool-level error (isError), not a crash');
  ok(callTool('no_such_tool', {}).isError === true, 'MCP: callTool on an unknown name → isError (the RPC layer rejects it earlier, this is the direct-call guard)');
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
  const auroraT = brandTheme(parseDesignMd(readFileSync(resolve(HERE, './examples/aurora.design.md'), 'utf8')).input);
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
  // {primary,neutral,destructive} × appearance {filled,outline,text}, PRIMARY default.
  //
  // Reversed 2026-08-07 (was `neutral`). The old default came from "one primary per view", which
  // counts primaries as if emphasis lived on `intent` — but this def made intent and appearance
  // orthogonal, so rank is carried by APPEARANCE and a three-action form is three primaries at
  // filled/outline/text. The constraint is one FILLED per view, not one primary.
  const intentProp = button.props.find((p) => p.name === 'intent');
  ok(intentProp?.default === 'primary', `component: Button intent defaults to primary — the brand colour is the expected look of a button (got '${intentProp?.default}')`);
  // The DEFAULT AND THE GUIDANCE HAVE TO AGREE, and that is the half a value assertion misses. The
  // prose said "keep exactly one primary per view" while the default handed you a primary — so a
  // developer writing `<Button>` twice violated the def's own rule with no way to notice. Flipping
  // the default without rewriting the rule is the failure this pins: assert the docs no longer
  // ration PRIMARIES, since the thing being rationed is now the filled appearance.
  const guidance = [button.docs!.usage, ...button.docs!.do, ...button.docs!.dont].join(' ');
  ok(!/one primary per view|exactly one primary|multiple primaries competing/i.test(guidance),
    'component: Button docs no longer ration primaries — with primary as the default, "one primary per view" would contradict the default it sits beside');
  ok(/one FILLED/i.test(guidance) && /appearance/i.test(guidance),
    'component: Button docs ration the FILLED appearance instead, and say hierarchy is the appearance axis — the rule survives, the axis it applies to changed');
  // AND THE TWO SURFACES AGREE. Figma treats a set's FIRST member as its thumbnail, and the
  // enumeration has always led with `intent=primary` — so while the code default was `neutral`, a
  // designer opening the set and a developer writing `<Button>` got different buttons, in different
  // colours, with nothing anywhere reporting the disagreement. That is the actual defect the default
  // flip closes; the guidance contradiction above is the half that was visible. Asserted against the
  // EMITTED name rather than the axis list, so reordering the enumeration fails here too.
  const firstMember = planComponentName(figmaAnatomyPlan(button, button.variants.size[0], {
    leading: false, trailing: false, swapTarget: 'FPO-default-icon',
    intent: button.variants.intent[0], appearance: button.variants.appearance[0], state: 'rest',
  }));
  ok(new RegExp(`intent=${intentProp?.default}\\b`).test(firstMember),
    `component: the Figma set's first member (its thumbnail) carries the SAME intent as the code default — '${intentProp?.default}' (${firstMember})`);
  // THE SAME SHAPE AGAIN, one axis over. The don't-list read "Replace the label with a centred spinner
  // (collapses width) — swap the leading visual instead", which was sound advice for as long as the
  // spinner only ever took the leading cell. Once it learned to overlay the label (#612), the prose
  // prohibited by name the thing the projection now does — and every gate stayed green, because 1,948
  // assertions read the projection and not one read this string. So tie the two together: whatever the
  // def declares about the absent-leading case, the guidance must not forbid.
  ok(/overlay|zero opacity/i.test(guidance) === !!button.anatomy!.parts.spinner.overlaysWhenAbsent,
    'component: Button guidance and the spinner def agree about overlaying the label — the def declares a fallback, so the prose may not prohibit one (#612)');
  ok(!/collapses width\)\s*—\s*swap the leading visual instead/i.test(guidance),
    'component: the don\'t-list no longer bans a centered spinner outright — REMOVING the label collapses the width, overlaying it does not, and the old wording conflated the two');
  // What the rule is actually protecting is the accessible name, so say that and gate that.
  ok(/screen readers? lose|a11y|accessibility|loses? the name/i.test(guidance),
    'component: and the surviving prohibition names the real cost — a removed label takes the accessible name with it, which is why the overlay is held at zero opacity rather than hidden');
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
    // The spinner takes the LEADING VISUAL's cell when there is one, AND declares what to do when
    // there isn't. This comment used to end at the first clause, reasoning that the label's position
    // was out of bounds because "replacing a centred label collapses the width, which the brief's
    // don't-list prohibits by name" — conflating REPLACE with REMOVE. Removing the label collapses the
    // width; overlaying it at zero opacity does not. That conflation is what left `leading: false`
    // with no rule at all, so the spinner took a cell that did not exist at rest and the most common
    // button shape in the system grew 28px mid-submit (#612).
    ok(a.parts.spinner.kind === 'overlay' && a.parts.spinner.replaces === 'leadingVisual', 'anatomy: the pending spinner replaces the leading visual (width-preserving), not the label');
    ok(a.parts.spinner.overlaysWhenAbsent === 'label', 'anatomy: and it declares the label as its fallback for the coordinate where there is no leading visual to replace — every optional `replaces` needs one or the part grows on that state (#612)');

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
    // The MIRROR case. The three cells above pin the left inset at (l=0,t=0), (l=1,t=0) and
    // (l=1,t=1) and leave (l=0,t=1) — trailing-WITHOUT-leading — unconstrained, which is exactly
    // where "each side reads ITS OWN slot" and "either side pulls in when ANY slot is filled"
    // diverge. Confirmed by mutation, not by reasoning: changing the left inset to
    // `leadingFilled || trailingFilled` passed all 1,756 assertions that existed before this line.
    // The #536 item 6 probe is what surfaced it — `trailing: true` appeared nowhere in this file
    // without `leading: true` beside it. (A plain side-SWAP was already caught, by the cell above.)
    const trail = figmaAnatomyPlan(button, 'medium', { trailing: true });
    ok(JSON.stringify(padOf(trail)) === JSON.stringify([labelSide, visualSide]), 'anatomy: a trailing visual pulls in the TRAILING inset only — the fourth cell, where per-side and either-side diverge');
    ok(padOf(trail)[0] === labelSide, 'anatomy: a trailing visual leaves the LEADING inset alone — each side reads its own slot, not whether any slot is filled');

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
    // Effect styles live in a THIRD namespace (`setEffectStyleIdAsync`). Read into their own set —
    // see below for the assertion that a merged set would have let through.
    const emittedEffects = new Set<string>();
    for (const f of readdirSync(resolve(HERE, 'out/figma/nb'))) {
      if (!f.endsWith('.json')) continue;
      const j = JSON.parse(readFileSync(resolve(HERE, `out/figma/nb/${f}`), 'utf8'));
      for (const v of j.variables ?? []) emitted.add(v.name);
      for (const s of j.styles ?? []) (f.startsWith('shadow') ? emittedEffects : emittedStyles).add(s.name);
    }
    ok(emitted.size > 0 && emittedStyles.size > 0, `anatomy: read the emitted Figma names (${emitted.size} variables, ${emittedStyles.size} styles)`);
    ok(emittedEffects.size > 0, `anatomy: read the emitted Figma EFFECT styles (${emittedEffects.size}) — a third namespace, kept apart from variables and text styles`);
    const bindErrs = button.variants.size.flatMap((s) =>
      // All FOUR slot combos, not three — the same mirror-case omission as the padding block above.
      [[false, false], [true, false], [false, true], [true, true]].map(([l, t]) => planBindingErrors(figmaAnatomyPlan(button, s, { leading: l, trailing: t }), emitted, emittedStyles, emittedEffects)).flat());
    ok(bindErrs.length === 0, `anatomy: every bound variable + text style exists in the emitted Figma set${bindErrs.length ? ` — MISSING: ${[...new Set(bindErrs)].slice(0, 4).join(', ')}` : ''}`);

    // ---- the effect-style namespace (#487 step 2) ----------------------------------------------
    // Elevation (`filled elevated` on the legacy sheet) is a Figma EFFECT style, applied with
    // `setEffectStyleIdAsync`. There is no `setBoundVariable('effects', …)`, so an effect squeezed
    // into `bound` type-checks, passes every offline gate, and fails only at paste time — the same
    // trap `textStyle` was given its own field to avoid. These assert the third field is real,
    // reaches the payload, and is checked against its OWN name set.
    // Picked out of the emitted sets rather than hardcoded, so these stay real names if the ladders
    // are renamed — a stale literal would make the cross-namespace probes below vacuously pass.
    const labelTextStyleName = [...emittedStyles].sort()[0];
    const someVariableName = [...emitted].sort()[0];
    const effProbe: AnatomyPlan = { ...lead, root: { ...lead.root, effectStyle: 'shadow/md' } };
    ok(planEffectStyles(effProbe.root).includes('shadow/md'), 'anatomy: planEffectStyles walks the effectStyle field (its own namespace walker, matching planTextStyles)');
    ok(planBindingErrors(effProbe, emitted, emittedStyles, emittedEffects).length === 0, 'anatomy: a real emitted effect style resolves against the effect-style set');
    // A merged name set is the failure this guards: `shadow/md` is not a variable and not a text
    // style, so checking it against either would report a false MISSING — and a bogus name checked
    // against a merged set could pass by matching something in the wrong namespace.
    ok(!emitted.has('shadow/md') && !emittedStyles.has('shadow/md'), 'anatomy: an effect-style name is in NEITHER the variable nor the text-style set — the three namespaces are genuinely disjoint');
    // ...but the assertion above is about the DATA, and the promise in `planBindingErrors`'s doc is
    // about the FUNCTION. They are not the same claim, and the gap was real: widening the effect
    // filter to `!effectStyles.has(s) && !textStyles?.has(s) && !emitted.has(s)` — merging exactly the
    // three sets that comment says must stay apart — left all 1516 tests passing. Disjoint inputs
    // cannot detect a function that stopped caring which set it was given (#493 should-fix).
    //
    // So each direction is probed with a name that IS legitimately emitted, just in the WRONG
    // namespace. A merged set makes these resolve silently; separate sets reject them.
    const crossProbes: { field: 'effectStyle' | 'textStyle'; name: string; why: string }[] = [
      { field: 'effectStyle', name: labelTextStyleName, why: 'a TEXT-style name in effectStyle' },
      { field: 'textStyle', name: 'shadow/md', why: 'an EFFECT-style name in textStyle' },
      { field: 'effectStyle', name: someVariableName, why: 'a VARIABLE name in effectStyle' },
      // The direction the three above miss: they cover every OTHER pairing but not text-vs-variable.
      // Found the same way as the fourth `bound` probe below — by mutating the branch nothing named,
      // after the probes above were already green. Merging `emitted` into the textStyle filter (or
      // vice versa) survives all three of the original probes untouched, because none of them puts a
      // real variable name in the `textStyle` field.
      { field: 'textStyle', name: someVariableName, why: 'a VARIABLE name in textStyle' },
    ];
    for (const { field, name, why } of crossProbes) {
      const probe: AnatomyPlan = { ...lead, root: { ...lead.root, [field]: name } };
      ok(planBindingErrors(probe, emitted, emittedStyles, emittedEffects).length > 0,
        `anatomy: ${why} ('${name}') is REJECTED — planBindingErrors checks each namespace against its own set, not a merged one`);
    }
    // The fourth direction, and the one the three above miss: they all probe a STYLE field, so
    // merging the VARIABLE filter with the style sets survived them untouched. `bound` is
    // `Record<string, string>`, so a style name squeezed in there type-checks — the same shape as the
    // original `setBoundVariable('effects', …)` trap this whole field exists to prevent. Found by
    // mutating the variable filter after the first three probes were already green, which is the
    // argument for mutating every branch rather than only the one the finding named.
    const boundCross: AnatomyPlan = { ...lead, root: { ...lead.root, bound: { ...lead.root.bound, fills: 'shadow/md' } } };
    ok(planBindingErrors(boundCross, emitted, emittedStyles, emittedEffects).some((e) => /bound variable 'shadow\/md'/.test(e)),
      'anatomy: an EFFECT-style name in `bound` is rejected as a missing VARIABLE — the variable filter is not merged with the style sets either');
    // Same probe, the other style namespace: `boundCross` above only rules out the variable filter
    // merging with EFFECT styles, not with TEXT styles — a separate mutation (merging only
    // `textStyles` into the variable filter) survives it untouched.
    const boundCrossText: AnatomyPlan = { ...lead, root: { ...lead.root, bound: { ...lead.root.bound, fills: labelTextStyleName } } };
    ok(planBindingErrors(boundCrossText, emitted, emittedStyles, emittedEffects).some((e) => new RegExp(`bound variable '${labelTextStyleName.replace(/\//g, '\\/')}'`).test(e)),
      'anatomy: a TEXT-style name in `bound` is rejected as a missing VARIABLE — the variable filter is not merged with the text-style set either');
    const effBogus: AnatomyPlan = { ...lead, root: { ...lead.root, effectStyle: 'shadow/nope' } };
    ok(planBindingErrors(effBogus, emitted, emittedStyles, emittedEffects).some((e) => /effect style 'shadow\/nope'/.test(e)), 'anatomy: an unemitted effect style is reported, and names the effect-style namespace in the message');
    // Both shadow ladders emit (`shadow/*` and `shadow-dark/*`). A light-only name must not be
    // satisfiable by its dark twin, which is the other thing a merged set would have blurred.
    ok(emittedEffects.has('shadow/md') && emittedEffects.has('shadow-dark/md'), 'anatomy: both shadow ladders emit as effect styles (light + dark are distinct names, not one mode-aware style)');
    // The payload must actually APPLY it. A plan field nothing honors is a claim, not a projection.
    const effJs = planToPluginJs(effProbe);
    ok(effJs.includes('getLocalEffectStylesAsync') && effJs.includes('setEffectStyleIdAsync'), 'anatomy: the plugin payload applies effect styles through their own API, not setBoundVariable');
    ok(!/setBoundVariable\(\s*['"]effects/.test(effJs), 'anatomy: the payload never tries setBoundVariable for effects — that API does not exist and would fail only at paste time');

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
    // The payload must RETURN its result to the pasting agent. `figma_execute` neither awaits nor
    // unwraps a returned Promise, so an async-IIFE wrapper yields `success: true, result: undefined`
    // — the component builds and the caller learns nothing. That is worse here than in the token
    // tier: `misses[]` is this payload's only failure channel, and a component whose bindings all
    // missed still looks like a success. Verified live in #111 before this gate existed.
    ok(!/\(async\s*\(\)\s*=>\s*\{/.test(js) && !/\}\)\(\)\s*$/.test(js.trim()),
      'anatomy: the plugin payload emits top-level await, NOT an async IIFE (figma_execute drops the Promise → result: undefined)');
    ok(/^return \{[^}]*misses/m.test(js),
      'anatomy: the plugin payload returns its misses[] at the top level — the only channel that reports an unresolved binding');

    // ---- the INSTANCE_SWAP slot (#487 step 3) --------------------------------------------------
    // #482's paste declared swappable slots and built empty frames: the builder was
    // `TEXT ? createText() : createFrame()` with no INSTANCE_SWAP branch at all. So the plan's own
    // `type` field was a claim nothing honored — the same shape as the `textStyle` loss above, and
    // the reason each of these is asserted rather than read off the code.
    const slotNode = lead.root.children.find((c) => c.name === 'leadingVisual')!;
    ok(slotNode.type === 'INSTANCE_SWAP', 'anatomy: a `slot` part projects to INSTANCE_SWAP, not a bare FRAME');
    // Anchored on the LIVE BRANCH, not on the call appearing somewhere. `js.includes('createInstance()')`
    // passed with the ternary inverted — `target ? figma.createFrame() : target.createInstance()` — because
    // the call survives as dead code on the unreachable branch. That inversion IS #482's shipped bug
    // (slots declared, empty frames pasted) in its single-token typo form, and it kept the whole suite
    // green. Same trap as the `strokeWeight` gate below: a substring probe against a payload that
    // documents itself tests the text, so the assertion has to name which side of the ternary the
    // instantiation is on.
    ok(js.includes('node=target?target.createInstance()'), 'anatomy: the payload INSTANTIATES on the resolved branch — #482 declared slots and pasted empty frames, and an inverted ternary reproduces it exactly');
    // Resolved by name across the whole file. `currentPage.findAll` would miss an FPO icon parked on
    // another page and report nothing, since a missing target degrades to a placeholder frame. Rooted
    // at `figma.root` in the assertion for the same reason as above: bare `findAllWithCriteria` passed
    // when the lookup was narrowed to `currentPage`, which is precisely the silent degrade this guards.
    ok(js.includes('loadAllPagesAsync') && js.includes('figma.root.findAllWithCriteria'), 'anatomy: swap targets resolve file-wide by name, not just on the current page');

    // The target is a FILE fact, not a def fact — the same def pastes into a file whose FPO icon is
    // named anything — so it rides on the plan options beside the slot-fill flags, and threads
    // through to the payload. A plan with no target nominated must SAY so rather than quietly
    // building the #482 frame.
    const withIcon = figmaAnatomyPlan(button, 'medium', { leading: true, swapTarget: 'FPO-default-icon' });
    const iconSlot = withIcon.root.children.find((c) => c.name === 'leadingVisual')!;
    ok(iconSlot.swapTarget === 'FPO-default-icon', 'anatomy: a nominated swap target reaches the slot node');
    ok(planToPluginJs(withIcon).includes('FPO-default-icon'), 'anatomy: the nominated target reaches the payload by NAME (brand-invariant, resolved in the live file)');
    ok(!slotNode.swapTarget && js.includes('none nominated'), 'anatomy: with no target nominated the payload records a miss instead of silently pasting an empty frame (#482)');
    ok(!lead.root.swapTarget && !withIcon.root.swapTarget, 'anatomy: swapTarget lands on slot parts only — the container is not swappable');

    // Every slot binds BOTH dimensions to its square artboard variable. That is the plan's intent and
    // it is correct — but it is what made `constrainProportions` load-bearing, so assert the pairing
    // exists rather than leaving the fix below looking like it guards nothing.
    ok(iconSlot.bound.width === iconSlot.bound.height && !!iconSlot.bound.width,
      `anatomy: a slot binds width AND height to the same square-artboard variable (${iconSlot.bound.width})`);

    // #500 recorded this as "an INSTANCE cannot bind both width and height". That was WRONG, and the
    // wrongness is the point: the real cause is `constrainProportions`, which bites FRAME, COMPONENT
    // and INSTANCE alike — a proportion-locked node keeps only the LAST of two dimension bindings,
    // last-write-wins, with no throw and nothing in `misses[]`. `createFrame()` defaults to unlocked,
    // which is exactly why the original probe's FRAME "control" looked like it proved a node-type
    // difference; an instance inherits the lock from its main component, and the real FPO icon ships
    // locked. So the unlock must come BEFORE the first bind, on every node.
    //
    // RE-POINTED, not loosened (#682): the payload now calls `unlockAspectRatio()`, since Figma marks
    // `constrainProportions` `@deprecated` in favour of it. This greps the new literal for the same
    // reason it grepped the old one — the subject is an emitted STRING, so there is no symbol to
    // typecheck and the literal is the only handle. Both halves of the pairing are kept: that the
    // unlock is emitted at all, and that it precedes the first bind.
    const unlockAt = js.indexOf('unlockAspectRatio()');
    ok(unlockAt >= 0, 'anatomy: the payload unlocks the aspect ratio — a locked node silently keeps only one of a slot\'s two dimension bindings');
    ok(unlockAt < js.indexOf('setBoundVariable'), 'anatomy: the unlock precedes the first setBoundVariable (after it, the first binding is already gone)');
    // The deprecated form is GONE, not merely joined by the new one. Without this, the re-point above
    // would pass on a payload that emitted both and left the old call doing the work.
    ok(!js.includes('constrainProportions'), 'anatomy: the deprecated constrainProportions setter is gone from the payload (#682)');
    // #500 also prescribed `resize()` + `layoutSizing*` as the fix. `resize()` CLEARS every dimension
    // binding, so that fix would have destroyed the binding it was meant to preserve.
    //
    // This was `!/\.resize\(/` — a blanket absence — until the absolute part kind arrived needing exactly
    // one resize, on the one node type that binds no dimensions at all. The blanket form would have
    // forced a choice between the ring and the gate, and the honest resolution is that the claim was
    // never really "no resize anywhere": it is **no resize on a node carrying dimension bindings**. So
    // the gate now says that, which is both weaker as text and stronger as a check — it survives the new
    // kind AND still fails the #500 fix, since that one resized the bound slots.
    //
    // Anchored on `kid.resize(` rather than counting occurrences: a count is a landmark that goes stale
    // (#568), and the subject of the claim is WHICH node is resized, not how many times.
    const resizes = [...js.matchAll(/(\w+)\.resize\(/g)].map((m) => m[1]);
    ok(resizes.length === 1 && resizes[0] === 'kid',
      `anatomy: the payload resizes exactly one thing — the absolute child, the one node type with no dimension bindings to clear (resized: ${resizes.join(', ') || 'nothing'})`);
    // The load-bearing half, and the reason the above is not a weakening: `node` is what every bound
    // slot is built as, so a resize reaching it is the #500 fix reintroduced. `absolute` parts are gated
    // to an empty `bound` in the plan, which is what makes the one permitted resize provably safe.
    ok(!/\bnode\.resize\(/.test(js),
      'anatomy: nothing resizes the node carrying the bindings — resize() clears them, which is how #500\'s prescribed fix would have destroyed the bindings it was meant to save');
    const ringPlan = figmaAnatomyPlan(button, 'medium', { leading: true, state: 'focus-visible' })
      .root.children.find((c) => c.name === 'focusRing');
    ok(!!ringPlan && Object.keys(ringPlan.bound).length === 0,
      `anatomy: an absolute part binds NO dimensions — which is what makes the single resize above safe rather than merely tolerated (bound: ${JSON.stringify(ringPlan?.bound)})`);
    // And the generic backstop: `misses[]` only ever filled when a NAME failed to resolve, so a write
    // that resolved and was then discarded was invisible. Reading the binding back closes that,
    // which matters more than either specific fix above — it reports the NEXT silent setter.
    ok(js.includes('node.boundVariables') && js.includes('DISCARDED'),
      'anatomy: the payload reads each binding back — a setter that accepts a call is not a setter that honored it');

    // ---- the COLOR layer (#487 step 3, second half) ---------------------------------------------
    // Paint is opt-in by coordinate: every caller before this asked for structure and must still get
    // exactly structure, with no paints anywhere. That is the regression these two guard.
    ok(planPaintVars(lead.root).length === 0, 'anatomy: a plan with no intent/appearance carries NO paints — structure-only stays structure-only');
    ok(Object.keys(lead.coord).length === 0, 'anatomy: a structure-only plan\'s coord is empty — a gate can tell "legitimately unpainted" from "dropped the paints"');

    // A typo'd coordinate must THROW. Resolving no paint keys at all would otherwise emit a
    // structurally perfect, entirely unpainted component — the silent-success shape of #482 and #500.
    const throws = (label: string, f: () => unknown) => {
      let threw = false;
      try { f(); } catch { threw = true; }
      ok(threw, `anatomy: ${label}`);
    };
    throws('an undeclared intent throws rather than resolving no paints', () => figmaAnatomyPlan(button, 'medium', { intent: 'nope', appearance: 'filled' }));
    throws('an undeclared appearance throws', () => figmaAnatomyPlan(button, 'medium', { intent: 'primary', appearance: 'nope' }));
    throws('an undeclared state throws', () => figmaAnatomyPlan(button, 'medium', { intent: 'primary', appearance: 'filled', state: 'nope' }));
    // The def keys paint as `{intent}.{appearance}.*`, so half a coordinate resolves nothing at all.
    throws('intent without appearance throws — half a coordinate keys no paint', () => figmaAnatomyPlan(button, 'medium', { intent: 'primary' }));
    throws('appearance without intent throws', () => figmaAnatomyPlan(button, 'medium', { appearance: 'filled' }));

    // A skinned plan, read part by part. `target`/`text`/`slot` each take paint by KIND, so these
    // three also assert the projection is not keyed off Button's part names.
    const skin = (appearance: string, state?: string, intent = 'primary') =>
      figmaAnatomyPlan(button, 'medium', { leading: true, swapTarget: 'FPO-default-icon', intent, appearance, ...(state ? { state } : {}) });
    const parts = (p: AnatomyPlan) => ({
      box: p.root.paints ?? {},
      ink: (p.root.children.find((c) => c.name === 'label')!.paints ?? {}),
      // The leading CELL, not the part named `leadingVisual` — on `state=pending` an overlay stands
      // in that cell instead (#536 item 2), and this helper asserted the part name. `skin()` sets
      // leading only, so children are [leading cell, label].
      icon: p.root.children[0].descendantFills,
    });

    const filledRest = parts(skin('filled'));
    ok(filledRest.box.fills === figmaVarName(button.tokens['primary.filled.fill']), `anatomy/paint: the target box takes the rest fill (${filledRest.box.fills})`);
    ok(!filledRest.box.strokes, 'anatomy/paint: `filled` keys no border, so the box carries no stroke — an unfilled slot, not a dropped binding');
    ok(filledRest.ink.fills === figmaVarName(button.tokens['primary.filled.label']), 'anatomy/paint: the text part takes label ink');
    // The ink lands on the VECTORs inside the instance, not on the instance's own fills — an instance
    // fill paints a square behind the glyph. Its own field for exactly that reason.
    ok(filledRest.icon === figmaVarName(button.tokens['primary.filled.icon']), 'anatomy/paint: icon ink rides `descendantFills` (the vector inside the instance), not the instance\'s own fills');
    ok(!skin('filled').root.children.find((c) => c.name === 'leadingVisual')!.paints, 'anatomy/paint: the slot node itself carries no paints — its fill would be a square behind the glyph');

    // State is a SUFFIX and it is tried first; the unqualified key is the rest value, so a state that
    // does not restyle a part correctly falls back to it. Both halves asserted — a lookup that only
    // ever tried the suffix would leave `pending` unpainted.
    ok(parts(skin('filled', 'hover')).box.fills === figmaVarName(button.tokens['primary.filled.fill.hover']), 'anatomy/paint: a state-qualified key wins over the unqualified one');
    ok(parts(skin('filled', 'pending')).box.fills === figmaVarName(button.tokens['primary.filled.fill']), 'anatomy/paint: a state the def does not restyle falls back to the rest value (a pending button\'s fill is its rest fill)');
    ok(parts(skin('filled', 'rest')).box.fills === parts(skin('filled')).box.fills, 'anatomy/paint: an explicit `rest` and an omitted state resolve identically');

    // THE GRID IS RAGGED, AND THAT IS THE DESIGN. `filled` expresses hover as a FILL CHANGE; `outline`
    // and `text` have no fill to change and express it as an OVERLAY — which in Figma is a fill on the
    // same node. One `fills` array, two token families reaching it depending on appearance. This is
    // the rule I claimed to have applied and had not: before the fix, every `outline`/`text` hover and
    // pressed rendered pixel-identical to its rest, because nothing consulted the overlay keys.
    const outlineRest = parts(skin('outline'));
    ok(!outlineRest.box.fills, 'anatomy/paint: `outline` keys no fill at rest — the box is transparent');
    ok(outlineRest.box.strokes === figmaVarName(button.tokens['primary.outline.border']), 'anatomy/paint: `outline` takes a border where `filled` takes none');
    ok(parts(skin('outline', 'hover')).box.fills === figmaVarName(button.tokens['primary.outline.overlay.hover']), 'anatomy/paint: `outline` hover reaches the box through the OVERLAY family, in the same fills slot the fill would use');
    // The overlay and the border are INDEPENDENT: a hovered outline gets both a wash AND its own
    // stroke. This assertion used to read "hover keeps the rest stroke", which passed for a reason
    // that has now gone away — the border had exactly one value, so keeping it was not a property of
    // the overlay logic at all, merely of there being nothing else to reach. #576 gave the edge
    // states, so the real claim is that BOTH slots move and neither displaces the other.
    ok(parts(skin('outline', 'hover')).box.strokes === figmaVarName(button.tokens['primary.outline.border.hover']), 'anatomy/paint: a hovered outline takes its OWN stroke — the stateful border (#576), not the rest one');
    ok(parts(skin('outline', 'hover')).box.strokes !== outlineRest.box.strokes, 'anatomy/paint: …and that stroke is genuinely different from rest, so the hover is visible on the edge as well as the wash');
    ok(!!parts(skin('outline', 'hover')).box.fills && !!parts(skin('outline', 'hover')).box.strokes, 'anatomy/paint: the overlay does not displace the border — a hovered outline carries both a wash and a stroke');
    const textRest = parts(skin('text'));
    ok(!textRest.box.fills && !textRest.box.strokes, 'anatomy/paint: `text` keys neither fill nor border — a ghost button is genuinely unpainted at rest');
    ok(parts(skin('text', 'hover')).box.fills === figmaVarName(button.tokens['primary.text.overlay.hover']), 'anatomy/paint: `text` hover paints its overlay too');

    // `disabled` is cross-cutting over INTENT (docs/20 §7) — one treatment, so the lookup switches
    // namespace rather than falling back within the interactive one. A disabled destructive button
    // must not tint toward red.
    const disFilled = parts(skin('filled', 'disabled'));
    ok(disFilled.box.fills === figmaVarName(button.tokens['disabled.fill']), 'anatomy/paint: disabled switches to the cross-cutting namespace');
    ok(parts(skin('filled', 'disabled', 'destructive')).box.fills === disFilled.box.fills, 'anatomy/paint: disabled does NOT tint by intent — destructive and primary land on the same gray');
    // But cross-cutting over intent is NOT cross-cutting over appearance, and this is the second bug
    // the grid dump caught. `disabled.fill` and `disabled.border` are keyed unconditionally, so
    // applying them blind gave `text` a gray box and a border it never had — a disabled ghost button
    // rendering as a filled one. A disabled STRUCTURAL paint applies only where the appearance has
    // that structure at rest; ink is unconditional, because every appearance has ink.
    ok(!disFilled.box.strokes, 'anatomy/paint: `filled` disabled grows no border — it had none at rest (bug 2 of 3 from the grid dump)');
    ok(parts(skin('outline', 'disabled')).box.strokes === figmaVarName(button.tokens['disabled.border']) && !parts(skin('outline', 'disabled')).box.fills,
      'anatomy/paint: `outline` disabled takes the disabled BORDER and still no fill — structure follows the appearance, not the state');
    const disText = parts(skin('text', 'disabled'));
    ok(!disText.box.fills && !disText.box.strokes, 'anatomy/paint: `text` disabled stays unpainted — no gray box on a ghost button (bug 3 of 3)');
    ok(disText.ink.fills === figmaVarName(button.tokens['disabled.label']) && disText.icon === figmaVarName(button.tokens['disabled.icon']),
      'anatomy/paint: disabled INK is unconditional — every appearance has ink even when it has no structure');

    // Paints resolve against the SAME variable namespace as `bound`, so they must ride
    // `planBoundVars` — anything else silently exempts every paint from the emit cross-check above.
    ok(planBoundVars(skin('filled').root).includes(filledRest.box.fills!), 'anatomy/paint: paints ride planBoundVars — they share the variable namespace, so the emit gate sees them');
    ok(planPaintVars(skin('filled').root).length === 3 && planPaintVars(lead.root).length === 0, 'anatomy/paint: planPaintVars isolates just the paints (box + ink + icon on a filled variant)');
    // And the whole grid cross-checked against what the engine EMITS. Every intent × appearance ×
    // state, not a sample: the ragged keys mean a coordinate can resolve a variable no emitter writes.
    const gridErrs: string[] = [];
    let painted = 0;
    for (const i of button.variants.intent) for (const ap of button.variants.appearance) for (const st of button.states) {
      const p = figmaAnatomyPlan(button, 'medium', { leading: true, swapTarget: 'FPO-default-icon', intent: i, appearance: ap, state: st });
      if (planPaintVars(p.root).length === 0) gridErrs.push(`${i}/${ap}/${st} resolved NO paints at all`);
      else painted++;
      gridErrs.push(...planBindingErrors(p, emitted, emittedStyles, emittedEffects));
    }
    ok(gridErrs.length === 0, `anatomy/paint: every variant in the grid paints, and every paint variable is emitted (${painted} variants)${gridErrs.length ? ` — ${[...new Set(gridErrs)].slice(0, 4).join('; ')}` : ''}`);

    // The payload must APPLY the paints, through the FOURTH API shape. `setBoundVariableForPaint`
    // RETURNS a new paint rather than mutating the node, so the result has to be assigned back into a
    // fills/strokes ARRAY — forgetting the assignment is a no-op that throws nothing.
    const paintJs = planToPluginJs(skin('outline', 'hover'));
    ok(/figma\.variables\.setBoundVariableForPaint\(/.test(paintJs), 'anatomy/paint: the payload binds paints through setBoundVariableForPaint');
    ok(!/setBoundVariable\(\s*['"](fills|strokes)/.test(paintJs), 'anatomy/paint: the payload never tries setBoundVariable for fills/strokes — a paint is an array entry, not a property, so that API does not exist');
    ok(/node\.fills=\[/.test(paintJs) && /node\.strokes=\[/.test(paintJs), 'anatomy/paint: the returned paint is assigned BACK into the array — the setter does not mutate the node');
    // A stroke variable with no strokeWeight binds correctly and renders as no border at all. Matched
    // as the ASSIGNMENT, not the word: the payload's own comment says "strokeWeight", so
    // `includes('strokeWeight')` passed with the assignment deleted — a substring check against a
    // string that carries prose about itself tests the prose.
    ok(/node\.strokeWeight=/.test(paintJs), 'anatomy/paint: a bound stroke gets a weight — otherwise the border binds and paints nothing visible');
    ok(paintJs.includes("x.type==='VECTOR'"), 'anatomy/paint: icon ink is applied to the VECTORs inside the instance, not to the instance');
    // Read back from the ARRAY, not the node: a paint binding lives on the paint object, so
    // `node.boundVariables.fills` is not where it is — the read-back would silently always pass.
    ok(paintJs.includes('arr[0].boundVariables.color') && paintJs.includes('DISCARDED (paint set'),
      'anatomy/paint: paints read back off the paint object in the array — `node.boundVariables.fills` is the wrong place and would always look clean');

    // The component NAME is the variant COORDINATE — and ONLY the coordinate. `combineAsVariants`
    // derives axes from these names, so `key=value, key=value` is a wire format between one paste and
    // the component set the next step builds, not cosmetics. (The format changed under this PR and no
    // existing test noticed until it was given these.)
    ok(planComponentName(skin('filled', 'hover')) === 'intent=primary, appearance=filled, size=medium, state=hover, leading=true, trailing=false',
      `anatomy/paint: the component name is a Figma variant coordinate (${planComponentName(skin('filled', 'hover'))})`);
    ok(planComponentName(lead) === 'size=medium, leading=true, trailing=false', `anatomy/paint: a structure-only plan names only the axes it has (${planComponentName(lead)})`);
    // NO `button/` PREFIX, measured live rather than assumed: Figma does not strip a slash prefix
    // before parsing axes — it folds it into the FIRST AXIS KEY, so a set built from
    // `button/intent=primary, …` comes back with a property literally named `button/intent`. The
    // component's identity belongs on the SET; its members carry only their coordinate.
    ok(!planComponentName(skin('filled')).includes('/'), 'anatomy/paint: a member name carries NO slash prefix — Figma folds one into the first axis key, deriving `button/intent` instead of `intent`');
    ok(!planComponentName(lead).includes('/'), 'anatomy/paint: the structure-only name is prefix-free too — a lone component pasted today may be combined tomorrow');
    ok(planToPluginJs(skin('filled', 'hover')).includes('state=hover'), 'anatomy/paint: the coordinate reaches the payload — the axes have to be in the pasted name for combineAsVariants to find them');

    // ── THE SET: 21 variants combined into one COMPONENT_SET (#487 steps 4–5) ────────────────────
    const grid = button.variants.appearance.flatMap((ap) => button.states.map((st) =>
      figmaAnatomyPlan(button, 'medium', { leading: true, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: ap, state: st })));
    ok(grid.length === 21, `anatomy/set: the grid is 3 appearances x 7 states (${grid.length})`);
    const setJs = planSetToPluginJs(grid);

    // ONE payload, not N. Twenty-one round trips re-resolve every variable and style in the file, and a
    // failure halfway leaves an uncombinable pile the next attempt collides with by name.
    ok((setJs.match(/getLocalVariablesAsync/g) || []).length === 1, 'anatomy/set: the variable lookup happens ONCE for the whole set, not once per variant');
    // Counted as the CALL, not the word: the payload comments on `combineAsVariants` by name, so
    // /combineAsVariants/ found two and this assertion failed on a payload that was correct. Same trap
    // the strokeWeight gate above records, hit again by the gate written to remember it.
    ok((setJs.match(/figma\.combineAsVariants\(/g) || []).length === 1, 'anatomy/set: one combineAsVariants call — the set is atomic from the caller\'s point of view');

    // ── COMMENTS ARE STRIPPED ON THE WAY OUT, and stay in the source ─────────────────────────────
    // Two halves, and BOTH are the assertion. That the payload carries no comments is only half the
    // claim — a strip pass that had accidentally been applied to the SOURCE strings, or a payload
    // rewritten to drop its explanations, would satisfy it just as well. So the source is read off disk
    // and asserted to still be heavily commented. What is being gated is the SPLIT: prose in the
    // source, none in the transport.
    const figmaSrc = readFileSync(resolve(HERE, 'anatomy-figma.ts'), 'utf8');
    const chunkJs = planSetChunks(grid, 26_000)[0].js;
    // `.trimEnd()` before splitting: every payload ends in a newline, so the final split entry is the
    // empty string and a naive blank-line count is off by one on a correct payload.
    const proseLines = (s: string) => s.trimEnd().split('\n').filter((l) => l.trimStart().startsWith('//') || l.trimStart().startsWith('*')).length;
    const blankLines = (s: string) => s.trimEnd().split('\n').filter((l) => l.trim() === '').length;
    for (const [label, js] of [['single', planToPluginJs(grid[0])], ['set', setJs], ['chunk', chunkJs]] as [string, string][])
      ok(proseLines(js) === 0 && blankLines(js) === 0,
        `anatomy/payload: the emitted ${label} payload carries no comment lines and no blank lines — 44% of a chunk's bytes were prose, duplicated into every chunk (${proseLines(js)} comment, ${blankLines(js)} blank)`);
    // Counting `*`-led JSDoc lines as well as `//`, because most of this file's prose is JSDoc and a
    // `//`-only count reads 243 where the real figure is four times that — the threshold would then be
    // measuring the wrong thing, tuned to pass rather than to detect.
    ok(proseLines(figmaSrc) > 500,
      `anatomy/payload: the SOURCE still carries its comments — the strip is an emit-time pass, not a deletion (${proseLines(figmaSrc)} comment lines)`);

    // THE STRIPPER'S OWN PRECONDITION. It removes a line whose first non-space characters are `//`,
    // which is safe for exactly one reason: such a line cannot be inside a string, a regex or a
    // template literal — unless a payload contains a MULTI-LINE template literal, in which case a
    // `//`-leading line inside it is data and deleting it corrupts the payload. No payload has one
    // today. Asserted rather than trusted, because the failure would surface at paste time, in Figma,
    // as a syntax error in a 40KB string — and the fix would be a lexer.
    for (const [label, js] of [['single', planToPluginJs(grid[0])], ['set', setJs], ['chunk', chunkJs]] as [string, string][])
      ok(!js.includes('`'),
        `anatomy/payload: the ${label} payload contains no backtick — the strip pass is only safe while no template literal spans lines (add a lexer before adding one)`);

    // THE PASS ITSELF, on crafted input. Every assertion above samples the pass's OUTPUT, and output
    // sampling is blind to the one failure that matters: a line that is simply GONE. Measured — a
    // greedier stripper (`!l.includes('//')`, which reads like a better comment stripper) deletes
    // `if(!id)continue; // ...` from the payload, a real guard, and all 1,684 assertions stayed green.
    // The result parsed, carried no comments, and had no backtick. So the two directions are asserted
    // on input whose correct answer is known, not inferred from a 25KB string.
    ok(stripPayloadComments('// gone\nkept();\n') === 'kept();\n', 'anatomy/payload: strip removes a full-line comment');
    ok(stripPayloadComments('a();\n\nb();\n') === 'a();\nb();\n', 'anatomy/payload: strip removes blank lines — they separated prose that is no longer there');
    ok(stripPayloadComments('  // indented\nkept();\n') === 'kept();\n', 'anatomy/payload: an INDENTED comment goes too — most of the payload prose is inside a block');
    ok(stripPayloadComments('kept(); // trailing\n') === 'kept(); // trailing\n',
      'anatomy/payload: a line with code BEFORE the // is kept ENTIRELY — the greedy version deletes `if(!id)continue;`, a real guard, and no output-sampling gate can see it');
    ok(stripPayloadComments("s=\"http://x\";\n") === "s=\"http://x\";\n", 'anatomy/payload: a // inside a string literal is not a comment and its line survives');
    ok(stripPayloadComments('a();\n/* block */\nb();\n') === 'a();\n/* block */\nb();\n',
      'anatomy/payload: a /* */ block is left alone — knowing where one ENDS needs a lexer, and the two in the payload are ~200 bytes');

    // AND IT STILL RUNS. Stripping is a text pass over a string that Figma evaluates, so "parses" is
    // the only claim worth making here and it is not implied by any assertion above: every gate in this
    // file that greps the payload is satisfied by a string that would throw on evaluation. Parsed as
    // the async function body `figma_execute` wraps it in, so top-level `await` is legal.
    const AsyncFn = Object.getPrototypeOf(async function () {}).constructor as new (body: string) => unknown;
    for (const [label, js] of [['single', planToPluginJs(grid[0])], ['set', setJs], ['chunk', chunkJs]] as [string, string][]) {
      let err = '';
      try { new AsyncFn(js); } catch (e) { err = (e as Error).message; }
      ok(err === '', `anatomy/payload: the stripped ${label} payload is still valid JS as an async function body${err && ` — ${err}`}`);
    }

    // The SHARED payload: the set path must carry byte-identical build logic to the single-component
    // path, because the single path is the one carrying the paint/binding gates above. Two copies is
    // exactly where a divergence rots unnoticed — the set would pass every offline check while pasting
    // subtly different JS. Compared as substrings of each other rather than by re-asserting each detail.
    const singleJs = planToPluginJs(grid[0]);
    const sharedBuild = singleJs.slice(singleJs.indexOf('const build=async(n)=>{'), singleJs.indexOf('\nconst root=await build('));
    ok(sharedBuild.length > 1000 && setJs.includes(sharedBuild), 'anatomy/set: the set payload embeds the SAME node builder as the single-component payload — one string, one set of gates');

    // The component's identity is on the SET; members carry only their coordinate. Both halves matter:
    // a prefix on a member becomes part of the first axis key (`button/intent`), and a set with no name
    // is an unfindable `Component Set 1`.
    ok(setJs.includes('set.name="button"'), 'anatomy/set: the component name lands on the SET');
    ok(!/"name":"button\//.test(setJs), 'anatomy/set: no member name is prefixed — that prefix would be absorbed into the first axis key');

    // Offline REFUSALS. Both are conditions Figma either accepts to produce something unusable, or
    // fails on only after twenty-one loose components are already in the file.
    const refuses = (label: string, re: RegExp, plans: AnatomyPlan[]) => {
      let msg = '';
      try { planSetToPluginJs(plans); } catch (e) { msg = (e as Error).message; }
      ok(re.test(msg), `anatomy/set: ${label}${re.test(msg) ? '' : ` — got '${msg}'`}`);
    };
    refuses('an empty plan list is refused', /no plans/, []);
    refuses('a heterogeneous set is refused offline — mixing a structure-only plan in would give some variants a `state` and not others', /same variant axes/, [grid[0], lead]);
    refuses('two plans with the same coordinate are refused — the set would carry duplicate variants', /share a component name/, [grid[0], grid[0]]);
    // A plan from a DIFFERENT COMPONENT, which neither guard above can see: both reason about
    // `planComponentName`, and that name carries no component by design (a slash prefix would be
    // absorbed into the first axis key). So a foreign plan has the same axis shape and a distinct
    // coordinate — it passes both, and `set.name` takes `plans[0].component`, so it is named after
    // whichever plan came first while the rest vanish into it. Built by re-`id`ing the real def rather
    // than hand-rolling a plan, because the point is that a genuine second component collides: the
    // axis keys are identical, so nothing about the shape distinguishes them. Measured before the
    // guard existed — `[button, chip]` returned a payload with `set.name="button"` and the chip inside.
    refuses('a plan from another component is refused — same axis shape, distinct coordinate, so neither guard above sees it',
      /same component — got 'button' and 'chip'/,
      [grid[0], figmaAnatomyPlan({ ...button, id: 'chip' }, 'medium', { leading: true, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: 'filled', state: 'hover' })]);

    // GRID PLACEMENT is part of the deliverable. `combineAsVariants` PRESERVES positions, so appending
    // every root without one produced a set 21 variants DEEP and one button tall — every binding
    // correct, `misses` empty, axes clean, and unusable. Found live; gated here.
    const cells: Array<{ name: string; row: number; col: number; group: string }> =
      JSON.parse(setJs.slice(setJs.indexOf('['), setJs.indexOf('];\n') + 1));
    ok(new Set(cells.map((c) => `${c.row},${c.col}`)).size === 21, 'anatomy/set: every variant gets its OWN grid cell — combineAsVariants preserves positions, so a shared one stacks them invisibly');
    ok(new Set(cells.map((c) => c.row)).size === 3 && new Set(cells.map((c) => c.col)).size === 7,
      'anatomy/set: the grid is appearance-down by state-across — the same table the color layer was verified against');
    // Only VARYING axes get a dimension: `size` has one value here, so it is not a row of one.
    ok(cells.every((c) => c.group === 'size=medium, leading=true, trailing=false'),
      'anatomy/set: all 21 share one FOOTPRINT COHORT — state and appearance must not change the measured box, only size and slot fill may');

    // The three LIVE read-backs. Each closes a failure that every other check in the payload is blind
    // to, and each was written because the live paste hit it.
    // Anchored on the COMPARISON, not the message. Matching `/footprint -> /` passed with the
    // surrounding condition replaced by `if(false)`: the report string is still in the payload, so the
    // gate proved a message exists and nothing about whether it can ever be emitted. Third instance of
    // this shape today (see the strokeWeight and combineAsVariants notes) — a check that greps a
    // generated string for the words describing a behavior tests the words.
    ok(setJs.includes('componentPropertyDefinitions'), 'anatomy/set: the payload reads back the axes Figma actually DERIVED — a name it cannot parse is dropped silently');
    ok(/if\(seen\.has\(pos\)\)coincident\.push\(/.test(setJs), 'anatomy/set: coincident variants are reported — a perfectly-combined stack is invisible to the binding checks');
    ok(/if\(first\.box!==box\)footprint\.push\(/.test(setJs), 'anatomy/set: footprint drift is reported — an outline variant 2px wider than its filled sibling breaks a row of buttons and both variants are individually correct');
    // BORDER-BOX. Figma's `strokesIncludedInLayout` defaults to ADDING the stroke to the auto-layout
    // size; left alone, outline measured 62 where filled measured 60. It surfaced on the hug axis only —
    // the bound (fixed) height absorbed the same 2px in silence.
    ok(/strokesIncludedInLayout=false/.test(setJs), 'anatomy/set: strokes are excluded from layout — otherwise swapping `appearance` moves the footprint, which is the one thing a variant axis must not do');

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

    // The ABSOLUTE kind's six rules (#536 item 3). Each one is a field that would otherwise validate
    // clean and project to NOTHING, which is the class of defect the spinner's missing `when` was — a
    // def author reads the def, believes the ring is 16px or focus-only or the hit target, and the
    // projection has silently dropped the claim. Caught on the day the kind ships rather than months
    // later, which is the whole argument for putting them in the validator instead of a doc comment.
    const ring = (patch: Record<string, unknown>) => (x: AnatomyDef): AnatomyDef =>
      ({ ...x, parts: { ...x.parts, focusRing: { ...x.parts.focusRing, ...patch } as AnatomyDef['parts'][string] } });
    broke('an absolute part with no `when` fails — nothing could project it', /must declare the state it appears in/, ring({ when: undefined }));
    broke('an absolute part whose `when` is not a state fails', /is not one of states/, ring({ when: 'nope' }));
    broke('an absolute part nominating no component to nest fails — the alternative is N-way duplication', /nominates no component to nest/, ring({ nests: undefined }));
    broke('an absolute part with no `inset` fails — a ring flush against the border is WCAG 1.4.11', /binds no 'inset'/, ring({ inset: undefined }));
    // Not caught by the single-target check above, which counts targets: one absolute target is still
    // exactly one, and it owns no hit area at all.
    broke('an absolute part claiming role `target` fails — a part outside the flow owns no hit area', /owns no hit area/, ring({ role: 'target' }));
    broke('an absolute part binding `size` fails — it is sized by its parent, so a size would be dropped silently', /is sized by its parent/, ring({ size: 'icon.size.{size}' }));
    broke('an absolute part declaring children fails — Figma does not accept appends into an instance', /does not accept appends into an instance/, ring({ children: ['label'] }));
    // And the two placement rules, which are about the FIELDS rather than the kind: `inset` and `nests`
    // on anything else are as meaningless as `gap` on a text part, and for the same reason — the
    // projection reads them only under the absolute branch.
    broke('`inset` on a non-absolute part fails', /inset/, (x) => ({ ...x, parts: { ...x.parts, label: { ...x.parts.label, inset: 'ring-offset' } } }));
    broke('`nests` on a non-absolute part fails', /nests/, (x) => ({ ...x, parts: { ...x.parts, label: { ...x.parts.label, nests: 'focus-ring' } } }));

    // ---- the payload EXECUTED, not grepped ------------------------------------------------------
    // Every other assertion in this block reads the payload as text, and that is the weakness three
    // gates have now been caught by: the string documents itself, so grepping it for the words that
    // describe a behavior tests the words. So run it. A stub Figma with an EMPTY variable set is the
    // realistic failure — token passes not run, or one variable renamed — and it is the case where
    // `misses[]` has to be trustworthy, because this whole design rests on it being the only channel.
    type PayloadResult = { misses: string[]; properties?: string[]; refs?: number; wiredMembers?: number; axes?: string[]; variants?: number; added?: number; size?: [number, number]; set?: string | null; chunk?: number; of?: number };
    // A PAGE that outlives one run, for the CHUNKED path only (`opts.page`). Every other caller passes
    // nothing and gets a fresh empty page, exactly as before — but a chunked paste's whole premise is
    // that call N finds what call N-1 left in the file, so a stub that forgets between runs cannot
    // exercise it at all. Handing the same object to several `runPayload` calls models the one thing
    // separate `figma_execute` calls actually share: the document.
    type StubPage = { children: Record<string, unknown>[] };
    /** `fileNodes` is #681's half: what the file holds under a name at a type the COMPONENT criteria
     *  search does not match — a COMPONENT_SET, an INSTANCE, a FRAME. `comps` alone could only express
     *  "present as a component" and "absent", which is the distinction the defect lived inside. */
    type StubFileNode = { name: string; type: 'COMPONENT_SET' | 'INSTANCE' | 'FRAME'; variants?: string[] };
    type StubOpts = { vars?: string[]; styles?: string[]; comps?: string[]; page?: StubPage; insetValue?: unknown; fileNodes?: StubFileNode[] };
    // The stub is built by its OWN function rather than inline in `runPayload` for one reason: the
    // parity gate at the end of this block drives the PLUGIN executor (`applyComponentPlan`) against
    // the same host model the paste payload runs on. Two executors compared against two different
    // stubs would be comparing the stubs (docs/34); one stub, two drivers is the comparison worth
    // making. Nothing else about it moved.
    const makeFigmaStub = (opts: StubOpts = {}) => {
      const names = new Set(opts.vars ?? []);
      const page = opts.page;
      // Members LEAVE the page when they join a set, as they do live. Without this the page keeps every
      // loose component too, and `set.children` and the page would disagree about who owns what — which
      // is the state a re-paste's skip-by-name check reads.
      const takeFromPage = (kids: Record<string, unknown>[]) => {
        if (!page) return;
        for (const k of kids) { const i = page.children.indexOf(k); if (i >= 0) page.children.splice(i, 1); }
      };
      // `resolveForConsumer` because `x`/`y` take no binding, so the absolute inset is read as a VALUE and
      // written as a number. Modeled to return one, and deliberately NOT the raw `valuesByMode` entry:
      // `focus/ring/offset` is itself an alias to a dimension primitive, so the raw map hands back a
      // VARIABLE_ALIAS object and the payload would write `NaN` positions. 2 is the real NB value.
      // A NUMERIC VALUE per variable, deterministic from the name, and non-zero — which is the half that
      // matters. `width` above is fixed at its bound variable's value, so a stub handing back nothing
      // leaves every node measuring 0 and the ring's `parent + 2 × inset` arithmetic unfalsifiable (see
      // the `width` note). The particular numbers are arbitrary; that they DIFFER between names is not,
      // since equal values would let a payload bind the wrong variable and still measure right.
      const varValue = (name: string) => 8 + ([...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 7) * 4;
      const mkVar = (name: string) => ({ id: `V:${name}`, name, value: varValue(name), resolveForConsumer: () => ({ value: opts.insetValue ?? 2 }) });
      // Records the binding the way real Figma does — into `boundVariables` — so the read-back sees
      // what it would see live. A node that is NOT bound stays absent from it, which is the state the
      // read-back is meant to report.
      const mkNode = (type: string): Record<string, unknown> => {
        const node: Record<string, unknown> = {
          type, name: '', boundVariables: {} as Record<string, unknown>,
          // #682: the aspect-ratio lock STARTS ENGAGED, and only `unlockAspectRatio()` releases it — which
          // is what makes the payload's unlock load-bearing rather than decorative. A stub that started
          // unlocked would pass whether the payload called it or not. `_unlocks` counts the calls so the
          // gate can distinguish "unlocked" from "never asked". Mirrors the plugin shim deliberately: the
          // parity gate compares the two executors, so a stub modelling a different Figma would make that
          // comparison meaningless.
          _aspectLocked: true, _unlocks: 0,
          fills: [], strokes: [], children: [] as unknown[],
          // BORDER-BOX modeled, because the FOOTPRINT read-back has nothing to measure otherwise.
          // Figma's `strokesIncludedInLayout` defaults to ADDING the stroke to an auto-layout frame's
          // hug axis, so an outlined member measures 2px wider than a filled one that shares its group
          // — the exact #503 defect, and the only realistic way this set drifts. A stub with a constant
          // width lets `footprint` be deleted with a green suite, since every member measures the same
          // no matter what the payload does. `strokeWeight` starts at 0 so the payload's
          // `if(!node.strokeWeight)` default fires, as it does live.
          ...(type === 'FRAME' ? { strokeWeight: 0, strokesIncludedInLayout: true } : {}),
          // FIXED-OR-HUG, plus the border-box term — Figma's actual two sizing modes rather than a
          // constant. This was `return stroked ? 2 * strokeWeight : 0` until the absolute part arrived
          // (#536 item 3), and the constant is what made the ring ungatable: a ring is sized as
          // `parent + 2 × inset`, and against a parent that measures 0 that is arithmetically
          // indistinguishable from `2 × inset` alone. `kid.resize(off*2,off*2)` — a 4x4 ring on a real
          // button, as broken as this gets — passed the ENTIRE suite green, including the geometry
          // assertion written to catch exactly it. Same lesson as the border-box note below, one level up:
          // A STUB THAT MEASURES A CONSTANT CANNOT CATCH AN ARITHMETIC ERROR, because every wrong answer
          // equals every right one. It is also why the footprint messages below read `8x0`/`6x0` rather
          // than the `2x0`/`0x0` they read before — the delta they assert is unchanged.
          //
          // A node with a BOUND width is FIXED at that variable's value; everything else HUGS its flow
          // children plus its own horizontal padding. ABSOLUTE children are excluded from the hug, as
          // they are live — a ring that grew its own target would be circular, and the payload's second
          // pass reads the total the first one produced.
          //
          // The border term lands on the HUG branch only, which is the #503 finding restated as a model:
          // a FIXED axis absorbs the stroke silently (the value is the value), and only a hugging axis
          // grows by it. That is why the defect was width-only on a button whose height is bound, and a
          // stub that grew both axes would misreport it as symmetric.
          // A TEXT node measures its CHARACTERS (#612), which is the third time this stub has had to stop
          // measuring a constant for the same reason. It returned 0 for text, so a hug-sized button
          // measured only its own padding — 16px at medium — and the overlay geometry it was written to
          // gate became arithmetically vacuous: `(16 - 16) / 2` is 0, so a spinner CENTERED on the button
          // and a spinner PINNED TO ITS CORNER produced identical coordinates, and the assertion passed
          // either way. 6px per character is a crude proxy for advance width and deliberately not exact:
          // what the gate needs is a label WIDER than the spinner, so the centering offset is non-zero
          // and a corner-pin is distinguishable from a center. See the `height`/border-box notes below —
          // same finding, arrived at from three different directions now.
          get width() {
            const bv = node.boundVariables as Record<string, { value?: number }>;
            const stroked = (node.strokes as unknown[]).length > 0 && node.strokesIncludedInLayout !== false;
            if (bv.width) return bv.width.value ?? 0;
            if (node.type === 'TEXT') return ((node.characters as string) || '').length * 6;
            const pad = (bv.paddingLeft?.value ?? 0) + (bv.paddingRight?.value ?? 0);
            const hug = ((node.children as Record<string, unknown>[]) ?? [])
              .filter((c) => c.layoutPositioning !== 'ABSOLUTE')
              .reduce((a, c) => a + ((c.width as number) || 0), 0);
            return pad + hug + (stroked ? 2 * (node.strokeWeight as number) : 0);
          },
          // BOTH AXES, for one reason: a claim about only one of them is half-unfalsifiable. `height` was
          // a plain `0` field, so `kid.resize(node.width+off*2, off*2)` — the ring's height ignoring its
          // target entirely — passed the geometry assertion written to catch it, because `0 + 4` and `4`
          // are the same number. The width fix alone would have shipped that. A stub models an axis or it
          // cannot gate it, and there is no such thing as gating "the ring is 2px larger on every side"
          // while measuring one side.
          get height() {
            const bv = node.boundVariables as Record<string, { value?: number }>;
            const stroked = (node.strokes as unknown[]).length > 0 && node.strokesIncludedInLayout !== false;
            if (bv.height) return bv.height.value ?? 0;
            const pad = (bv.paddingTop?.value ?? 0) + (bv.paddingBottom?.value ?? 0);
            const flow = ((node.children as Record<string, unknown>[]) ?? []).filter((c) => c.layoutPositioning !== 'ABSOLUTE');
            // Max, not sum: the row is HORIZONTAL, so the cross axis hugs the tallest child.
            return pad + flow.reduce((a, c) => Math.max(a, (c.height as number) || 0), 0) + (stroked ? 2 * (node.strokeWeight as number) : 0);
          },
          // Modeled as a plain settable field, so a payload that never writes it leaves `''` — which is
          // the empty-label set #510 shipped, and the state the read-back has to be able to report.
          characters: '',
          componentPropertyReferences: null as Record<string, string> | null,
          // The VALUE is recorded alongside the id, because a bound dimension is what SIZES the node live
          // — `width` above reads it. Without this the binding is a bookkeeping entry and every node
          // measures the same, which is the constant-stub trap the `width` note records.
          unlockAspectRatio() { node._aspectLocked = false; (node._unlocks as number)++; },
          // THE EVICTION IS MODELLED (#682): while the aspect ratio is LOCKED, a node cannot hold two
          // independent dimension bindings — the second setter silently evicts the first, last-write-wins,
          // with no throw and nothing in `misses[]`. That is the defect the unlock prevents, so the stub
          // reproduces it rather than trusting the call count. Without this, the unlock could be deleted
          // from the payload and every geometry assertion here would still pass.
          setBoundVariable(prop: string, v: { id: string; value?: number }) {
            const bv = node.boundVariables as Record<string, unknown>;
            if (node._aspectLocked && (prop === 'width' || prop === 'height')) delete bv[prop === 'width' ? 'height' : 'width'];
            bv[prop] = { id: v.id, value: v.value };
          },
          setTextStyleIdAsync: async () => {}, setEffectStyleIdAsync: async () => {},
          // ABSOLUTE POSITIONING, modeled with its REJECTION CASE, which is the only part worth modeling.
          // Figma ignores `layoutPositioning` on a child whose parent is not an auto-layout frame, and it
          // ignores it SILENTLY — so a stub that simply stored the value would let the payload's read-back
          // be deleted with a green suite, which is the mistake this file has now made twice (#500's
          // `misses[]` blind spot, and #503's constant-width set). `parent` is set by `appendChild` below,
          // so the check reads the same fact the live API does.
          x: 0, y: 0,
          constraints: null as unknown,
          parent: null as Record<string, unknown> | null,
          _absolute: false,
          get layoutPositioning() {
            const p = node.parent as Record<string, unknown> | null;
            return node._absolute && p && p.layoutMode ? 'ABSOLUTE' : 'AUTO';
          },
          set layoutPositioning(v: string) { node._absolute = v === 'ABSOLUTE'; },
          // Settable dimensions, because an absolute child is sized rather than bound. Replaces BOTH
          // derived getters above for any node actually resized — which is only the ring, and only after
          // its parent's own hug is final.
          resize(w: number, h: number) {
            Object.defineProperty(node, 'width', { configurable: true, value: w, writable: true });
            Object.defineProperty(node, 'height', { configurable: true, value: h, writable: true });
          },
          appendChild(c: Record<string, unknown>) { c.parent = node; (node.children as unknown[]).push(c); },
          // Walks descendants for real, rather than returning `[]`. The set payload finds each part by
          // NAME inside every member to wire its property reference, so a stub that finds nothing would
          // let the whole wiring loop no-op and every assertion below pass on an empty set of writes.
          findAll(pred?: (n: unknown) => boolean) {
            const all: unknown[] = [];
            const walk = (n: Record<string, unknown>) => {
              for (const c of (n.children as Record<string, unknown>[]) ?? []) { all.push(c); walk(c); }
            };
            walk(node);
            return pred ? all.filter(pred) : all;
          },
          findOne(pred: (n: unknown) => boolean) { return (node.findAll as (p?: unknown) => unknown[])(pred)[0] ?? null; },
        };
        return node;
      };
      const figmaStub = {
        variables: {
          getLocalVariablesAsync: async () => [...names].map(mkVar),
          // Real Figma RETURNS a new paint rather than mutating — modeled, because the caller's
          // assignment back into the array is the thing under test elsewhere in this block.
          setBoundVariableForPaint: (p: object, field: string, v: { id: string }) =>
            ({ ...p, boundVariables: { [field]: { id: v.id } } }),
        },
        // `fontName` on every style, because the payload loads the STYLE'S font before writing text —
        // `setTextStyleIdAsync` pulls in a family/style pair that need not be what `createText` starts on.
        getLocalTextStylesAsync: async () => (opts.styles ?? []).map((name) => ({ id: `S:${name}`, name, fontName: { family: 'Inter', style: 'Semi Bold' } })),
        loadFontAsync: async () => {},
        getLocalEffectStylesAsync: async () => [],
        loadAllPagesAsync: async () => {},
        // A COMPONENT the payload can instantiate, so the swap path is exercised rather than always
        // degrading to the placeholder frame. `createInstance` returns a node with a VECTOR inside,
        // because the icon-ink paint routes to the vector and not to the instance.
        // `id` as well as `name`, because an INSTANCE_SWAP property's default must be a node ID —
        // the component key, `''`, `null` and `undefined` are all refused by the live API.
        root: {
          // The CRITERIA search: components only. A COMPONENT_SET contributes its CHILDREN under their
          // variant coordinates and never its own name — which is #681 exactly, and why a `focus-ring`
          // sitting in the file was reported absent.
          findAllWithCriteria: () => [
            ...(opts.comps ?? []),
            ...(opts.fileNodes ?? []).flatMap((f) => (f.type === 'COMPONENT_SET' ? f.variants ?? [] : [])),
          ].map((name, i) => ({
            name, id: `73:${37 + i}`,
            createInstance: () => { const inst = mkNode('INSTANCE'); const vec = mkNode('VECTOR'); inst.findAll = () => [vec]; return inst; },
          })),
          // The NAME search, every type — what the payload's diagnostic pass asks on the failure path
          // (#681). A different question from the one above, and the whole reason the miss can now name
          // what it found, so the stub has to be able to answer both differently.
          findAll: (predicate: (n: { name: string; type: string }) => boolean) => [
            ...(opts.comps ?? []).map((name) => ({ name, type: 'COMPONENT' })),
            ...(opts.fileNodes ?? []).map((f) => ({ name: f.name, type: f.type })),
          ].filter(predicate),
        },
        createText: () => mkNode('TEXT'), createFrame: () => mkNode('FRAME'),
        // A REAL set: it holds the members it combined, and it models `addComponentProperty` the way the
        // live API was measured to behave (#487 step 6). Four behaviors, each of which the payload has a
        // read-back for, and each of which a permissive stub would let pass silently:
        //  · non-VARIANT keys come back with a `#nodeId` SUFFIX; VARIANT keys do not
        //  · a DUPLICATE name is accepted and RENAMED (`children` → `children2`), with no throw
        //  · an `INSTANCE_SWAP` default must be a node id — `''` / a key / null are refused
        //  · `componentPropertyReferences` naming an unknown property THROWS
        combineAsVariants: (members: Record<string, unknown>[]) => {
          const set = mkNode('COMPONENT_SET');
          set.children = members;
          takeFromPage(members);
          // A SET RESIZES, and its box does NOT follow its members. Modeled because that is the whole
          // reason the chunked payload calls `resize` at all: appending a member at x=208 to a 184-wide
          // set leaves it 184 wide, with the new member outside its own box, and nothing throws. A stub
          // whose width tracked its children would let the `resize` call be deleted with a green suite.
          let w = 0, h = 0;
          Object.defineProperties(set, {
            width: { configurable: true, get: () => w },
            height: { configurable: true, get: () => h },
          });
          set.resize = (nw: number, nh: number) => { w = nw; h = nh; };
          // APPEND, which re-derives the axes from the new member's name — measured live: appending
          // `state=pressed` to a `state=rest|hover` set extends that axis rather than being ignored.
          // Guarded here too, because a node cannot be in two parents.
          set.appendChild = (c: Record<string, unknown>) => {
            (set.children as Record<string, unknown>[]).push(c);
            takeFromPage([c]);
            guardRefs({ ...set, declaredIds: set.declaredIds, findAll: () => [c, ...((c.findAll as () => unknown[])?.() ?? [])] } as Record<string, unknown>);
          };
          const defs: Record<string, { type: string; defaultValue?: unknown; variantOptions?: string[] }> = {};
          let seq = 100;
          // A GETTER, not a snapshot, for two reasons the chunked path depends on. The axes Figma derives
          // come from the member NAMES (the wire format `planComponentName` emits), so a set that gained
          // members by `appendChild` must report the wider axis — a snapshot taken at combine time would
          // report chunk 1's axes forever and the chunked payload's per-chunk axis read-back would be
          // checking nothing. And a DUPLICATE member name makes this getter THROW live ("Component set
          // has existing errors") while `addComponentProperty` keeps succeeding, which is precisely the
          // trap the payload's try/catch exists for; a stub that returned definitions anyway would let
          // that guard be deleted green.
          Object.defineProperty(set, 'componentPropertyDefinitions', {
            configurable: true,
            get: () => {
              const kids = set.children as Record<string, unknown>[];
              const names = kids.map((m) => String(m.name));
              if (new Set(names).size !== names.length) throw new Error('in get_componentPropertyDefinitions: Component set has existing errors');
              const out: Record<string, { type: string; defaultValue?: unknown; variantOptions?: string[] }> = {};
              for (const n of names)
                for (const kv of n.split(', ')) {
                  const [k, v] = kv.split('=');
                  const d = (out[k] ??= { type: 'VARIANT', variantOptions: [] });
                  if (!d.variantOptions!.includes(v)) d.variantOptions!.push(v);
                }
              return Object.assign(out, defs);
            },
          });
          set.addComponentProperty = (name: string, type: string, defaultValue: unknown) => {
            if (type === 'INSTANCE_SWAP' && typeof defaultValue !== 'string')
              throw new Error('in addComponentProperty: Property value is incompatible with component property type');
            if (type === 'BOOLEAN' && typeof defaultValue !== 'boolean')
              throw new Error('in addComponentProperty: Property value is incompatible with component property type');
            // Renamed, not refused — the behavior that makes a count-based read-back useless.
            let bare = name;
            while (Object.keys(defs).some((k) => k.split('#')[0] === bare)) bare = /\d$/.test(bare) ? bare.replace(/\d$/, (d) => String(+d + 1)) : `${bare}2`;
            const key = `${bare}#103:${seq++}`;
            defs[key] = { type, defaultValue };
            return key;
          };
          set.declaredIds = () => Object.keys(defs);
          // Called at RUN time (the payload runs after this whole closure is built), so the reference
          // guard sees the definitions this set actually holds.
          guardRefs(set);
          // Into the PAGE, so a later chunk's `findOne` can find it — and only when a page was supplied,
          // which keeps every pre-existing caller on exactly the stub it had.
          page?.children.push(set);
          return set;
        },
        createComponentFromNode: (n: unknown) => n,
        // A page a payload can SEARCH, not just append to. The chunked path finds its set here by name
        // and type, so `findOne` has to be real; a stub returning `null` would send every chunk down the
        // combine branch and build N separate sets while every assertion below still passed.
        currentPage: {
          appendChild: (c: Record<string, unknown>) => { page?.children.push(c); },
          get children() { return page?.children ?? []; },
          findOne: (pred: (n: unknown) => boolean) => (page?.children ?? []).find(pred) ?? null,
        },
      };
      // A reference naming a property that does not exist THROWS in real Figma, and that is the one
      // direction we get for free — so the stub enforces it too, on every node. Installed here rather
      // than in `mkNode` because it needs the set that owns the definitions, which does not exist yet
      // when a node is built.
      const guardRefs = (set: Record<string, unknown>) => {
        for (const n of [set, ...(set.findAll as () => Record<string, unknown>[])()]) {
          let held: Record<string, string> | null = null;
          Object.defineProperty(n, 'componentPropertyReferences', {
            configurable: true,
            get: () => held,
            set: (v: Record<string, string>) => {
              const known = (set.declaredIds as () => string[])();
              for (const id of Object.values(v ?? {}))
                if (!known.includes(id)) throw new Error(`in set_componentPropertyReferences: Could not find a component property with name: '${id}'`);
              held = v;
            },
          });
        }
      };
      return figmaStub;
    };
    const runPayload = async (payloadJs: string, opts: StubOpts = {}): Promise<PayloadResult> => {
      const figmaStub = makeFigmaStub(opts);
      // `AsyncFunction` because the payload is top-level `await` by design (#478 — an async IIFE
      // returns a Promise that figma_execute drops). Constructed rather than eval'd so the payload
      // sees exactly one binding, `figma`, and nothing from this module's scope.
      const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (...a: string[]) => (f: unknown) => Promise<PayloadResult>;
      // FAILS SOFT, and this is not defensive habit — it is the trap in `review-pr.md:133`, which I
      // walked straight into: narrowing the lookup to `figma.currentPage` (a real degrade this block
      // gates against) threw inside the payload, and an uncaught throw here takes the WHOLE suite down
      // and reports zero failures rather than one. A harness that dies cannot tell you which assertion
      // it would have failed. So a payload that throws becomes a miss and the gates below judge it.
      try {
        return await new AsyncFunction('figma', payloadJs)(figmaStub);
      } catch (e) {
        return { misses: [`payload THREW -> ${(e as Error).message}`] };
      }
    };

    // Driven on a fully-SKINNED plan, so the paint read-back is in play too — that is the half the
    // review found repeating the same defect, and a structure-only plan would not exercise it.
    const runnable = skin('filled', 'hover');
    // Every name this plan reaches for, derived from the plan rather than a hand-kept list — a list
    // would drift the moment a binding is added and the "fully resolved" run would quietly stop being
    // fully resolved while still passing.
    const full = {
      vars: [...planBoundVars(runnable.root), ...planPaintVars(runnable.root)],
      styles: planTextStyles(runnable.root),
      comps: ['FPO-default-icon'],
    };
    const starved = await runPayload(planToPluginJs(runnable), { styles: full.styles, comps: full.comps });
    const phantoms = starved.misses.filter((m) => m.includes('DISCARDED'));
    // THE FIX, stated as behavior: with no variable resolving, every miss must be a resolve-miss.
    // Before this, the read-back iterated the DECLARED props (`Object.keys(n.bound)`) rather than the
    // ones actually set, so each of the 13 real causes was shadowed by a phantom claiming Figma had
    // silently discarded a write that was never attempted — pointing the reader at a Figma-internals
    // mystery when the cause was printed on the line above. `(resolved, set, not retained)` was a
    // false statement in that path, and the paint read-back repeated it verbatim.
    ok(starved.misses.length > 0 && phantoms.length === 0,
      `anatomy: with NO variable resolving, every miss is a resolve-miss — an unresolved name must not also claim Figma discarded it (${starved.misses.length} misses, ${phantoms.length} phantom)`);
    ok(starved.misses.includes('container.fills -> color/interactive/primary/fill/hover'),
      'anatomy: the real cause is reported plainly — the variable NAME that did not resolve, not a Figma-internals mystery');
    // The other direction, so the gate above cannot pass by the read-back being dead. A node whose
    // setter accepts the call and drops it is exactly what #503 built this channel for.
    const dropped = await runPayload(planToPluginJs(runnable).replace('node.setBoundVariable(prop,v);', 'void v;'), full);
    ok(dropped.misses.length > 0 && dropped.misses.every((m) => m.includes('DISCARDED (resolved, set, not retained)')),
      `anatomy: a setter that silently drops the write IS reported — the read-back is live, not decorative (${dropped.misses.length} discarded)`);
    // The paint half of the same control, because the paint read-back repeated the defect verbatim and
    // so needs its own proof of life. `setBoundVariableForPaint` RETURNS the paint; dropping the
    // assignment back into the array is the no-op that throws nothing.
    const unpainted = await runPayload(planToPluginJs(runnable).replace(/node\.fills=\[p\];/, ''), full);
    ok(unpainted.misses.some((m) => m.includes('.fills -> DISCARDED (paint set, not retained)')),
      `anatomy: a paint that resolves and is never assigned back into the array IS reported (${JSON.stringify(unpainted.misses)})`);
    // And with every name resolving and both setters honest, the channel is SILENT. This is the
    // assertion that fails if the read-back ever starts crying wolf on a correct paste — which is the
    // failure the two fixes above were about.
    const clean = await runPayload(planToPluginJs(runnable), full);
    ok(clean.misses.length === 0,
      `anatomy: a fully-resolved paste reports NOTHING — misses[] stays empty when every write landed (${JSON.stringify(clean.misses)})`);

    // ---- the ABSOLUTE part, EXECUTED (#536 item 3) -----------------------------------------------
    // The focus ring is the first part kind whose materialization can fail because of what is missing
    // from the FILE rather than from the plan, and the first that writes a resolved NUMBER instead of a
    // binding. Neither is reachable by any assertion above — `runnable` is `state=hover`, which has no
    // ring — so this block runs a focus-visible paste and then breaks it four ways. Each mutation
    // passes if the corresponding check is dead.
    {
      const ring = skin('outline', 'focus-visible');
      const ringOpts = {
        vars: [...planBoundVars(ring.root), ...planPaintVars(ring.root)],
        styles: planTextStyles(ring.root),
        comps: ['FPO-default-icon', 'focus-ring'],
      };
      const ringJs = planToPluginJs(ring);
      const ringRun = await runPayload(ringJs, ringOpts);
      ok(ringRun.misses.length === 0,
        `anatomy/ring: a focus-visible paste with the shared component present runs CLEAN${ringRun.misses.length ? ` — ${JSON.stringify(ringRun.misses)}` : ''}`);
      // `appearance=outline` is the coordinate chosen deliberately: it is the one that made #536 item 3
      // visible, because its own border is the paint a ring drawn on the target would have collided with.
      // A clean run here is the claim that the ring is a SEPARATE node, not a contended stroke.
      ok(planPartNames(ring.root).includes('focusRing') && !planPartNames(skin('outline', 'hover').root).includes('focusRing'),
        `anatomy/ring: the ring is a part of the focus-visible plan and of NO other state's — 'when' is what gates it, so a ring on every row would be as wrong as a ring on none (${planPartNames(ring.root).join(', ')})`);

      const mutateRing = async (label: string, from: string, to: string, want: RegExp) => {
        const mutated = ringJs.replace(from, to);
        ok(mutated !== ringJs, `anatomy/ring: the mutation for '${label}' actually applied to the payload`);
        const r = await runPayload(mutated, ringOpts);
        ok(r.misses.some((m) => want.test(m)), `anatomy/ring: ${label}${r.misses.some((m) => want.test(m)) ? '' : ` — got ${JSON.stringify(r.misses)}`}`);
      };
      // THE MISSING SHARED COMPONENT — the failure mode the nest-rather-than-author decision bought, and
      // the one that must NOT degrade quietly. Produced by starving the file rather than by editing the
      // payload, because that is how a designer produces it: paste the button into a file where
      // `focus-ring` was never published.
      const noRing = await runPayload(ringJs, { ...ringOpts, comps: ['FPO-default-icon'] });
      ok(noRing.misses.some((m) => /focusRing\.nestTarget -> focus-ring \(not in this file/.test(m)),
        `anatomy/ring: an unpublished shared component is REPORTED (${JSON.stringify(noRing.misses)})`);
      // And NOTHING is built in its place — read off the BUILT TREE, not off `parts`, which is a constant
      // `JSON.stringify`d into the payload from the plan and is therefore identical whether the node built
      // or not. This is the half that distinguishes it from INSTANCE_SWAP, whose miss degrades to a
      // placeholder frame on purpose: an unstroked frame where a ring belongs is invisible, so it would
      // read as a ring that pasted fine.
      const starvedPage: StubPage = { children: [] };
      await runPayload(ringJs, { ...ringOpts, comps: ['FPO-default-icon'], page: starvedPage });
      const starvedKids = ((starvedPage.children[0] as Record<string, unknown>).children as Record<string, unknown>[]).map((c) => c.name);
      ok(!starvedKids.includes('focusRing') && starvedKids.includes('label'),
        `anatomy/ring: no node is built in the missing ring's place, and the rest of the tree still builds — a missing ring is a precise failure, not a failed paste and not an invisible box (${JSON.stringify(starvedKids)})`);
      ok(noRing.misses.length === 1,
        `anatomy/ring: exactly ONE miss — the ring's absence must not cascade into resolve failures for the siblings that built fine (${JSON.stringify(noRing.misses)})`);

      // ---- #681: THE MISS NAMES WHAT IT FOUND, on the PASTE path too ----------------------------
      // The live 648-variant build reported 108 identical misses saying `focus-ring` was "not in this
      // file". It was in the file, as a component SET: the criteria search matches `ComponentNode` and
      // never `ComponentSetNode`, so the set's own name never entered the lookup while its children were
      // there under their variant coordinates. Three file states and a genuinely absent node all produced
      // one string, and its one piece of advice was wrong for three of the four.
      //
      // Gated HERE as well as in the plugin suite because the two executors carry the same message through
      // different mechanisms — the plugin imports `nestMissAdvice`, the payload interpolates it at emit
      // time — so one gate could pass while the other path was silently wrong. The shared function is what
      // keeps the WORDING from drifting; these are what keep the BEHAVIOR from drifting.
      const ringFound = async (node: StubFileNode | undefined): Promise<string> => {
        const r = await runPayload(ringJs, { ...ringOpts, comps: ['FPO-default-icon'], fileNodes: node ? [node] : [] });
        return r.misses.find((m) => m.indexOf('focusRing.nestTarget') >= 0) ?? '(no miss reported)';
      };
      const asSet = await ringFound({ name: 'focus-ring', type: 'COMPONENT_SET', variants: ['state=default', 'state=error'] });
      const asInstance = await ringFound({ name: 'focus-ring', type: 'INSTANCE' });
      const asFrame = await ringFound({ name: 'focus-ring', type: 'FRAME' });
      const absent = await ringFound(undefined);
      // Reachability, first: the criteria search really is blind to a set, or every claim below is vacuous.
      const setStub = makeFigmaStub({ ...ringOpts, comps: ['FPO-default-icon'], fileNodes: [{ name: 'focus-ring', type: 'COMPONENT_SET', variants: ['state=default'] }] });
      const criteriaNames = (setStub.root.findAllWithCriteria() as { name: string }[]).map((c) => c.name);
      ok(!criteriaNames.includes('focus-ring') && criteriaNames.includes('state=default'),
        `anatomy/ring #681 reachable: a COMPONENT search returns the set's MEMBERS and not the set (${JSON.stringify(criteriaNames)})`);
      ok(new Set([asSet, asInstance, asFrame, absent]).size === 4,
        `anatomy/ring #681: four file states, four DISTINCT messages — the miss names what was found rather than always claiming absence`);
      ok(asSet.indexOf('COMPONENT_SET') >= 0 && asSet.indexOf('not in this file') < 0,
        `anatomy/ring #681: a SET is named as one, not called absent (${asSet})`);
      ok(asInstance.indexOf('INSTANCE') >= 0 && asInstance.indexOf('main component') >= 0,
        `anatomy/ring #681: an INSTANCE — what duplicating a variant out of a set produces — is named, and pointed at the main (${asInstance})`);
      ok(asFrame.indexOf('not a component') >= 0, `anatomy/ring #681: a FRAME of that name is named as not-a-component (${asFrame})`);
      ok(absent.indexOf('not in this file') >= 0, `anatomy/ring #681: the genuinely absent case keeps its original message verbatim (${absent})`);
      // And the payload still DROPS the ring in all four cases rather than nesting a guess. Diagnosis only:
      // which variant of a set to nest is #681's open policy question, left to the owner.
      const setPage: StubPage = { children: [] };
      await runPayload(ringJs, { ...ringOpts, comps: ['FPO-default-icon'], fileNodes: [{ name: 'focus-ring', type: 'COMPONENT_SET', variants: ['state=default'] }], page: setPage });
      const setKids = ((setPage.children[0] as Record<string, unknown>).children as Record<string, unknown>[]).map((c) => c.name);
      ok(!setKids.includes('focusRing') && setKids.includes('label'),
        `anatomy/ring #681: a SET of that name still builds NOTHING in the ring's place — the message diagnoses, it does not substitute a variant (${JSON.stringify(setKids)})`);

      // ---- #682: the payload's unlock is exercised, not just grepped ----------------------------
      // `unlockAt` above greps the emitted STRING; this asserts the RUN. The stub's nodes start
      // aspect-locked and its `setBoundVariable` evicts the opposite dimension while locked, so a slot
      // holding both bindings is only possible if the payload really called `unlockAspectRatio()` first.
      const unlockPage: StubPage = { children: [] };
      await runPayload(ringJs, { ...ringOpts, page: unlockPage });
      const flat = (n: Record<string, unknown>): Record<string, unknown>[] =>
        [n, ...(((n.children as Record<string, unknown>[]) ?? []).flatMap(flat))];
      const pasted = (unlockPage.children as Record<string, unknown>[]).flatMap(flat);
      const bothBound = pasted.filter((n) => {
        const bv = (n.boundVariables as Record<string, unknown>) ?? {};
        return bv.width && bv.height;
      });
      ok(bothBound.length > 0,
        `anatomy #682: a pasted node holds BOTH dimension bindings at once (${bothBound.length}) — impossible unless the payload unlocked the aspect ratio before binding`);
      ok(pasted.filter((n) => (n._unlocks as number) > 0).length > 0,
        `anatomy #682: the payload called unlockAspectRatio() on the nodes it built (${pasted.filter((n) => (n._unlocks as number) > 0).length}/${pasted.length})`);
      // NEGATIVE CONTROL for the both-bindings claim above, read off the stub directly rather than through
      // the payload. Mutating `_aspectLocked: true` to `false` in `mkNode` left this whole suite green —
      // the claim passes both when the payload unlocked and when the stub never locked, which is docs/34's
      // representation-vs-detection shape. Re-engaging the lock by hand is what separates those two worlds.
      // Read off a node from the stub's own factory that the PAYLOAD never touched, so it reports the state
      // a node STARTS in — the half of the model that re-locking an existing node cannot see.
      const ctl = (makeFigmaStub({}) as unknown as { createFrame(): Record<string, unknown> }).createFrame() as
        Record<string, unknown> & { setBoundVariable(p: string, v: { id: string; value?: number }): void };
      ok(ctl._aspectLocked === true, 'anatomy #682 reachable: a fresh stub node starts aspect-LOCKED');
      ctl.setBoundVariable('width', { id: 'V:control', value: 10 });
      ctl.setBoundVariable('height', { id: 'V:control', value: 10 });
      const ctlBv = ctl.boundVariables as Record<string, unknown>;
      ok(!!ctlBv.height && !ctlBv.width,
        'anatomy #682 reachable: ...and while locked the stub really evicts the opposite axis — so the claim above is about the unlock, not about a stub that never locked');
      // THE INSET NEVER RESOLVED as a number. `resolveForConsumer` on an aliased variable hands back a
      // VARIABLE_ALIAS object, which is what reading `valuesByMode` would have produced — and writing it
      // to `x`/`y` yields NaN positions with no throw anywhere.
      const aliasInset = await runPayload(ringJs, { ...ringOpts, insetValue: { type: 'VARIABLE_ALIAS', id: 'V:dimension/2' } });
      ok(aliasInset.misses.some((m) => /focusRing\.absoluteInset -> .* not a number/.test(m)),
        `anatomy/ring: an inset that resolves to something other than a number is REPORTED rather than written as NaN (${JSON.stringify(aliasInset.misses)})`);
      // `layoutPositioning` DISCARDED — the silent rejection Figma performs when the parent is not an
      // auto-layout frame. The stub models the rejection, so gutting the write reproduces it.
      await mutateRing('an absolute child that Figma refuses to lift out of the flow IS reported',
        "kid.layoutPositioning='ABSOLUTE';", 'void 0;', /focusRing\.layoutPositioning -> DISCARDED/);
      // THE GEOMETRY, read off the built node rather than inferred from a silent run. `misses[]` cannot
      // see this: the offset math is four arithmetic writes that throw nothing and report nothing, so a
      // ring built flush against its target's bounds — the WCAG 1.4.11 failure the `inset` requirement
      // exists to prevent — pastes perfectly cleanly. Only measuring catches it.
      //
      // `page` is passed so the built tree survives the run and can be inspected; every other caller in
      // this block gets a fresh page and is unaffected.
      const ringPage: StubPage = { children: [] };
      await runPayload(ringJs, { ...ringOpts, page: ringPage });
      const built = ringPage.children[0] as Record<string, unknown>;
      const kid = ((built?.children as Record<string, unknown>[]) ?? []).find((c) => c.name === 'focusRing');
      // The size is asserted RELATIVE to the target, and the target is a non-trivial width — the stub
      // sizes each node from its bindings, so `built.width` is a real hug measurement rather than 0. That
      // is what makes `+ 4` a claim: against a 0-wide parent it would also be satisfied by a ring sized
      // from the inset alone, which is a 4x4 ring on a real button.
      ok((built.width as number) > 4,
        `anatomy/ring: the target measures something before the ring is sized against it — a 0-wide parent makes the assertion below unfalsifiable (${built?.width})`);
      ok(!!kid && kid.x === -2 && kid.y === -2 && kid.width === (built.width as number) + 4 && kid.height === (built.height as number) + 4,
        `anatomy/ring: the ring sits 2px OUTSIDE its target on every side — offset ${JSON.stringify([kid?.x, kid?.y])}, size ${JSON.stringify([kid?.width, kid?.height])} against a target of ${JSON.stringify([built?.width, built?.height])}`);
      // Lifted OUT of the flow, read back through the stub's rejection model rather than trusted.
      // A ring that takes a cell in the row pushes the label sideways at every focus.
      ok(kid?.layoutPositioning === 'ABSOLUTE' && JSON.stringify(kid?.constraints) === JSON.stringify({ horizontal: 'STRETCH', vertical: 'STRETCH' }),
        `anatomy/ring: the ring is absolutely positioned and STRETCHes with its target — a fixed-size ring detaches the moment the label changes (${JSON.stringify([kid?.layoutPositioning, kid?.constraints])})`);
      // And it is an INSTANCE of the shared component, not a frame. The distinction is invisible in the
      // geometry above — a placeholder frame would measure identically — so it gets its own read.
      ok(kid?.type === 'INSTANCE', `anatomy/ring: the ring is an INSTANCE of the shared component (${kid?.type})`);
      // The offset is not a constant in the payload. Re-run with a different brand value and the geometry
      // must follow, which is what makes `absoluteInset` a variable name rather than a frozen number in
      // the plan — the whole reason the plan stays brand-invariant and the freeze happens at paste.
      const widePage: StubPage = { children: [] };
      await runPayload(ringJs, { ...ringOpts, page: widePage, insetValue: 6 });
      const wide = ((widePage.children[0] as Record<string, unknown>).children as Record<string, unknown>[]).find((c) => c.name === 'focusRing');
      ok(wide?.x === -6 && wide?.y === -6,
        `anatomy/ring: a brand whose ring offset is 6 gets a ring at -6 — the value is READ from the variable at paste, not baked into the plan (${JSON.stringify([wide?.x, wide?.y])})`);
    }

    // ---- the CENTERED overlay, EXECUTED (#612) ----------------------------------------------------
    // The plan-level gates above prove `absoluteCenter`/`zeroOpacity` are SET. This block proves the
    // payload ACTS on them, which is a separate claim and the one that reaches a designer: the plan is
    // a JSON literal the payload can ignore in silence. Modeled on the ring's block for the same
    // reason it exists — geometry that throws nothing and reports nothing is only caught by measuring.
    {
      const pend = figmaAnatomyPlan(button, 'medium', { intent: 'primary', appearance: 'filled', state: 'pending', leading: false, trailing: false, swapTarget: 'FPO-default-icon' });
      const pendOpts = { vars: [...planBoundVars(pend.root), ...planPaintVars(pend.root)], styles: planTextStyles(pend.root), comps: ['FPO-default-icon'] };
      const pendJs = planToPluginJs(pend);
      const pendPage: StubPage = { children: [] };
      const pendRun = await runPayload(pendJs, { ...pendOpts, page: pendPage });
      ok(pendRun.misses.length === 0,
        `anatomy/pending: a label-only pending paste runs CLEAN${pendRun.misses.length ? ` — ${JSON.stringify(pendRun.misses)}` : ''}`);
      const pRoot = pendPage.children[0] as Record<string, unknown>;
      const pKids = ((pRoot?.children as Record<string, unknown>[]) ?? []);
      const spin = pKids.find((c) => c.name === 'spinner'), lbl = pKids.find((c) => c.name === 'label');
      // OUT OF FLOW, read back through the stub's rejection model. If Figma discards this the spinner
      // takes a cell and the button grows — the #612 defect, restored at paste time only.
      ok(spin?.layoutPositioning === 'ABSOLUTE' && JSON.stringify(spin?.constraints) === JSON.stringify({ horizontal: 'CENTER', vertical: 'CENTER' }),
        `anatomy/pending: the spinner is lifted out of the flow and CENTER-constrained on both axes — STRETCH would distort a round spinner (${JSON.stringify([spin?.layoutPositioning, spin?.constraints])})`);
      // THE LABEL IS STILL BUILT, still sized, and merely transparent. Read off the built tree because
      // this is precisely what `visible:false` or a dropped node would NOT give us, and neither would
      // report a miss.
      ok(lbl?.opacity === 0 && (lbl?.width as number) > 0,
        `anatomy/pending: the label is built at zero opacity and still MEASURES — a hidden or dropped label yields its cell and the button collapses instead (${JSON.stringify([lbl?.opacity, lbl?.width])})`);
      ok(spin?.opacity !== 0, `anatomy/pending: the spinner itself is fully opaque — the zero applies to the part being covered, not the coverer (${spin?.opacity})`);
      // CENTERED ON THE PARENT'S MEASURED BOX, and the parent must measure something first or the
      // centering assertion is satisfied by any square at 0,0. Same unfalsifiability trap the ring's
      // `built.width > 4` guard exists for (doc 34, shape 4).
      ok((pRoot.width as number) > (spin?.width as number),
        `anatomy/pending: the button measures wider than the spinner before the centering is asserted — otherwise the maths below is vacuous (${JSON.stringify([pRoot?.width, spin?.width])})`);
      ok(spin?.x === ((pRoot.width as number) - (spin?.width as number)) / 2 && spin?.y === ((pRoot.height as number) - (spin?.height as number)) / 2,
        `anatomy/pending: the spinner is centered on the button's box, not pinned to a corner (${JSON.stringify([spin?.x, spin?.y])} in ${JSON.stringify([pRoot?.width, pRoot?.height])})`);
      // AND IT KEEPS ITS OWN SIZE. The ring is `resize`d to its target; this must NOT be, because
      // `resize` clears the size binding and a spinner stretched to the button's width is not a
      // spinner. Invisible in the position maths above — a full-width node centers fine.
      ok(spin?.width === spin?.height && (spin?.width as number) < (pRoot.width as number),
        `anatomy/pending: the centered spinner keeps its own SQUARE size rather than being resized to its parent (${JSON.stringify([spin?.width, spin?.height])})`);
      // The two payload writes, mutated. `misses[]` covers the first; only the built tree covers the
      // second, which is why both are asserted from different sources above.
      const liftGutted = await runPayload(pendJs.replace("kid.layoutPositioning=lift;", 'void lift;'), pendOpts);
      ok(liftGutted.misses.some((m) => /spinner\.layoutPositioning -> DISCARDED/.test(m)),
        `anatomy/pending: a centered child Figma refuses to lift IS reported — silence here is a button that grows on pending (${JSON.stringify(liftGutted.misses)})`);
      const opacityGutted: StubPage = { children: [] };
      await runPayload(pendJs.replace('kid.opacity=0;', 'void 0;'), { ...pendOpts, page: opacityGutted });
      const ogLabel = ((opacityGutted.children[0] as Record<string, unknown>).children as Record<string, unknown>[]).find((c) => c.name === 'label');
      ok(ogLabel?.opacity !== 0,
        'anatomy/pending: the opacity mutation actually reaches the built label — proving the assertion above reads the payload\'s write and not a stub default');
    }

    // ---- COMPONENT PROPERTIES on the assembled set (#487 step 6) --------------------------------
    // #510's set passed every check above and shipped 21 BLANK buttons: nothing wrote `characters` and
    // nothing declared a TEXT property. So these gates are all about the two channels that failure had
    // no representation in — the placeholder copy, and the property definitions on the set.
    {
      const props = planSetProperties(grid);
      const names = props.map((p) => p.name).sort();
      // DERIVED FROM THE NODES BUILT, not from the def — the finding that changed this design. Button's
      // def declares `swaps` for BOTH visuals, and this grid is uniformly `leading=true, trailing=false`,
      // so a def-driven list would declare a `trailingVisual` property no node in the set references.
      // Figma accepts that, shows it in the panel, and it does nothing when a designer changes it.
      ok(JSON.stringify(names) === JSON.stringify(['children', 'leadingVisual']),
        `set properties: derived from the nodes BUILT, so an unbuilt slot declares nothing — got [${names.join(', ')}], and trailingVisual is correctly absent from a leading-only grid`);
      ok(props.some((p) => p.type === 'TEXT' && p.name === 'children' && p.default === 'Button'),
        'set properties: the TEXT placeholder comes from the def (`Button`), not the payload — the def is the layer a second brand overrides');
      ok(props.some((p) => p.type === 'INSTANCE_SWAP' && p.name === 'leadingVisual' && p.swapTarget === 'FPO-default-icon'),
        'set properties: the swap carries the target NAME — Figma demands a node id, which only the live file can supply');
      // Nothing to declare is a legitimate answer, not an empty-list bug: a def with no property maps
      // at all must produce zero properties rather than a set of undriven ones.
      const bareDef: ComponentDef = { ...button, figmaProperties: undefined };
      const barePlan = figmaAnatomyPlan(bareDef, 'medium', { leading: true, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: 'filled', state: 'rest' });
      ok(planSetProperties([barePlan]).length === 0 && barePlan.root.children.every((c) => c.propertyRef === undefined),
        'set properties: a def declaring no figmaProperties projects NO properties and no refs — the projection is opt-in, as it was before this step');
      // A def that declares `booleans` yields one, so the BOOLEAN path is exercised rather than merely
      // permitted by Button happening to have none.
      const boolDef: ComponentDef = { ...button, figmaProperties: { ...button.figmaProperties!, booleans: { fullWidth: 'trailingVisual' } } };
      const boolProps = planSetProperties([figmaAnatomyPlan(boolDef, 'medium', { leading: true, trailing: true, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: 'filled', state: 'rest' })]);
      ok(boolProps.some((p) => p.type === 'BOOLEAN' && p.name === 'fullWidth' && p.default === true),
        'set properties: a declared BOOLEAN projects, defaulting to `true` because the node EXISTS in the plan — an absent optional part builds no node and so declares nothing');
      // And a contradiction is refused rather than resolved by iteration order.
      const otherCopy: ComponentDef = { ...button, figmaProperties: { ...button.figmaProperties!, texts: { children: { part: 'label', default: 'Other' } } } };
      let contradiction = '';
      try { planSetProperties([grid[0], figmaAnatomyPlan(otherCopy, 'medium', { leading: true, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: 'filled', state: 'rest' })]); }
      catch (e) { contradiction = (e as Error).message; }
      ok(/declared two different ways/.test(contradiction),
        `set properties: two plans disagreeing on one property are REFUSED — a set carrying whichever the loop reached last would be silently wrong in a file${contradiction ? '' : ' (no throw)'}`);

      // The PLACEHOLDER reaches the plan and the payload.
      ok(grid[0].root.children.some((c) => c.name === 'label' && c.characters === 'Button'),
        'set properties: the placeholder rides on the TEXT NODE — the payload builds nodes and knows only what the plan tells it');
      ok(!grid[0].root.children.some((c) => c.type !== 'TEXT' && c.characters !== undefined),
        'set properties: only a TEXT node carries `characters` — the write throws on a FRAME');

      // EXECUTED, not grepped. Everything below runs the real payload against the measured stub.
      // Every name the WHOLE grid reaches for, not one coordinate's: `full` is derived from a single
      // skinned plan, and the 21 members span three appearances × seven states, so reusing it would
      // starve the run of most of its paints and drown the property misses in resolve misses.
      const fullSet = {
        vars: grid.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]),
        styles: grid.flatMap((p) => planTextStyles(p.root)),
        comps: ['FPO-default-icon', 'focus-ring'],
      };
      const setRun = await runPayload(planSetToPluginJs(grid), fullSet);
      ok(setRun.misses.length === 0, `set properties: the set payload runs CLEAN end to end${setRun.misses.length ? ` — ${JSON.stringify(setRun.misses)}` : ''}`);
      // Sorted, because the order `componentPropertyDefinitions` returns is Figma's to choose and
      // asserting it would gate a promise the API does not make.
      ok(JSON.stringify([...(setRun.properties ?? [])].sort()) === JSON.stringify(['children:TEXT', 'leadingVisual:INSTANCE_SWAP']),
        `set properties: the set comes back carrying both properties — got ${JSON.stringify(setRun.properties)}`);
      // 21 members × 2 refs, asserted as SPREAD and not just volume. `refs` alone is a push-count, so a
      // loop that wired member 0 twenty-one times would satisfy `refs === 42` with twenty members left
      // inert — the exact scenario this assertion's own message describes, since references do NOT
      // propagate and a set wired once looks correct on whichever variant is inspected first. Same shape
      // as this step's `addComponentProperty` finding: a duplicate name is renamed rather than refused, so
      // a count match proves nothing about identity. That reasoning was applied to property names and
      // initially not to refs (#513 review).
      ok(setRun.wiredMembers === 21 && setRun.refs === 42,
        `set properties: every member is wired individually — ${setRun.wiredMembers}/21 distinct members reached across ${setRun.refs} writes (2 each)`);
      // The AXIS READ-BACK still agrees, which is the regression this step nearly caused: non-variant
      // keys carry a `#nodeId` suffix and variant keys do not, so comparing all keys reported a mismatch
      // on a correct set the moment one TEXT property existed.
      ok(setRun.axes?.length === 6 && !setRun.misses.some((m) => m.includes('axes ->')),
        `set properties: the axis read-back is unaffected — it filters type === 'VARIANT', because non-variant keys come back suffixed (${JSON.stringify(setRun.axes)})`);

      // MUTATION-TESTED, one per new read-back. Each of these passes if the check is dead.
      // Returns the matching misses, so a caller that needs to assert something ABOUT the report — the
      // footprint delta below — can, rather than only that a report exists.
      const mutate = async (label: string, from: string | RegExp, to: string, want: RegExp) => {
        const js = planSetToPluginJs(grid);
        const mutated = js.replace(from as string, to);
        ok(mutated !== js, `set properties: the mutation for '${label}' actually applied to the payload`);
        const r = await runPayload(mutated, fullSet);
        const hit = r.misses.filter((m) => want.test(m));
        ok(hit.length > 0, `set properties: ${label}${hit.length ? '' : ` — got ${JSON.stringify(r.misses)}`}`);
        return hit;
      };
      // The placeholder never written — #510's exact failure, now a reported miss rather than a set a
      // designer opens and finds blank.
      await mutate('a placeholder that is never written IS reported', 'node.characters=n.characters;', 'void 0;', /characters -> DISCARDED/);
      // A reference the setter accepts and drops. Figma throws on an unknown property NAME, so this is
      // the other half — the silent-discard blind spot `misses` had for variables before #503.
      await mutate('a reference that is set and not retained IS reported', 'node.componentPropertyReferences=Object.assign', 'node.ignored=Object.assign', /ref .* -> DISCARDED/);
      // An ORPHAN — declared on the set, referenced by nothing. Skipping the wiring loop entirely is the
      // cheapest way to produce one, and it must not come back clean.
      await mutate('an ORPHAN property is reported', 'for(const r of REFS){', 'for(const r of []){', /ORPHAN/);
      // ---- the two SET-LEVEL read-backs, proven LOUD (#510 review) ----------------------------
      // #510 added `coincident` and `footprint` and gated both by grepping the generated string for the
      // words that describe them. The review mutated each one silent — `else seen.set(pos,c.name)` →
      // `else {}`, and `if(!first)sizeByGroup.set(…)` → `if(!first){}` — and the suite passed both times.
      // Executing the payload (above) did not close that: a DEAD detector on CORRECT input is correctly
      // silent, so the clean run agrees with it. Only input that MUST produce a miss can tell the
      // difference. Hence these two, which are the same proof-of-life the single-component path has had
      // since #503, owed to the set path ever since.
      //
      // The stacking bug this set shipped, asserted through the detector that is supposed to catch it.
      // The clean run above already fails if positions are dropped, but it fails by reporting SOME miss —
      // it would stay green with `coincident` gutted and something else complaining. This names it.
      await mutate('COINCIDENT members are reported — the #510 stacking bug through its own detector',
        'c.x=at(colW,col);c.y=at(rowH,row);', 'c.x=0;c.y=0;', /layout -> .* sits on top of .* at 0,0/);
      // FOOTPRINT drift, produced the way it actually happened rather than by moving a number: leaving
      // `strokesIncludedInLayout` at Figma's default adds the stroke to the hug axis, so every `outline`
      // member measures 2px wider than the `filled` members it shares a group with. That is #503's defect
      // restored, and it is invisible on the bound axis — the height absorbs the identical 2px in silence.
      // Matched on the DELTA (`(n+2) vs n`) rather than on `2x0 but 0x0`. The absolute widths were
      // literals only because the stub measured every node as a constant; it sizes from bindings now
      // (#536 item 3 — see the `width` note), so a pinned pair would be a landmark that goes stale on the
      // next size-token change while the claim it stands for — the stroke adds exactly 2px to the hug
      // axis — is unchanged. Backreference, so it is still the SAME group being compared.
      const drift = await mutate('FOOTPRINT drift is reported — an outlined member outgrows its group when the stroke joins the layout',
        "if('strokesIncludedInLayout' in node)node.strokesIncludedInLayout=false;", '',
        /footprint -> .*appearance=outline.* measures \d+x\d+ but .*appearance=filled.* measures \d+x\d+/);
      const deltas = drift.map((m) => {
        const [, w1, h1, w2, h2] = /measures (\d+)x(\d+) but .* measures (\d+)x(\d+)/.exec(m)!;
        return [+w1 - +w2, +h1 - +h2];
      });
      // 2 on the HUG axis, 0 on the FIXED one — which is the #503 finding itself, not just its magnitude.
      // The button's height is bound, so it absorbs the same 2px in silence; had both axes hugged, the
      // defect would have been symmetric and far easier to spot. Asserting the asymmetry is what keeps
      // this from passing on a stub that grew everything uniformly.
      ok(deltas.length > 0 && deltas.every(([dw, dh]) => dw === 2 && dh === 0),
        `set properties: the drift is exactly 2px on the HUGGING axis and ZERO on the bound one — the fixed height absorbs the stroke silently, which is why #503's defect was width-only (${JSON.stringify(deltas)})`);

      // A swap target that does not resolve. `''` and a component key are both REFUSED by Figma, so this
      // is not a property with a blank default — it is a property that cannot be created.
      const noIcon = await runPayload(planSetToPluginJs(grid), { ...fullSet, comps: [] });
      ok(noIcon.misses.some((m) => /property leadingVisual -> swap target FPO-default-icon/.test(m)),
        `set properties: an unresolvable swap target is reported and the property is NOT created — Figma refuses '' and the component key alike (${JSON.stringify(noIcon.misses.filter((m) => m.includes('leadingVisual')))})`);

      // ---- the BOOLEAN path through the PAYLOAD, not just the plan (#513's stated ceiling) --------
      // #513 said "the `booleans` path is unit-tested through a synthetic def but not yet exercised
      // live", and the coverage above (`boolProps`) is `planSetProperties` only — it proves the plan
      // DECLARES a BOOLEAN and nothing about whether the payload can create one. That is #510's gap in
      // miniature: a projection that is structurally right and produces an unusable file. So run it, and
      // run it against what the live API was measured to do rather than what the docs imply:
      //   · `addComponentProperty(name,'BOOLEAN',true)` is legal on a SET and returns a `#nodeId`-suffixed key
      //   · the `visible` reference retains PER MEMBER, like `characters` and `mainComponent`
      //   · an instance override genuinely hides the node — `setProperties({key:false})` → `visible === false`
      //   · and, because the container hugs, hiding the slot REFLOWS it (134 → 102 measured; a FIXED
      //     parent does not move, which is why the earlier 80-both-ways reading was not a contradiction)
      // Only the first two are the emitter's to guarantee; the last two are why the property is worth
      // declaring at all, and they were verified in a real file rather than asserted here.
      const boolGrid = (['rest', 'hover'] as const).map((state) =>
        figmaAnatomyPlan(boolDef, 'medium', { leading: true, trailing: true, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: 'filled', state }));
      const boolOpts = {
        vars: boolGrid.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]),
        styles: boolGrid.flatMap((p) => planTextStyles(p.root)),
        comps: ['FPO-default-icon', 'focus-ring'],
      };
      const boolRun = await runPayload(planSetToPluginJs(boolGrid), boolOpts);
      ok(boolRun.misses.length === 0, `set properties: a set carrying a BOOLEAN runs CLEAN end to end${boolRun.misses.length ? ` — ${JSON.stringify(boolRun.misses)}` : ''}`);
      ok(JSON.stringify([...(boolRun.properties ?? [])].sort()) === JSON.stringify(['children:TEXT', 'fullWidth:BOOLEAN', 'leadingVisual:INSTANCE_SWAP']),
        `set properties: the BOOLEAN comes back alongside the other two — got ${JSON.stringify(boolRun.properties)}`);
      // SPREAD, for the same reason as the 21-member assertion: a `visible` reference does not propagate
      // to siblings any more than `characters` does, so a set wired once shows the toggle working on
      // whichever variant a designer opens first and doing nothing on the rest.
      ok(boolRun.wiredMembers === 2 && boolRun.refs === 6,
        `set properties: all three refs are wired on every member — ${boolRun.wiredMembers}/2 distinct members across ${boolRun.refs} writes (3 each)`);
      // The `REFUSED` branch, which nothing reached until now. `addComponentProperty` throws when the
      // default does not match the type, and the payload catches it into `misses` rather than letting the
      // whole paste die — a set missing one property is recoverable, a payload that threw at byte 12781
      // leaves a half-built set in the file. Live, the two rejections are not even shaped alike: a STRING
      // default gives "Property value is incompatible with component property type" and a NUMBER gives a
      // "failed validation: … Expected boolean, received number". Both are refusals, so the read-back is
      // anchored on `REFUSED` rather than on either message.
      await (async () => {
        const js = planSetToPluginJs(boolGrid);
        const mutated = js.replace('{"name":"fullWidth","type":"BOOLEAN","default":true}', '{"name":"fullWidth","type":"BOOLEAN","default":"true"}');
        ok(mutated !== js, "set properties: the mutation for 'a BOOLEAN default of the wrong type' actually applied to the payload");
        const r = await runPayload(mutated, boolOpts);
        ok(r.misses.some((m) => /property fullWidth -> BOOLEAN REFUSED/.test(m)),
          `set properties: a BOOLEAN default of the wrong type is REPORTED, not thrown — the rest of the set still builds${r.misses.some((m) => /REFUSED/.test(m)) ? '' : ` — got ${JSON.stringify(r.misses)}`}`);
        // And it does NOT then report an orphan for the same property: `propIds` never received a key, so
        // the wiring loop skips it. A refusal reported twice reads as two defects and sends whoever
        // triages it looking for a second one.
        ok(!r.misses.some((m) => /ORPHAN/.test(m)),
          `set properties: a refused property is reported ONCE — it is never declared, so it cannot also be an orphan (${JSON.stringify(r.misses)})`);
        ok((r.properties ?? []).includes('children:TEXT') && !(r.properties ?? []).some((p) => p.startsWith('fullWidth')),
          `set properties: the refused property is ABSENT and the others survive — got ${JSON.stringify(r.properties)}`);
      })();
      // ---- CHUNKED pasting: one set across N `figma_execute` calls ------------------------------
      // #487 §6's ceiling, closed. The full Button is 756 variants ≈ 944KB against a ~45KB paste limit,
      // so the set has to accumulate across calls — and every check the single-shot payload gets for
      // free (the grid, the properties, the footprint cohort) becomes something a chunk has to derive
      // from what is already in the FILE. Run rather than grepped, and run as a SEQUENCE against one
      // shared page, because "chunk 2 finds what chunk 1 left" is the only claim that matters and a
      // single-payload harness cannot express it at all.
      {
        // The 4-state × 3-appearance × 3-intent × 3-size set — 108 variants, all of which bind cleanly
        // today. Deliberately NOT the full 756: `focus-visible` is pixel-identical to `rest` and
        // `pending` never builds its spinner, so those states would test the chunking machinery against
        // content known to be wrong. Chunking is the unproven thing; prove it against correct content.
        const states4 = ['rest', 'hover', 'pressed', 'disabled'];
        const big = button.variants.intent.flatMap((i) => button.variants.appearance.flatMap((ap) =>
          button.variants.size.flatMap((sz) => states4.map((st) =>
            figmaAnatomyPlan(button, sz, { leading: true, swapTarget: 'FPO-default-icon', intent: i, appearance: ap, state: st })))));
        ok(big.length === 108, `chunked: the exercise set is 3 intents x 3 appearances x 3 sizes x 4 bindable states (${big.length})`);
        const chunks = planSetChunks(big);
        ok(chunks.length > 1, `chunked: 108 variants do not fit one payload — ${chunks.length} chunks`);
        // THE BUDGET IS THE WHOLE POINT. An over-budget chunk is rejected by the transport AFTER its
        // predecessors have already landed, which leaves a half-built set — so this is the one property
        // that must hold before anything is pasted, and it is asserted on the MEASURED payload rather
        // than on the estimate that packed it.
        const over = chunks.filter((c) => c.bytes > SET_CHUNK_BYTES);
        ok(over.length === 0, `chunked: every payload is inside the byte budget${over.length ? ` — OVER: ${over.map((c) => `#${c.index + 1}=${c.bytes}`).join(', ')}` : ` (largest ${Math.max(...chunks.map((c) => c.bytes))}/${SET_CHUNK_BYTES})`}`);
        // Every variant exactly once. A packing loop that dropped or duplicated one would still produce
        // chunks that each paste cleanly — and a duplicate is the specific input that POISONS the set.
        const packed = chunks.flatMap((c) => c.variants);
        ok(packed.length === 108 && new Set(packed).size === 108,
          `chunked: every variant is packed exactly once — ${packed.length} placed, ${new Set(packed).size} distinct`);
        ok(JSON.stringify(packed) === JSON.stringify(big.map(planComponentName)),
          'chunked: packing preserves plan ORDER — the grid ordering the chunks derive their cells from is the whole set\'s, not a slice\'s');
        // A COUNT-BASED split would not have held. Measured, because this is why the budget is bytes:
        // a variant costs ~1,188 bytes slot-less and ~1,940 with both slots, so no single count bounds
        // both this set and the full 756. Asserted as the spread it actually is.
        const counts = [...new Set(chunks.map((c) => c.variants.length))];
        ok(chunks.every((c) => c.bytes <= SET_CHUNK_BYTES) && chunks.slice(0, -1).every((c) => c.bytes > SET_CHUNK_BYTES * 0.9),
          `chunked: packing FILLS each payload rather than padding to a count — ${chunks.map((c) => `${c.variants.length}v/${c.bytes}B`).join(' ')} (variant counts seen: ${counts.join(',')})`);

        // The SEQUENCE, against one page. Names/styles/comps derived from the whole set, as the
        // single-shot run does — a per-chunk list would starve later chunks of paints they legitimately
        // need and drown the real misses.
        const bigOpts = {
          vars: big.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]),
          styles: big.flatMap((p) => planTextStyles(p.root)),
          comps: ['FPO-default-icon', 'focus-ring'],
        };
        const page: { children: Record<string, unknown>[] } = { children: [] };
        const runs: PayloadResult[] = [];
        for (const c of chunks) runs.push(await runPayload(c.js, { ...bigOpts, page }));
        const dirty = runs.flatMap((r, i) => r.misses.map((m) => `#${i + 1}: ${m}`));
        ok(dirty.length === 0, `chunked: all ${chunks.length} chunks run CLEAN in sequence${dirty.length ? ` — ${JSON.stringify(dirty.slice(0, 6))}` : ''}`);
        // ONE set, not N. The failure this guards is the plausible one: a `findOne` that misses sends
        // every chunk down the combine branch, and the result is N separate sets that each pass every
        // check inside their own payload.
        ok(page.children.length === 1 && page.children[0].type === 'COMPONENT_SET',
          `chunked: the page holds exactly ONE component set when it is done — got ${JSON.stringify(page.children.map((c) => c.type))}`);
        ok(runs[runs.length - 1].variants === 108,
          `chunked: the finished set holds all 108 members — the last chunk counts ${runs[runs.length - 1].variants}`);
        ok(runs.every((r, i) => r.added === chunks[i].variants.length),
          `chunked: each chunk builds exactly its own slice — added ${JSON.stringify(runs.map((r) => r.added))} vs packed ${JSON.stringify(chunks.map((c) => c.variants.length))}`);
        // The AXES accumulate. Each member declares all five axis KEYS and only some of the values, so
        // this is the assertion that `appendChild` re-derives rather than being ignored — measured live
        // (`state:rest|hover` + `state=pressed` → three options) and the premise the whole append design
        // rests on.
        ok(JSON.stringify(runs[runs.length - 1].axes?.slice().sort()) === JSON.stringify(['appearance:3', 'intent:3', 'leading:1', 'size:3', 'state:4', 'trailing:1'].sort()),
          `chunked: appending EXTENDS the axes — the finished set derives every value from every chunk (${JSON.stringify(runs[runs.length - 1].axes)})`);
        // PROPERTIES ONLY ON THE LAST CHUNK, and wired across every member of the finished set — not
        // just the 18 that chunk arrived with. `combineAsVariants` rewrites property ids, so this is
        // both why they are declared last and why declaring them early would be undetectable offline.
        ok(runs.slice(0, -1).every((r) => (r.properties ?? []).length === 0),
          `chunked: no chunk but the last declares a property — combineAsVariants rewrites ids, so an early declaration holds ids the combine has invalidated (${JSON.stringify(runs.map((r) => r.properties?.length))})`);
        ok(JSON.stringify([...(runs[runs.length - 1].properties ?? [])].sort()) === JSON.stringify(['children:TEXT', 'leadingVisual:INSTANCE_SWAP']),
          `chunked: the finished set carries both properties — got ${JSON.stringify(runs[runs.length - 1].properties)}`);
        ok(runs[runs.length - 1].wiredMembers === 108 && runs[runs.length - 1].refs === 216,
          `chunked: every one of the 108 members is wired, not just the last chunk's 18 — ${runs[runs.length - 1].wiredMembers} members across ${runs[runs.length - 1].refs} writes`);
        // THE SET'S BOX. Appending does NOT grow it (measured: a member at x=208 appended to a 184-wide
        // set leaves it 184 wide, with the member outside its own box, and nothing throws), so the
        // `resize` is load-bearing and its own mutation below proves the check can fail.
        const [w, h] = runs[runs.length - 1].size ?? [0, 0];
        ok(w > 0 && h > 0, `chunked: the set is resized to contain its members — appending does not grow the frame (${w}x${h})`);

        // A RE-PASTE is idempotent. This is not hygiene: `combineAsVariants` accepts a duplicate member
        // name SILENTLY and the resulting set then throws on `componentPropertyDefinitions` while
        // `addComponentProperty` keeps succeeding — so without the skip, re-running one chunk produces a
        // set that looks buildable and dies on read-back.
        const replay = await runPayload(chunks[1].js, { ...bigOpts, page });
        ok(replay.variants === 108 && replay.added === 0,
          `chunked: re-pasting a chunk adds NOTHING — the set still holds 108, ${replay.added} added (a duplicate member name poisons the whole set silently)`);
        ok(replay.misses.every((m) => /ALREADY PRESENT/.test(m)) && replay.misses.length === chunks[1].variants.length,
          `chunked: and it says so, once per skipped member — ${replay.misses.length} skips for ${chunks[1].variants.length} members`);
        ok(page.children.length === 1, 'chunked: a re-paste does not leave loose components beside the set');
        // AND SO IS RE-PASTING THE *LAST* CHUNK, which is a second, sharper hazard the member skip does
        // nothing about. Measured live on the 12-variant set: `addComponentProperty` with a name the set
        // already carries does NOT throw — Figma silently creates a SECOND property (`leadingVisual2`,
        // `children2`) and returns an id whose own name does not even match the key it made
        // (`leadingVisual#113:102` for the key `leadingVisual2#113:102`). So a designer who re-runs the
        // final step would double every property and wire the refs to the copies, orphaning the originals,
        // and every read-back in the payload would still report a clean paste. Hence declaration skips by
        // name too, reusing the existing id — which is the id the refs want anyway.
        const replayLast = await runPayload(chunks[chunks.length - 1].js, { ...bigOpts, page });
        ok(JSON.stringify([...(replayLast.properties ?? [])].sort()) === JSON.stringify(['children:TEXT', 'leadingVisual:INSTANCE_SWAP']),
          `chunked: re-pasting the LAST chunk leaves exactly two properties — not four, and none named 'children2' (${JSON.stringify(replayLast.properties)})`);
        ok(!replayLast.misses.some((m) => /ORPHAN/.test(m)) && replayLast.wiredMembers === 108,
          `chunked: and the refs still point at the original properties — no orphans, ${replayLast.wiredMembers} members wired${replayLast.misses.some((m) => /ORPHAN/.test(m)) ? ` — got ${JSON.stringify(replayLast.misses.filter((m) => /ORPHAN/.test(m)).slice(0, 3))}` : ''}`);
        // The MUTATION, and it needs the replay for the same reason the duplicate-name one did: on a first
        // paste nothing is ever already declared, so gutting this branch across a fresh sequence removes
        // code that never runs. #511's trap, fifth sighting.
        {
          const js = chunks[chunks.length - 1].js.replace('const already=byBareName.get(p.name);', 'const already=undefined;');
          ok(js !== chunks[chunks.length - 1].js, "chunked: the mutation for 'a re-declared property' actually applied");
          const p: { children: Record<string, unknown>[] } = { children: [] };
          const rs: PayloadResult[] = [];
          for (const c of chunks) rs.push(await runPayload(c.js, { ...bigOpts, page: p }));
          const again = await runPayload(js, { ...bigOpts, page: p });
          ok((again.properties ?? []).length === 4 || (again.properties ?? []).some((s) => /2:/.test(s)),
            `chunked: without the skip, a re-declared property is silently DUPLICATED rather than refused — ${JSON.stringify(again.properties)}`);
          ok(again.misses.some((m) => /ORPHAN/.test(m)),
            `chunked: and the originals are left orphaned, which the read-back names${again.misses.some((m) => /ORPHAN/.test(m)) ? '' : ` — got ${JSON.stringify(again.misses.slice(0, 5))}`}`);
        }

        // MUTATION-TESTED. Same discipline as the single-shot path, and the same reason: every claim
        // above is a read-back, and a read-back that cannot fail is decoration. Each mutation is applied
        // to the CHUNK sequence and run against a FRESH page, because a mutation's whole point is that
        // the run diverges from the clean one.
        const mutateChunks = async (label: string, from: string, to: string, want: RegExp) => {
          const mutated = chunks.map((c) => ({ ...c, js: c.js.replace(from, to) }));
          ok(mutated.some((m, i) => m.js !== chunks[i].js), `chunked: the mutation for '${label}' actually applied`);
          const p: { children: Record<string, unknown>[] } = { children: [] };
          const rs: PayloadResult[] = [];
          for (const c of mutated) rs.push(await runPayload(c.js, { ...bigOpts, page: p }));
          const all = rs.flatMap((r) => r.misses);
          ok(all.some((m) => want.test(m)), `chunked: ${label}${all.some((m) => want.test(m)) ? '' : ` — got ${JSON.stringify(all.slice(0, 5))}`}`);
        };
        // THE CHUNK-SPECIFIC DEFECT, and the one no single-payload test could produce: a chunk that
        // derives the grid ordering from its OWN slice instead of the whole set. Reproduced not by string
        // surgery but by writing the plausible wrong implementation — chunk each slice INDEPENDENTLY,
        // which is what "call the layout function on the plans you were handed" produces. Every such
        // payload is individually correct and its column indices restart at 0, so the second slice lands
        // exactly on top of the first. This is the reason `planSetChunks` takes the full plan list and
        // slices only the cells, and the reason `setLayout` returns the axis ordering at all.
        {
          const perSlice = chunks.map((c) => planSetChunks(big.filter((p) => c.variants.includes(planComponentName(p))), 1e9));
          ok(perSlice.every((s) => s.length === 1), 'chunked: the wrong-implementation probe emits one payload per slice, as a per-slice chunker would');
          const p: { children: Record<string, unknown>[] } = { children: [] };
          const rs: PayloadResult[] = [];
          for (const s of perSlice) rs.push(await runPayload(s[0].js, { ...bigOpts, page: p }));
          const stacked = rs.flatMap((r) => r.misses).filter((m) => /sits on top of/.test(m));
          ok(stacked.length > 0,
            `chunked: a slice-local grid STACKS members, and the layout read-back says so — ${stacked.length ? stacked[0] : `got ${JSON.stringify(rs.flatMap((r) => r.misses).slice(0, 4))}`}`);
        }
        // The RESIZE deleted. Appending does not grow the frame, so without this the set ends up smaller
        // than its own contents — invisible to every binding, property and axis check in the payload.
        await mutateChunks('a set that is never resized is reported', 'set.resize(', 'void(', /set -> BOX .* does not contain/);
        // A DUPLICATE member name — and it takes a RE-PASTE to produce one, which is the whole reason the
        // skip exists. My first attempt gutted the skip across a fresh sequence and came back with no
        // misses at all: on a first run nothing is ever skipped, so the mutation removed a branch that
        // never executed. That reads as an uncaught defect and is not one — #511's trap, fourth sighting:
        // A MUTATION THAT CANNOT FIRE IS INDISTINGUISHABLE FROM ONE THAT IS NOT CAUGHT. The valid form
        // replays a chunk onto the set that already holds it, which is exactly how a designer would
        // produce this by re-running a step.
        const dupJs = chunks[1].js.replace('if(have.has(spec.name)){', 'if(false){');
        ok(dupJs !== chunks[1].js, "chunked: the mutation for 'a duplicate member name' actually applied");
        const dup = await runPayload(dupJs, { ...bigOpts, page });
        ok(dup.misses.some((m) => /set -> UNREADABLE/.test(m)),
          `chunked: a duplicate member name is REPORTED rather than throwing — combineAsVariants accepts it silently and only the definitions getter complains, naming no member${dup.misses.some((m) => /UNREADABLE/.test(m)) ? '' : ` — got ${JSON.stringify(dup.misses.slice(0, 4))}`}`);
        // And the poisoned set declares NOTHING. Declaring on it would succeed (`addComponentProperty`
        // keeps working on a set whose getters throw), burying the one legible cause under a dozen
        // consequences — so the payload empties `PROPS`/`REFS` when the read fails.
        ok((dup.properties ?? []).length === 0 && !dup.misses.some((m) => /ORPHAN|declared but absent/.test(m)),
          `chunked: a poisoned set declares no properties — addComponentProperty would still succeed, and every one would report a second failure (${JSON.stringify(dup.properties)})`);
        // The FOOTPRINT cohort SPLIT ACROSS CHUNKS. `state` and `appearance` must not move the box, and
        // those are exactly the siblings a chunk boundary separates — so the footprint read-back has to
        // compare the whole set rather than one chunk, and this proves it does.
        // Same delta-not-literal form as the single-shot footprint mutation above — see the note there.
        // What this one adds is the SPLIT: `state` and `appearance` are exactly the siblings a chunk
        // boundary separates, so the report has to come from comparing the whole set.
        await mutateChunks('footprint drift is caught even when the cohort is split across chunks',
          "if('strokesIncludedInLayout' in node)node.strokesIncludedInLayout=false;", '',
          /footprint -> .*appearance=outline.* measures \d+x\d+ but .*appearance=filled.* measures \d+x\d+/);
      }

      // ---- AXIS PARITY between the two write paths (#487 step 5) --------------------------------
      // #487 §7 step 5's requirement, and the reason it is worth a gate at all: there are now TWO
      // executors for one `AnatomyPlan` — the plugin-JS payload above (pasted through `figma_execute`)
      // and `apps/plugin/src/write-components.ts`'s `applyComponentPlan` (the plugin's own main thread). One
      // plan, two hosts. If they derive different axes, declare different properties or lay members out
      // differently, a designer's set depends on which button they pressed, and the token tier below it
      // no longer means one thing.
      //
      // WHAT THIS COMPARES, AND WHY NOT THE OBVIOUS THING. Both paths call the same `planSetLayout` for
      // the offline half. So a gate written as "the two paths agree about `planSetLayout`" would be
      // comparing one expression to itself and could not fail — docs/34's core shape. What is compared
      // here is therefore strictly what is NOT shared: the axes FIGMA derived from the member names each
      // path wrote, the properties each path managed to declare on the set, the box each path resized to,
      // and — on a starved file — the misses each path reports, as SETS. That last one is why the
      // executor's miss strings were written byte-identical to the payload's: comparing sets makes a path
      // that reports the wrong CAUSE fail, where comparing counts would not.
      //
      // AND THE ONE CLAIM IT CANNOT MAKE, named here because the position assertion below LOOKS like it
      // does (#656). Both sides of `posMap` are laid out by `planSetLayout`, so every member moves
      // together under any layout change and the comparison stays green. The expectation is not derived
      // from the subject — this is not the usual docs/34 shape — but both SIDES of the comparison share
      // it, which is the same blindness reached a different way. That is exactly how the column axis
      // became `trailing` and nothing noticed. `posMap` remains a real gate on everything downstream of
      // the layout (measuring, cell writing, read-back); the layout itself is gated separately, against
      // a hand-written table, in the GRID COLUMN AXIS block below.
      //
      // ONE STUB, TWO DRIVERS. Both run against `makeFigmaStub`, which is why it was lifted out of
      // `runPayload`. Two executors judged by two different host models would be comparing the models.
      {
        const plugRun = async (plans: AnatomyPlan[], opts: StubOpts) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the stub satisfies ComponentsApi
          applyComponentPlan(plans, makeFigmaStub(opts) as any);
        // Fresh pages on both sides, HELD rather than discarded — the positions each path wrote are read
        // back off them below. The payload has no find-or-create (that is the plugin's own addition,
        // since a designer can press a button twice), so a shared page would have the two paths
        // reporting about different documents.
        const pastePage: StubPage = { children: [] };
        const plugPage: StubPage = { children: [] };
        const pasted = await runPayload(planSetToPluginJs(grid), { ...fullSet, page: pastePage });
        const plugged = await plugRun(grid, { ...fullSet, page: plugPage });

        const sorted = (xs: readonly string[]) => JSON.stringify([...xs].sort());
        ok(plugged.misses.length === 0, `parity: the plugin executor runs CLEAN on the same grid${plugged.misses.length ? ` — ${JSON.stringify(plugged.misses.slice(0, 4))}` : ''}`);
        // THE AXES, which is the parity #487 asked for by name: what Figma derived, on each path, from
        // the names that path wrote.
        ok(sorted(plugged.axes) === sorted(pasted.axes ?? []) && plugged.axes.length === 6,
          `parity: both paths derive the SAME axes from the members they wrote — plugin ${sorted(plugged.axes)} vs paste ${sorted(pasted.axes ?? [])}`);
        ok(sorted(plugged.properties) === sorted(pasted.properties ?? []),
          `parity: both paths leave the SAME component properties on the set — plugin ${sorted(plugged.properties)} vs paste ${sorted(pasted.properties ?? [])}`);
        ok(plugged.variants === pasted.variants && plugged.refs === pasted.refs && plugged.wiredMembers === pasted.wiredMembers,
          `parity: same member count and the same references spread across the same members — plugin ${plugged.variants}/${plugged.refs}/${plugged.wiredMembers} vs paste ${pasted.variants}/${pasted.refs}/${pasted.wiredMembers}`);
        // THE GEOMETRY, read off the two pages rather than off `size`. `size` is deliberately NOT the
        // comparison: the single-shot payload never calls `resize` (live, `combineAsVariants` sizes the
        // box itself, and the stub models that by reporting 0 until something resizes it) where the
        // plugin path appends and must resize explicitly. That difference is a real and correct one
        // between the two hosts, so asserting on the box would gate a divergence we WANT. Every member's
        // NAME→POSITION map is the claim that actually matters, and it is strictly stronger: the column
        // pitch is measured from the members, so identical positions mean both paths measured every
        // member the same and placed them in the same cells.
        const posMap = (page: StubPage) => {
          const set = page.children.find((c) => c.type === 'COMPONENT_SET')!;
          return JSON.stringify(([...(set.children as Record<string, unknown>[])])
            .map((c) => `${c.name}@${c.x},${c.y} ${Math.round(c.width as number)}x${Math.round(c.height as number)}`).sort());
        };
        ok(posMap(plugPage) === posMap(pastePage),
          'parity: every member lands at the same coordinate and measures the same box on both paths — the pitch is measured, so this is the layout claim `size` cannot make');

        // THE MISSES, AS SETS, on a file with no variables — the degraded case where `misses[]` is the
        // only channel either path has. Equality here is the claim the byte-identical strings buy:
        // a path reporting the right NUMBER of wrong causes fails this.
        const starvedOpts = { styles: fullSet.styles, comps: fullSet.comps };
        const pastedBare = await runPayload(planSetToPluginJs(grid), { ...starvedOpts, page: { children: [] } });
        const pluggedBare = await plugRun(grid, { ...starvedOpts, page: { children: [] } });
        ok(pastedBare.misses.length > 0, `parity: the starved run has misses to compare (${pastedBare.misses.length})`);
        ok(sorted(pluggedBare.misses) === sorted(pastedBare.misses),
          `parity: on a file with no variables both paths report the IDENTICAL causes, not merely the same count — plugin ${pluggedBare.misses.length}, paste ${pastedBare.misses.length}`
          + (sorted(pluggedBare.misses) === sorted(pastedBare.misses) ? '' : ` — only-plugin: ${JSON.stringify(pluggedBare.misses.filter((m) => !pastedBare.misses.includes(m)).slice(0, 3))}; only-paste: ${JSON.stringify(pastedBare.misses.filter((m) => !pluggedBare.misses.includes(m)).slice(0, 3))}`));

        // PROOF OF LIFE, because every assertion above passes if the comparison is between two things
        // that cannot differ — which is exactly what the shared `planSetLayout` makes plausible here.
        // So DIVERGE the two paths on purpose, in the one place the comparison is supposed to be
        // sensitive to (what each host lets the executor write), and confirm each assertion above would
        // have failed. The paste path keeps its full file; the plugin path is handed a file with no
        // swap target, which is a real degrade rather than a synthetic one.
        const skewed = await plugRun(grid, { ...fullSet, comps: [], page: { children: [] } });
        ok(sorted(skewed.properties) !== sorted(pasted.properties ?? []) && sorted(skewed.misses) !== sorted(pasted.misses),
          `parity gate: two paths that genuinely diverge are REPORTED as different — the comparison above is live, not two readings of one shared expression (plugin ${sorted(skewed.properties)} vs paste ${sorted(pasted.properties ?? [])})`);
      }

      // ---- THE GRID COLUMN AXIS (#656) -----------------------------------------------------------
      // The layout claim the parity block above cannot make, gated against a HAND-WRITTEN table.
      //
      // WHY IT HAS TO BE HAND-WRITTEN. `planSetLayout` is the subject, so any expectation computed by
      // calling it agrees with it by construction — and the sub-shape #656 found is subtler than that:
      // the `posMap` parity assertion does not derive its expectation from the subject at all, it
      // compares two executors, and BOTH of them lay out through `planSetLayout`. The expectation is
      // independent; the two SIDES of the comparison share the subject. Every member moved together
      // when the column axis silently became `trailing` (#536 appended `slotAxes` after `stateAxis`,
      // and `varying[varying.length - 1]` is declaration order), so the parity gate stayed green while
      // the full Button set reshaped to 324 rows × 2 columns — measured live at 320 × 23304px, against
      // the shim's predicted 264 × 11640. Nobody chose that shape and no gate could report it.
      //
      // So every expectation below is a literal `(name → row, col)` table written out by hand from the
      // declared axis and the known value orders. It can disagree with the code, which is the only
      // property that makes it a gate. Do NOT rewrite any of these tables as a call to
      // `planSetLayout`, `gridColumnAxis` or `figmaAxisNames` — that deletes the gate and reports it
      // as a pass (docs/34).
      {
        const at = (name: string, key: string) => name.split(', ').map((kv) => kv.split('=')).find(([k]) => k === key)![1];
        const cellMap = (plans: AnatomyPlan[]) => {
          const { cells } = planSetLayout(plans, 'gridAxis gate');
          return new Map(cells.map((c) => [c.name, `r${c.row}c${c.col}`]));
        };
        // Keyed on the two axes each table varies, so the table reads as a table.
        const check = (label: string, plans: AnatomyPlan[], keys: [string, string], want: Record<string, string>) => {
          const got = [...cellMap(plans).entries()]
            .map(([n, cell]) => [`${at(n, keys[0])}/${at(n, keys[1])}`, cell] as const)
            .sort(([a], [b]) => a.localeCompare(b));
          const wantSorted = Object.entries(want).sort(([a], [b]) => a.localeCompare(b));
          ok(JSON.stringify(got) === JSON.stringify(wantSorted),
            `#656 ${label} — got ${JSON.stringify(got)} vs hand-written ${JSON.stringify(wantSorted)}`);
        };

        // TABLE 1 — THE DECLARATION IS HONORED OVER CARDINALITY. `size` varies three ways and `state`
        // two, so the cardinality fallback would put `size` across; Button declares `gridAxis: 'state'`,
        // so `state` goes across and `size` down. Column order is first appearance, which is the order
        // these plans are built in: rest, then hover.
        const declOrder = ['small', 'medium', 'large'].flatMap((sz) => ['rest', 'hover'].map((st) =>
          figmaAnatomyPlan(button, sz, { leading: false, trailing: false, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: 'filled', state: st })));
        check('the DECLARED axis takes the columns even when another axis is wider', declOrder, ['size', 'state'], {
          'small/rest': 'r0c0', 'small/hover': 'r0c1',
          'medium/rest': 'r1c0', 'medium/hover': 'r1c1',
          'large/rest': 'r2c0', 'large/hover': 'r2c1',
        });

        // TABLE 2 — THE SAME PLANS WITH NO DECLARATION fall back to the widest axis, transposing the
        // table. Same six members, so this isolates the declaration and nothing else: `size` (3) beats
        // `state` (2) and goes across. A def that has not thought about its grid still gets the shortest
        // table available rather than whichever axis happens to sort last.
        const undeclared: ComponentDef = { ...button, figmaProperties: { ...button.figmaProperties!, gridAxis: undefined } };
        const noDecl = ['small', 'medium', 'large'].flatMap((sz) => ['rest', 'hover'].map((st) =>
          figmaAnatomyPlan(undeclared, sz, { leading: false, trailing: false, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: 'filled', state: st })));
        check('with NO declared axis the widest one takes the columns', noDecl, ['size', 'state'], {
          'small/rest': 'r0c0', 'medium/rest': 'r0c1', 'large/rest': 'r0c2',
          'small/hover': 'r1c0', 'medium/hover': 'r1c1', 'large/hover': 'r1c2',
        });

        // TABLE 3 — THE REGRESSION ITSELF, at the smallest size that exhibits it. `state` and `trailing`
        // both vary two ways, so cardinality TIES and the tie-break is declaration order — which is the
        // one input the old rule also used, from the other end. The old rule took the LAST varying axis
        // (`trailing`, because `slotAxes` are appended after `stateAxis`); the new one takes the first of
        // the tied pair, which is `state`. Restore `varying[varying.length - 1]` and this table
        // transposes. The literal below is the axis the old rule would have picked, spelled out so the
        // regression is named in the source rather than implied.
        const OLD_RULE_WOULD_PICK = 'trailing';
        const tied = ['rest', 'hover'].flatMap((st) => [false, true].map((t) =>
          figmaAnatomyPlan(button, 'medium', { leading: false, trailing: t, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: 'filled', state: st })));
        check(`a cardinality TIE goes to the declared axis, not to the last-declared one (${OLD_RULE_WOULD_PICK})`, tied, ['state', 'trailing'], {
          'rest/false': 'r0c0', 'hover/false': 'r0c1',
          'rest/true': 'r1c0', 'hover/true': 'r1c1',
        });

        // THE FULL SET'S SHAPE, as two literals a hand-count justifies rather than a product of
        // `.length`s. 648 = 3 intent × 3 appearance × 3 size × 6 state × 2 leading × 2 trailing; with
        // `state` across, that is 6 columns and 648/6 = 108 rows. Written as literals deliberately: a
        // shape computed from the axes is the declaration restating itself, which is the defect the
        // 189-vs-756 miscount already cost this repo once.
        const fullLayout = planSetLayout(figmaAnatomySet(button, { swapTarget: 'FPO-default-icon' }), '#656 full');
        ok(fullLayout.colKey === 'state' && fullLayout.rows === 108 && fullLayout.cols === 6,
          `#656: the full Button set lays out 108 rows × 6 columns with 'state' across — got ${fullLayout.rows}×${fullLayout.cols} on '${fullLayout.colKey}' (the inherited axis gave 324×2, measured live at 320×23304px)`);
        ok(JSON.stringify(fullLayout.colVals) === JSON.stringify(['rest', 'hover', 'focus-visible', 'pressed', 'pending', 'disabled']),
          `#656: the columns run in the def's own state order, so the table reads left to right the way the states are declared — got ${JSON.stringify(fullLayout.colVals)}`);
        // And the row keys are every OTHER varying axis. `rowKeys` used to be `varying.slice(0, -1)`,
        // which is only correct while the column axis is the last element — the exact assumption that
        // stops holding the moment the axis is chosen. A `state` still present in `rowKeys` would put
        // every member of a row in one cell.
        ok(JSON.stringify(fullLayout.rowKeys) === JSON.stringify(['intent', 'appearance', 'size', 'leading', 'trailing']),
          `#656: the rows combine every varying axis EXCEPT the column one — got ${JSON.stringify(fullLayout.rowKeys)}`);

        // ON CANVAS, because a cell index is not a coordinate. Run table 1's set through the real
        // payload and read the geometry off the page: members the hand table puts in one row must share
        // a `y`, members in one column must share an `x`, and the three rows must be at three distinct
        // `y` values. This is what turns the table above into a claim about what a designer sees — and
        // it is derived from the HAND table, not from `cells`.
        const gridOpts = {
          vars: declOrder.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]),
          styles: declOrder.flatMap((p) => planTextStyles(p.root)),
          comps: ['FPO-default-icon', 'focus-ring'],
        };
        const gridPage: StubPage = { children: [] };
        const gridRun = await runPayload(planSetToPluginJs(declOrder), { ...gridOpts, page: gridPage });
        ok(gridRun.misses.length === 0, `#656: the 6-member grid pastes clean${gridRun.misses.length ? ` — ${JSON.stringify(gridRun.misses.slice(0, 4))}` : ''}`);
        const placed = new Map((gridPage.children.find((c) => c.type === 'COMPONENT_SET')!.children as Record<string, unknown>[])
          .map((c) => [`${at(c.name as string, 'size')}/${at(c.name as string, 'state')}`, { x: c.x as number, y: c.y as number }]));
        ok(placed.size === 6, `#656: all six members reached the page (${placed.size})`);
        const ys = ['small', 'medium', 'large'].map((sz) => placed.get(`${sz}/rest`)!.y);
        ok(['small', 'medium', 'large'].every((sz) => placed.get(`${sz}/rest`)!.y === placed.get(`${sz}/hover`)!.y),
          '#656: the two states of one size share a `y` — `state` is the ACROSS axis on canvas, not merely in the cell index');
        ok(new Set(ys).size === 3 && ys[0] < ys[1] && ys[1] < ys[2],
          `#656: the three sizes sit at three increasing y values — the DOWN axis is size (${JSON.stringify(ys)})`);
        ok(new Set(['small', 'medium', 'large'].map((sz) => placed.get(`${sz}/rest`)!.x)).size === 1
          && new Set(['small', 'medium', 'large'].map((sz) => placed.get(`${sz}/hover`)!.x)).size === 1
          && placed.get('small/rest')!.x < placed.get('small/hover')!.x,
          '#656: `rest` shares one column `x` and `hover` the next — the columns are columns, and in declared order');
      }

      // ---- `gridAxis` VALIDATION (#656) ----------------------------------------------------------
      // The field's value is entirely in being CHECKED. An unchecked `gridAxis` that names a renamed or
      // misspelled axis falls through to the cardinality fallback, which puts the grid back where #656
      // found it while the def still reads as though it chose. So the validator resolves the name
      // against the axes this def actually projects.
      {
        const fp = button.figmaProperties!;
        const withAxis = (gridAxis: string | undefined): ComponentDef => ({ ...button, figmaProperties: { ...fp, gridAxis } });
        ok(figmaPropertyErrors(button).length === 0, '#656: Button with `gridAxis: \'state\'` validates clean');
        ok(figmaPropertyErrors(withAxis(undefined)).length === 0, '#656: omitting `gridAxis` is legitimate — the fallback is a designed behavior, not a missing declaration');
        const bad = figmaPropertyErrors(withAxis('tone'));
        ok(bad.some((m) => /gridAxis: 'tone' is not an axis this def projects/.test(m)),
          `#656: a \`gridAxis\` naming an axis the def does not project is an ERROR, not a silent fallback — got ${JSON.stringify(bad)}`);
        // A CODE-ONLY axis is the case that would otherwise slip through: `width` is a real axis on this
        // def and deliberately unprojected, so a `gridAxis: 'width'` names something that exists
        // everywhere except in the set Figma builds.
        ok(figmaPropertyErrors(withAxis('width')).some((m) => /gridAxis: 'width'/.test(m)),
          '#656: an axis the def declares but does NOT project is refused too — it exists in `variants` and cannot be a column');
        // And the slot axes ARE eligible. Nothing about the fix says the columns must be the state axis;
        // it says the choice must be made. A def whose most readable table really is slot presence must
        // be able to say so.
        ok(figmaPropertyErrors(withAxis('trailing')).length === 0,
          '#656: a slot-presence axis is a legitimate column axis — the fix is that the axis is CHOSEN, not that it is `state`');
      }
    }

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

  // ---- the Figma COMPONENT-PROPERTY projection (#487 §5) ------------------------------------
  // Step 1 of #487, and the reason it comes first: this is the whole design decision, and it is
  // gateable with no Figma file. Every rule below is a cross-reference — a name in the projection
  // that must resolve elsewhere in the def — because the alternative to declaring the projection is
  // PARSING `props[].type`, which is prose ("enum: 'primary' | 'neutral' | 'destructive'").
  {
    const fp = button.figmaProperties!;
    ok(figmaPropertyErrors(button).length === 0, `figmaProperties: Button's projection is internally consistent${figmaPropertyErrors(button).length ? ' — ' + figmaPropertyErrors(button).join('; ') : ''}`);

    // The state axis draws from `states`, the def's own list — NOT the legacy sheet's names. #487
    // §0.1 lists six (`active`, `focused`, `loading`); §0.4 forbids codifying exactly those.
    //
    // It is a SUBSET now, not the verbatim list: `inactive` is code-only (#536 item 4). So the claim
    // worth asserting is no longer "identical to states" but the two halves that survive it — every
    // projected value is a real state, and every unprojected one is an ADMISSION. The second half is
    // the load-bearing one; without it this reduces to "the axis is some states", which any silent
    // deletion satisfies.
    ok(fp.stateAxis!.values.every((v) => button.states.includes(v)),
      `figmaProperties: every value on the state axis is one of the def's own ${button.states.length} states — no legacy renaming, nothing invented`);
    ok(JSON.stringify(button.states.filter((s) => !fp.stateAxis!.values.includes(s))) === JSON.stringify(['inactive']),
      'figmaProperties: `inactive` is the ONE state the axis omits — anything else dropped is a regression, not a decision');
    ok(figmaPropertyErrors({ ...button, anatomy: { ...button.anatomy!, codeOnly: button.anatomy!.codeOnly.filter((c) => !c.startsWith('inactive')) } } as ComponentDef)
      .some((x) => /state 'inactive' is not in the Figma state axis/.test(x)),
      'figmaProperties gate: removing the codeOnly admission for `inactive` FAILS — the omission is licensed by the admission, not by the axis being short');
    ok(!fp.stateAxis?.values.some((v) => ['active', 'focused', 'loading'].includes(v)),
      "figmaProperties: the legacy sheet's names (active / focused / loading) are NOT codified — they are that sheet's words for pressed / focus-visible / pending");

    // HOW MANY ROWS READ AS THEIR `rest` SIBLING — measured over the whole projected set, and pinned
    // because it is the number a designer opening the set actually experiences, and #563's write-up got
    // it wrong by keying on the wrong thing. TWO figures, both true, and the difference is the lesson:
    //
    //   paint + node names → 0    (none)
    //   paint only         → 54   (pending 54, leading=true only)
    //
    // Both were 36 higher until #536 item 1 closed: `.text` keyed `overlay.hover` but no
    // `overlay.pressed` while `.outline` keyed both, so all 36 `appearance=text, state=pressed` rows
    // fell back to their rest overlay and projected byte-identical to rest. Fixed by keying the missing
    // slot in the DEF (one line per intent — `overlay.pressed` already existed at alpha 0.2), not by
    // teaching `paintOf` to synthesize one, which would have painted a wash no brand authored.
    //
    // Both were 108 higher until the focus ring became a part (#536 item 3): `focus-visible` contributed
    // every one of those 108 rows, in BOTH counts, because the ring was not a node and nothing else
    // distinguishes focus — `appearance=outline, state=focus-visible` emitted its rest border and no ring
    // at all. The ring is an absolute sibling now, so all 108 differ structurally AND visually. That is
    // the single largest duplicate class in the set, and it is worth noting it moved both counts by the
    // same number: the ring is a real node carrying real geometry, not a rename.
    //
    // The 54 are exactly the `leading=true` half of `pending`: the spinner REPLACES the leading visual,
    // so it inherits the same square size binding, the same icon paint and the same position, and the
    // only difference left is that the node is called `spinner` instead of `leadingVisual`. With
    // `leading=false` there is nothing to replace, so the spinner adds a node — since #612 an
    // OUT-OF-FLOW one, centered over a label held at zero opacity, so the row genuinely differs on the
    // canvas without differing in width. A layer rename is invisible on the canvas — both are FPO icons of identical size and
    // color — so the honest count for "looks the same" is 54, not 0. The
    // structural count is what a diff sees; the paint count is what a human sees. Assert BOTH, because
    // asserting only the structural one is what let "144" into the PR table in the first place — and
    // because the structural count now reads ZERO, which is exactly when a single-figure gate stops
    // being able to distinguish "nothing duplicates" from "the comparison stopped comparing".
    {
      const sig = (p: AnatomyPlan) => {
        const walk = (n: FigmaNodePlan): unknown[] => [{ t: n.type, paints: n.paints, bound: n.bound, ts: n.textStyle, df: n.descendantFills, ch: n.characters }, ...(n.children ?? []).flatMap(walk)];
        return JSON.stringify(walk(p.root));
      };
      const withNames = (p: AnatomyPlan) => sig(p) + JSON.stringify((p.root.children ?? []).map((c) => c.name));
      // Parameterized over the DEF so the same counter can be pointed at a mutated one below. That is
      // the whole reason it takes a def rather than closing over `button`: a counter that can only ever
      // measure the shipping def cannot be shown to measure anything.
      const countFor = (d: ComponentDef, cmp: (p: AnatomyPlan) => string) => {
        const by = new Map<string, number>();
        for (const i of button.variants.intent) for (const ap of button.variants.appearance) for (const sz of button.variants.size)
          for (const ld of [true, false]) for (const tr of [true, false]) {
            const mk = (st: string) => figmaAnatomyPlan(d, sz, { leading: ld, trailing: tr, swapTarget: 'FPO-default-icon', intent: i, appearance: ap, state: st });
            const rest = cmp(mk('rest'));
            for (const st of fp.stateAxis!.values) if (st !== 'rest' && cmp(mk(st)) === rest) by.set(st, (by.get(st) ?? 0) + 1);
          }
        return by;
      };
      const count = (cmp: (p: AnatomyPlan) => string) => countFor(button, cmp);
      const struct = count(withNames), painted = count(sig);
      const total = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
      ok(total(struct) === 0,
        `figmaProperties: NO row of 648 is structurally identical to its rest sibling (${JSON.stringify([...struct])})`);
      ok(total(painted) === 54 && painted.get('pending') === 54,
        `figmaProperties: 54 rows are VISUALLY identical to their rest sibling — all of them pending with leading=TRUE, where the spinner replaces the leading visual and inherits its size, paint and position (${JSON.stringify([...painted])})`);
      // A ZERO-EXPECTING ASSERTION CANNOT DISTINGUISH "clean" FROM "not looking", so prove the counter
      // still counts rather than trusting the 0. Re-runs the same `count` against a def with the
      // `.text` pressed overlays stripped back out — the pre-#536-item-1 state — and requires the 36
      // to come back. Without this, deleting `count`'s inner loop would leave both assertions above
      // green (the 54 would go too, but a future fix to the pending case makes THAT a 0 as well, and
      // then the whole block passes while measuring nothing). Measured: with `for (const st of ...)`
      // short-circuited, `total(struct) === 0` passed and this line failed, naming the 36.
      const noPressedOverlay = {
        ...button,
        tokens: Object.fromEntries(Object.entries(button.tokens).filter(([k]) => !/^\w+\.text\.overlay\.pressed$/.test(k))),
      } as ComponentDef;
      ok(Object.keys(noPressedOverlay.tokens).length === Object.keys(button.tokens).length - 3,
        'figmaProperties: the mutation for the pressed-overlay counter actually applied — 3 keys removed');
      const mutated = countFor(noPressedOverlay, withNames);
      ok(total(mutated) === 36 && mutated.get('pressed') === 36,
        `figmaProperties: the duplicate counter still COUNTS — stripping the three \`.text.overlay.pressed\` keys brings back exactly the 36 rows #536 item 1 removed (${JSON.stringify([...mutated])})`);
      // `focus-visible` in EITHER map is the #536-item-3 regression returning, and it is worth its own
      // assertion rather than being implied by the totals: the totals move for any reason at all (a new
      // size, a new intent, a paint change), and a total that happens to still read its expected figure
      // while 108 focus rows have gone back to duplicating rest is exactly the failure this pins.
      //
      // It used to add that focus-visible was "the only duplicate class that was a DEFECT — pressed's 36
      // and pending's 54 are both admitted in `codeOnly`". That was FALSE, and checking it is what turned
      // up #536 item 1: `codeOnly` has seven entries and not one of them mentions `pressed` or the
      // spinner. Pressed's 36 were a plain missing token key, admitted nowhere, and reading them as
      // accepted is what kept them shipping. Pending's 54 remain admitted nowhere either — that is the
      // matrix-shape question (should the set enumerate an axis that provably moves no pixels?), open
      // deliberately rather than asserted away here.
      ok(!struct.has('focus-visible') && !painted.has('focus-visible'),
        `figmaProperties: NO focus-visible row reads as its rest sibling — all 108 did before the ring became an absolute part (#536 item 3), which is the largest duplicate class the set has had (${JSON.stringify([...painted])})`);
      // The direction matters and is easy to get backwards (I did): assert it rather than restate it.
      const pendingEq = (ld: boolean) => {
        const mk = (st: string) => figmaAnatomyPlan(button, 'medium', { leading: ld, trailing: false, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: 'filled', state: st });
        return sig(mk('pending')) === sig(mk('rest'));
      };
      ok(pendingEq(true) && !pendingEq(false),
        'figmaProperties: pending reads as rest when there IS a leading visual to replace, and differs when there is not — the replacement is what hides it');

      // THE CROSS-INTENT COLLAPSE (#612), and it needed its own measurement rather than an entry in the
      // maps above. Everything before this line compares a row against its OWN `rest` sibling — same
      // intent, same appearance, same size — so a collapse ACROSS intents is invisible to it however
      // large. The 36 groups were sitting in the projected set unmeasured while three assertions above
      // reported clean, which is the scope-silence mode: the counter was right about the question it
      // asked and nobody had asked this one.
      //
      // ACCEPTED, not fixed. `disabled.*` is cross-cutting by design (docs/20 §7), so this asserts the
      // collapse still HAPPENS — the inverse direction from every assertion above it. A future PR
      // giving disabled a per-intent tint would fail here, correctly: that is a token-tier decision
      // reversal (docs/20 §7) and it should not be able to land as a quiet side effect.
      const distinctAcrossIntents = (state: string) =>
        new Set(button.variants.intent.map((i) =>
          sig(figmaAnatomyPlan(button, 'medium', { leading: true, trailing: false, swapTarget: 'FPO-default-icon', intent: i, appearance: 'filled', state })))).size;
      // BOTH directions, because `1` alone is what a broken `sig` returns for everything. `rest` reading
      // 3 is what proves the comparison can still tell intents apart at all — without it, a `sig` that
      // returned a constant would pass the disabled assertion and look like a confirmed design decision.
      ok(distinctAcrossIntents('disabled') === 1 && distinctAcrossIntents('rest') === 3,
        `figmaProperties: all three intents collapse to ONE row at state=disabled (${distinctAcrossIntents('disabled')} distinct) and stay separate at rest (${distinctAcrossIntents('rest')}) — cross-cutting disabled.* (docs/20 §7), admitted in codeOnly per #612`);
      // The row count the admission quotes, derived rather than restated. 36 groups × (3 − 1) = 72
      // removable rows, and the entry says 72 — a number in an admission is a claim like any other.
      const disabledGroups = button.variants.appearance.length * button.variants.size.length * 2 * 2;
      ok(disabledGroups === 36 && disabledGroups * (button.variants.intent.length - 1) === 72,
        `figmaProperties: the #612 admission's arithmetic holds — ${disabledGroups} collapsing groups × ${button.variants.intent.length - 1} redundant siblings = ${disabledGroups * (button.variants.intent.length - 1)} rows`);
      // AND THE ADMISSION ITSELF HAS TO BE THERE. Found by mutation: renaming the #612 entry to
      // something else left every assertion in this block green, because they all measure the
      // PROJECTION and none of them read `codeOnly`. An accepted-by-design duplicate whose admission has
      // silently vanished is indistinguishable from an unnoticed one — the entry IS the decision, and
      // the count assertions above only say what happens, never that anyone chose it. This is the
      // #536-item-1 lesson pointed at its own fix: a number without its prose does not carry a verdict.
      ok(button.anatomy!.codeOnly.some((c) => c.trim().startsWith('intent-at-disabled')),
        'figmaProperties: the intent-at-disabled collapse is ADMITTED in codeOnly (#612) — the decision to accept it is recorded, not just its consequence');
    }

    // Every projected axis is real, and every UNPROJECTED axis is admitted rather than merely absent.
    for (const axis of fp.variantAxes) ok(axis in button.variants, `figmaProperties: projected axis '${axis}' exists in variants`);
    const omitted = Object.keys(button.variants).filter((a) => !fp.variantAxes.includes(a));
    // `startsWith`, not `.join(' ').includes(a)`. The loose form is what this assertion used to be, and
    // it asserted almost nothing: `min-width derivation` contains the substring `width`, so DELETING the
    // `width (auto | full)` admission outright kept the whole suite green (#563 review found this by
    // doing exactly that). The gate and the test both check the leading form now.
    ok(omitted.length > 0 && omitted.every((a) => button.anatomy!.codeOnly.some((c) => c.trim().startsWith(a))),
      `figmaProperties: every axis Figma will not carry LEADS a codeOnly entry (${omitted.join(', ')}) — a dropped axis must be an admission, not a gap`);
    // And one mutation per omitted axis, because "the current def happens to pass" is not the claim —
    // "deleting the admission fails" is. Generated over `omitted` so a future unprojected axis is
    // covered on the day it appears rather than the day someone remembers to add a case.
    for (const axis of omitted) {
      const errs = figmaPropertyErrors({
        ...button,
        anatomy: { ...button.anatomy!, codeOnly: button.anatomy!.codeOnly.filter((c) => !c.trim().startsWith(axis)) },
      } as ComponentDef);
      ok(errs.some((x) => new RegExp(`variants\\.${axis} is not projected`).test(x)),
        `figmaProperties gate: deleting the codeOnly admission for the '${axis}' axis FAILS${errs.length ? '' : ' — got no errors'}`);
    }
    // The whole-word half, on the axis side. `min-width derivation` is a real entry, so a bare
    // `startsWith` would let it admit an axis literally named `min` — the same defect as
    // `disabledStrategy` admitting `disabled` below, in the loop 25 lines up.
    ok(figmaPropertyErrors({
      ...button,
      variants: { ...button.variants, min: ['a', 'b'] },
    } as ComponentDef).some((x) => /variants\.min is not projected/.test(x)),
      "figmaProperties gate: `min-width derivation` does NOT admit an axis named 'min' — the axis name must be a whole word too");

    // AND THE SAME TRAP FROM THE OTHER END: a codeOnly entry about an axis-and-state INTERACTION must
    // not launder dropping that whole AXIS. #612 admits the intent-at-disabled collapse, and the obvious
    // wording — `intent at state=disabled — …` — LEADS with `intent`, so `admits('intent')` says yes and
    // the gate protecting the entire intent axis silently switches off. Measured while writing that
    // entry: with the leading-`intent ` wording, removing `intent` from `variantAxes` took
    // `figmaPropertyErrors` from 1 error to 0. Shipped as `intent-at-disabled redundancy` instead.
    //
    // Asserted in both directions, because the point is not that the shipped entry is safe — it is that
    // the hyphenated compound is WHY it is safe, and a future editor "tidying" the wording needs to fail
    // here rather than discover this in a review.
    const dropIntent = (codeOnly: string[]) => figmaPropertyErrors({
      ...button,
      anatomy: { ...button.anatomy!, codeOnly },
      figmaProperties: { ...fp, variantAxes: fp.variantAxes.filter((a) => a !== 'intent') },
    } as ComponentDef).some((x) => /variants\.intent is not projected/.test(x));
    ok(dropIntent(button.anatomy!.codeOnly),
      'figmaProperties gate: the shipped #612 admission does NOT admit dropping the whole `intent` axis — dropping it still fails');
    ok(!dropIntent([...button.anatomy!.codeOnly, 'intent at state=disabled — the wording that launders it']),
      'figmaProperties gate: an entry LEADING with a bare axis name WOULD launder the axis drop (so #612 leads with `intent-at-disabled`, a compound) — this is the shape where a declaration satisfies the check it exempts you from');

    // The count, stated so a change to any axis has to move a number a reviewer can see. 189 before
    // the slot-presence axes, 756 with them, and 648 now that `inactive` is code-only — the 108 rows
    // it would have contributed each render as their `rest` sibling, since `anatomy-figma.ts` has no
    // `inactive` paint branch (the shared-paint intent is a TOKEN-tier decision the emitter has not
    // implemented; #563 review measured this).
    const projected = figmaVariantCount(button);
    ok(projected === 648, `figmaProperties: Button projects ${projected} variants (3 intent × 3 appearance × 3 size × 6 state × 2 leading × 2 trailing)`);

    // THE GATE THAT WOULD HAVE CAUGHT THE GAP, and the reason the count above is now derived rather
    // than restated. `projected === 189` was computed from `variantAxes × stateAxis` — the same
    // declaration it was checking — so it agreed with itself while `planComponentName` emitted two
    // axes nobody had declared. A count derived from a declaration cannot detect that the declaration
    // is incomplete; only comparing it against what the EMITTER produces can.
    //
    // Parses the real plan name rather than trusting a list, so any axis added to either side without
    // the other shows up here — for the next axis, not just this one.
    const emittedAxes = planComponentName(figmaAnatomyPlan(button, 'medium', { leading: true, trailing: true, intent: 'primary', appearance: 'filled', state: 'rest' }))
      .split(', ').map((kv) => kv.split('=')[0]);
    ok(emittedAxes.slice().sort().join(',') === figmaAxisNames(button).slice().sort().join(','),
      `figmaProperties: the DECLARED axes match the ones planComponentName emits (declared [${figmaAxisNames(button).join(', ')}] vs emitted [${emittedAxes.join(', ')}])`);
    ok(emittedAxes.length === 6, `figmaProperties: six axes reach the Figma name (${emittedAxes.join(', ')})`);

    // ---- figmaAnatomySet: the enumerator the plugin's trigger calls (#483) ----------------------
    // It exists because the six nested loops above were hand-written at three call sites in THIS file and
    // `apps/plugin/src/main.ts` would have been a fourth — one no test in this repo can reach, since
    // `main.ts` calls `figma.showUI` at module scope. The loops are now in the engine, gated here.
    //
    // THE COUNT IS THE LITERAL 648, not `figmaVariantCount(button)`. Both derive from the same
    // declaration, so comparing them is a gate agreeing with itself — exactly the shape the note above
    // records as the #487 §5 failure. The literal is a number a reviewer has to change on purpose.
    //
    // It is not a number transcribed from a run, either — derive it by hand: 3 intent × 3 appearance ×
    // 3 size × 6 state × 4 slot (2 leading × 2 trailing) = 648. THE 6 IS THE STEP TO CHECK: `states`
    // declares SEVEN and `stateAxis` projects six, because `inactive` is deliberately code-only and
    // never becomes a Figma variant (#487 §0.4). Re-deriving this from `states.length` gives 756 and
    // makes the gate look wrong when it is the derivation that is.
    const set648 = figmaAnatomySet(button, { swapTarget: 'FPO-default-icon' });
    ok(set648.length === 648, `figmaAnatomySet: enumerates 648 plans for Button (${set648.length})`);
    // Every coordinate distinct. A loop that pins an axis instead of iterating it produces N plans with
    // ONE name, which `planSetLayout` later refuses as a duplicate — but by then it is a runtime failure
    // inside Figma rather than a test failure here.
    ok(new Set(set648.map(planComponentName)).size === 648,
      `figmaAnatomySet: every plan carries a distinct variant name (${new Set(set648.map(planComponentName)).size}/648)`);
    // And the plans are the SAME plans the hand-written loops produce — byte-identical, in order. This is
    // what makes the extraction a refactor rather than a second implementation: if the two ever disagree,
    // the three call sites below and the plugin's trigger are building different sets from one def.
    const handRolled: AnatomyPlan[] = [];
    for (const i of button.variants.intent!) for (const ap of button.variants.appearance!) for (const sz of button.variants.size)
      for (const st of fp.stateAxis!.values) for (const ld of [true, false]) for (const tr of [true, false])
        handRolled.push(figmaAnatomyPlan(button, sz, { leading: ld, trailing: tr, swapTarget: 'FPO-default-icon', intent: i, appearance: ap, state: st }));
    ok(JSON.stringify(handRolled) === JSON.stringify(set648),
      `figmaAnatomySet: byte-identical to the hand-written six loops, in order (${handRolled.length} vs ${set648.length})`);

    // It REFUSES an axis it cannot project rather than iterating around it. Silently omitting an axis is
    // the 189-vs-756 defect in a new place: the set builds, every member is named, and one axis of the
    // component is simply absent with nothing saying so. `figmaAnatomyPlan` takes intent/appearance/size
    // and nothing else, so a fourth declared axis has to fail loudly here.
    const setThrows = (label: string, f: () => unknown) => {
      let threw = false;
      try { f(); } catch { threw = true; }
      ok(threw, label);
    };
    setThrows('figmaAnatomySet: a declared variant axis it cannot project THROWS rather than being skipped',
      () => figmaAnatomySet({ ...button, variants: { ...button.variants, tone: ['a', 'b'] }, figmaProperties: { ...fp, variantAxes: [...fp.variantAxes, 'tone'] } } as ComponentDef));
    setThrows('figmaAnatomySet: an unprojectable SLOT axis throws too (the same hole from the other side)',
      () => figmaAnatomySet({ ...button, figmaProperties: { ...fp, slotAxes: [...fp.slotAxes!, { name: 'badge', part: 'leadingVisual' }] } } as ComponentDef));
    setThrows('figmaAnatomySet: a def with no figmaProperties block throws — nothing declares what to project',
      () => figmaAnatomySet({ ...button, figmaProperties: undefined } as ComponentDef));

    // Slot presence is only a question for a part that can be absent — an axis over a mandatory part
    // would emit a `false` coordinate no plan can build.
    const slotOnRequired = figmaPropertyErrors({ ...button, figmaProperties: { ...fp, slotAxes: [{ name: 'lab', part: 'label' }] } } as ComponentDef);
    ok(slotOnRequired.some((x) => /is not optional/.test(x)),
      'figmaProperties gate: a slot axis over a NON-optional part fails');
    const slotOnGhost = figmaPropertyErrors({ ...button, figmaProperties: { ...fp, slotAxes: [{ name: 'x', part: 'nope' }] } } as ComponentDef);
    ok(slotOnGhost.some((x) => /does not exist in anatomy.parts/.test(x)),
      'figmaProperties gate: a slot axis over a part that does not exist fails');
    const slotCollide = figmaPropertyErrors({ ...button, figmaProperties: { ...fp, slotAxes: [{ name: 'state', part: 'leadingVisual' }] } } as ComponentDef);
    ok(slotCollide.some((x) => /collides with an axis/.test(x)),
      'figmaProperties gate: a slot axis colliding with the state axis fails');

    // BOOLEAN is stated-empty on purpose. #487 §5: a schema listing booleans it cannot honor is
    // worse than one admitting there are none — and a Figma BOOLEAN drives one node's `visible`,
    // which none of fullWidth / isPending / isInactive / isDisabled actually is.
    ok(fp.booleans !== undefined && Object.keys(fp.booleans).length === 0,
      'figmaProperties: booleans is present and EMPTY — "considered, none survive" is a different statement from omitting the field');

    // A projection that is internally wrong must FAIL, not warn. Each of these is a real authoring
    // mistake that would otherwise surface as a component that fails at creation in someone's file.
    const withFp = (patch: Partial<typeof fp>): ComponentDef => ({ ...button, figmaProperties: { ...fp, ...patch } });
    const brokeFp = (label: string, re: RegExp, patch: Partial<typeof fp>) => {
      const errs = figmaPropertyErrors(withFp(patch));
      ok(errs.some((x) => re.test(x)), `figmaProperties gate: ${label}${errs.some((x) => re.test(x)) ? '' : ` — got [${errs.join('; ')}]`}`);
    };
    brokeFp('an axis that does not exist in variants fails', /is not an axis in variants/, { variantAxes: ['intent', 'nope'] });
    brokeFp('the same axis twice fails', /listed twice/, { variantAxes: ['intent', 'intent'] });
    brokeFp('an empty axis list fails', /non-empty/, { variantAxes: [] });
    brokeFp('dropping an axis with no codeOnly explanation fails', /not explained in anatomy.codeOnly/, { variantAxes: ['intent'] });
    brokeFp("a legacy state name fails (it is not in the def's states)", /is not one of states/, { stateAxis: { name: 'state', values: ['rest', 'active'] } });
    // `hover`, not `inactive` — dropping `inactive` is now the SHIPPING config (#536 item 4), so this
    // mutation has to drop a state with no codeOnly admission or it asserts nothing. Chosen because
    // `hover` appears nowhere in codeOnly prose at all.
    brokeFp('silently dropping a state fails', /under-represents the def/, { stateAxis: { name: 'state', values: button.states.filter((s) => s !== 'hover') } });
    // The tightened rule: `pending` and `disabled` are both NAMED in codeOnly prose written about
    // something else (the `modifiers` axis entry, and `inactive`'s shared-paint explanation). Under the
    // substring scan this replaced, dropping either went green on a sentence that was not about it.
    for (const s of ['pending', 'disabled'])
      brokeFp(`dropping '${s}' fails even though codeOnly MENTIONS it — the admission must lead with the state`,
        /under-represents the def/, { stateAxis: { name: 'state', values: button.states.filter((v) => v !== s) } });
    // And the admission must lead with the state as a WHOLE WORD. Without this the prefix test alone
    // lets a LONGER word admit a shorter state, which is not hypothetical: `disabledStrategy` is a real
    // lever name, so an entry opening with it would license dropping `disabled` while explaining a
    // contrast switch. Mutation-found — the delimiter half of the check survived deletion silently.
    {
      const errs = figmaPropertyErrors({
        ...button,
        anatomy: { ...button.anatomy!, codeOnly: [...button.anatomy!.codeOnly, 'disabledStrategy — a contrast lever, not an admission about the `disabled` state'] },
        figmaProperties: { ...fp, stateAxis: { name: 'state', values: button.states.filter((v) => v !== 'disabled') } },
      } as ComponentDef);
      ok(errs.some((x) => /state 'disabled' is not in the Figma state axis/.test(x)),
        `figmaProperties gate: a codeOnly entry opening with 'disabledStrategy' does NOT admit dropping 'disabled' — the state name must be a whole word${errs.length ? '' : ' — got no errors'}`);
    }
    brokeFp('a state axis named like a variant axis fails', /collides with a variants axis/, { stateAxis: { name: 'size', values: button.states } });
    brokeFp('an INSTANCE_SWAP pointed at a text node fails', /is kind 'text', expected 'slot'/, { swaps: { leadingVisual: 'label' } });
    brokeFp('a TEXT property pointed at a slot fails', /is kind 'slot', expected 'text'/, { texts: { children: { part: 'leadingVisual', default: 'Button' } } });
    brokeFp('a property pointed at a part that does not exist fails', /does not exist in anatomy.parts/, { texts: { children: { part: 'ghost', default: 'Button' } } });
    brokeFp('a property keyed on an undeclared prop fails', /is not a declared prop/, { texts: { notAProp: { part: 'label', default: 'Button' } } });
    brokeFp('a BOOLEAN toggling a REQUIRED part fails', /anatomy must allow the part to be absent/, { booleans: { fullWidth: 'label' } });
    brokeFp('two property kinds on one node fails', /carries at most one property kind/, { texts: { children: { part: 'label', default: 'Button' } }, booleans: { fullWidth: 'label' } });
    // The PLACEHOLDER is required to say something. Figma accepts `''` and #510's set is what that
    // produces: 21 variants, every binding resolved, nothing readable in any of them.
    brokeFp('a TEXT property with an empty default fails', /no placeholder/, { texts: { children: { part: 'label', default: '' } } });
    brokeFp('a whitespace-only default fails too — a space is not copy', /no placeholder/, { texts: { children: { part: 'label', default: '  ' } } });
    // A ZERO-WIDTH space passed this check until #513's review probed it: `.trim()` handles the space
    // family including U+00A0, but `'\u200B'.trim()` is truthy. It advances the caret by nothing, which
    // is the exact condition the field exists to catch. Written as an escape because the literal
    // character is invisible here too — a reader could not tell this case from the empty-string one.
    brokeFp('a zero-width space fails — the test is whether the label RENDERS, not whether the string is non-empty',
      /no placeholder/, { texts: { children: { part: 'label', default: '\u200B' } } });
    ok(figmaPropertyErrors({ ...button, anatomy: undefined }).some((x) => /requires `anatomy`/.test(x)),
      'figmaProperties gate: a projection without anatomy fails (its maps target anatomy parts)');
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

  // NO async IIFE — every pass must return its counts to the PASTING AGENT. `figma_execute` neither
  // awaits nor unwraps a returned Promise, so a `(async()=>{...})()` wrapper handed the caller
  // `result: undefined` while still reporting `success: true`: the created / bound / skipped / miss
  // counts each pass computes were invisible, and the write path only LOOKED verified. Top-level
  // `await` is supported, so the wrapper was pure loss. Asserted per pass — the whole value of these
  // payloads is that a paste can be checked, and one re-wrapped pass is one blind pass.
  for (const name of passOrder()) {
    const js = passJs('nb', name);
    ok(!/\(async\s*\(\)\s*=>\s*\{/.test(js) && !/\}\)\(\)\s*$/.test(js.trim()),
      `materialise: pass '${name}' emits top-level await, NOT an async IIFE (figma_execute drops the Promise → result: undefined)`);
    // `dims-create` returns a bare array (one entry per collection) rather than an object — both are
    // structured results, so match a top-level `return` of either shape, not an object literal alone.
    ok(/^\s*return\s*[{[]/m.test(js) || /^\s*return\s+\w+;\s*$/m.test(js),
      `materialise: pass '${name}' returns a structured result the pasting agent can verify`);
  }
}

// #479 — the `verify` pass wiring: the paste path's half of the prune report. `pruneReport` above
// covers the algorithm; this covers that the `verify` payload actually EMBEDS it against the real
// plan for a brand, rather than the two silently drifting apart. What this can't do without a live
// Figma file is prove the pasted JS finds the RIGHT orphans in a REAL file — that needs the same
// live materialisation drive #479 itself was found on (Prism Test File v2), which is out of reach
// here; the plugin path's end-to-end shim coverage (`apps/plugin/test-write.ts`) is the nearest thing to
// that this repo has, and it exercises the algorithm this pass mirrors, not this pass's own string.
{
  const verify = passJs('nb', 'verify');
  ok(verify.includes('pruneReport') && verify.includes('orphanReason') && verify.includes('const orphans='),
    'materialise: verify pass embeds the #479 prune-report + reason classifier');
  ok(verify.includes("findCol('core-palette')"),
    'materialise: verify pass reads back core-palette too, not just color — #479 measured its drift as 222 vs a 122-row plan');

  // The embedded PLANNED_PALETTE / PLANNED_COLOR arrays must be the REAL plan for this brand, not a
  // stale or partial one — parse them out of the payload and compare to `planFor`'s own output via
  // the public plan-building path (buildWritePlan over the emitted files), the same equality style
  // the typography block below uses for font/style/text-style plans.
  const plan = buildWritePlan({
    palette: JSON.parse(readFileSync(resolve(HERE, 'out/figma/nb/core-palette.json'), 'utf8')),
    color: ['light', 'dark', 'hc-light', 'hc-dark'].map((m) => JSON.parse(readFileSync(resolve(HERE, `out/figma/nb/color.${m}.json`), 'utf8'))),
  });
  const paletteMatch = verify.match(/const PLANNED_PALETTE=(\[.*?\]);/);
  const colorMatch = verify.match(/const PLANNED_COLOR=(\[.*?\]);/);
  ok(!!paletteMatch && !!colorMatch, 'materialise: verify pass carries PLANNED_PALETTE + PLANNED_COLOR name arrays');
  if (paletteMatch && colorMatch) {
    const embeddedPalette: string[] = JSON.parse(paletteMatch[1]);
    const embeddedColor: string[] = JSON.parse(colorMatch[1]);
    ok(JSON.stringify(embeddedPalette) === JSON.stringify(plan.palette.map((r) => r.name)),
      'materialise: verify pass\'s embedded planned-palette names are IDENTICAL to the real nb plan (no drift between the diff and what actually gets written)');
    ok(JSON.stringify(embeddedColor) === JSON.stringify(plan.color.create.map((r) => r.name)),
      'materialise: verify pass\'s embedded planned-color names are IDENTICAL to the real nb plan');
  }

  // Never a deletion — the payload must contain no Figma removal call. Same restraint the plugin
  // path is mutation-tested for (#479's "simulating a prune lane" mutant); here it's a static check
  // that this generated string never even calls the API that would do it.
  ok(!/\.remove\(\)/.test(verify), 'materialise: verify pass contains no `.remove()` call — report only, nothing here can delete a variable');
}

// ------------------------------- materialise-to-figma: the TYPOGRAPHY + STYLE paste paths (#464)
// The same gap #342 closed for floats, for the last three axes. The plugin has written all five
// since #237; the paste path — the only one an MCP-driven session can use — had colour and floats,
// so `core-font`, `type-sets`, 38 Text Styles and 14 Effect Styles were unreachable over MCP. An
// agent could theme a file and get every colour and dimension and no typography at all.
//
// The load-bearing assertion is not "the passes exist" but "the file-read plan EQUALS the
// theme-built plan". Both write paths project one plan by construction; these lock that in, so a
// change to either reshape fails here rather than in a Figma file three surfaces away.
{
  const t = nbTheme();

  // Axis parity, the drift check that would have caught the gap when it opened.
  const pluginFontAxes = buildFontVarPlan(t).map((p) => p.name).sort();
  const pasteFontAxes = fontCollections('nb').sort();
  ok(JSON.stringify(pluginFontAxes) === JSON.stringify(pasteFontAxes),
    `materialise: the paste path covers every font collection the plugin path writes${JSON.stringify(pluginFontAxes) === JSON.stringify(pasteFontAxes) ? ` (${pasteFontAxes.join(', ')})` : ` — plugin [${pluginFontAxes}] vs paste [${pasteFontAxes}]`}`);

  // PLAN EQUALITY — the file-read reshapes against the theme-built ones, per axis. `nb` is the
  // fixture both paths can build, so this is a true equality rather than a shape comparison.
  const rd = (f: string): unknown => JSON.parse(readFileSync(resolve(HERE, `out/figma/nb/${f}`), 'utf8'));
  const coreFont = rd('core-font.json') as Parameters<typeof fontVarPlanFrom>[0][number];
  const fluidFiles = ['mobile', 'desktop'].map((m) => rd(`type-sets.${m}.json`) as typeof coreFont);
  ok(JSON.stringify(fontVarPlanFrom([coreFont], fluidFiles)) === JSON.stringify(buildFontVarPlan(t)),
    'materialise: the file-read font plan is IDENTICAL to the theme-built font plan (the two write paths cannot drift)');
  ok(JSON.stringify(stylesPlanFromFiles(rd('shadow-styles.json') as never, rd('gradient-styles.json') as never)) === JSON.stringify(buildStylesPlan(t)),
    'materialise: the file-read styles plan is IDENTICAL to the theme-built styles plan');
  ok(JSON.stringify(textStylePlanFromFiles(rd('text-styles.json') as never, coreFont)) === JSON.stringify(buildTextStylePlan(t)),
    'materialise: the file-read text-style plan is IDENTICAL to the theme-built text-style plan');

  const fontVars = passJs('nb', 'font-vars');
  const textStyles = passJs('nb', 'text-styles');
  const styles = passJs('nb', 'styles');

  // `core-font` mixes STRING (family) and FLOAT (size/weight) in ONE collection — the reason this
  // pass carries a per-row type code where `dims-create` hardcodes 'FLOAT'. A family var created as
  // FLOAT accepts no string value and fails only when a Text Style tries to bind it, so both codes
  // must reach the payload, and the decode must THROW on an unknown one rather than default.
  ok(fontVars.includes("TY={s:'STRING',f:'FLOAT'}"), 'materialise: font-vars carries both variable types (STRING family + FLOAT size/weight in one collection)');
  ok(/,"s",/.test(fontVars) && /,"f",/.test(fontVars), 'materialise: font-vars rows use both type codes');
  ok(/throw new Error\('unknown scope code/.test(fontVars), 'materialise: an unknown font scope code THROWS at paste time (never silently decodes to undefined)');
  // This is the assertion that caught FONT_FAMILY having no code at all — it's a STRING scope, so the
  // FLOAT map (built for the dims lane) never needed one, and `core-font` is the only collection that
  // mixes the two. Every family var would have pasted with `scopes: [undefined]`.
  ok(!/"[a-z*]*\?[a-z*]*",/.test(fontVars), 'materialise: every font scope encodes to a known code (no `?` in the payload)');
  // The decode map is a bijection or it silently mis-scopes: two scopes sharing a letter means one
  // decodes to the other's enum, which the Plugin API accepts and no read-back would question.
  const codeMap = JSON.parse(fontVars.match(/const FSC=(\{[^}]*\});/)![1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"')) as Record<string, string>;
  ok(new Set(Object.values(codeMap)).size === Object.keys(codeMap).length,
    `materialise: the font scope code map is a bijection (${Object.keys(codeMap).length} codes → ${new Set(Object.values(codeMap)).size} distinct scopes)`);
  ok(codeMap.m === 'FONT_FAMILY', 'materialise: FONT_FAMILY (the one STRING scope) has its own code, not a float code reused');

  // The weight-role aliases are intra-collection (`font/weight-role/strong` → `font/weight/700`), so
  // one payload does create-then-bind in two loops. Every target must be created by the same pass.
  const fontCreated = new Set<string>();
  for (const m of fontVars.matchAll(/\["([a-z0-9/\-.]+)","[sf]"/g)) fontCreated.add(m[1]);
  const fontTargets = new Set<string>();
  for (const m of fontVars.matchAll(/,\["(font\/weight\/\d+)"\]\]/g)) fontTargets.add(m[1]);
  ok(fontCreated.size === 50, `materialise: font-vars creates all 50 typography variables (${fontCreated.size})`);
  ok(fontTargets.size === 5 && [...fontTargets].every((x) => fontCreated.has(x)),
    `materialise: every weight-role alias target is created by the same pass (${fontTargets.size} roles)`);

  // Text Styles must be pasted AFTER the vars they bind — the one real cross-lane ordering rule.
  ok(passOrder().indexOf('font-vars') < passOrder().indexOf('text-styles'),
    'materialise: font-vars is pasted before text-styles (setBoundVariable resolves its targets by name)');
  const plan = buildTextStylePlan(t);
  const boundTargets = new Set(plan.flatMap((r) => [r.fontFamilyVar, r.fontSizeVar, r.fontWeightVar]).filter(Boolean));
  const unreachable = [...boundTargets].filter((v) => !fontCreated.has(v));
  ok(unreachable.length === 0, `materialise: every variable a Text Style binds is created by font-vars${unreachable.length ? ` — UNREACHABLE: ${unreachable.join(', ')}` : ` (${boundTargets.size} vars)`}`);

  // Skip-with-warning, not substitute-or-throw (the #237 owner decision). A paste path that threw on
  // one missing weight would lose all 38 styles instead of one.
  ok(/skipped\.push/.test(textStyles) && !/throw/.test(textStyles),
    'materialise: text-styles SKIPS an unloadable font with a warning (never a wrong substituted face, never a throw)');
  // Load each DISTINCT face once. 38 styles resolve to 4 faces, and 38 sequential awaits overran
  // `figma_execute`'s 5s ceiling on the live drive — a per-style load is a budget bug, not a style
  // preference, so assert the count against the plan's real face cardinality.
  const faceKeys = new Set(plan.map((r) => `${r.fontFamilyPrimary} / ${r.fontStyle}`));
  ok(faceKeys.size < plan.length,
    `materialise: the text-style plan has fewer distinct faces than styles (${faceKeys.size} faces / ${plan.length} styles) — so de-duping the loads is worth it`);
  ok((textStyles.match(/loadFontAsync/g) ?? []).length === 1,
    'materialise: text-styles calls loadFontAsync from ONE hoisted de-duped loop, not once per style (the 5s figma_execute ceiling)');
  // The #146 lesson: the name map must be UNFILTERED — a type-filtered fetch misses the STRING
  // family var while finding the FLOAT size/weight ones, so families silently fail to bind.
  ok(/getLocalVariablesAsync\(\)/.test(textStyles) && !/getLocalVariablesAsync\('/.test(textStyles),
    'materialise: text-styles builds its name map from an UNFILTERED getLocalVariablesAsync (STRING family + FLOAT size/weight)');
  // #377 nearly baked every style at 100% line height silently. Assert the real spread reaches the
  // payload rather than trusting the plan — this is the layer where that drop would have shown.
  const lh = new Set(plan.map((r) => r.lineHeightPct));
  ok(lh.size > 1 && !(lh.size === 1 && lh.has(100)), `materialise: text-styles carries a real line-height spread (${[...lh].sort((a, b) => a - b).join('/')}) — not all-100 (#377)`);
  ok(plan.every((r) => r.description !== ''), 'materialise: every text-style row carries its description (the style-panel documentation)');

  // Styles: BOTH shadow sets, because Effect Styles can't carry Figma modes — a component swaps the
  // pair by mode instead. A pass that wrote only `shadow/*` would leave dark elevation unthemeable.
  ok(styles.includes('"shadow/xs"') && styles.includes('"shadow-dark/xs"'),
    'materialise: styles writes BOTH the light `shadow/*` and dark `shadow-dark/*` Effect Style sets');
  ok(styles.includes('createEffectStyle') && styles.includes('createPaintStyle'),
    'materialise: styles covers both Effect (shadow) and Paint (gradient) styles');
  // nb ships no gradients; aurora does — so the Paint lane is only actually exercised there.
  const aurora = passJs('aurora', 'styles');
  ok(/GRADIENT_LINEAR/.test(aurora) && /GRADIENT_RADIAL/.test(aurora),
    'materialise: a brand WITH gradients emits both paint types (aurora — nb ships none, so nb alone would not exercise this)');
  ok(/gradientTransform/.test(aurora), 'materialise: the paint rows carry the computed gradientTransform (Figma positions gradients by an affine transform, not an angle)');
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
// once in `apps/studio/src/main.ts` (typed as a separator, broke a Playwright `select_option` because the
// option values no longer matched) and once in `tree.ts:548`'s `stackKey`, where it hid the engine's
// largest source file from content search.
//
// Both cases were the same slip: intending the ESCAPE (a backslash-u sequence) and emitting the CHARACTER. The
// escape is byte-identical at runtime, so there is never a reason for the literal byte to be here —
// which makes this a cheap total ban rather than a judgement call. Scans the engine plus both
// bundled surfaces, since the class has now appeared in each.
{
  const roots = [HERE, resolve(HERE, '../../apps/studio/src'), resolve(HERE, '../../apps/plugin/src')];
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

// --------------------------------------------------------------- versioning
// The token-NAME contract (#464). `token-contract.ts --check` is the shipping gate; these are the
// properties that gate depends on being true, tested where a failure names the cause rather than
// just the symptom. The last one is the important one: it asserts the COMMITTED baseline still
// matches the engine, so a stale baseline fails the unit suite too and not only the CLI.
{
  ok(satisfiesBump('1.0.0', '1.0.0', 'none'), 'version: an unchanged surface needs no bump');
  ok(!satisfiesBump('1.0.0', '1.0.1', 'none'), 'version: "none" means EQUAL — a stray bump is still a mismatch to explain');
  ok(satisfiesBump('1.0.0', '2.0.0', 'major') && !satisfiesBump('1.0.0', '1.9.9', 'major'),
    'version: a major change needs a major bump — no amount of minor/patch substitutes');
  ok(satisfiesBump('1.0.0', '1.1.0', 'minor') && satisfiesBump('1.0.0', '2.0.0', 'minor'),
    'version: a minor change accepts a minor OR a major bump (over-bumping is safe, under-bumping is not)');
  ok(!satisfiesBump('1.0.0', '1.0.1', 'minor'), 'version: a patch bump does NOT cover an added path');

  const base = { contractVersion: '1.0.0', engineVersion: '0.1.0', note: '', corpus: [],
    guaranteed: { 'color.text.primary': 'color', 'space.100': 'dimension' }, brandDependent: [], deprecations: [] };
  ok(classify(base, { ...base.guaranteed }).level === 'none', 'contract: an identical surface classifies as no change');
  ok(classify(base, { 'space.100': 'dimension' }).level === 'major', 'contract: a REMOVED path is breaking');
  ok(classify(base, { ...base.guaranteed, 'space.200': 'dimension' }).level === 'minor', 'contract: an ADDED path is minor — it cannot break an existing reference');
  const retyped = classify(base, { 'color.text.primary': 'string', 'space.100': 'dimension' });
  ok(retyped.level === 'major' && retyped.retyped[0]?.from === 'color',
    'contract: a RETYPED path is breaking and reports both types (a same-name token of a new type breaks a consumer that did nothing)');

  // A rename ships its replacement; a replacement that does not exist is worse than no table at all,
  // because it sends every consumer to a path the engine never emits.
  const dep = [{ path: 'color.text.primary', replacedBy: 'space.100', since: '2.0.0' }];
  const good = classify(base, { 'space.100': 'dimension' }, dep);
  ok(good.migrated.length === 1 && good.danglingDeprecations.length === 0 && good.level === 'major',
    'contract: a deprecated removal still classifies MAJOR, but carries the replacement path');
  ok(classify(base, { ...base.guaranteed }, [{ path: 'a', replacedBy: 'nope.nowhere', since: '2.0.0' }]).danglingDeprecations.length === 1,
    'contract: a deprecation pointing at a path the engine does not emit is caught');

  const live = buildContract();
  const committed = JSON.parse(readFileSync(resolve(HERE, 'schema', 'token-contract.json'), 'utf8'));
  const guaranteedCount = Object.keys(live.guaranteed).length;
  // Non-vacuity floor. Not an exact count — the baseline file already pins that, and duplicating it
  // here would just be two things to update. This guards the COMPUTATION going dark instead: the
  // first cut of this intersected paths WITH the configurable root included (`nbds.*` vs `prism.*`)
  // and returned 0, which would have made every assertion below vacuously true.
  ok(guaranteedCount > 400, `contract: the guaranteed surface is non-empty and substantial (${guaranteedCount} paths — a root-prefix bug here yields 0)`);
  ok(live.corpus.length === 5, `contract: the corpus spans both dialects, the legacy fixture and the minimal input (${live.corpus.length} brands)`);
  for (const { id, theme } of corpus()) {
    const paths = pathsOf(theme);
    const missing = Object.keys(live.guaranteed).filter((p) => !paths.has(p));
    ok(missing.length === 0, `contract: '${id}' emits every guaranteed path` + (missing.length ? ` — MISSING ${missing.slice(0, 5).join(', ')}` : ''));
  }
  ok(classify(committed, live.guaranteed).level === 'none',
    'contract: the COMMITTED baseline still matches the engine (run token-contract.ts --accept after reviewing the diff)');
  ok(committed.contractVersion === CONTRACT_VERSION,
    `contract: the baseline's stamped version tracks CONTRACT_VERSION (${committed.contractVersion} vs ${CONTRACT_VERSION})`);

  // One version, stamped everywhere it is claimed. Two hardcoded copies is how a server ends up
  // reporting a version its own artifacts disagree with.
  ok(SERVER_INFO.version === ENGINE_VERSION, 'version: the MCP serverInfo reports the engine version rather than a second hardcoded copy');
  const stamped = buildTree(brandTheme(MINIMAL_BRAND)).tree as any;
  ok(stamped.$extensions?.generator?.version === ENGINE_VERSION,
    'version: every emitted tree carries the engine version, so a suspect value can be traced to the code that produced it');
}

// --------------------------------------------------------- vocabulary (#471)
// Named stops + personality traits. The interesting assertions are not "does 'soft' become 1.5" but
// the three that keep the layer honest: stops land on the lever's own step grid, a trait cannot
// target a lever that does not exist, and an explicit value always beats an inferred one.
{
  const schema = JSON.parse(readFileSync(resolve(HERE, 'schema', 'theme-schema.json'), 'utf8'));
  const base = { id: 'v', primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.008 } };
  // Fail SOFT. A trait carrying a value its lever does not accept (`density: 'roomy'`) throws deep
  // inside `componentSizes`, and an unguarded call took the entire 1,409-assertion run down with it
  // — the static checks above had already recorded the real cause, but the report never printed, so
  // one defect surfaced as zero. Same lesson the MCP suite learned: a suite that dies on the first
  // defect reports one problem per run, or none. Returns null so a downstream comparison fails
  // rather than passing vacuously.
  const build = (extra: Record<string, unknown>): ReturnType<typeof brandTheme> | null => {
    try { return brandTheme({ ...base, ...extra } as any); }
    catch (e) { fails.push(`vocabulary: brandTheme threw on ${JSON.stringify(extra)} — ${(e as Error).message}`); return null; }
  };
  /** A build's radius value, or NaN — never undefined, so `a === b` cannot pass by both being absent. */
  const radiusOf = (extra: Record<string, unknown>): number => build(extra)?.dims.radiusScaleValue ?? NaN;

  // ---- stops are real positions on the lever they belong to ----
  for (const [key, stops] of Object.entries(SLIDER_STOPS)) {
    const lever = leverManifest.find((l) => l.key === key);
    ok(lever !== undefined, `vocabulary: '${key}' names a real lever (a renamed lever must not leave stops orphaned and unadvertised)`);
    if (!lever) continue;
    const bad = Object.entries(stops).filter(([, v]) =>
      (lever.min !== undefined && v < lever.min) || (lever.max !== undefined && v > lever.max)
      || (lever.step !== undefined && Math.abs(Math.round(v / lever.step) * lever.step - v) > 1e-9));
    ok(bad.length === 0,
      `vocabulary: every '${key}' stop is inside the lever's range and on its step grid`
      + (bad.length ? ` — OFF-GRID: ${bad.map(([n, v]) => `${n}=${v}`).join(', ')}` : ''));
    ok(lever.stops === stops, `vocabulary: the '${key}' manifest entry carries the SAME stops object the engine resolves against (joined, not restated)`);
  }

  // ---- traits target real levers, with values those levers accept ----
  const leverKeys = new Set(leverManifest.map((l) => l.key));
  for (const [name, trait] of Object.entries(TRAITS)) {
    const targets = Object.keys(trait.levers);
    ok(targets.length >= 2, `vocabulary: trait '${name}' moves ${targets.length} levers — a one-lever trait would just be a slower named stop`);
    const unknown = targets.filter((k) => !leverKeys.has(k));
    ok(unknown.length === 0, `vocabulary: every lever trait '${name}' targets exists` + (unknown.length ? ` — UNKNOWN: ${unknown.join(', ')}` : ''));
    for (const [lever, value] of Object.entries(trait.levers)) {
      if (SLIDER_STOPS[lever]) {
        ok(SLIDER_STOPS[lever][String(value)] !== undefined, `vocabulary: trait '${name}' sets ${lever} to a declared stop ('${String(value)}')`);
      } else {
        // A non-slider target must be a legal enum value on that lever, or the trait silently
        // produces an input the schema rejects — a failure the author cannot see from the trait name.
        const opts = leverManifest.find((l) => l.key === lever)?.options?.map((o) => o.value);
        ok(opts !== undefined && opts.includes(value as string | number),
          `vocabulary: trait '${name}' sets ${lever} to a value that lever accepts ('${String(value)}' in [${opts?.join(', ')}])`);
      }
    }
    ok(trait.why.length > 20, `vocabulary: trait '${name}' cites the brief language it was read from (an uncited mapping is an invention)`);
  }

  // ---- the structural invariant ----
  // `personality: ['soft']` and `radiusScale: 'soft'` must agree, and they do BY CONSTRUCTION because
  // TRAITS names stops rather than restating numbers. Asserted anyway: it is the property a future
  // edit is most likely to break by "simplifying" a trait to a literal.
  const viaTrait = radiusOf({ personality: ['soft'] });
  ok(Number.isFinite(viaTrait) && viaTrait === radiusOf({ radiusScale: 'soft' }),
    "vocabulary: personality ['soft'] and radiusScale: 'soft' resolve to the same value");
  ok(radiusOf({ radiusScale: 'round' }) === SLIDER_STOPS.radiusScale.round, 'vocabulary: a named stop resolves to its declared number');
  ok(radiusOf({ radiusScale: 1.5 }) === 1.5, 'vocabulary: a raw number still passes straight through (stops are additive, not a replacement)');

  // ---- precedence: explicit beats inferred, first trait beats later ones ----
  ok(radiusOf({ personality: ['generous'], radiusScale: 0 }) === 0,
    'vocabulary: an explicitly set lever beats a personality trait (an advisory layer must never overwrite a stated choice)');
  ok(build({ personality: ['generous'], radiusScale: 0 })?.dims.density === 'spacious',
    'vocabulary: the same trait still fills the levers the author left absent');
  ok(radiusOf({ personality: ['soft', 'sharp'] }) === SLIDER_STOPS.radiusScale.soft,
    'vocabulary: between conflicting traits the first listed wins (order is the stated priority)');
  // The attribution bug this suite exists to prevent: a presence-first check reported every
  // trait-vs-trait collision as "set explicitly", crediting the author for the engine's own choice.
  const conflict = build({ personality: ['soft', 'sharp'] })?.notes.find((n) => n.startsWith("personality 'sharp'"));
  ok(conflict?.includes("already set by 'soft'") === true,
    `vocabulary: a trait-vs-trait collision is attributed to the TRAIT that won, not to the author — ${conflict?.slice(0, 90)}`);
  const explicit = build({ personality: ['generous'], radiusScale: 0 })?.notes.find((n) => n.startsWith("personality 'generous'"));
  ok(explicit?.includes('(set explicitly)') === true, 'vocabulary: an author-set lever IS attributed to the author');

  // ---- every inference is logged, and nothing leaks downstream ----
  ok(build({ personality: ['calm'] })?.notes.some((n) => n.startsWith("personality 'calm' →") && n.includes('[harbor:')),
    'vocabulary: each applied trait logs what it set AND the brief language justifying it');
  ok(build({ radiusScale: 'soft' })?.notes.some((n) => n === "radiusScale 'soft' → 1.5"), 'vocabulary: a resolved stop is logged with both the word and the number');
  ok(build({})?.notes.every((n) => !n.startsWith('personality')), 'vocabulary: a brand that declares no personality gets no personality notes');
  ok((resolveVocabulary({ ...base, personality: ['calm'] }).input as Record<string, unknown>).personality === undefined,
    'vocabulary: `personality` is stripped after resolution — it is an authoring field, not a lever the theme builder should see');

  // ---- unrecognized words fail loud, at BOTH enforcement points ----
  // These bypass `build` deliberately: it swallows throws to keep the run alive, which is exactly
  // the behaviour under test here.
  let threwStop = false; try { brandTheme({ ...base, radiusScale: 'banana' } as any); } catch { threwStop = true; }
  ok(threwStop, 'vocabulary: an unknown stop name throws (the author believes they set that lever)');
  let threwTrait = false; try { brandTheme({ ...base, personality: ['playful'] } as any); } catch { threwTrait = true; }
  ok(threwTrait, 'vocabulary: an unknown trait throws — the engine agrees with the schema enum rather than diverging from it');
  ok(validateBrandInput({ ...base, radiusScale: 'soft' }).length === 0, 'vocabulary: the SCHEMA accepts a named stop');
  ok(validateBrandInput({ ...base, radiusScale: 'banana' }).length > 0, 'vocabulary: the schema rejects an undeclared stop name');
  ok(validateBrandInput({ ...base, personality: ['soft', 'generous'] }).length === 0, 'vocabulary: the schema accepts a personality list');
  ok(validateBrandInput({ ...base, personality: ['playful'] }).length > 0, 'vocabulary: the schema rejects a trait outside the vocabulary');
  // Contract and engine must advertise the SAME vocabulary — an agent reads the schema enum to learn
  // what it may pass, so a schema listing a trait the engine does not implement is a broken promise.
  ok(JSON.stringify([...(schema.properties.personality.items.enum as string[])].sort()) === JSON.stringify(Object.keys(TRAITS).sort()),
    'vocabulary: the schema enum and TRAITS list exactly the same traits');
  for (const key of Object.keys(SLIDER_STOPS)) {
    const node = key.split('.').reduce<any>((n, seg) => n?.properties?.[seg], { properties: schema.properties });
    const branch = node?.oneOf?.find((b: any) => b.type === 'string');
    ok(JSON.stringify(branch?.enum?.slice().sort()) === JSON.stringify(Object.keys(SLIDER_STOPS[key]).sort()),
      `vocabulary: the schema's '${key}' stop enum matches SLIDER_STOPS exactly`);
  }
}

// ---- figmaArtifacts: the per-mode FILENAME conventions regen cannot see ------------------------
// `regen --check` proves this extraction is byte-identical, but only over nb/aurora/wendys — and all
// three take the SINGLE-FILE branch of both conditionals. So the byte proof covers half of each `if`,
// and the per-mode halves (`core-font.<mode>.json`, `radius.<mode>.json`) had no coverage at all.
//
// That asymmetry is the point worth keeping: a corpus proves what the corpus contains. These two
// conventions exist so a brand NOT using the feature stays byte-identical to the pre-feature world,
// which means the single-file branch is the one everything already tests and the per-mode branch is
// the one nothing did.
{
  const base = { id: 't', primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.008 } };
  const pathsOf = (input: unknown): string[] => figmaArtifacts(brandTheme(input as never)).artifacts.map((a) => a.path);

  const plain = pathsOf(base);
  ok(plain.filter((p) => /^core-font\./.test(p)).join() === 'core-font.json',
    'figmaArtifacts: a brand with no per-mode typography emits ONE core-font.json (pre-Phase-D byte shape)');
  ok(plain.filter((p) => /^radius\./.test(p)).join() === 'radius.json',
    'figmaArtifacts: a non-wireframe brand emits ONE radius.json (pre-Pillar-1b byte shape)');

  const perModeFont = pathsOf({ ...base, families: { body: 'Inter', display: 'Inter' }, modeLevers: { dark: { families: { body: 'Georgia' } } } });
  ok(perModeFont.filter((p) => /^core-font\./.test(p)).sort().join() === 'core-font.Default.json,core-font.dark.json',
    'figmaArtifacts: a per-mode FAMILY override switches core-font to per-mode filenames');

  const wire = pathsOf({ ...base, modes: ['light', 'dark', 'wireframe'] });
  ok(wire.filter((p) => /^radius\./.test(p)).sort().join() === 'radius.Default.json,radius.wireframe.json',
    'figmaArtifacts: a wireframe brand switches radius to per-mode filenames');

  // Content shape: every artifact is a path plus the exact bytes, trailing newline included — the
  // formatting `regen --check` compares. A caller writing these must need no post-processing.
  const arts = figmaArtifacts(brandTheme(base as never)).artifacts;
  ok(arts.length > 10 && arts.every((a) => a.path.endsWith('.json') && a.content.endsWith('\n')),
    `figmaArtifacts: every artifact is a .json path with a trailing newline (${arts.length} files)`);
  ok(arts.every((a) => { try { JSON.parse(a.content); return true; } catch { return false; } }),
    'figmaArtifacts: every artifact parses as JSON');
  ok(new Set(arts.map((a) => a.path)).size === arts.length,
    'figmaArtifacts: no two artifacts claim the same path (a collision would silently drop a file)');
}

// ---- export_theme: the manifest is the result, and outDir is model-controlled ------------------
{
  const xbrand = { id: 'x', primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.008 } };
  // An in-memory fake for the ExportIo port — the write path is fully exercised, no disk touched.
  const mkFake = () => { const files = new Map<string, string>(); const dirs: string[] = [];
    return { files, dirs, io: { mkdir: (d: string) => { dirs.push(d); }, writeFile: (q: string, c: string) => { files.set(q, c); } } }; };

  // outDir is the one argument on this surface that can do damage rather than merely be wrong, so
  // both refusals are asserted directly rather than trusted to the schema.
  ok(!!unsafeOutDir('/etc/prism3'), 'export_theme: an absolute outDir is refused');
  ok(!!unsafeOutDir('C:\\tokens'), 'export_theme: a Windows absolute outDir is refused');
  ok(!!unsafeOutDir('../../etc'), 'export_theme: a `..` outDir is refused');
  ok(!!unsafeOutDir('tokens/../../etc'), 'export_theme: `..` is refused mid-path, not just at the front');
  ok(!!unsafeOutDir(''), 'export_theme: an empty outDir is refused');
  ok(unsafeOutDir('./tokens') === undefined && unsafeOutDir('out/brand') === undefined,
    'export_theme: an ordinary relative outDir is allowed');

  // No port granted -> the tool refuses rather than importing fs behind the caller's back.
  ok(mcpCallTool('export_theme', { brand: xbrand, outDir: './t' }, undefined, undefined).isError === true,
    'export_theme: without a granted ExportIo the tool errors (purity is not bypassed)');

  const f = mkFake();
  const res = mcpCallTool('export_theme', { brand: xbrand, outDir: './tok' }, undefined, f.io);
  ok(!res.isError, 'export_theme: writes with a granted port');
  const manifest = res.structuredContent as { total: number; totalBytes: number };
  ok(manifest.total === f.files.size && manifest.total > 10,
    `export_theme: the manifest counts what was actually written (${manifest.total})`);
  ok([...f.files.keys()].every((k) => k.startsWith('./tok/')), 'export_theme: every file lands under outDir');
  ok(f.files.has('./tok/tokens.json') && f.files.has('./tok/ai-metadata.json'),
    'export_theme: the DTCG tree and the agent metadata are written');
  ok([...f.files.keys()].some((k) => k.startsWith('./tok/figma/')), 'export_theme: the Figma collection set is written');

  // THE POINT OF THE TOOL: the result must not carry the payload. The non-vacuity floor matters —
  // "the result is small" is trivially true if nothing was written, so the size of the EXPORT is
  // asserted first and the result is compared against it.
  const resultChars = JSON.stringify(res.structuredContent).length;
  const writtenChars = [...f.files.values()].reduce((n, c) => n + c.length, 0);
  ok(writtenChars > 200_000, `export_theme: the export is genuinely large (${writtenChars.toLocaleString()} chars) — the next assertion is not vacuous`);
  ok(resultChars < 20_000, `export_theme: the RESULT is a manifest, not the content (${resultChars.toLocaleString()} vs ${writtenChars.toLocaleString()} written)`);
  ok(manifest.totalBytes === writtenChars, 'export_theme: totalBytes reports the real byte count');

  const g = mkFake();
  mcpCallTool('export_theme', { brand: xbrand, outDir: './t2', include: ['tokens'] }, undefined, g.io);
  ok(g.files.size === 1 && g.files.has('./t2/tokens.json'), 'export_theme: include:[tokens] writes only the DTCG tree');
  ok(mcpCallTool('export_theme', { brand: xbrand, outDir: './t3', include: ['nope'] }, undefined, mkFake().io).isError === true,
    'export_theme: an unknown include section errors rather than silently writing nothing');
  ok(EXPORT_SECTIONS.length === 3, 'export_theme: three artifact families');

  // A bad brand must fail BEFORE anything is written — a partial export is worse than none.
  const h = mkFake();
  const badRes = mcpCallTool('export_theme', { brand: { nope: true }, outDir: './t4' }, undefined, h.io);
  ok(badRes.isError === true && h.files.size === 0,
    'export_theme: an invalid brand writes NOTHING (validation precedes the first write)');
  // ...and specifically via SCHEMA validation, not merely by brandTheme throwing. Mutation showed the
  // assertion above passes either way — a throw also writes nothing — so it could not tell a
  // structured, actionable error list from an incidental crash. The named errors are the difference
  // between an agent that can fix its input and one that only knows it failed.
  const badPayload = JSON.parse(badRes.content[0].text) as { error?: string; errors?: string[] };
  ok(/schema validation/i.test(badPayload.error ?? '') && (badPayload.errors?.length ?? 0) >= 3
     && badPayload.errors!.some((e) => /missing required 'id'/.test(e)),
    'export_theme: the failure is a NAMED schema error list, not an incidental throw');
}

// ---- #536 item 2: the overlay was declared, validated, and unprojected -------------------------
// `spinner` had `kind: 'overlay'` and `replaces: 'leadingVisual'`, both gated — and `anatomy-figma`
// had zero occurrences of `overlay`/`replaces`/`spinner`, so `state=pending` emitted the same three
// parts as `rest`. The missing fact was WHEN: a declaration that omits its trigger is not
// projectable however complete it looks, and it looks complete because every field present is filled.
{
  const parts = (state: string, leading: boolean, appearance = 'filled'): string =>
    planPartNames(figmaAnatomyPlan(button, 'medium', { intent: 'primary', appearance, state, leading, trailing: false }).root).join(',');
  const render = (state: string, leading: boolean, appearance = 'filled'): string =>
    JSON.stringify(figmaAnatomyPlan(button, 'medium', { intent: 'primary', appearance, state, leading, trailing: false }).root);

  ok(parts('pending', true).includes('spinner'), `#536: state=pending projects the spinner (${parts('pending', true)})`);
  ok(!parts('pending', true).includes('leadingVisual'),
    '#536: the spinner REPLACES the leading visual rather than sitting beside it — one node per cell');
  ok(parts('pending', false).includes('spinner'),
    '#536: a pending button shows the spinner even with no leading slot — otherwise pending is invisible again');
  ok(!parts('rest', true).includes('spinner'), '#536: no spinner outside the state that declares it');
  ok(parts('rest', true).includes('leadingVisual'), '#536: rest still projects the leading visual');

  // The defect this closes, stated as the issue measured it.
  ok(render('pending', true) !== render('rest', true),
    '#536 item 2: pending no longer renders identically to rest (filled)');
  for (const app of ['outline', 'text']) {
    ok(render('pending', true, app) !== render('rest', true, app), `#536 item 2: pending differs from rest (${app})`);
  }

  // The spinner sits in the leading POSITION, not appended after the label — order is visual order.
  ok(parts('pending', true).indexOf('spinner') < parts('pending', true).indexOf('label'),
    '#536: the spinner takes the leading visual\'s position, before the label');

  // Padding asks about the CELL: a spinner is a glyph, so the leading inset must follow the visual
  // rule. Without this a pending button insets as though its leading cell were empty.
  const padOf = (state: string, leading: boolean): string =>
    figmaAnatomyPlan(button, 'medium', { intent: 'primary', appearance: 'filled', state, leading, trailing: false }).root.bound.paddingLeft;
  ok(padOf('pending', true) === padOf('rest', true),
    '#536: a pending button with a leading visual insets as though a visual is there — because one is (the spinner took that cell)');
  ok(padOf('rest', false) !== padOf('rest', true), 'padding: the slot-aware rule still distinguishes empty from filled at rest (control)');

  // REWRITTEN BY #612, and both of the assertions this replaces were PINNING THE DEFECT.
  //
  // They read `padOf('pending', false) === padOf('rest', true)` — a label-only pending button insets
  // like a button that HAS a leading visual — and `render('pending', false) === render('pending', true)`
  // — pending renders the same whether or not a leading visual was asked for. Both were true, both were
  // green, and together they describe a button that GROWS by 28px the moment it starts submitting: the
  // spinner arrived in a cell that did not exist at rest, and the left padding tightened to the visual
  // value to sit against it. The comment above the second one even called the collapse "correct".
  //
  // This is the shape worth naming: an assertion written from the same mental model as the code
  // CONFIRMS the model rather than testing it. Nothing here was measuring width, which is the only
  // thing the replace-the-leading-visual rule exists to protect, so the projection was free to break it
  // while three assertions reported clean. What follows measures width — the count of IN-FLOW cells
  // plus the resolved padding, which is exactly what determines a hug-sized frame's width — and does it
  // across ALL FOUR slot combinations rather than the one the old pair happened to sample.
  const widthShape = (state: string, leading: boolean, trailing: boolean) => {
    const p = figmaAnatomyPlan(button, 'medium', { intent: 'primary', appearance: 'filled', state, leading, trailing, swapTarget: 'FPO-default-icon' });
    // Absolutely-positioned children take no cell — that IS the mechanism — so they are excluded from
    // the cell count and their presence must not change the answer.
    const inFlow = (p.root.children ?? []).filter((c) => !c.absoluteCenter && !c.absoluteInset).map((c) => c.name);
    return JSON.stringify({ cells: inFlow.length, padL: p.root.bound.paddingLeft, padR: p.root.bound.paddingRight, gap: p.root.bound.itemSpacing });
  };
  for (const [ld, tr] of [[true, false], [false, false], [false, true], [true, true]] as [boolean, boolean][]) {
    ok(widthShape('pending', ld, tr) === widthShape('rest', ld, tr),
      `#612: a button entering pending does not change WIDTH — same in-flow cell count and same padding at leading=${ld} trailing=${tr} (rest ${widthShape('rest', ld, tr)} vs pending ${widthShape('pending', ld, tr)})`);
  }
  // AND THE TWO MECHANISMS ARE THE RIGHT WAY ROUND, which the width check alone cannot tell: reserving
  // a permanent empty leading cell would also hold width stable, at the cost of every plain button
  // being 28px wider forever. So assert WHICH mechanism fires where.
  const kids = (state: string, leading: boolean) =>
    (figmaAnatomyPlan(button, 'medium', { intent: 'primary', appearance: 'filled', state, leading, trailing: false, swapTarget: 'FPO-default-icon' }).root.children ?? []);
  const withLead = kids('pending', true), noLead = kids('pending', false);
  ok(withLead.some((c) => c.name === 'spinner' && !c.absoluteCenter) && !withLead.some((c) => c.zeroOpacity),
    '#612: WITH a leading visual the spinner takes that cell in the flow, and nothing is hidden — Primer\'s rule, width free');
  ok(noLead.some((c) => c.name === 'spinner' && c.absoluteCenter) && noLead.some((c) => c.name === 'label' && c.zeroOpacity),
    '#612: with NO leading visual the spinner goes out of flow centered and the label holds the width at zero opacity — React Aria\'s rule');
  // The label is STILL THERE, and this is the accessibility half. `visible: false` would also hold the
  // cell open in Figma but is prohibited in code — "Do not use `visibility: hidden` or `display: none`
  // as these remove the element from the accessibility tree" — so assert the node survives with its
  // text style and characters intact, not merely that something occupies the cell.
  const hiddenLabel = noLead.find((c) => c.name === 'label');
  ok(!!hiddenLabel?.textStyle && hiddenLabel?.characters !== undefined && hiddenLabel?.zeroOpacity === true,
    `#612: the overlaid label keeps its type style and copy — zero opacity, not removed, so it stays in the a11y tree and pairs as "Save, pending" (${JSON.stringify({ style: hiddenLabel?.textStyle, chars: hiddenLabel?.characters })})`);
  // Z-ORDER: the spinner must come AFTER the label in `children`, or it renders behind a node whose
  // entire purpose is to be invisible. Reads as cosmetic, is not.
  ok(noLead.findIndex((c) => c.name === 'spinner') > noLead.findIndex((c) => c.name === 'label'),
    '#612: the out-of-flow spinner is spliced AFTER the label it covers — later in children is above in z-order');
  // The in-flow case keeps the opposite order, because there the spinner IS the leading cell.
  ok(withLead.findIndex((c) => c.name === 'spinner') < withLead.findIndex((c) => c.name === 'label'),
    '#536: the spinner takes the leading visual\'s position, before the label, when it takes a cell at all');
  // NO CELL IS STOLEN FROM THE LABEL. An out-of-flow overlay owns no cell, so it must not inherit the
  // overlaid part's component property — inheriting the label's would point a `characters` write at an
  // INSTANCE_SWAP node, which type-checks in the plan and throws at paste.
  ok(!noLead.find((c) => c.name === 'spinner')?.propertyRef,
    '#612: an out-of-flow spinner inherits NO component property — there is no leading cell to repoint, and the label\'s text property is not the spinner\'s to claim');
  ok(noLead.find((c) => c.name === 'label')?.propertyRef?.field === 'characters',
    '#612: the overlaid label keeps its OWN text property — being covered does not surrender it');

  // The fallback is REQUIRED when the replaced part is optional, and the gate is what makes that true
  // for the next def rather than only for this one. Both directions: removing the declaration must
  // fail, and naming a part that cannot serve as a floor must fail too.
  const noFallback = { ...button, anatomy: { ...button.anatomy!, parts: { ...button.anatomy!.parts,
    spinner: { ...button.anatomy!.parts.spinner, overlaysWhenAbsent: undefined } } } } as ComponentDef;
  ok(validateComponentDef(noFallback).errors.some((x) => /which is OPTIONAL — declare 'overlaysWhenAbsent'/.test(x)),
    '#612 gate: an overlay over an OPTIONAL part with no fallback fails validation — that is the coordinate where it takes a cell of its own and the button grows');
  const optionalFallback = { ...button, anatomy: { ...button.anatomy!, parts: { ...button.anatomy!.parts,
    spinner: { ...button.anatomy!.parts.spinner, overlaysWhenAbsent: 'trailingVisual' } } } } as ComponentDef;
  ok(validateComponentDef(optionalFallback).errors.some((x) => /is optional — the fallback must be a part that is always present/.test(x)),
    '#612 gate: a fallback that is itself optional fails — it reintroduces the defect one level down');
  const selfFallback = { ...button, anatomy: { ...button.anatomy!, parts: { ...button.anatomy!.parts,
    spinner: { ...button.anatomy!.parts.spinner, overlaysWhenAbsent: 'leadingVisual' } } } } as ComponentDef;
  ok(validateComponentDef(selfFallback).errors.some((x) => /duplicates 'replaces'/.test(x)),
    '#612 gate: naming `replaces` as the fallback fails — the fallback exists for the case that part is absent');

  // The overlay is found by kind+when, not by name, so a second def projects with no emitter change.
  const noWhen = { ...button, anatomy: { ...button.anatomy!, parts: { ...button.anatomy!.parts,
    spinner: { ...button.anatomy!.parts.spinner, when: undefined } } } } as ComponentDef;
  ok(validateComponentDef(noWhen).errors.some((x) => /must declare the state it appears in/.test(x)),
    '#536 gate: an overlay with no `when` fails validation — it cannot be projected');
  const badWhen = { ...button, anatomy: { ...button.anatomy!, parts: { ...button.anatomy!.parts,
    spinner: { ...button.anatomy!.parts.spinner, when: 'nope' } } } } as ComponentDef;
  ok(validateComponentDef(badWhen).errors.some((x) => /is not one of states/.test(x)),
    '#536 gate: an overlay whose `when` is not a declared state fails validation');
}

// ---- #536 item 6: the slot x size grid, gated offline after the live probe ----------------------
// Item 6 was a VERIFICATION gap, not a defect: every live paste before it ran at
// `size=medium, leading=true, trailing=false`, so three claims had shipped unobserved — `size` as a
// real three-value Figma axis, `trailing=true` at all, and both slots at once. The 12-variant probe
// pasted clean (12 members, 6 axes, 3 properties, 24 refs, `misses: []`), and the padding held
// per-side and per-size on canvas. What follows is that expectation written down, because a live
// probe verifies the run it was part of and nothing after it.
{
  const combos: [boolean, boolean][] = [[false, false], [true, false], [false, true], [true, true]];
  const grid = button.variants.size.flatMap((sz) => combos.map(([l, t]) =>
    figmaAnatomyPlan(button, sz, { leading: l, trailing: t, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: 'filled', state: 'rest' })));
  ok(grid.length === 12, `#536 item 6: the probe grid is 3 sizes x 4 slot combos (${grid.length})`);

  // ONE chunk. The probe's whole premise was that this is the cheapest grid that exhibits the
  // behavior — if it ever needed splitting, the "probe small before 756" advice would be wrong.
  const chunks = planSetChunks(grid);
  ok(chunks.length === 1, `#536 item 6: the probe grid is a single payload (${chunks.length} chunk(s), ${chunks[0].bytes} B)`);

  // The padding matrix, per size and per side — the claim the probe existed to test. Asserted as the
  // full 12-cell table rather than a spot check: the rule is two independent per-side decisions, so
  // the interesting failures are the ones where a side is right at one size and wrong at another.
  const wrong: string[] = [];
  for (const sz of button.variants.size) {
    const labelSide = figmaVarName(button.tokens[`size.${sz}.padding-x`]);
    const visualSide = figmaVarName(button.tokens[`size.${sz}.padding-x-visual`]);
    for (const [l, t] of combos) {
      const { bound } = figmaAnatomyPlan(button, sz, { leading: l, trailing: t, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: 'filled', state: 'rest' }).root;
      const want = [l ? visualSide : labelSide, t ? visualSide : labelSide];
      if (bound.paddingLeft !== want[0] || bound.paddingRight !== want[1])
        wrong.push(`${sz} l=${l} t=${t}: ${bound.paddingLeft}/${bound.paddingRight} want ${want[0]}/${want[1]}`);
    }
  }
  ok(wrong.length === 0, `#536 item 6: each side takes its own slot's inset at every size — 12 cells${wrong.length ? ` — WRONG: ${wrong.slice(0, 3).join('; ')}` : ' (verified live on canvas: sm 16/16 12/16 16/12 12/12, lg 24/24 16/24 24/16 16/16)'}`);

  // Twelve DISTINCT coordinates, and the axis values Figma will derive from them. A name collision
  // here is what makes `combineAsVariants` silently drop a member, which the live read-back counts
  // as a footprint divergence — cheaper to catch as a string.
  const names = grid.map(planComponentName);
  ok(new Set(names).size === 12, `#536 item 6: all 12 member names are distinct (${new Set(names).size})`);
  const axisVals = (k: string) => new Set(names.map((n) => n.split(', ').find((p) => p.startsWith(`${k}=`))));
  ok(axisVals('size').size === 3 && axisVals('leading').size === 2 && axisVals('trailing').size === 2,
    `#536 item 6: the grid spans size:3 x leading:2 x trailing:2 (live: size was the first three-value axis pasted)`);

  // `size` must differentiate BEYOND the label. Two of the three sizes share a text style
  // (`md.emphasis` at medium and large) — which is the def's intent, not a collapse — so a check
  // resting on typography alone would read as a duplicate pair. Geometry is what separates them.
  const geom = button.variants.size.map((sz) => {
    const { bound } = figmaAnatomyPlan(button, sz, { leading: true, trailing: true, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: 'filled', state: 'rest' }).root;
    return `${bound.height}|${bound.itemSpacing}`;
  });
  ok(new Set(geom).size === 3, `#536 item 6: every size is geometrically distinct (${geom.join(' ')}) — live heights 40/48/56, gaps 8/8/12`);
}

// -------------------------------------------------------------- #332: malformed lever values reject
// brandTheme() is the one choke point every entry path (CLI, MCP, the web playground, and
// standardToBrandInput's x-prism3 ingest) goes through — before this fix it validated `root`/`modes`/
// `customModes`/`overrides`/`modeAnchors`/`modeLevers` but not the GLOBAL enum/numeric levers those
// per-mode checks deviate FROM, so an in-memory BrandInput (never touching emit-dtcg.ts's schema
// validator) could carry `typeScale: 'gigantic'`, `density: 'roomy'`, or `radiusScale: 47` straight
// into the token builder. The first three below are the issue's own confirmed shapes; the rest extend
// to one more enum lever and one more numeric-range lever from the full manifest, then to the
// design.md/x-prism3 entry path (the issue's own "Verify").
{
  const base = { id: 'lv', primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.008 } };
  const threw = (fn: () => unknown): string | null => { try { fn(); return null; } catch (e) { return (e as Error).message; } };

  // ---- the three confirmed shapes ----
  const typeScaleErr = threw(() => brandTheme({ ...base, typography: { typeScale: 'gigantic' } } as unknown as BrandInput));
  ok(typeScaleErr !== null, "#332: typography.typeScale 'gigantic' (unknown enum) throws rather than building a sizeless display style");
  ok(typeScaleErr !== null && /typeScale/.test(typeScaleErr) && /gigantic/.test(typeScaleErr), `#332: the typeScale error names the lever and the bad value — got: ${typeScaleErr}`);

  const densityErr = threw(() => brandTheme({ ...base, density: 'roomy' } as unknown as BrandInput));
  ok(densityErr !== null, "#332: density 'roomy' (unknown enum) throws rather than silently falling through to a default");
  ok(densityErr !== null && /density/.test(densityErr) && /roomy/.test(densityErr), `#332: the density error names the lever and the bad value — got: ${densityErr}`);

  const radiusErr = threw(() => brandTheme({ ...base, radiusScale: 47 } as unknown as BrandInput));
  ok(radiusErr !== null, '#332: radiusScale 47 (out of the declared [0, 2] range) throws rather than computing an 188px radius.md');
  ok(radiusErr !== null && /radiusScale/.test(radiusErr) && /47/.test(radiusErr), `#332: the radiusScale error names the lever, the bad value, and the range — got: ${radiusErr}`);

  // ---- one more enum lever + one more numeric-range lever from the full manifest ----
  const tempoErr = threw(() => brandTheme({ ...base, motionPersonality: { tempo: 'ludicrous' } } as unknown as BrandInput));
  ok(tempoErr !== null, "#332: motionPersonality.tempo 'ludicrous' (unknown enum) throws — TEMPO_FACTOR['ludicrous'] would otherwise be undefined, NaN-ing the whole duration ramp");

  const baseMdErr = threw(() => brandTheme({ ...base, baseMd: 999 } as unknown as BrandInput));
  ok(baseMdErr !== null, '#332: baseMd 999 (out of the declared [2, 12] range) throws rather than scaling every radius rung off an absurd anchor');

  // Every remaining enum/range lever #332 added — each must reject its own out-of-manifest value.
  const otherBad: [string, Record<string, unknown>][] = [
    ["typography.displayCeiling 'huge'", { typography: { displayCeiling: 'huge' } }],
    ['typography.titleFloor 20', { typography: { titleFloor: 20 } }],
    ["disabledStrategy 'yolo'", { disabledStrategy: 'yolo' }],
    ["iconContrast '5:1'", { iconContrast: '5:1' }],
    ["outlineInteraction 'explode'", { outlineInteraction: 'explode' }],
    ["neutralEmphasis 'extreme'", { neutralEmphasis: 'extreme' }],
    ['shadow.softness 99', { shadow: { softness: 99 } }],
    ['layout.columns -5', { layout: { columns: -5 } }],
    ['layout.containerMax 99999', { layout: { containerMax: 99999 } }],
    ['layout.containerNarrow 99999', { layout: { containerNarrow: 99999 } }],
    ['neutral.chroma 5', { neutral: { hue: 262, chroma: 5 } }],
  ];
  for (const [label, extra] of otherBad) {
    ok(threw(() => brandTheme({ ...base, ...extra } as unknown as BrandInput)) !== null, `#332: ${label} throws`);
  }

  // ---- no false positives: every lever's own VALID enum/range still builds clean ----
  const validErr = threw(() => brandTheme({
    ...base,
    typography: { typeScale: 'expressive', displayCeiling: 'lg', titleFloor: 16 },
    density: 'compact', motionPersonality: { tempo: 'relaxed' }, radiusScale: 1.5, baseMd: 6,
    disabledStrategy: 'full', iconContrast: '3:1', outlineInteraction: 'none', neutralEmphasis: 'strong',
    shadow: { softness: 1.4 }, layout: { columns: 16, containerMax: 1600, containerNarrow: 600 },
  } as unknown as BrandInput));
  ok(validErr === null, `#332: every lever's own valid enum/range still builds clean — got: ${validErr}`);

  // Named stops (#471) still resolve — the vocabulary layer runs BEFORE the #332 check, so
  // 'soft'/'warm'/'subtle'/'wide' are already plain numbers by the time it looks at them.
  const stopsErr = threw(() => brandTheme({ ...base, radiusScale: 'soft', neutral: { hue: 'warm', chroma: 'subtle' }, layout: { containerMax: 'wide' } } as unknown as BrandInput));
  ok(stopsErr === null, `#332: named stops (radiusScale/neutral.hue/neutral.chroma/layout.containerMax) still resolve, unaffected by the new range check — got: ${stopsErr}`);

  // ---- the design.md/x-prism3 entry path and the direct brandTheme() path now agree (issue's "Verify") ----
  // `applyXPrism3` (standard-design-md.ts) casts typeScale/density/motionTempo `as any` with no enum
  // check of its own, and checks radiusScale only for finiteness — no range clamp. Its only protection
  // used to be schema validation on the FILE path (cli.ts's validateOrExit), which an in-memory
  // BrandInput never touches. Confirm the x-prism3 ingest now rejects the same malformed values
  // brandTheme() rejects directly — inherited for free from the single choke point, not a second,
  // independently-maintained check.
  const xBase = (): BrandInput => ({ id: 'x', primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.008 } });
  const agreementCases: [string, Record<string, unknown>, boolean][] = [
    ["x-prism3 typeScale='gigantic'", { typeScale: 'gigantic' }, typeScaleErr !== null],
    ["x-prism3 density='roomy'", { density: 'roomy' }, densityErr !== null],
    ["x-prism3 motionTempo='ludicrous'", { motionTempo: 'ludicrous' }, tempoErr !== null],
    ["x-prism3 radiusScale=47", { radiusScale: 47 }, radiusErr !== null],
  ];
  for (const [label, x, expectDirectThrows] of agreementCases) {
    const input = xBase();
    applyXPrism3(input, x);   // mutates input in place; applyXPrism3 itself does not enum/range-check
    const viaXThrows = threw(() => brandTheme(input)) !== null;
    ok(viaXThrows, `#332: ${label} reaches brandTheme() via the design.md/x-prism3 entry path and throws`);
    ok(viaXThrows === expectDirectThrows, `#332: ${label} — the x-prism3 path and the direct brandTheme() path agree on rejection (both throw)`);
  }
}

// ---- #609: the conforming PROJECTION (base + per-mode overlays) --------------------------------
// The canonical tree keeps `$extensions.prism3.modes` as the source of truth. These artifacts are the
// projection a conforming consumer can actually read, since DTCG defines `$extensions` as ignorable.
{
  const t = buildTree(brandTheme({ id: 'p', primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.008 } } as never)).tree;
  const modes = overlayModes(t);
  ok(modes.length >= 3, `overlay: every declared mode is found by walking the tree (${modes.join(', ')})`);

  const base = buildBase(t);
  // #642: the base carries every DTCG-typed leaf — not every leaf. The subtrahend is derived by walking
  // the canonical tree for leaves the SPEC does not define, so this still fails if a conforming token
  // goes missing; it is not the count relaxed into "whatever the base happens to hold".
  const nonConformingIn = (n: unknown): string[] => {
    if (!n || typeof n !== 'object') return [];
    const o = n as Record<string, any>;
    if ('$value' in o) return DTCG_TYPES.has(o.$type) ? [] : [String(o.$type)];
    return Object.entries(o).filter(([k]) => !k.startsWith('$')).flatMap(([, v]) => nonConformingIn(v));
  };
  const nonConf = nonConformingIn(t);
  ok(nonConf.length > 0, `overlay: the canonical tree DOES carry non-DTCG types (${[...new Set(nonConf)].join(', ')}) — the omission below is not vacuous`);
  ok(leafCount(base) === leafCount(t) - nonConf.length,
    `overlay: the base carries every DTCG-typed leaf (${leafCount(base)}/${leafCount(t) - nonConf.length} = ${leafCount(t)} − ${nonConf.length} non-DTCG) (#642)`);

  // THE #642 CONTRACT, asserted on the function rather than only through a Style Dictionary build: no
  // leaf in the projection carries a type the spec does not define. Checked against DTCG_TYPES, not by
  // looking for `spring` — the rule is about conformance, and a future non-standard type must fail it
  // without anyone editing this test.
  ok(nonConformingIn(base).length === 0,
    `overlay: the base projection carries ZERO non-DTCG types${nonConformingIn(base).length ? ` — ${[...new Set(nonConformingIn(base))].join(', ')}` : ''} (#642)`);
  // ...and the omission prunes the group rather than leaving `"spring": {}` behind, which would conform
  // while advertising a vocabulary the file does not carry.
  const groupAt = (tree: unknown, path: string[]): any => path.reduce<any>((acc, k) => acc?.[k], tree);
  ok(groupAt(t, ['prism', 'motion', 'spring']) !== undefined,
    'overlay: the canonical tree has a motion.spring group (the pruning check below is not vacuous)');
  ok(groupAt(base, ['prism', 'motion', 'spring']) === undefined,
    'overlay: the emptied group is PRUNED from the base, not left as `{}` (#642)');
  ok(groupAt(base, ['prism', 'motion', 'easing']) !== undefined,
    'overlay: ...and its conforming siblings survive — the pruning is not eating the parent');
  // THE CONTRACT of the base: no `modes` survives. If it did, a consumer reading the base could still
  // find a second value it is silently ignoring — which is the exact defect the projection exists to
  // remove, and the base would be the canonical tree wearing a different filename.
  // STRUCTURAL, not a string match. The first draft asserted `!JSON.stringify(x).includes('"modes"')`
  // and failed on `$extensions.prism3.figma.modes` — a descriptive list of which Figma collection
  // modes exist, which is documentation, not a hidden value. A substring proxy for a structural
  // property matches whatever else happens to share the word.
  const carriesModeValues = (n: unknown): boolean => {
    if (!n || typeof n !== 'object') return false;
    const o = n as Record<string, any>;
    if ('$value' in o) return !!o.$extensions?.prism3?.modes;
    return Object.entries(o).some(([k, v]) => !k.startsWith('$') && carriesModeValues(v));
  };
  ok(!carriesModeValues(base),
    'overlay: the base carries NO per-mode VALUE map — a consumer cannot be silently ignoring a value');
  ok(carriesModeValues(t), 'overlay: ...and the canonical tree still does (the check is not vacuous)');
  ok(JSON.stringify(base).includes('"contrast"'),
    'overlay: descriptive extensions SURVIVE in the base — only the hidden-value one is stripped');

  // The expected size is derived INDEPENDENTLY — by walking the canonical tree and counting leaves
  // whose mode value actually differs — rather than measured off the overlay. Mutation is why: an
  // earlier draft asserted only "a strict subset", and a mutant that included every unchanged leaf
  // produced 553 of 575 and passed. 96% redundant is a strict subset, and it defeats the entire
  // reason overlays exist. A size assertion has to compare against a second derivation, not itself.
  const expectedDelta = (mode: string): number => {
    let n = 0;
    const walk = (x: unknown): void => {
      if (!x || typeof x !== 'object') return;
      const o = x as Record<string, any>;
      if ('$value' in o) {
        const mv = o.$extensions?.prism3?.modes?.[mode];
        if (mv && '$value' in mv && JSON.stringify(mv.$value) !== JSON.stringify(o.$value)) n++;
        return;
      }
      for (const [k, v] of Object.entries(o)) if (!k.startsWith('$')) walk(v);
    };
    walk(t);
    return n;
  };
  for (const m of modes) {
    const ov = buildOverlay(t, m);
    const n = leafCount(ov);
    ok(n === expectedDelta(m),
      `overlay ${m}: exactly the leaves that changed (${n}, independently expected ${expectedDelta(m)})`);
    ok(n > 0 && n < leafCount(t) * 0.5,
      `overlay ${m}: a real delta, not a near-copy (${n} of ${leafCount(t)})`);
    ok(!carriesModeValues(ov), `overlay ${m}: carries no per-mode value map either`);

    // ...and the VALUE each overlay leaf carries is the mode's, not the base's. Mutation found this
    // gap: making `buildOverlay` return the base leaf unchanged left every count above correct — the
    // selection of WHICH leaves is independent of WHAT value they carry — and the only gate that
    // noticed was the CSS-parsing consumability check, which reads one brand through a build. A
    // contract of this function belongs in a test of this function. Resolved by path against the
    // canonical tree, so it compares two derivations rather than the overlay against itself.
    const at = (tree: unknown, path: string[]): any => path.reduce<any>((acc, k) => acc?.[k], tree);
    const valueFails: string[] = [];
    const checkValues = (n: unknown, path: string[]): void => {
      if (!n || typeof n !== 'object') return;
      const o = n as Record<string, any>;
      if ('$value' in o) {
        const canon = at(t, path);
        const want = canon?.$extensions?.prism3?.modes?.[m]?.$value;
        if (JSON.stringify(o.$value) !== JSON.stringify(want)) valueFails.push(`${path.join('.')}=${JSON.stringify(o.$value)}≠${JSON.stringify(want)}`);
        else if (JSON.stringify(o.$value) === JSON.stringify(canon?.$value)) valueFails.push(`${path.join('.')}:unchanged-from-base`);
        return;
      }
      for (const [k, v] of Object.entries(o)) if (!k.startsWith('$')) checkValues(v, [...path, k]);
    };
    checkValues(ov, []);
    ok(valueFails.length === 0,
      `overlay ${m}: every leaf carries the MODE's value, and it differs from base${valueFails.length ? ` — ${valueFails.slice(0, 3).join(', ')}` : ''}`);
  }

  // A leaf whose mode value EQUALS its default must not appear. The engine emits those, and including
  // them would make an overlay look bigger than the change it represents.
  const equalMode = { x: { $type: 'color', $value: '#fff', $extensions: { prism3: { modes: { dark: { $value: '#fff' } } } } } };
  ok(leafCount(buildOverlay(equalMode, 'dark')) === 0,
    'overlay: a mode value identical to the default is excluded (the overlay reports real change only)');
  const diffMode = { x: { $type: 'color', $value: '#fff', $extensions: { prism3: { modes: { dark: { $value: '#000' } } } } } };
  ok(leafCount(buildOverlay(diffMode, 'dark')) === 1,
    'overlay: a mode value that DIFFERS is included (the exclusion above is not blanket)');

  const set = buildOverlaySet(t);
  ok(set.overlays.length === modes.length, `overlay: the set carries one overlay per mode (${set.overlays.length})`);
}

// ------------------------------------------------------------------- report
console.log(`\nPrism3 engine tests: ${pass} passed, ${fails.length} failed`);

// A FLOOR on the population, not on the outcome (#659). `fails.length === 0` is the outcome, and it is
// vacuously true over zero assertions: neutering `ok()` printed **`0 passed, 0 failed`** followed by
// `✓ colour math + extreme-brand contracts all hold`, at exit 0. Nothing else in the suite noticed,
// because everything else in the suite IS this suite. The number is the largest single claim CI makes
// about this repo, and it was the one number nothing compared to anything (docs/34 shape 9's cheap
// tell: the gate prints a count nothing asserts).
//
// Deliberately a LOOSE floor, unlike nb-regression.ts's exact populations. The assertion count here
// grows most weeks, so an exact pin would fail on every honest PR and be re-pinned without thought —
// a floor nobody reads is worse than none, because it looks like protection. What this catches is the
// collapse: a broken harness, a dropped import, an `ok()` that stopped counting. Raise it when it
// genuinely blocks; do not track the real count with it.
const MIN_ASSERTIONS = 1800;
if (pass + fails.length < MIN_ASSERTIONS) {
  console.log(`  ❌ only ${pass + fails.length} assertions ran, expected at least ${MIN_ASSERTIONS} — the harness collapsed, so "0 failed" means nothing.`);
  process.exitCode = 1;
}
if (fails.length) { fails.forEach((f) => console.log(`  ❌ ${f}`)); process.exitCode = 1; }
else if (pass + fails.length >= MIN_ASSERTIONS) console.log('  ✓ colour math + extreme-brand contracts all hold');
