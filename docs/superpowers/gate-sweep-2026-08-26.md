# Gate-independence sweep — 2026-08-26

The first deliberate sweep of all 45 gates against `docs/34`'s register (every prior instance was
found by accident, during unrelated work). Method: five parallel read analyses built a per-gate map
of what each gate compares and where each side comes from — the cross-gate producer graph nobody
had held at once — then a serialized mutation campaign in this worktree verified the high-value
hypotheses, one `wip:` checkpoint before every mutation, every restore `git checkout --` verified
clean. Two new shapes were appended to `docs/34` (17: the shared ancestor; 18: the borrowed
backstop) with sixteen register rows.

## How to check this sweep (the question the task posed)

Every verdict below is labeled by its evidence class, and every VERIFIED verdict is **replayable**
from the ledger at the bottom: the exact mutation (file, edit), the command run, and the verbatim
line observed. Re-apply any mutation and you must see the recorded output; a discrepancy falsifies
that row without trusting any other. REASONED verdicts name the lines read and the argument — they
are claims about code, checkable by reading, and explicitly NOT mutation evidence. One row records
a non-mutation this sweep itself produced and caught (M3, first attempt) — left in deliberately:
it is what the failure of this discipline looks like, and the diff-assertion that caught it is the
protocol's answer.

**Baseline:** the sweep ran against 75a3541 — `npm run verify` → `45/45 gates reached a verdict in
139s — 45 PASS · 0 FAIL · 0 SKIP · 0 ADVISORY`; `engine-test` **2567** passed (stable across two
runs). **Rebased onto 3c3852c for review**, where the same list is green and `engine-test` reads
**2585**. The three figures resolve: 2567 is the swept tree, 2585 is current main, and the brief's
2572 was neither — established in review, not by this sweep. Every ledger measurement below is
against the swept tree; re-running one after the rebase may report different counts for the same
verdict, which is why each row records its own numbers rather than a shared baseline.

**One verdict's basis moved under it.** #1053 changed `lint-materialization-renames`' reporting
after this sweep's R? row for that gate was written. `keysFromEmittedFile` — the shared reader the
row is *about* — was untouched, so the shape-17 observation survives; the row is honestly
**unconfirmed against current main** rather than wrong, and re-reading it is part of #1074.

## Verdicts, all 45 gates (+ the runner)

Evidence classes: **VW** = VERIFIED-WEAK (mutated; the gate passed over the case it exists for, or
the wrong arm fired) · **VS** = VERIFIED-SOUND (mutated; THIS gate fired by named assertion) ·
**VP** = VERIFIED-PARTIAL (mutated; caught, but for an incidental reason or with a misdescribing
verdict) · **RS** = REASONED-SOUND (read only) · **R?** = REASONED-SUSPECT (read only; specific
recipe recorded, not run) · Findings reference the ledger ids.

| gate | verdict | basis |
|---|---|---|
| engine-test | **VW** (specific arms) + RS (floors) | contract arm silent under M14; glyph pin moved with the ancestor under M1; M25 exposed the crash-not-failure genre live; MIN_ASSERTIONS floor present and reasoned sound. Suite-internal residuals from the map: generic `want` regexes in `mutate()` (shape 7), no replacement-count assertions, TEXT `height` still a constant in the stub, whole-payload `includes` probes (shape 12), icon guard's verdict-less false branch |
| mcp-test | RS + one R? | hand-transcribed spec oracles; population floor 40; one shape-12 probe (journey ⑥'s `/frontmatter/` grep over a payload whose *input* contains the word) — recipe recorded |
| nb-regression | RS | #659 fix landed as exact population pins ("exact, not floors", nb-regression.ts:55) |
| drift (regen --check) | **VW** — M13 | the `removed` arm is structurally dead; a disabled emitter passed the FULL 45-gate list |
| lint-materialization-renames | R? | `keysFromEmittedFile` parses both sides (reader as shared ancestor); partially covered by test.ts's doc-transcribed 846–964 pins, in a different gate; recipes recorded |
| drift-coverage | RS (own comparison) + inherits M13 | the pin defends a file count; the quantity cannot fall when an emission stops |
| token-contract | **VP** — M15 | corpus-member removal caught by incidental path arithmetic, misdescribed by the verdict, laundered by `--accept`; `corpus` compared to nothing |
| typecheck-web | R? | reach inherited, not declared; no `--listFiles` floor; the engine-minus-defs typecheck void is documented but in no gate's scope |
| studio-test | **VW** — M23, M24 | "ALL PASS — 0 assertions executed" at exit 0; the §8 battery certifies reimplementations (#387's shape) |
| build-web | RS (producer) | asserts nothing by design; `build:site` (the deploy build + its manifest floor) runs only on Vercel, never in CI |
| check-ignore | R? | docs/34's own "third revision" (recognized set vs actual out-of-studio inputs) unimplemented; `PATHS` trigger list audited by nothing; recipe recorded |
| lint-contrast | R? | forward-only pairing list; joint hole with smoke for new 2.0–4.5 pairings; border tokens gated by nothing |
| typecheck-plugin | RS | scope declared (enumerated include); honored-not-proven residual noted |
| plugin-test | **VS for one checker** — M3 | `test-write-components.ts`'s rebuilt ring checker fired by name, in WCAG units, on the exact #801 arithmetic. **Scope of that verdict, stated rather than implied:** one checker, in one of the two files read, of the eleven this gate chains — it is evidence about that checker, not about the gate |
| build-plugin | RS | four artifact assertions incl. the #496 script-count pin |
| plugin-no-node-builtins | R? | derive ignores build-plugin's result (stale-artifact PASS row possible); composite with the build's own copy is sound |
| plugin-verdict | R? | fixture messages authored to match main.ts by hand; semantic drift inside an existing shape untested anywhere; executed-count printed, not asserted |
| tokenpress-test | RS | per-file census transcribed from pristine vitest; harness self-checks its own matchers and async path — the most docs/34-conformant suite in the repo |
| tokenpress-build | RS | version stamp both directions; wrapper regex fails loud |
| exporter-comparison | R? | shape 17: both sides downstream of one resolved theme + one regen (ancestor's own gates compensate); rule-paired VALUES compared nowhere (documented in-file); `after: tokenpress-build` rationale false (imports source, not dist) |
| consumability | RS | post-#642 RULE/pin split verified landed; value-shape residual fenced by ancestor gates |
| lint-skills | **VW** — M20 | `.ts`-only existence scan; a dead `.mjs` citation passes clean; self-check inherits the blind spot |
| lint-us-english | **VW** — M8 | shape 17: regen's lists feed scanned set and promise list |
| lint-voice | **VW** — M8 | same ancestor; plus root README in neither its scope nor its header's account of the divergence |
| lint-doc-gates | **VW** — M7 | name-only join: a repointed `cmd` passes both directions with no gate anywhere comparing commands |
| typecheck-components | RS | the register's worked example; floors, fixtures, and both directions all present |
| lint-layout-claims | RS | residuals declared in-file (region membership manual; relRefCount floor bounds total death only) |
| lint-decisions-index | R? | `catch { continue }` on a tracked doc; scope is docs/** only; no per-run fixtures |
| lint-context-nodes | R? | hand vocabulary, forward-only; growth can mask partial loss under the ≥9 floor; recipe (M6) recorded |
| lint-ratio-truth | **VW** — M14 | shape 15: checked set filtered by the subject's own `min` stamps; color.ts under both sides (shape 11) noted |
| lint-axis-values | RS | authored register + git oracle + both directions; latent Arm-A/Arm-C coupling noted |
| lint-progress-order | **VW** — M11 | format-blind at the live edge where every new entry lands |
| lint-payload-manifest | **VS** (observed under M8) | its STALE RULE arm fired by name on the ENGINE_ARTIFACTS removal |
| lint-overlay-completeness | **VW** — M2 (given) | shape 17's naming instance, demonstrated end-to-end incl. full-list PASS |
| lint-paint | **VS** (census arms, observed under M5/M17b) + R? residuals | census fires by name as designed; arm 1 examined-key count unasserted; header stale re: checkbox censusability (M4 recipe recorded, not run) |
| lint-paint-placement | **VW** — M5 | no converse over ACTUAL's node set; an undeclared painted node passes its ✓ |
| lint-rung-names | R? | flat-ladder degeneracy passes all arms (shape 14 recipe recorded); registry-membership ancestor covered only by composition with typecheck-components |
| lint-shape-index | R? | body-swap invisible to both arms; baseline hand-editable in the same PR with no ratchet (vs token-contract's version gate); citation ranges parse only their first number |
| lint-schema-classification | **VW** — M9 | a commented-out literal satisfies the hand-named class; fail-open in the one direction the gate exists to prevent |
| lint-absolute-inset | **VW** — M3 | arm C's `PROBE_PARENTS` block is algebraically unfalsifiable (`seen ≡ gap`) and its success line claims a measurement of the executor it never reads; the property is soundly delegated to plugin-test (verified) |
| lint-standalone-floor | RS | per-mechanism positive+negative controls; member-0 scoping documented |
| lint-glyph-geometry | **VW** — M1 (ancestor) + **VS** (throw arm, observed under M17b) | template resolution genuinely gated; glyph identity ungated repo-wide |
| lint-unclaimed-defaults | **VW** — M17b (boundary measured by M17) | `catch { continue }` with no exemption list; three defs left the sweep under a PASS |
| lint-advisory-expiry | **VW** — M10 (+ VS negative control) | injected clock accepted with the invalidating fact demoted to prose inside a green log |
| smoke | **VW** — M18 | the `op < 0.02` carve-out excludes fully-invisible text; summary asserts the falsehood affirmatively. Shape-14 threshold + missing classifier confirmed still open (register row 2026-08-13); motivating case now unreproducible in the app and kept by no fixture |
| *(runner, gate 0)* | **RS** (corrected) | self-checks real and both-directional, and their CI reach is **declared, not inherited**: `ci.yml:293-294` runs `npx --yes tsx@4 verify.ts --list` as a dedicated step for exactly this purpose. An earlier revision of this row carried the opposite claim as R? — falsified by mutation in review of #1058 (weaken `orderViolations` → that step exits 1 naming five self-checks). What removing `lint-doc-gates`' import would actually cost is arm 3's join against the runner's **authored** array — shape 2, not lost self-checks; recipe M26 |

## Findings ranked by what a false pass costs

1. **M13 — drift's `removed` arm cannot fire.** The repo's most trusted gate; an emitter that
   stops emitting is invisible to the entire list, and the artifact-count pins count the corpse.
2. **M7 — nothing compares the runner's commands to CI's.** The pre-push instrument can silently
   not run the unit suite while its table says PASS.
3. **M1 — glyph identity is ungated repo-wide** (shape 17). A wrong *picture* ships at 45/45 green;
   the cost is a visibly wrong product with maximal confidence.
4. **M14 — the a11y ratio gate's population is chosen by the subject** (shape 15 + 18). Losing
   `min` stamps removes a family from every checker; the borrowed catchers' remedy launders it.
5. **M2 — the overlay gate's counts read as mode-system coverage** (shape 17, given). Value-tier
   ancestor mutations pass whole-list.
6. **M8/M9 — the prose-scope lattice has two silent exits** (shared ancestor; comment-matching
   census). What stops being scanned stops being defended, with the census asserting otherwise.
7. **M23/M24 — the studio suites can certify nothing** (0 assertions at exit 0) **and certify
   deleted checks** (reimplemented battery).
8. **M17b/M5/M18/M11/M20/M10/M15/M3** — per-gate holes with bounded blast radius, each with a
   recorded reproduction.

## What this sweep did not cover, and why

- **test.ts interior (~7,200 of 12,090 lines)** beyond the targeted blocks (stub, ring, pending,
  parity, icon, rename-map): sampled by grep only. Any independence defect wholly inside the
  unsampled regions is not covered by any verdict above.
- **9 of the 11 plugin test files** `apps/plugin`'s `test` script chains (`test-write.ts`,
  `-surface`, `-readback`, `-persist`, `-float`, `-styles`, `-list-fonts`, `-apply-summary`,
  `-build-telemetry`): not read. Two were read — `test-write-components.ts` and
  `test-write-typography.ts`. An earlier revision of this bullet said "8 of 11" while naming nine
  files; corrected in review of #1058, and worth noting where it sat: in the coverage section, whose
  only job is to be countable.
- **TokenPress's 22 ported test files**: the harness and census were audited; the ported tests were not.
- **Recipes recorded but not run** — all nine are written out in
  [`gate-sweep-recipes-2026-08-26.md`](gate-sweep-recipes-2026-08-26.md), one section each, with the
  edit site labeled ANCHOR VERIFIED or ANCHOR UNRESOLVED: M4 (lint-paint checkbox header), M6
  (context-nodes vocabulary), M12 (voice README), M16 (`GROUND_INPUT`), M19 (smoke fade
  re-introduction), M21 (check-ignore out-of-studio input), M22 (contrast/smoke joint hole), M26
  (runner import decoupling), M27 (mcp-test frontmatter probe). Six carry verified anchors; three
  (M6's edit site, M22's render site, M27's error-construction site) are marked unresolved rather
  than guessed. Tracked as work in #1074; M16 and M19 are named there by id because they were the
  two the issue set otherwise did not describe. **An earlier revision of this bullet cited a map
  that was never committed** — nine dead references, which is CLAUDE.md principle 3's own failure
  mode inside the note documenting the discipline. Found in review of #1058.
- **CI-only behaviors** (Vercel deploy path, `build:site`) were reasoned from source only.
- The five read analyses were produced by parallel agents; every finding they proposed was either
  re-verified here by mutation or is labeled REASONED with its source lines. Two agent predictions
  were **downgraded by measurement** (M15: corpus removal is caught, incidentally; M17: the drastic
  variant trips type floors) — recorded as such rather than reported at prediction strength.

## Evidence ledger (verbatim from the campaign)

# Gate-independence sweep — evidence ledger (working copy)

Baseline: worktree /tmp/p3-gatesweep at 75a3541 (origin/main), clean.
Baseline verify: 45/45 gates reached a verdict in 139s — 45 PASS · 0 FAIL · 0 SKIP · 0 ADVISORY.
Baseline engine-test: 2567 passed, 0 failed (stable across two runs; brief expected 2572 — delta noted, not explained yet).

Verdict vocabulary:
- VERIFIED-SOUND    — mutated; THIS gate among failures BY NAMED ASSERTION; diff + output recorded
- VERIFIED-WEAK     — mutated; gate stayed green (or wrong arm fired) over the case it exists for; finding
- REASONED-SOUND    — read only; independence argument recorded; no mutation run
- REASONED-SUSPECT  — read only; specific hypothesis; mutation not run (say why)
- NOT-REACHED       — no verdict; say why

Mutation protocol (every mutation):
1. git add -A && git commit --allow-empty -m "wip: checkpoint before <id>"
2. apply mutation; assert diff non-empty (git diff --stat)
3. run target gate (+ others as needed); capture output verbatim
4. grep named assertion; blank grep = failed mutation, not a quiet pass
5. git checkout -- <files>; git status clean vs HEAD

## Ledger rows
(appended as verdicts land)

### M13 — drift (regen --check) + drift-coverage: VERIFIED-WEAK (shape 4: the removed arm measures a constant)
Checkpoint: 9909f2e. Mutation: `process.exit(0)` inserted at emit-levers.ts:16 (before its only writeFileSync)
— the emitter stops emitting schema/lever-manifest.json entirely. Diff: 1 file, +1 line.
Observed: `regen.ts --check` → "✓ in sync — 114 committed artifacts byte-match what the engine emits."
Full `npm run verify` under the mutation: **45/45 PASS, 0 FAIL** (138s).
Mechanism: no emitter ever deletes; check() regenerates in place over its own snapshot, so after ⊇ before
structurally and the `removed` ("stale") verdict is unreachable; the corpse keeps the count at 114 so both
EXPECTED_ARTIFACTS pins stay green. Restored: clean.

### M7 — lint-doc-gates arm 3 (+ runner self-checks): VERIFIED-WEAK (shape 5: the join proves the lists agree, not the commands)
Checkpoint: (M7 wip commit). Mutation: verify.ts:347 cmd engine('test.ts') -> engine('mcp-test.ts').
Observed: lint-doc-gates → "runner: verify.ts — 45 gate(s) vs 45 runnable ci.yml step(s), both directions ...
✓ clean"; verify --list shows engine-test and mcp-test both running mcp-test.ts (self-checks green);
`verify.ts engine-test` → "1 PASS" in 6s (mcp suite ran under the unit-test row). No gate anywhere compares
Gate.cmd to ci.yml's run:. Cost: local `npm run verify` (the pre-push instrument CLAUDE.md §4 names) can
silently not run the 2567-assertion suite while its table says engine-test PASS. Restored: clean.

### M14 — lint-ratio-truth (+ test.ts contract arm): VERIFIED-WEAK (shape 15: the checked set is filtered by the subject's own metadata)
Mutation: modes.ts:1335 — text.on-inverse family's put(..., s.min) -> put(..., 0). The family loses its
gating metadata; every checker that selects rows by `r.min > 0` loses the family from its population.
Observed: lint-ratio-truth "✓ clean — 30456 gated ratios" (baseline 34128; 3,672 rows silently absent,
floor 2000 far below); test.ts 2566/1 where the ONE failure is "aurora.design.md → byte-identical to
out/aurora.tokens.json" (a byte-drift assertion, NOT a contrast-contract assertion — the contract arm
went green over the family's disappearance); regen --check fires only because `min` is serialized into
artifacts, remedy "regen and commit" — following it would re-green everything with the a11y contracts gone.
Neither owner gate is among the failures by name. Restored: clean (baseline count re-measured 34128).

### M1 — lint-glyph-geometry (+ test.ts icon pins, drift, whole list): VERIFIED-WEAK (shape 17: generated ancestor under both sides)
Checkpoint: (M1 wip). Mutation: swapped the <path d> outlines of icons/check-line.svg and home-line.svg
(both single-path 24x24 currentColor, so emit-icons' shape floors pass); npx tsx regen.ts regenerated
icon-glyphs.ts + all downstream artifacts. Observed: lint-glyph-geometry → "✓ every member carries its
OWN filled outline..."; regen --check ✓ 114; test.ts 2567/0 — including the :10899 pin, which imports
ICON_PATHS from the same regenerated ancestor. Full `npm run verify`: **45/45 PASS**. A checked checkbox
renders a house; nothing in the repo holds the glyph vocabulary to the pictures. Restored: clean.

### M2 — lint-overlay-completeness (the GIVEN instance): VERIFIED-WEAK (shape 17: one in-memory tree written to both sides)
Checkpoint: d15a07b. Mutation: theme.ts:1486 dark inset shadow alpha 0.3 -> 0.33 (dark-only value, no
contrast contract); regen. Observed: lint-overlay-completeness "✓ clean — 2385 varying leaves across 12
overlays in 4 brands" — the mutated value flowed into canonical AND overlay in one emitTheme call and the
gate counted it into its own summary. test.ts 2567/0; regen --check ✓ 114 post-regen. Full verify over the
committed mutated state: **45/45 PASS** (drift pair legitimately SKIPs on a dirty tree — the runner's own
discipline — so the mutated state was wip-committed for the run, then hard-reset to checkpoint). Restored: clean.

### M8 — lint-us-english + lint-voice: VERIFIED-WEAK (shape 17: regen's artifact list feeds both the scanned set and the promise list)
Checkpoint: (M8 wip). Mutation: regen.ts:50 — removed 'nb-regression-report.md' from ENGINE_ARTIFACTS.
Observed: lint-us-english "✓ clean — no en-GB spellings in any shipped surface"; lint-voice "✓ clean" —
the report left the gated set AND the emitted-reports promise in lockstep; neither gate's scope arms fired.
Catchers (borrowed): regen --check count line + lint-payload-manifest STALE RULE (see run output) — both
about drift/classification, not prose scope; the count pin's own failure remedy ("update EXPECTED_ARTIFACTS
here AND ci.yml, same PR") erases the backstop if followed. Neither prose gate among failures by name. Restored.

### M9 — lint-schema-classification: VERIFIED-WEAK (shape 12 flavor: the probe reads source text that contains prose about the subject)
Mutation: lint-us-english.ts:232 commented out (// prefix); the string literal survives in the comment.
Observed: lint-schema-classification lists token-contract.json as "authored, prose-gated in both" and prints
"✓ clean — every schema file has a decided place" (regex matched the comment); lint-us-english "✓ clean"
(file left scope; the broad /schema/ surface predicate stays satisfied by siblings). No gate fires anywhere;
the contract baseline's prose is unscanned while the census asserts it covered. Restored: clean.

### M15 — token-contract --check corpus membership: VERIFIED-PARTIAL (downgraded from the map's prediction)
Mutations: corpus entries for harbor (M15) and wendys (M15b) each commented out in turn.
Observed: --check exits 1 BOTH times — but the verdict names one ADDED path each ("motion.duration-ms.40" /
"font.typeface.inter": the path only that brand excluded from the intersection), not the corpus change; the
"corpus: 4 brands" line is printed and asserted by nothing (baseline stores 5; informationalOnly omits
`corpus`); the instructed remedy (--accept at MINOR) rewrites baseline.corpus to 4 with no signal beyond the
one path line. So: membership shrink is caught for these members by incidental path arithmetic, misdescribed
by the verdict, and laundered by the remedy. A member whose exclusions are fully shadowed would be silent;
none exists in today's corpus (measured for 2 of 5). Restored: clean.

### M17 — lint-unclaimed-defaults catch{continue}: VERIFIED-WEAK with measured boundary (#864 shape, post-#864)
M17 (throw for all defs but button): gate FAILS via A2/A5 type-representation floors, exit 1 — the floors
bound the blindness. M17b (throw for radio+switch+field-message, types surviving elsewhere): gate prints
"PASS — every visually-significant property on every built node traces to a decision", exit 0, with three
whole components silently absent from its sweep. Other gates fire on M17b (lint-glyph-geometry exit 1
naming radio/switch — its post-#864 throw reporting), so the suite goes red WITHOUT this gate among the
failures. catch{continue} at apps/plugin/lint-unclaimed-defaults.ts:343 has no enumerated exemption list
and reports no verdict for "could not project". Restored: clean.

### M23 — studio-test (test-provenance): VERIFIED-WEAK (shape 9 cheap tell: a printed count nothing asserts)
Mutation: `ok()` body neutered (early return). Observed: "✅ ALL PASS — 0 assertions executed", chain exit 0;
the studio-test gate row would read PASS in verify/CI. The #659 assertion-floor fix stopped at the two
engine suites; all five app suites lack it. Restored: clean.

### M24 — studio-test (test-export-settings §8): VERIFIED-WEAK (shape 2, #387's exact shape: the mutation battery drives reimplementations)
Mutation: the shipped `unreachable` rule (export-settings.ts:578-582) fully commented out. Observed: exit 0,
"✅ ALL PASS — 33 assertions executed", including the row "✓ MUTANT setting on the unbuilt source only →
caught: 'tokenNameCase: unreachable'" — the mutant is caught by the suite's local `declDefectsOf` copy while
the shipped predicate no longer contains the rule. The suite certifies a check that does not exist. Restored.

### M5 — lint-paint-placement: VERIFIED-WEAK (scope: no converse over ACTUAL's node set)
Mutation: every plan root gains a synthetic child { name:'debug-bg', type:'FRAME', paints:{fills:'color/
background/primary'} } no def declares. Observed: lint-paint-placement "✓ paint lands on the part the def
nominated, and moving the interaction target moves nothing", exit 0 — compare() iterates declared parts
only; an undeclared painted node is invisible to the gate whose question it answers wrongly. lint-paint's
census fires (census/icon|focus-ring|button DRIFTED) as the borrowed backstop — a characterization that can
only say "different", not "an undeclared node carries paint". Restored: clean.

### M18 — smoke (test-smoke.mjs): VERIFIED-WEAK (shape 15: the sweep's set excludes the extreme of its own defect class)
Mutation: `.stage-t b{opacity:.011}` appended to styles.css (every nav label fully invisible); rebuilt.
Observed: smoke exit 0 — "72 page × mode states, 14998 text nodes measured. Lowest rendered contrast
anywhere: 3.04:1 (floor 2.0:1)". The op<0.02 carve-out (test-smoke.mjs:140-143) treats fully-invisible text
as presumed mid-transition and never measures it, so the summary affirmatively asserts what is false on
screen. lint-contrast green (declared values legal). Restored + rebuilt: clean.

### M11 — lint-progress-order: VERIFIED-WEAK (shape 9/15: floor guards total death; the live edge is format-blind)
Mutation: two dated `## YYYY-MM-DD — ...` entries (pre-convention spelling, no parens) inserted ABOVE the
newest parsed entry, deliberately out of order (08-30 before 09-01). Observed: exit 0 — HEADING_RE matches
neither; the 441 legacy entries keep the parse floor satisfied; #931's defect class recurs at the exact
file position where every new entry lands. Restored: clean.

### M20 — lint-skills: VERIFIED-WEAK (shape 3: the #650 fix's detector class is .ts-only)
Mutation: appended "run `apps/studio/does-not-exist.mjs` before shipping." to skills/prism3-consume/SKILL.md.
Observed: "✓ clean — every name a skill quotes resolves...", exit 0. The file-existence scan matches \.ts\b
only; .mjs gate citations can rot silently, and the self-check samples only .ts fixtures (inherits the
blind spot, #464). Restored: clean.

### M10 — lint-advisory-expiry: VERIFIED-WEAK (verdict-relevant condition reported outside the verdict channel)
Two-step: (a) negative control — expired advisory claim added to docs/27, real clock: exit 1, claim named
("docs/27-future-ideas.md:333 — EXPIRED") — the gate works; (b) same claim, PRISM3_TODAY=2026-01-01: exit 0,
"⚠ INJECTED via PRISM3_TODAY" printed inside "✓ clean". A one-line env: addition in ci.yml freezes every
window forever; lint-doc-gates parses only name:/run: so nothing would see it. Restored: clean.

### M25 — test.ts icon guard (:10884 find-by-name, verdict-less false branch): REASONED-SUSPECT (mutation preempted by a crash)
Attempted mutation: icon-set.ts:119 vocabulary rename check->checkmark + regen (the #844-style respell).
Observed: test.ts exit 1 with ZERO ❌ lines — an uncaught projector throw (checkbox's glyph template still
names 'check') at test.ts:11293 truncated the suite (#680's crash-not-failure genre, loud but naming no
gate). The icon guard's silent-skip could not be reached by this route; its verdict-less false branch
(`if (iconSet.length && onePlan)` with no else-verdict) stands as a reading-verified hazard — the same
mechanism #918 fixed, one literal over. Restored: clean.

### M3 — lint-absolute-inset arm C vs plugin ring checker: SPLIT VERDICT (+ an auditor-side non-mutation caught)
First attempt: sed addressed line 1218 (actual site 1217) — a NON-MUTATION producing three plausible greens;
caught by the protocol's diff assertion (docs/34 corollary 2, demonstrated on the auditor; recorded, not smoothed).
Properly applied (write-components.ts:1217 `inset = gap + sw` -> `gap - sw`, the exact #801 arithmetic):
- plugin-test exit 1, ring checker fires BY NAME in the requirement's units: "the visible gap is -2 — ...
  outer edge INSIDE the border it exists to be distinguishable from (#801)" → test-write-components ring
  checker VERIFIED-SOUND.
- lint-absolute-inset exit 0, still printing "✓ every declared inset part leaves its brand's full gap of
  visible background — measured as (offset − the inward stroke)" → its PROBE_PARENTS block is algebraically
  unfalsifiable (b.x := -(gap+stroke); seen := -b.x - stroke ≡ gap) and its success line claims a
  measurement of the executor it structurally cannot make. VERIFIED-WEAK on the claim; the property is
  soundly delegated (and the delegation works, by name) — the finding is the dead block + false line.
Restored: clean.

### R1059-b — regen `--check`'s `out/` class, added in review of #1058: VERIFIED-WEAK (the `removed` arm proper)
Motivated by the reviewer's correction: M13's demonstrated instance was a `SCHEMA_ARTIFACTS` entry,
compared by fixed-list pairwise byte-equality (`regen.ts:133-135`) which has **no removal concept**,
while the `removed` arm this sweep named (`:130`) governs `out/` only. So the `out/` class needed its
own reproduction.
First attempt was a **mutation artifact**, recorded because it is the sweep's second: `process.exit(0)`
at emit-figma.ts module scope made `mcp-test` FAIL (34.4s) — not a catch, an importer dying. The
mutated thing was not the thing that decides.
Corrected mutation: `emit-figma.ts:232`, inside the `isMain` block — the write loop
`for (const a of artifacts) writeFileSync(...)` replaced with a no-op, suppressing writes only.
Observed: **82 committed `out/figma/**` files unemitted**; `regen --check` → `✓ in sync — 114
committed artifacts byte-match what the engine emits`, with the step log printing
`emit-figma     (out/figma/**) … ok`; full `npm run verify` → **45/45 PASS · 0 FAIL**.
Delete census (read-only, same session): `rmSync|unlinkSync|rimraf|rmdirSync` across all nine STEP
scripts → **0 hits**; the only engine deletes are `regen.ts:142` and `:159`, both restore-path. So
`after ⊇ before` holds by construction and `:130` is unreachable, not merely unreached.
Restored: clean. Measured on the rebased tree (3c3852c), where `engine-test` reads 2585.
