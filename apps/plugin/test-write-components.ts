/**
 * Plugin COMPONENT write-adapter test (#487 step 5) — drives the REAL `applyComponentPlan` executor
 * against an in-memory `ComponentsApi` shim, so the whole component-set assembly is verified with no
 * live Figma.
 *
 *   npx tsx apps/plugin/test-write-components.ts
 *
 * The shim is modelled on the engine's `figmaStub` (`packages/engine/test.ts`), which is what gates the
 * PASTE path against the same plans — deliberately so, because the parity gate in `test.ts` compares
 * the two executors' results and a shim that modelled a different Figma would make that comparison
 * meaningless. Everything it models, it models because a permissive stub let a real defect pass:
 *
 *   · width/height are DERIVED (fixed-when-bound, else hug + padding + border on the hug axis only).
 *     A constant-measuring stub cannot catch an arithmetic error — a 4x4 focus ring on a real button
 *     passed the engine's entire suite green, including the assertion written to catch it.
 *   · a TEXT node measures its CHARACTERS, so the centering offset is non-zero and a spinner CENTERED
 *     is distinguishable from a spinner PINNED TO A CORNER.
 *   · `layoutPositioning` is SILENTLY REJECTED outside an auto-layout parent, which is the only part
 *     of it worth modelling — a stub that stored the value would let the read-back be deleted green.
 *   · a set's box does NOT follow its members, which is the entire reason the executor calls `resize`.
 *   · `addComponentProperty` RENAMES a duplicate rather than refusing it, and refuses a non-node-id
 *     `INSTANCE_SWAP` default; `componentPropertyDefinitions` THROWS on duplicate member names while
 *     `addComponentProperty` keeps succeeding.
 *   · `componentPropertyReferences` naming an unknown property throws.
 *   · `strokesIncludedInLayout` starts TRUE (Figma's default), so border-box has something to prove,
 *     and is AUTO-LAYOUT-ONLY — its setter THROWS on a `layoutMode: NONE` frame as the host does, which
 *     is what makes the standalone focus ring's crash (a stroked, absolute root frame) catchable here.
 *
 * Asserts: the 21-variant button grid assembles into one set with the right axes, grid and box; every
 * binding, paint, text style and swap lands; the focus ring is absolute and 2px larger on every side;
 * the pending spinner is absolute and centered; the footprint is stable across `state`/`appearance`;
 * properties are declared on the set after combining and wired to EVERY member; a re-run is idempotent;
 * and the degraded cases (missing variables, missing swap target, missing shared component, a stray
 * member, a duplicate member name) are reported as misses rather than thrown or silently dropped.
 *
 * SINCE #827 THE SHIM ALSO STORES SHARED PLUGIN DATA, per node, and that is a load-bearing addition rather
 * than a convenience: the member stamp is written on one run and READ on the next, so a shim that merely
 * counted the write would leave every re-run reporting the whole set stale and the idempotence arms above
 * could never be green. The arms it enables are the ones that distinguish "already built and still correct"
 * from "built by an earlier plan and now wrong" — the second of which a name match cannot see, and which
 * this build reports rather than repairs, because a rebuild replaces the component node and an instance
 * tracks its main component by ID. That last claim is checked by node IDENTITY, not by a count.
 *
 * ON THE #684 CHUNKING, THE LIMIT IS WORTH STATING BEFORE THE ASSERTIONS: this harness has no event loop
 * to starve, no Figma heartbeat, no socket to drop and no scenegraph to reconcile. So it cannot verify the
 * thing #684 is actually about — that the host stays responsive — and it cannot tell a good chunk size
 * from a bad one. Nor can it tell a macrotask yield from a microtask one, for the same missing-host reason:
 * `realYield`'s `setTimeout` could be swapped for `Promise.resolve()` and every assertion here would still
 * pass, which is stated at `realYield` itself so the silence is not read as coverage.
 * What it CAN verify is the arithmetic around the yielding: that a yield happens, that it
 * happens at the boundaries claimed, that it still happens in the cases where the loop body does almost
 * nothing, and that the fractions reported are monotonic within a phase and end at the total. Those are
 * exactly the parts that were wrong in draft and that a live run would not isolate — a build that freezes
 * tells you nothing about which of the two loops did it. The responsiveness itself is verified by running
 * it in Figma, and the chunk size is set from `chunkMs` off that run. See `CHUNK` in `write-components.ts`.
 */
import { figmaAnatomyPlan, figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles, planSetProperties, planSetLayout, planComponentName, planStamp } from '@prism3/engine/anatomy-figma';
import { ENGINE_VERSION } from '@prism3/engine/version';
// Source-text only, for `main.ts`'s wiring — see the `(5)` block below for what that can and cannot see.
import { readFileSync } from 'node:fs';
import { button } from '@prism3/engine/components/button';
import { fieldLabel } from '@prism3/engine/components/field-label';
// The three selection controls read back for #1011 are resolved through `componentDefs` rather than
// imported by path — the engine's `exports` map names only `button` and `field-label`, and #804's own
// reasoning says an id-based lookup is the one the main thread does.
import { fieldMessage } from '@prism3/engine/components/field-message';
import { componentDefs } from '@prism3/engine/components/index';
import type { ComponentDef } from '@prism3/engine/component-schema';
// #1015 — the token VALUE half of the corner read-back. The shim gives every variable a synthetic value,
// so a built node can only name the variable it binds; these three resolve that name against real brands.
// All in the engine's `exports` map, which is why the value assertion can be co-located with the node one
// instead of stranded in `test.ts` the way #1010's was.
import { brandTheme } from '@prism3/engine/theme';
import { buildTree, pxOf } from '@prism3/engine/tree';
import { nbTheme } from '@prism3/engine/nb-fixture';
import { exampleBrands } from '@prism3/engine/emit-brandinput';
// #1605 — the brand materialization `main.ts` projects through, plus NB's real input and emitted styles.
import { materializeForBrand } from './src/brand-def';
import { prebuildDependencies, missingDependencies, DependencyBuildError, SWAP_TARGET as PLUGIN_SWAP_TARGET } from './src/build-deps';
import { parseDesignMd } from '@prism3/engine/design-md';
import { buildFigmaTextStyles } from '@prism3/engine/emit-figma-font';
// #1608 — the brand's COLOR emission, the host-side oracle for the outline-hover arm.
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import type { BrandInput } from '@prism3/engine/theme';
import { applyComponentPlan, CHUNK, partialWriteOf, buildReportJson, REF_BACKOFF_MS } from './src/write-components';
import { partialWriteHeadline, partialWriteNote, componentHeadline, staleNote } from './src/apply-summary';
import type { ComponentApplyOptions, ComponentProgress, BuildReport } from './src/write-components';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/**
 * A KNOWN DEFECT, PINNED — reproduced here, deliberately not fixed here.
 *
 * `cond` states the WRONG behavior the executor has today, so the pin passes while the defect is
 * present and goes RED the day it is fixed, naming the issue and the assertion to flip. That is the
 * opposite polarity from `ok` and the sign is the whole point: a test left genuinely red cannot be told
 * apart from a broken build, and CI would refuse the PR that makes the defect reproducible at all.
 *
 * Same shape as `packages/tokens`' consumer-side count: a MEMORY of what is true rather than a RULE
 * about what should be. The pin is what forces the fixing PR to touch this file — it cannot land a fix
 * and leave the reproduction claiming the old behavior.
 */
const pinned = (cond: boolean, issue: string, label: string): void => {
  if (cond) console.log(`  ⊗ ${issue} PINNED (defect still present, as expected): ${label}`);
  else { failed++; console.error(`  ✗ ${issue} is FIXED — flip this pin to a positive assertion: ${label}`); }
};

// ---- the in-memory components shim --------------------------------------------------------
import {
  makeShim, burnMs, varValue, fontKey,
  SHIM_ROOT, SHIM_GAP, SHIM_STROKE, SHIM_COORD, STYLE_FONT,
} from './component-shim';
import type { Node, Page, ShimOpts, FileNode, FontName } from './component-shim';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
const run = (plans: AnatomyPlan[], opts: ShimOpts = {}, apply: ComponentApplyOptions = {}) =>
  applyComponentPlan(plans, makeShim(opts) as any, apply);

/** A run that RECORDS its yields and its progress reports (#684).
 *
 *  The injected `yieldTo` is what makes the yield observable at all — it resolves immediately rather than
 *  through a real timer, which is the point twice over: the suite does not pay 54 timer ticks per run, and
 *  a yield that happened is distinguishable from one that did not. With the production `setTimeout(0)`
 *  there is nothing to assert against; the only evidence would be that the run finished, which it does
 *  either way.
 *
 *  It resolves via `Promise.resolve()` — a MICROTASK — and that is a deliberate difference from
 *  production, not an oversight. A microtask yields nothing to a host event loop, which is exactly why
 *  `realYield` uses `setTimeout`; but this harness has no host to yield to, so what is being measured here
 *  is the executor's control flow, and a microtask measures that identically while keeping the test
 *  synchronous-fast. The macrotask requirement is a property of the production path and is NOT currently
 *  assertable here: swapping `realYield`'s `setTimeout` for `Promise.resolve()` passes this whole suite,
 *  because a harness with no event loop cannot tell the two apart. Only the live run can.
 *
 *  `yieldCalls` AND `progress` ARE COUNTED SEPARATELY, AND THAT SEPARATION IS THE GATE — docs/34 §2, an
 *  oracle and its subject sharing a dependency. For one commit `yields` was pushed from inside
 *  `onProgress`, so every "the executor yields on every boundary" assertion below was reading the
 *  REPORTING cadence and calling it yielding: deleting `await yieldTo()` from `breathe` left the suite
 *  fully green (mutation M6, verified). A report and a yield are two facts, so they are recorded by two
 *  callbacks that cannot substitute for one another, and asserted to agree. */
const instrumented = async (plans: AnatomyPlan[], opts: ShimOpts = {}, chunk?: number, burnYield = 0) => {
  const yieldCalls = { n: 0 };
  const yields: string[] = [];
  const progress: ComponentProgress[] = [];
  const r = await run(plans, opts, {
    chunk,
    // Recorded in the order they fire, tagged with the phase and fraction that was current — so an
    // assertion can check ORDER, not just counts. `onProgress` fires immediately before the yield in
    // `breathe`, so the two arrays are index-parallel.
    onProgress: (p) => { progress.push({ ...p }); yields.push(`${p.phase}:${p.done}/${p.total}`); },
    // The ONLY witness that control was handed back. Nothing else in this file increments it.
    // `burnYield` charges the YIELD's own duration, which is the third clock rule: `breathe` re-stamps
    // AFTER awaiting, so a yield that took 40ms must not be billed to the chunk that follows it. Live,
    // that time is the host doing its own work — the entire point of yielding — so counting it as chunk
    // cost would make every chunk look worse the more politely the executor behaved.
    yieldTo: () => { yieldCalls.n++; if (burnYield) burnMs(burnYield); return Promise.resolve(); },
  });
  return { r, yields, progress, yieldCalls: yieldCalls.n };
};

// ---- the swap target THE PLUGIN NOMINATES, read off `main.ts` rather than restated ----------
/** `main.ts`'s source, read once. Source text is the only handle on it — `main.ts` calls `figma.showUI`
 *  at module scope so it cannot be imported (see block `(5)` below for what that can and cannot see). */
const mainSrc = readFileSync(new URL('./src/main.ts', import.meta.url), 'utf8');
/**
 * The name `main.ts` hands the projector — PARSED, never restated (#1280 / #1206).
 *
 * The whole of #1206's fix is WHICH component name the button's icon slots reach for, so a harness
 * carrying its own copy of that name exercises a wiring the plugin does not have. Measured, not
 * feared: `main.ts` was moved from `FPO-default-icon` to `icon/FPO-default-icon` — the name #1012's
 * emitter actually produces — and this suite stayed ALL PASS on the stale name, including every arm
 * below that reads as being about the button's swap slot. One source of truth, and it is the plugin's.
 *
 * The parse being empty is itself asserted (the input pin below), because a regex that stopped matching
 * would drive every arm against `''` and report a file that nominates nothing as a clean resolution.
 */
// Since #111 the constant lives in `build-deps.ts` (importable, so the MCP paste runner projects with the
// same nomination), and `main.ts` imports it. So the value is IMPORTED from where it is defined, and the
// two facts that make it "what the plugin does" are PARSED out of `main.ts`: that it imports this constant
// from `./build-deps`, and that it hands it to the projector. Either one drifting empties `SWAP`, which the
// input pin below turns into a named failure rather than a suite run against `''`.
const mainImportsIt = /import \{[^}]*\bSWAP_TARGET\b[^}]*\} from '\.\/build-deps';/.test(mainSrc);
// CODE lines only: `main.ts`'s header quotes this very call in prose, and a match there would pin nothing.
const mainCode = mainSrc.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');
const mainProjectsWithIt = /figmaAnatomySet\([^;]*\{ swapTarget: SWAP_TARGET \}\)/.test(mainCode);
const SWAP = mainImportsIt && mainProjectsWithIt ? PLUGIN_SWAP_TARGET : '';

// ---- the plans: the same 21-variant button grid the engine's set gates run on --------------
const grid = button.variants!.appearance!.flatMap((ap) => button.states!.map((st) =>
  figmaAnatomyPlan(button, 'medium', { leading: true, swapTarget: SWAP, intent: 'primary', appearance: ap, state: st })));

/** Every component NAME a plan tree nominates — swap targets and nested shared components. Walked
 *  rather than hand-listed for the same reason `full()` derives its variables: a list drifts the moment
 *  a part is added, and the "fully resolved" run would quietly stop being fully resolved while passing. */
const planComps = (n: { swapTarget?: string; nestTarget?: string; children: unknown[] }): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []),
  ...(n.nestTarget ? [n.nestTarget] : []),
  ...(n.children as typeof n[]).flatMap(planComps),
];

// Every name these plans reach for, DERIVED FROM THE PLANS rather than a hand-kept list.
const fullFor = (plans: AnatomyPlan[]): ShimOpts => ({
  vars: [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
  styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
  effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
  comps: [...new Set(plans.flatMap((p) => planComps(p.root)))],
});
const full = (): ShimOpts => fullFor(grid);

console.log('plugin COMPONENT write-adapter (#487 step 5) — executor against in-memory shim\n');

// ---- PIN THE INPUT before asserting the output ---------------------------------------------
// Every assertion below is vacuously satisfiable by a plan set that carries nothing: no bindings ->
// nothing to resolve -> 0 misses -> "pass". So pin what the plans actually ask for first.
ok(grid.length === 21, `the fixture is the 21-variant grid (${grid.length})`);
ok(full().vars!.length > 15, `the plans carry variable bindings to resolve (${full().vars!.length} distinct)`);
ok(full().styles!.length > 0, `the plans carry text styles to resolve (${full().styles!.length})`);
// The PARSE first, because everything downstream is driven by it: a `SWAP` of `''` gives plans that
// nominate nothing, a file that holds nothing, and 0 misses — a green suite over no subject at all.
ok(SWAP !== '', `#1280 main.ts projects with build-deps' SWAP_TARGET (import ${mainImportsIt ? 'found' : 'NOT FOUND'}, projector call ${mainProjectsWithIt ? 'found' : 'NOT FOUND'}), so the plans below nominate what the plugin does (${SWAP || 'NOT FOUND'})`);
ok(full().comps!.includes(SWAP) && full().comps!.includes('focus-ring'),
  `the plans nominate both a swap target and a nested shared component (${full().comps!.join(', ')})`);
ok(planSetProperties(grid).length > 0, `the plans derive component properties (${planSetProperties(grid).map((p) => `${p.name}:${p.type}`).join(', ')})`);

// ---- the fully-resolved run ----------------------------------------------------------------
// GUARDED, because a stack trace is not a test result: it names a line rather than a claim, and it
// aborts every assertion below it — including the ones a reader would go looking for. This became a real
// possibility once the shim started modelling Figma's font-loaded state (#680): deleting this lane's
// `loadFontAsync` call makes `setTextStyleIdAsync` throw from here, and that must read as the failure of
// a named claim, not as a crash.
const page: Page = { children: [] };
let r1Threw = '';
let r1!: Awaited<ReturnType<typeof run>>;
// The host-boundary counter for #701's route assertions. ONE counter across both runs, read by snapshot,
// and that is forced rather than chosen: the second run appends into the set the FIRST run built, so its
// members are nodes `r1`'s shim created and their `findOne` closes over `r1`'s counter. A fresh counter
// handed to the second run would sit at 0 no matter what that run did — vacuous, and it would read as
// "zero searches" precisely when the searching route is the one under test. Measured: 0 while the executor
// reported 63. So it is installed once, before the run it first measures, and each phase takes a delta.
const hostFinds = { n: 0 };
try { r1 = await run(grid, { ...full(), page, hostSearches: hostFinds }); } catch (e) { r1Threw = (e as Error).message; }
// SNAPSHOT IMMEDIATELY, before any assertion helper walks the tree: `partOf` below uses `findAll`, not
// `findOne`, so it does not perturb this — but a later helper that reached for `findOne` would silently
// inflate the figure, and the delta would be attributed to the executor.
const hostAfterR1 = hostFinds.n;
ok(r1Threw === '', `the fully-resolved run COMPLETES rather than throwing${r1Threw ? ` — ${r1Threw.slice(0, 110)}` : ''}`);
if (r1Threw) {
  console.error('\n  (every assertion below depends on that run, so the suite stops here)');
  console.log(`\nplugin COMPONENT write-adapter: ${failed} FAILED`);
  process.exit(1);
}

ok(r1.misses.length === 0, `fully-resolved run reports NO misses (${r1.misses.length}${r1.misses.length ? ` — ${r1.misses.slice(0, 3).join('; ')}` : ''})`);
ok(r1.set === 'button' && r1.variants === 21 && r1.added === 21, `one set named 'button' holding all 21 members, all newly built (set=${r1.set}, variants=${r1.variants}, added=${r1.added})`);
ok(page.children.length === 1 && page.children[0].type === 'COMPONENT_SET',
  `the page holds exactly ONE node — the set — with no loose components left behind (${page.children.length})`);
// The grid rule: only VARYING axes get a dimension, and the LAST varying axis becomes the columns. For
// this fixture that is appearance (3) down × state (7) across.
ok(JSON.stringify(r1.grid) === JSON.stringify([button.variants!.appearance!.length, button.states!.length]),
  `the grid is appearance × state, rows × cols = ${JSON.stringify(r1.grid)}`);
// The two slot axes appear under their Figma display names (#1380), `leading icon` / `trailing icon` —
// the member-name segment IS the variant property Figma derives, and that is the switch label.
ok(JSON.stringify(r1.axes.slice().sort()) === JSON.stringify([`appearance:${button.variants!.appearance!.length}`, 'leading icon:1', 'size:1', `state:${button.states!.length}`, 'trailing icon:1'].sort()),
  `Figma derives every axis from the member names (${r1.axes.join(', ')})`);
// The box is READ BACK from the set, and the set's box does not follow its members — so a non-zero box
// containing 21 members is a positive statement that `resize` ran and landed.
ok(r1.size[0] > 0 && r1.size[1] > 0, `the set's box was resized to contain its members (${r1.size[0]}x${r1.size[1]})`);

// ---- the properties, and that they are wired to EVERY member -------------------------------
const wantProps = planSetProperties(grid).map((p) => `${p.name}:${p.type}`).sort();
ok(JSON.stringify(r1.properties.slice().sort()) === JSON.stringify(wantProps),
  `every derived property is declared on the SET, verbatim and once (${r1.properties.join(', ')})`);
// SPREAD, not volume: `refs` is a write count, so 42 writes onto one member satisfies it as readily as
// 42 across twenty-one — and the whole point of the per-member loop is that references do NOT propagate.
ok(r1.wiredMembers === 21, `references are wired on EVERY member, not just the first (${r1.wiredMembers}/21)`);
ok(r1.refs === 21 * planSetProperties(grid).length, `every member carries every reference (${r1.refs} = 21 × ${planSetProperties(grid).length})`);

// ---- the geometry claims: the focus ring and the pending spinner ----------------------------
const set = page.children[0];
const members = set.children as Node[];
const memberByName = new Map(members.map((m) => [String(m.name), m] as const));
const partOf = (member: Node, name: string): Node | null =>
  ((member.findAll as () => Node[])().find((n) => n.name === name) as Node | undefined) ?? null;

/**
 * THE RING GEOMETRY, and this block is the way it is because of #801 — which it passed while broken.
 *
 * Its previous form derived the expected offset FROM THE NODE UNDER TEST and skipped itself whenever the
 * ring was flush:
 *
 *     if ((ring.x as number) >= 0) continue;      // the flush case skips its own check
 *     const off = -(ring.x as number);            // EXPECTED read off ACTUAL
 *
 * Both lines are `docs/34` shape 1. The `continue` was there to tell an INSET part from a CENTERED one
 * (#612's spinner) and used the negative origin as the discriminator — so the one state worth catching
 * was classified as "not my subject". Then `off` came off the node, making `width === parent + off*2` a
 * comparison of the node with itself: at offset 0 it asserts `0 === 0`. Measured, not inferred — with
 * the shim's inset at 0, a ring sitting exactly on the border it must be distinguishable from, this
 * whole suite stayed green and this line printed a ✓ claiming the ring was "2px larger on EVERY side".
 *
 * Two changes, and each closes one of those:
 *
 *   1. INSET vs CENTERED is read from the PLAN's `absoluteInset`, which is the field that actually
 *      means it — not from a coordinate the executor wrote. A centered part has `absoluteCenter` and no
 *      inset; the plan states which is which before the run, so the classification cannot be moved by
 *      the very write under test.
 *   2. EXPECTED is what the SHIM WAS TOLD to resolve (`SHIM_GAP` / `SHIM_STROKE`, the harness's INPUT),
 *      not what was read back out. Input vs output is the #708 shape, and it is the only version of this
 *      assertion that can fail.
 *
 * AND THEN THAT FIXED VERSION WAS STILL WRONG, which is the part worth reading before trusting anything
 * below. Both changes above are real and neither was sufficient: the repaired assertion took ONE number
 * and asserted the ring's origin was `-that`, which at the shipped 2px offset expected exactly -2 — the
 * flush geometry. It was independent, falsifiable, and measuring the wrong quantity. The ring draws its
 * stroke INSIDE its own bounds, so the coordinate is `gap + stroke` and the property WCAG 1.4.11 is about
 * is the GAP; a checker holding one number can state the coordinate and cannot state the gap. Found by
 * comparing a built file against the Prism2 reference (-4 for the same 2px stroke), not by any gate.
 * `docs/34`'s newest shape is this: a fully independent gate can measure the wrong quantity, and the
 * aggravating detail is that the parity gate confirmed both executors agreed — on one wrong formula.
 *
 * So the checker takes the gap and the stroke separately, asserts the gap is positive OUTRIGHT, and
 * derives it from the built node's own origin. Positive outright because that is #801's actual defect: a
 * gap of 0 resolves cleanly, writes without throwing, reports no miss and produces a structurally perfect
 * component — there is no layer below this one at which it looks like an error. TWO negative controls
 * follow, and the second is the one that matters: a zero offset (never the live symptom) and a correct
 * offset with the stroke unmodeled (what actually shipped). The old single-number checker passes the
 * second one.
 */
const focusName = grid.map(planComponentName).find((n) => n.includes('state=focus'))!;
const focusMember = memberByName.get(focusName)!;
const focusPlan = grid.find((p) => planComponentName(p) === focusName)!;
/** Part names the PLAN marks inset / centered — the independent classification point 1 above needs. */
const planParts = (n: { name: string; absoluteInset?: string; absoluteCenter?: boolean; children: unknown[] }): Array<{ name: string; inset?: string; centered?: boolean }> => [
  { name: n.name, inset: n.absoluteInset, centered: n.absoluteCenter },
  ...(n.children as typeof n[]).flatMap(planParts),
];
const planInset = new Map(planParts(focusPlan.root).filter((p) => p.inset).map((p) => [p.name, p.inset!] as const));
const ringNames = (focusMember.findAll as () => Node[])().filter((n) => n._absolute).map((n) => String(n.name));
ok(ringNames.length > 0, `the focus variant carries an absolutely-positioned part (${ringNames.join(', ')})`);
ok(planInset.size > 0 && ringNames.some((n) => planInset.has(n)),
  `the PLAN marks at least one of them inset, so the geometry below is classified independently of what the executor wrote (${[...planInset].map(([n, v]) => `${n}→${v}`).join(', ')})`);

/** Every way the built ring can disagree with the values the run was TOLD to resolve. Returns the
 *  complaints so both the main case and the negative control below can read the same checker.
 *
 *  TAKES THE GAP AND THE STROKE SEPARATELY, which is #801's correction to this very function. Its first
 *  form took one `wantOff` and asserted the ring's origin was `-wantOff` — a check that was independent,
 *  falsifiable, and measuring the wrong quantity. The ring draws its stroke INSIDE its own bounds, so the
 *  coordinate is `gap + stroke` while the property a designer sees is the GAP, and a checker holding one
 *  number can state the first and cannot state the second. Both are asserted below, separately, because
 *  they fail in different ways: the coordinate catches an executor that forgot the stroke, and the gap
 *  catches an offset that resolved to something that leaves no sliver at all. */
const ringProblems = (member: Node, insetOf: Map<string, string>, wantGap: number, wantStroke: number): string[] => {
  const bad: string[] = [];
  const wantCoord = wantGap + wantStroke;
  for (const [rn] of insetOf) {
    const ring = partOf(member, rn);
    if (!ring) { bad.push(`${rn}: the plan marks it inset and no such node was built`); continue; }
    if (ring.layoutPositioning !== 'ABSOLUTE') { bad.push(`${rn}: reads ${ring.layoutPositioning}, so it would take a cell in the row`); continue; }
    // #801, and the ONLY line here stated in the terms WCAG 1.4.11 is written in: how much background a
    // designer can see between the host's border and the ring. Every other check is arithmetic about the
    // coordinate, and the coordinate was never the property that mattered. Derived from the built node's
    // own origin rather than from `wantCoord`, so an executor writing the right coordinate by the wrong
    // route still has to leave a real sliver.
    const gap = -(ring.x as number) - wantStroke;
    if (!(gap > 0)) bad.push(`${rn}: the visible gap is ${gap} — the ring is drawn ${wantStroke}px inside its own bounds, so an origin of ${ring.x} puts its outer edge ${gap === 0 ? 'FLUSH AGAINST' : 'INSIDE'} the border it exists to be distinguishable from (#801)`);
    else if (gap !== wantGap) bad.push(`${rn}: the visible gap is ${gap}, and the run was told to resolve a gap of ${wantGap}`);
    if (ring.x !== -wantCoord || ring.y !== -wantCoord) bad.push(`${rn}: origin ${JSON.stringify([ring.x, ring.y])}, expected ${JSON.stringify([-wantCoord, -wantCoord])} — a gap of ${wantGap} plus the ${wantStroke}px stroke drawn inside it`);
    if ((ring.width as number) !== (member.width as number) + wantCoord * 2 || (ring.height as number) !== (member.height as number) + wantCoord * 2)
      bad.push(`${rn}: ${ring.width}x${ring.height} against a ${member.width}x${member.height} target at a coordinate of ${wantCoord}`);
    const con = ring.constraints as { horizontal?: string; vertical?: string } | null;
    if (con?.horizontal !== 'STRETCH' || con?.vertical !== 'STRETCH') bad.push(`${rn}: constraints ${JSON.stringify(con)} — it would not track a resized variant`);
  }
  return bad;
};
const ringBad = ringProblems(focusMember, planInset, SHIM_GAP, SHIM_STROKE);
ok(ringBad.length === 0, `the focus ring is absolute, at origin [-${SHIM_COORD},-${SHIM_COORD}] (a ${SHIM_GAP}px visible gap plus its own ${SHIM_STROKE}px stroke), ${SHIM_COORD}px larger on EVERY side, and STRETCHed`
  + (ringBad.length ? ` — ${ringBad.join('; ')}` : ''));

// ---- the negative control: THIS CHECKER MUST FAIL ON A FLUSH RING ---------------------------
// The assertion above is the one that reported a pass on #801, so its replacement does not get to be
// taken on trust. Build the same set with the offset resolving to 0 — the exact #801 symptom — and
// require the checker to complain. `docs/34`: the test of a gate is not that the suite goes red, it is
// that THIS check is among the failures. Here that is asserted in the suite itself rather than left to
// whoever next runs a mutation by hand.
const flushPage: Page = { children: [] };
const flush = await run(grid, { ...full(), page: flushPage, insetValue: 0 });
const flushMember = (flushPage.children[0].children as Node[]).find((m) => String(m.name) === focusName)!;
ok(flush.misses.length === 0,
  `a zero offset is reported by NOTHING — the flush run is clean at every layer below this assertion (${flush.misses.length} misses), which is why #801 needed a check of its own`);
const flushBad = ringProblems(flushMember, planInset, 0, SHIM_STROKE);
ok(flushBad.some((b) => b.includes('#801')),
  `and the ring checker CATCHES it: a flush ring is a failure, not a skipped case (${flushBad[0] ?? 'NOTHING REPORTED — the check is self-disarming again'})`);

// ---- the SECOND negative control: the defect that actually shipped -------------------------------
// A zero offset was never the live symptom. What shipped was a CORRECT offset of 2 with the ring's stroke
// unmodeled, so the executor wrote -2, the stroke was drawn back across the whole gap, and the ring
// landed flush while every number in the plan was right. That is a different mutation from `insetValue: 0`
// and the checker has to catch it too — the version of this function that took a single `wantOff` could
// not, because -2 was exactly what it expected. Reproduced by resolving the stroke width to 0, which is
// what "ignoring the stroke" means arithmetically, then asking the checker for the gap it leaves against
// the REAL 2px stroke the ring draws.
const noStrokePage: Page = { children: [] };
const noStroke = await run(grid, { ...full(), page: noStrokePage, varOverrides: { 'focus/ring/width': 0 } });
const noStrokeMember = (noStrokePage.children[0].children as Node[]).find((m) => String(m.name) === focusName)!;
ok(noStroke.misses.length === 0,
  `an unmodeled stroke is reported by NOTHING either — the run is clean at every layer (${noStroke.misses.length} misses), which is how a flush ring shipped with 0 misses and a green suite`);
const noStrokeRing = partOf(noStrokeMember, [...planInset.keys()][0])!;
ok(noStrokeRing.x === -SHIM_GAP,
  `...and it really does reproduce the shipped geometry: the ring sits at exactly -${SHIM_GAP}, the number the old assertion expected and passed on (${noStrokeRing.x})`);
const noStrokeBad = ringProblems(noStrokeMember, planInset, SHIM_GAP, SHIM_STROKE);
ok(noStrokeBad.some((b) => b.includes('#801')),
  `and the ring checker CATCHES the shipped defect: an offset of ${SHIM_GAP} that ignores the ${SHIM_STROKE}px stroke leaves no sliver (${noStrokeBad[0] ?? 'NOTHING REPORTED — the check measures the coordinate again and not the gap'})`);

// The pending spinner takes the LEADING VISUAL'S CELL when there is one, so the grid above — which fills
// that slot — exercises the in-flow branch. Assert that, then take the centered branch on a LABEL-ONLY
// set, which is the only shape that reaches it (#612).
const gridPending = memberByName.get(grid.map(planComponentName).find((n) => n.includes('state=pending'))!)!;
const gridSpinner = partOf(gridPending, 'spinner');
ok(gridSpinner !== null && gridSpinner.layoutPositioning === 'AUTO' && !gridSpinner._absolute,
  `with a leading visual present the spinner stays IN FLOW and takes that cell — no lift, no overlay (${gridSpinner?.layoutPositioning})`);

// ---- the CENTERED overlay, on the set that actually reaches it -------------------------------
// A label-only button has no cell for the spinner to take, so it goes out of flow, centered, with the
// label held open at zero opacity. Its own set because the grid above cannot express it: the slot fill
// is not a variant axis in this def, so a set mixing filled and empty slots would be one footprint
// cohort measuring two different boxes.
const labelOnly = button.states!.map((st) =>
  figmaAnatomyPlan(button, 'medium', { leading: false, trailing: false, swapTarget: SWAP, intent: 'primary', appearance: 'filled', state: st }));
const loPage: Page = { children: [] };
const lo = await run(labelOnly, { ...fullFor(labelOnly), page: loPage });
ok(lo.misses.length === 0, `the label-only set runs CLEAN${lo.misses.length ? ` — ${lo.misses.slice(0, 3).join('; ')}` : ''}`);
const loMembers = (loPage.children[0].children as Node[]);
const pending = loMembers.find((m) => String(m.name).includes('state=pending'))!;
const spin = partOf(pending, 'spinner');
const lbl = partOf(pending, 'label');
ok(spin !== null && lbl !== null, `the label-only pending variant builds both a spinner and a label (${[spin?.name, lbl?.name].join(', ')})`);
// Read back through the shim's REJECTION model: if Figma discards the lift, the spinner takes a cell and
// the button grows — the #612 defect, restored at write time only.
ok(spin!.layoutPositioning === 'ABSOLUTE'
  && JSON.stringify(spin!.constraints) === JSON.stringify({ horizontal: 'CENTER', vertical: 'CENTER' }),
  `the spinner is lifted out of the flow and CENTER-constrained on both axes — STRETCH would distort a round spinner (${JSON.stringify([spin!.layoutPositioning, spin!.constraints])})`);
// The button must measure WIDER than the spinner before the centering is asserted, or the arithmetic is
// vacuous: a corner-pin and a center coincide at 0,0 (doc 34 shape 4).
ok((pending.width as number) > (spin!.width as number),
  `the button measures wider than the spinner, so the centering below is falsifiable (${pending.width} > ${spin!.width})`);
ok(spin!.x === ((pending.width as number) - (spin!.width as number)) / 2
  && spin!.y === ((pending.height as number) - (spin!.height as number)) / 2,
  `the spinner is centered on the button's measured box, not pinned to a corner (${JSON.stringify([spin!.x, spin!.y])} in ${JSON.stringify([pending.width, pending.height])})`);
// AND IT KEEPS ITS OWN SIZE. The ring is resized to its target; this must not be, because `resize` clears
// the size binding and a spinner stretched to the button's width is not a spinner.
ok((spin!.boundVariables as Record<string, unknown>).width !== undefined && (spin!.width as number) !== (pending.width as number),
  `the spinner keeps its own bound size rather than being resized to the button (${spin!.width} vs ${pending.width})`);
// THE LABEL IS STILL BUILT, still sized, merely transparent — which is exactly what `visible:false` or a
// dropped node would NOT give, and neither would report a miss.
ok(lbl!.opacity === 0 && (lbl!.width as number) > 0,
  `the label is built at zero opacity and still MEASURES — hidden or dropped, it yields its cell and the button collapses (${JSON.stringify([lbl!.opacity, lbl!.width])})`);
ok(spin!.opacity !== 0, `the spinner itself is fully opaque — the zero applies to the part being covered, not the coverer (${spin!.opacity})`);

// ---- WHICH BOX the centering is measured on (#848) -------------------------------------------
// Everything above measures the spinner against the BUTTON'S box, and at this coordinate that is also the
// label's box — the label is the only flow child, so the two centers coincide to the pixel. Which means
// none of it can tell `absoluteCenterOn` from the old unconditional parent-centering, and deleting the
// field would leave every assertion above green (doc 34 shape 4).
//
// Button no longer REACHES an asymmetric case, because that is what #848 fixed: wherever a visual cell
// exists the spinner takes it in the flow and centers nothing. So the geometry runs on a HAND-BUILT plan —
// the label-only pending tree with a trailing visual spliced in beside the label, pushing it left of the
// container's center while the spinner still overlays it. That is the shape the live defect rendered.
const pendPlan = labelOnly.find((p) => p.coord.state === 'pending')!;
const trailingKid = (figmaAnatomyPlan(button, 'medium', { leading: false, trailing: true, swapTarget: SWAP, intent: 'primary', appearance: 'filled', state: 'rest' })
  .root.children ?? []).find((c) => c.name === 'trailingVisual')!;
const pendLabel = (pendPlan.root.children ?? []).find((c) => c.name === 'label')!;
const pendSpin = (pendPlan.root.children ?? []).find((c) => c.name === 'spinner')!;
// The absolute child stays LAST, for the z-order reason the engine's plan gate states.
const askew = { ...pendPlan, root: { ...pendPlan.root, children: [pendLabel, trailingKid, pendSpin] } };
const askewPage: Page = { children: [] };
const askewRun = await run([askew], { ...fullFor([askew]), page: askewPage });
ok(askewRun.misses.length === 0, `the asymmetric pending tree writes CLEAN${askewRun.misses.length ? ` — ${askewRun.misses.join('; ')}` : ''}`);
const askewMember = (askewPage.children[0].children as Node[])[0];
const aSpin = partOf(askewMember, 'spinner')!, aLabel = partOf(askewMember, 'label')!;
const onLabel = (aLabel.x as number) + ((aLabel.width as number) - (aSpin.width as number)) / 2;
const onParent = ((askewMember.width as number) - (aSpin.width as number)) / 2;
// THE GUARD FIRST: if the two candidate boxes agree, the assertion below is vacuous and passes against
// either implementation — which is the state the block above is in, and why this one exists.
ok(Math.abs(onLabel - onParent) > 1,
  `the two candidate boxes give DIFFERENT answers here (${onLabel} vs ${onParent}) — without that gap the assertion below cannot tell them apart`);
ok(aSpin.x === onLabel,
  `the spinner is centered on the LABEL it stands in for, not on the button — a trailing cell holds the right side, so the container's center is ${onParent - onLabel}px off the text (${aSpin.x})`);
// A NAMED BOX THAT IS NOT THERE is reported rather than silently swapped for the parent, because the
// silent swap IS the defect. Drop the label from the tree and keep the reference.
const orphan = { ...pendPlan, root: { ...pendPlan.root, children: [trailingKid, pendSpin] } };
const orphanRun = await run([orphan], fullFor([orphan]));
ok(orphanRun.misses.some((m) => /spinner\.absoluteCenterOn -> label/.test(m)),
  `an absoluteCenterOn naming a part that was not built is REPORTED — a quiet fallback to the parent is the off-center spinner this field prevents (${orphanRun.misses.join('; ')})`);

// ---- the footprint: `state` and `appearance` must NOT move the box --------------------------
// Reported as a miss by the executor, so a zero-miss run above already covers it — but assert the
// mechanism has something to measure, because a stub where every member is the same size would satisfy
// it vacuously.
const boxes = new Set(members.map((m) => `${m.width}x${m.height}`));
ok(members.every((m) => (m.width as number) > 0 && (m.height as number) > 0), `every member measures non-zero (so the footprint check is falsifiable): ${[...boxes].join(', ')}`);
ok(boxes.size === 1, `every member in the cohort measures the SAME box — border-box holds across appearance (${[...boxes].join(', ')})`);
// And that the border-box override is what makes it so: the outlined members carry a stroke.
const strokedCount = members.filter((m) => (partOf(m, String(m.name)) ?? m) && ((m.findAll as () => Node[])().concat([m])).some((n) => (n.strokes as unknown[])?.length > 0)).length;
ok(strokedCount > 0, `some members carry a stroke, so \`strokesIncludedInLayout=false\` is load-bearing here (${strokedCount})`);
ok(members.concat((members.flatMap((m) => (m.findAll as () => Node[])()))).filter((n) => (n.strokes as unknown[])?.length > 0).every((n) => n.strokesIncludedInLayout === false),
  'every stroked node is set to BORDER-BOX, so an outline variant does not measure wider than its filled sibling');

// ---- layout: no two members at one position ------------------------------------------------
const positions = new Set(members.map((m) => `${m.x},${m.y}`));
ok(positions.size === members.length, `no two members share a position (${positions.size}/${members.length} distinct)`);

// ---- IDEMPOTENCY: a designer presses the button twice ---------------------------------------
const r2 = await run(grid, { ...full(), page, hostSearches: hostFinds });
const hostInR2 = hostFinds.n - hostAfterR1;   // the second run's own host calls, by delta
ok(page.children.length === 1, `a second run appends into the SAME set rather than combining a second one beside it (${page.children.length} node on the page)`);
ok(r2.variants === 21 && r2.added === 0, `second run adds 0 and leaves 21 (added=${r2.added}, variants=${r2.variants})`);
ok(r2.misses.length === 21 && r2.misses.every((m) => m.includes('ALREADY PRESENT')),
  `every skip is REPORTED rather than silent — 21 'ALREADY PRESENT' misses and nothing else (${r2.misses.length})`);
// #483: the skips are also COUNTED, and that count is what stops the UI reading an idempotent re-run as
// 21 failures. The count and the prose must agree — a `skipped` derived from anything but the skip branch
// itself, or a branch that reports one and not the other, is the whole defect. Asserted on BOTH runs,
// because a `skipped` that is simply `variants - added` would satisfy the re-run and be wrong on the first.
ok(r2.skipped === 21, `every skip is counted, not just described (skipped=${r2.skipped})`);
ok(r1.skipped === 0, `the first run skips nothing, so the count is not just a restatement of the member total (skipped=${r1.skipped})`);
ok(r2.skipped === r2.misses.filter((m) => m.includes('ALREADY PRESENT')).length,
  'the skip COUNT and the skip PROSE agree — the UI subtracts one from the other to get real misses');
ok(r2.properties.length === r1.properties.length && r2.wiredMembers === 21,
  `re-running neither duplicates a property nor loses a reference (${r2.properties.length} props, ${r2.wiredMembers} wired members)`);
ok(JSON.stringify(r2.size) === JSON.stringify(r1.size), `the box is unchanged by a no-op re-run (${r2.size.join('x')})`);

// ---- #827: A NAME MATCH IS NOT PROOF THE MEMBER IS CORRECT ---------------------------------
// The defect: `have.has(spec.name)` cannot distinguish "already built, and still what this build plans"
// from "built by an older engine, and now wrong". Both read as `ALREADY PRESENT`, so a designer who
// re-runs after the engine moved is told the file holds what they asked for and it does not.
//
// The fix REPORTS rather than repairs, and that choice is asserted below rather than merely commented:
// rebuilding means `createComponentFromNode` + a replacement node, and an instance tracks its main
// component by ID — so an auto-rebuild silently orphans every instance a designer had already placed.
// That is a worse outcome than a stale member, so the arms here check BOTH halves: that the staleness is
// named, and that the member node is the same object afterwards.
//
// THE NAMESPACE IS HARDCODED, not imported from `persist-figma`. It is the storage contract with files
// written by earlier builds: change it and every stamp already in the wild becomes unreadable, so every
// existing set silently reports stale. Importing `NS` would make that migration invisible to this gate;
// spelling it out means the rename has to come past an assertion (docs/34 shape 16).
const STAMP_NS = 'prism3';
const STAMP_K = 'memberStamp';
const stampOf = (n: Node): string => (n.getSharedPluginData as (ns: string, k: string) => string)(STAMP_NS, STAMP_K);

// (1) THE STAMP IS WRITTEN AT BUILD TIME, on the member the next run will read. Read off the shim's own
// store rather than from anything the executor returns — a `stale` count derived from a stamp the
// executor also produced would agree with itself.
const r1Members = page.children[0].children as Node[];
const r1Stamps = r1Members.map(stampOf);
ok(r1Stamps.every((s) => s !== ''), `every member built by the first run carries a stamp (${r1Stamps.filter((s) => s === '').length} of ${r1Stamps.length} unstamped)`);
ok(new Set(r1Stamps).size === 21,
  `the 21 stamps are DISTINCT — a constant would make every member look correct against every plan (${new Set(r1Stamps).size} distinct)`);
ok(r1Stamps.every((s) => s.split('|')[0] === ENGINE_VERSION && /^[0-9a-f]{16}$/.test(s.split('|')[1] ?? '')),
  `each stamp reads '<engine version>|<64-bit plan hash>', so a human reading the panel can tell which half moved (${r1Stamps[0]})`);
// The idempotent re-run above is therefore a round-trip claim as well as a skip claim: `ALREADY PRESENT`
// is now reachable ONLY through a stamp that was written on one run and read back on the next.
ok(r2.stale === 0, `a genuinely unchanged re-run reports NOTHING stale — the false-positive direction, and the one that would make this feature useless (${r2.stale})`);

// (2) THE PERTURBED PLAN. `derived` is plan metadata a later engine legitimately rewrites; it does not
// enter `planComponentName`, which is exactly the case the name-match check is blind to.
const laterGrid = grid.map((p) => ({ ...p, derived: { ...p.derived, minTapTarget: 'moved-by-a-later-engine' } }));
// GUARD FIRST — without both of these the arms below pass against any implementation. The names must be
// IDENTICAL (otherwise this is the ordinary add-a-member path, not the stale path) and the stamps must
// have MOVED (otherwise `STALE` is unreachable and the assertion is vacuous, #969).
ok(laterGrid.map(planComponentName).join('|') === grid.map(planComponentName).join('|'),
  'the perturbed plans carry the SAME 21 member names — so what follows exercises the name match, not a fresh build');
ok(laterGrid.every((p, i) => planStamp(p) !== planStamp(grid[i])),
  `...and a DIFFERENT plan stamp on every one of them (${laterGrid.filter((p, i) => planStamp(p) !== planStamp(grid[i])).length}/21 moved)`);

const stalePage: Page = { children: [] };
await run(grid, { ...full(), page: stalePage });
const staleSet = stalePage.children[0];
const beforeNodes = [...(staleSet.children as Node[])];
const beforeStamps = beforeNodes.map(stampOf);
const rStale = await run(laterGrid, { ...fullFor(laterGrid), page: stalePage });

ok(rStale.stale === 21 && rStale.skipped === 0 && rStale.added === 0,
  `every member built from an earlier plan is counted STALE and NOT as a skip (stale=${rStale.stale}, skipped=${rStale.skipped}, added=${rStale.added})`);
ok(rStale.misses.filter((m) => m.includes('-> STALE')).length === 21 && !rStale.misses.some((m) => m.includes('ALREADY PRESENT')),
  `...and each one is NAMED, with nothing reported as already present (${rStale.misses.length} misses; ${rStale.misses[0]})`);
ok(rStale.misses.every((m) => !m.includes('-> STALE') || (/built by engine [^,]+, plan [0-9a-f]{16}/.test(m) && /this build plans [0-9a-f]{16}/.test(m))),
  'every STALE line carries BOTH hashes — the one in the file and the one this build wanted — because "stale" with no pair of values is unactionable');
// THE ORPHANING CLAIM, checked by identity rather than by count: a rebuild would replace the node, and
// every instance a designer placed points at the OLD id. Same objects, in the same order.
ok((staleSet.children as Node[]).length === 21 && (staleSet.children as Node[]).every((c, i) => c === beforeNodes[i]),
  'a stale member is left in place — the SAME node object, so no instance a designer placed is orphaned');
ok(stalePage.children.length === 1, `and no second set is combined beside it (${stalePage.children.length} node on the page)`);
// AND THE RUN DOES NOT QUIETLY RE-STAMP WHAT IT DID NOT REBUILD. Re-stamping would make the next run
// report the set clean while the file still holds the old members — the original defect, self-inflicted.
ok((staleSet.children as Node[]).map(stampOf).join('|') === beforeStamps.join('|'),
  'the stale members keep their OLD stamps — re-stamping a member this build declined to rebuild would launder the defect into a clean verdict');
// `main.ts` flips `ok` off `misses.length === skipped`, so a stale run is already not-ok with no change
// there. Stated as the property rather than trusted, since the two counts move independently.
ok(rStale.misses.length !== rStale.skipped,
  `the result is NOT-ok by main.ts's own test (misses ${rStale.misses.length} vs skipped ${rStale.skipped}) — a stale set must not reach the pill as a success`);
ok(componentHeadline(rStale.added, rStale.skipped, rStale.misses.length - rStale.skipped - rStale.stale, rStale.stale) === '⚠ 21 stale',
  `the pill says so too, rather than '✓ already built' (${componentHeadline(rStale.added, rStale.skipped, rStale.misses.length - rStale.skipped - rStale.stale, rStale.stale)})`);
const note = staleNote(rStale.stale, ENGINE_VERSION);
ok(note !== null && note.includes('orphan') && note.includes('id'),
  'and the note gives the REASON in the same clause as the remedy, so declining the rebuild does not read as the tool failing');

// (3) AN UNSTAMPED MEMBER READS AS STALE. This is not an edge case — it is every set in every file
// written before this lands, and it is also the paste-payload route, which builds members without ever
// running this executor. Reported stale rather than assumed correct: the build has no way to know what
// plan produced it, and claiming it is current is the one thing this must not do.
const oldPage: Page = { children: [] };
await run(grid, { ...full(), page: oldPage });
const oldSet = oldPage.children[0];
const unstamped = (oldSet.children as Node[])[7];
(unstamped.setSharedPluginData as (ns: string, k: string, v: string) => void)(STAMP_NS, STAMP_K, '');
ok(stampOf(unstamped) === '', 'reachable: the member really is unstamped now, so the arms below are about the empty-stamp branch');
const rOld = await run(grid, { ...full(), page: oldPage });
ok(rOld.stale === 1 && rOld.skipped === 20,
  `one unstamped member among 20 stamped ones is the ONLY one reported stale (stale=${rOld.stale}, skipped=${rOld.skipped})`);
ok(rOld.misses.some((m) => m.includes(String(unstamped.name)) && m.includes('plan unstamped')),
  `...named as unstamped rather than as a hash mismatch, because those have different remedies (${rOld.misses.find((m) => m.includes('-> STALE'))})`);

// (3b) THE ENGINE HALF IS STORED AND REPORTED, NEVER COMPARED — and this is the arm that keeps it that
// way. `ENGINE_VERSION` bumps on any behaviour change INCLUDING a pure value change (`docs/30`), so a
// comparison that read it would report all 648 members stale the day a brand's hue moved four degrees.
// Every one of them would be a false alarm, and the remedy the note gives is to delete them.
const verPage: Page = { children: [] };
await run(grid, { ...full(), page: verPage });
const verSet = verPage.children[0];
const bumped = (verSet.children as Node[])[3];
const wasStamp = stampOf(bumped);
(bumped.setSharedPluginData as (ns: string, k: string, v: string) => void)(STAMP_NS, STAMP_K, `99.99.99|${wasStamp.split('|')[1]}`);
ok(stampOf(bumped) !== wasStamp && stampOf(bumped).split('|')[1] === wasStamp.split('|')[1],
  'reachable: the member now carries a DIFFERENT engine version and the SAME plan hash — the shape a pure value bump produces');
const rVer = await run(grid, { ...full(), page: verPage });
ok(rVer.stale === 0 && rVer.skipped === 21,
  `a member stamped by a different engine build but the same PLAN is still correct — comparing the version half would flag a whole file stale on a value change (stale=${rVer.stale}, skipped=${rVer.skipped})`);

// (5) `main.ts` IS WIRED TO ALL OF THIS, gated by source text only — the same limit `applyWritePlan`'s
// suite states. `main.ts` calls `figma.showUI` at module scope so it cannot be imported, and every count
// above is inert if the panel never receives it. This cannot see a reordering that preserves textual
// order, and it is not a substitute for running the plugin in a real file.
// `mainSrc` is read at the top of this file, because `SWAP` is parsed out of it before the plans are built.
ok(/componentHeadline\([^)]*r\.stale[^)]*\)/.test(mainSrc),
  'main.ts passes the stale count to `componentHeadline`, so the pill can outrank `built N` with it');
ok(/staleNote\(r\.stale,\s*ENGINE_VERSION\)/.test(mainSrc) && /\$\{stale \? `\. \$\{stale\}` : ''\}/.test(mainSrc),
  'and appends `staleNote`\'s sentence to the summary the panel shows, rather than computing it into a void');
ok(/misses\.length - r\.skipped - r\.stale/.test(mainSrc),
  'and subtracts BOTH the skips and the stale lines before reporting real misses — they are all in `misses[]`');

// (4) THE HASH ITSELF, from the engine side — the two directions that decide whether any of the above
// means anything. Authored here against `planStamp` directly rather than through the executor.
ok(planStamp(grid[0]) === planStamp(figmaAnatomyPlan(button, 'medium', { leading: true, swapTarget: SWAP, intent: 'primary', appearance: button.variants!.appearance![0], state: button.states![0] })),
  'the same def and the same coordinate hash to the same stamp — a stamp that moved on every regeneration would report every member stale forever');
ok(new Set(grid.map(planStamp)).size === 21, `21 distinct coordinates give 21 distinct stamps (${new Set(grid.map(planStamp)).size})`);
// THE SECOND PASS CARRIES INFORMATION, rather than restating the first. What it buys is width: 32 bits over
// a 648-member set is ~209,628 pairs against 2^32, about one collision per 20,000 sets — and a collision
// reports a STALE member as CORRECT, the false-negative direction that hides the defect. 64 bits puts that
// at ~1 in 8×10^13. What can be gated is the construction, not the bound: the two halves must DIFFER, which
// they do not if both passes read the string the same way. Asserted over all 21 plans, since a single plan
// agreeing by chance is a 1-in-4-billion coincidence and 21 of them is not.
const halves = grid.map(planStamp).map((s) => [s.slice(0, 8), s.slice(8)]);
ok(halves.every(([a, b]) => a !== b),
  `the two 32-bit halves differ on every plan, so the digest is really 64 bits wide (${halves.filter(([a, b]) => a === b).length} of 21 identical)`);
ok(grid.map(planStamp).every((s) => s.length === 16),
  'and the stamp is 16 hex characters — the width the staleness comparison rests on');

// ---- DEGRADED: a file with no variables ----------------------------------------------------
// Reported, not thrown, and the set still assembles — a designer gets a structurally correct set they
// can theme, plus a list naming every variable their file is missing.
const bare = await run(grid, { comps: full().comps, page: { children: [] } });
ok(bare.variants === 21 && bare.set === 'button', `a file with no variables still assembles the whole set (${bare.variants} members)`);
ok(bare.misses.length > 0 && bare.misses.some((m) => m.includes(' -> ')), `every unresolved name is reported (${bare.misses.length} misses)`);
// The distinction that matters: a name that did not RESOLVE reports one cause, not two. A miss claiming
// Figma DISCARDED a write that was never attempted is the blind spot the `wrote[]` bookkeeping exists
// to close.
ok(!bare.misses.some((m) => m.includes('DISCARDED')),
  'an unresolved name reports its ONE true cause — never also "DISCARDED", which would name a write that was never attempted');

// ---- #1387: a DECLARED-but-UNRESOLVABLE fill NEVER leaves Figma's opaque white default ----------
// The bare run unresolves EVERY paint, which makes it the witness for the fallback the 2026-09-09
// host-truth audit found: a `container` box that DECLARES a fill whose variable is ABSENT from the file
// kept Figma's `#ffffff` opaque default — "SOLID #ffffff, opacity 1, unbound", on 324 button members.
// The set binds `interactive.<family>.overlay.{hover,pressed}` on outline/text hover/pressed
// UNCONDITIONALLY, while that wash is emitted only under `outlineInteraction: 'overlay-neutral'`; on a
// 'none'/'solid-tint' brand it is genuinely missing, so the frame stayed white. The executor now clears
// such a fill to transparent (the lever's intended clean no-change hover), so no built frame reads white.
//
// THREE GUARDS, per docs/34. (4) The SHIM MODELS THE WHITE — the axis this gate rests on — asserted
// directly first, so the negative check is not vacuous and reverting the shim default fails here. (9) A
// REACHABILITY floor proves the neutralize path ran over the exact coordinates the audit flagged. The
// invariant itself is INDEPENDENT of the executor: the white is Figma's (the shim), the neutralize is the
// subject, and the read-back is neither.
const freshFrame = makeShim({}).createFrame().fills as { type?: string; opacity?: number; color?: { r: number; g: number; b: number }; boundVariables?: { color?: unknown } }[];
ok(freshFrame.length === 1 && freshFrame[0].type === 'SOLID' && !freshFrame[0].boundVariables?.color
   && freshFrame[0].color?.r === 1 && freshFrame[0].color?.g === 1 && freshFrame[0].color?.b === 1,
  `#1387 positive control: a freshly created frame carries Figma's opaque WHITE default fill, so "no white after build" is a real check rather than a pass over an empty array (${JSON.stringify(freshFrame[0]?.color ?? null)})`);
// The audit's exact coordinates: outline/text × hover/pressed declare the overlay wash on the container
// (DEFAULT surface — F1's scope; this medium grid carries no `surface` axis). Reading the declared fill
// off the PLAN, so the floor is independent of what the executor did with it.
const overlayMembers = grid.filter((p) => /\/overlay\/(hover|pressed)$/.test((p.root as { paints?: { fills?: string } }).paints?.fills ?? ''));
ok(overlayMembers.length === 4,
  `#1387 reachable: the 4 outline/text × hover/pressed members declare the overlay wash fill the audit flagged, so the bare build exercises the neutralize path on exactly those containers (${overlayMembers.map(planComponentName).join(', ')})`);
const whitePage: Page = { children: [] };
await run(grid, { comps: full().comps, page: whitePage });
const walkNodes = (n: Node, out: Node[]): Node[] => { out.push(n); for (const c of ((n.children as Node[]) ?? [])) walkNodes(c, out); return out; };
const builtNodes = (whitePage.children as Node[]).flatMap((s) => walkNodes(s, []));
const isOpaqueWhiteLiteral = (n: Node): boolean => {
  const f = n.fills as { type?: string; opacity?: number; color?: { r: number; g: number; b: number }; boundVariables?: { color?: unknown } }[];
  if (!Array.isArray(f) || f.length === 0) return false;
  const p = f[0];
  return p?.type === 'SOLID' && !p.boundVariables?.color && (p.opacity ?? 1) === 1 && p.color?.r === 1 && p.color?.g === 1 && p.color?.b === 1;
};
const whiteLeft = builtNodes.filter(isOpaqueWhiteLiteral);
ok(whiteLeft.length === 0,
  `#1387 no built node keeps an opaque #ffffff literal where its plan DECLARED a paint it could not resolve — a declared-but-unresolvable fill neutralizes to transparent, never Figma's white default (${whiteLeft.length} white${whiteLeft.length ? `: ${[...new Set(whiteLeft.map((n) => String(n.name)))].slice(0, 4).join(', ')}` : ''})`);

// ---- #1280 / #1206: the button's icon slot, in the TWO FILE STATES A DESIGNER CAN BE IN --------
//
// This was an absence-only block, and that was the defect rather than a gap in it: `comps: []` was the
// only state it could describe, so a slot that resolved was never asserted anywhere and the wiring's
// success path had no test at all. #1012 made the present state real — `icon` materializes as separate
// top-level `icon/<glyph>` components — so both arms are now file states a designer actually produces:
//
//   PRESENT — they built `icon` first. The slot resolves to a real icon INSTANCE, the set carries an
//             INSTANCE_SWAP property so any other glyph can be swapped in, and the glyph's VECTOR takes
//             the button's `on-fill` ink. This is #1206's whole ask.
//   ABSENT  — they have not built `icon` yet. Every slot degrades to a placeholder frame and both
//             consumers say so, naming the component to build FIRST (PR-C's diagnosis).
//
// TWO ARMS, NOT ONE PLUS A COMMENT: each is the other's mutation. Deleting the icon components from the
// present arm's file must move it to the absent arm's report, and that is the pair of directions
// `docs/34` asks for on a change whose entire content is which name gets resolved.

// (0) THE NAME `main.ts` NOMINATES IS A NAME THE EMITTER PRODUCES — the one assertion in this block whose
// two sides come from different places, and the ONLY one that catches #1206 itself. `SWAP` is parsed out
// of `main.ts`; the names below come from RUNNING the `icon` def through the executor with #1012's flag on.
// Nothing derives one from the other.
//
// IT IS LOAD-BEARING ALONE, measured rather than argued: reverting `main.ts` to the pre-#1206
// `FPO-default-icon` fails THIS arm and nothing else in the suite. Everything below it stays green,
// because `fullFor` derives the shim's `comps` FROM THE PLANS — so the harness's file always holds
// whatever name is nominated, however wrong, and every "the slot resolves" arm resolves it. That
// convenience is what let the real defect ship, and this is the one line that does not share it.
const iconEmitPlans = figmaAnatomySet(componentDefs.find((d) => d.id === 'icon')!);
const iconEmitPage: Page = { children: [] };
await run(iconEmitPlans, { ...fullFor(iconEmitPlans), page: iconEmitPage }, { emitAsComponents: true });
const emittedIcons = iconEmitPage.children.map((c) => String(c.name));
ok(emittedIcons.length > 1, `#1206 reachable: the icon def really emits components to check the nomination against (${emittedIcons.length})`);
ok(emittedIcons.includes(SWAP),
  `#1206 main.ts nominates a component the engine ACTUALLY emits — '${SWAP}' is one of the ${emittedIcons.length} names an \`icon\` build writes, so the button's slot has something to resolve (${emittedIcons.slice(0, 3).join(', ')}, …)`);

// (1) PRESENT: the icon components are in the file. `fullFor` derives `comps` from the plans, so this
// file holds exactly what the plans nominate — including `SWAP`, asserted by the input pin above.
const swapPage: Page = { children: [] };
const withComp = await run(grid, { ...full(), page: swapPage });
ok(withComp.variants === 21 && !withComp.misses.some((m) => m.includes('.swapTarget ->')),
  `#1206 with the icon components present, every slot RESOLVES — no swapTarget miss on any of the ${withComp.variants} members (${withComp.misses.filter((m) => m.includes('.swapTarget ->')).join(' | ') || 'none'})`);
// AN INSTANCE, NOT A FRAME, and read off the built node rather than off the absence of a miss: the
// executor's fallback is `api.createFrame()`, so "no miss" and "a real instance" are two facts and only
// the second is what a designer sees.
//
// WHICH PART HOLDS THE SLOT IS READ OFF THE PLAN, not assumed to be `leadingVisual` — and that is a
// measurement rather than caution. At `state=pending` the leading slot is REPLACED by the `spinner`
// (#612), which is an INSTANCE_SWAP nominating the same target, so a check hard-coded to `leadingVisual`
// finds 18 of 21 and reports the pending members as missing their slot. Both parts are the same wiring
// and #1206 fixes both: the pending spinner resolves to a real icon instance too.
const swapMembers = (swapPage.children[0].children as Node[]);
const swapWalk = (n: { name?: string; type?: string; children?: unknown[] }): { name?: string; type?: string }[] =>
  [n, ...((n.children ?? []) as typeof n[]).flatMap(swapWalk)];
/** member name -> the name of the ONE part its plan builds as an INSTANCE_SWAP. */
const wantSlot = new Map(grid.map((p) => {
  const swaps = swapWalk(p.root as unknown as { children?: unknown[] }).filter((n) => n.type === 'INSTANCE_SWAP');
  return [planComponentName(p), swaps.length === 1 ? String(swaps[0].name) : `${swaps.length} SWAP PARTS`] as const;
}));
ok(wantSlot.size === 21 && ![...wantSlot.values()].some((v) => v.endsWith('SWAP PARTS')),
  `#1206 reachable: every member's plan carries exactly ONE swap part, so "the slot" is a single node per member (${[...new Set(wantSlot.values())].join(', ')})`);
ok(new Set(wantSlot.values()).size === 2 && [...wantSlot.values()].filter((v) => v === 'spinner').length === 3,
  `#1206 reachable: ...and it is NOT always \`leadingVisual\` — the 3 \`pending\` members swap the spinner into that cell instead, which is why the part is read off the plan (${[...new Set(wantSlot.values())].join(', ')})`);
const swapSlots = swapMembers.map((m) => partOf(m, wantSlot.get(String(m.name)) ?? '<no plan>')).filter((n): n is Node => n !== null);
ok(swapSlots.length === 21 && swapSlots.every((n) => n.type === 'INSTANCE'),
  `#1206 ...and that part is an INSTANCE of the nominated component on every member, not the placeholder FRAME the miss path builds (${swapSlots.length}/21, types ${[...new Set(swapSlots.map((n) => n.type))].join(', ')})`);
// THE PROPERTY, which is the half that makes the slot SWAPPABLE. Figma's `addComponentProperty` refuses an
// INSTANCE_SWAP default that is not a node id, so this can only exist once the target resolves — it is the
// consequence PR-C's property-level miss reports the loss of, asserted from the other side.
ok(withComp.properties.some((p) => p.endsWith(':INSTANCE_SWAP')),
  `#1206 ...and the set declares an INSTANCE_SWAP property, so a designer can swap any other \`icon/<glyph>\` into the slot (${withComp.properties.join(', ')})`);
// THE INK REACHES THE GLYPH (#1206's second symptom). The slot part carries `descendantFills`, which paints
// every VECTOR *inside* the instance — an empty placeholder frame has none, which is exactly the
// "no VECTOR inside this node to paint" miss the owner was seeing. A resolved instance carries the glyph.
ok(!withComp.misses.some((m) => m.includes('no VECTOR inside this node to paint')),
  `#1206 ...and no slot reports "no VECTOR inside this node to paint" — the miss an EMPTY placeholder produces (${withComp.misses.filter((m) => m.includes('no VECTOR')).slice(0, 2).join(' | ') || 'none'})`);
const slotVecs = swapSlots.map((n) => (n.findAll as (p: (x: Node) => boolean) => Node[])((x) => x.type === 'VECTOR'));
ok(slotVecs.every((vs) => vs.length === 1),
  `#1206 reachable: each resolved instance holds a glyph VECTOR for the ink to land on (${[...new Set(slotVecs.map((vs) => vs.length))].join(', ')})`);
const slotInk = [...new Set(slotVecs.map((vs) => String((vs[0].fills as { boundVariables?: { color?: { id?: string } } }[])[0]?.boundVariables?.color?.id ?? 'UNPAINTED').replace(/^V:/, '')))];
ok(slotInk.length > 0 && !slotInk.includes('UNPAINTED') && slotInk.every((v) => v.startsWith('color/')),
  `#1206 ...and that VECTOR is PAINTED with the button's icon ink, bound rather than literal — the glyph is visible on the fill instead of being an unpainted outline (${slotInk.join(', ')})`);

// (2) ABSENT: the same plans against a file with no icon components — the state a designer is in before
// they have built `icon`. Still a build, still every member, and both consumers name what to do about it.
const noComp = await run(grid, { ...full(), comps: [], page: { children: [] } });
ok(noComp.variants === 21, `a missing swap target still builds every member (as a placeholder frame) — ${noComp.variants}`);
ok(noComp.misses.some((m) => m.includes(`.swapTarget -> ${SWAP}`)), `the missing swap target is named as a miss (${SWAP})`);
// THE BUILD-ORDER CUE, which is the whole value of the absent arm now that the present arm exists: the
// designer is one build away, and the miss says which build. Matched on the target's own name inside the
// advice, per #1262 — advice that located its subject by position would bind to a neighbour's target.
ok(noComp.misses.some((m) => m.includes('.swapTarget ->') && m.includes(`build ${SWAP} FIRST`)),
  `#1206 ...and the miss names the component to build FIRST, so the absent case is a build-order cue rather than a dead end (${noComp.misses.find((m) => m.includes('.swapTarget ->')) ?? 'no swap miss'})`);
// The property line's two load-bearing facts, unchanged in substance: it names the target, and it says the
// property was not created. Matched on those two rather than on the whole sentence, so the wording can be
// improved without this pin going stale — the table below is where the wording itself is gated.
ok(noComp.misses.some((m) => m.startsWith('property ') && m.includes(`swap target ${SWAP}`) && m.includes('the property is NOT created')),
  `and the INSTANCE_SWAP property is NOT created, because Figma demands a node id it cannot supply — stated in the miss rather than left to be inferred (${noComp.misses.filter((m) => m.startsWith('property ') && m.includes('swap target')).join(' | ')})`);
ok(!noComp.properties.some((p) => p.endsWith(':INSTANCE_SWAP')), `no INSTANCE_SWAP property is left half-declared (${noComp.properties.join(', ')})`);
// EACH ARM IS THE OTHER'S MUTATION, stated as a relationship so neither can be satisfied by a shim that
// models one file state twice: removing the icon components moves the run from "no swapTarget miss and a
// declared property" to "a named miss and no property". Same plans, one difference in the file.
ok(withComp.properties.some((p) => p.endsWith(':INSTANCE_SWAP')) && !noComp.properties.some((p) => p.endsWith(':INSTANCE_SWAP'))
  && !withComp.misses.some((m) => m.includes('.swapTarget ->')) && noComp.misses.some((m) => m.includes('.swapTarget ->')),
  '#1206 the two arms DISAGREE on both facts — the swap property and the swap miss each flip with the icon components, so neither arm passes on the other\'s file');

// ---- #1280 PR-C: what the file HOLDS under a missing swap target, in the message ---------------
// The swap path had #681's defect one node type over, and had it longer: both consumers reported a bare
// name — `leadingVisual.swapTarget -> icon/FPO-default-icon`, and `... (not found; property not created)` — so
// "the slot is empty" and "the slot is not swappable" were indistinguishable in the report, which is
// exactly how the owner's button-icon symptom read.
//
// FOUR FILE STATES, the same four the nest path diagnoses, because they are a property of Figma rather
// than of what a plan wanted: `findAllWithCriteria({types:['COMPONENT']})` matches `ComponentNode` and
// never `ComponentSetNode`, so a second name-based search on the failure path is what lets the message
// name what is actually there.
//
// THE COMPONENT_SET ROW IS STILL THE ONE THAT MATTERS, and #1206's wiring is what changed the reason
// rather than removing it. The reason WAS "the engine emits `icon` as a SET, and an INSTANCE_SWAP default
// is a single node id, so a designer who published exactly what the engine built still gets a miss" —
// which #1012 settled by emitting 40 separate `icon/<glyph>` components, and the present arm above proves
// resolves. What keeps this row live is that a designer's own icon library is very often a set: one
// COMPONENT_SET named `icon/FPO-default-icon`, or a set they published over the emitted components. In
// that file the slot is a miss again, "not found" is still a lie, and the set row is still the only
// message that says what is missing — a nomination of ONE member.
//
// REACHABILITY IS ASSERTED FIRST, per docs/34: a table driven by a shim that models one file state four
// times reports four passes and gates nothing.
const withoutSwap = full().comps!.filter((c) => c !== SWAP);
const swapCases: { label: string; opts: ShimOpts }[] = [
  { label: 'nothing of that name', opts: { ...full(), comps: withoutSwap } },
  { label: 'a COMPONENT_SET', opts: { ...full(), comps: withoutSwap, fileNodes: [{ name: SWAP, type: 'COMPONENT_SET', variants: ['size=md', 'size=lg'] }] } },
  { label: 'an INSTANCE', opts: { ...full(), comps: withoutSwap, fileNodes: [{ name: SWAP, type: 'INSTANCE', main: SWAP }] } },
  { label: 'a FRAME', opts: { ...full(), comps: withoutSwap, fileNodes: [{ name: SWAP, type: 'FRAME' }] } },
];
// Asserted against the shim's own search rather than the executor's map, because the map is the subject.
for (const c of swapCases.slice(1)) {
  const api = makeShim(c.opts) as unknown as {
    root: { findAllWithCriteria: (crit: { types: string[] }) => { name: string }[]; _allNamed: (n: string) => { type: string }[] };
  };
  const held = api.root._allNamed(SWAP).map((n) => n.type);
  ok(held.length === 1, `#1280 reachable: the file holds exactly one node named ${SWAP}, ${c.label} (${held.join(', ')})`);
  ok(!api.root.findAllWithCriteria({ types: ['COMPONENT'] }).map((n) => n.name).includes(SWAP),
    `#1280 reachable: a COMPONENT search does NOT return ${SWAP} when it is ${c.label} — the lookup the swap path uses is genuinely blind to it`);
}
// And the ABSENT case really is absent, which the loop above cannot check — a `withoutSwap` that filtered
// nothing would drive row 0 against a fully resolved file and pass it as a diagnosis of nothing.
ok(full().comps!.includes(SWAP) && !withoutSwap.includes(SWAP),
  `#1280 reachable: the real plans DO nominate ${SWAP} and row 0's file genuinely lacks it (${full().comps!.length} -> ${withoutSwap.length} components)`);

const nodeSwapMiss = (misses: string[]): string | undefined => misses.find((m) => m.indexOf(`.swapTarget -> ${SWAP}`) >= 0);
const propSwapMiss = (misses: string[]): string | undefined => misses.find((m) => m.startsWith('property ') && m.indexOf(`swap target ${SWAP}`) >= 0);
const swapResults: { label: string; node: string | undefined; prop: string | undefined; built: number }[] = [];
for (const c of swapCases) {
  const r = await run(grid, { ...c.opts, page: { children: [] } });
  swapResults.push({ label: c.label, node: nodeSwapMiss(r.misses), built: r.variants });
  swapResults[swapResults.length - 1].prop = propSwapMiss(r.misses);
}
// Every case still assembles the whole set — the slot degrades to a placeholder frame, the run does not.
ok(swapResults.every((r) => r.built === 21 && r.node !== undefined && r.prop !== undefined),
  `#1280 all four file states build all 21 members and report BOTH consumers' misses (${swapResults.map((r) => r.built).join('/')})`);
// FOUR DISTINGUISHABLE MESSAGES, both consumers. Counted first, then each row checked by name — four
// distinct strings could still all be wrong, which is why the count is never the last word here.
ok(new Set(swapResults.map((r) => r.node)).size === 4 && new Set(swapResults.map((r) => r.prop)).size === 4,
  `#1280 all four file states report a DIFFERENT message on BOTH swap consumers (${new Set(swapResults.map((r) => r.node)).size}/4 node, ${new Set(swapResults.map((r) => r.prop)).size}/4 property)`);
ok(swapResults[0].node!.indexOf('not in this file') >= 0 && swapResults[0].node!.indexOf(`build ${SWAP} FIRST`) >= 0,
  `#1280 nothing of that name is a BUILD-ORDER cue naming the target inside the advice — "build ${SWAP} FIRST" (${swapResults[0].node})`);
ok(swapResults[1].node!.indexOf('COMPONENT_SET') >= 0 && swapResults[1].node!.indexOf('ONE component') >= 0,
  `#1280 the COMPONENT_SET case says so by name AND says why a set cannot fill a swap — the row a designer hits once icons are wired (${swapResults[1].node})`);
ok(swapResults[1].node!.indexOf(`Publish one member of ${SWAP}`) >= 0,
  `#1280 ...and carries an action for THAT case rather than one generic instruction (${swapResults[1].node})`);
ok(swapResults[2].node!.indexOf('INSTANCE') >= 0 && swapResults[2].node!.indexOf('main component') >= 0,
  `#1280 an INSTANCE — what duplicating a variant out of a set produces — says so and points at the main (${swapResults[2].node})`);
ok(swapResults[3].node!.indexOf('not a component') >= 0,
  `#1280 the FRAME case says the node is not a component (${swapResults[3].node})`);
// NO CASE CLAIMS ABSENCE OF A NODE THAT IS PRESENT — the half of #681's finding that made the old message
// actively misleading rather than merely thin, asserted here for the swap path.
for (const r of swapResults.slice(1))
  ok(r.node!.indexOf('not in this file') < 0 && r.prop!.indexOf('not in this file') < 0,
    `#1280 with ${r.label} named ${SWAP} in the file, neither consumer's miss claims it is "not in this file" — ${r.node}`);
// THE TWO CONSUMERS' CONSEQUENCES ARE OPPOSITE, and that is the distinction the owner could not read: a
// node-level miss leaves a box you can fill, a property-level miss leaves the slot unswappable. Same
// diagnosis, different cost, and each says which.
ok(swapResults.every((r) => r.node!.indexOf('placeholder frame') >= 0 && r.node!.indexOf('NOT created') < 0),
  '#1280 the node-level miss reports the placeholder frame, and never the property consequence');
ok(swapResults.every((r) => r.prop!.indexOf('the property is NOT created') >= 0 && r.prop!.indexOf('placeholder frame') < 0),
  `#1280 the property-level miss reports that the slot is not swappable at all, and never the placeholder (${swapResults[0].prop})`);

// ---- #1280 PR-C / #1262: each advice names ITS OWN target, not a neighbour's -------------------
// Misses render CONCATENATED — `main.ts` joins them with '; ' — so advice that locates its subject by
// position ("the component named just above") binds to whichever miss precedes it. On the nest path #1262
// found that by review; here it is reachable in a file a designer can actually produce, because one def
// can carry a leading and a trailing slot nominating DIFFERENT components. Two targets, two adjacent
// misses, and the check is that each advice's target equals its own prefix's — never a fixed name, which
// is what makes this a binding assertion rather than a spelling one.
const OTHER_SWAP = 'FPO-other-icon';
const twoSlot = button.variants!.appearance!.flatMap((ap) => button.states!.map((st) =>
  figmaAnatomyPlan(button, 'medium', { leading: true, trailing: true, swapTarget: SWAP, intent: 'primary', appearance: ap, state: st })));
/** The same plans with the TRAILING slot nominating a different component. Derived from the real plans for
 *  the reason `full()` derives its variables: a hand-built tree stops resembling the def the moment a part
 *  moves, and this block would keep passing against a shape the engine no longer emits. */
const retarget = (plans: AnatomyPlan[]): AnatomyPlan[] => {
  const walk = (n: Record<string, unknown>): Record<string, unknown> => ({
    ...n,
    ...(n.name === 'trailingVisual' && n.swapTarget ? { swapTarget: OTHER_SWAP } : {}),
    children: ((n.children ?? []) as Record<string, unknown>[]).map(walk),
  });
  return plans.map((p) => ({ ...p, root: walk(p.root as unknown as Record<string, unknown>) })) as unknown as AnatomyPlan[];
};
const twoTarget = retarget(twoSlot);
const targetsOf = (plans: AnatomyPlan[]): string[] => [...new Set(plans.flatMap((p) => {
  const walk = (n: Record<string, unknown>): string[] => [
    ...(n.swapTarget ? [String(n.swapTarget)] : []),
    ...((n.children ?? []) as Record<string, unknown>[]).flatMap(walk),
  ];
  return walk(p.root as unknown as Record<string, unknown>);
}))].sort();
// BOTH DIRECTIONS, because a `retarget` that silently did nothing would drive the whole block with one
// target, find every advice naming it, and report a vacuous pass on the exact property under test.
ok(targetsOf(twoSlot).length === 1 && targetsOf(twoSlot)[0] === SWAP,
  `#1262 reachable: the real two-slot plans nominate ONE component (${targetsOf(twoSlot).join(', ')})`);
ok(targetsOf(twoTarget).length === 2 && targetsOf(twoTarget).includes(SWAP) && targetsOf(twoTarget).includes(OTHER_SWAP),
  `#1262 reachable: the retargeted plans nominate TWO, so two misses with different subjects sit adjacent (${targetsOf(twoTarget).join(', ')})`);

const twoRun = await run(twoTarget, {
  ...fullFor(twoTarget),
  comps: fullFor(twoTarget).comps!.filter((c) => c !== SWAP && c !== OTHER_SWAP),
  page: { children: [] },
});
const swapAdvice = twoRun.misses.filter((m) => m.indexOf('.swapTarget -> ') >= 0 || (m.startsWith('property ') && m.indexOf('swap target ') >= 0));
const binding = swapAdvice.map((m) => {
  const own = /(?:\.swapTarget -> |swap target )(\S+?) \(/.exec(m)?.[1] ?? '';
  const advice = m.slice(m.indexOf('('));
  return { own, named: [SWAP, OTHER_SWAP].filter((t) => advice.indexOf(t) >= 0), m };
});
// THE HAZARD IS REAL IN THIS RUN, asserted before the property that guards it: both subjects present, and
// the render that puts them next to each other is the one `main.ts` performs.
ok(new Set(binding.map((b) => b.own)).size === 2 && twoRun.misses.join('; ').indexOf(SWAP) >= 0 && twoRun.misses.join('; ').indexOf(OTHER_SWAP) >= 0,
  `#1262 both targets miss in one run and render concatenated, which is the state positional advice binds wrong in (${[...new Set(binding.map((b) => b.own))].join(', ')})`);
ok(binding.length >= 4 && binding.every((b) => b.named.length === 1 && b.named[0] === b.own),
  `#1262 every swap advice names ITS OWN target and no neighbour's, across ${binding.length} misses on both consumers`
  + ` (${binding.filter((b) => b.named.length !== 1 || b.named[0] !== b.own).map((b) => b.m).join(' | ') || 'none mismatched'})`);
// AND BOTH CONSUMERS ARE IN THAT SET — a run whose property loop reported nothing would satisfy the
// assertion above on node misses alone, which is the shape of a check that gates half of what it claims.
ok(binding.some((b) => b.m.indexOf('.swapTarget -> ') >= 0) && binding.some((b) => b.m.startsWith('property ')),
  `#1262 ...and the set covers BOTH swap consumers, not just the node loop (${binding.filter((b) => b.m.startsWith('property ')).length} property misses)`);

// ---- DEGRADED: a stray member someone added by hand -----------------------------------------
const strayPage: Page = { children: [] };
await run(grid, { ...full(), page: strayPage });
const straySet = strayPage.children[0];
const handMade = { name: 'someone-copied-this', type: 'COMPONENT', x: 0, y: 0, width: 10, height: 10, children: [], findAll: () => [], findOne: () => null } as unknown as Node;
(straySet.children as Node[]).push(handMade);
const withStray = await run(grid, { ...full(), page: strayPage });
ok(withStray.misses.some((m) => m.includes('someone-copied-this') && m.includes('NOT A GENERATED VARIANT')),
  'a member whose name is not a generated coordinate is reported and left in place, not dragged to a guessed cell');
ok(handMade.x === 0 && handMade.y === 0, 'and it really is left where it was');

// ---- DEGRADED: a duplicate member name poisons the definitions getter -----------------------
// `combineAsVariants` accepts a duplicate silently and the set then THROWS on
// `componentPropertyDefinitions` while `addComponentProperty` keeps succeeding. The executor must report
// ONE legible cause rather than dying or burying it under a dozen consequences.
const dupPage: Page = { children: [] };
await run(grid, { ...full(), page: dupPage });
const dupSet = dupPage.children[0];
(dupSet.children as Node[]).push({ ...((dupSet.children as Node[])[0]) } as Node);
const withDup = await run(grid, { ...full(), page: dupPage });
ok(withDup.misses.some((m) => m.includes('UNREADABLE') && m.includes('share a name')),
  'a duplicate member name is reported as ONE cause naming the likely culprit, rather than throwing');
ok(withDup.properties.length === 0 && withDup.refs === 0,
  'and no properties are declared on a poisoned set, so the single cause is not buried under consequences');

// ---- #701: the wire pass REUSES what the build pass built, instead of re-finding it ----------
// The cold wire pass cost 46,375ms of a ~151s live run doing 2,592 `findOne` calls at ~18ms each, on a
// scenegraph Figma was still reconciling. The fix is to not search: `build` registers each child it makes
// and the wire loop reads that map.
//
// 2,592 = 648 members x 4 deduped ref parts. FOUR, not the three this comment said until the live run
// reported the real figure: `spinner` shares the `leadingVisual` PROPERTY but is its own PART, so it is
// its own lookup. And the ~18ms is a cold-build price only — the warm re-run searched all 2,592 in 185ms
// (~0.07ms each), so what is expensive is reconciliation, not search.
//
// WHAT THIS SUITE CAN AND CANNOT GATE, stated because the gap is the whole reason these assertions are
// counts rather than timings. It CANNOT gate the speedup: there is no scenegraph here, so `findOne` is a
// cheap array walk and the fix saves nothing measurable — a version whose map never populated would run
// identically fast and wire every reference correctly, passing every other assertion in this file. What it
// CAN gate, by value, is WHICH PATH each lookup took. That is the difference between "the references are
// right" (already covered above, and still true either way) and "the search was actually avoided".
//
// THE EXPECTED NUMBERS COME FROM THE PLANS, NOT FROM THE RESULT (docs/34): `planSetLayout` derives `refs`
// from the plan trees, so `21 × refs.length` is an independent count of the lookups a 21-member first run
// must make. Comparing against `r1.refs` instead would compare the subject with itself — and would also be
// simply wrong, which is how this shape got found. `refs` is deduped ACROSS the set (3 parts) while `r1.refs`
// counts references actually WRITTEN (42), because a third of the lookups legitimately find nothing:
// `leadingVisual` is absent on `state=pending` and `spinner` is absent on the other six states.
const refParts = planSetLayout(grid, 'test-701').refs;
const wantLookups = 21 * refParts.length;
ok(refParts.length === 3 && wantLookups === 63,
  `the fixture makes ${wantLookups} lookups — 21 members × ${refParts.length} deduped ref parts (${refParts.map((r) => r.part).join(', ')})`);
// PIN THE SPLIT, because it is what makes `refsKnownAbsent` a real category rather than a rounding error:
// 42 of the 63 find a node and 21 do not, and that 21 is a third of the cold pass's round-trips.
ok(r1.refs === 42 && wantLookups - r1.refs === 21,
  `and only ${r1.refs} of them find a node — the other ${wantLookups - r1.refs} are parts this variant does not build (the spinner off pending, the leading visual on it)`);
// THE THREE ROUTES ARE EXHAUSTIVE. Asserted as a sum against the independent total, so a route that stopped
// being counted cannot hide inside another.
ok(r1.refsRetained + r1.refsKnownAbsent + r1.refsSearched === wantLookups,
  `every lookup takes exactly one of the three routes — ${r1.refsRetained} + ${r1.refsKnownAbsent} + ${r1.refsSearched} = ${wantLookups}`);
// THE CLAIM ITSELF: on a first run the build pass built every member, so NOT ONE lookup may reach the
// scenegraph — including the ones that find nothing, which is the half a `kept ?? findOne` version would
// have sent back to the host at full cold price. Asserted as `=== 0` rather than "mostly avoided", because a
// partial rate is the signature of the map being keyed wrong for some members and would read as a pass.
ok(r1.refsSearched === 0 && r1.refsRetained === r1.refs && r1.refsKnownAbsent === wantLookups - r1.refs,
  `a cold run searches the scenegraph ZERO times — ${r1.refsRetained} nodes handed over by the build pass and ${r1.refsKnownAbsent} known absent without asking`);
// AND THE CONVERSE, which is what stops the assertion above from being satisfiable by a constant: the
// idempotent re-run builds nothing, so it has no map, retains nothing and searches everything. Both runs are
// pinned, so a `refsRetained` hard-coded to the total fails here and a `refsSearched` hard-coded to 0 does too.
ok(r2.refsRetained === 0 && r2.refsKnownAbsent === 0 && r2.refsSearched === wantLookups,
  `and a re-run that built nothing has no map to read, so all ${r2.refsSearched} lookups search — the fast route is a fact about this run, not a constant`);
// The references still land, on the same members, by the fallback route — the fallback is not a silent
// downgrade to wiring less. This is the assertion that would catch `refsKnownAbsent` swallowing a part that
// really was there: skipping a search for a node the member HAS would show up here as a lost reference.
ok(r2.refs === r1.refs && r2.wiredMembers === r1.wiredMembers,
  `both routes wire the SAME references across the SAME members (${r1.refs}/${r1.wiredMembers} retained vs ${r2.refs}/${r2.wiredMembers} searched)`);
// The read-back is what makes the retained path safe to trust, so pin that it is still SEARCHING rather
// than reading back through the reference the setter used. If `createComponentFromNode` ever stops
// preserving children, this is the check that reports it — and it can only report it while independent.
// A retained-reference read-back would assert our own variable and pass regardless.
ok(r1.misses.length === 0 && r2.misses.filter((m) => !m.includes('ALREADY PRESENT')).length === 0,
  'the independent read-back agrees with every retained-path write — no DISCARDED reference on either run');

// ---- THE HOST BOUNDARY: what Figma was ACTUALLY asked, not what the executor believes it asked -------
// EVERY ASSERTION ABOVE READS COUNTERS THE SUBJECT INCREMENTS ITSELF, and that is not enough. The three
// counters and the lookup are two independent statements inside one `if`:
//
//     if (builtFor) { node = kept;                 if (kept) refsRetained++; else refsKnownAbsent++; }
//     else          { node = member.findOne(...);  refsSearched++; }
//
// so they are free to drift apart. Changing ONLY `node = kept` to `node = member.findOne(...)` — inside the
// `builtFor` branch, every increment untouched, the map still populated and still deciding which counter
// moves — is a version of this fix that is completely INERT: it pays the full ~46s cold cost, reports
// "ZERO searches" in the live `[prism3 #701]` line, and passed every one of the 133 assertions above.
// Verified as a mutation. That is worse than an honest miss, because the counters actively vouch for a fix
// that is not happening. `docs/34`: an oracle sharing its subject cannot disagree with it.
//
// So this counts calls the HOST received. The two numbers now have independent sources — one from the
// branch the code took, one from the shim's own `findOne` — and are asserted to agree.
//
// THE READ-BACK LOOPS SEARCH BY DESIGN (deliberately, see above), so a bare total proves nothing: it
// would be satisfied by a wire loop that searched everything and a read-back that searched nothing. The
// expected figure is therefore decomposed by loop, and each term is derived from the plans rather than from
// the result: the ref read-back re-finds exactly the references it WROTE (`r1.refs`), the #1279 BINDING
// read-back re-finds each bound part it verifies (`r1.boundSearched`) — a SECOND read-back that searches
// for the same docs/34 reason, added when field bindings gained the same combine-drop repair as refs —
// and the wire loop must add nothing on a cold run. The wire-loop-zero invariant this gate exists for is
// unchanged: `refsSearched` stays 0, and the new term is a read-back cost, not a wire cost.
ok(hostAfterR1 === r1.refs + r1.refsSearched + r1.boundSearched,
  `the host received exactly ${r1.refs} ref + ${r1.boundSearched} binding subtree searches on the cold run — one per thing each read-back verifies, and NOT ONE from the wire loop (${hostAfterR1} actual vs ${r1.refs} ref read-back + ${r1.boundSearched} binding read-back + ${r1.refsSearched} reported wire)`);
// AND THE CONVERSE RUN, which is what makes the assertion above falsifiable rather than a coincidence of
// small numbers: the re-run has no map, so its wire loop really does search all 63, and the host must see
// those 63 ON TOP of the read-back's. A `refsSearched` that under-reported would fail here, not above. The
// binding read-back is scoped to members this run combined, so a warm re-run makes zero of its searches
// (`r2.boundSearched === 0`) — it rebuilt nothing, so there is nothing whose binding combine could drop.
ok(hostInR2 === r2.refs + r2.refsSearched + r2.boundSearched && r2.refsSearched === wantLookups,
  `and the searching run's ${r2.refsSearched} wire lookups all reach the host too — ${hostInR2} calls = ${r2.refs} ref read-back + ${r2.boundSearched} binding read-back + ${r2.refsSearched} wire, so the counter tracks reality in BOTH directions`);
// THE COUNTER IS NOT DEAD, stated separately because the two assertions above are equalities and an
// always-zero counter satisfies neither honestly but a reader cannot tell at a glance. If `hostSearches`
// were never threaded through `mkNode`, both sides would read 0 and the assertions would be vacuous.
ok(hostAfterR1 > 0 && hostInR2 > hostAfterR1,
  `the boundary counter is live and discriminating — ${hostAfterR1} calls on the retained run, ${hostInR2} on the searching one`);

// THE MAP'S REACH MUST EQUAL `findOne`'S REACH, and this is the assertion that makes that claim more than a
// comment. `build` registers each child from inside its PARENT's append loop, deliberately, because Figma's
// `findOne` searches descendants and excludes the node it is called on: a `propertyRef` on a member's ROOT
// is therefore unwireable today. Registering at the top of `build` instead — the obvious simplification,
// one line shorter — would put that root in the map and the retained route would start honouring a
// reference the search route silently drops. Both routes would still be self-consistent, so nothing else
// here notices; verified as a mutation, which passed the whole suite before this block existed.
//
// The real Button cannot reach it (its `container` root carries no `propertyRef`), so the fixture puts one
// there. `rootText` is then a property Figma would declare and no node would reference — an ORPHAN — and
// that miss is the observable: it must appear on BOTH routes, because "the root is not wireable" is a fact
// about Figma, not a difference between our two ways of finding a node.
const rootRef = grid.map((p) => ({ ...p, root: { ...p.root, characters: 'Root', propertyRef: { field: 'characters' as const, prop: 'rootText' } } }));
ok(planSetLayout(rootRef, 'test-701-root').refs.some((r) => r.part === String(grid[0].root.name)),
  `reachability: the fixture really does declare a reference on the member ROOT ('${grid[0].root.name}'), which the real Button does not — so the assertions below are not vacuous`);
const rootPage: Page = { children: [] };
const rr1 = await run(rootRef, { ...fullFor(rootRef), page: rootPage });
const rr2 = await run(rootRef, { ...fullFor(rootRef), page: rootPage });
const orphaned = (res: typeof rr1): boolean => res.misses.some((m) => m.includes('rootText') && m.includes('ORPHAN'));
ok(orphaned(rr1) && orphaned(rr2),
  'a reference on the member ROOT is wired by NEITHER route — the retained map registers children only, so it cannot honour what a subtree search cannot reach');
// And stated as the counts, which is where a root leaking into the map shows up directly: the root is one
// extra lookup per member that must be known-absent, never retained.
ok(rr1.refsSearched === 0 && rr1.refsRetained === r1.refsRetained && rr1.refsKnownAbsent === r1.refsKnownAbsent + 21,
  `the root accounts for exactly 21 more known-absent lookups and not one more retained (${rr1.refsRetained} retained, ${rr1.refsKnownAbsent} known absent)`);

// ---- the offline guards still fire, from this path too --------------------------------------
// `planSetLayout` throws on an incoherent set, which is the right moment to fail: before anything
// reaches the file. Asserted here because the plugin path is a second caller and a `try/catch` around
// the shared helper would silently turn a hard guard into a soft one.
const twoComponents = [grid[0], { ...grid[1], component: 'chip' }];
let threw = '';
try { await run(twoComponents, { ...full(), page: { children: [] } }); } catch (e) { threw = (e as Error).message; }
ok(threw.includes('same component'), `plans from two components are REFUSED before anything is written (${threw.slice(0, 60)}…)`);

const dupCoord = [grid[0], { ...grid[0] }];
threw = '';
try { await run(dupCoord, { ...full(), page: { children: [] } }); } catch (e) { threw = (e as Error).message; }
ok(threw.includes('share a component name'), `two plans at one coordinate are REFUSED (${threw.slice(0, 60)}…)`);

// ---- #684: the executor YIELDS, in both loops, at the boundaries it claims -------------------
// What is being gated is control flow, not responsiveness — see the note in this file's header. The
// fixture is 21 members, so a chunk of 5 gives 5 boundaries per phase (4 full + 1 partial) and the
// partial one is the case a naive `i % chunk === 0` drops.
const yPage: Page = { children: [] };
const y = await instrumented(grid, { ...full(), page: yPage }, 5);

// THE EXECUTOR HANDS CONTROL BACK, counted at the yield itself. Every other assertion in this block reads
// `progress`, which is the REPORTING cadence — and reporting is not yielding: with the yield deleted from
// `breathe` and this line absent, all of them passed. So this is the one that has to come from `yieldTo`.
ok(y.yieldCalls > 0, `the executor hands control back at all (${y.yieldCalls} yields over ${grid.length} members)`);
// AND AS OFTEN AS IT REPORTS. Equality, not `>= 1`: the pairing is what makes the cadence assertions below
// mean anything about yielding. A `breathe` that reported on every boundary and yielded once — which is a
// plausible way to write it, hoisting the yield out of the loop — satisfies `> 0` and fails here.
ok(y.yieldCalls === y.progress.length,
  `and once per report, so a boundary that reports is a boundary that yields (${y.yieldCalls} yields, ${y.progress.length} reports)`);
ok(y.yields.length > 0, `the executor yields at all (${y.yields.length} yields over ${grid.length} members)`);
// BOTH phases, and this is the assertion that would have caught the draft. #684 names the member loop;
// the reference-wiring loop walks every member with a subtree search per reference, and on an idempotent
// re-run it is essentially the whole cost. Chunking only the first would look fixed and freeze the re-run.
const buildYields = y.progress.filter((p) => p.phase === 'build');
const wireYields = y.progress.filter((p) => p.phase === 'wire');
ok(buildYields.length > 0 && wireYields.length > 0,
  `both long loops yield — building members AND wiring references (build ${buildYields.length}, wire ${wireYields.length})`);

// The boundaries are the ones a chunk of 5 over 21 implies, INCLUDING the trailing partial chunk. Written
// out rather than recomputed from the executor's own arithmetic: an expectation derived by re-running
// `(i + 1) % chunk` would agree with a broken chunker by construction (docs/34).
const wantBoundaries = ['5/21', '10/21', '15/21', '20/21', '21/21'];
ok(JSON.stringify(buildYields.map((p) => `${p.done}/${p.total}`)) === JSON.stringify(wantBoundaries),
  `build yields land on every chunk boundary and on the final partial one (${buildYields.map((p) => p.done).join(',')})`);
ok(JSON.stringify(wireYields.map((p) => `${p.done}/${p.total}`)) === JSON.stringify(wantBoundaries),
  `wire yields land on the same boundaries (${wireYields.map((p) => p.done).join(',')})`);
// Reaching the total is the property the UI depends on: the pill shows the fraction, and a loop whose last
// partial chunk is silent leaves it reading "20 of 21" under a pill that says built.
ok(buildYields[buildYields.length - 1].done === grid.length && wireYields[wireYields.length - 1].done === grid.length,
  `each phase's last report equals the total, so the fraction never stalls short (${grid.length})`);
// Monotonic WITHIN a phase. Across phases it resets, by design — which is why the phase is on the wire at
// all, and why the UI names it rather than showing a bare fraction.
const nonMonotonic = (ps: ComponentProgress[]): boolean => ps.some((p, i) => i > 0 && p.done <= ps[i - 1].done);
ok(!nonMonotonic(buildYields) && !nonMonotonic(wireYields), 'reported progress is strictly increasing within each phase');
ok(y.progress.every((p) => p.total === grid.length), `every report carries the same total, so the denominator never moves (${grid.length})`);
ok(y.progress.every((p) => typeof p.chunkMs === 'number' && p.chunkMs >= 0),
  'every report carries a non-negative chunkMs — the calibration signal, whose VALUE only a live run can judge');
// Chunking must not change the outcome. The clean-run assertions above ran at the default chunk size, so
// this compares a 5-chunk run against them: same members, same misses, same set.
ok(y.r.added === 21 && y.r.misses.length === 0 && y.r.set === 'button',
  `chunking does not change what gets built (added=${y.r.added}, misses=${y.r.misses.length}, set=${y.r.set})`);

// THE IDEMPOTENT RE-RUN YIELDS ON THE SAME BOUNDARIES. This is the case a `fresh.length`-keyed chunker
// gets wrong, and the failure is not the obvious one: `fresh.length` stays 0 through a full-skip run, so
// `0 % chunk === 0` is true on EVERY iteration — it yields 21 times and reports `0 of 21` each time.
// Measured by mutation, which is also how the direction was corrected: the guess was that it would never
// yield. Either way the fraction is a lie and the yields are unbounded, hence keying on the cell index.
const reRun = await instrumented(grid, { ...full(), page: yPage }, 5);
ok(reRun.r.added === 0 && reRun.r.skipped === 21, `the re-run skips every member (added=${reRun.r.added}, skipped=${reRun.r.skipped})`);
ok(reRun.progress.filter((p) => p.phase === 'build').length === wantBoundaries.length,
  `and still yields on every build boundary while building nothing (${reRun.progress.filter((p) => p.phase === 'build').length})`);
ok(reRun.progress.filter((p) => p.phase === 'wire').length > 0,
  `and still yields while wiring, which is where a re-run spends its time (${reRun.progress.filter((p) => p.phase === 'wire').length})`);
// Counted at the yield on the re-run too, because the re-run is the case that matters most for
// responsiveness: it skips every member and spends its whole time in the wire loop.
ok(reRun.yieldCalls === reRun.progress.length && reRun.yieldCalls > 0,
  `the re-run hands control back on every boundary as well (${reRun.yieldCalls} yields, ${reRun.progress.length} reports)`);

// ---- #684: a `chunkMs` measures ITS CHUNK, and nothing that happened before it ----------------
// THE ONE NUMBER THE LIVE 648 RUN EXISTS TO PRODUCE, and until this block no committed assertion protected
// it: the three clock re-stamps in `breathe`/the two loop heads could all be deleted with the suite green at
// 249. The reason is structural rather than an oversight — the shim is synchronous, so every `chunkMs` is 0
// and the strongest assertion available is `chunkMs >= 0`, which no clock rule can fail. A rule about WHEN a
// clock starts cannot be gated by a harness in which no clock advances. So the harness charges deliberate,
// opt-in cost to the three windows the re-stamps exclude (`ShimOpts.burn`, and `instrumented`'s
// `burnYield`), which makes the rule reachable using the very calls the source comments already name.
//
// EACH BURN GETS A POSITIVE CONTROL, and that is not belt-and-braces: "the first chunk is 0ms" also passes
// when the burn silently never happened — a renamed shim method, an `opts.burn` that stopped being threaded
// through — and then the assertion measures nothing while reading as coverage. So every case below asserts
// BOTH that the cost is excluded where the re-stamp puts it AND that this harness could see that cost at
// all. Without the paired control this whole block is the same defect it was written to fix — which it was,
// for one of the three burns, until the control loop below was derived from the burn list instead of written
// out by hand. A rule stated in a comment and applied two-thirds of the time is worth less than the comment
// implies, so the enforcement is now structural: see THE POSITIVE CONTROLS.
const BURN = 120;
const YIELD_BURN = 40;
const firstOf = (ps: ComponentProgress[], ph: string): number => ps.find((p) => p.phase === ph)!.chunkMs;

// 1. PRE-BUILD-LOOP SETUP. `planSetLayout`, three `getLocal*Async` fetches, `loadAllPagesAsync()` and a
//    document-wide `findAllWithCriteria` run before the first member is touched. Charged to the last of
//    them. Live this was measured at 121ms in chunk 1 against 1ms in its neighbours.
const burnSetupPage: Page = { children: [] };
const burnSetup = await instrumented(grid, { ...full(), page: burnSetupPage, burn: { setup: BURN } }, 5);
ok(firstOf(burnSetup.progress, 'build') < BURN / 2,
  `the first build chunk excludes the ${BURN}ms of setup that preceded the loop (${firstOf(burnSetup.progress, 'build')}ms)`);

// 2. BETWEEN THE LOOPS. `combineAsVariants`, the measured layout pass, the `resize`, the definitions read
//    and one `addComponentProperty` per property sit between the build loop's last boundary and the wire
//    loop's first. #684 does not name this loop at all, which is why the gap was here twice.
const burnCombinePage: Page = { children: [] };
const burnCombine = await instrumented(grid, { ...full(), page: burnCombinePage, burn: { combine: BURN } }, 5);
ok(firstOf(burnCombine.progress, 'wire') < BURN / 2,
  `the first wire chunk excludes the ${BURN}ms of set-level work between the loops (${firstOf(burnCombine.progress, 'wire')}ms)`);

// 3. THE YIELD ITSELF. `breathe` re-stamps AFTER awaiting, so the yield's own duration is never billed to
//    the chunk after it. Live, that time is the host doing the work yielding exists to let it do — so
//    counting it would make every chunk look worse the more politely the executor behaved, and would push
//    the calibration toward a smaller `CHUNK` for having yielded more often.
const burnYieldPage: Page = { children: [] };
const burnYield = await instrumented(grid, { ...full(), page: burnYieldPage }, 5, YIELD_BURN);
const secondBuild = burnYield.progress.filter((p) => p.phase === 'build')[1].chunkMs;
ok(secondBuild < YIELD_BURN / 2,
  `a chunk excludes the ${YIELD_BURN}ms yield that preceded it (2nd build chunk ${secondBuild}ms)`);

// THE POSITIVE CONTROLS, ONE PER BURN AND DERIVED FROM THE BURN LIST SO THERE CANNOT BE TWO OF THREE.
// Each burn is proven VISIBLE — otherwise the exclusions above are satisfied by a burn that never ran, which
// is this block's own thesis used against it. The first version of this block controlled `setup` and the
// yield and NOT `combine`, and the cost of that asymmetry was exact: neutering the one unasserted line
// (`if (opts.burn?.combine) …`) left case 2 reporting a green tick at 0ms, and with the wire re-stamp then
// also deleted the suite stayed at ALL PASS — the gate resting on an unasserted line in a shim method this
// PR edited twice. So the two shim-charged burns are controlled by MAPPING over their names rather than by
// two hand-written blocks: adding a fourth burn without a control is then a missing key, not a missing
// paragraph someone has to notice.
//
// A burn's cost is excluded from every `chunkMs` by the very re-stamp under test, so the witness is WALL
// CLOCK, measured as the DELTA against an un-burned baseline. The delta rather than a bare `>= BURN`: an
// absolute bound is also satisfiable by a slow machine, and what needs proving is that the burn is the
// difference between the two runs.
const timeRun = async (burn?: ShimOpts['burn']): Promise<number> => {
  const t0 = Date.now();
  await instrumented(grid, { ...fullFor(grid), page: { children: [] }, burn }, 5);
  return Date.now() - t0;
};
const ctlBase = await timeRun();
for (const key of ['setup', 'combine'] as const) {
  const elapsed = await timeRun({ [key]: BURN });
  ok(elapsed - ctlBase >= BURN * 0.5,
    `CONTROL: the ${key} burn really costs wall-clock this harness can measure (${elapsed}ms vs ${ctlBase}ms un-burned, +${elapsed - ctlBase}ms)`);
}
const ctlNoBurn = await instrumented(grid, { ...fullFor(grid), page: { children: [] } }, 5);
ok(ctlNoBurn.progress.length > 0 && firstOf(ctlNoBurn.progress, 'build') >= 0,
  'CONTROL: the un-burned run reports as usual, so the burn is the only difference between them');
// And the yield burn: 10 boundaries at 40ms each is ~400ms of wall clock that `chunkMs` must not have
// absorbed — so the SUM of every reported chunk stays far below the run's own duration.
const ybT0 = Date.now();
const ybRun = await instrumented(grid, { ...fullFor(grid), page: { children: [] } }, 5, YIELD_BURN);
const ybElapsed = Date.now() - ybT0;
const ybReported = ybRun.progress.reduce((a, p) => a + p.chunkMs, 0);
ok(ybElapsed >= YIELD_BURN * ybRun.yieldCalls * 0.5,
  `CONTROL: ${ybRun.yieldCalls} yields at ${YIELD_BURN}ms cost real wall-clock (${ybElapsed}ms elapsed)`);
ok(ybReported < ybElapsed / 2,
  `and the reported chunk time is a fraction of it, so yield time is excluded rather than redistributed (${ybReported}ms reported of ${ybElapsed}ms elapsed)`);

// ---- #684 follow-up: `elapsedMs` INCLUDES the yields, which is why it exists -------------------
// THE ONE TIMING FIELD THIS HARNESS CAN GATE BY VALUE. Every `chunkMs` is 0 here because the shim is
// synchronous — that is the whole reason the block above needed burns. But `elapsedMs` spans the yields, and
// the yield IS injectable, so the yield burn gives this harness a real interval to measure for once.
//
// What it protects: `elapsedMs` was added because the live run could price the chunks and not the yielding,
// while `CHUNK` dropped 24 → 4 and multiplied the yield count by six. If it were stamped from `mark` (the
// per-chunk clock) instead of `phaseStart`, it would exclude the yields exactly as `chunkMs` does — the
// field would duplicate `chunkMs`, the summary's "yields Xms" would read 0 on every run, and the term the
// next CHUNK change has to be argued against would be invisible again. Asserted per phase, because
// `phaseStart` is re-stamped at each loop head and a missing re-stamp there charges the whole build phase
// to the wire phase's first reading.
for (const ph of ['build', 'wire'] as const) {
  const ps = ybRun.progress.filter((p) => p.phase === ph);
  const last = ps[ps.length - 1];
  const sumChunks = ps.reduce((a, p) => a + p.chunkMs, 0);
  // n-1 yields inside the window: the last boundary's yield lands after its own report (see `elapsedMs`).
  const want = YIELD_BURN * (ps.length - 1) * 0.5;
  ok(last.elapsedMs - sumChunks >= want,
    `${ph}: elapsedMs spans the ${ps.length - 1} yields inside the phase that chunkMs excludes ` +
    `(${last.elapsedMs}ms elapsed − ${sumChunks}ms of chunks = ${last.elapsedMs - sumChunks}ms of yielding, ≥ ${want}ms)`);
  // MONOTONIC AND PER-PHASE. A cumulative field must never go backwards, and each phase must start its own
  // count from ~0 — if `phaseStart` were stamped once at the top of the run, the wire phase's first reading
  // would already carry the entire build phase and this would catch it.
  ok(ps.every((p, i) => i === 0 || p.elapsedMs >= ps[i - 1].elapsedMs),
    `${ph}: elapsedMs is cumulative and never decreases across the phase`);
  ok(ps[0].elapsedMs < YIELD_BURN,
    `${ph}: the phase's FIRST reading starts near zero, so the clock was re-stamped at this loop head rather than at the run's (${ps[0].elapsedMs}ms)`);
}
// The un-burned control: with a free yield, elapsed and total agree — so the assertions above are reading
// the burn and not some constant offset the executor adds regardless.
for (const ph of ['build', 'wire'] as const) {
  const ps = ctlNoBurn.progress.filter((p) => p.phase === ph);
  const last = ps[ps.length - 1];
  ok(last.elapsedMs - ps.reduce((a, p) => a + p.chunkMs, 0) < YIELD_BURN / 2,
    `CONTROL: ${ph} with a free yield shows almost no gap between elapsed and Σ chunkMs (${last.elapsedMs - ps.reduce((a, p) => a + p.chunkMs, 0)}ms)`);
}

// A run with NO options is the production call shape — it must still complete, and must yield without
// anyone passing a yield in. `realYield` is not injected here, so this genuinely goes through
// `setTimeout(0)`: proof the default path is wired, not merely that the injected one works.
const defPage: Page = { children: [] };
const defRun = await run(grid, { ...full(), page: defPage });
ok(defRun.added === 21 && defRun.misses.length === 0,
  `the no-options call shape still builds the whole set through the real setTimeout yield (added=${defRun.added})`);

// A single member is the degenerate chunk case: one boundary, at 1/1. A chunker that only fires on the
// modulo would report nothing at all here, and the pill would sit at "Building the Button set…" forever.
const onePage: Page = { children: [] };
const one = await instrumented([grid[0]], { ...fullFor([grid[0]]), page: onePage });
ok(one.progress.filter((p) => p.phase === 'build').map((p) => `${p.done}/${p.total}`).join() === '1/1',
  `a one-member set reports exactly one build boundary, at 1/1 (${one.progress.filter((p) => p.phase === 'build').map((p) => `${p.done}/${p.total}`).join() || 'none'})`);

// A chunk of 0 or a negative would make `i % chunk` NaN-or-never and silently stop all reporting; the
// executor clamps to 1. Asserted because the value comes from a caller, and the failure is invisible.
const clampPage: Page = { children: [] };
const clamped = await instrumented(grid, { ...full(), page: clampPage }, 0);
ok(clamped.progress.filter((p) => p.phase === 'build').length === grid.length,
  `a chunk size of 0 clamps to 1 rather than disabling reporting (${clamped.progress.filter((p) => p.phase === 'build').length} of ${grid.length})`);

// The default is a real number in a plausible range — a pin, not a derivation. It is deliberately loose:
// this cannot judge the value (no event loop), so it only catches a `CHUNK` left at 0, at 1, or set to
// something that would make the whole set one chunk again, which is the regression that matters.
ok(Number.isInteger(CHUNK) && CHUNK > 1 && CHUNK < 200, `CHUNK is a plausible chunk size, not the whole set (${CHUNK})`);

// =============================================================================================
// #681 — A NEST TARGET THAT *IS* IN THE FILE. FIXED: THE MISS NAMES WHAT IT FOUND.
// =============================================================================================
// The live 648-variant build reported 108 identical misses — exactly 648 / 6, every `state=focus-visible`
// member — saying `focus-ring` was "not in this file; publish the shared component first". It WAS in the
// file, as a component SET. `types: ['COMPONENT']` matches `ComponentNode` and never `ComponentSetNode`,
// so the criteria search returned the set's CHILDREN under their variant coordinates and the set's own
// name never entered the map.
//
// This had no test because the old shim ignored its criteria and returned every `comps` entry as a bare
// COMPONENT: the distinction between "absent" and "present but the wrong node type" could not exist. The
// shim now honors the criteria, which is what makes the four cases below reachable at all — and
// reachability is the point, per docs/34: a check that runs but cannot fire is reported as a pass.
//
// THE PINS BELOW WERE FLIPPED when the fix landed, which is the polarity working as designed: the fixing
// PR could not leave this file claiming the old behavior. The executor now runs a second, name-based
// search on the failure path only and reports through the shared `nestMissAdvice`.
//
// NOW DECIDED, and this is what changed under these assertions (#681's consumer side). A part declaring
// `nesting: nest-fixed` names a variant COORDINATE, `component-schema.ts` carries it, the plan projects it
// as `nestVariant`, and both executors resolve it to a MEMBER of the set and nest that. So a set is no
// longer a dead end — which means the four-way table below no longer reaches its own COMPONENT_SET row
// through these plans: `button`'s ring part names `surface=default`, so a file holding a set gets RESOLVED
// (or gets the fifth miss) and never the "found a COMPONENT_SET" sentence.
//
// The row is still reachable, and still worth gating, for the case that is now its only one: a plan that
// carried NO coordinate at all. Since #1330 even a `nest-exposed` part projects a default coordinate (plus
// `nestExpose`), so this is the DEFENSIVE miss path for a coordinate-free plan, not what any real def
// emits. So the table below is driven by plans with the coordinate STRIPPED, and the resolution cases get
// their own block after it. Two blocks rather than one widened one, because they are two different
// questions: what the message says when the plan chose nothing, and what gets built when it chose.
//
// WHAT DID NOT CHANGE: nothing is nested by guess. The fifth miss drops the ring exactly as these four do.

const NEST = 'focus-ring';
const withoutRing = full().comps!.filter((c) => c !== NEST);

/**
 * The same plans with every `nestVariant` REMOVED — a coordinate-free plan (the defensive miss path).
 *
 * Derived from the real plans rather than hand-built for the reason `full()` derives its variables: a
 * hand-built tree stops resembling the def the moment a part changes, and this block would keep passing
 * against a shape the engine no longer emits. Stripping models the one difference that matters here — a
 * plan that names no nested coordinate at all. (Since #1330 both `nest-fixed` and `nest-exposed` DO carry
 * a `nestVariant`, so no real def produces this; it is the defensive path a malformed plan would hit.)
 */
const withoutCoordinate = (plans: AnatomyPlan[]): AnatomyPlan[] => {
  const strip = (n: Record<string, unknown>): Record<string, unknown> => {
    const { nestVariant: _dropped, ...rest } = n as { nestVariant?: unknown };
    return { ...rest, children: ((n.children ?? []) as Record<string, unknown>[]).map(strip) };
  };
  return plans.map((p) => ({ ...p, root: strip(p.root as unknown as Record<string, unknown>) })) as unknown as AnatomyPlan[];
};
const gridNoCoord = withoutCoordinate(grid);

/** The four files, differing ONLY in what they hold under the name `focus-ring`. */
const nestCases: { label: string; opts: ShimOpts }[] = [
  { label: 'nothing of that name', opts: { ...full(), comps: withoutRing } },
  { label: 'a COMPONENT_SET', opts: { ...full(), comps: withoutRing, fileNodes: [{ name: NEST, type: 'COMPONENT_SET', variants: ['state=default', 'state=error'] }] } },
  { label: 'an INSTANCE', opts: { ...full(), comps: withoutRing, fileNodes: [{ name: NEST, type: 'INSTANCE', main: NEST }] } },
  { label: 'a FRAME', opts: { ...full(), comps: withoutRing, fileNodes: [{ name: NEST, type: 'FRAME' }] } },
];

// ---- REACHABILITY FIRST: the shim really models each file, or every pin below is vacuous -------
// Asserted against the shim's OWN search, because the executor's map is what is under test — reading
// the map back would be reading the subject.
for (const c of nestCases.slice(1)) {
  const api = makeShim(c.opts) as unknown as {
    root: { findAllWithCriteria: (crit: { types: string[] }) => { name: string }[]; _allNamed: (n: string) => { type: string }[] };
  };
  const held = api.root._allNamed(NEST).map((n) => n.type);
  ok(held.length === 1, `#681 reachable: the file holds exactly one node named ${NEST}, ${c.label} (${held.join(', ')})`);
  const searched = api.root.findAllWithCriteria({ types: ['COMPONENT'] }).map((n) => n.name);
  ok(!searched.includes(NEST),
    `#681 reachable: a COMPONENT search does NOT return ${NEST} when it is ${c.label} — the lookup is genuinely blind to it (${searched.filter((n) => n.indexOf('state=') === 0 || n === NEST).join(', ') || 'nothing of that name'})`);
}
// And the COMPONENT_SET case specifically returns the MEMBERS, which is the misleading part live: the
// search comes back non-empty, just never under the name asked for.
const setApi = makeShim(nestCases[1].opts) as unknown as { root: { findAllWithCriteria: (c: { types: string[] }) => { name: string }[] } };
const setSearched = setApi.root.findAllWithCriteria({ types: ['COMPONENT'] }).map((n) => n.name);
ok(setSearched.includes('state=default') && setSearched.includes('state=error'),
  `#681 reachable: the set's MEMBERS come back under their variant coordinates (${setSearched.filter((n) => n.indexOf('state=') === 0).join(', ')})`);

// And the STRIPPER really stripped — asserted in both directions, because a `withoutCoordinate` that
// silently did nothing would drive this whole table with `nest-fixed` plans, resolve the set, and report
// four vacuous passes. The positive half is what makes the negative half mean something: the real plans
// DO carry a coordinate, so its absence below is this function's work and not the def's.
const coordCount = (plans: AnatomyPlan[]): number => {
  const walk = (n: Record<string, unknown>): number =>
    (n.nestVariant ? 1 : 0) + ((n.children ?? []) as Record<string, unknown>[]).reduce((a, k) => a + walk(k), 0);
  return plans.reduce((a, p) => a + walk(p.root as unknown as Record<string, unknown>), 0);
};
ok(coordCount(grid) > 0, `#681 reachable: the real plans DO project a nestVariant coordinate (${coordCount(grid)} parts)`);
ok(coordCount(gridNoCoord) === 0, `#681 reachable: the stripped plans project NONE — the four-way table below is really driven by a coordinate-free plan, the defensive miss path (${coordCount(gridNoCoord)})`);

// ---- the four runs, and the miss each one reports ---------------------------------------------
const nestMiss = (misses: string[]): string | undefined => misses.find((m) => m.indexOf(`nestTarget -> ${NEST}`) >= 0);
const nestResults: { label: string; miss: string | undefined; built: number }[] = [];
for (const c of nestCases) {
  const r = await run(gridNoCoord, { ...c.opts, page: { children: [] } });
  nestResults.push({ label: c.label, miss: nestMiss(r.misses), built: r.variants });
}
// The ABSENT case was the one row of #681's table the old message got right, so it was a positive
// assertion before the fix and is UNCHANGED by it — which is the point of having written it that way:
// it is the regression guard on the fix, not a claim the fix delivers.
ok(nestResults[0].miss !== undefined && nestResults[0].miss!.indexOf('not in this file') >= 0,
  `#681 with nothing of that name, the original message survived the fix verbatim (${nestResults[0].miss})`);
// #1226 PR-A item 4 — the ABSENT miss is a BUILD-ORDER cue, not a bare failure. This is the failure a
// designer hits building composed components one at a time (the plugin builds one def per run): they built
// the consumer before its nested target existed. The advice NAMES the target INSIDE ITSELF (`build NEST
// FIRST`), not just in the `-> ${NEST}` prefix — pinned by position because the #1262 review found the old
// "build the component named just above" bound to a NEIGHBOUR's target once misses render concatenated
// (`main.ts` join('; ')). This assertion fails on "just above" (no target name in the advice).
ok(nestResults[0].miss!.indexOf(`build ${NEST} FIRST`) >= 0 && /build .*first/i.test(nestResults[0].miss!),
  `#1226 the ABSENT advice names the nested target inside itself — "build ${NEST} FIRST" — a dependency cue self-contained in the advice, not borrowed from the prefix (${nestResults[0].miss})`);
// Every case still BUILDS its whole set — the ring is dropped, not the run. True before the fix and after.
ok(nestResults.every((r) => r.built === 21), `#681 every case still assembles all 21 members (${nestResults.map((r) => r.built).join('/')})`);

// FLIPPED (was two pins per case): a node PRESENT at the wrong type is no longer described as absent, and
// no longer told to publish a library it already has.
for (const r of nestResults.slice(1)) {
  ok(r.miss !== undefined && r.miss.indexOf('not in this file') < 0,
    `#681 with ${r.label} named ${NEST} in the file, the miss no longer claims it is "not in this file" — ${r.miss}`);
  ok(r.miss !== undefined && r.miss.indexOf('publish the shared component first') < 0,
    `#681 ...and no longer advises publishing a library, which is irrelevant when the node is present at the wrong type (${r.label})`);
}
// FLIPPED, and this is the expensive half: four file states, four DISTINGUISHABLE messages. Was pinned at
// `size === 1` — one string carrying no information a designer could act on.
ok(new Set(nestResults.map((r) => r.miss)).size === 4, '#681'
  + ` all four file states report a DIFFERENT message, so the miss names what was actually found (${new Set(nestResults.map((r) => r.miss)).size}/4 distinct)`);
// Each message names the node type it found, checked one at a time rather than by counting distinctness —
// four distinct strings could still all be wrong.
ok(nestResults[1].miss!.indexOf('COMPONENT_SET') >= 0, `#681 the COMPONENT_SET case says so by name — ${nestResults[1].miss}`);
ok(nestResults[2].miss!.indexOf('INSTANCE') >= 0, `#681 the INSTANCE case says so by name — ${nestResults[2].miss}`);
ok(nestResults[3].miss!.indexOf('not a component') >= 0, `#681 the FRAME case says it is not a component — ${nestResults[3].miss}`);
// FLIPPED. The INSTANCE row had its own pin because duplicating a variant out of a set is the obvious
// manual workaround for the COMPONENT_SET case, so a designer following the old advice landed exactly
// here — and got told the node they had just made did not exist.
ok(nestResults[2].miss !== nestResults[0].miss,
  '#681 an INSTANCE — what duplicating a variant out of a set produces — is now distinguishable from nothing at all');
// And the ADVICE differs, not merely the diagnosis: the set case points at nesting a variant, the instance
// case at nesting the main. A message that named the type but gave one generic instruction would pass
// every assertion above.
// The SET's advice moved when resolution landed (#681): it used to say "nest a specific variant", which
// was advice about a capability that did not exist. Reaching this row now means the def named no
// coordinate, so the action is to name one — or to publish a single variant as its own component.
ok(nestResults[1].miss!.indexOf('nest-fixed') >= 0 && nestResults[2].miss!.indexOf('main component') >= 0,
  `#681 each case carries the action for THAT case, not one generic instruction — set: ${nestResults[1].miss}`);
// THE POLICY BOUNDARY, asserted: diagnosis only. Every case still drops the ring rather than guessing a
// variant to nest, because a wrong ring that builds looks like success. This is what must not change
// without the owner's decision on #681.
ok(nestResults.slice(1).every((r) => r.built === 21 && r.miss !== undefined),
  '#681 no case silently nests a substitute — each reports and drops the ring, which is the policy #681 leaves to the owner');

// ---- #681 RESOLUTION: the def named a coordinate, so a MEMBER gets nested -----------------------
// The other half of #681, and the half the four cases above cannot reach. `button`'s ring part declares
// `nesting: { kind: 'nest-fixed', variant: { surface: 'default' }, follow: ['surface'] } }`, the plan projects that as
// `nestVariant`, and this executor resolves it against the set's members instead of reporting.
//
// Driven by `grid` — the REAL plans, coordinate included — where the table above needed `gridNoCoord`.
// Both fixtures exist for that reason: one file state means two different things depending on whether the
// def chose, and one plan cannot exercise both readings.
//
// Gated here AND on the paste path in `packages/engine/test.ts` because the two executors reach the same
// behavior by different mechanisms — this one imports `nestVariantMatch`, the payload interpolates its
// SOURCE and calls it in the file. A single gate could pass while the other path was silently wrong.
const ringSetRun = async (variants: string[]) => {
  const page: Page = { children: [] };
  const r = await run(grid, {
    ...full(), comps: withoutRing,
    fileNodes: [{ name: NEST, type: 'COMPONENT_SET', variants }], page,
  });
  return {
    miss: r.misses.find((m) => m.indexOf('focusRing.nest') >= 0),
    built: r.variants,
    // Whether ring nodes exist in what was actually BUILT — the only evidence a member was instantiated.
    // An empty `misses` proves nothing on its own: an executor that silently skipped the ring reports
    // nothing either, which is exactly the difference between resolution and a quiet drop.
    //
    // Walked to full depth rather than one level down, because the page holds the SET, the set holds the
    // members, and the ring is a child of a member — three levels. A one-level scan reads 0 on a correct
    // run, and measured that way this assertion failed against a working executor.
    rings: ((): number => {
      const walk = (n: { name?: string; children?: unknown[] }): number =>
        (n.name === 'focusRing' ? 1 : 0)
        + ((n.children ?? []) as { name?: string; children?: unknown[] }[]).reduce((a, k) => a + walk(k), 0);
      return (page.children as unknown as { name?: string; children?: unknown[] }[]).reduce((a, c) => a + walk(c), 0);
    })(),
  };
};

// THE SUCCESS CASE. The set carries `surface=default`, so the member is nested and no miss is reported.
const resolvedRun = await ringSetRun(['surface=default', 'surface=inverse']);
ok(resolvedRun.miss === undefined && resolvedRun.rings > 0 && resolvedRun.built === 21,
  `#681 a coordinate the set CARRIES resolves, and the member is nested — ${resolvedRun.rings} ring nodes built, no miss (${resolvedRun.miss ?? 'none'})`);

// THE FIFTH MISS, wrong coordinate. Members exist and none carries `surface=default`; the tempting behavior
// is to nest the first child, which is #656. Nothing is built, and the message names the coordinate AND
// the members — a rename in the file and a typo in the def produce the same lookup failure and different
// fixes, so a message carrying only one of the two is unactionable.
const wrongRun = await ringSetRun(['surface=brand', 'surface=inverse']);
ok(wrongRun.miss !== undefined && wrongRun.miss.indexOf('no member matching surface=default') >= 0
  && wrongRun.miss.indexOf('surface=brand') >= 0 && wrongRun.rings === 0 && wrongRun.built === 21,
  `#681 a coordinate the set does NOT carry reports the fifth miss, names the coordinate and the members, and nests nothing (${wrongRun.miss})`);

// THE FIFTH MISS, UNDER-SPECIFIED. `{surface:'default'}` against a surface×size set would match two members,
// and every rule for choosing between them reduces to creation order — #656 one layer in from where
// `nesting` was added to stop it. Refused rather than resolved, and the printed members are what show the
// designer which axis the def forgot.
const ambiguousRun = await ringSetRun(['surface=default, size=md', 'surface=default, size=lg']);
ok(ambiguousRun.miss !== undefined && ambiguousRun.miss.indexOf('no member matching surface=default') >= 0
  && ambiguousRun.miss.indexOf('size=lg') >= 0 && ambiguousRun.rings === 0,
  `#681 an UNDER-SPECIFIED coordinate is refused rather than resolved by creation order, and the members show the missing axis (${ambiguousRun.miss})`);

// AND THE FIFTH MISS IS A DIFFERENT SENTENCE from the four above — it diagnoses the DEF where they
// diagnose the FILE, and the remedy points the opposite way (edit the coordinate, not the document). One
// message covering both would be the state #681 started in, at a different address.
ok(wrongRun.miss !== nestResults[1].miss && (wrongRun.miss ?? '').indexOf('nestVariant ->') >= 0,
  '#681 the fifth miss is distinguishable from the four file-state messages, and is reported against nestVariant rather than nestTarget');

// =============================================================================================
// #1299 — A NEST'S BOUND HEIGHT REACHES THE NODE, not just the plan
// =============================================================================================
// The engine's own suite asserts the PLAN carries `bound.height` on a `nest`. That is half the claim: a
// projected binding the executor never applies is the same silent loss one layer out, and this lane is
// where that direction is observable. Asserted HERE rather than inferred from the executor's source,
// because "the bind loop looks generic" is a reading of code and this is a read-back off a built node.
//
// No shipped def authors `height` on a nest yet (#1226's composed consumers are the first), so the plan is
// built from a PATCHED def — which is exactly why the read-back matters: nothing else in this file would
// exercise a dimension binding on an INSTANCE. A Figma instance accepts one (it can be resized), but that
// is a claim about the host, and the shim is where this repo states its model of the host.
{
  const tallDef: ComponentDef = (() => {
    const a = JSON.parse(JSON.stringify(button.anatomy!)) as typeof button.anatomy;
    return { ...button, anatomy: { ...a!, parts: { ...a!.parts, focusRing: { ...a!.parts.focusRing, kind: 'nest', inset: undefined, strokeInset: undefined, when: undefined, height: 'size.{size}.height' } as typeof a.parts.focusRing } } };
  })();
  const tallPlans = [figmaAnatomyPlan(tallDef, 'medium', { swapTarget: SWAP, appearance: 'filled', surface: 'default' })];
  const wantVar = tallPlans[0] && (() => {
    const walk = (n: { name?: string; bound?: Record<string, string>; children?: unknown[] }): string | undefined =>
      n.name === 'focusRing' ? n.bound?.height : ((n.children ?? []) as typeof n[]).map(walk).find(Boolean);
    return walk(tallPlans[0].root as unknown as { name?: string; bound?: Record<string, string>; children?: unknown[] });
  })();
  // THE PLAN FIRST, because every assertion below is vacuous if the projection carries no binding — the
  // same discipline as this file's opening pins. And the variable name comes off the plan rather than being
  // typed here, so a rung rename moves the expectation with it.
  ok(wantVar !== undefined, `#1299 reachable: the patched def PROJECTS a height binding on the nest (${String(wantVar)})`);
  const tallPage: Page = { children: [] };
  const tallRun = await run(tallPlans, { ...fullFor(tallPlans), page: tallPage });
  // Its own walker rather than this file's `allNodes`, which is declared further down and so is in its
  // temporal dead zone here — a reference would throw at load rather than fail an assertion.
  const flat = (n: Node): Node[] => [n, ...(((n.children as Node[]) ?? []).flatMap(flat))];
  const tallNodes = tallPage.children.flatMap(flat);
  const ringNode = tallNodes.find((n) => n.name === 'focusRing');
  ok(ringNode !== undefined && ringNode.type === 'INSTANCE',
    `#1299 the nest built as an INSTANCE (${ringNode?.type ?? 'NOT BUILT'})`);
  const ringBv = (ringNode?.boundVariables as Record<string, { id?: string }> | undefined) ?? {};
  ok(String(ringBv.height?.id ?? '').replace(/^V:/, '') === wantVar,
    `#1299 ...and Figma's \`height\` on that instance is bound to the variable the plan named (${String(ringBv.height?.id ?? 'UNBOUND')} — expected ${wantVar})`);
  // NO MISS, which is the other half of "the executor applied it": the bind loop reports an unresolved
  // NAME and a binding Figma accepted and discarded through the same channel, so a clean `misses` plus a
  // present binding is the pair that means it landed.
  ok(tallRun.misses.filter((m) => m.indexOf('focusRing.height') >= 0).length === 0,
    `#1299 ...with no miss against it — neither unresolved nor DISCARDED (${tallRun.misses.filter((m) => m.indexOf('focusRing') >= 0).join(' | ') || 'none'})`);
}

// =============================================================================================
// #680 — FIGMA'S FONT-LOADED STATE, NOW MODELLED. The components lane already loads; it does not degrade.
// =============================================================================================
// The live failure was in `write-figma.ts` (the variable writer, which loads no fonts at all) — see
// `test-write.ts` for the reproduction at the site of the defect. What the shim's new font state buys
// HERE is different and worth having on its own: this lane's `loadFontAsync` call and the `catch` around
// it were both unfalsifiable while the shim's load was an unconditional no-op.

// The POSITIVE half, now reachable: the style's font is loaded BEFORE the style is applied. `r1` above
// ran clean against a shim that throws from `setTextStyleIdAsync` on an unloaded font, so deleting the
// load call now fails the fully-resolved run instead of passing it. Stated explicitly because "some
// other assertion happens to cover it" is not a gate anyone can find later.
const fontPage: Page = { children: [] };
const loadedRun = await run(grid, { ...full(), page: fontPage });
ok(loadedRun.misses.length === 0 && loadedRun.variants === 21,
  `#680 the style's own font is loaded before the style is applied — an unloaded font now THROWS from setTextStyleIdAsync (${loadedRun.misses.length} misses)`);
ok(!loadedRun.misses.some((m) => m.indexOf('.font ->') >= 0), '#680 ...and nothing was reported as unloadable when every font is available');

// The OTHER failure mode: a font that is not INSTALLED. Figma fails that at the load call, and this lane
// catches it and reports a miss — then applies the style anyway, which throws, and nothing catches THAT.
const missingFont: FontName = { family: 'Clash Display', style: 'Semi Bold' };
let unavailThrew = '';
let unavailMisses: string[] = [];
try {
  const r = await run(grid, { ...full(), page: { children: [] }, styleFont: missingFont, unavailableFonts: [missingFont] });
  unavailMisses = r.misses;
} catch (e) { unavailThrew = (e as Error).message; }
// The load failure IS reported — the `catch` at write-components.ts:296 works, and is now exercised.
// (Only reachable when the run survives to return; pinned below is the case where it does not.)
pinned(unavailThrew.indexOf('unloaded font') >= 0, '#680',
  `a brand whose typeface is not installed loses the WHOLE component build rather than degrading — the load miss is reported, then the style is applied anyway and the throw escapes (${unavailThrew.slice(0, 80)}…)`);
ok(unavailMisses.length === 0, '#680 (bookkeeping) the unavailable-font run returned nothing, because it threw — see the pin above');
// #680's stated posture is `write-text-styles`': report what was skipped, write everything else. That is
// what the fix must give this lane too, and this is the assertion that will invert.

// =============================================================================================
// #682 — THE DEPRECATED PROPORTION LOCK, MIGRATED TO `unlockAspectRatio()`
// =============================================================================================
// Figma's typings mark `constrainProportions` `@deprecated` in favour of `targetAspectRatio` /
// `lockAspectRatio` / `unlockAspectRatio`. The migration is mechanical, but the thing it must not break
// is subtle, so it is asserted three ways rather than one.
//
// Reachability first, and it is the whole reason these assertions can fail: the shim's nodes now START
// aspect-LOCKED, and while locked `setBoundVariable` EVICTS the opposite dimension — the silent
// last-write-wins the unlock exists to prevent. A shim whose nodes started unlocked would pass these
// whether the executor called anything or not.
const unlockPage: Page = { children: [] };
const unlockRun = await run(grid, { ...full(), page: unlockPage });
const allNodes = (n: Node): Node[] => [n, ...(((n.children as Node[]) ?? []).flatMap(allNodes))];
const built = unlockPage.children.flatMap(allNodes);
ok(built.length > 0, `#682 reachable: the run produced nodes to inspect (${built.length})`);

// 1. THE CALL HAPPENS, on every node `build()` produces. `?.()` at the call site means an absent port
//    method skips in silence, so a call COUNT is the only thing that distinguishes "unlocked" from
//    "never asked".
//
//    Scoped to built nodes, and the exclusion is stated rather than silent: the COMPONENT_SET itself is
//    created by `combineAsVariants`, never passes through `build()`, and so is never unlocked. That is
//    correct and not an oversight — the set is `resize()`d and binds NO dimension variable, so it has no
//    second binding to evict. `every built node` was the first form of this assertion and it failed
//    66/67 on exactly that node, which is how the distinction got established instead of assumed.
const buildable = built.filter((n) => n.type !== 'COMPONENT_SET');
ok(buildable.length === built.length - 1,
  `#682 reachable: exactly one node is not build()-produced — the set (${built.length - buildable.length})`);
const unlocked = buildable.filter((n) => (n._unlocks as number) > 0);
ok(unlocked.length === buildable.length,
  `#682 every built node had unlockAspectRatio() called on it (${unlocked.length}/${buildable.length}) — counted, because the call site is optional-chained`);
ok(buildable.every((n) => n._aspectLocked === false), '#682 ...and every one ended up actually unlocked, not merely called');
// The set keeps its lock, and that is safe ONLY while it binds no dimensions. Asserted, so the day
// something binds a dimension on the set this fails rather than silently losing one.
const setNodes = built.filter((n) => n.type === 'COMPONENT_SET');
ok(setNodes.every((n) => {
  const bv = (n.boundVariables as Record<string, unknown>) ?? {};
  return !bv.width && !bv.height;
}), '#682 the un-unlocked set binds no dimension variable, which is what makes leaving it locked harmless');

// 2. IT PRECEDED THE BINDINGS — the ordering claim, checked through its CONSEQUENCE rather than a
//    timestamp: a slot binds width AND height to the same square-artboard variable, and both survive
//    only if the unlock came first. This is the assertion that fails if the unlock is moved after the
//    binds, which a call count alone would not catch.
const slots = built.filter((n) => {
  const bv = n.boundVariables as Record<string, unknown>;
  return bv && (bv.width || bv.height);
});
ok(slots.length > 0, `#682 reachable: some node binds a dimension at all (${slots.length})`);
const bothAxes = slots.filter((n) => {
  const bv = n.boundVariables as Record<string, unknown>;
  return bv.width && bv.height;
});
ok(bothAxes.length > 0,
  `#682 a node holds BOTH dimension bindings at once (${bothAxes.length}/${slots.length}) — while locked, the second bind evicts the first, so this is the unlock's real effect`);
// ...AND THE SHIM'S LOCK REALLY EVICTS — the negative control for the assertion above, read off the shim
// directly rather than through the executor. Without it, `bothAxes` passes both when the executor unlocked
// and when the shim never locked at all: mutating `_aspectLocked: true` to `false` in `mkNode` left both
// suites 100% green, which is the docs/34 shape — a check that runs but cannot fire. Re-engaging the lock
// on an already-built node and driving it by hand is the one probe that tells those two worlds apart.
// A node straight from the shim's own factory, NOT one the executor touched — so it reports the state a
// node STARTS in, which is the half of the model M8 breaks and re-locking an existing node cannot see.
const fresh = (makeShim({}) as unknown as { createFrame(): Node }).createFrame();
ok(fresh._aspectLocked === true, '#682 reachable: a fresh shim node starts aspect-LOCKED');
(fresh as unknown as { setBoundVariable(p: string, v: { id: string; value?: number }): void })
  .setBoundVariable('width', { id: 'V:control', value: 10 });
(fresh as unknown as { setBoundVariable(p: string, v: { id: string; value?: number }): void })
  .setBoundVariable('height', { id: 'V:control', value: 10 });
const ctlBv = fresh.boundVariables as Record<string, unknown>;
ok(!!ctlBv.height && !ctlBv.width,
  '#682 reachable: ...and while locked it really evicts the opposite axis — so the both-axes claim above is about the unlock, not about a shim that never locked');

// 3. THE DEPRECATED PROPERTY IS GONE, not merely joined by the new call. Without this the migration
//    would pass on an executor that set both and left the old one doing the work.
ok(!built.some((n) => 'constrainProportions' in n),
  '#682 no node carries constrainProportions any more — the deprecated setter is gone, not shadowed');
ok(unlockRun.misses.length === 0 && unlockRun.variants === 21,
  `#682 ...and the migrated build is still clean (${unlockRun.variants} members, ${unlockRun.misses.length} misses)`);

// ---- #804: the action builds a def the CALLER names, and a small one executes ---------------------
//
// WHAT THIS CANNOT COVER, STATED FIRST. `buildComponents` reads the `figma` global, so the dispatch
// itself (`msg.def` → def → plans) is not reachable from this harness. What IS reachable is the pair of
// claims the change actually rests on, and they are the pair worth having independently: that a def
// resolves from an id the way the main thread resolves it, and that the executor produces a correct set
// for a def two orders of magnitude smaller than Button. The wiring between them is verified by the live
// run, same standing limit as the chunking above.
//
// FIELD-LABEL SPECIFICALLY, because 4 members is the case Button's 648 hid: every count in this harness
// is a multiple of 21, and an executor bug that only appears when a set has fewer members than a chunk
// (`CHUNK = 4`) would pass every assertion above.
const byId = (id: string): ComponentDef | undefined => componentDefs.find((d) => d.id === id);
ok(byId('field-label') === fieldLabel && byId('button') === button,
  '#804 a def resolves from its id through `componentDefs` — the same lookup the main thread does');
ok(byId('feild-label') === undefined,
  '#804 ...and a misspelled id resolves to nothing rather than to a neighbouring def, which is what makes the failed result reachable');
// EVERY def the picker offers, not just the one being materialized: the UI derives its list by calling
// `figmaAnatomySet` and keeping what does not throw, so an id it offers that this cannot project would be
// a disagreement between the two sides that the designer sees as a build that fails.
const offerable = componentDefs.filter((d) => { try { figmaAnatomySet(d, { swapTarget: SWAP }); return true; } catch { return false; } });
ok(offerable.length >= 4 && offerable.some((d) => d.id === 'field-label') && offerable.some((d) => d.id === 'button'),
  `#804 every def the UI can offer projects here too (${offerable.map((d) => d.id).join(', ')})`);

// ---- #1266 the STANDALONE focus ring builds without throwing ----------------------------------
// PR-B made the focus ring standalone-buildable and #1266 gave it its own stroke, and the two
// together made its ROOT a stroked, absolute, `layoutMode: NONE` frame. `strokesIncludedInLayout` is
// AUTO-LAYOUT-ONLY and the real host THROWS on a non-auto-layout frame, so the executor's border-box
// write reached it unguarded, threw, and — unlike `claimDefaults`' try/caught `set` — propagated to
// `applyComponentPlan`'s top-level catch, which re-throws: the ring parked at 100×100 and every def
// that nests it cascaded. The write is now gated on auto-layout in BOTH executors, and the shim
// models the host constraint (see `component-shim.ts`), so this run is the offline witness: remove
// the guard and the shim's setter throws, `run` rejects, and the first assertion below goes red.
const standaloneRingPlans = figmaAnatomySet(byId('focus-ring')!, { swapTarget: SWAP });
// PIN THE SHAPE that makes the write reachable: the ring's ROOT must be stroked (so the paint branch
// runs) AND carry no auto-layout (so the write it makes is the throwing one). Without this the test
// could pass vacuously on a ring that lost its stroke or gained a layoutMode, with the guard never
// exercised — exactly the DRY-with-the-subject trap docs/34 warns about, one indirection out.
ok(standaloneRingPlans.length > 0 && standaloneRingPlans.every((p) => {
    const root = p.root as { paints?: { strokes?: unknown }; layoutMode?: string };
    return !!root.paints?.strokes && !root.layoutMode;
  }),
  `#1266 reachable: every standalone focus-ring plan root is stroked and carries no auto-layout, so the border-box write is the auto-layout-only one that throws (${standaloneRingPlans.length} plans)`);
let ringBuildErr: string | null = null;
let ringMisses: string[] = ['never ran'];
try { ringMisses = (await run(standaloneRingPlans, fullFor(standaloneRingPlans))).misses; }
catch (e) { ringBuildErr = (e as Error).message; }
ok(ringBuildErr === null,
  `#1266 the standalone focus ring builds without throwing — a stroked, absolute, layoutMode-NONE root frame no longer trips the auto-layout-only \`strokesIncludedInLayout\` write (${ringBuildErr ?? 'clean'})`);
ok(ringBuildErr === null && ringMisses.length === 0,
  `#1266 ...and it builds with no misses — the border-box default is skipped where it does not apply rather than swallowed into a #865 report (${ringBuildErr ? 'threw' : JSON.stringify(ringMisses)})`);

const labelPlans = figmaAnatomySet(fieldLabel, { swapTarget: SWAP });
// SWAP TARGET PASSED AND INERT, which is what lets the main thread pass it unconditionally rather than
// branching per def. Asserted by comparing the two projections, not by reading the def: a def that gains a
// swap part later makes this fail, which is the correct outcome — the branch would then be needed.
ok(JSON.stringify(labelPlans) === JSON.stringify(figmaAnatomySet(fieldLabel, {})),
  '#804 `swapTarget` is inert for a def with no swap parts, so the caller need not know whether to pass it');

// `fullFor(labelPlans)` rather than `full()`, and the distinction matters: `full()` seeds Button's names,
// so a `field-label` run against it would report every binding as a miss and the assertion below would be
// measuring the seed rather than the executor. Derived from these plans for the reason `fullFor` exists.
const labelRun = await run(labelPlans, fullFor(labelPlans));
// The COUNT is DERIVED from the plans rather than pinned, because what #804 claims is "one set of its
// own name, every member added" — not the size of field-label's grid. It was 4 until #872 gave the def a
// `tone` axis and a third size rung (3 x 2 x 2 states = 12), and a hardcoded 4 fails on a change that
// says nothing about the property under test. `variants === added === planned` is what carries the
// claim: every planned member reached the set and none was silently dropped.
ok(labelRun.set === 'field-label' && labelRun.variants === labelPlans.length && labelRun.added === labelPlans.length,
  `#804 a whole set assembles under one set of its own name, every member added (set=${labelRun.set}, variants=${labelRun.variants}, added=${labelRun.added}, planned=${labelPlans.length})`);
ok(labelRun.misses.length === 0, `#804 ...with no misses (${labelRun.misses.join('; ') || 'none'})`);
// REACHABILITY, so the line above cannot pass vacuously: a plan set that binds nothing has nothing to
// miss. Same guard the Button block opens with, for the same reason.
const labelSeed = fullFor(labelPlans);
ok((labelSeed.vars ?? []).length >= 4 && (labelSeed.styles ?? []).length >= 2,
  `#804 reachable: these plans DO reach for variables and text styles (${(labelSeed.vars ?? []).length} vars, ${(labelSeed.styles ?? []).length} styles)`);
// THE TWO TEXT PROPERTIES, which is the #798 fix reaching the canvas rather than only the plan. A set with
// one TEXT property here is the blank-indicator defect back, and it would otherwise be invisible: the node
// exists, is painted, is the right size, and holds no characters.
ok(labelRun.properties.filter((p) => p.indexOf('TEXT') >= 0).length === 2,
  `#798/#804 both text parts are declared as TEXT properties on the set, so neither projects blank (${labelRun.properties.join('/')})`);

// ---- #1009: the vertical claim reaches the CANVAS, read off the built nodes ------------------------
//
// The plan declaring `textAlignVertical` and the executor writing it look identical from inside the
// engine — #802's class, and the reason this is asserted here and not only in `test.ts`. `field-label` is
// the fixture because it has TWO text parts, which is also the case that settles where the rule lives.
{
  const labelPage: Page = { children: [] };
  const vaRun = await run(labelPlans, { ...fullFor(labelPlans), page: labelPage });
  ok(vaRun.misses.length === 0, `#1009 the run is clean, so the reads below are about writes rather than skips (${vaRun.misses.join('; ') || 'none'})`);
  const vaSet = labelPage.children[0];
  const built = [vaSet, ...((vaSet.findAll as () => Node[])())] as Node[];
  const texts = built.filter((n) => n.type === 'TEXT');
  // FLOOR FIRST: "every text node reads CENTER" is vacuously true of no text nodes, and this fixture
  // having none is exactly how the arm would rot silently.
  ok(texts.length >= 2, `#1009 the built set holds text nodes to read back (${texts.length})`);
  const centred = texts.filter((n) => n.textAlignVertical === 'CENTER');
  ok(centred.length === texts.length,
    `#1009 EVERY built text node reads back CENTER — the shim starts them at Figma's 'TOP', so this is the executor's write and not a helpful default (${centred.length}/${texts.length})`);
  const nonText = built.filter((n) => n.type !== 'TEXT');
  ok(nonText.length > 0 && nonText.every((n) => n.textAlignVertical === undefined),
    `#1009 ...and no frame carries it, on a shim that THROWS if one is written — so this is a refusal witnessed, not a property nobody set (${nonText.length} non-text nodes)`);
}
// #1302 — THE THROW THE LINE ABOVE LEANS ON, asserted directly. It was dead for months: the accessor sat
// in an object spread, which reads the getter once and drops the setter, so a frame took the write
// silently and "a refusal witnessed" was a property nobody set after all. Asked of a fresh FRAME and a
// fresh TEXT, so the check is the shim's behaviour and nothing the executor did.
{
  const shim = makeShim({});
  const frame = shim.createFrame() as Node;
  let threw = '';
  try { (frame as Record<string, unknown>).textAlignVertical = 'CENTER'; } catch (e) { threw = (e as Error).message; }
  ok(/set_textAlignVertical/.test(threw) && frame.textAlignVertical === undefined,
    `#1302 the shim REFUSES textAlignVertical on a FRAME, as Figma does — the setter is live, not flattened to a data property by a spread (threw: ${threw || 'nothing'}; reads ${String(frame.textAlignVertical)})`);
  const text = shim.createText() as Node;
  (text as Record<string, unknown>).textAlignVertical = 'CENTER';
  ok(text.textAlignVertical === 'CENTER', `#1302 positive control: a TEXT node takes the write (${String(text.textAlignVertical)})`);
}
// #1007 — AN EFFECT STYLE READS BACK UNDER FIGMA'S OWN NAME. No def declares `effectStyle` today, so no
// run here ever reached the executor's `setEffectStyleIdAsync`; this probe puts one on field-label's root
// and reads `effectStyleId`, the host property a real reader uses, never the shim's private `_effectStyleId`.
{
  const probe: AnatomyPlan = { ...labelPlans[0], root: { ...labelPlans[0].root, effectStyle: 'shadow/md' } };
  const effPage: Page = { children: [] };
  const effRun = await run([probe], { ...fullFor([probe]), page: effPage });
  const member = ((effPage.children[0]?.children as Node[] | undefined) ?? [])[0];
  ok(effRun.misses.length === 0 && member?.effectStyleId === 'E:shadow/md',
    `#1007 an applied effect style reads back as node.effectStyleId, the host's own property name (reads ${String(member?.effectStyleId)}; misses ${effRun.misses.join('; ') || 'none'})`);
}
// A SET NO LARGER THAN ONE CHUNK still yields and still ends at its total — the edge Button's 648 never
// exercised, since every count in this file is a multiple of 21 and `CHUNK` is 4. Through `instrumented`
// so the YIELD is witnessed separately from the REPORT: at this size the two could not be told apart by
// counting reports alone, which is the substitution docs/34 §2 records.
const labelInstr = await instrumented(labelPlans, fullFor(labelPlans));
ok(labelInstr.progress.length > 0 && labelInstr.yieldCalls > 0,
  `#804 a set no larger than one chunk still yields and still reports (${labelInstr.yieldCalls} yields, ${labelInstr.progress.length} reports)`);
ok(labelInstr.progress.every((p) => p.done <= p.total) && labelInstr.progress.some((p) => p.done === p.total),
  `#804 ...and the fractions are bounded and end at the total (${labelInstr.yields.join(', ')})`);

// =============================================================================================
// #1599 — CHARACTERS ARE NEVER DISCARDED FOR WANT OF A LOADED FONT (the font floor)
// =============================================================================================
// The owner found this building NB `field-label`: one absent text style (`body/sm/strong`, created by
// Apply, not by the component build) emptied EVERY text node — 252 discards on a 24-variant set. The
// mechanism: the executor loaded only the STYLE'S font, inside the branch where the style was FOUND, so a
// missing style meant no font loaded at all, and `node.characters = "Label"` threw "unloaded font" and was
// discarded. `field-label` is the fixture because it IS the def the defect was found on and its two text
// parts carry placeholder copy — so a run that lands nothing is the live catastrophe, in miniature.
//
// The arm runs the real def against a file with NO text styles (`styles: []`) — the exact trigger: the
// plans still nominate `n.textStyle`, so every text node reports a style miss and NOTHING loads a font via
// the style path. This is the shim world the #1599 floor must survive.
const noStyleLabel = await run(labelPlans, { ...fullFor(labelPlans), styles: [], page: { children: [] } });
// PIN THE TRIGGER first, so the "text lands" claim below is not vacuously satisfied by a run whose styles
// were quietly present after all: the styles ARE absent, so the style-binding misses ARE reported.
ok(noStyleLabel.misses.some((m) => /\.textStyle ->/.test(m)),
  `#1599 (pin) the arm's trigger is real — every text node's style is absent and reported (${noStyleLabel.misses.filter((m) => /\.textStyle ->/.test(m)).length} style misses)`);
// PIN THE SUBJECT: the plans actually carry characters to land, or "nothing discarded" is true of nothing.
const labelCharCount = labelPlans.reduce((a, p) => {
  let c = 0; const walk = (n: { characters?: unknown; children?: unknown[] }): void => {
    if (typeof n.characters === 'string') c++; for (const k of (n.children as typeof n[]) ?? []) walk(k);
  }; walk(p.root as { characters?: unknown; children?: unknown[] }); return a + c;
}, 0);
ok(labelCharCount > 0, `#1599 (pin) these plans DO carry text to write, so "nothing discarded" is a claim about real characters (${labelCharCount} across the set)`);
// THE FIX, stated as the mutation that inverts it: WITH the floor, no character write is discarded even
// though every style is missing — text lands in the node's own (fallback) font. Reverting the floor in
// `write-components.ts` leaves the node on its unloaded `DEFAULT_FONT`, the `characters` write throws, and
// this line goes red with the DISCARDED misses the field-label build actually produced. That is the
// by-name mutation docs/34 requires: the arm names the defect it re-catches.
// THE FLOOR, as the DISCARDED miss it removes — the exact symptom the field-label build produced (`set
// "Label", reads ""`, ×252). WITH the floor no character write is discarded though every style is missing:
// text lands in the node's own fallback font. Reverting the floor in `write-components.ts` leaves the node
// on its unloaded `DEFAULT_FONT`, the write throws, and this line goes red naming the discards it re-catches
// — the by-name mutation docs/34 requires. (A read-back of the built nodes is NOT a second witness here:
// field-label's text is characters-BOUND, so a bound node reads its caption from the set-level property
// default regardless of whether the build-time write landed — the DISCARDED miss is the only arm that
// tells the floor apart from its absence, which is why it carries the gate alone.)
const discarded = noStyleLabel.misses.filter((m) => /\.characters -> DISCARDED/.test(m));
ok(discarded.length === 0,
  `#1599 with the font floor, NO character is discarded when the style is absent — text lands in the fallback font (${discarded.length} discarded${discarded.length ? `: ${discarded.slice(0, 2).join('; ')}` : ''})`);

// THE `figma.mixed` GUARD. The floor loads the node's OWN font, but a node whose text spans more than one
// font reads `fontName === figma.mixed`, which `loadFontAsync` cannot take. The floor's shape check
// (`typeof fn === 'object'`) skips it rather than crashing — and `mixedTextFonts` puts every text node in
// that state, surviving to the write because no style is resolved. WITH the guard the run COMPLETES and no
// `.font ->` miss is reported (the load was skipped, not attempted and failed). Dropping the shape check —
// `if (fn)` alone — hands `figma.mixed` to `loadFontAsync`, which the shim refuses, surfacing exactly the
// `.font ->` miss this asserts is absent: the by-name mutation for the guard.
let mixedThrew = '';
let mixedRun!: Awaited<ReturnType<typeof run>>;
try { mixedRun = await run(labelPlans, { ...fullFor(labelPlans), styles: [], mixedTextFonts: true, page: { children: [] } }); }
catch (e) { mixedThrew = (e as Error).message; }
ok(mixedThrew === '', `#1599 a mixed-font node does not crash the build — the floor skips figma.mixed rather than loading it${mixedThrew ? ` — ${mixedThrew.slice(0, 90)}` : ''}`);
ok(mixedThrew === '' && !mixedRun.misses.some((m) => /\.font ->/.test(m)),
  `#1599 ...and nothing was handed to loadFontAsync — no font miss on the mixed arm (${mixedThrew ? 'threw' : mixedRun.misses.filter((m) => /\.font ->/.test(m)).join('; ') || 'none'})`);

// =============================================================================================
// #1337 — A REFUSED COMPONENT-PROPERTY REFERENCE IS RECOVERED, NOT DROPPED
// =============================================================================================
// THE DEFECT this reproduces, and why no other gate here could. The wire loop writes each reference on the
// #701 fast-path handle (`builtFor.get(part)`), captured BEFORE `combineAsVariants`. On the real host the
// combine can leave that handle a DETACHED pre-combine node while the live member holds an id-rewritten
// twin — the same divergence #866 (`refsRepaired`) and #1279 (`boundRepaired`) harden their READ-BACKS
// against, and which was UNCONFIRMED live precisely because the default shim keeps one node object across
// combine so no handle ever detaches. A `componentPropertyReferences` write to a detached node does not
// merely discard: it THROWS "Could not create a new component property reference", and a throw never lands
// in `wiredRefs`, so the read-back repairs cannot reach it. `field-label` — the corpus's only member with
// TWO TEXT parts — lost BOTH its `label` and `indicator` references on the affected variants and the text
// disappeared from them (#1337, filed off a live aurora build; its miss lines are byte-for-byte the ones
// this run produces without the fix).
//
// The shim's `detachPartsOnCombine` models exactly that host behavior (see `component-shim.ts`), so this is
// the one arm in the suite that drives the THROW path. Mutation-by-name (docs/34): delete the wire-loop
// recovery in `write-components.ts` and this run reports 48 "Could not create a new component property
// reference" misses and `refsRepaired: 0` — every named assertion below then fails. The third arm is the
// reachability floor: WITHOUT the detach mode there is nothing to recover, so `refsRepaired === wantRefs`
// is what proves the recovery actually fired on every reference rather than passing vacuously on an
// un-detached run.
{
  const wantRefs = labelPlans.length * planSetProperties(labelPlans).length;
  const detachRun = await run(labelPlans, { ...fullFor(labelPlans), detachPartsOnCombine: true });
  const created = detachRun.misses.filter((m) => /Could not create a new component property reference/.test(m));
  ok(created.length === 0,
    `#1337 a reference the combine detaches is re-wired on the live twin, not dropped — 0 "could not create" misses (${created.length}${created.length ? `: ${created.slice(0, 2).join(' | ')}` : ''})`);
  ok(detachRun.refs === wantRefs && detachRun.wiredMembers === labelPlans.length,
    `#1337 ...and every reference still reaches every member (${detachRun.refs} refs = ${labelPlans.length} × ${planSetProperties(labelPlans).length}, ${detachRun.wiredMembers} members wired)`);
  ok(detachRun.refsRepaired === wantRefs,
    `#1337 every one of the ${wantRefs} references went through the throw-path recovery — refsRepaired=${detachRun.refsRepaired} proves the detach fired and the fix caught it all, not a vacuous pass on an un-detached run`);
}

// =============================================================================================
// #1473 — A REFERENCE DETACHED BY A MEMBER-LEVEL id-SETTLE IS RECOVERED, NOT LEFT UNWIRED
// =============================================================================================
// THE DEFECT this reproduces, one level past #1337. #1337's `detachPartsOnCombine` detaches a member's
// DESCENDANTS but keeps the MEMBER's own identity, so the recovery re-finds an attached part THROUGH the
// combine-time member handle and lands. The field-label persistent misses (27 on a live aurora build,
// concentrated on `emphasis=secondary/weight=bold`) are the level up: the host keeps reconciling ids after
// combine and reassigns some members' OWN identity, so the handle a run snapshotted at combine ends up with
// a DETACHED subtree while a fresh `set.children` read holds a live twin. The #1337 recovery re-found the
// part THROUGH that SAME stale handle and threw again — a permanent "Could not create a new component
// property reference". The fix (`write-components.ts`) re-resolves the MEMBER from a fresh `set.children`
// read (`liveByName`) before finding the part, so recovery reaches the live twin.
//
// The shim's `settleAfterCombine: 'all'` models that host behavior (see `component-shim.ts`): every member
// is replaced in the live `set.children` by a fresh guarded twin and the combine-time original is detached.
// Mutation-by-name (docs/34): revert the `liveByName` re-resolution in `write-components.ts` and this run
// reports one "Could not create a new component property reference" per reference and `refsRepaired: 0`,
// failing every named assertion below. The reachability floor `refsRepaired === wantRefs` proves the
// member-level settle actually fired on every reference — WITHOUT it there is nothing to recover, so a green
// here is the fix catching a real detach and not a vacuous pass on an un-settled run. `field-label` is the
// fixture for the same reason it was #1337's: the corpus's only member with TWO TEXT parts, and the def the
// live misses were filed on.
{
  const wantRefs = labelPlans.length * planSetProperties(labelPlans).length;
  const settlePage: Page = { children: [] };
  const settleRun = await run(labelPlans, { ...fullFor(labelPlans), page: settlePage, settleAfterCombine: 'all' });
  const created = settleRun.misses.filter((m) => /Could not create a new component property reference/.test(m));
  ok(created.length === 0,
    `#1473 a reference the member-level settle detaches is re-wired on the live member, not left unwired — 0 "could not create" misses (${created.length}${created.length ? `: ${created.slice(0, 2).join(' | ')}` : ''})`);
  ok(settleRun.refs === wantRefs && settleRun.wiredMembers === labelPlans.length,
    `#1473 ...and every reference still reaches every member (${settleRun.refs} refs = ${labelPlans.length} × ${planSetProperties(labelPlans).length}, ${settleRun.wiredMembers} members wired)`);
  ok(settleRun.refsRepaired === wantRefs,
    `#1473 every one of the ${wantRefs} references went through the member-level recovery — refsRepaired=${settleRun.refsRepaired} proves the settle fired and the fix caught it all, not a vacuous pass on an un-settled run`);

  // HOST-TRUTH read-back — the by-name gate the issue asks for. The independent expectation is the def's
  // DECLARED set properties (`planSetProperties` — `label`, `required marker`, `required`), NOT the executor's
  // `wiredRefs` (docs/34): each must be REFERENCED by some node in EVERY settled member's subtree, read off
  // the LIVE set. A reference the settle detaches and the fix fails to recover leaves that property's key
  // absent from the member, and the member is named here. The key floor proves the properties exist on the
  // host — a set that declared none would fail it rather than the loop passing over an empty expectation.
  const settleSet = settlePage.children[0] as Node;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural read-back off the shim's set
  const propDefs = (settleSet as any).componentPropertyDefinitions as Record<string, { type: string }>;
  const wantKeys = planSetProperties(labelPlans).map((p) => ({ name: p.name, key: Object.keys(propDefs).find((k) => k.split('#')[0] === p.name) }));
  ok(wantKeys.length > 0 && wantKeys.every((w) => !!w.key),
    `#1473 host-truth floor: every declared set property has a host key (${wantKeys.map((w) => `${w.name}=${w.key ? '✓' : '✗'}`).join(', ')})`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural walk over the shim tree
  const refsInSubtree = (m: any): Set<string> => {
    const out = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walk = (n: any): void => { for (const id of Object.values(n?.componentPropertyReferences ?? {})) out.add(id as string); for (const c of n?.children ?? []) walk(c); };
    walk(m);
    return out;
  };
  const unwired: string[] = [];
  for (const m of settleSet.children as Node[]) {
    const held = refsInSubtree(m);
    for (const w of wantKeys) if (w.key && !held.has(w.key)) unwired.push(`${String(m.name)}/${w.name}`);
  }
  ok((settleSet.children as Node[]).length === labelPlans.length && unwired.length === 0,
    `#1473 host-truth: every declared component property is referenced on every settled member's live node — 0 unwired (${unwired.length ? unwired.slice(0, 3).join(' | ') : 'none'})`);
}

// =============================================================================================
// #1574 — THE SET'S OWN HANDLE, NOT A MEMBER'S: PROPERTIES DECLARED AFTER IT MOVES STILL LAND
// =============================================================================================
// THE LIVE SHAPE, and why none of the three arms above could see it. On a live aurora build `button` and
// `button-destructive` each carry 9 component properties and 882 ref-bearing layers; `button-neutral`
// carries 7 — `label` present, BOTH `↳ swap … icon` INSTANCE_SWAP properties absent — and 0 references.
// #1337/#1473/#1516/#1568 all model a MEMBER or PART handle detaching, and the executor's whole recovery
// vocabulary was built for that object. The one handle those four never touch is the SET's own, the object
// `combineAsVariants` hands back, which the executor then held unexamined across a 432-member combine, two
// chunked loops and every host yield in between. Two separate things rode on it:
//
//   (1) `set.componentPropertyDefinitions`, read ONCE before any property existed, set a single `readable`
//       boolean — and that one boolean gated the property loop AND `toWire`. So one failed getter produced
//       zero properties AND zero references and reported one sentence blaming duplicate member names.
//   (2) every `addComponentProperty` call, made on that same captured handle.
//
// `staleSetAfterProperty` (component-shim.ts) models the set's identity moving and NOTHING else's — the
// members stay live and shared, which is the restriction that keeps this distinct from the modes above and
// is what lets these arms show that only the PROPERTIES are lost. Two injection points, because the fix has
// two halves that do not substitute for one another: `0` kills the handle at combine, so the definitions
// READ is the first casualty (defect 1); `1` kills it after `label` is created, so the `↳ swap leading icon`
// call that follows is the casualty (defect 2) — the live shape exactly.
//
// FIDELITY, stated because it is the weak point: a stale COMPONENT_SET handle could NOT be manufactured on
// today's host (`addComponentProperty` does not invalidate the handle; `.id` on a removed node does not
// throw), so this models a state the executor's code ASSUMED IMPOSSIBLE rather than a measured behavior.
// The arms therefore assert the OUTCOME — which properties the set ends up holding, read off the set
// itself, and whether the references landed — and never the refusal string (the #1573 caveat).
//
// Mutation-by-name (docs/34): replace `liveSet()` with `set` in the property loop and arm (b) fails by name
// on `↳ swap leading icon`; drop the retried definitions read and arm (a) fails by name on both properties
// and on zero references. The FLOOR is the paired control: the same projection with no staleness injected
// must report `setReresolved === 0`, so the re-resolutions counted in the injected runs are attributable to
// the injection and not to something that would have happened anyway.
{
  const props1574 = planSetProperties(grid);
  // Input pin: the fixture must declare a property AFTER the one the `1` injection kills, or arm (b) has
  // nothing to lose and passes vacuously. `grid` is the live subject's own shape — TEXT then INSTANCE_SWAP.
  ok(props1574.length >= 2 && props1574[0].type === 'TEXT' && props1574.some((p) => p.type === 'INSTANCE_SWAP'),
    `#1574 input pin: the button grid declares a property after the first, the live button-neutral shape (${props1574.map((p) => `${p.name}:${p.type}`).join(', ')})`);

  const run1574 = async (stale?: number) => {
    const page: Page = { children: [] };
    const res = await run(grid, { ...fullFor(grid), page, ...(stale == null ? {} : { staleSetAfterProperty: stale }) });
    return { page, res };
  };
  // INDEPENDENT READ-BACK (docs/34): the expectation is the PLAN's declared properties; the actual is the
  // set's OWN `componentPropertyDefinitions` and the members' own `componentPropertyReferences`. Neither
  // reads the executor's `propIds`, which is the bookkeeping the old completeness check compared against
  // itself (shape 1 — the check could not fail on the failure it existed to find).
  const heldBy = (page: Page): { missing: string[]; unwired: string[]; members: number } => {
    const liveSetNode = page.children[0] as Node | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural read-back off the shim's set
    const defs = (liveSetNode ? (liveSetNode as any).componentPropertyDefinitions : {}) as Record<string, { type: string }>;
    const keys = props1574.map((p) => ({ name: p.name, key: Object.keys(defs).find((k) => k.split('#')[0] === p.name) }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural walk over the shim tree
    const refsIn = (m: any): Set<string> => {
      const out = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const walk = (n: any): void => { for (const id of Object.values(n?.componentPropertyReferences ?? {})) out.add(id as string); for (const c of n?.children ?? []) walk(c); };
      walk(m);
      return out;
    };
    const unwired: string[] = [];
    for (const m of (liveSetNode?.children ?? []) as Node[]) {
      const held = refsIn(m);
      for (const k of keys) if (k.key && !held.has(k.key)) unwired.push(`${String(m.name)}/${k.name}`);
    }
    return { missing: keys.filter((k) => !k.key).map((k) => k.name), unwired, members: ((liveSetNode?.children ?? []) as Node[]).length };
  };

  const control = await run1574();
  // FLOOR: nothing re-resolves when nothing goes stale, so every `setReresolved` below is the injection's.
  ok(control.res.setReresolved === 0 && control.res.refs > 0,
    `#1574 floor: the control projection never re-resolves the set (setReresolved=${control.res.setReresolved}, refs=${control.res.refs}) — the counts below are attributable to the injected staleness`);
  const wantRefs = grid.length * props1574.length;

  // ---- (a) the handle is stale AT COMBINE: the definitions read is the first casualty ---------
  const atCombine = await run1574(0);
  ok(atCombine.res.setReresolved > 0 && atCombine.res.misses.some((m) => /definitions UNREADABLE on the combine-time handle/.test(m)),
    `#1574a floor: the injected staleness really fired at the definitions read and was diagnosed as a stale handle rather than a poisoned set (setReresolved=${atCombine.res.setReresolved})`);
  const aState = heldBy(atCombine.page);
  ok(aState.missing.length === 0,
    `#1574a a set handle already stale at combine still gets every declared property — read off the set's own definitions, 0 absent (${aState.missing.length ? aState.missing.join(', ') : 'none'})`);
  ok(atCombine.res.refs === wantRefs && atCombine.res.wiredMembers === grid.length && aState.unwired.length === 0,
    `#1574a ...and the unreadable getter no longer zeroes the WIRE phase too: ${atCombine.res.refs}/${wantRefs} refs on ${atCombine.res.wiredMembers}/${grid.length} members, 0 unwired (${aState.unwired.length ? aState.unwired.slice(0, 3).join(' | ') : 'none'})`);

  // ---- (b) the handle goes stale AFTER `label`: the live button-neutral shape ------------------
  const midWay = await run1574(1);
  ok(midWay.res.setReresolved > 0,
    `#1574b floor: the set's identity moved after the first property landed (setReresolved=${midWay.res.setReresolved})`);
  const bState = heldBy(midWay.page);
  const refused = midWay.res.misses.filter((m) => /^property .* (REFUSED|-> DECLARED BY THE PLAN BUT NEVER CREATED)/.test(m));
  ok(bState.missing.length === 0 && refused.length === 0,
    `#1574b a property declared after the set handle moves is created on the live set, not lost — all ${props1574.length} present on the set, 0 refused (${[...bState.missing, ...refused.slice(0, 2)].join(' | ') || 'none'})`);
  ok(midWay.res.refs === wantRefs && bState.unwired.length === 0 && bState.members === grid.length,
    `#1574b ...and every reference naming them still reaches every member (${midWay.res.refs}/${wantRefs} refs across ${bState.members}/${grid.length} members, 0 unwired ${bState.unwired.length ? `— ${bState.unwired.slice(0, 3).join(' | ')}` : ''})`);

  // ---- (c) THE REPORT ITSELF — the read-back that could not see its own subject -----------------
  // Separate arm because it gates a DIFFERENT thing from (a) and (b): not whether the properties land, but
  // whether a set that ships incomplete SAYS SO. The completeness read-back stood as
  // `if (propIds.has(p.name) && !bare.has(p.name))` — gated on the executor's own record of what it
  // succeeded in creating, so a property never created was excluded from the completeness check BY THE
  // FAILURE the check exists to find (docs/34 shape 1). That is why `button-neutral` was SILENT, which is
  // the part of the defect that cost the most: the census had to be taken by hand on the live file.
  //
  // The fixture is a file that cannot satisfy the swap property AT ALL — the shim resolves every component
  // the plans nominate EXCEPT the swap target — so `↳ swap leading icon` is genuinely never created, with
  // no staleness involved. Mutation-by-name: restore the `propIds.has(p.name) &&` gate and this arm fails
  // while (a) and (b) stay green, because they read the set rather than the report.
  const noSwapPage: Page = { children: [] };
  const noSwap = await run(grid, { ...fullFor(grid), page: noSwapPage, comps: fullFor(grid).comps!.filter((c) => c !== SWAP) });
  const swapProp = props1574.find((p) => p.type === 'INSTANCE_SWAP')!;
  // FLOOR: the property really is absent from the set, read off the set itself — so the miss asserted below
  // is a true report and not the executor complaining about a property that is in fact there.
  const cState = heldBy(noSwapPage);
  ok(cState.missing.includes(swapProp.name),
    `#1574c floor: with the swap target absent from the file the ${swapProp.name} property genuinely never reaches the set (absent: ${cState.missing.join(', ') || 'none'})`);
  ok(noSwap.misses.some((m) => m.startsWith(`property ${swapProp.name} -> DECLARED BY THE PLAN BUT NEVER CREATED`)),
    `#1574c ...and the executor REPORTS it — a property the plan declared and the loop never created is named as absent from the set, the case the propIds-gated read-back excluded by construction (${noSwap.misses.filter((m) => m.startsWith('property ')).slice(0, 2).join(' | ') || 'no property miss at all'})`);
}

// =============================================================================================
// #1579 — THE BUILD'S OWN REPORT, LEFT ON THE SET
// =============================================================================================
// WHAT THIS GATES, and why it is not another arm of the block above. #1574's three defects are about the
// properties LANDING; this is about the run SAYING what it did, on a surface that outlives it. The census
// narrowed `button-neutral` to two states — (a) the run aborted between `addComponentProperty('label')` and
// the first reference write, (b) `readable` was false in the run that did the wiring — and the document
// could not distinguish them, because `applyComponentPlan` reports its miss list to the UI and nowhere
// else. So the diagnosis was six hand-written `figma_execute` probes re-establishing facts the run had
// computed and discarded. The arms below hold the two states apart: (b) is the FINAL report, which carries
// the UNREADABLE miss and the counters; (a) is the PROVISIONAL one, written at the combine and left behind
// by a run that never returns.
//
// INDEPENDENCE (docs/34). The ACTUAL is necessarily the report — that is the subject. So every EXPECTED
// comes from somewhere the executor does not write: the def id and the property count from the PLAN
// (`grid[0].component`, `planSetProperties`), the engine version from `@prism3/engine/version`, and the
// two counters from a WALK of the shim members' own `componentPropertyReferences`. Deliberately NOT from
// `res.refs`/`res.wiredMembers`: the report and the result object are built from the same two locals, so an
// assertion comparing them is shape 11 — two sides, one subject underneath both, green while the shared
// thing moves anywhere. And the namespace and the key are written here as LITERALS rather than imported
// from the executor, because they ARE the contract an outside census reads; a gate that follows a rename
// is not a gate on a name.
//
// Mutation-by-name: drop the final `writeBuildReport` call and `#1579a` fails (nothing readable on the
// set); write `refs: refs.length` — the PLAN's declared reference list — in place of `refs: refsWired` and
// `#1579b` fails on a counter that is off by the references that did not land, while (a) and (c) stay green
// because neither reads a counter.
{
  const props1579 = planSetProperties(grid);
  const defId = grid[0].component;

  /** The report as an OUTSIDE reader gets it: find the set anywhere on the page (the abort path parks it
   *  inside a frame) and call `getSharedPluginData` with the literal namespace and key. `other` reads a key
   *  nothing ever writes — the negative half, so a non-empty `raw` is a write this run made rather than
   *  whatever the store returns for everything (docs/34 shape 12). */
  const reportOn = (page: Page): { raw: string; other: string; set: Node | undefined } => {
    const find = (ns: Node[]): Node | undefined => {
      for (const n of ns) {
        if (n.type === 'COMPONENT_SET') return n;
        const kid = find((n.children ?? []) as Node[]);
        if (kid) return kid;
      }
      return undefined;
    };
    const set = find(page.children);
    const get = (k: string): string =>
      (set?.getSharedPluginData as ((ns: string, key: string) => string) | undefined)?.('prism3', k) ?? '';
    return { raw: get('build'), other: get('nosuchkey'), set };
  };

  /** THE INDEPENDENT COUNT: every `componentPropertyReferences` entry the shim tree actually holds, and how
   *  many members hold at least one. Walked off the set's own children, so it answers "what is IN the file"
   *  — the question the report claims to answer — rather than "what did the executor tally". */
  const wiredIn = (set: Node | undefined): { refs: number; members: number } => {
    let refs = 0;
    let members = 0;
    for (const m of ((set?.children ?? []) as Node[])) {
      let n = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural walk over the shim tree
      const walk = (x: any): void => {
        n += Object.keys(x?.componentPropertyReferences ?? {}).length;
        for (const c of x?.children ?? []) walk(c);
      };
      walk(m);
      refs += n;
      if (n > 0) members++;
    }
    return { refs, members };
  };

  const okPage: Page = { children: [] };
  const okRes = await run(grid, { ...fullFor(grid), page: okPage });
  const okReport = reportOn(okPage);
  const walked = wiredIn(okReport.set);

  // INPUT PIN: the fixture must produce non-zero counters, or (b) compares zero against zero and passes on
  // a report that says nothing. And the negative half of the probe: an unwritten key reads `''`.
  ok(walked.refs > 0 && walked.members > 0 && props1579.length > 0 && okReport.other === '',
    `#1579 input pin: the control build leaves ${walked.refs} references on ${walked.members} members for ${props1579.length} declared properties, and an unwritten key on the same set reads empty (${JSON.stringify(okReport.other)})`);

  // ---- (a) THE SET CARRIES A READABLE REPORT ---------------------------------------------------
  let a: Record<string, unknown> = {};
  let aParsed = false;
  try { a = JSON.parse(okReport.raw) as Record<string, unknown>; aParsed = true; } catch { /* reported below */ }
  ok(aParsed && a.complete === true && a.def === defId && a.engine === ENGINE_VERSION
    && typeof a.at === 'string' && (a.at as string).endsWith('Z') && !Number.isNaN(Date.parse(a.at as string))
    && Array.isArray(a.misses) && typeof a.missesOmitted === 'number',
    `#1579a a finished build leaves a readable report on the set — complete=${String(a.complete)}, def '${String(a.def)}' (want '${defId}'), engine '${String(a.engine)}' (want '${ENGINE_VERSION}'), written ${String(a.at)}, ${Array.isArray(a.misses) ? (a.misses as string[]).length : '?'} misses kept and ${String(a.missesOmitted)} omitted${aParsed ? '' : ` — UNPARSEABLE: ${JSON.stringify(okReport.raw.slice(0, 120))}`}`);

  // ---- (b) THE COUNTERS ARE TRUE, against the file rather than against the tally ----------------
  ok(a.refs === walked.refs && a.wiredMembers === walked.members && a.refs === grid.length * props1579.length,
    `#1579b the report's counters match the references the FILE holds, walked independently: refs ${String(a.refs)} vs ${walked.refs} walked vs ${grid.length * props1579.length} the plan declares, wiredMembers ${String(a.wiredMembers)} vs ${walked.members} walked`);
  ok(a.setReresolved === 0 && a.refsRepaired === 0 && a.boundRepaired === 0,
    `#1579b floor: the undisturbed control reports its three repair counters as zero (setReresolved=${String(a.setReresolved)}, refsRepaired=${String(a.refsRepaired)}, boundRepaired=${String(a.boundRepaired)}) — so a non-zero one in a report from a disturbed run is the disturbance and not the baseline`);

  // ---- (c) THE ABORT — #1574's state (a), now a positive record rather than an absence ----------
  const abortPage: Page = { children: [] };
  let threw: unknown = null;
  try { await run(grid, { ...fullFor(grid), page: abortPage, abortAfterCombine: true }); }
  catch (err) { threw = err; }
  const parked = partialWriteOf(threw);
  ok(threw !== null && parked !== null && parked.parked > 0,
    `#1579c floor: the modelled abort really stopped the run after the set existed, and the failure path parked ${parked?.parked ?? 0} node(s) — so the report below is read off a node the handler has already relocated`);
  const cReport = reportOn(abortPage);
  let c: Record<string, unknown> = {};
  let cParsed = false;
  try { c = JSON.parse(cReport.raw) as Record<string, unknown>; cParsed = true; } catch { /* reported below */ }
  ok(cParsed && c.complete === false && c.def === defId && c.engine === ENGINE_VERSION && typeof c.stage === 'string' && (c.stage as string).length > 0,
    `#1579c a run that never returns still leaves a report, marked incomplete — the state #1574 could only infer from ABSENCE: complete=${String(c.complete)}, def '${String(c.def)}', engine '${String(c.engine)}', stage ${JSON.stringify(c.stage)}${cParsed ? '' : ` — NOTHING READABLE: ${JSON.stringify(cReport.raw.slice(0, 120))}`}`);

  // ---- (d) THE MISS LIST IS CAPPED, and says how much it dropped -------------------------------
  // Pure, against `buildReportJson` directly: a 432-member set can miss on every member AND every
  // reference, which is past Figma's documented 100 kB per-entry ceiling, and an entry the host refuses is
  // a report missing on exactly the builds worth reading. Both directions, per shape 12 — a cap that
  // truncated everything would pass the "it truncated" half alone.
  const bare: BuildReport = {
    engine: ENGINE_VERSION, def: defId, at: new Date().toISOString(), complete: true, stage: 'x',
    refs: 0, wiredMembers: 0, setReresolved: 0, refsRepaired: 0, boundRepaired: 0, misses: [],
  };
  const many = Array.from({ length: 400 }, (_, i) => `miss ${i} ${'x'.repeat(400)}`);
  const big = JSON.parse(buildReportJson({ ...bare, misses: many })) as { misses: string[]; missesOmitted: number };
  const small = JSON.parse(buildReportJson({ ...bare, misses: many.slice(0, 3) })) as { misses: string[]; missesOmitted: number };
  ok(big.missesOmitted > 0 && big.misses.length + big.missesOmitted === many.length
    && big.misses.every((m, i) => m === many[i])
    && buildReportJson({ ...bare, misses: many }).length < 100_000
    && small.missesOmitted === 0 && small.misses.length === 3,
    `#1579d the miss list is capped and the loss is reported: ${many.length} sentences totalling ${many.reduce((n, m) => n + m.length, 0)} bytes keep ${big.misses.length} in document order and record ${big.missesOmitted} omitted, in a ${buildReportJson({ ...bare, misses: many }).length}-byte entry; a 3-sentence list keeps all 3 and omits ${small.missesOmitted}`);
}

// =============================================================================================
// #1010 — THE STATUS GLYPH, READ OFF THE NODE THE EXECUTOR BUILT
// =============================================================================================
// WHY THIS IS HERE AND NOT IN `test.ts`. Every defect #1010 reports is a value that RESOLVES. The def
// used to declare one `kind: 'slot'` part with an INSTANCE_SWAP property, so the projection nominated
// whatever placeholder component the file supplied — an "FPO" circle — painted it in the tone's ink, and
// reported zero misses. A plan-level check sees a structurally perfect tree: a child exists, it is
// painted, its binding resolves. So does a paint census, so does the reachability arm. The only question
// that separates a glyph from a placeholder is what got DRAWN, and this file is the only harness that
// drives the real `applyComponentPlan` against a host model and can be asked.
//
// WHAT THIS HARNESS CAN AND CANNOT SEE, stated first because half of #1010's "16×16" is not checkable
// here. The shim gives every variable a synthetic value (`varValue`), so a glyph bound to `icon/size/xs`
// measures 8-32px depending on the name's character sum, not 16. What is checkable here is the BINDING —
// which variable both axes point at — and `test.ts` carries the other half, resolving that ref to 16px in
// all five corpus brands. Neither claim is worth much alone: a binding to the right variable proves
// nothing if the variable is 20, and a 16px token proves nothing if the node binds a different one.
const fmPlans = figmaAnatomySet(fieldMessage, { swapTarget: SWAP });
const fmPage: Page = { children: [] };
const fmRun = await run(fmPlans, { ...fullFor(fmPlans), page: fmPage });
ok(fmRun.set === 'field-message' && fmRun.variants === 4 && fmRun.added === 4,
  `#1010 the four status members assemble under one set (set=${fmRun.set}, variants=${fmRun.variants}, added=${fmRun.added})`);
// field-message declares ONE caption (Option 2, #1575), so the run is clean — there is nothing to collapse.
// The collapse-report MECHANISM (for a def that DOES declare a divergent spread) stays guarded BY NAME in
// `test-roundtrip.ts` on a synthetic def, so retiring field-message as its exemplar is not a silent gate
// deletion.
const fmCollapse = fmRun.misses.filter((m) => /^text text\.characters -> COLLAPSED/.test(m));
ok(fmCollapse.length === 0 && fmRun.misses.length === 0,
  `#1575 field-message assembles with NO misses — one shared caption behind the bound property, nothing to collapse (${fmRun.misses.join('; ') || 'none'})`);

const fmMembers = fmPage.children[0].children as Node[];
const fmKids = (m: Node): Node[] => (m.children as Node[]) ?? [];
/** The glyph ARTBOARD: `createNodeFromSvg` returns a FRAME wrapping the outline, and it is the only
 *  FRAME a member of this def has — the member itself is the row, the caption is a TEXT. */
const fmArt = (m: Node): Node[] => fmKids(m).filter((c) => c.type === 'FRAME');
const fmVecs = (n: Node): Node[] => (n.findAll as (p: (x: Node) => boolean) => Node[])((x) => x.type === 'VECTOR');
/** The variable a paint points at, by NAME — the shim ids variables `V:<name>`. */
const fmInk = (n: Node): string =>
  String((n.fills as { boundVariables?: { color?: { id?: string } } }[])[0]?.boundVariables?.color?.id ?? 'none').replace(/^V:/, '');

ok(fmMembers.length === 4 && fmMembers.map((m) => m.name).join(' | ') === 'status=default | status=error | status=warning | status=success',
  `#1010 the members are named for the status axis (renamed from tone in #1334), in order (${fmMembers.map((m) => m.name).join(' | ')})`);

// (#1018/#1474/#1567/#1575) THE DEF DECLARES ONE CAPTION — the host can show only one behind a bound property.
//
// #1018/#1474 gave each status its own placeholder via `byVariant.status` (Set A), but the #1567 live-host work
// proved a characters-bound TEXT node is a VIEW onto the set-level property's one `defaultValue` — reading it
// returns that default, writing it writes THROUGH — so a per-member caption is not expressible, and the
// executor's attempt to give it one left the LAST member's string on all four ("All set." everywhere, live).
// The owner kept the property (Option 2, #1575), so the def now declares ONE caption; the members stay distinct
// by GLYPH per status. The collapse-report mechanism a mis-authored spread would trip is guarded BY NAME in
// `test-roundtrip.ts` on a synthetic def.
const fmCaption = (m: Node): string => String(fmKids(m).find((c) => c.type === 'TEXT')?.characters ?? '<none>');
const fmCaptions = fmMembers.map(fmCaption);
const fmDeclared = fmPlans.map((p) => String((p.root.children ?? []).find((c) => c.characters !== undefined)?.characters));
ok(new Set(fmDeclared).size === 1 && fmDeclared[0] === 'This is a status message.',
  `#1575 the def declares ONE caption across all four status members — no byVariant spread (${[...new Set(fmDeclared)].join(' | ')})`);
// AT THE NODE: all four read the set's one declared default, by design.
ok(fmCaptions.every((c) => c === 'This is a status message.'),
  `#1575 every status member reads the set's one declared default at the node (${fmCaptions.join(' | ')})`);
// AND THERE IS NO COLLAPSE: one caption, nothing to overwrite.
ok(fmCollapse.length === 0,
  `#1575 field-message declares one caption, so no collapse is reported (${fmCollapse.length ? fmCollapse.join('; ') : 'none'})`);

// (1) THE DEFAULT MEMBER HAS NO GLYPH, and the three validation members have exactly one each. Read as a
// COUNT PER MEMBER rather than a total: 3 artboards across 4 members is also what "two on error, one on
// success, none on warning" looks like, and that tree would satisfy every other arm below.
const fmArtCounts = fmMembers.map((m) => fmArt(m).length).join(',');
ok(fmArtCounts === '0,1,1,1',
  `#1010 the default member is caption-only and each validation member carries exactly one glyph artboard (${fmArtCounts})`);

// (2) SOMETHING WAS DRAWN. #864's own finding is that this is the question a valid-looking tree cannot
// answer: a named frame with no outline inside is indistinguishable from a glyph that rendered, and "the
// node has children" passes on an empty group. So: a VECTOR, with a non-zero box, per member.
const fmDrawn = fmMembers.slice(1).map((m) => fmVecs(fmArt(m)[0]).filter((v) => (v.width as number) > 0 && (v.height as number) > 0));
ok(fmDrawn.every((vs) => vs.length === 1),
  `#1010 each validation member's artboard holds exactly one VECTOR with a non-zero box — ink, not an empty artboard (${fmDrawn.map((vs) => vs.length).join(',')})`);

// (3) AND IT IS A DIFFERENT DRAWING PER TONE, which is the assertion the placeholder failed. Three
// identical FPO circles in three inks satisfied everything above this line; what they could not do is
// differ in geometry. Asserted as a RELATIONSHIP — three distinct outlines — rather than against three
// expected shapes, because the expected shapes would have to be derived from `ICON_PATHS` the same way the
// glyph itself is, and an oracle computed from the subject cannot fail (docs/34 §2).
//
// ON `vectorPaths` RATHER THAN THE BOX, which is the first thing this arm was written against and was
// wrong: `error-circle` and `check-circle` are one 20px ring with different marks inside, so they measure
// IDENTICALLY — 20.0x20.0 both, live as well as here. Two of the three tones would have compared equal and
// the arm would have failed for the right reason with the wrong diagnosis. The subpath data is the level at
// which "a different drawing" is a fact about the node rather than about its extent.
const fmPaths = fmDrawn.map((vs) => JSON.stringify(vs[0].vectorPaths));
ok(fmDrawn.every((vs) => (vs[0].vectorPaths as unknown[]).length >= 2) && new Set(fmPaths).size === 3,
  `#1010 the three tones draw three DIFFERENT outlines — pairwise distinct subpaths, so one placeholder in three colors fails here (${fmDrawn.map((vs) => (vs[0].vectorPaths as unknown[]).length).join(',')} subpaths, ${new Set(fmPaths).size} distinct)`);

// (4) BOTH AXES BOUND, to the same variable. Two facts in one arm, and the second is not decoration: a
// node still holding Figma's aspect-ratio lock silently EVICTS the first dimension binding when the
// second is set (#682), so "both axes bound" is only reachable through the `unlockAspectRatio()` call.
const fmSizes = fmMembers.slice(1).map((m) => {
  const bv = fmArt(m)[0].boundVariables as Record<string, { id?: string }>;
  return `${String(bv.width?.id).replace(/^V:/, '')}+${String(bv.height?.id).replace(/^V:/, '')}`;
});
ok(fmSizes.every((s) => s === 'icon/size/xs+icon/size/xs'),
  `#1010 every glyph binds BOTH axes to the caption-scale artboard rung (${fmSizes.join(', ')})`);

// (5) THE INK IS ON THE OUTLINE AND NOT ON THE ARTBOARD (#864) — a fill on the wrapper is a painted
// square behind the glyph, which is what an instance-swapped placeholder looked like.
const fmVecInk = fmDrawn.map((vs) => fmInk(vs[0])).join(' | ');
ok(fmVecInk === 'color/icon/danger | color/icon/warning | color/icon/success',
  `#1010 each outline carries its status's semantic ink (${fmVecInk})`);
ok(fmMembers.slice(1).every((m) => (fmArt(m)[0].fills as unknown[]).length === 0),
  `#1010 ...and the artboard itself is unpainted, so the glyph is ink rather than a coloured square (${fmMembers.slice(1).map((m) => (fmArt(m)[0].fills as unknown[]).length).join(',')})`);

// (6) THE OUTLINE SCALES WITH ITS FRAME. The artboard is 24px of viewBox bound to a 16px variable, and a
// child left at Figma's MIN/MIN default keeps the 24 — so the member would show the glyph's top-left
// corner. Every other arm here passes on that tree.
ok(fmDrawn.every((vs) => JSON.stringify(vs[0].constraints) === JSON.stringify({ horizontal: 'SCALE', vertical: 'SCALE' })),
  `#1010 the outline is set to SCALE on both axes, so a 24px drawing fits the 16px artboard (${JSON.stringify(fmDrawn[0][0].constraints)})`);

// (7) NO PLACEHOLDER SURVIVES, stated on the two things the old projection left in the file: an INSTANCE
// node (the nominated FPO component) and an INSTANCE_SWAP property on the set. Both are absent now, and
// absent for the same reason — `figmaProperties.swaps` is empty and no part nests. The swap target is
// still PASSED to `figmaAnatomySet` above, so this is not passing by omission: the def ignores it.
const fmAllNodes = fmMembers.flatMap((m) => [m, ...(m.findAll as () => Node[])()]);
ok(!fmAllNodes.some((n) => n.type === 'INSTANCE'),
  `#1010 no INSTANCE anywhere in the built set — the placeholder was a nominated component, and nothing nominates one now (${fmAllNodes.filter((n) => n.type === 'INSTANCE').length})`);
ok(!fmRun.properties.some((p) => p.indexOf('INSTANCE_SWAP') >= 0),
  `#1010 ...and the set declares no INSTANCE_SWAP property, so a designer cannot put a check mark on the error member (${fmRun.properties.join('/')})`);
ok(fmRun.properties.filter((p) => p.indexOf('TEXT') >= 0).length === 1,
  `#1010 the caption is still a TEXT property, so removing the swap did not take the text wiring with it (${fmRun.properties.join('/')})`);

// =============================================================================================
// #913 — A PARTIAL WRITE IS MARKED, AND THE MARKING CANNOT MAKE THINGS WORSE
// =============================================================================================
// A throw mid-build leaves what it already wrote in the designer's file: Figma parents a created node to
// the current page the moment it exists, so the leftovers are objects on a canvas, not local variables.
// #913's decision is to MARK them — gather them under one visibly labelled frame and name them in the
// verdict — rather than delete them, because `figma.commitUndo()` is called nowhere in this plugin, so the
// whole run is a single undo entry and the unwind already exists.
//
// WHAT IS READ HERE, AND WHY IT IS NOT THE TRAIL. The executor keeps bookkeeping (`WriteTrail.loose`) and
// reports it in `PartialWriteFacts`. Asserting that against itself would be docs/34 shape 1, so every
// assertion below reads the HOST instead: the frame the shim actually holds, its actual children, and the
// `parent` each parked node actually ended up with. The two derivations are then asserted to AGREE — a
// marking that reported 648 parked while parenting 3 is the failure this arrangement exists to catch.
//
// AND WHAT THIS HARNESS CANNOT SEE, stated because it is the reason no existing gate caught the litter in
// the first place: `mkNode` never appends to `page`, so a node created here is not on the shim's page the
// way it is on Figma's. The page-parenting premise is measured in the standalone instrument
// (`measure-913.ts`, attached to the filed issue), not here. The consequence shows up below — after a
// refused `combineAsVariants` the shim's page array still lists the members it re-parented — so the
// re-parenting is read off `node.parent`, which the shim does model, rather than off the page.

// ---- REGIME 1: the small one, and the ORDINARY client failure -------------------------------
// A brand whose typeface is not installed (#680, pinned above as unfixed). The throw lands inside the
// FIRST member's build, before anything reaches the page at all — which is exactly why the count is small
// and why it is the one that gets overlooked and then re-run on top of. Two nodes is not a dramatic
// number; it is the number a designer meets most often.
const smallPage: Page = { children: [] };
let smallErr: unknown = null;
try {
  await run(grid, { ...full(), page: smallPage, styleFont: missingFont, unavailableFonts: [missingFont] });
} catch (e) { smallErr = e; }
const smallFacts = partialWriteOf(smallErr);
ok(smallErr !== null && (smallErr as Error).message.indexOf('unloaded font') >= 0,
  `#913 the HOST'S OWN ERROR still escapes, unwrapped and unreplaced — the throw is what the designer needs to see (${(smallErr as Error)?.message?.slice(0, 52)}…)`);
ok(smallFacts !== null, '#913 ...and it carries the facts about what was left behind, attached rather than substituted');
// The FRAME, read off the page — the independent half. `findOne` is the shim's, so this is the same
// question a designer's eye asks: is there one labelled thing on this page?
const smallFrames = smallPage.children.filter((c) => c.type === 'FRAME' && String(c.name).startsWith('⚠ Prism3 partial build'));
ok(smallFrames.length === 1, `#913 exactly one marking frame reached the page (${smallFrames.length})`);
const smallFrame = smallFrames[0];
ok(smallFacts!.loose > 0,
  `#913 reachable: the build really did leave nodes behind before it threw (${smallFacts!.loose}) — a zero here would make every assertion in this block vacuous`);
ok(smallFrame !== undefined && (smallFrame.children as Node[]).length === smallFacts!.loose,
  `#913 the frame HOLDS what the verdict claims: ${(smallFrame?.children as Node[])?.length} children against ${smallFacts!.loose} reported`);
ok(smallFacts!.parked === smallFacts!.loose && smallFacts!.markError === null,
  `#913 ...and the marking is reported as complete, with no failure of its own (parked ${smallFacts!.parked}/${smallFacts!.loose})`);
// RE-PARENTED, not merely listed. `appendChild` sets `parent`, and a frame whose `children` array holds
// nodes still parented elsewhere would be a frame a designer could not use to find them.
ok((smallFrame.children as Node[]).every((c) => c.parent === smallFrame),
  '#913 every parked node is really parented to the frame, not just listed in its children array');
// The COUNT IS IN THE NAME, and the name is built from the bookkeeping while the children are host state —
// so a marking that lied about how many it gathered fails here rather than reading plausibly.
ok(String(smallFrame.name).indexOf(`(${smallFacts!.loose} node`) >= 0,
  `#913 the frame's own label states the count it holds, so the litter is findable by reading it (${smallFrame.name})`);
ok(String(smallFrame.name).indexOf('button') >= 0 && String(smallFrame.name).indexOf('undo') >= 0,
  '#913 ...and names the component it was building and the way out');
// THE PROSE THE DESIGNER ACTUALLY READS, in both halves. The pill has to carry the number: two nodes and
// 648 both reading `✗ write failed` is the defect this closes, and the small case is the one it matters for.
ok(partialWriteHeadline(smallFacts!).indexOf(String(smallFacts!.loose)) >= 0,
  `#913 the verdict pill carries the count in the SMALL regime (${partialWriteHeadline(smallFacts!)})`);
ok(partialWriteNote(smallFacts!).indexOf(String(smallFrame.name)) >= 0,
  '#913 ...and the note names the frame, which is the only pointer the panel can give');

// ---- REGIME 2: the large one --------------------------------------------------------------
// Every member built, named and on the page, and then the single call that would gather them refuses. The
// count here is the whole set: 648 for the full Button grid live, 21 for the grid this harness drives.
const bigPage: Page = { children: [] };
let bigErr: unknown = null;
try {
  await run(grid, { ...full(), page: bigPage, refuse: { combine: true } });
} catch (e) { bigErr = e; }
const bigFacts = partialWriteOf(bigErr);
ok((bigErr as Error)?.message?.indexOf('combineAsVariants') >= 0,
  `#913 the refusal itself still reaches the user (${(bigErr as Error)?.message?.slice(0, 52)}…)`);
// EXPECTED from the PLANS, not from the executor's count: `grid.length` is what was asked for, and every
// member is loose once the combine refuses. This is the arm that would catch the trail losing members.
ok(bigFacts !== null && bigFacts.loose === grid.length,
  `#913 the large regime strands the whole set — one loose node per member asked for (${bigFacts?.loose} of ${grid.length})`);
const bigFrame = bigPage.children.find((c) => c.type === 'FRAME' && String(c.name).startsWith('⚠ Prism3 partial build'));
ok(bigFrame !== undefined && (bigFrame.children as Node[]).length === grid.length,
  `#913 ...and all of them are gathered under one frame (${(bigFrame?.children as Node[])?.length})`);
ok((bigFrame!.children as Node[]).every((c) => c.parent === bigFrame), '#913 ...each really re-parented to it');
// THE PARKED NODES ARE THE MEMBERS, checked by NAME against what the plans asked for. This is the arm that
// catches the trail holding the wrong objects — a pre-conversion root, a part, a stale duplicate — which a
// count alone cannot see. (The frame-vs-component distinction is NOT observable here: this shim's
// `createComponentFromNode` is the identity, deliberately, so the two are one object. Only the live host
// can tell them apart, which is why the executor's own delete-then-add ordering is written for both.)
const bigNames = new Set((bigFrame!.children as Node[]).map((c) => String(c.name)));
const wantNames = new Set(grid.map(planComponentName));
ok(bigNames.size === wantNames.size && [...wantNames].every((n) => bigNames.has(n)),
  `#913 ...and they are the members the plans named, not some other nodes that happen to number ${grid.length}`);
ok(partialWriteHeadline(bigFacts!).indexOf(String(grid.length)) >= 0,
  `#913 the verdict pill carries the count in the LARGE regime too — same shape, one number (${partialWriteHeadline(bigFacts!)})`);
// The two regimes must produce the same SHAPE of verdict. Tuning the reporting for the dramatic case is
// how the two-node case ends up invisible, so the pills are compared by form rather than by content.
ok(/^✗ failed, \d+ parked$/.test(partialWriteHeadline(smallFacts!)) && /^✗ failed, \d+ parked$/.test(partialWriteHeadline(bigFacts!)),
  '#913 both regimes render the same verdict shape, so neither is the special case');

// ---- THE MARKING'S OWN FAILURE -------------------------------------------------------------
// The premise of the whole design: this runs on a host that has just refused a call, so it must be able to
// refuse the next one. Two things are then required, and the second is the load-bearing one — the nodes
// are still in the file, so the verdict must still say so. A marking that reported a clean file here would
// be worse than no marking at all.
const cannotMarkPage: Page = { children: [] };
let cannotMarkErr: unknown = null;
try {
  await run(grid, { ...full(), page: cannotMarkPage, refuse: { combine: true, createFrame: 'on-failure-path' } });
} catch (e) { cannotMarkErr = e; }
const cmFacts = partialWriteOf(cannotMarkErr);
ok((cannotMarkErr as Error)?.message?.indexOf('combineAsVariants') >= 0,
  `#913 a marking that fails does NOT mask the original cause — the refusal is still the message (${(cannotMarkErr as Error)?.message?.slice(0, 52)}…)`);
ok(cmFacts !== null && cmFacts.loose === grid.length && cmFacts.parked === 0 && cmFacts.frame === null,
  `#913 ...and the nodes are still reported as present, unparked (loose ${cmFacts?.loose}, parked ${cmFacts?.parked}, frame ${String(cmFacts?.frame)})`);
ok(cmFacts!.markError !== null && cmFacts!.markError!.indexOf('not editable') >= 0,
  `#913 ...with the marking's own failure named beside the cause rather than swallowed (${cmFacts?.markError})`);
ok(!cannotMarkPage.children.some((c) => String(c.name).startsWith('⚠ Prism3 partial build')),
  '#913 reachable: no frame was made, so the assertions above are about the unparked path');
ok(partialWriteNote(cmFacts!).indexOf('loose on this page') >= 0 && partialWriteNote(cmFacts!).indexOf(String(grid.length)) >= 0,
  '#913 the note tells the designer the nodes are loose and how many — the one thing it must never get wrong');

// ---- AND NOTHING IS MARKED WHEN NOTHING FAILED ---------------------------------------------
// The cost of this feature is a write on the failure path. It must be exactly zero on the success path:
// a marking frame appearing on a clean build would be litter created by the litter-detector.
const cleanPage: Page = { children: [] };
const cleanRun = await run(grid, { ...full(), page: cleanPage });
ok(cleanRun.variants === grid.length && !cleanPage.children.some((c) => String(c.name).startsWith('⚠')),
  `#913 a clean build creates no marking frame at all (${cleanPage.children.length} page child/children, ${cleanRun.variants} members)`);
// A run that fails WITHOUT writing keeps its old verdict, which is the third state. Two hosts, because one
// of them cannot see the defect and it took a mutation to notice:
//
//  · `planSetLayout` refuses an incoherent plan set (two components at one coordinate) on a host that
//    ACCEPTS EVERYTHING. This is the case that matters, and the one the first version of this block
//    missed: nothing was written, so nothing may be marked, and a frame reading "(0 nodes; undo to
//    remove)" would be litter produced by the litter-collector. Measured — deleting the executor's
//    `nodes.length === 0` short-circuit left this whole block green, because the only host it drove was
//    one that refuses `createFrame` and therefore could not have produced a frame either way. A right
//    comparison over a set that excludes the failing case (docs/34 shape 15).
//  · the host refusing the build's very first node, which is the same terminal state reached a different
//    way and is kept because it is the one a client meets.
const refusedPage: Page = { children: [] };
let refusedErr: unknown = null;
try { await run([grid[0], { ...grid[0] }], { ...full(), page: refusedPage }); } catch (e) { refusedErr = e; }
ok(refusedErr !== null && (refusedErr as Error).message.indexOf('share a component name') >= 0,
  '#913 reachable: an incoherent plan set is refused before the first create, on a host that accepts everything');
ok(partialWriteOf(refusedErr) === null,
  '#913 a throw before the first write attaches no partial-write facts, so its verdict is unchanged');
ok(refusedPage.children.length === 0,
  `#913 ...and NO marking frame is created for a file nothing reached, on a host that would have accepted one (${refusedPage.children.length} page children)`);

const nothingPage: Page = { children: [] };
let earlyErr: unknown = null;
try { await run(grid, { ...full(), page: nothingPage, refuse: { createFrame: 'always' } }); } catch (e) { earlyErr = e; }
const earlyFacts = partialWriteOf(earlyErr);
ok(earlyErr !== null && (earlyFacts === null || earlyFacts.loose === 0),
  `#913 the same holds when it is the HOST that refused the first node (${earlyFacts === null ? 'no facts' : earlyFacts.loose + ' loose'})`);
ok(nothingPage.children.length === 0, `#913 ...and nothing was put on that page either (${nothingPage.children.length})`);

// =============================================================================================
// #1011 — THE SELECTION CONTROL'S BOX, READ OFF THE NODE THE EXECUTOR BUILT
// =============================================================================================
//
// WHY THESE ASSERTIONS ARE HERE AND NOT IN A PLAN-LEVEL TEST. Every one of #1011's three findings is a
// value that RESOLVES. The def named real tokens, the projector returned them, the census recorded them
// and the whole suite was green; what was wrong was only visible to a person looking at a Figma member.
// A plan-level check reads the same expectation the projector wrote, so the last place a wrong pairing
// can still be caught is the node — which is what this harness has and nothing else in the repo does.
//
// AND WHY THEY ARE NOT A RESTATEMENT OF `lint-paint.ts` ARM 4. That arm holds the generalizable RULE
// (a fill clearing 3:1 against the page is the box's own boundary, so a same-family border beside it is
// redundant) over every def in the corpus, computed from resolved token VALUES. These assertions hold
// the hand-authored EXPECTATION for the three defs the issue names, taken from the reference
// implementation quoted in it — unselected is transparent with a 1px border, selected is a solid fill
// with no separate border — and read off built nodes. Two different oracles for two different subjects;
// neither is derived from the other, and neither is derived from the def.
//
// `fills`/`strokes` EMPTY MEANS "the executor bound no paint here", which is the subject. Whether Figma
// then shows its own default white frame fill is a separate, executor-side concern (#865) that this shim
// deliberately does not model — a shim that seeded a default fill would make the no-fill claim below
// unfalsifiable rather than more realistic.
const paintVar = (n: Node, prop: 'fills' | 'strokes'): string | null => {
  const arr = (n[prop] as { boundVariables?: { color?: { id: string } } }[] | undefined) ?? [];
  const id = arr[0]?.boundVariables?.color?.id;
  return id ? id.replace(/^V:/, '') : null;
};
/** `color/interactive/primary/fill/selected` → `interactive/primary`; `color/border/danger` → null. */
const famOf = (v: string): string | null => {
  const m = v.match(/^color\/(.+)\/(?:fill|border|overlay)(?:\/.+)?$/);
  return m ? m[1] : null;
};
type BoxRow = { def: string; member: string; selection: string; state: string; size: string; fill: string | null; stroke: string | null; radii: string[]; weight: string | null; weightPx: unknown };
const readBoxes = async (def: ComponentDef, boxName: string): Promise<{ rows: BoxRow[]; misses: string[]; members: number }> => {
  const plans = figmaAnatomySet(def, { swapTarget: SWAP });
  const page: Page = { children: [] };
  const r = await run(plans, { ...fullFor(plans), page });
  // The SET'S CHILDREN, not every node on the page: `createComponentFromNode` returns the frame it was
  // handed (in the shim and in Figma both, as far as `type` goes here), so a `type === 'COMPONENT'`
  // filter finds nothing — which the reachability pin below caught rather than passing vacuously.
  const set = page.children.find((n) => n.type === 'COMPONENT_SET');
  const members = (set?.children as Node[] | undefined) ?? [];
  const rows: BoxRow[] = [];
  for (const p of plans) {
    const member = members.find((n) => n.name === planComponentName(p));
    // The box is usually a CHILD found by name (radio's `control`, switch's `track`). Since #1226 step 2
    // it can also BE the member root: `checkbox-control`'s `control` part is its anatomy root, so it
    // materializes as the member frame itself (named by the coordinate, not 'control'), the same shape
    // button's `container` has. Fall back to the member frame when the sought box is the def's root.
    const box = member && (allNodes(member).find((n) => n.name === boxName)
      ?? (def.anatomy?.root === boxName ? member : undefined));
    if (!box) continue;
    const coord = (p as unknown as { coord: Record<string, string> }).coord;
    const bv = (box.boundVariables as Record<string, { id?: string }>) ?? {};
    rows.push({
      def: def.id,
      member: member!.name as string,
      selection: coord.selection,
      state: coord.state ?? 'rest',
      // The SIZE rung, carried since #1015 — the corner is now per-rung, so a claim about it that could
      // not tell `small` from `large` would pass on one variable bound at all three.
      //
      // Off `plan.size`, NOT off `coord`: `figmaAnatomySet` keeps `size` out of the coord on purpose, so
      // that a structure-only plan can have an EMPTY one. Read from `coord` it comes back `undefined`,
      // which made every per-rung expectation `control/size/undefined/radius` and every value arm
      // vacuous — caught by the reachability arm beside them, which is what those arms are for.
      size: (p as unknown as { size?: string }).size ?? '',
      fill: paintVar(box, 'fills'),
      stroke: paintVar(box, 'strokes'),
      radii: ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']
        .map((c) => (bv[c]?.id ?? '—').replace(/^V:/, '')),
      // THE BORDER'S THICKNESS, carried since #1228 — both the bound variable's NAME and the LITERAL the
      // node ended up with. Two fields because they fail on different regressions: the name goes wrong when
      // the def rebinds, the literal goes non-zero when an executor writes over the binding (which live is
      // an unbind, so the name alone cannot see it). #1332 — the weight binds PER-SIDE on the host (the
      // shim models this), so the name is read off `strokeTopWeight`; `??` keeps a scalar binding readable too.
      weight: (bv.strokeWeight?.id ?? bv.strokeTopWeight?.id)
        ? (bv.strokeWeight?.id ?? bv.strokeTopWeight!.id)!.replace(/^V:/, '') : null,
      weightPx: box.strokeWeight,
    });
  }
  return { rows, misses: r.misses, members: r.variants };
};

ok(!!byId('checkbox-control') && !!byId('radio-control') && !!byId('switch-control'),
  '#1011 reachable: all three selection-control ATOMS resolve from their ids');
// #1226 step 2 / #1354 / #1348 — the painted box moved off `checkbox`/`switch`/`radio` (now Rows that nest
// it) into the atomic `checkbox-control`/`switch-control`/`radio-control`, so the box these arms read off
// the built node is the atom's. The atom's box is its member ROOT (see the fallback in `readBoxes`):
// `checkbox-control`'s `control`, `switch-control`'s `track` and `radio-control`'s `control` are each
// their def's anatomy root.
const cb = await readBoxes(byId('checkbox-control')!, 'control');
const rb = await readBoxes(byId('radio-control')!, 'control');
const sw = await readBoxes(byId('switch-control')!, 'track');
// PIN THE INPUT, same discipline as the Button block: every claim below is vacuously true over zero rows.
ok(cb.rows.length === 54 && rb.rows.length === 36 && sw.rows.length === 24,
  `#1011 reachable: the built boxes were found on every member (checkbox ${cb.rows.length}/54, radio ${rb.rows.length}/36, switch ${sw.rows.length}/24)`);
ok(cb.misses.length === 0 && rb.misses.length === 0 && sw.misses.length === 0,
  `#1011 ...and all three sets built with no misses (${[...cb.misses, ...rb.misses, ...sw.misses].join('; ') || 'none'})`);

// ---- FINDING 2: the unselected box has NO fill ------------------------------------------------
// `color.field.fill` is an opaque near-white — 1.00–1.22:1 against the page across the corpus — so
// binding it painted a box invisible against its own ground that nonetheless occluded whatever the
// control sits on. The reference ships this transparent.
const empty = [...cb.rows, ...rb.rows].filter((r) => r.selection === 'unchecked');
// 18 + 18: each def has 3 sizes × 6 states at its one unselected coordinate.
ok(empty.length === 18 + 18, `#1011 reachable: there are unselected members to inspect (${empty.length})`);
ok(empty.every((r) => r.fill === null),
  `#1011 the unselected box binds NO fill on any member (${empty.filter((r) => r.fill !== null).map((r) => `${r.def} ${r.member} -> ${r.fill}`).join('; ') || 'none does'})`);
ok(empty.every((r) => r.stroke !== null),
  '#1011 ...and every one still binds a stroke — an outline box with neither would have no edge at all, which is the way this fix could have gone wrong');

// ---- FINDING 3: the filled box has NO second edge, and the relationship is what is asserted ----
// The two-value form of this check — `fill === X && border === Y` — passes on exactly the configuration
// that shipped, so it is the CO-OCCURRENCE that is asserted here, not either value.
// #1348: radio's selected RING is OUTLINED (the Prism 2 visual — constant WEIGHT, inner dot; it recolors on
// select per #1423 but never fills), so it is NOT a filled selected box and is asserted separately below. This finding is checkbox's checked/
// indeterminate + switch's ON, the two controls that fill on select.
const filled = [...cb.rows, ...sw.rows].filter((r) => !['unchecked', 'off'].includes(r.selection));
// 36 (checkbox: `checked` + `indeterminate`, 3 sizes × 6 states) + 12 (switch `on`, which has a two-rung
// size ladder rather than three). Radio left this set at #1348 — its selected ring is not filled.
ok(filled.length === 36 + 12, `#1011 reachable: there are selected (filled) members to inspect (${filled.length})`);
ok(filled.every((r) => r.fill !== null), '#1011 every selected box (checkbox, switch) binds a fill');
const strokedNotError = filled.filter((r) => r.state !== 'error' && r.stroke !== null);
ok(strokedNotError.length === 0,
  `#1011 no selected box binds BOTH a fill and a stroke outside \`error\` (${strokedNotError.map((r) => `${r.def} ${r.member} -> ${r.fill} + ${r.stroke}`).slice(0, 3).join('; ') || 'none does'})`);
// The error rim SURVIVES, and it has to be asserted in the same breath: the fix removes a border and the
// cheapest way to overshoot it is to remove this one too, which would drop a validation signal.
const errored = filled.filter((r) => r.state === 'error');
ok(errored.length > 0 && errored.every((r) => r.stroke === 'color/border/danger' && r.fill !== null),
  `#1011 ...and every selected box at \`error\` still binds the danger rim over its fill (${errored.length} member(s))`);

// ---- #1348/#1423: RADIO'S RING — outlined, constant WEIGHT, RECOLORS on select, read off the BUILT node --
// The owner's decision (#1348): the outer ring's border WEIGHT stays constant across states (it was the
// filled disc reading as a thickened border that was the defect), and selection shows an inner filled
// circle inside the ring (the dot — a separate box, its presence pinned in the engine suite's #1348 block,
// not here). So the RING binds NO fill at ANY member and a 2px border at every non-error member, unchecked
// and checked ALIKE — that WEIGHT constancy is the surviving half of "the border does not change on select".
// #1423 then rebound the ring to RECOLOR on select (constant weight, brand COLOR when checked, matching
// Prism 2 literally); the recolor is pinned in the selection loop just below. Reverting to the pre-split
// filled disc (a `checked.fill`, no `checked.border`) fails these by name: a filled checked ring trips the
// no-fill arm, and a checked ring with no border trips the constant-weight arm.
ok(rb.rows.length === 36, `#1348 reachable: radio-control built every member (${rb.rows.length}/36)`);
ok(rb.rows.every((r) => r.fill === null),
  `#1348 radio's ring binds NO fill at any member — the Prism 2 outlined model, not a filled disc (${rb.rows.filter((r) => r.fill !== null).map((r) => `${r.member} -> ${r.fill}`).slice(0, 3).join('; ') || 'none does'})`);
ok(rb.rows.filter((r) => r.state !== 'error').every((r) => r.stroke !== null && r.weight === 'border-width/thick'),
  `#1348 radio's ring binds a CONSTANT 2px border (\`border-width/thick\`) at every non-error member, unchecked and checked alike — the border weight does not change on select (${rb.rows.filter((r) => r.state !== 'error' && r.weight !== 'border-width/thick').map((r) => `${r.member} -> ${r.weight}`).slice(0, 3).join('; ') || 'all thick'})`);
// RECOLORS ACROSS SELECTION (#1423), read off the BUILT node — the sharpest form of the rebind: at each
// interactive non-error state the UNCHECKED ring resolves the neutral field-border edge and the CHECKED
// ring the interactive brand edge, so the two DIFFER. Only the stroke COLOR moves; the WEIGHT is constant
// (asserted above). Keyed off the built members by state × selection, so reverting `checked.border.*` back
// to `color.field.border.*` (the pre-#1423 constant-colour ring, now the fork the atom documents) collapses
// the two families back to one and fails these by name — the host-truth mirror of the engine suite's #1423 arm.
for (const st of ['rest', 'hover', 'pressed', 'focus-visible']) {
  const uStrokes = new Set(rb.rows.filter((r) => r.state === st && r.selection === 'unchecked').map((r) => r.stroke));
  const cStrokes = new Set(rb.rows.filter((r) => r.state === st && r.selection === 'checked').map((r) => r.stroke));
  const u = [...uStrokes][0], c = [...cStrokes][0];
  ok(uStrokes.size === 1 && cStrokes.size === 1
     && !!u && u.startsWith('color/field/border')
     && !!c && c.startsWith('color/interactive/primary/border')
     && u !== c,
    `#1423 radio's ring RECOLORS across selection at \`${st}\` — unchecked resolves the field-border edge and checked the interactive brand edge, differing (unchecked ${u ?? 'none'}, checked ${c ?? 'none'})`);
}
// At `disabled` the two selections still share the contrast-exempt disabled skin, so the ring is CONSTANT
// across selection there — one stroke, unchecked and checked alike (the recolor is an interactive-state
// affordance, not a disabled one).
const disRows = rb.rows.filter((r) => r.state === 'disabled');
const disStrokes = new Set(disRows.map((r) => r.stroke));
ok(disRows.length > 0 && disStrokes.size === 1,
  `#1348 radio's ring is CONSTANT across selection at \`disabled\` — the shared disabled skin (${[...disStrokes].join(', ') || 'none'})`);
const rErrored = rb.rows.filter((r) => r.state === 'error');
ok(rErrored.length > 0 && rErrored.every((r) => r.stroke === 'color/border/danger'),
  `#1348 ...and the danger rim survives at \`error\` on the unfilled ring (${rErrored.length} member(s))`);

// THE ONE PLACE A SAME-FAMILY FILL AND BORDER LEGITIMATELY CO-OCCUR, asserted in BOTH directions so the
// exception is exercised rather than merely tolerated. Switch's OFF track keeps its rim because no
// neutral fill clears 3:1 against the page at any brand — that rim is the only edge the track has, and a
// "consistency" pass that stripped it would break 1.4.11. Naming it here means such a pass fails.
const sameFamily = [...cb.rows, ...rb.rows, ...sw.rows]
  .filter((r) => r.fill && r.stroke && famOf(r.fill) !== null && famOf(r.fill) === famOf(r.stroke));
ok(sameFamily.length > 0, `#1011 reachable: some built box does bind a same-family fill and stroke (${sameFamily.length})`);
ok(sameFamily.every((r) => r.def === 'switch-control' && r.selection === 'off'),
  `#1011 ...and switch-control's OFF track is the ONLY one (${[...new Set(sameFamily.map((r) => `${r.def}/${r.selection}`))].join(', ')})`);
ok(sw.rows.filter((r) => r.selection === 'off' && r.state !== 'error').every((r) => r.fill !== null && r.stroke !== null),
  '#1011 ...and it binds both on every non-error member, so the exception above is a fact about this build and not a hole');

// ---- FINDING 1: the radius — the clamped control corner (#1011 → #1015) ------------------------
// The issue asked for 2px and this block used to answer "the binding is correct, `radius.sm` resolves to
// 2 on four of five brands and aurora's 4 is its own `radiusScale` lever". Both halves were true and the
// conclusion was wrong: `radius.sm` is a rung on the CARD ramp, so one value served three box sizes and
// aurora's 4px landed on a 12px `small` square — a third of its edge. #1015 replaced it with
// `control.size.<rung>.radius` = `min(radius.sm, snap2(edge ÷ 8))`, per rung.
//
// THIS GATE HAS TO SPAN TWO THINGS THAT NEITHER HALF OF THE REPO CAN SEE ALONE, which is why it is here
// and not split the way #1010's was. The shim gives every variable a SYNTHETIC value (see its header), so
// a built node can only tell you WHICH variable a corner binds — never what that variable holds. The
// engine's suite knows what it holds but builds no node. So: arm 1 reads the NAME off the built corner,
// arm 2 resolves THAT NAME in each real brand's tree and compares it to the clamp recomputed here. The
// composition is the claim — the name checked for a value is the name the node was found binding.
//
// INDEPENDENT, and the arithmetic below is deliberately RESTATED rather than imported. `controlRadius`
// is exported from `scale.ts` and calling it would turn arm 2 into `f(x) === f(x)`: green on the old
// ramp, green on any formula, and reported as a pass rather than as silence (docs/34).
const RUNG_OF: Record<string, string> = { small: 'sm', medium: 'md', large: 'lg' };
const clampPx = (edge: number, smPx: number) => Math.min(smPx, Math.round((edge / 8) / 2) * 2);
// (1) THE NAME, per rung. Authored from the def's size axis rather than read off the plan, so a corner
// bound to the WRONG rung's variable — `lg` at `small`, the single most likely slip in a `{size}`
// interpolation — fails here instead of resolving to a real variable and looking fine.
const misbound = cb.rows.filter((r) => !r.radii.every((v) => v === `control/size/${RUNG_OF[r.size]}/radius`));
ok(misbound.length === 0,
  `#1015 checkbox's box binds \`control.size.<rung>.radius\` on all four corners of every member, at ITS OWN rung (${misbound.length ? misbound.slice(0, 3).map((r) => `${r.member} [${r.size}] -> ${[...new Set(r.radii)].join('|')}`).join('; ') : [...new Set(cb.rows.map((r) => `${r.size}→${r.radii[0]}`))].join(', ')})`);
// …and all three rungs are actually present, or the arm above is true over one size.
ok(new Set(cb.rows.map((r) => r.size)).size === 3,
  `#1015 reachable: all three size rungs are among the built members (${[...new Set(cb.rows.map((r) => r.size))].join(', ')})`);
// (2) THE VALUE that name resolves to, in every brand reachable from here — nb through its fixture,
// aurora and harbor through the committed example briefs. Expected is recomputed from the brand's OWN
// two inputs (the box edge out of `control.size`, `radius.sm` out of the radius ramp); actual is the px
// the corner's variable resolves to after `deref`, which is what a consumer following the alias gets.
const brandThemes: Array<{ id: string; theme: ReturnType<typeof nbTheme> }> = [
  { id: 'nb', theme: nbTheme() },
  ...Object.entries(exampleBrands()).map(([id, input]) => ({ id, theme: brandTheme(input as never) })),
];
const badPx: string[] = [];
const clampedBelow: string[] = [];
for (const { id, theme } of brandThemes) {
  const tree = buildTree(theme).tree as Record<string, any>;
  const grp = tree[Object.keys(tree)[0]]?.control?.size;
  const smPx = theme.dims.radius.find((r) => r.name === 'sm')?.px ?? 0;
  for (const c of theme.dims.controls) {
    // Keyed by the rung the BUILT NODE named, not by iterating the tier — that is what makes this arm a
    // statement about the corner the node carries rather than about the token tier in isolation.
    const rung = RUNG_OF[cb.rows.find((r) => RUNG_OF[r.size] === c.name)?.size ?? ''];
    if (rung !== c.name) continue;
    const leaf = grp?.[rung]?.radius;
    const got = leaf ? pxOf(tree as never, leaf) : undefined;
    const want = clampPx(c.height, smPx);
    if (got !== want) badPx.push(`${id} ${rung}: ${got} ≠ min(${smPx}, snap2(${c.height}÷8)) = ${want}`);
    if (got !== smPx) clampedBelow.push(`${id} ${rung} (${smPx}→${got})`);
  }
}
ok(badPx.length === 0,
  `#1015 ...and that variable resolves to \`min(radius.sm, snap2(edge ÷ 8))\` in every brand reachable here — the built corner carries the CLAMP, not the card ramp (${badPx.length ? badPx.join('; ') : brandThemes.map((b) => b.id).join(', ') + ' all agree'})`);
// The arm that fails if someone drops the `min` for a bare ratio, or reverts to the ramp. Aurora is the
// only brand where the two answers differ (radius.sm 4 on 12/16/20px edges → 2 at every rung), so
// without it arm (2) above cannot tell the clamp from `radius.sm` bound verbatim.
ok(clampedBelow.some((c) => c.startsWith('aurora')),
  `#1015 ...and aurora's corner is CLAMPED BELOW its \`radius.sm\` at some rung — the discriminating brand, without which the arm above passes on the old ramp binding too (clamped: ${clampedBelow.length ? clampedBelow.join(', ') : 'NONE'})`);
// CHECKBOX ONLY, asserted rather than intended. Radio keeps `radius.round` and switch its track rung; a
// change that swept the clamp across every selection control fails here.
ok(rb.rows.every((r) => r.radii.every((v) => v === 'radius/round')),
  `#1011/#1015 ...and radio's binds \`radius.round\` still, so the two controls are distinguished by shape at the node and the clamp did not sweep the family (${[...new Set(rb.rows.flatMap((r) => r.radii))].join(', ')})`);

// ---- #1266: THE RING'S STROKE WEIGHT, READ BACK OFF THE BUILT NODE ----------------------------
// THE FIRST READ-BACK ON `strokeWeight` IN THIS SUITE, AND THAT ABSENCE IS WHY THE DEFECT SHIPPED
// (docs/34 §3 — a property with no read-back has no oracle, so three passes over this exact node
// missed it). #801 measured the ring's POSITION, #802 its PAINT, #1011 its RADIUS; every one of them
// walked the built ring and none of them looked at how thick it was. It was 1px in every brand, all
// four of which emit `focus.ring.width: 2`, and because every host sites the part at
// `-(offset + ring-width)` — the stroke draws INWARD across the gap — the built gap was 3px where 2px
// was designed. Both halves are invisible to a plan-only assertion: the plan is right, the executor's
// `if (!node.strokeWeight) node.strokeWeight = 1` fallback is what wrote the wrong number.
//
// SO THE ACTUAL HERE IS THE NODE, and what is asserted is the bound variable's NAME rather than a
// number, exactly as the #1011 radius arms above do. A number would pass on a stroke that happens to
// be 2 for the wrong reason (an executor literal, a brand coincidence); the name fails on both of the
// ways this can regress — the binding going away and returning the node to the 1px fallback, and the
// binding pointing at some other token that resolves to 2 on one brand.
const ringDef = byId('focus-ring');
ok(!!ringDef, '#1266 reachable: `focus-ring` resolves from its id');
const ringPlans = figmaAnatomySet(ringDef!, {});
const ringPage: Page = { children: [] };
const ringRun = await run(ringPlans, { ...fullFor(ringPlans), page: ringPage });
// THE RING **IS** THE MEMBER, which is why this reads the member node rather than searching for a part
// named `ring` inside it: `focus-ring`'s anatomy is one part and it is the root, so the executor builds
// it as the member frame and `planComponentName` RENAMES it to its coordinate (`surface=default`). An
// `allNodes(m).find((n) => n.name === 'ring')` — the shape the #1011 block above uses, correctly, for a
// CHILD part — finds nothing here, and the reachability pin below is what said so rather than 2 arms
// passing over zero rings.
const builtRings = (((ringPage.children.find((n) => n.type === 'COMPONENT_SET')?.children) as Node[] | undefined) ?? [])
  .map((m) => ({ member: m.name as string, node: m }));
// PIN THE INPUT FIRST, same discipline as the two blocks above: every claim below is vacuously true
// over zero rings, and the `offset` axis is deliberately unprojected (#795) so the set is 2 members —
// `surface=default` and `surface=inverse` — not 4.
ok(ringPlans.length === 2 && builtRings.length === 2,
  `#1266 reachable: the projected set built and its ring node was found on every member (${builtRings.length}/${ringPlans.length})`);
ok(ringRun.misses.length === 0,
  `#1266 ...with no misses, so the weight variable RESOLVED rather than being reported absent (${ringRun.misses.join('; ') || 'none'})`);
const weightOf = (n: Node): string | null => {
  // #1332 — the weight binds per-side on the host (the shim models this), so read the binding off any
  // one side; the scalar `strokeWeight` key is left unbound. `??` keeps this reading a scalar binding too,
  // so it stays honest if a caller ever hands it a node bound the old way.
  const bv = (n.boundVariables as Record<string, { id?: string }> | undefined) ?? {};
  const id = bv.strokeWeight?.id ?? bv.strokeTopWeight?.id;
  return id ? id.replace(/^V:/, '') : null;
};
ok(builtRings.every((r) => weightOf(r.node) === 'focus/ring/width'),
  `#1266 every built ring binds \`focus.ring.width\` as its stroke weight (${builtRings.map((r) => `${r.member} -> ${weightOf(r.node) ?? 'UNBOUND (the 1px executor fallback)'}`).join('; ')})`);
// AND THE FALLBACK STOOD DOWN, which is a second fact and not the same one. Live, writing
// `node.strokeWeight = 1` AFTER `setBoundVariable('strokeWeight', v)` UNBINDS the variable — Figma
// treats a literal assignment as the designer overriding the binding — so a build that both bound the
// weight and then ran the fallback would satisfy the arm above in this shim (which records the binding
// separately) and ship a 1px ring anyway. The shim starts a FRAME at `strokeWeight: 0` precisely so
// the executor's `if (!node.strokeWeight)` fires as it does live, which makes "nothing wrote a literal"
// observable as 0. That is what gates the `wrote.includes('strokeWeight')` half of the fix.
ok(builtRings.every((r) => r.node.strokeWeight === 0),
  `#1266 ...and no literal weight was written over the binding, which live would unbind it (${builtRings.map((r) => `${r.member} -> ${r.node.strokeWeight}`).join('; ')})`);
// THE NEGATIVE CONTROL, because the fix is a GATE on an existing default and the cheapest way to pass
// the arms above is to delete the default outright. A box that paints a stroke and binds no weight must
// still get the 1px fallback: without it Figma leaves `strokeWeight` at 0 and the stroke paints nothing
// at all — a border silently absent rather than a thin one, which is worse than the bug being fixed.
// Built from the same plan with the binding stripped, so the two runs differ in exactly one thing.
const unboundPlans = (JSON.parse(JSON.stringify(ringPlans)) as AnatomyPlan[]).map((p) => {
  delete (p.root as { bound?: Record<string, string> }).bound?.strokeWeight;
  return p;
});
const unboundPage: Page = { children: [] };
await run(unboundPlans, { ...fullFor(unboundPlans), page: unboundPage });
const unbound = ((unboundPage.children.find((n) => n.type === 'COMPONENT_SET')?.children) as Node[] | undefined) ?? [];
ok(unbound.length === 2, `#1266 reachable: the binding-stripped variant built the same two rings (${unbound.length}/2)`);
ok(unbound.every((n) => weightOf(n) === null && n.strokeWeight === 1),
  `#1266 ...and with nothing bound the 1px fallback STILL fires, so the fix gates the default rather than removing it (${unbound.map((n) => `${weightOf(n) ?? 'unbound'}@${n.strokeWeight}`).join('; ')})`);

// ---- #1228: THE THREE MEASURED CONTROLS' BORDERS, READ BACK OFF THE BUILT NODE -----------------
// #1266 gave `strokeWeight` its first read-back and the focus ring its first bound thickness. The same
// 1px fallback was writing every OTHER border in the corpus, and Prism 2 measures these three at 2:
// `strokeWeight: 2` on the checkbox's root (`checkboxes.json`), on the radio's (`radio-button.json`) and
// on the switch's track (`toggle-switch.json`). The switch's is the load-bearing one — the off track's
// border is the ONLY thing distinguishing it from the page (1.4.11), so it was the whole argument drawn
// at half weight.
//
// THE NAME, NOT THE NUMBER, for #1266's reason: the shim gives every variable a synthetic value, and a
// number would also pass on a 2 that came from an executor literal or a brand coincidence. Reuses the
// `readBoxes` rows above, so the reachability pin (54/36/24 rows, zero misses) already covers this block
// and the two claims are made over the same built nodes the paint and radius claims were.
//
// SCOPE IS ASSERTED, and deliberately: the outline BUTTONS also carry a `border` slot and stay at 1px,
// which is Prism 2's figure for a button just as 2 is its figure for these three. So 2px is a CONTROL
// weight, not a house border weight, and an "every bordered part gets 2px" sweep — the likely next edit —
// must not pass here silently. Asserted at the bottom of this block.
const borderRows = [...cb.rows, ...rb.rows, ...sw.rows];
const misweighted = borderRows.filter((r) => r.weight !== 'border-width/thick');
ok(misweighted.length === 0,
  `#1228 all three measured controls bind \`border-width.thick\` as their stroke weight on every member (${misweighted.length ? misweighted.slice(0, 3).map((r) => `${r.def}/${r.member} -> ${r.weight ?? 'UNBOUND (the 1px executor fallback)'}`).join('; ') : [...new Set(borderRows.map((r) => `${r.def}→${r.weight}`))].join(', ')})`);
// AND NO LITERAL WAS WRITTEN OVER THE BINDING — a second fact, and the one the new executor gate is for.
// `claimDefaults` runs AFTER the bind loop, and its unstroked branch wrote `strokeWeight = 1` flat; live,
// a literal assignment after `setBoundVariable` UNBINDS the variable and reports no miss, so the build
// would look clean and ship 1px. The shim starts a FRAME at 0 so "nothing wrote a literal" is observable.
const clobbered = borderRows.filter((r) => r.weightPx !== 0);
ok(clobbered.length === 0,
  `#1228 ...and nothing wrote a literal weight over it, which live would unbind (${clobbered.length ? clobbered.slice(0, 4).map((r) => `${r.def}/${r.member} -> ${String(r.weightPx)}`).join('; ') : 'every member at 0'})`);
// THE ARM ABOVE NEEDS THE UNSTROKED COORDINATES TO EXIST or it never reaches the gate that fixes it.
// `claimDefaults`'s branch is entered only when the plan paints NO stroke, which is where a FILLED box
// binds a thickness with no stroke to draw: checkbox at `checked`/`indeterminate` and switch at `on`.
// #1348 REMOVED radio from this set — its Prism 2 ring is OUTLINED at every selection (a stroke at both
// unchecked and checked), so radio never enters the unstroked branch now; checkbox and switch still do,
// which is what keeps the clobber gate above reachable. Asserting radio's ABSENCE here is the same #1348
// fact as the no-fill arm earlier, from the border side.
const unstroked = borderRows.filter((r) => r.stroke === null);
ok(unstroked.length > 0 && new Set(unstroked.map((r) => r.def)).size === 2 && !unstroked.some((r) => r.def === 'radio-control'),
  `#1228 reachable: the arm above spans members that paint NO border — checkbox's filled boxes and switch's ON track, the only path into the executor default it gates; radio's outlined ring is NOT among them (#1348) (${unstroked.length} of ${borderRows.length} rows, defs ${[...new Set(unstroked.map((r) => r.def))].join(', ')})`);
// THE NEGATIVE CONTROL, #1266's, applied to a box rather than a ring: the cheapest way to pass both arms
// is to delete the 1px default outright, which would leave every unbound border at Figma's 0 and paint
// nothing at all. Stripped from the switch's track on BOTH kinds of coordinate — one that paints a border
// and one that does not — because the two reach the fallback through different code.
// RECURSIVE, unlike the ring's one-liner above, and the difference is the whole reason the ring block
// could get away with it: `focus-ring`'s anatomy is one part and it IS the plan root, while the track is a
// CHILD. Stripping only `plan.root` left every binding in place and the arm below caught it — which is
// what a negative control is for.
type BoundNode = { bound?: Record<string, string>; children?: BoundNode[] };
const stripWeight = (n: BoundNode): void => { delete n.bound?.strokeWeight; (n.children ?? []).forEach(stripWeight); };
const swPlansNoWeight = (JSON.parse(JSON.stringify(figmaAnatomySet(byId('switch-control')!, {}))) as AnatomyPlan[]);
for (const p of swPlansNoWeight) stripWeight(p.root as unknown as BoundNode);
const swPage: Page = { children: [] };
await run(swPlansNoWeight, { ...fullFor(swPlansNoWeight), page: swPage });
const swTracks = ((swPage.children.find((n) => n.type === 'COMPONENT_SET')?.children) as Node[] | undefined) ?? [];
// Since #1354 `track` IS switch-control's anatomy root, so it materializes as the member frame itself
// (named by the coordinate, not 'track') — fall back to the member when the named child is not found, the
// same root-is-the-box shape `readBoxes` handles for `checkbox-control`.
const noWeight = swTracks.map((m) => allNodes(m).find((n) => n.name === 'track') ?? m).filter((n): n is Node => !!n);
ok(noWeight.length === swPlansNoWeight.length,
  `#1228 reachable: the binding-stripped switch-control built a track on every member (${noWeight.length}/${swPlansNoWeight.length})`);
ok(noWeight.every((n) => !((n.boundVariables as Record<string, unknown>) ?? {}).strokeWeight && n.strokeWeight === 1),
  `#1228 ...and with nothing bound the 1px fallback STILL fires on both the stroked and unstroked coordinates, so the gate gates the default rather than removing it (${[...new Set(noWeight.map((n) => String(n.strokeWeight)))].join(', ')})`);
// AND THE SCOPE, asserted on the OTHER side rather than left to the comment above — TWO TOKENS, NOT ONE
// TOKEN AND ONE FALLBACK (#1278). `button`'s container carries a `border` slot exactly as these three do,
// and Prism 2 draws its outline buttons at 1px against the 2px it draws these three at (the button figure
// is owner-confirmed; no button spec is checked in, unlike the three control specs the 2px cites). So the
// two weights are a deliberate contrast — 2px is a CONTROL weight, 1px is a button's — and "every bordered
// part gets 2px" is both the likely next edit and the one that must fail here rather than ship.
//
// WHAT CHANGED IN #1278 is the provenance of the 1, and it is what makes this arm stronger than the one it
// replaces. Until now the buttons bound NOTHING and this arm asserted exactly that: the 1px came from the
// executors' `if (!node.strokeWeight) … = 1`, the right number with no token behind it, and the arm could
// only catch a sweep to 2 — a sweep to a DIFFERENT 1px source, or a brand re-runging its border floor while
// the button stayed on Figma's fallback, were both invisible. Now the button binds `border-width.hairline`
// and the three controls bind `border-width.thick`, so BOTH directions of the sweep fail by name.
//
// THE NAME, NOT THE NUMBER, for #1266's reason: the shim gives every variable a synthetic value, so a
// numeric check would pass on a 1 that came from an executor literal. That the token RESOLVES to 1px in
// every corpus brand — which is the "no visual change" half of #1278 — is asserted in `test.ts`, against
// the emitted trees, where the real figures are.
//
// Read off the MEMBER, not through `readBoxes`: `container` IS button's anatomy root, so it arrives as
// the member frame under its coordinate name and a search for a part called `container` finds nothing —
// the ring block's trap, and the reachability pin below is what said so rather than 0 rows passing.
//
// BOTH BUTTON DEFS, and that plural is the scope gap #1278's first cut left open. `icon-button` is a
// SEPARATE def with its own 162-member set: `inherits: 'button'` is PROSE — nothing in the projector
// resolves through it, as that file's own `paintKeys` note says — so binding the `makeButton` factory
// covered three intents and reached `icon-button` not at all. An arm that inspected only `button`'s
// members would have reported a clean scope over a def still on the executor's literal, and
// `lint-unclaimed-defaults` cannot see the difference either: a literal `strokeWeight = 1` is a
// CLAIMED default there, which is the whole point of that gate and the exact reason it is not this one.
const buildSet = async (id: string): Promise<Node[]> => {
  const plans = figmaAnatomySet(byId(id)!, { swapTarget: SWAP });
  const page: Page = { children: [] };
  await run(plans, { ...fullFor(plans), page });
  const members = ((page.children.find((n) => n.type === 'COMPONENT_SET')?.children) as Node[] | undefined) ?? [];
  ok(members.length === plans.length,
    `#1228 reachable: every \`${id}\` member built, so the scope claim below is made over real containers (${members.length}/${plans.length})`);
  return members;
};
const btnMembers = await buildSet('button');
const iconBtnMembers = await buildSet('icon-button');
// ONE POOL, BOTH DEFS. Kept as a single list rather than two parallel arms so a def joining the family
// cannot be added to the build above and left out of the claim — which is the shape of the miss this
// paragraph exists to record.
const edgeMembers = [...btnMembers, ...iconBtnMembers];
const btnWeights = edgeMembers.map((n) => weightOf(n));
const btnMisbound = edgeMembers.filter((n) => weightOf(n) !== 'border-width/hairline');
ok(btnMisbound.length === 0,
  `#1278 every member of BOTH button defs binds \`border-width.hairline\` as its stroke weight — the 1px is the TOKEN's now, not the executor fallback's (${btnMisbound.length ? btnMisbound.slice(0, 3).map((n) => `${n.name} -> ${weightOf(n) ?? 'UNBOUND (the 1px executor fallback)'}`).join('; ') : `all ${btnMembers.length} button + ${iconBtnMembers.length} icon-button members at ${[...new Set(btnWeights)].join(', ')}`})`);
// …AND BOTH DEFS ARE REPRESENTED, which a length check over one pooled list cannot say. A build that
// returned zero icon-button members would leave the arm above true of button alone — `docs/34` shape 9,
// the arm passing over a set that quietly lost half its subject.
ok(btnMembers.length > 0 && iconBtnMembers.length > 0,
  `#1278 reachable: the claim above spans BOTH button defs — ${btnMembers.length} button members and ${iconBtnMembers.length} icon-button members, which is the scope the issue names (3 intents + IconButton.container)`);
// THE TWO WEIGHTS ARE DIFFERENT, stated as its own arm rather than left implicit in the two above. Either
// sweep — controls down to the button's rung, or buttons up to the controls' — makes this set size 1.
const familyWeights = new Set([...btnWeights, ...borderRows.map((r) => r.weight)]);
ok(familyWeights.size === 2 && familyWeights.has('border-width/hairline') && familyWeights.has('border-width/thick'),
  `#1278 the corpus binds exactly TWO border weights and the button is not on the control's one — a sweep in either direction collapses this to one (${[...familyWeights].join(', ')})`);
// AND NOTHING WROTE A LITERAL OVER THE BINDING, the same second fact the three controls' block asserts and
// for the same reason: `claimDefaults` runs after the bind loop, so its `strokeWeight = 1` would UNBIND
// what Figma just accepted and report no miss. The shim starts a FRAME at 0, so "no literal" reads as 0 —
// and note the trap this arm is immune to only by accident of that: the literal it would write is ALSO 1,
// so a clobber here changes no pixel and could never be found by looking at the picture.
const btnClobbered = edgeMembers.filter((n) => n.strokeWeight !== 0);
ok(btnClobbered.length === 0,
  `#1278 ...and nothing wrote a literal weight over it, which live would unbind — invisible here, because the literal and the token are the SAME 1px (${btnClobbered.length ? btnClobbered.slice(0, 4).map((n) => `${n.name} -> ${String(n.strokeWeight)}`).join('; ') : `every member of ${edgeMembers.length} at 0`})`);
// REACHABILITY, the half the three-control block needed too: `filled` and `text` paint no border at all,
// so most of these members bind a thickness with nothing to draw — which is exactly the coordinate that
// enters `claimDefaults`' unstroked branch and the only path into the gate the arm above depends on.
const btnUnstroked = edgeMembers.filter((n) => ((n.strokes as unknown[]) ?? []).length === 0);
// `< edgeMembers.length`, NOT `< btnMembers.length`: `btnUnstroked` is filtered over the POOLED `edgeMembers`
// (button + icon-button), so proving that BOTH kinds are present — some paint no border, some do — means "not
// all of the pool are unstroked". Comparing the pooled unstroked count against button's total alone was a
// latent off-by-subject that happened to hold only while icon-button's set was small; #1427 doubled it (108 →
// 216), pushing the pooled no-border count to exactly button's 432 and exposing the wrong denominator.
ok(btnUnstroked.length > 0 && btnUnstroked.length < edgeMembers.length,
  `#1278 reachable: the button sets span BOTH kinds of coordinate — ${btnUnstroked.length} of ${edgeMembers.length} members paint no border (filled/text) and the rest do (outline), so the arm above covers the unstroked path into the executor default as well as the stroked one`);

// ── #1012: SEPARATE SLASH-GROUPED COMPONENTS, NOT A SET ─────────────────────────────────────────
// `icon` materializes with `emitAsComponents`, so its projection must NOT combine into a COMPONENT_SET:
// each member is left as its own top-level `icon/<glyph>` component, which Figma folds into an assets-
// panel folder. This is the whole of #1012's write-path change, asserted against its own MUTATION — the
// SAME plans run WITHOUT the flag combine into one set — so these checks discriminate on the flag rather
// than passing regardless (docs/34: a test that a set was AVOIDED must show a set would otherwise form).
// The shim models `createComponentFromNode` as identity, so its "components" stay FRAME-typed; the load-
// bearing distinction it CAN show is set vs no-set and the slash-grouped names, which is exactly the change.
const iconPlans = figmaAnatomySet(byId('icon')!);
const iconVars = fullFor(iconPlans);

const emitPage: Page = { children: [] };
const rEmit = await run(iconPlans, { ...iconVars, page: emitPage }, { emitAsComponents: true });
ok(rEmit.misses.length === 0,
  `#1012 the emit-as-components run is clean — every glyph's ink resolves and nothing is stranded (${rEmit.misses.length}${rEmit.misses.length ? ` — ${rEmit.misses.slice(0, 3).join('; ')}` : ''})`);
ok(emitPage.children.length === iconPlans.length && emitPage.children.every((c) => c.type !== 'COMPONENT_SET'),
  `#1012 the page holds ${iconPlans.length} SEPARATE nodes and NO component set — the projection did not combine (${emitPage.children.length} nodes, ${emitPage.children.filter((c) => c.type === 'COMPONENT_SET').length} sets)`);
ok(emitPage.children.every((c) => String(c.name).startsWith('icon/')),
  `#1012 every emitted component is slash-grouped under 'icon/' so Figma folds them into one assets-panel folder (${emitPage.children.filter((c) => !String(c.name).startsWith('icon/')).map((c) => c.name).slice(0, 3).join(', ') || 'all prefixed'})`);
ok(emitPage.children.some((c) => c.name === 'icon/check') && emitPage.children.some((c) => c.name === 'icon/FPO-default-icon'),
  `#1012 the glyph is the coordinate VALUE — 'icon/check' and the 40th member 'icon/FPO-default-icon' are both present by name, not left as a 'name=check' coordinate`);
ok(rEmit.set === 'icon' && rEmit.emittedComponents?.length === iconPlans.length && (rEmit.emittedComponents ?? []).every((n) => n.startsWith('icon/')),
  `#1012 the verdict carries the group and the ${iconPlans.length} emitted names, which is what routes main.ts's no-set summary arm (set=${rEmit.set}, emitted=${rEmit.emittedComponents?.length})`);

// THE MUTATION: the same plans, flag OFF, combine into exactly one set and carry NO `emittedComponents` —
// so flipping `emitAsComponents` off makes every assertion above fail by name rather than silently pass.
const setPage: Page = { children: [] };
const rSet = await run(iconPlans, { ...iconVars, page: setPage });
ok(setPage.children.length === 1 && setPage.children[0].type === 'COMPONENT_SET' && rSet.emittedComponents === undefined,
  `#1012 MUTATION: the same plans WITHOUT emitAsComponents combine into ONE COMPONENT_SET with no emittedComponents (page ${setPage.children.length}, type ${setPage.children[0]?.type}, emitted ${rSet.emittedComponents === undefined ? 'undefined' : rSet.emittedComponents.length})`);

console.log(`\nplugin COMPONENT write-adapter: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
// =============================================================================================
// #1605 — THE PLUGIN RESOLVES WEIGHT INTENT PER BRAND (the runtime half of #1602)
// =============================================================================================
// #1602 taught the engine to resolve `field-label`'s weight axis against a brand's shipped body roles
// (`applyWeightIntent`), and `test.ts` pins that at the projection tier. What it did not reach was the
// plugin: `main.ts` materialized `controlShape` and nothing else, so an NB file still projected
// `body/<size>/strong` — a style NB never emits — and every bold member missed its style (#1599's 252).
//
// The subject is `materializeForBrand` (`src/brand-def.ts`), the function `main.ts` calls; it is a module
// precisely so this arm can run it. The HOST holds the brand's EMITTED text styles — named by
// `buildFigmaTextStyles` off the brand's theme, the emitter's side, not the projection's — and the styles
// read back off the built text nodes are compared to HAND-NAMED expectations (docs/34: the expected side
// is not derived from the code under test). Removing the `applyWeightIntent` wrap puts `strong` back in
// the plans, the host has no such style, and the NB lines below fail by their #1605 names.
{
  const nbInput = parseDesignMd(readFileSync(new URL('../../packages/engine/examples/nb-redesign.design.md', import.meta.url), 'utf8')).input as BrandInput;
  const emittedStyles = (input: BrandInput): string[] => buildFigmaTextStyles(brandTheme(input)).styles.map((st) => st.name);
  const appliedStyles = (page: Page): string[] => {
    const set = page.children[0];
    const texts = [set, ...((set.findAll as () => Node[])())].filter((n) => n.type === 'TEXT') as Node[];
    return texts.map((n) => String(n._textStyleId ?? '').replace(/^S:/, ''));
  };

  // (a) NB — `body: [default, emphasis]`. Bold resolves to `emphasis`, the heaviest body role NB ships.
  const nbPlans = figmaAnatomySet(materializeForBrand(fieldLabel, nbInput), { swapTarget: SWAP });
  const nbPage: Page = { children: [] };
  const nbRun = await run(nbPlans, { ...fullFor(nbPlans), styles: emittedStyles(nbInput), page: nbPage });
  const nbApplied = appliedStyles(nbPage);
  ok(nbApplied.length > 0 && nbApplied.every((st) => st !== ''),
    `#1605 NB field-label: every built text node carries a text style the NB host holds (${nbApplied.length} text nodes, ${nbApplied.filter((st) => st === '').length} unstyled)`);
  ok(!nbApplied.some((st) => /^body\/.+\/strong$/.test(st)) && !nbRun.misses.some((m) => /body\/[^/]+\/strong/.test(m)),
    `#1605 NB field-label applies NO body/*/strong — a style NB never emits (misses: ${nbRun.misses.filter((m) => /\.textStyle ->/.test(m)).slice(0, 3).join('; ') || 'none'})`);
  const NB_EXPECTED = ['body/lg/default', 'body/lg/emphasis', 'body/md/default', 'body/md/emphasis', 'body/sm/default', 'body/sm/emphasis'];
  ok(JSON.stringify([...new Set(nbApplied)].sort()) === JSON.stringify(NB_EXPECTED),
    `#1605 NB field-label applies exactly the body default/emphasis styles, bold → emphasis (${[...new Set(nbApplied)].sort().join(', ')})`);
  ok(nbRun.variants === 24, `#1605 NB keeps the weight axis — two distinct body roles, 24 members (${nbRun.variants})`);

  // (b) SINGLE BODY WEIGHT — both intents resolve to `default`, so the axis collapses: 12 members, not 24.
  const aurora = exampleBrands().aurora as BrandInput;
  const oneWeight = { ...aurora, typography: { ...(aurora.typography ?? {}), weights: { ...(aurora.typography?.weights ?? {}), body: ['default'] } } } as BrandInput;
  const onePlans = figmaAnatomySet(materializeForBrand(fieldLabel, oneWeight), { swapTarget: SWAP });
  const onePage: Page = { children: [] };
  const oneRun = await run(onePlans, { ...fullFor(onePlans), styles: emittedStyles(oneWeight), page: onePage });
  ok(oneRun.variants === 12 && oneRun.added === 12,
    `#1605 a single-body-weight brand builds 12 field-label members, not 24 — the weight axis collapses (variants=${oneRun.variants}, added=${oneRun.added})`);
  ok(nbRun.axes.some((a) => a.startsWith('weight:')) && !oneRun.axes.some((a) => a.startsWith('weight:')) && [...new Set(appliedStyles(onePage))].sort().join(',') === 'body/lg/default,body/md/default,body/sm/default',
    `#1605 ...with no weight axis on the set (NB keeps one) and only body/*/default applied (axes ${oneRun.axes.join('/')}; ${[...new Set(appliedStyles(onePage))].sort().join(', ')})`);

  // (c) NO BRAND — `null` is the identity on both levers, so a themeless file builds exactly as before.
  ok(JSON.stringify(figmaAnatomySet(materializeForBrand(fieldLabel, null), { swapTarget: SWAP })) === JSON.stringify(labelPlans),
    '#1605 no persisted brand: materializeForBrand is the identity — the plans are byte-identical to the raw def\'s');

  // (d) `main.ts` IS WIRED TO IT — source text only, the `(5)` limit above: this sees the call, the arms
  // above see what the call does.
  ok(/figmaAnatomySet\(materializeForBrand\(\w+, brandInput\)/.test(mainSrc) && /brandInput = restoreInput\(figma\.root\)/.test(mainSrc),
    '#1605 main.ts projects `materializeForBrand(def, brandInput)`, off its one `restoreInput` read');
}

// =============================================================================================
// #1608 — THE PLUGIN RESOLVES THE OUTLINE HOVER FAMILY PER BRAND
// =============================================================================================
// `button` binds `interactive.<c>.overlay.{hover,pressed}` on outline/text hover — a wash the engine
// EMITS only at `outlineInteraction: overlay-neutral`. The owner's NB file (solid-tint or none) built the
// button with 96 `container.fills` misses. `materializeForBrand` now applies `applyOutlineInteraction`.
//
// The HOST holds ONLY the brand's emitted COLOR variables — `buildFigmaColor` off the brand's theme, the
// emitter's side, not the projection's — plus the plans' non-color names (dimensions, styles, nested
// components), which this arm is not about. Expected bindings are HAND-NAMED (docs/34). Removing the wrap
// from `materializeForBrand` puts the page wash back in the plans, the host has no such variable, and the
// lines below fail by their #1608 names.
{
  const nbInput = parseDesignMd(readFileSync(new URL('../../packages/engine/examples/nb-redesign.design.md', import.meta.url), 'utf8')).input as BrandInput;
  const hostFor = (input: BrandInput, plans: AnatomyPlan[]): ShimOpts => {
    const full = fullFor(plans);
    const colors = buildFigmaColor(brandTheme(input)).color.flatMap((c) => c.variables.map((v) => v.name.replace(/^[^/]+\//, '')));
    return { ...full, vars: [...new Set([...(full.vars ?? []).filter((v) => !v.startsWith('color/')), ...colors])] };
  };
  const members = (page: Page): Node[] => (page.children[0].children as Node[]) ?? [];
  const fillVar = (n: Node): string => {
    const f = (n.fills as { boundVariables?: { color?: { id?: string } } }[] | undefined) ?? [];
    return f.length ? String(f[0]?.boundVariables?.color?.id ?? 'UNBOUND').replace(/^V:/, '') : 'NONE';
  };
  const hoverMembers = (page: Page, surface: string) => members(page).filter((m) =>
    /appearance=(outline|text)/.test(String(m.name)) && /state=(hover|pressed)/.test(String(m.name)) && new RegExp(`surface=${surface}`).test(String(m.name)));
  const fillMisses = (misses: string[]) => misses.filter((m) => /\.fills -> /.test(m));

  // (a) SOLID-TINT (#1614) — the category's EXISTING fill variable at a PAINT OPACITY lands where the wash did.
  // nb-redesign's primary hover steps DOWN to opacity.10 on both grounds (its label fails at 20); pressed stays
  // at opacity.30. Read back off the BUILT node — the variable bound AND the opacity the paint kept — so
  // dropping the opacity in `paint()` leaves every member an opaque fill, the label's own color, and fails here.
  const tint = { ...nbInput, outlineInteraction: 'solid-tint' } as BrandInput;
  const tintPlans = figmaAnatomySet(materializeForBrand(button, tint), { swapTarget: SWAP });
  const tintPage: Page = { children: [] };
  const tintRun = await run(tintPlans, { ...hostFor(tint, tintPlans), page: tintPage });
  const paintOf = (n: Node): string => {
    const f = (n.fills as { opacity?: number }[] | undefined) ?? [];
    return `${fillVar(n)} @ ${f[0]?.opacity ?? 1}`;
  };
  const byState = (ms: Node[]) => [...new Set(ms.map((m) => `${/state=(hover|pressed)/.exec(String(m.name))![1]}: ${paintOf(m)}`))].sort();
  const tintDefault = hoverMembers(tintPage, 'default');
  const tintBound = byState(tintDefault);
  ok(tintDefault.length === 48 && JSON.stringify(tintBound) === JSON.stringify(['hover: color/interactive/primary/fill/rest @ 0.1', 'pressed: color/interactive/primary/fill/rest @ 0.3']),
    `#1614 solid-tint NB button: the 48 default-ground outline/text (2 appearances × 2 states × 3 sizes × 4 slot combos) hover+pressed members bind interactive/primary/fill/rest at paint opacity 0.1 / 0.3 (${tintDefault.length}: ${tintBound.join(', ')})`);
  // #1613 — the inverse-band members bind the BAND's fill (`inverse…fill/rest`, the one the owner sets per
  // category in the plugin) at the band's own step. Hand-named, both sides.
  const tintInverse = hoverMembers(tintPage, 'inverse');
  const tintInvBound = byState(tintInverse);
  ok(tintInverse.length === 48 && JSON.stringify(tintInvBound) === JSON.stringify(['hover: color/inverse/interactive/primary/fill/rest @ 0.1', 'pressed: color/inverse/interactive/primary/fill/rest @ 0.3']),
    `#1614 solid-tint NB button: the 48 inverse-band outline/text hover+pressed members bind inverse/interactive/primary/fill/rest at paint opacity 0.1 / 0.3 (${tintInverse.length}: ${tintInvBound.join(', ')})`);
  const tintFill = fillMisses(tintRun.misses);
  ok(tintFill.length === 0,
    `#1613 solid-tint NB button: 0 container.fills misses on BOTH grounds, opacity read back included (${tintFill.length}${tintFill.length ? ` — ${[...new Set(tintFill)].slice(0, 3).join('; ')}` : ''})`);

  // (b) NONE — no hover expression: no variable asked for, so nothing to miss, and no fill on the member.
  const none = { ...nbInput, outlineInteraction: 'none' } as BrandInput;
  const nonePlans = figmaAnatomySet(materializeForBrand(button, none), { swapTarget: SWAP });
  const nonePage: Page = { children: [] };
  const noneRun = await run(nonePlans, { ...hostFor(none, nonePlans), page: nonePage });
  ok(fillMisses(noneRun.misses).length === 0,
    `#1608 none NB button: 0 container.fills misses (${fillMisses(noneRun.misses).length}${fillMisses(noneRun.misses).length ? ` — ${[...new Set(fillMisses(noneRun.misses))].slice(0, 3).join('; ')}` : ''})`);
  const noneHover = [...hoverMembers(nonePage, 'default'), ...hoverMembers(nonePage, 'inverse')];
  ok(noneHover.length === 96 && noneHover.every((m) => fillVar(m) === 'NONE'),
    `#1608 none NB button: all 96 outline/text hover+pressed members (48 per ground) carry NO fill (${noneHover.length}: ${[...new Set(noneHover.map(fillVar))].join(', ')})`);

  // (c) OVERLAY-NEUTRAL — the default: the materialized plans are byte-identical to the raw def's.
  const wash = { ...nbInput, outlineInteraction: 'overlay-neutral' } as BrandInput;
  ok(JSON.stringify(figmaAnatomySet(materializeForBrand(button, wash), { swapTarget: SWAP })) === JSON.stringify(figmaAnatomySet(materializeForBrand(button, { ...nbInput, outlineInteraction: undefined } as BrandInput), { swapTarget: SWAP })),
    '#1608 overlay-neutral is the default and the identity: an explicit overlay-neutral brand projects the button byte-identically to one that leaves the lever unset');
}

// =============================================================================================
// #1633 — NESTED COMPONENTS BUILD FIRST
// =============================================================================================
// The owner built `button` into a fresh Aurora file and got 72 `focusRing.nestTarget -> focus-ring (not in
// this file …)` misses. `prebuildDependencies` (`src/build-deps.ts`, the loop `main.ts` runs) now builds
// every missing nested def first, through the REAL executor, into ONE shim whose root sees what the run
// built (`liveRoot`). Expected dependency lists and build orders are HAND-NAMED (docs/34), never derived
// from the resolver. Mutation: make `prebuildDependencies` return `[]` → the 0-miss arm fails with the
// `focusRing.nestTarget` miss quoted in its label.
{
  const byDef = (id: string) => componentDefs.find((d) => d.id === id)!;
  const project = (d: ComponentDef) => figmaAnatomySet(materializeForBrand(d, null), { swapTarget: SWAP });
  // The file carries every variable/style every catalogue plan binds and NO components: what a themed,
  // empty file looks like. `comps` is dropped on purpose — `fullFor` would otherwise pre-seed the nests.
  const hostOpts = (): ShimOpts => {
    const all = componentDefs.flatMap((d) => { try { return project(d); } catch { return []; } });
    const f = fullFor(all);
    return { vars: f.vars, styles: f.styles, effects: f.effects, comps: [], liveRoot: true };
  };
  const baseOpts = hostOpts();
  const fileWith = (extra: ShimOpts = {}) => {
    const page: Page = { children: [] };
    const shim = makeShim({ ...baseOpts, ...extra, page });
    const order: string[] = [];
    const build = async (d: ComponentDef) => {
      order.push(d.id);
      return applyComponentPlan(project(d), shim as any, { emitAsComponents: d.figmaProperties?.emitAsComponents });
    };
    const ctx = { defs: componentDefs, project, host: shim as any, build };
    return { page, shim, order, build, ctx };
  };
  const ringMisses = (m: string[]) => m.filter((x) => x.indexOf('focusRing') >= 0);

  // REACHABILITY — without the pre-build, the fresh file reproduces the owner's report.
  const bare = fileWith();
  const bareRun = await bare.build(button);
  ok(ringMisses(bareRun.misses).some((m) => m.indexOf('focusRing.nestTarget -> focus-ring') >= 0),
    `#1633 reachable: button alone into an empty file misses its focus ring (${ringMisses(bareRun.misses).length} focusRing misses)`);

  // (a) FRESH FILE — icon and focus-ring are built first, then button with no ring or slot miss.
  const fresh = fileWith();
  const built = await prebuildDependencies(button, fresh.ctx);
  ok(JSON.stringify(built.map((b) => b.id)) === JSON.stringify(['icon', 'focus-ring']),
    `#1633 fresh file: button's missing nests are built first — icon, focus-ring (${built.map((b) => b.id).join(', ') || 'none'})`);
  const freshRun = await fresh.build(button);
  const freshRing = ringMisses(freshRun.misses);
  ok(freshRing.length === 0,
    `#1633 fresh file: button builds with 0 focusRing misses after the pre-build (${freshRing.length}${freshRing.length ? ` — ${freshRing[0]}` : ''})`);
  ok(!freshRun.misses.some((m) => m.includes('.swapTarget ->')),
    `#1633 fresh file: button's icon slots resolve to the auto-built icon (${freshRun.misses.filter((m) => m.includes('.swapTarget ->')).slice(0, 1).join('') || 'none'})`);
  const pageNames = () => fresh.page.children.map((c) => String(c.name)).join('|');

  // (b) IDEMPOTENT — a second run builds nothing new and adds nothing to the page.
  const before = pageNames();
  const buildsBefore = fresh.order.length;
  const again = await prebuildDependencies(button, fresh.ctx);
  ok(again.length === 0 && fresh.order.length === buildsBefore && pageNames() === before,
    `#1633 re-run: nothing is rebuilt once the nests are present (${again.map((b) => b.id).join(', ') || 'none'} built, ${fresh.order.length - buildsBefore} build calls)`);

  // (c) FOCUS-RING ALREADY IN THE FILE — left alone; only the missing icon is built.
  const ringMembers = figmaAnatomySet(byDef('focus-ring')).map(planComponentName);
  const held = fileWith({ fileNodes: [{ name: 'focus-ring', type: 'COMPONENT_SET', variants: ringMembers }] });
  const heldBuilt = await prebuildDependencies(button, held.ctx);
  ok(!held.order.includes('focus-ring') && JSON.stringify(heldBuilt.map((b) => b.id)) === JSON.stringify(['icon']),
    `#1633 existing focus-ring: never rebuilt — only icon is built (${held.order.join(', ') || 'nothing'})`);

  // (d) A CHAIN — checkbox-group → checkbox-row → checkbox-control → focus-ring, plus the group's label.
  const chain = fileWith();
  await prebuildDependencies(byDef('checkbox-group'), chain.ctx);
  ok(JSON.stringify(chain.order) === JSON.stringify(['field-label', 'focus-ring', 'checkbox-control', 'checkbox-row']),
    `#1633 chain: checkbox-group's nests build deepest first — field-label, focus-ring, checkbox-control, checkbox-row (${chain.order.join(', ')})`);
  const groupRun = await chain.build(byDef('checkbox-group'));
  const nestMiss = groupRun.misses.filter((m) => m.indexOf('.nestTarget ->') >= 0 || m.indexOf('.nestVariant ->') >= 0);
  ok(nestMiss.length === 0, `#1633 chain: checkbox-group then builds with 0 nest misses (${nestMiss.length}${nestMiss.length ? ` — ${nestMiss[0]}` : ''})`);

  // (e) A FAILED DEPENDENCY stops the parent, naming both.
  const broken = fileWith();
  let thrown: unknown;
  try {
    await prebuildDependencies(button, { ...broken.ctx, build: async (d) => { broken.order.push(d.id); if (d.id === 'focus-ring') throw new Error('host refused'); return broken.build(d); } });
  } catch (e) { thrown = e; }
  ok(thrown instanceof DependencyBuildError && thrown.dependency === 'focus-ring' && /button nests focus-ring/.test(thrown.message) && /host refused/.test(thrown.message),
    `#1633 a dependency that throws stops the run with a named error (${(thrown as Error)?.message ?? 'no throw'})`);

  // (f) A CYCLE fails by name rather than looping.
  const fake = (id: string) => ({ id, figmaProperties: {} } as unknown as ComponentDef);
  const a = fake('a'), b = fake('b');
  const nestOf: Record<string, string> = { a: 'b', b: 'a' };
  let cyc = '';
  try {
    missingDependencies(a, { defs: [a, b], present: () => false, project: (d) => [{ root: { nestTarget: nestOf[d.id], children: [] } } as unknown as AnatomyPlan] });
  } catch (e) { cyc = (e as Error).message; }
  ok(cyc.indexOf('a → b → a') >= 0, `#1633 a nesting cycle throws, naming the path (${cyc || 'no throw'})`);

  // MAIN.TS RUNS IT, before the parent's own build.
  const pre = mainSrc.indexOf('await prebuildDependencies(def,');
  const own = mainSrc.indexOf('await buildOne(def, reports)');
  ok(pre >= 0 && own > pre, '#1633 main.ts pre-builds the nests before building the def it was asked for');
}

// =============================================================================================
// #1623 sign-off — THE DEF'S `summary` IS THE FIGMA DESCRIPTION
// =============================================================================================
// The plugin writes one line per built component: the set's description (or each component's, in
// `emitAsComponents` mode). Each arm is paired with the run that must NOT write, so a writer that ignored
// the option — or wrote it everywhere — fails by name.
{
  const fm = byId('field-message')!;
  const fmPlans = figmaAnatomySet(fm);
  const fmVars = fullFor(fmPlans);
  const setOf = (pg: Page) => pg.children.find((c) => c.type === 'COMPONENT_SET') as Record<string, unknown> | undefined;

  const pgA: Page = { children: [] };
  await run(fmPlans, { ...fmVars, page: pgA }, { description: fm.summary });
  ok(setOf(pgA)?.description === fm.summary, `#1623 a fresh set carries the def's summary as its Figma description ("${setOf(pgA)?.description}")`);

  const pgB: Page = { children: [] };
  await run(fmPlans, { ...fmVars, page: pgB });
  ok(!setOf(pgB)?.description, '#1623 with no description passed, the set is left without one — the text comes from the option, not from the plan');

  // An EXISTING set: filled while empty, never overwritten once a designer has written one.
  await run(fmPlans, { ...fmVars, page: pgB }, { description: fm.summary });
  ok(setOf(pgB)?.description === fm.summary, `#1623 a set the file already had, with no description, gets the summary on the next build ("${setOf(pgB)?.description}")`);
  setOf(pgB)!.description = 'A designer wrote this.';
  await run(fmPlans, { ...fmVars, page: pgB }, { description: fm.summary });
  ok(setOf(pgB)?.description === 'A designer wrote this.', `#1623 a designer's own set description survives a rebuild ("${setOf(pgB)?.description}")`);

  const ic = byId('icon')!;
  const icPlans = figmaAnatomySet(ic);
  const pgC: Page = { children: [] };
  await run(icPlans, { ...fullFor(icPlans), page: pgC }, { emitAsComponents: true, description: ic.summary });
  const undescribed = pgC.children.filter((c) => (c as Record<string, unknown>).description !== ic.summary);
  ok(pgC.children.length === icPlans.length && undescribed.length === 0,
    `#1623 emitAsComponents: every one of the ${icPlans.length} icon components carries the summary (${undescribed.length} without)`);

  ok(/description:\s*target\.summary/.test(mainSrc), "#1623 main.ts passes the def's summary as the build's description");
}

// ---- #1611: THE FOOTPRINT HOLDS ACROSS RUNTIME AXES, NOT AUTHORING AXES --------------------
// The owner-found case: NB's emphasis weight (Medium) sets 1px wider than Regular at `small`, and the build
// reported four footprint misses on field-label's `weight` — an axis a designer picks ONCE per label, so a
// bold member and a regular one are never one instance's before and after. The owner's answer to "is a
// weight axis ever toggled live?" was yes ("something goes bold when selected. That's fairly common."), so
// the rule is not "exempt weight": it is that the cohort compares across RUNTIME axes and holds AUTHORING
// ones. Three runs of the real executor over the same plans, differing only in how `weight` is classified
// and whether the bold width is reserved, with the shim's `textAdvance` standing in for NB's wider cut.
{
  const BOLD_WIDER = { 'body/sm/strong': 1 };
  const measure = async (plans: AnatomyPlan[]) => {
    const page: Page = { children: [] };
    const r = await run(plans, { ...fullFor(plans), page, textAdvance: BOLD_WIDER });
    const set = page.children[0] as Node | undefined;
    const box = new Map(((set?.children as Node[] | undefined) ?? []).map((m) => [String(m.name), `${Math.round(m.width as number)}x${Math.round(m.height as number)}`]));
    return { r, box, foot: r.misses.filter((m) => m.startsWith('footprint -> ')) };
  };
  const BOLD = 'emphasis=primary, weight=bold, size=small, state=rest';
  const REG = 'emphasis=primary, weight=regular, size=small, state=rest';

  // (a) field-label AS SHIPPED — `weight` is authoring, so the cohort holds it and a wider bold is no miss.
  const shipped = await measure(labelPlans);
  // THE GUARD FIRST: the bold member must actually measure wider under this seed, or (a) passes against a
  // cohort that compares weight too and (b) below has nothing to catch.
  ok(!!shipped.box.get(BOLD) && !!shipped.box.get(REG) && shipped.box.get(BOLD) !== shipped.box.get(REG),
    `#1611 the seed is load-bearing: at size=small a bold field-label measures differently from a regular one (${shipped.box.get(BOLD)} vs ${shipped.box.get(REG)})`);
  ok(shipped.foot.length === 0,
    `#1611 field-label's authoring \`weight\` is held fixed by the footprint cohort — bold and regular are never compared, so NB's wider Medium reports no miss (${shipped.foot.join('; ') || 'none'})`);

  // (b) THE BOLD-WHEN-SELECTED SHAPE — the same def with `weight` classified runtime, which is what a label
  // that goes bold on selection is. A runtime change that widens the text is a layout jump, and it is caught.
  const toggleLabel: ComponentDef = { ...fieldLabel, axisKinds: { ...fieldLabel.axisKinds, weight: 'runtime' } };
  const togglePlans = figmaAnatomySet(toggleLabel, { swapTarget: SWAP });
  const jump = await measure(togglePlans);
  ok(jump.foot.some((m) => m === `footprint -> ${BOLD} measures ${jump.box.get(BOLD)} but ${REG} measures ${jump.box.get(REG)} (same size=small, emphasis=primary)`),
    `#1611 a RUNTIME weight that widens the text is a footprint miss, by name — bold/rest against regular/rest in one size=small cohort (${jump.foot.join('; ') || 'NOTHING — the runtime axis was not compared'})`);
  // Four, hand-counted rather than derived: bold × {rest, disabled} × {primary, secondary} at the one size
  // the seed widens — the issue's own four.
  ok(jump.foot.length === 4, `#1611 ...and exactly the four small bold members miss (got ${jump.foot.length})`);

  // (c) THE SAME RUNTIME AXIS WITH THE BOLD WIDTH RESERVED — a fixed width on the member box, the pattern a
  // bold-when-selected label has to use. Nothing about the text changes; the box no longer follows it.
  const reserved = togglePlans.map((p) => ({ ...p, root: { ...p.root, bound: { ...p.root.bound, width: 'size/label/reserve' } } }));
  const held = await measure(reserved);
  ok(held.r.misses.length === 0 && held.box.get(BOLD) === held.box.get(REG),
    `#1611 with the bold width RESERVED the runtime weight axis holds its footprint — no misses, bold and regular measure alike (${held.box.get(BOLD)} vs ${held.box.get(REG)}; ${held.r.misses.join('; ') || 'none'})`);
}


// ---- THE MESSAGE ROW RESERVES THE STATUS GLYPH'S HEIGHT (text-field and select keep one footprint) ----
// Measured live 2026-09-25 on the owner's `nb-redesign` brand: text-field reported 15 footprint misses and
// select 12, e.g. "status=error, state=rest measures 320x99 but status=default, state=rest measures 320x98".
// Cause: the nested field-message draws a glyph beside its caption in the three validation statuses and none
// in the default, and that brand's caption line box (12px at 1.25 = 15) is shorter than the glyph (16). The
// owner's fix, option (a): the message row's minimum height is the glyph's size in EVERY status, so it
// measures max(glyph, caption line box) whether or not a glyph is drawn.
//
// Driven through the REAL executor, dependency-first into one live file, with the shim's opt-in
// `layoutModel` (columns stack, a caption is as tall as its line box, an instance is as tall as its main).
// ORACLES AUTHORED HERE (docs/34): the glyph's height is read off the shim's own variable model, the caption
// line box is set one pixel under it, and the expected row height is that max worked by hand — never read
// off the def. The mutation arm rebuilds with the def's `minHeight` removed and requires the footprint
// misses the owner saw, by name.
{
  const byDef = (id: string) => componentDefs.find((d) => d.id === id)!;
  const GLYPH = varValue('icon/size/xs');                 // what the shim binds `icon.size.xs` to
  const fmPlansShipped = figmaAnatomySet(materializeForBrand(fieldMessage, null), { swapTarget: SWAP });
  const captionStyles = [...new Set(fmPlansShipped.flatMap((p) => planTextStyles(p.root)))];
  ok(captionStyles.length === 1, `message-row: field-message sets its caption in exactly one text style (${captionStyles.join(', ')})`);
  const CAPTION = captionStyles[0];
  const unfloored: ComponentDef = { ...fieldMessage, anatomy: { ...fieldMessage.anatomy!, parts: { ...fieldMessage.anatomy!.parts, message: { ...fieldMessage.anatomy!.parts.message, minHeight: undefined } } } };

  const buildFile = async (host: ComponentDef, lineBox: number, message: ComponentDef = fieldMessage) => {
    const defs = componentDefs.map((d) => (d.id === 'field-message' ? message : d));
    const project = (d: ComponentDef) => figmaAnatomySet(materializeForBrand(d, null), { swapTarget: SWAP });
    const all = defs.flatMap((d) => { try { return project(d); } catch { return []; } });
    const f = fullFor(all);
    const page: Page = { children: [] };
    const shim = makeShim({ vars: f.vars, styles: f.styles, effects: f.effects, comps: [], liveRoot: true, page, layoutModel: true, textLineBox: { [CAPTION]: lineBox } });
    const build = (d: ComponentDef) => applyComponentPlan(project(d), shim as any, { emitAsComponents: d.figmaProperties?.emitAsComponents });
    await prebuildDependencies(host, { defs, project, host: shim as any, build });
    const r = await build(host);
    const setNamed = (id: string) => page.children.find((c) => c.name === id && c.type === 'COMPONENT_SET') as Node | undefined;
    const boxes = (id: string) => new Map(((setNamed(id)?.children as Node[] | undefined) ?? []).map((m) => [String(m.name), { w: Math.round(m.width as number), h: Math.round(m.height as number) }]));
    return { r, boxes, foot: r.misses.filter((m) => m.startsWith('footprint -> ')) };
  };
  // Every member compared with its own `status=default` sibling — the rest of its name held fixed. Worked out
  // here from the member NAMES, not from the executor's cohort key.
  const statusDrift = (boxes: Map<string, { w: number; h: number }>): string[] => {
    const out: string[] = [];
    for (const [name, b] of boxes) {
      const base = name.replace(/status=\w+/, 'status=default');
      const d = boxes.get(base);
      if (name !== base && d && (d.w !== b.w || d.h !== b.h)) out.push(`${name} ${b.w}x${b.h} vs ${base} ${d.w}x${d.h}`);
    }
    return out;
  };
  const SHORT = GLYPH - 1;   // the nb-redesign shape: a caption line box one pixel under the glyph

  // (0) THE SEED IS LOAD-BEARING: without the floor, a short caption makes the default message row shorter
  // than a status one — the owner's defect reproduced here, or every arm below passes on nothing.
  const bare = await buildFile(byDef('text-field'), SHORT, unfloored);
  const bareFm = bare.boxes('field-message');
  ok(bareFm.get('status=default')?.h === SHORT && bareFm.get('status=error')?.h === GLYPH,
    `message-row seed: with no floor, a ${SHORT}px caption row measures ${SHORT} in the default message and ${GLYPH} beside the glyph (default ${bareFm.get('status=default')?.h}, error ${bareFm.get('status=error')?.h})`);

  // The live report's counts, hand-copied: 15 on text-field (3 statuses x 5 states), 12 on select (3 x 4).
  // One more state column since the field family's `filled` (2026-09-25): 3 x 6 and 3 x 5.
  const LIVE_MISSES: Record<string, number> = { 'text-field': 18, select: 15 };
  for (const id of ['text-field', 'select']) {
    const shipped = await buildFile(byDef(id), SHORT);
    const fm = shipped.boxes('field-message');
    const heights = [...fm.values()].map((b) => b.h);
    // (a) THE ROW: max(GLYPH, SHORT) = GLYPH in all four statuses.
    ok(fm.size === 4 && heights.every((h) => h === GLYPH),
      `message-row ${id}: every field-message status row measures ${GLYPH} (max of the ${GLYPH}px glyph and the ${SHORT}px caption) — [${[...fm].map(([n, b]) => `${n}:${b.h}`).join(', ')}]`);
    // (b) THE HOST: every status member of the field has its default sibling's footprint.
    const host = shipped.boxes(id);
    const drift = statusDrift(host);
    ok(host.size > 4 && [...host.values()].every((b) => b.h > GLYPH) && drift.length === 0 && shipped.foot.length === 0,
      `message-row ${id}: every status member of the field keeps its default sibling's footprint (${host.size} members; ${drift.length} drift${drift.length ? ` — ${drift[0]}` : ''}; ${shipped.foot.length} footprint misses${shipped.foot.length ? ` — ${shipped.foot[0]}` : ''})`);

    // (c) MUTATION, BY NAME: the same build with the floor removed reproduces the owner's misses.
    const reverted = await buildFile(byDef(id), SHORT, unfloored);
    ok(reverted.foot.some((m) => /^footprint -> .*status=(error|warning|success).* measures \d+x\d+ but .*status=default.* measures \d+x\d+/.test(m)) && reverted.foot.length === LIVE_MISSES[id] && statusDrift(reverted.boxes(id)).length > 0,
      `message-row ${id} MUTATION: without the row's minHeight a status member measures 1px taller than its default sibling and the executor reports it by name — the live report's ${LIVE_MISSES[id]} (${reverted.foot.length} footprint misses${reverted.foot.length ? ` — ${reverted.foot[0]}` : ''})`);
  }

  // (d) A FLOOR, NOT A FIXED HEIGHT: a caption line box TALLER than the glyph wins, in every status.
  const TALL = GLYPH + 4;
  const tall = await buildFile(byDef('text-field'), TALL);
  const tallFm = [...tall.boxes('field-message').values()].map((b) => b.h);
  ok(tallFm.length === 4 && tallFm.every((h) => h === TALL) && tall.foot.length === 0,
    `message-row: with a ${TALL}px caption the row hugs the caption in every status, not the ${GLYPH}px floor ([${tallFm.join(', ')}], ${tall.foot.length} footprint misses)`);
}

// ---- THE TEXTAREA CONTROL IS `rows` LINES TALL, PLUS PADDING (its Figma projection) ----------------
// The textarea's control binds no height: it hugs its block padding and a value text that reserves the
// `rows` prop's default of its own line height. So the built control must measure rows × line + 2 × pad-y
// at every member, in whatever brand, and track the line height when it moves.
//
// Driven through the REAL executor, dependency-first into one live file, with the shim's `layoutModel`.
// ORACLES AUTHORED HERE (docs/34): ROWS is hand-written (3, the def's documented default — not read off the
// def), the line height is (a) a real brand's EMITTED text style resolved through its own tree, and (b)/(c)
// two synthetic metrics chosen here, one per unit, and the padding is read off the shim's own variable
// model. Never read off the plan. The in-test mutation drops the def's `lines` and requires a one-line box.
{
  const ROWS = 3;
  const textarea = componentDefs.find((d) => d.id === 'textarea')!;
  const taPlans = figmaAnatomySet(materializeForBrand(textarea, null), { swapTarget: SWAP });
  // The VALUE text's style — the control's `text` node, found by name, now that the counter adds a caption.
  const textOf = (n: AnatomyPlan['root']): AnatomyPlan['root'] | undefined => n.name === 'text' ? n : n.children.map(textOf).find(Boolean);
  const valueStyles = [...new Set(taPlans.map((p) => textOf(p.root)?.textStyle))];
  ok(valueStyles.length === 1 && !!valueStyles[0], `textarea rows: the value text sets in exactly one style (${valueStyles.join(', ')})`);
  const VALUE = valueStyles[0]!;
  const PAD_Y = varValue('size/md/padding-y');   // what the shim binds the control's block padding to
  type Metrics = NonNullable<ShimOpts['styleMetrics']>[string];
  const lineOf = (m: Metrics): number => (m.lineHeight.unit === 'PIXELS' ? m.lineHeight.value! : (m.lineHeight.value! / 100) * m.fontSize);

  const buildTextarea = async (m: Metrics, def: ComponentDef = textarea) => {
    const defs = componentDefs.map((d) => (d.id === 'textarea' ? def : d));
    const project = (d: ComponentDef) => figmaAnatomySet(materializeForBrand(d, null), { swapTarget: SWAP });
    const all = defs.flatMap((d) => { try { return project(d); } catch { return []; } });
    const f = fullFor(all);
    const page: Page = { children: [] };
    // One line of the value style is exactly `lineOf(m)` tall, so an unfloored text is ONE line.
    const shim = makeShim({ vars: f.vars, styles: f.styles, effects: f.effects, comps: [], liveRoot: true, page, layoutModel: true, textLineBox: { [VALUE]: lineOf(m) }, styleMetrics: { [VALUE]: m } });
    const build = (d: ComponentDef) => applyComponentPlan(project(d), shim as any, { emitAsComponents: d.figmaProperties?.emitAsComponents });
    await prebuildDependencies(def, { defs, project, host: shim as any, build });
    const r = await build(def);
    const set = page.children.find((c) => c.name === 'textarea' && c.type === 'COMPONENT_SET') as Node | undefined;
    // Found by name at any depth: the control sits in the field's `body` column, below the member's root.
    const named = (n: Node, name: string): Node | undefined => n.name === name ? n : ((n.children as Node[]) ?? []).map((c) => named(c, name)).find(Boolean);
    const controls = ((set?.children as Node[] | undefined) ?? []).map((mb) => ((mb.children as Node[]) ?? []).map((c) => named(c, 'control')).find(Boolean));
    return { r, controls, heights: [...new Set(controls.map((c) => (c ? Math.round((c.height as number) * 1000) / 1000 : NaN)))], foot: r.misses.filter((x) => x.startsWith('footprint -> ')) };
  };

  // (a) A REAL BRAND'S LINE HEIGHT: the NB fixture's emitted `body/md/default`, its font size resolved
  // through the brand's own tree — the emitter, a code path separate from the projection.
  const nbStyle = buildFigmaTextStyles(nbTheme()).styles.find((s) => s.name === VALUE)!;
  const { tree: nbTree } = buildTree(nbTheme());
  const sizeVar = (nbStyle.properties.fontSize as { variable: string }).variable.split('/');
  const sizeLeaf = sizeVar.slice(1).reduce<any>((o, k) => o?.[k], (nbTree as any)[sizeVar[0]]);
  const NB: Metrics = { fontSize: pxOf(nbTree as never, sizeLeaf), lineHeight: (nbStyle.properties.lineHeight as { value: Metrics['lineHeight'] }).value };
  ok(NB.fontSize > 0 && NB.lineHeight.unit === 'PERCENT', `textarea rows seed: the NB value style is ${NB.fontSize}px at ${NB.lineHeight.value}% (one line ${lineOf(NB)}px)`);
  // (b) and (c): two metrics that differ from the brand's and from each other, one per unit.
  const CASES: [string, Metrics][] = [
    ['NB body/md/default', NB],
    ['18px at 140%', { fontSize: 18, lineHeight: { unit: 'PERCENT', value: 140 } }],
    ['a 30px PIXELS line', { fontSize: 20, lineHeight: { unit: 'PIXELS', value: 30 } }],
    // The live case (2026-09-25, owner's MCP testing file): 3 × 16px × 165% = 79.2, which the host stores at
    // single precision and reads back as 79.19999694824219. An exact read-back compare reported all 20 as
    // DISCARDED; the arm requires 0 misses on the value the host actually holds (the shim models the rounding).
    ['the live case: 16px at 165%', { fontSize: 16, lineHeight: { unit: 'PERCENT', value: 165 } }],
  ];
  for (const [label, m] of CASES) {
    const want = ROWS * lineOf(m) + 2 * PAD_Y;
    const b = await buildTextarea(m);
    ok(b.controls.length === 24 && b.controls.every(Boolean) && b.heights.length === 1 && Math.abs(b.heights[0] - want) <= 0.01 && b.foot.length === 0 && b.r.misses.length === 0,
      `textarea rows (${label}): every one of the 24 controls measures ${ROWS} × ${lineOf(m)} + 2 × ${PAD_Y} = ${want} (got [${b.heights.join(', ')}] over ${b.controls.length} member(s); ${b.foot.length} footprint misses; ${b.r.misses.length} misses${b.r.misses.length ? ` — ${b.r.misses[0]}` : ''})`);
  }

  // (d) MUTATION, BY NAME: without `lines` the value text is one line and the control is one line tall.
  const unreserved: ComponentDef = { ...textarea, anatomy: { ...textarea.anatomy!, parts: { ...textarea.anatomy!.parts, text: { ...textarea.anatomy!.parts.text, lines: undefined } } } };
  const bare = await buildTextarea(NB, unreserved);
  ok(bare.heights.length === 1 && Math.abs(bare.heights[0] - (lineOf(NB) + 2 * PAD_Y)) < 1e-6,
    `textarea rows MUTATION: with the text's \`lines\` removed the control is ONE line tall, ${lineOf(NB)} + 2 × ${PAD_Y} (got [${bare.heights.join(', ')}]) — so the arms above measure the reserved rows, not a hug that happens to agree`);
}

// ---- THE TEXTAREA'S RESIZE GRIP AND CHARACTER COUNTER (owner decisions (c) and (d), 2026-09-25) ------
// (c) a grip glyph pinned into the control's bottom-right corner behind a `resize handle` boolean, ON by
// default; (d) a counter caption trailing the message behind a `character count` boolean, OFF by default.
// Neither may move a box: the grip is out of the flow, and the counter is a caption beside a caption.
//
// Driven through the REAL executor, dependency-first into one live file, with the shim's `layoutModel`
// (a hidden child takes no cell, as on the host). ORACLES AUTHORED HERE (docs/34): the panel names and their
// defaults are the owner's words, typed here; the grip's artboard and inset are the shim's own variable
// values for the two tokens the owner's brief names (the smallest icon rung, the control's edge weight); the
// corner is worked by hand from the control's measured box. Never read off the def or the plan.
//
// The mutations each arm exists to catch, by name: the grip left IN the flow (no `layoutPositioning`) fails
// `textarea grip corner` and `textarea grip footprint`; the counter defaulted ON fails `textarea counter
// default`; the stack gap moved from the cells back onto the column above the row fails `textarea counter
// footprint` on the neither combination.
{
  const textarea = componentDefs.find((d) => d.id === 'textarea')!;
  const GRIP = varValue('icon/size/xs');              // the smallest icon rung, as the shim binds it
  // The control's edge weight as the FILE resolves it for a consumer (what the executor reads for `x`/`y`).
  // Set here to a number no other shim value takes (the ring constants are 2), so a placement that read the
  // wrong variable, or none, lands somewhere else.
  const INSET = 3;
  const taPlans = figmaAnatomySet(materializeForBrand(textarea, null), { swapTarget: SWAP });
  const styles = [...new Set(taPlans.flatMap((p) => planTextStyles(p.root)))];
  const VALUE = 'body/md/default';
  const CAPTION = 'caption/md/default';
  ok(styles.includes(VALUE) && styles.includes(CAPTION),
    `textarea grip/counter seed: the set sets its value in ${VALUE} and a caption in ${CAPTION} (${styles.join(', ')})`);
  // Wider than the control's 320 floor at the shim's 6px per character, so the control's width FOLLOWS its
  // flow content and a glyph in the flow would show in it. At the 11-character placeholder the floor hides it.
  const LONG = 'x'.repeat(80);
  const find = (n: Node | undefined, name: string): Node | undefined => {
    if (!n) return undefined;
    if (n.name === name) return n;
    for (const c of (n.children as Node[] | undefined) ?? []) { const f = find(c, name); if (f) return f; }
    return undefined;
  };
  const box = (n: Node | undefined) => (n ? `${Math.round((n.width as number) * 1000) / 1000}x${Math.round((n.height as number) * 1000) / 1000}` : 'absent');

  const buildIt = async (def: ComponentDef, captionBox: number) => {
    const defs = componentDefs.map((d) => (d.id === 'textarea' ? def : d));
    const project = (d: ComponentDef) => figmaAnatomySet(materializeForBrand(d, null), { swapTarget: SWAP });
    const all = defs.flatMap((d) => { try { return project(d); } catch { return []; } });
    const f = fullFor(all);
    const page: Page = { children: [] };
    const shim = makeShim({ vars: f.vars, styles: f.styles, effects: f.effects, comps: [], liveRoot: true, page, layoutModel: true, textLineBox: { [VALUE]: 20, [CAPTION]: captionBox }, varOverrides: { 'border-width/hairline': INSET } });
    const build = (d: ComponentDef) => applyComponentPlan(project(d), shim as any, { emitAsComponents: d.figmaProperties?.emitAsComponents });
    await prebuildDependencies(def, { defs, project, host: shim as any, build });
    const r = await build(def);
    const set = page.children.find((c) => c.name === 'textarea' && c.type === 'COMPONENT_SET') as Node | undefined;
    return { r, set, members: ((set?.children as Node[] | undefined) ?? []) };
  };
  // The BOOLEAN property a set declares under a panel name, with the key a node's reference must carry.
  const boolProp = (set: Node | undefined, panel: string) => {
    const defs = ((set as any)?.componentPropertyDefinitions ?? {}) as Record<string, { type: string; defaultValue: unknown }>;
    const key = Object.keys(defs).find((k) => k.split('#')[0] === panel);
    return key ? { key, ...defs[key] } : undefined;
  };

  const b = await buildIt(textarea, GRIP - 1);
  ok(b.members.length === 24 && b.r.misses.length === 0,
    `textarea grip/counter: the set builds 24 members with 0 misses (${b.members.length}; ${b.r.misses[0] ?? 'none'})`);

  // ---- the grip: a `resize handle` boolean, ON by default, on every member ----
  const handle = boolProp(b.set, 'resize handle');
  const grips = b.members.map((m) => find(m, 'grip'));
  ok(handle?.type === 'BOOLEAN' && handle.defaultValue === true
    && grips.every((g) => g && g.visible !== false && (g.componentPropertyReferences as Record<string, string> | null)?.visible === handle.key),
    `textarea grip default: a 'resize handle' BOOLEAN defaulting to true drives the grip's visibility, and all 24 members build it shown (${JSON.stringify(handle)}; ${grips.filter((g) => g && g.visible !== false).length} shown)`);

  // ---- the grip sits IN THE CORNER, out of the flow ----
  const cornerMiss: string[] = [];
  for (const m of b.members) {
    const g = find(m, 'grip');
    const ctl = find(m, 'control');
    if (!g || !ctl) { cornerMiss.push(`${m.name}: ${g ? '' : 'no grip '}${ctl ? '' : 'no control'}`); continue; }
    const wantX = (ctl.width as number) - GRIP - INSET;
    const wantY = (ctl.height as number) - GRIP - INSET;
    const c = g.constraints as { horizontal?: string; vertical?: string } | null;
    if (g.layoutPositioning !== 'ABSOLUTE' || c?.horizontal !== 'MAX' || c?.vertical !== 'MAX'
      || g.width !== GRIP || g.height !== GRIP || Math.abs((g.x as number) - wantX) > 1e-6 || Math.abs((g.y as number) - wantY) > 1e-6)
      cornerMiss.push(`${m.name}: ${String(g.layoutPositioning)} ${JSON.stringify(c)} ${g.width}x${g.height} at (${g.x}, ${g.y}), want ABSOLUTE MAX/MAX ${GRIP}x${GRIP} at (${wantX}, ${wantY})`);
  }
  ok(b.members.length === 24 && cornerMiss.length === 0,
    `textarea grip corner: on all 24 members the ${GRIP}px grip is ABSOLUTE, constrained MAX/MAX, at (control − ${GRIP} − ${INSET}) on both axes (${cornerMiss.length} off — ${cornerMiss[0] ?? 'none'})`);

  // ---- the grip moves no box: the control and the member measure alike with it on and off ----
  // With the LONG value the control's width follows its flow content (the floor is checked, so this arm
  // cannot pass by the 320 floor absorbing a glyph in the flow).
  const gripFoot: string[] = [];
  let contentDriven = 0;
  for (const m of b.members) {
    const g = find(m, 'grip');
    const ctl = find(m, 'control');
    const text = find(ctl, 'text');
    if (!g || !ctl || !text) { gripFoot.push(`${m.name}: incomplete`); continue; }
    text.characters = LONG;
    if ((ctl.width as number) > 320) contentDriven++;
    const on = [box(ctl), box(m)];
    g.visible = false;
    const off = [box(ctl), box(m)];
    g.visible = true;
    if (on.join() !== off.join()) gripFoot.push(`${m.name}: control ${on[0]} with the grip, ${off[0]} without; member ${on[1]} vs ${off[1]}`);
  }
  ok(b.members.length === 24 && contentDriven === 24,
    `textarea grip footprint seed: with an ${LONG.length}-character value every control is wider than its 320 floor, so a glyph in the flow would show in its width (${contentDriven}/24)`);
  ok(b.members.length === 24 && gripFoot.length === 0,
    `textarea grip footprint: the control and the member measure alike with the grip on and off, on all 24 members (${gripFoot.length} moved — ${gripFoot[0] ?? 'none'})`);

  // ---- the counter and the message: two INDEPENDENT booleans (the owner's answer 2, 2026-09-25) ----
  // Each switch drives its own layer, and neither layer holds the other, so all four combinations exist.
  const count = boolProp(b.set, 'character count');
  const msg = boolProp(b.set, 'message');
  const refOf = (n: Node | undefined) => (n?.componentPropertyReferences as Record<string, string> | null)?.visible;
  const holder = (m: Node, key: string | undefined): Node | undefined => {
    const walk = (n: Node): Node | undefined => {
      if (refOf(n) === key) return n;
      for (const c of (n.children as Node[] | undefined) ?? []) { const f = walk(c); if (f) return f; }
      return undefined;
    };
    return key ? walk(m) : undefined;
  };
  const counters = b.members.map((m) => find(m, 'counter'));
  const countLayers = b.members.map((m) => holder(m, count?.key));
  const msgLayers = b.members.map((m) => holder(m, msg?.key));
  ok(count?.type === 'BOOLEAN' && count.defaultValue === false
    && countLayers.every((l, i) => l && l.visible === false && find(l, 'counter') === counters[i]),
    `textarea counter default: a 'character count' BOOLEAN defaulting to false drives a layer holding the counter, and all 24 members build it hidden (${JSON.stringify(count)}; ${countLayers.filter((l) => l && l.visible === false).length} hidden)`);
  ok(msg?.type === 'BOOLEAN' && msg.defaultValue === true
    && msgLayers.every((l, i) => l && l.visible !== false && find(l, 'message') !== undefined && !find(l, 'counter') && !find(countLayers[i], 'message')),
    `textarea counter independent: the 'message' BOOLEAN (default true) drives a layer holding the message and NOT the counter, and the counter's layer holds no message, on all 24 members (${JSON.stringify(msg)})`);
  const rows = b.members.map((m) => find(m, 'messageRow'));
  ok(rows.every((r, i) => r && r.layoutAlign === 'STRETCH' && (r.children as Node[]).at(-1) === countLayers[i]
      && countLayers[i]!.layoutGrow === 1 && countLayers[i]!.primaryAxisAlignItems === 'MAX'),
    `textarea counter row: on all 24 members the counter's layer is the LAST child of the stretched message row, GROWS across it (layoutGrow 1) and justifies the counter to its end (MAX), so the counter trails with the message on or off`);
  ok(counters.every((c) => c && c.characters === '0 / 200'),
    `textarea counter text: the counter reads "0 / 200", the def's counter format (${counters[0]?.characters})`);

  // ---- the four combinations, each with no stray row or gap, with the caption's line box under and over
  // the glyph. The expected height is worked here from the stack gap (the shim's `space/100`, the field's
  // `root-gap`) and the measured label, control, message and counter: neither → label + gap + control; any
  // shown → that plus ONE gap plus the taller of what is shown. Never read off the def or the plan.
  const GAP = varValue('space/100');
  for (const captionBox of [GRIP - 1, GRIP + 4]) {
    const bb = captionBox === GRIP - 1 ? b : await buildIt(textarea, captionBox);
    const off: string[] = [];
    let cells = 0;
    for (const m of bb.members) {
      const cl = holder(m, count?.key);
      const ml = holder(m, msg?.key);
      const label = find(m, 'label');
      const ctl = find(m, 'control');
      const message = find(m, 'message');
      const counter = find(m, 'counter');
      if (!cl || !ml || !label || !ctl || !message || !counter) { off.push(`${m.name}: incomplete`); continue; }
      const base = (label.height as number) + GAP + (ctl.height as number);
      for (const [showMsg, showCount] of [[true, false], [false, true], [true, true], [false, false]] as const) {
        ml.visible = showMsg;
        cl.visible = showCount;
        const shown = [showMsg ? (message.height as number) : 0, showCount ? (counter.height as number) : 0];
        const want = base + (showMsg || showCount ? GAP + Math.max(...shown) : 0);
        const got = m.height as number;
        if (Math.abs(got - want) > 1e-6) off.push(`${m.name} message ${showMsg ? 'on' : 'off'}, count ${showCount ? 'on' : 'off'}: ${got}, want ${want}`);
        else cells++;
      }
      ml.visible = true;
      cl.visible = false;
    }
    ok(bb.members.length === 24 && bb.r.misses.length === 0 && off.length === 0 && cells === 96,
      `textarea counter footprint (caption line box ${captionBox}, glyph ${GRIP}): message only, counter only, both and neither each measure label + gap + control, plus one gap and the taller shown part when any is shown, on all 24 members (${cells}/96; ${off.length} off — ${off[0] ?? 'none'})`);
  }
}

// ---- THE FIELD FAMILY'S FILLED STATE: TEXT INK BY STATE (owner decision, 2026-09-25) ---------------
// Every non-filled state shows the placeholder in `text.secondary` (rest, hover, focus-visible); disabled
// uses the disabled ink; `filled` shows the value in `text.primary`; read-only shows a value, so primary too.
// The map below is TYPED FROM THAT RULE (docs/34) — never read off a def or a plan — and every projected
// member of text-field, textarea and select is built through the REAL executor and its value text's bound
// fill read back off the shim. The state column must be exactly the owner's: a member at a state the map
// does not name, or a map state with no member, fails as loudly as a wrong ink.
//
// The mutations it exists to catch, by name: `filled` bound to secondary, or `hover` bound to primary, in
// any of the three defs fails `field ink (<def>)`.
{
  const PLACEHOLDER = 'color/text/secondary';
  const VALUE = 'color/text/primary';
  const DISABLED = 'color/disabled/on-fill';   // the value text sits on the disabled fill
  const INK: Record<string, Record<string, string>> = {
    'text-field': { rest: PLACEHOLDER, hover: PLACEHOLDER, filled: VALUE, 'focus-visible': PLACEHOLDER, disabled: DISABLED, 'read-only': VALUE },
    textarea: { rest: PLACEHOLDER, hover: PLACEHOLDER, filled: VALUE, 'focus-visible': PLACEHOLDER, disabled: DISABLED, 'read-only': VALUE },
    select: { rest: PLACEHOLDER, hover: PLACEHOLDER, filled: VALUE, 'focus-visible': PLACEHOLDER, disabled: DISABLED },
  };
  const STATUSES = ['default', 'error', 'warning', 'success'];
  const named = (n: Node, name: string): Node | undefined => n.name === name ? n : ((n.children as Node[]) ?? []).map((c) => named(c, name)).find(Boolean);
  const project = (d: ComponentDef) => figmaAnatomySet(materializeForBrand(d, null), { swapTarget: SWAP });
  const all = componentDefs.flatMap((d) => { try { return project(d); } catch { return []; } });
  const f = fullFor(all);
  for (const [id, want] of Object.entries(INK)) {
    const def = componentDefs.find((d) => d.id === id)!;
    const page: Page = { children: [] };
    const shim = makeShim({ vars: f.vars, styles: f.styles, effects: f.effects, comps: [], liveRoot: true, page, layoutModel: true });
    const build = (d: ComponentDef) => applyComponentPlan(project(d), shim as any, { emitAsComponents: d.figmaProperties?.emitAsComponents });
    await prebuildDependencies(def, { defs: componentDefs, project, host: shim as any, build });
    const r = await build(def);
    const set = page.children.find((c) => c.name === id && c.type === 'COMPONENT_SET') as Node | undefined;
    const members = ((set?.children as Node[] | undefined) ?? []);
    const wrong: string[] = [];
    const seen = new Set<string>();
    for (const m of members) {
      const coord = Object.fromEntries(String(m.name).split(', ').map((kv) => kv.split('=')));
      const state = coord.state;
      seen.add(`${coord.status}|${state}`);
      const text = named(m, 'text');
      const got = text ? paintVar(text, 'fills') : 'NO TEXT';
      if (!(state in want)) wrong.push(`${m.name}: a state the owner's rule does not name`);
      else if (got !== want[state]) wrong.push(`${m.name}: ${got}, want ${want[state]}`);
    }
    const missing = STATUSES.flatMap((st) => Object.keys(want).filter((s2) => !seen.has(`${st}|${s2}`)).map((s2) => `status=${st}, state=${s2}`));
    ok(r.misses.length === 0 && members.length === STATUSES.length * Object.keys(want).length && wrong.length === 0 && missing.length === 0,
      `field ink (${id}): on all ${members.length} members the value text binds the owner's ink for its state — placeholder ${PLACEHOLDER} at rest/hover/focus-visible, value ${VALUE} at filled${'read-only' in want ? '/read-only' : ''}, ${DISABLED} at disabled (${wrong.length} wrong — ${wrong[0] ?? 'none'}; ${missing.length} missing — ${missing[0] ?? 'none'}; ${r.misses[0] ?? '0 misses'})`);
  }
}

// =============================================================================================
// #1664 — THE REFERENCE RETRY OUTLASTS A HOST REFUSAL WINDOW MEASURED IN SECONDS, AND STAYS BOUNDED
// =============================================================================================
// Live Button (2026-09-25): a CONTIGUOUS run of members refused every reference write for a window —
// 44 members wired in 0.8 s, 90 misses — as a throw or as an accepted write that read back `undefined`.
// #1568's single retry after a `setTimeout(0)` ran ~6 s later and repaired 0; the same write succeeded
// minutes after. `refuseRefsWindow` (component-shim.ts) models that window on a clock THIS block owns: the
// injected `yieldTo(ms)` advances it by exactly the wait the executor asked for, and records every non-zero
// wait. So "how long did it wait, and how often" is witnessed here, never read off the executor's own
// `refsBackoff` (docs/34), and a 10 s wait costs the suite nothing.
//
// The arms and the mutations each one exists to catch, by name:
//   (a) a 3 s window, both shapes, heals fully — FAILS if the back-off is cut back to one pass (#1568's
//       single retry: the 0.5 s pass meets the window still open);
//   (b) a permanent refusal, both shapes, ends as misses after exactly the declared waits and the build
//       returns — FAILS on an unbounded loop (the clock guard below throws past 20 waits);
//   (c) a clean build asks for no wait at all — FAILS if the back-off always waits.
// The FLOOR is (a)'s own: the window must actually refuse on the first attempt, or (a) proves nothing.
{
  const clean = { page: { children: [] } as Page };
  await run(grid, { ...fullFor(grid), page: clean.page });
  const cleanSet = clean.page.children[0] as Node | undefined;
  const memberNames = ((cleanSet?.children ?? []) as Node[]).map((m) => String(m.name));
  // A contiguous run in wire order, well inside the set — the live shape, not the first or last member.
  const RUN = memberNames.slice(3, 9);
  /** Every reference id each member's subtree holds, read off the shim tree — what is IN the file. */
  const heldRefs = (set: Node | undefined): Map<string, string[]> => {
    const out = new Map<string, string[]>();
    for (const m of ((set?.children ?? []) as Node[])) {
      const ids: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural walk over the shim tree
      const walk = (x: any): void => { for (const [f, id] of Object.entries(x?.componentPropertyReferences ?? {})) ids.push(`${String(x.name)}.${f}=${id as string}`); for (const c of x?.children ?? []) walk(c); };
      walk(m);
      out.set(String(m.name), ids.sort());
    }
    return out;
  };
  const cleanHeld = heldRefs(cleanSet);
  const runRefs = RUN.reduce((n, m) => n + (cleanHeld.get(m)?.length ?? 0), 0);
  ok(RUN.length === 6 && runRefs > 0,
    `#1664 input pin: the refusing run is 6 contiguous members holding ${runRefs} references in a clean build (${RUN.join(' | ')})`);

  const runWindow = async (win?: { ms: number; shape: 'throw' | 'discard' }) => {
    const clock = { t: 0 };
    const waits: number[] = [];
    const page: Page = { children: [] };
    let threw: string | undefined;
    let res: Awaited<ReturnType<typeof run>> | undefined;
    try {
      res = await run(grid, {
        ...fullFor(grid), page,
        ...(win ? { refuseRefsWindow: { members: RUN, ms: win.ms, shape: win.shape, now: () => clock.t } } : {}),
      }, {
        yieldTo: (ms = 0) => {
          if (ms > 0) {
            waits.push(ms);
            // THE TERMINATION GUARD: 20 waits is five times the declared schedule. Past it the executor is
            // not backing off, it is looping — throw so the build stops and the arm below reports it.
            if (waits.length > 20) throw new Error(`unbounded back-off: ${waits.length} waits`);
          }
          clock.t += ms;
          return Promise.resolve();
        },
      });
    } catch (e) { threw = (e as Error).message; }
    const set = page.children[0] as Node | undefined;
    const held = heldRefs(set);
    const lost: string[] = [];
    for (const [m, want] of cleanHeld) {
      const got = new Set(held.get(m) ?? []);
      for (const r of want) if (!got.has(r)) lost.push(`${m}/${r}`);
    }
    let report: Record<string, unknown> = {};
    try { report = JSON.parse(String((set as any)?.getSharedPluginData?.('prism3', 'build') ?? '{}')) as Record<string, unknown>; } catch { /* reported by the arms */ }
    return { res, threw, waits, lost, report, refMisses: (res?.misses ?? []).filter((m) => m.startsWith('ref ')) };
  };

  // ---- (c) a clean build schedules no back-off wait -------------------------------------------
  const c = await runWindow();
  ok(!c.threw && c.waits.length === 0 && c.lost.length === 0,
    `#1664c a clean build asks the host for no back-off wait at all (${c.waits.length} wait(s): ${c.waits.join(', ') || 'none'}; ${c.lost.length} reference(s) lost)`);

  // ---- (a) a window shorter than the back-off heals fully, both shapes ------------------------
  for (const shape of ['throw', 'discard'] as const) {
    const a = await runWindow({ ms: 3000, shape });
    const passes = (a.res?.refsBackoff ?? []);
    // FLOOR: the window really refused — the first pass found work, so the repairs are the window's.
    ok(!a.threw && passes.length > 0 && passes[0].retried === runRefs,
      `#1664a floor (${shape}): the 3 s window refused all ${runRefs} references on the run's first attempt (first pass retried ${passes[0]?.retried ?? 0})`);
    ok(!a.threw && a.lost.length === 0 && a.refMisses.length === 0,
      `#1664a a ${shape} refusal window of 3 s heals fully — every reference the clean build holds is held, 0 ref misses (${a.lost.length} lost: ${a.lost.slice(0, 3).join(' | ') || 'none'}; misses: ${a.refMisses.slice(0, 2).join(' | ') || 'none'}${a.threw ? `; THREW ${a.threw}` : ''})`);
    const repaired = passes.reduce((n, p) => n + p.repaired, 0);
    ok(repaired === runRefs && a.waits.reduce((x, y) => x + y, 0) >= 3000,
      `#1664a (${shape}) the repair is reported and the wait that made it is real: ${repaired}/${runRefs} repaired over passes [${passes.map((p) => `${p.afterMs}ms ${p.repaired}/${p.retried}`).join(', ')}], clock waits [${a.waits.join(', ')}]`);
    const rb = a.report.refsBackoff as { afterMs: number; repaired: number }[] | undefined;
    ok(Array.isArray(rb) && rb.length === passes.length && rb.reduce((n, p) => n + p.repaired, 0) === runRefs,
      `#1664a (${shape}) the set's build report carries the window: refsBackoff ${JSON.stringify(rb)}`);
  }

  // ---- (b) a permanent refusal ends as misses after the bounded passes, both shapes -----------
  const scheduled = REF_BACKOFF_MS.reduce((x, y) => x + y, 0);
  ok(REF_BACKOFF_MS.length === 4 && scheduled <= 18000,
    `#1664b input pin: the back-off is at most 4 passes and ~18 s (${REF_BACKOFF_MS.join(', ')} = ${scheduled}ms)`);
  for (const shape of ['throw', 'discard'] as const) {
    const b = await runWindow({ ms: Infinity, shape });
    const want = shape === 'throw' ? /Could not create a new component property reference/ : /DISCARDED \(set /;
    ok(!b.threw && b.waits.length <= 4 && b.waits.reduce((x, y) => x + y, 0) <= 18000,
      `#1664b a permanent ${shape} refusal still TERMINATES within the bound — ${b.waits.length} wait(s) totalling ${b.waits.reduce((x, y) => x + y, 0)}ms${b.threw ? `; THREW ${b.threw}` : ''}`);
    ok(!b.threw && b.refMisses.length === runRefs && b.refMisses.every((m) => want.test(m) && RUN.some((r) => m.includes(r))) && b.lost.length === runRefs,
      `#1664b ...and every refused reference ends as a named ${shape} miss on the run's members (${b.refMisses.length}/${runRefs}: ${b.refMisses[0] ?? 'none'})`);
  }
}

if (failed) process.exit(1);
