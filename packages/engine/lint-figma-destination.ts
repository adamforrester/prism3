/**
 * FIGMA DESTINATION GATE (#1138) — a leaf's claim about where it went in Figma must agree with the
 * Figma emission that put it there.
 *
 *   npx tsx packages/engine/lint-figma-destination.ts
 *
 * THE DEFECT THIS WOULD HAVE CAUGHT. Every pointer-tier leaf in the emitted DTCG carries a
 * self-description of its Figma destination:
 *
 *   "$extensions": { "prism3": { "figma": { "collection": "color", "modes": ["light", …] } } }
 *
 * `tree.ts` writes that `collection` as a LITERAL. #1089 renamed the Figma collection `surface` →
 * `color.surface` in `emit-figma-color.ts` and did not touch the literal, so **128 leaves per brand,
 * three brands, named a collection that did not exist in the emission** for as long as #1089 was in.
 * #1133 rewrote that leaf's `figma` block for unrelated reasons and corrected it in passing; nothing
 * would otherwise have noticed. This extension is the ONE place a DTCG consumer can learn which Figma
 * collection a token materialized into, so a wrong value there is wrong in the only direction anyone
 * would trust it.
 *
 * WHY EVERY EXISTING GATE PASSED IT, which is the part worth internalizing:
 *
 *   • `lint-overlay-completeness.ts` compares the `modes` extension to the emitted overlays — a
 *     different extension, and the DTCG side of the tree on both ends.
 *   • `tools/exporter-comparison/` reads `$collection` out of the Figma emission and never reads the
 *     DTCG extension at all.
 *   • `regen --check` diffs bytes of what the engine writes. The engine wrote the wrong value
 *     CONSISTENTLY, so it was stable, reproducible and green — the exact failure mode of a
 *     byte-comparison against a producer's own output.
 *
 * Nothing anywhere held an independent answer to *"which Figma collection does this token actually
 * land in?"* That was the gap, not any single assertion.
 *
 * ── INDEPENDENCE (docs/34) — READ BEFORE "SIMPLIFYING" ANYTHING BELOW ───────────────────────────
 *
 *   SUBJECT  — `$extensions.prism3.figma.{collection,mode,modes,variable}`, written by `tree.ts` as
 *              hand-authored literals (`tree.ts:487` and `tree.ts:941/947` today).
 *   ORACLE   — `$collection` / `$mode` / `variables[].name`, written by `emit-figma-*.ts` as its own
 *              hand-authored literals (`emit-figma-color.ts:294`, `emit-figma-dims.ts:420`, …).
 *
 * Two hand-authored sites in two different emitters, which is exactly the seam #1089 drifted across.
 *
 * The independence claim is NARROWER than "the emitter never reads the extension", and the narrow
 * form is the only one that is true: **`emit-figma*.ts` never reads the DESTINATION sub-keys —
 * `collection`, `mode`, `modes`, `variable` — off a leaf's own `$extensions.prism3.figma` block.** It
 * builds its collections from the theme. Two nearby reads make the broad claim false, and both are
 * worth knowing because each is one refactor away from making this gate circular:
 *
 *   · `emit-figma-styles.ts:191` reads `ext.figma?.sampledStops` where `ext` IS
 *     `leaf.$extensions.prism3`. So the emitter does read the leaf's own `figma` block — just never a
 *     destination key of it.
 *   · `emit-figma-font.ts:180-184` reads `r.figma.modes`, which is spelled identically to a
 *     destination read at the call site and is NOT one: `r` is `$extensions.prism3.responsive`, a
 *     different block that happens to carry a `figma.modes` of its own.
 *
 * If a destination key ever joins those, this gate silently becomes shape 1 (the oracle derived from
 * the subject) and must be redesigned, not patched. **Two re-checks, both measured, run them before
 * trusting a green run after a refactor in that lane:**
 *
 *   grep -nE '\.figma\??\.(collection|variable)\b' packages/engine/emit-figma*.ts   # must be 0
 *   grep -nE '\.figma\??\.modes?\b'                packages/engine/emit-figma*.ts   # every hit's
 *       receiver must be `responsive`, never a leaf's own block (today: 3 code lines in
 *       emit-figma-font.ts plus 2 prose mentions)
 *
 * An earlier version of this paragraph prescribed `grep -n "prism3" packages/engine/emit-figma*.ts`
 * and claimed it returned nothing. It returns **24**. A maintainer running it finds a screenful of
 * legitimate hits, concludes the rule is noise, and waves through the next `.figma` read — which is
 * precisely the collapse this paragraph exists to prevent. A re-check that does not return zero when
 * the property holds is worse than no re-check.
 *
 * `tailOf` is imported from `figma-names.ts`, and is deliberately an import of the SUBJECT's
 * NAMING CONVENTION rather than of the expected value — the same posture `lint-overlay-completeness`
 * takes with `overlayModes`. The brand root is the first name segment and is brand-specific
 * (`nbds/…`, `prism/…`), so no read path here may spell it; `figma-names.ts` strips it positionally
 * and this gate uses that one helper rather than re-deriving a rule about roots. WHICH collection,
 * WHICH modes and WHICH variable — the actual claims — are imported from nothing.
 *
 * ── THE ARMS ────────────────────────────────────────────────────────────────────────────────────
 *
 *   A  COLLECTION  — the claimed `collection` is not a `$collection` anywhere in the brand's Figma
 *                    emission.                                          ← the #1089 defect exactly
 *   B  MODE SET    — a leaf claiming `modes: [...]` claims the collection's WHOLE mode set, so the
 *                    array must equal it. A leaf that lists three of four modes tells a consumer one
 *                    appearance does not exist.
 *   C  MODE MEMBER — a leaf claiming `mode: "sm"` claims membership in that set. Distinct from B and
 *                    not reducible to it: `modes` is a set equality, `mode` is one element, and the
 *                    two spellings mean different things. Both are live today (`color` writes
 *                    `modes`, `layout` writes `mode`).
 *   D  VARIABLE    — the claimed `variable` must exist in that collection, compared on the rooted
 *                    name's tail. A leaf can name a real collection and a variable that is not in it.
 *
 * ── THE SET THIS WALKS, AND WHY IT HAS NO HOLES (docs/34 shape 15) ──────────────────────────────
 *
 * `emit-figma.ts` writes `out/figma/<brand>/` for THREE brands (nb, aurora, wendys). `emit-dtcg.ts`
 * writes a token tree for FOUR (harbor too). Walking only the brands with a committed emission would
 * leave harbor's 258 claiming leaves — a quarter of the subject — compared against nothing, and would
 * report that as a pass. That is shape 15 in its purest form, and it is not hypothetical here: the
 * `mode` claims on layout leaves are derived from the brand's own breakpoints, so a harbor-specific
 * breakpoint defect would escape a three-brand gate entirely.
 *
 * So harbor is not skipped. Its Figma emission is BUILT IN MEMORY from the same theme `visualize.ts`
 * uses (~200ms) and checked identically. `COMPUTED_ORACLE` below is the one hand-maintained list in
 * this file, and a brand in NEITHER `out/figma/` nor that list is a FAILURE, not a skip — so the list
 * going stale is loud rather than silent. The excluded-member count is therefore asserted at 0 rather
 * than printed.
 *
 * **What the computed path does and does not prove.** For nb/aurora/wendys the oracle is the
 * COMMITTED artifact, so a green run says the claim agrees with what shipped. For harbor the oracle is
 * computed, so it says the claim agrees with what the emitter WOULD write — there is nothing shipped
 * for harbor to disagree with. That is weaker, and it is the strongest statement available for a brand
 * that emits no Figma file.
 *
 * Every emitted DTCG tree is walked, not just the canonical one: `<brand>.tokens.json`,
 * `<brand>.base.tokens.json` and every `<brand>.<mode>.overlay.tokens.json` each ship this extension
 * to a consumer, and the projector copies it. A gate that read only the canonical tree would not
 * notice a projector that corrupted the block on the way out.
 *
 * ── THE FLOOR ───────────────────────────────────────────────────────────────────────────────────
 *
 * Each arm above is a loop over leaves that make a particular claim, so each one passes vacuously if
 * `tree.ts` stops writing that claim. The floor asserts every arm was EXERCISED — by name, in both
 * directions — rather than counting leaves, so a claim shape silently disappearing from the emission
 * fails here instead of going quiet. A leaf carrying `collection` and NEITHER mode spelling is a
 * member nothing compares, and is reported as such.
 *
 * ── ONE LIMIT, FOUND WHILE MUTATION-TESTING THIS FILE ──────────────────────────────────────────
 *
 * A collection's NAME is its emitted file stem, so renaming a collection writes new files and does
 * not delete the old ones. The oracle reads every `.json` in `out/figma/<brand>/`, so a leftover file
 * keeps declaring the retired name and the rename passes here. Measured: mutating
 * `emit-figma-color.ts` to `color.appearance` and re-running `emit-figma.ts` left `color.light.json`
 * beside `color.appearance.light.json`, and this gate stayed green on all three committed brands —
 * only harbor, whose oracle is built fresh in memory, failed. Deleting `out/figma/` first produced the
 * expected 4313 failures across all four.
 *
 * **The hole is real in both directions, and this gate is silent in both.** It reads the leftover and
 * passes. What goes red is a neighbour, naming an unrelated subject — measured, because the first
 * version of this paragraph named the wrong neighbour:
 *
 *   TRACKED (the extra file committed) — 43 PASS · 4 FAIL · 0 SKIP. `drift-coverage`
 *   ("artifact coverage changed — expected 108, got 109"), `lint-emission-version`,
 *   `exporter-comparison` and `engine-test`. **`regen --check` PASSES**, reporting
 *   `✓ in sync — 109 committed artifacts byte-match what the engine emits`, exit 0: its `removed`
 *   branch fires for an artifact the engine no longer emits, and an EXTRA file was never an expected
 *   artifact in the first place. An earlier version of this paragraph claimed that gate caught it.
 *
 *   UNTRACKED (left in the working tree) — 43 PASS · 2 FAIL · 2 SKIP. `engine-test` and
 *   `exporter-comparison` fail; `drift` and `drift-coverage` SKIP, correctly refusing to run against a
 *   dirty `out/`, which is exactly why the count check cannot be leaned on here.
 *
 * So the honest residual is not "nothing notices" — it is **this gate reads it and passes, and the
 * gates that go red name an unrelated subject**, so a maintainer chasing an `exporter-comparison`
 * failure has no reason to arrive at a stale collection file. That is docs/34 shape 18 (a borrowed
 * backstop), narrow, and named rather than implied. #1152 is the issue for the general form: a
 * leftover collection nothing owns.
 *
 * PURE-ADJACENT — reads the committed artifacts, like `regen --check`, plus one in-memory build.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tailOf } from './figma-names.ts';
import { brandTheme } from './theme.ts';
import { readExampleBrand } from './emit-dtcg.ts';
import { figmaArtifacts } from './emit-figma.ts';

const OUT = join(import.meta.dirname, 'out');
const FIGMA = join(OUT, 'figma');

type Node = Record<string, unknown>;

/** A brand's Figma emission, reduced to what a destination claim can be checked against. */
type Emission = Map<string, { modes: Set<string>; variables: Set<string> }>;

/**
 * Brands that emit no `out/figma/<brand>/` and whose emission is therefore built here.
 *
 * Hand-maintained, and the only hand-maintained list in this file. It is not a skip list: a brand
 * absent from BOTH `out/figma/` and this table fails below. Adding a brand to `emit-figma.ts`'s
 * shipped list means REMOVING it from here, and forgetting to is harmless — the committed emission
 * wins, and the computed one is never built.
 */
const COMPUTED_ORACLE: Record<string, () => unknown> = {
  harbor: () => figmaArtifacts(brandTheme(readExampleBrand('./examples/harbor.design.md'))).artifacts,
};

const collect = (files: { content: string }[]): Emission => {
  const em: Emission = new Map();
  for (const f of files) {
    const j = JSON.parse(f.content) as Node;
    const coll = j.$collection;
    if (typeof coll !== 'string') continue;
    if (!em.has(coll)) em.set(coll, { modes: new Set(), variables: new Set() });
    const e = em.get(coll)!;
    if (typeof j.$mode === 'string') e.modes.add(j.$mode);
    for (const v of (j.variables as Node[] | undefined) ?? []) {
      if (typeof v.name === 'string') e.variables.add(tailOf(v.name));
    }
  }
  return em;
};

/** ORACLE — the committed emission if the brand ships one, else the computed one. */
const emissionFor = (brand: string): { emission: Emission; source: 'committed' | 'computed' } | null => {
  const dir = join(FIGMA, brand);
  if (existsSync(dir)) {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ content: readFileSync(join(dir, f), 'utf8') }));
    return { emission: collect(files), source: 'committed' };
  }
  const build = COMPUTED_ORACLE[brand];
  if (!build) return null;
  return { emission: collect(build() as { content: string }[]), source: 'computed' };
};

/** SUBJECT — every leaf in an emitted DTCG tree that claims a Figma destination. */
type Claim = { file: string; path: string; figma: Node };

const claimsIn = (file: string): Claim[] => {
  const out: Claim[] = [];
  const walk = (n: unknown, path: string): void => {
    if (!n || typeof n !== 'object' || Array.isArray(n)) return;
    const figma = (((n as Node).$extensions as Node | undefined)?.prism3 as Node | undefined)?.figma as Node | undefined;
    if (figma && figma.collection !== undefined) {
      out.push({ file, path, figma });
      return;
    }
    for (const [k, v] of Object.entries(n as Node)) if (!k.startsWith('$')) walk(v, path ? `${path}.${k}` : k);
  };
  walk(JSON.parse(readFileSync(join(OUT, file), 'utf8')), '');
  return out;
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
// Arm exercise counters — the floor. Named, not counted: see the header.
const exercised = { A: 0, B: 0, C: 0, D: 0 };
let claimsChecked = 0;
let unrelated = 0;

for (const brand of brands) {
  const oracle = emissionFor(brand);
  if (!oracle) {
    failures.push(
      `${brand}: UNCHECKABLE — no out/figma/${brand}/ and no COMPUTED_ORACLE entry. This brand's ` +
      `destination claims are compared against nothing. Either emit-figma.ts should ship it, or it ` +
      `needs a COMPUTED_ORACLE entry here. Skipping it silently is docs/34 shape 15.`,
    );
    continue;
  }
  const { emission, source } = oracle;

  const trees = readdirSync(OUT).filter(
    (f) => f === `${brand}.tokens.json` || f === `${brand}.base.tokens.json` || /\.overlay\.tokens\.json$/.test(f) && f.startsWith(`${brand}.`),
  ).sort();

  let n = 0;
  for (const file of trees) {
    for (const { path, figma } of claimsIn(file)) {
      n++;
      claimsChecked++;
      const claimed = figma.collection;
      if (typeof claimed !== 'string') {
        failures.push(`${brand}/${file}: '${path}' has a non-string figma.collection (${JSON.stringify(claimed)}).`);
        continue;
      }

      // ARM A — the #1089 defect.
      exercised.A++;
      const e = emission.get(claimed);
      if (!e) {
        failures.push(
          `${brand}/${file}: UNKNOWN COLLECTION — '${path}' claims it materializes into Figma ` +
          `collection '${claimed}', which the ${source} Figma emission does not declare. It declares: ` +
          `${[...emission.keys()].sort().join(', ')}. This is #1089's shape: tree.ts's literal and ` +
          `emit-figma's literal drifted apart, and only this gate compares them.`,
        );
        continue;
      }

      const hasModes = Array.isArray(figma.modes);
      const hasMode = typeof figma.mode === 'string';

      // ARM B — `modes` claims the WHOLE set, so set equality.
      if (hasModes) {
        exercised.B++;
        const want = [...(figma.modes as unknown[])].map(String).sort().join(',');
        const got = [...e.modes].sort().join(',');
        if (want !== got) {
          failures.push(
            `${brand}/${file}: MODE SET — '${path}' claims collection '${claimed}' has modes ` +
            `[${want}]; the ${source} emission declares [${got}].`,
          );
        }
      }

      // ARM C — `mode` claims membership in that set.
      if (hasMode) {
        exercised.C++;
        if (!e.modes.has(figma.mode as string)) {
          failures.push(
            `${brand}/${file}: MODE — '${path}' claims Figma mode '${String(figma.mode)}' of collection ` +
            `'${claimed}'; the ${source} emission declares modes [${[...e.modes].sort().join(',')}].`,
          );
        }
      }

      // A claim nothing compares. Counted and asserted at 0 rather than left implicit.
      if (!hasModes && !hasMode) unrelated++;

      // ARM D — the named variable must exist in that collection.
      if (typeof figma.variable === 'string') {
        exercised.D++;
        const want = figma.variable.split('.').join('/');
        if (!e.variables.has(want)) {
          failures.push(
            `${brand}/${file}: VARIABLE — '${path}' claims Figma variable '${String(figma.variable)}' ` +
            `(tail '${want}') in collection '${claimed}', which the ${source} emission does not carry.`,
          );
        }
      }
    }
  }
  perBrand.push(`  ${brand.padEnd(8)} ${String(n).padStart(4)} claims  ${emission.size} collections (${source})`);
}

// ── THE FLOOR ──────────────────────────────────────────────────────────────────────────────────
// Each arm is a loop over leaves making one kind of claim, so each passes vacuously if that claim
// stops being written. Asserted by NAME, not as a count of leaves.
const ARMS: { key: keyof typeof exercised; label: string }[] = [
  { key: 'A', label: 'A COLLECTION — a leaf naming a Figma collection' },
  { key: 'B', label: "B MODE SET — a leaf carrying `modes: [...]` (the whole-set claim; `color` writes it)" },
  { key: 'C', label: 'C MODE MEMBER — a leaf carrying `mode: "…"` (the membership claim; `layout` writes it)' },
  { key: 'D', label: 'D VARIABLE — a leaf naming a Figma variable' },
];
for (const { key, label } of ARMS) {
  if (exercised[key] === 0) {
    failures.push(
      `FLOOR: arm ${label} walked 0 leaves, so it passed without comparing anything. Either the ` +
      `emission stopped writing that claim — which is itself the finding — or this gate's traversal ` +
      `no longer reaches it. A vacuous arm is a deleted arm (docs/34).`,
    );
  }
}
if (unrelated) {
  failures.push(
    `FLOOR: ${unrelated} leaf/leaves carry figma.collection with NEITHER \`mode\` nor \`modes\`, so ` +
    `arms B and C compare nothing for them. Give the claim a mode spelling, or state here why this ` +
    `shape needs none — an unrelated member is docs/34 shape 15.`,
  );
}

console.log('figma destination — DTCG claim vs the Figma emission that would receive it:');
for (const line of perBrand) console.log(line);

if (failures.length) {
  console.error(`\n✗ ${failures.length} figma destination failure(s):\n`);
  for (const f of failures) console.error(`  • ${f}`);
  console.error(
    `\nEach is a disagreement between a leaf's self-described Figma destination (tree.ts's literal) ` +
    `and the collection/mode/variable the Figma emitter actually writes (emit-figma-*.ts's literal). ` +
    `Fix the side that is wrong — do not relax the comparison; the two literals are independent on ` +
    `purpose (#1138, docs/34).`,
  );
  process.exit(1);
}

console.log(
  `\n  ✓ clean — ${claimsChecked} destination claims across ${brands.length} brands agree with the ` +
  `Figma emission on collection, mode set, mode membership and variable name; all 4 arms exercised, ` +
  `0 claims unrelated to an emission.`,
);
