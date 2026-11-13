## (2026-11-12) — The three component exports leave git; the artifact count is one floor (#3698 R3, part 1)

**What.** Owner decision R3 on #3698 (F6), its first half.

- **`component-defs.json`, `component-defs.specs.json` and `specs.json` are no longer committed.** That is
  5.1 MB and about 178k lines out of review, and the files whose consecutive PRs overlapped most.
  - `regen` still writes them, since `emit-component-docs.ts` writes them as before. They are in `.gitignore`.
  - A new regen list, `UNCOMMITTED_OUT`, keeps them out of the comparison, so a local copy never changes the count.
    `--check` fails by name when regen stops writing one (`unwritten`) or when git tracks one (`uncommitted`).
- **Every reader generates them first.** `renderUncommitted()` in regen.ts runs `emit-component-docs.ts
  --uncommitted --out <tmp>`, which writes only the three files to a temp dir and nothing under `out/`.
  - `lint-component-docs` (arm G and the spec ids), `lint-us-english` and `lint-voice` read that render. The
    prose gates still scan the files as shipped prose, and a failed render counts as blindness, not as clean.
  - `packages/tokens/check-specs.mjs` runs the same command as a process, so it still imports nothing from the
    engine.
  - `lint-payload-manifest` classifies the three by name, since they are still payload.
  - The MCP already built its export live.
  - `release-notes.ts` reads `components.ai.json`, which stays committed.
- **The count lives in one place, as a floor.** `EXPECTED_ARTIFACTS` (exact, in `verify.ts` and again in `ci.yml`)
  is now `ARTIFACT_FLOOR` in `verify.ts`, and `ci.yml` reads it with `verify.ts --artifact-floor`.
  - The count itself is regen's own. Comparing it with itself could not fail, so the typed floor is the
    independent side (docs/34). It catches the set going short, and growth needs no edit, so two PRs that each
    add an artifact no longer collide.
  - It cannot see a shrink and a growth of the same size in one PR.
  - It sits at 226, the new count (229 less the three files).
- **`.gitattributes`** marks `packages/engine/out/**` as `linguist-generated`.
- **Docs.** CLAUDE.md, `review-pr.md`, the freshness hook's header, CONTRIBUTING §2, the engine README and the
  build-component skill no longer describe two numbers that move together.

**Kept committed, as decided:** the brand token trees, `components.ai.json`, the `--accept` baselines, `out/figma/**`.
