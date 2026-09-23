# tools/ — measurement harnesses

Everything here is runnable and committed, but nothing here is wired into `ci.yml` by default. That
is the organizing idea, and it is worth stating once rather than per-tool: **a tool answers a
question and exits 0; a gate asserts an answer and fails.** `tools/exporter-comparison/` is the one
harness with a gate sibling, and it lives in a *separate file* from the measurement for exactly that
reason — `compare.ts` (the tool) and `gate.ts` (the gate) import the same analysis but make different
promises, and conflating them would make the tool's honest "here's what differs" read as the gate's
"here's what's wrong." The remaining harnesses below have no gate sibling, each for its own stated
reason — read the reason, not just the absence, before assuming one is missing by oversight. (Named
rather than counted on purpose: this line once said "three" and went stale as harnesses were added.)

## `tools/exporter-comparison/`

Runs prism3's own DTCG emitter and TokenPress's over the same brand and classifies every difference
(#697's Verify bullet). `compare.ts` reports all five categories and always exits 0 — most of what it
finds is a difference that is *right for its host*. `gate.ts` is the assertable subset, run in CI: it
fails on the seven arms where a difference means one exporter is *wrong* rather than merely
*different*. Its third file, `axes.ts`, is neither tool nor gate — it is #697's recorded **decision**
about which collections' modes are an axis, wired in so mislabeling one fails a gate rather than
sitting unchecked in prose. Don't promote a category from `compare.ts`'s five into `gate.ts`'s seven
without deciding it is a *defect* rather than a documented disagreement; the categories deliberately
left out are named in `gate.ts`'s own header, with why.

## `tools/nest-exposed-cost/`

Measures what a `nest-exposed` nested part would cost the parent that exposes it (#681) — panel rows
against Figma's ceilings, and payload bytes through the real chunk packer. **No gate sibling, on
purpose:** nobody has decided what the ceiling ought to be, so there is no answer yet to assert.

Read its header before quoting a number from it. **#761 read its own byte figure wrong, and a
reviewer caught it:** worst-chunk fullness is near-budget *by construction* (`pack` fills until the
next variant will not fit), and chunk overflow is absorbed by adding chunks — so "4 bytes of
headroom" was an artifact of the packing algorithm, not a cliff about to be hit. The ceiling that
means something is the **indivisible unit** — shell + largest single variant, since no re-packing can
split one variant across two calls — which sits at 49% of budget on the largest real set. The
generalizable trap, worth carrying past this one tool: an instrument found non-monotonic is
disqualified for *every* reading taken from it, not just the one that prompted the check.

## `tools/forward-claim-check/`

Finds present-tense claims about *mutable* issue state in tracked prose (`blocked on #N`, `#N is
still open`, `parked pending #N` — written schematically here on purpose, see below) and reports each
against the state the cited issue is actually in. Only a small fraction of the repo's issue citations
qualify as reportable sites; see the file's own header for the live count rather than trusting a
number here, since a hardcoded snapshot would go stale the same way the claims it detects do.

**No gate sibling, for three independent reasons, strongest first:**

1. **The misses cluster on the issues it already catches.** One issue can be caught at a single site
   and claimed at six more in words no pattern covers, so a gate goes green the moment somebody fixes
   the one sentence it named — `docs/34` shape 9 producing *evidence-shaped output rather than
   silence*, and this holds **even at 95% recall**, since it is about the distribution of the misses
   rather than their count.
2. **Recall was measured once at 11.0%, 95% CI [5.8%, 15.2%]** — a **dated snapshot, not a live
   figure**. `recall-snapshot.mjs` carries the counts, re-derives the interval from them, and states
   plainly what does not reproduce (the frame generator was not kept, and 32% of the roster sites have
   already moved or gone) — it even checks its own expiry against today's reportable count, a check
   that already fires, since the guest exclusion moved a site out of the numerator days after the
   measurement. **Quote this figure with its date and its drift, never bare.** A finite number invites
   *"so raise it,"* which is why it does not lead this list.
3. **The error costs are asymmetric.** A missed stale claim is the status quo; a false STALE at full
   confidence is worse than having no tool at all, because someone "fixes" a sentence that was right.
   A gate here would report clean over everything it cannot see (`docs/34` shape 9).

It exits non-zero **only when the instrument itself is broken** (zero citations found, a corpus below
the recorded baseline, a pattern that stopped firing on its own sample, a stale register) — never
because a claim is stale.

Its exclusions — append-only dated journals, vendored guest sub-projects (a guest's `#N` names its
**own** tracker, so a corpus spanning more than one issue namespace has to resolve namespace before
state), and claims *quoted* rather than asserted — are properties of the **document**, not of the
pattern. Narrowing the pattern instead would score better and know less; its own header says so at
length.

**Genre is only half the namespace problem, and the recall sample proved it.** Of nine
foreign-namespace claims measured in the corpus, six sit inside the guest and are covered, but
**three sit in our own prose, where the document is ours and only the citation is foreign** —
nothing about the file marks it, and an unmarked `#N` here is *provably* ambiguous, since the same
small numbers name both a guest issue and one of ours. Those three are registered, not resolved: a
marker convention (`owner/repo#N`, which the guest's own source already uses) would fix citations
written after it and is a house-style decision nobody has taken. **The registers are hand-maintained
lists of exceptions to a low-recall detector, and inherit both weaknesses** — the foreign-namespace
register held one of nine until somebody measured — so read a count from this tool as a floor, never
as coverage.

Three artifacts sit beside `measure.ts` and back **different** claims, which is the point:
`recall-snapshot.mjs` + `recall-classification-record.txt` back the recall figure, and
`form-probe.mjs` backs the *clustering* argument by showing the pattern set recognizes **0 of 11**
real corpus phrasings for one claim. Sixteen hand-picked sentences cannot estimate a rate — do not
read a percentage out of the probe, and do not cite it for recall. Issue states come from a committed
`issue-states.json` resolved via the GitHub MCP tools, so verdicts are only as fresh as that file.

**One hazard worth carrying into any prose you write about this tool, including this file:**
quoting a live claim verbatim in a non-journal document is indistinguishable from asserting one —
an earlier draft of the row this file replaces cited a real closed issue as an example and the tool
duly reported `CLAUDE.md` itself as stale. Write examples schematically (`#N`), or expect the
documentation of a detector to be caught by the detector.

## `tools/block-capture/`

A fourth harness in this directory, undocumented here until now — see its own `README.md` for what it
does and how to run it (records block-layout structure from a real browser for the `docs/37` corpus,
#693). Filed as #946 to get proper treatment in this file rather than folded in as an afterthought.

## `tools/binding-audit/`

Builds the EXPECTED `(component, member, node, slot) → bound-variable` ledger from the engine's
projection (`figmaAnatomyPlan`) and diffs the ACTUAL emitted binding against it, reporting **unbound**
slots (a declared color bind the projector returns at no coordinate — the baked-where-it-should-bind
class) and **mis-bound** slots (a slot bound to a role whose family mismatches its kind — the #1471
glyph-inks-a-`text`-role class). `audit.ts` reports and exits 0; `--ledger` emits the per-member
ledger JSON (the ledger is brand-invariant — the plan carries variable names, not values). #1499.

**`--reconcile <export.json>` / `reconcile.ts` (#1511)** extend the tool from the engine's emission to
a LIVE file. A read-only console snippet (documented in the README) dumps a Figma file's ACTUAL
per-node bindings as small, versioned JSON; `--reconcile` diffs that against the ledger and reports
**MATCH / WRONG-TOKEN / UNBOUND / EXTRA / UNKNOWN-NODE** per `(component, member, node, slot)`, plus
coverage — WRONG-TOKEN (bound to the wrong variable) is the check the owner's unbound-only QA script
lacked. `ledger.ts` holds the one ledger builder both `--ledger` and `--reconcile` share, so the
snippet and the reconciler cannot key on different coordinates. Still a tool, not a gate: a live file
is not in CI, so it answers and exits 0. `reconcile.ts --selftest` is a fixture round-trip built from
the live ledger (all-correct → MATCH; one wrong → one WRONG-TOKEN; one blank → one UNBOUND; one stray
→ one UNKNOWN-NODE) — a self-check the author runs, NOT wired into `ci.yml`; the gate count stays 60.

**#1523 closed three REACH limits** the reconciler had against a live file (all correct-by-hand in the
NB run — instrument limits, not file defects), each with its own by-name selftest arm: (1) glyph-container
ink the export snippet reports on a non-`INSTANCE` child shape now FOLDS onto the ledger's container
coordinate (`foldDescendantInk`) instead of being skipped; (2) loose `icon/<name>` components (a
standalone `COMPONENT`, no variantProperties) now MAP onto the ledger's `icon`/`name=<name>` coordinate
(`mapLooseComponents`) instead of scoring UNKNOWN-NODE; (3) the group SETS (`checkbox-group` /
`radio-group`) carry an EMPTY ledger BY DESIGN — they declare no paint of their own, so the label and
rows paint from their nested defs and are audited under `field-label` / `checkbox-row` / `checkbox-control`,
never the group. INVESTIGATED and confirmed NO coverage hole (nothing binds only through a group set);
a group set reading UNKNOWN-NODE for a nested bind is the instrument working as intended (the ~500-entry
mechanism). Recorded so QA does not re-raise it every round; a paint slot added to a group would be an
ENGINE projection change, not a reconciler one.

**No gate sibling, on purpose, and the reason is the mis-bind pass's nature rather than its youth.**
It is a HEURISTIC: `ALLOWED` (slot-kind → role-family) is authored from design semantics, and the
corpus carries deliberate cross-slot bindings that a first-principles map would flag but that are
already pinned elsewhere — the disabled outline edge binding `color.disabled.icon` not
`color.disabled.border` (#1349, pinned by name in `packages/engine/test.ts`), the switch thumb's
`on-fill` fill, the switch glyphs' `fill` ink. `ALLOWED` admits those *with a stated reason*, so a run
over today's corpus is clean; a gate here would either re-encode those exemptions (duplicating
`test.ts`/`lint-paint.ts`) or assert a bare zero. The unbound half deliberately OVERLAPS
`lint-paint.ts`'s arm-3 reachability — the value is one consolidated ledger + survey, not a second
enforcement. If a specific mis-binding hardens into a contract, a gate enforces THAT one separately,
as #1499 states. The instrument earns its keep by lighting up on a regression (revert #1471 and it
names every icon-button glyph) or on a drifted live Figma file, not by being red today.

## `tools/conformance-scan/`

*"Does what is in this Figma file match what the Prism3 engine says should be there?"* (#1553 P1). Two
halves and a shared shape: `expected.ts` projects a normalized `State` from a brand CONFIG (the
`figmaAnatomySet` plans, the contrast contracts, `ENGINE_VERSION`, and the emitted Figma artifacts), a
read-only `figma_execute` snippet (in the README) builds the same `State` from the open file, and `diff.ts`
compares them in nine categories — binding presence and target, per-mode value, mode coverage,
scope/type, structure, contrast re-measured on the file's own colors, generator staleness, and the style
definitions' own interiors.

**The config is an INPUT (#1569), and that is the load-bearing thing about `expected.ts`.** A committed
brand (`expected.ts aurora`) reads `out/figma/<brand>/`; a supplied brief (`--design <path>`, which is
what the studio's "Export design.md" writes and what Apply actually posted) is projected through
`figmaArtifacts(theme)` instead — the function `regen` writes through, so it is the same emission reached
two ways, measured byte-identical for all 27 aurora artifacts and all 26 wendys ones. Without the flag,
every lever an operator moved before applying reads as drift: one real scan went from 62 `high` findings
outside category (a) to 1 with nothing about the file changed. Do **not** make this easier by inferring
the config from the `actual.json` — `docs/34` shape 1: the expectation would then agree with the file by
construction and report clean over the drift it exists to find. The config is what the emitter was TOLD,
which is why it can only come from upstream of the file.

**P2 closes the loop — build, scan, FIX, re-scan — and the safe/unsafe boundary is the whole design
(#1553 P2).** `fix.ts` emits a `FixPlan` and applies nothing; the writes are the operator's, through one
`figma_execute` in the README, dry run first. Exactly two op shapes are safe: (c) `setValueForMode` back to
the engine's value, and (a) a rebind of a raw literal to the variable the engine plans — **only when that
variable is in the file**, which is the distinction the whole tool turns on, since the two halves of (a)
are the same shape in the report and only one is a fix that can run. Every other finding is carried as an
`excluded` entry with a reason, because `ops + excluded === findings`: a plan that is a silent subset of the
diff teaches its operator that the plan is the remaining work, which is exactly the belief that makes (f)
dangerous. Do **not** widen the safe set to "any finding with an obvious fix" — (f) is a rebuild behind a
`STALE` guard (decision #5, held by the owner), (b) is a design decision, (d) is the reconciler's (#1570),
(h) is a rebuild, (g) is a consequence a value fix resolves. And the direction that matters in its net is
the *opposite* of every other check here: a missing fix is an inconvenience, an EXTRA op is a destructive
tool, and it fails silently because the damage lands in a Figma file rather than in this repo. That is why
`fixtures/fix-manifest.json` is hand-written and asserted in both directions, and why the two mutation arms
that remove a safety guard are the load-bearing ones. It is also why the config being an INPUT stops being
cosmetic here: a plan built without `--design` would write the brand's **lever defaults over the operator's
moved levers** at every coordinate #1569 makes read as drift, so every such plan carries a standing warning
in its `notes` saying which config it was built at. A false positive in a report is noise; the same one in a
plan is a write.

**No gate sibling, and the reason is the subject rather than the difficulty.** The thing it measures is a
Figma document, which is not in CI and is not owned by this repo: a designer nudging a value is a real
finding and not a defect any commit here can fix. So it exits 0 carrying findings. What *is* gated is the
harness's own correctness — `diff.ts --selftest` over committed fixtures, `expected.ts --selftest` over the
two `fixtures/levers-*.design.md` configs, `fix.ts --selftest` over the hand-written `fix-manifest.json`,
and `mutations.sh` behind all three — and those are self-checks the author runs, not CI steps.

**The one thing to read before editing it: `state.ts`.** It holds the join key (`bindKey`, `canonValue`,
`rootOf`, `instanceKey`, `underInstance`) for BOTH producers, and that is not tidiness. A join key computed
two ways is not a noisier diff, it is a useless one — `binding-audit/reconcile.ts` one directory over
compares an `AnatomyPlan`'s pre-materialization names against a live file's materialized ones and reports
5,433 of 5,433 *correct* bindings as WRONG-TOKEN (#1511). Plan names therefore resolve by **lookup**, never
by `${root}/` concatenation, and the brand root is derived (`rootOf` throws rather than picking) because
the root is itself a brand lever.

**Where its lenience lives, and why that differs from `binding-audit/`.** Three plan/file differences are
the same fact spelled two ways — a uniform `strokeWeight` against Figma's four per-side fields,
`descendantFills` one level down, and bindings inherited through an INSTANCE. All three are reconciled in
`diff.ts` and none in the reader, because only the diff knows what was PLANNED at a coordinate;
`binding-audit/` put its one lenience in the reader and its README records the two weaknesses that
followed. The instance case is suppressed and **counted** — 2,705 in aurora — and the count prints as a
note, which is why `Report` carries both `unevaluated` (a blind spot) and `notes` (a judgement with its
number). A suppression with no number attached to it is indistinguishable from a broken arm.

## `tools/claude-md-freshness/`

`mutations.sh` — the mutation battery for `.claude/hooks/session-start-claude-md-freshness.sh`, the
SessionStart report that answers *"is the `CLAUDE.md` this session obeys the current one?"* (#1110). It
builds a stale world out of a bare repo in `$TMPDIR` plus two clones taken before the remote moves, then
runs the check in it. Local `file://` git only — no network, and it never touches this checkout.

**It is the odd one out in this directory: it asserts and it exits non-zero.** That makes it gate-shaped
by the split at the top of this file, and #1123 (owner-confirmed) **wired it into `ci.yml`** — the one
`tools/` battery that is a gate. #1110's original *"no gate, no CI step"* was a scope decision, not an
environmental impossibility, and #1123 reversed it: the battery is every-arm local `file://` git in
`$TMPDIR` with no network and no dependence on this checkout's history, so it runs cleanly under CI's
shallow (depth-1) checkout — confirmed from a depth-1 clone before wiring. The CI step, `verify.ts`'s
`GATES` entry, and the three checklists all name it **for the DETECTOR** — *"the CLAUDE.md-freshness
detector still flags a stale checkout"* — never *"CLAUDE.md is fresh"*, and that naming was the owner's
one condition on wiring it. The reason is the conceptual hazard the gate must not paper over: what
genuinely cannot be a gate is the *subject*. A stale checkout is internally consistent (`docs/34` shape
17), so anything running inside the tree — CI included — reports clean over a stale world, and CI can
never check whether *this* checkout is current. `mutations.sh` tests the DETECTOR, a different subject
from the thing the detector detects, and the name keeps that distinction visible to whoever reads a
green run.

**Two of its three arms invert the usual direction, so read the arm's own wording rather than the
exit code.** M1 mutates the world and the check must FIRE; **M2 mutates the check** — drops the fetch,
reads the local `origin/main` — and the mutant must GO SILENT over a world the real check fires on,
because a mutant that still fires would mean the fetch is decoration; M3 mutates the environment and the
check must say CANNOT DETERMINE. The trap that cost a rewrite is recorded in the file's header and is
worth knowing before adding an arm: **running the real check in a clone fetches, which moves that
clone's `refs/remotes/origin/main` and silently repairs the stale world for every later arm.** One
shared clone made M2 read a repaired ref and "fire", which reads as *the fetch does not matter* — the
opposite of the truth, out of an arm that looked green. Each arm now asserts its own precondition.
