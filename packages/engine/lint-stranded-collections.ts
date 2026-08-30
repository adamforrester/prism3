/**
 * STRANDED COLLECTION GATE (#1152) — no collection ships that nothing writes, and nothing writes a
 * collection that does not ship.
 *
 *   npx tsx packages/engine/lint-stranded-collections.ts
 *
 * ── THE DEFECT, AND WHY IT IS A DIFFERENT SHAPE FROM AN ORPHAN ──────────────────────────────────
 *
 * The write path already reports orphans (#479): a variable present in the file but absent from the
 * plan. That report is produced BY an executor, ABOUT the collection that executor just walked. So it
 * can only ever describe drift INSIDE somewhere a plan already reaches.
 *
 * A collection nothing plans is never reached. `upsertCollection` is never called for it, no `byName`
 * index is built over it, its variables never enter a `preExisting` set. It contributes to no orphan
 * list, no total, no `created`, no `misses`. **The absence of a finding about it is indistinguishable
 * from the absence of a look** — the run completes clean and silent.
 *
 * #1148 produced one. `Variable.variableCollectionId` is `readonly`, so a variable cannot be
 * re-parented: collapsing the two colour tiers RENAMES the value tier onto `color` and leaves a
 * designer's `color.surface` standing beside it, holding its variables and every binding into them.
 * Nothing breaks — those bindings still resolve — and nothing reports it. The pre-#1097
 * `core-palette`/`core-dimension`/`core-font` fan-in has the same shape and the same silence.
 *
 * ── THE CRUX: A GATE FOR THIS CANNOT ASK AN EXECUTOR ANYTHING ───────────────────────────────────
 *
 * An orphan is by definition a thing nothing walks, so no executor holds an opinion about one, and
 * four executors with no opinion still sum to silence. Every arm below therefore **enumerates from
 * something outside every executor** and uses the executors' union only as the SUBTRAHEND:
 *
 *   ENUMERATED FROM          the emitted Figma artifacts (`out/figma/<brand>/*.json`), and the
 *                            authored `COLLECTION_RENAMES`, and the executor sources' own text.
 *   SUBTRACTED               the set of collections the write plans name.
 *
 * Nothing here reads a report. Nothing here runs an executor. The direction is the design: a check
 * built on "did any pass complain?" reproduces the defect it is looking for.
 *
 * ── INDEPENDENCE, INCLUDING THE PART THAT IS *NOT* INDEPENDENT (docs/34) ────────────────────────
 *
 * This must be read before adding an arm, because the obvious arm is a tautology.
 *
 * **The plan's collection NAMES are derived from the emission and cannot be compared to it.**
 * `buildFloatWritePlan` is `floatPlanFor(files[0].$collection, files)`; `buildFontVarPlan` is
 * `varPlanFor(font[0].$collection, font)`; the palette's name is `CORE_COLLECTION`, imported from the
 * emitter. Each is deliberate (#1097 — a literal at the call site would be a second place the fact is
 * stated) and each means "does the plan's name equal the emission's name?" is `x === x`. **Do not add
 * that arm.** It would report a pass on every mutation and read as coverage — `docs/34` shape 17.
 *
 * What IS independent, and what each arm below actually compares:
 *
 *   ARM 1 COVERAGE   The plan's MEMBERSHIP is hand-authored even though its spellings are derived:
 *                    `buildFloatWritePlan` returns ten hand-written `named([dims.…])` entries, and
 *                    `buildFontVarPlan` two. An eleventh emitted axis gets a plan only if somebody
 *                    writes one. So "is every emitted variable collection named by SOME plan?" is a
 *                    real question with a hand-authored answer — the one this arm asks. Deleting a
 *                    line from that list strands the axis from birth.
 *   ARM 2 PHANTOM    The reverse: a plan naming a collection no brand emits. The executor's
 *                    `upsertCollection` CREATES on miss, so this ships an empty collection into a
 *                    designer's file and leaves whatever the emitter meant unwritten.
 *   ARM 3 RENAME     `COLLECTION_RENAMES` is authored by hand. Its `to` must be a collection something
 *                    writes, or the migration renames a designer's collection INTO A NAME NOTHING
 *                    WRITES — `rename-map.ts`'s own header says exactly this about the retired
 *                    `surface` → `color.surface` entry (#1108), and says it in prose that nothing
 *                    checked. Its `from` must NOT be one, or the executor renames a collection away
 *                    and immediately recreates it.
 *   ARM 4 LITERAL    Collection names the EXECUTORS spell as string literals rather than reading off
 *                    a plan — `upsertCollection(vars, 'color', …)`, `findCol('color')`. These are the
 *                    hand-typed sites the derived ones were introduced to replace, and the four that
 *                    remain are invisible to arms 1–2: `'color'` reaches the plan-owned set from the
 *                    EMITTER's `$collection`, never from the executor's literal, so a stale literal
 *                    passes both. Scanned from source text, with a per-file floor below.
 *
 * ── THE FLOOR ───────────────────────────────────────────────────────────────────────────────────
 *
 * Every arm is a set difference, and a set difference over an empty set is empty. So the floor
 * asserts each side was actually populated, by name:
 *
 *   · every brand yields a non-empty variable-collection set;
 *   · the STYLE axes are non-empty — they are separated from variable collections BY RULE (a style
 *     file carries no `$mode`), never by a name list, so an empty style set means the rule stopped
 *     discriminating rather than that the styles went away;
 *   · each source file promised to ARM 4 yields at least one literal, so a regex that rots fails here
 *     instead of reporting a confident 0 (#986);
 *   · a brand with neither a committed emission nor a `THEMES` entry FAILS rather than skipping.
 *
 * `COLLECTION_RENAMES` is deliberately NOT floored: an empty rename map is a legitimate steady state
 * (it held zero entries between #1013 and #1148). Its size is printed on a clean run instead, so a
 * drop to zero is visible without being an error.
 *
 * ── WHAT THIS DOES NOT CHECK ────────────────────────────────────────────────────────────────────
 *
 * A collection stranded in a DESIGNER'S FILE. That is the other half of #1152 and no CI gate can see
 * it — it lives in a document this repo has never read. `strandedCollections` in
 * `apps/plugin/src/write-figma.ts` is that half: it enumerates from `getLocalVariableCollectionsAsync`
 * at apply time and reports what no plan owns. This gate is the compile-time half — it stops the
 * engine MINTING a new stranded collection; that one surfaces the ones already out there.
 *
 * PURE-ADJACENT — reads the committed artifacts and two source files, plus one in-memory build.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Theme } from './theme.ts';
import { brandTheme } from './theme.ts';
import { nbTheme } from './nb-fixture.ts';
import { readExampleBrand } from './emit-dtcg.ts';
import { parseStandardDesignMd, standardToBrandInput } from './standard-design-md.ts';
import { buildFigmaColor } from './emit-figma-color.ts';
import { figmaArtifacts } from './emit-figma.ts';
import { buildFloatWritePlan, buildFontVarPlan } from './write-plan.ts';
import { COLLECTION_RENAMES } from './rename-map.ts';

const HERE = import.meta.dirname;
const FIGMA = join(HERE, 'out', 'figma');
const OUT = join(HERE, 'out');

/**
 * Brand → theme. The one hand-maintained list here, and NOT a skip list: a brand token tree with
 * neither a committed `out/figma/<brand>/` nor an entry here fails below, so the list going stale is
 * loud rather than silent (the harbor lesson from #1138).
 */
const THEMES: Record<string, () => Theme> = {
  nb: () => nbTheme(),
  aurora: () => brandTheme(readExampleBrand('./examples/aurora.design.md')),
  harbor: () => brandTheme(readExampleBrand('./examples/harbor.design.md')),
  wendys: () =>
    brandTheme(
      standardToBrandInput(
        parseStandardDesignMd(readFileSync(join(HERE, 'examples', 'wendys.design.md'), 'utf8')),
      ).input,
    ),
};

/**
 * Source files that spell a collection name as a LITERAL, and the call shapes that do it. Both are
 * asserted to yield at least one match — see the floor.
 */
const LITERAL_SITES: { file: string; label: string }[] = [
  { file: 'apps/plugin/src/write-figma.ts', label: 'the plugin executor' },
  { file: 'packages/engine/materialise-to-figma.ts', label: 'the paste-path generator' },
];
const LITERAL_RE = /(?:upsertCollection\(\s*vars\s*,\s*|findCol\()'([^']+)'/g;

type Split = { variables: Set<string>; styles: Set<string> };

/**
 * ORACLE — the collections a brand's Figma emission declares, split BY RULE rather than by name: a
 * variable collection file carries a `$mode`, a style-axis file (`text-styles`, `shadow-styles`,
 * `gradient-styles`) does not, because Figma Styles have no modes and no collection. A name list here
 * would be the place that remembers which three those are, and would go stale on the fourth.
 */
const splitEmission = (files: { content: string }[]): Split => {
  const variables = new Set<string>();
  const styles = new Set<string>();
  for (const f of files) {
    const j = JSON.parse(f.content) as { $collection?: unknown; $mode?: unknown };
    if (typeof j.$collection !== 'string') continue;
    (typeof j.$mode === 'string' ? variables : styles).add(j.$collection);
  }
  return { variables, styles };
};

const emissionFor = (brand: string): { split: Split; source: 'committed' | 'computed' } | null => {
  const dir = join(FIGMA, brand);
  if (existsSync(dir)) {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ content: readFileSync(join(dir, f), 'utf8') }));
    return { split: splitEmission(files), source: 'committed' };
  }
  const build = THEMES[brand];
  if (!build) return null;
  return { split: splitEmission(figmaArtifacts(build()).artifacts), source: 'computed' };
};

/**
 * SUBJECT — the collections the write plans name, for one brand's theme.
 *
 * Assembled the way `main.ts` assembles it for the runtime stranded pass: `$collection` off the
 * colour files and `plan.name` off the float/font plans. NOT the axis labels the orphan report uses —
 * `core/dimension` is a label and `core` is what Figma holds.
 */
const planOwned = (theme: Theme): Set<string> => {
  const color = buildFigmaColor(theme);
  return new Set([
    color.palette.$collection,
    ...color.color.map((c) => c.$collection),
    ...buildFloatWritePlan(theme).map((p) => p.name),
    ...buildFontVarPlan(theme).map((p) => p.name),
  ]);
};

const brands = readdirSync(OUT)
  .map((f) => /^([a-z0-9-]+)\.tokens\.json$/.exec(f)?.[1])
  .filter((b): b is string => !!b)
  .sort();

if (!brands.length) {
  console.error('✗ no brand token trees found in out/ — nothing to check (did regen run?)');
  process.exit(1);
}

const failures: string[] = [];
const perBrand: string[] = [];
const allOwned = new Set<string>();
const allEmitted = new Set<string>();
let styleAxesSeen = 0;

for (const brand of brands) {
  const oracle = emissionFor(brand);
  if (!oracle) {
    failures.push(
      `${brand}: UNCHECKABLE — no out/figma/${brand}/ and no THEMES entry. Its collections are ` +
      `compared against nothing, which is the silence this gate exists to remove. Add a THEMES ` +
      `entry or ship an emission; skipping it is docs/34 shape 15.`,
    );
    continue;
  }
  const { split, source } = oracle;
  const theme = THEMES[brand];
  if (!theme) {
    failures.push(`${brand}: has an emission but no THEMES entry, so no plan set can be built for it.`);
    continue;
  }
  const owned = planOwned(theme());
  for (const c of owned) allOwned.add(c);
  for (const c of split.variables) allEmitted.add(c);
  styleAxesSeen += split.styles.size;

  // ARM 1 — an emitted variable collection no plan names. Stranded from birth: the engine ships it,
  // no executor writes it, and no orphan report can ever mention it.
  for (const c of [...split.variables].sort()) {
    if (!owned.has(c)) {
      failures.push(
        `${brand}: STRANDED — the ${source} emission declares variable collection '${c}', and no write ` +
        `plan names it. Nothing writes it into a designer's file, and because no executor walks it, ` +
        `nothing reports that either. Give it a plan (buildFloatWritePlan / buildFontVarPlan), or stop ` +
        `emitting it.`,
      );
    }
  }

  // ARM 2 — a plan naming a collection nothing emits. `upsertCollection` CREATES on miss, so this
  // ships an empty collection and leaves the emitted one unwritten.
  for (const c of [...owned].sort()) {
    if (!split.variables.has(c)) {
      failures.push(
        `${brand}: PHANTOM — a write plan names collection '${c}', which the ${source} emission does ` +
        `not declare. The executor creates a collection on miss, so this writes an empty one into the ` +
        `file and leaves whatever the emitter meant unwritten.`,
      );
    }
  }

  // FLOOR — a set difference over an empty set is empty, so both sides must be populated.
  if (!split.variables.size) {
    failures.push(`FLOOR: ${brand} yielded 0 variable collections, so arms 1 and 2 compared nothing for it.`);
  }
  perBrand.push(
    `  ${brand.padEnd(8)} ${String(split.variables.size).padStart(2)} variable collections + ` +
    `${split.styles.size} style axes (${source})  ·  ${owned.size} plan-owned`,
  );
}

// ARM 3 — the authored rename map against what anything writes. `rename-map.ts`'s own header states
// this rule in prose about the retired `surface` -> `color.surface` entry (#1108); nothing checked it.
for (const r of COLLECTION_RENAMES) {
  if (!allOwned.has(r.to)) {
    failures.push(
      `RENAME TARGET — COLLECTION_RENAMES sends '${r.from}' to '${r.to}', which no write plan names. ` +
      `A designer's collection would be renamed INTO A NAME NOTHING WRITES and stranded there, ` +
      `unreported, forever. This is #1108 exactly. Plan-owned: ${[...allOwned].sort().join(', ')}.`,
    );
  }
  if (allOwned.has(r.from)) {
    failures.push(
      `RENAME SOURCE — COLLECTION_RENAMES renames '${r.from}' away, but a write plan still names it, ` +
      `so the executor renames the collection and then immediately recreates it empty.`,
    );
  }
}

// ARM 4 — collection names the executors spell as literals. Invisible to arms 1-2, which reach
// 'color' through the emitter's `$collection` and never through the executor's own text.
const repoRoot = join(HERE, '..', '..');
for (const { file, label } of LITERAL_SITES) {
  let text: string;
  try {
    text = readFileSync(join(repoRoot, file), 'utf8');
  } catch {
    failures.push(`FLOOR: ARM 4 cannot read ${file} (${label}) — the scan is over a file that moved.`);
    continue;
  }
  const found = [...text.matchAll(LITERAL_RE)].map((m) => m[1]);
  if (!found.length) {
    failures.push(
      `FLOOR: ARM 4 found 0 collection literals in ${file} (${label}). Either the call shapes were ` +
      `renamed out from under LITERAL_RE, or the literals became derived — the first is a rotted ` +
      `detector reporting a confident pass, and only this line tells them apart (#986).`,
    );
    continue;
  }
  for (const name of [...new Set(found)].sort()) {
    if (!allEmitted.has(name)) {
      failures.push(
        `EXECUTOR LITERAL — ${file} (${label}) spells collection '${name}', which no brand's emission ` +
        `declares. The executor would upsert — that is, CREATE — that collection and leave the emitted ` +
        `one unwritten. Emitted: ${[...allEmitted].sort().join(', ')}.`,
      );
    }
  }
}

if (!styleAxesSeen) {
  failures.push(
    `FLOOR: 0 style axes seen across all brands. Style files are told from variable collections BY ` +
    `RULE — a style file carries no $mode — so an empty style set means that rule stopped ` +
    `discriminating, not that the styles went away.`,
  );
}

console.log('stranded collections — what ships vs what anything writes:');
for (const line of perBrand) console.log(line);
console.log(`  rename map: ${COLLECTION_RENAMES.length} collection rename(s) checked against the plan-owned set`);

if (failures.length) {
  console.error(`\n✗ ${failures.length} stranded-collection failure(s):\n`);
  for (const f of failures) console.error(`  • ${f}`);
  console.error(
    `\nEach names a collection that something ships or migrates and nothing writes, or the reverse. ` +
    `Do not relax the comparison: every arm enumerates from OUTSIDE the executors on purpose, because ` +
    `an executor has no opinion about a collection it never walks (#1152, docs/34).`,
  );
  process.exit(1);
}

console.log(
  `\n  ✓ clean — every emitted variable collection across ${brands.length} brands is named by a write ` +
  `plan and vice versa, every rename target is a collection something writes, and every collection ` +
  `literal in the executors is one the emission declares.`,
);
