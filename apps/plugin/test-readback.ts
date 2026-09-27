/**
 * Plugin read-back round-trip test (#109) — drives the REAL write + read executors against one
 * in-memory `figma.variables` shim, with no live Figma.
 *
 *   npx tsx apps/plugin/test-readback.ts
 *
 * The write→read round-trip is the whole point: `applyWritePlan(plan)` materialises the NB colour
 * variables into the shim, then `readFigmaVariables(shim)` reads them back into a `ReadbackSnapshot`,
 * and `verifyReadback(snap, declared)` checks the materialisation contract holds on what was actually written.
 * Asserts the snapshot round-trips (colour var count + alias targets match the plan) and every
 * contract check passes. Mirrors `test-write.ts`'s shim + dependency-free `ok(...)` style.
 */
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import { buildWritePlan } from '@prism3/engine/write-plan';
import { verifyReadback, verifyFloatReadback, verifyStylesReadback } from '@prism3/engine/read-back';
import { buildFloatWritePlan, buildStylesPlan } from '@prism3/engine/write-plan';
import { brandTheme, nbThemeFrom } from '@prism3/engine/theme';
import { applyWritePlan, applyFloatPlan } from './src/write-figma';
import { applyStylesPlan } from './src/write-styles';
import { readFigmaVariables } from './src/read-figma';
import { persistInput } from './src/persist-figma';
import { declaredModesOf, seedSummary, SKIP_NO_BRAND, SKIP_UNREADABLE } from './src/seed-modes';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import type { BrandInput } from '@prism3/engine/theme';
import nbMeasured from '@prism3/engine/schema/nb-measured.json';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// ---- the in-memory figma.variables shim (same shape as test-write.ts; FLOAT-capable for #146) ----
type Val = { r: number; g: number; b: number; a: number } | { type: 'VARIABLE_ALIAS'; id: string } | number;
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
  renameMode(modeId: string, name: string): void { const m = this.modes.find((x) => x.modeId === modeId); if (m) m.name = name; }
  addMode(name: string): string { const modeId = `${this.id}:m${++this.seq}`; this.modes.push({ modeId, name }); return modeId; }
}
class VariablesShim {
  collections: ShimCollection[] = [];
  vars: ShimVar[] = [];
  private cseq = 0;
  private vseq = 0;
  async getLocalVariableCollectionsAsync(): Promise<ShimCollection[]> { return this.collections; }
  // Honor the type filter like the real API — so the FLOAT round-trip can't be masked by an
  // all-returning shim (#146 review): a COLOR-filtered fetch must NOT surface FLOAT vars.
  async getLocalVariablesAsync(type?: string): Promise<ShimVar[]> { return type ? this.vars.filter((v) => v.resolvedType === type) : this.vars; }
  createVariableCollection(name: string): ShimCollection { const c = new ShimCollection(`c${++this.cseq}`, name); this.collections.push(c); return c; }
  createVariable(name: string, collection: ShimCollection, t: 'COLOR' | 'FLOAT' = 'COLOR'): ShimVar { const v = new ShimVar(`v${++this.vseq}`, name, collection.id, t); this.vars.push(v); return v; }
  createVariableAlias(target: ShimVar): { type: 'VARIABLE_ALIAS'; id: string } { return { type: 'VARIABLE_ALIAS', id: target.id }; }
}

// ---- write → read → verify ----------------------------------------------------------------
const plan = buildWritePlan(buildFigmaColor(nbThemeFrom(nbMeasured)));
const shim = new VariablesShim();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: shim satisfies VariablesApi
const api = shim as any;

await applyWritePlan(plan, api);
const snap = await readFigmaVariables(api);
const verdict = verifyReadback(snap, { modes: ['light', 'dark', 'hc-light', 'hc-dark'] });

console.log('plugin read-back (#109) — write → read → verify round-trip on the shim\n');

// snapshot round-trips the plan
ok(snap.collections.some((c) => c.name === 'core') && snap.collections.some((c) => c.name === 'color'),
  'snapshot carries both collections (core + color)');
ok(snap.palette.length === plan.palette.length,
  `palette round-trips: ${snap.palette.length}/${plan.palette.length} primitives`);
ok(snap.color.length === plan.color.create.length,
  `colour roles round-trip: ${snap.color.length}/${plan.color.create.length}`);

// alias targets read back match the plan's per-mode targets
const planAlias = new Map(plan.color.aliases.map((r) => [r.name, r.targetsByMode]));
let aliasMatch = 0, aliasWrong = 0;
for (const v of snap.color) {
  const want = planAlias.get(v.name);
  if (!want) continue;
  plan.color.modes.forEach((m, i) => {
    const got = v.valuesByMode[m];
    const gotTarget = got && 'alias' in got ? got.alias : null;
    if (gotTarget === want[i]) aliasMatch++; else aliasWrong++;
  });
}
ok(aliasWrong === 0 && aliasMatch === plan.color.create.length * plan.color.modes.length,
  `every alias target read back matches the plan: ${aliasMatch} matched, ${aliasWrong} wrong`);

// verify contract
ok(verdict.ok, 'verifyReadback: contract holds on the written file' + (verdict.ok ? '' : ` — ${Object.entries(verdict.checks).filter(([, v]) => !v).map(([k]) => k).join(',')}`));
ok(verdict.checks.modesDistinct, `collapse-guard: background/primary distinct per mode (${Object.values(verdict.details.backgroundPrimaryByMode).join(' / ')})`);
ok(verdict.checks.aliasesResolve && verdict.details.danglingAliases.length === 0, 'every alias resolves — 0 dangling');
ok(verdict.checks.slotScopes && verdict.checks.fieldFamilyPresent, 'slot scopes + field family match the contract');
ok(verdict.checks.primitivesHidden, 'core-tier palette primitives hidden from publishing');

// FLOAT axes (#146) — write the geometric collections into the SAME shim, read them back, verify.
const nbTheme = nbThemeFrom(nbMeasured);
await applyFloatPlan(buildFloatWritePlan(nbTheme), api);
const snap2 = await readFigmaVariables(api);
const fverdict = verifyFloatReadback(snap2, nbTheme.modes.includes('wireframe'));

// Keyed by AXIS, which is a third thing again: the axis is `core/dimension`, the COLLECTION it lives in
// is `core` (shared with `core/palette` and `core/font` since #1097), and the variables inside are
// `<root>/core/dimension/*`. Three different strings for one thing, so the axis key is written out here
// rather than reused from the collection list above.
ok(!!snap2.float && ['core/dimension', 'space', 'radius', 'size', 'icon', 'control', 'border-width', 'focus', 'opacity'].every((n) => !!snap2.float![n]),
  'snapshot carries the FLOAT axes after the float write');
ok(fverdict.ok, 'verifyFloatReadback: contract holds' + (fverdict.ok ? '' : ` — ${Object.entries(fverdict.checks).filter(([, v]) => !v).map(([k]) => k).join(',')}`));
ok(fverdict.checks.aliasesResolve && fverdict.details.danglingAliases.length === 0, 'every FLOAT alias resolves — 0 dangling');
ok(fverdict.checks.dimensionsHidden, 'core-tier dimension primitives hidden from publishing');
ok(fverdict.checks.collectionsPresent, 'all expected FLOAT collections present in the read-back');

// STYLE axes (shadow/gradient lane) — write Effect + Paint Styles into a styles shim, read the names
// back (via readFigmaVariables' optional styles arg), verify. Aurora ships dark + gradients.
class StyleShim { description = ''; effects: readonly unknown[] = []; paints: readonly unknown[] = []; constructor(public name = '') {} }
class StylesShim {
  effectStyles: StyleShim[] = [];
  paintStyles: StyleShim[] = [];
  async getLocalEffectStylesAsync(): Promise<StyleShim[]> { return this.effectStyles; }
  async getLocalPaintStylesAsync(): Promise<StyleShim[]> { return this.paintStyles; }
  createEffectStyle(): StyleShim { const s = new StyleShim(); this.effectStyles.push(s); return s; }
  createPaintStyle(): StyleShim { const s = new StyleShim(); this.paintStyles.push(s); return s; }
}
const auroraInput0 = (): BrandInput => structuredClone(exampleBrands['aurora'] as unknown as BrandInput);
const auroraTheme = brandTheme(exampleBrands['aurora'] as unknown as BrandInput);
// One FILE, one variable table (#236): the gradient stops bind to `palette/*` variables, so the styles
// shim's `variables` slice must be the SAME shim the colour executor wrote into — otherwise the stop
// bindings would resolve against an empty table and the round-trip would prove nothing. So write
// aurora's COLOUR plan first (its own shim, keeping the NB read above untouched), then its styles.
const auroraVars = new VariablesShim();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const auroraApi = auroraVars as any;
await applyWritePlan(buildWritePlan(buildFigmaColor(auroraTheme)), auroraApi);
class StylesShimBound extends StylesShim { constructor(public variables: VariablesShim) { super(); } }
const styleShim = new StylesShimBound(auroraVars);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sres = await applyStylesPlan(buildStylesPlan(auroraTheme), styleShim as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const snap3 = await readFigmaVariables(auroraApi, styleShim as any);
const expectDark = auroraTheme.modes.includes('dark');
const expectGradients = !!buildStylesPlan(auroraTheme).paints.length;
const sverdict = verifyStylesReadback(snap3, expectDark, expectGradients);

ok(!!snap3.styles && snap3.styles.effects.some((n) => n.startsWith('shadow/')), 'snapshot carries the Effect Style names after the styles write');
ok(sverdict.ok, 'verifyStylesReadback: contract holds' + (sverdict.ok ? '' : ` — ${Object.entries(sverdict.checks).filter(([, v]) => !v).map(([k]) => k).join(',')}`));
ok(sverdict.checks.shadowDarkConsistent, 'shadow-dark/* present iff the brand ships dark');
ok(sverdict.checks.gradientsConsistent, 'gradient Paint Styles present iff the brand opts into gradients');

// ---- gradient stop bindings survive the round trip (#236) ---------------------------------
// The write reported bindings; the READ must see them, resolved back to palette NAMES. This is the
// pair that matters: the executor's own count is self-reported, while this crosses the Figma boundary
// (id -> name) the way the real read does, so a binding written to a bogus id would fail here.
const stopBindings = snap3.styles?.gradientStopBindings;
ok(sres.paints.bound > 0 && sres.misses.length === 0,
  `styles write bound ${sres.paints.bound} stops with 0 misses (palette written first)`);
ok(!!stopBindings && Object.keys(stopBindings).length === snap3.styles!.paints.length,
  `read-back carries stop bindings for every Paint Style (${Object.keys(stopBindings ?? {}).length})`);
const readBound = Object.values(stopBindings ?? {}).flat().filter((n) => n !== null);
ok(readBound.length === sres.paints.bound,
  `read-back resolves every written binding to a name (${readBound.length}/${sres.paints.bound})`);
// Per-stop identity against the PLAN, not just the `palette/` prefix. A prefix check is satisfied by a
// reader that fabricates a plausible name, which is precisely the failure the reader's own comment
// promises not to commit — caught by mutating `nameById.get(id) ?? null` to a constant, which passed a
// prefix-only assertion. Compare the exact target each stop was planned to bind to.
const auroraPaints = buildStylesPlan(auroraTheme).paints;
const bindMismatch: string[] = [];
for (const row of auroraPaints) {
  const read = stopBindings?.[row.name];
  if (!read) { bindMismatch.push(`${row.name}: absent from the read-back`); continue; }
  row.stops.forEach((stop, i) => {
    if (read[i] !== stop.alias) bindMismatch.push(`${row.name} stop ${i}: read ${read[i]}, planned ${stop.alias}`);
  });
}
ok(bindMismatch.length === 0, 'every stop reads back bound to the EXACT variable the plan named'
  + (bindMismatch.length ? ` — ${bindMismatch.slice(0, 3).join('; ')}` : ''));
ok(sverdict.checks.gradientStopsBound, 'verifyStylesReadback: every gradient stop is variable-bound');
ok(sverdict.details.unboundStops.length === 0, `no unbound stops reported (${sverdict.details.unboundStops.length})`);

// And the check must be able to FAIL — a verdict that cannot go red is not a gate. Same snapshot with
// one stop's binding knocked out: the check flips and the offending stop is named.
const brokenSnap = {
  ...snap3,
  // The surviving stop is spelled ROOTED (`prism/core/palette/...`), because `inCoreGroup` is what
  // decides bound-ness and an unrooted name fails it — which would make BOTH stops unbound and this arm
  // fail for the wrong reason. Exactly one knocked-out stop is what it is trying to detect.
  styles: { ...snap3.styles!, gradientStopBindings: { ...stopBindings, 'gradient/hero': [null, 'prism/core/palette/primary/600'] } },
};
const bverdict = verifyStylesReadback(brokenSnap, expectDark, expectGradients);
ok(!bverdict.checks.gradientStopsBound && bverdict.details.unboundStops.length === 1 && !bverdict.ok,
  `an unbound stop fails the verdict and is named (${bverdict.details.unboundStops[0] ?? 'none'})`);

// ═══ THE NAMESPACE, AS A DIFFERENTIAL ROUND-TRIP (#1097) ══════════════════════════════════════════
//
// THE TWO INDEPENDENT THINGS ARE THE TWO RUNS. One brand is emitted TWICE — once under its own root,
// once under a root no corpus brand uses — both written by the real executors and read back through the
// real `readFigmaVariables`. The claim is then a comparison between two measurements, not against an
// expected value anybody authored: after removing the leading segment, the two read-backs must be
// IDENTICAL. If they are, the read path cannot distinguish one root from another, which is the whole
// content of the change.
//
// WHY THIS AND NOT THE `zzstub` ROOT IN `test.ts`. That stub proves a synthetic root works INSIDE A STUB,
// and it earns its keep. It is not this: it fixes one root and asserts about it, so the day someone
// changes it for an unrelated reason the namespace proof silently disappears and no gate reports the
// loss (`docs/34`'s borrowed-backstop shape — an arm pointed at data that no longer carries the hazard).
// A differential has no such anchor. It compares two runs to each other, so it stays a namespace proof
// for as long as the two roots differ, whatever they are.
//
// THE REACHABILITY ARM IS LOAD-BEARING and comes first. "Identical after stripping the first segment" is
// also satisfied by an engine that emits NO root at all — both runs would be identical before stripping
// too, and the gate would pass while proving nothing. So the raw names are asserted to DIFFER, and each
// run's names to begin with its OWN root, before the agreement is asserted at all.
//
// MUTATION-VERIFIED BY NAME, twice, because the two mutations fail DIFFERENT arms here:
//   1. `inPalette(v.name)` → a literal `v.name.startsWith('prism/core/palette/')` in `read-figma.ts`.
//      Arms (0) and (1) fail and name 162 palette names present under one root and absent under the other.
//   2. The colour alias resolution normalised to the default: `nameById.get(id).replace(/^root\//, 'prism/')`.
//      Arm (2)'s FIRST half still PASSES — and that is the finding. A defect applied symmetrically to both
//      runs leaves them agreeing with each other, so a differential is structurally blind to it. Only the
//      leak arm ("no `prism/` in the foreign run") catches it. The two halves of (2) are therefore not
//      redundant: one compares the runs, the other compares the foreign run against a root it must never
//      contain. Delete either and a real regression ships.
const NATIVE_ROOT = 'ads';        // aurora's own (#1283 — was 'prism', the engine default, until aurora took a name)
const FOREIGN_ROOT = 'zzclient';  // no corpus brand uses it; a read path that spells a root fails here
const auroraInput = exampleBrands['aurora'] as unknown as BrandInput;

/** Strip the leading segment. A local re-implementation ON PURPOSE: `tailOf` is part of the subject
 *  (`write-components.ts` resolves bindings through it), so an oracle built from it would compare the
 *  read path against itself. Four lines of `split` owe nothing to the engine. */
const dropRoot = (n: string): string => n.split('/').slice(1).join('/');

/** Write colour + FLOAT + styles for one root and read the whole thing back through the real executor. */
const emitAndRead = async (root: string) => {
  const theme = brandTheme({ ...auroraInput, root });
  const vars = new VariablesShim();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: shim satisfies VariablesApi
  const vapi = vars as any;
  await applyWritePlan(buildWritePlan(buildFigmaColor(theme)), vapi);
  await applyFloatPlan(buildFloatWritePlan(theme), vapi);
  const styles = new StylesShimBound(vars);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await applyStylesPlan(buildStylesPlan(theme), styles as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return readFigmaVariables(vapi, styles as any);
};

const runNative = await emitAndRead(NATIVE_ROOT);
const runForeign = await emitAndRead(FOREIGN_ROOT);

/** Every variable name a snapshot carries, in a stable order. */
const varNamesOf = (s: Awaited<ReturnType<typeof emitAndRead>>): string[] => [
  ...s.palette.map((v) => v.name),
  ...s.color.map((v) => v.name),
  ...Object.keys(s.float ?? {}).sort().flatMap((k) => s.float![k].map((v) => v.name)),
].sort();

const nativeNames = varNamesOf(runNative);
const foreignNames = varNamesOf(runForeign);

// (0) REACHABILITY — the two runs really are two different files, and each is rooted at its own root.
ok(nativeNames.length > 0 && foreignNames.length === nativeNames.length,
  `#1097 differential reachable: both runs read back the same ${nativeNames.length} variables`);
ok(nativeNames.every((n) => n.startsWith(`${NATIVE_ROOT}/`)) && foreignNames.every((n) => n.startsWith(`${FOREIGN_ROOT}/`)),
  `#1097 differential reachable: every name in run A starts \`${NATIVE_ROOT}/\` and every name in run B starts \`${FOREIGN_ROOT}/\` — so the root really moved`);
ok(nativeNames.join('\n') !== foreignNames.join('\n'),
  '#1097 differential reachable: ...and the two raw name sets therefore DIFFER — the agreement below is not the trivial one an unrooted emission would satisfy');

// (1) THE AGREEMENT — every variable name matches once the leading segment is gone.
// Compared as a SYMMETRIC DIFFERENCE rather than an index-by-index zip, because the failure this arm
// exists to catch does not preserve length: a read path that spells `prism/` returns the foreign run's
// palette as EMPTY, and zipping the longer list against the shorter one reads `undefined` and throws.
// A gate that dies in a stack trace has still failed the suite, but it has stopped saying WHY — and the
// label is the whole value of failing by name. Found by running the mutation, not by reasoning about it.
const diffBothWays = (a: string[], b: string[]): string[] => {
  const bs = new Set(b), as = new Set(a);
  return [...a.filter((x) => !bs.has(x)).map((x) => `only in ${NATIVE_ROOT}: ${x}`),
          ...b.filter((x) => !as.has(x)).map((x) => `only in ${FOREIGN_ROOT}: ${x}`)];
};
const nameDiff = diffBothWays(nativeNames.map(dropRoot).sort(), foreignNames.map(dropRoot).sort());
ok(nameDiff.length === 0,
  `#1097 the two runs' variable names are IDENTICAL modulo the leading segment (${nativeNames.length} names${nameDiff.length ? `, ${nameDiff.length} differ: ${nameDiff.slice(0, 3).join('; ')}` : ''})`);

// (2) ALIAS TARGETS TOO — a name that round-trips while its POINTERS keep a root would render correctly
// and be broken the moment a brand changed root. Read out of `valuesByMode`, where the reader resolves
// an id back to a name, so this crosses the same boundary the real read does.
type Binding = { row: string; mode: string; target: string };
const aliasTargetsOf = (s: Awaited<ReturnType<typeof emitAndRead>>): Binding[] => {
  const out: Binding[] = [];
  // `palette` rows are single-value primitives and carry no `valuesByMode` at all, so the guard is real
  // rather than defensive — reading them raw is what threw the first time this ran.
  const rows = [...s.color, ...Object.keys(s.float ?? {}).sort().flatMap((k) => s.float![k])];
  for (const v of rows)
    for (const m of Object.keys(v.valuesByMode ?? {}).sort()) {
      const val = v.valuesByMode[m];
      if (val && typeof val === 'object' && 'alias' in val && typeof val.alias === 'string') out.push({ row: v.name, mode: m, target: val.alias });
    }
  return out.sort((a, b) => `${a.row}@${a.mode}`.localeCompare(`${b.row}@${b.mode}`));
};
const nativeAliases = aliasTargetsOf(runNative);
const foreignAliases = aliasTargetsOf(runForeign);
const stripped = (b: Binding): string => `${dropRoot(b.row)} @${b.mode} -> ${dropRoot(b.target)}`;
// Symmetric for the same reason as (1) — see there.
const aliasDiff = diffBothWays(nativeAliases.map(stripped).sort(), foreignAliases.map(stripped).sort());
ok(nativeAliases.length > 0 && nativeAliases.length === foreignAliases.length && aliasDiff.length === 0,
  `#1097 every alias TARGET agrees modulo the root as well (${nativeAliases.length} bindings${aliasDiff.length ? `, ${aliasDiff.length} differ: ${aliasDiff.slice(0, 3).join('; ')}` : ''})`);
ok(nativeAliases.every((b) => b.target.startsWith(`${NATIVE_ROOT}/`)) && foreignAliases.every((b) => b.target.startsWith(`${FOREIGN_ROOT}/`)),
  `#1097 ...and not one target in the foreign run still points at a \`${NATIVE_ROOT}/\` name — a hard-coded default leaks HERE, in the pointer, long before it shows in a variable name`);

// (3) COLLECTIONS AND MODES CARRY NO ROOT AT ALL, so they must match with NOTHING stripped. A collection
// is an axis, not a token, and the mode picker is where a designer would see a namespace they never asked
// for. Compared raw on purpose — stripping first would hide a root that had leaked in.
const collOf = (s: Awaited<ReturnType<typeof emitAndRead>>): string =>
  s.collections.map((c) => `${c.name}[${[...c.modes].sort().join(',')}]`).sort().join(' | ');
ok(collOf(runNative) === collOf(runForeign) && collOf(runNative).indexOf(NATIVE_ROOT) < 0,
  `#1097 collections and their modes are byte-identical across the two roots, and carry no root themselves (${runNative.collections.length} collections)`);

// (4) THE STYLES EXCEPTION, stated as a gate rather than only in prose. A text/effect/paint STYLE name
// drops the root AND the tier — `shadow/md`, not `<root>/shadow/md` — because Figma's style tree is what
// a designer browses by hand. So style names must match RAW between the two runs, and the assertion is
// here rather than in a doc because "a variable's name is its DTCG path" generalised to styles is the
// wrong sentence and this is the only place both are in hand at once.
const styleNamesOf = (s: Awaited<ReturnType<typeof emitAndRead>>): string =>
  [...(s.styles?.effects ?? []), ...(s.styles?.paints ?? [])].sort().join(' | ');
ok(styleNamesOf(runNative).length > 0 && styleNamesOf(runNative) === styleNamesOf(runForeign)
  && styleNamesOf(runForeign).indexOf(`${FOREIGN_ROOT}/`) < 0,
  `#1097 STYLE names are unrooted and identical across both runs — the stated exception (${(runNative.styles?.effects.length ?? 0) + (runNative.styles?.paints.length ?? 0)} styles)`);
// ...while the gradient stops those styles bind to are VARIABLES, so they do carry the root. Asserted in
// the same breath because the exception is easy to over-apply: the style name is unrooted, its bindings
// are not, and one file holds both.
const stopsOf = (s: Awaited<ReturnType<typeof emitAndRead>>): string[] =>
  Object.values(s.styles?.gradientStopBindings ?? {}).flat().filter((n): n is string => typeof n === 'string');
ok(stopsOf(runForeign).length > 0 && stopsOf(runForeign).every((n) => n.startsWith(`${FOREIGN_ROOT}/`))
  && stopsOf(runNative).map(dropRoot).join('|') === stopsOf(runForeign).map(dropRoot).join('|'),
  `#1097 ...but a gradient stop binds a VARIABLE, so it IS rooted — and agrees modulo the root (${stopsOf(runForeign).length} stops)`);

// ═══ DECLARED MODES vs THE FILE'S MODES (#1662 follow-up, owner decision 2026-09-27) ══════════════════════
//
// The case the owner named: a multi-mode brand whose other modes never landed (`addMode` refused on a plan
// tier's mode cap) read "contract holds ✓" with one mode. Modeled as the file a refused `addMode` leaves: the
// REAL executor writes a light-only plan, while the brand persisted in the file (#131) is aurora as authored,
// which declares no `modes` and so ships the default four. The declared set is read out of shared-data by
// `declaredModesOf` — the same function `seedFromFile` calls — and the expected strings are WRITTEN here.
{
  const auroraLightOnly = brandTheme({ ...auroraInput0(), modes: ['light'] });
  const vars = new VariablesShim();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await applyWritePlan(buildWritePlan(buildFigmaColor(auroraLightOnly)), vars as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fileSnap = await readFigmaVariables(vars as any);
  const store = new Map<string, string>();
  const root = {
    getSharedPluginData: (ns: string, key: string) => store.get(`${ns}/${key}`) ?? '',
    setSharedPluginData: (ns: string, key: string, v: string) => { store.set(`${ns}/${key}`, v); },
  };

  // No saved brand → skipped, and the pill says why.
  const none = verifyReadback(fileSnap, declaredModesOf(root));
  ok(none.declaredModes.status === 'skipped' && none.ok
    && seedSummary(none) === `Existing theme: ${fileSnap.color.length} color vars, modes light — contract holds ✓ · mode check skipped — no saved brand in this file`,
    `declared modes: no saved brand → skipped, reason in the pill ("${seedSummary(none)}")`);
  ok(SKIP_NO_BRAND === 'no saved brand in this file', 'declared modes: the no-brand reason reads as written');

  // A stored blob this build refuses (#480) → skipped with its own reason, not "no saved brand".
  root.setSharedPluginData('prism3', 'brandInput', '{"not":"a brand"}');
  const unreadable = verifyReadback(fileSnap, declaredModesOf(root));
  ok(unreadable.declaredModes.status === 'skipped' && unreadable.declaredModes.reason === SKIP_UNREADABLE
    && SKIP_UNREADABLE === 'the saved brand could not be read',
    `declared modes: an unreadable saved brand → skipped, reason "${unreadable.declaredModes.status === 'skipped' ? unreadable.declaredModes.reason : '—'}"`);

  // The saved brand declares four modes; the file holds light → FAILS, naming the three that never landed.
  persistInput(root, auroraInput0());
  const capped = verifyReadback(fileSnap, declaredModesOf(root));
  ok(capped.declaredModes.status === 'fail' && JSON.stringify(capped.declaredModes.missing) === '["dark","hc-light","hc-dark"]' && !capped.ok,
    `declared modes: saved brand declares light/dark/hc-light/hc-dark, file holds light → FAILS naming the missing modes (${JSON.stringify(capped.declaredModes)})`);
  ok(seedSummary(capped) === `Existing theme: ${fileSnap.color.length} color vars, modes light — FAILED: declaredModes · saved brand declares dark/hc-light/hc-dark, not in this file`,
    `declared modes: the pill names the missing modes ("${seedSummary(capped)}")`);

  // The saved brand declares light only; the file holds light → passes.
  persistInput(root, { ...auroraInput0(), modes: ['light'] });
  const match = verifyReadback(fileSnap, declaredModesOf(root));
  ok(match.declaredModes.status === 'pass' && match.ok
    && seedSummary(match) === `Existing theme: ${fileSnap.color.length} color vars, modes light — contract holds ✓`,
    `declared modes: saved brand declares light, file holds light → passes ("${seedSummary(match)}")`);

  // An extra mode in the file is reported, not failed.
  const extraSnap = { ...fileSnap, collections: fileSnap.collections.map((c) => c.name === 'color' ? { ...c, modes: [...c.modes, 'promo'] } : c) };
  const extra = verifyReadback(extraSnap, declaredModesOf(root));
  ok(extra.declaredModes.status === 'pass' && seedSummary(extra).endsWith(' · promo in this file, not declared by the saved brand'),
    `declared modes: an extra file mode is reported, not failed ("${seedSummary(extra)}")`);
}

// ═══ PLANNED MODES: THE CAPPED APPLY, IN APPLY'S OWN ORDER (#1704 net) ══════════════════════════════════════
//
// The block above persists a brand straight into shared-data. This one drives what a real capped apply leaves.
// A refused `addMode` THROWS out of the executor, so the apply aborts before `persistInput` runs (#131 persists
// only after every executor returns) and the saved brand is still the PREVIOUS one — against which the file
// reads a match. And `apply-theme.ts` runs the FLOAT pass before color, so a cap below `layout`'s breakpoint
// count is refused there and color is never touched. What catches it is each collection's own record of what
// the apply planned, written by `reconcileModes` BEFORE its first `addMode` and checked by `verifyReadback`.
// The shim models the two host behaviors that matter: shared plugin data on a collection, and a mode cap.
{
  const makeCapped = (cap: number) => {
    class CappedCollection extends ShimCollection {
      private data = new Map<string, string>();
      getSharedPluginData(ns: string, key: string): string { return this.data.get(`${ns}/${key}`) ?? ''; }
      setSharedPluginData(ns: string, key: string, v: string): void { if (v) this.data.set(`${ns}/${key}`, v); else this.data.delete(`${ns}/${key}`); }
      addMode(name: string): string { if (this.modes.length >= cap) throw new Error(`in addMode: Limited to ${cap} modes only`); return super.addMode(name); }
    }
    class CappedVars extends VariablesShim {
      private n = 0;
      createVariableCollection(name: string): ShimCollection { const c = new CappedCollection(`k${++this.n}`, name); this.collections.push(c); return c; }
    }
    return new CappedVars();
  };
  const rootOf = () => {
    const store = new Map<string, string>();
    return {
      getSharedPluginData: (ns: string, key: string) => store.get(`${ns}/${key}`) ?? '',
      setSharedPluginData: (ns: string, key: string, v: string) => { store.set(`${ns}/${key}`, v); },
    };
  };
  const lightOnly: BrandInput = { ...auroraInput0(), modes: ['light'] };

  // (A) The cap is refused on `layout`, in the float pass, before color runs. Aurora's layout plans six
  // breakpoints (xs/sm/md/lg/xl/2xl); a cap of four admits xs–lg and refuses xl.
  {
    const vars = makeCapped(4);
    const root = rootOf();
    // Apply 1 lands a light-only color collection and, as a successful apply does, persists its brand.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await applyWritePlan(buildWritePlan(buildFigmaColor(brandTheme(lightOnly))), vars as any);
    persistInput(root, lightOnly);
    // Apply 2, the four-mode brand, in `apply-theme.ts`'s order: FLOAT first. The cap throws there.
    let threw = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { await applyFloatPlan(buildFloatWritePlan(brandTheme(auroraInput0())), vars as any); } catch (e) { threw = (e as Error).message; }
    ok(threw === 'in addMode: Limited to 4 modes only', `planned modes (float cap): the refused addMode aborts the float pass ("${threw}")`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snap = await readFigmaVariables(vars as any);
    ok(JSON.stringify(snap.modesPlanned?.['layout']) === '["xs","sm","md","lg","xl","2xl"]' && JSON.stringify(snap.modesPlanned?.['color']) === '["light"]',
      `planned modes (float cap): layout records the aborted plan, color keeps apply 1's (${JSON.stringify(snap.modesPlanned)})`);
    const v = verifyReadback(snap, declaredModesOf(root));
    ok(v.declaredModes.status === 'pass',
      `planned modes (float cap): the saved brand alone reads a match (${v.declaredModes.status}) — the gap this check closes`);
    ok(v.plannedModes.status === 'fail' && JSON.stringify(v.plannedModes.missing) === '[{"collection":"layout","modes":["xl","2xl"]}]' && !v.ok,
      `planned modes (float cap): the boot read-back FAILS naming layout xl/2xl (${JSON.stringify(v.plannedModes)})`);
    ok(seedSummary(v) === `Existing theme: ${snap.color.length} color vars, modes light — FAILED: plannedModes · the last apply did not finish — layout is missing xl/2xl`,
      `planned modes (float cap): the pill names what did not land ("${seedSummary(v)}")`);
  }

  // (B) The cap is refused inside color itself (a cap of one: color's second mode).
  {
    const vars = makeCapped(1);
    const root = rootOf();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await applyWritePlan(buildWritePlan(buildFigmaColor(brandTheme(lightOnly))), vars as any);
    persistInput(root, lightOnly);
    let threw = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { await applyWritePlan(buildWritePlan(buildFigmaColor(brandTheme(auroraInput0()))), vars as any); } catch (e) { threw = (e as Error).message; }
    ok(threw === 'in addMode: Limited to 1 modes only', `planned modes (color cap): the refused addMode aborts the color pass ("${threw}")`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snap = await readFigmaVariables(vars as any);
    const v = verifyReadback(snap, declaredModesOf(root));
    ok(v.plannedModes.status === 'fail' && JSON.stringify(v.plannedModes.missing) === '[{"collection":"color","modes":["dark","hc-light","hc-dark"]}]' && !v.ok,
      `planned modes (color cap): the boot read-back FAILS naming color dark/hc-light/hc-dark (${JSON.stringify(v.plannedModes)})`);
  }

  // (C) A clean apply records its plan and passes; a file with no record reads `none`, never a pass.
  {
    const vars = makeCapped(10);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await applyWritePlan(buildWritePlan(buildFigmaColor(brandTheme(auroraInput0()))), vars as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = verifyReadback(await readFigmaVariables(vars as any), { skipped: 'not under test in this arm' });
    ok(v.plannedModes.status === 'pass' && JSON.stringify(v.plannedModes.collections) === '["color"]',
      `planned modes (clean apply): every recorded plan landed (${JSON.stringify(v.plannedModes)})`);
    const unstamped = new VariablesShim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await applyWritePlan(buildWritePlan(buildFigmaColor(brandTheme(auroraInput0()))), unstamped as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = verifyReadback(await readFigmaVariables(unstamped as any), { skipped: 'not under test in this arm' });
    ok(u.plannedModes.status === 'none', `planned modes (no record): a file with no record reads none (${u.plannedModes.status})`);
  }
}

console.log(`\nplugin read-back: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
