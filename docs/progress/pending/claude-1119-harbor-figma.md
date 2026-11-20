## (2026-11-18) — harbor has a committed Figma emission (#1119)

**What.** The studio and plugin pickers offer the example brands (`schema/example-brands.json`: prism3, aurora,
harbor), but `emit-figma.ts` wrote `out/figma/` for nb, prism3, aurora and wendys only. So every gate that walks that
directory ran without harbor, and nothing could check a harbor build. Owner decision (2026-11-18, A): harbor gains the
emission. `emit-figma.ts` now writes `out/figma/harbor/`, 29 files, compiled the same way `emit-dtcg.ts` and the
pickers compile harbor (`brandTheme(parseDesignMd(…))`). The committed set grows from 230 to 259 artifacts.

**Each Figma-side check, now covering harbor.**
- Directory walkers pick it up with no edit: `lint-absolute-inset`, `lint-paint`, `lint-stranded-collections`,
  `lint-description-claims`, `lint-materialization-renames`, `lint-lever-sweep`, and the engine suite's `out/figma`
  sweeps.
- Hand lists gain it by name: `MUST_COVER` in `lint-cut-binding`, `lint-lineheight-bake` and
  `lint-size-override-coherence`; `SOURCES` in `test-readback-parity.ts`, where harbor's Apply Theme reads back 713
  variables and 72 styles equal to the emission; `test-prune.ts`'s committed-description sweep; and in `test.ts`,
  `BRAND_ROOTS`, the color-emission brand list, the body/xs text-style list, the materialise budget (harbor moves from
  `brief` to `committed`) and the #2428 code-input contrast set.
- Harbor clears every code-input contrast floor. That arm pinned its brands by name, so it now reads 5 brands and 20
  cells.
- Floors are raised so that losing harbor fails: the exporter comparison's `MIN_BRANDS` goes 3 → 5 (harbor: 0
  disagreements, 0 unexplained paths); `lint-figma-descriptions` needs ≥5 committed brands; `ARTIFACT_FLOOR` goes
  226 → 259.

**The in-memory paths go quiet rather than away.** `lint-figma-destination`'s `COMPUTED_ORACLE` and
`lint-figma-descriptions`' built-brand pass existed only because harbor had a token tree and no emission. Both
mechanisms stay for the next brand in that position. The descriptions gate's "≥1 built brand" floor would have failed
on this fix, so it became "every example brand is read, committed or built", with the example list as the independent
side.

**`ci.yml` is untouched.** The decision says to move EXPECTED_ARTIFACTS in `verify.ts` and `ci.yml` together. Since
#3698 R3 that number is `ARTIFACT_FLOOR`, authored only in `verify.ts`, and `ci.yml` reads it (`verify.ts
--artifact-floor`). Raising it in `verify.ts` moves both.

**Measured.** A new #1119 arm in `test.ts` checks that every picker brand's `out/figma/<id>/` holds the reference
brand's whole file set. Main's emission (no `out/figma/harbor/`) fails "#1119 harbor: … the directory is absent".
Mutation, deleting `out/figma/harbor/motion.json`: fails "#1119 harbor: … missing motion.json", along with #2412's
TIMING/EASING representation and the materialise budget. Mutation, deleting the directory: the exporter comparison
fails "SCOPE: found 4 brand(s) … expected at least 5", and `lint-cut-binding` fails "SCOPE NOT REPRESENTED: 'harbor'".
