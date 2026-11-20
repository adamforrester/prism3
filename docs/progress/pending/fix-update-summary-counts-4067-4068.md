## (2026-11-18) — Update file's summary gives one count of sets updated, and reports a font fallback as one (#4067, #4068)

**What.** The owner's Update file run of 2026-11-18 gave three set counts for one run, and read a designed font
fallback as 36 failures.

**#4067, the three counts, traced.**
- "Update file: 6 sets updated" was the run line (`stripVerdict`, `STRIP_COPY.updated`). It read the in-place pass's
  last progress reading (`progress` `finish`, `done` = `ready.length`), which counts only the sets whose members the
  build pass writes: member updates, stamp-only sets and carry-only sets. A set whose only work is its usage panel or
  other canvas furniture, or a move on its page, is not in it.
- "Saved before Prism3 updated 37 sets" was the named version (`versionOf`, from `setIds` in `applyUpdate`). It is
  saved before the first write and names the sets the check planned to write: `ready`, the sets that move on their
  page, the furniture-only sets and the page moves.
- "Updated 44 sets · 1 to check" was the verdict (`applyVerdict`'s `written`). It counted every set given that was not
  refused, stopped, off or idle, so it also counted the sets the check found nothing to write to (`asPreviewed`), which
  wrote nothing. That is the 7 between 37 and 44, as far as the code shows; the run's own lines are not in the repo
  to confirm it.
- The "1 to check" was a set with a finding in `identity`, `content` or `misses`. On that run it is Sign-in button,
  whose 36 font fallbacks were misses (#4068). No line named it as the one to check.

**The fix.** One meaning for "a set updated": a set this run wrote to (`wroteTo`): not refused, stopped, off, idle or
given with nothing to write. The verdict's headline counts it and the verdict carries it as `sets`. The
`component-update-result` message carries it to the panel, the update step keeps it (`stepDone`), and the run line reads
it in place of the progress count. The version still names the sets the check planned, so it agrees with the headline
on a completed run. It differs only when the run stopped, refused a set, or the re-spacing moved a set the check did not
list. A "To check: <sets>." line names the sets to check (DRAFT). The stop and failure lines' "n of m updated" still read the
progress, which is the count a stop at a set boundary is made in. Not changed.

**#4068, the fallback.** The owner confirmed the labels are in Roboto, and the shim agrees: on main the 36 Google
labels hold Roboto Medium after the update. The executor loads the face, then the plan's fallback, and reports each
face that did not load as a miss. `splitFontFallbacks` moves those misses to the outcome's `fallbacks` when the part's
plan declares that face with a fallback and no miss says the fallback failed. Each fallback is one line per part and
face (DRAFT), never ⚠ and never a cause. The executor is unchanged, so no `EXECUTOR_REVISION` bump. The rule is the safe
one because a label whose fallback also fails reports its face twice (the literal's load, then the text write's load of
the font it still holds), so no count pairs face misses with fallback misses. If any fallback miss exists for the part,
every face miss stays a miss. A miss is never hidden. A fallback can at worst read as a miss, as before.

**Not changed.** Build's own verdict still lists a fallback among its misses. It reads the executor's misses directly
and is a separate surface: #4075.

**Measured.** `test-update-apply.ts` `fallback` (Sign-in button on the shim, Google Sans refused by the host after the
build: 36 labels hold Roboto Medium, one fallback reported, no font miss, the line, no font cause; both faces refused:
72 face misses and 36 fallback misses kept, the set to check) and `counts` (one plan, typed: a set written, a
furniture-only set, one with nothing to write and one with nothing to write that still differs: headline and `sets`
2, the version's 2, To check names the one). `test-status-strip.ts` `verdict/update sets`, `verdict/update count`
(progress 6, verdict 37: the line reads 37). `test-write-adapter.ts` the `sets` parse. On main: 7, 2 and 1 fail by
name. Mutations, each failing by name: the split not called → `fallback/reported`, `/not a miss`, `/line`;
`notLanded` dropped → `fallback/miss kept`, `/miss line`; `wroteTo` counting `asPreviewed` → `counts/headline`,
`counts/sets`; the To check line dropped → `counts/to check named`; the run line reading the progress → `verdict/update
count`; the adapter dropping `sets` → `accepts component-update-result with its sets count`. Review follow-up: `fallback/discarded kept` (the host keeps
Google Sans when Roboto is written, so 36 `literalFont -> DISCARDED` misses) and `fallback/thrown kept` (the size write
throws, so 36 `literalFont -> Roboto Medium` misses and no DISCARDED) pin the other two "fallback did not land" reads,
and `fallback/line one` pins the singular. Dropping either `notLanded` clause, or swapping the singular verb, fails its
arm by name.

**Delta review follow-up (2026-11-20).** #4358 reworded the executor's font miss to
`<part>.font -> <family> <style> REFUSED (<ErrorClass>: <reason>)`, so `splitFontFallbacks` matched none and every
fallback read as a miss again (five `fallback` arms red on CI). Both reads now key on one copy of the form,
`fontMissHead` in `update-apply.ts`, and `fallback/miss form` checks it against the 108 label font misses the real
executor reports on the shim. The `literalFont` and `DISCARDED` forms did not move. The paste twin still words the miss
without `REFUSED`; an update runs the plugin executor only. Mutation: `fontMissHead` without `REFUSED` →
`fallback/miss form`, `fallback/reported`, `fallback/not a miss`, `fallback/line`.
