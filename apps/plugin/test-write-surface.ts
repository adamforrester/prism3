/**
 * Plugin SURFACE write-adapter test (#993 — #893's unbuilt half).
 *
 *   npx tsx apps/plugin/test-write-surface.ts
 *
 * Drives the real `applySurfacePlan` against the same in-memory `figma.variables` shim the colour
 * harness uses, in the real sequence: `applyWritePlan` first (so the `color.appearance` collection
 * exists), then the surface pass. **Since #1013 the collection this executor WRITES holds the alias tier
 * and the one it POINTS AT is `color.appearance`** — the two names swapped, the axis did not, so the locals
 * below are `aliasCol`/`valueCol` rather than the `surfCol`/`colorCol` they were: a variable called
 * `colorCol` holding the appearance tier is the shape #1049 is about. Since #1089 the alias tier's
 * COLLECTION is `color.surface`, and its VARIABLES are still `color/*`, which is why a collection name
 * and a variable prefix cannot be assumed to match here.
 *
 * ── #1133 TOOK THE SECOND MODE OFF, AND THAT REWROTE ONE ACCEPTANCE CRITERION ────────────────────
 *
 * The collection carried `default` and `inverse` modes from #993 until #1133 reverted inverse to
 * NAME-encoding: a bounded set of components declares an inverse variant and binds
 * `color.appearance.inverse.*` by name (one top-level group since #1140), rather than every row in the
 * tier flipping with an ancestor
 * frame's mode (`docs/20` §9.8). The pointer tier is single-mode, `Default`.
 *
 * #993's criterion (2) — *switching the mode changes the resolved colour* — therefore has no subject
 * any more, and it is deleted rather than weakened. So is everything that existed to support it: the
 * `AGREE_IN_LIGHT` register of rows whose two modes resolved equal in light, the self-aliased-row arms
 * that read `inverse-coverage.ts`'s gap dispositions, and the mode-collapse arm. What replaced the
 * collapse arm matters more than what it lost: the failure it guarded — many rows wired to ONE variable
 * — is not a mode phenomenon, so it is re-asserted over the DISTINCTNESS of the alias ids actually in
 * the file. `applySurfacePlan` and `buildSurfaceWritePlan` needed no change at all: both are generic
 * over `modes.length`.
 *
 * The two criteria that remain are the ones that were always load-bearing:
 *
 *   1. The collection carries exactly ONE mode, named `Default`, with no leftover `Mode 1`.
 *   3. The aliases resolve to the `color.appearance` collection's variables rather than to COPIES,
 *      and every row resolves through the whole chain to a real colour.
 *
 * Every variable name below carries nb's BRAND ROOT (#1097) — `nbds/color/background/primary`, not
 * `color/background/primary` — and the authored literals spell it, because nb is the corpus member whose
 * root is NOT the `prism` default. An expectation built from `theme.root` would be satisfied by an
 * emitter that had stopped applying the root at all.
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
 *   • REFERENTIAL — the alias id belongs to a variable in the `color.appearance` collection (never in
 *     `color.surface` itself, which would resolve and track nothing). EXPECTED comes from the PLAN's target name looked
 *     up among the shim's own colour vars; ACTUAL comes from the id the executor wrote. Per `docs/34`
 *     the two halves are derived independently — reading `applySurfacePlan`'s own lookup for EXPECTED
 *     would make the check agree with itself.
 *   • BEHAVIOURAL — the target's value is CHANGED after the write, and the surface row must follow it.
 *     This is the only one a copy cannot fake, at any level of care in the copying.
 *
 * ── AND THE MISS PATH, WHICH THE HEALTHY PATH CANNOT REACH ──────────────────────────────────────
 *
 * The corpus measures 0 unresolved targets out of 129 per brand, so a suite that only ran the happy
 * path would leave the miss branch unexecuted and report that as a pass (#969). Three hosts drive it
 * deliberately: no `color.appearance` collection at all, one missing a single target, and the healthy
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
 * The mode names, AUTHORED here rather than read off the plan or the emitter.
 *
 * There used to be an emitter constant (`SURFACE_MODES`, two members) and importing it would have made
 * "#993(1) the collection carries exactly the named modes" true by construction — the emitter named the
 * modes from it, the plan carried them through, and the assertion would have compared the constant with
 * itself. #1133 deleted that constant along with the second mode, and this local one stays for the same
 * reason it was local: `docs/34` shape 16, state the quantity a human would check in the units they
 * would check it in. Reading `plan.modes` here instead would let the collection silently gain, lose or
 * rename a mode, and a renamed mode is a BREAKING change for every file already bound to it.
 *
 * `Default`, capitalized, is prism3's single-mode name across every one-mode collection — not a
 * lower-cased survivor of the old `default` member, which is the plausible wrong answer this literal
 * exists to reject.
 */
const SURFACE_MODES = ['Default'] as const;

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

const aliasCol = shim.collections.find((c) => c.name === 'color.surface')!;
const valueCol = shim.collections.find((c) => c.name === 'color.appearance')!;
const byId = new Map(shim.vars.map((v) => [v.id, v]));
const aliasVars = new Map(shim.vars.filter((v) => v.variableCollectionId === aliasCol.id).map((v) => [v.name, v]));
const modeId = (c: ShimCollection, name: string): string => c.modes.find((m) => m.name === name)!.modeId;

// The plan is the corpus fact this whole suite is scaled against — 129 rows × 1 mode. It was 128 × 2
// until #1133: one mode instead of two, and one row MORE, because `color.scrim.default` had been the
// register's single `omit` entry and there is no longer a per-mode behaviour for it to be undecided
// about. Both halves of that are spelled out, because a bare `plan.create.length * plan.modes.length`
// happens to be satisfied by 258 as readily as by 129.
const expectedBound = plan.create.length * plan.modes.length;
ok(plan.create.length === 129 && plan.modes.length === 1 && expectedBound === 129,
  `the plan is 129 rows × 1 mode = 129 bindings (got ${plan.create.length} × ${plan.modes.length} = ${expectedBound})`);

// ---- ACCEPTANCE 1: exactly one mode, named `Default` ---------------------------------------
ok(aliasCol.modes.map((m) => m.name).join(',') === SURFACE_MODES.join(','),
  `#993(1) the collection carries exactly the named mode(s) (${aliasCol.modes.map((m) => m.name).join('/')})`);
ok(aliasCol.modes.length === 1, `#993(1) …and no leftover 'Mode 1' beside it (${aliasCol.modes.length} modes)`);

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
const storedValues = [...aliasVars.values()].flatMap((v) => SURFACE_MODES.map((m) => v.valuesByMode[modeId(aliasCol, m)]));
ok(storedValues.length === expectedBound && storedValues.every(isAlias),
  `#993(3) structural: all ${storedValues.length} stored per-mode values are VARIABLE_ALIAS, none a literal RGBA ` +
  `(${storedValues.filter((v) => !isAlias(v)).length} literals found)`);

// ---- ACCEPTANCE 3, REFERENTIAL: the alias id is a `color.appearance` variable, matched to the PLAN --
// EXPECTED: the plan's target NAME, resolved among the shim's value-tier vars by this test's own lookup.
// ACTUAL: the id the executor stored. Deriving EXPECTED from the executor's map instead would make
// this compare the executor against itself (docs/34 shape 1).
const valueVarsByName = new Map(shim.vars.filter((v) => v.variableCollectionId === valueCol.id).map((v) => [v.name, v]));
let refMatched = 0;
const refWrong: string[] = [];
const intoSurface: string[] = [];
for (const row of plan.aliases) {
  const v = aliasVars.get(row.name)!;
  plan.modes.forEach((m, i) => {
    const want = valueVarsByName.get(row.targetsByMode[i]!);
    const got = v.valuesByMode[modeId(aliasCol, m)];
    if (isAlias(got) && want && got.id === want.id) refMatched++;
    else refWrong.push(`${row.name} @${m} -> ${row.targetsByMode[i]}`);
    if (isAlias(got) && byId.get(got.id)?.variableCollectionId === aliasCol.id) intoSurface.push(`${row.name} @${m}`);
  });
}
ok(refMatched === expectedBound && refWrong.length === 0,
  `#993(3) referential: all ${expectedBound} aliases point at the PLAN's named color variable ` +
  `(${refMatched} matched${refWrong.length ? `, wrong: ${refWrong.slice(0, 3).join(', ')}` : ''})`);
ok(intoSurface.length === 0,
  `#993(3) no alias points back into the \`color.surface\` collection itself — that would resolve and track nothing (${intoSurface.length})`);
ok([...aliasVars.values()].every((v) => SURFACE_MODES.every((m) => {
  const got = v.valuesByMode[modeId(aliasCol, m)];
  return isAlias(got) && byId.get(got.id)?.variableCollectionId === valueCol.id;
})), '#993(3) referential: every alias target lives in the `color.appearance` collection (cross-CALL resolution)');

// ---- ACCEPTANCE 3, END-TO-END: every row resolves through the WHOLE chain to a real colour ---
// `color.surface` → `color.appearance` → `core`, with the appearance mode held at light. There is no
// surface mode to vary since #1133, so what this measures is no longer "the flip works" but the thing
// that was underneath it all along: a pointer tier is only useful if every one of its rows terminates in
// a paint. A row whose chain dies renders as nothing in the designer's file, and no arm above sees it —
// the referential arms check the FIRST hop only.
const modeFor = new Map<string, string>([
  [valueCol.id, modeId(valueCol, colorPlan.color.modes[0])],
  [aliasCol.id, modeId(aliasCol, SURFACE_MODES[0])],
  [shim.collections.find((c) => c.name === 'core')!.id, shim.collections.find((c) => c.name === 'core')!.modes[0].modeId],
]);
const resolveIn = (v: ShimVar): string | undefined => {
  let cur: ShimVar | undefined = v;
  for (let hop = 0; hop < 8 && cur; hop++) {
    const val = cur.valuesByMode[modeFor.get(cur.variableCollectionId)!];
    if (!val) return undefined;
    if (isAlias(val)) { cur = byId.get(val.id); continue; }
    return `${val.r},${val.g},${val.b},${val.a}`;
  }
  return undefined;
};

const rows = plan.aliases.map((row) => ({ name: row.name, resolved: resolveIn(aliasVars.get(row.name)!) }));
ok(rows.length === plan.create.length && rows.every((r) => r.resolved !== undefined),
  `#993(3) every one of the ${rows.length} rows resolves through the chain to a literal colour (${rows.filter((r) => !r.resolved).length} dead chains)`);

// NO TWO ROWS SHARE A TARGET — and this arm is #1133's replacement for the mode-collapse arm, not a
// new idea. The old one caught an executor that wired both modes of a row to ONE variable; with one
// mode that phrasing has no subject, but the failure it guarded is the same shape one axis over: many
// rows collapsing onto one target. It is the cheapest thing that distinguishes a real per-row mapping
// from an executor that resolved the target lookup once and reused it, and NOTHING else here would
// notice — the structural arm sees aliases, the referential arm sees a target in the right collection,
// and both are satisfied by 129 aliases pointing at the same variable.
const targetIds = [...aliasVars.values()].map((v) => v.valuesByMode[modeId(aliasCol, SURFACE_MODES[0])]).filter(isAlias).map((a) => a.id);
ok(targetIds.length === expectedBound && new Set(targetIds).size === expectedBound,
  `#993(3) the ${expectedBound} rows alias ${expectedBound} DISTINCT variables — a per-row mapping, not one target reused (${new Set(targetIds).size} distinct)`);

// ---- ACCEPTANCE 3, BEHAVIOURAL: the row FOLLOWS its target ---------------------------------
// The discriminator no copy can fake. Change the target variable in `color.appearance` after the write and the
// surface row must report the new colour — a duplicate keeps the old one and every other assertion
// above (structural, referential, resolving) would still hold for it.
const probe = plan.aliases[0];
const probeVar = aliasVars.get(probe.name)!;
const probeTarget = valueVarsByName.get(probe.targetsByMode[0]!)!;
const before = resolveIn(probeVar);
probeTarget.setValueForMode(modeFor.get(valueCol.id)!, { r: 0.123, g: 0.456, b: 0.789, a: 1 });
const after = resolveIn(probeVar);
ok(before !== '0.123,0.456,0.789,1' && after === '0.123,0.456,0.789,1',
  `#993(3) behavioural: repainting '${probe.targetsByMode[0]}' moves '${probe.name}' with it — a pointer, not a copy (${before} → ${after})`);
// And ONLY that row moved. With no second mode to hold still, the neighbouring rows are what proves the
// repaint was followed through a pointer rather than splattered across the collection — the same
// separation the old `inverse`-mode arm asserted, re-aimed at the axis that still exists.
const neighbours = plan.aliases.slice(1, 6).map((row) => resolveIn(aliasVars.get(row.name)!));
ok(neighbours.length === 5 && neighbours.every((c) => c !== undefined && c !== after),
  `#993(3) …and no OTHER row reports the probe colour — each row follows its own target (${neighbours.filter((c) => c === after).length} contaminated)`);

// ---- THE MISS PATH — three hosts, because the healthy path cannot reach it (#969) -----------

// (a) No `color.appearance` collection at all. This is the ORDERING failure — the alias tier written first.
const noColor = new VariablesShim();
const mr = await applySurfacePlan(plan, noColor as any);
ok(mr.misses.length === 1 && mr.misses[0].startsWith('collection:color.appearance absent'),
  `MISS(a) a file with no \`color.appearance\` collection reports ONE named miss, not ${expectedBound} restatements of it (${mr.misses.length}: ${mr.misses[0] ?? 'none'})`);
ok(mr.bound === 0 && mr.total === plan.create.length,
  `MISS(a) …with bound 0 against total ${mr.total}, so the summary shows nothing was wired (bound ${mr.bound})`);
ok(!noColor.collections.some((c) => c.name === 'color.appearance'),
  'MISS(a) the executor does NOT create an empty `color.appearance` collection to resolve against — the absence is diagnosed, not papered over');
ok(noColor.collections.some((c) => c.name === 'color.surface'),
  'MISS(a) …but the surface vars ARE written with their literal fallbacks, so the file renders rather than going blank');
const strandedValues = noColor.vars.filter((v) => v.variableCollectionId === noColor.collections.find((c) => c.name === 'color.surface')!.id)
  .flatMap((v) => SURFACE_MODES.map((m) => v.valuesByMode[modeId(noColor.collections.find((c) => c.name === 'color.surface')!, m)]));
// `every(v => !isAlias(v))` would be the obvious phrasing here and it CANNOT FAIL: an unwritten mode
// reads back `undefined`, which is not an alias, so deleting pass A entirely satisfies it 244 times over.
// Found by mutation. Assert what is actually meant — every value is a real RGBA — since the whole point
// of this arm is that a stranded row still renders.
ok(strandedValues.length === expectedBound && strandedValues.every(isRgba),
  `MISS(a) …and those fallbacks are real LITERAL COLOURS — which is exactly why the miss report is the only signal a human gets ` +
  `(${strandedValues.filter((v) => !isRgba(v)).length} of ${strandedValues.length} are not an RGBA)`);

// (b) `color.appearance` present but missing ONE target. The partial case: 243 bind, 1 is named.
const partial = new VariablesShim();
await applyWritePlan(colorPlan, partial as any);
const victimName = plan.aliases[0].targetsByMode[0]!;
const pValueCol = partial.collections.find((c) => c.name === 'color.appearance')!;
const victimIdx = partial.vars.findIndex((v) => v.variableCollectionId === pValueCol.id && v.name === victimName);
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
const ghostSurf = ghost.createVariableCollection('color.surface');
ghost.createVariable('nbds/color/text/on-accent', ghostSurf);   // a plausible pre-rename surface leaf
const gr = await applySurfacePlan(plan, ghost as any);
ok(gr.orphans.includes('nbds/color/text/on-accent'),
  '#479 a surface variable in the file but not the plan is reported as an orphan');
ok(ghost.vars.some((v) => v.name === 'nbds/color/text/on-accent'),
  '#479 …and NOT deleted — the write path cannot tell a stale ghost from a variable someone is co-authoring');
ok(r1.orphans.length === 0,
  '#479 a fresh file reports an empty orphan list rather than omitting the field (checked-and-none)');

// ---- the empty plan writes NOTHING, not an empty collection --------------------------------
// A theme with no `light` mode makes `buildFigmaSurface` return no files. Without the short-circuit the
// executor would upsert `color.surface`, rename its mode to `undefined` and leave a 0-row collection in the
// designer's file. Asserted because nothing else here would notice: every other host has 128 rows, so
// the guard's whole domain is excluded from the rest of the suite (docs/34 shape 15 — the same blind
// spot #913 found in its own nothing-written case).
const emptyHost = new VariablesShim();
const er = await applySurfacePlan({ name: 'color.surface', modes: [], create: [], aliases: [] }, emptyHost as any);
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
