# Contributing to prism3

Most work on this repo is done by an agent with a person steering it. This guide is
written for that: what to read first, what the gates are, how to brief an agent, and
where each kind of durable state lives.

Read [`CLAUDE.md`](CLAUDE.md) too — it's the agent-facing conventions file, and its
working principles apply to humans as much as to agents.

---

## 1. Orient (five minutes)

| Read | For |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Repo conventions + the four working principles. Non-optional — agents load this automatically, so you should know what it told them. |
| [`docs/00-progress.md`](docs/00-progress.md) | The durable state log — status, decisions and why, most recent first. **Read the latest entries before starting anything**; the arc moves fast and your question may already be answered. |
| The lane doc for your work | `07-e2e-journey` (the pipeline + portable-core architecture), `18`/`22` (plugin), `11` (multi-brand north star), `23`–`26` (dashboard IA + UI conventions). Index in [`docs/`](docs/). |

The one architectural idea to hold: **the engine core is pure and dependency-free, and
every surface — web, plugin, CLI, MCP — is a thin adapter over it.** No `node:*`, no file
reads, no environment assumptions inside the theming core. Changes that blur that line
are the ones most likely to be sent back.

---

## 2. Workflow

One PR per feature branch off `main` → squash-merge → delete the branch → sync `main`.

**One concern per PR.** Surgical changes: edit what the task needs, don't refactor
adjacent code or fix unrelated pre-existing issues in passing. If you find something
else broken, open a finding and keep going.

The PR template's Gates block is the load-bearing part — fill it in with real numbers,
not ticks.

---

## 3. The gates

**Start here: `npm run verify`.** It runs every gate below and prints one PASS/FAIL row
each, so the two hand transcriptions this section otherwise requires (prose → a shell command per gate,
and every result → a PR table) stop being unverified copies. It prints its own total; this section
deliberately does not restate it, because a count written here is one nothing checks — and #786 had
exactly that go stale twice in a week. Everything after it in this section is the
per-gate *rationale*, which is why the section stays long: the runner tells you **whether**, this
prose tells you **why**, and a red gate is unfixable without the second.

```bash
npm run verify              # every gate, in a declared and checked order, with a table
npx tsx verify.ts --list    # the list and the exact commands, running nothing
npx tsx verify.ts lint-paint lint-voice   # a named subset, labelled as a subset in the summary
```

Four properties, each of them a defect that has actually shipped in this repo, and all four are
stated in `verify.ts`'s header:

1. **The exit status is captured with nothing between it and the command.** `npx tsx gate.ts 2>&1 |
   tail -2; echo $?` reports **`tail`'s** status — `tail` succeeds at tailing a failure — which is how
   a `lint-us-english.ts` that exited 1 got reported as a pass. The runner uses one `spawnSync` with
   `shell: false`, so there is no pipeline for a status to get lost in.
2. **Output is buffered per gate.** Thirty-odd gates interleaving thousands of lines is how a real failure gets
   read past. A clean run is a table; a red run is a table plus exactly the failing output. `--verbose`
   prints everything.
3. **Ordering is declared per gate and checked before anything runs.** Three orderings are
   load-bearing and each one, violated, yields a *pass* rather than an error: the prose gates scan the
   built bundle (run early they scan a stale one — #302, #310), the exporter gate executes TokenPress's
   real exporter, and the `node:`-builtin check reads the plugin's `dist/main.js`.
4. **A gate that did not run is never printed as a pass** — SKIP is its own outcome, a skipped gate
   makes the whole run non-green, and a table shorter than the list is itself a failure. Represented,
   not counted, the same discipline `lint-us-english.ts` applies to its own surfaces.

Two things it deliberately does *not* do. It does not run bare `regen.ts` before `regen.ts --check`:
that is the **authoring** sequence (regenerate → review the diff → commit), and doing it here would
leave `--check` comparing the fresh output against itself, passing unconditionally with the drift
still in `HEAD`. And it does not treat a dirty `out/` as a pass — `--check` reports **SKIP** with the
reason, because with uncommitted artifacts that gate is a statement about your working tree rather
than about `HEAD`.

Its `GATES` array is the **fifth** authored statement of what the gates are, beside this section,
`CLAUDE.md` §4, the PR template and `ci.yml` — and `lint-doc-gates.ts` compares it against `ci.yml` in
**both** directions, joined on each step's `- name:` verbatim. That is what makes `ci.yml` checkable
at all: this file's other three comparisons take `ci.yml` as ground truth, so before #789 a gate
*missing* from `ci.yml` left four artifacts in perfect agreement and fired nothing. Measured, not
assumed — deleting the `lint-paint.ts` step from `ci.yml` left the previous gate exiting 0. Its
sibling arm covers the last case no list can see: a `lint-*` file that exists in the repo and is named
in **nothing**. Adding a gate is therefore a five-file edit, which is the `payload-manifest` reasoning
— the friction is the feature.

No build, no `npm install` for the engine — it's self-contained TypeScript run via `tsx`
(Node ≥ 20). To run them individually, from the repo root:

```bash
npx tsx packages/engine/test.ts                     # unit tests — report the N/N
npx tsx packages/engine/mcp-test.ts                 # the MCP surface over real stdio — report the N/N
npx tsx packages/engine/nb-regression.ts            # must exit 0 (the New Balance reproduction)
npx tsx packages/engine/emit-dtcg.ts                # every alias resolves + every mode contrast contract passes
npx tsx packages/engine/emit-figma.ts               # the Figma import artifact
npx tsx packages/engine/regen.ts --check            # no committed artifact has drifted (#281) — the only gate reading the committed tree
npx tsx packages/engine/token-contract.ts --check   # the token-NAME contract hasn't broken (#464)
npx tsx packages/engine/lint-skills.ts              # shipped skills still make true claims
npx tsx packages/engine/lint-doc-gates.ts           # this checklist stays in sync with ci.yml (#613)
npx tsx packages/engine/lint-layout-claims.ts       # the docs describe the repo that EXISTS (#670), both
                                                    # directions: every claimed path resolves — from the
                                                    # doc's own directory, against `git ls-files` — and
                                                    # every tracked layer is named in the layout tables.
                                                    # The second half is the point: two of the three
                                                    # defects that filed this were ABSENCES, and no sweep
                                                    # for wrong strings finds a row that is not there
npx tsx packages/engine/lint-payload-manifest.ts     # every emitted artifact is classified payload or ours
                                                    # (#674). The manifest is AUTHORED, never regenerated:
                                                    # built from a scan it would classify each new artifact
                                                    # itself and call that a pass. Adding an emitted
                                                    # artifact FAILS this until a human classifies it. It
                                                    # checks a class is DECLARED, not that it is RIGHT —
                                                    # that is what the `why` on each rule is for
npx tsx packages/engine/typecheck-components.ts     # the component defs typecheck against their schema
                                                    # (#657). `tsc --noEmit` over the DECLARED scope in
                                                    # packages/engine/tsconfig.json — a check, not a
                                                    # build; the engine stays buildless and the gate
                                                    # asserts it. The half that is the point: every
                                                    # tracked def must be REPRESENTED in what tsc
                                                    # actually read, because a passing typecheck says
                                                    # nothing about which files it opened — before this,
                                                    # 1 of 5 defs was checked, via a plugin import.
                                                    # And since #742 a REGISTRY arm, both directions:
                                                    # every tracked def file contributes an export to
                                                    # components/index.ts's `componentDefs`, and every
                                                    # member of that set comes from a tracked def file.
                                                    # git's index stays the ORACLE — the registry is
                                                    # only ever the SUBJECT, or the gate would be
                                                    # confirming a list agrees with itself
npx tsx packages/engine/lint-overlay-completeness.ts # each mode's overlay carries EXACTLY the leaves that
                                                    # vary in it (#708). Both directions: a varying leaf
                                                    # missing, and a non-varying leaf present. The defect
                                                    # was invisible to every other gate because the
                                                    # base+overlay cascade means every token is always
                                                    # present in every mode — base supplies it — so a
                                                    # dropped override resolves to a real value, just the
                                                    # WRONG one: 28 mode-varying shadows were absent from
                                                    # every overlay in all four brands and consumers
                                                    # rendered light shadows in dark. Its independence is
                                                    # the design: EXPECTED is derived from the projector's
                                                    # INPUT (the canonical `modes` extension) by this
                                                    # file's own traversal, ACTUAL is read from the
                                                    # projector's OUTPUT. Deriving EXPECTED by re-running
                                                    # buildOverlay, or from the overlays themselves, is
                                                    # the gate agreeing with itself — do not "simplify"
                                                    # the duplicated walk away; it IS the gate
npx tsx packages/engine/lint-paint.ts               # the component tier's colour bindings (#758), in two
                                                    # arms — because #758's OWN stated acceptance
                                                    # ("Button's 648-member paint is byte-identical:
                                                    # regen --check reports 104") cannot fail.
                                                    # figmaAnatomySet is called by no emitter and no
                                                    # component payload is committed under out/, so
                                                    # component paint is outside regen's universe:
                                                    # repointing destructive.outline.icon at
                                                    # color.interactive.neutral.text.rest — a token that
                                                    # RESOLVES — left regen --check at 104 AND test.ts at
                                                    # 2192/0, with a destructive icon painting neutral ink.
                                                    # ARM 1 is a RULE at zero: a key led by an axis VALUE
                                                    # points at a ref carrying that value (90/90).
                                                    # EXPECTED from the key, ACTUAL from the ref — two
                                                    # authored halves, deliberately NOT paintOf's own
                                                    # lookup, which would agree with itself in the mutated
                                                    # case too. Its 4 exceptions are named per key with a
                                                    # reason and checked BOTH ways, so a stale one fails.
                                                    # ARM 2 is a CHARACTERIZATION on an authored baseline,
                                                    # because a uniform loss (1926 -> 1782 assignments)
                                                    # crosses no intent boundary and arm 1 stays green.
                                                    # It is taken over the FULL DECLARED GRID, never over
                                                    # figmaAnatomySet: icon's variantAxes is ['size'] while
                                                    # its paint axis is `tone`, so a set-based census pins
                                                    # icon at 0 — a number no mutation can move, in a file
                                                    # that reads as coverage. schema/paint-census.json is
                                                    # AUTHORED, not a regen artifact, same reason as
                                                    # token-contract.json. Grammar ORDER is gated in
                                                    # component-schema.ts instead, per BINDING: reversing
                                                    # focus-ring's templates strands the authored
                                                    # stroke.inverse (#656's invisible ring), and no census
                                                    # can see it — focus-ring has no `size` axis, so it
                                                    # cannot be projected at all
npx tsx packages/engine/lint-rung-names.ts          # a def's size enum names the ENGINE's rungs, not a
                                                    # brief's (#756). The KB briefs and the emitted tier
                                                    # use the SAME rung names for DIFFERENT values, offset
                                                    # by one and agreeing on every value over the overlap,
                                                    # so a def adopting the brief's names makes
                                                    # icon.size.md mean 24 in the token layer and 20 in the
                                                    # component API — both halves valid, every other gate
                                                    # green, visible only by reading two files side by
                                                    # side. #708's shape: a wrong value that RESOLVES.
                                                    # ARM 1 (every enum value resolves to an emitted rung,
                                                    # per brand) is NECESSARY AND NOT SUFFICIENT and says
                                                    # so in its own output: ['sm','md','lg','xl'] against a
                                                    # five-rung tier passes it trivially — all real paths,
                                                    # the wrong four. ARM 2 is the arm that SEES the
                                                    # divergence, in lint-paint.ts arm 1's shape: a def
                                                    # states its ladder TWICE, in props/variants (`small`)
                                                    # and in tokens (`sm`), so EXPECTED and ACTUAL are two
                                                    # independently-authored halves of one line. Both
                                                    # directions of enum<->binding, plus order-preservation
                                                    # per tier family. MONOTONIC, not strict, and measured:
                                                    # type.label emits two rungs so button's `large`
                                                    # legitimately clamps to md — a repeat is a clamp
                                                    # against a shorter tier, a reversal never is, and
                                                    # strictness would have forced an exception list.
                                                    # ARM 3 is the DEFAULT RULE (#756's third bullet): a
                                                    # default resolves to `md`. Found in the corpus (5/5),
                                                    # not invented, and settled by composition —
                                                    # button/icon-button at their own default bind
                                                    # icon.size.md = 24, so preserving the brief's VALUE
                                                    # would render a standalone icon 20 and the same icon
                                                    # inside a default-size button 24. Do NOT widen an enum
                                                    # to go green: that turns a missing binding into a size
                                                    # that resolves to nothing
npx tsx packages/engine/lint-shape-index.ts         # a published docs/34 shape NUMBER never means
                                                    # something else (#786). Citations across the repo
                                                    # reference these numbers as stable ids and nothing
                                                    # enforced the binding. The live citation count is
                                                    # what the run prints, never a figure written here. Know what it protects: a
                                                    # hazard with ZERO INCIDENTS — shapes 1-9
                                                    # byte-identical since 2026-08-08, 10-15 each
                                                    # APPENDED, same-number-different-title across the
                                                    # doc's whole history ZERO, and the "12 -> 13
                                                    # renumber" that motivated the issue happened at
                                                    # FILING time, so no citation was ever invalidated.
                                                    # Hence the cheap version, not the stable-slug
                                                    # migration that would rewrite every citation to fix
                                                    # damage that has not occurred. ARM A, the binding:
                                                    # EXPECTED is authored schema/shape-index.json,
                                                    # ACTUAL is the doc's headings. The naive gate reads
                                                    # the CURRENT doc to decide what to expect — docs/34
                                                    # shape 1, in the file that defines shape 1. Git
                                                    # history is independent but dies under a shallow
                                                    # checkout, so the memory is a committed file:
                                                    # AUTHORED, not a regen artifact, and --accept
                                                    # APPENDS ONLY, refusing a retitle. ARM B is
                                                    # existence: every cited number resolves, with the
                                                    # citing files asserted REPRESENTED so a regex that
                                                    # stops matching fails instead of reporting 0.
                                                    # It CANNOT check a citation names the RIGHT shape —
                                                    # that is prose, and review is its only guard
npx tsx packages/engine/lint-schema-classification.ts  # every file in packages/engine/schema/ has a
                                                    # DECIDED place in the two prose gates (#807).
                                                    # Principle 5's rule — a file kept out of regen must
                                                    # be hand-named in lint-us-english.ts AND
                                                    # lint-voice.ts — lived in prose and was carried out
                                                    # by whoever remembered. Three files were in
                                                    # neither gate with no record of a decision, so
                                                    # nothing distinguished "deliberately exempt" from
                                                    # "nobody looked": the same membership-by-location
                                                    # defect payload-manifest.json exists to remove,
                                                    # reproduced one tier up. Three classes now:
                                                    # SCHEMA_ARTIFACTS (regen-covered, so both gates
                                                    # cover it automatically), hand-named in BOTH prose
                                                    # gates, or EXEMPT with a stated reason. Requiring
                                                    # BOTH is deliberate — the gates share one scope
                                                    # rule, so a file in one and not the other is a
                                                    # DIVERGENCE at most one side of which can be right.
                                                    # EXPECTED comes from `git ls-files` — the
                                                    # DIRECTORY, never the lists being checked.
                                                    # Measured: a union-of-the-lists version prints
                                                    # `clean` at exit 0 on the very file the
                                                    # directory-derived one fails on, since an
                                                    # unclassified file is by definition in no list.
                                                    # Both directions, so a stale entry cannot rot
                                                    # quietly. Its LIMIT: it proves a human wrote an
                                                    # answer down, not that the answer is right —
                                                    # moving a prose-carrying file to EXEMPT passes,
                                                    # which is what each entry's `why` is for
npx tsx packages/engine/lint-absolute-inset.ts      # an absolutely-positioned part carrying an `inset`
                                                    # leaves a VISIBLE GAP between itself and its
                                                    # parent (#801, the first instance of #802) — the
                                                    # GAP, not the coordinate, and that distinction is
                                                    # the whole finding. Button's focus ring shipped
                                                    # FLUSH against the component. Both causes #801
                                                    # named were wrong, AND SO WAS THE THIRD: the
                                                    # offset resolves (0 misses over the real
                                                    # 648-member set), its miss path is reachable and
                                                    # COUNTED (108 misses with the variable removed),
                                                    # and `focus.ring.offset` is 2 in every brand — so
                                                    # "nothing read the NUMBER" was measured and false.
                                                    # The actual cause, found by comparing against the
                                                    # Prism2 reference (which sites the same ring at
                                                    # -4, not -2): strokeAlign is INSIDE at both
                                                    # executors — correct for a border, since an
                                                    # outside stroke grows the auto-layout footprint —
                                                    # so the ring's own 2px stroke is drawn back inward
                                                    # across the whole 2px gap. Visible separation =
                                                    # offset − strokeWidth = ZERO, from a component
                                                    # that is otherwise perfect: right positioning,
                                                    # constraints and paints, 0 misses. NOTHING
                                                    # ANYWHERE KNEW THE RING CARRIED A STROKE.
                                                    # EXPECTED walks the DEF (part → inset + strokeInset
                                                    # keys → tokens → refs → variable names, restating
                                                    # the convention rather than calling `varOf`), and
                                                    # asks the NESTED def whether it draws inward, so a
                                                    # host cannot answer that about itself; ACTUAL is
                                                    # the plan's absoluteInset/absoluteStrokeInset and
                                                    # the FLOATs they resolve to in each brand's
                                                    # COMMITTED export. C computes gap = offset − stroke
                                                    # and re-derives it from the sited coordinate, so a
                                                    # compensation applied backwards fails even though
                                                    # offset > 0 still holds. It does NOT re-derive the
                                                    # executors' arithmetic: test.ts compares that
                                                    # against its own stub's two inputs, including an
                                                    # unequal-halves case a doubling could not produce.
                                                    # Both directions, so it cannot pass over an empty
                                                    # set — every declared inset part must be
                                                    # REPRESENTED, one gated by `when:` must carry its
                                                    # inset at that state and NO other, and
                                                    # MUST_CLEAR_STROKE asserts the compensation was
                                                    # EXERCISED (without it the arithmetic degrades to
                                                    # gap = offset — #801 exactly — and every other
                                                    # check still passes). A legitimately-zero gap
                                                    # (ring.offset-field is 0 by design) is admitted in
                                                    # ZERO_OK with a reason: AUTHORED, same argument as
                                                    # payload-manifest.json — a gate choosing its own
                                                    # exemptions would have waved #801 through. Its
                                                    # LIMIT: no browser and no Figma file, so a host
                                                    # that accepts a write and discards it is caught by
                                                    # the executors' own read-backs, not here (#802's
                                                    # Figma half is open). And the LESSON, docs/34
                                                    # shape 16: this gate's FIRST version was fully
                                                    # independent, falsifiable, and measured the wrong
                                                    # quantity — it printed a pass on the shipped ring
                                                    # while test.ts's parity gate confirmed both
                                                    # executors agreed on the same wrong formula.
npx tsx packages/engine/lint-advisory-expiry.ts     # a stated advisory window, once it closes, fails
                                                    # the build. The one gate here whose ORACLE IS THE
                                                    # CLOCK: no API, no issue state, no network, and
                                                    # the repo cannot edit the calendar. The smoke
                                                    # suite below is non-blocking with a date on it,
                                                    # and that dated promise is written in SIX places
                                                    # — ci.yml twice, verify.ts, test-smoke.mjs twice,
                                                    # and CLAUDE.md/this file/the PR template. All six
                                                    # go false on the same morning, and nothing else
                                                    # would say so. GATING, not advisory: a gate that
                                                    # watches for expired advisories and is itself
                                                    # advisory would be its own joke. The wider
                                                    # "forward claim" class is a tools/ harness rather
                                                    # than a gate because its recall is unknown; this
                                                    # sub-class is where that objection dissolves,
                                                    # since the pattern is literal and recall is
                                                    # MEASURED — 904 dates across 548 tracked text
                                                    # files, 13 claims, complement read by hand.
                                                    # Anchored on the DATE, not the phrase, which is
                                                    # what makes the denominator finite and printable.
                                                    # docs/00-progress.md is exempt BY GENRE — the
                                                    # same exemption lint-layout-claims.ts grants it,
                                                    # a property of that document and not of the
                                                    # pattern: its dated entries describe the repo as
                                                    # it was, so a closed window recorded there is
                                                    # correct prose forever. Verified in BOTH
                                                    # directions with an injected clock
                                                    # (PRISM3_TODAY), never by editing the dates in
                                                    # the files — that would test a different program.
                                                    # LIMIT: a claim phrased with neither `advis...`
                                                    # nor `continue-on-error` is not seen, and the run
                                                    # prints the whole census so a count that drops
                                                    # without a deletion in the diff is the tell
```

CI (`.github/workflows/ci.yml`) also runs the web and plugin gates below **on every PR,
unconditionally** — there is no "I only touched the engine" exemption, so don't skip them
locally just because your diff looks engine-only. (Two PRs shipped with a gate silently
broken because their Gates table stopped before reaching it — see `00-progress.md`.)

```bash
npm run typecheck    -w @prism3/studio      # tsc --noEmit — esbuild does NOT typecheck
npm run test         -w @prism3/studio      # the provenance model (#722). NOT covered by typecheck:
                                            #   tsconfig.json includes `src` only, so the test file
                                            #   itself is never compiled — this step is what runs it
npm run build        -w @prism3/studio
npm run test:smoke   -w @prism3/studio      # the headless DOM/interaction suite (#767, deciding #333).
                                            #   Run it AFTER build — it drives the built dist/main.js
                                            #   in Chromium: every page in every mode across both
                                            #   corpus brands (72 states), the mode switch, an override
                                            #   picker and an export, asserting 0 console errors plus
                                            #   DOM and RENDERED-contrast invariants. Deliberately a
                                            #   SEPARATE script from `test` above: those are pure
                                            #   modules with no browser, and a browser flake must not
                                            #   be able to take them down. This is the only coverage
                                            #   src/main.ts has or can have — it touches `document` at
                                            #   import time, so no Node harness can load it at any
                                            #   granularity, which is why both pure suites cover
                                            #   modules EXTRACTED from it. In CI it GATES, since
                                            #   2026-08-20 — #775, flipped on runner evidence that
                                            #   was read rather than assumed. Its browser download
                                            #   gates too, so a CDN blip blocks: cache it, never
                                            #   restore continue-on-error.
                                            #   Needs a browser: `npx playwright install chromium`
                                            #   once (playwright is an apps/studio devDependency; the
                                            #   engine core stays dependency-free and buildless)
npm run check:ignore -w @prism3/studio      # Vercel ignore list still matches the real bundle
npm run lint:contrast -w @prism3/studio     # studio chrome clears its own contrast floors — STATIC, the
                                            #   token VALUES. Its complement is test:smoke above, which
                                            #   measures what RENDERS; neither subsumes the other (a
                                            #   legal token faded through opacity is invisible to this
                                            #   one, and a token used in a state no sweep visits is
                                            #   invisible to that one)
npm run typecheck -w @prism3/plugin      # BOTH contexts — main (no DOM) and ui (no figma.*)
npm run test      -w @prism3/plugin      # write / readback / persist / float / styles shims
npm run build     -w @prism3/plugin      # dist/main.js must contain 0 `node:` builtins — asserted by
                                          # build.mjs as of #804, where it had been a CI-ONLY step and a
                                          # green local run therefore shipped a red PR. The string arrived
                                          # as bundled $description PROSE, not an import ("…a Figma node:
                                          # the engine…"), so the check stays a whole-file grep rather
                                          # than parsing imports: a builtin reached another way would slip
                                          # past a syntax-aware check, and a false positive costs one dash
npm run test:verdict -w @prism3/plugin   # every terminating condition of a component build reaches a
                                          # VISIBLE verdict (#870) — clean, with misses, errored,
                                          # already-built, unknown-def. Runs after `build` above: it
                                          # drives the built dist/ui.html, loaded TOP-LEVEL so
                                          # `parent === window` and the harness can stand in for the
                                          # main thread over the real bridge.
                                          # A SECOND browser suite rather than more cases in the studio's
                                          # test:smoke, because the subject is a different BUNDLE: the
                                          # Components page is figmaOnly, so railNav() omits it from the
                                          # web rail and the studio bundle has no route to this control
                                          # at any effort.
                                          # WHY IT EXISTS: a build completed correctly — nodes in the
                                          # file, misses computed — and the panel stayed on "⋯ Building…"
                                          # and disabled until the plugin was restarted. The verdict line
                                          # is the ONLY place a build's misses are reported, so a
                                          # permanent "Building…" converts a reporting build into a
                                          # silent one; #866's four DISCARDED refs were visible solely
                                          # because that summary rendered. The state machine was never
                                          # wrong (componentState left 'pending' on every path), which is
                                          # why nothing caught it: a check asking the UI whether it
                                          # considered itself done would have PASSED on the defect. So
                                          # EXPECTED is authored per condition as the label and
                                          # enabled-state a designer reads, and ACTUAL is read out of the
                                          # rendered DOM — docs/34 shape 16's remedy, state the quantity
                                          # a human would check in the units they would check it in.
                                          # Its stated limit: no Figma and no main thread, so it proves
                                          # the panel renders a verdict for every terminal MESSAGE, not
                                          # that the main thread sends one.
                                          # Needs a browser, same one-off install as test:smoke above
npm run test      -w @prism3/tokenpress  # the ported suite's 263 assertions, on tsx rather than the
                                          # vitest it arrived with. The runner asserts a PER-FILE census
                                          # against the pre-port vitest baseline, so a test quietly
                                          # vanishing in a refactor fails here too — a total alone would
                                          # let one file lose a test and another gain one
npm run build     -w @prism3/tokenpress  # not just a build: build.mjs asserts four properties of what it
                                          # WROTE — the __PLUGIN_VERSION__ stamp substituted (it is a bare
                                          # identifier with no runtime declaration, so an absent define
                                          # ships a plugin that throws on first export), the iife wrapper,
                                          # 0 `node:` builtins, jszip's setImmediate shim. dist/ is
                                          # gitignored, so a regression there is invisible to lint and to
                                          # every source grep.
                                          # There is deliberately NO typecheck step: TokenPress arrived
                                          # without one and its tsconfig.json mis-wires
                                          # @figma/plugin-typings via typeRoots, so tsc reports 232
                                          # errors, almost all `Cannot find name 'figma'`. Identical
                                          # count in the source repo — pre-existing, out of scope for the
                                          # port. Don't add the step until the tsconfig is fixed, or you
                                          # are only pinning 232 errors
npx tsx tools/exporter-comparison/gate.ts # the two DTCG exporters agree where a difference would be a
                                          # DEFECT (#697). Runs after the TokenPress build because it
                                          # executes TokenPress's real TokenExporter in memory over
                                          # prism3's own Figma emission — two separate codebases sharing
                                          # no code, which is as independent as a comparison here gets.
                                          # Seven arms, on every brand with a Figma emission (discovered
                                          # by scanning out/figma/, count asserted >= 3): a `$type`
                                          # disagreement on a shared path, the same on a path a pairing
                                          # RULE relates (#747), a pairing that compares NO types at
                                          # all, an emitted collection whose mode axis nobody DECLARED
                                          # (#697), a path TokenPress emits that prism3 does not, the
                                          # float32 cleanup REWRITING a value instead of restoring it
                                          # (#703's prediction), and #709's
                                          # opacity 100× at the integration level. Its sibling
                                          # `compare.ts` is a MEASUREMENT and always exits 0 — most of
                                          # what it reports is a difference that is right for its host,
                                          # so categories 3-5 stay reporting-only until #697's
                                          # byte-for-byte question is answered. The prism3-only arm is a
                                          # MEMORY of paths WITH CAUSES, not a count, and fails in both
                                          # directions: a third unreachable path fails, and a gradient
                                          # becoming reachable fails too (aurora's 2, #731). The three
                                          # type arms are one claim at three widths: the original saw
                                          # only paths appearing verbatim on BOTH sides, so retyping an
                                          # axis-collapsed path left it green (#747, 71-73 blind per
                                          # brand). Now 0 and ASSERTED — each rule declares a
                                          # `counterpart` and the expectation is read from the CANONICAL
                                          # TREE, never from the rule's own claim. Closing it needed
                                          # #697's axis call, DECLARED in axes.ts: an unclassified
                                          # collection fails rather than defaulting. Read the bound with
                                          # the 0: the arm compares `$type`, so it falsifies a rule's
                                          # `reason` only when the error CHANGES A TYPE. Swapping the
                                          # grid rule's gutter<->margin orphans nothing, keeps both
                                          # sides `dimension`, and passes FULLY GREEN — while nb's two
                                          # values differ at 3 of its 5 breakpoints. A green
                                          # `paired types` means the two sides agree on type, NOT that
                                          # the pairing is right
npm run check:consumability -w @prism3/tokens  # a STOCK Style Dictionary over EVERY emitted brand —
                                          # characterization gate: pins each brand's mode collapse
                                          # (permanent, #609); asserts as a RULE that the conforming
                                          # projection carries ZERO non-DTCG $types, checked against
                                          # the spec list not a corruption count, and pins at 2 the
                                          # standard types SD cannot serialize (#635, split by #642);
                                          # asserts the base+overlay projection reads back, and
                                          # refuses custom preprocessors
npx tsx packages/engine/lint-us-english.ts # run AFTER the web build — its scope includes apps/studio/dist/*.js
npx tsx packages/engine/lint-voice.ts      # voice-standard.md §2 banned-phrase list (#617) — sibling to lint-us-english.ts, same reason it runs here
```

**Green tests are not the finish line.** The standard here is that the change is
*driven* — the web UI verified headless, the plugin driven live against a real Figma
document. Live driving has repeatedly caught what in-memory shims hid (see the #148
`getLocalVariablesAsync('COLOR')` bug in `00-progress.md`, where the shims ignored the
type filter and the FLOAT read-back would have come back empty in production).

### Adding a gate? Prove it can fail

**A gate is only as strong as the independence of the two things it compares.** If you write a
new check, mutate the thing it checks and confirm **your** gate is in the failure list — not
merely that the suite went red. That distinction has mattered more than a dozen times in this repo
(the register is in the doc below): once a mutation produced 7 failures and the new gate was not among
them, because it was asserting `helper === helper`; and a lint self-check passed every sample while a
real en-GB spelling shipped, because it re-implemented the scan instead of calling it. Read
[`docs/34-gate-independence.md`](docs/34-gate-independence.md) before writing the gate
rather than after.

The reviewer-facing half: **duplication between a gate and its subject is usually load-bearing.**
Routing both through one helper is the obvious cleanup and it silently deletes the gate, leaving
no failing test and a diff that looks like an improvement. If you're about to suggest that
cleanup, check for a comment explaining why the duplication is there.

### The `out/*` discipline

Every PR states its output impact explicitly, in one of two forms:

- **byte-identical** — a validation-only, metadata, or surface change that provably
  doesn't move the emitted tokens; or
- **regenerated** — and *what* moved, in which brands and axes, and why.

Regenerating `out/*` without saying so is the single easiest way to hide a real
regression. If a committed fixture's byte-repro target moved, say so and justify it.

---

## 4. Working with an agent on this repo

The repo is built to be agent-operable — use that, but hold the line in three places.

**Point it at the durable state, not at your memory of it.** Start with "read
`CLAUDE.md` and the latest entries in `docs/00-progress.md`, then the doc for
this lane." An agent that skips the progress log will happily re-derive a decision you
already made and settled months ago.

**The issue is the brief.** Our issue convention (What / Do / Watch-outs / Verify /
Out of scope) exists because it's directly executable — hand an agent the issue and it
has the seam, the pattern to mirror, the traps, and the definition of done. If an issue
isn't good enough to hand over cold, fix the issue before starting the work.

**Make it prove the gates, and read the proof.** Ask for the actual numbers (`925/925`,
`exit 0`, `336/336 per brand`) and the `out/*` impact. "Tests pass" is not a result.
Agents are good at this loop and bad at noticing when a gate silently stopped covering
the thing it was there to cover.

Two failure modes worth watching for specifically: **scope creep** (an agent tidying
adjacent code — principle 3 says don't), and **plausible-but-unverified claims** about
Figma or Style Dictionary APIs. This repo's precedent is to re-verify API surfaces
against current docs before building on them (Context7 or the live docs), because they
drift.

If you're using the packaged skills, `skills/prism3-theme` (authoring a brand)
and `skills/prism3-consume` (building UI from generated tokens) are the two that
exist; `.claude/commands/review-pr.md` runs an independent PR review.

---

## 5. Where things live

Keeping these separate is what stops the backlog from drifting out of sync with itself.

| Kind of thing | Home |
|---|---|
| **What shipped, what was decided and why** | `docs/00-progress.md` — narrative history, most recent first, append-only. It records *what happened*; it is not a to-do list. |
| **Actionable backlog** | **GitHub issues.** Anything someone could pick up belongs here, not in doc prose. |
| **Ideas not yet scoped** | `docs/27-future-ideas.md` — discovery-level, deliberately not issues yet. An idea graduates to an issue when it's actionable. |
| **Architecture, models, specs** | The numbered docs in `docs/`. Add a new numbered file only for a genuinely new topic area; append, don't renumber. |
| **Agent-generated design specs + implementation plans** | `docs/superpowers/specs/` and `docs/superpowers/plans/`, one dated file per piece of work (`YYYY-MM-DD-<topic>.md`). These are the *working record of a single change* — the design dialogue that preceded it and the task-by-task plan it was built from — so they ride in the feature PR and are not edited afterwards. Durable conclusions still land in `00-progress.md` and the numbered docs; this directory is not a second home for them. |

---

## 6. Issues and labels

Four templates: **feature**, **finding**, **decision needed**, **research/spike**. Title
prefix is the lane in brackets — `[engine]`, `[web]`, `[plugin]`, `[figma]`,
`[code-library]`, `[mcp]`, `[docs]`, or `[decision]`.

Every issue body opens with a `**Lane:** · **Type:** · **Source:**` line. Keep it: it's
what makes an issue readable as a brief, and it carries more than a label can.

**Optional, on the same line when they apply: `**Extends:**` and `**Related:**`** —
formalized 2026-07-29 after #269 used them well (a font-family model issue that names
what it builds on and what it's adjacent to, distinct from *where it came from*). `Source:`
answers provenance (owner direction / a review / a PR follow-up); `Extends:`/`Related:`
answer connection (what this issue builds on top of, what it sits next to) — a different
axis `Source:` was never meant to carry. Use `Extends: #NNN (one-clause why)` when this
issue is a direct continuation of another; `Related: #NNN, #MMM` for adjacency worth a
reader's attention. Optional — most issues don't need either.

### Two axes, one label from each

Labels answer two different questions, so they're two prefixed sets. **One `lane:` and one
`type:` per issue.** The prefixes are the grouping mechanism GitHub doesn't give us
natively — they sort together in the picker, and they keep the axes from reading as peers.

**`lane:` — who picks it up, and what gates it.**

| Lane | Covers | Gated by |
|---|---|---|
| `lane:engine` | The pure core **and `emit-figma`** | Engine tests, NB regression, byte-repro fixture, `out/*` discipline |
| `lane:studio` | The dashboard / theme studio (`apps/studio`, `@prism3/studio`) | `tsc` + build, headless drive |
| `lane:plugin` | The Figma plugin workspace | Two-context typecheck, shim tests, 0 `node:` builtins, live drive |
| `lane:figma` | **Canvas craft** — building components *in Figma*, canvas docs, library structure, Code Connect authoring | Design review; no code gates |
| `lane:code-library` | The **code** component library — headless core + its projections (WC, React, Storybook, `.ai.json`, usage docs) (`docs/19`) | TBD when the lane activates — Storybook, a11y, visual regression |
| `lane:mcp` | MCP surface + agent-facing tooling | Eval harness |
| `lane:docs` | **This repo's own** specs and durable state — the numbered docs, the progress log, this file | Review |
| `lane:token-press` | Cross-repo: Token Press ingestion / round-trip | Coordination, not code |

**`type:` — what kind of work.**

| Type | Use |
|---|---|
| `type:task` | Scoped build work. |
| `type:finding` | A defect with evidence. Bug fixes are a *type*, not a lane — a Storybook bug is `lane:code-library` + `type:finding`. |
| `type:decision` | A fork that needs a call before work proceeds. |
| `type:research` | A question to investigate. Deliberately a type, not a lane: research often spans lanes (#113 covers web, Figma **and** MCP). |

Plus two routing flags, both optional: **`good first issue`** (self-contained enough for
someone new to the repo) and **`help wanted`** (needs attention beyond the usual). Mark
`good first issue` as you file — much harder to spot retroactively than at the moment of
writing.

**`priority:now`** — the one label that answers "what's helpful to pick up first," which
`lane:`/`type:` deliberately don't (they answer *what kind*, not *what order*). Applied to
issues with **no stated blocker** — read literally: no `**Depends on:**` line in the body,
and (for a `type:decision`) nothing waiting on an owner call first. It is *not* a ranking
within that set — just the readiness filter. Computed once (2026-07-28) from the
`Depends on:` chains written into issue bodies across the custom-mode-arc and
code-library backlog passes; nobody's maintaining it as issues open and close, so treat it
as a snapshot to re-derive, not a live feed. Only `priority:now` exists — no
`priority:next`/`priority:later`; an unused tier is worse than no tier (see `lane:emitter`'s
fate, above). Add those only once there's something real to put in them.

These 15 are the whole set. GitHub's stock labels were removed deliberately: `bug`,
`documentation`, and `question` collided with `type:finding` / `lane:docs` /
`type:research`, and `duplicate` / `invalid` / `wontfix` are better served by the native
`state_reason` on close. If you find yourself wanting a new label, check it isn't a
sub-area that belongs in the title first (see below).

### Three boundaries that get misread

**`emit-figma` vs the plugin vs canvas work** share only the word *Figma*. Three
verification models, three lanes. Use `[emit-figma]` in the title for specificity within
`lane:engine`.

**`lane:figma` vs `lane:code-library`** — building a component *on the canvas* is design
work; building it *in code* is dev work. A component needing both gets one issue per lane,
not one issue with two labels: different gates, usually different owners.

**`lane:docs` is internal only.** Usage / client design docs are a *projection of the
component definitions* (`19 §6`), so they're `lane:code-library`. If the docs **site**
becomes real (`19 §7.5` is still open), it earns `lane:doc-site` then — not before.

### Don't pre-split a lane

`lane:code-library` will be the broadest lane, and that's deliberate. The architecture says
its outputs are one job: React is *"a thin wrapper over the same headless core… adding a
target is a wrapper, not a re-implementation"* (`19 §3`), and Storybook stories are
*generated* from the definitions (`19 §5`). Splitting WC / React / Storybook into lanes
would encode a division the architecture exists to avoid.

Carry sub-area in the **title** (`[code-library/storybook]`) — free, and needs no
migration. Promote a sub-area to a label only when its volume actually justifies it. The
debt runs one way: renaming and adding labels is free, *splitting* one across many issues
is the expensive move, and a speculative label nobody applies is worse than a missing one
(see the legacy lanes below).

The one genuine future split is a **platform consumption target** — AEM (`docs/27` Idea 2)
is a different skill set and a downstream consumer, so it earns `lane:aem` when it starts.
Create it then.

### History (why some old issues look different)

The taxonomy above went live 2026-07-28. Before it, labels were `lane:generator` /
`lane:emitter` / `lane:token-press` plus bare `task` / `finding` / `decision-needed` —
vocabulary from the two-thread era, when a *generator* thread and an *emitter* thread ran
in parallel. Those were renamed in place (so closed issues kept their labels),
`lane:emitter` folded into `lane:engine`, and the colliding GitHub stock labels were
removed.

Nothing here to run — this note exists so an old issue's label history reads sensibly.

## 7. Use the tracker's structure, not prose

Three GitHub features replace conventions we currently maintain by hand. Prefer them —
prose relationships don't survive contact with a second contributor.

**Dependencies over "Blocked by:" prose, where you can set them.** GitHub's native
issue-to-issue "blocked by"/"blocking" is a UI feature (Issues → Development sidebar) and
a GraphQL mutation; the GitHub MCP tooling used in agent sessions here **cannot write it**
— only read it (`issue_dependencies_summary`) — so an agent can't set this for you. If a
dependency matters, set it yourself in the UI, or ask an agent to hand you a `gh api
graphql` command. Otherwise state it in the body as `**Depends on:** #NNN` and accept that
it's prose until someone sets the real one. (Audited 2026-07-28: of the 12 open issues at
the time, only #112 had a stated blocker, and it referenced #115 — already closed. So
there was nothing live to convert; the note was corrected instead. See #112's comments.)

**Sub-issues over checklists in epics.** A phased epic (#176 is the model) should carry
its phases as sub-issues (`sub_issue_write` in the GitHub MCP *can* do this), so someone
can take one phase without owning the whole arc. Done for #176: A1/A2/B/C1/C2/D are now
issues #246–#251, nested under #176 in that order. Their sequencing (A2 needs A1, C1 needs
A1+B, C2 needs C1, D needs A1+C1) is stated as `**Depends on:**` prose in each body for the
same reason — no write access to native dependencies from here.

**Projects for prioritisation — still the right long-term tool, not yet built.** Labels
answer *what kind*; a project board answers *what's next*, with visual ordering and status
a label can't carry. `priority:now` (§6) is the interim, lower-cost stand-in — computed
once, not a live view — because this GitHub MCP setup has no Projects-write access, only
`gh`/the web UI does. Build the board there if the curation overhead is worth it for the
team; keep sequencing off doc prose either way, which goes stale (the 07-18 progress entry
still lists three issues as open that have since been closed).

Note: GitHub **issue types** are an organisation-level feature and aren't available on
this account — labels remain the type mechanism.
