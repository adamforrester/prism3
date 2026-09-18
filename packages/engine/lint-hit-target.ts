/**
 * HIT-TARGET FLOOR GATE (#1443) — every interactive control presents a hit target of at least 44px at
 * its default size on a comfortable or spacious density, or is one of two named permanent exceptions,
 * and every interactive control is REPRESENTED.
 *
 *   npx tsx packages/engine/lint-hit-target.ts
 *
 * ── THE POLICY (owner-decided, #1437 → #1443, corrected 2026-09-16) ─────────────────────────────
 *
 * Interactive controls adopt a 44px hit-target floor — WCAG 2.2 SC 2.5.5 (Enhanced) Target Size. The
 * floor is about the TOUCH/HIT area, not the visual size (`docs/28`'s touch-target-expansion note is
 * the same distinction). It governs the COMFORTABLE and SPACIOUS densities. There are TWO permanent,
 * owner-decided exceptions and NOTHING else:
 *
 *   1. SMALL BUTTON — a small button knowingly sits below the floor; choosing it is choosing the
 *      smaller target.
 *   2. COMPACT DENSITY — a compact-density brand is a deliberate dense/desktop mode, allowed below the
 *      floor. The exception is scoped to compact ALONE: comfortable and spacious are NOT exempt.
 *
 * `select` binds `size.md.min-height` = `max(size.md.height, 44)` (#1426/#1437); the field/row family
 * otherwise binds the size rung directly, which is 44px at the comfortable `md` and 56px at the spacious
 * `md`, so a control at its default size clears the floor on both densities.
 *
 * ── THE TWO THINGS COMPARED, AND WHY THEY ARE INDEPENDENT (docs/34) ─────────────────────────────
 *
 * EXPECTED is `FLOOR_PX = 44`, the WCAG number transcribed HERE as a literal — deliberately NOT imported
 * from `scale.ts`'s `AAA_TARGET_PX`. The emitter computes `select`'s `min-height` AS `max(md,
 * AAA_TARGET_PX)`, so asserting that emitted value `>= AAA_TARGET_PX` would be `x >= x` (docs/34 shape
 * 2). Written independently, lowering `AAA_TARGET_PX` to 40 fails THIS gate at 44.
 *
 * ACTUAL is the emitted px of the token a control ACTUALLY binds as its hit target, at its DEFAULT size,
 * read THROUGH the def's own `tokens` map (`def.tokens[bindKey]`) and resolved from a freshly built tree
 * per density, so the measurement is mutation-sensitive: point a control's default hit target at a
 * smaller rung and it drops below the floor on a comfortable brand, and the assertion fires by name.
 *
 * ── DENSITY IS THE AXIS THE COMPACT EXCEPTION IS SCOPED TO, SO THE GATE BUILDS IT DIRECTLY ───────
 *
 * The compact exception is about the density LEVER, not about any one brand, so the gate builds one base
 * brand input at each density and asserts each built theme's density is the one it was asked for — a
 * comfortable brand cannot be mislabeled compact and slip past the floor, and the compact measurement
 * cannot be credited to a comfortable one. The FLOOR is asserted over the comfortable + spacious builds;
 * the compact build is exempt, and its exemption is self-justified: the gate asserts compact genuinely
 * runs the default control BELOW 44, so if a future change lifts it to the floor the exemption goes
 * stale and fails by name rather than persisting unexamined. The small-button exception self-justifies
 * the same way — asserted to be actually below the floor on a comfortable brand.
 *
 * ── REPRESENTATION, NOT COUNT (docs/34) ─────────────────────────────────────────────────────────
 *
 * Every def in `componentDefs` is either an INTERACTIVE control measured here, or in EXCLUDED with a
 * stated reason (non-interactive, a nested atom whose target is a row gated separately, a group whose
 * rows are the targets, or the fluid multi-line field with no single-line dimension). A def in neither
 * fails, so a new interactive control cannot arrive unclassified.
 *
 * ── SCOPE / LIMITS, STATED ──────────────────────────────────────────────────────────────────────
 *
 * The floor is measured at each control's DEFAULT size — the tap target a consumer gets without
 * choosing otherwise. Non-default size variants are the density affordance the small-button exception
 * already names in the one place the owner sanctioned it; a small non-button variant sits below the
 * floor on a comfortable brand by the same size ladder, and whether that too should be gated is a scope
 * the owner has not extended (noted in `docs/28`). This reads the emitted TOKEN a control binds, not a
 * rendered pixel: `button`'s CSS `::before` hit overlay and the rows' consumer padding are not emitted,
 * so a control is measured at what it actually emits. Per-mode density overrides are not walked (the
 * base px is read, matching #1437's unit test).
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDefs } from './components/index';
import type { ComponentDef } from './component-schema';
import { buildTree } from './tree';
import { brandTheme } from './theme';
import { parseDesignMd } from './design-md';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * EXPECTED — the WCAG 2.2 SC 2.5.5 enhanced target, transcribed as a literal. NOT `scale.ts`'s
 * `AAA_TARGET_PX`, which the emitter derives select's `min-height` from — sharing it would be `x >= x`.
 */
const FLOOR_PX = 44;

// ── THE DENSITY LEVER, BUILT DIRECTLY ────────────────────────────────────────────────────────────
// One base brand input (`harbor`, a clean comfortable brand) built at each of the three densities, so
// the floor and its compact exception are tested against the LEVER the exception is scoped to rather
// than whichever example brands happen to exist. Each built theme's density is asserted below.
const baseInput = parseDesignMd(readFileSync(resolve(HERE, './examples/harbor.design.md'), 'utf8')).input;
const buildAt = (density: 'comfortable' | 'spacious' | 'compact') => {
  const theme = brandTheme({ ...baseInput, density });
  const built = buildTree(theme);
  return { density, actualDensity: theme.dims.density, tree: built.tree, root: Object.keys(built.tree)[0] };
};
const FLOOR_DENSITIES = ['comfortable', 'spacious'] as const;
const EXEMPT_DENSITY = 'compact' as const;
const floorBuilds = FLOOR_DENSITIES.map(buildAt);
const compactBuild = buildAt(EXEMPT_DENSITY);

/** Resolve a dotted token path (e.g. `size.md.min-height`) to its emitted px, under the tree's root. */
const resolvePx = (tree: any, root: string, path: string): number | undefined => {
  let node = tree[root];
  for (const seg of path.split('.')) {
    node = node?.[seg];
    if (node === undefined) return undefined;
  }
  return node?.$extensions?.prism3?.px;
};

// ── THE INTERACTIVE CONTROLS AND THEIR HIT-TARGET BINDING ────────────────────────────────────────
// Per control, the KEY in `def.tokens` whose value is the token bound as the hit-target dimension at a
// given size. Read THROUGH `def.tokens` so a reverted binding is caught. `single` marks a control with no
// `size` variant axis whose projected control binds the one `md` min-height rung (`select`, and `text-field`
// since #1494); every other control is measured at its declared DEFAULT size.
type Binding = { key: (size: string) => string; why: string; single?: boolean };
const INTERACTIVE: Record<string, Binding> = {
  'button': { key: (s) => `size.${s}.height`, why: 'the button box height' },
  'button-destructive': { key: (s) => `size.${s}.height`, why: 'the button box height' },
  'button-neutral': { key: (s) => `size.${s}.height`, why: 'the button box height' },
  'icon-button': { key: (s) => `size.${s}.side`, why: 'the square icon-button side' },
  'icon-button-destructive': { key: (s) => `size.${s}.side`, why: 'the square icon-button side' },
  'icon-button-neutral': { key: (s) => `size.${s}.side`, why: 'the square icon-button side' },
  'text-field': { key: () => 'min-height', why: 'size.md.min-height, the interactive floor (#1494/#1437) — text-field projects a single md rung like select, so its representative tap target is that rung, not the code-API size ladder', single: true },
  'select': { key: () => 'min-height', why: 'size.md.min-height, the interactive floor (#1437)', single: true },
  'switch-row': { key: (s) => `size.${s}.min-height`, why: 'the labelled switch row floor' },
  'checkbox-row': { key: (s) => `size.${s}.min-height`, why: 'the labelled checkbox row floor' },
  'radio-row': { key: (s) => `size.${s}.min-height`, why: 'the labelled radio row floor' },
};

/** The one family carved out as a size-level exception (owner, #1443): a small button sits below the
 *  floor on purpose. Kept as data so the walk asserts it is ACTUALLY below the floor. */
const SMALL_BUTTON = new Set(['button', 'button-destructive', 'button-neutral']);

// ── EXCLUDED: represented, with a stated reason (docs/34 — a hand-enumerated legitimate exclusion) ──
const EXCLUDED: Record<string, string> = {
  'icon': 'a decorative glyph, not a control — an icon-only ACTION is icon-button, which is gated',
  'focus-ring': 'a decorative ring nested by other controls; never a standalone tap target',
  'field-label': 'a field label, not an interactive control',
  'field-message': 'a helper/validation message, not an interactive control',
  'veil': 'a media wash overlay, not an interactive control',
  'image-placeholder': 'an empty-state media frame, not an interactive control',
  'checkbox-control': 'a nested-only atom — the tap target is the labelled row (checkbox-row), gated here',
  'radio-control': 'a nested-only atom — the tap target is the labelled row (radio), gated here',
  'switch-control': 'a nested-only atom — the tap target is the labelled row (switch), gated here; its bare 24–32px track fails SC 2.5.8 in isolation by its own codeOnly',
  'checkbox-group': 'a group container — its interactive tap targets are the nested checkbox-rows, which are gated',
  'radio-group': 'a group container — its interactive tap targets are the nested radio-rows, which are gated',
  'textarea': 'a multi-line field whose height is rows/auto-grow (fluid); it binds no single-line height, so there is no fixed hit-target dimension to measure',
};

/**
 * THE ONE ASSERTION, as a pure predicate so the self-check can drive it (docs/34, never a second
 * spelling of the rule). Returns a failure clause, or `null` when acceptable.
 *   floor      — must be >= 44 on comfortable + spacious (the regression this gate exists to catch).
 *   exception  — must be <  44, or the sanctioned below-floor case (small button, or compact density)
 *                is stale: a change lifted it to the floor, so the exception must be reconsidered.
 */
type Kind = 'floor' | 'exception';
const violation = (px: number, kind: Kind): string | null =>
  kind === 'floor'
    ? (px >= FLOOR_PX ? null : `is ${px}px, below the ${FLOOR_PX}px floor`)
    : (px < FLOOR_PX ? null : `measures ${px}px >= ${FLOOR_PX} — the below-floor exception is stale; a change lifted it to the floor, so reconsider the exception`);

// ── SELF-CHECK: can each arm of `violation` fire, and only when it should? (docs/34) ───────────────
const selfFails: string[] = [];
const CASES: Array<{ px: number; kind: Kind; fires: boolean; why: string }> = [
  { px: 44, kind: 'floor', fires: false, why: 'a control AT the floor passes (comfortable md today)' },
  { px: 36, kind: 'floor', fires: true, why: 'THE MUTATION: a default control pointed at a sub-floor rung (36) is the regression this gate catches, by name' },
  { px: 43, kind: 'floor', fires: true, why: 'one px under the floor still fails — the boundary is >=, not >' },
  { px: 36, kind: 'exception', fires: false, why: 'small button / compact md below the floor on purpose — the sanctioned exception' },
  { px: 44, kind: 'exception', fires: true, why: 'an exception lifted to 44 makes the carve-out stale — the lift must be NOTICED, not silently kept' },
];
for (const c of CASES) {
  const fired = violation(c.px, c.kind) !== null;
  if (fired !== c.fires) selfFails.push(`violation(${c.px}, '${c.kind}') should ${c.fires ? 'FIRE' : 'pass'} — ${c.why} — but did not.`);
}
for (const k of ['floor', 'exception'] as Kind[]) {
  if (!CASES.some((c) => c.kind === k && c.fires)) selfFails.push(`no self-check case makes kind '${k}' FIRE — that arm is unfalsifiable here.`);
  if (!CASES.some((c) => c.kind === k && !c.fires)) selfFails.push(`no self-check case makes kind '${k}' PASS — that arm is a false-positive generator here.`);
}

const failures: string[] = [...selfFails];

// ── DENSITY ASSERTIONS: the floor set is genuinely comfortable/spacious; the exempt build is compact ──
// So the compact exception is scoped to compact ALONE and cannot swallow a comfortable/spacious
// regression — the requirement stated in the #1443 unblock.
for (const b of floorBuilds)
  if (b.actualDensity !== b.density)
    failures.push(`the ${b.density} build resolved to density '${b.actualDensity}' — the floor set must be the densities it claims, or the floor is asserted over the wrong ladder.`);
if (compactBuild.actualDensity !== EXEMPT_DENSITY)
  failures.push(`the exempt build resolved to density '${compactBuild.actualDensity}', not '${EXEMPT_DENSITY}' — the compact exception must be scoped to compact alone.`);

// ── REPRESENTATION: every def is measured or excluded, exactly once ───────────────────────────────
const defIds = new Set(componentDefs.map((d) => d.id));
for (const d of componentDefs) {
  const inInteractive = d.id in INTERACTIVE;
  const inExcluded = d.id in EXCLUDED;
  if (inInteractive && inExcluded) failures.push(`${d.id}: appears in BOTH INTERACTIVE and EXCLUDED — decide which, then state it once.`);
  if (!inInteractive && !inExcluded) failures.push(`${d.id}: is neither measured nor excluded. A new interactive control must be added to INTERACTIVE with its hit-target binding; a non-control must be added to EXCLUDED with a reason.`);
}
for (const id of Object.keys(INTERACTIVE)) if (!defIds.has(id)) failures.push(`INTERACTIVE names '${id}', which is not a def in componentDefs — a stale entry measures nothing.`);
for (const id of Object.keys(EXCLUDED)) if (!defIds.has(id)) failures.push(`EXCLUDED names '${id}', which is not a def in componentDefs — a stale exclusion.`);
for (const id of SMALL_BUTTON) if (!(id in INTERACTIVE)) failures.push(`SMALL_BUTTON names '${id}', which is not an INTERACTIVE control — a stale exception entry.`);

/** A control's DEFAULT size — the `size` prop's default, or `single` for the no-size-axis control. */
const defaultSizeOf = (def: ComponentDef): string | undefined =>
  (def.props?.find((p) => p.name === 'size') as { default?: string } | undefined)?.default;

// ── THE WALK: default size, floor over comfortable + spacious ─────────────────────────────────────
const rows: string[] = [];
let floorCount = 0;
for (const def of componentDefs) {
  const binding = INTERACTIVE[def.id];
  if (!binding) continue;

  // Locate the default size and assert the enumeration agrees with the def's own axis.
  const declaredSizes = def.variants?.size as string[] | undefined;
  let size: string;
  if (binding.single) {
    if (declaredSizes) failures.push(`${def.id}: is enumerated single-size but declares variants.size [${declaredSizes.join(', ')}].`);
    size = 'single';
  } else {
    const dflt = defaultSizeOf(def);
    if (!dflt || !declaredSizes?.includes(dflt)) {
      failures.push(`${def.id}: could not read a default size from its \`size\` prop that is one of variants.size [${(declaredSizes ?? []).join(', ')}] (got ${dflt ?? 'none'}) — cannot pick the representative tap target.`);
      continue;
    }
    size = dflt;
  }

  const bindKey = binding.key(size);
  const tokenPath = (def.tokens as Record<string, string> | undefined)?.[bindKey];
  if (!tokenPath) {
    failures.push(`${def.id}/${size}: binds no token at tokens['${bindKey}'] (${binding.why}) — the hit-target binding moved. Re-point INTERACTIVE['${def.id}'].key.`);
    continue;
  }

  // ACTUAL: the worst (smallest) emitted px across the FLOOR densities.
  const measured = floorBuilds.map((b) => ({ density: b.density, px: resolvePx(b.tree, b.root, tokenPath) }));
  const missing = measured.filter((m) => m.px === undefined);
  if (missing.length) {
    failures.push(`${def.id}/${size}: token '${tokenPath}' does not resolve to a px on the ${missing.map((m) => m.density).join(', ')} build(s) — cannot measure the hit target.`);
    continue;
  }
  const minPx = Math.min(...measured.map((m) => m.px!));
  floorCount++;
  const bad = violation(minPx, 'floor');
  rows.push(`${def.id}/${size} → ${tokenPath} = ${minPx}px (min over ${FLOOR_DENSITIES.join('+')}) [floor]${bad ? '  ✗' : ''}`);
  if (bad) failures.push(`${def.id}/${size} (${binding.why}, ${tokenPath}) ${bad} on a ${measured.find((m) => m.px === minPx)!.density} brand — a control's default tap target must meet the floor on comfortable and spacious.`);
}

// ── EXCEPTION 1: small button — asserted ACTUALLY below the floor on comfortable (self-justified) ──
const comfortable = floorBuilds.find((b) => b.density === 'comfortable')!;
for (const id of SMALL_BUTTON) {
  const def = componentDefs.find((d) => d.id === id)!;
  const path = (def.tokens as Record<string, string>)['size.small.height'];
  const px = path ? resolvePx(comfortable.tree, comfortable.root, path) : undefined;
  if (px === undefined) { failures.push(`${id}/small: cannot measure size.small.height on the comfortable build — the small-button exception is unverifiable.`); continue; }
  const bad = violation(px, 'exception');
  rows.push(`${id}/small → ${path} = ${px}px (comfortable) [PERMANENT exception: small button]${bad ? '  ✗' : ''}`);
  if (bad) failures.push(`${id}/small (small button) ${bad} — the small-button exception exists because it is BELOW the floor; if it now meets it, drop the exception.`);
}

// ── EXCEPTION 2: compact density — exempt from the floor, and self-justified as genuinely below it ──
// The default control on compact (size.md at 36) must be below the floor, or the compact exception is
// exempting something that already meets it. `text-field` is a representative field control here.
const compactMdPath = (componentDefs.find((d) => d.id === 'text-field')!.tokens as Record<string, string>)['size.medium.height'];
const compactMdPx = resolvePx(compactBuild.tree, compactBuild.root, compactMdPath);
if (compactMdPx === undefined) {
  failures.push(`cannot measure the default field height on the compact build — the compact exception is unverifiable.`);
} else {
  const bad = violation(compactMdPx, 'exception');
  rows.push(`compact density → ${compactMdPath} = ${compactMdPx}px [PERMANENT exception: compact density, exempt from the floor]${bad ? '  ✗' : ''}`);
  if (bad) failures.push(`compact density: the default field control measures ${compactMdPx}px >= ${FLOOR_PX} — compact no longer runs below the floor, so the compact-density exception is stale and should be reconsidered.`);
}

// ── NON-EMPTY FLOOR: the gate must be holding at least one control TO the floor (docs/34) ──────────
if (floorCount === 0 && !failures.length)
  failures.push(`no interactive control was measured against the floor — the gate asserts nothing.`);

// ── REPORT ────────────────────────────────────────────────────────────────────────────────────────
console.log(`Hit-target floor — floor ${FLOOR_PX}px (WCAG 2.5.5) at each control's DEFAULT size over the ${FLOOR_DENSITIES.join(' + ')} densities; ${floorCount} control(s) held to the floor, 2 permanent exceptions (small button; compact density), ${Object.keys(EXCLUDED).length} def(s) excluded.`);
for (const r of rows) console.log(`    ${r}`);
if (failures.length) {
  console.error(`\n❌ ${failures.length} hit-target failure(s):`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error(`\nInteractive controls adopt a ${FLOOR_PX}px hit-target floor (WCAG 2.2 SC 2.5.5) on comfortable and`);
  console.error(`spacious densities — the TOUCH area, not the visual size. Two permanent exceptions: small button,`);
  console.error(`and compact density (a deliberate dense mode). See docs/28 and docs/34.`);
  process.exit(1);
}
console.log(`  ✓ every interactive control meets the ${FLOOR_PX}px floor at its default size on comfortable and`);
console.log(`    spacious, both permanent exceptions are actually below the floor (so a lift fails by name), and`);
console.log(`    every def is represented (measured or excluded with a reason) — a new sub-44 control cannot arrive unseen.`);
