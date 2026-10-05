/**
 * Prism3 engine — TOKEN CONTRACT (the corpus build + the breaking-change gate).
 *
 *   npx tsx packages/engine/token-contract.ts --check    # fail (exit 1) if the surface moved
 *   npx tsx packages/engine/token-contract.ts --accept   # rewrite the baseline (requires the bump)
 *   PRISM3_CONTRACT_BASELINE=/tmp/x.json npx tsx …  --check   # injected baseline, for tests (#1768)
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
 *   nb            — the hand-built legacy system, `nbds.*` dialect, rgb() colour format
 *   aurora        — engine-native brief, extra brand colour, 3:1 icon contrast
 *   harbor        — engine-native brief, a different lever combination
 *   wendys        — STANDARD dialect (flat `colors:` map classified into anchors), a different typeface
 *   minimal       — the three required fields and nothing else: the sparsest input the engine accepts
 *   minimal-levers— the sparsest input WITH two suppressing levers pulled (#957, see below)
 *   minimal-bp2   — the sparsest input WITH a two-breakpoint layout, demoting the upper tiers (#1479)
 *   minimal-weights— the sparsest input WITH narrowed weight sets, demoting the declined roles (#1632)
 *   minimal-compact— the sparsest input AT compact density: the corpus's only compact member (#1215)
 *   minimal-weight-swap— the sparsest input WITH eyebrow's and code's single weight swapped (#1639)
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
 * `minimal-levers` earns its place by removing 30, and the reason it was needed is that SPARSE IS NOT
 * THE SAME AS SUPPRESSED (#957). `minimal` omits every optional field, so every lever takes its
 * DEFAULT — and a default is a value like any other. Two levers suppress paths when set away from
 * their default and no other member sets them: `outlineInteraction: 'none'` emits no
 * `interactive.<c>.overlay.*` at all (27 paths across the value, inverse and surface tiers), and
 * `typography.displayCeiling: 'sm'` ships no rung above `sm` (3 paths). Those 30 were guaranteed on
 * the strength of nobody having pulled the lever, which is the same over-claim `minimal` exists to
 * prevent, one level in. They are `brandDependent` now — still emitted, no longer promised.
 *
 * The member is deliberately the sparse input PLUS the two levers, not a sixth rich brand: the point
 * is to vary exactly the two things, so what drops out is attributable. It adds no path that no
 * existing member emits, so the demotion is the whole of its effect on the surface.
 *
 * `minimal-bp2` earns its place the same way, on a different axis (#1479). The breakpoint COUNT is a
 * per-brand lever (`layout.breakpoints`); `bpNames` auto-names by slicing the t-shirt ladder, so a
 * 2-floor brand ships only `sm`/`md` and emits neither `breakpoint.{lg,xl,2xl}` nor `grid.{lg,xl,2xl}.*`.
 * Those 12 tiers were guaranteed only because every prior corpus brand happened to ship 5+ floors — the
 * same over-claim `minimal` exists to prevent (SPARSE is not the DEFAULT COUNT), one axis in. They are
 * `brandDependent` now — still emitted by the 5-and-6-floor brands, no longer promised — mirroring
 * `breakpoint.xs`/`grid.xs.*`, which are brand-dependent because only aurora's 6 floors reach them.
 * Built off `MINIMAL_BRAND` so the ONLY difference is the floor list and the demotion is attributable
 * to the count alone.
 *
 * `minimal-weights` is the same move on an OBJECT lever (#1632). `typography.weights` says which weight
 * roles each type category ships, and narrowing a set is the lever's whole purpose: a brand that doesn't
 * use a weight doesn't get its styles. The corpus never pulled it, so the default sets' roles were
 * guaranteed, and nb-redesign (not a corpus member) missed 17 `type.*.strong` / `-strong-link` paths at
 * its own settings. The member carries nb-redesign's exact weight sets, so the demotion is the case that
 * was found, and it's built off `MINIMAL_BRAND` so the sets are the only thing that varies. The owner's
 * rule: "if we are removing anything we are removing unused weights". Those 17 are `brandDependent` now.
 * Components don't bind a weight role by name where a brand can decline it: `field-label` resolves its
 * weight by intent (#1601/#1602), and `lint-lever-sweep` arm (b) checks nb-redesign's bindings against
 * its own emission.
 *
 * `minimal-compact` is a TEST-ONLY fixture, not an example brand (#1215). Aurora carried compact density
 * until the owner moved it to the default `comfortable`, because the studio boots it and its 36px medium
 * control read as the engine's default. Compact must stay exercised (it caught the collapsed-rung defect
 * #900's window mechanism fixed), and it must stay inside the corpus: `theme.ts` feeds only the spacious
 * grid extra px on the argument that compact is a corpus density, so a compact-only removal of a
 * guaranteed path is caught here. The member is built off `MINIMAL_BRAND` so density is the only thing
 * that varies. It is never emitted to `out/` and never listed in the studio: it lives in this file, not
 * under `examples/`. `test.ts` asserts its medium control is 36 (compact's window), so a member that
 * silently stopped being compact fails by name.
 *
 * `minimal-weight-swap` finishes #1632's move for the single-role categories (#1639). `eyebrow` and `code`
 * ship one weight each by default, so a brand varies them by REPLACING the role, not narrowing the set.
 * The owner's disposition (2026-09-26): every category keeps at least one weight (the engine refuses an
 * empty set), `label` keeps `emphasis` because `button` binds `type.label.*.emphasis` by name (refused
 * too), and `eyebrow` and `code` may swap. So `type.eyebrow.*.emphasis` and `type.code.*.default` are
 * `brandDependent` now. The member swaps exactly those two sets, built off `MINIMAL_BRAND`, so the
 * demotion is attributable to the swap alone. Label is left at its default: it can gain roles, never
 * lose `emphasis`, so its `emphasis` composites stay guaranteed.
 *
 * WHY THIS IS NOT PART OF `regen.ts`. The baseline must not be able to regenerate itself. `regen`
 * rewrites every generated artifact and `regen --check` proves the committed copies match; run that
 * way, a deleted token would rewrite the baseline to agree with the deletion and both gates would
 * pass. #281's lesson was "no gate reads the committed artifact"; this is the next one along — a
 * gate that is allowed to rewrite what it reads has no memory, and a baseline without memory is
 * just a second copy of the output. `--accept` is therefore a separate, deliberate act.
 *
 * THE NUMBERS ARE COMPARED TOO, NOT ONLY THE PATHS (#1768). `classify` answers "did the surface move?";
 * it never read `CONTRACT_VERSION` against the baseline's `contractVersion`, so a constant LOWERED below
 * the baseline (a revert, a bad merge resolution, a hand edit) printed "unchanged" and exited 0. Both modes
 * now ask `contractVersionDrift` first, and fail by name on a constant that is BEHIND the baseline, or
 * AHEAD of it with no surface change to record. A bump larger than the diff requires is not flagged:
 * `docs/30` says "at least", and that is policy, not this gate's to tighten. See `contractVersionDrift`.
 *
 * NO `engineVersion` FIELD IN THE BASELINE (#1807), the same rule `lint-component-surface.ts` states for
 * its own baseline. The field was stamped from `ENGINE_VERSION` (docs/34 shape 1: a copy of the constant,
 * compared to nothing), it recorded nothing the contract promises, and its one effect was to fail `--check`
 * with "informational fields only" on every engine bump. That forced an `--accept` rewrite of the line next
 * to `contractVersion` in every bumping PR, so two PRs that each bumped the engine conflicted there with no
 * contract change on either side. The baseline records the NAME surface and `contractVersion`, and nothing
 * the engine version moves. `--check` refuses a baseline that still carries the field, by name (a merge
 * resolution that takes an old branch's side brings it back); `--accept` writes the baseline without it.
 *
 * `PRISM3_CONTRACT_BASELINE` points the run at another baseline file. It exists so `test.ts` can drive
 * THIS entry point over a fixture whose recorded version it chose (the same shape as
 * `lint-advisory-expiry.ts`'s `PRISM3_TODAY`): the drift arm's call site is then under test, not only the
 * pure function behind it (docs/34, "mutate the call site"). The run prints a warning line when it is set,
 * and `--accept` writes to the injected file, never to the committed baseline.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brandTheme, BrandInput, Theme } from './theme';
import { nbTheme } from './nb-fixture';
import { buildTree } from './tree';
import { parseDesignMd } from './design-md';
import { parseStandardDesignMd, standardToBrandInput } from './standard-design-md';
import { CONTRACT_VERSION, ENGINE_VERSION, DEPRECATIONS, classify, contractVersionDrift, satisfiesBump, Contract } from './version';

const here = dirname(fileURLToPath(import.meta.url));
export const CONTRACT_PATH = resolve(here, 'schema', 'token-contract.json');

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

/**
 * The same sparse input with the two SUPPRESSING levers pulled (#957) — see the header. Built off
 * `MINIMAL_BRAND` rather than authored beside it, so the only difference between the two members is
 * the two fields named here and a path dropping out is attributable to one of them.
 */
export const MINIMAL_LEVERS_BRAND: BrandInput = {
  ...MINIMAL_BRAND,
  id: 'minimal-levers',
  outlineInteraction: 'none',
  typography: { displayCeiling: 'sm' },
} as BrandInput;

/**
 * The same sparse input with a TWO-BREAKPOINT layout (#1479). The breakpoint count is a per-brand
 * lever and `bpNames` slices the t-shirt ladder to the count, so this brand ships only `sm`/`md` and
 * emits none of `breakpoint.{lg,xl,2xl}` / `grid.{lg,xl,2xl}.*`. It is what pushes those 12 upper-tier
 * paths out of the guaranteed intersection and into `brandDependent` — see the header. Built off
 * `MINIMAL_BRAND` so the floor list is the only thing that varies, and the demotion is attributable
 * to it alone; it adds no path no existing member emits.
 */
export const MINIMAL_BP2_BRAND: BrandInput = {
  ...MINIMAL_BRAND,
  id: 'minimal-bp2',
  layout: { breakpoints: [0, 768] },
} as BrandInput;

/**
 * The same sparse input with NARROWED weight sets (#1632): nb-redesign's `typography.weights`, verbatim.
 * No category keeps `strong`, so every `type.*.strong` (and `-strong-link`) composite the default sets
 * ship drops out of the guaranteed intersection and into `brandDependent` — see the header. Built off
 * `MINIMAL_BRAND` so the weight sets are the only thing that varies and the demotion is attributable
 * to them alone.
 */
export const MINIMAL_WEIGHTS_BRAND: BrandInput = {
  ...MINIMAL_BRAND,
  id: 'minimal-weights',
  typography: { weights: { display: ['subtle'], title: ['subtle'], body: ['default', 'emphasis'], caption: ['default', 'emphasis'] } },
} as BrandInput;

/**
 * The same sparse input at COMPACT density (#1215) — the corpus's only compact member, and a test-only
 * fixture rather than an example brand. See the header. Every compact-density check in `test.ts` builds
 * from this, so it is not a copy of any brand a designer sees.
 */
export const MINIMAL_COMPACT_BRAND: BrandInput = {
  ...MINIMAL_BRAND,
  id: 'minimal-compact',
  density: 'compact',
} as BrandInput;

/**
 * The same sparse input with eyebrow's and code's SINGLE weight swapped for another role (#1639) — see
 * the header. The swap targets are arbitrary; what matters is that neither keeps its default role, so
 * `type.eyebrow.*.emphasis` and `type.code.*.default` drop out of the guaranteed intersection.
 */
export const MINIMAL_WEIGHT_SWAP_BRAND: BrandInput = {
  ...MINIMAL_BRAND,
  id: 'minimal-weight-swap',
  typography: { weights: { eyebrow: ['strong'], code: ['emphasis'] } },
} as BrandInput;

/** The corpus, in a fixed order so the emitted `corpus` list is deterministic. */
export const corpus = (): Array<{ id: string; theme: Theme }> => {
  const std = parseStandardDesignMd(readFileSync(resolve(here, 'examples', 'wendys.design.md'), 'utf8'));
  return [
    { id: 'nb (legacy fixture, nbds.* dialect)', theme: nbTheme() },
    { id: 'aurora (engine-native brief)', theme: brandTheme(readBrief('./examples/aurora.design.md')) },
    { id: 'harbor (engine-native brief)', theme: brandTheme(readBrief('./examples/harbor.design.md')) },
    { id: 'wendys (standard dialect)', theme: brandTheme(standardToBrandInput(std).input) },
    { id: 'minimal (required fields only)', theme: brandTheme(MINIMAL_BRAND) },
    { id: 'minimal-levers (outlineInteraction none, displayCeiling sm)', theme: brandTheme(MINIMAL_LEVERS_BRAND) },
    { id: 'minimal-bp2 (two-breakpoint layout, upper tiers demoted)', theme: brandTheme(MINIMAL_BP2_BRAND) },
    { id: 'minimal-weights (narrowed weight sets, declined roles demoted)', theme: brandTheme(MINIMAL_WEIGHTS_BRAND) },
    { id: 'minimal-compact (compact density, test-only fixture)', theme: brandTheme(MINIMAL_COMPACT_BRAND) },
    { id: 'minimal-weight-swap (eyebrow and code swap their single weight, the swapped roles demoted)', theme: brandTheme(MINIMAL_WEIGHT_SWAP_BRAND) },
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
    note:
      'Generated by packages/engine/token-contract.ts — do not hand-edit. `guaranteed` is the token-name ' +
      'surface every corpus brand emits, keyed below the configurable root, mapped to its DTCG $type. ' +
      'Removing or retyping one of these is a BREAKING change; adding is a minor one. Token VALUES are ' +
      'not versioned — a brand changing its colors is the engine working, not a contract break. ' +
      '`brandDependent` paths exist for some inputs only and are informational: they never force a bump. ' +
      'It records no engine version on purpose: most engine bumps move no name.',
    corpus: members.map((m) => m.id),
    guaranteed,
    brandDependent,
    deprecations: DEPRECATIONS,
  };
};

export const readBaseline = (path = CONTRACT_PATH): Contract => JSON.parse(readFileSync(path, 'utf8')) as Contract;

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
    console.log('Usage: tsx packages/engine/token-contract.ts --check | --accept');
    process.exit(2);
  }

  const injected = process.env.PRISM3_CONTRACT_BASELINE;
  const baselinePath = injected || CONTRACT_PATH;
  const live = buildContract();
  const baseline = readBaseline(baselinePath);
  // `live.brandDependent` is passed so a DEMOTION reads as one and a CONDITIONAL migration is not
  // mistaken for rot — see `classify`. It cannot move the level; both of those are reporting.
  const diff = classify(baseline, live.guaranteed, DEPRECATIONS, live.brandDependent);
  const clashes = typeClashes();
  const informationalOnly =
    diff.level === 'none' &&
    (JSON.stringify(baseline.brandDependent) !== JSON.stringify(live.brandDependent) ||
      JSON.stringify(baseline.deprecations) !== JSON.stringify(live.deprecations));

  console.log(`Prism3 token contract — engine ${ENGINE_VERSION}, contract ${CONTRACT_VERSION}`);
  console.log(`  corpus: ${live.corpus.length} brands · guaranteed ${Object.keys(live.guaranteed).length} · brand-dependent ${live.brandDependent.length}`);
  console.log(`  baseline: contract ${baseline.contractVersion} · guaranteed ${Object.keys(baseline.guaranteed).length}`);
  if (injected) console.log(`  ⚠ baseline INJECTED via PRISM3_CONTRACT_BASELINE, reading ${baselinePath}`);

  // #1807: the field is retired (see the header). Checked on the parsed file's own keys, not on
  // `buildContract`'s output, so a baseline that regained it fails here even while the live contract,
  // which never writes it, agrees with every other field. `--accept` repairs it by writing `live`.
  // The exit is deferred to the verdict, so a baseline that ALSO moved the surface reports both in one
  // run; every later failure exits 1 on its own, and the unchanged branch exits 1 for this field.
  const retiredField = 'engineVersion' in (baseline as object);
  if (retiredField && check && !accept) {
    console.error('\n✗ the baseline carries a retired `engineVersion` field (#1807).');
    console.error(
      '  The contract baseline records the token-name surface and `contractVersion` only. An engine version\n' +
        '  there moved on every engine bump and forced an --accept that recorded no contract change. It is\n' +
        '  usually back because a merge resolution took an old branch\'s side of the line next to\n' +
        '  `contractVersion`. Delete that line, or run --accept, which writes the baseline without it.',
    );
  }

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
  // The mirror of the check above (#1137). That one asks whether the DESTINATION exists; this asks
  // whether the SOURCE is actually gone. Both are rot in the same table and only one was checked.
  if (diff.liveDeprecations.length) {
    console.error(`\n✗ ${diff.liveDeprecations.length} deprecation(s) name a path the engine STILL GUARANTEES:`);
    for (const d of diff.liveDeprecations) console.error(`    ${d.path} (still emitted) → ${d.replacedBy}`);
    console.error(
      '  A deprecation is the justification for a REMOVAL — `migrated` is `removed` matched against this\n' +
        '  table — so an entry on a live path justifies nothing, and tells every consumer to migrate off a\n' +
        '  name that works. Either the path really is going (remove it, and this entry explains why) or the\n' +
        '  entry is wrong and should go. A path that merely stopped being GUARANTEED while some brands\n' +
        '  still emit it is brand-dependent, is excluded here, and needs no change.',
    );
    process.exit(1);
  }

  const report = (): void => {
    const demoted = new Set(diff.demoted);
    for (const p of diff.removed) {
      // A demotion has no `replacedBy` to name and must not be reported as though it were missing one:
      // the path itself is what a brand that does not pull the lever still emits.
      if (demoted.has(p)) { console.log(`    DEMOTED  ${p}  (still emitted — guaranteed → brand-dependent, no migration applies)`); continue; }
      const m = diff.migrated.find((d) => d.path === p);
      console.log(`    REMOVED  ${p}${m ? `  → ${m.replacedBy} (since ${m.since})` : '  (no deprecation entry — consumers get no migration)'}`);
    }
    for (const d of diff.conditionalMigrations)
      console.log(`    CONDITIONAL  ${d.path} → ${d.replacedBy} (brand-dependent — emitted only for brands that do not suppress it)`);
    for (const r of diff.retyped) console.log(`    RETYPED  ${r.path}: ${r.from} → ${r.to}`);
    for (const p of diff.added.slice(0, 20)) console.log(`    ADDED    ${p}`);
    if (diff.added.length > 20) console.log(`    ADDED    … and ${diff.added.length - 20} more`);
  };

  // Before either mode decides anything (#1768): `classify` compares paths, so a constant that moved
  // BACKWARDS under an unchanged surface read as "unchanged". Both modes refuse it, by name.
  // A baseline version that is not MAJOR.MINOR.PATCH (`14.0.0-rc.1`, `v14.0.0`, `14.0`) cannot be ordered
  // against the constant, so the run fails closed. It fails by name rather than as a stack trace from
  // `parse`, so the reader learns which file holds the bad number.
  let drift: ReturnType<typeof contractVersionDrift>;
  try {
    drift = contractVersionDrift(baseline.contractVersion, CONTRACT_VERSION, diff.level);
  } catch (e) {
    console.error(`\n✗ the versions cannot be compared: ${(e as Error).message}.`);
    console.error(
      `  The baseline records contract "${baseline.contractVersion}" and packages/engine/version.ts has "${CONTRACT_VERSION}";\n` +
        '  both must be plain MAJOR.MINOR.PATCH (no prefix, no pre-release tag). The baseline is written only by\n' +
        '  --accept, so a malformed number there was edited by hand: restore it from history with git.',
    );
    process.exit(1);
  }
  if (drift === 'behind') {
    console.error(`\n✗ CONTRACT_VERSION moved BACKWARDS: ${CONTRACT_VERSION} in packages/engine/version.ts is below the baseline's ${baseline.contractVersion}.`);
    console.error(
      '  The baseline only ever records a version an --accept saw, so the constant is the one that moved —\n' +
        '  usually a revert, a merge resolution or a hand edit. A consumer pinned to the higher number would\n' +
        `  read a lower one for the same surface. Restore CONTRACT_VERSION to ${baseline.contractVersion}, then re-run.\n` +
        '  First check `git log -p` on the baseline: if its number was hand-edited upward, restore the file from\n' +
        '  history instead. Raising the constant to agree with a number no --accept wrote would hide that.',
    );
    process.exit(1);
  }
  if (drift === 'ahead') {
    console.error(`\n✗ CONTRACT_VERSION is AHEAD of the baseline with nothing to record: ${CONTRACT_VERSION} vs the baseline's ${baseline.contractVersion}, and no guaranteed path moved.`);
    console.error(
      `  A contract bump records a surface change. Restore CONTRACT_VERSION to ${baseline.contractVersion}, or make the\n` +
        '  change it was raised for; --accept will not stamp a raised number over an unchanged surface.',
    );
    process.exit(1);
  }

  if (accept) {
    if (!satisfiesBump(baseline.contractVersion, CONTRACT_VERSION, diff.level)) {
      console.error(`\n✗ this change is ${diff.level.toUpperCase()} but CONTRACT_VERSION is still ${CONTRACT_VERSION} (baseline ${baseline.contractVersion}).`);
      report();
      console.error(`\n  Raise CONTRACT_VERSION in packages/engine/version.ts by a ${diff.level} increment, then re-run --accept.`);
      if (diff.removed.length) console.error('  If a removal is a RENAME, add a DEPRECATIONS entry so consumers get the replacement path.');
      process.exit(1);
    }
    writeFileSync(baselinePath, serialize(live));
    console.log(`\n✓ baseline accepted at ${CONTRACT_VERSION} (${diff.level === 'none' ? 'no surface change' : diff.level})`);
    if (retiredField) console.log('  dropped the retired `engineVersion` field (#1807)');
    if (diff.level !== 'none') report();
    return;
  }

  if (diff.level === 'none' && !informationalOnly) {
    if (retiredField) process.exit(1); // refused by name above; nothing else to report
    console.log('\n✓ token contract unchanged');
    return;
  }
  console.error(`\n✗ the committed baseline no longer matches the engine — ${diff.level === 'none' ? 'informational fields only' : `${diff.level.toUpperCase()} change`}`);
  report();
  if (diff.level === 'none') console.error('    (no guaranteed path moved — no version bump required)');
  console.error('\n  Review the diff, then: npx tsx packages/engine/token-contract.ts --accept');
  process.exit(1);
};

if (process.argv[1] && /token-contract\.ts$/.test(process.argv[1])) main();
