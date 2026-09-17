/**
 * CUT-BINDING GATE (#1485) — a text style's cut (weight/style) is BOUND to a STRING variable, never
 * baked. The committed record that #1485's whole point holds on the emitted bytes, and the thing that
 * fails BY NAME if a later edit reverts the bind to a baked literal, drops the cut variable, or lets
 * the numeric weight double-bind the one weight/style control.
 *
 *   npx tsx packages/engine/lint-cut-binding.ts
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────────
 *
 * A Figma Text Style has ONE weight/style control. Before #1485 the engine bound it via the FLOAT
 * weight-role variable (numeric) and BAKED `fontStyle` beside it — so a WIDTH cut like "Light
 * Condensed" (a facePin, #1368) could only be a baked literal: unthemeable, and unreachable from
 * Figma's binding UI. #1485 binds that control to a STRING cut variable instead, so any cut is
 * bindable and themeable. The danger this gate names is the SILENT DOWNGRADE: a cut that reverts to
 * a baked literal (no variable to theme) or, worse, a facePinned "Light Condensed" collapsing to a
 * derived "Light" because the cut variable stopped being per-category. The facePin VALUE case is
 * pinned in `test.ts` (#1485, against an input pin — the committed brands carry no facePin); this
 * gate pins the SHAPE over the committed `out/figma/**` a designer's file is actually built from.
 *
 * This is the direct sibling of `lint-lineheight-bake.ts`: that gate says line height STAYS unbound
 * (binding it would be wrong); this one says the cut IS bound (baking it is the regression). Same
 * committed-artifact reading, same self-checked pure oracles, opposite verdict for opposite reasons.
 *
 * ── WHAT IT ASSERTS ─────────────────────────────────────────────────────────────────────────────
 *
 *   A. CUT IS BOUND — every text style's `fontStyle` is `{ bound: true, variable, collection: 'core',
 *      resolvedType: 'STRING' }`, and the variable name is a cut name (`.../font/style/<cat>/<role>`).
 *      This is the #1485 claim, and the arm the "revert to baked" mutation trips.
 *   B. CUT VARIABLE EXISTS — that bound variable is present in the brand's `core.font.json`, STRING,
 *      scoped FONT_STYLE, with a NON-EMPTY string value. A bind to a missing variable is a dangling
 *      reference; a bind to an empty cut is a downgrade in disguise.
 *   C. WEIGHT IS PARALLEL DATA — every text style's `fontWeight` is `{ bound: false, value: <number> }`,
 *      never bound. Binding it too would double-bind the single weight/style control against the STRING
 *      cut (the owner's "one authoritative style binding"). The FLOAT weight-role variable itself is
 *      still emitted (a separate, existing gate covers the variable set) — this only says the STYLE
 *      does not bind it.
 *   D. PER-CATEGORY ISOLATION — the cut variable's category segment equals the style's own family
 *      category (read from its bound `font/family/<category>` variable). This is what keeps two
 *      categories in one weight role (display/subtle pinned "Light Condensed", title/subtle derived
 *      "Light") from collapsing onto one value — the silent cut swap. A per-role-only cut would fail D.
 *
 * ── INDEPENDENCE (docs/34) ──────────────────────────────────────────────────────────────────────
 *
 * The oracle is `classifyCut` / `classifyWeightData` / `cutCategory` / `familyCategory` — pure
 * functions whose EXPECTED values (`bound === true`, `resolvedType === 'STRING'`, the cut-name shape,
 * the category equality) are STRUCTURAL CONSTANTS transcribed from #1485's contract, never computed
 * from the emitter. ACTUAL is read from the committed `out/figma/<brand>/` export. The self-check
 * drives those same functions over synthetic inputs in BOTH directions, so a run that could no longer
 * fail is itself a failure.
 *
 * ── MUTATION-VERIFIED BY NAME (record the edit + the named failures in the PR body) ───────────────
 *
 *   · emit-figma-font.ts `fontStyle: { bound: true, variable: cutVar, ... }` → `{ bound: false, value:
 *     'Regular' }` (revert to a baked literal), then `npx tsx packages/engine/regen.ts`
 *       → assertion A fires: "cut is BAKED, not bound to a STRING variable, on '<style>' in '<b>'".
 *   · emit-figma-font.ts drop the `for (const slot of cutSlots)` cut-variable emission (leave the bind),
 *     then regen
 *       → assertion B fires: "cut variable '<name>' bound by '<style>' is not emitted in core" for
 *         every style — the dangling bind.
 *   · emit-figma-font.ts `fontWeight: { bound: false, value: numeric }` → `{ bound: true, variable:
 *     coreName(root, 'font/weight-role/'+weightRole), collection: 'core', resolvedType: 'FLOAT' }`,
 *     then regen
 *       → assertion C fires: "fontWeight is VARIABLE-BOUND on '<style>' — it must stay parallel data".
 *   · emit-figma-font.ts `cutSlug` drop the category segment (`font/style/${weightRole}...`), then regen
 *       → assertion D fires: "cut category '<x>' != family category '<y>'" (and the name-shape arm A).
 *
 * Commit (a `wip:` commit is enough) before each mutation: the restore step `git checkout --
 * packages/engine/emit-figma-font.ts packages/engine/out` reaches HEAD and would otherwise destroy
 * uncommitted work in between (CLAUDE.md, docs/00-progress.md 2026-08-21/24).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT_FIGMA = join(import.meta.dirname, 'out', 'figma');

/** Brands whose emitted cut binding must hold. docs/34: a gate with a scope asserts each promised
 *  surface is REPRESENTED, never merely counts — if one stops emitting text styles, this fails rather
 *  than passing over a smaller set. Discovered brands are checked too; these are the floor. */
const MUST_COVER = ['aurora', 'nb', 'wendys'];

/** The documented contract, transcribed as constants — NOT read from the emitter. */
const CUT_COLLECTION = 'core';
/** A cut variable name: `<root>/core/font/style/<category>/<role>[-italic]` — two segments below
 *  `font/style`. Transcribed from #1485's naming, not read from the emitter. */
const CUT_NAME = /(?:^|\/)font\/style\/([^/]+)\/[^/]+$/;
const FAMILY_NAME = /(?:^|\/)font\/family\/([^/]+)$/;

type Prop =
  | { bound: true; variable?: string; collection?: string; resolvedType?: string }
  | { bound: false; value?: unknown };

/** THE ORACLE for A. Reasons the fontStyle prop violates the bound-STRING-cut contract — empty means
 *  it conforms. Pure, so the self-check drives it directly. */
export const classifyCut = (p: Prop | undefined): string[] => {
  const out: string[] = [];
  if (!p) return ['fontStyle is absent from the style'];
  if ((p as { bound: unknown }).bound !== true) {
    const v = (p as { value?: unknown }).value;
    out.push(`cut is BAKED (${v === undefined ? 'no value' : JSON.stringify(v)}), not bound to a STRING variable — a baked cut is unthemeable and unreachable from Figma's binding UI (#1485)`);
    return out;
  }
  const bp = p as { variable?: string; collection?: string; resolvedType?: string };
  if (bp.resolvedType !== 'STRING') out.push(`cut is bound but resolvedType is ${bp.resolvedType ?? '<none>'}, not STRING`);
  if (bp.collection !== CUT_COLLECTION) out.push(`cut is bound but collection is ${bp.collection ?? '<none>'}, not '${CUT_COLLECTION}'`);
  if (!bp.variable || !CUT_NAME.test(bp.variable)) out.push(`cut is bound to '${bp.variable ?? '<none>'}', which is not a font/style/<category>/<role> cut-variable name`);
  return out;
};

/** THE ORACLE for C. fontWeight must be unbound numeric parallel data. */
export const classifyWeightData = (p: Prop | undefined): string[] => {
  if (!p) return ['fontWeight is absent from the style'];
  if ((p as { bound: unknown }).bound === true)
    return [`fontWeight is VARIABLE-BOUND (-> '${(p as { variable?: string }).variable ?? '?'}') — it must stay parallel DATA (unbound numeric); binding it double-binds Figma's single weight/style control against the STRING cut (#1485)`];
  const v = (p as { value?: unknown }).value;
  if (typeof v !== 'number') return [`fontWeight is unbound but its value is ${typeof v}, not a number`];
  return [];
};

/** THE ORACLE for D. Category segment of a cut name / a family name. */
export const cutCategory = (name: string | undefined): string | undefined => CUT_NAME.exec(name ?? '')?.[1];
export const familyCategory = (name: string | undefined): string | undefined => FAMILY_NAME.exec(name ?? '')?.[1];

// ---- SELF-CHECK: can the oracle still see a violation, and still pass a conforming field? ---------
const selfFails: string[] = [];
if (classifyCut({ bound: true, variable: 'r/core/font/style/body/default', collection: 'core', resolvedType: 'STRING' }).length)
  selfFails.push('classifyCut flags a conforming bound-STRING cut (false positive)');
if (!classifyCut({ bound: false, value: 'Regular' }).some((r) => r.includes('BAKED')))
  selfFails.push('classifyCut does not flag a baked cut — the #1485 revert mutation would pass');
if (!classifyCut({ bound: true, variable: 'r/core/font/style/body/default', collection: 'core', resolvedType: 'FLOAT' }).some((r) => r.includes('not STRING')))
  selfFails.push('classifyCut does not flag a non-STRING bound cut');
if (!classifyCut({ bound: true, variable: 'r/core/font/weight-role/default', collection: 'core', resolvedType: 'STRING' }).some((r) => r.includes('cut-variable name')))
  selfFails.push('classifyCut does not flag a bind to a NON-cut variable name (e.g. a weight-role var)');
if (classifyWeightData({ bound: false, value: 400 }).length)
  selfFails.push('classifyWeightData flags conforming unbound-numeric fontWeight (false positive)');
if (!classifyWeightData({ bound: true, variable: 'x' }).some((r) => r.includes('VARIABLE-BOUND')))
  selfFails.push('classifyWeightData does not flag a bound fontWeight — the double-bind mutation would pass');
if (cutCategory('r/core/font/style/display/subtle') !== 'display')
  selfFails.push('cutCategory does not extract the category segment of a cut name');
if (cutCategory('r/core/font/style/subtle') !== undefined)
  selfFails.push('cutCategory matches a per-ROLE-only name (no category segment) — the collapse a per-role cut would cause would pass');
if (familyCategory('r/core/font/family/display') !== 'display')
  selfFails.push('familyCategory does not extract the category segment of a family name');

if (selfFails.length) {
  console.error("\n❌ the cut-binding gate's own detection is broken — it cannot see what it claims to:\n");
  for (const f of selfFails) console.error(`    ${f}`);
  process.exit(1);
}

// ---- THE REAL RUN --------------------------------------------------------------------------------
const failures: string[] = [];
const notes: string[] = [];

const brands = existsSync(OUT_FIGMA)
  ? readdirSync(OUT_FIGMA, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
  : [];
if (brands.length === 0)
  failures.push(`SCOPE EMPTY: no brand directories under ${OUT_FIGMA} — every check below would pass over an empty set. Run \`npx tsx packages/engine/regen.ts\` first.`);

let styleChecks = 0;
let cutBinds = 0;

for (const brand of brands) {
  const dir = join(OUT_FIGMA, brand);
  const tsPath = join(dir, 'text-styles.json');
  const fontPath = join(dir, 'core.font.json');
  if (!existsSync(tsPath)) { failures.push(`${brand}: no text-styles.json — the cut-binding claim cannot be checked for it`); continue; }
  if (!existsSync(fontPath)) { failures.push(`${brand}: no core.font.json — the cut variables a style binds cannot be resolved`); continue; }
  const ts = JSON.parse(readFileSync(tsPath, 'utf8')) as { styles?: Array<{ name: string; properties: Record<string, Prop> }> };
  const font = JSON.parse(readFileSync(fontPath, 'utf8')) as { variables?: Array<{ name: string; resolvedType?: string; scopes?: string[]; value?: unknown }> };
  const styles = ts.styles ?? [];
  if (styles.length === 0) { failures.push(`${brand}: text-styles.json has zero styles — the checks below would pass over nothing`); continue; }
  const varByName = new Map((font.variables ?? []).map((v) => [v.name, v] as const));
  const cutVarsInFont = (font.variables ?? []).filter((v) => CUT_NAME.test(v.name));
  if (cutVarsInFont.length === 0) failures.push(`${brand}: core.font.json emits NO font/style/<cat>/<role> cut variables, but the styles are expected to bind them (#1485)`);

  for (const s of styles) {
    const p = s.properties ?? {};
    // A — cut is bound to a STRING cut variable.
    for (const r of classifyCut(p.fontStyle)) failures.push(`${brand}/${s.name}: ${r}`);
    // C — weight is unbound parallel data.
    for (const r of classifyWeightData(p.fontWeight)) failures.push(`${brand}/${s.name}: ${r}`);
    styleChecks++;

    const cut = p.fontStyle as { bound?: boolean; variable?: string } | undefined;
    if (cut?.bound === true && cut.variable && CUT_NAME.test(cut.variable)) {
      cutBinds++;
      // B — the bound cut variable exists in core, STRING/FONT_STYLE, non-empty value.
      const v = varByName.get(cut.variable);
      if (!v) failures.push(`${brand}/${s.name}: cut variable '${cut.variable}' is bound but NOT emitted in core.font.json — a dangling reference`);
      else {
        if (v.resolvedType !== 'STRING') failures.push(`${brand}/${s.name}: cut variable '${cut.variable}' is ${v.resolvedType}, not STRING`);
        if (!(v.scopes ?? []).includes('FONT_STYLE')) failures.push(`${brand}/${s.name}: cut variable '${cut.variable}' is not scoped FONT_STYLE (${JSON.stringify(v.scopes)})`);
        if (typeof v.value !== 'string' || v.value.length === 0) failures.push(`${brand}/${s.name}: cut variable '${cut.variable}' has an empty/non-string value (${JSON.stringify(v.value)}) — a silent downgrade`);
      }
      // D — per-category isolation: the cut's category matches the style's family category.
      const fam = p.fontFamily as { bound?: boolean; variable?: string } | undefined;
      const cc = cutCategory(cut.variable);
      const fc = familyCategory(fam?.variable);
      if (fam?.bound === true && fc && cc && cc !== fc)
        failures.push(`${brand}/${s.name}: cut category '${cc}' != family category '${fc}' — a cut must be per-CATEGORY so two categories in one weight role cannot collapse onto one value (the silent cut swap #1485 guards)`);
    }
  }
  notes.push(`${brand}: ${styles.length} style(s), ${cutVarsInFont.length} cut variable(s)`);
}

// ---- SCOPE FLOORS --------------------------------------------------------------------------------
for (const b of MUST_COVER) {
  if (!brands.includes(b))
    failures.push(`SCOPE NOT REPRESENTED: '${b}' is a known emitted brand and this run found no directory for it. If it was legitimately removed, drop it from MUST_COVER in this file in the same PR; otherwise a clean run here means nothing.`);
}
if (brands.length && cutBinds === 0)
  failures.push('CUT BINDS UNWITNESSED: no text style was found binding a cut variable in any brand, so assertion A/B/D passed over an empty set. Either the cut binding stopped emitting, or the text-styles join broke.');

console.log(`Cut binding — ${styleChecks} style(s) over ${brands.length} brand(s): ${brands.join(', ') || 'NONE'}; ${cutBinds} cut bind(s) witnessed.`);
for (const n of notes) console.log(`    ${n}`);

if (failures.length) {
  console.error(`\n❌ ${failures.length} cut-binding failure(s):`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error('\nA text style\'s cut (weight/style) is BOUND to a STRING variable — never baked (#1485). The numeric');
  console.error('weight axis cannot reach a WIDTH cut like "Light Condensed"; the STRING cut can, so it is themeable');
  console.error('and reachable from Figma\'s binding UI. fontWeight stays parallel data (unbound), and the cut variable');
  console.error('is per-CATEGORY so two categories in one weight role cannot silently collapse onto one value.');
  process.exit(1);
}
console.log(`  ✓ every text style binds its cut to a per-category STRING variable, keeps fontWeight as unbound data,`);
console.log(`    and every bound cut resolves to an emitted FONT_STYLE variable, in all ${brands.length} brand(s).`);
