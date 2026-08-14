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
     checklist a diligent contributor can follow exactly and still ship broken: two PRs
     (#601, #602) each shipped a gate broken because they stopped their Gates table at an
     older, shorter version of this template. -->

- [ ] `npm run verify` → _N/N PASS · 0 FAIL · 0 SKIP_ (paste the run's own summary line; it prints the
      total, so no count is authored here to go stale) — the runner (`verify.ts`, #789). Paste its
      summary line and you have satisfied every box below, which is the point: they are the same list,
      and hand-transcribing it is where #601/#602 went wrong. **A SKIP is not a pass** — it means a
      gate did not run (a dirty `out/`, no Chromium), so clear the stated reason and rerun rather than
      reporting around it. Run the boxes below individually when one is red and you need its detail
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
- [ ] `npx tsx packages/engine/lint-shape-index.ts` → clean — a published `docs/34` shape number never means something else (#786). Two arms: the BINDING (EXPECTED = authored `schema/shape-index.json`, ACTUAL = the doc's headings — reading the current doc to decide what to expect would be shape 1 in the file that defines shape 1) and citation EXISTENCE (the run prints the live count; the citing files are asserted represented so a dead regex fails instead of reporting 0). Adding a shape fails until you run `--accept`, which **appends only** and refuses a retitle. Stated limit: it proves a cited section exists, **not** that the citation names the right shape. Protects a hazard with **zero incidents** — measured across the doc's whole history — which is why it is the cheap version and not a stable-slug migration
- [ ] `npx tsx packages/engine/lint-paint.ts` → clean — the component tier's colour bindings (#758), in two arms: a provenance RULE at zero (an axis-value-led key points at a ref carrying that value, 90/90, with four exceptions named per key and checked both ways) and a paint CENSUS pinned to `schema/paint-census.json`, which is authored and **not** a regen artifact. Taken over the full declared grid, never over `figmaAnatomySet` — `icon` paints along `tone`, an axis the Figma set does not enumerate, so a set-based census pins it at 0. A deliberate paint change fails the census: read the diff, then `--accept`
- [ ] `npx tsx packages/engine/typecheck-components.ts` → clean — `tsc --noEmit` over `packages/engine/tsconfig.json` (a check, not a build) AND every tracked component def represented in what tsc actually read (#657); a green typecheck over a subset of the defs is the defect itself
- [ ] `npm run -w @prism3/studio typecheck` → clean
- [ ] `npm run -w @prism3/studio test` → clean — the provenance model (#722); `typecheck` does not cover it (`tsconfig.json` includes `src` only, so the test file is never compiled)
- [ ] `npm run -w @prism3/studio build` → succeeds
- [ ] `npm run -w @prism3/studio test:smoke` → _N/N passed_ — the headless DOM/interaction suite (#767, deciding #333). Run it **after** `build`: it drives the built `dist/main.js` in Chromium over every page × mode × corpus brand, plus the mode switch, an override picker and an export. A **separate** script from `test` above on purpose — those are pure modules with no browser, and a flake here must not be able to take them down. **Advisory in CI until 2026-08-20, then gating (#775).** Needs `npx playwright install chromium` once; `playwright` is an `apps/studio` devDependency and the engine core stays dependency-free
- [ ] `npm run -w @prism3/studio check:ignore` → clean
- [ ] `npm run -w @prism3/studio lint:contrast` → clean
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
