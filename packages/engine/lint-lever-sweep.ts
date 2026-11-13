/**
 * LEVER-SWEEP GATE (#957) — no lever setting silently deletes a guaranteed token path, and no lever
 * setting leaves a component binding something the setting deleted.
 *
 *   npx tsx packages/engine/lint-lever-sweep.ts
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────────────
 *
 * Every other gate observes a brand at the settings it was authored with, and the token contract's
 * corpus runs almost every lever at its DEFAULT. So a lever that removes something at a non-default
 * setting sits in a gap no gate is ever handed the input for — the detector is alive and correct and
 * simply never sees the failing case (#957; near `docs/34` shape 9, and shape 15's "which members does
 * nothing compare?"). It has happened twice in two shapes:
 *
 *   · CONTRACT (#895, #957): `inverse`, then `outlineInteraction` and `typography.displayCeiling`, each
 *     removed paths the contract called guaranteed. #895 retired the lever; #957 demoted the 30 paths to
 *     `brandDependent` via the `minimal-levers` corpus member (docs/30, the two `Decided` headings).
 *   · COMPONENTS (#1608): `outlineInteraction: 'solid-tint' | 'none'` stops emitting the overlay wash
 *     that `button` and three other defs bound by name — 96 misses on the owner's NB file, found by
 *     building a button, not by any gate. #1601 added a `type.*` cross-check over the corpus at its own
 *     settings; this generalizes both to EVERY toggle and enum option.
 *
 * ── WHAT IT SWEEPS ──────────────────────────────────────────────────────────────────────────────────
 *
 * Every `toggle` (true, false), every `enum` option, every `slider` at both ends of its range (#3698 R2), and
 * every `list` at its boundaries (#3698 R2: the empty list, and for a list whose count is bounded, the counts
 * either side of each bound) in `leverManifest`, ONE AT A TIME, from each of three brands:
 *
 *   · `minimal`     — `MINIMAL_BRAND`, the sparsest input (every lever at its default). A contract corpus member.
 *   · `harbor`      — an engine-native brief with its own lever choices (compact type scale, relaxed
 *                     tempo). A contract corpus member.
 *   · `nb-redesign` — the owner's NB shape: `body: [default, emphasis]` weights (the #1601 case), a
 *                     strong neutral emphasis. Not a corpus member, but its weight sets are: the contract's
 *                     `minimal-weights` carries them, so its declined `strong` roles are brand-dependent (#1632).
 *
 * ── THE TWO ARMS, AND WHERE EACH SIDE COMES FROM (docs/34) ──────────────────────────────────────────
 *
 * (a) CONTRACT. SUBJECT = the guaranteed paths in the COMMITTED baseline, `schema/token-contract.json`,
 *     read as a file (never recomputed: `buildContract` would run the same corpus and agree with itself).
 *     ORACLE = the DTCG tree the engine EMITS for that setting (`buildTree` via `pathsOf`). A guaranteed
 *     path that the brand's own base build emits and the setting does not is a REMOVAL (and one whose
 *     `$type` changes is a RETYPE). Each removal must match `REMOVALS` EXACTLY, per (brand, lever, value),
 *     in BOTH directions: a removal not listed fails, and a listed path that no longer disappears fails, so
 *     the list cannot go stale (#957's "equality, not subset" note; the `INVERSE_GAPS` posture).
 *     Measured against the brand's BASE build rather than the raw guaranteed set so a removal is
 *     attributable to the lever. The corpus members' bases are asserted to emit EVERY guaranteed path, so
 *     for them the delta and the absolute check are the same thing.
 *
 * (b) COMPONENTS. SUBJECT = every def's projection after brand materialization — `applyControlShape`
 *     (off the raw input, as the plugin reads it), then `applyFieldStyle` (#2695, off the raw input, in the style `fieldStyleFor` resolves for the def, #2888), then `applyTagStyle` (#2887, off the raw input), then `applyDialogTitleSize` (#2958, off the raw input), then `applyBannerStyle` (#2924, off the raw input), then `applyWeightIntent` and `applyOutlineInteraction`
 *     (off the resolved theme), then `applySpacingDensity` (the spacing model, off the theme's density), then
 *     `applyButtonLayout` (#1667 and #1752's label weight, off the raw input and the theme's heights), then
 *     `applyMinWidthRatio` (Tag's floor, off the theme's heights). This is the composition `apps/plugin/src/brand-def.ts`'s
 *     `materializeForBrand` performs. It is restated here, not imported, because the engine must not
 *     depend on a surface. The plugin's own `test-write-components.ts` pins that function's weight-intent
 *     (#1605), outline-hover (#1608), button-setting (#1667, #1752) and `controlShape` (#1761: each shape's rung on the
 *     button's root corners) reads. This gate pins the ten engine materializers under every setting. ORACLE = the Figma EMISSION for that setting
 *     (`figmaArtifacts`, the in-memory form of the `out/figma/<brand>/*.json` files Apply writes): its
 *     variable tails, its text styles and its effect styles, checked separately by `planBindingErrors`.
 *     No allowlist: a component that binds a thing its brand does not emit is always a miss on paste.
 *     NOT the engine's lever table, and not `outlineFillRole`, which the materializer itself reuses.
 *
 * Both oracles are EMITTED output. Neither arm reads what a lever is SUPPOSED to do.
 *
 * ── REFUSALS ────────────────────────────────────────────────────────────────────────────────────────
 *
 * Some settings are invalid on some brands, and the engine THROWS (e.g. `titleFloor: 16` under a
 * compact type scale). A refusal is loud, not silent, so it is not this gate's defect class. It is still
 * a verdict, not a skip: every throw must match `REFUSALS` by brand, setting AND message, and a listed
 * refusal that stops throwing fails (both directions again). Each setting meets the input SCHEMA first
 * (`validateBrandInput`, what the CLI and the MCP run before the build), so a schema error is a refusal
 * too, matched the same way: a boundary just past a schema bound must be refused there (#3698 R2).
 *
 * ── THE BOUNDS, AND WHERE EACH SIDE COMES FROM (#3698 R2) ───────────────────────────────────────────
 *
 * A slider's endpoints are the manifest's `min`/`max`, the range the studio offers. A bounded list's
 * samples are typed HERE, in `LIST_BOUNDARIES`, as literals (not computed from the schema), and the gate
 * asserts that the schema's own `minItems` falls between the shortest sample it expects refused and the
 * shortest it expects built. So the schema and this file are two independent statements of the floor: drop
 * `minItems` from the schema and the one-floor sample validates, builds, and removes the four guaranteed
 * `md` paths (arm a), and its REFUSALS entry goes stale.
 *
 * ── STATED LIMITS (a clean run does not imply these) ────────────────────────────────────────────────
 *
 *   · SLIDERS ARE SWEPT AT THEIR ENDS ONLY. The space between is continuous, and two endpoints are not a
 *     proof. A slider's named stops (#471) sit inside its range and are not swept separately.
 *   · LISTS ARE SWEPT AT THEIR BOUNDARIES ONLY: the empty list, plus the `LIST_BOUNDARIES` samples. The
 *     items inside a list are one fixed sample each, not a sweep of item values.
 *   · OBJECT / COLOR / PALETTE-REF / TEXT levers are not swept. They have no finite value set.
 *     `typography.weights` IS a path-removing object lever, covered by the contract's `minimal-weights`
 *     member (#1632). Every lever is classified in `NOT_SWEPT` by control kind, so a new kind cannot be
 *     skipped silently.
 *   · ONE LEVER AT A TIME. A path removable only by two levers together is not seen.
 *   · Three brands. A removal that only happens on some other brand is not seen.
 *   · Arm (b) restates the plugin's composition order, so it cannot see the plugin DROPPING a wrap; that
 *     half is `test-write-components.ts`'s.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leverManifest, type Lever, type LeverControl } from './levers';
import { brandTheme, weightAvailability, type BrandInput, type Theme } from './theme';
import { parseDesignMd } from './design-md';
import { pathsOf, MINIMAL_BRAND, CONTRACT_PATH } from './token-contract';
import { validateBrandInput } from './emit-dtcg';
import { figmaArtifacts } from './emit-figma';
import { tailOf } from './figma-names';
import { componentDefs } from './components';
import type { ComponentDef } from './component-schema';
import { sizeRefPx } from './scale';
import {
  figmaAnatomySet, applyControlShape, applyFieldStyle, fieldStyleFor, applyTagStyle, applyDialogTitleSize, applyBannerStyle, applyCurrentIndicator, applyWeightIntent, applyOutlineInteraction, applyButtonLayout, applySpacingDensity, applyMinWidthRatio, DEFAULT_BUTTON_LAYOUT,
  planBindingErrors, planComponentName, planBoundVars, planTextStyles, planEffectStyles, type AnatomyPlan,
} from './anatomy-figma';

const here = dirname(fileURLToPath(import.meta.url));
type Value = string | number | boolean | readonly number[] | readonly unknown[];
const same = (a: Value, b: Value): boolean => JSON.stringify(a) === JSON.stringify(b);
type BrandId = 'minimal' | 'harbor' | 'nb-redesign';

// ── THE BRANDS ──────────────────────────────────────────────────────────────────────────────────────
const brief = (f: string): BrandInput => parseDesignMd(readFileSync(resolve(here, 'examples', f), 'utf8')).input;
const BRANDS: { id: BrandId; input: BrandInput; contractCorpus: boolean }[] = [
  { id: 'minimal', input: MINIMAL_BRAND, contractCorpus: true },
  { id: 'harbor', input: brief('harbor.design.md'), contractCorpus: true },
  { id: 'nb-redesign', input: brief('nb-redesign.design.md'), contractCorpus: false },
];
const ALL_BRANDS: BrandId[] = BRANDS.map((b) => b.id);

// ── SCOPE: every lever is swept or classified out, by control kind ──────────────────────────────────
const SWEPT_CONTROLS: LeverControl[] = ['toggle', 'enum', 'list'];
const NOT_SWEPT: Record<Exclude<LeverControl, 'toggle' | 'enum' | 'list'>, string> = {
  slider: 'wip mutation',
  color: 'an OKLCH/hex value: a continuous space, and it moves values, not names',
  object: 'open-ended structured input. `typography.weights` removes paths, and the contract corpus covers it (`minimal-weights`, #1632)',
  'palette-ref': "values depend on the brand's own declared palettes, so there is no brand-independent option set",
  text: 'free text',
};
// REPRESENTED (docs/34 question 3, "Did it look?"): each kind this gate promises to sweep must build at least one
// setting, summed over the brands. A literal, typed apart from SWEPT_CONTROLS, so narrowing the sweep takes two
// edits that must agree: reclassify a kind into NOT_SWEPT and it builds nothing, and this list names it.
const REQUIRED_KINDS = ['toggle', 'enum', 'slider', 'list'] as const;

// A list lever with a count bound, sampled either side of it (#3698 R2). The samples are literals, typed here,
// so they state the bound independently of the schema (see the header). `refused` lengths must be refused;
// `built` lengths must build. Every list lever ALSO gets the empty list.
const SEVEN_FLOORS = [0, 360, 480, 768, 1024, 1440, 1920];
const LIST_BOUNDARIES: Record<string, { refused: Value[]; built: Value[]; reason: string }> = {
  'layout.breakpoints': {
    refused: [[0], [...SEVEN_FLOORS, 2560]],
    built: [[0, 768], SEVEN_FLOORS],
    reason: 'two to seven floors: two is the contract corpus\'s sparsest layout (`minimal-bp2`, #1479), seven is the last t-shirt name (#2198)',
  },
};

const valuesOf = (l: Lever): Value[] => {
  if (l.control === 'toggle') return [true, false];
  if (l.control === 'enum') return (l.options ?? []).map((o) => o.value);
  if (l.control === 'slider') return l.min === undefined || l.max === undefined ? [] : [l.min, l.max];
  if (l.control === 'list') {
    const b = LIST_BOUNDARIES[l.key];
    return [[], ...(b ? [...b.refused, ...b.built].filter((v) => !same(v, [])) : [])];
  }
  return [];
};

// ── ARM (a) ALLOWLIST: a guaranteed path a setting is ALLOWED to remove, with the reason ─────────────
// Matched EXACTLY per (brand, lever, value): a removal not listed fails, and a listed path that is no
// longer removed fails. `defect` = a live contract violation filed for a disposition, held here so the
// gate can ship green without hiding it; `by-design` = a removal that IS the lever's purpose and the
// contract should say so (#957's two cases were settled by DEMOTION, so they never reach this arm).
type Removal = { lever: string; value: Value; brands: BrandId[]; paths: string[]; disposition: 'defect' | 'by-design'; reason: string };
const LINK_PATHS = ['type.body.lg.default-link', 'type.body.md.default-link', 'type.body.sm.default-link', 'type.body.xs.default-link',
  'type.caption.lg.default-link', 'type.caption.md.default-link'];
const REMOVALS: Removal[] = [
  { lever: 'typography.links', value: [], brands: ALL_BRANDS, paths: LINK_PATHS, disposition: 'defect',
    reason: '#3707: an empty list validates and ships no body or caption link style, and the contract guarantees them (owner decision open)' },
];

// ── ARM (b) DEFECTS: a filed binding miss, held so the gate ships green without hiding it (#3698 R2) ──
// Arm (b) has no by-design allowlist: a component that binds what its brand does not emit is always a miss on
// paste. A FILED one is held here, exact in both directions per (brand, lever, value): the same def ids and the
// same miss count, or the gate fails, and an entry that stops missing fails as stale. Delete with the fix.
type BindingDefect = { lever: string; value: Value; brands: BrandId[]; misses: Record<string, number>; issue: string };
const BINDING_DEFECTS: BindingDefect[] = [
  { lever: 'typography.links', value: [], brands: ALL_BRANDS, misses: { link: 112 },
    issue: '#3707: Link binds the body link text styles, which an empty `typography.links` does not emit' },
];

// ── REFUSALS: a setting the engine is RIGHT to reject on a brand, matched by message ─────────────────
type Refusal = { brand: BrandId; lever: string; value: Value; message: RegExp; reason: string };
const REFUSALS: Refusal[] = [
  { brand: 'harbor', lever: 'typography.titleFloor', value: 16, message: /titleFloor 16 is incompatible with typeScale 'compact'/,
    reason: 'harbor runs the compact type scale, which already places a title at 16px (the lever description says so)' },
  // #3077: the seed's title ramp starts at a 20px title.2xs (titleFloor 16), so compact is refused for that pairing,
  // and its pinned sizes leave expressive room to build, so expressive is no longer a refusal.
  { brand: 'nb-redesign', lever: 'typography.typeScale', value: 'compact', message: /titleFloor 16 is incompatible with typeScale 'compact'/,
    reason: 'nb-redesign sets titleFloor 16 (its 20px title.2xs), and compact already places a title at 16px' },
  { brand: 'nb-redesign', lever: 'typography.titleFloor', value: 18, message: /typography\.sizes\.title\.2xs: that rung is not in this brand's title set/,
    reason: 'nb-redesign sets `sizes.title.2xs` (20px), and titleFloor 18 leaves that rung out, so the size names nothing' },
  { brand: 'nb-redesign', lever: 'typography.captionFloor', value: 10, message: /caption\.md resolves to 10px, which is not larger than the previous rung \(10px\)/,
    reason: 'nb-redesign sets caption.md to 10px (#3077), and captionFloor 10 adds a 10px caption.sm below it: two rungs on one px' },
  { brand: 'nb-redesign', lever: 'typography.displayCeiling', value: 'sm', message: /typography\.sizes\.display\.md: that rung is not in this brand's display set \(sm\)/,
    reason: 'nb-redesign sets `sizes.display.md`, and a ceiling of sm trims that rung, so the override names nothing' },
  // #3335 (Q3335.3 A): pressed must sit above hover. Swept one at a time, the other step is the method's default: every
  // brand here runs a neutral wash (10 hover, 20 pressed), so a pressed of 5 or 10 lands on or under hover, and a hover
  // of 40, the top step, leaves no step above it for pressed.
  ...ALL_BRANDS.flatMap((brand): Refusal[] => [
    { brand, lever: 'outlineWash.hover', value: 40, message: /^outlineWash: pressed 40 must be above hover 40 /,
      reason: 'hover 40 is the top wash step, so no pressed step sits above it' },
    ...[5, 10].map((value): Refusal => ({ brand, lever: 'outlineWash.pressed', value, message: new RegExp(`^outlineWash: pressed ${value} must be above hover 10 `),
      reason: `the neutral wash's hover defaults to 10, so a pressed of ${value} is not above it` })),
  ]),
  // #3698 R2: two to seven breakpoints. The schema's `minItems: 2` refuses fewer, before the build path runs;
  // `buildLayout` refuses an eighth (#2198), since the schema states no maximum.
  ...ALL_BRANDS.flatMap((brand): Refusal[] => [
    ...[[], [0]].map((value): Refusal => ({ brand, lever: 'layout.breakpoints', value, message: new RegExp(`^schema: layout\\.breakpoints: ${value.length} item\\(s\\) < minItems 2$`),
      reason: 'fewer than two breakpoints: one floor drops the guaranteed `md` tier (#3698 F3)' })),
    { brand, lever: 'layout.breakpoints', value: [...SEVEN_FLOORS, 2560], message: /^The brand can have at most seven breakpoints\. This brand has 8\.$/,
      reason: 'an eighth breakpoint has no t-shirt name (#2198)' },
  ]),
];

// ── HELPERS ─────────────────────────────────────────────────────────────────────────────────────────
const setPath = (o: Record<string, unknown>, path: string, v: Value): void => {
  const keys = path.split('.');
  let cur: Record<string, unknown> = o;
  for (const k of keys.slice(0, -1)) {
    const next = cur[k];
    cur[k] = next && typeof next === 'object' ? { ...(next as object) } : {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = v;
};

type Emitted = { vars: Set<string>; textStyles: Set<string>; effectStyles: Set<string> };
const figmaEmitted = (theme: Theme): Emitted => {
  const out: Emitted = { vars: new Set(), textStyles: new Set(), effectStyles: new Set() };
  for (const a of figmaArtifacts(theme).artifacts) {
    if (!a.path.endsWith('.json')) continue;
    const j = JSON.parse(a.content);
    for (const v of j.variables ?? []) out.vars.add(tailOf(v.name));
    for (const s of j.styles ?? []) (a.path.startsWith('shadow') ? out.effectStyles : out.textStyles).add(s.name);
  }
  return out;
};

// The materialization, in `materializeForBrand`'s order (see the header for why it is restated).
// The spacing density (the spacing model) follows the outline family; the button layout (#1667) comes after it,
// off the raw input like `controlShape`, with the brand's own size ladder; the ratio floor (Tag's) is last.
const materialize = (def: ComponentDef, input: BrandInput, theme: Theme): ComponentDef =>
  applyMinWidthRatio(applyButtonLayout(
    applySpacingDensity(applyOutlineInteraction(applyWeightIntent(applyCurrentIndicator(applyBannerStyle(applyDialogTitleSize(applyTagStyle(applyFieldStyle(applyControlShape(def, input.controlShape ?? 'rounded'), fieldStyleFor(def.id, input)), input.tagStyle ?? 'pill'), input.dialogTitleSize ?? 'large'), input.bannerStyle ?? 'tinted'), input.currentIndicator ?? 'partial'), weightAvailability(theme.typography)), theme.outlineInteraction), theme.dims.density),
    {
      icons: input.buttonIcons ?? DEFAULT_BUTTON_LAYOUT.icons,
      content: input.buttonContentSize ?? DEFAULT_BUTTON_LAYOUT.content,
      minWidthMultiplier: input.buttonMinWidthMultiplier ?? DEFAULT_BUTTON_LAYOUT.minWidthMultiplier,
      labelWeight: input.buttonLabelWeight ?? DEFAULT_BUTTON_LAYOUT.labelWeight,
      textHover: input.buttonTextHover ?? DEFAULT_BUTTON_LAYOUT.textHover,
    },
    sizeRefPx(theme.dims.sizes)), sizeRefPx(theme.dims.sizes));

// Projection is the expensive step and depends only on the materialized def, so cache by its content.
const projCache = new Map<string, AnatomyPlan[]>();
const project = (def: ComponentDef): AnatomyPlan[] => {
  const key = JSON.stringify(def);
  let plans = projCache.get(key);
  if (!plans) { plans = figmaAnatomySet(def); projCache.set(key, plans); }
  return plans;
};

type Miss = { def: string; member: string; error: string };
const componentMisses = (input: BrandInput, theme: Theme, emitted: Emitted, defs: readonly ComponentDef[] = componentDefs,
  wrap = true): { misses: Miss[]; refs: number; plans: number } => {
  const misses: Miss[] = [];
  let refs = 0, plans = 0;
  for (const def of defs) {
    if (!def.figmaProperties) continue;
    for (const p of project(wrap ? materialize(def, input, theme) : def)) {
      plans++;
      refs += planBoundVars(p.root).length + planTextStyles(p.root).length + planEffectStyles(p.root).length;
      for (const error of planBindingErrors(p, emitted.vars, emitted.textStyles, emitted.effectStyles))
        misses.push({ def: def.id, member: planComponentName(p), error });
    }
  }
  return { misses, refs, plans };
};

// The arm (a) comparison, used by the sweep AND by its self-check, so the self-check exercises the
// function that decides rather than a copy of it (docs/34 corollary 1).
const contractDelta = (baseGuaranteed: [string, string][], paths: Map<string, string>): { removed: string[]; retyped: string[] } => ({
  removed: baseGuaranteed.filter(([p]) => !paths.has(p)).map(([p]) => p).sort(),
  retyped: baseGuaranteed.filter(([p, t]) => paths.has(p) && paths.get(p) !== t).map(([p, t]) => `${p} (${t} → ${paths.get(p)})`),
});

// ── THE SWEEP ───────────────────────────────────────────────────────────────────────────────────────
const failures: string[] = [];
const fail = (m: string): void => { failures.push(m); };

const baseline = JSON.parse(readFileSync(CONTRACT_PATH, 'utf8')) as { guaranteed: Record<string, string> };
const guaranteed = Object.entries(baseline.guaranteed);
if (guaranteed.length === 0) fail(`read 0 guaranteed paths from ${CONTRACT_PATH}: a sweep over nothing is not a pass (docs/34 shape 9)`);

// Scope: every lever is swept (with >= 2 values) or its control kind is classified out with a reason.
const swept = leverManifest.filter((l) => SWEPT_CONTROLS.includes(l.control));
for (const l of leverManifest) {
  if (SWEPT_CONTROLS.includes(l.control)) {
    // A list sweeps at least its empty list, compared against the brand's own base build; the others need two values.
    const least = l.control === 'list' ? 1 : 2;
    if (valuesOf(l).length < least) fail(`scope: ${l.key} is a ${l.control} with ${valuesOf(l).length} value(s) to sweep${l.control === 'slider' ? ' (no min/max in the manifest)' : ''}; a sweep over too few values compares nothing`);
  } else if (!(l.control in NOT_SWEPT)) {
    fail(`scope: ${l.key} has control '${l.control}', which is neither swept nor classified in NOT_SWEPT with a reason`);
  }
}
for (const r of [...REMOVALS, ...REFUSALS, ...BINDING_DEFECTS]) {
  const l = swept.find((x) => x.key === r.lever);
  if (!l) fail(`allowlist: '${r.lever}' is not a swept lever. The entry names nothing (stale, or a typo)`);
  else if (!valuesOf(l).some((v) => same(v, r.value))) fail(`allowlist: ${r.lever}=${JSON.stringify(r.value)} is not one of its options (${valuesOf(l).map((v) => JSON.stringify(v)).join(', ')})`);
}

// LIST BOUNDS: each sample names a list lever, and the schema's own `minItems`/`maxItems` sit where the samples say.
// Read from the committed schema file, not from `validateBrandInput`, so the comparison has two sides.
const themeSchema = JSON.parse(readFileSync(resolve(here, 'schema/theme-schema.json'), 'utf8'));
const schemaAt = (key: string): Record<string, unknown> | undefined =>
  key.split('.').reduce<Record<string, unknown> | undefined>((n, k) => (n?.properties as Record<string, Record<string, unknown>> | undefined)?.[k], themeSchema);
for (const [key, b] of Object.entries(LIST_BOUNDARIES)) {
  const l = leverManifest.find((x) => x.key === key);
  if (!l || l.control !== 'list') { fail(`LIST_BOUNDARIES: '${key}' is not a list lever. The entry names nothing`); continue; }
  const lens = (vs: Value[]): number[] => vs.map((v) => (v as unknown[]).length);
  const node = schemaAt(key);
  const min = node?.minItems as number | undefined;
  const builtMin = Math.min(...lens(b.built));
  const refusedBelow = lens(b.refused).filter((n) => n < builtMin);
  if (min === undefined) fail(`LIST_BOUNDARIES: the schema states no minItems for ${key}, and this gate expects ${Math.max(...refusedBelow)} refused and ${builtMin} built (#3698 R2)`);
  else if (!(refusedBelow.length && Math.max(...refusedBelow) < min && min <= builtMin))
    fail(`LIST_BOUNDARIES: the schema's minItems for ${key} is ${min}, and this gate expects ${refusedBelow.length ? Math.max(...refusedBelow) : 'nothing'} refused and ${builtMin} built. The two statements of the floor disagree`);
}

const seenRemoval = new Set<string>();   // `${brand}|${lever}=${value}|${path}` observed
const builtByKind: Record<string, number> = {};
const seenRefusal = new Set<Refusal>();
const seenDefect = new Set<string>();   // `${brand}|${lever}=${value}` whose misses matched BINDING_DEFECTS exactly
const summary: string[] = [];
let settings = 0, refsChecked = 0, plansChecked = 0;

for (const brand of BRANDS) {
  const baseTheme = brandTheme(brand.input);
  const basePaths = pathsOf(baseTheme);
  if (brand.contractCorpus) {
    const absent = guaranteed.filter(([p]) => !basePaths.has(p)).map(([p]) => p);
    if (absent.length) fail(`${brand.id} (a contract corpus member) does not emit ${absent.length} guaranteed path(s) at its own settings: ` +
      `${absent.slice(0, 6).join(', ')}. The committed baseline is out of date (run token-contract.ts --check), and the delta arm below would under-report`);
  }
  const baseGuaranteed = guaranteed.filter(([p]) => basePaths.get(p) !== undefined);
  let bSettings = 0, bRemovals = 0, bRefusals = 0, bRefs = 0;

  for (const lever of swept) for (const value of valuesOf(lever)) {
    const tag = `${brand.id} @ ${lever.key}=${JSON.stringify(value)}`;
    const input = structuredClone(brand.input) as unknown as Record<string, unknown>;
    setPath(input, lever.key, structuredClone(value) as Value);

    let theme: Theme;
    try {
      const schemaErrors = validateBrandInput(input);
      if (schemaErrors.length) throw new Error(`schema: ${schemaErrors.join('; ')}`);
      theme = brandTheme(input as unknown as BrandInput);
    } catch (e) {
      const msg = (e as Error).message;
      const r = REFUSALS.find((x) => x.brand === brand.id && x.lever === lever.key && same(x.value, value));
      if (!r) fail(`${tag}: the engine THREW and no REFUSALS entry covers it: ${msg.slice(0, 160)}`);
      else if (!r.message.test(msg)) fail(`${tag}: threw, but not the refusal REFUSALS names (${r.message}): ${msg.slice(0, 160)}`);
      else { seenRefusal.add(r); bRefusals++; }
      continue;
    }
    bSettings++;
    builtByKind[lever.control] = (builtByKind[lever.control] ?? 0) + 1;
    if (LIST_BOUNDARIES[lever.key]?.refused.some((v) => same(v, value)))
      fail(`${tag}: built, and LIST_BOUNDARIES expects it refused, past the list's bound (#3698 R2)`);

    // (a) CONTRACT — removals and retypes of guaranteed paths, attributable to this setting.
    const paths = pathsOf(theme);
    const { removed, retyped } = contractDelta(baseGuaranteed, paths);
    const allowed = new Set(REMOVALS.filter((r) => r.lever === lever.key && same(r.value, value) && r.brands.includes(brand.id)).flatMap((r) => r.paths));
    const unlisted = removed.filter((p) => !allowed.has(p));
    for (const p of removed) if (allowed.has(p)) { seenRemoval.add(`${brand.id}|${lever.key}=${JSON.stringify(value)}|${p}`); bRemovals++; }
    if (unlisted.length) fail(`(a) ${tag} REMOVES ${unlisted.length} guaranteed path(s) not on the REMOVALS allowlist: ${unlisted.slice(0, 8).join(', ')}${unlisted.length > 8 ? ', …' : ''}`);
    if (retyped.length) fail(`(a) ${tag} RETYPES ${retyped.length} guaranteed path(s): ${retyped.slice(0, 6).join(', ')}`);

    // (b) COMPONENTS — every materialized binding resolves against this setting's Figma emission.
    const { misses, refs, plans } = componentMisses(input as unknown as BrandInput, theme, figmaEmitted(theme));
    if (plans === 0 || refs === 0) fail(`(b) ${tag}: projected ${plans} plan(s) carrying ${refs} ref(s). A pass over zero is not a pass (docs/34 shape 9)`);
    bRefs += refs; plansChecked += plans;
    const held = BINDING_DEFECTS.find((x) => x.lever === lever.key && same(x.value, value) && x.brands.includes(brand.id));
    if (held) {
      const got: Record<string, number> = {};
      for (const m of misses) got[m.def] = (got[m.def] ?? 0) + 1;
      if (JSON.stringify(Object.entries(got).sort()) === JSON.stringify(Object.entries(held.misses).sort())) { seenDefect.add(`${brand.id}|${lever.key}=${JSON.stringify(value)}`); misses.length = 0; }
      else fail(`(b) ${tag}: BINDING_DEFECTS holds ${JSON.stringify(held.misses)} (${held.issue.slice(0, 40)}…), and the sweep found ${JSON.stringify(got)}. The held defect changed shape`);
    }
    if (misses.length) {
      const byDef = new Map<string, Miss[]>();
      for (const m of misses) byDef.set(m.def, [...(byDef.get(m.def) ?? []), m]);
      const detail = [...byDef].map(([d, ms]) => `${d} ×${ms.length} [${[...new Set(ms.map((m) => m.error.replace(/ is not in the emitted.*$/, '')))].slice(0, 4).join('; ')}]`);
      fail(`(b) ${tag}: ${misses.length} component binding miss(es), each naming something this setting does not emit: ${detail.join(' · ')}`);
    }
  }
  settings += bSettings; refsChecked += bRefs;
  summary.push(`${brand.id.padEnd(12)} ${String(bSettings).padStart(3)} setting(s) built · ${bRefusals} refusal(s) · ${bRemovals} allowlisted removal(s) · ${bRefs} component ref(s) resolved`);
}

// STALENESS — both directions. A listed removal that no longer happens, or a refusal that no longer throws.
for (const r of REMOVALS) for (const b of r.brands) for (const p of r.paths) {
  if (!seenRemoval.has(`${b}|${r.lever}=${JSON.stringify(r.value)}|${p}`))
    fail(`(a) STALE allowlist entry: ${b} @ ${r.lever}=${JSON.stringify(r.value)} no longer removes ${p}. Delete it (${r.disposition}: ${r.reason.slice(0, 60)}…)`);
}
for (const d of BINDING_DEFECTS) for (const b of d.brands) if (!seenDefect.has(`${b}|${d.lever}=${JSON.stringify(d.value)}`))
  fail(`(b) STALE binding defect: ${b} @ ${d.lever}=${JSON.stringify(d.value)} no longer misses ${JSON.stringify(d.misses)}. Delete the BINDING_DEFECTS entry (${d.issue.slice(0, 40)}…)`);
for (const r of REFUSALS) if (!seenRefusal.has(r))
  fail(`STALE refusal: ${r.brand} @ ${r.lever}=${JSON.stringify(r.value)} no longer throws ${r.message}. Delete the REFUSALS entry and let the sweep check it`);

for (const k of REQUIRED_KINDS) if (!builtByKind[k])
  fail(`represented: no ${k} setting was built on any brand. The sweep promises ${k} levers (REQUIRED_KINDS), and a pass that swept none of them looked at nothing (docs/34 question 3)`);

// ── SELF-CHECKS: each detector can fail, on a known-bad input, through the same function the arm uses ──
{
  const t = brandTheme({ ...MINIMAL_BRAND, outlineInteraction: 'solid-tint' } as BrandInput);
  const button = componentDefs.find((d) => d.id === 'button');
  const raw = button ? componentMisses(MINIMAL_BRAND, t, figmaEmitted(t), [button], false).misses : [];
  if (!raw.some((m) => /color\/interactive\/primary\/overlay\/hover/.test(m.error)))
    fail(`self-check (b): the UNMATERIALIZED button under solid-tint should miss color/interactive/primary/overlay/hover (#1608), and the detector reported ${raw.length} miss(es). It cannot fail`);
  // (a): drop one guaranteed path from a real emission and retype another; the delta must name exactly those.
  const probe = new Map(pathsOf(brandTheme(MINIMAL_BRAND)));
  const [[gone], [moved, movedType]] = guaranteed;
  probe.delete(gone);
  probe.set(moved, movedType === 'color' ? 'dimension' : 'color');
  const d = contractDelta(guaranteed, probe);
  if (d.removed.join() !== gone || d.retyped.length !== 1 || !d.retyped[0].startsWith(`${moved} `))
    fail(`self-check (a): deleting ${gone} and retyping ${moved} should report exactly those; got removed [${d.removed.join(', ')}], retyped [${d.retyped.join(', ')}]`);
}

// ── VERDICT ─────────────────────────────────────────────────────────────────────────────────────────
const perKind = REQUIRED_KINDS.map((k) => `${swept.filter((l) => l.control === k).length} ${k} (${builtByKind[k] ?? 0} built)`).join(', ');
console.log(`Lever sweep (#957): ${swept.length} lever(s), ${perKind}, one at a time, over ${BRANDS.length} brand(s); ` +
  `${guaranteed.length} guaranteed path(s) from the committed contract; ${settings} setting(s) built, ${plansChecked} plan(s) and ` +
  `${refsChecked} component ref(s) checked against each setting's own emission (${projCache.size} distinct materialized def(s) projected).`);
for (const s of summary) console.log(`    ${s}`);
console.log(`    not swept: ${leverManifest.length - swept.length} lever(s) by control kind (${Object.keys(NOT_SWEPT).join(', ')}): see NOT_SWEPT for each reason`);
if (failures.length) {
  console.error(`\n❌ ${failures.length} lever-sweep failure(s):`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error('\nA lever setting must not silently delete a guaranteed token path (arm a), and no component may bind');
  console.error('something a setting deletes (arm b). Either the setting is wrong, or the removal is its purpose and the');
  console.error('contract should say so (demote it via a token-contract.ts corpus member, as #957 did). REMOVALS takes a');
  console.error('reason and is exact in both directions. See docs/30 (Decided, #957) and docs/34.');
  process.exit(1);
}
console.log(`  ✓ no swept setting removes or retypes a guaranteed path outside the ${REMOVALS.length} allowlisted entr${REMOVALS.length === 1 ? 'y' : 'ies'} ` +
  `(${REMOVALS.filter((r) => r.disposition === 'defect').length} a filed defect, plus ${BINDING_DEFECTS.length} filed binding defect(s)), every allowlist, defect and refusal entry still fires, and every`);
console.log('    materialized component binding resolves against the Figma emission for that setting.');
