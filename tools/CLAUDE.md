# tools/ — measurement harnesses

Everything here is runnable and committed, but nothing here is wired into `ci.yml` by default. That
is the organizing idea, and it is worth stating once rather than per-tool: **a tool answers a
question and exits 0; a gate asserts an answer and fails.** `tools/exporter-comparison/` is the one
harness with a gate sibling, and it lives in a *separate file* from the measurement for exactly that
reason — `compare.ts` (the tool) and `gate.ts` (the gate) import the same analysis but make different
promises, and conflating them would make the tool's honest "here's what differs" read as the gate's
"here's what's wrong." The other three harnesses below have no gate sibling, each for its own stated
reason — read the reason, not just the absence, before assuming one is missing by oversight.

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
#693). Filed as #942 to get proper treatment in this file rather than folded in as an afterthought.
