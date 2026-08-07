/**
 * Prism3 engine — TOKEN CONTRACT (the corpus build + the breaking-change gate).
 *
 *   npx tsx Prism3/engine/token-contract.ts --check    # fail (exit 1) if the surface moved
 *   npx tsx Prism3/engine/token-contract.ts --accept   # rewrite the baseline (requires the bump)
 *
 * WHAT IS VERSIONED. Not values — NAMES. A consumer app hard-codes `prism.color.text.primary` in
 * its stylesheet; a brand tweak that moves that token's hue is the engine working as intended, but
 * a rename makes the reference resolve to nothing, silently, with no build error anywhere. So the
 * versioned artifact is the set of token paths the engine guarantees, and its `$type` for each.
 *
 * HOW "GUARANTEED" IS DEFINED. The emitted token set is input-dependent — a brand with three extra
 * brand colours emits three extra palettes — so "the list of paths the engine emits" is not a
 * well-formed promise. What IS well-formed is the INTERSECTION across a corpus chosen to span the
 * ways an input can vary:
 *
 *   nb       — the hand-built legacy system, `nbds.*` dialect, rgb() colour format
 *   aurora   — engine-native brief, extra brand colour, compact density, 3:1 icon contrast
 *   harbor   — engine-native brief, a different lever combination
 *   wendys   — STANDARD dialect (flat `colors:` map classified into anchors), a different typeface
 *   minimal  — the three required fields and nothing else: the sparsest input the engine accepts
 *
 * Paths are compared BELOW the configurable root, because the root is itself a lever (`nbds` vs
 * `prism`) — comparing with it included yields an empty intersection, which is how this was nearly
 * defined into meaninglessness on the first pass.
 *
 * `minimal` is the load-bearing corpus member: without it the intersection would be "what four
 * richly-specified brands happen to share", which over-claims. It is worth recording that adding it
 * removed ZERO paths — every one of the 485 survives the sparsest possible input. `wendys` earns
 * its place by removing exactly one (`font.typeface.inter`, a slug derived from a VALUE), which is
 * precisely the class of path that should not be promised.
 *
 * WHY THIS IS NOT PART OF `regen.ts`. The baseline must not be able to regenerate itself. `regen`
 * rewrites every generated artifact and `regen --check` proves the committed copies match; run that
 * way, a deleted token would rewrite the baseline to agree with the deletion and both gates would
 * pass. #281's lesson was "no gate reads the committed artifact"; this is the next one along — a
 * gate that is allowed to rewrite what it reads has no memory, and a baseline without memory is
 * just a second copy of the output. `--accept` is therefore a separate, deliberate act.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brandTheme, BrandInput, Theme } from './theme';
import { nbTheme } from './nb-fixture';
import { buildTree } from './tree';
import { parseDesignMd } from './design-md';
import { parseStandardDesignMd, standardToBrandInput } from './standard-design-md';
import { CONTRACT_VERSION, ENGINE_VERSION, DEPRECATIONS, classify, satisfiesBump, Contract } from './version';

const here = dirname(fileURLToPath(import.meta.url));
export const CONTRACT_PATH = resolve(here, '..', 'schema', 'token-contract.json');

/** Every `$value`-bearing leaf under `node`, as `dotted.path` → `$type`. */
export const tokenPaths = (node: any, prefix = '', acc = new Map<string, string>()): Map<string, string> => {
  for (const [key, value] of Object.entries<any>(node)) {
    if (key.startsWith('$')) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && '$value' in value) acc.set(path, value.$type);
    else if (value && typeof value === 'object') tokenPaths(value, path, acc);
  }
  return acc;
};

/** A theme's token paths, below its configurable root. */
export const pathsOf = (theme: Theme): Map<string, string> => {
  const { tree } = buildTree(theme);
  const root = Object.keys(tree).find((k) => !k.startsWith('$'))!;
  return tokenPaths((tree as any)[root]);
};

const readBrief = (rel: string): BrandInput => parseDesignMd(readFileSync(resolve(here, rel), 'utf8')).input;

/** The three required `BrandInput` fields and nothing else — the sparsest accepted input. */
export const MINIMAL_BRAND: BrandInput = {
  id: 'minimal',
  primary: { l: 0.55, c: 0.15, h: 262 },
  neutral: { hue: 262, chroma: 0.008 },
} as BrandInput;

/** The corpus, in a fixed order so the emitted `corpus` list is deterministic. */
export const corpus = (): Array<{ id: string; theme: Theme }> => {
  const std = parseStandardDesignMd(readFileSync(resolve(here, '..', 'examples', 'wendys.design.md'), 'utf8'));
  return [
    { id: 'nb (legacy fixture, nbds.* dialect)', theme: nbTheme() },
    { id: 'aurora (engine-native brief)', theme: brandTheme(readBrief('../examples/aurora.design.md')) },
    { id: 'harbor (engine-native brief)', theme: brandTheme(readBrief('../examples/harbor.design.md')) },
    { id: 'wendys (standard dialect)', theme: brandTheme(standardToBrandInput(std).input) },
    { id: 'minimal (required fields only)', theme: brandTheme(MINIMAL_BRAND) },
  ];
};

/** Build the live contract: intersection = guaranteed, union minus intersection = brand-dependent. */
export const buildContract = (): Contract => {
  const members = corpus().map(({ id, theme }) => ({ id, paths: pathsOf(theme) }));
  const guaranteed: Record<string, string> = {};
  for (const [path, type] of [...members[0].paths].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (members.every((m) => m.paths.get(path) === type)) guaranteed[path] = type;
  }
  const union = new Set(members.flatMap((m) => [...m.paths.keys()]));
  const brandDependent = [...union].filter((p) => !(p in guaranteed)).sort();
  return {
    contractVersion: CONTRACT_VERSION,
    engineVersion: ENGINE_VERSION,
    note:
      'Generated by Prism3/engine/token-contract.ts — do not hand-edit. `guaranteed` is the token-name ' +
      'surface every corpus brand emits, keyed below the configurable root, mapped to its DTCG $type. ' +
      'Removing or retyping one of these is a BREAKING change; adding is a minor one. Token VALUES are ' +
      'not versioned — a brand changing its colors is the engine working, not a contract break. ' +
      '`brandDependent` paths exist for some inputs only and are informational: they never force a bump.',
    corpus: members.map((m) => m.id),
    guaranteed,
    brandDependent,
    deprecations: DEPRECATIONS,
  };
};

export const readBaseline = (): Contract => JSON.parse(readFileSync(CONTRACT_PATH, 'utf8')) as Contract;

const serialize = (c: Contract): string => JSON.stringify(c, null, 2) + '\n';

// A `$type` disagreement between two brands on the SAME path is not a versioning question — it is a
// bug in the emitter, and it would silently shrink the guaranteed set (the path drops out of the
// intersection and reads as "brand-dependent"). Detected separately so it cannot hide there.
const typeClashes = (): string[] => {
  const members = corpus().map(({ id, theme }) => ({ id, paths: pathsOf(theme) }));
  const seen = new Map<string, { type: string; id: string }>();
  const clashes: string[] = [];
  for (const m of members) {
    for (const [path, type] of m.paths) {
      const prev = seen.get(path);
      if (!prev) seen.set(path, { type, id: m.id });
      else if (prev.type !== type) clashes.push(`${path}: ${prev.type} (${prev.id}) vs ${type} (${m.id})`);
    }
  }
  return clashes;
};

const main = (): void => {
  const accept = process.argv.includes('--accept');
  const check = process.argv.includes('--check');
  if (!accept && !check) {
    console.log('Usage: tsx Prism3/engine/token-contract.ts --check | --accept');
    process.exit(2);
  }

  const live = buildContract();
  const baseline = readBaseline();
  const diff = classify(baseline, live.guaranteed);
  const clashes = typeClashes();
  const informationalOnly =
    diff.level === 'none' &&
    (JSON.stringify(baseline.brandDependent) !== JSON.stringify(live.brandDependent) ||
      JSON.stringify(baseline.deprecations) !== JSON.stringify(live.deprecations) ||
      baseline.engineVersion !== live.engineVersion);

  console.log(`Prism3 token contract — engine ${ENGINE_VERSION}, contract ${CONTRACT_VERSION}`);
  console.log(`  corpus: ${live.corpus.length} brands · guaranteed ${Object.keys(live.guaranteed).length} · brand-dependent ${live.brandDependent.length}`);
  console.log(`  baseline: contract ${baseline.contractVersion} · guaranteed ${Object.keys(baseline.guaranteed).length}`);

  if (clashes.length) {
    console.error(`\n✗ ${clashes.length} $type clash(es) between corpus brands on the same path:`);
    for (const c of clashes.slice(0, 10)) console.error(`    ${c}`);
    console.error('  A path with two types is an emitter bug — it would drop out of the guarantee unnoticed.');
    process.exit(1);
  }
  if (diff.danglingDeprecations.length) {
    console.error(`\n✗ ${diff.danglingDeprecations.length} deprecation(s) point at a path the engine does not emit:`);
    for (const d of diff.danglingDeprecations) console.error(`    ${d.path} → ${d.replacedBy} (missing)`);
    process.exit(1);
  }

  const report = (): void => {
    for (const p of diff.removed) {
      const m = diff.migrated.find((d) => d.path === p);
      console.log(`    REMOVED  ${p}${m ? `  → ${m.replacedBy} (since ${m.since})` : '  (no deprecation entry — consumers get no migration)'}`);
    }
    for (const r of diff.retyped) console.log(`    RETYPED  ${r.path}: ${r.from} → ${r.to}`);
    for (const p of diff.added.slice(0, 20)) console.log(`    ADDED    ${p}`);
    if (diff.added.length > 20) console.log(`    ADDED    … and ${diff.added.length - 20} more`);
  };

  if (accept) {
    if (!satisfiesBump(baseline.contractVersion, CONTRACT_VERSION, diff.level)) {
      console.error(`\n✗ this change is ${diff.level.toUpperCase()} but CONTRACT_VERSION is still ${CONTRACT_VERSION} (baseline ${baseline.contractVersion}).`);
      report();
      console.error(`\n  Raise CONTRACT_VERSION in Prism3/engine/version.ts by a ${diff.level} increment, then re-run --accept.`);
      if (diff.removed.length) console.error('  If a removal is a RENAME, add a DEPRECATIONS entry so consumers get the replacement path.');
      process.exit(1);
    }
    writeFileSync(CONTRACT_PATH, serialize(live));
    console.log(`\n✓ baseline accepted at ${CONTRACT_VERSION} (${diff.level === 'none' ? 'no surface change' : diff.level})`);
    if (diff.level !== 'none') report();
    return;
  }

  if (diff.level === 'none' && !informationalOnly) {
    console.log('\n✓ token contract unchanged');
    return;
  }
  console.error(`\n✗ the committed baseline no longer matches the engine — ${diff.level === 'none' ? 'informational fields only' : `${diff.level.toUpperCase()} change`}`);
  report();
  if (diff.level === 'none') console.error('    (no guaranteed path moved — no version bump required)');
  console.error('\n  Review the diff, then: npx tsx Prism3/engine/token-contract.ts --accept');
  process.exit(1);
};

if (process.argv[1] && /token-contract\.ts$/.test(process.argv[1])) main();
