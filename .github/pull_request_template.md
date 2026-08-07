<!--
  One concern per PR. Keep the change surgical; edit only what the task needs.
  Fill the sections below — the Gates block is the load-bearing part: this repo's
  correctness contract is "regenerate out/*, then prove the gates green."
-->

## Summary

<!-- One or two sentences: what this changes and why. -->

## The change

<!-- What was wrong / missing, and the approach. Note any decision worth recording
     (it likely also belongs in Prism3/docs/00-progress.md's decisions log). -->

## Gates

<!-- Run these and report the results. Not a formality — a PR isn't done until they're
     green. CI (.github/workflows/ci.yml) runs every one of these on every PR regardless
     of which files changed — there is no "skip web/plugin, I only touched the engine"
     exemption, so don't skip any locally either. A checklist shorter than CI's is a
     checklist a diligent contributor can follow exactly and still ship broken — see the
     lint:classes line below, which is the specific gate two PRs (#601, #602) missed by
     stopping their Gates table at an older, shorter version of this template. -->

- [ ] `npx tsx Prism3/engine/test.ts` → _N/N passed_
- [ ] `npx tsx Prism3/engine/mcp-test.ts` → _N/N passed_
- [ ] `npx tsx Prism3/engine/nb-regression.ts` → exits 0 (ΔE00 _…_)
- [ ] `npx tsx Prism3/engine/emit-dtcg.ts` → every alias resolves + every mode contrast contract passes (_…/…_)
- [ ] `npx tsx Prism3/engine/regen.ts --check` → _NN_ committed artifacts byte-match
- [ ] `npx tsx Prism3/engine/token-contract.ts --check` → unchanged / bumped to _…_
- [ ] `npx tsx Prism3/engine/lint-skills.ts` → clean
- [ ] `npx tsx Prism3/engine/lint-doc-gates.ts` → clean
- [ ] `npm run -w @prism3/web typecheck` → clean
- [ ] `npm run -w @prism3/web build` → succeeds
- [ ] `npm run -w @prism3/web check:ignore` → clean
- [ ] `npm run -w @prism3/web lint:contrast` → clean
- [ ] `npm run -w @prism3/web lint:classes` → clean — a NEW class-name combination fails here until it's added to `ALLOWED` in `web/lint-classes.mjs`
- [ ] `npm run -w @prism3/plugin typecheck` → clean
- [ ] `npm run -w @prism3/plugin test` → _N/N passed_
- [ ] `npm run -w @prism3/plugin build` → succeeds, 0 `node:` builtins in `dist/main.js`
- [ ] `npm run -w @prism3/tokens check:consumability` → clean — a stock Style Dictionary over the emitted DTCG; a *characterization* gate, so green means "matches the pinned #609 baseline", not "the output is conforming"
- [ ] `npx tsx Prism3/engine/lint-us-english.ts` → clean — run AFTER the web build; its scope includes the built `web/dist/*.js` bundle

## out/* + fixtures

<!-- State the output impact explicitly:
     - byte-identical (validation-only / metadata change), OR
     - regenerated — and what changed and why (which brands/axes/files).
     If a fixture's byte-repro target moved, say so and why. -->

## Notes

<!-- Cross-lane coordination, follow-ups parked, issues opened/closed, screenshots. -->
