## (2026-11-19) — READMEs, CONTRIBUTING.md and the CLAUDE.md files stop stating what the code no longer does (#4130, #4136, #4139, #4143, #4177, #4203)

A fix lane from the 2026-11-19 hygiene audit (#4104). Six findings of prose that later merges made untrue. Each was checked on main before the edit. Where the drift was a number something else already owns, the prose now points at the owner instead of restating it.

### What changed

- **Engine README (#4130).** The contract size reads "the count: `token-contract.ts --check`" (it said 485; the baseline holds 623). `EXPECTED_ARTIFACTS` is `ARTIFACT_FLOOR`. The unit-test count gives way to the `MIN_ASSERTIONS` floor, and the per-brand alias and contract numbers to "the counts: `emit-dtcg.ts`". prism3 joins the emit-dtcg brand lists, and the examples and outputs lists gain `prism3.design.md`, the reference brand's redesign seed and the base and overlay projections. #811 (`foreground.danger.default`, same file) is its own issue and is left alone.
- **Plugin README (#4136, #4139, #4177).** Update file's collection list named `core-palette` and `core-dimension`, which do not exist, and left out five. It now points at the generated `docs/public/reference/figma-conventions.json`. `npm test` is "every suite in `suites.json`". `npm install` is `npm ci`. The read-back bridge is described as what it is now: `seed-info` on `ui-ready`, with knob restore from the stored brand input (`restoreToUi`, #131). The "Read current file" button and its `read-theme` message are gone, so "until #110 hands it up" described neither.
- **Root README (#4139).** `npm ci`.
- **CONTRIBUTING §3 (#4143, #4203).** TokenPress: the ported 263 held file by file to the vitest baseline, plus those added since (the suite runs 313). `lint-locale-order` covers tests and tools (#3701). Studio's `npm run test` is the `suites.json` run (#3904).
- **tools/CLAUDE.md and CLAUDE.md (#4203).** The restore auto-stash hook is live (#4064). CLAUDE.md's checkout warning keeps the hazard for untracked files and says tracked work is stashed first. This is a CLAUDE.md edit, so the owner reviews it before merge (CONTRIBUTING §4).
- **Exporter gate header (#4177).** The #731 lifecycle is in the past tense, kept as the worked example.

### The arms

One block in `test.ts`, at the end of the section before #3472. Each reads its oracle from code: the contract baseline, `verify.ts`'s declarations, regen's emit-dtcg label, the `$collection` of each file in `out/figma/prism3/`, each workspace's `test` script, TokenPress's `EXPECTED` and `ADDED` censuses, `main.ts`'s `seed-info` post, `.claude/settings.json`'s hook entry and `lint-locale-order.ts`'s scope header. Against main's prose, 14 fail by name. Mutating one fix per finding back fails its arm by name.

### A trap for whoever re-runs it

The Update file arm reads only the clause from "materialize the whole generated system" to "into the current file". The paragraph around it quotes the manifest's `reasoning` field in a code span, and a whole-paragraph read counted that as a collection.
