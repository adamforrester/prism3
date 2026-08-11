<!--
  One concern per PR. Keep the change surgical; edit only what the task needs.
  Fill the sections below — the Gates block is the load-bearing part: this repo's
  correctness contract is "regenerate out/*, then prove the gates green."
-->

## Summary

<!-- One or two sentences: what this changes and why. -->

## The change

<!-- What was wrong / missing, and the approach. Note any decision worth recording
     (it likely also belongs in docs/00-progress.md's decisions log). -->

## Gates

<!-- Run these and report the results. Not a formality — a PR isn't done until they're
     green. CI (.github/workflows/ci.yml) runs every one of these on every PR regardless
     of which files changed — there is no "skip web/plugin, I only touched the engine"
     exemption, so don't skip any locally either. A checklist shorter than CI's is a
     checklist a diligent contributor can follow exactly and still ship broken — see the
     lint:classes line below, which is the specific gate two PRs (#601, #602) missed by
     stopping their Gates table at an older, shorter version of this template. -->

- [ ] `npx tsx packages/engine/test.ts` → _N/N passed_
- [ ] `npx tsx packages/engine/mcp-test.ts` → _N/N passed_
- [ ] `npx tsx packages/engine/nb-regression.ts` → exits 0 (ΔE00 _…_)
- [ ] `npx tsx packages/engine/emit-dtcg.ts` → every alias resolves + every mode contrast contract passes (_…/…_)
- [ ] `npx tsx packages/engine/regen.ts --check` → _NN_ committed artifacts byte-match
- [ ] `npx tsx packages/engine/token-contract.ts --check` → unchanged / bumped to _…_
- [ ] `npx tsx packages/engine/lint-skills.ts` → clean
- [ ] `npx tsx packages/engine/lint-doc-gates.ts` → clean
- [ ] `npx tsx packages/engine/lint-layout-claims.ts` → clean — every claimed path resolves, every tracked layer is named in the layout tables (#670)
- [ ] `npx tsx packages/engine/lint-payload-manifest.ts` → clean — every emitted artifact classified payload or ours (#674); the manifest is AUTHORED, so a new emitted artifact fails here until a human classifies it
- [ ] `npx tsx packages/engine/typecheck-components.ts` → clean — `tsc --noEmit` over `packages/engine/tsconfig.json` (a check, not a build) AND every tracked component def represented in what tsc actually read (#657); a green typecheck over a subset of the defs is the defect itself
- [ ] `npm run -w @prism3/studio typecheck` → clean
- [ ] `npm run -w @prism3/studio build` → succeeds
- [ ] `npm run -w @prism3/studio check:ignore` → clean
- [ ] `npm run -w @prism3/studio lint:contrast` → clean
- [ ] `npm run -w @prism3/studio lint:classes` → clean — a NEW class-name combination fails here until it's added to `ALLOWED` in `apps/studio/lint-classes.mjs`
- [ ] `npm run -w @prism3/plugin typecheck` → clean
- [ ] `npm run -w @prism3/plugin test` → _N/N passed_
- [ ] `npm run -w @prism3/plugin build` → succeeds, 0 `node:` builtins in `dist/main.js`
- [ ] `npm run -w @prism3/tokenpress test` → _N/N passed_ — the ported suite on tsx; the runner asserts a **per-file** census against the pre-port vitest baseline, so a vanished test fails too
- [ ] `npm run -w @prism3/tokenpress build` → succeeds — `build.mjs` asserts four properties of what it *wrote* (`__PLUGIN_VERSION__` substituted, iife wrapper, 0 `node:` builtins, jszip's `setImmediate` shim); `dist/` is gitignored, so nothing else can catch a regression there. There is deliberately **no** `typecheck` — see `CONTRIBUTING.md` §3
- [ ] `npm run -w @prism3/tokens check:consumability` → clean — a stock Style Dictionary over the emitted DTCG; runs over EVERY emitted brand (#635); a *characterization* gate, so green means "every brand's mode collapse still matches its pinned baseline (permanent by DTCG design, #609), the conforming projection carries **zero** non-DTCG `$type`s (a RULE, asserted — #642), the consumer-side gap still matches its pin **and** each base+overlay projection still reads back"
- [ ] `npx tsx packages/engine/lint-us-english.ts` → clean — run AFTER the web build; its scope includes the built `apps/studio/dist/*.js` bundle
- [ ] `npx tsx packages/engine/lint-voice.ts` → clean — voice-standard.md §2 banned-phrase list (#617); sibling to lint-us-english.ts, same reason it runs here

## out/* + fixtures

<!-- State the output impact explicitly:
     - byte-identical (validation-only / metadata change), OR
     - regenerated — and what changed and why (which brands/axes/files).
     If a fixture's byte-repro target moved, say so and why. -->

## Notes

<!-- Cross-lane coordination, follow-ups parked, issues opened/closed, screenshots. -->
