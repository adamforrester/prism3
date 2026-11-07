## (2026-11-07) — lint-guide-claims: a citation past a file's end, and one under a table, now fail; each gap is a planted fixture (#3456, #3457, #3417)

**Status:** gate and one guide only, so no engine bump, no artifact moves and `CONTRACT_VERSION` is unchanged.

### What changed

- **#3456: lines are counted as the file has them.** `split('\n')` gives a file that ends in a newline one empty
  element more than its line count, and the range check read it as a line, so `provenance.ts:1-58` passed on a
  57-line file. The cited file's lines now drop that element. The fingerprints are unchanged, because no
  citation's slice reached it.
- **#3457: a citation on its own line steps over one blank line to the block above.** A citation set under a
  table after a blank line read an empty claim, so it counted as quoting nothing, and the table's code spans were
  never held to the cited lines. It now claims the table.
- **#3417: the fixture the issue asked for.** #3458 added the FINGERPRINT arm but planted no fixture, so nothing
  showed the arm still caught a moved block. The CITE and FINGERPRINT checks now live in one function, `citeLine`.
  The guides and a new SELF-CHECK arm both run through it. The SELF-CHECK arm runs the function over a small
  in-memory tree that plants all three gaps. Each must fail by name. A control with the same three shapes cited
  correctly must pass with exactly one citation that quotes nothing, so a gate that fails everything, or that reads
  the table's claim as empty, cannot satisfy it. The fixture files and their fingerprints are written by hand
  (`printf '%s' <line> | sha256sum`), never computed by the gate (`docs/34`).

### What the tightening found: 7 citations in `features.md`

#3457's fix surfaced 7 citations under `features.md`'s three tables. Each supported a single row. Read against the
whole table, none held the table's MCP code spans. Each block was read, and each citation moved into the cell it
supports, so its claim is now that row:
- `pages.ts:118-120` (`INSPECT`) moved to Inspect › Contrast.
- `persist-local.ts` and `persist-figma.ts` moved to the two "Keep the working brand" cells.
- `component-sets.ts:29` moved to "lists the sets".
- `pages.ts:531-536` (`DOC_TABS`) moved to both the Style guides cell and the Specs cell.
- `export-settings.ts:102-111` moved to "Download DTCG token files".

The seventh, `export-settings.ts:112-116`, was on the "Export a `design.md` brief" row. That block names a
"Brand brief" and never says `design.md`, so it now cites `apps/studio/src/main.ts:1321`, where the export
writes `<slug>.design.md`. The citations that hold the tables' quotes stay under the tables. The gate was not
loosened.

### Verification

Each mutation was committed first and restored with `git show HEAD:<path> > <path>`.
- **The trailing-newline pop removed** (main's behavior). The gate fails `SELF-CHECK: #3456 … was not named`.
- **The blank-line step removed** (main's behavior). The gate fails `SELF-CHECK: #3457 … was not named`, and the
  control fails with 2 quoting nothing instead of 1.
- **The fingerprint comparison disabled.** The gate fails `SELF-CHECK: #3417 … was not named`.
- **`apply-a-theme.md` re-cited to `provenance.ts:1-58`** (the issue's case, on the subject). The gate fails
  `CITE: …apply-a-theme.md:26: apps/plugin/src/provenance.ts:1-58 is outside the file (57 lines)`.

### For whoever re-verifies this

The blank-line step reaches one blank line, not two, and stops at a heading. If a guide's citation line sits under
a paragraph that cites something else, the citation now claims that paragraph too. On today's guides, that
happened only under the three `features.md` tables.
