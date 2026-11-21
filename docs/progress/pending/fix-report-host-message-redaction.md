## (2026-11-20) — Report a problem: "Prune stopped" keeps the class and the counts, not the host's message (#3865)

**What.** A prune that throws after removals began posts `PRUNE_COPY.stopped(counts, failureDetail(e))`:
`Prune stopped — <Class>: <host message>. Removed N stale items before it stopped: <parts>.` The report's failure
rule (`reduceFailure`, `apps/studio/src/state/report.ts`) left it whole: `FAILED` reads only `prune failed:`, and
`DETAIL` finds a class only at a line's start, after `: ` or after `(`, never after `— `. So Figma's message, which
can name a page or a layer, reached a public issue.

**The fix, report-side only.** The counts are the part a report needs (a half-pruned file must not read as 0 removed,
#3697 R6), and they follow the message, which can hold `. ` itself, so neither "cut to the end" nor "cut at the first
`. `" works. `reduceStopped` matches the counts by their own closed grammar (`Removed \d+ stale item(s) before it
stopped: \d+ style|mode|variable|collection(s), …` or `Nothing was removed.`), anchored at the line's end, and keeps
the class and the counts. Only digits and the copy's own words can survive in that place: a message that imitates the
counts is dropped with the rest. A line whose counts do not read that way (the copy changed later) keeps the class
alone, so it loses the counts rather than leaking. The drawer's line, the copy and the status line are unchanged: the
issue's other two options (reordering the copy, or posting two lines) would each have changed what the designer sees,
and two lines would have dropped the counts from the status line, which reads only the summary's first line.

**Arms.** `apps/plugin/test-report-redaction.ts` section 13 builds the line with the plugin's own `PRUNE_COPY.stopped`
and `failureDetail` (a `TypeError`, a message holding `. `, a message that imitates the counts, a `Refusal` with
nothing removed, and counts in an unknown shape) and runs it through the report. Mutations that fail by name:
`reduceStopped` dropped, the `$` anchor dropped (`… a message that imitates the counts`), the class-only fallback
dropped (`… counts the report cannot read`).

**#3854.** #4257 already moved the four `main.ts` catches it names to `failureDetail`, and section 11a runs the Update
check through the report. Record as built and Adopt read pages through `run-read.ts`, which takes a refused read as no
pages, so the host cannot reach their catches through the shim. Draw specs reads pages itself, so section 14 now runs it
thrown by the host (a `TypeError` and a `DOMException`) through the report. Its catch put back to the raw message fails
`#3702 D3703.1 B #3854 Draw specs, a TypeError: …` by name. Plugin and studio behavior only: no change note, as #3702
and #4257 had none.
