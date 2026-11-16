/**
 * LINE-HEIGHT BAKE GATE (#1356, part of the #1329 host-truth audit) — a text style's line height is
 * emitted as an UNBOUND, mode-invariant PERCENT bake, never a variable binding. This gate is the
 * committed record that the omission the audit found is DELIBERATE and CORRECT, and the thing that
 * fails BY NAME if a later edit "fixes" it by binding.
 *
 *   npx tsx packages/engine/lint-lineheight-bake.ts
 *
 * ── WHY THIS EXISTS: THE AUDIT FINDING, AND WHY BINDING IS THE WRONG FIX ─────────────────────────
 *
 * #1356: every TEXT node across all emitted sets binds `fontSize`/`fontWeight`/`fontFamily` to
 * `core/font/*` (as of #1485 the weight/style control binds the STRING cut `fontStyle`, not the FLOAT
 * `fontWeight` — see `lint-cut-binding.ts`; either way lineHeight stays unbound), and
 * `boundVariables.lineHeight` is EMPTY everywhere. Line height IS applied — a
 * field-label's 16px text sits in a 24px line box — but as a raw value, not through a variable, so at
 * first read a brand changing its line-height scale would not propagate. The audit asked the right
 * question before assuming a bug: was the omission deliberate?
 *
 * It is, and three independent facts make binding not merely unimplemented but WRONG:
 *
 *   1. THE ROLE IS A UNITLESS MULTIPLIER. `theme.ts` types `lineHeights: { key; value }[]` as unitless
 *      multipliers (1.15, 1.5, …) and the emitted DTCG primitive `core.font.line-height.*` is a
 *      `number` in the token contract. Figma's text `lineHeight` takes PERCENT or PIXELS, never a
 *      unitless float — so a FLOAT variable holding 1.5 bound to line height renders as 1.5 PIXELS,
 *      not 150%. Silently, and catastrophically (every line collapses).
 *
 *   2. FIGMA BINDS LINE HEIGHT AS PIXELS ONLY. Measured against Figma's own API and docs (2026-09):
 *      `setBoundVariable('lineHeight', v)` accepts a FLOAT variable, and Figma interprets that value
 *      as PIXELS. Percentage / unitless line height cannot be variable-bound at all — a long-standing,
 *      intentional platform limitation ("variable of resolved type 'FLOAT' cannot be bound to this
 *      field" for a percentage line height). So there is no unit in which the existing multiplier could
 *      be bound correctly.
 *
 *   3. THE LINE-HEIGHT VARIABLES THAT DO EXIST ARE NOT A BINDING TARGET. Until #2423 no
 *      `font/line-height/*` Figma variable existed at all. The owner then decided (Q175 A, 2026-11-11;
 *      collection name 2026-11-12) to emit the line-height and letter-spacing multipliers as FLOAT
 *      variables in a `text-spacing` collection, so designers and the style guide can see the ladders.
 *      They hold the multiplier (1.05), so facts 1 and 2 still make a bind wrong, and they carry NO
 *      scopes: Figma's LINE_HEIGHT and LETTER_SPACING pickers never offer them. A bindable line height
 *      would still have to be a NEW per-size PIXEL variable — see the decision boundary below.
 *
 * A faithful, bindable line height would have to be a PIXEL value = fontSize × multiplier. That is
 * SIZE-DEPENDENT: a fluid composite renders at a different font size per viewport (its fontSize is
 * bound to a `type-sets` variable whose desktop and mobile values differ), so no single pixel value is
 * correct across the modes. The current PERCENT bake (`round(multiplier × 100)`) is the ONE
 * representation that stays invariant across those modes — 115% is right at 40px and at 56px alike —
 * which is exactly what `emit-figma-font.ts`'s own comment claims and what assertion D below proves.
 *
 * ── DECISION BOUNDARY: WHY THIS GATE, AND NOT A BINDING ──────────────────────────────────────────
 *
 * Making line height bindable would require minting a NEW guaranteed variable/name surface (per-size
 * PIXEL line-height variables that do not exist today) AND sacrificing the documented mode invariance
 * — a design/contract change that is the owner's to make, not a fix an engine lane decides inside an
 * audit follow-up. So this PR does NOT bind and mints NO new name; it documents the deliberate,
 * correct omission and gates it. If the owner ever decides the tradeoff is worth it, that change
 * updates this gate deliberately — the friction is the feature (`schema/payload-manifest.json`'s
 * reasoning, `docs/34`).
 *
 * ── WHAT IT UNIQUELY CLAIMS, AND WHAT IT DELIBERATELY DOES NOT ───────────────────────────────────
 *
 * `test.ts` already checks the PERCENT *value* of NB's line height against the NB fixture, for one
 * brand. It does NOT assert `bound: false`, does not cover the mode-invariance rationale, and runs
 * over one brand. This gate makes the claim the audit is actually about — line height is UNBOUND, in
 * a mode-invariant unit, across every emitted brand — and it fails BY NAME on the binding mutation
 * that #1356 exists to prevent. It does not re-derive the `round(multiplier × 100)` value (that is
 * `test.ts`'s job and re-deriving the emitter's own formula here would be `docs/34` shape 8 — a gate
 * that restates the mechanism it checks).
 *
 * ── INDEPENDENCE (docs/34) ──────────────────────────────────────────────────────────────────────
 *
 * The oracle is `classifyLineHeight` / `classifyLetterSpacing` / `invarianceWitness` — pure functions
 * whose EXPECTED values (`bound === false`, `unit === 'PERCENT'`) are STRUCTURAL CONSTANTS transcribed
 * from the documented contract, never computed from the emitter. ACTUAL is read from the committed
 * `out/figma/<brand>/` export — the bytes a designer's file is actually built from. The self-check
 * below drives those same functions over synthetic inputs (never a copy of their logic), in both
 * directions, so a run that could no longer fail is itself a failure.
 *
 * ── WHAT IT ASSERTS ─────────────────────────────────────────────────────────────────────────────
 *
 *   A. UNBOUND LINE HEIGHT — every text style's `lineHeight` is `{ bound: false, value: { unit, value }}`,
 *      never a variable binding. This is the #1356 claim, and the arm the binding mutation trips.
 *   B. PERCENT BAKE — that value's `unit` is `PERCENT` (mode/size-independent), never `PIXELS`.
 *   C. LETTER-SPACING, THE SIBLING — `letterSpacing` is the same shape (unbound PERCENT). It rides
 *      here because it is the identical platform case (em-relative, not bindable) sitting on the same
 *      line of the emitter; a binding mutation that hits both must fail for both.
 *   D. MODE INVARIANCE, WITNESSED — for every FLUID composite whose bound font size differs across the
 *      two type-set modes, the line height is a single UNBOUND PERCENT (A+B, scoped to the case that
 *      motivates the design) and its rendered pixels DIVERGE across the modes (px_mobile ≠ px_desktop).
 *      That divergence is why a fixed/bound absolute value could serve at most one mode. The witness
 *      set must be NON-EMPTY (the scope floor), or the invariance claim is untested.
 *   E. OFFERED TO NO PICKER (#2423) — every emitted line-height or letter-spacing VARIABLE (a step or a
 *      role, matched by `isTextSpacingVar`) carries an EMPTY scope list, so no Figma picker offers a
 *      multiplier for a field Figma reads as pixels. Fact (3) above. Until #2423 E asserted that no
 *      line-height variable existed at all; the owner's Q175 A minted them, unscoped, and E moved with
 *      that decision rather than being dropped. A floor requires at least one such variable per brand,
 *      so E cannot pass over an emission that stopped carrying them. Both matchers (`isLineHeightVar`,
 *      `isTextSpacingVar`) and the scope oracle (`scopeFault`) are driven by the self-check in both
 *      directions (#1419), so E's guarantee rests on a driven check, not on reasoning (docs/34).
 *
 * ── WHAT IT DOES NOT CLAIM ──────────────────────────────────────────────────────────────────────
 *
 * Not that the PERCENT number equals a particular multiplier (test.ts owns that, against the fixture).
 * Not anything about a Figma file — this is the committed export, not a paste. It states the SHAPE of
 * the line-height field and the invariance of the chosen unit, per brand.
 */

/**
 * MUTATION-VERIFIED BY NAME (record the exact edit + the named failures in the PR body). Targets are
 * cited BY CONTENT, not line number — the emitter lines drift (#1419: the #1418 rationale block moved
 * these from 337/338 to 355/356; a numeral here would go stale again at the next comment edit):
 *
 *   · emit-figma-font.ts `lineHeight: { bound: false, value: { unit: 'PERCENT', … } }` → `bound: true`,
 *     then `npx tsx packages/engine/regen.ts`
 *       → assertion A fires: "line height is VARIABLE-BOUND on '<style>' in brand '<b>'" for every
 *         style in every brand. Not "the suite went red" — THIS gate names the bind.
 *   · emit-figma-font.ts that same `lineHeight` bake `unit: 'PERCENT'` → `unit: 'PIXELS'`, then regen
 *       → assertion B fires: "line height baked in PIXELS, not PERCENT …" — the mode-varying bake.
 *   · emit-figma-font.ts `letterSpacing: { bound: false, … }` → `bound: true`, then regen
 *       → assertion C fires for letterSpacing.
 *   · this file's `isLineHeightVar` regex narrowed so it no longer matches a minted line-height
 *     variable name (e.g. `/(^|\/)font-line-height(\/|$)/`) — NO regen needed, the self-check runs
 *     before the real run
 *       → the SELF-CHECK fails BY NAME: "isLineHeightVar does not match a minted line-height variable
 *         name ('ads/core/font/line-height/150') — assertion E's matcher is DEAD …" (#1419). This is
 *         the arm that keeps E's reserved-contract guarantee resting on a driven check, not reasoning.
 *   · emit-figma-dims.ts `TEXT_SPACING_SCOPES = []` → `['LINE_HEIGHT']`, then regen
 *       → assertion E fires: "SCOPED FOR A BIND: '<root>/core/font/line-height/105' in '<b>' carries
 *         scopes [LINE_HEIGHT] …" for every text-spacing variable in every brand (#2423).
 *
 * Commit (a `wip:` commit is enough) before each mutation: the restore step `git checkout --
 * packages/engine/emit-figma-font.ts packages/engine/lint-lineheight-bake.ts packages/engine/out`
 * reaches HEAD and would otherwise destroy uncommitted work in between (CLAUDE.md, docs/00-progress.md
 * 2026-08-21/24).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT_FIGMA = join(import.meta.dirname, 'out', 'figma');

/** The brands whose emitted line-height shape must be checked. `docs/34`: a gate with a scope asserts
 *  each promised surface is REPRESENTED, never merely counts — if one stops emitting a text-styles
 *  file, this fails rather than passing over a smaller set. Discovered brands are checked too, so a
 *  new brand is covered the day it emits; these are the floor. */
const MUST_COVER = ['aurora', 'nb', 'wendys'];

/** The documented contract, transcribed as constants — NOT read from the emitter (the independence the
 *  header promises). A line-height / letter-spacing field must be an unbound bake in this unit. */
const REQUIRED_UNIT = 'PERCENT';

type Prop =
  | { bound: true; variable?: string }
  | { bound: false; value: { unit?: string; value?: number } | string | number };

/** THE ORACLE for A/B (and C, by reuse). Returns the reasons this field violates the unbound-PERCENT
 *  contract — empty means it conforms. A pure function so the self-check can drive it directly. */
export const classifyField = (field: string, p: Prop | undefined): string[] => {
  const out: string[] = [];
  if (!p) return [`${field} is absent from the style`];
  if ((p as { bound: unknown }).bound === true) {
    const v = (p as { variable?: string }).variable;
    out.push(`${field} is VARIABLE-BOUND${v ? ` (-> '${v}')` : ''} — Figma binds ${field} only as PIXELS, and the role is a mode/size-relative value (a unitless line-height multiplier / em tracking), so a bind renders that relative value as raw pixels`);
    return out;
  }
  const value = (p as { value: unknown }).value;
  if (typeof value !== 'object' || value === null) {
    out.push(`${field} is unbound but its value is not a { unit, value } object (got ${typeof value})`);
    return out;
  }
  const unit = (value as { unit?: string }).unit;
  if (unit !== REQUIRED_UNIT) out.push(`${field} baked in ${unit ?? '<no unit>'}, not ${REQUIRED_UNIT} — that unit is mode/size-varying, so it cannot stay invariant across the fluid modes`);
  return out;
};

/** THE INVARIANCE WITNESS for D. Given a fluid composite's PERCENT line height and its two per-mode
 *  font sizes, returns the two rendered pixel line-heights. They DIVERGE when the sizes do — which is
 *  the whole reason a fixed absolute line height cannot serve both modes. Pure, so the self-check
 *  drives it. */
export const renderedPx = (pct: number, sizeMobile: number, sizeDesktop: number): { mobile: number; desktop: number } => ({
  mobile: (pct / 100) * sizeMobile,
  desktop: (pct / 100) * sizeDesktop,
});

/** THE ORACLE for E. Does a Figma variable NAME denote a line-height variable — the thing whose very
 *  existence would give a binding a target and cross the #1356 decision boundary? Pure and exported so
 *  the real run and the self-check drive THIS function, never a copy — the same discipline classifyField
 *  and renderedPx follow. Its EXPECTED (which names count) is the repo's kebab/slash naming contract
 *  transcribed here (`(^|/)line-height(/|$)`: the segment `line-height` bounded by a slash or an end),
 *  not read from any emitter. */
export const isLineHeightVar = (name: string): boolean => /(^|\/)line-height(\/|$)/.test(name);

/** THE ORACLE for E's reach (#2423): a line-height or letter-spacing variable, step or role — the four DTCG
 *  groups `line-height`, `line-height-role`, `letter-spacing`, `letter-spacing-role`, each a whole segment. */
export const isTextSpacingVar = (name: string): boolean => /(^|\/)(line-height|letter-spacing)(-role)?\//.test(name);

/** THE ORACLE for E (#2423). Any scope at all is a fault: LINE_HEIGHT or LETTER_SPACING offers a multiplier
 *  to a field Figma reads as pixels, and ALL_SCOPES or any other scope offers it somewhere it means nothing. */
export const scopeFault = (scopes: unknown): string | null =>
  Array.isArray(scopes) && scopes.length === 0 ? null : `carries scopes ${Array.isArray(scopes) ? `[${scopes.join(', ')}]` : String(scopes)}, not [] — a picker would offer a multiplier to a field Figma reads as pixels`;

// ---- SELF-CHECK: can the oracle still see a violation, and still pass a conforming field? ---------
const selfFails: string[] = [];

// A conforming field: unbound PERCENT → no reasons.
if (classifyField('lineHeight', { bound: false, value: { unit: 'PERCENT', value: 150 } }).length) {
  selfFails.push('classifyField flags a conforming unbound-PERCENT field (false positive)');
}
// The binding mutation (#1356's whole subject): a bound field → a reason NAMING the bind.
const bound = classifyField('lineHeight', { bound: true, variable: 'ads/core/font/line-height/150' });
if (!bound.some((r) => r.includes('VARIABLE-BOUND'))) {
  selfFails.push('classifyField does not flag a variable-bound line height — the mutation #1356 exists to catch would pass');
}
// The PIXELS mutation: a mode-varying bake → a reason NAMING the unit.
const px = classifyField('lineHeight', { bound: false, value: { unit: 'PIXELS', value: 24 } });
if (!px.some((r) => r.includes('not PERCENT'))) {
  selfFails.push('classifyField does not flag a PIXELS bake — the mode-varying unit would pass');
}
// A malformed unbound value must not read as clean.
if (!classifyField('lineHeight', { bound: false, value: 24 }).length) {
  selfFails.push('classifyField accepts a scalar value where a { unit, value } object is required');
}
// The letter-spacing arm is the same predicate on a different field — proven by driving it here.
if (!classifyField('letterSpacing', { bound: true, variable: 'x' }).some((r) => r.includes('VARIABLE-BOUND'))) {
  selfFails.push('classifyField does not flag a bound letterSpacing (arm C could not fail)');
}
// The witness: differing sizes must produce diverging pixels; equal sizes must not (so the floor,
// not this arithmetic, is what would otherwise pass vacuously).
const w = renderedPx(150, 16, 24);
if (!(w.mobile !== w.desktop)) selfFails.push('renderedPx does not diverge when the per-mode sizes differ — the invariance witness cannot demonstrate anything');
if (renderedPx(150, 20, 20).mobile !== renderedPx(150, 20, 20).desktop) selfFails.push('renderedPx diverges when the sizes are equal — a false witness');
// Assertion E's matcher (`isLineHeightVar`) is the reserved-contract guard #1356 sets so that minting a
// bindable line-height variable — the owner decision the boundary holds — cannot land silently. A–D are
// driven above; E was not (#1419), so drive it here in BOTH directions. POSITIVE: a minted line-height
// variable name MUST match, or minting one slips past E unseen — this is the arm that fails BY NAME if
// the E regex is narrowed so it no longer sees a real line-height variable. NEGATIVE: near-misses that
// merely share the substring — a differently-suffixed segment, an un-hyphenated word, the substring
// buried mid-segment — must NOT match, or E fires on the wrong thing and the floor below false-alarms.
if (!isLineHeightVar('ads/core/font/line-height/150')) {
  selfFails.push("isLineHeightVar does not match a minted line-height variable name ('ads/core/font/line-height/150') — assertion E's matcher is DEAD, so minting a bindable line-height variable (the #1356 reserved contract move) would land silently");
}
if (!isLineHeightVar('line-height/normal')) {
  selfFails.push("isLineHeightVar does not match a leading-segment line-height name ('line-height/normal') — the (^|/) anchor is broken");
}
if (!isLineHeightVar('pds/font/line-height')) {
  selfFails.push("isLineHeightVar does not match a trailing-segment line-height name ('pds/font/line-height') — the (/|$) anchor is broken");
}
for (const nearMiss of ['ads/core/font/line-height-role/150', 'ads/core/font/lineheight/150', 'ads/core/baseline-height/150']) {
  if (isLineHeightVar(nearMiss)) {
    selfFails.push(`isLineHeightVar matches the near-miss '${nearMiss}', which is NOT a line-height variable — E would fire on the wrong name and the nothing-to-bind-to floor would false-alarm`);
  }
}

// E's reach and scope oracle (#2423), driven in both directions like isLineHeightVar.
for (const n of ['ads/core/font/line-height/105', 'ads/core/font/line-height-role/tight', 'ads/core/font/letter-spacing/neg-40', 'ads/core/font/letter-spacing-role/wide']) {
  if (!isTextSpacingVar(n)) selfFails.push(`isTextSpacingVar does not match '${n}' — assertion E would never see that variable's scopes`);
}
for (const n of ['ads/core/font/lineheight/150', 'ads/core/baseline-height/150', 'ads/core/font/letter-spacing-roles/x', 'ads/core/font/size/16']) {
  if (isTextSpacingVar(n)) selfFails.push(`isTextSpacingVar matches the near-miss '${n}' — E would hold the wrong variable to an empty scope list`);
}
if (scopeFault([]) !== null) selfFails.push('scopeFault flags an empty scope list — E would fail a conforming variable');
for (const sc of [['LINE_HEIGHT'], ['LETTER_SPACING'], ['ALL_SCOPES'], undefined]) {
  if (scopeFault(sc) === null) selfFails.push(`scopeFault accepts ${JSON.stringify(sc)} — a scoped multiplier would pass E`);
}

if (selfFails.length) {
  console.error("\n❌ the line-height bake gate's own detection is broken — it cannot see what it claims to:\n");
  for (const f of selfFails) console.error(`    ${f}`);
  process.exit(1);
}

// ---- THE REAL RUN --------------------------------------------------------------------------------
const failures: string[] = [];
const notes: string[] = [];

/** Brands DISCOVERED from the emitted tree (not a hardcoded list), so a new brand is covered the day
 *  it emits. Asserted non-empty + against MUST_COVER below. */
const brands = existsSync(OUT_FIGMA)
  ? readdirSync(OUT_FIGMA, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
  : [];

if (brands.length === 0) {
  failures.push(`SCOPE EMPTY: no brand directories under ${OUT_FIGMA} — every check below would pass over an empty set. Run \`npx tsx packages/engine/regen.ts\` first.`);
}

let styleChecks = 0;
let witnesses = 0;
let lineHeightVarsSeen = 0;
let textSpacingVarsSeen = 0;

for (const brand of brands) {
  const dir = join(OUT_FIGMA, brand);
  const tsPath = join(dir, 'text-styles.json');
  if (!existsSync(tsPath)) {
    failures.push(`${brand}: no text-styles.json — this brand emits no text styles, so the line-height claim cannot be checked for it`);
    continue;
  }
  const ts = JSON.parse(readFileSync(tsPath, 'utf8')) as { styles?: Array<{ name: string; properties: Record<string, Prop> }> };
  const styles = ts.styles ?? [];
  if (styles.length === 0) {
    failures.push(`${brand}: text-styles.json has zero styles — the checks below would pass over nothing`);
    continue;
  }

  // Per-mode fluid font sizes, keyed by variable name, for the invariance witness (D). Absent files
  // are a real problem for a brand that has fluid composites, caught below when a fluid style cannot
  // find its size.
  const modeSizes = (mode: string): Map<string, number> => {
    const p = join(dir, `type-sets.${mode}.json`);
    if (!existsSync(p)) return new Map();
    const doc = JSON.parse(readFileSync(p, 'utf8')) as { variables?: Array<{ name: string; value?: unknown }> };
    return new Map((doc.variables ?? []).filter((v) => typeof v.value === 'number').map((v) => [v.name, v.value as number]));
  };
  const sizesMobile = modeSizes('mobile');
  const sizesDesktop = modeSizes('desktop');

  // ---- E: every line-height / letter-spacing VARIABLE is unscoped (#2423) ------------------------
  // Read every collection file, not just `text-spacing.json`, so such a variable in ANY collection is
  // held to the same empty scope list.
  let brandTextSpacing = 0;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const doc = JSON.parse(readFileSync(join(dir, f), 'utf8')) as { variables?: Array<{ name?: string; scopes?: unknown }> };
    for (const v of doc.variables ?? []) {
      if (!v.name) continue;
      if (isLineHeightVar(v.name)) lineHeightVarsSeen++;
      if (!isTextSpacingVar(v.name)) continue;
      brandTextSpacing++;
      const fault = scopeFault(v.scopes);
      if (fault) failures.push(`SCOPED FOR A BIND: '${v.name}' in '${brand}' (${f}) ${fault}`);
    }
  }
  textSpacingVarsSeen += brandTextSpacing;
  if (brandTextSpacing === 0) failures.push(`${brand}: no line-height or letter-spacing variable emitted — the text-spacing collection (#2423) is missing, so assertion E checked nothing for this brand`);

  for (const s of styles) {
    const p = s.properties ?? {};
    // ---- A + B: line height is an unbound PERCENT bake ------------------------------------------
    for (const r of classifyField('lineHeight', p.lineHeight)) failures.push(`${brand}/${s.name}: ${r}`);
    // ---- C: letter spacing, the sibling --------------------------------------------------------
    for (const r of classifyField('letterSpacing', p.letterSpacing)) failures.push(`${brand}/${s.name}: ${r}`);
    styleChecks++;

    // ---- D: mode-invariance witness for fluid composites ---------------------------------------
    const fs = p.fontSize as { bound?: boolean; variable?: string; collection?: string } | undefined;
    if (fs?.collection === 'type-sets' && fs.variable) {
      const sm = sizesMobile.get(fs.variable);
      const sd = sizesDesktop.get(fs.variable);
      if (sm === undefined || sd === undefined) {
        failures.push(`${brand}/${s.name}: fluid composite bound to '${fs.variable}', but that variable has no ${sm === undefined ? 'mobile' : 'desktop'} value in type-sets — the invariance of its line height cannot be witnessed`);
        continue;
      }
      // Only a composite whose size actually MOVES across modes witnesses the invariance.
      if (sm === sd) continue;
      const lh = p.lineHeight as { bound?: boolean; value?: { unit?: string; value?: number } } | undefined;
      // A/B already flagged a non-conforming field; here we additionally demonstrate the consequence.
      if (lh && lh.bound === false && lh.value?.unit === REQUIRED_UNIT && typeof lh.value.value === 'number') {
        const r = renderedPx(lh.value.value, sm, sd);
        if (r.mobile === r.desktop) {
          failures.push(`${brand}/${s.name}: a ${lh.value.value}% line height renders identically (${r.mobile}px) at both mode sizes (${sm}px / ${sd}px) though the sizes differ — the witness cannot demonstrate divergence, which should be impossible`);
        } else {
          witnesses++;
        }
      }
    }
  }
  notes.push(`${brand}: ${styles.length} style(s) checked`);
}

// ---- SCOPE FLOORS --------------------------------------------------------------------------------
for (const b of MUST_COVER) {
  if (!brands.includes(b)) {
    failures.push(`SCOPE NOT REPRESENTED: '${b}' is a known emitted brand and this run found no directory for it. If it was legitimately removed, drop it from MUST_COVER in this file in the same PR; otherwise a clean run here means nothing.`);
  }
}
// The invariance claim (D) is about fluid composites whose size moves across modes. If NONE exist, D
// asserted nothing — a clean run over an empty witness set is exactly the vacuity `docs/34` is about.
if (brands.length && witnesses === 0) {
  failures.push('INVARIANCE UNWITNESSED: no fluid composite with differing per-mode sizes was found in any brand, so assertion D passed over an empty set. Either fluid composites stopped emitting, or the type-sets join broke.');
}
// E's floor: the line-height steps are among what E checked, so the line-height matcher is exercised by a
// real emission, not only by the self-check.
if (brands.length && lineHeightVarsSeen === 0) {
  failures.push('E UNEXERCISED: no emitted variable is a line-height step, so the text-spacing collection (#2423) lost its line-height ladder or the matcher went dead.');
}

console.log(`Line-height bake — ${styleChecks} style(s) over ${brands.length} brand(s): ${brands.join(', ') || 'NONE'}; ${witnesses} mode-invariance witness(es); ${textSpacingVarsSeen} line-height/letter-spacing variable(s), all unscoped (${lineHeightVarsSeen} line-height steps).`);
for (const n of notes) console.log(`    ${n}`);

if (failures.length) {
  console.error(`\n❌ ${failures.length} line-height bake failure(s):`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error('\nA text style\'s line height is emitted as an UNBOUND, mode-invariant PERCENT bake — never a variable');
  console.error('binding (#1356). Figma binds line height only as PIXELS and the role is a unitless multiplier, so the');
  console.error('text-spacing variables (#2423) carry no scopes and no picker offers them. Making line height bindable');
  console.error('would mint a new per-size PIXEL variable and lose the mode invariance — an owner contract decision.');
  process.exit(1);
}
console.log('  ✓ every text style bakes line height (and letter spacing) as an UNBOUND PERCENT, invariant across');
console.log(`    the fluid modes, in all ${brands.length} brand(s); every line-height and letter-spacing variable is unscoped.`);
