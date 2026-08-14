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
- [ ] `npx tsx packages/engine/lint-schema-classification.ts` → clean — every file in `packages/engine/schema/` has a **decided** place in the two prose gates (#807): in `SCHEMA_ARTIFACTS`, hand-named in **both** `lint-us-english.ts` and `lint-voice.ts`, or `EXEMPT` with a stated reason. Adding a schema file fails here until a human classifies it. EXPECTED comes from `git ls-files` — the **directory** — never from the lists being checked: a union-of-the-lists version was measured printing `✓ clean` at exit 0 on the very file the directory-derived one fails on. Both directions checked, so a stale entry cannot rot quietly. Stated limit: it proves a human wrote an answer down, **not** that the answer is right
- [ ] `npx tsx packages/engine/lint-paint.ts` → clean — the component tier's colour bindings (#758), in two arms: a provenance RULE at zero (an axis-value-led key points at a ref carrying that value, 90/90, with four exceptions named per key and checked both ways) and a paint CENSUS pinned to `schema/paint-census.json`, which is authored and **not** a regen artifact. Taken over the full declared grid, never over `figmaAnatomySet` — `icon` paints along `tone`, an axis the Figma set does not enumerate, so a set-based census pins it at 0. A deliberate paint change fails the census: read the diff, then `--accept`
- [ ] `npx tsx packages/engine/lint-absolute-inset.ts` → clean — an absolutely-positioned part carrying an `inset` leaves a **visible gap** between itself and its parent (#801, the first instance of #802). The gap, **not the coordinate** — those are different numbers and the distinction is the finding. All three causes #801 proposed were wrong: the lookup **resolves** (0 misses over the real 648-member set), its miss path is reachable and **counted** (108 misses with the variable removed), and `focus.ring.offset` is **2** in every brand, so "nothing read the number" was measured and false. The real cause, found by comparing against the **Prism2** reference (which sites the identical ring at `-4`): `strokeAlign` is `INSIDE` at both executors — correct for a border, since an outside stroke grows the auto-layout footprint — so the ring's own 2px stroke is drawn back inward across the whole 2px gap. Visible separation = `offset − strokeWidth` = **0**, out of a component that is otherwise perfect (right positioning, constraints, paints, 0 misses). **Nothing anywhere knew the ring carried a stroke.** EXPECTED walks the **def** (`inset` + `strokeInset` → `tokens` → refs → variable names, restating the convention rather than calling `varOf`) and asks the **nested** def whether it draws inward, so a host cannot answer that about itself; ACTUAL is the plan's `absoluteInset`/`absoluteStrokeInset` and the FLOATs they resolve to in each brand's **committed** export. `C` computes `gap = offset − stroke` and re-derives it from the sited coordinate, so a compensation applied backwards fails even though `offset > 0` holds. `MUST_CLEAR_STROKE` asserts the compensation was **exercised**, because without it the arithmetic degrades to `gap = offset` — #801 exactly — and every other check still passes. Both directions, so it cannot pass over an empty set. A legitimately-zero gap (`ring.offset-field` is 0 by design) is admitted in `ZERO_OK` with a reason, authored for the same argument as the manifest. Stated limit: no browser and no Figma file, so a host that accepts a write and discards it is caught by the executors' read-backs, not here. **And the lesson — `docs/34` shape 16:** this gate's first version was fully independent, falsifiable, and measured the wrong quantity, printing a pass on the shipped ring while `test.ts`'s parity gate confirmed both executors agreed on one wrong formula
- [ ] `npx tsx packages/engine/lint-advisory-expiry.ts` → clean — _N_ claim(s), 0 expired. A stated advisory window, once it closes, fails the build. The **one gate here whose oracle is the clock**: no API, no issue state, no network, and the repo cannot edit the calendar, so its independence is free rather than argued. It exists because the same dated promise is written in **six** places — `ci.yml` twice, `verify.ts`, `test-smoke.mjs` twice, and `CLAUDE.md` / `CONTRIBUTING.md` / this template — and all six turn into false statements about CI on the same morning, read by someone who did not write them. **Gating, not advisory**, deliberately: a gate that watches for expired advisories and is itself advisory would be its own joke. The wider "forward claim" class is a `tools/` harness instead of a gate because its recall is unknown; this sub-class is where that objection dissolves, because the pattern is literal and the scan is anchored on the **date** rather than the phrase — which makes the denominator every date in the repo, finite and printable, so recall is **measured** (904 dates across 548 tracked text files, 13 claims, complement read by hand) rather than estimated. `docs/00-progress.md` is exempt **by genre**, the same exemption `lint-layout-claims.ts` grants it and a property of that document rather than of the pattern: its dated entries describe the repo as it was, so a closed window recorded there is correct prose forever. Verified in **both** directions with an injected clock (`PRISM3_TODAY=…`), never by editing the dates in the files — that would test a different program. Stated limit: a claim phrased with neither `advis…` nor `continue-on-error` is not seen, so the run prints the whole census and a count that drops without a deletion in the diff is the tell
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
