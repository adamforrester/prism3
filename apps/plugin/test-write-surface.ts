/**
 * Plugin SURFACE write-adapter test (#993 — #893's unbuilt half).
 *
 *   npx tsx apps/plugin/test-write-surface.ts
 *
 * Drives the real `applySurfacePlan` against the same in-memory `figma.variables` shim the colour
 * harness uses, in the real sequence: `applyWritePlan` first (so the `color` collection exists), then
 * the surface pass. #993's three acceptance criteria are behavioural, and each is asserted as such:
 *
 *   1. Both modes appear on the collection, named `default` and `inverse`.
 *   2. Switching the mode changes the RESOLVED colour of anything bound to `surface/*`.
 *   3. The aliases resolve to the `color` collection's variables rather than to COPIES.
 *
 * ── WHY (3) IS THE ONE WORTH A GATE ─────────────────────────────────────────────────────────────
 *
 * Nothing else distinguishes a pointer from a duplicate, and **a duplicate passes every visual check**.
 * Pass A writes each row's resolved literal before any alias binds, so an executor that wrote only
 * literals — or bound to a copy — would render pixel-identical on the day it ran, satisfy (1) and (2)
 * as far as the eye is concerned, and silently stop tracking the brand from then on. It is #866's shape
 * exactly: a pointer that looks fine and points nowhere.
 *
 * So (3) is asserted three ways, weakest to strongest:
 *   • STRUCTURAL — every stored per-mode value is a `VARIABLE_ALIAS`, and no surface row holds a raw
 *     RGBA. A raw RGBA is the duplicate's signature.
 *   • REFERENTIAL — the alias id belongs to a variable in the `color` collection (never in `surface`
 *     itself, which would resolve and track nothing). EXPECTED comes from the PLAN's target name looked
 *     up among the shim's own colour vars; ACTUAL comes from the id the executor wrote. Per `docs/34`
 *     the two halves are derived independently — reading `applySurfacePlan`'s own lookup for EXPECTED
 *     would make the check agree with itself.
 *   • BEHAVIOURAL — the target's value is CHANGED after the write, and the surface row must follow it.
 *     This is the only one a copy cannot fake, at any level of care in the copying.
 *
 * ── AND THE MISS PATH, WHICH THE HEALTHY PATH CANNOT REACH ──────────────────────────────────────
 *
 * The corpus measures 0 unresolved targets out of 244 per brand, so a suite that only ran the happy
 * path would leave the miss branch unexecuted and report that as a pass (#969). Three hosts drive it
 * deliberately: no `color` collection at all, a `color` collection missing one target, and the healthy
 * file — asserting in all three that the report matches what is actually in the file.
 *
 * Mirrors the engine suite's dependency-free `ok(...)` style; exits non-zero on any failure.
 */
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import { buildWritePlan, buildSurfaceWritePlan } from '@prism3/engine/write-plan';
import { nbThemeFrom } from '@prism3/engine/theme';
import { applyWritePlan, applySurfacePlan, type SurfaceApplyResult } from './src/write-figma';
import nbMeasured from '@prism3/engine/schema/nb-measured.json';
import { readFileSync } from 'node:fs';

/**
 * The two mode names, AUTHORED here rather than imported from the emitter's `SURFACE_MODES`.
 *
 * Importing that constant would make "#993(1) the collection carries exactly the two named modes"
 * true by construction — the emitter names the modes from it, the plan carries them through, and the
 * assertion would compare the constant with itself. `docs/34` shape 16: state the quantity a human
 * would check, in the units they would check it in. A renamed mode is a BREAKING change for every
 * file already bound to it, so it should cost a deliberate edit here.
 */
const SURFACE_MODES = ['default', 'inverse'] as const;

/**
 * Rows whose two modes alias DIFFERENT variables that nevertheless resolve to the SAME colour in the
 * light appearance mode — so the mode switch is correctly wired and visibly changes nothing there.
 *
 * Measured on nb, not assumed: 100 of the 128 rows change colour, 16 are self-aliased by
 * `inverse-coverage.ts`'s gap register, and these 12 are the remainder. Two causes, both legitimate:
 *
 *   • STATUS COLOUR, context-independent. A danger border is the same red on a light page and on a
 *     dark one — the hue already reads against both, so inverse context does not move it. Seven of
 *     these do differ in `hc-light`/`hc-dark`, where high contrast re-tunes against the real
 *     background; the four `border/*` ones are identical in all four appearance modes.
 *   • SAME-POLARITY INVERSE. `interactive.neutral.inverse.fill.rest` is #e8e9ea in light against
 *     #ccced1 for the base — a LIGHTER gray, not a flip — so its ink correctly stays near-black in
 *     both. Verified against the resolved role table before admitting it: this is internally
 *     consistent, not the contrast defect it first looks like.
 *
 * Authored rather than computed, for the reason `payload-manifest.json` is: a register regenerated
 * from a scan of the thing it describes would classify each new entry itself and report that as a pass.
 */
const AGREE_IN_LIGHT: Record<string, string> = {
  'surface/border/brand': 'status border, identical in all four appearance modes',
  'surface/border/danger': 'status border, identical in all four appearance modes',
  'surface/border/info': 'status border, identical in all four appearance modes',
  'surface/border/warning': 'status border, identical in all four appearance modes',
  'surface/border/focus': 'status border; differs in hc-light/hc-dark',
  'surface/border/success': 'status border; differs in hc-light/hc-dark',
  'surface/foreground/brand': 'status ink; differs in hc-light/hc-dark',
  'surface/foreground/danger': 'status ink; differs in hc-light/hc-dark',
  'surface/foreground/info': 'status ink; differs in hc-light/hc-dark',
  'surface/foreground/success': 'status ink; differs in hc-light/hc-dark',
  'surface/foreground/warning': 'status ink; differs in hc-light/hc-dark',
  'surface/interactive/neutral/on-fill': 'same-polarity inverse fill (#e8e9ea vs #ccced1), so the ink is constant by design',
};

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// ---- the in-memory figma.variables shim (same model as test-write.ts) ----------------------
type Rgba = { r: number; g: number; b: number; a: number };
type Val = Rgba | { type: 'VARIABLE_ALIAS'; id: string };
const isAlias = (v: Val | undefined): v is { type: 'VARIABLE_ALIAS'; id: string } => !!v && 'type' in v;
/** A REAL colour, as distinct from `!isAlias(v)` — which is also true of an unwritten mode (`undefined`). */
const isRgba = (v: Val | undefined): v is Rgba => !!v && typeof v === 'object' && 'r' in v && typeof v.r === 'number';

class ShimVar {
  scopes: string[] = [];
  description = '';
  hiddenFromPublishing = false;
  valuesByMode: Record<string, Val> = {};
  constructor(public id: string, public name: string, public variableCollectionId: string, public resolvedType: 'COLOR' | 'FLOAT' = 'COLOR') {}
  setValueForMode(modeId: string, value: Val): void { this.valuesByMode[modeId] = value; }
}
class ShimCollection {
  modes: { modeId: string; name: string }[];
  private seq = 0;
  constructor(public id: string, public name: string) { this.modes = [{ modeId: `${id}:m0`, name: 'Mode 1' }]; }
  renameMode(modeId: string, name: string): void {
    const m = this.modes.find((x) => x.modeId === modeId);
    if (m) m.name = name;
  }
  addMode(name: string): string { const modeId = `${this.id}:m${++this.seq}`; this.modes.push({ modeId, name }); return modeId; }
}
class VariablesShim {
  collections: ShimCollection[] = [];
  vars: ShimVar[] = [];
  private cseq = 0;
  private vseq = 0;
  async getLocalVariableCollectionsAsync(): Promise<ShimCollection[]> { return this.collections; }
  async getLocalVariablesAsync(type?: string): Promise<ShimVar[]> { return type ? this.vars.filter((v) => v.resolvedType === type) : this.vars; }
  createVariableCollection(name: string): ShimCollection { const c = new ShimCollection(`c${++this.cseq}`, name); this.collections.push(c); return c; }
  createVariable(name: string, collection: ShimCollection, t: 'COLOR' | 'FLOAT' = 'COLOR'): ShimVar {
    const v = new ShimVar(`v${++this.vseq}`, name, collection.id, t); this.vars.push(v); return v;
  }
  createVariableAlias(target: ShimVar): { type: 'VARIABLE_ALIAS'; id: string } { return { type: 'VARIABLE_ALIAS', id: target.id }; }
}

// ---- drive it in the REAL order: colour first, then surface ---------------------------------
const theme = nbThemeFrom(nbMeasured);
const colorPlan = buildWritePlan(buildFigmaColor(theme));
const plan = buildSurfaceWritePlan(theme);

/* eslint-disable @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi */
const shim = new VariablesShim();
await applyWritePlan(colorPlan, shim as any);
const r1 = await applySurfacePlan(plan, shim as any);
const varsAfterFirst = shim.vars.length;
const r2 = await applySurfacePlan(plan, shim as any);

console.log('plugin SURFACE write-adapter (#993) — executor against in-memory figma.variables shim\n');

const surfCol = shim.collections.find((c) => c.name === 'surface')!;
const colorCol = shim.collections.find((c) => c.name === 'color')!;
const byId = new Map(shim.vars.map((v) => [v.id, v]));
const surfVars = new Map(shim.vars.filter((v) => v.variableCollectionId === surfCol.id).map((v) => [v.name, v]));
const modeId = (c: ShimCollection, name: string): string => c.modes.find((m) => m.name === name)!.modeId;

// The plan is the corpus fact this whole suite is scaled against — 128 rows × 2 modes. (122 before
// #1030 added the six `color.veil.*` roles, every one of them self-aliased; see the block above.)
const expectedBound = plan.create.length * plan.modes.length;
ok(plan.create.length === 128 && plan.modes.length === 2 && expectedBound === 256,
  `the plan is 128 rows × 2 modes = 256 bindings (got ${plan.create.length} × ${plan.modes.length} = ${expectedBound})`);

// ---- ACCEPTANCE 1: both modes appear, named `default` and `inverse` -------------------------
ok(surfCol.modes.map((m) => m.name).join(',') === SURFACE_MODES.join(','),
  `#993(1) the collection carries exactly the two named modes (${surfCol.modes.map((m) => m.name).join('/')})`);
ok(surfCol.modes.length === 2, `#993(1) …and no leftover 'Mode 1' beside them (${surfCol.modes.length} modes)`);

// ---- pass counts + idempotency ---------------------------------------------------------------
ok(r1.total === plan.create.length && r1.created === plan.create.length,
  `first run creates all ${plan.create.length} surface vars (+${r1.created})`);
ok(r2.created === 0 && shim.vars.length === varsAfterFirst,
  `second run creates 0 and duplicates nothing (idempotent find-by-name: +${r2.created}, ${shim.vars.length} vars stable)`);
ok(r1.bound === expectedBound && r2.bound === expectedBound,
  `every row aliased in every mode: ${r1.bound}/${expectedBound}`);
ok(r1.misses.length === 0 && r2.misses.length === 0,
  `zero unresolved targets on a healthy file${r1.misses.length ? ' — ' + r1.misses.slice(0, 3).join(', ') : ''}`);

// ---- ACCEPTANCE 3, STRUCTURAL: every stored value is an alias, never a literal --------------
// A raw RGBA left in a surface row IS the duplicate — it renders correctly and tracks nothing.
const storedValues = [...surfVars.values()].flatMap((v) => SURFACE_MODES.map((m) => v.valuesByMode[modeId(surfCol, m)]));
ok(storedValues.length === expectedBound && storedValues.every(isAlias),
  `#993(3) structural: all ${storedValues.length} stored per-mode values are VARIABLE_ALIAS, none a literal RGBA ` +
  `(${storedValues.filter((v) => !isAlias(v)).length} literals found)`);

// ---- ACCEPTANCE 3, REFERENTIAL: the alias id is a `color` variable, matched to the PLAN -----
// EXPECTED: the plan's target NAME, resolved among the shim's colour vars by this test's own lookup.
// ACTUAL: the id the executor stored. Deriving EXPECTED from the executor's map instead would make
// this compare the executor against itself (docs/34 shape 1).
const colorVarsByName = new Map(shim.vars.filter((v) => v.variableCollectionId === colorCol.id).map((v) => [v.name, v]));
let refMatched = 0;
const refWrong: string[] = [];
const intoSurface: string[] = [];
for (const row of plan.aliases) {
  const v = surfVars.get(row.name)!;
  plan.modes.forEach((m, i) => {
    const want = colorVarsByName.get(row.targetsByMode[i]!);
    const got = v.valuesByMode[modeId(surfCol, m)];
    if (isAlias(got) && want && got.id === want.id) refMatched++;
    else refWrong.push(`${row.name} @${m} -> ${row.targetsByMode[i]}`);
    if (isAlias(got) && byId.get(got.id)?.variableCollectionId === surfCol.id) intoSurface.push(`${row.name} @${m}`);
  });
}
ok(refMatched === expectedBound && refWrong.length === 0,
  `#993(3) referential: all ${expectedBound} aliases point at the PLAN's named color variable ` +
  `(${refMatched} matched${refWrong.length ? `, wrong: ${refWrong.slice(0, 3).join(', ')}` : ''})`);
ok(intoSurface.length === 0,
  `#993(3) no alias points back into the surface collection itself — that would resolve and track nothing (${intoSurface.length})`);
ok([...surfVars.values()].every((v) => SURFACE_MODES.every((m) => {
  const got = v.valuesByMode[modeId(surfCol, m)];
  return isAlias(got) && byId.get(got.id)?.variableCollectionId === colorCol.id;
})), '#993(3) referential: every alias target lives in the `color` collection (cross-CALL resolution)');

// ---- ACCEPTANCE 2: switching the mode changes the RESOLVED colour ---------------------------
// Resolve through the whole chain (surface → color → core-palette) with the APPEARANCE mode held
// fixed at light, so the only thing varying is the surface mode. That is the designer's actual
// gesture: same theme, flip the frame's surface mode, the subtree changes.
const modeFor = new Map<string, string>([
  [colorCol.id, modeId(colorCol, colorPlan.color.modes[0])],
  [shim.collections.find((c) => c.name === 'core-palette')!.id, shim.collections.find((c) => c.name === 'core-palette')!.modes[0].modeId],
]);
const resolveIn = (v: ShimVar, surfaceMode: string): string | undefined => {
  modeFor.set(surfCol.id, modeId(surfCol, surfaceMode));
  let cur: ShimVar | undefined = v;
  for (let hop = 0; hop < 8 && cur; hop++) {
    const val = cur.valuesByMode[modeFor.get(cur.variableCollectionId)!];
    if (!val) return undefined;
    if (isAlias(val)) { cur = byId.get(val.id); continue; }
    return `${val.r},${val.g},${val.b},${val.a}`;
  }
  return undefined;
};

// Every row must resolve to a real colour in both modes — an unresolvable chain is the failure this
// collection makes possible, so it is asserted before anything is said about the values.
const rows = plan.aliases.map((row) => {
  const v = surfVars.get(row.name)!;
  return { name: row.name, selfAliased: row.targetsByMode[0] === row.targetsByMode[1], d: resolveIn(v, 'default'), i: resolveIn(v, 'inverse') };
});
const changedRows = rows.filter((r) => !r.selfAliased && r.d !== r.i);
ok(rows.every((r) => r.d !== undefined && r.i !== undefined),
  `#993(2) every one of the ${rows.length} rows resolves to a literal colour in BOTH modes (${rows.filter((r) => !r.d || !r.i).length} dead chains)`);

// The 16 self-aliased rows are the `gapDisposition: 'self'` register in `inverse-coverage.ts` — a role
// with no inverse counterpart, where the same token is correct in both modes. They MUST resolve
// identically; every other row must differ. Asserted in both directions, because "most rows change"
// would pass an executor that got the self-aliased ones wrong, and "the self ones match" would pass
// one that collapsed every mode to `default` (the #85 collapse, one tier up).
const selfRows = rows.filter((r) => r.selfAliased);
const otherRows = rows.filter((r) => !r.selfAliased);
ok(selfRows.length === 16, `#993(2) 16 rows are self-aliased by the gap register (got ${selfRows.length})`);
ok(selfRows.every((r) => r.d === r.i),
  `#993(2) …and each resolves to the SAME colour in both modes (${selfRows.filter((r) => r.d !== r.i).length} differ)`);
ok(changedRows.length === otherRows.length - Object.keys(AGREE_IN_LIGHT).length,
  `#993(2) ${otherRows.length - Object.keys(AGREE_IN_LIGHT).length} of the ${otherRows.length} counterpart-backed rows resolve to a DIFFERENT colour per mode ` +
  `(${changedRows.length} changed)`);

// Both directions on the register, so it cannot rot: a 13th row agreeing fails as an unregistered
// agreement, and a registered row that starts differing fails as a stale memory. This is the same
// posture as `lint-absolute-inset.ts`'s `ZERO_OK` — a legitimate zero must be admitted by name.
const agreedActual = otherRows.filter((r) => r.d === r.i).map((r) => r.name).sort();
const agreedExpected = Object.keys(AGREE_IN_LIGHT).sort();
ok(agreedActual.join('|') === agreedExpected.join('|'),
  `#993(2) exactly the ${agreedExpected.length} registered rows agree in light, no more and no fewer ` +
  `(unregistered ${agreedActual.filter((n) => !AGREE_IN_LIGHT[n]).length}: ${agreedActual.filter((n) => !AGREE_IN_LIGHT[n]).slice(0, 3).join(', ') || 'none'}; ` +
  `stale: ${agreedExpected.filter((n) => !agreedActual.includes(n)).slice(0, 3).join(', ') || 'none'})`);

// The load-bearing half for those 12: the VALUES agree, so no colour comparison can tell whether they
// are wired to one variable or two. Assert the wiring directly — two distinct target ids. Without this,
// an executor that bound both modes of a registered row to the SAME target would pass every colour
// assertion in this file (the #85 collapse, surviving inside the exemption list — docs/34 shape 15).
const collapsed = Object.keys(AGREE_IN_LIGHT).filter((name) => {
  const v = surfVars.get(name)!;
  const a = v.valuesByMode[modeId(surfCol, 'default')];
  const b = v.valuesByMode[modeId(surfCol, 'inverse')];
  return !(isAlias(a) && isAlias(b) && a.id !== b.id);
});
ok(collapsed.length === 0,
  `#993(2) …and each of those ${agreedExpected.length} still aliases TWO DISTINCT variables — equal values cannot hide a mode collapse ` +
  `(${collapsed.length} collapsed${collapsed.length ? ': ' + collapsed.slice(0, 3).join(', ') : ''})`);

// ---- ACCEPTANCE 3, BEHAVIOURAL: the row FOLLOWS its target ---------------------------------
// The discriminator no copy can fake. Change the target variable in `color` after the write and the
// surface row must report the new colour — a duplicate keeps the old one and every other assertion
// above (structural, referential, both modes differing) would still hold for it.
const probe = plan.aliases.find((row) => row.targetsByMode[0] !== row.targetsByMode[1])!;
const probeVar = surfVars.get(probe.name)!;
const probeTarget = colorVarsByName.get(probe.targetsByMode[0]!)!;
const before = resolveIn(probeVar, 'default');
probeTarget.setValueForMode(modeFor.get(colorCol.id)!, { r: 0.123, g: 0.456, b: 0.789, a: 1 });
const after = resolveIn(probeVar, 'default');
ok(before !== '0.123,0.456,0.789,1' && after === '0.123,0.456,0.789,1',
  `#993(3) behavioural: repainting '${probe.targetsByMode[0]}' moves '${probe.name}' with it — a pointer, not a copy (${before} → ${after})`);
// And the OTHER mode is untouched by that edit, so the two modes are independently wired rather than
// both hanging off one target (the collapse this collection is most exposed to).
ok(resolveIn(probeVar, 'inverse') !== after,
  `#993(3) …while the inverse mode is unaffected by the default target's repaint — the modes are wired separately`);

// ---- THE MISS PATH — three hosts, because the healthy path cannot reach it (#969) -----------

// (a) No `color` collection at all. This is the ORDERING failure — surface written before colour.
const noColor = new VariablesShim();
const mr = await applySurfacePlan(plan, noColor as any);
ok(mr.misses.length === 1 && mr.misses[0].startsWith('collection:color absent'),
  `MISS(a) a file with no \`color\` collection reports ONE named miss, not 244 restatements of it (${mr.misses.length}: ${mr.misses[0] ?? 'none'})`);
ok(mr.bound === 0 && mr.total === plan.create.length,
  `MISS(a) …with bound 0 against total ${mr.total}, so the summary shows nothing was wired (bound ${mr.bound})`);
ok(!noColor.collections.some((c) => c.name === 'color'),
  'MISS(a) the executor does NOT create an empty `color` collection to resolve against — the absence is diagnosed, not papered over');
ok(noColor.collections.some((c) => c.name === 'surface'),
  'MISS(a) …but the surface vars ARE written with their literal fallbacks, so the file renders rather than going blank');
const strandedValues = noColor.vars.filter((v) => v.variableCollectionId === noColor.collections.find((c) => c.name === 'surface')!.id)
  .flatMap((v) => SURFACE_MODES.map((m) => v.valuesByMode[modeId(noColor.collections.find((c) => c.name === 'surface')!, m)]));
// `every(v => !isAlias(v))` would be the obvious phrasing here and it CANNOT FAIL: an unwritten mode
// reads back `undefined`, which is not an alias, so deleting pass A entirely satisfies it 244 times over.
// Found by mutation. Assert what is actually meant — every value is a real RGBA — since the whole point
// of this arm is that a stranded row still renders.
ok(strandedValues.length === expectedBound && strandedValues.every(isRgba),
  `MISS(a) …and those fallbacks are real LITERAL COLOURS — which is exactly why the miss report is the only signal a human gets ` +
  `(${strandedValues.filter((v) => !isRgba(v)).length} of ${strandedValues.length} are not an RGBA)`);

// (b) `color` present but missing ONE target. The partial case: 243 bind, 1 is named.
const partial = new VariablesShim();
await applyWritePlan(colorPlan, partial as any);
const victimName = plan.aliases[0].targetsByMode[0]!;
const pColorCol = partial.collections.find((c) => c.name === 'color')!;
const victimIdx = partial.vars.findIndex((v) => v.variableCollectionId === pColorCol.id && v.name === victimName);
ok(victimIdx >= 0, `MISS(b) the target to remove exists before removal (${victimName})`);
partial.vars.splice(victimIdx, 1);
// (c) The miss is never a throw — stated HERE, before the arms that read the result, and with the call
// wrapped. An unwrapped `await` would take the whole file down with a stack trace and no named failure,
// which reads as a harness bug rather than as this assertion firing. (Host (a) needs no wrapper: it
// returns before the alias loop, and the arms above already read its result.)
let prCaught: string | null = null;
let prResult: SurfaceApplyResult | null = null;
try { prResult = await applySurfacePlan(plan, partial as any); } catch (e) { prCaught = String((e as Error)?.message ?? e); }
ok(prCaught === null && prResult !== null,
  `MISS(c) an unresolved target is REPORTED, never thrown — one dead pointer must not cost the other ${expectedBound - 1} bindings (${prCaught ?? 'returned a result'})`);
const pr = prResult ?? { total: 0, created: 0, bound: -1, misses: [], orphans: [] };
const expectedMisses = plan.aliases.flatMap((row) => plan.modes.filter((_, i) => row.targetsByMode[i] === victimName).map((m) => `${row.name} @${m} -> ${victimName}`));
ok(expectedMisses.length > 0 && pr.misses.length === expectedMisses.length && expectedMisses.every((m) => pr.misses.includes(m)),
  `MISS(b) one absent target is reported by NAME, once per binding that wanted it (${pr.misses.length}/${expectedMisses.length}: ${pr.misses[0] ?? 'none'})`);
ok(pr.bound === expectedBound - expectedMisses.length,
  `MISS(b) …and every OTHER binding still wrote — one dead target does not cost the other rows (${pr.bound}/${expectedBound - expectedMisses.length})`);

// ---- #479 orphans: reported, never deleted --------------------------------------------------
const ghost = new VariablesShim();
await applyWritePlan(colorPlan, ghost as any);
const ghostSurf = ghost.createVariableCollection('surface');
ghost.createVariable('surface/text/on-accent', ghostSurf);   // a plausible pre-rename surface leaf
const gr = await applySurfacePlan(plan, ghost as any);
ok(gr.orphans.includes('surface/text/on-accent'),
  '#479 a surface variable in the file but not the plan is reported as an orphan');
ok(ghost.vars.some((v) => v.name === 'surface/text/on-accent'),
  '#479 …and NOT deleted — the write path cannot tell a stale ghost from a variable someone is co-authoring');
ok(r1.orphans.length === 0,
  '#479 a fresh file reports an empty orphan list rather than omitting the field (checked-and-none)');

// ---- the empty plan writes NOTHING, not an empty collection --------------------------------
// A theme with no `light` mode makes `buildFigmaSurface` return no files. Without the short-circuit the
// executor would upsert `surface`, rename its mode to `undefined` and leave a 0-row collection in the
// designer's file. Asserted because nothing else here would notice: every other host has 128 rows, so
// the guard's whole domain is excluded from the rest of the suite (docs/34 shape 15 — the same blind
// spot #913 found in its own nothing-written case).
const emptyHost = new VariablesShim();
const er = await applySurfacePlan({ name: 'surface', modes: [], create: [], aliases: [] }, emptyHost as any);
ok(emptyHost.collections.length === 0 && emptyHost.vars.length === 0,
  `an empty plan creates NO collection and NO variables (${emptyHost.collections.length} collections, ${emptyHost.vars.length} vars)`);
ok(er.total === 0 && er.bound === 0 && er.misses.length === 0,
  'an empty plan is not a miss — nothing was asked for, so nothing is missing');

// ---- THE ORDERING, in main.ts — the one thing no harness here can drive --------------------
// `applySurfacePlan` resolves its targets out of the FILE, so it is correct only when it runs after
// `applyWritePlan`. This suite constructs that order itself, which means it proves the executor works
// in the right order and says nothing about whether the plugin uses it. `main.ts` calls
// `figma.showUI` at module scope and cannot be imported at any granularity (the same limit #913
// recorded), so the only check available is over its SOURCE.
//
// Crude but not vacuous: EXPECTED is authored here ("colour before surface"), ACTUAL is read off the
// file, and reordering the two calls fails it. What it cannot see is a reorder that keeps the textual
// order — an `await` moved into a `Promise.all`, say. Stated rather than implied.
const mainSrc = readFileSync(new URL('./src/main.ts', import.meta.url), 'utf8');
const iColor = mainSrc.indexOf('await applyWritePlan(');
const iSurface = mainSrc.indexOf('await applySurfacePlan(');
ok(iColor >= 0 && iSurface >= 0, `main.ts calls both executors (color at ${iColor}, surface at ${iSurface})`);
ok(iColor >= 0 && iSurface > iColor,
  `#993 ORDERING: main.ts awaits applyWritePlan BEFORE applySurfacePlan — the surface aliases resolve against the color collection in the file`);
// And the misses reach the tally that flips `ok`, or an unresolvable pointer is reported into a void.
ok(/const misses\s*=[\s\S]{0,400}?sf\.misses\.length/.test(mainSrc),
  '#993 main.ts folds `sf.misses` into the `misses` total, so an unresolved target flips `ok` and reaches the pill');

console.log(`\nplugin SURFACE write-adapter: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
