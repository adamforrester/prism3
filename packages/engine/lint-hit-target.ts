/**
 * HIT-TARGET FLOOR GATE (#1443) — every interactive control presents a hit target of at least 44px,
 * or is on one of two explicit allowlist tiers, and every interactive control is REPRESENTED.
 *
 *   npx tsx packages/engine/lint-hit-target.ts
 *
 * ── THE POLICY (owner-decided, #1437 → #1443) ───────────────────────────────────────────────────
 *
 * Interactive controls adopt a 44px hit-target floor — WCAG 2.2 SC 2.5.5 (Enhanced) Target Size. The
 * floor is about the TOUCH/HIT area, not the visual size (`docs/28`'s touch-target-expansion note is
 * the same distinction). `select` adopted it first (#1426/#1437) by binding `size.md.min-height` =
 * `max(size.md.height, 44)`, so it clears the floor at every brand density; the raw `size.md.height`
 * rung is 36px on a compact brand, which clears SC 2.5.8 (24) but not the enhanced target.
 *
 * The ONE documented permanent exception is `small button` (owner, 2026-09-15): a small button
 * knowingly sits below the floor. Nothing else is blessed below it. Controls that are below 44 today
 * and are NOT small button are TRACKED GAPS — explicit, filed debt (#1453), not silent passes and not
 * permanent exceptions.
 *
 * ── WHY THIS IS A GATE AND NOT JUST THE #1437 UNIT TEST ─────────────────────────────────────────
 *
 * `test.ts` (#1437) asserts the emitter computes `size.md.min-height = max(size.md.height, 44)` and that
 * `select` binds it. That gates the ENGINE'S MATH and select's ONE binding. It does not gate the
 * cross-component POLICY: that every interactive control either meets the floor or is a named exception,
 * and that a new sub-44 control cannot arrive unnoticed. This gate is that lock, and it is the surface
 * #1443 asks for: `select` at 44, `small button` a self-justified exception, the rest tracked by name.
 *
 * ── THE TWO THINGS COMPARED, AND WHY THEY ARE INDEPENDENT (docs/34) ─────────────────────────────
 *
 * EXPECTED is `FLOOR_PX = 44`, the WCAG number transcribed HERE as a literal. It is deliberately NOT
 * imported from `scale.ts`'s `AAA_TARGET_PX`: the emitter computes `select`'s `min-height` AS
 * `max(md, AAA_TARGET_PX)`, so asserting that emitted value `>= AAA_TARGET_PX` would be `x >= x` — the
 * gate agreeing with the emitter by construction (docs/34 shape 2). Because 44 is written independently,
 * lowering `AAA_TARGET_PX` to 40 drops select's emitted min-height to 40 and THIS gate fails at 44,
 * which is the regression a shared constant would hide.
 *
 * ACTUAL is the emitted px of the token the control ACTUALLY binds as its hit target, resolved from a
 * freshly built tree per brand. It is read THROUGH the def's own `tokens` map (`def.tokens[bindKey]`),
 * so the measurement is mutation-sensitive: revert `select`'s binding from `size.md.min-height` back to
 * `size.md.height` and the resolved value drops to 36 on the compact brand, and the floor assertion
 * fires by name. The bind KEY per control is authored here (below), not read off the anatomy, because
 * the controls express their hit target three different ways (a bound box height, a `min-height` floor,
 * a labelled-row floor) and one authored table is clearer than a locator that must special-case each.
 *
 * ── REPRESENTATION, NOT COUNT (docs/34) ─────────────────────────────────────────────────────────
 *
 * Every def in `componentDefs` is either an INTERACTIVE control measured here, or in EXCLUDED with a
 * stated reason (non-interactive, a nested atom whose target is a row gated separately, a group whose
 * rows are the targets, or the fluid multi-line field with no single-line dimension). A def in neither
 * — a NEW interactive control — fails, so coverage cannot shrink or a control arrive unclassified. Both
 * allowlist tiers are checked back against the interactive set, so a stale exception for a control/size
 * that no longer exists fails too.
 *
 * ── THE ALLOWLIST HAS TWO TIERS, AND BOTH SELF-JUSTIFY ──────────────────────────────────────────
 *
 * PERMANENT (`small button`) and TRACKED_GAP (everything sub-44 that is not small button, keyed to
 * #1453). An allowlisted entry is asserted to ACTUALLY be below the floor — so it cannot silently
 * swallow a regression, and the day a gap is fixed (or a future change lifts small button to 44) the
 * entry goes stale and the gate says so BY NAME, prompting a reclassification rather than a quiet keep.
 * That is the same converse arm `lint-standalone-floor.ts` uses to stop a declaration becoming a
 * permanent exemption.
 *
 * ── SCOPE / LIMITS, STATED ──────────────────────────────────────────────────────────────────────
 *
 * This reads the emitted TOKEN a control binds, not a rendered pixel. `button` reaches 44 via a CSS
 * `::before` overlay Figma cannot express and the engine does not emit, and `switch`/`checkbox-row`/
 * `radio` expect the labelled ROW to supply the hit area — but the row's own emitted floor is
 * `size.{size}.height`, and any expansion beyond it is an unbound per-consumer layout decision. Per the
 * owner's rule, an unmeasurable or sub-44 wrapper does NOT satisfy the floor: those controls are
 * measured at what they actually emit, and are gaps where that is below 44. Per-mode density overrides
 * are not walked (the base/light px is read, matching #1437's unit test); the compact example brand is
 * the load-bearing case a single-density read already covers.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDefs } from './components/index';
import type { ComponentDef } from './component-schema';
import { buildTree } from './tree';
import { nbTheme } from './nb-fixture';
import { brandTheme } from './theme';
import { parseDesignMd } from './design-md';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * EXPECTED — the WCAG 2.2 SC 2.5.5 enhanced target, transcribed as a literal. NOT imported from
 * `scale.ts` (`AAA_TARGET_PX`): the emitter derives select's `min-height` from that constant, so sharing
 * it would make this gate `x >= x`. See the header.
 */
const FLOOR_PX = 44;

// ── THE BRAND CORPUS ────────────────────────────────────────────────────────────────────────────
// A comfortable brand and — the load-bearing case — a COMPACT one, whose `md` rung is 36px, below the
// floor. `harbor` is a second comfortable brand so a single brand's quirk cannot stand in for "all".
// The same three `lint-ramp-steps.ts` and the #1437 unit test build.
const readBrand = (f: string) => brandTheme(parseDesignMd(readFileSync(resolve(HERE, `./examples/${f}`), 'utf8')).input);
const BRANDS: Array<[string, () => any]> = [
  ['nb (comfortable)', () => nbTheme()],
  ['aurora (compact)', () => readBrand('aurora.design.md')],
  ['harbor (comfortable)', () => readBrand('harbor.design.md')],
];

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
// For each interactive control, per size variant, the KEY in `def.tokens` whose value is the token bound
// as that variant's hit-target dimension. Read THROUGH `def.tokens` so a reverted binding is caught
// (header). `sizes` is asserted against the def's own `variants.size` below, so a control that gains a
// size variant fails here until it is classified.
const BLR = ['small', 'medium', 'large'];
type Binding = { sizes: string[]; key: (size: string) => string; why: string };

const INTERACTIVE: Record<string, Binding> = {
  // Field/action controls bind their box HEIGHT directly, per size.
  'button': { sizes: BLR, key: (s) => `size.${s}.height`, why: 'the button box height' },
  'button-destructive': { sizes: BLR, key: (s) => `size.${s}.height`, why: 'the button box height' },
  'button-neutral': { sizes: BLR, key: (s) => `size.${s}.height`, why: 'the button box height' },
  // Icon-buttons are square; the hit target is the box SIDE, itself bound to the size rung.
  'icon-button': { sizes: BLR, key: (s) => `size.${s}.side`, why: 'the square icon-button side' },
  'icon-button-destructive': { sizes: BLR, key: (s) => `size.${s}.side`, why: 'the square icon-button side' },
  'icon-button-neutral': { sizes: BLR, key: (s) => `size.${s}.side`, why: 'the square icon-button side' },
  'text-field': { sizes: BLR, key: (s) => `size.${s}.height`, why: 'the single-line field height' },
  // The one control that binds the floor itself (#1426/#1437). Single-size: no `size` variant axis, so
  // the size label `(single)` is asserted against the ABSENCE of `variants.size` below.
  'select': { sizes: ['(single)'], key: () => 'min-height', why: 'size.md.min-height, the interactive floor (#1437)' },
  // The labelled selection rows bind a row FLOOR (`min-height`), itself pointed at the size rung. The
  // painted atom they nest (checkbox-control/…) is not a standalone target — see EXCLUDED.
  'switch': { sizes: ['small', 'medium'], key: (s) => `size.${s}.min-height`, why: 'the labelled switch row floor' },
  'checkbox-row': { sizes: BLR, key: (s) => `size.${s}.min-height`, why: 'the labelled checkbox row floor' },
  'radio': { sizes: BLR, key: (s) => `size.${s}.min-height`, why: 'the labelled radio row floor' },
};

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
  'textarea': 'a multi-line field whose height is rows/auto-grow (fluid); it binds no single-line height, so there is no fixed hit-target dimension to measure',
};

// ── THE ALLOWLIST, TWO TIERS ─────────────────────────────────────────────────────────────────────
// Keyed `${id}/${size}`. PERMANENT is owner-decided and self-justified; TRACKED_GAP is filed debt.
const key = (id: string, size: string) => `${id}/${size}`;

/** The ONE permanent exception (owner, 2026-09-15): a small button knowingly sits below the floor. */
const PERMANENT = new Set<string>([
  key('button', 'small'),
  key('button-destructive', 'small'),
  key('button-neutral', 'small'),
]);

/** Sub-44 controls that are NOT small button — tracked debt, every one filed under #1453. Removed (not
 *  kept) when the gap is fixed: the liveness assertion below fails the day the control reaches 44. */
const GAP_ISSUE = 1453;
const TRACKED_GAP = new Set<string>([
  key('button', 'medium'), key('button-destructive', 'medium'), key('button-neutral', 'medium'),
  key('icon-button', 'small'), key('icon-button', 'medium'),
  key('icon-button-destructive', 'small'), key('icon-button-destructive', 'medium'),
  key('icon-button-neutral', 'small'), key('icon-button-neutral', 'medium'),
  key('text-field', 'small'), key('text-field', 'medium'),
  key('switch', 'small'), key('switch', 'medium'),
  key('checkbox-row', 'small'), key('checkbox-row', 'medium'),
  key('radio', 'small'), key('radio', 'medium'),
]);

type Status = 'floor' | 'permanent' | 'gap';
const statusOf = (id: string, size: string): Status =>
  PERMANENT.has(key(id, size)) ? 'permanent' : TRACKED_GAP.has(key(id, size)) ? 'gap' : 'floor';

/**
 * THE ONE ASSERTION, as a pure predicate so the self-check can drive it (docs/34, never a second
 * spelling of the rule). Returns a failure clause, or `null` when the (px, status) pair is acceptable.
 *   floor      — must be >= 44 (the mutation the whole gate exists to catch).
 *   permanent  — must be <  44, or the sanctioned exception is stale and a lift went unnoticed.
 *   gap        — must be <  44, or the gap is fixed and the entry must be promoted to floor / removed.
 */
const violation = (minPx: number, status: Status): string | null => {
  if (status === 'floor') return minPx >= FLOOR_PX ? null : `is ${minPx}px, below the ${FLOOR_PX}px floor, and is on no allowlist tier`;
  if (status === 'permanent') return minPx < FLOOR_PX ? null : `is on the PERMANENT (small-button) exception but measures ${minPx}px >= ${FLOOR_PX} — the exception is stale; a change lifted it to the floor, so remove the exception`;
  return minPx < FLOOR_PX ? null : `is on the TRACKED-GAP tier (#${GAP_ISSUE}) but measures ${minPx}px >= ${FLOOR_PX} — the gap is fixed; remove it from TRACKED_GAP so the floor holds it`;
};

// ── SELF-CHECK: can each arm of `violation` fire, and only when it should? (docs/34) ───────────────
// A truth table over the two axes it reads. EXPECTED is authored in words; ACTUAL is the predicate.
const selfFails: string[] = [];
const CASES: Array<{ minPx: number; status: Status; fires: boolean; why: string }> = [
  { minPx: 44, status: 'floor', fires: false, why: 'select today: a floor control AT the floor passes' },
  { minPx: 36, status: 'floor', fires: true, why: 'THE MUTATION: a floor control at the compact md rung (36) is the regression this gate exists to catch, by name' },
  { minPx: 43, status: 'floor', fires: true, why: 'one px under the floor still fails — the boundary is >=, not >' },
  { minPx: 28, status: 'permanent', fires: false, why: 'small button below the floor on purpose — the sanctioned exception' },
  { minPx: 44, status: 'permanent', fires: true, why: 'a small button lifted to 44 makes the exception stale — the lift must be NOTICED, not silently kept' },
  { minPx: 36, status: 'gap', fires: false, why: 'a tracked gap still below the floor — accepted, filed debt' },
  { minPx: 44, status: 'gap', fires: true, why: 'a tracked gap fixed to 44 must fail so the entry is removed and the floor takes over' },
];
for (const c of CASES) {
  const fired = violation(c.minPx, c.status) !== null;
  if (fired !== c.fires) selfFails.push(`violation(${c.minPx}, '${c.status}') should ${c.fires ? 'FIRE' : 'pass'} — ${c.why} — but did not.`);
}
// The table must exercise BOTH outcomes of every status, or an arm is asserted only where it agrees.
for (const s of ['floor', 'permanent', 'gap'] as Status[]) {
  if (!CASES.some((c) => c.status === s && c.fires)) selfFails.push(`no self-check case makes status '${s}' FIRE — that arm is unfalsifiable here.`);
  if (!CASES.some((c) => c.status === s && !c.fires)) selfFails.push(`no self-check case makes status '${s}' PASS — that arm is a false-positive generator here.`);
}

// ── BUILD THE CORPUS ONCE ─────────────────────────────────────────────────────────────────────────
const trees: Array<{ id: string; tree: any; root: string }> = [];
for (const [id, mk] of BRANDS) {
  const built = buildTree(mk());
  trees.push({ id, tree: built.tree, root: Object.keys(built.tree)[0] });
}

// ── REPRESENTATION: every def is measured or excluded, exactly once ───────────────────────────────
const failures: string[] = [...selfFails];
const defIds = new Set(componentDefs.map((d) => d.id));
for (const d of componentDefs) {
  const inInteractive = d.id in INTERACTIVE;
  const inExcluded = d.id in EXCLUDED;
  if (inInteractive && inExcluded) failures.push(`${d.id}: appears in BOTH INTERACTIVE and EXCLUDED — decide which, then state it once.`);
  if (!inInteractive && !inExcluded) failures.push(`${d.id}: is neither measured nor excluded. A new interactive control must be added to INTERACTIVE with its hit-target binding and classified (floor / small-button exception / tracked gap #${GAP_ISSUE}); a non-control must be added to EXCLUDED with a reason.`);
}
// No stale entries: every INTERACTIVE / EXCLUDED / allowlist id must be a real def.
for (const id of Object.keys(INTERACTIVE)) if (!defIds.has(id)) failures.push(`INTERACTIVE names '${id}', which is not a def in componentDefs — a stale entry measures nothing.`);
for (const id of Object.keys(EXCLUDED)) if (!defIds.has(id)) failures.push(`EXCLUDED names '${id}', which is not a def in componentDefs — a stale exclusion.`);
for (const k of [...PERMANENT, ...TRACKED_GAP]) {
  const id = k.split('/')[0];
  if (!(id in INTERACTIVE)) failures.push(`allowlist entry '${k}' is for '${id}', which is not an INTERACTIVE control — a stale allowlist entry cannot swallow a regression it no longer maps to.`);
}

// ── THE WALK ──────────────────────────────────────────────────────────────────────────────────────
const rows: string[] = [];
let floorCount = 0;
for (const def of componentDefs) {
  const binding = INTERACTIVE[def.id];
  if (!binding) continue;

  // The def's own size axis must match what we enumerate (or be absent for the single-size `select`).
  const declaredSizes = (def.variants?.size as string[] | undefined);
  if (binding.sizes.length === 1 && binding.sizes[0] === '(single)') {
    if (declaredSizes) failures.push(`${def.id}: is enumerated single-size but declares variants.size [${declaredSizes.join(', ')}] — enumerate each size and classify it.`);
  } else if (!declaredSizes || JSON.stringify([...declaredSizes].sort()) !== JSON.stringify([...binding.sizes].sort())) {
    failures.push(`${def.id}: INTERACTIVE enumerates sizes [${binding.sizes.join(', ')}] but the def's variants.size is [${(declaredSizes ?? []).join(', ')}] — a size gained or lost must be classified here.`);
  }

  for (const size of binding.sizes) {
    const bindKey = binding.key(size);
    const tokenPath = (def.tokens as Record<string, string> | undefined)?.[bindKey];
    if (!tokenPath) {
      failures.push(`${def.id}/${size}: binds no token at tokens['${bindKey}'] (${binding.why}) — the hit-target binding moved. Re-point INTERACTIVE['${def.id}'].key, or classify the new shape.`);
      continue;
    }
    // ACTUAL: the worst (smallest) emitted px across brands.
    const measured: Array<{ id: string; px: number | undefined }> = trees.map((b) => ({ id: b.id, px: resolvePx(b.tree, b.root, tokenPath) }));
    const missing = measured.filter((m) => m.px === undefined);
    if (missing.length) {
      failures.push(`${def.id}/${size}: token '${tokenPath}' does not resolve to a px on ${missing.map((m) => m.id).join(', ')} — cannot measure the hit target.`);
      continue;
    }
    const minPx = Math.min(...measured.map((m) => m.px!));
    const status = statusOf(def.id, size);
    if (status === 'floor') floorCount++;

    const bad = violation(minPx, status);
    const tierLabel = status === 'floor' ? 'floor' : status === 'permanent' ? 'PERMANENT exception' : `tracked gap #${GAP_ISSUE}`;
    rows.push(`${def.id}/${size} → ${tokenPath} = ${minPx}px [${tierLabel}]${bad ? '  ✗' : ''}`);
    if (bad) failures.push(`${def.id}/${size} (${binding.why}, ${tokenPath}) ${bad}.`);
  }
}

// ── NON-EMPTY FLOOR: the gate must be holding at least one control TO the floor (docs/34) ──────────
if (floorCount === 0 && !failures.length) {
  failures.push(`no control is on the FLOOR tier — every interactive control is allowlisted, so this gate asserts the floor over nothing. At least \`select\` must bind size.md.min-height and be held to ${FLOOR_PX}px.`);
}

// ── REPORT ────────────────────────────────────────────────────────────────────────────────────────
const measuredCount = rows.length;
console.log(`Hit-target floor — floor ${FLOOR_PX}px (WCAG 2.5.5) over ${measuredCount} interactive control/size(s) across ${BRANDS.length} brands; ${floorCount} held to the floor, ${PERMANENT.size} permanent exception(s), ${TRACKED_GAP.size} tracked gap(s) (#${GAP_ISSUE}); ${Object.keys(EXCLUDED).length} def(s) excluded.`);
for (const r of rows) console.log(`    ${r}`);
if (failures.length) {
  console.error(`\n❌ ${failures.length} hit-target failure(s):`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error(`\nInteractive controls adopt a ${FLOOR_PX}px hit-target floor (WCAG 2.2 SC 2.5.5) — the TOUCH area, not`);
  console.error(`the visual size. Only \`small button\` is a permanent exception (owner, #1443); sub-44 controls that`);
  console.error(`are not small button are tracked debt (#${GAP_ISSUE}), never silent passes. See docs/28 and docs/34.`);
  process.exit(1);
}
console.log(`  ✓ every interactive control meets the ${FLOOR_PX}px floor or is a named exception, and every def is`);
console.log(`    represented (measured or excluded with a reason) — so a new sub-44 control cannot arrive unseen,`);
console.log(`    and a fixed gap or a lifted exception fails by name rather than staying on the list.`);
