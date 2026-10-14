## (2026-10-14) — Progress log: July and August move to an archive, and a gate proves the move lost nothing (#2583)

**What.** The 470 dated entries of `docs/00-progress.md` from before 2026-09-01, plus the seven undated
sections of the July tail, moved unchanged to `docs/progress/archive/2026-07-08.md` (owner decision Q288.2,
recorded on #2583). The live log keeps September onward: 515 entries, 21,569 lines, down from 55,411. The
log's intro gained three lines pointing at the archive, and the archive has its own two-line preamble and a
`README.md` saying how to archive the next month.

**The proof of the move.** Byte level, once, for this PR: the old log is exactly the first 21,566 lines of
the new log (less the three lines of the pointer) followed by one blank line and the archive below its preamble;
`cmp` reports no difference. Structurally, from now on: `lint-progress-order.ts` gained an ARCHIVE MOVE
arm. Any diff that writes `docs/progress/archive/` must leave the log and the archive, read at the merge
base and at HEAD as one sequence cut at every `## ` line, holding the same sections in the same order,
each byte-identical. Only each file's preamble may differ. A pure move is the one diff besides a fold
that ONE WRITER lets change the log.

**Every reader now reads both.** The gate's date arm, ALREADY IN THE LOG, FOLDED ENTRIES and NO
PLACEHOLDER read the log and then each archive file newest first, so a folded title that has moved to the
archive is still found, and still ordered. `fold.ts` never writes the archive; it reads it only for the
newest entry's date if a move ever empties the log. The path exemptions in `lint-decisions-index.ts`,
`lint-layout-claims.ts` and `lint-advisory-expiry.ts` were already the `docs/progress/` prefix, so they
cover the archive with no change; `lint-voice.ts` and `lint-us-english.ts` scan no `docs/` file;
`tools/forward-claim-check/measure.ts` lists the archive file in `JOURNALS`. The CI step is renamed
"docs/00-progress.md and its archive stay newest-entry-first", in `ci.yml` and `verify.ts` together.

**Mutations (docs/34), each committed first and then reset.** On the real archive: one entry dropped,
one duplicated, one byte changed inside one, and two transposed each fail ARCHIVE MOVE by name. The same
move without the archive half fails ONE WRITER. `test.ts` pins the same cases over a scratch repo.

**Trap for whoever archives September.** Cut at a `## ` heading, never inside an entry, and paste at the
TOP of the newest archive file (or a new `2026-09.md`): the archive continues straight on from the bottom
of the log, so the date arm fails a file placed out of order. Code comments citing "docs/00-progress.md
<date>" for July or August now resolve in the archive; the headings are unchanged, so a search for the
date or title still finds them.
