/**
 * RAMP STEP GATE (#1179) — a studio ramp's authored step list must be a subset of the ladder it
 * resolves against, and a ladder rung the list omits must be a decision somebody wrote down.
 *
 *   npx tsx packages/engine/lint-ramp-steps.ts
 *
 * ── THE DEFECT THIS WOULD HAVE CAUGHT ──────────────────────────────────────────────────────────
 *
 * `paintRadiusPreview` iterated a hand-authored `RADIUS_STEPS` and resolved each step's px out of
 * `rp.dims['radius.<step>']`. `resolve-preview.ts` builds `rp.dims` from only the radius refs the
 * PREVIEW SPEC binds, and nothing bound `radius.capsule` until `controlShape: pill` existed — so the
 * lookup fell through `?? 0` and the ramp rendered **`capsule · 0px` with a sharp swatch** (#1177).
 * The token was in the emitted tree the whole time; the map the ramp happened to read was not the map
 * that knows the ladder.
 *
 * **Nothing caught it, and the reason generalizes past this bug.** `test:smoke` drives the built
 * `dist/main.js` and asserts the panel RENDERS — a swatch with a 0px corner renders perfectly.
 * `typecheck` is satisfied because `?? 0` makes the expression total. `regen --check` never sees the
 * studio. So a step that resolves to nothing produced a plausible number and a plausible picture, and
 * the only signal was a person looking at a corner and thinking it looked wrong. That is `docs/34`
 * shape 9: a reader anchored on a name its source cannot answer for, failing silently.
 *
 * PR #1178 fixed the symptom — `capsule` is now a pill sentinel drawn and labelled apart. This gate is
 * the class: the NEXT rung added to a ladder, or the next step added to an authored list, cannot
 * silently resolve to nothing.
 *
 * ── INDEPENDENCE (docs/34) — READ BEFORE CHANGING EITHER SIDE ───────────────────────────────────
 *
 *   SUBJECT  — the authored step arrays in `apps/studio/src/main.ts`, parsed from source text. Hand-
 *              written literals; nothing derives them from anything.
 *   ORACLE   — the ladder, COMPUTED by running the engine: `theme.dims.radius`, `theme.shadow.steps`,
 *              and for the alpha ramp the emitted tree's own `opacity` keys.
 *
 * The two are independent by construction and the gate must keep them that way. **Never read the
 * ladder off the studio list** — deriving the expected set from the subject is `docs/34` shape 17 and
 * would pass every mutation below while reading as coverage. Equally, never "simplify" the ORACLE by
 * hard-coding the rung names here: a literal list in this file is a third authored copy that agrees
 * with neither side and rots between them (shape 4, the oracle measuring a constant).
 *
 * WHY THE SUBJECT IS PARSED FROM SOURCE TEXT rather than imported. `apps/studio/src/main.ts` touches
 * `document` at import time, so it cannot be loaded under `tsx` — `ci.yml` says so where it explains
 * why the studio suite exists at all. A source scan is anchored on a NAME the subject can move
 * (shape 9), so the floor below asserts, by name, that every declared constant was actually FOUND and
 * parsed to a non-empty list, and that every `*STEPS*` array literal in the file is classified here.
 * A scan that stops matching fails; it never reports a confident clean zero (#986).
 *
 * ── THE CORPUS, AND WHY IT IS MORE THAN ONE THEME ──────────────────────────────────────────────
 *
 * nb (the fixture), aurora and harbor (generated from `design.md`), plus two synthetic lever extremes
 * — `radiusScale: 0` (every corner sharp) and `radiusScale: 2` (very soft). Rung NAMES are
 * lever-independent today, so the extremes find nothing; they are here because that is a property of
 * the current `radiusScale`, not a guarantee, and a corpus that only ever runs the default is the
 * shape `lint-ratio-truth` was caught by — a confident zero measured over exactly the inputs that
 * cannot exhibit the bug (shape 14). The count of themes actually exercised is printed, not assumed.
 *
 * ── THE ARMS ────────────────────────────────────────────────────────────────────────────────────
 *
 *   A  UNRESOLVABLE STEP — an authored step that is NOT a rung of its ladder. It will resolve to
 *                          nothing and render as whatever the fallback says.      ← the #1177 defect
 *   B  UNDECLARED RUNG   — a ladder rung the authored list omits, and that the ramp does not declare
 *                          in `omits` with a reason. Not automatically a defect: a ramp may show a
 *                          curated subset. But it must be a DECISION, not an oversight — the posture
 *                          `lint-context-nodes` takes with `LEAF_OK`. A rung added to the engine and
 *                          forgotten in the studio fails here rather than quietly never rendering.
 *
 * ── WHAT THIS DOES NOT CHECK, stated rather than implied ───────────────────────────────────────
 *
 * **CLOSED IN #1187, AND REPLACED BY A SMALLER ONE.** This paragraph used to disclose that discovery
 * was anchored on the `*STEPS*` naming convention, so a ramp named otherwise — an `ELEVATION_TIERS`,
 * say — was invisible and could carry a bogus rung at exit 0. Discovery is now the UNION of that
 * anchor and a consumption anchor (iterated, loop variable interpolated after a dotted prefix), so a
 * ramp escapes only by being named outside the convention AND reaching its loop indirectly.
 *
 * The residual hole is that conjunction, and it is real rather than theoretical: `ALPHA_STEPS_UI` is
 * exactly such a case today, caught only because its NAME matches. It is `.filter()`ed into a local,
 * passed into a `ramp(path, steps)` helper, and the token path there is built from two parameters — so
 * the consumption anchor cannot see it, and renaming it to `ALPHA_TIERS` would make it invisible to
 * both. A robust fix for that needs real dataflow (array → local → parameter → interpolation) rather
 * than a proximity scan, and a brittle approximation of dataflow would be worse than this stated
 * limit: it would fail unpredictably on refactors and teach people to widen its exemptions.
 *
 * The consumption half also carries a proximity heuristic — a 60-line window standing in for "the same
 * enclosing function", which text cannot compute. It is bounded on the safe side: too small a window
 * UNDER-collects, so a ramp falls back to the name anchor rather than a non-ramp being demanded.
 *
 * That a step resolves to the RIGHT px. Arm A proves the name exists in the ladder; the value the
 * studio then reads comes from `rp.dims`, which is a different map with a different scope, and that
 * scope mismatch is what #1177 actually was. A step can be in the ladder and still be absent from
 * `rp.dims`. So this gate closes "the list names something the ladder never had" and leaves "the map
 * the ramp reads is narrower than the ladder" open — which #1178 addressed for `capsule` by not
 * reading `rp.dims` for it at all. Naming the remaining half is the point of this paragraph.
 *
 * PURE-ADJACENT — reads one source file and one committed artifact, and runs the engine in memory.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Theme } from './theme.ts';
import { brandTheme } from './theme.ts';
import { nbTheme } from './nb-fixture.ts';
import { readExampleBrand } from './emit-dtcg.ts';

const HERE = import.meta.dirname;
const STUDIO = join(HERE, '../../apps/studio/src/main.ts');
const STUDIO_LABEL = 'apps/studio/src/main.ts';

/** One corpus member. `tree` is the brand's committed DTCG tree where one exists, else `null` — a
 *  synthetic lever probe has no emitted artifact, and a ramp whose oracle needs one says so by
 *  returning `null` rather than by being quietly skipped. */
type Brand = { id: string; theme: Theme; tree: Record<string, unknown> | null };

const readTree = (id: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(readFileSync(join(HERE, 'out', `${id}.tokens.json`), 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/** The emitted tree's own `opacity` keys — written by `tree.ts`'s module-private `ALPHA_STEPS`, which
 *  is not exported, so the committed artifact is the only place that set is legible from here. That
 *  it is an ARTIFACT rather than an import is a strength: it is what shipped. */
const opacityKeys = (tree: Record<string, unknown> | null): string[] | null => {
  if (!tree) return null;
  const root = Object.keys(tree).find((k) => !k.startsWith('$'));
  const node = root ? ((tree[root] as Record<string, unknown> | undefined)?.opacity as Record<string, unknown> | undefined) : undefined;
  if (!node) return null;
  const keys = Object.keys(node).filter((k) => !k.startsWith('$'));
  return keys.length ? keys : null;
};

type Ramp =
  | {
      /** The `const` in the studio source. */
      name: string;
      label: string;
      /** Where the ladder comes from, for the failure message — a person needs to know which file to open. */
      source: string;
      /** The ladder's rung names for one brand, or `null` when this brand cannot answer. */
      ladder: (b: Brand) => string[] | null;
      /** Ladder rungs this ramp deliberately does not render, each with the reason it is a decision. */
      omits?: Record<string, string>;
    }
  | { name: string; exempt: string };

/**
 * Every `*STEPS*` array literal in the studio, CLASSIFIED — checked against a ladder, or exempt with a
 * stated reason. Not a list of the ones somebody remembered: the floor below fails on any such literal
 * in the source that is missing from here, so a new authored ramp is a decision rather than an
 * omission. This is `lint-schema-classification`'s posture, for the same reason.
 */
const RAMPS: Ramp[] = [
  {
    name: 'RADIUS_STEPS',
    label: 'the corner-radius ramp',
    source: 'theme.dims.radius (packages/engine/scale.ts, radiusScale)',
    ladder: (b) => b.theme.dims.radius.map((s) => s.name),
  },
  {
    name: 'SHADOW_STEPS',
    label: 'the elevation ramp',
    source: 'theme.shadow.steps (packages/engine/shadow generation)',
    ladder: (b) => {
      const steps = (b.theme as unknown as { shadow?: { steps?: { name: string }[] } }).shadow?.steps;
      return steps?.length ? steps.map((s) => s.name) : null;
    },
  },
  {
    name: 'ALPHA_STEPS_UI',
    label: 'the alpha/opacity ramp',
    source: "the emitted tree's `opacity` node (tree.ts ALPHA_STEPS, module-private)",
    ladder: (b) => opacityKeys(b.tree),
  },
  {
    // FOUND BY THE CONSUMPTION ANCHOR (#1187), not by name — and it turned out to be a real ramp with a
    // real engine counterpart rather than something to exempt, which is the anchor earning its place on
    // its first run. The seven typography groups are authored in the studio and generated in the theme
    // (`typography.families[].group`); a group added to one and not the other is the same silent-resolve
    // shape as a radius rung. Exact match across nb/aurora/harbor when this landed.
    name: 'TYPE_GROUP_ORDER',
    label: 'the typography group list',
    source: 'theme.typography.families[].group',
    ladder: (b) => {
      const fams = (b.theme as unknown as { typography?: { families?: { group?: string }[] } }).typography?.families;
      const groups = [...new Set((fams ?? []).map((f) => f.group).filter((g): g is string => !!g))];
      return groups.length ? groups : null;
    },
  },
  {
    name: 'BULK_CATS',
    exempt:
      'not an authored list — it is `TYPE_GROUP_ORDER.filter((g) => g !== \'code\')`, computed inside a ' +
      'function from a list this gate already checks. It has no content of its own to drift, so checking ' +
      'it would be asserting a filter of a checked list against the same ladder (docs/34 shape 2). The ' +
      'consumption anchor sees it because it IS iterated into a token path; that is the anchor working, ' +
      'and this is the human answer it asks for.',
  },
  {
    name: 'WEIGHT_STEPS',
    exempt:
      'the CSS font-weight axis (100…900) — a W3C constant, not a ladder this engine generates. There ' +
      'is no engine-side set for it to drift from, so a subset check here would compare an authored ' +
      'list against a second authored copy of the same standard (docs/34 shape 4).',
  },
];

/**
 * SUBJECT — the array literal for one constant, parsed out of the studio source.
 *
 * Returns `null` when the constant is not found, which the floor turns into a failure rather than an
 * empty list: "the scan found nothing" and "the ramp is empty" must not be the same answer (#986).
 */
const parseSteps = (src: string, name: string): string[] | null => {
  const m = new RegExp(`^const ${name}\\s*(?::[^=]+)?=\\s*\\[([^\\]]*)\\]`, 'm').exec(src);
  if (!m) return null;
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
    .filter((s) => s.length > 0);
};

/**
 * DISCOVERY — TWO INDEPENDENT ANCHORS, UNIONED (#1187).
 *
 * The classification above has to be checked against the FILE rather than against itself, and the
 * question "which arrays in a 6,600-line studio are ramps?" has no single reliable tell. So it is
 * asked twice, in ways that fail differently, and a constant found by EITHER must be classified.
 *
 *   BY NAME        — a `*STEPS*` array constant. Cheap and exact, and it finds ramps consumed
 *                    INDIRECTLY: `ALPHA_STEPS_UI` is `.filter()`ed and passed into a `ramp(path,
 *                    steps)` helper that builds its token path from TWO parameters, so no local scan
 *                    of the consumption site can see it. Its hole is the obvious one: a ramp named
 *                    outside the convention is invisible.
 *   BY CONSUMPTION — a constant ITERATED and whose loop variable is then interpolated after a dotted
 *                    prefix (`` `radius.${step}` ``). Anchored on what the array is USED FOR rather
 *                    than what it is called, so it finds a ramp under any name. Its hole is the
 *                    mirror: it cannot follow an array through a helper parameter.
 *
 * MEASURED, because the two are not interchangeable and the numbers decide the design. On this file
 * the name anchor finds 4 constants and the consumption anchor finds 4 — but they are DIFFERENT
 * fours. Consumption alone finds one of the three real ramps and misses `SHADOW_STEPS`'s spread form
 * and `ALPHA_STEPS_UI` entirely; name alone misses anything called `ELEVATION_TIERS`. Replacing one
 * with the other loses coverage in both directions; the union loses neither.
 *
 * WHAT THE CONSUMPTION ANCHOR DRAGS IN, and why that is the right cost. It finds `TYPE_GROUP_ORDER`
 * and `BULK_CATS`, which build brandState paths and a typography taxonomy rather than resolving
 * against a generated ladder. They are classified `exempt` above with that reason. That is the anchor
 * working: it says "this array is iterated into a dotted path", and a human says whether the path is a
 * ladder. The ~20 option lists (`NAV`, `STATES`, `RADIUS_SCALE_OPTS`, …) are not iterated into a
 * `${…}` token path at all and are correctly invisible to both anchors — measured, not assumed.
 *
 * EACH ANCHOR IS FLOORED SEPARATELY below. A union is exactly as strong as its weakest half and says
 * nothing when one half silently goes to zero, so "the union is non-empty" is not the check — "both
 * anchors still find something" is.
 */
const discoverByName = (src: string): string[] =>
  [...src.matchAll(/^const ([A-Z][A-Z0-9_]*STEPS[A-Z0-9_]*)\s*(?::[^=]+)?=\s*\[/gm)].map((m) => m[1]);

/**
 * The consumption anchor. `for (const V of CONST)` — or `of [...CONST, 'extra']`, the spread form
 * `SHADOW_STEPS` uses — followed within the same block by `` `<prefix>.${V}` ``.
 *
 * The 60-line window is a proximity heuristic and is the honest weak point of this half: it stands in
 * for "the same enclosing function", which a text scan cannot compute. It is bounded on the safe side
 * — too small a window UNDER-collects, which means a ramp escapes to the name anchor rather than a
 * non-ramp being wrongly demanded. It never invents a subject.
 */
const discoverByConsumption = (src: string): { name: string; prefix: string }[] => {
  const lines = src.split('\n');
  const loops: { line: number; v: string; name: string }[] = [];
  const interps: { line: number; v: string; prefix: string }[] = [];
  lines.forEach((l, i) => {
    for (const m of l.matchAll(/for \(const ([a-zA-Z_][a-zA-Z0-9_]*) of \[?\.{0,3}\s*([A-Z][A-Z0-9_]*)\b/g))
      loops.push({ line: i, v: m[1], name: m[2] });
    for (const m of l.matchAll(/`([a-zA-Z][a-zA-Z0-9.-]*)\.\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g))
      interps.push({ line: i, v: m[2], prefix: m[1] });
  });
  const out = new Map<string, string>();
  for (const lp of loops)
    for (const it of interps)
      if (it.v === lp.v && it.line >= lp.line && it.line - lp.line < 60 && !out.has(lp.name))
        out.set(lp.name, it.prefix);
  return [...out].map(([name, prefix]) => ({ name, prefix }));
};

const src = readFileSync(STUDIO, 'utf8');

const corpus: Brand[] = [
  { id: 'nb', theme: nbTheme(), tree: readTree('nb') },
  { id: 'aurora', theme: brandTheme(readExampleBrand('./examples/aurora.design.md')), tree: readTree('aurora') },
  { id: 'harbor', theme: brandTheme(readExampleBrand('./examples/harbor.design.md')), tree: readTree('harbor') },
  // Lever extremes — see the corpus note in the header. Built off aurora's input so only the one
  // lever moves; a fresh input would vary more than the thing under test.
  ...([0, 2] as const).map((radiusScale) => ({
    id: `aurora@radiusScale=${radiusScale}`,
    theme: brandTheme({ ...readExampleBrand('./examples/aurora.design.md'), radiusScale }),
    tree: null,
  })),
];

const failures: string[] = [];
const lines: string[] = [];

// ---- FLOOR 1: every array either anchor calls a ramp is classified here -----------------------
// Each anchor is floored SEPARATELY. A union is only as strong as its weakest half, and "the union is
// non-empty" would stay true while one half silently went to zero — the #986 shape, one level up.
const byName = discoverByName(src);
const byConsumption = discoverByConsumption(src);
for (const [label, found, what] of [
  ['BY NAME', byName, '`*STEPS*` array constants'],
  ['BY CONSUMPTION', byConsumption.map((d) => d.name), 'constants iterated into a `<prefix>.${…}` token path'],
] as const) {
  if (!found.length) {
    failures.push(
      `FLOOR: the ${label} discovery anchor found 0 ${what} in ${STUDIO_LABEL}. The union is only as ` +
        `strong as its weakest half, so a half at zero is a rotted detector reporting a clean zero — ` +
        `the one outcome this gate must never produce (#986). Fix the scan; do not lean on the other ` +
        `anchor to cover for it.`,
    );
  }
}
const discovered = [...new Set([...byName, ...byConsumption.map((d) => d.name)])].sort();
const viaConsumption = new Map(byConsumption.map((d) => [d.name, d.prefix]));
const classified = new Set(RAMPS.map((r) => r.name));
for (const name of discovered) {
  if (!classified.has(name)) {
    const how = viaConsumption.has(name)
      ? `it is iterated into a \`${viaConsumption.get(name)}.\${…}\` path`
      : 'its name matches the `*STEPS*` convention';
    failures.push(
      `UNCLASSIFIED — ${STUDIO_LABEL} declares \`${name}\` and ${how}, so this gate treats it as a ` +
        `candidate ramp and does not know about it. Add it to RAMPS with the ladder it resolves ` +
        `against, or as \`exempt\` with the reason it has none. A new ramp must be a decision, not an ` +
        `omission (#1179).`,
    );
  }
}
// ---- FLOOR 2: the reverse — a classification whose constant is gone or renamed -----------------
const found = new Set(discovered);
for (const r of RAMPS) {
  if (!found.has(r.name)) {
    failures.push(
      `STALE CLASSIFICATION — RAMPS names \`${r.name}\`, which ${STUDIO_LABEL} no longer declares. ` +
        `Either it was renamed (and this gate is now watching nothing) or it is gone (and this entry ` +
        `should be too). Both directions are checked so an entry cannot rot quietly.`,
    );
  }
}

// ---- THE ARMS ----------------------------------------------------------------------------------
for (const ramp of RAMPS) {
  if ('exempt' in ramp) {
    lines.push(`  ${ramp.name.padEnd(15)} exempt — ${ramp.exempt.slice(0, 64)}…`);
    continue;
  }
  const steps = parseSteps(src, ramp.name);
  if (steps === null) {
    failures.push(
      `FLOOR: \`${ramp.name}\` is declared in ${STUDIO_LABEL} but its array literal did not parse. The ` +
        `constant exists and this gate cannot read it, so it is watching nothing — fix the parse, never ` +
        `drop the entry.`,
    );
    continue;
  }
  if (!steps.length) {
    failures.push(`FLOOR: \`${ramp.name}\` parsed to an EMPTY list, so both arms compared nothing for it.`);
    continue;
  }

  let exercised = 0;
  const undeclared = new Set<string>();
  for (const b of corpus) {
    const ladder = ramp.ladder(b);
    if (ladder === null) continue; // this brand cannot answer for this ramp — counted below, not hidden
    exercised++;
    const rungs = new Set(ladder);

    // ARM A — an authored step the ladder does not have. This is #1177.
    for (const step of steps) {
      if (!rungs.has(step)) {
        failures.push(
          `UNRESOLVABLE STEP — ${STUDIO_LABEL}'s \`${ramp.name}\` lists '${step}', which is NOT a rung of ` +
            `${ramp.source} for brand '${b.id}'. ${ramp.label} will resolve it to nothing and render ` +
            `whatever its fallback says — a plausible number and a plausible picture, which is why ` +
            `nothing else catches this. Ladder: ${[...rungs].join(', ')}.`,
        );
      }
    }

    // ARM B — a rung the authored list omits without declaring it.
    for (const rung of ladder) {
      if (!steps.includes(rung) && !(ramp.omits && rung in ramp.omits)) undeclared.add(`${rung} (${b.id})`);
    }
  }

  if (!exercised) {
    failures.push(
      `FLOOR: \`${ramp.name}\` was compared against 0 brands — every corpus member returned \`null\` for ` +
        `${ramp.source}, so a clean result here is silence, not evidence.`,
    );
  }
  for (const u of [...undeclared].sort()) {
    failures.push(
      `UNDECLARED RUNG — ${ramp.source} has rung '${u.split(' ')[0]}' and ${STUDIO_LABEL}'s ` +
        `\`${ramp.name}\` omits it (seen on ${u.split('(')[1]?.replace(')', '')}). Not necessarily wrong — a ramp ` +
        `may show a curated subset — but it must be a decision: add it to the list, or to this ramp's ` +
        `\`omits\` with the reason. A rung added to the engine and forgotten in the studio never renders.`,
    );
  }
  const omitted = ramp.omits ? ` · ${Object.keys(ramp.omits).length} declared omission(s)` : '';
  lines.push(`  ${ramp.name.padEnd(15)} ${String(steps.length).padStart(2)} steps ⊆ ${ramp.source} — ${exercised} theme(s)${omitted}`);
}

console.log(`ramp steps — authored step lists vs the ladders they resolve against (${corpus.length} themes):`);
for (const l of lines) console.log(l);

if (failures.length) {
  console.error(`\n✗ ${failures.length} ramp-step failure(s):\n`);
  for (const f of failures) console.error(`  • ${f}\n`);
  console.error(
    `Each is an authored list and a generated ladder disagreeing. Fix whichever side is wrong — do not ` +
      `relax the comparison, and never derive the ladder from the list: the two are independent on ` +
      `purpose (#1179, docs/34).`,
  );
  process.exit(1);
}

console.log(
  `\n  ✓ clean — every authored ramp step resolves to a real rung of its ladder, and every rung the ` +
    `studio omits is declared. Note the limit: this proves the NAME exists in the ladder, not that the ` +
    `map the ramp reads carries a value for it.`,
);
