## (2026-10-12) — Style guides: the notes name the focus modes the Border width table has no column for (#2505 part 2, owner decision Q247 A)

**Status:** Plugin only (`apps/plugin/src/style-guide.ts` and its test). No artifact moves, no ENGINE bump, CONTRACT
unchanged, and the executor is not touched. This is the follow-up to #2543, which proposed it.

### What changed

The Border width table's columns are border-width's modes. Its focus ring rows come from the focus collection and
read each column's mode there by name, or else focus's default mode. A focus mode that no column reads either way was
never drawn, and nothing said so.

`planVariableTables` now adds one line to the plan's `notes` (which the page and the run's summary show) for each
collection a table borrows rows from that has such modes. The wording is the owner's, approved in Q247:

> Border width: focus's modes Compact, Spacious have no column here, so their focus ring values aren't drawn

with the table's title, the collection's name and the actual mode names. Two mechanical choices, flagged in the PR:

- **One mode** reads "focus's mode Spare has no column here, so its focus ring values aren't drawn".
- **No closing period**, as every other note.

"Not drawn" is read from the same lookup the cells use (`modeIn`), not by matching names again. So a mode drawn as
the fallback is not named. In #2543's §35b file, focus has Spare (first) and Base (default), and only Spare is named.

### Held for the owner

"their focus ring values" holds only while focus is the one borrowed collection. Any border-width variable in another
collection is borrowed the same way (`varKind` reads `stroke`, `borderwidth` or a STROKE_FLOAT scope), so a client's
`stroke` collection with an unmatched mode would read "stroke's modes … their focus ring values". In Prism3's own
emission focus is the only one. Asked in the PR, not changed.

### Tests and mutations

- `test-style-guide.ts` §35b: the notes name Spare alone (singular), not Base, the fallback.
- §35c (new): focus with Default, Compact and Spacious. The plan's notes and the run's notes carry the approved line.
  A control with focus's one mode Default says nothing.

Mutations, each from a `wip:` commit, restored with `git checkout --`, each failing by name:

- **The note never pushed:** `✗ 35b: the notes name Spare …` and both name-carrying §35c arms.
- **"Drawn" read by name only, the fallback ignored:** `✗ 35b: … ("… focus's modes Spare, Base have no column here …")`,
  alone.
- **Always the plural form:** `✗ 35b: … ("… focus's modes Spare have no column here …")`, alone.
- **A drawn mode named too:** both §35c note arms and `✗ 35c: with focus's one mode read by the Default column, the
  notes name no focus mode`.
