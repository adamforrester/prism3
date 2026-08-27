# 44 — Recording a materialization rename

> `DEPRECATIONS` records a rename of a **contract path** and a gate forces the entry at the moment
> the rename happens. A Figma collection name, a variable's namespace folder and a mode name are not
> contract paths, so nothing forces anything — and #1013's argument against a hand-authored list is
> right: *a rule performed by memory fails silently.* This file decides what the record is instead,
> from what the emission itself can be made to prove.

---

## 1. The problem, restated

Three renames are waiting: the `surface`↔`color` swap, the brand namespace folder, and
`core-*`→`core.*`. All three change **Figma names** without changing a single contract path. That is
the whole difficulty, and it is worth separating from the symptom #1032 leads with.

`write-figma.ts` is create-or-update **by name**. A renamed variable is therefore created fresh and
its predecessor left behind, still carrying every binding a designer made. #1013 built the migration —
`Variable.name` is writable and `.id` is `readonly`, so setting the name carries the bindings across —
and keyed it on `DEPRECATIONS`, because that record already has a forcing function:
`token-contract.ts --accept` refuses a MAJOR bump without one.

**A materialization name has no such record and cannot be given one by adding a field to
`DEPRECATIONS`.** `DEPRECATIONS` is keyed on guaranteed contract paths, and its own gate refuses a
`replacedBy` that is not in the live guaranteed set. A Figma collection name is not in that set and
should not be — `CONTRACT_VERSION` answers *"can my app still resolve the names it references?"*, and
no app resolves a Figma collection name. Widening the contract to cover materialization would make
every Figma-side cosmetic change a contract event. So the record has to live somewhere else, and the
question is what forces it into existence.

**One thing #1032 gets wrong, and it changes the size of the swap.** #1032 says the swap moves *"122
variables named `surface/*`"*. The 122 is right and the framing is not: a variable's Figma name and
its collection name are **two independent facts that happen to coincide for `color` and `surface`**.
Measured on the committed emission:

| collection | first segment of its variables' names |
|---|---|
| `color` | `color/…` — coincides |
| `surface` | `surface/…` — coincides |
| `core-palette` | `palette/…` — **does not** |
| `type-sets` | `font-fluid/…` — **does not** |

The first segment is the **contract root** (`figName` strips the brand namespace and swaps `.` for
`/`), not the collection name. `PROJECTED_ROOTS`' own comment already says this — `palette` lives in
`core-palette`. So renaming the `color` collection to `color.appearance` does **not** by itself rename
its 236 variables, and whether they *should* become `color.appearance/*` is a second decision the swap
PR has to take rather than inherit. Taken one way the swap moves 122 names per brand; taken the other
it moves 358. Both are buildable; they are not the same change, and #1032 reads as though there is only
one.

---

## 2. What the namespace folder actually costs

#1032 says *"not 122, all of them"* and does not have the number. Counted from the committed
emission — **distinct variables**, not per-mode rows, because a rename writes a name once however
many modes carry a value for it:

| collection | nb | aurora | wendys |
|---|---|---|---|
| `color` | 236 | 236 | 236 |
| `core-palette` | 122 | 162 | 182 |
| `surface` | 122 | 122 | 122 |
| `core-font` | 39 | 39 | 39 |
| `core-dimension` | 38 | 37 | 37 |
| `size` | 25 | 25 | 25 |
| `space` | 18 | 18 | 18 |
| `opacity` | 12 | 12 | 12 |
| `type-sets` | 11 | 11 | 11 |
| `layout` | 10 | 11 | 10 |
| `control` | 9 | 9 | 9 |
| `icon` / `radius` | 5 / 5 | 5 / 5 | 5 / 5 |
| `border-width` | 4 | 4 | 4 |
| `focus` | 3 | 3 | 3 |
| **total** | **659** | **699** | **718** |

**659–718 variables across 15 collections, per brand.** The corpus total of 2,076 is the wrong number
to design against: a designer opens one brand's file, so the migration a single apply performs is
659–718 renames, not 2,076. It is also not the 4,000 the per-mode row count suggests — `color`'s 236
variables appear in four mode files each, and the four are one name.

> **The table above is a MEASUREMENT, dated, and the emission has since moved (#1097, 2026-08-26).**
> Re-measured on the committed emission: **671 / 711 / 730 across THIRTEEN collections**, corpus **2,112**.
> Two independent moves, and it is worth knowing which is which because only one of them is this lane's:
> **(a)** `color` 236 → 242 and `surface` 122 → 128, +6 each, +12 per brand — ordinary token additions
> landing after this document was written, exactly the drift the paragraph below predicts; **(b)** 15 → 13
> collections, which IS structural: #1097 folds `core-palette`/`core-dimension`/`core-font` into one `core`
> (−2), and #1089 renames `color`→`color.appearance` and `surface`→`color.surface` (±0). Per collection
> today: `core` 199 / 238 / 258, `color.appearance` 242 (× 4 mode files), `color.surface` 128 (× 2).
> **The argument the table exists to make is untouched** — the variance that decides the mechanism is
> larger now, not smaller (`core` spans 199–258 where `core-palette` spanned 122–182). The old figures are
> left standing rather than overwritten, because a document that silently restates its measurements to
> match today cannot be checked against the reasoning it once supported.

The three remaining collections — `text-styles`, `shadow-styles`, `gradient-styles` — hold **zero
variables**. They materialize as Figma *styles*, where a rename is a different call on a different
API. `rename-map.ts` already excludes `shadow` from `PROJECTED_ROOTS` for this reason. They are out of
scope here and named in §6 so that stays a decision.

**The number that decides the mechanism is not the total — it is the variance.** `core-palette` is
122/162/182 across three brands; `core-dimension` is 38/37/37; `layout` is 10/11/10. A pair list
covering the namespace change would therefore be **per-brand authored data**, sized to each brand's
ramp count, and a new brand would ship without one. The same change stated as a transformation is one
line and brand-independent. That asymmetry is a measurement, not a preference, and it is the strongest
single argument in this document.

---

## 3. Chain versus cycle: measured, and the answer is neither a sort nor a redesign

#1032 claims a chain is topologically resolvable where a cycle is not, and asks for that to be
verified before it is relied on. It is verified, and two of the surrounding claims are not.

Driving the real `validateRenameMap` and the real `planCollectionRename` against a file holding both
collections:

| map | static verdict today | applied, order A | applied, order B |
|---|---|---|---|
| `surface→color`, `color→color.appearance` (**chain**) | 1 refusal, worded *"cycle"* | **fully migrated** | `surface→color` = `target-occupied`; the other migrates |
| `color→surface`, `surface→color` (**cycle**) | 2 refusals | both `target-occupied` | both `target-occupied` |

**The chain/cycle distinction is real.** The chain reaches a fully migrated file under one order and a
partially migrated one under the other. The cycle reaches a fully migrated file under **no** order —
both entries refuse in both directions. So a cycle genuinely needs a two-phase temp name and a chain
genuinely does not.

**But the mis-ordered chain is a refusal, not a corruption.** `rename-map.ts`'s header justifies the
static refusal by saying a swap *"passes through a state where find-by-name is arbitrary"*. That state
is not reachable: `planCollectionRename` checks `have.has(entry.to)` first and returns
`target-occupied`, so the worst outcome is that 122 variables are not migrated — today's
orphan-and-recreate, reported. Nothing half-applies. The static check buys an early, legible report;
it is not what prevents damage. Apply-time `target-occupied` is, and it prevents it for cycles too.

**And there is no map order to sort.** `planCollectionRename(existing, wanted, renames)` resolves
`renames.find(c => c.to === wanted)` — it is a **lookup pulled by the name the plan is about to
write**, not an iteration over the map. So the application order is the sequence of
`upsertCollection` calls, which is the executor order, and sorting `COLLECTION_RENAMES` would change
nothing at all. #1032's *"that is a design change, not a one-line sort"* is right about the conclusion
and understates why: there is no sort available to reject.

**The order that makes the chain work today is a coincidence of two unrelated constraints.**
`applySurfacePlan` must run after `applyWritePlan` because its alias targets are `color/*` variables
written by that call (`write-figma.ts:330`). Post-swap the value layer is written first as
`color.appearance` and the alias layer second as `color` — which is exactly order A, the one that
fully migrates. So the chain would work, for a reason documented as being about **alias resolution**,
with nothing anywhere recording that a migration depends on it. A future executor reordering breaks it
into a reported refusal. Filed as **#1035**, with the measured table.

So the answer to *"is that a sort or a redesign?"* is **a guarantee relocation**, and it splits cleanly
in two:

- **Now, separably:** classify a chain apart from a cycle and say the true thing about each. Both keep
  refusing, so the apply pass does not change at all — only the report does, and `COLLECTION_RENAMES`
  stays empty. That is what makes it separable from the renames, and it ships with this document.
  `validateRenameMap` walks the `from → to` graph rather than testing one hop, because a two-entry
  probe cannot tell a 3-cycle from a 3-chain: mutating the walk to a single hop reports all three
  entries of `a→b→c→a` as chains and is caught by name.
- **With the swap, not before:** hoist the collection renames out of `upsertCollection` into one
  pre-pass that topologically orders them and runs before any executor. That is where the ordering
  becomes a guarantee rather than a coincidence. It is small, and it is not separable from the rename
  because a pre-pass with an empty map is untestable against anything.

---

## 4. The mechanism options

An option whose forcing function cannot be stated is not an option. Two of the sketches in #1032
survive that test, one does not, and the answer is a composite of the two that do.

### Option A — a second authored map with a git-based forcing function

**Record:** a hand-written list of Figma-side `from`/`to` pairs.
**Forcing function:** an entry whose `from` still appears in the current emission, or whose `to` does
not, is stale and fails. Checkable without git.

**This is not a forcing function for the thing that matters.** It forces *correctness of entries that
exist*; nothing forces an entry to **exist**. That is #1013's objection verbatim — *the rename ships,
the list does not gain an entry, and nothing anywhere notices* — and it survives intact. Rejected as a
standalone.

**docs/34 shape:** 9. The list is a set of literals naming the world as it was; when the emitter moves
past all of them the checks match nothing and report clean.

### Option B — derive the map from the emission diff

**Record:** none; compute removed and added names between the previous emission and this one.
**Forcing function:** real and automatic — `regen` rewrites `out/figma/**`, so a name change is
visible in the diff whether or not anyone wrote it down.

**Fatal on its own, for the reason #1032 names:** a diff yields a set of removals and a set of
additions and cannot pair them. Pairing is the entire question — a rename and a delete-plus-add
produce byte-identical diffs, and the difference decides whether bindings should be carried across or
correctly orphaned. A mechanism that guesses pairings would carry bindings onto unrelated variables.
Rejected as a standalone.

**docs/34 shape:** 16. Fully independent, and measuring the wrong quantity — set membership rather
than identity.

### Option C — rule-based transformations

**Record:** a transformation, `∀v ∈ domain: v → f(v)`. The namespace change is one rule; a collection
rename is one rule; a one-off pair is a rule whose domain has one member.
**Forcing function:** on its own, none. A rule is authored, so nothing forces it to exist any more
than option A's list. Rejected as a standalone, and this is the correction to the starting hypothesis
that option C fits best: it fits the *shape* of our three cases best and supplies no forcing function
at all.

**docs/34 shape:** 11, and this is the one to watch. A rule stated as "what `figName` now does minus
what it used to do" and checked against `figName`'s output has the emitter **below both sides** of the
comparison. Two independent-looking implementations, one subject underneath, green while it moves
arbitrarily.

---

## 5. The decision

### Decided (2026-08-25, #1032): a materialization rename is recorded as a RULE, and the emission diff is what forces the rule to exist

**Option C for the record, option B for the forcing function, and neither is sufficient without the
other.** The rule supplies the pairing that a diff cannot; the diff supplies the compulsion that a
rule cannot. `DEPRECATIONS` keeps its existing derivation for contract renames, unchanged.

Concretely, two checks over one authored artifact:

**The artifact.** `MATERIALISATION_RENAMES` — a list of transformations, each carrying `since`, a
`domain` predicate over `(collection, name)`, a `map` function, and a `why`. A single pair is the
degenerate case, so there is one mechanism and not three.

**Check 1 — totality, at the commit that renames. Needs git; this is the forcing function.** Read the
committed emission at the merge base and the emission in the working tree. Every name that
disappeared must be claimed by exactly one rule; and **every rule must be evaluated over the whole
before-set, not only over the names that moved.** That last clause is not a refinement, it is what makes
the check two-sided — measured below.

> **Corrected 2026-08-26 (#1053).** This paragraph read *"every name that appeared must be some claimed
> name's image"* and that rule is **wrong**. It was implemented faithfully in #1039 and made the gate
> fail every PR that adds a token — with the artifact empty, every added key is unclaimed. #1051 was
> blocked by it.
>
> **Removals and additions look symmetric and are not.** An unclaimed **removal** may be a silent
> rename: a name left, and a binding that followed it now points at a variable the engine has stopped
> writing. An unclaimed **addition** is a new token, and *there is nothing it could be hiding* — a
> rename's tell is always on the removal side, because a rename is a name LEAVING. The arrival is what
> every ordinary additive change also does, so it carries no information.
>
> The reason is stated here rather than only the rule, because the two arms look alike and an
> unexplained asymmetry invites being "simplified" back to symmetric. Enumerated: every way an addition
> could be suspicious is caught by another arm — a rename whose removal no rule claims is an
> **unaccounted removal**; a rule claiming `A → B` where `A` was never removed, or where `B` never
> appears, is a **contradicted claim**. The addition arm had no detection power of its own and cost
> every additive change. Additions are still counted and reported as diagnostic context; they are not a
> verdict.

**Check 2 — non-staleness, every run. No git.** For every rule, no domain member is still emitted and
every image is emitted. This is exactly the invariant `test.ts` already pins on the derived variable
map, applied to rules. It cannot force a rule into existence; it stops one rotting into a pointer at
nothing after it lands.

### Why the pair is enough when neither half is

Measured against the committed emission, simulating the namespace rename on all three brands that emit
Figma:

| rule state | emission state | diff-driven accounting | whole-set accounting |
|---|---|---|---|
| complete | complete rename | TOTAL | TOTAL |
| **under-covers** (`color` only) | complete rename | **846–964 unaccounted** | **846–964 unaccounted** |
| **over-claims** (all) | `color`-only rename | **TOTAL — blind** | **423–482 contradicted claims** |

Both figures are **ranges across the three brands**, and per brand they are: under-covers 846 / 926 /
964 (nb / aurora / wendys), over-claims 423 / 463 / 482 — the latter aggregating to **1,368**, which is
what the gate prints. **These are a SNAPSHOT at a corpus of 2,076 keys** — both figures are
functions of the non-`color` population, so every token addition moves them. `#1030`'s six veil leaves
already did (846–964 → 858–976), and by 2026-08-26 the corpus is **2,112** rather than 2,076 (see the
dated note in §2), so the literal figures here have moved again — dropping the #1097 rule entirely leaves
**2,112** unaccounted, which is the whole-set figure this lane actually measures. `test.ts` therefore asserts the *relationship* (`2 × non-color` at its
extremes) and reports the literal, rather than pinning it: a figure that moves on every additive change
is not something a test about renames should fail on. *(Corrected 2026-08-26, #1047: this row read a bare "463", which is aurora's
figure alone, sitting in the same column as a range. Derived independently in #1039 from the committed
emission: 659 / 699 / 718 keys per brand, `color` 236 in every brand.)*

The under-covering row is the forcing function firing: it names the unaccounted removals and additions
individually (`border-width :: border-width/none` → `border-width :: nbds/border-width/none`), so a
rule that forgets a collection cannot ship.

The over-claiming row is why check 1 must walk the whole before-set. Evaluated only over names that
moved, a rule claiming a rename that **did not happen** is never exercised and the check reports TOTAL.
Evaluated over every name, the claim is contradicted by the emission and named. An over-claiming rule
is inert at apply time — `target-not-planned` refuses it — so this is a reporting hole rather than a
destructive one, which is exactly the kind that survives for years.

### Why this is independent, and where it still is not

The `from` side comes from **the committed emission at the merge base** — names produced by *different
code*, sitting in git, not recomputable by the emitter under test. `regen --check` already guarantees
the committed emission matches what the current code emits, so the committed tree is a faithful witness
rather than a stale copy. Verified: reading `HEAD`'s emission and the working tree's yields 0 removals
and 0 additions across all three brands.

**The residual risk is docs/34 shape 11 and it is not fully closable by construction.** If the rule is
written as a call into `figName`, the emitter sits below both sides and the check is self-agreement. A
gate cannot reliably tell an independently stated rule from a derived one. What can be done, and what
§7's implementation shape requires: the rule states its transformation **literally** (`ns + '/' + name`),
the module is forbidden from importing the emitters, and a comment says why — the same restraint
`rename-map.ts` already applies in the opposite direction when it imports `figmaVarName` rather than
re-deriving it. The asymmetry is deliberate: re-deriving the *dotted→slash* mapping would be a second
copy of a shared fact, whereas re-stating the *namespace* transformation is the independent expression
the check needs.

---

## 6. What this does not cover

Every mechanism here has a blind spot. These are the ones found while measuring; an unnamed one is the
one that bites.

1. **A rename is still not provably distinguishable from a coincidental delete-plus-add.** A rule makes
   the pairing explicit rather than guessed, which is the improvement, but if a variable is genuinely
   deleted and another genuinely added and the rule happens to map one onto the other, the accounting
   reports TOTAL and the apply pass carries bindings that should have been orphaned. The rule reduces
   this from the default outcome to one requiring a coincidence. It does not remove it, and no
   name-level mechanism can.
2. **Over-claiming is caught only for names still emitted.** A rule claiming
   `does-not-exist → also-does-not-exist` touches neither set and is invisible to both checks. Harmless
   at apply time, invisible as a record.
3. **Modes are a third materialization axis with no record at all.** `surface`'s `default`/`inverse`
   and `color`'s four appearance modes are renamed through `renameMode` (`write-figma.ts:370`), keyed
   by index for the first mode and by name for the rest. Nothing here covers a mode rename, and the
   swap does not need one — but it is the same class of problem and it is undecided.
4. **Styles are excluded.** `text-styles`, `shadow-styles` and `gradient-styles` hold zero variables;
   a rename there is a different API. Consistent with `shadow`'s exclusion from `PROJECTED_ROOTS`,
   and unaddressed.
5. **The accounting proves the record is complete, not that bindings survived.** It compares names.
   That `.name =` on a preserved id carries bindings is a property of the Figma API, checked in the
   typings and exercised by `test-write.mjs` against a real file. Both are needed and neither implies
   the other — docs/34 shape 16, avoided only by keeping the two claims apart.
6. **CI cannot run check 1 as things stand.** `.github/workflows/ci.yml` uses a bare
   `actions/checkout@v4`, which is a depth-1 shallow clone: no merge base, no `HEAD~1`. Every existing
   git-reading gate uses `git ls-files`, which needs no history. So check 1 would pass locally, where
   history exists, and be unable to run in CI — the failure mode where the author sees green for a
   reason CI does not share. It needs **`fetch-depth: 0`** added, and the gate must **fail loudly when it
   cannot find a base ref**, never skip. *(Corrected 2026-08-26, #1047: this read "`fetch-depth: 2` (or
   `0`)". **Depth 2 is not sufficient** — it gives `HEAD~1`, which is the base only on a branch exactly
   one commit long; a merge base against `origin/main` sits at the branch point, an unbounded number of
   commits back.)*
7. **The 659–718 figure is three brands, all engine-generated.** A client file may hold variables the
   engine never emitted. Those are `source-absent`/untouched by construction, but the count is not a
   claim about real files.

---

## 7. Implementation shape

Enough that the next PR is a build.

**`packages/engine/materialization-renames.ts`** — pure, imports nothing from the emitters:

```ts
export type MaterializationRule = {
  id: string;                                          // stable, used in every report
  since: string;                                       // ENGINE_VERSION that made the change
  why: string;                                         // what moved and why, per INVERSE_GAPS' standard
  domain: (collection: string, name: string) => boolean;
  map: (collection: string, name: string) => string;   // the new variable name
};
export const MATERIALISATION_RENAMES: MaterializationRule[] = [];   // ships EMPTY
```

It ships **empty**, for #1013's reason: authoring an entry would take the rename decision by shipping
it. Empty is checkable — both checks pass vacuously, and check 1's floor (below) is what stops that
reading as coverage.

**`packages/engine/lint-materialization-renames.ts`** — check 1. Base ref from
`GITHUB_BASE_REF`, else `origin/main`, else fail with the reason. Reads both emissions, runs the
whole-set accounting, reports unaccounted removals, unaccounted additions and contradicted claims by
name. Absent a base ref it **fails**; `verify.ts` declares it after `regen` (it reads the emission
`regen` writes).

**`test.ts`** — check 2, beside the existing derived-map section: no rule's domain member is still
emitted, every image is emitted, plus the two floors. A **floor** is required in both directions and
is the docs/34 shape 9 guard: assert the emission the accounting walks is non-empty (**2,112** names
across three brands as of 2026-08-26 — 2,076 when this was written; the floor is a floor precisely so
this number moving is not a failure), because a reader that finds nothing accounts for everything.

**`ci.yml`** — `fetch-depth: 0` on the checkout (see §6.6 — not `2`), and CLAUDE.md §4 / `CONTRIBUTING.md` §3 / the PR
template gain the gate, per `lint-doc-gates.ts`.

**The `stripNs` invariant needs a gate, not a comment.** `stripNs` is
`replace(/^[^.]+\./, '')` — it strips *a* leading segment, never a literal. Measured:

| input | `replace(/^prism\./,'')` | `replace(/^[^.]+\./,'')` |
|---|---|---|
| `prism.color.background.primary` | `color.background.primary` | `color.background.primary` |
| `nbds.color.background.primary` | **unchanged** | `color.background.primary` |
| `zzclient.color.background.primary` | **unchanged** | `color.background.primary` |

`theme.ts:1683` already refuses a root containing a dot, which is what makes the segment form
sufficient. Two of the three brands that emit Figma use the root `prism` and one uses `nbds`, so a
hardcoded `prism/` would be caught — **by one brand out of three.** That margin is too thin to rely
on: the gate must drive the transform with a namespace **no brand uses** (`zzclient`), so the check is
independent of the corpus rather than a bet on its diversity. This is the "simplification into
`startsWith('prism/')`" hazard, and a synthetic probe is the only form that survives a corpus where
every brand happens to share a root.

**Sequencing.** The mechanism is one PR. The three renames are the next, and they need the collection
pre-pass from §3 — which is theirs, not the mechanism's.

---

## 8. Open, and deliberately not decided here

- ~~Whether the `color` collection's 242 variables become `color.appearance/*` at the swap, or keep
  `color/*` while their collection is renamed (§1).~~ **Closed by #1013: they become
  `color/appearance/*`.** The deciding argument is not about the collection at all — a Figma variable
  name tracks its **DTCG path**, which is the property that keeps the two formats reconcilable
  (`core-palette` held `palette/*`, not `core-palette/*`). The DTCG value tier is `color.appearance.*`,
  so the variables are `color/appearance/*` and the scope of the swap is **~370 variables per brand,
  not 128** — both collections renamed *and* every variable inside them. §5's two rules are the record;
  `MATERIALIZATION_RENAMES` now carries its first real entries. *(#1102 later made the parenthetical
  read the other way and thereby confirmed the rule: the DTCG path became `core.palette.*`, so the
  variables became `core/palette/*` — the name tracked the path, as stated, rather than the collection
  label, which is now the bare `core`.)*
- Whether the three renames land as one migration or three. #1032 argued one, on the grounds that each
  costs a full-file migration and a manual Figma verification. **Practice contradicted it**: #1013
  shipped the swap alone, because it is the only one of the three with a token-model consequence (which
  tier owns the short name), while the namespace folder and `core-*`→`core.*` are presentation. So a
  file themed before #1013 faces up to three migrations rather than one, and the cost #1032 named is
  real and now partly spent. That is an argument for landing the remaining two **together**, not for
  re-litigating this one.
- Mode renames (§6.3).
