# 43 — The agent instruction surface: what CLAUDE.md should hold, and what should hold it instead

> `CLAUDE.md` is 62,136 bytes — roughly 14k tokens injected into every session, on every lane, before
> any task is read. This is a **proposal** for what moves, where, and what must stay. It does not
> restructure `CLAUDE.md` — see the PR for why that's a separate, later change, one disposition group
> at a time.

---

## 1. The measurement

### The file has grown since it was scoped

The task that produced this doc measured `CLAUDE.md` at 51,478 bytes / 109 lines. By the time a first
draft existed it had grown to 58,820 bytes; **this proposal is based on the file as of `origin/main`
after PR #920 landed, which is 62,136 bytes, still 109 lines.** That is **+10,658 bytes (+21%) since
the file was scoped**, in three additions: two new gates joined principle 4's list
(`lint-decisions-index.ts`, `lint-standalone-floor.ts`, each with a full paragraph of rationale), a new
hazard (the `git checkout <ref> -- <path>` pathspec trap) was appended to the worktree paragraph, and
#920 added `lint-glyph-geometry.ts`'s rationale, which alone grew principle 4's single largest line by
3,289 bytes. The file is not stable while ungroomed; every week of normal work adds another gate's
rationale or another incident's narrative to the same unconditional load. That growth rate is itself an
argument for a mechanism that scales — the measurement below is a snapshot, not a target to defend.

### The metric trap

The documented target is "under 200 lines," and the file is 109 lines, so a line-count check reports
compliance. The real average is **570 bytes/line** (62,136 / 109) — this file's paragraphs are not
short lines wrapped by an editor; they are single physical lines, the largest now over 18,000
characters. **Report bytes, not lines.** A line-count budget on a file with no line-length discipline
measures nothing.

### Section weights (re-measured against the current file — the originally-scoped table is stale, and not only from growth: see the note below)

| Section | Bytes | Share |
|---|---|---|
| Working principles (agent behavior) | 36,282 | 58% |
| Prism3 — the generation engine | 10,926 | 18% |
| What this repo is | 8,924 | 14% |
| Naming conventions | 3,823 | 6% |
| Two parallel token formats / Mode organization / Working with this repo | 2,064 | 3% |

**The "Prism3 — the generation engine" heading is misleading as a scope label, and this matters for
§6.** By byte range (the section runs from that `##` heading to the next), it holds the worktree/`npm
ci` paragraph (line 42, ~6,961B) and the squash-merge paragraph (line 44, ~2,269B) — both are Class 3
git-workflow hazards, not engine documentation, and both already have a disposition group in §4 (rows 3
and 5). Only **~1,696 bytes** of this section — the actual engine description, the two surfaces'
pointers, the one-line workflow statement — is genuinely untouched by this proposal. Treating the whole
10,926 as "out of scope, unaudited" would misstate what's already being addressed elsewhere in this
doc; §6 corrects for it.

### Per-paragraph inventory — every passage over ~1,500 bytes, current state

Each of the following is a single physical line in the source. `trigger` is the class from §3 of the
task prompt this doc answers: **1** = triggered by reading a file in a known directory (nested
`CLAUDE.md` / path-scoped rule can hold it), **2** = triggered by an invoked task (a skill / command /
another doc read on purpose can hold it), **3** = triggered by a shell command with no file read
(cannot be a path-scoped rule; a hook or terse resident prose are the only candidates).

| Line | Bytes | What it is | Trigger |
|---|---|---|---|
| 105 | 18,155 | Principle 4's per-gate rationale: `typecheck-components.ts` through `lint-glyph-geometry.ts` (#920), full narrative for each | 2 |
| 42 | 6,961 | Worktree setup (`npm ci` vs `install`, symlink hazard) **+** the `git checkout <ref> -- <path>` pathspec hazard, appended later | 3 |
| 18 | 6,318 | The `tools/` layer-table cell — `exporter-comparison`, `nest-exposed-cost`, `forward-claim-check`, full reasoning for each | 1 |
| 101 | 4,656 | Principle 4, "Exporter agreement" gate rationale | 2 |
| 78 | 2,411 | US-English rule + the gate's four traps, restated | 1/2 |
| 44 | 2,269 | Squash-merge SHA-rewrite hazard + the `[new branch]` signal | 3 |
| 99 | 1,755 | Principle 4, "Plugin" gate rationale (`test:verdict`) | 2 |
| 96 | 1,751 | Principle 4, "Run them with `npm run verify`" meta-rationale | 2 |
| 97 | 1,701 | Principle 4, "Engine" gate list + `lint-advisory-expiry.ts` rationale | 2 |
| 109 | 1,513 | Principle 5, versioning split | 3 (durable, unconditional — see §5) |

These ten lines total **47,490 bytes — 76% of the file** in ten paragraphs, out of ~40 total. Line 105
alone grew by 3,289 bytes since scoping (#920 appending `lint-glyph-geometry.ts`'s rationale) — the
single largest jump anywhere in the file, and further evidence the section is growing precisely where
this proposal argues it should shrink instead.

---

## 2. The mechanism table

| Mechanism | Reduces context? | What it can hold | Notes |
|---|---|---|---|
| **`@path` imports** | **No.** Expanded and loaded at launch alongside the parent, verified 2026-08-22 against code.claude.com/docs/en/memory. Splitting `CLAUDE.md` into five imported files buys organization and **zero tokens**. | — | This is the fix a reader reaches for first, and the one that doesn't work. State it before anything else or the rest of this table gets skipped. |
| `.claude/rules/*.md` with `paths:` frontmatter | **Yes** — loads only when Claude reads a file matching the glob. | Class 1 content: anything triggered by opening a specific directory. | A rule file with **no** `paths:` loads unconditionally, same as `CLAUDE.md` itself — a rename, not a saving. |
| Nested `CLAUDE.md` | Yes — loads on demand when Claude reads files in that directory. | Class 1 content, same as a path-scoped rule, but for an entire directory's worth of context rather than one glob. | Best fit for `tools/**`, `apps/tokenpress/**` (already has `agents.md`), `reference/**`. |
| Skills | Yes — loads only on invocation or when judged relevant. | Class 2 content: a discipline read at a specific *moment* (e.g. "read this before writing a gate"). | `docs/34` already fills this role today by being read on purpose rather than injected; a skill would formalize the "on purpose" part but doesn't change what already works. |
| Hooks (`PreToolUse`, `PostToolUse`, `SessionStart`) | N/A — not a context-injection mechanism. Fires as a shell command at a fixed lifecycle event. | Class 3 content **with a checkable precondition**: a command pattern, a dirty tree, a symlinked `node_modules`. | The right home for a hazard prose has failed to prevent. This repo already has two: the `PreToolUse` deny on `git push` when `regen.ts --check` fails, and the `SessionStart` `npm ci` populator. Extending precedent, not proposing a new pattern. |
| Block-level HTML comments (`<!-- ... -->`) | Yes — stripped before injection, zero context cost. | Maintainer notes, "why this line exists" asides not meant for the agent to read every session. | Comments *inside* code blocks are preserved — don't rely on this inside a fenced example. |
| `/doctor` | Proposes trims on the derivable-vs-load-bearing axis. | — | **Could not be run as intended in this environment** — the CLI's `claude doctor` checks installation health only (verified: ran it in the worktree, it reports install-method warnings, not memory-file content). The interactive `/doctor` memory review needs a live session. Recorded here as an **open input for whoever runs this proposal interactively** — not fabricated, and not treated as the answer per the task's own instruction. |
| The 4 MiB cap | Not a lever. `CLAUDE.md` loads in full up to 4 MiB; there is no truncation saving us at 58 KB. Shorter files produce better instruction adherence — that's the actual argument for trimming, not a size ceiling anyone is near. | — | — |

---

## 3. The three pinned regions

Do not move content out of these without a matching gate change in the same PR — but read the exact
predicate each one runs before assuming *everything* in the region is load-bearing. All three check
**structure** (which tokens or which table cells exist), never **prose**. This is the finding that
makes most of the size reduction in §4 safe.

### Region 1 — `packages/engine/lint-doc-gates.ts`, principle 4

```
start: /^4\. \*\*Goal-driven execution/
end:   /^5\. \*\*/
```

What it checks (`missingTokens`, `lint-doc-gates.ts:354-359`): for each `ci.yml` step's identifying
tokens (script name + workspace, or the bare `.ts` filename), **some single line within the region
carries every token together**. That's the entire predicate. It does not check paragraph length, does
not check that a rationale exists, does not check that the rationale is accurate. A gate mentioned by
name in a six-word bullet passes exactly as well as one narrated for 900 words. **The only thing this
region cannot lose is the bare command tokens** — `lint-payload-manifest.ts`, `lint-overlay-completeness.ts`,
`lint-paint.ts`, `typecheck-components.ts`, `lint-absolute-inset.ts`, `lint-standalone-floor.ts`, and
the rest, each appearing somewhere in the region on a line that also names its workspace where relevant.

### Region 2 — `packages/engine/lint-layout-claims.ts`, the layer table

```
start: /^## What this repo is\b/
end:   /^## /
kind:  'table'
```

What it checks (`lint-layout-claims.ts:243`): for a table region, **the claim is the FIRST CELL of
each data row, and only that** — i.e. the path (`tools/`, `packages/engine/`, …) must resolve against
`git ls-files`, and arm C separately asserts every tracked top-level layer has a row at all. **The
second cell — the "What it is" description — is never read by this gate.** The 6,317-byte `tools/`
cell could be one sentence and this gate would still pass, provided the row exists and the first cell
still says `tools/`.

### Region 3 — `packages/engine/lint-advisory-expiry.ts`

Labeled `CLAUDE.md §4 / PR template` in the gate's own `FORM_SAMPLES` (its self-check fixtures, not a
live register). **Currently dormant against `CLAUDE.md`**: the file carries no live dated-advisory-
window claim today — the smoke-suite passage that used to carry one already reads in the past tense
(per #775, gating rather than advisory, since the stated window closed) now that the window has passed.
The gate still watches the *pattern*, so it re-arms the moment anyone writes a new one of those claims
into `CLAUDE.md`. Relevant here only as a caution for any follow-up PR from this proposal: **don't write
a dated migration window into the shrunk file** without expecting this gate to hold it to the same
standard. (This paragraph itself is deliberately phrased to avoid restating the gate's own trigger
pattern — an earlier draft quoted the closed claim's marker phrase and its resolved date close enough
together to trip the gate on this very doc, which is a live demonstration of `WINDOW`-based matching
rather than a hypothetical one.)

### What a botched restructure move risks, stated plainly

If a move keeps the region's boundary headings intact and keeps every gate's command token on some
line inside the region, **none of the three gates above will notice the move at all** — they were
never checking the content being relocated. If a move accidentally drops a `.ts` filename, or
retitles/removes the `## What this repo is` heading, or removes a layer's table row, the region reads
**empty or short**, which fails loudly (the region floor in both gates). **Nothing catches a botched
move of anything else in the file** — the prose connecting one gate's mention to the next, the framing
sentences, the ordering. Say this plainly rather than implying the gates are a restructure safety net:
they are not. Review is.

---

## 4. Ranked disposition

Ranked by bytes saved per unit of risk — cheapest, safest wins first.

| # | Passage | Bytes | Trigger | Destination | Risk | Est. saved |
|---|---|---|---|---|---|---|
| 1 | Principle 4's per-gate narrative (lines 96–105 minus the bare gate list) | ~30,300 | 2 | `CONTRIBUTING.md` §3 (already states it's "the canonical list with per-gate rationale" — this content already claims a canonical home it isn't living in) + each gate's own file header, most of which **already duplicate this reasoning nearly verbatim** (verified: `lint-shape-index.ts`, `lint-decisions-index.ts`, `lint-doc-gates.ts` itself all carry the same narrative in their own headers) | **Low.** Region 1 only needs the bare tokens (§3). Where a gate's header is thinner than `CLAUDE.md`'s copy, port the missing reasoning there first, in the same PR, so nothing is lost, only relocated to where it's read on purpose. This is also the row where the file's growth concentrates — line 105 alone gained 3,289 bytes from #920 between scoping and this draft — so it is the row most worth landing first. | ~26,300 |
| 2 | The `tools/` layer-table cell | 6,318 | 1 | A new nested `tools/CLAUDE.md`, loaded only when a lane opens `tools/**` | **Low.** Textbook Class 1 — the exact shape a nested `CLAUDE.md` exists for. Region 2 only reads the first cell. | ~5,900 |
| 3 | Worktree/`npm ci` paragraph, minus the pathspec hazard | ~5,300 | 3, but mirrored by a hook | A one-paragraph pointer to `.claude/hooks/session-start-npm-ci.sh`, whose own header **already carries the same reasoning with more precision** (the measured `npm ci`-clears-symlinks-safely fact, the absolute-symlink guard, all of it) | **Low-medium.** Keep the *prohibition* itself resident and terse (the hook's own header says plainly: "a prohibition with no replacement is a prohibition people work around" — `CLAUDE.md`'s job is stating the rule, the hook's job is catching violations after the fact). Don't reduce this to a bare pointer with no imperative. | ~4,600 |
| 4 | The `git checkout <ref> -- <path>` pathspec hazard | ~1,600 | **3, checkable** | A new `PreToolUse` Bash hook, same shape as the existing `regen.ts --check`-before-push deny | **Medium, and the predicate is stated precisely in §5.** False positives are possible — `git checkout <ref> -- <path>` has legitimate uses. Match the existing hook's posture: `deny` with a `permissionDecisionReason` naming the safe alternative (`git show <ref>:<path>` to read, `git diff <ref> -- <path>` to compare), which is a speed bump, not a hard block — re-issuing the command with intent still works. This is the strongest single move in the file: prose has now failed to prevent this shape **four times** (#905, #915, and two earlier). A related but distinct shape — bare `git stash pop`/`apply` consuming another session's stack — added a **fifth** family incident on 2026-08-22 (#923), the first where the prescribed recovery was demonstrably in the operator's head and did not stop the command; see §5 for what that changes about this argument. | ~1,300 |
| 5 | Squash-merge SHA-rewrite paragraph | 2,268 | 3, partially checkable | Rule + the one checkable signal (`* [new branch]`) stay, terse; the three-incident narrative moves to its existing `docs/00-progress.md` entry | **Medium.** The *judgment* half (compare trees, decide whether work survived) isn't mechanically checkable — a hook can't decide "is my work already in `origin/main`" for you. Propose a `PostToolUse` hook on `git push` that **scans the push output for `* [new branch]` on a branch not freshly created this session** and surfaces a warning — automating detection of the one signal the paragraph itself calls "the only checkable thing," without automating the judgment call that follows it. | ~1,800 |
| 6 | US-English paragraph's four-trap restatement | ~1,900 of 2,410 | 1/2 | `packages/engine/lint-us-english.ts`'s own header, which the paragraph's own last sentence already says holds this: *"documented in the file's own header; read it before touching either scan."* | **Low.** The paragraph names its own redundancy. Keep the *rule* (US English, where, `NOT_EN_GB` is the fix for a false positive) and the comment carve-out (`apps/studio/src`, #464; `packages/engine/components/*.ts`, #849 — both decided, on the true empirical reason the content ships, not the "gate cannot see it" premise #968 found false) resident; cut the trap-by-trap restatement. | ~1,900 |

**Total estimated reduction: ~41,800 bytes**, leaving roughly **20,300 bytes** — see §6 for how that
number is derived rather than rounded. (Row 1's growth and the total's growth are nearly the same
number, ~3,300 bytes each — the file grew almost entirely in the one place this proposal already
targets, so the "leaving" figure barely moved even though both the file and the cut grew.)

Not ranked (too small to be worth a disposition group on its own, noted for completeness): the Voice
paragraph (1,017B) is already a tight pointer to `docs/voice-standard.md` with one load-bearing nuance
(the *recessive* attribute) not duplicated elsewhere — leave it. Principle 5 (1,513B) is discussed in
§5 as the file's own best existing example of correct triage.

---

## 5. What must stay, and why

Argue this side properly, because the instinct after §4 is to keep cutting.

**A hazard that fires at no particular moment reaches nobody if it is filed where it is only read on
purpose.** That is the whole case for keeping *anything* resident and unconditional, and it is not a
throwaway line — it is the reason a nested `CLAUDE.md`, a path-scoped rule, and a skill all fail for
Class 3 content specifically: none of them fire on a bare shell command with no file read. The `npm
install --prefix` disaster, the squash-merge races, the pathspec hazard — every one of these happened
*during* a `Bash` call, not while reading a file. If their prose moves to a doc nobody is prompted to
open at that moment, the incident recurs with a clean git status and nothing to point at afterward,
which is a strictly worse outcome than an oversized file.

**Principle 5 (versioning) is this file's own best existing example of correct triage, and it's worth
citing as proof the discipline this doc asks for already works elsewhere.** It states the rule
("names are versioned, values are not") in two sentences, gives the one example that makes the split
concrete, and its own last sentence hands off: *"Full policy, corpus rationale and what is deliberately
not covered: `docs/30-versioning-and-compatibility.md`."* 1,513 bytes, unconditional (it applies
whenever anyone is authoring a behavior change, which is too broad a trigger for any path-scoped rule
to catch), unabridged in the load-bearing part, and everything else is one sentence and a pointer. That
is the target shape for the passages in §4, not a novel structure to invent.

**What survives resident, restated as a class rather than a list:** the terse **imperative prohibitions**
that either (a) have no checkable precondition a hook can act on and (b) fire on a trigger too broad or
too varied for any file-scoped mechanism — "one concern per PR, but file what you don't fix," "never
symlink `node_modules`," "commit before you mutate for a verification loop," "compare trees, not SHAs."
Each is one to three sentences. What does **not** survive resident is the *narrative* behind each one —
the incident count, the measured byte figures, the specific PRs — which belongs wherever the incident
already has a durable home (`docs/00-progress.md`, a hook's own header, a gate's own header) and is
retrievable by anyone who needs the "why," which is not every session, every time.

### #923 sharpens the hook-vs-prose line rather than blurring it

**#923 is the strongest evidence yet for keeping Class 3 hazards off prose alone, and it does not belong
folded into this doc — it is filed separately on purpose, cited here rather than relocated.** On
2026-08-22, in the emitter lane during PR #920: a bare `git stash pop` on a clean tree consumed another
session's `stash@{0}`. Nothing was lost, but the operator identified the mistake themselves and quoted
the prescribed alternative (`git show 'stash@{0}:<path>'`) **in the same report as the mistake**. The
four `git checkout` pathspec incidents above are each consistent with the prose simply not being
recalled at the moment it mattered; this one is not — the remedy was demonstrably in the operator's
head and did not stop the command. That is the point at which "state it more clearly" stops being a
hypothesis with support, for this repo specifically. #923 is also a **fourth shape**, not a repeat of
the `git checkout` one: it consumes a shared *stack*, not the working tree, and its precondition is a
**clean** tree — exactly the state #915's "commit before the first mutation" rule already puts you in,
which is why that rule doesn't reach this hazard at all.

**#923 also states a correction this doc would otherwise have had to re-derive.** #915 closed the
`git checkout` class with *"a tripwire would have to watch a shell, and pretending otherwise would be
worse than prose."* Read alone, that could be mistaken for "no Class 3 hazard here can be hooked." §2's
mechanism table and §4 rows 3–5 already don't make that mistake — they cite `.claude/settings.json`'s
existing `PreToolUse` deny on `git push` (blocking on a failing `regen.ts --check`) as the operative
precedent — but #923 makes the correction explicit and names it: the mechanism is not hypothetical, it
is in production in this repo, and #915's "not a gate" conclusion was reached without it in view. Cite
#923 for this; it is the primary source, and this doc is not repeating its argument independently.

**#923 is the cleanest worked example of the checkable-vs-judgment-call line this doc draws less
formally in §4.** Its proposed predicate — deny a `git stash pop`/`apply` naming no explicit
`stash@{n}` when `git stash list` is non-empty — is checkable for the same reason the existing
`git push` hook is: the command string either names a ref or it doesn't, and the stack is either empty
or it isn't. It is deliberately not stash-provenance detection (unreliable); it only requires the
operator to name what they're taking. Compare that to the squash-merge paragraph's judgment half (§4
row 5) — deciding whether work already landed on `origin/main` needs a tree diff a hook cannot
interpret — to see the other side of the same line.

**#923 explicitly declines to say whether the `git checkout <ref> -- <path>` hazard (§4 row 4) has an
equally clean predicate, and leaves it to this doc. It does, with one distinction worth stating
precisely, because the two hazards' "undetectable" claims are about different moments.** `CLAUDE.md`'s
existing prose says the pathspec damage is partly undetectable because *after* the checkout, `git
status` compares the working tree only to `HEAD` — a path whose content in `<ref>` happens to be
byte-identical to `HEAD` reads as clean afterward even though an uncommitted edit was just destroyed.
That blind spot belongs to checking *afterward*. A `PreToolUse` hook does not inherit it: run *before*
the write, `git status --porcelain -- <path>` (or `git diff --quiet -- <path>`) tells you whether the
path is dirty **right now**, and that check never looks at `<ref>` at all — the byte-identical-to-ref
case that defeats post-hoc detection cannot defeat a check that doesn't compare against the ref in the
first place. So: **yes, a checkable predicate exists** — deny `git checkout <ref> -- <path>` when the
path is currently dirty per `git status` — and it needs no cross-session provenance judgment at all
(unlike deciding whose stash entry `stash@{0}` is, whether a path is dirty is unambiguous), which makes
it a cleaner case than #923's own. This is a proposed predicate, stated here for the first time and not
yet built or measured; §4 row 4 already routes this hazard to a hook on that basis.

### Decided (2026-08-22, #922): `docs/34` holds the diagnosis; `CLAUDE.md` holds a countermeasure only when it's unhookable and statable in one clause

#922 asks where a new hazard belongs — its own author offers both candidates and doesn't resolve
between them. The general form, resolved here so #922 becomes an instance of it rather than a fresh
argument:

**A passage that is fundamentally a *diagnosis* — why a check can pass while the thing it's checking is
wrong, a taxonomy of failure shapes, worked examples that only pay off when compared against a menu of
prior failures — belongs in `docs/34`.** It's Class 2: read deliberately, at gate-design or gate-review
time, by someone who is specifically looking for "have I seen this shape before." Injecting it into
every session's unconditional context buys nothing over a doc that's already the stated read-before-
writing-a-gate reference.

**A passage that is a *countermeasure* — a specific, repeatable action at a moment that recurs across
ordinary work, not gate-writing specifically — belongs in `CLAUDE.md` only if it clears two bars: no
file read triggers it (Class 3, so no path-scoped rule can hold it), and it can be stated in one clause
that points at `docs/34` for the "why" rather than re-narrating it.** If the countermeasure has a
checkable precondition, prefer a hook (§4, rows 4–5) — prose is read only by whoever happens to open
the file at the right moment; a hook fires every time, unconditionally, which is the property that
actually matters for a hazard that has already recurred.

**Applied to #922:** the shape — 36 green gates, tokens correct, consumer broken, only a browser could
tell — is a genuine new entry for `docs/34`'s register (append it via `lint-shape-index.ts --accept` in
the PR that writes it up; not proposed here as a specific numbered shape, since that's this proposal
overreaching into #922's own work). The countermeasure is one clause, added to principle 4's
verification framing rather than kept as its own paragraph: *"after a rename, re-run the consumer suite
(`test:smoke`) — don't re-grep and call it verified; a truncated grep reads exactly like a complete one
(`docs/34`)."* #922 lands both halves; this decision is what tells it where each half goes.

This is itself a live decision, so it's indexed: `schema/decisions-index.json` and
`docs/42-current-decisions.md` both carry a row for it, filed in the same PR as this doc, closing the
loop the current-decisions index (#886) exists to close on its own first real customer outside `docs/28`
and `docs/20`.

---

## 6. Target budget

Not a round number — the sum of what §5 argues must stay resident, at the shape §4 proposes shrinking
everything else to. **One double-count caught while assembling this table, worth stating rather than
quietly fixing:** an earlier draft carried "Prism3 — the generation engine" as a single untouched
8,672-byte row *and* separate rows for the worktree and squash-merge paragraphs shrinking — but those
two paragraphs **are** most of that section's bytes (§1's section-weight note), so the section row and
the two paragraph rows were charging the same bytes twice. Fixed by counting only the section's
genuinely untouched remainder — the engine description, the two surfaces' pointers, the one-line
workflow statement — at its own re-measured weight.

| Component | Bytes |
|---|---|
| Principles 1–3 (already tight; unabridged) | ~1,900 |
| Principle 4, shrunk to bare gate list + `verify.ts`/`docs/34` pointer (row 1's "keeps" column) | ~4,000 |
| Principle 5 (unabridged — the reference example) | 1,513 |
| "What this repo is" layer table, `tools/` cell shrunk to a sentence + pointer | ~3,000 |
| "Prism3 — the generation engine" section, genuinely-untouched remainder only (engine description, surface pointers, workflow line — see §1's note; the worktree and squash-merge paragraphs living in this section are counted in their own rows below, not here) | ~1,696 |
| Naming conventions, US-English paragraph shrunk, Voice paragraph unchanged | ~2,300 |
| Two token formats / mode organization / working-with-this-repo (already tight) | 2,064 |
| Worktree paragraph shrunk to prohibition + hook pointer | ~2,400 |
| Squash-merge paragraph shrunk to rule + signal + pointer | ~500 |
| `docs/00-progress.md` entry paragraph (already tight; unabridged) | 491 |

**Target: ~19,900 bytes — a 68% reduction from the current 62,136.** This now agrees with §4's
independent bottom-up estimate (total file minus every disposition group's estimated savings, ~20,300)
to within rounding, which it did not before the double-count fix — the two derivations disagreeing was
itself the signal something was wrong, the same "two independent measurements that agree are the check"
logic `tools/exporter-comparison`'s own header argues for. The largest single remaining line item is
principle 4's shrunk gate list (~4,000B) — the natural next thing to re-measure once #924 actually lands
and the estimate can be checked against reality.

---

## Sequencing

**Proposal PR only** — this doc, the five filed issues, one `docs/00-progress.md` entry, and the #922
decision row. No restructuring of `CLAUDE.md` itself lands here. Two live edits are already pending
against the file (#922's placement, undecided until this doc resolved it; the checkbox rename work in
#910/#911, which may touch naming conventions) — a single PR that both argues this case and moves ~30k
bytes would be unreviewable and would collide with both. **Restructure PRs land after, one disposition
group each**, so each is independently reviewable and independently revertable if a move turns out
wrong.

---

*Cross-refs: `34` (gate independence — this doc's §5 resolves where new entries in its register belong
relative to `CLAUDE.md`), `30` (versioning — cited in §5 as the shape every other passage in principle 4
should be trimmed to match), `00-progress.md` (the durable home for incident narratives this proposal
moves out of resident context), `42` (the current-decisions index this proposal's own #922 resolution is
filed into). #923 (a fifth git-hazard incident, filed separately and referenced rather than absorbed —
§5 answers the predicate question it leaves open) and #920 (landed `lint-glyph-geometry.ts` into
principle 4's list while this doc was in flight; every byte figure above is measured against `main`
*after* #920, not the `main` this branch was originally cut from).*
