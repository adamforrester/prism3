/**
 * Plugin OPT-IN PRUNE test (#1521; modes + all four style kinds since #1570) — drives the pure
 * `computePrunePlan` detector and the real `applyPrunePlan` executor against in-memory shims, with no
 * live Figma.
 *
 *   npx tsx apps/plugin/test-prune.ts
 *
 * The prune is the delete #479 / #1152 deliberately refused to do on a normal apply, made safe by two
 * things this file exists to pin: the detection is REUSED (`orphansOf` / `strandedCollections` /
 * `claimModes`), and a NAMESPACE guard keeps a hand-added item from ever being swept up. The guard is the
 * whole safety argument, so the by-name mutation is here: each "NOT pruned" assertion below names the item
 * a dropped guard would delete, and goes red — by name — the moment a guard is removed (docs/34). A test
 * that only checked "the ghosts are pruned" would pass on an implementation that also deleted the
 * designer's work.
 *
 * Three arms. The SYNTHETIC arm states the namespace policy crisply on hand-built data — the gate. The
 * REAL-PLAN arm drives the same detector off the shipped NB plans, so `root` derivation and the
 * `<root>/…` names are the engine's actual ones, not a fixture that could drift from them. The
 * CONFIG-SHRINK arm (#1570) is end-to-end: it APPLIES a 6-breakpoint config with the real executors, then
 * a 2-breakpoint one, then prunes — so the detector is held to a file the engine itself wrote, and the
 * final assertion is the owner's acceptance criterion ("removing them leaves a clean current-config
 * file") rather than a restatement of the detector's own arithmetic.
 *
 * Mirrors the sibling shim tests' dependency-free `ok(...)` style; exits non-zero on any failure.
 */
import { existsSync, readFileSync } from 'node:fs';
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import {
  buildWritePlan, buildFloatWritePlan, buildFontVarPlan, buildTextStylePlan, buildGridStylePlan, buildStylesPlan,
} from '@prism3/engine/write-plan';
import { nbThemeFrom, brandTheme } from '@prism3/engine/theme';
import nbMeasured from '@prism3/engine/schema/nb-measured.json';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { rootOf } from '@prism3/engine/figma-names';
import { applyFloatPlan } from './src/write-figma';
import { applyGridStylePlan } from './src/write-grid-styles';
import {
  computePrunePlan, prunePlanCount, applyPrunePlan, prunePreviewSummary, pruneAppliedSummary, STYLE_KINDS,
  isEngineDescription,
} from './src/prune-figma';
import type { PruneInput, PruneApi, StyleKind, StyleNames, FileStyles } from './src/prune-figma';
import type { BrandInput, Theme } from '@prism3/engine/theme';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

console.log('plugin OPT-IN PRUNE (#1521/#1570) — detector + executor against in-memory shims\n');

/** Style names with every kind present — the detector reads all four, so a fixture that omitted one
 *  would exercise the arm with `undefined` rather than with an empty namespace. */
const styleNames = (partial: Partial<StyleNames>): StyleNames =>
  ({ text: [], effect: [], paint: [], grid: [], ...partial });

/** The same, for the FILE side, where a style may carry the `description` the #1577 arm reads. */
const fileStyles = (partial: Partial<FileStyles>): FileStyles =>
  ({ text: [], effect: [], paint: [], grid: [], ...partial });

// ---- a removable in-memory shim -------------------------------------------------------------
// Objects the executor deletes through `.remove()` (and, for modes, `removeMode`). A removed collection is
// modelled as taking its variables with it (Figma's cascade), so a "survivor" is a live object in a live
// collection.
class RVar {
  removed = false;
  constructor(public id: string, public name: string, public variableCollectionId: string) {}
  remove(): void { this.removed = true; }
}
class RColl {
  removed = false;
  constructor(public id: string, public name: string, public modes: { modeId: string; name: string }[] = [{ modeId: `${id}:m0`, name: 'Mode 1' }]) {}
  removeMode(modeId: string): void { this.modes = this.modes.filter((m) => m.modeId !== modeId); }
  remove(): void { this.removed = true; }
}
class RStyle {
  removed = false;
  /** Written by the REAL `applyGridStylePlan` (`s.description = row.description`), which is what makes the
   *  descriptions the #1577 arm is tested against the ENGINE's own rather than strings typed here. */
  description = '';
  constructor(public name: string) {}
  remove(): void { this.removed = true; }
}
class PruneShim {
  constructor(public colls: RColl[], public vars: RVar[], public styles: Record<StyleKind, RStyle[]>) {}
  async getLocalVariableCollectionsAsync(): Promise<RColl[]> { return this.colls; }
  async getLocalVariablesAsync(): Promise<RVar[]> { return this.vars; }
  async getLocalTextStylesAsync(): Promise<RStyle[]> { return this.styles.text; }
  async getLocalEffectStylesAsync(): Promise<RStyle[]> { return this.styles.effect; }
  async getLocalPaintStylesAsync(): Promise<RStyle[]> { return this.styles.paint; }
  async getLocalGridStylesAsync(): Promise<RStyle[]> { return this.styles.grid; }
  /** Live = not removed, in a collection that is not removed (the cascade). */
  liveVarNames(): Set<string> {
    const deadColl = new Set(this.colls.filter((c) => c.removed).map((c) => c.id));
    return new Set(this.vars.filter((v) => !v.removed && !deadColl.has(v.variableCollectionId)).map((v) => v.name));
  }
  liveCollNames(): Set<string> { return new Set(this.colls.filter((c) => !c.removed).map((c) => c.name)); }
  liveStyleNames(kind: StyleKind): Set<string> { return new Set(this.styles[kind].filter((s) => !s.removed).map((s) => s.name)); }
}

// =============================================================================================
// SYNTHETIC ARM — the namespace policy, stated crisply. This is the gate.
// =============================================================================================
const ROOT = 'nbds';
const modes = (...names: string[]): { modeId: string; name: string }[] =>
  names.map((name, i) => ({ modeId: `m${i}-${name}`, name }));
/** The #1570 damage itself: a collection carrying TWO modes called `sm`, which is what the pre-fix
 *  positional rename produced. Distinct ids, identical names — only the id tells them apart. */
const duplicateSm = [
  { modeId: 'lay-xs-renamed', name: 'sm' },   // was `xs`; the pre-fix run renamed it on top of `sm`
  { modeId: 'lay-sm', name: 'sm' },           // the original, now unreachable to a name-keyed reader
  { modeId: 'lay-md', name: 'md' },
  { modeId: 'lay-lg', name: 'lg' },
];
const synthInput: PruneInput = {
  collections: [
    // A plan-owned collection: one planned var (survives), one in-namespace ghost (prune), one
    // hand-added foreign-root var (MUST survive — the namespace guard's whole job).
    { name: 'color', variableNames: [`${ROOT}/color/text/primary`, `${ROOT}/color/text/legacy`, 'my-brand/accent'], modes: modes('light', 'dark') },
    { name: 'core', variableNames: [`${ROOT}/core/palette/blue/500`], modes: modes('Default', 'left-over', 'extra') },
    { name: 'space', variableNames: [`${ROOT}/space/md`], modes: modes('Default') },
    // The #1570 shape: a plan-owned collection whose modes shrank, and whose earlier apply duplicated a
    // name. Planned modes are `sm`,`md` — so the second `sm` and `lg` are stale, and exactly ONE `sm`
    // survives.
    { name: 'layout', variableNames: [`${ROOT}/grid/columns`], modes: duplicateSm },
    // Plan-owned, but NONE of the plan's modes are present: this plan has never written here, so its
    // modes are not ours to judge — and refusing also guarantees the survivor Figma requires.
    { name: 'radius', variableNames: [`${ROOT}/radius/md`], modes: modes('legacy-only') },
    // Stranded + fully in-namespace → prune the whole collection (the #1148 `color.surface` shape).
    { name: 'color.surface', variableNames: [`${ROOT}/color/background/primary`], modes: modes('light', 'stale-mode') },
    // Stranded but holds a hand-added foreign var → MUST survive whole.
    { name: 'My Tokens', variableNames: ['my-brand/foo'], modes: modes('Mode 1') },
    // Stranded but empty → provenance unreadable, so MUST survive.
    { name: 'legacy-empty', variableNames: [], modes: modes('Mode 1') },
  ],
  styles: styleNames({
    text: [
      'display/xl',      // planned — survives
      'body/md',         // planned — survives
      'display/2xl',     // orphan, group `display` is in the plan → prune (the lowered-ceiling case)
      'Marketing/Hero',  // hand-added, group `Marketing` not in the plan → MUST survive
      'Heading',         // hand-added, no group in the plan → MUST survive
    ],
    effect: [
      'shadow/md',       // planned — survives
      'shadow/2xl',      // orphan in a planned group → prune
      'My FX/glow',      // hand-added → MUST survive
    ],
    paint: [
      'gradient/brand',  // planned — survives
      'gradient/legacy', // orphan in a planned group → prune
      // KIND INDEPENDENCE: `shadow` is a planned group for EFFECT styles, not for PAINT styles. A
      // per-kind namespace leaves this alone; one namespace pooled across kinds would delete it.
      'shadow/hand-made',
    ],
    grid: [
      'Grid / sm',       // planned — survives
      'Grid / md',       // planned — survives
      'Grid / xs',       // the shrink's leftover; group `Grid ` is planned → prune
      'My Grid / wide',  // hand-added → MUST survive
      // Hand-added and spelled WITHOUT the emitter's spaces, so its group is `Grid` and the emitter's is
      // `Grid ` — two namespaces, and that is the conservative reading. `styleGroup` used to `.trim()`,
      // which pooled them and put this style on the delete list.
      'Grid/wide',
    ],
  }),
  plannedVariables: [`${ROOT}/color/text/primary`, `${ROOT}/core/palette/blue/500`, `${ROOT}/space/md`, `${ROOT}/grid/columns`, `${ROOT}/radius/md`],
  plannedCollections: ['color', 'core', 'space', 'layout', 'radius'],
  plannedStyles: styleNames({
    text: ['display/xl', 'body/md'],
    effect: ['shadow/md'],
    paint: ['gradient/brand'],
    grid: ['Grid / sm', 'Grid / md'],
  }),
  plannedModes: [
    { collection: 'color', modes: ['light', 'dark'] },
    // `core` declared TWICE, by two plans — the real shape: it is reconciled by the palette, float and font
    // passes, each declaring `Default` plus whatever modes it owns. Neither entry is a superset of the
    // other, so only a UNION leaves both `left-over` and `extra` alone; keeping either entry alone (a
    // `set` that overwrites rather than merges) offers the other one's mode for deletion.
    { collection: 'core', modes: ['Default', 'left-over'] },
    { collection: 'core', modes: ['Default', 'extra'] },
    { collection: 'layout', modes: ['sm', 'md'] },
    { collection: 'radius', modes: ['Default'] },
    // A STRANDED collection, named here on purpose. The two lists are built from different expressions in
    // `main.ts` (`plannedCollections` from the plan names, the colour `plannedModes` from `$collection`), so
    // nothing ties them; the mode arm's plan-owned guard is what keeps a collection from being offered
    // whole AND having its modes proposed separately — the disjointness the module header claims.
    { collection: 'color.surface', modes: ['light'] },
    // `space` deliberately absent — no declaration is no knowledge, so nothing there is prunable.
  ],
  root: ROOT,
};

const plan = computePrunePlan(synthInput);
const prunedVars = plan.variables.flatMap((g) => g.names);
const prunedStyles = (kind: StyleKind): string[] => plan.styles.find((g) => g.kind === kind)?.names ?? [];
const prunedModes = (collection: string): string[] =>
  (plan.modes.find((g) => g.collection === collection)?.modes ?? []).map((m) => m.name);
const prunedModeIds = (collection: string): string[] =>
  (plan.modes.find((g) => g.collection === collection)?.modes ?? []).map((m) => m.modeId);

// --- variables ---
ok(prunedVars.includes(`${ROOT}/color/text/legacy`),
  'variable: an in-namespace orphan in a plan-owned collection IS pruned');
ok(!prunedVars.includes('my-brand/accent'),
  'variable: a hand-added variable OUTSIDE the namespace is NOT pruned (namespace guard) — the by-name pin');
ok(!prunedVars.includes(`${ROOT}/color/text/primary`),
  'variable: a variable still in the plan is NOT pruned (an update, not an orphan)');
ok(plan.variables.length === 1 && plan.variables[0].collection === 'color',
  'variable: orphans are grouped under the collection they live in');

// --- stranded collections ---
ok(plan.collections.includes('color.surface'),
  'collection: a stranded, fully-in-namespace collection IS pruned whole');
ok(!plan.collections.includes('My Tokens'),
  'collection: a stranded collection holding a hand-added foreign var is NOT pruned — the by-name pin');
ok(!plan.collections.includes('legacy-empty'),
  'collection: an empty stranded collection is NOT pruned (provenance unreadable)');

// --- modes (#1570) ---
ok(prunedModes('layout').join(',') === 'sm,lg',
  `mode: a shrunk plan-owned collection offers its stale modes — including the DUPLICATE \`sm\` the pre-fix apply left (got ${prunedModes('layout').join(',') || 'none'})`);
ok(prunedModeIds('layout').join(',') === 'lay-sm,lay-lg',
  `mode: the duplicate offered is identified by modeId, and it is the copy \`claimModes\` did NOT claim (${prunedModeIds('layout').join(',') || 'none'}) — a name cannot say which of two \`sm\` modes survives`);
ok(prunedModes('core').length === 0,
  `mode: modes declared by a SECOND plan for the same collection are NOT pruned — the per-collection declarations are UNIONED, and \`left-over\`/\`extra\` come from different entries (got ${prunedModes('core').join(',') || 'none'})`);
ok(prunedModes('radius').length === 0,
  'mode: a plan-owned collection holding NONE of the plan’s modes is left alone — the by-name pin (no claim means the plan never wrote here, and it also guarantees a survivor)');
ok(prunedModes('space').length === 0,
  'mode: a collection the plan declares no modes for is left alone (no declaration is no knowledge)');
ok(prunedModes('color.surface').length === 0 && plan.collections.includes('color.surface'),
  'mode: a STRANDED collection’s modes are not offered separately even though the plan declares modes for it — it goes whole, modes with it (the plan-owned guard, and the by-name pin for the header’s disjointness claim)');
ok(plan.modes.every((g) => synthInput.collections.find((c) => c.name === g.collection)?.ownedModeIds === undefined),
  'mode: the arm above ran with NO provenance stamp anywhere — the pre-#1581 behavior, which is what every file written before the stamp existed takes');

// --- mode provenance (#1581): the stamp narrows the offer, its absence does not ---
// A plan-owned `color` holding two stale modes: one the engine wrote (`legacy-dark`, stamped) and one the
// designer added (`print`, not stamped). Built as its own input rather than folded into `synthInput`,
// because the counts above are pinned and this arm is about which modes are OFFERED, not how many.
const stampedInput: PruneInput = {
  ...synthInput,
  collections: [{
    name: 'color',
    variableNames: [`${ROOT}/color/text/primary`],
    modes: modes('light', 'dark', 'print', 'legacy-dark'),
    ownedModeIds: ['m0-light', 'm1-dark', 'm3-legacy-dark'],   // `m2-print` is deliberately absent: the designer's
  }],
  styles: styleNames({}),
  plannedStyles: styleNames({}),
  plannedModes: [{ collection: 'color', modes: ['light', 'dark'] }],
};
const stampedModes = (p: ReturnType<typeof computePrunePlan>): string[] =>
  (p.modes.find((g) => g.collection === 'color')?.modes ?? []).map((m) => m.name);
const stamped = computePrunePlan(stampedInput);
ok(!stampedModes(stamped).includes('print'),
  `mode provenance: a hand-added \`print\` mode is NOT offered once the collection carries the engine's stamp — the by-name pin, and the whole point of #1581 (offered: ${stampedModes(stamped).join(',') || 'none'})`);
ok(stampedModes(stamped).join(',') === 'legacy-dark',
  `mode provenance: …and the stale mode the engine DID write is still offered, so the stamp narrows the arm rather than disabling it (${stampedModes(stamped).join(',') || 'none'})`);
// The paired negatives: the SAME file with the stamp absent, and with it present-but-empty, both offer
// `print` again. Stated as assertions because they are what proves the stamp is doing the sparing above —
// and because they are the fallback every pre-#1581 file relies on.
const unstamped = computePrunePlan({
  ...stampedInput,
  collections: stampedInput.collections.map(({ ownedModeIds: _drop, ...c }) => c),
});
ok(stampedModes(unstamped).join(',') === 'print,legacy-dark',
  `mode provenance: with NO stamp the same file offers BOTH stale modes, named, exactly as before #1581 (${stampedModes(unstamped).join(',') || 'none'}) — a file the engine has not re-applied must not become un-cleanable`);
const emptyStamp = computePrunePlan({
  ...stampedInput,
  collections: stampedInput.collections.map((c) => ({ ...c, ownedModeIds: [] })),
});
ok(stampedModes(emptyStamp).join(',') === 'print,legacy-dark',
  'mode provenance: an EMPTY stamp reads as no knowledge, not as "the engine owns nothing" — otherwise an unreadable stamp would silently spare every stale mode');
ok(/color → legacy-dark/.test(prunePreviewSummary(stamped)),
  'mode provenance: the offered mode is still NAMED in the review text — provenance informs the arm, it does not license it');

// --- styles, four kinds ---
ok(prunedStyles('text').includes('display/2xl'),
  'text style: an orphan whose group the plan still emits IS pruned (lowered displayCeiling)');
ok(!prunedStyles('text').includes('Marketing/Hero'),
  'text style: a hand-added style in a group the plan does not emit is NOT pruned — the by-name pin');
ok(!prunedStyles('text').includes('Heading'),
  'text style: a hand-added ungrouped style is NOT pruned');
ok(!prunedStyles('text').includes('display/xl'),
  'text style: a style still in the plan is NOT pruned');
ok(prunedStyles('effect').join(',') === 'shadow/2xl',
  `effect style: the in-group orphan IS pruned and the hand-added \`My FX/glow\` is NOT (got ${prunedStyles('effect').join(',') || 'none'})`);
ok(prunedStyles('paint').join(',') === 'gradient/legacy',
  `paint style: the in-group orphan IS pruned — and \`shadow/hand-made\` is NOT, because \`shadow\` is a planned group for EFFECT styles only (got ${prunedStyles('paint').join(',') || 'none'}) — the per-kind namespace pin`);
ok(prunedStyles('grid').join(',') === 'Grid / xs',
  `grid style: a breakpoint the config dropped IS pruned and the hand-added \`My Grid / wide\` is NOT (got ${prunedStyles('grid').join(',') || 'none'})`);
ok(!prunedStyles('grid').includes('Grid/wide'),
  'grid style: a hand-added `Grid/wide` — the emitter\'s group name without the emitter\'s spaces — is NOT pruned; a `.trim()` in `styleGroup` pools the two spellings and offers it — the by-name pin');

// --- count + prose ---
ok(prunePlanCount(plan) === 8,
  `prunePlanCount sums every kind (1 var + 1 collection + 2 modes + 4 styles = 8; got ${prunePlanCount(plan)})`);
const preview = prunePreviewSummary(plan);
ok(/style/.test(preview) && /mode/.test(preview) && /variable/.test(preview) && /collection/.test(preview) && /namespace/.test(preview),
  'prunePreviewSummary names each kind and the namespace scope');
ok(/layout → sm, lg/.test(preview),
  `prunePreviewSummary NAMES the modes per collection — the one arm whose items are spelled out, because a mode carries no provenance ("${preview.slice(preview.indexOf('The modes'))}")`);

// --- variables NAMED, grouped by collection (#1585) --------------------------------------------
// The prune's most numerous arm used to show only a count; a destructive action names its targets. Arm (a):
// the offered variable renders BY NAME under the collection it lives in. Dropping `varNote` fails this by
// name — no other note produces `color → nbds/color/…` (`modeNote` is `layout → …`, `styleNote` is a kind).
ok(preview.includes(`The variables are color → ${ROOT}/color/text/legacy`),
  `prunePreviewSummary NAMES the offered variables grouped by collection (#1585) — the by-name pin ("${preview.slice(preview.indexOf('The variables'))}")`);

// Arm (b): past VAR_NOTE_CAP names in one collection the note caps and reports the remainder. A collection
// with 13 in-namespace orphans (none planned, so all 13 are offered) drives the cap; the first name shows,
// the 13th does NOT, and the tail reads `… +5 more`. Dropping the cap shows all 13 and fails this by name —
// the `+5 more` disappears and the beyond-cap `ghost-12` starts appearing.
const capInput: PruneInput = {
  collections: [{ name: 'color', variableNames: Array.from({ length: 13 }, (_v, i) => `${ROOT}/color/ghost-${String(i).padStart(2, '0')}`), modes: modes('light') }],
  styles: styleNames({}),
  plannedVariables: [],
  plannedCollections: ['color'],
  plannedStyles: styleNames({}),
  plannedModes: [],
  root: ROOT,
};
const capPreview = prunePreviewSummary(computePrunePlan(capInput));
const capNote = capPreview.slice(capPreview.indexOf('The variables'));
ok(capPreview.includes(`${ROOT}/color/ghost-00`) && /… \+5 more/.test(capPreview) && !capPreview.includes(`${ROOT}/color/ghost-12`),
  `prunePreviewSummary caps at 8 names per collection and reports "+K more" for the rest (13 offered → 8 named + "… +5 more"; #1585) — the by-name pin, dropping the cap names all 13 ("${capNote}")`);

// --- the empty case: nothing stale, and it says so rather than opening a dialog ---
const cleanPlan = computePrunePlan({
  ...synthInput,
  collections: [{ name: 'color', variableNames: [`${ROOT}/color/text/primary`], modes: modes('light', 'dark') }],
  styles: styleNames({ text: ['display/xl'], grid: ['Grid / sm', 'Grid / md'] }),
});
ok(prunePlanCount(cleanPlan) === 0 && /No stale items/.test(prunePreviewSummary(cleanPlan)),
  'a file matching the plan prunes nothing, and the preview says so');
ok(!/The modes are/.test(prunePreviewSummary(cleanPlan)),
  'the preview names no modes when none are stale');

// --- root guard disabled: with no root, nothing in the variable/collection arms is prunable ---
const noRoot = computePrunePlan({ ...synthInput, root: '' });
ok(noRoot.variables.length === 0 && noRoot.collections.length === 0,
  'root empty disables the namespace guard entirely — the variable and collection arms prune nothing');
// Modes and styles carry no root, so they are unaffected — stated as an assertion rather than assumed,
// because "nothing prunes without a root" would be the wrong reading of the line above.
ok(noRoot.modes.length > 0 && noRoot.styles.length > 0,
  'root empty does NOT disable the mode + style arms — neither namespace is built from the brand root');

// =============================================================================================
// EXECUTOR — deletes EXACTLY the plan, and nothing else. Driven on the synthetic file above.
// =============================================================================================
const shim = new PruneShim(
  synthInput.collections.map((c, i) => new RColl(`c${i}`, c.name, c.modes.map((m) => ({ ...m })))),
  synthInput.collections.flatMap((c, i) => c.variableNames.map((n, j) => new RVar(`v${i}-${j}`, n, `c${i}`))),
  { text: synthInput.styles.text.map((n) => new RStyle(n)), effect: synthInput.styles.effect.map((n) => new RStyle(n)), paint: synthInput.styles.paint.map((n) => new RStyle(n)), grid: synthInput.styles.grid.map((n) => new RStyle(n)) },
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies PruneApi
const res = await applyPrunePlan(plan, shim as any as PruneApi);

ok(res.variables === 1 && res.collections === 1 && res.modes === 2 && res.styles === 4 && res.misses.length === 0,
  `executor removed exactly the plan (1 var, 1 collection, 2 modes, 4 styles, 0 misses; got ${res.variables}/${res.collections}/${res.modes}/${res.styles}, misses ${res.misses.length})`);

const liveVars = shim.liveVarNames();
ok(!liveVars.has(`${ROOT}/color/text/legacy`), 'executor: the in-namespace orphan variable is gone');
ok(liveVars.has('my-brand/accent') && liveVars.has(`${ROOT}/color/text/primary`),
  'executor: the hand-added variable AND the planned variable are untouched');
const liveColls = shim.liveCollNames();
ok(!liveColls.has('color.surface'), 'executor: the stranded in-namespace collection is gone');
ok(liveColls.has('My Tokens') && liveColls.has('legacy-empty') && liveColls.has('color'),
  'executor: the foreign stranded collection, the empty one, and the plan-owned one are untouched');
ok(liveVars.has('my-brand/foo'),
  'executor: the foreign stranded collection’s variable survives with it (its collection was not removed)');
// Modes: the layout collection is left holding exactly the plan's two, one `sm`, and the survivor is the
// copy the writer claims — so the next apply writes into the mode the designer's layers resolve through.
const liveLayout = shim.colls.find((c) => c.name === 'layout')!;
ok(liveLayout.modes.map((m) => m.name).join(',') === 'sm,md',
  `executor: the shrunk collection is left holding exactly the plan's modes (${liveLayout.modes.map((m) => m.name).join(',')})`);
ok(liveLayout.modes.map((m) => m.modeId).join(',') === 'lay-xs-renamed,lay-md',
  `executor: the surviving \`sm\` is the copy \`claimModes\` claimed, by id (${liveLayout.modes.map((m) => m.modeId).join(',')}) — removing the other one is what makes the name unambiguous again`);
ok(shim.colls.find((c) => c.name === 'radius')!.modes.length === 1,
  'executor: the untouched collection keeps its one mode — Figma refuses to remove a collection’s last mode, and the detector never asked');
for (const kind of STYLE_KINDS) {
  const live = shim.liveStyleNames(kind);
  const gone = prunedStyles(kind);
  ok(gone.every((n) => !live.has(n)) && (synthInput.plannedStyles[kind] ?? []).every((n) => live.has(n)),
    `executor: every pruned ${kind} style is gone and every planned one is untouched (${gone.length} removed)`);
}
ok(shim.liveStyleNames('text').has('Marketing/Hero') && shim.liveStyleNames('paint').has('shadow/hand-made') && shim.liveStyleNames('grid').has('My Grid / wide'),
  'executor: every hand-added style, in every kind, is untouched — the by-name pin');

const applied = pruneAppliedSummary(res);
ok(/Removed 8 stale items/.test(applied), `pruneAppliedSummary states what was removed ("${applied}")`);

// A miss is recorded, never thrown: a plan naming an item the file no longer holds reports it.
const emptyShim = new PruneShim([], [], { text: [], effect: [], paint: [], grid: [] });
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies PruneApi
const missRes = await applyPrunePlan(plan, emptyShim as any as PruneApi);
ok(missRes.variables === 0 && missRes.collections === 0 && missRes.modes === 0 && missRes.styles === 0 && missRes.misses.length === 8,
  `executor records a miss for every named item absent from the file (${missRes.misses.length} misses), never throws`);
ok(missRes.misses.some((m) => m.startsWith('mode:layout/')) && missRes.misses.some((m) => m.startsWith('grid-style:')),
  `misses name the KIND as well as the item, so a mode miss and a grid-style miss are distinguishable (${missRes.misses.filter((m) => !m.startsWith('var:')).slice(0, 3).join(', ')})`);

// =============================================================================================
// REAL-PLAN ARM — the shipped NB plans, so `root` and the `<root>/…` names are the engine's own.
// =============================================================================================
const theme = nbThemeFrom(nbMeasured);
const wp = buildWritePlan(buildFigmaColor(theme));
const floatPlan = buildFloatWritePlan(theme);
const fontPlan = buildFontVarPlan(theme);
const textPlan = buildTextStylePlan(theme);
const plannedVariables = [
  ...wp.palette.map((r) => r.name),
  ...wp.color.create.map((r) => r.name),
  ...floatPlan.flatMap((p) => p.create.map((r) => r.name)),
  ...fontPlan.flatMap((p) => p.rows.map((r) => r.name)),
];
const realRoot = rootOf(plannedVariables[0]);
ok(realRoot === 'nbds' && plannedVariables.every((n) => rootOf(n) === realRoot),
  `real plans: every emitted variable shares one brand root (${realRoot}) — the namespace the guard reads`);

// A file that IS the plan, plus one in-namespace ghost and one hand-added foreign var, both dumped into
// the `color` collection. The ghost must prune; the planned names and the foreign var must not.
const ghost = `${realRoot}/color/zzz-pruned-ghost`;
const foreign = 'client-brand/kept-by-hand';
const realInput: PruneInput = {
  collections: [{ name: 'color', variableNames: [...plannedVariables, ghost, foreign], modes: modes(...wp.color.modes) }],
  styles: styleNames({ text: [...textPlan.map((r) => r.name)] }),
  plannedVariables,
  plannedCollections: ['color'],
  plannedStyles: styleNames({ text: textPlan.map((r) => r.name) }),
  plannedModes: [{ collection: 'color', modes: wp.color.modes }],
  root: realRoot,
};
const realPlan = computePrunePlan(realInput);
const realPruned = realPlan.variables.flatMap((g) => g.names);
ok(realPruned.length === 1 && realPruned[0] === ghost,
  `real plans: exactly the one in-namespace ghost is pruned (got ${realPruned.length}: ${realPruned.slice(0, 3).join(', ')})`);
ok(!realPruned.includes(foreign),
  'real plans: the hand-added foreign-root variable is left, against the engine’s real planned names');
ok(realPlan.styles.length === 0 && realPlan.modes.length === 0,
  'real plans: a file whose styles and modes all match the plan prunes none of either');

// =============================================================================================
// STYLE PROVENANCE (#1577) — the description signature, against descriptions the ENGINE actually writes.
//
// The recognizer's patterns are hand-written in `prune-figma.ts`; the descriptions here come from the real
// plan builders over three committed brands. Two independent derivations of the same claim, which is the
// point: importing the emitter's own template into the recognizer would make it agree by construction and
// stop being able to fail (docs/34 shape 2). If an emitter's prose moves, this arm goes red by name rather
// than the arm silently recognizing nothing and the prune quietly losing the renamed-style case.
// =============================================================================================
/** The aurora brand and its breakpoint lever — shared by this arm and the CONFIG-SHRINK arm below, which
 *  is the same shrink measured twice: here as a property of the DESCRIPTIONS, there end-to-end. */
const auroraInput = exampleBrands['aurora'] as unknown as BrandInput;
const withBps = (breakpoints: number[]): BrandInput =>
  ({ ...auroraInput, layout: { ...((auroraInput as { layout?: object }).layout ?? {}), breakpoints } }) as BrandInput;

const signatureBrands: { label: string; theme: Theme }[] = [
  { label: 'aurora', theme: brandTheme(exampleBrands['aurora'] as unknown as BrandInput) },
  { label: 'harbor', theme: brandTheme(exampleBrands['harbor'] as unknown as BrandInput) },
  { label: 'nb', theme },
];
/** Every style the engine plans for a theme, per kind, as (name, description) — the four writers' rows. */
const emittedStyles = (t: Theme): Record<StyleKind, { name: string; description: string }[]> => {
  const sp = buildStylesPlan(t);
  return {
    text: buildTextStylePlan(t).map((r) => ({ name: r.name, description: r.description })),
    effect: sp.effects.map((r) => ({ name: r.name, description: r.description })),
    paint: sp.paints.map((r) => ({ name: r.name, description: r.description })),
    grid: buildGridStylePlan(t).map((r) => ({ name: r.name, description: r.description })),
  };
};
let swept = 0;
const unrecognized: string[] = [];
const crossMatched: string[] = [];
for (const { label, theme: t } of signatureBrands) {
  const emitted = emittedStyles(t);
  for (const kind of STYLE_KINDS) {
    const names = emitted[kind].map((r) => r.name);
    for (const row of emitted[kind]) {
      swept++;
      if (!isEngineDescription(kind, row.description, names)) unrecognized.push(`${label} ${kind} ${row.name}`);
      // KIND INDEPENDENCE, the same property the group namespace has: a grid description must not be read
      // as an effect description. Four signatures, four surfaces, no pooling.
      for (const other of STYLE_KINDS) {
        if (other === kind) continue;
        if (isEngineDescription(other, row.description, emitted[other].map((r) => r.name))) {
          crossMatched.push(`${label} ${kind} ${row.name} read as ${other}`);
        }
      }
    }
  }
}
ok(swept > 100 && unrecognized.length === 0,
  `style provenance: every one of the ${swept} styles the engine plans across ${signatureBrands.map((b) => b.label).join('/')} is recognized from its own description${unrecognized.length ? ` — MISSED ${unrecognized.slice(0, 4).join('; ')}` : ''}`);
ok(crossMatched.length === 0,
  `style provenance: and no kind's description is recognized as another kind's${crossMatched.length ? ` — ${crossMatched.slice(0, 4).join('; ')}` : ''} — four independent namespaces, as with the groups`);

// THE COMMITTED BYTES (#1623). The sweep above reads the emitters in memory; a file the plugin already
// applied carries whatever the committed emission said when it was applied. #1623 rewrote a large share of
// the engine's description prose, all of it on VARIABLES, and this arm is the proof that no style
// description moved with it: every style row in `out/figma/<brand>/*-styles.json` is still recognized by
// its own kind's signature. It also reaches wendys, which the in-memory sweep does not build.
const committedKinds: Record<StyleKind, string> = { grid: 'grid-styles', effect: 'shadow-styles', text: 'text-styles', paint: 'gradient-styles' };
let committedSwept = 0;
const committedMissed: string[] = [];
for (const brand of ['nb', 'aurora', 'wendys']) {
  for (const kind of STYLE_KINDS) {
    const url = new URL(`../../packages/engine/out/figma/${brand}/${committedKinds[kind]}.json`, import.meta.url);
    if (!existsSync(url)) continue;                 // a brand with no gradients commits no gradient file
    const rows = (JSON.parse(readFileSync(url, 'utf8')) as { styles: { name: string; description: string }[] }).styles;
    for (const row of rows) {
      committedSwept++;
      if (!isEngineDescription(kind, row.description, rows.map((r) => r.name))) committedMissed.push(`${brand} ${kind} ${row.name}: "${row.description}"`);
    }
  }
}
ok(committedSwept > 150 && committedMissed.length === 0,
  `style provenance: every one of the ${committedSwept} COMMITTED style descriptions (nb/aurora/wendys) is recognized${committedMissed.length ? ` — MISSED ${committedMissed.slice(0, 3).join('; ')}` : ''}`);

// The negative half, and it is the half that matters: a description a DESIGNER typed must not be
// recognized, or the arm would offer hand-made styles for deletion. Each case names what makes it not the
// engine's. `plannedText` gives the text vocabulary its shape-plus-vocabulary rule closes over.
const plannedText = textPlan.map((r) => r.name);
const handTyped: { kind: StyleKind; description: string; why: string }[] = [
  { kind: 'grid', description: '', why: 'no description at all — the commonest hand-made style, and absent provenance is never a match' },
  { kind: 'grid', description: 'My marketing grid — 12 columns, 24px gutter', why: 'a designer\'s own grid prose, close in subject and nothing like the template' },
  { kind: 'grid', description: '4-column layout grid for the xs breakpoint — 16px gutter, 16px margin.', why: 'the emitter\'s OPENING clause with its closing sentence missing — a partial copy is not the template' },
  { kind: 'effect', description: 'a soft glow for the hero card', why: 'hand-written effect prose' },
  { kind: 'effect', description: 'shadow for cards', why: 'starts with `shadow` and stops there — the mode clause the emitter appends is the signature' },
  { kind: 'paint', description: 'gradient for the hero banner', why: 'starts with `gradient` but carries none of the kind/stops/interpolation shape' },
  { kind: 'text', description: 'body copy for the hero', why: 'starts with a planned group, but `copy`/`for`/`the`/`hero` are outside the plan\'s vocabulary' },
  { kind: 'text', description: 'Heading', why: 'a single capitalised word — neither the shape nor the vocabulary' },
  { kind: 'text', description: 'Display XL Strong', why: 'the engine\'s words in a designer\'s casing — the engine writes them lowercase' },
];
const falsePositives = handTyped.filter((c) => isEngineDescription(c.kind, c.description, c.kind === 'text' ? plannedText : emittedStyles(theme)[c.kind].map((r) => r.name)));
for (const c of handTyped) {
  ok(!falsePositives.includes(c),
    `style provenance: a hand-typed ${c.kind} description is NOT recognized — ${c.why} ("${c.description}")`);
}

// THE TRAP, named. The obvious implementation compares a live description against the descriptions the
// CURRENT plan would write. After a shrink the stranded styles carry descriptions naming breakpoints the
// new plan does not have, so no planned description equals theirs — an exact match would spare exactly the
// styles this arm exists to catch. The two assertions below are that trap, stated as facts about the real
// plans: the stale description matches NO planned one, and is recognized anyway.
const sixGridPlan = buildGridStylePlan(brandTheme(withBps([0, 480, 768, 1024, 1280, 1536])));
const twoGridPlan = buildGridStylePlan(brandTheme(withBps([0, 768])));
const staleXs = sixGridPlan.find((r) => r.name === 'Grid / xs')!;
const twoGridDescriptions = new Set(twoGridPlan.map((r) => r.description));
ok(!twoGridDescriptions.has(staleXs.description),
  `style provenance TRAP: after a 6→2 shrink, the stranded \`Grid / xs\` description equals NO description the 2-breakpoint plan writes ("${staleXs.description.slice(0, 56)}…") — an exact-match recognizer spares it`);
ok(isEngineDescription('grid', staleXs.description, twoGridPlan.map((r) => r.name)),
  'style provenance TRAP: …and the TEMPLATE signature recognizes it anyway, against the current plan — which is the difference between catching a shrink\'s stale styles and sparing exactly them');

// =============================================================================================
// CONFIG-SHRINK ARM (#1570) — end-to-end, with the REAL executors writing the file.
//
// The owner's acceptance criterion, in three steps: apply a 6-breakpoint config; re-apply a 2-breakpoint
// one (which must not duplicate a mode — pinned in `test-write-float.ts`, and relied on here); prune, and
// check the file is left holding exactly the current config. Written against a file the ENGINE wrote
// rather than a hand-built fixture, so the mode names, the grid-style names and their grouping are the
// emitter's own — a fixture agreeing with the detector would be `docs/34` shape 1.
// =============================================================================================
class ShrinkVar {
  scopes: string[] = [];
  description = '';
  hiddenFromPublishing = false;
  removed = false;
  valuesByMode: Record<string, unknown> = {};
  constructor(public id: string, public name: string, public variableCollectionId: string) {}
  setValueForMode(modeId: string, value: unknown): void { this.valuesByMode[modeId] = value; }
  remove(): void { this.removed = true; }
}
/** One shim satisfying BOTH ports — `VariablesApi` for the write, `PruneApi` for the delete. Deliberately
 *  one object: the whole point of this arm is that the prune reads the file the write produced. */
class ShrinkShim {
  collections: RColl[] = [];
  vars: ShrinkVar[] = [];
  gridStyles: RStyle[] = [];
  private cseq = 0;
  private vseq = 0;
  private mseq = 0;
  async getLocalVariableCollectionsAsync(): Promise<RColl[]> { return this.collections.filter((c) => !c.removed); }
  async getLocalVariablesAsync(): Promise<ShrinkVar[]> { return this.vars.filter((v) => !v.removed); }
  createVariableCollection(name: string): RColl {
    const id = `c${++this.cseq}`;
    const c = new RColl(id, name, [{ modeId: `${id}:m0`, name: 'Mode 1' }]);
    this.collections.push(c);
    return c;
  }
  createVariable(name: string, collection: RColl): ShrinkVar { const v = new ShrinkVar(`v${++this.vseq}`, name, collection.id); this.vars.push(v); return v; }
  createVariableAlias(target: ShrinkVar): { type: 'VARIABLE_ALIAS'; id: string } { return { type: 'VARIABLE_ALIAS', id: target.id }; }
  // The mode surface the write path needs, on the same objects the prune path deletes through.
  async getLocalTextStylesAsync(): Promise<RStyle[]> { return []; }
  async getLocalEffectStylesAsync(): Promise<RStyle[]> { return []; }
  async getLocalPaintStylesAsync(): Promise<RStyle[]> { return []; }
  async getLocalGridStylesAsync(): Promise<RStyle[]> { return this.gridStyles.filter((s) => !s.removed); }
  createGridStyle(): RStyle { const s = new RStyle(''); this.gridStyles.push(s); return s; }
  nextModeId(): string { return `mode${++this.mseq}`; }
}
// `RColl` is the prune port's shape; the write port additionally needs `renameMode`/`addMode`, added here
// rather than on `RColl` so the synthetic executor arm above keeps a delete-only object.
type WritableColl = RColl & { renameMode(id: string, name: string): void; addMode(name: string): string };
const asWritable = (shimRef: ShrinkShim, c: RColl): WritableColl => {
  const w = c as WritableColl;
  if (!w.renameMode) {
    w.renameMode = (id, name) => { const m = w.modes.find((x) => x.modeId === id); if (m) m.name = name; };
    w.addMode = (name) => { const modeId = shimRef.nextModeId(); w.modes.push({ modeId, name }); return modeId; };
  }
  return w;
};

// `auroraInput` / `withBps` are defined with the STYLE PROVENANCE arm above — the same lever, measured twice.
const sixTheme = brandTheme(withBps([0, 480, 768, 1024, 1280, 1536]));
const twoTheme = brandTheme(withBps([0, 768]));

const shrinkShim = new ShrinkShim();
// Wrap every collection the write path creates, so `reconcileModes` has its rename/add surface.
const writeApi = {
  getLocalVariableCollectionsAsync: async () => (await shrinkShim.getLocalVariableCollectionsAsync()).map((c) => asWritable(shrinkShim, c)),
  getLocalVariablesAsync: () => shrinkShim.getLocalVariablesAsync(),
  createVariableCollection: (name: string) => asWritable(shrinkShim, shrinkShim.createVariableCollection(name)),
  createVariable: (name: string, collection: RColl) => shrinkShim.createVariable(name, collection),
  createVariableAlias: (t: ShrinkVar) => shrinkShim.createVariableAlias(t),
};
/* eslint-disable @typescript-eslint/no-explicit-any -- structural: the shims satisfy the ports */
await applyFloatPlan(buildFloatWritePlan(sixTheme), writeApi as any);
await applyGridStylePlan(buildGridStylePlan(sixTheme), shrinkShim as any);
await applyFloatPlan(buildFloatWritePlan(twoTheme), writeApi as any);
await applyGridStylePlan(buildGridStylePlan(twoTheme), shrinkShim as any);
/* eslint-enable @typescript-eslint/no-explicit-any */

const twoFloat = buildFloatWritePlan(twoTheme);
const twoGrid = buildGridStylePlan(twoTheme);
const shrunkLayout = shrinkShim.collections.find((c) => c.name === 'layout')!;
ok(shrunkLayout.modes.length === 6 && shrunkLayout.modes.filter((m) => m.name === 'sm').length === 1,
  `shrink premise: the re-applied file holds all six modes with no duplicate (${shrunkLayout.modes.map((m) => m.name).join('/')}) — the apply strands, the prune deletes`);
ok(shrinkShim.gridStyles.length === 6,
  `shrink premise: the re-applied file holds all six grid styles (${shrinkShim.gridStyles.map((s) => s.name).join(', ')})`);

const varNamesByColl = new Map<string, string[]>();
for (const c of shrinkShim.collections) varNamesByColl.set(c.id, []);
for (const v of shrinkShim.vars) varNamesByColl.get(v.variableCollectionId)?.push(v.name);
const shrinkSnapshot: PruneInput = {
  collections: shrinkShim.collections.map((c) => ({ name: c.name, variableNames: varNamesByColl.get(c.id) ?? [], modes: c.modes.map((m) => ({ ...m })) })),
  styles: styleNames({ grid: shrinkShim.gridStyles.map((s) => s.name) }),
  plannedVariables: twoFloat.flatMap((p) => p.create.map((r) => r.name)),
  plannedCollections: twoFloat.map((p) => p.name),
  plannedStyles: styleNames({ grid: twoGrid.map((r) => r.name) }),
  plannedModes: twoFloat.map((p) => ({ collection: p.name, modes: p.modes })),
  root: rootOf(twoFloat[0].create[0].name),
};
const shrinkPlan = computePrunePlan(shrinkSnapshot);
ok((shrinkPlan.modes.find((g) => g.collection === 'layout')?.modes ?? []).map((m) => m.name).join(',') === 'xs,lg,xl,2xl',
  `shrink: the prune offers exactly the four modes the shrink stranded (${(shrinkPlan.modes.find((g) => g.collection === 'layout')?.modes ?? []).map((m) => m.name).join(',') || 'none'})`);
ok((shrinkPlan.styles.find((g) => g.kind === 'grid')?.names ?? []).join(',') === 'Grid / 2xl,Grid / lg,Grid / xl,Grid / xs',
  `shrink: and exactly the four grid styles it stranded (${(shrinkPlan.styles.find((g) => g.kind === 'grid')?.names ?? []).join(',') || 'none'})`);
ok(shrinkPlan.modes.length === 1,
  `shrink: no OTHER collection has a mode offered — the nine single-mode float axes are unchanged by a breakpoint change (${shrinkPlan.modes.map((g) => g.collection).join(',')})`);

// --- the RENAMED stranded style (#1577), on the file the engine just wrote --------------------
// The live test file's `Grid/xs` is this shape: an emitted `Grid / xs` a designer renamed, which drops it
// out of the emitter's `Grid ` group and out of reach of the #1521 namespace. The descriptions below are
// the ones the REAL `applyGridStylePlan` wrote onto the shim above, not strings composed here.
const renamedTo = 'Layout grid — lg (renamed by hand)';
const withRenamed = (keepDescriptions: boolean): PruneInput => ({
  ...shrinkSnapshot,
  styles: fileStyles({
    grid: [
      ...shrinkShim.gridStyles.map((s) => ({
        name: s.name === 'Grid / lg' ? renamedTo : s.name,
        description: keepDescriptions ? s.description : '',
      })),
      // A hand-made style in the same file, with a hand-typed description, so this arm cannot pass by
      // admitting everything outside the group.
      { name: 'Grid/wide', description: 'my own wide grid for marketing pages' },
    ],
  }),
});
const renamedPlan = computePrunePlan(withRenamed(true));
const renamedGrid = renamedPlan.styles.find((g) => g.kind === 'grid');
ok((renamedGrid?.names ?? []).includes(renamedTo),
  `#1577 renamed: a stranded grid style the designer RENAMED out of the plan's group is offered anyway (offered ${(renamedGrid?.names ?? []).join(', ') || 'none'})`);
ok((renamedGrid?.byProvenance ?? []).join(',') === renamedTo,
  `#1577 renamed: …and it is the ONLY one admitted by its description — the other three are still in the \`Grid \` group (byProvenance: ${(renamedGrid?.byProvenance ?? []).join(', ') || 'none'})`);
ok(!(renamedGrid?.names ?? []).includes('Grid/wide'),
  '#1577 renamed: the hand-made `Grid/wide` in the same file is NOT offered — its description is not one the engine writes, and its group is not one the plan emits');
ok(/renamed by hand/.test(prunePreviewSummary(renamedPlan)) && /description is one the engine wrote/.test(prunePreviewSummary(renamedPlan)),
  '#1577 renamed: the review text NAMES the style and says the recognition came from its description — a rename means the name shown is the designer\'s own');
// The paired negative, which is what proves the DESCRIPTION did the work above rather than something else
// in the snapshot: strip the descriptions and the same renamed style is spared.
const strippedGrid = computePrunePlan(withRenamed(false)).styles.find((g) => g.kind === 'grid');
ok(!(strippedGrid?.names ?? []).includes(renamedTo) && (strippedGrid?.names ?? []).length === 3,
  `#1577 renamed: with the descriptions stripped the same file spares it and offers only the three still in the group (${(strippedGrid?.names ?? []).join(', ') || 'none'}) — the provenance is doing the work`);
// A breakpoint ladder is BOTH modes and variables: `ads/breakpoint/<name>` is one variable per rung, so
// four of them are stranded too. They come out through the arm that has existed since #1521 — stated here
// because it is what makes the file "clean", and because it is the one part of the shrink the pre-#1570
// prune already handled.
ok(shrinkPlan.variables.length === 1 && shrinkPlan.variables[0].collection === 'layout'
  && shrinkPlan.variables[0].names.join(',') === 'ads/breakpoint/2xl,ads/breakpoint/lg,ads/breakpoint/xl,ads/breakpoint/xs',
  `shrink: and the four per-rung breakpoint VARIABLES the shrink stranded (${shrinkPlan.variables.flatMap((g) => g.names).join(',') || 'none'})`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies PruneApi
const shrinkRes = await applyPrunePlan(shrinkPlan, shrinkShim as any as PruneApi);
ok(shrinkRes.misses.length === 0 && shrinkRes.modes === 4 && shrinkRes.styles === 4 && shrinkRes.variables === 4,
  `shrink: the delete removes 4 modes + 4 grid styles + 4 variables with no misses (got ${shrinkRes.modes}/${shrinkRes.styles}/${shrinkRes.variables}, misses ${shrinkRes.misses.length})`);
ok(shrunkLayout.modes.map((m) => m.name).join(',') === twoFloat.find((p) => p.name === 'layout')!.modes.join(','),
  `shrink: the pruned file's layout modes ARE the current config's, in order (${shrunkLayout.modes.map((m) => m.name).join('/')})`);
ok(shrinkShim.gridStyles.filter((s) => !s.removed).map((s) => s.name).join(',') === twoGrid.map((r) => r.name).join(','),
  `shrink: and its grid styles ARE the current config's (${shrinkShim.gridStyles.filter((s) => !s.removed).map((s) => s.name).join(', ')})`);
// The acceptance criterion, stated as the detector's own idempotence: pruning a pruned file finds nothing.
const afterVarNames = new Map<string, string[]>();
for (const c of shrinkShim.collections) afterVarNames.set(c.id, []);
for (const v of shrinkShim.vars.filter((v) => !v.removed)) afterVarNames.get(v.variableCollectionId)?.push(v.name);
const rescan = computePrunePlan({
  ...shrinkSnapshot,
  collections: shrinkShim.collections.filter((c) => !c.removed).map((c) => ({ name: c.name, variableNames: afterVarNames.get(c.id) ?? [], modes: c.modes.map((m) => ({ ...m })) })),
  styles: styleNames({ grid: shrinkShim.gridStyles.filter((s) => !s.removed).map((s) => s.name) }),
});
ok(prunePlanCount(rescan) === 0,
  `shrink: a second scan of the pruned file finds nothing stale at all — "removing them leaves a clean current-config file" (${prunePlanCount(rescan)} items)`);

console.log(`\nplugin OPT-IN PRUNE: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
