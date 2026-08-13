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
- [ ] `npx tsx packages/engine/lint-overlay-completeness.ts` → clean — each mode's overlay carries exactly the leaves that vary in it, in both directions (#708); EXPECTED comes from the projector's input and ACTUAL from its output, so never re-derive it by running `buildOverlay` or by reading an overlay
- [ ] `npx tsx packages/engine/typecheck-components.ts` → clean — `tsc --noEmit` over `packages/engine/tsconfig.json` (a check, not a build) AND every tracked component def represented in what tsc actually read (#657); a green typecheck over a subset of the defs is the defect itself
- [ ] `npm run -w @prism3/studio typecheck` → clean
- [ ] `npm run -w @prism3/studio test` → clean — the provenance model (#722); `typecheck` does not cover it (`tsconfig.json` includes `src` only, so the test file is never compiled)
- [ ] `npm run -w @prism3/studio build` → succeeds
- [ ] `npm run -w @prism3/studio test:smoke` → _N/N passed_ — the headless DOM/interaction suite (#767, deciding #333). Run it **after** `build`: it drives the built `dist/main.js` in Chromium over every page × mode × corpus brand, plus the mode switch, an override picker and an export. A **separate** script from `test` above on purpose — those are pure modules with no browser, and a flake here must not be able to take them down. **Advisory in CI until 2026-08-20, then gating (#775).** Needs `npx playwright install chromium` once; `playwright` is an `apps/studio` devDependency and the engine core stays dependency-free
- [ ] `npm run -w @prism3/studio check:ignore` → clean
- [ ] `npm run -w @prism3/studio lint:contrast` → clean
- [ ] `npm run -w @prism3/studio lint:classes` → clean — a NEW class-name combination fails here until it's added to `ALLOWED` in `apps/studio/lint-classes.mjs`
- [ ] `npm run -w @prism3/plugin typecheck` → clean
- [ ] `npm run -w @prism3/plugin test` → _N/N passed_
- [ ] `npm run -w @prism3/plugin build` → succeeds, 0 `node:` builtins in `dist/main.js`
- [ ] `npm run -w @prism3/tokenpress test` → _N/N passed_ — the ported suite on tsx; the runner asserts a **per-file** census against the pre-port vitest baseline, so a vanished test fails too
- [ ] `npm run -w @prism3/tokenpress build` → succeeds — `build.mjs` asserts four properties of what it *wrote* (`__PLUGIN_VERSION__` substituted, iife wrapper, 0 `node:` builtins, jszip's `setImmediate` shim); `dist/` is gitignored, so nothing else can catch a regression there. There is deliberately **no** `typecheck` — see `CONTRIBUTING.md` §3
- [ ] `npx tsx tools/exporter-comparison/gate.ts` → clean — the two DTCG exporters agree on all four assertable arms across every brand with a Figma emission (#697): 0 `$type` disagreements on shared paths, 0 tokenpress-only paths, 0 float32 leaks, 0 opacity-scale disagreements (#709), and every prism3-only path accounted for by name in `KNOWN_UNREACHABLE`. Run it after the TokenPress build — it executes TokenPress's real `TokenExporter` in memory. Its sibling `compare.ts` is a **measurement** and always exits 0; categories 3–5 are reporting-only on purpose
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
